// node test_shortcut.mjs: R29, verktøy-gåter i nivå 4–6. Hvert rom har en genvei med hårgelé (trapp med et første trinn som er for høyt å hoppe opp på),
// og bevisene: uten verktøy kommer du ikke opp på trinnet, med verktøyet (gelfeltet lages av den ekte fysikken) går hele ruta til målet og er raskere enn den vanlige (lengre) ruta,
// som fortsatt går uten verktøy. Dessuten logikken for varsel (shortcut.js), at flaska og trinnene står fritt, og at nivå 1–3 er uten genveier.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { shortcutsOf, shortcutRoute, gateRoute, toolBoxes, stepIds, createShortcutWatch, stepShortcutWatch, resetShortcutWatch, nodeOf } from './shortcut.js';
import { walkShortcut } from './tools/walk_route.mjs';
import { KINDS, TOOLS } from './kinds.js';

const lv = (id) => JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8'));
for (const id of ['bad', 'barnerom', 'kjokken']) assert.equal(lv(id).shortcuts, undefined, `${id}: grunnrommene har ingen genvei`);
const tools = new Set();
for (const id of ['bad2', 'barnerom2', 'kjokken2', 'leke']) {
  const L = lv(id), list = shortcutsOf(L); assert.ok(list.length >= 1, `${id}: minst én verktøy-gåte`);
  for (const sc of list) {
    tools.add(sc.tool); assert.ok(TOOLS.includes(sc.tool), `${id}: kjent verktøy`);
    const item = L.movables.find((m) => m.id === sc.item); assert.ok(item && item.tool === sc.tool && KINDS[item.kind], `${id}: flaska finnes som verktøy`);
    assert.ok(L.hints.some((h) => h.id === sc.item && /TA/.test(h.text) && /SMØR/.test(h.text)), `${id}: lappen på flaska nevner knappene (TA, SMØR)`);
    assert.ok(L.hints.some((h) => h.id === sc.steps[0] && /TA/.test(h.text)), `${id}: lapp på første trinn`);
    for (const t of sc.steps) { const b = L.boxes.find((x) => x.id === t); assert.ok(b && b.shortcut, `${id}: trinnet ${t} er merket shortcut`); assert.ok(!L.route.some((r) => r.id === t), `${id}: trinnene hører ikke til den vanlige ruta`); }
    assert.ok(L.route.some((r) => r.id === sc.join), `${id}: genveien ender på en flate i ruta`);
    // flaska og trinnene står fritt for andre ting, og figuren kan stå foran første trinn
    const item0 = { min: item.min, max: item.max }, ov = (a, b) => a.min[0] < b.max[0] - 1e-3 && a.max[0] > b.min[0] + 1e-3 && a.min[1] < b.max[1] - 1e-3 && a.max[1] > b.min[1] + 1e-3 && a.min[2] < b.max[2] - 1e-3 && a.max[2] > b.min[2] + 1e-3;
    for (const b of L.boxes) { if (b.type === 'floor' || b.type === 'wall') continue; if (b.min[1] < 0.5 && b.max[1] < 0.5) continue; assert.ok(!ov(item0, b), `${id}: flaska ligger inni ${b.id}`); }
    for (const st of sc.steps.slice(1)) { const a = L.boxes.find((x) => x.id === st); for (const b of L.boxes) if (b.id !== a.id && b.type !== 'floor' && b.type !== 'wall' && !sc.steps.includes(b.id) && !(b.max[1] < 0.5) && b.id !== sc.join) assert.ok(!ov(a, b) || b.id === 'gulv', `${id}: ${a.id} overlapper ${b.id}`); }
    // beviset: uten verktøy, med verktøy, og den vanlige ruta (lengre)
    const w = walkShortcut(`levels/${id}.level.json`, sc); assert.ok(w.ok, `${id}/${sc.id}: ${w.why}`);
    assert.ok(!w.noTool.ok, 'første trinn kan ikke nås uten verktøyet'); assert.ok(w.plain.ok && w.withTool.ok); assert.ok(w.withTool.secs < w.plain.secs, 'genveien er raskere enn den vanlige ruta');
    const tb = toolBoxes(L, sc); assert.equal(tb.boxes.length, 1); assert.equal(tb.boxes[0].kind, 'gel'); assert.ok(tb.boxes[0].grip, 'gelfeltet er et grep');
    assert.ok(tb.boxes[0].min[1] < 1 && tb.boxes[0].max[1] > sc.steps.map((t) => nodeOf(L, t).top)[0], 'gelfeltet dekker trinnets høyde');
    // vanlig rute: uendret og uten hjelpetrinn
    assert.equal(L.report.helpers.length, 0, `${id}: ingen hjelpetrinn`);
    // varsel-logikk
    const S = createShortcutWatch(L), top = sc.steps[sc.steps.length - 1], first = sc.steps[0];
    const gb = (bid) => ({ onGround: true, groundBox: L.boxes.find((x) => x.id === bid) });
    assert.deepEqual(stepShortcutWatch(S, { onGround: true, groundBox: L.boxes[0] }), [], 'gulvet gir ingen hendelse');
    assert.deepEqual(stepShortcutWatch(S, gb(first)).map((e) => e.act), sc.steps.length === 1 ? ['step', 'top'] : ['step']);
    assert.deepEqual(stepShortcutWatch(S, gb(first)), [], 'bare én gang'); assert.ok(stepShortcutWatch(S, gb(top)).every((e) => e.act === 'top' || e.act === 'step')); assert.deepEqual(stepShortcutWatch(S, gb(top)), []);
    resetShortcutWatch(S); assert.ok(stepShortcutWatch(S, gb(first)).length >= 1, 'nullstilt');
  }
  assert.ok(stepIds(L).size >= 2);
}
assert.ok(tools.has('gel'));
console.log('shortcut ok');
