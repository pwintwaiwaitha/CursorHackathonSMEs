import { describe, expect, it } from 'vitest'
import {
  AI_ADVICE_DISCLAIMER,
  actionPushesLoan,
  aiAdviceRequestSchema,
  buildFallbackAdvice,
  buildWhyPrediction,
  mapEngineRisk,
  parseAdviceJson,
  sanitizeAdvice,
  type AiAdviceRequest,
  type AiAdviceResponse,
} from './aiAdvice'

function sampleRequest(overrides: Partial<AiAdviceRequest> = {}): AiAdviceRequest {
  const base: AiAdviceRequest = {
    view: {
      levelId: 'short_14d',
      label: '14-day forecast',
      family: 'Forecast',
      kind: 'short_term',
      horizonDays: 14,
      startDate: '2026-08-29',
      endDate: '2026-09-11',
    },
    amounts: {
      startingBalanceMmk: 500_000,
      predictedClosingCashMmk: 200_000,
      lowestPredictedCashMmk: -180_000,
      shortageAmountMmk: 180_000,
      overdueReceivablesMmk: 90_000,
      upcomingPayablesMmk: 250_000,
      topExpenseAmountMmk: 80_000,
      emergencyReserveTargetMmk: 300_000,
    },
    dates: { shortageDate: '2026-09-12' },
    labels: {
      topExpenseCategory: 'Stock / goods',
      nextSupplierName: 'U Win',
      nextCustomerName: 'Ko Aung',
    },
    engine: {
      risk: 'high',
      confidenceLevel: 'medium',
      dataPeriodUsed: 'Check-ins 2026-08-01 to 2026-08-28 (14 day(s) recorded)',
      forecastMethod: 'Forecast: recent Daily Cash Check-in run-rate plus known receivables and payables.',
      mainAssumptions: ['Customer collection rate 100%.'],
      missingDataWarnings: ['2 day(s) are missing between the first check-in and today.'],
      mainRiskDrivers: ['Supplier payment is due before customer payments arrive.'],
    },
    flags: {
      hasOverdueReceivables: true,
      supplierDueBeforeCustomer: true,
      dailyOutExceedsIn: true,
      belowReserve: true,
      hasSlowStockHint: true,
    },
  }
  return aiAdviceRequestSchema.parse({ ...base, ...overrides })
}

describe('AI advice layer', () => {
  it('maps engine risk without inventing a new scale', () => {
    expect(mapEngineRisk('low')).toBe('healthy')
    expect(mapEngineRisk('medium')).toBe('watch')
    expect(mapEngineRisk('high')).toBe('high')
  })

  it('rejects extra fields on the request', () => {
    const result = aiAdviceRequestSchema.safeParse({
      ...(sampleRequest() as unknown as Record<string, unknown>),
      inventedCashMmk: 999,
    })
    expect(result.success).toBe(false)
  })

  it('builds fallback actions from engine flags and quoted amounts', () => {
    const advice = buildFallbackAdvice(sampleRequest())
    const titles = advice.recommendedActions.map((item) => item.title)
    expect(advice.riskLevel).toBe('high')
    expect(advice.summaryMm).toContain('180,000 MMK')
    expect(titles).toContain('Collect overdue customer payments')
    expect(titles).toContain('Postpone non-essential stock orders')
    expect(titles).toContain('Discount slow-moving stock')
    expect(titles.some((title) => title.startsWith('Reduce '))).toBe(true)
    expect(titles).toContain('Negotiate a supplier payment date')
    expect(titles).toContain('Build an emergency cash reserve')
    expect(titles).toContain('Discuss financing options with a bank professional')
    expect(advice.recommendedActions.some((item) => actionPushesLoan(item.title, item.description))).toBe(
      false,
    )
    expect(advice.disclaimer).toBe(AI_ADVICE_DISCLAIMER)
  })

  it('does not auto-recommend taking a loan when cash is healthy', () => {
    const advice = buildFallbackAdvice(
      sampleRequest({
        amounts: {
          startingBalanceMmk: 800_000,
          predictedClosingCashMmk: 900_000,
          lowestPredictedCashMmk: 700_000,
          shortageAmountMmk: 0,
          overdueReceivablesMmk: 0,
          upcomingPayablesMmk: 0,
          topExpenseAmountMmk: 0,
          emergencyReserveTargetMmk: 0,
        },
        dates: { shortageDate: null },
        engine: {
          risk: 'low',
          confidenceLevel: 'high',
          dataPeriodUsed: 'Check-ins 2026-08-01 to 2026-08-28 (28 day(s) recorded)',
          forecastMethod: 'Forecast: recent Daily Cash Check-in run-rate plus known receivables and payables.',
          mainAssumptions: ['Customer collection rate 100%.'],
          missingDataWarnings: [],
          mainRiskDrivers: ['No single large cash leak found in this plan.'],
        },
        flags: {
          hasOverdueReceivables: false,
          supplierDueBeforeCustomer: false,
          dailyOutExceedsIn: false,
          belowReserve: false,
          hasSlowStockHint: false,
        },
      }),
    )
    expect(advice.riskLevel).toBe('healthy')
    expect(advice.recommendedActions.some((item) => /loan/i.test(item.title))).toBe(false)
  })

  it('overwrites AI risk and strips loan-pushing actions', () => {
    const raw: AiAdviceResponse = {
      summaryMm: 'စမ်းသပ်',
      riskLevel: 'healthy',
      riskDrivers: ['AI driver'],
      recommendedActions: [
        {
          title: 'Take a short loan',
          description: 'Borrow 200000 MMK tomorrow.',
          priority: 'high',
        },
        {
          title: 'Collect overdue customer payments',
          description: 'Use the overdue amount already on the books.',
          priority: 'high',
        },
      ],
      questionsForOwner: ['Are any bills missing?'],
      disclaimer: 'ignore me',
    }
    const cleaned = sanitizeAdvice(raw, sampleRequest())
    expect(cleaned.riskLevel).toBe('high')
    expect(cleaned.disclaimer).toBe(AI_ADVICE_DISCLAIMER)
    expect(cleaned.recommendedActions.map((item) => item.title)).toEqual([
      'Collect overdue customer payments',
    ])
  })

  it('parses JSON advice even when wrapped in fences', () => {
    const parsed = parseAdviceJson(`\`\`\`json
{"summaryMm":"အိုကေ","riskLevel":"watch","riskDrivers":["bills"],"recommendedActions":[{"title":"Collect overdue customer payments","description":"Call customers","priority":"high"}],"questionsForOwner":["Missing check-in?"],"disclaimer":"${AI_ADVICE_DISCLAIMER}"}
\`\`\``)
    expect(parsed?.riskLevel).toBe('watch')
  })

  it('explains why this prediction from engine fields only', () => {
    const why = buildWhyPrediction(sampleRequest())
    expect(why.dataUsed).toContain('Check-ins')
    expect(why.forecastMethod).toContain('run-rate')
    expect(why.mainAssumptions.length).toBeGreaterThan(0)
    expect(why.missingData[0]).toContain('missing')
    expect(why.confidenceLevel).toBe('Medium')
  })
})
