import type { PreferredLanguage } from '../../types/models'
import type { CheckInCashFields } from '../../lib/checkIn'
import { CHECK_IN_COPY, bilingualLine } from '../../lib/checkInCopy'
import { formatMmk } from '../../lib/money'

interface CheckInCalculationPreviewProps {
  language: PreferredLanguage
  fields: CheckInCashFields
  closingCashMmk: number
  netCashMmk: number
}

function Row({
  label,
  amount,
  sign,
  strong,
}: {
  label: string
  amount: number
  sign: '+' | '-' | ''
  strong?: boolean
}) {
  return (
    <div className={`flex items-center justify-between gap-3 text-base ${strong ? 'font-bold' : ''}`}>
      <span className={strong ? 'text-navy' : 'text-muted'}>{label}</span>
      <span className={strong ? 'text-navy' : 'font-medium text-ink'}>
        {sign}
        {sign ? ' ' : ''}
        {formatMmk(amount)}
      </span>
    </div>
  )
}

export function CheckInCalculationPreview({
  language,
  fields,
  closingCashMmk,
  netCashMmk,
}: CheckInCalculationPreviewProps) {
  const totalReceived =
    fields.cashSalesMmk + fields.customerDebtCollectedMmk + fields.otherCashReceivedMmk
  const totalPaid =
    fields.operatingExpensesMmk +
    fields.inventoryPurchasesMmk +
    fields.supplierPaymentsMmk +
    fields.otherCashPaidMmk

  return (
    <section className="rounded-lg border border-navy bg-healthy-bg p-4">
      <h3 className="font-semibold text-navy">
        {bilingualLine(CHECK_IN_COPY.previewTitle, language)}
      </h3>
      <div className="mt-3 space-y-2">
        <Row
          label={bilingualLine(CHECK_IN_COPY.openingCash, language)}
          amount={fields.openingCashMmk}
          sign=""
        />
        <Row
          label={bilingualLine(CHECK_IN_COPY.totalReceived, language)}
          amount={totalReceived}
          sign="+"
        />
        <Row
          label={bilingualLine(CHECK_IN_COPY.totalPaid, language)}
          amount={totalPaid}
          sign="-"
        />
        <p className="text-base text-watch-ink">
          {bilingualLine(CHECK_IN_COPY.creditSales, language)}:{' '}
          {formatMmk(fields.creditSalesMmk)} —{' '}
          {bilingualLine(CHECK_IN_COPY.creditHint, language)}
        </p>
        <div className="border-t border-navy/20 pt-2">
          <Row
            label={bilingualLine(CHECK_IN_COPY.closingCash, language)}
            amount={closingCashMmk}
            sign=""
            strong
          />
          <Row
            label={bilingualLine(CHECK_IN_COPY.netCash, language)}
            amount={netCashMmk}
            sign=""
          />
        </div>
      </div>
    </section>
  )
}
