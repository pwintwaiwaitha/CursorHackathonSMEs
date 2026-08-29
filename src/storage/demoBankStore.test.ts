import { describe, expect, it } from 'vitest'
import { isBankConnectionActive } from '../lib/bankMatching'
import {
  applyDemoConnect,
  applyDemoDisconnect,
  emptyDemoSnapshot,
  seedDemoBankSnapshot,
} from './demoBankStore'

describe('demo bank connection lifecycle', () => {
  it('starts disconnected and connects Thiri Fashion without dropping seeded movements', () => {
    const empty = emptyDemoSnapshot('clothing')
    expect(isBankConnectionActive(empty.connection)).toBe(false)
    const connected = applyDemoConnect(empty, 'clothing')
    expect(isBankConnectionActive(connected.connection)).toBe(true)
    expect(connected.demoBusinessId).toBe('clothing')
    expect(connected.transactions.length).toBeGreaterThan(0)
    expect(connected.connection?.connection_type).toBe('demo')
  })

  it('disconnects without deleting demonstration transactions', () => {
    const seeded = seedDemoBankSnapshot('clothing')
    const before = seeded.transactions.length
    const disconnected = applyDemoDisconnect(seeded)
    expect(isBankConnectionActive(disconnected.connection)).toBe(false)
    expect(disconnected.transactions).toHaveLength(before)
    const reconnected = applyDemoConnect(disconnected, 'clothing')
    expect(isBankConnectionActive(reconnected.connection)).toBe(true)
    expect(reconnected.transactions).toHaveLength(before)
  })
})
