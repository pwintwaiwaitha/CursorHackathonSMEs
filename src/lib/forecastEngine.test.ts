import { describe, expect, it } from 'vitest'
import { EMPTY_SCENARIOS } from '../storage/types'
import type { AppStore } from '../storage/types'
import type { DailyCashCheckIn, Payable, Receivable } from '../types/models'
import { addDaysIso } from './dates'
import {
  FORECAST_LEVELS,
  checkInCashInMmk,
  compoundAnnualAmount,
  isForecastLevelUnlocked,
  measureCheckInHistory,
  runForecast,
  scoreConfidence,
} from './forecastEngine'
import { getCurrentCashMmk } from './cashBalance'

function checkIn(
  date: string,
  overrides: Partial<DailyCashCheckIn> = {},
): DailyCashCheckIn {
  return {
    id: `c_${date}`,
    date,
    openingCashMmk: 0,
    cashSalesMmk: 100_000,
    customerDebtCollectedMmk: 0,
    creditSalesMmk: 0,
    operatingExpensesMmk: 40_000,
    inventoryPurchasesMmk: 20_000,
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

function manyCheckIns(count: number, start = '2024-01-01'): DailyCashCheckIn[] {
  return Array.from({ length: count }, (_, index) => checkIn(addDaysIso(start, index)))
}

function store(overrides: Partial<AppStore> = {}): AppStore {
  return {
    profile: {
      id: 'biz',
      businessName: 'Mya Mart',
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
    customerName: 'Ko Aung',
    amountMmk: 200_000,
    expectedPaymentDate: '2026-03-06',
    status: 'pending',
    amountPaidMmk: 0,
    notes: '',
    ...overrides,
  }
}

function payable(overrides: Partial<Payable> & Pick<Payable, 'id'>): Payable {
  return {
    supplierName: 'ABC',
    amountMmk: 80_000,
    dueDate: '2026-03-06',
    category: 'stock',
    status: 'pending',
    recurrence: 'once',
    notes: '',
    ...overrides,
  }
}

const asOf = '2026-03-05'

describe('progressive unlocks', () => {
  it('unlocks a 3-day Scheduled Forecast after 1 day of data', () => {
    const history = measureCheckInHistory(manyCheckIns(1, '2026-03-04'), asOf)
    expect(history.recordedDays).toBe(1)
    expect(isForecastLevelUnlocked(FORECAST_LEVELS[0], 1)).toBe(true)
    expect(isForecastLevelUnlocked(FORECAST_LEVELS[1], 1)).toBe(false)
    const result = runForecast({
      store: store({ checkIns: manyCheckIns(1, '2026-03-04') }),
      level: FORECAST_LEVELS[0],
      startDate: asOf,
    })
    expect(result.locked).toBe(false)
    expect(result.label).toBe('Scheduled Forecast')
    expect(result.horizonDays).toBe(3)
    expect(result.startDate).toBe(asOf)
    expect(result.endDate).toBe('2026-03-07')
  })

  it('unlocks 14-day and Early Projection after 7 days', () => {
    expect(isForecastLevelUnlocked(FORECAST_LEVELS[1], 7)).toBe(true)
    expect(isForecastLevelUnlocked(FORECAST_LEVELS[2], 7)).toBe(true)
    expect(isForecastLevelUnlocked(FORECAST_LEVELS[3], 7)).toBe(false)
    const early = runForecast({
      store: store({ checkIns: manyCheckIns(7, '2026-02-26') }),
      level: FORECAST_LEVELS[2],
      startDate: asOf,
    })
    expect(early.label).toBe('Early Projection')
    expect(early.horizonDays).toBe(30)
  })

  it('unlocks a 6-month scenario after 30 days', () => {
    const result = runForecast({
      store: store({ checkIns: manyCheckIns(30, '2026-02-04') }),
      level: FORECAST_LEVELS[3],
      startDate: asOf,
    })
    expect(result.locked).toBe(false)
    expect(result.label).toContain('6-month')
    expect(result.horizonDays).toBe(180)
  })

  it('unlocks a 1-year projection after 180 days', () => {
    const result = runForecast({
      store: store({ checkIns: manyCheckIns(180, '2025-09-07') }),
      level: FORECAST_LEVELS[4],
      startDate: asOf,
    })
    expect(result.locked).toBe(false)
    expect(result.horizonDays).toBe(365)
  })

  it('unlocks a 3-year growth projection after 365 days', () => {
    const result = runForecast({
      store: store({ checkIns: manyCheckIns(365, '2025-03-06') }),
      level: FORECAST_LEVELS[5],
      startDate: asOf,
    })
    expect(result.locked).toBe(false)
    expect(result.horizonDays).toBe(1095)
  })

  it('unlocks 10-year and 30-year strategic scenarios after 3 years of data', () => {
    expect(isForecastLevelUnlocked(FORECAST_LEVELS[6], 1095)).toBe(true)
    expect(isForecastLevelUnlocked(FORECAST_LEVELS[7], 1095)).toBe(true)
    const ten = runForecast({
      store: store({ checkIns: manyCheckIns(1095, '2023-03-07') }),
      level: FORECAST_LEVELS[6],
      startDate: asOf,
    })
    const thirty = runForecast({
      store: store({ checkIns: manyCheckIns(1095, '2023-03-07') }),
      level: FORECAST_LEVELS[7],
      startDate: asOf,
    })
    expect(ten.locked).toBe(false)
    expect(thirty.locked).toBe(false)
    expect(ten.disclaimer).toContain('not a guaranteed prediction')
    expect(thirty.disclaimer).toContain('not a guaranteed prediction')
  })

  it('keeps longer levels locked without enough history', () => {
    const locked = runForecast({
      store: store({ checkIns: manyCheckIns(1, '2026-03-04') }),
      level: FORECAST_LEVELS[6],
      startDate: asOf,
    })
    expect(locked.locked).toBe(true)
    expect(locked.unlockRequirement).toContain('1095')
  })
})

describe('accounting rules', () => {
  it('starts from current closing cash, not expected receivables', () => {
    const books = store({
      checkIns: [checkIn('2026-03-04', { cashSalesMmk: 50_000, operatingExpensesMmk: 0, inventoryPurchasesMmk: 0 })],
      receivables: [receivable({ id: 'r1', amountMmk: 9_000_000 })],
    })
    expect(getCurrentCashMmk(books)).toBe(1_050_000)
    const result = runForecast({
      store: books,
      level: FORECAST_LEVELS[0],
      startDate: asOf,
    })
    expect(result.startingBalanceMmk).toBe(1_050_000)
  })

  it('adds scheduled inflows and subtracts scheduled outflows', () => {
    const result = runForecast({
      store: store({
        checkIns: [checkIn('2026-03-04')],
        receivables: [receivable({ id: 'r1', amountMmk: 50_000, expectedPaymentDate: '2026-03-06' })],
        payables: [payable({ id: 'p1', amountMmk: 30_000, dueDate: '2026-03-06' })],
      }),
      level: FORECAST_LEVELS[0],
      startDate: asOf,
      assumptions: { customerCollectionRatePercent: 100 },
    })
    const day = result.points.find((point) => point.date === '2026-03-06')
    expect(day?.inflowsMmk).toBe(50_000)
    expect(day?.outflowsMmk).toBe(30_000)
  })

  it('does not count credit sales as cash before collection', () => {
    const withCredit = store({
      checkIns: [
        checkIn('2026-03-04', {
          cashSalesMmk: 80_000,
          creditSalesMmk: 500_000,
          operatingExpensesMmk: 10_000,
          inventoryPurchasesMmk: 0,
        }),
      ],
    })
    expect(checkInCashInMmk(withCredit.checkIns[0])).toBe(80_000)
    const result = runForecast({
      store: withCredit,
      level: FORECAST_LEVELS[0],
      startDate: asOf,
    })
    expect(result.startingBalanceMmk).toBe(1_070_000)
    expect(result.points.every((point) => point.inflowsMmk === 0)).toBe(true)
  })

  it('scales expected collections by the collection rate', () => {
    const result = runForecast({
      store: store({
        checkIns: [checkIn('2026-03-04')],
        receivables: [receivable({ id: 'r1', amountMmk: 100_000, expectedPaymentDate: '2026-03-06' })],
      }),
      level: FORECAST_LEVELS[0],
      startDate: asOf,
      assumptions: { customerCollectionRatePercent: 50 },
    })
    const day = result.points.find((point) => point.date === '2026-03-06')
    expect(day?.inflowsMmk).toBe(50_000)
  })

  it('reports shortage date and amount when cash goes negative', () => {
    const result = runForecast({
      store: store({
        profile: {
          id: 'biz',
          businessName: 'Mya Mart',
          businessType: 'shop',
          startingCashBalanceMmk: 10_000,
          averageMonthlySalesMmk: 3_000_000,
          employeeCount: 1,
          mainExpenseCategories: ['rent'],
          preferredLanguage: 'en',
          currency: 'MMK',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        checkIns: [checkIn('2026-03-04', { cashSalesMmk: 0, operatingExpensesMmk: 0, inventoryPurchasesMmk: 0 })],
        payables: [payable({ id: 'p1', amountMmk: 50_000, dueDate: asOf })],
      }),
      level: FORECAST_LEVELS[0],
      startDate: asOf,
    })
    expect(result.shortageDate).toBe(asOf)
    expect(result.shortageAmountMmk).toBe(40_000)
    expect(result.lowestPredictedCashMmk).toBe(-40_000)
  })
})

describe('run rate, growth, confidence and bands', () => {
  it('uses rolling averages on a 14-day forecast', () => {
    const result = runForecast({
      store: store({ checkIns: manyCheckIns(14, '2026-02-20') }),
      level: FORECAST_LEVELS[1],
      startDate: asOf,
    })
    expect(result.points[0]?.inflowsMmk).toBe(100_000)
    expect(result.points[0]?.outflowsMmk).toBe(60_000)
  })

  it('compounds annual growth deterministically', () => {
    expect(compoundAnnualAmount(100_000, 0, 365)).toBe(100_000)
    expect(compoundAnnualAmount(100_000, 100, 365)).toBe(200_000)
  })

  it('makes optimistic cash higher than pessimistic cash', () => {
    const books = store({ checkIns: manyCheckIns(30, '2026-02-04') })
    const optimistic = runForecast({
      store: books,
      level: FORECAST_LEVELS[3],
      startDate: asOf,
      band: 'optimistic',
    })
    const pessimistic = runForecast({
      store: books,
      level: FORECAST_LEVELS[3],
      startDate: asOf,
      band: 'pessimistic',
    })
    expect(optimistic.predictedClosingCashMmk).toBeGreaterThan(
      pessimistic.predictedClosingCashMmk,
    )
  })

  it('lowers confidence for long horizons and missing days', () => {
    const high = scoreConfidence({
      recordedDays: 90,
      missingRatio: 0,
      volatility: 0.1,
      horizonDays: 14,
      scheduledCount: 8,
    })
    const veryLow = scoreConfidence({
      recordedDays: 1,
      missingRatio: 0.8,
      volatility: 3,
      horizonDays: 10950,
      scheduledCount: 0,
    })
    expect(high).toBe('high')
    expect(veryLow).toBe('very_low')
  })

  it('returns the required forecast fields', () => {
    const result = runForecast({
      store: store({ checkIns: manyCheckIns(7, '2026-02-26') }),
      level: FORECAST_LEVELS[1],
      startDate: asOf,
    })
    expect(result.startDate).toBeTruthy()
    expect(result.endDate).toBeTruthy()
    expect(typeof result.predictedClosingCashMmk).toBe('number')
    expect(typeof result.lowestPredictedCashMmk).toBe('number')
    expect(result.suggestedActions.length).toBeGreaterThan(0)
    expect(result.mainRiskDrivers.length).toBeGreaterThan(0)
    expect(result.confidenceLevel).toBeTruthy()
    expect(result.dataPeriodUsed).toContain('Check-ins')
    expect(Array.isArray(result.missingDataWarnings)).toBe(true)
  })

  it('shifts receivable collection by collectionDelayDays', () => {
    const result = runForecast({
      store: store({
        checkIns: [checkIn('2026-03-04')],
        receivables: [receivable({ id: 'r1', amountMmk: 50_000, expectedPaymentDate: '2026-03-06' })],
      }),
      level: FORECAST_LEVELS[0],
      startDate: asOf,
      assumptions: { collectionDelayDays: 1 },
    })
    expect(result.points.find((point) => point.date === '2026-03-06')?.inflowsMmk).toBe(0)
    expect(result.points.find((point) => point.date === '2026-03-07')?.inflowsMmk).toBe(50_000)
  })

  it('postpones supplier cash out and adds a hired wage', () => {
    const books = store({
      checkIns: [checkIn('2026-03-04')],
      payables: [payable({ id: 'p1', amountMmk: 30_000, dueDate: '2026-03-06' })],
    })
    const postponed = runForecast({
      store: books,
      level: FORECAST_LEVELS[0],
      startDate: asOf,
      assumptions: { supplierPostponeDays: 14 },
    })
    expect(postponed.points.find((point) => point.date === '2026-03-06')?.outflowsMmk).toBe(0)
    const hired = runForecast({
      store: books,
      level: FORECAST_LEVELS[0],
      startDate: asOf,
      assumptions: { hireEmployeeMonthlyWageMmk: 30_000 },
    })
    expect(hired.points[0]?.outflowsMmk).toBe(1_000)
  })
})
