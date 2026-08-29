import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Payable, PreferredLanguage } from '../../types/models'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
  type Recurrence,
} from '../../types/models'
import { useApp } from '../../context/useApp'
import { getCheckInForDate } from '../../lib/cashflow'
import { bilingualLine, emptyCheckInForm, pickLine } from '../../lib/checkInCopy'
import { DASHBOARD_COPY } from '../../lib/dashboardCopy'
import { todayIsoDate } from '../../lib/dates'
import { formatMmk } from '../../lib/money'
import { derivePayableStatus, markPayablePaid, remainingPayableMmk } from '../../lib/schedule'
import { dailyCheckInSchema, payableSchema } from '../../lib/validation'
import { MoneyInput } from '../ui/MoneyInput'

export type QuickModal = 'sale' | 'pay' | 'reserve' | null

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
            {pickLine(DASHBOARD_COPY.close, 'en')}
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  )
}

export function RecordSaleForm({
  language,
  onClose: _onClose,
}: {
  language: PreferredLanguage
  onClose: () => void
}) {
  const { store, saveCheckIn } = useApp()
  const today = todayIsoDate()
  const [amountMmk, setAmountMmk] = useState(0)
  const [message, setMessage] = useState('')

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const existing = getCheckInForDate(store, today)
    const base = existing
      ? {
          date: today,
          cashSalesMmk: existing.cashSalesMmk,
          customerDebtCollectedMmk: existing.customerDebtCollectedMmk,
          creditSalesMmk: existing.creditSalesMmk,
          operatingExpensesMmk: existing.operatingExpensesMmk,
          inventoryPurchasesMmk: existing.inventoryPurchasesMmk,
          supplierPaymentsMmk: existing.supplierPaymentsMmk,
          otherCashReceivedMmk: existing.otherCashReceivedMmk,
          otherCashPaidMmk: existing.otherCashPaidMmk,
          expenseBreakdowns: existing.expenseBreakdowns,
          notes: existing.notes,
        }
      : emptyCheckInForm(today)
    if (amountMmk < 1) {
      setMessage('Enter a sale amount.')
      return
    }
    const parsed = dailyCheckInSchema.safeParse({
      ...base,
      cashSalesMmk: base.cashSalesMmk + Math.trunc(amountMmk),
    })
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Enter a sale amount.')
      return
    }
    saveCheckIn(parsed.data)
    setMessage(bilingualLine(DASHBOARD_COPY.saleSaved, language))
    setAmountMmk(0)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <MoneyInput
        id="quick-sale"
        language={language}
        label={DASHBOARD_COPY.saleAmount}
        value={amountMmk}
        onChange={setAmountMmk}
      />
      <button
        type="submit"
        className="touch-target w-full rounded-[14px] bg-bank-blue px-4 font-semibold text-white"
      >
        {pickLine(DASHBOARD_COPY.saveSale, language)}
      </button>
      {message ? <p className="text-base font-medium text-healthy">{message}</p> : null}
    </form>
  )
}

export function PaySupplierForm({
  language,
  onClose,
}: {
  language: PreferredLanguage
  onClose: () => void
}) {
  const { store, addPayable, updatePayable } = useApp()
  const today = todayIsoDate()
  const [supplierName, setSupplierName] = useState('')
  const [amountMmk, setAmountMmk] = useState(0)
  const [dueDate, setDueDate] = useState(today)
  const [category, setCategory] = useState<ExpenseCategory>('stock')
  const [recurrence] = useState<Recurrence>('once')
  const [message, setMessage] = useState('')
  const openBills = store.payables.filter(
    (item) =>
      remainingPayableMmk({
        ...item,
        status: derivePayableStatus(item, today),
      }) > 0,
  )

  function onAdd(event: FormEvent) {
    event.preventDefault()
    const parsed = payableSchema.safeParse({
      supplierName,
      amountMmk,
      dueDate,
      category,
      recurrence,
      notes: '',
    })
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Check the bill.')
      return
    }
    addPayable(parsed.data)
    setSupplierName('')
    setAmountMmk(0)
    setMessage('Bill saved.')
  }

  function onMarkPaid(item: Payable) {
    updatePayable(markPayablePaid(item))
    setMessage(`${item.supplierName} marked paid.`)
  }

  return (
    <div className="space-y-4">
      {openBills.length > 0 ? (
        <ul className="space-y-2">
          {openBills.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-[14px] border border-line px-3 py-2"
            >
              <div>
                <p className="font-semibold text-navy">{item.supplierName}</p>
                <p className="text-base text-muted">
                  {formatMmk(item.amountMmk)} · {item.dueDate}
                </p>
              </div>
              <button
                type="button"
                className="touch-target rounded-[14px] border border-navy px-3 font-semibold text-navy"
                onClick={() => onMarkPaid(item)}
              >
                {pickLine(DASHBOARD_COPY.markPaid, language)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <form onSubmit={onAdd} className="space-y-3">
        <label className="block">
          <span className="mb-1 block font-medium text-ink">
            {pickLine(DASHBOARD_COPY.supplierName, language)}
          </span>
          <input
            className="min-h-11 w-full rounded-[14px] border border-line px-3"
            value={supplierName}
            onChange={(event) => setSupplierName(event.target.value)}
          />
        </label>
        <MoneyInput
          id="quick-pay"
          language={language}
          label={DASHBOARD_COPY.saleAmount}
          value={amountMmk}
          onChange={setAmountMmk}
        />
        <label className="block">
          <span className="mb-1 block font-medium text-ink">
            {pickLine(DASHBOARD_COPY.due, language)}
          </span>
          <input
            type="date"
            className="min-h-11 w-full rounded-[14px] border border-line px-3"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-medium text-ink">Category</span>
          <select
            className="min-h-11 w-full rounded-[14px] border border-line px-3"
            value={category}
            onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
          >
            {EXPENSE_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {EXPENSE_CATEGORY_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="touch-target w-full rounded-[14px] bg-bank-blue px-4 font-semibold text-white"
        >
          {pickLine(DASHBOARD_COPY.addBill, language)}
        </button>
        {message ? <p className="text-base font-medium text-healthy">{message}</p> : null}
      </form>
      <Link to="/payments" className="inline-flex min-h-11 items-center font-semibold text-navy" onClick={onClose}>
        {pickLine(DASHBOARD_COPY.addBills, language)}
      </Link>
    </div>
  )
}

export function AddReserveForm({
  language,
}: {
  language: PreferredLanguage
  onClose: () => void
}) {
  const { store, saveScenarios } = useApp()
  const [addMmk, setAddMmk] = useState(0)
  const [message, setMessage] = useState('')
  const current = Math.trunc(store.scenarios.emergencyCashReserveTargetMmk ?? 0)

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const next = current + Math.max(0, Math.trunc(addMmk))
    saveScenarios({
      ...store.scenarios,
      emergencyCashReserveTargetMmk: next,
    })
    setMessage(`${formatMmk(next)}`)
    setAddMmk(0)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-base text-muted">
        {pickLine(DASHBOARD_COPY.emergencyReserve, language)}: {formatMmk(current)}
      </p>
      <MoneyInput
        id="quick-reserve"
        language={language}
        label={DASHBOARD_COPY.reserveAdd}
        value={addMmk}
        onChange={setAddMmk}
        hint={bilingualLine(DASHBOARD_COPY.reserveHint, language)}
      />
      <button
        type="submit"
        className="touch-target w-full rounded-[14px] bg-bank-blue px-4 font-semibold text-white"
      >
        {pickLine(DASHBOARD_COPY.reserveSave, language)}
      </button>
      {message ? <p className="text-base font-medium text-healthy">{message}</p> : null}
    </form>
  )
}

export function QuickActionModal({
  kind,
  language,
  onClose,
}: {
  kind: QuickModal
  language: PreferredLanguage
  onClose: () => void
}) {
  if (!kind) {
    return null
  }
  const title =
    kind === 'sale'
      ? pickLine(DASHBOARD_COPY.recordSale, language)
      : kind === 'pay'
        ? pickLine(DASHBOARD_COPY.paySupplier, language)
        : pickLine(DASHBOARD_COPY.addReserve, language)
  return (
    <Overlay title={title} onClose={onClose}>
      {kind === 'sale' ? <RecordSaleForm language={language} onClose={onClose} /> : null}
      {kind === 'pay' ? <PaySupplierForm language={language} onClose={onClose} /> : null}
      {kind === 'reserve' ? <AddReserveForm language={language} onClose={onClose} /> : null}
    </Overlay>
  )
}
