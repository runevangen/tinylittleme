# R1: Toy Story-lys, før/etter

Bildene viser «Av» (venstre) mot «Varm film» (høyre), samme posisjon, iPhone 14-utsnitt, ekte kjøring (`?level=...`, programvare-GL).
Barnerommet (nivå 2) står med kameraet tett på en vegg ved start, så det er et mindre egnet utsnitt; nivå 1 og 3 er hovedbevisene.

Målt i utsnittet uten HUD og knapper (snitt R/B, metning, lysstyrke):

| Nivå | R/B av | R/B film | Metning av -> film | Luma av -> film | Hvite piksler (>240) |
|---|---|---|---|---|---|
| 1 Bad | 1.125 | 1.186 | 0.142 -> 0.185 | 150 -> 157 | 0.11 % -> 0.12 % |
| 3 Kjøkken | 1.132 | 1.253 | 0.150 -> 0.224 | 189 -> 197 | 0.12 % -> 0.13 % |
| 2 Barnerom | 1.123 | 1.165 | 0.136 -> 0.165 | 182 -> 175 | 0.10 % -> 0.10 % |

Forrige runde målte «av» feil (localStorage-verdien var ikke JSON, så «av» ble lest som standard «film»); derfor så de to like ut.
Ingen utbrente flater (andelen hvitt øker ikke), rommene blir ikke mørkere (lysstyrken er lik eller litt høyere). Hvit glansflekk på gulvet er borte etter at kant- og fyllys ble løftet høyere (ikke lenger streiflys mot kameraet).

## Ytelse
FPS i programvare-GL er ikke representativt, så det er ikke brukt som bevis. I stedet er det ekstra arbeidet begrenset:
- Grafikk «Enkel» får ingen ekstra lys, ingen clearcoat (vanlig Standard-materiale) og ingen CSS-filter.
- Grafikk «Detaljert»: 2 ekstra lys uten skygge, clearcoat bare på plast/porselen/keramikk (store flater har dempet clearcoat), og ett CSS-filter på canvaset.
- Går det tregt på en gammel telefon: slå Fargegradering til «Av», eller Grafikk til «Enkel». FPS-visning i ⚙ → Test gir tall fra ekte telefon.
