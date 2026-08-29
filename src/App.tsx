import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { AppProvider } from './context/AppProvider'
import { CheckInPage } from './pages/CheckInPage'
import { DashboardPage } from './pages/DashboardPage'
import { ForecastPage } from './pages/ForecastPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ReportsPage } from './pages/ReportsPage'
import { ScenariosPage } from './pages/ScenariosPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/check-in" element={<CheckInPage />} />
            <Route path="/forecast" element={<ForecastPage />} />
            <Route path="/scenarios" element={<ScenariosPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
