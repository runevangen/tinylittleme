# Changelog siste 24 timer

*11.11 kl. 19:14 til 12.11 kl. 19:12 · v1.15 → v1.40 · 26 versjoner · tall fra `origin/main`.*

## Nytt i spillet
- **v1.15** · Gulvdetaljer (R13): blyanter, viskelær, perler og smuler gir målestokk. Badematta flimrer ikke lenger.
- **v1.22** · Fallgrenser (R28): landingsmarkør, fallvind og tre landingsklasser.
- **v1.23** · Flere byggebrett (R30): vippe og kjøkkenbro, og vippe som ny byggedel.
- **v1.24** · Verktøy-genveier i nivå 4–6 (R29): hårgelé-trapper, bevist med `walk_route`.
- **v1.25** · Boten klatrer og bruker verktøy (R32), med streng og løs validering.
- **v1.26** · Nivå 7: lekerommet (R31).
- **v1.30** · Sprettboksen kaster figuren som står på den (R34).
- **v1.31** · Målskjermen fungerer på liggende mobil.

## Fra testerne (Rune, 5 saker, 5 rettet)
- **v1.32** · Kart- og ◎-knappene ble mindre i veien, og håndkleet flimrer ikke lenger.
- **v1.35** · ◎ og kartknappen er borte som standard.
- **v1.38** · Pustelyd er av som standard.
- **v1.39** · De små blå og røde ballene er solide.
- **v1.33 og v1.40** · Hakkene er redusert: shadere forvarmes under lasting (R35 og R35b).

## Lys og innstillinger (annen økt)
- **v1.16–v1.17** · Rettet hakk når lyset slås av og på, føtter under tepper, og lykta følger kameravinkelen.
- **v1.18–v1.19** · Innstillingene er ryddet i ni grupper med undermenyer og søk, og har en Lukk-knapp som blir stående ved rulling.

## Tilbakemeldingsløypa
- **v1.27** · «Send til Claude» fra spillet til Supabase. Spillet kan bare sette inn nye rader, og bare med gyldig tester-kode.
- **v1.28** · Korte tester-koder uten krav til store og små bokstaver.
- **v1.34** · Svar fra Claude og tellere i spillet (R36).
- **v1.37** · Løpende behandling hver annen time, og runneren er lagret i repoet.
- **v1.20, v1.21, v1.29 og v1.36** · Backloggen er ryddet, og veikartet er fylt på med R27–R38.

## Tall (42 commits)
| | Linjer lagt til | Linjer fjernet |
|---|---|---|
| Spillkode og verktøy | **1 260** | 157 |
| Tester | **633** | 21 |
| Dokumentasjon | **208** | 55 |
| Brett og scener (generert data) | 4 149 | 10 |
| Annet | 36 | 18 |
| **Totalt** | **6 286** | **261** |

- **Netto:** +6 025 linjer i 83 filer, rundt 250 linjer i timen.
- **Reelt skrevet kode:** 1 260 linjer spillkode og 633 linjer tester, altså 1 893 linjer. Resten er dokumentasjon og genererte brettdata.
- **Størst:** `main.js` +180, `feedback_send.js` 117 og `tools/bot.mjs` 110.
- **Nye filer:** 23, blant annet `landing.js`, `toy_kick.js`, `shaderwarm.js` og lekerommet.
- **Hele spillkoden i roten** var 10 304 linjer JavaScript da rapporten ble laget.
- Alle 42 commits er signert «Claude». Det sier ikke noe om hvem som tok beslutningene.

Tallene er linjer i git, ikke kvalitet. Linjer runneren senere skrev om, er ikke trukket fra.
