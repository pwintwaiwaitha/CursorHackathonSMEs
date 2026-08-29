import type { AppStore } from '../storage/types'
import { rechainCheckIns, sortCheckInsByDate } from './checkIn'

export function getCurrentCashMmk(store: AppStore): number {
  const start = store.profile?.startingCashBalanceMmk ?? 0
  const chained = rechainCheckIns(store.checkIns, start)
  const latest = sortCheckInsByDate(chained).at(-1)
  return latest?.closingCashMmk ?? start
}

export function getCheckInForDate(
  store: AppStore,
  date: string,
): AppStore['checkIns'][number] | undefined {
  return store.checkIns.find((item) => item.date === date)
}
