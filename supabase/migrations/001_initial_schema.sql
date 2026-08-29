-- SME Mate AI — initial schema
-- Postgres 15+. Safe to paste into the Supabase SQL Editor.
-- Does not drop, truncate, or otherwise destroy existing data.

-- ---------------------------------------------------------------------------
-- updated_at helper (create or replace; never drops tables)
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
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  preferred_language text default 'my',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  business_type text,
  starting_cash bigint not null default 0,
  emergency_reserve bigint not null default 0,
  currency text default 'MMK',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_starting_cash_non_negative check (starting_cash >= 0),
  constraint businesses_emergency_reserve_non_negative check (emergency_reserve >= 0)
);

create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  checkin_date date not null,
  opening_cash bigint not null default 0,
  cash_sales bigint not null default 0,
  receivables_collected bigint not null default 0,
  other_income bigint not null default 0,
  inventory_purchases bigint not null default 0,
  supplier_payments bigint not null default 0,
  wages bigint not null default 0,
  rent_and_utilities bigint not null default 0,
  other_expenses bigint not null default 0,
  notes text,
  source text not null default 'form',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Computed in Postgres only. Not calculated by the app or by AI.
  -- May be negative when outflows exceed inflows; no closing_cash >= 0 check.
  closing_cash bigint generated always as (
    opening_cash
    + cash_sales
    + receivables_collected
    + other_income
    - inventory_purchases
    - supplier_payments
    - wages
    - rent_and_utilities
    - other_expenses
  ) stored,
  constraint daily_checkins_business_date_unique unique (business_id, checkin_date),
  constraint daily_checkins_opening_cash_non_negative check (opening_cash >= 0),
  constraint daily_checkins_cash_sales_non_negative check (cash_sales >= 0),
  constraint daily_checkins_receivables_collected_non_negative check (receivables_collected >= 0),
  constraint daily_checkins_other_income_non_negative check (other_income >= 0),
  constraint daily_checkins_inventory_purchases_non_negative check (inventory_purchases >= 0),
  constraint daily_checkins_supplier_payments_non_negative check (supplier_payments >= 0),
  constraint daily_checkins_wages_non_negative check (wages >= 0),
  constraint daily_checkins_rent_and_utilities_non_negative check (rent_and_utilities >= 0),
  constraint daily_checkins_other_expenses_non_negative check (other_expenses >= 0),
  constraint daily_checkins_source_valid check (source in ('form', 'voice'))
);

create table public.receivables (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_name text not null,
  amount bigint not null,
  due_date date,
  status text not null default 'pending',
  amount_received bigint not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint receivables_amount_non_negative check (amount >= 0),
  constraint receivables_amount_received_non_negative check (amount_received >= 0),
  constraint receivables_amount_received_lte_amount check (amount_received <= amount),
  constraint receivables_status_valid check (status in ('pending', 'partial', 'paid', 'overdue'))
);

create table public.payables (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  supplier_name text not null,
  category text,
  amount bigint not null,
  due_date date,
  status text not null default 'pending',
  amount_paid bigint not null default 0,
  essential boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payables_amount_non_negative check (amount >= 0),
  constraint payables_amount_paid_non_negative check (amount_paid >= 0),
  constraint payables_amount_paid_lte_amount check (amount_paid <= amount),
  constraint payables_status_valid check (status in ('pending', 'partial', 'paid', 'overdue'))
);

-- ---------------------------------------------------------------------------
-- indexes
-- ---------------------------------------------------------------------------
create index businesses_owner_id_idx on public.businesses (owner_id);

create index daily_checkins_owner_id_idx on public.daily_checkins (owner_id);
create index daily_checkins_business_id_idx on public.daily_checkins (business_id);
create index daily_checkins_checkin_date_idx on public.daily_checkins (checkin_date);

create index receivables_owner_id_idx on public.receivables (owner_id);
create index receivables_business_id_idx on public.receivables (business_id);
create index receivables_due_date_idx on public.receivables (due_date);
create index receivables_status_idx on public.receivables (status);

create index payables_owner_id_idx on public.payables (owner_id);
create index payables_business_id_idx on public.payables (business_id);
create index payables_due_date_idx on public.payables (due_date);
create index payables_status_idx on public.payables (status);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create trigger set_businesses_updated_at
  before update on public.businesses
  for each row
  execute function public.set_updated_at();

create trigger set_daily_checkins_updated_at
  before update on public.daily_checkins
  for each row
  execute function public.set_updated_at();

create trigger set_receivables_updated_at
  before update on public.receivables
  for each row
  execute function public.set_updated_at();

create trigger set_payables_updated_at
  before update on public.payables
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.receivables enable row level security;
alter table public.payables enable row level security;

-- profiles: owner is the row id (auth.users)
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- businesses
create policy businesses_select_own
  on public.businesses
  for select
  to authenticated
  using (owner_id = auth.uid());

create policy businesses_insert_own
  on public.businesses
  for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy businesses_update_own
  on public.businesses
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy businesses_delete_own
  on public.businesses
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- daily_checkins: owner_id match, plus business ownership on write
create policy daily_checkins_select_own
  on public.daily_checkins
  for select
  to authenticated
  using (owner_id = auth.uid());

create policy daily_checkins_insert_own
  on public.daily_checkins
  for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.businesses
      where businesses.id = daily_checkins.business_id
        and businesses.owner_id = auth.uid()
    )
  );

create policy daily_checkins_update_own
  on public.daily_checkins
  for update
  to authenticated
  using (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.businesses
      where businesses.id = daily_checkins.business_id
        and businesses.owner_id = auth.uid()
    )
  )
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.businesses
      where businesses.id = daily_checkins.business_id
        and businesses.owner_id = auth.uid()
    )
  );

create policy daily_checkins_delete_own
  on public.daily_checkins
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- receivables
create policy receivables_select_own
  on public.receivables
  for select
  to authenticated
  using (owner_id = auth.uid());

create policy receivables_insert_own
  on public.receivables
  for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.businesses
      where businesses.id = receivables.business_id
        and businesses.owner_id = auth.uid()
    )
  );

create policy receivables_update_own
  on public.receivables
  for update
  to authenticated
  using (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.businesses
      where businesses.id = receivables.business_id
        and businesses.owner_id = auth.uid()
    )
  )
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.businesses
      where businesses.id = receivables.business_id
        and businesses.owner_id = auth.uid()
    )
  );

create policy receivables_delete_own
  on public.receivables
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- payables
create policy payables_select_own
  on public.payables
  for select
  to authenticated
  using (owner_id = auth.uid());

create policy payables_insert_own
  on public.payables
  for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.businesses
      where businesses.id = payables.business_id
        and businesses.owner_id = auth.uid()
    )
  );

create policy payables_update_own
  on public.payables
  for update
  to authenticated
  using (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.businesses
      where businesses.id = payables.business_id
        and businesses.owner_id = auth.uid()
    )
  )
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.businesses
      where businesses.id = payables.business_id
        and businesses.owner_id = auth.uid()
    )
  );

create policy payables_delete_own
  on public.payables
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- privileges: no anon / public access; authenticated only
-- ---------------------------------------------------------------------------
revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.businesses from public, anon, authenticated;
revoke all on table public.daily_checkins from public, anon, authenticated;
revoke all on table public.receivables from public, anon, authenticated;
revoke all on table public.payables from public, anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.businesses to authenticated;
grant select, insert, update, delete on table public.daily_checkins to authenticated;
grant select, insert, update, delete on table public.receivables to authenticated;
grant select, insert, update, delete on table public.payables to authenticated;
