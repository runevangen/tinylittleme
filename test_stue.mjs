// node test_stue.mjs: Nivå 8, Stuen (R62): scenen er à jour med generatoren, brettet har rute/delmål/gåte/byggested, den harde veien går (walk_route), fjernkontrollen åpner skyvedøren
// (boten bærer den til plata), døra stenger veien uten løsning, myke puter, nb/en-tekster med knappenavn, hint-logikk, musikk/palett, nivåvalg og tegnebudsjett.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { stueHint, isStue, stueSummary, STUE } from './stue_logic.js';
import { walkRoute } from './tools/walk_route.mjs';
import { solveGates } from './tools/gate_bot.mjs';
import { checkGoals, GOAL } from './goals.js';
import { checkGates, gatesBudget, initGates, doorById, openAllGates } from './plates_logic.js';
import * as BW from './build_world.js';
import * as BP from './build_phys.js';
import { makeT, DICT_KEYS } from './i18n.js';
import { STORY_LEVELS, storyKey, introKey, INTRO } from './story.js';
import { themeFor, THEMES } from './music.js';
import { gradeTint } from './grade.js';
import { validateScene } from './tools/validate_scene.mjs';
import { KINDS } from './kinds.js';

const lv = (id) => JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8'));
const L = lv('stue'), scene = JSON.parse(fs.readFileSync('scenes/stue.scene.json', 'utf8'));

// 1) scene og brett er à jour med generatoren, og scenen er gyldig
{
  const v = validateScene(scene); assert.deepEqual(v.errors, [], 'scenen er gyldig'); assert.deepEqual(v.warns, [], 'ingen advarsler');
  const before = fs.readFileSync('scenes/stue.scene.json', 'utf8');
  execFileSync('node', ['tools/make_stue.mjs'], { stdio: 'pipe' });
  assert.equal(fs.readFileSync('scenes/stue.scene.json', 'utf8'), before, 'scenes/stue.scene.json er laget av tools/make_stue.mjs (kjør verktøyet på nytt)');
  const out = '/tmp/stue_check.level.json'; execFileSync('node', ['tools/scene2level.mjs', 'scenes/stue.scene.json', out], { stdio: 'pipe' });
  assert.deepEqual(JSON.parse(fs.readFileSync(out, 'utf8')), L, 'levels/stue.level.json er laget av scenen (kjør scene2level på nytt)');
  fs.rmSync(out);
}

// 2) innhold: sofa med myke puter, sofabord, TV-benk, bokhylle, teppe, fjernkontroll, plate, dør, byggested, fiender, 10 smuler
{
  assert.ok(isStue(L) && !isStue(lv('leke')) && !isStue(null));
  const ids = new Set([...L.boxes, ...L.movables, ...(L.decor || [])].map((b) => b.id));
  for (const id of ['sofa', 'sofa_rygg', 'pute_1', 'pute_2', 'bord', 'tv_benk', 'hylle_1', 'hylle_7', 'maal', 'fjernkontroll', 'teppe', 'tv']) assert.ok(ids.has(id), `${id} finnes`);
  for (const id of ['pute_1', 'pute_2']) assert.ok(L.boxes.find((b) => b.id === id).soft, `${id} er myk (myke landinger)`);
  assert.equal(L.collectibles.length, 10, '10 smuler'); assert.equal(L.report.helpers.length, 0, 'ingen hjelpetrinn');
  const kinds = new Set(L.ants.map((a) => a.type || 'ant')); assert.ok(kinds.has('wasp') && kinds.has('ant'), 'veps og bakkefiender');
  for (const a of L.ants) assert.ok(Math.hypot(a.a[0] - L.start[0], a.a[2] - L.start[2]) > 12, `${a.id} ikke ved start`);
  for (const k of ['rug', 'sofa', 'cushion', 'tv', 'remote']) assert.ok(KINDS[k], `kind ${k} er kjent`);
  const rem = L.movables.find((m) => m.id === 'fjernkontroll'); assert.equal(rem.weight, 'light'); assert.ok(Math.max(...rem.max.map((v, i) => v - rem.min[i])) <= 3.4, 'kan bæres');
  const s = stueSummary(L); assert.deepEqual([s.cushions, s.plates, s.doors, s.hasBuild, s.hasRemote], [2, 1, 1, true, true]);
}

// 2b) gulvdetaljer: rommet er stort og fullt av ting, så det har et lavere tak (room.fdetMax) som holder budsjettet
{
  const { detailCount } = await import('./floordetail_logic.js');
  assert.equal(L.room.fdetMax, 118); assert.equal(detailCount(L.room, 'high', 1.6), 118); assert.equal(detailCount({ ...L.room, fdetMax: undefined }, 'high', 1.6), 140, 'andre rom: som før');
  assert.ok(detailCount(L.room, 'high', 1.6) > detailCount(L.room, 'high', 1), 'tetthetsvalget virker fortsatt');
}

// 3) delmål (minst 3), gåte og kobling
{
  assert.deepEqual(checkGoals(L, { levelId: 'stue' }), []); assert.ok(L.goals.length >= 3 && L.goals.length <= GOAL.maxPerLevel, 'minst 3 delmål');
  assert.ok(L.goals.some((g) => g.type === 'gate') && L.goals.some((g) => g.type === 'flag') && L.goals.some((g) => g.type === 'crumbs') && L.goals.some((g) => g.gate), 'delmål: port, bygg, smuler og et som låser målet');
  assert.deepEqual(checkGates(L, { levelId: 'stue' }), [], 'gåten er gyldig');
  const gb = gatesBudget(L); assert.ok(gb.calls <= 12 && gb.tris <= 3000, `gåtebudsjett ${JSON.stringify(gb)}`);
}

// 4) den harde veien: walk_route (hovedveien) går; og døra: uten løsning står den i veien, boten løser gåten med fjernkontrollen
{
  const w = walkRoute('levels/stue.level.json'); assert.ok(w.ok, w.why);
  const closed = JSON.parse(JSON.stringify(L)); initGates(closed); const d = doorById(closed, 'd1'); assert.ok(closed.boxes.includes(d.box), 'lukket skyvedør er en fast boks fra start');
  assert.ok(d.min[2] <= closed.room.z0 + 0.01 && d.max[2] >= closed.room.z1 - 0.01 && d.max[1] >= 50, 'døra går fra vegg til vegg og til taket: ingen vei rundt eller over');
  const closedWalk = walkRoute('levels/stue.level.json', { closedGates: true }); assert.ok(!closedWalk.ok, 'med døra lukket kommer du ikke til målet');
  const g = solveGates('levels/stue.level.json'); assert.ok(g.ok, g.why); assert.deepEqual(g.solved, ['d1']);
  assert.ok(g.log.some((l) => /tok (fjernkontroll|bok_lys)/.test(l)), 'boten bærer en lett ting til plata');
}

// 5) byggestedet: referansebygget består, ruta via bygget går og er kortere, den harde veien er der alltid
{
  const site = L.build.sites[0], gl = L.goals.find((g) => g.type === 'flag'); assert.equal(gl.flag, site.id); assert.ok(!gl.gate && !gl.req, 'bygging er valgfritt');
  assert.equal(BP.runSim({ site, placed: site.ref.placed, links: site.ref.links }).result, 'won'); assert.equal(BP.runSim({ site, placed: [], links: [] }).result, 'lost');
  const route = BW.refRoute(L, site); assert.ok(route, 'ruta via bygget finnes');
  const built = walkRoute(null, { level: L, route, extraBoxes: BW.buildSolids(site, BP.settledPlaced({ site, placed: site.ref.placed, links: site.ref.links })) }); assert.ok(built.ok, built.why);
  assert.ok(!walkRoute(null, { level: L, route }).ok, 'uten bygget går ikke snarveien');
  assert.ok(walkRoute(null, { level: L, extraBoxes: BW.worstSolids(site) }).ok, 'verst tenkelige bygg stenger ikke den harde veien');
}

// 6) hint-logikk: finn fjernkontrollen, bær den til plata, så broen; aldri to ganger, aldri uten grunn
{
  const M = JSON.parse(JSON.stringify(L)); initGates(M); const seen = new Set(), pl = M.gateS.plates[0], pc = [(pl.x0 + pl.x1) / 2, (pl.z0 + pl.z1) / 2], rc = M.movables.find((m) => m.id === 'fjernkontroll');
  const rcx = (rc.min[0] + rc.max[0]) / 2, rcz = (rc.min[2] + rc.max[2]) / 2;
  const me = (x, z, extra = {}) => ({ x, y: 0, z, onGround: true, carry: null, ...extra });
  assert.equal(stueHint(M, me(-60, 0), seen), null, 'langt unna: ingenting');
  assert.equal(stueHint(M, me(rcx + 3, rcz), seen), 'stue.remote'); seen.add('stue.remote'); assert.equal(stueHint(M, me(rcx + 3, rcz), seen), null, 'bare én gang');
  assert.equal(stueHint(M, me(pc[0] - 4, pc[1])), 'stue.door', 'ved plata uten noe å bære');
  assert.equal(stueHint(M, me(pc[0] - 4, pc[1], { carry: { id: 'fjernkontroll' } })), 'stue.plate', 'bærer fjernkontrollen');
  assert.equal(stueHint(M, { ...me(pc[0], pc[1]), onGround: false }), null, 'ikke i lufta');
  const d = M.gateS.doors[0]; d.latched = true; d.t = 1; const site = M.build.sites[0];
  assert.equal(stueHint(M, me(site.x, site.z, { y: site.y })), 'stue.build', 'når døra er åpen: broen');
  assert.equal(stueHint(M, me(site.x, site.z, { y: site.y }), new Set(), true), null, 'ikke etter at broen er bygd');
  assert.equal(stueHint(lv('leke'), me(0, 0)), null, 'bare i Stuen');
}

// 7) tekster (nb/en, knappenavn), fortelling, musikk og palett, nivåvalg og modul i index.html
{
  assert.equal(STORY_LEVELS, 8); assert.equal(storyKey(8), 'story.8'); assert.equal(INTRO[8].hint, 'intro.hint.8'); assert.equal(introKey(8), 'intro.hint.8');
  let lang = 'nb'; const { T } = makeT(() => lang);
  for (const l of ['nb', 'en']) { lang = l;
    for (const k of ['story.title.8', 'story.8', 'intro.hint.8', 'stue.remote', 'stue.plate', 'stue.door', 'stue.build']) { const t = T(k, { jump: 'HOPP', grab: 'GREP', take: 'TA' }); assert.notEqual(t, k, `${l}:${k}`); assert.ok(!/\{\w+\}/.test(t), `${l}:${k} variabler fylt`); assert.ok(!/\b(mellomrom|space|shift|tast|key)\b/i.test(t), `${l}:${k} nevner ikke taster`); }
    assert.ok(/TA/.test(T('stue.remote', { take: 'TA' })) && /BYGG|BUILD/.test(T('stue.build')), 'hintene nevner knappene'); }
  assert.deepEqual(DICT_KEYS.nb.filter((k) => /stue\./.test(k)).sort(), DICT_KEYS.en.filter((k) => /stue\./.test(k)).sort());
  assert.equal(themeFor(L).id, 'stue'); assert.ok(THEMES.stue.bpm < THEMES.leke.bpm, 'egen, roligere musikk'); assert.ok(gradeTint('stue', 'wall:plaster'), 'egen palett');
  const main = fs.readFileSync('main.js', 'utf8'), html = fs.readFileSync('index.html', 'utf8');
  assert.ok(/\{ id: 'stue', n: 8,/.test(main), 'nivå 8 ligger i LEVELS rett etter lekerommet'); assert.ok(main.indexOf("id: 'leke', n: 7") < main.indexOf("id: 'stue', n: 8"));
  assert.ok(/fl\('stuehint', 'hjelp'/.test(main) && /logEv\('stue'/.test(main), 'innstilling og logg');
  assert.ok(/'stue_logic'/.test(html), 'modulen ligger i files i index.html');
  assert.ok(STUE.plateNear > 0);
}
console.log('stue-tester grønne');
