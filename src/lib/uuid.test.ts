import { describe, expect, it } from 'vitest'
import { isUuid } from './uuid'

describe('isUuid', () => {
  it('accepts a v4 uuid and rejects local prefixed ids', () => {
    expect(isUuid('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).toBe(true)
    expect(isUuid('checkin_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).toBe(false)
    expect(isUuid('not-a-uuid')).toBe(false)
  })
})
