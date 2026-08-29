import type { PreferredLanguage } from '../../types/models'
import { pickLine } from '../../lib/checkInCopy'
import { CHECK_IN_COPY } from '../../lib/checkInCopy'

export function CheckInStepper({
  step,
  language,
}: {
  step: 1 | 2 | 3
  language: PreferredLanguage
}) {
  const labels = [
    pickLine(CHECK_IN_COPY.step1, language),
    pickLine(CHECK_IN_COPY.step2, language),
    pickLine(CHECK_IN_COPY.step3, language),
  ]

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-muted" aria-live="polite">
        {pickLine(CHECK_IN_COPY.stepProgress, language)}
      </p>
      <ol
        className="grid grid-cols-3 gap-2"
        aria-label={pickLine(CHECK_IN_COPY.stepProgress, language)}
      >
        {labels.map((label, index) => {
          const number = (index + 1) as 1 | 2 | 3
          const active = step === number
          const done = step > number
          return (
            <li
              key={label}
              className={`rounded-md border px-2 py-3 text-center text-sm font-semibold ${
                active
                  ? 'border-navy bg-healthy-bg text-navy'
                  : done
                    ? 'border-mint bg-pale text-navy'
                    : 'border-line bg-white text-muted'
              }`}
              aria-current={active ? 'step' : undefined}
            >
              {number} {label}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
