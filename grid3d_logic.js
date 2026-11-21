// R129: 3D-bygging, kjerne (ren logikk: ingen DOM, ingen three.js, kjøres i node). Modellen for fagverk i tre dimensjoner; fysikken ligger i build_phys3.js. Ingen UI (kommer i R130).
//  - rommet har x (langs veien), y (opp) og z (dybde). Knuter står på et 3D-rutenett: x = x0 + i·trinn osv. Ankre (site.anchors) er faste knuter som ikke kan slettes eller flyttes.
//  - en stav er et avstandsbånd mellom to knuter, med lengde mellom MIN_LEN og maks; materialer som i grid_logic.js (tre, stål, tau, kabel; tall fra build_materials.js GRID_MAT). Samme to knuter kan bare ha én stav.
//  - har stedet en vei (site.road = { a, b }: to ankre på samme høyde og dybde) kan det ha DEKK: en kjede av tre-staver langs x mellom dem (gratis, kan ikke slettes), som lasten kjører på.
//  - 2D-bygging (grid_logic.js) er uendret; dette er en egen modell med egen kodeprefiks `TLM3D1.` (blandes aldri med `TLM1.`).
//  - bygget er G = { nodes: [{ id, x, y, z, fixed?, deck? }], rods: [{ id, a, b, mat, deck? }], n, r, deck? }
import { GRID_MATS, GRID_MAT, rodPrice } from './build_materials.js';
import { toB64, fromB64, fnv } from './build_logic.js';

export const STEP3 = 2, MIN_LEN = 1.2, MAX_LEN = 6.5, MAX_NODES = 40, MAX_RODS = 120;   // takene gjør en prøve rask (build_phys3.js)
export const CODE3_PREFIX = 'TLM3D1.', CODE3_MAX = 6000, CODE3_V = 1;
const r3 = (x) => Math.round(x * 1000) / 1000;
const same = (a, b) => Math.abs(a - b) < 1e-3;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const clone = (G) => JSON.parse(JSON.stringify(G));
export const gridClone3 = clone;

export const stepOf = (site) => (Number.isFinite(site?.step) && site.step > 0.4 ? site.step : STEP3);
export const maxLenOf = (site) => (Number.isFinite(site?.maxLen) && site.maxLen > MIN_LEN ? site.maxLen : MAX_LEN);
export const matsOf = (site) => (Array.isArray(site?.mats) && site.mats.length ? site.mats.filter((m) => GRID_MATS.includes(m)) : ['wood', 'steel', 'rope']);

// ---------- rutenettet ----------
export function lattice3(site) {
  const st = stepOf(site), out = [], [x0, x1] = site.x, [y0, y1] = site.y, [z0, z1] = site.z, a0 = site.anchors?.[0] || { x: x0, y: y0, z: z0 };
  const rng = (lo, hi, o) => { const a = Math.ceil((lo - o) / st - 1e-9), b = Math.floor((hi - o) / st + 1e-9), r = []; for (let k = a; k <= b; k++) r.push(r3(o + k * st)); return r; };
  for (const y of rng(y0, y1, a0.y)) for (const z of rng(z0, z1, a0.z)) for (const x of rng(x0, x1, a0.x)) out.push({ x, y, z });
  for (const a of site.anchors || []) if (!out.some((p) => same(p.x, a.x) && same(p.y, a.y) && same(p.z, a.z))) out.push({ x: r3(a.x), y: r3(a.y), z: r3(a.z) });
  return out;
}
export const onLattice = (site, p) => lattice3(site).some((q) => same(q.x, p.x) && same(q.y, p.y) && same(q.z, p.z));
// nærmeste rutepunkt til p, i laget z (valgfritt: bare dette laget), ellers null når det er lenger unna enn maxD
export function nearestPoint3(site, p, maxD = Infinity, layerZ = null) {
  let best = null, bd = maxD;
  for (const q of lattice3(site)) { if (layerZ != null && !same(q.z, layerZ)) continue; const d = dist(p, q); if (d <= bd) { bd = d; best = q; } }
  return best;
}

// ---------- dekk ----------
export const siteRoad = (site) => {
  const an = site?.anchors, r = site?.road; if (!an || !r || !an[r.a] || !an[r.b]) return null;
  const a = an[r.a], b = an[r.b]; if (!same(a.y, b.y) || !same(a.z, b.z) || Math.abs(a.x - b.x) < MIN_LEN) return null;
  return a.x < b.x ? { left: a, right: b } : { left: b, right: a };
};
function addDeck(G, site) {
  const rd = siteRoad(site); if (!rd) return G;
  const st = stepOf(site), idAt = (p) => G.nodes.find((n) => n.fixed && same(n.x, p.x) && same(n.y, p.y) && same(n.z, p.z)).id;
  const mid = lattice3(site).filter((p) => same(p.y, rd.left.y) && same(p.z, rd.left.z) && p.x > rd.left.x + 0.3 && p.x < rd.right.x - 0.3).sort((a, b) => a.x - b.x);
  let prev = idAt(rd.left), k = 1; const link = (to) => { G.rods.push({ id: 'dk' + k++, a: prev, b: to, mat: 'wood', deck: true }); prev = to; };
  mid.forEach((p, i) => { const n = { id: 'd' + (i + 1), x: p.x, y: p.y, z: p.z, deck: true }; G.nodes.push(n); link(n.id); });
  link(idAt(rd.right)); G.deck = true; void st; return G;
}
export function createGrid3(site, deck = false) {
  const G = { nodes: (site.anchors || []).map((a, i) => ({ id: 'a' + (i + 1), x: r3(a.x), y: r3(a.y), z: r3(a.z), fixed: true })), rods: [], n: 1, r: 1 };
  return deck ? addDeck(G, site) : G;
}

export const nodeOf = (G, id) => G.nodes.find((n) => n.id === id);
export const rodOf = (G, id) => G.rods.find((r) => r.id === id);
export const nodeAt = (G, p) => G.nodes.find((n) => same(n.x, p.x) && same(n.y, p.y) && same(n.z, p.z));
export const rodLen = (G, r) => { const a = nodeOf(G, r.a), b = nodeOf(G, r.b); return a && b ? dist(a, b) : 0; };
export const rodsAt = (G, id) => G.rods.filter((r) => r.a === id || r.b === id);
export const userRods = (G) => G.rods.filter((r) => !r.deck);
export const userNodes = (G) => G.nodes.filter((n) => !n.fixed && !n.deck);

// ---------- lovlighet ----------
// ligger en annen knute midt på stav a-b (staven ville gått rett gjennom den, også et anker)?
function passesThrough(G, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L2 = dx * dx + dy * dy + dz * dz; if (!L2) return false;
  for (const n of G.nodes) {
    if (n === a || n === b) continue;
    const t = ((n.x - a.x) * dx + (n.y - a.y) * dy + (n.z - a.z) * dz) / L2; if (t <= 0.02 || t >= 0.98) continue;
    if (Math.hypot(a.x + t * dx - n.x, a.y + t * dy - n.y, a.z + t * dz - n.z) < 0.2) return true;
  }
  return false;
}
// { ok } eller { ok: false, why: 'same' | 'short' | 'far' | 'dup' | 'over' | 'max' | 'ground' }
export function rodCheck3(G, aId, bId, maxLen = MAX_LEN, site = null) {
  const a = nodeOf(G, aId), b = nodeOf(G, bId); if (!a || !b || aId === bId) return { ok: false, why: 'same' };
  const L = dist(a, b);
  if (L < MIN_LEN) return { ok: false, why: 'short' };
  if (L > maxLen + 1e-6) return { ok: false, why: 'far' };
  if (G.rods.some((r) => (r.a === aId && r.b === bId) || (r.a === bId && r.b === aId))) return { ok: false, why: 'dup' };
  if (passesThrough(G, a, b)) return { ok: false, why: 'over' };
  if (site && site.floor != null && (a.y < site.floor - 1e-6 || b.y < site.floor - 1e-6)) return { ok: false, why: 'ground' };
  if (G.nodes.length > MAX_NODES || G.rods.length >= MAX_RODS) return { ok: false, why: 'max' };
  return { ok: true, len: L };
}

// ---------- redigering (alle skriver et steg i historikken; ANGRE = tilbake) ----------
export function createBuild3(site, deck = false) { return { site, rg: createGrid3(site, deck), history: [], gridDeck: deck }; }
const push = (B) => { B.history.push(clone(B.rg)); if (B.history.length > 60) B.history.shift(); };
export function g3Undo(B) { const h = B.history.pop(); if (!h) return false; B.rg = h; return true; }
export function g3Reset(B) { push(B); B.rg = createGrid3(B.site, !!B.gridDeck); return true; }
export function g3AddNode(B, p) {
  const G = B.rg; if (!onLattice(B.site, p)) return { ok: false, why: 'grid' };
  const ex = nodeAt(G, p); if (ex) return { ok: true, node: ex, existed: true };
  if (G.nodes.length >= MAX_NODES) return { ok: false, why: 'max' };
  push(B); const n = { id: 'n' + G.n++, x: r3(p.x), y: r3(p.y), z: r3(p.z) }; G.nodes.push(n); return { ok: true, node: n };
}
export function g3AddRod(B, aId, bId, mat) {
  const G = B.rg; if (!matsOf(B.site).includes(mat)) return { ok: false, why: 'mat' };
  const c = rodCheck3(G, aId, bId, maxLenOf(B.site), B.site); if (!c.ok) return c;
  push(B); const r = { id: 'r' + G.r++, a: aId, b: bId, mat }; G.rods.push(r); return { ok: true, rod: r };
}
export function g3RemoveRod(B, id) { const r = rodOf(B.rg, id); if (!r || r.deck) return false; push(B); B.rg.rods = B.rg.rods.filter((q) => q.id !== id); return true; }
export function g3RemoveNode(B, id) {
  const n = nodeOf(B.rg, id); if (!n || n.fixed || n.deck) return false; push(B);
  B.rg.rods = B.rg.rods.filter((r) => r.a !== id && r.b !== id); B.rg.nodes = B.rg.nodes.filter((q) => q.id !== id); return true;
}

// ---------- kostnad og stjerner ----------
export const rodCost3 = (G, r) => rodPrice(r.mat, rodLen(G, r));
export const cost3 = (G) => userRods(G).reduce((s, r) => s + rodCost3(G, r), 0);
export const withinBudget3 = (site, G) => !Number.isFinite(site?.budget) || cost3(G) <= site.budget;
// stjerner når prøven er bestått: 1 for å bestå, 2 og 3 for lavere kostnad (site.stars = [grense for 3, grense for 2])
export function stars3(site, G, passed) {
  if (!passed) return 0; const c = cost3(G), s = site?.stars || [];
  return Number.isFinite(s[0]) && c <= s[0] ? 3 : Number.isFinite(s[1]) && c <= s[1] ? 2 : 1;
}

// ---------- lagring og KODE ----------
export function snapshot3(G) { return { ...(G.deck ? { deck: true } : {}), nodes: userNodes(G).map((n) => [n.id, r3(n.x), r3(n.y), r3(n.z)]), rods: userRods(G).map((r) => [r.id, r.a, r.b, r.mat]) }; }
// bygger et rutenett ut av lagrede data: ugyldig innhold avvises (null)
export function fromSnapshot3(site, d) {
  if (!d || !Array.isArray(d.nodes) || !Array.isArray(d.rods)) return null;
  const G = createGrid3(site, !!d.deck), ml = maxLenOf(site), mats = matsOf(site);
  if (d.nodes.length > MAX_NODES || d.rods.length > MAX_RODS) return null;
  let n = 1, r = 1;
  for (const q of d.nodes) {
    if (!Array.isArray(q) || q.length !== 4 || typeof q[0] !== 'string' || !q.slice(1).every(Number.isFinite)) return null;
    const p = { x: q[1], y: q[2], z: q[3] }; if (!onLattice(site, p) || nodeAt(G, p) || nodeOf(G, q[0])) return null;
    G.nodes.push({ id: q[0], x: r3(p.x), y: r3(p.y), z: r3(p.z) }); const m = /^n(\d+)$/.exec(q[0]); if (m) n = Math.max(n, +m[1] + 1);
  }
  for (const q of d.rods) {
    if (!Array.isArray(q) || q.length !== 4 || typeof q[0] !== 'string' || !mats.includes(q[3])) return null;
    const c = rodCheck3(G, q[1], q[2], ml, site); if (!c.ok || rodOf(G, q[0])) return null;
    G.rods.push({ id: q[0], a: q[1], b: q[2], mat: q[3] }); const m = /^r(\d+)$/.exec(q[0]); if (m) r = Math.max(r, +m[1] + 1);
  }
  G.n = n; G.r = r; return G;
}
const ik = (x) => Math.round(x * 1000);
export function exportCode3(B) {
  const s = snapshot3(B.rg), body = toB64(JSON.stringify([CODE3_V, B.site.id, !!s.deck, s.nodes.map((n) => [n[0], ik(n[1]), ik(n[2]), ik(n[3])]), s.rods.map((r) => [r[0], r[1], r[2], GRID_MATS.indexOf(r[3])])]));
  const code = `${CODE3_PREFIX}${body}.${fnv(body)}`; return code.length <= CODE3_MAX ? code : null;
}
// { ok: true, G } eller { ok: false, why: 'tom' | 'lang' | 'format' | 'sum' | 'sted' | 'verdi' }
export function importCode3(code, site) {
  const bad = (why) => ({ ok: false, why });
  if (typeof code !== 'string') return bad('tom'); const s = code.replace(/\s+/g, ''); if (!s) return bad('tom');
  if (s.length > CODE3_MAX) return bad('lang');
  if (!s.startsWith(CODE3_PREFIX)) return bad('format');
  const parts = s.slice(CODE3_PREFIX.length).split('.'); if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !parts[1]) return bad('format');
  if (fnv(parts[0]) !== parts[1]) return bad('sum');
  let j; try { j = JSON.parse(fromB64(parts[0])); } catch { return bad('format'); }
  if (!Array.isArray(j) || j.length !== 5 || j[0] !== CODE3_V || typeof j[1] !== 'string' || typeof j[2] !== 'boolean' || !Array.isArray(j[3]) || !Array.isArray(j[4])) return bad('format');
  if (j[1] !== site.id) return bad('sted');
  if (j[3].length > MAX_NODES || j[4].length > MAX_RODS) return bad('verdi');
  const nodes = j[3].map((q) => (Array.isArray(q) && q.length === 4 && q.slice(1).every(Number.isInteger) ? [q[0], q[1] / 1000, q[2] / 1000, q[3] / 1000] : null)), rods = j[4].map((q) => (Array.isArray(q) && q.length === 4 && Number.isInteger(q[3]) && GRID_MATS[q[3]] ? [q[0], q[1], q[2], GRID_MATS[q[3]]] : null));
  if (nodes.includes(null) || rods.includes(null)) return bad('verdi');
  const G = fromSnapshot3(site, { deck: j[2], nodes, rods }); return G ? { ok: true, G } : bad('verdi');
}
export const matInfo3 = (m) => GRID_MAT[m];
