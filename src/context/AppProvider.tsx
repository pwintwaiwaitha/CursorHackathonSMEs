import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { createId } from '../lib/ids'
import type {
  BusinessProfileInput,
  DailyCheckInInput,
  PayableInput,
  ReceivableInput,
  ScheduledItemInput,
} from '../lib/validation'
import { createStorageAdapter } from '../storage'
import { buildSampleStore } from '../storage/sampleData'
import type { AppStore } from '../storage/types'
import { EMPTY_SCENARIOS } from '../storage/types'
import type {
  Payable,
  Receivable,
  ScenarioAssumptions,
  ScheduledCashItem,
} from '../types/models'
import { CURRENCY } from '../types/models'
import { AppContext } from './appContext'

const storage = createStorageAdapter()

function persist(next: AppStore): AppStore {
  storage.save(next)
  return next
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<AppStore>(() => storage.load())

  const saveProfile = useCallback((input: BusinessProfileInput) => {
    setStore((current) => {
      const now = new Date().toISOString()
      const profile = current.profile
        ? {
            ...current.profile,
            ...input,
            currency: CURRENCY,
            updatedAt: now,
          }
        : {
            id: createId('biz'),
            ...input,
            currency: CURRENCY,
            createdAt: now,
            updatedAt: now,
          }
      return persist({ ...current, profile })
    })
  }, [])

  const saveCheckIn = useCallback((input: DailyCheckInInput) => {
    setStore((current) => {
      const existing = current.checkIns.find((item) => item.date === input.date)
      const checkIn = existing
        ? { ...existing, ...input }
        : {
            id: createId('checkin'),
            ...input,
            createdAt: new Date().toISOString(),
          }
      const checkIns = existing
        ? current.checkIns.map((item) =>
            item.date === input.date ? checkIn : item,
          )
        : [...current.checkIns, checkIn].sort((a, b) => a.date.localeCompare(b.date))
      return persist({ ...current, checkIns })
    })
  }, [])

  const addScheduledItem = useCallback((input: ScheduledItemInput) => {
    setStore((current) => {
      const item: ScheduledCashItem = { id: createId('sched'), ...input }
      return persist({
        ...current,
        scheduledItems: [...current.scheduledItems, item],
      })
    })
  }, [])

  const removeScheduledItem = useCallback((id: string) => {
    setStore((current) =>
      persist({
        ...current,
        scheduledItems: current.scheduledItems.filter((item) => item.id !== id),
      }),
    )
  }, [])

  const addReceivable = useCallback((input: ReceivableInput) => {
    setStore((current) => {
      const item: Receivable = {
        id: createId('recv'),
        status: 'open',
        ...input,
      }
      return persist({
        ...current,
        receivables: [...current.receivables, item],
      })
    })
  }, [])

  const updateReceivable = useCallback((item: Receivable) => {
    setStore((current) =>
      persist({
        ...current,
        receivables: current.receivables.map((row) =>
          row.id === item.id ? item : row,
        ),
      }),
    )
  }, [])

  const removeReceivable = useCallback((id: string) => {
    setStore((current) =>
      persist({
        ...current,
        receivables: current.receivables.filter((item) => item.id !== id),
      }),
    )
  }, [])

  const addPayable = useCallback((input: PayableInput) => {
    setStore((current) => {
      const item: Payable = {
        id: createId('pay'),
        status: 'open',
        ...input,
      }
      return persist({
        ...current,
        payables: [...current.payables, item],
      })
    })
  }, [])

  const updatePayable = useCallback((item: Payable) => {
    setStore((current) =>
      persist({
        ...current,
        payables: current.payables.map((row) => (row.id === item.id ? item : row)),
      }),
    )
  }, [])

  const removePayable = useCallback((id: string) => {
    setStore((current) =>
      persist({
        ...current,
        payables: current.payables.filter((item) => item.id !== id),
      }),
    )
  }, [])

  const saveScenarios = useCallback((scenarios: ScenarioAssumptions) => {
    setStore((current) => persist({ ...current, scenarios }))
  }, [])

  const loadSampleData = useCallback(() => {
    setStore(persist(buildSampleStore()))
  }, [])

  const resetAllData = useCallback(() => {
    setStore(
      persist({
        profile: null,
        checkIns: [],
        scheduledItems: [],
        receivables: [],
        payables: [],
        scenarios: { ...EMPTY_SCENARIOS },
      }),
    )
  }, [])

  const value = useMemo(
    () => ({
      store,
      saveProfile,
      saveCheckIn,
      addScheduledItem,
      removeScheduledItem,
      addReceivable,
      updateReceivable,
      removeReceivable,
      addPayable,
      updatePayable,
      removePayable,
      saveScenarios,
      loadSampleData,
      resetAllData,
    }),
    [
      store,
      saveProfile,
      saveCheckIn,
      addScheduledItem,
      removeScheduledItem,
      addReceivable,
      updateReceivable,
      removeReceivable,
      addPayable,
      updatePayable,
      removePayable,
      saveScenarios,
      loadSampleData,
      resetAllData,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
