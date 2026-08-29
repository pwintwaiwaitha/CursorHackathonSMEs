import { describe, expect, it } from 'vitest'
import {
  canAccessProtectedApp,
  isAuthRequiredPath,
  shouldUseSupabase,
} from './authAccess'

describe('auth routes', () => {
  it('marks dashboard, check-in, payments, and banking as auth-required', () => {
    expect(isAuthRequiredPath('/')).toBe(true)
    expect(isAuthRequiredPath('/dashboard')).toBe(true)
    expect(isAuthRequiredPath('/check-in')).toBe(true)
    expect(isAuthRequiredPath('/check-in/history')).toBe(true)
    expect(isAuthRequiredPath('/bills')).toBe(true)
    expect(isAuthRequiredPath('/payments')).toBe(true)
    expect(isAuthRequiredPath('/banking')).toBe(true)
  })

  it('leaves onboarding, login, forecast, and the partner demo public to the path helper', () => {
    expect(isAuthRequiredPath('/onboarding')).toBe(false)
    expect(isAuthRequiredPath('/login')).toBe(false)
    expect(isAuthRequiredPath('/signup')).toBe(false)
    expect(isAuthRequiredPath('/forecast')).toBe(false)
    expect(isAuthRequiredPath('/settings')).toBe(false)
    expect(isAuthRequiredPath('/bank-partner-demo')).toBe(false)
  })

  it('lets anonymous visitors use the app (local J Clothing demo)', () => {
    expect(
      canAccessProtectedApp({ isAuthenticated: false, isDemoMode: true }),
    ).toBe(true)
    expect(
      canAccessProtectedApp({ isAuthenticated: false, isDemoMode: false }),
    ).toBe(true)
    expect(
      canAccessProtectedApp({ isAuthenticated: true, isDemoMode: false }),
    ).toBe(true)
  })

  it('uses Supabase only for signed-in non-demo sessions', () => {
    expect(shouldUseSupabase({ isAuthenticated: true, isDemoMode: false })).toBe(
      true,
    )
    expect(shouldUseSupabase({ isAuthenticated: true, isDemoMode: true })).toBe(
      false,
    )
    expect(shouldUseSupabase({ isAuthenticated: false, isDemoMode: false })).toBe(
      false,
    )
  })
})
