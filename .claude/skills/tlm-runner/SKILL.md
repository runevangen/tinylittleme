---
name: tlm-runner
description: Kjør roadmap-runneren (tools/roadmap_runner.workflow.js) for flere punkter i tinylittleme, og rydd opp etterpå. Bruk når flere ROADMAP-punkter skal bygges parallelt av agenter.
---
# Roadmap-runneren

- Skript: `tools/roadmap_runner.workflow.js`, args `{ items: [{ id: 'R182', deps: [] }, …], branch }`. Inntil 5 punkter om gangen, tester-saker først.
- Hvert punkt bygges i egen worktree `/tmp/wt/Rnnn`, vurderes av en kritiker og slås så sammen **seriell** inn i hovedmappa.
- **Aldri to runnere samtidig.** Ikke rediger hovedmappa mens en sammenslåing pågår (`MERGE_HEAD` eller `UU`-filer). Commit eget arbeid før runneren integrerer.
- Når den melder ferdig:
  1. `git worktree prune`
  2. `git status` og `git log --oneline -8`: ingen halvferdig merge, versjonen er økt riktig
  3. `npm test` (ekte exit-kode) og `NODE_PATH=$(npm root -g) npm run boot`
  4. Sjekk at NYTT-rader finnes på norsk og engelsk, og at `sync_edge --check` er grønn
  5. Push (se tlm-utlegging)
- Skriver en agent «npm test er ikke kjørt etter rebase»: følg det opp før noe slås sammen.
- Rapporter til Rune som Status; lenker til PR/issue skrives som `owner/repo#nr`.

Detaljer (oppdatert v2.208)
- Hvert punkt må ha en seksjon «### [ ] Rnnn · …» i `docs/ROADMAP.md` med **Bakgrunn**, **Krav** (nummerert) og **Ferdig når**; uten den kan ikke agentene bygge. Skriv den før du starter, og skriv inn spesifikasjonen fra Rune i hans ord (omformulert).
- En kjøring av ett stort punkt tar ca. 1–1,5 time (R182 og R49b). Under integrasjonen ligger endringer uforpliktet i hovedmappa (versjon, CHANGELOG, ROADMAP): ikke commit dem selv, vent på ferdigmeldingen.
- Etter omstart av containeren: les utdatafila til oppgaven (`…/tasks/<id>.output`) for resultatet; oppgaven kan ha blitt ferdig uten at du fikk meldingen.
- Konflikter i `changes_data.js`, `changes_text.js` og `docs/INNSTILLINGER.md` løses ved å beholde begge sider; versjonen settes til høyeste + 1.
- Små tester-saker kan gå utenom runneren i egen worktree (se tlm-utlegging) mens runneren jobber.
- Roller: **bygger** (egen worktree og gren `road/Rnnn`), **kritiker** (streng, mot «Ferdig når», kjører tester og skjermbilder), **integrator** (slår sammen til hovedgrenen og main én om gangen).
