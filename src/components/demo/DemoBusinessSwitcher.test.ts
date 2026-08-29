import { describe, expect, it } from 'vitest'
import { OWNER_DEMO_COPY, OWNER_DEMO_FORBIDDEN_UI, ownerVisibleShopNames } from '../../storage/ownerDemo'

describe('DemoBusinessSwitcher owner copy', () => {
  it('only offers a Thiri Fashion reset, never other shops or 365d', () => {
    expect(ownerVisibleShopNames()).toEqual(['Thiri Fashion'])
    const copy = `${OWNER_DEMO_COPY.reset.en} ${OWNER_DEMO_COPY.tryDemo.en}`
    expect(copy).toContain('Thiri Fashion')
    expect(copy).not.toMatch(/365d/)
    expect(copy).not.toContain('Clothing shop')
    for (const forbidden of OWNER_DEMO_FORBIDDEN_UI) {
      expect(copy).not.toContain(forbidden)
    }
  })
})
