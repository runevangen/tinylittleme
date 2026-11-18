# Veikart: fra testbrett til lekeland (Toy Story · maur · Zelda-kvalitet)

Dette er køen som de parallelle agentene (workflow) jobber seg gjennom. Hver runde velger de åpne punktene ovenfra, bygger hvert i sitt eget worktree, lar en streng kritiker underkjenne eller godkjenne, og slår godkjente sammen til `main` ett om gangen. Stoppes arbeidet (kvote, feil), står uferdige punkter igjen som `[ ]` og tas opp neste runde.

Status: `[ ]` åpen · `[x]` ferdig (versjon i parentes) · `[!]` sperret (se notat).

## Visjon
Du er noen få centimeter høy i et rom som er bygd for en annen skala: leker, møbler og maur som er like store som deg. Tenk **Toy Story / Maurice-og-maur**: varmt, mettet lys, blank plast, saftige farger, rekvisitter i barneskala. Vi vil ta det beste fra tre slags spill og blande dem:
- **Plattformspill som Super Mario Bros.**: styring som sitter med en gang, presise og morsomme hopp, og brett som lærer deg nye ting uten å forklare dem.
- **Byggespill som Bridge Builder**: du bygger din egen vei (bro, trapp, vippe) av det som finnes i rommet, med fysikk som er til å stole på, og du ser hvorfor det holdt eller brakk.
- **Enkle gåter og eventyr som i Zelda**: små gåter med verktøy og nøkler, lesbare mål, belønning for å utforske, varierte fiender, musikk og stemning.

Dette er **ikke tre minispill** ved siden av hverandre, men **én sammenhengende spillopplevelse**. Du er i samme rom, med samme figur og samme styring hele tiden: du hopper og klatrer, møter et hinder, bygger deg forbi det med ting du finner, og løser en gåte med det du har bygd eller bærer med deg. Bygging og gåter skal vokse ut av rommet og veien du går.

Prøven er **om det bidrar til å komme videre i spillet**, ikke om det skjer på en egen skjerm. Byggeskjermen er en del av spillet: den gjør det enklere å bygge, og det du bygger trenger du for å komme deg gjennom rommet. Det vi ikke vil ha, er løsrevne innslag (et dartspill eller lignende) som ikke gir deg noe du bruker videre.

Alt skal holde **Zelda-kvalitet**: ingenting skal føles uferdig.

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

> **Byggedel-serien (R45–R50):** se `docs/BYGGING_INSPIRASJON.md` for bakgrunn. Mål: blande plattform og byggespill med god, deterministisk fysikk. Felles regler: mobil først, `walk_route` uendret grønn, det finnes alltid en vanskelig vei uten bygging, fysikken (`build_phys.js`) forblir deterministisk (samme bygg gir samme resultat, testet), ingen økning i tegnekall/shadere utover budsjettet, innstillinger i `SETTINGS`, `logEv('bygg', …)`. R49 (live-vekt) og R51 (dynamiske deler) og R52 (verksted) er med vilje IKKE med: de diskuteres først.


### [ ] R87 · Personvern: ærlig tekst i spillet om hva som sendes og lagres (F8)
Lanseringskrav (A). Spillet sender (a) tilbakemeldinger/rapporter (`tlm_feedback`: tekst, rapport med innstillinger, enhetsstreng, tester-kode), (b) byggekoder til BESTE-lister (`tlm_bridges`), (c) avkrysninger og svar (`tlm_replies`, `tlm_change_checks`), og lagrer lokalt fremgang og valg. Ingen innlogging, ingen e-post. Les `docs/TILBAKEMELDING.md` (personvernlinjen) og `feedback_send.js`, `build_net.js`.
Krav: (1) **Personvernside i spillet:** «PERSONVERN» i ⚙ (og lenke fra ⚑-dialogen) som åpner en kort, vanlig tekst på norsk (og engelsk i `i18n.js`) som sier ærlig: hva spillet lagrer på enheten, hva som sendes ut og når (bare når du selv trykker SEND, eller når du har tester-kode og krysser av/deler en bro), hva det inneholder (tekst du skriver, hvilket brett, versjon, enhetstype, innstillinger, kameradata/FPS i testrapporten, tester-kode) og hva det ikke inneholder (navn, e-post, posisjon utenom i spillet, bilder), hvem som leser det, og hvordan en spiller får det slettet (be om sletting med tester-koden). Ingen juridisk tekst; kort og lett å lese på mobil med store trykkflater. (2) **Før første sending:** første gang spilleren sender en rapport/tilbakemelding vises én linje under knappen: «Sendes til utvikleren. Ikke skriv navn eller andre personopplysninger.» med lenke til PERSONVERN. (3) **Data i kode:** sjekk at rapporten ikke inneholder mer enn det teksten sier (se `report_*`-bygging i `main.js`); fjern eller anonymiser det som ikke trengs (f.eks. full user-agent: behold bare enhetstype og OS-versjon, avkort resten) og oppdater test og tekst. (4) **Sletting:** skriv i `docs/TILBAKEMELDING.md` den manuelle rutinen for å slette en testers rader (SQL i Supabase, `tlm_feedback`, `tlm_replies`, `tlm_change_checks`, `tlm_bridges`) og legg en sikker funksjon/seksjon bare hvis det er enkelt og trygt (ingen sletting fra spillet uten tester-kode). (5) `logEv('personvern', …)`, NYTT-rad i `changes_data.js`, test (DOM + tekstinnhold + at rapporten ikke har forbudte felt), Playwright-bilde (iPhone 14) av PERSONVERN, `npm test` og `npm run boot` grønne.
Ikke med: analyse (egen sak F14), samtykkebanner for cookies (vi bruker ingen), og juridisk gjennomgang.
Ferdig når: en spiller finner PERSONVERN i ⚙ og ⚑, teksten stemmer med koden (en test sjekker at rapporten bare har tillatte felt), og alle tester og boot er grønne.

### [ ] R27 · Spilletest-runde og justering (venter på brukerens testrapporter)
Gå gjennom testrapportene fra iPhone (byggeskjerm R24–R26, delmål R23, intro R22, gulvdetaljer R13: flimmer og FPS) og juster verdier: kanthjelp (80 %), sikte-hjelp (bredde 0,7, fart 2), «Spenning» mot «Klassisk», straffenivå. Kan ikke kjøres av agentene uten rapporter; tas i samtale.
Ferdig når: rapportene er gjennomgått, verdiene justert i `SETTINGS`, og backloggens «trenger spilletest» er krysset av eller oppdatert.

## Ferdige punkter

- [x] R86 · Lagring og fremdrift: trygg lagring, migrering, eksport/import, bekreftelse før sletting, docs/LAGRING.md (v2.49)
- [x] R85 · Ytelse: færre trekanter og mykere Auto-kvalitet, rombudsjett, docs/YTELSE.md (testes på iPhone) (v2.46)
- [x] R84 · Standard vanskelighet er Medium for nye spillere (lagret valg beholdes) (v2.42)
- [x] Fra tester: Rune · R83 «NYTT»-meny: siste endringer med avkryssing og faner, som Rettelser (changes_data.js, changes_logic.js, v2.38)
- [x] Fra tester: Rune · R54 Roligere kamera: følging av som standard (engangs-migrering) og synsfelt etter skjermformat (camcalm_logic.js) (R54, v2.36)
- [x] R82 · Rutenett-bygging i de vanlige byggebrettene (valgfri, MODUS-knappen) (v2.35)
- [x] Fra tester: Rune · Rettelser-menyen: faner Å SJEKKE/SJEKKET, skjul gamle, VIS ALLE (R81, v2.32)
- [x] Fra tester: Rune · «Rettelser»-meny på hovedmenyen: GÅ DIT til brett og sted, avkryssing ✓/✗ (fixes_logic.js, fixes_view.js) (R80, v2.29)
- [x] Fra tester: Rune · Verkstedet: trykkplata er flush med gulvet så figuren ikke går igjennom en hevet plate (plateGeom) (R79, v2.27)
- [x] Fra tester: Rune · fjernet del dukket opp igjen ved PRØV: spøkelset skjules når delelisten er endret (build_ghost.js) (R78, v2.25)
- [x] Fra tester: Rune · versjonsjekk i spillet og «Start ny versjon» (version_check_logic.js, version_check_view.js, SJEKK NÅ i ⚙) (R77, v2.23)
- [x] Fra tester: Rune · veiledning for rutenett-bygging: Så slik-guide, MODUS-hint, husket modus (R75, v2.20)
- [x] Fra tester: Rune · rutenett: kamp og mål, tyngre laster, budsjett og stjerner (R74, v2.19)
- [x] Fra tester: Rune · byggeskjermens oppsett: ⌂ MENY i toppraden, NULLSTILL passer, strammere Bygglab-topp (R76, v2.18)
- [x] Fra tester: Rune · rutenett-bygging: knutepunkter og staver (tre, stål, tau) på koordinatene, ny modus ved siden av den klassiske (grid_logic.js, grid_view.js) (R72, v2.08)
- [x] Fra tester: Rune · rutenett-bygging trinn 2: fagverk-følelse (belastningsfarge, kjøredekk, SLOW/PAUSE, største belastning, eksempelbro) (R73, v2.10)
- [x] Fra tester: Rune · flagget (⚑) tilgjengelig på alle skjermer, rapporten sier hvilken skjerm (R71, v2.06)
- [x] Fra tester: Rune · byggeskjermen: plasserte deler kan flyttes igjen (build.js, build_logic.js, tools/live_buildmove.cjs) (R70, v2.05)
- [x] Kinomodus: skjult UI, kamera-API, fast tid og frø, byggeskjerm og bane per tikk for trailer-opptak (cinema_logic.js, cinema_view.js) (R68, v1.93)
- [x] Fra tester: Rune · vanskelighetsnivå Nybegynner/Medium/Ekspert, Avslutt til meny, merker per brett og nivå (difficulty.js, difficulty_view.js) (R69, v1.92)
- [x] Fra tester: Rune · Bygglab: prøverom som starter i byggemodus med åtte byggesteder (bygglab_logic.js, bygglab_view.js) (R67, v1.86)
- [x] Fra tester: Rune · for mange piler: markørbudsjett og rangering (markers_rank.js) (R66, v1.83)
- [x] Fra tester: Rune · stigende vann i Nivå 4: delmål og veiledning tar hensyn til vannstanden (flood_logic.js, flood_view.js) (R65, v1.82)
- [x] Fra tester: Rune · veiledning når målet er under, bak eller ikke i bildet (guide_logic.js, guide_view.js) (R64, v1.81)
- [x] Nivå 9: Verkstedet (olje/glatte flater, vektgåte, verktøy, byggested, avslutning etter siste nivå) (R63, v1.76)
- [x] Nivå 8: Stuen (sofa, sofabord, TV-benk, bokhylle, skyvedør med trykkplate, delmål, musikk, fortelling) (R62, v1.75)
- [x] Gåteverktøy: trykkplate, dør og bryter (plates_logic.js, plates_view.js) (R60, v1.74)
- [x] Fiende: veps som flyr, patruljerer, varsler og stuper (wasp.js, wasp_view.js) (R61, v1.73)
- [x] Byggefysikk 2: fagverk, trykk mot strekk, materialtabell, gummistrikk og hjelp for ledd som svinger (build_truss.js, build_materials.js) (R49a2, v1.71)
- [x] Byggefysikk 1: bruddgrenser etter statikk og «Tåler X»-måler (build_capacity.js) (R49a1, v1.70)
- [x] Kameraet svinger med høyre tommel: dra fra knapper, kantfelt og toppbånd dreier kameraet (camdrag.js) (R59, v1.67, fra tester: Rune)
- [x] Skuffer lette å skille: åpen eller lukket (drawers.js) (R55, v1.65, fra tester: Rune)
- [x] Levende klatring: henge, gripe og skyve fra med bena (climbfeel.js) (R58, v1.64, fra tester: Rune)
- [x] Skarp tekst i toppbåndet og full NESTE-tekst med knappehint (topband_logic.js, topband_view.js) (R56, v1.63, fra tester: Rune)
- [x] Lysstråler stoppes av faste bokser, lysflekk bare der det er åpent (atmos_logic.js: beamBlockers/rayHitT) (R57, v1.62, fra tester: Rune)
- [x] Dynamisk toppbånd som samler HUD, delmål, NESTE, hint, svar, ℹ og ⚑ (topband_logic.js, topband_view.js) (R53, v1.58, fra tester: Rune)
- [x] Replay/spøkelse, eksport/import av bygg som kode, beste bygg på nett (Supabase), build_replay.js, build_net.js (R50, v1.55)
- [x] Leker som testlast: ball, bil og robot velges i byggeskjermen, build_loads.js (R48, v1.54)
- [x] Kostnad, stjerner og smulebudsjett for bygg, build_budget.js (R47, v1.53)
- [x] Leker som byggematerialer: blyant, linjal, legoklosse, bok, svamp, build_toys.js (R46, v1.52)
- [x] Lesbar svikt i byggeskjermen: spenningsfarge, bruddring og pause, «hvorfor brakk det», build_stress.js (R45, v1.51)
- [x] Zoom i byggeskjermen: +, −, ⤢, dobbelttrykk, finere rutenett ved høy zoom, build_zoom.js (R44, v1.48; fra tester: Rune; må prøves på iPhone)
- [x] Motgiften høyere opp i badet (speilskap, klatrevei, alt-vei) og vann-variant (R42, v1.46)
- [x] Flere kombinasjoner: svamp + vann, håndkle + håndkle, papirhaug, stavhopp-animasjon, combos.js, vault_anim.js (R41, v1.45)
- [x] Finpuss av Prince: kant-shimmy, rulle ved landing, forsiktig gange, tyngre tau, finpuss.js (R39, v1.44; følelsen testes på iPhone)
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
