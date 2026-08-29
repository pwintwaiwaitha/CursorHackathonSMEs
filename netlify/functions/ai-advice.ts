import { handleAiAdviceRequest } from '../../server/aiAdviceHandler.ts'

interface NetlifyEvent {
  httpMethod?: string
  body?: string | null
  isBase64Encoded?: boolean
}

function readBody(event: NetlifyEvent): string {
  if (!event.body) {
    return ''
  }
  if (event.isBase64Encoded) {
    return Buffer.from(event.body, 'base64').toString('utf8')
  }
  return event.body
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

  const result = await handleAiAdviceRequest(readBody(event))
  return {
    statusCode: result.status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.body),
  }
}
