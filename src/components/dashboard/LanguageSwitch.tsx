import type { BusinessProfile, PreferredLanguage } from '../../types/models'
import type { BusinessProfileInput } from '../../lib/validation'
import { bilingualLine } from '../../lib/checkInCopy'
import { DASHBOARD_COPY } from '../../lib/dashboardCopy'
import { useApp } from '../../context/useApp'

function profileToInput(profile: BusinessProfile): BusinessProfileInput {
  return {
    businessName: profile.businessName,
    businessType: profile.businessType,
    startingCashBalanceMmk: profile.startingCashBalanceMmk,
    averageMonthlySalesMmk: profile.averageMonthlySalesMmk,
    employeeCount: profile.employeeCount,
    mainExpenseCategories: profile.mainExpenseCategories,
    preferredLanguage: profile.preferredLanguage,
  }
}

export function LanguageSwitch() {
  const { store, saveProfile } = useApp()
  const profile = store.profile
  if (!profile) {
    return null
  }
  const currentProfile = profile
  const language = currentProfile.preferredLanguage

  function setLanguage(next: PreferredLanguage) {
    const latest = store.profile ?? currentProfile
    saveProfile({ ...profileToInput(latest), preferredLanguage: next })
  }

  return (
    <div
      className="inline-flex overflow-hidden rounded-[14px] border border-line bg-white"
      role="group"
      aria-label={bilingualLine(DASHBOARD_COPY.language, language)}
    >
      {(['en', 'my'] as const).map((code) => {
        const active = language === code
        return (
          <button
            key={code}
            type="button"
            className={`touch-target min-w-11 px-3 text-base font-semibold ${
              active ? 'bg-bank-blue text-white' : 'bg-white text-navy'
            }`}
            aria-pressed={active}
            onClick={() => setLanguage(code)}
          >
            {code === 'en' ? 'EN' : 'MY'}
          </button>
        )
      })}
    </div>
  )
}
