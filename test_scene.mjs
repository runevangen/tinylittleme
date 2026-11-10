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
console.log('scene-tester grønne');
