import type { PreferredLanguage } from '../../types/models'
import type { BankConnectionStatus } from '../../types/bank'
import { bilingualLine, pickLine } from '../../lib/checkInCopy'
import { BANK_COPY } from '../../lib/bankCopy'
import { formatHiddenMmk } from '../../lib/dashboardMetrics'
import { formatSavedAt } from '../../lib/ownerJourney'
import type { BankSnapshot } from '../../services/bankTypes'

const STATUS_COPY: Record<BankConnectionStatus, keyof typeof BANK_COPY> = {
  disconnected: 'disconnected',
  connected: 'connected',
  syncing: 'syncing',
  error: 'error',
}

const statusTone: Record<BankConnectionStatus, string> = {
  disconnected: 'border-line bg-pale text-navy',
  connected: 'border-leaf bg-healthy-bg text-navy',
  syncing: 'border-watch bg-watch-bg text-watch-ink',
  error: 'border-risk bg-risk-bg text-risk',
}

export function BusinessAccountPanel({
  language,
  snapshot,
  availableBalanceMmk,
  hideAmounts,
}: {
  language: PreferredLanguage
  snapshot: BankSnapshot
  availableBalanceMmk: number
  hideAmounts: boolean
}) {
  const connection = snapshot.connection
  const status = connection?.status ?? 'disconnected'
  const isLiveSponsor = connection?.connection_type === 'live'
  const mask = connection?.account_mask ? `•••• ${connection.account_mask}` : '••••'
  const lastSync = connection?.last_synced_at
    ? formatSavedAt(connection.last_synced_at, language)
    : pickLine(BANK_COPY.neverSynced, language)

  return (
    <section className="rounded-[16px] border border-line bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-navy">
          {pickLine(BANK_COPY.accountTitle, language)}
        </h3>
        {isLiveSponsor ? null : (
          <span className="rounded-full bg-watch-bg px-2 py-1 text-sm font-semibold text-watch-ink">
            {pickLine(BANK_COPY.demoConnection, language)}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">{bilingualLine(BANK_COPY.notLiveApi, language)}</p>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-base">
        <div className={`rounded-[14px] border px-3 py-2 ${statusTone[status]}`}>
          <dt className="text-sm">{pickLine(BANK_COPY.status, language)}</dt>
          <dd className="font-bold">{pickLine(BANK_COPY[STATUS_COPY[status]], language)}</dd>
        </div>
        <div className="rounded-[14px] border border-line bg-pale px-3 py-2">
          <dt className="text-sm text-muted">{pickLine(BANK_COPY.maskedAccount, language)}</dt>
          <dd className="font-bold text-navy">{hideAmounts ? '••••' : mask}</dd>
        </div>
        <div className="rounded-[14px] border border-line bg-pale px-3 py-2">
          <dt className="text-sm text-muted">{pickLine(BANK_COPY.available, language)}</dt>
          <dd className="font-bold text-navy">
            {formatHiddenMmk(hideAmounts, availableBalanceMmk)}
          </dd>
        </div>
        <div className="rounded-[14px] border border-line bg-pale px-3 py-2">
          <dt className="text-sm text-muted">{pickLine(BANK_COPY.lastSync, language)}</dt>
          <dd className="font-semibold text-navy">{lastSync}</dd>
        </div>
      </dl>
    </section>
  )
}
