// R24: byggeskjermen, ren logikk (build_logic.js): snapping, rotasjon, angre/nullstill, lagring, inn/ut av modus, deler i verdenen
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as BL from './build_logic.js';
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const site = { id: 's', x: 0, y: 2, z: 0, w: 11, h: 8, anchors: [{ u: -1.5, v: 0 }, { u: 1.5, v: 0 }] };
const types = { a: 'plank_s', b: 'plank_l', c: 'block' };

// snapping
let s = BL.snapPoint(site, 1.3, 0.2); assert.ok(s.anchored && s.u === 1.5 && s.v === 0, 'snapper til festepunkt i nærheten');
s = BL.snapPoint(site, 3.26, 2.74); assert.ok(!s.anchored && near(s.u, 3.5) && near(s.v, 2.5), 'ellers til rutenett (0,5)');
s = BL.snapPoint(site, 3.26, 2.74, { snap: false }); assert.ok(near(s.u, 3.26) && near(s.v, 2.74), 'snapping av: fri plassering');
s = BL.snapPoint(site, 99, -5); assert.ok(near(s.u, 5.5) && s.v === 0, 'holdes innenfor byggestedet');
assert.ok(near(BL.snapRot(0.3), Math.PI / 12 * 1) || near(BL.snapRot(0.3), Math.PI / 6 * 0 + Math.round(0.3 / BL.ROT_STEP) * BL.ROT_STEP), 'rotasjon i trinn');
assert.ok(near(BL.normRot(Math.PI * 3), Math.PI) || near(BL.normRot(Math.PI * 3), -Math.PI + 0) || Math.abs(BL.normRot(Math.PI * 3)) <= Math.PI + 1e-9, 'rotasjon normaliseres');

// plassere, flytte, rotere, fjerne
const B = BL.createBuild(site, types, ['a', 'b']);
assert.equal(BL.inTray(B).length, 2);
assert.equal(BL.place(B, 'z', 0, 0), null, 'ikke plukket del kan ikke plasseres');
const p = BL.place(B, 'a', 1.4, 0.1); assert.ok(p.anchored && B.placed.length === 1 && BL.inTray(B).length === 1);
BL.place(B, 'a', 0, 3.1); assert.equal(B.placed.length, 1, 'flytting lager ikke en kopi'); assert.ok(near(B.placed[0].v, 3));
BL.rotate(B, 'a', BL.ROT_STEP * 2); assert.ok(near(B.placed[0].rot, BL.ROT_STEP * 2), 'roter to trinn');
assert.ok(BL.hitPart(B.placed[0], 0, 3), 'treff midt i delen'); assert.ok(!BL.hitPart(B.placed[0], 5, 6), 'bom');
assert.equal(BL.corners(B.placed[0]).length, 4);

// angre og nullstill
BL.place(B, 'b', -3, 1); assert.equal(B.placed.length, 2);
assert.ok(BL.undo(B) && B.placed.length === 1, 'angre fjerner siste plassering');
assert.ok(BL.undo(B) && near(B.placed[0].rot, 0), 'angre tilbake gjennom rotasjonen');
assert.ok(BL.undo(B) && near(B.placed[0].v, 0), 'angre tilbake til første plassering');
assert.ok(BL.undo(B) && B.placed.length === 0, 'angre helt tilbake'); assert.ok(!BL.undo(B), 'ingenting mer å angre');
BL.place(B, 'a', 0, 2); BL.place(B, 'b', 2, 2); assert.ok(BL.reset(B) && B.placed.length === 0 && BL.inTray(B).length === 2, 'nullstill legger alt tilbake i brettet');
assert.ok(BL.undo(B) && B.placed.length === 2, 'nullstill kan angres'); assert.ok(BL.remove(B, 'a') && BL.inTray(B).includes('a'), 'fjern tilbake til brettet');

// lagring og gjenoppretting; ukjente deler ignoreres
const data = JSON.parse(JSON.stringify(BL.serialize(B)));
const B2 = BL.createBuild(site, types, []); BL.restore(B2, { ...data, have: [...data.have, 'ukjent'], placed: [...data.placed, { id: 'ukjent', u: 0, v: 0, rot: 0 }] });
assert.deepEqual(BL.serialize(B2), data, 'samme bygg etter gjenoppretting'); assert.ok(!B2.have.includes('ukjent'));
BL.restore(B2, null); assert.equal(B2.have.length, 0);

// R25: koblinger (tape, ledd, tau): lages mellom plasserte deler, følger delene, angres, lagres
const BK = BL.createBuild(site, { a: 'plank_s', b: 'block', w: 'weight' }, ['a', 'b', 'w']); BK.snap = false;
assert.ok(BL.PART_TYPES.weight && BL.LINK_KINDS.join() === 'tape,hinge,rope,band')   // R49a2: gummistrikk lagt til sist (kodeformatet er uendret for gamle koder);
assert.ok(!BL.addLink(BK, 'tape', 'a', 'b').ok, 'delene må være plassert');
BL.place(BK, 'a', 0, 0.25, 0); BL.place(BK, 'b', 0, 1.25, 0); BL.place(BK, 'w', 8, 3, 0);
assert.equal(BL.addLink(BK, 'tape', 'a', 'b').ok, true, 'tape mellom deler som ligger inntil hverandre');
assert.equal(BL.addLink(BK, 'tape', 'a', 'b').why, 'dup', 'ikke to like koblinger'); assert.equal(BL.addLink(BK, 'tape', 'a', 'w').why, 'far', 'tape krever at delene berører hverandre');
assert.ok(BL.addLink(BK, 'rope', 'a', 'w').ok, 'tau kan gå over avstand'); assert.ok(BL.addLink(BK, 'hinge', 'b', null, { u: 0.2, v: 2.2 }).ok, 'ledd i underlaget ved delen');
assert.equal(BL.addLink(BK, 'tape', 'a', null, { u: 9, v: 9 }).why, 'far', 'tape i underlaget krever at punktet er ved delen'); assert.equal(BK.links.length, 3);
const e0 = BL.linkEnds(BK, BK.links[0]); BL.place(BK, 'b', 1, 1.25, 0); const e1 = BL.linkEnds(BK, BK.links[0]); assert.ok(near(e1[1].u - e0[1].u, 1), 'festepunktet følger delen når den flyttes');
assert.equal(BL.topLink(BK, e1[0].u, e1[0].v).id, BK.links[0].id, 'treff på kobling');
const ser = JSON.parse(JSON.stringify(BL.serialize(BK))); const BK2 = BL.createBuild(site, { a: 'plank_s', b: 'block', w: 'weight' }, []); BL.restore(BK2, ser); assert.deepEqual(BL.serialize(BK2), ser, 'koblinger overlever lagring');
BL.restore(BK2, { ...ser, links: [...ser.links, { id: 'x', kind: 'tape', a: 'nope', la: { x: 0, y: 0 }, b: null, g: { u: 0, v: 0 } }, { id: 'y', kind: 'laser', a: 'a', la: { x: 0, y: 0 }, b: null, g: { u: 0, v: 0 } }] }); assert.equal(BK2.links.length, 3, 'ukjente koblinger ignoreres');
BL.remove(BK, 'b'); assert.ok(BK.links.every((l) => l.a !== 'b' && l.b !== 'b'), 'koblinger til en fjernet del forsvinner'); assert.equal(BK.links.length, 1);
assert.ok(BL.undo(BK) && BK.links.length === 3, 'angre henter tilbake koblingene'); assert.ok(BL.removeLink(BK, BK.links[0].id) && BK.links.length === 2); assert.ok(BL.reset(BK) && BK.links.length === 0 && BK.placed.length === 0, 'nullstill fjerner også koblinger');

// kamera
const view = BL.fitView(site, 390, 844, 24, 130, 160); const sc = BL.toScreen(view, 390, 844, 1, 2), w = BL.toWorld(view, 390, 844, sc.x, sc.y);
assert.ok(near(w.u, 1, 1e-9) && near(w.v, 2, 1e-9), 'skjerm og verden går begge veier');
assert.ok(view.scale * site.w <= 390, 'hele stedet er med i bildet på iPhone');
assert.ok(BL.clampScale(1000) <= 240 && BL.clampScale(0) >= 6);
assert.ok(near(BL.twistRot(0.1, 0.2, 0.5), 0.4), 'to-fingers vri');

// inn og ut av modus
const okIn = { play: true, won: false, menu: false, boss: false, ov: false, onGround: true };
assert.ok(BL.canEnterBuild(okIn));
for (const k of ['won', 'menu', 'boss', 'ov']) assert.ok(!BL.canEnterBuild({ ...okIn, [k]: true }), `ikke inn mens ${k}`);
assert.ok(!BL.canEnterBuild({ ...okIn, onGround: false }) && !BL.canEnterBuild({ ...okIn, play: false }));
assert.ok(BL.nearSite(site, { x: 3, y: 2, z: 2 }) && !BL.nearSite(site, { x: 40, y: 2, z: 0 }) && !BL.nearSite(site, { x: 0, y: 60, z: 0 }));
assert.equal(BL.nearestSite([site], { x: 1, y: 2, z: 1 }).id, 's');

// deler i verdenen
const L = { build: { sites: [site], parts: [{ id: 'a', type: 'plank_s', x: 10, y: 1, z: 0 }, { id: 'b', type: 'plank_l', x: 30, y: 1, z: 0 }] } };
BL.initParts(L); assert.equal(L.buildParts.length, 2); assert.deepEqual(BL.partTypes(L), { a: 'plank_s', b: 'plank_l' });
assert.equal(BL.stepParts(L, { x: 0, y: 0, z: 0 }, 0.1).length, 0, 'for langt unna');
const ev = BL.stepParts(L, { x: 10.5, y: 0, z: 0 }, 0.1); assert.equal(ev.length, 1); assert.equal(ev[0].id, 'a');
assert.equal(BL.stepParts(L, { x: 10.5, y: 0, z: 0 }, 0.1).length, 0, 'tas bare én gang');
assert.equal(BL.stepParts(L, { x: 30, y: 0, z: 0 }, 0.1, false).length, 0, 'inaktiv: ingenting plukkes');
assert.deepEqual(BL.gotPartIds(L), ['a']); BL.restoreParts(L, ['b']); assert.deepEqual(BL.gotPartIds(L), ['b']);

// brettene: gyldige byggesteder og deler, og ruta (walk_route) er urørt av dem
for (const f of fs.readdirSync('levels')) {
  const lv = JSON.parse(fs.readFileSync(`levels/${f}`, 'utf8')); if (!lv.build) continue;
  const ids = new Set();
  for (const q of lv.build.parts) { assert.ok(BL.PART_TYPES[q.type], `${f}: ukjent deltype ${q.type}`); assert.ok(!ids.has(q.id), `${f}: dobbel id ${q.id}`); ids.add(q.id); }
  for (const st of lv.build.sites) for (const a of BL.siteAnchors(st)) assert.ok(Math.abs(a.u) <= st.w / 2 && a.v >= 0 && a.v <= st.h, `${f}: festepunkt utenfor ${st.id}`);
  assert.ok(lv.build.parts.length >= 2 && lv.build.sites.length >= 1, `${f}: bygg trenger sted og deler`);
}
// modulene er med i index.html
const html = fs.readFileSync('index.html', 'utf8'); for (const m of ['build', 'build_logic', 'build_zoom', 'build_phys', 'build_stress']) assert.ok(html.includes(`'${m}'`), `${m} mangler i files`);
console.log('bygg-tester grønne');
