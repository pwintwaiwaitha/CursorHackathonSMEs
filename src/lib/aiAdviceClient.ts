import {
  aiAdviceApiResponseSchema,
  aiAdviceRequestSchema,
  buildFallbackAdvice,
  type AiAdviceApiResponse,
  type AiAdviceRequest,
} from './aiAdvice'

const CLIENT_TIMEOUT_MS = 12_000

export async function requestAiAdvice(payload: AiAdviceRequest): Promise<AiAdviceApiResponse> {
  const request = aiAdviceRequestSchema.parse(payload)
  const fallback: AiAdviceApiResponse = {
    source: 'fallback',
    advice: buildFallbackAdvice(request),
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)

  try {
    const response = await fetch('/api/ai-advice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    })
    if (!response.ok) {
      return fallback
    }
    const json: unknown = await response.json()
    const parsed = aiAdviceApiResponseSchema.safeParse(json)
    return parsed.success ? parsed.data : fallback
  } catch {
    return fallback
  } finally {
    window.clearTimeout(timer)
  }
}
