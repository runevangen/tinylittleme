# R1: Toy Story-lys, før/etter

Bildene ligger i denne mappen: `n<nivå>_v<vinkel>_<av|film>.png` (iPhone 14, 390x664, programvare-GL, `?level=...`). Vinkel 0 = startbildet, 1 = kameraet snudd 2,4 rad (~140 grader), 2 = snudd 1,8 rad til. Nivå 1 = Bad, 2 = Barnerom, 3 = Kjøkken. «av» = Fargegradering Av, «film» = Varm film.

## Rettet etter kritikk (runde 1)
- **Utbrente flater:** fliser (gulv og vegg) har ingen roughnessMap og minst roughness 0,9 i film-modus, så solspeilingen klipper ikke lenger. Sol er bare x1,05 (var x1,25), kantlys 0,5 (var 1,1), fyll 0,6 (var 0,9). Store lyse kasser (kjøleskapet i Kjøkken) dempes til 0,8 i farge og får ikke ekstra miljøspeiling. Vinduet har dempet lysstyrke (ikke ren hvit). Målt andel helt hvite piksler (alle kanaler >= 250) i alle 18 bilder: 0 til 0,4 %, likt med «Av».
- **Palett:** sepia er fjernet fra filteret, fliser er ikke lenger tonet varme (Bad beholder hvit/kjølig porselen), solfargen er 0xffd8a0 (var 0xffae55), hemiGround 0xa88a66 (var 0xd9873f). Lokalfargene (oransje figur, rødt, gult, grønt) bærer metningen.
- **Ytelse:** CSS-filteret (nå bare `saturate(1.18) contrast(1.04)`) er et eget valg i ⚙ (Spill: «Fargefilter på skjermen»). Av betyr ingen filter, men lysene beholdes. Enkel grafikk har aldri filter.

## Målt (utsnitt uten HUD, snitt over 3 vinkler, `av -> film`)
Metning (HSV): Bad 0,120 -> 0,123; Barnerom 0,289 -> 0,352; Kjøkken 0,147 -> 0,171. Hvite piksler: se over. Film-modus er altså ikke mer ensfarget enn «Av»; forskjellen mellom rommene (hvitt bad, trebrunt barnerom, kremfarget kjøkken) bevares.

## Ytelse
FPS i programvare-GL er ikke representativt, så det er ikke målt og brukes ikke som bevis. Ikke målt på ekte iPhone. Det ekstra arbeidet er begrenset:
- Grafikk «Enkel»: ingen ekstra lys, ingen clearcoat, ingen filter.
- Grafikk «Detaljert»: 2 ekstra lys uten skygge, clearcoat bare på plast/porselen/keramikk, og et mildt CSS-filter som kan slås av under ⚙ uten å miste lysene.
- Tregt på en gammel telefon: slå av Fargefilter, deretter Fargegradering «Av», eller Grafikk «Enkel». FPS-visning i ⚙ -> Test gir tall fra ekte telefon.
