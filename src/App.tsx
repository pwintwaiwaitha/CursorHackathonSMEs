import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { LoadingBlock } from './components/ui/LoadingBlock'
import { AppProvider } from './context/AppProvider'
import { useApp } from './context/useApp'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { canAccessProtectedApp, isAuthRequiredPath } from './lib/authAccess'
import { ROUTES } from './lib/routes'
import { BankPartnerDemoPage } from './pages/BankPartnerDemoPage'
import { BankingPage } from './pages/BankingPage'
import { CheckInHistoryPage } from './pages/CheckInHistoryPage'
import { CheckInPage } from './pages/CheckInPage'
import { DashboardPage } from './pages/DashboardPage'
import { ForecastPage } from './pages/ForecastPage'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ReceiveQrPage } from './pages/ReceiveQrPage'
import { ReportsPage } from './pages/ReportsPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { SettingsPage } from './pages/SettingsPage'
import { SignUpPage } from './pages/SignUpPage'

function GuardedAppLayout() {
  const { user, loading } = useAuth()
  const { isDemoMode, isReady } = useApp()
  const location = useLocation()

  if (loading || !isReady) {
    return (
      <div className="min-h-screen bg-page px-4 py-8">
        <LoadingBlock label="Loading…" />
      </div>
    )
  }

  if (
    isAuthRequiredPath(location.pathname) &&
    !canAccessProtectedApp({
      isAuthenticated: Boolean(user),
      isDemoMode,
    })
  ) {
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />
  }

  return <AppLayout />
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <Routes>
              <Route path={ROUTES.login} element={<LoginPage />} />
              <Route path={ROUTES.signup} element={<SignUpPage />} />
              <Route path={ROUTES.onboarding} element={<OnboardingPage />} />
              <Route path={ROUTES.bankPartnerDemo} element={<BankPartnerDemoPage />} />
              <Route element={<GuardedAppLayout />}>
                <Route path={ROUTES.root} element={<Navigate to={ROUTES.dashboard} replace />} />
                <Route
                  path={ROUTES.dashboard}
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.banking}
                  element={
                    <ProtectedRoute>
                      <BankingPage />
                    </ProtectedRoute>
                  }
                />
                <Route path={ROUTES.receiveQr} element={<ReceiveQrPage />} />
                <Route
                  path={ROUTES.checkIn}
                  element={
                    <ProtectedRoute>
                      <CheckInPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.checkInHistory}
                  element={
                    <ProtectedRoute>
                      <CheckInHistoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.payments}
                  element={
                    <ProtectedRoute>
                      <PaymentsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path={ROUTES.bills} element={<Navigate to={ROUTES.payments} replace />} />
                <Route path={ROUTES.forecast} element={<ForecastPage />} />
                <Route
                  path={ROUTES.whatIf}
                  element={<Navigate to={`${ROUTES.forecast}?tab=what-if`} replace />}
                />
                <Route
                  path={ROUTES.simulator}
                  element={<Navigate to={`${ROUTES.forecast}?tab=what-if`} replace />}
                />
                <Route
                  path={ROUTES.scenarios}
                  element={<Navigate to={`${ROUTES.forecast}?tab=scenarios`} replace />}
                />
                <Route path={ROUTES.reports} element={<ReportsPage />} />
                <Route path={ROUTES.settings} element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
