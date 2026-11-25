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
