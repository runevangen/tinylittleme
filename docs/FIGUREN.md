# Figuren: den lille utforskeren

Status: v0.35. Mer sjarm og personlighet, ikke bare «Playmobil».

## Ny kropp og bevegelser (v0.62)
Figuren bygges i `hero.js` (`buildHero`), med samme skjelett og de samme leddene som før, så alle poser i `poseHero` (`main.js`) virker.
- **Kropp:** mindre hode (1,18 mot 1,38), kjeve, øyne med iris og øyelokk, hår i nakken, hjelm med kam, brem, lykt og hakerem. Armer og ben er dreide profiler som smalner (lår, legg, underarm) med kne og albue, jakka har liv, skuldre, glidelås, lommer og krage, hendene har tommel og fire fingre, støvlene har skaft, tåhette, hæl og lisser. Sekken har lokk, spenner, ytterlomme, sovepose og en blikkopp. Stoff (vev, dongeri, strikk) og lær har relieff fra `look.js`. Tegneserie-kanten er borte.
- **Gange og løp (Mario-stil):** føttene følger en bane som står fast i gulvet (to-ledds IK, samme som Prince brukte), drevet av distansen figuren faktisk har gått (`hero.gph`). Skrittlengden vokser med farten (0,3 til 1,15 enheter), og over ca. halv fart blir det løp med svev, bøyde albuer og mer fremoverlent kropp. Vekten flyttes over standbenet (`sway`), hoften synker litt på svingsiden, og overkroppen vrir seg mot hoftene mens hodet holdes rolig.
- **Svinger og snuing:** han lener seg inn i svingen etter hvor fort han snur (`hero.yawRate`), og tar små skritt når han snur på stedet. Hodet ser dit du styrer litt før kroppen har snudd.
- **Hvile:** flytter vekten rolig fra ben til ben, skuldrene følger pusten.
- **Fingre:** knyttet rundt det han bærer eller henger i, løst knyttet i løp, åpne når han rekker ut eller faller.
- PUBG-stil (går sidelengs og bakover) bruker fortsatt den gamle gangen.

## Utseende
Gul hjelm med lykt og briller, oransje jakke (kontrast mot det hvite badet), grønnblått skjerf, sekk med sovepose, verktøybelte, votter og støvler. Stort hode, tegneserie-kant. Skjelettet er det samme som før (samme bein, armer, IK), så alle animasjoner virker.

## Ansikt og følelser (`animateHero` i `main.js`)
Store øyne som blunker og ser seg rundt (lenger opp når han hopper/klatrer, ned i fall), øyenbryn og munn som viser følelse:

| Situasjon | Uttrykk |
|---|---|
| Vanlig | lett smil |
| Hopp opp | større smil |
| Fall | store øyne, små pupiller, åpen munn, bekymrede bryn |
| Klatring | anstrengt (bryn ned), bekymret og svett når staminaen er lav |
| Hard landing | øynene klemt igjen, kinn rødmer |
| Sjekkpunkt, verktøy, mål | stort smil, rødme |
| Lang tid i ro | gjesper (og sier noe) |

Skjerfhalene (to ledd) flagrer bakover med farten og løftes i fall; sekken slenger med akselerasjon og fjærer ved landing.

## Stemme (`voice.js`)
Korte replikker på norsk, sagt av nettleserens talesyntese (høy tone) og vist i en snakkeboble over hodet. Boblen vises også uten lyd; lydtekst-modus (V/⚙) er uavhengig.
- Replikkene ligger i `LINES` i `voice.js`: hendelse (hardland, knockout, fall, softland, vault, top, tired, gel, roll, tore, pickup, drop, throw, checkpoint, goal, idle, yawn, flush, pit, reset), flere varianter, minste pause per hendelse og sannsynlighet, pluss et globalt mellomrom (3 s) så han ikke maser. Prioriterte hendelser (mål, klemt/for hardt fall, do/kar) kommer rett etter andre.
- ⚙: «Snakkebobler», «Stemme» og «Stemmevolum». Stemmen bruker en norsk stemme fra enheten (nb/no/nn); finnes ingen, vises bare bobler (⚙ sier hvilken stemme som brukes).
- Test: `node test_voice.mjs`.

## Siste polering (R10, `polish.js`)
Ren logikk i `polish.js` (testet i `test_polish.mjs`), brukt i `poseHero`/render-løkka i `main.js`.
- **Føtter mot trinn** (innstilling `stepadapt`, standard på): svingfoten ser 0.6-0.8 enheter frem og løftes/senkes til flaten den treffer. `stepOffset` begrenser til +0.28 opp og -0.1 ned så beinet ikke strekkes. Virker i gange med IK-føtter (mobilstilen Mario og Klassisk), ikke i PUBG-stilen (PC-standard), som har enklere bein. Hjemmebrettene har bare kanter på 0.4 og høyere (tas med trinnhopp/klatring), så **Kontrollbanen** har fått en egen **trapp** (kanter på 0.1, 0.1, 0.2, 0.2 og ned igjen, ⚙ → Spill → Brett → Kontrollbanen, stasjonen helt til venstre bak). Målt der: fotløftet er opptil 0.14-0.2 enheter (en femtedel av figurhøyden) rett før hver kant og 0 på flatt gulv. Bildeserie med og uten: `docs/R10_trapp_on.png` og `docs/R10_trapp_off.png` (iPhone 14, `stepadapt` på/av; informasjonskortene står over bildet fordi trappen er en stasjon, så tallene under er beviset). **Målt i nettleser** (gange over trappen i Kontrollbanen, `window.__game.footSm`): største fotløft over trinn `0.195` med `stepadapt` på og `0.000` med den av. Det er `stepOffset` -> `footSm` -> `f.y` i IK-foten i `main.js`. `test_polish.mjs` sjekker at koblingen står i `main.js`.
- **Jubel** (`reactanim`, standard på): maur knust gir armene opp + strekk, et tydelig sprett på ca. 20 cm og klem ved landing (ca. 0.9 s). Bildeserie (hvile, 0.1, 0.2, 0.4, 0.55, 0.75 s): `docs/R10_stomp.png`: toppen av spretten er 0.2 over bakken (skyggen blir liggende igjen på gulvet).
- **Rykk**: maur støter gir sammenkrøping (hoftene synker ca. 10 cm, hodet ned, albuene inn, armene foran), lent bakover, ristende hode (ca. 0.8 s). Virker også med IK-gange. Bildeserie: `docs/R10_rykk.png`.
- **Heng/sving/klatring**: heng dingler rolig (`hangSway`, amp 0.1), sving bruker `hangSway(..., true)` (amp 0.35, bena pendler stort, kroppen lener med farten), klatring har vektforskyvning (roll/sway) mot armen som trekker og dingler i ro. Klatring i bilder (grep, i ro, fire steg opp, hvile): `docs/R10_klatring.png` (klatrerommet `?level=klatring`; bildene viser heng, to klatresteg, hvile og sving, tatt med `poseHero`/`animateHero`). **Målt**: leggvinkelen (`legL.top.rotation.x`) i heng varierer fra -0.06 til 0.12 rad over 4 s og i sving fra -0.08 til 0.06 rad, så `hangSway` brukes i begge tilstandene i `main.js`, ikke bare i testen.
- **FPS-vakt og auto-oppløsning** (`fpsWatch` og `createAutoQ` i `polish.js`, testet i `test_polish.mjs`): snitt hvert 3. sekund; under **24** fps (ikke 30: en frisk iPhone i strømsparemodus låser til 30 fps) logges `lav fps`. De første 8 sekundene spilletid hoppes over (oppstartsrykk teller ikke). Auto-oppløsning (⚙ → Test → **Oppløsning**, standard Auto): to lave vinduer på rad (ca. 6 s) senker ett trinn (x0.75, aldri under 1x), så en pause på ett vindu (ca. 9 s mellom trinn). Går det jevnt (minst 50 fps i 4 vinduer på rad, ca. 12 s) skrus den opp igjen ett trinn, høyst 3 ganger per økt så den ikke pendler. Trinnet vises i HUD-en («oppløsning 1.50×», også ved FPS-visning) og i en melding; `kvalitet ned`/`kvalitet opp` logges. Valgene Full, Middels (75 %) og Lav (1x) låser oppløsningen. Ikke målt på ekte eldre telefon her; bruk **Del rapport**. Grafikk «Enkel» er fortsatt manuelt valg.

## Ikke gjort ennå
- Fingre som faktisk lukker seg rundt tingen (nå bare knytter de seg), hår/jakke som beveger seg.
- Fotfeste i sidesteg (PUBG-stil) og fotløft på skrå flater (trinn er gjort i R10).
- Samle-tilbehør (hatter m.m.) og valg av utseende; bytte stil (strikket, pysjamas).
- Egne opptak/stemmeskuespiller i stedet for talesyntese.
- Replikker som reagerer på bestemte ting i brettet (første møte med svamp osv.).

## Gange i alle retninger og «hei du» (v0.55)
- **Sidesteg og rygging:** gangen bruker bevegelsesretningen relativt til kroppen. Rygger du, svinger bena motsatt vei og kroppen lener seg litt bakover. Går du sidelengs, setter benet i svevefasen foten ut mot gangretningen (hoftens z-rotasjon `lzL`/`lzR`), standbenet følger etter, og kroppen heller litt inn i bevegelsen (`roll`). Armene svinger mindre sidelengs. Gjelder stiler uten gange-modus (PUBG, Klassisk, Spenning).
- **Hei du:** står du helt stille i 3 s (ingen stikke, ikke bærer noe, på bakken), snur figuren seg rolig mot kameraet, ser på deg med stort smil og rødmer, og blunker med det ene øyet; stemmen kan si «Hei du!». Beveger du deg, snur den seg tilbake. Bare i 3. person/skulderkamera med PUBG-styring. Av/på: ⚙ → Spill → «Figuren snur seg og blunker …».

- **Auto-oppløsning**: meldingen vises én gang per økt, liten og under målpilen (`#toast.low`), så den ikke dekker målpilen; senere nedtrappinger og opptrappinger logges bare (`kvalitet ned/opp`).

## Snu med skritt, tråkke over hinder, nye grep-poser (R40, `hero_move.js`)
Ren logikk i `hero_move.js` (testet i `test_heromove.mjs`), brukt i `poseHero` i `main.js`. Alt er animasjon/IK: kollisjon og fysikk er uendret, bortsett fra at den allerede støttede trinn-opp-grensen (`P.stepUp`) har fått et lite minimum.
- **Snu på stedet** (⚙ → Spill → «Figuren snur med små skritt …», `turnsteps`): står han stille og stikka snur raskere enn 1,6 rad/s, tas diskrete skritt (0,24 s), annenhver fot løftes og svinger ut mot snuretningen, overkroppen vrir seg litt. Logges som `snusteg`.
- **Tråkke over små hindre** (`stepover`, og admin `smallstep`, standard 0,15): `physics.js` `stepOver` setter figuren oppå hindre opp til `P.stepUp`; `effectiveStepUp` gir nå minst `smallstep` (også i Prince, bortsett fra hjelp «Ingen»). Fremste fot løftes over kanten, kneet og kroppen følger. Hindre over grensen stopper som før (test). Logges som `trinn`.
- **Heng, veggglid og sving** (`gripposes`): heng i bevegelse = hendene tar tak én og én, trett = bøyde albuer og sparkende bein, kroppen heller med farten; veggglid = begge armer opp mot veggen, hendene skraper, knærne bøyd, lener mot veggen mer med fall-fart; sving = bena slenger og kroppen lener med farten. Logges som `grepspose`.
- Statisk budsjett: ingen nye mesher, materialer eller shadere, så tegnekall og trekanter er uendret (`test_perf.mjs` grønn). Ekte følelse og FPS testes på iPhone (R27).
- Live-sjekk: `node tools/live_heromove.cjs <mappe> [port]` (iPhone 14, skjermbilder av veggglid og heng).
- **Levende klatring** (R58, `climbfeel.js`, ⚙ «Levende klatring», 0 = av): heng med vekt i hendene (lavere når trett, nytt tak med én hånd om gangen), fingrene lukkes rundt kanten når han tar tak, bena skyver mot flaten ved klatring og opptrekk, og sparker fra ved hopp ut. Bare poser oppå de gamle; fysikk, grep og ruter er urørt. Logges som `klatrepose`. Følelsen testes på iPhone.
