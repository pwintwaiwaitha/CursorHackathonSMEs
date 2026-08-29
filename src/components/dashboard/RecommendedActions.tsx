import { Link } from 'react-router-dom'
import type { PreferredLanguage } from '../../types/models'
import { bilingualLine } from '../../lib/checkInCopy'
import { DASHBOARD_COPY } from '../../lib/dashboardCopy'
import type { OwnerAction } from '../../lib/ownerJourney'

export function RecommendedActions({
  actions,
  language,
}: {
  actions: OwnerAction[]
  language: PreferredLanguage
}) {
  if (actions.length === 0) {
    return null
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-navy">
        {bilingualLine(DASHBOARD_COPY.recommended, language)}
      </h2>
      <ul className="mt-3 space-y-2">
        {actions.map((action, index) => (
          <li key={action.id}>
            <Link
              to={action.href}
              className="flex min-h-11 items-center gap-3 rounded-lg border border-line bg-white px-4 py-3 text-base font-semibold text-navy"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-healthy-bg text-healthy">
                {index + 1}
              </span>
              {action.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
