import { Link } from 'react-router-dom'
import type { PreferredLanguage } from '../../types/models'
import { pickLine } from '../../lib/checkInCopy'
import { BANK_COPY } from '../../lib/bankCopy'
import {
  buildBankShortageRecommendations,
} from '../../lib/bankRecommendations'

export function ShortageRecommendations({
  language,
  hasPredictedShortage,
}: {
  language: PreferredLanguage
  hasPredictedShortage: boolean
}) {
  const items = buildBankShortageRecommendations(hasPredictedShortage)
  if (items.length === 0) {
    return null
  }

  return (
    <section className="rounded-[16px] border border-watch bg-watch-bg p-3">
      <h3 className="text-base font-semibold text-watch-ink">
        {pickLine(BANK_COPY.shortageTitle, language)}
      </h3>
      <ol className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to={item.href}
              className="flex min-h-11 items-center gap-3 rounded-[14px] border border-line bg-white px-3 py-2 text-base font-semibold text-navy"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-healthy-bg text-healthy">
                {item.rank}
              </span>
              {language === 'my' ? item.titleMy : item.titleEn}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
