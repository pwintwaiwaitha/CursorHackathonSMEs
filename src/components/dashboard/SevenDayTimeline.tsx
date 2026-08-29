import type { PreferredLanguage } from '../../types/models'
import { pickLine } from '../../lib/checkInCopy'
import { DASHBOARD_COPY } from '../../lib/dashboardCopy'
import { formatShortDate } from '../../lib/dates'
import { formatHiddenMmk, type TimelineDay } from '../../lib/dashboardMetrics'

export function SevenDayTimeline({
  language,
  days,
  hideAmounts,
}: {
  language: PreferredLanguage
  days: TimelineDay[]
  hideAmounts: boolean
}) {
  return (
    <section className="rounded-[16px] border border-line bg-white p-3">
      <h2 className="text-lg font-semibold text-navy">
        {pickLine(DASHBOARD_COPY.weekTimeline, language)}
      </h2>
      <ol className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {days.map((day) => {
          const hasIn = day.customerInMmk > 0
          const hasSupplier = day.supplierOutMmk > 0
          const hasBill = day.billsOutMmk > 0
          return (
            <li
              key={day.date}
              className={`min-w-[7.25rem] flex-1 rounded-[14px] border px-2 py-2 ${
                day.isPredictedLow
                  ? 'border-gold bg-gold-bg text-watch-ink'
                  : 'border-line bg-pale text-ink'
              }`}
            >
              <p className="text-base font-semibold">{formatShortDate(day.date)}</p>
              {day.isPredictedLow ? (
                <p className="text-base font-semibold">
                  {pickLine(DASHBOARD_COPY.lowCashDay, language)}
                </p>
              ) : null}
              {hasIn ? (
                <p className="mt-1 text-base">
                  In {formatHiddenMmk(hideAmounts, day.customerInMmk)}
                </p>
              ) : null}
              {hasSupplier ? (
                <p className="text-base">
                  Supplier {formatHiddenMmk(hideAmounts, day.supplierOutMmk)}
                </p>
              ) : null}
              {hasBill ? (
                <p className="text-base">
                  Bill {formatHiddenMmk(hideAmounts, day.billsOutMmk)}
                </p>
              ) : null}
              {!hasIn && !hasSupplier && !hasBill && !day.isPredictedLow ? (
                <p className="mt-1 text-base text-muted">—</p>
              ) : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
