# Figuren: den lille utforskeren

Status: v0.35. Mer sjarm og personlighet, ikke bare «Playmobil».

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

## Ikke gjort ennå
- Fingre som tar tak, hår/jakke som beveger seg, hår under hjelmen er bare tuster.
- Samle-tilbehør (hatter m.m.) og valg av utseende; bytte stil (strikket, pysjamas).
- Egne opptak/stemmeskuespiller i stedet for talesyntese.
- Replikker som reagerer på bestemte ting i brettet (første møte med svamp osv.).

## Gange i alle retninger og «hei du» (v0.55)
- **Sidesteg og rygging:** gangen bruker bevegelsesretningen relativt til kroppen. Rygger du, svinger bena motsatt vei og kroppen lener seg litt bakover. Går du sidelengs, setter benet i svevefasen foten ut mot gangretningen (hoftens z-rotasjon `lzL`/`lzR`), standbenet følger etter, og kroppen heller litt inn i bevegelsen (`roll`). Armene svinger mindre sidelengs. Gjelder stiler uten gange-modus (PUBG, Klassisk, Spenning).
- **Hei du:** står du helt stille i 3 s (ingen stikke, ikke bærer noe, på bakken), snur figuren seg rolig mot kameraet, ser på deg med stort smil og rødmer, og blunker med det ene øyet; stemmen kan si «Hei du!». Beveger du deg, snur den seg tilbake. Bare i 3. person/skulderkamera med PUBG-styring. Av/på: ⚙ → Spill → «Figuren snur seg og blunker …».
