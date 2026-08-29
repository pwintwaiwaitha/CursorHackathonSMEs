import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckInCalculationPreview } from '../components/check-in/CheckInCalculationPreview'
import { CheckInConfirmBar } from '../components/check-in/CheckInConfirmBar'
import {
  CheckInNotesField,
  MoneyInFields,
  MoneyOutFields,
} from '../components/check-in/CheckInFormFields'
import { CheckInHistoryList } from '../components/check-in/CheckInHistoryList'
import { CheckInStepper } from '../components/check-in/CheckInStepper'
import { ExpenseBreakdownFields } from '../components/check-in/ExpenseBreakdownFields'
import { MoneyInput } from '../components/ui/MoneyInput'
import { PageHeader } from '../components/ui/PageHeader'
import { useApp } from '../context/useApp'
import {
  calculateClosingCashMmk,
  checkInNetCashMmk,
  findNegativeAmountFields,
  findUnusuallyLargeFields,
  getOpeningCashMmk,
  hasDuplicateCheckInDate,
  resolveOperatingExpensesMmk,
  type CheckInCashFields,
} from '../lib/checkIn'
import {
  CHECK_IN_COPY,
  bilingualLine,
  emptyCheckInForm,
} from '../lib/checkInCopy'
import { getCheckInForDate } from '../lib/cashflow'
import { todayIsoDate } from '../lib/dates'
import { createId } from '../lib/ids'
import {
  findOwnerLargeFields,
  formatSavedAt,
  recurringOutflowsForDate,
} from '../lib/ownerJourney'
import {
  clearCheckInDraft,
  clearUndoSnapshot,
  loadCheckInDraft,
  loadLastSaveAt,
  loadUndoSnapshot,
  markLastSave,
  rememberExpenseCategories,
  saveCheckInDraft,
  saveUndoSnapshot,
  type CheckInDraft,
} from '../lib/uiStorage'
import { dailyCheckInSchema } from '../lib/validation'
import type { DailyCashCheckIn, ExpenseBreakdownLine } from '../types/models'

type FormState = CheckInDraft
type Step = 1 | 2 | 3

function formFromRecord(record: DailyCashCheckIn): FormState {
  return {
    date: record.date,
    cashSalesMmk: record.cashSalesMmk,
    customerDebtCollectedMmk: record.customerDebtCollectedMmk,
    creditSalesMmk: record.creditSalesMmk,
    operatingExpensesMmk: record.operatingExpensesMmk,
    inventoryPurchasesMmk: record.inventoryPurchasesMmk,
    supplierPaymentsMmk: record.supplierPaymentsMmk,
    otherCashReceivedMmk: record.otherCashReceivedMmk,
    otherCashPaidMmk: record.otherCashPaidMmk,
    expenseBreakdowns: record.expenseBreakdowns,
    notes: record.notes,
  }
}

function startForm(
  store: ReturnType<typeof useApp>['store'],
  date: string,
): { form: FormState; prefilled: boolean } {
  const existing = getCheckInForDate(store, date)
  if (existing) {
    return { form: formFromRecord(existing), prefilled: false }
  }
  const draft = loadCheckInDraft(date)
  if (draft) {
    return { form: draft, prefilled: false }
  }
  const blank = emptyCheckInForm(date)
  const prefill = recurringOutflowsForDate(store, date)
  if (!prefill.applied) {
    return { form: blank, prefilled: false }
  }
  return {
    form: {
      ...blank,
      inventoryPurchasesMmk: prefill.inventoryPurchasesMmk,
      supplierPaymentsMmk: prefill.supplierPaymentsMmk,
      operatingExpensesMmk: prefill.operatingExpensesMmk,
      otherCashPaidMmk: prefill.otherCashPaidMmk,
    },
    prefilled: true,
  }
}

export function CheckInPage() {
  const { store, saveCheckIn, deleteCheckIn } = useApp()
  const [searchParams] = useSearchParams()
  const language = store.profile?.preferredLanguage ?? 'en'
  const starting = store.profile?.startingCashBalanceMmk ?? 0
  const today = todayIsoDate()
  const initial = startForm(store, today)

  const [form, setForm] = useState<FormState>(initial.form)
  const [step, setStep] = useState<Step>(1)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmed, setConfirmed] = useState(false)
  const [largeConfirmed, setLargeConfirmed] = useState(false)
  const [saved, setSaved] = useState(false)
  const [undone, setUndone] = useState(false)
  const [prefilled, setPrefilled] = useState(initial.prefilled)
  const [lastSave, setLastSave] = useState(loadLastSaveAt)
  const [canUndo, setCanUndo] = useState(() => Boolean(loadUndoSnapshot()))

  const spokenNotes = searchParams.get('notes') ?? ''
  const [appliedSpoken, setAppliedSpoken] = useState(spokenNotes)
  if (spokenNotes && spokenNotes !== appliedSpoken) {
    setAppliedSpoken(spokenNotes)
    setForm((current) => ({
      ...current,
      notes: current.notes ? current.notes : spokenNotes,
    }))
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveCheckInDraft(form.date, form)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [form])

  const othersForDate = store.checkIns.filter((item) => item.date !== form.date)
  const openingCashMmk = getOpeningCashMmk(othersForDate, form.date, starting)
  const operatingExpensesMmk = resolveOperatingExpensesMmk(
    form.operatingExpensesMmk,
    form.expenseBreakdowns,
  )
  const cashFields: CheckInCashFields = {
    openingCashMmk,
    cashSalesMmk: form.cashSalesMmk,
    customerDebtCollectedMmk: form.customerDebtCollectedMmk,
    creditSalesMmk: form.creditSalesMmk,
    operatingExpensesMmk,
    inventoryPurchasesMmk: form.inventoryPurchasesMmk,
    supplierPaymentsMmk: form.supplierPaymentsMmk,
    otherCashReceivedMmk: form.otherCashReceivedMmk,
    otherCashPaidMmk: form.otherCashPaidMmk,
  }
  const closingCashMmk = calculateClosingCashMmk(cashFields)
  const netCashMmk = checkInNetCashMmk(cashFields)
  const existingForDate = getCheckInForDate(store, form.date)
  const isDuplicate = hasDuplicateCheckInDate(store.checkIns, form.date)
  const previousExists = othersForDate.some((item) => item.date < form.date)

  const monthlyLarge = findUnusuallyLargeFields(
    cashFields,
    store.profile?.averageMonthlySalesMmk ?? 0,
  )
  const ownerLarge = findOwnerLargeFields(
    cashFields,
    othersForDate,
    openingCashMmk,
  )
  const largeFields = [...new Set([...monthlyLarge, ...ownerLarge])]
  const ownerFlagged = new Set<string>(ownerLarge)

  const warnings: Record<string, string> = {}
  for (const key of largeFields) {
    warnings[key] =
      ownerFlagged.has(key) && cashFields[key] > openingCashMmk
        ? bilingualLine(CHECK_IN_COPY.remainingCashWarn, language)
        : ownerFlagged.has(key)
          ? bilingualLine(CHECK_IN_COPY.avgWarn, language)
          : bilingualLine(CHECK_IN_COPY.largeWarning, language)
  }

  const needsLargeConfirm = largeFields.length > 0
  const canSave = confirmed && (!needsLargeConfirm || largeConfirmed)

  function loadDate(date: string) {
    const next = startForm(store, date)
    setForm(next.form)
    setPrefilled(next.prefilled)
    setConfirmed(false)
    setLargeConfirmed(false)
    setSaved(false)
    setUndone(false)
    setErrors({})
    setStep(1)
  }

  function onFieldChange(
    field: keyof Omit<CheckInCashFields, 'openingCashMmk'> | 'notes',
    value: number | string,
  ) {
    setForm((current) => ({ ...current, [field]: value }))
    setConfirmed(false)
    setSaved(false)
    setUndone(false)
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (step !== 3) {
      return
    }
    const negatives = findNegativeAmountFields(
      cashFields,
      form.expenseBreakdowns,
    )
    if (negatives.length > 0) {
      const next: Record<string, string> = {}
      for (const key of negatives) {
        next[key] = bilingualLine(CHECK_IN_COPY.negativeWarning, language)
      }
      setErrors(next)
      setSaved(false)
      return
    }

    const parsed = dailyCheckInSchema.safeParse({
      ...form,
      operatingExpensesMmk,
    })
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form')
        if (!next[key]) {
          next[key] = issue.message
        }
      }
      setErrors(next)
      setSaved(false)
      return
    }
    if (!canSave) {
      return
    }

    const previous = existingForDate ?? null
    saveUndoSnapshot({
      date: parsed.data.date,
      previous,
      expiresAt: Date.now() + 10 * 60 * 1000,
    })
    saveCheckIn(parsed.data)
    rememberExpenseCategories(parsed.data.expenseBreakdowns)
    clearCheckInDraft(parsed.data.date)
    const stamp = markLastSave()
    setLastSave(stamp)
    setErrors({})
    setSaved(true)
    setCanUndo(true)
    setUndone(false)
  }

  function onUndo() {
    const snap = loadUndoSnapshot()
    if (!snap) {
      return
    }
    if (snap.previous) {
      saveCheckIn({
        date: snap.previous.date,
        cashSalesMmk: snap.previous.cashSalesMmk,
        customerDebtCollectedMmk: snap.previous.customerDebtCollectedMmk,
        creditSalesMmk: snap.previous.creditSalesMmk,
        operatingExpensesMmk: snap.previous.operatingExpensesMmk,
        inventoryPurchasesMmk: snap.previous.inventoryPurchasesMmk,
        supplierPaymentsMmk: snap.previous.supplierPaymentsMmk,
        otherCashReceivedMmk: snap.previous.otherCashReceivedMmk,
        otherCashPaidMmk: snap.previous.otherCashPaidMmk,
        expenseBreakdowns: snap.previous.expenseBreakdowns,
        notes: snap.previous.notes,
      })
      setForm(formFromRecord(snap.previous))
    } else {
      const row = getCheckInForDate(store, snap.date)
      if (row) {
        deleteCheckIn(row.id)
      }
      setForm(emptyCheckInForm(snap.date))
    }
    clearUndoSnapshot()
    setCanUndo(false)
    setSaved(false)
    setUndone(true)
    setConfirmed(false)
    setLargeConfirmed(false)
  }

  function onDelete(id: string) {
    const ok = window.confirm(bilingualLine(CHECK_IN_COPY.deleteConfirm, language))
    if (!ok) {
      return
    }
    deleteCheckIn(id)
    if (existingForDate?.id === id) {
      setForm(emptyCheckInForm(today))
    }
    setSaved(false)
    setConfirmed(false)
  }

  const formView = { ...form, operatingExpensesMmk }

  return (
    <div className="space-y-5">
      <PageHeader
        title={bilingualLine(CHECK_IN_COPY.pageTitle, language)}
        subtitle={bilingualLine(CHECK_IN_COPY.pageSubtitle, language)}
      />

      <p className="text-base text-muted" aria-live="polite">
        {formatSavedAt(lastSave, language)}
      </p>

      <CheckInStepper step={step} language={language} />

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-line bg-white p-4"
      >
        <label className="block max-w-xs" htmlFor="checkin-date">
          <span className="mb-1 block text-base font-medium">
            {bilingualLine(CHECK_IN_COPY.date, language)}
          </span>
          <input
            id="checkin-date"
            type="date"
            className="min-h-11 w-full rounded-md border border-line px-3"
            value={form.date}
            onChange={(event) => loadDate(event.target.value)}
          />
        </label>

        <MoneyInput
          id="opening"
          language={language}
          label={CHECK_IN_COPY.openingCash}
          value={openingCashMmk}
          readOnly
          hint={
            previousExists
              ? bilingualLine(CHECK_IN_COPY.openingAuto, language)
              : bilingualLine(CHECK_IN_COPY.firstDayOpening, language)
          }
        />

        {prefilled && step === 2 ? (
          <p className="rounded-md bg-watch-bg px-3 py-3 text-base text-watch-ink">
            {bilingualLine(CHECK_IN_COPY.prefilledBills, language)}
          </p>
        ) : null}

        {isDuplicate ? (
          <p className="rounded-md bg-watch-bg px-3 py-3 text-base text-watch-ink">
            {bilingualLine(CHECK_IN_COPY.savingReplace, language)}
          </p>
        ) : null}

        {step === 1 ? (
          <>
            <MoneyInFields
              language={language}
              form={formView}
              errors={errors}
              warnings={warnings}
              onChange={onFieldChange}
            />
            <CheckInNotesField
              language={language}
              form={formView}
              onChange={onFieldChange}
            />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <MoneyOutFields
              language={language}
              form={formView}
              errors={errors}
              warnings={warnings}
              operatingLocked={form.expenseBreakdowns.length > 0}
              onChange={onFieldChange}
            />
            <ExpenseBreakdownFields
              language={language}
              lines={form.expenseBreakdowns}
              onChange={(expenseBreakdowns) => {
                setForm((current) => ({ ...current, expenseBreakdowns }))
                setConfirmed(false)
                setSaved(false)
              }}
              onAdd={() => {
                const line: ExpenseBreakdownLine = {
                  id: createId('line'),
                  category: 'other',
                  amountMmk: 0,
                }
                setForm((current) => ({
                  ...current,
                  expenseBreakdowns: [...current.expenseBreakdowns, line],
                }))
                setConfirmed(false)
                setSaved(false)
              }}
            />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <CheckInCalculationPreview
              language={language}
              fields={cashFields}
              closingCashMmk={closingCashMmk}
              netCashMmk={netCashMmk}
            />
            {Object.keys(warnings).length > 0 ? (
              <ul className="space-y-2 rounded-md bg-watch-bg px-3 py-3 text-base text-watch-ink">
                {Object.values(warnings).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
            <CheckInConfirmBar
              language={language}
              confirmed={confirmed}
              isDuplicate={isDuplicate}
              canSave={canSave}
              needsLargeConfirm={needsLargeConfirm}
              largeConfirmed={largeConfirmed}
              onConfirmChange={setConfirmed}
              onLargeConfirmChange={setLargeConfirmed}
            />
          </>
        ) : null}

        {saved ? (
          <p className="rounded-md bg-healthy-bg px-3 py-3 text-base font-medium text-healthy" role="status">
            {bilingualLine(CHECK_IN_COPY.saved, language)}{' '}
            <Link to="/" className="underline">
              {bilingualLine(CHECK_IN_COPY.seeDashboard, language)}
            </Link>
          </p>
        ) : null}

        {undone ? (
          <p className="rounded-md bg-watch-bg px-3 py-3 text-base text-watch-ink" role="status">
            {bilingualLine(CHECK_IN_COPY.undone, language)}
          </p>
        ) : null}

        {canUndo ? (
          <button
            type="button"
            className="inline-flex min-h-11 items-center font-semibold text-navy"
            onClick={onUndo}
          >
            {bilingualLine(CHECK_IN_COPY.undo, language)}
          </button>
        ) : null}

        <p className="text-base text-muted">
          {bilingualLine(CHECK_IN_COPY.draftSaved, language)}
        </p>

        <div className="flex flex-wrap gap-3">
          {step > 1 ? (
            <button
              type="button"
              className="min-h-11 min-w-[44px] rounded-md bg-bank-blue-light px-4 font-semibold text-navy"
              onClick={() => setStep((current) => (current === 3 ? 2 : 1))}
            >
              {bilingualLine(CHECK_IN_COPY.back, language)}
            </button>
          ) : null}
          {step < 3 ? (
            <button
              type="button"
              className="min-h-11 min-w-[44px] flex-1 rounded-md bg-bank-blue px-4 font-semibold text-white"
              onClick={() => setStep((current) => (current === 1 ? 2 : 3))}
            >
              {bilingualLine(CHECK_IN_COPY.next, language)}
            </button>
          ) : (
            <button
              type="button"
              className="min-h-11 rounded-md bg-bank-blue-light px-4 font-semibold text-navy"
              onClick={() => setStep(1)}
            >
              {bilingualLine(CHECK_IN_COPY.edit, language)}
            </button>
          )}
        </div>
      </form>

      <CheckInHistoryList
        language={language}
        checkIns={store.checkIns}
        selectedDate={form.date}
        onEdit={loadDate}
        onDelete={onDelete}
      />
    </div>
  )
}
