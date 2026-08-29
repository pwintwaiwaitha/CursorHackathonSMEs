import { describe, expect, it } from 'vitest'
import { EMPTY_SCENARIOS } from '../storage/types'
import type { AppStore } from '../storage/types'
import type { BankTransaction } from '../types/bank'
import type { Payable, Receivable } from '../types/models'
import {
  bankMatchKey,
  buildBankMatchPairs,
  matchBankToManual,
  matchableFromBankTransaction,
  matchStatusForBankTransaction,
  movementsMatch,
  normalizeBankReference,
  storeWithoutMatchedManuals,
} from './bankMatching'
import { FORECAST_LEVELS, runForecast } from './forecastEngine'

const BUSINESS_ID = 'demo_clothing_biz_profile'

function bankTxn(overrides: Partial<BankTransaction> & Pick<BankTransaction, 'id'>): BankTransaction {
  return {
    owner_id: 'owner',
    business_id: BUSINESS_ID,
    bank_connection_id: 'conn',
    external_transaction_id: overrides.id,
    direction: 'inflow',
    amount: 280_000,
    transaction_date: '2026-03-06',
    category: 'customer_payment',
    description: 'Ma Ei (bridal order)',
    source: 'demo',
    created_at: '2026-03-06T00:00:00.000Z',
    ...overrides,
  }
}

function store(overrides: Partial<AppStore> = {}): AppStore {
  return {
    profile: {
      id: BUSINESS_ID,
      businessName: 'Thiri Fashion',
      businessType: 'shop',
      startingCashBalanceMmk: 1_000_000,
      averageMonthlySalesMmk: 3_000_000,
      employeeCount: 2,
      mainExpenseCategories: ['rent'],
      preferredLanguage: 'en',
      currency: 'MMK',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    checkIns: [],
    scheduledItems: [],
    receivables: [],
    payables: [],
    scenarios: { ...EMPTY_SCENARIOS },
    ...overrides,
  }
}

function receivable(overrides: Partial<Receivable> & Pick<Receivable, 'id'>): Receivable {
  return {
    customerName: 'Ma Ei (bridal order)',
    amountMmk: 280_000,
    expectedPaymentDate: '2026-03-06',
    status: 'pending',
    amountPaidMmk: 0,
    notes: '',
    ...overrides,
  }
}

function payable(overrides: Partial<Payable> & Pick<Payable, 'id'>): Payable {
  return {
    supplierName: 'Theingyi fabric house',
    amountMmk: 540_000,
    dueDate: '2026-03-06',
    category: 'stock',
    status: 'pending',
    recurrence: 'once',
    notes: '',
    ...overrides,
  }
}

describe('deterministic bank matching', () => {
  it('matches on business, date, amount, direction, and normalized reference', () => {
    const bank = matchableFromBankTransaction(
      bankTxn({
        id: 'bank-1',
        description: '  Ma  Ei (bridal order) ',
      }),
      BUSINESS_ID,
    )
    const manual = {
      id: 'rec-1',
      businessId: BUSINESS_ID,
      date: '2026-03-06',
      amountMmk: 280_000,
      direction: 'inflow' as const,
      reference: 'Ma Ei (bridal order)',
    }
    expect(normalizeBankReference(bank.reference)).toBe('ma ei (bridal order)')
    expect(movementsMatch(bank, manual)).toBe(true)
    expect(bankMatchKey(bank)).toBe(bankMatchKey(manual))
    const pairs = matchBankToManual([bank], [manual])
    expect(pairs).toHaveLength(1)
    expect(pairs[0]).toMatchObject({
      bankTransactionId: 'bank-1',
      manualId: 'rec-1',
      status: 'matched',
    })
    expect(matchStatusForBankTransaction('bank-1', pairs)).toBe('matched')
    expect(matchStatusForBankTransaction('bank-2', pairs)).toBe('unmatched')
  })

  it('does not match a different amount, date, or direction', () => {
    const bank = matchableFromBankTransaction(bankTxn({ id: 'bank-1' }), BUSINESS_ID)
    expect(
      movementsMatch(bank, {
        id: 'rec-1',
        businessId: BUSINESS_ID,
        date: '2026-03-06',
        amountMmk: 279_000,
        direction: 'inflow',
        reference: 'Ma Ei (bridal order)',
      }),
    ).toBe(false)
    expect(
      movementsMatch(bank, {
        id: 'rec-1',
        businessId: BUSINESS_ID,
        date: '2026-03-07',
        amountMmk: 280_000,
        direction: 'inflow',
        reference: 'Ma Ei (bridal order)',
      }),
    ).toBe(false)
    expect(
      movementsMatch(bank, {
        id: 'pay-1',
        businessId: BUSINESS_ID,
        date: '2026-03-06',
        amountMmk: 280_000,
        direction: 'outflow',
        reference: 'Ma Ei (bridal order)',
      }),
    ).toBe(false)
  })

  it('pairs each bank transaction to at most one manual row', () => {
    const pairs = matchBankToManual(
      [matchableFromBankTransaction(bankTxn({ id: 'bank-1' }), BUSINESS_ID)],
      [
        {
          id: 'rec-1',
          businessId: BUSINESS_ID,
          date: '2026-03-06',
          amountMmk: 280_000,
          direction: 'inflow',
          reference: 'Ma Ei (bridal order)',
        },
        {
          id: 'rec-2',
          businessId: BUSINESS_ID,
          date: '2026-03-06',
          amountMmk: 280_000,
          direction: 'inflow',
          reference: 'Ma Ei (bridal order)',
        },
      ],
    )
    expect(pairs).toHaveLength(1)
    expect(pairs[0]?.manualId).toBe('rec-1')
  })

  it('drops a matched receivable from the forecast store so it is not counted twice', () => {
    const books = store({
      receivables: [receivable({ id: 'rec-1' })],
      payables: [payable({ id: 'pay-1' })],
    })
    const imported = [bankTxn({ id: 'bank-1' })]
    const pairs = buildBankMatchPairs(books, imported, BUSINESS_ID)
    expect(pairs.map((item) => item.manualId)).toEqual(['rec-1'])
    const filtered = storeWithoutMatchedManuals(books, imported, BUSINESS_ID)
    expect(filtered.receivables).toEqual([])
    expect(filtered.payables).toHaveLength(1)

    const withDoubleCount = runForecast({
      store: books,
      level: FORECAST_LEVELS[0],
      startDate: '2026-03-05',
      ignoreUnlock: true,
    })
    const withoutDoubleCount = runForecast({
      store: filtered,
      level: FORECAST_LEVELS[0],
      startDate: '2026-03-05',
      ignoreUnlock: true,
    })
    const inflowOnDue = (result: typeof withDoubleCount) =>
      result.points.find((point) => point.date === '2026-03-06')?.inflowsMmk ?? 0
    expect(inflowOnDue(withDoubleCount)).toBe(280_000)
    expect(inflowOnDue(withoutDoubleCount)).toBe(0)
  })
})
