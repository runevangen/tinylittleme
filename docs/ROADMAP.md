# Veikart: fra testbrett til lekeland (Toy Story · maur · Zelda-kvalitet)

Dette er køen som de parallelle agentene (workflow) jobber seg gjennom. Hver runde velger de åpne punktene ovenfra, bygger hvert i sitt eget worktree, lar en streng kritiker underkjenne eller godkjenne, og slår godkjente sammen til `main` ett om gangen. Stoppes arbeidet (kvote, feil), står uferdige punkter igjen som `[ ]` og tas opp neste runde.

Status: `[ ]` åpen · `[x]` ferdig (versjon i parentes) · `[!]` sperret (se notat).

## Visjon
Du er noen få centimeter høy i et rom som er bygd for en annen skala: leker, møbler og maur som er like store som deg. Tenk **Toy Story / Maurice-og-maur**: varmt, mettet lys, blank plast, saftige farger, rekvisitter i barneskala. Spillfølelsen skal etter hvert nå **Zelda-kvalitet**: lesbare mål, belønning for å utforske, små gåter, varierte fiender, musikk og stemning, og ingenting som føles uferdig.

## Regler for alle punkter (agentene leser dette)
- **Tester først:** punkter som kommer fra testernes tilbakemeldinger ligger øverst i køen og merkes «Fra tester: <navn>». Rekkefølge: krasj/stopp, feil flere har meldt, enkeltfeil, ønsker. Se `CLAUDE.md`.
- Bygg på det eksisterende spillet (`main.js`, `physics.js`, `props.js`, `look.js`, `ants.js`, `levels/`, `scenes/`). Ikke skriv det om.
- Hold endringer modulære: helst egne moduler/filer, og små, tydelige hekter inn i `main.js`, så flere punkter kan bygges samtidig uten å krasje.
- Mobil først (iPhone, stikke + TA/HOPP/GREP + ⚙). All spilltekst nevner knappene, ikke taster.
- Nye valg i `SETTINGS`; viktige hendelser med `logEv`. Nye `.js`-moduler legges i `files` i `index.html`.
- Nivåer som endres må gås med `node tools/walk_route.mjs levels/<navn>.level.json`; nivå 4–6 lages med `node tools/make_variants.mjs` (kjør på nytt hvis en grunnscene endres).
- `npm test` skal være grønn. Legg til tester for ny logikk.
- Sjekk visuelt med Playwright (`devices['iPhone 14']`) og se på skjermbildet selv. Ingen konsollfeil.
- Ikke øk versjonsnummer, ikke rør `CHANGELOG.md`, ikke push: det gjør integrasjonen.

## Åpne punkter

### [ ] R39 · Finpuss av Prince: kant, landing, forsiktig gange og tau
Fra BACKLOG «Finpuss av Prince». Fire små forbedringer av figurens bevegelse (`hero.js`, `physics.js`, `main.js`, `docs/FIGUREN.md`/`STYRING.md`): (1) **kant-shimmy**: hengende i en kant kan figuren gå sidelengs med stikka; (2) **rulle/ta imot ved landing**: etter hard landing (ikke farlig) med stikka i fart rulles det i stedet for å stoppe, med egen lyd og kort uskadd-tid; (3) **forsiktig gange**: lett stikke går sakte og stopper ved kanten uten å falle (bygger på kanthjelpen, `docs/STYRING.md`); (4) **tau-sving som føles tyngre**: lengre periode, mer treghet og fart i utsvinget. Verdier i `SETTINGS` (finjustering i admin), `logEv`, ren logikk i testbar funksjon/modul. Må virke med stikke + TA/HOPP/GREP, ingen tastatur. Skal ikke gjøre ruta kortere eller umulig: `walk_route` uendret grønn, og bot-testene (R32) grønne.
Ferdig når: de fire tingene finnes og kan slås av/justeres i ⚙, tester dekker kant-shimmy, rulle ved landing, forsiktig gange (stopper ved kant) og tau-treghet, `walk_route` og `npm test` grønne, ingen ny shader/økning i tegnekall (R35-budsjettet holder). Merk i CHANGELOG at følelsen testes på iPhone (R27).

### [ ] R41 · Flere kombinasjoner: svamp + vann, håndkle + håndkle, papirhaug, stavhopp-animasjon
Fra BACKLOG «Kombineringsmotor» og «Klatrehjelp». I dag er bare nål + tråd = taubane hardkodet (`physics.js`: `useTool`, `useZip`). Lag en liten **tabell over egenskaper og regler** (BotW/Scribblenauts-stil) i en egen testbar modul, og legg inn minst tre nye kombinasjoner: **svamp + vann** (svamp suger og blir tung/myk landing), **håndkle + håndkle** (knytt til lengre tau/klatreflate) og **papirhaug som presses sammen** (blir lavere trinn). Dessuten **stavhopp-animasjon** for staven. Hver kombinasjon bruker TA/HOPP/GREP, har hint-tekst som nevner knappene, lyd og lydtekst, og `logEv('kombo', …)`. Ingen kombinasjon skal være nødvendig for å fullføre et nivå (alternativ vei finnes), og `walk_route`/bot må kunne bevise både med og uten.
Ferdig når: regeltabellen finnes med tester (egenskap → regel → resultat), tre nye kombinasjoner kan utløses i minst ett nivå hver, stavhopp har animasjon, `walk_route`, bot-tester og `npm test` grønne.

### [ ] R42 · Motgiften høyere opp i badet og varianter
Fra BACKLOG «Flytte motgiften til toppen av speilskapet» og «Motgift-varianter»/«Badet på nytt». I Bad (nivå 1 og 4): flytt motgiften opp til speilskapet/medisinskap med klatrevei fra knaggrekka (nytt delmål i `goals`), og legg inn **en variant** der vann stiger sakte og man må rømme (nivå 4, valgfri vanskelighetsgrad via `SETTINGS`). Lag/endre grunnscenen (`scenes/bad*.scene.json`) og kjør `node tools/make_variants.mjs`; alternativ vei uten klatring finnes og er vanskeligere. Dusjslange som tau hvis det lar seg gjøre med eksisterende tau-fysikk. Tekster i `i18n.js` (nb/en) som nevner knappene.
Ferdig når: motgiften kan nås fra knaggrekka via klatring i begge bad-nivåene og via den vanskelige veien, vann-varianten kan slås på og avgjøres (rømme eller tape), `walk_route` grønn for alle nivåer og `npm test` grønn; delmålene er oppdatert og målskjermen viser dem.

### [ ] R27 · Spilletest-runde og justering (venter på brukerens testrapporter)
Gå gjennom testrapportene fra iPhone (byggeskjerm R24–R26, delmål R23, intro R22, gulvdetaljer R13: flimmer og FPS) og juster verdier: kanthjelp (80 %), sikte-hjelp (bredde 0,7, fart 2), «Spenning» mot «Klassisk», straffenivå. Kan ikke kjøres av agentene uten rapporter; tas i samtale.
Ferdig når: rapportene er gjennomgått, verdiene justert i `SETTINGS`, og backloggens «trenger spilletest» er krysset av eller oppdatert.

## Ferdige punkter
- [x] Figurens bevegelse: snu med skritt, tråkke over små hindre, nye poser i heng/sving/veggglid, hero_move.js (R40, v1.43; følelsen testes på iPhone)
- [x] Siste shader midt i spillet forvarmes: gjennomsiktige utoningskopier, nye shaderprogram logges med nøkkel (R35b, v1.40; fra tester: Rune; ekte ms-forbedring testes på iPhone)
- [x] Perlene i gulvdetaljene er solide kuler (R37, v1.39; fra tester: Rune)
- [x] Pustelyd av som standard, egen innstilling i Lyd og stemme (R38, v1.38; fra tester)
- [x] Svar fra Claude og tellere for testere (R36, v1.34)
- [x] Færre hakk: forvarm shadere og hold antallet stabilt, shaderwarm.js (R35, v1.33; ekte ms-forbedring testes på iPhone)
- [x] Sprettboksen kaster figuren som står på den: toy_kick.js, uskadd-tid, SETTINGS (R34, v1.30; må prøves på iPhone)
- [x] «Send til Claude» (R33): tilbakemelding direkte fra spillet til Supabase med tester-kode (v1.27)
- [x] Nytt rom: lekerom (nivå 7) med legoknotter, egen fiende, musikk, delmål, verktøy-gåte og byggested (R31, v1.26; må prøves på iPhone)
- [x] Bot som klatrer og bruker verktøy: `tools/bot.mjs` med streng/løs modus, bevist på Kontroll (R32, v1.25)
- [x] Verktøy-løsninger i nivå 4–6: hårgelé-genvei i bad, barnerom og kjøkken, bevist med walk_route (R29, v1.24; må prøves på iPhone)
- [x] Flere byggebrett og byggedeler: vippe og kjøkkenbro, ny del vippe (R30, v1.23; må prøves på iPhone)
- [x] Fallgrenser varslet: landingsmarkør, fallvind og tre landingsklasser (R28, v1.22; markør og vind må bekreftes på iPhone)
- [x] Gulv og overflater: gulvdetaljer for målestokk og matter uten moiré (R13, v1.15; ekte FPS og flimmer i bevegelse må bekreftes på iPhone)
- [x] Byggeskjerm C: bygget flyttes ut i verdenen, to brett (bro og trapp) og vanskelig alternativ vei (R26, v1.14)
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
