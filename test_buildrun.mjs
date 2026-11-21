// node test_buildrun.mjs: R112, all prøvetilstand i byggeren nullstilles samlet (build_runstate.js), spøkelset tegnes bare under en ny prøve,
// de tegnede delene i verdenen z-fighter ikke mot sokkelen (build_world.js), ett trykk = én rotasjon, og build.js bruker resetRunState på alle veier.
// Ekte berøring og bilder (iPhone 14): node tools/live_runstate.cjs <utmappe> (Playwright).
import fs from 'node:fs';
import assert from 'node:assert/strict';
const R = await import('./build_runstate.js'), W = await import('./build_world.js'), L = await import('./build_logic.js');

// ---------- blankRun / dirtyKeys ----------
const b = R.blankRun();
assert.deepEqual(R.dirtyKeys(b), [], 'blankRun er ren');
for (const k of ['sim', 'simAcc', 'simMarks', 'simDone', 'simBreaks', 'simWhy', 'simHelp', 'confetti', 'breakAt', 'loadMore', 'winSolved', 'winOver', 'replaying', 'recorder', 'ghostRec', 'gPeaks', 'gSum', 'gSpeed']) assert.ok(R.RUN_KEYS.includes(k), `RUN_KEYS har ${k}`);
assert.notEqual(R.blankRun().simMarks, R.blankRun().simMarks, 'hver blankRun gir nye lister');
const dirty = { ...R.blankRun(), simMarks: [{ u: 1, v: 1 }], simDone: true, ghostRec: { frames: [] }, simWhy: { key: 'x' }, replaying: true, gSpeed: 'slow', confetti: [1], recorder: {}, gSum: {}, winSolved: true };
assert.deepEqual(R.dirtyKeys(dirty).sort(), ['confetti', 'ghostRec', 'gSpeed', 'gSum', 'recorder', 'replaying', 'simDone', 'simMarks', 'simWhy', 'winSolved'].sort());
// «henger igjen» = urent uten at en prøve kjører
assert.deepEqual(R.staleKeys({ ...dirty, sim: { t: 1 } }), [], 'under en prøve er tilstanden ikke «hengende»');
assert.ok(R.staleKeys(dirty).includes('ghostRec'), 'spøkelse uten prøve henger');
assert.deepEqual(R.staleKeys(R.blankRun()), []);

// ---------- spøkelset ----------
const g0 = { ghostRec: { frames: [] }, replaying: false, simDone: false, sim: {}, on: true };
assert.equal(R.ghostVisible(g0), true, 'ny prøve kjører, valget på');
assert.equal(R.ghostVisible({ ...g0, simDone: true }), false, 'aldri etter at prøven er ferdig (Rune: spøkelse etter «Ikke bestått»)');
assert.equal(R.ghostVisible({ ...g0, replaying: true }), false, 'ikke i replay');
assert.equal(R.ghostVisible({ ...g0, on: false }), false, 'valget av');
assert.equal(R.ghostVisible({ ...g0, sim: null }), false, 'ingen prøve');
assert.equal(R.ghostVisible({ ...g0, ghostRec: null }), false, 'ingen opptak');

// ---------- halvt utfadede elementer ----------
assert.deepEqual(R.fadedLeft([{ k: 'a', opacity: 1, display: 'block' }, { k: 'b', opacity: 0.5, display: 'block' }, { k: 'c', opacity: 0.5, display: 'none' }, { k: 'd', opacity: 0, display: 'block' }, { k: 'e', opacity: 0.4, visibility: 'hidden' }]), ['b']);

// ---------- de tegnede delene i verdenen ----------
const site = { id: 's', x: 0, y: 0, z: 0 };
assert.ok(W.worldMeshDepth(site) < W.siteDepth(site) && W.siteDepth(site) - W.worldMeshDepth(site) >= 0.02, 'tegnet dybde ligger minst 2 cm innenfor sokkelen');
assert.ok(W.worldMeshDepth({ ...site, d: 6 }) < 6);
for (const t of ['plank_s', 'plank_l', 'plank_t', 'block']) { const p = L.partType(t); assert.equal(W.thinDims([p.w, p.h, W.worldMeshDepth(site)]), false, `${t}: ingen hårfin dimensjon`); }
{ const f = W.fulcrum({ ...site, drop: 0 }, { id: 'p', u: 0, v: 3 }); assert.ok(f && !W.thinDims([f.max[0] - f.min[0], f.max[1] - f.min[1], W.worldMeshDepth(site)]), 'støtta er ikke hårfin'); }
// kollisjonsflatene er uendret (fysikken bruker full dybde)
for (const x of W.buildSolids(site, [{ id: 'a', type: 'plank_l', u: 0, v: 3, rot: 0.3 }])) assert.ok(Math.abs((x.max[2] - x.min[2]) - W.siteDepth(site)) < 1e-9);

// ---------- ett trykk = én rotasjon (15 grader) ----------
{ const B = L.createBuild({ id: 's', w: 20, h: 12 }, { a: 'plank_l' }, ['a']); L.place(B, 'a', 0, 5, 0);
  const r0 = B.placed[0].rot; assert.ok(L.rotate(B, 'a', L.ROT_STEP)); assert.ok(Math.abs(B.placed[0].rot - r0 - Math.PI / 12) < 1e-9, '15 grader per rotate');
  assert.ok(Math.abs(L.ROT_STEP - Math.PI / 12) < 1e-12); }

// ---------- kilden: alle veier bruker resetRunState ----------
const src = fs.readFileSync(new URL('./build.js', import.meta.url), 'utf8');
for (const how of ['inn', 'ut', 'ny prøve', 'replay', 'referansebygg', 'start på nytt', 'sted', 'nullstill']) assert.ok(src.includes(`'${how}'`) && /resetRunState\(|stopSim\(/.test(src), `vei: ${how}`);
assert.ok(/resetRunState\('inn'\)/.test(src) && /resetRunState\('ut'\)/.test(src) && /resetRunState\('ny prøve'\)/.test(src) && /resetRunState\('replay'\)/.test(src) && /resetRunState\('referansebygg'\)/.test(src) && /resetRunState\('start på nytt'\)/.test(src));
assert.ok(/stopSim\('sted'\)/.test(src) && /stopSim\('nullstill'\)/.test(src), 'sted og nullstill rydder også uten kjørende prøve');
assert.equal((src.match(/ghostRec = /g) || []).length, 2, 'ghostRec settes bare i resetRunState (via blankRun) og ved ny prøve');
assert.ok(/ghostVisible\(\{ ghostRec, replaying, simDone, sim, on: getGhost\(\) \}\)/.test(src), 'spøkelset tegnes via ghostVisible');
assert.ok(/if \(sim\.state\.state === 'won'\) toast\(simText\(\)\)/.test(src), 'toast bare ved bestått; ved tap står teksten bare i hintet (ikke dobbelt)');
const idx = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8'); assert.ok(idx.includes("'build_runstate'"), 'build_runstate i files');
console.log('buildrun: ok');
