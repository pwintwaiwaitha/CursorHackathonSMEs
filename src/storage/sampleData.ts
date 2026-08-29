import { buildDemoStore } from './demoBusinesses'
import type { AppStore } from './types'

/** Kept for older callers. Same books as the Thiri Fashion demo seed. */
export function buildSampleStore(): AppStore {
  return buildDemoStore('clothing')
}
