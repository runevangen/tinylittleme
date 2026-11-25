---
name: tlm-brett-og-mobiltest
description: Kvalitetssjekk brett og mobilvisning i tinylittleme: walk_route, make_variants, paritet Brobygger/Byggeskolen og Playwright med iPhone 14. Bruk når et brett eller en skjerm er nytt eller endret.
---
# Brett og mobiltest

Brett
- Nytt eller endret brett: `node tools/walk_route.mjs levels/<navn>.level.json` før utlegging (se `docs/NIVAER.md`).
- Nivå 4–6 lages av grunnscenene: `node tools/make_variants.mjs` (kjør på nytt når en grunnscene endres).
- Ny `.js`-modul i roten må inn i lista `files` i `index.html` (en test sjekker det).

Mobil først
- Tekst i spillet nevner knappene (TA, HOPP, GREP, ⚙, FLY, LAND, LISTE, NAVN), ikke taster. Alt skal kunne brukes med stikke + knapper uten tastatur.
- Sjekk visuelt med Playwright `devices['iPhone 14']` (Chromium er ferdig installert: `require('playwright')`; ikke kjør `playwright install`). Skjermbilde du selv ser på: `deviceScaleFactor: 1`.
- Skriptene ligger i `tools/live_*.cjs` (bruk `NODE_PATH=$(npm root -g)`). De er trege (5–10 min): kjør i bakgrunnen med utdata til loggfil og vent med Monitor.
- Fixture for egne brett: `/tmp/room_fixture.json` (lages av `scenes/bad.scene.json` via `sceneToRoom`; lag den på nytt hvis /tmp er tømt).

Bygging
- Brobygger og Byggeskolen er ett (R101): endringer i bygging legges i de delte modulene (`grid_view.js`, `grid_logic.js`, `buildux_*`, `build.js`) og sjekkes både på Hyllebroen og et Bygglab-sted (`lab1`–`lab8`). `node test_paritet.mjs` skal være grønn; svekk aldri testen.

Test-fallgruver
- Scroll elementet inn i view før klikk; bruk romslige tidsavbrudd.
- Sjekk exit-kode, ikke bare siste linje.
