import { describe, expect, it } from 'vitest'
import type { BankTransaction } from '../types/bank'
import {
  availableBusinessAccountBalanceMmk,
  emergencyReserveHeldMmk,
  reserveProgressPercent,
} from './bankBalance'

function txn(
  overrides: Partial<BankTransaction> & Pick<BankTransaction, 'id' | 'direction' | 'amount' | 'category'>,
): BankTransaction {
  return {
    owner_id: 'o',
    business_id: 'b',
    bank_connection_id: 'c',
    external_transaction_id: overrides.id,
    transaction_date: '2026-03-05',
    description: 'demo',
    source: 'demo',
    created_at: '2026-03-05T00:00:00.000Z',
    ...overrides,
  }
}

describe('deterministic bank balances', () => {
  it('computes available and reserve from movements only', () => {
    const rows = [
      txn({ id: '1', direction: 'inflow', amount: 850_000, category: 'sales_deposit' }),
      txn({ id: '2', direction: 'inflow', amount: 150_000, category: 'reserve_transfer' }),
      txn({ id: '3', direction: 'outflow', amount: 40_000, category: 'reserve_transfer' }),
    ]
    expect(availableBusinessAccountBalanceMmk(rows)).toBe(960_000)
    expect(emergencyReserveHeldMmk(rows)).toBe(110_000)
    expect(reserveProgressPercent(110_000, 1_200_000)).toBe(9)
    expect(reserveProgressPercent(0, 0)).toBe(0)
  })
})
