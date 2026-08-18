-- Metro Haul Moving & Junk Removal — production starter schema
-- Run in the dedicated Metro Haul Supabase project, not the Party Rentals database.
create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  service_type text not null check (service_type in ('residential','apartment','office','loading_unloading','furniture_delivery','junk_removal','other')),
  move_date date,
  preferred_time text,
  pickup_address text,
  pickup_city text,
  pickup_state text,
  pickup_zip text,
  destination_address text,
  destination_city text,
  destination_state text,
  destination_zip text,
  home_size text,
  pickup_stairs integer not null default 0 check (pickup_stairs >= 0),
  destination_stairs integer not null default 0 check (destination_stairs >= 0),
  pickup_elevator boolean not null default false,
  destination_elevator boolean not null default false,
  packing_needed boolean not null default false,
  specialty_items text,
  notes text,
  lead_source text not null default 'website',
  status text not null default 'new' check (status in ('new','contacted','estimate_pending','quoted','booked','won','lost','closed','spam')),
  assigned_to uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), first_name text not null,last_name text not null,email text,phone text,notes text
);
create table if not exists public.quotes (
 id uuid primary key default gen_random_uuid(),created_at timestamptz not null default now(),lead_id uuid references public.leads(id) on delete set null,customer_id uuid references public.customers(id) on delete set null,status text not null default 'DRAFT' check(status in('DRAFT','SENT','ACCEPTED','DECLINED','EXPIRED')),subtotal numeric(10,2) not null default 0,travel_fee numeric(10,2) not null default 0,discount numeric(10,2) not null default 0,total numeric(10,2) generated always as (subtotal+travel_fee-discount) stored,notes text
);
create table if not exists public.jobs (
 id uuid primary key default gen_random_uuid(),created_at timestamptz not null default now(),customer_id uuid references public.customers(id),quote_id uuid references public.quotes(id),status text not null default 'SCHEDULED' check(status in('SCHEDULED','CREW_ASSIGNED','EN_ROUTE','IN_PROGRESS','COMPLETED','CANCELLED')),move_date date,start_time time,pickup_address text,destination_address text,service_type text,notes text
);
create table if not exists public.crew_members (
 id uuid primary key default gen_random_uuid(),created_at timestamptz not null default now(),full_name text not null,phone text,email text,is_active boolean not null default true
);
create table if not exists public.crew_assignments (
 id uuid primary key default gen_random_uuid(),job_id uuid not null references public.jobs(id) on delete cascade,crew_member_id uuid not null references public.crew_members(id) on delete cascade,role text default 'mover',unique(job_id,crew_member_id)
);
create table if not exists public.payments (
 id uuid primary key default gen_random_uuid(),created_at timestamptz not null default now(),job_id uuid references public.jobs(id),customer_id uuid references public.customers(id),amount numeric(10,2) not null,status text not null default 'PENDING' check(status in('PENDING','PAID','FAILED','REFUNDED')),method text,external_reference text
);
create table if not exists public.notification_logs (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid references public.customers(id),
 lead_id uuid references public.leads(id),
 job_id uuid references public.jobs(id),
 channel text not null check (channel in ('email','sms','internal')),
 template_key text,
 recipient text,
 status text not null default 'queued' check (status in ('queued','sent','delivered','failed')),
 provider_message_id text,
 error_message text,
 payload jsonb not null default '{}'::jsonb,
 sent_at timestamptz,
 created_at timestamptz not null default now()
);

alter table public.leads enable row level security;
alter table public.customers enable row level security;
alter table public.quotes enable row level security;
alter table public.jobs enable row level security;
alter table public.crew_members enable row level security;
alter table public.crew_assignments enable row level security;
alter table public.payments enable row level security;
alter table public.notification_logs enable row level security;

-- Public website may INSERT a lead, but cannot read, update or delete leads.
create policy "public can submit moving leads" on public.leads for insert to anon
with check (status = 'new' and assigned_to is null);
grant insert on public.leads to anon;
-- Admin access should be added through authenticated user roles/app_metadata or a server-side admin API.
