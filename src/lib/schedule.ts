import { addDaysIso, addMonthsIso, dateRange } from './dates'
import { formatMmk } from './money'
import type {
  ExpenseCategory,
  Payable,
  PayableStatus,
  Receivable,
  ReceivableStatus,
  Recurrence,
} from '../types/models'

export interface CalendarEntry {
  date: string
  kind: 'receivable' | 'payable'
  name: string
  amountMmk: number
  status: string
}

export interface NextPaymentDue {
  name: string
  date: string
  amountMmk: number
  kind: 'payable' | 'receivable'
}

export interface DueWindows {
  within3DaysMmk: number
  within7DaysMmk: number
  within30DaysMmk: number
  overdueMmk: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asInt(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value)
  }
  return fallback
}

export function remainingReceivableMmk(item: Receivable): number {
  if (item.status === 'paid') {
    return 0
  }
  return Math.max(0, Math.trunc(item.amountMmk) - Math.trunc(item.amountPaidMmk))
}

export function remainingPayableMmk(item: Payable): number {
  if (item.status === 'paid') {
    return 0
  }
  return Math.trunc(item.amountMmk)
}

export function deriveReceivableStatus(
  item: Receivable,
  today: string,
): ReceivableStatus {
  if (remainingReceivableMmk({ ...item, status: 'pending' }) === 0) {
    return 'paid'
  }
  if (item.expectedPaymentDate < today) {
    return 'overdue'
  }
  if (item.amountPaidMmk > 0) {
    return 'partially_paid'
  }
  return 'pending'
}

export function derivePayableStatus(item: Payable, today: string): PayableStatus {
  if (item.status === 'paid') {
    return 'paid'
  }
  if (item.dueDate < today) {
    return 'overdue'
  }
  return 'pending'
}

export function applyReceivablePayment(
  item: Receivable,
  extraPaidMmk: number,
  today: string,
): Receivable {
  const extra = Math.max(0, Math.trunc(extraPaidMmk))
  const amountPaidMmk = Math.min(item.amountMmk, item.amountPaidMmk + extra)
  const next = { ...item, amountPaidMmk }
  return { ...next, status: deriveReceivableStatus(next, today) }
}

export function markReceivablePaid(item: Receivable): Receivable {
  return {
    ...item,
    amountPaidMmk: item.amountMmk,
    status: 'paid',
  }
}

export function markPayablePaid(item: Payable): Payable {
  return { ...item, status: 'paid' }
}

export function expandRecurringDates(
  startDueDate: string,
  recurrence: Recurrence,
  rangeStart: string,
  horizonDays: number,
): string[] {
  const endDate = addDaysIso(rangeStart, horizonDays - 1)
  if (recurrence === 'once') {
    if (startDueDate >= rangeStart && startDueDate <= endDate) {
      return [startDueDate]
    }
    return []
  }

  const dates: string[] = []
  let cursor = startDueDate
  let guard = 0
  while (cursor < rangeStart && guard < 5000) {
    cursor = recurrence === 'weekly' ? addDaysIso(cursor, 7) : addMonthsIso(cursor, 1)
    guard += 1
  }
  while (cursor <= endDate && guard < 5000) {
    if (cursor >= rangeStart) {
      dates.push(cursor)
    }
    cursor = recurrence === 'weekly' ? addDaysIso(cursor, 7) : addMonthsIso(cursor, 1)
    guard += 1
  }
  return dates
}

export function totalOpenReceivablesMmk(items: Receivable[]): number {
  return items.reduce((sum, item) => sum + remainingReceivableMmk(item), 0)
}

export function totalOverdueReceivablesMmk(
  items: Receivable[],
  today: string,
): number {
  return items.reduce((sum, item) => {
    const status = deriveReceivableStatus(item, today)
    if (status !== 'overdue') {
      return sum
    }
    return sum + remainingReceivableMmk(item)
  }, 0)
}

export function totalUpcomingPayablesMmk(
  items: Payable[],
  today: string,
  withinDays = 30,
): number {
  const end = addDaysIso(today, withinDays)
  return items.reduce((sum, item) => {
    const remaining = remainingPayableMmk({
      ...item,
      status: derivePayableStatus(item, today),
    })
    if (remaining <= 0) {
      return sum
    }
    if (item.dueDate < today || item.dueDate > end) {
      return sum
    }
    return sum + remaining
  }, 0)
}

export function nextPaymentDue(
  payables: Payable[],
  today: string,
): NextPaymentDue | null {
  const open = payables
    .map((item) => ({
      item,
      remaining: remainingPayableMmk({
        ...item,
        status: derivePayableStatus(item, today),
      }),
    }))
    .filter((row) => row.remaining > 0)
    .sort((a, b) => a.item.dueDate.localeCompare(b.item.dueDate))

  const first = open[0]
  if (!first) {
    return null
  }
  return {
    name: first.item.supplierName,
    date: first.item.dueDate,
    amountMmk: first.remaining,
    kind: 'payable',
  }
}

export function expectedCashGapMmk(options: {
  currentCashMmk: number
  receivables: Receivable[]
  payables: Payable[]
  today: string
  withinDays?: number
}): number {
  const days = options.withinDays ?? 7
  const end = addDaysIso(options.today, days)
  const expectedIn = options.receivables.reduce((sum, item) => {
    const remaining = remainingReceivableMmk(item)
    if (remaining <= 0) {
      return sum
    }
    const date = item.expectedPaymentDate
    if (date > end) {
      return sum
    }
    return sum + remaining
  }, 0)
  const expectedOut = options.payables.reduce((sum, item) => {
    const remaining = remainingPayableMmk({
      ...item,
      status: derivePayableStatus(item, options.today),
    })
    if (remaining <= 0) {
      return sum
    }
    if (item.dueDate > end) {
      return sum
    }
    return sum + remaining
  }, 0)
  return Math.max(0, expectedOut - options.currentCashMmk - expectedIn)
}

export function receivableWindows(
  items: Receivable[],
  today: string,
): DueWindows {
  return moneyWindows(
    items,
    (item) => item.expectedPaymentDate,
    remainingReceivableMmk,
    today,
  )
}

export function payableWindows(items: Payable[], today: string): DueWindows {
  return moneyWindows(
    items,
    (item) => item.dueDate,
    (item) =>
      remainingPayableMmk({
        ...item,
        status: derivePayableStatus(item, today),
      }),
    today,
  )
}

function moneyWindows<T>(
  items: T[],
  getDate: (item: T) => string,
  remaining: (item: T) => number,
  today: string,
): DueWindows {
  const end3 = addDaysIso(today, 3)
  const end7 = addDaysIso(today, 7)
  const end30 = addDaysIso(today, 30)
  let within3DaysMmk = 0
  let within7DaysMmk = 0
  let within30DaysMmk = 0
  let overdueMmk = 0

  for (const item of items) {
    const amount = remaining(item)
    if (amount <= 0) {
      continue
    }
    const date = getDate(item)
    if (date < today) {
      overdueMmk += amount
      continue
    }
    if (date <= end30) {
      within30DaysMmk += amount
    }
    if (date <= end7) {
      within7DaysMmk += amount
    }
    if (date <= end3) {
      within3DaysMmk += amount
    }
  }

  return { within3DaysMmk, within7DaysMmk, within30DaysMmk, overdueMmk }
}

export function buildPaymentCalendar(
  receivables: Receivable[],
  payables: Payable[],
  today: string,
  horizonDays = 30,
): CalendarEntry[] {
  const entries: CalendarEntry[] = []
  for (const item of receivables) {
    const remaining = remainingReceivableMmk(item)
    if (remaining <= 0) {
      continue
    }
    const date = item.expectedPaymentDate < today ? today : item.expectedPaymentDate
    if (date > addDaysIso(today, horizonDays - 1)) {
      continue
    }
    entries.push({
      date,
      kind: 'receivable',
      name: item.customerName,
      amountMmk: remaining,
      status: deriveReceivableStatus(item, today),
    })
  }
  for (const item of payables) {
    const remaining = remainingPayableMmk({
      ...item,
      status: derivePayableStatus(item, today),
    })
    if (remaining <= 0) {
      continue
    }
    for (const date of expandRecurringDates(
      item.dueDate,
      item.recurrence,
      today,
      horizonDays,
    )) {
      entries.push({
        date,
        kind: 'payable',
        name: item.supplierName,
        amountMmk: remaining,
        status: derivePayableStatus(item, today),
      })
    }
  }
  return entries.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))
}

export function groupCalendarByDate(
  entries: CalendarEntry[],
  today: string,
  horizonDays = 30,
): { date: string; entries: CalendarEntry[] }[] {
  const byDate = new Map<string, CalendarEntry[]>()
  for (const date of dateRange(today, horizonDays)) {
    byDate.set(date, [])
  }
  for (const entry of entries) {
    const list = byDate.get(entry.date)
    if (list) {
      list.push(entry)
    }
  }
  return [...byDate.entries()]
    .filter(([, list]) => list.length > 0)
    .map(([date, list]) => ({ date, entries: list }))
}

export function myanmarPaymentReminder(options: {
  customerName: string
  businessName: string
  remainingMmk: number
  expectedPaymentDate: string
}): string {
  return [
    `မင်္ဂလာပါ ${options.customerName} ခင်ဗျာ/ရှင်၊`,
    '',
    `${options.businessName} မှ မေတ္တာရပ်ခံအပ်ပါသည်။ ပေးရန်ကျန်ငွေ ${formatMmk(options.remainingMmk)} ရှိပါသည်။ မျှော်မှန်းရက်မှာ ${options.expectedPaymentDate} ဖြစ်ပါသည်။`,
    '',
    'အဆင်ပြေသည့်အချိန်တွင် ပြန်လည်ပေးသွင်းပေးပါရန် ရိုကျိုးစွာ မေတ္တာရပ်ခံအပ်ပါသည်။ ကျေးဇူးတင်ပါသည်။',
  ].join('\n')
}

export function normalizeReceivable(raw: unknown): Receivable | null {
  if (!isRecord(raw) || typeof raw.customerName !== 'string') {
    return null
  }
  const expectedPaymentDate =
    (typeof raw.expectedPaymentDate === 'string' && raw.expectedPaymentDate) ||
    (typeof raw.expectedCollectDate === 'string' && raw.expectedCollectDate) ||
    (typeof raw.dueDate === 'string' && raw.dueDate) ||
    ''
  if (!expectedPaymentDate) {
    return null
  }
  const amountMmk = asInt(raw.amountMmk)
  const amountPaidMmk = asInt(raw.amountPaidMmk)
  let status = raw.status
  if (status === 'open') {
    status = 'pending'
  }
  if (status === 'collected') {
    status = 'paid'
  }
  const item: Receivable = {
    id: typeof raw.id === 'string' ? raw.id : `recv_${expectedPaymentDate}`,
    customerName: raw.customerName,
    amountMmk,
    expectedPaymentDate,
    amountPaidMmk: status === 'paid' ? amountMmk : amountPaidMmk,
    status:
      status === 'pending' ||
      status === 'partially_paid' ||
      status === 'paid' ||
      status === 'overdue'
        ? status
        : 'pending',
    notes: typeof raw.notes === 'string' ? raw.notes : '',
  }
  return item
}

export function normalizePayable(raw: unknown): Payable | null {
  if (!isRecord(raw) || typeof raw.supplierName !== 'string') {
    return null
  }
  const dueDate =
    (typeof raw.dueDate === 'string' && raw.dueDate) ||
    (typeof raw.expectedPayDate === 'string' && raw.expectedPayDate) ||
    ''
  if (!dueDate) {
    return null
  }
  let status = raw.status
  if (status === 'open') {
    status = 'pending'
  }
  const category = raw.category
  const recurrence = raw.recurrence
  return {
    id: typeof raw.id === 'string' ? raw.id : `pay_${dueDate}`,
    supplierName: raw.supplierName,
    amountMmk: asInt(raw.amountMmk),
    dueDate,
    category:
      category === 'rent' ||
      category === 'wages' ||
      category === 'stock' ||
      category === 'utilities' ||
      category === 'fuel' ||
      category === 'tax' ||
      category === 'other'
        ? (category as ExpenseCategory)
        : 'stock',
    status: status === 'paid' || status === 'overdue' || status === 'pending' ? status : 'pending',
    recurrence:
      recurrence === 'weekly' || recurrence === 'monthly' || recurrence === 'once'
        ? recurrence
        : 'once',
    notes: typeof raw.notes === 'string' ? raw.notes : '',
  }
}
