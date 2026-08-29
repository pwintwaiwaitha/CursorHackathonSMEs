import { useMemo, useState } from 'react'
import type { Payable, PreferredLanguage, Receivable } from '../../types/models'
import { pickLine } from '../../lib/checkInCopy'
import { BANK_COPY } from '../../lib/bankCopy'
import { DASHBOARD_COPY } from '../../lib/dashboardCopy'
import { formatHiddenMmk } from '../../lib/dashboardMetrics'
import { formatDisplayDate } from '../../lib/dates'
import { formatMmk } from '../../lib/money'
import { reserveProgressPercent } from '../../lib/bankBalance'
import { demoFinancialSummary, demoPaymentDetails } from '../../lib/bankSummary'
import { markPayablePaid, markReceivablePaid } from '../../lib/schedule'
import { createIdempotencyKey } from '../../lib/bankIdempotency'
import { useApp } from '../../context/useApp'
import { useBanking } from '../../hooks/useBanking'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { LoadingBlock } from '../ui/LoadingBlock'
import { SegmentTabs } from '../ui/SegmentTabs'
import { DemoBadge } from '../demo/DemoBadge'
import { BankConsentModal } from './BankConsentModal'
import { BankActionModal, type BankModalKind } from './BankActionModal'

type BankingTab = 'account' | 'payments' | 'reserve' | 'support'

export function BankingSection({
  language,
  hideAmounts,
  currentCashMmk,
  safeToSpendMmk,
  todaySalesMmk,
  receivables,
  payables,
  hasPredictedShortage,
  shortageDate,
  shortageAmountMmk,
  gapCause,
  businessName,
  reserveTargetMmk,
}: {
  language: PreferredLanguage
  hideAmounts: boolean
  currentCashMmk: number
  safeToSpendMmk: number
  todaySalesMmk: number
  receivables: Receivable[]
  payables: Payable[]
  hasPredictedShortage: boolean
  shortageDate: string | null
  shortageAmountMmk: number
  gapCause: string | null
  businessName: string
  reserveTargetMmk: number
}) {
  const { updateReceivable, updatePayable } = useApp()
  const banking = useBanking()
  const [tab, setTab] = useState<BankingTab>('account')
  const [modal, setModal] = useState<BankModalKind>(null)
  const [consentOpen, setConsentOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState('')
  const [requestOpen, setRequestOpen] = useState(false)
  const reference = useMemo(() => `DEMO-${createIdempotencyKey().slice(0, 8).toUpperCase()}`, [])
  const connected = banking.isConnected
  const reserveTarget = Math.max(0, Math.trunc(reserveTargetMmk))
  const progress = reserveProgressPercent(banking.reserveHeldMmk, reserveTarget)
  const cause =
    gapCause === 'supplier_before_collections'
      ? pickLine(DASHBOARD_COPY.gapSupplier, language)
      : gapCause === 'large_bills'
        ? pickLine(DASHBOARD_COPY.gapBills, language)
        : null

  async function connectDemo() {
    setBusy(true)
    const result = await banking.connect()
    setBusy(false)
    if (result.ok) {
      setConsentOpen(false)
      setFlash(pickLine(BANK_COPY.connectedSuccess, language))
    }
  }

  async function copyText(value: string, done: string) {
    try {
      await navigator.clipboard.writeText(value)
      setFlash(done)
    } catch {
      setFlash(done)
    }
  }

  return (
    <section className="space-y-3">
      <SegmentTabs
        label={pickLine(BANK_COPY.sectionTitle, language)}
        value={tab}
        onChange={setTab}
        options={[
          { id: 'account', label: pickLine(BANK_COPY.tabAccount, language) },
          { id: 'payments', label: pickLine(BANK_COPY.tabPayments, language) },
          { id: 'reserve', label: pickLine(BANK_COPY.tabReserve, language) },
          { id: 'support', label: pickLine(BANK_COPY.tabSupport, language) },
        ]}
      />

      {banking.status === 'loading' ? <LoadingBlock label="Loading business account…" /> : null}
      {banking.status === 'error' ? (
        <ErrorState
          title={pickLine(BANK_COPY.loadError, language)}
          message={banking.error ?? pickLine(BANK_COPY.loadError, language)}
          onRetry={() => void banking.reload()}
        />
      ) : null}

      {flash ? (
        <p className="rounded-[14px] bg-healthy-bg px-3 py-2 text-base font-semibold text-healthy">
          {flash}
        </p>
      ) : null}

      {!connected && banking.status === 'ready' ? (
        <div className="rounded-[16px] border border-line bg-white p-3">
          <p className="text-base text-ink">{pickLine(BANK_COPY.connectHint, language)}</p>
          <button
            type="button"
            className="mt-3 flex min-h-11 w-full items-center justify-center rounded-[14px] bg-navy px-4 font-semibold text-white"
            onClick={() => setConsentOpen(true)}
          >
            {pickLine(BANK_COPY.connectCta, language)}
          </button>
        </div>
      ) : null}

      {connected && tab === 'account' ? (
        <div className="space-y-3">
          <section className="rounded-[16px] border border-line bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold text-navy">
                {pickLine(BANK_COPY.accountTitle, language)}
              </h3>
              <DemoBadge compact language={language} />
            </div>
            <p className="mt-1 text-sm font-semibold text-navy">
              {pickLine(BANK_COPY.demoBankLabel, language)}
            </p>
            <p className="mt-1 text-sm font-semibold text-healthy">
              {pickLine(BANK_COPY.demoConnected, language)}
            </p>
            <dl className="mt-3 grid gap-2 text-base sm:grid-cols-2">
              <div className="rounded-[14px] border border-leaf bg-healthy-bg px-3 py-2">
                <dt className="text-sm">{pickLine(BANK_COPY.status, language)}</dt>
                <dd className="font-bold">{pickLine(BANK_COPY.demoConnected, language)}</dd>
              </div>
              <div className="rounded-[14px] border border-line bg-pale px-3 py-2">
                <dt className="text-sm text-muted">{pickLine(BANK_COPY.available, language)}</dt>
                <dd className="font-bold text-navy">
                  {formatHiddenMmk(hideAmounts, banking.availableBalanceMmk)}
                </dd>
              </div>
              <div className="rounded-[14px] border border-line bg-pale px-3 py-2">
                <dt className="text-sm text-muted">{pickLine(BANK_COPY.lastSync, language)}</dt>
                <dd className="font-semibold text-navy">
                  {banking.snapshot.connection?.last_synced_at
                    ? formatDisplayDate(banking.snapshot.connection.last_synced_at.slice(0, 10))
                    : pickLine(BANK_COPY.neverSynced, language)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-[16px] border border-line bg-white p-3">
            <h3 className="text-base font-semibold text-navy">
              {pickLine(BANK_COPY.recentTxns, language)}
            </h3>
            {banking.snapshot.transactions.length === 0 ? (
              <EmptyState
                title={pickLine(BANK_COPY.accountTitle, language)}
                message={pickLine(BANK_COPY.empty, language)}
              />
            ) : (
              <ul className="mt-2 space-y-2">
                {banking.snapshot.transactions
                  .slice()
                  .reverse()
                  .slice(0, 8)
                  .map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-[14px] border border-line bg-pale px-3 py-2 text-base"
                    >
                      <span className="font-semibold text-navy">
                        {item.category.replace(/_/g, ' ')}
                      </span>
                      <span className="text-muted">
                        {item.direction === 'inflow' ? '+' : '−'}
                        {hideAmounts ? '••••' : formatMmk(item.amount)}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <section className="rounded-[16px] border border-line bg-white p-3">
            <h3 className="text-base font-semibold text-navy">
              {pickLine(BANK_COPY.sharedData, language)}
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-ink">
              <li>{pickLine(BANK_COPY.consentReadBalances, language)}</li>
              <li>{pickLine(BANK_COPY.consentReadTxns, language)}</li>
              <li>{pickLine(BANK_COPY.consentMatch, language)}</li>
              <li>{pickLine(BANK_COPY.consentForecast, language)}</li>
            </ul>
            <p className="mt-2 text-sm text-muted">
              {pickLine(BANK_COPY.consentNotRequested, language)}
            </p>
            <button
              type="button"
              className="mt-3 flex min-h-11 w-full items-center justify-center rounded-[14px] border border-risk px-4 font-semibold text-risk"
              onClick={() => void banking.disconnect()}
            >
              {pickLine(BANK_COPY.disconnect, language)}
            </button>
          </section>
        </div>
      ) : null}

      {connected && tab === 'payments' ? (
        <div className="grid gap-2">
          <button
            type="button"
            className="touch-target rounded-[14px] border border-line bg-white px-3 font-semibold text-navy"
            onClick={() => setModal('collect_customer_payment')}
          >
            {pickLine(BANK_COPY.receivePayment, language)}
          </button>
          <button
            type="button"
            className="touch-target rounded-[14px] border border-line bg-white px-3 font-semibold text-navy"
            onClick={() => setModal('pay_supplier')}
          >
            {pickLine(BANK_COPY.paySupplier, language)}
          </button>
          <button
            type="button"
            className="touch-target rounded-[14px] border border-line bg-white px-3 font-semibold text-navy"
            onClick={() =>
              void copyText(
                demoPaymentDetails({
                  businessName,
                  accountMask: banking.snapshot.connection?.account_mask ?? null,
                  reference,
                }),
                pickLine(BANK_COPY.detailsCopied, language),
              )
            }
          >
            {pickLine(BANK_COPY.copyDetails, language)}
          </button>
          <button
            type="button"
            className="touch-target rounded-[14px] border border-line bg-white px-3 font-semibold text-navy"
            onClick={() => setRequestOpen((current) => !current)}
          >
            {pickLine(BANK_COPY.generateRequest, language)}
          </button>
          {requestOpen ? (
            <div className="rounded-[14px] border border-dashed border-mint bg-pale p-3 text-center">
              <p className="font-semibold text-navy">{pickLine(BANK_COPY.demoQr, language)}</p>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`Demo payment request ${reference}`)}`}
                width={180}
                height={180}
                alt="Demo payment request"
                className="mx-auto mt-2 h-[180px] w-[180px] rounded-[14px] bg-white"
              />
              <p className="mt-1 text-sm text-muted">{reference}</p>
              <p className="mt-1 text-sm font-semibold text-watch-ink">
                {pickLine(BANK_COPY.demonstrationOnly, language)}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {connected && tab === 'reserve' ? (
        <section className="space-y-3 rounded-[16px] border border-line bg-white p-3">
          <dl className="grid gap-2 text-base sm:grid-cols-2">
            <div className="rounded-[14px] border border-line bg-pale px-3 py-2">
              <dt className="text-sm text-muted">{pickLine(BANK_COPY.reserveHeld, language)}</dt>
              <dd className="font-bold text-navy">
                {formatHiddenMmk(hideAmounts, banking.reserveHeldMmk)}
              </dd>
            </div>
            <div className="rounded-[14px] border border-line bg-pale px-3 py-2">
              <dt className="text-sm text-muted">{pickLine(BANK_COPY.reserveTarget, language)}</dt>
              <dd className="font-bold text-navy">
                {formatHiddenMmk(hideAmounts, reserveTarget)}
              </dd>
            </div>
          </dl>
          <div>
            <p className="text-sm font-semibold text-navy">
              {pickLine(BANK_COPY.reserveProgress, language)} · {progress}%
            </p>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-pale">
              <div className="h-full rounded-full bg-leaf" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <button
            type="button"
            className="touch-target w-full rounded-[14px] bg-navy px-3 font-semibold text-white"
            onClick={() => setModal('move_to_reserve')}
          >
            {pickLine(BANK_COPY.moveReserve, language)}
          </button>
        </section>
      ) : null}

      {connected && tab === 'support' ? (
        <div className="space-y-3">
          <section className="rounded-[16px] border border-line bg-white p-3">
            <h3 className="text-base font-semibold text-navy">
              {pickLine(BANK_COPY.predictedProblem, language)}
            </h3>
            {hasPredictedShortage ? (
              <dl className="mt-2 space-y-1 text-base">
                {shortageDate ? (
                  <div className="flex justify-between gap-2">
                    <dt>{pickLine(DASHBOARD_COPY.nextShortage, language)}</dt>
                    <dd className="font-semibold">{formatDisplayDate(shortageDate)}</dd>
                  </div>
                ) : null}
                {shortageAmountMmk > 0 ? (
                  <div className="flex justify-between gap-2">
                    <dt>{pickLine(DASHBOARD_COPY.shortageAmount, language)}</dt>
                    <dd className="font-semibold">
                      {hideAmounts ? '•••• MMK' : formatMmk(shortageAmountMmk)}
                    </dd>
                  </div>
                ) : null}
                {cause ? (
                  <div>
                    <dt className="font-semibold">{pickLine(DASHBOARD_COPY.oneCause, language)}</dt>
                    <dd>{cause}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="mt-2 text-base text-ink">
                {pickLine(BANK_COPY.noPredictedProblem, language)}
              </p>
            )}
          </section>
          <section className="rounded-[16px] border border-line bg-white p-3">
            <h3 className="text-base font-semibold text-navy">
              {pickLine(BANK_COPY.workingCapitalInfo, language)}
            </h3>
            <p className="mt-2 text-base text-ink">
              {pickLine(BANK_COPY.workingCapitalBody, language)}
            </p>
          </section>
          <button
            type="button"
            className="touch-target w-full rounded-[14px] border border-line bg-white px-3 font-semibold text-navy"
            onClick={() => setModal('request_bank_support')}
          >
            {pickLine(BANK_COPY.requestCallback, language)}
          </button>
          <button
            type="button"
            className="touch-target w-full rounded-[14px] border border-line bg-white px-3 font-semibold text-navy"
            onClick={() =>
              void copyText(
                demoFinancialSummary({
                  businessName,
                  currentCashMmk,
                  safeToSpendMmk,
                  availableBalanceMmk: banking.availableBalanceMmk,
                  reserveHeldMmk: banking.reserveHeldMmk,
                  shortageDate,
                  shortageAmountMmk,
                  receivables,
                  payables,
                  transactions: banking.snapshot.transactions,
                }),
                pickLine(BANK_COPY.summaryCopied, language),
              )
            }
          >
            {pickLine(BANK_COPY.financialSummary, language)}
          </button>
        </div>
      ) : null}

      {consentOpen ? (
        <BankConsentModal
          language={language}
          busy={busy}
          onConnect={() => void connectDemo()}
          onCancel={() => setConsentOpen(false)}
        />
      ) : null}

      <BankActionModal
        kind={modal}
        language={language}
        isDemoMode={banking.isDemoMode}
        currentCashMmk={currentCashMmk}
        safeToSpendMmk={safeToSpendMmk}
        todaySalesMmk={todaySalesMmk}
        receivables={receivables}
        payables={payables}
        onClose={() => setModal(null)}
        onConfirm={async (input) => {
          const result = await banking.confirm(input)
          if (result.ok && result.markReceivableId) {
            const item = receivables.find((row) => row.id === result.markReceivableId)
            if (item) {
              updateReceivable(markReceivablePaid(item))
            }
          }
          if (result.ok && result.markPayableId) {
            const item = payables.find((row) => row.id === result.markPayableId)
            if (item) {
              updatePayable(markPayablePaid(item))
            }
          }
          return result
        }}
      />
    </section>
  )
}
