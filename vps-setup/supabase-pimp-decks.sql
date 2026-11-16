-- Pimp My Deck: decklists saved by signed-in members (pimp.html, js/pimp.js).
-- Run once in Supabase > SQL Editor. Row level security: each member only sees,
-- creates, edits and deletes their own decks.
--   owned: card keys ("snatch|1") the member ticked as "I have the pimp version".

create table if not exists public.pimp_decks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  decklist    text not null check (char_length(decklist) <= 20000),
  owned       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists pimp_decks_user_id_idx on public.pimp_decks (user_id);

alter table public.pimp_decks enable row level security;

drop policy if exists "pimp_decks_select_own" on public.pimp_decks;
drop policy if exists "pimp_decks_insert_own" on public.pimp_decks;
drop policy if exists "pimp_decks_update_own" on public.pimp_decks;
drop policy if exists "pimp_decks_delete_own" on public.pimp_decks;

create policy "pimp_decks_select_own" on public.pimp_decks
  for select using (auth.uid() = user_id);
create policy "pimp_decks_insert_own" on public.pimp_decks
  for insert with check (auth.uid() = user_id);
create policy "pimp_decks_update_own" on public.pimp_decks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pimp_decks_delete_own" on public.pimp_decks
  for delete using (auth.uid() = user_id);

-- Keeps updated_at current on every edit.
create or replace function public.pimp_decks_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists pimp_decks_touch on public.pimp_decks;
create trigger pimp_decks_touch before update on public.pimp_decks
  for each row execute function public.pimp_decks_touch();
