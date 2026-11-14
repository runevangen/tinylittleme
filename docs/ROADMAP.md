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

### [ ] R64 · Fra tester: Rune · «Finner ikke hvor jeg skal»: tydelig veiledning når målet er under, bak eller ikke i bildet
Testrapport (skjermbilde, v1.76, trolig Nivå 4 Bad, på den nye hylla ved vinduet, delmål 3/4, siste delmål «Knus en vokter»): toppbåndet sier «NESTE: KNUS EN VOKTER · 0,6 m · ▼ ned», men målet (en edderkopp i tråd, `dangler`, hengende under hyllekanten) er ikke synlig, og pila inne i bildet peker oppover til høyre. Testeren finner ikke hvor hen skal. Rett opp slik (`main.js` `nextTarget`/kompass, `topband_logic.js`, `goals.js`, `markers.js`, `camera_util.js`): (1) **Konsistent pil:** pila i bildet og båndet skal peke samme vei, også loddrett (mål under = pil/chevron ned, med tydelig «▼» ved skjermkanten), ikke bare i planet. (2) **Handling i teksten:** NESTE-linja sier hva som skal gjøres med riktig knapp: «Hopp ned fra kanten her (HOPP) · 0,6 m under», og for `dangler` vises fasen: «Vent til den henger lavt, hopp ned på ryggen». (3) **Vis meg:** trykk på NESTE i båndet (eller en liten «Vis meg»-knapp i utvidet bånd) flyr kameraet kort til målet og tilbake (gjenbruk intro-sveipet/oversikten fra R22, hopp over med trykk), og peker ut avsats/kant der man bør hoppe av. (4) **Mål-markør bak kant:** når målet ikke er i bildet vises en diskret ring/ghost-markør på målet gjennom hindre (depth test av, dempet) og et kantmerke i skjermkanten i riktig retning. (5) **Ruta som hint:** bruk `route` fra brettet (rekkefølgen av flater) til å utheve neste flate man skal til (kantglød) når spilleren ikke har hatt framdrift på ca. 45 s. (6) Innstilling i `SETTINGS` (på som standard), `logEv('veiledning', …)`, tekster nb/en som nevner knappene. Gjelder alle brett og `stomp`/`reach`/`crumbs`/`puzzle`-delmål. Ikke endre delmål, kollisjon eller ruter.
Ferdig når: i nivå 4 med målet under hylla viser både bånd og pil «ned» og en handling («Hopp ned (HOPP)»), «Vis meg» flyr til målet og tilbake, en markør og et kantmerke finnes når målet er skjult, ruta utheves etter 45 s uten framdrift (test med klokke), tester dekker retning (loddrett), tekst per delmålstype og dangler-fase, Playwright-skjermbilder (`devices['iPhone 14']`) før og etter er sett på, `walk_route`, bot og `npm test` grønne, og ingen økning i tegnekall/shadere. Følelsen testes på iPhone.

### [ ] R65 · Fra tester: Rune · Stigende vann i Nivå 4: delmål og veiledning må ta hensyn til vannstanden
Avhenger av R64 (veiledning). Fra samtalen om R64: i Nivå 4 kan vannet stige (`⚙ → Spill → «Nivå 4: stigende vann»`: av, rolig, vanlig, rask; `variant.js`/`floodCfg`, `main.js` `floodMode`; druknet = tilbake til lagringspunktet). Når vannet er på, kan det gå galt: delmålet «Knus en vokter» (`goals.js`, `stomp` → nærmeste levende skapning) kan peke på en edderkopp som er under vann eller bare nåes ved å hoppe ned i vannet, og båndet sier «▼ ned» uten å varsle om vann. Rett opp: (1) **Målvalg:** `nextTarget` og delmålene (`stomp`, `crumbs`, `reach`, `puzzle`) hopper over mål som er under vannflaten eller hvis nedhopp lander i vann; velg neste mål som kan nås tørt, og hvis ingen finnes, si det i båndet («Vannet står for høyt. Klatre høyere, vannet synker/venter») og pek mot høyeste trygge flate. (2) **Varsel:** båndet og pila viser «Vann under deg · ikke hopp ned» når nedhoppet ville lande i vann; en liten vannstandsindikator i båndet («💧 40 %») mens vann er på; rødt varsel, lyd og lett kameraskjelv før man drukner. (3) **Synlig vann:** vannflaten får tydelig overflate og bunn-farge så man ser hvor dypt det er og at man kan bli stående på hylla; målmarkøren (R64) tegnes gjennom vannet. (4) **Garantert klarbart:** en bot-test (R32) simulerer stigende vann i «rolig» og «vanlig» og beviser at alle delmål i Nivå 4 kan klares før vannet stopper deg, eller at de er markert som ikke tilgjengelige mens vannet er høyt; ruta `walk_route` uendret. (5) Tekster nb/en som nevner knappene, `logEv('vann', …)`, av/på for varselet i `SETTINGS`. Standard «Av (vanlig vann)» skal være uendret.
Ferdig når: med stigende vann på peker pila og båndet aldri mot et mål under vann eller et nedhopp i vann, «Vann under deg»-varselet og vannstandsindikatoren vises (skjermbilder i `devices['iPhone 14']` sett på), bot-testen beviser at delmålene kan klares i rolig og vanlig, tester dekker målvalg med vannstand, `walk_route` og `npm test` grønne, ingen økning i tegnekall/shadere. Følelsen testes på iPhone.

### [ ] R54 · Fra tester: Rune · Roligere kamera: følging av som standard og bredere synsfelt i høyformat
Fra spilletest på iPhone (v1.32–v1.56): testerne blir desorientert og sier at skjermen veiver fram og tilbake. Med «Kamerafølging: styrke» på 0 og «Synsfelt» på 70 ble det klart bedre; med følgingen tilbake på 1 (synsfelt fortsatt 70) ble det mye verre. Den automatiske dreiningen bak figuren (`followYaw` i `camera_util.js`, kalt fra `main.js`) er altså hovedårsaken, og synsfeltet nummer to: 52° loddrett gir bare ca. 25° vannrett på stående iPhone, fordi synsfeltet ikke justeres for skjermformatet.
(1) **Følging av som standard.** «Kameraet følger etter deg automatisk» (`tlm.follow`) er av for alle, også for dem som har den gamle verdien lagret (engangs-migrering, slik PUBG-standarden på PC ble satt i v0.72). Valget og «Kamerafølging: styrke» blir stående i ⚙ → Kamera, så den kan slås på igjen. Sjefkamp-kameraet, ◎ og dobbelttrykk virker som før.
(2) **Synsfelt etter skjermformat.** Standard ca. 70° når skjermen står (høyde > bredde) og 52° som i dag når den ligger, med myk overgang når telefonen snus. Spilleren som selv har valgt et synsfelt i ⚙, beholder sitt. Skulderkamera (+8) og fall-synsfeltet (`landFovCur`) legges oppå som før. Sjekk at start-ringen og gulvdetaljene (R13) og sjefkamp-rammen (`test_bosscam.mjs`) fortsatt stemmer med nytt synsfelt, siden de er regnet ut for 52°.
Ikke med her (egne punkter senere, etter ny test): ingen automatisk vinkelretur, jevn inntrekking ved hindre, hint om ◎, «rolig følging» som eget valg, låst styreretning og romfast kamera.
Ferdig når: en ny spiller på stående iPhone får følging av og synsfelt ca. 70 uten å røre ⚙; en spiller med gamle lagrede verdier får det samme én gang; liggende skjerm har 52; valgt synsfelt og skjermformat står i testrapporten og logges med `logEv`; tester for migreringen og for synsfelt per format; alle tester grønne; Playwright-bilde i `devices['iPhone 14']` stående og liggende er sett på. Om det oppleves roligere bekreftes på iPhone (merkes «testes på iPhone»), og sveip per minutt i rapporten sammenlignes med før.

> **Byggedel-serien (R45–R50):** se `docs/BYGGING_INSPIRASJON.md` for bakgrunn. Mål: blande plattform og byggespill med god, deterministisk fysikk. Felles regler: mobil først, `walk_route` uendret grønn, det finnes alltid en vanskelig vei uten bygging, fysikken (`build_phys.js`) forblir deterministisk (samme bygg gir samme resultat, testet), ingen økning i tegnekall/shadere utover budsjettet, innstillinger i `SETTINGS`, `logEv('bygg', …)`. R49 (live-vekt) og R51 (dynamiske deler) og R52 (verksted) er med vilje IKKE med: de diskuteres først.

### [ ] R27 · Spilletest-runde og justering (venter på brukerens testrapporter)
Gå gjennom testrapportene fra iPhone (byggeskjerm R24–R26, delmål R23, intro R22, gulvdetaljer R13: flimmer og FPS) og juster verdier: kanthjelp (80 %), sikte-hjelp (bredde 0,7, fart 2), «Spenning» mot «Klassisk», straffenivå. Kan ikke kjøres av agentene uten rapporter; tas i samtale.
Ferdig når: rapportene er gjennomgått, verdiene justert i `SETTINGS`, og backloggens «trenger spilletest» er krysset av eller oppdatert.

## Ferdige punkter
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
