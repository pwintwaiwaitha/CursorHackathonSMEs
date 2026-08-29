import { describe, expect, it } from 'vitest'
import {
  calculateClosingCashMmk,
  findNegativeAmountFields,
  getOpeningCashMmk,
  hasDuplicateCheckInDate,
  rechainCheckIns,
} from './checkIn'
import type { DailyCashCheckIn } from '../types/models'

function baseCheckIn(
  overrides: Partial<DailyCashCheckIn> & Pick<DailyCashCheckIn, 'id' | 'date'>,
): DailyCashCheckIn {
  return {
    openingCashMmk: 0,
    cashSalesMmk: 0,
    customerDebtCollectedMmk: 0,
    creditSalesMmk: 0,
    operatingExpensesMmk: 0,
    inventoryPurchasesMmk: 0,
    supplierPaymentsMmk: 0,
    otherCashReceivedMmk: 0,
    otherCashPaidMmk: 0,
    expenseBreakdowns: [],
    notes: '',
    closingCashMmk: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('closing cash calculation', () => {
  it('uses the cash formula and keeps whole kyat', () => {
    const closing = calculateClosingCashMmk({
      openingCashMmk: 1_000_000,
      cashSalesMmk: 200_000,
      customerDebtCollectedMmk: 50_000,
      creditSalesMmk: 999_999,
      operatingExpensesMmk: 30_000,
      inventoryPurchasesMmk: 80_000,
      supplierPaymentsMmk: 40_000,
      otherCashReceivedMmk: 10_000,
      otherCashPaidMmk: 5_000,
    })

    expect(closing).toBe(1_105_000)
  })
})

describe('credit sales are not cash', () => {
  it('does not change closing cash when credit sales increase', () => {
    const withoutCredit = calculateClosingCashMmk({
      openingCashMmk: 500_000,
      cashSalesMmk: 100_000,
      customerDebtCollectedMmk: 0,
      creditSalesMmk: 0,
      operatingExpensesMmk: 20_000,
      inventoryPurchasesMmk: 0,
      supplierPaymentsMmk: 0,
      otherCashReceivedMmk: 0,
      otherCashPaidMmk: 0,
    })
    const withCredit = calculateClosingCashMmk({
      openingCashMmk: 500_000,
      cashSalesMmk: 100_000,
      customerDebtCollectedMmk: 0,
      creditSalesMmk: 250_000,
      operatingExpensesMmk: 20_000,
      inventoryPurchasesMmk: 0,
      supplierPaymentsMmk: 0,
      otherCashReceivedMmk: 0,
      otherCashPaidMmk: 0,
    })

    expect(withCredit).toBe(withoutCredit)
    expect(withCredit).toBe(580_000)
  })
})

describe('opening cash from previous closing', () => {
  it('uses starting cash when there is no previous day', () => {
    const opening = getOpeningCashMmk([], '2026-03-02', 2_400_000)
    expect(opening).toBe(2_400_000)
  })

  it('uses the previous day’s closing cash as the next opening cash', () => {
    const dayOne = baseCheckIn({
      id: 'd1',
      date: '2026-03-01',
      openingCashMmk: 1_000_000,
      cashSalesMmk: 200_000,
      operatingExpensesMmk: 50_000,
      closingCashMmk: 1_150_000,
    })

    const opening = getOpeningCashMmk([dayOne], '2026-03-02', 1_000_000)
    expect(opening).toBe(1_150_000)
  })

  it('rechains later days after an earlier day is saved', () => {
    const chained = rechainCheckIns(
      [
        baseCheckIn({
          id: 'd2',
          date: '2026-03-02',
          cashSalesMmk: 10_000,
        }),
        baseCheckIn({
          id: 'd1',
          date: '2026-03-01',
          cashSalesMmk: 100_000,
          operatingExpensesMmk: 20_000,
        }),
      ],
      500_000,
    )

    expect(chained[0].date).toBe('2026-03-01')
    expect(chained[0].openingCashMmk).toBe(500_000)
    expect(chained[0].closingCashMmk).toBe(580_000)
    expect(chained[1].openingCashMmk).toBe(580_000)
    expect(chained[1].closingCashMmk).toBe(590_000)
  })
})

describe('duplicate date detection', () => {
  it('detects another check-in on the same date', () => {
    const rows = [
      baseCheckIn({ id: 'a', date: '2026-03-01' }),
      baseCheckIn({ id: 'b', date: '2026-03-02' }),
    ]

    expect(hasDuplicateCheckInDate(rows, '2026-03-01')).toBe(true)
    expect(hasDuplicateCheckInDate(rows, '2026-03-01', 'a')).toBe(false)
    expect(hasDuplicateCheckInDate(rows, '2026-03-03')).toBe(false)
  })
})

describe('negative value validation', () => {
  it('lists every negative cash field', () => {
    const negatives = findNegativeAmountFields({
      openingCashMmk: 100,
      cashSalesMmk: -1,
      customerDebtCollectedMmk: 0,
      creditSalesMmk: -20,
      operatingExpensesMmk: 0,
      inventoryPurchasesMmk: -5,
      supplierPaymentsMmk: 0,
      otherCashReceivedMmk: 0,
      otherCashPaidMmk: 0,
    })

    expect(negatives).toEqual([
      'cashSalesMmk',
      'creditSalesMmk',
      'inventoryPurchasesMmk',
    ])
  })
})
