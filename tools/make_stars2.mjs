// R126: finner runde 2-terskler («bygg billigst», «bygg lettest») og et bevisbygg for hvert rutenett-sted med veilinje, ved å minimere et fagverk med den ekte fysikken (build_phys.js).
// Bruk: node tools/make_stars2.mjs   (skriver stars2_data.js). Kjør på nytt hvis et sted, en last eller fysikken endres; test_stars2.mjs sjekker at dataene fortsatt holder.
import fs from 'node:fs';
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';
const R = fileURLToPath(new URL('../', import.meta.url));
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify('file://' + R + 'lib/three.module.min.js')},shortCircuit:true}; return n(s,c); }`));
const BL = await import(R + 'build_logic.js'), G = await import(R + 'grid_logic.js'), BP = await import(R + 'build_phys.js'), GS = await import(R + 'grid_stage.js'), EX = await import(R + 'grid_example.js'), GP = await import(R + 'grid_play.js'), R2 = await import(R + 'stars2_logic.js');
const rd = (f) => JSON.parse(fs.readFileSync(R + f, 'utf8'));
const sources = [['levels/bygglab.level.json', null], ['levels/badebro.level.json', null]];
const mkB = (site) => { const B = BL.createBuild(JSON.parse(JSON.stringify(site)), {}, []); B.gridDeck = false; G.setMode(B, 'grid'); return B; };
const tryB = (site, spec) => { const B = mkB(site), r = GP.applySpec(B, spec); return r.ok ? B : null; };
const wins = (site, st, spec) => { const B = tryB(site, spec); return !!B && st.loads.every((l) => BP.runSim(G.simDefAuto(B).def, { load: l, massK: st.massK }).result === 'won') && B; };
// spesifikasjon uten foreldreløse knuter (indeks 0 og 1 er ankrene)
function clean(spec) {
  const used = new Set(); for (const [a, b] of spec.rods) { used.add(a); used.add(b); }
  const map = new Map([[0, 0], [1, 1]]); const nodes = []; spec.nodes.forEach((n, i) => { if (used.has(i + 2)) { map.set(i + 2, nodes.length + 2); nodes.push(n); } });
  return { nodes, rods: spec.rods.map(([a, b, m]) => [map.get(a), map.get(b), m]) };
}
function pratt(site, rows, mat) {
  const sp = EX.exampleSpec(site, { rows }); if (!sp) return null; const N = sp.N, idx = new Map([['d0', 0], [`d${N}`, 1]]), nodes = [];
  for (let i = 1; i < N; i++) { idx.set(`d${i}`, 2 + nodes.length); nodes.push([sp.cols[i].u, sp.cols[0].v]); }
  for (const [k, u, v] of sp.nodes) { idx.set(k, 2 + nodes.length); nodes.push([u, v]); }
  const bottom = []; for (let i = 0; i < N; i++) bottom.push([`d${i}`, `d${i + 1}`]);   // underbanen (veien): i eksempelet er den dekket, her er den staver
  return { nodes, rods: [...bottom, ...sp.rods].map(([a, b]) => [idx.get(a), idx.get(b), mat]) };
}
// grådig: prøv å fjerne en stav eller bytte materiale (steel -> wood -> rope), behold hvis den fortsatt vinner med alle laster og målet blir bedre
function minimise(site, st, start, score, keep) {
  let cur = clean(start), curS = score(cur), improved = true;
  while (improved) {
    improved = false; const tries = [];
    cur.rods.forEach((r, i) => { tries.push(clean({ nodes: cur.nodes, rods: cur.rods.filter((_, j) => j !== i) })); for (const m of ['wood', 'rope']) if (r[2] !== m && !(r[2] === 'wood' && m === 'steel')) { const rods = cur.rods.map((x, j) => (j === i ? [x[0], x[1], m] : x)); tries.push({ nodes: cur.nodes, rods }); } });
    tries.sort((a, b) => score(a) - score(b));
    for (const t of tries) { if (score(t) >= curS) break; if (keep && !keep(t)) continue; if (wins(site, st, t)) { cur = t; curS = score(t); improved = true; break; } }
  }
  return cur;
}
const out = {};
for (const [file] of sources) {
  const L = rd(file);
  for (const site of L.build.sites) {
    const st = GS.stageOf(site); if (!st || !G.deckPoints(site)) continue;
    if (st.wind) { console.log(site.id, 'vind: bare dobbel bro tåler den, hoppes over'); continue; }
    let start = null; for (const rows of [1, 2]) { const sp = pratt(site, rows, 'steel'); if (sp && wins(site, st, sp)) { start = sp; break; } } if (!start && site.ref?.grid) start = site.ref.grid.rods.some(() => true) ? site.ref.grid : null;
    if (!start || !wins(site, st, start)) { console.log(site.id, 'ingen startbro som vinner: hoppes over'); continue; }
    const sc = (k) => (s) => { const B = tryB(site, s); if (!B) return 1e9; const x = R2.measure(B.placed, B.links); return k === 'cost' ? x.cost * 1000 + x.weight * 10 + x.parts : x.weight * 1000 + x.cost * 10 + x.parts; };
    const cheap = minimise(site, st, start, sc('cost')), light = minimise(site, st, start, sc('weight'));
    const bonus = R2.bonusPoint(site), bn = bonus ? (s) => { const B = tryB(site, s); return !!B && R2.bonusHit(bonus, B.placed, B.links); } : null;
    let withBonus = null; if (bonus && bn(start)) withBonus = minimise(site, st, start, sc('cost'), bn);
    if (withBonus) { const bb = tryB(site, withBonus), c = R2.measure(bb.placed, bb.links).cost; if (c > st.budget) { console.log(site.id, `smulen koster for mye (${c} av ${st.budget}): ingen smule på dette stedet`); withBonus = null; } }
    const mc = R2.measure(tryB(site, cheap).placed, tryB(site, cheap).links), ml = R2.measure(tryB(site, light).placed, tryB(site, light).links);
    const key = site.lab?.key ? site.id : site.id;
    out[key] = { level: file.includes('badebro') ? 'badebro' : 'bygglab', cheap: mc.cost, light: Math.ceil(ml.weight * 100 - 1e-9) / 100, bonus: withBonus ? bonus : null, refCheap: cheap, refLight: light, refBonus: withBonus };
    console.log(site.id, 'billigst', mc.cost, 'lettest', ml.weight.toFixed(2), 'bonus', bonus ? JSON.stringify(bonus) : '-', withBonus ? 'bevist' : 'ikke bevist');
  }
}
const body = '// R126: generert av tools/make_stars2.mjs (ikke rediger for hånd). Terskler for runde 2-stjerner og bevisbygg (applySpec-format: 0 og 1 = ankrene, 2.. = nodes) per byggested.\n'
  + 'export const STARS2_DATA = ' + JSON.stringify(out, null, 1).replace(/\n\s+/g, ' ') + ';\n';
fs.writeFileSync(R + 'stars2_data.js', body); console.log('skrev stars2_data.js:', Object.keys(out).join(', '));
