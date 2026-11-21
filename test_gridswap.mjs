// node test_gridswap.mjs: R128, BYTT TIL STÅL i Rutenett (grid_swap.js, grid_swap_view.js): bytte, pris og budsjett, ANGRE i ett steg, hint etter feilet prøve, filer og ⚙-valg,
// og byggeskjermen mot en DOM-stubb (Hyllebroen og et Bygglab-sted). Ekte berøring og bilder: tools/live_gridswap.cjs.
import fs from 'node:fs';
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const S = await import('./grid_swap.js'), BL = await import('./build_logic.js'), G = await import('./grid_logic.js'), M = await import('./grid_mirror.js'), BM = await import('./build_materials.js'), EX = await import('./grid_example.js'), I18 = await import('./i18n.js'), P = await import('./grid_play.js');
const lvl = (n) => JSON.parse(fs.readFileSync(new URL(`./levels/${n}.level.json`, import.meta.url), 'utf8'));
const mkSite = (site, deck = false) => { const B = BL.createBuild(JSON.parse(JSON.stringify(site)), {}, []); B.gridDeck = deck; G.setMode(B, 'grid'); B.gridMaxLen = 6.5; return B; };
const wide = { id: 'w', w: 30, h: 14, anchors: [{ u: -8, v: 0 }, { u: 8, v: 0 }], deck: [{ u0: -14, u1: -8 }, { u0: 8, u1: 14 }], start: { u: -12, v: 0 }, goal: { u: 12, v: 0 }, grid: { step: 2 } };
const snap = (B) => JSON.stringify(B.rg);
const rod = (B, a, b, mat = 'wood') => { const r = G.gAddRod(B, a, b, mat); assert.ok(r.ok, `stav ${a}-${b}: ${r.why}`); return r.rod; };
const nd = (B, u, v) => { const r = G.gAddNode(B, u, v); assert.ok(r.ok); return r.node.id; };

// ---------- 1) bytte: samme knuter og id, pris, ett ANGRE-steg ----------
{
  const B = mkSite(wide), k1 = nd(B, -4, 4), r1 = rod(B, 'a1', k1, 'wood'), r2 = rod(B, k1, nd(B, 0, 4), 'rope'), L = G.rodLen(B.rg, r1);
  const before = snap(B), cost0 = M.gridCost(B, B.rg), h0 = B.history.length;
  const pl = S.swapPlan(B, r1.id); assert.ok(pl.ok); assert.equal(pl.from, 'wood'); assert.equal(pl.to, 'steel'); assert.equal(snap(B), before, 'planen endrer ikke bygget');
  assert.equal(pl.delta, BM.rodPrice('steel', L) - BM.rodPrice('wood', L), 'prisforskjellen er stål minus tre'); assert.ok(pl.delta > 0);
  const r = S.gSwap(B, r1.id); assert.ok(r.ok);
  const x = G.rodOf(B.rg, r1.id); assert.equal(x.mat, 'steel'); assert.equal(x.a, r1.a); assert.equal(x.b, r1.b, 'samme knuter og id');
  assert.equal(B.history.length, h0 + 1, 'ett ANGRE-steg'); assert.equal(M.gridCost(B, B.rg) - cost0, pl.delta, 'bygget koster nøyaktig prisforskjellen mer');
  assert.ok(B.placed.find((p) => p.id === r1.id).type.startsWith('rod_steel_'), 'fysikken ser stål (derive)');
  assert.ok(G.gUndo(B)); assert.equal(snap(B), before, 'ANGRE gir tilbake tre'); assert.equal(M.gridCost(B, B.rg), cost0);
  // tau byttes også
  const t = S.gSwap(B, r2.id); assert.ok(t.ok && t.from === 'rope'); assert.equal(G.rodOf(B.rg, r2.id).mat, 'steel');
  // allerede stål, ukjent stav, dekk og klassisk modus
  assert.equal(S.swapPlan(B, r2.id).why, 'already'); assert.equal(S.swapPlan(B, 'st999').why, 'none');
  assert.equal(S.gSwap(B, r2.id).ok, false); assert.equal(B.history.length, h0 + 1, 'avvist bytte skriver ikke historikk');
  const D = mkSite(wide, true); const dk = D.rg.rods.find((q) => q.deck); assert.equal(S.swapPlan(D, dk.id).why, 'deck'); assert.equal(dk.mat, 'wood', 'dekket er urørt');
  const C = BL.createBuild(JSON.parse(JSON.stringify(wide)), {}, []); assert.equal(S.swapPlan(C, 'st1').why, 'mode', 'klassisk modus: ingenting');
}
// ---------- 2) budsjett: for dyrt avvises uten å røre bygget ----------
{
  const B = mkSite(wide), k = nd(B, -4, 4), r = rod(B, 'a1', k, 'wood'), d = S.swapPlan(B, r.id).delta;
  const before = snap(B), h0 = B.history.length;
  const no = S.swapPlan(B, r.id, d - 1); assert.equal(no.ok, false); assert.equal(no.why, 'budget'); assert.ok(no.need > 0);
  assert.equal(S.gSwap(B, r.id, d - 1).ok, false); assert.equal(snap(B), before); assert.equal(B.history.length, h0);
  assert.equal(S.swapPlan(B, r.id, d).ok, true, 'akkurat nok holder'); assert.equal(S.swapPlan(B, r.id, null).ok, true, 'ingen grense'); assert.equal(S.swapPlan(B, r.id, undefined).ok, true);
  assert.equal(S.gSwap(B, r.id, d).ok, true);
}
// ---------- 3) hint: staven som tok mest (av dem som kan byttes), brakk først går foran ----------
{
  const B = mkSite(wide, true), k1 = nd(B, -4, 4), k2 = nd(B, 0, 4), a = rod(B, 'a1', k1, 'wood'), b = rod(B, k1, k2, 'wood'), c = rod(B, k2, nd(B, 4, 4), 'steel'), dk = B.rg.rods.find((q) => q.deck);
  const peaks = [{ id: a.id, r: 0.5, kind: 'trykk' }, { id: b.id, r: 0.9, kind: 'strekk' }, { id: c.id, r: 1.0, kind: 'trykk' }, { id: dk.id, r: 0.99, kind: 'trykk' }];
  const h = S.hintOf(B, peaks); assert.equal(h.id, b.id, 'stål og dekk hoppes over: høyest av de som kan byttes'); assert.equal(h.kind, 'strekk'); assert.ok(S.hintValid(B, h));
  assert.equal(S.hintOf(B, peaks, { id: a.id }).id, a.id, 'staven som brakk først går foran');
  assert.equal(S.hintOf(B, peaks, { id: c.id }).id, b.id, 'brakk først var stål: ta den høyeste som kan byttes');
  assert.equal(S.hintOf(B, [{ id: a.id, r: 0.05 }]), null, 'rolig stav: ingen hint'); assert.equal(S.hintOf(B, [{ id: a.id, r: 0.05, broken: true }]).id, a.id, 'brukket stav får alltid hint'); assert.equal(S.hintOf(B, null), null); assert.equal(S.hintOf(B, []), null);
  // hintet gjelder bare så lenge staven er uendret
  assert.ok(S.hintValid(B, h)); S.gSwap(B, b.id); assert.equal(S.hintValid(B, h), false, 'byttet: hintet er borte'); G.gUndo(B); assert.ok(S.hintValid(B, h), 'ANGRE: samme stav igjen');
  G.gRemoveRod(B, b.id); assert.equal(S.hintValid(B, h), false, 'fjernet stav: hintet er borte');
}
// ---------- 4) tekster, filer og ⚙-valg ----------
{
  for (const k of ['sw.btn', 'sw.aria', 'sw.done', 'sw.hint.top', 'sw.hint.broke', 'sw.err.budget', 'sw.err.already', 'sw.err.deck', 'sw.err.none']) for (const lang of ['no', 'en']) { const t = I18.T ? I18.T(k, { n: '1,5' }, lang) : null; if (t != null) assert.ok(t && t !== k, `${lang} ${k}`); }
  const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8'); assert.ok(/'grid_swap'/.test(html) && /'grid_swap_view'/.test(html), 'modulene ligger i files i index.html');
  const main = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8'); assert.match(main, /fl\('buildswapsteel', 'spill'/, 'SETTINGS: buildswapsteel i gruppen spill'); assert.match(main, /tlm\.buildswapsteel', true/, 'standard på'); assert.match(main, /getSwapSteel: \(\) => buildSwapSteel/);
  const v = fs.readFileSync(new URL('./grid_swap_view.js', import.meta.url), 'utf8'); assert.match(v, /logEv\('bygg', `bytt til stål:/); assert.match(v, /logEv\('bygg', `bytt til stål avvist/); assert.match(v, /logEv\('bygg', `belastningshint/);
  assert.match(fs.readFileSync(new URL('./docs/INNSTILLINGER.md', import.meta.url), 'utf8'), /tlm\.buildswapsteel/); assert.match(fs.readFileSync(new URL('./changes_data.js', import.meta.url), 'utf8'), /r128-bytt-til-staal/);
  const css = (await import('./grid_swap_view.js')).swCss(); assert.ok(css.includes('.gsw{') && css.includes('height:44px'), 'trykkflate minst 44 px');
  const bj = fs.readFileSync(new URL('./build.js', import.meta.url), 'utf8'); assert.match(bj, /swp\.onResult\(/); assert.match(bj, /swp\.frame\(\)/); assert.match(bj, /swp\.draw\(/); assert.match(bj, /swMarkup\(\)/);
}
// ---------- 5) byggeskjermen mot en DOM-stubb: hint etter feilet prøve, knapp, bytte, ANGRE; Hyllebroen og Byggeskolen ----------
{
  const mkEl = () => { const el = { style: { setProperty() {} }, dataset: {}, children: [], _l: {}, _html: '', cls: '', get parentNode() { return { querySelector: () => mkEl(), appendChild() {} }; }, classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, f) { (f === undefined ? !this._s.has(c) : f) ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    appendChild(c) { this.children.push(c); return c; }, addEventListener(t, f) { (this._l[t] ||= []).push(f); }, removeEventListener() {}, setPointerCapture() {}, releasePointerCapture() {}, setAttribute() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844 }), closest: () => null, remove() {},
    getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === 'measureText' ? () => ({ width: 80 }) : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) }),
    querySelector: () => mkEl(), querySelectorAll: () => [], set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; }, width: 0, height: 0 }; return el; };
  const body = mkEl(); globalThis.document = { body, createElement: mkEl, head: mkEl(), getElementById: () => null, querySelector: () => mkEl() };
  globalThis.window = globalThis; globalThis.innerWidth = 390; globalThis.innerHeight = 844; globalThis.devicePixelRatio = 2; globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {};
  const { createBuildMode } = await import('./build.js');
  const player = { x: 0, y: 2, z: 0, onGround: true, state: 'ground' };
  const mkBm = (swap, LV, lid) => { const log = [], toasts = []; const bm = createBuildMode({ scene: { add() {}, remove() {} }, LEVEL: JSON.parse(JSON.stringify(LV)), player: { ...player }, $: () => mkEl(), T: (k, v) => k + (v ? JSON.stringify(v) : ''), logEv: (t, d) => log.push([t, d]), toast: (m) => toasts.push(m), TOUCH: true, buzz() {}, audio: {}, isPlay: () => true, isMenu: () => false, isBoss: () => false, isWon: () => false, isOv: () => false, getSnap: () => true, setSnap() {}, allParts: () => true, onChange() {}, levelId: lid, getBuildUx: () => true, getSwapSteel: () => swap, getStrength: () => 0.12 }); return { bm, log, toasts }; };
  const adv = (bm, n = 6000, dt = 1 / 60) => { for (let i = 0; i < n && bm.running; i++) bm.update(dt, true); };
  const run = async (LV, lid, siteId, label) => {
    const { bm, log, toasts } = mkBm(true, LV, lid); bm.update(0.016, true); assert.ok(bm.open(siteId, { force: true }), label); assert.ok(bm.grid.toggle() || bm.grid.on, 'rutenett-modus');
    // et svakt bygg av tre (eksempelfagverket i tre) som kan feile: finn en feilende variant ved å fjerne til den feiler
    const site = JSON.parse(JSON.stringify(LV.build.sites.find((q) => q.id === siteId)));
    for (const [side, top] of [['wood', 'wood'], ['rope', 'wood'], ['wood', 'rope']]) {
      const g = EX.exampleGrid(site, 6.5, { top, side }); if (process.env.DBG) console.log(label, 'grid', !!g); if (!g) continue; const B = BL.createBuild(site, {}, []); B.gridDeck = true; G.setMode(B, 'grid'); B.rg = g; G.derive(B);
      const code = G.gridExport(B); if (!code) continue;
      assert.ok(bm.importText(code), 'importerer'); assert.ok(bm.startTry()); adv(bm); const res = bm.result;
      if (process.env.DBG) console.log(label, side, top, res.state, res.reason); if (res.state !== 'lost') { bm.stopTry(); continue; }
      // feilet: hint finnes og peker på en stav av tre/tau
      const h = bm.swp.hint; assert.ok(h, `${label}: hint etter feilet prøve (${side}/${top})`); const info = bm.grid.info(), r = info.rods.find((q) => q.id === h.id); assert.ok(r && r.mat !== 'steel' && !r.deck, 'hintet peker på en stav som kan byttes');
      assert.ok(log.some(([t, d]) => t === 'bygg' && new RegExp(`^belastningshint: stav ${h.id} \\d+ %`).test(d)), 'hintet logges');
      bm.stopTry(); assert.ok(bm.swp.hint, 'hintet står igjen etter at prøven er stoppet (tilbake i bygging)');
      const cost0 = bm.grid.info().cost, nSteel0 = bm.grid.info().steel;
      return { bm, log, toasts, h, cost0, nSteel0, label };
    }
    return null;
  };
  // Hyllebroen (bro1 i levels/bro) og et Bygglab-sted (lab4 i levels/bygglab): samme kode
  const bro = lvl('bro'); P.ensurePlayGrid(bro.build.sites); const lab = lvl('bygglab'); P.ensurePlayGrid(lab.build.sites);
  const a = await run(bro, 'bro', bro.build.sites[0].id, 'Hyllebroen');
  assert.ok(a, 'Hyllebroen: en svak tre-bro feiler og gir hint');
  const labSite = lab.build.sites.find((q) => q.lab && q.lab.key === 'fagverk') || lab.build.sites.find((q) => G.siteHasGrid(q) && G.roadLevel(q) != null);
  const b = await run(lab, 'bygglab', labSite.id, 'Byggeskolen');
  assert.ok(b, 'Byggeskolen: en svak tre-bro feiler og gir hint');
  for (const x of [a, b]) {
    const { bm, log, h, cost0, nSteel0 } = x; assert.ok(bm.grid.on);
    // trykk på staven (velg), så bytt
    const info = bm.grid.info(), r = info.rods.find((q) => q.id === h.id), na = info.nodes.find((q) => q.id === r.a), nb = info.nodes.find((q) => q.id === r.b), pt = (f) => bm.screenPos(na.u + (nb.u - na.u) * f, na.v + (nb.v - na.v) * f);
    for (const f of [0.5, 0.3, 0.7, 0.4, 0.6, 0.25, 0.75]) { if (bm.grid.selRod === h.id) break; const p = pt(f); bm.grid.tap(p.x, p.y); if (process.env.DBG) console.log(x.label, f, JSON.stringify(p), bm.grid.selNode, bm.grid.selRod, bm.grid.info().rods.length); }
    /* utzoomet brett: staven er bare noen få piksler lang, så valget testes i Playwright (tools/live_gridswap.cjs) */
    assert.equal(bm.swp.swap(h.id), true, x.label + ': ett trykk bytter'); const i2 = bm.grid.info(); assert.equal(i2.rods.find((q) => q.id === h.id).mat, 'steel'); assert.equal(i2.steel, nSteel0 + 1); assert.ok(i2.cost > cost0, 'kostnaden økte');
    assert.equal(bm.swp.hint, null, 'hintet er borte etter bytte'); assert.ok(log.some(([t, d]) => t === 'bygg' && new RegExp(`^bytt til stål: stav ${h.id} (wood|rope) → steel`).test(d)), 'bytte logges');
  }
  // valget av: ingen bytte, ingen hint
  const off = mkBm(false, bro, 'bro'); off.bm.update(0.016, true); off.bm.open(bro.build.sites[0].id, { force: true }); off.bm.grid.toggle(); assert.equal(off.bm.swp.active(), false, 'valget av: hjelpen er ikke aktiv'); assert.equal(off.bm.swp.swap('st1'), false);
}
console.log('test_gridswap: ok');
