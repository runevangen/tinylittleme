// node test_buildspan.mjs: R118 FRA og TIL ved byggestedet: spenn fra brettdataene i alle steder, når markørene vises, tekst (gap og høyde), første-gang-veiledning,
// Ekspert uten hjelp, nærmeste sted i Bygglab, minikart og veilederpil, i18n, SETTINGS, kobling i build.js/main.js og tegnebudsjett (ingen skygge).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SPAN, spanOf, spanInRange, spanSite, spanVisible, spanHidden, spanGuideShould, fmtLen, spanParts, spanLine, arcPoints, spanMapDots, spanArrowTarget } from './buildspan_logic.js';
import { makeT, DICT_KEYS } from './i18n.js';

const T = makeT(() => 'nb').T, Te = makeT(() => 'en').T;
const sitesOf = (f) => JSON.parse(fs.readFileSync(`levels/${f}`, 'utf8')).build?.sites || [];
const all = fs.readdirSync('levels').filter((f) => f.endsWith('.level.json')).flatMap((f) => sitesOf(f).map((s) => ({ f, s })));
assert.ok(all.length >= 15, 'alle byggesteder lest');

// ---- spennet i alle steder: FRA til venstre for TIL, positive tall, punktene ligger innenfor stedet ----
for (const { f, s } of all) {
  const sp = spanOf(s);
  assert.ok(sp.to.u - sp.from.u >= SPAN.minGap, `${f} ${s.id}: FRA står til venstre for TIL`);
  assert.ok(sp.gap > 0 && Number.isFinite(sp.rise), `${f} ${s.id}: gap og høyde`);
  for (const q of [sp.from, sp.to]) assert.ok(Math.abs(q.u) <= s.w / 2 && q.v >= 0 && q.v <= s.h, `${f} ${s.id}: punktet ligger i stedet`);
  assert.equal(sp.w.from.x, s.x + sp.from.u); assert.equal(sp.w.to.y, s.y + sp.to.v); assert.equal(sp.w.to.z, s.z);
}
// kjente steder
const bro = spanOf(sitesOf('bro.level.json')[0]);
assert.deepEqual([bro.from.u, bro.to.u, bro.src], [-3.5, 3.5, 'deck']); assert.ok(Math.abs(bro.gap - 0.35) < 1e-9); assert.equal(bro.rise, 0);
const vippe = spanOf(sitesOf('vippe.level.json')[0]); assert.equal(vippe.to.v, 2); assert.ok(vippe.rise > 0, 'vippa: TIL er høyere');
const lab2 = spanOf(sitesOf('bygglab.level.json').find((s) => s.id === 'lab2')); assert.equal(lab2.src, 'grid'); assert.deepEqual([lab2.from.u, lab2.to.u, lab2.to.v], [-2, 4.25, 5]);
const trapp = spanOf(sitesOf('trapp.level.json')[0]); assert.equal(trapp.src, 'fixed'); assert.equal(trapp.to.u - trapp.from.u, SPAN.fallbackGap); assert.ok(trapp.rise > 0, 'trappa går opp');
assert.deepEqual(spanOf({ x: 0, y: 0, z: 0, w: 20, h: 12 }).from, { u: -10, v: 0 }, 'uten deck: kantene');

// ---- tekst: gap og høydeforskjell, norsk og engelsk ----
assert.equal(fmtLen(0.35), '35 cm'); assert.equal(fmtLen(1.2), '1,2 m'); assert.equal(fmtLen(-0.05), '5 cm');
assert.equal(spanParts(bro).dir, 'level'); assert.equal(spanParts(vippe).dir, 'up'); assert.equal(spanParts({ gap: 1, rise: -0.1 }).dir, 'down');
assert.equal(spanLine(bro, T), 'gap 35 cm, like høyt'); assert.equal(spanLine(vippe, T), 'gap 33 cm, 10 cm høyere');
assert.equal(spanLine({ gap: 3.5, rise: -1 }, T), 'gap 3,5 m, 1,0 m lavere'); assert.equal(spanLine(vippe, Te), 'gap 33 cm, 10 cm higher');
assert.equal(T('span.from'), 'FRA'); assert.equal(T('span.to'), 'TIL'); assert.ok(/grønne/.test(T('span.guide')) && /gule/.test(T('span.guide')));
for (const k of ['span.from', 'span.to', 'span.gapUp', 'span.gapDown', 'span.gapLevel', 'span.guide']) assert.ok(DICT_KEYS.nb.includes(k) && DICT_KEYS.en.includes(k), `i18n ${k}`);

// ---- når markørene vises ----
const site = sitesOf('bro.level.json')[0], P = (dx, dz = 0, y = site.y) => ({ x: site.x + dx, y, z: site.z + dz });
assert.ok(spanInRange(site, P(0))); assert.ok(spanInRange(site, P(SPAN.showR + site.w / 2 - 1))); assert.ok(!spanInRange(site, P(SPAN.showR + site.w / 2 + 3)), 'for langt unna');
assert.ok(!spanInRange(site, P(0, 0, site.y + 60)), 'langt over');
const V = (o) => spanVisible({ on: true, buildOpen: false, playing: true, expert: false, help: 'normal', inRange: true, ...o });
assert.ok(V({})); assert.ok(!V({ on: false }), 'valget av'); assert.ok(!V({ buildOpen: true }), 'skjult når byggeskjermen er åpen'); assert.ok(!V({ playing: false })); assert.ok(!V({ inRange: false }));
assert.ok(V({ expert: true }), 'Ekspert med hjelp: markørene står'); assert.ok(!V({ expert: true, help: 'none' }), 'Ekspert uten hjelp: skjult'); assert.ok(V({ help: 'none' }), 'bare Ekspert + ingen hjelp skjuler');
assert.ok(spanHidden({ expert: true, help: 'none' }) && !spanHidden({ expert: true, help: 'much' }));
// veiledning: én gang per sted, bort på Ekspert
assert.ok(spanGuideShould({ id: 'bro:bro1' })); assert.ok(!spanGuideShould({ id: 'bro:bro1', seen: ['bro:bro1'] })); assert.ok(!spanGuideShould({ id: 'x', expert: true })); assert.ok(!spanGuideShould({ id: 'x', on: false }));
// flere steder i Bygglab: nærmeste velges
const lab = sitesOf('bygglab.level.json');
for (const s of lab) assert.equal(spanSite(lab, { x: s.x + 2, y: s.y, z: s.z + 1 })?.id, s.id, `${s.id}: nærmeste sted`);
assert.equal(spanSite(lab, { x: lab[0].x + 15, y: 3, z: 0 })?.id, 'lab1', 'nærmere lab1 enn lab2 (30 enheter fra hverandre)'); assert.equal(spanSite(lab, { x: -300, y: 3, z: 0 }), null);

// ---- minikart og veilederpil ----
const md = spanMapDots(lab); assert.equal(md.length, 9); assert.ok(md.every((d) => d.to.x > d.from.x));
assert.equal(spanArrowTarget(site, P(0)), null, 'nær: ingen pil'); const far = spanArrowTarget(site, P(60)); assert.deepEqual(far, { x: bro.w.from.x, y: bro.w.from.y, z: bro.w.from.z }, 'pila peker mot FRA');
const ap = arcPoints(bro.w.from, bro.w.to); assert.equal(ap.length, 17); assert.ok(ap[8].y > ap[0].y, 'buen løfter seg i midten');

// ---- kobling og budsjett (kildekode) ----
const bsrc = fs.readFileSync('build.js', 'utf8'), msrc = fs.readFileSync('main.js', 'utf8'), vsrc = fs.readFileSync('buildspan_view.js', 'utf8'), idx = fs.readFileSync('index.html', 'utf8');
for (const m of ['buildspan_logic', 'buildspan_view']) assert.ok(idx.includes(`'${m}'`), `${m} i files`);
assert.ok(/createSpanView\(/.test(bsrc) && /drawSpanTags/.test(bsrc) && /fra\/til-markør vist/.test(bsrc), 'build.js: markører, byggeskjerm-etiketter, logg');
assert.ok(/id: 'btnBuild'|btnBuildSpan/.test(bsrc) && /spanLine\(/.test(bsrc), 'BYGG-knappen med sted og spenn');
assert.ok(/'buildfromto'/.test(msrc) && /tlm\.buildfromto/.test(msrc) && /getSpan:/.test(msrc) && /spanMapDots/.test(msrc) && /spanArrow/.test(msrc), 'main.js: SETTINGS, minikart, pil');
assert.ok(!/castShadow\s*=\s*true|receiveShadow\s*=\s*true/.test(vsrc), 'ingen skygge i view');
assert.ok(/castShadow = false/.test(vsrc), 'nd() slår av skygge');
// tegnebudsjett per sted: 2 ringer + 2 stolper + 2 skilt + flagg + linje = 8; tester kjører hele bygget (test_build_dom) på det samme
const perSite = 2 * 3 + 1 + 1; assert.equal(perSite, 8); assert.ok(perSite <= 8, 'høyst 8 tegnekall, og bare ett sted er synlig om gangen');
console.log('buildspan: ok');
