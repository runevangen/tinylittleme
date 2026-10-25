# tinylittleme – konsept og prototype

Spilleren har krympet og må komme seg fra gulvet til toppen. Brettet bygges av bilder spilleren tar av rommet sitt
(nattbord, bokhylle, skrivebord …).

## Beslutninger så langt
| Tema | Valg |
|---|---|
| Plattform | Nettleser først (Three.js). Fysikk og brettformat er skilt fra rendering for å kunne portes (Unity/Godot). |
| Stil | Leketøysaktig, stilisert. Tåler unøyaktig generering. |
| Brett nå | Håndlaget standardbrett (nattbord + bokhylle). Bevegelse er viktigere enn generering. |
| Retning | Hybrid: plattformer (A) + klatring på tak med hender (B). Ikke ragdoll-fysikk. Referanser: A Difficult Game About Climbing, realistisk klatring. |
| Kapitler | Ett rom om gangen, **badet først** → se [docs/BADET.md](docs/BADET.md). Videre: stue, lekerom, kjøkken. |
| Mål | Motgiften ligger i biter, en på toppen av hvert rom. |
| Spillere | Alene først. Flerspiller senere. |
| AI | Prototype: Claude via Claude Code. Hvis ideen virker: eget API. |

## Kjør
```
python3 -m http.server 8000     # åpne http://localhost:8000   (npm run serve)
node test_physics.mjs           # fysikktester                  (npm test)
node tools/solve.mjs [klassisk|spenning]   # er brettet løsbart? 1–3 min (npm run solve)
```
Mobil: venstre stikke, HOPP og REKK UT, dra for kamera, klyp for zoom.

## Arkitektur (portabel)
- `physics.js` – ren JS, ingen DOM. Akse-justerte bokser, fast tidssteg (1/120 s). Tilstander: ground / air / hang / swing.
  Alle bevegelsesverdier ligger i `P` (de er også grunnlaget for validatoren).
- `level.js` – brettet som data: `boxes`, `ropes`, `start`, `goal`. **Dette er formatet bilde → brett skal produsere.**
- `main.js` / `index.html` – rendering, input og UI. Eneste del som er nettleserspesifikk.
- `tools/solve.mjs` – løsbarhetsvalidator (Go-Explore med tilfeldige handlinger over den ekte fysikken).

## Bevegelse
Løp, hopp (variabel høyde), gli langs vegg + veggsprang, kantgrep + hiv opp, tau/kabel-sving.
Tre innstillinger (⚙ i spillet; alle verdier kan justeres live og huskes i nettleseren):

| | Klassisk | Spenning | **Prince** (standard) |
|---|---|---|---|
| Gange | glir med konstant fart | glir med konstant fart | **skrittene styrer bevegelsen** (se under) |
| Fart opp / bremse / snu | umiddelbart | umiddelbart | **bygges opp, bremser, snur på stedet** |
| Hopp | raskt, 2 hopp | tungt, 1 hopp | tungt, 1 hopp, **0,1 s hurk før avspark**, **løpehopp går lengre** |
| Landing etter høyt fall | ingen | ingen | **hurk (opptil 0,5 s), langsom og kan ikke hoppe** |
| Hiv deg opp på kant | øyeblikkelig | øyeblikkelig | **0,8 s, jevn bevegelse** |
| Kant/tau | grips automatisk | rekk ut (REKK UT) i riktig øyeblikk | som Spenning |
| Gå forsiktig | | | hold **C** |

**Prince: gange med skritt.** Tilbakemeldingen var at figuren «sklir/flyr over gulvet» i stedet for å gå, og at ett skritt skulle gi ett skritt.
- *Fysikken eier skrittene:* en skrittfase teller opp av tilbakelagt distanse. Du går bare langs blikkretningen (ingen sideveis gliding), og kroppen snur gradvis. Står du stille og trykker mot en annen retning, snur du deg først.
- *Ett trykk = ett skritt:* slipper du tasten, fullføres skrittet du er i, og du stopper først på skrittgrensen (to føtter ved siden av hverandre). Et kort trykk gir ett skritt.
- *Snu i fart:* skli og bremse først, så snu på stedet, så gå.
- *Foten står fast:* beina bruker to-ledds IK. Standfoten ligger i ro i gulvet mens kroppen går forbi (målt drift ved jevn gange: 0,001–0,004 enheter, under 0,5 % av kroppshøyden), svingfoten løftes. Hoftehøyden følger beina, så det blir en naturlig vertikal gange.
- *Fart og skrittlengde følger menneskelige proporsjoner:* bena rekker ikke lengre enn ca. ±0,25 enheter, så tempoet er 2,8 enheter/s (ikke 5–6 som før, som ga feilen). Til gjengjeld er løpehoppet kraftigere (fartsfaktor 2), så hoppeavstandene og brettene er uendret.

Hvorfor «Prince»: referansen er Prince of Persia: vekt, tid og forpliktelse (og ikke en figur som flyter). Du kan ikke snu på stedet, hopp må planlegges, og feil koster tid. Tilbakemeldingen var at figuren «reagerte for fort fram og tilbake» og ga sjøsyke. Årsakene som ble funnet: nesten umiddelbar fart per akse, blikkretningen som snudde med en gang, kameraet som fulgte hvert hopp, strekk/klem av figuren, og en hektisk gangsyklus som gikk i fast takt.
Veggsprang utløses bare når spilleren faller og styrer inn mot veggen, ellers stjeler det hoppet (oppdaget i test).

**Figur og animasjon (andre runde med tilbakemelding: «armene skjelver», «stiv pinne»):**
- *Skjelvingen:* kom fra pekeskjermen. En tommel som bare hviler på stikken ga verdier rundt 0,1–0,3, som igjen ga stadige mikroskritt og armsving. Rettet med dødsone på stikken (0,22), hysterese på gange-input (starter ved 0,3, fortsetter ned til 0,12), og armsving som vokser jevnt med farten i stedet for å slå inn ved en terskel. Målt: en urolig tommel gir null bevegelse og ca. 3° armsvev.
- *Stiv pinne:* kroppen var ett stykke. Nå har den bekken og bryst som kan bøye og vri seg, skuldre og hender, overkroppen vrir seg motsatt hoftene i gange, og hodet ser seg litt rundt i hvile (pust i brystet).
- *Hopp som en bevegelse (ikke statiske poser):* hurk (hoftene synker 0,17) med armene bak → avspark med strakt kropp og armene opp → knærne trekkes opp mot toppen (løpehopp: ett bein frem, ett bak) → bena strekkes ned mot landing, armene ut for balanse.
- *Landing:* hoftene synker og kneet bøyes etter fallstyrke (liten landing 0,03, hard 0,14 og kne 1,7 rad), overkroppen lener seg frem, armene frem, og han reiser seg igjen. Samme IK som i gange, så føttene blir stående.
- *Andre situasjoner:* bærer med armene foran seg, lener seg inn når han dytter, hang og sving med litt pendelbevegelse.

**Kamera og gjenstående animasjon (gjelder alle innstillinger):** gangsyklusen følger farten, kroppen lener seg ved akselerasjon og bremsing, skrider bakoverlent når du snur, snur gradvis, har hurk før hopp og ved landing. Kameraet følger rolig og holder høyden stabil under hopp (figuren holdes alltid i bildet). Ingen strekk/klem.

## Løse ting
Dytte, bære, stable, knuse, klemt: se [docs/FLYTTBARE_TING.md](docs/FLYTTBARE_TING.md). Prøverom: `?level=poc`.

## Lyd
Syntetisert lyd: skritt per underlag, pust som følger anstrengelse, tar sats, avspark, falle og landing, og hendelser. Mikser med volum for hver enkelt lyd (0–200 %, ▶ for prøvespilling) i ⚙. Se [docs/LYD.md](docs/LYD.md). `M` skrur av/på.

## Brett
Knappen **Brett** i bunnen bytter mellom soverom, bad (tolket fra 3 bilder) og prøverom for å flytte ting. Spillet husker brettet du sist spilte (`?level=soverom|bad|poc` åpner et bestemt).

## Lagring og poeng
`K` lagrer punkt (må stå støtt), `R` går tilbake dit, `T` starter på nytt. Sjekkpunkt på nattbord og hylle er gratis.
Poeng: 1000 − 25 per lagring − 10 per tilbakeføring (også ved fall) − 2 per 10 s.

## Moduser for planlegging og brettbygging
- **Plan (P):** fri 360°-kamera rundt valgfritt punkt, WASD flytter, dra snurrer, hjul/klyp zoomer. Klokka står stille.
- **Fly (G):** støtfri flyging for rask navigering (Mellomrom opp, C ned, Shift fort). Bruk av flymodus markeres som ugyldig tid.

## Grafikk
PBR-materialer, prosedyre-teksturer (tre, gulvplanker, bokssider, puss), refleksjonsmiljø, soft skygge som følger spilleren,
vindu med sollys, nært kamera med kollisjon mot brettet. Figuren har menneskelige proporsjoner og egne poser (gå, hopp, fall, rekke ut, henge, sving).

## Fra bilde til brett
Testet på et bad med 3 bilder: se [docs/FOTO_TIL_BRETT.md](docs/FOTO_TIL_BRETT.md). Pipeline: bilder → `scenes/*.scene.json` → `tools/scene2level.mjs` → `levels/*.level.json` → bot.

Opprinnelig skisse av skjemaet:
Claude får 1–6 bilder og skal returnere JSON etter dette skjemaet; en generator gjør det om til bokser:
```json
{
  "objects": [
    { "id": "nattbord", "kind": "furniture", "height_rel": 0.55, "footprint_rel": [0.4, 0.4],
      "surfaces": [{ "name": "topp", "height_rel": 0.55 }],
      "near": ["seng"], "has_cable": true }
  ],
  "reference_scale": "seng = 0.5 m høy"
}
```
Så: skalering til spillenheter → plassering → **validator** → legg inn hjelpeobjekter (bøker, kabel, gummistrikk) der gap
er for store → ny validering. Validatoren er det som gjør at AI-en får ta feil.

## Mål-kandidater (ikke avgjort)
- Drøm: nå lampen/vinduet for å våkne – neste nivå = neste rom.
- Årsak: det som krympet deg står på toppen av hylla.
- Klokke: alarmen går om litt, tidspress.

## Risikoer
Skala fra ett bilde, ventetid/kostnad per brett (trenger kuraterte reservebrett), dårlige bilder, personvern (bilder fra hjemmet
skal ikke lagres), fysiske sikkerhet ved skanning.

## Ikke gjort / vet vi ikke
- «Spenning» er ikke spilletestet av et menneske, bare enhetstestet og bot-løst. Bot-løsningen krever mange flere forsøk enn «Klassisk»: sannsynligvis tøffere, men må kjennes.
- Boten kan finne veier et menneske ikke ville klart (eller glitcher). Bruk den som nedre grense for løsbarhet.
- Ingen lyd, ingen kamerakollisjon, ingen skråplan/ikke-akse-justerte former.
