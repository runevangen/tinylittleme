// R25: byggeskjermens 2D-fysikk (build_phys.js): bro bærer, for svak faller, tau bare i strekk, tape/ledd, motvekt, trapp, determinisme
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as BP from './build_phys.js';
import * as BL from './build_logic.js';
const P = (id, type, u, v, rot = 0) => ({ id, type, u, v, rot });
const run = (placed, links = [], site, o = {}) => BP.runSim({ site, placed, links }, o);
const settle = (placed, links, site, T, probe) => { const sim = BP.createSim({ site, placed, links }); for (let i = 0; i < T * 60; i++) { sim.step(); if (probe) probe(sim); } return sim; };
const lvl = JSON.parse(fs.readFileSync('levels/kontroll.level.json', 'utf8')).build.sites[0];       // gapet i brettet: 3 enheter mellom dekkene
const wide = { id: 'w', w: 13, h: 8, deck: [{ u0: -9.5, u1: -3.5 }, { u0: 3.5, u1: 9.5 }] };        // gap på 7
const link = (kind, a, b, la, lb, g) => ({ id: 'k1', kind, a, la, b: b || null, lb: lb || null, g: g || null });

// oppsettet er felles med byggeskjermen: like mange kuler som layout() sier
for (const t of Object.keys(BL.PART_TYPES)) assert.ok(BL.layout(t).length >= 8, `${t}: kuler`);
assert.equal(BL.layout('plank_l').length, 16); assert.equal(BL.layout('block').length, 9);

// 1) uten bygg faller figuren; med en lang planke over gapet kommer den over (og målflagget teller)
let r = run([], [], lvl); assert.equal(r.result, 'lost'); assert.equal(r.reason, 'fell', 'uten bro faller figuren i gapet');
r = run([P('a', 'plank_l', 0, 0)], [], lvl); assert.equal(r.result, 'won', 'lang planke over gapet bærer figuren'); assert.ok(r.t < 12 && r.breaks.length === 0);
r = run([P('a', 'plank_l', 0, 0)], [], wide); assert.equal(r.result, 'won', 'lang planke over bredt gap bærer figuren'); assert.ok(r.figure.u > 5);
r = run([P('a', 'plank_s', 0, 0)], [], wide); assert.equal(r.result, 'lost', 'for kort planke når ikke over');
// uten festepunkt for fall: en planke som ligger skjevt (på høykant) er ikke noen bro
r = run([P('a', 'plank_l', 0, 3, Math.PI / 2)], [], lvl); assert.equal(r.result, 'lost');

// 2) en for svak bro faller: en tung vekt midt på en lang planke over et bredt gap brekker den; en kloss bøyer den bare (synlig), men holder
let sim = settle([P('a', 'plank_l', 0, 0), P('w', 'weight', 0, 1.25)], [], wide, 4); assert.ok(sim.breaks().includes('a'), 'vekt på midten brekker planken');
assert.ok(sim.pose().parts[0].segs.length >= 2, 'brukket planke vises som flere biter');
r = run([P('a', 'plank_l', 0, 0), P('w', 'weight', 0, 1.25)], [], wide); assert.ok(r.breaks.length >= 1 && r.breaks[0].t > 0.2, 'brudd er logget med tid og sted'); assert.equal(r.result, 'lost');
assert.ok(Math.abs(r.breaks[0].u) < 4.5, 'det brekker i gapet eller ved kanten, der planken bøyer mest');
let minV = 9, maxStress = 0; sim = settle([P('a', 'plank_l', 0, 0), P('b', 'block', 0, 1.25)], [], wide, 3, (s) => { const p = s.pose().parts[0]; for (const q of p.pts) minV = Math.min(minV, q.v); maxStress = Math.max(maxStress, p.stress); });
assert.ok(minV < 0.25 - 0.1 && !sim.breaks().length, 'kloss: planken bøyer seg synlig, men holder'); assert.ok(maxStress > 0.2 && maxStress < 1, 'belastningen vises (0 til 1)');
const weak = settle([P('a', 'plank_l', 0, 0), P('w', 'weight', 0, 1.25)], [], wide, 4, null);
const strong = BP.createSim({ site: wide, placed: [P('a', 'plank_l', 0, 0), P('w', 'weight', 0, 1.25)], links: [] }, { strength: 2.5 }); for (let i = 0; i < 240; i++) strong.step();
assert.ok(weak.breaks().length && !strong.breaks().length, 'styrkefaktoren (admin) flytter brekkgrensen');
// kort planke er stivere enn lang
let shortMin = 9; settle([P('a', 'plank_s', 0, 0), P('b', 'block', 0, 1.25)], [], { id: 'n', w: 9, h: 8, deck: [{ u0: -9.5, u1: -1.5 }, { u0: 1.5, u1: 9.5 }] }, 3, (s) => { for (const q of s.pose().parts[0].pts) shortMin = Math.min(shortMin, q.v); });
assert.ok(shortMin > minV, 'kort planke bøyer seg mindre enn lang');

// 3) tau: bare i strekk. Henger når det er stramt, skyver ikke, ryker for en hengende vekt
const hang = (links, type = 'block') => settle([P('a', type, 0, 5)], links, wide, 3).pose().parts[0];
const ropeG = (g) => link('rope', 'a', null, { x: 0, y: 0 }, null, g);
assert.ok(hang([]).v < -5, 'uten tau faller kloss ut av bildet');
const hung = hang([ropeG({ u: 0, v: 9 })]); assert.ok(Math.abs(hung.v - (9 - 4.3)) < 0.15, 'tau holder klossen i strekk (lengde + litt slakk)');
const lie = settle([P('a', 'block', 5, 0.75)], [ropeG({ u: 5, v: 3 })], wide, 2).pose().parts[0]; assert.ok(Math.abs(lie.u - 5) < 0.1 && Math.abs(lie.v - 0.75) < 0.1, 'slakt tau skyver og drar ikke: klossen blir liggende');
const wRope = settle([P('a', 'weight', 0, 5)], [ropeG({ u: 0, v: 9 })], wide, 3); assert.ok(wRope.pose().links[0].broken && wRope.pose().parts[0].v < -5, 'tau ryker av en hengende vekt');
// to klosser bundet med tau: den ene dras med bare når tauet er stramt
const pair = settle([P('a', 'block', -6, 0.75), P('b', 'block', -6, 5)], [link('rope', 'a', 'b', { x: 0, y: 0 }, { x: 0, y: 0 })], wide, 3).pose(); assert.ok(pair.parts[1].v > 0.75 && pair.parts[1].v < 3.5, 'kloss i tau henger over klossen under');

// 4) tape og ledd
const hangTo = (kind, type) => settle([P('a', type, 0, 5)], [link(kind, 'a', null, { x: 0.5, y: 0 }, null, { u: 0.5, v: 5 })], wide, 3).pose();
assert.ok(Math.abs(hangTo('tape', 'block').parts[0].v - 5) < 0.1 && !hangTo('tape', 'block').links[0].broken, 'tape i underlaget holder en kloss');
assert.ok(hangTo('tape', 'weight').links[0].broken, 'tape ryker av en hengende vekt');
assert.ok(!hangTo('hinge', 'weight').links[0].broken && hangTo('hinge', 'weight').parts[0].v > 3, 'ledd holder vekten (og lar den svinge)');
const overhang = (kind) => { const B = BL.createBuild(wide, { a: 'block', b: 'block' }, ['a', 'b']); B.snap = false; BL.place(B, 'a', -5, 0.75, 0); BL.place(B, 'b', -3.5, 0.75, 0); if (kind) assert.ok(BL.addLink(B, kind, 'a', 'b').ok); return settle(B.placed, B.links, wide, 4).pose(); };
assert.ok(overhang('tape').parts[1].v > 0.5 && overhang(null).parts[1].v < -5, 'tape holder klossen som henger utenfor kanten; uten tape faller den');
assert.ok(overhang('hinge').parts[1].v > -5, 'ledd: klossen henger i leddet og faller ikke fritt');

// 5) motvekt: en planke som stikker ut over kanten velter alene, men blir liggende med en vekt på den innerste enden (og bøyer seg litt ut i luften)
const cant = (extra) => settle([P('a', 'plank_l', -2.5, 0.25), ...extra], [], wide, 4).pose();
assert.ok(Math.min(...cant([]).parts[0].pts.map((q) => q.v)) < -3, 'uten motvekt velter planken ut over kanten');
const cw = cant([P('w', 'weight', -5.5, 1.25)]); assert.ok(cw.parts[0].pts[0].v > 0.2 && Math.min(...cw.parts[0].pts.map((q) => q.v)) > -1.5, 'motvekt holder planken oppe');
assert.ok(cant([P('b', 'block', -5.5, 1.25)]).parts[0].pts[15].v < -2, 'en lett kloss er ikke nok motvekt');

// 6) trapp av klosser opp til en høy flate
const stairs = { id: 't', w: 14, h: 8, start: { u: -6, v: 0 }, goal: { u: 6, v: 3 }, deck: [{ u0: -13, u1: 3.25 }, { u0: 3.25, u1: 9, top: 3 }] };
r = run([P('A', 'block', 0.5, 0.75), P('B', 'block', 2.5, 0.75), P('C', 'block', 2.5, 2.25)], [], stairs); assert.equal(r.result, 'won', 'trapp av klosser gir veien opp'); assert.ok(r.figure.v > 3);
r = run([P('A', 'block', 0.5, 0.75)], [], stairs); assert.equal(r.result, 'lost', 'halv trapp er ikke nok'); assert.equal(r.reason, 'stuck');
r = run([], [], stairs); assert.equal(r.result, 'lost');

// 6b) trappa som finnes som byggested i kontroll-brettet: tre klosser fra brettet gir veien opp, og delene finnes i brettet
{
  const lv = JSON.parse(fs.readFileSync('levels/kontroll.level.json', 'utf8')), site = lv.build.sites.find((q) => q.id === 'trapp1');
  assert.ok(site, 'kontroll har trapp-byggested'); assert.ok(lv.build.parts.filter((q) => q.type === 'block').length >= 3, 'tre klosser å bygge trappa av');
  const rr = run([P('A', 'block', 0.5, 0.75), P('B', 'block', 2.5, 0.75), P('C', 'block', 2.5, 2.25)], [], site); assert.equal(rr.result, 'won', 'trapp-stedet i brettet kan bygges');
  assert.equal(run([], [], site).result, 'lost');
  assert.ok(lv.boxes.some((b) => b.id === 'hylle_t' && b.max[1] === site.y + 3), 'hylla i verden ligger på samme høyde som dekket');
}

// 7) determinisme: samme bygg gir nøyaktig samme prøve og samme posisjoner
const build = [P('a', 'plank_l', 0, 0), P('b', 'block', 1, 1.25), P('c', 'weight', -2, 1.25)], lk = [link('hinge', 'b', 'a', { x: 0, y: -0.75 }, { x: 1, y: 0.25 })];
assert.equal(JSON.stringify(run(build, lk, wide)), JSON.stringify(run(build, lk, wide)), 'samme resultat to ganger');
const s1 = settle(build, lk, wide, 2).pose(), s2 = settle(build, lk, wide, 2).pose(); assert.equal(JSON.stringify(s1), JSON.stringify(s2), 'samme posisjoner etter hvert tidssteg');
assert.equal(BP.DT, 1 / 60, 'fast tidssteg');

// 8) hendelser til lyd og logg
sim = BP.createSim({ site: wide, placed: [P('a', 'plank_l', 0, 0), P('w', 'weight', 0, 1.25)], links: [] }); const types = new Set(); while (sim.state.state === 'run') { sim.step(); for (const e of sim.drain()) types.add(e.type); }
for (const t of ['creak', 'break', 'lose', 'splash']) assert.ok(types.has(t), `hendelse ${t}`);
sim = BP.createSim({ site: lvl, placed: [P('a', 'plank_l', 0, 0)], links: [] }); const t2 = new Set(); while (sim.state.state === 'run') { sim.step(); for (const e of sim.drain()) t2.add(e.type); } assert.ok(t2.has('win')); 
// ugyldig kobling hoppes over og krasjer ikke
assert.doesNotThrow(() => run([P('a', 'block', 0, 5)], [link('tape', 'x', 'y', { x: 0, y: 0 }, { x: 0, y: 0 })], wide, { maxT: 1 }));
console.log('bygg-fysikk-tester grønne');
// R30: vippa (seesaw): fast dreiepunkt i midten, bærer testfiguren fra den lave til den høye hylla, svinger rundt midten
{
  const lv = JSON.parse(fs.readFileSync('levels/vippe.level.json', 'utf8')), site = lv.build.sites[0], V = (rot) => [P('v1', 'seesaw', 0, 1.25, rot)];
  assert.ok(BL.partType('seesaw').pivot && BL.partType('seesaw').w === 8, 'vippa er en egen deltype');
  assert.ok(lv.build.parts.some((q) => q.type === 'seesaw'), 'vippa finnes i rommet');
  const ok = run(V(0.2618), [], site);
  assert.equal(ok.result, 'won', `vippa på skrå over gapet bærer figuren (${ok.reason})`); assert.equal(ok.breaks.length, 0); assert.equal(ok.linkBreaks.length, 0, 'dreiepunktet holder');
  assert.equal(run([], [], site).result, 'lost', 'uten bygg består ikke prøven');
  // dreiepunktet er skjult i visningen, men holder midten av planken på plass mens endene svinger
  const sim = settle(V(0.2618), [], site, 2); const pose = sim.pose(); assert.equal(pose.links.length, 0, 'det skjulte dreiepunktet tegnes ikke som ledd');
  const pts = pose.parts[0].pts, mid = pts[(pts.length - 1) / 2]; assert.ok(Math.hypot(mid.u, mid.v - 1.25) < 0.05, 'midten ligger fast ved dreiepunktet');
  // fri vippe uten underlag i nærheten: en tung vekt teipet til ene enden får den til å vippe ned på den siden (den svinger rundt midten, glir ikke bort)
  const free = { id: 'f', w: 24, h: 12, deck: [{ u0: -12, u1: -9 }, { u0: 9, u1: 12 }], start: { u: -11, v: 0 }, goal: { u: 11, v: 0 } };
  const placed = [P('v1', 'seesaw', 0, 4, 0), P('w', 'weight', -3, 5.0, 0)], tape = [link('tape', 'w', 'v1', { x: 0, y: -0.75 }, { x: -3, y: 0.25 })];
  const tip = BP.settledPlaced({ site: free, placed, links: tape }, { secs: 1.5 }).find((p) => p.id === 'v1');
  assert.ok(tip.rot > 0.3 && Math.abs(tip.u) < 1 && Math.abs(tip.v - 4) < 1, `vippa tipper ned mot vekta (rot ${tip.rot.toFixed(2)}) og blir ved dreiepunktet`);
  const bare = BP.settledPlaced({ site: free, placed: [P('v1', 'seesaw', 0, 4, 0)], links: [] }, { secs: 1.5 })[0]; assert.ok(Math.abs(bare.rot) < 0.1, 'uten vekt blir den liggende rett');
  // determinisme
  assert.equal(JSON.stringify(BP.settledPlaced({ site, placed: V(0.2618), links: [] })), JSON.stringify(BP.settledPlaced({ site, placed: V(0.2618), links: [] })));
}
console.log('vippe-tester grønne');
