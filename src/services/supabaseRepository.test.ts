import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import {
  createSupabaseRepository,
  repositoryErrorMessage,
  selectActiveBusiness,
  SupabaseRepositoryError,
} from './supabaseRepository'

interface QueryResult {
  data: unknown
  error: { message: string } | null
}

function createQuery(result: QueryResult) {
  const query: Record<string, unknown> = {}
  const chain = () => query
  query.select = vi.fn(chain)
  query.insert = vi.fn(chain)
  query.update = vi.fn(chain)
  query.upsert = vi.fn(chain)
  query.delete = vi.fn(chain)
  query.eq = vi.fn(chain)
  query.order = vi.fn(chain)
  query.single = vi.fn(async () => result)
  query.maybeSingle = vi.fn(async () => result)
  query.then = (
    resolve: (value: QueryResult) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject)
  return query
}

function createClient(options: {
  userId?: string | null
  tables?: Record<string, QueryResult>
  authError?: { message: string } | null
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.userId ? { id: options.userId } : null },
        error: options.authError ?? null,
      }),
    },
    from: vi.fn((table: string) =>
      createQuery(
        options.tables?.[table] ?? {
          data: null,
          error: { message: `${table} failed` },
        },
      ),
    ),
  } as unknown as SupabaseClient<Database>
}

describe('supabaseRepository errors', () => {
  it('refuses writes when there is no signed-in user', async () => {
    const repo = createSupabaseRepository(
      createClient({ userId: null, authError: { message: 'Auth session missing' } }),
    )
    await expect(
      repo.createBusiness({ name: 'Mya Mart', starting_cash: 0 }),
    ).rejects.toBeInstanceOf(SupabaseRepositoryError)
    await expect(
      repo.createBusiness({ name: 'Mya Mart', starting_cash: 0 }),
    ).rejects.toThrow(/sign in/i)
  })

  it('surfaces bilingual errors from PostgREST failures', async () => {
    const repo = createSupabaseRepository(
      createClient({
        userId: 'owner-1',
        tables: {
          daily_checkins: { data: null, error: { message: 'row-level security' } },
        },
      }),
    )
    await expect(
      repo.saveDailyCheckin(
        {
          id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
          date: '2026-08-29',
          openingCashMmk: 0,
          cashSalesMmk: 1,
          customerDebtCollectedMmk: 0,
          creditSalesMmk: 0,
          operatingExpensesMmk: 0,
          inventoryPurchasesMmk: 0,
          supplierPaymentsMmk: 0,
          otherCashReceivedMmk: 0,
          otherCashPaidMmk: 0,
          expenseBreakdowns: [],
          notes: '',
          closingCashMmk: 1,
          createdAt: '2026-08-29T00:00:00.000Z',
          updatedAt: '2026-08-29T00:00:00.000Z',
        },
        'bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      ),
    ).rejects.toMatchObject({
      bilingualMessage: expect.stringContaining('ယနေ့စာရင်း'),
    })
  })

  it('never takes owner_id from the business payload', async () => {
    const insertResult = {
      data: {
        id: 'biz-1',
        owner_id: 'owner-from-session',
        name: 'Mya Mart',
        business_type: 'shop',
        starting_cash: 10,
        emergency_reserve: 0,
        currency: 'MMK',
        created_at: '2026-08-29T00:00:00.000Z',
        updated_at: '2026-08-29T00:00:00.000Z',
      },
      error: null,
    }
    const client = createClient({
      userId: 'owner-from-session',
      tables: { businesses: insertResult },
    })
    const from = client.from as ReturnType<typeof vi.fn>
    const repo = createSupabaseRepository(client)
    await repo.createBusiness({
      name: 'Mya Mart',
      starting_cash: 10,
      owner_id: 'forged-owner' as never,
    } as never)
    const query = from.mock.results[0]?.value as { insert: ReturnType<typeof vi.fn> }
    expect(query.insert).toHaveBeenCalled()
    const payload = query.insert.mock.calls[0]?.[0] as { owner_id: string }
    expect(payload.owner_id).toBe('owner-from-session')
  })

  it('never combines businesses when loading the active shop', () => {
    const first = { id: 'biz-a', name: 'Thiri Fashion' }
    const second = { id: 'biz-b', name: 'Other shop' }
    expect(selectActiveBusiness([first, second])).toEqual(first)
    expect(selectActiveBusiness([])).toBeNull()
  })

  it('scopes daily check-ins to one business_id', async () => {
    const client = createClient({
      userId: 'owner-1',
      tables: { daily_checkins: { data: [], error: null } },
    })
    const repo = createSupabaseRepository(client)
    await repo.getDailyCheckins('biz-1')
    const query = (client.from as ReturnType<typeof vi.fn>).mock.results[0]?.value as {
      eq: ReturnType<typeof vi.fn>
    }
    expect(query.eq).toHaveBeenCalledWith('business_id', 'biz-1')
  })

  it('formats unknown errors for the UI', () => {
    expect(repositoryErrorMessage(new Error('boom'))).toContain('boom')
    expect(
      repositoryErrorMessage(
        new SupabaseRepositoryError('x', 'Could not save / မသိမ်းနိုင်ပါ'),
      ),
    ).toBe('Could not save / မသိမ်းနိုင်ပါ')
  })
})
