import type { ReactNode } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../context/useApp'
import { canAccessProtectedApp } from '../../lib/authAccess'
import { LoadingBlock } from '../ui/LoadingBlock'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const { isDemoMode, isReady } = useApp()

  if (!isDemoMode && (loading || !isReady)) {
    return <LoadingBlock label="Loading…" />
  }

  void canAccessProtectedApp({
    isAuthenticated: Boolean(user),
    isDemoMode,
  })

  return children
}
