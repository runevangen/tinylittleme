// R82: rutenett-bygging i de vanlige byggebrettene (grid_play.js, build.js). node test_gridplay.mjs:
// hvilke steder som får MODUS-knappen (to ankre + dekk; trapp, vippe og kontroll aldri), at brettfilene er uendret, kjent rutenett-løsning per sted (kode, PRØV, deterministisk, kostnad og stjerner som klassisk),
// at den bærer figuren i verden (boten går hengebroen i streng modus, den klassiske løsningen og den harde veien er uendret), låsen, husket valg per vanlige brett, BESTE-merke, og byggeskjermen mot en DOM-stubb.
// Ekte følelse og FPS: testes på iPhone.
import fs from 'node:fs';
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const BL = await import('./build_logic.js'), G = await import('./grid_logic.js'), BP = await import('./build_phys.js'), BB = await import('./build_budget.js'), BW = await import('./build_world.js'), P = await import('./grid_play.js'), I18 = await import('./i18n.js'), BOT = await import('./tools/bot.mjs');
const lvl = (n) => JSON.parse(fs.readFileSync(new URL(`./levels/${n}.level.json`, import.meta.url), 'utf8'));
const NAMES = ['bro', 'kjokkenbro', 'kontroll', 'leke', 'stue', 'trapp', 'verksted', 'vippe'], GRID_IDS = ['bro1', 'kjokken1', 'leke1', 'stue1'];

// ---------- 1) hvilke steder får rutenett ----------
{
  const got = [];
  for (const n of NAMES) {
    const raw = fs.readFileSync(new URL(`./levels/${n}.level.json`, import.meta.url), 'utf8'); assert.ok(!/"grid"/.test(raw), `${n}: brettfilen er uendret (ingen grid-felt)`);
    const L = JSON.parse(raw), ids = P.ensurePlayGrid(L.build.sites); for (const id of ids) got.push(`${n}:${id}`);
    for (const s of L.build.sites) { assert.equal(G.siteHasGrid(s), ids.includes(s.id), `${n}/${s.id}`); if (G.siteHasGrid(s)) { assert.ok(P.isPlaySite(s) && G.deckPoints(s), 'kjøredekk og to ankre'); assert.equal(G.gridStep(s), 7 / 4, 'trinnet er gapet delt i fire'); } }
  }
  assert.deepEqual(got, ['bro:bro1', 'kjokkenbro:kjokken1', 'leke:leke1', 'stue:stue1'], 'bare steder med to ankre og dekk, bevist med kjent løsning');
  for (const id of ['trapp1', 'vippe1', 'verksted1']) assert.ok(!got.some((g) => g.endsWith(id)), id + ' får ikke MODUS');
  assert.equal(P.playGridOf(lvl('kontroll').build.sites[0]), null, 'fire ankre: ingen rutenett');
  assert.deepEqual(P.ensurePlayGrid(lvl('bygglab').build.sites), [], 'Bygglab har sitt eget rutenett og røres ikke');
  const again = lvl('bro'); P.ensurePlayGrid(again.build.sites); assert.deepEqual(P.ensurePlayGrid(again.build.sites), [], 'idempotent');
}

// ---------- 2) kjent referanseløsning per sted ----------
const mkSite = (n, sid) => { const L = lvl(n); P.ensurePlayGrid(L.build.sites); return { L, site: L.build.sites.find((s) => s.id === sid) }; };
const mkB = (site) => { const B = BL.createBuild(JSON.parse(JSON.stringify(site)), {}, []); B.gridDeck = false; return B; };
const CODES = {};
for (const [n, sid] of [['bro', 'bro1'], ['kjokkenbro', 'kjokken1'], ['leke', 'leke1'], ['stue', 'stue1']]) {
  const { L, site } = mkSite(n, sid), spec = P.rowSpec(site), B = mkB(site);
  assert.ok(P.applySpec(B, spec).ok, sid + ': referansen kan legges'); assert.equal(B.rg.rods.length, 4, 'fire staver'); assert.ok(!B.rg.deck, 'uten dekk: spilleren bygger selv');
  for (const load of ['figure', ...(site.loads || [])]) assert.equal(BP.runSim(G.simDef(B), { load }).result, 'won', `${sid}: bærer ${load}`);
  assert.equal(JSON.stringify(BP.runSim(G.simDef(B), { load: 'figure' })), JSON.stringify(BP.runSim(G.simDef(mkB2(site, spec)), { load: 'figure' })), `${sid}: samme bygg, samme resultat`);
  const st = BB.starsFor(site, B.placed, B.links); assert.ok(st.stars >= 1 && st.cost > 0, `${sid}: kostnad og stjerner som i klassisk modus ${JSON.stringify(st)}`);
  const code = P.specCode(B); assert.ok(/^TLM1\./.test(code), 'staver som kode'); CODES[sid] = code; assert.equal(P.codeMode(code), 'grid');
  const B2 = mkB(site); const r = G.importAny(code, B2, BL.importCode); assert.ok(r.ok && r.grid, sid + ': koden kan limes inn'); G.gApplyImport(B2, r); assert.equal(P.specCode(B2), code, 'kode inn og ut er lik');
  // den vanskelige veien og klassisk referanse er uendret: ruta uten bygging finnes
  assert.ok(L.route.length > 2 && site.ref.placed.length >= 1, sid + ': ruta og klassisk referanse finnes');
  const world = BW.buildSolids(site, BP.settledPlaced(G.simDef(B))); assert.ok(world.length >= 8, 'bygget gir faste flater i verden');
}
function mkB2(site, spec) { const B = mkB(site); P.applySpec(B, spec); return B; }
// et for svakt bygg (to staver bare til midten) faller
{ const { site } = mkSite('bro', 'bro1'), B = mkB(site); G.setMode(B, 'grid'); const a = G.gAddNode(B, site.anchors[0].u + 1.75, 0).node; assert.ok(G.gAddRod(B, 'a1', a.id, 'wood').ok); assert.notEqual(BP.runSim(G.simDef(B), { load: 'figure' }).result, 'won', 'halv bro kommer ikke over'); }
assert.equal(P.codeMode(BL.exportCode(Object.assign(BL.createBuild(mkSite('bro', 'bro1').site, {}, []), {}))), 'classic', 'klassisk kode');
assert.equal(P.codeMode('søppel'), 'classic'); assert.equal(P.codeMode(null), 'classic');

// ---------- 3) boten går hengebroen i verden (streng modus), klassisk og harde veien uendret ----------
for (const [n, sid] of [['bro', 'bro1'], ['kjokkenbro', 'kjokken1'], ['leke', 'leke1'], ['stue', 'stue1']]) {
  const L = lvl(n), plans = BOT.plansOf(L), ids = plans.map((p) => p.id);
  assert.ok(ids.includes('ruta') && ids.includes('bygg:' + sid), n + ': ruta og klassisk bygg er med som før'); const pl = plans.find((p) => p.id === `bygg:${sid}:rutenett`); assert.ok(pl && !pl.simFail && pl.solids.length >= 8, `${n}: rutenett-plan: ${pl?.simFail}`);
  const r = BOT.runPlan(L, new URL(`./levels/${n}.level.json`, import.meta.url).pathname, pl, 'streng'); assert.ok(r.ok, `${n}: figuren går over rutenett-bygget i streng modus: ${r.why}`);
  assert.equal(plans.find((p) => p.id === 'bygg:' + sid).simFail, '', 'klassisk referanse består PRØV som før');
}
{ const L = lvl('verksted'); assert.ok(!BOT.plansOf(L).some((p) => p.id.endsWith(':rutenett')), 'verksted: ingen rutenett-plan'); }

// ---------- 4) lås, husket valg ----------
{
  const { site: bro } = mkSite('bro', 'bro1'), { site: kj } = mkSite('kjokkenbro', 'kjokken1'), { site: tr } = mkSite('trapp', 'trapp1');
  assert.equal(P.playLocked({ levelId: 'bro', site: bro, passed: false }), false, 'første sted er alltid åpent');
  assert.equal(P.playLocked({ levelId: 'kjokkenbro', site: kj, passed: false }), true, 'neste brett låst før første sted er bestått');
  assert.equal(P.playLocked({ levelId: 'kjokkenbro', site: kj, passed: true }), false); assert.equal(P.playLocked({ levelId: 'kjokkenbro', site: kj, passed: false, lockOn: false }), false, 'låsen kan slås av');
  assert.equal(P.playLocked({ levelId: 'trapp', site: tr, passed: false }), false, 'steder uten rutenett er aldri låst');
  assert.equal(P.firstPassed({ bro1: { stars: 2 } }), true); assert.equal(P.firstPassed({}), false); assert.equal(P.firstPassed(null), false); assert.equal(P.firstPassed({ bro1: { stars: 0 } }), false);
  const mem = new Map(), st = { get: (k, d) => (mem.has(k) ? mem.get(k) : d), set: (k, v) => mem.set(k, v) }, ps = P.playStore(st);
  ps.set('tlm.gridmode', 'grid'); assert.equal(mem.get('tlm.gridmode.play'), 'grid'); assert.equal(st.get('tlm.gridmode', 'classic'), 'classic', 'Bygglab-valget er urørt'); ps.set('tlm.annet', 1); assert.equal(mem.get('tlm.annet'), 1, 'andre nøkler går rett');
}

// ---------- 5) tekster ----------
{ let lang = 'nb'; const { T } = I18.makeT(() => lang); for (const l of ['nb', 'en']) { lang = l; for (const k of ['gplay.locked', 'gplay.rowMark']) assert.ok(T(k) && T(k) !== k, `${k} (${l})`); assert.ok(!/\b(tast|Enter|Esc|klikk)\b/i.test(T('gplay.locked')), 'ingen taster'); } lang = 'nb'; assert.ok(/MODUS/.test(T('gplay.locked')), 'nevner knappen MODUS'); }

// ---------- 6) byggeskjermen mot en DOM-stubb ----------
{
  const mkEl = () => { const el = { style: { setProperty() {} }, dataset: {}, children: [], _l: {}, _html: '', classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, f) { (f === undefined ? !this._s.has(c) : f) ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    appendChild(c) { this.children.push(c); return c; }, addEventListener(t, f) { (this._l[t] ||= []).push(f); }, removeEventListener() {}, setPointerCapture() {}, releasePointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844 }), closest: () => null, remove() {},
    getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) }),
    querySelector: () => mkEl(), querySelectorAll: () => [], set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; }, width: 0, height: 0 }; return el; };
  globalThis.document = { body: mkEl(), createElement: mkEl, head: mkEl(), getElementById: () => null, querySelector: () => mkEl() };
  globalThis.window = globalThis; globalThis.innerWidth = 390; globalThis.innerHeight = 844; globalThis.devicePixelRatio = 2; globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {};
  const { createBuildMode } = await import('./build.js');
  const mem = new Map(), mkStore = () => ({ get: (k, d) => (mem.has(k) ? JSON.parse(JSON.stringify(mem.get(k))) : d), set: (k, v) => mem.set(k, JSON.parse(JSON.stringify(v))) });
  const mk = (n, extra = {}, log = []) => createBuildMode({ scene: { add() {}, remove() {} }, LEVEL: lvl(n), player: { x: 0, y: 8, z: -4, onGround: true, state: 'ground' }, $: () => mkEl(), T: (k, v) => k + (v ? JSON.stringify(v) : ''), logEv: (t, d) => log.push([t, d]), toast: (m) => log.push(['toast', m]), TOUCH: true, buzz() {}, audio: {},
    isPlay: () => true, isMenu: () => false, isBoss: () => false, isWon: () => false, isOv: () => false, getSnap: () => true, setSnap() {}, allParts: () => true, onChange() {}, levelId: n, store: mkStore(), ...extra });
  // Hyllebroen: MODUS finnes, klassisk er standard, åpent; bro1 løses med rutenett
  { const log = [], bm = mk('bro', {}, log); bm.update(0.016, true); assert.ok(log.some(([t, d]) => t === 'bygg' && /rutenett åpent i vanlige brett: bro1/.test(d)), 'logges');
    assert.ok(bm.open('bro1', { force: true })); assert.ok(bm.grid.available, 'MODUS finnes'); assert.equal(bm.grid.on, false, 'klassisk er standard'); assert.equal(bm.grid.info(), null, 'ingen rutenett-flate før MODUS er valgt');
    assert.ok(bm.grid.toggle() && bm.grid.on, 'MODUS bytter til rutenett (første sted er åpent)'); assert.ok(!bm.grid.info().deck, 'tom flate uten kjøredekk: spilleren bygger selv'); assert.equal(bm.grid.info().rods.length, 0);
    assert.ok(bm.importText(CODES.bro1), 'referansekoden limes inn'); assert.equal(bm.grid.info().rods.length, 4);
    assert.ok(bm.startTry(), 'PRØV'); for (let i = 0; i < 2400 && bm.running; i++) bm.update(1 / 60, true); assert.equal(bm.result.state, 'won', 'kommer i mål: ' + JSON.stringify(bm.result)); bm.stopTry();
    assert.ok(log.some(([t, d]) => t === 'bygg' && /^prøv bro1.*modus rutenett/.test(d)), 'prøven logger modus'); assert.ok(log.some(([t, d]) => t === 'bygg' && /^stjerner \d .*modus rutenett.* bro1/.test(d)), 'stjerner logger modus'); assert.ok(log.some(([t, d]) => t === 'bygg' && /^bygget står i verdenen/.test(d)), 'bygget settes inn i verden');
    assert.ok(log.some(([t, d]) => t === 'bygg' && /^modus rutenett/.test(d)), 'modusvalget logges');
    assert.ok(mem.get('tlm.gridmode.play') === 'grid' && !mem.has('tlm.gridmode'), 'valget huskes for vanlige brett (ikke Bygglab)');
    assert.ok(mem.get('tlm.bstars')?.bro?.bro1?.stars >= 1, 'stjerner lagres som i klassisk');
  }
  // Kjøkkenbroen: låst til bro1 er bestått (i denne lagringen er den bestått nå), og ellers ikke
  { const log = [], bm = mk('kjokkenbro', {}, log); bm.update(0.016, true); assert.ok(bm.open('kjokken1', { force: true })); assert.ok(bm.grid.available); assert.equal(bm.grid.on, true, 'husket valg (rutenett) gjelder også neste brett, og stedet er åpent'); assert.ok(bm.grid.toggle() === true && !bm.grid.on, 'MODUS går tilbake til klassisk'); }
  { mem.clear(); const log = [], bm = mk('kjokkenbro', {}, log); bm.update(0.016, true); assert.ok(bm.open('kjokken1', { force: true })); assert.ok(bm.grid.available);
    assert.ok(!bm.grid.toggle() && !bm.grid.on, 'låst: ingen rutenett før Hyllebroen er bestått'); assert.ok(log.some(([t, m]) => t === 'toast' && /gplay\.locked/.test(m)), 'sier hvorfor'); assert.ok(log.some(([t, d]) => t === 'bygg' && /rutenett låst kjokken1/.test(d)));
    const off = mk('kjokkenbro', { getPlayLock: () => false }); off.update(0.016, true); assert.ok(off.open('kjokken1', { force: true })); assert.ok(off.grid.toggle() && off.grid.on, 'låsen kan slås av i ⚙');
    const off2 = mk('kjokkenbro', { getPlayGrid: () => false }); off2.update(0.016, true); assert.ok(off2.open('kjokken1', { force: true })); assert.equal(off2.grid.available, false, 'innstillingen av: ingen MODUS i vanlige brett');
  }
  // steder uten ankre/dekk: ingen MODUS, ingen tom rutenett-flate
  for (const [n, sid] of [['trapp', 'trapp1'], ['vippe', 'vippe1'], ['verksted', 'verksted1']]) { const bm = mk(n); bm.update(0.016, true); assert.ok(bm.open(sid, { force: true }), n); assert.equal(bm.grid.available, false, `${n}: ingen MODUS`); assert.equal(bm.grid.toggle(), false); assert.equal(bm.grid.info(), null); }
  // Bygglab uendret: eget valg og egen lås
  { const bm = mk('bygglab'); bm.update(0.016, true); assert.ok(bm.open('lab1', { force: true }) || bm.open(bm.siteIds[0], { force: true })); assert.ok(bm.grid.available, 'Bygglab har fortsatt rutenett'); }
}
console.log('test_gridplay: ok');
