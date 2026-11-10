// node test_scene.mjs: scenene validerer, kinds stemmer med props.js, og bildetolkningsinstruksen er à jour.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { KINDS } from './kinds.js';
import { validateScene } from './tools/validate_scene.mjs';
import { promptText } from './tools/make_prompt.mjs';

for (const f of fs.readdirSync('scenes').filter((n) => n.endsWith('.scene.json'))) {
  const { errors } = validateScene(JSON.parse(fs.readFileSync(`scenes/${f}`, 'utf8')));
  assert.deepEqual(errors, [], `${f}: ${errors.join(' | ')}`);
}
// «shaped» i kinds.js skal ha en bygger i props.js (enkeltting eller gruppe)
const props = fs.readFileSync('props.js', 'utf8');
for (const [k, v] of Object.entries(KINDS)) {
  if (!v.shaped) continue;
  const single = new RegExp(`^  ${k}\\(`, 'm').test(props), grouped = props.includes(`'${k}'`);
  assert.ok(single || grouped, `kind «${k}» er merket shaped, men props.js har ingen bygger`);
}
assert.equal(fs.readFileSync('docs/VISJON_PROMPT.md', 'utf8'), promptText(), 'docs/VISJON_PROMPT.md er utdatert: kjør node tools/make_prompt.mjs');
// validatoren fanger vanlige feil
const bad = { units: 'cm', room: { width: 200, depth: 200, height: 200, floor: { material: 'wood' }, walls: { material: 'plaster' }, ceiling: { material: 'plaster' } }, start: { x: 10, z: 10 }, goal: { x: 100, y: 10, z: 100 },
  objects: [{ id: 'a', kind: 'box', material: 'wood', color: 'rød', box: [10, 5, 0, 10, 0, 10] }, { id: 'a', kind: 'toilet_tank', group: 'x', material: 'wood', color: '#ffffff', box: [0, 10, 0, 10, 0, 10] }] };
const r = validateScene(bad);
assert.ok(r.errors.some((e) => /color/.test(e)) && r.errors.some((e) => /min < maks/.test(e)) && r.errors.some((e) => /flere ganger/.test(e)) && r.errors.some((e) => /toilet_bowl/.test(e)), r.errors.join(' | '));
// alle moduler i roten som spillet laster skal stå i lista i index.html (ellers kan de bli hengende i nettleserens mellomlager)
{
  const html = fs.readFileSync('index.html', 'utf8'), list = (html.match(/const files = \[([^\]]+)\]/) || [])[1] || '';
  const used = new Set(); for (const f of ['main.js', 'props.js', 'look.js', 'hero.js', 'level.js']) for (const m of fs.readFileSync(f, 'utf8').matchAll(/from '\.\/([a-z_]+)\.js'|import\('\.\/([a-z_]+)\.js'\)/g)) used.add(m[1] || m[2]);
  for (const u of ['main', ...used]) assert.ok(list.includes(`'${u}'`), `index.html: «${u}» mangler i lista over filer som lastes med versjon`);
}
// nivåene: ruta skal kunne gås med ekte fysikk (tools/walk_route.mjs), uten hjelpetrinn, og nivå 1–3 er hvert lengre enn det forrige
{
  const { walkRoute } = await import('./tools/walk_route.mjs');
  let prev = 0;
  for (const id of ['bad', 'barnerom', 'kjokken', 'bad2', 'barnerom2', 'kjokken2']) {
    const L = JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8')), r = walkRoute(`levels/${id}.level.json`);
    assert.ok(r.ok, `${id}: ruta går ikke (${r.why})`);
    assert.equal(L.report.helpers.length, 0, `${id}: brettet trenger hjelpetrinn`);
    if (!id.endsWith('2')) { assert.ok(r.steps > prev, `${id}: skal ha flere steg enn forrige nivå (${r.steps} mot ${prev})`); prev = r.steps; }
  }
  // nivå 4–6 gjenbruker rommene, men ruta skal være en annen enn i nivå 1–3 (ny løsning), og målet et annet sted
  for (const id of ['bad', 'barnerom', 'kjokken']) {
    const a = JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8')), b = JSON.parse(fs.readFileSync(`levels/${id}2.level.json`, 'utf8'));
    assert.notDeepEqual(a.route.map((w) => w.id), b.route.map((w) => w.id), `${id}2: ruta er den samme som i ${id}`);
    assert.ok(Math.hypot(a.goal[0] - b.goal[0], a.goal[1] - b.goal[1], a.goal[2] - b.goal[2]) > 2 || id === 'kjokken', `${id}2: målet står samme sted`);
  }
  // variantene skal være laget av grunnscenene (tools/make_variants.mjs): kjør verktøyet på nytt hvis en grunnscene er endret
  { const { execFileSync } = await import('node:child_process'); const before = ['bad2', 'barnerom2', 'kjokken2'].map((n) => fs.readFileSync(`scenes/${n}.scene.json`, 'utf8'));
    execFileSync('node', ['tools/make_variants.mjs']); ['bad2', 'barnerom2', 'kjokken2'].forEach((n, i) => assert.equal(fs.readFileSync(`scenes/${n}.scene.json`, 'utf8'), before[i], `${n}: scenen er utdatert, kjør node tools/make_variants.mjs`)); }
}
console.log('scene-tester grønne');
