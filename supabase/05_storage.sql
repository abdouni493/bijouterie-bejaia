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
