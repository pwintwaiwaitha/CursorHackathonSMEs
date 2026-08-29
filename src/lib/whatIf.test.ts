import { describe, expect, it } from 'vitest'
import { EMPTY_SCENARIOS } from '../storage/types'
import type { AppStore } from '../storage/types'
import type { DailyCashCheckIn, Payable, Receivable } from '../types/models'
import { EMPTY_WHAT_IF, applyWhatIf, hasWhatIfChanges, runWhatIfSimulation } from './whatIf'

function checkIn(date: string): DailyCashCheckIn {
  return {
    id: `c_${date}`,
    date,
    openingCashMmk: 0,
    cashSalesMmk: 80_000,
    customerDebtCollectedMmk: 0,
    creditSalesMmk: 0,
    operatingExpensesMmk: 20_000,
    inventoryPurchasesMmk: 0,
    supplierPaymentsMmk: 0,
    otherCashReceivedMmk: 0,
    otherCashPaidMmk: 0,
    expenseBreakdowns: [],
    notes: '',
    closingCashMmk: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function books(): AppStore {
  return {
    profile: {
      id: 'biz',
      businessName: 'Mya Mart',
      businessType: 'shop',
      startingCashBalanceMmk: 400_000,
      averageMonthlySalesMmk: 2_400_000,
      employeeCount: 1,
      mainExpenseCategories: ['stock'],
      preferredLanguage: 'en',
      currency: 'MMK',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    checkIns: [checkIn('2026-08-28')],
    scheduledItems: [],
    receivables: [
      {
        id: 'r1',
        customerName: 'Ko Aung',
        amountMmk: 200_000,
        expectedPaymentDate: '2026-09-10',
        status: 'pending',
        amountPaidMmk: 0,
        notes: '',
      } satisfies Receivable,
    ],
    payables: [
      {
        id: 'p1',
        supplierName: 'U Win',
        amountMmk: 300_000,
        dueDate: '2026-09-02',
        category: 'stock',
        status: 'pending',
        recurrence: 'once',
        notes: '',
      } satisfies Payable,
    ],
    scenarios: { ...EMPTY_SCENARIOS },
  }
}

describe('what-if simulator', () => {
  it('does not mutate saved scenarios when applying a draft', () => {
    const saved = { ...EMPTY_SCENARIOS, extraStockPurchaseMmk: 10_000 }
    const snapshot = JSON.stringify(saved)
    applyWhatIf(saved, { ...EMPTY_WHAT_IF, extraStockPurchaseMmk: 500_000 })
    expect(JSON.stringify(saved)).toBe(snapshot)
    expect(saved.extraStockPurchaseMmk).toBe(10_000)
  })

  it('answers the stock-purchase example with engine shortage numbers', () => {
    const store = books()
    const before = JSON.stringify(store)
    const result = runWhatIfSimulation({
      store,
      draft: { ...EMPTY_WHAT_IF, extraStockPurchaseMmk: 500_000 },
      horizonDays: 7,
      startDate: '2026-08-29',
    })
    expect(JSON.stringify(store)).toBe(before)
    expect(result.afterExpected.predictedClosingCashMmk).toBe(
      result.before.predictedClosingCashMmk - 500_000,
    )
    expect(result.closingCashDifferenceMmk).toBe(-500_000)
    expect(result.afterExpected.shortageAmountMmk).toBeGreaterThan(0)
    expect(result.narrative).toContain('If you make this purchase')
    expect(result.narrative).toContain(String(result.afterExpected.shortageAmountMmk / 1000))
    expect(result.narrative).toContain('expected shortage')
  })

  it('moves a supplier bill later when postponed', () => {
    const store = books()
    const result = runWhatIfSimulation({
      store,
      draft: { ...EMPTY_WHAT_IF, supplierPostponeDays: 14 },
      horizonDays: 7,
      startDate: '2026-08-29',
    })
    const dueDay = result.afterExpected.points.find((point) => point.date === '2026-09-02')
    expect(dueDay?.outflowsMmk ?? 0).toBe(0)
    expect(result.afterExpected.predictedClosingCashMmk).toBeGreaterThan(
      result.before.predictedClosingCashMmk,
    )
  })

  it('collects earlier when the customer-pay slider is negative', () => {
    const later = runWhatIfSimulation({
      store: books(),
      draft: EMPTY_WHAT_IF,
      horizonDays: 7,
      startDate: '2026-08-29',
    })
    const earlier = runWhatIfSimulation({
      store: books(),
      draft: { ...EMPTY_WHAT_IF, collectionShiftDays: -10 },
      horizonDays: 7,
      startDate: '2026-08-29',
    })
    const collectDay = earlier.afterExpected.points.find((point) => point.date === '2026-08-31')
    expect(collectDay?.inflowsMmk).toBe(200_000)
    expect(earlier.afterExpected.predictedClosingCashMmk).toBeGreaterThan(
      later.afterExpected.predictedClosingCashMmk,
    )
  })

  it('adds daily wage when hiring', () => {
    const result = runWhatIfSimulation({
      store: books(),
      draft: { ...EMPTY_WHAT_IF, hireEmployeeMonthlyWageMmk: 300_000 },
      horizonDays: 7,
      startDate: '2026-08-29',
    })
    expect(result.closingCashDifferenceMmk).toBe(-70_000)
  })

  it('treats an empty draft as no change', () => {
    expect(hasWhatIfChanges(EMPTY_WHAT_IF)).toBe(false)
    const result = runWhatIfSimulation({
      store: books(),
      draft: EMPTY_WHAT_IF,
      horizonDays: 7,
      startDate: '2026-08-29',
    })
    expect(result.closingCashDifferenceMmk).toBe(0)
    expect(result.riskAfter).toBe(result.riskBefore)
  })
})
