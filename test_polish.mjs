import { stepOffset, createReact, hangSway, fpsWatch, createAutoQ } from './polish.js';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FEIL', m); } };
ok(stepOffset(null, 1) === 0, 'ingen flate');
ok(Math.abs(stepOffset(1.1, 1) - 0.1) < 1e-9, 'trinn opp');
ok(stepOffset(5, 1) === 0.28 && stepOffset(-5, 1) === -0.1, 'begrenset');
const r = createReact(); ok(!r.update(0.1).active, 'hvile');
r.trigger('stomp'); let o = r.update(0.2); ok(o.active && o.armsUp > 0.9 && o.sy > 1, 'stomp: jubel og strekk');
o = r.update(0.4); ok(o.sy < 1.2 && o.sy > 0.8, 'stomp: sprett i grenser');
o = r.update(0.6); ok(!o.active && o.sy === 1, 'stomp slutter');
r.trigger('hurt'); o = r.update(0.05); ok(o.lean < -0.2 && o.crouch > 0.3, 'hurt: rykk bakover');
let late = 0; for (let i = 0; i < 20; i++) late = r.update(0.05); ok(!late.active, 'hurt slutter');
ok(hangSway(0, 0).legL > 0 && hangSway(1, 3, true).roll < 0, 'heng');
const f = fpsWatch(30, 1000); let res; for (let i = 0; i < 40; i++) res = f.push(50) || res; ok(res && res.low && res.fps < 25, 'lav fps');
const g = fpsWatch(30, 1000); res = null; for (let i = 0; i < 70; i++) res = g.push(16) || res; ok(res && !res.low, 'bra fps');
const rs = createReact(); rs.trigger('stomp'); let hmax = 0, cmin = 9; for (let i = 0; i < 20; i++) hmax = Math.max(hmax, rs.update(0.04).hop); ok(hmax > 0.15, 'stomp: tydelig sprett');
rs.trigger('hurt'); cmin = rs.update(0.02).crouch; ok(cmin > 0.45, 'hurt: tydelig sammenkrøping');
for (const h of [0, 0.02, 0.1, 0.28, 0.4]) ok(stepOffset(1 + h, 1) <= 0.28 && stepOffset(1 + h, 1) >= 0, 'trinnserie ' + h);
ok(hangSway(1, 3, true).legL !== hangSway(1, 3, false).legL, 'sving skiller seg fra heng');
// autoq: beslutning i polish.js
{ const W = (fps) => ({ fps, worst: 40, low: fps < 24, lowRuns: 0 });
  const mk = () => { const q = createAutoQ(); q.feed(1000); return q; };                       // 1 s spilt: fortsatt oppvarming
  let q = mk(); ok(q.decide(W(5), 2, true) === null && q.decide(W(5), 2, true) === null && q.decide(W(5), 2, true) === null, 'autoq: oppstartsrykk teller ikke');
  q = createAutoQ(); for (let i = 0; i < 9; i++) q.feed(1000); ok(q.warm, 'autoq: varm etter 8 s');
  let d = q.decide(W(15), 2, true); ok(d === null, 'autoq: ett lavt vindu gir ikke trinn');
  d = q.decide(W(15), 2, true); ok(d && d.dir === 'down' && d.pr === 1.5, 'autoq: to lave vinduer gir ett trinn ned (2 til 1.5)');
  ok(q.decide(W(15), 1.5, true) === null && q.decide(W(15), 1.5, true) === null, 'autoq: pause etter trinn (ikke trinn hvert 3. sekund)');
  d = q.decide(W(15), 1.5, true); ok(d && d.pr === 1.13, 'autoq: neste trinn 1.5 til 1.13');
  d = null; for (let i = 0; i < 4 && !d; i++) d = q.decide(W(15), 1.13, true); ok(d && d.pr === 1, 'autoq: 1.13 til 1');
  for (let i = 0; i < 6; i++) ok(q.decide(W(10), 1, true) === null, 'autoq: aldri under 1x');
  q = createAutoQ(); for (let i = 0; i < 9; i++) q.feed(1000); ok(q.decide(W(10), 2, false) === null && q.decide(W(10), 2, false) === null && q.decide(W(10), 2, false) === null, 'autoq: av gir ingen endring');
  q = createAutoQ(); for (let i = 0; i < 9; i++) q.feed(1000); for (let i = 0; i < 12; i++) ok(q.decide(W(30), 2, true) === null, 'autoq: 30 fps-låst iPhone senkes ikke');
  q = createAutoQ(); for (let i = 0; i < 9; i++) q.feed(1000); q.decide(W(20), 2, true); ok(q.decide(W(60), 2, true) === null && q.decide(W(20), 2, true) === null, 'autoq: lavt avbrutt av bra vindu nullstiller');
  q = createAutoQ(); for (let i = 0; i < 9; i++) q.feed(1000); q.decide(W(15), 2, true); q.decide(W(15), 2, true);   // ned til 1.5
  let up = null; for (let i = 0; i < 8 && !up; i++) up = q.decide(W(60), 1.5, true); ok(up && up.dir === 'up' && up.pr === 2, 'autoq: tilbake opp etter jevnt god FPS');
  for (let i = 0; i < 8; i++) ok(!(q.decide(W(60), 2, true)), 'autoq: aldri over full oppløsning');
  q = createAutoQ(); for (let i = 0; i < 9; i++) q.feed(1000); let n = 0; for (let i = 0; i < 80; i++) { const r = q.decide(W(i % 14 < 7 ? 12 : 60), 1.5, true); if (r && r.dir === 'up') n++; } ok(n <= 3, 'autoq: pendler ikke (maks antall opp)');
}
{ // main.js bruker faktisk polish.js: fotløft (IK-fot) og heng/sving
  const { readFileSync } = await import('node:fs'); const m = readFileSync(new URL('./main.js', import.meta.url), 'utf8');
  ok(/off = stepOffset\(sf \? sf\.top : null, p\.y\)/.test(m) && /f\.y \+= footSm\[key\] \/ RIG_S/.test(m), 'main.js: stepOffset løfter IK-foten');
  ok(/p\.state === 'hang'[^\n]*\n[^\n]*hangSway\(sec, [^\n]*false\)/.test(m), 'main.js: heng bruker hangSway');
  ok(/p\.state === 'swing'[^\n]*\n[^\n]*hangSway\(sec \* 1\.4, [^\n]*true\)/.test(m), 'main.js: sving bruker hangSway');
  ok((m.match(/Lavere oppløsning/g) || []).length === 1 && /qToasted/.test(m), 'autoq: én melding per økt');
}
if (bad) process.exit(1); console.log('polish ok');
