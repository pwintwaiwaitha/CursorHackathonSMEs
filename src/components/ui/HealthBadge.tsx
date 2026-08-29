import { HEALTH_LABELS, type CashFlowHealthStatus } from '../../types/models'

const styles: Record<CashFlowHealthStatus, string> = {
  healthy: 'bg-healthy text-white border-healthy',
  watch: 'bg-watch-bg text-watch-ink border-watch',
  at_risk: 'bg-risk text-white border-risk',
  critical: 'bg-risk text-white border-risk',
}

export function HealthBadge({
  status,
  size = 'normal',
}: {
  status: CashFlowHealthStatus
  size?: 'normal' | 'large'
}) {
  return (
    <span
      className={`inline-flex rounded border font-semibold ${styles[status]} ${
        size === 'large' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
      }`}
    >
      {HEALTH_LABELS[status]}
    </span>
  )
}
