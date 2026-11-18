# Dette har skjedd siden dag 1

Oppsummering av tinylittleme fra første versjon til v2.43 (18. november 2026). Tallene kommer fra `git log`, `CHANGELOG.md` og tester-databasen. Der datoer ikke finnes (de første versjonene ligger bare i endringsloggen, ikke i git), står det «før 26. okt».

## Tall
| | |
|---|---|
| Versjoner i endringsloggen | **ca. 235** (v0.1 → v2.43) |
| Commits på `main` | **358** (første commit 26. okt kl. 06:19) |
| Aktive dager i git | 14 av 24 (flest: 11. nov med 91 commits) |
| Linjer lagt til / fjernet (alle filer) | **ca. 79 400 / 5 300** |
| JavaScript-moduler i roten | **119 filer, ca. 16 200 linjer** |
| Tester (`test_*.mjs`) | 78 filer, pluss oppstartstest i nettleser (`npm run boot`) |
| Verktøy (`tools/`) | 61 filer (runner, bot, trailer, rute-gåing, m.m.) |
| Brett | 9 nivåer, 4 byggebrett, 8 byggesteder i Bygglab, 5 prøverom |
| Dokumenter (`docs/`) | 29 filer |
| Tilbakemeldinger fra testere | **10 rapporter, alle rettet** (første 12. nov), 13 svar tilbake, 5 avkrysset |

## Fasene

### Før 26. okt: figuren, styringen og grunnmuren (v0.1–v0.47)
En liten utforsker med gul hjelm, oransje jakke og sekk. Gange med skritt og fast fot (IK), hopp, fall og landing, klatring med krefter, kast og hard landing, hårgelé og dopapirbånd som verktøy, nål og tråd som taubane, autolagring, første lydmotor, og foto → brett-skjemaet. Det var «Prince-følelsen»: tung, presis og tilgivende. Bruken av ekte mobilkontroller kom tidlig (TA, HOPP, GREP).

### 26. okt: mobil og PC (v0.48–v0.58)
TA-knappen som endrer navn etter handling («SMØR», «KAST»), sjekk av mobil mot PC, PUBG-lignende styring, «over skulderen»-kamera og egne innstillinger for pust. Det var her git-historien begynner.

### 6.–10. nov: flere rom og bedre grafikk (v0.62–v0.86)
Rommene fikk relieff, tregulv og små detaljer. **Badet ble bygd på nytt** fra fire bilder. **Nivå 4–6**: de samme rommene ommøblert, med ny rute. Fra v0.68 kom ny versjon alltid med en gang (ingen mellomlager). Leker i barneskala, mykere skygger, rolig leken musikk per rom, og **⚑-flagget**: testere kunne markere feil mens de spilte.

### 11. nov: fortelling, flagg, kart og første byggeskjerm (v1.07–v1.18)
Fortellertekster, målseremoni, flagg som Toy Story-rekvisitter, minikart og oversikt, belønninger som låser opp hatt, skjerf og sekk. **Byggeskjermen (R24–R26)** kom: dra deler, roter og prøv med 2D-fysikk og en testfigur. Mindre teksturminne for eldre telefoner.

### 12. nov: testere og første rettelser (v1.30–v1.48)
To nye byggebrett (vippe og kjøkkenbro), en bot som klatrer og bruker verktøy, og **«Send til Claude»** (v1.27): testere kan sende rapport rett fra spillet. De første tilbakemeldingene kom 12. nov, og sprettboksen som kastet figuren, hakk og runde knapper ble rettet samme dag. Runneren som tar saker fra køen ble lagret i repoet.

### 13. nov: byggedelen og hjelp fra testere (v1.50–v1.72)
Byggeserien R45–R50: spenningsfarger, kostnad og stjerner, fagverk (trekanter) og **Euler-knekking**, materialtabell og gummistrikk. Mange saker fra testeren: skarpere tekst i toppbåndet, lette å skille skuffer, kamera som kan dras fra knappene, solstråler som stoppes av møbler.

### 14. nov: mer innhold (v1.73–v1.89)
Gåteverktøy (trykkplate, dør og bryter), veps som flyr, **nivå 7 Lekerom, nivå 8 Stuen og nivå 9 Verkstedet**, veiledning når målet er skjult, markørbudsjett, og manus til traileren.

### 15. nov: sammenbrudd og læring (v2.01–v2.10)
**v2.01 la ut en tom `version.js`, og spillet startet ikke.** Det ble funnet ved en ekte nettleserstart. Etter det: oppstartstest (`npm run boot`) før hver push, en test av `version.js`, og regler i `CLAUDE.md`. Samme dag: byggedel som kan flyttes (R70), ⚑ på alle skjermer (R71), og første **rutenett-bygging** (R72) med knutepunkter, staver av tre, stål og tau, og belastningsfarger (R73).

### 16. nov: film og mål (v2.11–v2.26)
Treverket i rutenett ble svakere så broer faktisk brister. **Trailer** v1–v3 laget fra selve spillmotoren, og forhistorien «Leggetid» med krymping. Rutenett fikk mål, budsjett og stjerner (R74) og veiledning (R75), byggeskjermen ble ryddet (R76), og **versjonsjekk i spillet** (R77). En fjernet planke som kom tilbake ble rettet (R78).

### 17. nov: hele tilbakemeldingssløyfen (v2.27–v2.34)
Trykkplata som du gikk igjennom ble rettet (R79). **RETTELSER-menyen** (R80) lar testeren gå til brettet og krysse av ✓/✗, med faner og opprydding (R81). Trailer v4–v6: krymping på samme sted og en byggedel som forklarer hvorfor man bygger.

### 18. nov: kamera, nytt og lanseringsplan (v2.35–v2.43)
Rutenett i de vanlige byggebrettene (R82), **roligere kamera** (R54), **NYTT-menyen** (R83) for å teste nye funksjoner, standard Medium (R84), og den **prioriterte backloggen** med seksukersplan mot lansering. Ytelsessaken (R85) er i gang.

## Hvordan vi jobber (det som ble bygget underveis)
- **Runner med parallelle agenter:** hvert punkt bygges i eget worktree, en kritiker underkjenner eller godkjenner, og godkjente slås sammen til `main` ett om gangen.
- **Tester først:** saker fra testere går foran alt, og testeren får svar i spillet.
- **Sikkerhetsnett:** `npm test`, oppstartstest i nettleser og rute-gåing av hvert brett. Plan: automatisk sjekk på hver push.
- **Film fra selve spillet:** kinomodus og klippskript, så traileren viser ekte motor.
- **Rutiner:** sjekk av tilbakemeldinger hver 2. time (07:23–23:23), ukentlig gjennomgang hver mandag.

## Det som ikke gikk bra (og det vi gjorde med det)
- **Tom `version.js` (v2.01)** stoppet spillet. Nå: oppstartstest og versjonstest før hver push.
- **Ytelse:** Verkstedet falt til 22 fps (krav: 30). Egen sak (R85).
- **Eldre brett uten klikkbar link** i Rettelser: brett ble fylt inn i etterkant.

## Hva som er neste
Se `docs/PRIORITERT_BACKLOGG.md`: åpen nettleserversjon rundt 3. januar, med nivå 1–9 og Byggeskole, tre nye spillere som tester nivå 1, og 30 fps i alle rom.
