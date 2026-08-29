import type { DailyCashCheckIn, PreferredLanguage } from '../../types/models'
import { CHECK_IN_COPY, bilingualLine } from '../../lib/checkInCopy'
import { formatDisplayDate } from '../../lib/dates'
import { formatMmk } from '../../lib/money'

interface CheckInHistoryListProps {
  language: PreferredLanguage
  checkIns: DailyCashCheckIn[]
  selectedDate: string
  onEdit: (date: string) => void
  onDelete: (id: string) => void
}

export function CheckInHistoryList({
  language,
  checkIns,
  selectedDate,
  onEdit,
  onDelete,
}: CheckInHistoryListProps) {
  const rows = [...checkIns].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <h2 className="font-semibold text-navy">
        {bilingualLine(CHECK_IN_COPY.historyTitle, language)}
      </h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-base text-muted">
          {bilingualLine(CHECK_IN_COPY.historyEmpty, language)}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {rows.map((item) => (
            <li
              key={item.id}
              className={`flex flex-wrap items-center justify-between gap-2 py-3 ${
                item.date === selectedDate ? 'bg-bank-blue-light/60' : ''
              }`}
            >
              <div>
                <p className="font-medium text-ink">{formatDisplayDate(item.date)}</p>
                <p className="text-sm text-muted">
                  {bilingualLine(CHECK_IN_COPY.closingCash, language)}:{' '}
                  {formatMmk(item.closingCashMmk)}
                </p>
              </div>
              <div className="flex gap-3 text-base">
                <button
                  type="button"
                  className="min-h-11 font-semibold text-navy"
                  onClick={() => onEdit(item.date)}
                >
                  {bilingualLine(CHECK_IN_COPY.edit, language)}
                </button>
                <button
                  type="button"
                  className="min-h-11 font-semibold text-risk"
                  onClick={() => onDelete(item.id)}
                >
                  {bilingualLine(CHECK_IN_COPY.delete, language)}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
