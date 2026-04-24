create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text default '#0f766e',
  created_at timestamptz not null default now()
);

create table if not exists public.contact_tags (
  contact_id uuid not null references public.contacts (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contact_id, tag_id)
);

create table if not exists public.event_tags (
  event_id uuid not null references public.events (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, tag_id)
);

create index if not exists tags_name_idx on public.tags (name);

alter table public.tags enable row level security;
alter table public.contact_tags enable row level security;
alter table public.event_tags enable row level security;

create policy "authenticated users can read tags"
  on public.tags for select
  to authenticated
  using (true);

create policy "authenticated users can read contact tags"
  on public.contact_tags for select
  to authenticated
  using (true);

create policy "authenticated users can read event tags"
  on public.event_tags for select
  to authenticated
  using (true);

create policy "admins and editors can mutate tags"
  on public.tags for all
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

create policy "admins and editors can mutate contact tags"
  on public.contact_tags for all
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

create policy "admins and editors can mutate event tags"
  on public.event_tags for all
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
