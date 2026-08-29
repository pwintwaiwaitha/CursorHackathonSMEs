import type { AppStore } from '../storage/types'
import { EMPTY_SCENARIOS } from '../storage/types'
import type { ForecastResult, ScenarioAssumptions, ShortageRisk } from '../types/models'
import { formatDisplayDate } from './dates'
import {
  FORECAST_LEVELS,
  mergeAssumptions,
  runForecast,
  type ForecastLevel,
} from './forecastEngine'
import { formatMmk } from './money'

export interface WhatIfInputs {
  extraStockPurchaseMmk: number
  salesChangePercent: number
  expenseChangePercent: number
  collectionShiftDays: number
  supplierPostponeDays: number
  hireEmployeeMonthlyWageMmk: number
  newBranchExpansionCostMmk: number
  plannedLoanMmk: number
  plannedInvestmentMmk: number
}

export const EMPTY_WHAT_IF: WhatIfInputs = {
  extraStockPurchaseMmk: 0,
  salesChangePercent: 0,
  expenseChangePercent: 0,
  collectionShiftDays: 0,
  supplierPostponeDays: 0,
  hireEmployeeMonthlyWageMmk: 0,
  newBranchExpansionCostMmk: 0,
  plannedLoanMmk: 0,
  plannedInvestmentMmk: 0,
}

export const WHAT_IF_HORIZONS = [7, 14, 30] as const

export interface WhatIfSimulation {
  level: ForecastLevel
  before: ForecastResult
  afterExpected: ForecastResult
  afterOptimistic: ForecastResult
  afterPessimistic: ForecastResult
  appliedAssumptions: ScenarioAssumptions
  closingCashDifferenceMmk: number
  riskBefore: ShortageRisk
  riskAfter: ShortageRisk
  narrative: string
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function hasWhatIfChanges(draft: WhatIfInputs): boolean {
  return Object.values(draft).some((value) => value !== 0)
}

export function applyWhatIf(
  saved: ScenarioAssumptions,
  draft: WhatIfInputs,
): ScenarioAssumptions {
  const base = mergeAssumptions(saved)
  return mergeAssumptions({
    ...base,
    extraStockPurchaseMmk: base.extraStockPurchaseMmk + draft.extraStockPurchaseMmk,
    salesChangePercent: clamp(base.salesChangePercent + draft.salesChangePercent, -80, 200),
    expenseChangePercent: clamp(base.expenseChangePercent + draft.expenseChangePercent, -80, 200),
    collectionDelayDays: clamp(base.collectionDelayDays + draft.collectionShiftDays, -60, 90),
    supplierPostponeDays: clamp(base.supplierPostponeDays + draft.supplierPostponeDays, 0, 90),
    hireEmployeeMonthlyWageMmk:
      base.hireEmployeeMonthlyWageMmk + draft.hireEmployeeMonthlyWageMmk,
    newBranchExpansionCostMmk: base.newBranchExpansionCostMmk + draft.newBranchExpansionCostMmk,
    plannedLoanMmk: base.plannedLoanMmk + draft.plannedLoanMmk,
    plannedInvestmentMmk: base.plannedInvestmentMmk + draft.plannedInvestmentMmk,
  })
}

function simulatorLevel(horizonDays: number): ForecastLevel {
  const base =
    horizonDays <= 7
      ? FORECAST_LEVELS[0]
      : horizonDays <= 14
        ? FORECAST_LEVELS[1]
        : FORECAST_LEVELS[2]
  return {
    ...base,
    horizonDays,
    id: `whatif_${horizonDays}d`,
    label: `${horizonDays}-day what-if`,
  }
}

const DAY_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
]

function daysPhrase(startDate: string, shortageDate: string): string {
  const start = Date.parse(startDate)
  const end = Date.parse(shortageDate)
  const days = Math.max(0, Math.round((end - start) / 86_400_000))
  if (days === 0) {
    return 'today'
  }
  const word = days <= 10 ? DAY_WORDS[days] : String(days)
  return `in ${word} day${days === 1 ? '' : 's'}`
}

export function whatIfNarrative(
  draft: WhatIfInputs,
  before: ForecastResult,
  after: ForecastResult,
): string {
  const action =
    draft.extraStockPurchaseMmk > 0
      ? 'If you make this purchase'
      : 'If you make this change'
  if (after.shortageDate && after.shortageAmountMmk > 0) {
    return `${action}, your cash balance may fall below zero ${daysPhrase(after.startDate, after.shortageDate)}, with an expected shortage of ${formatMmk(after.shortageAmountMmk)}.`
  }
  const difference = after.predictedClosingCashMmk - before.predictedClosingCashMmk
  const delta =
    difference === 0
      ? 'unchanged'
      : difference > 0
        ? `${formatMmk(difference)} higher`
        : `${formatMmk(Math.abs(difference))} lower`
  return `${action}, expected closing cash is ${formatMmk(after.predictedClosingCashMmk)} (${delta} than the current plan). No shortage is projected through ${formatDisplayDate(after.endDate)}.`
}

export function runWhatIfSimulation(options: {
  store: AppStore
  draft: WhatIfInputs
  horizonDays: number
  startDate: string
}): WhatIfSimulation {
  const level = simulatorLevel(options.horizonDays)
  const saved = options.store.scenarios ?? EMPTY_SCENARIOS
  const appliedAssumptions = applyWhatIf(saved, options.draft)
  const before = runForecast({
    store: options.store,
    level,
    startDate: options.startDate,
    assumptions: saved,
    band: 'expected',
    ignoreUnlock: true,
  })
  const afterExpected = runForecast({
    store: options.store,
    level,
    startDate: options.startDate,
    assumptions: appliedAssumptions,
    band: 'expected',
    ignoreUnlock: true,
  })
  const afterOptimistic = runForecast({
    store: options.store,
    level,
    startDate: options.startDate,
    assumptions: appliedAssumptions,
    band: 'optimistic',
    ignoreUnlock: true,
  })
  const afterPessimistic = runForecast({
    store: options.store,
    level,
    startDate: options.startDate,
    assumptions: appliedAssumptions,
    band: 'pessimistic',
    ignoreUnlock: true,
  })
  return {
    level,
    before,
    afterExpected,
    afterOptimistic,
    afterPessimistic,
    appliedAssumptions,
    closingCashDifferenceMmk:
      afterExpected.predictedClosingCashMmk - before.predictedClosingCashMmk,
    riskBefore: before.risk,
    riskAfter: afterExpected.risk,
    narrative: whatIfNarrative(options.draft, before, afterExpected),
  }
}
