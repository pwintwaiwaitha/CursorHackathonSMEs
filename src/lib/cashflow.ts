import type { AppStore } from '../storage/types'
import type { BankTransaction } from '../types/bank'
import type {
  CashFlowHealth,
  ForecastResult,
  ScenarioAssumptions,
} from '../types/models'
import { getCheckInForDate, getCurrentCashMmk } from './cashBalance'
import { checkInNetCashMmk } from './checkIn'
import { storeWithoutMatchedManuals } from './bankMatching'
import { todayIsoDate } from './dates'
import {
  FORECAST_LEVELS,
  rollingAverageInflowsMmk,
  rollingAverageOutflowsMmk,
  runForecast,
} from './forecastEngine'

export { getCheckInForDate, getCurrentCashMmk }

export function checkInNetMmk(checkIn: {
  openingCashMmk: number
  cashSalesMmk: number
  customerDebtCollectedMmk: number
  creditSalesMmk: number
  operatingExpensesMmk: number
  inventoryPurchasesMmk: number
  supplierPaymentsMmk: number
  otherCashReceivedMmk: number
  otherCashPaidMmk: number
}): number {
  return checkInNetCashMmk(checkIn)
}

export function estimateDailySalesMmk(store: AppStore): number {
  const rolled = rollingAverageInflowsMmk(store.checkIns)
  if (rolled > 0) {
    return rolled
  }
  return Math.round((store.profile?.averageMonthlySalesMmk ?? 0) / 30)
}

export function estimateDailyExpensesMmk(store: AppStore): number {
  const rolled = rollingAverageOutflowsMmk(store.checkIns)
  if (rolled > 0) {
    return rolled
  }
  return Math.round(estimateDailySalesMmk(store) * 0.62)
}

export function buildForecast(
  store: AppStore,
  horizonDays: number,
  assumptions: ScenarioAssumptions,
  startDate = todayIsoDate(),
  bankTransactions: BankTransaction[] = [],
): ForecastResult {
  const level =
    FORECAST_LEVELS.find((item) => item.horizonDays === horizonDays) ??
    FORECAST_LEVELS.find((item) => item.horizonDays >= horizonDays) ??
    FORECAST_LEVELS[0]
  const matched = {
    ...level,
    horizonDays,
    id: `compat_${horizonDays}d`,
    label: level.label,
  }
  const businessId = store.profile?.id ?? ''
  return runForecast({
    store: storeWithoutMatchedManuals(store, bankTransactions, businessId),
    level: matched,
    startDate,
    assumptions,
    ignoreUnlock: true,
  })
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

  if (forecast.shortageDate) {
    status = 'critical'
    score = 28
    summary = `Cash may run out by ${forecast.shortageDate}. Act on collections and bills today.`
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
