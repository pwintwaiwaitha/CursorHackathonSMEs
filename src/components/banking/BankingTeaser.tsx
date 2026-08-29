import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Landmark } from 'lucide-react'
import type { PreferredLanguage } from '../../types/models'
import { pickLine } from '../../lib/checkInCopy'
import { BANK_COPY } from '../../lib/bankCopy'
import { formatHiddenMmk } from '../../lib/dashboardMetrics'
import { formatDisplayDate } from '../../lib/dates'
import { ROUTES } from '../../lib/routes'
import { useBanking } from '../../hooks/useBanking'
import { DemoBadge } from '../demo/DemoBadge'
import { BankConsentModal } from './BankConsentModal'

export function BankingTeaser({
  language,
  hideAmounts,
  emergencyReserveMmk,
}: {
  language: PreferredLanguage
  hideAmounts: boolean
  emergencyReserveMmk: number
}) {
  const banking = useBanking()
  const [consentOpen, setConsentOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [justConnected, setJustConnected] = useState(false)
  const connected = banking.isConnected
  const lastSync = banking.snapshot.connection?.last_synced_at
  const reserve = connected ? banking.reserveHeldMmk : emergencyReserveMmk

  async function connectDemo() {
    setBusy(true)
    const result = await banking.connect()
    setBusy(false)
    if (result.ok) {
      setConsentOpen(false)
      setJustConnected(true)
    }
  }

  return (
    <section className="rounded-[16px] border border-line bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-navy">
          <Landmark size={18} />
          {pickLine(BANK_COPY.teaserTitle, language)}
        </h2>
        {connected ? <DemoBadge compact language={language} /> : null}
      </div>

      {connected ? (
        <>
          <p className="mt-1 text-sm font-semibold text-navy">
            {pickLine(BANK_COPY.demoBankLabel, language)}
          </p>
          <p className="mt-1 text-sm font-semibold text-healthy">
            {pickLine(BANK_COPY.demoConnected, language)}
          </p>
          {justConnected ? (
            <p className="mt-1 text-sm font-semibold text-healthy">
              {pickLine(BANK_COPY.connectedSuccess, language)}
            </p>
          ) : null}
          <dl className="mt-2 space-y-1 text-sm text-ink">
            <div className="flex justify-between gap-2">
              <dt>{pickLine(BANK_COPY.available, language)}</dt>
              <dd className="font-semibold">
                {formatHiddenMmk(hideAmounts, banking.availableBalanceMmk)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>{pickLine(BANK_COPY.reserveHeld, language)}</dt>
              <dd className="font-semibold">{formatHiddenMmk(hideAmounts, reserve)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>{pickLine(BANK_COPY.lastSync, language)}</dt>
              <dd className="font-semibold">
                {lastSync
                  ? formatDisplayDate(lastSync.slice(0, 10))
                  : pickLine(BANK_COPY.neverSynced, language)}
              </dd>
            </div>
          </dl>
          <Link
            to={ROUTES.banking}
            className="mt-3 flex min-h-11 items-center justify-center rounded-[14px] bg-navy px-4 text-base font-semibold text-white"
          >
            {pickLine(BANK_COPY.openBanking, language)}
          </Link>
        </>
      ) : (
        <>
          <p className="mt-2 text-base text-ink">{pickLine(BANK_COPY.connectHint, language)}</p>
          <button
            type="button"
            className="mt-3 flex min-h-11 w-full items-center justify-center rounded-[14px] bg-navy px-4 text-base font-semibold text-white"
            onClick={() => setConsentOpen(true)}
          >
            {pickLine(BANK_COPY.connectCta, language)}
          </button>
        </>
      )}

      {consentOpen ? (
        <BankConsentModal
          language={language}
          busy={busy}
          onConnect={() => void connectDemo()}
          onCancel={() => setConsentOpen(false)}
        />
      ) : null}
    </section>
  )
}
