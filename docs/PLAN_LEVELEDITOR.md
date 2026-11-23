# Plan: leveleditor (utkast, godkjent retning av Rune 2026-11-23)

Spilleren tar bilder av sitt eget rom, får et spillbart brett, og kan spille det selv eller dele det. Kjeden er testet på badet (`docs/FOTO_TIL_BRETT.md`): bilder → tolkning (`docs/VISJON_PROMPT.md`, `docs/scene.schema.json`) → validering (`tools/validate_scene.mjs`) → `tools/scene2level.mjs` → bot som beviser at målet kan nås. Mangler: tolkning som tjeneste, editor på mobil, lagring og deling.

## Rekkefølge (Runes valg)
1. **Fase A, tidlig AI-test (først).** Bare Rune og testere. Claude (bildeforståelse) via en Supabase edge function. Tak 200 tolkninger i måneden som stopper automatisk, av-bryter, bilder lagres aldri (slettes straks etter tolkning, nedskalert før sending). I spillet: knapp «Lag brett fra bilder» (bak valg i ⚙, bare testere), fangstveiledning (to hjørner, ett fra gulvhøyde, ett med A4-ark som mål), bildeopplasting (`<input type="file" capture>`), forslag, enkel retting (flytt og slett), boten sjekker, spill. Brettet lagres lokalt på telefonen. Logg: kostnad, tid, antall rettinger, om boten fant en vei.
2. **Fase 1:** «Mine brett»: lagre, laste fra kode og spille egne brett i VELG BRETT.
3. **Fase 2:** manuell romeditor på mobil (ting fra `kinds.js`, flytt/skaler, start og mål, «Sjekk» med bot, maks fem hjelpeobjekter). Gjenbruker byggeskjermen (R101).
4. **Fase 3:** forslaget fra fase A åpnes i den fulle editoren; åpnes for flere enn testere først etter vurdering av personvern og kostnad.
5. **Fase 4:** deling med kode eller lenke (`tlm_rooms`), spill fra kode, slett mitt brett, meld brett. Privat som standard.
6. **Fase 5:** felles liste, bare med moderering. **Fase 6:** polering (veiledning, maler, delmål og stjerner for egne brett).

## Risiko og tiltak
- Personvern (bilder av hjemmet, barn): aldri lagre bilder, ikke gjengi personer, samtykketekst før første bilde, aldersgrense og samtykke vurderes før åpning for alle, jurist anbefales før bred åpning.
- Kostnad og misbruk: kvote per tester-kode, månedstak, automatisk stopp, av-bryter.
- Upresis tolkning (±5–15 cm, skjulte ting): resultatet er et forslag, spilleren retter.
- Brett som ikke kan vinnes: bot må bevise løsbarhet før lagring; maks fem hjelpeobjekter.
- Ytelse: tak på antall bokser, 30 fps.
- Upassende innhold: delte brett er tall og former; navnefilter, melde-knapp, ingen offentlig liste før moderering.

## Måling
Brett laget og andel løsbare første gang; tid fra første trykk til første runde (mål under 10 minutter); andel rettet av spilleren; andel delt og spilt av andre; kostnad per brett; andel som gir opp.

## Utenfor første versjon
Flere etasjer, utendørs, 3D-skanning (LiDAR), live kamera, rangering på tvers av spillere.

## Krever Rune
API-nøkkelen legges inn som hemmelighet i Supabase (jeg kan ikke ta imot nøkler i samtalen), og godkjenning av at bilder sendes til tjenesten.
