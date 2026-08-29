import { addDaysIso, todayIsoDate } from '../lib/dates'
import { createId } from '../lib/ids'
import type { AppStore } from './types'
import { EMPTY_SCENARIOS } from './types'

export function buildSampleStore(): AppStore {
  const today = todayIsoDate()

  return {
    profile: {
      id: createId('biz'),
      businessName: 'Mya Family Mini Mart',
      businessType: 'shop',
      startingCashBalanceMmk: 2_400_000,
      averageMonthlySalesMmk: 9_000_000,
      employeeCount: 3,
      mainExpenseCategories: ['rent', 'wages', 'stock', 'utilities'],
      preferredLanguage: 'en',
      currency: 'MMK',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    checkIns: [
      {
        id: createId('checkin'),
        date: addDaysIso(today, -2),
        openingCashMmk: 2_400_000,
        cashSalesMmk: 310_000,
        otherInflowsMmk: 0,
        cashExpensesMmk: 45_000,
        supplierPaymentsMmk: 0,
        stockPurchasesMmk: 180_000,
        notes: 'Quiet weekday.',
        createdAt: new Date().toISOString(),
      },
      {
        id: createId('checkin'),
        date: addDaysIso(today, -1),
        openingCashMmk: 2_485_000,
        cashSalesMmk: 420_000,
        otherInflowsMmk: 80_000,
        cashExpensesMmk: 52_000,
        supplierPaymentsMmk: 150_000,
        stockPurchasesMmk: 0,
        notes: 'Customer paid part of old bill.',
        createdAt: new Date().toISOString(),
      },
    ],
    scheduledItems: [
      {
        id: createId('sched'),
        name: 'Shop rent',
        kind: 'outflow',
        amountMmk: 800_000,
        dueDate: addDaysIso(today, 5),
        recurrence: 'monthly',
        notes: 'Due at month start.',
      },
      {
        id: createId('sched'),
        name: 'Staff wages',
        kind: 'outflow',
        amountMmk: 1_200_000,
        dueDate: addDaysIso(today, 8),
        recurrence: 'monthly',
        notes: '3 staff.',
      },
    ],
    receivables: [
      {
        id: createId('recv'),
        customerName: 'Ko Aung (credit customer)',
        amountMmk: 350_000,
        dueDate: addDaysIso(today, 3),
        expectedCollectDate: addDaysIso(today, 4),
        status: 'open',
        notes: 'Monthly account.',
      },
      {
        id: createId('recv'),
        customerName: 'Daw Hla restaurant',
        amountMmk: 220_000,
        dueDate: addDaysIso(today, -4),
        expectedCollectDate: addDaysIso(today, 1),
        status: 'overdue',
        notes: 'Overdue 4 days.',
      },
    ],
    payables: [
      {
        id: createId('pay'),
        supplierName: 'ABC Wholesale',
        amountMmk: 950_000,
        dueDate: addDaysIso(today, 6),
        expectedPayDate: addDaysIso(today, 6),
        status: 'open',
        notes: 'Rice and oil stock.',
      },
    ],
    scenarios: { ...EMPTY_SCENARIOS },
  }
}
