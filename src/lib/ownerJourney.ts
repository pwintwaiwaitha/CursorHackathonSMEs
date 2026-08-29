import type { AppStore } from '../storage/types'
import type {
  CashFlowHealth,
  DailyCashCheckIn,
  ForecastResult,
  PreferredLanguage,
} from '../types/models'
import { buildFallbackAdvice, buildAiAdviceRequest } from './aiAdvice'
import { DASHBOARD_COPY } from './dashboardCopy'
import { bilingualLine, type BilingualText } from './checkInCopy'
import { FORECAST_LEVELS } from './forecastEngine'
import { buildRiskCards } from './dashboardData'
import {
  expandRecurringDates,
  nextPaymentDue,
  remainingPayableMmk,
  derivePayableStatus,
} from './schedule'
import { computeSafeToSpend } from './dashboardMetrics'
import { formatDisplayDate } from './dates'
import { formatMmk } from './money'

export type OwnerStatusKind = 'safe' | 'attention' | 'high_risk'

export interface OwnerAction {
  id: string
  title: string
  href: string
}

/**
 * Remap existing health + forecast.risk to three plain-language sentences.
 * Does not invent a new score.
 */
export function mapOwnerStatus(
  health: CashFlowHealth,
  forecast: ForecastResult,
): OwnerStatusKind {
  if (
    health.status === 'critical' ||
    health.status === 'at_risk' ||
    forecast.risk === 'high' ||
    Boolean(forecast.shortageDate)
  ) {
    return 'high_risk'
  }
  if (health.status === 'watch' || forecast.risk === 'medium') {
    return 'attention'
  }
  return 'safe'
}

export function ownerStatusCopy(kind: OwnerStatusKind): BilingualText {
  if (kind === 'high_risk') {
    return DASHBOARD_COPY.statusHighRisk
  }
  if (kind === 'attention') {
    return DASHBOARD_COPY.statusAttention
  }
  return DASHBOARD_COPY.statusSafe
}

/**
 * Safe to Spend = max(0, currentCash − upcoming 7-day payables − emergency reserve).
 * Integer MMK. Does not call or change the forecast engine.
 */
export function safeToSpendMmk(options: {
  currentCashMmk: number
  upcomingPayables7dMmk: number
  emergencyReserveMmk: number
}): number {
  return Math.max(
    0,
    Math.trunc(options.currentCashMmk) -
      Math.trunc(options.upcomingPayables7dMmk) -
      Math.max(0, Math.trunc(options.emergencyReserveMmk)),
  )
}

export function computeSafeToSpendMmk(store: AppStore, _currentCashMmk: number, today: string): number {
  return computeSafeToSpend(store, today).safeToSpendMmk
}

export function upcomingPaymentLabel(
  store: AppStore,
  today: string,
  language: PreferredLanguage,
): string {
  const next = nextPaymentDue(store.payables, today)
  if (!next) {
    return bilingualLine(DASHBOARD_COPY.noUpcoming, language)
  }
  return `${next.name} · ${formatMmk(next.amountMmk)} · ${formatDisplayDate(next.date)}`
}

function actionHref(title: string): string {
  const text = title.toLowerCase()
  if (
    text.includes('collect') ||
    text.includes('customer') ||
    text.includes('supplier') ||
    text.includes('bill') ||
    text.includes('negotiate')
  ) {
    return '/payments'
  }
  if (
    text.includes('check-in') ||
    text.includes('check in') ||
    text.includes('stock') ||
    text.includes('discount') ||
    text.includes('expense')
  ) {
    return '/check-in'
  }
  return '/forecast'
}

export function topOwnerActions(
  store: AppStore,
  forecast: ForecastResult,
  today: string,
): OwnerAction[] {
  const titles: string[] = []
  for (const item of forecast.suggestedActions) {
    titles.push(item)
  }
  for (const item of forecast.recommendedActions) {
    titles.push(item)
  }
  try {
    const level = FORECAST_LEVELS.find((item) => item.horizonDays >= 7) ?? FORECAST_LEVELS[0]
    const fallback = buildFallbackAdvice(
      buildAiAdviceRequest(store, forecast, { ...level, horizonDays: 7, id: 'compat_7d' }),
    )
    for (const item of fallback.recommendedActions) {
      titles.push(item.title)
    }
  } catch {
    // Keep engine actions if advice payload cannot be built.
  }
  for (const risk of buildRiskCards(store, forecast, today)) {
    titles.push(risk.recommendedAction)
  }

  const seen = new Set<string>()
  const actions: OwnerAction[] = []
  for (const title of titles) {
    const key = title.trim().toLowerCase()
    if (!key || seen.has(key)) {
      continue
    }
    seen.add(key)
    actions.push({
      id: `action-${actions.length + 1}`,
      title: title.trim(),
      href: actionHref(title),
    })
    if (actions.length === 3) {
      break
    }
  }
  return actions
}

export interface RecurringPrefill {
  inventoryPurchasesMmk: number
  supplierPaymentsMmk: number
  operatingExpensesMmk: number
  otherCashPaidMmk: number
  applied: boolean
}

export function recurringOutflowsForDate(store: AppStore, date: string): RecurringPrefill {
  let inventoryPurchasesMmk = 0
  let supplierPaymentsMmk = 0
  let operatingExpensesMmk = 0
  let otherCashPaidMmk = 0

  for (const item of store.payables) {
    const remaining = remainingPayableMmk({
      ...item,
      status: derivePayableStatus(item, date),
    })
    if (remaining <= 0) {
      continue
    }
    const dueDates = expandRecurringDates(item.dueDate, item.recurrence, date, 1)
    if (!dueDates.includes(date)) {
      continue
    }
    if (item.category === 'stock') {
      inventoryPurchasesMmk += remaining
    } else if (
      item.category === 'rent' ||
      item.category === 'wages' ||
      item.category === 'utilities' ||
      item.category === 'fuel' ||
      item.category === 'tax'
    ) {
      operatingExpensesMmk += remaining
    } else {
      supplierPaymentsMmk += remaining
    }
  }

  for (const item of store.scheduledItems) {
    if (item.kind !== 'outflow') {
      continue
    }
    const dueDates = expandRecurringDates(item.dueDate, item.recurrence, date, 1)
    if (!dueDates.includes(date)) {
      continue
    }
    otherCashPaidMmk += Math.trunc(item.amountMmk)
  }

  const applied =
    inventoryPurchasesMmk +
      supplierPaymentsMmk +
      operatingExpensesMmk +
      otherCashPaidMmk >
    0

  return {
    inventoryPurchasesMmk,
    supplierPaymentsMmk,
    operatingExpensesMmk,
    otherCashPaidMmk,
    applied,
  }
}

const IN_KEYS = [
  'cashSalesMmk',
  'customerDebtCollectedMmk',
  'otherCashReceivedMmk',
  'creditSalesMmk',
] as const

const OUT_KEYS = [
  'operatingExpensesMmk',
  'inventoryPurchasesMmk',
  'supplierPaymentsMmk',
  'otherCashPaidMmk',
] as const

function cashInOf(item: DailyCashCheckIn): number {
  return item.cashSalesMmk + item.customerDebtCollectedMmk + item.otherCashReceivedMmk
}

function cashOutOf(item: DailyCashCheckIn): number {
  return (
    item.operatingExpensesMmk +
    item.inventoryPurchasesMmk +
    item.supplierPaymentsMmk +
    item.otherCashPaidMmk
  )
}

export type OwnerAmountKey = (typeof IN_KEYS)[number] | (typeof OUT_KEYS)[number]

/**
 * Extra UI warning: amount > 3× last-7-day average or > remaining cash.
 * Does not replace findUnusuallyLargeFields.
 */
export function findOwnerLargeFields(
  fields: Record<OwnerAmountKey, number>,
  recentCheckIns: DailyCashCheckIn[],
  remainingCashMmk: number,
): OwnerAmountKey[] {
  const last7 = [...recentCheckIns]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7)
  const avgIn =
    last7.length === 0
      ? 0
      : Math.round(last7.reduce((sum, item) => sum + cashInOf(item), 0) / last7.length)
  const avgOut =
    last7.length === 0
      ? 0
      : Math.round(last7.reduce((sum, item) => sum + cashOutOf(item), 0) / last7.length)
  const cashLeft = Math.max(0, Math.trunc(remainingCashMmk))
  const flagged: OwnerAmountKey[] = []

  for (const key of IN_KEYS) {
    const value = Math.trunc(fields[key])
    if (value <= 0) {
      continue
    }
    if ((avgIn > 0 && value > avgIn * 3) || value > cashLeft) {
      flagged.push(key)
    }
  }
  for (const key of OUT_KEYS) {
    const value = Math.trunc(fields[key])
    if (value <= 0) {
      continue
    }
    if ((avgOut > 0 && value > avgOut * 3) || value > cashLeft) {
      flagged.push(key)
    }
  }
  return flagged
}

export function formatSavedAt(iso: string | null, language: PreferredLanguage): string {
  if (!iso) {
    return bilingualLine(DASHBOARD_COPY.savedOnPhone, language)
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return bilingualLine(DASHBOARD_COPY.savedOnPhone, language)
  }
  const stamp = date.toLocaleString(language === 'my' ? 'my-MM' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${bilingualLine(DASHBOARD_COPY.savedOnPhone, language)} · ${stamp}`
}

export function reminderTimeReached(reminderTime: string, now = new Date()): boolean {
  const [hours, minutes] = reminderTime.split(':').map((part) => Number.parseInt(part, 10))
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return false
  }
  return now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)
}
