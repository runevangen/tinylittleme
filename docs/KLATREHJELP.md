# Klatrehjelp: kast, stavhopp, myke landinger (prøverom `?level=klatring`)

Knappene på mobil: **TA** (ta/slipp/bruk/kast, hold = kast), **HOPP**, **GREP** (tidligere GREP: grip kant, tau og klatre-flater). Treningsrommet har brukslapper: en «i» over hver ting som kan gjøre noe, og et kort øverst med bruksanvisning for den nærmeste (L slår av/på).

Status: første versjon (v0.20). Verdiene står i `physics.js` (`P`) og er ment å justeres etter spilletest.

## Regler
| | |
|---|---|
| **Bære** | Du bærer én ting om gangen. Ubegrenset bruk: ingenting brukes opp. |
| **Slipp / sett på** | Kort trykk på `F` (TA på mobil) slipper tingen, eller setter den oppå en flate foran deg (v0.17). |
| **Kast** | Hold `F` og slipp. Lengre hold = lengre og høyere kast (`throwMin` 0,2 s, full kraft etter ca. 0,9 s). En gul bue viser hvor det går. Tingen glir og stopper av friksjon. |
| **Hard landing** (bare Prince) | Landingsfart ≥ 18 (fall fra ca. 7 enheter / 35 cm): bedøvet ca. 1 s og −3 poeng. ≥ 27 (fall fra ca. 16,5 enheter / 80 cm): tilbake til lagringspunktet, −10 poeng. |
| **Myke flater** | Flater med `soft` (svamp, papirhaug, matte, håndkle) tar `softFactor` = 35 % av landingsfarten. Skjøre ting knuses også mindre. |
| **Stavhopp** | Bærer du en stav (`pole`) og løper (≥ 55 % av toppfarten), gjør hopp-knappen stavhopp: farten gjøres om til høyde (ca. 6,3 enheter ved full fart med en ørepinne på 1,5; vanlig hopp er 3,4). Staven peker fremover mens du bærer den. |

## Klatring på grep-flater (v0.21)
| | |
|---|---|
| **Feste** | Stå inntil en flate merket `grip` (scene: `"grip": true`) eller hopp mot den, og trykk GREP mens du styrer mot den. Du kan ikke klatre mens du bærer noe. |
| **Styre** | Mot flaten = opp, bort = ned, sidelengs = langs flaten (innenfor flatens bredde). Opp 1,6 enheter/s, ned 2,6, sidelengs 1,3. |
| **Stamina** | 10 enheter. Går ned 1/s mens du henger, +0,5 når du klatrer opp, +0,3 sidelengs. På bakken fylles den 2,5/s. Tom stamina = du mister taket og faller. Vises i HUD som «grep ▮▮▮▯». Det rekker til ca. 10 enheter opp i ett strekk. |
| **Av** | Hopp = spark deg løs fra flaten. Ned til bakken = stå. Opp til kanten = kantgrep (hang), så hopp = hiv deg over (som før). |

Prøverommet har en rute fra papirhaugen til toppen av tårnet med to håndklær og en hvilehylle midt i (for lang til ett strekk). Gå inn under det øvre håndkleet, hopp mot det og trykk GREP i hoppet.

## Verktøy du bærer og bruker (v0.22)
Ting med `tool` gjør noe når du trykker F (kort) mens du bærer dem på riktig sted. Trykker du igjen samme sted, slippes tingen (bak eller ved siden av deg). Hold TA i minst 0,32 s = kast (knappen sier KAST når den er klar). Står du ikke på riktig sted for verktøyet (ikke inntil en vegg for gel, ikke ved en kant for rull), forklarer første trykk hva du skal gjøre og beholder tingen; neste trykk legger den fra seg. Ubegrenset bruk; nytt smør/bånd fra en annen vegg/kant flytter det forrige.

| Verktøy | Hva F gjør | Pris |
|---|---|---|
| **Hårgelé** (`tool: gel`) | Smører et grep-felt (1,6 bredt, 6 høyt) på veggen foran deg, fra brysthøyde og oppover. Du kan klatre i det (GREP), og kanten på veggen over er kantgrep. | Våt i 20 s: du sklir sakte og stamina koster +1,2/s. Etter det er den fast (+0,15/s). Du må legge fra deg flasken før du klatrer (du kan ikke klatre mens du bærer). |
| **Dopapirrull** (`tool: roll`) | Rull ut et bånd (0,5 bredt) som henger ned over kanten foran deg, ned til gulvet eller høyst 14 enheter. Du kan klatre i det både opp og ned, f.eks. for å komme ned uten hard landing. | Revner etter 7 s i bruk (summert). Revnet bånd = du faller. Nytt trykk lager et nytt. |

Kjeden i prøverommet: kast gelflasken opp på hylla (hold F, slipp), vault opp med ørepinnen, ta flasken og smør veggen (skap bak hylla), legg fra deg flasken, klatre i gelen. Dopapirrullen står øverst på tårnet. Bær den til kanten og rull ut et bånd, hopp av og grip det (GREP i fallet).

## Prøverommet
- **Hylle (28 cm):** for høy for vanlig hopp. Ta ørepinnen (F), løp, hopp.
- **Tårn (90 cm)** med fem trinn: fall fra toppen på gulvet er for hardt (tilbake). Hopp ned på **dopapirhaugen** (vest) eller bær **svampen** opp og slipp den nede før du hopper.
- Flagget (målet) står øverst på tårnet.

## Det som ikke er med ennå
- Verktøy er ikke merket i bildene: bare prøverommet har dem foreløpig.
- Grep-flater i badet fra bildene: hvilke gjenstander som er klatrbare er ikke bestemt (se backlogg). Flatetypen `slick` (glatt, kan ikke klatres) finnes ikke som grep-type ennå.
- Kombinering av ting (nål + tråd, svamp + vann, håndkle + håndkle …), taubane.
- Stavhopp-animasjon (kroppen bruker vanlig hoppose).
- Dopapirhaugen presses ikke sammen når du lander i den.
- Boten bruker ikke stav eller kast, og validerer ikke rutene.
- Fallregelen gjelder bare «Prince» (Klassisk og Spenning er uendret).
