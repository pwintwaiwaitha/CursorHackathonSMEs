import { Eye, EyeOff } from 'lucide-react'
import type { PreferredLanguage } from '../../types/models'
import { CONFIDENCE_LABELS, type ConfidenceLevel } from '../../types/models'
import { bilingualLine, pickLine } from '../../lib/checkInCopy'
import { DASHBOARD_COPY } from '../../lib/dashboardCopy'
import {
  formatHiddenMmk,
  type HubStatus,
  type SafeToSpendResult,
} from '../../lib/dashboardMetrics'

const statusBox: Record<HubStatus['kind'], string> = {
  safe_14: 'border-leaf bg-healthy-bg text-navy',
  needs_attention: 'border-gold bg-gold-bg text-watch-ink',
  shortage: 'border-risk bg-risk-bg text-risk',
}

export function CashHub({
  language,
  sts,
  status,
  confidence,
  lastUpdatedLabel,
  hideAmounts,
  onToggleHide,
}: {
  language: PreferredLanguage
  sts: SafeToSpendResult
  status: HubStatus
  confidence: ConfidenceLevel
  lastUpdatedLabel: string
  hideAmounts: boolean
  onToggleHide: () => void
}) {
  const money = (amount: number) => formatHiddenMmk(hideAmounts, amount)
  const statusText = language === 'my' ? status.sentenceMy : status.sentenceEn
  const gapText =
    sts.gapCause === 'supplier_before_collections'
      ? bilingualLine(DASHBOARD_COPY.gapSupplier, language)
      : bilingualLine(DASHBOARD_COPY.gapBills, language)

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
      <p className="mt-1 text-4xl font-bold leading-none tracking-tight sm:text-5xl">
        {money(sts.safeToSpendMmk)}
      </p>

      <div
        className={`mt-3 rounded-[14px] border px-3 py-2 text-base font-semibold ${statusBox[status.kind]}`}
        aria-live="polite"
      >
        <span className="block">{statusText}</span>
        {language === 'my' ? (
          <span className="mt-0.5 block font-medium opacity-90">{status.sentenceEn}</span>
        ) : null}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-base">
        <div className="rounded-[14px] bg-white/10 px-3 py-2">
          <dt className="text-white/85">{pickLine(DASHBOARD_COPY.currentCash, language)}</dt>
          <dd className="font-bold">{money(sts.currentCashMmk)}</dd>
        </div>
        <div className="rounded-[14px] bg-white/10 px-3 py-2">
          <dt className="text-white/85">{pickLine(DASHBOARD_COPY.reservedBills, language)}</dt>
          <dd className="font-bold">{money(sts.essentialBills7dMmk)}</dd>
        </div>
        <div className="rounded-[14px] bg-white/10 px-3 py-2">
          <dt className="text-white/85">{pickLine(DASHBOARD_COPY.emergencyReserve, language)}</dt>
          <dd className="font-bold">{money(sts.emergencyReserveMmk)}</dd>
        </div>
        {sts.isNegative ? (
          <div className="rounded-[14px] bg-gold-bg px-3 py-2 text-watch-ink">
            <dt className="font-semibold">{pickLine(DASHBOARD_COPY.cashGap, language)}</dt>
            <dd className="font-bold">{money(sts.expectedCashGapMmk)}</dd>
          </div>
        ) : (
          <div className="rounded-[14px] bg-white/10 px-3 py-2">
            <dt className="text-white/85">{pickLine(DASHBOARD_COPY.confidence, language)}</dt>
            <dd className="font-bold">{CONFIDENCE_LABELS[confidence]}</dd>
          </div>
        )}
      </dl>

      {sts.isNegative ? (
        <p className="mt-2 rounded-[14px] bg-gold-bg px-3 py-2 text-base font-medium text-watch-ink">
          {gapText}
        </p>
      ) : null}

      <details className="mt-3 rounded-[14px] bg-white/10 px-3 py-2">
        <summary className="cursor-pointer text-base font-semibold">
          {pickLine(DASHBOARD_COPY.whyAmount, language)}
        </summary>
        <p className="mt-2 text-base leading-snug text-white">
          {pickLine(DASHBOARD_COPY.whyAmountBody, language)}
        </p>
        {language === 'my' ? (
          <p className="mt-2 text-base leading-snug text-white/90">
            {DASHBOARD_COPY.whyAmountBody.en}
          </p>
        ) : null}
      </details>

      <p className="mt-2 text-base text-white/85">
        {pickLine(DASHBOARD_COPY.lastUpdated, language)} · {lastUpdatedLabel}
        {sts.isNegative ? ` · ${CONFIDENCE_LABELS[confidence]}` : null}
      </p>
    </section>
  )
}
