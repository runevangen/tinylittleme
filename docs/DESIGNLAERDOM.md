# Gjør tung bevegelse lesbar og tilgivende på mobil

Den viktigste lærdommen fra LittleBigPlanet og de andre spillene er ikke en enkelt mekanikk, men en rekkefølge: **først lesbarhet** (spilleren må se hva som er grep, glatt, mykt og farlig), **så tilgivelse** (feil skal føles rettferdige og være billige å rette opp), **så dybde** (kombinering og verktøy). LittleBigPlanets mest siterte svakheter var nettopp lesbarhet og presisjon: spillere visste ikke hvilket dybdeplan de sto på, og kontrollen ble kalt flytende ([Engadget](https://www.engadget.com/2008-10-28-ps3-fanboy-review-littlebigplanet.html), [Giant Bomb](https://giantbomb.com/littlebigplanet/3030-20602/user-reviews/2200-7776/)). Tinylittleme har allerede mye av det beste fra LBP og Prince of Persia: gripbarhet som materialegenskap, tung og forutsigbar bevegelse, myke flater, én ting om gangen og en bot som validerer brett. Det som mangler eller bør strammes inn, er først og fremst signalering (grep, fallgrenser, stamina i selve figuren), tilgivelse for mobilinput (coyote-tid, hoppbuffer, auto-grep), billigere utveier ved fastlåsing, atferdsstyrt hjelp og at boten begrenses til menneskelige evner og viser ruten sin. Kombinering bør bygges som en liten tabell over egenskaper og regler, og introduseres ett verktøy om gangen. Nesten alt under bygger på søkesammendrag, ikke fulltekst (se kapittel 2), så tallverdier er startverdier for tuning, ikke fasit.

## 1. Sammendrag: ti anbefalinger rangert etter verdi og innsats

| # | Anbefaling | Verdi | Innsats | Status i dag |
|---|---|---|---|---|
| 1 | **Én konsekvent visuell kode for grep-flater**, tydelig negativ markering av glatte flater, og figuren rekker ut hånden når grep er innen rekkevidde | Høy | Lav | Grep-flater finnes; kode og «rekk ut»-respons bør sjekkes og strammes |
| 2 | **Tilgivelse for mobilinput:** coyote-tid, hoppbuffer, bredt auto-kantgrep, snap til nærmeste grepspunkt ved REKK UT | Høy | Lav | Kantgrep finnes; sjekk coyote/buffer/snap |
| 3 | **Stamina vist i figuren** (skjelving/farge ved lite igjen), tom stamina = kontrollert skli, tau uten stamina-kostnad | Høy | Lav | HUD ▮▮▮▯ finnes; mangler varsel i figuren |
| 4 | **Billig, alltid tilgjengelig utvei:** auto-respawn av ting som havner utilgjengelig, gratis nullstill når en ting er fysisk fastlåst, korte seksjoner mellom lagringspunkter | Høy | Lav–middels | N koster 15 poeng; bør differensieres |
| 5 | **Fallgrenser varslet før landing:** kontaktskygge/landingsmarkør, vindlyd og FOV-økning mot terskelen, tre tydelige landingsklasser | Høy | Middels | Terskler 18/27 finnes; varsling bør legges til |
| 6 | **Boten begrenses til menneskelige evner**, tester med margin, viser ruten, og sendes til menneskelig gjennomgang ved feil i stedet for å forkaste | Høy | Middels | Boten finner veggsprang-snarveier og feiler på håndklerouten |
| 7 | **Ett verktøy per rom, kombinering som «vri» senere**, uten tekst, med synlig lokkemat; hjelp utløses av gjentatte feil | Høy | Middels | Kombinering planlagt, ikke bygd |
| 8 | **Touch:** kontekstuell TA/KAST, kast med dra–slipp og prikkbane med snap, kameraassistanse, kontrollere minst 44 pt | Høy | Middels | Flytende stikke + 3 knapper finnes |
| 9 | **Bildepersonvern:** del bare geometri/objektliste, slett bilder etter generering, private brett som standard, overlay av AI-tolkningen på originalbildet før publisering | Høy (for deling) | Middels | Menneskelig gjennomgang finnes via merkede hjelpeobjekter |
| 10 | **Kombineringsmotor som tabell av egenskaper og regler** (BotW/Scribblenauts-modellen), testet i ett rom først; taubane som forhåndsdefinert bane | Middels–høy | Høy | Planlagt |

Poengsystemet (lagring 25, tilbakeføring 10, nullstill 15) er den enkeltdelen der notatene peker mest på en reell risiko for korte mobiløkter. Anbefalingen er å skille trygg autolagring av grunnfremgang fra frivillige, betalte valg (kapittel 3.5 og 4).

## 2. Kildegrunnlag og begrensninger

Sidene kunne ikke åpnes i fulltekst (DNS/proxy-blokkering), så nesten alle funn bygger på **søkesammendrag**, ikke på lesing av primærkildene. Unntaket er Apples retningslinjer for spillkontroller, som ble lest fullt. GDC-foredrag, Nintendos «Ask the Developer», Valve-kommentarer og Media Molecules egne utsagn er altså bare omtalt via sekundærkilder. Rapporten skiller derfor tre nivåer:

- **(K)** kildebelagt via søkesammendrag, med lenke. Sterkest når det er utviklerutsagn, svakere når det er anmeldelser, fora eller fan-wikier.
- **(T)** tolkning: min slutning fra funnene, uten direkte belegg.
- **(H)** fra hukommelsen i notatene, ikke verifisert. Slike tall (f.eks. staminakonstanter i Celeste eller fallterskler i Prince of Persia og Tomb Raider) gjengis ikke som fakta, og brukes ikke som grunnlag for verdiforslag.

Alle foreslåtte tallverdier er **startverdier for tuning** mot ekte spillere på ekte telefoner. Kapittel 5 samler de viktigste hullene.

## 3. Lærdommer per tema

### 3.1 LittleBigPlanet i dybden

**Gripbarhet er en materialegenskap, ikke en generell regel.** I LBP er svamp, polystyren og dissolve gripbare, papp kan flyttes men ikke gripes, og glass er glatt ([LBP Wiki: Materials](https://littlebigplanet.fandom.com/wiki/Materials)). At glass var gripbart, ble behandlet som en bug og fjernet med patch (samme kilde). Poenget er at utseende og funksjon må stemme, og at avvik er feil, ikke hemmeligheter. Det er direkte overførbart: frotté, svamp og tau som grep, porselen og fliser som glatt. Kunstretningen bygde på virkelige, håndlagde materialer, slik at spilleren kunne gjette funksjonen ut fra hverdagserfaring ([MCV: Develop '09](https://www.mcvuk.com/littlebigplanets-design-secrets-revealed/)). For et 5 cm stort menneske i et bad er det en gave: alt har kjent oppførsel (T).

**Dybdelesbarhet og presisjon var LBPs hovedklager.** Tre dybdeplan gjorde at spillere ikke alltid visste hvilket plan de sto på, og ga «occasionally infuriating death» ([Engadget](https://www.engadget.com/2008-10-15-nega-review-littlebigplanet.html)). Kontrollen ble beskrevet som flytende, og selv i LBP3 mener noen at presisjonen mangler ([GameRevolution](https://www.gamerevolution.com/review/66147-littlebigplanet-3-review)). Sumo gikk i Sackboy: A Big Adventure til ekte 3D, forpliktet seg til 60 fps og en responsiv figur, og droppet det flytende hoppet ([GamesRadar](https://www.gamesradar.com/sackboy-a-big-adventure-ps5-interview-preview-feature/), [PlayStation Blog](https://blog.playstation.com/2020/09/29/embark-on-an-epic-3d-platform-journey-in-sackboy-a-big-adventure-coming-to-ps5/)). Anmeldere melder likevel at faste kameravinkler gjør dybdehopp mot kamera vanskelige i sene nivåer ([Seasoned Gaming](https://seasonedgaming.com/2020/12/08/review-sackboy-a-big-adventure-a-knitted-bundle-of-joy/)). Tinylittleme er ekte 3D og har tung bevegelse, så problemet blir «hvor lander jeg?» snarere enn «hvilket plan?» (T). All kritikk gjelder gamepad; med tommelstyring er presisjonen enda svakere (T).

**Utveier: checkpoints, ikke reset-knapp.** LBP har checkpoints med begrenset antall liv (tre, seks eller uendelig), og nivået slutter om siste checkpoint går tom ([LBP Wiki: Checkpoints](https://littlebigplanet.fandom.com/wiki/Checkpoints)). At spilleren kan «ta livet av seg» fra menyen når noe sperrer veien, er hukommelse og ubekreftet (H). Fysikkpuslespill uten sikkerhetsventil kan låse spilleren, så ting som kan bæres og stables trenger respawn og reset (T).

**Opplæring: vennlig stemme, men tungt for noen.** LBP lærer via tutorials i åpningsnivået fortalt av Stephen Fry og en egen tutorial per skaperverktøy ([Time Out](https://www.timeout.com/movies/littlebigplanet), [Giant Bomb](https://giantbomb.com/user-reviews/id/696/a-game-for-everyone)). Mottakelsen er delt: AV Club mente at ikke Fry kunne gjøre tutorial-nivåene mindre av en slog ([AV Club](https://avclub.com/littlebigplanet-1798215060)). Lærdommen er at tvungne tutorials må være korte og kunne hoppes over (T).

**Skaperverktøy: begrenset budsjett, sosial kvalitet.** Termometeret blokkerer plassering og lagring ved overheat ([LittleBigWiki: Thermometer](https://littlebigplanet.miraheze.org/wiki/Thermometer)). LBP2 ga mye rekkevidde fra få logikkdeler (toggle, teller, timer, sequencer, Controlinator) ([WonderHowTo](https://ps3.wonderhowto.com/how-to/use-advanced-logic-littlebigplanet-2-including-counters-and-controllinator-422988/)). Over ti millioner brukerlagde nivåer ble laget ([Wikipedia: LittleBigPlanet 3](https://en.wikipedia.org/wiki/LittleBigPlanet_3)). Kvalitetssikringen var i hovedsak sosial, ikke teknisk (T). Medvirkende kilder til hearts, tags, Cool Levels og Spotlights ble ikke funnet (H, ubekreftet).

**Tearaway: spillerens egne bilder som identitet.** Spillerens ansikt ble solen, og bilder ble teksturer ([Wikipedia: Tearaway](https://en.wikipedia.org/wiki/Tearaway_(video_game))). På PS4 var kameraet vanskeligst å føre videre fordi det ikke kunne antas å finnes ([The Aureview](https://www.theaureview.com/games/video-games-interview-media-molecules-rex-crowle-talks-tearaway-unfolded/)). Lærdom: ha en fallback når bildene mangler eller er dårlige (T). At en papir- eller modellaktig stil kan skjule unøyaktig rekonstruksjon, er min hypotese og ikke dokumentert (T).

### 3.2 Skala og lesbarhet

Pikmin 4 valgte hverdagsskatter nettopp for å gjøre litenheten «palpable» ([Nintendo Ask the Developer](https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-10-pikmin-4-part-3/)). Tarsier beskriver skala som et kunstproblem fordi spill normalt bygger verden rundt spilleren ([Superjump](https://www.superjumpmagazine.com/creating-little-nightmares/)). Grounded viser at skala også kan være skremmende: Obsidian la inn en «arachnophobia mode» som ikke påvirker gameplay ([Game Informer](https://gameinformer.com/2020/05/21/can-you-play-grounded-if-spiders-make-you-want-to-die)). Tilt-shift gjør *store ting små* sett utenfra, og har kjente kostnader i FPS og synsfelt ([Langweiledich](https://www.langweiledich.net/tilt-shifted-video-games/)), så det er trolig feil hovedgrep for «jeg er liten» (T). Nærkamera, vidvinkel, grov detalj (fuger, frotté-fibre, dråper) og gjenkjennelige størrelsesankre (ørepinne, tannbørste, dopapirrull) er mer sannsynlig riktig (T).

For kamera i trange rom er standardløsningen sfære-sweep med rask innskyting og langsom utkjøring, pluss fading av okkluderende vegger eller silhuett av figuren gjennom vegg ([Unity-forum](https://discussions.unity.com/t/camera-object-occlusion-in-3rd-person-games/432872), [gamedev.net](https://gamedev.net/blogs/33/entry-2259316-third-person-camera-ghosting-blender-cycles-baking-other-stuff/)). Siden rommene er prosedyregenererte, kan kamera ikke håndjusteres; Little Nightmares-lignende designerstyrte vinkler er hukommelse og kun mulige på utvalgte punkter (H/T).

Om fallskade i liten skala fant notatene ingen utviklerkilde. At små skapninger tåler fall relativt godt, er et fysikkargument (T). Tinylittleme har allerede valgt en Prince-aktig modell med konsekvens i én modus; den kan beholdes som et bevisst valg, men bør forklares i fortellingen og kunne dempes via assist (T).

### 3.3 Klatring, stamina, fall og forgivenhet

**Stamina som mild konsekvens.** I A Short Hike er tom stamina i klatring ikke en feiltilstand: Claire glir ned til neste flate ([KeenGamer](https://www.keengamer.com/articles/reviews/switch-reviews/a-short-hike-review-an-adventurers-dream-switch/)), og fjærene knyttes til nivådesign, siden hver region ligger på ulik høyde ([Wikipedia: A Short Hike](https://en.wikipedia.org/wiki/A_Short_Hike)). Celeste varsler ved å blinke rødt før Madeline faller, og har assist med uendelig stamina ([KeenGamer](https://www.keengamer.com/article/17773_celeste-review-switch), [Nintendo World Report](https://www.nintendoworldreport.com/review/46278/celeste-switch-review)). I BotW blir våte vegger glatte og krever mer stamina, og TotK la til slip-resistance ([GameLuster](https://gameluster.com/zelda-tears-of-the-kingdom-climb-slippery-wet-icy-surfaces-froggy-armor-elixir-lizard-frog-guide/)). Tinylittlemes hårgelé (vått 20 s = glatt) er altså i slekt med BotWs regnmekanikk. Kilder til Grounded-stamina er svake: kun forum og én anmelder som nevner vanskelighetstopper for solospillere ([Windows Central](https://www.windowscentral.com/gaming/xbox/grounded-review)). Enshrouded-spillere klager over å vente på stamina før grapple ([Enshrouded feedback](https://enshrouded.featureupvote.com/suggestions/710295/grappling-hook-remove-stamina-consumption)), noe som taler for at tau og taubane ikke bør koste stamina (T). Tinylittlemes 10 s ligger i samme størrelsesorden som det Celeste-anmeldelsen oppgir (5–10 s), men tallene for Celeste og BotW i notatene er hukommelse og brukes ikke som belegg (H).

**Fall: billig konsekvens og tydelig grense.** Sands of Time lar spilleren spole tilbake i stedet for å dø og gå til siste lagring; John Walker argumenterer for at feil bør belønnes, ikke straffes ([Epic Games Store / Walker](https://store.epicgames.com/news/prince-of-persia-the-sands-of-time-will-rewind-20-years-from-your-life)). Getting Over It er den motsatte, bevisste frustrasjonen, og fungerer bare fordi den er premisset og har en fortellerramme ([Google Design Notes](https://design.google/library/bennett-foddy-getting-over-it-interview)); det er en advarsel, ikke en mal. Tinylittlemes hard landing (bedøvet ca. 1 s, −3) er en mild variant, mens tilbakeføring til lagringspunkt (−10 ved ≥27) er den harde grensen. Fallterskler i Prince of Persia og Tomb Raider er hukommelse og ubekreftet (H).

**Tilgivelse.** Celeste bruker coyote-tid, hoppbuffer, hjørnekorreksjon og redusert tyngdekraft ved hoppets topp ([Celeste & Forgiveness](https://maddymakesgames.com/articles/celeste_and_forgiveness/), [TASVideos](https://tasvideos.org/Forum/Topics/22956)). Coyote-verdier spriker mellom kilder, fra 0,05 til 0,2 s ([GMTK Platformer Toolkit](https://gmtk.itch.io/platformer-toolkit/devlog/395523/behind-the-code)), så de er startverdier. Mario 64 bruker et romslig geometrisk søk for kantgrep ([Ukikipedia](https://ukikipedia.net/wiki/Ledge_Grab)), og Odyssey nevnes for «forgiving ledge grab» ([Game Informer](https://gameinformer.com/games/super_mario_odyssey/b/switch/archive/2017/06/13/a-hands-on-breakdown-of-mario-odyssey)). Responsivitet bør ligge rundt 100 ms fra input til synlig respons (Swink via kursdekk, ikke bekreftet i boken) ([Univ. Bayreuth](https://medienwissenschaft.uni-bayreuth.de/wp-content/uploads/GxD-07-Interfaces.pdf)); tung bevegelse er derfor greit så lenge posen endres på første frame og input bufres (T).

**Signalering av grep.** Uncharted 4 bruker lysere klatrekanter, prompt når man er nær, og figuren rekker ut hånden bare når noe er innen rekkevidde ([Pratt SI](https://ixd.prattsi.org/2019/02/design-critique-uncharted-4-traversal/)). Assassin's Creed bruker slitasje og gule trebiter som fotfeste ([PC Gamer via inkl](https://www.inkl.com/news/after-11-hours-assassin-s-creed-shadows-yellow-paint-sections-are-my-favorite-bit)). Konsistens betyr mer enn hvilken kode man velger (T).

### 3.4 Fysikkpuslespill, verktøy og kombinering

**Få regler, gjelder alt.** BotW skiller elementer (ild, vann, is) fra materialer, og materialer påvirker ikke hverandre ([Thumbsticks GDC17](https://www.thumbsticks.com/gdc-17-breath-of-the-wild-science-lies), [GamesBeat](https://gamesbeat.com/the-legend-of-zelda-breath-of-the-wild-makes-chemistry-just-as-important-as-physics/)). TotK-teamet fikk daglige feil fra ikke-fysikkdrevne objekter og løste det ved å gjøre alt fysikkdrevet ([Shacknews](https://www.shacknews.com/article/139210/zelda-totk-gdc-2024-panel-recap)). Scribblenauts bygger objekter av egenskaper i en database i stedet for kode per ord ([Wikipedia](https://en.wikipedia.org/wiki/Scribblenauts_(video_game))). Det peker mot tagger og regler for kombinering (svamp+vann, håndkle+håndkle=tau), ikke en liste med oppskrifter (T).

**Portal 2: ett verktøy om gangen.** Hver gel læres alene i første rom, og først når designerne antar at den er forstått, kombineres alle tre ([Game Developer](https://gamedeveloper.com/design/portal-2-game-design-review-part-iv-and-last-)). Valve fjernet forvirrende visuelle elementer (force field → glass) og brukte lokkemat som en stige ([Combine OverWiki](https://combineoverwiki.net/wiki/Developer_commentary/Portal)). Mønsteret er belagt; «ett konsept per rom» som formulering er ikke et funnet Valve-sitat.

**Tau.** Unravel gjør garn til en synlig ressurs som både er tau, bro og svingekrok ([Xbox Wire](https://news.xbox.com/en-us/?p=10648)). Just Cause droppet realisme for allsidig bevegelse ([GamesRadar](https://www.gamesradar.com/just-cause-2-hands-on)). For en nål-og-tråd-taubane er en forhåndsdefinert bane (A til B, konstant fart, kan slippes av) tryggere enn pendelfysikk (T).

**Kast.** Pikmin viser kastebane og landingspunkt, tar hensyn til vegger, og ulike typer kastes ulikt høyt ([Pikmin Wiki: Throw](https://www.pikminwiki.com/Throw)). Miyamotos «hva skjer etter kastet?» gjorde kastet til verktøy ([Wikipedia: Pikmin](https://en.wikipedia.org/wiki/Pikmin_(video_game))). På touch finnes snap-to-target ([Halopedia](https://halopedia.org/Snap-to-target)) og råd om å normalisere dra-lengden mot skjermstørrelse ([Unity Discussions](https://discussions.unity.com/t/need-help-in-the-stone-throwing-mechanic-with-aiming-for-mobile-in-unity3d-233594/233594)).

**Reset og fastlåsing.** Human: Fall Flat skiller respawn og checkpoint-reload; spillere klager på tapt progresjon ved reload ([Steam-diskusjon](https://steamcommunity.com/app/477160/discussions/0/1642041106364436002)). Notatene fant ingen utviklerkilde på objekt-reset; anbefalingene her er tolkning (T). Octodads bevisst klønete kontroll fungerer til presisjon kreves ([Game Developer postmortem](https://gamedeveloper.com/design/octodad-dadliest-catch-post-mortem-pt-3-design)). Ingen kilde støtter eller motsier «én ting om gangen» som designvalg; det er en hypotese å playteste (T).

### 3.5 Opplæring, frustrasjon og kontroller på mobil

**Opplæring.** Mønsteret er trygt rom → gjentakelse med mer krav → test med konsekvens ([Game Wisdom](https://game-wisdom.com/?p=11390)). Primærkilder for Mario 1-1, Portal-åpningen og BotW Great Plateau ble ikke funnet; de er sekundærbeskrivelser. LBP bruker tale og video, ikke «ingen tekst», så «stum opplæring» er ikke en LBP-lærdom.

**Frustrasjon.** Super Meat Boy fjernet liv og gjorde respawn nesten umiddelbar ([Game Developer](https://www.gamedeveloper.com/game-platforms/-i-super-meat-boy-i-s-mcmillen-explains-why-so-hard-)). Celestes assist (spillhastighet, uendelig stamina, uovervinnelighet) ble kalt «Assist Mode» fordi «Cheat Mode» virket dømmende ([Vice](https://www.vice.com/en/article/d3w887/celeste-difficulty-assist-mode)). Super Guide viser hint etter tre tapte liv, ikke i en meny ([Vooks](https://vooks.net/miyamoto-reflects-on-the-super-guide)). Hjelp bør altså utløses av atferd (T).

**Lagring som mekanikk.** Resident Evil gjorde lagring til en ressurs, og lettet senere på kostnaden; kritikken er at spillere leter etter lagring i stedet for å spille ([Giant Bomb](https://giantbomb.com/wiki/Concepts/Item_Based_Game_Save), [Steam-diskusjon](https://steamcommunity.com/app/952060/discussions/0/2137462524940511179)). Det siste er anekdotisk. Poengkostnader for lagring og tilbakeføring på mobil, der økter er korte, er derfor en risiko (T).

**Touch.** Apple HIG anbefaler flytende stikke til venstre, kamera via direkte panorering til høyre, få og store knapper nær tommelen, minimum 44×44 pt for hyppige kontroller, synlig og haptisk trykktilstand, og å slå sammen handlinger ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/game-controls)). Android anbefaler 48 dp ([UXPin](https://www.uxpin.com/studio/blog/responsive-design-touch-devices-key-considerations/)). Sky viser at kamera og presis tapping er svakeste ledd på mobil ([Destructoid](https://www.destructoid.com/review-sky-children-of-the-light/)). Human: Fall Flats første touch-løsning (én knapp delt for å bytte arm) krevde for mye mental innsats, og kameraet ble neste problem ([Game Developer](https://gamedeveloper.com/design/designing-touch-controls-for-human-fall-flat)).

**Lydtekst.** Retningsmerket lydtekst er i tråd med Xbox XAG 104 ([Xbox](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/104)) og Fortnites «Visualize Sound Effects» (rapportert av én tredjepartskilde) ([Can I Play That](https://caniplaythat.com/?p=14083)). Anbefalt er kategori som ikon og farge pluss form, ikke bare farge ([Can I Play That](https://caniplaythat.com/basic-accessibility-options-for-deaf-hoh-players/)). TLOU2 viser presets for syn, hørsel og motorikk som kan justeres enkeltvis ([Naughty Dog](https://naughtydog.com/blog/THE_LAST_OF_US_PART_II_ACCESSIBILITY_FEATURES_DETAILED)).

### 3.6 Brukerlagde brett, bot-validering og bilder/personvern

**Clear check beviser løsbarhet, ikke kvalitet.** Super Mario Maker krever at skaperen selv klarer brettet før opplasting ([Shacknews](https://shacknews.com/article/112654/how-to-set-clear-conditions-in-super-mario-maker-2)). Det kan omgås: en TAS-robot klarte sjekken for et brett ansett som menneskelig umulig ([Nintendo Life](https://nintendolife.com/news/2024/04/super-mario-maker-community-clears-trimming-the-herbs-just-days-before-wii-u-online-shutdown)), og en opplastingsbug lot uklarerte brett slippe gjennom ([TBreak](https://tbreak.com/nintendo-removes-super-mario-maker-2-levels-bug/), enkeltkilde). «Pick-a-path»-troll består sjekken fordi skaperen kjenner veien ([lenblog](https://lenblog.substack.com/p/watching-youtube-videos-of-people)). Boten har samme rolle som skaperen, men viser bare at en rute finnes (T). At den finner veggsprang-snarveier, er nøyaktig TAS-problemet i liten skala.

**Agenter som validatorer.** A*-agenten fra Mario AI-konkurransene brukes til å teste spillbarhet, men ingen kontrollere klarte brett med blindveier ([Mario AI Championship](https://www.um.edu.mt/library/oar/bitstream/123456789/29888/1/The_Mario_AI_championship_2009_2012_2013.pdf)); begrensede agenter brukes for å tilnærme menneskelig evne ([Khalifa et al.](https://arxiv.org/pdf/1904.08972)). Go-Explore med navmesh-heuristikk finner tilgjengelighetsbugs i 3D ([Microsoft Research](https://microsoft.com/en-us/research/?p=936006)), men originalens rekorder er kritisert for å utnytte simulatorens determinisme ([Irpan](https://alexirpan.com/2018/11/27/go-explore.html)). Botens manglende evne til håndklerouten er altså en forventet falsk negativ (T), og bør ikke forkaste brettet automatisk.

**Verktøy og kuratering.** Portal 2s PeTI er en bevisst begrenset editor med Workshop-avstemning ([Co-Optimus](https://www.co-optimus.com/article/8141/add-more-testing-to-your-life-with-the-perpetual-testing-initiative-this-may.html)). Dreams hadde manuell kuratering og avsluttet live-kurering i 2024 ([Push Square](https://pushsquare.com/news/2024/03/media-molecules-live-curation-support-for-dreams-stops-next-month)), og spillere mente algoritmene over-promoterte memer og remakes ([GameRevolution](https://www.gamerevolution.com/news/635619-dreams-fewer-memes-remakes)). Media Molecule kuraterer også via «MM Picks» og spillerdrevne Collections ([CGMagazine](https://www.cgmagonline.com/interviews/a-community-of-creation-and-dreams), [MCV](https://mcvuk.com/business-news/we-love-starting-again-why-media-molecule-remade-dreams-from-scratch/)). For et lite spill er enkel deling med rapporter/skjul og tags tilstrekkelig (T).

**Brett fra virkelige rom.** Mario Kart Live viser at underlag og omgivelser skaper presisjonsproblemer ([Digital Trends](https://digitaltrends.com/gaming/mario-kart-live-home-circuit-review)). RoomPlan er begrenset av LiDAR og feil i vanskelige rom ([Apple Dev Forums](https://developer.apple.com/forums/thread/776280), [iTechCraft](https://itechcraft.com/blog/your-101-guide-to-using-apple-roomplan-api-for-your-next-app/)). Tinylittleme bruker bilder og AI-tolkning, som gir enda større usikkerhet om skala og plassering enn LiDAR (T), og må prioritere spillbarhet over realisme. Meta lar brukeren selv merke vegger og møbler ([Unity-doc](https://docs.unity3d.com/Packages/com.unity.xr.meta-openxr@0.2/manual/session.html)), et mønster for menneskelig gjennomgang som svarer til hjelpeobjektene som kan merkes i tinylittleme.

**Personvern.** Matterports automatiske ansiktsuskarphet lot familiebilder være delvis uskarpe ([Matterport](https://matterport.com/it/blog/we-are-changing-face-blurring-here-why)), og publiserte skann kan ikke redigeres i ettertid ([We Get Around](https://forum.we-get-around.com/topic/612/privacy--hippa-rules/)). Meta eksponerer ikke kamerabilder fra rommet, trolig av personvern (utviklertolkning, ikke offisielt) ([Meta forum](https://communityforums.atmeta.com/discussions/dev-quest/export-space-mesh-scanned-on-quest-3/1095570)). Konklusjonen er at geometri og objektliste er langt tryggere å dele enn bilder og teksturer (T). Ingen juridisk vurdering er gjort (GDPR, barn).

## 4. Konkrete forslag til tinylittleme per tema

Alle verdier er **startverdier for tuning**. Kolonnen «Grunnlag» viser (K) kilde, (T) tolkning eller (H) hukommelse brukt kun som retning.

### 4.1 Material og lesbarhet (LBP, skala)

| Forslag | Startverdi / detalj | Grunnlag | Status |
|---|---|---|---|
| Materialtabell delt av spill, generator og bot | 2–3 egenskaper per materiale: grep, glid, landing (hard/myk/tapp %), våt/tørk | LBP Materials (K) | Delvis: 35 % myke flater finnes; legg til grep/glid i samme tabell |
| Én visuell kode for grep (lysere/varm farge eller kant), blank/glatt for glatt | Alltid; synlig fra stor avstand og ved ett blikk | Uncharted 4 (K) + T | Sjekk konsekvens |
| Figuren rekker ut hånden når grep er innen rekkevidde | Starter i snap-radius | Uncharted 4 (K) | Bør legges til |
| Kontaktskygge/landingsmarkør under figuren | Alltid på ved fall; tydeligere ved høy fart | LBP dybdeklager (K) + T | Bør legges til |
| Minst ett størrelsesanker i syne per rom | Generator-regel: ørepinne, tannbørste, såpe, dopapirrull | Pikmin 4 (K) | Bør legges til i generatoren |
| Kamera: sfære-sweep, raskt inn / sakte ut, silhuett eller fade av okkluder | Hysterese for å unngå flimmer | Unity/gamedev (K) | Sjekk |
| Valgfri «fremhev grep»-modus og skrekkmodus for store insekter | Av som standard | TLOU2, Grounded (K) | Valgfri |

### 4.2 Klatring, stamina, fall og forgivenhet

| Forslag | Startverdi / detalj | Grunnlag | Status |
|---|---|---|---|
| Stamina-varsel i figuren (skjelving og farge) | Fra 25–30 % igjen; lyd ved ca. 15 % | Celeste blinker (K), verdier (T) | HUD ▮▮▮▯ finnes; legg til figur-varsel |
| Tom stamina = kontrollert skli, siste sjanse til å hoppe av | 0,3–0,5 s | A Short Hike (K), verdi (T) | Bør legges til |
| Tau og taubane uten stamina-kostnad | Gjelder også dopapirbåndet | Enshrouded-klage (K) | Bør bekreftes |
| Hvile på hyller fyller raskt | 1–2 s på flate; langsommere i tau | T | Hvile finnes; tuning |
| Hvilekanter innenfor stamina-rekkevidde i hvert rom | Hver 60–80 % av maks klatrehøyde | A Short Hike (K), verdi (T) | Generator-regel |
| Coyote-tid | 0,10–0,18 s | Kilder spriker 0,05–0,2 s (K) | Sjekk om finnes |
| Hoppbuffer | 0,12–0,20 s, også under hurk/landing | GMTK (K), verdi (T) | Sjekk om finnes |
| Auto-kantgrep uten knapp når figuren faller | Søk ca. 0,3–0,5 spillerhøyder over hodet, bredt foran | Mario 64 (K), verdi (T) | Kantgrep finnes; utvid søket |
| REKK UT snapper til nærmeste grepspunkt | 0,3–0,5 spillerhøyder | Uncharted 4 (K), verdi (T) | Bør legges til |
| Fall i tre klasser (lett / hurk / bedøvet), forvarsel fra ca. 70 % av terskelen | Behold 18 og 27 som utgangspunkt; vindlyd og FOV-økning mot terskelen | Sands of Time (K) + T | Terskler finnes; forvarsel mangler |
| Rask gjenopptak etter hard landing | Ventetid under ca. 2 s totalt | Super Meat Boy (K) + T | Bedøvet ca. 1 s er innenfor |
| Kameraristing og lyd skalert med landingsfart | Start lavt, bedøvet under 0,4 s | Nijman (K), verdi (T) | Sjekk |
| Valgfri assist: mer stamina, mykere landing, gratis tilbakeføring | Nøytralt navn, ikke «juks» | Celeste (K) | Bør legges til |

Spørsmål for playtest: Er veggsprang et ønsket verktøy (da bør brett designes for det og boten få det som sanksjonert rute) eller en snarvei som skal blokkeres? Notatene kan ikke avgjøre det.

### 4.3 Fysikkpuslespill, verktøy og kombinering

| Forslag | Startverdi / detalj | Grunnlag | Status |
|---|---|---|---|
| Kombineringstabell med tagger og regler | Verktøy påvirker ting, ting påvirker ikke hverandre automatisk; enkeltsteg | BotW, Scribblenauts (K) | Planlagt |
| Test motoren i ett rom før utvidelse | Datatabell, ikke hardkodede oppskrifter | BotW 2D-prototype (K) | Bør gjøres først |
| Alt følger bære-/stable-/dytte-reglene | Ingen scriptede unntak | TotK (K) | Sjekk unntak |
| Hårgelé introduseres isolert, med synlig tørking | Glans som avtar i 20 s-vinduet | Portal 2 gels (K), detalj (T) | Gelé finnes; legg til synlig nedtelling |
| Dopapirbånd varsler før det revner | Knitring og tynning mot ca. 7 s; revning faller til trygg avsats | Unravel garn som ressurs (K), detalj (T) | Bånd finnes; legg til varsel |
| Taubane (nål+tråd) som forhåndsdefinert bane | A til B, konstant fart, kan slippes av | T | Planlagt |
| Våt svamp: tyngre og ikke hoppbar | Gir kombinasjonen konsekvens | T | Planlagt |
| Kast med dra–slipp, prikkbane, snap til gyldige mål, normalisert dra-lengde | Mer assist på mobil | Pikmin, Halo, Unity (K) | Hold F finnes; legg til snap på touch |
| Bærevekt: tunge ting bremser og senker hoppet, i stedet for forbud | Gradert | T | Ubegrenset bruk finnes; vurder |
| Auto-respawn av ting som faller ut av verden eller blokkerer | Etter fast tid | T | Bør legges til |
| Nullstill (N, 15 poeng) gratis når ting er fysisk utilgjengelig | Ellers lavere pris eller gratis for første gang i rommet | T | Bør differensieres |
| Ett verktøy per rom; 2–3 sanksjonerte løsninger per utfordring | Test for den billigste utilsiktede løsningen | Portal 2, TotK (K), verdi (T) | Ved brettdesign |

### 4.4 Opplæring, frustrasjon og kontroller på mobil

| Forslag | Startverdi / detalj | Grunnlag | Status |
|---|---|---|---|
| Første rom per mekanikk uten poengtap og uten dødsfall | Hopp over må være mulig | Game Wisdom, Portal (K) | Bør legges til |
| Kombinering introduseres som vri | Aldri første møte med en mekanikk | T | Planlagt |
| Hint etter N feil på samme sted | N = 3 som startverdi | Super Guide (K) | Bør legges til |
| Autolagring av grunnfremgang uten poeng; betalte punkter som frivillig valg | Vis kostnad før valget | Resident Evil (K), anbefaling (T) | Lagring koster 25 i dag; bør endres |
| Poengtap kan ikke gå under null / låse spilleren | Garanti | T | Sjekk |
| Kontekstuell TA/KAST, hold = kast | Vises kun når relevant | Apple HIG (K) | Delvis |
| Kontrollstørrelse | Minst 44 pt (Android 48 dp); HOPP og REKK UT større; utenfor kamera-dra-området | Apple HIG, UXPin (K), større verdi (T) | Tuning |
| Flytende stikke: liten dødsone, finkontroll nær sentrum | Test med tommel som skjuler figuren | Bugnet (K) | Flytende stikke finnes |
| Kameraassistanse på touch; vurder Gamepad API | Auto-sentrering, ledge-kamera | Sky (K) | Bør vurderes |
| Lydtekst: kategori som ikon og farge + form, størrelse og av/på | Behold ◀ ▶ | Xbox XAG 104, Can I Play That (K) | Lydtekst finnes |
| Presets (syn, hørsel, motorikk) og spillhastighet | Individuelle valg | TLOU2, Celeste (K) | Bør legges til |

### 4.5 Brukerlagde brett, bot og personvern

| Forslag | Startverdi / detalj | Grunnlag | Status |
|---|---|---|---|
| Boten begrenses til menneskelige evner | Ingen glitcher eller hopp gjennom tynne bokser | SMM TAS, Go-Explore (K) | Tuning |
| To-nivå validering: streng bot må passere, løs bot gir advarsel | Margin ±10–15 % på hopp som startverdi | T | Bør legges til |
| Bot feiler → hjelpeobjekt-reparasjon og re-validering, så menneskelig gjennomgang | Etter N forsøk | A* og blindveier (K), flyt (T) | Hjelpeobjekter finnes; automatiser flyt |
| Lagre og vis botens rute i gjennomgang | Sti-overlay eller replay | T | Bør legges til |
| Bot-resultat bekreftes på server | Ikke fra klient | SMM-bug (K, enkeltkilde) | Bør sikres før deling |
| Veggsprang-snarveier og lange ruter (håndkle) som egne flagg | Snarvei = advarsel; bot-feil på lang rute = review | T | Bør legges til |
| Måling etter publisering | Clear rate og dødspunkter fra spillere | SMM (K, anekdotisk) | Etter deling |
| Overlay av AI-tolkningen på originalbildet; bruker kan slette, flytte og gi nytt navn | Før publisering; ingen auto-publisering | Meta Room Setup (K), mønster (T) | Delvis |
| Normaliser skala mot kjente mål (dørhøyde, vask), la brukeren korrigere | Generator får justere objekter for spillbarhet | Mario Kart Live, RoomPlan (K) + T | Sjekk |
| Standardbad som fallback ved dårlige eller manglende bilder | Alltid tilgjengelig | Tearaway PS4 (K) | Bør legges til |
| Del geometri og objektliste, ikke bilder og teksturer; slett originalbilder etter generering | Private brett som standard; fjern gjenkjennelige etiketter | Matterport, Meta (K), tiltak (T) | Bør bekreftes |
| Romkapasitet (antall ting, tau, bevegelige deler) som synlig måler | Hold ytelse og bot innenfor rekkevidde | LBP termometer (K), forslag (T) | Ved brettredigering |
| Enkel oppdagelse: håndplukket «anbefalt», tags, rapporter/skjul | Unngå algoritmisk promotering | Dreams (K) | Ved deling |

## 5. Hva som bør verifiseres

Hullene er rangert etter hvor mye de påvirker beslutninger over.

| Hull | Hva som bør leses i fulltekst | Hvorfor det betyr noe |
|---|---|---|
| Staminakonstanter (Celeste, BotW, Grounded) og fallterskler (Prince of Persia, Tomb Raider, BotW) er hukommelse | Celeste-bloggen og Everest-docs; Zelda Dungeon-wiki; Grounded-wiki; Prince-regler fra Mechner/wiki | Stamina 10 s og terskler 18/27 bør justeres mot spillere, ikke mot hukommelsestall |
| Coyote/buffer-verdier spriker (0,05–0,2 s) | Maddy Thorsons «Celeste & Forgiveness», GMTK Toolkit-koden, Swinks «Game Feel» | Mobil trenger romsligere verdier; riktig område må testes |
| Single-slot som designvalg har ingen kilde | Pikmin, Portal, Human: Fall Flat, Death Stranding-design | Avgjør om «én ting om gangen» skaper for mye frem-og-tilbake |
| LBP: hearts, tags, Cool Levels, Spotlights; reset via meny; sticky-materialer | LBP Wiki (materialer, create, community) og Develop '09-artikkelen | Grunnlag for deling og hårgelé-analogi |
| Ettouney GDC 2009 («The Art of LittleBigPlanet») kun japansk referat | Foredraget i fulltekst | Materialkommunikasjon og håndlaget stil |
| BotW/TotK GDC-foredragene er kun sekundærgjengivelse | GDC Vault 2017 og 2024 | Chemistry-regler, testing av løsbarhet, kaos-håndtering |
| Pikmin 4 bæring, vekt og dandori | Nintendo Ask the Developer, alle deler | Kast- og bæremodellen |
| Valve Portal 2 gel-introduksjon og checklisting | GDC-slides og Valve-kommentarer | Opplæringsmønsteret for verktøy |
| Mario Maker clear check er kun sekundærkilder | Nintendo-dokumentasjon/intervjuer; Newman 2018 (Bath Spa) | Hvor mye en bot-clear kan love |
| Go-Explore på 3D-spill: hvilke boter kan teste mobilnære hoppmarginer | Microsoft Research-artikkelen og arXiv 2209.00570 | Bot-profiler og marginer |
| Mobilkontroller: bare Apple HIG er lest fullt | Game Developer om Human: Fall Flat touch; Game Accessibility Guidelines; Sky/Genshin; Vibration API-støtte på iOS | Størrelser, haptikk, kameraløsning |
| Little Nightmares-kamera og Grounded zipline er uten kilde | Tarsier/Unreal-intervju; Grounded-wiki | Hvorvidt designerstyrt kamera og stamina-frie transportmidler holder |
| Personvern: ingen juridisk vurdering, Apples RoomPlan-erklæring ikke funnet | Personvernregler (GDPR, barn), Apples egen dokumentasjon, bildebehandling hos visjonsleverandøren | Avgjørende før brett deles offentlig |
| Spelunky/Dead Cells-løsbarhetsgaranti er ukildet | PCG-litteratur og postmortems | Referanse for genererte brett |

## 6. Kilder

LittleBigPlanet og Media Molecule
- https://littlebigplanet.fandom.com/wiki/Materials
- https://littlebigplanet.fandom.com/wiki/Checkpoints
- https://littlebigplanet.fandom.com/wiki/Scoreboard
- https://littlebigplanet.fandom.com/wiki/Dynamic_Thermometer
- https://littlebigplanet.fandom.com/wiki/Secret_Materials
- https://littlebigplanet.miraheze.org/wiki/Thermometer
- https://littlebigplanet.miraheze.org/wiki/Controlinator
- https://www.mcvuk.com/littlebigplanets-design-secrets-revealed/
- https://game.watch.impress.co.jp/docs/news/080130.html
- https://www.engadget.com/2008-10-28-ps3-fanboy-review-littlebigplanet.html
- https://www.engadget.com/2008-10-15-nega-review-littlebigplanet.html
- https://gamecritics.com/brandon-erickson/has-littlebigplanet-lived-up-to-its-promises/
- https://giantbomb.com/littlebigplanet/3030-20602/user-reviews/2200-7776/
- https://www.gamerevolution.com/review/66147-littlebigplanet-3-review
- https://www.playstationlifestyle.net/2008/11/06/psls-littlebigplanet-review/
- https://techcrunch.com/2014/11/18/littlebigplanet-3-review/
- https://www.gamesradar.com/sackboy-a-big-adventure-ps5-interview-preview-feature/
- https://blog.playstation.com/2020/09/29/embark-on-an-epic-3d-platform-journey-in-sackboy-a-big-adventure-coming-to-ps5/
- https://www.resetera.com/threads/sackboy%E2%80%99s-big-adventure-new-interviews-with-sumo.313204/
- https://www.unrealengine.com/developer-interviews/sackboy-a-big-adventure-remains-cute-as-a-button-in-next-gen?lang=en-US
- https://www.gamedeveloper.com/design/q-a-exploring-the-triumphant-level-design-of-i-sackboy-a-big-adventure-i-
- https://seasonedgaming.com/2020/12/08/review-sackboy-a-big-adventure-a-knitted-bundle-of-joy/
- https://entertainium.co/2021/03/17/sackboy-a-big-adventure-review/
- https://www.timeout.com/movies/littlebigplanet
- https://giantbomb.com/user-reviews/id/696/a-game-for-everyone
- https://avclub.com/littlebigplanet-1798215060
- https://theboar.org/2011/02/little-big-planet-2/
- https://www.gamedeveloper.com/game-platforms/paris-gdc-media-molecule-on-making-i-littlebigplanet-i-
- https://www.psu.com/news/media-molecule-says-it-feels-were-halfway-through-lbp/
- https://ps3.wonderhowto.com/how-to/use-advanced-logic-littlebigplanet-2-including-counters-and-controllinator-422988/
- https://en.wikipedia.org/wiki/LittleBigPlanet_3
- https://en.wikipedia.org/wiki/Sackboy
- https://www.cgmagonline.com/interviews/a-community-of-creation-and-dreams
- https://mcvuk.com/business-news/we-love-starting-again-why-media-molecule-remade-dreams-from-scratch/
- https://en.wikipedia.org/wiki/Tearaway_(video_game)
- https://www.theaureview.com/games/video-games-interview-media-molecules-rex-crowle-talks-tearaway-unfolded/
- https://www.pocketgamer.com/articles/057875/r/

Skala og kamera
- https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-10-pikmin-4-part-3/
- https://www.nintendo.com/en-gb/News/2023/July/Ask-the-Developer-Vol-10-Pikmin-4-Chapter-1-2416028.html
- https://www.pikminwiki.com/Throw
- https://en.wikipedia.org/wiki/Pikmin_(video_game)
- https://www.superjumpmagazine.com/creating-little-nightmares/
- https://www.pushsquare.com/news/2017/03/hands_on_little_nightmares_is_primed_for_greatness
- https://gameinformer.com/2020/05/21/can-you-play-grounded-if-spiders-make-you-want-to-die
- https://www.langweiledich.net/tilt-shifted-video-games/
- https://www.windowscentral.com/gaming/xbox/grounded-review
- https://enshrouded.featureupvote.com/suggestions/710295/grappling-hook-remove-stamina-consumption
- https://discussions.unity.com/t/camera-object-occlusion-in-3rd-person-games/432872
- https://gamedev.net/blogs/33/entry-2259316-third-person-camera-ghosting-blender-cycles-baking-other-stuff/
- https://developer.valvesoftware.com/wiki/Fading_The_Player_In_Thirdperson

Klatring, stamina og bevegelse
- https://www.keengamer.com/article/17773_celeste-review-switch
- https://www.nintendoworldreport.com/review/46278/celeste-switch-review
- https://www.keengamer.com/articles/reviews/switch-reviews/a-short-hike-review-an-adventurers-dream-switch/
- https://en.wikipedia.org/wiki/A_Short_Hike
- https://zeldauniverse.net/2025/08/23/a-short-hike-creator-names-breath-of-the-wild-as-a-big-source-of-inspiration/
- https://gameluster.com/zelda-tears-of-the-kingdom-climb-slippery-wet-icy-surfaces-froggy-armor-elixir-lizard-frog-guide/
- https://store.epicgames.com/news/prince-of-persia-the-sands-of-time-will-rewind-20-years-from-your-life
- https://design.google/library/bennett-foddy-getting-over-it-interview
- https://maddymakesgames.com/articles/celeste_and_forgiveness/
- https://tasvideos.org/Forum/Topics/22956
- https://gmtk.itch.io/platformer-toolkit/devlog/395523/behind-the-code
- https://ukikipedia.net/wiki/Ledge_Grab
- https://gameinformer.com/games/super_mario_odyssey/b/switch/archive/2017/06/13/a-hands-on-breakdown-of-mario-odyssey
- https://medienwissenschaft.uni-bayreuth.de/wp-content/uploads/GxD-07-Interfaces.pdf
- https://ixd.prattsi.org/2019/02/design-critique-uncharted-4-traversal/
- https://www.inkl.com/news/after-11-hours-assassin-s-creed-shadows-yellow-paint-sections-are-my-favorite-bit
- https://gamedeveloper.com/design/designing-touch-controls-for-human-fall-flat

Fysikkpuslespill og kombinering
- https://gamesbeat.com/the-legend-of-zelda-breath-of-the-wild-makes-chemistry-just-as-important-as-physics/
- https://www.thumbsticks.com/gdc-17-breath-of-the-wild-science-lies
- https://www.shacknews.com/article/139210/zelda-totk-gdc-2024-panel-recap
- https://en.wikipedia.org/wiki/Scribblenauts_(video_game)
- https://gamedeveloper.com/design/portal-2-game-design-review-part-iv-and-last-
- https://combineoverwiki.net/wiki/Developer_commentary/Portal
- https://news.xbox.com/en-us/?p=10648
- https://www.gamesradar.com/just-cause-2-hands-on
- https://halopedia.org/Snap-to-target
- https://discussions.unity.com/t/need-help-in-the-stone-throwing-mechanic-with-aiming-for-mobile-in-unity3d-233594/233594
- https://steamcommunity.com/app/477160/discussions/0/1642041106364436002
- https://gamedeveloper.com/design/octodad-dadliest-catch-post-mortem-pt-3-design

Opplæring og mobilkontroller
- https://game-wisdom.com/?p=11390
- https://www.gamedeveloper.com/game-platforms/-i-super-meat-boy-i-s-mcmillen-explains-why-so-hard-
- https://www.vice.com/en/article/d3w887/celeste-difficulty-assist-mode
- https://vooks.net/miyamoto-reflects-on-the-super-guide
- https://giantbomb.com/wiki/Concepts/Item_Based_Game_Save
- https://steamcommunity.com/app/952060/discussions/0/2137462524940511179
- https://developer.apple.com/design/human-interface-guidelines/game-controls
- https://www.uxpin.com/studio/blog/responsive-design-touch-devices-key-considerations/
- https://bugnet.io/blog/how-to-fix-mobile-virtual-joystick-feeling-bad
- https://www.destructoid.com/review-sky-children-of-the-light/
- https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/104
- https://caniplaythat.com/basic-accessibility-options-for-deaf-hoh-players/
- https://caniplaythat.com/?p=14083
- https://naughtydog.com/blog/THE_LAST_OF_US_PART_II_ACCESSIBILITY_FEATURES_DETAILED

Brukerlagde brett, bot og bilder
- https://shacknews.com/article/112654/how-to-set-clear-conditions-in-super-mario-maker-2
- https://nintendolife.com/news/2024/04/super-mario-maker-community-clears-trimming-the-herbs-just-days-before-wii-u-online-shutdown
- https://tbreak.com/nintendo-removes-super-mario-maker-2-levels-bug/
- https://lenblog.substack.com/p/watching-youtube-videos-of-people
- https://www.co-optimus.com/article/8141/add-more-testing-to-your-life-with-the-perpetual-testing-initiative-this-may.html
- https://pushsquare.com/news/2024/03/media-molecules-live-curation-support-for-dreams-stops-next-month
- https://www.gamerevolution.com/news/635619-dreams-fewer-memes-remakes
- https://www.um.edu.mt/library/oar/bitstream/123456789/29888/1/The_Mario_AI_championship_2009_2012_2013.pdf
- https://arxiv.org/pdf/1904.08972
- https://microsoft.com/en-us/research/?p=936006
- https://alexirpan.com/2018/11/27/go-explore.html
- https://digitaltrends.com/gaming/mario-kart-live-home-circuit-review
- https://developer.apple.com/forums/thread/776280
- https://itechcraft.com/blog/your-101-guide-to-using-apple-roomplan-api-for-your-next-app/
- https://docs.unity3d.com/Packages/com.unity.xr.meta-openxr@0.2/manual/session.html
- https://communityforums.atmeta.com/discussions/dev-quest/export-space-mesh-scanned-on-quest-3/1095570
- https://matterport.com/it/blog/we-are-changing-face-blurring-here-why
- https://forum.we-get-around.com/topic/612/privacy--hippa-rules/
