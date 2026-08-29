import { useEffect, useMemo, useState } from 'react'
import {
  aiAdviceRequestSchema,
  buildFallbackAdvice,
  buildWhyPrediction,
  mapEngineRisk,
  type AiAdviceApiResponse,
  type AiAdviceRequest,
  type AiAdviceResponse,
} from '../../lib/aiAdvice'
import { requestAiAdvice } from '../../lib/aiAdviceClient'
import { EmptyState } from '../ui/EmptyState'
import { LoadingBlock } from '../ui/LoadingBlock'
import { WhyPrediction } from './WhyPrediction'

const priorityClass = {
  high: 'bg-risk text-white',
  medium: 'bg-watch-bg text-watch-ink',
  low: 'bg-navy text-white',
}

const riskClass = {
  healthy: 'text-healthy',
  watch: 'text-watch-ink',
  high: 'text-risk',
}

export function AiAdvicePanel({
  payload,
  locked,
}: {
  payload: AiAdviceRequest | null
  locked?: boolean
}) {
  const why = payload ? buildWhyPrediction(payload) : null
  const [fetched, setFetched] = useState<{ key: string; data: AiAdviceApiResponse } | null>(null)
  const payloadKey = useMemo(() => (payload ? JSON.stringify(payload) : ''), [payload])

  useEffect(() => {
    if (!payloadKey || locked) {
      return
    }
    let cancelled = false
    const parsed = aiAdviceRequestSchema.parse(JSON.parse(payloadKey) as unknown)
    void requestAiAdvice(parsed).then((data) => {
      if (!cancelled) {
        setFetched({ key: payloadKey, data })
      }
    })
    return () => {
      cancelled = true
    }
  }, [payloadKey, locked])

  const result = payloadKey && !locked && fetched?.key === payloadKey ? fetched.data : null
  const loading = Boolean(payloadKey && !locked && fetched?.key !== payloadKey)

  if (locked || !payload) {
    return (
      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="font-semibold text-navy">AI recommendations</h2>
        <EmptyState
          title="Advice waits for an unlocked view"
          message="The forecast engine must finish first. AI only explains those numbers; it does not invent amounts."
        />
      </section>
    )
  }

  const advice: AiAdviceResponse = result?.advice ?? buildFallbackAdvice(payload)
  const source = result?.source ?? 'fallback'

  return (
    <section className="space-y-3 rounded-lg border border-line bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-navy">AI recommendations</h2>
          <p className="mt-1 text-xs text-muted">
            Numbers come from the forecast engine. AI only explains them.
            {source === 'fallback'
              ? ' Rule-based guidance is shown when the AI service is unavailable.'
              : ' Written by the AI layer from validated forecast data.'}
          </p>
        </div>
        {why ? <WhyPrediction why={why} /> : null}
      </div>

      {loading && !result ? (
        <LoadingBlock label="Writing recommendations from the forecast…" />
      ) : null}

      <p className={`text-lg font-semibold ${riskClass[mapEngineRisk(payload.engine.risk)]}`}>
        {advice.summaryMm}
      </p>
      <p className="text-sm text-muted">
        Risk level: <strong className="text-ink">{advice.riskLevel}</strong>
      </p>

      <div>
        <h3 className="text-sm font-semibold text-navy">Risk drivers</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink">
          {advice.riskDrivers.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-navy">Recommended actions</h3>
        {advice.recommendedActions.map((item) => (
          <article key={item.title} className="rounded-md border border-line p-3">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold text-navy">{item.title}</h4>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${priorityClass[item.priority]}`}>
                {item.priority}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink">{item.description}</p>
          </article>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-navy">Questions for the owner</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink">
          {advice.questionsForOwner.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted">{advice.disclaimer}</p>
    </section>
  )
}
