# Klatrehjelp: kast, stavhopp, myke landinger (prøverom `?level=klatring`)

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

## Prøverommet
- **Hylle (28 cm):** for høy for vanlig hopp. Ta ørepinnen (F), løp, hopp.
- **Tårn (90 cm)** med fem trinn: fall fra toppen på gulvet er for hardt (tilbake). Hopp ned på **dopapirhaugen** (vest) eller bær **svampen** opp og slipp den nede før du hopper.
- Flagget (målet) står øverst på tårnet.

## Det som ikke er med ennå
- Kombinering av ting (nål + tråd, svamp + vann, håndkle + håndkle …), taubane.
- Stavhopp-animasjon (kroppen bruker vanlig hoppose).
- Dopapirhaugen presses ikke sammen når du lander i den.
- Boten bruker ikke stav eller kast, og validerer ikke rutene.
- Fallregelen gjelder bare «Prince» (Klassisk og Spenning er uendret).
