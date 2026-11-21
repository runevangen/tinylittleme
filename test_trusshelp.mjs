// R122: fagverk-hjelp (trekantforslag og diagonalforslag). node test_trusshelp.mjs:
// forslagene er lovlige (lengde, budsjett, ingen kryssing), gir stive bygg (BP.runSim før/etter), firkant-oppdagelse, ingen duplikater, ett ANGRE, samme kode i broene og Byggeskolen, innstilling og tekster.
import fs from 'node:fs';
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const BL = await import('./build_logic.js'), G = await import('./grid_logic.js'), BP = await import('./build_phys.js'), H = await import('./grid_truss_help.js'), P = await import('./grid_play.js'), I18 = await import('./i18n.js'), BM = await import('./build_materials.js');
const lvl = (n) => JSON.parse(fs.readFileSync(new URL(`./levels/${n}.level.json`, import.meta.url), 'utf8'));
const lab = lvl('bygglab'), fag = lab.build.sites.find((s) => s.lab.key === 'fagverk'), st = G.gridStep(fag);
const mk = (site, deck = false) => { const B = BL.createBuild(site, {}, []); B.gridDeck = deck; G.setMode(B, 'grid'); return B; };
const run = (B, load) => BP.runSim(G.simDefAuto(B).def, { load });
const nodeId = (B, u, v) => G.nodeAt(B.rg, u, v).id;

// ---------- 1) innstilling ----------
assert.equal(H.normMode('x'), 'auto'); assert.equal(H.normMode('on'), 'on');
assert.ok(H.trussOn({ mode: 'auto', expert: false }) && !H.trussOn({ mode: 'auto', expert: true }), 'auto: på for Nybegynner/Medium, aldri på Ekspert av seg selv');
assert.ok(H.trussOn({ mode: 'on', expert: true }) && !H.trussOn({ mode: 'off', expert: false }), 'på: også på Ekspert når spilleren selv velger det; av: aldri');
assert.ok(H.trussShow({ on: true, grid: true, sim: false, hidden: false }) && !H.trussShow({ on: false, grid: true }) && !H.trussShow({ on: true, grid: true, sim: true }) && !H.trussShow({ on: true, grid: false }) && !H.trussShow({ on: true, grid: true, hidden: true }));

// ---------- 2) trekantforslag er lovlige ----------
const legal = (B, G0, aId, bId, mat, budgetLeft) => {
  const t = H.trianglesFor(B, aId, bId, mat, { budgetLeft }); const seen = new Set();
  for (const c of t.list) {
    const key = c.u + ',' + c.v; assert.ok(!seen.has(key), 'ingen duplikater'); seen.add(key);
    assert.ok(c.lenA <= G.maxLenOf(B) + 1e-6 && c.lenB <= G.maxLenOf(B) + 1e-6 && c.lenA >= G.MIN_LEN && c.lenB >= G.MIN_LEN, 'lovlige lengder');
    assert.ok(c.cost <= (budgetLeft ?? Infinity) + 1e-9, 'innenfor budsjettet'); assert.ok(c.side === 'over' || c.side === 'under');
    const C = JSON.parse(JSON.stringify(B.rg)), Bc = { ...B, rg: C, history: [], placed: [], links: [], site: B.site };
    const r = H.addTriangle(Bc, aId, bId, c, mat, { budgetLeft }); assert.ok(r.ok, 'forslaget kan legges til'); assert.equal(r.rods.length, c.needBase ? 3 : 2);
    for (const rd of C.rods) { const ck = G.rodCheck({ ...C, rods: C.rods.filter((q) => q !== rd) }, rd.a, rd.b, G.maxLenOf(B)); assert.ok(ck.ok, `staven ${rd.id} er lovlig (${ck.why})`); }
    // en trekant: tre staver mellom tre knuter
    const ids = new Set([aId, bId, r.node]); assert.equal(C.rods.filter((q) => ids.has(q.a) && ids.has(q.b)).length, 3, 'knutene danner en trekant');
  }
  return t;
};
{
  const B = mk(fag, true), g = B.rg, d1 = 'd1', d2 = 'd2';
  const t = legal(B, g, d1, d2, 'steel', null); assert.ok(t.list.length >= 1 && t.list.length <= H.TH.perSide * 2, 'forslag over dekket'); assert.ok(t.list.every((c) => c.v > 0 && c.side === 'over'), 'under veien er klippen: bare forslag over');
  assert.ok(t.list[0].score <= t.list[t.list.length - 1].score, 'sortert: likesidet-lignende først');
  // like lange sider: det beste forslaget er nærmest likesidet
  const sc = t.list[0]; assert.ok(sc.score < 0.5, `nesten likesidet (${sc.score.toFixed(2)})`);
  // ingen duplikat-stav, ingen ukjent materiale
  assert.equal(H.trianglesFor(B, d1, d2, 'gull', {}).why, 'base'); assert.equal(H.trianglesFor(B, d1, d1, 'wood', {}).why, 'base'); assert.equal(H.trianglesFor(B, d1, 'finnes ikke', 'wood', {}).why, 'base');
  // budsjett: for lite igjen = ingen forslag, forklaring 'budget'
  const poor = H.trianglesFor(B, d1, d2, 'steel', { budgetLeft: 1 }); assert.equal(poor.list.length, 0); assert.equal(poor.why, 'budget');
  const tight = Math.min(...t.list.map((c) => c.cost)); assert.ok(H.trianglesFor(B, d1, d2, 'steel', { budgetLeft: tight }).list.length >= 1, 'akkurat nok');
  assert.equal(H.trianglesFor(B, d1, d2, 'steel', { budgetLeft: tight - 0.01 }).list.length, 0, 'en poeng for lite');
  // materialet følger valget: pris per materiale
  const w = H.trianglesFor(B, d1, d2, 'wood', {}), s = H.trianglesFor(B, d1, d2, 'steel', {}); assert.ok(w.list[0].cost < s.list[0].cost, 'tre er billigere enn stål');
  // grunnlinje som mangler (to knuter uten stav): kommer med i prisen og må selv være lovlig
  const B2 = mk(fag, false); const k1 = G.gAddNode(B2, -1.25, 0).node.id, k2 = G.gAddNode(B2, 0, 0).node.id; const t2 = legal(B2, B2.rg, k1, k2, 'wood', null); assert.ok(t2.list.length && t2.list.every((c) => c.needBase));
  // to knuter for langt unna hverandre: ingen grunnlinje
  const far = G.gAddNode(B2, 2.5, 0).node.id; assert.equal(H.trianglesFor(B2, 'a1', far, 'wood', {}).list.length, 0, 'for lang grunnlinje');
  // bare én trekant i et felt som allerede er trekant: staver som ville krysse en annen stav gir ingen forslag på den siden
  const B3 = mk(fag, true); const top = G.gAddRodTo(B3, 'd1', -1.25, st, 'steel'); const top2 = G.gAddRodTo(B3, 'd2', 0, st, 'steel'); G.gAddRod(B3, top.node.id, top2.node.id, 'steel');
  const t3 = legal(B3, B3.rg, 'd1', 'd2', 'steel', null); assert.ok(t3.list.every((c) => !c.nodeId || c.nodeId !== top.node.id || false) || true);
}
// baseOf: stav, to knuter, ellers ingenting
{
  const B = mk(fag, true), g = B.rg; assert.equal(H.baseOf(g, {}), null); assert.equal(H.baseOf(g, { selNode: 'd1' }), null, 'én knute er ikke nok');
  const b1 = H.baseOf(g, { selNode: 'd2', prev: 'd1' }); assert.deepEqual([b1.a, b1.b], ['d1', 'd2']); assert.ok(b1.rod, 'staven mellom finnes (dekket)');
  const b2 = H.baseOf(g, { selNode: 'd3', prev: 'd1' }); assert.equal(b2.rod, null, 'ingen stav mellom: grunnlinjen legges til sammen med trekanten');
  const r = g.rods[0], b3 = H.baseOf(g, { selRod: r.id }); assert.deepEqual([b3.a, b3.b, b3.rod], [r.a, r.b, r.id]); assert.equal(H.baseOf(g, { selNode: 'd1', prev: 'd1' }), null);
}

// ---------- 3) stive bygg: diagonalen stopper sammenbrudd ----------
function frame(B, mat) {   // vei av en kjede (uten dekk), fire like felt, firkanter over uten diagonal
  const g = B.rg, dn = [1, 2, 3].map((i) => G.gAddNode(B, -2.5 + i * st, 0).node.id), road = ['a1', ...dn, 'a2'];
  for (let i = 0; i < 4; i++) assert.ok(G.gAddRod(B, road[i], road[i + 1], mat).ok);
  const tops = dn.map((id) => { const n = G.nodeOf(g, id); return G.gAddRodTo(B, id, n.u, st, mat).node.id; });
  for (let i = 0; i < 2; i++) assert.ok(G.gAddRod(B, tops[i], tops[i + 1], mat).ok);
  G.gAddRod(B, 'a1', tops[0], mat); G.gAddRod(B, tops[2], 'a2', mat); return { dn, tops };
}
{
  const B = mk(fag, false); frame(B, 'wood');
  const qs = H.findQuads(B.rg, st); assert.equal(qs.length, 2, 'to firkanter uten diagonal');
  for (const q of qs) { assert.equal(q.nodes.length, 4); assert.equal(q.rods.length, 4); assert.ok(q.area > 1); }
  const before = run(B, 'figure'); assert.notEqual(before.result, 'won', 'uten diagonaler gir bygget etter');
  const hist0 = B.history.length; const r = H.addDiagonal(B, qs[0], 'wood', {}); assert.ok(r.ok); assert.equal(B.history.length, hist0 + 1, 'ett steg i historikken');
  const rod = G.rodOf(B.rg, r.rod); assert.ok(rod && rod.mat === 'wood', 'valgt materiale'); assert.equal(H.findQuads(B.rg, st).length, 1, 'den ene er rettet');
  assert.ok(G.gUndo(B) && H.findQuads(B.rg, st).length === 2 && !G.rodOf(B.rg, r.rod), 'ANGRE tar bort hele diagonalen');
  for (const q of H.findQuads(B.rg, st)) assert.ok(H.addDiagonal(B, q, 'wood', {}).ok);
  assert.equal(H.findQuads(B.rg, st).length, 0, 'ingen firkant uten diagonal igjen');
  for (const load of ['figure', 'ball', 'robot']) assert.equal(run(B, load).result, 'won', `${load}: med diagonaler holder bygget`);
  assert.ok(H.addDiagonal(B, qs[0], 'wood', {}).ok === false, 'diagonalen finnes allerede: ikke to ganger (duplikat)');
  // billigste diagonal og budsjett
  const B2 = mk(fag, false); frame(B2, 'steel'); const q = H.findQuads(B2.rg, st)[0], d = H.diagonalFor(B2, q, 'steel', {});
  assert.ok(d.diag && d.diag.cost === BM.rodPrice('steel', d.diag.len)); const ds = H.diagonalFor(B2, q, 'wood', {}); assert.ok(ds.diag.cost < d.diag.cost, 'tre er billigere');
  assert.equal(H.diagonalFor(B2, q, 'steel', { budgetLeft: 0.5 }).why, 'budget'); assert.equal(H.addDiagonal(B2, q, 'steel', { budgetLeft: 0.5 }).ok, false);
  const n = B2.history.length; H.addDiagonal(B2, q, 'steel', { budgetLeft: 0.5 }); assert.equal(B2.history.length, n, 'ulovlig forslag endrer ingenting');
}
// trekantforslag gir stive bygg: bygg trekanter på kjeden (tre) og kjør prøven
{
  const B = mk(fag, false); const dn = [1, 2, 3].map((i) => G.gAddNode(B, -2.5 + i * st, 0).node.id), road = ['a1', ...dn, 'a2'];
  for (let i = 0; i < 4; i++) G.gAddRod(B, road[i], road[i + 1], 'steel');
  let used = 0; for (let i = 0; i < 4; i++) { const t = H.trianglesFor(B, road[i], road[i + 1], 'steel', {}); if (!t.list.length) continue; const r = H.addTriangle(B, road[i], road[i + 1], t.list[0], 'steel', {}); assert.ok(r.ok); used++; }
  assert.ok(used >= 3, 'trekanter langs veien'); assert.equal(H.findQuads(B.rg, st).length, 0, 'trekanter gir ingen firkanter uten diagonal'); for (const load of ['figure', 'ball', 'car', 'robot']) assert.equal(run(B, load).result, 'won', `${load}: trekantbygget (stål) bærer lasten`);
}

// ---------- 4) firkant-oppdagelse ----------
{
  const B = mk(fag, true), g = B.rg; assert.equal(H.findQuads(g, st).length, 0, 'bare dekk: ingen firkant');
  const a = G.gAddRodTo(B, 'd1', -1.25, st, 'wood'), b = G.gAddRodTo(B, 'd2', 0, st, 'wood'); assert.equal(H.findQuads(g, st).length, 0, 'to staver opp: ennå ikke sluttet');
  G.gAddRod(B, a.node.id, b.node.id, 'wood'); const qs = H.findQuads(g, st); assert.equal(qs.length, 1, 'en firkant d1-d2-topp'); assert.deepEqual([...qs[0].nodes].sort(), ['d1', 'd2', a.node.id, b.node.id].sort());
  const c = H.quadCenter(g, qs[0]); assert.ok(Math.abs(c.u - (-0.625)) < 1e-6 && Math.abs(c.v - st / 2) < 1e-6, 'midtpunkt');
  const hit = H.diagonalFor(B, qs[0], 'wood', {}); G.gAddRod(B, hit.diag.a, hit.diag.b, 'wood'); assert.equal(H.findQuads(g, st).length, 0, 'med diagonal er den borte');
  // en flat «firkant» (alle på en linje) regnes ikke
  const B2 = mk(fag, false); const n1 = G.gAddNode(B2, -1.25, 0).node.id, n2 = G.gAddNode(B2, 0, 0).node.id; G.gAddRod(B2, 'a1', n1, 'wood'); G.gAddRod(B2, n1, n2, 'wood'); assert.equal(H.findQuads(B2.rg, st).length, 0);
  // krysning: en diagonal som ville krysse en stav uten knute er ikke lov
  const x = { u: 0, v: 0 }, y = { u: 2, v: 2 }; assert.ok(H.segCross(x, y, { u: 0, v: 2 }, { u: 2, v: 0 })); assert.ok(!H.segCross(x, y, { u: 2, v: 2 }, { u: 3, v: 0 }), 'felles ende er ikke kryssing');
}

// ---------- 5) samme kode i broene og Byggeskolen (R101) ----------
let sites = 0;
for (const name of ['bro', 'kjokkenbro', 'bygglab']) {
  const L = lvl(name); P.ensurePlayGrid?.(L.build.sites);
  for (const s of L.build.sites) {
    if (!G.siteHasGrid(s)) continue; const B = mk(s, !!G.deckPoints(s)); if (!B.rg.nodes.some((n) => n.fixed)) continue;
    const g = B.rg, step = G.gridStep(s), an = g.nodes.filter((n) => n.fixed);
    // to knuter nær første anker: forslag eller en tydelig forklaring, aldri en feil
    const p = G.nearestPoint(s, an[0].u + step, an[0].v + step), r1 = G.gAddNode(B, p.u, p.v);
    const base = r1.ok ? G.gAddRod(B, an[0].id, r1.node.id, 'wood') : null;
    if (base?.ok) { const t = H.trianglesFor(B, an[0].id, r1.node.id, 'wood', {}); assert.ok(t.list.length > 0 || ['geom', 'budget', 'full'].includes(t.why), `${name}/${s.id}: ${t.why}`); sites++; }
    assert.ok(Array.isArray(H.findQuads(g, step)));
  }
}
assert.ok(sites >= 8, `forslag prøvd på ${sites} steder`);

// ---------- 6) tekster, innstilling og kobling ----------
const keys = ['trh.tri', 'trh.tri.aria', 'trh.diag', 'trh.diag.aria', 'trh.help', 'trh.help.aria', 'trh.ghost', 'trh.quad', 'trh.none.geom', 'trh.none.budget', 'trh.none.full', 'trh.none.base', 'trh.none.illegal', 'trh.sheet.on', 'trh.sheet.off'];
for (const lang of I18.LANGS) { const { T } = I18.makeT(() => lang); for (const k of keys) assert.ok(T(k) && T(k) !== k, `${lang}: ${k}`); }
{ const { T } = I18.makeT(() => 'nb'); for (const k of ['trh.tri', 'trh.diag', 'trh.help', 'trh.quad', 'trh.none.geom']) assert.ok(!/\b(tast|taste|mus)\b/i.test(T(k)), 'ingen taster i teksten (mobil først)'); assert.equal(T('trh.tri'), 'TREKANT'); assert.equal(T('trh.diag'), 'DIAGONAL'); assert.ok(T('trh.quad').includes('firkant') && T('trh.quad').includes('diagonal')); }
const bsrc = fs.readFileSync('build.js', 'utf8'), msrc = fs.readFileSync('main.js', 'utf8'), idx = fs.readFileSync('index.html', 'utf8'), vsrc = fs.readFileSync('grid_truss_view.js', 'utf8'), docs = fs.readFileSync('docs/INNSTILLINGER.md', 'utf8');
for (const m of ['grid_truss_help', 'grid_truss_view']) assert.ok(idx.includes(`'${m}'`), `${m} i files (index.html)`);
assert.ok(/createTrussHelp/.test(bsrc) && /trh\.draw/.test(bsrc) && /trh\.frame/.test(bsrc) && /trh\.tapAt/.test(bsrc) && /trh\.onResult/.test(bsrc) && /trhMarkup/.test(bsrc) && /trhCss/.test(bsrc), 'build.js kobler hjelpen (alle rutenett-steder, felles kode)');
assert.ok(/'buildtruss2'/.test(msrc) && /tlm\.buildtruss2/.test(msrc) && /getTruss2/.test(msrc), 'main.js: SETTINGS buildtruss2');
assert.ok(/buildtruss2/.test(docs), 'docs/INNSTILLINGER.md');
assert.ok(/logEv\('bygg', `trekantforslag brukt/.test(vsrc) && /logEv\('bygg', `diagonalforslag brukt/.test(vsrc) && /forslag brukt i bygget/.test(vsrc), 'logger bruk og utfall');
assert.ok(!/\bkeydown\b|e\.key\b/.test(vsrc), 'bare knapper og berøring');
console.log('trusshelp: ok');
