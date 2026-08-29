import { describe, expect, it } from 'vitest'
import { isUuid } from './uuid'
import {
  assertIdempotencyKey,
  createIdempotencyKey,
  findByIdempotencyKey,
  rememberIdempotent,
} from './bankIdempotency'

describe('idempotency keys', () => {
  it('creates a uuid key for every review confirmation', () => {
    const key = createIdempotencyKey()
    expect(isUuid(key)).toBe(true)
    expect(assertIdempotencyKey(key)).toBe(key)
    expect(() => assertIdempotencyKey('not-a-uuid')).toThrow(/uuid/i)
  })

  it('replays the first confirmation and does not insert a second row', () => {
    const key = createIdempotencyKey()
    const first = rememberIdempotent([], key, () => ({
      idempotency_key: key,
      id: 'action-1',
    }))
    const second = rememberIdempotent(first.rows, key, () => ({
      idempotency_key: key,
      id: 'action-2',
    }))
    expect(first.replayed).toBe(false)
    expect(second.replayed).toBe(true)
    expect(second.row.id).toBe('action-1')
    expect(second.rows).toHaveLength(1)
    expect(findByIdempotencyKey(second.rows, key)?.id).toBe('action-1')
  })
})
