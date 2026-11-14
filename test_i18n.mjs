// node test_i18n.mjs: begge språk har de samme nøklene, og plassholdere går opp
import assert from 'node:assert/strict';
import { makeT, DICT_KEYS, NAMES } from './i18n.js';
assert.deepEqual([...DICT_KEYS.nb].sort(), [...DICT_KEYS.en].sort(), 'nb og en har samme nøkler');
let lang = 'nb'; const { T, name } = makeT(() => lang);
assert.equal(T('btn.smear'), 'SMØR'); assert.equal(T('hint.take', { name: 'Nål' }), 'ta Nål');
lang = 'en'; assert.equal(T('btn.smear'), 'SMEAR'); assert.equal(T('hint.take', { name: 'Needle' }), 'take Needle');
for (const l of ['nb', 'en']) { lang = l; for (const k of DICT_KEYS[l]) assert.ok(!/\{\w+\}/.test(T(k, { m: 'M', btn: 'X', z: 'Z', g: 'G', name: 'Y', next: 'N', list: 'L', tieTop: 'A', tieEnd: 'B', press: 'P', hang: 'Q', grab: 'C', thread: 'D', smear: 'E', unroll: 'F', drop: 'G', jump: 'H', take: 'I', center: 'J', look: 'K', place: 'L', n: '1', total: '2', rank: '1', stars: 'S', cost: '5', parts: '2', of: '3' })), `plassholder i ${l}:${k}`); }
assert.equal(name('gel_bottle', '?'), 'Hair gel'); lang = 'nb'; assert.equal(name('gel_bottle', '?'), 'Hårgelé'); assert.equal(name('xyz', 'reserve'), 'reserve');
for (const [k, v] of Object.entries(NAMES)) assert.equal(v.length, 2, k);
console.log('språk-tester grønne');
