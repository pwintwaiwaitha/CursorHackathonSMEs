import type { ExpenseCategory, PreferredLanguage, Recurrence } from '../types/models'
import type { AppStore } from './types'
import { EMPTY_SCENARIOS } from './types'

export interface ProfileExtras {
  averageMonthlySalesMmk: number
  employeeCount: number
  mainExpenseCategories: ExpenseCategory[]
  preferredLanguage: PreferredLanguage
}

export interface UserDrafts {
  profileExtras: ProfileExtras
  scheduledItems: AppStore['scheduledItems']
  scenarios: AppStore['scenarios']
  payableRecurrence: Record<string, Recurrence>
}

export const USER_DRAFTS_KEY_PREFIX = 'sme-mate-ai:user-drafts:'

export function userDraftsKey(userId: string): string {
  return `${USER_DRAFTS_KEY_PREFIX}${userId}`
}

const DEFAULT_EXTRAS: ProfileExtras = {
  averageMonthlySalesMmk: 0,
  employeeCount: 0,
  mainExpenseCategories: ['other'],
  preferredLanguage: 'en',
}

export function emptyUserDrafts(): UserDrafts {
  return {
    profileExtras: { ...DEFAULT_EXTRAS, mainExpenseCategories: [...DEFAULT_EXTRAS.mainExpenseCategories] },
    scheduledItems: [],
    scenarios: { ...EMPTY_SCENARIOS },
    payableRecurrence: {},
  }
}

function canUseLocalStorage(): boolean {
  return typeof localStorage !== 'undefined'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function extractProfileExtras(
  profile: AppStore['profile'],
): ProfileExtras {
  if (!profile) {
    return emptyUserDrafts().profileExtras
  }
  return {
    averageMonthlySalesMmk: profile.averageMonthlySalesMmk,
    employeeCount: profile.employeeCount,
    mainExpenseCategories: [...profile.mainExpenseCategories],
    preferredLanguage: profile.preferredLanguage,
  }
}

export function draftsFromStore(store: AppStore): UserDrafts {
  return {
    profileExtras: extractProfileExtras(store.profile),
    scheduledItems: store.scheduledItems,
    scenarios: { ...store.scenarios },
    payableRecurrence: Object.fromEntries(
      store.payables.map((item) => [item.id, item.recurrence]),
    ),
  }
}

export function loadUserDrafts(userId: string): UserDrafts {
  const fallback = emptyUserDrafts()
  if (!canUseLocalStorage()) {
    return fallback
  }
  try {
    const raw = localStorage.getItem(userDraftsKey(userId))
    if (!raw) {
      return fallback
    }
    const parsed = JSON.parse(raw) as Partial<UserDrafts>
    return {
      profileExtras: {
        ...fallback.profileExtras,
        ...(isRecord(parsed.profileExtras) ? parsed.profileExtras : {}),
      },
      scheduledItems: Array.isArray(parsed.scheduledItems)
        ? parsed.scheduledItems
        : [],
      scenarios: {
        ...fallback.scenarios,
        ...(isRecord(parsed.scenarios) ? parsed.scenarios : {}),
      },
      payableRecurrence: isRecord(parsed.payableRecurrence)
        ? (parsed.payableRecurrence as UserDrafts['payableRecurrence'])
        : {},
    }
  } catch {
    return fallback
  }
}

export function saveUserDrafts(userId: string, drafts: UserDrafts): void {
  if (!canUseLocalStorage()) {
    return
  }
  localStorage.setItem(userDraftsKey(userId), JSON.stringify(drafts))
}
