import type { PreferredLanguage } from '../types/models'
import { pickLine } from './checkInCopy'

export function forecastDataAvailableLabel(
  recordedDays: number,
  language: PreferredLanguage,
): string {
  return pickLine(
    {
      en: `Data available: ${recordedDays} days`,
      my: `ရှိသောဒေတာ: ${recordedDays} ရက်`,
    },
    language,
  )
}

export function forecastAnalyzedLabel(
  recordedDays: number,
  businessName: string,
  language: PreferredLanguage,
): string {
  return pickLine(
    {
      en: `${recordedDays} days of ${businessName} records analyzed`,
      my: `${businessName} ၏ ${recordedDays} ရက်စာရင်းကို သုံးထားသည်`,
    },
    language,
  )
}
