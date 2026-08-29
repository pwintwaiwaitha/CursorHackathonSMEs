import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../context/useApp'
import { canAccessProtectedApp } from '../../lib/authAccess'
import { LoadingBlock } from '../ui/LoadingBlock'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const { isDemoMode, isReady } = useApp()
  const location = useLocation()

  if (loading || !isReady) {
    return <LoadingBlock label="Loading… / ခေတ္တစောင့်ပါ…" />
  }

  if (
    !canAccessProtectedApp({
      isAuthenticated: Boolean(user),
      isDemoMode,
    })
  ) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
