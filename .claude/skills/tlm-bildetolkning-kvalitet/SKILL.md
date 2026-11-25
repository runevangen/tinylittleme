---
name: tlm-bildetolkning-kvalitet
description: Forbedre og sammenligne kvaliteten på brett laget fra bilder (tolk-bilder): modell, modus (direkte/tenk/tenk_kritikk), målinger, kostnad. Bruk når Rune sier at et brett ser dårligere ut enn forventet.
---
# Kvalitet i «brett fra bilder»

Lærdom
- Badet var håndkuratert og gjentatt; et enkeltkall med tvunget verktøy gir ingen tenkepause, ingen selvkritikk og bare enkle bokser. Kvalitet er viktigere enn ventetid (Rune: ingen tidsgrense).
- Moduser (⚙ → Admin → «Bildetolkning: modell/modus (test)»; standard i `tlm_le_settings`): `direkte` 1 kall, `tenk` analyse så scene, `tenk_kritikk` + kritikkrunde mot bildene (ca. 3 kall).
- Modeller: `claude-sonnet-4-5`, `claude-sonnet-5-5`, `claude-opus-5-5`, `claude-fable-5-2`. Opus/Fable-priser i `PRICES` er anslag.
- Målinger (bredde/dybde/høyde) gjør størst forskjell: `fitToMeasures` skalerer alt. `normalizeScene` fyller inn manglende `units`/`room`/start/mål.
- Møbelmaler med ekte former (R182: sofa, seng, skrivebord, bord, hylle, lampe, puff, koffert) som `shaped` kinds gir mer gjenkjennelige rom enn bokser.

Sammenligne
1. Lag samme bilder med ulike modell/modus; notér modell, modus, trinn og kostnad fra rapporten (`leveleditor`-logglinjen).
2. Vurder: skall (vegger, vinduer, dører), store møbler på riktig sted og høyde, ting som svever, mål nåbart.
3. Hjelpemidler: JUSTER, VIS TOLKNING, MÅL 1–4, FLY og NAVN/LISTE.

Personvern
- Bilder av hjem lagres aldri (heller ikke kopieres inn i repoet). Scene-data (tall og former) kan lagres; jobber slettes etter 60 min.
- Eksempelbilder fra Rune ligger bare i samtalen.

Oppdatert v2.208 (R183–R192)
- Ingen tidsgrense: tolkningen går som bakgrunnsjobb; ANDRE TING lar deg gjøre annet. Beskjeder er sticky: grønt banner «Brettet fra bildene er ferdig» (ÅPNE/SENERE), rødt banner ved feil (NYTT FORSØK), FERDIG-merke på LAG BRETT FRA BILDER; HENT PÅGÅENDE TOLKNING etter omstart.
- Lys: tolkningen satte ofte `look.exposure` ~0,8 (mørkt). Nå løftes lyset til minst 1,2/sol 3,0 hvis du ikke har valgt selv; JUSTER har MØRKERE/LYSERE (trinn, 0 = standard) og flymodus har LYSERE/MØRKERE.
- Fangst: fotosjekk med fire steg (to hjørner, gulvbilde, A4-ark eller mobil på gulvet); prompten bruker A4/mobil som målestokk.
- Møbler med ekte former (R182), dato og klokkeslett på egne brett (R184), navneliste og lysnivå i JUSTER (R186), REDIGER og MINE BRETT i eget brett (R187).
- Åpent: alt dette er testet i node og på iPhone-format, men ikke mot ekte bilder over tid; kvaliteten må vurderes av Rune (⚑ med modell og modus fra rapporten).
