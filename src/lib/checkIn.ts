import type {
  DailyCashCheckIn,
  ExpenseBreakdownLine,
} from '../types/models'

export interface CheckInCashFields {
  openingCashMmk: number
  cashSalesMmk: number
  customerDebtCollectedMmk: number
  creditSalesMmk: number
  operatingExpensesMmk: number
  inventoryPurchasesMmk: number
  supplierPaymentsMmk: number
  otherCashReceivedMmk: number
  otherCashPaidMmk: number
}

export const CHECK_IN_AMOUNT_KEYS = [
  'openingCashMmk',
  'cashSalesMmk',
  'customerDebtCollectedMmk',
  'creditSalesMmk',
  'operatingExpensesMmk',
  'inventoryPurchasesMmk',
  'supplierPaymentsMmk',
  'otherCashReceivedMmk',
  'otherCashPaidMmk',
] as const

export type CheckInAmountKey = (typeof CHECK_IN_AMOUNT_KEYS)[number]

export function sumExpenseBreakdowns(lines: ExpenseBreakdownLine[]): number {
  return lines.reduce((sum, line) => sum + Math.trunc(line.amountMmk), 0)
}

export function resolveOperatingExpensesMmk(
  operatingExpensesMmk: number,
  expenseBreakdowns: ExpenseBreakdownLine[],
): number {
  if (expenseBreakdowns.length === 0) {
    return Math.trunc(operatingExpensesMmk)
  }
  return sumExpenseBreakdowns(expenseBreakdowns)
}

/**
 * Closing cash ignores credit sales. Credit is not cash until collected.
 */
export function calculateClosingCashMmk(fields: CheckInCashFields): number {
  return (
    Math.trunc(fields.openingCashMmk) +
    Math.trunc(fields.cashSalesMmk) +
    Math.trunc(fields.customerDebtCollectedMmk) +
    Math.trunc(fields.otherCashReceivedMmk) -
    Math.trunc(fields.operatingExpensesMmk) -
    Math.trunc(fields.inventoryPurchasesMmk) -
    Math.trunc(fields.supplierPaymentsMmk) -
    Math.trunc(fields.otherCashPaidMmk)
  )
}

export function checkInNetCashMmk(fields: CheckInCashFields): number {
  return calculateClosingCashMmk(fields) - Math.trunc(fields.openingCashMmk)
}

export function sortCheckInsByDate(
  checkIns: DailyCashCheckIn[],
): DailyCashCheckIn[] {
  return [...checkIns].sort((a, b) => a.date.localeCompare(b.date))
}

export function getPreviousCheckIn(
  checkIns: DailyCashCheckIn[],
  date: string,
): DailyCashCheckIn | undefined {
  const earlier = sortCheckInsByDate(checkIns).filter((item) => item.date < date)
  return earlier[earlier.length - 1]
}

export function getOpeningCashMmk(
  checkIns: DailyCashCheckIn[],
  date: string,
  startingCashBalanceMmk: number,
): number {
  const previous = getPreviousCheckIn(checkIns, date)
  if (!previous) {
    return Math.trunc(startingCashBalanceMmk)
  }
  return Math.trunc(previous.closingCashMmk)
}

export function hasDuplicateCheckInDate(
  checkIns: DailyCashCheckIn[],
  date: string,
  exceptId?: string,
): boolean {
  return checkIns.some(
    (item) => item.date === date && item.id !== exceptId,
  )
}

export function findNegativeAmountFields(
  fields: CheckInCashFields,
  expenseBreakdowns: ExpenseBreakdownLine[] = [],
): string[] {
  const negatives: string[] = []
  for (const key of CHECK_IN_AMOUNT_KEYS) {
    if (fields[key] < 0) {
      negatives.push(key)
    }
  }
  for (const line of expenseBreakdowns) {
    if (line.amountMmk < 0) {
      negatives.push(`breakdown:${line.id}`)
    }
  }
  return negatives
}

export function findUnusuallyLargeFields(
  fields: CheckInCashFields,
  averageMonthlySalesMmk: number,
): CheckInAmountKey[] {
  const monthly = Math.max(0, Math.trunc(averageMonthlySalesMmk))
  const limit = Math.max(monthly, 5_000_000)
  return CHECK_IN_AMOUNT_KEYS.filter((key) => {
    if (key === 'openingCashMmk') {
      return false
    }
    return fields[key] > limit
  })
}

export function rechainCheckIns(
  checkIns: DailyCashCheckIn[],
  startingCashBalanceMmk: number,
): DailyCashCheckIn[] {
  let previousClosing = Math.trunc(startingCashBalanceMmk)
  return sortCheckInsByDate(checkIns).map((item) => {
    const operatingExpensesMmk = resolveOperatingExpensesMmk(
      item.operatingExpensesMmk,
      item.expenseBreakdowns,
    )
    const withOpening: CheckInCashFields = {
      openingCashMmk: previousClosing,
      cashSalesMmk: item.cashSalesMmk,
      customerDebtCollectedMmk: item.customerDebtCollectedMmk,
      creditSalesMmk: item.creditSalesMmk,
      operatingExpensesMmk,
      inventoryPurchasesMmk: item.inventoryPurchasesMmk,
      supplierPaymentsMmk: item.supplierPaymentsMmk,
      otherCashReceivedMmk: item.otherCashReceivedMmk,
      otherCashPaidMmk: item.otherCashPaidMmk,
    }
    const closingCashMmk = calculateClosingCashMmk(withOpening)
    previousClosing = closingCashMmk
    return {
      ...item,
      openingCashMmk: withOpening.openingCashMmk,
      operatingExpensesMmk,
      closingCashMmk,
    }
  })
}

function asInt(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value)
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed)
    }
  }
  return fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeBreakdowns(value: unknown): ExpenseBreakdownLine[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap((item, index) => {
    if (!isRecord(item)) {
      return []
    }
    return [
      {
        id: typeof item.id === 'string' ? item.id : `line_${index}`,
        category:
          item.category === 'inventory' ||
          item.category === 'delivery' ||
          item.category === 'rent' ||
          item.category === 'salary' ||
          item.category === 'electricity' ||
          item.category === 'marketing' ||
          item.category === 'transport' ||
          item.category === 'other'
            ? item.category
            : 'other',
        amountMmk: asInt(item.amountMmk),
      },
    ]
  })
}

export function normalizeCheckIn(raw: unknown): DailyCashCheckIn | null {
  if (!isRecord(raw) || typeof raw.date !== 'string' || raw.date === '') {
    return null
  }

  const expenseBreakdowns = normalizeBreakdowns(raw.expenseBreakdowns)
  const operatingExpensesMmk = resolveOperatingExpensesMmk(
    asInt(raw.operatingExpensesMmk ?? raw.cashExpensesMmk),
    expenseBreakdowns,
  )
  const openingCashMmk = asInt(raw.openingCashMmk)
  const fields: CheckInCashFields = {
    openingCashMmk,
    cashSalesMmk: asInt(raw.cashSalesMmk),
    customerDebtCollectedMmk: asInt(raw.customerDebtCollectedMmk),
    creditSalesMmk: asInt(raw.creditSalesMmk),
    operatingExpensesMmk,
    inventoryPurchasesMmk: asInt(
      raw.inventoryPurchasesMmk ?? raw.stockPurchasesMmk,
    ),
    supplierPaymentsMmk: asInt(raw.supplierPaymentsMmk),
    otherCashReceivedMmk: asInt(
      raw.otherCashReceivedMmk ?? raw.otherInflowsMmk,
    ),
    otherCashPaidMmk: asInt(raw.otherCashPaidMmk),
  }

  return {
    id: typeof raw.id === 'string' ? raw.id : `checkin_${raw.date}`,
    date: raw.date,
    ...fields,
    expenseBreakdowns,
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    closingCashMmk:
      typeof raw.closingCashMmk === 'number'
        ? Math.trunc(raw.closingCashMmk)
        : calculateClosingCashMmk(fields),
    createdAt:
      typeof raw.createdAt === 'string'
        ? raw.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof raw.updatedAt === 'string'
        ? raw.updatedAt
        : new Date().toISOString(),
  }
}
