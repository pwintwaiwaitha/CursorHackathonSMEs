import { rechainCheckIns } from '../lib/checkIn'
import { addDaysIso, dateRange, todayIsoDate, weekdayIndex } from '../lib/dates'
import {
  derivePayableStatus,
  deriveReceivableStatus,
} from '../lib/schedule'
import type {
  BusinessProfile,
  DailyCashCheckIn,
  ExpenseBreakdownLine,
  Payable,
  Receivable,
  ScenarioAssumptions,
  ScheduledCashItem,
} from '../types/models'
import { DEMO_BUSINESSES, type DemoBusinessId } from './demoMode'
import type { AppStore } from './types'
import { EMPTY_SCENARIOS } from './types'

interface DayDraft {
  cashSalesMmk: number
  customerDebtCollectedMmk: number
  creditSalesMmk: number
  operatingExpensesMmk: number
  inventoryPurchasesMmk: number
  supplierPaymentsMmk: number
  otherCashReceivedMmk: number
  otherCashPaidMmk: number
  expenseBreakdowns: ExpenseBreakdownLine[]
  notes: string
}

function stamp(asOf: string): string {
  return `${asOf}T04:30:00.000Z`
}

function demoId(businessId: DemoBusinessId, kind: string, key: string): string {
  return `demo_${businessId}_${kind}_${key}`
}

function hashInt(seed: string): number {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function vary(base: number, seed: string, spread = 0.16): number {
  const unit = (hashInt(seed) % 1000) / 1000
  return Math.max(0, Math.round(base * (1 - spread + unit * spread * 2)))
}

function mmk(value: number): number {
  return Math.max(0, Math.trunc(value))
}

function historyDates(asOf: string, recordedDays: number): string[] {
  return dateRange(addDaysIso(asOf, -(recordedDays - 1)), recordedDays)
}

function line(
  businessId: DemoBusinessId,
  date: string,
  category: ExpenseBreakdownLine['category'],
  amountMmk: number,
  key: string,
): ExpenseBreakdownLine {
  return {
    id: demoId(businessId, 'line', `${date}_${key}`),
    category,
    amountMmk: mmk(amountMmk),
  }
}

function emptyDay(): DayDraft {
  return {
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
  }
}

function buildCheckIns(
  businessId: DemoBusinessId,
  asOf: string,
  recordedDays: number,
  startingCashBalanceMmk: number,
  dayFn: (date: string, index: number, dow: number) => DayDraft,
): DailyCashCheckIn[] {
  const now = stamp(asOf)
  const drafts = historyDates(asOf, recordedDays).map((date, index) => {
    const draft = dayFn(date, index, weekdayIndex(date))
    return {
      id: demoId(businessId, 'checkin', date),
      date,
      openingCashMmk: 0,
      cashSalesMmk: mmk(draft.cashSalesMmk),
      customerDebtCollectedMmk: mmk(draft.customerDebtCollectedMmk),
      creditSalesMmk: mmk(draft.creditSalesMmk),
      operatingExpensesMmk: mmk(draft.operatingExpensesMmk),
      inventoryPurchasesMmk: mmk(draft.inventoryPurchasesMmk),
      supplierPaymentsMmk: mmk(draft.supplierPaymentsMmk),
      otherCashReceivedMmk: mmk(draft.otherCashReceivedMmk),
      otherCashPaidMmk: mmk(draft.otherCashPaidMmk),
      expenseBreakdowns: draft.expenseBreakdowns,
      notes: draft.notes,
      closingCashMmk: 0,
      createdAt: now,
      updatedAt: now,
    }
  })
  return rechainCheckIns(drafts, startingCashBalanceMmk)
}

function finishReceivable(draft: Receivable, asOf: string): Receivable {
  return { ...draft, status: deriveReceivableStatus(draft, asOf) }
}

function finishPayable(draft: Payable, asOf: string): Payable {
  return { ...draft, status: derivePayableStatus(draft, asOf) }
}

function profile(
  businessId: DemoBusinessId,
  asOf: string,
  fields: Omit<BusinessProfile, 'id' | 'currency' | 'createdAt' | 'updatedAt'>,
): BusinessProfile {
  const now = stamp(asOf)
  return {
    id: demoId(businessId, 'biz', 'profile'),
    ...fields,
    currency: 'MMK',
    createdAt: now,
    updatedAt: now,
  }
}

function assumptions(partial: Partial<ScenarioAssumptions>): ScenarioAssumptions {
  return { ...EMPTY_SCENARIOS, ...partial }
}

function receivable(
  businessId: DemoBusinessId,
  key: string,
  fields: Omit<Receivable, 'id' | 'status'> & { status?: Receivable['status'] },
  asOf: string,
): Receivable {
  const draft: Receivable = {
    id: demoId(businessId, 'recv', key),
    status: 'pending',
    ...fields,
  }
  return finishReceivable(draft, asOf)
}

function payable(
  businessId: DemoBusinessId,
  key: string,
  fields: Omit<Payable, 'id' | 'status'> & { status?: Payable['status'] },
  asOf: string,
): Payable {
  const draft: Payable = {
    id: demoId(businessId, 'pay', key),
    status: 'pending',
    ...fields,
  }
  return finishPayable(draft, asOf)
}

function scheduled(
  businessId: DemoBusinessId,
  key: string,
  fields: Omit<ScheduledCashItem, 'id'>,
): ScheduledCashItem {
  return { id: demoId(businessId, 'sched', key), ...fields }
}

function weekendLift(dow: number, weekday: number, weekend: number): number {
  return dow === 0 || dow === 6 ? weekend : weekday
}

function buildCafe(asOf: string): AppStore {
  const id: DemoBusinessId = 'cafe'
  const startingCashBalanceMmk = 3_200_000
  const checkIns = buildCheckIns(id, asOf, 1, startingCashBalanceMmk, (date) => ({
    cashSalesMmk: 185_000,
    customerDebtCollectedMmk: 0,
    creditSalesMmk: 15_000,
    operatingExpensesMmk: 0,
    inventoryPurchasesMmk: 90_000,
    supplierPaymentsMmk: 0,
    otherCashReceivedMmk: 0,
    otherCashPaidMmk: 0,
    expenseBreakdowns: [
      line(id, date, 'electricity', 12_000, 'power'),
      line(id, date, 'transport', 8_000, 'taxi'),
      line(id, date, 'other', 25_000, 'cups'),
    ],
    notes: 'Opening day on Inya Road. Credit lunch tab is not in the cash box.',
  }))

  return {
    profile: profile(id, asOf, {
      businessName: 'Pan Nu Café',
      businessType: 'restaurant',
      startingCashBalanceMmk,
      averageMonthlySalesMmk: 5_400_000,
      employeeCount: 2,
      mainExpenseCategories: ['rent', 'wages', 'stock', 'utilities'],
      preferredLanguage: 'en',
    }),
    checkIns,
    scheduledItems: [
      scheduled(id, 'rent', {
        name: 'Shop rent',
        kind: 'outflow',
        amountMmk: 450_000,
        dueDate: addDaysIso(asOf, 18),
        recurrence: 'monthly',
        notes: 'Small corner shop near Inya Lake.',
      }),
    ],
    receivables: [
      receivable(
        id,
        'office',
        {
          customerName: 'Inya Office lunch tab',
          amountMmk: 15_000,
          expectedPaymentDate: addDaysIso(asOf, 6),
          amountPaidMmk: 0,
          notes: 'Same-day credit. Not cash until collected.',
        },
        asOf,
      ),
    ],
    payables: [
      payable(
        id,
        'beans',
        {
          supplierName: 'Shwe Palate coffee beans',
          amountMmk: 160_000,
          dueDate: addDaysIso(asOf, 9),
          category: 'stock',
          recurrence: 'once',
          notes: 'Opening stock. Due after the first week.',
        },
        asOf,
      ),
    ],
    scenarios: assumptions({
      revenueGrowthRatePercent: 10,
      expenseGrowthRatePercent: 6,
      inflationRatePercent: 5,
      customerCollectionRatePercent: 100,
      emergencyCashReserveTargetMmk: 500_000,
    }),
  }
}

function buildOnline(asOf: string): AppStore {
  const id: DemoBusinessId = 'online'
  const startingCashBalanceMmk = 580_000
  const checkIns = buildCheckIns(id, asOf, 7, startingCashBalanceMmk, (date, index, dow) => {
    const busy = weekendLift(dow, 1, 1.2)
    const draft = emptyDay()
    draft.cashSalesMmk = vary(Math.round(82_000 * busy), `${date}-sales`)
    draft.creditSalesMmk = index === 4 ? 40_000 : 0
    draft.customerDebtCollectedMmk = index === 2 ? 25_000 : 0
    draft.operatingExpensesMmk = vary(18_000, `${date}-opex`, 0.12)
    draft.inventoryPurchasesMmk = index % 2 === 0 ? vary(32_000, `${date}-stock`) : 0
    draft.supplierPaymentsMmk = index === 5 ? 20_000 : 0
    draft.otherCashPaidMmk = index === 1 ? 8_000 : 0
    if (index === 3) {
      draft.operatingExpensesMmk = 0
      draft.expenseBreakdowns = [
        line(id, date, 'delivery', 12_000, 'grab'),
        line(id, date, 'marketing', 15_000, 'boost'),
      ]
    }
    draft.notes =
      index === 6
        ? 'Waiting on a bulk Facebook buyer. New cosmetic stock arrives this week.'
        : ''
    return draft
  })

  const cash = checkIns.at(-1)?.closingCashMmk ?? startingCashBalanceMmk
  const stockBillMmk = mmk(cash + 850_000)

  return {
    profile: profile(id, asOf, {
      businessName: 'Hnin Hnin Online Shop',
      businessType: 'shop',
      startingCashBalanceMmk,
      averageMonthlySalesMmk: 2_600_000,
      employeeCount: 1,
      mainExpenseCategories: ['stock', 'fuel', 'other'],
      preferredLanguage: 'en',
    }),
    checkIns,
    scheduledItems: [
      scheduled(id, 'boost', {
        name: 'Facebook page boost',
        kind: 'outflow',
        amountMmk: 25_000,
        dueDate: addDaysIso(asOf, 10),
        recurrence: 'weekly',
        notes: 'Small ads. After the stock bill.',
      }),
    ],
    receivables: [
      receivable(
        id,
        'bulk',
        {
          customerName: 'Ko Min (Mandalay reseller)',
          amountMmk: mmk(stockBillMmk + 150_000),
          expectedPaymentDate: addDaysIso(asOf, 12),
          amountPaidMmk: 0,
          notes: 'Bulk order. Pays after the Yangon stock bill is due.',
        },
        asOf,
      ),
    ],
    payables: [
      payable(
        id,
        'stock',
        {
          supplierName: 'Mingalar wholesale cosmetics',
          amountMmk: stockBillMmk,
          dueDate: addDaysIso(asOf, 1),
          category: 'stock',
          recurrence: 'once',
          notes: 'Restock due before the reseller pays.',
        },
        asOf,
      ),
    ],
    scenarios: assumptions({
      collectionDelayDays: 3,
      customerCollectionRatePercent: 85,
      revenueGrowthRatePercent: 14,
      expenseGrowthRatePercent: 8,
      inflationRatePercent: 6,
      emergencyCashReserveTargetMmk: 300_000,
    }),
  }
}

function buildMinimart(asOf: string): AppStore {
  const id: DemoBusinessId = 'minimart'
  const startingCashBalanceMmk = 1_850_000
  const checkIns = buildCheckIns(id, asOf, 30, startingCashBalanceMmk, (date, index, dow) => {
    const busy = weekendLift(dow, 1, 1.18)
    const draft = emptyDay()
    draft.cashSalesMmk = vary(Math.round(320_000 * busy), `${date}-sales`)
    draft.creditSalesMmk = dow === 1 ? 20_000 : 0
    draft.customerDebtCollectedMmk = index % 9 === 4 ? 35_000 : 0
    draft.inventoryPurchasesMmk = vary(210_000, `${date}-stock`, 0.2)
    draft.supplierPaymentsMmk = index % 6 === 2 ? vary(55_000, `${date}-pay`) : 0
    if (index % 7 === 3) {
      draft.operatingExpensesMmk = 0
      draft.expenseBreakdowns = [
        line(id, date, 'electricity', 18_000, 'meter'),
        line(id, date, 'transport', 12_000, 'pick'),
        line(id, date, 'other', 15_000, 'bags'),
      ]
    } else {
      draft.operatingExpensesMmk = vary(42_000, `${date}-opex`, 0.1)
    }
    if (index === 29) {
      draft.notes = 'Rice and oil restock from Bayintnaung. Cash sales are fine; stock still eats cash.'
    }
    return draft
  })

  return {
    profile: profile(id, asOf, {
      businessName: 'Ko Aung Mini Mart',
      businessType: 'shop',
      startingCashBalanceMmk,
      averageMonthlySalesMmk: 9_600_000,
      employeeCount: 3,
      mainExpenseCategories: ['rent', 'wages', 'stock', 'utilities'],
      preferredLanguage: 'en',
    }),
    checkIns,
    scheduledItems: [
      scheduled(id, 'rent', {
        name: 'Shop rent',
        kind: 'outflow',
        amountMmk: 800_000,
        dueDate: addDaysIso(asOf, 16),
        recurrence: 'monthly',
        notes: 'Street-corner shop, North Dagon.',
      }),
    ],
    receivables: [
      receivable(
        id,
        'restaurant',
        {
          customerName: 'Daw Hla tea shop',
          amountMmk: 180_000,
          expectedPaymentDate: addDaysIso(asOf, 4),
          amountPaidMmk: 40_000,
          notes: 'Monthly account for oil and sugar.',
        },
        asOf,
      ),
    ],
    payables: [
      payable(
        id,
        'rice',
        {
          supplierName: 'Bayintnaung rice depot',
          amountMmk: 1_450_000,
          dueDate: addDaysIso(asOf, 9),
          category: 'stock',
          recurrence: 'once',
          notes: 'Rice, oil and onion. Large stock sitting in the shop.',
        },
        asOf,
      ),
      payable(
        id,
        'snacks',
        {
          supplierName: 'ABC snack wholesale',
          amountMmk: 620_000,
          dueDate: addDaysIso(asOf, 11),
          category: 'stock',
          recurrence: 'once',
          notes: 'Festival snack boxes still on the shelf.',
        },
        asOf,
      ),
      payable(
        id,
        'wages',
        {
          supplierName: 'Weekly shop wages',
          amountMmk: 180_000,
          dueDate: addDaysIso(asOf, 3),
          category: 'wages',
          recurrence: 'weekly',
          notes: '3 staff. Recurring.',
        },
        asOf,
      ),
      payable(
        id,
        'power',
        {
          supplierName: 'City electricity',
          amountMmk: 95_000,
          dueDate: addDaysIso(asOf, 14),
          category: 'utilities',
          recurrence: 'monthly',
          notes: 'Meter bill.',
        },
        asOf,
      ),
    ],
    scenarios: assumptions({
      extraStockPurchaseMmk: 0,
      customerCollectionRatePercent: 95,
      revenueGrowthRatePercent: 6,
      expenseGrowthRatePercent: 6,
      inflationRatePercent: 6,
      emergencyCashReserveTargetMmk: 800_000,
    }),
  }
}

function buildBakery(asOf: string): AppStore {
  const id: DemoBusinessId = 'bakery'
  const startingCashBalanceMmk = 1_650_000
  const checkIns = buildCheckIns(id, asOf, 180, startingCashBalanceMmk, (date, index, dow) => {
    const busy = weekendLift(dow, 1, 1.22)
    const month = Number(date.slice(5, 7))
    const festival = month === 4 || month === 10 ? 1.25 : 1
    const draft = emptyDay()
    draft.cashSalesMmk = vary(Math.round(210_000 * busy * festival), `${date}-sales`)
    draft.creditSalesMmk = dow === 1 || dow === 4 ? vary(55_000, `${date}-credit`) : 0
    draft.customerDebtCollectedMmk = index % 8 === 2 ? vary(40_000, `${date}-collect`) : 0
    draft.inventoryPurchasesMmk = dow === 1 || dow === 4 ? vary(85_000, `${date}-flour`) : vary(28_000, `${date}-stock`)
    draft.supplierPaymentsMmk = index % 14 === 6 ? vary(70_000, `${date}-pay`) : 0
    if (index % 10 === 1) {
      draft.operatingExpensesMmk = 0
      draft.expenseBreakdowns = [
        line(id, date, 'electricity', 22_000, 'oven'),
        line(id, date, 'salary', 18_000, 'helper'),
        line(id, date, 'transport', 8_000, 'delivery'),
      ]
    } else {
      draft.operatingExpensesMmk = vary(48_000, `${date}-opex`, 0.12)
    }
    if (index === 179) {
      draft.notes = 'Hotels and tea shops still owe for bread. Cash sales cover the oven, not the overdue tabs.'
    }
    return draft
  })

  return {
    profile: profile(id, asOf, {
      businessName: 'Daw Khin Bakery',
      businessType: 'workshop',
      startingCashBalanceMmk,
      averageMonthlySalesMmk: 7_200_000,
      employeeCount: 4,
      mainExpenseCategories: ['rent', 'wages', 'stock', 'utilities', 'fuel'],
      preferredLanguage: 'en',
    }),
    checkIns,
    scheduledItems: [
      scheduled(id, 'gas', {
        name: 'Oven gas refill',
        kind: 'outflow',
        amountMmk: 85_000,
        dueDate: addDaysIso(asOf, 5),
        recurrence: 'weekly',
        notes: 'Weekly gas for the deck oven.',
      }),
    ],
    receivables: [
      receivable(
        id,
        'hotel',
        {
          customerName: 'Strand tea counter',
          amountMmk: 420_000,
          expectedPaymentDate: addDaysIso(asOf, -11),
          amountPaidMmk: 80_000,
          notes: 'Hotel bread order. Partial paid, rest overdue.',
        },
        asOf,
      ),
      receivable(
        id,
        'teashop',
        {
          customerName: 'Ko Myint tea shop',
          amountMmk: 185_000,
          expectedPaymentDate: addDaysIso(asOf, -4),
          amountPaidMmk: 0,
          notes: 'Daily bread. Expected last week.',
        },
        asOf,
      ),
      receivable(
        id,
        'office',
        {
          customerName: 'Yoma office pantry',
          amountMmk: 260_000,
          expectedPaymentDate: addDaysIso(asOf, -18),
          amountPaidMmk: 60_000,
          notes: 'Monthly snack box. Overdue.',
        },
        asOf,
      ),
      receivable(
        id,
        'pending',
        {
          customerName: 'Sanchaung café',
          amountMmk: 95_000,
          expectedPaymentDate: addDaysIso(asOf, 3),
          amountPaidMmk: 0,
          notes: 'This week’s cake order. Still pending.',
        },
        asOf,
      ),
    ],
    payables: [
      payable(
        id,
        'flour',
        {
          supplierName: 'Ayerwaddy flour mill',
          amountMmk: 320_000,
          dueDate: addDaysIso(asOf, 2),
          category: 'stock',
          recurrence: 'weekly',
          notes: 'Flour and sugar run.',
        },
        asOf,
      ),
      payable(
        id,
        'rent',
        {
          supplierName: 'Bakery shop rent',
          amountMmk: 550_000,
          dueDate: addDaysIso(asOf, 12),
          category: 'rent',
          recurrence: 'monthly',
          notes: 'Ground-floor shop, Sanchaung.',
        },
        asOf,
      ),
      payable(
        id,
        'wages',
        {
          supplierName: 'Monthly bakery wages',
          amountMmk: 980_000,
          dueDate: addDaysIso(asOf, 8),
          category: 'wages',
          recurrence: 'monthly',
          notes: '4 staff including the night baker.',
        },
        asOf,
      ),
    ],
    scenarios: assumptions({
      collectionDelayDays: 7,
      customerCollectionRatePercent: 70,
      revenueGrowthRatePercent: 8,
      expenseGrowthRatePercent: 7,
      inflationRatePercent: 6,
      emergencyCashReserveTargetMmk: 600_000,
    }),
  }
}

function monthBoost(date: string): number {
  const month = Number(date.slice(5, 7))
  if (month === 4) {
    return 1.35
  }
  if (month === 10) {
    return 1.28
  }
  if (month === 12) {
    return 1.3
  }
  return 1
}

function buildClothing(asOf: string): AppStore {
  const id: DemoBusinessId = 'clothing'
  const startingCashBalanceMmk = 4_200_000
  const checkIns = buildCheckIns(id, asOf, 365, startingCashBalanceMmk, (date, index, dow) => {
    const busy = weekendLift(dow, 1, 1.3) * monthBoost(date)
    const draft = emptyDay()
    draft.cashSalesMmk = vary(Math.round(195_000 * busy), `${date}-sales`, 0.2)
    draft.creditSalesMmk = dow === 2 ? vary(30_000, `${date}-credit`) : 0
    draft.customerDebtCollectedMmk = index % 11 === 5 ? vary(45_000, `${date}-collect`) : 0
    draft.inventoryPurchasesMmk =
      index % 12 === 0 ? vary(280_000, `${date}-new`) : vary(55_000, `${date}-stock`, 0.25)
    draft.supplierPaymentsMmk = index % 15 === 7 ? vary(90_000, `${date}-pay`) : 0
    if (index % 14 === 4) {
      draft.operatingExpensesMmk = 0
      draft.expenseBreakdowns = [
        line(id, date, 'marketing', 20_000, 'fb'),
        line(id, date, 'electricity', 16_000, 'ac'),
        line(id, date, 'other', 12_000, 'bags'),
      ]
    } else {
      draft.operatingExpensesMmk = vary(52_000, `${date}-opex`, 0.14)
    }
    if (index === 364) {
      draft.notes = 'Thingyan and Thadingyut were strong. Planning a second rack next year.'
    }
    return draft
  })

  return {
    profile: profile(id, asOf, {
      businessName: 'Thiri Fashion',
      businessType: 'shop',
      startingCashBalanceMmk,
      averageMonthlySalesMmk: 6_800_000,
      employeeCount: 5,
      mainExpenseCategories: ['rent', 'wages', 'stock', 'utilities'],
      preferredLanguage: 'en',
    }),
    checkIns,
    scheduledItems: [
      scheduled(id, 'rent', {
        name: 'Bogyoke market stall rent',
        kind: 'outflow',
        amountMmk: 650_000,
        dueDate: addDaysIso(asOf, 7),
        recurrence: 'monthly',
        notes: 'Covered stall, Bogyoke Aung San Market.',
      }),
    ],
    receivables: [
      receivable(
        id,
        'bridal',
        {
          customerName: 'Ma Ei (bridal order)',
          amountMmk: 380_000,
          expectedPaymentDate: addDaysIso(asOf, 5),
          amountPaidMmk: 100_000,
          notes: 'Deposit taken. Balance due before the ceremony.',
        },
        asOf,
      ),
      receivable(
        id,
        'office',
        {
          customerName: 'KBZ staff uniforms',
          amountMmk: 720_000,
          expectedPaymentDate: addDaysIso(asOf, 14),
          amountPaidMmk: 0,
          notes: 'Office uniform batch.',
        },
        asOf,
      ),
    ],
    payables: [
      payable(
        id,
        'fabric',
        {
          supplierName: 'Theingyi fabric house',
          amountMmk: 540_000,
          dueDate: addDaysIso(asOf, 6),
          category: 'stock',
          recurrence: 'once',
          notes: 'Monsoon fabric lot.',
        },
        asOf,
      ),
      payable(
        id,
        'wages',
        {
          supplierName: 'Monthly shop wages',
          amountMmk: 1_150_000,
          dueDate: addDaysIso(asOf, 9),
          category: 'wages',
          recurrence: 'monthly',
          notes: '5 staff including the tailor.',
        },
        asOf,
      ),
      payable(
        id,
        'power',
        {
          supplierName: 'City electricity',
          amountMmk: 110_000,
          dueDate: addDaysIso(asOf, 13),
          category: 'utilities',
          recurrence: 'monthly',
          notes: 'Air-con and lights.',
        },
        asOf,
      ),
    ],
    scenarios: assumptions({
      revenueGrowthRatePercent: 12,
      expenseGrowthRatePercent: 7,
      inflationRatePercent: 5,
      customerCollectionRatePercent: 90,
      newBranchExpansionCostMmk: 0,
      emergencyCashReserveTargetMmk: 1_200_000,
      hireEmployeeMonthlyWageMmk: 0,
    }),
  }
}

function buildWholesale(asOf: string): AppStore {
  const id: DemoBusinessId = 'wholesale'
  const startingCashBalanceMmk = 18_500_000
  const checkIns = buildCheckIns(id, asOf, 1095, startingCashBalanceMmk, (date, index, dow) => {
    const yearLift = 1 + Math.floor(index / 365) * 0.07
    const weekday = dow === 0 ? 0.55 : dow === 6 ? 0.75 : 1
    const draft = emptyDay()
    draft.cashSalesMmk = vary(Math.round(1_150_000 * weekday * yearLift), `${date}-sales`, 0.14)
    draft.creditSalesMmk = dow === 2 || dow === 4 ? vary(Math.round(320_000 * yearLift), `${date}-credit`) : 0
    draft.customerDebtCollectedMmk =
      index % 6 === 3 ? vary(Math.round(280_000 * yearLift), `${date}-collect`) : 0
    draft.inventoryPurchasesMmk =
      dow === 1 || dow === 3 ? vary(Math.round(620_000 * yearLift), `${date}-in`) : vary(Math.round(180_000 * yearLift), `${date}-stock`)
    draft.supplierPaymentsMmk = index % 10 === 4 ? vary(Math.round(400_000 * yearLift), `${date}-pay`) : 0
    if (index % 21 === 8) {
      draft.operatingExpensesMmk = 0
      draft.expenseBreakdowns = [
        line(id, date, 'transport', 45_000, 'truck'),
        line(id, date, 'electricity', 28_000, 'godown'),
        line(id, date, 'salary', 35_000, 'loader'),
      ]
    } else {
      draft.operatingExpensesMmk = vary(Math.round(95_000 * yearLift), `${date}-opex`, 0.1)
    }
    if (index === 1094) {
      draft.notes = 'Three years of Bayintnaung books. Use 10-year and 30-year views as planning stories only.'
    }
    return draft
  })

  return {
    profile: profile(id, asOf, {
      businessName: 'Shwe Myanmar Wholesale',
      businessType: 'trading',
      startingCashBalanceMmk,
      averageMonthlySalesMmk: 38_000_000,
      employeeCount: 12,
      mainExpenseCategories: ['rent', 'wages', 'stock', 'fuel', 'utilities'],
      preferredLanguage: 'en',
    }),
    checkIns,
    scheduledItems: [
      scheduled(id, 'rent', {
        name: 'Godown rent',
        kind: 'outflow',
        amountMmk: 2_400_000,
        dueDate: addDaysIso(asOf, 10),
        recurrence: 'monthly',
        notes: 'Bayintnaung warehouse.',
      }),
    ],
    receivables: [
      receivable(
        id,
        'chain',
        {
          customerName: 'City Mart dry goods',
          amountMmk: 4_800_000,
          expectedPaymentDate: addDaysIso(asOf, 8),
          amountPaidMmk: 1_200_000,
          notes: 'Monthly dry-goods account. Partial paid.',
        },
        asOf,
      ),
      receivable(
        id,
        'shop',
        {
          customerName: 'Ko Zaw Mini Mart (Hlaing)',
          amountMmk: 860_000,
          expectedPaymentDate: addDaysIso(asOf, 2),
          amountPaidMmk: 0,
          notes: 'Rice and oil pallet.',
        },
        asOf,
      ),
    ],
    payables: [
      payable(
        id,
        'import',
        {
          supplierName: 'Thanlyin rice mill',
          amountMmk: 3_600_000,
          dueDate: addDaysIso(asOf, 5),
          category: 'stock',
          recurrence: 'once',
          notes: 'Container lot. Once.',
        },
        asOf,
      ),
      payable(
        id,
        'truck',
        {
          supplierName: 'Weekly truck hire',
          amountMmk: 280_000,
          dueDate: addDaysIso(asOf, 3),
          category: 'fuel',
          recurrence: 'weekly',
          notes: 'Bayintnaung to downtown run.',
        },
        asOf,
      ),
      payable(
        id,
        'wages',
        {
          supplierName: 'Monthly warehouse wages',
          amountMmk: 4_200_000,
          dueDate: addDaysIso(asOf, 11),
          category: 'wages',
          recurrence: 'monthly',
          notes: '12 staff.',
        },
        asOf,
      ),
    ],
    scenarios: assumptions({
      revenueGrowthRatePercent: 10,
      expenseGrowthRatePercent: 8,
      inflationRatePercent: 7,
      customerCollectionRatePercent: 80,
      plannedInvestmentMmk: 8_000_000,
      plannedLoanMmk: 0,
      newBranchExpansionCostMmk: 0,
      emergencyCashReserveTargetMmk: 12_000_000,
      supplierPostponeDays: 0,
      hireEmployeeMonthlyWageMmk: 0,
    }),
  }
}

const BUILDERS: Record<DemoBusinessId, (asOf: string) => AppStore> = {
  cafe: buildCafe,
  online: buildOnline,
  minimart: buildMinimart,
  bakery: buildBakery,
  clothing: buildClothing,
  wholesale: buildWholesale,
}

export function buildDemoStore(id: DemoBusinessId, asOf = todayIsoDate()): AppStore {
  return BUILDERS[id](asOf)
}

export function listDemoStores(asOf = todayIsoDate()): Record<DemoBusinessId, AppStore> {
  return {
    cafe: buildCafe(asOf),
    online: buildOnline(asOf),
    minimart: buildMinimart(asOf),
    bakery: buildBakery(asOf),
    clothing: buildClothing(asOf),
    wholesale: buildWholesale(asOf),
  }
}

export { DEMO_BUSINESSES }
