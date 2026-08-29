import type { PostgrestError, SupabaseClient, User } from '@supabase/supabase-js'
import { bilingualAuthError } from '../lib/authErrors'
import { isUuid } from '../lib/uuid'
import { getSupabaseClient } from '../lib/supabase'
import type {
  Business,
  BusinessInsert,
  DailyCheckin,
  Payable as DbPayable,
  Profile,
  Receivable as DbReceivable,
} from '../types/database'
import type { Database } from '../types/database'
import { loadUserDrafts } from '../storage/userDrafts'
import { EMPTY_SCENARIOS, emptyStore, type AppStore } from '../storage/types'
import { rechainCheckIns } from '../lib/checkIn'
import type {
  DailyCashCheckIn,
  Payable,
  PreferredLanguage,
  Receivable,
} from '../types/models'
import {
  asPreferredLanguage,
  fromDailyCheckinRow,
  fromPayableRow,
  fromReceivableRow,
  mapBusinessToProfile,
  toDailyCheckinInsert,
  toPayableInsert,
  toReceivableInsert,
} from './mappers'

export class SupabaseRepositoryError extends Error {
  readonly bilingualMessage: string

  constructor(message: string, bilingualMessage?: string, cause?: unknown) {
    super(message)
    this.name = 'SupabaseRepositoryError'
    this.bilingualMessage = bilingualMessage ?? message
    if (cause !== undefined) {
      this.cause = cause
    }
  }
}

function throwIfError(
  error: PostgrestError | null,
  fallback: string,
): void {
  if (!error) {
    return
  }
  throw new SupabaseRepositoryError(error.message, fallback, error)
}

async function requireOwnerId(client: SupabaseClient<Database>): Promise<string> {
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) {
    throw new SupabaseRepositoryError(
      'Please sign in again',
      bilingualAuthError('Please sign in again', 'ထပ်မံဝင်ရောက်ပါ'),
      error,
    )
  }
  return data.user.id
}

export function selectActiveBusiness<T>(businesses: T[]): T | null {
  return businesses[0] ?? null
}

export function createSupabaseRepository(client: SupabaseClient<Database>) {
  async function upsertProfile(user: User, preferredLanguage?: PreferredLanguage): Promise<Profile> {
    const ownerId = user.id
    const fullName =
      typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : null
    const { data, error } = await client
      .from('profiles')
      .upsert(
        {
          id: ownerId,
          full_name: fullName,
          preferred_language: preferredLanguage ?? 'my',
        },
        { onConflict: 'id' },
      )
      .select()
      .single()
    throwIfError(
      error,
      bilingualAuthError('Could not save your profile', 'ပရိုဖိုင်ကို မသိမ်းနိုင်ပါ'),
    )
    return data as Profile
  }

  async function getProfile(): Promise<Profile | null> {
    const ownerId = await requireOwnerId(client)
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', ownerId)
      .maybeSingle()
    throwIfError(
      error,
      bilingualAuthError('Could not load your profile', 'ပရိုဖိုင်ကို မဖတ်နိုင်ပါ'),
    )
    return data
  }

  async function updateProfileLanguage(preferredLanguage: PreferredLanguage): Promise<void> {
    const ownerId = await requireOwnerId(client)
    const { error } = await client
      .from('profiles')
      .update({ preferred_language: preferredLanguage })
      .eq('id', ownerId)
    throwIfError(
      error,
      bilingualAuthError('Could not save language', 'ဘာသာစကားကို မသိမ်းနိုင်ပါ'),
    )
  }

  async function createBusiness(
    input: Omit<BusinessInsert, 'owner_id' | 'id'> & { id?: string },
  ): Promise<Business> {
    const ownerId = await requireOwnerId(client)
    const payload: BusinessInsert = {
      owner_id: ownerId,
      name: input.name,
      business_type: input.business_type ?? null,
      starting_cash: input.starting_cash ?? 0,
      emergency_reserve: input.emergency_reserve ?? 0,
      currency: input.currency ?? 'MMK',
    }
    if (input.id && isUuid(input.id)) {
      payload.id = input.id
    }
    const { data, error } = await client
      .from('businesses')
      .insert(payload)
      .select()
      .single()
    throwIfError(
      error,
      bilingualAuthError('Could not create the shop', 'ဆိုင်ကို မဖန်တီးနိုင်ပါ'),
    )
    return data as Business
  }

  async function updateBusiness(
    businessId: string,
    input: Partial<Omit<BusinessInsert, 'owner_id' | 'id'>>,
  ): Promise<Business> {
    const ownerId = await requireOwnerId(client)
    const patch: Partial<Omit<BusinessInsert, 'owner_id' | 'id'>> = {}
    if (input.name !== undefined) {
      patch.name = input.name
    }
    if (input.business_type !== undefined) {
      patch.business_type = input.business_type
    }
    if (input.starting_cash !== undefined) {
      patch.starting_cash = input.starting_cash
    }
    if (input.emergency_reserve !== undefined) {
      patch.emergency_reserve = input.emergency_reserve
    }
    if (input.currency !== undefined) {
      patch.currency = input.currency
    }
    const { data, error } = await client
      .from('businesses')
      .update(patch)
      .eq('id', businessId)
      .eq('owner_id', ownerId)
      .select()
      .single()
    throwIfError(
      error,
      bilingualAuthError('Could not update the shop', 'ဆိုင်အချက်အလက်ကို မသိမ်းနိုင်ပါ'),
    )
    return data as Business
  }

  async function getBusinesses(): Promise<Business[]> {
    const ownerId = await requireOwnerId(client)
    const { data, error } = await client
      .from('businesses')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: true })
    throwIfError(
      error,
      bilingualAuthError('Could not load shops', 'ဆိုင်စာရင်းကို မဖတ်နိုင်ပါ'),
    )
    return (data ?? []) as Business[]
  }

  async function getBusinessById(businessId: string): Promise<Business | null> {
    const ownerId = await requireOwnerId(client)
    const { data, error } = await client
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .eq('owner_id', ownerId)
      .maybeSingle()
    throwIfError(
      error,
      bilingualAuthError('Could not load the shop', 'ဆိုင်ကို မဖတ်နိုင်ပါ'),
    )
    return data
  }

  async function saveDailyCheckin(
    checkIn: DailyCashCheckIn,
    businessId: string,
  ): Promise<DailyCashCheckIn> {
    const ownerId = await requireOwnerId(client)
    const insert = toDailyCheckinInsert(checkIn, ownerId, businessId)
    const { data: existing, error: lookupError } = await client
      .from('daily_checkins')
      .select('id')
      .eq('business_id', businessId)
      .eq('checkin_date', checkIn.date)
      .maybeSingle()
    throwIfError(
      lookupError,
      bilingualAuthError('Could not save today’s record', 'ယနေ့စာရင်းကို မသိမ်းနိုင်ပါ'),
    )

    if (existing?.id) {
      const { data, error } = await client
        .from('daily_checkins')
        .update(insert)
        .eq('id', existing.id)
        .eq('owner_id', ownerId)
        .eq('business_id', businessId)
        .select()
        .single()
      throwIfError(
        error,
        bilingualAuthError('Could not save today’s record', 'ယနေ့စာရင်းကို မသိမ်းနိုင်ပါ'),
      )
      return fromDailyCheckinRow(data as DailyCheckin)
    }

    const payload = {
      ...insert,
      ...(isUuid(checkIn.id) ? { id: checkIn.id } : {}),
    }
    const { data, error } = await client
      .from('daily_checkins')
      .insert(payload)
      .select()
      .single()
    throwIfError(
      error,
      bilingualAuthError('Could not save today’s record', 'ယနေ့စာရင်းကို မသိမ်းနိုင်ပါ'),
    )
    return fromDailyCheckinRow(data as DailyCheckin)
  }

  async function getDailyCheckins(businessId: string): Promise<DailyCashCheckIn[]> {
    const ownerId = await requireOwnerId(client)
    const { data, error } = await client
      .from('daily_checkins')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('business_id', businessId)
      .order('checkin_date', { ascending: true })
    throwIfError(
      error,
      bilingualAuthError('Could not load daily records', 'နေ့စဉ်စာရင်းကို မဖတ်နိုင်ပါ'),
    )
    return ((data ?? []) as DailyCheckin[]).map(fromDailyCheckinRow)
  }

  async function deleteDailyCheckin(id: string, businessId: string): Promise<void> {
    const ownerId = await requireOwnerId(client)
    const { error } = await client
      .from('daily_checkins')
      .delete()
      .eq('id', id)
      .eq('owner_id', ownerId)
      .eq('business_id', businessId)
    throwIfError(
      error,
      bilingualAuthError('Could not delete the record', 'စာရင်းကို မဖျက်နိုင်ပါ'),
    )
  }

  async function createReceivable(
    item: Receivable,
    businessId: string,
  ): Promise<Receivable> {
    const ownerId = await requireOwnerId(client)
    const payload = {
      ...toReceivableInsert(item, ownerId, businessId),
      ...(isUuid(item.id) ? { id: item.id } : {}),
    }
    const { data, error } = await client
      .from('receivables')
      .insert(payload)
      .select()
      .single()
    throwIfError(
      error,
      bilingualAuthError('Could not save the customer bill', 'ဖောက်သည်ဘီလ်ကို မသိမ်းနိုင်ပါ'),
    )
    return fromReceivableRow(data as DbReceivable)
  }

  async function updateReceivable(
    item: Receivable,
    businessId: string,
  ): Promise<Receivable> {
    const ownerId = await requireOwnerId(client)
    const payload = toReceivableInsert(item, ownerId, businessId)
    const { data, error } = await client
      .from('receivables')
      .update(payload)
      .eq('id', item.id)
      .eq('owner_id', ownerId)
      .eq('business_id', businessId)
      .select()
      .single()
    throwIfError(
      error,
      bilingualAuthError('Could not update the customer bill', 'ဖောက်သည်ဘီလ်ကို မပြင်နိုင်ပါ'),
    )
    return fromReceivableRow(data as DbReceivable)
  }

  async function getReceivables(businessId: string): Promise<Receivable[]> {
    const ownerId = await requireOwnerId(client)
    const { data, error } = await client
      .from('receivables')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('business_id', businessId)
      .order('due_date', { ascending: true })
    throwIfError(
      error,
      bilingualAuthError('Could not load customer bills', 'ဖောက်သည်ဘီလ်များကို မဖတ်နိုင်ပါ'),
    )
    return ((data ?? []) as DbReceivable[]).map(fromReceivableRow)
  }

  async function deleteReceivable(id: string, businessId: string): Promise<void> {
    const ownerId = await requireOwnerId(client)
    const { error } = await client
      .from('receivables')
      .delete()
      .eq('id', id)
      .eq('owner_id', ownerId)
      .eq('business_id', businessId)
    throwIfError(
      error,
      bilingualAuthError('Could not delete the customer bill', 'ဖောက်သည်ဘီလ်ကို မဖျက်နိုင်ပါ'),
    )
  }

  async function createPayable(item: Payable, businessId: string): Promise<Payable> {
    const ownerId = await requireOwnerId(client)
    const payload = {
      ...toPayableInsert(item, ownerId, businessId),
      ...(isUuid(item.id) ? { id: item.id } : {}),
    }
    const { data, error } = await client
      .from('payables')
      .insert(payload)
      .select()
      .single()
    throwIfError(
      error,
      bilingualAuthError('Could not save the supplier bill', 'ပေးရန်ဘီလ်ကို မသိမ်းနိုင်ပါ'),
    )
    return fromPayableRow(data as DbPayable, item.recurrence)
  }

  async function updatePayable(item: Payable, businessId: string): Promise<Payable> {
    const ownerId = await requireOwnerId(client)
    const payload = toPayableInsert(item, ownerId, businessId)
    const { data, error } = await client
      .from('payables')
      .update(payload)
      .eq('id', item.id)
      .eq('owner_id', ownerId)
      .eq('business_id', businessId)
      .select()
      .single()
    throwIfError(
      error,
      bilingualAuthError('Could not update the supplier bill', 'ပေးရန်ဘီလ်ကို မပြင်နိုင်ပါ'),
    )
    return fromPayableRow(data as DbPayable, item.recurrence)
  }

  async function getPayables(businessId: string): Promise<Payable[]> {
    const ownerId = await requireOwnerId(client)
    const { data, error } = await client
      .from('payables')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('business_id', businessId)
      .order('due_date', { ascending: true })
    throwIfError(
      error,
      bilingualAuthError('Could not load supplier bills', 'ပေးရန်ဘီလ်များကို မဖတ်နိုင်ပါ'),
    )
    return ((data ?? []) as DbPayable[]).map((row) => fromPayableRow(row))
  }

  async function deletePayable(id: string, businessId: string): Promise<void> {
    const ownerId = await requireOwnerId(client)
    const { error } = await client
      .from('payables')
      .delete()
      .eq('id', id)
      .eq('owner_id', ownerId)
      .eq('business_id', businessId)
    throwIfError(
      error,
      bilingualAuthError('Could not delete the supplier bill', 'ပေးရန်ဘီလ်ကို မဖျက်နိုင်ပါ'),
    )
  }

  return {
    upsertProfile,
    getProfile,
    updateProfileLanguage,
    createBusiness,
    updateBusiness,
    getBusinesses,
    getBusinessById,
    saveDailyCheckin,
    getDailyCheckins,
    deleteDailyCheckin,
    createReceivable,
    updateReceivable,
    getReceivables,
    deleteReceivable,
    createPayable,
    updatePayable,
    getPayables,
    deletePayable,
  }
}

export type SupabaseRepository = ReturnType<typeof createSupabaseRepository>

export function getSupabaseRepository(): SupabaseRepository {
  return createSupabaseRepository(getSupabaseClient())
}

export async function loadAuthenticatedStore(userId: string): Promise<AppStore> {
  const repo = getSupabaseRepository()
  const drafts = loadUserDrafts(userId)
  const [businesses, profileRow] = await Promise.all([
    repo.getBusinesses(),
    repo.getProfile(),
  ])
  const business = selectActiveBusiness(businesses)
  if (!business) {
    return {
      ...emptyStore(),
      scheduledItems: drafts.scheduledItems,
      scenarios: { ...EMPTY_SCENARIOS, ...drafts.scenarios },
    }
  }
  const [checkIns, receivables, payables] = await Promise.all([
    repo.getDailyCheckins(business.id),
    repo.getReceivables(business.id),
    repo.getPayables(business.id),
  ])
  return {
    profile: mapBusinessToProfile(
      business,
      drafts.profileExtras,
      asPreferredLanguage(profileRow?.preferred_language),
    ),
    checkIns: rechainCheckIns(checkIns, Number(business.starting_cash) || 0),
    scheduledItems: drafts.scheduledItems,
    receivables,
    payables: payables.map((item) => ({
      ...item,
      recurrence: drafts.payableRecurrence[item.id] ?? item.recurrence,
    })),
    scenarios: { ...EMPTY_SCENARIOS, ...drafts.scenarios },
  }
}

export function repositoryErrorMessage(error: unknown): string {
  if (error instanceof SupabaseRepositoryError) {
    return error.bilingualMessage
  }
  if (error instanceof Error && error.message) {
    return bilingualAuthError(error.message, 'ထပ်မံကြိုးစားပါ')
  }
  return bilingualAuthError('Could not save to the cloud', 'ကလောက်တွင် မသိမ်းနိုင်ပါ')
}
