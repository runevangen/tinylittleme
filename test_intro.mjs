// node test_intro.mjs: R22 start-lesbarhet: første delmål for alle seks nivåer, sveipet slutter og gir kontrollen tilbake, hopp over med ett trykk, tekster nevner knapper.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { makeT, DICT_KEYS } from './i18n.js';
import { INTRO, INTRO_SWEEP, introKey, STORY_LEVELS } from './story.js';
import { firstTarget, reachedFirst, createSweep, sweepPose } from './intro.js';

const levels = { 1: 'bad', 2: 'barnerom', 3: 'kjokken', 4: 'bad2', 5: 'barnerom2', 6: 'kjokken2', 7: 'leke' };
let lang = 'nb'; const { T } = makeT(() => lang);
for (let n = 1; n <= STORY_LEVELS; n++) {
  const L = JSON.parse(fs.readFileSync(new URL(`./levels/${levels[n]}.level.json`, import.meta.url), 'utf8'));
  const t = firstTarget(L.route, L.start, n);
  assert.ok(t, `nivå ${n} mangler første delmål`);
  assert.ok(t.y > L.start[1] + 0.5, 'første delmål ligger høyere enn start');
  assert.ok(!reachedFirst(t, { x: L.start[0], y: L.start[1], z: L.start[2] }), 'ikke nådd ved start');
  assert.ok(reachedFirst(t, { x: t.x, y: t.y, z: t.z }), 'nådd når man står på flata');
  assert.ok(introKey(n) && INTRO[n]);
  for (const l of ['nb', 'en']) {
    lang = l; const k = introKey(n), txt = T(k, { jump: 'HOPP', take: 'TA', grab: 'GREP' });
    assert.notEqual(txt, k, `${l}:${k} mangler`); assert.ok(!/\{\w+\}/.test(txt), 'alle variabler fylt'); assert.ok(txt.length < 110, 'kort hint');
    assert.ok(/\{(jump|take|grab)\}/.test(T(k)) , 'hintet nevner knapp (variabel), ikke tast');
    assert.ok(!/\b(mellomrom|space|shift|tast)\b/i.test(T(k)), 'ingen taster hardkodet');
  }
}
for (const k of ['intro.first', 'intro.skip']) for (const l of ['nb', 'en']) { lang = l; assert.notEqual(T(k), k); }
assert.equal(firstTarget([], [0, 0, 0], 1), null); assert.equal(firstTarget(null, [0, 0, 0], 1), null);
assert.equal(firstTarget([{ id: 'a', top: 0, x0: 0, x1: 1, z0: 0, z1: 1 }, { id: 'b', top: 3, x0: 0, x1: 2, z0: 0, z1: 2 }], [0, 0, 0], 9, { 9: { first: 'a' } }).id, 'a', 'data kan peke ut første delmål');

// sveipet slutter etter hold+travel og gir kontrollen tilbake
{
  const sw = createSweep(); let t = 0, r, n = 0, sawActive = false;
  do { r = sw.update(0.016); t += 0.016; n++; if (r.active) sawActive = true; } while (!r.done && n < 2000);
  assert.ok(sawActive && r.done && !r.active && !sw.s.skipped);
  assert.ok(Math.abs(t - (INTRO_SWEEP.hold + INTRO_SWEEP.travel)) < 0.1, 'varer hold+reise');
  assert.ok(sw.update(0.016).done, 'blir ferdig');
  const sw2 = createSweep(); sw2.update(0.5); assert.ok(sw2.update(0.1).active); sw2.skip(); const r2 = sw2.update(0.016); assert.ok(r2.done && !r2.active && sw2.s.skipped, 'ett trykk hopper over');
  const sw3 = createSweep({ hold: 0.1, travel: 0.1 }); let c = 0; while (!sw3.update(1).done && c++ < 5); assert.ok(c < 3, 'store dt gir ikke uendelig sveip');
}
// kameraet: ved start ved målet, ved slutt nøyaktig vanlig kamera, alltid inni rommet
{
  const base = { goal: [50, 20, -30], hero: [0, 0.6, 0], yaw: 0.3, pitch: 0.45, dist: 16, nPos: [1, 3, 5], nLook: [0, 0.6, 0], room: { x0: -40, x1: 40, z0: -40, z1: 40, height: 60 } };
  const a = sweepPose({ ...base, e: 0 }), b = sweepPose({ ...base, e: 1 });
  assert.ok(a.look[0] > 30 || a.look[0] === 50 || Math.abs(a.look[0] - 50) < 1e-9, 'starter med blikk mot målet');
  assert.deepEqual(b.pos.map((v) => +v.toFixed(6)), base.nPos); assert.deepEqual(b.look.map((v) => +v.toFixed(6)), base.nLook);
  for (const e of [0, 0.25, 0.5, 0.75, 1]) { const o = sweepPose({ ...base, e }); assert.ok(o.pos[0] >= -40 && o.pos[0] <= 40 && o.pos[2] >= -40 && o.pos[2] <= 40 && o.pos[1] <= 60, 'kamera inni rommet'); }
}
// hekter i main.js og filliste
const src = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8');
assert.ok(src.includes("logEv('intro'") && src.includes("'tlm.introsweep'") && src.includes('introBegin()'), 'main.js har hektene');
assert.ok(/'intro', 'intro_view'/.test(fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8')), 'filene er i index.html');
console.log('intro: ok');
