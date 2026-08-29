import { isBefore, parseISO } from 'date-fns'
import { addDaysIso, addMonthsIso, dateRange, todayIsoDate } from './dates'
import { applyPercent, formatMmk } from './money'
import type { AppStore } from '../storage/types'
import type {
  CashFlowHealth,
  ForecastPoint,
  ForecastResult,
  Payable,
  Receivable,
  ScenarioAssumptions,
  ScheduledCashItem,
} from '../types/models'

export function checkInNetMmk(checkIn: {
  cashSalesMmk: number
  otherInflowsMmk: number
  cashExpensesMmk: number
  supplierPaymentsMmk: number
  stockPurchasesMmk: number
}): number {
  return (
    checkIn.cashSalesMmk +
    checkIn.otherInflowsMmk -
    checkIn.cashExpensesMmk -
    checkIn.supplierPaymentsMmk -
    checkIn.stockPurchasesMmk
  )
}

export function getCurrentCashMmk(store: AppStore): number {
  const start = store.profile?.startingCashBalanceMmk ?? 0
  return store.checkIns.reduce((sum, item) => sum + checkInNetMmk(item), start)
}

export function getCheckInForDate(
  store: AppStore,
  date: string,
): AppStore['checkIns'][number] | undefined {
  return store.checkIns.find((item) => item.date === date)
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0
  }
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

export function estimateDailySalesMmk(store: AppStore): number {
  const fromBooks = store.checkIns.map(
    (item) => item.cashSalesMmk + item.otherInflowsMmk,
  )
  if (fromBooks.length >= 3) {
    return average(fromBooks)
  }
  const monthly = store.profile?.averageMonthlySalesMmk ?? 0
  return Math.round(monthly / 30)
}

export function estimateDailyExpensesMmk(store: AppStore): number {
  const fromBooks = store.checkIns.map(
    (item) =>
      item.cashExpensesMmk + item.supplierPaymentsMmk + item.stockPurchasesMmk,
  )
  if (fromBooks.length >= 3) {
    return average(fromBooks)
  }
  const dailySales = estimateDailySalesMmk(store)
  return Math.round(dailySales * 0.62)
}

function expandScheduledDates(
  item: ScheduledCashItem,
  startDate: string,
  horizonDays: number,
): string[] {
  const endDate = addDaysIso(startDate, horizonDays - 1)
  const dates: string[] = []

  if (item.recurrence === 'once') {
    if (item.dueDate >= startDate && item.dueDate <= endDate) {
      dates.push(item.dueDate)
    }
    return dates
  }

  let cursor = item.dueDate
  let guard = 0
  while (cursor < startDate && guard < 240) {
    cursor =
      item.recurrence === 'weekly'
        ? addDaysIso(cursor, 7)
        : addMonthsIso(cursor, 1)
    guard += 1
  }

  while (cursor <= endDate && guard < 360) {
    if (cursor >= startDate) {
      dates.push(cursor)
    }
    cursor =
      item.recurrence === 'weekly'
        ? addDaysIso(cursor, 7)
        : addMonthsIso(cursor, 1)
    guard += 1
  }

  return dates
}

function openReceivables(items: Receivable[]): Receivable[] {
  return items.filter((item) => item.status !== 'collected')
}

function openPayables(items: Payable[]): Payable[] {
  return items.filter((item) => item.status !== 'paid')
}

export function buildForecast(
  store: AppStore,
  horizonDays: number,
  assumptions: ScenarioAssumptions,
  startDate = todayIsoDate(),
): ForecastResult {
  const startingBalanceMmk = getCurrentCashMmk(store)
  const dailySales = applyPercent(
    estimateDailySalesMmk(store),
    assumptions.salesChangePercent,
  )
  const dailyExpenses = applyPercent(
    estimateDailyExpensesMmk(store),
    assumptions.expenseChangePercent,
  )

  const inflowByDate = new Map<string, number>()
  const outflowByDate = new Map<string, number>()

  function addIn(date: string, amount: number) {
    inflowByDate.set(date, (inflowByDate.get(date) ?? 0) + amount)
  }

  function addOut(date: string, amount: number) {
    outflowByDate.set(date, (outflowByDate.get(date) ?? 0) + amount)
  }

  addIn(startDate, assumptions.extraLoanInflowMmk)
  addOut(startDate, assumptions.extraStockPurchaseMmk)

  for (const item of store.scheduledItems) {
    for (const date of expandScheduledDates(item, startDate, horizonDays)) {
      if (item.kind === 'inflow') {
        addIn(date, item.amountMmk)
      } else {
        addOut(date, item.amountMmk)
      }
    }
  }

  for (const item of openReceivables(store.receivables)) {
    const collectDate = addDaysIso(
      item.expectedCollectDate,
      assumptions.collectionDelayDays,
    )
    if (collectDate >= startDate) {
      addIn(collectDate, item.amountMmk)
    }
  }

  for (const item of openPayables(store.payables)) {
    if (item.expectedPayDate >= startDate) {
      addOut(item.expectedPayDate, item.amountMmk)
    }
  }

  const dates = dateRange(startDate, horizonDays)
  const points: ForecastPoint[] = []
  let balance = startingBalanceMmk

  for (const date of dates) {
    const scheduledIn = inflowByDate.get(date) ?? 0
    const scheduledOut = outflowByDate.get(date) ?? 0
    const inflowsMmk = dailySales + scheduledIn
    const outflowsMmk = dailyExpenses + scheduledOut
    balance = balance + inflowsMmk - outflowsMmk
    points.push({
      date,
      projectedBalanceMmk: balance,
      inflowsMmk,
      outflowsMmk,
      isShortage: balance < 0,
    })
  }

  const lowestBalanceMmk = points.reduce(
    (min, point) => Math.min(min, point.projectedBalanceMmk),
    startingBalanceMmk,
  )
  const shortageDays = points.filter((point) => point.isShortage).length
  const firstShortage = points.find((point) => point.isShortage)

  const causes: string[] = []
  const recommendedActions: string[] = []

  const overdueReceivables = store.receivables.filter(
    (item) =>
      item.status === 'overdue' ||
      (item.status === 'open' &&
        isBefore(parseISO(item.dueDate), parseISO(startDate))),
  )
  const upcomingPayables = openPayables(store.payables).filter(
    (item) => item.expectedPayDate <= addDaysIso(startDate, 14),
  )
  const upcomingBills = store.scheduledItems.filter((item) => {
    if (item.kind !== 'outflow') {
      return false
    }
    return expandScheduledDates(item, startDate, 14).length > 0
  })

  if (overdueReceivables.length > 0) {
    const total = overdueReceivables.reduce((sum, item) => sum + item.amountMmk, 0)
    causes.push(
      `Customers still owe ${formatMmk(total)}. Some payments are late.`,
    )
    recommendedActions.push(
      `Call ${overdueReceivables[0].customerName} today and collect what you can in cash.`,
    )
  }

  if (upcomingPayables.length > 0) {
    const total = upcomingPayables.reduce((sum, item) => sum + item.amountMmk, 0)
    causes.push(`Supplier payments of ${formatMmk(total)} are due within 14 days.`)
    recommendedActions.push(
      `Talk to ${upcomingPayables[0].supplierName} about splitting the bill if cash is tight.`,
    )
  }

  if (upcomingBills.length > 0) {
    causes.push(
      `Fixed bills such as ${upcomingBills.map((item) => item.name).join(', ')} will leave the shop soon.`,
    )
  }

  const recentStock = store.checkIns
    .slice(-5)
    .reduce((sum, item) => sum + item.stockPurchasesMmk, 0)
  if (recentStock > estimateDailySalesMmk(store) * 4) {
    causes.push('Recent stock buying is high compared with daily sales.')
    recommendedActions.push(
      'Buy only fast-moving items this week. Pause slow stock until cash is safer.',
    )
  }

  if (dailyExpenses > dailySales) {
    causes.push('Daily money going out is higher than daily sales.')
    recommendedActions.push(
      'Cut one optional expense this week (transport, extra staff hours, or slow stock).',
    )
  }

  if (assumptions.salesChangePercent < 0) {
    causes.push(`This plan assumes sales drop by ${Math.abs(assumptions.salesChangePercent)}%.`)
  }

  if (causes.length === 0) {
    causes.push('No major cash leak found. Keep recording sales and bills every day.')
  }

  if (recommendedActions.length === 0) {
    recommendedActions.push(
      'Keep doing the Daily Cash Check-in. Collect credit sales before they become late.',
    )
    recommendedActions.push(
      'Hold a small cash buffer equal to about 14 days of shop expenses.',
    )
  }

  let risk: ForecastResult['risk'] = 'low'
  if (shortageDays > 0 || lowestBalanceMmk < 0) {
    risk = 'high'
  } else if (lowestBalanceMmk < dailyExpenses * 7) {
    risk = 'medium'
  }

  return {
    horizonDays,
    startingBalanceMmk,
    endingBalanceMmk: points[points.length - 1]?.projectedBalanceMmk ?? startingBalanceMmk,
    lowestBalanceMmk,
    shortageDays,
    firstShortageDate: firstShortage?.date ?? null,
    points,
    causes,
    recommendedActions,
    risk,
  }
}

export function assessCashFlowHealth(
  store: AppStore,
  forecast: ForecastResult,
): CashFlowHealth {
  const currentCash = getCurrentCashMmk(store)
  const dailyExpenses = Math.max(1, estimateDailyExpensesMmk(store))
  const daysOfCash = Math.max(0, Math.round(currentCash / dailyExpenses))

  let status: CashFlowHealth['status'] = 'healthy'
  let score = 82
  let summary = 'Cash looks stable for the next two weeks if sales stay normal.'

  if (forecast.firstShortageDate) {
    status = 'critical'
    score = 28
    summary = `Cash may run out by ${forecast.firstShortageDate}. Act on collections and bills today.`
  } else if (daysOfCash < 7 || forecast.risk === 'high') {
    status = 'at_risk'
    score = 48
    summary = 'Cash cover is thin. Collect overdue customer money and slow stock buying.'
  } else if (daysOfCash < 21 || forecast.risk === 'medium') {
    status = 'watch'
    score = 64
    summary = 'Cash is enough for now, but a big bill could make next week tight.'
  }

  if (currentCash <= 0) {
    status = 'critical'
    score = 18
    summary = 'There is no spare cash in the record. Enter today’s check-in and collect what you can.'
  }

  return { status, score, summary, daysOfCash }
}
