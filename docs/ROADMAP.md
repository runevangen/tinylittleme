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

### [ ] R24 · Byggeskjerm A: skallet (egen modus, sideriss, snapping)
Besluttet med spilleren (se samtalen): bygging skjer i en **egen skjerm/modus**, ikke som klikking i 3D-verdenen, for finmotorikk på mobil. Verden fryses og dimmes; kameraet blir et ortografisk **sideriss** låst til byggeplassen (gapet eller trappestedet) med faste festepunkter. Nytt modul `build.js` (modus, kamera, input) + `build_ui.js`; små hekter i `main.js` (inn/ut av modus, `menuOpen`-lignende pause). Deler som spilleren har funnet i verdenen (`parts` i scenen, plukkes med TA) ligger i et brett nederst; du drar en del ut med fingeren, den **snapper** til rutenett/festepunkter (snapping kan slås av i ⚙), roteres med to-fingers vri eller ±-knapper, zoom/pan med klyp og dra. Store knapper: ANGRE, NULLSTILL, PRØV, TILBAKE. Begrenset antall deler (leting i nivået lønner seg). Dette er et unntak fra «stikke + TA/HOPP/GREP»: i byggeskjermen styrer man med direkte berøring; tekst nevner knapper og berøring, ikke taster; tastatur/mus støttes bare som tillegg. Nye valg i `SETTINGS`, hendelser med `logEv`, ny modul i `files` i `index.html`. Ingen fysikk ennå utover å plassere/flytte deler; ruta (`walk_route`) skal være uberørt.
Ferdig når: på iPhone (`devices['iPhone 14']`) kan man gå inn i byggeskjermen ved en byggeplass, dra, snappe, rotere, angre, nullstille og gå ut igjen uten å sette spillet fast; delene man har plukket opp dukker opp i brettet; tester dekker snapping, angre/nullstill og inn/ut av modus.

### [ ] R25 · Byggeskjerm B: 2D-fysikk (planker, klosser, tau, tape, vekter) og testfigur
Avhenger av R24. Egen ren logikkmodul `build_phys.js` (ingen three.js, helt testbar) med en liten, stabil 2D-modell i sideriss: stive planker og klosser, **ledd/tape** (stive eller svake festepunkter), **tau** (fjær/avstandsbegrensning som bare trekker), **vekter** (tunge deler/motvekt) og tyngdekraft; planker bøyer seg synlig (visuell nedbøyning) og kan brekke ved for stor last. PRØV starter simuleringen med en liten **testfigur eller kule** som krysser (ligner Poly Bridge); holder bygget, vises jubel, ellers ser man hvor det brakk og kan justere. Start enkelt: planker og klosser først i modulen, deretter tau, tape og vekter (hver for seg testet) så ikke ett punkt blir for stort. Fysikken skal være deterministisk (fast tidssteg) slik at tester og `walk_route`-beviset kan kjøre samme bygg. Lyd (knirk, brudd, plask) via `audio.js`. Tester: en korrekt bro bærer, en for svak faller, tau holder kun i strekk, motvekt veier opp, samme input gir samme resultat.
Ferdig når: man kan bygge og teste en bro og en trapp i byggeskjermen på mobil, se dem bære eller falle på en lesbar måte, og alle fysikktester er grønne.

### [ ] R26 · Byggeskjerm C: bygget flyttes ut i verdenen, to brett og alternativ vei
Avhenger av R24 og R25. Når PRØV lykkes, **flyttes bygget ut i verdenen som solid** (AABB-/rampe-kollisjonsflater som vanlig geometri i `physics.js` via en liten hekt) slik at den ekte figuren kan gå/klatre på det; visuell nedbøyning kan fakes. Bygget **lagres** med autolagring og gjenopprettes ved «Fortsett». Lag minst to brett: (1) en **bro over et gap** (f.eks. mellom to hyller eller over vasken) og (2) en **trapp av klosser/bøker** opp til noe høyt; bruk gjerne tau/tape/vekt i minst ett av dem. **Valgt av spilleren: det skal alltid finnes en alternativ vei som ikke krever bygging, men den skal være vanskelig** (lang omvei, krevende hopp/klatring eller risiko fra maur); bygging er den smarte snarveien og belønner leting etter deler. `walk_route` må bevise at målet kan nås uten bygging, og et eget testskript må bevise at en kjent god bygging (lagret som referanse i scenen) også gir en gyldig rute og at en dårlig bygging ikke blokkerer den alternative veien. Bygg-delmålet («bygg broen») kobles til `goals` (R23) når det finnes.
Ferdig når: begge brettene kan fullføres både ved å bygge og via den vanskelige veien, bygget overlever lagre/fortsett, `walk_route` og `npm test` er grønne, og en tester på iPhone kan bygge en bro og gå over den.

### [ ] R13 · Gulv og overflater: moiré, tomme flater og skala
I skjermbildene er gulvet i nivå 2 en stor, nesten tom trebit med lite å lese skala av, den mørke badematta i nivå 1 flimrer/pikselerer (moiré på ripestruktur), og kjøkkengulvet er en jevn beige flate. Fiks mipmap/anisotropi/relieff-frekvens på matta og andre høyfrekvente teksturer, og strø småting for målestokk (smuler, hår, knapper, mynter, blyantstumper, flekker, fuger med skitt) med tetthet satt etter rom og kvalitet. Dette gjelder også BACKLOG «Detaljert rom». Filer: `look.js`, `props.js`, `scenes/` (dekor uten kollisjon), `main.js` (teksturinnstillinger).
Ferdig når: matta i nivå 1 flimrer ikke i bevegelse (sjekk to bilder etter hverandre), start-skjermbildene i nivå 2 og 6 viser minst tre ting som gir skala, og FPS-målingen ligger innenfor 1 fps av før.

### [ ] R18 · Små stemmer i rommet: leker som lever og reagerer
Rommene er stille mellom fiendene. Gi 3–5 rekvisitter små levende reaksjoner (vippehest gynger når du lander på den, tennisball ruller videre og piper, lekebil kan skyves og tuter, wind-up-leke går noen skritt og stopper, bokser med fjær spretter). Ingen ny kollisjonsmodell: gjenbruk flyttbare ting og lyd. Dette gjør Toy Story-følelsen konkret. Filer: `toys.js`, `props.js`, `audio.js`, `scenes/`, `logEv('leke', …)`.
Ferdig når: hver av de nye lekene finnes i minst to nivåer, kan utløses med TA/HOPP/GREP uten tastatur, har egen lyd og lydtekst, og `walk_route` er fortsatt grønn.

### [ ] R21 · Ytelse: tekstur- og minnebudsjett for iPhone 8-klassen
Forrige ytelsespunkt tok tegnekall og lav profil, men ikke minne: alle teksturer lages i full oppløsning, og forvarming kan gi hakk eller krasj på eldre telefoner. Mål minnebruk (teksturstørrelser, geometrier, `renderer.info`), skaler prosedyreteksturer til 512/256 på «Lav profil», gjenbruk delte materialer/geometrier, dispose ved nivåbytte og legg et minnebudsjett i `perf_budget.js`. Filer: `perf_budget.js`, `look.js`, `props.js`, `main.js`, `test_perf.mjs`.
Ferdig når: rapporten viser teksturminne og geometrier per nivå, lav profil bruker minst 40 % mindre teksturminne, nivåbytte 1→6 lekker ikke (antall geometrier/teksturer er stabilt i test), og ingen visuell feil sees i skjermbilde.

## Ferdige punkter
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
