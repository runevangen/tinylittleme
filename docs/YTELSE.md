# Ytelse (R85): 30 fps i alle rom på iPhone 12 eller nyere

Lanseringskravet: **30 fps i alle rom på iPhone 12 eller nyere** (`docs/PRIORITERT_BACKLOGG.md`). Utgangspunkt var testrapporten fra iPhone (v2.25, Nivå 9 Verksted): fps falt til 22, kvaliteten ble senket automatisk rundt 350 s, verste bilde 300 ms, 145 tegnekall og 33 096 trekanter.

## Hva tallene betyr (les dette først)
- Målt med `node tools/perf_rank.cjs` (Playwright, iPhone 14-skjerm, **SwiftShader, altså programvaretegning uten GPU**). Kjør med `NODE_PATH=$(npm root -g)`; `--root <mappe>` måler en annen utgave (slik ble «før» målt, på v2.43 uendret), `--out` og `--md` skriver rapport.
- **Tegnekall, trekanter, teksturer, lys og skygger er statiske mål**: de er like på alle maskiner for samme bilde (kameraet står på startposisjonen, bildet er hovedpasset; three teller ikke skyggepasset, som i tillegg tegner alt som kaster skygge). Disse tallene er beviset her.
- **«Tegning ms» og «Tick ms» er SwiftShader-tid** og er bare brukbare som relativ rangering mellom rom og mellom endringer (de varierer også med maskinbelastning). De er **ikke iPhone-fps**.
- **Score** (bare til rangering) = tegnekall/150 + trekanter/30000 + teksturminne/60 MB.
- **Ekte 30 fps på iPhone er ikke målt her: testes på iPhone.** Se «Slik tester du» nederst.

## Før og etter (v2.43 → R85), rom rangert fra dyrest til billigst (score før)
| Rom | Tegnekall før → etter | Trekanter før → etter | Teksturer MB | Score før → etter |
|---|---|---|---|---|
| Nivå 4 Bad (ommøblert) (`bad2`) | 262 → 258 (-2 %) | 66952 → 52568 (-21 %) | 73.4 | 5.20 → 4.70 |
| Nivå 1 Bad (`bad`) | 210 → 206 (-2 %) | 43020 → 28636 (-33 %) | 68 | 3.97 → 3.46 |
| Nivå 6 Kjøkken (ryddet om) (`kjokken2`) | 210 → 206 (-2 %) | 40814 → 26430 (-35 %) | 65.8 | 3.86 → 3.35 |
| Nivå 8 Stue (`stue`) | 181 → 177 (-2 %) | 38032 → 23648 (-38 %) | 58.4 | 3.45 → 2.94 |
| Nivå 3 Kjøkken (`kjokken`) | 178 → 174 (-2 %) | 34296 → 19912 (-42 %) | 52 | 3.20 → 2.69 |
| Nivå 5 Barnerom (ommøblert) (`barnerom2`) | 150 → 147 (-2 %) | 32888 → 18824 (-43 %) | 65 | 3.18 → 2.69 |
| Prøverom Bygglab (`bygglab`) | 140 → 136 (-3 %) | 28562 → 14178 (-50 %) | 69.3 | 3.04 → 2.53 |
| Nivå 2 Barnerom (`barnerom`) | 152 → 148 (-3 %) | 31350 → 16966 (-46 %) | 48.8 | 2.87 → 2.37 |
| Bygg 3 Vippe (`vippe`) | 140 → 136 (-3 %) | 30064 → 15680 (-48 %) | 47 | 2.72 → 2.21 |
| Bygg 1 Bro (`bro`) | 140 → 136 (-3 %) | 29976 → 15592 (-48 %) | 47 | 2.72 → 2.21 |
| Bygg 4 Kjøkkenbro (`kjokkenbro`) | 144 → 140 (-3 %) | 29750 → 15366 (-48 %) | 31.8 | 2.48 → 1.98 |
| Nivå 7 Lekerom (`leke`) | 134 → 130 (-3 %) | 42876 → 28492 (-34 %) | 4.6 | 2.40 → 1.89 |
| Bygg 2 Trapp (`trapp`) | 145 → 141 (-3 %) | 29972 → 15588 (-48 %) | 25.7 | 2.39 → 1.89 |
| Nivå 9 Verksted (`verksted`) | 145 → 141 (-3 %) | 33096 → 18712 (-43 %) | 14 | 2.30 → 1.80 |

**Verkstedet** (Nivå 9): trekanter 33096 → 18712 (-43 %, kravet var minst −30 %), tegnekall 145 → 141 (-3 %). Tallene for v2.43 stemmer med testrapporten fra iPhone (145 kall, 33 096 trekanter), så målingen er sammenlignbar.

De tre dyreste rommene (etter score) var **Nivå 4 Bad (ommøblert)**, **Nivå 1 Bad** og **Nivå 6 Kjøkken (ryddet om)**: trekanter −21 %, −33 % og −35 %, tegnekall −1 til −2 %. Verkstedet var ikke blant de dyreste i målingen (det er dyrt på iPhone fordi skygge, lys og teksturer kommer i tillegg), men fikk −43 % trekanter.

## Dyreste enkeltposter
De ti dyreste enkeltpostene (mesh i bildet) i de tre dyreste rommene står i «Rangering etter kutt» nederst (fra `tools/perf_rank.cjs`).

Viktigste funn før kuttene (Verkstedet, v2.43): **figuren var 76 % av alle trekantene i bildet** (25 206 av 33 085, fordelt på 76 meshes) fordi hver finger, hvert ledd og hver lomme var tett oppdelt. Resten: rekvisitter og gulvdetaljer. Samme figur står i alle rom, så kuttet virker overalt. I Nivå 4 står maurene for ca. 21 500 trekanter.

## Hva som er gjort
1. **Figurens oppdeling** (`hero.js`, SETTINGS `herodetail`, standard Normal 0,6): kuler, kapsler, sylindere, torus, dreielegemer og de avrundede boksene får færre segmenter (aldri under 4–8, så silhuetten er rund). Figuren har ca. 57 % færre trekanter (25 474 → 10 934 i full oppbygging); størrelse, ledd og materialer er uendret (testet i `test_ytelse.mjs`). Figuren er 100–150 px høy på en iPhone, så de grovere formene er ikke synlige.
2. **Fargebakt sammenslåing** (`perf_budget.js`, `mergeStatic(…, { vcolor: true })`): meshes som bare er ulike i farge (samme ruhet, tekstur og type) slås sammen til ett tegnekall med fargen i hjørnepunktene. Skjerf og sekk (fargen byttes i belønningene) er beskyttet. Gjennomsiktige materialer røres ikke. Gir noen få færre kall per rom (figuren har mange ledd som ikke kan slås sammen, derfor er kuttet i tegnekall lite; sammenslåing på tvers av ledd krever skinning og er ikke gjort).
3. **Kvalitetsstyring** (`polish.js`, `main.js`): Auto-oppløsningen slår inn tidligere og mykere. Grense **27 fps** (var 24; målet er 30, og en iPhone i strømsparemodus låst til 30 senkes fortsatt ikke), vinduer på **2 s** (var 3 s), oppvarming **5 s** (var 8 s), og trinn på **15 %** (2,0 → 1,7 → 1,44 → 1,22 → 1,04 → 1; før 25 %: 2,0 → 1,5 → 1,13 → 1). Opp igjen ved jevnt 50 fps som før. Valget finnes i ⚙ → Test → Oppløsning (Auto/Full/Middels/Lav) og i ⚙ → Admin («Auto-oppløsning: grense», 24/27/30). Hvert trinn logges som `logEv('ytelse', …)` med rom, fps, verste bilde, tegnekall og trekanter.
4. **Rapport**: testrapporten viser nå rom og oppløsning i fps-linja og **snitt-fps per rom** (lagret i nettleseren på tvers av økter).
5. **Budsjett per rom** (`ROOM_CAPS` i `perf_budget.js`): tak for tegnekall, trekanter og teksturminne per rom, satt ca. 8 % over målingen. Spillet logger `budsjett … OVER BUDSJETT` hvis et rom går over, og `test_ytelse.mjs` feiler hvis målingen i `docs/ytelse_etter.json` er over taket, dyrere enn før, eller Verkstedet ikke er minst 30 % billigere. Merk: Nivå 4 (`bad2`) har tak 279 tegnekall, over det globale anbefalte 220; det var 262 før og er et kjent punkt (maurene).

## Ikke gjort (neste skritt, krever iPhone-måling først)
- Teksturer: Verkstedet bruker 14 MB (58 teksturer), de eldre rommene 50–70 MB (bad, kjøkken, bygglab). Taket i `ROOM_CAPS` fryser dagens nivå; komprimering/nedskalering av teksturene i `look.js` gjenstår.
- Nivå 4: maurene (ca. 21 500 trekanter) kan få samme oppdelingskutt som figuren.
- Skygge: sola har ett skyggekart (2048, 17 enheter) som tegner alt som kaster skygge på nytt. Skyggepasset er ikke med i tallene over, men figuren er nå billigere også der.
- Færre enn 72 tegnekall for figuren krever skinning (ett mesh med bein).

## Slik tester du på iPhone (testes på iPhone)
1. Åpne spillet fra GitHub Pages, velg **Nivå 9 Verksted** (⚙ → Spill → Brett) og spill 3–5 minutter.
2. Slå på fps-visning (⚙ → Test) og se at den holder 30 (iPhone 12 eller nyere). Oppløsningen vises ved siden av hvis den er senket (f.eks. «29 fps · 1.70×»).
3. Send tilbakemelding med flagget ⚑: rapporten viser «snitt per rom», `ytelse`-hendelsene og tegnekall/trekanter.
4. Sjekk at figuren ser lik ut (hode, hjelm, fingre). Er du uenig: ⚙ → Admin → «Figuren: detaljnivå» → Høy eller Full.

## Måle selv
```
NODE_PATH=$(npm root -g) node tools/perf_rank.cjs --out docs/ytelse_etter.json --md /tmp/ytelse.md
```
`docs/ytelse_for.json` er målingen av v2.43 (uendret) og skal ikke overskrives. Etter nye kutt: mål på nytt, oppdater `docs/ytelse_etter.json` og senk `ROOM_CAPS`.

## Rangering etter kutt

| Rom | Tegnekall | Trekanter | Teksturer (MB) | Lys (skygge) | Tegning ms* | Tick ms* | Score |
|---|---|---|---|---|---|---|---|
| bad2 | 258 | 52568 | 120 (73.4) | 6 (1) | 10.6 | 0.15 | 4.70 |
| bad | 206 | 28636 | 115 (68) | 6 (1) | 3.3 | 0.16 | 3.46 |
| kjokken2 | 206 | 26430 | 105 (65.8) | 7 (1) | 3.8 | 0.55 | 3.35 |
| stue | 177 | 23648 | 76 (58.4) | 6 (1) | 8.9 | 0.11 | 2.94 |
| barnerom2 | 147 | 18824 | 95 (65) | 7 (1) | 2 | 0.07 | 2.69 |
| kjokken | 174 | 19912 | 91 (52) | 6 (1) | 4.2 | 0.15 | 2.69 |
| bygglab | 136 | 14178 | 89 (69.3) | 6 (1) | 2.9 | 0.01 | 2.53 |
| barnerom | 148 | 16966 | 79 (48.8) | 6 (1) | 2.5 | 0.15 | 2.37 |
| vippe | 136 | 15680 | 61 (47) | 6 (1) | 1.5 | 0.01 | 2.21 |
| bro | 136 | 15592 | 61 (47) | 6 (1) | 3.3 | 0.02 | 2.21 |
| kjokkenbro | 140 | 15366 | 61 (31.8) | 6 (1) | 1.7 | 0.01 | 1.98 |
| leke | 130 | 28492 | 42 (4.6) | 6 (1) | 2.5 | 0.02 | 1.89 |
| trapp | 141 | 15588 | 46 (25.7) | 6 (1) | 1.4 | 0.01 | 1.89 |
| verksted | 141 | 18712 | 58 (14) | 6 (1) | 1.3 | 0.08 | 1.80 |

De 10 dyreste enkeltpostene (mesh i bildet, etter trekanter) i de tre dyreste rommene:

**bad2**

| # | Del | Trekanter | Skygge | Slått sammen | Materiale |
|---|---|---|---|---|---|
| 1 | maur/skapninger | 3152 | ja | 8 | MeshStandard #ffffff |
| 2 | maur/skapninger | 3120 | ja | 6 | MeshStandard #ffffff |
| 3 | rekvisitt/brettdel | 2304 | ja | - | MeshPhysical #ebe8df |
| 4 | maur/skapninger | 2272 | ja | 32 | MeshStandard #48265c |
| 5 | maur/skapninger | 2080 | ja | 4 | MeshStandard #f2c64a |
| 6 | maur/skapninger | 2080 | ja | 4 | MeshStandard #111111 |
| 7 | maur/skapninger | 2080 | ja | 4 | MeshStandard #f2c64a |
| 8 | maur/skapninger | 2080 | ja | 4 | MeshStandard #111111 |
| 9 | rekvisitt/brettdel | 1932 | ja | 2 | MeshPhysical #f7f3e8 |
| 10 | rekvisitt/brettdel | 1908 | nei | 53 | MeshStandard #d2a05a |

Fordeling: maur/skapninger 45 kall / 21524 trekanter; rekvisitt/brettdel 92 kall / 18624 trekanter; figuren 72 kall / 10822 trekanter; gjennomsiktig 30 kall / 1039 trekanter; gulvdetaljer/småting 11 kall / 508 trekanter

**bad**

| # | Del | Trekanter | Skygge | Slått sammen | Materiale |
|---|---|---|---|---|---|
| 1 | rekvisitt/brettdel | 2304 | ja | - | MeshPhysical #ebe8df |
| 2 | rekvisitt/brettdel | 1932 | ja | 2 | MeshPhysical #f7f3e8 |
| 3 | rekvisitt/brettdel | 1584 | nei | 44 | MeshStandard #d2a05a |
| 4 | rekvisitt/brettdel | 1400 | ja | 2 | MeshPhysical #f1eee6 |
| 5 | rekvisitt/brettdel | 1400 | ja | 2 | MeshStandard #a9794a |
| 6 | rekvisitt/brettdel | 864 | ja | - | MeshPhysical #f1eee6 |
| 7 | rekvisitt/brettdel | 700 | ja | - | MeshStandard #8d8a80 |
| 8 | rekvisitt/brettdel | 700 | ja | - | MeshStandard #7b7c7a |
| 9 | figuren | 580 | ja | 6 | MeshStandard #e8b796 |
| 10 | rekvisitt/brettdel | 504 | nei | 14 | MeshStandard #d2a05a |

Fordeling: rekvisitt/brettdel 80 kall / 15680 trekanter; figuren 72 kall / 10822 trekanter; gjennomsiktig 34 kall / 1575 trekanter; gulvdetaljer/småting 11 kall / 508 trekanter

**kjokken2**

| # | Del | Trekanter | Skygge | Slått sammen | Materiale |
|---|---|---|---|---|---|
| 1 | rekvisitt/brettdel | 924 | ja | 5 | MeshStandard #e0483e |
| 2 | rekvisitt/brettdel | 924 | ja | 5 | MeshStandard #f2c230 |
| 3 | rekvisitt/brettdel | 864 | nei | 24 | MeshStandard #d2a05a |
| 4 | rekvisitt/brettdel | 700 | ja | - | MeshStandard #d9534f |
| 5 | rekvisitt/brettdel | 700 | ja | - | MeshStandard #cde5f9 |
| 6 | rekvisitt/brettdel | 700 | nei | 5 | MeshStandard #e0443a |
| 7 | figuren | 580 | ja | 6 | MeshStandard #e8b796 |
| 8 | rekvisitt/brettdel | 520 | ja | - | MeshPhysical #7c1f14 |
| 9 | rekvisitt/brettdel | 520 | ja | - | MeshPhysical #7c1f14 |
| 10 | rekvisitt/brettdel | 520 | ja | - | MeshPhysical #7c1f14 |

Fordeling: rekvisitt/brettdel 85 kall / 14594 trekanter; figuren 72 kall / 10822 trekanter; gjennomsiktig 32 kall / 671 trekanter; gulvdetaljer/småting 9 kall / 292 trekanter
