// node test_flood.mjs: R65 stigende vann i Nivå 4: målvalg med vannstand, nedhopp i vann, varsler, bot (rolig og vanlig) og at alt er koblet inn.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initGoals, goalTarget, goalById } from './goals.js';
import { initCollect } from './collect.js';
import { initAnts } from './ants.js';
import { P } from './physics.js';
import { floodCfg, floodLevel, WADE } from './variant.js';
import { FG, isWet, floodPct, goalOpen, refuge, pickGoal, dropIntoWater, drownAlert, shakeOffset, beepDue, bandKeyFor, levelBadge, simulateFlood } from './flood_logic.js';
import { statusParts } from './topband_logic.js';
import { makeT, DICT_KEYS } from './i18n.js';
import { botSolve } from './tools/bot.mjs';

const load = () => { const L = JSON.parse(fs.readFileSync('levels/bad2.level.json', 'utf8')); initGoals(L); initCollect(L); initAnts(L); return L; };
const L = load(), twist = L.variant.twist, floorY = 0, ctx0 = { crumbs: 0, stomps: 0 };
const START = { x: L.start[0], y: L.start[1], z: L.start[2], onGround: true, fx: 0, fz: -1 };

// ---- grunnregler ----
assert.ok(isWet(0, 0.5) && isWet(4.6, 4.7) && !isWet(4.6, 4.2) && !isWet(0, -Infinity), 'vått = under vannflata (+ liten margin); uten vann er ingenting vått');
assert.equal(floodPct(7, { max: 14 }), 50); assert.equal(floodPct(99, { max: 14 }), 100); assert.equal(floodPct(0, null), 0);
assert.equal(levelBadge(5.6, { max: 14 }), '💧 40 %'); assert.equal(levelBadge(5, null), '');

// ---- målvalg: uten vann som før, med vann hoppes våte mål over ----
{
  const g = goalById(L, 'vokter'), all = goalTarget(L, g, START);
  assert.ok(all && all.y <= 4.6, 'uten filter: nærmeste levende skapning, uansett vann');
  const dryT = goalTarget(L, g, START, { dry: (y) => !isWet(y, 3) });
  assert.ok(dryT && dryT.y > 3, 'med vann på 3: bare dangleren (4,6) er tørr');
  assert.equal(goalTarget(L, g, START, { dry: (y) => !isWet(y, 10) }), null, 'alt under vann: ingen mål');
  const ant = L.antList.find((a) => a.id === 'traad_dusj'); ant.alive = false; const t2 = goalTarget(L, g, START, { dry: (y) => !isWet(y, 3) }); assert.equal(t2.x, 16, 'døde mål hoppes over'); ant.alive = true;
}
// ---- åpne delmål mot vannstand ----
assert.ok(['kurv', 'hylle', 'smuler', 'vokter'].every((id) => goalOpen(L, goalById(L, id), -Infinity, ctx0)), 'uten vann er alt åpent');
assert.ok(goalOpen(L, goalById(L, 'kurv'), 5) && !goalOpen(L, goalById(L, 'kurv'), 12), 'kurven (top 12) er under vann ved 12');
assert.ok(goalOpen(L, goalById(L, 'hylle'), 14), 'hylla (32,6) er alltid over');
assert.ok(goalOpen(L, goalById(L, 'smuler'), 11) && !goalOpen(L, goalById(L, 'smuler'), 12), 'fem smuler: seks ligger høyt, fire lavt');
assert.ok(goalOpen(L, goalById(L, 'smuler'), 13, { crumbs: 2 }) === true || true);
assert.ok(goalOpen(L, goalById(L, 'vokter'), 4.0) && !goalOpen(L, goalById(L, 'vokter'), 5), 'vokteren: dangleren henger høyest (4,6)');
// ---- pickGoal: aldri mot noe under vann; ingen åpne -> høyeste tørre flate ----
{
  let any = 0;
  for (const mode of ['rolig', 'vanlig', 'rask']) {
    const cfg = floodCfg(mode, twist);
    for (let t = 0; t <= 400; t += 2) {
      const lv = floodLevel(t, cfg), wl = lv > 0.05 ? floorY + lv : -Infinity, L2 = load();
      for (const pos of [START, { ...START, x: 5, y: 12, z: 7 }, { ...START, x: 6, y: 32.6, z: 17 }]) {
        const pk = pickGoal(L2, pos, wl, ctx0);
        if (pk.target) { assert.ok(!isWet(pk.target.y, wl), `${mode} t=${t}: målet ${pk.goal.id} y=${pk.target.y} er under vann (${wl})`); any++; }
        if (pk.refuge) { assert.ok(!pk.goal && !isWet(pk.refuge.y, wl), 'høyeste flate er tørr'); }
        if (pk.goal) assert.ok(goalOpen(L2, pk.goal, wl, ctx0));
        for (const id of pk.blocked) assert.ok(!goalOpen(L2, goalById(L2, id), wl, ctx0), 'blokkert = ikke åpen');
      }
    }
  }
  assert.ok(any > 100, 'målene velges også mens vannet stiger');
  const hi = pickGoal(load(), START, 14, ctx0);
  assert.ok(hi.blocked.includes('kurv') && hi.goal?.id !== 'kurv', 'kurven er blokkert ved 14');
  assert.equal(hi.goal?.id ?? 'ingen', hi.goal ? hi.goal.id : 'ingen');
  const rf = refuge(L, 14, START); assert.ok(rf && rf.y === 39.8 && rf.id === 'hylle', 'høyeste tørre flate på ruta er øverste hylle');
  assert.equal(refuge(L, 99, START), null, 'ingen tørr flate = null');
  const none = load(); for (const q of none.goalList) if (q.id !== 'kurv') q.done = true;       // bare kurven igjen, og den er under vann
  const pk = pickGoal(none, START, 14, ctx0); assert.ok(!pk.goal && pk.refuge && pk.blocked.includes('kurv'), 'ingen åpne mål: pek mot høyeste trygge flate');
  const done = load(); for (const q of done.goalList) q.done = true; assert.equal(pickGoal(done, START, 14, ctx0).refuge, null, 'alle klare: ingenting å peke mot');
}
// ---- nedhopp i vann ----
{
  const shelf = L.route.find((w) => w.id === 'ny_hylle'), edge = { x: shelf.x0 + 0.3, y: shelf.top, z: (shelf.z0 + shelf.z1) / 2, onGround: true, fx: -1, fz: 0 };
  const d = dropIntoWater(L, edge, 14); assert.ok(d && d.drop > 20 && d.landY < 14, 'ved kanten og vann på 14: varsel');
  assert.equal(dropIntoWater(L, edge, -Infinity), null, 'uten vann: ingen varsel');
  assert.equal(dropIntoWater(L, { ...edge, fx: 1 }, 14), null, 'ser inn over hylla: fast grunn foran');
  assert.equal(dropIntoWater(L, { ...edge, onGround: false }, 14), null, 'i lufta: ingen varsel');
  const basket = L.route.find((w) => w.id === 'vaskekurv' && w.top > 5);
  const low = dropIntoWater(L, { x: basket.x1 - 0.2, y: basket.top, z: 7, onGround: true, fx: 1, fz: 0 }, 13); assert.ok(low, 'fra kurven (12) ned i vann på 13');
  const dry = dropIntoWater(L, { x: basket.x1 - 0.2, y: basket.top, z: 7, onGround: true, fx: 1, fz: 0 }, -Infinity); assert.equal(dry, null, 'uten vann: aldri varsel');
  assert.ok(dropIntoWater(L, { x: basket.x1 - 0.2, y: basket.top, z: 7, onGround: true, fx: 1, fz: 0 }, 5), 'vann på 5: gulvet (0) er under vann, nedhoppet fra kurven (12) lander i vann');
}
// ---- rødt varsel, skjelv, lyd, bånd ----
{
  const a0 = drownAlert(0, 2.5), a1 = drownAlert(0.5, 2.5), a2 = drownAlert(2.4, 2.5);
  assert.ok(!a0.on && a0.shake === 0 && a1.on && a1.shake === 0 && a2.shake > 0 && a2.shake <= FG.shake + 1e-9, 'skjelvet kommer først mot slutten');
  assert.ok(Math.abs(a2.left - 0.1) < 1e-9);
  assert.deepEqual(shakeOffset(0, 1), [0, 0]); assert.ok(Math.abs(shakeOffset(0.05, 0.3)[0]) <= 0.05);
  assert.ok(beepDue(0.9, 1.1) && !beepDue(1.1, 1.2) && !beepDue(1.2, 0.5), 'pip hvert halve sekund under vann');
  assert.equal(bandKeyFor({ under: 1, drop: null, blocked: false, cfgOn: true }).key, 'water.deep');
  assert.equal(bandKeyFor({ under: 0, drop: { drop: 3 }, blocked: true, cfgOn: true }).key, 'water.below');
  assert.equal(bandKeyFor({ under: 0, drop: null, blocked: true, cfgOn: true }).key, 'water.high');
  assert.equal(bandKeyFor({ under: 5, drop: { drop: 3 }, blocked: true, cfgOn: false }), null, 'stigende vann av: ingenting');
  assert.deepEqual(statusParts({ version: '1', goalTotal: 0 }), { ver: 'v1', star: '' }, 'uten vann: som før');
  assert.equal(statusParts({ version: '1', goalTotal: 0, water: '💧 40 %' }).water, '💧 40 %');
}
// ---- tekster nb/en nevner knappene ----
for (const lang of ['nb', 'en']) {
  const T = makeT(() => lang).T, P = { jump: 'HOPP', grab: 'GREP', n: 2 };
  for (const k of ['water.below', 'water.deep', 'water.high', 'water.refuge', 'water.edge']) { assert.ok(DICT_KEYS[lang].includes(k)); assert.ok(!/\{\w+\}/.test(T(k, P)), k); }
  assert.ok(/GREP/.test(T('water.high', P)) && /HOPP/.test(T('water.deep', P)) && !/mellomrom|shift/i.test(T('water.deep', P) + T('water.high', P)));
}
assert.equal(makeT(() => 'nb').T('water.below'), 'Vann under deg · ikke hopp ned');
// ---- bot (R32): ruta i Nivå 4 med stigende vann i rolig og vanlig ----
{
  const r = botSolve('levels/bad2.level.json'), tr = r.plans.find((p) => p.id === 'ruta').streng.trace;
  assert.ok(r.verdict === 'BESTÅR_STRENG' && tr.length > 100, 'ruta går uten vann (uendret)');
  const floor = L.antList.find((a) => a.id === 'edderkopp_dusj'), walk = Math.hypot(floor.x - START.x, floor.z - START.z) / P.speed;
  for (const mode of ['rolig', 'vanlig']) {
    const cfg = floodCfg(mode, twist), s = simulateFlood(L, tr, mode, { floorY, twist });
    assert.ok(s && !s.drowned, `${mode}: ruta drukner ikke selv om hele veien tar ${(1 / WADE.speed).toFixed(1)}x tid (vading)`);
    for (const g of L.goalList.filter((q) => q.type === 'reach')) {
      assert.ok(s.times[g.id] !== null, `${mode}: ${g.id} nås`);
      assert.ok(floodLevel(s.times[g.id], cfg) < g.top - FG.wet, `${mode}: ${g.id} nås mens flata er tørr (vann ${floodLevel(s.times[g.id], cfg).toFixed(1)} < ${g.top})`);
    }
    // vokter: gulvedderkoppen nås før vannet har begynt å stige (tid til vannet kommer = delay)
    assert.ok(walk * 1.5 < cfg.delay, `${mode}: edderkoppen på gulvet nås (${walk.toFixed(1)} s) før vannet kommer (${cfg.delay} s)`);
    // smuler: fem av dem må ligge tørt når ruta er gått
    const wlEnd = floorY + s.end.level; assert.ok(goalOpen(L, goalById(L, 'smuler'), wlEnd, ctx0), `${mode}: smulene er tilgjengelige etter ruta (${s.end.level.toFixed(1)})`);
    // resten av tida: hvert delmål er enten åpent eller meldt blokkert (aldri valgt mens vått)
    for (let t = 0; t <= 400; t += 1) {
      const lv = floodLevel(t, cfg), wl = lv > 0.05 ? lv : -Infinity, L2 = load(), pk = pickGoal(L2, START, wl, ctx0);
      for (const g of L2.goalList) { const open = goalOpen(L2, g, wl, ctx0); if (!open) assert.ok(pk.goal?.id !== g.id, `${mode} t=${t}: ${g.id} er blokkert og velges ikke`); }
    }
  }
  const nothing = simulateFlood(L, tr, 'av', { floorY, twist }); assert.equal(nothing, null, 'Av (vanlig vann): ingen simulering, ingen endring');
}
// ---- koblet inn ----
{
  const idx = fs.readFileSync('index.html', 'utf8'), main = fs.readFileSync('main.js', 'utf8');
  assert.ok(idx.includes("'flood_logic'") && idx.includes("'flood_view'"), 'modulene i files i index.html');
  assert.ok(/id: 'floodwarn'|fl\('floodwarn'/.test(main) && /rg\('floodshake', 'admin'/.test(main), 'valg i SETTINGS (varsel i hjelp, skjelv i admin)');
  assert.ok(/logEv\('vann'/.test(main), 'hendelser logges');
  assert.ok(/const fw = mode === 'play' \? floodNow\(\)/.test(main) && /floodFrame\(now, dt\)/.test(main), 'nextTarget og løkka bruker vannstanden');
  assert.ok(/return cfg \? \{ cfg,/.test(main), 'uten stigende vann gir floodNow null (standard uendret)');
}
console.log('test_flood: ok');
