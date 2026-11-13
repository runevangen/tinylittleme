// R61: veps som flyr: bane, varsel (minst 0,5 s), stup, treff, skjul, krasj, knus, nullstilling, vanskelighet, brettene og filliste.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { newPlayer, step, initBodies } from './physics.js';
import { initAnts, stepAnts, resetAnts, ANT } from './ants.js';
import { WASP, TUNE, LEVELS, MIN_WARN, warnTime, isHidden, surfaceBelow } from './wasp.js';
import { moodFor } from './music.js';

const DT = 1 / 60;
const mkL = (ants, boxes = []) => { const L = { ants, boxes }; initAnts(L); return L; };
const grounded = (x, z, y = 0) => { const p = newPlayer(x, y, z); p.state = 'ground'; p.onGround = true; return p; };
const far = grounded(0, 80);
const ANTS = () => [{ id: 'w', type: 'wasp', a: [-10, 0, 0], b: [10, 0, 0], alt: 3.4 }];
const table = { type: 'chest', min: [-6, 10, 6], max: [6, 11, 14], alive: true };   // bord: topp på høyde 10..11 (undersiden 10 over gulvet)

// bane: flyr i lufta langs a-b, ufarlig, ligger på flyhøyde, snur i endene
{
  const L = mkL(ANTS()), w = L.antList[0];
  assert.equal(w.type, 'wasp'); assert.equal(w.mode, 'patrol'); assert.ok(Math.abs(w.y - 3.4) < 1e-9, 'flyhøyde fra alt');
  let minX = 99, maxX = -99;
  for (let i = 0; i < 60 * 30; i++) { stepAnts(L, far, DT); minX = Math.min(minX, w.x); maxX = Math.max(maxX, w.x); assert.equal(w.danger, false); assert.ok(Math.abs(w.y - 3.4) < 1e-6 && Math.abs(w.z) < 1e-9); }
  assert.ok(minX < -9.5 && maxX > 9.5, `patruljerer hele banen (${minX.toFixed(1)}..${maxX.toFixed(1)})`);
  const w2 = mkL([{ id: 'x', type: 'wasp', a: [0, 0, 0], b: [4, 0, 0] }]).antList[0]; assert.equal(w2.alt, WASP.alt, 'standard flyhøyde');
}

// varsel: lyd/hendelse først, ufarlig og minst 0,5 s før stuper; så stup mot der du sto; farlig; støt
{
  TUNE.level = 'normal';
  const L = mkL(ANTS()), w = L.antList[0], p = grounded(0, 3);
  let evs = stepAnts(L, p, DT); assert.ok(evs.some((e) => e.type === 'alert' && e.kind === 'wasp'), 'varsler'); assert.equal(w.mode, 'warn'); assert.equal(w.alerted, true);
  let warnT = 0, dived = false, hurt = false;
  for (let i = 0; i < 60 * 4 && !dived; i++) { const e = stepAnts(L, p, DT); if (e.some((x) => x.type === 'hurt')) hurt = true; if (e.some((x) => x.type === 'dive')) dived = true; else { warnT += DT; assert.equal(w.danger, false, 'ufarlig under varselet'); } }
  assert.ok(dived, 'stuper etter varselet'); assert.ok(warnT >= MIN_WARN && warnT >= warnTime() - 0.05, `varsel ${warnT.toFixed(2)} s`); assert.ok(!hurt, 'ingen skade under varselet');
  assert.equal(w.mode, 'dive'); stepAnts(L, p, DT); assert.ok(w.danger); assert.ok(Math.hypot(w.tx - p.x, w.tz - p.z) < 1e-9, 'sikter der du står');
  let got = false; for (let i = 0; i < 60 * 2 && !got; i++) { L.antInvuln = 0; got = stepAnts(L, p, DT).some((e) => e.type === 'hurt' && e.kind === 'wasp'); } assert.ok(got, 'stupet treffer den som blir stående');
  assert.ok(p.vy > 0 && L.antInvuln > 0, 'tilbakestøt og uskadd-tid');
}

// stikk til siden: den stuper dit du sto, bommer, lander svimmel (ufarlig), stiger og er tilbake på banen
{
  const L = mkL(ANTS()), w = L.antList[0]; let p = grounded(0, 3), landed = false, hurt = false;
  stepAnts(L, p, DT); for (let i = 0; i < 60 * 3 && w.mode === 'warn'; i++) stepAnts(L, p, DT);
  assert.equal(w.mode, 'dive'); p = grounded(6, 3);                         // stikk til siden etter at den har siktet
  for (let i = 0; i < 60 * 3 && !landed; i++) { const e = stepAnts(L, p, DT); hurt = hurt || e.some((x) => x.type === 'hurt'); landed = e.some((x) => x.type === 'land'); }
  assert.ok(landed && !hurt, 'bommet'); assert.equal(w.mode, 'rest'); assert.equal(w.danger, false); assert.ok(Math.abs(w.y) < 0.2, 'lander på gulvet');
  const sit = grounded(w.x + 0.2, w.z); L.antInvuln = 0; assert.ok(!stepAnts(L, sit, DT).some((e) => e.type === 'hurt'), 'svimmel = ufarlig');
  for (let i = 0; i < 60 * 12 && w.mode !== 'patrol'; i++) stepAnts(L, far, DT); assert.equal(w.mode, 'patrol', 'tilbake til banen'); assert.ok(Math.abs(w.y - 3.4) < 0.3);
}

// avblåst: rygger du før halvveis, eller gjemmer deg
{
  const L = mkL(ANTS()), w = L.antList[0]; stepAnts(L, grounded(0, 3), DT); assert.equal(w.mode, 'warn');
  for (let i = 0; i < 6; i++) stepAnts(L, far, DT); assert.notEqual(w.mode, 'warn', 'avblåst'); assert.equal(w.danger, false);
}

// skjul under en ting: den ser deg ikke, og stuper den likevel inn i noe i veien, smeller den og er svimmel lenge
{
  const under = grounded(0, 10); assert.ok(isHidden({ boxes: [table] }, under), 'under bordet er skjult'); assert.ok(!isHidden({ boxes: [table] }, grounded(0, 3)), 'foran bordet er ikke skjult'); assert.ok(!isHidden({ boxes: [table] }, grounded(0, 6.5)), 'rett ved kanten er ikke skjult');
  const L = mkL(ANTS(), [table]), w = L.antList[0];
  for (let i = 0; i < 60 * 5; i++) { stepAnts(L, under, DT); assert.notEqual(w.mode, 'warn', 'ser ikke den som gjemmer seg'); }
  // sikt, så løp inn under: stupet går inn i bordet
  const out = grounded(w.x, 3); stepAnts(L, out, DT); assert.equal(w.mode, 'warn');
  const kasse = { type: 'chest', min: [-3, 0, 2], max: [3, 6, 4], alive: true };   // en kasse i stupbanen
  const L2 = mkL([{ id: 'w', type: 'wasp', a: [0, 0, -4], b: [0, 0, -4], alt: 3.4 }], [table, kasse]), w2 = L2.antList[0], tgt = grounded(0, 10);
  w2.mode = 'dive'; w2.mt = 0; w2.sx = 0; w2.sy = 3.4; w2.sz = -4; w2.tx = 0; w2.ty = 0; w2.tz = 10; w2.dist = Math.hypot(0, 3.4, 14); w2.x = 0; w2.y = 3.4; w2.z = -4; w2.danger = true;
  let crash = false; for (let i = 0; i < 60 * 3 && !crash; i++) crash = stepAnts(L2, tgt, DT).some((e) => e.type === 'crash'); assert.ok(crash, 'stupet går inn i kassa'); assert.equal(w2.mode, 'stun'); assert.equal(w2.danger, false); assert.ok(w2.z < 2, 'stoppet foran kassa');
  const t0 = w2.mt; for (let i = 0; i < 60 * (WASP.stun - 0.5); i++) stepAnts(L2, far, DT); assert.equal(w2.mode, 'stun', 'lenger svimmel etter krasj'); assert.ok(WASP.stun > WASP.rest);
  assert.equal(surfaceBelow({ boxes: [table] }, 0, 10, 20), 11, 'flate under');
}

// knus fra oven (også midt i stupet) gir sprett; borte i WASP.respawn s og kommer tilbake nullstilt
{
  const L = mkL(ANTS()), w = L.antList[0]; stepAnts(L, grounded(0, 3), DT); for (let i = 0; i < 60 * 3 && w.mode === 'warn'; i++) stepAnts(L, grounded(0, 3), DT);
  assert.equal(w.mode, 'dive'); const t = newPlayer(w.x, w.y + WASP.hgt * 0.5, w.z); t.state = 'air'; t.vy = -6;
  const e = stepAnts(L, t, DT); assert.ok(e.some((x) => x.type === 'stomp' && x.kind === 'wasp'), 'knust fra oven'); assert.equal(t.vy, ANT.bounce); assert.equal(w.alive, false);
  for (let i = 0; i < 60 * WASP.respawn + 120; i++) stepAnts(L, far, DT); assert.ok(w.alive && w.mode === 'patrol' && w.danger === false, 'kommer tilbake nullstilt');
  stepAnts(L, grounded(0, 3), DT); resetAnts(L); assert.equal(w.mode, 'patrol'); assert.equal(w.alerted, false);
}

// ufarlig i patrulje (flyr over hodet) og ufarlig når spilleren henger/klatrer; av i ⚙ (noWasps) = helt borte
{
  const L = mkL(ANTS()), w = L.antList[0], p = grounded(w.x, w.z); L.antInvuln = 0; assert.ok(!stepAnts(L, p, DT).some((e) => e.type === 'hurt'), 'over hodet = ufarlig');
  const L2 = mkL(ANTS()); L2.noWasps = true; for (let i = 0; i < 600; i++) assert.equal(stepAnts(L2, grounded(0, 3), DT).length, 0); assert.equal(L2.antList[0].mode, 'patrol');
}

// vanskelighet: lett = lengre varsel og saktere stup; vanskelig = kortere, men aldri under 0,5 s
{
  const warnOf = (lvl) => { TUNE.level = lvl; const L = mkL(ANTS()), w = L.antList[0], p = grounded(0, 3); let t = 0; stepAnts(L, p, DT); while (w.mode === 'warn' && t < 5) { stepAnts(L, p, DT); t += DT; } return t; };
  const e = warnOf('easy'), n = warnOf('normal'), h = warnOf('hard'); TUNE.level = 'normal';
  assert.ok(e > n && n > h, `${e} > ${n} > ${h}`); assert.ok(h >= MIN_WARN, 'aldri under 0,5 s');
  for (const k of Object.keys(LEVELS)) { TUNE.level = k; assert.ok(warnTime() >= MIN_WARN); } TUNE.level = 'normal'; assert.ok(LEVELS.easy.dive < LEVELS.hard.dive);
}

// musikken: vepsen som varsler gir «tense» (spent)
{
  const L = mkL(ANTS()), w = L.antList[0]; stepAnts(L, grounded(0, 3), DT);
  assert.equal(moodFor({ alerted: L.antList.some((a) => a.alive && a.alerted) }), 'tense'); stepAnts(L, far, DT); for (let i = 0; i < 300; i++) stepAnts(L, far, DT);
  assert.equal(moodFor({ alerted: L.antList.some((a) => a.alive && a.alerted) }), 'calm');
}

// brettene: vepsen finnes i Kjøkkenet (nivå 3 og 6), banen er fri, langt fra start, og det finnes et skjulested (bordet) ved banen
for (const lv of ['kjokken', 'kjokken2']) {
  const L = JSON.parse(fs.readFileSync(`levels/${lv}.level.json`, 'utf8')); const ws = L.ants.filter((a) => a.type === 'wasp'); assert.ok(ws.length >= 1, `${lv}: mangler veps`);
  initBodies(L);
  for (const a of ws) {
    assert.ok(a.alt >= 2.5 && a.alt <= 5, `${lv}: flyhøyde ${a.alt}`);
    assert.ok(Math.hypot(a.a[0] - L.start[0], a.a[2] - L.start[2]) > WASP.alert * 1.5 && Math.hypot(a.b[0] - L.start[0], a.b[2] - L.start[2]) > WASP.alert * 1.5, `${lv}: vepsen ser deg fra start`);
    // skjulested: en flate over gulvet innen alert-rekkevidde av banen, der man kan stå skjult
    let hide = false; for (let x = -36; x <= 36 && !hide; x += 1) for (let z = -30; z <= 30 && !hide; z += 1) { const p = grounded(x, z); if (isHidden(L, p) && Math.hypot(x - (a.a[0] + a.b[0]) / 2, z - a.a[2]) < WASP.alert) hide = true; }
    assert.ok(hide, `${lv}: ingen steder å gjemme seg for vepsen`);
    // brettet er klarbart uten å møte den: ingen av rutetrinnene (gulv-nivå) ligger nærmere enn rekkevidden til banen i høyde, ellers er det rom for å gjemme seg (bevist over)
  }
}
// ny modul i index.html
{ const html = fs.readFileSync('index.html', 'utf8'); for (const f of ['wasp', 'wasp_view']) assert.ok(html.includes(`'${f}'`), `${f} mangler i files i index.html`); }
// tegnebudsjett (statisk, uten GPU): modellen bygges med ekte three, teller meshes (= tegnekall) og alle faser kan animeres uten feil. Ekte FPS: testes på iPhone
{
  const { register } = await import('node:module');
  register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { return s === 'three' ? { url: ${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)}, shortCircuit: true } : n(s, c); }`));
  const THREE = await import('./lib/three.module.min.js'), { buildWasp } = await import('./wasp_view.js');
  const m = buildWasp(); let meshes = 0, tris = 0; const kinds = new Set(); m.root.traverse((o) => { if (o.isMesh) { meshes++; kinds.add(o.material.type); const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
  assert.ok(meshes <= 40, `tegnekall ${meshes}`); assert.ok(tris <= 4000, `trekanter ${tris}`);
  for (const k of kinds) assert.ok(['MeshPhysicalMaterial', 'MeshStandardMaterial', 'MeshBasicMaterial'].includes(k), `ny materialtype ${k}`);
  for (const mode of ['patrol', 'warn', 'dive', 'rest', 'stun', 'rise', 'return']) m.update(1.3, 2, 0, mode === 'warn' || mode === 'dive', { mode, y: 3, x: 0, z: 0, tx: 2, ty: 0, tz: 3, a: [0, 0, 0], hover: 0.1 });
  m.update(2, 0, 1, false, {}); assert.ok(m.root.scale.y < 0.1, 'flat når knust');
  console.log(`veps budsjett (statisk, uten GPU): ${meshes} tegnekall, ${Math.round(tris)} trekanter. Ekte FPS: testes på iPhone`);
}
console.log('veps-tester grønne');
