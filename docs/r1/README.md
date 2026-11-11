# R1: Toy Story-lys, før/etter

Bildene ligger i denne mappen: `n<nivå>_v<vinkel>_<av|film>.png` (iPhone 14, 390x664, programvare-GL, `?level=...`). Vinkel 0 = startbildet, 1 = kameraet snudd 2,4 rad (~140 grader), 2 = snudd 1,8 rad til. Nivå 1 = Bad, 2 = Barnerom, 3 = Kjøkken. «av» = Fargegradering Av, «film» = Varm film.

## Rettet etter kritikk (runde 2)
- **Fargeaksenter per rom (bare Varm film):** grå og beige flater får en tydelig farge, så varmt og kjølig står mot hverandre. Bad: kjølig aqua på veggfliser mot varmt sandfarget gulv. Kjøkken: varmt terrakottagulv mot salviegrønne vegger og blågrå skap. Barnerom: lett kjølig vegg og varmere trepanel. Fargene er multiplikatorer (aldri lysere enn flaten), så ingenting brenner ut. Se `TINTS` i `grade.js`. Nivå 4-6 følger grunnrommet. «Av» er uendret.
- **Lys:** som i runde 1 (varm sol, kjølig fyll, kantlys, matte fliser, dempet glans).
- **Bildene er nå committet** (`.gitignore` har unntak for `docs/r1/*.png`).

## Hva bildene viser (og ikke viser)
Alle tall er målt av meg på de 18 bildene (utsnitt uten HUD, rad 60-560 av 664, snitt over de tre vinklene, `av -> film`), men er ikke sammenlignet med noe annet uavhengig mål enn øyet, så de er bare støtte til det du ser:
- Metning (HSV): Bad 0,262 -> 0,314; Barnerom 0,277 -> 0,286; Kjøkken 0,249 -> 0,286.
- Bad: gulvet er tydelig varmt sand og veggfliser kjølig aqua i film; i «Av» er begge grå/hvite. Kjøkken: terrakotta og salvie i film, grå/beige i «Av». Barnerom: forskjellen er liten og ligger mest i varmere gulv og blålig vegg; metningen er nesten lik.
- Utbrente flater: andelen helt hvite piksler (alle kanaler >= 250) er lik i «Av» og film (0,5 til 0,6 %, mest HUD-tekst). Film brenner altså ikke ut mer enn «Av».
- Metning er et grovt mål: fargeskiftet (varmt mot kjølig) står i bildene mer enn i tallene. Bildene er fasit, og vinkel 0 er startbildet.

## Ytelse
FPS i programvare-GL er ikke representativt, så det er ikke målt og brukes ikke som bevis. Ikke målt på ekte iPhone. Det ekstra arbeidet er begrenset:
- Grafikk «Enkel»: ingen ekstra lys, ingen clearcoat, ingen filter.
- Grafikk «Detaljert»: 2 ekstra lys uten skygge, clearcoat bare på plast/porselen/keramikk, og et mildt CSS-filter som kan slås av under ⚙ uten å miste lysene.
- Tregt på en gammel telefon: slå av Fargefilter, deretter Fargegradering «Av», eller Grafikk «Enkel». FPS-visning i ⚙ -> Test gir tall fra ekte telefon.
