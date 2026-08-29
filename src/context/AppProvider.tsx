import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createId } from '../lib/ids'
import {
  calculateClosingCashMmk,
  getOpeningCashMmk,
  rechainCheckIns,
  resolveOperatingExpensesMmk,
} from '../lib/checkIn'
import { todayIsoDate } from '../lib/dates'
import { shouldUseSupabase } from '../lib/authAccess'
import { isUuid } from '../lib/uuid'
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
import {
  ensureAnonymousDemoState,
  isOwnerDemoStore,
  OWNER_DEMO_BUSINESS_ID,
  OWNER_DEMO_BUSINESS_NAME,
} from '../storage/ownerDemo'
import { hasCachedSupabaseSession } from '../lib/supabase'
import { clearDemoBannerDismissed } from '../lib/uiStorage'
import type { AppStore } from '../storage/types'
import { EMPTY_SCENARIOS, emptyStore } from '../storage/types'
import { draftsFromStore, saveUserDrafts } from '../storage/userDrafts'
import {
  getSupabaseRepository,
  loadAuthenticatedStore,
  repositoryErrorMessage,
} from '../services/supabaseRepository'
import type {
  Payable,
  Receivable,
  ScenarioAssumptions,
  ScheduledCashItem,
} from '../types/models'
import { CURRENCY } from '../types/models'
import { AppContext } from './appContext'

const storage = createStorageAdapter()

function nextId(prefix: string, remote: boolean): string {
  return remote ? crypto.randomUUID() : createId(prefix)
}

function loadOrBuildOwnerDemo(): AppStore {
  const stored = storage.load()
  if (isOwnerDemoStore(stored.profile?.businessName) && stored.profile) {
    if (stored.profile.businessName !== OWNER_DEMO_BUSINESS_NAME) {
      const renamed = {
        ...stored,
        profile: { ...stored.profile, businessName: OWNER_DEMO_BUSINESS_NAME },
      }
      storage.save(renamed)
      return renamed
    }
    return stored
  }
  const next = buildDemoStore(OWNER_DEMO_BUSINESS_ID)
  storage.save(next)
  return next
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [demoState, setDemoState] = useState(() =>
    hasCachedSupabaseSession() ? loadDemoModeState() : ensureAnonymousDemoState(),
  )
  const [store, setStore] = useState<AppStore>(() =>
    hasCachedSupabaseSession() ? emptyStore() : loadOrBuildOwnerDemo(),
  )
  const [isReady, setIsReady] = useState(() => !hasCachedSupabaseSession())
  const [loadError, setLoadError] = useState<string | null>(null)

  const isRemote = shouldUseSupabase({
    isAuthenticated: Boolean(user),
    isDemoMode: demoState.active,
  })
  const userId = user?.id ?? null

  const persistSideStore = useCallback(
    (next: AppStore) => {
      if (isRemote && userId) {
        saveUserDrafts(userId, draftsFromStore(next))
        return next
      }
      storage.save(next)
      return next
    },
    [isRemote, userId],
  )

  const hydrate = useCallback(async () => {
    setIsReady(false)
    setLoadError(null)
    try {
      if (demoState.active) {
        const stored = storage.load()
        if (isOwnerDemoStore(stored.profile?.businessName)) {
          setStore(stored)
          return
        }
        const next = buildDemoStore(OWNER_DEMO_BUSINESS_ID)
        storage.save(next)
        setStore(next)
        return
      }
      if (user) {
        setStore(await loadAuthenticatedStore(user.id))
        return
      }
      setStore(storage.load())
    } catch (error) {
      setLoadError(repositoryErrorMessage(error))
      setStore(emptyStore())
    } finally {
      setIsReady(true)
    }
  }, [demoState.active, user])

  useEffect(() => {
    if (authLoading && hasCachedSupabaseSession()) {
      setIsReady(false)
      return
    }
    if (!user && !demoState.active) {
      const next = ensureAnonymousDemoState()
      setDemoState(next)
      setStore(loadOrBuildOwnerDemo())
      setIsReady(true)
      return
    }
    void hydrate()
  }, [authLoading, hydrate, user, demoState.active])

  const retryLoad = useCallback(() => {
    void hydrate()
  }, [hydrate])

  const saveProfile = useCallback(
    (input: BusinessProfileInput) => {
      const remote = isRemote
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
              id: nextId('biz', remote),
              ...input,
              currency: CURRENCY,
              createdAt: now,
              updatedAt: now,
            }
        const next = persistSideStore({
          ...current,
          profile,
          checkIns: rechainCheckIns(current.checkIns, profile.startingCashBalanceMmk),
        })
        if (remote) {
          void (async () => {
            try {
              const repo = getSupabaseRepository()
              if (!isUuid(profile.id) || !current.profile) {
                const created = await repo.createBusiness({
                  ...(isUuid(profile.id) ? { id: profile.id } : {}),
                  name: input.businessName,
                  business_type: input.businessType,
                  starting_cash: input.startingCashBalanceMmk,
                  emergency_reserve: current.scenarios.emergencyCashReserveTargetMmk,
                  currency: CURRENCY,
                })
                await repo.updateProfileLanguage(input.preferredLanguage)
                setStore((cur) =>
                  persistSideStore({
                    ...cur,
                    profile: cur.profile
                      ? {
                          ...cur.profile,
                          id: created.id,
                          createdAt: created.created_at,
                          updatedAt: created.updated_at,
                        }
                      : cur.profile,
                    checkIns: rechainCheckIns(
                      cur.checkIns,
                      cur.profile?.startingCashBalanceMmk ?? created.starting_cash,
                    ),
                  }),
                )
              } else {
                await repo.updateBusiness(profile.id, {
                  name: input.businessName,
                  business_type: input.businessType,
                  starting_cash: input.startingCashBalanceMmk,
                  emergency_reserve: current.scenarios.emergencyCashReserveTargetMmk,
                  currency: CURRENCY,
                })
                await repo.updateProfileLanguage(input.preferredLanguage)
              }
              setLoadError(null)
            } catch (error) {
              setLoadError(repositoryErrorMessage(error))
            }
          })()
        }
        return next
      })
    },
    [isRemote, persistSideStore],
  )

  const saveCheckIn = useCallback(
    (input: DailyCheckInInput) => {
      const remote = isRemote
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
          id: existing?.id ?? nextId('checkin', remote),
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
        const next = persistSideStore({
          ...current,
          checkIns: rechainCheckIns([...withoutDate, record], starting),
        })
        if (remote && next.profile) {
          const businessId = next.profile.id
          void getSupabaseRepository()
            .saveDailyCheckin(record, businessId)
            .then((saved) => {
              setStore((cur) =>
                persistSideStore({
                  ...cur,
                  checkIns: rechainCheckIns(
                    cur.checkIns.map((item) =>
                      item.date === saved.date ? { ...item, ...saved } : item,
                    ),
                    cur.profile?.startingCashBalanceMmk ?? 0,
                  ),
                }),
              )
              setLoadError(null)
            })
            .catch((error: unknown) => {
              setLoadError(repositoryErrorMessage(error))
            })
        }
        return next
      })
    },
    [isRemote, persistSideStore],
  )

  const deleteCheckIn = useCallback(
    (id: string) => {
      const remote = isRemote
      setStore((current) => {
        const starting = current.profile?.startingCashBalanceMmk ?? 0
        const next = persistSideStore({
          ...current,
          checkIns: rechainCheckIns(
            current.checkIns.filter((item) => item.id !== id),
            starting,
          ),
        })
        if (remote && isUuid(id) && current.profile) {
          void getSupabaseRepository()
            .deleteDailyCheckin(id, current.profile.id)
            .catch((error: unknown) => {
              setLoadError(repositoryErrorMessage(error))
            })
        }
        return next
      })
    },
    [isRemote, persistSideStore],
  )

  const addScheduledItem = useCallback(
    (input: ScheduledItemInput) => {
      setStore((current) => {
        const item: ScheduledCashItem = { id: createId('sched'), ...input }
        return persistSideStore({
          ...current,
          scheduledItems: [...current.scheduledItems, item],
        })
      })
    },
    [persistSideStore],
  )

  const removeScheduledItem = useCallback(
    (id: string) => {
      setStore((current) =>
        persistSideStore({
          ...current,
          scheduledItems: current.scheduledItems.filter((item) => item.id !== id),
        }),
      )
    },
    [persistSideStore],
  )

  const addReceivable = useCallback(
    (input: ReceivableInput) => {
      const remote = isRemote
      setStore((current) => {
        const draft: Receivable = {
          id: nextId('recv', remote),
          ...input,
          status: 'pending',
        }
        const item: Receivable = {
          ...draft,
          status: deriveReceivableStatus(draft, todayIsoDate()),
        }
        const next = persistSideStore({
          ...current,
          receivables: [...current.receivables, item],
        })
        if (remote && next.profile) {
          const businessId = next.profile.id
          void getSupabaseRepository()
            .createReceivable(item, businessId)
            .then((saved) => {
              setStore((cur) =>
                persistSideStore({
                  ...cur,
                  receivables: cur.receivables.map((row) =>
                    row.id === item.id ? saved : row,
                  ),
                }),
              )
            })
            .catch((error: unknown) => {
              setLoadError(repositoryErrorMessage(error))
            })
        }
        return next
      })
    },
    [isRemote, persistSideStore],
  )

  const updateReceivable = useCallback(
    (item: Receivable) => {
      const remote = isRemote
      setStore((current) => {
        const next = persistSideStore({
          ...current,
          receivables: current.receivables.map((row) =>
            row.id === item.id ? item : row,
          ),
        })
        if (remote && next.profile && isUuid(item.id)) {
          void getSupabaseRepository()
            .updateReceivable(item, next.profile.id)
            .catch((error: unknown) => {
              setLoadError(repositoryErrorMessage(error))
            })
        }
        return next
      })
    },
    [isRemote, persistSideStore],
  )

  const removeReceivable = useCallback(
    (id: string) => {
      const remote = isRemote
      setStore((current) => {
        const next = persistSideStore({
          ...current,
          receivables: current.receivables.filter((item) => item.id !== id),
        })
        if (remote && isUuid(id) && current.profile) {
          void getSupabaseRepository()
            .deleteReceivable(id, current.profile.id)
            .catch((error: unknown) => {
              setLoadError(repositoryErrorMessage(error))
            })
        }
        return next
      })
    },
    [isRemote, persistSideStore],
  )

  const addPayable = useCallback(
    (input: PayableInput) => {
      const remote = isRemote
      setStore((current) => {
        const draft: Payable = {
          id: nextId('pay', remote),
          ...input,
          status: 'pending',
        }
        const item: Payable = {
          ...draft,
          status: derivePayableStatus(draft, todayIsoDate()),
        }
        const next = persistSideStore({
          ...current,
          payables: [...current.payables, item],
        })
        if (remote && next.profile) {
          void getSupabaseRepository()
            .createPayable(item, next.profile.id)
            .then((saved) => {
              setStore((cur) =>
                persistSideStore({
                  ...cur,
                  payables: cur.payables.map((row) =>
                    row.id === item.id ? { ...saved, recurrence: item.recurrence } : row,
                  ),
                }),
              )
            })
            .catch((error: unknown) => {
              setLoadError(repositoryErrorMessage(error))
            })
        }
        return next
      })
    },
    [isRemote, persistSideStore],
  )

  const updatePayable = useCallback(
    (item: Payable) => {
      const remote = isRemote
      setStore((current) => {
        const next = persistSideStore({
          ...current,
          payables: current.payables.map((row) => (row.id === item.id ? item : row)),
        })
        if (remote && next.profile && isUuid(item.id)) {
          void getSupabaseRepository()
            .updatePayable(item, next.profile.id)
            .catch((error: unknown) => {
              setLoadError(repositoryErrorMessage(error))
            })
        }
        return next
      })
    },
    [isRemote, persistSideStore],
  )

  const removePayable = useCallback(
    (id: string) => {
      const remote = isRemote
      setStore((current) => {
        const next = persistSideStore({
          ...current,
          payables: current.payables.filter((item) => item.id !== id),
        })
        if (remote && isUuid(id) && current.profile) {
          void getSupabaseRepository()
            .deletePayable(id, current.profile.id)
            .catch((error: unknown) => {
              setLoadError(repositoryErrorMessage(error))
            })
        }
        return next
      })
    },
    [isRemote, persistSideStore],
  )

  const saveScenarios = useCallback(
    (scenarios: ScenarioAssumptions) => {
      setStore((current) => persistSideStore({ ...current, scenarios }))
    },
    [persistSideStore],
  )

  const loadDemoBusiness = useCallback((_id?: DemoBusinessId) => {
    const id = OWNER_DEMO_BUSINESS_ID
    const nextState = { active: true, selectedId: id }
    saveDemoModeState(nextState)
    setDemoState(nextState)
    clearDemoBannerDismissed()
    const next = buildDemoStore(id)
    storage.save(next)
    setStore(next)
  }, [])

  const resetDemoData = useCallback(() => {
    const nextState = { active: true, selectedId: OWNER_DEMO_BUSINESS_ID }
    saveDemoModeState(nextState)
    setDemoState(nextState)
    clearDemoBannerDismissed()
    const next = buildDemoStore(OWNER_DEMO_BUSINESS_ID)
    storage.save(next)
    setStore(next)
  }, [])

  const loadSampleData = useCallback(() => {
    loadDemoBusiness(OWNER_DEMO_BUSINESS_ID)
  }, [loadDemoBusiness])

  const resetAllData = useCallback(() => {
    if (user) {
      clearDemoModeState()
      setDemoState({ active: false, selectedId: null })
      void loadAuthenticatedStore(user.id)
        .then((next) => {
          setStore(next)
          setLoadError(null)
        })
        .catch((error: unknown) => {
          setLoadError(repositoryErrorMessage(error))
        })
      return
    }
    const nextState = ensureAnonymousDemoState()
    setDemoState(nextState)
    clearDemoBannerDismissed()
    const next = buildDemoStore(OWNER_DEMO_BUSINESS_ID)
    storage.save(next)
    setStore(next)
  }, [user])

  const exitDemoMode = useCallback(() => {
    clearDemoModeState()
    setDemoState({ active: false, selectedId: null })
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
      exitDemoMode,
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
      exitDemoMode,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
