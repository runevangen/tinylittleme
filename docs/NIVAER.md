# Nivåene (v0.71)

Tre nivåer med stigende vanskelighetsgrad. Spillet åpner nivå 1 første gang, og når du når målet får du knappen «Neste nivå →». Nivåer du har klart får ✓ i ⚙ → Spill → Brett. Ingen nivåer er låst (alt kan velges fritt mens vi tester).

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

## Slik lages og sjekkes et nivå
1. Skriv scenen (`scenes/<navn>.scene.json`, mål i cm) og kontroller den: `node tools/validate_scene.mjs scenes/<navn>.scene.json`.
2. Lag brettet: `node tools/scene2level.mjs scenes/<navn>.scene.json levels/<navn>.level.json`. Rutekartet finner veien og sier fra om det måtte legge inn hjelpetrinn (nivåene skal ha 0).
3. Gå ruta med ekte fysikk: `node tools/walk_route.mjs levels/<navn>.level.json --verbose`. Verktøyet spiller som en øvet spiller i Mario-stil med hjelpemidlene på (går til riktig kant, hopper, holder GREP, hiver seg opp, går rundt hindringer). Går ruta, er nivået gjennomførbart. Går den ikke, viser det hvor det stopper.
4. Legg nivået i `LEVELS` i `main.js` (med `n` for nivånummer). `npm test` går alle tre rutene og krever at hvert nivå har flere steg enn det forrige.

## Regler for nivåbygging (lært underveis)
- Løft over ca. 2,8 enheter (14 cm) krever kantgrep, og da må kanten være tykk nok å ta i (minst 1,5 enheter). Tynne hyller må kunne nås med et rent hopp.
- Trappetrinn som henger over hverandre (skuffer) må ha hel front, ellers går figuren inn under neste trinn.
- Ikke la det være sprekker på rundt 3 cm mellom ting: figuren er 3 cm bred og kan kile seg fast.
- En klatreflate må henge foran kanten du skal opp på, og du må ha noe å stå på foran den.
- Flater som ligger i en fare (kokeplate) eller under noe annet (skap under benkeplate) regnes ikke som trygge flater i rutekartet.

## Ikke gjort ennå
- Nivå 2 og 3 er enkle i formen (mest klosser med farge): de trenger egne former for seng, stol, kjøleskap, komfyr, og flere småting.
- Ingen egen historie eller overgang mellom nivåene, og ingen låsing.
- Vanskelighetsgraden er satt etter rutelengde, farer og fallhøyde, ikke etter spilletest. Trenger tilbakemelding.
