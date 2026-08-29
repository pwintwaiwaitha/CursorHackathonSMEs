import { Link } from 'react-router-dom'
import type { PreferredLanguage } from '../../types/models'
import { pickLine } from '../../lib/checkInCopy'
import { DASHBOARD_COPY } from '../../lib/dashboardCopy'
import { formatDisplayDate } from '../../lib/dates'
import { formatHiddenMmk, type TodayActionItem } from '../../lib/dashboardMetrics'

export function HomeBestAction({
  language,
  item,
  hideAmounts,
  onComplete,
}: {
  language: PreferredLanguage
  item: TodayActionItem | null
  hideAmounts: boolean
  onComplete: (id: string) => void
}) {
  if (!item) {
    return null
  }

  return (
    <section className="rounded-[16px] border border-line bg-white px-3 py-3">
      <h2 className="text-lg font-semibold text-navy">
        {pickLine(DASHBOARD_COPY.bestAction, language)}
      </h2>
      <p className="mt-2 text-base font-semibold text-navy">
        {language === 'my' ? item.titleMy : item.titleEn}
      </p>
      <p className="mt-1 text-base font-bold text-navy">
        {formatHiddenMmk(hideAmounts, item.amountMmk)}
      </p>
      <p className="mt-1 text-base text-muted">
        {language === 'my' ? item.reasonMy : item.reasonEn}
      </p>
      <p className="mt-1 text-base text-ink">
        {pickLine(DASHBOARD_COPY.due, language)}: {formatDisplayDate(item.dueDate)}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          to={item.href}
          className="touch-target inline-flex items-center rounded-[14px] bg-navy px-4 font-semibold text-white"
        >
          {language === 'my' ? item.titleMy : item.titleEn}
        </Link>
        <button
          type="button"
          className="touch-target rounded-[14px] border border-navy px-4 font-semibold text-navy"
          onClick={() => onComplete(item.id)}
        >
          {pickLine(DASHBOARD_COPY.markDone, language)}
        </button>
      </div>
    </section>
  )
}
