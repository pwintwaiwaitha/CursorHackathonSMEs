import type { DemoBusinessId } from './demoMode'
import type { BankConnection, BankTransaction } from '../types/bank'
import {
  DEMO_BANK_STORAGE_PREFIX,
  demoBankStorageKey,
  isSafeAccountMask,
  maskAccountLast4,
} from '../lib/bankIsolation'
import { availableBusinessAccountBalanceMmk } from '../lib/bankBalance'
import type { BankSnapshot } from '../services/bankTypes'

const DEMO_MASKS: Record<DemoBusinessId, string> = {
  cafe: '1042',
  online: '2287',
  minimart: '3391',
  bakery: '4418',
  clothing: '5520',
  wholesale: '6634',
}

function nowIso(): string {
  return new Date().toISOString()
}

function todayIso(): string {
  return nowIso().slice(0, 10)
}

function demoOwnerId(demoBusinessId: DemoBusinessId): string {
  return `00000000-0000-4000-8000-00000000000${DEMO_MASKS[demoBusinessId][0] ?? '1'}`
}

function demoBusinessUuid(demoBusinessId: DemoBusinessId): string {
  return `10000000-0000-4000-8000-00000000000${DEMO_MASKS[demoBusinessId][1] ?? '2'}`
}

function demoConnectionId(demoBusinessId: DemoBusinessId): string {
  return `20000000-0000-4000-8000-00000000000${DEMO_MASKS[demoBusinessId][2] ?? '3'}`
}

export function emptyDemoSnapshot(demoBusinessId: DemoBusinessId): BankSnapshot {
  return {
    isolation: 'demo',
    demoBusinessId,
    connection: null,
    transactions: [],
    actions: [],
    supportRequests: [],
  }
}

export function seedDemoBankSnapshot(demoBusinessId: DemoBusinessId): BankSnapshot {
  const ownerId = demoOwnerId(demoBusinessId)
  const businessId = demoBusinessUuid(demoBusinessId)
  const connectionId = demoConnectionId(demoBusinessId)
  const stamp = nowIso()
  const mask = maskAccountLast4(DEMO_MASKS[demoBusinessId])
  const connection: BankConnection = {
    id: connectionId,
    owner_id: ownerId,
    business_id: businessId,
    provider_name: 'demo-local',
    connection_type: 'demo',
    status: 'connected',
    account_mask: mask,
    consent_given: true,
    consent_at: stamp,
    last_synced_at: stamp,
    created_at: stamp,
    updated_at: stamp,
  }
  const transactions: BankTransaction[] = [
    {
      id: `30000000-0000-4000-8000-${demoBusinessId.padEnd(12, '0').slice(0, 12)}`,
      owner_id: ownerId,
      business_id: businessId,
      bank_connection_id: connectionId,
      external_transaction_id: `seed-sales-${demoBusinessId}`,
      direction: 'inflow',
      amount: 850_000,
      transaction_date: todayIso(),
      category: 'sales_deposit',
      description: 'Seeded demonstration sales deposit',
      source: 'demo',
      created_at: stamp,
    },
    {
      id: `31000000-0000-4000-8000-${demoBusinessId.padEnd(12, '0').slice(0, 12)}`,
      owner_id: ownerId,
      business_id: businessId,
      bank_connection_id: connectionId,
      external_transaction_id: `seed-reserve-${demoBusinessId}`,
      direction: 'inflow',
      amount: 150_000,
      transaction_date: todayIso(),
      category: 'reserve_transfer',
      description: 'Seeded demonstration reserve',
      source: 'demo',
      created_at: stamp,
    },
  ]
  return {
    isolation: 'demo',
    demoBusinessId,
    connection,
    transactions,
    actions: [],
    supportRequests: [],
  }
}

function canUseLocalStorage(): boolean {
  return typeof localStorage !== 'undefined'
}

function parseSnapshot(raw: string, demoBusinessId: DemoBusinessId): BankSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as BankSnapshot
    if (parsed.isolation !== 'demo' || parsed.demoBusinessId !== demoBusinessId) {
      return null
    }
    if (parsed.connection && !isSafeAccountMask(parsed.connection.account_mask)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function loadDemoBankSnapshot(demoBusinessId: DemoBusinessId): BankSnapshot {
  if (!canUseLocalStorage()) {
    return emptyDemoSnapshot(demoBusinessId)
  }
  const raw = localStorage.getItem(demoBankStorageKey(demoBusinessId))
  if (!raw) {
    return emptyDemoSnapshot(demoBusinessId)
  }
  return parseSnapshot(raw, demoBusinessId) ?? emptyDemoSnapshot(demoBusinessId)
}

export function applyDemoConnect(snapshot: BankSnapshot, demoBusinessId: DemoBusinessId): BankSnapshot {
  if (snapshot.connection?.status === 'connected' && snapshot.connection.consent_given) {
    return {
      ...snapshot,
      connection: {
        ...snapshot.connection,
        last_synced_at: nowIso(),
        updated_at: nowIso(),
        status: 'connected',
      },
    }
  }
  const seeded = seedDemoBankSnapshot(demoBusinessId)
  return {
    ...seeded,
    transactions: snapshot.transactions.length > 0 ? snapshot.transactions : seeded.transactions,
    actions: snapshot.actions,
    supportRequests: snapshot.supportRequests,
  }
}

export function applyDemoDisconnect(snapshot: BankSnapshot): BankSnapshot {
  if (!snapshot.connection) {
    return snapshot
  }
  return {
    ...snapshot,
    connection: {
      ...snapshot.connection,
      status: 'disconnected',
      consent_given: false,
      updated_at: nowIso(),
    },
  }
}

export function connectDemoBankAccount(demoBusinessId: DemoBusinessId): BankSnapshot {
  const next = applyDemoConnect(loadDemoBankSnapshot(demoBusinessId), demoBusinessId)
  saveDemoBankSnapshot(next)
  return next
}

export function disconnectDemoBankAccount(demoBusinessId: DemoBusinessId): BankSnapshot {
  const next = applyDemoDisconnect(loadDemoBankSnapshot(demoBusinessId))
  saveDemoBankSnapshot(next)
  return next
}

export function saveDemoBankSnapshot(snapshot: BankSnapshot): void {
  if (snapshot.isolation !== 'demo' || !snapshot.demoBusinessId) {
    throw new Error('Refusing to save a non-demo snapshot into demo bank storage')
  }
  if (!canUseLocalStorage()) {
    return
  }
  localStorage.setItem(demoBankStorageKey(snapshot.demoBusinessId), JSON.stringify(snapshot))
}

export function clearDemoBankSnapshot(demoBusinessId: DemoBusinessId): void {
  if (!canUseLocalStorage()) {
    return
  }
  localStorage.removeItem(demoBankStorageKey(demoBusinessId))
}

export function isDemoBankStorageKey(key: string): boolean {
  return key.startsWith(DEMO_BANK_STORAGE_PREFIX)
}

export function demoAvailableBalanceMmk(snapshot: BankSnapshot): number {
  return availableBusinessAccountBalanceMmk(snapshot.transactions)
}

export function upsertDemoConnection(snapshot: BankSnapshot): BankSnapshot {
  if (snapshot.connection) {
    return {
      ...snapshot,
      connection: {
        ...snapshot.connection,
        last_synced_at: nowIso(),
        updated_at: nowIso(),
        status: 'connected',
      },
    }
  }
  if (!snapshot.demoBusinessId) {
    return snapshot
  }
  return {
    ...seedDemoBankSnapshot(snapshot.demoBusinessId),
    transactions: snapshot.transactions,
    actions: snapshot.actions,
    supportRequests: snapshot.supportRequests,
  }
}
