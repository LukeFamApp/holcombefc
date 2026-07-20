-- Holcombe FC v1 schema
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Safe to re-run: uses "if not exists" / "or replace" where possible.
--
-- NOTE: if you already ran an earlier version of this file (before the
-- address/medical/consent fields were added to players), drop the old
-- tables first:
--   drop table if exists public.payments, public.registrations, public.fee_plans,
--     public.players, public.teams, public.parents cascade;
-- then run this file fresh. There's no production data yet, so this is safe.
-- (Re-run the "make yourself admin" update at the bottom afterwards.)

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.parents (
  id         uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name  text not null default '',
  email      text not null,
  phone      text,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  age_group  text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.fee_plans (
  id                 uuid primary key default gen_random_uuid(),
  team_id            uuid not null references public.teams(id) on delete cascade,
  name               text not null,           -- e.g. "Full Membership", "Training Only"
  annual_price_pence integer not null,
  -- number of monthly Direct Debit instalments offered (null = pay in full only)
  instalment_count   integer check (instalment_count is null or instalment_count between 2 and 12),
  created_at         timestamptz not null default now()
);

create table if not exists public.players (
  id                      uuid primary key default gen_random_uuid(),
  parent_id               uuid not null references public.parents(id) on delete cascade,
  first_name              text not null,
  last_name               text not null,
  date_of_birth           date not null,
  address_line1           text not null,
  address_line2           text,
  address_town            text not null,
  address_postcode        text not null,
  team_id                 uuid references public.teams(id) on delete set null,
  emergency_contact_name  text not null,
  emergency_contact_phone text not null,
  -- medical questionnaire: null means "none declared"
  medical_conditions      text,
  allergies               text,
  medications             text,
  heart_conditions        text,
  -- consents
  photo_consent           boolean not null default false,
  coc_accepted_at         timestamptz not null default now(),
  created_at              timestamptz not null default now()
);

-- The same child can only exist once per parent (guards against
-- double-submitted registration forms).
create unique index if not exists players_unique_child_per_parent
  on public.players (parent_id, lower(first_name), lower(last_name), date_of_birth);

create table if not exists public.registrations (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references public.players(id) on delete cascade,
  fee_plan_id  uuid references public.fee_plans(id) on delete set null,
  season       text not null,
  status       text not null default 'pending' check (status in ('pending', 'active', 'withdrawn')),
  created_at   timestamptz not null default now(),
  unique (player_id, season)
);

create table if not exists public.payments (
  id                            uuid primary key default gen_random_uuid(),
  registration_id               uuid not null references public.registrations(id) on delete cascade,
  amount_pence                  integer,
  -- pending = payment not set up yet; processing = Direct Debit authorised and
  -- collections underway; paid = fully collected
  status                        text not null default 'pending' check (status in ('pending', 'processing', 'paid', 'failed', 'not_required', 'cancelled')),
  method                        text check (method is null or method in ('full', 'monthly')),
  gocardless_mandate_id         text,
  gocardless_billing_request_id text,
  gocardless_payment_id         text,
  gocardless_subscription_id    text,
  created_at                    timestamptz not null default now()
);

-- Running ledger of individual Direct Debit collections, so payment history
-- and outstanding balances survive mandate cancellations/retries.
create table if not exists public.payment_collections (
  id                     uuid primary key default gen_random_uuid(),
  payment_id             uuid not null references public.payments(id) on delete cascade,
  gocardless_payment_id  text not null unique,
  amount_pence           integer not null,
  charge_date            date,
  status                 text not null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists payment_collections_payment_id_idx
  on public.payment_collections (payment_id);

-- Parent-initiated player removal requests: never auto-deletes, always goes
-- through an admin approval step.
create table if not exists public.player_removal_requests (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references public.players(id) on delete cascade,
  requested_by uuid not null references public.parents(id) on delete cascade,
  reason       text,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references public.parents(id)
);

create index if not exists player_removal_requests_player_id_idx
  on public.player_removal_requests (player_id);

-- ---------------------------------------------------------------------------
-- Auto-create a parent row whenever someone signs up via Supabase Auth
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.parents (id, first_name, last_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email,
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Only the auth trigger should ever invoke this — keep it off the REST API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin helper (security definer avoids recursive RLS on parents)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.parents where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.parents       enable row level security;
alter table public.teams         enable row level security;
alter table public.fee_plans     enable row level security;
alter table public.players       enable row level security;
alter table public.registrations enable row level security;
alter table public.payments      enable row level security;

-- parents: a parent can see/update their own row; admins can see everyone
drop policy if exists "parents_select_own_or_admin" on public.parents;
create policy "parents_select_own_or_admin" on public.parents
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "parents_update_own" on public.parents;
create policy "parents_update_own" on public.parents
  for update using (id = auth.uid()) with check (id = auth.uid());

-- teams: readable by anyone (needed for the registration form + public site),
-- writable only by admins
drop policy if exists "teams_select_all" on public.teams;
create policy "teams_select_all" on public.teams
  for select using (true);

drop policy if exists "teams_admin_manage" on public.teams;
create policy "teams_admin_manage" on public.teams
  for all using (public.is_admin()) with check (public.is_admin());

-- fee_plans: readable by anyone (needed for the registration form), writable
-- only by admins
drop policy if exists "fee_plans_select_all" on public.fee_plans;
create policy "fee_plans_select_all" on public.fee_plans
  for select using (true);

drop policy if exists "fee_plans_admin_manage" on public.fee_plans;
create policy "fee_plans_admin_manage" on public.fee_plans
  for all using (public.is_admin()) with check (public.is_admin());

-- players: a parent can manage their own children; admins can see everyone
drop policy if exists "players_select_own_or_admin" on public.players;
create policy "players_select_own_or_admin" on public.players
  for select using (parent_id = auth.uid() or public.is_admin());

drop policy if exists "players_insert_own" on public.players;
create policy "players_insert_own" on public.players
  for insert with check (parent_id = auth.uid());

drop policy if exists "players_update_own_or_admin" on public.players;
create policy "players_update_own_or_admin" on public.players
  for update using (parent_id = auth.uid() or public.is_admin());

-- Only admins can delete a player, and only ever via an approved removal
-- request (see player_removal_requests below) — never straight from a
-- parent action.
drop policy if exists "players_admin_delete" on public.players;
create policy "players_admin_delete" on public.players
  for delete using (public.is_admin());

-- registrations: a parent can create/view registrations for their own players;
-- only admins can change status (pending -> active/withdrawn)
drop policy if exists "registrations_select_own_or_admin" on public.registrations;
create policy "registrations_select_own_or_admin" on public.registrations
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.players p
      where p.id = registrations.player_id and p.parent_id = auth.uid()
    )
  );

drop policy if exists "registrations_insert_own" on public.registrations;
create policy "registrations_insert_own" on public.registrations
  for insert with check (
    exists (
      select 1 from public.players p
      where p.id = registrations.player_id and p.parent_id = auth.uid()
    )
  );

drop policy if exists "registrations_admin_update" on public.registrations;
create policy "registrations_admin_update" on public.registrations
  for update using (public.is_admin()) with check (public.is_admin());

-- payments: a parent can view (not edit) payments tied to their own players;
-- only admins manage payment records. Parents can also insert the initial
-- placeholder payment row for their own registration (status stays 'pending'
-- until an admin or a future GoCardless webhook updates it).
drop policy if exists "payments_select_own_or_admin" on public.payments;
create policy "payments_select_own_or_admin" on public.payments
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.registrations r
      join public.players p on p.id = r.player_id
      where r.id = payments.registration_id and p.parent_id = auth.uid()
    )
  );

drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own" on public.payments
  for insert with check (
    exists (
      select 1 from public.registrations r
      join public.players p on p.id = r.player_id
      where r.id = payments.registration_id and p.parent_id = auth.uid()
    )
  );

drop policy if exists "payments_admin_manage" on public.payments;
create policy "payments_admin_manage" on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

-- payment_collections: parents read their own; only the service role writes
alter table public.payment_collections enable row level security;

drop policy if exists "collections_select_own_or_admin" on public.payment_collections;
create policy "collections_select_own_or_admin" on public.payment_collections
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.payments pay
      join public.registrations r on r.id = pay.registration_id
      join public.players p on p.id = r.player_id
      where pay.id = payment_collections.payment_id and p.parent_id = auth.uid()
    )
  );

-- player_removal_requests: a parent can create/view requests for their own
-- children; only admins can resolve (approve/reject) them
alter table public.player_removal_requests enable row level security;

drop policy if exists "removal_requests_select_own_or_admin" on public.player_removal_requests;
create policy "removal_requests_select_own_or_admin" on public.player_removal_requests
  for select using (requested_by = auth.uid() or public.is_admin());

drop policy if exists "removal_requests_insert_own" on public.player_removal_requests;
create policy "removal_requests_insert_own" on public.player_removal_requests
  for insert with check (
    requested_by = auth.uid()
    and exists (
      select 1 from public.players p
      where p.id = player_id and p.parent_id = auth.uid()
    )
  );

drop policy if exists "removal_requests_admin_update" on public.player_removal_requests;
create policy "removal_requests_admin_update" on public.player_removal_requests
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed teams + fee plans (edit freely, or manage from /admin/teams once
-- you're an admin)
-- ---------------------------------------------------------------------------

insert into public.teams (name, age_group)
select 'Under 14s Blues', 'U14'
where not exists (select 1 from public.teams);

insert into public.fee_plans (team_id, name, annual_price_pence, instalment_count)
select t.id, plan.name, plan.price, plan.instalments
from public.teams t
cross join (values
  ('Full Membership', 15000, 6),
  ('Training Only',   10000, 4)
) as plan(name, price, instalments)
where t.name = 'Under 14s Blues'
  and not exists (select 1 from public.fee_plans fp where fp.team_id = t.id);

-- ---------------------------------------------------------------------------
-- To make yourself admin after signing up, run (replace with your email):
--
--   update public.parents set is_admin = true where email = 'you@example.com';
-- ---------------------------------------------------------------------------
