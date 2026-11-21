// R124: node test_round2.mjs: «Runde 2» av Hyllebroen (bro2) og Kjøkkenbroen (kjokkenbro2). Brettene lar seg bare vinne med fagverk i stål (tre alene og en rett rad av staver gir etter), gapet er 12 og 16
// byggeenheter, de har to mål i ulik høyde, variert last, og den harde veien finnes. Fysikken er den ekte (build_phys.js, grid_logic.js); det måles ikke FPS her (ekte følelse og bildefrekvens: testes på iPhone).
import fs from 'node:fs';
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const BL = await import('./build_logic.js'), G = await import('./grid_logic.js'), BP = await import('./build_phys.js'), GS = await import('./grid_stage.js'), BW = await import('./build_world.js'), GP = await import('./grid_play.js');
const R = await import('./round2_logic.js'), X = await import('./buildux_logic.js'), I18 = await import('./i18n.js');
const { walkRoute } = await import('./tools/walk_route.mjs');
const rd = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8');
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------- 0) ren logikk ----------
{
  assert.deepEqual(R.ROUND2_IDS, ['bro2', 'kjokkenbro2']); assert.ok(R.isRound2('bro2') && !R.isRound2('bro') && !R.isRound2(null));
  const lv = [{ id: 'bad' }, { id: 'bro' }, { id: 'bro2', round2: true }, { id: 'kjokkenbro2', round2: true }];
  assert.equal(R.round2Levels(lv, true).length, 4, 'på: alle brett'); assert.deepEqual(R.round2Levels(lv, false).map((l) => l.id), ['bad', 'bro'], 'av: bare dagens brett'); assert.deepEqual(R.round2Levels(null, false), []);
  const t = R.trussSpec(6); assert.equal(t.nodes.length, 10); assert.ok(t.rods.every(([a, b]) => a !== b && a < 2 + t.nodes.length && b < 2 + t.nodes.length), 'staver peker på ekte noder');
  assert.deepEqual(R.rowSpecOf(6).nodes, [[-4, 0], [-2, 0], [0, 0], [2, 0], [4, 0]]); assert.ok(R.allIn(t, 'wood').rods.every((r) => r[2] === 'wood'));
}

for (const id of R.ROUND2_IDS) {
  const C = R.R2[id], L = JSON.parse(rd(`./levels/${id}.level.json`)), site = L.build.sites[0], st = GS.stageOf(site), base = JSON.parse(rd(`./levels/${C.base}.level.json`));
  const mk = () => { const B = BL.createBuild(clone(site), {}, []); B.gridDeck = false; G.setMode(B, 'grid'); return B; };
  const build = (spec) => { const B = mk(), r = GP.applySpec(B, spec); assert.ok(r.ok, `${id}: bygget kan legges: ${r.why}`); return B; };
  const run = (B, load, k = st.massK) => BP.runSim(G.simDefAuto(B).def, { load, massK: k });
  const results = (B, k = st.massK) => st.loads.map((l) => run(B, l, k).result);
  const wins = (B, k = st.massK) => results(B, k).every((x) => x === 'won');

  // ---------- 1) brettet som data ----------
  assert.equal(L.build.sites.length, 1); assert.equal(site.id, C.site); assert.equal(site.anchors.length, 2);
  const gap = site.anchors[1].u - site.anchors[0].u; assert.equal(gap, C.gap); assert.ok(gap >= 12 && gap <= 18, `${id}: gapet er 12–18 byggeenheter (${gap})`);
  const bsite = base.build.sites[0], bgap = bsite.anchors[1].u - bsite.anchors[0].u; assert.ok(gap > bgap * 1.5, `${id}: mye større enn dagens brett (${gap} mot ${bgap})`);
  assert.ok(G.siteHasGrid(site) && site.deck.length === 2 && G.roadLevel(site) !== null, 'rutenett er aktivt og stedet har vei');
  assert.ok(st && st.loads.length >= 3 && st.loads.includes('car') && st.loads.includes('robot') && st.massK >= 10, 'variert, tung last: ' + JSON.stringify(st));
  assert.ok(site.grid.stars.three.cost < site.grid.stars.two.cost && site.grid.stars.two.cost <= st.budget, 'stjerner innenfor budsjettet');
  assert.ok(L.route.length >= 3, 'den harde veien (ruta) finnes');
  const gl = L.goals.find((g) => g.type === 'flag'); assert.ok(gl && gl.flag === site.id && !gl.gate && !gl.req, 'delmålet «Bygg» er valgfritt og koblet til stedet');
  const reach = L.goals.find((g) => g.type === 'reach' && g.gate); assert.ok(reach, 'delmålet «Nå flagget»');
  assert.equal((reach.alt || []).length, 1, 'to mål: flagget og en lavere hylle'); assert.ok(reach.alt[0].top < reach.top - 2, `målene har ulik høyde (${reach.alt[0].top} mot ${reach.top})`);
  assert.ok((L.hints || []).some((h) => /BYGG/.test(h.text) && /fagverk/.test(h.text) && !/\b(tast|Enter|klikk)\b/i.test(h.text)), 'lapp med knappenavn ved gapet');
  assert.ok((L.build.parts || []).length >= 8, 'delene er der (R120)');
  assert.equal(JSON.stringify(site.ref.grid), JSON.stringify(C.ref), 'brettet har referansen fra round2_logic.js'); assert.equal(JSON.stringify(site.ref.best), JSON.stringify(C.best));
  assert.deepEqual(site.grid.stage, C.stage); assert.deepEqual(site.grid.stars, C.stars);
  assert.ok(X.BUX.levels[id]?.includes(site.id) && X.buxSite({ levelId: id, site }), 'nyeste byggeskjerm (Rutenett) som i Byggeskolen');
  assert.ok(/'round2_logic'/.test(rd('./index.html')), 'modulen ligger i files i index.html');
  assert.match(rd('./perf_budget.js'), new RegExp(`${id}: \\{ calls`), 'ytelsesbudsjett'); assert.match(rd('./audio_fx.js'), new RegExp(`${id}: \\[`)); assert.match(rd('./test_bot.mjs'), new RegExp(`'${id}'`), 'boten tar med brettet');
  assert.ok(rd('./main.js').includes(`id: '${id}', round2: true`), 'brettet ligger i LEVELS');

  // ---------- 2) tre alene og en rett rad feiler ----------
  const row = (m) => R.rowSpecOf(C.half, m);
  assert.equal(G.rodCheck(mk().rg, 'a1', 'a2').ok, false, 'en enkelt stav rekker ikke over gapet');
  for (const mat of ['wood', 'steel', 'rope']) { const B = build(row(mat)); assert.ok(!wins(B), `rett rad i ${mat} holder ikke: ${results(B)}`); }
  assert.ok(!wins(build(R.allIn(C.ref, 'wood'))), 'fagverk i bare tre holder ikke: ' + results(build(R.allIn(C.ref, 'wood'))));
  assert.ok(!wins(build(R.allIn(C.ref, 'rope'))), 'fagverk i bare tau holder ikke');
  assert.ok(!wins(build(R.trussSpec(C.half, { b: 'wood', t: 'steel', v: 'steel', d: 'steel' }))), 'veien (nedre rad) i tre holder ikke, selv med stål over');
  for (const l of st.loads) assert.equal(run(build(R.allIn(C.ref, 'wood')), l).result, 'lost', `tre alene: ${l} kommer ikke over`);
  assert.equal(BP.runSim(G.simDefAuto(mk()).def, { load: 'figure', massK: st.massK }).result, 'lost', 'uten bygg faller figuren');

  // ---------- 3) fagverk i stål består, med margin ----------
  for (const [name, spec] of [['ref', C.ref], ['best', C.best]]) {
    const B = build(spec); assert.ok(wins(B), `${id}/${name}: fagverket i stål består med alle lastene: ${results(B)}`);
    assert.ok(wins(B, st.massK * 1.05) && wins(B, st.massK * 0.6), `${id}/${name}: og med margin (±5 %/−40 %)`);
    assert.equal(run(B, 'car').breaks.length, 0, 'uten brudd');
    assert.equal(JSON.stringify(results(build(spec))), JSON.stringify(results(B)), 'deterministisk');
    assert.ok(B.rg.rods.some((r) => r.mat === 'steel'), 'stål i bygget');
  }
  { const Br = build(C.ref), jr = GS.judge(Br.site, st, Br.placed, Br.links, { loadsDone: true }), Bb = build(C.best), jb = GS.judge(Bb.site, st, Bb.placed, Bb.links, { loadsDone: true });
    assert.ok(jr.passed && jr.stars >= 2 && jr.cost <= st.budget, `${id}: referansen består oppdraget (${jr.cost}/${st.budget}, ${jr.stars} stjerner)`);
    assert.equal(jb.stars, 3, `${id}: det billige fagverket gir 3 stjerner (${jb.cost}/${jb.parts})`); assert.ok(jb.cost < jr.cost && jb.passed);
    assert.ok(jr.stars < 3, 'referansen gir ikke tre stjerner'); }

  // ---------- 4) i verden og ruta ----------
  for (const [name, spc] of [['ref', C.ref], ['best', C.best]]) {
    const B = build(spc), def = G.simDef(B), solids = BW.buildSolids(B.site, BP.settledPlaced(def), { skip: new Set(G.loadPass(B)) }); assert.ok(solids.length > 0, 'bygget gir faste flater');
    const gr = GP.gridRefRoute(B.site, solids), route = gr && BW.refRoute(L, { ...B.site, ref: { ...site.ref, ...gr } }); assert.ok(route, `${id}/${name}: ruta via bygget finnes`);
    route.forEach((n, i) => { if (n.id.startsWith('@rutenett') && n.top > route[i - 1].top + 0.01) n.hop = true; });
    const built = walkRoute(null, { level: L, route, extraBoxes: solids }); assert.ok(built.ok, `${id}/${name}: ruta via bygget går i ekte fysikk: ${built.why}`);
    const len = (r) => { let q = [L.start[0], L.start[2]], t = 0; for (const n of r.slice(1)) { const c = [(n.x0 + n.x1) / 2, (n.z0 + n.z1) / 2]; t += Math.hypot(c[0] - q[0], c[1] - q[1]); q = c; } return t; };
    assert.ok(len(route) < len(L.route) - 20, `${id}/${name}: bygging er snarveien (${len(route).toFixed(0)} mot ${len(L.route).toFixed(0)})`);
  }
  const alt = walkRoute(`levels/${id}.level.json`); assert.ok(alt.ok, `${id}: den harde veien går: ${alt.why}`);
  const bad = walkRoute(null, { level: L, extraBoxes: BW.worstSolids(site) }); assert.ok(bad.ok, `${id}: verst tenkelige bygg stenger ikke den harde veien: ${bad.why}`);
  const none = walkRoute(null, { level: L, route: BW.refRoute(L, { ...site, ref: { ...site.ref, surfaces: [{ id: '@bro', u0: -4, u1: 4, top: 0.5 }] } }) }); assert.ok(!none.ok, `${id}: uten bygget går ikke snarveien`);
  // den lave hylla: bare fra hylla etter broen (en kjapp sjekk av at flatene ligger riktig)
  const lowBox = L.boxes.find((b) => b.id === reach.alt[0].id); assert.ok(lowBox && lowBox.max[1] === reach.alt[0].top, 'lav hylle finnes i brettet');
  assert.ok(lowBox.min[0] > site.x + site.anchors[1].u - 1, 'den lave hylla ligger etter broen');
}

// ---------- 5) tekster, innstilling, dokumenter ----------
{
  const main = rd('./main.js'); assert.ok(/fl\('buildround2', 'spill'/.test(main), 'innstilling buildround2'); assert.ok(/round2Levels\(LEVELS, round2On\)/.test(main), 'listen følger valget');
  assert.ok(/store\.get\('tlm\.buildround2', true\)/.test(main), 'standard på');
  const doc = rd('./docs/INNSTILLINGER.md'); assert.ok(doc.includes('buildround2'), 'dokumentert'); assert.ok(/Runde 2/.test(rd('./docs/NIVAER.md')), 'NIVAER.md har seksjonen');
  for (const lang of ['nb', 'en']) { const { T } = I18.makeT(() => lang); assert.ok(T('gstage.squareTip') && T('gstage.squareTip') !== 'gstage.squareTip'); }
}
console.log('test_round2: ok');
