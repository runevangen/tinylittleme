// node test_buildtouch.mjs: R109, berøringstilstanden i byggeskjermen (ren logikk i build_touch_logic.js) + at koden er koblet slik at ingenting blir hengende,
// ↺ ↻ ✕ ligger i en fast rad, ⚑ ligger øverst, og DOM-skrivinger per bilde er begrenset. Ekte berøring og bilder: tools/live_cbx_regress.cjs.
import assert from 'node:assert/strict'; import fs from 'node:fs';
const X = await import('./build_touch_logic.js'), C = await import('./buildux_classic_logic.js');
const src = (f) => fs.readFileSync(new URL(`./${f}`, import.meta.url), 'utf8');
let n = 0; const t = (name, fn) => { fn(); n++; };

t('hanging', () => {
  assert.deepEqual(X.hanging({}), []); assert.deepEqual(X.hanging({ drag: {}, gest: {}, ptrs: 2, capture: true }), ['drag', 'gest', 'ptrs', 'capture']);
});
t('normal slipp plasserer bare riktig finger', () => {
  const s = { drag: { pid: 5 }, ptrs: 0, capture: true };
  assert.equal(X.touchEvent('up', s, 5).place, true); assert.equal(X.touchEvent('up', s, 6).place, false); assert.equal(X.touchEvent('up', s, 5).release, true);
});
t('avbrutt berøring nullstiller og plasserer aldri', () => {
  const s = { drag: { pid: 5 }, gest: null, ptrs: 0, capture: true }, r = X.touchEvent('cancel', s, 5);
  assert.equal(r.place, false); assert.equal(r.reset, true); assert.equal(r.release, true); assert.match(r.log, /nullstilt/);
  assert.equal(X.touchEvent('cancel', { drag: null, gest: null, ptrs: 0 }, 9).reset, false, 'ingenting hang: ingen nullstilling');
  assert.equal(X.touchEvent('cancel', { drag: null, gest: null, ptrs: 0 }, 9).log, '', 'ingen logg uten hengende tilstand');
  assert.equal(X.touchEvent('cancel', { drag: { pid: 1 } }, null).reset, true, 'touchcancel uten pointerId');
  assert.equal(X.touchEvent('cancel', { gest: { kind: 'two' }, ptrs: 1 }, 3).reset, true);
});
t('mistet capture og blur', () => {
  assert.equal(X.touchEvent('lost', { drag: { pid: 2 } }, 2).reset, true); assert.equal(X.touchEvent('lost', { drag: { pid: 2 } }, 9).reset, false);
  assert.equal(X.touchEvent('blur', { gest: {} }, null).reset, true); assert.equal(X.touchEvent('blur', {}, null).reset, false);
});
t('⚑ avbryter dra', () => { const r = X.touchEvent('flag', { drag: { pid: 1 }, capture: true }, null); assert.equal(r.reset, true); assert.match(r.log, /⚑/); assert.equal(X.touchEvent('flag', {}, null).log, ''); });
t('valgt-rad: vises når noe er valgt, aldri under dra/prøve/ark', () => {
  assert.equal(X.selRowKind({ sel: 'k1' }), 'part'); assert.equal(X.selRowKind({ selLink: 'l1' }), 'link'); assert.equal(X.selRowKind({}), null);
  assert.equal(X.selRowKind({ sel: 'k1', dragging: true }), null); assert.equal(X.selRowKind({ sel: 'k1', sim: true }), null); assert.equal(X.selRowKind({ sel: 'k1', sheet: true }), null);
  assert.equal(X.selRowKind({ sel: 'k1' }), C.selKindOf({ sel: 'k1' }), 'samme svar som før uten verktøy');
});
t('valgt-rad: fast plass over delebrettet, minst 48 px, innenfor skjermen, stående og liggende', () => {
  for (const [w, h] of [[390, 844], [390, 664], [844, 390], [667, 375], [932, 430], [320, 568]]) {
    const m = C.classicMetrics({ w, h, insetT: 0, insetB: 0 }), p = X.selRowPlace({ m, H: h, kind: 'part' });
    assert.ok(p.w >= 3 * 48 && p.h >= 48, 'trykkflate'); assert.ok(p.left >= m.area.x0 && p.right <= m.area.x1, `${w}x${h}: innenfor byggeområdet`); assert.ok(p.y >= 0 && p.bottom <= h, 'på skjermen');
    const trayTop = h - m.trayBottom - (m.orient === 'land' ? C.CBX.trayLand : C.CBX.trayH); assert.ok(p.bottom <= trayTop + 1, `${w}x${h}: over delebrettet`);
    if (m.orient === 'port') assert.ok(p.bottom <= trayTop - C.CBX.costH + 1, 'over kostnadsplata i stående');
    assert.equal(X.selRowPlace({ m, H: h, kind: 'link' }).w, 48);
  }
});
t('tekstplassering: plata starter under hintlinjen', () => {
  assert.equal(X.plateTop({ topPx: 80, hintBottom: 0 }), 58); assert.equal(X.plateTop({ topPx: 80, hintBottom: 110 }), 114); assert.ok(X.plateTop({ topPx: 80, hintBottom: 40 }) >= 58);
});
t('overlapp-hjelper', () => {
  assert.deepEqual(X.overlaps([{ k: 'a', x: 0, y: 0, r: 10, b: 10 }, { k: 'b', x: 20, y: 0, r: 30, b: 10 }]), []);
  assert.deepEqual(X.overlaps([{ k: 'a', x: 0, y: 0, r: 10, b: 10 }, { k: 'b', x: 5, y: 5, r: 30, b: 10 }]), [['a', 'b']]);
});
t('DOM-skrivinger: bare ved endring (budsjett per bilde/berøring)', () => {
  const c = X.createWriteCounter(), cache = new Map(); let applied = 0; const ap = () => { applied++; };
  for (let i = 0; i < 100; i++) X.writeOnce(cache, 'txt', 'samme', ap, c);   // 100 bilder med samme tekst
  assert.equal(c.n, 1); assert.equal(applied, 1); X.writeOnce(cache, 'txt', 'ny', ap, c); assert.equal(c.n, 2);
});
t('kobling i build.js og skallet', () => {
  const b = src('build.js'), v = src('buildux_classic_view.js'), m = src('main.js'), idx = src('index.html');
  assert.ok(!/root\.setPointerCapture/.test(b), 'capture settes aldri på roten');
  assert.ok(/addEventListener\('pointercancel'/.test(b) && /touchcancel/.test(b) && /lostpointercapture/.test(b) && /addEventListener\('blur'/.test(b), 'avbrutt berøring håndteres');
  assert.ok(!/addEventListener\('pointercancel', up\)/.test(b), 'pointercancel plasserer ikke lenger delen');
  assert.ok(/logEv\('bygg', '⚑ trykket i byggeskjermen'\)/.test(b) && /touchReset\('flag'/.test(b), '⚑ logges og avbryter dra');
  assert.ok(/logEv\('bygg', r\.log\)/.test(b), 'nullstilt hengende tilstand logges');
  assert.ok(/body\.building #qbtn\{z-index:30/.test(v), '⚑ ligger øverst');
  assert.ok(/selRowPlace/.test(v) && !/barPlace\(/.test(v), 'valgt-raden er fast, ikke flytende ved delen');
  assert.ok(/pointerup/.test(v) && /på slipp/.test(v), '↺ ↻ ✕ virker på slipp');
  assert.ok(/buildpause3d/.test(m) && /bld\.active && buildPause3d/.test(m), '3D pauses bak byggeskjermen (innstilling)');
  assert.ok(idx.includes("'build_touch_logic'"), 'modulen ligger i files');
  const hints = b.match(/setHint\(/g) || []; assert.ok(hints.length >= 3, 'hintlinjen skrives bare ved endring'); assert.equal((b.match(/hintEl\.textContent =/g) || []).length, 1, 'bare setHint skriver hintlinjen');
  assert.ok(/cbx\.on\(\) \? '' : grid\.modeTip\(\)/.test(b), 'MODUS-hintet vises ikke i det nye skallet');
});
console.log(`test_buildtouch: ${n} grupper ok`);
