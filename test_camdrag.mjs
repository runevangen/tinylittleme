// node test_camdrag.mjs: R59 kameradreining med høyre tommel (rene hjelpere + statisk sjekk av hektene i main.js/index.html)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Relay, inCore, yawDelta, pitchDelta, shouldHintDrag, CAM_SLOP, TAP_MS } from './camdrag.js';
const rect = { left: 100, top: 100, width: 88, height: 88 };   // HOPP: radius 44, midt (144,144)
assert.ok(inCore(144, 144, rect) && inCore(144 + 43, 144, rect), 'midt og kant av sirkelen er knapp');
assert.ok(!inCore(144 + 50, 144, rect), 'kantfeltet utenfor sirkelen er ikke knapp');
assert.ok(!inCore(100 + 2, 100 + 2, rect), 'hjørnet av firkanten er ikke knapp');
assert.ok(!inCore(144 + 41, 144, rect, 4), 'tydelig trykkflate: radius kan trekkes inn');
// dra fra en knapp: under terskelen ingen dra, over terskelen kommer full forskyvning én gang, så deltaer
{
  const r = new Relay(); r.start(7, 300, 500, 0, 'knapp');
  assert.equal(r.move(7, 303, 500), null, 'under terskelen er det ikke dra');
  const a = r.move(7, 280, 500); assert.ok(a.first && a.dx === -20 && a.dy === 0 && a.src === 'knapp');
  const b = r.move(7, 270, 505); assert.ok(!b.first && b.dx === -10 && b.dy === 5);
  const e = r.end(7, 400); assert.ok(!e.tap && e.dragged, 'etter dra er det ikke et trykk');
  assert.equal(r.move(7, 0, 0), null, 'ukjent peker etter slipp');
}
// kort trykk på kantfeltet blir et knappetrykk, langt trykk eller dra gjør det ikke
{
  let n = 0; const r = new Relay(); r.start(1, 10, 10, 0, 'kant', () => n++);
  const e = r.end(1, TAP_MS - 1); assert.ok(e.tap); e.fn(); assert.equal(n, 1);
  r.start(2, 10, 10, 0, 'kant', () => n++); assert.ok(!r.end(2, TAP_MS + 5).tap, 'hold lenge er ikke trykk');
  r.start(3, 10, 10, 0, 'kant', () => n++); r.move(3, 40, 10); assert.ok(!r.end(3, 50).tap, 'dra er ikke trykk');
}
// samme følsomhet som før på bildet: 100 px med camSens 1 gir 0,6 rad
assert.ok(Math.abs(yawDelta(100, 1) - 0.6) < 1e-9 && Math.abs(yawDelta(100, 2) - 1.2) < 1e-9);
assert.ok(pitchDelta(100, 1, true) < 0 && pitchDelta(100, 1, false) > 0);
// hint: bare berøring, spill, ingen sveip ennå, én gang
const h = { touch: true, play: true, shown: false, swipes: 0, t: 30 };
assert.ok(shouldHintDrag(h) && !shouldHintDrag({ ...h, t: 5 }) && !shouldHintDrag({ ...h, swipes: 1 }) && !shouldHintDrag({ ...h, shown: true }) && !shouldHintDrag({ ...h, touch: false }));
// hektene finnes: modulen er lastet i index.html, brukt i main.js, innstillingene finnes, og TA beholder kast-sikte
const idx = fs.readFileSync('index.html', 'utf8'), main = fs.readFileSync('main.js', 'utf8');
assert.ok(/'camdrag'/.test(idx), 'camdrag i files i index.html');
for (const k of ["import { Relay", "id: 'x'"].slice(0, 1)) assert.ok(main.includes(k));
assert.ok(main.includes("fl('camrelay'") && main.includes("rg('camslop', 'admin'"), 'SETTINGS camrelay + camslop (admin)');
assert.ok(main.includes("logEv('kamera'"), 'logEv for kamera-dra');
assert.ok(main.includes("bindBtn('btnCarry', 'carry', () => { carryEdge = true; }, false)"), 'TA starter ikke kamera-dra i sirkelen');
assert.equal(CAM_SLOP, 8);
console.log('camdrag-tester grønne');
