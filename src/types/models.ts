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

export const EXPENSE_BREAKDOWN_CATEGORIES = [
  'inventory',
  'delivery',
  'rent',
  'salary',
  'electricity',
  'marketing',
  'transport',
  'other',
] as const

export type ExpenseBreakdownCategory =
  (typeof EXPENSE_BREAKDOWN_CATEGORIES)[number]

export interface ExpenseBreakdownLine {
  id: string
  category: ExpenseBreakdownCategory
  amountMmk: number
}

export interface DailyCashCheckIn {
  id: string
  date: string
  openingCashMmk: number
  cashSalesMmk: number
  customerDebtCollectedMmk: number
  creditSalesMmk: number
  operatingExpensesMmk: number
  inventoryPurchasesMmk: number
  supplierPaymentsMmk: number
  otherCashReceivedMmk: number
  otherCashPaidMmk: number
  expenseBreakdowns: ExpenseBreakdownLine[]
  notes: string
  closingCashMmk: number
  createdAt: string
  updatedAt: string
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

export const RECEIVABLE_STATUSES = [
  'pending',
  'partially_paid',
  'paid',
  'overdue',
] as const

export type ReceivableStatus = (typeof RECEIVABLE_STATUSES)[number]

export interface Receivable {
  id: string
  customerName: string
  amountMmk: number
  expectedPaymentDate: string
  status: ReceivableStatus
  amountPaidMmk: number
  notes: string
}

export const PAYABLE_STATUSES = ['pending', 'paid', 'overdue'] as const

export type PayableStatus = (typeof PAYABLE_STATUSES)[number]

export interface Payable {
  id: string
  supplierName: string
  amountMmk: number
  dueDate: string
  category: ExpenseCategory
  status: PayableStatus
  recurrence: Recurrence
  notes: string
}

export const RECEIVABLE_STATUS_LABELS: Record<ReceivableStatus, string> = {
  pending: 'Pending / စောင့်ဆိုင်း',
  partially_paid: 'Partially paid / တစ်စိတ်တစ်ပိုင်း',
  paid: 'Paid / ပေးပြီး',
  overdue: 'Overdue / ကျော်လွန်',
}

export const PAYABLE_STATUS_LABELS: Record<PayableStatus, string> = {
  pending: 'Pending / စောင့်ဆိုင်း',
  paid: 'Paid / ပေးပြီး',
  overdue: 'Overdue / ကျော်လွန်',
}

export const CONFIDENCE_LEVELS = ['high', 'medium', 'low', 'very_low'] as const

export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number]

export const FORECAST_KINDS = [
  'scheduled',
  'short_term',
  'early',
  'scenario',
  'strategic',
] as const

export type ForecastKind = (typeof FORECAST_KINDS)[number]

export const SCENARIO_BANDS = ['optimistic', 'expected', 'pessimistic'] as const

export type ScenarioBand = (typeof SCENARIO_BANDS)[number]

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
  levelId: string
  label: string
  kind: ForecastKind
  locked: boolean
  unlockRequirement: string | null
  startDate: string
  endDate: string
  horizonDays: number
  startingBalanceMmk: number
  endingBalanceMmk: number
  predictedClosingCashMmk: number
  lowestBalanceMmk: number
  lowestPredictedCashMmk: number
  shortageDays: number
  firstShortageDate: string | null
  shortageDate: string | null
  shortageAmountMmk: number
  points: ForecastPoint[]
  causes: string[]
  mainRiskDrivers: string[]
  recommendedActions: string[]
  suggestedActions: string[]
  risk: ShortageRisk
  confidenceLevel: ConfidenceLevel
  dataPeriodUsed: string
  missingDataWarnings: string[]
  disclaimer: string
  scenarioBand?: ScenarioBand
}

export interface ScenarioAssumptions {
  salesChangePercent: number
  expenseChangePercent: number
  collectionDelayDays: number
  extraStockPurchaseMmk: number
  extraLoanInflowMmk: number
  revenueGrowthRatePercent: number
  expenseGrowthRatePercent: number
  inflationRatePercent: number
  customerCollectionRatePercent: number
  plannedInvestmentMmk: number
  plannedLoanMmk: number
  newBranchExpansionCostMmk: number
  emergencyCashReserveTargetMmk: number
  supplierPostponeDays: number
  hireEmployeeMonthlyWageMmk: number
}

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  very_low: 'Very low',
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
  at_risk: 'High Risk',
  critical: 'High Risk',
}
