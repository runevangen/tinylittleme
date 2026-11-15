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
