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

### [ ] R17 · Mykere skygger og lysbaking: rommet skal sitte sammen
Møbler og leker står fortsatt litt «limt» oppå gulvet; kontaktskygger finnes, men det mangler omgivelsesokklusjon i hjørner, under senger og bak skap, og lyset fra vinduet gir hard kant. Bak enkel, billig AO (mørk gradient i vertex-farge eller bakt blob under og ved vegg), mykere skyggekant (PCF/radius etter kvalitet) og varm lysflekk fra vinduet på gulvet. Kun på «Høy»; Enkel grafikk og Lav profil beholder dagens look. Filer: `look.js`, `atmos.js`, `grade.js`, `main.js` (SETTINGS-gruppe grafikk).
Ferdig når: skjermbilder av nivå 2 og 5 før/etter viser tydelig mørkning i hjørner og under møbler, FPS-målingen faller under 2 fps, og lav profil slår det helt av (test i `test_perf.mjs`).

### [ ] R18 · Små stemmer i rommet: leker som lever og reagerer
Rommene er stille mellom fiendene. Gi 3–5 rekvisitter små levende reaksjoner (vippehest gynger når du lander på den, tennisball ruller videre og piper, lekebil kan skyves og tuter, wind-up-leke går noen skritt og stopper, bokser med fjær spretter). Ingen ny kollisjonsmodell: gjenbruk flyttbare ting og lyd. Dette gjør Toy Story-følelsen konkret. Filer: `toys.js`, `props.js`, `audio.js`, `scenes/`, `logEv('leke', …)`.
Ferdig når: hver av de nye lekene finnes i minst to nivåer, kan utløses med TA/HOPP/GREP uten tastatur, har egen lyd og lydtekst, og `walk_route` er fortsatt grønn.

### [ ] R19 · Fiendevariasjon utover maur: én ny skapning per romtype
Maur og sjef-maur er de eneste fiendene. Legg til to enkle, lesbare til: f.eks. en pillbug/kakerlakk som ruller seg sammen (kan dyttes) og en edderkopp i tråd som henger fra tak og må passeres i takt. Hver med tydelig varsel (farge, lyd), maks én mekanikk, og en måte å ufarliggjøre den med stikke + TA/HOPP. Fordel dem ulikt i nivå 3–6 slik at hvert rom har sin egen trussel. Filer: `foes.js`, `ants.js` (gjenbruk), `kinds.js`, `scenes/`, `main.js` (SETTINGS under Spill), `logEv('fiende', …)`.
Ferdig når: nivå 3–6 har minst én ny fiendetype hver, ingen kan drepe uten at spilleren ser varsel i minst 0,5 s, tester dekker varselstiming og nullstilling, og ruta går med `walk_route`.

### [ ] R21 · Ytelse: tekstur- og minnebudsjett for iPhone 8-klassen
Forrige ytelsespunkt tok tegnekall og lav profil, men ikke minne: alle teksturer lages i full oppløsning, og forvarming kan gi hakk eller krasj på eldre telefoner. Mål minnebruk (teksturstørrelser, geometrier, `renderer.info`), skaler prosedyreteksturer til 512/256 på «Lav profil», gjenbruk delte materialer/geometrier, dispose ved nivåbytte og legg et minnebudsjett i `perf_budget.js`. Filer: `perf_budget.js`, `look.js`, `props.js`, `main.js`, `test_perf.mjs`.
Ferdig når: rapporten viser teksturminne og geometrier per nivå, lav profil bruker minst 40 % mindre teksturminne, nivåbytte 1→6 lekker ikke (antall geometrier/teksturer er stabilt i test), og ingen visuell feil sees i skjermbilde.

### [ ] R22 · Mål-lesbarhet i start: spilleren skal vite hva de skal gjøre i 5 sekunder
Fortellingen og pilene forklarer mye, men første skjermbilde i hvert nivå viser ofte bare figuren i et stort rom uten tydelig første mål. Legg inn en kort kamerasveip fra målet tilbake til figuren ved nivåstart (hoppes over med et trykk), en «første delmål»-markør (neste hylle, nøkkel eller flagg) og én kontekstuell hint-boble per nivå som nevner riktig knapp (TA, HOPP, GREP). Gjør tekst og kamera til data i `story.js`/nivåfila, ikke hardkodet. Filer: `story.js`, `camera_util.js`, `markers.js`, `levels/`, `main.js`, `logEv('intro', …)`.
Ferdig når: alle seks nivåene har sveip og delmål, sveipet kan hoppes over med ett trykk, tekst nevner knapper (ikke taster), og tester dekker at sveipet slutter og gir kontrollen tilbake.

## Ferdige punkter
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
