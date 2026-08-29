import { parseIntegerMmk } from '../../lib/money'

interface MoneyInputProps {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  hint?: string
  error?: string
}

export function MoneyInput({
  id,
  label,
  value,
  onChange,
  hint,
  error,
}: MoneyInputProps) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      <div className="flex overflow-hidden rounded-md border border-line bg-white">
        <span className="border-r border-line bg-bank-blue-light px-3 py-2 text-sm font-medium text-navy">
          MMK
        </span>
        <input
          id={id}
          inputMode="numeric"
          className="w-full px-3 py-2 text-ink"
          value={value === 0 ? '' : String(value)}
          onChange={(event) => onChange(parseIntegerMmk(event.target.value))}
          placeholder="0"
        />
      </div>
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs text-risk">{error}</span> : null}
    </label>
  )
}
