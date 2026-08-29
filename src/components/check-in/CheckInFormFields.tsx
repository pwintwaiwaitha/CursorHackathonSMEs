import type { PreferredLanguage } from '../../types/models'
import type { CheckInCashFields } from '../../lib/checkIn'
import { CHECK_IN_COPY, bilingualLine } from '../../lib/checkInCopy'
import { MoneyInput } from '../ui/MoneyInput'
import { TermTooltip } from '../ui/TermTooltip'

interface SharedProps {
  language: PreferredLanguage
  form: Omit<CheckInCashFields, 'openingCashMmk'> & {
    notes: string
  }
  errors: Record<string, string>
  warnings: Record<string, string>
  onChange: (
    field: keyof Omit<CheckInCashFields, 'openingCashMmk'> | 'notes',
    value: number | string,
  ) => void
}

export function MoneyInFields({
  language,
  form,
  errors,
  warnings,
  onChange,
}: SharedProps) {
  return (
    <div className="grid gap-4">
      <MoneyInput
        id="cash-sales"
        language={language}
        label={CHECK_IN_COPY.cashSales}
        value={form.cashSalesMmk}
        onChange={(value) => onChange('cashSalesMmk', value)}
        error={errors.cashSalesMmk}
        warning={warnings.cashSalesMmk}
      />
      <MoneyInput
        id="debt-collected"
        language={language}
        label={CHECK_IN_COPY.customerDebtCollected}
        value={form.customerDebtCollectedMmk}
        onChange={(value) => onChange('customerDebtCollectedMmk', value)}
        error={errors.customerDebtCollectedMmk}
        warning={warnings.customerDebtCollectedMmk}
      />
      <MoneyInput
        id="other-in"
        language={language}
        label={CHECK_IN_COPY.otherCashReceived}
        value={form.otherCashReceivedMmk}
        onChange={(value) => onChange('otherCashReceivedMmk', value)}
        error={errors.otherCashReceivedMmk}
        warning={warnings.otherCashReceivedMmk}
      />
      <div>
        <MoneyInput
          id="credit-sales"
          language={language}
          label={CHECK_IN_COPY.creditSales}
          value={form.creditSalesMmk}
          onChange={(value) => onChange('creditSalesMmk', value)}
          hint={bilingualLine(CHECK_IN_COPY.creditHint, language)}
          error={errors.creditSalesMmk}
          warning={warnings.creditSalesMmk}
        />
        <p className="mt-2 text-base text-watch-ink">
          <TermTooltip
            label={bilingualLine(CHECK_IN_COPY.creditTitle, language)}
            explanation={bilingualLine(CHECK_IN_COPY.creditHint, language)}
          />
        </p>
      </div>
    </div>
  )
}

export function MoneyOutFields({
  language,
  form,
  errors,
  warnings,
  onChange,
  operatingLocked = false,
}: SharedProps & { operatingLocked?: boolean }) {
  return (
    <div className="grid gap-4">
      <MoneyInput
        id="inventory"
        language={language}
        label={CHECK_IN_COPY.inventoryPurchases}
        value={form.inventoryPurchasesMmk}
        onChange={(value) => onChange('inventoryPurchasesMmk', value)}
        error={errors.inventoryPurchasesMmk}
        warning={warnings.inventoryPurchasesMmk}
      />
      <MoneyInput
        id="suppliers"
        language={language}
        label={CHECK_IN_COPY.supplierPayments}
        value={form.supplierPaymentsMmk}
        onChange={(value) => onChange('supplierPaymentsMmk', value)}
        error={errors.supplierPaymentsMmk}
        warning={warnings.supplierPaymentsMmk}
      />
      <MoneyInput
        id="operating"
        language={language}
        label={CHECK_IN_COPY.operatingExpenses}
        value={form.operatingExpensesMmk}
        onChange={
          operatingLocked
            ? undefined
            : (value) => onChange('operatingExpensesMmk', value)
        }
        readOnly={operatingLocked}
        error={errors.operatingExpensesMmk}
        warning={warnings.operatingExpensesMmk}
      />
      <MoneyInput
        id="other-out"
        language={language}
        label={CHECK_IN_COPY.otherCashPaid}
        value={form.otherCashPaidMmk}
        onChange={(value) => onChange('otherCashPaidMmk', value)}
        error={errors.otherCashPaidMmk}
        warning={warnings.otherCashPaidMmk}
      />
    </div>
  )
}

export function CheckInNotesField({
  language,
  form,
  onChange,
}: Pick<SharedProps, 'language' | 'form' | 'onChange'>) {
  return (
    <label className="block" htmlFor="notes">
      <span className="mb-1 block text-base font-medium text-ink">
        {bilingualLine(CHECK_IN_COPY.notes, language)}
      </span>
      <textarea
        id="notes"
        rows={3}
        className="min-h-11 w-full rounded-md border border-line px-3 py-3 text-base"
        value={form.notes}
        onChange={(event) => onChange('notes', event.target.value)}
        placeholder={bilingualLine(CHECK_IN_COPY.notesPlaceholder, language)}
      />
    </label>
  )
}

export function CheckInFormFields(props: SharedProps & { operatingLocked?: boolean }) {
  return (
    <div className="space-y-4">
      <MoneyInFields {...props} />
      <MoneyOutFields {...props} />
      <CheckInNotesField {...props} />
    </div>
  )
}
