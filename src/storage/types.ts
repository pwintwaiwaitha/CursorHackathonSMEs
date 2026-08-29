import type {
  BusinessProfile,
  DailyCashCheckIn,
  Payable,
  Receivable,
  ScenarioAssumptions,
  ScheduledCashItem,
} from '../types/models'

export interface AppStore {
  profile: BusinessProfile | null
  checkIns: DailyCashCheckIn[]
  scheduledItems: ScheduledCashItem[]
  receivables: Receivable[]
  payables: Payable[]
  scenarios: ScenarioAssumptions
}

export interface StorageAdapter {
  load(): AppStore
  save(store: AppStore): Promise<void> | void
}

export const STORAGE_KEY = 'sme-mate-ai:v1'

export const EMPTY_SCENARIOS: ScenarioAssumptions = {
  salesChangePercent: 0,
  expenseChangePercent: 0,
  collectionDelayDays: 0,
  extraStockPurchaseMmk: 0,
  extraLoanInflowMmk: 0,
  revenueGrowthRatePercent: 8,
  expenseGrowthRatePercent: 6,
  inflationRatePercent: 5,
  customerCollectionRatePercent: 100,
  plannedInvestmentMmk: 0,
  plannedLoanMmk: 0,
  newBranchExpansionCostMmk: 0,
  emergencyCashReserveTargetMmk: 0,
  supplierPostponeDays: 0,
  hireEmployeeMonthlyWageMmk: 0,
}

export function emptyStore(): AppStore {
  return {
    profile: null,
    checkIns: [],
    scheduledItems: [],
    receivables: [],
    payables: [],
    scenarios: { ...EMPTY_SCENARIOS },
  }
}
