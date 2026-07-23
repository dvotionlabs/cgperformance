-- cg performance — starter schema (Supabase / Postgres)
-- Run in order. Adjust types/constraints as the app takes shape.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- Venues
-- ─────────────────────────────────────────────
create table venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- e.g. 'UNTIL Liverpool Street'
  address text,
  opens_at time not null default '07:00',
  closes_at time not null default '19:00',
  created_at timestamptz not null default now()
);

insert into venues (name, address, opens_at, closes_at)
values ('UNTIL Liverpool Street', null, '07:00', '19:00');

-- ─────────────────────────────────────────────
-- Plans (the 4 weekly-frequency tiers)
-- Flat £50/session, priced monthly on a 4-week month.
-- ─────────────────────────────────────────────
create table plans (
  id uuid primary key default gen_random_uuid(),
  label text not null,                   -- e.g. '3x / week'
  sessions_per_week int not null check (sessions_per_week between 1 and 7),
  price_per_session numeric(10,2) not null default 50.00,
  weeks_per_month int not null default 4,
  monthly_price numeric(10,2) generated always as
    (sessions_per_week * price_per_session * weeks_per_month) stored,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into plans (label, sessions_per_week) values
  ('1x / week', 1),
  ('2x / week', 2),
  ('3x / week', 3),
  ('4x / week', 4);

-- ─────────────────────────────────────────────
-- Clients
-- ─────────────────────────────────────────────
create table clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone text,
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Subscriptions (client ↔ plan ↔ venue, tied to a Stripe subscription)
-- ─────────────────────────────────────────────
create type subscription_status as enum (
  'incomplete', 'active', 'past_due', 'paused', 'cancelled'
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  plan_id uuid not null references plans(id),
  venue_id uuid not null references venues(id),
  stripe_subscription_id text unique,
  stripe_mandate_id text,
  status subscription_status not null default 'incomplete',
  start_date date,
  next_billing_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_subscriptions_client on subscriptions(client_id);
create index idx_subscriptions_status on subscriptions(status);

-- ─────────────────────────────────────────────
-- Session bookings (individual 30-min slots against a subscription)
-- ─────────────────────────────────────────────
create type booking_status as enum (
  'booked', 'completed', 'cancelled', 'no_show'
);

create table session_bookings (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  venue_id uuid not null references venues(id),
  scheduled_at timestamptz not null,
  duration_minutes int not null default 30,
  status booking_status not null default 'booked',
  created_at timestamptz not null default now()
);

create index idx_bookings_client on session_bookings(client_id);
create index idx_bookings_scheduled_at on session_bookings(scheduled_at);

-- Prevent double-booking the same start time at the same venue
create unique index idx_bookings_no_double_book
  on session_bookings(venue_id, scheduled_at)
  where status = 'booked';

-- ─────────────────────────────────────────────
-- Payments (one row per Stripe invoice, for reconciliation)
-- ─────────────────────────────────────────────
create type payment_status as enum ('paid', 'failed', 'pending', 'refunded');

create table payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  stripe_invoice_id text unique,
  amount numeric(10,2) not null,
  status payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_payments_subscription on payments(subscription_id);

-- ─────────────────────────────────────────────
-- Webhook event log (idempotency for Stripe webhook redeliveries)
-- ─────────────────────────────────────────────
create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);
