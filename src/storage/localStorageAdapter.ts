import { normalizeCheckIn, rechainCheckIns } from '../lib/checkIn'
import { normalizePayable, normalizeReceivable } from '../lib/schedule'
import type { AppStore, StorageAdapter } from './types'
import { emptyStore, STORAGE_KEY } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asStore(value: unknown): AppStore {
  const fallback = emptyStore()
  if (!isRecord(value)) {
    return fallback
  }

  const profile = (value.profile as AppStore['profile']) ?? null
  const checkIns = Array.isArray(value.checkIns)
    ? value.checkIns.flatMap((item) => {
        const normalized = normalizeCheckIn(item)
        return normalized ? [normalized] : []
      })
    : []

  return {
    profile,
    checkIns: rechainCheckIns(
      checkIns,
      profile?.startingCashBalanceMmk ?? 0,
    ),
    scheduledItems: Array.isArray(value.scheduledItems)
      ? value.scheduledItems
      : [],
    receivables: Array.isArray(value.receivables)
      ? value.receivables.flatMap((item) => {
          const normalized = normalizeReceivable(item)
          return normalized ? [normalized] : []
        })
      : [],
    payables: Array.isArray(value.payables)
      ? value.payables.flatMap((item) => {
          const normalized = normalizePayable(item)
          return normalized ? [normalized] : []
        })
      : [],
    scenarios: {
      ...fallback.scenarios,
      ...(isRecord(value.scenarios) ? value.scenarios : {}),
    },
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  load(): AppStore {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return emptyStore()
      }
      return asStore(JSON.parse(raw))
    } catch {
      return emptyStore()
    }
  }

  save(store: AppStore): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  }
}

/**
 * Swap this factory later for a Supabase adapter without changing pages.
 * Example later: `if (import.meta.env.VITE_SUPABASE_URL) return new SupabaseAdapter()`
 */
export function createStorageAdapter(): StorageAdapter {
  return new LocalStorageAdapter()
}
