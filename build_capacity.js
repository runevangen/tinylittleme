// R49a1: «Tåler X»-måler for byggeskjermen. Ren logikk (ingen DOM, ingen three.js, kjøres i node).
// capacity(def, opts): setter en stabel med klosser midt på spennet (eller der du sier, opts.u) og øker antallet til en del brekker. Svaret er «tåler ca. N klosser».
// Alt går gjennom samme deterministiske simulering som prøven (build_phys.js, fast tidssteg, testfiguren står stille), så samme bygg gir alltid samme tall.
// Halveringssøk (≈ 5 simuleringer, ikke 16): brudd er monotont i antall klosser for en gitt posisjon.
import { createSim, siteBoxes, DT } from './build_phys.js';
import { partPoints, PR } from './build_logic.js';

export const CAP_MAX = 16;          // flere enn dette viser vi som «16+»
export const CAP_SECS = 3;          // hvor lenge hver prøvelast får stå
export const CAP_SETTLE = 12, CAP_SAG = 1.0;   // R49a2: etter 12 steg måles første kloss; synker den mer enn 1 enhet etterpå har bygget gitt etter
export const CAP_BLOCK_H = 1.5;     // en kloss er 1,5 enheter høy (se PART_TYPES.block)

// midt i det bredeste gapet mellom dekkene (der en bro ligger); uten gap: midt på stedet
export function gapCenter(site) {
  const bx = siteBoxes(site).sort((a, b) => a.x0 - b.x0); let best = null;
  for (let i = 0; i + 1 < bx.length; i++) { const g = bx[i + 1].x0 - bx[i].x1; if (g > 0 && (!best || g > best.g)) best = { g, u: (bx[i].x1 + bx[i + 1].x0) / 2 }; }
  return best ? best.u : 0;
}
// øverste flate under lasten ved u (deler og dekk), eller null om det bare er luft
export function surfaceAt(def, u, half = 0.8) {
  let top = null;
  for (const p of def.placed || []) for (const q of partPoints(p)) if (Math.abs(q.u - u) <= half) top = Math.max(top ?? -Infinity, q.v + PR);
  for (const b of siteBoxes(def.site)) if (u > b.x0 - half && u < b.x1 + half) top = Math.max(top ?? -Infinity, b.y1);
  return top;
}
// bryter bygget med k klosser på? (true = alt holder). Brudd = en del brekker, en kobling ryker, eller noe faller ned i gapet.
export function holds(def, k, opts = {}) {
  const u = opts.u ?? gapCenter(def.site), top = surfaceAt(def, u);
  if (top === null) return k === 0;
  const load = Array.from({ length: k }, (_, i) => ({ id: '_cap' + i, type: 'block', u, v: top + CAP_BLOCK_H / 2 + 0.02 + CAP_BLOCK_H * i, rot: 0 }));
  const sim = createSim({ site: def.site, placed: [...(def.placed || []), ...load], links: def.links || [] }, { strength: opts.strength ?? 1, hold: true });
  const n = Math.round((opts.secs ?? CAP_SECS) / DT), lowId = '_cap0'; let v0 = null;
  const lowV = () => sim.pose().parts.find((p) => p.id === lowId)?.v ?? null;
  for (let i = 0; i < n; i++) { sim.step(); for (const e of sim.drain()) if (e.type === 'break' || e.type === 'linkbreak') return false; if (i === CAP_SETTLE) v0 = lowV(); }
  if (v0 !== null && lowV() !== null && v0 - lowV() > CAP_SAG) return false;      // R49a2: en konstruksjon som gir etter (firkant uten diagonal) tåler ikke lasten, selv om ingenting brekker
  return !sim.pose().parts.some((p) => (p.kind === 'rect' ? p.v : p.pts.reduce((m, q) => Math.min(m, q.v), 99)) < -2);   // faller noe i gapet (en bro som ikke når over, last som sklir av), holder det ikke
}
// {n, max, at}: n = høyeste antall klosser som holder (0..max), at = posisjon. max = tak (da holder alt vi tester)
export function capacity(def, opts = {}) {
  const max = opts.max ?? CAP_MAX, u = opts.u ?? gapCenter(def.site);
  if (!(def.placed || []).length) return { n: 0, max, at: u, capped: false, sims: 0 };
  let lo = 0, hi = max + 1, sims = 0;      // lo holder (0 holder alltid), hi holder ikke
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; sims++; if (holds(def, mid, { ...opts, u })) lo = mid; else hi = mid; }
  return { n: lo, max, at: u, capped: lo >= max, sims };
}
// tekst til visning: «ca. 3 klosser» / «16+ klosser»
export function capacityText(c, T) {
  if (!c) return '';
  if (!c.n) return T('build.capNone');
  return c.capped ? T('build.capMax', { n: c.n }) : T('build.cap', { n: c.n });
}
