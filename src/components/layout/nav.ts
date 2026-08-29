import {
  BarChart3,
  Beaker,
  CalendarCheck,
  LayoutDashboard,
  LineChart,
  Settings,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react'
import type { PreferredLanguage } from '../../types/models'

export const NAV_ITEMS = [
  { to: '/', labelEn: 'Home', labelMy: 'ပင်မ', icon: LayoutDashboard },
  { to: '/check-in', labelEn: 'Today', labelMy: 'ယနေ့', icon: CalendarCheck },
  { to: '/bills', labelEn: 'Bills', labelMy: 'ဘီလ်', icon: Wallet },
  { to: '/forecast', labelEn: 'Forecast', labelMy: 'ခန့်မှန်း', icon: LineChart },
  { to: '/simulator', labelEn: 'What-if', labelMy: 'စမ်းကြည့်', icon: Beaker },
  { to: '/scenarios', labelEn: 'Plans', labelMy: 'အစီအစဉ်', icon: SlidersHorizontal },
  { to: '/reports', labelEn: 'Reports', labelMy: 'အစီရင်ခံ', icon: BarChart3 },
  { to: '/settings', labelEn: 'Settings', labelMy: 'ဆက်တင်', icon: Settings },
] as const

export const MOBILE_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => item.to !== '/scenarios' && item.to !== '/reports' && item.to !== '/simulator',
)

export function navLabel(
  item: (typeof NAV_ITEMS)[number],
  language: PreferredLanguage,
): string {
  return language === 'my' ? item.labelMy : item.labelEn
}
