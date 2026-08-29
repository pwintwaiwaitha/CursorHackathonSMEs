import type { CalendarEntry } from '../../lib/schedule'
import { formatDisplayDate } from '../../lib/dates'
import { formatMmk } from '../../lib/money'
import { EmptyState } from '../ui/EmptyState'

export function PaymentTimeline({
  entries,
}: {
  entries: { date: string; entries: CalendarEntry[] }[]
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="No upcoming payments"
        message="Add customer bills and supplier bills to see a payment timeline."
      />
    )
  }

  return (
    <ol className="space-y-3">
      {entries.map((day) => (
        <li key={day.date} className="flex gap-3">
          <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-navy" />
          <div>
            <p className="text-base font-semibold text-navy">{formatDisplayDate(day.date)}</p>
            <ul className="mt-1 space-y-1 text-base">
              {day.entries.map((entry) => (
                <li key={`${entry.kind}-${entry.name}-${entry.amountMmk}`}>
                  <span className={entry.kind === 'receivable' ? 'text-healthy' : 'text-risk'}>
                    {entry.kind === 'receivable' ? 'In' : 'Out'}
                  </span>
                  {` · ${entry.name} · ${formatMmk(entry.amountMmk)}`}
                </li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ol>
  )
}
