import { describe, expect, it } from 'vitest'
import { getCurrentCashMmk } from './cashflow'
import { EMPTY_SCENARIOS } from '../storage/types'
import type { AppStore } from '../storage/types'
import type { Payable, Receivable } from '../types/models'
import {
  applyReceivablePayment,
  deriveReceivableStatus,
  expectedCashGapMmk,
  myanmarPaymentReminder,
  remainingReceivableMmk,
  receivableWindows,
  totalOpenReceivablesMmk,
} from './schedule'
import { buildForecast } from './cashflow'

function receivable(overrides: Partial<Receivable> & Pick<Receivable, 'id'>): Receivable {
  return {
    customerName: 'Ko Aung',
    amountMmk: 100_000,
    expectedPaymentDate: '2026-03-10',
    status: 'pending',
    amountPaidMmk: 0,
    notes: '',
    ...overrides,
  }
}

function payable(overrides: Partial<Payable> & Pick<Payable, 'id'>): Payable {
  return {
    supplierName: 'ABC Wholesale',
    amountMmk: 80_000,
    dueDate: '2026-03-08',
    category: 'stock',
    status: 'pending',
    recurrence: 'once',
    notes: '',
    ...overrides,
  }
}

function store(overrides: Partial<AppStore> = {}): AppStore {
  return {
    profile: {
      id: 'biz',
      businessName: 'Mya Mart',
      businessType: 'shop',
      startingCashBalanceMmk: 500_000,
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

describe('expected receivables are not current cash', () => {
  it('keeps current cash equal to recorded cash even when customers owe money', () => {
    const books = store({
      receivables: [
        receivable({ id: 'r1', amountMmk: 2_000_000, expectedPaymentDate: '2026-03-05' }),
      ],
    })
    expect(getCurrentCashMmk(books)).toBe(500_000)
    expect(totalOpenReceivablesMmk(books.receivables)).toBe(2_000_000)
  })
})

describe('overdue and partial payments', () => {
  it('marks a late unpaid bill as overdue', () => {
    const item = receivable({
      id: 'r1',
      expectedPaymentDate: '2026-03-01',
      amountPaidMmk: 20_000,
    })
    expect(deriveReceivableStatus(item, '2026-03-05')).toBe('overdue')
    expect(remainingReceivableMmk(item)).toBe(80_000)
  })

  it('records a partial payment without treating it as cash in the till', () => {
    const item = applyReceivablePayment(
      receivable({ id: 'r1', amountMmk: 100_000, expectedPaymentDate: '2026-03-20' }),
      40_000,
      '2026-03-05',
    )
    expect(item.status).toBe('partially_paid')
    expect(item.amountPaidMmk).toBe(40_000)
    expect(remainingReceivableMmk(item)).toBe(60_000)
  })
})

describe('due windows', () => {
  it('splits remaining customer money into 3, 7 and 30 day buckets', () => {
    const windows = receivableWindows(
      [
        receivable({ id: 'a', amountMmk: 10_000, expectedPaymentDate: '2026-03-06' }),
        receivable({ id: 'b', amountMmk: 20_000, expectedPaymentDate: '2026-03-10' }),
        receivable({ id: 'c', amountMmk: 40_000, expectedPaymentDate: '2026-03-25' }),
        receivable({ id: 'd', amountMmk: 5_000, expectedPaymentDate: '2026-03-01' }),
      ],
      '2026-03-05',
    )
    expect(windows.within3DaysMmk).toBe(10_000)
    expect(windows.within7DaysMmk).toBe(30_000)
    expect(windows.within30DaysMmk).toBe(70_000)
    expect(windows.overdueMmk).toBe(5_000)
  })
})

describe('forecast includes expected bills, not till cash', () => {
  it('adds expected collections and supplier bills on their dates', () => {
    const books = store({
      receivables: [
        receivable({
          id: 'r1',
          amountMmk: 50_000,
          expectedPaymentDate: '2026-03-06',
        }),
      ],
      payables: [payable({ id: 'p1', amountMmk: 30_000, dueDate: '2026-03-06' })],
    })
    const forecast = buildForecast(books, 3, EMPTY_SCENARIOS, '2026-03-05')
    const dayTwo = forecast.points.find((point) => point.date === '2026-03-06')
    expect(dayTwo).toBeDefined()
    expect(dayTwo?.inflowsMmk).toBeGreaterThanOrEqual(50_000)
    expect(dayTwo?.outflowsMmk).toBeGreaterThanOrEqual(30_000)
    expect(forecast.startingBalanceMmk).toBe(500_000)
  })
})

describe('cash gap and reminder', () => {
  it('computes the expected cash gap without adding receivables to cash now', () => {
    const gap = expectedCashGapMmk({
      currentCashMmk: 100_000,
      receivables: [
        receivable({ id: 'r1', amountMmk: 20_000, expectedPaymentDate: '2026-03-06' }),
      ],
      payables: [payable({ id: 'p1', amountMmk: 150_000, dueDate: '2026-03-07' })],
      today: '2026-03-05',
    })
    expect(gap).toBe(30_000)
  })

  it('builds a polite Myanmar payment reminder', () => {
    const message = myanmarPaymentReminder({
      customerName: 'ကိုအောင်',
      businessName: 'Mya Family Mini Mart',
      remainingMmk: 220_000,
      expectedPaymentDate: '2026-03-10',
    })
    expect(message).toContain('မင်္ဂလာပါ')
    expect(message).toContain('မေတ္တာရပ်ခံ')
    expect(message).toContain('220,000 MMK')
  })
})
