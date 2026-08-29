import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import { mapAuthError } from './authErrors'
import type { Database } from '../types/database'
import { getSupabaseClient, isSupabaseConfigured, getSupabaseConfigError } from './supabase'

export interface AuthActionResult {
  ok: boolean
  error: string | null
  needsEmailConfirmation?: boolean
  user?: User | null
  session?: Session | null
}

type AuthClient = Pick<SupabaseClient<Database>, 'auth'>

export async function signInWithPassword(
  client: AuthClient,
  email: string,
  password: string,
): Promise<AuthActionResult> {
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    return { ok: false, error: mapAuthError(error) }
  }
  return {
    ok: true,
    error: null,
    user: data.user,
    session: data.session,
  }
}

export async function signUpWithPassword(
  client: AuthClient,
  email: string,
  password: string,
  fullName?: string,
): Promise<AuthActionResult> {
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: fullName
      ? { data: { full_name: fullName } }
      : undefined,
  })
  if (error) {
    return { ok: false, error: mapAuthError(error) }
  }
  if (!data.session) {
    return {
      ok: true,
      error: null,
      needsEmailConfirmation: true,
      user: data.user,
      session: null,
    }
  }
  return {
    ok: true,
    error: null,
    user: data.user,
    session: data.session,
  }
}

export async function signOutUser(client: AuthClient): Promise<AuthActionResult> {
  const { error } = await client.auth.signOut()
  if (error) {
    return { ok: false, error: mapAuthError(error) }
  }
  return { ok: true, error: null, user: null, session: null }
}

export async function configuredSignIn(
  email: string,
  password: string,
): Promise<AuthActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: getSupabaseConfigError() }
  }
  return signInWithPassword(getSupabaseClient(), email, password)
}

export async function configuredSignUp(
  email: string,
  password: string,
  fullName?: string,
): Promise<AuthActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: getSupabaseConfigError() }
  }
  return signUpWithPassword(getSupabaseClient(), email, password, fullName)
}

export async function configuredSignOut(): Promise<AuthActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: true, error: null, user: null, session: null }
  }
  return signOutUser(getSupabaseClient())
}
