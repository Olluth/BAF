-- Link member accounts to the players followed by the tournament tracker, so the server
-- can grant achievements from tournament results (api/achievements.js).
-- Run once in Supabase > SQL Editor.
--
--   player_name   : the player as written in tournament standings ("Antoine Billy")
--   player_status : 'approved' (linked) or 'pending' (another account already has this player)
--
-- A member who picks a player is linked right away ('approved'), unless another account is
-- already linked to that player: then it stays 'pending' until an admin decides. Members
-- can't set the status themselves; an admin (profiles.is_admin), the server (service key)
-- or the SQL editor can.

alter table public.profiles
  add column if not exists player_name text,
  add column if not exists player_status text;

alter table public.profiles drop constraint if exists profiles_player_status_check;
alter table public.profiles add constraint profiles_player_status_check
  check (player_status is null or player_status in ('pending', 'approved'));

-- One approved account per player
create unique index if not exists profiles_player_approved_unique
  on public.profiles (lower(player_name)) where player_status = 'approved';

create or replace function public.profiles_player_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  caller_is_admin boolean := false;
begin
  -- Server (service key) and the SQL editor may set anything
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;
  select coalesce(p.is_admin, false) into caller_is_admin from public.profiles p where p.id = auth.uid();
  if coalesce(caller_is_admin, false) then
    return new;
  end if;

  new.player_name := nullif(trim(new.player_name), '');
  if tg_op = 'INSERT' or new.player_name is distinct from old.player_name then
    if new.player_name is null then
      new.player_status := null;
    elsif exists (select 1 from public.profiles p
                  where p.player_status = 'approved' and lower(p.player_name) = lower(new.player_name) and p.id <> new.id) then
      new.player_status := 'pending';   -- already someone else's: an admin decides
    else
      new.player_status := 'approved';  -- linked right away
    end if;
  else
    new.player_status := old.player_status;
  end if;
  return new;
end $$;

drop trigger if exists profiles_player_guard on public.profiles;
create trigger profiles_player_guard
  before insert or update on public.profiles
  for each row execute function public.profiles_player_guard();
