import { resolveOperatingExpensesMmk } from '../lib/checkIn'
import type {
  Business,
  DailyCheckin,
  DailyCheckinInsert,
  LedgerStatus,
  Payable as DbPayable,
  PayableInsert,
  Receivable as DbReceivable,
  ReceivableInsert,
} from '../types/database'
import type {
  BusinessProfile,
  BusinessType,
  DailyCashCheckIn,
  ExpenseBreakdownLine,
  ExpenseCategory,
  Payable,
  PayableStatus,
  PreferredLanguage,
  Receivable,
  ReceivableStatus,
  Recurrence,
} from '../types/models'
import { BUSINESS_TYPES, CURRENCY, EXPENSE_CATEGORIES } from '../types/models'
import type { ProfileExtras } from '../storage/userDrafts'

const SALARY_CATEGORIES = new Set<ExpenseBreakdownLine['category']>(['salary'])
const RENT_UTIL_CATEGORIES = new Set<ExpenseBreakdownLine['category']>([
  'rent',
  'electricity',
])

export function splitCheckInExpenses(checkIn: Pick<
  DailyCashCheckIn,
  'operatingExpensesMmk' | 'otherCashPaidMmk' | 'expenseBreakdowns'
>): {
  wages: number
  rent_and_utilities: number
  other_expenses: number
} {
  const wages = sumBreakdowns(checkIn.expenseBreakdowns, SALARY_CATEGORIES)
  const rent_and_utilities = sumBreakdowns(
    checkIn.expenseBreakdowns,
    RENT_UTIL_CATEGORIES,
  )
  const operating = resolveOperatingExpensesMmk(
    checkIn.operatingExpensesMmk,
    checkIn.expenseBreakdowns,
  )
  const leftoverOperating = Math.max(0, operating - wages - rent_and_utilities)
  return {
    wages,
    rent_and_utilities,
    other_expenses: leftoverOperating + Math.trunc(checkIn.otherCashPaidMmk),
  }
}

function sumBreakdowns(
  lines: ExpenseBreakdownLine[],
  categories: Set<ExpenseBreakdownLine['category']>,
): number {
  return lines.reduce((sum, line) => {
    if (!categories.has(line.category)) {
      return sum
    }
    return sum + Math.trunc(line.amountMmk)
  }, 0)
}

export function toDailyCheckinInsert(
  checkIn: DailyCashCheckIn,
  ownerId: string,
  businessId: string,
): DailyCheckinInsert {
  const expenses = splitCheckInExpenses(checkIn)
  return {
    owner_id: ownerId,
    business_id: businessId,
    checkin_date: checkIn.date,
    opening_cash: Math.trunc(checkIn.openingCashMmk),
    cash_sales: Math.trunc(checkIn.cashSalesMmk),
    receivables_collected: Math.trunc(checkIn.customerDebtCollectedMmk),
    other_income: Math.trunc(checkIn.otherCashReceivedMmk),
    inventory_purchases: Math.trunc(checkIn.inventoryPurchasesMmk),
    supplier_payments: Math.trunc(checkIn.supplierPaymentsMmk),
    wages: expenses.wages,
    rent_and_utilities: expenses.rent_and_utilities,
    other_expenses: expenses.other_expenses,
    notes: checkIn.notes || null,
    source: 'form',
  }
}

export function fromDailyCheckinRow(row: DailyCheckin): DailyCashCheckIn {
  const expenseBreakdowns: ExpenseBreakdownLine[] = []
  if (row.wages > 0) {
    expenseBreakdowns.push({
      id: `${row.id}_wages`,
      category: 'salary',
      amountMmk: row.wages,
    })
  }
  if (row.rent_and_utilities > 0) {
    expenseBreakdowns.push({
      id: `${row.id}_rent`,
      category: 'rent',
      amountMmk: row.rent_and_utilities,
    })
  }
  return {
    id: row.id,
    date: row.checkin_date,
    openingCashMmk: row.opening_cash,
    cashSalesMmk: row.cash_sales,
    customerDebtCollectedMmk: row.receivables_collected,
    creditSalesMmk: 0,
    operatingExpensesMmk: row.wages + row.rent_and_utilities,
    inventoryPurchasesMmk: row.inventory_purchases,
    supplierPaymentsMmk: row.supplier_payments,
    otherCashReceivedMmk: row.other_income,
    otherCashPaidMmk: row.other_expenses,
    expenseBreakdowns,
    notes: row.notes ?? '',
    closingCashMmk: row.closing_cash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapBusinessToProfile(
  row: Business,
  extras?: Partial<ProfileExtras> | null,
  preferredLanguage?: PreferredLanguage | null,
): BusinessProfile {
  const type = row.business_type
  const businessType: BusinessType =
    typeof type === 'string' && (BUSINESS_TYPES as readonly string[]).includes(type)
      ? (type as BusinessType)
      : 'other'
  return {
    id: row.id,
    businessName: row.name,
    businessType,
    startingCashBalanceMmk: Math.trunc(Number(row.starting_cash) || 0),
    averageMonthlySalesMmk: extras?.averageMonthlySalesMmk ?? 0,
    employeeCount: extras?.employeeCount ?? 0,
    mainExpenseCategories: extras?.mainExpenseCategories?.length
      ? extras.mainExpenseCategories
      : ['other'],
    preferredLanguage: preferredLanguage ?? extras?.preferredLanguage ?? 'en',
    currency: CURRENCY,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toReceivableStatus(status: ReceivableStatus): LedgerStatus {
  if (status === 'partially_paid') {
    return 'partial'
  }
  return status
}

export function fromReceivableStatus(status: LedgerStatus): ReceivableStatus {
  if (status === 'partial') {
    return 'partially_paid'
  }
  return status
}

export function toReceivableInsert(
  item: Receivable,
  ownerId: string,
  businessId: string,
): ReceivableInsert {
  return {
    owner_id: ownerId,
    business_id: businessId,
    customer_name: item.customerName,
    amount: Math.trunc(item.amountMmk),
    due_date: item.expectedPaymentDate || null,
    status: toReceivableStatus(item.status),
    amount_received: Math.trunc(item.amountPaidMmk),
    notes: item.notes || null,
  }
}

export function fromReceivableRow(row: DbReceivable): Receivable {
  return {
    id: row.id,
    customerName: row.customer_name,
    amountMmk: row.amount,
    expectedPaymentDate: row.due_date ?? '',
    status: fromReceivableStatus(row.status),
    amountPaidMmk: row.amount_received,
    notes: row.notes ?? '',
  }
}

export function toPayableStatus(status: PayableStatus): LedgerStatus {
  return status
}

export function fromPayableStatus(status: LedgerStatus): PayableStatus {
  if (status === 'partial') {
    return 'pending'
  }
  return status
}

function asExpenseCategory(value: string | null): ExpenseCategory {
  if (value && (EXPENSE_CATEGORIES as readonly string[]).includes(value)) {
    return value as ExpenseCategory
  }
  return 'other'
}

export function toPayableInsert(
  item: Payable,
  ownerId: string,
  businessId: string,
): PayableInsert {
  const paid = item.status === 'paid' ? Math.trunc(item.amountMmk) : 0
  return {
    owner_id: ownerId,
    business_id: businessId,
    supplier_name: item.supplierName,
    category: item.category,
    amount: Math.trunc(item.amountMmk),
    due_date: item.dueDate || null,
    status: toPayableStatus(item.status),
    amount_paid: paid,
    essential: true,
    notes: item.notes || null,
  }
}

export function fromPayableRow(
  row: DbPayable,
  recurrence: Recurrence = 'once',
): Payable {
  return {
    id: row.id,
    supplierName: row.supplier_name,
    amountMmk: row.amount,
    dueDate: row.due_date ?? '',
    category: asExpenseCategory(row.category),
    status: fromPayableStatus(row.status),
    recurrence,
    notes: row.notes ?? '',
  }
}

export function asPreferredLanguage(value: string | null | undefined): PreferredLanguage {
  return value === 'my' ? 'my' : 'en'
}
