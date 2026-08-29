import type { DailyCashCheckIn, ExpenseBreakdownLine } from '../types/models'
import { emptyCheckInForm } from './checkInCopy'

export const UI_KEYS = {
  draftPrefix: 'sme-mate-ai:checkin-draft:',
  undo: 'sme-mate-ai:checkin-undo',
  lastSave: 'sme-mate-ai:last-save-at',
  expenseFreq: 'sme-mate-ai:expense-freq',
  notifPrefs: 'sme-mate-ai:notif-prefs',
  notifShown: 'sme-mate-ai:notif-shown',
  demoDismiss: 'sme-mate-ai:demo-banner-dismissed',
  hideAmounts: 'sme-mate-ai:hide-amounts',
  completedActions: 'sme-mate-ai:completed-actions',
  lastUpdatedDisplay: 'sme-mate-ai:last-updated-display',
} as const

export type CheckInDraft = ReturnType<typeof emptyCheckInForm>

export interface UndoSnapshot {
  date: string
  previous: DailyCashCheckIn | null
  expiresAt: number
}

export interface NotificationPrefs {
  reminderTime: string
  browserEnabled: boolean
}

export const DEFAULT_NOTIF_PREFS: NotificationPrefs = {
  reminderTime: '09:00',
  browserEnabled: false,
}

function canUseStorage(): boolean {
  return typeof localStorage !== 'undefined'
}

function readJson<T>(key: string): T | null {
  if (!canUseStorage()) {
    return null
  }
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      return null
    }
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  if (!canUseStorage()) {
    return
  }
  localStorage.setItem(key, JSON.stringify(value))
}

export function draftKey(date: string): string {
  return `${UI_KEYS.draftPrefix}${date}`
}

export function loadCheckInDraft(date: string): CheckInDraft | null {
  const raw = readJson<Partial<CheckInDraft>>(draftKey(date))
  if (!raw || raw.date !== date) {
    return null
  }
  return { ...emptyCheckInForm(date), ...raw, date }
}

export function saveCheckInDraft(date: string, draft: CheckInDraft): void {
  writeJson(draftKey(date), { ...draft, date })
}

export function clearCheckInDraft(date: string): void {
  if (!canUseStorage()) {
    return
  }
  localStorage.removeItem(draftKey(date))
}

export function loadUndoSnapshot(): UndoSnapshot | null {
  const snap = readJson<UndoSnapshot>(UI_KEYS.undo)
  if (!snap || snap.expiresAt < Date.now()) {
    return null
  }
  return snap
}

export function saveUndoSnapshot(snapshot: UndoSnapshot): void {
  writeJson(UI_KEYS.undo, snapshot)
}

export function clearUndoSnapshot(): void {
  if (!canUseStorage()) {
    return
  }
  localStorage.removeItem(UI_KEYS.undo)
}

export function loadLastSaveAt(): string | null {
  if (!canUseStorage()) {
    return null
  }
  return localStorage.getItem(UI_KEYS.lastSave)
}

export function markLastSave(iso = new Date().toISOString()): string {
  if (canUseStorage()) {
    localStorage.setItem(UI_KEYS.lastSave, iso)
  }
  return iso
}

export function loadExpenseFrequency(): Record<string, number> {
  return readJson<Record<string, number>>(UI_KEYS.expenseFreq) ?? {}
}

export function rememberExpenseCategories(lines: ExpenseBreakdownLine[]): void {
  const freq = loadExpenseFrequency()
  for (const line of lines) {
    if (line.amountMmk > 0) {
      freq[line.category] = (freq[line.category] ?? 0) + 1
    }
  }
  writeJson(UI_KEYS.expenseFreq, freq)
}

export function loadNotificationPrefs(): NotificationPrefs {
  const raw = readJson<Partial<NotificationPrefs>>(UI_KEYS.notifPrefs)
  return {
    reminderTime: raw?.reminderTime ?? DEFAULT_NOTIF_PREFS.reminderTime,
    browserEnabled: Boolean(raw?.browserEnabled),
  }
}

export function saveNotificationPrefs(prefs: NotificationPrefs): void {
  writeJson(UI_KEYS.notifPrefs, prefs)
}

export function loadShownNotifications(): Record<string, string> {
  return readJson<Record<string, string>>(UI_KEYS.notifShown) ?? {}
}

export function markNotificationShown(type: string, today: string): void {
  const shown = loadShownNotifications()
  shown[type] = today
  writeJson(UI_KEYS.notifShown, shown)
}

export function wasNotificationShownToday(type: string, today: string): boolean {
  return loadShownNotifications()[type] === today
}

export function isDemoBannerDismissed(): boolean {
  if (!canUseStorage()) {
    return false
  }
  return localStorage.getItem(UI_KEYS.demoDismiss) === '1'
}

export function dismissDemoBanner(): void {
  if (!canUseStorage()) {
    return
  }
  localStorage.setItem(UI_KEYS.demoDismiss, '1')
}

export function clearDemoBannerDismissed(): void {
  if (!canUseStorage()) {
    return
  }
  localStorage.removeItem(UI_KEYS.demoDismiss)
}

export function loadHideAmounts(): boolean {
  if (!canUseStorage()) {
    return false
  }
  return localStorage.getItem(UI_KEYS.hideAmounts) === '1'
}

export function saveHideAmounts(hide: boolean): void {
  if (!canUseStorage()) {
    return
  }
  localStorage.setItem(UI_KEYS.hideAmounts, hide ? '1' : '0')
}

export function loadCompletedActionIds(today: string): string[] {
  const raw = readJson<{ date: string; ids: string[] }>(UI_KEYS.completedActions)
  if (!raw || raw.date !== today || !Array.isArray(raw.ids)) {
    return []
  }
  return raw.ids.filter((id) => typeof id === 'string')
}

export function markActionCompleted(today: string, id: string): string[] {
  const ids = [...new Set([...loadCompletedActionIds(today), id])]
  writeJson(UI_KEYS.completedActions, { date: today, ids })
  return ids
}

export function loadLastUpdatedDisplay(): string | null {
  if (!canUseStorage()) {
    return null
  }
  return localStorage.getItem(UI_KEYS.lastUpdatedDisplay)
}

export function saveLastUpdatedDisplay(iso: string): void {
  if (!canUseStorage()) {
    return
  }
  localStorage.setItem(UI_KEYS.lastUpdatedDisplay, iso)
}
