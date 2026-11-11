# Veikart: fra testbrett til lekeland (Toy Story · maur · Zelda-kvalitet)

Dette er køen som de parallelle agentene (workflow) jobber seg gjennom. Hver runde velger de åpne punktene ovenfra, bygger hvert i sitt eget worktree, lar en streng kritiker underkjenne eller godkjenne, og slår godkjente sammen til `main` ett om gangen. Stoppes arbeidet (kvote, feil), står uferdige punkter igjen som `[ ]` og tas opp neste runde.

Status: `[ ]` åpen · `[x]` ferdig (versjon i parentes) · `[!]` sperret (se notat).

## Visjon
Du er noen få centimeter høy i et rom som er bygd for en annen skala: leker, møbler og maur som er like store som deg. Tenk **Toy Story / Maurice-og-maur**: varmt, mettet lys, blank plast, saftige farger, rekvisitter i barneskala. Spillfølelsen skal etter hvert nå **Zelda-kvalitet**: lesbare mål, belønning for å utforske, små gåter, varierte fiender, musikk og stemning, og ingenting som føles uferdig.

## Regler for alle punkter (agentene leser dette)
- Bygg på det eksisterende spillet (`main.js`, `physics.js`, `props.js`, `look.js`, `ants.js`, `levels/`, `scenes/`). Ikke skriv det om.
- Hold endringer modulære: helst egne moduler/filer, og små, tydelige hekter inn i `main.js`, så flere punkter kan bygges samtidig uten å krasje.
- Mobil først (iPhone, stikke + TA/HOPP/GREP + ⚙). All spilltekst nevner knappene, ikke taster.
- Nye valg i `SETTINGS`; viktige hendelser med `logEv`. Nye `.js`-moduler legges i `files` i `index.html`.
- Nivåer som endres må gås med `node tools/walk_route.mjs levels/<navn>.level.json`; nivå 4–6 lages med `node tools/make_variants.mjs` (kjør på nytt hvis en grunnscene endres).
- `npm test` skal være grønn. Legg til tester for ny logikk.
- Sjekk visuelt med Playwright (`devices['iPhone 14']`) og se på skjermbildet selv. Ingen konsollfeil.
- Ikke øk versjonsnummer, ikke rør `CHANGELOG.md`, ikke push: det gjør integrasjonen.

## Åpne punkter

### [ ] R13 · Gulv og overflater: moiré, tomme flater og skala
I skjermbildene er gulvet i nivå 2 en stor, nesten tom trebit med lite å lese skala av, den mørke badematta i nivå 1 flimrer/pikselerer (moiré på ripestruktur), og kjøkkengulvet er en jevn beige flate. Fiks mipmap/anisotropi/relieff-frekvens på matta og andre høyfrekvente teksturer, og strø småting for målestokk (smuler, hår, knapper, mynter, blyantstumper, flekker, fuger med skitt) med tetthet satt etter rom og kvalitet. Dette gjelder også BACKLOG «Detaljert rom». Filer: `look.js`, `props.js`, `scenes/` (dekor uten kollisjon), `main.js` (teksturinnstillinger).
Ferdig når: matta i nivå 1 flimrer ikke i bevegelse (sjekk to bilder etter hverandre), start-skjermbildene i nivå 2 og 6 viser minst tre ting som gir skala, og FPS-målingen ligger innenfor 1 fps av før.

### [ ] R16 · Belønning som varer: stjerner, hatter og et rom å komme tilbake til
Smulene (★ 0/10) gir i dag bare et tall på målskjermen. Gi dem verdi: hvert nivå husker beste smuletall og tid (autolagring), 10/10 gir et kosmetisk tilbehør til figuren (hatt, skjerf, sekk i annen farge; se BACKLOG «tilbehør å samle»), og et lite «lekerom»-skap på startskjermen viser det du har samlet og lar deg bytte med ett trykk. Alt med stikke/knapper, uten tastatur. Filer: `collect.js`, `hero.js`, `story.js`, `main.js` (startskjerm), nye valg i `SETTINGS`, `logEv('belønning', …)`.
Ferdig når: etter å ha tatt alle smuler i et nivå ser spilleren et nytt tilbehør på figuren neste gang, valget huskes etter omlasting, tester dekker lagring og opplåsing, og skjermbilde av skapet er sjekket på iPhone 14.

## Ferdige punkter
- [x] Lesbarhet: verdensmarkører under knapper og tydelig hva som kan gripes (v1.00)
- [x] Sjef-maur i siste rom (v0.99)
- [x] Flagg og mål som ser ut som Toy Story-rekvisitter (v0.98)
- [x] Ytelse på eldre telefoner: budsjett og lav profil (v0.96)
- [x] Nivå 4–6 skal føles som nye rom, ikke bare ommøblerte (v0.95)
- [x] Fortelling og målseremoni (v0.92)
- [x] Toy Story-lys og farge (v0.91)
- [x] Nøkkel og lås (Zelda-gåte) (v0.90)
- [x] Figur og bevegelse: siste polering (v0.93)
- [x] Musikk og stemning per rom (v0.84)
- [x] Fiender: flere slag (v0.83)
- [x] Mørkere hjørner og lysstråler (v0.82)
- [x] Leker i barneskala (v0.80)
- [x] Maur (v0.77)
- [x] Smuler å samle (belønning for å utforske) (v0.79)
- [x] Startskjerm (v0.73) · Ryddigere skjerm (v0.75) · Grafikk: korn, skygger, anisotropi (v0.76)
