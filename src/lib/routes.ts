import type { BilingualText } from './checkInCopy'

export const ROUTES = {
  root: '/',
  dashboard: '/dashboard',
  checkIn: '/check-in',
  checkInHistory: '/check-in/history',
  payments: '/payments',
  bills: '/bills',
  forecast: '/forecast',
  whatIf: '/what-if',
  simulator: '/simulator',
  scenarios: '/scenarios',
  banking: '/banking',
  bankPartnerDemo: '/bank-partner-demo',
  settings: '/settings',
  reports: '/reports',
  receiveQr: '/receive-qr',
  login: '/login',
  signup: '/signup',
  onboarding: '/onboarding',
} as const

export const APP_REDIRECTS = [
  { from: ROUTES.root, to: ROUTES.dashboard },
  { from: ROUTES.bills, to: ROUTES.payments },
  { from: ROUTES.simulator, to: `${ROUTES.forecast}?tab=what-if` },
  { from: ROUTES.whatIf, to: `${ROUTES.forecast}?tab=what-if` },
  { from: ROUTES.scenarios, to: `${ROUTES.forecast}?tab=scenarios` },
] as const

export const AUTH_REQUIRED_PATHS = [
  ROUTES.root,
  ROUTES.dashboard,
  ROUTES.checkIn,
  ROUTES.bills,
  ROUTES.payments,
  ROUTES.banking,
] as const

export const PAGE_TITLES: Record<string, BilingualText> = {
  [ROUTES.dashboard]: { en: 'Home', my: 'ပင်မ' },
  [ROUTES.checkIn]: { en: 'Check-in', my: 'စာရင်းတင်' },
  [ROUTES.checkInHistory]: { en: 'Check-in history', my: 'စာရင်းမှတ်တမ်း' },
  [ROUTES.payments]: { en: 'Payments', my: 'ပေးချေမှု' },
  [ROUTES.forecast]: { en: 'Forecast', my: 'ခန့်မှန်း' },
  [ROUTES.whatIf]: { en: 'What-if', my: 'စမ်းကြည့်' },
  [ROUTES.scenarios]: { en: 'Scenarios', my: 'အစီအစဉ်' },
  [ROUTES.banking]: { en: 'Banking', my: 'ဘဏ်' },
  [ROUTES.settings]: { en: 'Settings', my: 'ဆက်တင်' },
  [ROUTES.reports]: { en: 'Reports', my: 'အစီရင်ခံ' },
  [ROUTES.receiveQr]: { en: 'Receive QR', my: 'QR လက်ခံ' },
}

export function resolveRedirect(pathname: string): string | null {
  const match = APP_REDIRECTS.find((item) => item.from === pathname)
  return match?.to ?? null
}

export function pageTitleForPath(pathname: string): BilingualText {
  if (pathname === ROUTES.checkInHistory || pathname.startsWith(`${ROUTES.checkInHistory}/`)) {
    return PAGE_TITLES[ROUTES.checkInHistory]
  }
  return PAGE_TITLES[pathname] ?? { en: 'SME Mate AI', my: 'SME Mate AI' }
}

export function isAuthRequiredPath(pathname: string): boolean {
  return AUTH_REQUIRED_PATHS.some((path) => {
    if (path === ROUTES.root) {
      return pathname === ROUTES.root
    }
    return pathname === path || pathname.startsWith(`${path}/`)
  })
}
