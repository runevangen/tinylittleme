// node test_lekerom.mjs: R31, nivå 7 Lekerommet. Brettet (rute, delmål, byggested, verktøy-gåte, egen fiende), legoknotter (plan, budsjett, tegning), tinnsoldaten, tekster og innstillinger.
// Ekte FPS på telefon er ikke målt her: beviset er statisk (antall tegnekall og trekanter etter oppbygging).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { register } from 'node:module';
import { LEGO, isLekerom, hexInt, floorBlocks, studGrid, studPlan, marchPose, SOLDIER, isSoldier } from './lekerom_logic.js';
import { makeT, DICT_KEYS } from './i18n.js';
import { themeFor, THEMES } from './music.js';
import { gradeTint } from './grade.js';
import { INTRO, STORY_LEVELS, storyKey } from './story.js';
import { checkGoals, GOAL } from './goals.js';
import { walkRoute, walkShortcut } from './tools/walk_route.mjs';
import { shortcutsOf } from './shortcut.js';
import * as BW from './build_world.js';

const lv = (id) => JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8'));
const L = lv('leke');

// 1) scenen og brettet er laget av verktøyene (ingen håndredigering): kjør dem på nytt og få det samme
{
  const sceneBefore = fs.readFileSync('scenes/leke.scene.json', 'utf8');
  execFileSync('node', ['tools/make_leke.mjs']); assert.equal(fs.readFileSync('scenes/leke.scene.json', 'utf8'), sceneBefore, 'scenes/leke.scene.json er utdatert: kjør node tools/make_leke.mjs');
  const tmp = fs.mkdtempSync('/tmp/leke-') + '/l.level.json'; execFileSync('node', ['tools/scene2level.mjs', 'scenes/leke.scene.json', tmp]);
  assert.deepEqual(JSON.parse(fs.readFileSync(tmp, 'utf8')), L, 'levels/leke.level.json er utdatert: kjør node tools/scene2level.mjs scenes/leke.scene.json levels/leke.level.json');
}

// 2) nivå 7 i nivålista (main.js), story, intro, tekster
{
  const main = fs.readFileSync('main.js', 'utf8');
  assert.ok(/\{ id: 'leke', n: 7,/.test(main), 'nivå 7 ligger i LEVELS');
  assert.equal(STORY_LEVELS, 8); assert.equal(storyKey(7), 'story.7'); assert.equal(INTRO[7].hint, 'intro.hint.7');
  let lang = 'nb'; const { T } = makeT(() => lang);
  for (const l of ['nb', 'en']) { lang = l; for (const k of ['story.title.7', 'story.7', 'intro.hint.7', 'leke.soldier']) { const s = T(k, { jump: 'HOPP', grab: 'GREP', take: 'TA' }); assert.notEqual(s, k, `${l}:${k}`); assert.ok(!/\{\w+\}/.test(s), `${l}:${k} plassholdere`); assert.ok(!/\b(mellomrom|space|tast|shift)\b/i.test(s), `${l}:${k} nevner taster`); } }
  assert.deepEqual(DICT_KEYS.nb.filter((k) => /leke\./.test(k)).sort(), DICT_KEYS.en.filter((k) => /leke\./.test(k)).sort());
  assert.ok(/'win\.all': 'Alle åtte/.test(fs.readFileSync('i18n.js', 'utf8')));
  assert.equal(themeFor(L).id, 'leke'); assert.ok(THEMES.leke.bpm > THEMES.kjokken.bpm, 'egen musikk, raskere marsj');
  assert.ok(gradeTint('leke', 'wall:plaster'), 'egen palett');
}

// 3) brettet: rute, delmål, byggested, verktøy-gåte, ingen hjelpetrinn
{
  assert.equal(L.report.helpers.length, 0); const w = walkRoute('levels/leke.level.json'); assert.ok(w.ok, w.why);
  assert.deepEqual(checkGoals(L, { levelId: 'leke' }), []); assert.ok(L.goals.length >= GOAL.minPerLevel && L.goals.length <= GOAL.maxPerLevel && L.goals.length >= 2);
  assert.ok(L.goals.some((g) => g.type === 'flag') && L.goals.some((g) => g.type === 'crumbs') && L.goals.some((g) => g.type === 'stomp') && L.goals.some((g) => g.gate), 'delmål: bygg, smuler, knus, en som låser målet');
  const sc = shortcutsOf(L); assert.equal(sc.length, 1, 'én verktøy-gåte'); const ws = walkShortcut('levels/leke.level.json', sc[0]); assert.ok(ws.ok, ws.why); assert.ok(!ws.noTool.ok && ws.withTool.secs < ws.plain.secs);
  assert.equal(L.build.sites.length, 1); assert.ok(BW.refRoute(L, L.build.sites[0]), 'byggestedet har en rute til målet');
  assert.ok(L.collectibles.length >= 6, 'nok smuler til delmålet');
  // egen fiende: tinnsoldater (skin soldier), og de går fritt (test_scene sjekker banen)
  const sol = L.ants.filter(isSoldier); assert.ok(sol.length >= 2 && sol.length === L.ants.length, 'tinnsoldater som eneste vakter');
  for (const a of sol) assert.ok(Math.hypot(a.a[0] - L.start[0], a.a[2] - L.start[2]) > 12 && Math.hypot(a.b[0] - L.start[0], a.b[2] - L.start[2]) > 12, 'ikke ved start');
}

// 4) legoknotter: plan og budsjett (statisk, ingen GPU)
{
  assert.ok(isLekerom(L) && !isLekerom(lv('kjokken2')) && !isLekerom(null), 'bare lekerommet har knotter');
  assert.equal(hexInt('#ff0000'), 0xff0000); assert.equal(hexInt('tull'), 0x46bb6c); assert.equal(hexInt(0x123456), 0x123456);
  const p = studPlan(L); assert.ok(p.floor.length > 300 && p.ceil.length > 100, `knotter på både gulv og tak (${p.floor.length}/${p.ceil.length})`);
  assert.ok(p.floor.length <= LEGO.maxFloor && p.ceil.length <= LEGO.maxCeil && p.tris <= LEGO.budget.tris, `budsjett: ${p.studs} knotter, ${p.tris} trekanter (maks ${LEGO.budget.tris})`);
  assert.deepEqual(studPlan(L), p, 'deterministisk');
  const mid = studPlan(L, { quality: 'mid' }), many = studPlan(L, { density: 1.6 }), few = studPlan(L, { density: 0.5 });
  assert.ok(mid.studs < p.studs && few.studs < p.studs && many.studs >= p.studs, 'Lav profil og tetthet virker'); assert.ok(many.tris <= LEGO.budget.tris, 'også på «Mange»');
  // knottene står ikke under klosser (gulv), og er innenfor rommet
  const blocks = floorBlocks(L); for (const s of p.floor) { assert.ok(!blocks.some((r) => s.x > r[0] && s.x < r[1] && s.z > r[2] && s.z < r[3]), `knott under kloss ved ${s.x},${s.z}`); assert.ok(s.x > L.room.x0 && s.x < L.room.x1 && s.z > L.room.z0 && s.z < L.room.z1); }
  const colors = new Set(p.floor.map((s) => s.c)); assert.ok(colors.size >= 3, 'fargede plater i gulvet'); assert.ok(p.floor.some((s) => s.c === 0xe8453c), 'rød plate ved start');
  assert.deepEqual(studGrid({ room: { x0: 0, x1: 1, z0: 0, z1: 1 } }, 'ceil', { pitch: 1, max: 9 }), [], 'rom uten plass: ingen knotter'); assert.ok(studGrid(L, 'ceil', { pitch: 0.2, max: 50 }).length <= 50, 'pitch økes til antallet passer');
  assert.deepEqual(studPlan({ boxes: [] }), { floor: [], ceil: [], studs: 0, tris: 0, pitch: 0 });
}

// 5) tinnsoldaten marsjerer: hvile uten fart, motsatte ben og armer, duving
{
  const r = marchPose(1.3, 0); assert.ok([r.legL, r.legR, r.armL, r.armR, r.bob].every((v) => v === 0), 'hvile');
  const m = marchPose(0.5, 1.5); assert.ok(Math.abs(m.legL + m.legR) < 1e-9 && Math.abs(m.armL + m.armR) < 1e-9, 'motsatte ben og armer'); assert.ok(m.legL * m.armL < 0, 'arm og ben på samme side svinger motsatt');
  assert.ok(Math.abs(m.legL) <= SOLDIER.legSwing + 1e-9 && m.bob >= 0 && m.bob <= SOLDIER.bob + 1e-9);
  assert.ok(Math.abs(marchPose(0.5, 0.3).legL) < Math.abs(m.legL), 'saktere gir mindre sving');
}

// 6) innstillinger og logg i main.js (SETTINGS i riktig gruppe, logEv for viktige hendelser), modulene i index.html
{
  const main = fs.readFileSync('main.js', 'utf8'), html = fs.readFileSync('index.html', 'utf8');
  assert.ok(/fl\('lego', 'spill',/.test(main) && /sl\('legodens', 'admin',/.test(main), 'valg: legoknotter (spill) og tetthet (admin)');
  assert.ok(/logEv\('lekerom'/.test(main) && /logEv\('legoknotter'/.test(main) && /tinnsoldat knust/.test(main), 'hendelser logges');
  for (const f of ['lekerom_logic', 'lekerom_view']) assert.ok(html.includes(`'${f}'`), `${f} i lista i index.html`);
  assert.ok(/docs\/INNSTILLINGER/.test('docs/INNSTILLINGER') && /Legoknotter/.test(fs.readFileSync('docs/INNSTILLINGER.md', 'utf8')), 'dokumentert i docs/INNSTILLINGER.md');
}

// 7) tegning med ekte three: to tegnekall (gulv og tak), under budsjett, og soldaten kan animeres og klemmes flat
{
  register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { return s === 'three' ? { url: ${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)}, shortCircuit: true } : n(s, c); }`));
  const THREE = await import('./lib/three.module.min.js'), { makeLekerom, buildSoldier, studGeometry } = await import('./lekerom_view.js');
  const sg = studGeometry(); assert.equal(sg.attributes.position.count / 3, LEGO.trisPerStud, '18 trekanter per knott');
  for (const [q, dens] of [['high', 1], ['high', 1.6], ['mid', 1]]) {
    const scene = new THREE.Scene(), lk = makeLekerom({ scene, LEVEL: L, floorY: 0, quality: q, density: dens });
    let calls = 0, inst = 0, tris = 0; lk.group.traverse((o) => { if (o.isMesh) { calls++; inst += o.count ?? 1; tris += (o.count ?? 1) * o.geometry.attributes.position.count / 3; } });
    assert.ok(calls <= LEGO.budget.calls && calls === lk.calls, `${q}/${dens}: ${calls} tegnekall (maks ${LEGO.budget.calls})`); assert.ok(tris <= LEGO.budget.tris && tris === lk.tris && inst === lk.count, `${q}/${dens}: ${tris} trekanter (maks ${LEGO.budget.tris})`);
    lk.update(false); assert.ok(!lk.group.visible); lk.update(true); assert.ok(lk.group.visible);
    if (q === 'high' && dens === 1) console.log(`lekerom budsjett (statisk, uten GPU): ${lk.count} knotter, ${calls} tegnekall, ${tris} trekanter (maks ${LEGO.budget.calls} / ${LEGO.budget.tris}). Ekte FPS: testes på iPhone`);
  }
  const empty = makeLekerom({ scene: new THREE.Scene(), LEVEL: lv('kjokken2') }); assert.equal(empty.count, 0); assert.equal(empty.calls, 0);
  const s = buildSoldier(); s.update(1.2, 1.5, 0, false); s.update(1.2, 1.5, 0.5, true); assert.ok(s.root.scale.y < 1, 'klemt flat når den er knust'); let meshes = 0; s.root.traverse((o) => { if (o.isMesh) meshes++; }); assert.ok(meshes > 10 && meshes < 60, `soldat: ${meshes} deler`);
}
console.log('lekerom-tester grønne');
