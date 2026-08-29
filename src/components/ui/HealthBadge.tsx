import { HEALTH_LABELS, type CashFlowHealthStatus } from '../../types/models'

const styles: Record<CashFlowHealthStatus, string> = {
  healthy: 'bg-healthy-bg text-healthy border-healthy/30',
  watch: 'bg-watch-bg text-watch border-watch/30',
  at_risk: 'bg-risk-bg text-risk border-risk/30',
  critical: 'bg-risk text-white border-risk',
}

export function HealthBadge({ status }: { status: CashFlowHealthStatus }) {
  return (
    <span
      className={`inline-flex rounded border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {HEALTH_LABELS[status]}
    </span>
  )
}
