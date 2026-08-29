import { Link, Navigate, Outlet } from 'react-router-dom'
import { useApp } from '../../context/useApp'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const { store } = useApp()

  if (!store.profile) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar businessName={store.profile.businessName} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              SME Mate AI
            </p>
            <p className="truncate font-semibold text-navy">
              {store.profile.businessName}
            </p>
          </div>
          <Link to="/scenarios" className="text-sm font-medium text-bank-blue">
            Scenarios
          </Link>
        </div>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-24 lg:px-8 lg:pb-8">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
