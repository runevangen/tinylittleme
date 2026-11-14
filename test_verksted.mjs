// node test_verksted.mjs: R63, nivå 9 Verkstedet. Brettet (laget av verktøyene), glatte flater (gli uten grep, gripbar kant virker), vektgåten (to plater, porten stenger hovedveien),
// tape-broen (trenger tape, snarvei forbi gåten), sykkeldekket som ruller, nivårekkefølgen (nivå 8 kan mangle), avslutningen etter siste nivå, tekster og innstillinger.
// Ekte FPS og følelsen av å gli er ikke målt her (miljøet har ingen GPU): beviset er fysikken i node og statiske tall.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { P, newPlayer, step, applyPreset, initBodies } from './physics.js';
import { createSlickTracker, slickBoxes, slickPatches, weightBalance, nextLevelOf, isLastLevel, lastLevelN, isVerksted, SLICK } from './workshop_logic.js';
import { GATE, checkGates, hasGates, initGates } from './plates_logic.js';
import { checkGoals, GOAL } from './goals.js';
import { makeT, DICT_KEYS } from './i18n.js';
import { themeFor, THEMES } from './music.js';
import { gradeTint } from './grade.js';
import { STORY_NS, storyKey, INTRO, introKey, finishData } from './story.js';
import { createToyLife, stepToys, ROUND_KINDS, TOY_KINDS } from './toys_live.js';
import { walkRoute } from './tools/walk_route.mjs';
import { solveGates } from './tools/gate_bot.mjs';
import { botSolve } from './tools/bot.mjs';
import { validateScene } from './tools/validate_scene.mjs';
import * as BP from './build_phys.js';
import * as BW from './build_world.js';

const lv = (id) => JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8'));
const L = lv('verksted'), main = fs.readFileSync('main.js', 'utf8');
const ux = (x) => x / 5 - 70, uz = (z) => z / 5 - 26;   // cm -> enheter i dette rommet (700 x 260 cm, origo i midten)
const pl = (id) => L.gates.plates.find((q) => q.id === id), box = (id) => L.boxes.find((b) => b.id === id);

// 1) scenen og brettet er laget av verktøyene (ingen håndredigering)
{
  const sceneBefore = fs.readFileSync('scenes/verksted.scene.json', 'utf8');
  execFileSync('node', ['tools/make_verksted.mjs']); assert.equal(fs.readFileSync('scenes/verksted.scene.json', 'utf8'), sceneBefore, 'scenes/verksted.scene.json er utdatert: kjør node tools/make_verksted.mjs');
  const tmp = fs.mkdtempSync('/tmp/verksted-') + '/l.level.json'; execFileSync('node', ['tools/scene2level.mjs', 'scenes/verksted.scene.json', tmp]);
  assert.deepEqual(JSON.parse(fs.readFileSync(tmp, 'utf8')), L, 'levels/verksted.level.json er utdatert: kjør node tools/scene2level.mjs scenes/verksted.scene.json levels/verksted.level.json');
  const v = validateScene(JSON.parse(sceneBefore)); assert.deepEqual(v.errors, []); assert.deepEqual(v.warns, [], 'scenen validerer uten advarsler');
  assert.equal(L.report.helpers.length, 0, 'ingen hjelpetrinn: rommet er bygd for hånd'); assert.ok(L.report.solvable_by_graph);
}

// 2) nivå 9 i nivålista, fortelling, intro, tekster (nb og en), musikk, palett, modulen i index.html
{
  assert.ok(/\{ id: 'verksted', n: 9,/.test(main), 'nivå 9 ligger i LEVELS');
  assert.ok(STORY_NS.includes(9) && storyKey(9) === 'story.9' && INTRO[9].hint === 'intro.hint.9' && introKey(9) === 'intro.hint.9');
  let lang = 'nb'; const { T } = makeT(() => lang);
  for (const l of ['nb', 'en']) { lang = l; for (const k of ['story.title.9', 'story.9', 'intro.hint.9', 'slick.hint', 'win.all', 'story.end']) { const s = T(k, { jump: 'HOPP', grab: 'GREP', take: 'TA' }); assert.notEqual(s, k, `${l}:${k}`); assert.ok(!/\{\w+\}/.test(s), `${l}:${k} variabler fylt`); }
    assert.ok(!/\b(mellomrom|space|shift|tast)\b/i.test(T('intro.hint.9')), 'introhintet nevner knapper, ikke taster'); }
  assert.ok(T('story.end').length > 20); lang = 'nb'; assert.ok(!/syv/.test(T('win.all')), 'ikke «syv nivåer»: spillet har flere');
  assert.deepEqual(DICT_KEYS.nb.filter((k) => /slick\./.test(k)).sort(), DICT_KEYS.en.filter((k) => /slick\./.test(k)).sort());
  assert.equal(themeFor(L).id, 'verksted'); assert.ok(THEMES.verksted.bpm < THEMES.leke.bpm, 'egen, roligere musikk'); assert.ok(isVerksted(L) && !isVerksted(lv('leke')) && !isVerksted(null));
  assert.ok(gradeTint('verksted', 'wall:plaster'), 'egen palett');
  assert.ok(fs.readFileSync('index.html', 'utf8').includes("'workshop_logic'"), 'workshop_logic.js ligger i files i index.html');
}

// 3) delmål, fiender, smuler, byggested
{
  assert.deepEqual(checkGoals(L, { levelId: 'verksted' }), []); assert.ok(L.goals.length >= GOAL.minPerLevel && L.goals.length <= GOAL.maxPerLevel && L.goals.length >= 3, 'minst tre delmål');
  assert.ok(L.goals.some((g) => g.type === 'crumbs') && L.goals.some((g) => g.type === 'gate') && L.goals.some((g) => g.type === 'flag') && L.goals.some((g) => g.gate), 'delmål: smuler, port, bygg, og ett som låser målet');
  assert.equal(L.collectibles.length, 10, '10 smuler'); assert.ok(L.ants.some((a) => a.type === 'wasp') && L.ants.some((a) => !a.type), 'veps og bakkefiender');
  for (const a of L.ants) assert.ok(Math.hypot(a.a[0] - L.start[0], a.a[2] - L.start[2]) > 12 && Math.hypot(a.b[0] - L.start[0], a.b[2] - L.start[2]) > 12, 'ikke ved start');
  assert.equal(L.build.sites.length, 1); assert.ok(L.build.parts.some((q) => q.type === 'ruler') && L.build.parts.some((q) => q.type === 'pencil') && L.build.parts.filter((q) => q.type === 'plank_l').length >= 2, 'verktøykassa: linjal, blyant og planker som byggedeler');
  assert.ok(L.start[0] < L.goal[0] && L.audio.theme === 'verksted');
  assert.ok(L.boxes.every((b) => b.min[0] >= L.room.x0 - 1.01 && b.max[0] <= L.room.x1 + 1.01 && b.min[2] >= L.room.z0 - 1.01 && b.max[2] <= L.room.z1 + 1.01), 'alt ligger inne i rommet');
  for (const m of L.movables) assert.ok(m.min[2] >= L.room.z0 && m.max[2] <= L.room.z1 && m.min[0] >= L.room.x0 && m.max[0] <= L.room.x1, `${m.id} ligger i rommet`);
}

// 4) glatte flater: oljeflekk på gulvet og det oljede verktøykasse-lokket
{
  const patches = slickPatches(L); assert.deepEqual(patches.map((q) => q.id).sort(), ['olje_1', 'verktoykasse']); assert.ok(patches.some((q) => q.onFloor) && patches.some((q) => !q.onFloor && q.top > 3), 'både en flekk på gulvet og en glatt topp');
  assert.equal(slickBoxes(L).length, 2, 'gulvet selv er ikke glatt (bare flekkene)'); assert.ok(!L.room.floor.slick);
  applyPreset('mario'); Object.assign(P, { edgeGuard: false, autoJump: false, magnet: false });
  const hero = (lvl, x, y, z) => { const p = newPlayer(x, y, z), idle = { mx: 0, mz: 0 }; for (let i = 0; i < 30; i++) step(p, idle, 1 / 60, lvl); return p; };
  const fresh = () => { const l = JSON.parse(JSON.stringify(L)); initBodies(l); return l; };
  // (a) gli uten grep: samme løp og samme stopp, men tre ganger lenger på oljen enn på tørt gulv
  const slideDist = (x0, z0) => { const l = fresh(), p = hero(l, x0, 0, z0); let t = 0; const x1 = p.x; for (; t < 60; t++) step(p, { mx: 1, mz: 0 }, 1 / 60, l); const xr = p.x, onSlick = !!p.groundBox?.slick; for (let i = 0; i < 240; i++) step(p, { mx: 0, mz: 0 }, 1 / 60, l); return { run: xr - x1, stop: p.x - xr, onSlick, v: Math.hypot(p.vx, p.vz) }; };
  const dry = slideDist(ux(30), uz(245)), oil = slideDist(ux(70), uz(100));   // tørt gulv sør for flekken, og på flekken (x 70–175 cm)
  assert.ok(!dry.onSlick && oil.onSlick || oil.stop > 0, 'startet på riktig underlag');
  assert.ok(oil.stop > dry.stop * 2.5 && oil.stop > 1.2, `sklir mye lenger på oljen (${oil.stop.toFixed(2)} mot ${dry.stop.toFixed(2)} enheter)`);
  // (b) bremsene virker nesten ikke: å snu mot farten tar lang tid på oljen
  { const l = fresh(), p = hero(l, ux(80), 0, uz(100)); for (let i = 0; i < 40; i++) step(p, { mx: 1, mz: 0 }, 1 / 60, l); const v0 = p.vx; for (let i = 0; i < 12; i++) step(p, { mx: -1, mz: 0 }, 1 / 60, l); assert.ok(p.vx > v0 * 0.3, `fortsatt fart fremover etter 0,2 s mot (${p.vx.toFixed(2)} av ${v0.toFixed(2)})`); }
  // (c) gripbar kant: stå på det glatte lokket, hold GREP mot fillen og hiv deg opp på benken (grep virker selv om underlaget er glatt)
  { const l = fresh(), kasse = box('verktoykasse'), fille = box('fille'), benk = box('benk_v'); assert.ok(kasse.slick && fille.grip && fille.onto === 'benk_v' && !fille.slick, 'lokket er glatt, fillen er gripbar og ikke glatt');
    const p = hero(l, kasse.max[0] - 0.6, kasse.max[1], (fille.min[2] + fille.max[2]) / 2); assert.ok(p.groundBox?.slick && p.onGround, 'står på det glatte lokket');
    let climbed = false; for (let i = 0; i < 60 * 14 && !(p.onGround && Math.abs(p.y - benk.max[1]) < 0.06); i++) { if (p.state === 'hang') step(p, { jumpPressed: i % 20 === 0 }, 1 / 60, l); else if (p.state === 'mantle') step(p, {}, 1 / 60, l); else if (p.state === 'climb') { climbed = true; step(p, { mx: -p.climb.nx, mz: -p.climb.nz }, 1 / 60, l); } else if (p.onGround && Math.abs(p.y - benk.max[1]) < 0.06) step(p, { mx: 1, mz: 0 }, 1 / 60, l); else step(p, { mx: 1, mz: 0, grabPressed: i % 30 === 0, grabHeld: true }, 1 / 60, l); }
    assert.ok(climbed, 'går inn i klatring fra en glatt flate'); assert.ok(p.onGround && Math.abs(p.y - benk.max[1]) < 0.06 && p.x > fille.min[0], `kom opp på benken (y=${p.y.toFixed(2)}, ${p.state})`); }
  // (d) sporeren: begynner å gli, logger én gang (kjølig), og melder fast grunn igjen
  { const l = fresh(), p = hero(l, ux(72), 0, uz(100)), tr = createSlickTracker(), ev = []; for (let i = 0; i < 200; i++) { step(p, { mx: i < 120 ? 1 : 0, mz: 0 }, 1 / 60, l); ev.push(...tr.update(p, 1 / 60)); }
    assert.ok(ev.some((e) => e.type === 'glir' && e.id === 'olje_1'), 'glir-hendelse på oljeflekken'); assert.equal(ev.filter((e) => e.type === 'glir').length, 1, 'bare én glir-linje per runde'); assert.ok(SLICK.logCool >= 1);
    for (let i = 0; i < 300; i++) { step(p, { mx: 1, mz: 0 }, 1 / 60, l); ev.push(...tr.update(p, 1 / 60)); } assert.ok(ev.some((e) => e.type === 'grep'), 'melder fast grunn når du er av flekken');
    assert.deepEqual(createSlickTracker().update(null, 1 / 60), [], 'tåler manglende figur'); }
  // (e) innstillinger og logg i spillet
  assert.ok(main.includes("rg('slickaccel', 'admin'") && main.includes("fl('slickhint', 'hjelp'") && /logEv\('glatt'/.test(main) && main.includes('createSlickTracker()') && main.includes('slickEvent('), 'innstillinger (admin: grep, hjelp: hint) og logEv(glatt)');
  assert.ok(P.slickAccel > 0 && P.slickAccel < P.accel / 3, 'glatt flate har mye lavere akselerasjon enn vanlig');
  // (f) tegningen: readable_view tegner alle bokser med slick (glansstriper og ✕), ikke bare gulvet
  assert.ok(/!b\.slick \|\| b\.dyn/.test(fs.readFileSync('readable_view.js', 'utf8')));
}

// 5) vektgåten: to plater, fem mutre, porten stenger hovedveien
{
  assert.deepEqual(checkGates(L, { levelId: 'verksted' }), []); assert.ok(hasGates({ gateS: { plates: L.gates.plates, doors: [], switches: [] } }));
  assert.equal(L.gates.plates.length, 2); assert.ok(L.gates.plates.every((q) => q.need > GATE.hero), 'begge plater er for tunge for figuren alene'); assert.notEqual(pl('pv').need, pl('ph').need, 'ulik vekt: man må balansere');
  assert.deepEqual(L.gates.doors.map((d) => [d.id, d.needs.join('+'), !!d.latch]), [['port', 'pv+ph', false]], 'porten åpner bare når begge plater er trykket ned samtidig');
  const wb = weightBalance(L); assert.ok(wb.solvable && wb.items.length === 5 && wb.need === 10 && wb.slack === 0, `fem mutre à 2: nøyaktig nok til begge plater (${JSON.stringify(wb)})`); assert.ok(wb.wrong > 0, 'det finnes feil fordelinger'); assert.ok(wb.tight);
  assert.ok(L.movables.filter((m) => m.kind === 'nut').every((m) => m.weight === 'light' && Math.max(...m.max.map((v, i) => v - m.min[i])) <= 3.4), 'mutrene kan bæres (TA)');
  const broken = JSON.parse(JSON.stringify(L)); broken.movables = broken.movables.filter((m) => m.id !== 'mutter_5'); assert.ok(!weightBalance(broken).solvable, 'uten den femte mutteren går ikke platene opp');
  const from = [ux(380), box('benk_v').max[1], uz(100)];
  const r = solveGates('levels/verksted.level.json', { from }); assert.ok(r.ok, r.why); assert.deepEqual(r.solved, ['port'], 'boten fordeler mutrene med ekte fysikk og går gjennom porten'); assert.ok(r.log.some((l) => /plate pv trykket/.test(l)) && r.log.some((l) => /plate ph trykket/.test(l)));
  assert.ok(!solveGates(null, { level: broken, from }).ok, 'uten den femte mutteren klarer ikke boten gåten');
  const open = walkRoute('levels/verksted.level.json'); assert.ok(open.ok, open.why);
  const closed = walkRoute('levels/verksted.level.json', { closedGates: true }); assert.ok(!closed.ok, 'ruta går IKKE med porten lukket: gåten stenger hovedveien på ekte');
  assert.ok(L.route.some((n) => n.id === 'benk_v') && L.route.some((n) => n.id === 'benk_o') && L.route.some((n) => n.id === 'vegg_o'), 'hovedveien: benken (vest og øst for porten) og verktøyveggen i øst');
  assert.ok(!L.route.some((n) => n.id === 'vegg_v' || n.id === 'hylle_v'), 'verktøyvegg 1 er byggestedets vei, ikke hovedveien');
}

// 6) byggingen: tape trengs, og broen er snarveien forbi gåten (alltid en hard vei uten bygging: hovedveien)
{
  const site = L.build.sites[0], ref = site.ref, links = ref.links || [];
  assert.ok(links.length >= 1 && links.every((l) => l.kind === 'tape'), 'referansebygget bruker tape');
  assert.equal(BP.runSim({ site, placed: ref.placed, links }).result, 'won', 'to planker teipet sammen bærer figuren');
  assert.equal(BP.runSim({ site, placed: ref.placed, links: [] }).result, 'lost', 'uten tape holder det ikke');
  assert.equal(BP.runSim({ site, placed: [ref.placed[0]], links: [] }).result, 'lost', 'én lang planke rekker ikke over'); assert.equal(BP.runSim({ site, placed: [], links: [] }).result, 'lost');
  const bot = botSolve('levels/verksted.level.json'); assert.equal(bot.verdict, 'BESTÅR_STRENG', JSON.stringify(bot.review)); assert.deepEqual(bot.plans.map((p) => p.id), ['ruta', 'bygg:verksted1'], 'boten beviser hovedveien (gåten) og byggesnarveien');
  for (const p of bot.plans) assert.ok(p.streng.ok && p.løs.ok, p.id);
  const route = BW.refRoute(L, site); assert.ok(route && route.some((n) => n.id === 'vegg_v') && !route.some((n) => n.id === 'benk_o'), 'snarveien går forbi hele benkens østre del og porten');
  // porten kan ikke hoppes over fra hylla: avstanden fra kanten til porten er for lang for et hopp
  const door = L.gates.doors[0], shelf = box('hylle_v'); assert.ok(door.min[0] - shelf.max[0] > 9, `porten ligger langt fra hylle 1 (${(door.min[0] - shelf.max[0]).toFixed(1)} enheter)`); assert.ok(door.max[1] < shelf.max[1] - 0.5, 'broen går over porten');
}

// 7) sykkeldekket ruller (kuleformet, dyttes og bæres)
{
  assert.ok(ROUND_KINDS.includes('tire') && TOY_KINDS.includes('tire')); const m = L.movables.find((q) => q.kind === 'tire'); assert.ok(m && m.round && m.weight === 'light', 'dekket er et rundt, lett, løst legeme');
  const l = JSON.parse(JSON.stringify(L)); initBodies(l); const S = createToyLife(l), p = newPlayer(m.min[0] - 2.2, 0, (m.min[2] + m.max[2]) / 2); p.fx = 1; p.fz = 0;
  for (let i = 0; i < 30; i++) { step(p, { mx: 0, mz: 0 }, 1 / 60, l); stepToys(S, l, p, 1 / 60); }
  const t = S.toys.get('dekk_1'), x0 = t.x; for (let i = 0; i < 120; i++) { step(p, { mx: 1, mz: 0 }, 1 / 60, l); stepToys(S, l, p, 1 / 60); }
  assert.ok(t.x > x0 + 1 && t.spin > 0.5 && Math.abs(t.yaw) < 0.2, `dekket ruller fremover og snurrer (flyttet ${(t.x - x0).toFixed(1)}, spinn ${t.spin.toFixed(1)})`);
  const tv = fs.readFileSync('toys_view.js', 'utf8'); assert.ok(/\n  tire\(sx, sy, sz, o\)/.test(tv) && /kind === 'tire'/.test(tv), 'tegning og animasjon finnes');
}

// 8) nivårekkefølge og avslutning etter siste nivå
{
  const ids = [...main.matchAll(/\{ id: '([a-z0-9]+)', n: (\d+),/g)].map((q) => ({ id: q[1], n: +q[2] })); assert.deepEqual(ids.map((q) => q.n), [1, 2, 3, 4, 5, 6, 7, 9]);
  assert.equal(nextLevelOf(ids, 7).id, 'verksted', 'neste nivå etter lekerommet (nivå 8 kan mangle)'); assert.equal(nextLevelOf(ids, 9), null); assert.equal(nextLevelOf(ids, 0).n, 1); assert.equal(nextLevelOf(ids, undefined), null);
  assert.equal(nextLevelOf([...ids, { id: 'stue', n: 8 }], 7).id, 'stue', 'kommer nivå 8 til, tas den imellom'); assert.equal(nextLevelOf([...ids, { id: 'stue', n: 8 }], 8).id, 'verksted');
  assert.ok(isLastLevel(ids, 9) && !isLastLevel(ids, 7) && !isLastLevel(ids, undefined) && lastLevelN(ids) === 9);
  assert.ok(main.includes('nextLevelOf(LEVELS, levelInfo.n)'), 'main.js bruker nextLevelOf');
  const d = finishData({ n: 9, nextExists: false, clock: 120, stats: { squashed: 1 }, crumbs: 10, crumbTotal: 10, points: 100, prevBest: 0, flew: false }); assert.ok(d.last, 'siste nivå gir avslutningen');
  assert.ok(/win\.ending/.test(main) && main.includes('showEnding') && main.includes("T('win.all')"), 'målskjermen viser «alle nivåene klart» og knappen til avslutningen');
}
console.log('verksted-tester grønne');
