import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { AppProvider } from './context/AppProvider'
import { CheckInPage } from './pages/CheckInPage'
import { DashboardPage } from './pages/DashboardPage'
import { ForecastPage } from './pages/ForecastPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ReceiveQrPage } from './pages/ReceiveQrPage'
import { ReportsPage } from './pages/ReportsPage'
import { SchedulePage } from './pages/SchedulePage'
import { ScenariosPage } from './pages/ScenariosPage'
import { SettingsPage } from './pages/SettingsPage'
import { SimulatorPage } from './pages/SimulatorPage'

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/receive-qr" element={<ReceiveQrPage />} />
              <Route path="/check-in" element={<CheckInPage />} />
              <Route path="/bills" element={<SchedulePage />} />
              <Route path="/forecast" element={<ForecastPage />} />
              <Route path="/simulator" element={<SimulatorPage />} />
              <Route path="/scenarios" element={<ScenariosPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  )
}
