import type { PreferredLanguage } from '../../types/models'
import { pickLine } from '../../lib/checkInCopy'
import { DASHBOARD_COPY } from '../../lib/dashboardCopy'

export function DemoBadge({
  compact = false,
  language = 'en',
}: {
  compact?: boolean
  language?: PreferredLanguage
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-watch bg-watch-bg font-semibold uppercase tracking-wide text-watch-ink ${
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      }`}
    >
      {compact ? 'DEMO' : pickLine(DASHBOARD_COPY.demoData, language)}
    </span>
  )
}
