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
To innstillinger (⚙ i spillet, alle verdier kan justeres live og huskes i nettleseren):

| | Klassisk | Spenning (standard) |
|---|---|---|
| Hopp | raskt, ≈2,4 enheter | tyngre og tregere, ≈3,4 enheter, lang luftsvev |
| Dobbelthopp | ja | nei |
| Styring i lufta | mye | lite (du forplikter deg) |
| Kant/tau | grips automatisk | du må **rekke ut** (Shift/E/REKK UT) i riktig øyeblikk. Vinduet varer 0,4 s, deretter 0,6 s pause. |

Hvorfor «Spenning»: dobbelthoppet føltes tilfeldig. Nå avgjør timing og planlegging, og et bomskudd koster.
Veggsprang utløses bare når spilleren faller og styrer inn mot veggen, ellers stjeler det hoppet (oppdaget i test).

## Løse ting
Dytte, bære, stable, knuse, klemt: se [docs/FLYTTBARE_TING.md](docs/FLYTTBARE_TING.md). Prøverom: `?level=poc`.

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
