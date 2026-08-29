import type { PreferredLanguage } from '../../types/models'
import { pickLine } from '../../lib/checkInCopy'
import { BANK_COPY } from '../../lib/bankCopy'
import { DemoBadge } from '../demo/DemoBadge'

export function BankConsentModal({
  language,
  busy,
  onConnect,
  onCancel,
}: {
  language: PreferredLanguage
  busy: boolean
  onConnect: () => void
  onCancel: () => void
}) {
  const permissions = [
    BANK_COPY.consentReadBalances,
    BANK_COPY.consentReadTxns,
    BANK_COPY.consentMatch,
    BANK_COPY.consentForecast,
  ]

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-navy/40 p-3 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={pickLine(BANK_COPY.consentTitle, language)}
        className="w-full max-w-md rounded-[16px] border border-line bg-white p-4 shadow-lg"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-navy">
            {pickLine(BANK_COPY.consentTitle, language)}
          </h2>
          <DemoBadge compact language={language} />
        </div>
        <p className="mt-2 text-sm font-semibold text-watch-ink">
          {pickLine(BANK_COPY.demonstrationOnly, language)}
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-base text-ink">
          {permissions.map((item) => (
            <li key={item.en}>{pickLine(item, language)}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">
          {pickLine(BANK_COPY.consentNotRequested, language)}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="touch-target rounded-[14px] border border-navy px-3 font-semibold text-navy"
            onClick={onCancel}
          >
            {pickLine(BANK_COPY.cancel, language)}
          </button>
          <button
            type="button"
            disabled={busy}
            className="touch-target rounded-[14px] bg-bank-blue px-3 font-semibold text-white disabled:bg-muted"
            onClick={onConnect}
          >
            {pickLine(BANK_COPY.connectDemo, language)}
          </button>
        </div>
      </div>
    </div>
  )
}
