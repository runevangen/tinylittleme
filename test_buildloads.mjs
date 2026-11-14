// R48: leker som testlast (build_loads.js): ulik oppførsel i fysikken, deterministisk, krav i scenen, valg uten tastatur, innstilling
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as BP from './build_phys.js';
import * as LD from './build_loads.js';
import * as VW from './build_loads_view.js';
const P = (id, type, u, v, rot = 0) => ({ id, type, u, v, rot });

// 1. tabellen: fire laster (figur + tre leker) med navn, ikon og fornuftige fysikkverdier
assert.deepEqual(LD.LOAD_IDS, ['figure', 'ball', 'car', 'robot']);
for (const id of LD.LOAD_IDS) { const L = LD.LOADS[id]; assert.ok(L.name && L.en && L.icon && L.snd && /^#[0-9a-f]{6}$/i.test(L.color), `${id}: navn, ikon, farge`); assert.ok(L.mass > 0 && L.r > 0.2 && L.speed > 0 && L.fric >= 0, `${id}: fysikkverdier`); }
assert.ok(LD.LOADS.car.mass > LD.LOADS.robot.mass && LD.LOADS.robot.mass > LD.LOADS.figure.mass && LD.LOADS.figure.mass > LD.LOADS.ball.mass, 'bil tyngst, ball lettest');
assert.equal(LD.loadParams('finnes_ikke'), LD.LOADS.figure, 'ukjent last gir testfiguren');
assert.ok(LD.LOADS.ball.fric < LD.LOADS.figure.fric + 1e-9 && LD.LOADS.car.fric < LD.LOADS.figure.fric, 'ball og bil ruller lettere');
assert.deepEqual(VW.drawnLoads.sort(), [...LD.LOAD_IDS].sort(), 'alle laster har en tegning');

// tegningene kjører med en falsk tegnekontekst og bruker få tegnekall (ingen nye shadere)
for (const id of LD.LOAD_IDS) {
  let calls = 0; const g = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => { calls++; }), set: (t, k, v) => ((t[k] = v), true) });
  VW.drawLoad(g, { load: id, r: LD.LOADS[id].r, roll: 1.2, u: 0, v: 0 }, { x: 100, y: 100 }, 30); assert.ok(calls > 3 && calls <= 40, `${id}: ${calls} tegnekall`);
}
VW.drawLoad(new Proxy({}, { get: () => () => {}, set: () => true }), { load: 'ukjent', r: 0.4 }, { x: 0, y: 0 }, 30);   // ukjent last tegnes som testfiguren

// 2. roboten går i rykk og står stille litt, deterministisk i tid
const sp = []; for (let t = 0; t < 6.4; t += 0.05) sp.push(LD.driveSpeed('robot', t));
assert.ok(Math.min(...sp) === 0 && Math.max(...sp) > LD.LOADS.robot.speed && Math.max(...sp) < LD.LOADS.robot.speed * 1.5, 'roboten stopper og går ujevnt');
assert.equal(LD.driveSpeed('robot', 1.234), LD.driveSpeed('robot', 1.234));
assert.ok(LD.driveSpeed('car', 0.1) === LD.driveSpeed('car', 3.3) && LD.driveSpeed('ball', 1) === LD.LOADS.ball.speed, 'bil og ball holder jevn fart');

// 3. samme bygg, ulike laster: alle kommer over en vanlig lang planke
const wide = { id: 'w', w: 13, h: 8, deck: [{ u0: -9.5, u1: -3.5 }, { u0: 3.5, u1: 9.5 }] };
const run = (site, placed, load, links = []) => BP.runSim({ site, placed, links }, { load });
const stress = (site, placed, load) => { const sim = BP.createSim({ site, placed, links: [] }, { load }); let mx = 0; while (sim.state.state === 'run') { sim.step(); for (const p of sim.pose().parts) mx = Math.max(mx, p.stress); } return { mx, res: sim.state.state }; };
for (const l of LD.LOAD_IDS) assert.equal(run(wide, [P('a', 'plank_l', 0, 0.25)], l).result, 'won', `${l} kommer over en lang planke`);
// de går ulikt: roboten er tregest, bilen raskest, ballen tar tid på å få opp farten
const T = Object.fromEntries(LD.LOAD_IDS.map((l) => [l, run(wide, [P('a', 'plank_l', 0, 0.25)], l).t]));
assert.ok(T.car < T.figure && T.figure < T.robot, `bil ${T.car} < figur ${T.figure} < robot ${T.robot}`);
// belastningen på planken følger vekten: ball minst, bil mest
const S = Object.fromEntries(LD.LOAD_IDS.map((l) => [l, stress(wide, [P('a', 'plank_l', 0, 0.25)], l).mx]));
assert.ok(S.ball < S.figure && S.figure < S.car && S.robot < S.car && S.ball < S.robot, `belastning: ${JSON.stringify(S)}`);

// 4. bilen krever sterkere bro enn ballen: en lang planke over et smalt gap holder ball, figur og robot, men bilen tar planken med seg ned
const narrow = { id: 'n', w: 9, h: 8, deck: [{ u0: -9.5, u1: -2.5 }, { u0: 2.5, u1: 9.5 }] };
const plank = [P('a', 'plank_l', 0, 0.25)];
for (const l of ['ball', 'figure', 'robot']) assert.equal(run(narrow, plank, l).result, 'won', `${l} klarer den enkle broa`);
const car1 = run(narrow, plank, 'car'); assert.equal(car1.result, 'lost', 'bilen klarer ikke den enkle broa');
// en kort planke over et gap på 3,5 enheter: ballen og figuren går, bilen ikke
const gap = { id: 'g', w: 13, h: 8, deck: [{ u0: -9.5, u1: -1.75 }, { u0: 1.75, u1: 9.5 }] };
assert.equal(run(gap, [P('a', 'plank_s', 0, 0.25)], 'ball').result, 'won'); assert.equal(run(gap, [P('a', 'plank_s', 0, 0.25)], 'car').result, 'lost');
// men teipes broen fast i begge ender, klarer bilen den: bilen krever en sterkere (festet) bro, og det finnes en vei
const tape = (id, x, u) => ({ id, kind: 'tape', a: 'a', la: { x, y: -0.25 }, b: null, lb: null, g: { u, v: 0 } });
const carTaped = run(narrow, plank, 'car', [tape('t1', -3.5, -3.5), tape('t2', 3.5, 3.5)]);
assert.equal(carTaped.result, 'won', 'teipet bro bærer bilen'); assert.equal(carTaped.linkBreaks.length, 0);

// 5. deterministisk: samme bygg og last gir nøyaktig samme utfall hver gang
for (const l of LD.LOAD_IDS) assert.deepEqual(run(narrow, plank, l), run(narrow, plank, l), `${l}: samme resultat hver gang`);
assert.deepEqual(run(narrow, plank, 'figure'), BP.runSim({ site: narrow, placed: plank, links: [] }), 'uten valg er testfiguren lasten');
// poseringen viser hvilken last det er, og radius følger lasten
const sim = BP.createSim({ site: narrow, placed: plank, links: [] }, { load: 'car' }); sim.step();
assert.equal(sim.pose().figure.load, 'car'); assert.equal(sim.pose().figure.r, LD.LOADS.car.r);

// 6. uten bygg faller alle (og lastene tåler å bli prøvd rett etter hverandre på samme bygg)
for (const l of LD.LOAD_IDS) assert.equal(run(narrow, [], l).reason, 'fell', `${l} faller i gapet uten bro`);
const seq = LD.LOAD_IDS.map((l) => run(wide, plank, l).result); assert.deepEqual(seq, ['won', 'won', 'won', 'won'], 'etter hverandre på samme bygg');

// 7. krav i scenen: site.loads. Uten krav er alle valgbare; med krav bare de kravte, og alle må bestås
assert.deepEqual(LD.requiredLoads({}), []); assert.deepEqual(LD.requiredLoads({ loads: ['car', 'xx', 'car', 'ball'] }), ['car', 'ball'], 'ukjente og dobler forkastes');
assert.deepEqual(LD.offered({}), LD.LOAD_IDS); assert.deepEqual(LD.offered({}, false), ['figure'], 'valget slått av: bare testfiguren');
assert.deepEqual(LD.offered({ loads: ['ball', 'car'] }, false), ['ball', 'car'], 'krav går foran innstillingen');
let site = { loads: ['ball', 'car'] }, w = LD.afterWin(site, [], 'ball');
assert.deepEqual([w.passed, w.left, w.solved, LD.nextLoad(site, w.passed)], [['ball'], ['car'], false, 'car'], 'første last bestått, bilen mangler');
w = LD.afterWin(site, w.passed, 'car'); assert.ok(w.solved && !w.left.length && LD.nextLoad(site, w.passed) === null, 'begge bestått: løst');
assert.ok(LD.afterWin(site, [], 'figure').solved === false, 'feil last teller ikke');
assert.ok(LD.afterWin({}, [], 'robot').solved, 'uten krav løser enhver last stedet');
assert.deepEqual(LD.cleanPassed(['ball', 'x', 'ball', 3]), ['ball']); assert.deepEqual(LD.cleanPassed(null), []);

// 8. data: leke-brettet krever ball og bil, og referansebygget består begge (brettet kan løses)
const lv = JSON.parse(fs.readFileSync('levels/leke.level.json', 'utf8')), s0 = lv.build.sites[0];
assert.deepEqual(s0.loads, ['ball', 'car'], 'leke-brettet krever ball og bil');
for (const id of ['stue']) { const w = JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8')).build.sites[0]; assert.deepEqual(w.loads, ['ball', 'car'], `${id} krever ball og bil`); for (const l of w.loads) assert.equal(BP.runSim({ site: w, placed: w.ref.placed, links: w.ref.links || [] }, { load: l }).result, 'won', `referansebygget i ${id} består med ${l}`); }
for (const l of s0.loads) assert.equal(BP.runSim({ site: s0, placed: s0.ref.placed, links: s0.ref.links || [] }, { load: l }).result, 'won', `referansebygget i leke består med ${l}`);
for (const n of fs.readdirSync('levels').filter((f) => f.endsWith('.level.json'))) for (const s of JSON.parse(fs.readFileSync(`levels/${n}`, 'utf8')).build?.sites || []) for (const l of s.loads || []) assert.ok(LD.isLoad(l), `${n}: ukjent last ${l}`);

// 9. innstilling, moduler, tekster og logging
const main = fs.readFileSync('main.js', 'utf8'); assert.ok(main.includes("'buildloads', 'spill'") && main.includes("'tlm.buildloads'") && main.includes('getLoads: () => buildLoads'), 'buildloads i SETTINGS og koblet til byggemodusen');
const html = fs.readFileSync('index.html', 'utf8'); for (const f of ['build_loads', 'build_loads_view']) assert.ok(html.includes(`'${f}'`), `${f} i files`);
const i18n = fs.readFileSync('i18n.js', 'utf8');
for (const id of LD.LOAD_IDS) for (const k of ['build.load.', 'build.loadThe.']) assert.equal(i18n.split(`'${k}${id}'`).length - 1, 2, `${k}${id} på norsk og engelsk`);
for (const k of ['build.hintRunL', 'build.wonL', 'build.wonMore', 'build.lostFellL', 'build.lostStuckL', 'build.loadNeed']) assert.equal(i18n.split(`'${k}'`).length - 1, 2, `${k} på norsk og engelsk`);
const bs = fs.readFileSync('build.js', 'utf8'); assert.ok(bs.includes('last valgt') && bs.includes('bestått') && bs.includes('data-l') || bs.includes('dataset.l'), 'logEv og valgknapper for laster');
for (const k of ['STOPP', 'PRØV']) assert.ok(i18n.includes(k), 'tekstene nevner knappene');
console.log('test_buildloads: ok');
