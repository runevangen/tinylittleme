# Plan: bygging tidlig og nødvendig (godkjent av Rune)

Mål: bygging kommer fra **Nivå 2: Barnerommet** (i dag først i Nivå 7) og er **nødvendig** i løypa (Nivå 2–6 har hvert ett bygg som må til for å nå målet). Delene ligger klare fra start (R120). Ett nytt byggepoeng om gangen. Nivå 1 (Badet) er rolig plattform uten bygging. Dagens byggebrett, Byggeskolen og 3D-LAB er uendret.

| Nivå | Nytt byggepoeng | Byggested (forslag, må bevises løsbart) |
|---|---|---|
| 1 Badet | ingen | — |
| 2 Barnerommet | Bro: en planke over et gap | gapet ved lekebøtta gjøres litt for langt til å hoppe; én planke fra start |
| 3 Kjøkkenet | Trapp/rampe | det høye trinnet mellom benk og overskap bygges med klosser eller en rampe |
| 4 Badet, ommøblert | Vippe | vannet stiger: bygg en vippe over vannet til hylla |
| 5 Barnerommet, ommøblert | Fagverk | bred bro over lekebøtta bærer bare med trekanter (R122 fagverk-hjelp) |
| 6 Kjøkkenet, ryddet om | Materialer (tau/kabel/stål) | bro mellom overskapene med et tyngre byggesett (R127, R128) |
| 7–9 | Kombinasjon | dagens byggesteder blir nødvendige; «den harde veien» beholdes som alternativ i Ekspert |

Arbeidspakker: **R138** Nivå 2 · **R139** Nivå 3 og 4 · **R140** Nivå 5 og 6 · **R141** Nivå 7–9 · **R142** sikkerhetsnett og belønning. Testrunde hos Rune etter R138 og etter R140 (ikke start neste pakke før Rune har svart).

Felles regler:
- Valg `buildrequired` (⚙ → Admin, standard på): av gir dagens oppførsel (bygging som snarvei, «den harde veien» åpen).
- Hvert bygg bevises løsbart med bot og `tools/walk_route.mjs` før det legges ut (minst to kjente løsninger; enkleste feil bygg feiler). Nivåene sjekkes av `npm test`; nivå 4–6 lages av grunnscenene med `tools/make_variants.mjs`, så endringer gjøres i grunnscenene eller i variantgeneratoren.
- Gamle lagringer: nivåer som er klart forblir klart; står spilleren midt i et endret nivå, settes figuren trygt ved byggestedet.
- Delt kode (R101: `grid_*`, `buildux_*`, `build.js`), ikke enkelt-brett; `test_paritet.mjs` grønn.
- Første gang: kortet «Ny til bygging?» (R95) og FRA/TIL, spøkelsesbro og oppdragskort (R118, R132) brukes aktivt; all tekst nevner knappene (ikke taster).
- Måling: «bygg prøv …»-hendelsene logger forsøk per bygg; legg til `logEv('bygg', 'påkrevd bygg: bestått etter N forsøk')`.
