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
- **Føtter mot trinn** (innstilling `stepadapt`, standard på): svingfoten ser 0.6-0.8 m frem og løftes/senkes til flaten den treffer. `stepOffset` begrenser til +0.28 m opp og -0.1 m ned så beinet ikke strekkes, og effekten er bare synlig der kanten er mellom ca. 2 cm og 28 cm. Dagens brett har bare 0.4 m kanter (de tas med klatring/mantle), så fotløftet er liten (maks ca. 7 cm målt i skjermbilde) og ingenting skjer på flatt gulv. Den er ment for fremtidige trapper og skråkanter.
- **Jubel** (`reactanim`, standard på): maur knust gir armene opp + strekk, et tydelig sprett på ca. 20 cm og klem ved landing (ca. 0.9 s).
- **Rykk**: maur støter gir sammenkrøping (hoftene synker ca. 10 cm, hodet ned, albuene inn, armene foran), lent bakover, ristende hode (ca. 0.8 s). Virker også med IK-gange.
- **Heng/sving/klatring**: heng dingler rolig (`hangSway`, amp 0.1), sving bruker `hangSway(..., true)` (amp 0.35, bena pendler stort, kroppen lener med farten), klatring har vektforskyvning (roll/sway) mot armen som trekker og dingler i ro.
- **FPS-vakt** (`fpsWatch`): snitt hvert 3. sekund, under 30 fps logges `lav fps`. Etter to slike perioder på rad (ca. 6 s) senkes oppløsningen ett trinn (x0.75, ned til 1x) og `kvalitet ned` logges (innstilling `autoq`, standard på). Ikke målt på ekte eldre telefon her; bruk **Del rapport** (se `lav fps`/`kvalitet ned`) fra en slik telefon. Grafikk «Enkel» er fortsatt manuelt valg.

## Ikke gjort ennå
- Fingre som faktisk lukker seg rundt tingen (nå bare knytter de seg), hår/jakke som beveger seg.
- Fotfeste i sidesteg (PUBG-stil) og fotløft på skrå flater (trinn er gjort i R10).
- Samle-tilbehør (hatter m.m.) og valg av utseende; bytte stil (strikket, pysjamas).
- Egne opptak/stemmeskuespiller i stedet for talesyntese.
- Replikker som reagerer på bestemte ting i brettet (første møte med svamp osv.).

## Gange i alle retninger og «hei du» (v0.55)
- **Sidesteg og rygging:** gangen bruker bevegelsesretningen relativt til kroppen. Rygger du, svinger bena motsatt vei og kroppen lener seg litt bakover. Går du sidelengs, setter benet i svevefasen foten ut mot gangretningen (hoftens z-rotasjon `lzL`/`lzR`), standbenet følger etter, og kroppen heller litt inn i bevegelsen (`roll`). Armene svinger mindre sidelengs. Gjelder stiler uten gange-modus (PUBG, Klassisk, Spenning).
- **Hei du:** står du helt stille i 3 s (ingen stikke, ikke bærer noe, på bakken), snur figuren seg rolig mot kameraet, ser på deg med stort smil og rødmer, og blunker med det ene øyet; stemmen kan si «Hei du!». Beveger du deg, snur den seg tilbake. Bare i 3. person/skulderkamera med PUBG-styring. Av/på: ⚙ → Spill → «Figuren snur seg og blunker …».
