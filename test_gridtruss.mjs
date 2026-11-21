// R73: rutenett-bygging, trinn 2 (fagverk-følelse): belastningsfarge, kjøredekk, eksempelbro, «største belastning», SLOW/PAUSE.
// node test_gridtruss.mjs: farge-skala (grønn-gul-oransje-rød, lesbar uten farger), deterministisk belastning, dekket (fast, lagres, deles), at eksempelbroen holder på begge rutenettsteder, og byggeskjermen mot en DOM-stubb.
import fs from 'node:fs';
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const BM = await import('./build_materials.js'), BL = await import('./build_logic.js'), G = await import('./grid_logic.js'), BP = await import('./build_phys.js'), BB = await import('./build_budget.js'), GS = await import('./grid_stress.js'), EX = await import('./grid_example.js'), I18 = await import('./i18n.js');
const lab = JSON.parse(fs.readFileSync(new URL('./levels/bygglab.level.json', import.meta.url), 'utf8'));
const gridSites = lab.build.sites.filter((s) => s.grid && !s.grid.anchors),   // R74: de to med egne ankre (trapp, vippe) har ikke kjøredekk
  allGrid = lab.build.sites.filter((s) => s.grid), site = (k) => lab.build.sites.find((s) => s.lab.key === k);
const mk = (s, deck = true) => { const B = BL.createBuild(s, {}, []); B.gridDeck = deck; G.setMode(B, 'grid'); return B; };
assert.equal(allGrid.length, 10, 'R74: ti rutenettsteder i Bygglab'); assert.equal(gridSites.length, 7, 'sju av dem har to ankre på lik høyde');

// ---------- 1) farge-skala ----------
{
  const rgb = (r) => GS.stressRGB(r), luma = (r) => GS.luma(rgb(r));
  assert.deepEqual(GS.bandOf(0), 'gronn'); assert.equal(GS.bandOf(1), 'rod'); assert.equal(GS.bandOf(2), 'rod', 'over grensen er fortsatt rød'); assert.equal(GS.bandOf(NaN), 'gronn');
  const order = []; for (let i = 0; i <= 100; i++) { const b = GS.bandOf(i / 100); if (order[order.length - 1] !== b) order.push(b); } assert.deepEqual(order, ['gronn', 'gul', 'oransje', 'rod'], 'fire bånd i rekkefølge, aldri tilbake');
  const g = rgb(0), y = rgb(0.2), o = rgb(0.5), r = rgb(1); assert.ok(g[1] > g[0] && g[1] > g[2], 'lite belastning er grønn'); assert.ok(y[0] > 200 && y[1] > 200 && y[2] < 100, 'gul'); assert.ok(o[0] > 200 && o[1] > 100 && o[1] < 170, 'oransje'); assert.ok(r[0] > r[1] * 3 && r[0] > r[2] * 3, 'nær brudd er rød');
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); const mids = [0, 0.15, 0.4, 0.9].map(rgb); for (let i = 1; i < mids.length; i++) assert.ok(dist(mids[i], mids[i - 1]) > 60, 'båndene skiller seg tydelig');
  assert.ok(luma(1) < luma(0.4) - 60 && luma(0.4) < luma(0.15) - 20, 'lyshet synker fra gul til rød (lesbart for fargesvake)');
  for (let i = 1; i <= 100; i++) assert.ok(dist(GS.colorAt(i / 100), GS.colorAt((i - 1) / 100)) < 14, 'jevn overgang'); for (let i = 1; i <= 100; i++) assert.ok(GS.shown(i / 100) >= GS.shown((i - 1) / 100), 'monoton');
  assert.equal(GS.stressCss(0.3), GS.stressCss(0.3)); assert.ok(/^rgb\(\d+,\d+,\d+\)$/.test(GS.stressCss(0.7)));
  assert.notEqual(GS.bandOf(0.2), GS.bandOf(0), 'en liten, ekte last (20 %) vises som noe annet enn ingen last'); assert.equal(GS.bandOf(0.2, 1), 'gronn', 'kurve 1 gir rett fram');
  assert.ok(GS.widthK('strekk') < 1 && GS.widthK('trykk') > 1, 'strekk tynnere, trykk tykkere'); assert.ok(GS.isDanger(0.95) && !GS.isDanger(0.3));
  // belastning ut av fysikken
  assert.deepEqual(GS.rodLoad({ nc: 50, nt: 0, pcr: 100, tcap: 1000, ccap: 400 }), { r: 0.5, kind: 'trykk', broken: false });
  assert.deepEqual(GS.rodLoad({ nc: 0, nt: 300, pcr: 100, tcap: 600, ccap: 400 }), { r: 0.5, kind: 'strekk', broken: false });
  assert.equal(GS.rodLoad({ nc: 5, nt: 40, pcr: Infinity, tcap: 100, ccap: Infinity }).r, 0.4, 'tau: bare strekk'); assert.equal(GS.rodLoad({ nc: 1e9, nt: 0, pcr: Infinity, tcap: 100, ccap: Infinity }).r, 0, 'tau knekker ikke');
  assert.deepEqual(GS.rodLoad({ nc: 0, nt: 0, pcr: 1, tcap: 1, ccap: 1, broken: true, mode: 'tear' }), { r: 1, kind: 'strekk', broken: true });
  assert.equal(GS.pct(0.874), 87);
}

// ---------- 2) kjøredekk ----------
{
  for (const s of gridSites) {
    const B = mk(s), Gd = B.rg, an = BL.siteAnchors(s), st = G.gridStep(s), N = Math.round((an[1].u - an[0].u) / st);
    assert.ok(Gd.deck && G.hasDeck(Gd)); assert.equal(Gd.rods.length, N, `${s.id}: ett dekk-felt per rutenettrute`); assert.equal(Gd.nodes.filter((n) => n.deck).length, N - 1); assert.ok(Gd.rods.every((r) => r.deck && r.mat === 'wood' && /^dk\d+$/.test(r.id)));
    assert.equal(B.placed.length, N, 'dekket er en vanlig kjede av staver i fysikken'); assert.equal(B.links.length, 2 + (N - 1), 'ledd: to mot klippene og ett per dekk-knute');
    // dekket holder figuren alene (som før med fire staver), og knutene ligger på rutenettet
    for (const n of Gd.nodes.filter((q) => q.deck)) assert.ok(G.latticePoints(s).some((p) => Math.abs(p.u - n.u) < 1e-6 && Math.abs(p.v - n.v) < 1e-6) && n.v === 0);
    assert.equal(BP.runSim(G.simDef(B), { load: 'figure' }).result, 'won', `${s.id}: dekket bærer figuren over`);
    // knuter og staver på dekket kan ikke slettes eller flyttes
    const d1 = Gd.nodes.find((n) => n.deck); assert.equal(G.gRemoveNode(B, d1.id), false); assert.equal(G.gMoveNode(B, d1.id, d1.u, 2).why, 'fixed'); assert.equal(G.canMoveTo(B, d1.id, d1.u, 2), null); assert.equal(G.gRemoveRod(B, 'dk1'), false); assert.equal(B.rg.rods.length, N);
    // men du kan bygge på dem: stav fra dekk-knuten og opp, og den kan fjernes igjen
    const top = G.gAddNode(B, d1.u, st).node; const r = G.gAddRod(B, d1.id, top.id, 'wood'); assert.ok(r.ok, JSON.stringify(r)); assert.equal(B.rg.rods.length, N + 1); assert.ok(G.gRemoveRod(B, r.rod.id)); assert.equal(G.gAddRod(B, d1.id, 'a1', 'wood').ok, false, 'dekket kan ikke dobles');
    assert.equal(G.gridStats(B).rods, 0, 'dekket teller ikke som det du la til'); assert.equal(G.gridStats(B).deck, N);
    // NULLSTILL: dekket står igjen
    G.gAddRod(B, d1.id, top.id, 'steel'); assert.ok(G.gReset(B)); assert.equal(B.rg.rods.length, N); assert.ok(B.rg.deck); assert.equal(G.gReset(B), false, 'bare dekket: ingenting å nullstille'); assert.ok(G.gUndo(B) && B.rg.rods.length === N + 1, 'ANGRE tar tilbake');
  }
  // steder uten to ankre på samme høyde får ikke dekk, og uten valget (gridDeck) er alt som før
  assert.equal(G.deckPoints({ ...site('bro'), anchors: [{ u: -3.5, v: 0 }, { u: 3.5, v: 1 }] }), null); assert.equal(G.deckPoints({ ...site('bro'), anchors: [{ u: 0, v: 2 }] }), null);
  const none = mk(site('bro'), false); assert.ok(!none.rg.deck && none.rg.rods.length === 0 && none.placed.length === 0);
  // kode (deling): dekket er ikke med, kodeversjon 3, og den leses tilbake; gamle koder (versjon 2) virker fortsatt
  const s = site('bro'), A = mk(s), st = G.gridStep(s), d = A.rg.nodes.filter((n) => n.deck); const t1 = G.gAddNode(A, d[0].u, st).node, t2 = G.gAddNode(A, d[1].u, st).node;
  assert.ok(G.gAddRod(A, d[0].id, t1.id, 'steel').ok && G.gAddRod(A, t1.id, t2.id, 'wood').ok && G.gAddRod(A, d[1].id, t2.id, 'steel').ok);
  const code = G.gridExport(A); assert.ok(/^TLM1\./.test(code)); const R = G.gridImport(code, mk(s)); assert.ok(R.ok && R.grid.deck && R.grid.rods.length === A.rg.rods.length, JSON.stringify(R));
  const Z = mk(s); G.gApplyImport(Z, R); assert.equal(JSON.stringify(Z.placed.map((p) => p.type)), JSON.stringify(A.placed.map((p) => p.type)), 'samme bygg etter import'); assert.equal(G.gridExport(Z), code, 'samme kode ut igjen');
  const old = mk(s, false); G.gAddNode(old, -1.75, 0); G.gAddRod(old, 'a1', 'kn1', 'wood'); const oc = G.gridExport(old); const RO = G.gridImport(oc, mk(s, false)); assert.ok(RO.ok && !RO.grid.deck, 'kode uten dekk leses som før'); assert.ok(JSON.parse(Buffer.from(oc.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString())[0] === 2, 'uten dekk er kodeversjonen 2');
  // lagring
  const snap = JSON.parse(JSON.stringify(G.gridSnapshot(A.rg))); assert.ok(snap.deck && snap.rods.every((r) => !/^dk/.test(r[0])) && snap.nodes.every((n) => !/^d\d/.test(n[0])), 'dekket lagres som et flagg, ikke som staver');
  const back = G.gridFromSnapshot(s, snap); assert.equal(back.rods.length, A.rg.rods.length); assert.ok(back.deck); assert.equal(G.gridFromSnapshot(s, { nodes: [], rods: [] }).deck, undefined, 'gammel lagring uten dekk');
}

// ---------- 3) eksempelbroen (SÅ SLIK) ----------
{
  for (const s of gridSites) {
    const B = mk(s), r = EX.applyExample(B); assert.ok(r.ok && r.rods === 9, `${s.id}: 9 staver`); assert.ok(EX.hasExample(s));
    const rods = B.rg.rods.filter((q) => !q.deck); assert.ok(rods.every((q) => G.rodCheck({ ...B.rg, rods: B.rg.rods.filter((x) => x !== q) }, q.a, q.b, 6.5).ok), 'alle staver er lovlige etter reglene');
    // trekanter: hver topp-knute har minst tre staver (loddrett, topp, skrå), og alle dekk-knuter har minst to staver i tillegg til dekket
    for (const n of B.rg.nodes.filter((q) => !q.fixed && !q.deck)) assert.ok(G.rodsAt(B.rg, n.id).length >= 3, 'topp-knute i trekanter');
    for (const load of ['figure', 'ball', 'car', 'robot']) { const x = BP.runSim(G.simDef(B), { load }); assert.equal(x.result, 'won', `${s.id}: eksempelbroen bærer ${load}`); assert.equal(x.breaks.length + x.linkBreaks.length, 0, 'ingen brudd'); }
    assert.ok(G.gUndo(B) && B.rg.rods.length === 4 && B.rg.rods.every((q) => q.deck), 'ANGRE tar eksempelet bort, dekket står'); assert.equal(EX.applyExample(mk(s, false)).ok, true, 'eksempelet legger til dekk selv');
  }
  assert.equal(EX.hasExample(site('trapp')), false, 'steder uten rutenett: ingen eksempelbro'); assert.equal(EX.hasExample({ ...site('bro'), anchors: [{ u: -1, v: 0 }, { u: 1, v: 0 }], grid: { step: 1.75 } }), false, 'for kort spenn');
  const f = (s) => JSON.stringify(EX.exampleGrid(s)); assert.equal(f(site('bro')), f(site('bro')), 'samme eksempel hver gang');
  // eksempelet er billigere enn terskelen for tre stjerner? (bare informasjon: det skal gi minst én stjerne)
  const B = mk(site('fagverk')); EX.applyExample(B); const st = BB.starsFor(B.site, B.placed, B.links); assert.ok(st.stars >= 1 && st.parts === 13, JSON.stringify(st));
}

// ---------- 4) belastning under prøven: deterministisk, og «største belastning» ----------
{
  const track = (B, load, axial = 1) => {
    const sim = BP.createSim(G.simDef(B), { load, axial }), P = GS.createPeaks(), br = []; let live = null;
    while (sim.state.state === 'run' && sim.t < 25) { sim.step(); P.feed(sim.axial(), sim.t); for (const e of sim.drain()) if (e.type === 'break') br.push({ id: e.id, t: e.t, mode: e.mode }); if (!live && sim.t > 1) live = [...GS.loadsNow(sim.axial())]; }
    return { P, br, state: sim.state.state, live };
  };
  const B = mk(site('fagverk')); EX.applyExample(B);
  const a = track(B, 'car'), b = track(B, 'car'); assert.equal(JSON.stringify([...a.P.peaks]), JSON.stringify([...b.P.peaks]), 'samme bygg og last gir samme belastning (deterministisk)'); assert.equal(JSON.stringify(a.live), JSON.stringify(b.live));
  assert.equal(a.P.peaks.size, B.rg.rods.length, 'alle staver følges'); assert.equal(a.state, 'won');
  const sum = GS.peakSummary(a.P.peaks, a.br); assert.equal(sum.first, null, 'ingen brudd'); assert.ok(sum.top && sum.top.r > 0 && sum.top.r < 1 && sum.list.length === B.rg.rods.length); assert.ok(sum.list.every((x, i) => i === 0 || sum.list[i - 1].r >= x.r), 'sortert etter belastning');
  assert.ok(GS.bandOf(sum.top.r) !== 'gronn' || sum.top.r < 0.15, 'toppen har en farge som sier noe'); const live = new Map(a.live); assert.ok([...live.values()].some((x) => x.r > 0.01), 'stavene er belastet underveis');
  // svak bro: brudd, og «brakk først» peker på stavene som røk først
  const W = mk(site('bro'), true); const wk = track(W, 'car', 0.05); assert.equal(wk.state, 'lost'); assert.ok(wk.br.length >= 1, 'brudd med svak styrke');
  const ws = GS.peakSummary(wk.P.peaks, wk.br); assert.ok(ws.first && ws.first.id === wk.br.slice().sort((x, y) => x.t - y.t)[0].id && ws.first.kind, 'første brudd'); assert.equal(wk.P.peaks.get(ws.first.id).r >= 0.99, true, 'staven som brakk står med full belastning'); assert.ok(wk.P.peaks.get(ws.first.id).broken);
  const w2 = track(W, 'car', 0.05); assert.equal(JSON.stringify([...w2.P.peaks]), JSON.stringify([...wk.P.peaks]), 'også bruddet er deterministisk');
  // R74: tre er svakt i rutenett. Trailer-broen (9 staver Pratt på «fagverk», som i tools/trailer/shots/06b_bro_brister.cjs) brister på standardstyrke med Leke-bil; samme geometri i stål holder; lette laster holder på tre; deterministisk
  const trailer = (mat) => { const S = site('fagverk'), B = mk(S), st = G.gridStep(S), d = B.rg.nodes.filter((n) => n.deck).sort((p, q) => p.u - q.u), an = B.rg.nodes.filter((n) => n.fixed).sort((p, q) => p.u - q.u), c = [an[0], ...d, an[1]];
    const t = [null, 1, 2, 3].map((i) => i && G.gAddNode(B, c[i].u, st).node), add = (a, b) => assert.ok(G.gAddRod(B, a.id, b.id, mat).ok);
    add(c[0], t[1]); add(t[1], t[2]); add(t[2], t[3]); add(t[3], c[4]); add(c[1], t[1]); add(c[2], t[2]); add(c[3], t[3]); add(t[1], c[2]); add(t[3], c[2]); return B; };
  const tw = trailer('wood'), tsx = trailer('steel'), twc = track(tw, 'car'), tsc = track(tsx, 'car');
  const topOf = (x) => Math.max(...[...x.P.peaks.values()].map((q) => q.r));
  assert.equal(twc.state, 'lost', 'tre-broen brister med Leke-bil på standardstyrke'); assert.ok(twc.br.length >= 1, 'og noe brekker: ' + JSON.stringify(twc.br)); assert.ok(topOf(twc) > 0.9, 'stavene når rødt: ' + topOf(twc).toFixed(2));
  assert.equal(tsc.state, 'won', 'stål-bro med samme geometri holder'); assert.equal(tsc.br.length, 0); assert.ok(topOf(tsc) < 0.7 && topOf(tsc) < topOf(twc) * 0.7, 'stål-broen er tydelig mindre belastet enn tre-broen: ' + topOf(tsc).toFixed(2));
  for (const load of ['figure', 'robot']) { const x = track(tw, load); assert.equal(x.state, 'won', `tre-broen bærer ${load}`); assert.equal(x.br.length, 0, 'uten brudd'); assert.ok(topOf(x) < 0.7, 'under oransje/rødt: ' + topOf(x).toFixed(2)); }
  const twc2 = track(trailer('wood'), 'car'); assert.equal(JSON.stringify([...twc2.P.peaks]), JSON.stringify([...twc.P.peaks]), 'deterministisk (samme bygg, samme brudd)'); assert.equal(JSON.stringify(twc2.br), JSON.stringify(twc.br));
  assert.ok(GRID_MATS_OK(), 'tre er svakere enn stål i alle grenser'); function GRID_MATS_OK() { const M = (m) => BM.GRID_MAT[m]; return ['st', 'sc', 'E', 'mcap', 'joint'].every((k) => M('wood')[k] < M('steel')[k]) && M('wood').st < 12000; }
}

// ---------- 5) byggeskjermen mot en DOM-stubb: SLOW, PAUSE, farge og største belastning ----------
{
  const mkEl = () => { const el = { style: { setProperty() {} }, dataset: {}, children: [], _l: {}, _html: '', classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, f) { (f === undefined ? !this._s.has(c) : f) ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    appendChild(c) { this.children.push(c); return c; }, addEventListener(t, f) { (this._l[t] ||= []).push(f); }, removeEventListener() {}, setPointerCapture() {}, releasePointerCapture() {}, setAttribute() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844 }), closest: () => null, remove() {},
    getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === 'measureText' ? () => ({ width: 80 }) : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) }),
    querySelector: () => mkEl(), querySelectorAll: () => [], set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; }, width: 0, height: 0 }; return el; };
  const body = mkEl(); globalThis.document = { body, createElement: mkEl, head: mkEl(), getElementById: () => null, querySelector: () => mkEl() };
  globalThis.window = globalThis; globalThis.innerWidth = 390; globalThis.innerHeight = 844; globalThis.devicePixelRatio = 2; globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {};
  const { createBuildMode } = await import('./build.js');
  const S = JSON.parse(JSON.stringify(site('bro'))); S.id = 'bro'; S.x = 0; S.y = 2; S.z = 0;
  const L = { boxes: [], build: { sites: [S], parts: [{ id: 'a', type: 'plank_s', x: 10, y: 3, z: 0 }] } }, player = { x: 0, y: 2, z: 0, onGround: true, state: 'ground' }, log = [];
  const mkB = (opts = {}) => createBuildMode({ scene: { add() {}, remove() {} }, LEVEL: JSON.parse(JSON.stringify(L)), player: { ...player }, $: () => mkEl(), T: (k, v) => k + (v ? JSON.stringify(v) : ''), logEv: (t, d) => log.push([t, d]), toast: (m) => log.push(['toast', m]), TOUCH: true, buzz() {}, audio: {}, isPlay: () => true, isMenu: () => false, isBoss: () => false, isWon: () => false, isOv: () => false, getSnap: () => true, setSnap() {}, allParts: () => true, onChange() {}, ...opts });
  const bm = mkB(); bm.update(0.016, true); assert.ok(bm.open('bro', { force: true })); assert.ok(bm.grid.toggle() && bm.grid.on, 'rutenett-modus');
  let info = bm.grid.info(); assert.equal(info.deck, 4, 'nytt rutenett-bygg starter med kjøredekket'); assert.equal(info.rods.filter((r) => r.deck).length, 4); assert.equal(info.rods.length, 4);
  // dekket kan ikke fjernes med FJERN
  { const p = bm.screenPos(-1.75, 0); bm.grid.tap(p.x, p.y); assert.ok(bm.grid.selNode); assert.equal(bm.grid.del(), false, 'FJERN tar ikke dekket'); assert.ok(log.some(([t, m]) => t === 'toast' && /deckFixed/.test(m))); assert.equal(bm.grid.info().rods.length, 4); }
  assert.ok(bm.grid.example(), 'SÅ SLIK legger inn eksempelbroen'); assert.equal(bm.grid.info().rods.length, 13); assert.ok(log.some(([t, d]) => t === 'bygg' && /^eksempelbro lagt inn: 9 staver/.test(d)), 'logges');
  // PRØV: vanlig tempo, så SLOW, så PAUSE
  const adv = (n, dt = 1 / 60) => { for (let i = 0; i < n && bm.running; i++) bm.update(dt, true); };
  assert.ok(bm.startTry()); assert.equal(bm.grid.speed, 'play'); adv(30); const t1 = bm.result.t; assert.ok(t1 > 0.3, 'tiden går: ' + t1);
  assert.equal(bm.grid.setSpeed('slow'), 'slow'); adv(30); const t2 = bm.result.t; assert.ok(t2 - t1 > 0 && t2 - t1 < (t1) * 0.6, `SLOW går tregere (${(t2 - t1).toFixed(3)} mot ${t1.toFixed(3)})`);
  assert.equal(bm.grid.setSpeed('pause'), 'pause'); adv(120); assert.equal(bm.result.t, t2, 'PAUSE stopper tiden'); assert.ok(bm.running, 'prøven er ikke ferdig under pause');
  assert.equal(bm.grid.setSpeed('pause'), 'play', 'PAUSE igjen (FORTSETT) går tilbake til vanlig tempo'); assert.equal(bm.grid.setSpeed('slow'), 'slow'); assert.equal(bm.grid.setSpeed('slow'), 'play', 'SLOW igjen slår det av');
  assert.ok(log.some(([t, d]) => t === 'bygg' && /^tempo sakte/.test(d)) && log.some(([t, d]) => t === 'bygg' && /^tempo pause/.test(d)), 'tempo logges');
  assert.ok(bm.grid.peaks.length >= 13 && bm.grid.peaks.some((p) => p.r > 0), 'toppene følges under prøven'); adv(4000);
  assert.equal(bm.result.state, 'won', JSON.stringify(bm.result)); assert.ok(bm.grid.summary && bm.grid.summary.top, 'største belastning finnes etter prøven'); assert.ok(log.some(([t, d]) => t === 'bygg' && /^største belastning (st|dk)\d+ \d+ % (trykk|strekk)/.test(d)), 'største belastning logges: ' + JSON.stringify(log.filter(([t, d]) => /største/.test(d))));
  assert.equal(bm.grid.setSpeed('slow'), 'play', 'tempo kan ikke endres etter at prøven er ferdig'); assert.ok(/grid\.peak\.top/.test(bm.result.hint), 'teksten viser største belastning: ' + bm.result.hint);
  bm.stopTry(); assert.equal(bm.grid.peaks, null);
  // uten valgene: gammel oppførsel (ingen toppliste i teksten, ikke dekk)
  const b2 = mkB({ getGridDeck: () => false, getGridPeak: () => false, getGridStress: () => false }); b2.update(0.016, true); b2.open('bro', { force: true }); b2.grid.toggle(); assert.equal(b2.grid.info().rods.length, 0); assert.equal(b2.grid.info().deck, 0, 'dekk av: tomt rutenett som før');
  // klassisk modus er uendret: ingen toppliste
  const b3 = mkB(); b3.update(0.016, true); b3.open('bro', { force: true }); b3.startTry(); assert.equal(b3.grid.peaks, null, 'klassisk modus følger ikke rutenett-belastning'); b3.stopTry();
  // lagring og tilbake med dekk
  b2.close('t'); bm.close('t'); const sv = JSON.parse(JSON.stringify(bm.save())); assert.ok(sv.sites.bro.grid.deck, 'dekket lagres'); const b4 = mkB(); b4.load(sv); b4.update(0.016, true); b4.open('bro', { force: true }); assert.ok(b4.grid.on && b4.grid.info().deck === 4 && b4.grid.info().rods.length === 13, 'bygget med dekk kommer tilbake: ' + JSON.stringify(b4.grid.info()?.rods?.length));
}

// ---------- 6) tekster og innstillinger ----------
{
  let lang = 'nb'; const { T } = I18.makeT(() => lang);
  for (const l of ['nb', 'en']) { lang = l; for (const k of ['grid.example', 'grid.example.done', 'grid.slow', 'grid.pause', 'grid.resume', 'grid.deckFixed', 'grid.peak.first', 'grid.peak.top', 'grid.kind.strekk', 'grid.kind.trykk']) { const t = T(k, { name: 'tre 2', mat: 'trykk', len: '2,0', n: 80 }); assert.ok(t && t !== k && !/\{\w+\}/.test(t), `${l}:${k}`); } }
  lang = 'nb'; const all = ['grid.example.done', 'grid.deckFixed', 'grid.peak.first', 'grid.peak.top'].map((k) => T(k, { name: 'x', mat: 'y', len: '1', n: 1 })).join(' '); assert.ok(!/\b(tast|Enter|Esc|klikk|mus)\b/i.test(all), 'ingen taster'); assert.ok(/ANGRE/.test(T('grid.example.done')) && /PRØV/.test(T('grid.example.done')), 'nevner knappene');
  const main = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8'); for (const id of ['buildgridstress', 'buildgridpeak', 'buildgriddeck', 'buildgridgamma', 'buildgridslow']) assert.ok(main.includes(`'${id}'`), 'innstilling ' + id);
  const idx = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8'); for (const f of ['grid_stress', 'grid_example']) assert.ok(idx.includes(`'${f}'`), f + ' ligger i files');
}
console.log('fagverk-tester grønne');
