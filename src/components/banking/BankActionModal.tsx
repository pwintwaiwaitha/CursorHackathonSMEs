import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { Payable, PreferredLanguage, Receivable } from '../../types/models'
import type { BankActionType, BankSupportRequestType } from '../../types/bank'
import { bilingualLine, pickLine } from '../../lib/checkInCopy'
import { BANK_COPY } from '../../lib/bankCopy'
import { createIdempotencyKey } from '../../lib/bankIdempotency'
import {
  resultingCashAfterOutflow,
  safeToSpendAfterReserve,
  suggestedReserveMmk,
} from '../../lib/bankBalance'
import { formatMmk } from '../../lib/money'
import { derivePayableStatus, remainingPayableMmk, remainingReceivableMmk } from '../../lib/schedule'
import { todayIsoDate } from '../../lib/dates'
import { MoneyInput } from '../ui/MoneyInput'
import type { ConfirmBankActionResult } from '../../services/bankTypes'

export type BankModalKind = BankActionType | null

const SUPPORT_TYPES: { id: BankSupportRequestType; en: string }[] = [
  { id: 'business_account', en: 'Business account' },
  { id: 'merchant_qr', en: 'Merchant QR' },
  { id: 'payment_service', en: 'Payment service' },
  { id: 'working_capital', en: 'Working-capital conversation' },
  { id: 'financial_guidance', en: 'Financial guidance' },
]

function Overlay({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-navy/40 p-3 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[16px] border border-line bg-white p-4 shadow-lg"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy">{title}</h2>
          <button
            type="button"
            className="touch-target rounded-[14px] px-3 font-semibold text-navy"
            onClick={onClose}
          >
            {pickLine(BANK_COPY.close, 'en')}
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  )
}

export function BankActionModal({
  kind,
  language,
  isDemoMode,
  currentCashMmk,
  safeToSpendMmk,
  todaySalesMmk,
  receivables,
  payables,
  onClose,
  onConfirm,
  reserveDirection = 'save',
  reminderOnly = false,
}: {
  kind: BankModalKind
  language: PreferredLanguage
  isDemoMode: boolean
  currentCashMmk: number
  safeToSpendMmk: number
  todaySalesMmk: number
  receivables: Receivable[]
  payables: Payable[]
  onClose: () => void
  onConfirm: (input: {
    actionType: BankActionType
    amountMmk: number | null
    purpose: string
    idempotencyKey: string
    linkedReceivableId?: string
    linkedPayableId?: string
    supportType?: BankSupportRequestType
    ownerConsent?: boolean
    ownerMessage?: string
    paymentReference?: string
    reserveDirection?: 'save' | 'use'
  }) => Promise<ConfirmBankActionResult>
  reserveDirection?: 'save' | 'use'
  reminderOnly?: boolean
}) {
  if (!kind) {
    return null
  }

  const title =
    reminderOnly
      ? pickLine(BANK_COPY.sendReminder, language)
      : kind === 'deposit_sales'
        ? pickLine(BANK_COPY.depositSales, language)
      : kind === 'collect_customer_payment'
        ? pickLine(BANK_COPY.receivePayment, language)
        : kind === 'pay_supplier'
          ? pickLine(BANK_COPY.paySupplier, language)
          : kind === 'move_to_reserve'
            ? pickLine(
                reserveDirection === 'use' ? BANK_COPY.useReserve : BANK_COPY.moveReserve,
                language,
              )
            : pickLine(BANK_COPY.askBank, language)

  return (
    <Overlay title={title} onClose={onClose}>
      <ActionBody
        kind={kind}
        language={language}
        isDemoMode={isDemoMode}
        currentCashMmk={currentCashMmk}
        safeToSpendMmk={safeToSpendMmk}
        todaySalesMmk={todaySalesMmk}
        receivables={receivables}
        payables={payables}
        reserveDirection={reserveDirection}
        reminderOnly={reminderOnly}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    </Overlay>
  )
}

function ActionBody({
  kind,
  language,
  isDemoMode,
  currentCashMmk,
  safeToSpendMmk,
  todaySalesMmk,
  receivables,
  payables,
  onClose,
  onConfirm,
  reserveDirection = 'save',
  reminderOnly = false,
}: {
  kind: BankActionType
  language: PreferredLanguage
  isDemoMode: boolean
  currentCashMmk: number
  safeToSpendMmk: number
  todaySalesMmk: number
  receivables: Receivable[]
  payables: Payable[]
  reserveDirection?: 'save' | 'use'
  reminderOnly?: boolean
  onClose: () => void
  onConfirm: (input: {
    actionType: BankActionType
    amountMmk: number | null
    purpose: string
    idempotencyKey: string
    linkedReceivableId?: string
    linkedPayableId?: string
    supportType?: BankSupportRequestType
    ownerConsent?: boolean
    ownerMessage?: string
    paymentReference?: string
    reserveDirection?: 'save' | 'use'
  }) => Promise<ConfirmBankActionResult>
}) {
  const today = todayIsoDate()
  const openReceivables = receivables.filter((item) => remainingReceivableMmk(item) > 0)
  const openPayables = payables.filter(
    (item) =>
      remainingPayableMmk({
        ...item,
        status: derivePayableStatus(item, today),
      }) > 0,
  )
  const suggestedReserve = suggestedReserveMmk(safeToSpendMmk)
  const [amountMmk, setAmountMmk] = useState(
    kind === 'deposit_sales'
      ? Math.max(0, todaySalesMmk)
      : kind === 'move_to_reserve'
        ? (suggestedReserve ?? 0)
        : 0,
  )
  const [purpose, setPurpose] = useState(
    kind === 'deposit_sales'
      ? 'Deposit today’s recorded sales'
      : kind === 'collect_customer_payment'
        ? 'Receive customer payment'
        : kind === 'pay_supplier'
          ? 'Pay supplier bill'
          : kind === 'move_to_reserve'
            ? 'Move money to emergency reserve'
            : 'Owner-requested bank support',
  )
  const [receivableId, setReceivableId] = useState(openReceivables[0]?.id ?? '')
  const [payableId, setPayableId] = useState(openPayables[0]?.id ?? '')
  const [supportType, setSupportType] = useState<BankSupportRequestType>('financial_guidance')
  const [ownerMessage, setOwnerMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [phase, setPhase] = useState<'edit' | 'review' | 'done'>('edit')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [idempotencyKey] = useState(createIdempotencyKey)
  const [paymentReceived, setPaymentReceived] = useState(false)

  const receivable = openReceivables.find((item) => item.id === receivableId)
  const payable = openPayables.find((item) => item.id === payableId)
  const reference = useMemo(
    () => `DEMO-${idempotencyKey.slice(0, 8).toUpperCase()}`,
    [idempotencyKey],
  )

  const selectedAmount =
    kind === 'collect_customer_payment' && receivable
      ? remainingReceivableMmk(receivable)
      : kind === 'pay_supplier' && payable
        ? remainingPayableMmk({
            ...payable,
            status: derivePayableStatus(payable, today),
          })
        : amountMmk

  const outflow = resultingCashAfterOutflow(
    currentCashMmk,
    kind === 'pay_supplier' || kind === 'move_to_reserve' ? selectedAmount : 0,
  )
  const stsAfter = safeToSpendAfterReserve(safeToSpendMmk, kind === 'move_to_reserve' ? selectedAmount : 0)
  const qrNote = [
    'Demo QR payment request',
    receivable ? `Customer: ${receivable.customerName}` : '',
    `Amount: ${formatMmk(selectedAmount)}`,
    `Reference: ${reference}`,
    'Demonstration only — not received until confirmed.',
  ]
    .filter(Boolean)
    .join('\n')
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrNote)}`

  function goReview(event: FormEvent) {
    event.preventDefault()
    if (kind === 'collect_customer_payment' && !receivable) {
      setMessage(pickLine(BANK_COPY.noReceivables, language))
      return
    }
    if (kind === 'pay_supplier' && !payable) {
      setMessage(pickLine(BANK_COPY.noPayables, language))
      return
    }
    if (kind === 'request_bank_support' && !consent) {
      setMessage(pickLine(BANK_COPY.consent, language))
      return
    }
    if (kind !== 'request_bank_support' && selectedAmount < 1) {
      setMessage(pickLine(BANK_COPY.amount, language))
      return
    }
    if (kind === 'collect_customer_payment' && receivable) {
      setAmountMmk(remainingReceivableMmk(receivable))
      setPurpose(`Customer payment · ${receivable.customerName} · ${reference}`)
    }
    if (kind === 'pay_supplier' && payable) {
      setAmountMmk(
        remainingPayableMmk({
          ...payable,
          status: derivePayableStatus(payable, today),
        }),
      )
      setPurpose(`Supplier payment · ${payable.supplierName}`)
    }
    setPhase('review')
    setMessage('')
  }

  async function submit() {
    if (!reviewed) {
      return
    }
    setBusy(true)
    if (reminderOnly) {
      const note = [
        receivable ? `Please pay ${formatMmk(remainingReceivableMmk(receivable))}` : purpose,
        receivable ? `Customer: ${receivable.customerName}` : '',
        `Reference: ${reference}`,
        'Demonstration reminder only — no money moved.',
      ]
        .filter(Boolean)
        .join('\n')
      try {
        await navigator.clipboard.writeText(note)
      } catch {
        // Clipboard may be unavailable; still record the demo confirmation.
      }
      setBusy(false)
      setMessage(pickLine(BANK_COPY.reminderPrepared, language))
      setPhase('done')
      return
    }
    const result = await onConfirm({
      actionType: kind,
      amountMmk: kind === 'request_bank_support' ? null : selectedAmount,
      purpose,
      idempotencyKey,
      linkedReceivableId: receivable?.id,
      linkedPayableId: payable?.id,
      supportType: kind === 'request_bank_support' ? supportType : undefined,
      ownerConsent: kind === 'request_bank_support' ? consent : undefined,
      ownerMessage,
      paymentReference: reference,
      reserveDirection,
    })
    setBusy(false)
    setMessage(result.message)
    if (result.ok) {
      setPhase('done')
      if (result.transaction && kind === 'collect_customer_payment') {
        setPaymentReceived(true)
      }
    }
  }

  return (
    <div className="space-y-3">
      {isDemoMode ? (
        <p className="rounded-[14px] bg-watch-bg px-3 py-2 text-base font-semibold text-watch-ink">
          {pickLine(BANK_COPY.demonstrationOnly, language)}
        </p>
      ) : null}
      <p className="text-sm text-muted">{bilingualLine(BANK_COPY.neverAuto, language)}</p>

      {phase === 'edit' ? (
        <form onSubmit={goReview} className="space-y-3">
          {kind === 'deposit_sales' || kind === 'move_to_reserve' ? (
            <MoneyInput
              id="bank-amount"
              language={language}
              label={BANK_COPY.amount}
              value={amountMmk}
              onChange={setAmountMmk}
            />
          ) : null}

          {kind === 'move_to_reserve' ? (
            <p className="text-sm text-muted">
              {suggestedReserve == null
                ? bilingualLine(BANK_COPY.noReserveSuggest, language)
                : bilingualLine(BANK_COPY.reserveHint, language)}
            </p>
          ) : null}

          {kind === 'collect_customer_payment' ? (
            <div className="space-y-2">
              <label className="block">
                <span className="mb-1 block font-medium text-ink">
                  {pickLine(BANK_COPY.selectReceivable, language)}
                </span>
                <select
                  className="min-h-11 w-full rounded-[14px] border border-line px-3"
                  value={receivableId}
                  onChange={(event) => setReceivableId(event.target.value)}
                >
                  {openReceivables.length === 0 ? (
                    <option value="">{pickLine(BANK_COPY.noReceivables, language)}</option>
                  ) : null}
                  {openReceivables.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.customerName} · {formatMmk(remainingReceivableMmk(item))}
                    </option>
                  ))}
                </select>
              </label>
              {receivable ? (
                <dl className="rounded-[14px] border border-line bg-pale px-3 py-2 text-base">
                  <div className="flex justify-between gap-2">
                    <dt>{pickLine(BANK_COPY.customer, language)}</dt>
                    <dd className="font-semibold">{receivable.customerName}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>{pickLine(BANK_COPY.amount, language)}</dt>
                    <dd className="font-semibold">{formatMmk(remainingReceivableMmk(receivable))}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>{pickLine(BANK_COPY.reference, language)}</dt>
                    <dd className="font-semibold">{reference}</dd>
                  </div>
                </dl>
              ) : null}
              <div className="rounded-[14px] border border-dashed border-mint bg-pale p-3 text-center">
                <p className="font-semibold text-navy">{pickLine(BANK_COPY.demoQr, language)}</p>
                <img
                  src={qrSrc}
                  width={180}
                  height={180}
                  alt="Demo QR payment request"
                  className="mx-auto mt-2 h-[180px] w-[180px] rounded-[14px] bg-white"
                />
                <p className="mt-2 text-sm text-muted">{bilingualLine(BANK_COPY.qrHint, language)}</p>
                <p className="mt-1 text-sm font-semibold text-watch-ink">
                  {paymentReceived ? 'Payment recorded' : 'Not received yet'}
                </p>
              </div>
            </div>
          ) : null}

          {kind === 'pay_supplier' ? (
            <label className="block">
              <span className="mb-1 block font-medium text-ink">
                {pickLine(BANK_COPY.selectPayable, language)}
              </span>
              <select
                className="min-h-11 w-full rounded-[14px] border border-line px-3"
                value={payableId}
                onChange={(event) => setPayableId(event.target.value)}
              >
                {openPayables.length === 0 ? (
                  <option value="">{pickLine(BANK_COPY.noPayables, language)}</option>
                ) : null}
                {openPayables.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.supplierName} · {formatMmk(item.amountMmk)} · {item.dueDate}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {kind === 'request_bank_support' ? (
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block font-medium text-ink">
                  {pickLine(BANK_COPY.supportType, language)}
                </span>
                <select
                  className="min-h-11 w-full rounded-[14px] border border-line px-3"
                  value={supportType}
                  onChange={(event) =>
                    setSupportType(event.target.value as BankSupportRequestType)
                  }
                >
                  {SUPPORT_TYPES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.en}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-medium text-ink">
                  {pickLine(BANK_COPY.supportMessage, language)}
                </span>
                <textarea
                  className="min-h-24 w-full rounded-[14px] border border-line px-3 py-2"
                  value={ownerMessage}
                  onChange={(event) => setOwnerMessage(event.target.value)}
                />
              </label>
              <label className="flex items-start gap-2 text-base">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                <span>{bilingualLine(BANK_COPY.consent, language)}</span>
              </label>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-1 block font-medium text-ink">
              {pickLine(BANK_COPY.purpose, language)}
            </span>
            <input
              className="min-h-11 w-full rounded-[14px] border border-line px-3"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
            />
          </label>

          <button
            type="submit"
            className="touch-target w-full rounded-[14px] bg-bank-blue px-4 font-semibold text-white"
          >
            {pickLine(BANK_COPY.reviewTitle, language)}
          </button>
          {message ? <p className="text-base font-medium text-risk">{message}</p> : null}
        </form>
      ) : null}

      {phase === 'review' ? (
        <div className="space-y-3">
          <dl className="space-y-1 rounded-[14px] border border-line bg-pale px-3 py-2 text-base">
            <div className="flex justify-between gap-2">
              <dt>{pickLine(BANK_COPY.amount, language)}</dt>
              <dd className="font-semibold">
                {kind === 'request_bank_support' ? '—' : formatMmk(selectedAmount)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>{pickLine(BANK_COPY.purpose, language)}</dt>
              <dd className="text-right font-semibold">{purpose}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>{pickLine(BANK_COPY.resultingCash, language)}</dt>
              <dd className="font-semibold">{formatMmk(outflow.cashAfterMmk)}</dd>
            </div>
            {kind === 'pay_supplier' && payable ? (
              <>
                <div className="flex justify-between gap-2">
                  <dt>{pickLine(BANK_COPY.dueDate, language)}</dt>
                  <dd className="font-semibold">{payable.dueDate}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>{pickLine(BANK_COPY.cashBefore, language)}</dt>
                  <dd className="font-semibold">{formatMmk(outflow.cashBeforeMmk)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>{pickLine(BANK_COPY.cashAfter, language)}</dt>
                  <dd className="font-semibold">{formatMmk(outflow.cashAfterMmk)}</dd>
                </div>
              </>
            ) : null}
            {kind === 'move_to_reserve' ? (
              <>
                <div className="flex justify-between gap-2">
                  <dt>{pickLine(BANK_COPY.stsNow, language)}</dt>
                  <dd className="font-semibold">{formatMmk(safeToSpendMmk)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>{pickLine(BANK_COPY.stsAfter, language)}</dt>
                  <dd className="font-semibold">{formatMmk(stsAfter)}</dd>
                </div>
                <p className="text-sm font-semibold text-watch-ink">
                  {pickLine(BANK_COPY.plannedNotDone, language)}
                </p>
              </>
            ) : null}
          </dl>
          {kind === 'pay_supplier' && outflow.createsShortage ? (
            <p className="rounded-[14px] bg-risk-bg px-3 py-2 text-base font-semibold text-risk">
              {bilingualLine(BANK_COPY.shortageWarn, language)}
            </p>
          ) : null}
          <p className="text-sm text-muted">idempotency_key · {idempotencyKey}</p>
          <label className="flex items-start gap-2 text-base">
            <input
              type="checkbox"
              className="mt-1"
              checked={reviewed}
              onChange={(event) => setReviewed(event.target.checked)}
            />
            <span>{pickLine(BANK_COPY.confirm, language)}</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="touch-target rounded-[14px] border border-navy px-3 font-semibold text-navy"
              onClick={() => setPhase('edit')}
            >
              {pickLine(BANK_COPY.cancel, language)}
            </button>
            <button
              type="button"
              disabled={!reviewed || busy}
              className="touch-target rounded-[14px] bg-bank-blue px-3 font-semibold text-white disabled:bg-muted"
              onClick={() => void submit()}
            >
              {pickLine(BANK_COPY.confirmAction, language)}
            </button>
          </div>
          {message ? <p className="text-base font-medium text-risk">{message}</p> : null}
        </div>
      ) : null}

      {phase === 'done' ? (
        <div className="space-y-3">
          <p className="rounded-[14px] bg-healthy-bg px-3 py-2 text-base font-semibold text-healthy">
            {message}
          </p>
          {kind === 'collect_customer_payment' ? (
            <p className="text-base text-navy">
              {paymentReceived
                ? 'Customer payment is now recorded from the confirmed transaction.'
                : pickLine(BANK_COPY.qrHint, language)}
            </p>
          ) : null}
          {kind === 'move_to_reserve' ? (
            <p className="text-base font-semibold text-watch-ink">
              {pickLine(BANK_COPY.plannedNotDone, language)}
            </p>
          ) : null}
          <button
            type="button"
            className="touch-target w-full rounded-[14px] bg-navy px-4 font-semibold text-white"
            onClick={onClose}
          >
            {pickLine(BANK_COPY.close, language)}
          </button>
        </div>
      ) : null}
    </div>
  )
}
