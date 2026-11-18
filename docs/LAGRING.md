# Lagring og fremdrift (R86)

All lagring ligger i nettleserens `localStorage` på enheten, under nøkler som starter med `tlm.`. Ingenting lagres på server (se `docs/TILBAKEMELDING.md` for det som sendes). Alt går via `disk`/`store` i `main.js` (laget `createStore` i `storage_logic.js`); ingen direkte `localStorage`-kall (en test passer på det).

## Regler for laget
- **Les:** ugyldig JSON, feil type (liste der objekt ventes) eller manglende nøkkel gir standardverdien. Nøkkelen slettes ikke, bare noteres som korrupt (`disk.status().corrupt`).
- **Skriv:** feil (kvote full, privat modus) kaster aldri. Feilen telles, logges (`logEv('lagring', …)`) og vises én gang som melding og som rød linje på hovedmenyen.
- **Aldri sletting av andre nøkler:** «Nytt spill» og «Nullstill alt» fjerner bare nøkler som begynner med `tlm.`, og bare de som er listet under. Tester-koden beholdes alltid.
- **Kinomodus** (`?cinema=1`) leser bare standarder og skriver aldri.

## Versjonering og migrering
- `tlm.storev` = formatversjon for lagringen som helhet (nå 3). `migrateAll` kjører ved oppstart, leser hver struktur, bringer den til nyeste form og skriver bare tilbake det som endret seg. Den sletter aldri noe; noe som ikke ligner fremgang lates stå.
- **Fremgang per brett** (`tlm.progress.*`) har `v`-felt (nå 3). Formene: v0 `{save, auto, stats, clock, fails}` · v1 + `crumbs, puzzles, goals, goalFlags, build` · v2 + `gates, dmin` (uten v-felt) · v3 = v2 + `v`. `normProgress` leser alle fire. Nytt felt i fremgangen: legg det til i `normProgress`, øk `PROGRESS_VERSION` og `STORE_VERSION`, legg en fixture i `test_storage.mjs`.
- `tlm.cleared`: nå `{brett: poeng}`; eldre former (liste med id-er, `true`) leses. `tlm.runs`: nå `{brett: {t, ants, crumbs, total}}`; eldre: bare tiden. `tlm.badges`: nå `{brett: {beginner, medium, expert}}`; eldre: liste med id-er.
- Fixtures fra gamle formater ligger i `test_storage.mjs`; testen krever at fremgangen leses riktig etter «oppdatering».

## Nøkler
| Nøkkel | Holder | Skriver | Versjon/migrering | Ved feil |
|---|---|---|---|---|
| `tlm.progress.<brett>[.rN][.<nivå>]` | sist lagrede sted, tid, smuler, gåter, delmål, porter, bygg per brett og vanskelighet (Nybegynner bruker nøkkelen uten nivå, «gammel fremgangsnøkkel», R69/R84) | `saveProgress` (autolagring, pagehide, avslutt til meny) | ja (`v`, `normProgress`) | ikke fremgang: ignoreres, brettet starter på nytt; nøkkelen står |
| `tlm.cleared` | klarte brett og beste poeng | målgang | ja (`normCleared`) | tom |
| `tlm.runs` | siste tid, maur og smuler per brett | målgang | ja (`normRuns`) | tom |
| `tlm.badges` | bronse/sølv/gull per brett (R69) | målgang (`awardBadge`) | ja (`normBadges`) | tom |
| `tlm.best`, `tlm.unlocks`, `tlm.equip` | rekorder, opplåst og valgt tilbehør (R16) | `rewards.js` | ikke endret form | tom |
| `tlm.bstars`, `tlm.bbonus`, `tlm.gstage` | byggestjerner, ekstradeler, bestått byggested (R47, R74) | `rewards.js`, `grid_stage.js` | ikke endret form | tom |
| `tlm.level`, `tlm.difficulty`, `tlm.done` | sist spilte brett, valgt vanskelighet, ferdig-flagg | menyen og målgang | nei | standard (bad, medium, false) |
| `tlm.storySeen.<brett>`, `tlm.cardseen.<brett>`, `tlm.seen.*` | sett fortelling og hjelpekort | brettstart og kort | nei | vises igjen |
| `tlm.tcode` | tester-kode | ⚙ → Test | nei | tom (ingen sending) |
| `tlm.changechecks`, `tlm.replies` | lokale avkryssinger i NYTT og RETTELSER (R80/R83) | menyene | nei | tom |
| `tlm.verupd`, `tlm.vercheck*` | versjonsjekk (R77) | `version_check_view.js` | nei | standard |
| `tlm.storev` | formatversjon | `migrateAll`, import | – | 0 (migrering kjører) |
| alle andre `tlm.*` | én innstilling hver (`SETTINGS` i `main.js`), lyd, kamera, panel åpent, logg (`tlm.evlog`) | ⚙ | nei; ukjente verdier klemmes av innstillingen | standard |

Byggekoder (broer) lagres som en del av `tlm.progress.*` (`build`) og deles som tekstkode (KODE/BESTE); de sendes bare når spilleren selv deler dem (se TILBAKEMELDING.md).

## Det spilleren ser
- **Hovedmenyen:** «Fortsett fra forrige gang» viser sist spilte brett, vanskelighet og tid (f.eks. «Nivå 1 · Bad · Medium · 3:12»). «Nytt spill» viser en oversikt over hva som slettes og beholdes, med AVBRYT og SLETT OG START NYTT, FØR noe slettes. Er lagring umulig (privat modus, full), står det en rød linje.
- **⚙ → Spill:** statuslinje («✓ Lagret på denne enheten: 3 brett …»), KOPIER FREMGANG og LIM INN FREMGANG.
- **⚙ → Admin** (7 trykk på tittelen): «Nullstill alt», med samme bekreftelse som viser hva som slettes. Tester-koden beholdes. Valget «Vis bekreftelse før NYTT SPILL» kan slås av der.
- **«Nytt spill» sletter:** `tlm.progress.*`, `tlm.storySeen.*`, `tlm.cardseen.*`, `tlm.runs`. Beholder: klarte brett, merker, tilbehør, innstillinger, tester-kode (uendret fra før R86).

## Eksport og import (flytte mellom enheter)
KOPIER FREMGANG lager en tekstkode `TLMSAVE1.<tekst>` av fremgang, klarte brett, tider, merker, tilbehør, byggestjerner og tester-koden (ikke innstillinger: de har egne knapper under Test). LIM INN FREMGANG leser koden (tåler tekst rundt), viser antall brett og spør før den bytter fremgangen; fremmede nøkler og ugyldig fremgang hoppes over, og alt normaliseres til nyeste form. Spillet laster på nytt etterpå. Koden er vanlig base64 av JSON og kan være noen titalls tusen tegn med mange bygg; over 2 000 000 tegn avvises.

## Ikke med
Server-lagring av fremgang (ingen innlogging) og endring av nøkkelnavn (ville brutt eksisterende lagring).

## Må testes på iPhone
Oppdatering fra gammel versjon med ekte fremgang; lukk fanen og åpne igjen (Safari kan tømme lagring etter 7 dagers inaktivitet uten installert app); KOPIER/LIM INN mellom to enheter (utklippstavle-tillatelsen i Safari).
