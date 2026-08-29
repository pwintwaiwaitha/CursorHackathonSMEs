import { useMemo, useState, type FormEvent } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { MoneyInput } from '../components/ui/MoneyInput'
import { useApp } from '../context/useApp'
import { checkInNetMmk, getCheckInForDate, getCurrentCashMmk } from '../lib/cashflow'
import { formatDisplayDate, todayIsoDate } from '../lib/dates'
import { formatMmk } from '../lib/money'
import { dailyCheckInSchema } from '../lib/validation'

export function CheckInPage() {
  const { store, saveCheckIn } = useApp()
  const today = todayIsoDate()
  const existing = getCheckInForDate(store, today)
  const calculatedCash = getCurrentCashMmk(store)
  const suggestedOpening = existing?.openingCashMmk ?? calculatedCash

  const [form, setForm] = useState({
    date: existing?.date ?? today,
    openingCashMmk: suggestedOpening < 0 ? 0 : suggestedOpening,
    cashSalesMmk: existing?.cashSalesMmk ?? 0,
    otherInflowsMmk: existing?.otherInflowsMmk ?? 0,
    cashExpensesMmk: existing?.cashExpensesMmk ?? 0,
    supplierPaymentsMmk: existing?.supplierPaymentsMmk ?? 0,
    stockPurchasesMmk: existing?.stockPurchasesMmk ?? 0,
    notes: existing?.notes ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const previewNet = useMemo(() => checkInNetMmk(form), [form])

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = dailyCheckInSchema.safeParse(form)
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
    saveCheckIn(parsed.data)
    setErrors({})
    setSaved(true)
  }

  return (
    <div>
      <PageHeader
        title="Daily Cash Check-in"
        subtitle={`Record money in and out for ${formatDisplayDate(form.date)}. Use whole kyat only.`}
      />

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-line bg-white p-4"
      >
        <label className="block" htmlFor="checkin-date">
          <span className="mb-1 block text-sm font-medium">Date</span>
          <input
            id="checkin-date"
            type="date"
            className="w-full max-w-xs rounded-md border border-line px-3 py-2"
            value={form.date}
            onChange={(event) => {
              const date = event.target.value
              const row = getCheckInForDate(store, date)
              setForm((current) => ({
                ...current,
                date,
                openingCashMmk: row?.openingCashMmk ?? current.openingCashMmk,
                cashSalesMmk: row?.cashSalesMmk ?? 0,
                otherInflowsMmk: row?.otherInflowsMmk ?? 0,
                cashExpensesMmk: row?.cashExpensesMmk ?? 0,
                supplierPaymentsMmk: row?.supplierPaymentsMmk ?? 0,
                stockPurchasesMmk: row?.stockPurchasesMmk ?? 0,
                notes: row?.notes ?? '',
              }))
              setSaved(false)
            }}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <MoneyInput
            id="opening"
            label="Cash counted in the box"
            value={form.openingCashMmk}
            onChange={(openingCashMmk) =>
              setForm((current) => ({ ...current, openingCashMmk }))
            }
            hint={`Records currently show ${formatMmk(calculatedCash)}.`}
            error={errors.openingCashMmk}
          />
          <MoneyInput
            id="sales"
            label="Cash sales today"
            value={form.cashSalesMmk}
            onChange={(cashSalesMmk) =>
              setForm((current) => ({ ...current, cashSalesMmk }))
            }
            error={errors.cashSalesMmk}
          />
          <MoneyInput
            id="otherIn"
            label="Other money in"
            value={form.otherInflowsMmk}
            onChange={(otherInflowsMmk) =>
              setForm((current) => ({ ...current, otherInflowsMmk }))
            }
            hint="Customer old bills, owner extra cash, etc."
            error={errors.otherInflowsMmk}
          />
          <MoneyInput
            id="expenses"
            label="Cash expenses"
            value={form.cashExpensesMmk}
            onChange={(cashExpensesMmk) =>
              setForm((current) => ({ ...current, cashExpensesMmk }))
            }
            hint="Food, transport, small shop costs."
            error={errors.cashExpensesMmk}
          />
          <MoneyInput
            id="suppliers"
            label="Supplier payments"
            value={form.supplierPaymentsMmk}
            onChange={(supplierPaymentsMmk) =>
              setForm((current) => ({ ...current, supplierPaymentsMmk }))
            }
            error={errors.supplierPaymentsMmk}
          />
          <MoneyInput
            id="stock"
            label="Stock purchases"
            value={form.stockPurchasesMmk}
            onChange={(stockPurchasesMmk) =>
              setForm((current) => ({ ...current, stockPurchasesMmk }))
            }
            error={errors.stockPurchasesMmk}
          />
        </div>

        <label className="block" htmlFor="notes">
          <span className="mb-1 block text-sm font-medium">Notes</span>
          <textarea
            id="notes"
            rows={3}
            className="w-full rounded-md border border-line px-3 py-2"
            value={form.notes}
            onChange={(event) =>
              setForm((current) => ({ ...current, notes: event.target.value }))
            }
            placeholder="Anything unusual today?"
          />
        </label>

        <p className="rounded-md bg-bank-blue-light px-3 py-2 text-sm text-navy">
          Today’s net movement:{' '}
          <strong>{formatMmk(previewNet)}</strong>
        </p>

        {saved ? (
          <p className="text-sm font-medium text-healthy">Saved. Your forecast is updated.</p>
        ) : null}

        <button
          type="submit"
          className="rounded-md bg-navy px-4 py-3 font-semibold text-white"
        >
          Save check-in
        </button>
      </form>
    </div>
  )
}
