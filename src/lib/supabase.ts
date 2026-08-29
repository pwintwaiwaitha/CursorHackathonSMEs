import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { missingSupabaseEnvMessage } from './authErrors'
import type { Database } from '../types/database'

export interface SupabaseEnvInput {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_PUBLISHABLE_KEY?: string
  DEV?: boolean
}

export type SupabaseConfig =
  | { ok: true; url: string; publishableKey: string }
  | { ok: false; error: string }

export function resolveSupabaseEnv(env: SupabaseEnvInput): SupabaseConfig {
  const url = env.VITE_SUPABASE_URL?.trim() ?? ''
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''
  if (!url || !publishableKey) {
    return { ok: false, error: missingSupabaseEnvMessage(Boolean(env.DEV)) }
  }
  return { ok: true, url, publishableKey }
}

export function getSupabaseConfig(): SupabaseConfig {
  return resolveSupabaseEnv({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    DEV: import.meta.env.DEV,
  })
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig().ok
}

export function getSupabaseConfigError(): string | null {
  const config = getSupabaseConfig()
  return config.ok ? null : config.error
}

let client: SupabaseClient<Database> | null = null

export function getSupabaseClient(): SupabaseClient<Database> {
  const config = getSupabaseConfig()
  if (!config.ok) {
    throw new Error(config.error)
  }
  if (!client) {
    client = createClient<Database>(config.url, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}

export function resetSupabaseClientForTests(): void {
  client = null
}
