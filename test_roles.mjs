// node test_roles.mjs: R157, roller i byggeren (gulv, bjelke og tau): standardrolle, overstyring, PRØV, rommet, varsler, gamle bygg og koder, hekter.
import fs from 'node:fs';
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const R = await import('./build_roles.js'), V = await import('./build_roles_view.js'), G = await import('./grid_logic.js'), BL = await import('./build_logic.js'), BP = await import('./build_phys.js'), BW = await import('./build_world.js'), CP = await import('./build_capacity.js');
const src = (f) => fs.readFileSync(new URL('./' + f, import.meta.url), 'utf8');
const lvl = (n) => JSON.parse(src(`levels/${n}.level.json`));
const lab = lvl('bygglab').build.sites, site = (id) => JSON.parse(JSON.stringify(lab.find((s) => s.id === id)));
const P = (id, type, u, v, rot = 0, role) => ({ id, type, u, v, rot, ...(role ? { role } : {}) });
const deg = (d) => d * Math.PI / 180;

// ---------- 1) standardrolle ----------
assert.equal(R.tiltRole(0), 'gulv'); assert.equal(R.tiltRole(deg(15)), 'gulv'); assert.equal(R.tiltRole(deg(30)), 'gulv', '30° er fortsatt gulv'); assert.equal(R.tiltRole(0.5236), 'gulv', 'avrundet 30° i brettfilene');
assert.equal(R.tiltRole(deg(45)), 'bjelke'); assert.equal(R.tiltRole(deg(90)), 'bjelke'); assert.equal(R.tiltRole(deg(-60)), 'bjelke'); assert.equal(R.tiltRole(deg(170)), 'gulv', 'nesten flat, snudd');
assert.equal(R.partRole(P('a', 'plank_l', 0, 0, 0)), 'gulv'); assert.equal(R.partRole(P('a', 'plank_s', 0, 0, deg(45))), 'bjelke'); assert.equal(R.partRole(P('a', 'plank_t', 0, 0, deg(75))), 'bjelke');
for (const t of ['block', 'weight', 'book', 'sponge', 'lego', 'pencil', 'ruler']) assert.equal(R.partRole(P('a', t, 0, 0, deg(60))), 'gulv', `${t}: klosser og leker starter som gulv`);
assert.equal(R.partRole(P('v', 'seesaw', 0, 0, deg(60))), 'gulv', 'vippeplanken er alltid gulv'); assert.equal(R.partRole(P('v', 'seesaw', 0, 0, 0, 'bjelke')), 'gulv', 'vippeplanken kan ikke bli bjelke'); assert.equal(R.partCanSwitch(P('v', 'seesaw', 0, 0)), false);
assert.equal(R.partRole(P('r', 'rod_rope_300', 0, 0, 0, 'gulv')), 'tau', 'tau er alltid tau'); assert.equal(R.fixedRole('rod_cable_300'), 'tau'); assert.equal(R.fixedRole('rod_steel_300'), null);
// rollen følger med når delen roteres forbi grensen, helt til spilleren har valgt selv
{
  const s = site('lab1'), B = BL.createBuild(s, { p1: 'plank_s', k1: 'book' }, ['p1', 'k1']); BL.place(B, 'p1', 0, 2, 0); const p = B.placed[0];
  assert.equal(R.partRole(p), 'gulv'); BL.rotate(B, 'p1', deg(45)); assert.equal(R.partRole(p), 'bjelke', 'rotert forbi 30°: bjelke'); BL.rotate(B, 'p1', -deg(45)); assert.equal(R.partRole(p), 'gulv');
  // overstyring: valget står fast
  const h0 = B.history.length; assert.ok(BL.setRole(B, 'p1')); assert.equal(B.placed[0].role, 'bjelke'); assert.equal(B.history.length, h0 + 1, 'rollebytte skriver historikk');
  BL.rotate(B, 'p1', deg(15)); assert.equal(R.partRole(B.placed[0]), 'bjelke'); BL.place(B, 'p1', 1, 3); assert.equal(R.partRole(B.placed[0]), 'bjelke', 'flytting endrer ikke et valg');
  assert.equal(BL.setRole(B, 'p1', 'bjelke'), null, 'samme rolle igjen = ingen endring');
  // klosser og leker kan også merkes som bjelke
  BL.place(B, 'k1', -2, 1, 0); assert.ok(BL.setRole(B, 'k1')); assert.equal(R.partRole(B.placed.find((q) => q.id === 'k1')), 'bjelke');
  // ANGRE tar rollebyttet tilbake, og nullstill fjerner alt
  assert.ok(BL.undo(B)); assert.equal(R.partRole(B.placed.find((q) => q.id === 'k1')), 'gulv', 'ANGRE gjelder rollebytte');
  // samme pris: kostnaden er lik med og uten rolle
  const Bud = await import('./build_budget.js'); const c0 = Bud.starsFor(s, B.placed.map(({ role, ...q }) => q), B.links), c1 = Bud.starsFor(s, B.placed, B.links); assert.deepEqual(c1, c0, 'rollen endrer ikke kostnad eller stjerner');
  // lagring («Fortsett») og delekode tar med valget; gamle data uten rolle får standardrollen
  const sv = BL.serialize(B); assert.equal(sv.placed.find((q) => q.id === 'p1').role, 'bjelke'); assert.ok(!('role' in sv.placed.find((q) => q.id === 'k1')), 'uten valg lagres ingen rolle');
  const B2 = BL.createBuild(s, B.types, B.have); BL.restore(B2, sv); assert.equal(B2.placed.find((q) => q.id === 'p1').role, 'bjelke');
  const B3 = BL.createBuild(s, B.types, B.have); BL.restore(B3, { have: sv.have, placed: sv.placed.map(({ role, ...q }) => q), links: [] }); assert.ok(B3.placed.every((q) => !q.role), 'gammel lagring: ingen rolle, standard gjelder');
  BL.restore(B3, { have: sv.have, placed: sv.placed.map((q) => ({ ...q, role: 'tull' })), links: [] }); assert.ok(B3.placed.every((q) => !q.role), 'ukjent rolle kastes');
  const code = BL.exportCode(B), B4 = BL.createBuild(s, B.types, B.have), r4 = BL.importCode(code, B4); assert.ok(r4.ok, 'ny kode leses'); BL.applyImport(B4, r4); assert.equal(B4.placed.find((q) => q.id === 'p1').role, 'bjelke', 'koden har plass til rollen');
  // en gammel kode (fire tall per del) leses som før
  const old = (() => { const body = BL.toB64(JSON.stringify([1, s.id, [['p1', 0, 2000, 0]], []])); return `${BL.CODE_PREFIX}${body}.${BL.fnv(body)}`; })();
  const r5 = BL.importCode(old, B4); assert.ok(r5.ok && r5.placed.length === 1 && !r5.placed[0].role, 'gammel TLM1-kode virker');
  const badc = (() => { const body = BL.toB64(JSON.stringify([1, s.id, [['p1', 0, 2000, 0, 7]], []])); return `${BL.CODE_PREFIX}${body}.${BL.fnv(body)}`; })(); assert.equal(BL.importCode(badc, B4).why, 'verdi', 'ugyldig rolle i koden avvises');
  assert.ok(BL.reset(B)); assert.equal(B.placed.length, 0);
}

// ---------- 2) rutenett: veilinje som før, uten veilinje etter helning, bytte, lagring og kode ----------
{
  const s = site('lab4'), B = BL.createBuild(s, {}, []); B.gridDeck = false; G.setMode(B, 'grid'); const [a1, a2] = B.rg.nodes.map((n) => n.id), st = G.gridStep(s);
  let r = G.gAddRodTo(B, a1, -2.5 + st, 0, 'steel'); const d1 = r.node.id; r = G.gAddRodTo(B, d1, -2.5 + 2 * st, 0, 'steel'); const d2 = r.node.id; r = G.gAddRodTo(B, d2, -2.5 + 3 * st, 0, 'steel'); const d3 = r.node.id; G.gAddRod(B, d3, a2, 'steel');
  r = G.gAddRodTo(B, a1, -2.5 + st, st, 'steel'); const t1 = r.node.id, sup = r.rod.id; G.gAddRod(B, t1, d1, 'steel'); const rope = G.gAddRod(B, t1, d2, 'rope').rod.id;
  const road = G.roadRodIds(B), roles = G.rodRoles(B);
  for (const q of B.rg.rods) assert.equal(roles.get(q.id), q.mat === 'rope' ? 'tau' : road.has(q.id) ? 'gulv' : 'bjelke', `${q.id}: veilinjen gir standardrollen (som R108)`);
  { const T0 = BL.createBuild(site('lab4'), {}, []); T0.gridDeck = false; G.setMode(T0, 'grid'); const rr = G.gAddRodTo(T0, T0.rg.nodes[0].id, -2.5 + st, 0, 'rope'); assert.equal(G.rodRole(T0, rr.rod), 'gulv', 'tau PÅ veilinjen er veibane som i R108 (hengende dekk)'); assert.equal(G.rodCanSwitch(rr.rod), false); }
  assert.deepEqual(G.loadPass(B).sort(), B.rg.rods.filter((q) => !road.has(q.id)).map((q) => q.id).sort(), 'loadPass er som før på et sted med veilinje');
  assert.equal(G.rodCanSwitch(G.rodOf(B.rg, rope)), false, 'tau kan ikke bytte rolle'); assert.equal(G.gSetRole(B, rope), null);
  // bytte: skrå støtte -> gulv og tilbake; ANGRE
  const h0 = B.history.length; assert.ok(G.gSetRole(B, sup)); assert.equal(G.rodRole(B, G.rodOf(B.rg, sup)), 'gulv'); assert.ok(!G.loadPass(B).includes(sup)); assert.equal(B.history.length, h0 + 1);
  assert.equal(G.roleStats(B).valgt, 1); assert.match(R.roleLine(G.roleStats(B)), /gulv 5, bjelke 1, tau 1 \(valgt selv: 1\)/);
  const cost0 = (await import('./build_budget.js')).starsFor(s, B.placed, B.links).cost;
  // lagring og kode
  const snap = G.gridSnapshot(B.rg), G2 = G.gridFromSnapshot(s, snap); assert.equal(G.rodOf(G2, sup).role, 'gulv', 'lagringen husker valget'); assert.ok(G2.rods.filter((q) => q.id !== sup).every((q) => !q.role));
  const code = G.gridExport(B), T2 = BL.createBuild(s, {}, []); G.setMode(T2, 'grid'); const imp = G.gridImport(code, T2); assert.ok(imp.ok); assert.equal(imp.grid.rods.filter((q) => q.role === 'gulv').length, 1, 'rutenett-koden har plass til rollen');
  assert.ok(G.gUndo(B)); assert.equal(G.rodRole(B, G.rodOf(B.rg, sup)), 'bjelke', 'ANGRE gjelder rollebytte'); assert.equal((await import('./build_budget.js')).starsFor(s, B.placed, B.links).cost, cost0, 'samme pris');
  // gammel rutenett-kode (tre tall per stav) leses som før
  const oldCode = G.gridExport(B); assert.ok(JSON.parse(BL.fromB64(oldCode.split('.')[1]))[3].every((q) => q.length === 3), 'uten valg er koden i gammelt format'); assert.ok(G.gridImport(oldCode, T2).ok);
  const badG = (() => { const j = JSON.parse(BL.fromB64(oldCode.split('.')[1])); j[3][0].push(9); const body = BL.toB64(JSON.stringify(j)); return `${BL.CODE_PREFIX}${body}.${BL.fnv(body)}`; })(); assert.equal(G.gridImport(badG, T2).why, 'verdi');
  // PRØV: lasten går på veien og forbi støtta; samme bro bærer like mye (samme brudd og samme utfall med og uten rollene)
  const withRoles = BP.runSim(G.simDefAuto(B).def, {}); G.GRIDOPT.pass = false; const allSolid = G.simDefAuto(B); assert.equal(allSolid.passed, false, 'av: ingen staver slipper lasten forbi'); assert.deepEqual(G.loadPass(B), []); G.GRIDOPT.pass = true;
  assert.equal(withRoles.result, 'won', `broen bærer figuren (${withRoles.reason})`); assert.equal(withRoles.breaks.length + withRoles.linkBreaks.length, 0);
  // i rommet: bare gulvet blir faste flater
  const solids = BW.buildSolids(s, BP.settledPlaced(G.simDef(B)), { skip: new Set(G.loadPass(B)) }), ids = new Set(solids.map((q) => q.id));
  assert.ok(!ids.has(`bygg_${s.id}_${sup}`) && !ids.has(`bygg_${s.id}_${rope}`), 'skrå støtte og tau gir ingen kollisjon i rommet'); assert.equal(ids.size, 4, 'de fire veistavene er gulv');
  // nullstill tar bort valgene
  G.gSetRole(B, sup); assert.ok(G.gReset(B)); assert.equal(G.roleStats(B).valgt, 0);
}
{   // skrå bru uten veilinje: bratt stav er bjelke til den merkes som gulv
  const s = site('lab3'); s.deck[1].top = 4.875; s.goal.v = 4.875; s.grid.anchors[1].v = 4.875; delete s.grid.stage;
  const B = BL.createBuild(s, {}, []); G.setMode(B, 'grid'); assert.equal(G.roadLevel(s), null, 'ingen veilinje');
  const [a1, a2] = B.rg.nodes.map((n) => n.id); const r1 = G.gAddRodTo(B, a1, 0, 3.25, 'steel'); G.gAddRod(B, r1.node.id, a2, 'steel');
  assert.deepEqual([...G.rodRoles(B).values()], ['bjelke', 'gulv'], '45° = bjelke, 27° = gulv');
  assert.equal(BP.runSim(G.simDefAuto(B).def, {}).result, 'lost', 'figuren går forbi bjelken og faller');
  assert.ok(G.gSetRole(B, r1.rod.id, 'gulv')); assert.equal(BP.runSim(G.simDefAuto(B).def, {}).result, 'won', 'merket som gulv: brua kan fullføres');
  const ev = (await import('./build_budget.js')).starsFor(s, B.placed, B.links); assert.ok(ev.cost > 0);
  // en knute flyttes: standardrollen følger helningen, valget står fast
  const B2 = BL.createBuild(s, {}, []); G.setMode(B2, 'grid'); const q1 = G.gAddRodTo(B2, B2.rg.nodes[0].id, 0, 1.625, 'steel'); assert.equal(G.rodRole(B2, q1.rod), 'gulv'); assert.ok(G.gMoveNode(B2, q1.node.id, 0, 4.875).ok); assert.equal(G.rodRole(B2, G.rodOf(B2.rg, q1.rod.id)), 'bjelke', 'flyttet forbi 30°: rollen følger med');
}

// ---------- 3) klassisk bygger: PRØV og rommet ----------
{
  const s = site('lab1');
  // bro med en lang planke som står rett opp midt på (holdt av to tau): før sperret den, nå er den en bjelke figuren går forbi
  const gnd = (id, u, v) => ({ id, kind: 'rope', a: 'st', la: { x: 0, y: 0 }, b: null, lb: null, g: { u, v } });
  const wall = [P('p1', 'plank_l', 0, 0.25), P('st', 'plank_l', 0, 4.5, Math.PI / 2)], links = [{ id: 'k1', kind: 'tape', a: 'p1', la: { x: 0, y: 0.25 }, b: 'st', lb: { x: -4, y: 0 } }, gnd('r1', -3, 9), gnd('r2', 3, 9)];
  const def = R.classicDef(s, wall, links); assert.deepEqual(def.loadPass, ['st'], 'stående planke er bjelke'); assert.ok(!('role' in def.placed[0]));
  const before = BP.runSim({ site: s, placed: wall, links }), now = BP.runSim(def); assert.equal(now.result, 'won', `figuren går forbi bjelken (${now.reason})`); assert.notEqual(before.result, 'won', 'uten rollene sperret den veien');
  const asFloor = wall.map((p) => (p.id === 'st' ? { ...p, role: 'gulv' } : p)); assert.equal(R.classicDef(s, asFloor, links).loadPass, undefined); assert.notEqual(BP.runSim(R.classicDef(s, asFloor, links)).result, 'won', 'merket som gulv stopper den igjen');
  // en trekant av skrå planker oppå broen: før klatret figuren over mønet, nå går den på broen og forbi sperrene
  { const tri = [P('p1', 'plank_l', 0, 0.25), P('s1', 'plank_s', -1, 2.2, Math.PI / 3), P('s2', 'plank_s', 1, 2.2, -Math.PI / 3)], hg = (id, a, ax, ay, b2, bx, by) => ({ id, kind: 'hinge', a, la: { x: ax, y: ay }, b: b2, lb: { x: bx, y: by } }), tl = [hg('h1', 'p1', -2, 0.25, 's1', -2, 0), hg('h2', 'p1', 2, 0.25, 's2', 2, 0), hg('h3', 's1', 2, 0, 's2', -2, 0)];
    const top = (d) => { const sm = BP.createSim(d, {}); let m = -9; while (sm.state.state === 'run' && sm.t < 30) { sm.step(); m = Math.max(m, sm.figure.y); } return { m, res: sm.state.state }; };
    const on = top(R.classicDef(s, tri, tl)), off = top({ site: s, placed: tri, links: tl }); console.log("trekant på broen: høyeste punkt med roller", on.m.toFixed(2), "uten", off.m.toFixed(2)); assert.equal(on.res, "won"); assert.ok(on.m < 3, `figuren holder seg på gulvet (et lite hopp opp på broen er normalt) (høyeste punkt ${on.m.toFixed(2)})`); assert.ok(off.m > on.m + 1, `uten rollene gikk den på bjelkene (${off.m.toFixed(2)})`); }
  // en kloss merket som bjelke kan aldri sperre veien
  const blk = [P('p1', 'plank_t', 0, 0.6), P('k1', 'weight', 0, 1.95), P('k2', 'weight', 0, 3.45), P('k3', 'weight', 0, 4.95)];
  assert.notEqual(BP.runSim(R.classicDef(s, blk, [])).result, 'won', 'et tårn av tunge klosser (gulv) stopper figuren'); assert.equal(BP.runSim(R.classicDef(s, blk.map((p) => (p.type === 'weight' ? { ...p, role: 'bjelke' } : p)), [])).result, 'won', 'klosser merket som bjelke stopper ingenting');
  // skrå støtte under broen: bærer som før, men er ikke gulv (verken i PRØV eller i rommet)
  const f = site('lab4'), tri = f.lab.solutions[0]; const tdef = R.classicDef(f, tri.placed, tri.links); assert.deepEqual(tdef.loadPass.sort(), ['rl', 'rr'], 'sperrene i fagverket er bjelker');
  const a = BP.runSim(tdef), b = BP.runSim(tdef); assert.equal(a.result, 'won'); assert.deepEqual(a, b, 'deterministisk'); assert.equal(a.breaks.length + a.linkBreaks.length, 0);
  assert.equal(CP.capacity({ site: f, placed: tri.placed, links: tri.links }).n, CP.capacity({ site: f, placed: tri.placed.map((p) => ({ ...p, role: 'gulv' })), links: tri.links }).n, 'samme bro bærer like mye uansett rolle');
  const sol = BW.buildSolids(f, BP.settledPlaced(tdef), { skip: R.classicSkip(tri.placed) }); assert.ok(sol.length >= 1 && sol.every((q) => q.id === `bygg_${f.id}_b`), 'i rommet er bare bunnplanken fast: sperrene kan ikke gås på eller gripes');
  assert.ok(BW.buildSolids(f, BP.settledPlaced(tdef)).some((q) => q.id === `bygg_${f.id}_rl`), 'uten rollene var sperren en trapp av små trinn');
  // referansebyggene og alle løsningene i Byggeskolen består fortsatt med rollene
  for (const q of lab) for (const so of q.lab.solutions) for (const ld of (q.loads?.length ? q.loads : [undefined])) { const r = BP.runSim(R.classicDef(q, so.placed, so.links), ld ? { load: ld } : {}); assert.equal(r.result, 'won', `${q.id} «${so.name}» ${ld || ''}: ${r.reason}`); }
  for (const name of ['bro', 'kjokkenbro', 'barnerom', 'kjokken', 'leke', 'stue', 'verksted', 'trapp', 'trapp2', 'vippe', 'vippe2', 'bad2']) for (const q of lvl(name).build.sites) { if (!q.ref?.placed?.length) continue; const r = BP.runSim(R.classicDef(q, q.ref.placed, q.ref.links || [])); assert.equal(r.result, 'won', `${name}/${q.id}: referansebygget består med rollene (${r.reason})`); }
  // av (⚙ → Admin): hele ordningen er av
  R.ROLEOPT.pass = false; assert.deepEqual(R.classicPass(wall), []); assert.equal(R.classicSkip(wall), null); assert.equal(R.classicDef(s, wall, links).loadPass, undefined); R.ROLEOPT.pass = true; assert.equal(G.GRIDOPT, R.ROLEOPT, 'samme bryter som R108');
}

// ---------- 4) varsler før prøven ----------
{
  const ground = [{ u0: -9.5, u1: -3.5 }, { u0: 3.5, u1: 9.5 }];
  assert.deepEqual(R.roleWarnings({ parts: 0, floorSpans: [], ground, from: -8, to: 8 }), { none: false, gaps: [] }, 'tomt bygg: ingen varsler');
  const none = R.roleWarnings({ parts: 2, floorSpans: [], ground, from: -8, to: 8 }); assert.equal(none.none, true, 'deler, men ingen gulv'); assert.equal(none.gaps.length, 1); assert.ok(Math.abs(none.gaps[0].len - 7) < 1e-9);
  const half = R.roleWarnings({ parts: 1, floorSpans: [{ u0: -4, u1: 0 }], ground, from: -8, to: 8 }); assert.equal(half.none, false); assert.deepEqual(half.gaps.map((g) => [g.u0, g.u1]), [[0, 3.5]], 'hullet etter gulvdelen markeres');
  assert.deepEqual(R.roleWarnings({ parts: 1, floorSpans: [{ u0: -4, u1: 4 }], ground, from: -8, to: 8 }).gaps, [], 'helt gulv: ingen hull');
  assert.deepEqual(R.roleWarnings({ parts: 2, floorSpans: [{ u0: -4, u1: -0.5 }, { u0: 1.5, u1: 4 }], ground, from: -8, to: 8 }).gaps, [], 'hull kortere enn hopplengden markeres ikke');
  assert.equal(R.floorGaps([{ u0: -4, u1: -0.5 }, { u0: 1.5, u1: 4 }], ground, -8, 8, 1).length, 1, 'hopplengden kan stilles');
  assert.equal(R.floorGaps([{ u0: 4, u1: -4 }], ground, 8, -8).length, 0, 'retning og rekkefølge spiller ingen rolle');
  R.ROLEOPT.pass = false; assert.deepEqual(R.roleWarnings({ parts: 2, floorSpans: [], ground, from: -8, to: 8 }), { none: false, gaps: [] }); R.ROLEOPT.pass = true;
  assert.ok(R.ROLE_GAP > 1 && R.ROLE_GAP < 4);
}

// ---------- 5) visning ----------
{
  assert.equal(V.darken('#ffffff', 0.5), '#808080'); assert.notEqual(V.darken('#c98a45'), '#c98a45'); assert.equal(V.darken('tull'), 'tull');
  const q = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 10 }, { x: 0, y: 10 }], n = V.narrowQuad(q, 0.5); assert.deepEqual(n.map((p) => p.y), [2.5, 2.5, 7.5, 7.5], 'smalere på tvers'); assert.deepEqual(n.map((p) => p.x), [0, 100, 100, 0], 'like lang');
  const e = V.topEdge(q); assert.equal(e.a.y + e.b.y, 0, 'oversiden er den lange kanten som ligger høyest på skjermen');
  const tall = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 100 }, { x: 0, y: 100 }]; assert.deepEqual(V.narrowQuad(tall, 0.5).map((p) => p.x), [2.5, 7.5, 7.5, 2.5]);
  const pl = V.roleDock({ W: 390, top: 150, bottom: 500 }); assert.equal(pl.left, (390 - V.ROLE_BTN_W) / 2, 'midtstilt i nye skjermer'); assert.equal(pl.top, 158, 'rett under hjelpelinja');
  const ld = V.roleDock({ W: 844, top: 60, bottom: 330, insetL: 120, insetR: 150 }); assert.ok(ld.left >= 128 && ld.left + V.ROLE_BTN_W <= 844 - 150 - 8, 'liggende: mellom skinnene');
  assert.equal(V.roleDock({ W: 390, top: 150, bottom: 500, center: false }).left, 8, 'gamle skjermer: til venstre'); assert.ok(V.roleDock({ W: 390, top: 480, bottom: 500 }).top + V.ROLE_BTN_H <= 500, 'aldri under det frie området');
  assert.ok(V.ROLE_BTN_H >= 44, 'stor nok for en finger'); assert.match(V.roleMarkup(), /data-a="role"/);
}

// ---------- 6) hekter ----------
{
  const idx = src('index.html'), main = src('main.js'), bld = src('build.js'), gv = src('grid_view.js'), i18n = src('i18n.js'), su = src('settings_util.js');
  assert.ok(/'build_roles'/.test(idx) && /'build_roles_view'/.test(idx), 'modulene står i files i index.html');
  assert.match(main, /fl\('buildgridpass', 'admin'/, 'samme admin-valg slår av hele ordningen'); assert.match(main, /rg\('buildrolegap', 'admin'/); assert.match(main, /buildRoles:/); assert.match(su, /Bygg \(roller\)/, 'rollefordelingen står i testrapporten');
  assert.match(bld, /role: \(\) => roleToggle\(\)/, 'knappen er koblet til'); assert.match(bld, /logEv\('bygg', `rolle \$\{s\.id\}/, 'rollebytte logges'); assert.match(bld, /prøv stoppet \$\{active\.id\}: ingen gulvdel/); assert.match(bld, /skip: pass\.length \? new Set\(pass\) : null/, 'bare gulv blir faste flater i rommet (begge byggere)');
  assert.match(bld, /createSim\(isGrid\(B\) \? gdef : cdef\(B\)/, 'klassisk PRØV bruker rollene'); assert.match(gv, /rodRoles\(B\(\)\)/, 'tegningen i rutenett følger rollen (broene og Byggeskolen deler koden)');
  assert.ok(!/lab\d|bygglab/.test(src('build_roles.js') + src('build_roles_view.js')), 'ingen egen kode for Byggeskolen');
  const { makeT } = await import('./i18n.js'); for (const l of ['nb', 'en']) { const { T } = makeT(() => l); for (const k of ['role.gulv', 'role.bjelke', 'role.tau', 'role.none', 'role.gap', 'role.gapHint', 'role.set.gulv', 'role.set.bjelke']) assert.ok(T(k) && T(k) !== k, `${l}: ${k}`); assert.ok(!/\b(tast|key|Enter|Space)\b/i.test(T('role.none') + T('role.gapHint')), 'tekstene nevner knapper, ikke taster'); }
  assert.match(i18n, /Du trenger noe å gå på\. Velg en del og trykk GULV\./);
  const { formatReport } = await import('./settings_util.js'); const base = { version: '9', level: 'Bad', when: 'x', device: 'd', screen: 's', touch: true, preset: 'p', clock: 1, points: 1, fps: 'f', pos: [0, 0, 0], state: 'ground', target: 't', stats: {}, changed: [], marks: [], events: [], camera: 'c' };
  assert.ok(formatReport({ ...base, buildRoles: 'lab4 (klassisk): gulv 1, bjelke 2, tau 0 (valgt selv: 0)' }).includes('Bygg (roller): lab4 (klassisk): gulv 1, bjelke 2'), 'rapporten viser rollene'); assert.ok(!formatReport(base).includes('Bygg (roller)'));
}
console.log('test_roles: ok');
