import { describe, expect, it } from 'vitest'
import {
  APP_HEADER_COPY,
  headerDisplayStrings,
  OWNER_DEMO_BUSINESS_NAME,
} from '../../storage/ownerDemo'

describe('AppHeader strings', () => {
  it('never shows 365d in the global header', () => {
    const strings = headerDisplayStrings(OWNER_DEMO_BUSINESS_NAME, true)
    expect(strings).toContain(APP_HEADER_COPY.brand)
    expect(strings).toContain(OWNER_DEMO_BUSINESS_NAME)
    expect(strings).toContain('DEMO')
    expect(strings.join(' ')).not.toMatch(/365d/)
    expect(APP_HEADER_COPY.brand).not.toMatch(/365d/)
  })
})
