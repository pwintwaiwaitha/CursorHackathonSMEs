import type { PreferredLanguage } from '../../types/models'
import { bilingualLine } from '../../lib/checkInCopy'
import { CHECK_IN_COPY } from '../../lib/checkInCopy'

export function CheckInStepper({
  step,
  language,
}: {
  step: 1 | 2 | 3
  language: PreferredLanguage
}) {
  const labels = [
    bilingualLine(CHECK_IN_COPY.step1, language),
    bilingualLine(CHECK_IN_COPY.step2, language),
    bilingualLine(CHECK_IN_COPY.step3, language),
  ]

  return (
    <ol className="grid grid-cols-3 gap-2" aria-label={bilingualLine(CHECK_IN_COPY.stepOf, language)}>
      {labels.map((label, index) => {
        const number = (index + 1) as 1 | 2 | 3
        const active = step === number
        const done = step > number
        return (
          <li
            key={label}
            className={`rounded-md border px-2 py-3 text-center text-base font-semibold ${
              active
                ? 'border-navy bg-bank-blue-light text-navy'
                : done
                  ? 'border-mint bg-pale text-navy'
                  : 'border-line bg-white text-muted'
            }`}
            aria-current={active ? 'step' : undefined}
          >
            {label}
          </li>
        )
      })}
    </ol>
  )
}
