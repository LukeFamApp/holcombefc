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
  -- consents
  photo_consent           boolean not null default false,
  coc_accepted_at         timestamptz not null default now(),
  created_at              timestamptz not null default now()
);

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
  id                    uuid primary key default gen_random_uuid(),
  registration_id       uuid not null references public.registrations(id) on delete cascade,
  amount_pence          integer,
  status                text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'not_required')),
  gocardless_mandate_id text, -- placeholder for future GoCardless integration
  created_at            timestamptz not null default now()
);

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

-- ---------------------------------------------------------------------------
-- Seed teams + fee plans (edit freely, or manage from /admin/teams once
-- you're an admin)
-- ---------------------------------------------------------------------------

insert into public.teams (name, age_group)
select 'Under 14s Blues', 'U14'
where not exists (select 1 from public.teams);

insert into public.fee_plans (team_id, name, annual_price_pence)
select t.id, plan.name, plan.price
from public.teams t
cross join (values
  ('Full Membership', 15000),
  ('Training Only',   10000)
) as plan(name, price)
where t.name = 'Under 14s Blues'
  and not exists (select 1 from public.fee_plans fp where fp.team_id = t.id);

-- ---------------------------------------------------------------------------
-- To make yourself admin after signing up, run (replace with your email):
--
--   update public.parents set is_admin = true where email = 'you@example.com';
-- ---------------------------------------------------------------------------
