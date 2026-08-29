import type { ConfidenceLevel } from '../../types/models'
import { CONFIDENCE_LABELS } from '../../types/models'

const rank: Record<ConfidenceLevel, number> = {
  very_low: 1,
  low: 2,
  medium: 3,
  high: 4,
}

const tone: Record<ConfidenceLevel, string> = {
  very_low: 'bg-risk',
  low: 'bg-watch',
  medium: 'bg-bank-blue',
  high: 'bg-healthy',
}

export function ConfidenceMeter({
  level,
  hint,
}: {
  level: ConfidenceLevel
  hint?: string
}) {
  const filled = rank[level]
  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <h2 className="font-semibold text-navy">Forecast confidence</h2>
      <p className="mt-1 text-2xl font-bold text-navy">{CONFIDENCE_LABELS[level]}</p>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-2.5 flex-1 rounded ${step <= filled ? tone[level] : 'bg-line'}`}
          />
        ))}
      </div>
      {hint ? <p className="mt-2 text-sm text-muted">{hint}</p> : null}
    </section>
  )
}
