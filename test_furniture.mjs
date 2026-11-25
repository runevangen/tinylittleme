// node test_furniture.mjs (R182): møbelmalene (sofa, seng, skrivebord, bord, hylleenhet, lampe, puff, koffert): alle bygges, ligger innenfor boksen,
// har lavt trekantantall, bruker face riktig, eldre brett (sofa i tre bokser, tynn bordplate) tegnes som før, kinds/navn/instruks à jour.
import { register } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { if (s === 'three') return { url: ${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)}, shortCircuit: true }; return n(s, c); }`));
const THREE = await import('three');
const { buildFurniture, tilpasset, FURNITURE, FACED, CM } = await import('./furniture.js');
const { KINDS } = await import('./kinds.js');
const { kindName } = await import('./kindnames.js');

const NEW = ['sofa', 'bed', 'desk', 'table', 'shelf_unit', 'lamp', 'pouffe', 'suitcase'];
// typiske mål i cm (bredde, høyde, dybde); 1 enhet = 5 cm
const CASES = { sofa: [200, 85, 90], bed: [160, 100, 210], desk: [140, 74, 70], table: [120, 74, 80], shelf_unit: [80, 180, 30], lamp: [30, 150, 30], pouffe: [45, 40, 45], suitcase: [45, 65, 25] };
const tris = (g) => { let n = 0; g.traverse((m) => { if (m.isMesh) { const gm = m.geometry; n += (gm.index ? gm.index.count : gm.attributes.position.count) / 3; } }); return n; };
const meshes = (g) => { let n = 0; g.traverse((m) => m.isMesh && n++); return n; };

for (const k of NEW) {
  assert.ok(KINDS[k] && KINDS[k].shaped, `${k}: shaped i kinds.js`); assert.ok(KINDS[k].desc.length > 20, `${k}: beskrivelse`);
  assert.ok(kindName(k, 'nb') && kindName(k, 'nb') !== kindName(k, 'en') || ['lamp', 'sofa', 'table'].includes(k) || kindName(k, 'nb') !== k, `${k}: norsk navn`); assert.ok(kindName(k, 'en'), `${k}: engelsk navn`);
  assert.ok(FURNITURE[k], `${k}: bygger i FURNITURE`);
  const [w, h, d] = CASES[k].map((v) => v * CM);
  assert.ok(tilpasset(k, w, h, d), `${k}: typisk mål er et helt møbel`);
  for (const face of ['N', 'S', 'E', 'W']) {
    const g = buildFurniture(k, w, h, d, { color: 0x88aa66, material: 'wood' }, face); assert.ok(g, `${k}/${face}: bygges`);
    g.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(g), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const W = w, D = d, tol = 0.06;
    assert.ok(s.x <= W + tol && s.y <= h + tol && s.z <= D + tol, `${k}/${face}: innenfor boksen (${s.x.toFixed(2)}×${s.y.toFixed(2)}×${s.z.toFixed(2)} mot ${W.toFixed(2)}×${h.toFixed(2)}×${D.toFixed(2)})`);
    assert.ok(Math.abs(c.x) < tol * 3 + W * 0.03 && Math.abs(c.z) < tol * 3 + D * 0.03, `${k}/${face}: sentrert (${c.x.toFixed(2)}, ${c.z.toFixed(2)})`);
    assert.ok(s.x >= W * 0.8 && s.y >= h * 0.8 && s.z >= D * 0.7, `${k}/${face}: fyller boksen (${s.x.toFixed(2)}×${s.y.toFixed(2)}×${s.z.toFixed(2)})`);
    assert.ok(b.min.y >= -h / 2 - tol && b.max.y <= h / 2 + tol, `${k}/${face}: høyden`);
  }
  const g = buildFurniture(k, w, h, d, { color: 0x88aa66 }), t = tris(g); assert.ok(t <= 6000 && meshes(g) <= 90, `${k}: trekantbudsjett (${t} trekanter, ${meshes(g)} deler)`);
  console.log(`  ${k}: ${t} trekanter, ${meshes(g)} deler`);
}
// face: ryggen (−z i standard) snur. Sofaens rygg ligger bakerst: tyngdepunktet av høye deler flytter seg med face
{
  const [w, h, d] = CASES.sofa.map((v) => v * CM), hi = (face) => { const g = buildFurniture('sofa', w, h, d, { color: 0x446688 }, face); g.updateMatrixWorld(true); const p = new THREE.Vector3(); let n = 0; g.traverse((m) => { if (m.isMesh) { const bb = new THREE.Box3().setFromObject(m); if (bb.max.y > h * 0.3) { p.add(bb.getCenter(new THREE.Vector3())); n++; } } }); return p.divideScalar(n); };
  assert.ok(hi('N').z < -d * 0.15 && hi('S').z > d * 0.15, 'rygg nord/sør'); 
  assert.ok(hi('E').x > d * 0.15 && hi('W').x < -d * 0.15, 'rygg øst/vest');
}
// eldre brett: deler av en sofa (sete, rygg, arm) og tynne plater tegnes ikke som møbler
assert.equal(tilpasset('sofa', 21.6, 8, 16), false, 'sofasete'); assert.equal(tilpasset('sofa', 24, 16, 4), false, 'sofarygg'); assert.equal(tilpasset('sofa', 2.4, 11.2, 16), false, 'sofaarm');
assert.equal(tilpasset('table', 24, 0.8, 16), false, 'tynn bordplate'); assert.equal(buildFurniture('sofa', 21.6, 8, 16, {}), null);
assert.equal(tilpasset('chest', 10, 10, 10), false, 'ukjent kind');
// props.js: buildSingle går via malene (face kommer fram)
{
  const { buildSingle } = await import('./props.js'); const [w, h, d] = CASES.bed.map((v) => v * CM);
  const a = buildSingle('bed', [w, h, d], { color: 0x6688aa, face: 'E' }); assert.ok(a, 'buildSingle bygger seng'); assert.ok(a.rotation.y !== 0, 'face E dreier');
  assert.ok(buildSingle('lamp', [6, 30, 6], { color: 0xffeeaa }), 'lampe');
}
// kopier og instruks à jour; norske og engelske navn; modulen står i index.html
execFileSync('node', ['tools/make_prompt.mjs', '--check'], { stdio: 'pipe' }); execFileSync('node', ['tools/sync_edge.mjs', '--check'], { stdio: 'pipe' });
assert.ok(/'furniture'/.test(fs.readFileSync('index.html', 'utf8')), 'furniture i files i index.html');
assert.ok(fs.readFileSync('docs/VISJON_PROMPT.md', 'utf8').includes('ÉN boks med hele ytre mål'), 'regelen står i instruksen');
console.log('test_furniture: OK');
