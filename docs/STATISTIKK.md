# Anonym statistikk (R88)

Mål: vite hvor spillerne stopper (lanseringsmålet: flertallet fullfører nivå 1–3). Serversiden: Supabase-prosjekt `pthpjpxfbfvgoqkqxotj`, tabell `tlm_events` (bare innsetting for anon, maks 600 hendelser per `cid` per time), oppsummering `tlm_funnel` (bare eieren leser).

## Personvern
- Bare tilfeldig `cid` (16 tegn, laget første gang den trengs, lagret i `localStorage` som `tlm.statscid`, **ikke koblet til tester-kode**), versjon, enhetsklasse (mobil/PC, skjermklasse liten/mellom/stor) og spillhendelser.
- Aldri navn, e-post, tester-kode, posisjon, tekst fra spilleren eller bilder. Meldingen i `js_error` kuttes til 120 tegn, uten nettadresser og stack.
- Kan slås av: ⚙ → «Anonym statistikk» (`tlm.stats`, standard på), eller knappen nederst i PERSONVERN. Av betyr at ingenting settes inn og ingen `cid` lages (kø tømmes).
- Ikke i kinomodus (`?cinema`) eller med `?nostats=1`.
- Supabase kan logge IP-adresser på infrastrukturnivå; spillet sender dem ikke og statistikken lagrer dem ikke. PERSONVERN sier det ærlig.

## Sending
Kø i minnet, tak 100 hendelser. Sendes i én gruppe (REST-array) når siden skjules, ved `pagehide` og hvert 60. sekund, med `fetch` `keepalive` (ellers `sendBeacon`). Feil og manglende nett er stille. `logEv('statistikk', 'sendt n hendelser')` per sending. Kode: `stats_logic.js` (ren), `stats_net.js` (nett), hekter i `main.js` og `build.js`.

## Hendelser
| `name` | `data` | Betyr |
|---|---|---|
| `session_start` | `platform`, `screen`, `diff` | Siden ble åpnet |
| `level_start` | `diff` | Spilleren begynte på et brett (`level` i raden) |
| `level_complete` | `sek`, `poeng`, `merke` | Mål nådd |
| `level_quit` | `sek`, `andel` | Avsluttet til meny eller lukket siden før mål; `andel` 0–1 av luftlinjen start til mål |
| `checkpoint_back` | `back`, `fall`, `broken` | Per brettøkt: ganger tilbake til punkt, fall, knuste ting |
| `build_try` | `sted`, `modus`, `resultat`, `kostnad`, `stjerner`, `deler` | Ett byggeforsøk (PRØV) |
| `fps_room` | `fps`, `res` | Snitt-fps og oppløsning for brettøkta |
| `js_error` | `msg` | Feilmelding (maks 3 per økt) |

## SQL (kjøres av eieren i Supabase)
Funnel per nivå (hvor mange enheter startet / fullførte):
```sql
select level,
  count(distinct cid) filter (where name = 'level_start')    as startet,
  count(distinct cid) filter (where name = 'level_complete') as fullfort
from tlm_events group by level order by startet desc;
```
(`tlm_funnel` gir en ferdig oppsummering.) Hvor slutter folk (siste brett per enhet uten mål):
```sql
select level, count(*) as sluttet, round(avg((data->>'andel')::numeric), 2) as snitt_andel
from tlm_events where name = 'level_quit' group by level order by sluttet desc;
```
Snitt-fps per rom:
```sql
select level, round(avg((data->>'fps')::numeric), 1) as fps, count(*) as n
from tlm_events where name = 'fps_room' group by level order by fps;
```
Byggeforsøk per sted og modus:
```sql
select level, data->>'sted' as sted, data->>'modus' as modus,
  count(*) as forsok, count(*) filter (where data->>'resultat' = 'vant') as vant, round(avg((data->>'stjerner')::numeric), 1) as stjerner
from tlm_events where name = 'build_try' group by 1, 2, 3 order by forsok desc;
```
Feil per versjon:
```sql
select version, data->>'msg' as melding, count(*) as antall
from tlm_events where name = 'js_error' group by 1, 2 order by antall desc;
```
Tilbake til punkt per brett:
```sql
select level, sum((data->>'back')::int) as tilbake, sum((data->>'fall')::int) as fall, sum((data->>'broken')::int) as knust
from tlm_events where name = 'checkpoint_back' group by level order by tilbake desc;
```
