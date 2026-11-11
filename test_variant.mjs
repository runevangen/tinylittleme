// node test_variant.mjs: nivå 4–6 som egne rom (variant.js): stemninger, vann, lys, og at dataene i brettene stemmer
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MOODS, moodParams, blendMood, waterLevel, waterPhase, isWading, lightLevel, lightsPhase, moodAt, checkVariant, WATER } from './variant.js';
import { gradeTint } from './grade.js';

// stemninger: natt er mørkere enn kveld, og bare natt/mørkt bruker hjelmlykt
assert.ok(MOODS.night.sunMul < MOODS.evening.sunMul && MOODS.night.hemiMul < MOODS.evening.hemiMul);
assert.equal(MOODS.night.lamp, 1); assert.equal(MOODS.evening.lamp, 0); assert.equal(moodParams('finnesikke').lamp, 0);
const half = blendMood('dark', 'dusk', 0.5); assert.ok(half.sunMul > MOODS.dark.sunMul && half.sunMul < MOODS.dusk.sunMul && half.lamp === 0.5);
assert.equal(blendMood('dark', 'dusk', 1).bg, MOODS.dusk.bg); assert.equal(blendMood('dark', 'dusk', 0).bg, MOODS.dark.bg);
// vann: tørt først, stiger til maks, holder, synker; periodisk
const wc = { max: 2.6 };
assert.equal(waterLevel(0, wc), 0); assert.equal(waterLevel(WATER.dry + WATER.rise + 1, wc), 2.6);
const T = WATER.dry + WATER.rise + WATER.hold + WATER.drain;
assert.ok(Math.abs(waterLevel(5, wc) - waterLevel(5 + T, wc)) < 1e-9, 'periodisk');
let prev = -1; for (let t = WATER.dry; t <= WATER.dry + WATER.rise; t += 0.5) { const l = waterLevel(t, wc); assert.ok(l >= prev - 1e-9, 'stiger jevnt'); prev = l; }
assert.equal(waterPhase(1, wc), 'tørr'); assert.equal(waterPhase(WATER.dry + 1, wc), 'stiger'); assert.equal(waterPhase(WATER.dry + WATER.rise + 1, wc), 'full'); assert.equal(waterPhase(T - 1, wc), 'synker');
// vading: bare når føttene er under flata; ikke i tørt rom
assert.ok(isWading(0, 0, 2.6) && !isWading(3, 0, 2.6) && !isWading(0, 0, 0) && !isWading(2.6, 0, 2.6));
// lys: på, blinker, av, blinker, på
const lc = { on: 15, off: 8, blink: 1 };
assert.equal(lightLevel(1, lc), 1); assert.equal(lightLevel(18, lc), 0); assert.equal(lightLevel(21.9, lc), 0); assert.equal(lightLevel(1 + 23, lc), 1);
assert.ok([14.1, 14.4, 14.6].some((t) => lightLevel(t, lc) < 1), 'blinker før det slukkes');
assert.equal(lightsPhase(1, lc), 'lys'); assert.equal(lightsPhase(17, lc), 'mørkt');
// stemning akkurat nå: av = vanlig dag; lysvri blander mot mørkt
assert.equal(moodAt({ mood: 'night', twist: { type: 'train' } }, 0, { moods: false }).w, 0);
assert.equal(moodAt({ mood: 'dusk', twist: { type: 'lights', on: 15, off: 8, blink: 1 } }, 18).lamp, 1);
assert.equal(moodAt({ mood: 'dusk', twist: { type: 'lights', on: 15, off: 8, blink: 1 } }, 18, { twists: false }).lamp, 0);
// brettene: hver variant har egen stemning og vri, ulike fra hverandre og fra grunnrommene
const seen = new Set();
for (const id of ['bad2', 'barnerom2', 'kjokken2']) {
  const L = JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8')), S = JSON.parse(fs.readFileSync(`scenes/${id}.scene.json`, 'utf8'));
  assert.deepEqual(checkVariant(L.variant), [], `${id}: variant`);
  assert.ok(L.variant.props.length >= 2, `${id}: har rekvisitter`);
  assert.ok(gradeTint(id, 'wall:tile') || gradeTint(id, 'wall:plaster'), `${id}: egen palett`);
  assert.ok(!seen.has(L.variant.mood) && !seen.has(L.variant.twist.type), `${id}: stemning og vri skal være ulike`); seen.add(L.variant.mood); seen.add(L.variant.twist.type);
  if (L.variant.twist.type === 'water') assert.ok(Math.abs(L.variant.twist.max * 5 - S.variant.twist.max) < 0.1, 'vannhøyde i enheter');
  if (L.variant.twist.type === 'train') assert.ok(L.ants.some((a) => a.id === L.variant.twist.ant && a.skin === 'train'), 'toget finnes som maur med skin');
  for (const p of L.variant.props) if (p.x !== undefined) assert.ok(p.x > L.room.x0 && p.x < L.room.x1 && p.z > L.room.z0 && p.z < L.room.z1, `${id}: rekvisitt ${p.type} i rommet`);
}
for (const id of ['bad', 'barnerom', 'kjokken']) assert.equal(JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8')).variant, undefined, `${id}: grunnrommene er uendret`);
// nivå 4–6 har egen palett: annen fargeaksent enn grunnrommet
for (const [a, b, k] of [['bad', 'bad2', 'wall:tile'], ['barnerom', 'barnerom2', 'wall:plaster'], ['kjokken', 'kjokken2', 'floor:tile']]) assert.notDeepEqual(gradeTint(a, k), gradeTint(b, k), `${b}: palett skiller seg fra ${a}`);
console.log('variant ok');
