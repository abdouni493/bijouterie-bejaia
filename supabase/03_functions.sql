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
    v_email, crypt(p_password, gen_salt('bf')),
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
     set encrypted_password = crypt(p_password, gen_salt('bf')),
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
