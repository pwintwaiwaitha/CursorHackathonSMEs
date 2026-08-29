import type { PreferredLanguage } from '../../types/models'
import {
  EXPENSE_BREAKDOWN_CATEGORIES,
  type ExpenseBreakdownLine,
} from '../../types/models'
import {
  CHECK_IN_COPY,
  EXPENSE_BREAKDOWN_LABELS,
  bilingualLine,
} from '../../lib/checkInCopy'
import { parseIntegerMmk } from '../../lib/money'
import { loadExpenseFrequency } from '../../lib/uiStorage'

interface ExpenseBreakdownFieldsProps {
  language: PreferredLanguage
  lines: ExpenseBreakdownLine[]
  onChange: (lines: ExpenseBreakdownLine[]) => void
  onAdd: () => void
}

function sortedCategories() {
  const freq = loadExpenseFrequency()
  return [...EXPENSE_BREAKDOWN_CATEGORIES].sort(
    (a, b) => (freq[b] ?? 0) - (freq[a] ?? 0),
  )
}

export function ExpenseBreakdownFields({
  language,
  lines,
  onChange,
  onAdd,
}: ExpenseBreakdownFieldsProps) {
  const categories = sortedCategories()

  return (
    <section className="rounded-md border border-line bg-page p-3">
      <h3 className="text-base font-semibold text-navy">
        {bilingualLine(CHECK_IN_COPY.breakdownTitle, language)}
      </h3>
      <p className="mt-1 text-base text-muted">
        {bilingualLine(CHECK_IN_COPY.breakdownHint, language)}
      </p>
      <ul className="mt-3 space-y-2">
        {lines.map((line, index) => (
          <li key={line.id} className="grid grid-cols-[1fr_7rem_auto] gap-2">
            <select
              className="min-h-11 rounded-md border border-line bg-white px-2 text-base"
              value={line.category}
              onChange={(event) => {
                const next = [...lines]
                next[index] = {
                  ...line,
                  category: event.target
                    .value as ExpenseBreakdownLine['category'],
                }
                onChange(next)
              }}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {bilingualLine(EXPENSE_BREAKDOWN_LABELS[category], language)}
                </option>
              ))}
            </select>
            <input
              inputMode="numeric"
              className="min-h-11 rounded-md border border-line px-2 text-base"
              value={line.amountMmk === 0 ? '' : String(line.amountMmk)}
              onChange={(event) => {
                const next = [...lines]
                next[index] = {
                  ...line,
                  amountMmk: parseIntegerMmk(event.target.value),
                }
                onChange(next)
              }}
              placeholder="0"
            />
            <button
              type="button"
              className="touch-target text-base font-semibold text-risk"
              onClick={() => onChange(lines.filter((item) => item.id !== line.id))}
            >
              {bilingualLine(CHECK_IN_COPY.remove, language)}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-3 inline-flex min-h-11 items-center text-base font-semibold text-navy"
        onClick={onAdd}
      >
        {bilingualLine(CHECK_IN_COPY.addBreakdown, language)}
      </button>
    </section>
  )
}
