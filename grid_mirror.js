// R121: speiling og kopi i Rutenett-bygging (ren logikk: ingen DOM, kjøres i node). Tillegg til grid_logic.js; dagens bygging er uendret.
//  - SPEIL: alle brukerlagde knuter og staver speiles om midtlinjen mellom ankrene (u-aksen). «add» legger speilbildet til, «flip» bytter (SNU). Alt eller ingenting, ett ANGRE-steg.
//  - KOPIER: et sammenhengende felt (opptil COPY_MAX staver: en trekant ved en valgt stav, ellers staver ut fra en valgt knute) flyttes et helt antall rutesteg. Knuter som lander på en eksisterende knute festes til den,
//    staver som allerede finnes hoppes over (ingen duplikater). Alt eller ingenting, ett ANGRE-steg.
// Begge bruker de samme sjekkene som å legge ut en stav (rodCheck: lengde, ikke gjennom en knute, maks antall), bare lovlige rutenettpunkt innenfor stedet, og budsjettet.
import { nodeOf, nodeAt, rodOf, rodCheck, derive, latticePoints, gridAnchors, maxLenOf, MAX_NODES, isGrid, gridClone, gridStep } from './grid_logic.js';
import { pushHist } from './build_logic.js';
import { buildCost } from './build_budget.js';

export const COPY_MAX = 12;
const r3 = (x) => Math.round(x * 1000) / 1000;
const same = (a, b) => Math.abs(a - b) < 1e-3;
const userNode = (n) => !n.fixed && !n.deck;
const userRod = (r) => !r.deck;
const WHY = { same: 'dup', short: 'over', far: 'far', dup: 'dup', over: 'over', max: 'max' };
const rodBetween = (G, a, b) => G.rods.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a));

// kostnaden for et rutenett (samme regnestykke som byggeskjermen: dekket er gratis)
export function gridCost(B, G) { const t = { site: B.site, rg: G, mode: 'grid', placed: [], links: [] }; derive(t); return buildCost(t.placed, t.links).cost; }
const overBudget = (B, G, budget) => { if (!Number.isFinite(budget)) return false; const c = gridCost(B, G); return c > budget + 1e-9 && c > gridCost(B, B.rg) + 1e-9; };
const pointMap = (site) => { const m = new Map(); for (const p of latticePoints(site)) m.set(Math.round(p.u * 1000) + ',' + Math.round(p.v * 1000), p); return m; };
const findPt = (pm, u, v) => pm.get(Math.round(u * 1000) + ',' + Math.round(v * 1000)) || null;

// ---------- speiling ----------
// u-verdien midt mellom ankrene (null når stedet har færre enn to ankre)
export function mirrorAxis(site) {
  const an = gridAnchors(site); if (!an || an.length < 2) return null;
  const us = an.map((a) => a.u); return r3((Math.min(...us) + Math.max(...us)) / 2);
}
// { ok, G, rods (lagt til), nodes (nye), cost } eller { ok: false, why: 'mode' | 'noaxis' | 'empty' | 'out' | 'anchor' | 'far' | 'over' | 'max' | 'budget' | 'sym' }. Endrer ikke B.
export function mirrorPlan(B, mode = 'add', budget = null) {
  if (!isGrid(B)) return { ok: false, why: 'mode' };
  const G = B.rg, ax = mirrorAxis(B.site); if (ax == null) return { ok: false, why: 'noaxis' };
  const userRods = G.rods.filter(userRod); if (!userRods.length) return { ok: false, why: 'empty' };
  const W = gridClone(G), pm = pointMap(B.site), flip = mode === 'flip', map = new Map(); let nodes = 0, rods = 0;
  if (flip) { W.rods = W.rods.filter((r) => r.deck); W.nodes = W.nodes.filter((n) => !userNode(n)); }
  const need = new Set(userRods.flatMap((r) => [r.a, r.b])); for (const n of G.nodes) if (userNode(n)) need.add(n.id);
  for (const n of G.nodes) {
    if (!need.has(n.id)) continue;
    const p = findPt(pm, 2 * ax - n.u, n.v); if (!p) return { ok: false, why: 'out' };
    const ex = nodeAt(W, p.u, p.v);
    if (ex) { if (userNode(n) !== userNode(ex)) return { ok: false, why: 'anchor' }; map.set(n.id, ex.id); continue; }
    if (!userNode(n)) return { ok: false, why: 'anchor' };   // et anker som ikke har et anker som speilbilde
    if (W.nodes.length >= MAX_NODES) return { ok: false, why: 'max' };
    const nn = { id: 'kn' + W.n++, u: p.u, v: p.v }; W.nodes.push(nn); map.set(n.id, nn.id); nodes++;
  }
  for (const r of userRods) {
    const a = map.get(r.a), b = map.get(r.b); if (!a || !b || a === b || rodBetween(W, a, b)) continue;
    const c = rodCheck(W, a, b, maxLenOf(B)); if (!c.ok) return { ok: false, why: WHY[c.why] || 'over' };
    W.rods.push({ id: 'st' + W.r++, a, b, mat: r.mat }); rods++;
  }
  if (!flip && !rods && !nodes) return { ok: false, why: 'sym' };
  if (!flip && overBudget(B, W, budget)) return { ok: false, why: 'budget' };
  return { ok: true, G: W, rods, nodes, mode: flip ? 'flip' : 'add', cost: gridCost(B, W) };
}
// speiler (ett ANGRE-steg). Returnerer planen ({ ok, rods, nodes ... } eller { ok: false, why })
export function gMirror(B, mode = 'add', budget = null) {
  const p = mirrorPlan(B, mode, budget); if (!p.ok) return p;
  pushHist(B); B.rg = p.G; derive(B); return p;
}
// er bygget symmetrisk om midtlinjen (posisjon og materiale)? Brukes av testene
export function isSymmetric(B) {
  const G = B.rg, ax = mirrorAxis(B.site); if (!G || ax == null) return false;
  const pos = (id) => { const n = nodeOf(G, id); return n ? [n.u, n.v] : null; };
  const key = (a, b, m) => { const x = [`${a[0]},${a[1]}`, `${b[0]},${b[1]}`].sort(); return x.join('|') + '|' + m; };
  const have = new Set(G.rods.filter(userRod).map((r) => key(pos(r.a), pos(r.b), r.mat)));
  return G.rods.filter(userRod).every((r) => { const a = pos(r.a), b = pos(r.b); return have.has(key([r3(2 * ax - a[0]), a[1]], [r3(2 * ax - b[0]), b[1]], r.mat)); });
}

// ---------- utvalg og kopi ----------
// feltet som kopieres: en valgt stav gir en trekant den er med i (ellers bare staven), en valgt knute gir stavene ut fra den (bredde først, opptil max). { nodes: [id], rods: [id] } eller null
export function selectField(G, nodeId = null, rodId = null, max = COPY_MAX) {
  const out = (rods) => (rods.length ? { rods: rods.map((r) => r.id), nodes: [...new Set(rods.flatMap((r) => [r.a, r.b]))] } : null);
  if (rodId) {
    const r = rodOf(G, rodId); if (!r || r.deck) return null;
    const near = (id) => G.rods.filter((q) => q !== r && (q.a === id || q.b === id)), other = (q, id) => (q.a === id ? q.b : q.a);
    let best = null;
    for (const q of near(r.a)) { const c = other(q, r.a); if (c === r.b) continue; const q2 = near(r.b).find((z) => other(z, r.b) === c); if (!q2) continue;
      const A = nodeOf(G, r.a), Bn = nodeOf(G, r.b), C = nodeOf(G, c), area = Math.abs((Bn.u - A.u) * (C.v - A.v) - (C.u - A.u) * (Bn.v - A.v)) / 2;
      if (!best || area < best.area - 1e-9) best = { area, rods: [r, q, q2] }; }
    return out((best ? best.rods : [r]).filter(userRod));
  }
  const n = nodeId && nodeOf(G, nodeId); if (!n) return null;
  const seen = new Set([n.id]), queue = [n.id], rods = [];
  while (queue.length && rods.length < max) {
    const id = queue.shift(), nd = nodeOf(G, id);
    for (const q of G.rods.filter((z) => userRod(z) && (z.a === id || z.b === id)).sort((x, y) => x.id.localeCompare(y.id, 'en', { numeric: true }))) {
      if (rods.includes(q)) continue; if (rods.length >= max) break; rods.push(q);
      const o = q.a === id ? q.b : q.a; if (!seen.has(o)) { seen.add(o); const on = nodeOf(G, o); if (on && userNode(on)) queue.push(o); }
    }
    void nd;
  }
  return out(rods);
}
// planen for å sette feltet inn forskjøvet (du, dv) (hele rutesteg). { ok, G, rods (nye), nodes (nye), cost, shape } eller { ok: false, why: 'same' | 'out' | 'max' | 'far' | 'over' | 'dup' | 'budget', shape }. shape = staver og knuter slik de ville stått (til spøkelset). Endrer ikke B.
export function copyPlan(B, sel, du, dv, budget = null) {
  const G = B?.rg, shape = { rods: [], nodes: [] }; if (!isGrid(B) || !sel || !sel.rods?.length) return { ok: false, why: 'empty', shape };
  const pm = pointMap(B.site), W = gridClone(G), map = new Map(), made = [];
  for (const id of sel.nodes) { const n = nodeOf(G, id); if (n) shape.nodes.push({ u: r3(n.u + du), v: r3(n.v + dv) }); }
  for (const id of sel.rods) { const r = rodOf(G, id), a = r && nodeOf(G, r.a), b = r && nodeOf(G, r.b); if (a && b) shape.rods.push({ a: { u: r3(a.u + du), v: r3(a.v + dv) }, b: { u: r3(b.u + du), v: r3(b.v + dv) }, mat: r.mat }); }
  const fail = (why) => ({ ok: false, why, shape });
  if (same(du, 0) && same(dv, 0)) return fail('same');
  for (const id of sel.nodes) {
    const n = nodeOf(G, id); if (!n) continue;
    const p = findPt(pm, n.u + du, n.v + dv); if (!p) return fail('out');
    const ex = nodeAt(W, p.u, p.v); if (ex) { map.set(id, ex.id); continue; }
    if (W.nodes.length >= MAX_NODES) return fail('max');
    const nn = { id: 'kn' + W.n++, u: p.u, v: p.v }; W.nodes.push(nn); map.set(id, nn.id); made.push(nn.id);
  }
  let rods = 0;
  for (const id of sel.rods) {
    const r = rodOf(G, id); if (!r) continue; const a = map.get(r.a), b = map.get(r.b); if (!a || !b || a === b || rodBetween(W, a, b)) continue;
    const c = rodCheck(W, a, b, maxLenOf(B)); if (!c.ok) return fail(WHY[c.why] || 'over');
    W.rods.push({ id: 'st' + W.r++, a, b, mat: r.mat }); rods++;
  }
  if (!rods) return fail('dup');
  const used = new Set(W.rods.flatMap((r) => [r.a, r.b])); W.nodes = W.nodes.filter((n) => !made.includes(n.id) || used.has(n.id));   // nye knuter uten stav tas bort
  const newNodes = made.filter((id) => used.has(id)).length;
  if (overBudget(B, W, budget)) return fail('budget');
  return { ok: true, G: W, rods, nodes: newNodes, cost: gridCost(B, W), shape };
}
// setter inn kopien (ett ANGRE-steg)
export function gCopy(B, sel, du, dv, budget = null) {
  const p = copyPlan(B, sel, du, dv, budget); if (!p.ok) return p;
  pushHist(B); B.rg = p.G; derive(B); return p;
}
// et fornuftig startsted for spøkelset: ett felt til høyre, ellers til venstre, så ett trinn i hver retning; ellers (feltbredde, 0) i rødt
export function startOffset(B, sel, budget = null) {
  const G = B.rg, st = gridStep(B.site), us = sel.nodes.map((id) => nodeOf(G, id)?.u).filter(Number.isFinite), w = Math.max(st, Math.ceil((Math.max(...us) - Math.min(...us)) / st - 1e-9) * st);
  for (const [du, dv] of [[w, 0], [-w, 0], [st, 0], [-st, 0], [0, st], [0, -st]]) if (copyPlan(B, sel, du, dv, budget).ok) return { du, dv };
  return { du: w, dv: 0 };
}
