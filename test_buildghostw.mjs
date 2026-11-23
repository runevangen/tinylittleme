// node test_buildghostw.mjs: R132 spøkelsesbro i verden og oppdragskort: type per sted, geometri innenfor FRA-TIL, farger, når det vises, kort-tekst (norsk/engelsk, knappenavn),
// krymping etter første BYGG, i18n, SETTINGS, kobling i build.js/main.js, tegnebudsjett (ingen skygge), paritet Hyllebroen/Bygglab (delt kode).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GHOST, ghostKind, ghostSlabs, ghostBuffers, ghostWorldVisible, ghostCard, loadsText, loadIds, cardCompact, cardMark } from './buildghostw_logic.js';
import { spanOf, SPAN } from './buildspan_logic.js';
import { makeT, DICT_KEYS } from './i18n.js';

const T = makeT(() => 'nb').T, Te = makeT(() => 'en').T;
const sitesOf = (f) => JSON.parse(fs.readFileSync(`levels/${f}`, 'utf8')).build?.sites || [];
const all = fs.readdirSync('levels').filter((f) => f.endsWith('.level.json')).flatMap((f) => sitesOf(f).map((s) => ({ f, s })));
assert.ok(all.length >= 15);

// type per kjent sted
const by = (f, id) => sitesOf(f).find((s) => s.id === id);
assert.equal(ghostKind(by('bro.level.json', 'bro1')), 'bridge'); assert.equal(ghostKind(by('badebro.level.json', 'bad1')), 'bridge');
assert.equal(ghostKind(by('trapp.level.json', 'trapp1')), 'stairs'); assert.equal(ghostKind(by('bygglab.level.json', 'lab2')), 'stairs'); assert.equal(ghostKind(by('trapp2.level.json', 'trapp2a')), 'stairs');
assert.equal(ghostKind(by('vippe.level.json', 'vippe1')), 'seesaw'); assert.equal(ghostKind(by('bygglab.level.json', 'lab3')), 'seesaw'); assert.equal(ghostKind(by('vippe2.level.json', 'vippe2a')), 'seesaw');
assert.equal(ghostKind(by('bygglab.level.json', 'lab1')), 'bridge'); assert.equal(ghostKind({}), 'bridge');

// geometri: alle steder, innenfor stedets ramme og mellom FRA og TIL (vippeplanken stikker litt ut), uten NaN, farger fra grønn til gul
for (const { f, s } of all) {
  const b = ghostBuffers(s), sp = spanOf(s), x0 = s.x + sp.from.u - GHOST.ext - 1e-6, x1 = s.x + sp.to.u + GHOST.ext + 1e-6;
  assert.ok(b.slabs >= 1 && b.slabs <= GHOST.maxSteps, `${f} ${s.id}: antall deler`);
  for (const a of [b.line, b.lineCol, b.tri, b.triCol]) assert.ok(a.length > 0 && a.every(Number.isFinite), `${f} ${s.id}: tall`);
  assert.equal(b.line.length, b.lineCol.length); assert.equal(b.tri.length, b.triCol.length);
  for (let i = 0; i < b.line.length; i += 3) { assert.ok(b.line[i] >= x0 && b.line[i] <= x1, `${f} ${s.id}: x innenfor FRA-TIL`); assert.ok(b.line[i + 1] >= s.y + Math.min(sp.from.v, sp.to.v) - GHOST.thick - GHOST.ext - 1e-6 && b.line[i + 1] <= s.y + Math.max(sp.from.v, sp.to.v) + GHOST.ext + 1e-6, `${f} ${s.id}: y`); }
  assert.ok(b.segs === b.slabs * 12 && b.tris === b.slabs * 12, 'tegnebudsjett per del');
  const gr = b.lineCol[0], yl = b.lineCol[b.lineCol.length - 2]; assert.ok(b.lineCol.length >= 6 && gr >= 0 && yl >= 0);
}
// bro: ett dekk fra kant til kant, flatt; trapp: trinn stiger jevnt opp til TIL-høyden; vippe: skrå planke fra lav til høy
const bro = ghostSlabs(by('bro.level.json', 'bro1')); assert.equal(bro.slabs.length, 1); assert.equal(bro.slabs[0][2][1], 0); assert.equal(bro.slabs[0][2][0], 3.5);
const tr = ghostSlabs(by('trapp.level.json', 'trapp1')); assert.ok(tr.slabs.length >= 2); const tops = tr.slabs.map((q) => q[2][1]); assert.deepEqual(tops, [...tops].sort((a, b) => a - b)); assert.equal(tops[tops.length - 1], 6); assert.equal(tr.slabs[tr.slabs.length - 1][2][0], spanOf(by('trapp.level.json', 'trapp1')).to.u);
const vi = ghostSlabs(by('vippe.level.json', 'vippe1')); assert.equal(vi.slabs.length, 1); assert.ok(vi.slabs[0][2][1] > vi.slabs[0][3][1], 'planken stiger fra FRA mot TIL (oppe-høyre over oppe-venstre)');
const bb = ghostBuffers(by('bro.level.json', 'bro1'));
// farge: venstre ende grønn (SPAN.colFrom), høyre ende gul
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const g0 = hx(SPAN.colFrom), y0 = hx(SPAN.colTo);
const xs = []; for (let i = 0; i < bb.line.length; i += 3) xs.push([bb.line[i], i]); const maxI = xs.reduce((m, q) => (q[0] > m[0] ? q : m))[1], minI = xs.reduce((m, q) => (q[0] < m[0] ? q : m))[1];
for (let k = 0; k < 3; k++) { assert.ok(Math.abs(bb.lineCol[minI + k] - g0[k]) < 1e-6, 'venstre = FRA-farge'); assert.ok(Math.abs(bb.lineCol[maxI + k] - y0[k]) < 1e-6, 'høyre = TIL-farge'); }

// vises bare når: valget på, nær, spiller, ikke byggeskjerm, ikke bestått, ikke Ekspert uten hjelp
const V = (o) => ghostWorldVisible({ near: true, ...o });
assert.ok(V({})); assert.ok(!V({ on: false })); assert.ok(!V({ near: false }), 'langt unna'); assert.ok(!V({ done: true }), 'bestått'); assert.ok(!V({ buildOpen: true })); assert.ok(!V({ playing: false }));
assert.ok(!V({ expert: true, help: 'none' })); assert.ok(V({ expert: true, help: 'normal' }));

// oppdragskort: setning med last, gap/høyde og knappenavn
const cb = ghostCard(by('bro.level.json', 'bro1'), T); assert.equal(cb.kind, 'bridge'); assert.match(cb.full, /^Bygg en bro så figuren kommer over gapet \(35 cm\)\.$/); assert.equal(cb.tap, 'Trykk BYGG.'); assert.equal(cb.title, 'OPPDRAG');
const cl = ghostCard(by('leke.level.json', 'leke1'), T); assert.match(cl.full, /tennisballen og leke-bilen/); assert.equal(cl.icon, '🎾🚗');
const c6 = ghostCard(by('bygglab.level.json', 'lab6'), T); assert.match(c6.full, /tennisballen, leke-bilen og roboten/);
const ct = ghostCard(by('trapp.level.json', 'trapp1'), T); assert.match(ct.full, /^Bygg en trapp så figuren kommer opp på hylla \(30 cm opp\)\.$/);
const cv = ghostCard(by('vippe.level.json', 'vippe1'), T); assert.match(cv.full, /planke over gapet \(33 cm\).*10 cm høyere/);
assert.equal(ghostCard(by('bro.level.json', 'bro1'), T, { touch: false }).tap, 'Trykk BYGG (B).', 'taster bare på tastatur');
assert.ok(!/\b(Space|Enter|\[|tast)/i.test(cb.full + cb.tap), 'ingen taster i touch-teksten');
assert.match(ghostCard(by('bro.level.json', 'bro1'), Te).full, /^Build a bridge so the figure can cross the gap \(35 cm\)\.$/);
assert.equal(cb.short, 'Bro over 35 cm'); assert.equal(loadsText({ loads: ['robot'] }, T), 'roboten'); assert.deepEqual(loadIds({}), ['figure']);
for (const { s } of all) { const c = ghostCard(s, T); assert.ok(c.full.length > 20 && c.short.length > 4 && !/undefined|\{/.test(c.full + c.short), `${s.id}: kortet er ferdig utfylt`); }
// kortet krymper etter første BYGG
assert.ok(!cardCompact([], 'bro:bro1')); let seen = cardMark([], 'bro:bro1'); assert.ok(cardCompact(seen, 'bro:bro1')); assert.ok(!cardCompact(seen, 'bro:x')); assert.deepEqual(cardMark(seen, 'bro:bro1'), seen);

// i18n
for (const k of ['ghw.title', 'ghw.and', 'ghw.tap', 'ghw.bridge', 'ghw.stairs', 'ghw.seesaw', 'ghw.short.bridge', 'ghw.short.stairs', 'ghw.short.seesaw', 'ghw.load.figure', 'ghw.load.ball', 'ghw.load.car', 'ghw.load.robot']) assert.ok(DICT_KEYS.nb.includes(k) && DICT_KEYS.en.includes(k), `i18n ${k}`);

// kobling (kildekode): delt kode for Hyllebroen og Byggeskolen/Bygglab (R101), valg, logg, files, ingen skygge
const bsrc = fs.readFileSync('build.js', 'utf8'), msrc = fs.readFileSync('main.js', 'utf8'), vsrc = fs.readFileSync('buildghostw_view.js', 'utf8'), idx = fs.readFileSync('index.html', 'utf8'), cin = fs.readFileSync('cinema_logic.js', 'utf8');
for (const m of ['buildghostw_logic', 'buildghostw_view']) assert.ok(idx.includes(`'${m}'`), `${m} i files`);
assert.ok(/createGhostWorldView\(/.test(bsrc) && /spøkelsesbro vist/.test(bsrc) && /oppdragskort krymper/.test(bsrc) && /btnBuildCard/.test(bsrc), 'build.js: tegning, kort, logg');
assert.ok(/'buildghostworld'/.test(msrc) && /tlm\.buildghostworld/.test(msrc) && /getGhostW:/.test(msrc) && /logEv\('bygg', v \? 'spøkelsesbro på'/.test(msrc), 'main.js: SETTINGS (spill), logg');
assert.ok(/fl\('buildghostworld', 'spill'/.test(msrc) && /let buildGhostW = store\.get\('tlm\.buildghostworld', true\)/.test(msrc), 'standard på, gruppe Spill');
assert.ok(cin.includes("'btnBuildCard'"), 'skjules i kinomodus');
assert.ok(!/castShadow\s*=\s*true|receiveShadow\s*=\s*true/.test(vsrc) && /castShadow = false/.test(vsrc) && /depthWrite: false/.test(vsrc), 'ingen skygge, gjennomsiktig uten dybdeskriving');
// tegnebudsjett: to tegnekall (flatemesh + linjemesh) og høyst 6 deler x 12 trekanter per synlig sted; bare ett sted er synlig om gangen
const worst = Math.max(...all.map(({ s }) => ghostBuffers(s).tris)); assert.ok(worst <= GHOST.maxSteps * 12, `trekanter ${worst}`);
// R143: ingen 1 px-linjer i verdenen (løse, tynne streker ved Vippa): kantlinjer og FRA-TIL-bue er av, og viewene legger dem bare til når flaggene er på
assert.equal(GHOST.wire, false, 'R143: spøkelsesbroens kantlinjer av'); assert.equal(SPAN.arc, false, 'R143: FRA-TIL-buen av'); assert.equal(SPAN.frame, false, 'R143: stedsrammen av'); assert.ok(/if \(SPAN_FRAME\) g\.add\(box\)/.test(bsrc), 'R143: rammen legges ikke i gruppa som standard');
assert.ok(/if \(GHOST\.wire\) g\.add\(line\)/.test(vsrc) && !/g\.add\(fill, line\)/.test(vsrc), 'R143: linjemesh legges ikke i gruppa som standard');
const spanSrc = fs.readFileSync('buildspan_view.js', 'utf8'); assert.ok(/if \(SPAN\.arc\) g\.add\(line\)/.test(spanSrc) && !/g\.add\(line\)(?!;)/.test(spanSrc.replace('if (SPAN.arc) g.add(line)', '')), 'R143: buen legges ikke i gruppa som standard');
console.log('buildghostw: ok, verste sted', worst, 'trekanter, 1 tegnekall (R143: uten kantlinjer)');
