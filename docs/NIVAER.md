# Nivåene (v0.72)

Seks nivåer med stigende vanskelighetsgrad: tre rom (nivå 1–3), og de samme tre rommene ommøblert (nivå 4–6, se lenger ned). Spillet åpner nivå 1 første gang, og når du når målet får du knappen «Neste nivå →». Nivåer du har klart får ✓ i ⚙ → Spill → Brett. Ingen nivåer er låst (alt kan velges fritt mens vi tester).

| | Nivå 1: Badet | Nivå 2: Barnerommet | Nivå 3: Kjøkkenet |
|---|---|---|---|
| Fil | `scenes/bad.scene.json` | `scenes/barnerom.scene.json` | `scenes/kjokken.scene.json` |
| Kilde | tolket fra fire bilder | oppdiktet for spillet | oppdiktet for spillet |
| Steg i ruta | 5 | 12 | 16 |
| Klatringer | 1 (vaskekurv, 60 cm) | 1 (gardin, 34 cm) | 2 (kjøkkenhåndkle 34 cm, hvitløksflette 48 cm: tar nesten alle kreftene) |
| Hopp over gap | ingen | 1 (25 cm, over lekebøtta) | 1 (25 cm, fra overskap til kjøleskap, 2 m over gulvet) |
| Farer på ruta | ingen (kar og do ligger utenfor) | lekebøtta under hoppet | oppvaskkum og kokeplater med smal kant forbi, glatt gulv |
| Høyeste punkt | 96 cm | 148 cm | 200 cm |
| Fall som sender deg tilbake | nei | fra hylle og skap | fra hylle, overskap og kjøleskap |
| Sjekkpunkter | sisterne, vask | lekekasse, seng, nattbord, skrivebord | benk (tre steder) |
| Gått av verktøyet | 33 s | 44 s | 56 s |

## Rutene
- **Nivå 1:** gulv → vaskekurv (klatre) → sisterne → vask → tannglass.
- **Nivå 2:** gulv → to klosser → lekekasse → seng → nattbord → hopp over lekebøtta → krakk → skrivebord → gardin (klatre) → vinduskarm → vegghylle → spilleske → klesskap.
- **Nivå 3:** gulv → fire skuffer som trapp → benk → smal kant foran vasken → benk → smal kant foran kokeplatene → benk → brødrister → mikrobølgeovn → kjøkkenhåndkle (klatre) → krydderhylle → hvitløksflette (klatre) → overskap → hopp til kjøleskapet.

## Nivå 4–6: de samme rommene, løst på en ny måte
Laget av grunnscenene med `tools/make_variants.mjs` (flytter møbler, legger til hyller og ting, flytter målet). Endrer du en grunnscene, kjør verktøyet på nytt; `npm test` sier fra hvis variantene er utdaterte, og krever at ruta er en annen enn i grunnrommet.

| | Nivå 4: Badet, ommøblert | Nivå 5: Barnerommet, ommøblert | Nivå 6: Kjøkkenet, ryddet om |
|---|---|---|---|
| Fil | `scenes/bad2.scene.json` | `scenes/barnerom2.scene.json` | `scenes/kjokken2.scene.json` |
| Hva er endret | Vaskekurven står under knaggene, buksa er tatt ned, ny hylle og to nye håndklær, den lille kurven står på gulvet | Krakken er borte, ny smal hylle over lekebøtta, bok på nattbordet, to nye hyller over døra | Skuffene er lukket, kasse og håndkle foran komfyren, overskapet er kortere, kjøleskapet flyttet, liten hylle over vasken |
| Ny løsning | Fire klatringer rett opp panelveggen: kurv → badekåpe → knaggrekke → håndkle → ny hylle → håndkle → øverste hylle | Balanser på hylla over lekebøtta i stedet for å hoppe, og fortsett fra klesskapet bortover hyllene over døra med et hopp til siste hylle | Opp via kassa og håndkleet på komfyren (rett inn mellom kokeplatene og kanten), og to hopp i høyden: overskap → liten hylle → kjøleskap |
| Mål | øverste hylle, 199 cm | hylla i hjørnet, 150 cm | kjøleskapet, 190 cm |
| Steg | 8 (4 klatringer) | 15 | 12 (3 klatringer) |
| Det vanskelige | krefter: du må hvile mellom klatringene, og alt over kurven er for høyt å falle fra | smal hylle over en fare, og 1,5 m fallhøyde på slutten | varme plater rett bak deg når du kommer opp, og to hopp 2 m over gulvet |
| Gått av verktøyet | 43 s | 54 s | 56 s |

Ikke gjort ennå i nivå 4–6: nye gjenstander som *verktøy* (hårgelé, dopapirbånd, nål og tråd, stav) er ikke lagt inn som alternative løsninger. Gå-verktøyet kan ikke bruke dem, så de må prøves for hånd først.

## Slik lages og sjekkes et nivå
1. Skriv scenen (`scenes/<navn>.scene.json`, mål i cm) og kontroller den: `node tools/validate_scene.mjs scenes/<navn>.scene.json`.
2. Lag brettet: `node tools/scene2level.mjs scenes/<navn>.scene.json levels/<navn>.level.json`. Rutekartet finner veien og sier fra om det måtte legge inn hjelpetrinn (nivåene skal ha 0).
3. Gå ruta med ekte fysikk: `node tools/walk_route.mjs levels/<navn>.level.json --verbose`. Verktøyet spiller som en øvet spiller i Mario-stil med hjelpemidlene på (går til riktig kant, hopper, holder GREP, hiver seg opp, går rundt hindringer). Går ruta, er nivået gjennomførbart. Går den ikke, viser det hvor det stopper.
4. Legg nivået i `LEVELS` i `main.js` (med `n` for nivånummer). `npm test` går alle tre rutene og krever at hvert nivå har flere steg enn det forrige.

## Regler for nivåbygging (lært underveis)
- Løft over ca. 2,8 enheter (14 cm) krever kantgrep, og da må kanten være tykk nok å ta i (minst 1,5 enheter). Tynne hyller må kunne nås med et rent hopp.
- Trappetrinn som henger over hverandre (skuffer) må ha hel front, ellers går figuren inn under neste trinn.
- Ikke la det være sprekker på rundt 3 cm mellom ting: figuren er 3 cm bred og kan kile seg fast.
- En klatreflate må henge foran kanten du skal opp på, og du må ha noe å stå på foran den (minst 14 cm). Toppen av klatreflaten må ligge i høyde med flaten du skal opp på.
- Ikke sett småting der du lander fra et trinn over (figuren blir stående oppå dem).
- Flater som ligger i en fare (kokeplate) eller under noe annet (skap under benkeplate) regnes ikke som trygge flater i rutekartet.

## Ikke gjort ennå
- Nivå 2 og 3 er enkle i formen (mest klosser med farge): de trenger egne former for seng, stol, kjøleskap, komfyr, og flere småting.
- Ingen egen historie eller overgang mellom nivåene, og ingen låsing.
- Vanskelighetsgraden er satt etter rutelengde, farer og fallhøyde, ikke etter spilletest. Trenger tilbakemelding.

## Maur (v0.77)
Levende fiender som patruljerer en strek (`ants` i `level.json`, laget av `ants` i scenen). Hopp på ryggen (HOPP) = de knuses og du spretter opp; ellers støter de deg tilbake (−4 poeng) og er ufarlige i 1,3 s. De ser deg på 7 enheter (på samme høyde) og løper da mot deg langs streken. Knuste maur kommer tilbake etter 25 s. De hindrer aldri ruta (de kan knuses), så `walk_route` og rutekartet ignorerer dem. Hengende og klatrende er utenfor rekkevidde. Av/på: ⚙ → Hjelp og tekst → «Maur».

I scenen (cm): `"ants": [{ "id": "maur_gulv", "on": "gulv", "from": [x, z], "to": [x, z], "crumb": true, "speed": 2.4 }]`. `on` er `gulv` eller id-en til tingen de går på (toppen av den). `npm test` passer på at hver bane er fri for ting og ligger på flata, og at ingen starter nærmere enn 12 enheter fra start. Variantene (nivå 4–6) arver banene fra grunnscenen; flytter en variant på ting, kortes banen i `tools/make_variants.mjs`.

### Flere slag fiender (R6)
`type` på en maur i scenen (og `ants` i level.json): `ant` (standard), `spider` eller `carrier`. Logikken ligger i `foes.js` (testet i `test_physics.mjs`), modellene i `props.js` (`buildSpider`, `buildCarrier`).
- **Edderkopp-vakt** (`"type": "spider", "on": ..., "from": [x, z]`, ingen `to`): står på stedet. Ser den deg (5,5 enheter, samme høyde) duker den i 0,55 s (varsel + hvesing, rygg unna så avblåses det), hopper mot deg (aldri lenger enn 4 enheter fra hjemmet), hviler 1,2 s og går hjem. Støt = −4 poeng; hopp på ryggen (HOPP), også midt i hoppet, = knus og sprett. `npm test` krever at hele hoppflata (4 enheter rundt hjemmet) er fri og på samme flate, at ingen starter innenfor syn fra start, og at ingen annen patrulje går inn i flata.
- **Bærer-maur** (`"type": "carrier"`, `from`/`to` som vanlig maur): går tregere (1,1) og bærer en stor smule. Knuses den, slipper den smula: gå inn i den (etter 0,8 s) for +5 poeng («smule tatt», `stats.crumbs`). Hvis R3 (smuler) finnes, kan hendelsen `crumb` i `antEvent` (main.js) rutes dit.
- Plassering: nivå 2 og 5: bærer + edderkopp; nivå 3: bærer + edderkopp; nivå 4: bærer + edderkopp (laget i `make_variants.mjs`); nivå 6: bærer + to edderkopper. Nivå 1 er uendret. Lyder: `spiderhiss`, `spiderleap`, `crumb` (audio.js).
