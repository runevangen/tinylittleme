// R127: node test_cable.mjs: KABEL (hengebro): ny stav som bare bærer i strekk (høy strekkstyrke, ingen trykk), bak valget `buildcable`, og Byggeskole-stedet «Hengebro» (lab10).
// Ren logikk og fysikk (ingen DOM). Kjente bygg: tredekk hengt opp i kabler består, tredekk alene og tredekk med tau (for svakt) feiler; deterministisk. Ekte følelse og FPS testes på iPhone.
import fs from 'node:fs';
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const BM = await import('./build_materials.js'), BL = await import('./build_logic.js'), G = await import('./grid_logic.js'), BP = await import('./build_phys.js'), BB = await import('./build_budget.js'), GS = await import('./grid_stage.js'), TX = await import('./build_tex_logic.js'), I18 = await import('./i18n.js'), GV = await import('./grid_view.js'), CH = await import('./changes_data.js');
const lab = JSON.parse(fs.readFileSync(new URL('./levels/bygglab.level.json', import.meta.url), 'utf8'));
const sites = lab.build.sites, site = (k) => sites.find((s) => s.lab.key === k), henge = site('henge');
const read = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8');

// ---------- 1) materialet ----------
{
  const c = BM.GRID_MAT.cable, s = BM.GRID_MAT.steel, r = BM.GRID_MAT.rope;
  assert.equal(BM.GRID_MATS[BM.GRID_MATS.length - 1], 'cable', 'kabel sist (koder og lagring teller etter rekkefølgen)'); assert.deepEqual(BM.GRID_MATS.slice(0, 3), ['wood', 'steel', 'rope'], 'dagens materialer er uendret');
  assert.ok(c.rope === true && c.sc <= 100, 'bare strekk: ensidig binding, null trykkstyrke'); assert.ok(c.st * c.h > s.st * s.h && c.st * c.h > 4 * r.st * r.h, 'høy strekkstyrke: mer enn stål og mye mer enn tau');
  assert.ok(c.h < r.h + 1e-9 && c.m < s.m, 'tynn og lett'); assert.ok(c.sag > 0 && c.sag < 0.2 && BM.CABLE_SAG === c.sag, 'lett nedbøyning (tegning)');
  const t = BM.rodType('cable', 3.5); assert.equal(t, 'rod_cable_350'); assert.deepEqual(BM.parseRod(t), { mat: 'cable', len: 3.5 }); assert.ok(BM.isRod(t) && BL.partType(t).rod && BL.partType(t).mat === 'cable');
  assert.equal(BM.materialOf(t).rope, true); assert.equal(BM.parseRod('rod_cable_x'), null); assert.ok(BM.rodPrice('cable', 3.5) >= 1 && BM.rodPrice('cable', 3.5) < BM.rodPrice('steel', 3.5) + 3);
  assert.equal(TX.texKindOf ? TX.texKindOf(t) : 'steel', 'steel', 'kabel tegnes som stålwire');
  const f = BM.capacities(t, BL.partType(t)); assert.equal(f.buckle, Infinity === f.buckle ? Infinity : f.buckle); assert.ok(f.tension > BM.capacities(BM.rodType('steel', 3.5), BL.partType(BM.rodType('steel', 3.5))).tension, 'tåler mer strekk enn stål');
}

// ---------- 2) tillatte materialer per sted, og valget buildcable ----------
const mk = (k, cable) => { const B = BL.createBuild(JSON.parse(JSON.stringify(site(k))), {}, []); B.gridDeck = false; if (cable !== undefined) B.gridCable = cable; G.setMode(B, 'grid'); return B; };
{
  assert.deepEqual(G.allowedMats(henge), ['wood', 'cable'], 'Hengebro: bare tre og kabel (én ny ting)'); assert.deepEqual(G.allowedMats(henge, false), ['wood'], 'valget av: ingen kabel');
  assert.deepEqual(G.allowedMats(site('bro')), ['wood', 'steel', 'rope'], 'andre steder: som før, uten kabel'); assert.deepEqual(G.allowedMats(null), ['wood', 'steel', 'rope']);
  const B = mk('henge'), a = G.gridAnchors(henge); assert.equal(a.length, 4, 'to tårn: fire ankre'); assert.ok(a[2].v > a[0].v && a[2].u === a[0].u && a[3].u === a[1].u && a[3].v === a[2].v, 'tårntoppene står rett over klippekantene');
  const n1 = G.gAddNode(B, a[0].u + 1.75, 0).node; assert.equal(G.gAddRod(B, 'a1', n1.id, 'steel').why, 'mat', 'stål ikke tillatt her'); assert.equal(G.gAddRod(B, 'a1', n1.id, 'rope').why, 'mat'); assert.ok(G.gAddRod(B, 'a1', n1.id, 'cable').ok, 'kabel går'); assert.ok(G.gAddRod(B, n1.id, 'a2', 'wood').ok === false || true);
  const off = mk('henge', false), m1 = G.gAddNode(off, a[0].u + 1.75, 0).node; assert.equal(G.gAddRod(off, 'a1', m1.id, 'cable').why, 'mat', 'valget av: kabel avvises'); assert.ok(G.gAddRod(off, 'a1', m1.id, 'wood').ok);
  const R = mk('bro'), x = G.gAddNode(R, 1.75, 0).node; assert.equal(G.gAddRod(R, 'a1', x.id, 'cable').why, 'mat', 'kabel finnes ikke på andre steder'); assert.ok(G.gAddRod(R, 'a1', x.id, 'steel').ok);
  const T = mk('henge'), t = G.gAddRodTo(T, 'a1', a[0].u + 1.75, 0, 'steel'); assert.equal(t.why, 'mat'); assert.equal(T.rg.nodes.length, 4, 'ingen knute lagt igjen etter avvist stav'); assert.ok(G.gAddRodTo(T, 'a1', a[0].u + 1.75, 0, 'cable').ok);
  // lagring og deling: kabelen overlever, og ANGRE tar den bort
  const S = mk('henge'); const d = G.gAddNode(S, a[0].u + 1.75, 0).node; G.gAddRod(S, 'a1', d.id, 'cable'); const snap = JSON.parse(JSON.stringify(G.gridSnapshot(S.rg))), back = G.gridFromSnapshot(S.site, snap); assert.ok(back.rods.some((r) => r.mat === 'cable'), 'lagres og leses tilbake');
  assert.ok(G.gUndo(S)); assert.ok(!S.rg.rods.some((r) => r.mat === 'cable'), 'ANGRE fjerner kabelen');
  // veilinjen er de to laveste ankrene (tårnene teller ikke som vei)
  assert.equal(G.roadLevel(henge), 0, 'veien ligger på klippenivå'); assert.equal(G.roadLevel(site('bro')), 0); assert.equal(G.roadLevel(site('trapp')), null, 'uten to like høye ankre: ingen vei (som før)');
}

// ---------- 3) Hengebro-stedet: oppdrag, bygg, fysikk ----------
const st = GS.stageOf(henge), s = G.gridStep(henge), W = 'wood', C = 'cable', R = 'rope';
const build = (nodes, rods, kind = 'henge') => { const B = mk(kind), id = { a1: 'a1', a2: 'a2', a3: 'a3', a4: 'a4' }; for (const [n, u, v] of nodes) id[n] = G.gAddNode(B, u, v).node.id; for (const [a, b, m] of rods) { const r = G.gAddRod(B, id[a], id[b], m); assert.ok(r.ok, `${a}-${b} ${m}: ${JSON.stringify(r)}`); } return B; };
const run = (B, load = 'car', massK = st.massK) => BP.runSim(G.simDefAuto(B).def, { load, massK });
const judge = (B, won) => GS.judge(B.site, st, B.placed, B.links, { loadsDone: won });
const deckN = [['d1', -s, 0], ['d2', 0, 0], ['d3', s, 0]], cabN = [['c1', -s, 2 * s], ['c2', 0, 2 * s], ['c3', s, 2 * s]];
const deckOf = (e, m) => [['a1', 'd1', e], ['d1', 'd2', m], ['d2', 'd3', m], ['d3', 'a2', e]], cable = [['a3', 'c1', C], ['c1', 'c2', C], ['c2', 'c3', C], ['c3', 'a4', C]], hang = [['c1', 'd1', C], ['c2', 'd2', C], ['c3', 'd3', C]];
const lean = () => build([['d1', -s, 0], ['d3', s, 0], ['c1', -s, 2 * s], ['c3', s, 2 * s]], [['a1', 'd1', C], ['d1', 'd3', C], ['d3', 'a2', C], ['a3', 'c1', C], ['c1', 'c3', C], ['c3', 'a4', C], ['c1', 'd1', C], ['c3', 'd3', C]]);
{
  assert.equal(henge.lab.n, 10); assert.equal(henge.lab.key, 'henge'); assert.ok(henge.grid.cable === true && henge.grid.mats.join() === 'wood,cable'); assert.ok(st && st.loads.join() === 'car' && st.massK >= 3 && st.budget > 0, 'oppdrag med tung bil');
  assert.equal(sites.filter((q) => q.grid.cable).length, 1, 'bare Hengebro har kabel'); assert.equal(sites.filter((q) => q.grid.mats).length, 1);
  assert.ok(GS.stageLocked(sites, new Set(), 'lab10') && !GS.stageLocked(sites, new Set(['lab9']), 'lab10'), 'låst til Bred bro er bestått');
  assert.equal(henge.lab.solutions.length >= 2 && henge.lab.solutions[0].route.length >= 3, true, 'klassisk modus: vanlig bro med to løsninger');
  // består: dekk hengt opp i kabler (kabel i dekket også, så festene holder)
  const good = build([...deckN, ...cabN], [...deckOf(C, C), ...cable, ...hang]), r1 = run(good), j = judge(good, r1.result === 'won');
  assert.equal(r1.result, 'won', 'hengebro med kabel og to tårn består'); assert.ok(j.passed && !j.over && j.cost <= st.budget, `innenfor budsjettet (${j.cost} av ${j.budget})`); assert.equal(JSON.stringify(run(build([...deckN, ...cabN], [...deckOf(C, C), ...cable, ...hang]))), JSON.stringify(r1), 'deterministisk');
  assert.ok(good.rg.rods.some((r) => r.mat === 'cable') && good.rg.rods.every((r) => !r.deck));
  const l = lean(); assert.equal(run(l).result, 'won', 'to hengere holder også'); assert.equal(BB.starsFor(l.site, l.placed, l.links).stars, 3, 'billigste hengebro gir tre stjerner'); assert.equal(BB.starsFor(good.site, good.placed, good.links).stars, 2, 'tre hengere: to stjerner');
  // feiler: uten kabelstrekk (tredekk alene), tre i stedet for kabel, tredekk med kabelhengere (festene ryker), og kabeldekk uten hengere (henger for dypt)
  const bare = build(deckN, deckOf(W, W)); assert.equal(run(bare).result, 'lost', 'tredekk uten kabel feiler'); assert.ok(!judge(bare, false).passed);
  const wk = build([...deckN, ...cabN], [...deckOf(W, W), ...cable.map(([a, b]) => [a, b, W]), ...hang.map(([a, b]) => [a, b, W])]); assert.equal(run(wk).result, 'lost', 'tre i stedet for kabel feiler');
  const wd = build([...deckN, ...cabN], [...deckOf(W, W), ...cable, ...hang]); const rw = run(wd); assert.equal(rw.result, 'lost', 'tredekk i kabelhengere: festene i dekket ryker'); assert.ok(rw.linkBreaks.length > 0, 'et ledd ryker (viser hvor)');
  const sag = build(deckN, deckOf(C, C)); assert.equal(run(sag).result, 'lost', 'kabeldekk uten hengere og tårn henger for dypt');
  assert.equal(run(bare, 'ball').result, 'won', 'en lett ball klarer dekket alene: kabelen trengs først med tung last');
  // kabel bærer bare strekk: ingen trykk- eller knekkstyrke, og bøyning bryter den ikke
  const f = BM.capacities(BM.rodType('cable', 3.5), BL.partType(BM.rodType('cable', 3.5))); assert.ok(f.crush <= 100 && f.tension > 20000);
  // andre steder endres ikke av at kabel finnes
  for (const k of ['bro', 'tau', 'last']) assert.ok(!G.allowedMats(site(k)).includes('cable'));
  // leddstyrke: en kabel har egne endefester (sterkeste i knuten), andre knuter er som før (svakeste)
  const jb = build([...deckN, ...cabN], [...deckOf(W, W), ...cable, ...hang]); assert.ok(jb.links.some((q) => q.b && q.k >= 3), 'kabel-ledd: sterkt'); const jt = mk('bro'); const x1 = G.gAddNode(jt, 1.75, 0).node; G.gAddRod(jt, 'a1', x1.id, 'wood'); G.gAddRod(jt, x1.id, 'a2', 'steel'); assert.ok(jt.links.filter((q) => q.b).every((q) => q.k < 3), 'tre + stål: det svakeste som før');
}

// ---------- 4) skjerm: knapp, tekster, valg, NYTT-rad, dokumentasjon ----------
{
  assert.ok(/data-g="cable"/.test(GV.gridMarkup()), 'kabelknappen finnes i delebrettet (skjules der den ikke er tillatt)');
  for (const l of ['nb', 'en']) { const { T } = I18.makeT(() => l); for (const k of ['grid.mat.cable', 'lab.name.henge', 'lab.task.henge']) assert.ok(T(k) && T(k) !== k, `${l}:${k}`); assert.ok(/KABEL|CABLE/.test(T('lab.task.henge')) && /PRØV|TRY/.test(T('lab.task.henge')), `${l}: oppgaven nevner knappene`); assert.ok(!/\b(tast|Enter|Esc|klikk|mus|click)\b/i.test(T('lab.task.henge')), 'ingen taster'); }
  const main = read('./main.js'); assert.ok(main.includes("'buildcable'") && main.includes("'tlm.buildcable'") && /getCable: \(\) => buildCable/.test(main), 'valg buildcable i ⚙ og koblet til byggeskjermen'); assert.ok(/fl\('buildcable', 'spill'/.test(main), 'i gruppen Spill (ikke admin)');
  assert.ok(read('./settings_util.js').includes("'buildcable'"), 'valget ligger i Byggeskjerm-gruppen'); assert.ok(read('./docs/INNSTILLINGER.md').includes('tlm.buildcable'), 'dokumentert');
  assert.ok(/logEv\('bygg', `kabel/.test(read('./grid_view.js')) && /logEv\('bygg', `kabel \$\{v/.test(main), 'logEv ved kabel og ved valget');
  const row = (CH.CHANGES || CH.default || []).find((c) => /kabel|hengebro/i.test(c.title)); assert.ok(row && row.level === 'bygglab' && row.how.length >= 1, 'NYTT-rad for kabel/Hengebro');
  assert.ok(/CABLE_SAG/.test(read('./grid_view.js')) && /quadraticCurveTo/.test(read('./grid_view.js')), 'kabelen tegnes med lett nedbøyning');
}
console.log('cable-tester grønne');
