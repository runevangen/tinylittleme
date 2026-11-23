# Tekstdekning og norsk språk: oppsummering (v2.145, 2026-11-23)

## Tall
- **765** nb-tekster i `i18n.js` (alle har en-oversettelse).
- **57** nb-tekster i egne nb/en-ordbøker utenfor `i18n.js` (`difficulty.js` 13, `firstrun_logic.js` 9, `rewards.js` 8, `storage_logic.js` 27): oversatt, men bør flyttes til `i18n.js`.
- **ca. 756** hardkodede norske tekster uten oversettelse (telt etter filtrering, se `i18n_dekning.json`):
  - 189 innstillingsetiketter i ⚙ (ikke-admin; 63 admin-etiketter er utelatt)
  - 158 NYTT-menyen (`changes_data.js`: 79 rader × tittel + «slik tester du»)
  - 157 unike tekster i `levels/*.json` (hint, brettnavn, fare-meldinger, byggested- og portnavn; delmål har ofte `en`-felt og er ikke regnet med)
  - 165 øvrige: tester-panel/⚑ (38), figurens replikker (29, `voice.js`), fiender/sjef/toast i `main.js` (31+8+11), RETTELSER (19), ⚑ Send (8), versjonssjekk (7), gruppenavn (7), diverse
  - 48 statiske tekster i `index.html` (seierskjerm, tastehjelp), 24 brettnavn (`LEVELS`), 15 lydmikser-etiketter
- Totalt ca. **1 580** nb-tekster; ca. 48 % er ikke oversatt.

## De 10 verste norskfeilene
1. `${ev.id} gikk i stykker` / «Klemt av ${id}!»: rå id (f.eks. `bokstav_k`) vises til spilleren (main.js:2761, 2762, 2801, 1361).
2. «Staven ville gått gjennom en annen knute» (`grid.err.over`, `lab3d.m.why.over`): feil verbform, skal være «ville gå».
3. «Bytte fremgangen … med koden?» (`storage_logic.js:180`): skal være «Erstatte … med».
4. «vrer delen» (changes r112): skal være «vrir».
5. «Legoklosse» (`build.p.lego`): skal være «Legokloss».
6. «Tåler X» (`lab.name.taaler`): plassholderen «X» er blitt synlig navn.
7. «Sugd full!» (`voice.js`): «sugd» finnes ikke.
8. Anglisismer: SNAP PÅ/AV, SLOW, stamina, wind-up-robot, pillbug, flush, orbit-kamera, backlogg, Kant-shimmy.
9. Muntlig «røk/røyk» i byggefeil («Teipen røk», «Broen røyk») + «teip» vs knappen TAPE.
10. Dev-jargong i testerflaten: R-nummer og «PROTOTYPE» i ⚙-etiketter, og NYTT-titler på 200–330 tegn.

Andre funn: duplisert nøkkel `roll` i `voice.js` (replikkene «Og rull!» osv. brukes aldri); blanding av stikka/stikken, fram/frem, genvei/snarvei, sjef-maur/sjefsmaur; mange tekster over 150 tegn (`manual.menu`, `gate.intro`, `trh.help`, ⚙-etiketter). Tastenavn på mobil: ingen klare brudd funnet. `build.enterKey` «BYGG (B)», «Hold C» og «WASD» er gated på `!TOUCH`.

## Flytt først
1. **Innstillinger i `main.js` (189 etiketter)**: størst, og alle brukere ser dem. Kort etikett + hjelpelinje, uten R-numre.
2. **NYTT-menyen (`changes_data.js`)**: vises til testere. Legg til `en`-felt eller nøkler; kort ned titlene.
3. **Spillhendelser i `main.js`** (toast for fall, fiender, sjef, lagring, tester-boks, ⚑) og **`voice.js`**: det spilleren ser og hører hele tiden.
4. **Brett-JSON** (hint, fare-meldinger, byggested, port) og `LEVELS`: bruk samme mønster som `goals[].en` (felt `en` ved siden av `text`/`label`).
5. **RETTELSER, ⚑ Send, versjonssjekk** (`fixes_*`, `feedback_send.js`, `version_check_*`): små, rask gevinst.
6. Til slutt `index.html` (seierskjerm og PC-tastehjelp) og de fire egne ordbøkene (`difficulty`, `firstrun`, `rewards`, `storage`) inn i `i18n.js`.

Filer: `i18n_dekning.json` (dekning), `norsk_vurdering.json` (86 funn med forslag).
