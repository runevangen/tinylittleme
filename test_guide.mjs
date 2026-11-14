// node test_guide.mjs: R64 veiledning: retning (også loddrett), tekst per delmålstype og dangler-fase, kantmerke, framdrift/ruteuthevning med klokke, «Vis meg», i18n og at modulen er koblet inn.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GUIDE, aim, glyph, fmtM, danglerPhase, actionFor, edgeMark, createStall, stepStall, stalled, nextSurface, ledgePoint, createShowMe, startShowMe, skipShowMe, stepShowMe, showMePlan, bandHint } from './guide_logic.js';
import { makeT, DICT_KEYS } from './i18n.js';
import { panelModel } from './topband_logic.js';

// ---- retning: i planet og loddrett ----
{
  const fwd = aim({ dx: 0, dy: 0, dz: -10, yaw: 0 }); assert.ok(Math.abs(fwd.ang) < 1e-9, 'rett frem = 0'); assert.equal(fwd.vert, 'level'); assert.ok(!fwd.vertDom);
  const right = aim({ dx: 10, dy: 0, dz: 0, yaw: 0 }); assert.ok(right.ang > 1.4 && right.ang < 1.7, 'til høyre = positiv');
  const behind = aim({ dx: 0, dy: 0, dz: 10, yaw: 0 }); assert.ok(behind.behind && Math.abs(Math.abs(behind.ang) - Math.PI) < 1e-6, 'bak = ±π');
  // testerens tilfelle: målet ligger langt under hylla og litt til siden -> ned
  const down = aim({ dx: 6, dy: -28, dz: -4, yaw: 0 });
  assert.equal(down.vert, 'down'); assert.ok(down.vertDom, 'loddrett veier mest'); assert.ok(Math.abs(down.ang) > 2.6, `pila peker ned, ikke opp (ang ${down.ang})`);
  assert.equal(glyph(down), '▼'); assert.ok(Math.abs(down.meters - 1.4) < 1e-9, 'meter er loddrett når det veier mest');
  const up = aim({ dx: 1, dy: 12, dz: -2, yaw: 0 }); assert.ok(up.vertDom && Math.abs(up.ang) < 0.6 && glyph(up) === '▲', 'over = opp');
  const gentle = aim({ dx: 0, dy: -1, dz: -20, yaw: 0 }); assert.ok(gentle.vert === 'down' && !gentle.vertDom, 'litt lavere, langt unna: vanlig pil i planet'); assert.ok(Math.abs(gentle.ang) < 1e-9);
  assert.equal(aim({ dx: 3, dy: 0.3, dz: 0, yaw: 0 }).vert, 'level'); assert.equal(glyph(aim({ dx: 3, dy: 0.3, dz: 0, yaw: 0 })), '');
  // pila i bildet og i båndet bruker samme vinkel: kantmerket bruker a.ang når målet er loddrett
  const m = edgeMark({ s: { x: 195, y: 900 }, a: down, w: 390, h: 844 }); assert.ok(m && m.y > 844 / 2, 'kantmerke nederst for mål under');
  assert.ok(Math.abs(Math.abs(m.rot) - Math.PI) < 0.6, 'kantmerket peker ned');
  assert.equal(fmtM(0.6), '0,6 m');
}
// ---- kantmerke ----
{
  const a = aim({ dx: 0, dy: 0, dz: -10, yaw: 0 });
  assert.equal(edgeMark({ s: { x: 195, y: 300 }, a, w: 390, h: 844 }), null, 'i bildet: ingen kantmerke');
  const off = edgeMark({ s: { x: 700, y: 300 }, a: aim({ dx: 10, dy: 0, dz: -1, yaw: 0 }), w: 390, h: 844 }); assert.ok(off && off.x <= 390 - GUIDE.edgePad + 0.5 && off.x > 300 && off.rot > 0.5, 'utenfor til høyre: merke i høyre kant');
  const bk = edgeMark({ s: null, a: aim({ dx: 0, dy: 0, dz: 10, yaw: 0 }), w: 390, h: 844 }); assert.ok(bk, 'bak kameraet: kantmerke'); assert.ok(bk.y <= 844 - GUIDE.edgePadBottom + 0.5 && bk.y >= GUIDE.edgePadTop - 0.5, 'holdes unna knapper og bånd');
  const hid = edgeMark({ s: { x: 195, y: 700 }, a: aim({ dx: 0, dy: -30, dz: -3, yaw: 0 }), w: 390, h: 844 }); assert.ok(hid, 'loddrett under: alltid kantmerke selv om punktet er i bildet');
}
// ---- tekst per delmålstype ----
{
  const T = makeT(() => 'nb').T, Te = makeT(() => 'en').T, P = { jump: 'HOPP', grab: 'GREP', take: 'TA', drop: 'SLIPP' };
  const txt = (o, tt = T) => { const ac = actionFor(o); return tt(ac.key, { ...P, ...ac.params }); };
  const down = aim({ dx: 6, dy: -12, dz: -4, yaw: 0 }), lvl = aim({ dx: 0, dy: 0, dz: -20, yaw: 0 }), up = aim({ dx: 1, dy: 12, dz: -2, yaw: 0 });
  assert.equal(txt({ kind: 'reach', a: down }), 'Hopp ned fra kanten her (HOPP) · 0,6 m under', 'eksempelsetningen fra veikartet');
  assert.ok(/Vent til den henger lavt/.test(txt({ kind: 'dangler', a: down, phase: 'wait' })), 'dangler oppe: vent');
  assert.ok(/ryggen/.test(txt({ kind: 'dangler', a: down, phase: 'wait' })) && /HOPP/.test(txt({ kind: 'dangler', a: down, phase: 'wait' })));
  assert.ok(/henger den lavt/.test(txt({ kind: 'dangler', a: lvl, phase: 'low' })), 'dangler lavt: nå');
  assert.ok(/Hopp på den \(HOPP\)/.test(txt({ kind: 'ant', a: lvl })));
  assert.ok(/Hopp ned/.test(txt({ kind: 'ant', a: down })), 'maur under: hopp ned');
  assert.ok(/smulen/.test(txt({ kind: 'crumbs', a: lvl })));
  assert.ok(/klatre/i.test(txt({ kind: 'reach', a: up, grip: true })) && /GREP/.test(txt({ kind: 'reach', a: up, grip: true })), 'klatreflate: GREP');
  assert.ok(/HOPP/.test(txt({ kind: 'reach', a: up })), 'opp: hopp');
  assert.ok(/TA/.test(txt({ kind: 'key', a: aim({ dx: 1, dy: 0, dz: 0, yaw: 0 }) })) && /SLIPP/.test(txt({ kind: 'plate', a: aim({ dx: 1, dy: 0, dz: 0, yaw: 0 }) })), 'gåte: TA og SLIPP');
  assert.ok(/Snu deg/.test(txt({ kind: 'route', a: aim({ dx: 0, dy: 0, dz: 10, yaw: 0 }) }).replace('snu deg', 'Snu deg')), 'bak deg: snu');
  assert.ok(/Jump down/.test(txt({ kind: 'reach', a: down }, Te)), 'engelsk');
  // ingen tastenavn i noen tekst
  for (const lang of ['nb', 'en']) for (const k of DICT_KEYS[lang].filter((k) => k.startsWith('guide.'))) {
    const v = makeT(() => lang).T(k, P); assert.ok(!/\b(mellomrom|space|shift|E|F)\b/i.test(v.replace(/Hopp av her/, '')), `${k} nevner tast: ${v}`);
  }
  // dangler-faser
  assert.equal(danglerPhase({ type: 'dangler', mode: 'up' }), 'wait'); assert.equal(danglerPhase({ type: 'dangler', mode: 'warn' }), 'warn');
  assert.equal(danglerPhase({ type: 'dangler', mode: 'plunge' }), 'low'); assert.equal(danglerPhase({ type: 'dangler', mode: 'hold' }), 'low'); assert.equal(danglerPhase({ type: 'dangler', mode: 'rise' }), 'rise');
  assert.equal(danglerPhase({ type: 'ant' }), null); assert.equal(danglerPhase(null), null);
  // kort hint: glyf + kort handling
  assert.equal(bandHint(actionFor({ kind: 'reach', a: down }), down, (k) => T(k, P)), '▼ Hopp ned (HOPP)');
  assert.ok(/▼ Vent/.test(bandHint(actionFor({ kind: 'dangler', a: down, phase: 'wait' }), down, (k) => T(k, P))));
}
// ---- samme nøkler i nb og en ----
{
  const g = (l) => DICT_KEYS[l].filter((k) => k.startsWith('guide.')).sort();
  assert.deepEqual(g('nb'), g('en')); assert.ok(g('nb').length >= 40);
}
// ---- framdrift og ruteuthevning (klokke) ----
{
  const s = createStall(), base = { goalKey: 'vokter', routeIdx: 4, done: 2, dist: 40 };
  stepStall(s, 0, base); assert.ok(!stalled(s, 1000));
  stepStall(s, 30000, base); assert.ok(!stalled(s, 30000), '30 s: ikke ennå');
  stepStall(s, 44000, { ...base, dist: 39 }); assert.ok(!stalled(s, 44999), 'liten flytting er ikke framdrift, men heller ikke ferdig ennå');
  assert.ok(stalled(s, 45000), '45 s uten framdrift');
  stepStall(s, 46000, { ...base, routeIdx: 5 }); assert.ok(!stalled(s, 46000), 'høyere ruteflate = framdrift');
  stepStall(s, 100000, { ...base, routeIdx: 5 }); assert.ok(stalled(s, 100000));
  stepStall(s, 100500, { ...base, routeIdx: 5, done: 3 }); assert.ok(!stalled(s, 100500), 'nytt delmål = framdrift');
  stepStall(s, 150000, { ...base, routeIdx: 5, done: 3, dist: 30 }); assert.ok(!stalled(s, 150000), 'tydelig nærmere = framdrift');
  stepStall(s, 150100, { ...base, goalKey: 'annet', routeIdx: 5, done: 3, dist: 30 }); assert.ok(!stalled(s, 150100), 'nytt mål = framdrift');
  assert.equal(GUIDE.stallMs, 45000);
  const R = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  assert.equal(nextSurface(R, 0).id, 'b'); assert.equal(nextSurface(R, 2), null, 'siste flate er målet'); assert.equal(nextSurface([{ id: 'a' }], 0), null); assert.equal(nextSurface(null, 0), null);
  const lp = ledgePoint({ x0: 0, x1: 10, z0: 0, z1: 6, top: 32 }, { x: 14, z: 3 }); assert.deepEqual(lp, { x: 10, y: 32, z: 3 }, 'avhoppskant er nærmeste punkt på kanten');
}
// ---- Vis meg ----
{
  const s = createShowMe(), a = aim({ dx: 6, dy: -28, dz: -4, yaw: 0 }), plan = showMePlan({ dx: 6, dz: -4, a, pitch0: 0.26 });
  assert.ok(plan.pitch > 0.8, 'ser ned over kanten når målet er under'); assert.equal(showMePlan({ dx: 0, dz: -4, a: aim({ dx: 0, dy: 20, dz: -4, yaw: 0 }), pitch0: 0.26 }).pitch, 0);
  assert.equal(stepShowMe(s, 0.1).act, 'none', 'ikke startet');
  startShowMe(s, { yaw: 1, pitch: 0.3 }, plan);
  const r1 = stepShowMe(s, 0.016); assert.equal(r1.act, 'turn'); assert.equal(r1.pitch, plan.pitch);
  let t = 0; while (s.phase !== 'back' && t < 10) { stepShowMe(s, 0.1); t += 0.1; } assert.ok(t > 2 && t < 4, `holder ca. ${GUIDE.showHold} s (${t})`);
  const r2 = stepShowMe(s, 0.016); assert.equal(r2.act, 'turn'); assert.deepEqual([r2.yaw, r2.pitch], [1, 0.3], 'tilbake til der kameraet var');
  let done = false; for (let i = 0; i < 40 && !done; i++) done = stepShowMe(s, 0.05).act === 'done'; assert.ok(done && s.phase === 'idle');
  startShowMe(s, { yaw: 0, pitch: 0.3 }, plan); stepShowMe(s, 0.016); assert.ok(skipShowMe(s)); assert.equal(s.phase, 'back'); assert.ok(!skipShowMe(s), 'skip to ganger gjør ingenting');
}
// ---- panelet viser hele handlingen ----
{
  const rows = panelModel({ version: '1', levelLabel: 'x', nextText: 'NESTE: A · 0,6 m', nextHint: '▼ Hopp ned (HOPP)', nextAction: 'Hopp ned fra kanten her (HOPP) · 0,6 m under' });
  assert.ok(rows.find((r) => r.k === 'next').text.includes('Hopp ned fra kanten her'));
}
// ---- koblet inn (modul, innstilling, logging, ingen tastenavn) ----
{
  const main = fs.readFileSync('main.js', 'utf8'), idx = fs.readFileSync('index.html', 'utf8'), view = fs.readFileSync('guide_view.js', 'utf8');
  assert.ok(idx.includes("'guide_logic'") && idx.includes("'guide_view'"), 'modulene i files i index.html');
  assert.ok(main.includes("fl('guide'") && main.includes("logEv('veiledning'"), 'innstilling og logEv');
  assert.ok(main.includes("'tlm.guidestall'"), 'admin-verdi for 45 s');
  assert.ok(/new THREE\.Mesh/.test(view) && (view.match(/new THREE\.Mesh\(/g) || []).length === 2 && (view.match(/ = mk\(/g) || []).length === 2, 'bare tre mesh-er (to ringer via mk, og en ramme)');
  assert.ok(!/new THREE\.(ShaderMaterial|MeshStandardMaterial|MeshPhysicalMaterial|Light)/.test(view), 'ingen nye shadere eller lys');
}
console.log('guide: ok');
