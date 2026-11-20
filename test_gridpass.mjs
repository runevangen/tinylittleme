// R102 (fra tester): kula stoppet mot støttestaver i Byggeskolen. Står lasten fast, prøves PRØV på nytt med at steile staver slipper den forbi; bare hvis det vinner, brukes det.
import fs from 'node:fs';
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const G = await import('./grid_logic.js'), BL = await import('./build_logic.js'), BP = await import('./build_phys.js'), EX = await import('./grid_example.js');
const L = JSON.parse(fs.readFileSync(new URL('./levels/bygglab.level.json', import.meta.url), 'utf8')), site = (id) => L.build.sites.find((s) => s.id === id);
const mk = (id) => { const B = BL.createBuild(JSON.parse(JSON.stringify(site(id))), {}, []); G.setMode(B, 'grid'); return B; };
// testerens bygg (fra ⚑-rapport v2.79, Byggeskole lab1): vei a1–B–a2 og to høye trekanter som møter veien i midten
const T = mk('lab1'), R = T.rg, [A1, A2] = R.nodes.filter((n) => n.fixed).sort((a, b) => a.u - b.u).map((n) => n.id);
R.nodes.push({ id: 'nA', u: -1.75, v: 3.5 }, { id: 'nB', u: 0, v: 0 }, { id: 'nC', u: 1.75, v: 3.5 });
let k = 0; for (const [a, b] of [[A1, 'nA'], ['nA', 'nB'], ['nB', 'nC'], ['nC', A2], ['nA', 'nC'], [A1, 'nB'], ['nB', A2]]) R.rods.push({ id: 'r' + k++, a, b, mat: 'wood' }); G.derive(T);
const lost = (load) => BP.runSim(G.simDef(T), { load });
for (const load of ['ball', 'car', 'robot']) assert.notEqual(lost(load).result, 'won', `${load}: uten rettelsen stopper støttene lasten (som tester meldte)`);
for (const load of ['ball', 'car', 'robot', 'figure']) {
  const a = G.simDefAuto(T, { load }, BP.runSim); const x = BP.runSim(a.def, { load });
  assert.equal(x.result, 'won', `${load}: testerens bygg vinner med rettelsen`); if (load !== 'figure') assert.ok(a.passed, `${load}: støttene slapp lasten forbi`);
}
// ingenting som vant før er endret: alle eksempelbroer i Byggeskolen og i broene vinner fortsatt med alle laster, med og uten valget
for (const id of ['lab1', 'lab4']) {
  const B = mk(id); EX.applyExample(B);
  for (const load of ['ball', 'car', 'robot', 'figure']) for (const on of [true, false]) { G.GRIDOPT.pass = on; const a = G.simDefAuto(B, { load }, BP.runSim); assert.equal(BP.runSim(a.def, { load }).result, 'won', `${id} eksempelbro ${load} valg ${on}`); }
}
G.GRIDOPT.pass = false; assert.equal(G.simDefAuto(T, { load: 'ball' }, BP.runSim).passed, false, 'valget av = som før'); G.GRIDOPT.pass = true;
assert.equal(G.simDefAuto(mk('lab1'), { load: 'ball' }, BP.runSim).passed, false, 'ingen staver = ingen endring');
const main = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8'), bld = fs.readFileSync(new URL('./build.js', import.meta.url), 'utf8');
assert.match(main, /fl\('buildgridpass', 'admin'/, '⚙-valget finnes'); assert.match(main, /logEv\('bygg', v \? 'støttestaver/, 'logEv'); assert.match(bld, /gridSimDefAuto\(B, so, runSim\)/, 'PRØV bruker det');
console.log('test_gridpass: ok');
