import type { AppStore } from '../storage/types'
import type { ForecastResult } from '../types/models'
import { EXPENSE_CATEGORY_LABELS } from '../types/models'
import { rechainCheckIns, sortCheckInsByDate } from './checkIn'
import { EXPENSE_BREAKDOWN_LABELS } from './checkInCopy'
import { formatDisplayDate } from './dates'
import {
  derivePayableStatus,
  remainingPayableMmk,
  remainingReceivableMmk,
} from './schedule'

export interface RiskCardModel {
  id: string
  title: string
  severity: 'healthy' | 'watch' | 'high'
  whatMayHappen: string
  whenItMayHappen: string
  shortageAmountMmk: number
  why: string
  recommendedAction: string
}

export function buildRiskCards(
  store: AppStore,
  forecast: ForecastResult,
  today: string,
): RiskCardModel[] {
  const cards: RiskCardModel[] = []
  const openPayables = store.payables.filter(
    (item) => remainingPayableMmk({ ...item, status: derivePayableStatus(item, today) }) > 0,
  )
  const openReceivables = store.receivables.filter(
    (item) => remainingReceivableMmk(item) > 0,
  )
  const nextPayable = [...openPayables].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
  const nextReceivable = [...openReceivables].sort((a, b) =>
    a.expectedPaymentDate.localeCompare(b.expectedPaymentDate),
  )[0]

  let why = forecast.mainRiskDrivers[0] ?? 'Cash in and cash out are close together.'
  const supplierBeforeCustomer = Boolean(
    nextPayable &&
      nextReceivable &&
      nextPayable.dueDate < nextReceivable.expectedPaymentDate,
  )
  if (supplierBeforeCustomer) {
    why = 'Supplier payment is due before customer payments arrive.'
  }

  const shortageAction =
    forecast.suggestedActions[0] ??
    'Collect overdue payments and postpone the non-essential stock order.'

  if (forecast.shortageDate && forecast.shortageAmountMmk > 0) {
    cards.push({
      id: 'shortage',
      title: 'High Cash-Flow Risk',
      severity: 'high',
      whatMayHappen: 'The shop may not have enough cash to cover bills on that day.',
      whenItMayHappen: formatDisplayDate(forecast.shortageDate),
      shortageAmountMmk: forecast.shortageAmountMmk,
      why,
      recommendedAction: supplierBeforeCustomer
        ? 'Collect overdue payments and postpone the non-essential stock order.'
        : shortageAction,
    })
  } else if (forecast.risk === 'medium' || forecast.risk === 'high') {
    cards.push({
      id: 'watch',
      title: 'Cash-Flow Watch',
      severity: 'watch',
      whatMayHappen: 'Cash may get tight if a bill lands before sales come in.',
      whenItMayHappen: forecast.shortageDate
        ? formatDisplayDate(forecast.shortageDate)
        : `${formatDisplayDate(forecast.startDate)} to ${formatDisplayDate(forecast.endDate)}`,
      shortageAmountMmk: 0,
      why,
      recommendedAction: forecast.suggestedActions[0] ?? 'Collect overdue payments this week.',
    })
  } else {
    cards.push({
      id: 'healthy',
      title: 'Healthy cash path',
      severity: 'healthy',
      whatMayHappen: 'No cash shortage is projected in this view.',
      whenItMayHappen: `${formatDisplayDate(forecast.startDate)} to ${formatDisplayDate(forecast.endDate)}`,
      shortageAmountMmk: 0,
      why: 'Recorded cash and known bills currently cover this period.',
      recommendedAction: 'Keep doing the Daily Cash Check-in so this view stays accurate.',
    })
  }

  return cards
}

export function historicalClosingPoints(store: AppStore, limit = 14) {
  const start = store.profile?.startingCashBalanceMmk ?? 0
  const chained = sortCheckInsByDate(rechainCheckIns(store.checkIns, start))
  return chained.slice(-limit).map((item) => ({
    date: item.date,
    historical: item.closingCashMmk,
    predicted: null as number | null,
  }))
}

export function expenseCategoryChartData(store: AppStore) {
  const totals = new Map<string, number>()

  function add(name: string, amount: number) {
    if (amount <= 0) {
      return
    }
    totals.set(name, (totals.get(name) ?? 0) + amount)
  }

  for (const checkIn of store.checkIns) {
    if (checkIn.expenseBreakdowns.length > 0) {
      for (const line of checkIn.expenseBreakdowns) {
        add(EXPENSE_BREAKDOWN_LABELS[line.category].en, line.amountMmk)
      }
    } else if (checkIn.operatingExpensesMmk > 0) {
      add('Operating', checkIn.operatingExpensesMmk)
    }
    add('Inventory', checkIn.inventoryPurchasesMmk)
    add('Suppliers', checkIn.supplierPaymentsMmk)
  }

  if (totals.size === 0) {
    for (const payable of store.payables) {
      add(EXPENSE_CATEGORY_LABELS[payable.category], payable.amountMmk)
    }
  }

  return [...totals.entries()]
    .map(([name, amountMmk]) => ({ name, amountMmk }))
    .sort((a, b) => b.amountMmk - a.amountMmk)
    .slice(0, 8)
}
