import { describe, expect, it } from 'vitest'
import {
  BANK_VALUE_BULLETS,
  DEFAULT_PARTNER_FILTERS,
  PARTNER_DEMO_BANNER,
  PARTNER_FUNNEL_STAGES,
  assertSyntheticOnly,
  buildPartnerDemoView,
  buildSyntheticCohort,
} from './partnerDemoMetrics'

describe('partner dashboard synthetic-only', () => {
  it('uses isolated illustrative metrics with no real customer PII', () => {
    const view = buildPartnerDemoView()
    expect(view.banner).toBe(PARTNER_DEMO_BANNER)
    expect(view.illustrative).toBe(true)
    expect(view.containsRealCustomerData).toBe(false)
    expect(view.funnel.map((item) => item.id)).toEqual(
      PARTNER_FUNNEL_STAGES.map((item) => item.id),
    )
    expect(view.valueBullets).toEqual(BANK_VALUE_BULLETS)
    expect(() => assertSyntheticOnly(view)).not.toThrow()
    expect(JSON.stringify(view)).not.toMatch(/phone|account_number|09\d{7,}/i)
  })

  it('rejects owner names, phones, accounts, and private records', () => {
    expect(() =>
      assertSyntheticOnly({ owner: 'Daw Mya', phone: '09123456789' }),
    ).toThrow(/PII/i)
    expect(() =>
      assertSyntheticOnly({ account_number: '001234567890' }),
    ).toThrow(/PII/i)
    expect(() =>
      assertSyntheticOnly({ note: 'Call Ko Aung Please' }),
    ).toThrow(/PII/i)
  })

  it('filters the synthetic cohort without reading live owner tables', () => {
    const all = buildSyntheticCohort()
    expect(all.length).toBe(48)
    const cafe = buildPartnerDemoView({
      ...DEFAULT_PARTNER_FILTERS,
      demoScenario: 'cafe',
    })
    expect(cafe.cohortSize).toBeLessThan(all.length)
    expect(cafe.containsRealCustomerData).toBe(false)
  })
})
