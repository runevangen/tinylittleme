-- R151: tolkning av bilder til brett (leveleditor fase A). Se docs/TOLKNING.md.
-- Ingen bilder lagres noe sted: tabellen under har bare tall (antall bilder, kostnad, tid, utfall).
-- Alt går via edge-funksjonen `tolk-bilder` (service_role). anon og authenticated har ingen tilgang til tabellene eller funksjonene.

create table if not exists public.tlm_le_settings (
  key text primary key check (key in ('enabled', 'monthly_cap', 'per_code_quota')),
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.tlm_le_settings (key, value) values
  ('enabled', 'true'::jsonb),          -- av-bryter: sett til false for å stoppe alle tolkninger umiddelbart
  ('monthly_cap', '200'::jsonb),       -- tak på tolkninger per kalendermåned (UTC), stopper automatisk
  ('per_code_quota', '15'::jsonb)      -- tolkninger per tester-kode per kalendermåned
on conflict (key) do nothing;

create table if not exists public.tlm_le_usage (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tester_code text not null references public.tlm_testers (code),
  photos int not null check (photos between 2 and 4),
  status text not null default 'reservert' check (status in ('reservert', 'ok', 'feil')),
  cost_usd numeric(8, 4) check (cost_usd is null or cost_usd >= 0),
  ms int check (ms is null or ms >= 0),
  warnings int check (warnings is null or warnings >= 0),
  bot text check (bot is null or length(bot) <= 40),
  reason text check (reason is null or length(reason) <= 40)
);
create index if not exists tlm_le_usage_month on public.tlm_le_usage (created_at);
create index if not exists tlm_le_usage_code on public.tlm_le_usage (tester_code, created_at);

alter table public.tlm_le_settings enable row level security;
alter table public.tlm_le_usage enable row level security;
-- ingen policyer: bare service_role (omgår RLS) kommer til
revoke all on public.tlm_le_settings, public.tlm_le_usage from anon, authenticated;

-- Atomisk reservasjon: gyldig aktiv tester, av-bryter, månedstak og kvote per kode. Feilede tolkninger teller ikke.
create or replace function public.tlm_le_reserve(p_code text, p_photos int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_code text := lower(trim(coalesce(p_code, '')));
  v_enabled boolean; v_cap int; v_quota int; v_month timestamptz := date_trunc('month', now() at time zone 'utc') at time zone 'utc';
  v_total int; v_mine int; v_id uuid;
begin
  perform pg_advisory_xact_lock(7151001);   -- seriell: to samtidige kall kan ikke begge slippe forbi taket
  if not exists (select 1 from tlm_testers where code = v_code and active) then return jsonb_build_object('ok', false, 'reason', 'kode'); end if;
  select coalesce((value)::text::boolean, false) into v_enabled from tlm_le_settings where key = 'enabled';
  if not coalesce(v_enabled, false) then return jsonb_build_object('ok', false, 'reason', 'av'); end if;
  select coalesce((value)::text::int, 200) into v_cap from tlm_le_settings where key = 'monthly_cap';
  select coalesce((value)::text::int, 15) into v_quota from tlm_le_settings where key = 'per_code_quota';
  select count(*) filter (where status <> 'feil'), count(*) filter (where status <> 'feil' and tester_code = v_code)
    into v_total, v_mine from tlm_le_usage where created_at >= v_month;
  if v_total >= coalesce(v_cap, 200) then return jsonb_build_object('ok', false, 'reason', 'tak'); end if;
  if v_mine >= coalesce(v_quota, 15) then return jsonb_build_object('ok', false, 'reason', 'kvote'); end if;
  insert into tlm_le_usage (tester_code, photos) values (v_code, p_photos) returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'left_month', v_cap - v_total - 1, 'left_code', v_quota - v_mine - 1);
end $$;

create or replace function public.tlm_le_finish(p_id uuid, p_ok boolean, p_cost numeric, p_ms int, p_warnings int, p_bot text, p_reason text)
returns void language sql security definer set search_path = public as $$
  update tlm_le_usage set status = case when p_ok then 'ok' else 'feil' end, cost_usd = p_cost, ms = p_ms,
    warnings = p_warnings, bot = left(p_bot, 40), reason = left(p_reason, 40) where id = p_id;
$$;

revoke all on function public.tlm_le_reserve(text, int), public.tlm_le_finish(uuid, boolean, numeric, int, int, text, text) from public, anon, authenticated;
grant execute on function public.tlm_le_reserve(text, int), public.tlm_le_finish(uuid, boolean, numeric, int, int, text, text) to service_role;
