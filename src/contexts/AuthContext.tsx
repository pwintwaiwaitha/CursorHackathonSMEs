import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import {
  configuredSignIn,
  configuredSignOut,
  configuredSignUp,
  type AuthActionResult,
} from '../lib/authApi'
import {
  getSupabaseClient,
  getSupabaseConfigError,
  isSupabaseConfigured,
} from '../lib/supabase'
import { getSupabaseRepository } from '../services/supabaseRepository'

export interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  configError: string | null
  signIn: (email: string, password: string) => Promise<AuthActionResult>
  signUp: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<AuthActionResult>
  signOut: () => Promise<AuthActionResult>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function ensureProfile(user: User): Promise<void> {
  try {
    await getSupabaseRepository().upsertProfile(user)
  } catch {
    // Profile write is best-effort. Session still works.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const configError = getSupabaseConfigError()

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    const client = getSupabaseClient()
    let cancelled = false

    void client.auth.getSession().then(({ data }) => {
      if (cancelled) {
        return
      }
      setSession(data.session)
      setUser(data.session?.user ?? null)
      if (data.session?.user) {
        void ensureProfile(data.session.user)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      if (nextSession?.user) {
        queueMicrotask(() => {
          void ensureProfile(nextSession.user)
        })
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    return configuredSignIn(email, password)
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, fullName?: string) => {
      return configuredSignUp(email, password, fullName)
    },
    [],
  )

  const signOut = useCallback(async () => {
    return configuredSignOut()
  }, [])

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      configError,
      signIn,
      signUp,
      signOut,
    }),
    [user, session, loading, configError, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return value
}
