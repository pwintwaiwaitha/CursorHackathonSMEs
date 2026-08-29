import {
  CalendarCheck,
  Landmark,
  LayoutDashboard,
  LineChart,
  Wallet,
} from 'lucide-react'
import type { PreferredLanguage } from '../../types/models'
import { ROUTES } from '../../lib/routes'

export const NAV_ITEMS = [
  { to: ROUTES.dashboard, labelEn: 'Home', labelMy: 'ပင်မ', icon: LayoutDashboard },
  { to: ROUTES.checkIn, labelEn: 'Check-in', labelMy: 'စာရင်း', icon: CalendarCheck },
  { to: ROUTES.payments, labelEn: 'Payments', labelMy: 'ပေးချေ', icon: Wallet },
  { to: ROUTES.forecast, labelEn: 'Forecast', labelMy: 'ခန့်မှန်း', icon: LineChart },
  { to: ROUTES.banking, labelEn: 'Banking', labelMy: 'ဘဏ်', icon: Landmark },
] as const

export const MOBILE_NAV_ITEMS = NAV_ITEMS

export const FORECAST_TOOL_PATHS = [ROUTES.whatIf, ROUTES.scenarios, ROUTES.simulator] as const

export function navLabel(
  item: (typeof NAV_ITEMS)[number],
  language: PreferredLanguage,
): string {
  return language === 'my' ? item.labelMy : item.labelEn
}

export function isNavItemActive(to: string, pathname: string): boolean {
  if (to === ROUTES.dashboard) {
    return pathname === ROUTES.dashboard || pathname === ROUTES.root
  }
  if (to === ROUTES.checkIn) {
    return pathname === ROUTES.checkIn || pathname.startsWith(`${ROUTES.checkIn}/`)
  }
  if (to === ROUTES.payments) {
    return pathname === ROUTES.payments || pathname === ROUTES.bills
  }
  if (to === ROUTES.forecast) {
    return (
      pathname === ROUTES.forecast ||
      pathname.startsWith(`${ROUTES.forecast}/`) ||
      FORECAST_TOOL_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
    )
  }
  if (to === ROUTES.banking) {
    return pathname === ROUTES.banking
  }
  return pathname === to
}
