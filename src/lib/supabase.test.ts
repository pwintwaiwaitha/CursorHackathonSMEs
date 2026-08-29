import { describe, expect, it } from 'vitest'
import { resolveSupabaseEnv } from './supabase'

describe('resolveSupabaseEnv', () => {
  it('returns a clear error when URL and key are missing', () => {
    const result = resolveSupabaseEnv({ DEV: true })
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.error).toContain('Supabase setup is incomplete')
    expect(result.error).toContain(
      'Add the project URL and publishable key to the local .env file, then restart the development server.',
    )
    expect(result.error).not.toMatch(/service.role|secret key/i)
    expect(result.error).not.toMatch(/eyJ|sb_secret|service_role/i)
  })

  it('returns a short error in production when env is missing', () => {
    const result = resolveSupabaseEnv({
      VITE_SUPABASE_URL: '   ',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
      DEV: false,
    })
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.error).toContain('Supabase setup is incomplete')
    expect(result.error).toContain('not configured')
  })

  it('accepts URL and publishable key', () => {
    const result = resolveSupabaseEnv({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
      DEV: true,
    })
    expect(result).toEqual({
      ok: true,
      url: 'https://example.supabase.co',
      publishableKey: 'sb_publishable_test',
    })
  })
})
