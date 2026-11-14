// R49a2: byggefysikk 2: fagverk (trekanter), trykk mot strekk og ulike materialer. Akseptansetester fra statikk (a)-(g) + materialtabellen (build_materials.js).
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as BP from './build_phys.js';
import * as CP from './build_capacity.js';
import * as BM from './build_materials.js';
import * as BL from './build_logic.js';
import * as TR from './build_truss.js';
const P = (id, type, u, v, rot = 0) => ({ id, type, u, v, rot });
const hinge = (id, a, ax, ay, b, bx, by) => ({ id, kind: 'hinge', a, la: { x: ax, y: ay }, b, lb: { x: bx, y: by } });
const gpin = (id, a, ax, ay, u, v) => ({ id, kind: 'hinge', a, la: { x: ax, y: ay }, b: null, lb: null, g: { u, v } });
const site = { id: 's', w: 13, h: 14, deck: [{ u0: -9.5, u1: -2.5 }, { u0: 2.5, u1: 9.5 }] };   // gap 5 enheter

// byggere ----------------------------------------------------------------------------------------------------------------
const triangle = (rt = 'plank_s', L = 4, hs = 3, bt = 'plank_l') => {      // tre planker, tre ledd: base over gapet og to sperrer som møtes i toppen
  const rise = Math.sqrt(L * L - hs * hs), th = Math.atan2(rise, hs);
  return { placed: [P('b', bt, 0, 0.25), P('rl', rt, -hs / 2, 0.5 + rise / 2, th), P('rr', rt, hs / 2, 0.5 + rise / 2, -th)], links: [hinge('h1', 'b', -hs, 0.25, 'rl', -L / 2, 0), hinge('h2', 'b', hs, 0.25, 'rr', L / 2, 0), hinge('h3', 'rl', L / 2, 0, 'rr', -L / 2, 0)], rise, th };
};
const square = () => ({     // fire planker, fire ledd (parallellogram): står, men gir etter så snart det kommer last
  placed: [P('b', 'plank_l', 0, 0.25), P('sl', 'plank_s', -3, 2.75, Math.PI / 2), P('sr', 'plank_s', 3, 2.75, Math.PI / 2), P('t', 'plank_l', 0, 5)],
  links: [hinge('h1', 'b', -3, 0.25, 'sl', -2, 0), hinge('h2', 'b', 3, 0.25, 'sr', -2, 0), hinge('h3', 'sl', 2, 0, 't', -3, 0), hinge('h4', 'sr', 2, 0, 't', 3, 0)],
});
const withDiagonal = (q) => ({ placed: [...q.placed, P('d', 'plank_l', 0, 2.75, Math.atan2(4.5, 6))], links: [...q.links, hinge('h5', 'd', -4, 0, 'b', -3, 0.25), hinge('h6', 'd', 4, 0, 't', 3, -0.25)] });
const loadOn = (d, k, type = 'block') => { const top = CP.surfaceAt({ site, placed: d.placed }, 0); return { ...d, placed: [...d.placed, ...Array.from({ length: k }, (_, i) => P('_c' + i, type, 0, top + 0.77 + 1.5 * i))] }; };
const runHold = (d, secs = 3) => { const s = BP.createSim({ site, placed: d.placed, links: d.links }, { hold: true }); const ev = [], top = () => Math.max(...s.pose().parts.slice(0, d.n).map((p) => (p.kind === 'rect' ? p.v : Math.max(...p.pts.map((q) => q.v))))); let t0 = 0; for (let i = 0; i < secs * 60; i++) { s.step(); for (const e of s.drain()) if (e.type === 'break' || e.type === 'linkbreak') ev.push(e); if (i === 20) t0 = top(); } return { drop: t0 - top(), ev, sim: s }; };
const deflection = (d, k) => { const L = loadOn(d, k); return runHold({ ...L, n: d.placed.length }).drop; };

// 0) materialtabellen: alle delene har alle egenskapene, og R46-lekene er knyttet til den
{
  for (const id of Object.keys(BL.PART_TYPES)) { const M = BM.materialOf(id); assert.ok(BM.MATERIALS[id], `${id} står i tabellen`); for (const k of ['m', 'alpha', 'E', 'st', 'sc', 'brittle', 'duct', 'fric', 'axial']) assert.ok(Number.isFinite(M[k]), `${id}.${k}`); assert.ok(BM.density(id, BL.partType(id)) > 0); assert.equal(BP.MATERIAL[id], BM.MATERIALS[id], `${id}: fysikken bruker tabellen`); }
  for (const id of ['pencil', 'ruler', 'lego', 'book', 'sponge']) assert.equal(BP.MATERIAL[id].m, BM.MATERIALS[id].m, `${id} (R46) bruker tabellen`);
}

// a) trekant (3 planker, 3 ledd) bærer last over gapet og avbøyer minst 5× mindre enn firkant (4 planker, 4 ledd) som kollapser
{
  const tri = triangle(), sq = square(); const dt = deflection(tri, 2), dq = deflection(sq, 2);
  assert.ok(dq > 1.5, `firkanten kollapser (synker ${dq.toFixed(2)})`); assert.ok(dt * 5 <= dq, `trekanten avbøyer minst 5× mindre (${dt.toFixed(3)} mot ${dq.toFixed(2)})`);
  assert.ok(runHold({ ...loadOn(tri, 6), n: 3 }).ev.length === 0, 'trekanten bærer 6 klosser uten brudd');
  const base = CP.capacity({ site, placed: tri.placed, links: tri.links }); assert.ok(base.n >= 6, `Tåler-måleren: trekanten tåler ${base.n} klosser`); const cq = CP.capacity({ site, placed: square().placed, links: square().links }); assert.ok(cq.n <= 2, `firkanten tåler nesten ingenting (${cq.n})`);
}
// b) firkant + diagonal bærer
{
  const sq = square(), dg = withDiagonal(sq), dq = deflection(sq, 2), dd = deflection(dg, 2);
  assert.ok(dd * 5 <= dq, `diagonalen stiver av firkanten (${dd.toFixed(3)} mot ${dq.toFixed(2)})`); assert.ok(runHold({ ...loadOn(dg, 3), n: dg.placed.length }).ev.length === 0, 'firkant + diagonal bærer 3 klosser uten brudd');
}
// ledd er et ekte punktledd: en ledd-kjede av to planker kan svinge fritt rundt leddet, men tre i trekant ligger fast
{
  const free = { placed: [P('b', 'plank_l', 0, 0.25), P('r', 'plank_s', -1.5, 0.5 + 1.2, Math.atan2(2.4, 3))], links: [hinge('h', 'b', -3, 0.25, 'r', -2, 0)] };
  const r = runHold({ ...free, n: 2 }); assert.ok(r.drop > 0.3, `en enkelt sperre på ledd faller ned (${r.drop.toFixed(2)})`);
}
// c) slank del (blyant) knekker i trykk ved lavere last enn den ryker i strekk: samme lasten, samme geometri, bare speilvendt
{
  const L = 10, hs = 4, rise = Math.sqrt(L * L - hs * hs), th = Math.atan2(rise, hs), kinds = (r) => r.ev.map((e) => e.mode || e.kind);
  const aframe = { placed: [P('rl', 'ruler', -hs / 2, 0.5 + rise / 2, th), P('rr', 'ruler', hs / 2, 0.5 + rise / 2, -th), P('w', 'weight', 0, 0.5 + rise + 0.77)], links: [gpin('g1', 'rl', -L / 2, 0, -hs, 0.5), gpin('g2', 'rr', L / 2, 0, hs, 0.5), hinge('h3', 'rl', L / 2, 0, 'rr', -L / 2, 0), hinge('h4', 'rl', L / 2, 0, 'w', -0.5, -0.75)] };
  const top = 13.5, hang = { placed: [P('rl', 'ruler', -hs / 2, top - rise / 2, -th), P('rr', 'ruler', hs / 2, top - rise / 2, th), P('w', 'weight', 0, top - rise - 0.77)], links: [gpin('g1', 'rl', -L / 2, 0, -hs, top), gpin('g2', 'rr', L / 2, 0, hs, top), hinge('h3', 'rl', L / 2, 0, 'rr', -L / 2, 0), hinge('h4', 'rl', L / 2, 0, 'w', -0.5, 0.75)] };
  const A = runHold({ ...aframe, n: 3 }, 4), H = runHold({ ...hang, n: 3 }, 4);
  assert.ok(kinds(A).includes('buckle'), `rulerne i trykk knekker (${kinds(A).join(',')})`); assert.ok(!kinds(H).includes('tear') && H.ev.length === 0, `de samme rulerne i strekk med samme last holder (${kinds(H).join(',')})`);
  const cap = BM.capacities('ruler', BL.partType('ruler')), pen = BM.capacities('pencil', BL.partType('pencil')); assert.ok(cap.buckle < cap.tension / 5 && cap.slender, 'linjalen knekker ved en brøkdel av strekkgrensen'); assert.ok(pen.buckle < pen.tension && pen.slender, 'blyanten knekker i trykk før den ryker i strekk');
  const ev = A.ev.find((e) => e.mode === 'buckle'); assert.ok(ev.m > ev.cap && ev.cap === Math.round(BM.buckleLoad('ruler', 10, 0.4) * 10) / 10, 'knekkehendelsen har last og Euler-grense');
  assert.ok(BM.MATERIALS.rope === undefined && BM.BAND.K > 0, 'gummistrikk er en kobling, ikke en del');
}
// e) samme materiale i ulike lengder: lengre knekker tidligere (∝ 1/L²)
{
  const ratio = BM.buckleLoad('plank_s', 4, 0.5) / BM.buckleLoad('plank_s', 8, 0.5); assert.ok(Math.abs(ratio - 4) < 1e-9, 'Euler: dobbel lengde gir en fjerdedel');
  const frame = (type, L) => { const hs = L * 0.4, rise = Math.sqrt(L * L - hs * hs), th = Math.atan2(rise, hs); return { placed: [P('rl', type, -hs / 2, 0.5 + rise / 2, th), P('rr', type, hs / 2, 0.5 + rise / 2, -th), P('w', 'weight', 0, 0.5 + rise + 0.77), P('w2', 'weight', 0, 0.5 + rise + 2.27), P('w3', 'weight', 0, 0.5 + rise + 3.77)], links: [gpin('g1', 'rl', -L / 2, 0, -hs, 0.5), gpin('g2', 'rr', L / 2, 0, hs, 0.5), hinge('h3', 'rl', L / 2, 0, 'rr', -L / 2, 0), hinge('h4', 'rl', L / 2, 0, 'w', -0.5, -0.75)] }; };
  const short = runHold({ ...frame('plank_s', 4), n: 5 }, 4), long = runHold({ ...frame('plank_l', 8), n: 5 }, 4);
  assert.ok(!short.ev.some((e) => e.mode === 'buckle'), 'kort sperre holder lasten'); const lb = long.ev.find((e) => e.mode === 'buckle'); assert.ok(lb, 'samme last knekker den lange sperren');
  assert.ok(Math.abs(BM.buckleLoad('plank_l', 8, 0.5) * 4 - BM.buckleLoad('plank_s', 4, 0.5)) < 1e-6 && lb.cap === 1605.5, `knekkgrensen i hendelsen er Euler-lasten (${lb.cap})`);
}

// d) gummistrikk strekker seg mer enn tau og trekker seg tilbake
{
  const hangFrom = (kind, type = 'block') => ({ placed: [P('a', type, 0, 6)], links: [{ id: 'k', kind, a: 'a', la: { x: 0, y: 0 }, b: null, lb: null, g: { u: 0, v: 9 } }] });
  const trace = (d, secs = 5) => { const s = BP.createSim({ site, placed: d.placed, links: d.links }, { hold: true }); const vs = [], ev = []; for (let i = 0; i < secs * 60; i++) { s.step(); for (const e of s.drain()) if (e.type === 'linkbreak') ev.push(e); vs.push(s.pose().parts[0].v); } return { vs, ev, sim: s }; };
  const rope = trace(hangFrom('rope')), band = trace(hangFrom('band'));
  const stretch = (r) => 6 - Math.min(...r.vs), last = (r) => r.vs[r.vs.length - 1];
  assert.ok(stretch(band) > 3 * stretch(rope) && stretch(rope) < 0.5, `gummistrikk strekker seg mer (${stretch(band).toFixed(2)}) enn tau (${stretch(rope).toFixed(2)})`);
  assert.ok(band.ev.length === 0, 'en kloss henger i gummistrikket uten at det ryker');
  const lo = Math.min(...band.vs.slice(0, 120)), at = band.vs.indexOf(lo), up = Math.max(...band.vs.slice(at, at + 40)); assert.ok(up > lo + 0.5, `gummistrikket trekker klossen opp igjen etter at det er strukket (${lo.toFixed(2)} → ${up.toFixed(2)})`);
  assert.ok(Math.abs(last(band) - (9 - 3 - 288 / BM.BAND.K)) < 0.35, `ender i ro der kraft = K · utstrekning (${last(band).toFixed(2)})`);
  const w = trace(hangFrom('band', 'weight'), 2); assert.ok(w.ev.length > 0 && w.ev[0].kind === 'band', 'en vekt over grensen får gummistrikket til å ryke'); assert.ok(BL.LINK_KINDS.includes('band'), 'gummistrikk er en koblingstype i byggeskjermen');
  const B = BL.createBuild(site, {}, []); B.placed.push({ id: 'a', type: 'block', u: 0, v: 1, rot: 0 }); assert.ok(BL.addLink(B, 'band', 'a', null, { u: 5, v: 9 }).ok, 'gummistrikk kan festes hvor som helst');
}
// materialer: sprø klosser (bok, legoklosse) knuses av for stor trykkraft, svampen gir etter jevnt, linjalen bøyer seg før den brekker
{
  const stack = (type, k, strength = 1) => { const ty = BL.partType(type), placed = [P('s', type, 6, ty.h / 2)]; for (let i = 0; i < k; i++) placed.push(P('w' + i, 'weight', 6, ty.h + 0.77 + 1.5 * i)); const s = BP.createSim({ site, placed, links: [] }, { hold: true, strength }); const ev = []; let v0 = 0; for (let i = 0; i < 180; i++) { s.step(); for (const e of s.drain()) ev.push(e); if (i === 15) v0 = s.pose().parts[1].v; } return { ev, sag: v0 - s.pose().parts[1].v, pose: s.pose() }; };
  assert.equal(stack('book', 1).ev.filter((e) => e.type === 'break').length, 0, 'en bok tåler en vekt'); const sh = stack('book', 1, 0.15); const e1 = sh.ev.find((e) => e.mode === 'crush'); assert.ok(e1 && e1.m > e1.cap, 'sprø bok knuses ved for stor trykkraft'); assert.ok(sh.pose.parts[0].broken, 'knust del er merket som brutt');
  assert.ok(stack('lego', 1, 0.15).ev.some((e) => e.mode === 'crush'), 'legoklosse knuses også'); assert.ok(BM.MATERIALS.book.sc * 2 > BM.MATERIALS.pencil.sc * 0.4, 'bok tåler mer trykk enn blyant');
  const sp = stack('sponge', 1); assert.ok(sp.sag > 0.4 && !sp.ev.some((e) => e.type === 'break'), `svampen gir etter (${sp.sag.toFixed(2)}) uten å brekke`); assert.ok(stack('plank_s', 1).sag < 0.2, 'planken gir ikke etter');
  assert.ok(BM.MATERIALS.sponge.damp < 1 && BM.MATERIALS.sponge.brittle === 0 && BM.MATERIALS.ruler.duct > 0 && BM.MATERIALS.pencil.brittle === 1, 'sprøhet og seighet står i tabellen');
}
// hjelp: ledd som kan svinge (nullrommet), slanke deler
{
  const tri = triangle(), sq = square(), dg = withDiagonal(sq);
  assert.deepEqual(TR.floppyJoints(tri).joints, [], 'trekant: ingen ledd svinger'); assert.equal(TR.floppyJoints(sq).joints.length, 4, 'firkant: alle fire ledd kan svinge'); assert.deepEqual(TR.floppyJoints(dg).joints, [], 'firkant + diagonal: stiv');
  const sg = TR.floppyJoints(sq).suggest; assert.ok(sg && Math.hypot(sg.a.u - sg.b.u, sg.a.v - sg.b.v) > 4, 'foreslår en diagonal mellom to hjørner'); assert.equal(TR.floppyJoints({ placed: [], links: [] }).joints.length, 0);
  assert.equal(TR.floppyJoints({ placed: [P('a', 'plank_l', 0, 0), P('b', 'plank_l', 0, 0.5)], links: [{ id: 't', kind: 'tape', a: 'b', la: { x: 0, y: -0.25 }, b: 'a', lb: { x: 0, y: 0.25 } }] }).joints.length, 0, 'tape alene gir ingen svingende ledd');
  const pend = TR.floppyJoints({ placed: [P('a', 'plank_l', 0, 3)], links: [gpin('g', 'a', -4, 0, -4, 3)] }); assert.equal(pend.joints.length, 1, 'en planke festet med ett ledd mot underlaget svinger');
  assert.equal(TR.floppyJoints({ placed: [P('a', 'plank_l', 0, 3)], links: [gpin('g', 'a', -4, 0, -4, 3), gpin('g2', 'a', 4, 0, 4, 3)] }).joints.length, 0, 'to ledd mot underlaget holder planken');
  const sl = TR.slenderParts(triangle('pencil', 5, 3.5)); assert.ok(sl.some((s) => s.id === 'rl') && sl.every((s) => s.blocks < TR.SLENDER_BLOCKS), `blyantsperrer er slanke (${JSON.stringify(sl.map((s) => [s.id, s.blocks]))})`); assert.ok(!TR.slenderParts(tri).some((s) => s.id === 'rl'), 'korte planker er ikke slanke');
  assert.deepEqual(TR.slenderParts({ placed: [P('a', 'ruler', 0, 1)], links: [] }), [], 'løse deler uten kobling er ikke fagverksdeler');
  assert.equal(TR.trussHelp(sq, { on: false }).joints.length, 0); assert.equal(TR.helpKey(TR.trussHelp(sq)), 'build.help.floppy'); assert.equal(TR.helpKey(TR.trussHelp(tri)), null);
  assert.equal(JSON.stringify(TR.trussHelp(sq)), JSON.stringify(TR.trussHelp({ placed: [...sq.placed].reverse(), links: [...sq.links].reverse() })), 'uavhengig av rekkefølgen');
}
// f) determinisme: samme bygg gir samme resultat, også med knekking, gummistrikk og knusing
{
  const a = loadOn(triangle(), 3), b = { placed: [...square().placed, P('x', 'book', 6, 1), P('y', 'weight', 6, 3)], links: [...square().links, { id: 'bd', kind: 'band', a: 'b', la: { x: 0, y: 0 }, b: 'x', lb: { x: 0, y: 0 } }] };
  for (const d of [a, b, loadOn(triangle('pencil', 5, 3.5), 2, 'weight')]) { const r1 = BP.runSim({ site, placed: d.placed, links: d.links }), r2 = BP.runSim({ site, placed: d.placed, links: d.links }); assert.equal(JSON.stringify(r1), JSON.stringify(r2), 'identisk prøve');
    const s1 = BP.createSim({ site, placed: d.placed, links: d.links }), s2 = BP.createSim({ site, placed: [...d.placed].reverse(), links: [...d.links].reverse() }); for (let i = 0; i < 200; i++) { s1.step(); s2.step(); } assert.equal(JSON.stringify(s1.axial().map((x) => [x.id, +x.nc.toFixed(4), +x.nt.toFixed(4)]).sort()), JSON.stringify(s2.axial().map((x) => [x.id, +x.nc.toFixed(4), +x.nt.toFixed(4)]).sort()), 'samme krefter uansett rekkefølge'); }
}
// g) alle referansebygg i brettene vinner fortsatt, og målingen «Tåler» fungerer; ingen nivå er endret (walk_route er uendret)
for (const id of ['bro', 'trapp', 'kjokkenbro', 'vippe', 'leke', 'stue', 'verksted']) {
  const L = JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8')), st = L.build.sites[0];
  for (const ld of st.loads || [undefined]) { const r = BP.runSim({ site: st, placed: st.ref.placed, links: st.ref.links || [] }, ld ? { load: ld } : {}); assert.equal(r.result, 'won', `${id} ${ld || ''}: referansebygget klarer prøven`); assert.equal(r.breaks.length + r.linkBreaks.length, 0, `${id}: ingen brudd`); }
}
// h) tid per steg for et fagverk (3 planker, 3 ledd, last): ikke mer enn ca. 1,5× et vanlig bygg uten ledd (rå maskintid varierer, så grensen er romslig; tallet skrives ut)
{
  const ms = (d) => { let best = 1e9; for (let r = 0; r < 5; r++) { const s = BP.createSim({ site, placed: d.placed, links: d.links }, { hold: true }); const t0 = process.hrtime.bigint(); for (let i = 0; i < 300; i++) s.step(); best = Math.min(best, Number(process.hrtime.bigint() - t0) / 1e6 / 300); } return best; };
  const plain = { placed: [P('a', 'plank_l', 0, 0.25), P('b', 'plank_s', -1, 0.75), P('c', 'plank_s', 1, 0.75), P('w', 'block', 0, 1.75)], links: [] }, truss = loadOn(triangle(), 1);
  const a = ms(plain), b = ms(truss); console.log(`simuleringstid: ${b.toFixed(3)} ms/steg for fagverk, ${a.toFixed(3)} uten ledd (forholdet ${(b / a).toFixed(2)})`); assert.ok(b < a * 2.5 + 0.05, 'fagverk er ikke mye dyrere enn vanlig bygg');
}
console.log('bygg-fagverk-tester grønne');
