import { z } from 'zod'
import {
  BUSINESS_TYPES,
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

export const dailyCheckInSchema = z.object({
  date: z.string().min(1, 'Choose a date'),
  openingCashMmk: integerMmk,
  cashSalesMmk: integerMmk,
  otherInflowsMmk: integerMmk,
  cashExpensesMmk: integerMmk,
  supplierPaymentsMmk: integerMmk,
  stockPurchasesMmk: integerMmk,
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

export const receivableSchema = z.object({
  customerName: z.string().trim().min(2, 'Enter the customer name').max(80),
  amountMmk: integerMmk.min(1, 'Enter an amount'),
  dueDate: z.string().min(1, 'Choose a due date'),
  expectedCollectDate: z.string().min(1, 'Choose when you expect the money'),
  notes: z.string().max(200),
})

export const payableSchema = z.object({
  supplierName: z.string().trim().min(2, 'Enter the supplier name').max(80),
  amountMmk: integerMmk.min(1, 'Enter an amount'),
  dueDate: z.string().min(1, 'Choose a due date'),
  expectedPayDate: z.string().min(1, 'Choose when you will pay'),
  notes: z.string().max(200),
})

export const scenarioSchema = z.object({
  salesChangePercent: z.number().int().min(-80).max(200),
  expenseChangePercent: z.number().int().min(-80).max(200),
  collectionDelayDays: z.number().int().min(0).max(90),
  extraStockPurchaseMmk: integerMmk,
  extraLoanInflowMmk: integerMmk,
})

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>
export type DailyCheckInInput = z.infer<typeof dailyCheckInSchema>
export type ScheduledItemInput = z.infer<typeof scheduledItemSchema>
export type ReceivableInput = z.infer<typeof receivableSchema>
export type PayableInput = z.infer<typeof payableSchema>
