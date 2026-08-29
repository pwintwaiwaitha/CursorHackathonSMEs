import { describe, expect, it } from 'vitest'
import type { CashFlowHealth, DailyCashCheckIn, ForecastResult } from '../types/models'
import {
  findOwnerLargeFields,
  mapOwnerStatus,
  recurringOutflowsForDate,
  reminderTimeReached,
  safeToSpendMmk,
} from './ownerJourney'
import { emptyStore } from '../storage/types'

function health(status: CashFlowHealth['status']): CashFlowHealth {
  return { status, score: 50, summary: '', daysOfCash: 10 }
}

function forecast(overrides: Partial<ForecastResult> = {}): ForecastResult {
  return {
    levelId: 'd7',
    label: '7 day',
    kind: 'short_term',
    locked: false,
    unlockRequirement: null,
    startDate: '2026-08-29',
    endDate: '2026-09-04',
    horizonDays: 7,
    startingBalanceMmk: 1_000_000,
    endingBalanceMmk: 900_000,
    predictedClosingCashMmk: 900_000,
    lowestBalanceMmk: 900_000,
    lowestPredictedCashMmk: 900_000,
    shortageDays: 0,
    firstShortageDate: null,
    shortageDate: null,
    shortageAmountMmk: 0,
    points: [],
    causes: [],
    mainRiskDrivers: [],
    recommendedActions: [],
    suggestedActions: [],
    risk: 'low',
    confidenceLevel: 'medium',
    dataPeriodUsed: 'test',
    missingDataWarnings: [],
    disclaimer: '',
    ...overrides,
  }
}

describe('mapOwnerStatus', () => {
  it('maps healthy low risk to safe', () => {
    expect(mapOwnerStatus(health('healthy'), forecast({ risk: 'low' }))).toBe('safe')
  })

  it('maps watch or medium risk to attention', () => {
    expect(mapOwnerStatus(health('watch'), forecast({ risk: 'low' }))).toBe('attention')
    expect(mapOwnerStatus(health('healthy'), forecast({ risk: 'medium' }))).toBe('attention')
  })

  it('maps shortage, high risk, or critical to high_risk', () => {
    expect(mapOwnerStatus(health('healthy'), forecast({ shortageDate: '2026-09-01' }))).toBe(
      'high_risk',
    )
    expect(mapOwnerStatus(health('at_risk'), forecast({ risk: 'low' }))).toBe('high_risk')
    expect(mapOwnerStatus(health('healthy'), forecast({ risk: 'high' }))).toBe('high_risk')
  })
})

describe('safeToSpendMmk', () => {
  it('subtracts 7-day payables and reserve, never below zero', () => {
    expect(
      safeToSpendMmk({
        currentCashMmk: 1_000_000,
        upcomingPayables7dMmk: 300_000,
        emergencyReserveMmk: 200_000,
      }),
    ).toBe(500_000)
    expect(
      safeToSpendMmk({
        currentCashMmk: 100_000,
        upcomingPayables7dMmk: 300_000,
        emergencyReserveMmk: 0,
      }),
    ).toBe(0)
  })
})

describe('findOwnerLargeFields', () => {
  it('flags an amount over 3x the last-7-day average or remaining cash', () => {
    const recent: DailyCashCheckIn[] = [
      {
        id: '1',
        date: '2026-08-28',
        openingCashMmk: 100_000,
        cashSalesMmk: 10_000,
        customerDebtCollectedMmk: 0,
        creditSalesMmk: 0,
        operatingExpensesMmk: 5_000,
        inventoryPurchasesMmk: 0,
        supplierPaymentsMmk: 0,
        otherCashReceivedMmk: 0,
        otherCashPaidMmk: 0,
        expenseBreakdowns: [],
        notes: '',
        closingCashMmk: 105_000,
        createdAt: '',
        updatedAt: '',
      },
    ]
    const flagged = findOwnerLargeFields(
      {
        cashSalesMmk: 80_000,
        customerDebtCollectedMmk: 0,
        otherCashReceivedMmk: 0,
        creditSalesMmk: 0,
        operatingExpensesMmk: 0,
        inventoryPurchasesMmk: 0,
        supplierPaymentsMmk: 0,
        otherCashPaidMmk: 200_000,
      },
      recent,
      50_000,
    )
    expect(flagged).toContain('cashSalesMmk')
    expect(flagged).toContain('otherCashPaidMmk')
  })
})

describe('recurringOutflowsForDate', () => {
  it('prefills payables and scheduled outflows due on that date', () => {
    const store = emptyStore()
    store.payables = [
      {
        id: 'p1',
        supplierName: 'Rice',
        amountMmk: 40_000,
        dueDate: '2026-08-29',
        category: 'stock',
        status: 'pending',
        recurrence: 'once',
        notes: '',
      },
    ]
    store.scheduledItems = [
      {
        id: 's1',
        name: 'Delivery',
        kind: 'outflow',
        amountMmk: 5_000,
        dueDate: '2026-08-29',
        recurrence: 'once',
        notes: '',
      },
    ]
    const prefill = recurringOutflowsForDate(store, '2026-08-29')
    expect(prefill.applied).toBe(true)
    expect(prefill.inventoryPurchasesMmk).toBe(40_000)
    expect(prefill.otherCashPaidMmk).toBe(5_000)
  })
})

describe('reminderTimeReached', () => {
  it('is true at or after the reminder clock time', () => {
    const morning = new Date('2026-08-29T08:59:00')
    const later = new Date('2026-08-29T09:00:00')
    expect(reminderTimeReached('09:00', morning)).toBe(false)
    expect(reminderTimeReached('09:00', later)).toBe(true)
  })
})
