# Plan: leveleditor (utkast, godkjent retning av Rune 2026-11-23)

Spilleren tar 2–4 bilder av sitt eget rom eller et lite avgrenset område ute (terrasse, hjørne av hagen, liten lekeplass), får et spillbart brett, og kan spille det selv eller dele det. Kjeden er testet på badet (`docs/FOTO_TIL_BRETT.md`): bilder → tolkning (`docs/VISJON_PROMPT.md`, `docs/scene.schema.json`) → validering (`tools/validate_scene.mjs`) → `tools/scene2level.mjs` → bot som beviser at målet kan nås. Mangler: tolkning som tjeneste, editor på mobil, lagring og deling.

## Rekkefølge (Runes valg)
1. **Fase A, tidlig AI-test (først).** Bare Rune og testere. Claude (bildeforståelse) via en Supabase edge function. Tak 200 tolkninger i måneden som stopper automatisk, av-bryter, bilder lagres aldri (slettes straks etter tolkning, nedskalert før sending). I spillet: knapp «Lag brett fra bilder» (bak valg i ⚙, bare testere), fangstveiledning (fungerer med 2 bilder som minimum: to motstående hjørner, gjerne ett fra bakkehøyde og ett med A4-ark som mål; innendørs og utendørs), bildeopplasting (`<input type="file" capture>`), forslag, enkel retting (flytt og slett), boten sjekker, spill. Brettet lagres lokalt på telefonen. Logg: kostnad, tid, antall rettinger, om boten fant en vei.
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

## Ett trykk og kreative spillere (Runes ønske 2026-11-23)
Verktøyet skal være for kreative spillere, med en «ett trykk»-løsning: spilleren velger 2–4 bilder, svarer på 2–4 korte spørsmål fra spillet (mål, vanskelighet, stemning og tema, fiender og farer på/av), trykker «LAG BRETT», og får et ferdig, spillbart brett som kan justeres for hånd etterpå og deles med en kode. Første versjon er for testere (fase A, R152, R153). Åpning for flere kreative spillere skjer i trinn etter vurdering av personvern, kostnad og moderering.

## Sted: inne og ute
Begge deler er lov, 2–4 bilder. Utendørs trenger egne ting i `kinds.js` og i instruksen til tolkningen (stein, gress, benk, trapp, hekk, bord, lekeapparat, grus, vann) og egne farer (kantstein, vann, glatt underlag). Alle ting må få mål og materiale slik at fysikken virker.

## Måling
Brett laget og andel løsbare første gang; tid fra første trykk til første runde (mål under 10 minutter); andel rettet av spilleren; andel delt og spilt av andre; kostnad per brett; andel som gir opp.

## Utenfor første versjon
Flere etasjer, utendørs, 3D-skanning (LiDAR), live kamera, rangering på tvers av spillere.

## Krever Rune
API-nøkkelen legges inn som hemmelighet i Supabase (jeg kan ikke ta imot nøkler i samtalen), og godkjenning av at bilder sendes til tjenesten.
