export type { AppStore, StorageAdapter } from './types'
export {
  EMPTY_SCENARIOS,
  STORAGE_KEY,
  emptyStore,
} from './types'
export { LocalStorageAdapter, createStorageAdapter } from './localStorageAdapter'
export { buildDemoStore, listDemoStores } from './demoBusinesses'
export {
  DEMO_BUSINESSES,
  DEMO_BUSINESS_IDS,
  DEMO_STORAGE_KEY,
  advertisedLevelsForDays,
  clearDemoModeState,
  getDemoBusinessMeta,
  isDemoBusinessId,
  loadDemoModeState,
  saveDemoModeState,
} from './demoMode'
export type { DemoBusinessId, DemoBusinessMeta, DemoModeState } from './demoMode'
