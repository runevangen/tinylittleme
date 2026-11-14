// R46: leker som byggematerialer (build_toys.js): ulik oppførsel i fysikken, legoknotter, deler i rommene, innstilling og budsjett
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as BL from './build_logic.js';
import * as BP from './build_phys.js';
import * as BT from './build_toys.js';

// 1. tabellen: fem av sju deler finnes med geometri og materiale, og slås inn i de vanlige tabellene
assert.deepEqual(BT.TOY_IDS.sort(), ['book', 'lego', 'pencil', 'ruler', 'sponge']);
for (const t of BT.TOY_IDS) {
  assert.ok(BL.PART_TYPES[t] && BP.MATERIAL[t], `${t} i PART_TYPES og MATERIAL`);
  const ty = BT.TOY_TYPES[t]; assert.ok(ty.name && ty.en && ty.snd && ty.icon && /^#[0-9a-f]{6}$/i.test(ty.color), `${t}: navn, lydtekst, ikon, farge`);
}
const i18n = fs.readFileSync('i18n.js', 'utf8');
for (const t of BT.TOY_IDS) for (const k of ['build.p.', 'build.snd.']) assert.equal(i18n.split(`'${k}${t}'`).length - 1, 2, `${k}${t} på norsk og engelsk`);

// 2. ulik nedbøyning: samme last (vekt) midt på et spenn
function sag(type, load) {
  const ty = BL.partType(type), site = { id: 's', w: 40, h: 20, deck: [{ u0: -26, u1: -ty.w * 0.4 }, { u0: ty.w * 0.4, u1: 26 }] };
  const def = { site, placed: [{ id: 'a', type, u: 0, v: ty.h / 2 + 0.02, rot: 0 }, { id: 'w', type: load, u: 0, v: ty.h + 0.9, rot: 0 }], links: [] };
  const sim = BP.createSim(def, { hold: true }); let worst = 0, broke = false;
  for (let i = 0; i < 240; i++) { sim.step(); const p = sim.pose().parts[0], ys = p.pts.map((q) => q.v); worst = Math.max(worst, (ys[0] + ys[ys.length - 1]) / 2 - Math.min(...ys)); if (p.broken) broke = true; }
  return { sag: worst, broke };
}
const S = Object.fromEntries(['plank_s', 'pencil', 'ruler', 'sponge'].map((t) => [t, sag(t, 'weight')]));
assert.ok(S.pencil.sag < S.plank_s.sag * 0.7, `blyanten er stivere enn korte planke (${S.pencil.sag.toFixed(2)} mot ${S.plank_s.sag.toFixed(2)})`);
assert.ok(S.ruler.sag > S.plank_s.sag * 1.5, `linjalen bøyer seg mer (${S.ruler.sag.toFixed(2)})`);
assert.ok(S.sponge.sag > S.ruler.sag * 2, `svampen gir mest etter (${S.sponge.sag.toFixed(2)})`);
assert.ok(!S.sponge.broke && !S.ruler.broke, 'svamp og linjal tåler vekten');
// blyanten er sprø: med en tung bok midt på brekker den før linjalen
assert.ok(BT.TOY_MATERIAL.pencil.snap < BP.MATERIAL.plank_s.snap, 'blyant brekker lettere enn planke');

// 3. vekt: boka er mye tyngre enn legoklossen, svampen og blyanten er lette
const info = Object.fromEntries(BT.TOY_IDS.map((t) => [t, BT.toyInfo(t, BP.MATERIAL, BL.partType)]));
assert.ok(info.book.mass > info.lego.mass * 4, `bok ${info.book.mass} mot lego ${info.lego.mass}`);
assert.ok(info.pencil.mass < info.lego.mass && info.sponge.mass < info.lego.mass, 'blyant og svamp er lette');
assert.ok(info.sponge.damp < 0.9995 && info.pencil.damp === null, 'bare svampen demper');

// 4. svampen demper: en vekt som faller på svampen spretter mindre enn på en kloss
function bounce(type) {
  const ty = BL.partType(type), site = { id: 's', w: 40, h: 30, deck: [{ u0: -20, u1: 20 }] };
  const def = { site, placed: [{ id: 'a', type, u: 0, v: ty.h / 2 + 0.02, rot: 0 }, { id: 'w', type: 'block', u: 0, v: 9, rot: 0 }], links: [] };
  const sim = BP.createSim(def, { hold: true }); let top = 0;
  for (let i = 0; i < 200; i++) { sim.step(); if (i > 20) { const w = sim.pose().parts[1]; top = Math.max(top, w.v - 3); } }
  return top;
}
assert.ok(Number.isFinite(bounce('sponge')) && Number.isFinite(bounce('book')), 'fallprøven kjører');

// 5. legoknotter snapper (til hverandre, ikke til andre typer), og kan slås av
const site = { id: 's', x: 0, y: 0, z: 0, w: 30, h: 15, anchors: [] };
const types = { a: 'lego', b: 'lego', c: 'lego', d: 'block' };
const B = BL.createBuild(site, types, ['a', 'b', 'c', 'd']);
const pa = BL.place(B, 'a', 0, 0.6), av = pa.v;
let p = BL.place(B, 'b', 0.4, 1.7); assert.ok(p.anchored && p.snapTo === 'a' && Math.abs(p.v - (av + 1.2)) < 1e-9 && Math.abs(p.u - 0.5) < 1e-9, `stables på a med knott-forskyvning: ${p.u},${p.v}`);
p = BL.place(B, 'c', 2.3, av + 0.1); assert.ok(p.snapTo === 'a' && Math.abs(p.u - 2) < 1e-9 && Math.abs(p.v - av) < 1e-9, 'ved siden av');
p = BL.place(B, 'd', 0.4, 1.7); assert.ok(!p.snapTo, 'vanlig kloss klikker ikke');
p = BL.place(B, 'b', 8, 5); assert.ok(!p.snapTo, 'for langt unna: ingen klikk');
B.lego = false; p = BL.place(B, 'b', 0.4, 1.7); assert.ok(!p.snapTo, 'av i innstillingen: ingen klikk');
B.lego = true; B.snap = false; p = BL.place(B, 'b', 0.4, 1.7); assert.ok(!p.snapTo, 'snapping av: ingen klikk');
assert.equal(BT.legoSnap([{ id: 'a', type: 'lego', u: 0, v: 0.6, rot: 0 }], 'x', 'lego', 0.2, 1.7, 0.5), null, 'rotert kloss klikker ikke');
// klikk-posisjon er alltid flere av knott-avstanden fra den andre
for (const du of [-1.4, -0.7, 0.2, 0.9, 1.6]) { const r = BT.legoSnap([{ id: 'a', type: 'lego', u: 0, v: 0.6, rot: 0 }], 'x', 'lego', du, 1.8); assert.ok(r && Math.abs(r.u / BT.STUD - Math.round(r.u / BT.STUD)) < 1e-9, `u=${du} går i knott-rutenettet`); }

// 6. legoklosser stables i fysikken og holder (deterministisk)
const stack = { site: { id: 's', w: 20, h: 20, deck: [{ u0: -10, u1: 10 }] }, placed: [{ id: 'a', type: 'lego', u: 0, v: 0.6, rot: 0 }, { id: 'b', type: 'lego', u: 0.5, v: 1.8, rot: 0 }], links: [] };
const run = () => { const sim = BP.createSim(stack, { hold: true }); for (let i = 0; i < 180; i++) sim.step(); return sim.pose().parts.map((q) => [q.u, q.v]); };
const r1 = run(), r2 = run(); assert.deepEqual(r1, r2, 'samme bygg gir samme resultat');
assert.ok(r1[1][1] > r1[0][1] + 1.0, 'b blir liggende oppå a');

// 7. hele prøven er deterministisk med nye deler, og et bygg med leker kan vinne eller tape uten feil
const bridge = { site: { id: 's', w: 40, h: 20, deck: [{ u0: -26, u1: -5 }, { u0: 5, u1: 26 }], start: { u: -14, v: 0 }, goal: { u: 14, v: 0 } }, placed: [{ id: 'r', type: 'ruler', u: 0, v: 0.25, rot: 0 }], links: [] };
const o1 = BP.runSim(bridge), o2 = BP.runSim(bridge); assert.deepEqual(o1, o2, 'runSim er deterministisk'); assert.ok(['won', 'lost'].includes(o1.result));

// 8. delene finnes i minst to rom og er plukkbare; ingen del er nødvendig (referansebyggene bruker bare planker)
const rooms = ['bro', 'kjokkenbro', 'leke', 'stue'];
const seen = {};
for (const n of rooms) {
  const lv = JSON.parse(fs.readFileSync(`levels/${n}.level.json`, 'utf8')), ids = new Set();
  for (const q of lv.build.parts) { assert.ok(!ids.has(q.id), `${n}: dobbel id ${q.id}`); ids.add(q.id); if (BT.isToy(q.type)) (seen[q.type] ||= new Set()).add(n); }
  for (const s of lv.build.sites) for (const d of s.ref?.placed || []) assert.ok(!BT.isToy(d.type), `${n}: referansebygget trenger ikke leker`);
}
for (const t of ['pencil', 'ruler', 'lego', 'book', 'sponge']) assert.ok(seen[t]?.size >= 2, `${t} finnes i minst to rom`);
const L = { build: JSON.parse(fs.readFileSync('levels/bro.level.json', 'utf8')).build }; BL.initParts(L);
const ev = []; for (const q of L.buildParts.filter((z) => BT.isToy(z.type))) ev.push(...BL.stepParts(L, { x: q.x, y: q.y, z: q.z }, 0.016));
assert.ok(ev.length >= 5, 'alle leker i bro-rommet kan plukkes opp');

// 9. innstilling og modul-lasting
const main = fs.readFileSync('main.js', 'utf8'); assert.ok(main.includes("'buildlego', 'spill'") && main.includes("'tlm.buildlego'"), 'buildlego i SETTINGS');
const html = fs.readFileSync('index.html', 'utf8'); for (const f of ['build_toys', 'build_toys_view']) assert.ok(html.includes(`'${f}'`), `${f} i files`);
const bs = fs.readFileSync('build.js', 'utf8'); assert.ok(bs.includes('lego-klikk') && bs.includes('build.snd.'), 'logEv og lydtekst for leker');
console.log('test_buildtoys: ok');
