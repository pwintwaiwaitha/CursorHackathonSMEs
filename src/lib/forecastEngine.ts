import type { AppStore } from '../storage/types'
import { EMPTY_SCENARIOS } from '../storage/types'
import type {
  ConfidenceLevel,
  DailyCashCheckIn,
  ForecastKind,
  ForecastPoint,
  ForecastResult,
  ScenarioAssumptions,
  ScenarioBand,
  ShortageRisk,
} from '../types/models'
import { applyPercent, formatMmk } from './money'
import {
  addDaysIso,
  calendarDaysInclusive,
  dateRange,
  todayIsoDate,
  weekdayIndex,
} from './dates'
import { checkInNetCashMmk, sortCheckInsByDate } from './checkIn'
import { getCurrentCashMmk } from './cashBalance'
import {
  derivePayableStatus,
  deriveReceivableStatus,
  expandRecurringDates,
  remainingPayableMmk,
  remainingReceivableMmk,
} from './schedule'

export interface ForecastLevel {
  id: string
  minRecordedDays: number
  horizonDays: number
  label: string
  shortName: string
  family: 'Forecast' | 'Projection' | 'Strategic Scenario'
  kind: ForecastKind
  usesRunRate: boolean
  usesGrowth: boolean
  strategic: boolean
}

export const FORECAST_LEVELS: ForecastLevel[] = [
  {
    id: 'scheduled_3d',
    minRecordedDays: 1,
    horizonDays: 3,
    label: 'Scheduled Forecast',
    shortName: '3-day',
    family: 'Forecast',
    kind: 'scheduled',
    usesRunRate: false,
    usesGrowth: false,
    strategic: false,
  },
  {
    id: 'short_14d',
    minRecordedDays: 7,
    horizonDays: 14,
    label: '14-day forecast',
    shortName: '14-day',
    family: 'Forecast',
    kind: 'short_term',
    usesRunRate: true,
    usesGrowth: false,
    strategic: false,
  },
  {
    id: 'early_1m',
    minRecordedDays: 7,
    horizonDays: 30,
    label: 'Early Projection',
    shortName: '1-month',
    family: 'Projection',
    kind: 'early',
    usesRunRate: true,
    usesGrowth: false,
    strategic: false,
  },
  {
    id: 'scenario_6m',
    minRecordedDays: 30,
    horizonDays: 180,
    label: '6-month scenario projection',
    shortName: '6-month',
    family: 'Projection',
    kind: 'scenario',
    usesRunRate: true,
    usesGrowth: true,
    strategic: false,
  },
  {
    id: 'year_1',
    minRecordedDays: 180,
    horizonDays: 365,
    label: '1-year projection',
    shortName: '1-year',
    family: 'Projection',
    kind: 'scenario',
    usesRunRate: true,
    usesGrowth: true,
    strategic: false,
  },
  {
    id: 'year_3',
    minRecordedDays: 365,
    horizonDays: 1095,
    label: '3-year growth projection',
    shortName: '3-year',
    family: 'Projection',
    kind: 'scenario',
    usesRunRate: true,
    usesGrowth: true,
    strategic: false,
  },
  {
    id: 'year_10',
    minRecordedDays: 1095,
    horizonDays: 3650,
    label: '10-year strategic scenario',
    shortName: '10-year',
    family: 'Strategic Scenario',
    kind: 'strategic',
    usesRunRate: true,
    usesGrowth: true,
    strategic: true,
  },
  {
    id: 'year_30',
    minRecordedDays: 1095,
    horizonDays: 10950,
    label: '30-year strategic scenario',
    shortName: '30-year',
    family: 'Strategic Scenario',
    kind: 'strategic',
    usesRunRate: true,
    usesGrowth: true,
    strategic: true,
  },
]

export interface CheckInHistory {
  recordedDays: number
  spanDays: number
  missingDays: number
  firstDate: string | null
  lastDate: string | null
  missingRatio: number
}

export function checkInCashInMmk(item: DailyCashCheckIn): number {
  return (
    item.cashSalesMmk + item.customerDebtCollectedMmk + item.otherCashReceivedMmk
  )
}

export function checkInCashOutMmk(item: DailyCashCheckIn): number {
  return (
    item.operatingExpensesMmk +
    item.inventoryPurchasesMmk +
    item.supplierPaymentsMmk +
    item.otherCashPaidMmk
  )
}

export function measureCheckInHistory(
  checkIns: DailyCashCheckIn[],
  asOfDate: string,
): CheckInHistory {
  const sorted = sortCheckInsByDate(checkIns)
  if (sorted.length === 0) {
    return {
      recordedDays: 0,
      spanDays: 0,
      missingDays: 0,
      firstDate: null,
      lastDate: null,
      missingRatio: 1,
    }
  }
  const dates = new Set(sorted.map((item) => item.date))
  const firstDate = sorted[0].date
  const lastDate = sorted[sorted.length - 1].date
  const end = lastDate < asOfDate ? asOfDate : lastDate
  const spanDays = Math.max(1, calendarDaysInclusive(firstDate, end))
  let missingDays = 0
  for (const date of dateRange(firstDate, spanDays)) {
    if (!dates.has(date)) {
      missingDays += 1
    }
  }
  return {
    recordedDays: dates.size,
    spanDays,
    missingDays,
    firstDate,
    lastDate,
    missingRatio: missingDays / spanDays,
  }
}

export function isForecastLevelUnlocked(
  level: ForecastLevel,
  recordedDays: number,
): boolean {
  return recordedDays >= level.minRecordedDays
}

export function listForecastLevels(recordedDays: number): {
  level: ForecastLevel
  unlocked: boolean
}[] {
  return FORECAST_LEVELS.map((level) => ({
    level,
    unlocked: isForecastLevelUnlocked(level, recordedDays),
  }))
}

function unlockDataNeeded(level: ForecastLevel): string {
  switch (level.id) {
    case 'scheduled_3d':
      return 'Needs 1 Daily Cash Check-in with cash in, cash out, and closing cash.'
    case 'short_14d':
      return 'Needs 7 Daily Cash Check-in days so a short run-rate can be estimated.'
    case 'early_1m':
      return 'Needs 7 Daily Cash Check-in days for a 1-month Early Projection.'
    case 'scenario_6m':
      return 'Needs 30 Daily Cash Check-in days (about one month of books) plus known bills.'
    case 'year_1':
      return 'Needs 180 Daily Cash Check-in days (about six months of books).'
    case 'year_3':
      return 'Needs 365 Daily Cash Check-in days (about one year of books).'
    case 'year_10':
    case 'year_30':
      return 'Needs 1,095 Daily Cash Check-in days (about three years of books). These views are planning stories, not promises.'
    default:
      return `Needs ${level.minRecordedDays} Daily Cash Check-in day(s).`
  }
}

export function unlockExplanation(level: ForecastLevel, recordedDays: number): string {
  if (recordedDays >= level.minRecordedDays) {
    return `Unlocked with ${recordedDays} Daily Cash Check-in day(s).`
  }
  return `${unlockDataNeeded(level)} You currently have ${recordedDays}.`
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0
  }
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function stdDev(values: number[]): number {
  if (values.length < 2) {
    return 0
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

export function rollingAverageInflowsMmk(checkIns: DailyCashCheckIn[]): number {
  const sorted = sortCheckInsByDate(checkIns)
  const window = sorted.slice(-14)
  return average(window.map(checkInCashInMmk))
}

export function rollingAverageOutflowsMmk(checkIns: DailyCashCheckIn[]): number {
  const sorted = sortCheckInsByDate(checkIns)
  const window = sorted.slice(-14)
  return average(window.map(checkInCashOutMmk))
}

export function weekdayRunRates(
  checkIns: DailyCashCheckIn[],
): { inflows: number[]; outflows: number[]; ready: boolean } {
  const inBuckets: number[][] = [[], [], [], [], [], [], []]
  const outBuckets: number[][] = [[], [], [], [], [], [], []]
  for (const item of checkIns) {
    const day = weekdayIndex(item.date)
    inBuckets[day].push(checkInCashInMmk(item))
    outBuckets[day].push(checkInCashOutMmk(item))
  }
  const ready =
    checkIns.length >= 14 && inBuckets.filter((bucket) => bucket.length >= 2).length >= 5
  return {
    inflows: inBuckets.map((bucket) =>
      bucket.length >= 2 ? average(bucket) : rollingAverageInflowsMmk(checkIns) || 0,
    ),
    outflows: outBuckets.map((bucket) =>
      bucket.length >= 2 ? average(bucket) : rollingAverageOutflowsMmk(checkIns) || 0,
    ),
    ready,
  }
}

export function compoundAnnualAmount(
  baseMmk: number,
  annualPercent: number,
  dayIndex: number,
): number {
  if (dayIndex <= 0 || annualPercent === 0) {
    return Math.trunc(baseMmk)
  }
  const factor = (1 + annualPercent / 100) ** (dayIndex / 365)
  return Math.round(baseMmk * factor)
}

function bandAdjustments(band: ScenarioBand): {
  revenue: number
  expense: number
  inflation: number
  collection: number
} {
  if (band === 'optimistic') {
    return { revenue: 6, expense: -3, inflation: -1, collection: 15 }
  }
  if (band === 'pessimistic') {
    return { revenue: -8, expense: 5, inflation: 3, collection: -25 }
  }
  return { revenue: 0, expense: 0, inflation: 0, collection: 0 }
}

export function mergeAssumptions(
  partial?: Partial<ScenarioAssumptions>,
): ScenarioAssumptions {
  return { ...EMPTY_SCENARIOS, ...partial }
}

function knownScheduleCount(store: AppStore): number {
  return (
    store.scheduledItems.length +
    store.receivables.filter((item) => remainingReceivableMmk(item) > 0).length +
    store.payables.filter((item) => remainingPayableMmk(item) > 0).length
  )
}

export function scoreConfidence(options: {
  recordedDays: number
  missingRatio: number
  volatility: number
  horizonDays: number
  scheduledCount: number
}): ConfidenceLevel {
  const history = Math.min(40, (options.recordedDays / 30) * 40)
  const completeness = Math.max(0, 25 * (1 - options.missingRatio))
  const scheduleBonus = Math.min(15, options.scheduledCount * 2)
  const horizonPenalty = Math.min(35, options.horizonDays / 120)
  const volatilityPenalty = Math.min(20, options.volatility * 8)
  const score = history + completeness + scheduleBonus - horizonPenalty - volatilityPenalty
  if (score >= 70) {
    return 'high'
  }
  if (score >= 48) {
    return 'medium'
  }
  if (score >= 28) {
    return 'low'
  }
  return 'very_low'
}

export function forecastMethodDescription(level: {
  kind: ForecastKind
  usesRunRate: boolean
  usesGrowth: boolean
  strategic: boolean
  family: string
}): string {
  if (level.strategic) {
    return `${level.family}: long-horizon compound growth from recent cash run-rate, scheduled bills, and scenario assumptions. This is a planning story, not a promise.`
  }
  if (!level.usesRunRate) {
    return `${level.family}: scheduled customer receipts and supplier bills only. Daily sales are not estimated.`
  }
  if (level.usesGrowth) {
    return `${level.family}: recent check-in cash in/out, known bills, then growth, inflation and collection-rate assumptions.`
  }
  return `${level.family}: recent Daily Cash Check-in run-rate plus known receivables and payables.`
}

function disclaimerFor(level: ForecastLevel): string {
  if (level.strategic) {
    return 'This is a strategic scenario, not a guaranteed prediction. 10-year and 30-year figures are planning stories only.'
  }
  if (level.kind === 'scenario' || level.kind === 'early') {
    return 'This projection is a planning estimate. Actual cash will change with sales, collections and bills.'
  }
  if (level.kind === 'scheduled') {
    return 'Scheduled Forecast uses known bills and customer payments. It is not a full sales forecast.'
  }
  return 'This short-term forecast uses recent check-ins and scheduled bills. It is an estimate, not a promise.'
}

function samplePoints(points: ForecastPoint[], horizonDays: number): ForecastPoint[] {
  if (horizonDays <= 90 || points.length <= 90) {
    return points
  }
  const step = horizonDays <= 400 ? 7 : 30
  const picked: ForecastPoint[] = []
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]
    if (index === 0 || index === points.length - 1 || point.isShortage || index % step === 0) {
      const last = picked[picked.length - 1]
      if (!last || last.date !== point.date) {
        picked.push(point)
      }
    }
  }
  return picked
}

function emptyLockedResult(
  level: ForecastLevel,
  startDate: string,
  startingBalanceMmk: number,
  recordedDays: number,
): ForecastResult {
  const endDate = addDaysIso(startDate, level.horizonDays - 1)
  return {
    levelId: level.id,
    label: level.label,
    kind: level.kind,
    locked: true,
    unlockRequirement: `Save ${level.minRecordedDays} daily check-in day(s). You currently have ${recordedDays}.`,
    startDate,
    endDate,
    horizonDays: level.horizonDays,
    startingBalanceMmk,
    endingBalanceMmk: startingBalanceMmk,
    predictedClosingCashMmk: startingBalanceMmk,
    lowestBalanceMmk: startingBalanceMmk,
    lowestPredictedCashMmk: startingBalanceMmk,
    shortageDays: 0,
    firstShortageDate: null,
    shortageDate: null,
    shortageAmountMmk: 0,
    points: [],
    causes: [],
    mainRiskDrivers: [],
    recommendedActions: [],
    suggestedActions: [],
    risk: 'low',
    confidenceLevel: 'very_low',
    dataPeriodUsed: `${recordedDays} recorded check-in day(s)`,
    missingDataWarnings: [
      `Not enough Daily Cash Check-in history to unlock ${level.label}.`,
    ],
    disclaimer: disclaimerFor(level),
  }
}

function addToMap(map: Map<string, number>, date: string, amount: number) {
  map.set(date, (map.get(date) ?? 0) + amount)
}

export function runForecast(options: {
  store: AppStore
  level: ForecastLevel
  startDate?: string
  assumptions?: Partial<ScenarioAssumptions>
  band?: ScenarioBand
  ignoreUnlock?: boolean
}): ForecastResult {
  const startDate = options.startDate ?? todayIsoDate()
  const assumptions = mergeAssumptions(options.assumptions ?? options.store.scenarios)
  const band = options.band ?? 'expected'
  const history = measureCheckInHistory(options.store.checkIns, startDate)
  const startingBalanceMmk = getCurrentCashMmk(options.store)

  if (!options.ignoreUnlock && !isForecastLevelUnlocked(options.level, history.recordedDays)) {
    return emptyLockedResult(options.level, startDate, startingBalanceMmk, history.recordedDays)
  }

  const adjust = bandAdjustments(band)
  const collectionRate = Math.min(
    100,
    Math.max(0, assumptions.customerCollectionRatePercent + adjust.collection),
  )
  const revenueRate = assumptions.revenueGrowthRatePercent + adjust.revenue
  const expenseRate = assumptions.expenseGrowthRatePercent + adjust.expense
  const inflationRate = assumptions.inflationRatePercent + adjust.inflation

  const profileDailySales = Math.round(
    (options.store.profile?.averageMonthlySalesMmk ?? 0) / 30,
  )
  const rolledIn = rollingAverageInflowsMmk(options.store.checkIns)
  const rolledOut = rollingAverageOutflowsMmk(options.store.checkIns)
  const baseDailyIn = options.level.usesRunRate
    ? applyPercent(rolledIn > 0 ? rolledIn : profileDailySales, assumptions.salesChangePercent)
    : 0
  const baseDailyOut = options.level.usesRunRate
    ? applyPercent(
        rolledOut > 0 ? rolledOut : Math.round(profileDailySales * 0.62),
        assumptions.expenseChangePercent,
      )
    : 0

  const weekday = weekdayRunRates(options.store.checkIns)
  const useWeekday = options.level.usesRunRate && weekday.ready

  const inflowByDate = new Map<string, number>()
  const outflowByDate = new Map<string, number>()

  addToMap(inflowByDate, startDate, assumptions.extraLoanInflowMmk + assumptions.plannedLoanMmk)
  addToMap(
    outflowByDate,
    startDate,
    assumptions.extraStockPurchaseMmk +
      assumptions.plannedInvestmentMmk +
      assumptions.newBranchExpansionCostMmk,
  )

  for (const item of options.store.scheduledItems) {
    for (const date of expandRecurringDates(
      item.dueDate,
      item.recurrence,
      startDate,
      options.level.horizonDays,
    )) {
      if (item.kind === 'inflow') {
        addToMap(inflowByDate, date, item.amountMmk)
      } else {
        addToMap(outflowByDate, date, item.amountMmk)
      }
    }
  }

  for (const item of options.store.receivables) {
    const remaining = remainingReceivableMmk(item)
    if (remaining <= 0) {
      continue
    }
    const collectDate = addDaysIso(item.expectedPaymentDate, assumptions.collectionDelayDays)
    const expected = Math.round((remaining * collectionRate) / 100)
    if (collectDate >= startDate && expected > 0) {
      addToMap(inflowByDate, collectDate, expected)
    }
  }

  for (const item of options.store.payables) {
    const remaining = remainingPayableMmk({
      ...item,
      status: derivePayableStatus(item, startDate),
    })
    if (remaining <= 0) {
      continue
    }
    for (const date of expandRecurringDates(
      addDaysIso(item.dueDate, assumptions.supplierPostponeDays),
      item.recurrence,
      startDate,
      options.level.horizonDays,
    )) {
      addToMap(outflowByDate, date, remaining)
    }
  }

  const dailyWageMmk = Math.max(0, Math.round(assumptions.hireEmployeeMonthlyWageMmk / 30))
  const dates = dateRange(startDate, options.level.horizonDays)
  const points: ForecastPoint[] = []
  let balance = startingBalanceMmk
  let lowest = startingBalanceMmk
  let shortageDate: string | null = null
  let shortageAmountMmk = 0

  for (let index = 0; index < dates.length; index += 1) {
    const date = dates[index]
    let runIn = 0
    let runOut = 0
    if (options.level.usesRunRate) {
      const rawIn = useWeekday ? weekday.inflows[weekdayIndex(date)] : baseDailyIn
      const rawOut = useWeekday ? weekday.outflows[weekdayIndex(date)] : baseDailyOut
      runIn = options.level.usesGrowth
        ? compoundAnnualAmount(rawIn, revenueRate, index)
        : rawIn
      runOut = options.level.usesGrowth
        ? compoundAnnualAmount(rawOut, expenseRate + inflationRate, index)
        : rawOut
    }
    const inflowsMmk = runIn + (inflowByDate.get(date) ?? 0)
    const outflowsMmk = runOut + (outflowByDate.get(date) ?? 0) + dailyWageMmk
    balance = balance + inflowsMmk - outflowsMmk
    const isShortage = balance < 0
    if (isShortage && shortageDate === null) {
      shortageDate = date
    }
    if (balance < lowest) {
      lowest = balance
    }
    if (balance < 0) {
      shortageAmountMmk = Math.max(shortageAmountMmk, Math.abs(balance))
    }
    points.push({
      date,
      projectedBalanceMmk: balance,
      inflowsMmk,
      outflowsMmk,
      isShortage,
    })
  }

  const nets = options.store.checkIns.map((item) => checkInNetCashMmk(item))
  const meanAbs = Math.max(1, Math.abs(average(nets)))
  const volatility = stdDev(nets) / meanAbs
  const confidenceLevel = scoreConfidence({
    recordedDays: history.recordedDays,
    missingRatio: history.missingRatio,
    volatility,
    horizonDays: options.level.horizonDays,
    scheduledCount: knownScheduleCount(options.store),
  })

  const missingDataWarnings: string[] = []
  if (history.recordedDays === 0) {
    missingDataWarnings.push('No Daily Cash Check-in days are saved yet.')
  }
  if (history.missingDays > 0) {
    missingDataWarnings.push(
      `${history.missingDays} day(s) are missing between the first check-in and today.`,
    )
  }
  if (!options.level.usesRunRate) {
    missingDataWarnings.push(
      'Daily sales and expenses are not estimated here. Only known scheduled money is used.',
    )
  }
  if (options.store.checkIns.some((item) => item.creditSalesMmk > 0)) {
    missingDataWarnings.push(
      'Credit sales are recorded but not treated as cash until collected.',
    )
  }
  if (useWeekday === false && options.level.usesRunRate && history.recordedDays < 14) {
    missingDataWarnings.push(
      'Not enough days yet for day-of-week patterns. A simple rolling average is used.',
    )
  }

  const mainRiskDrivers: string[] = []
  const suggestedActions: string[] = []
  const overdue = options.store.receivables.filter(
    (item) => deriveReceivableStatus(item, startDate) === 'overdue',
  )
  if (overdue.length > 0) {
    const total = overdue.reduce((sum, item) => sum + remainingReceivableMmk(item), 0)
    mainRiskDrivers.push(`Overdue customer money: ${formatMmk(total)}.`)
    suggestedActions.push(`Collect from ${overdue[0].customerName} today.`)
  }
  const nearPayables = options.store.payables.filter((item) => {
    const remaining = remainingPayableMmk({
      ...item,
      status: derivePayableStatus(item, startDate),
    })
    return remaining > 0 && item.dueDate <= addDaysIso(startDate, 14)
  })
  if (nearPayables.length > 0) {
    mainRiskDrivers.push(
      `Supplier bills due soon: ${formatMmk(
        nearPayables.reduce((sum, item) => sum + remainingPayableMmk(item), 0),
      )}.`,
    )
    suggestedActions.push(`Plan cash for ${nearPayables[0].supplierName}.`)
  }
  if (baseDailyOut > baseDailyIn && options.level.usesRunRate) {
    mainRiskDrivers.push('Average daily cash out is higher than cash in.')
    suggestedActions.push('Cut slow stock buying or extra costs this week.')
  }
  if (assumptions.emergencyCashReserveTargetMmk > 0 && lowest < assumptions.emergencyCashReserveTargetMmk) {
    mainRiskDrivers.push(
      `Projected cash falls below the emergency reserve of ${formatMmk(assumptions.emergencyCashReserveTargetMmk)}.`,
    )
    suggestedActions.push('Hold more cash or delay a planned purchase.')
  }
  if (shortageDate) {
    mainRiskDrivers.push(`Cash may go below zero on ${shortageDate}.`)
    suggestedActions.push(
      'Collect overdue payments and postpone non-essential stock buying before that date.',
    )
  }
  if (options.level.strategic) {
    mainRiskDrivers.push('Very long horizons are sensitive to growth, inflation and new branches.')
    suggestedActions.push('Treat 10-year and 30-year numbers as planning stories only.')
  }
  if (mainRiskDrivers.length === 0) {
    mainRiskDrivers.push('No single large cash leak found in this plan.')
  }
  if (suggestedActions.length === 0) {
    suggestedActions.push('Keep the Daily Cash Check-in complete. Update bills when they change.')
  }

  let risk: ShortageRisk = 'low'
  if (shortageDate || lowest < 0) {
    risk = 'high'
  } else if (lowest < Math.max(1, baseDailyOut) * 7) {
    risk = 'medium'
  }

  const endDate = dates[dates.length - 1] ?? startDate
  const dataPeriodUsed = history.firstDate
    ? `Check-ins ${history.firstDate} to ${history.lastDate} (${history.recordedDays} day(s) recorded)`
    : 'No check-in history; scheduled bills only'

  return {
    levelId: options.level.id,
    label: options.level.label,
    kind: options.level.kind,
    locked: false,
    unlockRequirement: null,
    startDate,
    endDate,
    horizonDays: options.level.horizonDays,
    startingBalanceMmk,
    endingBalanceMmk: balance,
    predictedClosingCashMmk: balance,
    lowestBalanceMmk: lowest,
    lowestPredictedCashMmk: lowest,
    shortageDays: points.filter((point) => point.isShortage).length,
    firstShortageDate: shortageDate,
    shortageDate,
    shortageAmountMmk,
    points: samplePoints(points, options.level.horizonDays),
    causes: mainRiskDrivers,
    mainRiskDrivers,
    recommendedActions: suggestedActions,
    suggestedActions,
    risk,
    confidenceLevel,
    dataPeriodUsed,
    missingDataWarnings,
    disclaimer: disclaimerFor(options.level),
    scenarioBand: options.level.usesGrowth ? band : undefined,
  }
}

export function runUnlockedForecasts(
  store: AppStore,
  startDate = todayIsoDate(),
  assumptions?: Partial<ScenarioAssumptions>,
): ForecastResult[] {
  const recordedDays = measureCheckInHistory(store.checkIns, startDate).recordedDays
  return FORECAST_LEVELS.filter((level) => isForecastLevelUnlocked(level, recordedDays)).map(
    (level) =>
      runForecast({
        store,
        level,
        startDate,
        assumptions,
        band: 'expected',
      }),
  )
}
