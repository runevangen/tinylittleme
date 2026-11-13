// node test_climbfeel.mjs: R58, klatring som ser levende ut: faser, grep, vekt, opptrekk, avspark; fysikk uendret.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CF, climbPhase, regrip, gripFingers, hangWeight, footPush, pullLegs, climbPush, kickOff, climbFeel } from './climbfeel.js';
import { P, box, newPlayer, step } from './physics.js';

// faser
assert.equal(climbPhase({ state: 'hang', catchT: 1 }), 'catch');
assert.equal(climbPhase({ state: 'hang', catchT: 0 }), 'hang');
assert.equal(climbPhase({ state: 'climb', catchT: 0 }), 'climb');
assert.equal(climbPhase({ state: 'mantle', mantleU: 0.3 }), 'pull');
assert.equal(climbPhase({ state: 'air', kickT: 0.5 }), 'kick');
assert.equal(climbPhase({ state: 'air', kickT: 0 }), '');
assert.equal(climbPhase({ state: 'ground' }), '');
// nytt tak: aldri begge hendene samtidig, og hver hånd tar tak innen perioden
{ let both = 0, l = 0, r = 0; for (let t = 0; t < 20; t += 0.02) { const a = regrip(t, 0), b = regrip(t, CF.regripPeriod / 2); if (a > 0.05 && b > 0.05) both++; if (a > 0.9) l++; if (b > 0.9) r++; } assert.equal(both, 0, 'hendene slipper ikke samtidig'); assert.ok(l > 0 && r > 0); }
// fingre: åpne ved start, lukket rundt kanten på slutten, klem imellom
{ assert.ok(gripFingers(1) < 0.1, 'åpne ved rekk'); assert.ok(Math.abs(gripFingers(0) - 1.2) < 0.01, 'hvilegrep'); let mx = 0, prev = -1, mono = true; for (let i = 0; i <= 50; i++) { const f = gripFingers(1 - i / 50); mx = Math.max(mx, f); } assert.ok(mx > 1.2, 'liten ekstra klem'); assert.ok(mx <= 1.5); }
// vektfordeling: trett henger lavere og strekker armene mer
{ const a = hangWeight(1, 0, 0), b = hangWeight(1, 1, 0); assert.ok(b.drop < a.drop, 'trett henger lavere'); assert.ok(b.shoulders > a.shoulders); const s = hangWeight(1, 0, 3); assert.ok(Math.abs(s.sway) <= Math.abs(hangWeight(1, 0, 0).sway) + 1e-9, 'fart demper svaiing'); }
// benvinkel: bøyd kne mot veggen, strakt ved full skyv
{ const a = footPush(0), b = footPush(1); assert.ok(a.k > b.k && b.k > 0 && a.h < b.h, 'kne strekkes ved skyv'); assert.deepEqual(footPush(5), footPush(1)); }
// opptrekk: beina skyver, siste del svinger beinet over kanten
{ const s = pullLegs(0.05), m = pullLegs(0.55), e = pullLegs(1); assert.ok(m.push > s.push, 'skyvet øker'); assert.ok(e.kL > 0.5, 'beinet svinger opp'); for (let i = 0; i <= 20; i++) { const q = pullLegs(i / 20); for (const v of Object.values(q)) assert.ok(Number.isFinite(v)); } }
// klatring: kryssmønster, én fot skyver av gangen
{ const a = climbPush(1, 1), b = climbPush(-1, 1); assert.ok(a.L > 0.9 && a.R < 0.1 && b.R > 0.9 && b.L < 0.1); const z = climbPush(1, 0); assert.equal(z.L + z.R, 0, 'i ro: ingen skyv'); }
// avspark: strakt fra veggen først, så knærne opp; armene slipper
{ const a = kickOff(0.95), b = kickOff(0.3), c = kickOff(0); assert.ok(a.ext > 0 && c.kL > a.kL, 'knærne trekkes opp etter avsparket'); assert.ok(b.lean !== undefined); }
// samlet: deltaer, styrke, av
{
  const base = { state: 'hang', sec: 2, catchT: 0, tired: 0.4, speed: 0 };
  const f1 = climbFeel({ ...base, strength: 1 }), f0 = climbFeel({ ...base, strength: 0 }), f2 = climbFeel({ ...base, strength: 1.5 });
  assert.equal(f1.phase, 'hang'); assert.deepEqual(f0.d, {}); assert.equal(f0.bob, 0); assert.equal(f0.fgL, null, 'styrke 0 gjør ingenting');
  assert.ok(Math.abs(f2.d.eL) > Math.abs(f1.d.eL), 'styrke skalerer'); assert.ok(climbFeel({ ...base, strength: 99 }).d.eL <= f2.d.eL + 1e-9, 'tak på styrke');
  assert.ok(f1.fgL > 0.8 && f1.bob < 0);
  const c = climbFeel({ state: 'climb', sec: 1, catchT: 1, strength: 1 }); assert.equal(c.phase, 'catch'); assert.ok(c.fgL < 0.1, 'fingrene åpne i det han rekker');
  assert.equal(climbFeel({ state: 'climb', sec: 1, catchT: 0, s1: 1, climbMove: 0.8 }).phase, 'climb');
  const m = climbFeel({ state: 'mantle', mantleU: 0.5, sec: 1 }); assert.ok(m.phase === 'pull' && Number.isFinite(m.d.kL));
  const k = climbFeel({ state: 'air', kickT: 0.8, sec: 1 }); assert.ok(k.phase === 'kick' && k.d.kL > 0);
  assert.equal(climbFeel({ state: 'ground' }).phase, ''); assert.equal(climbFeel().phase, '');
  for (const st of ['hang', 'climb', 'mantle', 'air']) for (let i = 0; i < 50; i++) { const r = climbFeel({ state: st, sec: i * 0.3, catchT: (i % 5) / 5, kickT: (i % 7) / 7, mantleU: i / 50, s1: Math.sin(i), climbMove: 0.8, tired: i / 50, speed: i % 3 }); for (const v of Object.values(r.d)) assert.ok(Number.isFinite(v)); assert.ok(Number.isFinite(r.bob)); }
}
// fysikk er uendret: modulen importerer ikke physics, physics.js kjenner den ikke, og en heng/klatre-kjøring gir samme bane
{
  const src = fs.readFileSync(new URL('./climbfeel.js', import.meta.url), 'utf8'); assert.ok(!/^\s*import /m.test(src), 'ren logikk uten imports');
  assert.ok(!/climbfeel/i.test(fs.readFileSync(new URL('./physics.js', import.meta.url), 'utf8')), 'physics.js kjenner ikke modulen');
  const idle = { mx: 0, mz: 0, jumpPressed: false, jumpHeld: false, grabPressed: false, grabHeld: false };
  const run = () => { const L = { boxes: [box('floor', -50, 50, -2, 0, -50, 50), box('wood', 2, 6, 0, 3, -3, 3, { grip: true })], ropes: [] }; const p = newPlayer(1, 0, 0); p.fx = 1; p.fz = 0; const out = [], st = new Set(); for (let i = 0; i < 240; i++) { step(p, { ...idle, mx: i < 100 ? 1 : 0, grabHeld: i > 20, grabPressed: i === 21, jumpPressed: i === 200 }, 1 / 60, L); out.push(p.x.toFixed(4), p.y.toFixed(4)); st.add(p.state); } return [out.join(','), [...st].join()]; };
  const a = run(); climbFeel({ state: 'hang', sec: 1 }); const b = run(); assert.equal(a[0], b[0], 'samme bane med og uten modulen'); assert.ok(a[1].length > 0);
}
// hekter i main.js, SETTINGS, index.html
{
  const m = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8'), h = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  assert.ok(/from '\.\/climbfeel\.js'/.test(m) && h.includes("'climbfeel'"), 'climbfeel i main.js og files');
  assert.ok(/id: 'climbfeel'|rg\('climbfeel'/.test(m) && /logEv\('klatrepose'/.test(m), 'innstilling og logEv');
}
console.log('climbfeel ok');
