// R49b: live-vekt i verdenen. Ren logikk (build_live_logic.js) og at «av» ikke endrer noe (hekter i build.js og main.js).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { antStanding, antLoadOf, maxLoad, ANT_LOAD, ANT_MAX, deflection, breaks, liveLoad, liveLimit, approach, liveState, liveStep, supportOf, topAt, DEFL_MAX, FIG_LOAD, stiffOf } from './build_live_logic.js';
import { buildSolids } from './build_world.js';
const plank = { id: 'p1', type: 'plank_l', u: 0, v: 1, rot: 0 }, tilt = { id: 'p2', type: 'plank_l', u: 10, v: 1, rot: 0.3 }, blk = { id: 'b', type: 'block', u: 0, v: 3.0, rot: 0 };
// null last gir null nedbøyning
assert.equal(deflection(0, 5, plank), 0); assert.equal(deflection(-1, 5, plank), 0); assert.equal(deflection(1, 0, plank), 0);
// monoton, begrenset og jevn
let prev = 0; for (let i = 1; i <= 40; i++) { const d = deflection(i / 10, 4, plank); assert.ok(d >= prev - 1e-12, 'monoton'); assert.ok(d <= DEFL_MAX + 1e-9); assert.ok(d - prev < 0.08, 'jevn'); prev = d; }
assert.ok(deflection(100, 4, plank) <= DEFL_MAX + 1e-9); assert.ok(deflection(4, 4, plank) > 0.2);
// lengre del bøyer mer enn kort
assert.ok(deflection(2, 4, plank) > deflection(2, 4, { type: 'block' }));
// grense
assert.ok(!breaks(0, 3)); assert.ok(!breaks(3, 3)); assert.ok(breaks(3.01, 3)); assert.ok(!breaks(5, 0));
assert.equal(liveLimit({ n: 0 }), 1, 'minst én figur'); assert.equal(liveLimit({ n: 6 }), 6); assert.equal(liveLimit({ n: 6 }, 0.5), 3); assert.equal(liveLimit(null), 1); assert.equal(stiffOf('x'), 1); assert.equal(stiffOf(99), 3);
// last per del
const placed = [plank, tilt];
assert.equal(topAt(plank, 0), 1.25); assert.equal(topAt(plank, 50), null);
assert.equal(supportOf(placed, 0, 1.25), 'p1'); assert.equal(supportOf(placed, 0, 5), null, 'luft');
assert.equal(liveLoad(placed, [{ u: 0, v: 1.25 }]).get('p1'), FIG_LOAD);
assert.equal(liveLoad(placed, [{ u: 0, v: 1.25 }, { u: 1, v: 1.25, load: 1 }]).get('p1'), 2);
assert.equal(liveLoad(placed, [{ part: 'p2', u: 0, v: 9 }]).get('p2'), 1, 'oppgitt del brukes');
assert.equal(liveLoad(placed, []).size, 0); assert.equal(liveLoad(placed, [{ u: 0, v: 40 }]).size, 0);
// glatt tilnærming
assert.equal(approach(0, 1, 0.1, 1), 0.1); assert.equal(approach(0.95, 1, 0.1, 1), 1); assert.equal(approach(1, 0, 0.1, 1), 0.9); assert.equal(approach(0.4, 0, -1), 0.4);
// steg: bøyer, kommer tilbake, brister
{
  const st = liveState(); let r;
  for (let i = 0; i < 100; i++) r = liveStep(st, placed, [{ part: 'p1', u: 0, v: 1.25 }], 3, 0.05);
  assert.ok(r.maxDefl > 0.1 && st.broken.size === 0, 'bøyer uten å briste');
  for (let i = 0; i < 100; i++) r = liveStep(st, placed, [], 3, 0.05);
  assert.ok((st.defl.get('p1') || 0) === 0, 'tilbake når lasten er borte');
  r = liveStep(st, placed, [{ part: 'p1', u: 0, v: 1.25, load: 4 }], 3, 0.05);
  assert.deepEqual(r.broke, ['p1']); assert.ok(st.broken.has('p1'));
  r = liveStep(st, placed, [{ part: 'p1', u: 0, v: 1.25, load: 4 }], 3, 0.05); assert.deepEqual(r.broke, [], 'brister bare én gang');
  // deterministisk
  const a = liveState(), b = liveState(); for (let i = 0; i < 30; i++) { liveStep(a, placed, [{ part: 'p2', u: 10, v: 2 }], 2, 0.03); liveStep(b, placed, [{ part: 'p2', u: 10, v: 2 }], 2, 0.03); }
  assert.deepEqual([...a.defl], [...b.defl]);
}
// «av» gir uendret resultat: byggets bokser lages av build_world.js, som ikke er rørt og ikke kjenner live-vekt
const site = { id: 's', x: 0, y: 0, z: 0, w: 20, h: 10 };
assert.ok(buildSolids(site, placed).every((b) => !('live' in b)));
const bsrc = fs.readFileSync('build.js', 'utf8'), msrc = fs.readFileSync('main.js', 'utf8');
assert.match(bsrc, /const on = !!getLive\(\) && !!playing/, 'live-løkka kjører bare når valget er på');
assert.match(bsrc, /getLive = \(\) => false/, 'standard i build.js er av');
assert.match(msrc, /tlm\.buildlive', false/, 'standard i main.js er av');
assert.match(msrc, /buildlivestiff', 'admin'/, 'stivhet er admin');
assert.match(fs.readFileSync('index.html', 'utf8'), /'build_live_logic'/, 'modulen ligger i files');
// R49c: maur som last
{
  const sol = [{ part: 'p1', min: [0, 0, -1], max: [10, 1.25, 1] }, { part: 'p2', min: [20, 0, -1], max: [30, 1.25, 1] }];
  const ant = (x, y = 1.25, o = {}) => ({ x, y, z: 0, alive: true, type: 'ant', ...o });
  assert.deepEqual(antStanding([], sol), [], 'ingen maur gir ingen last'); assert.deepEqual(antStanding(null, sol), []); assert.deepEqual(antStanding([ant(5)], []), []);
  assert.equal(antStanding([ant(5)], sol)[0].part, 'p1'); assert.equal(antStanding([ant(5)], sol)[0].load, ANT_LOAD);
  assert.equal(antStanding([ant(15)], sol).length, 0, 'ved siden av'); assert.equal(antStanding([ant(5, 3)], sol).length, 0, 'høyt over'); assert.equal(antStanding([ant(5, 0)], sol).length, 0, 'under toppen');
  assert.equal(antStanding([ant(5, 1.25 + 0.3)], sol).length, 1, 'bøyd ned: mauras flate ligger over toppen');
  assert.equal(antStanding([ant(5, 1.25, { alive: false }), ant(5, 1.25, { squash: 1 }), ant(5, 1.25, { type: 'wasp' }), ant(5, 1.25, { type: 'spider' })], sol).length, 0, 'døde og flyvende teller ikke');
  assert.equal(antStanding([ant(5, 1.25, { type: 'carrier' })], sol).length, 1);
  const many = Array.from({ length: 100 }, (_, i) => ant(1 + (i % 8))); assert.equal(antStanding(many, sol).length, ANT_MAX, 'tak på antall');
  assert.equal(antLoadOf('x'), ANT_LOAD); assert.equal(antLoadOf(9), 1); assert.equal(antLoadOf(0.0001), 0.02);
  // flere maur gir mer last, og mer nedbøyning, og brudd til slutt
  const load = (n) => maxLoad(liveLoad(placed, [{ part: 'p1', u: 0, v: 1.25 }, ...antStanding(Array.from({ length: n }, () => ant(5)), sol).map((a) => ({ part: 'p1', u: 0, v: 0, load: a.load }))]));
  assert.ok(load(0) === FIG_LOAD && load(3) > load(1) && load(1) > load(0), 'mer last med flere maur');
  assert.ok(deflection(load(4), 3, plank) > deflection(load(0), 3, plank), 'mer nedbøyning med maur');
  const st = liveState(); let r; const stand = (n) => [{ part: 'p1', u: 0, v: 1.25 }, ...Array.from({ length: n }, () => ({ part: 'p1', u: 0, v: 0, load: ANT_LOAD }))];
  for (let i = 0; i < 80; i++) r = liveStep(st, placed, stand(0), 3, 0.05); const d0 = st.defl.get('p1');
  for (let i = 0; i < 80; i++) r = liveStep(st, placed, stand(8), 3, 0.05); assert.ok(st.defl.get('p1') > d0 && !st.broken.size, 'maur bøyer mer');
  r = liveStep(st, placed, stand(14), 3, 0.05); assert.deepEqual(r.broke, ['p1'], 'mange maur og figuren brister');
  // uten maur identisk med R49b-oppførselen (samme tall som uten maur-løftet)
  const a = liveState(), b = liveState(); for (let i = 0; i < 40; i++) { liveStep(a, placed, stand(0), 3, 0.05); liveStep(b, placed, [{ part: 'p1', u: 0, v: 1.25 }, ...antStanding([], sol)], 3, 0.05); } assert.deepEqual([...a.defl], [...b.defl]);
}
const bsrc2 = fs.readFileSync('build.js', 'utf8'), msrc2 = fs.readFileSync('main.js', 'utf8');
assert.match(bsrc2, /antsOn = !!antCfg\?\.on/, 'maur-løkka krever valget'); assert.match(bsrc2, /getLiveAnts = \(\) => \(\{ on: false/, 'standard i build.js er av');
assert.match(msrc2, /tlm\.buildliveants', false/, 'standard i main.js er av'); assert.match(msrc2, /buildliveantload', 'admin'/, 'vekt per maur er admin');
console.log('test_build_live: ok');
