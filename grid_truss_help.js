// R122: fagverk-hjelp i rutenett-bygging: forslag til trekant og til diagonal. Ren logikk (ingen DOM, ingen three.js; testes i node: test_trusshelp.mjs).
// Hjelpen legger bare til lovlige staver (samme sjekker som ellers: rodCheck, maks lengde, antall), ikke over budsjett og ikke gjennom eksisterende staver uten knute.
// Den gjør ingenting av seg selv: spilleren trykker TREKANT eller DIAGONAL. Ett ANGRE tar bort et helt forslag (pushHist én gang).
import { GRID_MATS, rodPrice } from './build_materials.js';
import { pushHist } from './build_logic.js';
import { latticePoints, gridStep, nodeOf, nodeAt, rodOf, rodCheck, derive, maxLenOf, MIN_LEN, MAX_NODES, MAX_RODS } from './grid_logic.js';

export const TH = {
  perSide: 2,          // høyst så mange forslag over og så mange under staven
  minHeightK: 0.4,     // trekantens høyde må være minst så mange rutesteg (ellers er den nesten flat)
  minQuadK: 0.5,       // en firkant må ha areal minst så mange ruter (ellers er den flat)
  nearRod: 0.2,        // et nytt punkt midt på en stav er ikke lov (enheter)
  key: 'tlm.trh.off',  // ⋯: «Trekanthjelp av» (per enhet)
};
export const MODES = ['auto', 'on', 'off'];
export const normMode = (v) => (MODES.includes(v) ? v : 'auto');
// innstillingen buildtruss2: auto = på for Nybegynner og Medium, av på Ekspert; on = alltid; off = aldri (Ekspert får den bare når spilleren selv slår den på)
export const trussOn = ({ mode, expert }) => { const m = normMode(mode); return m === 'on' || (m === 'auto' && !expert); };
// skal knappene vises nå? (hjelpen er på, rutenett-modus, ikke under prøven, og ikke skjult i ⋯)
export const trussShow = ({ on, grid, sim, hidden }) => !!on && !!grid && !sim && !hidden;

const EPS = 1e-6, r3 = (x) => Math.round(x * 1000) / 1000;
const cross = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

// ---------- geometri ----------
// krysser (a1-a2) og (b1-b2) hverandre midt i begge (ikke i en felles ende)?
export function segCross(a1, a2, b1, b2) {
  const d1 = cross(a1.u, a1.v, a2.u, a2.v, b1.u, b1.v), d2 = cross(a1.u, a1.v, a2.u, a2.v, b2.u, b2.v), d3 = cross(b1.u, b1.v, b2.u, b2.v, a1.u, a1.v), d4 = cross(b1.u, b1.v, b2.u, b2.v, a2.u, a2.v);
  return ((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) && ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS));
}
// avstand fra punkt til et linjestykke
function distSeg(p, a, b) {
  const dx = b.u - a.u, dy = b.v - a.v, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p.u - a.u) * dx + (p.v - a.v) * dy) / L2));
  return Math.hypot(a.u + t * dx - p.u, a.v + t * dy - p.v);
}
// ville en ny stav fra a til b gå gjennom (krysse eller ligge oppå) en eksisterende stav uten knute? skip = staver som hører til endene (felles knute er lov)
export function wouldCross(G, a, b, skipIds = []) {
  for (const r of G.rods) {
    if (skipIds.includes(r.id)) continue;
    const p = nodeOf(G, r.a), q = nodeOf(G, r.b); if (!p || !q) continue;
    const share = (n) => n === p || n === q || (Math.abs(n.u - p.u) < 1e-3 && Math.abs(n.v - p.v) < 1e-3) || (Math.abs(n.u - q.u) < 1e-3 && Math.abs(n.v - q.v) < 1e-3);
    if (share(a) || share(b)) {
      // felles ende: bare lov hvis stavene ikke ligger oppå hverandre (parallelle og overlappende)
      const o = share(a) ? b : a, e = share(a) ? a : b, f = (Math.abs(e.u - p.u) < 1e-3 && Math.abs(e.v - p.v) < 1e-3) ? q : p;
      if (Math.abs(cross(e.u, e.v, o.u, o.v, f.u, f.v)) < EPS && ((o.u - e.u) * (f.u - e.u) + (o.v - e.v) * (f.v - e.v)) > 0) return true;
      continue;
    }
    if (segCross(a, b, p, q)) return true;
  }
  return false;
}

// ---------- det som er valgt ----------
// grunnlinjen for TREKANT: en valgt stav, ellers de to sist valgte knutene (prev = forrige knute, sel = nåværende). → { a, b, rod|null } (a, b = knute-id) eller null
export function baseOf(G, { selNode = null, selRod = null, prev = null } = {}) {
  if (!G) return null;
  if (selRod) { const r = rodOf(G, selRod); return r && nodeOf(G, r.a) && nodeOf(G, r.b) ? { a: r.a, b: r.b, rod: r.id } : null; }
  if (selNode && prev && selNode !== prev && nodeOf(G, selNode) && nodeOf(G, prev)) {
    const r = G.rods.find((q) => (q.a === prev && q.b === selNode) || (q.a === selNode && q.b === prev));
    return { a: prev, b: selNode, rod: r ? r.id : null };
  }
  return null;
}

// ---------- TREKANT-forslag ----------
// kandidat: { u, v, nodeId|null, side: 'over'|'under', lenA, lenB, cost (inkl. grunnlinje om den mangler), score, needBase }
// opt: { budgetLeft: tall|null (resten av budsjettet; null = ingen grense) }. → { list, why } der why er '' når det finnes forslag, ellers 'base' | 'geom' | 'budget' | 'full'
export function trianglesFor(B, aId, bId, mat, opt = {}) {
  const G = B?.rg, a = G && nodeOf(G, aId), b = G && nodeOf(G, bId);
  if (!a || !b || aId === bId || !GRID_MATS.includes(mat)) return { list: [], why: 'base' };
  const maxLen = maxLenOf(B), st = gridStep(B.site), base = G.rods.find((r) => (r.a === aId && r.b === bId) || (r.a === bId && r.b === aId)) || null;
  const Lab = Math.hypot(a.u - b.u, a.v - b.v), left = Number.isFinite(opt.budgetLeft) ? opt.budgetLeft : Infinity;
  let baseCost = 0;
  if (!base) {   // grunnlinjen finnes ikke: den må selv være lovlig, og kommer med i prisen
    const c = rodCheck(G, aId, bId, maxLen); if (!c.ok || wouldCross(G, a, b)) return { list: [], why: c.why === 'max' ? 'full' : 'base' };
    baseCost = rodPrice(mat, Lab);
  }
  if (G.nodes.length >= MAX_NODES || G.rods.length + (base ? 2 : 3) > MAX_RODS) return { list: [], why: 'full' };
  const raw = [];
  for (const p of latticePoints(B.site)) {
    const h = cross(a.u, a.v, b.u, b.v, p.u, p.v) / (Lab || 1);   // fortegn = side, |h| = høyde
    if (Math.abs(h) < TH.minHeightK * st) continue;
    const ex = nodeAt(G, p.u, p.v);
    const la = Math.hypot(a.u - p.u, a.v - p.v), lb = Math.hypot(b.u - p.u, b.v - p.v);
    if (la < MIN_LEN || lb < MIN_LEN || la > maxLen + 1e-6 || lb > maxLen + 1e-6) continue;
    const t = ex || { id: '_t', u: p.u, v: p.v };
    if (!ex) {   // et nytt punkt skal ikke ligge midt på en stav
      if (G.rods.some((r) => { const q1 = nodeOf(G, r.a), q2 = nodeOf(G, r.b); return q1 && q2 && distSeg(p, q1, q2) < TH.nearRod; })) continue;
      G.nodes.push(t);
    }
    let okRods = true;
    try {
      if (!rodCheck(G, aId, t.id, maxLen).ok || !rodCheck(G, bId, t.id, maxLen).ok) okRods = false;
      else if (wouldCross(G, a, t) || wouldCross(G, b, t)) okRods = false;
    } finally { if (!ex) G.nodes.pop(); }
    if (!okRods) continue;
    const sides = [Lab, la, lb], score = Math.max(...sides) / Math.min(...sides) - 1;   // 0 = likesidet
    raw.push({ u: p.u, v: p.v, nodeId: ex ? ex.id : null, side: h > 0 ? 'over' : 'under', lenA: la, lenB: lb, cost: baseCost + rodPrice(mat, la) + rodPrice(mat, lb), score, needBase: !base });
  }
  if (!raw.length) return { list: [], why: 'geom' };
  const fit = raw.filter((c) => c.cost <= left + 1e-9);
  if (!fit.length) return { list: [], why: 'budget' };
  const ord = (x, y) => x.score - y.score || x.cost - y.cost || (x.side === 'over' ? -1 : 1) - (y.side === 'over' ? -1 : 1) || x.u - y.u || x.v - y.v;
  const pick = [];
  for (const side of ['over', 'under']) pick.push(...fit.filter((c) => c.side === side).sort(ord).slice(0, TH.perSide));
  return { list: pick.sort(ord), why: '' };
}

// legg til trekanten: (grunnlinje om den mangler), ny knute (om punktet er tomt) og to staver; ett ANGRE-steg. → { ok, rods: [id], node, cost } eller { ok: false, why }
export function addTriangle(B, aId, bId, cand, mat, opt = {}) {
  const G = B?.rg; if (!G || !cand) return { ok: false, why: 'base' };
  const fresh = trianglesFor(B, aId, bId, mat, opt).list.find((c) => Math.abs(c.u - cand.u) < 1e-3 && Math.abs(c.v - cand.v) < 1e-3);
  if (!fresh) return { ok: false, why: 'illegal' };   // kandidaten er ikke lenger lovlig (bygget har endret seg, eller budsjettet er brukt)
  pushHist(B);
  const ids = []; let node = nodeAt(G, fresh.u, fresh.v);
  if (fresh.needBase) { const r = { id: 'st' + G.r++, a: aId, b: bId, mat }; G.rods.push(r); ids.push(r.id); }
  if (!node) { node = { id: 'kn' + G.n++, u: fresh.u, v: fresh.v }; G.nodes.push(node); }
  for (const e of [aId, bId]) { const r = { id: 'st' + G.r++, a: e, b: node.id, mat }; G.rods.push(r); ids.push(r.id); }
  derive(B); return { ok: true, rods: ids, node: node.id, newNode: !fresh.nodeId, cost: fresh.cost };
}

// ---------- DIAGONAL-forslag ----------
// firkanter uten diagonal: fire knuter i en sløyfe av fire staver (ingen stav mellom de to motstående parene), flate firkanter og selvkryssende hoppes over.
// → [{ nodes: [a, b, c, d] (rundt), rods: [4 stav-id], area }] i fast rekkefølge (sortert på knute-id)
export function findQuads(G, step = 2) {
  const out = [], seen = new Set(); if (!G) return out;
  const adj = new Map(G.nodes.map((n) => [n.id, new Map()]));
  for (const r of G.rods) { adj.get(r.a)?.set(r.b, r.id); adj.get(r.b)?.set(r.a, r.id); }
  const linked = (x, y) => adj.get(x)?.has(y);
  for (const bN of G.nodes) {
    const nb = [...adj.get(bN.id).keys()];
    for (let i = 0; i < nb.length; i++) for (let j = i + 1; j < nb.length; j++) {
      const a = nb[i], c = nb[j]; if (linked(a, c)) continue;   // a og c er i hver sin ende: ingen diagonal mellom dem
      for (const d of adj.get(a).keys()) {
        if (d === bN.id || d === c || !linked(d, c) || linked(d, bN.id)) continue;   // d er den fjerde knuten; heller ingen diagonal b-d
        const ids = [a, bN.id, c, d], key = [...ids].sort().join('|'); if (seen.has(key)) continue; seen.add(key);
        const P = ids.map((id) => nodeOf(G, id)); if (P.some((p) => !p)) continue;
        let area = 0; for (let k = 0; k < 4; k++) { const p = P[k], q = P[(k + 1) % 4]; area += p.u * q.v - q.u * p.v; } area = Math.abs(area) / 2;
        const turn = P.map((p, k) => cross(p.u, p.v, P[(k + 1) % 4].u, P[(k + 1) % 4].v, P[(k + 2) % 4].u, P[(k + 2) % 4].v));
        const flat = turn.some((t) => Math.abs(t) < EPS);   // ikke-konvekse firkanter er tillatt, selvkryssende og flate ikke
        if (area < TH.minQuadK * step * step || flat || segCross(P[0], P[1], P[2], P[3]) || segCross(P[1], P[2], P[3], P[0])) continue;
        out.push({ nodes: ids, rods: [adj.get(a).get(bN.id), adj.get(bN.id).get(c), adj.get(c).get(d), adj.get(d).get(a)], area, key });
      }
    }
  }
  return out.sort((x, y) => (x.key < y.key ? -1 : 1));
}
// billigste lovlige diagonal i valgt materiale: { a, b, len, cost } eller null; why når ingen er lov: 'geom' | 'budget' | 'full'
export function diagonalFor(B, quad, mat, opt = {}) {
  const G = B?.rg; if (!G || !quad || !GRID_MATS.includes(mat)) return { diag: null, why: 'geom' };
  if (G.rods.length >= MAX_RODS) return { diag: null, why: 'full' };
  const left = Number.isFinite(opt.budgetLeft) ? opt.budgetLeft : Infinity, [n0, n1, n2, n3] = quad.nodes, maxLen = maxLenOf(B), opts = [];
  for (const [x, y] of [[n0, n2], [n1, n3]]) {
    const p = nodeOf(G, x), q = nodeOf(G, y); if (!p || !q) continue;
    if (!rodCheck(G, x, y, maxLen).ok || wouldCross(G, p, q)) continue;
    const L = Math.hypot(p.u - q.u, p.v - q.v); opts.push({ a: x, b: y, len: L, cost: rodPrice(mat, L) });
  }
  if (!opts.length) return { diag: null, why: 'geom' };
  const fit = opts.filter((o) => o.cost <= left + 1e-9); if (!fit.length) return { diag: null, why: 'budget' };
  fit.sort((x, y) => x.cost - y.cost || x.len - y.len || (x.a < y.a ? -1 : 1));
  return { diag: fit[0], why: '' };
}
export function addDiagonal(B, quad, mat, opt = {}) {
  const G = B?.rg; if (!G) return { ok: false, why: 'geom' };
  const r = diagonalFor(B, quad, mat, opt); if (!r.diag) return { ok: false, why: r.why };
  pushHist(B); const rod = { id: 'st' + G.r++, a: r.diag.a, b: r.diag.b, mat }; G.rods.push(rod); derive(B);
  return { ok: true, rod: rod.id, len: r.diag.len, cost: r.diag.cost };
}
// midtpunktet av en firkant (der «gir etter»-prikken står)
export function quadCenter(G, quad) {
  const P = quad.nodes.map((id) => nodeOf(G, id)).filter(Boolean); if (!P.length) return null;
  return { u: r3(P.reduce((s, p) => s + p.u, 0) / P.length), v: r3(P.reduce((s, p) => s + p.v, 0) / P.length) };
}
// sammendrag til rapporten: hvor mange staver og knuter er i bygget (rod/knute-tall rundt et forslag)
export const sigOf = (G) => (G ? `${G.nodes.length}/${G.rods.length}/${r3(G.nodes.reduce((s, n) => s + n.u * 7 + n.v * 13, 0))}/${G.rods.map((r) => r.mat[0]).join('')}` : '');
