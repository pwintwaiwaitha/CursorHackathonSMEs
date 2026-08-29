import { saveDemoModeState, type DemoBusinessId } from './demoMode'

export const OWNER_DEMO_BUSINESS_ID: DemoBusinessId = 'clothing'
export const OWNER_DEMO_BUSINESS_NAME = 'J Clothing'
export const LEGACY_OWNER_DEMO_NAMES = ['Thiri Fashion'] as const

export const APP_HEADER_COPY = {
  brand: 'SME MATE AI',
  demoBadge: 'DEMO',
} as const

export const OWNER_DEMO_COPY = {
  reset: {
    en: 'Reset J Clothing Demo',
    my: 'J Clothing နမူနာ ပြန်စရန်',
  },
  tryDemo: {
    en: 'Try J Clothing demo',
    my: 'J Clothing နမူနာ စမ်းရန်',
  },
  banner: {
    en: 'Demo Mode — Try changing J Clothing’s records',
    my: 'နမူနာမုဒ် — J Clothing စာရင်းကို ပြင်ကြည့်ပါ',
  },
  signInToSync: {
    en: 'Sign in to sync data',
    my: 'ဒေတာချိတ်ဆက်ရန် ဝင်မည်',
  },
} as const

export const OWNER_DEMO_FORBIDDEN_UI = [
  'Café',
  'Cafe',
  'New café',
  'Online shop',
  'Mini-mart',
  'Bakery',
  'Clothing shop',
  'Wholesaler',
  'wholesaler',
  '365d',
] as const

export function ownerVisibleShopNames(): string[] {
  return [OWNER_DEMO_BUSINESS_NAME]
}

export function headerDisplayStrings(businessName: string, isDemo: boolean): string[] {
  return [APP_HEADER_COPY.brand, businessName, isDemo ? APP_HEADER_COPY.demoBadge : ''].filter(
    Boolean,
  )
}

export function isOwnerDemoStore(businessName: string | undefined): boolean {
  return (
    businessName === OWNER_DEMO_BUSINESS_NAME ||
    LEGACY_OWNER_DEMO_NAMES.some((name) => name === businessName)
  )
}

export function ensureAnonymousDemoState(): { active: true; selectedId: DemoBusinessId } {
  const next = { active: true as const, selectedId: OWNER_DEMO_BUSINESS_ID }
  saveDemoModeState(next)
  return next
}
