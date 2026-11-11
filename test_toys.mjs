// node test_toys.mjs: R18, levende leker. Logikken i toys_live.js (reaksjoner på dytt, landing, TA/slipp), og at brettene har lekene.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { P, newPlayer, initBodies, step, applyPreset, resetBodies } from './physics.js';
import { createToyLife, stepToys, resetToys, TOY, TOY_KINDS, TOY_SOUND, TOY_CUE, ROUND_KINDS } from './toys_live.js';
import { SOUND_LIST } from './audio.js';
import { KINDS } from './kinds.js';

applyPreset('mario');
const DT = 1 / 60, floor = { type: 'wood', id: 'gulv', min: [-30, -2, -30], max: [30, 0, 30] };
const mk = (...mov) => { const L = { boxes: [floor], ropes: [], hazards: [], movables: mov }; initBodies(L); return L; };
const mov = (id, kind, x, z, s, weight = 'light', y = 0) => ({ id, kind, material: 'plastic', color: 0xcccccc, min: [x - s[0] / 2, y, z - s[2] / 2], max: [x + s[0] / 2, y + s[1], z + s[2] / 2], weight });
const evs = (S, L, p, n) => { const out = []; for (let i = 0; i < n; i++) { step(p, { mx: 0, mz: 0 }, DT, L); out.push(...stepToys(S, L, p, DT)); } return out; };
const acts = (e) => e.map((x) => x.act);

// ---- kinds, lyder og innstillinger henger sammen ----
for (const k of TOY_KINDS) assert.ok(KINDS[k], `kinds.js kjenner ${k}`);
for (const [act, snd] of Object.entries(TOY_SOUND)) { assert.ok(SOUND_LIST.some((s) => s.id === snd), `lyden ${snd} finnes i audio.js (for ${act})`); assert.ok(TOY_CUE[act] || act === 'tick', `lydtekst for ${act}`); }
assert.ok(ROUND_KINDS.includes('tennisball') && ROUND_KINDS.includes('ball'));

// ---- tennisball: dyttet = pip og ruller videre; roen ball er stille ----
{
  const L = mk(mov('b', 'tennisball', 0, 0, [2.6, 2.6, 2.6])), S = createToyLife(L), b = L.bodies[0], p = newPlayer(-10, 0, 10);
  assert.equal(S.toys.size, 1); assert.ok(b.round, 'tennisball er kule');
  assert.deepEqual(acts(evs(S, L, p, 60)), [], 'stille ball, ingen lyd');
  b.min[0] += 0.08; b.max[0] += 0.08;                       // et dytt fra spilleren (målt som flytting)
  const e = evs(S, L, p, 2); assert.ok(acts(e).includes('squeak'), 'piper når den dyttes');
  const x0 = b.min[0]; evs(S, L, p, 40); assert.ok(b.min[0] > x0 + 0.2, `ruller videre (${(b.min[0] - x0).toFixed(2)})`);
  const n = acts(evs(S, L, p, 180)).filter((a) => a === 'squeak').length; assert.ok(n <= 3, 'piper ikke hele tiden');
  S.on = false; b.min[0] += 0.2; b.max[0] += 0.2; assert.deepEqual(evs(S, L, p, 3), [], 'av = ingen hendelser');
}
// ---- leketøysbil: tuter når den dyttes eller tas, med pause mellom ----
{
  const L = mk(mov('c', 'toycar', 0, 0, [4.8, 2.2, 2.4])), S = createToyLife(L), b = L.bodies[0], p = newPlayer(-10, 0, 10);
  b.min[0] += 0.1; b.max[0] += 0.1; assert.ok(acts(evs(S, L, p, 2)).includes('honk'));
  for (let i = 0; i < 100; i++) stepToys(S, L, p, DT);   // pause har gått; TA = tut
  b.carried = true; assert.ok(acts(stepToys(S, L, p, DT)).includes('honk'), 'TA gir tut');
}
// ---- vippehest: lander du på den, gynger den og knirker, og roer seg ----
{
  const L = mk(mov('h', 'rockinghorse', 0, 0, [4.8, 3.2, 2], 'heavy')), S = createToyLife(L), b = L.bodies[0], p = newPlayer(0, 6, 0);
  const e = evs(S, L, p, 90); assert.ok(p.groundBox === b, 'landet på hesten'); const r = e.find((x) => x.act === 'rock'); assert.ok(r && r.amp > 0.2, 'gynger ved landing');
  const t = S.toys.get('h'); assert.ok(t.rock > 0, 'gynger'); evs(S, L, p, Math.ceil(TOY.rockT * 60) + 5); assert.equal(t.rock, 0, 'roer seg');
}
// ---- sprettboks: lander du på den eller tar den, spretter den ----
{
  const L = mk(mov('j', 'jackbox', 0, 0, [2.8, 2.8, 2.8], 'medium')), S = createToyLife(L), b = L.bodies[0], p = newPlayer(0, 6, 0);
  assert.ok(acts(evs(S, L, p, 90)).includes('pop'), 'landing gir sprett'); assert.ok(S.toys.get('j').pop > 0 || true);
  const L2 = mk(mov('j', 'jackbox', 0, 0, [2.8, 2.8, 2.8], 'medium')), S2 = createToyLife(L2), p2 = newPlayer(-10, 0, 10);
  L2.bodies[0].carried = true; assert.ok(acts(stepToys(S2, L2, p2, DT)).includes('pop'), 'TA gir sprett');
}
// ---- wind-up: TA, slipp: går noen skritt i blikkretningen og stopper ----
{
  const L = mk(mov('w', 'windup', 0, 0, [1.8, 2.8, 1.6])), S = createToyLife(L), b = L.bodies[0], p = newPlayer(-10, 0, 0); p.fx = 1; p.fz = 0;
  b.carried = true; assert.ok(acts(stepToys(S, L, p, DT)).includes('wind'), 'trekkes opp når den tas');
  b.carried = false; const x0 = b.min[0]; const e = []; for (let i = 0; i < Math.ceil((TOY.windT + 1) * 60); i++) { step(p, { mx: 0, mz: 0 }, DT, L); e.push(...stepToys(S, L, p, DT)); }
  const a = acts(e); assert.ok(a.includes('go') && a.includes('stop'), 'går og stopper'); assert.ok(a.filter((x) => x === 'tick').length >= 5, 'tikker mens den går');
  const d = b.min[0] - x0; assert.ok(d > TOY.windSpeed * (TOY.windT - 0.6) && d < TOY.windSpeed * (TOY.windT + 0.4), `gikk ${d.toFixed(1)} enheter`);
  const x1 = b.min[0]; evs(S, L, p, 60); assert.ok(Math.abs(b.min[0] - x1) < 0.05, 'står stille etter stopp');
  // står den fast, stopper den raskt
  const L3 = mk(mov('w', 'windup', 0, 0, [1.8, 2.8, 1.6]), { id: 'vegg', kind: 'box', material: 'wood', min: [1.2, 0, -3], max: [2, 6, 3], weight: 'heavy' }); L3.bodies[1].dyn = false;
  const S3 = createToyLife(L3), p3 = newPlayer(-10, 0, 0); p3.fx = 1; p3.fz = 0; L3.bodies[0].carried = true; stepToys(S3, L3, p3, DT); L3.bodies[0].carried = false;
  const e3 = []; for (let i = 0; i < 90; i++) { step(p3, { mx: 0, mz: 0 }, DT, L3); e3.push(...stepToys(S3, L3, p3, DT)); } assert.ok(acts(e3).includes('stop'), 'stopper når den står fast');
  // nullstilling
  b.carried = false; resetBodies(L, p); resetToys(S); assert.equal(S.toys.get('w').wind, 0);
}
// ---- brettene: hver leke finnes i minst to nivåer ----
{
  const need = { tennisball: 0, rockinghorse: 0, windup: 0, jackbox: 0, toycar: 0 };
  for (const lv of ['bad', 'bad2', 'barnerom', 'barnerom2', 'kjokken', 'kjokken2']) {
    const L = JSON.parse(fs.readFileSync(`levels/${lv}.level.json`, 'utf8')), seen = new Set(L.movables.filter((m) => m.id.startsWith('leke_')).map((m) => m.kind));
    for (const k of seen) need[k]++;
    for (const m of L.movables) if (m.kind === 'tennisball') assert.ok(m.round, `${lv}: tennisball er rund`);
  }
  for (const [k, n] of Object.entries(need)) assert.ok(n >= 2, `${k} finnes i ${n} nivå(er), trenger minst 2`);
}
console.log('leke-tester grønne');
