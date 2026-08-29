import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

function isAdvicePath(url: string | undefined): boolean {
  const path = url?.split('?')[0] ?? ''
  return path === '/api/ai-advice'
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const { handleAiAdviceRequest } = await import('./server/aiAdviceHandler.ts')
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }
  const result = await handleAiAdviceRequest(await readBody(req))
  res.statusCode = result.status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(result.body))
}

export function aiAdviceDevPlugin(): Plugin {
  return {
    name: 'ai-advice-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!isAdvicePath(req.url)) {
          next()
          return
        }
        void handle(req, res)
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!isAdvicePath(req.url)) {
          next()
          return
        }
        void handle(req, res)
      })
    },
  }
}
