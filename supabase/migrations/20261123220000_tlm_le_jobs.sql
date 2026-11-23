-- R164: jobber for «lag brett fra bilder». Tjenesten svarer straks med en jobb-id og gjør tolkningen i bakgrunnen; telefonen spør til den er ferdig.
-- Raden inneholder bare status og ferdig svar (scene = tall og former). Aldri bilder. Slettes etter 10 minutter (ved neste start).
-- Bare edge-funksjonen (service_role) kommer til tabellen.
create table if not exists public.tlm_le_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tester_code text not null references public.tlm_testers (code),
  status text not null default 'kjorer' check (status in ('kjorer', 'ferdig')),
  result jsonb check (result is null or pg_column_size(result) <= 400000)
);
create index if not exists tlm_le_jobs_created on public.tlm_le_jobs (created_at);
alter table public.tlm_le_jobs enable row level security;
revoke all on public.tlm_le_jobs from anon, authenticated;
