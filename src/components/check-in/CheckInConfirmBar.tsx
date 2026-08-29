import type { PreferredLanguage } from '../../types/models'
import { CHECK_IN_COPY, bilingualLine } from '../../lib/checkInCopy'

interface CheckInConfirmBarProps {
  language: PreferredLanguage
  confirmed: boolean
  isDuplicate: boolean
  canSave: boolean
  needsLargeConfirm: boolean
  largeConfirmed: boolean
  onConfirmChange: (checked: boolean) => void
  onLargeConfirmChange: (checked: boolean) => void
}

export function CheckInConfirmBar({
  language,
  confirmed,
  isDuplicate,
  canSave,
  needsLargeConfirm,
  largeConfirmed,
  onConfirmChange,
  onLargeConfirmChange,
}: CheckInConfirmBarProps) {
  return (
    <div className="space-y-3">
      {isDuplicate ? (
        <p className="rounded-md bg-watch-bg px-3 py-3 text-base text-watch-ink">
          {bilingualLine(CHECK_IN_COPY.savingReplace, language)}
        </p>
      ) : null}
      {needsLargeConfirm ? (
        <label className="flex min-h-11 items-start gap-3 text-base">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5"
            checked={largeConfirmed}
            onChange={(event) => onLargeConfirmChange(event.target.checked)}
          />
          <span>{bilingualLine(CHECK_IN_COPY.largeConfirm, language)}</span>
        </label>
      ) : null}
      <label className="flex min-h-11 items-start gap-3 text-base">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5"
          checked={confirmed}
          onChange={(event) => onConfirmChange(event.target.checked)}
        />
        <span>{bilingualLine(CHECK_IN_COPY.confirmLabel, language)}</span>
      </label>
      <button
        type="submit"
        disabled={!canSave}
        className="min-h-14 w-full rounded-md bg-bank-blue px-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:bg-muted"
      >
        {bilingualLine(CHECK_IN_COPY.confirm, language)}
      </button>
    </div>
  )
}
