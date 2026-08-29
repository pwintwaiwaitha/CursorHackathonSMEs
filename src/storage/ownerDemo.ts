import type { DemoBusinessId } from './demoMode'

export const OWNER_DEMO_BUSINESS_ID: DemoBusinessId = 'clothing'
export const OWNER_DEMO_BUSINESS_NAME = 'Thiri Fashion'

export const APP_HEADER_COPY = {
  brand: 'SME MATE AI',
  demoBadge: 'DEMO',
} as const

export const OWNER_DEMO_COPY = {
  reset: {
    en: 'Reset Thiri Fashion demo',
    my: 'Thiri Fashion နမူနာ ပြန်စရန်',
  },
  tryDemo: {
    en: 'Try Thiri Fashion demo',
    my: 'Thiri Fashion နမူနာ စမ်းရန်',
  },
  banner: {
    en: 'Demo Mode — Sample Thiri Fashion data',
    my: 'နမူနာမုဒ် — Thiri Fashion နမူနာဒေတာ',
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
  return businessName === OWNER_DEMO_BUSINESS_NAME
}
