-- R168: modellen for bildetolkning kan byttes uten ny utlegging: tlm_le_settings.model (tekst). Standard claude-sonnet-5-5.
-- Bytt med: update public.tlm_le_settings set value = '"claude-opus-5-5"' where key = 'model';
do $$
declare c text;
begin
  for c in select conname from pg_constraint where conrelid = 'public.tlm_le_settings'::regclass and contype = 'c' loop
    execute format('alter table public.tlm_le_settings drop constraint %I', c);
  end loop;
end $$;
alter table public.tlm_le_settings add constraint tlm_le_settings_key_check check (key in ('enabled', 'monthly_cap', 'per_code_quota', 'model'));
insert into public.tlm_le_settings (key, value) values ('model', '"claude-sonnet-5-5"'::jsonb) on conflict (key) do nothing;
