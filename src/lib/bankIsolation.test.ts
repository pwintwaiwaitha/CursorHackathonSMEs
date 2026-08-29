import { describe, expect, it } from 'vitest'
import {
  DEMO_BANK_STORAGE_PREFIX,
  REAL_BANK_STORAGE_KEY,
  assertNoSensitiveBankFields,
  demoBankStorageKey,
  isSafeAccountMask,
  maskAccountLast4,
  rejectMixedBankWrite,
  resolveBankDataSource,
} from './bankIsolation'
import { shouldUseSupabase } from './authAccess'

describe('demo isolation', () => {
  it('keeps demo shops on a separate local key and never selects Supabase', () => {
    const source = resolveBankDataSource({
      isDemoMode: true,
      selectedDemoId: 'minimart',
      isAuthenticated: true,
      ownerId: 'owner-1',
      businessId: 'biz-1',
    })
    expect(source).toEqual({
      kind: 'demo',
      isolation: 'demo',
      demoBusinessId: 'minimart',
    })
    expect(demoBankStorageKey('minimart')).toBe(`${DEMO_BANK_STORAGE_PREFIX}minimart`)
    expect(demoBankStorageKey('minimart')).not.toBe(REAL_BANK_STORAGE_KEY)
    expect(
      shouldUseSupabase({ isAuthenticated: true, isDemoMode: true }),
    ).toBe(false)
  })

  it('routes signed-in non-demo owners to Supabase and refuses mixing', () => {
    const real = resolveBankDataSource({
      isDemoMode: false,
      selectedDemoId: null,
      isAuthenticated: true,
      ownerId: 'owner-1',
      businessId: 'biz-1',
    })
    expect(real.kind).toBe('supabase')
    expect(() => rejectMixedBankWrite(real, 'demo')).toThrow(/isolated|demo/i)
    const demo = resolveBankDataSource({
      isDemoMode: true,
      selectedDemoId: 'cafe',
      isAuthenticated: true,
      ownerId: 'owner-1',
      businessId: 'biz-1',
    })
    expect(() => rejectMixedBankWrite(demo, 'real')).toThrow(/isolated|real/i)
  })

  it('never stores passwords, PINs, OTPs, or full account numbers', () => {
    expect(() => assertNoSensitiveBankFields({ account_mask: '4418' })).not.toThrow()
    expect(() => assertNoSensitiveBankFields({ password: 'secret' })).toThrow(/must not store/i)
    expect(() => assertNoSensitiveBankFields({ pin: '1234' })).toThrow(/must not store/i)
    expect(() => assertNoSensitiveBankFields({ otp: '000000' })).toThrow(/must not store/i)
    expect(() => assertNoSensitiveBankFields({ full_account: '1234567890' })).toThrow(
      /must not store/i,
    )
    expect(maskAccountLast4('0012 3456 7890')).toBe('7890')
    expect(isSafeAccountMask('7890')).toBe(true)
    expect(isSafeAccountMask('1234567890')).toBe(false)
  })
})
