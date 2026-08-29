import { Eye, EyeOff } from 'lucide-react'
import type { PreferredLanguage } from '../../types/models'
import { pickLine } from '../../lib/checkInCopy'
import { DASHBOARD_COPY } from '../../lib/dashboardCopy'
import { formatDisplayDate } from '../../lib/dates'
import { formatMmk } from '../../lib/money'
import type { OwnerStatusKind } from '../../lib/ownerJourney'
import {
  formatHiddenMmk,
  type SafeToSpendResult,
} from '../../lib/dashboardMetrics'

const STATUS_BOX: Record<OwnerStatusKind, string> = {
  safe: 'border-leaf bg-healthy-bg text-navy',
  attention: 'border-watch bg-watch-bg text-watch-ink',
  high_risk: 'border-risk bg-risk-bg text-risk',
}

export function HomeSafeToSpend({
  language,
  sts,
  status,
  hideAmounts,
  onToggleHide,
  shortageDate,
  shortageAmountMmk,
}: {
  language: PreferredLanguage
  sts: SafeToSpendResult
  status: OwnerStatusKind
  hideAmounts: boolean
  onToggleHide: () => void
  shortageDate: string | null
  shortageAmountMmk: number
}) {
  const statusLabel =
    status === 'high_risk'
      ? pickLine(DASHBOARD_COPY.statusRisk, language)
      : status === 'attention'
        ? pickLine(DASHBOARD_COPY.statusWatch, language)
        : pickLine(DASHBOARD_COPY.statusHealthy, language)
  const cause =
    sts.gapCause === 'supplier_before_collections'
      ? pickLine(DASHBOARD_COPY.gapSupplier, language)
      : sts.gapCause === 'large_bills'
        ? pickLine(DASHBOARD_COPY.gapBills, language)
        : null

  return (
    <section className="rounded-[16px] bg-navy p-3 text-white shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-base font-semibold uppercase tracking-wide text-white">
          {pickLine(DASHBOARD_COPY.safeToSpend, language)}
        </p>
        <button
          type="button"
          className="touch-target inline-flex items-center gap-2 rounded-[14px] bg-white/10 px-3 text-base font-semibold text-white"
          onClick={onToggleHide}
          aria-pressed={hideAmounts}
        >
          {hideAmounts ? <EyeOff size={20} /> : <Eye size={20} />}
          {pickLine(
            hideAmounts ? DASHBOARD_COPY.showAmounts : DASHBOARD_COPY.hideAmounts,
            language,
          )}
        </button>
      </div>
      <p className="mt-2 text-4xl font-bold leading-none tracking-tight sm:text-5xl">
        {formatHiddenMmk(hideAmounts, sts.safeToSpendMmk)}
      </p>
      <div
        className={`mt-3 rounded-[14px] border px-3 py-2 text-base font-semibold ${STATUS_BOX[status]}`}
        aria-live="polite"
      >
        {statusLabel}
      </div>
      {status === 'high_risk' ? (
        <dl className="mt-2 space-y-1 rounded-[14px] bg-risk-bg px-3 py-2 text-base text-risk">
          {shortageDate ? (
            <div>
              <dt className="font-semibold">{pickLine(DASHBOARD_COPY.nextShortage, language)}</dt>
              <dd>{formatDisplayDate(shortageDate)}</dd>
            </div>
          ) : null}
          {shortageAmountMmk > 0 ? (
            <div>
              <dt className="font-semibold">{pickLine(DASHBOARD_COPY.shortageAmount, language)}</dt>
              <dd>{hideAmounts ? '•••• MMK' : formatMmk(shortageAmountMmk)}</dd>
            </div>
          ) : null}
          {cause ? (
            <div>
              <dt className="font-semibold">{pickLine(DASHBOARD_COPY.oneCause, language)}</dt>
              <dd>{cause}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </section>
  )
}
