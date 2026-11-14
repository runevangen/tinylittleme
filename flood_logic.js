// R65: stigende vann i Nivå 4: delmål og veiledning tar hensyn til vannstanden. Ren logikk (ingen DOM/three, testes i test_flood.mjs).
// Visning ligger i flood_view.js, koblingen i main.js (floodFrame, nextTarget). Gjelder BARE når «Nivå 4: stigende vann» er på (variant.flood);
// vanlig vann («Av») og alle andre brett er uendret.
import { floodCfg, floodLevel, floodStep, WADE } from './variant.js';
import { goalAvailable, goalTarget } from './goals.js';
import { surfaceBelow } from './physics.js';

export const FG = {
  wet: 0.15,         // et mål regnes som under vann når det ligger mindre enn dette over vannflata
  dropMin: 1.2,      // nedhopp lavere enn dette (enheter) varsles ikke
  ahead: 0.9,        // hvor langt foran figuren vi ser etter kanten (enheter)
  shake: 0.07,       // kameraskjelv (enheter) like før man drukner, ganger styrke-valget
  highMs: 9000,      // hvor ofte «vannet står for høyt» gjentas i båndet
};

export const waterY = (floorY, level) => floorY + level;
export const isWet = (y, wl) => y < wl + FG.wet;
export const floodPct = (level, cfg) => (cfg && cfg.max > 0 ? Math.round(100 * Math.min(1, Math.max(0, level / cfg.max))) : 0);

// Kan delmålet nås tørt akkurat nå? ctx: { crumbs, stomps } (antall så langt). Klare delmål spørres ikke om.
export function goalOpen(L, g, wl, ctx = {}) {
  if (!g) return false;
  const dry = (y) => !isWet(y, wl);
  if (g.type === 'reach') return dry(g.top);
  if (g.type === 'crumbs') return (L.crumbList || []).filter((c) => !c.got && dry(c.y - 0.8)).length >= Math.max(1, g.n - (ctx.crumbs || 0));
  if (g.type === 'stomp') return (L.antList || []).filter((a) => a.alive && dry(a.y)).length >= 1;
  return true;       // gåter, dører, sjef og flagg påvirkes ikke av vannet her
}

// Den høyeste flata på ruta som er over vannet: dit pila peker når ingenting er tørt. { x, y, z, id } eller null.
export function refuge(L, wl, p) {
  let best = null;
  for (const w of L.route || []) if (!w.grip && !w.via && !isWet(w.top, wl) && (!best || w.top > best.top)) best = w;
  return best ? { x: Math.max(best.x0, Math.min(best.x1, p.x)), y: best.top, z: Math.max(best.z0, Math.min(best.z1, p.z)), id: best.id } : null;
}

// Velg aktivt delmål når vannet er på: første ikke-klare delmål (rekkefølgen i `after`-kjeden følges) som kan nås tørt, og pila dit (bare tørre mål).
// Returnerer { goal, target, blocked: [id], refuge }. goal === null og refuge satt betyr «alt er under vann: klatre høyere».
export function pickGoal(L, p, wl, ctx = {}) {
  const blocked = [], dry = (y) => !isWet(y, wl);
  for (const g of L.goalList || []) {
    if (g.done || !goalAvailable(L, g)) continue;
    if (!goalOpen(L, g, wl, ctx)) { blocked.push(g.id); continue; }
    return { goal: g, target: goalTarget(L, g, p, { dry }), blocked, refuge: null };
  }
  // ingen åpne delmål. Står noe igjen (kjeden stopper på et vått delmål), pek mot høyeste trygge flate
  const left = (L.goalList || []).some((g) => !g.done);
  return { goal: null, target: null, blocked, refuge: left ? refuge(L, wl, p) : null };
}

// Ville nedhoppet fra figuren lande i vann? Ser rett under figuren og litt foran (retningen fx, fz). Returnerer { drop, landY } eller null.
export function dropIntoWater(L, p, wl) {
  if (!p || p.onGround === false) return null;
  const ax = p.x + (p.fx || 0) * FG.ahead, az = p.z + (p.fz || 0) * FG.ahead;
  const s = surfaceBelow(L, ax, p.y + 0.2, az, 0.2);
  if (s && p.y - s.top < FG.dropMin) return null;             // fortsatt fast grunn foran
  const landY = s ? s.top : (L.deathY ?? -Infinity);
  const drop = p.y - landY;
  return drop >= FG.dropMin && isWet(landY, wl) && landY > (L.deathY ?? -Infinity) ? { drop, landY } : null;
}

// Rødt varsel før man drukner. under = sekunder med hodet under vann, grace = fristen. frac 0..1, skjelv i enheter (0 uten varsel).
export function drownAlert(under, grace) {
  const frac = grace > 0 ? Math.min(1, Math.max(0, under / grace)) : 0;
  return { on: under > 0.01, frac, left: Math.max(0, grace - under), shake: frac > 0.35 ? FG.shake * ((frac - 0.35) / 0.65) : 0 };
}
export const shakeOffset = (amp, t) => (amp > 0 ? [amp * Math.sin(t * 61), amp * 0.6 * Math.sin(t * 47 + 1.3)] : [0, 0]);
// piper én gang per hele sekund under vann
export const beepDue = (prevUnder, under) => under > prevUnder && Math.floor(under * 2) > Math.floor(prevUnder * 2);

// Tekstnøkler for båndet: i prioritert rekkefølge første som gjelder.
export function bandKeyFor({ under, grace, drop, blocked, cfgOn }) {
  if (!cfgOn) return null;
  if (under > 0.01) return { key: 'water.deep', danger: true };
  if (drop) return { key: 'water.below', danger: true };
  if (blocked) return { key: 'water.high', danger: false };
  return null;
}

// «💧 40 %» mens vann er på
export const levelBadge = (level, cfg) => (cfg ? `💧 ${floodPct(level, cfg)} %` : '');

// ---------- bot: kan delmålene klares før vannet stopper deg? ----------
// trace: [[t, x, y, z, state], ...] fra tools/bot.mjs (ruta uten vann). Vannet gjør at figuren vader (WADE.speed), så tiden strekkes konservativt med 1/WADE.speed.
// Returnerer { drowned, maxUnder, end: { t, level }, times: { goalId: sekund | null }, open: { goalId: bool } }
export function simulateFlood(L, trace, mode, { floorY = 0, twist = {}, mult = 1, slow = 1 / WADE.speed, ctx = {} } = {}) {
  const cfg = floodCfg(mode, twist, mult); if (!cfg) return null;
  const stretch = (t) => t * slow;
  let under = 0, prevT = 0, drowned = false, maxUnder = 0, ok = true;
  const times = {};
  for (const g of L.goalList || []) times[g.id] = null;
  for (const [t0, x, y, z] of trace) {
    const t = stretch(t0), dt = t - prevT; prevT = t;
    const lv = floodLevel(t, cfg), st = floodStep(under, dt, y, floorY, lv, cfg); under = st.under; maxUnder = Math.max(maxUnder, under);
    if (st.drowned) { drowned = true; ok = false; }
    for (const g of L.goalList || []) if (g.type === 'reach' && times[g.id] === null && Math.abs(y - g.top) < 0.4 && x > g.x0 - 0.3 && x < g.x1 + 0.3 && z > g.z0 - 0.3 && z < g.z1 + 0.3) times[g.id] = t;
  }
  const end = { t: prevT, level: floodLevel(prevT, cfg) };
  return { drowned, ok, maxUnder, end, times, cfg };
}
