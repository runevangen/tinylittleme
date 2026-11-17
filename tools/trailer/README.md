# Trailer-montasje

Setter sammen klipp fra spillmotoren til en liggende 16:9-trailer på 45 s (mp4). Manus og valg: `docs/TRAILER.md`. Ingen egne animasjoner: verktøyet gjør bare interpolering, skalering, fargekorrigering, tekstkort, overganger og lyd. Bilder og mp4 sjekkes ikke inn.

## Krav
`ffmpeg` (med `libx264`, `drawtext`, `minterpolate`, `xfade`), `jq`, `awk` og skriftfila `/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf` (kan endres i `edit.json`).

## Inndata
- **Bildefølger:** `<frames>/<klipp-id>/%04d.png`, rendret i 960×540 ved 12 bilder/s (starter på `0001.png`). Klipp-id-ene står i `edit.json` (`bad`, `klatring`, `barnerom`, `kjokken`, `niva4`, `bygg`, `stue`, `raske`, `slutt`). Andre størrelser blir letterboxet til 16:9; for korte klipp holder siste bilde.
- **Shotlist:** `tools/trailer/edit.json`: rekkefølge, `dur` (synlig lengde, summen er filmens lengde, 45 s), overgang `into` (`cut` eller `fade` med `dur`), tekstkort per klipp (`text`, `at`/`to` i sekunder fra klippstart, `pos` `bottom`/`center`, `size`, `fade`, `y_off`). Teksten ligger i UTF-8 og leses fra fil, så æøå går rett gjennom. Klippet `_tittel` (`"type": "black"`) er tittelkortet på svart til slutt.
- **Musikk (valgfritt):** en wav, f.eks. fra `tools/music_wav.cjs`. Kuttes til filmens lengde, fade inn/ut (`audio` i `edit.json`) og kodes som AAC 192k. Uten `-m` blir filmen uten lyd.

## Bruk
```
tools/trailer/build.sh -f frames -m music_trailer.wav -o trailer.mp4
```
Flagg: `-f` bildemappe (standard `frames`), `-m` musikk, `-o` ut-fil (standard `trailer.mp4`), `-e` annen shotlist, `-w` arbeidsmappe (standard en temp-mappe; mellomklippene `c_<n>.mp4` og filtergrafene `fg_<n>.txt` ligger der, nyttig til feilsøking).

## Hva som skjer
1. Per klipp: 12 → 24 fps med `minterpolate` (bevegelsesinterpolering; `"interp": "blend"` eller `"dup"` globalt eller per klipp for raskere/enklere), skalering til 1280×720 med lanczos, lett fargekorrigering (`eq` mettet/kontrast + `colorbalance` varm; verdier under `grade`), tekstkort med hvit tekst og myk skygge (uskarpt svart lag under) som fader inn og ut.
2. Klippene settes sammen med `xfade`. `fade` er en kort kryssfade; `cut` er et hardt klipp (ett bildes overgang). Kryssfaden legges over slutten av forrige klipp, så `dur` er alltid det synlige.
3. Lyden mikses på og fades ut. Utdata er H.264 (crf 18) + AAC, `yuv420p`, `faststart`.

Rendering av 45 s tar noen minutter på CPU (`minterpolate` er tregest).

## Rendering
Bildene tas av selve spillmotoren i kinomodus (`docs/TESTING.md`, «Kinomodus»), ett klipp om gangen: `tools/trailer/render.cjs` + `render_lib.cjs`, klippmoduler i `tools/trailer/shots/<id>.cjs`.
```
node tools/trailer/render.cjs --clip 01_bad_oversikt --out ~/frames          # alle bilder -> ~/frames/01_bad_oversikt/0001.png ...
node tools/trailer/render.cjs --clip 01_bad_oversikt --out ~/frames --test   # bare første, midterste og siste bilde -> ~/frames/_test/<id>/
node tools/trailer/render.cjs --clip <id> --out ~/frames --from 20 --to 39   # delområde (0-baserte indekser)
```
Utmappa gis med `--out` eller env `TRAILER_FRAMES` (hold den utenfor repoet; bilder sjekkes ikke inn). Programvare-GL tar ca. 12 s per bilde.

**Biblioteket:** starter en statisk filserver (node `http`) på ledig port med repoets rot, starter Chromium (`--use-gl=swiftshader --enable-unsafe-swiftshader`, playwright via `NODE_PATH`), 960×540, laster klippets `url` fra `shotlist.json` med `&cinema=1&cine_hold=1`, setter `innstillinger` fra shotlist og eventuell `localStorage` fra klippmodulen (f.eks. `tlm.flood`) via `addInitScript`, og venter på `window.__game.cine`.

**Klippmodul (CommonJS):** `module.exports = { id, async setup(ctx), async frame(ctx, i, n) }`, valgfritt `ticksPerFrame` og `localStorage`. `ctx` har `page`, `cine` (proxy: `cine.setCam(...)` kaller `window.__game.cine.setCam` med `page.evaluate`, også `cine.build.open(..)`; `cine.get('navn')` leser en egenskap), `fps` (12), `ticksPerFrame` (5 ved 1/60 s), `n` og `advance(ticks)`. Per bilde: `frame()` setter kamera/figur/handling, tiden stegges, så `cine.render()` + skjermbilde. Id-en må stå i `shotlist.json` (`bilder` gir `n`).

**Gjenopptakbart:** finnes bildefila fra før, hoppes render og skjermbilde over, men tid og handlinger simuleres likevel (steg er billig), så spillet er i samme tilstand etter en krasj. Bare kjør samme kommando på nytt. Fremdriftslinjer viser brukt tid og anslått resttid; `.done` skrives i bildemappa når hele klippet er ferdig.

## Forhistorien «Leggetid»
Manus: `docs/FORHISTORIE.md`. Fem klipp (`10_leggetid_a_bad`, `_b_skap`, `_c_tablett`, `_d_speil`, `_e_krymp`, 294 bilder) med felles oppsett i `shots/_leggetid.cjs`: badet (nivå 1) om kvelden med figuren skalert 24x (`cine.heroScale`), speil, speilskap, flaske, lapp, glass og tablett som enkle props (`cine.prop`, se `docs/TESTING.md`), speilbildet som flat, speilvendt kopi av figuren (`prop` `hero`, med `blink`) som projiseres inn på speilflata fra kameraet. Armen styres ved at skriptet overstyrer armleddenes rotasjon i siden (`forceArm`), uten å røre spillkoden. Krympingen (`_e_krymp`) lar figuren stå stille på samme sted S (HERO, x -1, z -12) mens skalaen går 24 til 1; kameraet kretser/dollyer ned rundt figurens bryst med jevnt synkende skjermandel til gulvposen `END_CAM` (`_leggetid.cjs`), og `01_bad_oversikt` starter på nøyaktig den posen (samme S, samme spilltid) og løfter så kameraet ut over badet (match-cut). Tekstkort/tankebobler: `edit_leggetid_v3.json` (forhistorien alene) og `edit_v5.json` (forhistorie + trailer).
```
for c in a_bad b_skap c_tablett d_speil e_krymp; do node tools/trailer/render.cjs --clip 10_leggetid_$c --out ~/frames; done
tools/trailer/build.sh -f ~/frames -m music.wav -e tools/trailer/edit_leggetid.json -o leggetid.mp4
```
Merk: `--from/--to` hopper over tegning av tidligere bilder, så hånda i `_c_tablett` (leses fra forrige tegning) er bare riktig når klippet rendres fra bilde 0.
