// node test_solid_decor.mjs: R91 solid dekor. Glassene (krydder_1..3) på krydderhylla i kjøkkenet er solide fra fire sider, kan gås over/stås på;
// revisjonen (tools/solid_audit.mjs) finner ingen store dekorting uten kollisjon i noe brett; ingen rute blokkeres; bryteren legger boksene av og på.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { P, newPlayer, step, applyPreset, initBodies } from './physics.js';
import { decorReport, decorSolidBoxes, decorGapBoxes, decorAllBoxes, classifyDecor, createDecorSolid, SOLID } from './solid_decor_logic.js';
import { auditAll } from './tools/solid_audit.mjs';
import { walkRoute } from './tools/walk_route.mjs';

const load = (n) => JSON.parse(fs.readFileSync(`levels/${n}.level.json`, 'utf8'));
const idle = { mx: 0, mz: 0, jumpPressed: false, jumpHeld: false, grabPressed: false, grabHeld: false };

// 1) kjøkkenet: tre glass, solide, og samme i kjokken2
for (const n of ['kjokken', 'kjokken2']) {
  const L = load(n), bx = decorSolidBoxes(L), cups = bx.filter((b) => /^dekor_krydder_/.test(b.id));
  assert.equal(cups.length, 3, `${n}: tre krydderglass får kollisjon`);
  for (const b of cups) { assert.equal(b.type, 'glass'); assert.ok(b.decorSolid && !b.dyn); assert.ok(b.min[1] >= 30.4 - 1e-6 && b.max[1] <= 32.6 + 1e-6, 'boksen står på hylla'); assert.ok(b.max[0] - b.min[0] >= 1.2, 'nesten like bred som tegningen'); }
}

// 2) figuren stoppes fra fire sider (og uten boksene går den rett igjennom), kan hoppe opp på glasset
{
  const L = load('kjokken'), cup = decorSolidBoxes(L).find((b) => b.id === 'dekor_krydder_1');
  const run = (withBox, from, dir, jump = false) => {
    applyPreset('mario'); Object.assign(P, { edgeGuard: false, autoJump: false, airSteady: false, magnet: false, holdGrab: false });
    const W = { boxes: [L.boxes.find((b) => b.id === 'krydderhylle'), ...(withBox ? [cup] : [])], movables: [], deathY: -50, start: [0, 0, 0] }; initBodies(W);
    const p = newPlayer(from[0], 30.4, from[1]); let maxY = 0, minD = Infinity;
    for (let i = 0; i < 20; i++) step(p, { ...idle }, 1 / 60, W);
    for (let i = 0; i < 240; i++) { step(p, { ...idle, mx: dir[0], mz: dir[1], jumpPressed: jump && i % 40 === 5, jumpHeld: jump && i % 40 < 20 }, 1 / 60, W); maxY = Math.max(maxY, p.y); minD = Math.min(minD, Math.hypot(p.x - 24.7, p.z + 28.7)); }
    return { x: p.x, z: p.z, y: p.y, maxY, on: p.onGround };
  };
  const cx = 24.7, cz = -28.7;
  for (const [name, from, dir] of [['fra venstre', [22.9, cz], [1, 0]], ['fra forsiden', [cx, -27.35], [0, -1]], ['fra baksiden', [cx, -29.75], [0, 1]]]) {
    const r = run(true, from, dir), free = run(false, from, dir);
    const d = Math.hypot(r.x - cx, r.z - cz), d0 = Math.hypot(free.x - cx, free.z - cz);
    assert.ok(Math.abs(r.x - from[0]) + Math.abs(r.z - from[1]) < 1.2 && d > 0.55, `${name}: stoppet av glasset (${r.x.toFixed(2)}, ${r.z.toFixed(2)})`);
    assert.ok(d0 > 0 && (Math.abs(free.x - from[0]) + Math.abs(free.z - from[1]) > 1.8), `${name}: uten boks går figuren forbi (kontroll)`);
  }
  // fra høyre side går den inn mellom glass 1 og 2 (0,6 mellom) og stoppes av glass 2 i stedet
  { const W2 = { boxes: [L.boxes.find((b) => b.id === 'krydderhylle'), ...decorSolidBoxes(L)], movables: [], deathY: -50, start: [0, 0, 0] }; applyPreset('mario'); initBodies(W2);
    const p = newPlayer(30.05, 30.4, cz); for (let i = 0; i < 20; i++) step(p, { ...idle }, 1 / 60, W2); for (let i = 0; i < 240; i++) step(p, { ...idle, mx: -1 }, 1 / 60, W2);
    assert.ok(p.x > 29.6 && p.x < 30.1, `fra høyre side stoppes av glass 3 (x ${p.x.toFixed(2)})`); }
  // hopp: figuren kan komme opp på glasset (2,2 høyt) eller i det minste over: den står på hylla eller på toppen, aldri inni
  const j = run(true, [22.9, cz], [1, 0], true); assert.ok(j.maxY > 30.4 + 0.5, 'figuren kan hoppe mot glasset');
}

// 3) revisjonen: ingen store dekorting uten kollisjon i noe brett (grensene ligger i SOLID)
{
  const res = auditAll(); let solid = 0;
  assert.equal(res.length, 23, 'alle brett er med');   // R119: + badebro, R125: + trapp2, vippe2, R124: + bro2, kjokkenbro2
  for (const r of res) { assert.deepEqual(r.missing.map((d) => d.id), [], `${r.level}: store ting uten kollisjon`); solid += r.nBoxes; }
  assert.ok(solid === 11, `solide dekorbokser totalt (${solid})`);
  // bevisst flate/høye/små står uendret: dører, speil, tepper, plater, plakater, håndtak høyt oppe
  const k = decorReport(load('kjokken')); assert.ok(k.flat.some((d) => d.id === 'dor') && k.high.some((d) => d.id === 'dorhandtak'), 'dør er flat, dørhåndtak ligger høyt');
  assert.equal(classifyDecor({ kind: 'cup', pos: [0, 5, 0], size: [1, 2, 1] }, [{ type: 'wood', min: [-3, 3, -3], max: [3, 4, 3] }]), 'solid');
  assert.equal(classifyDecor({ kind: 'cup', pos: [0, 5, 0], size: [0.15, 3, 3] }, []), 'flat');
  assert.equal(classifyDecor({ kind: 'cup', pos: [0, 5, 0], size: [0.5, 0.45, 0.5] }, [{ type: 'wood', min: [-3, 3, -3], max: [3, 4.2, 3] }]), 'small');
  assert.equal(classifyDecor({ kind: 'cup', pos: [0, 5, 0], size: [0.55, 0.55, 0.55] }, [{ type: 'wood', min: [-3, 3, -3], max: [3, 4.2, 3] }]), 'solid');
  assert.equal(classifyDecor({ kind: 'cup', pos: [0, 15, 0], size: [2, 2, 2] }, [{ type: 'floor', min: [-30, -2, -30], max: [30, 0, 30] }]), 'high');
  assert.equal(classifyDecor({ kind: 'cup', pos: [0, 5, 0], size: [2, 2, 2] }, [{ type: 'wood', min: [-1, 4, -1], max: [1, 6, 1] }]), 'covered');
  assert.equal(classifyDecor({ kind: 'mat', pos: [0, 0.1, 0], size: [9, 3, 9] }, []), 'flat');
}

// 4) ingen rute blokkeres (alle brett med rute), samme dom med og uten solid dekor
for (const f of fs.readdirSync('levels').filter((n) => n.endsWith('.level.json'))) {
  const a = walkRoute(`levels/${f}`, { solidDecor: false }), b = walkRoute(`levels/${f}`, {});
  assert.equal(b.ok, a.ok, `${f}: ruta med solid dekor (${b.why}) som uten (${a.why})`);
}

// 5) bryteren: av = gammel oppførsel, på = boksene ligger i LEVEL.boxes
{
  const L = load('kjokken'), n0 = L.boxes.length, d = createDecorSolid(L);
  assert.equal(L.boxes.length, n0, 'ikke på før set(true)'); assert.equal(d.set(true), true); assert.equal(L.boxes.length, n0 + 3 + decorGapBoxes(L).length); assert.equal(d.set(true), false, 'ingen endring = ingen logg');
  assert.equal(d.set(false), true); assert.equal(L.boxes.length, n0); assert.equal(d.on, false);
}
{ const m = fs.readFileSync('main.js', 'utf8'); assert.ok(/'decorsolid', 'admin'/.test(m) && /createDecorSolid\(LEVEL\)/.test(m) && /logEv\('dekor'/.test(m) && /tlm\.decorsolid', true/.test(m), 'decorsolid hekt i main.js (Admin, standard på, logEv)'); }

// 6) simuleringstid: boksene gjør ikke steget merkbart tregere (statisk måling; tallet skrives ut)
{
  const L = load('kjokken'), time = (on) => { const W = JSON.parse(JSON.stringify(L)); initBodies(W); if (on) W.boxes.push(...decorSolidBoxes(W)); applyPreset('mario'); let best = 1e9;
    for (let r = 0; r < 5; r++) { const p = newPlayer(...W.start), t0 = process.hrtime.bigint(); for (let i = 0; i < 6000; i++) step(p, { ...idle, mx: Math.sin(i / 50) }, 1 / 60, W); best = Math.min(best, Number(process.hrtime.bigint() - t0) / 6000 / 1e6); } return best; };
  const off = time(false), on = time(true);
  console.log(`simuleringstid kjøkken: ${off.toFixed(3)} → ${on.toFixed(3)} ms/steg (${decorSolidBoxes(L).length} bokser)`);
  assert.ok(on < off + 0.05, 'under 0,05 ms ekstra per steg');
}

// 7) R156: figuren kommer ikke bak døra/geriktet i Badet (bad og bad2), og ikke bak dørene i barnerom/kjøkken
{
  const walkInto = (name, x, withBoxes) => {
    const L = load(name), W = JSON.parse(JSON.stringify(L)); initBodies(W); if (withBoxes) W.boxes.push(...decorAllBoxes(W));
    applyPreset('mario'); Object.assign(P, { edgeGuard: false, autoJump: false, airSteady: false, magnet: false, holdGrab: false });
    const dz = L.decor.find((d) => d.id === 'dor').pos[2], p = newPlayer(x, 0, dz - 3); let maxZ = -Infinity;
    for (let i = 0; i < 20; i++) step(p, { ...idle }, 1 / 60, W);
    for (let i = 0; i < 300; i++) { step(p, { ...idle, mx: 0, mz: 1 }, 1 / 60, W); maxZ = Math.max(maxZ, p.z); }
    return { maxZ, dz };
  };
  for (const [n, xs] of [['bad', [-11.1, -14.9, 2.7, -6]], ['bad2', [-11.1, -14.9, 2.7, -6]], ['barnerom', [2, -5]], ['kjokken', [-24, -30]]]) for (const x of xs) {
    const off = walkInto(n, x, false), on = walkInto(n, x, true);
    assert.ok(on.maxZ < on.dz - 0.1, `${n} x=${x}: stoppes foran døra (z ${on.maxZ.toFixed(2)} < ${on.dz})`);
    assert.ok(off.maxZ > on.maxZ, `${n} x=${x}: uten glipefyll kommer figuren lenger (kontroll)`);
  }
  // gliper fylles helt til veggen (ingen spalte igjen), og bare smale
  for (const n of ['bad', 'bad2']) { const g = decorGapBoxes(load(n)); assert.ok(g.some((b) => b.id === 'dekor_dor_glipe' && b.max[2] === 25) && g.some((b) => b.id === 'dekor_dor_gerikt_v_glipe') && g.some((b) => b.id === 'dekor_dor_gerikt_h_glipe'), `${n}: dør og begge gerikt fylles mot veggen`); }
  assert.deepEqual(decorGapBoxes({ boxes: [{ type: 'wall', min: [0, 0, 5], max: [9, 9, 6] }], decor: [{ id: 'x', kind: 'door', pos: [4, 4, 3], size: [2, 4, 0.4] }] }), [], 'glipe over 0,5 fylles ikke');
}
console.log('solid dekor ok');
