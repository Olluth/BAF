-- Link member accounts to the players followed by the tournament tracker, so the server
-- can grant achievements from tournament results (api/achievements.js).
-- Run once in Supabase > SQL Editor (running it again is harmless).
--
--   player_name   : the player as written in tournament standings ("Antoine Billy"). Either
--                   picked from the followed players, or typed by the member when they ask
--                   to be followed (then not in the list yet).
--   player_status : 'pending' (chosen by the member, to be checked) or 'approved' (an admin
--                   checked it really is them).
--
-- A member can set or change their own player_name, but it always goes back to 'pending':
-- only an admin (profiles.is_admin), the server (service key) or the SQL editor can approve.

alter table public.profiles
  add column if not exists player_name text,
  add column if not exists player_status text;

alter table public.profiles drop constraint if exists profiles_player_status_check;
alter table public.profiles add constraint profiles_player_status_check
  check (player_status is null or player_status in ('pending', 'approved'));

alter table public.profiles drop constraint if exists profiles_player_name_length;
alter table public.profiles add constraint profiles_player_name_length
  check (player_name is null or char_length(player_name) <= 80);

-- One approved account per player
create unique index if not exists profiles_player_approved_unique
  on public.profiles (lower(player_name)) where player_status = 'approved';

create or replace function public.profiles_player_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  caller_is_admin boolean := false;
begin
  -- Server (service key) and the SQL editor may set anything. session_user, not
  -- current_user: inside this security definer function current_user is always its owner.
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' or session_user in ('postgres', 'supabase_admin') then
    return new;
  end if;
  select coalesce(p.is_admin, false) into caller_is_admin from public.profiles p where p.id = auth.uid();
  if coalesce(caller_is_admin, false) then
    return new;
  end if;

  -- A member: any new or changed player goes back to 'pending'; the status itself can't be touched.
  new.player_name := nullif(trim(new.player_name), '');
  if tg_op = 'INSERT' or new.player_name is distinct from old.player_name then
    new.player_status := case when new.player_name is null then null else 'pending' end;
  else
    new.player_status := old.player_status;
  end if;
  return new;
end $$;

drop trigger if exists profiles_player_guard on public.profiles;
create trigger profiles_player_guard
  before insert or update on public.profiles
  for each row execute function public.profiles_player_guard();
