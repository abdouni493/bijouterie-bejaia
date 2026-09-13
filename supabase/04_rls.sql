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
