# Backlogg

Status: `[ ]` ikke startet · `[~]` påbegynt · `[x]` ferdig. Nyeste idéer øverst i hver gruppe.

Sist ryddet mot `CHANGELOG.md` og koden ved v1.88. Det som er bygget og målt av roadmap-runneren står i `docs/ROADMAP.md` (Ferdige punkter); her står det som gjenstår eller trenger spilletest.

## Fra spill-research (`docs/DESIGNLAERDOM.md`, v0.27)
Rangert etter verdi/innsats i rapporten. Kildegrunnlaget er svakt (søkesammendrag), så tallverdier er startverdier for tuning.
- [~] **Grep-kode (v0.28):** oransje kant på grep-flater, valgfri fremheving, og figuren rekker ut en arm når noe kan gripes. Gjenstår: tydelig negativ markering av glatte flater.
- [~] **Tilgivelse for mobilinput (v0.28):** coyote 0,14 s, hoppbuffer holdes under hurk/landing, REKK UT snapper (0,45 enheter). Kanthjelp i lufta kom i v0.62 (se under Bevegelse). Gjenstår: bredere auto-kantgrep uten knapp, spilletest av verdiene.
- [x] **Stamina i figuren (v0.38):** stripe over hodet, skjelving og svette fra 30 %, tom stamina = kontrollert skli (0,45 s), papirbånd koster lite. Trenger spilletest av tallene.
- [~] **Billig utvei (v0.46):** autolagring per brett, forsvunne ting kommer tilbake gratis, «Ting ↺» koster ikke når alt står på plass. Gjenstår: oppdage ting som er fysisk fastlåst (ikke bare forsvunnet) og sette dem tilbake gratis.
- [~] **Fallgrenser varslet (R28, v1.22):** `landing.js` har tre landingsklasser (myk/hard/farlig), landingsmarkør, fallvind og økt synsfelt mot terskelen; valg i ⚙. Gjenstår: markør og vind må bekreftes på iPhone; kontaktskygge og vindlyd er usikker (ikke verifisert i koden).
- [~] **Bot begrenset til menneskelige evner (R32, v1.25):** `tools/bot.mjs` har streng/løs modus, klatrer og bruker verktøy, og er bevist på Kontroll og på rommene (`gate_bot.mjs` for gåter). Gjenstår: at boten viser ruten visuelt, menneskelig gjennomgang av feil på lange ruter, og å avgjøre om veggsprang skal være et tillatt verktøy eller blokkeres.
- [~] **Hint etter 3 feil på samme sted (v0.46):** tips om neste hinder og kompasset vises. Gjenstår: ett verktøy per rom, første rom per mekanikk uten poengtap.
- [~] **Touch:** kast med dra–slipp er på plass fra v0.46 (snap til flate gjenstår), kameraassistanse (v0.44–0.45), kontroller minst 44 pt, presets for tilgjengelighet.
- [ ] **Personvern:** del bare geometri/objektliste, slett bilder etter generering, private brett som standard, overlay av AI-tolkningen på originalbildet før publisering.
- [~] **Kombineringsmotor** (v0.40, R41 v1.45): nål + trådsnelle → taubane i `physics.js`; svamp + vann, håndkle + håndkle og papirhaug ligger i regeltabellen `combos.js`. Gjenstår: egenskapstabell for tingene (BotW/Scribblenauts-stil) slik at nye kombinasjoner kan komme uten egen kode.
- [ ] **Verifiser** hullene i kapittel 5 av rapporten (staminatall, fallterskler, coyote-verdier, single-slot) mot primærkilder når nettilgang finnes.

## Idéer til sparring

### [~] Flytte objekter som hjelpemiddel (og risikoen for at de faller)
PoC er bygd: dytte (etter vekt), bære lette ting, stable, glir av ved dårlig støtte, knuses ved fall, klemt, fare-soner, nullstill. Se `docs/FLYTTBARE_TING.md` og prøverommet `?level=poc`.

Gjenstår / til sparring:
1. **Dra og løfte:** nå bare dytte og bære lette ting. Skal tunge kunne dras? (Å sette en lett ting oppå en hylle/annen ting er på plass fra v0.17; gjenstår: medium ting, og å løfte over hodet.)
2. **Straff:** nå klemt = tilbake til lagringspunkt (−10), knust = −5, nullstilling = −15. Riktig nivå?
3. **Bildene bestemmer?** Nå markeres løse ting for hånd i `scene.json`. Kan visjonssteget gjette (løst/fast, tung/lett, skjør)?
4. **Boten og puslespill:** boten flytter ikke ting. Hvordan validere at et brett er løsbart *ved å flytte ting*? Forslag: egne «lovlige plasseringer» per ting.
5. **Friksjon:** en ting på en annen følger ikke med når du dytter. Skal den det (realistisk, men fjerner fall-fellen)?
6. **Tipping og rotasjon** (ikke bare bokser).
7. Bedre skår/effekter.

### [ ] Roller for byggedeler: gulv, bjelke og tau (forslag, utsatt av Rune 2026-11-19: «vi starter med nei»)
Rune bestemte å **ikke** bygge dette nå (dagens oppførsel beholdes), men å legge forslaget i backloggen. Nedenfor er forslaget slik det ble lagt fram, med mine merknader.

**Problemet i dag.** Byggeren har deler (planker, klosser, leker) og koblinger (tape, ledd, tau, gummistrikk), men ingen del har en rolle. Følger: (1) *i verden*: `buildSolids` i `build_world.js` gjør alle plasserte deler om til faste bokser, så en skrå støttebjelke blir en trapp av små trinn figuren kan gå opp; (2) *i PRØV*: testfiguren går mot høyre og hopper når den støter mot noe, så den klatrer på bjelker og blir stående fast i fagverket. Tau som kobling blir aldri gulv; tau som del (materiale med `rope`) blir derimot bokser i verden som alt annet.

**Hovedvalg: hvordan bestemmes rollen?** A) spilleren merker selv (full kontroll, ett valg til per del); B) spillet gjetter ut fra vinkel (ingen ekstra trykk, men gjetter feil på ramper og skrå bruer); **C) gjett først, spilleren kan overstyre (anbefalt)**.

**Spesifikasjon (C).**
1. **Tre roller.** *Gulv*: kan gås på, bærer last, stopper figuren sideveis. *Bjelke*: kan ikke gås på, bærer last, stopper ikke figuren (den går forbi). *Tau*: kan ikke gås på, bærer bare i strekk, stopper ikke. Bjelker og tau tegnes litt bak veibanen, som i et fagverk der veibanen ligger foran.
2. **Standardrolle ved plassering.** Planke flatere enn ca. 30° = gulv; brattere = bjelke. Kloss og leke-materialer (bok, svamp) = gulv. Tau-materialer er alltid tau. Vippeplanken er alltid gulv. Rollen følger vinkelen ved rotering helt til spilleren selv har valgt rolle; da står valget fast.
3. **Bytte rolle.** Trykk en del; en knapp GULV/BJELKE vises ved siden av roter og slett (ikke på tau). Angre og nullstill gjelder også rollebytte.
4. **Utseende.** Gulv: full farge og en tydelig lys kant på oversiden. Bjelke: mørkere og litt smalere, uten kant. Tau: tynn linje. Skillet må synes uten farge alene (kant og tykkelse), av hensyn til fargeblinde.
5. **I PRØV.** Testfigur og testlaster (ball, bil, robot) hviler bare på gulv. Bjelker og tau er med i fysikken fullt ut (bærer, bøyer, knekker, ryker); spenningsfarge og «hvorfor brakk det» virker på alle roller.
6. **Ute i rommet.** Bare gulv blir faste bokser. Bjelker og tau tegnes uten kollisjon og kan ikke gripes eller klatres.
7. **Regler mot rot.** Ingen gulv = ingen vei: PRØV sier fra med en gang («Du trenger noe å gå på. Velg en del og trykk GULV.»). Hull i veibanen lengre enn hopplengden markeres før prøven. Rollen endrer ikke kostnad eller stjerner.
8. **Gamle bygg og koder.** Bygg uten rolle får standardrollen. Delekoden `TLM1.` får et nytt felt per del; gamle koder leses fortsatt, nye får nytt prefiks. Referansebygg og beste bygg på nett må prøves på nytt.
9. **Ferdig når.** En skrå støttebjelke under en bro kan ikke gås på, verken i PRØV eller i rommet; samme bro holder like mye last som før; rollen byttes med ett trykk på iPhone; gamle bygg og koder åpnes uten feil; rollebytte logges (`logEv`) og rollefordelingen står i testrapporten.

**Åpne spørsmål (forslag til svar i parentes).** Skal bjelker kunne klatres? (nei.) Skal bjelker stoppe løse ting? (nei, bare gulv stopper ting.) Er 30° riktig grense? (start der; spilleren overstyrer.) Skal klosser aldri kunne være bjelker? (ja, klosser er alltid gulv, så trappebrettene virker som før.)

**Merknad fra Claude (etter at Rutenett kom).** I Rutenett-modus finnes rollen allerede i dataene: `deck: true` på staver i `grid_logic.js` (kjøredekk) mot vanlige staver. Der kan rollen bestemmes **automatisk uten gjetting og uten ekstra knapp**: dekket er gulv, alle andre staver er bjelke. Dermed gjelder «Rutenett først, klassisk etterpå»: Rutenett får rollene gratis (liten sak: `build_world.js` bygger bare faste bokser av dekket, og PRØV-figuren hviler bare på dekket), mens klassisk (trapp, vippe) trenger vinkelgjetting og GULV/BJELKE-knappen. Sjekk også om dagens oppførsel er et reelt problem i Rutenett (staver blir faste bokser i verden, se trailerklippet 06c «Nå holder den» der broen ser ut som boksede treskiver) før arbeidet startes. Beslutning: **utsatt**, hent fram etter lansering eller hvis testere melder at de klatrer på bjelker.

## Bevegelse og spillfølelse
- [~] **Stabilisering i lufta (v0.65):** demping av stikken, sikte-hjelp mot grep/kant/tau og hold GREP er på plass (`docs/STYRING.md`). Trenger spilletest: merkes sikte-hjelpen for mye eller for lite (bredde 0,7, fart 2)? Ikke bygd, kan prøves hvis det ikke holder: «hold kursen» (slipp stikken = fortsett), svev på toppen av hoppet, mild sakte film det siste øyeblikket før et grep, og at grepet du kommer til å ta lyser opp.
- [~] **Kanthjelp (v0.62):** forsiktig stikke stopper ved kanten, løp hopper selv over gap med landingsflate (`docs/STYRING.md`). Trenger spilletest: er 80 % riktig grense, hopper han når du ikke vil, og blir Kontrollbanen for lett? Gjenstår: styrehjelp i lufta mot landingsflaten, og at boten bruker det samme.
- [~] **Naturtro figur og bevegelser (v0.62):** ny kropp (`hero.js`), føtter som står fast i Mario-stil, løp med svev, helling i sving, skritt ved snuing (`docs/FIGUREN.md`). Føtter som tilpasser seg små trinn og kanter kom i v0.93; snu med små skritt, tråkke over små hindre og nye poser i heng/sving/veggglid i v1.43 (R40), levende klatring med vekt i heng i v1.64 (R58). Stavhopp-animasjon er på plass fra v1.45. Gjenstår: bedre sving (usikker på hva som mangler etter R40/R58), spilletest på iPhone. Mål FPS på eldre telefoner (flere deler i figuren enn før).
- [~] **Detaljert rom (v0.62):** teksturer med relieff, bøker, kontaktskygger, støv (`look.js`). Gjort siden: lysstråler og mørke hjørner (v0.82), mykere skygger og lysflekk fra vinduet (v1.05), småting for målestokk og matte uten moiré (R13, v1.15). Gjenstår: avrundede kanter på møbler, samme løft for tingene i badet. Ekte flimmer og FPS fra R13 må bekreftes på iPhone.
- [~] **Klatrehjelp (v0.20):** kast, hard landing/myke flater og stavhopp er på plass i prøverommet `?level=klatring` (`docs/KLATREHJELP.md`). Nål + tråd → taubane er på plass fra v0.40. Svamp + vann, håndkle + håndkle, papirhaug og stavhopp-animasjon kom i v1.45 (R41); bot som klatrer og bruker verktøy i v1.25 (R32). Gjenstår: usikker på om boten bruker stav/kast (ikke funnet i changelog). Trenger spilletest av verdiene.
- [~] **Klatring (B):** første versjon fra v0.21: `grip`-flater, stamina, opp/ned/sidelengs, kantgrep over toppen (`docs/KLATREHJELP.md`, prøverom `?level=klatring`). Hårgelé og dopapirbånd er med fra v0.22. Badet (v0.39): et oppfunnet håndkle over servantkanten er grep (det står ikke på bildene). Boten som klatrer kom i v1.25 (R32), og glatte flater (olje) i Verkstedet i v1.76 (R63). Gjenstår: flere grep i badet (knotter, dusjkurv), sidelengs langs stang, `slick`-flater utenom verkstedet (usikker). Se `docs/BADET.md`.
- [ ] Spilletest av «Spenning» vs «Klassisk» med ekte hender, og justering av verdiene.
- [ ] Mobil-test av touch-kontrollene (stikke, HOPP, REKK UT).
- [x] «Prince»-følelse (treghet, vekt, hurk, oppstigning som tar tid, roligere kamera). Første versjon. Trenger spilletest.
- [x] Gange med skritt og fast fot (IK): første versjon. Trenger spilletest.
- [x] Finpuss av Prince: kant-shimmy, rulle ved landing, forsiktig gange og tyngre tau (R39, v1.44, `finpuss.js`). Følelsen må spilletestes på iPhone.
- [~] Kamerahjelp (v0.44): utoning av ting i veien og pil når figuren er utenfor skjermen er på plass. Fra v0.45 løfter kameraet seg over vegger og ser nedover i fall / oppover i klatring. Gjenstår: silhuett gjennom ting som ikke kan tones ut (løse ting, tak).
- [~] Kamera: valgfri automatisk dreining etter bevegelsesretning (v0.25, tast X, trenger spilletest: holder du stikken til siden går figuren i en sving). Testerne ble desorientert av dreiningen: R54 (følging av som standard, bredere synsfelt i høyformat) står åpen i `docs/ROADMAP.md`. Dra fra knapper og kantfelt dreier kameraet fra v1.67 (R59). Gjenstår: fastere kameravinkler per brett.
- [x] Figur med bøyelig overkropp, hopp/fall/landing som bevegelse, levende hvile. Første versjon. Trenger spilletest.
- [~] Figur (v0.34): ansikt med blunking/blikk/uttrykk og skjerf/sekk som fjærer er på plass. Stemme (v0.35) og tilbehør å samle og bytte (hatt, skjerf, sekk; v1.04) er på plass. Gjenstår: fingre som tar tak, hår/jakke som beveger seg.
- [x] Snu på stedet med små skritt og tråkke over små hindre (R40, v1.43, `hero_move.js`). Må spilletestes på iPhone.
- [~] Bedre hang/sving/veggglid: nye poser i v1.43 (R40) og levende heng med vekt, synlig grep og avspark i v1.64 (R58). Gjenstår: spilletest; sving er usikker.

## Lyd
- [x] Første lydmotor (syntetisert): skritt per underlag, pust, tar sats, avspark, fall, landing, hendelser. Trenger lytting.
- [x] Lydmikser: volum for hver lyd, forhåndsspilling, huskes.
- [ ] Ekte lydopptak (foley) og flere varianter per underlag.
- [~] Romlyd/ambiens: dryppende kran og vifte i badet (v0.23, `audio.ambience`). Ambiens finnes nå i brettene bad, bad2, kjøkken, kjøkken2 og kjøkkenbro (`audio.ambience` i scenene); barnerom, lekerom, stue og verksted har ikke egen ambiens (musikk per rom finnes). Gjenstår: 3D-lyd, ambiens for resten.
- [x] Mikser (v0.13) og visuell støtte for hørselshemmede: lydtekst med retning (v0.23, tast V).
- [x] Musikk (v0.84): rolig, leken musikk per rom som reagerer på maur; eget volum i ⚙. Trenger lytting.

## Brett og innhold
- [~] **Nivå 4–6 (v0.72):** de samme rommene ommøblert, med ny rute og nytt mål (`tools/make_variants.mjs`, `docs/NIVAER.md`). Siden v0.95 har de egen stemning, palett og én vri per rom. Gjenstår: løsninger som bruker verktøy (hårgelé, dopapirbånd, nål og tråd, stav) og løse ting du må flytte selv. Trenger spilletest.
- [~] **Tre nivåer (v0.71):** Bad, Barnerom og Kjøkken med stigende vanskelighetsgrad, «Neste nivå» og ✓ for klarte nivåer (`docs/NIVAER.md`). Fortelling og målskjerm mellom nivåene kom i v0.92, delmål i v1.08. Gjenstår: spilletest av vanskelighetsgraden, egne former i barnerom og kjøkken (seng, stol, kjøleskap, komfyr), og om nivåer skal låses til forrige er klart.
- [~] **Badet på nytt (v0.66):** bygd fra fire bilder med riktig planløsning og kjennetegn (`docs/BADET.md`). Gjenstår: skråtak, åpen dør med gang utenfor, hyller i speilskapet, motgiften høyere opp (medisinskap/kurver) med vei fra knaggrekka, dusjslange som tau, tre dører på vaskeskapet. Trenger tilbakemelding: kjenner du deg igjen, og hva mangler mest?
- [~] **Listverk (v0.61):** fotlist, taklist og gerikt (lister og foringer) med profil i Soverom (rundt rommet og vinduet). `kind`: `listverk`, `fotlist`, `taklist`, `gerikt`. Gjenstår: bruke i badet (foringer rundt dør/vindu og fliskant), dørfôr/vannbrett som egne profiler, og lister som klatrekanter.
- [x] Motgiften høyere opp i badet: speilskap med klatrevei og vanskeligere alt-vei (R42, v1.46). Resten som gjenstår står under «Badet på nytt».
- [~] Motgift-varianter: B) vann stiger er gjort som valgbar variant (R42, v1.46) og stigende vann i Nivå 4 har delmål og veiledning (R65, v1.82). Gjenstår: A) bit = ferdig kapittel.
- [x] **Vasken i badet er flat (testrapport v0.84 og v0.86, nivå 1 og 4) – gjort i v0.88:** benkeplata er fire bokser (`vask_plate`, `vask_rim_v/h/f`, gruppe `vask`) rundt en 8 cm dyp forsenkning; bunnen er toppen av skapet (76 cm). Tegnes som én form med hull (`sink` i `props.js`). (Gammel beskrivelse følger:) bygges som en flat plate med tegnet bunn; trenger ekte forsenkning (kantbokser rundt + lavere bunn), og smulene/tannkrem/sjekkpunkt på `vask_plate` må flyttes med. Gjelder også nivå 4 (`bad2`).
- [~] Vask (forsenkning), karets avrundede ende og skråtak: *utseendet* er på plass fra v0.18–0.19 (`props.js`: do, kar, vask, småting). Kollisjonen er fortsatt bokser: vasken er flat å gå på, karet har rettvinklede vegger. Skråtak mangler. Venter på bildene for å rette formene (hvilken ende er rund osv.).
- [x] **Byggeskjerm (R24–R26, v1.09–v1.14):** egen byggemodus med sideriss og snapping, 2D-fysikk (planker, klosser, tau, tape, vekter) og testfigur, bygget flyttes ut i verdenen som solid; brettene bro og trapp, alltid med en vanskelig alternativ vei. Trenger spilletest på iPhone. Byggedel-serien siden: vippe og kjøkkenbro (R30, v1.23), zoom (R44, v1.48), lesbar svikt (R45, v1.51), leker som materialer (R46, v1.52), kostnad/stjerner/smulebudsjett (R47, v1.53), leker som testlast (R48, v1.54), replay/kode/beste bygg (R50, v1.55), byggefysikk etter statikk og «Tåler X» (R49a1, v1.70), fagverk, knekking og materialer (R49a2, v1.71), Bygglab (R67, v1.86). Gjenstår: R49b live-vekt i verdenen, R51, R52 (under), og at boten bygger selv (i dag bruker `tools/bot.mjs` bare ferdige referansebygg, R30/R32).
- [x] **Delmål (R23, v1.08), mål-lesbarhet i start (R22, v1.07), levende leker (R18, v1.10), fiendevariasjon (v1.06), minnebudsjett (R21, v1.11):** se `docs/ROADMAP.md`.
- [x] Neste rom: lekerom (nivå 7, R31, v1.26), Stuen (nivå 8, R62, v1.75) og Verkstedet (nivå 9, R63, v1.76) er bygd; kjøkken er nivå 3. Se `docs/NIVAER.md`. Gjenstår: spilletest på iPhone.
- [x] **Gåter og fiender (R60–R61, v1.73–v1.74):** trykkplate, dør og bryter er datastyrt i scenen (`plates_logic.js`, `plates_view.js`); veps som flyr, varsler og stuper (`wasp.js`, `wasp_view.js`). Sjefmaur i siste rom kom i v0.99.
- [x] **Hjelp og lesbarhet fra tester (Rune), v1.58–v1.83:** dynamisk toppbånd (R53), skarp tekst (R56), veiledning når målet er under/bak (R64), markørbudsjett (R66), skuffer (R55), solstråler (R57). Se `docs/ROADMAP.md`.
- [ ] Åpne spørsmål om motgift-biter: bæres mellom rom? antall? bonusting? (`docs/BADET.md`)

## Foto → brett
- [ ] **Fra tester: Rune · Dato og klokkeslett på egne brett:** vis når et brett fra bilder ble laget (i MINE BRETT og ved JUSTER SISTE BRETT), så flere forsøk fra samme rom kan skilles og sammenlignes (nyttig sammen med modell- og modusvalgene i v2.191).
- [ ] Bedre fangstprotokoll (hjørnebilder, gulvhøyde, A4-referanse). Se `docs/FOTO_TIL_BRETT.md`.
- [~] Strukturert tolkning: skjema, validator, tingliste og instruks er på plass (v0.24, `docs/VISJON_PROMPT.md`). Gjenstår selve API-kallet (bilder inn, scene ut) og at det kjøres med en nøkkel; i dag gjøres steget fortsatt for hånd i en samtale.
- [~] Brukergjennomgang: hjelpeobjekter kan merkes og listes i ⚙ (v0.24). Gjenstår: en visning der man kan flytte/fjerne feilplasserte ting før spilling.
- [ ] Personvern: behandle på enhet eller slett umiddelbart etter tolkning.

## Teknisk
- [x] **«Send til Claude» fra spillet (Supabase, v1.27):** ⚑-boksen og ⚙ → Test sender rapporten direkte til `tlm_feedback`, med tester-kode og RLS (kun innsetting). Se `docs/TILBAKEMELDING.md`. Svar til testere og tellere kom i v1.34 (R36). Gjenstår: daglig oppsummering av nye meldinger (planlagt oppgave), og å se meldinger per tester.
- [x] Boten forstår klatring og verktøy (R32, v1.25); `gate_bot.mjs` løser gåter med ekte fysikk (v1.74–v1.76). Gjenstår: farer utover hazards (usikker).
- [ ] **R49b Live-vekt i verdenen** (`docs/BYGGING_INSPIRASJON.md`, R49 del 2): bygget gir etter og kan briste når du og maur går på det i verdenen (først nedbøyning + grense). Statikken (R49a1/a2) er på plass i byggeskjermen; ikke koblet til verdenen.
- [ ] **R51 Dynamiske deler:** fjær, trinse og stempel/vindebro i `build_phys.js`, hver for seg testet (stor). Gummistrikk kom i R49a2.
- [ ] **R52 Verksted:** fri byggemodus fra startskjermen med ubegrensede deler, lagring og lasting, og egne utfordringer. (Ikke det samme som nivå 9 Verkstedet eller Bygglab.)
- [ ] **R68 Kinomodus** (`?cinema=1`, `docs/TRAILER.md`): ikke funnet i koden ennå; montasjeverktøyet i `tools/trailer/` er på plass (v1.88).
- [ ] **R69 Vanskelighetsnivå** (Nybegynner/Medium/Ekspert, avslutt til meny, velg brett): åpen i `docs/ROADMAP.md`, fra tester: Rune.
- [ ] **R27 Spilletest-runde:** venter på testrapporter fra iPhone.
- [ ] Portere fysikk til Unity/Godot (`physics.js` er uten DOM).
- [ ] Flerspiller (langt frem).
