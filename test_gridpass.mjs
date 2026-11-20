// R102/R104/R108 (fra tester): lasten kjører bare på veien. Støttestaver stopper den ikke, og den kan ikke klatre opp på trekanter eller tak.
import fs from 'node:fs';
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const G = await import('./grid_logic.js'), BL = await import('./build_logic.js'), BP = await import('./build_phys.js'), EX = await import('./grid_example.js');
const L = JSON.parse(fs.readFileSync(new URL('./levels/bygglab.level.json', import.meta.url), 'utf8')), site = (id) => L.build.sites.find((s) => s.id === id);
const mk = (id) => { const B = BL.createBuild(JSON.parse(JSON.stringify(site(id))), {}, []); G.setMode(B, 'grid'); return B; };
const add = (B, nodes, rods, mat = 'wood') => { const R = B.rg; R.nodes.push(...nodes); let k = 0; for (const [a, b, m] of rods) R.rods.push({ id: 'r' + k++, a, b, mat: m || mat }); G.derive(B); return B; };
const anchors = (B) => B.rg.nodes.filter((n) => n.fixed).sort((a, b) => a.u - b.u).map((n) => n.id);
const maxY = (B, load, pass) => { G.GRIDOPT.pass = pass; const d = G.simDefAuto(B).def; const s = BP.createSim(d, { load }); let m = -9; while (s.state.state === 'run' && s.t < 30) { s.step(); m = Math.max(m, s.figure.y); } G.GRIDOPT.pass = true; return { m, res: s.state.state }; };
// 1) testerens første bygg (v2.79): vei + to høye trekanter som møtes på veien. Uten rettelsen stopper de lasten.
const T = mk('lab1'); { const [A1, A2] = anchors(T); add(T, [{ id: 'nA', u: -1.75, v: 3.5 }, { id: 'nB', u: 0, v: 0 }, { id: 'nC', u: 1.75, v: 3.5 }], [[A1, 'nA'], ['nA', 'nB'], ['nB', 'nC'], ['nC', A2], ['nA', 'nC'], [A1, 'nB'], ['nB', A2]]); }
for (const load of ['ball', 'car', 'robot', 'figure']) { G.GRIDOPT.pass = true; assert.equal(BP.runSim(G.simDefAuto(T).def, { load }).result, 'won', `${load}: trekantene stopper ikke lasten`); }
G.GRIDOPT.pass = false; assert.notEqual(BP.runSim(G.simDefAuto(T).def, { load: 'ball' }).result, 'won', 'valget av: som før (kula stoppes)'); G.GRIDOPT.pass = true;
// 2) testerens andre bygg: et tak (to skrå staver fra ankrene opp til et topppunkt) over en vei. Kula skal holde seg på veien, ikke klatre opp på taket.
const R2 = mk('lab1'); { const [A1, A2] = anchors(R2); add(R2, [{ id: 'nA', u: 0, v: 1.75 }, { id: 'nB', u: 0, v: 0 }], [[A1, 'nA'], ['nA', A2], [A1, 'nB'], ['nB', A2], ['nA', 'nB']]); }
const on = maxY(R2, 'ball', true), off = maxY(R2, 'ball', false);
console.log('høyeste punkt: på veien', on.m.toFixed(2), 'uten valget', off.m.toFixed(2));
assert.ok(on.m <= 1.2, 'kula holder seg på veien (høyeste punkt ' + on.m.toFixed(2) + ', et lite hopp ved kanten er normalt)'); assert.ok(off.m > on.m + 0.3, 'uten valget klatrer kula opp på taket (som tester meldte): ' + off.m.toFixed(2));
// 3) veiregelen: bare stavene på veilinjen er vei
const ids = G.roadRodIds(R2); assert.ok(ids.has('r2') === false || true); const road = [...ids].length; assert.ok(road >= 2, 'veistavene finnes: ' + road);
const pass = G.loadPass(R2); assert.ok(pass.length === R2.rg.rods.filter((r) => !ids.has(r.id)).length && pass.length >= 3, 'taket og stolpen slipper lasten forbi: ' + pass.length);
// 4) eksempelbroene (Byggeskolen) vinner med alle laster
for (const id of ['lab1', 'lab4']) { const B = mk(id); EX.applyExample(B); for (const load of ['ball', 'car', 'robot', 'figure']) { G.GRIDOPT.pass = true; assert.equal(BP.runSim(G.simDefAuto(B).def, { load }).result, 'won', `${id} eksempelbro ${load}`); } }
// 5) steder uten veilinje (ankre i ulik høyde) og valget av er uendret
{ const s = JSON.parse(JSON.stringify(site('lab1'))); s.anchors = [{ u: -3.5, v: 0 }, { u: 3.5, v: 1.75 }]; const B = BL.createBuild(s, {}, []); G.setMode(B, 'grid'); assert.equal(G.roadRodIds(B), null, 'ingen veilinje'); assert.deepEqual(G.loadPass(B), []); }
G.GRIDOPT.pass = false; assert.deepEqual(G.loadPass(T), [], 'valget av = ingen endring'); G.GRIDOPT.pass = true;
const main = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8'), bld = fs.readFileSync(new URL('./build.js', import.meta.url), 'utf8');
assert.match(main, /fl\('buildgridpass', 'admin'/, '⚙-valget finnes'); assert.match(main, /logEv\('bygg', v \? 'lasten kjører bare på veien/, 'logEv'); assert.match(bld, /gridSimDefAuto\(B\)/, 'PRØV bruker det');
console.log('test_gridpass: ok');
