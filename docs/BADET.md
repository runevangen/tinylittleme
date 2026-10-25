# Kapittel 1: Badet (kladd)

Status: designutkast, ikke bygd. Mål: teste hybrid-bevegelsen (plattformer + klatring) og motgift-ideen i ett lite rom.

## Historien i én setning
Trylledrikken krympet deg. Motgiften er delt i biter som ligger på toppen av hvert rom. Badet er første rom, og første bit står
ved tannglasset på speilskapet.

## Skala og hoppbudsjett
1 enhet ≈ 5 cm. Rom ca. 60 × 50 enheter (3 × 2,5 m).
Med «Spenning»-innstillingen (se `physics.js`) klarer spilleren:

| | Maks | Trygt i design |
|---|---|---|
| Høydeforskjell ved hopp + kantgrep | ≈ 5,4 | ≤ 4,5 (4,5–5,4 er «spenning») |
| Gap i hopp | ≈ 7 | ≤ 5,5 |
| Klatring på tak | ubegrenset høyde, men tar stamina | ≤ 12 per strekk |

## Planløsning (sett ovenfra, ikke i målestokk)
```
 nord (vindu)
 ┌──────────────────────────────────────────────┐
 │ [Speilskap 38 ▲MOTGIFT]   [Hylle over do 26] │
 │   ┆ knott-vegg 30–38           ┆ håndkle 16→26│
 │ [Vask 17]  [Do: tank 16, sete 8]  [Badekar 11│
 │                                   vann 9 ~~~~]│
 │ [Vaskekurv 12]                               │
 │ [Håndkleunge 8]  (glatte fliser)             │
 │ [Rullestabel 4.4 / 2.2]                      │
 │ START ● dørmatte (myk)            DØR        │
 └──────────────────────────────────────────────┘
 sør
```

## Hovedruten (høyder i enheter)
| # | Fra → til | Høyde | Hva du gjør | Type |
|---|---|---|---|---|
| 1 | Dørmatte → rullestabel | 0 → 2,2 → 4,4 | to enkle hopp | A |
| 2 | Rullestabel → håndkleunge | 4,4 → 8 | hopp + rekk ut | A |
| 3 | Håndkleunge → vaskekurv | 8 → 12 | rekk ut mot kanten | A |
| 4 | Vaskekurv → do-tank | 12 → 16 | hopp, grip kant. **Gratis sjekkpunkt** | A |
| 5 | Do-tank → hylle (26) | 16 → 26 | klatre opp i håndkle på krok (grip-flate, stamina) | **B** |
| 6 | Hylle → håndkleholder (stang) | gap ≈ 5 | hopp, grip stangen og **sno deg sidelengs** | **B** |
| 7 | Stang → speilskap-topp (38) | 30 → 38 | klatre opp rekke med knotter (tak ca. hver 2–3 enhet), så hiv deg opp | **B** |
| 8 | Toppen | 38 | hent motgift-bit ved tannglasset | mål |

**Snarvei (valgfri, risikabel):** dusjslangen henger fra badekar-kanten. Sving over til hylla og hopp fra tauet. Sparer steg 5, men
bomskudd gir fall i vannet.

## Farer
| Fare | Hva skjer | Hvorfor den er morsom |
|---|---|---|
| **Badekarvann** (overflate 9) | Du blir skylt bort: tilbake til lagringspunkt (−10 poeng) | Gir en synlig «ikke her»-sone ved snarveien |
| **Do-skål** (åpen) | Faller du ned, **trekkes du ned** og kommer opp ved start | Klassisk, folk ler |
| **Glatte fliser** | Lav friksjon: du sklir videre. Dørmatte og håndkle er trygge | Tvinger deg til å bruke de myke flatene |
| **Dryppende kran** | En stor drope faller hvert 3. sekund og dytter deg av | Timing-hinder ved vasken |
| **Såpe** | Liten flate som sklir | Ekstra vanskelig hopp for dem som vil ha det |

Alt av «fall» er gratis i fysikken (ingen skade), men koster tilbakeføring i poeng.

## Hybrid-bevegelse: reglene (forslag)
- **Overflatetyper** i brettdata: `solid` (som nå), `grip` (klatrebar: håndkle, gardin, knotter, kabel), `slick` (flis: sklir), `soft` (mat, håndkle: demper fall), `water` (fare).
- **Klatring:** sikt med kameraet, trykk REKK UT mot en `grip`-flate/kant. Treffer du, henger du der (som kantgrep nå). Hold GRIP for å bli hengende, styr for å sno deg langs. Stamina tømmes mens du henger (ca. 8 s på tøy, kortere på glatt). Tom stamina = du slipper.
- **Hopp:** som «Spenning» nå: tungt, forpliktende, ingen dobbelthopp.
- **Mobil:** fortsatt bare stikke + HOPP + REKK UT. Hvilken hånd som tar tak bestemmes automatisk.

## Poeng og lagring (fra før)
Sjekkpunkt ved håndkleunge (3), do-tank (4) og hylle (6) er gratis. Manuelt lagringspunkt koster 25, tilbakeføring 10.

## Motgiften (testen)
Mål er å se om «biter» virker som progresjon. To varianter å prøve:
- **A (enklest):** ta bit → kapittelet er ferdig. Bit vises som en delvis fylt flaske øverst på skjermen.
- **B (spenning):** ta bit → kranen «sprenger» og vannet stiger langsomt. Du må ned til døra (rømming) før gulvet er under vann. Gir en nedtur å se frem til, i stedet for en kjedelig vei ned.

Anbefaling: bygg A først, prøv B etterpå som en bryter.

## Teknisk plan (rekkefølge)
1. **Grå testboks for badet** med dagens motor (boksene fra tabellen over). Valider med boten.
2. **Overflatetyper + klatring** i `physics.js`: `grip`/`slick`/`soft`, stamina, sidelengs bevegelse langs stang.
3. **Farer:** vann, do-skål, drope. Brettformatet får et `hazards`-felt.
4. **Boten** må forstå klatring for å validere rute 5–7.
5. **Utseende:** flis, porselen, håndkle, speil (kan bli det siste, etter at det er gøy).

## Åpne spørsmål
1. Skal en bit bære med deg (motgiften i flaska) videre til neste rom, eller er hvert rom helt lukket?
2. Hvor mange rom/biter totalt? Stue, lekerom, kjøkken, soverom, … 4–5 virker bra.
3. Rømmingsfasen (variant B): ja eller nei?
4. Skal det finnes valgfrie «bonus»-gjenstander (mynter, klistremerker) på vanskelige steder?
