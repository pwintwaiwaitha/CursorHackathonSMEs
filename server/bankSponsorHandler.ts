import {
  SPONSOR_NOT_CONFIGURED,
  createServerBankProvider,
} from '../src/services/bankProviders.ts'

export async function handleBankSponsorRequest(): Promise<{
  status: number
  body: Record<string, unknown>
}> {
  const provider = createServerBankProvider(process.env)
  if (!provider.canCallSponsor()) {
    const refused = provider.refuseUntilOfficialDocs()
    return {
      status: 501,
      body: {
        error: SPONSOR_NOT_CONFIGURED,
        provider: provider.kind,
        message:
          'Official sponsor sandbox documentation is required before any bank API call. Real transfers are not enabled.',
        result: refused,
      },
    }
  }
  return {
    status: 501,
    body: {
      error: SPONSOR_NOT_CONFIGURED,
      message: 'Real transfers are not enabled.',
    },
  }
}
