import { createFlagState, pulse, clothWave } from './markers_logic.js';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FEIL', m); } };
const f = createFlagState();
ok(f.update(0.1).lit === 0, 'starter slukket');
f.ignite(); const o = f.update(0.1); ok(o.burst > 0.8 && o.glow > 0.12, 'oppblink ved tenning');
let last; for (let i = 0; i < 100; i++) last = f.update(0.05); ok(last.lit > 0.99 && last.burst === 0, 'jevn glød etterpå');
f.extinguish(); ok(f.update(0.05).lit === 0, 'slukket');
f.ignite(true); ok(f.update(0.01).lit > 0.99, 'stille tenning (gjenopptatt)');
for (let t = 0; t < 10; t += 0.1) { const p = pulse(t); ok(p >= 0 && p <= 1, 'puls i 0..1'); }
ok(clothWave(0, 0, 3) === 0, 'stanga står stille'); ok(Math.abs(clothWave(1, 0.2, 2)) < 0.12, 'bølge begrenset');
if (bad) { console.log(bad, 'feil'); process.exit(1); } console.log('markers: ok');
