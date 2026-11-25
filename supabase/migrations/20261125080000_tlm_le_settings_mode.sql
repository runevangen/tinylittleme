-- R180/R181: modus for bildetolkning i tjenesten: 'direkte' (ett kall), 'tenk' (analyse først, så scene), 'tenk_kritikk' (+ kritikkrunde). Standard 'tenk'.
-- Bytt med: update public.tlm_le_settings set value = '"tenk_kritikk"' where key = 'mode';  (en tester kan også velge per kall i ⚙ → Admin)
do $$
declare c text;
begin
  for c in select conname from pg_constraint where conrelid = 'public.tlm_le_settings'::regclass and contype = 'c' loop
    execute format('alter table public.tlm_le_settings drop constraint %I', c);
  end loop;
end $$;
alter table public.tlm_le_settings add constraint tlm_le_settings_key_check check (key in ('enabled', 'monthly_cap', 'per_code_quota', 'model', 'mode'));
insert into public.tlm_le_settings (key, value) values ('mode', '"tenk"'::jsonb) on conflict (key) do nothing;
