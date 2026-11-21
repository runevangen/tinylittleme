// node test_buildtap.mjs: R110, hva et trykk gjør i byggeskjermen (build_tap_logic.js) + at build.js er koblet slik at brikke- og del-trykk virker og «Tåler» bare kjøres der måleren vises.
import assert from 'node:assert/strict'; import fs from 'node:fs';
const X = await import('./build_tap_logic.js'), L = await import('./build_logic.js');
const src = (f) => fs.readFileSync(new URL(`./${f}`, import.meta.url), 'utf8');
const site = { id: 'vippe', w: 20, h: 12, x: 0, y: 0, z: 0 };
const mk = () => L.createBuild(site, { a: 'plank_l', b: 'plank_l', c: 'block', d: 'plank_s' }, ['a', 'b', 'c', 'd']);
let n = 0; const t = (name, fn) => { fn(); n++; };

t('kort trykk eller dra', () => { assert.equal(X.isTap(5, 5, 8, 7), true); assert.equal(X.isTap(5, 5, 20, 5), false); assert.equal(X.isTap(0, 0, 9.9, 0), true); assert.equal(X.isTap(0, 0, 10, 0), false); });

t('brikke i delebrettet: legges midt i utsnittet, aldri oppå en annen del', () => {
  const B = mk(), view = { cu: 0, cv: 5 };
  const p1 = X.trayPlace({ B, id: 'a', type: 'plank_l', view }); assert.equal(p1.why, 'midten'); assert.equal(p1.u, 0); assert.equal(p1.v, 5);
  L.place(B, 'a', p1.u, p1.v, p1.rot);
  const p2 = X.trayPlace({ B, id: 'b', type: 'plank_l', view }); assert.notEqual(p2.why, 'midten');
  const q = L.place(B, 'b', p2.u, p2.v, p2.rot);
  assert.equal(X.partsOverlap(B.placed[0], q), false, 'ikke oppå');
  for (const id of ['c', 'd']) { const p = X.trayPlace({ B, id, type: B.types[id], view }); const r = L.place(B, id, p.u, p.v, p.rot); for (const o of B.placed) if (o !== r) assert.equal(X.partsOverlap(o, r), false, `${id} oppå ${o.id}`); }
  for (const p of B.placed) assert.ok(Math.abs(p.u) <= 10 && p.v >= 0 && p.v <= 12);
});
t('brikke: ledig festepunkt rett ved midten vinner; fullt brett gir midten', () => {
  const B = L.createBuild({ ...site, anchors: [{ u: 0, v: 2 }] }, { a: 'block' }, ['a']);
  const p = X.trayPlace({ B, id: 'a', type: 'block', view: { cu: 0.3, cv: 2.4 } }); assert.equal(p.why, 'festepunkt'); assert.equal(p.v, 2);
  const tiny = { id: 's', w: 1.6, h: 1.6 }, B2 = L.createBuild(tiny, { a: 'block', b: 'block' }, ['a', 'b']); L.place(B2, 'a', 0, 0.75, 0);
  assert.equal(X.trayPlace({ B: B2, id: 'b', type: 'block', view: { cu: 0, cv: 0.8 } }).why, 'full');
});
t('SAT-overlapp', () => {
  const A = { type: 'plank_l', u: 0, v: 5, rot: 0 };
  assert.equal(X.partsOverlap(A, { type: 'plank_l', u: 0, v: 5.2, rot: 0 }), true);
  assert.equal(X.partsOverlap(A, { type: 'plank_l', u: 0, v: 6.5, rot: 0 }), false);
  assert.equal(X.partsOverlap(A, { type: 'block', u: 0, v: 5, rot: Math.PI / 2 }), true);
  assert.equal(X.partsOverlap(A, { type: 'plank_l', u: 8.2, v: 5, rot: 0 }), false);
});
t('hitsAt: øverst først, del under, margin rundt tynne planker (≥ 44 px)', () => {
  const B = mk(); L.place(B, 'a', 0, 5, 0); L.place(B, 'b', 0, 5, 0); B.snap = true;
  assert.deepEqual(X.hitsAt(B, 0, 5, 0.35), ['b', 'a']);
  const scale = 20, pad = L.pickPad(scale); assert.ok(2 * pad * scale >= 44, 'treffmargen gir minst 44 px');
  assert.deepEqual(X.hitsAt(B, 0, 5 + 0.25 + pad - 0.01, pad).length, 2, 'treffer rett over den tynne planken');
  assert.deepEqual(X.hitsAt(B, 0, 9, pad), []);
});
t('trykk igjen velger delen under, og alle nås', () => {
  const h = ['c', 'b', 'a']; assert.equal(X.nextUnder(h, null), 'c'); assert.equal(X.nextUnder(h, 'x'), 'c');
  const seen = []; let s = 'a'; for (let i = 0; i < 3; i++) { s = X.nextUnder(h, s); seen.push(s); } assert.deepEqual([...seen].sort(), ['a', 'b', 'c']);
  assert.equal(X.nextUnder(['a'], 'a'), 'a'); assert.equal(X.nextUnder([], 'a'), null);
});
t('tapAction i hver tilstand', () => {
  const hits = ['b', 'a'];
  assert.equal(X.tapAction({ sim: true, hits }).kind, 'none'); assert.match(X.tapAction({ sim: true }).log, /uten effekt/);
  assert.deepEqual(X.tapAction({ hits: [] }), { kind: 'deselect', log: '' });
  assert.equal(X.tapAction({ hits }).id, 'b'); assert.equal(X.tapAction({ hits, sel: 'b' }).id, 'a'); assert.match(X.tapAction({ hits, sel: 'b' }).log, /valgt a/);
  for (const tool of ['tape', 'hinge', 'rope', 'band']) {
    assert.equal(X.tapAction({ tool, hits }).kind, 'linkFirst'); assert.equal(X.tapAction({ tool, hits, linkFrom: 'b' }).kind, 'select', 'samme del igjen velger den');
    assert.equal(X.tapAction({ tool, hits: ['a'], linkFrom: 'b' }).kind, 'link');
    const none = X.tapAction({ tool, hits: [] }); assert.equal(none.kind, 'none'); assert.match(none.log, /uten effekt: ingen del/);
    assert.equal(X.tapAction({ tool, hits: [], linkFrom: 'b' }).kind, 'ground');
  }
});
t('Tåler: bare der måleren vises', () => {
  assert.equal(X.capShown({ bridge: false }), false, 'Vippe/Trapp (ikke bro)'); assert.equal(X.capShown({ bridge: true }), true);
  assert.equal(X.capShown({ bridge: true, gridOn: true }), false); assert.equal(X.capShown({ bridge: true, setting: false }), false);
  assert.equal(X.capShown({ lab: true, labCap: false, bridge: true }), false, 'Byggeskole: bare «Tåler X»'); assert.equal(X.capShown({ lab: true, labCap: true }), true);
});
t('Tåler: debounce, ikke mens fingeren er nede', () => {
  assert.ok(X.TAP.capDelay <= X.TAP.capDelayMax && X.TAP.capDelayMax <= 300);
  assert.equal(X.capWait({ shown: true }), X.TAP.capDelay); assert.equal(X.capWait({ shown: true, dragging: true }), -1); assert.equal(X.capWait({ shown: false }), -1); assert.equal(X.capWait({ shown: true, cached: true }), -1);
  const c = X.createCapStats(); c.add(40); c.add(41); assert.equal(c.runs, 2); assert.equal(c.ms, 81); c.reset(); assert.equal(c.runs, 0);
});
t('build.js er koblet', () => {
  const b = src('build.js');
  assert.match(b, /from '\.\/build_tap_logic\.js'/); assert.match(b, /trayTap\(B, drag\.id\)/); assert.match(b, /capShown\(/); assert.match(b, /capStats\.add/);
  assert.match(b, /logEv\('bygg', `trykk på del i delebrettet legger ut/); assert.match(b, /tapAction\(/);
  assert.match(b, /!tool && !drag && !hit && isDoubleTap/, 'dobbelttrykk-zoom bare på tomt');
  assert.ok(!/capKey = key;[\s\S]{0,400}setTimeout\(\(\) => \{[\s\S]{0,200}\}, 160\)/.test(b), 'ingen fast 160');
  assert.match(src('index.html'), /'build_tap_logic'/);
  assert.match(src('i18n.js'), /'tray\.tap'/);
});
console.log(`test_buildtap: ${n} grupper ok`);
