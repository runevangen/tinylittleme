-- R153: del brett med kode. Privat som standard: ingen direkte tilgang (RLS på, ingen policyer), alt går gjennom funksjonene under, og alle krever gyldig tester-kode.
-- Brettet er tall og former (JSON), aldri bilder. Eier kan slette sitt brett; alle testere kan melde et brett. Kvote: 20 delte brett per kode, 10 delinger per time.
create table if not exists public.tlm_rooms (
  code text primary key check (code ~ '^RM-[A-Z0-9]{8}$'),
  owner text not null,
  name text not null check (char_length(name) between 1 and 30),
  level jsonb not null check (pg_column_size(level) <= 200000),
  version text not null default '',
  reports int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.tlm_rooms enable row level security;
revoke all on public.tlm_rooms from anon, authenticated;
create index if not exists tlm_rooms_owner_idx on public.tlm_rooms (owner, created_at);

create or replace function public.tlm_share_room(c text, rc text, nm text, lvl jsonb, ver text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare k text := lower(trim(coalesce(c, '')));
begin
  if not tlm_private.is_tester(k) then return jsonb_build_object('ok', false, 'reason', 'kode'); end if;
  if rc !~ '^RM-[A-Z0-9]{8}$' or lvl is null or jsonb_typeof(lvl) <> 'object' or not (lvl ? 'boxes' and lvl ? 'start' and lvl ? 'goal') then return jsonb_build_object('ok', false, 'reason', 'feil'); end if;
  if pg_column_size(lvl) > 200000 then return jsonb_build_object('ok', false, 'reason', 'stor'); end if;
  if (select count(*) from public.tlm_rooms r where r.owner = k and r.created_at > now() - interval '1 hour') >= 10 then return jsonb_build_object('ok', false, 'reason', 'grense'); end if;
  if (select count(*) from public.tlm_rooms r where r.owner = k) >= 20 then return jsonb_build_object('ok', false, 'reason', 'fullt'); end if;
  insert into public.tlm_rooms (code, owner, name, level, version) values (rc, k, left(coalesce(nm, 'Mitt brett'), 30), lvl, left(coalesce(ver, ''), 20))
    on conflict (code) do update set name = excluded.name, level = excluded.level, version = excluded.version where public.tlm_rooms.owner = k;
  return jsonb_build_object('ok', true, 'code', rc);
end $$;

create or replace function public.tlm_get_room(c text, rc text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare k text := lower(trim(coalesce(c, ''))); r public.tlm_rooms;
begin
  if not tlm_private.is_tester(k) then return jsonb_build_object('ok', false, 'reason', 'kode'); end if;
  select * into r from public.tlm_rooms where code = rc and not hidden;
  if not found then return jsonb_build_object('ok', false, 'reason', 'finnes ikke'); end if;
  return jsonb_build_object('ok', true, 'name', r.name, 'level', r.level);   -- aldri eier
end $$;

create or replace function public.tlm_delete_room(c text, rc text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare k text := lower(trim(coalesce(c, ''))); n int;
begin
  if not tlm_private.is_tester(k) then return jsonb_build_object('ok', false, 'reason', 'kode'); end if;
  delete from public.tlm_rooms where code = rc and owner = k; get diagnostics n = row_count;
  return case when n > 0 then jsonb_build_object('ok', true) else jsonb_build_object('ok', false, 'reason', 'finnes ikke') end;
end $$;

create or replace function public.tlm_report_room(c text, rc text, note text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare k text := lower(trim(coalesce(c, ''))); n int;
begin
  if not tlm_private.is_tester(k) then return jsonb_build_object('ok', false, 'reason', 'kode'); end if;
  update public.tlm_rooms set reports = reports + 1, hidden = (reports + 1 >= 3) where code = rc; get diagnostics n = row_count;   -- tre meldinger skjuler brettet til Rune ser på det
  return case when n > 0 then jsonb_build_object('ok', true) else jsonb_build_object('ok', false, 'reason', 'finnes ikke') end;
end $$;

revoke all on function public.tlm_share_room(text, text, text, jsonb, text), public.tlm_get_room(text, text), public.tlm_delete_room(text, text), public.tlm_report_room(text, text, text) from public;
grant execute on function public.tlm_share_room(text, text, text, jsonb, text), public.tlm_get_room(text, text), public.tlm_delete_room(text, text), public.tlm_report_room(text, text, text) to anon, authenticated;
