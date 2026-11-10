# R1: Toy Story-lys, før/etter

Bildene viser «Av» (`_av`) mot «Varm film» (`_film`), samme posisjon, iPhone 14-utsnitt, ekte kjøring (`?level=...`, programvare-GL).

- Nivå 1 (Bad): `n1_start_av.png` / `n1_start_film.png`. Grå fliser blir varme krem-fliser, sol og skygge får tydelig varm/kjølig kontrast.
- Nivå 2 (Barnerom): `n2_start_av.png` / `n2_start_film.png`. Kameraet startet før *utenfor* veggen (z=29,3 mot vegg ved z=28), så figuren var skjult. Kameraet holdes nå innenfor rommet (`inRoom` i `main.js`), og utsnittet viser gulv, ball, flagg og figur.
- Nivå 3 (Kjøkken): `n3_start_av.png` / `n3_start_film.png`.
- Klarlakk: `n2_ball_av.png` / `n2_ball_film.png` (ballen tett på: tydelig speilende glansflekk og rikere farge i film). Film-modus speiler miljøet kraftigere i blank plast/porselen (envMapIntensity 1,7) og har skarpere klarlakk.

Målt i utsnittet over HUD/knapper (snitt R/B, metning):

| Nivå | R/B av -> film | Metning av -> film |
|---|---|---|
| 1 Bad | 1,17 -> 1,40 | 0,162 -> 0,302 |
| 2 Barnerom | 1,56 -> 2,10 | 0,366 -> 0,518 |
| 3 Kjøkken | 1,14 -> 1,32 | 0,146 -> 0,252 |

Ingen utbrente flater i bildene (hvit speiling på store flater er dempet og miljøspeilingen er begrenset til klarlakk-materialer).

## Ytelse
FPS i programvare-GL er ikke representativt, så det er ikke brukt som bevis. I stedet er det ekstra arbeidet begrenset:
- Grafikk «Enkel» får ingen ekstra lys, ingen clearcoat (vanlig Standard-materiale) og ingen CSS-filter.
- Grafikk «Detaljert»: 2 ekstra lys uten skygge, clearcoat bare på plast/porselen/keramikk (store flater har dempet clearcoat), og ett CSS-filter på canvaset.
- Går det tregt på en gammel telefon: slå Fargegradering til «Av», eller Grafikk til «Enkel». FPS-visning i ⚙ → Test gir tall fra ekte telefon.
