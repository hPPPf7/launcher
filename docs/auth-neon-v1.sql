create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key,
  nickname text,
  provider_nickname text,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists deleted_auth_account_markers (
  provider text not null,
  provider_account_id text not null,
  user_id uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists deleted_auth_account_markers_unique_key
  on deleted_auth_account_markers(provider, provider_account_id);

create table if not exists auth_session_states (
  user_id uuid primary key,
  session_version integer not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists auth_user_map (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_account_id text not null,
  user_id uuid not null,
  created_at timestamptz default now()
);

create unique index if not exists auth_user_map_provider_unique
  on auth_user_map(provider, provider_account_id);

create table if not exists login_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  target_app text not null,
  ticket_type text not null,
  ticket_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists login_tickets_user_id_idx
  on login_tickets(user_id);

create index if not exists login_tickets_expires_at_idx
  on login_tickets(expires_at);
