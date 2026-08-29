import type { PreferredLanguage } from '../../types/models'
import { bilingualLine, type BilingualText } from '../../lib/checkInCopy'

export function BilingualLabel({
  text,
  language,
}: {
  text: BilingualText
  language: PreferredLanguage
}) {
  return (
    <span className="block text-base font-medium text-ink">
      {bilingualLine(text, language)}
    </span>
  )
}
