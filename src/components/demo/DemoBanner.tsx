import { pickLine } from '../../lib/checkInCopy'
import { useApp } from '../../context/useApp'
import { OWNER_DEMO_COPY } from '../../storage/ownerDemo'

export function DemoBanner() {
  const { isDemoMode, store } = useApp()
  const language = store.profile?.preferredLanguage ?? 'en'

  if (!isDemoMode) {
    return null
  }

  return (
    <div className="border-b border-watch bg-watch-bg px-3 py-2 sm:px-4">
      <p className="truncate text-sm font-medium text-watch-ink">
        {pickLine(OWNER_DEMO_COPY.banner, language)}
      </p>
    </div>
  )
}
