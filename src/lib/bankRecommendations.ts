export const BANK_SHORTAGE_RECOMMENDATION_IDS = [
  'collect_overdue',
  'delay_non_essential',
  'reschedule_supplier',
  'use_reserve_carefully',
  'voluntary_bank_support',
] as const

export type BankShortageRecommendationId =
  (typeof BANK_SHORTAGE_RECOMMENDATION_IDS)[number]

export interface BankShortageRecommendation {
  id: BankShortageRecommendationId
  rank: 1 | 2 | 3 | 4 | 5
  titleEn: string
  titleMy: string
  href: string
}

const SHORTAGE_RECOMMENDATIONS: BankShortageRecommendation[] = [
  {
    id: 'collect_overdue',
    rank: 1,
    titleEn: 'Collect overdue receivables',
    titleMy: 'ကျော်လွန်ရရန်ရှိငွေများကို ကောက်ယူပါ',
      href: '/payments',
  },
  {
    id: 'delay_non_essential',
    rank: 2,
    titleEn: 'Reduce or delay non-essential expenses',
    titleMy: 'မလိုအပ်သောကုန်ကျငွေကို လျှော့ပါ သို့မဟုတ် ရွှေ့ပါ',
    href: '/check-in',
  },
  {
    id: 'reschedule_supplier',
    rank: 3,
    titleEn: 'Reschedule a supplier payment',
    titleMy: 'ကုန်သည်ပေးချေမှုကို ရက်ရွှေ့ပါ',
      href: '/payments',
  },
  {
    id: 'use_reserve_carefully',
    rank: 4,
    titleEn: 'Use available emergency reserve carefully',
    titleMy: 'အရေးပေါ်စုငွေကို သတိဖြင့် သုံးပါ',
    href: '/banking',
  },
  {
    id: 'voluntary_bank_support',
    rank: 5,
    titleEn: 'Ask the bank for support only if you want to',
    titleMy: 'လိုမှသာ ဘဏ်အကူအညီ တောင်းပါ',
    href: '/banking',
  },
]

const LOAN_OR_CREDIT =
  /\b(loan|borrow|credit\s*eligib|pre-?approv|microfinance|ချေးငွေ)/i

export function mentionsLoanOrCreditDecision(text: string): boolean {
  return LOAN_OR_CREDIT.test(text)
}

/**
 * Shortage advice is always this order. Negative cash never inserts a loan.
 * This list never makes an approval or credit-eligibility decision.
 */
export function buildBankShortageRecommendations(hasPredictedShortage: boolean): BankShortageRecommendation[] {
  if (!hasPredictedShortage) {
    return []
  }
  return SHORTAGE_RECOMMENDATIONS.map((item) => ({ ...item }))
}

export function orderBankAdviceTitles(titles: string[]): string[] {
  const remaining = [...titles]
  const ordered: string[] = []
  for (const step of SHORTAGE_RECOMMENDATIONS) {
    const index = remaining.findIndex((title) => {
      const lower = title.toLowerCase()
      if (step.id === 'collect_overdue') {
        return lower.includes('collect') || lower.includes('overdue') || lower.includes('receivable')
      }
      if (step.id === 'delay_non_essential') {
        return lower.includes('delay') || lower.includes('non-essential') || lower.includes('postpone')
      }
      if (step.id === 'reschedule_supplier') {
        return lower.includes('reschedule') || lower.includes('supplier') || lower.includes('negotiate')
      }
      if (step.id === 'use_reserve_carefully') {
        return lower.includes('reserve')
      }
      return lower.includes('bank support') || lower.includes('bank professional')
    })
    if (index >= 0) {
      ordered.push(remaining.splice(index, 1)[0] ?? step.titleEn)
    } else {
      ordered.push(step.titleEn)
    }
  }
  return ordered.filter((title) => !mentionsLoanOrCreditDecision(title))
}
