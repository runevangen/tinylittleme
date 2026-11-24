// R152: «Lag brett fra bilder» (leveleditor fase A, del 2). Ren logikk (ingen DOM, ingen three), testes i node: test_leditor.mjs. Visning: leditor_view.js, tekster: leditor_text.js.
// Kjeden: 2–4 bilder (nedskalert på telefonen, aldri lagret) + 2–4 svar → tjenesten tolk-bilder (R151) → scene → sceneToLevel (scene2level_core.js, i telefonen)
// → validateRoom (rooms_logic.js) → brett i MINE BRETT (R153). «Juster» flytter/sletter ting i scenen og lager brettet på nytt; «Sjekk» bruker rutegrafen (samme som scene2level).
import { LE, ANSWER_OPTS, normAnswers, REASONS } from './leveleditor_logic.js';
import { FEEDBACK, validCode, cleanCode } from './feedback_send.js';
import { sceneToLevel } from './scene2level_core.js';
import { validateRoom, addRoom, ROOMS, safeName, listRooms, loadRoomScene, saveRoomScene } from './rooms_logic.js';

export const LED = {
  consentKey: 'tlm.leconsent',        // samtykket gis én gang (lagres lokalt)
  fn: 'tolk-bilder', timeoutMs: 180000, pollMs: 3000, pollTimeoutMs: 15000, startTimeoutMs: 90000,   // timeoutMs: hele ventetiden på en jobb; startTimeoutMs: opplasting av bildene
  quality: 0.8, minQuality: 0.4,
  brightMin: 90, brightTarget: 112, brightGammaMin: 0.6, darkTip: 55,   // lysning (R163): snitt-lysstyrke 0–255 under brightMin lysnes mot brightTarget (gamma, aldri under brightGammaMin); under darkTip vises et lystips
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
// Svar: { ok:true, scene, warnings, check, usage:{cost_usd,ms}, left } | { ok:false, reason, job? }   (reason: nøkkel fra REASONS, eller 'kode_mangler' | 'bilder_mangler' | 'avbrutt')
// R164: tjenesten svarer straks med en jobb-id ({ ok:true, job }) og gjør tolkningen i bakgrunnen; telefonen spør hvert pollMs til den er ferdig.
// Faller nettet ut under spørringen, fortsetter den å spørre. `job` (fra et tidligere forsøk) gjenopptar en jobb uten å sende bildene på nytt. `onJob(id)` får id-en.
// Ved tidsavbrudd gir svaret { reason:'nett', job } så den samme jobben kan hentes igjen. En gammel tjeneste som svarer med ferdig scene, virker fortsatt.
export async function callTolk({ code, images, answers }, { fetchFn = globalThis.fetch, cfg = FEEDBACK, timeoutMs = LED.timeoutMs, signal, pollMs = LED.pollMs, job = '', onJob } = {}) {
  if (!validCode(code)) return { ok: false, reason: 'kode_mangler' };
  if (!job && !photoCountOk((images || []).length)) return { ok: false, reason: 'bilder_mangler' };
  const t0 = Date.now(), ms = () => Date.now() - t0, aborted = () => !!(signal && signal.aborted);
  const headers = { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' };
  // ett kall med egen tidsgrense (kaster ved nettfeil); gir { res, d, parsed }
  const post = async (payload, limitMs) => {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, timer = ctl ? setTimeout(() => ctl.abort(), limitMs) : null;
    const onAbort = () => ctl && ctl.abort(); signal?.addEventListener?.('abort', onAbort);
    try { const res = await fetchFn(toleUrl(cfg), { method: 'POST', headers, body: JSON.stringify(payload), signal: ctl?.signal }); let d = null, parsed = true; try { d = await res.json(); } catch { parsed = false; } return { res, d, parsed }; }
    finally { if (timer) clearTimeout(timer); signal?.removeEventListener?.('abort', onAbort); }
  };
  const success = (d) => ({ ok: true, scene: d.scene, warnings: Array.isArray(d.warnings) ? d.warnings : [], check: d.check || { ran: false }, usage: d.usage || { cost_usd: 0, ms: 0 }, left: d.left || null });
  const isScene = (r) => r.res.ok && r.d && r.d.ok === true && r.d.scene && typeof r.d.scene === 'object';
  const failOf = (r, extra = {}) => {
    const unreadable = !!r.res.ok && !r.parsed;   // svar 200 som ikke kunne leses (nettet falt ut underveis): regnes som nettfeil og kan prøves igjen
    const reason = unreadable ? 'nett' : r.d && REASON_KEYS.includes(r.d.reason) ? r.d.reason : (r.res.status === 401 || r.res.status === 403 ? 'kode' : 'feil');
    return { ok: false, reason, status: r.res.status, unreadable, ms: ms(), ...(r.d && r.d.diag ? { diag: r.d.diag } : {}), ...extra };
  };
  try {
    let jobId = job;
    if (!jobId) {
      const r = await post(buildBody(code, images, answers), LED.startTimeoutMs);
      if (isScene(r)) return success(r.d);   // gammel tjeneste: svarer med ferdig scene
      if (r.res.ok && r.d && r.d.ok === true && typeof r.d.job === 'string') { jobId = r.d.job; onJob?.(jobId); }
      else return failOf(r);
    }
    while (ms() < timeoutMs) {
      if (aborted()) return { ok: false, reason: 'avbrutt', status: 0, ms: ms(), job: jobId };
      await new Promise((ok) => setTimeout(ok, pollMs));
      if (aborted()) return { ok: false, reason: 'avbrutt', status: 0, ms: ms(), job: jobId };
      let p; try { p = await post({ code: cleanCode(code), job: jobId }, LED.pollTimeoutMs); } catch { continue; }   // nettfeil under spørringen: spør igjen
      if (p.res.ok && p.d && p.d.pending === true) continue;
      if (isScene(p)) return success(p.d);
      if (!p.parsed) continue;
      return failOf(p, { job: '' });   // ferdig med feil (eller ukjent jobb): ikke gjenoppta
    }
    return { ok: false, reason: 'nett', status: 0, ms: ms(), job: jobId };
  } catch (e) {
    return { ok: false, reason: aborted() ? 'avbrutt' : 'nett', status: 0, ms: ms(), ...(job ? { job } : {}) };
  }
}

// ---------- scene → brett ----------
const clone = (o) => JSON.parse(JSON.stringify(o));
// { ok, level, solvable, helpers, helperCount, tooMany, things } | { ok:false, reason: 'maal' | 'form' | 'stor' | 'scene' }
export function sceneToRoom(scene, name, opts = {}) {
  let r;
  try { r = sceneToLevel(scene); } catch (e) {
    const noFlat = /flate under målet/.test(String(e && e.message));
    if (noFlat && opts.auto !== false) { const g = autoGoal(scene); if (g) { const room = sceneToRoom(g.scene, name, { auto: false }); if (room.ok) return { ...room, scene: g.scene, autoGoal: g.on }; return { ...room, scene: g.scene, detail: `${room.detail || ''} (etter auto-mål)`.trim() }; } }
    return { ok: false, reason: noFlat ? 'maal' : 'scene', detail: String(e && e.message || '').slice(0, 120) };
  }
  const level = r.level; if (name) level.name = level.nameEn = safeName(name);
  if (!('rev' in level) || !Number.isFinite(level.rev)) level.rev = 1;   // tolkningen fra bilder har ikke `rev` (versjon av brettet); sjekken krever det
  const v = validateRoom(level); if (!v.ok) return { ok: false, reason: v.error, detail: String(v.why || '').slice(0, 160) };
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

// ---------- lysning av mørke bilder (R163): ren logikk, kjøres på telefonen mens bildet nedskaleres ----------
// Snitt-lysstyrke (0–255, Rec. 601) av RGBA-data; tar hvert `step`-te piksel
export function meanLuma(data, step = 4) {
  let sum = 0, n = 0; const stride = 4 * Math.max(1, step | 0);
  for (let i = 0; i + 2 < data.length; i += stride) { sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; n++; }
  return n ? sum / n : 128;
}
// Gamma (under 1 = lysere) som flytter snittet mot brightTarget. 1 = ikke rør (bildet er lyst nok, eller helt svart).
export function gammaFor(mean) {
  if (!(mean >= 8) || mean >= LED.brightMin) return 1;
  return Math.max(LED.brightGammaMin, Math.min(1, Math.log(LED.brightTarget / 255) / Math.log(mean / 255)));
}
export function gammaLut(g) { const lut = new Uint8ClampedArray(256); for (let i = 0; i < 256; i++) lut[i] = Math.round(255 * Math.pow(i / 255, g)); return lut; }
// Lysner RGBA-data på stedet. Gir { mean, gamma, after }
export function brightenData(data) {
  const mean = meanLuma(data), gamma = gammaFor(mean); let after = mean;
  if (gamma < 1) { const lut = gammaLut(gamma); for (let i = 0; i < data.length; i += 4) { data[i] = lut[data[i]]; data[i + 1] = lut[data[i + 1]]; data[i + 2] = lut[data[i + 2]]; } after = meanLuma(data); }
  return { mean: Math.round(mean), gamma: +gamma.toFixed(2), after: Math.round(after) };
}

// ---------- R167: siste brett fra bilder, så editoren er tilgjengelig igjen etter spilling ----------
export const LED_LAST = 'tlm.led.last';
export const setLastRoom = (st, id) => { try { st.set(LED_LAST, id || null); } catch { /* ingen lagring */ } };
// { id, name } for det siste egne brettet som fortsatt finnes med tolkning, ellers null
export function lastRoom(st) {
  const id = st.get(LED_LAST, null); if (!id) return null;
  const r = listRooms(st).find((x) => x.id === id && x.mine); if (!r || !loadRoomScene(st, id)) return null;
  return { id, name: r.name };
}
export { saveRoomScene, loadRoomScene };

// ---------- R172: lettere å flytte i JUSTER (flere ting, tall, steg) ----------
export const STEPS = [5, 10, 25, 50];   // cm per trykk på pilene
export const LED_STEP = 'tlm.led.step';
export const stepNow = (st) => { const v = +st.get(LED_STEP, LED.step); return STEPS.includes(v) ? v : LED.step; };
export const setStep = (st, v) => { if (STEPS.includes(+v)) { try { st.set(LED_STEP, +v); } catch { /* ingen lagring */ } } };
// Flytter flere ting like mye (dx, dz i cm). Grensene gjelder alle: flyttingen stoppes når den første tingen når veggen, så de beholder avstanden til hverandre. Gir ny scene eller null.
export function moveThings(scene, keys, dx, dz) {
  const th = thingsOf(scene), sel = (keys || []).map((k) => th.find((t) => t.key === k)).filter(Boolean); if (!sel.length) return null;
  const R = scene.room || { width: 0, depth: 0 };
  dx = Math.max(Math.max(...sel.map((t) => -t.rect.x0)), Math.min(Math.min(...sel.map((t) => R.width - t.rect.x1)), dx));
  dz = Math.max(Math.max(...sel.map((t) => -t.rect.z0)), Math.min(Math.min(...sel.map((t) => R.depth - t.rect.z1)), dz));
  if (!dx && !dz) return null;
  let s = scene; for (const t of sel) { const n = moveThing(s, t.key, dx, dz); if (!n) return null; s = n; }
  return s;
}
// Flytter en ting så venstre/øvre kant (x, z i cm) havner på de oppgitte tallene
export function moveThingTo(scene, key, x, z) {
  const t = thingsOf(scene).find((q) => q.key === key); if (!t || !Number.isFinite(+x) || !Number.isFinite(+z)) return null;
  return moveThings(scene, [key], +x - t.rect.x0, +z - t.rect.z0);
}
// Sletter flere. Tingen med målet kan ikke slettes: da gjøres ingenting (null).
export function deleteThings(scene, keys) {
  let s = scene; for (const k of keys || []) { s = deleteThing(s, k); if (!s) return null; } return keys && keys.length ? s : null;
}
// Det som vises om en ting: navn, type, posisjon (venstre/øvre kant) og størrelse i cm
export function thingInfo(scene, key) {
  const t = thingsOf(scene).find((q) => q.key === key); if (!t) return null;
  return { key, label: t.label, kind: t.kind, x: Math.round(t.rect.x0), z: Math.round(t.rect.z0), w: Math.round(t.rect.x1 - t.rect.x0), d: Math.round(t.rect.z1 - t.rect.z0), h: Math.round(t.top) };
}
