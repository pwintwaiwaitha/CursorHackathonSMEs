import { Link } from 'react-router-dom'
import type { PreferredLanguage } from '../../types/models'
import { bilingualLine, pickLine } from '../../lib/checkInCopy'
import { DASHBOARD_COPY } from '../../lib/dashboardCopy'
import { formatDisplayDate } from '../../lib/dates'
import {
  formatHiddenMmk,
  type ActionPriority,
  type TodayActionItem,
} from '../../lib/dashboardMetrics'

const PRIORITY_LABEL: Record<ActionPriority, { en: string; my: string }> = {
  high: { en: 'High', my: 'မြင့်' },
  medium: { en: 'Medium', my: 'အလယ်' },
  low: { en: 'Low', my: 'နိမ့်' },
}

export function TodayActionCenter({
  language,
  items,
  hideAmounts,
  onComplete,
}: {
  language: PreferredLanguage
  items: TodayActionItem[]
  hideAmounts: boolean
  onComplete: (id: string) => void
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-navy">
        {pickLine(DASHBOARD_COPY.actionCenter, language)}
      </h2>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-[16px] border border-line bg-white px-3 py-3"
          >
            <p className="text-base font-semibold text-navy">
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
              {' · '}
              {pickLine(DASHBOARD_COPY.priority, language)}:{' '}
              {language === 'my'
                ? PRIORITY_LABEL[item.priority].my
                : PRIORITY_LABEL[item.priority].en}
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
                {bilingualLine(DASHBOARD_COPY.markDone, language)}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
