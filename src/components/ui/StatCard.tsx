import { formatMmk } from '../../lib/money'

interface StatCardProps {
  label: string
  value: number | string
  hint?: string
  tone?: 'default' | 'healthy' | 'watch' | 'risk'
}

const toneClass = {
  default: 'border-line bg-white',
  healthy: 'border-healthy bg-healthy-bg',
  watch: 'border-watch bg-watch-bg',
  risk: 'border-risk bg-risk-bg',
}

const barClass = {
  default: 'bg-navy',
  healthy: 'bg-healthy',
  watch: 'bg-watch',
  risk: 'bg-risk',
}

export function StatCard({ label, value, hint, tone = 'default' }: StatCardProps) {
  const display = typeof value === 'number' ? formatMmk(value) : value

  const valueTone =
    tone === 'watch' ? 'text-watch-ink' : tone === 'risk' ? 'text-risk' : 'text-navy'

  return (
    <article className={`overflow-hidden rounded-lg border shadow-sm ${toneClass[tone]}`}>
      <div className={`h-1.5 ${barClass[tone]}`} />
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <p className={`mt-2 text-3xl font-bold leading-tight tracking-tight ${valueTone}`}>
          {display}
        </p>
        {hint ? <p className="mt-1.5 text-sm text-muted">{hint}</p> : null}
      </div>
    </article>
  )
}
