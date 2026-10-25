# tinylittleme – konsept og prototype

Spilleren har krympet og må komme seg fra gulvet til toppen. Brettet bygges av bilder spilleren tar av rommet sitt
(nattbord, bokhylle, skrivebord …).

## Beslutninger så langt
| Tema | Valg |
|---|---|
| Plattform | Nettleser først (Three.js). Fysikk og brettformat er skilt fra rendering for å kunne portes (Unity/Godot). |
| Stil | Leketøysaktig, stilisert. Tåler unøyaktig generering. |
| Brett nå | Håndlaget standardbrett (nattbord + bokhylle). Bevegelse er viktigere enn generering. |
| Spillere | Alene først. Flerspiller senere. |
| AI | Prototype: Claude via Claude Code. Hvis ideen virker: eget API. |

## Kjør
```
python3 -m http.server 8000     # åpne http://localhost:8000   (npm run serve)
node test_physics.mjs           # fysikktester                  (npm test)
node tools/solve.mjs            # er brettet løsbart? ca. 1 min (npm run solve)
```
Mobil: venstre stikke, HOPP og GRIP-knapper, dra for kamera.

## Arkitektur (portabel)
- `physics.js` – ren JS, ingen DOM. Akse-justerte bokser, fast tidssteg (1/120 s). Tilstander: ground / air / hang / swing.
  Alle bevegelsesverdier ligger i `P` (de er også grunnlaget for validatoren).
- `level.js` – brettet som data: `boxes`, `ropes`, `start`, `goal`. **Dette er formatet bilde → brett skal produsere.**
- `main.js` / `index.html` – rendering, input og UI. Eneste del som er nettleserspesifikk.
- `tools/solve.mjs` – løsbarhetsvalidator (Go-Explore med tilfeldige handlinger over den ekte fysikken).

## Bevegelse (første verb)
Løp, hopp (variabel høyde), dobbelthopp, gli langs vegg + veggsprang, kantgrep + hiv opp, tau/kabel-sving.
Rekkevidde: enkelthopp ≈ 2,4 enheter, dobbelthopp ≈ 4,8, med kantgrep litt over det. Spillerhøyde = 1.

Kjent skjevhet i veggsprang: utløses bare når spilleren faller og styrer inn mot veggen. Ellers stjeler det dobbelthoppet
(oppdaget i test).

## Fra bilde til brett (neste steg)
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
- Ikke spilletestet av et menneske – bevegelsen er bare enhetstestet og bot-løst. «Føles det bra?» er åpent.
- Boten kan finne veier et menneske ikke ville klart (eller glitcher). Bruk den som nedre grense for løsbarhet.
- Ingen lyd, ingen kamerakollisjon, ingen skråplan/ikke-akse-justerte former.
