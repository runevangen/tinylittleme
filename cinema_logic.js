// R68: kinomodus (cinema_logic.js). Ren logikk uten DOM og three, testes i node (test_cinema.mjs).
// Kinomodus er av som standard og påvirker ikke vanlig spilling. Slås på med ?cinema=1 (eller window.__game.cine.on() / ⚙ → Admin).
// Denne modulen importeres FØRST i main.js: i kinomodus erstattes Math.random med en seedet generator (fast frø), så støv, lysstøv,
// blunking, edderkopp-takt og smuler blir like fra gang til gang. Selve API-et (kamera, figur, tid, byggeskjerm) bor i cinema_view.js.
//
// URL-parametre: cinema=1 (på) · cine_seed=<tall> (frø, standard 1) · cine_hold=1 (start frosset: spillet står stille til skriptet styrer)
//                cine_opt=tlm.flood:rask;tlm.floodrate:2.5 (valg som gjelder bare denne økten og aldri lagres)

export const FRAME_DT = 1 / 60;       // fast tidssteg for step() (samme som tester og walk_route)
export const DEFAULT_SEED = 1;
// Kinomodus starter med disse valgene (leses i stedet for det som ligger i localStorage, så to opptak er like uansett nettleser).
// Ekspert = ingen hjelp (piler, kompass, hint, kart, kort, tips); fortelling, lyd og lagring er av. Smuler beholdes (målestokk).
export const CINE_DEFAULTS = Object.freeze({
  'tlm.difficulty': 'expert', 'tlm.story': false, 'tlm.markers': false, 'tlm.labels': false, 'tlm.minimap': false, 'tlm.guide': false,
  'tlm.compassmode': 'off', 'tlm.cues': false, 'tlm.muted': true, 'tlm.autosave': false, 'tlm.startscreen': false, 'tlm.follow': false,
  'tlm.griphi': false, 'tlm.voice': false, 'tlm.bubbles': false, 'tlm.music': false, 'tlm.fps': false, 'tlm.lostreturn': false, 'tlm.failhint': false,
  'tlm.view3': 'third', 'tlm.preset4': 'mario', 'tlm.pcpubg1': true,   // samme styring og kamera på PC og mobil
});

// ---- URL ----
export function parseOpts(s) {            // «tlm.flood:rask;tlm.floodrate:2.5;tlm.x:true» til { 'tlm.flood': 'rask', 'tlm.floodrate': 2.5, 'tlm.x': true }
  const o = {};
  for (const part of String(s || '').split(';')) {
    const i = part.indexOf(':'); if (i < 1) continue;
    const k = part.slice(0, i).trim(), raw = part.slice(i + 1).trim(); if (!k) continue;
    o[k] = raw === 'true' ? true : raw === 'false' ? false : raw !== '' && Number.isFinite(+raw) ? +raw : raw;
  }
  return o;
}
export function parseCinema(search = '') {
  const q = new URLSearchParams(search), on = q.get('cinema') === '1';
  const seed = Number.isFinite(+q.get('cine_seed')) && q.get('cine_seed') !== null && q.get('cine_seed') !== '' ? +q.get('cine_seed') : DEFAULT_SEED;
  return { on, hold: on && q.get('cine_hold') === '1', seed, opts: on ? { ...CINE_DEFAULTS, ...parseOpts(q.get('cine_opt')) } : {} };
}

// ---- fast frø ----
export function makeRng(seed = DEFAULT_SEED) {         // mulberry32: liten, rask og lik overalt
  let s = seed >>> 0;
  const next = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  next.reseed = (n) => { s = (n >>> 0); };
  return next;
}
// Erstatter random på `target` (standard Math). Returnerer { reseed(n), restore() }.
export function installRandom(seed = DEFAULT_SEED, target = Math) {
  const orig = target.random, rng = makeRng(seed);
  target.random = rng;
  return { reseed: (n = seed) => rng.reseed(n), restore: () => { target.random = orig; }, rng };
}

// ---- lagring: i kinomodus skrives ingenting, og alt leses fra standardene + valgene over ----
export function cineStore(real, opts, on) {
  if (!on) return real;
  return { get: (k, d) => (Object.prototype.hasOwnProperty.call(opts, k) ? opts[k] : d), set: () => {} };
}

// ---- kamera ----
const NUM = (v) => typeof v === 'number' && Number.isFinite(v);
export const DEFAULT_FOV = 52;
// pose = { x, y, z, tx, ty, tz, fov }: kameraet står i (x,y,z) og ser mot (tx,ty,tz)
export function normPose(p, prev = null) {
  if (!p || typeof p !== 'object') return null;
  const base = prev || {}, o = {};
  for (const k of ['x', 'y', 'z', 'tx', 'ty', 'tz']) { const v = p[k] !== undefined ? p[k] : base[k]; if (!NUM(v)) return null; o[k] = v; }
  const f = p.fov !== undefined ? p.fov : base.fov !== undefined ? base.fov : DEFAULT_FOV;
  if (!NUM(f) || f < 5 || f > 140) return null;
  o.fov = f;
  if (Math.hypot(o.tx - o.x, o.ty - o.y, o.tz - o.z) < 1e-6) return null;       // samme sted som blikkpunktet: ingen retning
  return o;
}
export const ease = { linear: (t) => t, smooth: (t) => t * t * (3 - 2 * t), in: (t) => t * t, out: (t) => 1 - (1 - t) * (1 - t) };
export function lerpPose(a, b, t, e = 'linear') {      // lerpCam(fra, til, t): rett linje mellom to poser (kamerabane)
  const A = normPose(a), B = normPose(b); if (!A || !B) return null;
  const k = (ease[e] || ease.linear)(Math.max(0, Math.min(1, t))), o = {};
  for (const key of Object.keys(A)) o[key] = A[key] + (B[key] - A[key]) * k;
  return o;
}
// Blikkretning (som kameraet ser): yaw er vinkelen i vannrett plan (0 = mot +z, som figurens fx/fz), pitch er opp (+) eller ned (-)
export function poseLook(p) {
  const dx = p.tx - p.x, dy = p.ty - p.y, dz = p.tz - p.z, h = Math.hypot(dx, dz);
  return { yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, h), dist: Math.hypot(dx, dy, dz) };
}
// Følgekamera med valgte verdier rundt et mål (figuren): yaw/pitch/dist som i spillets eget kamera (kameraet står bak, i retning yaw fra målet)
export const FOLLOW_DEFAULT = Object.freeze({ dist: 9, yaw: 0.35, pitch: 0.3, height: 0.62 });
export function normFollow(o = {}, prev = FOLLOW_DEFAULT) {
  const r = { ...FOLLOW_DEFAULT, ...prev };
  for (const k of Object.keys(FOLLOW_DEFAULT)) if (o[k] !== undefined) { if (!NUM(o[k])) return null; r[k] = o[k]; }
  if (r.dist < 0.5 || r.dist > 200 || Math.abs(r.pitch) > 1.5) return null;
  return r;
}
export function followPose(hero, f, fov = DEFAULT_FOV) {
  const tx = hero.x, ty = hero.y + f.height, tz = hero.z, cp = Math.cos(f.pitch);
  return { x: tx + Math.sin(f.yaw) * cp * f.dist, y: ty + Math.sin(f.pitch) * f.dist, z: tz + Math.cos(f.yaw) * cp * f.dist, tx, ty, tz, fov };
}

// ---- figur ----
export const heroYaw = (p) => Math.atan2(p.fx, p.fz);          // blikkretning som vinkel (0 = mot +z)
export function normHero(h) {
  if (!h || typeof h !== 'object') return null;
  const o = {}; for (const k of ['x', 'y', 'z']) { if (!NUM(h[k])) return null; o[k] = h[k]; }
  if (h.yaw !== undefined) { if (!NUM(h.yaw)) return null; o.fx = Math.sin(h.yaw); o.fz = Math.cos(h.yaw); }
  return o;
}

// ---- bane fra boten: [t, x, y, z, state, fx, fz] per tikk (tools/cine_route.mjs) ----
export function traceLen(tr) { return Array.isArray(tr) ? tr.length : 0; }
export function traceAt(tr, i) {
  if (!traceLen(tr)) return null;
  const e = tr[Math.max(0, Math.min(tr.length - 1, Math.floor(i)))];
  const fx = NUM(e[5]) ? e[5] : 0, fz = NUM(e[6]) ? e[6] : 1;
  return { t: e[0], x: e[1], y: e[2], z: e[3], state: e[4], fx, fz, yaw: Math.atan2(fx, fz) };
}


// ---- props: enkle former som kan legges inn i scenen (speil, flaske, lapp, tablett ...). Ren normalisering; selve meshene bygges i cinema_view.js ----
export const PROP_SHAPES = Object.freeze(['box', 'cyl', 'sphere', 'plane', 'light', 'hero']);
// box/cyl/sphere: sx,sy,sz er mål (cyl: sx = diameter, sy = høyde, sz = diameter; senter i midten) · plane: sx = bredde, sy = høyde (vender mot +z; text tegnes på den)
// light: punktlys (color, intensity, dist) · hero: kopi av figuren som den står nå (sx,sy,sz = skala; negativ sz speilvender; ry = retning figuren ser; blink 0..1 lukker øynene)
export function normProp(p, prev = null) {
  if (!p || typeof p !== 'object') return null;
  const base = prev || { shape: 'box', x: 0, y: 0, z: 0, sx: 1, sy: 1, sz: 1, rx: 0, ry: 0, rz: 0, color: 0xcccccc, opacity: 1, emissive: 0, intensity: 1, dist: 0, blink: 0, text: '', tbg: 0xfff2b0, tfg: 0x222222 };
  const o = { ...base };
  if (p.shape !== undefined) { if (prev && p.shape !== prev.shape) return null; if (!PROP_SHAPES.includes(p.shape)) return null; o.shape = p.shape; }
  for (const k of ['x', 'y', 'z', 'sx', 'sy', 'sz', 'rx', 'ry', 'rz', 'opacity', 'emissive', 'intensity', 'dist', 'blink', 'color', 'tbg', 'tfg']) if (p[k] !== undefined) { if (!NUM(p[k])) return null; o[k] = p[k]; }
  if (p.text !== undefined) o.text = String(p.text).slice(0, 80);
  if (o.shape !== 'hero' && o.shape !== 'light' && (o.sx === 0 || o.sy === 0 || o.sz === 0)) return null;
  o.opacity = Math.max(0, Math.min(1, o.opacity)); o.blink = Math.max(0, Math.min(1, o.blink));
  return o;
}

// ---- hash av bildefiler (to renderinger skal gi like filer) ----
export function fnv1a(bytes) {           // streng eller Uint8Array
  let h = 0x811c9dc5;
  if (typeof bytes === 'string') for (let i = 0; i < bytes.length; i++) { h ^= bytes.charCodeAt(i) & 0xff; h = Math.imul(h, 0x01000193) >>> 0; }
  else for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193) >>> 0; }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// ---- det som skjules / stenges av i kinomodus (dokumentasjon og test) ----
export const HIDDEN_UI = ['hud', 'topband', 'goals', 'toast', 'cues', 'bubble', 'stam', 'offscreen', 'compass', 'hint', 'help', 'panel', 'start', 'story', 'introsw', 'introhint', 'win', 'stick', 'knob', 'btnGrab', 'btnCarry', 'btnCenter', 'btnMap', 'btnJump', 'more', 'bar', 'qbtn', 'qpop', 'minimap', 'ovdots', 'xhair', 'fps', 'guideEdge', 'wmark', 'wcross', 'floodVig', 'bossbar', 'infocard', 'soundPill', 'btnBuild', 'btnBuildSpan'];
// Kinomodus-CSS: alt på siden unntatt tegneflata og byggeskjermen (#bld) skjules. Byggeskjermen er innholdet når den filmes.
export const CINE_CSS = 'body.cinema>*:not(canvas):not(#bld){display:none!important}body.cinema{cursor:none}';
