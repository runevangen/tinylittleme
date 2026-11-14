// node test_plates.mjs: gåteverktøy (R60): trykkplate (terskel, stabler, figuren), dør (åpne, lukke, i veien), to-plate-gåten, latch, vindebro, bryter,
// lagre/fortsett, delmål 'gate', Gåterommet (boten løser alle gåtene med ekte fysikk, ruta går bare når gåtene er løst), tegnebudsjett og tekster.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GATE, initGates, stepGates, plateLoad, plateNeed, massOf, doorBox, nearSwitch, toggleSwitch, gatesSave, restoreGates, resetGates, openAllGates, isActive, doorById, doorOpen, checkGates, gatesBudget, hasGates } from './plates_logic.js';
import { initGoals, stepGoals, goalTarget, checkGoals } from './goals.js';
import { makeT, DICT_KEYS } from './i18n.js';
import { walkRoute } from './tools/walk_route.mjs';
import { solveGates } from './tools/gate_bot.mjs';

const body = (id, x, z, weight = 'light', y = 0, s = 1) => ({ id, dyn: true, alive: true, weight, min: [x - s / 2, y, z - s / 2], max: [x + s / 2, y + s, z + s / 2] });
const me = (x, z, y = 0) => ({ x, y, z, onGround: true, state: 'ground' });
const mk = (extra = {}, bodies = []) => {
  const L = { boxes: [...bodies], bodies, gates: {
    plates: [{ id: 'a', x0: 0, x1: 4, z0: 0, z1: 4, y: 0, need: 2 }, { id: 'b', x0: 10, x1: 14, z0: 0, z1: 4, y: 0, need: 2 }],
    switches: [{ id: 's', x: 20, y: 0, z: 2 }],
    doors: [{ id: 'd', kind: 'door', min: [30, 0, 0], max: [31, 10, 8], needs: ['a'], dir: 'down' },
            { id: 'two', kind: 'door', min: [40, 0, 0], max: [41, 10, 8], needs: ['a', 'b'], dir: 'up' },
            { id: 'L', kind: 'door', min: [50, 0, 0], max: [51, 10, 8], needs: ['a'], dir: 'down', latch: true },
            { id: 'br', kind: 'bridge', min: [60, 0, 0], max: [70, 1, 4], needs: ['s'], axis: 'x', anchor: 'min' }], ...extra } };
  initGates(L); return L;
};
const run = (L, secs, p = null) => { const ev = []; for (let i = 0; i < Math.round(secs * 60); i++) ev.push(...stepGates(L, 1 / 60, p, true)); return ev; };

// 1) masse og terskel: figuren alene (1) er for lett til en plate med terskel 2, en lett ting (2) er nok, tunge ting teller mer
assert.equal(massOf(body('x', 0, 0, 'light')), GATE.mass.light); assert.ok(GATE.mass.light < GATE.mass.medium && GATE.mass.medium < GATE.mass.heavy);
assert.equal(massOf({ min: [0, 0, 0], max: [1, 1, 1], mass: 3 }), 3, 'bygde deler med mass teller');
assert.equal(massOf({ min: [0, 0, 0], max: [1, 1, 1] }), 0, 'faste bokser veier ingenting');
{
  const L = mk(); const a = L.gateS.plates[0];
  assert.equal(plateLoad(L, a, me(2, 2)), GATE.hero); assert.ok(plateLoad(L, a, me(2, 2)) < plateNeed(a), 'figuren alene er for lett');
  assert.equal(plateLoad(L, a, me(9, 2)), 0, 'ikke på plata'); assert.equal(plateLoad(L, a, { ...me(2, 2), onGround: false }), 0, 'hopper over plata: ingenting trykkes');
  assert.equal(plateLoad(L, a, me(2, 2, 3)), 0, 'langt over plata');
  const k = body('k', 2, 2); L.boxes.push(k); L.bodies.push(k);
  assert.equal(plateLoad(L, a, null), GATE.mass.light); k.carried = true; assert.equal(plateLoad(L, a, null), 0, 'båret ting trykker ikke'); k.carried = false;
  k.min[1] = 1.5; k.max[1] = 2.5; assert.equal(plateLoad(L, a, null), 0, 'ting i lufta trykker ikke');
  k.min[1] = 0; k.max[1] = 1; const k2 = body('k2', 2, 2, 'light', 1); L.boxes.push(k2); L.bodies.push(k2);
  assert.equal(plateLoad(L, a, null), 2 * GATE.mass.light, 'ting oppå en ting på plata teller også (stabel)');
  assert.equal(plateLoad(L, a, me(2, 2, 2)), 2 * GATE.mass.light + GATE.hero, 'figuren oppå stabelen teller');
}
// 2) åpne og lukke: døra synker når plata er trykket, og lukkes igjen når vekten tas bort
{
  const k = body('k', 2, 2), L = mk({}, [k]); const d = doorById(L, 'd');
  assert.ok(L.boxes.includes(d.box), 'lukket dør er en fast boks fra start');
  let ev = run(L, 0.3); assert.ok(d.t > 0 && d.t < 1, 'døra er på vei opp'); assert.ok(L.boxes.includes(d.box), 'halvåpen dør er fortsatt i veien');
  assert.ok(isActive(L, 'a') && L.gateS.plates[0].on, 'plata er trykket ned');
  ev = run(L, GATE.dur + 0.1);
  assert.ok(ev.some((e) => e.type === 'doorDone' && e.id === 'd' && e.open) && doorOpen(d), 'døra er helt åpen'); assert.ok(!L.boxes.includes(d.box) && d.box === null, 'åpen dør er ikke i veien');
  const mid = doorBox(d, 0.5); assert.ok(mid && Math.abs(mid.max[1] - 5) < 1e-9 && mid.min[1] === 0, 'dør som synker: halvveis er halv høyde');
  const up = doorBox(doorById(L, 'two'), 0.5); assert.ok(Math.abs(up.min[1] - 5) < 1e-9 && up.max[1] === 10, 'dør som heves: nederste del åpnes først');
  k.min = [20, 0, 20]; k.max = [21, 1, 21];                               // tingen tas bort
  ev = run(L, 0.1); assert.ok(ev.some((e) => e.type === 'plate' && !e.on) && ev.some((e) => e.type === 'door' && !e.open), 'plata slipper, døra begynner å lukke');
  run(L, GATE.dur + 0.1); assert.equal(d.t, 0); assert.ok(L.boxes.includes(d.box), 'døra står i veien igjen');
}
// 3) noe står i døra: den lukkes ikke over figuren eller en ting, men fullfører når det er borte
{
  const k = body('k', 2, 2), L = mk({}, [k]); const d = doorById(L, 'd'); run(L, GATE.dur + 0.5);
  k.min = [20, 0, 20]; k.max = [21, 1, 21];
  const inDoor = me(30.5, 4); const ev = []; for (let i = 0; i < 120; i++) ev.push(...stepGates(L, 1 / 60, inDoor, true));
  assert.ok(ev.some((e) => e.type === 'blocked' && e.id === 'd') && d.t > 0.5, 'figuren i døra stopper lukkingen'); assert.equal(ev.filter((e) => e.type === 'blocked').length, 1, 'bare én melding');
  run(L, GATE.dur + 0.2, me(5, 20)); assert.equal(d.t, 0, 'lukker seg når figuren har gått');
}
// 4) to plater samtidig (AND) og latch
{
  const k1 = body('k1', 2, 2), k2 = body('k2', 12, 2), L = mk({}, [k1]); const two = doorById(L, 'two'), lat = doorById(L, 'L');
  run(L, GATE.dur + 0.5); assert.equal(two.t, 0, 'bare én plate: dør nummer to står'); assert.ok(doorOpen(doorById(L, 'd')));
  L.boxes.push(k2); L.bodies.push(k2); run(L, GATE.dur + 0.5); assert.ok(doorOpen(two), 'begge plater: døra åpner seg');
  k2.min = [20, 0, 20]; k2.max = [21, 1, 21]; run(L, GATE.dur + 0.5); assert.equal(two.t, 0, 'tas den ene bort, lukkes døra');
  assert.ok(doorOpen(lat) && lat.latched, 'latch: blir stående åpen'); k1.min = [20, 0, 20]; k1.max = [21, 1, 21]; run(L, GATE.dur + 0.5); assert.ok(doorOpen(lat), 'også etter at vekten er borte');
  assert.ok(!doorOpen(doorById(L, 'd')), 'uten latch lukkes den vanlige døra');
}
// 5) figuren alene kan trykke en plate med lav terskel; skaleringen i admin gjør plater lettere/tyngre
{
  const L = mk(); L.gateS.plates[0].need = 1; run(L, 0.1, me(2, 2)); assert.ok(L.gateS.plates[0].on, 'terskel 1: figuren er nok');
  const L2 = mk(); GATE.hero = 2; run(L2, 0.1, me(2, 2)); assert.ok(L2.gateS.plates[0].on, 'tyngre figur (admin)'); GATE.hero = 1;
  const L3 = mk(); GATE.needScale = 0.5; run(L3, 0.1, me(2, 2)); assert.ok(L3.gateS.plates[0].on, 'halv terskel'); GATE.needScale = 1;
  const L4 = mk(); run(L4, 0.1, me(2, 2)); assert.ok(!L4.gateS.plates[0].on);
  const L5 = mk({}, [body('k', 2, 2)]); assert.deepEqual(stepGates(L5, 1 / 60, null, false), [], 'ikke aktiv (pause/mål): ingen hendelser'); assert.ok(!L5.gateS.plates[0].on);
}
// 6) bryter og vindebro
{
  const L = mk(); const br = doorById(L, 'br');
  assert.equal(nearSwitch(L, me(0, 0)), null); assert.equal(nearSwitch(L, me(19, 2)).id, 's'); assert.equal(nearSwitch(L, me(19, 2, 5)), null, 'ikke i samme høyde');
  assert.equal(doorBox(br, 0), null); assert.ok(!L.boxes.includes(br.box), 'lukket bro er ikke i veien');
  assert.deepEqual(toggleSwitch(L, 's'), { type: 'switch', id: 's', on: true }); run(L, GATE.dur / 2);
  const half = doorBox(br, br.t); assert.ok(half && half.min[0] === 60 && half.max[0] > 63 && half.max[0] < 67, 'broen vokser ut fra ankerenden'); assert.ok(L.boxes.includes(br.box), 'halvferdig bro bærer');
  run(L, GATE.dur); assert.ok(doorOpen(br)); assert.equal(br.box.max[0], 70, 'ferdig bro: full lengde');
  toggleSwitch(L, 's'); run(L, GATE.dur + 0.2); assert.equal(br.t, 0); assert.equal(br.box, null, 'bryter av: broen trekkes inn');
  assert.equal(toggleSwitch(L, 'finnes-ikke'), null);
}
// 7) lagre og fortsett: bryter og latch-dører overlever, resten regnes ut på nytt
{
  const k = body('k', 2, 2), L = mk({}, [k]); toggleSwitch(L, 's'); run(L, GATE.dur + 0.5);
  const saved = JSON.parse(JSON.stringify(gatesSave(L))); assert.deepEqual(saved, { sw: ['s'], open: ['L'] });
  const L2 = mk(); restoreGates(L2, saved);
  assert.ok(doorOpen(doorById(L2, 'L')) && L2.gateS.switches[0].on && doorById(L2, 'L').box === null, 'latch-døra står åpen etter fortsett');
  run(L2, GATE.dur + 0.3); assert.ok(doorOpen(doorById(L2, 'br')), 'bryteren står på: broen kommer');
  assert.ok(!doorOpen(doorById(L2, 'd')), 'hold-døra venter på at tingen legges tilbake');
  restoreGates(L2, { sw: 'rusk', open: [5, 'finnes-ikke'] }); assert.ok(!L2.gateS.switches[0].on && !doorOpen(doorById(L2, 'L')), 'ukjente/ødelagte data ignoreres');
  restoreGates(L2, null); resetGates(L2); assert.equal(doorById(L2, 'br').box, null);
  openAllGates(L2); assert.ok(L2.gateS.doors.every((d) => d.t === 1), 'openAllGates (brukes av walk_route)');
}
// 8) delmål av typen 'gate' og pila
{
  const k = body('k', 2, 2), L = mk({}, [k]); L.goals = [{ id: 'g', type: 'gate', door: 'd', label: 'x', en: 'x' }]; initGoals(L);
  const t = goalTarget(L, L.goalList[0], me(0, 0)); assert.ok(t && t.x === 2 && t.z === 2 || t.x === 2, 'pila peker på plata som ikke er trykket');
  assert.deepEqual(stepGoals(L, { player: me(0, 0) }), []); run(L, GATE.dur + 0.5); assert.deepEqual(stepGoals(L, { player: me(0, 0) }).map((e) => e.id), ['g']);
  k.min = [20, 0, 20]; k.max = [21, 1, 21]; run(L, GATE.dur + 0.5); assert.equal(stepGoals(L, { player: me(0, 0) }).length, 0, 'klart delmål forblir klart når døra lukkes');
  assert.match(checkGoals({ goals: [{ id: 'a', type: 'gate', door: 'z', label: 'a', en: 'a' }, { id: 'b', type: 'boss', label: 'a', en: 'a' }], route: [] }).join('|'), /døra z finnes ikke/);
}
// 9) brettdata: sjekken fanger feil
{
  assert.deepEqual(checkGates({}), []);
  const bad = { gates: { plates: [{ id: 'a', x0: 1, x1: 0, z0: 0, z1: 1, need: 1 }, { id: 'a', x0: 0, x1: 1, z0: 0, z1: 1, need: 1 }], doors: [{ id: 'd', kind: 'vindu', min: [0, 0, 0], max: [1, 1, 1], needs: ['ukjent'] }] } };
  const m = checkGates(bad).join('|'); assert.match(m, /finnes to ganger/); assert.match(m, /platen er ugyldig/); assert.match(m, /ukjent type/); assert.match(m, /finner ikke ukjent/);
}

// 10) Gåterommet: data, boten, ruta
const LV = JSON.parse(fs.readFileSync('levels/gaate.level.json', 'utf8'));
assert.deepEqual(checkGates(LV, { levelId: 'gaate' }), []); assert.deepEqual(checkGoals(LV, { levelId: 'gaate' }), []);
{
  const g = LV.gates, kinds = new Set(g.doors.map((d) => d.kind));
  assert.ok(g.plates.length >= 3 && g.switches.length >= 1 && kinds.has('door') && kinds.has('bridge'), 'testbrettet viser plate, dør, bryter og vindebro');
  assert.ok(g.doors.some((d) => d.needs.length >= 2), 'og to-plate-gåten'); assert.ok(g.doors.some((d) => d.latch), 'og en dør som blir stående åpen');
  assert.ok(g.plates.some((p) => p.need > GATE.hero) && g.plates.some((p) => p.need <= GATE.hero), 'både plater som trenger en ting og plater figuren klarer alene');
  const lights = LV.movables.filter((m) => m.weight === 'light').length, heavyPlates = g.plates.filter((p) => p.need > GATE.hero).length;
  assert.ok(lights >= heavyPlates, 'nok løse ting til alle tunge plater (alle gåter har en løsning)');
  assert.ok(LV.movables.filter((m) => m.weight === 'light').every((m) => Math.max(...m.max.map((v, i) => v - m.min[i])) <= 3.4), 'tingene kan bæres');
  assert.ok(LV.boxes.every((b) => !b.gate), 'dører og broer ligger ikke i boxes i brettfila (spillet legger dem inn)');
}
{
  const r = solveGates('levels/gaate.level.json'); assert.ok(r.ok, r.why); assert.deepEqual(r.solved.sort(), ['d1', 'd2', 'd3', 'd4'], 'boten løser alle fire gåtene med ekte fysikk');
  assert.ok(r.events.some((e) => e.type === 'plate' && e.on) && r.events.some((e) => e.type === 'switch' || e.type === 'door'), 'hendelsene kommer');
  assert.ok(r.log.some((l) => /tok klosse_a/.test(l)) && r.log.some((l) => /slo s1/.test(l)) && r.log.some((l) => /plate p4 trykket \(last 1\)/.test(l)), 'bærer klosser, slår bryteren og står på plata');
  assert.ok(r.L.boxes.every((b) => !b.gate || b.id === 'd3'), 'bare vindebroen står igjen i veien (som gulv)');
  // en gåte uten løsning blir funnet: fjern den siste løse tingen så to-plate-gåten ikke kan løses
  const broken = JSON.parse(JSON.stringify(LV)); broken.movables = broken.movables.filter((m) => m.id !== 'klosse_c');
  const rb = solveGates(null, { level: broken }); assert.ok(!rb.ok && /klosse|ingen løs ting|p3/.test(rb.why), `uten den andre klossen kan ikke to-plate-gåten løses: ${rb.why}`);
}
{
  const open = walkRoute('levels/gaate.level.json'); assert.ok(open.ok, `ruta går når gåtene er løst: ${open.why}`);
  const closed = walkRoute('levels/gaate.level.json', { closedGates: true }); assert.ok(!closed.ok, 'ruta går IKKE med lukkede dører og uten bro: gåtene blokkerer hovedveien på ekte');
}
// 11) tegnebudsjett: statisk (ingen GPU her), og ingen kostnad i brett uten gåter
{
  const b = gatesBudget(LV); assert.ok(b.calls > 0 && b.calls <= 40 && b.tris <= 1200, `Gåterommet: ${b.calls} tegnekall, ${b.tris} trekanter`);
  for (const f of fs.readdirSync('levels')) { const id = f.replace('.level.json', ''), L = JSON.parse(fs.readFileSync(`levels/${f}`, 'utf8')); if (id !== 'gaate' && id !== 'stue') { assert.equal(L.gates, undefined, `${id}: ingen gåteverktøy`); assert.deepEqual(gatesBudget(L), { calls: 0, tris: 0 }); assert.ok(!hasGates(L)); } }
  const view = fs.readFileSync('plates_view.js', 'utf8'); assert.equal((view.match(/new THREE\.(Box|Cylinder|Sphere)Geometry/g) || []).length, 3, 'tre delte geometrier, ingen per gjenstand');
  assert.ok(!/ShaderMaterial|onBeforeCompile|RawShaderMaterial/.test(view), 'ingen nye shadere'); assert.ok(/count: 0/.test(view), 'brett uten gåter tegner ingenting');
}
// 12) tekster, innstillinger, filliste, logg
{
  const i18n = fs.readFileSync('i18n.js', 'utf8'), main = fs.readFileSync('main.js', 'utf8');
  for (const k of ['gate.switchOn', 'gate.switchOff', 'gate.doorOpen', 'gate.bridgeOpen', 'gate.doorClose', 'gate.blocked', 'gate.switchHint', 'gate.intro']) assert.equal(i18n.split(`'${k}'`).length - 1, 2, `${k} på norsk og engelsk`);
  for (const lang of ['nb', 'en']) { const { T } = makeT(() => lang); const s = T('gate.intro', { take: 'TA', drop: 'SLIPP' }); assert.ok(/TA/.test(s) && !/\b(Mellomrom|tast|key)\b/i.test(s), `${lang}: nevner knappene`); }
  for (const id of ['gates', 'gatecam', 'gatehero', 'gateneed', 'gatedur']) assert.ok(new RegExp(`'${id}', '(spill|hjelp|admin)'`).test(main) && main.includes(`'tlm.${id}'`), `${id} i SETTINGS`);
  assert.ok(/'gatehero', 'admin'/.test(main) && /'gateneed', 'admin'/.test(main) && /'gatedur', 'admin'/.test(main), 'finjustering er admin');
  assert.ok(/logEv\('gåte'/.test(main), 'logEv(gåte …)'); assert.ok(main.includes('gates: gatesSave(LEVEL)') && main.includes('restoreGates(LEVEL, pr.gates)') && main.includes('resetGates(LEVEL)'), 'lagres, gjenopprettes og nullstilles'); assert.ok(main.includes("id: 'gaate'"), 'Gåterommet står i brettlista');
  assert.ok(main.indexOf("logEv('gåte', `${gateViews.count}") > main.indexOf('let won = false, clock = 0;'), 'oppstartslogg for gåter må komme etter clock (ellers TDZ-krasj ved lasting)');
  const html = fs.readFileSync('index.html', 'utf8'); assert.ok(html.includes("'plates_logic'") && html.includes("'plates_view'"), 'modulene står i files');
}
console.log('plates ok');
