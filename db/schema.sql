create extension if not exists pgcrypto;

create table if not exists events (
  id text primary key,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue text not null,
  club text not null,
  image text not null,
  description text not null,
  speakers jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_ends_after_starts check (ends_at > starts_at),
  constraint events_speakers_array check (jsonb_typeof(speakers) = 'array'),
  constraint events_attachments_array check (jsonb_typeof(attachments) = 'array')
);

create table if not exists archive (
  id text primary key,
  event_id text not null,
  name text not null,
  date date not null,
  club text not null,
  year text not null,
  image text not null,
  summary text not null,
  drive_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hall_of_fame (
  id text primary key,
  name text not null,
  batch text not null,
  award text not null,
  category text not null,
  club text not null,
  event_name text not null,
  archive_id text not null references archive(id) on delete restrict,
  portrait text not null,
  champion boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admins (
  id text primary key,
  name text not null,
  email text not null unique,
  role text not null,
  active boolean not null default true,
  token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admins_role_check check (role in ('Super Admin', 'Content Manager', 'Read-Only Viewer'))
);

create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'unknown',
  token text not null unique,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id text primary key,
  payload jsonb not null,
  sent_at timestamptz not null default now(),
  status text not null default 'recorded',
  token_count integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  constraint notifications_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint notifications_status_check check (status in ('recorded', 'sent', 'failed')),
  constraint notifications_token_count_check check (token_count >= 0)
);

create table if not exists audit_log (
  id text primary key,
  action text not null,
  id_ref text not null,
  module text not null,
  timestamp timestamptz not null default now(),
  "user" text not null default 'admin',
  created_at timestamptz not null default now()
);

create index if not exists events_published_starts_at_idx on events (published, starts_at);
create index if not exists archive_date_idx on archive (date desc);
create index if not exists hall_of_fame_archive_id_idx on hall_of_fame (archive_id);
create index if not exists audit_log_timestamp_idx on audit_log (timestamp desc);
