// R131: node test_grid3d_missions.mjs: 3D-laben, tre oppdrag (grid3d_missions.js): tårn (last på toppen), tripod (last i tau), bred bro i sidevind. Bot-bevis for hvert oppdrag:
// enkleste bygg feiler, en gyldig løsning består (stjerner, budsjett), deterministisk; rekkefølge og lås via grid_stage.js; tekster nb/en; tegning av last i verden; valg og lenke. Ekte følelse og FPS: testes på iPhone.
import { register } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const M = await import('./grid3d_missions.js'), K = await import('./grid3d_ctl.js'), L = await import('./grid3d_logic.js'), P = await import('./build_phys3.js'), GS = await import('./grid_stage.js'), W = await import('./grid3d_world.js'), S = await import('./grid3d_site.js'), { DICT_KEYS, makeT } = await import('./i18n.js');
const mk = (id) => K.createLab3d({ site: M.missionOf(id) });
const node = (c, x, y, z) => { const r = L.g3AddNode(c.B, { x, y, z }); assert.ok(r.ok, `knute ${x},${y},${z}: ${r.why}`); return r.node.id; };
const rod = (c, a, b, mat) => { const r = L.g3AddRod(c.B, a, b, mat); assert.ok(r.ok, `stav ${a}-${b} ${mat}: ${r.why}`); return r; };
const go = (c) => { const r = c.runAll(); assert.ok(r.ok, 'prøven starter'); return r.last; };
const legs = (c, top, ids, mat) => { for (const a of ids) rod(c, a, top, mat); };

// ---------- 1) data: fire oppdrag, rekkefølge, lovlige mål, tekster ----------
{
  assert.deepEqual(M.MISSIONS.map((m) => m.id), ['lab3d', 'tower3d', 'tripod3d', 'wind3d']); assert.equal(new Set(M.MISSIONS.map((m) => m.id)).size, 4);
  assert.deepEqual(GS.stagesOf(M.MISSIONS).map((m) => m.id), M.MISSIONS.map((m) => m.id), 'grid_stage.js ser alle fire som steder i rekkefølge');
  for (const m of M.MISSIONS) {
    const st = GS.stageOf(m); assert.ok(st && st.budget === m.budget, `${m.id}: oppdrag med budsjett`); assert.ok(Number.isFinite(m.budget) && m.stars.length === 2 && m.stars[0] < m.stars[1] && m.stars[1] <= m.budget, `${m.id}: stjerner innenfor budsjett`);
    if (M.hasGoal(m)) { const p = M.goalPoint(m); assert.ok(L.onLattice(m, p), `${m.id}: målpunktet ligger på rutenettet`); assert.ok(m.goal.m > 0); }
    for (const l of ['nb', 'en']) {
      assert.ok(DICT_KEYS[l].includes(m.name), `${l}: ${m.name}`);
      for (const k of Object.values(m.msgs || {})) assert.ok(DICT_KEYS[l].includes('lab3d.m.' + k), `${l}: lab3d.m.${k}`);
      for (const s of m.guide || []) assert.ok(DICT_KEYS[l].includes(s.t), `${l}: ${s.t}`);
    }
  }
  for (const k of ['lab3d.mis.of', 'lab3d.goal', 'lab3d.m.locked', 'lab3d.m.wonNext']) for (const l of ['nb', 'en']) assert.ok(DICT_KEYS[l].includes(k), `${l}: ${k}`);
  for (const l of ['nb', 'en']) { const T = makeT(() => l).T; for (const k of DICT_KEYS[l].filter((q) => /^lab3d\.(m\.(intro|fall|brk|nogoal|locked|wonNext)|g\.(tower|tripod|wind)|mis)/.test(q))) assert.ok(!/\b(tast|tastene|Space|Enter|WASD|klikk|key|keyboard)\b/i.test(T(k)), `${l} ${k}: nevner taster`); }
  assert.equal(M.mkey('lab3d'), 'tlm.lab3d', 'Broen beholder lagringsnøkkelen fra R130'); assert.equal(M.mkey('tower3d'), 'tlm.lab3d.tower3d');
  assert.equal(M.windOf(M.missionOf('wind3d'), 1), 2); assert.equal(M.windOf(M.missionOf('wind3d'), 1.5), 3); assert.equal(M.windOf(M.missionOf('tower3d'), 1), 0, 'bare vindoppdraget har vind'); assert.equal(M.windOf(null), 0);
  const idx = fs.readFileSync('index.html', 'utf8'); assert.ok(idx.includes("'grid3d_missions'"), 'modulen er i files i index.html');
}

// ---------- 2) Tårnet: en stav velter, tre i tripod bærer ----------
{
  const c = mk('tower3d'), a1 = 'a1'; assert.equal(c.start().why, 'empty', 'tomt bygg kan ikke prøves');
  { const c2 = mk('tower3d'); const n = node(c2, 4, 4, 2); rod(c2, 'a1', n, 'steel'); assert.equal(c2.start().why, 'nogoal', 'bygg uten knute i målet'); }
  { const c2 = mk('tower3d'), t = node(c2, 2, 8, 2); rod(c2, 'a1', t, 'steel'); const r = go(c2); assert.equal(r.passed, false); assert.equal(r.reason, 'fall', 'en stav alene velter'); void a1; }
  { const c2 = mk('tower3d'), t = node(c2, 2, 8, 2); legs(c2, t, ['a1', 'a2'], 'steel'); const r = go(c2); assert.equal(r.passed, false, 'to staver faller sidelengs'); }
  { const c2 = mk('tower3d'), t = node(c2, 2, 8, 2); legs(c2, t, ['a1', 'a2', 'a3'], 'wood'); const r = go(c2); assert.equal(r.passed, false); assert.ok(r.breaks > 0, 'lange tre-staver knekker under lasten'); }
  { const c2 = mk('tower3d'), t = node(c2, 2, 8, 2); legs(c2, t, ['a1', 'a2', 'a3', 'a4'], 'steel'); const r = go(c2); assert.equal(r.won, true); assert.equal(r.over, true, 'fire stålstaver holder, men er for dyrt'); assert.equal(r.passed, false); }
  { const c2 = mk('tower3d'), t = node(c2, 2, 8, 2); legs(c2, t, ['a1', 'a2', 'a3'], 'steel'); const r = go(c2); assert.equal(r.passed, true, 'tripod av stål består'); assert.equal(r.stars, 3); assert.equal(r.cost, 39);
    const again = (() => { const c3 = mk('tower3d'), t3 = node(c3, 2, 8, 2); legs(c3, t3, ['a1', 'a2', 'a3'], 'steel'); return go(c3); })(); assert.deepEqual(again, r, 'deterministisk'); }
  { const c2 = mk('tower3d'); assert.equal(c2.guideAuto('wood'), 3, 'SÅ SLIK bygger tripoden (stål på staven)'); assert.equal(c2.guideNext().done, true); assert.equal(go(c2).passed, true); }
  { const c2 = mk('tower3d'), f = c2.frame(390, 500); assert.ok(f.goal && f.goal.placed === false && f.mass && f.mass.up === true && f.mass.m === 120, 'målpunkt og last tegnes før noe er bygget'); node(c2, 2, 8, 2); assert.equal(c2.frame(390, 500).goal.placed, true); }
}

// ---------- 3) Tripoden: last i tau, to bein faller, tre står ----------
{
  { const c = mk('tripod3d'); assert.equal(c.frame(390, 500).mass.hang, true); }
  { const c = mk('tripod3d'), t = node(c, 2, 6, 2); rod(c, 'a1', t, 'steel'); assert.equal(go(c).reason, 'fall', 'ett bein velter'); }
  { const c = mk('tripod3d'), t = node(c, 2, 6, 2); legs(c, t, ['a1', 'a2'], 'steel'); const r = go(c); assert.equal(r.passed, false); assert.equal(r.reason, 'fall', 'to bein faller sidelengs'); }
  { const c = mk('tripod3d'), t = node(c, 2, 6, 2); legs(c, t, ['a1', 'a2', 'a3'], 'wood'); const r = go(c); assert.equal(r.passed, false); assert.ok(r.breaks > 0, 'tre klarer ikke lasten'); }
  { const c = mk('tripod3d'), t = node(c, 2, 6, 2); legs(c, t, ['a1', 'a2', 'a3'], 'steel'); const r = go(c); assert.equal(r.passed, true); assert.equal(r.stars, 3); assert.equal(r.cost, 30);
    const sim = c.sim; assert.ok(sim.ids.includes('load') && sim.rods.some((q) => q.id === 'hang' && q.rope), 'lasten er en egen knute i et tau'); assert.ok(L.cost3(c.B.rg) === 30, 'tauet koster ingenting'); }
  { const c = mk('tripod3d'); assert.equal(c.guideAuto('wood'), 3); assert.equal(go(c).passed, true); }
  { const c = mk('tripod3d'), t = node(c, 2, 6, 2); for (const a of ['a1', 'a2', 'a3']) rod(c, a, t, 'rope'); assert.equal(go(c).passed, false, 'tau bærer ikke trykk'); }
}

// ---------- 4) Bred bro i sidevind: tre alene ryker, stål i beina holder; uten vind holder tre ----------
{
  const site = M.missionOf('wind3d');
  const wood = () => { const c = mk('wind3d'); const n = c.guideAuto('wood'); assert.ok(n >= 15); return c; };
  { const c = wood(); // alt av tre (overstyr stål-trinnene ved å bygge selv)
    const c2 = mk('wind3d'); const ks = [2, 4, 6].map((x) => node(c2, x, -2, 2)), R = (a, b) => rod(c2, a, b, 'wood');
    for (const [a, b] of [[ks[0], 'd1'], [ks[1], 'd2'], [ks[2], 'd3'], [ks[0], 'a1'], [ks[0], 'a3'], [ks[2], 'a2'], [ks[2], 'a4'], [ks[0], ks[1]], [ks[1], ks[2]], [ks[0], 'd2'], [ks[1], 'd1'], [ks[1], 'd3'], [ks[2], 'd2'], [ks[1], 'a3'], ['d1', 'a3'], ['d3', 'a4'], ['d2', 'a4']]) R(a, b);
    const r = go(c2); assert.equal(r.passed, false, 'en bro av bare tre ryker i vinden'); assert.ok(r.breaks > 0 && r.reason === 'brudd');
    // samme bro uten vind: holder (det er vinden som er poenget)
    const noWind = K.createLab3d({ site: { ...site, wind: 0 } }); noWind.B.rg = JSON.parse(JSON.stringify(c2.B.rg)); const r0 = go(noWind); assert.equal(r0.passed, true, 'uten vind holder tre-broen');
    // samme bro med stål i beina: holder
    const c3 = mk('wind3d'); c3.B.rg = JSON.parse(JSON.stringify(c2.B.rg)); for (const q of c3.B.rg.rods) if (['r4', 'r6'].includes(q.id)) q.mat = 'steel'; const r3 = go(c3); assert.equal(r3.passed, true, 'stål i beina holder mot vinden'); assert.ok(r3.cost <= site.budget);
    void c;
  }
  { const c = mk('wind3d'); const ks = [2, 4, 6].map((x) => node(c, x, -2, 0)); const R = (a, b) => rod(c, a, b, 'steel'); for (const [a, b] of [[ks[0], 'a1'], [ks[2], 'a2'], [ks[0], ks[1]], [ks[1], ks[2]], [ks[0], 'd1'], [ks[1], 'd2'], [ks[2], 'd3'], [ks[1], 'd1'], [ks[1], 'd3']]) { const r = L.g3AddRod(c.B, a, b, 'steel'); void r; void R; } assert.equal(go(c).passed, false, 'en flat bro faller selv i stål'); }
  { const c = mk('wind3d'); assert.ok(c.guideAuto('wood') >= 15); assert.equal(c.guideNext().done, true); const r = go(c); assert.equal(r.passed, true, 'SÅ SLIK-broen (stål i beina) består'); assert.equal(r.stars, 3); assert.equal(r.cost, 44); }
  { const k2 = K.createLab3d({ site, getWind: () => 1.5 }); k2.guideAuto('wood'); const r = go(k2); assert.ok(r.won === false || r.passed === true, 'vindstyrken fra innstillingene brukes (kjører uten feil)'); }
}

// ---------- 5) rekkefølge og lås (grid_stage.js), lagring ----------
{
  const mem = {}, st = { get: (k, d) => (k in mem ? mem[k] : d), set: (k, v) => { mem[k] = v; } };
  const seq = M.MISSIONS, ps = () => M.passedIds(st, GS.passRead);
  assert.equal(GS.stageLocked(seq, ps(), 'lab3d', true), false, 'Broen er alltid åpen'); assert.equal(GS.stageLocked(seq, ps(), 'tower3d', true), true); assert.equal(GS.stageLocked(seq, ps(), 'wind3d', true), true);
  assert.equal(GS.stageLocked(seq, ps(), 'wind3d', false), false, 'lås av: alt åpent');
  assert.equal(GS.passRecord(st, M.MISSION_LEVEL, 'lab3d').first, true); assert.equal(GS.passRecord(st, M.MISSION_LEVEL, 'lab3d').first, false); assert.equal(GS.stageLocked(seq, ps(), 'tower3d', true), false); assert.equal(GS.stageLocked(seq, ps(), 'tripod3d', true), true);
  GS.passRecord(st, M.MISSION_LEVEL, 'tower3d'); assert.equal(GS.stageLocked(seq, ps(), 'tripod3d', true), false); assert.equal(GS.stageNext(seq, 'tower3d').id, 'tripod3d'); assert.equal(GS.stageNext(seq, 'wind3d'), null);
  const mem2 = { 'tlm.lab3d': { code: 'x', passed: true } }, st2 = { get: (k, d) => (k in mem2 ? mem2[k] : d), set: (k, v) => { mem2[k] = v; } };
  assert.equal(M.passedIds(st2, GS.passRead).has('lab3d'), true, 'Broen bestått i R130 teller'); assert.equal(GS.stageLocked(seq, M.passedIds(st2, GS.passRead), 'tower3d', true), false);
}

// ---------- 6) verden: lasten står ved knuten; tegnekall ----------
{
  const o = { x: 10, y: 3, z: 20 };
  { const c = mk('tower3d'); assert.deepEqual(W.massPlacements(c.B.rg, c.site, o), [], 'uten knute i målet ingen last'); const t = node(c, 2, 8, 2); legs(c, t, ['a1', 'a2', 'a3'], 'steel'); const q = W.massPlacements(c.B.rg, c.site, o); assert.equal(q.length, 1); assert.ok(Math.abs(q[0].x - 12) < 1e-9 && q[0].y > o.y + 8, 'klossen sitter over toppen'); }
  { const c = mk('tripod3d'); const t = node(c, 2, 6, 2); legs(c, t, ['a1', 'a2', 'a3'], 'steel'); const q = W.massPlacements(c.B.rg, c.site, o); assert.equal(q.length, 2); assert.ok(q[1].y < o.y + 6, 'lasten henger under toppen'); assert.ok(Math.abs(q[0].h - 2) < 1e-9, 'tauet er like langt som dråpen'); }
  { const c = K.createLab3d({ site: S.LAB3D }); assert.deepEqual(W.massPlacements(c.B.rg, c.site, o), [], 'Broen har ingen last i verden (uendret fra R130)'); }
  const s = W.worldOrigin({ x: 0, y: 0, z: 0 }, { x: 0, z: -1 }, S.WORLD3, M.missionOf('tower3d')); assert.ok(Number.isFinite(s.x) && Number.isFinite(s.z), 'worldOrigin med eget sted');
}

// ---------- 7) valg og hekter i main.js ----------
{
  const main = fs.readFileSync('main.js', 'utf8');
  assert.ok(/fl\('build3dlock', 'spill'/.test(main) && /rg\('build3dwind', 'admin'/.test(main), 'valg i SETTINGS (spill + admin)'); assert.ok(/sites: MISSIONS/.test(main) && /getLock: \(\) => build3dLock/.test(main) && /getWind: \(\) => build3dWind/.test(main));
  assert.ok(/get\('m'\)/.test(main) && /lab3dV\.open\(lab3dMis\)/.test(main), 'lenke ?lab3d=1&m=<oppdrag>'); assert.ok(fs.readFileSync('grid3d_view.js', 'utf8').includes("logEv('bygg3d', `oppdrag bestått"), 'bestått logges');
}
console.log('grid3d missions: ok');
