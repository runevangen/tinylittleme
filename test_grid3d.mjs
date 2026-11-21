// R129: node test_grid3d.mjs: 3D-bygging, kjerne (grid3d_logic.js, build_phys3.js; ingen UI): modell, lovlighet, kode, og 3D-fysikk:
// stiv tetraeder holder, boks uten diagonaler faller, tårn med én stav velter, deterministisk, brudd ved overlast, bro med last, ytelse (tak 40 knuter / 120 staver). Ekte følelse og FPS: testes på iPhone.
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const L = await import('./grid3d_logic.js'), P = await import('./build_phys3.js'), GS = await import('./grid_stress.js'), BM = await import('./build_materials.js');
const clone = (x) => JSON.parse(JSON.stringify(x));

const FREE = { id: 'fri', x: [0, 8], y: [0, 8], z: [0, 8], anchors: [{ x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }, { x: 2, y: 0, z: 4 }], budget: 40, stars: [12, 24] };
const BOXS = { ...FREE, id: 'boks', anchors: [{ x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }, { x: 4, y: 0, z: 4 }, { x: 0, y: 0, z: 4 }] };
const BRIDGE = { id: 'bro3d', x: [0, 8], y: [-4, 6], z: [0, 4], anchors: [{ x: 0, y: 0, z: 0 }, { x: 8, y: 0, z: 0 }, { x: 0, y: 0, z: 4 }, { x: 8, y: 0, z: 4 }], road: { a: 0, b: 1 }, budget: 60, stars: [30, 40], mats: ['wood', 'steel', 'rope'] };
const node = (B, x, y, z) => { const r = L.g3AddNode(B, { x, y, z }); assert.ok(r.ok, `knute ${x},${y},${z}`); return r.node.id; };
const rod = (B, a, b, m = 'steel') => { const r = L.g3AddRod(B, a, b, m); assert.ok(r.ok, `stav ${a}-${b}: ${r.why}`); return r.rod.id; };
const tetra = (mat = 'steel') => { const B = L.createBuild3(FREE); const n = node(B, 2, 4, 2); for (const a of ['a1', 'a2', 'a3']) rod(B, a, n, mat); return { B, n }; };
const bridge = () => {
  const B = L.createBuild3(BRIDGE, true), k = [2, 4, 6].map((x) => node(B, x, -2, 2)), d = ['d1', 'd2', 'd3'];
  for (let i = 0; i < 3; i++) rod(B, k[i], d[i], 'wood');
  for (const [a, b] of [[k[0], 'a1'], [k[0], 'a3'], [k[2], 'a2'], [k[2], 'a4'], [k[0], k[1]], [k[1], k[2]], [k[0], 'd2'], [k[1], 'd1'], [k[1], 'd3'], [k[2], 'd2'], [k[1], 'a3'], ['d1', 'a3'], ['d3', 'a4'], ['d2', 'a4']]) rod(B, a, b, 'wood');
  return B;
};

// ---------- 1) rutenett og lovlighet ----------
{
  const pts = L.lattice3(FREE); assert.ok(pts.length > 100); assert.ok(pts.every((p) => p.x >= 0 && p.x <= 8 && p.y >= 0 && p.y <= 8)); assert.ok(L.onLattice(FREE, { x: 2, y: 4, z: 6 })); assert.equal(L.onLattice(FREE, { x: 1, y: 4, z: 6 }), false, 'utenfor rutenettet');
  assert.deepEqual(L.nearestPoint3(FREE, { x: 2.3, y: 3.8, z: 2.2 }), { x: 2, y: 4, z: 2 }); assert.equal(L.nearestPoint3(FREE, { x: 50, y: 0, z: 0 }, 1), null); assert.equal(L.nearestPoint3(FREE, { x: 2.3, y: 3.8, z: 2.2 }, Infinity, 4).z, 4, 'lag-valg (R130)');
  const B = L.createBuild3(FREE); assert.equal(B.rg.nodes.length, 3); assert.ok(B.rg.nodes.every((n) => n.fixed));
  assert.equal(L.g3AddNode(B, { x: 1, y: 1, z: 1 }).why, 'grid'); const n1 = node(B, 2, 4, 2); assert.equal(L.g3AddNode(B, { x: 2, y: 4, z: 2 }).existed, true, 'samme punkt gir samme knute');
  assert.equal(L.rodCheck3(B.rg, 'a1', 'a1').why, 'same'); assert.equal(L.g3AddRod(B, 'a1', n1, 'gull').why, 'mat'); assert.equal(L.g3AddRod(B, 'a1', n1, 'cable').why, 'mat', 'kabel bare hvis stedet sier det');
  const n2 = node(B, 2, 6, 2); const s = rod(B, 'a1', n1); assert.equal(L.g3AddRod(B, n1, 'a1', 'wood').why, 'dup', 'én stav per par');
  assert.equal(L.rodCheck3(B.rg, 'a1', n2, 6.5).why, 'far', 'for lang'); assert.equal(L.rodCheck3(B.rg, 'a1', n2).ok, false);
  const m = node(B, 4, 4, 0); assert.equal(L.rodCheck3(B.rg, n1, m).ok, true); const n3 = node(B, 0, 4, 0); node(B, 2, 4, 0); assert.equal(L.rodCheck3(B.rg, n3, m).why, 'over', 'ikke gjennom en annen knute');
  { const F1 = { ...FREE, step: 1 }, B1 = L.createBuild3(F1), q = node(B1, 0, 1, 0); assert.equal(L.rodCheck3(B1.rg, 'a1', q).why, 'short', 'for kort'); }
  assert.ok(L.g3RemoveRod(B, s)); assert.ok(!L.rodOf(B.rg, s)); assert.ok(L.g3Undo(B)); assert.ok(L.rodOf(B.rg, s), 'ANGRE tar tilbake'); assert.equal(L.g3RemoveNode(B, 'a1'), false, 'ankre kan ikke slettes');
  assert.ok(L.g3RemoveNode(B, n1)); assert.ok(!L.rodOf(B.rg, s), 'stavene i knuten følger med'); assert.ok(L.g3Reset(B)); assert.equal(B.rg.nodes.length, 3); assert.ok(L.g3Undo(B));
  assert.equal(L.rodCheck3(B.rg, 'a1', 'a2', 6.5, { ...FREE, floor: 1 }).why, 'ground', 'under bakken');
}

// ---------- 2) dekk, kostnad, stjerner ----------
{
  const rd = L.siteRoad(BRIDGE); assert.deepEqual([rd.left.x, rd.right.x], [0, 8]); const B = L.createBuild3(BRIDGE, true);
  assert.equal(B.rg.rods.length, 4, 'dekk: ett felt per rute'); assert.ok(B.rg.rods.every((r) => r.deck && r.mat === 'wood')); assert.equal(L.cost3(B.rg), 0, 'dekket er gratis');
  assert.equal(L.g3RemoveRod(B, 'dk1'), false); assert.equal(L.g3RemoveNode(B, 'd1'), false); assert.equal(L.siteRoad(FREE), null);
  assert.equal(L.siteRoad({ ...BRIDGE, anchors: [{ x: 0, y: 0, z: 0 }, { x: 8, y: 1, z: 0 }] }), null, 'veien må være på lik høyde');
  const T = tetra('steel'); const c = BM.rodPrice('steel', Math.hypot(2, 4, 2)) + BM.rodPrice('steel', Math.hypot(2, 4, 2)) + BM.rodPrice('steel', Math.hypot(0, 4, 2)); void c;
  assert.equal(L.cost3(T.B.rg), T.B.rg.rods.reduce((s, r) => s + BM.rodPrice(r.mat, L.rodLen(T.B.rg, r)), 0)); assert.ok(L.withinBudget3(FREE, T.B.rg) || L.cost3(T.B.rg) > 40);
  assert.equal(L.stars3(FREE, T.B.rg, false), 0); assert.equal(L.stars3({ ...FREE, stars: [1000, 2000] }, T.B.rg, true), 3); assert.equal(L.stars3({ ...FREE, stars: [0, 2000] }, T.B.rg, true), 2); assert.equal(L.stars3({ ...FREE, stars: [0, 0] }, T.B.rg, true), 1);
}

// ---------- 3) kode og lagring ----------
{
  const B = bridge(), code = L.exportCode3(B); assert.ok(code.startsWith('TLM3D1.') && !code.startsWith('TLM1.'), 'egen kodeprefiks'); assert.ok(code.length < L.CODE3_MAX);
  const r = L.importCode3(code, BRIDGE); assert.ok(r.ok); assert.deepEqual(L.snapshot3(r.G), L.snapshot3(B.rg)); assert.ok(r.G.deck);
  assert.equal(L.importCode3(code, { ...BRIDGE, id: 'annet' }).why, 'sted'); assert.equal(L.importCode3('', BRIDGE).why, 'tom'); assert.equal(L.importCode3('TLM1.abc.def', BRIDGE).why, 'format', 'gamle koder blandes ikke inn');
  const body = code.split('.')[1]; assert.equal(L.importCode3(`TLM3D1.${body}.zz`, BRIDGE).why, 'sum'); assert.equal(L.importCode3('TLM3D1.!!!.x', BRIDGE).why, 'format'); assert.equal(L.importCode3('x'.repeat(7000), BRIDGE).why, 'lang');
  // ugyldig innhold avvises: stav til ukjent knute, knute utenfor rutenettet
  const sn = clone(L.snapshot3(B.rg)); assert.equal(L.fromSnapshot3(BRIDGE, { ...sn, rods: [...sn.rods, ['rx', 'a1', 'finnes_ikke', 'wood']] }), null); assert.equal(L.fromSnapshot3(BRIDGE, { ...sn, nodes: [...sn.nodes, ['nx', 1, 1, 1]] }), null); assert.equal(L.fromSnapshot3(BRIDGE, null), null);
  assert.equal(L.fromSnapshot3(BRIDGE, { ...sn, rods: sn.rods.map((q, i) => (i ? q : [q[0], q[1], q[2], 'gull'])) }), null, 'ukjent materiale'); assert.deepEqual(L.snapshot3(L.fromSnapshot3(BRIDGE, sn)), sn);
}

// ---------- 4) fysikk: stive og slappe bygg ----------
{
  const { B, n } = tetra('steel'), r = P.runBuild3(B, { mode: 'stand' }, { [n]: 20 }); assert.equal(r.result, 'won', 'stiv tetraeder holder'); assert.ok(r.maxDisp < 0.1); assert.equal(r.breaks.length, 0);
  const A = [{ x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }, { x: 4, y: 0, z: 4 }, { x: 0, y: 0, z: 4 }], Bx = L.createBuild3({ ...BOXS, anchors: A }), top = A.map((a) => node(Bx, a.x, 4, a.z)), ex = {}; top.forEach((t) => (ex[t] = 5));
  A.forEach((a, i) => rod(Bx, 'a' + (i + 1), top[i])); top.forEach((t, i) => rod(Bx, t, top[(i + 1) % 4]));
  const rb = P.runBuild3(Bx, { mode: 'stand' }, ex); assert.equal(rb.result, 'lost', 'boks uten diagonaler faller sammen'); assert.equal(rb.reason, 'fall');
  rod(Bx, 'a1', top[1]); rod(Bx, 'a2', top[2]); rod(Bx, 'a3', top[3]); rod(Bx, 'a4', top[0]); rod(Bx, top[0], top[2]); assert.equal(P.runBuild3(Bx, { mode: 'stand' }, ex).result, 'won', 'med diagonaler står den');
  const Bt = L.createBuild3(FREE), tn = node(Bt, 0, 4, 0); rod(Bt, 'a1', tn, 'wood'); const rt = P.runBuild3(Bt, { mode: 'stand' }, { [tn]: 10 }); assert.equal(rt.result, 'lost', 'tårn på én stav velter'); assert.equal(rt.reason, 'fall');
  const tp = tetra('wood'); assert.equal(P.runBuild3(tp.B, { mode: 'stand' }, { [tp.n]: 30 }).result, 'won', 'tripod (tre staver) med last står');
}

// ---------- 5) brudd, bro med last, belastning ----------
{
  const { B, n } = tetra('wood'), r = P.runBuild3(B, { mode: 'stand' }, { [n]: 600 }); assert.equal(r.result, 'lost'); assert.equal(r.reason, 'brudd'); assert.ok(r.breaks.length >= 1 && ['buckle', 'crush', 'tear'].includes(r.breaks[0].mode), 'brudd ved overlast');
  const S = tetra('steel'); assert.equal(P.runBuild3(S.B, { mode: 'stand' }, { [S.n]: 600 }).result, 'won', 'stål tåler den lasten (materiale teller)');
  // tau bærer bare strekk: et tau som holder en last hengt ned fra to ankre henger, men et tau som skal bære trykk gir etter
  const Br = bridge(); for (const [l, ok] of [['ball', true], ['car', true], ['heavy', false]]) { const x = P.runBuild3(Br, { load: l }); assert.equal(x.mode, 'load'); assert.equal(x.result === 'won', ok, `last ${l}`); if (!ok) assert.ok(x.breaks.length); }
  assert.equal(P.runBuild3(L.createBuild3(BRIDGE, true), { load: 'heavy' }).result, 'lost', 'dekk uten bærende konstruksjon holder ikke en tung last');
  // belastning gjenbruker grid_stress
  const sim = P.createSim3(P.simDef3(Br), { load: 'car' }); let peak = 0; for (let i = 0; i < 500 && sim.state.state === 'run'; i++) { sim.step(); for (const l of GS.loadsNow(sim.axial()).values()) peak = Math.max(peak, l.r); }
  assert.ok(peak > 0.1 && peak < 1, 'belastning mellom 10 % og brudd for en bro som holder: ' + peak); const lines = sim.axial(); assert.equal(lines.length, Br.rg.rods.length); for (const a of lines) assert.ok(['id', 'nc', 'nt', 'pcr', 'tcap', 'ccap', 'broken', 'mode'].every((k) => k in a));
  const peaks = GS.createPeaks(); peaks.feed(sim.axial(), sim.t); assert.ok(GS.peakSummary(peaks.peaks).top);
  // tau er slakt i trykk: ingen kraft, ingen knekking
  const Tr = L.createBuild3(FREE), tn = node(Tr, 2, 4, 2); for (const a of ['a1', 'a2', 'a3']) rod(Tr, a, tn, 'rope'); const rr = P.runBuild3(Tr, { mode: 'stand' }, { [tn]: 5 }); assert.equal(rr.breaks.length, 0, 'tau knekker ikke');
}

// ---------- 6) deterministisk ----------
{
  const run = () => JSON.stringify([P.runBuild3(bridge(), { load: 'car' }), P.runBuild3(bridge(), { load: 'heavy' }), (() => { const t = tetra('wood'); return P.runBuild3(t.B, { mode: 'stand' }, { [t.n]: 600 }); })()]);
  const a = run(), b = run(); assert.equal(a, b, 'samme bygg gir samme utfall, bit for bit');
  const Br = bridge(), s1 = P.createSim3(P.simDef3(Br), { load: 'car' }), s2 = P.createSim3(P.simDef3(Br), { load: 'car' }); for (let i = 0; i < 80; i++) { s1.step(); s2.step(); } assert.deepEqual(s1.nodePos(), s2.nodePos()); assert.deepEqual(s1.axial(), s2.axial());
}

// ---------- 7) ytelse: tak 40 knuter / 120 staver, hele prøven under 2 s ----------
{
  const big = { id: 'stor', x: [0, 20], y: [0, 20], z: [0, 20], step: 2, anchors: [{ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 0, y: 0, z: 2 }, { x: 2, y: 0, z: 2 }] }, B = L.createBuild3(big);
  for (const p of L.lattice3(big).filter((q) => q.y >= 2).slice(0, 36)) L.g3AddNode(B, p); assert.equal(B.rg.nodes.length, L.MAX_NODES, 'tak på knuter');
  const ids = B.rg.nodes.map((n) => n.id); for (const a of ids) for (const b of ids) if (a < b && B.rg.rods.length < L.MAX_RODS) L.g3AddRod(B, a, b, 'steel');
  assert.equal(B.rg.rods.length, L.MAX_RODS, 'tak på staver'); assert.equal(L.g3AddRod(B, ids[0], ids[ids.length - 1], 'wood').ok, false);
  const f0 = P.PHYS3.FALL_D; P.PHYS3.FALL_D = 1e9; const t0 = Date.now(), sim = P.createSim3(P.simDef3(B), { mode: 'stand' }); while (sim.state.state === 'run') sim.step(); const ms = Date.now() - t0; P.PHYS3.FALL_D = f0;
  assert.ok(sim.steps >= 250, 'hele prøven kjørt (' + sim.steps + ' steg)'); assert.ok(ms < 2000, `prøven tok ${ms} ms (tak 2000)`); console.log(`  ytelse: ${sim.steps} steg, 40 knuter / 120 staver, ${ms} ms`);
}
console.log('test_grid3d: ok');
