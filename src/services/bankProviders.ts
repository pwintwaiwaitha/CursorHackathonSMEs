import type { BankActionType, BankConnectionType } from '../types/bank'

export const SPONSOR_NOT_CONFIGURED = 'sandbox not configured'

export type BankProviderKind = BankConnectionType

export type BankProviderResult =
  | { ok: true; kind: 'demo'; message: string }
  | { ok: false; kind: 'sandbox' | 'live'; reason: typeof SPONSOR_NOT_CONFIGURED }

/**
 * Sponsor adapter interface only.
 * Do not add official URLs, auth headers, or response field maps here.
 * Browser code may use DemoBankProvider. Sandbox/live must stay on Netlify functions.
 */
export interface BankProvider {
  readonly kind: BankProviderKind
  readonly displayName: string
  canCallSponsor(): boolean
  applyLocalDemo(actionType: BankActionType): BankProviderResult
  refuseUntilOfficialDocs(): BankProviderResult
}

export class DemoBankProvider implements BankProvider {
  readonly kind = 'demo' as const
  readonly displayName = 'Demo bank (local synthetic)'

  canCallSponsor(): boolean {
    return false
  }

  applyLocalDemo(actionType: BankActionType): BankProviderResult {
    return {
      ok: true,
      kind: 'demo',
      message: `Local demonstration recorded for ${actionType}. No sponsor API was called.`,
    }
  }

  refuseUntilOfficialDocs(): BankProviderResult {
    return this.applyLocalDemo('deposit_sales')
  }
}

export class SponsorSandboxProvider implements BankProvider {
  readonly kind = 'sandbox' as const
  readonly displayName = 'Sponsor sandbox (not configured)'

  canCallSponsor(): boolean {
    return false
  }

  applyLocalDemo(_actionType: BankActionType): BankProviderResult {
    return this.refuseUntilOfficialDocs()
  }

  refuseUntilOfficialDocs(): BankProviderResult {
    return { ok: false, kind: 'sandbox', reason: SPONSOR_NOT_CONFIGURED }
  }
}

export class SponsorLiveProvider implements BankProvider {
  readonly kind = 'live' as const
  readonly displayName = 'Sponsor live (not configured)'

  canCallSponsor(): boolean {
    return false
  }

  applyLocalDemo(_actionType: BankActionType): BankProviderResult {
    return this.refuseUntilOfficialDocs()
  }

  refuseUntilOfficialDocs(): BankProviderResult {
    return { ok: false, kind: 'live', reason: SPONSOR_NOT_CONFIGURED }
  }
}

export function createBrowserBankProvider(): DemoBankProvider {
  return new DemoBankProvider()
}

export function readServerSponsorMode(
  env: Record<string, string | undefined> = {},
): BankProviderKind {
  const raw = env.BANK_SPONSOR_MODE?.trim().toLowerCase()
  if (raw === 'sandbox' || raw === 'live' || raw === 'demo') {
    return raw
  }
  return 'demo'
}

export function createServerBankProvider(
  env: Record<string, string | undefined> = {},
): BankProvider {
  const mode = readServerSponsorMode(env)
  if (mode === 'sandbox') {
    return new SponsorSandboxProvider()
  }
  if (mode === 'live') {
    return new SponsorLiveProvider()
  }
  return new DemoBankProvider()
}

export function assertNoBrowserSponsorCall(kind: BankProviderKind): void {
  if (kind !== 'demo') {
    throw new Error('Sponsor bank calls must go through Netlify functions')
  }
}
