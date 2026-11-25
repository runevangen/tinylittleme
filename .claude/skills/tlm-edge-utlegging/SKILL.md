---
name: tlm-edge-utlegging
description: Legg ut Supabase-funksjonen tolk-bilder (bilde → brett) trygt: filsett, forkortede kopier, innstillinger, hemmelighet og tilbakerulling. Bruk når leveleditor_logic.js, kinds, prompt eller index.ts i supabase/functions endres.
---
# Utlegging av `tolk-bilder` (Supabase-prosjekt `pthpjpxfbfvgoqkqxotj`)

Bakgrunn (v2.208): `supabase/functions/tolk-bilder/index.ts` i repoet er nå i takt med det utlagte (leser `model` og `mode` fra `tlm_le_settings`, jobber ryddes etter 60 min, tidsgrenser settes øverst: `LE.budgetMs = 540000; JOB.staleMs = 12 min`). Den utlagte funksjonen er limt inn via Supabase-verktøyet, ikke via CLI. Repoets `supabase/functions/tolk-bilder/index.ts` er kilden, men den utlagte versjonen har filene flatt ved siden av `index.ts` (import `./leveleditor_logic.js` osv.) og **forkortede** kopier av `validate_scene.js`, `kinds.js` og `generated.js`.

Sjekkliste
1. `node tools/sync_edge.mjs` og `--check` (kopien i `_shared/` er à jour). Prompten (`docs/VISJON_PROMPT.md`) og skjemaet hentes live fra GitHub `main` (5 min cache), så prompt-endringer trenger ikke ny utlegging, bare push.
2. Hent gjeldende versjon: `get_edge_function` (se at du bygger på det som ligger ute).
3. `deploy_edge_function` med **alle fem filer**, `entrypoint_path: index.ts`, `verify_jwt: true`. Gir kallet Bad Gateway: sjekk med `get_edge_function` om versjonen gikk opp før du prøver igjen.
4. Små tallendringer (tidsgrenser) settes i `index.ts` (`LE.budgetMs`, `JOB.staleMs`), så slipper du å endre logikkfila. Moduser: `direkte`, `tenk`, `tenk_kritikk`; modeller i `LE.models`.
5. Innstillinger i tabellen `tlm_le_settings` (`enabled`, `monthly_cap`, `per_code_quota`, `model`, `mode`); kvote per tester i `tlm_testers.le_quota`. Endres med `execute_sql`, ikke ny utlegging.
6. Migrasjoner: `apply_migration` og lagre filen i `supabase/migrations/`.
7. **Hemmeligheter:** API-nøkkelen (`tinylittleme_Claude_API_KEY`) skrives aldri i chat og leses aldri tilbake; Rune legger den inn som edge-secret selv.
8. Test: `get_edge_function` viser nytt versjonsnummer; be Rune lage et brett fra bilder og se `usage` (modell, modus, trinn, kostnad) i rapporten (⚑). Feil: `query_logs` (edge-function).
9. Rulle tilbake: legg ut forrige filsett igjen (hent det fra git-historikken eller forrige `get_edge_function`).

Tidsgrense: Supabase har egen grense for bakgrunnsjobber (150 s gratis, 400 s betalt). Lengre tolkninger må deles i flere kall.

Sist oppdatert v2.208. Utlegging via verktøyet kan gi «Bad Gateway» selv om den gikk gjennom: sjekk alltid versjonsnummeret med `get_edge_function` før du prøver igjen.
