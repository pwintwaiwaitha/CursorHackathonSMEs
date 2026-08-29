import { createContext } from 'react'
import type {
  BusinessProfileInput,
  DailyCheckInInput,
  PayableInput,
  ReceivableInput,
  ScheduledItemInput,
} from '../lib/validation'
import type { AppStore } from '../storage/types'
import type {
  Payable,
  Receivable,
  ScenarioAssumptions,
} from '../types/models'

export interface AppContextValue {
  store: AppStore
  saveProfile: (input: BusinessProfileInput) => void
  saveCheckIn: (input: DailyCheckInInput) => void
  addScheduledItem: (input: ScheduledItemInput) => void
  removeScheduledItem: (id: string) => void
  addReceivable: (input: ReceivableInput) => void
  updateReceivable: (item: Receivable) => void
  removeReceivable: (id: string) => void
  addPayable: (input: PayableInput) => void
  updatePayable: (item: Payable) => void
  removePayable: (id: string) => void
  saveScenarios: (scenarios: ScenarioAssumptions) => void
  loadSampleData: () => void
  resetAllData: () => void
}

export const AppContext = createContext<AppContextValue | null>(null)
