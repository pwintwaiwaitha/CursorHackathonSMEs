import type { DemoBusinessId } from '../storage/demoMode'
import { shouldUseSupabase } from './authAccess'

export const DEMO_BANK_STORAGE_PREFIX = 'sme-mate-ai:demo-bank:'
export const REAL_BANK_STORAGE_KEY = 'sme-mate-ai:bank:real'

export type BankIsolation = 'demo' | 'real'

export type BankDataSource =
  | { kind: 'demo'; isolation: 'demo'; demoBusinessId: DemoBusinessId }
  | { kind: 'supabase'; isolation: 'real'; ownerId: string; businessId: string }
  | { kind: 'unavailable'; isolation: null; reason: string }

export function demoBankStorageKey(demoBusinessId: DemoBusinessId): string {
  return `${DEMO_BANK_STORAGE_PREFIX}${demoBusinessId}`
}

export function resolveBankDataSource(options: {
  isDemoMode: boolean
  selectedDemoId: DemoBusinessId | null
  isAuthenticated: boolean
  ownerId: string | null
  businessId: string | null
}): BankDataSource {
  if (options.isDemoMode) {
    if (!options.selectedDemoId) {
      return { kind: 'unavailable', isolation: null, reason: 'Demo shop is not selected.' }
    }
    return {
      kind: 'demo',
      isolation: 'demo',
      demoBusinessId: options.selectedDemoId,
    }
  }
  if (
    shouldUseSupabase({
      isAuthenticated: options.isAuthenticated,
      isDemoMode: false,
    }) &&
    options.ownerId &&
    options.businessId
  ) {
    return {
      kind: 'supabase',
      isolation: 'real',
      ownerId: options.ownerId,
      businessId: options.businessId,
    }
  }
  return {
    kind: 'unavailable',
    isolation: null,
    reason: 'Sign in to save business-account actions, or load a demo shop.',
  }
}

export function assertBankIsolation(
  source: BankDataSource,
  snapshotIsolation: BankIsolation,
): void {
  if (source.kind === 'unavailable') {
    throw new Error('Bank data source is unavailable')
  }
  if (source.isolation !== snapshotIsolation) {
    throw new Error('Demo and real bank records must stay isolated')
  }
}

export function rejectMixedBankWrite(
  source: BankDataSource,
  intendedIsolation: BankIsolation,
): void {
  assertBankIsolation(source, intendedIsolation)
  if (source.kind === 'demo' && intendedIsolation === 'real') {
    throw new Error('Refusing to write demo bank data to a real owner record')
  }
  if (source.kind === 'supabase' && intendedIsolation === 'demo') {
    throw new Error('Refusing to write real bank data into the demo store')
  }
}

const FORBIDDEN_BANK_FIELDS = [
  'password',
  'pin',
  'otp',
  'username',
  'access_token',
  'refresh_token',
  'api_secret',
  'full_account',
  'account_number',
]

export function assertNoSensitiveBankFields(record: Record<string, unknown>): void {
  for (const key of Object.keys(record)) {
    const lower = key.toLowerCase()
    if (FORBIDDEN_BANK_FIELDS.some((item) => lower.includes(item))) {
      throw new Error('Bank records must not store passwords, PINs, OTPs, or full accounts')
    }
  }
}

export function maskAccountLast4(value: string): string {
  const digits = value.replace(/\D/g, '')
  return digits.slice(-4)
}

export function isSafeAccountMask(value: string | null | undefined): boolean {
  if (value == null || value === '') {
    return true
  }
  return /^[0-9]{1,4}$/.test(value)
}
