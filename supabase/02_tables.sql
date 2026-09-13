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
