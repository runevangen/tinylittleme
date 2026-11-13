// R45: lesbar svikt (build_stress.js + pose().stress i build_phys.js): farge, belastning 0..1, forklaring, brudd-tempo, uendret utfall
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as S from './build_stress.js';
import * as BP from './build_phys.js';
import { makeT } from './i18n.js';
const P = (id, type, u, v, rot = 0) => ({ id, type, u, v, rot });
const wide = { id: 'w', w: 13, h: 8, deck: [{ u0: -9.5, u1: -3.5 }, { u0: 3.5, u1: 9.5 }] };
const link = (kind, a, b, la, lb, g) => ({ id: 'k1', kind, a, la, b: b || null, lb: lb || null, g: g || null });

// farge: blå -> gul -> rød, jevn og monoton (rød øker, blå minker)
assert.deepEqual(S.stressRGB(0), S.COLD); assert.deepEqual(S.stressRGB(0.5), S.WARM); assert.deepEqual(S.stressRGB(1), S.HOT);
assert.deepEqual(S.stressRGB(-3), S.COLD); assert.deepEqual(S.stressRGB(9), S.HOT); assert.deepEqual(S.stressRGB(NaN), S.COLD);
let prevB = 999;
for (let i = 0; i <= 20; i++) { const c = S.stressRGB(i / 20); assert.ok(c.every((v) => v >= 0 && v <= 255 && Number.isInteger(v))); if (i / 20 <= 0.5) assert.ok(c[0] >= (S.stressRGB(Math.max(0, i / 20 - 0.05))[0]), 'rød-kanalen stiger mot gul'); assert.ok(c[2] <= prevB + 1e-9 || i === 0, 'blå-kanalen faller'); prevB = c[2]; }
assert.equal(S.stressBand(0.1), 'slapp'); assert.equal(S.stressBand(0.5), 'belastet'); assert.equal(S.stressBand(0.95), 'brudd');
assert.match(S.stressCss(1), /^rgb\(255,59,48\)$/); assert.match(S.tint('#c08040', 0, 0.8), /^rgb\(\d+,\d+,\d+\)$/);
assert.equal(S.tint('#000000', 1, 1), 'rgb(255,59,48)'); assert.equal(S.tint('#ffffff', 1, 0), 'rgb(255,255,255)');

// belastning fra fysikken: 0..1 via loadMap, monoton med vekten på planken
const stressOf = (extra, T = 3) => { const sim = BP.createSim({ site: wide, placed: [P('a', 'plank_l', 0, 0), ...extra], links: [] }); let mx = 0; for (let i = 0; i < T * 60; i++) { sim.step(); mx = Math.max(mx, S.loadMap(sim.pose()).parts.get('a')); } return mx; };
const sNone = stressOf([]), sBlock = stressOf([P('b', 'block', 0, 1.25)]), sWeight = stressOf([P('w', 'weight', 0, 1.25)], 1);
assert.ok(sNone >= 0 && sBlock <= 1 && sWeight <= 1, 'belastning ligger i 0..1');
assert.ok(sNone < sBlock && sBlock < sWeight, `belastningen vokser med lasten (${sNone.toFixed(2)} < ${sBlock.toFixed(2)} < ${sWeight.toFixed(2)})`);
assert.ok(sWeight >= 0.95, 'rett før/ved brudd er belastningen nær 1');
// stive deler viser belastningen i leddene sine: kloss i tau under strekk er mer belastet enn en kloss uten ledd
{
  const sim = BP.createSim({ site: wide, placed: [P('a', 'weight', 0, 5)], links: [link('rope', 'a', null, { x: 0, y: 0 }, null, { u: 0, v: 9 })] });
  let mx = 0; for (let i = 0; i < 40; i++) { sim.step(); const pp = sim.pose(); mx = Math.max(mx, S.loadMap(pp).links.get('k1') || 0, pp.parts[0].stress); }
  assert.ok(mx > 0.5, 'hengende vekt belaster tauet');
  const calm = BP.createSim({ site: wide, placed: [P('a', 'block', 5, 0.75)], links: [] }); for (let i = 0; i < 60; i++) calm.step(); assert.equal(calm.pose().parts[0].stress, 0, 'kloss uten ledd har ingen leddbelastning');
}

// forklaring: kjent svak bygg (vekt midt på lang planke) -> peker på planken a; tau/tape peker på riktig ledd
let r = BP.runSim({ site: wide, placed: [P('a', 'plank_l', 0, 0), P('w', 'weight', 0, 1.25)], links: [] });
let why = S.whyBroke(S.mergeBreaks(r)); assert.ok(why && why.kind === 'plank' && why.id === 'a' && why.key === 'build.why.plank', 'planken er svakeste ledd');
r = BP.runSim({ site: wide, placed: [P('a', 'weight', 0, 5)], links: [link('rope', 'a', null, { x: 0, y: 0 }, null, { u: 0, v: 9 })] }, { maxT: 3 });
why = S.whyBroke(S.mergeBreaks(r)); assert.ok(why && why.kind === 'rope' && why.id === 'k1' && why.key === 'build.why.rope', 'tauet røk');
r = BP.runSim({ site: wide, placed: [P('a', 'weight', 0, 5)], links: [link('tape', 'a', null, { x: 0.5, y: 0 }, null, { u: 0.5, v: 5 })] }, { maxT: 3 });
why = S.whyBroke(S.mergeBreaks(r)); assert.ok(why && why.kind === 'tape' && why.key === 'build.why.tape', 'teipen røk');
// flere brudd: det første i tid peker
assert.equal(S.whyBroke([{ kind: 'tape', id: 'x', t: 2 }, { kind: 'plank', id: 'p', t: 1 }]).id, 'p');
assert.equal(S.whyBroke([]), null); assert.equal(S.whyBroke(null), null);
// uten brudd (falt bare) gir ingen forklaring
r = BP.runSim({ site: wide, placed: [], links: [] }); assert.equal(S.whyBroke(S.mergeBreaks(r)), null);
// tekstene finnes på begge språk, nevner knappene (STOPP/STOP) og forslag
let lang = 'nb'; const { T } = makeT(() => lang);
for (const l of ['nb', 'en']) { lang = l; for (const k of S.WHY_KEYS) { const t = T(k); assert.ok(t && !t.startsWith('build.') && /STOP/.test(t), `${l} ${k}: ${t}`); } }
lang = 'nb'; assert.match(T('build.why.plank'), /støtte/); assert.match(T('build.why.rope'), /TAPE/);

// brudd-tempo: pause, sakte film, så normalt; av = alltid normalt
assert.equal(S.breakTempo(-1), 1); assert.equal(S.breakTempo(null), 1); assert.equal(S.breakTempo(0.05), 0); assert.equal(S.breakTempo(0.5), S.BREAK_SLOW_K); assert.equal(S.breakTempo(5), 1); assert.equal(S.breakTempo(0.05, false), 1);
assert.ok(S.breakTempo(S.BREAK_HOLD + S.BREAK_SLOW - 0.01) < 1 && S.breakTempo(S.BREAK_HOLD + S.BREAK_SLOW + 0.01) === 1);
const rg = S.ringAt(0.6); assert.ok(rg.r > 8 && rg.r <= 46 && rg.a > 0 && rg.a < 1); assert.equal(S.ringAt(2), null); assert.ok(S.ringAt(0.1).r < S.ringAt(0.9).r, 'ringen vokser');

// utfallet er uendret: pose() er bare lesing (samme kjøring med og uten pose-kall gir samme resultat), og kjente utfall holder
const plain = BP.runSim({ site: wide, placed: [P('a', 'plank_l', 0, 0), P('w', 'weight', 0, 1.25)], links: [] });
const sim = BP.createSim({ site: wide, placed: [P('a', 'plank_l', 0, 0), P('w', 'weight', 0, 1.25)], links: [] }); const bk = [];
while (sim.state.state === 'run' && sim.t < 30) { sim.step(); S.loadMap(sim.pose()); for (const e of sim.drain()) if (e.type === 'break') bk.push({ id: e.id, u: e.u, v: e.v, t: e.t }); }
assert.equal(JSON.stringify(bk), JSON.stringify(plain.breaks), 'brudd er like med og uten lesing av belastning'); assert.equal(sim.state.state === 'won' ? 'won' : 'lost', plain.result);
const lvl = JSON.parse(fs.readFileSync('levels/kontroll.level.json', 'utf8')).build.sites[0];
const ok = BP.runSim({ site: lvl, placed: [P('a', 'plank_l', 0, 0)], links: [] }); assert.equal(ok.result, 'won');
// låst mot utfallet før R45 (identisk kjøring på forrige versjon): tid og brudd i kjente bygg
const pin = (placed, links, o) => { const x = BP.runSim({ site: wide, placed, links }, o); return `${x.result}/${x.t}/${x.breaks.length}/${x.linkBreaks.length}`; };
assert.equal(pin([P('a', 'plank_l', 0, 0)], []), 'won/4.35/0/0'); assert.equal(pin([P('a', 'plank_l', 0, 0), P('w', 'weight', 0, 1.25)], []), 'lost/1.783/1/0'); assert.equal(pin([P('a', 'plank_l', 0, 0), P('b', 'block', 0, 1.25)], []), 'won/4.317/0/0');
assert.equal(pin([P('a', 'weight', 0, 5)], [link('rope', 'a', null, { x: 0, y: 0 }, null, { u: 0, v: 9 })], { maxT: 3 }), 'lost/1.617/0/1');
// i18n/legende, innstillinger og modul i files
for (const k of ['build.legend', 'build.legend2']) { lang = 'nb'; assert.ok(T(k) !== k); lang = 'en'; assert.ok(T(k) !== k); }
const main = fs.readFileSync('main.js', 'utf8'); for (const id of ['buildstress', 'buildbreakfx']) assert.ok(main.includes(`'${id}', 'spill'`) && main.includes(`'tlm.${id}'`), `${id} i SETTINGS`);
assert.ok(fs.readFileSync('index.html', 'utf8').includes("'build_stress'"), 'build_stress i files');
console.log('lesbar-svikt-tester grønne');
