# Brukertest: tre nye spillere gjennom nivå 1 (utkast)

Kravet fra Rune: **tre nye spillere kommer gjennom nivå 1 uten hjelp** før lansering. Dette er en enkel plan; Rune justerer.

## Før testen
- Velg tre personer som **ikke** har spilt (venner eller familie, gjerne en yngre og en som sjelden spiller).
- Bruk en iPhone med nyeste versjon (HUD viser versjonen). Ikke hjelp, ikke forklar, ikke pek.
- Be dem tenke høyt. Du sier bare: «Spill til du kommer i mål. Si fra hvis du står fast.»
- Rapport: be dem trykke ⚑ etter testen, eller send rapporten selv fra ⚑ → «Send til Claude» (tester-kode).

## Mens de spiller (en rad per spiller)
| Spørsmål | Spiller 1 | Spiller 2 | Spiller 3 |
|---|---|---|---|
| Kom i mål uten hjelp? (ja/nei) | | | |
| Tid til mål (min:sek) | | | |
| Hvor stoppet de første gang? (sted/tid) | | | |
| Hva trodde de var målet? | | | |
| Brukte de HOPP, GREP, TA riktig uten å spørre? | | | |
| Ble de desorientert av kameraet? (ja/nei, når) | | | |
| Hva sa de som ikke stemte med det vi mente? | | | |
| Hva likte de best? | | | |

## Etter testen (2 minutter)
1. «Hva var spillet om?» (med deres egne ord)
2. «Hva ville du gjort etterpå?»
3. «Er det noe du savnet eller ble irritert på?»

## Beslutning
- **3 av 3 uten hjelp:** nivå 1 er godkjent.
- **2 av 3:** rett det de stoppet på, test på nytt med to nye.
- **0–1 av 3:** bytt første rom til Nybegynner (beslutning 2026-11-18) og test på nytt.

## Hva jeg gjør med resultatet
Resultatene legges i `docs/BRUKERTEST.md` (egen seksjon under) og i veikartet som saker «Fra tester: <navn>».

## Maskintest første fem minutter (R97)
Verktøy: `NODE_PATH=$(npm root -g) node tools/first_run.cjs [utmappe] [--mode=normal|tafatt|begge] [--diff=medium]`. Ekte nettleser (Playwright, iPhone 14, tom lagring); boten trykker START og fortellerkortet med berøring, trykker HOPP/GREP/TA med ekte berøringshendelser og setter stikka etter ruta veiledningen (R64) viser. Ingen teleportering. Spillklokka kjøres for hånd (uten GPU går bildet i ca. 1 fps), så tidene er **spilletid**; ekte følelse og FPS er ikke målt her og **testes på iPhone**. Rapport og skjermbilder havner i utmappa (`rapport.json`).

Kjøring (v2.72 + R97, Medium, tom lagring):
| Mål | Resultat |
|---|---|
| Knapper synlige på menyen første gang | 2: START og «mer ▾» (resten under «mer») |
| Første bevegelse / første GREP / første hopp | 1,9 s / 1,7 s / 11,5 s |
| Delmål 1 («Klatre opp på kurven») / delmål 2 («Nå knaggrekka») | 12,2 s / 26,2 s |
| Mål nådd (Nivå 1 klart, 3 stjerner, NESTE NIVÅ, TILBAKE TIL MENY) | **40,3 s** spilletid (kravet: under 300 s) |
| Hint vist (kontroll-animasjon) | 1 (HOPP, borte da HOPP ble brukt) |
| Hjelp utløst av blindgate | 1 (feil-vei-vurdering på siste delmål, se under) |
| Ganger stille over 8 s | 0 |
| Konsollfeil | 0 |

Tafatt spiller (står stille 20 s, trykker TA på feil sted tre ganger, går feil vei):
| Hendelse | Resultat |
|---|---|
| Stille: hjelp (R64: lysglød på neste flate, «Vis meg», tips «Prøv: …») | etter 10,3 s (grense 12 s) |
| TA på feil sted ×3 | hjelp ved tredje trykk |
| Går feil vei | hjelp etter 1,1 s i testens feil retning |
| Hint før hjelpen | stikke-hintet («Dra stikka for å gå») fra 2,1 s |

Merknader: (1) botens «reaksjonstid» er 1,5 s; ekte nye spillere bruker lenger tid, spesielt på fortellerkortet (spilletiden står stille der). (2) Feil-vei-regelen ga ett falskt utslag på det siste delmålet (smuler, målet ligger lavere enn ruta går); vurder å dempe den når målet er under spilleren. (3) Verktøyet kjøres bare på Badet; Ekspert er sjekket manuelt (ingen hint, prikker uten tall).
