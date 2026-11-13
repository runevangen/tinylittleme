# Veikart: fra testbrett til lekeland (Toy Story · maur · Zelda-kvalitet)

Dette er køen som de parallelle agentene (workflow) jobber seg gjennom. Hver runde velger de åpne punktene ovenfra, bygger hvert i sitt eget worktree, lar en streng kritiker underkjenne eller godkjenne, og slår godkjente sammen til `main` ett om gangen. Stoppes arbeidet (kvote, feil), står uferdige punkter igjen som `[ ]` og tas opp neste runde.

Status: `[ ]` åpen · `[x]` ferdig (versjon i parentes) · `[!]` sperret (se notat).

## Visjon
Du er noen få centimeter høy i et rom som er bygd for en annen skala: leker, møbler og maur som er like store som deg. Tenk **Toy Story / Maurice-og-maur**: varmt, mettet lys, blank plast, saftige farger, rekvisitter i barneskala. Vi vil ta det beste fra tre slags spill og blande dem:
- **Plattformspill som Super Mario Bros.**: styring som sitter med en gang, presise og morsomme hopp, og brett som lærer deg nye ting uten å forklare dem.
- **Byggespill som Bridge Builder**: du bygger din egen vei (bro, trapp, vippe) av det som finnes i rommet, med fysikk som er til å stole på, og du ser hvorfor det holdt eller brakk.
- **Enkle gåter og eventyr som i Zelda**: små gåter med verktøy og nøkler, lesbare mål, belønning for å utforske, varierte fiender, musikk og stemning.

Dette er **ikke tre minispill** ved siden av hverandre, men **én sammenhengende spillopplevelse**. Du er i samme rom, med samme figur og samme styring hele tiden: du hopper og klatrer, møter et hinder, bygger deg forbi det med ting du finner, og løser en gåte med det du har bygd eller bærer med deg. Bygging og gåter skal vokse ut av rommet og veien du går, ikke være egne moduser som bryter flyten mer enn nødvendig.

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

### [ ] R49a1 · Byggefysikk 1: bruddgrenser etter statikk og «tåler X»-måler
Fra samtalen om byggedelen (`docs/BYGGING_INSPIRASJON.md`): å bygge riktig skal lønne seg, så de som forstår fysikken får bro som tåler mer. Eksperiment (`tools/phys_exp.mjs`, v1.50) viste at dagens modell (`build_phys.js`: kulekjeder med bøyebånd, brudd når vinkelen mellom to biter blir for stor) gir feil: **last nær opplager tåler mindre enn last midt på** (2 mot 3 klosser, skal være motsatt), to planker oppå hverandre med tape gir bare 1,7× i stedet for flere ganger, og planke på høykant er ikke stivere enn flat. Bytt bruddkriteriet fra vinkel til **bøyemoment** (kurvatur × bøyestivhet EI per del og per materiale, brudd når momentet over delens kapasitet), slik at støtter under, lastfordeling og avstand til opplager teller. Innfør **profil** (tykkelse/dybde d, stivhet ∝ d³) slik at en høy bjelke (f.eks. planke på høykant som egen del eller valg) er mye stivere enn en flat; tape mellom lag skal overføre skjær slik at sammenteipede lag blir stivere jo flere tapepunkter (helt sammensatt nær 4× for to like lag). Behold determinisme (fast tidssteg, samme bygg gir samme resultat) og ytelse (ikke mer enn ca. 1,5× dagens tid per simuleringssteg, målt i node). Legg inn **«Tåler X»-måler**: ren funksjon `capacity(def)` som øker en kloss-last midt på deterministisk til brudd og gir «tåler ca. N klosser»; vises i byggeskjermen (nb/en, nevner knappene) før eller etter prøven, og i `logEv('bygg', …)`. Alt som skal være testet som **akseptansetester fra statikk** i `test_buildphys.mjs`/ny `test_buildstatics.mjs`:
(1) en last nær opplager tåler minst like mye som samme last midt på (monotont mot opplager), (2) to like planker teipet på tre steder tåler minst 3× én planke, med teip på ett sted mindre enn med tre, (3) en støtte midt under en planke gir minst 2× tåleevne, (4) en høy bjelke (profil) tåler minst 3× en flat av samme lengde, (5) kapasitet er uavhengig av rekkefølgen delene ble plassert i, (6) samme bygg gir identisk resultat to ganger, (7) alle eksisterende bygg-tester og referansebyggene i brettene (bro, trapp, kjøkkenbro, vippe) er fortsatt gyldige løsninger; endre en eksisterende terskel bare der den er fysisk uriktig og forklar det i testkommentaren. Det finnes fortsatt alltid en vanskelig vei uten bygging, `walk_route` uendret grønn.
Ferdig når: alle sju akseptansetestene er grønne, målingen av simuleringstid står i rapporten (før og etter), «Tåler X» vises i byggeskjermen på `devices['iPhone 14']` (skjermbilde sett på), `npm test` og `walk_route` grønne, ingen økning i tegnekall/shadere. Følelsen testes på iPhone.

### [ ] R49a2 · Byggefysikk 2: fagverk (trekanter), trykk mot strekk og ulike materialer
Avhenger av R49a1. Gjør at **trekanter og fagverk er den tydelige belønningen** (Poly Bridge-lærdommen): (1) ledd mellom deler (`hinge`) skal gi en stang-og-ledd-oppførsel der aksialkrefter bæres: en trekant av tre ledd-forbundne planker er stiv og bærer last, mens en firkant av fire ledd-forbundne planker (parallellogram) gir etter og kollapser uten diagonal; (2) **trykk og strekk er ulike**: slanke deler (blyant, linjal, lang planke) **knekker i trykk** etter Euler-knekking (kapasitet ∝ EI/L²) og tåler mer i strekk; tau/gummistrikk bærer bare strekk (gummistrikk strekker seg og trekker tilbake); bok og legoklosse tåler trykk godt men er sprø; svamp demper og gir etter jevnt; (3) **materialegenskaper** som tabell i en egen testbar modul (`build_materials.js`): stivhet (E), tetthet, trykk- og strekkapasitet, sprøhet/duktilitet (brekker brått eller bøyer seg), demping, friksjon — og knytt R46-delene til den; (4) liten **hjelp som viser stive og slappe deler**: etter en feilet prøve og som valgfri visning før prøven (innstilling i `SETTINGS`) markeres ledd som kan svinge («legg til en diagonal») og deler nær knekking, med forklaring i R45-teksten; (5) deterministisk, ikke mer enn ca. 1,5× dagens tid per steg. Akseptansetester fra statikk: (a) trekant (3 planker, 3 ledd) bærer last over et gap og avbøyer minst 5× mindre enn firkant (4 planker, 4 ledd) som kollapser, (b) firkant + diagonal bærer, (c) slank del (blyant) knekker i trykk ved lavere last enn den ryker i strekk, (d) gummistrikk strekker seg mer enn tau og trekker seg tilbake, (e) samme materiale i ulike lengder: lengre knekker tidligere (∝ 1/L²), (f) determinisme, (g) alle eksisterende tester og referansebygg fortsatt grønne, `walk_route` uendret og alternativ vei uten bygging finnes.
Ferdig når: de syv testene er grønne, hjelpevisningen vises på `devices['iPhone 14']` (skjermbilde sett på) og kan slås av, `npm test` og `walk_route` grønne, ingen økning i tegnekall/shadere. Følelsen testes på iPhone.

### [ ] R60 · Gåteverktøy: trykkplate, dør og bryter (Zelda-gåter som bruker fysikk)
Bygg på `puzzle.js`/`puzzle_view.js` (nøkkel og lås) og vekt/fysikk (`physics.js`, flyttbare ting, byggedeler). Nytt, datastyrt i scenen: **trykkplate** (utløses av masse over en terskel: figuren, en flyttbar ting som kloss, bok eller legoklosse, eller en bygd del), **dør/port/vindebro** som åpnes eller senkes av plata (og lukkes igjen når vekten tas bort, eller blir stående, valg per gåte), og **bryter** som slås med TA. Eksempel-gåter å støtte: «bære en bok bort på plata så døra åpner seg», «bygg en bro/trapp til plata», «to plater som må trykkes samtidig». Lesbart uten tekst: plata synker og lyser, døra viser lås/åpen, lyd (klikk, rumling) og lydtekst, og `goals` kobles til («åpne porten»). Lagres i autolagringen og gjenopprettes. Moduler: `plates_logic.js` (ren, testet) og `plates_view.js`; ny `.js` legges i `files`; `logEv('gåte', …)`; innstillinger i `SETTINGS`. **Bevis:** `walk_route`/bot (`tools/bot.mjs`, R32) må kunne løse en gåte med plate og flyttbar ting, og det finnes et testbrett (utvid `kontroll` eller nytt `?level=gaate`) som viser alle tre. Alle gåter har en løsning, og de som blokkerer hovedveien har en kjent løsning bevist av boten; valgfrie gåter gir belønning (smuler/stjerne).
Ferdig når: plate, dør og bryter fungerer på iPhone med stikke + TA/HOPP/GREP, boten løser gåten med plate (test), tester dekker terskel, åpne/lukke, to-plate-gåten og lagre/fortsett, `walk_route` og `npm test` grønne, ingen økning i tegnekall/shadere.

### [ ] R61 · Fiende: veps som flyr (ny trussel som ikke går på gulvet)
Rommene har bare bakkefiender (maur, edderkopp, bille, sjefmaur). Lag en **veps** (eller flue) som patruljerer i lufta langs en bane, varsler med lyd og farge før den stuper mot deg, og som kan unngås ved å gjemme seg under ting, treffe den med et hopp ovenfra mens den stuper, eller lure den inn i noe. Gjenbruk `foes.js`/`creatures.js` (mønster fra edderkopp og bille), egen modell i barneskala (`props.js`, blank tegnefilm-stil, ingen nye shadere utover forvarmingen i `shaderwarm.js`), lyd og lydtekst, musikken stemmer inn (`music.js` blir mer spent). Datastyrt i scenen (bane, fart, rekkevidde), `logEv('fiende', …)`, av/på og vanskelighet i `SETTINGS`. Må kunne klares med stikke + TA/HOPP/GREP. Legges i minst ett eksisterende brett (f.eks. Barnerom eller Kjøkken) uten å gjøre ruta umulig.
Ferdig når: vepsen finnes i et brett og oppfører seg som spesifisert (tester på bane, varsel, stup, treff), kan unngås eller klares på iPhone (skjermbilder sett på), `walk_route` og bot-tester er uendret grønne (boten må ta hensyn til vepsen eller brettet må være klarbart uten å møte den), `npm test` grønn, tegnekall/shadere holder budsjettet.

### [ ] R62 · Nivå 8: Stuen (sofa, sofabord, TV, bokhylle og et teppe som er en hel verden)
Avhenger av R60 og R61. Nytt rom i barneskala, bygget som grunnscene (`scenes/stue.scene.json`, `tools/scene2level.mjs` eller samme oppsett som lekerommet `tools/make_leke.mjs`) og lagt inn som nivå 8 etter lekerommet. Idé: **sofa med puter** (klatre og hoppe mellom puter, myke landinger), **sofabord** med spill og fjernkontroll (fjernkontrollen er en tung ting som kan bære en plate), **bokhylle** (klatrevei), **teppe** med mønster (lesbare soner), **TV-benk** med en kabelfelle. Rommet har: minst 3 **delmål** (`goals`), en **gåte** med trykkplate (R60: bær fjernkontrollen eller en bok til plata så porten åpner seg), et **byggested** (bro mellom sofa og sofabord av puter, bøker og planker; R46-deler) med alltid en vanskelig vei uten bygging, en **veps** (R61) eller bakkefiender, 10 smuler, egen **musikk** og stemning (`music.js`), egen **fortelling og intro** (R22, `story.js`, `i18n.js` nb/en som nevner knappene), målskjerm, og **overgang** fra og til nabonivåene. Valider scenen (`tools/validate_scene.mjs`, `docs/scene.schema.json`), gå ruta (`node tools/walk_route.mjs levels/stue.level.json`) og la `walk_route` bevise både hovedveien og den alternative veien.
Ferdig når: Stuen kan spilles fra startskjerm til mål på iPhone med stikke + TA/HOPP/GREP (skjermbilder sett på), `walk_route` og bot er grønne for nivået, nivåvalg/«Neste nivå»/målskjerm/lagring virker, `npm test` grønn (inkl. nye brett-tester), tegnekall og teksturminne holder `perf_budget.js`.

### [ ] R63 · Nivå 9: Verkstedet/garasjen (olje, verktøy og tung maskineri i liten skala)
Avhenger av R60 og R61. Nytt rom som er det mest «tekniske» i huset: **verktøykasse** (skrutrekker som stav, spiker, teip og linjal som byggedeler), **arbeidsbenk** med skrustikke, **oljeflekk/såpe** som er glatte flater (`slick`, se BACKLOG «slick-flater»: man glir uten grep, med rød ✕ og glansstriper fra v1.00), **sykkeldekk** som ruller, **verktøyvegg** med hull (klatrevei), og et **tung-vekt-gåtekammer** med to trykkplater (R60) der man må balansere vekt. Minst 3 delmål, en bygging som kombinerer tau/tape (R25/R49a) og gåten, bakkefiender og veps, egen musikk og fortelling, 10 smuler, overgang til målskjerm og til slutten av spillet (utvid avslutningen etter siste nivå). Alt som i R62: validering, `walk_route`/bot-bevis, alternativ vei, nb/en-tekster, lagring.
Ferdig når: som R62 for dette rommet, pluss at glatte flater oppfører seg riktig (test: gli uten grep, gripbar kant fungerer) og avslutningen etter siste nivå viser at spillet er ferdig.

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
