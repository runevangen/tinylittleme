// R117: teksturer på bygde deler: familie per del-type, delt materiale, UV følger lengden, tone stabil, knotter, teksturbudsjett.
import assert from 'node:assert/strict';
import * as THREE from './lib/three.module.min.js';
import { PART_TYPES } from './build_logic.js';
import { rodType } from './build_materials.js';
import * as TL from './build_tex_logic.js';
import { createBuildTex } from './build_tex.js';

// attrapp for canvas: tegnekallene gjør ingenting, men løper gjennom hele oppskriften
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } });
const make = (w, h) => ({ width: w, height: h, getContext: () => ctx });
const tx = createBuildTex(THREE, { make });

// 1) hver del-type gir en familie og et materiale; staver følger materialet
const types = [...Object.keys(PART_TYPES), rodType('wood', 3), rodType('steel', 2.5), rodType('rope', 4)];
for (const t of types) { const k = TL.texKind(t); assert.ok(TL.TEX_KINDS.includes(k), t + ' har familie'); const m = tx.material(t, PART_TYPES[t]?.color || '#c98a45'); assert.ok(m.map && m.vertexColors, t + ' har tekstur'); }
assert.equal(TL.texKind('plank_l'), 'wood'); assert.equal(TL.texKind('seesaw'), 'wood'); assert.equal(TL.texKind(rodType('steel', 2)), 'steel'); assert.equal(TL.texKind(rodType('rope', 2)), 'rope');
assert.equal(TL.texKind('lego'), 'plastic'); assert.equal(TL.texKind('weight'), 'steel'); assert.equal(TL.texKind('pencil'), 'pencil'); assert.equal(TL.texKind('ruler'), 'ruler');

// 2) samme type (og farge) deler materiale og tekstur; ulik lengde på staver deler også
assert.equal(tx.material('plank_l', '#c98a45'), tx.material('plank_l', '#c98a45'));
assert.equal(tx.material(rodType('steel', 2), '#8fa3b8'), tx.material(rodType('steel', 5), '#8fa3b8'), 'stålstaver av alle lengder deler materiale');
assert.equal(tx.material('plank_l', '#c98a45').map, tx.material('plank_s', '#d9a35f').map, 'tre deler én tekstur');
const st = tx.stats(); assert.ok(st.textures <= TL.TEX_KINDS.length, 'høyst én tekstur per familie'); assert.ok(st.bytes < 1024 * 1024, 'teksturminne under 1 MB: ' + st.bytes);
const lowTx = createBuildTex(THREE, { make, low: true }); lowTx.material('plank_l', '#c98a45'); assert.ok(lowTx.stats().bytes < st.bytes, 'lav profil gir mindre');

// 3) UV følger lengden: tetthet lik på kort og lang planke, og ingen strekk (u- og v-tetthet lik flisens)
{
  const rs = TL.faceRepeats('wood', 8, 0.5, 4), rk = TL.faceRepeats('wood', 4, 0.5, 4), [tu, tv] = TL.TILE.wood;
  assert.ok(Math.abs(rs[4].u / 8 - rk[4].u / 4) < 1e-9, 'samme tetthet langs lengden'); assert.ok(Math.abs(rs[4].u / 8 - 1 / tu) < 1e-9 && Math.abs(rs[4].v / 0.5 - 1 / tv) < 1e-9, 'kvadratiske teksler');
  const g = tx.geometry('plank_l', 8, 0.5, 4, 'a'), uv = g.attributes.uv, span = (f, ax) => { const v = []; for (let i = 0; i < 4; i++) v.push(uv[ax === 0 ? 'getX' : 'getY'](f * 4 + i)); return Math.max(...v) - Math.min(...v); };
  assert.ok(Math.abs(span(4, 0) - 8 / tu) < 1e-6, 'forsiden: u-spenn = lengde / flis'); assert.ok(Math.abs(span(4, 1) - 0.5 / tv) < 1e-6);
  const g2 = tx.geometry('plank_s', 4, 0.5, 4, 'b'), uv2 = g2.attributes.uv; assert.ok(Math.abs((uv2.getX(17) - uv2.getX(16)) || (uv2.getX(18) - uv2.getX(16)) || 0) <= span(4, 0) / 2 + 1e-6, 'kort planke viser halvparten');
  const a = tx.geometry('plank_l', 8, 0.5, 4, 'x1'), b = tx.geometry('plank_l', 8, 0.5, 4, 'x2'); assert.notEqual(a.attributes.uv.getX(0), b.attributes.uv.getX(0), 'kvistene sitter forskjellig per del');
}
// 4) tone: ±6 %, stabil, varierer
{
  const ts = new Set(); for (let i = 0; i < 40; i++) { const t = TL.toneFor('del' + i); assert.ok(t >= 0.94 - 1e-9 && t <= 1.06 + 1e-9, 'tone i ±6 %'); ts.add(t); assert.equal(TL.toneFor('del' + i), t, 'stabil'); }
  assert.ok(ts.size > 20, 'varierer'); const g = tx.geometry('plank_l', 8, 0.5, 4, 'del3'), c = g.attributes.color; assert.ok(Math.abs(c.getX(0) - TL.toneFor('del3')) < 1e-6); assert.equal(c.count, g.attributes.position.count);
}
// 5) knotter: bare på klosser, i samme geometri (ingen ekstra mesh), og under tak
{
  const lego = tx.geometry('lego', 2, 1.2, 3.96, 'l'), flat = tx.geometry('plank_l', 8, 0.5, 3.96, 'p'); assert.ok(lego.attributes.position.count > 24 + 8, 'knotter finnes'); assert.equal(flat.attributes.position.count, 24, 'planke er en ren boks');
  lego.computeBoundingBox(); assert.ok(Math.abs(lego.boundingBox.max.y - (0.6 + TL.KNOB_H)) < 1e-6, 'knottene stikker bare ' + TL.KNOB_H + ' over');
  assert.ok(TL.knobGrid(8, 8).length <= 12); assert.equal(TL.knobGrid(2, 3.96).length, 6);
  assert.ok(lego.index.count / 3 < 400, 'få trekanter');
}
console.log('test_buildtex ok');
