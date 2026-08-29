import { formatMmk } from '../../lib/money'

interface StatCardProps {
  label: string
  value: number | string
  hint?: string
  tone?: 'default' | 'healthy' | 'watch' | 'risk'
}

const toneClass = {
  default: 'border-line bg-white',
  healthy: 'border-healthy/30 bg-healthy-bg',
  watch: 'border-watch/30 bg-watch-bg',
  risk: 'border-risk/30 bg-risk-bg',
}

export function StatCard({ label, value, hint, tone = 'default' }: StatCardProps) {
  const display = typeof value === 'number' ? formatMmk(value) : value

  return (
    <article className={`rounded-lg border p-4 ${toneClass[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold text-ink">{display}</p>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
    </article>
  )
}
