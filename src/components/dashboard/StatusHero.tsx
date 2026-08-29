import type { PreferredLanguage } from '../../types/models'
import { pickLine } from '../../lib/checkInCopy'
import {
  ownerStatusCopy,
  type OwnerStatusKind,
} from '../../lib/ownerJourney'

const tone: Record<OwnerStatusKind, string> = {
  safe: 'border-healthy bg-healthy-bg text-healthy',
  attention: 'border-watch bg-watch-bg text-watch-ink',
  high_risk: 'border-risk bg-risk-bg text-risk',
}

export function StatusHero({
  kind,
  language,
}: {
  kind: OwnerStatusKind
  language: PreferredLanguage
}) {
  const copy = ownerStatusCopy(kind)
  const primary = pickLine(copy, language)
  const secondary = language === 'my' ? copy.en : copy.my

  return (
    <section
      className={`rounded-xl border-2 px-4 py-5 ${tone[kind]}`}
      aria-live="polite"
    >
      <p className="text-2xl font-bold leading-snug">{primary}</p>
      <p className="mt-1 text-base font-medium opacity-90">{secondary}</p>
    </section>
  )
}
