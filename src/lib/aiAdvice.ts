import { z } from 'zod'
import type { AppStore } from '../storage/types'
import type { ForecastResult } from '../types/models'
import { CONFIDENCE_LABELS, FORECAST_KINDS } from '../types/models'
import type { ForecastLevel } from './forecastEngine'
import {
  forecastMethodDescription,
  rollingAverageInflowsMmk,
  rollingAverageOutflowsMmk,
} from './forecastEngine'
import { expenseCategoryChartData } from './dashboardData'
import { formatMmk } from './money'
import {
  derivePayableStatus,
  remainingPayableMmk,
  remainingReceivableMmk,
  totalOverdueReceivablesMmk,
  totalUpcomingPayablesMmk,
} from './schedule'

export const AI_ADVICE_DISCLAIMER =
  'This is a planning estimate, not guaranteed financial advice.'

export const ADVICE_RISK_LEVELS = ['healthy', 'watch', 'high'] as const
export type AdviceRiskLevel = (typeof ADVICE_RISK_LEVELS)[number]

export const ACTION_PRIORITIES = ['high', 'medium', 'low'] as const
export type ActionPriority = (typeof ACTION_PRIORITIES)[number]

const mmkInt = z.number().int().max(1_000_000_000_000).min(-1_000_000_000_000)

export const aiAdviceRequestSchema = z
  .object({
    view: z.object({
      levelId: z.string().min(1).max(48),
      label: z.string().min(1).max(80),
      family: z.enum(['Forecast', 'Projection', 'Strategic Scenario']),
      kind: z.enum(FORECAST_KINDS),
      horizonDays: z.number().int().min(1).max(20_000),
      startDate: z.string().min(8).max(32),
      endDate: z.string().min(8).max(32),
    }),
    amounts: z.object({
      startingBalanceMmk: mmkInt,
      predictedClosingCashMmk: mmkInt,
      lowestPredictedCashMmk: mmkInt,
      shortageAmountMmk: z.number().int().min(0).max(1_000_000_000_000),
      overdueReceivablesMmk: z.number().int().min(0).max(1_000_000_000_000),
      upcomingPayablesMmk: z.number().int().min(0).max(1_000_000_000_000),
      topExpenseAmountMmk: z.number().int().min(0).max(1_000_000_000_000),
      emergencyReserveTargetMmk: z.number().int().min(0).max(1_000_000_000_000),
    }),
    dates: z.object({
      shortageDate: z.string().max(32).nullable(),
    }),
    labels: z.object({
      topExpenseCategory: z.string().max(80).nullable(),
      nextSupplierName: z.string().max(80).nullable(),
      nextCustomerName: z.string().max(80).nullable(),
    }),
    engine: z.object({
      risk: z.enum(['low', 'medium', 'high']),
      confidenceLevel: z.enum(['high', 'medium', 'low', 'very_low']),
      dataPeriodUsed: z.string().max(240),
      forecastMethod: z.string().max(480),
      mainAssumptions: z.array(z.string().max(240)).max(12),
      missingDataWarnings: z.array(z.string().max(240)).max(12),
      mainRiskDrivers: z.array(z.string().max(240)).max(12),
    }),
    flags: z.object({
      hasOverdueReceivables: z.boolean(),
      supplierDueBeforeCustomer: z.boolean(),
      dailyOutExceedsIn: z.boolean(),
      belowReserve: z.boolean(),
      hasSlowStockHint: z.boolean(),
    }),
  })
  .strict()

export type AiAdviceRequest = z.infer<typeof aiAdviceRequestSchema>

const recommendedActionSchema = z.object({
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().min(2).max(400),
  priority: z.enum(ACTION_PRIORITIES),
})

export const aiAdviceResponseSchema = z.object({
  summaryMm: z.string().trim().min(2).max(600),
  riskLevel: z.enum(ADVICE_RISK_LEVELS),
  riskDrivers: z.array(z.string().trim().min(2).max(240)).min(1).max(8),
  recommendedActions: z.array(recommendedActionSchema).min(1).max(8),
  questionsForOwner: z.array(z.string().trim().min(2).max(200)).max(8),
  disclaimer: z.string().trim().min(2).max(240),
})

export type AiAdviceResponse = z.infer<typeof aiAdviceResponseSchema>

export const aiAdviceApiResponseSchema = z.object({
  source: z.enum(['ai', 'fallback']),
  advice: aiAdviceResponseSchema,
})

export type AiAdviceApiResponse = z.infer<typeof aiAdviceApiResponseSchema>

export function mapEngineRisk(risk: 'low' | 'medium' | 'high'): AdviceRiskLevel {
  if (risk === 'high') {
    return 'high'
  }
  if (risk === 'medium') {
    return 'watch'
  }
  return 'healthy'
}

const LOAN_PUSH = /\b(take|get|apply for|take out)\b.{0,24}\b(loan|borrow)/i
const LOAN_WORD = /\b(loan|borrow|microfinance|ချေးငွေ)\b/i
const BANK_TALK = /bank professional|discuss financing|ဆွေးနွေး/i

export function actionPushesLoan(title: string, description: string): boolean {
  const text = `${title} ${description}`
  if (BANK_TALK.test(text)) {
    return false
  }
  return LOAN_PUSH.test(text) || LOAN_WORD.test(text)
}

export function sanitizeAdvice(
  raw: AiAdviceResponse,
  request: AiAdviceRequest,
): AiAdviceResponse {
  const riskLevel = mapEngineRisk(request.engine.risk)
  const drivers =
    raw.riskDrivers.length > 0 ? raw.riskDrivers.slice(0, 8) : request.engine.mainRiskDrivers
  const actions = raw.recommendedActions.filter(
    (item) => !actionPushesLoan(item.title, item.description),
  )
  return {
    summaryMm: raw.summaryMm,
    riskLevel,
    riskDrivers: drivers.length > 0 ? drivers : ['The forecast engine did not flag a single large leak.'],
    recommendedActions: actions.length > 0 ? actions : buildFallbackAdvice(request).recommendedActions,
    questionsForOwner: raw.questionsForOwner.slice(0, 8),
    disclaimer: AI_ADVICE_DISCLAIMER,
  }
}

export function parseAdviceJson(text: string): AiAdviceResponse | null {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1].trim() : trimmed
  try {
    const parsed: unknown = JSON.parse(candidate)
    const result = aiAdviceResponseSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

type LevelBits = Pick<
  ForecastLevel,
  'id' | 'label' | 'family' | 'kind' | 'usesRunRate' | 'usesGrowth' | 'strategic' | 'horizonDays'
>

export function buildAiAdviceRequest(
  store: AppStore,
  forecast: ForecastResult,
  level: LevelBits,
): AiAdviceRequest {
  const today = forecast.startDate
  const overdueReceivablesMmk = totalOverdueReceivablesMmk(store.receivables, today)
  const upcomingPayablesMmk = totalUpcomingPayablesMmk(store.payables, today, 30)
  const expenses = expenseCategoryChartData(store)
  const top = expenses[0]
  const openPayables = store.payables.filter(
    (item) => remainingPayableMmk({ ...item, status: derivePayableStatus(item, today) }) > 0,
  )
  const openReceivables = store.receivables.filter((item) => remainingReceivableMmk(item) > 0)
  const nextPayable = [...openPayables].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
  const nextReceivable = [...openReceivables].sort((a, b) =>
    a.expectedPaymentDate.localeCompare(b.expectedPaymentDate),
  )[0]
  const supplierDueBeforeCustomer = Boolean(
    nextPayable &&
      nextReceivable &&
      nextPayable.dueDate < nextReceivable.expectedPaymentDate,
  )
  const dailyIn = rollingAverageInflowsMmk(store.checkIns)
  const dailyOut = rollingAverageOutflowsMmk(store.checkIns)
  const assumptions = store.scenarios
  const mainAssumptions: string[] = [
    `Customer collection rate ${assumptions.customerCollectionRatePercent}%.`,
    `Collection delay ${assumptions.collectionDelayDays} day(s).`,
  ]
  if (level.usesGrowth) {
    mainAssumptions.push(
      `Revenue growth ${assumptions.revenueGrowthRatePercent}% and expense growth ${assumptions.expenseGrowthRatePercent}%.`,
      `Inflation ${assumptions.inflationRatePercent}%.`,
    )
  }
  if (assumptions.emergencyCashReserveTargetMmk > 0) {
    mainAssumptions.push(
      `Emergency reserve target ${formatMmk(assumptions.emergencyCashReserveTargetMmk)}.`,
    )
  }
  if (assumptions.extraStockPurchaseMmk > 0) {
    mainAssumptions.push(`Extra stock purchase in plan: ${formatMmk(assumptions.extraStockPurchaseMmk)}.`)
  }
  if (assumptions.plannedLoanMmk > 0 || assumptions.extraLoanInflowMmk > 0) {
    mainAssumptions.push(
      `Owner entered a planned loan figure in scenarios. The engine includes it as cash in; this is not a loan recommendation.`,
    )
  }

  return aiAdviceRequestSchema.parse({
    view: {
      levelId: level.id,
      label: forecast.label,
      family: level.family,
      kind: level.kind,
      horizonDays: forecast.horizonDays,
      startDate: forecast.startDate,
      endDate: forecast.endDate,
    },
    amounts: {
      startingBalanceMmk: forecast.startingBalanceMmk,
      predictedClosingCashMmk: forecast.predictedClosingCashMmk,
      lowestPredictedCashMmk: forecast.lowestPredictedCashMmk,
      shortageAmountMmk: forecast.shortageAmountMmk,
      overdueReceivablesMmk,
      upcomingPayablesMmk,
      topExpenseAmountMmk: top?.amountMmk ?? 0,
      emergencyReserveTargetMmk: assumptions.emergencyCashReserveTargetMmk,
    },
    dates: {
      shortageDate: forecast.shortageDate,
    },
    labels: {
      topExpenseCategory: top?.name ?? null,
      nextSupplierName: nextPayable?.supplierName ?? null,
      nextCustomerName: nextReceivable?.customerName ?? null,
    },
    engine: {
      risk: forecast.risk,
      confidenceLevel: forecast.confidenceLevel,
      dataPeriodUsed: forecast.dataPeriodUsed,
      forecastMethod: forecastMethodDescription(level),
      mainAssumptions,
      missingDataWarnings: forecast.missingDataWarnings.slice(0, 12),
      mainRiskDrivers: forecast.mainRiskDrivers.slice(0, 12),
    },
    flags: {
      hasOverdueReceivables: overdueReceivablesMmk > 0,
      supplierDueBeforeCustomer,
      dailyOutExceedsIn: dailyOut > dailyIn && dailyOut > 0,
      belowReserve:
        assumptions.emergencyCashReserveTargetMmk > 0 &&
        forecast.lowestPredictedCashMmk < assumptions.emergencyCashReserveTargetMmk,
      hasSlowStockHint:
        assumptions.extraStockPurchaseMmk > 0 ||
        (top?.name.toLowerCase().includes('stock') ?? false) ||
        (top?.name.toLowerCase().includes('inventory') ?? false),
    },
  })
}

export function buildFallbackAdvice(request: AiAdviceRequest): AiAdviceResponse {
  const riskLevel = mapEngineRisk(request.engine.risk)
  const { amounts, dates, labels, flags } = request
  const actions: AiAdviceResponse['recommendedActions'] = []

  if (flags.hasOverdueReceivables) {
    actions.push({
      title: 'Collect overdue customer payments',
      description: labels.nextCustomerName
        ? `Ask ${labels.nextCustomerName} and other overdue customers to pay. Overdue on the books: ${formatMmk(amounts.overdueReceivablesMmk)}.`
        : `Collect overdue customer money now. Overdue on the books: ${formatMmk(amounts.overdueReceivablesMmk)}.`,
      priority: 'high',
    })
  }

  if (flags.supplierDueBeforeCustomer || dates.shortageDate) {
    actions.push({
      title: 'Postpone non-essential stock orders',
      description:
        'Delay stock that is not needed for this week’s sales so cash can cover bills that are already due.',
      priority: dates.shortageDate ? 'high' : 'medium',
    })
  }

  if (flags.hasSlowStockHint || flags.dailyOutExceedsIn) {
    actions.push({
      title: 'Discount slow-moving stock',
      description: 'Turn slow goods into cash with a short discount, then pause extra buying.',
      priority: 'medium',
    })
  }

  if (labels.topExpenseCategory && amounts.topExpenseAmountMmk > 0 && flags.dailyOutExceedsIn) {
    actions.push({
      title: `Reduce ${labels.topExpenseCategory} spend`,
      description: `This is the largest recorded expense group (${formatMmk(amounts.topExpenseAmountMmk)}). Cut or delay the non-essential part only.`,
      priority: 'medium',
    })
  }

  if (labels.nextSupplierName && (flags.supplierDueBeforeCustomer || dates.shortageDate)) {
    actions.push({
      title: 'Negotiate a supplier payment date',
      description: `Ask ${labels.nextSupplierName} if part of the bill can move a few days, after you show a clear pay date.`,
      priority: 'medium',
    })
  }

  if (flags.belowReserve || riskLevel === 'watch') {
    actions.push({
      title: 'Build an emergency cash reserve',
      description:
        amounts.emergencyReserveTargetMmk > 0
          ? `Keep cash moving toward the reserve target of ${formatMmk(amounts.emergencyReserveTargetMmk)}.`
          : 'Hold a small cash buffer for rent, wages and sudden bills.',
      priority: 'low',
    })
  }

  if (riskLevel === 'high' && amounts.shortageAmountMmk > 0) {
    actions.push({
      title: 'Discuss financing options with a bank professional',
      description:
        'If collecting and delaying buying still leave a gap, talk with a bank professional. This app does not tell you to take a loan.',
      priority: 'low',
    })
  }

  if (actions.length === 0) {
    actions.push({
      title: 'Keep Daily Cash Check-in complete',
      description: 'Save each day’s cash in and cash out so this forecast stays tied to real books.',
      priority: 'low',
    })
  }

  const questions: string[] = []
  for (const warning of request.engine.missingDataWarnings) {
    if (warning.toLowerCase().includes('check-in')) {
      questions.push('Which days are missing a Daily Cash Check-in?')
    }
    if (warning.toLowerCase().includes('credit')) {
      questions.push('When will credit sales actually be collected as cash?')
    }
  }
  if (amounts.upcomingPayablesMmk > 0 && !labels.nextSupplierName) {
    questions.push('Which supplier bills are still unpaid, and on which dates?')
  }
  if (questions.length === 0) {
    questions.push('Are any large bills or customer payments missing from the books?')
  }

  let summaryMm = `ခန့်မှန်းပိတ်ငွေ ${formatMmk(amounts.predictedClosingCashMmk)} ဖြစ်ပါသည်။ အန္တရာယ်အဆင့်မှာ ${riskLevel} ဖြစ်သည်။`
  if (riskLevel === 'high' && dates.shortageDate) {
    summaryMm = `ငွေသားပြတ်လပ်နိုင်သည်။ ခန့်မှန်းပြတ်ငွေ ${formatMmk(amounts.shortageAmountMmk)}၊ နေ့ရက် ${dates.shortageDate}။ အကြွေးကောက်ယူပြီး မလိုအပ်သောပစ္စည်းဝယ်ယူမှုကို ရွှေ့ဆိုင်းပါ။`
  } else if (riskLevel === 'watch') {
    summaryMm = `ငွေသားကျပ်တည်းနိုင်သည်။ လက်ရှိငွေ ${formatMmk(amounts.startingBalanceMmk)}၊ အနိမ့်ဆုံးခန့်မှန်းငွေ ${formatMmk(amounts.lowestPredictedCashMmk)}။ အကြွေးနှင့် ဘီလ်များကို စောင့်ကြည့်ပါ။`
  } else {
    summaryMm = `လက်ရှိစာရင်းအရ လာမည့်ကာလတွင် ငွေသားလုံလောက်နိုင်ပါသည်။ ပိတ်ငွေခန့်မှန်း ${formatMmk(amounts.predictedClosingCashMmk)}။`
  }

  return {
    summaryMm,
    riskLevel,
    riskDrivers:
      request.engine.mainRiskDrivers.length > 0
        ? request.engine.mainRiskDrivers
        : ['No single large cash leak was flagged by the forecast engine.'],
    recommendedActions: actions.slice(0, 8),
    questionsForOwner: [...new Set(questions)].slice(0, 6),
    disclaimer: AI_ADVICE_DISCLAIMER,
  }
}

export interface WhyPredictionModel {
  dataUsed: string
  forecastMethod: string
  mainAssumptions: string[]
  missingData: string[]
  confidenceLevel: string
}

export function buildWhyPrediction(request: AiAdviceRequest): WhyPredictionModel {
  return {
    dataUsed: request.engine.dataPeriodUsed,
    forecastMethod: request.engine.forecastMethod,
    mainAssumptions: request.engine.mainAssumptions,
    missingData:
      request.engine.missingDataWarnings.length > 0
        ? request.engine.missingDataWarnings
        : ['No extra missing-data warnings for this view.'],
    confidenceLevel: CONFIDENCE_LABELS[request.engine.confidenceLevel],
  }
}

export function buildAdviceSystemPrompt(): string {
  return [
    'You explain SME cash-flow forecast results for a Myanmar shop owner.',
    'The forecast engine already calculated every MMK amount. Never invent, round into a new figure, or recalculate amounts.',
    'Only quote MMK figures that appear in the JSON you receive.',
    'Write summaryMm in simple Myanmar. Keep recommended action titles in English as specified.',
    'Recommend practical actions from: collect overdue customer payments; postpone non-essential stock orders; reduce a named expense category from the payload; negotiate a supplier payment date; build an emergency cash reserve; discount slow-moving stock.',
    'Never recommend taking a loan, borrowing, or applying for credit. You may suggest discussing financing options with a bank professional only when shortageAmountMmk is greater than zero.',
    'Return JSON only with keys: summaryMm, riskLevel, riskDrivers, recommendedActions, questionsForOwner, disclaimer.',
    `disclaimer must be exactly: ${AI_ADVICE_DISCLAIMER}`,
    'riskLevel must be healthy, watch, or high.',
    'Each recommendedActions item has title, description, priority (high|medium|low).',
  ].join(' ')
}
