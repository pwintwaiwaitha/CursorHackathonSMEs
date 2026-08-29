import { useState } from 'react'
import { X } from 'lucide-react'
import { pickLine } from '../../lib/checkInCopy'
import { useApp } from '../../context/useApp'
import { dismissDemoBanner, isDemoBannerDismissed } from '../../lib/uiStorage'
import { OWNER_DEMO_COPY } from '../../storage/ownerDemo'

export function DemoBanner() {
  const { isDemoMode, store } = useApp()
  const language = store.profile?.preferredLanguage ?? 'en'
  const [dismissed, setDismissed] = useState(isDemoBannerDismissed)

  if (!isDemoMode || dismissed) {
    return null
  }

  return (
    <div className="flex items-center justify-between gap-2 border-b border-watch bg-watch-bg px-3 py-2 sm:px-4">
      <p className="min-w-0 truncate text-sm font-medium text-watch-ink">
        {pickLine(OWNER_DEMO_COPY.banner, language)}
      </p>
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[14px] text-watch-ink"
        aria-label={pickLine({ en: 'Dismiss', my: 'ပိတ်ရန်' }, language)}
        onClick={() => {
          dismissDemoBanner()
          setDismissed(true)
        }}
      >
        <X size={18} />
      </button>
    </div>
  )
}
