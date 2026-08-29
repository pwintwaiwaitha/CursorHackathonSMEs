import type { ForecastLevel } from '../lib/forecastEngine'
import { FORECAST_LEVELS } from '../lib/forecastEngine'

export const DEMO_STORAGE_KEY = 'sme-mate-ai:demo'

export const DEMO_BUSINESS_IDS = [
  'cafe',
  'online',
  'minimart',
  'bakery',
  'clothing',
  'wholesale',
] as const

export type DemoBusinessId = (typeof DEMO_BUSINESS_IDS)[number]

export interface DemoBusinessMeta {
  id: DemoBusinessId
  shortLabel: string
  typeLabel: string
  recordedDays: number
  unlockLabel: string
  storyLabel: string
}

export interface DemoModeState {
  active: boolean
  selectedId: DemoBusinessId | null
}

export const DEMO_BUSINESSES: DemoBusinessMeta[] = [
  {
    id: 'cafe',
    shortLabel: 'New café',
    typeLabel: 'Café',
    recordedDays: 1,
    unlockLabel: '3-day Scheduled Forecast',
    storyLabel: 'Healthy cash — no short-horizon shortage',
  },
  {
    id: 'online',
    shortLabel: 'Online shop',
    typeLabel: 'Online shop',
    recordedDays: 7,
    unlockLabel: '14-day forecast + 1-month Early Projection',
    storyLabel: 'Upcoming shortage — stock bill before collections',
  },
  {
    id: 'minimart',
    shortLabel: 'Mini-mart',
    typeLabel: 'Mini-mart',
    recordedDays: 30,
    unlockLabel: '6-month scenario projection',
    storyLabel: 'Too much money tied up in stock',
  },
  {
    id: 'bakery',
    shortLabel: 'Bakery',
    typeLabel: 'Bakery',
    recordedDays: 180,
    unlockLabel: '1-year projection',
    storyLabel: 'Overdue customer payments',
  },
  {
    id: 'clothing',
    shortLabel: 'Clothing shop',
    typeLabel: 'Clothing shop',
    recordedDays: 365,
    unlockLabel: '3-year growth projection',
    storyLabel: 'A year of books for longer growth views',
  },
  {
    id: 'wholesale',
    shortLabel: 'Wholesaler',
    typeLabel: 'Wholesale trading',
    recordedDays: 1095,
    unlockLabel: '10-year and 30-year strategic scenarios',
    storyLabel: 'Established books for strategic planning',
  },
]

export function isDemoBusinessId(value: string): value is DemoBusinessId {
  return (DEMO_BUSINESS_IDS as readonly string[]).includes(value)
}

export function getDemoBusinessMeta(id: DemoBusinessId): DemoBusinessMeta {
  const meta = DEMO_BUSINESSES.find((item) => item.id === id)
  if (!meta) {
    throw new Error(`Unknown demo business: ${id}`)
  }
  return meta
}

export function advertisedLevelsForDays(recordedDays: number): ForecastLevel[] {
  return FORECAST_LEVELS.filter((level) => recordedDays >= level.minRecordedDays)
}

const EMPTY_DEMO_STATE: DemoModeState = {
  active: false,
  selectedId: null,
}

function canUseLocalStorage(): boolean {
  return typeof localStorage !== 'undefined'
}

export function loadDemoModeState(): DemoModeState {
  if (!canUseLocalStorage()) {
    return { ...EMPTY_DEMO_STATE }
  }
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY)
    if (!raw) {
      return { ...EMPTY_DEMO_STATE }
    }
    const parsed = JSON.parse(raw) as Partial<DemoModeState>
    const storedId =
      typeof parsed.selectedId === 'string' && isDemoBusinessId(parsed.selectedId)
        ? parsed.selectedId
        : null
    const active = Boolean(parsed.active) && storedId !== null
    return {
      active,
      selectedId: active ? 'clothing' : null,
    }
  } catch {
    return { ...EMPTY_DEMO_STATE }
  }
}

export function saveDemoModeState(state: DemoModeState): void {
  if (!canUseLocalStorage()) {
    return
  }
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state))
}

export function clearDemoModeState(): void {
  if (!canUseLocalStorage()) {
    return
  }
  localStorage.removeItem(DEMO_STORAGE_KEY)
}
