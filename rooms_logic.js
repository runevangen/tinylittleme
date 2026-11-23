// R153: «Mine brett» og deling med kode. Ren logikk (ingen DOM, ingen three), testes i node: test_rooms.mjs. Visning: rooms_view.js. Tekster: rooms_text.js.
// Brettene ligger lokalt på telefonen (tlm.rooms = liste, tlm.room.<id> = brettet). «Del» sender brettet (bare tall og former, aldri bilder) til tabellen
// tlm_rooms i Supabase (supabase/migrations/…_tlm_rooms.sql) med tester-koden, og gir en kode (RM-XXXXXXXX) andre limer inn under «Spill fra kode».
// Privat som standard: ingen offentlig liste, bare den som har koden kan hente brettet. Kun testere i første omgang (tester-kode kreves for alle kall).
import { rpc, validCode, cleanCode } from './feedback_send.js';

export const ROOMS = {
  listKey: 'tlm.rooms',            // [{ id, name, code, mine, at }]
  dataKey: (id) => `tlm.room.${id}`,
  idPrefix: 'mine-',               // brett-id i ?level=
  max: 20,                         // maks antall lagrede brett på enheten
  maxBytes: 150000,                // maks størrelse på ett brett (JSON); et vanlig brett er 10–50 kB
  nameMax: 30,
  codePrefix: 'RM-', codeLen: 8,
  alphabet: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',   // uten O/0/I/1 som forveksles
  topKeys: ['name', 'rev', 'boxes', 'start', 'goal', 'deathY'],   // må finnes (som i brettene scene2level lager)
};

export const isRoomId = (id) => typeof id === 'string' && id.startsWith(ROOMS.idPrefix) && /^mine-[a-z0-9]{3,12}$/.test(id);
const rid = (rnd) => { let s = ''; for (let i = 0; i < 6; i++) s += 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(rnd() * 31)]; return ROOMS.idPrefix + s; };

// ---------- kode ----------
export function newCode(rnd = Math.random) { let s = ''; for (let i = 0; i < ROOMS.codeLen; i++) s += ROOMS.alphabet[Math.floor(rnd() * ROOMS.alphabet.length)]; return ROOMS.codePrefix + s; }
// «rm-abcd efgh» → «RM-ABCDEFGH»; tåler mellomrom og manglende bindestrek. Ugyldig gir ''.
export function cleanRoomCode(s) {
  let t = String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (t.startsWith('RM')) t = t.slice(2);
  const c = ROOMS.codePrefix + t;
  return new RegExp(`^RM-[${ROOMS.alphabet}]{${ROOMS.codeLen}}$`).test(c) ? c : '';
}

// ---------- navn og innhold ----------
// Navnefilter: små lister på norsk og engelsk; sjekker også med tegn fjernet (b.a.n.n). Et avvist navn gir «Mitt brett».
const BAD = ['faen', 'fuck', 'shit', 'dritt', 'pikk', 'fitte', 'hore', 'hoer', 'bitch', 'dick', 'cunt', 'nigg', 'nazi', 'hitler', 'porno', 'sex', 'rasist', 'idiot', 'kuk', 'rump', 'drep', 'kill', 'suicide', 'selvmord'];
export const nameClean = (s) => String(s ?? '').replace(/[<>&"'`\\]/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, ROOMS.nameMax);
export function nameOk(s) {
  const n = nameClean(s); if (!n) return false;
  const flat = n.toLowerCase().replace(/[^a-zæøå0-9]/g, '');
  const leet = flat.replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's');
  return !BAD.some((w) => flat.includes(w) || leet.includes(w));
}
export const safeName = (s, fallback = 'Mitt brett') => (nameOk(s) ? nameClean(s) : fallback);

// Går gjennom hele brettet: fjerner < > i tekster (brettet kan komme fra en annen), nekter farlige nøkler og for stor dybde. Gir en ren kopi eller null.
function scrub(v, depth = 0) {
  if (depth > 12) return undefined;
  if (typeof v === 'string') return v.replace(/[<>]/g, '').slice(0, 300);
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'boolean' || v === null) return v;
  if (Array.isArray(v)) { const a = []; for (const x of v) { const s = scrub(x, depth + 1); if (s === undefined && x !== undefined) return undefined; a.push(s); } return a; }
  if (typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) { if (k === '__proto__' || k === 'constructor' || k === 'prototype') return undefined; const s = scrub(v[k], depth + 1); if (s === undefined && v[k] !== undefined) return undefined; o[k] = s; }
    return o;
  }
  return undefined;
}
const v3 = (a) => Array.isArray(a) && a.length === 3 && a.every((n) => Number.isFinite(n) && Math.abs(n) < 1000);
// Sjekker at et brett ser riktig ut og er lite nok. { ok, level (renset), error: 'form'|'stor' }
export function validateRoom(level) {
  if (!level || typeof level !== 'object' || Array.isArray(level)) return { ok: false, error: 'form', why: 'ikke objekt' };
  let size = 0; try { size = JSON.stringify(level).length; } catch { return { ok: false, error: 'form', why: 'kan ikke serialiseres' }; }
  if (size > ROOMS.maxBytes) return { ok: false, error: 'stor', why: `${size} byte` };
  for (const k of ROOMS.topKeys) if (!(k in level)) return { ok: false, error: 'form', why: `mangler ${k}` };
  if (!Array.isArray(level.boxes) || !level.boxes.length || level.boxes.length > 600) return { ok: false, error: 'form', why: `${Array.isArray(level.boxes) ? level.boxes.length : '?'} bokser` };
  if (!v3(level.start)) return { ok: false, error: 'form', why: `start ${JSON.stringify(level.start)}` };
  if (!v3(level.goal)) return { ok: false, error: 'form', why: `mål ${JSON.stringify(level.goal)}` };
  if (!Number.isFinite(level.deathY)) return { ok: false, error: 'form', why: `deathY ${level.deathY}` };
  const clean = scrub(level); if (!clean) return { ok: false, error: 'form', why: 'innhold nektes (farlig nøkkel eller for dypt)' };
  return { ok: true, level: clean };
}

// ---------- lokal lagring (store: { get, set } som i main.js) ----------
export function listRooms(st) {
  const a = st.get(ROOMS.listKey, []);
  return (Array.isArray(a) ? a : []).filter((r) => r && isRoomId(r.id)).map((r) => ({ id: r.id, name: safeName(r.name), code: r.code ? String(r.code) : '', mine: r.mine !== false, at: +r.at || 0 }));
}
export const loadRoom = (st, id) => { if (!isRoomId(id)) return null; const l = st.get(ROOMS.dataKey(id), null); const v = validateRoom(l); return v.ok ? v.level : null; };
// Legger et brett til. { name, level, code?, mine? } → { ok, id } eller { ok:false, reason: 'form'|'stor'|'fullt' }
export function addRoom(st, { name, level, code = '', mine = true, rnd = Math.random, now = Date.now() }) {
  const v = validateRoom(level); if (!v.ok) return { ok: false, reason: v.error };
  const list = listRooms(st);
  if (code) { const same = list.find((r) => r.code === code); if (same) { st.set(ROOMS.dataKey(same.id), v.level); return { ok: true, id: same.id, again: true }; } }   // samme kode to ganger: oppdater, ikke dupliser
  if (list.length >= ROOMS.max) return { ok: false, reason: 'fullt' };
  let id = rid(rnd); for (let i = 0; i < 20 && list.some((r) => r.id === id); i++) id = rid(rnd);
  const nm = safeName(name); v.level.name = nm; v.level.nameEn = nm;
  st.set(ROOMS.dataKey(id), v.level);
  st.set(ROOMS.listKey, [{ id, name: nm, code, mine, at: now }, ...list]);
  return { ok: true, id };
}
export function removeRoom(st, id) {
  const list = listRooms(st); if (!list.some((r) => r.id === id)) return false;
  st.set(ROOMS.listKey, list.filter((r) => r.id !== id)); st.set(ROOMS.dataKey(id), null); return true;
}
export function setRoomCode(st, id, code) { const list = listRooms(st); const r = list.find((x) => x.id === id); if (!r) return false; r.code = code; st.set(ROOMS.listKey, list); return true; }

// ---------- nettet (fetch kan byttes ut i tester) ----------
// Alle kall bruker tester-koden. Svar fra funksjonene: { ok:true, … } eller { ok:false, reason }. Her oversatt til: 'kode' | 'nett' | 'grense' | 'finnes ikke' | 'feil'.
const reasonOf = (r) => {
  if (!r.ok) return r.status === 0 ? 'nett' : (r.status === 401 || r.status === 403) ? 'kode' : 'feil';
  const d = r.data; if (d && d.ok === true) return '';
  const w = d && String(d.reason || '');
  return ['kode', 'grense', 'finnes ikke', 'fullt', 'stor'].includes(w) ? w : 'feil';
};
export function shareNeeds({ code, online = (typeof navigator !== 'undefined' ? navigator.onLine : true) }) { return !validCode(code) ? 'kode' : online === false ? 'nett' : ''; }
export async function shareRoom({ tcode, name, level, version = '', rcode }, opts) {
  const need = shareNeeds({ code: tcode }); if (need === 'kode') return { ok: false, reason: 'kode' };
  const v = validateRoom(level); if (!v.ok) return { ok: false, reason: v.error === 'stor' ? 'stor' : 'feil' };
  const rc = rcode || newCode();
  const r = await rpc('tlm_share_room', { c: cleanCode(tcode), rc, nm: safeName(name), lvl: v.level, ver: String(version).slice(0, 20) }, opts);
  const why = reasonOf(r); return why ? { ok: false, reason: why } : { ok: true, code: r.data.code || rc };
}
export async function fetchRoom({ tcode, rcode }, opts) {
  if (!validCode(tcode)) return { ok: false, reason: 'kode' };
  const rc = cleanRoomCode(rcode); if (!rc) return { ok: false, reason: 'kodeformat' };
  const r = await rpc('tlm_get_room', { c: cleanCode(tcode), rc }, opts);
  const why = reasonOf(r); if (why) return { ok: false, reason: why };
  const v = validateRoom(r.data.level); if (!v.ok) return { ok: false, reason: 'feil' };
  return { ok: true, code: rc, name: safeName(r.data.name), level: v.level };
}
export async function deleteSharedRoom({ tcode, rcode }, opts) {
  if (!validCode(tcode)) return { ok: false, reason: 'kode' };
  const rc = cleanRoomCode(rcode); if (!rc) return { ok: false, reason: 'kodeformat' };
  const r = await rpc('tlm_delete_room', { c: cleanCode(tcode), rc }, opts); const why = reasonOf(r); return why ? { ok: false, reason: why } : { ok: true };
}
export async function reportRoom({ tcode, rcode, note = '' }, opts) {
  if (!validCode(tcode)) return { ok: false, reason: 'kode' };
  const rc = cleanRoomCode(rcode); if (!rc) return { ok: false, reason: 'kodeformat' };
  const r = await rpc('tlm_report_room', { c: cleanCode(tcode), rc, note: String(note).replace(/[<>]/g, '').slice(0, 200) }, opts); const why = reasonOf(r); return why ? { ok: false, reason: why } : { ok: true };
}
// logEv-linje (aldri brettinnhold, aldri tester-kode)
export const roomLog = (what, extra = '') => `${what}${extra ? ': ' + extra : ''}`;
// Skal «MINE BRETT» vises? Valget på og gyldig tester-kode (testere først).
export const roomsAvailable = ({ on = true, code = '', cinema = false } = {}) => !!on && !cinema && validCode(code);
