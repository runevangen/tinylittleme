// Nivå 4–6 som egne rom (R12): stemning (kveld/natt), fargepalett, rekvisitter og én vri per rom.
// Ren logikk uten three (testes i node, test_variant.mjs). Tegningen ligger i variant_view.js.
// Dataene kommer fra `variant` i scenen/brettet (laget av tools/make_variants.mjs):
//   { mood: 'evening'|'night'|'dusk', twist: { type: 'water'|'lights'|'train', ... }, props: [{ type, x, z, ... }] }
const rgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255].map((v) => v / 255);
const hex = (c) => (Math.round(c[0] * 255) << 16) | (Math.round(c[1] * 255) << 8) | Math.round(c[2] * 255);
const mix = (a, b, t) => a + (b - a) * t;
const mixC = (a, b, t) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => mix(v, B[i], t))); };

// Stemninger: multiplikatorer på spillets vanlige lys (grade.js), pluss himmelfarge og hvor mye hjelmlykta lyser (0..1).
export const MOODS = {
  day:     { bg: 0xcbbfae, sunColor: null, sunMul: 1, hemiMul: 1, envMul: 1, expMul: 1, lamp: 0, rays: 1, win: 0xc4cfe0, fill: 1, hemiSky: null, hemiGround: null },
  evening: { bg: 0xe9a070, sunColor: 0xff9a4a, sunMul: 0.8, hemiMul: 0.75, envMul: 0.7, expMul: 1.0, lamp: 0, rays: 1.4, win: 0xff9c5e, fill: 0.8, hemiSky: 0xff9ab0, hemiGround: 0x8a4a5a },
  dusk:    { bg: 0x9a7fb0, sunColor: 0xffb070, sunMul: 0.55, hemiMul: 0.7, envMul: 0.6, expMul: 1.0, lamp: 0, rays: 0.6, win: 0x8a78c8, fill: 0.8, hemiSky: 0xa090e0, hemiGround: 0x6a4a5a },
  night:   { bg: 0x141c38, sunColor: 0x7f9cff, sunMul: 0.16, hemiMul: 0.3, envMul: 0.22, expMul: 0.95, lamp: 1, rays: 0, win: 0x1b2a5c, fill: 0.2, hemiSky: 0x3a4c9a, hemiGround: 0x2a2440 },
  dark:    { bg: 0x0e1226, sunColor: 0x6a86e8, sunMul: 0.1, hemiMul: 0.2, envMul: 0.14, expMul: 0.95, lamp: 1, rays: 0, win: 0x121a3a, fill: 0.12, hemiSky: 0x2a3a80, hemiGround: 0x1e1a30 },
};
export function moodParams(name) { return MOODS[name] || MOODS.day; }
const COLOR_KEYS = ['bg', 'win', 'sunColor', 'hemiSky', 'hemiGround'];
// Blandet stemning: t = 0 gir a, t = 1 gir b.
export function blendMood(a, b, t) {
  const A = moodParams(a), B = moodParams(b), o = {};
  for (const k of Object.keys(MOODS.day)) {
    const x = A[k], y = B[k];
    if (COLOR_KEYS.includes(k)) o[k] = x !== null && y !== null ? mixC(x, y, t) : (t < 0.5 ? x : y);
    else o[k] = mix(x, y, t);
  }
  return o;
}

// Vri: vann som stiger og synker. cfg = { max (enheter), dry, rise, hold, drain } i sekunder; én runde = summen.
export const WATER = { max: 2.6, dry: 16, rise: 9, hold: 6, drain: 9 };
export function waterCfg(c = {}) { return { ...WATER, ...c }; }
const smooth = (x) => x * x * (3 - 2 * x);
export function waterLevel(t, cfg) {
  const c = waterCfg(cfg), T = c.dry + c.rise + c.hold + c.drain;
  let u = ((t % T) + T) % T;
  if (u < c.dry) return 0;
  u -= c.dry;
  if (u < c.rise) return c.max * smooth(u / c.rise);
  u -= c.rise;
  if (u < c.hold) return c.max;
  u -= c.hold;
  return c.max * (1 - smooth(Math.min(1, u / c.drain)));
}
// Vannfase for logg/melding: 'tørr' | 'stiger' | 'full' | 'synker'
export function waterPhase(t, cfg) {
  const c = waterCfg(cfg), T = c.dry + c.rise + c.hold + c.drain, u = ((t % T) + T) % T;
  return u < c.dry ? 'tørr' : u < c.dry + c.rise ? 'stiger' : u < c.dry + c.rise + c.hold ? 'full' : 'synker';
}
// Er føttene under vannflata? (floorY = gulvhøyde.) Da vader figuren: tregere og mister krefter.
export function isWading(footY, floorY, level, margin = 0.1) { return level > 0.15 && footY < floorY + level - margin; }
export const WADE = { speed: 0.55, drain: 0.7 };   // fartsfaktor og kraft-tap per sekund

// R42: stigende vann (valgfri vanskelighetsgrad i nivå 4). Vannet står stille et par sekunder, så stiger det jevnt (enheter per sekund) opp til `max` og blir stående.
// Står hodet under vann lenger enn `grace` sekunder, druknet du: tilbake til lagringspunktet, og vannet starter på nytt. Rømme = klatre høyere enn vannet kommer (kurv, badekåpe, knaggrekke, trapp).
export const FLOOD_MODES = ['av', 'rolig', 'vanlig', 'rask'];
export const FLOOD = {
  rolig:  { delay: 30, rate: 0.10 },
  vanlig: { delay: 18, rate: 0.16 },
  rask:   { delay: 10, rate: 0.26 },
  max: 14, depth: 1.1, grace: 2.5,                // 14 enheter = 70 cm: kurven (60 cm) går under, knaggrekka (135 cm) og trappa over
};
// Gyldig innstilling → { delay, rate, max, depth, grace } (rate ganges med `mult` fra admin-valget), ellers null (= av).
export function floodCfg(mode, twist = {}, mult = 1) {
  const m = FLOOD[mode]; if (!m || !FLOOD_MODES.includes(mode) || mode === 'av') return null;
  return { delay: m.delay, rate: m.rate * (mult > 0 ? mult : 1), max: twist.flood?.max ?? FLOOD.max, depth: FLOOD.depth, grace: FLOOD.grace };
}
export function floodLevel(t, cfg) { return cfg ? Math.min(cfg.max, Math.max(0, t - cfg.delay) * cfg.rate) : 0; }
export function floodPhase(t, cfg) { return !cfg ? 'av' : t < cfg.delay ? 'tørr' : floodLevel(t, cfg) >= cfg.max ? 'full' : 'stiger'; }
// Ett steg: footY/floorY = føttene og gulvet, level = vannstand over gulvet, `under` = sekunder med hodet under vann så langt.
// Returnerer { under, drowned, warn } der warn = hodet er under vann nå (varsel), drowned = fristen er ute.
export function floodStep(under, dt, footY, floorY, level, cfg) {
  if (!cfg) return { under: 0, drowned: false, warn: false };
  const head = level - (footY - floorY) > cfg.depth;
  const u = head ? under + dt : Math.max(0, under - dt * 2);
  return { under: u, drowned: u >= cfg.grace, warn: head };
}

// Vri: lyset slås av. cfg = { on, off, blink } i sekunder. Gir 1 (lys) og 0 (mørkt), med blink før det slukkes og før det tennes.
export const LIGHTS = { on: 15, off: 8, blink: 1.0 };
export function lightsCfg(c = {}) { return { ...LIGHTS, ...c }; }
export function lightLevel(t, cfg) {
  const c = lightsCfg(cfg), T = c.on + c.off, u = ((t % T) + T) % T;
  if (u < c.on - c.blink) return 1;
  if (u < c.on) { const k = (u - (c.on - c.blink)) / c.blink; return k < 0.3 ? 0.2 : k < 0.5 ? 1 : k < 0.7 ? 0.1 : 0; }
  if (u < T - c.blink) return 0;
  const k = (u - (T - c.blink)) / c.blink;
  return k < 0.5 ? 0 : k < 0.65 ? 0.8 : k < 0.8 ? 0.1 : 1;
}
export function lightsPhase(t, cfg) { const c = lightsCfg(cfg), T = c.on + c.off; return ((t % T) + T) % T < c.on ? 'lys' : 'mørkt'; }

// Hele stemningen akkurat nå (t = sekunder): grunnstemningen, blandet mot mørk stemning når lyset er slått av.
export function moodAt(variant, t, { moods = true, twists = true } = {}) {
  if (!variant || !moods) return { ...MOODS.day, w: 0 };
  const base = variant.mood || 'day';
  if (twists && variant.twist?.type === 'lights') return { ...blendMood('dark', base, lightLevel(t, variant.twist)), w: 1 };
  return { ...moodParams(base), w: 1 };
}

export const PROP_TYPES = ['rug', 'duck', 'track', 'stars'];
// Gyldig variant? Returnerer feiltekster (tom liste = ok). Brukes av tester.
export function checkVariant(v) {
  const e = [];
  if (!v || typeof v !== 'object') return ['variant mangler'];
  if (!MOODS[v.mood] || v.mood === 'day') e.push(`ukjent stemning «${v.mood}»`);
  if (!v.twist || !['water', 'lights', 'train'].includes(v.twist.type)) e.push('mangler vri (water|lights|train)');
  for (const p of v.props || []) if (!PROP_TYPES.includes(p.type)) e.push(`ukjent rekvisitt «${p.type}»`);
  return e;
}
