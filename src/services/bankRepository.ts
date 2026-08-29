import type { SupabaseClient } from '@supabase/supabase-js'
import { bilingualAuthError } from '../lib/authErrors'
import { isSafeAccountMask, maskAccountLast4 } from '../lib/bankIsolation'
import { isUuid } from '../lib/uuid'
import { getSupabaseClient } from '../lib/supabase'
import type {
  BankAction,
  BankActionInsert,
  BankConnection,
  BankConnectionInsert,
  BankDatabase,
  BankSupportRequest,
  BankSupportRequestInsert,
  BankTransaction,
  BankTransactionInsert,
} from '../types/bank'
import { emptyBankSnapshot, type BankSnapshot } from './bankTypes'
import { SupabaseRepositoryError } from './supabaseRepository'

function bankClient(): SupabaseClient<BankDatabase> {
  return getSupabaseClient() as unknown as SupabaseClient<BankDatabase>
}

function throwIfError(error: { message: string } | null, fallback: string): void {
  if (!error) {
    return
  }
  throw new SupabaseRepositoryError(error.message, fallback, error)
}

async function requireOwnerId(): Promise<string> {
  const { data, error } = await getSupabaseClient().auth.getUser()
  if (error || !data.user) {
    throw new SupabaseRepositoryError(
      'Not signed in',
      bilingualAuthError('Please sign in again', 'ထပ်မံဝင်ရောက်ပါ'),
      error,
    )
  }
  return data.user.id
}

function sanitizeConnection(row: BankConnection): BankConnection {
  const mask = row.account_mask ? maskAccountLast4(row.account_mask) : null
  if (!isSafeAccountMask(mask)) {
    return { ...row, account_mask: null }
  }
  return { ...row, account_mask: mask }
}

export function createBankRepository(client: SupabaseClient<BankDatabase> = bankClient()) {
  async function loadSnapshot(businessId: string): Promise<BankSnapshot> {
    const ownerId = await requireOwnerId()
    const [connections, transactions, actions, support] = await Promise.all([
      client
        .from('bank_connections')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('business_id', businessId)
        .order('created_at', { ascending: true }),
      client
        .from('bank_transactions')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('business_id', businessId)
        .order('created_at', { ascending: true }),
      client
        .from('bank_actions')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false }),
      client
        .from('bank_support_requests')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false }),
    ])
    throwIfError(
      connections.error,
      bilingualAuthError('Could not load the business account', 'လုပ်ငန်းအကောင့်ကို မဖတ်နိုင်ပါ'),
    )
    throwIfError(
      transactions.error,
      bilingualAuthError('Could not load account movements', 'အကောင့်လှုပ်ရှားမှုကို မဖတ်နိုင်ပါ'),
    )
    throwIfError(
      actions.error,
      bilingualAuthError('Could not load banking actions', 'ဘဏ်လုပ်ဆောင်ချက်များကို မဖတ်နိုင်ပါ'),
    )
    throwIfError(
      support.error,
      bilingualAuthError('Could not load support requests', 'အကူအညီတောင်းချက်များကို မဖတ်နိုင်ပါ'),
    )
    const connection = (connections.data ?? [])[0] as BankConnection | undefined
    return {
      isolation: 'real',
      demoBusinessId: null,
      connection: connection ? sanitizeConnection(connection) : null,
      transactions: (transactions.data ?? []) as BankTransaction[],
      actions: (actions.data ?? []) as BankAction[],
      supportRequests: (support.data ?? []) as BankSupportRequest[],
    }
  }

  async function findActionByIdempotencyKey(idempotencyKey: string): Promise<BankAction | null> {
    const ownerId = await requireOwnerId()
    if (!isUuid(idempotencyKey)) {
      throw new SupabaseRepositoryError('Invalid idempotency key')
    }
    const { data, error } = await client
      .from('bank_actions')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()
    throwIfError(
      error,
      bilingualAuthError('Could not check the action', 'လုပ်ဆောင်ချက်ကို မစစ်နိုင်ပါ'),
    )
    return (data as BankAction | null) ?? null
  }

  async function ensureDemoConnection(businessId: string): Promise<BankConnection> {
    const snapshot = await loadSnapshot(businessId)
    if (snapshot.connection) {
      return snapshot.connection
    }
    const ownerId = await requireOwnerId()
    const payload: BankConnectionInsert = {
      owner_id: ownerId,
      business_id: businessId,
      provider_name: 'demo-local',
      connection_type: 'demo',
      status: 'connected',
      account_mask: maskAccountLast4(String(Date.now()).slice(-4)),
      consent_given: true,
      consent_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    }
    const { data, error } = await client
      .from('bank_connections')
      .insert(payload)
      .select()
      .single()
    throwIfError(
      error,
      bilingualAuthError('Could not create the demo connection', 'သရုပ်ပြချိတ်ဆက်မှုကို မဖန်တီးနိုင်ပါ'),
    )
    return sanitizeConnection(data as BankConnection)
  }

  async function insertAction(input: BankActionInsert): Promise<BankAction> {
    const { data, error } = await client.from('bank_actions').insert(input).select().single()
    throwIfError(
      error,
      bilingualAuthError('Could not save the banking action', 'ဘဏ်လုပ်ဆောင်ချက်ကို မသိမ်းနိုင်ပါ'),
    )
    return data as BankAction
  }

  async function insertTransaction(input: BankTransactionInsert): Promise<BankTransaction> {
    const { data, error } = await client
      .from('bank_transactions')
      .insert(input)
      .select()
      .single()
    throwIfError(
      error,
      bilingualAuthError('Could not save the movement', 'ငွေလှုပ်ရှားမှုကို မသိမ်းနိုင်ပါ'),
    )
    return data as BankTransaction
  }

  async function insertSupportRequest(
    input: BankSupportRequestInsert,
  ): Promise<BankSupportRequest> {
    const { data, error } = await client
      .from('bank_support_requests')
      .insert(input)
      .select()
      .single()
    throwIfError(
      error,
      bilingualAuthError('Could not save the support request', 'အကူအညီတောင်းချက်ကို မသိမ်းနိုင်ပါ'),
    )
    return data as BankSupportRequest
  }

  async function disconnectConnection(connectionId: string): Promise<void> {
    const ownerId = await requireOwnerId()
    const { error } = await client
      .from('bank_connections')
      .update({
        status: 'disconnected',
        consent_given: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)
      .eq('owner_id', ownerId)
    throwIfError(
      error,
      bilingualAuthError('Could not disconnect the account', 'အကောင့်ကို မဖြုတ်နိုင်ပါ'),
    )
  }

  async function touchConnectionSync(connectionId: string): Promise<void> {
    const ownerId = await requireOwnerId()
    const { error } = await client
      .from('bank_connections')
      .update({ last_synced_at: new Date().toISOString(), status: 'connected' })
      .eq('id', connectionId)
      .eq('owner_id', ownerId)
    throwIfError(
      error,
      bilingualAuthError('Could not update last sync', 'နောက်ဆုံးချိတ်ဆက်ချိန်ကို မသိမ်းနိုင်ပါ'),
    )
  }

  return {
    loadSnapshot,
    findActionByIdempotencyKey,
    ensureDemoConnection,
    insertAction,
    insertTransaction,
    insertSupportRequest,
    touchConnectionSync,
    disconnectConnection,
  }
}

export type BankRepository = ReturnType<typeof createBankRepository>

export function getBankRepository(): BankRepository {
  return createBankRepository()
}

export function emptyRealBankSnapshot(): BankSnapshot {
  return emptyBankSnapshot('real')
}
