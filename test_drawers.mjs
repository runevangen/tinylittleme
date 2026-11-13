// node test_drawers.mjs: R55 skuffer er lette å skille. Tilstand (åpen/lukket), farger og håndtak kommer fra scenedata; kollisjon er uendret.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { drawerSpec, drawerParts, partsBuffers, drawerSummary, shade, setDrawerCue, drawerCue, DRAWER_BASE } from './drawers.js';
const lv = (n) => JSON.parse(fs.readFileSync(new URL(`./levels/${n}.level.json`, import.meta.url), 'utf8'));
const sc = (n) => JSON.parse(fs.readFileSync(new URL(`./scenes/${n}.scene.json`, import.meta.url), 'utf8'));

// spesifikasjon: tilstand kommer fra data, standard er åpen, farger kan mangle
assert.equal(drawerSpec({ open: false }, 0xffffff).open, false);
assert.equal(drawerSpec({ open: true }).open, true);
assert.equal(drawerSpec(undefined).open, true, 'uten data: åpen (som før)');
assert.equal(drawerSpec({}, 0x123456).front, 0x123456, 'front faller tilbake til tingens farge');
assert.equal(drawerSpec({ front: '#aabbcc', handle: '#112233', style: 'bar' }).handle, 0x112233);
assert.equal(drawerSpec({ style: 'rar' }).style, 'knob');
assert.ok(drawerSpec({}, 0xe8e2d2).lining < drawerSpec({}, 0xe8e2d2).front, 'innsiden er mørkere enn fronten');
assert.equal(shade(0xffffff, 0.5), 0x808080);

// geometri: åpen skuff har mer å se på enn lukket (dybde, innside), begge holder seg innenfor boksen (unntatt håndtaket)
const open = drawerParts(9, 3.6, 10.4, drawerSpec({ open: true })), closed = drawerParts(9, 3.2, 0.12, drawerSpec({ open: false }));
const roles = (p) => new Set(p.map((x) => x.role));
for (const r of ['front', 'fuge', 'side', 'lining', 'shadeIn', 'handle']) assert.ok(roles(open).has(r), `åpen skuff har ${r}`);
assert.ok(!roles(closed).has('lining') && !roles(closed).has('side'), 'lukket skuff har ingen innside');
assert.ok(roles(closed).has('fuge') && roles(closed).has('front') && roles(closed).has('handle'), 'lukket: flat front med fuge og håndtak');
for (const p of open) for (let i = 0; i < 3; i++) {
  if (p.role === 'handle' || p.role === 'panel') continue;
  const lim = [9, 3.6, 10.4][i] / 2 + 1e-6;
  assert.ok(Math.abs(p.c[i]) + p.s[i] / 2 <= lim, `åpen ${p.role} innenfor boksen (akse ${i})`);
}
// toppflaten (der man står) er øverst: ingen del av en åpen skuff stikker over boksen
assert.ok(Math.max(...open.map((p) => p.c[1] + p.s[1] / 2)) <= 1.8 + 1e-6, 'ingenting over klatreflata');
assert.ok(Math.max(...open.filter((p) => p.role === 'side').map((p) => p.c[1] + p.s[1] / 2)) > 1.79, 'kantene når toppflata');
const lin = open.find((p) => p.role === 'lining'); assert.ok(lin.c[1] + lin.s[1] / 2 < 1.8, 'innsiden er litt senket under kanten');
// handlestil
assert.ok(drawerParts(9, 3.6, 10.4, drawerSpec({ style: 'bar' })).filter((p) => p.role === 'handle').length > 2);
// buffere: én geometri, rimelig trekantbudsjett (én tegnekall per skuff)
const bo = partsBuffers(open), bc = partsBuffers(closed);
assert.equal(bo.pos.length, bo.nor.length); assert.equal(bo.pos.length, bo.col.length); assert.equal(bo.pos.length / 3 * 1.5, bo.idx.length);
assert.ok(bo.tris <= 200 && bc.tris <= 100, `trekanter: åpen ${bo.tris}, lukket ${bc.tris}`);
for (const n of [...bo.col, ...bc.col]) assert.ok(n >= 0 && n <= 1.0001);

// brettene: tilstanden kommer fra scenedata
{
  const s3 = sc('kjokken'), s6 = sc('kjokken2');
  const d3 = s3.objects.filter((o) => /^skuff_\d$/.test(o.id)), d6 = s6.objects.filter((o) => /^skuffront_\d$/.test(o.id));
  assert.equal(d3.length, 4); assert.equal(d6.length, 4);
  for (const o of d3) { assert.equal(o.kind, 'drawer'); assert.equal(o.drawer.open, true); assert.ok(!o.decor, 'åpne skuffer er klatreflater (kollisjon)'); }
  for (const o of d6) { assert.equal(o.kind, 'drawer'); assert.equal(o.drawer.open, false); assert.equal(o.decor, true, 'lukkede fronter er bare pynt'); }
  assert.ok(!s6.objects.some((o) => /^skuff_\d$/.test(o.id)), 'nivå 6 har ingen åpne skuffer');
  const l3 = drawerSummary(lv('kjokken')), l6 = drawerSummary(lv('kjokken2'));
  assert.deepEqual([l3.open, l3.closed], [4, 0]); assert.deepEqual([l6.open, l6.closed], [0, 4]);
  assert.ok(l3.fronts >= 3 && l6.fronts >= 3, 'litt fargevariasjon mellom skuffene (front)');
  assert.ok(l3.handles >= 2 && l6.handles >= 2, 'litt variasjon i håndtak');
  // alle andre brett uten skuffer er uberørt
  for (const n of ['bad', 'barnerom', 'bad2', 'barnerom2', 'leke']) assert.equal(drawerSummary(lv(n)).total, 0, n);
  // kollisjon og rute uendret: skuffetrappa er fortsatt de samme boksene (cm: bredde 45, topper 20/40/60/78, dybde 52/39/26/13)
  const want = { skuff_1: [20, 52], skuff_2: [40, 39], skuff_3: [60, 26], skuff_4: [78, 13] };   // [topp, dybde] i cm
  for (const [id, [top, depth]] of Object.entries(want)) {
    const b = lv('kjokken').boxes.find((x) => x.id === id), cm = (u) => Math.round(u * 5);
    assert.ok(b, id); assert.equal(cm(b.max[1]), top, `${id}: topp`); assert.equal(cm(b.max[2] - b.min[2]), depth, `${id}: dybde`); assert.equal(cm(b.max[0] - b.min[0]), 45, `${id}: bredde`);
  }
  assert.ok(lv('kjokken').route.slice(1, 5).every((w, i) => w.id === `skuff_${i + 1}`), 'ruta går fortsatt opp skuffene');
}
// av/på
setDrawerCue(false); assert.equal(drawerCue(), false); setDrawerCue(true); assert.equal(drawerCue(), true);
assert.equal(DRAWER_BASE.fuge < 0x303030, true, 'fugen er mørk');
console.log('OK test_drawers');
