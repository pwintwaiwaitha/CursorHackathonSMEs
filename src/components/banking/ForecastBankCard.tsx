import { useState } from 'react'
import type { Payable, PreferredLanguage, Receivable } from '../../types/models'
import type { BankActionType } from '../../types/bank'
import { pickLine } from '../../lib/checkInCopy'
import { BANK_COPY } from '../../lib/bankCopy'
import { DASHBOARD_COPY } from '../../lib/dashboardCopy'
import { formatDisplayDate } from '../../lib/dates'
import { formatMmk } from '../../lib/money'
import { suggestedReserveMmk } from '../../lib/bankBalance'
import { markPayablePaid, markReceivablePaid } from '../../lib/schedule'
import { useApp } from '../../context/useApp'
import { useBanking } from '../../hooks/useBanking'
import { BankActionModal } from './BankActionModal'

type ForecastAction = 'reminder' | 'receive' | 'use_reserve' | 'support' | 'save_reserve'

function modalKind(action: ForecastAction | null): BankActionType | null {
  if (action === 'reminder' || action === 'receive') {
    return 'collect_customer_payment'
  }
  if (action === 'use_reserve' || action === 'save_reserve') {
    return 'move_to_reserve'
  }
  if (action === 'support') {
    return 'request_bank_support'
  }
  return null
}

export function ForecastBankCard({
  language,
  hideAmounts,
  currentCashMmk,
  safeToSpendMmk,
  todaySalesMmk,
  receivables,
  payables,
  shortageDate,
  shortageAmountMmk,
  gapCause,
}: {
  language: PreferredLanguage
  hideAmounts: boolean
  currentCashMmk: number
  safeToSpendMmk: number
  todaySalesMmk: number
  receivables: Receivable[]
  payables: Payable[]
  shortageDate: string | null
  shortageAmountMmk: number
  gapCause: string | null
}) {
  const { updateReceivable, updatePayable } = useApp()
  const banking = useBanking()
  const [action, setAction] = useState<ForecastAction | null>(null)
  const suggested = suggestedReserveMmk(safeToSpendMmk)
  const hasShortage = Boolean(shortageDate) && shortageAmountMmk > 0
  const cause =
    gapCause === 'supplier_before_collections'
      ? pickLine(DASHBOARD_COPY.gapSupplier, language)
      : gapCause === 'large_bills'
        ? pickLine(DASHBOARD_COPY.gapBills, language)
        : null

  const shortageActions: { id: ForecastAction; label: string }[] = [
    { id: 'reminder', label: pickLine(BANK_COPY.sendReminder, language) },
    { id: 'receive', label: pickLine(BANK_COPY.receiveThroughBank, language) },
    { id: 'use_reserve', label: pickLine(BANK_COPY.useReserve, language) },
    { id: 'support', label: pickLine(BANK_COPY.requestSupport, language) },
  ]

  return (
    <section className="rounded-[16px] border border-line bg-white p-3 shadow-sm">
      <h2 className="text-base font-semibold text-navy">
        {hasShortage
          ? pickLine(BANK_COPY.predictedProblem, language)
          : pickLine(BANK_COPY.healthyReserveHint, language)}
      </h2>
      {hasShortage ? (
        <dl className="mt-2 space-y-1 text-base text-ink">
          {shortageDate ? (
            <div className="flex justify-between gap-2">
              <dt>{pickLine(DASHBOARD_COPY.nextShortage, language)}</dt>
              <dd className="font-semibold">{formatDisplayDate(shortageDate)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-2">
            <dt>{pickLine(DASHBOARD_COPY.shortageAmount, language)}</dt>
            <dd className="font-semibold">
              {hideAmounts ? '•••• MMK' : formatMmk(shortageAmountMmk)}
            </dd>
          </div>
          {cause ? (
            <div>
              <dt className="font-semibold">{pickLine(DASHBOARD_COPY.oneCause, language)}</dt>
              <dd>{cause}</dd>
            </div>
          ) : null}
        </dl>
      ) : suggested != null ? (
        <p className="mt-2 text-base font-semibold text-navy">
          {pickLine(BANK_COPY.moveReserve, language)} ·{' '}
          {hideAmounts ? '•••• MMK' : formatMmk(suggested)}
        </p>
      ) : (
        <p className="mt-2 text-base text-muted">
          {pickLine(BANK_COPY.noReserveSuggest, language)}
        </p>
      )}

      <div className="mt-3 grid gap-2">
        {hasShortage
          ? shortageActions.map((item) => (
              <button
                key={item.id}
                type="button"
                className="touch-target rounded-[14px] border border-line bg-pale px-3 text-left text-base font-semibold text-navy"
                onClick={() => setAction(item.id)}
              >
                {item.label}
              </button>
            ))
          : (
              <button
                type="button"
                className="touch-target rounded-[14px] bg-navy px-3 font-semibold text-white"
                onClick={() => setAction('save_reserve')}
              >
                {pickLine(BANK_COPY.saveToReserve, language)}
              </button>
            )}
      </div>

      <BankActionModal
        kind={modalKind(action)}
        language={language}
        isDemoMode={banking.isDemoMode}
        currentCashMmk={currentCashMmk}
        safeToSpendMmk={safeToSpendMmk}
        todaySalesMmk={todaySalesMmk}
        receivables={receivables}
        payables={payables}
        reserveDirection={action === 'use_reserve' ? 'use' : 'save'}
        reminderOnly={action === 'reminder'}
        onClose={() => setAction(null)}
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
