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

### [ ] R1 · Toy Story-lys og farge
Varmere, mer mettet belysning og fargegradering som i Pixar: mykere nøkkellys med varm sol og kjølig fyll, litt mer kontrast i skyggene, blankere plast (clearcoat) på plast- og porselensflater, tydeligere kantlys. Må ikke gjøre rommene mørkere eller ulesbare, og FPS skal ikke falle merkbart (Grafikk «Enkel» skal fortsatt virke). Filer: `main.js` (lys, tonemapping), `look.js`, evt. `level.look` i scenene.
Ferdig når: før/etter-skjermbilder av nivå 1, 2 og 3 viser tydelig varmere og mer levende bilde uten blomstring eller utbrente flater.

### [ ] R5 · Musikk og stemning per rom
Prosedyrebasert musikk (Web Audio, ingen filer): rolig, leken tema per rom (bad, barnerom, kjøkken) som dynamikk skifter med fare (maur i nærheten) og mål. Eget volum i mikseren, av/på i ⚙. Nytt modul `music.js` med testbar logikk (skala, mønster, tempo som funksjon av tilstand).
Ferdig når: musikk spiller etter første trykk, kan slås av, og skifter stemning når en maur ser deg.

### [ ] R7 · Nøkkel og lås (Zelda-gåte)
En enkel gåte per nivå fra 3 og oppover: finn en gjenstand (f.eks. knapp, mynt, nøkkel-kloss), bær den til et sted (TA/SETT PÅ) og åpne en hindring (en port/skuff som beveger seg, en bro som rulles ut). Bygg som en liten, datastyrt mekanikk (`puzzles` i scenen) i nytt modul `puzzle.js` med fysikk-integrasjon som ikke ødelegger rutekartet: hindringen skal være valgfri snarvei eller en tydelig vei, og `walk_route` må fortsatt bevise at målet kan nås.
Ferdig når: minst én fungerende gåte i nivå 3 og 6 med tester og tydelig veiledning (pil/kompass peker mot neste steg).

### [ ] R8 · Fortelling og målseremoni
Korte fortellertekster (norsk/engelsk i `i18n.js`) i start av hvert nivå (kort kort-kort, ikke vegger av tekst), en bedre målskjerm med smuler, tid, maur knust og en tydelig «Neste nivå», og en liten avslutning etter nivå 6. Alt bruker knappenavn, ikke taster. Må kunne hoppes over med ett trykk.
Ferdig når: flyten start → spill → mål → neste nivå føles komplett på mobil.

### [ ] R9 · Sjef-maur i siste rom
Stor sjef-maur i nivå 6 (kjøkkenet), tre faser (patrulje, charge, stunned etter å ha truffet vegg/kasse så du kan hoppe på den), helsebar, tegnefilm-aktig animasjon, lyd og belønning (siste smule + en liten fanfare). Egen logikk i `ants.js` eller nytt `boss.js` med tester. Må være rettferdig på mobil.
Ferdig når: en spiller kan slå sjefen med bare stikke + HOPP, og ruta går fortsatt.

### [ ] R10 · Figur og bevegelse: siste polering
Se `docs/FIGUREN.md` og `BACKLOG.md`: føtter som tilpasser seg trinn, bedre heng/sving/klatring, hoppe-på-maur-animasjon (spretter), reaksjon når en maur støter deg, glede når du knuser den. Mål FPS på eldre telefoner.
Ferdig når: animasjonene leses tydelig i skjermbilder/serier og ingen eksisterende test brekker.

## Ferdige punkter
- [x] Fiender: flere slag (v0.83)
- [x] Mørkere hjørner og lysstråler (v0.82)
- [x] Leker i barneskala (v0.80)
- [x] Maur (v0.77)
- [x] Smuler å samle (belønning for å utforske) (v0.79)
- [x] Startskjerm (v0.73) · Ryddigere skjerm (v0.75) · Grafikk: korn, skygger, anisotropi (v0.76)
