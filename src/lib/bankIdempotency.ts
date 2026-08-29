import { isUuid } from './uuid'

export function createIdempotencyKey(): string {
  return crypto.randomUUID()
}

export function assertIdempotencyKey(value: string): string {
  if (!isUuid(value)) {
    throw new Error('idempotency_key must be a uuid')
  }
  return value
}

export function findByIdempotencyKey<T extends { idempotency_key: string }>(
  rows: T[],
  key: string,
): T | undefined {
  const safe = assertIdempotencyKey(key)
  return rows.find((row) => row.idempotency_key === safe)
}

/**
 * Replay the stored result when the same uuid is confirmed again.
 * Never creates a second money movement for the same key.
 */
export function rememberIdempotent<T extends { idempotency_key: string }>(
  rows: T[],
  key: string,
  create: () => T,
): { row: T; replayed: boolean; rows: T[] } {
  const existing = findByIdempotencyKey(rows, key)
  if (existing) {
    return { row: existing, replayed: true, rows }
  }
  const row = create()
  if (row.idempotency_key !== key) {
    throw new Error('Created row must keep the supplied idempotency_key')
  }
  return { row, replayed: false, rows: [...rows, row] }
}
