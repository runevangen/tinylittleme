// R86: lagring og fremdrift. Ren logikk (ingen DOM/three, testes i node: test_storage.mjs). Oversikt over alle nøkler: docs/LAGRING.md.
// Tre ting: (1) en trygg lagring (createStore) som aldri kaster og aldri sletter andre nøkler ved feil, (2) versjonering og migrering av fremgangen
// (normProgress m.fl.: leser de to forrige formene), (3) eksport/import av fremgang som tekstkode og beskrivelse av hva som slettes.
export const STORE_VERSION = 3;      // versjon på lagringsformatet som helhet (tlm.storev). Øk når en struktur endrer form, og legg til migrering under.
export const PROGRESS_VERSION = 3;   // fremgangsobjektet (tlm.progress.*): v0 {save,auto,stats,clock,fails}, v1 + crumbs/puzzles/goals/goalFlags/build, v2 + gates/dmin, v3 = v2 + v-felt
export const SAVE_TAG = 'TLMSAVE1';  // starten på eksportkoden
const MAX_IMPORT = 2_000_000;       // tegn; større tekst avvises

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const vec3 = (v) => (Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === 'number' && Number.isFinite(x)) ? v : null);

// ---------- trygg lagring ----------
// backend: noe som ligner localStorage (getItem, setItem, removeItem, key(i), length), eller en funksjon som gir det (kan kaste: privat modus).
// Leser: ugyldig JSON eller feil type gir standardverdien (nøkkelen noteres som «korrupt», men slettes ikke). Skriver: feil (kvote full, privat modus) telles, kaster aldri.
export function createStore(backend, { onFail } = {}) {
  const st = { available: true, failures: 0, lastError: '', corrupt: new Set() };
  const be = () => { try { const b = typeof backend === 'function' ? backend() : backend; if (b && typeof b.getItem === 'function') return b; } catch { /* privat modus */ } st.available = false; return null; };
  const kindOk = (v, d) => (Array.isArray(d) ? Array.isArray(v) : isObj(d) ? isObj(v) : true);   // bare objekter og lister sjekkes: de er det koden kaller metoder på
  const api = {
    get(k, d) {
      const b = be(); if (!b) return d;
      let raw = null; try { raw = b.getItem(k); } catch { st.available = false; return d; }
      if (raw === null || raw === undefined) return d;
      let v; try { v = JSON.parse(raw); } catch { st.corrupt.add(k); return d; }
      if (!kindOk(v, d)) { st.corrupt.add(k); return d; }
      return v;
    },
    set(k, v) {
      const b = be(); if (!b) return false;
      try { b.setItem(k, JSON.stringify(v)); st.corrupt.delete(k); return true; } catch (e) { st.failures++; st.lastError = String(e?.name || e || 'feil').slice(0, 60); try { onFail?.(k, st.lastError); } catch { /* aldri feil */ } return false; }
    },
    remove(k) { const b = be(); if (!b) return false; try { b.removeItem(k); return true; } catch { return false; } },
    keys(prefix = '') { const b = be(); if (!b) return []; const out = []; try { for (let i = 0; i < b.length; i++) { const k = b.key(i); if (typeof k === 'string' && k.startsWith(prefix)) out.push(k); } } catch { /* tom */ } return out; },
    status: () => ({ available: st.available, failures: st.failures, lastError: st.lastError, corrupt: [...st.corrupt] }),
    // Skrivetest: gir false hvis lagring ikke virker (privat modus, kvote), uten å etterlate noe.
    probe() { const b = be(); if (!b) return false; try { b.setItem('tlm.probe', '1'); b.removeItem('tlm.probe'); return true; } catch { st.available = false; return false; } },
  };
  return api;
}

// ---------- migrering ----------
// Fremgang per brett. Gir alltid et rent v3-objekt, eller null hvis det ikke ligner fremgang. Ukjente felt kastes (de kom aldri fra spillet).
export function normProgress(p) {
  if (!isObj(p)) return null;
  const o = { v: PROGRESS_VERSION };
  const save = vec3(p.save), auto = vec3(p.auto);
  if (!save) return null;            // uten sikkert sted er det ingenting å fortsette fra
  o.save = save; o.auto = auto;
  o.stats = isObj(p.stats) ? p.stats : {};
  o.clock = Math.max(0, num(p.clock));
  o.fails = Array.isArray(p.fails) ? p.fails.filter((f) => Array.isArray(f) && typeof f[0] === 'string' && Number.isFinite(f[1])).map((f) => [f[0], f[1]]) : [];
  // v1: smuler, gåter, delmål, bygg
  o.crumbs = Array.isArray(p.crumbs) ? p.crumbs : [];
  o.puzzles = Array.isArray(p.puzzles) ? p.puzzles : [];
  o.goals = Array.isArray(p.goals) ? p.goals : [];
  o.goalFlags = Array.isArray(p.goalFlags) ? p.goalFlags : [];
  if (p.build !== undefined && p.build !== null) o.build = p.build;
  // v2: porter og laveste vanskelighet brukt i løpet
  if (p.gates !== undefined && p.gates !== null) o.gates = p.gates;
  if (Number.isInteger(p.dmin) && p.dmin >= 0 && p.dmin <= 2) o.dmin = p.dmin;
  return o;
}
export const progressForm = (p) => (!isObj(p) ? -1 : Number.isInteger(p.v) ? p.v : ('gates' in p || 'dmin' in p) ? 2 : ('crumbs' in p || 'puzzles' in p || 'goals' in p || 'build' in p) ? 1 : 0);

// tlm.cleared: { brett: poeng }. Eldre form: liste med brett-id-er eller true per brett.
export function normCleared(c) {
  if (Array.isArray(c)) return Object.fromEntries(c.filter((id) => typeof id === 'string').map((id) => [id, 1]));
  if (!isObj(c)) return {};
  const o = {}; for (const [k, v] of Object.entries(c)) { const n = v === true ? 1 : num(v, -1); if (n >= 0) o[k] = n; } return o;
}
// tlm.runs: { brett: { t, ants, crumbs, total } }. Eldre form: bare tiden som tall.
export function normRuns(r) {
  if (!isObj(r)) return {};
  const o = {}; for (const [k, v] of Object.entries(r)) { if (typeof v === 'number' && Number.isFinite(v)) o[k] = { t: v, ants: 0, crumbs: 0, total: 0 }; else if (isObj(v)) o[k] = { t: num(v.t), ants: num(v.ants), crumbs: num(v.crumbs), total: num(v.total) }; }
  return o;
}
// tlm.badges: { brett: { beginner:1, medium:1, expert:1 } }. Eldre form: bare brett-id i en liste (da bare bronse).
export function normBadges(b) {
  const ok = ['beginner', 'medium', 'expert'];
  if (Array.isArray(b)) return Object.fromEntries(b.filter((id) => typeof id === 'string').map((id) => [id, { beginner: 1 }]));
  if (!isObj(b)) return {};
  const o = {}; for (const [k, v] of Object.entries(b)) { if (isObj(v)) { const m = {}; for (const d of ok) if (v[d]) m[d] = 1; if (Object.keys(m).length) o[k] = m; } else if (v) o[k] = { beginner: 1 }; } return o;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Kjøres én gang ved oppstart: leser hver fremgangsstruktur, bringer den til nyeste form og skriver bare tilbake det som endret seg. Sletter aldri noe.
// Returnerer { migrated: [nøkler], skipped: [nøkler som ikke lignet fremgang og ble latt stå] }.
export function migrateAll(st, disk) {
  const migrated = [], skipped = [];
  for (const k of disk.keys('tlm.progress.')) {
    const raw = st.get(k, null); if (raw === null) continue;
    const n = normProgress(raw); if (!n) { skipped.push(k); continue; }
    if (!same(raw, n)) { st.set(k, n); migrated.push(k); }
  }
  for (const [k, fn, empty] of [['tlm.cleared', normCleared, {}], ['tlm.runs', normRuns, {}], ['tlm.badges', normBadges, {}]]) {
    const raw = st.get(k, undefined); if (raw === undefined || raw === null) continue;
    const n = fn(raw); if (!same(raw, n)) { st.set(k, n); migrated.push(k); }
  }
  if (st.get('tlm.storev', 0) !== STORE_VERSION) st.set('tlm.storev', STORE_VERSION);
  return { migrated, skipped };
}

// ---------- hva som hører til hva ----------
const FREMGANG_PREFIX = ['tlm.progress.', 'tlm.storySeen.', 'tlm.cardseen.'];
const FREMGANG_KEYS = ['tlm.cleared', 'tlm.runs', 'tlm.badges', 'tlm.best', 'tlm.level', 'tlm.difficulty', 'tlm.done', 'tlm.gstage', 'tlm.bstars', 'tlm.bbonus', 'tlm.unlocks', 'tlm.equip'];
const NEWGAME_PREFIX = ['tlm.progress.', 'tlm.storySeen.', 'tlm.cardseen.'];
const NEWGAME_KEYS = ['tlm.runs'];   // som før R86: «Nytt spill» beholder klarte brett (tlm.cleared), merker og tilbehør
const TESTER_KEYS = ['tlm.tcode', 'tlm.changechecks', 'tlm.replies'];
const hasPre = (k, list) => list.some((p) => k.startsWith(p));
export const isProgressKey = (k) => typeof k === 'string' && (hasPre(k, FREMGANG_PREFIX) || FREMGANG_KEYS.includes(k));
export const isTesterKey = (k) => TESTER_KEYS.includes(k);
export const isNewGameKey = (k) => hasPre(k, NEWGAME_PREFIX) || NEWGAME_KEYS.includes(k);
export const isExportKey = (k) => isProgressKey(k) || k === 'tlm.tcode';
export const isSettingKey = (k) => typeof k === 'string' && k.startsWith('tlm.') && !isProgressKey(k) && !isTesterKey(k) && k !== 'tlm.storev' && k !== 'tlm.probe';

// Hva «Nytt spill» og «Nullstill alt» sletter og beholder (for bekreftelsen, før noe slettes). disk.keys('tlm.') gir nøklene.
// Teller bare fremgang der noe er spilt (over 4 s): en tom autolagring fra et nytt brett er ikke «fremgang» for spilleren.
const playedKey = (st, k) => (normProgress(st.get(k, null))?.clock ?? 0) > 4;
export function wipePlan(kind, keys, st) {
  const all = keys.filter((k) => k.startsWith('tlm.'));
  const del = kind === 'all' ? all.filter((k) => !isTesterKey(k) && k !== 'tlm.storev') : all.filter(isNewGameKey);
  const boards = del.filter((k) => k.startsWith('tlm.progress.') && (!st || playedKey(st, k))).length;
  const cleared = Object.keys(normCleared(st?.get('tlm.cleared', {}))).length, runs = Object.keys(normRuns(st?.get('tlm.runs', {}))).length;
  const badges = Object.values(normBadges(st?.get('tlm.badges', {}))).reduce((a, b) => a + Object.keys(b).length, 0);
  const keepBadges = kind !== 'all' && badges > 0;
  const settings = del.filter(isSettingKey).length;
  return { del, boards, cleared, runs, badges, settings, keepBadges, keepTester: all.some(isTesterKey), empty: kind === 'all' ? del.length === 0 : boards === 0 && runs === 0 };
}
export function wipe(kind, disk) { const plan = wipePlan(kind, disk.keys('tlm.'), null); let n = 0; for (const k of plan.del) if (disk.remove(k)) n++; return n; }

// ---------- tidsvisning og «Fortsett» ----------
export function fmtClock(s) { s = Math.max(0, Math.round(num(s))); const m = Math.floor(s / 60), r = s % 60; return `${m}:${String(r).padStart(2, '0')}`; }
// Teksten under «Fortsett»: sist spilte brett, vanskelighet og tid. clock = tid på brettet (sekunder).
export const resumeLine = ({ label, diff, clock }) => [label, diff, clock > 4 ? fmtClock(clock) : ''].filter(Boolean).join(' · ');

// ---------- eksport og import ----------
function b64enc(s) { const bytes = new TextEncoder().encode(s); let bin = ''; for (const b of bytes) bin += String.fromCharCode(b); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_'); }
function b64dec(t) { const bin = atob(t.replace(/-/g, '+').replace(/_/g, '/')); const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0)); return new TextDecoder().decode(bytes); }
// Samler fremgangen (og tester-koden) til én tekstkode. disk.keys + st.get.
export function exportProgress(st, disk, { version = '', now = Date.now() } = {}) {
  const d = {}; for (const k of disk.keys('tlm.')) if (isExportKey(k)) { const v = st.get(k, undefined); if (v !== undefined && v !== null) d[k] = v; }
  return `${SAVE_TAG}.${b64enc(JSON.stringify({ f: 1, v: String(version), at: now, d }))}`;
}
// Leser en kode (tåler tekst rundt). Gir { error } eller { data: { nøkkel: verdi }, skipped: [nøkler], boards, version }.
export function parseProgress(text) {
  if (typeof text !== 'string' || !text) return { error: 'empty' };
  if (text.length > MAX_IMPORT) return { error: 'big' };
  const m = text.match(new RegExp(`${SAVE_TAG}\\.([A-Za-z0-9_\\-=]+)`));
  if (!m) return { error: 'nocode' };
  let o; try { o = JSON.parse(b64dec(m[1])); } catch { return { error: 'broken' }; }
  if (!isObj(o) || o.f !== 1 || !isObj(o.d)) return { error: 'broken' };
  const data = {}, skipped = [];
  for (const [k, v] of Object.entries(o.d)) {
    if (!isExportKey(k)) { skipped.push(k); continue; }
    let nv = v;
    if (k.startsWith('tlm.progress.')) { nv = normProgress(v); if (!nv) { skipped.push(k); continue; } }
    else if (k === 'tlm.cleared') nv = normCleared(v);
    else if (k === 'tlm.runs') nv = normRuns(v);
    else if (k === 'tlm.badges') nv = normBadges(v);
    else if (k === 'tlm.tcode' && typeof v !== 'string') { skipped.push(k); continue; }
    data[k] = nv;
  }
  if (!Object.keys(data).length) return { error: 'none' };
  return { data, skipped, boards: Object.keys(data).filter((k) => k.startsWith('tlm.progress.')).length, cleared: Object.keys(data['tlm.cleared'] || {}).length, version: typeof o.v === 'string' ? o.v.slice(0, 20) : '' };
}
// Skriver importert fremgang. Gir antall nøkler som ble skrevet (færre enn data hvis lagring feilet).
export function applyImport(st, parsed) { let n = 0; for (const [k, v] of Object.entries(parsed.data || {})) if (st.set(k, v)) n++; st.set('tlm.storev', STORE_VERSION); return n; }

// ---------- tekster (nb/en; knappene, ikke taster) ----------
const TXT = {
  nb: {
    'sv.newTitle': 'Starte nytt spill?', 'sv.newLose': 'Dette slettes', 'sv.keep': 'Dette beholdes', 'sv.nothing': 'Ingenting er lagret ennå, så ingenting slettes.',
    'sv.boards': 'Brett med lagret plass og fremgang: {n}', 'sv.cleared': 'Klarte brett: {n}', 'sv.runs': 'Tider og rekorder: {n}', 'sv.badges': 'Merkene dine ({n})', 'sv.keepList': 'klarte brett, merker, tilbehør, innstillinger og tester-kode',
    'sv.newOk': 'SLETT OG START NYTT', 'sv.cancel': 'AVBRYT', 'sv.back': 'Tilbake',
    'sv.allTitle': 'Nullstille alt?', 'sv.allLose': 'Dette slettes for godt', 'sv.allSettings': 'Innstillinger og valg: {n}', 'sv.allBadges': 'Merker: {n}', 'sv.allKeep': 'tester-koden',
    'sv.allOk': 'NULLSTILL ALT', 'sv.allDone': 'Alt er nullstilt', 'sv.allBtn': 'Nullstill alt (fremgang, merker og innstillinger)',
    'sv.copy': 'KOPIER FREMGANG', 'sv.paste': 'LIM INN FREMGANG', 'sv.copied': 'Fremgangen er kopiert. Lim den inn på den andre enheten med LIM INN FREMGANG.', 'sv.copyFail': 'Kunne ikke kopiere. Prøv igjen.',
    'sv.err.empty': 'Ingenting å lime inn.', 'sv.err.nocode': 'Fant ingen fremgangskode i teksten. Bruk KOPIER FREMGANG på den andre enheten.', 'sv.err.broken': 'Koden er ødelagt eller avkortet. Kopier den på nytt.', 'sv.err.big': 'Teksten er for stor.', 'sv.err.none': 'Koden inneholdt ingen fremgang.',
    'sv.pasteAsk': 'Bytte fremgangen på denne enheten med koden ({boards} brett, {cleared} klarte)? Valgene dine endres ikke.', 'sv.pasteDone': 'Fremgangen er limt inn ({n} deler). Spillet laster på nytt.', 'sv.pastePrompt': 'Lim inn fremgangskoden her:',
    'sv.fail': 'Kan ikke lagre på denne enheten (privat modus eller full lagring). Fremgangen blir ikke husket når du lukker siden.', 'sv.saved': 'Lagret på denne enheten', 'sv.status': '{boards} brett med fremgang · {cleared} klarte · {badges} merker.',
    'sv.note': 'Fremgangen ligger i nettleseren på denne enheten. Bruk KOPIER FREMGANG for å flytte den.',
  },
  en: {
    'sv.newTitle': 'Start a new game?', 'sv.newLose': 'This will be deleted', 'sv.keep': 'This is kept', 'sv.nothing': 'Nothing is saved yet, so nothing is deleted.',
    'sv.boards': 'Levels with saved spot and progress: {n}', 'sv.cleared': 'Cleared levels: {n}', 'sv.runs': 'Times and records: {n}', 'sv.badges': 'Your badges ({n})', 'sv.keepList': 'cleared levels, badges, accessories, settings and tester code',
    'sv.newOk': 'DELETE AND START NEW', 'sv.cancel': 'CANCEL', 'sv.back': 'Back',
    'sv.allTitle': 'Reset everything?', 'sv.allLose': 'This is deleted for good', 'sv.allSettings': 'Settings and choices: {n}', 'sv.allBadges': 'Badges: {n}', 'sv.allKeep': 'the tester code',
    'sv.allOk': 'RESET EVERYTHING', 'sv.allDone': 'Everything is reset', 'sv.allBtn': 'Reset everything (progress, badges and settings)',
    'sv.copy': 'COPY PROGRESS', 'sv.paste': 'PASTE PROGRESS', 'sv.copied': 'Progress copied. Paste it on the other device with PASTE PROGRESS.', 'sv.copyFail': 'Could not copy. Try again.',
    'sv.err.empty': 'Nothing to paste.', 'sv.err.nocode': 'No progress code found in the text. Use COPY PROGRESS on the other device.', 'sv.err.broken': 'The code is broken or cut off. Copy it again.', 'sv.err.big': 'The text is too large.', 'sv.err.none': 'The code held no progress.',
    'sv.pasteAsk': 'Replace the progress on this device with the code ({boards} levels, {cleared} cleared)? Your settings are not changed.', 'sv.pasteDone': 'Progress pasted ({n} parts). The game reloads.', 'sv.pastePrompt': 'Paste the progress code here:',
    'sv.fail': 'Cannot save on this device (private mode or full storage). Progress will not be remembered when you close the page.', 'sv.saved': 'Saved on this device', 'sv.status': '{boards} levels with progress · {cleared} cleared · {badges} badges.',
    'sv.note': 'Progress is stored in the browser on this device. Use COPY PROGRESS to move it.',
  },
};
export const sv = (lang, key, vars = {}) => (TXT[lang]?.[key] ?? TXT.nb[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
export const TEXT_KEYS = { nb: Object.keys(TXT.nb), en: Object.keys(TXT.en) };

// Kort status for ⚙ og menyen: hva som er lagret akkurat nå.
export function savedSummary(st, disk) {
  const boards = disk.keys('tlm.progress.').filter((k) => playedKey(st, k)).length, cleared = Object.keys(normCleared(st.get('tlm.cleared', {}))).length;
  const badges = Object.values(normBadges(st.get('tlm.badges', {}))).reduce((a, b) => a + Object.keys(b).length, 0);
  return { boards, cleared, badges };
}
