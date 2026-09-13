-- ════════════════════════════════════════════════════════════════════════════
--  BIJOUTERIE BEJAIA — SUPABASE SCHEMA
--  Part 1/6 : extensions, enums, identity, permission catalogue
--  Project : https://gnpcmmjhhgcwltkkkvgo.supabase.co
--
--  Run in order: 01_schema → 02_tables → 03_functions → 04_rls → 05_storage → 06_seed
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ─── ENUMS ──────────────────────────────────────────────────────────────────
do $enum$ begin create type app_role            as enum ('admin','worker');                                                    exception when duplicate_object then null; end $enum$;
do $enum$ begin create type app_language        as enum ('fr','ar');                                                           exception when duplicate_object then null; end $enum$;
do $enum$ begin create type payment_method      as enum ('cash','cassie_silver','cassie_gold','mixed');                        exception when duplicate_object then null; end $enum$;
do $enum$ begin create type worker_payment_type as enum ('monthly','daily');                                                   exception when duplicate_object then null; end $enum$;
do $enum$ begin create type command_status      as enum ('pending','finalized','paid');                                        exception when duplicate_object then null; end $enum$;
do $enum$ begin create type command_type        as enum ('reparation','industry');                                             exception when duplicate_object then null; end $enum$;
do $enum$ begin create type debt_direction      as enum ('given','taken');                                                     exception when duplicate_object then null; end $enum$;
do $enum$ begin create type debt_party_type     as enum ('supplier','client');                                                 exception when duplicate_object then null; end $enum$;
do $enum$ begin create type debt_pay_method     as enum ('cash','silver','gold','other');                                      exception when duplicate_object then null; end $enum$;
do $enum$ begin create type replacement_type    as enum ('exchange','buyback');                                                exception when duplicate_object then null; end $enum$;
do $enum$ begin create type pricing_mode        as enum ('perGram','alaPiece');                                                exception when duplicate_object then null; end $enum$;
do $enum$ begin create type item_pricing_mode   as enum ('weight','piece');                                                    exception when duplicate_object then null; end $enum$;
do $enum$ begin create type delivery_dest       as enum ('bureau','home');                                                     exception when duplicate_object then null; end $enum$;
do $enum$ begin create type web_order_status    as enum ('pending','accepted','in_delivery','delivered','finalized','cancelled'); exception when duplicate_object then null; end $enum$;
do $enum$ begin create type permission_kind     as enum ('interface','action');                                                exception when duplicate_object then null; end $enum$;

-- ─── PROFILES — one row per auth.users row ──────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text         not null,
  email       text         not null unique,
  role        app_role     not null default 'worker',
  language    app_language not null default 'fr',
  worker_id   text,                       -- links a worker login to its payroll row
  is_active   boolean      not null default true,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);
create index if not exists profiles_role_idx      on public.profiles(role);
create index if not exists profiles_worker_id_idx on public.profiles(worker_id);

-- ─── PERMISSION CATALOGUE ───────────────────────────────────────────────────
-- Every screen ("interface") and every mutating button ("action") the app
-- exposes is one row here. An admin ticks these per worker.
create table if not exists public.app_permissions (
  key         text primary key,           -- e.g. 'pos.view' / 'sales.create'
  kind        permission_kind not null,
  module      text not null,              -- the screen it belongs to
  label_fr    text not null,
  label_ar    text not null,
  sort_order  int  not null default 0
);
create index if not exists app_permissions_module_idx on public.app_permissions(module, kind);

-- Which permissions a given user holds. Admins bypass this table entirely.
create table if not exists public.user_permissions (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null references public.app_permissions(key) on delete cascade,
  granted        boolean not null default true,
  granted_by     uuid references public.profiles(id) on delete set null,
  granted_at     timestamptz not null default now(),
  primary key (user_id, permission_key)
);
create index if not exists user_permissions_user_idx on public.user_permissions(user_id);

-- Defaults handed to every newly created worker.
create table if not exists public.default_worker_permissions (
  permission_key text primary key references public.app_permissions(key) on delete cascade
);

-- ─── AUTH HELPERS (used by every RLS policy in 04_rls.sql) ──────────────────
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, auth as $fn$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$fn$;

create or replace function public.is_signed_in()
returns boolean language sql stable security definer set search_path = public, auth as $fn$
  select exists (select 1 from public.profiles where id = auth.uid() and is_active);
$fn$;

-- The single predicate every policy leans on: admins may do anything, workers
-- only what an admin ticked for them.
create or replace function public.has_perm(p_key text)
returns boolean language sql stable security definer set search_path = public, auth as $fn$
  select case
    when public.is_admin() then true
    else exists (
      select 1
      from public.user_permissions up
      join public.profiles p on p.id = up.user_id
      where up.user_id = auth.uid()
        and up.permission_key = p_key
        and up.granted
        and p.is_active
    )
  end;
$fn$;

-- Every permission key the caller holds — the app reads this once at sign-in.
create or replace function public.my_permissions()
returns table (key text, kind permission_kind, module text)
language sql stable security definer set search_path = public, auth as $fn$
  select ap.key, ap.kind, ap.module
  from public.app_permissions ap
  where public.is_admin()
     or exists (
       select 1 from public.user_permissions up
       where up.user_id = auth.uid() and up.permission_key = ap.key and up.granted
     );
$fn$;

grant execute on function public.is_admin()          to anon, authenticated;
grant execute on function public.is_signed_in()      to anon, authenticated;
grant execute on function public.has_perm(text)      to anon, authenticated;
grant execute on function public.my_permissions()    to anon, authenticated;

-- ─── updated_at trigger helper ──────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $fn$
begin new.updated_at = now(); return new; end $fn$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
