import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  FORECAST_LEVELS,
  measureCheckInHistory,
  runForecast,
} from '../lib/forecastEngine'
import {
  forecastAnalyzedLabel,
  forecastDataAvailableLabel,
} from '../lib/forecastCopy'
import { todayIsoDate } from '../lib/dates'
import { buildDemoStore } from './demoBusinesses'
import { DEMO_BUSINESSES, loadDemoModeState, saveDemoModeState } from './demoMode'
import {
  APP_HEADER_COPY,
  OWNER_DEMO_BUSINESS_ID,
  OWNER_DEMO_BUSINESS_NAME,
  OWNER_DEMO_COPY,
  OWNER_DEMO_FORBIDDEN_UI,
  headerDisplayStrings,
  ownerVisibleShopNames,
} from './ownerDemo'

const asOf = todayIsoDate()
const memory = new Map<string, string>()

describe('owner demo UI', () => {
  beforeEach(() => {
    memory.clear()
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value)
      },
      removeItem: (key: string) => {
        memory.delete(key)
      },
    }
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    })
  })

  afterEach(() => {
    memory.clear()
  })

  it('names only Thiri Fashion in owner-facing demo copy', () => {
    const names = ownerVisibleShopNames()
    expect(names).toEqual([OWNER_DEMO_BUSINESS_NAME])
    const ownerText = [
      OWNER_DEMO_COPY.reset.en,
      OWNER_DEMO_COPY.tryDemo.en,
      OWNER_DEMO_COPY.banner.en,
      ...names,
    ].join(' ')
    for (const forbidden of OWNER_DEMO_FORBIDDEN_UI) {
      expect(ownerText).not.toContain(forbidden)
    }
    expect(DEMO_BUSINESSES.map((item) => item.id)).toContain('cafe')
    expect(DEMO_BUSINESSES.map((item) => item.id)).toContain('clothing')
  })

  it('keeps header strings free of 365d and other shop labels', () => {
    const strings = headerDisplayStrings(OWNER_DEMO_BUSINESS_NAME, true)
    expect(strings).toEqual([APP_HEADER_COPY.brand, OWNER_DEMO_BUSINESS_NAME, 'DEMO'])
    expect(strings.join(' ')).not.toContain('365d')
    expect(strings.join(' ')).not.toContain('Clothing shop')
    expect(APP_HEADER_COPY.brand).not.toContain('365d')
  })

  it('normalizes stored demo selection to Thiri Fashion', () => {
    saveDemoModeState({ active: true, selectedId: 'minimart' })
    const state = loadDemoModeState()
    expect(state.active).toBe(true)
    expect(state.selectedId).toBe(OWNER_DEMO_BUSINESS_ID)
    expect(state.selectedId).toBe('clothing')
  })

  it('forecasts only the loaded shop check-ins', () => {
    const store = buildDemoStore(OWNER_DEMO_BUSINESS_ID, asOf)
    expect(store.profile?.businessName).toBe(OWNER_DEMO_BUSINESS_NAME)
    const history = measureCheckInHistory(store.checkIns, asOf)
    expect(history.recordedDays).toBe(365)
    expect(store.checkIns).toHaveLength(365)
    const cafe = buildDemoStore('cafe', asOf)
    expect(cafe.checkIns).toHaveLength(1)
    expect(store.checkIns).not.toHaveLength(cafe.checkIns.length)

    const yearView = FORECAST_LEVELS.find((level) => level.id === 'year_3')
    expect(yearView).toBeTruthy()
    const result = runForecast({
      store,
      level: yearView!,
      startDate: asOf,
    })
    expect(result.locked).toBe(false)
    expect(result.dataPeriodUsed).toContain('365')
    expect(forecastDataAvailableLabel(history.recordedDays, 'en')).toBe(
      'Data available: 365 days',
    )
    expect(forecastAnalyzedLabel(history.recordedDays, OWNER_DEMO_BUSINESS_NAME, 'en')).toBe(
      '365 days of Thiri Fashion records analyzed',
    )
    expect(forecastDataAvailableLabel(history.recordedDays, 'en')).not.toContain('365d')
  })
})
