// R49a1: byggefysikk etter statikk. Bruddgrensen er bøyemoment (ikke vinkel), og «Tåler X»-måleren (build_capacity.js) viser det.
// Sju akseptansetester fra statikk (lastfordeling, lagdeling med teip, støtte, profil, rekkefølge, determinisme, referansebygg) + måling av simuleringstid.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as BP from './build_phys.js';
import * as CP from './build_capacity.js';
import * as BL from './build_logic.js';
const P = (id, type, u, v, rot = 0) => ({ id, type, u, v, rot });
const wide = { id: 'w', w: 13, h: 8, deck: [{ u0: -9.5, u1: -3.5 }, { u0: 3.5, u1: 9.5 }] };            // gap 7 enheter
const pier = { id: 'p', w: 13, h: 8, deck: [{ u0: -9.5, u1: -3.5 }, { u0: -0.5, u1: 0.5 }, { u0: 3.5, u1: 9.5 }] };   // med en støtte (pilar) midt i gapet
const tape = (id, a, b, x) => ({ id, kind: 'tape', a, la: { x, y: -0.25 }, b, lb: { x, y: 0.25 } });         // a ligger oppå b
const cap = (site, placed, links = [], o = {}) => CP.capacity({ site, placed, links }, o);
const plank = [P('a', 'plank_l', 0, 0)];

// 0) selve målingen: ren funksjon, tom bygg = 0, monotont og med tak
assert.equal(cap(wide, []).n, 0, 'ingenting bygd: tåler ingenting');
const base = cap(wide, plank); assert.ok(base.n >= 2 && base.n <= 5, `én lang planke tåler noen få klosser (${base.n})`); assert.ok(base.sims <= 6, `halveringssøk: ${base.sims} simuleringer`);
assert.ok(CP.holds({ site: wide, placed: plank, links: [] }, base.n) && !CP.holds({ site: wide, placed: plank, links: [] }, base.n + 1), 'n holder, n+1 holder ikke');
assert.equal(CP.gapCenter(wide), 0, 'midt i gapet'); assert.equal(CP.gapCenter(pier), -2, 'midt i det bredeste gapet (venstre)');
assert.equal(cap(wide, [P('a', 'plank_s', 0, 0)]).n, 0, 'en planke som ikke når over gapet bærer ingenting midt på');

// 1) last nær opplager tåler minst like mye som midt på, og aldri mindre jo nærmere kanten (monotont)
{
  const at = (u) => cap(wide, plank, [], { u }).n, mid = at(0), seq = [0, 0.8, 1.6, 2.4, 3.0].map(at);
  for (let i = 1; i < seq.length; i++) assert.ok(seq[i] >= seq[i - 1], `monotont mot opplager: ${seq.join(',')}`);
  assert.ok(at(2.4) >= mid, 'nær opplager minst like mye som midt på'); assert.ok(seq[4] > mid, `ved opplager tåler den mer (${seq[4]} mot ${mid})`);
}
// 1b) bruddet sitter der momentet er størst: midt i gapet for en last midt på
{
  const r = BP.runSim({ site: wide, placed: [...plank, P('w', 'weight', 0, 1.25)], links: [] }); assert.equal(r.breaks.length >= 1, true); assert.ok(Math.abs(r.breaks[0].u) < 1.5, `brudd midt på (u=${r.breaks[0].u.toFixed(2)})`);
  const e = BP.createSim({ site: wide, placed: [...plank, P('w', 'weight', 0, 1.25)], links: [] }); let ev; for (let i = 0; i < 300 && !ev; i++) { e.step(); ev = e.drain().find((x) => x.type === 'break'); } assert.ok(ev.m > ev.cap, 'bruddhendelsen har moment og kapasitet (til logg)');
}
// 2) to like planker teipet på tre steder tåler minst 3× én; teip på ett sted mindre enn tre; uten teip bare lagt oppå hverandre mindre enn med tre
{
  const two = [P('a', 'plank_l', 0, 0), P('b', 'plank_l', 0, 0.5)], t3 = [tape('k1', 'b', 'a', 0), tape('k2', 'b', 'a', -3), tape('k3', 'b', 'a', 3)];
  const n3 = cap(wide, two, t3).n, n1 = cap(wide, two, [tape('k1', 'b', 'a', 0)]).n, n0 = cap(wide, two).n;
  assert.ok(n3 >= 3 * base.n, `teip på tre steder: ${n3} ≥ 3 × ${base.n}`); assert.ok(n1 < n3, `teip på ett sted (${n1}) tåler mindre enn på tre (${n3})`); assert.ok(n0 < n3 && n0 >= base.n, `uten teip ${n0}`);
  const sim = BP.createSim({ site: wide, placed: two, links: t3 }); const m = sim.moments(); assert.ok(m.every((x) => x.comp > 0.7), 'tre tapepunkter gir høy sammensatt virkning (γ)'); assert.ok(BP.createSim({ site: wide, placed: two, links: [tape('k1', 'b', 'a', 0)] }).moments()[0].comp < m[0].comp);
}
// 3) en støtte midt under planken gir minst 2× tåleevne
{ const n = cap(pier, plank, [], { u: 0 }).n; assert.ok(n >= 2 * base.n, `med støtte ${n} ≥ 2 × ${base.n}`); }
// 4) en høy bjelke (profil: planke på høykant) tåler minst 3× en flat av samme lengde, og er stivere
{
  const tall = cap(wide, [P('a', 'plank_t', 0, 0.6)]).n; assert.ok(tall >= 3 * base.n, `høykant ${tall} ≥ 3 × ${base.n}`);
  assert.equal(BL.partType('plank_t').w, BL.partType('plank_l').w, 'samme lengde'); assert.ok(BP.MATERIAL.plank_t.mcap > 3 * BP.MATERIAL.plank_l.mcap, 'kapasitet ∝ dybde²'); assert.ok(BP.MATERIAL.plank_t.alpha > 5 * BP.MATERIAL.plank_l.alpha, 'stivhet ∝ dybde³');
  const sag = (type, v) => { const s = BP.createSim({ site: wide, placed: [P('a', type, 0, v), P('b', 'block', 0, v + 1.4)], links: [] }, { strength: 1e6, hold: true }); let w = 0; for (let i = 0; i < 180; i++) { s.step(); const y = s.pose().parts[0].pts.map((q) => q.v); w = Math.max(w, (y[0] + y[y.length - 1]) / 2 - Math.min(...y)); } return w; };
  assert.ok(sag('plank_t', 0.6) < sag('plank_l', 0.25) / 2, 'høykant bøyer seg mye mindre');
}
// 5) kapasitet er uavhengig av rekkefølgen delene ble plassert i (og av id-ene)
{
  const parts = [P('a', 'plank_l', 0, 0), P('b', 'plank_l', 0, 0.5), P('c', 'block', -2.5, 1.75), P('d', 'block', 2.5, 1.75)], links = [tape('k1', 'b', 'a', -3), tape('k2', 'b', 'a', 3)];
  const ref = cap(wide, parts, links), rev = cap(wide, [...parts].reverse(), [...links].reverse());
  const ren = parts.map((p, i) => ({ ...p, id: 'z' + (9 - i) })), map = Object.fromEntries(parts.map((p, i) => [p.id, 'z' + (9 - i)]));
  const ren2 = cap(wide, ren, links.map((l) => ({ ...l, a: map[l.a], b: map[l.b] })));
  assert.equal(rev.n, ref.n, 'omvendt rekkefølge'); assert.equal(ren2.n, ref.n, 'andre id-er');
  const mid = (arr) => JSON.stringify(arr.map((x) => [+x.m.toFixed(6), +x.cap.toFixed(6)]).sort()); const run = (pl, lk) => { const s = BP.createSim({ site: wide, placed: pl, links: lk }, { hold: true }); for (let i = 0; i < 120; i++) s.step(); return mid(s.moments()); };
  assert.equal(run([...parts].reverse(), [...links].reverse()), run(parts, links), 'identisk moment i bitene uansett rekkefølge');
  // pose() og breaks() følger fortsatt plasseringsrekkefølgen (tester og visning)
  const s2 = BP.createSim({ site: wide, placed: parts, links }); assert.deepEqual(s2.pose().parts.map((p) => p.id), ['a', 'b', 'c', 'd']);
}
// 6) determinisme: samme bygg to ganger gir identisk resultat (kapasitet, prøve, posisjoner, moment)
{
  const b = [P('a', 'plank_l', 0, 0), P('b', 'plank_l', 0, 0.5), P('w', 'weight', 1, 1.75)], l = [tape('k1', 'b', 'a', 3)];
  assert.equal(JSON.stringify(cap(wide, b, l)), JSON.stringify(cap(wide, b, l))); assert.equal(JSON.stringify(BP.runSim({ site: wide, placed: b, links: l })), JSON.stringify(BP.runSim({ site: wide, placed: b, links: l })));
  const a = BP.createSim({ site: wide, placed: b, links: l }), c = BP.createSim({ site: wide, placed: b, links: l }); for (let i = 0; i < 200; i++) { a.step(); c.step(); } assert.equal(JSON.stringify([a.pose(), a.moments()]), JSON.stringify([c.pose(), c.moments()]));
}
// 7) referansebyggene i brettene er fortsatt gyldige løsninger (bro, trapp, kjøkkenbro, vippe, leke), også med målt tåleevne > 0 der det er en planke
for (const id of ['bro', 'trapp', 'kjokkenbro', 'vippe', 'leke', 'stue', 'verksted']) {
  const L = JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8')), site = L.build.sites[0], loads = site.loads || [undefined];
  for (const ld of loads) { const r = BP.runSim({ site, placed: site.ref.placed, links: site.ref.links || [] }, ld ? { load: ld } : {}); assert.equal(r.result, 'won', `${id} ${ld || ''}: referansebygget klarer prøven (${r.reason})`); assert.equal(r.breaks.length + r.linkBreaks.length, 0, `${id}: ingenting brekker`); }
  const c = CP.capacity({ site, placed: site.ref.placed, links: site.ref.links || [] }); assert.ok(c.n >= 0 && c.n <= CP.CAP_MAX);
}
// 8) tid per simuleringssteg: ikke mer enn ca. 1,5× før R49a1 (0,31 ms for referansebygget under; med margin for tregere maskiner brukes en romslig grense her, tallet skrives ut til rapporten)
{
  const placed = [P('a', 'plank_l', 0, 0), P('b', 'plank_l', 0, 0.5), P('c', 'block', 0, 1.75), P('d', 'block', 1.5, 1.75), P('e', 'block', -1.5, 1.75), P('f', 'plank_s', -6, 0.25)], links = [tape('k1', 'b', 'a', 0)];
  let best = 1e9; for (let r = 0; r < 5; r++) { const s = BP.createSim({ site: wide, placed, links }, { hold: true }); const t0 = process.hrtime.bigint(); for (let i = 0; i < 300; i++) s.step(); best = Math.min(best, Number(process.hrtime.bigint() - t0) / 1e6 / 300); }
  console.log(`simuleringstid: ${best.toFixed(3)} ms/steg (før R49a1: 0.310)`); assert.ok(best < 0.6, 'under ca. 2× før (rå maskintid varierer)');
}
console.log('bygg-statikk-tester grønne');
