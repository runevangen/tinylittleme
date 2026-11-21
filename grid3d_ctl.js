// R130: 3D-laben, tilstandsmaskin (ren logikk: ingen DOM, ingen three.js, kjøres i node: test_grid3d_ui.mjs). Visningen (grid3d_view.js) tegner bare det frame() gir og sender trykk/dra hit.
//  - verktøy: BYGG (trykk et punkt i laget = knute; trykk en knute og så en annen = stav) og SLETT (trykk en knute eller en stav). Ankre og dekk kan ikke slettes.
//  - hint: SÅ SLIK (tetraeder-guide, site.guide). Prøve: build_phys3.js (lasten kjører på dekk), SLOW og PAUSE, GRØNN/RØD belastning (grid_stress.js).
//  - kamera og lag: grid3d_cam.js. Lagring: kode (TLM3D1.), i `tlm.lab3d`.
import { createBuild3, g3AddNode, g3AddRod, g3RemoveRod, g3RemoveNode, g3Undo, g3Reset, nodeOf, nodeAt, rodsAt, cost3, stars3, matsOf, userRods, userNodes, exportCode3, importCode3, maxLenOf, lattice3, MAX_NODES, MAX_RODS } from './grid3d_logic.js';
import { simDef3, createSim3, PHYS3, LOADS3, DEFAULT_LOAD3 } from './build_phys3.js';
import { loadsNow, createPeaks, peakSummary, stressCss } from './grid_stress.js';
import * as C from './grid3d_cam.js';

export const MAT_COLOR = { wood: '#c98a45', steel: '#9fb4c9', rope: '#d8b46a', cable: '#b9c4d0' };
export const TAP = { node: 26, nodeOther: 20, rod: 14, point: 30 };   // plukkradier i piksler (finger)
const FPS_STEPS = 6;   // flest fysikk-steg per tegning

export function createLab3d({ site, deck = true, logEv = () => {}, getSlow = () => 0.3, getPick = () => TAP.node } = {}) {
  const B = createBuild3(site, deck), cam = C.camNew(site), layers = { x: C.layerMid(site, 'x'), y: C.layerMid(site, 'y'), z: C.layerMid(site, 'z') };
  const ctl = { B, cam, layers, site, tool: 'build', mat: matsOf(site)[0], sel: null, state: 'build', paused: false, slow: false, sim: null, peaks: null, last: null, guideOn: false, msg: null, acc: 0 };
  const log = (t, d) => { try { logEv('bygg3d', `${t}${d ? ': ' + d : ''}`); } catch { /* ingen logg */ } };
  const edited = () => { ctl.last = null; ctl.peaks = null; ctl.sim = null; if (ctl.state !== 'build') ctl.state = 'build'; ctl.paused = false; ctl.acc = 0; };

  // ---------- kamera og lag ----------
  const axis = () => C.layerAxisOf(cam.view);
  const layerValue = () => layers[axis()];
  function setView(id) { if (!C.VIEWS[id]) return false; C.camView(cam, id); log('visning', id); return true; }
  function setLayer(v) { const a = axis(), vals = C.layerValues(site, a); if (!vals.some((q) => Math.abs(q - v) < 1e-3)) return false; layers[a] = v; return true; }
  function stepLayer(dir) { const a = axis(), nv = C.layerStep(site, a, layers[a], dir), ch = nv !== layers[a]; layers[a] = nv; if (ch) log('lag', `${a}=${nv}`); return ch; }
  const layerInfo = () => { const a = axis(), v = layers[a], { i, n } = C.layerIndex(site, a, v); return { axis: a, value: v, i: i + 1, n }; };

  // ---------- bygging ----------
  const nodes3 = () => B.rg.nodes;
  const pickRadius = () => { const r = getPick(); return Number.isFinite(r) && r > 8 ? r : TAP.node; };
  function addRod(a, b) {
    const r = g3AddRod(B, a, b, ctl.mat); if (!r.ok) return { kind: 'rodfail', why: r.why };
    edited(); log('stav', `${ctl.mat} ${a}-${b} (${cost3(B.rg)}/${site.budget})`); return { kind: 'rod', rod: r.rod };
  }
  // trykk på skjermpunktet (sx, sy) i et lerret w × h
  function tap(sx, sy, w, h) {
    if (ctl.state === 'run') return { kind: 'busy' };
    const G = B.rg, ax = axis(), val = layers[ax], rad = pickRadius();
    const nodeItems = (inL) => G.nodes.filter((n) => C.inLayer(n, ax, val) === inL).map((n) => ({ n, p: n }));
    const dOf = (it) => (it ? Math.hypot(C.project(cam, it.p, w, h).x - sx, C.project(cam, it.p, w, h).y - sy) : Infinity);
    const hi = C.pickNearest(cam, nodeItems(true), sx, sy, w, h, rad), ho = C.pickNearest(cam, nodeItems(false), sx, sy, w, h, Math.min(rad, TAP.nodeOther));
    let hit = hi; if (ho && (!hi || dOf(ho) < dOf(hi) - 5)) hit = ho;   // knuter i laget vinner, men en knute i et annet lag som ligger tydelig nærmere (foran/bak hverandre) kan velges
    if (ctl.tool === 'erase') {
      if (hit && !hit.n.fixed && !hit.n.deck) { const id = hit.n.id; g3RemoveNode(B, id); edited(); ctl.sel = null; log('slett knute', id); return { kind: 'erased-node', id }; }
      let best = null, bd = TAP.rod;
      for (const r of G.rods) { if (r.deck) continue; const a = nodeOf(G, r.a), b = nodeOf(G, r.b), d = C.segDist(C.project(cam, a, w, h), C.project(cam, b, w, h), sx, sy); if (d < bd) { bd = d; best = r; } }
      if (best) { g3RemoveRod(B, best.id); edited(); log('slett stav', best.id); return { kind: 'erased-rod', id: best.id }; }
      return { kind: hit ? 'fixed' : 'none' };
    }
    if (hit) {   // BYGG: velg knute eller lag stav
      const id = hit.n.id;
      if (!ctl.sel) { ctl.sel = id; return { kind: 'sel', id }; }
      if (ctl.sel === id) { ctl.sel = null; return { kind: 'unsel', id }; }
      const from = ctl.sel; ctl.sel = null; const r = addRod(from, id); return { ...r, from, to: id };
    }
    const pts = C.layerPoints(site, ax, val).filter((p) => !nodeAt(G, p)).map((p) => ({ p }));
    const pt = C.pickNearest(cam, pts, sx, sy, w, h, Math.max(rad, TAP.point));
    if (!pt) { const had = !!ctl.sel; ctl.sel = null; return { kind: had ? 'unsel' : 'none' }; }
    const r = g3AddNode(B, pt.p); if (!r.ok) return { kind: 'nodefail', why: r.why };
    edited(); log('knute', `${r.node.id} (${pt.p.x},${pt.p.y},${pt.p.z})`);
    if (ctl.sel) { const from = ctl.sel; ctl.sel = null; const rr = addRod(from, r.node.id); return { ...rr, node: r.node, from, to: r.node.id, kind: rr.kind === 'rod' ? 'node+rod' : 'node-rodfail', why: rr.why }; }
    ctl.sel = r.node.id; return { kind: 'node', node: r.node };
  }
  const setTool = (t) => { if (t !== 'build' && t !== 'erase') return false; ctl.tool = t; ctl.sel = null; return true; };
  const setMat = (m) => { if (!matsOf(site).includes(m)) return false; ctl.mat = m; return true; };
  const undo = () => { if (ctl.state === 'run') return false; const ok = g3Undo(B); if (ok) { edited(); ctl.sel = null; log('angre'); } return ok; };
  const reset = () => { if (ctl.state === 'run') return false; g3Reset(B); edited(); ctl.sel = null; log('nullstill'); return true; };

  // ---------- hint (tetraeder) ----------
  function keyNode(key) {
    const G = B.rg; if (/^[ad]\d+$/.test(key)) return nodeOf(G, key) || null;
    const g = (site.guide || []).find((s) => s.k === 'node' && s.key === key); if (!g) return null; return nodeAt(G, { x: g.p[0], y: g.p[1], z: g.p[2] }) || null;
  }
  // neste trinn i guiden: { k:'node', p, t, key } | { k:'rod', a, b (id-er), t } | { done: true } | null (stedet har ingen guide)
  function guideNext() {
    const gd = site.guide; if (!gd || !gd.length) return null;
    for (const s of gd) {
      if (s.k === 'node') { if (!keyNode(s.key)) return { k: 'node', key: s.key, p: { x: s.p[0], y: s.p[1], z: s.p[2] }, t: s.t }; continue; }
      const a = keyNode(s.a), b = keyNode(s.b); if (!a || !b) return { k: 'wait', t: s.t };
      if (!B.rg.rods.some((r) => (r.a === a.id && r.b === b.id) || (r.a === b.id && r.b === a.id))) return { k: 'rod', a: a.id, b: b.id, t: s.t };
    }
    return { done: true };
  }
  const guideProgress = () => { const gd = site.guide || []; let n = 0; for (const s of gd) { if (s.k === 'node') { if (keyNode(s.key)) n++; } else { const a = keyNode(s.a), b = keyNode(s.b); if (a && b && B.rg.rods.some((r) => (r.a === a.id && r.b === b.id) || (r.a === b.id && r.b === a.id))) n++; } } return { n, of: gd.length }; };
  // SÅ SLIK: slår på guiden og flytter kameraet til neste trinn (FORAN og riktig lag)
  function guideGo() {
    ctl.guideOn = true; const g = guideNext(); if (!g) return null; log('hint', g.k + (g.key ? ' ' + g.key : ''));
    if (g.k === 'node') { C.camView(cam, 'foran'); setLayer(g.p.z); }
    else if (g.k === 'rod') { const a = nodeOf(B.rg, g.a), b = nodeOf(B.rg, g.b), n = [a, b].find((q) => !q.fixed && !q.deck) || a; C.camView(cam, 'foran'); setLayer(n.z); }
    return g;
  }
  // utfylt eksempel (til test og «vis meg»): bygger hele guiden i stål/tre; returnerer antall staver
  function guideAuto(mat = 'wood') {
    ctl.mat = mat; let n = 0, guard = 40;
    while (guard-- > 0) { const g = guideNext(); if (!g || g.done) break; if (g.k === 'node') { const r = g3AddNode(B, g.p); if (!r.ok) break; edited(); } else if (g.k === 'rod') { const r = addRod(g.a, g.b); if (r.kind !== 'rod') break; n++; } else break; }
    return n;
  }

  // ---------- kostnad og prøve ----------
  const status = () => { const cost = cost3(B.rg), budget = Number.isFinite(site.budget) ? site.budget : null; return { cost, budget, over: budget != null && cost > budget, nodes: userNodes(B.rg).length, rods: userRods(B.rg).length, maxNodes: MAX_NODES, maxRods: MAX_RODS, stars: ctl.last && ctl.last.passed ? ctl.last.stars : 0 }; };
  function start() {
    if (ctl.state === 'run') return { ok: false, why: 'busy' };
    if (!userRods(B.rg).length) return { ok: false, why: 'empty' };
    const def = simDef3(B), load = site.load && LOADS3[site.load] ? site.load : DEFAULT_LOAD3;
    ctl.sim = createSim3(def, { load: B.rg.deck ? load : null }); ctl.peaks = createPeaks(); ctl.state = 'run'; ctl.paused = false; ctl.last = null; ctl.acc = 0; ctl.sel = null;
    log('prøve', `${ctl.sim.mode}, ${userNodes(B.rg).length} knuter, ${userRods(B.rg).length} staver, kostnad ${cost3(B.rg)}`); return { ok: true, mode: ctl.sim.mode };
  }
  function finish() {
    const s = ctl.sim, won = s.state.state === 'won', st = status(), over = st.over, passed = won && !over;
    const sum = peakSummary(ctl.peaks.peaks, s.breaks);
    ctl.last = { won, reason: s.state.reason, t: +s.t.toFixed(2), cost: st.cost, budget: st.budget, over, passed, stars: stars3(site, B.rg, passed), top: sum.first || sum.top, breaks: s.breaks.length };
    ctl.state = 'done'; log('prøve ferdig', `${won ? 'vant' : 'tapte (' + s.state.reason + ')'}, kostnad ${st.cost}/${st.budget}, ${ctl.last.stars} stjerner`); return ctl.last;
  }
  // tid fra tegning til tegning (sekunder); kjører fysikken i sanntid (SLOW: tregere). Returnerer true når den ble ferdig nå.
  function advance(dt) {
    if (ctl.state !== 'run' || ctl.paused) return false;
    ctl.acc += Math.min(0.1, Math.max(0, dt)) * (ctl.slow ? Math.min(1, Math.max(0.05, getSlow())) : 1);
    let n = 0; while (ctl.acc >= PHYS3.DT && n < FPS_STEPS && ctl.sim.state.state === 'run') { ctl.sim.step(); ctl.peaks.feed(ctl.sim.axial(), ctl.sim.t); ctl.acc -= PHYS3.DT; n++; }
    if (ctl.sim.state.state !== 'run') { finish(); return true; } return false;
  }
  function runAll() {   // hele prøven med en gang (tester, og når tegningen er for treg)
    if (ctl.state !== 'run') { const r = start(); if (!r.ok) return r; }
    let guard = 2000; while (ctl.sim.state.state === 'run' && guard-- > 0) { ctl.sim.step(); ctl.peaks.feed(ctl.sim.axial(), ctl.sim.t); }
    return { ok: true, last: finish() };
  }
  const togglePause = () => { if (ctl.state !== 'run') return false; ctl.paused = !ctl.paused; return ctl.paused; };
  const toggleSlow = () => { ctl.slow = !ctl.slow; return ctl.slow; };
  const back = () => { if (ctl.state === 'build') return false; ctl.state = 'build'; ctl.sim = null; ctl.paused = false; return true; };   // tilbake til bygging (beholder farger til neste endring)

  // ---------- frame: alt visningen skal tegne ----------
  function frame(w, h) {
    const ax = axis(), val = layers[ax], G = B.rg, run = ctl.sim && (ctl.state === 'run' || ctl.state === 'done');
    const pos = new Map(); if (run) for (const p of ctl.sim.nodePos()) pos.set(p.id, p);
    const at = (n) => { const q = pos.get(n.id) || n; return { x: q.x, y: q.y, z: q.z }; };
    const live = run && ctl.peaks ? (ctl.state === 'run' ? loadsNow(ctl.sim.axial()) : null) : null;
    const pk = run && ctl.peaks ? ctl.peaks.peaks : null;
    const out = { axis: ax, value: val, view: cam.view, state: ctl.state };
    out.quad = C.layerQuad(site, ax, val).map((p) => C.project(cam, p, w, h));
    out.box = C.boxEdges(site).map(([a, b]) => [C.project(cam, a, w, h), C.project(cam, b, w, h)]);
    out.ground = Number.isFinite(site.floor) ? C.layerQuad({ ...site, y: [site.floor, site.floor] }, 'y', site.floor).map((p) => C.project(cam, p, w, h)) : null;
    out.dots = ctl.state === 'build' ? C.layerPoints(site, ax, val).filter((p) => !nodeAt(G, p)).map((p) => C.project(cam, p, w, h)) : [];
    const g = ctl.guideOn && ctl.state === 'build' ? guideNext() : null;
    out.nodes = G.nodes.map((n) => { const q = C.project(cam, at(n), w, h); return { id: n.id, x: q.x, y: q.y, s: q.s, z: q.z, fixed: !!n.fixed, deck: !!n.deck, inLayer: C.inLayer(n, ax, val), sel: ctl.sel === n.id, guide: !!g && ((g.k === 'rod' && (g.a === n.id || g.b === n.id))) }; });
    const ndx = new Map(out.nodes.map((n) => [n.id, n]));
    out.rods = G.rods.map((r) => {
      const a = ndx.get(r.a), b = ndx.get(r.b), na = nodeOf(G, r.a), nb = nodeOf(G, r.b), sim = run ? ctl.sim.rods.find((q) => q.id === r.id) : null;
      let color = r.deck ? '#e9eef7' : MAT_COLOR[r.mat] || '#ccc', ratio = null, broken = false;
      if (run) { const l = live ? live.get(r.id) : pk && pk.get(r.id); if (l) { ratio = l.r; broken = !!l.broken || !!(sim && sim.broken); if (!r.deck || ratio > 0) color = stressCss(ratio); } }
      return { id: r.id, a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, z: (a.z + b.z) / 2, s: (a.s + b.s) / 2, mat: r.mat, deck: !!r.deck, inLayer: C.inLayer(na, ax, val) && C.inLayer(nb, ax, val), color, ratio, broken, rope: r.mat === 'rope' || r.mat === 'cable', guide: !!g && g.k === 'rod' && ((g.a === r.a && g.b === r.b) || (g.a === r.b && g.b === r.a)) };
    });
    out.rods.sort((p, q) => q.z - p.z); out.nodes.sort((p, q) => q.z - p.z);
    if (g && g.k === 'node') { const q = C.project(cam, g.p, w, h); out.guideNode = { x: q.x, y: q.y, s: q.s, inLayer: C.inLayer(g.p, ax, val) }; }
    if (run && ctl.sim.load) { const lp = ctl.sim.loadPos(), road = ctl.sim.def.road.map((id) => pos.get(id)).filter(Boolean); if (lp && road.length > 1) { const k = Math.min(lp.seg, road.length - 2), a = road[k], b = road[k + 1], t = b.x - a.x > 1e-6 ? Math.min(1, Math.max(0, (lp.x - a.x) / (b.x - a.x))) : 0; const p = { x: lp.x, y: a.y + (b.y - a.y) * t + 0.55, z: a.z + (b.z - a.z) * t }, q = C.project(cam, p, w, h); out.load = { x: q.x, y: q.y, s: q.s }; } }
    return out;
  }

  // ---------- lagring ----------
  const save = () => exportCode3(B);
  function load(code) { const r = importCode3(code, site); if (!r.ok) return r; B.rg = r.G; B.history = []; edited(); ctl.sel = null; return { ok: true }; }

  Object.assign(ctl, { axis, layerValue, layerInfo, setView, setLayer, stepLayer, tap, setTool, setMat, undo, reset, guideNext, guideGo, guideAuto, guideProgress, status, start, advance, runAll, togglePause, toggleSlow, back, frame, save, load, nodes3, maxLen: () => maxLenOf(site), lattice: () => lattice3(site) });
  return ctl;
}
export const passedOf = (ctl) => !!(ctl.last && ctl.last.passed);
