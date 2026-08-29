import {
  BarChart3,
  CalendarCheck,
  LayoutDashboard,
  LineChart,
  Settings,
  SlidersHorizontal,
} from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/check-in', label: 'Check-in', icon: CalendarCheck },
  { to: '/forecast', label: 'Forecast', icon: LineChart },
  { to: '/scenarios', label: 'Scenarios', icon: SlidersHorizontal },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

export const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) => item.to !== '/scenarios')
