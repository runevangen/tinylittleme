# Byggemodus: for travelt, uklart og vanskelig å styre (utkast til samtale)

Tilbakemelding fra Rune (18. nov): byggemodus er veldig vanskelig og lite intuitivt. Skjermen er overbusy, det er vanskelig å forstå styring av materiell, hvordan man fester, og hvordan man styrer ting på skjermen. «Her må vi se hva de gode byggespillene gjør.»

Dette er en gjennomgang av hva vi har, hva de gode spillene gjør, og et forslag til ny retning. Det er et utkast: Rune skal utfordre og velge før noe bygges.

## 1. Hva vi har i dag
Fra skjermbildet av byggeskjermen (klassisk modus, v2.06) og Rutenett-modus (v2.5x):
- **Topprad:** TILBAKE, ANGRE, NULLSTILL, PRØV, ⚑ (5 knapper).
- **Rad to:** forrige/neste sted, stedsnavn, NULLSTILL STED, NULLSTILL ALLE, ⌂ MENY (5–6 knapper).
- **Hint og infokort:** hintlinje, oppgavekort med kostnad, stjerner og «smuler».
- **Zoom:** +, −, ⤢ (3 knapper).
- **Del og last:** KODE, LIM INN, BESTE (3 knapper).
- **Last som skal over broen:** Figur, Ball, Bil, Robot (4 knapper).
- **Verktøy:** TAPE, LEDD, TAU, GUMMI (4 knapper) i klassisk modus; i Rutenett: MODUS, TRE, STÅL, TAU, FJERN, SLOW, PAUSE.
- **Delebrett:** 5–10 deler som kan scrolles.
- **Bunn:** rotér venstre, rotér høyre, SNAP AV/PÅ, FJERN (4 knapper).

**Ca. 25–30 synlige kontroller samtidig** på en 402 px bred skjerm, og byggeområdet får under halve høyden. Det er det du kaller overbusy.

### Det som gjør det uklart
1. **To byggemåter** (klassisk med planker og verktøy, og Rutenett med knuter og staver) med en MODUS-knapp. Spilleren må forstå begge.
2. **Festing krever to trinn:** velg verktøy (TAPE/LEDD/TAU), trykk på del A, trykk på del B. Det forklares ikke visuelt.
3. **Materiale er skjult** i en rad som ser ut som alt annet.
4. **Mange ting gjøres med mange knapper** som er like store og like fargede, så det er uklart hva som er viktigst.
5. **Direkte styring mangler:** du kan dra deler, men ikke dra en stav ut fra en knute.
6. **Tilbakemelding kommer sent:** du ser ikke at en del kan festes før du har trykket.

## 2. Hva de gode byggespillene gjør
Søket ga lite om grensesnitt i detalj, men mønsteret er konsekvent. Det som følger er fra kildene under, supplert med det som er vanlig kjent om spillene. Der jeg ikke har en kilde, står det «allment kjent».

- **Poly Bridge:** hvert brett har **faste ankerpunkter**; spilleren velger blant **få materialer** (tre, stål, vei, kabel m.fl.) under et **budsjett**, med **rutenett som kan slås av og på** for å plassere ledd. Brukergrensesnittet beskrives som rent og enkelt, med en verktøylinje nederst. Spenning vises med farge før noe brekker. Kilder: [bonusstage](https://www.bonusstage.co.uk/archives/144520), [GameSkinny](https://www.gameskinny.com/reviews/building-bridges-with-poly-bridge/), [Steam](https://store.steampowered.com/app/367450/Poly_Bridge/).
- **Bridge Constructor Portal (mobil):** bygger ved å **trykke og dra for å koble punkter**, og kontrollene kan være «litt fiklete på iPhone». Kilder: [PhoneArena](https://www.phonearena.com/news/Bridge-Constructor-Portal-review_id100936), [Android Central](https://androidcentral.com/bridge-constructor-portal-review).
- **Mønsteret på tvers av småspill:** **dra ut en stav fra en eksisterende knute**, **magnetisk snapping** til nære knuter og rutenettpunkter, **få materialer i en kompakt velger i et hjørne med minst 48 × 48 px trykkflate**, **lyd og vibrasjon** når noe festes, **rød glød før det brekker**, og alltid **angre og restart**. Anmeldere advarer mot for mange kontroller på en gang («kan virke overveldende i begynnelsen»), og spillere ber om å kunne flytte knuter etter at de er satt. Kilder: [Seeles-spesifikasjoner (generert, ikke autoritativ)](https://www.seeles.ai/games/puzzle/bridge-builder-physics-based-construction-puzzle-game), [PocketGamer](https://www.pocketgamer.com/bridgy-jones/review/), [Bridgy Jones](https://www.pocketgamer.com/articles/051334/bridgy-jones/).
- **Allment kjent, uten kilde her:** World of Goo og Poly Bridge viser en **«spøkelsesstav»** som følger fingeren før du slipper, og bare lovlige koblinger lyser opp. Test-knappen («PLAY») er alltid **én stor knapp på samme sted**. Alt annet gjemmes i en meny.

**Kildenes svakhet:** søkene fant anmeldelser og forum, ikke egne UX-analyser, og det er ingen tall på hva som er best på akkurat små skjermer. Behandle dette som prinsipper, ikke fasit.

## 3. Prinsipper vi bør følge
1. **Én ting om gangen.** Skjermen viser det spilleren trenger nå; resten er lagt bort.
2. **Direkte styring.** Du bygger ved å dra på selve broen, ikke ved å velge verktøy og så trykke to ganger.
3. **Få, store, tydelige materialer.** Tre, stål, tau: tre store runde valg som viser pris og styrke i ett blikk.
4. **Se før du gjør.** En spøkelsesstav viser lengde, pris og om festet er lovlig, mens du drar.
5. **Alltid angre.** Én knapp, alltid på samme sted.
6. **Én stor PRØV.** Og når det brekker: se hvorfor (rød stav) og trykk igjen.
7. **Lær ved å gjøre.** Første gang: en hånd som viser «dra fra punktet», ikke tekst.

## 4. Forslag til ny byggeskjerm (Rutenett som standard)
```
┌────────────────────────────────┐
│ ←   Bro · 4/8      ★★☆  ⋯     │  topplinje: tilbake, sted, stjerner, meny
├────────────────────────────────┤
│                                │
│         byggeområde            │  fyller 70 % av høyden
│   (rutenett, ankre, flagg)     │
│                                │
├────────────────────────────────┤
│  [ Tre ] [ Stål ] [ Tau ]  ↶   │  materialvelger + angre
│  Kostnad 12/15   ▓▓▓▓▓░░       │  budsjettlinje
│           [  ▶ PRØV  ]         │  én stor knapp
└────────────────────────────────┘
```
- **Bygging:** trykk et punkt for å lage en knute; dra fra en knute for å trekke en stav (spøkelsesstav med lengde og pris); slipp på et annet punkt for å feste. Dra en knute for å flytte den.
- **Velg materiale** med de tre store valgene; valgt materiale styrer neste stav.
- **Slett:** trykk på en stav eller knute, så dukker et lite «✕» opp ved den (ikke en knapp nederst).
- **⋯-menyen** (alt sjeldent): last (Figur/Ball/Bil/Robot), KODE/LIM INN/BESTE, NULLSTILL STED/ALLE, zoom-tilpass, rutenett av/på, MODUS (klassisk).
- **Zoom og flytt:** to fingre (finnes), dobbelttrykk for å tilpasse.
- **PRØV:** blir STOPP under prøven; SLOW og PAUSE vises bare da, i samme rad.

## 5. Spørsmål vi må ta stilling til (Rune)
1. **Skal Rutenett erstatte klassisk modus i byggebrettene, eller leve ved siden av?** Å beholde begge gjør skjermen mer forvirrende (MODUS-knappen, to tankemodeller).
2. **Hva skal være med på hovedskjermen** (forslag over: materialer, angre, kostnad, PRØV)?
3. **Hvor mye tid skal dette få før lansering?** Det er en omarbeiding av byggeskjermen og flytter F6 («rutenett polert») fra «poler» til «bygg om».
4. **Skal første brett bare ha tre (tre og tau) og låse opp stål?** Det gjør første møte enklere.
5. **Skal vi teste de nye ideene med en rask prototype (en dag) før vi bygger alt?**

## 6. Hva som står uløst
- Hvordan **tape, ledd og gummi** (klassisk) passer inn hvis klassisk beholdes. De er en annen type festing enn staver.
- Hvordan **last og figur** velges uten en rad med fire knapper (i dag er det mange nivåer som bruker ulike laster).
- **Hvordan vi måler at det ble bedre:** tid til første bro, antall som gir opp, ✗ i NYTT/RETTELSER.
