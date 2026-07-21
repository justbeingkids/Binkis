-- BinKis QR Validation - Supabase Schema
-- Run this entire file in: Supabase Dashboard -> SQL Editor -> New Query -> Run

-- 1) codes table: holds every generated code
--    is_winner flips to true for the 4,000 selected by the lottery
--    claimed flips to true when a winner submits the form
create table if not exists public.codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  is_winner boolean not null default false,
  claimed boolean not null default false,
  claimed_at timestamptz,
  winner_name text,
  winner_email text,
  winner_phone text,
  winner_address text,
  created_at timestamptz not null default now()
);

create index if not exists idx_codes_code on public.codes (code);
create index if not exists idx_codes_winner_unclaimed
  on public.codes (is_winner, claimed)
  where is_winner = true and claimed = false;
create index if not exists idx_codes_created_at on public.codes (created_at desc);

-- 2) visit_logs table: anonymous visit pings + subscriber rows
create table if not exists public.visit_logs (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  email text,
  name text,
  auth_method text,
  ip text,
  country text,
  region text,
  city text,
  user_agent text,
  referrer text,
  path text
);

create index if not exists idx_visit_logs_ts on public.visit_logs (ts desc);
create index if not exists idx_visit_logs_auth_method on public.visit_logs (auth_method);
create index if not exists idx_visit_logs_country on public.visit_logs (country);

-- 3) admin_users table: who is allowed into the admin panel.
--    password_hash is a self-contained scrypt string (see lib/password.ts):
--    "scrypt$N$r$p$<salt-b64>$<hash-b64>". Never store plaintext passwords.
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  disabled boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_users_email on public.admin_users (email);
-- For existing databases (table predates the column): add it if missing.
alter table public.admin_users add column if not exists disabled boolean not null default false;

-- Admins are created with `npm run seed-admin -- <email> <password>` or by
-- inserting a row with a scrypt password_hash. No default seed is shipped on
-- purpose — never bake a known public credential into the schema.

-- 4) login_attempts: per-IP failed-login throttle.
--    Cooldown after consecutive failures: 5s (1st), 10s (2nd), 30s (3rd+).
--    The login route reads/writes this and clears the row on success.
create table if not exists public.login_attempts (
  id text primary key,
  fail_count integer not null default 0,
  last_failed_at timestamptz not null default now()
);

-- 5) admin_audit_log: record of who created/changed/disabled admin accounts.
--    The super admin views this; every admin-account change appends a row.
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  actor_email text,
  action text not null,
  target_email text,
  ip text,
  country text,
  city text,
  detail text
);

create index if not exists idx_admin_audit_log_ts on public.admin_audit_log (ts desc);
-- For existing databases (table predates the geo columns): add them if missing.
alter table public.admin_audit_log add column if not exists country text;
alter table public.admin_audit_log add column if not exists city text;

-- 7) characters: the Limited Edition characters and their live inventory/odds.
--    quota = total stock (admin +/-); assigned_count = how many awarded.
--    weight = admin-adjustable bias; win_probability = computed & stored,
--    recomputed after every award and after admin edits (see functions below).
--    variant_id links to the Shopify product (set later).
create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  variant_id text,
  quota integer not null default 0,
  assigned_count integer not null default 0,
  weight numeric not null default 1,
  win_probability numeric not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0,
  image_url text,
  created_at timestamptz not null default now(),
  constraint characters_assigned_within_quota check (assigned_count >= 0 and assigned_count <= quota),
  constraint characters_weight_nonneg check (weight >= 0)
);

create index if not exists idx_characters_sort on public.characters (sort_order, created_at);

-- Added after the initial characters table shipped; safe to re-run.
alter table public.characters add column if not exists image_url text;

-- Link a winning code to the character it was assigned (set once, permanent).
alter table public.codes add column if not exists character_id uuid references public.characters(id);
create index if not exists idx_codes_character on public.codes (character_id);

-- 8) Loyalty: one balance row per customer email + an append-only ledger.
create table if not exists public.loyalty_accounts (
  email text primary key,
  points integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint loyalty_points_nonneg check (points >= 0)
);

create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  delta integer not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_loyalty_tx_email on public.loyalty_transactions (email, created_at desc);

-- 8b) scan_requests: append-only log of EVERY public code scan / validation,
--     winner or not. No personal data is collected here — that only happens
--     when a winner claims (see codes.winner_*). This records the scan event,
--     its result, and coarse geo/user-agent so all validation traffic is kept.
create table if not exists public.scan_requests (
  id uuid primary key default gen_random_uuid(),
  code text,
  result text not null,              -- 'valid' | 'claimed' | 'invalid'
  is_winner boolean,                 -- null when the code doesn't exist / bad format
  code_exists boolean not null default false,
  ip text,
  country text,
  region text,
  city text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_scan_requests_created_at on public.scan_requests (created_at desc);
create index if not exists idx_scan_requests_code on public.scan_requests (code);
create index if not exists idx_scan_requests_result on public.scan_requests (result);

-- 8c) customers: one row per person (identity), keyed by email. A winning code
--     links to its owner via codes.customer_id (set at claim). One customer can
--     own many winning codes -> many characters. tier holds the "special
--     treatment" level (thresholds applied later); shopify_customer_id is filled
--     when Shopify connects.
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  phone text,
  address text,
  tier text not null default 'bronze',
  shopify_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_email on public.customers (email);

-- Link a winning code to its owning customer (set at claim).
alter table public.codes add column if not exists customer_id uuid references public.customers(id);
create index if not exists idx_codes_customer on public.codes (customer_id);

-- 9) Functions ---------------------------------------------------------------

-- Recompute every character's stored win_probability from weight * remaining,
-- normalized over the active, in-stock characters. Called after each award and
-- after any admin change to weight/quota/active.
create or replace function public.recompute_win_probabilities()
returns void language sql as $$
  update public.characters c
  set win_probability = case
        when c.active and (c.quota - c.assigned_count) > 0
          then round((c.weight * (c.quota - c.assigned_count)) / nullif(t.total, 0), 6)
        else 0
      end
  from (
    select coalesce(sum(weight * (quota - assigned_count)), 0) as total
    from public.characters
    where active and (quota - assigned_count) > 0
  ) t
  -- Always true (id is the PK, never null). Present only so pg-safeupdate
  -- accepts this intentional update of every row.
  where c.id is not null;
$$;

-- Atomically assign a character to a winning code, weighted by the stored
-- win_probability. Idempotent (returns the existing one if already assigned),
-- race-safe (row locks + quota check), and recomputes probabilities after.
create or replace function public.assign_character(p_code text)
returns table(id uuid, name text) language plpgsql as $$
declare
  v_code_id uuid;
  v_existing uuid;
  v_char public.characters;
begin
  select c.id, c.character_id into v_code_id, v_existing
    from public.codes c where c.code = p_code for update;
  if v_code_id is null then raise exception 'code_not_found'; end if;

  if v_existing is not null then
    return query select ch.id, ch.name from public.characters ch where ch.id = v_existing;
    return;
  end if;

  select * into v_char from public.characters
    where active and win_probability > 0 and (quota - assigned_count) > 0
    order by -ln(random()) / win_probability asc
    limit 1
    for update;

  -- Self-heal: stored probabilities may be stale/zero (e.g. right after a
  -- character is created). Refresh them and retry before giving up.
  if v_char.id is null then
    perform public.recompute_win_probabilities();
    select * into v_char from public.characters
      where active and win_probability > 0 and (quota - assigned_count) > 0
      order by -ln(random()) / win_probability asc
      limit 1
      for update;
    if v_char.id is null then raise exception 'no_stock'; end if;
  end if;

  update public.characters set assigned_count = assigned_count + 1 where id = v_char.id;
  update public.codes set character_id = v_char.id where id = v_code_id;
  perform public.recompute_win_probabilities();

  return query select v_char.id, v_char.name;
end $$;

-- Add (or subtract) loyalty points for a customer: appends a ledger row and
-- upserts the balance in one transaction. Balance never goes below zero.
create or replace function public.add_loyalty_points(p_email text, p_delta integer, p_reason text)
returns integer language plpgsql as $$
declare
  v_email text := lower(trim(p_email));
  v_balance integer;
begin
  insert into public.loyalty_transactions(email, delta, reason) values (v_email, p_delta, p_reason);

  insert into public.loyalty_accounts(email, points, updated_at)
    values (v_email, greatest(p_delta, 0), now())
  on conflict (email) do update
    set points = greatest(loyalty_accounts.points + p_delta, 0),
        updated_at = now()
  returning points into v_balance;

  return v_balance;
end $$;

-- Upsert the customer (by email) with their latest contact details and link the
-- given winning code to them. Called at claim, once the winner's identity is
-- known. Idempotent: re-claiming by the same email just refreshes the profile.
create or replace function public.link_customer(
  p_code text,
  p_email text,
  p_name text,
  p_phone text,
  p_address text
) returns uuid language plpgsql as $$
declare
  v_email text := lower(trim(p_email));
  v_customer_id uuid;
begin
  insert into public.customers(email, name, phone, address)
    values (v_email, p_name, p_phone, p_address)
  on conflict (email) do update
    set name = coalesce(nullif(excluded.name, ''), customers.name),
        phone = coalesce(nullif(excluded.phone, ''), customers.phone),
        address = coalesce(nullif(excluded.address, ''), customers.address),
        updated_at = now()
  returning id into v_customer_id;

  update public.codes set customer_id = v_customer_id where code = p_code;

  return v_customer_id;
end $$;

-- 10) Row Level Security: lock every table to service_role only.
--    Our API routes use the service_role key so they bypass RLS;
--    the anon key (used in the browser) cannot read or write anything.
alter table public.codes enable row level security;
alter table public.visit_logs enable row level security;
alter table public.admin_users enable row level security;
alter table public.login_attempts enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.characters enable row level security;
alter table public.loyalty_accounts enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.scan_requests enable row level security;
alter table public.customers enable row level security;

-- No policies = anon is denied. Service role bypasses RLS automatically.
