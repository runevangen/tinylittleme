# Forhistorie: «Leggetid» (ca. 25 s)

Kort film som kan stå foran traileren eller åpne spillet. Alt filmes i spillmotoren (badet, nivå 1), som i `docs/TRAILER.md`. Valg tatt med Rune: lappen sier **«IKKE ta denne.»**, speilbildet **blunker for sent**, og figuren «snakker» med **tankebobler** (korte tekster over hodet, ingen stemme).

Tonen er hverdagslig og litt leken (Alice i Eventyrland, ikke medisin): tabletten er **feilmerket/magisk**, aldri «giftig».

## Manus

| # | Bilde | Tekst |
|---|---|---|
| 1 | Bad om kvelden, nattlys, tannbørste summer, speilet dugger litt. Figuren i full størrelse foran speilet. | Kort: «Tirsdag. 21.47.» Tanke: «Tenner. Pyjamas. Lys av.» |
| 2 | Figuren åpner speilskapet. Mellom tannkrem og plaster står en liten flaske som ikke hører hjemme. | Lappen på flasken: «IKKE ta denne.» Tanke: «Selvfølgelig ikke.» (liten pause) |
| 3 | Nærbilde: én tablett i hånda, glass med vann. | Tanke: «Bare én.» Lyd: en liten «plopp». |
| 4 | Speilbildet ser på, og blunker for sent. | Tanke: «…Blunket du?» |
| 5 | Krympingen: lyden strekkes, badet vokser. Speilet blir en vegg, vasken et fjell, tannbørsten en stolpe. | Tanke: «Å nei.» Så, i bunn: «Åh.» |
| 6 | Match-cut: gulvnivå, samme kamera som «Du er 3 cm høy.» i traileren. | Trailerkort: «Du er 3 cm høy.» → tittel **tinylittleme** |

## Hva som må filmes (motor)
- Badet i full skala (kamera nær figuren, speil som flate; speilbildet kan være en kopi av figuren speilvendt, med blunk som egen animasjonstilstand).
- Speilskap med flaske og lapp, tablett i hånda (props som enkle meshes).
- Krymping: spilleren skaleres ned mens kameraet går fra speilvinkel til gulvnivå (cinema-API: `setCam`/`followCam`/`setHero`).
- Tankebobler: tekstkort i `build.sh` (som kortene i traileren), eventuelt egen boble-stil.

## Åpne spørsmål
- Skal «Du er 3 cm høy.» beholdes i traileren etter denne filmen, eller kuttes (forhistorien sier det allerede)?
- Skal forhistorien også være en kort, spillbar intro (valg C), eller bare film?
