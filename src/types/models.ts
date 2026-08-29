export const BUSINESS_TYPES = [
  'shop',
  'restaurant',
  'services',
  'trading',
  'workshop',
  'other',
] as const

export type BusinessType = (typeof BUSINESS_TYPES)[number]

export const PREFERRED_LANGUAGES = ['en', 'my'] as const

export type PreferredLanguage = (typeof PREFERRED_LANGUAGES)[number]

export const EXPENSE_CATEGORIES = [
  'rent',
  'wages',
  'stock',
  'utilities',
  'fuel',
  'tax',
  'other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const CURRENCY = 'MMK' as const

export type CurrencyCode = typeof CURRENCY

export interface BusinessProfile {
  id: string
  businessName: string
  businessType: BusinessType
  startingCashBalanceMmk: number
  averageMonthlySalesMmk: number
  employeeCount: number
  mainExpenseCategories: ExpenseCategory[]
  preferredLanguage: PreferredLanguage
  currency: CurrencyCode
  createdAt: string
  updatedAt: string
}

export interface DailyCashCheckIn {
  id: string
  date: string
  openingCashMmk: number
  cashSalesMmk: number
  otherInflowsMmk: number
  cashExpensesMmk: number
  supplierPaymentsMmk: number
  stockPurchasesMmk: number
  notes: string
  createdAt: string
}

export const CASH_ITEM_KINDS = ['inflow', 'outflow'] as const

export type CashItemKind = (typeof CASH_ITEM_KINDS)[number]

export const RECURRENCE_OPTIONS = ['once', 'weekly', 'monthly'] as const

export type Recurrence = (typeof RECURRENCE_OPTIONS)[number]

export interface ScheduledCashItem {
  id: string
  name: string
  kind: CashItemKind
  amountMmk: number
  dueDate: string
  recurrence: Recurrence
  notes: string
}

export const RECEIVABLE_STATUSES = ['open', 'collected', 'overdue'] as const

export type ReceivableStatus = (typeof RECEIVABLE_STATUSES)[number]

export interface Receivable {
  id: string
  customerName: string
  amountMmk: number
  dueDate: string
  expectedCollectDate: string
  status: ReceivableStatus
  notes: string
}

export const PAYABLE_STATUSES = ['open', 'paid', 'overdue'] as const

export type PayableStatus = (typeof PAYABLE_STATUSES)[number]

export interface Payable {
  id: string
  supplierName: string
  amountMmk: number
  dueDate: string
  expectedPayDate: string
  status: PayableStatus
  notes: string
}

export interface ForecastPoint {
  date: string
  projectedBalanceMmk: number
  inflowsMmk: number
  outflowsMmk: number
  isShortage: boolean
}

export const SHORTAGE_RISKS = ['low', 'medium', 'high'] as const

export type ShortageRisk = (typeof SHORTAGE_RISKS)[number]

export interface ForecastResult {
  horizonDays: number
  startingBalanceMmk: number
  endingBalanceMmk: number
  lowestBalanceMmk: number
  shortageDays: number
  firstShortageDate: string | null
  points: ForecastPoint[]
  causes: string[]
  recommendedActions: string[]
  risk: ShortageRisk
}

export interface ScenarioAssumptions {
  salesChangePercent: number
  expenseChangePercent: number
  collectionDelayDays: number
  extraStockPurchaseMmk: number
  extraLoanInflowMmk: number
}

export const CASH_FLOW_HEALTH_STATUSES = [
  'healthy',
  'watch',
  'at_risk',
  'critical',
] as const

export type CashFlowHealthStatus = (typeof CASH_FLOW_HEALTH_STATUSES)[number]

export interface CashFlowHealth {
  status: CashFlowHealthStatus
  score: number
  summary: string
  daysOfCash: number
}

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  shop: 'Shop / retail',
  restaurant: 'Restaurant / cafe',
  services: 'Services',
  trading: 'Trading / wholesale',
  workshop: 'Workshop / production',
  other: 'Other',
}

export const LANGUAGE_LABELS: Record<PreferredLanguage, string> = {
  en: 'English',
  my: 'Myanmar (labels stay in simple English)',
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: 'Rent',
  wages: 'Wages',
  stock: 'Stock / goods',
  utilities: 'Electricity / water / phone',
  fuel: 'Fuel / transport',
  tax: 'Tax / fees',
  other: 'Other expenses',
}

export const HEALTH_LABELS: Record<CashFlowHealthStatus, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  at_risk: 'At risk',
  critical: 'Critical',
}
