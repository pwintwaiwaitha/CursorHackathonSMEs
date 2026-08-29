import type { AppStore } from '../storage/types'
import type {
  CashFlowHealth,
  DailyCashCheckIn,
  ForecastResult,
  Payable,
} from '../types/models'
import { getCurrentCashMmk } from './cashBalance'
import { addDaysIso, dateRange, formatDisplayDate } from './dates'
import {
  derivePayableStatus,
  deriveReceivableStatus,
  payableWindows,
  remainingPayableMmk,
  remainingReceivableMmk,
} from './schedule'

export const CASH_COVER_MIN_EXPENSE_DAYS = 7

export type GapCause = 'supplier_before_collections' | 'large_bills'

export interface SafeToSpendResult {
  rawMmk: number
  safeToSpendMmk: number
  expectedCashGapMmk: number
  currentCashMmk: number
  essentialBills7dMmk: number
  emergencyReserveMmk: number
  isNegative: boolean
  gapCause: GapCause | null
}

export type CashCoverResult =
  | { kind: 'days'; days: number; averageDailyOutflowMmk: number }
  | { kind: 'more_than_year'; averageDailyOutflowMmk: number }
  | { kind: 'insufficient'; reason: 'few_days' | 'zero_average' }

export type HubStatusKind = 'safe_14' | 'needs_attention' | 'shortage'

export interface HubStatus {
  kind: HubStatusKind
  sentenceEn: string
  sentenceMy: string
  shortageDate: string | null
}

export type LowestCashResult =
  | { kind: 'value'; amountMmk: number; earlyEstimate: boolean }
  | { kind: 'no_movements' }

export type TodayActionKind = 'collect_overdue' | 'pay_bill' | 'review_stock'

export type ActionPriority = 'high' | 'medium' | 'low'

export interface TodayActionItem {
  id: string
  kind: TodayActionKind
  titleEn: string
  titleMy: string
  amountMmk: number
  reasonEn: string
  reasonMy: string
  dueDate: string
  priority: ActionPriority
  href: string
}

export interface TimelineDay {
  date: string
  customerInMmk: number
  supplierOutMmk: number
  billsOutMmk: number
  isPredictedLow: boolean
  predictedBalanceMmk: number
  customerNames: string[]
  supplierNames: string[]
  billNames: string[]
}

export function essentialDailyOutflowMmk(checkIn: Pick<
  DailyCashCheckIn,
  | 'operatingExpensesMmk'
  | 'inventoryPurchasesMmk'
  | 'supplierPaymentsMmk'
  | 'otherCashPaidMmk'
>): number {
  return (
    Math.trunc(checkIn.operatingExpensesMmk) +
    Math.trunc(checkIn.inventoryPurchasesMmk) +
    Math.trunc(checkIn.supplierPaymentsMmk) +
    Math.trunc(checkIn.otherCashPaidMmk)
  )
}

export function essentialPaymentsDueWithin7DaysMmk(
  payables: Payable[],
  today: string,
): number {
  const windows = payableWindows(payables, today)
  return Math.trunc(windows.within7DaysMmk) + Math.trunc(windows.overdueMmk)
}

export function cashGapCause(store: AppStore, today: string): GapCause {
  const nextPayable = store.payables
    .map((item) => ({
      item,
      remaining: remainingPayableMmk({
        ...item,
        status: derivePayableStatus(item, today),
      }),
    }))
    .filter((row) => row.remaining > 0)
    .sort((a, b) => a.item.dueDate.localeCompare(b.item.dueDate))[0]
  const nextReceivable = store.receivables
    .map((item) => ({
      item,
      remaining: remainingReceivableMmk(item),
    }))
    .filter((row) => row.remaining > 0)
    .sort((a, b) =>
      a.item.expectedPaymentDate.localeCompare(b.item.expectedPaymentDate),
    )[0]

  if (
    nextPayable &&
    nextReceivable &&
    nextPayable.item.dueDate < nextReceivable.item.expectedPaymentDate
  ) {
    return 'supplier_before_collections'
  }
  return 'large_bills'
}

export function computeSafeToSpend(
  store: AppStore,
  today: string,
): SafeToSpendResult {
  const currentCashMmk = Math.trunc(getCurrentCashMmk(store))
  const essentialBills7dMmk = essentialPaymentsDueWithin7DaysMmk(
    store.payables,
    today,
  )
  const emergencyReserveMmk = Math.trunc(
    store.scenarios.emergencyCashReserveTargetMmk ?? 0,
  )
  const rawMmk = currentCashMmk - essentialBills7dMmk - emergencyReserveMmk
  const isNegative = rawMmk < 0
  return {
    rawMmk,
    safeToSpendMmk: isNegative ? 0 : rawMmk,
    expectedCashGapMmk: isNegative ? Math.abs(rawMmk) : 0,
    currentCashMmk,
    essentialBills7dMmk,
    emergencyReserveMmk,
    isNegative,
    gapCause: isNegative ? cashGapCause(store, today) : null,
  }
}

export function cashCoverFromParts(options: {
  currentCashMmk: number
  averageDailyOutflowMmk: number
  expenseDayCount: number
}): CashCoverResult {
  if (options.expenseDayCount < CASH_COVER_MIN_EXPENSE_DAYS) {
    return { kind: 'insufficient', reason: 'few_days' }
  }
  const averageDailyOutflowMmk = Math.trunc(options.averageDailyOutflowMmk)
  if (averageDailyOutflowMmk < 1) {
    return { kind: 'insufficient', reason: 'zero_average' }
  }
  const days = Math.trunc(options.currentCashMmk) / averageDailyOutflowMmk
  if (days > 365) {
    return { kind: 'more_than_year', averageDailyOutflowMmk }
  }
  return {
    kind: 'days',
    days: Math.max(0, Math.floor(days)),
    averageDailyOutflowMmk,
  }
}

export function computeCashCover(store: AppStore): CashCoverResult {
  const currentCashMmk = Math.trunc(getCurrentCashMmk(store))
  const expenseDays = store.checkIns.filter(
    (item) => essentialDailyOutflowMmk(item) > 0,
  )
  const total = expenseDays.reduce(
    (sum, item) => sum + essentialDailyOutflowMmk(item),
    0,
  )
  const averageDailyOutflowMmk =
    expenseDays.length === 0 ? 0 : Math.round(total / expenseDays.length)
  return cashCoverFromParts({
    currentCashMmk,
    averageDailyOutflowMmk,
    expenseDayCount: expenseDays.length,
  })
}

export function cashHubStatus(
  forecast: ForecastResult,
  health: CashFlowHealth,
): HubStatus {
  if (forecast.shortageDate) {
    const date = forecast.shortageDate
    return {
      kind: 'shortage',
      sentenceEn: `Possible shortage on ${formatDisplayDate(date)}`,
      sentenceMy: `${formatDisplayDate(date)} တွင် ငွေပြတ်နိုင်သည်`,
      shortageDate: date,
    }
  }
  if (health.status === 'healthy' && forecast.risk === 'low') {
    return {
      kind: 'safe_14',
      sentenceEn: 'Safe for the next 14 days',
      sentenceMy: 'လာမည့် ၁၄ ရက်အတွက် လုံခြုံသည်',
      shortageDate: null,
    }
  }
  return {
    kind: 'needs_attention',
    sentenceEn: 'Cash flow needs attention',
    sentenceMy: 'ငွေလည်ပတ်မှုကို ဂရုစိုက်ရန်လိုသည်',
    shortageDate: null,
  }
}

export function hasForecastMovements(forecast: ForecastResult): boolean {
  const points = forecast.points
  if (points.some((point) => point.inflowsMmk > 0 || point.outflowsMmk > 0)) {
    return true
  }
  if (points.length === 0) {
    return false
  }
  const first = points[0].projectedBalanceMmk
  return points.some((point) => point.projectedBalanceMmk !== first)
}

export function lowestIn14Days(
  forecast: ForecastResult,
  recordedDays: number,
): LowestCashResult {
  if (!hasForecastMovements(forecast)) {
    return { kind: 'no_movements' }
  }
  return {
    kind: 'value',
    amountMmk: Math.trunc(forecast.lowestPredictedCashMmk),
    earlyEstimate: recordedDays < 7,
  }
}

export function latestBooksUpdatedAt(
  store: AppStore,
  nowIso = new Date().toISOString(),
): string {
  let latest: string | null = null
  for (const item of store.checkIns) {
    if (!latest || item.updatedAt > latest) {
      latest = item.updatedAt
    }
  }
  return latest ?? nowIso
}

export function buildTodayActionItems(
  store: AppStore,
  today: string,
): TodayActionItem[] {
  const items: TodayActionItem[] = []

  const overdueReceivables = store.receivables
    .map((item) => ({
      item,
      remaining: remainingReceivableMmk(item),
      status: deriveReceivableStatus(item, today),
    }))
    .filter((row) => row.remaining > 0 && row.status === 'overdue')
    .sort((a, b) => b.remaining - a.remaining)

  for (const row of overdueReceivables) {
    items.push({
      id: `recv:${row.item.id}`,
      kind: 'collect_overdue',
      titleEn: `Collect from ${row.item.customerName}`,
      titleMy: `${row.item.customerName} ထံမှ ကောက်ခံပါ`,
      amountMmk: row.remaining,
      reasonEn: 'This customer payment is overdue.',
      reasonMy: 'ဤဖောက်သည်ငွေ ကျော်လွန်နေသည်။',
      dueDate: row.item.expectedPaymentDate,
      priority: 'high',
      href: '/payments',
    })
  }

  const nearPayables = store.payables
    .map((item) => ({
      item,
      remaining: remainingPayableMmk({
        ...item,
        status: derivePayableStatus(item, today),
      }),
      status: derivePayableStatus(item, today),
    }))
    .filter((row) => {
      if (row.remaining <= 0) {
        return false
      }
      return row.item.dueDate <= addDaysIso(today, 7)
    })
    .sort((a, b) => a.item.dueDate.localeCompare(b.item.dueDate))

  for (const row of nearPayables) {
    const overdue = row.status === 'overdue' || row.item.dueDate < today
    items.push({
      id: `pay:${row.item.id}`,
      kind: 'pay_bill',
      titleEn: `Pay ${row.item.supplierName}`,
      titleMy: `${row.item.supplierName} ကို ပေးချေပါ`,
      amountMmk: row.remaining,
      reasonEn: overdue
        ? 'This supplier bill is overdue.'
        : 'This bill is due within 7 days.',
      reasonMy: overdue
        ? 'ဤကုန်သည်ဘီလ် ကျော်လွန်နေသည်။'
        : 'ဤဘီလ်သည် ၇ ရက်အတွင်း ကျသည်။',
      dueDate: row.item.dueDate,
      priority: overdue ? 'high' : 'medium',
      href: '/payments',
    })
  }

  const extraStock = Math.trunc(store.scenarios.extraStockPurchaseMmk ?? 0)
  if (extraStock > 0) {
    items.push({
      id: 'stock:extra',
      kind: 'review_stock',
      titleEn: 'Review extra stock purchase',
      titleMy: 'အပိုကုန်ဝယ်ယူမှုကို စစ်ပါ',
      amountMmk: extraStock,
      reasonEn: 'A planned extra stock buy is in your what-if assumptions.',
      reasonMy: 'စီစဉ်ထားသော အပိုကုန်ဝယ်ယူမှုသည် ယူဆချက်တွင် ရှိသည်။',
      dueDate: today,
      priority: 'medium',
      href: '/what-if',
    })
  } else {
    const latestStock = [...store.checkIns]
      .sort((a, b) => a.date.localeCompare(b.date))
      .at(-1)?.inventoryPurchasesMmk
    if (latestStock && latestStock > 0) {
      items.push({
        id: 'stock:recent',
        kind: 'review_stock',
        titleEn: 'Check extra stock buying',
        titleMy: 'အပိုကုန်ဝယ်မှုကို စစ်ပါ',
        amountMmk: Math.trunc(latestStock),
        reasonEn: 'Recent inventory buying may tighten cash if bills land first.',
        reasonMy: 'မကြာသေးမီ ကုန်ဝယ်မှုကြောင့် ဘီလ်မတိုင်မီ ငွေကျပ်နိုင်သည်။',
        dueDate: today,
        priority: 'low',
        href: '/what-if',
      })
    }
  }

  const rank: Record<ActionPriority, number> = { high: 0, medium: 1, low: 2 }
  return items
    .sort((a, b) => rank[a.priority] - rank[b.priority] || a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3)
}

export function buildSevenDayTimeline(
  store: AppStore,
  forecast: ForecastResult,
  today: string,
): TimelineDay[] {
  const dates = dateRange(today, 7)
  let lowDate = forecast.points[0]?.date ?? null
  let lowBalance = forecast.points[0]?.projectedBalanceMmk
  for (const point of forecast.points) {
    if (lowBalance === undefined || point.projectedBalanceMmk < lowBalance) {
      lowBalance = point.projectedBalanceMmk
      lowDate = point.date
    }
  }

  return dates.map((date) => {
    const customerRows = store.receivables.filter((item) => {
      const remaining = remainingReceivableMmk(item)
      if (remaining <= 0) {
        return false
      }
      if (item.expectedPaymentDate === date) {
        return true
      }
      return (
        date === today &&
        deriveReceivableStatus(item, today) === 'overdue'
      )
    })
    const payableRows = store.payables.filter((item) => {
      const remaining = remainingPayableMmk({
        ...item,
        status: derivePayableStatus(item, today),
      })
      if (remaining <= 0) {
        return false
      }
      if (item.dueDate === date) {
        return true
      }
      return date === today && item.dueDate < today
    })
    const supplierRows = payableRows.filter((item) => item.category === 'stock')
    const billRows = payableRows.filter((item) => item.category !== 'stock')
    const point = forecast.points.find((row) => row.date === date)

    return {
      date,
      customerInMmk: customerRows.reduce(
        (sum, item) => sum + remainingReceivableMmk(item),
        0,
      ),
      supplierOutMmk: supplierRows.reduce(
        (sum, item) =>
          sum +
          remainingPayableMmk({
            ...item,
            status: derivePayableStatus(item, today),
          }),
        0,
      ),
      billsOutMmk: billRows.reduce(
        (sum, item) =>
          sum +
          remainingPayableMmk({
            ...item,
            status: derivePayableStatus(item, today),
          }),
        0,
      ),
      isPredictedLow: lowDate === date,
      predictedBalanceMmk: point?.projectedBalanceMmk ?? 0,
      customerNames: customerRows.map((item) => item.customerName),
      supplierNames: supplierRows.map((item) => item.supplierName),
      billNames: billRows.map((item) => item.supplierName),
    }
  })
}

export function visibleTodayActions(
  items: TodayActionItem[],
  completedIds: ReadonlySet<string>,
): TodayActionItem[] {
  return items.filter((item) => !completedIds.has(item.id)).slice(0, 3)
}

export function formatHiddenMmk(hideAmounts: boolean, amountMmk: number): string {
  if (hideAmounts) {
    return '•••• MMK'
  }
  const safe = Math.trunc(amountMmk)
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Math.abs(safe))
  const sign = safe < 0 ? '-' : ''
  return `${sign}${formatted} MMK`
}
