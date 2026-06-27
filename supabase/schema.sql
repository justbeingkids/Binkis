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
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_users_email on public.admin_users (email);

-- Seed the initial admin: test@gmail.com / test
-- (scrypt hash of "test"; rotate this in production via `npm run seed-admin`).
-- Idempotent: re-running schema.sql will not duplicate or overwrite the user.
insert into public.admin_users (email, password_hash)
values (
  'test@gmail.com',
  'scrypt$16384$8$1$2p6QQOBpWvv9iG3jMMgtbw==$7aN2SbJ1h2/TJIsEK2fetQmWAdqHHBCbEjiiIqxWHbSUsTe1C5MGb2xrB7mPH6XetgbqsvmxeDYZJX9Z4ZtQvw=='
)
on conflict (email) do nothing;

-- 4) Row Level Security: lock every table to service_role only.
--    Our API routes use the service_role key so they bypass RLS;
--    the anon key (used in the browser) cannot read or write anything.
alter table public.codes enable row level security;
alter table public.visit_logs enable row level security;
alter table public.admin_users enable row level security;

-- No policies = anon is denied. Service role bypasses RLS automatically.
