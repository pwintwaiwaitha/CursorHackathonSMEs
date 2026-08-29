import { describe, expect, it } from 'vitest'
import { emptyStore } from '../storage/types'
import type { ForecastResult } from '../types/models'
import { buildOwnerNotifications, shouldPingNotification } from './notifications'

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

describe('buildOwnerNotifications', () => {
  it('includes missing check-in and overdue bills only', () => {
    const store = emptyStore()
    store.profile = {
      id: 'b',
      businessName: 'Test',
      businessType: 'shop',
      startingCashBalanceMmk: 20_000_000,
      averageMonthlySalesMmk: 1_000_000,
      employeeCount: 1,
      mainExpenseCategories: ['rent'],
      preferredLanguage: 'en',
      currency: 'MMK',
      createdAt: '',
      updatedAt: '',
    }
    store.receivables = [
      {
        id: 'r1',
        customerName: 'Ko',
        amountMmk: 20_000,
        expectedPaymentDate: '2026-08-20',
        status: 'overdue',
        amountPaidMmk: 0,
        notes: '',
      },
    ]
    const items = buildOwnerNotifications({
      store,
      forecast: forecast(),
      today: '2026-08-29',
      reminderTime: '09:00',
      now: new Date('2026-08-29T10:00:00'),
    })
    expect(items.map((item) => item.type)).toEqual(['overdue', 'missing_checkin'])
  })

  it('adds cash_risk when the forecast already has a shortage date', () => {
    const store = emptyStore()
    const items = buildOwnerNotifications({
      store,
      forecast: forecast({ shortageDate: '2026-09-01', risk: 'high' }),
      today: '2026-08-29',
      reminderTime: '09:00',
    })
    expect(items.some((item) => item.type === 'cash_risk')).toBe(true)
  })
})

describe('shouldPingNotification', () => {
  it('waits for reminder time before pinging a missing check-in', () => {
    expect(
      shouldPingNotification('missing_checkin', '18:00', new Date('2026-08-29T10:00:00')),
    ).toBe(false)
    expect(shouldPingNotification('overdue', '18:00', new Date('2026-08-29T10:00:00'))).toBe(
      true,
    )
  })
})
