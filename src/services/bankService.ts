import type {
  BankAction,
  BankActionType,
  BankSupportRequest,
  BankTransaction,
  BankTransactionCategory,
} from '../types/bank'
import { availableBusinessAccountBalanceMmk } from '../lib/bankBalance'
import { assertIdempotencyKey, findByIdempotencyKey, rememberIdempotent } from '../lib/bankIdempotency'
import {
  assertNoSensitiveBankFields,
  rejectMixedBankWrite,
  resolveBankDataSource,
  type BankDataSource,
} from '../lib/bankIsolation'
import { createBrowserBankProvider } from './bankProviders'
import { getBankRepository } from './bankRepository'
import {
  connectDemoBankAccount,
  disconnectDemoBankAccount,
  loadDemoBankSnapshot,
  saveDemoBankSnapshot,
} from '../storage/demoBankStore'
import type { ConfirmBankActionInput, ConfirmBankActionResult, BankSnapshot } from './bankTypes'
import { repositoryErrorMessage } from './supabaseRepository'

const MONEY_ACTIONS: BankActionType[] = [
  'deposit_sales',
  'collect_customer_payment',
  'pay_supplier',
  'move_to_reserve',
]

function nowIso(): string {
  return new Date().toISOString()
}

function todayIso(): string {
  return nowIso().slice(0, 10)
}

function categoryForAction(actionType: BankActionType): BankTransactionCategory {
  if (actionType === 'deposit_sales') {
    return 'sales_deposit'
  }
  if (actionType === 'collect_customer_payment') {
    return 'customer_payment'
  }
  if (actionType === 'pay_supplier') {
    return 'supplier_payment'
  }
  if (actionType === 'move_to_reserve') {
    return 'reserve_transfer'
  }
  return 'other'
}

function directionForAction(
  actionType: BankActionType,
  reserveDirection: 'save' | 'use' = 'save',
): 'inflow' | 'outflow' {
  if (actionType === 'move_to_reserve') {
    return reserveDirection === 'use' ? 'outflow' : 'inflow'
  }
  return actionType === 'pay_supplier' ? 'outflow' : 'inflow'
}

function replayResult(action: BankAction, snapshot: BankSnapshot): ConfirmBankActionResult {
  const transaction =
    snapshot.transactions.find((item) => item.external_transaction_id === action.idempotency_key) ??
    null
  return {
    ok: true,
    replayed: true,
    message: 'This confirmation was already recorded. No extra money was moved.',
    action,
    transaction,
    plannedOnly: action.action_type === 'move_to_reserve' && action.status !== 'completed',
  }
}

function applyLocalConfirm(
  snapshot: BankSnapshot,
  source: BankDataSource,
  input: ConfirmBankActionInput,
): { snapshot: BankSnapshot; result: ConfirmBankActionResult } {
  rejectMixedBankWrite(source, snapshot.isolation)
  const key = assertIdempotencyKey(input.idempotencyKey)
  const existing = findByIdempotencyKey(snapshot.actions, key)
  if (existing) {
    return { snapshot, result: replayResult(existing, snapshot) }
  }

  if (input.actionType === 'request_bank_support' && !input.ownerConsent) {
    return {
      snapshot,
      result: {
        ok: false,
        replayed: false,
        message: 'Consent is required before asking the bank for support.',
      },
    }
  }

  const amount = input.amountMmk == null ? null : Math.trunc(input.amountMmk)
  if (MONEY_ACTIONS.includes(input.actionType) && (!amount || amount <= 0)) {
    return {
      snapshot,
      result: { ok: false, replayed: false, message: 'Enter an amount to review.' },
    }
  }

  const provider = createBrowserBankProvider()
  provider.applyLocalDemo(input.actionType)

  const connection = snapshot.connection
  if (!connection || connection.status !== 'connected' || !connection.consent_given) {
    return {
      snapshot,
      result: {
        ok: false,
        replayed: false,
        message: 'Connect the demonstration account first.',
      },
    }
  }
  const withConnection = snapshot

  const stamp = nowIso()
  const plannedOnly = false
  const remembered = rememberIdempotent(withConnection.actions, key, () => {
    const row: BankAction = {
      id: crypto.randomUUID(),
      owner_id: connection.owner_id,
      business_id: connection.business_id,
      action_type: input.actionType,
      amount,
      status: plannedOnly ? 'confirmed' : 'completed',
      idempotency_key: key,
      confirmed_at: stamp,
      created_at: stamp,
      updated_at: stamp,
    }
    assertNoSensitiveBankFields(row as unknown as Record<string, unknown>)
    return row
  })

  let transactions = withConnection.transactions
  let transaction: BankTransaction | null = null
  if (!plannedOnly && input.actionType !== 'request_bank_support' && amount && amount > 0) {
    transaction = {
      id: crypto.randomUUID(),
      owner_id: connection.owner_id,
      business_id: connection.business_id,
      bank_connection_id: connection.id,
      external_transaction_id: key,
      direction: directionForAction(input.actionType, input.reserveDirection),
      amount,
      transaction_date: todayIso(),
      category: categoryForAction(input.actionType),
      description: input.purpose,
      source: 'demo',
      created_at: stamp,
    }
    assertNoSensitiveBankFields(transaction as unknown as Record<string, unknown>)
    transactions = [...transactions, transaction]
  }

  let supportRequests = withConnection.supportRequests
  let supportRequest: BankSupportRequest | null = null
  if (input.actionType === 'request_bank_support' && input.supportType && input.ownerConsent) {
    supportRequest = {
      id: crypto.randomUUID(),
      owner_id: connection.owner_id,
      business_id: connection.business_id,
      request_type: input.supportType,
      owner_message: input.ownerMessage ?? input.purpose,
      owner_consent: true,
      status: 'submitted',
      created_at: stamp,
      updated_at: stamp,
    }
    supportRequests = [...supportRequests, supportRequest]
  }

  const next: BankSnapshot = {
    ...withConnection,
    connection: { ...connection, last_synced_at: stamp, updated_at: stamp },
    actions: remembered.rows,
    transactions,
    supportRequests,
  }

  return {
    snapshot: next,
    result: {
      ok: true,
      replayed: remembered.replayed,
      message: plannedOnly
        ? 'Planned reserve move recorded. It is not completed until money actually moves.'
        : 'Confirmation saved. Demonstration only — no real bank transfer.',
      action: remembered.row,
      transaction,
      supportRequest,
      markReceivableId:
        input.actionType === 'collect_customer_payment' && transaction
          ? input.linkedReceivableId
          : undefined,
      markPayableId:
        input.actionType === 'pay_supplier' && transaction ? input.linkedPayableId : undefined,
      plannedOnly,
    },
  }
}

export async function loadBankSnapshot(source: BankDataSource): Promise<BankSnapshot> {
  if (source.kind === 'unavailable') {
    throw new Error(source.reason)
  }
  if (source.kind === 'demo') {
    const snapshot = loadDemoBankSnapshot(source.demoBusinessId)
    rejectMixedBankWrite(source, snapshot.isolation)
    return snapshot
  }
  const snapshot = await getBankRepository().loadSnapshot(source.businessId)
  rejectMixedBankWrite(source, snapshot.isolation)
  return snapshot
}

export async function confirmBankAction(
  source: BankDataSource,
  input: ConfirmBankActionInput,
): Promise<{ snapshot: BankSnapshot; result: ConfirmBankActionResult }> {
  if (source.kind === 'unavailable') {
    return {
      snapshot: {
        isolation: 'demo',
        demoBusinessId: null,
        connection: null,
        transactions: [],
        actions: [],
        supportRequests: [],
      },
      result: { ok: false, replayed: false, message: source.reason },
    }
  }

  if (source.kind === 'demo') {
    const current = loadDemoBankSnapshot(source.demoBusinessId)
    const applied = applyLocalConfirm(current, source, input)
    if (applied.result.ok) {
      saveDemoBankSnapshot(applied.snapshot)
    }
    return applied
  }

  try {
    const repo = getBankRepository()
    const existing = await repo.findActionByIdempotencyKey(input.idempotencyKey)
    const current = await repo.loadSnapshot(source.businessId)
    if (existing) {
      return { snapshot: current, result: replayResult(existing, current) }
    }
    if (input.actionType === 'request_bank_support' && !input.ownerConsent) {
      return {
        snapshot: current,
        result: {
          ok: false,
          replayed: false,
          message: 'Consent is required before asking the bank for support.',
        },
      }
    }

    const currentConnection = current.connection
    if (
      !currentConnection ||
      currentConnection.status !== 'connected' ||
      !currentConnection.consent_given
    ) {
      return {
        snapshot: current,
        result: {
          ok: false,
          replayed: false,
          message: 'Connect the demonstration account first.',
        },
      }
    }
    const connection = currentConnection
    const stamp = nowIso()
    const amount = input.amountMmk == null ? null : Math.trunc(input.amountMmk)
    const plannedOnly = false
    const action = await repo.insertAction({
      owner_id: source.ownerId,
      business_id: source.businessId,
      action_type: input.actionType,
      amount,
      status: plannedOnly ? 'confirmed' : 'completed',
      idempotency_key: input.idempotencyKey,
      confirmed_at: stamp,
    })

    let transaction: BankTransaction | null = null
    if (!plannedOnly && input.actionType !== 'request_bank_support' && amount && amount > 0) {
      transaction = await repo.insertTransaction({
        owner_id: source.ownerId,
        business_id: source.businessId,
        bank_connection_id: connection.id,
        external_transaction_id: input.idempotencyKey,
        direction: directionForAction(input.actionType, input.reserveDirection),
        amount,
        transaction_date: todayIso(),
        category: categoryForAction(input.actionType),
        description: input.purpose,
        source: 'demo',
      })
    }

    let supportRequest: BankSupportRequest | null = null
    if (input.actionType === 'request_bank_support' && input.supportType && input.ownerConsent) {
      supportRequest = await repo.insertSupportRequest({
        owner_id: source.ownerId,
        business_id: source.businessId,
        request_type: input.supportType,
        owner_message: input.ownerMessage ?? input.purpose,
        owner_consent: true,
        status: 'submitted',
      })
    }

    await repo.touchConnectionSync(connection.id)
    const snapshot = await repo.loadSnapshot(source.businessId)
    return {
      snapshot,
      result: {
        ok: true,
        replayed: false,
        message: plannedOnly
          ? 'Planned reserve move recorded. It is not completed until money actually moves.'
          : 'Confirmation saved. No real sponsor transfer was sent.',
        action,
        transaction,
        supportRequest,
        markReceivableId:
          input.actionType === 'collect_customer_payment' && transaction
            ? input.linkedReceivableId
            : undefined,
        markPayableId:
          input.actionType === 'pay_supplier' && transaction ? input.linkedPayableId : undefined,
        plannedOnly,
      },
    }
  } catch (error) {
    return {
      snapshot: await loadBankSnapshot(source).catch(() => ({
        isolation: 'real' as const,
        demoBusinessId: null,
        connection: null,
        transactions: [],
        actions: [],
        supportRequests: [],
      })),
      result: {
        ok: false,
        replayed: false,
        message: repositoryErrorMessage(error),
      },
    }
  }
}

export function resolveOwnerBankSource(options: {
  isDemoMode: boolean
  selectedDemoId: Parameters<typeof resolveBankDataSource>[0]['selectedDemoId']
  isAuthenticated: boolean
  ownerId: string | null
  businessId: string | null
}): BankDataSource {
  return resolveBankDataSource(options)
}

export function snapshotAvailableBalanceMmk(snapshot: BankSnapshot): number {
  return availableBusinessAccountBalanceMmk(snapshot.transactions)
}

export async function connectBankAccount(source: BankDataSource): Promise<BankSnapshot> {
  if (source.kind === 'demo') {
    return connectDemoBankAccount(source.demoBusinessId)
  }
  if (source.kind === 'unavailable') {
    throw new Error(source.reason)
  }
  const repo = getBankRepository()
  await repo.ensureDemoConnection(source.businessId)
  return repo.loadSnapshot(source.businessId)
}

export async function disconnectBankAccount(source: BankDataSource): Promise<BankSnapshot> {
  if (source.kind === 'demo') {
    return disconnectDemoBankAccount(source.demoBusinessId)
  }
  if (source.kind === 'unavailable') {
    throw new Error(source.reason)
  }
  const repo = getBankRepository()
  const snapshot = await repo.loadSnapshot(source.businessId)
  if (snapshot.connection) {
    await repo.disconnectConnection(snapshot.connection.id)
  }
  return repo.loadSnapshot(source.businessId)
}
