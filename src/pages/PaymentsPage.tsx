import { useState, type FormEvent } from 'react'
import { ConfirmAction } from '../components/schedule/ConfirmAction'
import { SegmentTabs } from '../components/ui/SegmentTabs'
import { MoneyInput } from '../components/ui/MoneyInput'
import { useApp } from '../context/useApp'
import { pickLine } from '../lib/checkInCopy'
import { DASHBOARD_COPY } from '../lib/dashboardCopy'
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

type PaymentTab = 'collect' | 'pay' | 'calendar'

function WindowChip({
  label,
  amountMmk,
  tone = 'default',
}: {
  label: string
  amountMmk: number
  tone?: 'default' | 'healthy' | 'watch' | 'risk'
}) {
  const toneClass =
    tone === 'risk'
      ? 'border-risk bg-risk-bg text-risk'
      : tone === 'watch'
        ? 'border-watch bg-watch-bg text-watch-ink'
        : tone === 'healthy'
          ? 'border-leaf bg-healthy-bg text-navy'
          : 'border-line bg-white text-ink'
  return (
    <span className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm font-semibold ${toneClass}`}>
      {label}: {formatMmk(amountMmk)}
    </span>
  )
}

export function PaymentsPage() {
  const { store, addReceivable, updateReceivable, removeReceivable, addPayable, updatePayable, removePayable } =
    useApp()
  const today = todayIsoDate()
  const language = store.profile?.preferredLanguage ?? 'en'
  const [tab, setTab] = useState<PaymentTab>('collect')
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
    <div className="space-y-4">
      <SegmentTabs
        label={pickLine({ en: 'Payments', my: 'ပေးချေမှု' }, language)}
        value={tab}
        onChange={setTab}
        options={[
          { id: 'collect', label: pickLine(DASHBOARD_COPY.toCollect, language) },
          { id: 'pay', label: pickLine(DASHBOARD_COPY.toPay, language) },
          { id: 'calendar', label: pickLine(DASHBOARD_COPY.calendar, language) },
        ]}
      />

      {overdueCustomers.length > 0 && tab === 'collect' ? (
        <p className="rounded-md border border-risk bg-risk-bg px-3 py-2 text-sm text-risk">
          Overdue: {overdueCustomers.map((item) => item.customerName).join(', ')}.
        </p>
      ) : null}
      {overdueSuppliers.length > 0 && tab === 'pay' ? (
        <p className="rounded-md border border-watch bg-watch-bg px-3 py-2 text-sm text-watch-ink">
          Overdue: {overdueSuppliers.map((item) => item.supplierName).join(', ')}.
        </p>
      ) : null}

      {tab === 'collect' ? (
        <div className="flex flex-wrap gap-2">
          <WindowChip label="3d" amountMmk={recvWindows.within3DaysMmk} tone="healthy" />
          <WindowChip label="7d" amountMmk={recvWindows.within7DaysMmk} />
          <WindowChip label="30d" amountMmk={recvWindows.within30DaysMmk} />
          <WindowChip
            label="Overdue"
            amountMmk={recvWindows.overdueMmk}
            tone={recvWindows.overdueMmk > 0 ? 'risk' : 'healthy'}
          />
        </div>
      ) : null}
      {tab === 'pay' ? (
        <div className="flex flex-wrap gap-2">
          <WindowChip
            label="3d"
            amountMmk={payWindows.within3DaysMmk}
            tone={payWindows.within3DaysMmk > 0 ? 'watch' : 'default'}
          />
          <WindowChip label="7d" amountMmk={payWindows.within7DaysMmk} />
          <WindowChip label="30d" amountMmk={payWindows.within30DaysMmk} />
          <WindowChip
            label="Overdue"
            amountMmk={payWindows.overdueMmk}
            tone={payWindows.overdueMmk > 0 ? 'risk' : 'healthy'}
          />
        </div>
      ) : null}

      {tab === 'calendar' ? (
      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="font-semibold text-navy">{pickLine(DASHBOARD_COPY.calendar, language)}</h2>
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
      ) : null}

      {tab === 'collect' ? (
      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="font-semibold text-navy">{pickLine(DASHBOARD_COPY.toCollect, language)}</h2>
        <form onSubmit={submitReceivable} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium">
              {pickLine({ en: 'Customer name', my: 'ဖောက်သည်အမည်' }, language)}
            </span>
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
            language={language}
            label={{ en: 'Amount', my: 'ပမာဏ' }}
            value={recvForm.amountMmk}
            onChange={(amountMmk) => setRecvForm((current) => ({ ...current, amountMmk }))}
          />
          <MoneyInput
            id="recv-paid"
            language={language}
            label={{ en: 'Amount already paid', my: 'ပေးပြီးငွေ' }}
            value={recvForm.amountPaidMmk}
            onChange={(amountPaidMmk) =>
              setRecvForm((current) => ({ ...current, amountPaidMmk }))
            }
          />
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium">
              {pickLine({ en: 'Expected payment date', my: 'ငွေရရန်ရက်' }, language)}
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
            <span className="mb-1 block text-sm font-medium">
              {pickLine({ en: 'Notes', my: 'မှတ်ချက်' }, language)}
            </span>
            <input
              className="w-full rounded-md border border-line px-3 py-2"
              value={recvForm.notes}
              onChange={(event) =>
                setRecvForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </label>
          <button type="submit" className="min-h-11 rounded-md bg-bank-blue px-4 font-semibold text-white">
            {pickLine({ en: 'Add receivable', my: 'ရရန်ရှိငွေ ထည့်ရန်' }, language)}
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
      ) : null}

      {reminder && tab === 'collect' ? (
        <section className="rounded-lg border border-line bg-white p-4">
          <h2 className="font-semibold text-navy">
            {pickLine({ en: 'Payment reminder', my: 'ငွေတောင်းခံစာ' }, language)}
          </h2>
          <pre className="mt-2 whitespace-pre-wrap rounded-md bg-page p-3 text-sm">{reminder}</pre>
          <button
            type="button"
            className="mt-3 rounded-md bg-bank-blue-light px-3 py-2 text-sm font-semibold text-navy"
            onClick={() => {
              void copyReminder()
            }}
          >
            {copied
              ? pickLine({ en: 'Copied', my: 'ကူးပြီး' }, language)
              : pickLine({ en: 'Copy message', my: 'စာကူးရန်' }, language)}
          </button>
        </section>
      ) : null}

      {tab === 'pay' ? (
      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="font-semibold text-navy">{pickLine(DASHBOARD_COPY.toPay, language)}</h2>
        <form onSubmit={submitPayable} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium">
              {pickLine({ en: 'Supplier or bill name', my: 'ကုန်သည် သို့မဟုတ် ဘီလ်' }, language)}
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
            language={language}
            label={{ en: 'Amount', my: 'ပမာဏ' }}
            value={payForm.amountMmk}
            onChange={(amountMmk) => setPayForm((current) => ({ ...current, amountMmk }))}
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              {pickLine({ en: 'Due date', my: 'ကျသင့်ရက်' }, language)}
            </span>
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
            <span className="mb-1 block text-sm font-medium">
              {pickLine({ en: 'Category', my: 'အမျိုးအစား' }, language)}
            </span>
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
              {pickLine({ en: 'One-time or recurring', my: 'တစ်ကြိမ် သို့မဟုတ် ပုံမှန်' }, language)}
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
              <option value="once">{pickLine({ en: 'One-time', my: 'တစ်ကြိမ်' }, language)}</option>
              <option value="weekly">{pickLine({ en: 'Weekly', my: 'အပတ်စဉ်' }, language)}</option>
              <option value="monthly">{pickLine({ en: 'Monthly', my: 'လစဉ်' }, language)}</option>
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium">
              {pickLine({ en: 'Notes', my: 'မှတ်ချက်' }, language)}
            </span>
            <input
              className="w-full rounded-md border border-line px-3 py-2"
              value={payForm.notes}
              onChange={(event) =>
                setPayForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </label>
          <button type="submit" className="min-h-11 rounded-md bg-bank-blue px-4 font-semibold text-white">
            {pickLine({ en: 'Add payable', my: 'ပေးရန်ဘီလ် ထည့်ရန်' }, language)}
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
      ) : null}
    </div>
  )
}
