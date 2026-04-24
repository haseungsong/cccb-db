create table if not exists public.audience_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  filter_json jsonb not null default '{}'::jsonb,
  result_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.outreach_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  channel text not null check (channel in ('email', 'whatsapp_test', 'csv')),
  audience_list_id uuid references public.audience_lists (id) on delete set null,
  filter_json jsonb not null default '{}'::jsonb,
  recipient_email text,
  recipient_count integer not null default 0,
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_followups (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  channel text not null default 'email',
  status text not null default 'planned',
  summary text not null,
  notes text,
  owner_label text,
  next_follow_up_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists contact_followups_contact_idx
  on public.contact_followups (contact_id);

create index if not exists contact_followups_next_follow_up_idx
  on public.contact_followups (next_follow_up_at);

alter table public.audience_lists enable row level security;
alter table public.outreach_campaigns enable row level security;
alter table public.contact_followups enable row level security;

create policy "authenticated users can read audience lists"
  on public.audience_lists for select
  to authenticated
  using (true);

create policy "authenticated users can read outreach campaigns"
  on public.outreach_campaigns for select
  to authenticated
  using (true);

create policy "authenticated users can read contact followups"
  on public.contact_followups for select
  to authenticated
  using (true);

create policy "admins and editors can mutate audience lists"
  on public.audience_lists for all
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

create policy "admins and editors can mutate outreach campaigns"
  on public.outreach_campaigns for all
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

create policy "admins and editors can mutate contact followups"
  on public.contact_followups for all
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
