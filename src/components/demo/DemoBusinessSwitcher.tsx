import { pickLine } from '../../lib/checkInCopy'
import { useApp } from '../../context/useApp'
import { OWNER_DEMO_COPY } from '../../storage/ownerDemo'

export function DemoBusinessSwitcher({
  onLoaded,
}: {
  variant?: 'compact' | 'full'
  tone?: 'light' | 'dark'
  onLoaded?: () => void
}) {
  const { isDemoMode, loadDemoBusiness, resetDemoData, store } = useApp()
  const language = store.profile?.preferredLanguage ?? 'en'

  return (
    <button
      type="button"
      className="inline-flex min-h-11 items-center rounded-md bg-bank-blue-light px-4 text-sm font-semibold text-navy"
      onClick={() => {
        if (isDemoMode) {
          resetDemoData()
        } else {
          loadDemoBusiness()
        }
        onLoaded?.()
      }}
    >
      {pickLine(isDemoMode ? OWNER_DEMO_COPY.reset : OWNER_DEMO_COPY.tryDemo, language)}
    </button>
  )
}
