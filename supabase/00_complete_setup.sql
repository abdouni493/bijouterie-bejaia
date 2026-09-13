-- ════════════════════════════════════════════════════════════════════════════
--  BIJOUTERIE BEJAIA — COMPLETE DATABASE SETUP (all parts, in order)
--
--  Paste this whole file into the Supabase SQL editor and run it once:
--    https://supabase.com/dashboard/project/gnpcmmjhhgcwltkkkvgo/sql
--
--  It is idempotent — running it again is safe and will not lose data.
--
--  Contents
--    1. extensions, enums, profiles, permission catalogue, auth helpers
--    2. every business table and the relations between them
--    3. account-creation RPCs (first admin, worker accounts, permissions)
--    4. row level security for all tables
--    5. storage buckets for images
--    6. the 22 interfaces + every button action, and the base catalogue
-- ════════════════════════════════════════════════════════════════════════════





-- ###########################################################################
-- ###  FILE: 01_schema.sql
-- ###########################################################################

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


-- ###########################################################################
-- ###  FILE: 02_tables.sql
-- ###########################################################################

-- ════════════════════════════════════════════════════════════════════════════
--  BIJOUTERIE BEJAIA — Part 2/6 : business tables & relations
--
--  Primary keys are TEXT because the client generates human-readable ids
--  ("mt-1699…", "or", "argent"). Every id column defaults to a uuid so rows
--  inserted straight from SQL still work.
-- ════════════════════════════════════════════════════════════════════════════

-- ═══ CATALOGUE ══════════════════════════════════════════════════════════════

-- A metal family (Or, Argent, Platine…). Every stock type points at one.
create table if not exists public.metal_categories (
  id             text primary key default gen_random_uuid()::text,
  name           text    not null,
  name_ar        text    not null default '',
  color          text    not null default '#8FA0B4',
  calibres       text[]  not null default '{}',
  price_per_gram numeric(14,2) not null default 0,
  is_built_in    boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- A concrete article family, e.g. "Or 18k Italien".
create table if not exists public.metal_types (
  id                text primary key default gen_random_uuid()::text,
  name              text    not null,
  metal_category_id text    not null references public.metal_categories(id) on delete restrict,
  calibre           text    not null default '',
  initial_quantity  numeric(14,3) not null default 0,   -- grams, or pieces when is_ala_piece
  is_cassie         boolean not null default false,     -- scrap stock
  is_ala_piece      boolean not null default false,     -- counted in pieces, not grams
  shapes            jsonb   not null default '{}'::jsonb, -- { shapeName: weightOrCount }
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists metal_types_category_idx on public.metal_types(metal_category_id);

-- User-defined jewellery shapes (ring, necklace…) — referenced by name.
create table if not exists public.shapes (
  name       text primary key,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Purities usable across categories.
create table if not exists public.calibres (
  value      text primary key,
  created_at timestamptz not null default now()
);

-- ═══ PURCHASING ═════════════════════════════════════════════════════════════

create table if not exists public.suppliers (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  phone      text not null default '',
  address    text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists suppliers_name_idx on public.suppliers(lower(name));

create table if not exists public.purchase_invoices (
  id          text primary key default gen_random_uuid()::text,
  supplier_id text not null references public.suppliers(id) on delete restrict,
  date        timestamptz not null default now(),
  -- payment breakdown (scrap handed over as part of the settlement)
  pay_cash                      numeric(14,2) not null default 0,
  pay_cassie_silver_grams       numeric(14,3) not null default 0,
  pay_cassie_silver_price_gram  numeric(14,2) not null default 0,
  pay_cassie_gold_grams         numeric(14,3) not null default 0,
  pay_cassie_gold_price_gram    numeric(14,2) not null default 0,
  pay_cassie_silver_type_id     text references public.metal_types(id) on delete set null,
  pay_cassie_gold_type_id       text references public.metal_types(id) on delete set null,
  pay_total                     numeric(14,2) not null default 0,
  -- debt tracking
  is_debt     boolean not null default false,
  amount_paid numeric(14,2) not null default 0,
  remaining   numeric(14,2) not null default 0,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists purchase_invoices_supplier_idx on public.purchase_invoices(supplier_id);
create index if not exists purchase_invoices_date_idx     on public.purchase_invoices(date desc);
create index if not exists purchase_invoices_debt_idx     on public.purchase_invoices(supplier_id) where is_debt;

create table if not exists public.purchase_invoice_items (
  id                  bigserial primary key,
  purchase_invoice_id text not null references public.purchase_invoices(id) on delete cascade,
  metal_type_id       text not null references public.metal_types(id) on delete restrict,
  shape               text references public.shapes(name) on delete set null,
  weight              numeric(14,3) not null default 0,
  price_per_gram      numeric(14,2) not null default 0,
  labor_cost_per_gram numeric(14,2) not null default 0,
  total_price         numeric(14,2) not null default 0,
  pricing_mode        item_pricing_mode not null default 'weight',
  quantity            integer not null default 0,
  price_per_piece     numeric(14,2) not null default 0,
  line_no             integer not null default 0
);
create index if not exists purchase_items_invoice_idx on public.purchase_invoice_items(purchase_invoice_id);

-- Scrap bought over the counter from walk-in clients.
create table if not exists public.cassie_purchases (
  id            text primary key default gen_random_uuid()::text,
  client_name   text not null,
  client_phone  text not null default '',
  metal_type_id text not null references public.metal_types(id) on delete restrict,
  weight        numeric(14,3) not null default 0,
  total_price   numeric(14,2) not null default 0,
  date          timestamptz not null default now(),
  is_melted     boolean not null default false,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists cassie_purchases_type_idx   on public.cassie_purchases(metal_type_id);
create index if not exists cassie_purchases_melted_idx on public.cassie_purchases(is_melted);

create table if not exists public.melting_records (
  id                   text primary key default gen_random_uuid()::text,
  date                 timestamptz not null default now(),
  loss                 numeric(14,3) not null default 0,
  total_pre_weight     numeric(14,3) not null default 0,
  post_weight          numeric(14,3) not null default 0,
  total_price          numeric(14,2) not null default 0,
  price_per_gram_after numeric(14,2) not null default 0,
  target_metal_type_id text not null references public.metal_types(id) on delete restrict,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Which scrap purchases went into a melt (many-to-many).
create table if not exists public.melting_record_purchases (
  melting_record_id  text not null references public.melting_records(id) on delete cascade,
  cassie_purchase_id text not null references public.cassie_purchases(id) on delete cascade,
  primary key (melting_record_id, cassie_purchase_id)
);

-- ═══ SALES ══════════════════════════════════════════════════════════════════

create table if not exists public.workers (
  id           text primary key default gen_random_uuid()::text,
  full_name    text not null,
  phone        text not null default '',
  address      text not null default '',
  payment_type worker_payment_type not null default 'monthly',
  salary       numeric(14,2) not null default 0,
  username     text not null,
  email        text,                        -- the auth.users email for this worker
  user_id      uuid references public.profiles(id) on delete set null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index if not exists workers_username_uidx on public.workers(lower(username));
create index if not exists workers_user_idx on public.workers(user_id);

-- profiles.worker_id points back at workers.id (declared here, after workers exists)
do $fk$ begin
  alter table public.profiles
    add constraint profiles_worker_fk foreign key (worker_id)
    references public.workers(id) on delete set null;
exception when duplicate_object then null; end $fk$;

create table if not exists public.clients (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  phone      text not null default '',
  note       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists clients_name_idx on public.clients(lower(name));

create table if not exists public.client_payments (
  id         text primary key default gen_random_uuid()::text,
  client_id  text not null references public.clients(id) on delete cascade,
  amount     numeric(14,2) not null default 0,
  date       timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists client_payments_client_idx on public.client_payments(client_id);

create table if not exists public.client_recuperations (
  id         text primary key default gen_random_uuid()::text,
  client_id  text not null references public.clients(id) on delete cascade,
  amount     numeric(14,2) not null default 0,
  date       timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists client_recuperations_client_idx on public.client_recuperations(client_id);

create table if not exists public.sale_invoices (
  id           text primary key default gen_random_uuid()::text,
  date         timestamptz not null default now(),
  worker_id    text references public.workers(id) on delete set null,
  client_name  text not null default '',
  client_phone text not null default '',
  is_debt      boolean not null default false,
  amount_paid  numeric(14,2) not null default 0,
  remaining    numeric(14,2) not null default 0,
  total        numeric(14,2) not null default 0,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists sale_invoices_worker_idx on public.sale_invoices(worker_id);
create index if not exists sale_invoices_date_idx   on public.sale_invoices(date desc);
create index if not exists sale_invoices_author_idx on public.sale_invoices(created_by);

create table if not exists public.sale_invoice_items (
  id              bigserial primary key,
  sale_invoice_id text not null references public.sale_invoices(id) on delete cascade,
  metal_type_id   text not null references public.metal_types(id) on delete restrict,
  shape           text references public.shapes(name) on delete set null,
  weight          numeric(14,3) not null default 0,
  price_per_gram  numeric(14,2) not null default 0,
  total_price     numeric(14,2) not null default 0,
  is_ala_piece    boolean not null default false,
  quantity        integer not null default 0,
  price_per_piece numeric(14,2) not null default 0,
  line_no         integer not null default 0
);
create index if not exists sale_items_invoice_idx on public.sale_invoice_items(sale_invoice_id);

-- Exchange / buy-back tickets. One returned item, optionally one new item.
create table if not exists public.replacement_invoices (
  id           text primary key default gen_random_uuid()::text,
  date         timestamptz not null default now(),
  type         replacement_type not null,
  worker_id    text references public.workers(id) on delete set null,
  client_name  text not null default '',
  client_phone text not null default '',
  -- returned item
  ret_metal_type_id  text not null references public.metal_types(id) on delete restrict,
  ret_shape          text references public.shapes(name) on delete set null,
  ret_weight         numeric(14,3) not null default 0,
  ret_price_per_gram numeric(14,2) not null default 0,
  ret_total_price    numeric(14,2) not null default 0,
  -- new item (exchange only)
  new_metal_type_id  text references public.metal_types(id) on delete restrict,
  new_shape          text references public.shapes(name) on delete set null,
  new_weight         numeric(14,3),
  new_price_per_gram numeric(14,2),
  new_total_price    numeric(14,2),
  -- settlement
  buy_back_price_per_gram numeric(14,2),
  amount_difference       numeric(14,2) not null default 0,
  amount_to_pay           numeric(14,2) not null default 0,
  amount_to_refund        numeric(14,2) not null default 0,
  note                    text not null default '',
  delivery_id             text,
  delivery_price          numeric(14,2),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists replacements_date_idx   on public.replacement_invoices(date desc);
create index if not exists replacements_worker_idx on public.replacement_invoices(worker_id);

-- ═══ WORKSHOP / OPERATIONS ══════════════════════════════════════════════════

create table if not exists public.workshops (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  phone      text not null default '',
  address    text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deliveries (
  id           text primary key default gen_random_uuid()::text,
  full_name    text not null,
  phone        text not null default '',
  created_date timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.delivery_payments (
  id          text primary key default gen_random_uuid()::text,
  delivery_id text not null references public.deliveries(id) on delete cascade,
  amount      numeric(14,2) not null default 0,
  date        timestamptz not null default now(),
  method      payment_method not null default 'cash',
  created_at  timestamptz not null default now()
);
create index if not exists delivery_payments_delivery_idx on public.delivery_payments(delivery_id);

-- replacement_invoices.delivery_id declared now that deliveries exists
do $fk$ begin
  alter table public.replacement_invoices
    add constraint replacements_delivery_fk foreign key (delivery_id)
    references public.deliveries(id) on delete set null;
exception when duplicate_object then null; end $fk$;

create table if not exists public.commands (
  id             text primary key default gen_random_uuid()::text,
  type           command_type not null,
  client_name    text not null,
  client_phone   text not null default '',
  metal          text not null default '',
  calibre        text not null default '',
  initial_weight numeric(14,3) not null default 0,
  workshop_id    text not null references public.workshops(id) on delete restrict,
  date           timestamptz not null default now(),
  status         command_status not null default 'pending',
  shape          text references public.shapes(name) on delete set null,
  paid_amount    numeric(14,2) not null default 0,
  note           text not null default '',
  -- how the workshop gets paid
  payment_method        text,     -- 'money' | 'cassie'
  cassie_type_id        text references public.metal_types(id) on delete set null,
  workshop_cassie_amount numeric(14,3),
  -- finalisation
  final_weight   numeric(14,3),
  workshop_price numeric(14,2),
  client_price   numeric(14,2),
  price_per_gram numeric(14,2),
  end_date       timestamptz,
  -- delivery association
  delivery_id    text references public.deliveries(id) on delete set null,
  delivery_price numeric(14,2),
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists commands_workshop_idx on public.commands(workshop_id);
create index if not exists commands_status_idx   on public.commands(status);
create index if not exists commands_date_idx     on public.commands(date desc);

-- ═══ PAYROLL ════════════════════════════════════════════════════════════════

create table if not exists public.worker_advances (
  id         text primary key default gen_random_uuid()::text,
  worker_id  text not null references public.workers(id) on delete cascade,
  amount     numeric(14,2) not null default 0,
  date       timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists worker_advances_worker_idx on public.worker_advances(worker_id);

create table if not exists public.worker_absences (
  id         text primary key default gen_random_uuid()::text,
  worker_id  text not null references public.workers(id) on delete cascade,
  deduction  numeric(14,2) not null default 0,
  date       timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists worker_absences_worker_idx on public.worker_absences(worker_id);

create table if not exists public.worker_payments (
  id         text primary key default gen_random_uuid()::text,
  worker_id  text not null references public.workers(id) on delete cascade,
  amount     numeric(14,2) not null default 0,
  date       timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists worker_payments_worker_idx on public.worker_payments(worker_id);

-- ═══ FINANCE ════════════════════════════════════════════════════════════════

create table if not exists public.store_expenses (
  id           text primary key default gen_random_uuid()::text,
  expense_name text not null,
  price        numeric(14,2) not null default 0,
  date         timestamptz not null default now(),
  note         text not null default '',
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists store_expenses_date_idx on public.store_expenses(date desc);

-- Free-standing debts (money lent to / borrowed from a person).
create table if not exists public.debts (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  direction   debt_direction not null,
  amount      numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  remaining   numeric(14,2) not null default 0,
  note        text not null default '',
  is_paid     boolean not null default false,
  date        timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists debts_direction_idx on public.debts(direction);
create index if not exists debts_open_idx      on public.debts(is_paid);

-- Ledger of payments settling supplier invoices or client credit.
create table if not exists public.debt_payments (
  id              text primary key default gen_random_uuid()::text,
  party_type      debt_party_type not null,
  party_id        text not null,              -- suppliers.id or clients.id
  party_name      text not null default '',
  amount          numeric(14,2) not null default 0,
  date            timestamptz not null default now(),
  method          debt_pay_method not null default 'cash',
  -- metal settlement details
  metal_type_id   text references public.metal_types(id) on delete set null,
  metal_type_name text,
  price_per_gram  numeric(14,2),
  weight          numeric(14,3),
  invoice_id      text references public.purchase_invoices(id) on delete set null,
  note            text not null default '',
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists debt_payments_party_idx on public.debt_payments(party_type, party_id);
create index if not exists debt_payments_date_idx  on public.debt_payments(date desc);

-- How one payment was spread across a supplier's open invoices.
create table if not exists public.debt_payment_allocations (
  id              bigserial primary key,
  debt_payment_id text not null references public.debt_payments(id) on delete cascade,
  invoice_id      text not null references public.purchase_invoices(id) on delete cascade,
  amount          numeric(14,2) not null default 0
);
create index if not exists debt_alloc_payment_idx on public.debt_payment_allocations(debt_payment_id);
create index if not exists debt_alloc_invoice_idx on public.debt_payment_allocations(invoice_id);

-- ═══ SETTINGS (singletons, id is always 1) ══════════════════════════════════

create table if not exists public.store_settings (
  id             smallint primary key default 1 check (id = 1),
  logo           text,                -- public URL in the `store-logos` bucket
  store_name     text not null default 'Bijouterie',
  slogan         text not null default '',
  contact        text not null default '',
  phone          text not null default '',
  address        text not null default '',
  minimal_weight numeric(14,3) not null default 0,
  -- the whole landing-page copy block (web*Fr / web*Ar keys) lives here
  website_content jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now()
);

create table if not exists public.web_contacts (
  id        smallint primary key default 1 check (id = 1),
  facebook  text, instagram text, tiktok text, snapchat text,
  whatsapp  text, telegram  text, email  text, phone    text,
  address   text,
  updated_at timestamptz not null default now()
);

-- ═══ ONLINE SHOP ════════════════════════════════════════════════════════════

create table if not exists public.web_offers (
  id             text primary key default gen_random_uuid()::text,
  name           text not null,
  image          text,                -- public URL in the `product-images` bucket
  metal_type_id  text references public.metal_types(id) on delete set null,
  calibre        text not null default '',
  form           text references public.shapes(name) on delete set null,
  pricing_mode   pricing_mode not null default 'perGram',
  weight         numeric(14,3),
  price_per_gram numeric(14,2),
  total_price    numeric(14,2) not null default 0,
  unit_price     numeric(14,2),
  show_quantity  boolean not null default false,
  quantity       integer,
  show_weight    boolean not null default true,
  is_hidden      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists web_offers_visible_idx on public.web_offers(is_hidden);

create table if not exists public.web_special_offers (
  id             text primary key default gen_random_uuid()::text,
  name           text not null,
  image          text,
  metal_type_id  text references public.metal_types(id) on delete set null,
  calibre        text not null default '',
  form           text references public.shapes(name) on delete set null,
  pricing_mode   pricing_mode not null default 'perGram',
  weight         numeric(14,3),
  price_per_gram numeric(14,2),
  original_price numeric(14,2) not null default 0,
  special_price  numeric(14,2) not null default 0,
  unit_price     numeric(14,2),
  show_quantity  boolean not null default false,
  quantity       integer,
  show_weight    boolean not null default true,
  is_hidden      boolean not null default false,
  is_active      boolean not null default true,
  start_date     date,
  start_hour     text not null default '00:00',
  end_date       date,
  end_hour       text not null default '23:59',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists web_special_offers_active_idx on public.web_special_offers(is_active, is_hidden);

create table if not exists public.web_delivery_companies (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  phone      text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Per-wilaya tariff for one delivery company.
create table if not exists public.web_delivery_wilayas (
  id                  bigserial primary key,
  delivery_company_id text not null references public.web_delivery_companies(id) on delete cascade,
  wilaya_code         integer not null,
  wilaya_name         text    not null,
  communes            text[]  not null default '{}',
  to_bureau           numeric(14,2) not null default 0,
  to_home             numeric(14,2) not null default 0,
  unique (delivery_company_id, wilaya_code)
);
create index if not exists web_delivery_wilayas_company_idx on public.web_delivery_wilayas(delivery_company_id);

create table if not exists public.web_orders (
  id                  text primary key default gen_random_uuid()::text,
  order_number        text not null unique,
  created_at          timestamptz not null default now(),
  status              web_order_status not null default 'pending',
  client_full_name    text not null,
  client_phone        text not null,
  client_email        text,
  wilaya_code         integer not null default 0,
  wilaya_name         text not null default '',
  commune             text not null default '',
  address             text not null default '',
  delivery_company_id text references public.web_delivery_companies(id) on delete set null,
  delivery_type       delivery_dest not null default 'home',
  delivery_price      numeric(14,2) not null default 0,
  subtotal            numeric(14,2) not null default 0,
  total               numeric(14,2) not null default 0,
  is_personalized     boolean not null default false,
  -- personalised-order brief
  pers_metal_type text, pers_calibre text, pers_form text,
  pers_max_grams  numeric(14,3), pers_notes text,
  finalized_at     timestamptz,
  storage_deducted boolean not null default false,
  cancelled_at     timestamptz,
  updated_at       timestamptz not null default now()
);
create index if not exists web_orders_status_idx on public.web_orders(status);
create index if not exists web_orders_date_idx   on public.web_orders(created_at desc);

create table if not exists public.web_order_items (
  id               bigserial primary key,
  web_order_id     text not null references public.web_orders(id) on delete cascade,
  offer_id         text references public.web_offers(id) on delete set null,
  special_offer_id text references public.web_special_offers(id) on delete set null,
  name             text not null,
  image            text,
  quantity         integer not null default 1,
  unit_price       numeric(14,2) not null default 0,
  total_price      numeric(14,2) not null default 0,
  metal_type_id    text references public.metal_types(id) on delete set null,
  calibre          text,
  form             text,
  weight           numeric(14,3),
  size             text,
  line_no          integer not null default 0
);
create index if not exists web_order_items_order_idx on public.web_order_items(web_order_id);

-- ─── updated_at triggers on every mutable table ─────────────────────────────
do $trg$
declare t text;
begin
  foreach t in array array[
    'metal_categories','metal_types','suppliers','purchase_invoices','cassie_purchases',
    'melting_records','workers','clients','sale_invoices','replacement_invoices',
    'workshops','deliveries','commands','store_expenses','debts','debt_payments',
    'web_offers','web_special_offers','web_delivery_companies','web_orders'
  ]
  loop
    execute format(
      'drop trigger if exists %I on public.%I; create trigger %I before update on public.%I
         for each row execute function public.touch_updated_at();',
      t || '_touch', t, t || '_touch', t);
  end loop;
end $trg$;


-- ###########################################################################
-- ###  FILE: 03_functions.sql
-- ###########################################################################

-- ════════════════════════════════════════════════════════════════════════════
--  BIJOUTERIE BEJAIA — Part 3/6 : account creation & permission RPCs
--
--  These run as SECURITY DEFINER so the client never needs the service-role
--  key. Accounts are created directly in auth.users, which means the admin and
--  every worker sign in through normal Supabase email/password auth.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Does the shop already have an administrator? ───────────────────────────
-- The login screen calls this to decide whether to show "Créer un compte
-- administrateur". Callable while signed out, and it leaks nothing but a bool.
create or replace function public.admin_exists()
returns boolean
language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from public.profiles where role = 'admin');
$fn$;

grant execute on function public.admin_exists() to anon, authenticated;

-- ─── Low-level: create a row in auth.users + auth.identities ────────────────
-- Shared by bootstrap_admin and create_worker_account. Never exposed directly.
create or replace function public.create_auth_user(
  p_email    text,
  p_password text,
  p_username text
) returns uuid
language plpgsql security definer set search_path = public, auth, extensions as $fn$
declare
  v_uid   uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
begin
  if v_email is null or v_email = '' then
    raise exception 'EMAIL_REQUIRED' using hint = 'An email address is required.';
  end if;
  if p_password is null or length(p_password) < 6 then
    raise exception 'PASSWORD_TOO_SHORT' using hint = 'Password must be at least 6 characters.';
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'EMAIL_ALREADY_EXISTS' using hint = 'That email is already registered.';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    is_super_admin, is_sso_user
  ) values (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
    v_email, extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('username', p_username),
    '', '', '', '',
    false, false
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_uid, v_uid::text,
    jsonb_build_object(
      'sub', v_uid::text, 'email', v_email,
      'email_verified', true, 'phone_verified', false
    ),
    'email', now(), now(), now()
  );

  return v_uid;
end $fn$;

revoke all on function public.create_auth_user(text,text,text) from anon, authenticated;

-- ─── Create the FIRST administrator ─────────────────────────────────────────
-- Callable while signed out — but only ever once. The moment an admin profile
-- exists this raises, which is exactly what makes the login-screen button
-- disappear for good (the UI hides it, and the server refuses anyway).
create or replace function public.bootstrap_admin(
  p_email    text,
  p_password text,
  p_username text default 'Administrateur'
) returns jsonb
language plpgsql security definer set search_path = public, auth as $fn$
declare v_uid uuid;
begin
  if exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'ADMIN_ALREADY_EXISTS'
      using hint = 'An administrator account has already been created for this shop.';
  end if;

  v_uid := public.create_auth_user(p_email, p_password, coalesce(nullif(trim(p_username),''), 'Administrateur'));

  insert into public.profiles (id, username, email, role, language)
  values (v_uid, coalesce(nullif(trim(p_username),''), 'Administrateur'), lower(trim(p_email)), 'admin', 'fr');

  -- An administrator holds every permission, always.
  insert into public.user_permissions (user_id, permission_key, granted, granted_by)
  select v_uid, key, true, v_uid from public.app_permissions
  on conflict do nothing;

  return jsonb_build_object('user_id', v_uid, 'email', lower(trim(p_email)), 'role', 'admin');
end $fn$;

grant execute on function public.bootstrap_admin(text,text,text) to anon, authenticated;

-- ─── Create a worker login (admin only) ─────────────────────────────────────
-- Creates the auth user, the profile, the payroll row, and the tick-list of
-- permissions the admin chose. p_permissions is an array of app_permissions.key.
create or replace function public.create_worker_account(
  p_email        text,
  p_password     text,
  p_full_name    text,
  p_phone        text default '',
  p_address      text default '',
  p_payment_type worker_payment_type default 'monthly',
  p_salary       numeric default 0,
  p_username     text default null,
  p_permissions  text[] default null,
  p_worker_id    text default null
) returns jsonb
language plpgsql security definer set search_path = public, auth as $fn$
declare
  v_uid       uuid;
  v_worker_id text := coalesce(nullif(p_worker_id,''), 'wk-' || replace(gen_random_uuid()::text,'-',''));
  v_username  text := coalesce(nullif(trim(p_username),''), split_part(lower(trim(p_email)),'@',1));
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED' using hint = 'Only an administrator may create staff accounts.';
  end if;

  v_uid := public.create_auth_user(p_email, p_password, p_full_name);

  insert into public.profiles (id, username, email, role, language, worker_id)
  values (v_uid, p_full_name, lower(trim(p_email)), 'worker', 'fr', v_worker_id);

  insert into public.workers (
    id, full_name, phone, address, payment_type, salary, username, email, user_id
  ) values (
    v_worker_id, p_full_name, coalesce(p_phone,''), coalesce(p_address,''),
    coalesce(p_payment_type,'monthly'), coalesce(p_salary,0),
    v_username, lower(trim(p_email)), v_uid
  );

  -- Explicit list when given, otherwise the configured defaults.
  if p_permissions is not null and array_length(p_permissions,1) > 0 then
    insert into public.user_permissions (user_id, permission_key, granted, granted_by)
    select v_uid, k, true, auth.uid()
    from unnest(p_permissions) as k
    where exists (select 1 from public.app_permissions where key = k)
    on conflict (user_id, permission_key) do update set granted = true;
  else
    insert into public.user_permissions (user_id, permission_key, granted, granted_by)
    select v_uid, permission_key, true, auth.uid() from public.default_worker_permissions
    on conflict do nothing;
  end if;

  return jsonb_build_object('user_id', v_uid, 'worker_id', v_worker_id, 'email', lower(trim(p_email)));
end $fn$;

grant execute on function public.create_worker_account(text,text,text,text,text,worker_payment_type,numeric,text,text[],text) to authenticated;

-- ─── Replace a worker's permission set (admin only) ─────────────────────────
-- Anything not in p_permissions is revoked, so the admin's tick-list is the
-- single source of truth for what that worker can see and press.
create or replace function public.set_user_permissions(
  p_user_id     uuid,
  p_permissions text[]
) returns integer
language plpgsql security definer set search_path = public, auth as $fn$
declare v_count integer;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED' using hint = 'Only an administrator may change permissions.';
  end if;
  if exists (select 1 from public.profiles where id = p_user_id and role = 'admin') then
    raise exception 'CANNOT_RESTRICT_ADMIN' using hint = 'Administrators always hold every permission.';
  end if;

  delete from public.user_permissions
  where user_id = p_user_id
    and permission_key <> all (coalesce(p_permissions, '{}'::text[]));

  insert into public.user_permissions (user_id, permission_key, granted, granted_by)
  select p_user_id, k, true, auth.uid()
  from unnest(coalesce(p_permissions,'{}'::text[])) as k
  where exists (select 1 from public.app_permissions where key = k)
  on conflict (user_id, permission_key) do update set granted = true, granted_by = auth.uid(), granted_at = now();

  select count(*) into v_count from public.user_permissions where user_id = p_user_id and granted;
  return v_count;
end $fn$;

grant execute on function public.set_user_permissions(uuid, text[]) to authenticated;

-- ─── Reset a worker's password (admin only) ─────────────────────────────────
create or replace function public.set_worker_password(
  p_user_id  uuid,
  p_password text
) returns boolean
language plpgsql security definer set search_path = public, auth, extensions as $fn$
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED' using hint = 'Only an administrator may reset passwords.';
  end if;
  if p_password is null or length(p_password) < 6 then
    raise exception 'PASSWORD_TOO_SHORT';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = p_user_id;

  return found;
end $fn$;

grant execute on function public.set_worker_password(uuid, text) to authenticated;

-- ─── Delete a worker account entirely (admin only) ──────────────────────────
create or replace function public.delete_worker_account(p_worker_id text)
returns boolean
language plpgsql security definer set search_path = public, auth as $fn$
declare v_uid uuid;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select user_id into v_uid from public.workers where id = p_worker_id;
  delete from public.workers where id = p_worker_id;
  if v_uid is not null then
    delete from auth.users where id = v_uid;   -- cascades to profiles + permissions
  end if;
  return true;
end $fn$;

grant execute on function public.delete_worker_account(text) to authenticated;

-- ─── Staff directory for the Workers screen (admin only) ────────────────────
create or replace function public.list_staff()
returns table (
  user_id uuid, worker_id text, full_name text, email text,
  role app_role, is_active boolean, permissions text[]
)
language sql stable security definer set search_path = public, auth as $fn$
  select p.id, p.worker_id, p.username, p.email, p.role, p.is_active,
         coalesce(array_agg(up.permission_key) filter (where up.granted), '{}') as permissions
  from public.profiles p
  left join public.user_permissions up on up.user_id = p.id
  where public.is_admin()
  group by p.id;
$fn$;

grant execute on function public.list_staff() to authenticated;


-- ###########################################################################
-- ###  FILE: 04_rls.sql
-- ###########################################################################

-- ════════════════════════════════════════════════════════════════════════════
--  BIJOUTERIE BEJAIA — Part 4/6 : row level security
--
--  Rule of the house:
--    • an admin may do everything;
--    • a worker may only read a table whose screen they were granted
--      (`<module>.view`) and only write when granted the matching action
--      (`<module>.create` / `.edit` / `.delete`);
--    • the public storefront (anon) may read published offers and place orders.
--
--  Because the UI and the database read the SAME permission keys, hiding a
--  button in the sidebar and refusing the write in Postgres can never drift.
-- ════════════════════════════════════════════════════════════════════════════

-- Which payroll row is the caller? (used by "Mes Paiements")
create or replace function public.my_worker_id()
returns text language sql stable security definer set search_path = public, auth as $fn$
  select worker_id from public.profiles where id = auth.uid();
$fn$;
grant execute on function public.my_worker_id() to authenticated;

-- ─── Policy generator ───────────────────────────────────────────────────────
-- Builds the four standard policies for a table from one module name, so the
-- 40-odd tables below stay consistent and auditable.
create or replace function public.apply_module_policies(
  p_table      text,
  p_module     text,
  p_read_all   boolean default false   -- true = any signed-in user may read
) returns void
language plpgsql as $fn$
declare
  v_read text := case when p_read_all
                 then 'public.is_signed_in()'
                 else format('public.has_perm(%L)', p_module || '.view') end;
begin
  execute format('alter table public.%I enable row level security', p_table);

  execute format('drop policy if exists %I on public.%I', p_table || '_select', p_table);
  execute format('drop policy if exists %I on public.%I', p_table || '_insert', p_table);
  execute format('drop policy if exists %I on public.%I', p_table || '_update', p_table);
  execute format('drop policy if exists %I on public.%I', p_table || '_delete', p_table);

  execute format('create policy %I on public.%I for select to authenticated using (%s)',
                 p_table || '_select', p_table, v_read);
  execute format('create policy %I on public.%I for insert to authenticated with check (public.has_perm(%L))',
                 p_table || '_insert', p_table, p_module || '.create');
  execute format('create policy %I on public.%I for update to authenticated using (public.has_perm(%L)) with check (public.has_perm(%L))',
                 p_table || '_update', p_table, p_module || '.edit', p_module || '.edit');
  execute format('create policy %I on public.%I for delete to authenticated using (public.has_perm(%L))',
                 p_table || '_delete', p_table, p_module || '.delete');
end $fn$;

-- ═══ IDENTITY & PERMISSIONS ═════════════════════════════════════════════════

alter table public.profiles                  enable row level security;
alter table public.app_permissions            enable row level security;
alter table public.user_permissions           enable row level security;
alter table public.default_worker_permissions enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles for insert to authenticated
  with check (public.is_admin());

drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete on public.profiles for delete to authenticated
  using (public.is_admin());

-- The catalogue of permissions is readable by everyone signed in (the Workers
-- screen renders the tick-list from it) but only the admin may change it.
drop policy if exists app_permissions_select on public.app_permissions;
create policy app_permissions_select on public.app_permissions for select to authenticated using (true);

drop policy if exists app_permissions_admin on public.app_permissions;
create policy app_permissions_admin on public.app_permissions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists user_permissions_select on public.user_permissions;
create policy user_permissions_select on public.user_permissions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists user_permissions_admin on public.user_permissions;
create policy user_permissions_admin on public.user_permissions for all to authenticated
  using (public.has_perm('workers.permissions.manage'))
  with check (public.has_perm('workers.permissions.manage'));

drop policy if exists default_perms_select on public.default_worker_permissions;
create policy default_perms_select on public.default_worker_permissions for select to authenticated using (true);

drop policy if exists default_perms_admin on public.default_worker_permissions;
create policy default_perms_admin on public.default_worker_permissions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ═══ CATALOGUE (reference data — readable by any signed-in user) ════════════

select public.apply_module_policies('metal_categories', 'catalogue', true);
select public.apply_module_policies('metal_types',      'catalogue', true);
select public.apply_module_policies('shapes',           'catalogue', true);
select public.apply_module_policies('calibres',         'catalogue', true);

-- The Inventory screen edits stock quantities directly on metal_types, so it
-- gets its own update path alongside the catalogue one.
drop policy if exists metal_types_inventory_update on public.metal_types;
create policy metal_types_inventory_update on public.metal_types for update to authenticated
  using (public.has_perm('inventory.adjust')) with check (public.has_perm('inventory.adjust'));

-- Selling, buying and melting all move stock, so those screens may write it too.
drop policy if exists metal_types_stock_update on public.metal_types;
create policy metal_types_stock_update on public.metal_types for update to authenticated
  using (
    public.has_perm('pos.create')             or public.has_perm('purchases.create')
    or public.has_perm('purchases.edit')      or public.has_perm('purchases.delete')
    or public.has_perm('sellingInvoices.edit')or public.has_perm('sellingInvoices.delete')
    or public.has_perm('cassiePurchases.create') or public.has_perm('cassiePurchases.edit')
    or public.has_perm('cassiePurchases.delete') or public.has_perm('cassiePurchases.melt')
    or public.has_perm('replacements.create') or public.has_perm('replacements.edit')
    or public.has_perm('replacements.delete') or public.has_perm('commands.create')
    or public.has_perm('websiteOrders.finalize') or public.has_perm('websiteOrders.cancel')
  )
  with check (true);

-- ═══ PURCHASING ═════════════════════════════════════════════════════════════

select public.apply_module_policies('suppliers',              'suppliers');
select public.apply_module_policies('purchase_invoices',      'purchases');
select public.apply_module_policies('purchase_invoice_items', 'purchases');
select public.apply_module_policies('cassie_purchases',       'cassiePurchases');

-- Melting is its own action inside the Cassie screen.
alter table public.melting_records          enable row level security;
alter table public.melting_record_purchases enable row level security;

drop policy if exists melting_select on public.melting_records;
create policy melting_select on public.melting_records for select to authenticated
  using (public.has_perm('cassiePurchases.view'));

drop policy if exists melting_insert on public.melting_records;
create policy melting_insert on public.melting_records for insert to authenticated
  with check (public.has_perm('cassiePurchases.melt'));

drop policy if exists melting_update on public.melting_records;
create policy melting_update on public.melting_records for update to authenticated
  using (public.has_perm('cassiePurchases.melt.edit')) with check (public.has_perm('cassiePurchases.melt.edit'));

drop policy if exists melting_delete on public.melting_records;
create policy melting_delete on public.melting_records for delete to authenticated
  using (public.has_perm('cassiePurchases.melt.delete'));

drop policy if exists melting_link_select on public.melting_record_purchases;
create policy melting_link_select on public.melting_record_purchases for select to authenticated
  using (public.has_perm('cassiePurchases.view'));

drop policy if exists melting_link_write on public.melting_record_purchases;
create policy melting_link_write on public.melting_record_purchases for all to authenticated
  using (public.has_perm('cassiePurchases.melt') or public.has_perm('cassiePurchases.melt.edit') or public.has_perm('cassiePurchases.melt.delete'))
  with check (public.has_perm('cassiePurchases.melt') or public.has_perm('cassiePurchases.melt.edit'));

-- Supplier debt settlement is driven from the Fournisseurs screen.
drop policy if exists purchase_invoices_settle on public.purchase_invoices;
create policy purchase_invoices_settle on public.purchase_invoices for update to authenticated
  using (public.has_perm('debts.pay') or public.has_perm('debts.payment.edit') or public.has_perm('debts.payment.delete'))
  with check (true);

-- ═══ SALES ══════════════════════════════════════════════════════════════════

select public.apply_module_policies('clients', 'clients');

-- A client's versements and récupérations have their own buttons on that
-- screen, so they answer to their own permissions rather than `clients.create`.
do $client_ledger$
declare rec record;
begin
  for rec in
    select * from (values
      ('client_payments',      'clients.payment'),
      ('client_recuperations', 'clients.recuperation')
    ) as v(tbl, perm)
  loop
    execute format('alter table public.%I enable row level security', rec.tbl);

    execute format('drop policy if exists %I on public.%I', rec.tbl || '_select', rec.tbl);
    execute format('create policy %I on public.%I for select to authenticated using (public.has_perm(''clients.view''))',
      rec.tbl || '_select', rec.tbl);

    execute format('drop policy if exists %I on public.%I', rec.tbl || '_insert', rec.tbl);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_perm(%L))',
      rec.tbl || '_insert', rec.tbl, rec.perm || '.create');

    execute format('drop policy if exists %I on public.%I', rec.tbl || '_update', rec.tbl);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_perm(%L)) with check (public.has_perm(%L))',
      rec.tbl || '_update', rec.tbl, rec.perm || '.edit', rec.perm || '.edit');

    execute format('drop policy if exists %I on public.%I', rec.tbl || '_delete', rec.tbl);
    execute format('create policy %I on public.%I for delete to authenticated using (public.has_perm(%L))',
      rec.tbl || '_delete', rec.tbl, rec.perm || '.delete');
  end loop;
end $client_ledger$;

-- A sale is CREATED from the POS but LISTED / edited on the invoices screen,
-- and a worker can always see the invoices they issued themselves.
alter table public.sale_invoices      enable row level security;
alter table public.sale_invoice_items enable row level security;

drop policy if exists sales_select on public.sale_invoices;
create policy sales_select on public.sale_invoices for select to authenticated
  using (
    public.has_perm('sellingInvoices.view')
    or created_by = auth.uid()
    or worker_id  = public.my_worker_id()
  );

drop policy if exists sales_insert on public.sale_invoices;
create policy sales_insert on public.sale_invoices for insert to authenticated
  with check (public.has_perm('pos.create'));

drop policy if exists sales_update on public.sale_invoices;
create policy sales_update on public.sale_invoices for update to authenticated
  using (public.has_perm('sellingInvoices.edit')) with check (public.has_perm('sellingInvoices.edit'));

drop policy if exists sales_delete on public.sale_invoices;
create policy sales_delete on public.sale_invoices for delete to authenticated
  using (public.has_perm('sellingInvoices.delete'));

drop policy if exists sale_items_select on public.sale_invoice_items;
create policy sale_items_select on public.sale_invoice_items for select to authenticated
  using (exists (select 1 from public.sale_invoices s where s.id = sale_invoice_id));

drop policy if exists sale_items_insert on public.sale_invoice_items;
create policy sale_items_insert on public.sale_invoice_items for insert to authenticated
  with check (public.has_perm('pos.create'));

drop policy if exists sale_items_write on public.sale_invoice_items;
create policy sale_items_write on public.sale_invoice_items for all to authenticated
  using (public.has_perm('sellingInvoices.edit') or public.has_perm('sellingInvoices.delete'))
  with check (public.has_perm('sellingInvoices.edit'));

select public.apply_module_policies('replacement_invoices', 'replacements');

-- ═══ WORKSHOP / OPERATIONS ══════════════════════════════════════════════════

select public.apply_module_policies('workshops',  'workshops');
select public.apply_module_policies('deliveries', 'deliveries');
select public.apply_module_policies('commands',   'commands');

alter table public.delivery_payments enable row level security;

drop policy if exists delivery_payments_select on public.delivery_payments;
create policy delivery_payments_select on public.delivery_payments for select to authenticated
  using (public.has_perm('deliveries.view'));

drop policy if exists delivery_payments_insert on public.delivery_payments;
create policy delivery_payments_insert on public.delivery_payments for insert to authenticated
  with check (public.has_perm('deliveries.payment.create'));

drop policy if exists delivery_payments_delete on public.delivery_payments;
create policy delivery_payments_delete on public.delivery_payments for delete to authenticated
  using (public.has_perm('deliveries.payment.delete'));

-- Finalising a workshop order is a distinct action from editing it.
drop policy if exists commands_finalize on public.commands;
create policy commands_finalize on public.commands for update to authenticated
  using (public.has_perm('commands.finalize')) with check (public.has_perm('commands.finalize'));

-- ═══ PAYROLL ════════════════════════════════════════════════════════════════

alter table public.workers          enable row level security;
alter table public.worker_advances  enable row level security;
alter table public.worker_absences  enable row level security;
alter table public.worker_payments  enable row level security;

-- Every signed-in user reads the staff list (invoices name their author), but
-- only `workers.*` holders may change it.
drop policy if exists workers_select on public.workers;
create policy workers_select on public.workers for select to authenticated using (public.is_signed_in());

drop policy if exists workers_insert on public.workers;
create policy workers_insert on public.workers for insert to authenticated with check (public.has_perm('workers.create'));

drop policy if exists workers_update on public.workers;
create policy workers_update on public.workers for update to authenticated
  using (public.has_perm('workers.edit')) with check (public.has_perm('workers.edit'));

drop policy if exists workers_delete on public.workers;
create policy workers_delete on public.workers for delete to authenticated using (public.has_perm('workers.delete'));

-- An employee may edit their own row (the display name on the Paramètres
-- screen) without holding the right to edit anyone else's.
drop policy if exists workers_self_update on public.workers;
create policy workers_self_update on public.workers for update to authenticated
  using (id = public.my_worker_id()) with check (id = public.my_worker_id());

-- Payroll movements: the admin (or a `workers.view` holder) sees everyone;
-- a worker always sees their own, which is what "Mes Paiements" renders.
do $payroll$
declare rec record;
begin
  for rec in
    select * from (values
      ('worker_advances', 'workers.advance.create'),
      ('worker_absences', 'workers.absence.create'),
      ('worker_payments', 'workers.payment.create')
    ) as v(tbl, act)
  loop
    execute format('drop policy if exists %I on public.%I', rec.tbl || '_select', rec.tbl);
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (public.has_perm(''workers.view'') or public.has_perm(''myPayroll.view'') and worker_id = public.my_worker_id())',
      rec.tbl || '_select', rec.tbl);

    execute format('drop policy if exists %I on public.%I', rec.tbl || '_insert', rec.tbl);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_perm(%L))',
      rec.tbl || '_insert', rec.tbl, rec.act);

    execute format('drop policy if exists %I on public.%I', rec.tbl || '_write', rec.tbl);
    execute format('create policy %I on public.%I for all to authenticated
                      using (public.has_perm(''workers.edit'') or public.has_perm(''workers.delete''))
                      with check (public.has_perm(''workers.edit''))',
      rec.tbl || '_write', rec.tbl);
  end loop;
end $payroll$;

-- ═══ FINANCE ════════════════════════════════════════════════════════════════

select public.apply_module_policies('store_expenses', 'storeExpenses');
select public.apply_module_policies('debts',          'debts');

-- Paying down a debt is its own action, separate from editing the debt row.
drop policy if exists debts_pay on public.debts;
create policy debts_pay on public.debts for update to authenticated
  using (public.has_perm('debts.pay')) with check (public.has_perm('debts.pay'));

alter table public.debt_payments            enable row level security;
alter table public.debt_payment_allocations enable row level security;

-- The payment ledger is surfaced on three screens, so any of them unlocks it.
drop policy if exists debt_payments_select on public.debt_payments;
create policy debt_payments_select on public.debt_payments for select to authenticated
  using (public.has_perm('debts.view') or public.has_perm('suppliers.view') or public.has_perm('clients.view'));

drop policy if exists debt_payments_insert on public.debt_payments;
create policy debt_payments_insert on public.debt_payments for insert to authenticated
  with check (public.has_perm('debts.pay'));

drop policy if exists debt_payments_update on public.debt_payments;
create policy debt_payments_update on public.debt_payments for update to authenticated
  using (public.has_perm('debts.payment.edit')) with check (public.has_perm('debts.payment.edit'));

drop policy if exists debt_payments_delete on public.debt_payments;
create policy debt_payments_delete on public.debt_payments for delete to authenticated
  using (public.has_perm('debts.payment.delete'));

drop policy if exists debt_alloc_select on public.debt_payment_allocations;
create policy debt_alloc_select on public.debt_payment_allocations for select to authenticated
  using (public.has_perm('debts.view') or public.has_perm('suppliers.view') or public.has_perm('clients.view'));

drop policy if exists debt_alloc_write on public.debt_payment_allocations;
create policy debt_alloc_write on public.debt_payment_allocations for all to authenticated
  using (public.has_perm('debts.pay') or public.has_perm('debts.payment.edit') or public.has_perm('debts.payment.delete'))
  with check (public.has_perm('debts.pay') or public.has_perm('debts.payment.edit'));

-- ═══ SETTINGS ═══════════════════════════════════════════════════════════════

alter table public.store_settings enable row level security;
alter table public.web_contacts   enable row level security;

-- The storefront needs the shop name and logo before anyone signs in.
drop policy if exists store_settings_public_read on public.store_settings;
create policy store_settings_public_read on public.store_settings for select to anon, authenticated using (true);

drop policy if exists store_settings_write on public.store_settings;
create policy store_settings_write on public.store_settings for all to authenticated
  using (public.has_perm('settings.store.edit') or public.has_perm('websiteManagement.content.edit'))
  with check (public.has_perm('settings.store.edit') or public.has_perm('websiteManagement.content.edit'));

drop policy if exists web_contacts_public_read on public.web_contacts;
create policy web_contacts_public_read on public.web_contacts for select to anon, authenticated using (true);

drop policy if exists web_contacts_write on public.web_contacts;
create policy web_contacts_write on public.web_contacts for all to authenticated
  using (public.has_perm('websiteManagement.contacts.edit'))
  with check (public.has_perm('websiteManagement.contacts.edit'));

-- ═══ ONLINE SHOP ════════════════════════════════════════════════════════════

alter table public.web_offers             enable row level security;
alter table public.web_special_offers     enable row level security;
alter table public.web_delivery_companies enable row level security;
alter table public.web_delivery_wilayas   enable row level security;
alter table public.web_orders             enable row level security;
alter table public.web_order_items        enable row level security;

-- Visitors see published offers only; staff with the screen see the hidden ones too.
drop policy if exists web_offers_read on public.web_offers;
create policy web_offers_read on public.web_offers for select to anon, authenticated
  using (not is_hidden or public.has_perm('websiteManagement.view'));

drop policy if exists web_offers_insert on public.web_offers;
create policy web_offers_insert on public.web_offers for insert to authenticated
  with check (public.has_perm('websiteManagement.offer.create'));

drop policy if exists web_offers_update on public.web_offers;
create policy web_offers_update on public.web_offers for update to authenticated
  using (public.has_perm('websiteManagement.offer.edit')) with check (public.has_perm('websiteManagement.offer.edit'));

drop policy if exists web_offers_delete on public.web_offers;
create policy web_offers_delete on public.web_offers for delete to authenticated
  using (public.has_perm('websiteManagement.offer.delete'));

drop policy if exists web_special_read on public.web_special_offers;
create policy web_special_read on public.web_special_offers for select to anon, authenticated
  using (not is_hidden or public.has_perm('websiteManagement.view'));

drop policy if exists web_special_insert on public.web_special_offers;
create policy web_special_insert on public.web_special_offers for insert to authenticated
  with check (public.has_perm('websiteManagement.special.create'));

drop policy if exists web_special_update on public.web_special_offers;
create policy web_special_update on public.web_special_offers for update to authenticated
  using (public.has_perm('websiteManagement.special.edit')) with check (public.has_perm('websiteManagement.special.edit'));

drop policy if exists web_special_delete on public.web_special_offers;
create policy web_special_delete on public.web_special_offers for delete to authenticated
  using (public.has_perm('websiteManagement.special.delete'));

-- Tariffs must be readable by visitors so the order form can price delivery.
drop policy if exists web_delivery_read on public.web_delivery_companies;
create policy web_delivery_read on public.web_delivery_companies for select to anon, authenticated using (true);

drop policy if exists web_delivery_write on public.web_delivery_companies;
create policy web_delivery_write on public.web_delivery_companies for all to authenticated
  using (public.has_perm('websiteManagement.delivery.edit') or public.has_perm('websiteManagement.delivery.delete'))
  with check (public.has_perm('websiteManagement.delivery.create') or public.has_perm('websiteManagement.delivery.edit'));

drop policy if exists web_wilayas_read on public.web_delivery_wilayas;
create policy web_wilayas_read on public.web_delivery_wilayas for select to anon, authenticated using (true);

drop policy if exists web_wilayas_write on public.web_delivery_wilayas;
create policy web_wilayas_write on public.web_delivery_wilayas for all to authenticated
  using (public.has_perm('websiteManagement.delivery.edit') or public.has_perm('websiteManagement.delivery.delete'))
  with check (public.has_perm('websiteManagement.delivery.create') or public.has_perm('websiteManagement.delivery.edit'));

-- A visitor may PLACE an order but never read one back.
drop policy if exists web_orders_public_insert on public.web_orders;
create policy web_orders_public_insert on public.web_orders for insert to anon, authenticated with check (true);

drop policy if exists web_orders_select on public.web_orders;
create policy web_orders_select on public.web_orders for select to authenticated
  using (public.has_perm('websiteOrders.view'));

drop policy if exists web_orders_update on public.web_orders;
create policy web_orders_update on public.web_orders for update to authenticated
  using (
    public.has_perm('websiteOrders.accept')   or public.has_perm('websiteOrders.status')
    or public.has_perm('websiteOrders.finalize') or public.has_perm('websiteOrders.cancel')
  )
  with check (true);

drop policy if exists web_orders_delete on public.web_orders;
create policy web_orders_delete on public.web_orders for delete to authenticated
  using (public.has_perm('websiteOrders.delete'));

drop policy if exists web_order_items_public_insert on public.web_order_items;
create policy web_order_items_public_insert on public.web_order_items for insert to anon, authenticated with check (true);

drop policy if exists web_order_items_select on public.web_order_items;
create policy web_order_items_select on public.web_order_items for select to authenticated
  using (public.has_perm('websiteOrders.view'));

drop policy if exists web_order_items_write on public.web_order_items;
create policy web_order_items_write on public.web_order_items for all to authenticated
  using (public.has_perm('websiteOrders.status') or public.has_perm('websiteOrders.delete'))
  with check (public.has_perm('websiteOrders.status'));

-- ═══ PUBLIC CATALOGUE VIEWS ═════════════════════════════════════════════════
-- The storefront needs metal names to label a piece, but must never learn how
-- much stock is in the safe. These views expose the labels and nothing else.

create or replace view public.public_metal_categories as
  select id, name, name_ar, color, calibres from public.metal_categories;

create or replace view public.public_metal_types as
  select id, name, metal_category_id, calibre, is_ala_piece from public.metal_types;

create or replace view public.public_shapes as
  select name, sort_order from public.shapes;

-- security_invoker = off (the default) means these read as the view owner and
-- therefore bypass the RLS above — which is the whole point.
grant select on public.public_metal_categories to anon, authenticated;
grant select on public.public_metal_types      to anon, authenticated;
grant select on public.public_shapes           to anon, authenticated;

-- ─── Table grants (RLS still decides row by row) ────────────────────────────
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- anon is granted ONLY what the storefront needs. Everything else stays
-- unreachable at the privilege level, before RLS is even consulted.
revoke all on all tables in schema public from anon;
grant select on
  public.store_settings, public.web_contacts,
  public.web_offers, public.web_special_offers,
  public.web_delivery_companies, public.web_delivery_wilayas,
  -- label-only catalogue views (no stock figures)
  public.public_metal_categories, public.public_metal_types, public.public_shapes
  to anon;
grant insert on public.web_orders, public.web_order_items to anon;
grant usage, select on all sequences in schema public to anon, authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;


-- ###########################################################################
-- ###  FILE: 05_storage.sql
-- ###########################################################################

-- ════════════════════════════════════════════════════════════════════════════
--  BIJOUTERIE BEJAIA — Part 5/6 : storage buckets for every image the app shows
--
--  The app used to inline pictures as base64 inside the record itself, which
--  bloated every row and every backup. Images now live in these buckets and
--  the tables keep only the public URL.
--
--  All four buckets are PUBLIC for reading (the storefront must render product
--  photos to visitors who are not signed in) but writing is permission-gated
--  exactly like the matching table.
-- ════════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  -- Shop logo shown in the sidebar, on invoices and on the storefront header.
  ('store-logos',    'store-logos',    true, 2097152,
     array['image/png','image/jpeg','image/jpg','image/webp','image/svg+xml']),
  -- Photos of catalogue offers on the public site.
  ('product-images', 'product-images', true, 5242880,
     array['image/png','image/jpeg','image/jpg','image/webp','image/avif']),
  -- Photos attached to limited-time special offers.
  ('offer-images',   'offer-images',   true, 5242880,
     array['image/png','image/jpeg','image/jpg','image/webp','image/avif']),
  -- Reference pictures a client uploads with a personalised order.
  ('order-images',   'order-images',   true, 5242880,
     array['image/png','image/jpeg','image/jpg','image/webp','image/avif'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ─── READ: anyone, signed in or not ─────────────────────────────────────────
drop policy if exists "bijou_public_read" on storage.objects;
create policy "bijou_public_read" on storage.objects for select to anon, authenticated
  using (bucket_id in ('store-logos','product-images','offer-images','order-images'));

-- ─── WRITE: mirrors the permission that governs the owning table ────────────

-- Logo — whoever may edit the shop identity.
drop policy if exists "bijou_logo_write" on storage.objects;
create policy "bijou_logo_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'store-logos' and public.has_perm('settings.store.edit'));

drop policy if exists "bijou_logo_update" on storage.objects;
create policy "bijou_logo_update" on storage.objects for update to authenticated
  using (bucket_id = 'store-logos' and public.has_perm('settings.store.edit'))
  with check (bucket_id = 'store-logos' and public.has_perm('settings.store.edit'));

drop policy if exists "bijou_logo_delete" on storage.objects;
create policy "bijou_logo_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'store-logos' and public.has_perm('settings.store.edit'));

-- Product photos — whoever may create or edit a website offer.
drop policy if exists "bijou_product_write" on storage.objects;
create policy "bijou_product_write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (public.has_perm('websiteManagement.offer.create') or public.has_perm('websiteManagement.offer.edit'))
  );

drop policy if exists "bijou_product_update" on storage.objects;
create policy "bijou_product_update" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.has_perm('websiteManagement.offer.edit'))
  with check (bucket_id = 'product-images' and public.has_perm('websiteManagement.offer.edit'));

drop policy if exists "bijou_product_delete" on storage.objects;
create policy "bijou_product_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.has_perm('websiteManagement.offer.delete'));

-- Special-offer photos.
drop policy if exists "bijou_offer_write" on storage.objects;
create policy "bijou_offer_write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'offer-images'
    and (public.has_perm('websiteManagement.special.create') or public.has_perm('websiteManagement.special.edit'))
  );

drop policy if exists "bijou_offer_update" on storage.objects;
create policy "bijou_offer_update" on storage.objects for update to authenticated
  using (bucket_id = 'offer-images' and public.has_perm('websiteManagement.special.edit'))
  with check (bucket_id = 'offer-images' and public.has_perm('websiteManagement.special.edit'));

drop policy if exists "bijou_offer_delete" on storage.objects;
create policy "bijou_offer_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'offer-images' and public.has_perm('websiteManagement.special.delete'));

-- Order attachments — a visitor placing a personalised order must be able to
-- upload their reference picture, so anon may INSERT here (and only here).
drop policy if exists "bijou_order_write" on storage.objects;
create policy "bijou_order_write" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'order-images');

drop policy if exists "bijou_order_delete" on storage.objects;
create policy "bijou_order_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'order-images' and public.has_perm('websiteOrders.delete'));


-- ###########################################################################
-- ###  FILE: 06_seed.sql
-- ###########################################################################

-- ════════════════════════════════════════════════════════════════════════════
--  BIJOUTERIE BEJAIA — Part 6/6 : the permission catalogue + base data
--
--  Below is the complete map of the application: 22 interfaces (`*.view`) and
--  every mutating button behind them. An administrator ticks these per worker
--  on the Employés screen; the sidebar hides what is not ticked and Postgres
--  refuses it even if someone calls the API directly.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.app_permissions (key, kind, module, label_fr, label_ar, sort_order) values

-- ─── 1. TABLEAU DE BORD ─────────────────────────────────────────────────────
('dashboard.view',                'interface','dashboard','Tableau de bord','لوحة التحكم',100),

-- ─── 2. POINT DE VENTE ──────────────────────────────────────────────────────
('pos.view',                      'interface','pos','Point de vente','نقطة البيع',200),
('pos.create',                    'action','pos','Valider une vente','تأكيد البيع',201),
('pos.print',                     'action','pos','Imprimer le ticket','طباعة الوصل',202),

-- ─── 3. INVENTAIRE ──────────────────────────────────────────────────────────
('inventory.view',                'interface','inventory','Inventaire','المخزون',300),
('inventory.adjust',              'action','inventory','Ajuster le stock','تعديل المخزون',301),

-- ─── 4. REMPLACEMENTS / REPRISES ────────────────────────────────────────────
('replacements.view',             'interface','replacements','Remplacements','الاستبدالات',400),
('replacements.create',           'action','replacements','Nouveau remplacement','استبدال جديد',401),
('replacements.edit',             'action','replacements','Modifier un remplacement','تعديل الاستبدال',402),
('replacements.delete',           'action','replacements','Supprimer un remplacement','حذف الاستبدال',403),

-- ─── 5. CLIENTS ─────────────────────────────────────────────────────────────
('clients.view',                  'interface','clients','Clients','الزبائن',500),
('clients.create',                'action','clients','Ajouter un client','إضافة زبون',501),
('clients.edit',                  'action','clients','Modifier un client','تعديل زبون',502),
('clients.delete',                'action','clients','Supprimer un client','حذف زبون',503),
('clients.payment.create',        'action','clients','Enregistrer un versement','تسجيل دفعة',504),
('clients.payment.edit',          'action','clients','Modifier un versement','تعديل دفعة',505),
('clients.payment.delete',        'action','clients','Supprimer un versement','حذف دفعة',506),
('clients.recuperation.create',   'action','clients','Enregistrer une récupération','تسجيل استرجاع',507),
('clients.recuperation.edit',     'action','clients','Modifier une récupération','تعديل استرجاع',508),
('clients.recuperation.delete',   'action','clients','Supprimer une récupération','حذف استرجاع',509),
('clients.print',                 'action','clients','Imprimer l''historique','طباعة السجل',510),

-- ─── 6. FOURNISSEURS ────────────────────────────────────────────────────────
('suppliers.view',                'interface','suppliers','Fournisseurs','الموردون',600),
('suppliers.create',              'action','suppliers','Ajouter un fournisseur','إضافة مورد',601),
('suppliers.edit',                'action','suppliers','Modifier un fournisseur','تعديل مورد',602),
('suppliers.delete',              'action','suppliers','Supprimer un fournisseur','حذف مورد',603),

-- ─── 7. ACHATS ──────────────────────────────────────────────────────────────
('purchases.view',                'interface','purchases','Achats','المشتريات',700),
('purchases.create',              'action','purchases','Nouvelle facture d''achat','فاتورة شراء جديدة',701),
('purchases.edit',                'action','purchases','Modifier une facture','تعديل الفاتورة',702),
('purchases.delete',              'action','purchases','Supprimer une facture','حذف الفاتورة',703),
('purchases.print',               'action','purchases','Imprimer une facture','طباعة الفاتورة',704),

-- ─── 8. ACHATS CASSIE (métal de récupération) ───────────────────────────────
('cassiePurchases.view',          'interface','cassiePurchases','Achats Cassie','شراء الكسر',800),
('cassiePurchases.create',        'action','cassiePurchases','Acheter de la cassie','شراء كسر',801),
('cassiePurchases.edit',          'action','cassiePurchases','Modifier un achat','تعديل الشراء',802),
('cassiePurchases.delete',        'action','cassiePurchases','Supprimer un achat','حذف الشراء',803),
('cassiePurchases.melt',          'action','cassiePurchases','Lancer une fonte','صهر',804),
('cassiePurchases.melt.edit',     'action','cassiePurchases','Modifier une fonte','تعديل الصهر',805),
('cassiePurchases.melt.delete',   'action','cassiePurchases','Supprimer une fonte','حذف الصهر',806),

-- ─── 9. FACTURES DE VENTE ───────────────────────────────────────────────────
('sellingInvoices.view',          'interface','sellingInvoices','Factures de vente','فواتير البيع',900),
('sellingInvoices.viewAll',       'action','sellingInvoices','Voir les factures de tous','عرض كل الفواتير',901),
('sellingInvoices.edit',          'action','sellingInvoices','Modifier une facture','تعديل الفاتورة',902),
('sellingInvoices.delete',        'action','sellingInvoices','Supprimer une facture','حذف الفاتورة',903),
('sellingInvoices.print',         'action','sellingInvoices','Imprimer une facture','طباعة الفاتورة',904),

-- ─── 10. ATELIERS ───────────────────────────────────────────────────────────
('workshops.view',                'interface','workshops','Ateliers','الورشات',1000),
('workshops.create',              'action','workshops','Ajouter un atelier','إضافة ورشة',1001),
('workshops.edit',                'action','workshops','Modifier un atelier','تعديل ورشة',1002),
('workshops.delete',              'action','workshops','Supprimer un atelier','حذف ورشة',1003),

-- ─── 11. LIVREURS ───────────────────────────────────────────────────────────
('deliveries.view',               'interface','deliveries','Livreurs','الموصلون',1100),
('deliveries.create',             'action','deliveries','Ajouter un livreur','إضافة موصل',1101),
('deliveries.edit',               'action','deliveries','Modifier un livreur','تعديل موصل',1102),
('deliveries.delete',             'action','deliveries','Supprimer un livreur','حذف موصل',1103),
('deliveries.payment.create',     'action','deliveries','Enregistrer un paiement','تسجيل دفعة',1104),
('deliveries.payment.delete',     'action','deliveries','Supprimer un paiement','حذف دفعة',1105),

-- ─── 12. COMMANDES ATELIER ──────────────────────────────────────────────────
('commands.view',                 'interface','commands','Commandes','الطلبيات',1200),
('commands.create',               'action','commands','Nouvelle commande','طلبية جديدة',1201),
('commands.edit',                 'action','commands','Modifier une commande','تعديل طلبية',1202),
('commands.delete',               'action','commands','Supprimer une commande','حذف طلبية',1203),
('commands.finalize',             'action','commands','Finaliser une commande','إنهاء الطلبية',1204),
('commands.print',                'action','commands','Imprimer une commande','طباعة الطلبية',1205),

-- ─── 13. EMPLOYÉS ───────────────────────────────────────────────────────────
('workers.view',                  'interface','workers','Employés','الموظفون',1300),
('workers.create',                'action','workers','Créer un compte employé','إنشاء حساب موظف',1301),
('workers.edit',                  'action','workers','Modifier un employé','تعديل موظف',1302),
('workers.delete',                'action','workers','Supprimer un employé','حذف موظف',1303),
('workers.advance.create',        'action','workers','Enregistrer une avance','تسجيل سلفة',1304),
('workers.absence.create',        'action','workers','Enregistrer une absence','تسجيل غياب',1305),
('workers.payment.create',        'action','workers','Payer un salaire','دفع الراتب',1306),
('workers.permissions.manage',    'action','workers','Gérer les permissions','إدارة الصلاحيات',1307),

-- ─── 14. MES PAIEMENTS (espace employé) ─────────────────────────────────────
('myPayroll.view',                'interface','myPayroll','Mes paiements','مستحقاتي',1400),

-- ─── 15. DÉPENSES DU MAGASIN ────────────────────────────────────────────────
('storeExpenses.view',            'interface','storeExpenses','Dépenses','المصاريف',1500),
('storeExpenses.create',          'action','storeExpenses','Ajouter une dépense','إضافة مصروف',1501),
('storeExpenses.edit',            'action','storeExpenses','Modifier une dépense','تعديل مصروف',1502),
('storeExpenses.delete',          'action','storeExpenses','Supprimer une dépense','حذف مصروف',1503),

-- ─── 16. TRÉSORERIE ─────────────────────────────────────────────────────────
('storeCash.view',                'interface','storeCash','Trésorerie','خزينة المتجر',1600),

-- ─── 17. DETTES ─────────────────────────────────────────────────────────────
('debts.view',                    'interface','debts','Dettes','الديون',1700),
('debts.create',                  'action','debts','Ajouter une dette','إضافة دين',1701),
('debts.edit',                    'action','debts','Modifier une dette','تعديل دين',1702),
('debts.delete',                  'action','debts','Supprimer une dette','حذف دين',1703),
('debts.pay',                     'action','debts','Rembourser une dette','تسديد دين',1704),
('debts.payment.edit',            'action','debts','Modifier un remboursement','تعديل تسديد',1705),
('debts.payment.delete',          'action','debts','Supprimer un remboursement','حذف تسديد',1706),
('debts.print',                   'action','debts','Imprimer le relevé','طباعة الكشف',1707),

-- ─── 18. RAPPORTS ───────────────────────────────────────────────────────────
('reports.view',                  'interface','reports','Rapports','التقارير',1800),
('reports.print',                 'action','reports','Imprimer / exporter','طباعة أو تصدير',1801),

-- ─── 19. GESTION DU SITE WEB ────────────────────────────────────────────────
('websiteManagement.view',            'interface','websiteManagement','Gestion site web','إدارة الموقع',1900),
('websiteManagement.offer.create',    'action','websiteManagement','Créer une offre','إنشاء عرض',1901),
('websiteManagement.offer.edit',      'action','websiteManagement','Modifier une offre','تعديل عرض',1902),
('websiteManagement.offer.delete',    'action','websiteManagement','Supprimer une offre','حذف عرض',1903),
('websiteManagement.special.create',  'action','websiteManagement','Créer une offre spéciale','إنشاء عرض خاص',1904),
('websiteManagement.special.edit',    'action','websiteManagement','Modifier une offre spéciale','تعديل عرض خاص',1905),
('websiteManagement.special.delete',  'action','websiteManagement','Supprimer une offre spéciale','حذف عرض خاص',1906),
('websiteManagement.delivery.create', 'action','websiteManagement','Ajouter une société de livraison','إضافة شركة توصيل',1907),
('websiteManagement.delivery.edit',   'action','websiteManagement','Modifier une société de livraison','تعديل شركة توصيل',1908),
('websiteManagement.delivery.delete', 'action','websiteManagement','Supprimer une société de livraison','حذف شركة توصيل',1909),
('websiteManagement.contacts.edit',   'action','websiteManagement','Modifier les contacts','تعديل جهات الاتصال',1910),
('websiteManagement.content.edit',    'action','websiteManagement','Modifier le contenu du site','تعديل محتوى الموقع',1911),

-- ─── 20. COMMANDES DU SITE ──────────────────────────────────────────────────
('websiteOrders.view',            'interface','websiteOrders','Commandes du site','طلبات الموقع',2000),
('websiteOrders.accept',          'action','websiteOrders','Accepter une commande','قبول الطلب',2001),
('websiteOrders.status',          'action','websiteOrders','Changer le statut','تغيير الحالة',2002),
('websiteOrders.finalize',        'action','websiteOrders','Finaliser (déduire du stock)','إنهاء وخصم المخزون',2003),
('websiteOrders.cancel',          'action','websiteOrders','Annuler une commande','إلغاء الطلب',2004),
('websiteOrders.delete',          'action','websiteOrders','Supprimer une commande','حذف الطلب',2005),

-- ─── 21. CATALOGUE ──────────────────────────────────────────────────────────
('catalogue.view',                'interface','catalogue','Catalogue','الكتالوج',2100),
('catalogue.create',              'action','catalogue','Ajouter au catalogue','إضافة للكتالوج',2101),
('catalogue.edit',                'action','catalogue','Modifier le catalogue','تعديل الكتالوج',2102),
('catalogue.delete',              'action','catalogue','Supprimer du catalogue','حذف من الكتالوج',2103),
('catalogue.category.manage',     'action','catalogue','Gérer les catégories de métal','إدارة فئات المعادن',2104),
('catalogue.type.manage',         'action','catalogue','Gérer les types de stock','إدارة أنواع المخزون',2105),
('catalogue.shape.manage',        'action','catalogue','Gérer les formes','إدارة الأشكال',2106),
('catalogue.calibre.manage',      'action','catalogue','Gérer les calibres','إدارة العيارات',2107),

-- ─── 22. PARAMÈTRES ─────────────────────────────────────────────────────────
('settings.view',                 'interface','settings','Paramètres','الإعدادات',2200),
('settings.store.edit',           'action','settings','Modifier l''identité du magasin','تعديل هوية المتجر',2201),
('settings.backup.export',        'action','settings','Exporter une sauvegarde','تصدير نسخة احتياطية',2202),
('settings.backup.import',        'action','settings','Restaurer une sauvegarde','استعادة نسخة احتياطية',2203),
('settings.reset',                'action','settings','Réinitialiser les données','إعادة تعيين البيانات',2204)

on conflict (key) do update
  set kind = excluded.kind, module = excluded.module,
      label_fr = excluded.label_fr, label_ar = excluded.label_ar,
      sort_order = excluded.sort_order;

-- ─── What a brand-new employee gets before the admin customises it ──────────
-- Deliberately thin: sell, look up clients, see their own payslip.
insert into public.default_worker_permissions (permission_key) values
  ('dashboard.view'),
  ('pos.view'), ('pos.create'), ('pos.print'),
  ('sellingInvoices.view'), ('sellingInvoices.print'),
  ('clients.view'), ('clients.create'),
  ('myPayroll.view'),
  ('settings.view')
on conflict do nothing;

-- ─── Built-in metal families (Or / Argent cannot be deleted) ────────────────
insert into public.metal_categories (id, name, name_ar, color, calibres, price_per_gram, is_built_in) values
  ('or',     'Or',     'ذهب', '#C9A84C', array['18k','21k','24k'], 24500, true),
  ('argent', 'Argent', 'فضة', '#A8B2BD', array['800','925','950'],   210, true)
on conflict (id) do nothing;

insert into public.calibres (value) values
  ('18k'),('21k'),('24k'),('800'),('925'),('950')
on conflict do nothing;

insert into public.shapes (name, sort_order) values
  ('ring',1),('necklace',2),('earring',3),('bracelet',4),('parure4piece',5),
  ('triyeu3piece',6),('gourmette',7),('pendentif',8),('louiza',9),
  ('mahazma',10),('motife',11)
on conflict (name) do nothing;

-- ─── Singleton settings rows ────────────────────────────────────────────────
insert into public.store_settings (id, store_name, slogan)
values (1, 'Bijouterie Bejaia', 'Or & Argent d''exception')
on conflict (id) do nothing;

insert into public.web_contacts (id) values (1) on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
--  AFTER RUNNING ALL SIX FILES
--  ─────────────────────────────
--  1. Open the app. The login screen shows "Créer un compte administrateur"
--     because public.admin_exists() returns false.
--  2. Create it. bootstrap_admin() writes auth.users + profiles + every
--     permission, and the button disappears for good.
--  3. Sign in with that email and password.
--  4. Employés → Nouvel employé creates a real Supabase auth account for each
--     worker and lets you tick exactly which screens and buttons they get.
-- ════════════════════════════════════════════════════════════════════════════
