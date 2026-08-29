import { Navigate, Outlet } from 'react-router-dom'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { useApp } from '../../context/useApp'
import { DemoBanner } from '../demo/DemoBanner'
import { AppHeader } from './AppHeader'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const { store, isDemoMode } = useApp()

  if (!store.profile) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar
        businessName={store.profile.businessName}
        language={store.profile.preferredLanguage}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-page">
        <AppHeader />
        <DemoBanner />
        <main className="mx-auto w-full max-w-6xl flex-1 bg-white px-3 py-2 pb-28 sm:px-4 sm:py-3 lg:bg-transparent lg:px-8 lg:pb-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
