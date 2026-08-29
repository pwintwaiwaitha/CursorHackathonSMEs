import { describe, expect, it } from 'vitest'
import { EMPTY_SCENARIOS } from '../storage/types'
import type { AppStore } from '../storage/types'
import type {
  CashFlowHealth,
  DailyCashCheckIn,
  ForecastPoint,
  ForecastResult,
  Payable,
  Receivable,
} from '../types/models'
import { addDaysIso } from './dates'
import {
  buildTodayActionItems,
  cashCoverFromParts,
  cashHubStatus,
  computeCashCover,
  computeSafeToSpend,
  essentialPaymentsDueWithin7DaysMmk,
  formatHiddenMmk,
  lowestIn14Days,
} from './dashboardMetrics'

const TODAY = '2026-03-05'

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
    closingCashMmk: 40_000,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function manyExpenseDays(count: number, start = '2026-02-01'): DailyCashCheckIn[] {
  return Array.from({ length: count }, (_, index) => {
    const date = addDaysIso(start, index)
    return checkIn(date, {
      openingCashMmk: 1_000_000,
      cashSalesMmk: 80_000,
      operatingExpensesMmk: 30_000,
      inventoryPurchasesMmk: 10_000,
      supplierPaymentsMmk: 5_000,
      otherCashPaidMmk: 5_000,
      closingCashMmk: 1_030_000,
    })
  })
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

function payable(overrides: Partial<Payable> & Pick<Payable, 'id'>): Payable {
  return {
    supplierName: 'ABC Wholesale',
    amountMmk: 80_000,
    dueDate: addDaysIso(TODAY, 3),
    category: 'stock',
    status: 'pending',
    recurrence: 'once',
    notes: '',
    ...overrides,
  }
}

function receivable(overrides: Partial<Receivable> & Pick<Receivable, 'id'>): Receivable {
  return {
    customerName: 'Ko Aung',
    amountMmk: 200_000,
    expectedPaymentDate: addDaysIso(TODAY, 5),
    status: 'pending',
    amountPaidMmk: 0,
    notes: '',
    ...overrides,
  }
}

function health(status: CashFlowHealth['status']): CashFlowHealth {
  return { status, score: 82, summary: 'ok', daysOfCash: 14 }
}

function forecast(overrides: Partial<ForecastResult> = {}): ForecastResult {
  return {
    levelId: 'short_14d',
    label: '14-day forecast',
    kind: 'short_term',
    locked: false,
    unlockRequirement: null,
    startDate: TODAY,
    endDate: addDaysIso(TODAY, 13),
    horizonDays: 14,
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

function point(date: string, balance: number, inflow = 0, outflow = 0): ForecastPoint {
  return {
    date,
    projectedBalanceMmk: balance,
    inflowsMmk: inflow,
    outflowsMmk: outflow,
    isShortage: balance < 0,
  }
}

describe('Safe to Spend', () => {
  it('empty books uses starting cash and shows no gap', () => {
    const result = computeSafeToSpend(
      store({
        profile: {
          ...store().profile!,
          startingCashBalanceMmk: 0,
        },
      }),
      TODAY,
    )
    expect(result.currentCashMmk).toBe(0)
    expect(result.essentialBills7dMmk).toBe(0)
    expect(result.safeToSpendMmk).toBe(0)
    expect(result.expectedCashGapMmk).toBe(0)
    expect(result.isNegative).toBe(false)
  })

  it('1 day of books keeps positive leftover as Safe to Spend', () => {
    const result = computeSafeToSpend(
      store({
        checkIns: [
          checkIn(TODAY, {
            cashSalesMmk: 100_000,
            operatingExpensesMmk: 20_000,
            inventoryPurchasesMmk: 0,
          }),
        ],
        scenarios: { ...EMPTY_SCENARIOS, emergencyCashReserveTargetMmk: 100_000 },
      }),
      TODAY,
    )
    // Opening is starting cash 1,000,000; net +80,000 → 1,080,000 − reserve 100,000
    expect(result.currentCashMmk).toBe(1_080_000)
    expect(result.safeToSpendMmk).toBe(980_000)
    expect(result.expectedCashGapMmk).toBe(0)
  })

  it('healthy shop with reserve still shows leftover cash', () => {
    const result = computeSafeToSpend(
      store({
        checkIns: manyExpenseDays(7),
        payables: [
          payable({ id: 'p1', amountMmk: 200_000, dueDate: addDaysIso(TODAY, 2) }),
        ],
        scenarios: { ...EMPTY_SCENARIOS, emergencyCashReserveTargetMmk: 300_000 },
      }),
      TODAY,
    )
    // 7 days × +30,000 on 1,000,000 start → 1,210,000
    expect(result.currentCashMmk).toBe(1_210_000)
    expect(result.essentialBills7dMmk).toBe(200_000)
    expect(result.safeToSpendMmk).toBe(710_000)
    expect(result.isNegative).toBe(false)
    expect(result.expectedCashGapMmk).toBe(0)
  })

  it('negative raw becomes 0 Safe to Spend plus Expected Cash Gap', () => {
    const result = computeSafeToSpend(
      store({
        profile: {
          ...store().profile!,
          startingCashBalanceMmk: 100_000,
        },
        payables: [
          payable({ id: 'p1', amountMmk: 180_000, dueDate: addDaysIso(TODAY, 1) }),
        ],
        receivables: [
          receivable({
            id: 'r1',
            expectedPaymentDate: addDaysIso(TODAY, 6),
            amountMmk: 50_000,
          }),
        ],
        scenarios: { ...EMPTY_SCENARIOS, emergencyCashReserveTargetMmk: 40_000 },
      }),
      TODAY,
    )
    expect(result.rawMmk).toBe(-120_000)
    expect(result.safeToSpendMmk).toBe(0)
    expect(result.expectedCashGapMmk).toBe(120_000)
    expect(result.isNegative).toBe(true)
    expect(result.gapCause).toBe('supplier_before_collections')
  })

  it('large cash plus large bills still uses the integer formula', () => {
    const result = computeSafeToSpend(
      store({
        profile: {
          ...store().profile!,
          startingCashBalanceMmk: 8_000_000,
        },
        payables: [
          payable({
            id: 'rent',
            supplierName: 'Landlord',
            amountMmk: 4_500_000,
            category: 'rent',
            dueDate: addDaysIso(TODAY, 4),
          }),
          payable({
            id: 'stock',
            amountMmk: 2_000_000,
            dueDate: addDaysIso(TODAY, 6),
          }),
        ],
        scenarios: { ...EMPTY_SCENARIOS, emergencyCashReserveTargetMmk: 1_000_000 },
      }),
      TODAY,
    )
    expect(result.essentialBills7dMmk).toBe(6_500_000)
    expect(result.rawMmk).toBe(500_000)
    expect(result.safeToSpendMmk).toBe(500_000)
    expect(result.expectedCashGapMmk).toBe(0)
  })

  it('includes overdue essential bills in the 7-day reserve', () => {
    const bills = [
      payable({ id: 'over', amountMmk: 90_000, dueDate: addDaysIso(TODAY, -2), status: 'overdue' }),
      payable({ id: 'soon', amountMmk: 40_000, dueDate: addDaysIso(TODAY, 3) }),
      payable({ id: 'later', amountMmk: 500_000, dueDate: addDaysIso(TODAY, 20) }),
    ]
    expect(essentialPaymentsDueWithin7DaysMmk(bills, TODAY)).toBe(130_000)
  })
})

describe('Cash cover display', () => {
  it('does not divide when average outflow is 0', () => {
    expect(
      cashCoverFromParts({
        currentCashMmk: 2_000_000,
        averageDailyOutflowMmk: 0,
        expenseDayCount: 10,
      }),
    ).toEqual({ kind: 'insufficient', reason: 'zero_average' })
  })

  it('empty books and 1 day are not enough data', () => {
    expect(computeCashCover(store()).kind).toBe('insufficient')
    expect(
      computeCashCover(store({ checkIns: [checkIn(TODAY)] })).kind,
    ).toBe('insufficient')
  })

  it('no expense history does not divide', () => {
    const noExpense = Array.from({ length: 8 }, (_, index) =>
      checkIn(addDaysIso('2026-02-01', index), {
        operatingExpensesMmk: 0,
        inventoryPurchasesMmk: 0,
        supplierPaymentsMmk: 0,
        otherCashPaidMmk: 0,
        cashSalesMmk: 50_000,
        closingCashMmk: 50_000,
      }),
    )
    const result = computeCashCover(store({ checkIns: noExpense }))
    expect(result).toEqual({ kind: 'insufficient', reason: 'few_days' })
  })

  it('healthy 7+ expense days returns whole days of cover', () => {
    const result = computeCashCover(
      store({
        checkIns: manyExpenseDays(7),
      }),
    )
    expect(result.kind).toBe('days')
    if (result.kind === 'days') {
      expect(result.averageDailyOutflowMmk).toBe(50_000)
      expect(result.days).toBe(24)
    }
  })

  it('more than 12 months when cover exceeds 365 days', () => {
    expect(
      cashCoverFromParts({
        currentCashMmk: 40_000_000,
        averageDailyOutflowMmk: 50_000,
        expenseDayCount: 7,
      }),
    ).toEqual({
      kind: 'more_than_year',
      averageDailyOutflowMmk: 50_000,
    })
  })
})

describe('Hub status and lowest cash', () => {
  it('maps upcoming shortage to a dated sentence', () => {
    const status = cashHubStatus(
      forecast({ shortageDate: '2026-03-12', risk: 'high' }),
      health('critical'),
    )
    expect(status.kind).toBe('shortage')
    expect(status.sentenceEn).toContain('12 Mar 2026')
  })

  it('maps healthy low-risk books to the 14-day safe sentence', () => {
    expect(cashHubStatus(forecast(), health('healthy')).kind).toBe('safe_14')
  })

  it('does not repeat current cash when the 14-day path has no movements', () => {
    expect(
      lowestIn14Days(
        forecast({
          lowestPredictedCashMmk: 1_000_000,
          points: [
            point(TODAY, 1_000_000),
            point(addDaysIso(TODAY, 1), 1_000_000),
          ],
        }),
        2,
      ),
    ).toEqual({ kind: 'no_movements' })
  })

  it('labels thin history as an early estimate', () => {
    const result = lowestIn14Days(
      forecast({
        lowestPredictedCashMmk: 700_000,
        points: [
          point(TODAY, 900_000, 0, 100_000),
          point(addDaysIso(TODAY, 3), 700_000, 0, 200_000),
        ],
      }),
      3,
    )
    expect(result).toEqual({
      kind: 'value',
      amountMmk: 700_000,
      earlyEstimate: true,
    })
  })
})

describe('Today action center sources', () => {
  it('includes overdue receivables with the remaining amount', () => {
    const items = buildTodayActionItems(
      store({
        receivables: [
          receivable({
            id: 'late',
            customerName: 'Daw Hla',
            amountMmk: 220_000,
            amountPaidMmk: 20_000,
            expectedPaymentDate: addDaysIso(TODAY, -4),
            status: 'overdue',
          }),
        ],
      }),
      TODAY,
    )
    expect(items[0]?.kind).toBe('collect_overdue')
    expect(items[0]?.amountMmk).toBe(200_000)
    expect(items[0]?.id).toBe('recv:late')
  })

  it('includes a near payable and extra stock from stored assumptions', () => {
    const items = buildTodayActionItems(
      store({
        payables: [
          payable({ id: 'bill', amountMmk: 95_000, dueDate: addDaysIso(TODAY, 2) }),
        ],
        scenarios: { ...EMPTY_SCENARIOS, extraStockPurchaseMmk: 400_000 },
      }),
      TODAY,
    )
    expect(items.some((item) => item.kind === 'pay_bill' && item.amountMmk === 95_000)).toBe(
      true,
    )
    expect(items.some((item) => item.kind === 'review_stock' && item.amountMmk === 400_000)).toBe(
      true,
    )
  })
})

describe('hidden amounts', () => {
  it('masks money without changing the stored number', () => {
    expect(formatHiddenMmk(true, 1_250_000)).toBe('•••• MMK')
    expect(formatHiddenMmk(false, 1_250_000)).toBe('1,250,000 MMK')
  })
})
