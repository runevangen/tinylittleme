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

### [ ] R26 · Byggeskjerm C: bygget flyttes ut i verdenen, to brett og alternativ vei
Avhenger av R24 og R25. Når PRØV lykkes, **flyttes bygget ut i verdenen som solid** (AABB-/rampe-kollisjonsflater som vanlig geometri i `physics.js` via en liten hekt) slik at den ekte figuren kan gå/klatre på det; visuell nedbøyning kan fakes. Bygget **lagres** med autolagring og gjenopprettes ved «Fortsett». Lag minst to brett: (1) en **bro over et gap** (f.eks. mellom to hyller eller over vasken) og (2) en **trapp av klosser/bøker** opp til noe høyt; bruk gjerne tau/tape/vekt i minst ett av dem. **Valgt av spilleren: det skal alltid finnes en alternativ vei som ikke krever bygging, men den skal være vanskelig** (lang omvei, krevende hopp/klatring eller risiko fra maur); bygging er den smarte snarveien og belønner leting etter deler. `walk_route` må bevise at målet kan nås uten bygging, og et eget testskript må bevise at en kjent god bygging (lagret som referanse i scenen) også gir en gyldig rute og at en dårlig bygging ikke blokkerer den alternative veien. Bygg-delmålet («bygg broen») kobles til `goals` (R23) når det finnes.
Ferdig når: begge brettene kan fullføres både ved å bygge og via den vanskelige veien, bygget overlever lagre/fortsett, `walk_route` og `npm test` er grønne, og en tester på iPhone kan bygge en bro og gå over den.

### [ ] R13 · Gulv og overflater: moiré, tomme flater og skala
I skjermbildene er gulvet i nivå 2 en stor, nesten tom trebit med lite å lese skala av, den mørke badematta i nivå 1 flimrer/pikselerer (moiré på ripestruktur), og kjøkkengulvet er en jevn beige flate. Fiks mipmap/anisotropi/relieff-frekvens på matta og andre høyfrekvente teksturer, og strø småting for målestokk (smuler, hår, knapper, mynter, blyantstumper, flekker, fuger med skitt) med tetthet satt etter rom og kvalitet. Dette gjelder også BACKLOG «Detaljert rom». Filer: `look.js`, `props.js`, `scenes/` (dekor uten kollisjon), `main.js` (teksturinnstillinger).
Ferdig når: matta i nivå 1 flimrer ikke i bevegelse (sjekk to bilder etter hverandre), start-skjermbildene i nivå 2 og 6 viser minst tre ting som gir skala, og FPS-målingen ligger innenfor 1 fps av før.

## Ferdige punkter
- [x] Byggeskjerm B: 2D-fysikk (planker, klosser, tau, tape, vekter) og testfigur (R25, v1.13)
- [x] Ytelse: tekstur- og minnebudsjett for iPhone 8-klassen (R21, v1.11)
- [x] Små stemmer i rommet: levende leker (R18, v1.10)
- [x] Byggeskjerm A: skallet, egen modus, sideriss og snapping (R24, v1.09)
- [x] Delmål (milepæler) i hvert nivå (R23, v1.08)
- [x] Mål-lesbarhet i start: kamerasveip, første delmål og hint-boble (R22, v1.07)
- [x] Fiendevariasjon utover maur: én ny skapning per romtype (v1.06)
- [x] Mykere skygger og lysbaking: rommet skal sitte sammen (v1.05)
- [x] Belønning som varer: stjerner, hatter og et rom å komme tilbake til (v1.04)
- [x] Kart og kompass: aldri tapt i store rom (v1.02)
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
