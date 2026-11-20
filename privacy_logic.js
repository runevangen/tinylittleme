// R87: personvern. Ren logikk (ingen DOM) som testes i node. Teksten ligger i i18n.js (priv.*, nb og en); her ligger rekkefølgen,
// lista over hva rapporten får inneholde, og enhetsstrengen uten identifiserende detaljer. Se docs/TILBAKEMELDING.md.
export const PRIV_SECTIONS = ['saved', 'sent', 'stats', 'contains', 'not', 'who', 'delete'];   // priv.<id>.h (overskrift) og priv.<id> (tekst)
export const NOTE_KEY = 'tlm.privnote';   // satt når spilleren har sendt én gang (linja «Sendes til utvikleren» vises ikke mer)

// Feltene buildReportInfo() i main.js får lage (og som teksten «hva det inneholder» dekker). Legges det til et felt, må det stå her OG i teksten.
export const ALLOWED_REPORT_FIELDS = [
  'version', 'level', 'difficulty', 'when', 'device', 'verCheck', 'where', 'screen', 'touch', 'platform', 'preset', 'clock', 'points', 'perf', 'fps',
  'pos', 'state', 'target', 'stats', 'changed', 'marks', 'backlog', 'events', 'ratings', 'camera', 'metrics', 'buildCode',
];
// Det rapporten og nettkallene ALDRI skal ha: navn, e-post, posisjon på kloden, bilder, full nettleserstreng.
export const FORBIDDEN_RE = /(e-?post|email|mail|telefon|phone|geoloc|latitude|longitude|\bgps\b|fullt navn|password|passord|screenshot|image|userAgent|Mozilla\/)/i;

export const unknownFields = (info) => Object.keys(info || {}).filter((k) => !ALLOWED_REPORT_FIELDS.includes(k));

// Enhetstype og OS-versjon, ikke full nettleserstreng (modellnavn, build-numre og lignende kuttes). Eks.: «iPhone · iOS 17.4 · Safari».
export function shortDevice(ua) {
  const s = String(ua ?? '');
  let os = '';
  let m;
  if (/iPhone|iPod/.test(s)) { m = s.match(/OS (\d+)[_.](\d+)/); os = `iPhone · iOS ${m ? `${m[1]}.${m[2]}` : '?'}`; }
  else if (/iPad/.test(s)) { m = s.match(/OS (\d+)[_.](\d+)/); os = `iPad · iPadOS ${m ? `${m[1]}.${m[2]}` : '?'}`; }
  else if (/Android/.test(s)) { m = s.match(/Android (\d+(?:\.\d+)?)/); os = `Android ${m ? m[1] : '?'}`; }
  else if (/Windows/.test(s)) os = 'Windows';
  else if (/Mac OS X|Macintosh/.test(s)) os = 'Mac';
  else if (/CrOS/.test(s)) os = 'ChromeOS';
  else if (/Linux/.test(s)) os = 'Linux';
  else os = 'ukjent enhet';
  const br = /Edg\//.test(s) ? 'Edge' : /Firefox\/|FxiOS/.test(s) ? 'Firefox' : /OPR\//.test(s) ? 'Opera' : /Chrome\/|CriOS/.test(s) ? 'Chrome' : /Safari\//.test(s) ? 'Safari' : '';
  return br ? `${os} · ${br}` : os;
}

export const noteWanted = (store, on = true) => !!on && !store.get(NOTE_KEY, false);
