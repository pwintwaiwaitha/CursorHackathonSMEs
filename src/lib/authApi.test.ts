import { describe, expect, it, vi } from 'vitest'
import { signInWithPassword, signOutUser, signUpWithPassword } from './authApi'

function mockAuth(overrides: {
  signIn?: { data: { user: { id: string } | null; session: { access_token: string } | null }; error: { message: string } | null }
  signUp?: { data: { user: { id: string } | null; session: { access_token: string } | null }; error: { message: string } | null }
  signOut?: { error: { message: string } | null }
}) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue(
        overrides.signIn ?? {
          data: { user: { id: 'user-1' }, session: { access_token: 'tok' } },
          error: null,
        },
      ),
      signUp: vi.fn().mockResolvedValue(
        overrides.signUp ?? {
          data: { user: { id: 'user-1' }, session: { access_token: 'tok' } },
          error: null,
        },
      ),
      signOut: vi.fn().mockResolvedValue(overrides.signOut ?? { error: null }),
    },
  }
}

describe('auth sign-in and sign-out', () => {
  it('returns the session after a successful sign-in', async () => {
    const client = mockAuth({})
    const result = await signInWithPassword(client, 'owner@example.com', 'secret1')
    expect(result.ok).toBe(true)
    expect(result.user?.id).toBe('user-1')
    expect(result.session?.access_token).toBe('tok')
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'owner@example.com',
      password: 'secret1',
    })
  })

  it('maps sign-in failures without exposing secrets', async () => {
    const client = mockAuth({
      signIn: {
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      },
    })
    const result = await signInWithPassword(client, 'owner@example.com', 'wrong')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Incorrect email or password')
    expect(JSON.stringify(result)).not.toContain('wrong')
  })

  it('clears the session on sign-out', async () => {
    const client = mockAuth({})
    const result = await signOutUser(client)
    expect(result.ok).toBe(true)
    expect(result.user).toBeNull()
    expect(result.session).toBeNull()
    expect(client.auth.signOut).toHaveBeenCalledOnce()
  })

  it('asks the owner to confirm email when sign-up has no session', async () => {
    const client = mockAuth({
      signUp: {
        data: { user: { id: 'user-1' }, session: null },
        error: null,
      },
    })
    const result = await signUpWithPassword(client, 'owner@example.com', 'secret1')
    expect(result.ok).toBe(true)
    expect(result.needsEmailConfirmation).toBe(true)
  })
})
