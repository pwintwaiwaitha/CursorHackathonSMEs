-- SME Mate AI — bank partnership value layer
-- Postgres 15+. Safe to paste into the Supabase SQL Editor after 001.
-- Additive only: does not drop, truncate, or otherwise destroy existing data.
-- Never stores usernames, passwords, PINs, OTPs, full account numbers, tokens, or secrets.

-- ---------------------------------------------------------------------------
-- updated_at helper (reuse from 001; create or replace; never drops tables)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------------
create table public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  provider_name text not null,
  connection_type text not null default 'demo',
  status text not null default 'disconnected',
  -- Last 4 digits only. Never store a full account number.
  account_mask text,
  consent_given boolean not null default false,
  consent_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bank_connections_business_provider_unique unique (business_id, provider_name),
  constraint bank_connections_type_valid check (
    connection_type in ('demo', 'sandbox', 'live')
  ),
  constraint bank_connections_status_valid check (
    status in ('disconnected', 'connected', 'syncing', 'error')
  ),
  constraint bank_connections_account_mask_last4 check (
    account_mask is null
    or (
      char_length(account_mask) <= 4
      and account_mask ~ '^[0-9]*$'
    )
  )
);

create table public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  bank_connection_id uuid not null references public.bank_connections (id) on delete cascade,
  external_transaction_id text not null,
  direction text not null,
  amount bigint not null,
  transaction_date date not null,
  category text not null,
  description text,
  source text not null,
  created_at timestamptz not null default now(),
  constraint bank_transactions_connection_external_unique unique (
    bank_connection_id,
    external_transaction_id
  ),
  constraint bank_transactions_direction_valid check (
    direction in ('inflow', 'outflow')
  ),
  constraint bank_transactions_amount_positive check (amount > 0),
  constraint bank_transactions_category_valid check (
    category in (
      'sales_deposit',
      'customer_payment',
      'supplier_payment',
      'reserve_transfer',
      'fee',
      'other'
    )
  ),
  constraint bank_transactions_source_valid check (
    source in ('demo', 'sandbox', 'bank_sync')
  )
);

create table public.bank_actions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  action_type text not null,
  amount bigint,
  status text not null default 'draft',
  idempotency_key uuid not null default gen_random_uuid(),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bank_actions_idempotency_key_unique unique (idempotency_key),
  constraint bank_actions_type_valid check (
    action_type in (
      'deposit_sales',
      'collect_customer_payment',
      'pay_supplier',
      'move_to_reserve',
      'request_bank_support'
    )
  ),
  constraint bank_actions_status_valid check (
    status in ('draft', 'confirmed', 'completed', 'failed')
  ),
  constraint bank_actions_amount_positive check (amount is null or amount > 0)
);

create table public.bank_support_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  request_type text not null,
  owner_message text,
  owner_consent boolean not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bank_support_requests_type_valid check (
    request_type in (
      'business_account',
      'merchant_qr',
      'payment_service',
      'working_capital',
      'financial_guidance'
    )
  ),
  constraint bank_support_requests_status_valid check (
    status in ('draft', 'submitted', 'contacted', 'closed')
  ),
  constraint bank_support_requests_submitted_requires_consent check (
    status <> 'submitted'
    or owner_consent
  )
);

-- ---------------------------------------------------------------------------
-- indexes
-- ---------------------------------------------------------------------------
create index bank_connections_owner_id_idx on public.bank_connections (owner_id);
create index bank_connections_business_id_idx on public.bank_connections (business_id);
create index bank_connections_status_idx on public.bank_connections (status);

create index bank_transactions_owner_id_idx on public.bank_transactions (owner_id);
create index bank_transactions_business_id_idx on public.bank_transactions (business_id);
create index bank_transactions_bank_connection_id_idx on public.bank_transactions (bank_connection_id);
create index bank_transactions_transaction_date_idx on public.bank_transactions (transaction_date);
create index bank_transactions_category_idx on public.bank_transactions (category);

create index bank_actions_owner_id_idx on public.bank_actions (owner_id);
create index bank_actions_business_id_idx on public.bank_actions (business_id);
create index bank_actions_status_idx on public.bank_actions (status);
create index bank_actions_action_type_idx on public.bank_actions (action_type);

create index bank_support_requests_owner_id_idx on public.bank_support_requests (owner_id);
create index bank_support_requests_business_id_idx on public.bank_support_requests (business_id);
create index bank_support_requests_status_idx on public.bank_support_requests (status);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger set_bank_connections_updated_at
  before update on public.bank_connections
  for each row
  execute function public.set_updated_at();

create trigger set_bank_actions_updated_at
  before update on public.bank_actions
  for each row
  execute function public.set_updated_at();

create trigger set_bank_support_requests_updated_at
  before update on public.bank_support_requests
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- row level security (authenticated owners only; no public / bank-staff policies)
-- ---------------------------------------------------------------------------
alter table public.bank_connections enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.bank_actions enable row level security;
alter table public.bank_support_requests enable row level security;

-- bank_connections
create policy bank_connections_select_own
  on public.bank_connections
  for select
  to authenticated
  using (owner_id = auth.uid());

create policy bank_connections_insert_own
  on public.bank_connections
  for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.businesses
      where businesses.id = bank_connections.business_id
        and businesses.owner_id = auth.uid()
    )
  );

create policy bank_connections_update_own
  on public.bank_connections
  for update
  to authenticated
  using (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.businesses
      where businesses.id = bank_connections.business_id
        and businesses.owner_id = auth.uid()
    )
  )
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.businesses
      where businesses.id = bank_connections.business_id
        and businesses.owner_id = auth.uid()
    )
  );

create policy bank_connections_delete_own
  on public.bank_connections
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- bank_transactions
create policy bank_transactions_select_own
  on public.bank_transactions
  for select
  to authenticated
  using (owner_id = auth.uid());

create policy bank_transactions_insert_own
  on public.bank_transactions
  for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.businesses
      where businesses.id = bank_transactions.business_id
        and businesses.owner_id = auth.uid()
    )
    and exists (
      select 1
      from public.bank_connections
      where bank_connections.id = bank_transactions.bank_connection_id
        and bank_connections.owner_id = auth.uid()
        and bank_connections.business_id = bank_transactions.business_id
    )
  );

create policy bank_transactions_update_own
  on public.bank_transactions
  for update
  to authenticated
  using (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.businesses
      where businesses.id = bank_transactions.business_id
        and businesses.owner_id = auth.uid()
    )
  )
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.businesses
      where businesses.id = bank_transactions.business_id
        and businesses.owner_id = auth.uid()
    )
    and exists (
      select 1
      from public.bank_connections
      where bank_connections.id = bank_transactions.bank_connection_id
        and bank_connections.owner_id = auth.uid()
        and bank_connections.business_id = bank_transactions.business_id
    )
  );

create policy bank_transactions_delete_own
  on public.bank_transactions
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- bank_actions
create policy bank_actions_select_own
  on public.bank_actions
  for select
  to authenticated
  using (owner_id = auth.uid());

create policy bank_actions_insert_own
  on public.bank_actions
  for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.businesses
      where businesses.id = bank_actions.business_id
        and businesses.owner_id = auth.uid()
    )
  );

create policy bank_actions_update_own
  on public.bank_actions
  for update
  to authenticated
  using (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.businesses
      where businesses.id = bank_actions.business_id
        and businesses.owner_id = auth.uid()
    )
  )
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.businesses
      where businesses.id = bank_actions.business_id
        and businesses.owner_id = auth.uid()
    )
  );

create policy bank_actions_delete_own
  on public.bank_actions
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- bank_support_requests: no DELETE (consent / audit trail)
create policy bank_support_requests_select_own
  on public.bank_support_requests
  for select
  to authenticated
  using (owner_id = auth.uid());

create policy bank_support_requests_insert_own
  on public.bank_support_requests
  for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.businesses
      where businesses.id = bank_support_requests.business_id
        and businesses.owner_id = auth.uid()
    )
  );

create policy bank_support_requests_update_own
  on public.bank_support_requests
  for update
  to authenticated
  using (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.businesses
      where businesses.id = bank_support_requests.business_id
        and businesses.owner_id = auth.uid()
    )
  )
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.businesses
      where businesses.id = bank_support_requests.business_id
        and businesses.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- privileges: no anon / public access; authenticated only
-- ---------------------------------------------------------------------------
revoke all on table public.bank_connections from public, anon, authenticated;
revoke all on table public.bank_transactions from public, anon, authenticated;
revoke all on table public.bank_actions from public, anon, authenticated;
revoke all on table public.bank_support_requests from public, anon, authenticated;

grant select, insert, update, delete on table public.bank_connections to authenticated;
grant select, insert, update, delete on table public.bank_transactions to authenticated;
grant select, insert, update, delete on table public.bank_actions to authenticated;
grant select, insert, update on table public.bank_support_requests to authenticated;
