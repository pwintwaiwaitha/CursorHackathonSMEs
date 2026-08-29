import { handleBankSponsorRequest } from '../../server/bankSponsorHandler.ts'

interface NetlifyEvent {
  httpMethod?: string
}

export async function handler(event: NetlifyEvent) {
  const method = event.httpMethod ?? 'GET'
  if (method === 'OPTIONS') {
    return { statusCode: 204, body: '' }
  }
  if (method !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  const result = await handleBankSponsorRequest()
  return {
    statusCode: result.status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.body),
  }
}
