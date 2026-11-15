// R72: rutenett-bygging (ren logikk: ingen DOM, ingen three.js, kjøres i node). En ny byggemodus ved siden av den klassiske:
// du setter KNUTEPUNKTER på rutenettets koordinater og trekker STAVER mellom dem (tre, stål eller tau), som i Poly Bridge / Bridge Constructor.
//  - ankerpunktene på klippene (site.anchors) er faste knutepunkter som ikke kan slettes eller flyttes
//  - rutenettet følger det første ankeret: u = anker + k · trinn, v = j · trinn (trinnet står i `site.grid.step`, ellers GRID_STEP)
//  - en stav er et avstandsbånd mellom to knuter, med lengde mellom MIN_LEN og maks (setting); samme to knuter kan bare ha én stav
//  - fysikken er den vanlige (build_phys.js): hver stav er en kjede med egen type `rod_<materiale>_<lengde>` (build_materials.js), og knutene er ledd mellom stavene (ankre = ledd mot underlaget).
//    Tre er billig og svakt, stål sterkt og dyrt, tau bærer bare strekk.
// Bygget ligger som `B.rg = { step, nodes, rods }` og speiles til vanlige `B.placed` / `B.links` (derive), så PRØV, kostnad, stjerner, verden, lagring og deling bruker det som før.
import { siteAnchors, partType, pushHist, undo, toB64, fromB64, fnv, CODE_MAX, CODE_PREFIX, CODE_MAX_PARTS, CODE_MAX_LINKS, normRot } from './build_logic.js';
import { GRID_MATS, GRID_MAT, rodType, parseRod, rodPrice } from './build_materials.js';

export const GRID_STEP = 2;            // standard trinn (enheter) når stedet ikke sier noe annet
export const MIN_LEN = 1.2;            // kortere staver gir ingen mening (og kan ikke brekke)
export const MAX_LEN = 6.5;            // standard lengste stav (enheter); settes i ⚙ (admin)
export const MAX_NODES = 60, MAX_RODS = 120;
export const CODE_GRID = 2;            // kodeversjon (TLM1.<base64 av [2, sted, knuter, staver]>.<sum>): gamle koder (versjon 1) virker som før
export const CODE_GRID_DECK = 3;       // R73: samme, men bygget har kjøredekk (dekket er ikke med i koden, bare det du la til)

export const siteHasGrid = (site) => !!site && !!site.grid;
export const gridStep = (site) => (Number.isFinite(site?.grid?.step) && site.grid.step > 0.4 ? site.grid.step : GRID_STEP);
const r3 = (x) => Math.round(x * 1000) / 1000;
const same = (a, b) => Math.abs(a - b) < 1e-3;
const clone = (G) => JSON.parse(JSON.stringify(G));

// ---------- rutenettet ----------
// alle punkt knutene kan stå på (rutenett + ankre), i en fast rekkefølge
export function latticePoints(site) {
  const st = gridStep(site), an = siteAnchors(site), u0 = an[0]?.u ?? 0, out = [], hw = site.w / 2;
  const kmin = Math.ceil((-hw - u0) / st - 1e-9), kmax = Math.floor((hw - u0) / st + 1e-9), jmax = Math.floor(site.h / st + 1e-9);
  for (let j = 0; j <= jmax; j++) for (let k = kmin; k <= kmax; k++) out.push({ u: r3(u0 + k * st), v: r3(j * st) });
  for (const a of an) if (!out.some((p) => same(p.u, a.u) && same(p.v, a.v))) out.push({ u: r3(a.u), v: r3(a.v) });
  return out;
}
// nærmeste punkt til (u, v), ellers null når det er lenger unna enn maxD
export function nearestPoint(site, u, v, maxD = Infinity) {
  let best = null, bd = maxD;
  for (const p of latticePoints(site)) { const d = Math.hypot(p.u - u, p.v - v); if (d <= bd) { bd = d; best = p; } }
  return best;
}

// ---------- kjøredekk (R73) ----------
// stedet har to ankre på samme høyde: dekket er en rett kjede av tre-staver langs rutenettets rad mellom dem. Knutene på dekket (id d1, d2 ...) og stavene (dk1 ...) kan ikke slettes eller flyttes,
// men kan få staver over og under. Dekket er gratis og teller ikke som deler (build_budget.js), så terskler og stjerner gjelder det du bygger oppå.
export const isDeckRod = (r) => !!r && !!r.deck;
export function deckPoints(site) {
  if (!siteHasGrid(site)) return null; const an = siteAnchors(site).slice().sort((a, b) => a.u - b.u);
  if (an.length !== 2 || !same(an[0].v, an[1].v) || an[1].u - an[0].u < MIN_LEN) return null;
  const mid = latticePoints(site).filter((p) => same(p.v, an[0].v) && p.u > an[0].u + 0.3 && p.u < an[1].u - 0.3).sort((a, b) => a.u - b.u);
  return { left: an[0], right: an[1], mid };
}
function addDeck(G, site) {
  const d = deckPoints(site); if (!d) return G;
  const idOf = (a) => G.nodes.find((n) => n.fixed && same(n.u, a.u) && same(n.v, a.v)).id;
  let prev = idOf(d.left), k = 1;
  const link = (to) => { G.rods.push({ id: 'dk' + k++, a: prev, b: to, mat: 'wood', deck: true }); prev = to; };
  d.mid.forEach((p, i) => { const n = { id: 'd' + (i + 1), u: p.u, v: p.v, deck: true }; G.nodes.push(n); link(n.id); });
  link(idOf(d.right)); G.deck = true; return G;
}

// ---------- bygget ----------
export function createGrid(site, deck = false) {
  const nodes = siteAnchors(site).map((a, i) => ({ id: 'a' + (i + 1), u: r3(a.u), v: r3(a.v), fixed: true }));
  const G = { nodes, rods: [], n: 1, r: 1 };
  return deck ? addDeck(G, site) : G;
}
export const hasDeck = (G) => !!G && !!G.deck;
const userRods = (G) => G.rods.filter((r) => !r.deck);
const userNodes = (G) => G.nodes.filter((n) => !n.fixed && !n.deck);
export const isGrid = (B) => B.mode === 'grid' && !!B.rg;
export const nodeOf = (G, id) => G.nodes.find((n) => n.id === id);
export const rodOf = (G, id) => G.rods.find((r) => r.id === id);
export const nodeAt = (G, u, v) => G.nodes.find((n) => same(n.u, u) && same(n.v, v));
export const rodLen = (G, r) => { const a = nodeOf(G, r.a), b = nodeOf(G, r.b); return a && b ? Math.hypot(a.u - b.u, a.v - b.v) : 0; };
export const rodsAt = (G, id) => G.rods.filter((r) => r.a === id || r.b === id);
export const maxLenOf = (B) => (Number.isFinite(B?.gridMaxLen) && B.gridMaxLen > MIN_LEN ? B.gridMaxLen : MAX_LEN);

// ligger en annen knute midt på stav a-b (staven ville gått rett gjennom den)?
function passesThrough(G, a, b, skip = []) {
  const dx = b.u - a.u, dy = b.v - a.v, L2 = dx * dx + dy * dy; if (!L2) return false;
  for (const n of G.nodes) {
    if (n === a || n === b || skip.includes(n.id)) continue;
    const t = ((n.u - a.u) * dx + (n.v - a.v) * dy) / L2; if (t <= 0.02 || t >= 0.98) continue;
    if (Math.hypot(a.u + t * dx - n.u, a.v + t * dy - n.v) < 0.2) return true;
  }
  return false;
}
// kan en stav mellom a og b ligge der? { ok } eller { ok: false, why: 'same' | 'short' | 'far' | 'dup' | 'over' | 'max' }
export function rodCheck(G, aId, bId, maxLen = MAX_LEN, skipRod = null) {
  const a = nodeOf(G, aId), b = nodeOf(G, bId); if (!a || !b || aId === bId) return { ok: false, why: 'same' };
  const L = Math.hypot(a.u - b.u, a.v - b.v);
  if (L < MIN_LEN) return { ok: false, why: 'short' };
  if (L > maxLen + 1e-6) return { ok: false, why: 'far' };
  if (G.rods.some((r) => r.id !== skipRod && ((r.a === aId && r.b === bId) || (r.a === bId && r.b === aId)))) return { ok: false, why: 'dup' };
  if (passesThrough(G, a, b)) return { ok: false, why: 'over' };
  if (G.nodes.length > MAX_NODES || G.rods.length >= MAX_RODS) return { ok: false, why: 'max' };
  return { ok: true, len: L };
}

// ---------- tilstand: modus, historikk, speiling til B.placed / B.links ----------
export function derive(B) {
  const G = B.rg, placed = [], links = []; if (!G) { B.placed = []; B.links = []; return B; }
  const order = new Map(G.rods.map((r, i) => [r.id, i]));
  for (const r of G.rods) {
    const a = nodeOf(G, r.a), b = nodeOf(G, r.b); if (!a || !b) continue;
    const L = Math.hypot(a.u - b.u, a.v - b.v);
    placed.push({ id: r.id, type: rodType(r.mat, L), u: (a.u + b.u) / 2, v: (a.v + b.v) / 2, rot: normRot(Math.atan2(b.v - a.v, b.u - a.u)), anchored: false, snapTo: null, _a: r.a, _b: r.b });
  }
  const local = (r, nid) => { const L = rodLen(G, r); return { x: nid === r.a ? -L / 2 : L / 2, y: 0 }; };
  const jk = (r) => GRID_MAT[r.mat].joint || 1;   // leddets styrke følger det svakeste materialet i knuten
  let k = 1;
  for (const n of G.nodes) {
    const rs = rodsAt(G, n.id).sort((x, y) => order.get(x.id) - order.get(y.id)); if (!rs.length) continue;
    if (n.fixed) { for (const r of rs) links.push({ id: 'h' + k++, kind: 'hinge', a: r.id, la: local(r, n.id), b: null, lb: null, g: { u: n.u, v: n.v }, free: true, k: jk(r) }); }
    else for (let i = 1; i < rs.length; i++) links.push({ id: 'h' + k++, kind: 'hinge', a: rs[0].id, la: local(rs[0], n.id), b: rs[i].id, lb: local(rs[i], n.id), g: null, free: true, k: Math.min(jk(rs[0]), jk(rs[i])) });
  }
  B.placed = placed.map(({ _a, _b, ...p }) => p); B.links = links; return B;
}
// stavene som møtes i samme knute skal ikke støte mot hverandre i fysikken
export function noCollide(B) {
  const G = B.rg, out = []; if (!G) return out;
  for (const n of G.nodes) { const rs = rodsAt(G, n.id); for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) out.push([rs[i].id, rs[j].id]); }
  return out;
}
// definisjonen fysikken (createSim) vil ha
export const simDef = (B) => ({ site: B.site, placed: B.placed.map((p) => ({ id: p.id, type: p.type, u: p.u, v: p.v, rot: p.rot })), links: B.links, noCollide: noCollide(B) });

export function setMode(B, mode) {
  const cur = B.mode === 'grid' ? 'grid' : 'classic', to = mode === 'grid' && siteHasGrid(B.site) ? 'grid' : 'classic';
  if (cur === to) return false;
  B.stash ||= {}; B.stash[cur] = { placed: B.placed, links: B.links, history: B.history, grid: B.rg || null };
  const st = B.stash[to];
  if (st) { B.placed = st.placed; B.links = st.links; B.history = st.history; B.rg = st.grid || null; }
  else { B.placed = []; B.links = []; B.history = []; B.rg = to === 'grid' ? createGrid(B.site, !!B.gridDeck) : null; }
  B.mode = to; if (to === 'grid') derive(B); return true;
}
// alt på stedet tilbake til start (klassisk modus, tomt)
export function wipe(B) { B.mode = 'classic'; B.rg = null; B.stash = {}; B.placed = []; B.links = []; B.history = []; }
// nullstill byggingen i gjeldende modus; i rutenett-modus står ankrene igjen
export function gReset(B) {
  if (!B.rg || (!userRods(B.rg).length && B.rg.nodes.every((n) => n.fixed || n.deck))) return false;
  pushHist(B); B.rg = createGrid(B.site, hasDeck(B.rg)); derive(B); return true;
}

// ---------- endringer (alle skriver historikk først, så ANGRE virker) ----------
export function gAddNode(B, u, v) {
  const G = B.rg, p = nearestPoint(B.site, u, v); if (!G || !p) return { ok: false, why: 'out' };
  const ex = nodeAt(G, p.u, p.v); if (ex) return { ok: true, node: ex, existed: true };
  if (G.nodes.length >= MAX_NODES) return { ok: false, why: 'max' };
  pushHist(B); const n = { id: 'kn' + G.n++, u: p.u, v: p.v }; G.nodes.push(n); derive(B); return { ok: true, node: n, existed: false };
}
export function gAddRod(B, aId, bId, mat) {
  const G = B.rg; if (!G || !GRID_MATS.includes(mat)) return { ok: false, why: 'mat' };
  const c = rodCheck(G, aId, bId, maxLenOf(B)); if (!c.ok) return c;
  pushHist(B); const r = { id: 'st' + G.r++, a: aId, b: bId, mat }; G.rods.push(r); derive(B); return { ok: true, rod: r, len: c.len, cost: rodPrice(mat, c.len) };
}
// stav fra en knute til et rutenettpunkt (lager knuten om den mangler), alt i ett steg for ANGRE
export function gAddRodTo(B, aId, u, v, mat) {
  const G = B.rg, p = G && nearestPoint(B.site, u, v); if (!p) return { ok: false, why: 'out' };
  const ex = nodeAt(G, p.u, p.v), a = nodeOf(G, aId); if (!a) return { ok: false, why: 'same' };
  if (ex) return gAddRod(B, aId, ex.id, mat);
  const tmp = { id: '_t', u: p.u, v: p.v }; G.nodes.push(tmp); const c = rodCheck(G, aId, '_t', maxLenOf(B)); G.nodes.pop(); if (!c.ok) return c;
  pushHist(B); const n = { id: 'kn' + G.n++, u: p.u, v: p.v }; G.nodes.push(n); const r = { id: 'st' + G.r++, a: aId, b: n.id, mat }; G.rods.push(r); derive(B);
  return { ok: true, rod: r, node: n, len: c.len, cost: rodPrice(mat, c.len), newNode: true };
}
export function gRemoveRod(B, id) {
  const G = B.rg, i = G ? G.rods.findIndex((r) => r.id === id) : -1; if (i < 0 || G.rods[i].deck) return false;
  pushHist(B); G.rods.splice(i, 1);
  const a = G.rods.length; void a; derive(B); return true;
}
export function gRemoveNode(B, id) {
  const G = B.rg, n = G && nodeOf(G, id); if (!n || n.fixed || n.deck) return false;
  pushHist(B); G.rods = G.rods.filter((r) => r.a !== id && r.b !== id); G.nodes = G.nodes.filter((q) => q.id !== id); derive(B); return true;
}
// flytt en knute til nærmeste rutenettpunkt; alle staver på den må fortsatt være lovlige
export function gMoveNode(B, id, u, v) {
  const G = B.rg, n = G && nodeOf(G, id); if (!n) return { ok: false, why: 'same' }; if (n.fixed || n.deck) return { ok: false, why: 'fixed' };
  const p = nearestPoint(B.site, u, v); if (!p) return { ok: false, why: 'out' };
  if (same(p.u, n.u) && same(p.v, n.v)) return { ok: true, moved: false };
  if (nodeAt(G, p.u, p.v)) return { ok: false, why: 'taken' };
  const old = { u: n.u, v: n.v }; n.u = p.u; n.v = p.v; let bad = null;
  for (const r of rodsAt(G, id)) { const c = rodCheck({ ...G, rods: G.rods.filter((q) => q !== r) }, r.a, r.b, maxLenOf(B)); if (!c.ok) { bad = c; break; } }
  n.u = old.u; n.v = old.v; if (bad) return bad;
  pushHist(B); n.u = p.u; n.v = p.v; derive(B); return { ok: true, moved: true, node: n };
}
// kan en knute flyttes dit (til forhåndsvisning mens du drar)?
export function canMoveTo(B, id, u, v) {
  const G = B.rg, n = G && nodeOf(G, id), p = G && nearestPoint(B.site, u, v); if (!n || n.fixed || n.deck || !p) return null;
  if (nodeAt(G, p.u, p.v) && nodeAt(G, p.u, p.v) !== n) return null;
  const old = { u: n.u, v: n.v }; n.u = p.u; n.v = p.v; let ok = true;
  for (const r of rodsAt(G, id)) if (!rodCheck({ ...G, rods: G.rods.filter((q) => q !== r) }, r.a, r.b, maxLenOf(B)).ok) { ok = false; break; }
  n.u = old.u; n.v = old.v; return ok ? p : null;
}
export const gUndo = (B) => { const ok = undo(B); if (ok && B.rg) derive(B); return ok; };

// ---------- treff (skjermbasert margin gjør at fingeren treffer, se R70) ----------
export const NODE_HIT_PX = 24, ROD_HIT_PX = 18;
export function hitNode(G, u, v, scale, px = NODE_HIT_PX) {
  let best = null, bd = px / Math.max(1, scale);
  for (const n of G.nodes) { const d = Math.hypot(n.u - u, n.v - v); if (d <= bd) { bd = d; best = n; } }
  return best;
}
export function hitRod(G, u, v, scale, px = ROD_HIT_PX) {
  let best = null, bd = px / Math.max(1, scale);
  for (const r of G.rods) {
    const a = nodeOf(G, r.a), b = nodeOf(G, r.b); if (!a || !b) continue;
    const dx = b.u - a.u, dy = b.v - a.v, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((u - a.u) * dx + (v - a.v) * dy) / L2)), d = Math.hypot(a.u + t * dx - u, a.v + t * dy - v);
    if (d <= bd) { bd = d; best = r; }
  }
  return best;
}

// ---------- lagring ----------
const cleanMat = (m) => (GRID_MATS.includes(m) ? m : null);
export function gridSnapshot(G) { return { ...(G.deck ? { deck: true } : {}), nodes: userNodes(G).map((n) => [n.id, r3(n.u), r3(n.v)]), rods: userRods(G).map((r) => [r.id, r.a, r.b, r.mat]) }; }
// tilbake fra lagring: ukjente eller ulovlige staver kastes. Returnerer et nytt rutenett.
export function gridFromSnapshot(site, d, maxLen = MAX_LEN) {
  const G = createGrid(site, !!d?.deck), ok = (x) => Number.isFinite(x), pts = latticePoints(site);
  for (const q of Array.isArray(d?.nodes) ? d.nodes : []) {
    if (!Array.isArray(q) || typeof q[0] !== 'string' || !/^kn\d{1,4}$/.test(q[0]) || !ok(q[1]) || !ok(q[2])) continue;
    const p = pts.find((z) => same(z.u, q[1]) && same(z.v, q[2])); if (!p || nodeAt(G, p.u, p.v) || nodeOf(G, q[0]) || G.nodes.length >= MAX_NODES) continue;
    G.nodes.push({ id: q[0], u: p.u, v: p.v });
  }
  for (const q of Array.isArray(d?.rods) ? d.rods : []) {
    if (!Array.isArray(q) || typeof q[0] !== 'string' || !/^st\d{1,4}$/.test(q[0]) || !cleanMat(q[3]) || rodOf(G, q[0])) continue;
    if (!rodCheck(G, q[1], q[2], maxLen).ok) continue; G.rods.push({ id: q[0], a: q[1], b: q[2], mat: q[3] });
  }
  G.n = 1 + G.nodes.reduce((m, n) => Math.max(m, +n.id.slice(2) || 0), 0); G.r = 1 + G.rods.reduce((m, r) => Math.max(m, +r.id.slice(2) || 0), 0);
  return G;
}
export const gridClone = clone;

// ---------- kode (deling) ----------
// [2, stedets id, knuter [[u, v] i tusendeler, uten ankrene], staver [[a, b, materiale]] (a og b = nummer i listen ankre + knuter)]
export function gridExport(B) {
  const G = B.rg; if (!G) return null;
  const order = [...G.nodes.filter((n) => n.fixed), ...G.nodes.filter((n) => n.deck), ...userNodes(G)], ix = new Map(order.map((n, i) => [n.id, i]));   // ankre, dekk, så det du la til
  const nodes = userNodes(G).map((n) => [Math.round(n.u * 1000), Math.round(n.v * 1000)]);
  const rods = userRods(G).map((r) => [ix.get(r.a), ix.get(r.b), GRID_MATS.indexOf(r.mat)]);
  const body = toB64(JSON.stringify([G.deck ? CODE_GRID_DECK : CODE_GRID, B.site.id, nodes, rods])), code = `${CODE_PREFIX}${body}.${fnv(body)}`;
  return code.length <= CODE_MAX ? code : null;
}
export const exportAny = (B, classic) => (isGrid(B) ? gridExport(B) : classic(B));
// leser en rutenettkode. null = ikke en rutenettkode (la den klassiske lesningen ta den); ellers { ok: true, grid } eller { ok: false, why }
export function gridImport(code, B) {
  if (typeof code !== 'string') return null; const s = code.replace(/\s+/g, ''); if (!s.startsWith(CODE_PREFIX) || s.length > CODE_MAX) return null;
  const parts = s.slice(CODE_PREFIX.length).split('.'); if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || fnv(parts[0]) !== parts[1]) return null;
  let j; try { j = JSON.parse(fromB64(parts[0])); } catch { return null; }
  if (!Array.isArray(j) || (j[0] !== CODE_GRID && j[0] !== CODE_GRID_DECK)) return null;
  const bad = (why) => ({ ok: false, why });
  if (!siteHasGrid(B.site)) return bad('sted');
  if (j[0] === CODE_GRID_DECK && !deckPoints(B.site)) return bad('sted');
  if (j.length !== 4 || typeof j[1] !== 'string' || !Array.isArray(j[2]) || !Array.isArray(j[3])) return bad('format');
  if (j[1] !== B.site.id) return bad('sted');
  if (j[2].length > MAX_NODES || j[3].length > MAX_RODS) return bad('verdi');
  const G = createGrid(B.site, j[0] === CODE_GRID_DECK), pts = latticePoints(B.site), anchors = G.nodes.length,
     num = (x) => typeof x === 'number' && Number.isInteger(x) && Math.abs(x) <= 1e6;
  for (const q of j[2]) {
    if (!Array.isArray(q) || q.length !== 2 || !num(q[0]) || !num(q[1])) return bad('format');
    const p = pts.find((z) => same(z.u, q[0] / 1000) && same(z.v, q[1] / 1000)); if (!p || nodeAt(G, p.u, p.v)) return bad('verdi');
    G.nodes.push({ id: 'kn' + G.n++, u: p.u, v: p.v });
  }
  for (const q of j[3]) {
    if (!Array.isArray(q) || q.length !== 3 || !q.every((x) => Number.isInteger(x))) return bad('format');
    const a = G.nodes[q[0]], b = G.nodes[q[1]], mat = GRID_MATS[q[2]]; if (!a || !b || !mat || q[0] < 0 || q[1] < 0) return bad('verdi');
    const c = rodCheck(G, a.id, b.id, maxLenOf(B)); if (!c.ok) return bad('verdi');
    G.rods.push({ id: 'st' + G.r++, a: a.id, b: b.id, mat });
  }
  void anchors; return { ok: true, grid: G };
}
export const importAny = (code, B, classic) => gridImport(code, B) || classic(code, B);
// legger det importerte rutenett-bygget på brettet (kan angres med ANGRE)
export function gApplyImport(B, r) {
  if (!r?.ok || !r.grid) return false;
  if (!isGrid(B)) setMode(B, 'grid');
  pushHist(B); B.rg = r.grid; derive(B); return true;
}

// ---------- lagring i «Fortsett» ----------
export function gridSave(B, serializeClassic) {
  if (!isGrid(B) && !B.stash?.grid) return {};
  const cur = isGrid(B) ? B.rg : B.stash.grid.grid;
  const classic = isGrid(B) ? B.stash?.classic : null;
  return { mode: isGrid(B) ? 'grid' : 'classic', grid: gridSnapshot(cur), ...(classic ? { classic: serializeClassic({ have: B.have, placed: classic.placed, links: classic.links }) } : {}) };
}
// etter restore(): hent rutenettet (og klassisk bygg som lå bak) tilbake
export function gridLoad(B, d, restoreClassic) {
  if (!siteHasGrid(B.site) || !d?.grid) return false;
  const G = gridFromSnapshot(B.site, d.grid, maxLenOf(B));
  if (d.mode === 'grid') {
    if (d.classic) restoreClassic(B, d.classic);
    B.stash = { classic: { placed: B.placed, links: B.links, history: [] } }; B.history = []; B.rg = G; B.mode = 'grid'; derive(B);
  } else { B.stash = { ...(B.stash || {}), grid: { placed: [], links: [], history: [], grid: G } }; }
  return true;
}

// ---------- tekster og tall (til hjelp og rapport) ----------
export const gridStats = (B) => (B.rg ? { nodes: userNodes(B.rg).length, rods: userRods(B.rg).length, deck: B.rg.deck ? B.rg.rods.length - userRods(B.rg).length : 0, wood: userRods(B.rg).filter((r) => r.mat === 'wood').length, steel: userRods(B.rg).filter((r) => r.mat === 'steel').length, rope: userRods(B.rg).filter((r) => r.mat === 'rope').length } : null);
export const rodCostOf = (G, r) => rodPrice(r.mat, rodLen(G, r));
export const pushHistGrid = (B) => pushHist(B);
export { partType, parseRod, GRID_MAT, GRID_MATS, CODE_MAX_PARTS, CODE_MAX_LINKS };
