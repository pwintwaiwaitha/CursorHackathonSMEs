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
export {
  APP_HEADER_COPY,
  OWNER_DEMO_BUSINESS_ID,
  OWNER_DEMO_BUSINESS_NAME,
  OWNER_DEMO_COPY,
  headerDisplayStrings,
  ownerVisibleShopNames,
} from './ownerDemo'
export type { DemoBusinessId, DemoBusinessMeta, DemoModeState } from './demoMode'
