// R92: forenklet byggeskjerm for rutenett (PROTOTYPE bak ⚙-valget `buildux`). Ren logikk (ingen DOM, ingen three.js, kjøres i node: test_buildux.mjs).
// Her ligger: hvilke steder som får skjermen, snapping av fingeren til knute/rutenettpunkt, «spøkelsesstaven» (lengde, pris, lovlig eller ikke),
// treff på slette-boblen, tidtaking til første bro, og når håndanimasjonen skal vises. Visningen (buildux_view.js) og build.js kobler det til skjermen.
import { GRID_MAT, GRID_MATS, rodPrice } from './build_materials.js';
import { nearestPoint, nodeAt, nodeOf, rodOf, rodCheck, hitNode, hitRod, gridStep, maxLenOf, siteHasGrid } from './grid_logic.js';
import { starThresholds } from './build_budget.js';

export const BUX = {
  levels: { bro: ['bro1'], kjokkenbro: ['kjokken1'], badebro: ['bad1'] },   // vanlige brett: byggestedene som får skjermen
  labKeys: ['bro', 'fagverk'],                            // Bygglab: stedene «bro» og «fagverk» (lab.key)
  snapPx: 30,        // fingeren snapper til en knute innen så mange px
  pointPx: 34,       // ... og til et rutenettpunkt innen så mange px (eller 0,62 rute, det som er størst)
  grabPx: 28,        // grep en knute (dra fra den) innen så mange px
  tapPx: 14,         // trykk (uten å dra): knuten må være så nær, ellers velges staven fingeren ligger på
  dragPx: 10,        // så langt (px) må fingeren dras før det regnes som dra
  bubblePx: 52,      // slette-boblen: trykkflate (px, minst 48)
  handKey: 'tlm.buxhand', handSecs: 2.6,
  mats: [ { id: 'wood', icon: '🪵', strength: 2 }, { id: 'steel', icon: '🔩', strength: 3 }, { id: 'rope', icon: '🪢', strength: 1 } ],   // styrkeikon: ▮▮▯ (tau holder bare strekk: 1)
  controls: { build: ['back', 'more', 'wood', 'steel', 'rope', 'undo', 'try'], sim: ['back', 'more', 'slow', 'pause', 'try'] },   // synlige knapper (⚑ kommer i tillegg); før: ca. 25–30
};
export const BUX_MAT_IDS = BUX.mats.map((m) => m.id);

// skal dette stedet ha den forenklede skjermen (når valget er på)?
export function buxSite({ levelId, site }) {
  if (!site || !siteHasGrid(site)) return false;
  if (site.lab) return BUX.labKeys.includes(site.lab.key);
  return !!(BUX.levels[levelId] || []).includes(site.id);
}
// stedet kan få skjermen selv om rutenett ennå ikke er lagt til (vanlige brett får `grid` ved oppstart, se grid_play.js)
export const buxWanted = ({ on, levelId, site }) => !!on && buxSite({ levelId, site });

// ---------- snapping ----------
// u,v = fingerens posisjon i brettets enheter; scale = px per enhet; from = id til knuten staven starter i (hopper over den selv).
// → { kind: 'node', node, u, v } | { kind: 'point', u, v } | null (ingenting nær)
export function resolveTarget(site, G, u, v, scale, from = null, opt = {}) {
  const sp = opt.snapPx ?? BUX.snapPx, pp = opt.pointPx ?? BUX.pointPx;
  const near = hitNode({ ...G, nodes: G.nodes.filter((n) => n.id !== from) }, u, v, scale, sp);
  if (near) return { kind: 'node', node: near, u: near.u, v: near.v };
  const p = nearestPoint(site, u, v, Math.max(0.62 * gridStep(site), pp / Math.max(1, scale)));
  if (!p) return null;
  const ex = nodeAt(G, p.u, p.v);
  if (ex && ex.id !== from) return { kind: 'node', node: ex, u: ex.u, v: ex.v };
  if (ex && ex.id === from) return { kind: 'self', node: ex, u: ex.u, v: ex.v };
  return { kind: 'point', u: p.u, v: p.v };
}

// ---------- spøkelsesstav ----------
// B = byggetilstand (grid), fromId = startknute, target = resolveTarget(...), mat = materiale.
// → { show, ok, why, len, cost, mat, a, b, newNode } der why er en av rodCheck sine ('same','short','far','dup','over','max') eller 'out'
export function ghostOf(B, fromId, target, mat) {
  const G = B?.rg, a = G && nodeOf(G, fromId);
  if (!G || !a || !GRID_MATS.includes(mat)) return { show: false, ok: false, why: 'out' };
  if (!target) return { show: false, ok: false, why: 'out', a: { u: a.u, v: a.v } };
  if (target.kind === 'self') return { show: false, ok: false, why: 'same', a: { u: a.u, v: a.v } };
  const out = { show: true, mat, a: { u: a.u, v: a.v }, b: { u: target.u, v: target.v }, newNode: target.kind === 'point' };
  let c;
  if (target.kind === 'node') c = rodCheck(G, fromId, target.node.id, maxLenOf(B));
  else {
    const tmp = { id: '_g', u: target.u, v: target.v }; G.nodes.push(tmp);
    try { c = rodCheck(G, fromId, '_g', maxLenOf(B)); } finally { G.nodes.pop(); }
  }
  const L = Math.hypot(a.u - target.u, a.v - target.v);
  return { ...out, ok: !!c.ok, why: c.ok ? '' : c.why, len: L, cost: rodPrice(mat, L) };
}
export const ghostLabel = (g, fmt) => (g && g.show ? fmt(g) : '');

// ---------- slette-boble ----------
// valgt knute eller stav → hva kan slettes? { kind: 'rod'|'node', id } eller null (ankre, dekk og faste staver kan ikke slettes: ingen boble)
export function deletable(G, selNode, selRod) {
  if (!G) return null;
  if (selRod) { const r = rodOf(G, selRod); return r && !r.deck ? { kind: 'rod', id: r.id } : null; }
  if (selNode) { const n = nodeOf(G, selNode); return n && !n.fixed && !n.deck ? { kind: 'node', id: n.id } : null; }
  return null;
}
// boblens plassering i brettets enheter: ved knuten, eller midt på staven; litt over (skjermen snur v)
export function bubbleAnchor(G, d) {
  if (!d) return null;
  if (d.kind === 'node') { const n = nodeOf(G, d.id); return n ? { u: n.u, v: n.v } : null; }
  const r = rodOf(G, d.id), a = r && nodeOf(G, r.a), b = r && nodeOf(G, r.b);
  return a && b ? { u: (a.u + b.u) / 2, v: (a.v + b.v) / 2 } : null;
}
// treffer et trykk (skjermpunkt) boblen? bubble = { x, y, r }
export const bubbleHit = (bubble, x, y) => !!bubble && Math.hypot(x - bubble.x, y - bubble.y) <= Math.max(bubble.r || 0, BUX.bubblePx / 2);

// ---------- hva et trykk treffer (knute, stav, tomt) ----------
// nodePx: hvor nær en knute fingeren må være (grep: stor; trykk: liten, ellers kan en kort stav aldri velges midt på); rodPx: hvor nær en stav
export function pickAt(G, u, v, scale, { nodePx = BUX.grabPx, rodPx = 16 } = {}) {
  const n = hitNode(G, u, v, scale, nodePx); if (n) return { kind: 'node', node: n };
  const r = hitRod(G, u, v, scale, rodPx); if (r) return { kind: 'rod', rod: r };
  return { kind: 'empty' };
}
// dra fra en knute: stav (standard), men på en valgt knute som kan flyttes er dra = flytt
export const dragMeaning = (node, selectedId) => (node && selectedId === node.id && !node.fixed && !node.deck ? 'move' : 'rod');

// ---------- økonomi (budsjettlinjen) ----------
// → { cost, budget, ratio, over, stars } der budsjettet er oppdragets (hvis det finnes) ellers prisen for to stjerner
export function budgetOf({ site, cost, stageBudget = null }) {
  const budget = Number.isFinite(stageBudget) && stageBudget > 0 ? stageBudget : starThresholds(site, true).two.cost;
  return { cost, budget, ratio: budget > 0 ? Math.min(1, cost / budget) : 0, over: cost > budget };
}
export const COMMA = (x) => String(+Number(x).toFixed(2)).replace('.', ',');
export const matInfo = (id) => { const m = BUX.mats.find((q) => q.id === id), g = GRID_MAT[id]; return m && g ? { id, icon: m.icon, price: g.price, strength: m.strength, color: g.color } : null; };
export const strengthBars = (n) => '▮'.repeat(Math.max(0, Math.min(3, n))) + '▯'.repeat(3 - Math.max(0, Math.min(3, n)));

// ---------- tidtaking til første bro ----------
export function createTimer() { return { t0: null, rod: null, won: null, tries: 0, rods: 0 }; }
export function timerOpen(T, t) { if (T.t0 == null) T.t0 = t; return T; }
export function timerRod(T, t) { T.rods++; if (T.rod == null && T.t0 != null) { T.rod = t - T.t0; return { first: true, secs: T.rod }; } return { first: false }; }
export function timerTry(T) { T.tries++; return T.tries; }
// første vellykkede prøve: sekunder siden åpning (bare første gang)
export function timerWin(T, t) { if (T.won == null && T.t0 != null) { T.won = t - T.t0; return { first: true, secs: T.won, tries: T.tries, rods: T.rods }; } return { first: false }; }

// ---------- første gang: hånd-animasjon ----------
// vises én gang per enhet, følger hjelpenivået (Nybegynner/Medium; borte på Ekspert) og R75-veiledningen
export const shouldShowHand = ({ seen, hint, guideOn = true, wanted = true }) => !!wanted && !seen && !!hint && guideOn !== false;
// posisjon på banen 0..1 (hold, dra, hold): fra p0 til p1
export function handAt(t, p0, p1, secs = BUX.handSecs) {
  const k = Math.max(0, Math.min(1, t / secs)), m = k < 0.2 ? 0 : k > 0.75 ? 1 : (k - 0.2) / 0.55, e = m * m * (3 - 2 * m);
  return { x: p0.x + (p1.x - p0.x) * e, y: p0.y + (p1.y - p0.y) * e, k, down: k >= 0.12 && k <= 0.85, done: k >= 1 };
}
// to punkter å vise «dra fra punktet» mellom: fra første anker mot nærmeste rutenettpunkt en stavlengde unna på dekket
export function handPath(site, G) {
  const an = G?.nodes.filter((n) => n.fixed) || []; if (!an.length) return null;
  const a = an.slice().sort((x, y) => x.u - y.u)[0], st = gridStep(site), b = { u: a.u + st, v: a.v + st };
  const p = nearestPoint(site, b.u, b.v); return p ? { a: { u: a.u, v: a.v }, b: { u: p.u, v: p.v } } : null;
}
