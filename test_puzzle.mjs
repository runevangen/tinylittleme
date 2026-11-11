// node test_puzzle.mjs: logikk for nøkkel og lås (R7), og at gåtene i nivå 3 og 6 er riktig bygd (nøkkel og plate på samme flate, bro fri for ting, ruta uendret).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PUZ, initPuzzles, stepPuzzles, resetPuzzles, restorePuzzles, puzzleOpenIds, puzzleTarget, carryingKeyNear, keyOnPlate, bridgeBox, bridgeFarEnd } from './puzzle.js';
import { initBodies } from './physics.js';

const mkLevel = () => ({
  boxes: [{ id: 'flate', type: 'wood', min: [0, 0, 0], max: [20, 10, 10] }],
  movables: [{ id: 'nokkel', kind: 'key', min: [15, 10, 4], max: [17.8, 10.7, 5.2], weight: 'light' }],
  puzzles: [{ id: 'bro', key: 'nokkel', plate: { x: 4, y: 10, z: 5, r: 2, on: 'flate', x0: 0, x1: 20, z0: 0, z1: 10 }, bridge: { min: [-6, 9, 1], max: [0, 9.6, 9], axis: 'x', anchor: 'max' } }],
});
const put = (b, x, z) => { const dx = x - (b.min[0] + b.max[0]) / 2, dz = z - (b.min[2] + b.max[2]) / 2; b.min[0] += dx; b.max[0] += dx; b.min[2] += dz; b.max[2] += dz; };

// --- logikk ---
{
  const L = mkLevel(); initBodies(L); initPuzzles(L);
  const key = L.bodies[0], n0 = L.boxes.length;
  assert.deepEqual(stepPuzzles(L, 0.1), [], 'nøkkelen ligger langt unna');
  assert.equal(L.boxes.length, n0, 'broen finnes ikke før gåten er løst');
  // veiledning: på flata peker pila på nøkkelen, med nøkkelen i hånda på platen
  const me = { x: 10, y: 10, z: 5, carry: null };
  assert.equal(puzzleTarget(L, me).key, 'key');
  assert.equal(puzzleTarget(L, { ...me, y: 0 }), null, 'ikke på flata: ingen gåteveiledning');
  assert.equal(puzzleTarget(L, { ...me, carry: { id: 'annet' } }), null);
  me.carry = key; key.carried = true;
  const t = puzzleTarget(L, me); assert.deepEqual([t.key, t.x, t.z], ['plate', 4, 5]);
  assert.equal(carryingKeyNear(L, { ...me, x: 6 }) !== null, true); assert.equal(carryingKeyNear(L, { ...me, x: 18 }), null);
  assert.deepEqual(stepPuzzles(L, 0.1), [], 'båret nøkkel åpner ikke');
  key.carried = false; me.carry = null;
  put(key, 4.5, 5);
  assert.ok(keyOnPlate(key, L.puzzleList[0].plate));
  assert.deepEqual(stepPuzzles(L, 0.1, false), [], 'ikke aktiv (pause/mål)');
  let ev = stepPuzzles(L, 0.1); assert.deepEqual(ev.map((e) => e.type), ['placed', 'open']);
  assert.equal(L.boxes.length, n0 + 1, 'broen er lagt til');
  const br = L.puzzleList[0].box; assert.ok(br.max[0] - br.min[0] < 6 && br.max[0] === 0, 'broen vokser ut fra festet (anchor max)');
  let done = false; for (let i = 0; i < 100 && !done; i++) done = stepPuzzles(L, 0.05).some((e) => e.type === 'done');
  assert.ok(done); assert.deepEqual([br.min[0], br.max[0]], [-6, 0], 'ferdig bro');
  assert.equal(puzzleTarget(L, { x: 10, y: 10, z: 5, carry: null }), null, 'ingen veiledning etter at gåten er løst');
  assert.deepEqual(puzzleOpenIds(L), ['bro']);
  put(key, 15, 5); assert.deepEqual(stepPuzzles(L, 0.1), [], 'broen står åpen selv om nøkkelen tas bort');
  resetPuzzles(L); assert.equal(L.boxes.length, n0); assert.deepEqual(puzzleOpenIds(L), []);
  restorePuzzles(L, ['bro', 'finnesikke']); assert.deepEqual(puzzleOpenIds(L), ['bro']); assert.equal(L.boxes.length, n0 + 1); assert.deepEqual([L.puzzleList[0].box.min[0], L.puzzleList[0].box.max[0]], [-6, 0]);
  restorePuzzles(L, undefined); assert.equal(L.boxes.length, n0);
  assert.deepEqual(stepPuzzles({}, 1), [], 'brett uten gåter');
  const z = bridgeBox({ bridge: { min: [0, 0, 0], max: [4, 1, 10], axis: 'z', anchor: 'min' } }, 1); assert.deepEqual([z.min[2], z.max[2]], [0, 10]);
  assert.ok(PUZ.dur > 0);
}

// --- brettene: nivå 3 og 6 har en gåte som er bygd riktig ---
{
  for (const lv of ['kjokken', 'kjokken2']) {
    const L = JSON.parse(fs.readFileSync(`levels/${lv}.level.json`, 'utf8')); initBodies(L); initPuzzles(L);
    assert.equal(L.puzzleList.length, 1, `${lv}: én gåte`);
    const p = L.puzzleList[0], key = L.bodies.find((b) => b.id === p.key), flat = L.boxes.find((b) => b.id === p.plate.on);
    assert.ok(key && key.weight === 'light', `${lv}: nøkkelen er en lett, løs ting`);
    assert.ok(Math.max(...key.max.map((v, i) => v - key.min[i])) <= 3.4, `${lv}: nøkkelen kan bæres`);
    // nøkkel og plate ligger på samme flate, innenfor den, og ikke oppå hverandre
    for (const [what, x, z] of [['nøkkel', (key.min[0] + key.max[0]) / 2, (key.min[2] + key.max[2]) / 2], ['plate', p.plate.x, p.plate.z]]) {
      assert.ok(x > flat.min[0] + 1 && x < flat.max[0] - 1 && z > flat.min[2] + 1 && z < flat.max[2] - 1, `${lv}: ${what} ligger på flata ${flat.id}`);
    }
    assert.ok(Math.abs(key.min[1] - flat.max[1]) < 0.01 && Math.abs(p.plate.y - flat.max[1]) < 0.01, `${lv}: høyde stemmer med flata`);
    assert.ok(!keyOnPlate(key, p.plate), `${lv}: nøkkelen starter ikke på platen`);
    assert.ok(Math.hypot((key.min[0] + key.max[0]) / 2 - p.plate.x, (key.min[2] + key.max[2]) / 2 - p.plate.z) > 4, `${lv}: nøkkelen må bæres et stykke`);
    for (const c of L.collectibles || []) assert.ok(Math.hypot(c.x - p.plate.x, c.z - p.plate.z) > p.plate.r + 1 || Math.abs(c.y - p.plate.y) > 3, `${lv}: smule oppå platen`);
    // broen (ferdig) kolliderer ikke med fast innredning, og endene tar fatt i flater (festet i flata, motsatt ende innenfor 1 enhet av en annen flate)
    const full = { min: p.bridge.min, max: p.bridge.max }, ov = (a, b) => a.min[0] < b.max[0] - 0.01 && a.max[0] > b.min[0] + 0.01 && a.min[1] < b.max[1] - 0.01 && a.max[1] > b.min[1] + 0.01 && a.min[2] < b.max[2] - 0.01 && a.max[2] > b.min[2] + 0.01;
    for (const b of L.boxes) if (b.type !== 'floor') assert.ok(!ov(full, b), `${lv}: broen går inn i ${b.id}`);
    const ax = p.bridge.axis === 'z' ? 2 : 0, free = p.bridge.anchor === 'max' ? p.bridge.min[ax] : p.bridge.max[ax];
    const touch = L.boxes.find((b) => b.type !== 'floor' && b.type !== 'wall' && b.max[1] >= full.min[1] - 3 && b.max[1] <= full.max[1] + 3 && Math.abs((p.bridge.anchor === 'max' ? b.max[ax] : b.min[ax]) - free) < 1.3 && b.min[2 - ax] < full.max[2 - ax] && b.max[2 - ax] > full.min[2 - ax]);
    assert.ok(touch, `${lv}: broen når ikke over til en flate`);
    const fe = bridgeFarEnd(p), ax2 = p.bridge.axis === 'z' ? 2 : 0; assert.ok(Math.abs([fe.x, fe.y, fe.z][ax2] - free) < 0.01, `${lv}: pila peker på broens frie ende`);
    // bare valgfri snarvei: ruta nevner ikke broen
    assert.ok(!(L.route || []).some((w) => w.id === `${p.id}_bro`), `${lv}: ruta skal ikke bruke broen`);
  }
}
console.log('gåte-tester grønne');
