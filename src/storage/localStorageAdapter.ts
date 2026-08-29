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

  return {
    profile: (value.profile as AppStore['profile']) ?? null,
    checkIns: Array.isArray(value.checkIns) ? value.checkIns : [],
    scheduledItems: Array.isArray(value.scheduledItems)
      ? value.scheduledItems
      : [],
    receivables: Array.isArray(value.receivables) ? value.receivables : [],
    payables: Array.isArray(value.payables) ? value.payables : [],
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
