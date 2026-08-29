import type { PreferredLanguage } from '../../types/models'
import { pickLine } from '../../lib/checkInCopy'
import { DASHBOARD_COPY } from '../../lib/dashboardCopy'
import { formatShortDate } from '../../lib/dates'
import { formatHiddenMmk, type TimelineDay } from '../../lib/dashboardMetrics'

export function HomeBalanceStrip({
  language,
  days,
  hideAmounts,
}: {
  language: PreferredLanguage
  days: TimelineDay[]
  hideAmounts: boolean
}) {
  if (days.length === 0) {
    return null
  }

  return (
    <section className="rounded-[16px] border border-line bg-white p-3">
      <h2 className="text-base font-semibold text-navy">
        {pickLine(DASHBOARD_COPY.weekTimeline, language)}
      </h2>
      <ol className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {days.map((day) => (
          <li
            key={day.date}
            className={`min-w-[3.5rem] flex-1 rounded-[10px] border px-1.5 py-2 text-center ${
              day.isPredictedLow
                ? 'border-watch bg-watch-bg text-watch-ink'
                : 'border-line bg-healthy-bg text-navy'
            }`}
          >
            <p className="text-xs font-semibold">{formatShortDate(day.date)}</p>
            <p className="mt-1 text-xs font-bold">
              {formatHiddenMmk(hideAmounts, day.predictedBalanceMmk)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
