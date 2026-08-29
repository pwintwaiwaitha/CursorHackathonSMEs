import { describe, expect, it } from 'vitest'
import {
  DemoBankProvider,
  SPONSOR_NOT_CONFIGURED,
  SponsorLiveProvider,
  SponsorSandboxProvider,
  assertNoBrowserSponsorCall,
  createServerBankProvider,
} from './bankProviders'

describe('sponsor adapter interface', () => {
  it('lets the demo provider work locally and refuses sandbox/live', () => {
    const demo = new DemoBankProvider()
    expect(demo.applyLocalDemo('deposit_sales').ok).toBe(true)
    expect(demo.canCallSponsor()).toBe(false)

    expect(new SponsorSandboxProvider().refuseUntilOfficialDocs()).toEqual({
      ok: false,
      kind: 'sandbox',
      reason: SPONSOR_NOT_CONFIGURED,
    })
    expect(new SponsorLiveProvider().refuseUntilOfficialDocs()).toEqual({
      ok: false,
      kind: 'live',
      reason: SPONSOR_NOT_CONFIGURED,
    })
    expect(() => assertNoBrowserSponsorCall('sandbox')).toThrow(/Netlify/i)
    expect(createServerBankProvider({ BANK_SPONSOR_MODE: 'sandbox' }).kind).toBe('sandbox')
  })
})
