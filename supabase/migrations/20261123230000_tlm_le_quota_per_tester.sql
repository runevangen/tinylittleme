-- R166: personlig kvote for bildetolkning per tester-kode (valgfri). Tom (null) = fellesverdien i tlm_le_settings.per_code_quota (15).
-- Rune (kode «rune») har 100 mens funksjonen finpusses. Månedstaket (monthly_cap) gjelder fortsatt alle til sammen.
alter table public.tlm_testers add column if not exists le_quota int check (le_quota is null or le_quota between 0 and 1000);
-- tlm_le_reserve bruker coalesce(tlm_testers.le_quota, per_code_quota, 15): se funksjonen i databasen (samme som 20261123120000_tlm_leveleditor.sql, med dette tillegget).
update public.tlm_testers set le_quota = 100 where code = 'rune';
