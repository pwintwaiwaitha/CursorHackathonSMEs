import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { createId } from '../lib/ids'
import {
  calculateClosingCashMmk,
  getOpeningCashMmk,
  rechainCheckIns,
  resolveOperatingExpensesMmk,
} from '../lib/checkIn'
import { todayIsoDate } from '../lib/dates'
import { derivePayableStatus, deriveReceivableStatus } from '../lib/schedule'
import type {
  BusinessProfileInput,
  DailyCheckInInput,
  PayableInput,
  ReceivableInput,
  ScheduledItemInput,
} from '../lib/validation'
import { createStorageAdapter } from '../storage'
import { buildDemoStore } from '../storage/demoBusinesses'
import {
  clearDemoModeState,
  loadDemoModeState,
  saveDemoModeState,
  type DemoBusinessId,
} from '../storage/demoMode'
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
  const [demoState, setDemoState] = useState(loadDemoModeState)
  const [isReady, setIsReady] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const retryLoad = useCallback(() => {
    setIsReady(false)
    try {
      setStore(storage.load())
      setLoadError(null)
    } catch {
      setLoadError('Could not read saved shop data in this browser.')
    } finally {
      setIsReady(true)
    }
  }, [])

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
      return persist({
        ...current,
        profile,
        checkIns: rechainCheckIns(current.checkIns, profile.startingCashBalanceMmk),
      })
    })
  }, [])

  const saveCheckIn = useCallback((input: DailyCheckInInput) => {
    setStore((current) => {
      const starting = current.profile?.startingCashBalanceMmk ?? 0
      const existing = current.checkIns.find((item) => item.date === input.date)
      const withoutDate = current.checkIns.filter((item) => item.date !== input.date)
      const openingCashMmk = getOpeningCashMmk(withoutDate, input.date, starting)
      const operatingExpensesMmk = resolveOperatingExpensesMmk(
        input.operatingExpensesMmk,
        input.expenseBreakdowns,
      )
      const now = new Date().toISOString()
      const record = {
        id: existing?.id ?? createId('checkin'),
        ...input,
        openingCashMmk,
        operatingExpensesMmk,
        closingCashMmk: calculateClosingCashMmk({
          openingCashMmk,
          cashSalesMmk: input.cashSalesMmk,
          customerDebtCollectedMmk: input.customerDebtCollectedMmk,
          creditSalesMmk: input.creditSalesMmk,
          operatingExpensesMmk,
          inventoryPurchasesMmk: input.inventoryPurchasesMmk,
          supplierPaymentsMmk: input.supplierPaymentsMmk,
          otherCashReceivedMmk: input.otherCashReceivedMmk,
          otherCashPaidMmk: input.otherCashPaidMmk,
        }),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      return persist({
        ...current,
        checkIns: rechainCheckIns([...withoutDate, record], starting),
      })
    })
  }, [])

  const deleteCheckIn = useCallback((id: string) => {
    setStore((current) => {
      const starting = current.profile?.startingCashBalanceMmk ?? 0
      return persist({
        ...current,
        checkIns: rechainCheckIns(
          current.checkIns.filter((item) => item.id !== id),
          starting,
        ),
      })
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
      const draft: Receivable = {
        id: createId('recv'),
        ...input,
        status: 'pending',
      }
      const item: Receivable = {
        ...draft,
        status: deriveReceivableStatus(draft, todayIsoDate()),
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
      const draft: Payable = {
        id: createId('pay'),
        ...input,
        status: 'pending',
      }
      const item: Payable = {
        ...draft,
        status: derivePayableStatus(draft, todayIsoDate()),
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

  const loadDemoBusiness = useCallback((id: DemoBusinessId) => {
    const nextState = { active: true, selectedId: id }
    saveDemoModeState(nextState)
    setDemoState(nextState)
    setStore(persist(buildDemoStore(id)))
  }, [])

  const resetDemoData = useCallback(() => {
    const current = loadDemoModeState()
    const id = current.selectedId ?? demoState.selectedId ?? 'minimart'
    const nextState = { active: true, selectedId: id }
    saveDemoModeState(nextState)
    setDemoState(nextState)
    setStore(persist(buildDemoStore(id)))
  }, [demoState.selectedId])

  const loadSampleData = useCallback(() => {
    loadDemoBusiness('minimart')
  }, [loadDemoBusiness])

  const resetAllData = useCallback(() => {
    clearDemoModeState()
    setDemoState({ active: false, selectedId: null })
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
      isReady,
      loadError,
      retryLoad,
      saveProfile,
      saveCheckIn,
      deleteCheckIn,
      addScheduledItem,
      removeScheduledItem,
      addReceivable,
      updateReceivable,
      removeReceivable,
      addPayable,
      updatePayable,
      removePayable,
      saveScenarios,
      isDemoMode: demoState.active,
      selectedDemoId: demoState.selectedId,
      loadDemoBusiness,
      resetDemoData,
      loadSampleData,
      resetAllData,
    }),
    [
      store,
      isReady,
      loadError,
      retryLoad,
      saveProfile,
      saveCheckIn,
      deleteCheckIn,
      addScheduledItem,
      removeScheduledItem,
      addReceivable,
      updateReceivable,
      removeReceivable,
      addPayable,
      updatePayable,
      removePayable,
      saveScenarios,
      demoState.active,
      demoState.selectedId,
      loadDemoBusiness,
      resetDemoData,
      loadSampleData,
      resetAllData,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
