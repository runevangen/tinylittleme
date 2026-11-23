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
  const t0 = Date.now();
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
  if (signal && ctl) signal.addEventListener?.('abort', () => ctl.abort());
  try {
    const res = await fetchFn(toleUrl(cfg), {
      method: 'POST', headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBody(code, images, answers)), signal: ctl?.signal,
    });
    let d = null, parsed = true; try { d = await res.json(); } catch { parsed = false; /* ikke json */ }
    if (res.ok && d && d.ok === true && d.scene && typeof d.scene === 'object') return { ok: true, scene: d.scene, warnings: Array.isArray(d.warnings) ? d.warnings : [], check: d.check || { ran: false }, usage: d.usage || { cost_usd: 0, ms: 0 }, left: d.left || null };
    // Tjenesten svarte 200, men svaret kunne ikke leses (nettet falt ut underveis): regnes som nettfeil og kan prøves igjen
    const unreadable = !!res.ok && !parsed;
    const r = unreadable ? 'nett' : d && REASON_KEYS.includes(d.reason) ? d.reason : (res.status === 401 || res.status === 403 ? 'kode' : 'feil');
    return { ok: false, reason: r, status: res.status, unreadable, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, reason: signal && signal.aborted ? 'avbrutt' : 'nett', status: 0, ms: Date.now() - t0 };
  } finally { if (timer) clearTimeout(timer); }
}

// ---------- scene → brett ----------
const clone = (o) => JSON.parse(JSON.stringify(o));
// { ok, level, solvable, helpers, helperCount, tooMany, things } | { ok:false, reason: 'maal' | 'form' | 'stor' | 'scene' }
export function sceneToRoom(scene, name, opts = {}) {
  let r;
  try { r = sceneToLevel(scene); } catch (e) {
    const noFlat = /flate under målet/.test(String(e && e.message));
    if (noFlat && opts.auto !== false) { const g = autoGoal(scene); if (g) { const room = sceneToRoom(g.scene, name, { auto: false }); if (room.ok) return { ...room, scene: g.scene, autoGoal: g.on }; return { ...room, scene: g.scene, detail: 'etter auto-mål' }; } }
    return { ok: false, reason: noFlat ? 'maal' : 'scene', detail: String(e && e.message || '').slice(0, 120) };
  }
  const level = r.level; if (name) level.name = level.nameEn = safeName(name);
  const v = validateRoom(level); if (!v.ok) return { ok: false, reason: v.error, detail: `${(level.boxes || []).length} bokser` };
  const helperCount = r.helpers.length;
  return { ok: true, level: v.level, solvable: !!r.solvable, helpers: r.helpers.map((h) => ({ id: h.id, size_cm: h.size_cm, at_cm: h.at_cm })), helperCount, tooMany: helperCount > LED.maxHelpers, things: thingsOf(scene).length };
}
// Fant tolkningen ikke et brukbart mål, velger spillet selv: først den høyeste flata brettbyggeren finner (helst en som kan nås), målet midt på.
// Finnes ingen flate å stå på, settes en liten sokkel inn i motsatt ende av rommet fra starten, og målet legges på den. Gir { scene, on, sokkel? } eller null.
export function autoGoal(scene) {
  let r = null; try { r = sceneToLevel(clone(scene), { autoGoal: true }); } catch { r = null; }
  if (r && r.autoGoal) { const s = clone(scene); s.goal = { ...(scene.goal || {}), x: r.autoGoal.x, y: r.autoGoal.y, z: r.autoGoal.z, on: r.autoGoal.id }; return { scene: s, on: r.autoGoal.id }; }
  const R = scene && scene.room, st = scene && scene.start; if (!R || !st || !Array.isArray(scene.objects)) return null;
  const w = 20, lim = (v, max) => Math.max(0, Math.min(max - w, v));
  const x = lim(st.x < R.width / 2 ? R.width - w - 10 : 10, R.width), z = lim(st.z < R.depth / 2 ? R.depth - w - 10 : 10, R.depth);
  const s = clone(scene); let id = 'maalsokkel'; while (s.objects.some((o) => o.id === id)) id += '_';
  s.objects.push({ id, kind: 'box', material: 'wood', color: '#c9a36b', box: [x, x + w, 0, 20, z, z + w], confidence: 0.1, note: 'lagt inn av spillet som sted for målet' });
  s.goal = { ...(scene.goal || {}), x: x + w / 2, y: 20, z: z + w / 2, on: id };
  return { scene: s, on: id, sokkel: true };
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

// Målforslag: opptil n ulike flater til målflagget (høyeste, helst nåbare først). Hvert forslag er { id, scene } med målet flyttet dit. Aldri tom hvis rommet finnes (da en sokkel).
export function goalCandidates(scene, n = 4) {
  const out = [], skip = [];
  for (let i = 0; i < n * 4 && out.length < n; i++) {   // flere runder enn forslag: de som ligger tett på et valgt sted (under 40 cm) hoppes over, så forslagene sprer seg
    let r = null; try { r = sceneToLevel(clone(scene), { autoGoal: 'force', autoGoalSkip: skip }); } catch { r = null; }
    if (!r || !r.autoGoal) break;
    skip.push(r.autoGoal.id);
    if (out.some((c) => Math.hypot(c.x - r.autoGoal.x, c.z - r.autoGoal.z) < 40)) continue;
    const s = clone(scene); s.goal = { ...(scene.goal || {}), x: r.autoGoal.x, y: r.autoGoal.y, z: r.autoGoal.z, on: r.autoGoal.id };
    out.push({ id: r.autoGoal.id, x: s.goal.x, z: s.goal.z, scene: s });
  }
  if (!out.length) { const g = autoGoal(scene); if (g) out.push({ id: g.on, x: g.scene.goal.x, z: g.scene.goal.z, scene: g.scene }); }
  return out;
}
// Kort oppsummering av tolkningen til feilloggen (tall og former, aldri bilder, aldri fritekst fra bildene)
export function summarizeScene(scene) {
  try {
    const R = scene.room || {}, th = thingsOf(scene).sort((a, b) => b.top - a.top);
    const f = (n) => Math.round(Number(n) || 0);
    return `rom ${f(R.width)}×${f(R.depth)}×${f(R.height)} cm, ${th.length} ting, mål ${scene.goal ? `${f(scene.goal.x)},${f(scene.goal.y)},${f(scene.goal.z)}` : 'mangler'}${scene.goal && scene.goal.on ? ' på ' + String(scene.goal.on).slice(0, 20) : ''}, start ${scene.start ? `${f(scene.start.x)},${f(scene.start.z)}` : 'mangler'}; høyeste: ${th.slice(0, 8).map((t) => `${String(t.kind).slice(0, 14)} ${f(t.top)}cm ${f(t.rect.x1 - t.rect.x0)}×${f(t.rect.z1 - t.rect.z0)}`).join(' | ')}`.slice(0, 900);
  } catch { return 'ingen oppsummering'; }
}
// Liste til VIS TOLKNING: hver ting (høyeste først) med størrelse (cm) og sikkerhet (0–1 eller null), og hva spillet la inn selv
export function interpretation(scene, room) {
  const objs = (scene && scene.objects) || [];
  const things = thingsOf(scene).sort((a, b) => b.top - a.top).map((t) => {
    const os = objs.filter((o) => t.ids.includes(o.id)), conf = os.map((o) => o.confidence).filter(Number.isFinite);
    return { label: t.label, kind: t.kind, w: Math.round(t.rect.x1 - t.rect.x0), d: Math.round(t.rect.z1 - t.rect.z0), h: Math.round(t.top), conf: conf.length ? Math.min(...conf) : null, goal: !!(scene.goal && t.ids.includes(scene.goal.on)) };
  });
  const unc = scene && scene.source && typeof scene.source.uncertainty === 'string' ? scene.source.uncertainty.replace(/[<>`]/g, ' ').slice(0, 300) : '';
  return { things, helpers: (room && room.helpers) || [], uncertainty: unc, goalAuto: !!(room && room.autoGoal) };
}
