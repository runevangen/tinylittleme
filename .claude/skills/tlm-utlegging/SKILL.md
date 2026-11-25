---
name: tlm-utlegging
description: Legg ut en ferdig endring i tinylittleme: versjon, CHANGELOG, NYTT-rad (norsk og engelsk), tester, oppstartstest, sammenslåing og push til main. Bruk før hver commit/push i dette repoet.
---
# Utlegging (tinylittleme)

Mål: brukeren tester fra GitHub Pages (`main`), så hver ferdig endring skal ut uten å spørre, men bare når alt er grønt.

1. **Versjon:** øk `VERSION` i `version.js` (sjekk først `git fetch origin main` og `git show origin/main:version.js`; runneren kan ha økt den). Aldri skriv filen med `open('w').write(open().read())`: den blir tom.
2. **CHANGELOG.md:** én linje øverst (`- **2.NNN** – Rxx: hva og hvorfor (filer)`).
3. **NYTT-meny (R83):** hver brukersynlig endring får rad i `changes_data.js` (id, version, date, title, how, level, spot) *og* engelsk rad i `changes_text.js` (`'<id>': [null, enTitle, enHow]`). `how` = 1–3 trinn med knappene (TA, HOPP, GREP, ⚙ …), ikke taster. Bruk ekte linjeskift, aldri bokstavelig `\n`.
4. **ROADMAP/INNSTILLINGER:** marker punktet `[x]` i `docs/ROADMAP.md`; nye innstillinger i `docs/INNSTILLINGER.md`.
5. Rører du `leveleditor_logic.js` eller kinds/prompt: `node tools/sync_edge.mjs` (og `--check`).
6. **Tester med ekte exit-kode** (ca. 8 min; aldri to `npm test` samtidig, og ikke rediger filer mens de går) (aldri `| tail` som skjuler feil):
   `npm test > /tmp/t.log 2>&1; echo EXIT=$? >> /tmp/t.log` (kjør i bakgrunnen, ca. 5–10 min; vent med Monitor på `^EXIT=`).
   `NODE_PATH=$(npm root -g) npm run boot > /tmp/boot.log 2>&1; echo EXIT=$?` må vise `boot: ok` og ny versjon.
7. Commit (avslutt meldingen med attribusjonslinjene fra miljøet), `git fetch origin main && git merge --no-edit origin/main`, så
   `git push origin HEAD:main` og `git push -u origin HEAD:<utviklingsgrenen>`. Er push avvist: hent og slå sammen, aldri tving.
8. Svar til Rune slutter alltid med **Status**: (1) pushet til main + versjon, (2) hva er gjort, (3) hvordan teste på mobil med knappene.
9. **Rett etter push** (fast regel fra Rune): hent nye rader i `tlm_feedback` (`status = 'ny'`) og si i Status om det er noe nytt, og foreslå neste skritt fra `BACKLOG.md`/`docs/ROADMAP.md` som klikkbare valg (AskUserQuestion, anbefalt først).
10. **Parallelt arbeid:** mens runneren jobber i hovedmappa, bygg små ting i en egen worktree (`git worktree add /tmp/wt/<navn> -b road/<navn> origin/main`), kjør `npm test` og `npm run boot` der, og push med `git push origin road/<navn>:main`. Fjern worktree etterpå (`git worktree remove --force`, `git worktree prune`). Runneren henter origin/main før den slår sammen.
11. Docs-only commit får også versjonsøkning og CHANGELOG-linje. Stop-hooken ber om commit og push av alt som ligger uforpliktet: ikke ta med halvferdig agentarbeid i hovedmappa.
Sist oppdatert v2.208 (Rune: sjekk skills for utdatering ved større utlegginger).
