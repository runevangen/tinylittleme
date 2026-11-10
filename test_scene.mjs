// node test_scene.mjs: scenene validerer, kinds stemmer med props.js, og bildetolkningsinstruksen er à jour.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { KINDS } from './kinds.js';
import { SPIDER } from './foes.js';
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
// maur (v0.77): hver patrulje i hvert brett skal ha fri bane på flaten den går på, og ligge langt nok fra start til at du ikke blir angrepet med en gang
{
  const R = 0.7, HG = 0.85;
  for (const f of fs.readdirSync('levels').filter((n) => n.endsWith('.level.json'))) {
    const L = JSON.parse(fs.readFileSync(`levels/${f}`, 'utf8')); if (!L.ants?.length) continue;
    const solid = L.boxes.filter((b) => b.type !== 'floor' && b.type !== 'wall');
    const topAt = (x, z) => { let t = 0; for (const b of L.boxes) if (b.type !== 'wall' && x > b.min[0] && x < b.max[0] && z > b.min[2] && z < b.max[2]) t = Math.max(t, b.max[1]); return t; };
    const free = (x, y, z) => !solid.some((b) => x + R > b.min[0] && x - R < b.max[0] && z + R > b.min[2] && z - R < b.max[2] && y + HG > b.min[1] && y < b.max[1] - 0.01)
      && [[0, 0], [R, 0], [-R, 0], [0, R], [0, -R]].every(([dx, dz]) => topAt(x + dx, z + dz) >= y - 0.02) && Math.abs(topAt(x, z) - y) < 0.02;
    for (const a of L.ants) {
      for (let i = 0; i <= 60; i++) { const t = i / 60, x = a.a[0] + (a.b[0] - a.a[0]) * t, z = a.a[2] + (a.b[2] - a.a[2]) * t; assert.ok(free(x, a.a[1], z), `${f}: maur ${a.id} har ikke fri bane ved (${x.toFixed(1)}, ${z.toFixed(1)})`); }
      if (a.type === 'spider') {                                    // R6: hele hoppflata rundt edderkoppen (leash) skal være fri og på samme høyde, og ingen annen patrulje skal gå inn i den
        for (let k = 0; k < 16; k++) for (const r of [1, 2, 3, SPIDER.leash]) assert.ok(free(a.a[0] + Math.cos(k * Math.PI / 8) * r, a.a[1], a.a[2] + Math.sin(k * Math.PI / 8) * r), `${f}: edderkopp ${a.id} har ikke fri hoppflate`);
        assert.ok(Math.hypot(a.a[0] - L.start[0], a.a[2] - L.start[2]) > SPIDER.leash + SPIDER.alert + 2, `${f}: edderkopp ${a.id} ser deg fra start`);
        for (const o of L.ants) if (o !== a) for (let i = 0; i <= 40; i++) { const t = i / 40; assert.ok(Math.hypot(o.a[0] + (o.b[0] - o.a[0]) * t - a.a[0], o.a[2] + (o.b[2] - o.a[2]) * t - a.a[2]) > SPIDER.leash + 1, `${f}: ${o.id} går inn i hoppflata til ${a.id}`); }
      }
      // R6: ingen fiende (spiderens hjem og hoppflate, bærer- og maurpatruljer) skal stå eller gå inni en fallgruve/utskylling: da er den uten funksjon
      { const bad = (x, z) => (L.hazards || []).find((h) => (h.type === 'pit' || h.type === 'flush') && x > h.min[0] && x < h.max[0] && z > h.min[2] && z < h.max[2]);
        const pts = a.type === 'spider' ? [[a.a[0], a.a[2]], ...Array.from({ length: 16 * 4 }, (_, i) => [a.a[0] + Math.cos((i % 16) * Math.PI / 8) * (1 + Math.floor(i / 16) * (SPIDER.leash - 1) / 3), a.a[2] + Math.sin((i % 16) * Math.PI / 8) * (1 + Math.floor(i / 16) * (SPIDER.leash - 1) / 3)])]
          : Array.from({ length: 61 }, (_, i) => [a.a[0] + (a.b[0] - a.a[0]) * i / 60, a.a[2] + (a.b[2] - a.a[2]) * i / 60]);
        for (const [x, z] of pts) { const h = bad(x, z); assert.ok(!h, `${f}: ${a.type || 'maur'} ${a.id} står/går inni ${h?.id} (${x.toFixed(1)}, ${z.toFixed(1)})`); } }
      for (const t of [0, 1]) assert.ok(Math.hypot(a.a[0] + (a.b[0] - a.a[0]) * t - L.start[0], a.a[2] + (a.b[2] - a.a[2]) * t - L.start[2]) > 12, `${f}: maur ${a.id} er for nær start`);
    }
  }
}

// R6: variasjon i nivå 2-6 (hver har minst én edderkopp-vakt eller bærer-maur), og nivå 1 er uendret
{
  const types = (n) => (JSON.parse(fs.readFileSync(`levels/${n}.level.json`, 'utf8')).ants || []).map((a) => a.type || 'ant');
  for (const n of ['barnerom', 'kjokken', 'bad2', 'barnerom2', 'kjokken2']) assert.ok(types(n).some((t) => t === 'spider') && types(n).some((t) => t === 'carrier'), `${n}: mangler edderkopp og bærer-maur`);
  assert.ok(types('bad').every((t) => t === 'ant'), 'nivå 1 har bare vanlige maur');
}

console.log('scene-tester grønne');
