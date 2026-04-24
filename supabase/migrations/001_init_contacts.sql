create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create or replace function public.normalize_search_text(input text)
returns text
language sql
immutable
parallel safe
as $$
  select trim(
    translate(
      lower(coalesce(input, '')),
      'áàâãäéèêëíìîïóòôõöúùûüçñ',
      'aaaaaeeeeiiiiooooouuuucn'
    )
  );
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  role text not null default 'editor',
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  job_title text,
  email text,
  phone text,
  website text,
  address text,
  city text,
  country text default 'Brazil',
  category_id uuid references public.categories (id) on delete set null,
  owner_staff_id uuid references public.staff_members (id) on delete set null,
  is_influencer boolean not null default false,
  is_media boolean not null default false,
  contact_status text not null default 'active',
  primary_source_type text not null default 'legacy',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_images (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  storage_path text not null,
  image_kind text not null default 'profile',
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date,
  location text,
  source_sheet_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_events (
  contact_id uuid not null references public.contacts (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  invite_status text,
  attendance_status text,
  notes text,
  created_at timestamptz not null default now(),
  primary key (contact_id, event_id)
);

create table if not exists public.business_cards (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts (id) on delete set null,
  image_original_path text not null,
  image_preview_path text not null,
  ocr_raw_text text,
  extracted_json jsonb not null default '{}'::jsonb,
  language_hint text not null default 'pt-BR',
  review_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  source_file_name text not null,
  imported_by uuid references auth.users (id) on delete set null,
  status text not null default 'pending',
  imported_at timestamptz not null default now()
);

create table if not exists public.legacy_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches (id) on delete cascade,
  sheet_name text not null,
  row_number integer not null,
  raw_json jsonb not null,
  mapped_contact_id uuid references public.contacts (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_audit_logs (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists contacts_name_trgm_idx
  on public.contacts using gin (public.normalize_search_text(name) gin_trgm_ops);

create index if not exists contacts_company_trgm_idx
  on public.contacts using gin (public.normalize_search_text(company) gin_trgm_ops);

create index if not exists contacts_email_idx on public.contacts (email);
create index if not exists contacts_phone_idx on public.contacts (phone);

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.contact_images enable row level security;
alter table public.events enable row level security;
alter table public.contact_events enable row level security;
alter table public.business_cards enable row level security;
alter table public.import_batches enable row level security;
alter table public.legacy_rows enable row level security;
alter table public.contact_audit_logs enable row level security;

create policy "authenticated users can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "authenticated users can read contacts"
  on public.contacts for select
  to authenticated
  using (true);

create policy "editors can mutate contacts"
  on public.contacts for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'editor')
    )
  );

create policy "authenticated users can read related tables"
  on public.contact_images for select
  to authenticated
  using (true);

create policy "authenticated users can read events"
  on public.events for select
  to authenticated
  using (true);

create policy "authenticated users can read contact events"
  on public.contact_events for select
  to authenticated
  using (true);

create policy "authenticated users can read business cards"
  on public.business_cards for select
  to authenticated
  using (true);

create policy "admins and editors can mutate related tables"
  on public.contact_images for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'editor')
    )
  );

create policy "admins and editors can mutate events"
  on public.events for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'editor')
    )
  );

create policy "admins and editors can mutate contact events"
  on public.contact_events for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'editor')
    )
  );

create policy "admins and editors can mutate business cards"
  on public.business_cards for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'editor')
    )
  );

create policy "admins can manage import batches"
  on public.import_batches for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "admins can manage legacy rows"
  on public.legacy_rows for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "admins and editors can read audit logs"
  on public.contact_audit_logs for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'editor')
    )
  );
