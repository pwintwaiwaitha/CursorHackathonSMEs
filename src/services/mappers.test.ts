import { describe, expect, it } from 'vitest'
import { calculateClosingCashMmk } from '../lib/checkIn'
import type { DailyCheckin } from '../types/database'
import type { DailyCashCheckIn } from '../types/models'
import {
  fromDailyCheckinRow,
  splitCheckInExpenses,
  toDailyCheckinInsert,
} from './mappers'

function sampleCheckIn(): DailyCashCheckIn {
  return {
    id: 'checkin_local',
    date: '2026-08-29',
    openingCashMmk: 1_000_000,
    cashSalesMmk: 200_000,
    customerDebtCollectedMmk: 50_000,
    creditSalesMmk: 80_000,
    operatingExpensesMmk: 40_000,
    inventoryPurchasesMmk: 80_000,
    supplierPaymentsMmk: 30_000,
    otherCashReceivedMmk: 10_000,
    otherCashPaidMmk: 5_000,
    expenseBreakdowns: [
      { id: '1', category: 'salary', amountMmk: 25_000 },
      { id: '2', category: 'rent', amountMmk: 10_000 },
      { id: '3', category: 'electricity', amountMmk: 5_000 },
    ],
    notes: 'Busy Saturday',
    closingCashMmk: 0,
    createdAt: '2026-08-29T00:00:00.000Z',
    updatedAt: '2026-08-29T00:00:00.000Z',
  }
}

describe('daily check-in mapping', () => {
  it('maps cash fields and never sends generated closing_cash', () => {
    const insert = toDailyCheckinInsert(sampleCheckIn(), 'owner-1', 'biz-1')
    expect(insert.cash_sales).toBe(200_000)
    expect(insert.receivables_collected).toBe(50_000)
    expect(insert.other_income).toBe(10_000)
    expect(insert.inventory_purchases).toBe(80_000)
    expect(insert.supplier_payments).toBe(30_000)
    expect(insert.wages).toBe(25_000)
    expect(insert.rent_and_utilities).toBe(15_000)
    expect(insert.other_expenses).toBe(5_000)
    expect(insert).not.toHaveProperty('closing_cash')
    expect(insert.owner_id).toBe('owner-1')
  })

  it('keeps app and database closing-cash formulas aligned', () => {
    const checkIn = sampleCheckIn()
    const insert = toDailyCheckinInsert(checkIn, 'owner-1', 'biz-1')
    const appClosing = calculateClosingCashMmk({
      openingCashMmk: checkIn.openingCashMmk,
      cashSalesMmk: checkIn.cashSalesMmk,
      customerDebtCollectedMmk: checkIn.customerDebtCollectedMmk,
      creditSalesMmk: checkIn.creditSalesMmk,
      operatingExpensesMmk: 40_000,
      inventoryPurchasesMmk: checkIn.inventoryPurchasesMmk,
      supplierPaymentsMmk: checkIn.supplierPaymentsMmk,
      otherCashReceivedMmk: checkIn.otherCashReceivedMmk,
      otherCashPaidMmk: checkIn.otherCashPaidMmk,
    })
    const dbClosing =
      (insert.opening_cash ?? 0) +
      (insert.cash_sales ?? 0) +
      (insert.receivables_collected ?? 0) +
      (insert.other_income ?? 0) -
      (insert.inventory_purchases ?? 0) -
      (insert.supplier_payments ?? 0) -
      (insert.wages ?? 0) -
      (insert.rent_and_utilities ?? 0) -
      (insert.other_expenses ?? 0)
    expect(dbClosing).toBe(appClosing)
  })

  it('round-trips named expense columns back into DailyCashCheckIn', () => {
    const row: DailyCheckin = {
      id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      owner_id: 'owner-1',
      business_id: 'biz-1',
      checkin_date: '2026-08-29',
      opening_cash: 100,
      cash_sales: 20,
      receivables_collected: 5,
      other_income: 1,
      inventory_purchases: 8,
      supplier_payments: 3,
      wages: 4,
      rent_and_utilities: 2,
      other_expenses: 1,
      notes: 'ok',
      source: 'form',
      created_at: '2026-08-29T00:00:00.000Z',
      updated_at: '2026-08-29T00:00:00.000Z',
      closing_cash: 108,
    }
    const model = fromDailyCheckinRow(row)
    expect(model.cashSalesMmk).toBe(20)
    expect(model.customerDebtCollectedMmk).toBe(5)
    expect(model.otherCashReceivedMmk).toBe(1)
    expect(model.operatingExpensesMmk).toBe(6)
    expect(model.otherCashPaidMmk).toBe(1)
    expect(model.creditSalesMmk).toBe(0)
    const split = splitCheckInExpenses(model)
    expect(split.wages).toBe(4)
    expect(split.rent_and_utilities).toBe(2)
    expect(split.other_expenses).toBe(1)
  })
})
