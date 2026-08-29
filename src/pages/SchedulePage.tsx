import { useState, type FormEvent } from 'react'
import { ConfirmAction } from '../components/schedule/ConfirmAction'
import { MoneyInput } from '../components/ui/MoneyInput'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { useApp } from '../context/useApp'
import { formatDisplayDate, todayIsoDate } from '../lib/dates'
import { formatMmk } from '../lib/money'
import {
  applyReceivablePayment,
  buildPaymentCalendar,
  derivePayableStatus,
  deriveReceivableStatus,
  groupCalendarByDate,
  markPayablePaid,
  markReceivablePaid,
  myanmarPaymentReminder,
  payableWindows,
  receivableWindows,
  remainingPayableMmk,
  remainingReceivableMmk,
} from '../lib/schedule'
import { payableSchema, receivableSchema } from '../lib/validation'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  PAYABLE_STATUS_LABELS,
  RECEIVABLE_STATUS_LABELS,
  type ExpenseCategory,
  type Recurrence,
} from '../types/models'

export function SchedulePage() {
  const { store, addReceivable, updateReceivable, removeReceivable, addPayable, updatePayable, removePayable } =
    useApp()
  const today = todayIsoDate()
  const businessName = store.profile?.businessName ?? 'SME Mate AI'
  const recvWindows = receivableWindows(store.receivables, today)
  const payWindows = payableWindows(store.payables, today)
  const calendar = groupCalendarByDate(
    buildPaymentCalendar(store.receivables, store.payables, today),
    today,
  )

  const overdueCustomers = store.receivables.filter(
    (item) => deriveReceivableStatus(item, today) === 'overdue',
  )
  const overdueSuppliers = store.payables.filter(
    (item) => derivePayableStatus(item, today) === 'overdue',
  )

  const [recvForm, setRecvForm] = useState({
    customerName: '',
    amountMmk: 0,
    expectedPaymentDate: today,
    amountPaidMmk: 0,
    notes: '',
  })
  const [payForm, setPayForm] = useState({
    supplierName: '',
    amountMmk: 0,
    dueDate: today,
    category: 'stock' as ExpenseCategory,
    recurrence: 'once' as Recurrence,
    notes: '',
  })
  const [formError, setFormError] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)
  const [actionKind, setActionKind] = useState<'recv-partial' | 'recv-paid' | 'pay-paid' | null>(null)
  const [partialAmount, setPartialAmount] = useState(0)
  const [confirmed, setConfirmed] = useState(false)
  const [reminder, setReminder] = useState('')
  const [copied, setCopied] = useState(false)

  function resetAction() {
    setActionId(null)
    setActionKind(null)
    setPartialAmount(0)
    setConfirmed(false)
  }

  function submitReceivable(event: FormEvent) {
    event.preventDefault()
    const parsed = receivableSchema.safeParse(recvForm)
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Check the customer bill.')
      return
    }
    addReceivable(parsed.data)
    setRecvForm({
      customerName: '',
      amountMmk: 0,
      expectedPaymentDate: today,
      amountPaidMmk: 0,
      notes: '',
    })
    setFormError('')
  }

  function submitPayable(event: FormEvent) {
    event.preventDefault()
    const parsed = payableSchema.safeParse(payForm)
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Check the supplier bill.')
      return
    }
    addPayable(parsed.data)
    setPayForm({
      supplierName: '',
      amountMmk: 0,
      dueDate: today,
      category: 'stock',
      recurrence: 'once',
      notes: '',
    })
    setFormError('')
  }

  function runConfirmedAction() {
    if (!actionId || !actionKind) {
      return
    }
    if (actionKind === 'recv-paid') {
      const item = store.receivables.find((row) => row.id === actionId)
      if (item) {
        updateReceivable(markReceivablePaid(item))
      }
    }
    if (actionKind === 'recv-partial') {
      const item = store.receivables.find((row) => row.id === actionId)
      if (item) {
        updateReceivable(applyReceivablePayment(item, partialAmount, today))
      }
    }
    if (actionKind === 'pay-paid') {
      const item = store.payables.find((row) => row.id === actionId)
      if (item) {
        updatePayable(markPayablePaid(item))
      }
    }
    resetAction()
  }

  async function copyReminder() {
    if (!reminder) {
      return
    }
    await navigator.clipboard.writeText(reminder)
    setCopied(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receivables and payables"
        subtitle="Customer money coming in and supplier bills going out. Expected money is not cash until collected or paid."
      />

      {overdueCustomers.length > 0 ? (
        <p className="rounded-md border border-risk bg-risk-bg px-3 py-2 text-sm text-risk">
          Overdue customer payments: {overdueCustomers.map((item) => item.customerName).join(', ')}.
          Collect remaining cash before it gets older.
        </p>
      ) : null}
      {overdueSuppliers.length > 0 ? (
        <p className="rounded-md border border-watch bg-watch-bg px-3 py-2 text-sm text-watch-ink">
          Supplier bills overdue: {overdueSuppliers.map((item) => item.supplierName).join(', ')}.
          Talk to the supplier if cash is tight.
        </p>
      ) : null}

      <section>
        <h2 className="mb-3 font-semibold text-navy">Due windows</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Customers in 3 days"
            value={recvWindows.within3DaysMmk}
            tone="healthy"
          />
          <StatCard label="Customers in 7 days" value={recvWindows.within7DaysMmk} />
          <StatCard label="Customers in 30 days" value={recvWindows.within30DaysMmk} />
          <StatCard
            label="Overdue customers"
            value={recvWindows.overdueMmk}
            tone={recvWindows.overdueMmk > 0 ? 'risk' : 'healthy'}
          />
          <StatCard
            label="Bills in 3 days"
            value={payWindows.within3DaysMmk}
            tone={payWindows.within3DaysMmk > 0 ? 'watch' : 'default'}
          />
          <StatCard label="Bills in 7 days" value={payWindows.within7DaysMmk} />
          <StatCard label="Bills in 30 days" value={payWindows.within30DaysMmk} />
          <StatCard
            label="Overdue bills"
            value={payWindows.overdueMmk}
            tone={payWindows.overdueMmk > 0 ? 'risk' : 'healthy'}
          />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="font-semibold text-navy">Upcoming payments calendar</h2>
        {calendar.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No expected payments in the next 30 days.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {calendar.map((day) => (
              <li key={day.date} className="rounded-md border border-line p-3">
                <p className="text-sm font-semibold text-navy">
                  {formatDisplayDate(day.date)}
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {day.entries.map((entry) => (
                    <li key={`${entry.kind}-${entry.name}-${entry.date}`}>
                      <span className={entry.kind === 'receivable' ? 'text-healthy' : 'text-risk'}>
                        {entry.kind === 'receivable' ? 'In' : 'Out'}
                      </span>
                      {' · '}
                      {entry.name} · {formatMmk(entry.amountMmk)}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="font-semibold text-navy">Customer receivables</h2>
        <form onSubmit={submitReceivable} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium">Customer name / ဖောက်သည်အမည်</span>
            <input
              className="w-full rounded-md border border-line px-3 py-2"
              value={recvForm.customerName}
              onChange={(event) =>
                setRecvForm((current) => ({ ...current, customerName: event.target.value }))
              }
            />
          </label>
          <MoneyInput
            id="recv-amount"
            label="Amount / ပမာဏ"
            value={recvForm.amountMmk}
            onChange={(amountMmk) => setRecvForm((current) => ({ ...current, amountMmk }))}
          />
          <MoneyInput
            id="recv-paid"
            label="Amount already paid / ပေးပြီးငွေ"
            value={recvForm.amountPaidMmk}
            onChange={(amountPaidMmk) =>
              setRecvForm((current) => ({ ...current, amountPaidMmk }))
            }
          />
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium">
              Expected payment date / ငွေရရန်ရက်
            </span>
            <input
              type="date"
              className="w-full rounded-md border border-line px-3 py-2"
              value={recvForm.expectedPaymentDate}
              onChange={(event) =>
                setRecvForm((current) => ({
                  ...current,
                  expectedPaymentDate: event.target.value,
                }))
              }
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium">Notes / မှတ်ချက်</span>
            <input
              className="w-full rounded-md border border-line px-3 py-2"
              value={recvForm.notes}
              onChange={(event) =>
                setRecvForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </label>
          <button type="submit" className="rounded-md bg-bank-blue px-4 py-2 font-semibold text-white">
            Add receivable
          </button>
        </form>

        <ul className="mt-4 divide-y divide-line">
          {store.receivables.map((item) => {
            const status = deriveReceivableStatus(item, today)
            const remaining = remainingReceivableMmk({ ...item, status })
            return (
              <li key={item.id} className="space-y-2 py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {item.customerName} · {formatMmk(item.amountMmk)}
                    </p>
                    <p className="text-muted">
                      {RECEIVABLE_STATUS_LABELS[status]} · remaining {formatMmk(remaining)} ·{' '}
                      {formatDisplayDate(item.expectedPaymentDate)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {remaining > 0 ? (
                      <>
                        <button
                          type="button"
                          className="text-bank-blue"
                          onClick={() => {
                            setActionId(item.id)
                            setActionKind('recv-partial')
                            setPartialAmount(0)
                            setConfirmed(false)
                          }}
                        >
                          Partial pay
                        </button>
                        <button
                          type="button"
                          className="text-healthy"
                          onClick={() => {
                            setActionId(item.id)
                            setActionKind('recv-paid')
                            setConfirmed(false)
                          }}
                        >
                          Mark paid
                        </button>
                        <button
                          type="button"
                          className="text-navy"
                          onClick={() => {
                            setReminder(
                              myanmarPaymentReminder({
                                customerName: item.customerName,
                                businessName,
                                remainingMmk: remaining,
                                expectedPaymentDate: item.expectedPaymentDate,
                              }),
                            )
                            setCopied(false)
                          }}
                        >
                          Reminder
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      className="text-risk"
                      onClick={() => removeReceivable(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {actionId === item.id && actionKind === 'recv-paid' ? (
                  <ConfirmAction
                    title="Mark this customer bill as paid?"
                    confirmLabel="I confirm this cash was collected."
                    confirmed={confirmed}
                    onConfirmChange={setConfirmed}
                    onCancel={resetAction}
                    onSubmit={runConfirmedAction}
                    submitLabel="Save as paid"
                  >
                    Remaining {formatMmk(remaining)} will leave the receivable list. It is not
                    added to cash until you also record it in Daily Cash Check-in.
                  </ConfirmAction>
                ) : null}
                {actionId === item.id && actionKind === 'recv-partial' ? (
                  <ConfirmAction
                    title="Record a partial payment?"
                    confirmLabel="I confirm this part was collected."
                    confirmed={confirmed}
                    onConfirmChange={setConfirmed}
                    onCancel={resetAction}
                    onSubmit={runConfirmedAction}
                    submitLabel="Save partial payment"
                  >
                    <MoneyInput
                      id={`partial-${item.id}`}
                      label="Amount collected now"
                      value={partialAmount}
                      onChange={setPartialAmount}
                    />
                  </ConfirmAction>
                ) : null}
              </li>
            )
          })}
        </ul>
      </section>

      {reminder ? (
        <section className="rounded-lg border border-line bg-white p-4">
          <h2 className="font-semibold text-navy">Myanmar payment reminder</h2>
          <pre className="mt-2 whitespace-pre-wrap rounded-md bg-page p-3 text-sm">{reminder}</pre>
          <button
            type="button"
            className="mt-3 rounded-md bg-bank-blue-light px-3 py-2 text-sm font-semibold text-navy"
            onClick={() => {
              void copyReminder()
            }}
          >
            {copied ? 'Copied' : 'Copy message'}
          </button>
        </section>
      ) : null}

      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="font-semibold text-navy">Supplier payables</h2>
        <form onSubmit={submitPayable} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium">
              Supplier or bill name / ကုန်သည် သို့မဟုတ် ဘီလ်
            </span>
            <input
              className="w-full rounded-md border border-line px-3 py-2"
              value={payForm.supplierName}
              onChange={(event) =>
                setPayForm((current) => ({ ...current, supplierName: event.target.value }))
              }
            />
          </label>
          <MoneyInput
            id="pay-amount"
            label="Amount / ပမာဏ"
            value={payForm.amountMmk}
            onChange={(amountMmk) => setPayForm((current) => ({ ...current, amountMmk }))}
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Due date / ကျသင့်ရက်</span>
            <input
              type="date"
              className="w-full rounded-md border border-line px-3 py-2"
              value={payForm.dueDate}
              onChange={(event) =>
                setPayForm((current) => ({ ...current, dueDate: event.target.value }))
              }
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Category / အမျိုးအစား</span>
            <select
              className="w-full rounded-md border border-line px-3 py-2"
              value={payForm.category}
              onChange={(event) =>
                setPayForm((current) => ({
                  ...current,
                  category: event.target.value as ExpenseCategory,
                }))
              }
            >
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {EXPENSE_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              One-time or recurring / တစ်ကြိမ် သို့မဟုတ် ပုံမှန်
            </span>
            <select
              className="w-full rounded-md border border-line px-3 py-2"
              value={payForm.recurrence}
              onChange={(event) =>
                setPayForm((current) => ({
                  ...current,
                  recurrence: event.target.value as Recurrence,
                }))
              }
            >
              <option value="once">One-time / တစ်ကြိမ်</option>
              <option value="weekly">Weekly / အပတ်စဉ်</option>
              <option value="monthly">Monthly / လစဉ်</option>
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium">Notes / မှတ်ချက်</span>
            <input
              className="w-full rounded-md border border-line px-3 py-2"
              value={payForm.notes}
              onChange={(event) =>
                setPayForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </label>
          <button type="submit" className="rounded-md bg-bank-blue px-4 py-2 font-semibold text-white">
            Add payable
          </button>
        </form>
        {formError ? <p className="mt-2 text-sm text-risk">{formError}</p> : null}

        <ul className="mt-4 divide-y divide-line">
          {store.payables.map((item) => {
            const status = derivePayableStatus(item, today)
            const remaining = remainingPayableMmk({ ...item, status })
            return (
              <li key={item.id} className="space-y-2 py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {item.supplierName} · {formatMmk(item.amountMmk)}
                    </p>
                    <p className="text-muted">
                      {PAYABLE_STATUS_LABELS[status]} · {EXPENSE_CATEGORY_LABELS[item.category]} ·{' '}
                      {item.recurrence === 'once' ? 'One-time' : item.recurrence} ·{' '}
                      {formatDisplayDate(item.dueDate)}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    {remaining > 0 ? (
                      <button
                        type="button"
                        className="text-healthy"
                        onClick={() => {
                          setActionId(item.id)
                          setActionKind('pay-paid')
                          setConfirmed(false)
                        }}
                      >
                        Mark paid
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="text-risk"
                      onClick={() => removePayable(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {actionId === item.id && actionKind === 'pay-paid' ? (
                  <ConfirmAction
                    title="Mark this supplier bill as paid?"
                    confirmLabel="I confirm this bill was paid from the shop."
                    confirmed={confirmed}
                    onConfirmChange={setConfirmed}
                    onCancel={resetAction}
                    onSubmit={runConfirmedAction}
                    submitLabel="Save as paid"
                  >
                    {formatMmk(remaining)} will leave upcoming payables. Record the cash out in
                    Daily Cash Check-in so the till stays correct.
                  </ConfirmAction>
                ) : null}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
