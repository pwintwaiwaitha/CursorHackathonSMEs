import { z } from 'zod'
import {
  BUSINESS_TYPES,
  EXPENSE_BREAKDOWN_CATEGORIES,
  EXPENSE_CATEGORIES,
  PREFERRED_LANGUAGES,
} from '../types/models'

const integerMmk = z
  .number({ error: 'Enter a whole MMK amount' })
  .int('Use whole kyat only, no pyas')
  .min(0, 'Amount cannot be negative')
  .max(1_000_000_000_000, 'Amount is too large')

export const businessProfileSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, 'Enter your business name')
    .max(80, 'Name is too long'),
  businessType: z.enum(BUSINESS_TYPES),
  startingCashBalanceMmk: integerMmk,
  averageMonthlySalesMmk: integerMmk.min(1, 'Enter average monthly sales'),
  employeeCount: z
    .number({ error: 'Enter number of employees' })
    .int('Use a whole number')
    .min(0, 'Cannot be negative')
    .max(5000, 'Please check this number'),
  mainExpenseCategories: z
    .array(z.enum(EXPENSE_CATEGORIES))
    .min(1, 'Choose at least one expense type'),
  preferredLanguage: z.enum(PREFERRED_LANGUAGES),
})

export const expenseBreakdownSchema = z.object({
  id: z.string().min(1),
  category: z.enum(EXPENSE_BREAKDOWN_CATEGORIES),
  amountMmk: integerMmk,
})

export const dailyCheckInSchema = z.object({
  date: z.string().min(1, 'Choose a date'),
  cashSalesMmk: integerMmk,
  customerDebtCollectedMmk: integerMmk,
  creditSalesMmk: integerMmk,
  operatingExpensesMmk: integerMmk,
  inventoryPurchasesMmk: integerMmk,
  supplierPaymentsMmk: integerMmk,
  otherCashReceivedMmk: integerMmk,
  otherCashPaidMmk: integerMmk,
  expenseBreakdowns: z.array(expenseBreakdownSchema),
  notes: z.string().max(400, 'Notes are too long'),
})

export const scheduledItemSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name').max(80),
  kind: z.enum(['inflow', 'outflow']),
  amountMmk: integerMmk.min(1, 'Enter an amount'),
  dueDate: z.string().min(1, 'Choose a date'),
  recurrence: z.enum(['once', 'weekly', 'monthly']),
  notes: z.string().max(200),
})

export const receivableSchema = z
  .object({
    customerName: z.string().trim().min(2, 'Enter the customer name').max(80),
    amountMmk: integerMmk.min(1, 'Enter an amount'),
    expectedPaymentDate: z.string().min(1, 'Choose the expected payment date'),
    amountPaidMmk: integerMmk,
    notes: z.string().max(200),
  })
  .refine((value) => value.amountPaidMmk <= value.amountMmk, {
    message: 'Paid amount cannot be more than the bill',
    path: ['amountPaidMmk'],
  })

export const payableSchema = z.object({
  supplierName: z.string().trim().min(2, 'Enter the supplier or bill name').max(80),
  amountMmk: integerMmk.min(1, 'Enter an amount'),
  dueDate: z.string().min(1, 'Choose a due date'),
  category: z.enum(EXPENSE_CATEGORIES),
  recurrence: z.enum(['once', 'weekly', 'monthly']),
  notes: z.string().max(200),
})

export const scenarioSchema = z.object({
  salesChangePercent: z.number().int().min(-80).max(200),
  expenseChangePercent: z.number().int().min(-80).max(200),
  collectionDelayDays: z.number().int().min(-60).max(90),
  extraStockPurchaseMmk: integerMmk,
  extraLoanInflowMmk: integerMmk,
  revenueGrowthRatePercent: z.number().int().min(-50).max(80),
  expenseGrowthRatePercent: z.number().int().min(-50).max(80),
  inflationRatePercent: z.number().int().min(0).max(80),
  customerCollectionRatePercent: z.number().int().min(0).max(100),
  plannedInvestmentMmk: integerMmk,
  plannedLoanMmk: integerMmk,
  newBranchExpansionCostMmk: integerMmk,
  emergencyCashReserveTargetMmk: integerMmk,
  supplierPostponeDays: z.number().int().min(0).max(90),
  hireEmployeeMonthlyWageMmk: integerMmk,
})

export const whatIfSchema = z.object({
  extraStockPurchaseMmk: integerMmk,
  salesChangePercent: z.number().int().min(-80).max(200),
  expenseChangePercent: z.number().int().min(-80).max(200),
  collectionShiftDays: z.number().int().min(-60).max(90),
  supplierPostponeDays: z.number().int().min(0).max(90),
  hireEmployeeMonthlyWageMmk: integerMmk,
  newBranchExpansionCostMmk: integerMmk,
  plannedLoanMmk: integerMmk,
  plannedInvestmentMmk: integerMmk,
})

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>
export type DailyCheckInInput = z.infer<typeof dailyCheckInSchema>
export type ScheduledItemInput = z.infer<typeof scheduledItemSchema>
export type ReceivableInput = z.infer<typeof receivableSchema>
export type PayableInput = z.infer<typeof payableSchema>
