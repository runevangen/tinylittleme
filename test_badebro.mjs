// R119: node test_badebro.mjs: «Bygg 5: Broen over badekaret». Brettet lar seg bare løse med trekanter (fagverk) i byggeren, og den harde veien finnes. Fysikken er den ekte (build_phys.js,
// grid_logic.js); det måles ikke FPS her (ekte følelse og bildefrekvens: testes på iPhone).
import fs from 'node:fs';
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const BL = await import('./build_logic.js'), G = await import('./grid_logic.js'), BP = await import('./build_phys.js'), BB = await import('./build_budget.js'), GS = await import('./grid_stage.js');
const BW = await import('./build_world.js'), GP = await import('./grid_play.js'), BD = await import('./badebro_logic.js'), I18 = await import('./i18n.js');
const { walkRoute } = await import('./tools/walk_route.mjs');
const rd = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8');
const L = JSON.parse(rd('./levels/badebro.level.json')), site = L.build.sites[0], st = GS.stageOf(site);
const W = 'wood', S = 'steel', R = 'rope';

// ---------- 1) brettet som data ----------
{
  assert.equal(L.build.sites.length, 1); assert.equal(site.id, BD.BADEBRO.siteId); assert.equal(site.anchors.length, 2); assert.equal(site.anchors[0].v, site.anchors[1].v, 'to ankre på samme høyde');
  const gap = site.anchors[1].u - site.anchors[0].u; assert.ok(gap >= 7 && gap <= 9, `gapet er 7–9 byggeenheter (${gap})`);
  assert.ok(G.siteHasGrid(site) && site.deck.length === 2 && G.roadLevel(site) !== null, 'rutenett er aktivt og stedet har vei');
  assert.ok(st && st.massK >= 10 && st.budget >= 20 && st.loads.includes('car') && st.loads.length >= 3, 'oppdrag: tung last og budsjett: ' + JSON.stringify(st));
  assert.ok(site.grid.stars.three.cost < site.grid.stars.two.cost && site.grid.stars.two.cost <= st.budget, 'stjerner innenfor budsjettet');
  assert.ok(L.route.length >= 3, 'den harde veien (ruta) finnes'); assert.ok((L.collectibles || []).length >= 2 && (L.ants || []).length >= 1, 'smuler og maur på veien');
  const gl = L.goals.find((g) => g.type === 'flag'); assert.ok(gl && gl.flag === site.id && !gl.gate && !gl.req, 'delmålet «Bygg broen» er valgfritt og koblet til stedet');
  assert.ok(L.goals.some((g) => g.type === 'reach' && g.gate), 'delmålet «Nå flagget»');
  assert.ok((L.hints || []).some((h) => /innsjø/.test(h.text) && /BYGG/.test(h.text) && !/\b(tast|Enter|klikk)\b/i.test(h.text)), 'fortelling-linje på brettet (lapp med knappenavn)');
  assert.ok((L.hazards || []).some((h) => h.type === 'pit'), 'vannet i badekaret nullstiller');
  const main = rd('./main.js'); assert.match(main, /id: 'badebro', label: 'Bygg 5: Broen over badekaret/); assert.match(main, /short: 'Bygg · Badebro'/);
  assert.ok(rd('./index.html').includes("'badebro_logic'"), 'modulen ligger i files i index.html');
  assert.ok(/badebro/.test(rd('./audio_fx.js')) && /badebro/.test(rd('./perf_budget.js')), 'lyd og ytelsesbudsjett');
  assert.match(rd('./test_bot.mjs'), /'badebro'/, 'boten tar med brettet');
  const sc = JSON.parse(rd('./scenes/badebro.scene.json')); assert.equal(sc.room.floor.material, 'tile'); assert.equal(sc.room.walls.material, 'tile', 'samme teksturer som badet');
}

// ---------- 2) bygg og kjør ----------
const mk = () => { const B = BL.createBuild(JSON.parse(JSON.stringify(site)), {}, []); B.gridDeck = false; G.setMode(B, 'grid'); return B; };
const build = (spec) => { const B = mk(), r = GP.applySpec(B, spec); assert.ok(r.ok, 'bygget kan legges: ' + r.why + ' ' + JSON.stringify(spec)); return B; };
const run = (B, load, k = st.massK) => BP.runSim(G.simDefAuto(B).def, { load, massK: k });
const results = (B, k = st.massK) => st.loads.map((l) => run(B, l, k).result);
const wins = (B, k = st.massK) => results(B, k).every((x) => x === 'won');
const stars = (B) => BB.starsFor(B.site, B.placed, B.links);
const ids = ['a1', 'a2'];
// rad av fire staver mellom ankrene (en «rett planke»), og firkant (to rader + stolper, ingen diagonal)
const row = (m) => ({ nodes: [[-2, 0], [0, 0], [2, 0]], rods: [[0, 2, m[0]], [2, 3, m[1]], [3, 4, m[2]], [4, 1, m[3]]] });
const NODES = [[-2, 0], [0, 0], [2, 0], [-2, 2], [0, 2], [2, 2]];
const spec = (rods) => ({ nodes: NODES, rods });
const square = (mb, mt, mv) => spec([[0, 2, mb], [2, 3, mb], [3, 4, mb], [4, 1, mb], [5, 6, mt], [6, 7, mt], [0, 5, mv], [1, 7, mv], [2, 5, mv], [3, 6, mv], [4, 7, mv]]);
const ref = site.ref.grid, best = site.ref.best;
void ids;

{
  // (a) en rett stav over hele gapet går ikke (for lang), og en rett rad av staver i tre og i stål gir etter med den tunge lasten
  const B0 = mk(); assert.equal(G.rodCheck(B0.rg, 'a1', 'a2').ok, false, 'en enkelt stav rekker ikke over gapet'); assert.equal(G.rodCheck(B0.rg, 'a1', 'a2').why, 'far');
  for (const mat of [W, S, R]) { const B = build(row([mat, mat, mat, mat])); assert.ok(!wins(B), `rett rad i ${mat} holder ikke: ${results(B)}`); assert.equal(GS.judge(B.site, st, B.placed, B.links, { loadsDone: wins(B) }).passed, false); }
  assert.equal(run(build(row([W, W, W, W])), 'car').result, 'lost'); assert.equal(run(build(row([S, S, S, S])), 'car').result, 'lost', 'selv stål gir etter (siger for mye)');
  // (b) firkant uten diagonal i alle materialkombinasjoner (tre og stål) mislykkes
  for (const mb of [W, S]) for (const mt of [W, S]) for (const mv of [W, S]) { const B = build(square(mb, mt, mv)); assert.ok(!wins(B), `firkant ${mb}/${mt}/${mv} gir etter: ${results(B)}`); assert.ok(BD.hasOpenSquare(B.rg), 'og regnes som åpen firkant'); }
  // (e) bare tau (ingen trykkstaver): trekantbroen i tau og alle tau-bygg mislykkes
  assert.ok(!wins(build(spec(ref.rods.map(([a, b]) => [a, b, R])))), 'referanse-trekantene i bare tau holder ikke'); assert.ok(!wins(build(spec(best.rods.map(([a, b]) => [a, b, R])))), 'billig trekantbro i bare tau holder ikke');
  // all tre i trekantene holder heller ikke: stål trengs i veien
  assert.ok(!wins(build(spec(ref.rods.map(([a, b]) => [a, b, W])))), 'fagverk i bare tre holder ikke');
}

// ---------- 3) referansebygget og det billige trekantbygget ----------
{
  const B = build(ref); assert.ok(!BD.hasOpenSquare(B.rg), 'referansen har ingen åpen firkant'); assert.ok(wins(B), `trekantbroen (tre og stål) består med alle lastene: ${results(B)}`);
  for (const k of [1, st.massK * 0.5, st.massK * 1.15, st.massK * 1.25]) assert.ok(wins(B, k), `og med margin (massK ${k}): ${results(B, k)}`);
  assert.equal(BP.runSim(G.simDefAuto(B).def, { load: 'car', massK: st.massK }).breaks.length, 0, 'uten brudd');
  const j = GS.judge(B.site, st, B.placed, B.links, { loadsDone: true }); assert.equal(j.stars, 2, 'referansen gir 2 stjerner (' + j.cost + '/' + j.parts + ')'); assert.ok(j.passed && j.cost <= st.budget);
  assert.equal(JSON.stringify(results(build(ref))), JSON.stringify(results(B)), 'deterministisk');
  const Bb = build(best), jb = GS.judge(Bb.site, st, Bb.placed, Bb.links, { loadsDone: wins(Bb) }); assert.ok(wins(Bb), `den billige trekantbroen består: ${results(Bb)}`); assert.equal(jb.stars, 3, `billig, optimalisert trekantbro gir 3 stjerner (${jb.cost}/${jb.parts})`); assert.ok(jb.cost < j.cost && jb.passed);
  assert.ok(!BD.hasOpenSquare(Bb.rg)); assert.ok(wins(Bb, st.massK * 1.05), 'med liten margin');
  // 3 stjerner krever god utnyttelse: en overbygd trekantbro (alt i stål) er for dyr
  const Bs = build(spec(ref.rods.map(([a, b]) => [a, b, S]))), js = GS.judge(Bs.site, st, Bs.placed, Bs.links, { loadsDone: wins(Bs) }); assert.ok(js.stars < 3 && js.over, `overbygd bro gir ikke 3 stjerner (${js.cost}/${st.budget})`);
}

// ---------- 4) bygget i verden og ruta ----------
{
  applyWorld: for (const [name, spc] of [['ref', ref], ['best', best]]) {
    const B = build(spc), def = G.simDef(B), solids = BW.buildSolids(B.site, BP.settledPlaced(def), { skip: new Set(G.loadPass(B)) }); assert.ok(solids.length > 0, 'bygget gir faste flater');
    const gr = GP.gridRefRoute(B.site, solids), route = gr && BW.refRoute(L, { ...B.site, ref: { ...site.ref, ...gr } }); assert.ok(route, `${name}: ruta via bygget finnes`);
    route.forEach((n, i) => { if (n.id.startsWith('@rutenett') && n.top > route[i - 1].top + 0.01) n.hop = true; });
    const built = walkRoute(null, { level: L, route, extraBoxes: solids }); assert.ok(built.ok, `${name}: ruta via bygget går i ekte fysikk: ${built.why}`);
    const len = (r) => { let q = [L.start[0], L.start[2]], t = 0; for (const n of r.slice(1)) { const c = [(n.x0 + n.x1) / 2, (n.z0 + n.z1) / 2]; t += Math.hypot(c[0] - q[0], c[1] - q[1]); q = c; } return t; };
    assert.ok(len(route) < len(L.route) - 20, `${name}: bygging er snarveien (${len(route).toFixed(0)} mot ${len(L.route).toFixed(0)})`);
    if (name === 'ref') break applyWorld;
  }
  const alt = walkRoute('levels/badebro.level.json'); assert.ok(alt.ok, 'den harde veien går: ' + alt.why);
  const bad = walkRoute(null, { level: L, extraBoxes: BW.worstSolids(site) }); assert.ok(bad.ok, 'verst tenkelige bygg stenger ikke den harde veien: ' + bad.why);
  const none = walkRoute(null, { level: L, route: BW.refRoute(L, { ...site, ref: { ...site.ref, surfaces: [{ id: '@bro', u0: -4, u1: 4, top: 0.5 }] } }) }); assert.ok(!none.ok, 'uten bygget går ikke snarveien');
}

// ---------- 5) hint: firkant uten diagonal ----------
{
  const G0 = (rods) => ({ nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }], rods: rods.map(([a, b], i) => ({ id: 'r' + i, a, b })) });
  assert.equal(BD.openSquares(G0([['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'a']])).length, 1, 'firkant: fire staver');
  assert.equal(BD.hasOpenSquare(G0([['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'a'], ['a', 'c']])), false, 'en diagonal stiver den');
  assert.equal(BD.hasOpenSquare(G0([['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'a'], ['b', 'd']])), false);
  assert.equal(BD.hasOpenSquare(G0([['a', 'b'], ['b', 'c'], ['c', 'a']])), false, 'trekant er ikke en firkant'); assert.equal(BD.hasOpenSquare(G0([])), false); assert.equal(BD.hasOpenSquare(null), false); assert.equal(BD.hasOpenSquare({}), false);
  assert.equal(BD.hasOpenSquare(G0([['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['e', 'a']])), false, 'femkant er ikke firkant');
  const sq = BD.openSquares(build(square(W, W, W)).rg); assert.ok(sq.length >= 2, 'bygget firkant-bro har åpne firkanter');
  assert.equal(BD.squareTipShould({ on: true, grid: true, G: build(square(W, W, W)).rg }), true); assert.equal(BD.squareTipShould({ on: false, grid: true, G: build(square(W, W, W)).rg }), false);
  assert.equal(BD.squareTipShould({ on: true, grid: false, G: build(square(W, W, W)).rg }), false, 'bare i rutenett'); assert.equal(BD.squareTipShould({ on: true, grid: true, G: build(ref).rg }), false);
  assert.equal(BD.squareTipShould({ on: true, grid: true, sim: true, G: build(square(W, W, W)).rg }), false, 'ikke under prøven');
  // kortet «Prøv Byggeskolen · Fagverk først»
  const base = { level: 'badebro', difficulty: 'normal', on: true, passed: [], shown: '' };
  assert.equal(BD.fagverkCardShould(base), true); assert.equal(BD.fagverkCardShould({ ...base, passed: ['lab4'] }), false, 'Fagverk bestått: ingen kort'); assert.equal(BD.fagverkCardShould({ ...base, passed: ['lab1', 'lab2'] }), true);
  assert.equal(BD.fagverkCardShould({ ...base, shown: 'skipped' }), false, 'bare én gang'); assert.equal(BD.fagverkCardShould({ ...base, level: 'bro' }), false); assert.equal(BD.fagverkCardShould({ ...base, difficulty: 'expert' }), false); assert.equal(BD.fagverkCardShould({ ...base, on: false }), false); assert.equal(BD.fagverkCardShould({ ...base, cinema: true }), false);
}

// ---------- 6) tekster og innstilling ----------
{
  for (const lang of ['nb', 'en']) {
    const { T } = I18.makeT(() => lang);
    for (const k of ['badebro.fagverk.title', 'badebro.fagverk.text', 'badebro.fagverk.go', 'badebro.fagverk.skip', 'gstage.squareTip', 'bux.hint.square']) { const t = T(k); assert.ok(t && t !== k && !/\{\w+\}/.test(t), `${lang}:${k}`); if (lang === 'nb') assert.ok(!/\b(tast|Enter|Esc|klikk|mus)\b/i.test(t), `${k}: ingen taster`); }
  }
  const nb = I18.makeT(() => 'nb').T; assert.ok(/TIL BYGGESKOLEN/.test(nb('badebro.fagverk.go')) && /Fagverk/.test(nb('badebro.fagverk.title') + nb('badebro.fagverk.text')) && /[Tt]rekanter er stive/.test(nb('badebro.fagverk.text')));
  assert.equal(nb('gstage.squareTip'), 'En firkant gir etter. Legg inn en diagonal, så blir den stiv.');
  const main = rd('./main.js'); assert.ok(/'squaretip', 'hjelp'|'squaretip', 'spill'/.test(main), 'innstilling squaretip'); assert.ok(/'fagverkcard', '(hjelp|spill)'/.test(main), 'innstilling fagverkcard');
  const doc = rd('./docs/INNSTILLINGER.md'); assert.ok(doc.includes('squaretip') && doc.includes('fagverkcard'), 'dokumentert'); assert.ok(/Bygg 5: Broen over badekaret/.test(rd('./docs/NIVAER.md')), 'NIVAER.md har seksjonen');
}
console.log('test_badebro: ok');
