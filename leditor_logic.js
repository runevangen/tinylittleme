// R152: «Lag brett fra bilder» (leveleditor fase A, del 2). Ren logikk (ingen DOM, ingen three), testes i node: test_leditor.mjs. Visning: leditor_view.js, tekster: leditor_text.js.
// Kjeden: 2–4 bilder (nedskalert på telefonen, aldri lagret) + 2–4 svar → tjenesten tolk-bilder (R151) → scene → sceneToLevel (scene2level_core.js, i telefonen)
// → validateRoom (rooms_logic.js) → brett i MINE BRETT (R153). «Juster» flytter/sletter ting i scenen og lager brettet på nytt; «Sjekk» bruker rutegrafen (samme som scene2level).
import { LE, ANSWER_OPTS, normAnswers, REASONS } from './leveleditor_logic.js';
import { FEEDBACK, validCode, cleanCode } from './feedback_send.js';
import { sceneToLevel } from './scene2level_core.js';
import { validateRoom, addRoom, ROOMS, safeName } from './rooms_logic.js';

export const LED = {
  consentKey: 'tlm.leconsent',        // samtykket gis én gang (lagres lokalt)
  fn: 'tolk-bilder', timeoutMs: 120000,
  quality: 0.8, minQuality: 0.4,
  step: 10,                           // cm per trykk når en ting flyttes
  maxHelpers: 5,                      // maks hjelpeobjekter fra verktøyet (planen: maks fem)
  themes: ['', 'jungel', 'rom', 'slott', 'piratskip', 'godteri', 'vinter'],   // '' = ingen; fritekst støttes ikke i knappene (kort tema holder)
  maxUndo: 20,
};

// ---------- bilder ----------
export const photoCountOk = (n) => n >= LE.photosMin && n <= LE.photosMax;
// Lengste side ned til maxDim, aldri oppskalert
export function fitDim(w, h, max = LE.maxDim) {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)), scaled: k < 1 };
}
// data:image/jpeg;base64,XXXX → { media_type, data }  (eller null)
export function splitDataUrl(u) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(u || ''));
  return m ? { media_type: m[1], data: m[2] } : null;
}
export const imageFits = (im) => !!im && im.data.length <= LE.maxImageB64;
// Neste kvalitet når et bilde er for stort (null = gi opp)
export const lowerQuality = (q) => { const n = +(q - 0.15).toFixed(2); return n >= LED.minQuality ? n : null; };

// ---------- kall til tjenesten ----------
export const toleUrl = (cfg = FEEDBACK) => `${cfg.url}/functions/v1/${LED.fn}`;
export function buildBody(code, images, answers) {
  return { code: cleanCode(code), images: images.map((i) => ({ media_type: i.media_type, data: i.data })), answers: normAnswers(answers) };
}
const REASON_KEYS = Object.keys(REASONS);
// Svar: { ok:true, scene, warnings, check, usage:{cost_usd,ms}, left } | { ok:false, reason }   (reason: nøkkel fra REASONS, eller 'kode_mangler' | 'bilder_mangler' | 'avbrutt')
export async function callTolk({ code, images, answers }, { fetchFn = globalThis.fetch, cfg = FEEDBACK, timeoutMs = LED.timeoutMs, signal } = {}) {
  if (!validCode(code)) return { ok: false, reason: 'kode_mangler' };
  if (!photoCountOk((images || []).length)) return { ok: false, reason: 'bilder_mangler' };
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
  if (signal && ctl) signal.addEventListener?.('abort', () => ctl.abort());
  try {
    const res = await fetchFn(toleUrl(cfg), {
      method: 'POST', headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBody(code, images, answers)), signal: ctl?.signal,
    });
    let d = null; try { d = await res.json(); } catch { /* ikke json */ }
    if (res.ok && d && d.ok === true && d.scene && typeof d.scene === 'object') return { ok: true, scene: d.scene, warnings: Array.isArray(d.warnings) ? d.warnings : [], check: d.check || { ran: false }, usage: d.usage || { cost_usd: 0, ms: 0 }, left: d.left || null };
    const r = d && REASON_KEYS.includes(d.reason) ? d.reason : (res.status === 401 || res.status === 403 ? 'kode' : 'feil');
    return { ok: false, reason: r };
  } catch (e) {
    return { ok: false, reason: signal && signal.aborted ? 'avbrutt' : 'nett' };
  } finally { if (timer) clearTimeout(timer); }
}

// ---------- scene → brett ----------
const clone = (o) => JSON.parse(JSON.stringify(o));
// { ok, level, solvable, helpers, helperCount, tooMany, things } | { ok:false, reason: 'maal' | 'form' | 'stor' | 'scene' }
export function sceneToRoom(scene, name, opts = {}) {
  let r;
  try { r = sceneToLevel(scene); } catch (e) {
    if (/flate under målet/.test(String(e && e.message)) && opts.auto !== false) { const g = autoGoal(scene); if (g) { const room = sceneToRoom(g.scene, name, { auto: false }); if (room.ok) return { ...room, scene: g.scene, autoGoal: g.on }; } }
    return { ok: false, reason: /flate under målet/.test(String(e && e.message)) ? 'maal' : 'scene' };
  }
  const level = r.level; if (name) level.name = level.nameEn = safeName(name);
  const v = validateRoom(level); if (!v.ok) return { ok: false, reason: v.error };
  const helperCount = r.helpers.length;
  return { ok: true, level: v.level, solvable: !!r.solvable, helpers: r.helpers.map((h) => ({ id: h.id, size_cm: h.size_cm, at_cm: h.at_cm })), helperCount, tooMany: helperCount > LED.maxHelpers, things: thingsOf(scene).length };
}
// Fant tolkningen ikke et brukbart mål, velger spillet selv: den høyeste faste flata som kan nås (løsbar først), målet midt på den.
// Gir { scene, on } eller null. Prøver de høyeste flatene først (maks 12).
export function autoGoal(scene) {
  const objs = ((scene && scene.objects) || []).filter((o) => o && Array.isArray(o.box) && o.box.length === 6 && !o.movable && !o.decor && o.box.every(Number.isFinite) && o.box[3] > o.box[2] + 1 && o.box[1] - o.box[0] >= 6 && o.box[5] - o.box[4] >= 6)
    .sort((a, b) => b.box[3] - a.box[3]).slice(0, 12);
  let fallback = null;
  for (const o of objs) {
    const s = clone(scene); s.goal = { ...(scene.goal || {}), x: (o.box[0] + o.box[1]) / 2, y: o.box[3], z: (o.box[4] + o.box[5]) / 2, on: o.id };
    let r; try { r = sceneToLevel(clone(s)); } catch { continue; }
    if (r.solvable && r.helpers.length <= LED.maxHelpers) return { scene: s, on: o.id };
    if (!fallback) fallback = { scene: s, on: o.id };
  }
  return fallback;
}
// Kan brettet spilles? Løsbar etter rutegrafen og ikke for mange hjelpeobjekter
export const canPlay = (room) => !!room && room.ok && room.solvable && !room.tooMany;
// Kort tekstnøkkel for Sjekk-resultatet
export const checkVerdict = (room) => (!room || !room.ok ? 'bad' : !room.solvable ? 'novei' : room.tooMany ? 'mange' : room.helperCount ? 'hjelp' : 'ok');

// ---------- justering: flytte og slette ting (scenen er sannheten, brettet lages på nytt) ----------
// En «ting» = alle objekter med samme `group`, ellers ett objekt. rect i cm (x, z), top i cm.
export function thingsOf(scene) {
  const by = new Map();
  for (const o of (scene && scene.objects) || []) {
    if (!o || !Array.isArray(o.box) || o.box.length !== 6) continue;
    const key = o.group ? 'g:' + o.group : 'o:' + o.id;
    let t = by.get(key); if (!t) { t = { key, ids: [], kind: o.kind || '', label: o.group || o.id, rect: { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity }, top: 0, color: o.color }; by.set(key, t); }
    t.ids.push(o.id); const [x0, x1, , y1, z0, z1] = o.box;
    t.rect.x0 = Math.min(t.rect.x0, x0); t.rect.x1 = Math.max(t.rect.x1, x1); t.rect.z0 = Math.min(t.rect.z0, z0); t.rect.z1 = Math.max(t.rect.z1, z1); t.top = Math.max(t.top, y1);
  }
  return [...by.values()];
}
// Tingen under et punkt (cm). Den høyeste vinner (det som ligger øverst på kartet), så den minste.
export function thingAt(things, x, z) {
  const hit = things.filter((t) => x >= t.rect.x0 && x <= t.rect.x1 && z >= t.rect.z0 && z <= t.rect.z1);
  hit.sort((a, b) => b.top - a.top || (a.rect.x1 - a.rect.x0) * (a.rect.z1 - a.rect.z0) - (b.rect.x1 - b.rect.x0) * (b.rect.z1 - b.rect.z0));
  return hit[0] || null;
}
// Flytter en ting (dx, dz i cm); holdes inne i rommet. Tingen som målet ligger på tar målet med seg. Gir ny scene eller null.
export function moveThing(scene, key, dx, dz) {
  const t = thingsOf(scene).find((q) => q.key === key); if (!t) return null;
  const R = scene.room || { width: 0, depth: 0 };
  dx = Math.max(-t.rect.x0, Math.min(R.width - t.rect.x1, dx)); dz = Math.max(-t.rect.z0, Math.min(R.depth - t.rect.z1, dz));
  if (!dx && !dz) return null;
  const s = clone(scene), ids = new Set(t.ids);
  for (const o of s.objects) if (ids.has(o.id)) { o.box = [o.box[0] + dx, o.box[1] + dx, o.box[2], o.box[3], o.box[4] + dz, o.box[5] + dz]; }
  if (s.goal && ids.has(s.goal.on)) { s.goal.x += dx; s.goal.z += dz; }
  for (const c of s.collectibles || []) if (ids.has(c.on) && Array.isArray(c.at)) c.at = [c.at[0] + dx, c.at[1] + dz];
  for (const a of s.ants || []) if (ids.has(a.on)) { if (Array.isArray(a.from)) a.from = [a.from[0] + dx, a.from[1] + dz]; if (Array.isArray(a.to)) a.to = [a.to[0] + dx, a.to[1] + dz]; }
  return s;
}
// Sletter en ting. Målet kan ikke slettes (null). Ting som står på den og er nevnt i delmål/smuler/maur fjernes også.
export function deleteThing(scene, key) {
  const t = thingsOf(scene).find((q) => q.key === key); if (!t) return null;
  const ids = new Set(t.ids); if (scene.goal && ids.has(scene.goal.on)) return null;
  const s = clone(scene);
  s.objects = s.objects.filter((o) => !ids.has(o.id));
  if (s.collectibles) s.collectibles = s.collectibles.filter((c) => !ids.has(c.on));
  if (s.ants) s.ants = s.ants.filter((a) => !ids.has(a.on));
  if (s.goals) s.goals = s.goals.filter((g) => !ids.has(g.on)).map((g) => (g.also ? { ...g, also: g.also.filter((i) => !ids.has(i)) } : g));
  if (s.alts) s.alts = s.alts.filter((a) => !(a.path || []).some((i) => ids.has(i)));
  return s;
}
// Angre-stabel (ren): { push(scene), pop() }
export function undoStack(max = LED.maxUndo) { const a = []; return { push(s) { a.push(s); if (a.length > max) a.shift(); }, pop: () => a.pop() || null, get size() { return a.length; } }; }

// ---------- lagring ----------
// Første gang: nytt brett i MINE BRETT; senere: oppdaterer det samme. { ok, id } | { ok:false, reason }
export function saveRoom(st, { id = '', name, level, rnd, now }) {
  if (id) { const v = validateRoom(level); if (!v.ok) return { ok: false, reason: v.error }; v.level.name = v.level.nameEn = safeName(name); st.set(ROOMS.dataKey(id), v.level); return { ok: true, id, again: true }; }
  return addRoom(st, { name, level, mine: true, rnd, now });
}
// Navn på et nytt brett: «Mitt brett», eller navnet fra scenen uten «(tolket fra …)»
export const defaultName = (scene) => safeName(String((scene && scene.name) || '').replace(/\s*\(.*$/, '').trim(), 'Mitt brett');

// logEv-linje (aldri bilder, aldri tester-kode, aldri brettinnhold)
export const ledLog = ({ what, cost = 0, ms = 0, edits = 0, bot = '', extra = '' }) => `${what}: kostnad ${(+cost || 0).toFixed(4)} USD, tid ${Math.round(+ms || 0)} ms, rettinger ${edits | 0}${bot ? `, boten fant ${bot === 'vei' ? 'en vei' : 'ingen vei'}` : ''}${extra ? ', ' + extra : ''}`;
// Skal knappen vises? Valget på og gyldig tester-kode (som MINE BRETT)
export const ledAvailable = ({ on = true, code = '', cinema = false } = {}) => !!on && !cinema && validCode(code);
export { ANSWER_OPTS };
