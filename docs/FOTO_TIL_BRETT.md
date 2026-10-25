# Test: kan vi bruke 3–4 bilder? (badet)

Brukeren sendte tre vanlige mobilbilder av et enkelt bad. Bildene er **ikke** lagret i repoet (offentlig). Resultatet ligger her:

- `scenes/bad.scene.json` – min tolkning av bildene (objekter, mål i cm, material, farer, hold, konfidens)
- `tools/scene2level.mjs` – gjør tolkningen om til et spillbart brett og validerer ruten
- `levels/bad.level.json` – generert brett. Spill det med `?level=bad` (eller velg i ⚙).

## Pipeline som ble testet
```
3 bilder ──(visjon, her: Claude i chat)──▶ scene.json ──(generator)──▶ level.json ──(boten)──▶ «løsbart?»
```
1. **Tolkning (AI-steget):** objekter, material, omtrentlige mål. Skala fra kjente gjenstander (toalettrull ≈ 10 cm, flis ≈ 20 cm, do-sete ≈ 40 cm).
2. **Generator:** cm → spillenheter (1 = 5 cm), bokser, farer (tomt kar, do-skål), glatt flis, vindu, lys. Lager et rekkeviddekart over alle flater, finner beste rute og legger inn *hjelpeobjekter* der den ikke går.
3. **Bot:** den ekte fysikken (Spenning-innstillingen, glatte fliser, farer) prøver å nå målet.

## Resultat
| | |
|---|---|
| Tolket fra bildene | 34 solide objekter, 4 dekor (speil, skapknotter), 2 farer, 8 klatretak (ikke brukt ennå). Totalt 44 bokser inkl. gulv, vegger og hjelpeobjekter |
| Hjelpeobjekter generatoren måtte legge inn | **5** (en liten trapp av «brettede håndklær» opp til vasken) |
| Boten nådde motgift-biten | **ja**, ca. 14 s, 58 handlinger |
| Rekkevidde-feil | ingen kjente |

## Hva som fungerte
- Gjenkjenning og grov plassering av store ting (do, vask, kar, vindu, speilskap, matte).
- Småting som gir morsom geometri: flasker og tannglass på vasken, glasshylle, dusjkurv.
- Farer kom rett ut av bildene: **tomt kar = grop**, **åpent do = skylles ned**, **flis = glatt**.

## Hva som er usikkert / feil kilde
- **Mål:** ±5 cm i høyde, ±15 cm i posisjon. Tre bilder gir ikke eksakt layout. Ingen faktisk måling er sjekket mot det ekte rommet.
- **Det som ikke syns:** døras plassering, baksiden av do, hva som ligger bak kurven. Jeg har gjettet.
- **Former som ikke er bokser:** sinken (forsenkning), karets avrundede ende, skråtaket, hengende ting (dusjkurven er modellert som fast).
- Tolkningen er gjort av meg i en samtale, ikke automatisk fra piksler. I et produkt må dette bli et API-kall med strukturert utdata.

## Viktigste funn
1. **Uten klatring er høyt mål umulig.** Toppen av speilskapet (190 cm) kan ikke nås med hopp + rekk ut: det er 60–75 cm gap fra vinduet, og den åpne skapdøra står i veien. Derfor ligger motgiften midlertidig på tannglasset (98 cm). Dette er den sterkeste begrunnelsen så langt for å bygge klatring (B): kanter, knotter, håndkle og dusjkurv er allerede merket som `holds` i brettet.
2. **Hjelpeobjekter må kunne gjennomgås av et menneske.** Generatoren skriver ut hver av dem med størrelse og posisjon. Fem trinn «håndkle-bokser» ved vasken er greit; femten ville vært juks.
3. **Bildene er nesten helt hvite.** Lys og farge måtte dempes (se `look` i scenen) for at spilleren skal se hva som er hva.

## Neste test: bedre fangst
Mer pålitelig brett krever mer pålitelig input. Forslag til fangst for 3–4 bilder:
1. Ett bilde fra hvert av to motstående hjørner (hele rommet synlig).
2. Ett bilde fra gulvhøyde som viser undersiden og hvor ting møter gulvet.
3. Ett bilde med et **kjent mål** på gulvet (A4-ark eller mobil).
4. Ikke bruk blitz, og unngå speil rett på.

## Personvern
Bilder av hjemmet er sensitive. Prototypen bruker dem bare i samtalen; `.gitignore` hindrer at bilder legges i repoet. I et produkt: behandle på enheten eller slett umiddelbart etter tolkning, og aldri lagre dem.
