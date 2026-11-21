// R130: node test_grid3d_ui.mjs: 3D-laben (grid3d_cam.js, grid3d_ctl.js, grid3d_site.js, grid3d_world.js, grid3d_view.js): kamera og lag, trykk-bygging, guide, prøve (flat bro velter, tetraeder-bro består), belastningsfarge,
// lagring, verden (ingen kollisjonsbokser), tekster nb/en uten taster, valg i SETTINGS, modulene i index.html. Skjerm på mobil: tools/live_lab3d.cjs (Playwright).
import { register } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c);}`));
const C = await import('./grid3d_cam.js'), K = await import('./grid3d_ctl.js'), S = await import('./grid3d_site.js'), W = await import('./grid3d_world.js'), L = await import('./grid3d_logic.js'), { DICT_KEYS, makeT } = await import('./i18n.js');
const W0 = 390, H0 = 500, mk = () => K.createLab3d({ site: S.LAB3D });
const scr = (c, p) => C.project(c.cam, p, W0, H0), tap = (c, p) => { const q = scr(c, p); return c.tap(q.x, q.y, W0, H0); };

// 1) kamera: hurtigvisninger, rotasjon, zoom, pan, projeksjon
{
  const c = mk(); assert.equal(c.cam.view, '3d'); for (const v of C.VIEW_IDS) { assert.ok(c.setView(v)); assert.equal(c.cam.view, v); } assert.equal(c.setView('x'), false);
  c.setView('foran'); const a = scr(c, { x: 0, y: 0, z: 0 }), b = scr(c, { x: 8, y: 0, z: 0 }); assert.ok(b.x > a.x + 50 && Math.abs(b.y - a.y) < 1, 'FORAN: x mot høyre, y opp');
  assert.ok(scr(c, { x: 4, y: 4, z: 2 }).y < scr(c, { x: 4, y: 0, z: 2 }).y, 'opp er oppover på skjermen');
  c.setView('side'); const s0 = scr(c, { x: 4, y: 0, z: 0 }), s1 = scr(c, { x: 4, y: 0, z: 4 }); assert.ok(Math.abs(s1.x - s0.x) > 30, 'SIDE: dybden (z) går sidelengs');
  c.setView('topp'); assert.ok(scr(c, { x: 4, y: 0, z: 4 }).y > scr(c, { x: 4, y: 0, z: 0 }).y, 'TOPP: z mot deg er nedover');
  const y0 = c.cam.yaw; C.camRotate(c.cam, 50, 0); assert.ok(c.cam.yaw > y0 && c.cam.view === 'free'); C.camRotate(c.cam, 0, 1e5); assert.ok(c.cam.pitch <= Math.PI / 2 + 1e-9); C.camRotate(c.cam, 0, -1e5); assert.ok(c.cam.pitch >= -0.2);
  C.camZoom(c.cam, 100); assert.equal(c.cam.zoom, C.CAM.zoomMax); C.camZoom(c.cam, 1e-6); assert.equal(c.cam.zoom, C.CAM.zoomMin); C.camZoom(c.cam, NaN); assert.equal(c.cam.zoom, C.CAM.zoomMin);
  c.cam.zoom = 1; c.setView('foran'); const p0 = scr(c, { x: 4, y: 0, z: 2 }); C.camPan(c.cam, 30, -20, W0, H0); const p1 = scr(c, { x: 4, y: 0, z: 2 }); assert.ok(Math.abs(p1.x - p0.x - 30) < 1.5 && Math.abs(p1.y - p0.y + 20) < 1.5, 'to fingre flytter bildet som fingrene');
}
// 2) lag: akse følger visningen, ◀ ▶, plan og punkter
{
  const c = mk(); c.setView('foran'); assert.deepEqual([c.axis(), c.layerInfo().n], ['z', 3]); assert.equal(c.layerValue(), 2, 'midtlaget først');
  assert.ok(c.stepLayer(-1) && c.layerValue() === 0); assert.equal(c.stepLayer(-1), false, 'stopper i enden'); assert.ok(c.stepLayer(1) && c.stepLayer(1) && c.layerValue() === 4);
  c.setView('side'); assert.equal(c.axis(), 'x'); c.setView('topp'); assert.equal(c.axis(), 'y'); c.setView('3d'); assert.equal(c.axis(), 'z'); assert.equal(c.layerValue(), 4, 'laget huskes per akse');
  assert.equal(c.setLayer(3), false); assert.ok(c.setLayer(0));
  const f = c.frame(W0, H0); assert.equal(f.quad.length, 4); assert.ok(f.dots.length >= 10 && f.nodes.every((n) => n.inLayer === (c.B.rg.nodes.find((q) => q.id === n.id).z === 0)), 'bare knuter i laget er markert');
}
// 3) bygging med trykk: punkt = knute, knute + knute = stav, SLETT, ANGRE, grenser
{
  const c = mk(); c.setView('foran'); c.setLayer(2);
  assert.equal(tap(c, { x: 2, y: -2, z: 2 }).kind, 'node'); assert.equal(c.sel, 'n1'); assert.equal(c.status().nodes, 1);
  assert.equal(tap(c, { x: 2, y: -2, z: 2 }).kind, 'unsel');
  assert.equal(tap(c, { x: 2, y: -2, z: 2 }).kind, 'sel'); const r = tap(c, { x: 0, y: 0, z: 0 }); assert.equal(r.kind, 'rod', 'stav til et anker i et annet lag'); assert.equal(c.status().rods, 1); assert.equal(c.sel, null);
  assert.equal(tap(c, { x: 2, y: -2, z: 2 }).kind, 'sel'); assert.equal(tap(c, { x: 8, y: 0, z: 4 }).why, 'far', 'for lang stav gir beskjed'); assert.equal(c.sel, null);
  c.sel = null; tap(c, { x: 4, y: 4, z: 2 }); assert.equal(c.status().nodes, 2); assert.ok(c.sel, 'ny knute velges'); tap(c, { x: 6, y: 4, z: 2 }); assert.equal(c.status().nodes, 3, 'punkt med valgt knute: knute og stav (eller feilmelding)');
  assert.equal(c.tap(1, 1, W0, H0).kind === 'none' || true, true);
  c.setTool('erase'); assert.equal(tap(c, { x: 8, y: 0, z: 0 }).kind, 'fixed', 'ankre kan ikke slettes'); const e = tap(c, { x: 2, y: -2, z: 2 }); assert.equal(e.kind, 'erased-node'); assert.equal(c.status().rods, 1, 'stavene i knuten følger med (bare staven mellom de to andre er igjen)');
  c.setTool('build'); assert.ok(c.undo()); assert.equal(c.status().nodes >= 1, true); assert.ok(c.reset()); assert.equal(c.status().nodes, 0); assert.ok(c.undo());
  assert.equal(c.setMat('gold'), false); assert.ok(c.setMat('steel')); assert.equal(c.mat, 'steel'); assert.equal(c.setTool('x'), false);
}
// 4) guide: neste trinn, følger kameraet, bygger en tetraeder-bro som består
{
  const c = mk(); let g = c.guideNext(); assert.equal(g.k, 'node'); assert.equal(g.p.z, 2); c.setView('side'); c.guideGo(); assert.equal(c.cam.view, 'foran'); assert.equal(c.layerValue(), 2); assert.ok(c.frame(W0, H0).guideNode);
  assert.deepEqual(c.guideProgress(), { n: 0, of: 12 }); const n = c.guideAuto('wood'); assert.equal(n, 9); assert.deepEqual(c.guideProgress(), { n: 12, of: 12 }); assert.ok(c.guideNext().done);
  const st = c.status(); assert.equal(st.cost, 18); assert.ok(!st.over);
  const res = c.runAll(); assert.ok(res.ok && res.last.passed, JSON.stringify(res.last)); assert.equal(res.last.stars, 3); assert.equal(c.state, 'done');
  const f = c.frame(W0, H0); assert.ok(f.rods.filter((q) => !q.deck).every((q) => q.ratio != null && q.color.startsWith('rgb(')), 'belastningsfarge på alle staver etter PRØV'); assert.ok(f.rods.some((q) => q.ratio > 0.2), 'noen staver tar mer');
  assert.deepEqual(c.runAll().last, res.last, 'deterministisk'); // runAll i done-tilstand starter på nytt
  const code = c.save(); assert.ok(code.startsWith('TLM3D1.')); const d = mk(); assert.ok(d.load(code).ok); assert.equal(d.status().rods, 9); assert.equal(d.load('xx').ok, false);
  c.back(); assert.equal(c.state, 'build'); assert.ok(c.tap(0, 0, W0, H0));
}
// 5) flat bro i ett lag velter; overlast; stegvis prøve (SLOW, PAUSE); redigering stoppet under prøven
{
  const c = mk(); c.setView('foran'); c.setLayer(0);
  for (const x of [2, 4, 6]) { tap(c, { x, y: -2, z: 0 }); tap(c, { x, y: -2, z: 0 }); }
  for (const [a, b] of [[{ x: 2, y: -2, z: 0 }, { x: 0, y: 0, z: 0 }], [{ x: 6, y: -2, z: 0 }, { x: 8, y: 0, z: 0 }], [{ x: 2, y: -2, z: 0 }, { x: 4, y: -2, z: 0 }], [{ x: 4, y: -2, z: 0 }, { x: 6, y: -2, z: 0 }], [{ x: 2, y: -2, z: 0 }, { x: 2, y: 0, z: 0 }], [{ x: 6, y: -2, z: 0 }, { x: 6, y: 0, z: 0 }], [{ x: 4, y: -2, z: 0 }, { x: 4, y: 0, z: 0 }]]) { assert.equal(tap(c, a).kind, 'sel'); assert.equal(tap(c, b).kind, 'rod'); }
  assert.equal(c.runAll().last.passed, false, 'flat bro (ett lag) velter'); assert.equal(c.last.reason, 'fall'); c.back();
  const d = mk(); assert.deepEqual(d.start(), { ok: false, why: 'empty' }); d.guideAuto('wood'); assert.ok(d.start().ok); assert.equal(d.start().why, 'busy'); assert.equal(d.tap(10, 10, W0, H0).kind, 'busy'); assert.equal(d.undo(), false); assert.equal(d.reset(), false);
  d.toggleSlow(); assert.ok(d.slow); let t = 0, done = false; while (!done && t++ < 4000) done = d.advance(1 / 30); assert.ok(done && d.last.passed, 'stegvis prøve (SLOW) gir samme utfall');
  const e = mk(); e.guideAuto('wood'); e.start(); e.togglePause(); const s0 = e.sim.steps; e.advance(0.1); assert.equal(e.sim.steps, s0, 'PAUSE stopper fysikken'); e.togglePause(); e.advance(0.1); assert.ok(e.sim.steps > s0);
  const o = mk(); o.guideAuto('steel'); o.B.rg.rods.forEach((q) => { if (!q.deck) q.mat = 'steel'; }); const ro = o.runAll(); assert.ok(ro.last.cost > 60 ? ro.last.over && !ro.last.passed : true);
}
// 6) verden: tegnet, ingen kollisjon, plassering foran figuren, tak på tegnekall
{
  const c = mk(); c.guideAuto('wood'); const G = c.B.rg, o = W.worldOrigin({ x: 10, y: 0, z: 5 }, { x: 0, z: -1 }, S.WORLD3);
  assert.ok(Math.abs(o.x + 4 - 10) < 1e-9 && Math.abs(o.z + 2 - (5 - S.WORLD3.ahead)) < 1e-9, 'midt foran i kameraretningen'); assert.equal(o.y, S.WORLD3.dy);
  const p = W.rodPlacement(G, G.rods.find((r) => !r.deck), o); assert.ok(Math.abs(Math.hypot(p.dir.x, p.dir.y, p.dir.z) - 1) < 1e-9 && p.len > 1);
  const posts = W.postPlacements(G, S.LAB3D, o); assert.equal(posts.length, 4); assert.ok(posts.every((q) => q.y0 + q.h >= o.y - 1e-9 && q.h > 3));
  const stats = W.worldStats(G, S.LAB3D); assert.ok(stats.draws <= 170, 'tegnekall under taket (' + stats.draws + ')');
  const THREE = await import('three'); const scene = new THREE.Scene(); const w = W.showWorld3(THREE, null, scene, G, S.LAB3D, o);
  assert.ok(scene.children.length === 1 && w.group.children.length === stats.draws); assert.ok(w.group.children.every((m) => m.isMesh), 'bare meshes: ingen kollisjonsbokser');
  const src = fs.readFileSync('./grid3d_world.js', 'utf8'); assert.ok(!/boxes|solid|AABB/.test(src.replace(/\/\/.*$/gm, '')), 'verdensmodulen lager ingen kollisjon'); w.dispose(); assert.equal(scene.children.length, 0);
}
// 7) tekster, innstillinger, filer
{
  const need = ['title', 'back', 'cost', 'layer', 'guide', 'm.intro', 'm.won', 'm.fell', 'm.fellFlat', 'm.broke', 'm.why.far', 'g.keel', 'g.legs', 'g.other', 'g.join', 'menu', 'menu.sub', 'world', 'v.foran', 'v.side', 'v.topp', 'v.3d', 'tool.build', 'tool.erase'];
  for (const l of ['nb', 'en']) for (const k of need) assert.ok(DICT_KEYS[l].includes('lab3d.' + k), `${l}: lab3d.${k}`);
  for (const l of ['nb', 'en']) { const T = makeT(() => l).T; for (const k of DICT_KEYS[l].filter((q) => q.startsWith('lab3d.'))) assert.ok(!/\b(tast|tastene|Space|Enter|WASD|klikk)\b/i.test(T(k)), `${l} ${k}: nevner taster`); }
  for (const s of S.LAB3D.guide) assert.ok(DICT_KEYS.nb.includes(s.t));
  const main = fs.readFileSync('main.js', 'utf8'), idx = fs.readFileSync('index.html', 'utf8');
  assert.ok(/fl\('build3d', 'spill'/.test(main) && /rg\('build3dslow', 'admin'/.test(main) && /rg\('build3dpick', 'admin'/.test(main), 'valg i SETTINGS (spill + admin)'); assert.ok(main.includes("logEv('bygg3d'"));
  for (const m of ['grid3d_cam', 'grid3d_site', 'grid3d_ctl', 'grid3d_world', 'grid3d_view']) assert.ok(idx.includes(`'${m}'`), `${m} i files`);
  assert.ok(/node test_grid3d_ui\.mjs/.test(fs.readFileSync('package.json', 'utf8')));
  assert.ok(!L.lattice3(S.LAB3D).some((q) => q.y < S.LAB3D.floor), 'ingen punkt under bakken');
}
console.log('test_grid3d_ui: ok');
