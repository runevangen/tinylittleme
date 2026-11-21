// R74: node test_gridstage.mjs: rutenett-oppdrag i Bygglab (grid_stage.js): hvert av de åtte stedene har last (tyngre enn klassisk), budsjett og stjerner; kjente løsninger vinner,
// kjente for svake bygg taper (deterministisk), for dyrt bygg teller ikke, bestått åpner neste sted (lagres), og byggeskjermen mot en DOM-stubb. Ekte følelse og FPS: testes på iPhone.
import fs from 'node:fs';
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const BL = await import('./build_logic.js'), G = await import('./grid_logic.js'), BP = await import('./build_phys.js'), BB = await import('./build_budget.js'), GS = await import('./grid_stage.js'), LD = await import('./build_loads.js'), I18 = await import('./i18n.js');
const lab = JSON.parse(fs.readFileSync(new URL('./levels/bygglab.level.json', import.meta.url), 'utf8'));
const sites = lab.build.sites, site = (k) => sites.find((s) => s.lab.key === k);
const mk = (k) => { const B = BL.createBuild(JSON.parse(JSON.stringify(site(k))), {}, []); B.gridDeck = false; G.setMode(B, 'grid'); return B; };
const W = 'wood', S = 'steel', R = 'rope';

// bygg etter oppskrift: nodes = [[u, v]] (rutenettpunkter), rods = [[a, b, materiale]] der 0 og 1 er ankrene og 2.. er nodes i rekkefølge
const build = (k, spec) => { const B = mk(k), ids = ['a1', 'a2']; for (const [u, v] of spec.nodes || []) ids.push(G.gAddNode(B, u, v).node.id); for (const [a, b, m] of spec.rods) { const r = G.gAddRod(B, ids[a], ids[b], m); assert.ok(r.ok, `${k}: ${JSON.stringify(r)}`); } return B; };
// rett rad av staver mellom ankrene (som en bro uten dekk)
const row = (k, mats) => { const s = site(k), a = G.gridAnchors(s), st = G.gridStep(s), N = mats.length, nodes = [], rods = []; for (let i = 1; i < N; i++) nodes.push([a[0].u + i * st, 0]); for (let i = 0; i < N; i++) rods.push([i === 0 ? 0 : i + 1, i === N - 1 ? 1 : i + 2, mats[i]]); return { nodes, rods }; };
const run = (k, B) => { const st = GS.stageOf(site(k)); return st.loads.map((l) => BP.runSim(G.simDef(B), { load: l, massK: st.massK }).result); };
const wins = (k, B) => run(k, B).every((x) => x === 'won');
const judge = (k, B) => { const st = GS.stageOf(site(k)); return GS.judge(B.site, st, B.placed, B.links, { loadsDone: wins(k, B) }); };

// ---------- 1) oppdragene som data ----------
{
  assert.equal(sites.length, 10); assert.equal(GS.stagesOf(sites).length, 10, 'alle ti steder har oppdrag');
  for (const s of GS.stagesOf(sites)) {
    const st = GS.stageOf(s); assert.ok(st && st.budget > 0 && st.massK >= 1 && st.loads.length >= 1 && st.loads.every(LD.isLoad), `${s.id}: gyldig oppdrag`);
    assert.ok(s.grid.stars?.three && s.grid.stars?.two && s.grid.stars.three.cost <= s.grid.stars.two.cost && s.grid.stars.two.cost <= st.budget, `${s.id}: stjerner ligger innenfor budsjettet`);
  }
  assert.equal(GS.stageOf(site('bro')).loads.join(), 'ball', 'lett last først'); assert.ok(GS.stageOf(site('materialer')).massK >= 8 && GS.stageOf(site('materialer')).loads.includes('car'), 'tung bil til slutt');
  const ks = GS.stagesOf(sites).filter((s) => s.lab.key !== 'bred' && s.lab.key !== 'henge').map((s) => GS.stageOf(s).massK); assert.ok(ks[ks.length - 1] > ks[0] && Math.max(...ks) >= 12, 'lasten blir tyngre: ' + ks);
  // ugyldig data: ukjente laster forkastes, uten budsjett finnes ingen oppdrag, massK begrenses
  assert.equal(GS.stageOf({ grid: { stage: { loads: ['car'], budget: 0 } } }), null); assert.equal(GS.stageOf({ grid: {} }), null); assert.equal(GS.stageOf(null), null);
  assert.deepEqual(GS.stageOf({ id: 'x', grid: { stage: { loads: ['kanon', 'car', 'car'], massK: 999, budget: 5 } } }), { loads: ['car'], massK: GS.STAGE.massMax, budget: 5, key: 'x' });
  assert.deepEqual(GS.stageOf({ id: 'x', grid: { stage: { loads: [], budget: 5 } } }).loads, ['figure']);
  const sc = GS.stageScaled(site('tau'), { massK: 0.5, budgetK: 2 }); assert.equal(sc.massK, 1.5); assert.equal(sc.budget, 12); assert.equal(GS.stageScaled(site('tau')).massK, 3);
  assert.equal(GS.stageSite({ id: 'q', loads: ['ball'] }, { loads: ['car'] }).loads[0], 'car'); const q = { id: 'q' }; assert.equal(GS.stageSite(q, null), q);
  // trapp og vippe har egne ankre i rutenett-modus, de andre bruker klippene
  assert.equal(site('trapp').grid.anchors.length, 2); assert.equal(G.gridAnchors(site('vippe'))[1].v, 3.5); assert.deepEqual(G.gridAnchors(site('bro')), site('bro').anchors);
  assert.equal(G.latticePoints(site('trapp')).some((p) => p.u === 4.25 && p.v === 5), true, 'høyre anker i trapp ligger på rutenettet');
}

// ---------- 2) kjente løsninger vinner, kjente for svake bygg taper ----------
const CASES = {
  bro: { good: [row('bro', [W, W, W, W]), row('bro', [S, W, W, W])], weak: [{ nodes: row('bro', [W, W, W, W]).nodes.slice(0, 2), rods: [[0, 2, W], [2, 3, W]] }] },
  trapp: { good: [{ nodes: [[0.5, 0]], rods: [[0, 2, W], [2, 1, W]] }], weak: [{ nodes: [[0.5, 2.5]], rods: [[0, 2, W], [2, 1, W]] }] },
  vippe: { good: [{ nodes: [[0, 3.25]], rods: [[0, 2, W], [2, 1, W]] }], weak: [{ nodes: [[0, 1.625]], rods: [[0, 2, W], [2, 1, W]] }] },
  fagverk: { good: [row('fagverk', [R, W, W, R]), row('fagverk', [W, R, R, R])], weak: [row('fagverk', [W, W, W, W])] },
  tau: { good: [row('tau', [W, R, R, W])], weak: [row('tau', [W, W, W, W]), row('tau', [R, R, R, R])] },
  last: { good: [row('last', [R, R, W, W])], weak: [row('last', [W, W, W, W])] },
  taaler: { good: [row('taaler', [S, S, S, S])], weak: [row('taaler', [R, W, W, R]), row('taaler', [S, S, S, R])] },
  materialer: { good: [row('materialer', [R, S, S, S])], weak: [row('materialer', [W, R, R, W]), row('materialer', [R, R, S, S])] },
};
{
  for (const s of sites) {
    const k = s.lab.key, c = CASES[k]; if (k === 'bred' || k === 'henge') continue; /* R123: Bred bro (vind, dobbel bro) testes i test_grid25d.mjs, R127: Hengebro (kabel) i test_cable.mjs */ assert.ok(c, k + ' har kjente bygg');
    for (const g of c.good) {
      const B = build(k, g), j = judge(k, B); assert.ok(wins(k, B), `${k}: kjent løsning kommer over med alle lastene (${run(k, B)})`); assert.ok(j.cost <= j.budget && j.passed, `${k}: innenfor budsjettet (${j.cost} av ${j.budget})`);
      assert.ok(B.rg.rods.some((r) => r.mat) && B.rg.rods.every((r) => !r.deck), 'ingen kjøredekk');
      assert.equal(JSON.stringify(run(k, build(k, g))), JSON.stringify(run(k, B)), `${k}: samme bygg gir samme resultat (deterministisk)`);
    }
    assert.ok(c.good.some((g) => BB.starsFor(B_of(k, g).site, B_of(k, g).placed, B_of(k, g).links).stars === 3), `${k}: en kjent løsning gir tre stjerner`);
    for (const w of c.weak) { const B = build(k, w); assert.ok(!wins(k, B), `${k}: for svakt bygg feiler (${run(k, B)})`); assert.equal(judge(k, B).passed, false); }
    // tre alene holder ikke på de vanskelige stedene (fra sted 4: hele raden i tre)
    if (s.lab.n >= 4) assert.ok(!wins(k, build(k, row(k, [W, W, W, W]))), `${k}: tre alene holder ikke`);
    // uten noe bygg kommer ingen over
    assert.ok(!wins(k, mk(k)), `${k}: tomt rutenett vinner ikke`);
  }
  function B_of(k, g) { return build(k, g); }
  // for dyrt: holder, men over budsjett (stål-rad på siste sted: 12 mot 11) teller ikke som bestått
  const over = build('materialer', row('materialer', [S, S, S, S])), jo = judge('materialer', over); assert.ok(wins('materialer', over), 'stål-raden holder'); assert.ok(jo.over && !jo.passed && jo.cost === 12 && jo.budget === 11, JSON.stringify(jo));
  // billigere = flere stjerner: bro i tre (4) gir 3, med stål i én stav (6) 2
  assert.equal(judge('bro', build('bro', row('bro', [W, W, W, W]))).stars, 3); assert.equal(judge('bro', build('bro', row('bro', [S, W, W, W]))).stars, 2);
  // tunge laster er tyngre: massK 1 på siste sted er enklere enn massK 8 (rope-treradene i taaler klarer lav vekt men ikke tung)
  const lightOk = BP.runSim(G.simDef(build('taaler', row('taaler', [R, W, W, R]))), { load: 'car', massK: 1 }).result; assert.equal(lightOk, 'won', 'samme bygg klarer vanlig bil'); assert.equal(BP.runSim(G.simDef(build('taaler', row('taaler', [R, W, W, R]))), { load: 'car', massK: 12 }).result, 'lost', 'men ikke tolv ganger så tung');
  // massK uten verdi = som før (klassisk fysikk uendret)
  const B0 = build('bro', row('bro', [W, W, W, W])); assert.equal(JSON.stringify(BP.runSim(G.simDef(B0), { load: 'car' })), JSON.stringify(BP.runSim(G.simDef(B0), { load: 'car', massK: 1 })), 'standard massK = 1'); assert.equal(JSON.stringify(BP.runSim(G.simDef(B0), { load: 'car', massK: -3 })), JSON.stringify(BP.runSim(G.simDef(B0), { load: 'car' })), 'ugyldig massK ignoreres');
}

// ---------- 3) låsing og lagring ----------
{
  const mem = new Map(), st = { get: (k, d) => (mem.has(k) ? mem.get(k) : d), set: (k, v) => mem.set(k, v) };
  assert.equal(GS.passRead(st, 'bygglab').size, 0); const sl = (id, passed, on = true) => GS.stageLocked(sites, new Set(passed), id, on);
  assert.equal(sl('lab1', []), false, 'første sted er åpent'); assert.equal(sl('lab2', []), true, 'andre sted er låst til første er bestått'); assert.equal(sl('lab2', ['lab1']), false); assert.equal(sl('lab3', ['lab1']), true); assert.equal(sl('lab8', ['lab1', 'lab2', 'lab3', 'lab4', 'lab5', 'lab6', 'lab7']), false);
  assert.equal(sl('lab5', [], false), false, 'låsing av: alt åpent'); assert.equal(GS.stagePrev(sites, 'lab1'), null); assert.equal(GS.stagePrev(sites, 'lab4').id, 'lab3'); assert.equal(GS.stageNext(sites, 'lab9').id, 'lab10'); assert.equal(GS.stageNext(sites, 'lab10'), null); assert.equal(GS.stageNext(sites, 'lab3').id, 'lab4');
  assert.equal(GS.stageLocked([{ id: 'x' }, { id: 'y' }], new Set(), 'y', true), false, 'steder uten oppdrag låses aldri');
  assert.deepEqual(GS.passRecord(st, 'bygglab', 'lab1'), { first: true }); assert.deepEqual(GS.passRecord(st, 'bygglab', 'lab1'), { first: false }); GS.passRecord(st, 'bygglab', 'lab2'); assert.deepEqual([...GS.passRead(st, 'bygglab')], ['lab1', 'lab2']); assert.equal(GS.passRead(st, 'annet').size, 0, 'per brett');
  mem.set(GS.STAGE.key, 'rot'); assert.equal(GS.passRead(st, 'bygglab').size, 0, 'ødelagt lagring ignoreres'); mem.set(GS.STAGE.key, { bygglab: [1, 'lab3', null] }); assert.deepEqual([...GS.passRead(st, 'bygglab')], ['lab3']);
  GS.passRecord(st, 'bygglab', 'lab4'); assert.ok(GS.passClear(st, 'bygglab') && GS.passRead(st, 'bygglab').size === 0 && !GS.passClear(st, 'bygglab'));
  // vurderingen: bestått krever last OG budsjett
  const B = build('bro', row('bro', [W, W, W, W])), stg = GS.stageOf(site('bro'));
  assert.equal(GS.judge(B.site, stg, B.placed, B.links, { loadsDone: true }).passed, true); assert.equal(GS.judge(B.site, stg, B.placed, B.links, { loadsDone: false }).passed, false); assert.equal(GS.overBudget(stg, 8), false); assert.equal(GS.overBudget(stg, 9), true); assert.equal(GS.overBudget(null, 99), false);
}

// ---------- 4) tekster (norsk og engelsk, nevner knappene, ingen taster) ----------
{
  let lang = 'nb'; const { T } = I18.makeT(() => lang); const sts = GS.stageOf(site('materialer'));
  const base = { st: sts, cost: 7, parts: 4, stars: 2, next: { cost: 5 }, over: false, on: true, ran: false, won: false, passed: false, loadsLeft: [], peak: '', done: false };
  for (const l of ['nb', 'en']) {
    lang = l; const all = [];
    for (const s of [{ ...base, on: false }, base, { ...base, over: true, cost: 13 }, { ...base, ran: true, won: true, passed: true }, { ...base, ran: true, won: true, over: true, cost: 13 }, { ...base, ran: true, won: true, loadsLeft: ['ball', 'robot'] }, { ...base, ran: true, peak: 'Stål 1,8 brakk først' }, { ...base, done: true }, { ...base, next: null }]) {
      const ls = GS.stageLines(s, T); assert.ok(ls.length >= 2 && ls.every((x) => x.t && !/\{\w+\}/.test(x.t) && !/^gstage\./.test(x.t)), `${l}: linjer uten plassholdere: ${JSON.stringify(ls)}`); all.push(...ls.map((x) => x.t));
    }
    for (const k of ['gstage.locked', 'gstage.unlocked', 'gstage.allDone', 'grid.modeLocked']) { const t = T(k, { n: 3, name: 'Fagverk' }); assert.ok(t && t !== k && !/\{\w+\}/.test(t), `${l}:${k}`); }
    if (l === 'nb') { const txt = all.join(' '); assert.ok(/PRØV/.test(txt) && /FJERN/.test(txt), 'nevner knappene'); assert.ok(!/\b(tast|Enter|Esc|klikk|mus)\b/i.test(txt), 'ingen taster'); assert.ok(/BESTÅTT/.test(txt) && /IKKE BESTÅTT/.test(GS.stageLines({ ...base, ran: true }, T).map((x) => x.t).join(' ')), 'bestått og ikke bestått'); assert.ok(/× tung/.test(txt), 'tung last står der'); }
  }
  { const p = GS.stageLines({ ...base, ran: true, won: true, passed: true, peak: 'x' }, (k) => k).map((x) => x.t); assert.ok(p.includes('gstage.passed') && !p.includes('gstage.empty') && !p.includes('gstage.cost') && !p.includes('x'), 'bestått: kort og uten tomt-linje: ' + p); }
  assert.deepEqual(GS.stageLines(null, (k) => k), []); lang = 'nb'; assert.ok(/Fagverk/.test(GS.stageLockText(sites, 'lab5', T)));
  const main = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8'); for (const id of ['gridstage', 'gridlock', 'gridmassk', 'gridbudgetk']) assert.ok(main.includes(`'${id}'`), 'innstilling ' + id);
  assert.ok(/'gridmassk', 'admin'/.test(main) && /'gridbudgetk', 'admin'/.test(main), 'finjustering er admin'); assert.ok(/'gridstage', 'spill'/.test(main) && /'gridlock', 'spill'/.test(main));
  const idx = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8'); assert.ok(idx.includes("'grid_stage'"), 'grid_stage ligger i files'); assert.ok(fs.readFileSync(new URL('./docs/INNSTILLINGER.md', import.meta.url), 'utf8').includes('tlm.gridstage'), 'dokumentert i INNSTILLINGER.md');
}

// ---------- 5) byggeskjermen mot en DOM-stubb ----------
{
  const mkEl = () => { const el = { style: { setProperty() {} }, dataset: {}, children: [], _l: {}, _html: '', classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, f) { (f === undefined ? !this._s.has(c) : f) ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    appendChild(c) { this.children.push(c); return c; }, addEventListener(t, f) { (this._l[t] ||= []).push(f); }, removeEventListener() {}, setPointerCapture() {}, releasePointerCapture() {}, setAttribute() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844 }), closest: () => null, remove() {},
    getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === 'measureText' ? () => ({ width: 80 }) : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) }),
    querySelector: () => mkEl(), querySelectorAll: () => [], set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; }, width: 0, height: 0 }; return el; };
  const body = mkEl(); globalThis.document = { body, createElement: mkEl, head: mkEl(), getElementById: () => null, querySelector: () => mkEl() };
  globalThis.window = globalThis; globalThis.innerWidth = 390; globalThis.innerHeight = 844; globalThis.devicePixelRatio = 2; globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {};
  const { createBuildMode } = await import('./build.js');
  const mem = new Map(), store = { get: (k, d) => (mem.has(k) ? mem.get(k) : d), set: (k, v) => mem.set(k, v) };
  const mkSite = (key, id) => { const s = JSON.parse(JSON.stringify(site(key))); s.id = id; s.x = id === 'bro' ? 0 : 60; s.y = 2; s.z = 0; return s; };
  const L = { boxes: [], build: { sites: [mkSite('bro', 'bro'), mkSite('trapp', 'trapp')], parts: [] } }, player = { x: 0, y: 2, z: 0, onGround: true, state: 'ground' }, log = [];
  const cfg = { on: true, lock: true, massK: 1, budgetK: 1 };
  const mkB = (opts = {}) => createBuildMode({ scene: { add() {}, remove() {} }, LEVEL: JSON.parse(JSON.stringify(L)), player: { ...player }, $: () => mkEl(), T: (k, v) => k + (v ? JSON.stringify(v) : ''), logEv: (t, d) => log.push([t, d]), toast: (m) => log.push(['toast', m]), TOUCH: true, buzz() {}, audio: {}, isPlay: () => true, isMenu: () => false, isBoss: () => false, isWon: () => false, isOv: () => false, getSnap: () => true, setSnap() {}, allParts: () => true, onChange() {}, store, levelId: 'gtest', getStage: () => cfg, ...opts });
  const bm = mkB(); bm.update(0.016, true);
  // sted 2 er låst i rutenett til sted 1 er bestått; klassisk modus er aldri låst
  assert.ok(bm.open('trapp', { force: true })); assert.equal(bm.stage.locked('trapp'), true); assert.equal(bm.stage.locked('bro'), false); assert.equal(bm.grid.toggle(), false, 'låst sted: ikke rutenett'); assert.equal(bm.grid.on, false);
  assert.ok(log.some(([t, m]) => t === 'toast' && /gstage\.locked/.test(m)), 'forklaring'); assert.ok(log.some(([t, d]) => t === 'bygg' && /^rutenett låst/.test(d)), 'logges'); assert.equal(bm.stage.now, null, 'klassisk modus har ikke oppdrag'); bm.close('t');
  // sted 1: rutenett uten dekk, med oppdrag
  assert.ok(bm.open('bro', { force: true })); assert.ok(bm.grid.toggle() && bm.grid.on); assert.equal(bm.grid.info().deck, 0, 'ingen kjøredekk i oppdrag'); assert.equal(bm.stage.now.budget, 8); assert.deepEqual(bm.stage.now.loads, ['ball']);
  assert.ok(bm.stage.lines().some((x) => /gstage\.goal/.test(x.t)) && bm.stage.lines().some((x) => /gstage\.empty/.test(x.t)), 'kortet viser mål og budsjett');
  const tapAt = (b, u, v) => { const p = b.screenPos(u, v); b.grid.tap(p.x, p.y); };
  const rowTaps = (b, mats, full = true) => { const an = b.grid.info().nodes.filter((n) => n.fixed).sort((p, q) => p.u - q.u), st = G.gridStep(site('bro')), N = mats.length;
    tapAt(b, an[0].u, an[0].v); for (let i = 0; i < N; i++) { b.grid.setMat(mats[i]); const to = full && i === N - 1 ? an[1] : { u: an[0].u + (i + 1) * st, v: 0 }; tapAt(b, to.u, to.v); } return b.grid.info(); };
  const runTry = (b) => { assert.ok(b.startTry()); for (let i = 0; i < 6000 && b.running; i++) b.update(1 / 60, true); return b.result; };
  // en ufullstendig bro (første stav og ikke mer): kommer ikke over
  const i1 = rowTaps(bm, [W], false); assert.equal(i1.rods.length, 1, JSON.stringify(i1.rods)); assert.ok(bm.stage.state.on && !bm.stage.state.over);
  assert.equal(runTry(bm).state, 'lost'); assert.equal(bm.stage.state.passed, false); assert.ok(bm.stage.lines().some((x) => /gstage\.failed/.test(x.t)), 'ikke bestått'); assert.equal(bm.stage.passed.length, 0); bm.stopTry();
  // for dyr bro: stål over hele gapet (12 av 8): holder, men teller ikke som bestått
  bm.resetBuild(); assert.equal(bm.grid.info().rods.length, 0); rowTaps(bm, [S, S, S, S]); assert.equal(bm.grid.info().cost, 12); assert.ok(bm.stage.state.over, 'over budsjett vises mens du bygger'); assert.ok(bm.stage.lines().some((x) => /gstage\.overNow/.test(x.t)));
  assert.equal(runTry(bm).state, 'won', 'stål-broen holder'); assert.equal(bm.stage.over, true); assert.equal(bm.stage.state.passed, false); assert.equal(bm.stage.passed.length, 0, 'ikke lagret som bestått'); assert.ok(/gstage\.over/.test(bm.result.hint), 'teksten sier for dyrt: ' + bm.result.hint); assert.ok(log.some(([t, d]) => t === 'bygg' && /^oppdrag: holdt, men over budsjett \(12 av 8\)/.test(d)));
  assert.equal(bm.isSolved('bro'), false, 'sted ikke løst'); assert.equal(bm.stage.locked('trapp'), true, 'neste sted fortsatt låst'); bm.stopTry();
  // innenfor budsjettet: tre-rad (4 av 8) bestått, lagres, åpner neste sted
  bm.resetBuild(); rowTaps(bm, [W, W, W, W]); assert.equal(bm.grid.info().cost, 4); assert.equal(runTry(bm).state, 'won'); assert.equal(bm.stage.state.passed, true); assert.ok(bm.stage.lines().some((x) => /gstage\.passed/.test(x.t)), 'BESTÅTT i kortet');
  assert.deepEqual(bm.stage.passed, ['bro']); assert.deepEqual([...GS.passRead(store, 'gtest')], ['bro'], 'lagres i spillerens data'); assert.ok(bm.isSolved('bro')); assert.equal(bm.stage.locked('trapp'), false, 'bestått sted åpner neste');
  assert.ok(log.some(([t, d]) => t === 'bygg' && /^oppdrag bestått bro: 3 stjerner, kostnad 4 av 8, 4 staver, last ball/.test(d)), 'logges: ' + JSON.stringify(log.filter(([t, d]) => /oppdrag/.test(d)))); assert.ok(log.some(([t, m]) => t === 'toast' && /gstage\.unlocked/.test(m)), 'melding om åpnet sted');
  bm.stopTry(); bm.close('t');
  // etter ny økt (ny byggemodus, samme lagring) er sted 2 fortsatt åpent; med låsing av er alt åpent; med oppdrag av er alt som før
  const b2 = mkB(); b2.update(0.016, true); assert.equal(b2.stage.locked('trapp'), false); cfg.lock = false; const b3 = mkB(); assert.equal(b3.stage.locked('trapp'), false); cfg.lock = true;
  { const fresh = mkB({ store: { get: (k, d) => d, set() {} } }); fresh.update(0.016, true); assert.equal(fresh.stage.locked('trapp'), true, 'ny spiller: låst'); cfg.on = false; assert.equal(fresh.stage.locked('trapp'), false, 'oppdrag av: ikke låst'); assert.ok(fresh.open('bro', { force: true }) && fresh.grid.toggle() && fresh.stage.now === null, 'fri rutenett-bygging uten krav'); assert.equal(fresh.grid.info().deck, 4, 'uten oppdrag er kjøredekket som før'); cfg.on = true; }
  // oppdraget bruker tyngre last: simuleringen får massK (bilen på sted 4 er ikke den vanlige bilen)
  { const c = { ...cfg, massK: 3 }; const b4 = mkB({ getStage: () => c }); b4.update(0.016, true); b4.open('bro', { force: true }); if (!b4.grid.on) b4.grid.toggle(); assert.equal(b4.stage.now.massK, 3, 'admin-faktor på lasten'); c.budgetK = 2; assert.equal(b4.stage.now.budget, 16, 'admin-faktor på budsjettet'); }
  // klassisk modus er uendret på samme sted: ingen kort, ingen krav, last som før
  { const b5 = mkB({ store: { get: (k, d) => d, set() {} } }); b5.update(0.016, true); b5.open('bro', { force: true }); assert.equal(b5.stage.now, null); assert.deepEqual(b5.stage.lines(), []); }
}
console.log('rutenett-oppdrag-tester grønne');
