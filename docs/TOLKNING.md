# Tolkning av bilder til brett (R151, leveleditor fase A del 1)

Tjenesten som gjør 2–4 mobilbilder (rom inne eller lite område ute) til en **scene** (`docs/scene.schema.json`). Spillets del (knapp, fangst, ett-trykk-spørsmål) er R152; deling er R153.

## Deler
- `supabase/functions/tolk-bilder/index.ts`: edge function (Deno). Leser hemmeligheten `tinylittleme_Claude_API_KEY` fra miljøet (finnes bare der). Deploy: `supabase functions deploy tolk-bilder`.
- `leveleditor_logic.js`: all logikk (forespørsel, Claude-kall med bilder og tvunget verktøykall = strukturert utdata, personvern-rens, kostnad, hele kjeden `handleTolk` med avhengigheter inn). Ingen import, så samme fil brukes i edge og i spillet.
- `supabase/functions/_shared/`: kopier laget av `node tools/sync_edge.mjs` (kinds, logikk, validator, instruks og skjema). `test_leveleditor.mjs` feiler hvis de er utdatert.
- `supabase/migrations/20261123120000_tlm_leveleditor.sql`: `tlm_le_settings` (av-bryter `enabled`, `monthly_cap` 200, `per_code_quota` 15), `tlm_le_usage` (bare tall: kode, antall bilder, kostnad, tid, utfall; **ingen bilder**), RLS på og ingen policyer, `tlm_le_reserve` / `tlm_le_finish` (bare `service_role`). Feilede tolkninger teller ikke mot tak og kvote.
- `tools/scene_pipeline.mjs`: `checkScene(scene)` = scene2level + boten (node).

## Kall
`POST /functions/v1/tolk-bilder` med `{ code, images: [{ media_type, data(base64) }], answers: { goal: top|out|treasure, difficulty: easy|medium|hard, theme, foes } }`.
Svar: `{ ok: true, scene, warnings, check, usage, left }` eller `{ ok: false, reason, message }` (`kode`, `av`, `tak`, `kvote`, `bilder`, `for_stor`, `tolkning`, `nett`, `feil`; norske meldinger i `REASONS`).

## Av og på, tak
- Slå av: `update tlm_le_settings set value = 'false' where key = 'enabled';` (på: `'true'`).
- Tak/kvote: `update tlm_le_settings set value = '200' where key = 'monthly_cap';` (`per_code_quota` tilsvarende). Taket stopper automatisk (`tak`).
- Forbruk: `select date_trunc('month', created_at), count(*), sum(cost_usd), avg(ms) from tlm_le_usage where status = 'ok' group by 1;`

## Begrensninger og åpne punkter
- **scene2level og boten kjører ikke i edge** (de trenger filsystem og fysikken). Edge-svaret har `check: { ran: false }`, og `check` er en avhengighet som en node-vert kan fylle med `checkScene`. R152 må velge: egen node-vert, eller gjøre scene→brett om til en ren funksjon som også kjører i nettleseren (scene2level er i dag et skript).
- Ekte kall mot Claude er ikke kjørt (migrasjon og funksjon er ikke deployet fra denne grenen): gjøres etter sammenslåing, med en liten syntetisk scene eller bilder via R152.
