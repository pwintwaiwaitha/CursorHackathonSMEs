import {
  AI_ADVICE_DISCLAIMER,
  aiAdviceRequestSchema,
  buildAdviceSystemPrompt,
  buildFallbackAdvice,
  parseAdviceJson,
  sanitizeAdvice,
  type AiAdviceApiResponse,
  type AiAdviceRequest,
} from '../src/lib/aiAdvice.ts'

const MAX_BODY_BYTES = 40_000
const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_GEMINI_TEXT_MODEL = 'gemini-3.7-flash'
const GEMINI_GENERATE_CONTENT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export interface AiAdviceHttpResult {
  status: number
  body: AiAdviceApiResponse | { error: string }
}

function envString(env: NodeJS.Dict<string>, key: string): string {
  return env[key]?.trim() ?? ''
}

function timeoutMs(env: NodeJS.Dict<string>): number {
  const raw = Number.parseInt(env.AI_TIMEOUT_MS ?? '', 10)
  if (!Number.isFinite(raw) || raw < 1_000) {
    return DEFAULT_TIMEOUT_MS
  }
  return Math.min(raw, 20_000)
}

function resolveApiKey(env: NodeJS.Dict<string>): string {
  return envString(env, 'GEMINI_API_KEY') || envString(env, 'AI_API_KEY')
}

function resolveTextModel(env: NodeJS.Dict<string>): string {
  const explicit = envString(env, 'GEMINI_TEXT_MODEL') || envString(env, 'AI_MODEL')
  if (explicit) {
    return explicit
  }
  return envString(env, 'GEMINI_API_KEY') ? DEFAULT_GEMINI_TEXT_MODEL : ''
}

function usesGemini(env: NodeJS.Dict<string>): boolean {
  if (envString(env, 'GEMINI_API_KEY')) {
    return true
  }
  return resolveTextModel(env).startsWith('gemini')
}

function wrappedFallback(request: AiAdviceRequest): AiAdviceApiResponse {
  return { source: 'fallback', advice: buildFallbackAdvice(request) }
}

function adviceUserPayload(request: AiAdviceRequest): string {
  return JSON.stringify({
    instruction: 'Explain these engine results. Do not invent amounts. Quote only numbers in this JSON.',
    disclaimerMustBe: AI_ADVICE_DISCLAIMER,
    forecast: request,
  })
}

function parseGeminiText(json: unknown): string | null {
  if (!json || typeof json !== 'object') {
    return null
  }
  const candidates = (json as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    .candidates
  const parts = candidates?.[0]?.content?.parts
  if (!parts?.length) {
    return null
  }
  const text = parts
    .map((part) => part.text?.trim() ?? '')
    .filter(Boolean)
    .join('\n')
  return text || null
}

function parseOpenAiText(json: unknown): string | null {
  if (!json || typeof json !== 'object') {
    return null
  }
  const choices = (json as { choices?: { message?: { content?: string } }[] }).choices
  return choices?.[0]?.message?.content ?? null
}

async function callGemini(
  request: AiAdviceRequest,
  env: NodeJS.Dict<string>,
  fetchFn: typeof fetch,
  apiKey: string,
  model: string,
): Promise<AiAdviceApiResponse | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs(env))
  const url = `${GEMINI_GENERATE_CONTENT_BASE}/${encodeURIComponent(model)}:generateContent`

  try {
    const response = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildAdviceSystemPrompt() }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: adviceUserPayload(request) }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!response.ok) {
      return null
    }

    const content = parseGeminiText(await response.json())
    if (!content) {
      return null
    }
    const parsed = parseAdviceJson(content)
    if (!parsed) {
      return null
    }
    return { source: 'ai', advice: sanitizeAdvice(parsed, request) }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function callOpenAiCompatible(
  request: AiAdviceRequest,
  env: NodeJS.Dict<string>,
  fetchFn: typeof fetch,
  apiKey: string,
  model: string,
): Promise<AiAdviceApiResponse | null> {
  const base = (envString(env, 'AI_API_BASE_URL') || 'https://api.openai.com/v1').replace(/\/$/, '')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs(env))

  try {
    const response = await fetchFn(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildAdviceSystemPrompt() },
          { role: 'user', content: adviceUserPayload(request) },
        ],
      }),
    })

    if (!response.ok) {
      return null
    }

    const content = parseOpenAiText(await response.json())
    if (!content) {
      return null
    }
    const parsed = parseAdviceJson(content)
    if (!parsed) {
      return null
    }
    return { source: 'ai', advice: sanitizeAdvice(parsed, request) }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function callModel(
  request: AiAdviceRequest,
  env: NodeJS.Dict<string>,
  fetchFn: typeof fetch,
): Promise<AiAdviceApiResponse | null> {
  const apiKey = resolveApiKey(env)
  const model = resolveTextModel(env)
  if (!apiKey || !model) {
    return null
  }

  if (usesGemini(env)) {
    return callGemini(request, env, fetchFn, apiKey, model)
  }
  return callOpenAiCompatible(request, env, fetchFn, apiKey, model)
}

export async function handleAiAdviceRequest(
  rawBody: string,
  options: { env?: NodeJS.Dict<string>; fetchFn?: typeof fetch } = {},
): Promise<AiAdviceHttpResult> {
  const env = options.env ?? process.env
  const fetchFn = options.fetchFn ?? fetch

  if (rawBody.length > MAX_BODY_BYTES) {
    return { status: 413, body: { error: 'Payload is too large.' } }
  }

  let json: unknown
  try {
    json = JSON.parse(rawBody)
  } catch {
    return { status: 400, body: { error: 'Body must be JSON.' } }
  }

  const parsed = aiAdviceRequestSchema.safeParse(json)
  if (!parsed.success) {
    return { status: 400, body: { error: 'Only validated structured forecast data is accepted.' } }
  }

  const fromModel = await callModel(parsed.data, env, fetchFn)
  return { status: 200, body: fromModel ?? wrappedFallback(parsed.data) }
}
