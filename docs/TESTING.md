# Testing av styring og kamera (v0.60)

Mål: finn en styring og et kamera som føles lett, tydelig og ikke slitsomt, og som får deg til å føle deg liten i et rom.

## Slik tester du
1. Åpne **Kontrollbanen**: ⚙ → Spill → Brett → «Kontrollbanen», eller `?level=kontroll`. Den har stasjoner med lapper (trykk «i»): **slalom** (rolig og rask gange mellom stolper), **trinn** (2,5 cm tas av seg selv, resten må hoppes), **hopp over hull** (2, 3 og 4 enheter; mål er siste plattform), **trapp** (kanter på 0.1 til 0.2 som føttene løftes mot; stasjonen foran, ved sideveggen), **fall-tårn** (hopp ned på matte og gulv, se landingsmarkøren skifte farge), **balansebjelke** (smal; gå sakte) og en lav kasse.
2. Gå banen **samme rekkefølge hver gang** og bytt ett valg om gangen.
3. Trykk **⚑** øverst til høyre når noe føles bra eller dårlig: velg tema (Styring, Kamera, Hopp, Gange, Annet) og 👍 / 😐 / 😫. Vurderingen havner i rapporten med tid og posisjon.
4. Til slutt: ⚙ → Test → **Del rapport** og send den. Den har endrede innstillinger og målinger (sveip per minutt, hvor mye kameraet ble dreid av deg og automatisk, hvor lenge stikken var i bruk).

## Valg å sammenligne (⚙)
| Hva | Hvor | Prøv |
|---|---|---|
| Styringsstil | Styring | Mario (standard), PUBG, Prince |
| Hjelp-nivå | Styring | Ingen / Normal / Mye hjelp (tilgivende hopp, kantgrep, tråkke opp små hinder) |
| Treghet, gangfart, stikke-følsomhet | Styring | Mer kjapp mot mer tung |
| Flytende stikke | Styring | Fast (PUBG) mot flytende (følger tommelen) |
| Kanthjelp (to valg) | Styring | På mot av: stopper du trygt ved kanter med forsiktig stikke? Hopper han når du vil, og bare da? |
| I lufta: demping, sikte-hjelp, hold GREP | Styring | Ett om gangen av: hvilket merker du mest når du hopper for å gripe noe? |
| Kameraet ser litt foran deg | Kamera | På mot av |
| Grafikk | Spill | Detaljert mot Enkel: se på FPS (⚙ → Test) |
| Kamerafølging: styrke | Kamera | 0 (av), 1 (normal), 2 (sterk) |
| Synsfelt, kameravinkel, avstand | Kamera | Lavt og nærme gir mer «liten»-følelse |
| Skygge og landingsmarkør | Kamera | På mot av |

## Spørsmål å svare på etter en økt
- Måtte du tenke på kameraet? Hvor ofte sveipet du?
- Hvilke hopp bommet du på, og så du hvorfor (skygge, markør)?
- Følte du deg liten? Når og når ikke?
- Hva var mest slitsomt for tommelen?

## Tall som sier noe
- **Sveip per minutt** og **kamera dreid av deg**: lavere er bedre (kameraet gjør jobben).
- **Kamera dreid automatisk**: høyt og ujevnt kan bety at kameraet svinger for mye (kvalme).
- **Stikke i bruk**: hvor mye du faktisk går.

## Kinomodus (R68): bilder til trailer fra selve motoren
Kinomodus er av som standard og endrer ikke vanlig spilling. Den brukes av `tools/trailer/` til å ta bilde for bilde ut av spillet (se `docs/TRAILER.md`). Kode: `cinema_logic.js` (ren logikk) og `cinema_view.js` (API). Test: `node test_cinema.mjs` (API, frø, lagring, kamera, bane, bygg) og `node tools/live_cinema.cjs <utmappe> [port]` (Playwright 1280 × 720: ingen UI, `setCam`, hash-test, byggeskjermen).

**Slå på:** `?level=<brett>&cinema=1` (eller `window.__game.cine.on()`, som laster siden på nytt med `cinema=1`; også ⚙ → Admin → Kinomodus). Ekstra adresseparametre: `cine_hold=1` (starter frosset: spillet står stille til skriptet tar over; uten den går spillet vanlig til første kall), `cine_seed=<tall>` (frø, standard 1), `cine_opt=tlm.flood:rask;tlm.floodrate:2.5` (valg som gjelder bare denne økten). Slå av: fjern `cinema` fra adressen (`cine.off()`).

**Hva kinomodus gjør**
- Skjuler all UI med `body.cinema`: HUD, toppbånd, delmål, knapper (stikke, TA, HOPP, GREP, ◎, kart, ⚙), minikart, kompass, toast, hint, ⚑ og ℹ, intro-sveip og fortelling, markører, piler og veiledningskant. De gylne omrissene rundt klatreflater og de gule rammene rundt byggesteder skjules også. Bare tegneflata og byggeskjermen (`#bld`) står igjen. Det finnes ikke noe vannmerke å skjule.
- Ingen lyd, ingen autolagring og ingen skriving til `localStorage` (`store.set` gjør ingenting; `store.get` leser bare standardene, så nettleserens lagrede valg påvirker ikke bildet). Standardene er Ekspert (ingen hjelp), skulderkamera av, styring som på mobil (forhåndsvalget «mario»), fortelling av.
- **Fast frø:** `Math.random` erstattes av en seedet generator (mulberry32) som lastes først. Støv, lysstøv, blunking, edderkopp-takt og smuler blir like fra gang til gang. `cine.seed(n)` starter rekka på nytt.
- Tid: tegningen bruker virtuell tid (`cine.t`), ikke klokka, så støv og lys står stille mellom bildene.

**API (`window.__game.cine`)**
- `cine.setCam({ x, y, z, tx, ty, tz, fov })` fritt kamera (posisjon og blikkpunkt), settes per bilde og overstyrer følgekameraet; delvise poser bygger på forrige. `cine.followCam({ dist, yaw, pitch, height })` bruker det vanlige følgekameraet med valgte verdier (hopper rett til dem). `cine.releaseCam()` gir tilbake spillets kamera. `cine.lerpCam(fra, til, t, 'smooth')` gir en pose mellom to (kamerabane).
- `cine.setHero({ x, y, z, yaw })` setter figuren (yaw 0 = mot +z). `cine.step(n, dt)` kjører n tikk med fast tidssteg (samme `update` som `__game.tick`). `cine.render()` tegner ett bilde (kameraet jevnes ut med tiden siden forrige bilde). `cine.shot()` / `cine.hash()` gir bildet som data-URL / FNV-hash.
- `cine.runRoute(bane)` tar en bane per tikk fra den ekte boten og gir en spiller (`seek(i)`, `advance(n)`, `at(i)`, `done`) som setter figuren tikk for tikk uten tastetrykk. Banen lages med `node tools/cine_route.mjs levels/<brett>.level.json [ruta|genvei:<id>|hard:<id>|bygg:<id>] --every 1 --out bane.json` (rad: `[t, x, y, z, tilstand, fx, fz]`). `cine.runRoute('url')` henter banen fra en adresse.
- `cine.set('flood', 'rask')` og andre valg fra ⚙ (id fra SETTINGS) settes uten å lagres; `tlm.flood` og `tlm.floodrate` kan også settes før lasting med `cine_opt`.
- `cine.build.open('lab7')` åpner et byggested uten nærhetskrav, `cine.build.place('lab7')` legger inn referansebygget (`site.ref`), `cine.build.start()` starter prøven, `cine.build.step(dt)` stegger prøven og tegner byggeskjermen på nytt (plassering, prøve, brudd og ny bro kan filmes bilde for bilde), `cine.build.close()`. Zoom og plassering for hånd går som vanlig med berøring/mus (Playwright).
- `cine.state()` gir tilstanden. Viktige hendelser logges med `logEv('kino', …)`.

**Slik filmer du**: åpne `?level=bad&cinema=1&cine_hold=1`, vent til `window.__game.cine` finnes, sett figur og kamera, og kjør `for (i < N) { cine.step(5, 1 / 60); cine.render(); /* skjermbilde */ }`. To kjøringer med samme frø og samme skript gir identiske bilder (hash-testen i `live_cinema.cjs`). Miljøet uten GPU (swiftshader) tegner trege bilder: ekte FPS og følelse testes på iPhone.
