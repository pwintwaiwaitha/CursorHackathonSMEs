import type { PreferredLanguage } from '../../types/models'
import { parseIntegerMmk } from '../../lib/money'
import type { BilingualText } from '../../lib/checkInCopy'
import { BilingualLabel } from './BilingualLabel'

interface MoneyInputProps {
  id: string
  label: string | BilingualText
  language?: PreferredLanguage
  value: number
  onChange?: (value: number) => void
  hint?: string
  error?: string
  warning?: string
  readOnly?: boolean
}

export function MoneyInput({
  id,
  label,
  language = 'en',
  value,
  onChange,
  hint,
  error,
  warning,
  readOnly = false,
}: MoneyInputProps) {
  return (
    <label className="block" htmlFor={id}>
      {typeof label === 'string' ? (
        <span className="mb-1 block text-base font-medium text-ink">{label}</span>
      ) : (
        <span className="mb-1 block">
          <BilingualLabel text={label} language={language} />
        </span>
      )}
      <div
        className={`flex min-h-11 overflow-hidden rounded-md border bg-white ${
          error ? 'border-risk' : warning ? 'border-watch' : 'border-line'
        }`}
      >
        <span className="inline-flex items-center border-r border-line bg-pale px-3 text-base font-medium text-navy">
          MMK
        </span>
        <input
          id={id}
          inputMode="numeric"
          readOnly={readOnly}
          className={`w-full px-3 text-base text-ink ${readOnly ? 'bg-page' : ''}`}
          value={value === 0 && !readOnly ? '' : String(value)}
          onChange={(event) => onChange?.(parseIntegerMmk(event.target.value))}
          placeholder="0"
        />
      </div>
      {hint ? <span className="mt-1 block text-base text-muted">{hint}</span> : null}
      {warning && !error ? (
        <span className="mt-1 block text-base text-watch-ink">{warning}</span>
      ) : null}
      {error ? <span className="mt-1 block text-base text-risk">{error}</span> : null}
    </label>
  )
}
