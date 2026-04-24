alter table public.profiles
  add column if not exists team_name text;

alter table public.business_cards
  add column if not exists created_by uuid references auth.users (id) on delete set null;

create index if not exists business_cards_created_by_idx
  on public.business_cards (created_by);
