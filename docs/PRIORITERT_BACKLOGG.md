# Prioritert backlogg før lansering (utkast 4)

Dette er et **utkast til samtale**, ikke en vedtatt plan. Mål: bestemme hva som skal være med i første lansering, og hva som venter. Alt under er foreslått av Claude ut fra veikartet (`docs/ROADMAP.md`), `BACKLOG.md`, testrapportene og det vi har bygd til nå (v2.38). Rune skal utfordre, flytte og stryke.

## 0. Det vi ikke har bestemt (må avklares først)
Prioriteringen avhenger av disse. Jeg har satt en antakelse i parentes.
1. **Hva er «lansering»?** (Antakelse: åpen nettleserversjon på GitHub Pages for en liten gruppe, ikke App Store.)
2. **Hvem er spilleren?** (Antakelse: barn og voksne som liker små, koselige plattform- og byggespill; ikke hardcore.)
3. **Hva er spillet i én setning?** (Forslag: «Du er 3 cm høy i et rom som er bygd for en annen. Hopp, klatre og bygg deg gjennom.»)
4. **Hva må være sant for at du er stolt av lanseringen?** (Antakelse: ingenting er uferdig, første fem minutter er knallbra, og byggingen føles unik.)
5. **Hvor lenge skal første lansering ta?** (Antakelse: noen uker, ikke måneder.)

## 0b. Beslutninger tatt (Rune, 2026-11-18)
- **Lansering = åpen nettleserversjon** (GitHub Pages), ikke app-butikk, og hjemmeskjerm/offline er et kutt-kandidat. Konsekvens: F13 (hjemmeskjerm/offline) flyttes til C.
- **Hovedsak = mix:** bygging og plattform er like viktige. Konsekvens: både F4 (kamera og styring) og F6 (rutenett polert) er A; ingen av dem kan skyves.
- **Brett ved lansering = nivå 1–9 + Byggeskole.** Konsekvens: L4 (nivå 10–11) flyttes til C; L1 og L2 er A. L3 (nytt byggebrett som krever trekanter) blir B.
- **Kutt hvis tiden presser:** engelsk språk og hjemmeskjerm/offline. Konsekvens: F12 flyttes til C (norsk først); F13 flyttes til C.
- Ikke valgt som kutt (altså beholdes): nivå 4–6 og analyse (F14 beholdes som B).

## 0c. Beslutninger runde 2 (Rune, 2026-11-18)
- **Suksess:** 20–50 venner/kjente spiller, og flertallet fullfører nivå 1–3. Konsekvens: for å vite om vi lykkes må vi måle det. **F14 (anonym analyse: nivå, tid, forsøk, hvor man stopper) flyttes fra B til A.**
- **Byggeskolen er valgfri, men anbefalt:** tydelig i menyen og første gang spilleren møter bygging. Ingen sperre. Konsekvens: L2 blir en menyoppføring med anbefaling, ikke en sperre; «Rutenett 🔒»-låsen (`gridstage`) i Bygglab må vurderes: den låser rutenett i Bygglab til forrige sted er bestått. Det er en sperre inne i Byggeskolen, ikke foran den, og kan beholdes som progresjon.
- **Standard vanskelighet = Medium** for nye spillere (i dag er standard Nybegynner). Konsekvens: **ny sak R84** (standardverdi, tester, migrering: de som allerede har valgt beholder sitt valg). **Utfordring til deg:** Medium betyr mindre hjelp. Terskelen under (tre nye spillere gjennom nivå 1 uten hjelp) avgjør om det holder; faller de ut, bytter vi tilbake til Nybegynner for første rom.
- **Kvalitetsterskler før lansering:** (1) **30 fps i alle rom på iPhone 12 eller nyere**; (2) **tre nye spillere kommer gjennom nivå 1 uten hjelp**. Ikke valgt som krav: ingen krasj på to enhetstyper (Android-Chrome) og tom Rettelser-liste. Konsekvens: F3 (ytelse) er A med målbar terskel, F1 (første fem minutter) er A med brukertest. Android blir en kjent risiko, ikke et krav.

## 0d. Beslutninger runde 3 (Rune, 2026-11-18)
- **Medium feiler i nivå 1?** Bytt bare første rom til Nybegynner.
- **Android:** testes på minst én Android-enhet **før** lansering. Ny kravlinje: **F16 Android-test** (A).
- **De tre nye spillerne:** venner eller familie de neste to ukene (brukertest i uke 5, jul passer). Testplan: `docs/BRUKERTEST.md`.
- **Ytelse:** egen sak først (R85), før nye funksjoner.
- **Neste kutt etter engelsk og hjemmeskjerm:** fortelling og forhistorie (L8). Alt annet i kjernen beholdes.
- **Rytme:** ukentlig kort gjennomgang (planlagt oppgave hver mandag 09:11 norsk tid).

## 0e. Plan for de neste seks ukene (forslag, ikke vedtatt)
| Uke | Fokus | Jeg og agentene | Rune |
|---|---|---|---|
| 1 (23.–29. nov) | Sikkerhetsnett og grunnmur | R84 Medium (ferdig, v2.42), F2 automatisk sjekk av `main`, F5 lagring, F8 personvern, F14 analyse, testplan | Teste kamera (R54), NYTT og RETTELSER; finne tre testere |
| 2 (30. nov–6. des) | Ytelse og første inntrykk | R85 ytelse (Verkstedet først), F1 første fem minutter, F7 tydelig mål og vei | Teste fps på iPhone; skaffe en Android-enhet |
| 3 (7.–13. des) | Bygging polert | F6 rutenett, L2 Byggeskole, L3 trekantbrett, F4 kamera og styring | Teste Byggeskole og trekantbrett |
| 4 (14.–20. des) | Lyd, mestring, polering | F9 lyd, F10 belønning, L8 fortelling (første kutt), F11, F15; **frys innhold** | Lytte, se filmen |
| 5 (21.–27. des) | Brukertest | Rette det de finner, Android-test (F16), siste ytelsesmåling | De tre spillerne spiller nivå 1 uten hjelp |
| 6 (28. des–3. jan) | Lansering | Siste kontroll, startside, lanseringsfilm | Godkjenne og lansere |
Risiko: ytelse i Verkstedet (22 fps, krav 30), at brukertesten avhenger av deg, Android er uprøvd, og jul tar tid. Plan B: lansere uke 7.

## 1. Slik rangerer vi
Hvert punkt får **Verdi** (1–5: hvor mye det løfter opplevelsen for en ny spiller), **Innsats** (S dag, M uker, L måneder), **Risiko** (kan det ødelegge noe som virker?), og en **Beslutning**:
- **A · Må før lansering:** uten dette er det ikke ferdig.
- **B · Bør før lansering:** gjør en tydelig forskjell, men lanseringen går uten.
- **C · Etter lansering:** bra, men venter.
- **D · Parkert:** vi gjør det ikke nå (og kanskje aldri).
Tester-saker går fortsatt foran alt (se `CLAUDE.md`).

## 2. Funksjoner

### A · Må før lansering
| # | Punkt | Verdi | Innsats | Risiko | Hvorfor |
|---|---|---|---|---|---|
| F1 | **Første fem minutter:** start → nivå 1 → mål uten forklaring, med synlig progresjon. Veiledning som forsvinner for dem som ikke trenger den (R69). | 5 | M | Lav | Første inntrykk avgjør alt. Vi har aldri testet med en ny spiller som ikke er deg. |
| F2 | **Stabilitet og oppstart:** automatisk sjekk av `main` (tester + oppstart) på hver push; ingen kjente krasj. | 5 | S | Lav | Tomt `version.js` i v2.01 viste hva som skjer uten. |
| F3 | **Ytelse på iPhone:** stabil FPS i alle rom (Verkstedet falt til 22 fps), lavere varme og batteri. | 5 | M | Middels | Dårlig FPS ødelegger plattformfølelsen mer enn noe annet. |
| F4 | **Kamera og styring tester godkjenner:** R54 (roligere kamera) bekreftet på iPhone; spilletest av hopp, kanthjelp og stikke (R27). | 5 | M | Lav | Alle testrapportene snakker om kamera og styring. |
| F5 | **Lagring og fremdrift:** brett, merker, innstillinger og byggekoder overlever oppdatering og nytt vindu; tydelig «fortsett» og «start på nytt». | 4 | S | Middels | Mister spilleren fremdriften, mister vi spilleren. |
| F6 | **Rutenett-bygging ferdig polert:** mål, budsjett og stjerner i alle byggesteder, veiledning, belastningsfarger, delte koder. | 5 | M | Middels | Det er det unike: plattform pluss byggespill med ærlig fysikk. |
| F7 | **Tydelig mål og vei i hvert brett** uten piler for Ekspert (R64/R66 finpusset): spilleren vet alltid hva neste mål er. | 4 | M | Lav | «Finner ikke hvor jeg skal» er en gjenganger. |
| F8 | **Personvern og tester-kode:** hva sendes, hvem ser det, hvordan slettes det; tekst i spillet som sier det ærlig. | 4 | S | Lav | Vi samler rapporter fra ekte folk. |

### B · Bør før lansering
| # | Punkt | Verdi | Innsats | Risiko | Hvorfor |
|---|---|---|---|---|---|
| F9 | **Lyd og musikk som sitter:** ekte foley (skritt, hopp, bygg, brudd) og ambiens i alle rom. | 4 | M | Lav | Lyd er halvparten av «Zelda-kvalitet». |
| F10 | **Belønning og mestring:** merker per brett og nivå (finnes), delmål, «beste bro»-lister (KODE/BESTE), tydelig «hva nå?» etter mål. | 4 | M | Lav | Gir en grunn til å spille igjen. |
| F11 | **Tilgjengelighet:** tekststørrelse, fargesvake-sikre belastningsfarger, redusert bevegelse, venstrehendt oppsett av knapper. | 3 | M | Lav | Bredere publikum og færre klager. |
| F12 | ~~B → C~~ **Engelsk språk og første-gangs språkvalg** (flyttet til C: kutt-kandidat) (finnes delvis i `i18n.js`); alle tekster i begge språk. | 3 | M | Lav | Åpner for flere testere. |
| F13 | ~~B → C~~ **Installerbar på hjemmeskjerm og offline** (flyttet til C: kutt-kandidat) (egen sak: service worker, ikon, splash). | 3 | M | Middels | Føles som en app. Risiko: hurtigbuffer og versjonsjekk må fungere sammen. |
| F14 | ~~B → A~~ **Enkel analyse:** anonyme tall på hvor spillere stopper (nivå, tid, antall forsøk), uten personopplysninger. | 3 | S | Middels | Vi gjetter i dag. |
| F16 | **Android-test før lansering:** test på minst én Android-enhet (Chrome); start, styring, bygging, ytelse. | 4 | S | Middels | Beslutning 2026-11-18 (A). |
| F15 | **Pause/meny som alltid fungerer:** «Avslutt til meny» finnes; sjekk at ingenting henger. | 3 | S | Lav | Små ting som stjeler tilliten. |

### C · Etter lansering
| # | Punkt | Verdi | Innsats | Risiko |
|---|---|---|---|---|
| F16 | **Live-vekt (R49b):** broer gir etter når du og maur går på dem. | 4 | L | Høy |
| F17 | **Dynamiske deler (R51):** fjær, trinse, stempel, vindebro. | 4 | L | Høy |
| F18 | **Fri bygging (R52):** verksted med ubegrensede deler, lagring og egne utfordringer. | 4 | L | Middels |
| F19 | **Daglig utfordring** (ett byggested med fast last, samme for alle, global liste). | 3 | M | Middels |
| F20 | **Foto → brett:** egne rom fra bilder (`docs/FOTO_TIL_BRETT.md`). | 4 | L | Høy |
| F21 | **Flere figurer og tilbehør å samle.** | 2 | M | Lav |
| F22 | **Kombineringsmotor utvidet** (egenskapstabell, flere regler). | 3 | L | Middels |

### D · Parkert
- Flerspiller. Portering til Unity/Godot. Egen app-butikk-pakke (inntil «lansering» er avklart).

## 3. Brett og innhold
Dagens innhold: 9 nivåer (3 rom + 3 ommøblerte + lekerom + stue + verksted), 4 byggebrett (bro, trapp, vippe, kjøkkenbro), 1 prøverom Bygglab med 8 rutenett-steder, 1 håndlaget soverom, prøverom for gåter, flytting og klatring.

### Forslag til lanseringsinnhold
| # | Punkt | Beslutning | Kommentar |
|---|---|---|---|
| L1 | **Nivå 1–9 ferdig polert** (ytelse, lesbarhet, lyd, ruter bevist) | A | Det er kjernen. |
| L2 | **Bygglab som tydelig «Byggeskole»** i hovedmenyen: 8 steder som lærer fagverk, materialer og last, med stjerner | A | Gjør rutenett-bygging forståelig før spilleren møter det i et brett. |
| L3 | **Rutenett som valg i bro-brettene** (R82, ferdig) + **minst ett nytt byggebrett som bare lar seg løse med trekanter** (f.eks. «Broen over badekaret» eller «Kjøkkenbenken») | B | Viser at ny teknikk gir nytt spill, ikke bare en annen knapp. |
| L4 | ~~B → C~~ **Nivå 10 (Soverom som ekte nivå) og Nivå 11 (Loft eller garasje)** (flyttet til C: lanseringen er nivå 1–9): to nye rom som bruker alt spilleren har lært, med sjefmaur til slutt | C | Gir et fullt eventyr på ca. 11 brett. |
| L5 | **Prøveromene (gåter, flytte ting, klatring) som «Treningsrom»** i en egen meny, ikke blandet med nivåene | B | Rydder i hovedmenyen. |
| L6 | **Mer variasjon i fiender og farer:** edderkopp, støvsuger, vann, varme plater | C | Etter første lansering. |
| L7 | **Brett fra testerne:** la testere sende inn byggekoder og brettidéer (kode finnes) | C | Fellesskapsinnhold. |
| L8 | **Fortelling:** forhistorien «Leggetid» som åpning, slutt-scene etter nivå 9 | B | Gir mening og stemning. Filmen finnes. |

### Brett vi kan kutte
- «Ekstra: Soverom (håndlaget)» hvis det ikke blir nivå 10. Nivå 4–6 hvis spillere synes de er for like 1–3 (må testes).

## 4. Sammenheng og rekkefølge (forslag, justert etter beslutningene)
1. **Uke 1:** F2 (sikkerhetsnett), F5 (lagring), F8 (personvern), F4 (kamera godkjent), R84 (standard Medium), F14 (analyse).
2. **Uke 2:** F3 (ytelse), F1 (første fem minutter) og testing med 3–5 nye spillere.
3. **Uke 3–4:** F6 (rutenett polert), L2 (Byggeskole), L3 (nytt byggebrett).
4. **Uke 4–5:** F9 (lyd), F7 (mål og vei), F10 (belønning), L8 (fortelling).
5. **Uke 5:** F11 (tilgjengelighet), F14 (analyse), F15 (meny), og en ny runde med nye spillere.
6. **Lansering ca. uke 6:** åpen nettleserversjon, nivå 1–9 + Byggeskole. Resten (C) etter hvert: engelsk, hjemmeskjerm, nivå 10–11.

## 5. Hva jeg utfordrer deg på
Se spørsmålene i samtalen. De viktigste: hva «lansering» betyr, om bygging eller plattform er hovedsaken, hvor mange brett som er nok, og hva vi tør å kutte.

## 6. Endringslogg for denne lista
- Utkast 1 (v2.39): skrevet av Claude. Ikke vurdert av Rune ennå.
- Utkast 2 (v2.40): Rune svarte på fire utfordringer (se 0b); F12, F13 og L4 flyttet til C.
- Utkast 3 (v2.41): fire nye utfordringer besvart (se 0c); F14 flyttet til A; R84 (standard Medium) lagt i veikartet.
- Utkast 4 (v2.43): runde 3 besvart (0d), seksukersplan (0e), F16 Android-test lagt til, R85 ytelse og testplan lagt inn.
