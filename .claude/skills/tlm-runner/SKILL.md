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
