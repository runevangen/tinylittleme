# PoC: flytte ting (dytte, bære, knuse, falle)

Status: prøveversjon. Spill prøverommet med `?level=poc` (eller velg «Prøverom: flytte ting» i ⚙). Badet har også løse ting (`?level=bad`).

## Hva som er bygd
| | |
|---|---|
| **Dytte** | Gå inn i en ting. Den flytter seg en brøkdel av farten din etter vekt: lett 100 %, medium 55 %, tung 30 %. |
| **Bære** | `F` tar og slipper en *lett* ting foran deg (maks ca. 3,4 enheter; spilleren er 1). Du går 20 % tregere og kan ikke gripe kant eller tau mens du bærer. |
| **Stable** | Ting faller, hviler på hverandre og på deg (du kan stå på dem). |
| **Gli av** | En ting som ikke har minst 45 % av fotavtrykket sitt understøttet, glir av og faller. Dytter du en kasse ut under en annen, faller den øverste. |
| **Knuse** | Skjøre ting går i stykker ved fall over ca. 3 enheter (−5 poeng). Skår spruter. |
| **Klemt** | En ting som faller på deg: tilbake til lagringspunktet (−10). Du kan rekke unna hvis du reagerer. |
| **Fare-soner** | Ting som havner i et kar, en grop eller en do-skål forsvinner. |
| **Nullstill** | `N` (eller «Ting ↺») setter alle ting tilbake (−15). Hindrer at du kjører deg fast hvis noe knuses eller faller ned. |
| **Fra bilder** | Objekter i scene-filen kan merkes `"movable": "light"|"medium"|"heavy"` og `"breakable": true`. Generatoren lager da løse ting i stedet for faste flater. |

## Prøverommet
- **Kommode (60 cm):** motgiften står på toppen. For høy å hoppe opp på.
- **Løsning:** lag en trapp. Lett eske (2,4) → medium kasse (6) → tung kasse (8) → kommode (12). Boten bekrefter at det er løsbart når kassene står i trapp.
- **Fallgruve:** to bokser stablet. Dytter du den nedre, glir den øvre av og faller. Står du under, blir du klemt.
- **Skjør vase** på et bord. **Sluk** i gulvet der ting forsvinner.

## Badet (bildene)
10 ting er løse: vaskekurv (tung), håndkleene (medium), toalettrull, såpepumpe, tannkrem, flasker og barbermaskin (lette; barbermaskinen er skjør), toalettvesken (medium). Rute-valideringen tar ikke hensyn til dem; trappen av hjelpeobjekter er fortsatt fast.

## Det som er forenklet
- Alt er akse-justerte bokser. Ingen tipping eller rotasjon.
- Friksjon mellom ting: en kasse oppå en annen følger *ikke* med når du dytter den nedre. Det gir fall-scenarioet, men er ikke realistisk.
- Bare dytting, ikke dragning. Bærehøyde og -avstand er fast.
- Ingen lyd.
- Boten flytter ikke ting. Den bekrefter at en rute finnes med tingene i en gitt stilling, ikke at puslespillet kan løses ved å flytte dem.

## Funn underveis
1. **Hastighet etter dytting:** nullstilling av farten ved kollisjon (som mot en vegg) gjorde dytting seigt. Farten beholdes nå mot ting som kan dyttes.
2. **Flyttall-feil som også gjaldt faste kanter:** å stå helt inntil en kant ble av og til regnet som overlapp og løftet spilleren opp på toppen. Fikset med en liten toleranse (1e-5).
3. **Størrelse:** 20 cm-esker er fire ganger så høye som spilleren og blokkerte hele utsikten når de ble båret. Bærbart er nå begrenset, og kameraet ignorerer det du bærer.

## Åpne spørsmål (sparring)
Se `BACKLOG.md`: dragning og heving, nøyaktig straff for feil, hva bildene skal avgjøre, og hvordan boten skal validere puslespill med flyttbare ting.
