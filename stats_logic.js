// R88: anonym statistikk. Ren logikk (ingen DOM, ingen nett) så den kan testes i node: hvilke hendelser og felt som er tillatt, bygging og
// avkorting av rader, kø med tak, og «av»-tilstand (ingenting lages, ingen enhets-id). Sendingen ligger i stats_net.js. Se docs/STATISTIKK.md.
// Personvern: bare tilfeldig cid, versjon, enhetsklasse og spillhendelser. Aldri navn, e-post, tester-kode, posisjon, tekst fra spilleren eller bilder.
export const STATS = { table: 'tlm_events', maxQueue: 100, flushMs: 60000, cidKey: 'tlm.statscid', onKey: 'tlm.stats', maxBytes: 600, maxErrors: 3, msgMax: 120, nameMax: 40, levelMax: 40, versionMax: 20 };

// Tillatte hendelser og felt. 'n' = tall, 's:<maks tegn>' = kort tekst fra en fast liste eller kort verdi. Alt annet kuttes bort.
export const EVENTS = {
  session_start: { platform: 's:8', screen: 's:8', diff: 's:12' },
  level_start: { diff: 's:12' },
  level_complete: { sek: 'n', poeng: 'n', merke: 's:12' },
  level_quit: { sek: 'n', andel: 'n' },
  checkpoint_back: { back: 'n', fall: 'n', broken: 'n' },
  build_try: { sted: 's:30', modus: 's:10', resultat: 's:8', kostnad: 'n', stjerner: 'n', deler: 'n' },
  fps_room: { fps: 'n', res: 'n' },
  js_error: { msg: 's:120' },
};
export const EVENT_NAMES = Object.keys(EVENTS);
// Alle datafelt som kan sendes (teksten i PERSONVERN og docs/STATISTIKK.md skal dekke dem)
export const ALLOWED_DATA_FIELDS = [...new Set(Object.values(EVENTS).flatMap((o) => Object.keys(o)))];
export const CID_RE = /^[a-z0-9]{8,32}$/;

export const screenClass = (w, h) => { const s = Math.min(+w || 0, +h || 0); return s < 500 ? 'liten' : s < 900 ? 'mellom' : 'stor'; };
export const deviceClass = (kind) => (kind === 'mobil' ? 'mobil' : 'PC');

// Ren tekst uten kontrolltegn, nettadresser og linjeskift, avkortet
export const cleanText = (v, max) => String(v ?? '').replace(/https?:\/\/\S+/gi, '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const cleanNum = (v) => { const x = +v; return Number.isFinite(x) ? Math.round(x * 100) / 100 : 0; };

export function cleanData(name, data) {
  const spec = EVENTS[name]; const out = {};
  if (!spec) return out;
  for (const [k, t] of Object.entries(spec)) {
    if (!data || !(k in data)) continue;
    out[k] = t === 'n' ? cleanNum(data[k]) : cleanText(data[k], +t.slice(2));
  }
  return out;
}

// Bygger raden (eller null hvis hendelsen ikke er tillatt). data blir tom hvis den likevel ble for stor.
export function buildRow({ cid, version, name, level, data }) {
  if (!EVENTS[name] || !CID_RE.test(cid || '')) return null;
  let d = cleanData(name, data);
  if (new TextEncoder().encode(JSON.stringify(d)).length > STATS.maxBytes) d = {};
  return { cid, version: cleanText(version, STATS.versionMax), name: name.slice(0, STATS.nameMax), level: cleanText(level, STATS.levelMax), data: d };
}

export function makeCid(rand = Math.random) { let s = ''; while (s.length < 16) s += Math.floor(rand() * 36).toString(36); return s; }

// store: { get(k, d), set(k, v) }. Lager cid første gang den trengs (aldri når statistikken er av: kalleren spør bare når den er på).
export function ensureCid(store, rand) {
  const cur = store.get(STATS.cidKey, null);
  if (typeof cur === 'string' && CID_RE.test(cur)) return cur;
  const c = makeCid(rand); store.set(STATS.cidKey, c); return c;
}

// Kjerne: kø i minnet. opts: { store, on(), blocked(), version(), rand }. Når on() er usann eller blocked() er sann, skjer ingenting.
export function createStats({ store, on = () => true, blocked = () => false, version = () => '', rand = Math.random, max = STATS.maxQueue } = {}) {
  let queue = [], errs = 0, cid = null;
  const active = () => !!on() && !blocked();
  function track(name, level, data) {
    if (!active() || !EVENTS[name]) return false;
    if (name === 'js_error') { if (errs >= STATS.maxErrors) return false; errs++; }
    cid = cid || ensureCid(store, rand);
    const row = buildRow({ cid, version: version(), name, level, data });
    if (!row) return false;
    queue.push(row); while (queue.length > max) queue.shift();
    return true;
  }
  const drain = () => { const q = queue; queue = []; return q; };
  const restore = (rows) => { queue = [...rows, ...queue].slice(-max); };   // mislykket sending: legg tilbake foran (køen kuttes ved taket)
  const clear = () => { queue = []; };
  return { track, drain, restore, clear, size: () => queue.length, active, get errors() { return errs; } };
}

// Aggregater per brettøkt: tilbake-til-punkt, fall, knust. Brukes slik at det sendes ett sammendrag per økt, ikke én hendelse per gang.
export function createRoomAgg() {
  const a = { back: 0, fall: 0 };
  return {
    back(why) { a.back++; if (/^fall|^falt/.test(String(why))) a.fall++; },
    take(broken = 0) { const r = { back: a.back, fall: a.fall, broken: Math.max(0, broken | 0) }; a.back = 0; a.fall = 0; return r; },
    peek: () => ({ ...a }),
  };
}
export const hasBackData = (r) => !!(r && (r.back || r.fall || r.broken));
// Andel av ruten (0–1): hvor langt figuren er mot målet i luftlinje. Ingen posisjon sendes, bare tallet.
export const routeShare = (start, goal, p) => {
  const d0 = Math.hypot(goal[0] - start[0], goal[2] - start[2]) || 1, d = Math.hypot(goal[0] - p[0], goal[2] - p[2]);
  return Math.round(Math.max(0, Math.min(1, 1 - d / d0)) * 100) / 100;
};
// Snitt-fps og oppløsning for et vindu av målinger (n bilder, sum millisekunder)
export const fpsOf = (n, sumMs) => (n > 30 && sumMs > 0 ? Math.round(1000 * n / sumMs) : 0);
// Skal vi sende nå? Ikke i kinomodus og ikke med ?nostats=1 (testing/bot).
export const sendBlocked = ({ cinema = false, search = '' } = {}) => !!cinema || /(^|[?&])(cinema=(?!0)|nostats=1)/.test(String(search));
