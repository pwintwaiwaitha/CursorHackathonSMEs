import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { DemoBadge } from '../demo/DemoBadge'
import { DemoBanner } from '../demo/DemoBanner'
import { DemoBusinessSwitcher } from '../demo/DemoBusinessSwitcher'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { NotificationCenter } from '../notifications/NotificationCenter'
import { useApp } from '../../context/useApp'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const { store, isDemoMode } = useApp()
  const location = useLocation()
  const isDashboard = location.pathname === '/'

  if (!store.profile) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar
        businessName={store.profile.businessName}
        language={store.profile.preferredLanguage}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {isDashboard ? null : (
          <div className="border-b border-line bg-white lg:hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium uppercase tracking-wider text-muted">
                  SME Mate AI
                </p>
                <p className="flex items-center gap-2 font-semibold text-navy">
                  <span className="truncate">{store.profile.businessName}</span>
                  {isDemoMode ? <DemoBadge compact /> : null}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <NotificationCenter />
                <Link to="/simulator" className="inline-flex min-h-11 items-center font-semibold text-navy">
                  What-if
                </Link>
              </div>
            </div>
            {isDemoMode ? (
              <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2">
                <span className="text-base text-muted">Demo shop</span>
                <DemoBusinessSwitcher variant="compact" tone="light" />
              </div>
            ) : null}
          </div>
        )}
        {isDashboard ? null : (
          <div className="hidden items-center justify-end border-b border-line bg-white px-8 py-3 lg:flex">
            <NotificationCenter />
          </div>
        )}
        {isDemoMode ? (
          <div className="border-b border-watch bg-watch-bg px-4 py-2 lg:px-8">
            {isDashboard ? (
              <div className="flex items-center justify-between gap-2">
                <DemoBadge compact />
                <DemoBusinessSwitcher variant="compact" tone="light" />
              </div>
            ) : (
              <DemoBanner />
            )}
          </div>
        ) : null}
        <main
          className={`mx-auto w-full max-w-6xl flex-1 ${
            isDashboard ? 'px-3 py-2 pb-28 lg:px-8 lg:pb-8' : 'px-4 py-5 pb-24 lg:px-8 lg:pb-8'
          }`}
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
