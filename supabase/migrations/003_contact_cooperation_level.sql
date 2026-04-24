alter table public.contacts
  add column if not exists cooperation_level text;

create index if not exists contacts_cooperation_level_idx
  on public.contacts (cooperation_level);
