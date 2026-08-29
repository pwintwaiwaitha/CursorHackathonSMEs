import type { ReactNode } from 'react'

export function ConfirmAction({
  title,
  children,
  confirmLabel,
  confirmed,
  onConfirmChange,
  onCancel,
  onSubmit,
  submitLabel,
}: {
  title: string
  children: ReactNode
  confirmLabel: string
  confirmed: boolean
  onConfirmChange: (value: boolean) => void
  onCancel: () => void
  onSubmit: () => void
  submitLabel: string
}) {
  return (
    <div className="rounded-md border border-watch bg-watch-bg p-3">
      <p className="font-semibold text-watch-ink">{title}</p>
      <div className="mt-2 text-sm">{children}</div>
      <label className="mt-3 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={confirmed}
          onChange={(event) => onConfirmChange(event.target.checked)}
        />
        <span>{confirmLabel}</span>
      </label>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={!confirmed}
          className="rounded-md bg-bank-blue px-3 py-2 text-sm font-semibold text-white disabled:bg-muted"
          onClick={onSubmit}
        >
          {submitLabel}
        </button>
        <button
          type="button"
          className="rounded-md bg-bank-blue-light px-3 py-2 text-sm font-semibold text-navy"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
