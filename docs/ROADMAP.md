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

### [ ] R34 · Sprettboksen kaster figuren
Fra testrapport (tester Rune, v1.28, nivå 3 Kjøkken, iPhone): «Når sprett opp trollet kommer så burde jeg bli kastet bort.» Sprettboksen (`leke_sprettboks`, R18, `toys_live.js`) popper i dag med lyd og bevegelse, men figuren som står på den påvirkes ikke. La popp gi figuren et tydelig kast (opp og litt bort fra boksen, retning fra boksens midte), kort «uskadd»-tid så han ikke fanges igjen, og en liten figurreaksjon (arme opp, rop) og lydtekst. Kastets styrke og av/på i `SETTINGS` (finjustering i admin), `logEv('leke', …)`. Må virke med stikke + TA/HOPP/GREP, og ikke gjøre at man kastes ut av brettet eller forbi målet på en urettferdig måte: sjekk alle brett med sprettboks, og at `walk_route` er uendret grønn. Ren logikk (kastvektor, avstand fra boks) i testbar modul eller funksjon.
Ferdig når: figuren som står på sprettboksen i nivå 3/6 (og andre brett med den) kastes tydelig når den popper, tester dekker kastvektor, kort uskadd-tid og at figuren som ikke står på boksen ikke påvirkes, `walk_route` og `npm test` er grønne.

### [ ] R35 · Færre hakk: forvarm shadere og hold antallet stabilt
Fra testrapport (v1.28, nivå 3 Kjøkken, iPhone 18.7, 57 fps snitt): hakk på 2910 ms (ved 13 s), 444, 500, 542 og 587 ms tidlig i økta, og antall shadere stiger for hver gang (42 → 50 → 54 → 56 → 57 → 60). Det tyder på at shadere kompileres midt i spillet fordi `forvarming` (perf_budget/main.js) ikke dekker alle materialer og effekter (nye materialtyper fra R13/R18/R28/R30, oversikt-kamera, lykt, landingsmarkør, bygg, sprettboks-effekt osv.). Finn hva som utløser hver ny shader (logg program-antall i `logEv('hakk', …)` finnes allerede), forvarm dem under lasting/introen (f.eks. `renderer.compile` med alle materialer og lysoppsett, eller skjult ramme per materialtype), og begrens uten å øke tegnekall eller minne. Sikre også at det ikke kommer nye shadere når spilleren åpner oversikt, berører en lek, lander hardt eller starter bygging.
Ferdig når: en test (Playwright, iPhone 14, programvare-GL er ok siden vi teller programmer, ikke ms) spiller en økt i nivå 3 med oversikt, lek-pop, hopp og landing og viser at `renderer.info.programs.length` er uendret etter forvarmingen; rapport/logg viser antall shadere ved start og etter økta; ingen økning i tegnekall eller teksturminne; alle tester grønne. Ekte ms-forbedring bekreftes på iPhone (merkes «testes på iPhone»).

### [ ] R27 · Spilletest-runde og justering (venter på brukerens testrapporter)
Gå gjennom testrapportene fra iPhone (byggeskjerm R24–R26, delmål R23, intro R22, gulvdetaljer R13: flimmer og FPS) og juster verdier: kanthjelp (80 %), sikte-hjelp (bredde 0,7, fart 2), «Spenning» mot «Klassisk», straffenivå. Kan ikke kjøres av agentene uten rapporter; tas i samtale.
Ferdig når: rapportene er gjennomgått, verdiene justert i `SETTINGS`, og backloggens «trenger spilletest» er krysset av eller oppdatert.

## Ferdige punkter
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
