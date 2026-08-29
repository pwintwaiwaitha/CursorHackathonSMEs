import { describe, expect, it } from 'vitest'
import {
  BANK_SHORTAGE_RECOMMENDATION_IDS,
  buildBankShortageRecommendations,
  mentionsLoanOrCreditDecision,
  orderBankAdviceTitles,
} from './bankRecommendations'

describe('bank shortage recommendation order', () => {
  it('returns the five owner steps in the required order', () => {
    const items = buildBankShortageRecommendations(true)
    expect(items.map((item) => item.id)).toEqual([...BANK_SHORTAGE_RECOMMENDATION_IDS])
    expect(items.map((item) => item.rank)).toEqual([1, 2, 3, 4, 5])
    expect(items[0]?.titleEn).toMatch(/collect overdue/i)
    expect(items[1]?.titleEn).toMatch(/non-essential/i)
    expect(items[2]?.titleEn).toMatch(/supplier/i)
    expect(items[3]?.titleEn).toMatch(/reserve/i)
    expect(items[4]?.titleEn).toMatch(/bank/i)
  })

  it('stays empty when no shortage is predicted', () => {
    expect(buildBankShortageRecommendations(false)).toEqual([])
  })

  it('never auto-recommends a loan because cash is negative', () => {
    const items = buildBankShortageRecommendations(true)
    for (const item of items) {
      expect(mentionsLoanOrCreditDecision(`${item.titleEn} ${item.titleMy}`)).toBe(false)
    }
    expect(mentionsLoanOrCreditDecision('Take a loan because cash is negative')).toBe(true)
    expect(mentionsLoanOrCreditDecision('credit eligibility approved')).toBe(true)
  })

  it('reorders mixed advice titles onto the required sequence and drops loan text', () => {
    const ordered = orderBankAdviceTitles([
      'Take a short loan',
      'Negotiate a supplier payment date',
      'Collect overdue customer payments',
    ])
    expect(ordered[0]).toMatch(/collect/i)
    expect(ordered[2]).toMatch(/supplier/i)
    expect(ordered.some((title) => mentionsLoanOrCreditDecision(title))).toBe(false)
    expect(ordered).toHaveLength(5)
  })
})
