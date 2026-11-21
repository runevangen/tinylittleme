// node test_gridmirror.mjs: R121, speiling og kopi i Rutenett (grid_mirror.js, grid_mirror_view.js): symmetri, grenser, budsjett, ANGRE i ett steg, kopi uten duplikater, tekster, filer og ⚙-valg,
// og byggeskjermen mot en DOM-stubb. Ekte berøring og bilder: tools/live_gridmirror.cjs.
import fs from 'node:fs';
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const M = await import('./grid_mirror.js'), BL = await import('./build_logic.js'), G = await import('./grid_logic.js'), P = await import('./grid_play.js'), I18 = await import('./i18n.js'), BB = await import('./build_budget.js');
const lvl = (n) => JSON.parse(fs.readFileSync(new URL(`./levels/${n}.level.json`, import.meta.url), 'utf8'));
const mkSite = (site, deck = false) => { const B = BL.createBuild(JSON.parse(JSON.stringify(site)), {}, []); B.gridDeck = deck; G.setMode(B, 'grid'); B.gridMaxLen = 6.5; return B; };
const wide = { id: 'w', w: 30, h: 14, anchors: [{ u: -8, v: 0 }, { u: 8, v: 0 }], deck: [{ u0: -14, u1: -8 }, { u0: 8, u1: 14 }], start: { u: -12, v: 0 }, goal: { u: 12, v: 0 }, grid: { step: 2 } };
const snap = (B) => JSON.stringify(B.rg);
const rod = (B, a, b, mat = 'wood') => { const r = G.gAddRod(B, a, b, mat); assert.ok(r.ok, `stav ${a}-${b}: ${r.why}`); return r.rod; };
const nd = (B, u, v) => { const r = G.gAddNode(B, u, v); assert.ok(r.ok); return r.node.id; };

// ---------- 1) midtlinje ----------
{
  assert.equal(M.mirrorAxis(wide), 0); assert.equal(M.mirrorAxis({ ...wide, anchors: [{ u: -8, v: 0 }, { u: 4, v: 0 }] }), -2); assert.equal(M.mirrorAxis({ ...wide, anchors: [{ u: 1, v: 0 }] }), null);
  const L = lvl('bro'); P.ensurePlayGrid(L.build.sites); assert.equal(M.mirrorAxis(L.build.sites[0]), 0, 'Hyllebroen: ankrene -3,5 og 3,5');
  const lab = lvl('bygglab'); P.ensurePlayGrid(lab.build.sites); for (const s of lab.build.sites) if (G.siteHasGrid(s) && G.roadLevel(s) != null) assert.ok(M.mirrorAxis(s) != null, 'Byggeskole ' + s.lab.key);
}
// ---------- 2) speiling: symmetri, ett ANGRE-steg, SNU, allerede symmetrisk ----------
{
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let t = 0; t < 40; t++) {
    const B = mkSite(wide, t % 2 === 0), pts = G.latticePoints(wide).filter((p) => p.u <= 0.001), mats = ['wood', 'steel', 'rope']; let cur = ['a1']; let made = 0;
    for (let i = 0; i < 12; i++) { const from = cur[Math.floor(rnd() * cur.length)], p = pts[Math.floor(rnd() * pts.length)], r = G.gAddRodTo(B, from, p.u, p.v, mats[Math.floor(rnd() * 3)]); if (r.ok) { made++; cur.push(r.node ? r.node.id : G.nodeAt(B.rg, p.u, p.v).id); } }
    if (!made) continue;
    const before = snap(B), h0 = B.history.length, cost0 = M.gridCost(B, B.rg);
    const pl = M.mirrorPlan(B, 'add'); assert.equal(snap(B), before, 'planen endrer ikke bygget');
    if (!pl.ok) { assert.ok(['sym', 'over', 'out', 'max'].includes(pl.why), pl.why); continue; }
    const r = M.gMirror(B, 'add'); assert.ok(r.ok); globalThis.__n = (globalThis.__n || 0) + 1; assert.equal(B.history.length, h0 + 1, 'ett ANGRE-steg'); assert.ok(M.isSymmetric(B), 'symmetrisk etter speiling');
    const seen = new Set(); for (const q of B.rg.rods) { const k = [q.a, q.b].sort().join('-'); assert.ok(!seen.has(k), 'ingen duplikater'); seen.add(k); assert.ok(G.rodLen(B.rg, q) <= 6.5 + 1e-6); }
    assert.equal(B.placed.length, B.rg.rods.length, 'B.placed følger'); assert.ok(M.gridCost(B, B.rg) >= cost0);
    assert.equal(M.gMirror(B, 'add').why, 'sym', 'en gang til: allerede symmetrisk'); assert.equal(B.history.length, h0 + 1, 'avvist speiling skriver ingen historikk');
    G.gUndo(B); assert.equal(snap(B), before, 'ANGRE tar hele speilingen'); assert.equal(B.history.length, h0);
  }
  const B = mkSite(wide); nd(B, -4, 2); rod(B, 'a1', 'kn1'); const h = B.history.length, n0 = B.rg.nodes.length;
  const f = M.gMirror(B, 'flip'); assert.ok(f.ok && B.rg.rods.length === 1 && B.history.length === h + 1, 'SNU: bygget byttes'); const k = B.rg.nodes.find((n) => !n.fixed); assert.ok(k && k.u === 4 && k.v === 2, 'knuten står speilet'); assert.equal(B.rg.nodes.length, n0);
  const r2 = G.gAddRodTo(B, B.rg.nodes.find((n) => n.id === 'a1').id, -4, 2, 'wood'); assert.ok(r2.ok); assert.ok(M.isSymmetric(B), 'etter SNU + speilbildet for hånd er bygget symmetrisk'); assert.equal(M.gMirror(B, 'add').why, 'sym');
  assert.equal(M.gMirror(mkSite(wide), 'add').why, 'empty', 'tomt bygg');
}
assert.ok(globalThis.__n >= 10, 'minst ti tilfeldige bygg speilet: ' + globalThis.__n);
// ---------- 3) grenser: utenfor, anker, budsjett ----------
{
  const site = { id: 's', w: 20, h: 14, anchors: [{ u: -8, v: 0 }, { u: 4, v: 0 }], start: { u: -9, v: 0 }, goal: { u: 9, v: 0 }, grid: { step: 2 } };
  const B = mkSite(site); const a2 = B.rg.nodes.find((n) => n.u === 4).id; G.gAddRodTo(B, a2, 8, 2, 'wood'); const before = snap(B), h = B.history.length;
  assert.equal(M.gMirror(B, 'add').why, 'out', 'speilbildet havner utenfor området'); assert.equal(snap(B), before); assert.equal(B.history.length, h, 'ingenting gjort, ingen historikk');
  const s2 = { ...site, anchors: [{ u: -8, v: 0 }, { u: 8, v: 4 }] }, C = mkSite(s2); const c2 = C.rg.nodes.find((n) => n.u === 8).id; G.gAddRodTo(C, c2, 8, 0, 'wood');
  assert.equal(M.mirrorPlan(C, 'add').why, 'anchor', 'en knute som havner på et anker');
  const D = mkSite(wide); nd(D, -4, 2); nd(D, -6, 4); rod(D, 'a1', 'kn1', 'steel'); rod(D, 'kn1', 'kn2', 'steel'); const cost = M.gridCost(D, D.rg);
  assert.equal(M.gMirror(D, 'add', cost + 1).why, 'budget', 'over budsjettet: nektes'); assert.equal(D.rg.rods.length, 2); assert.ok(M.gMirror(D, 'add', cost * 2 + 0.01).ok, 'innenfor budsjettet'); assert.ok(M.gMirror(mkSite(wide), 'add').why === 'empty');
  const E = mkSite(wide); nd(E, -4, 2); rod(E, 'a1', 'kn1', 'steel'); assert.ok(M.gMirror(E, 'flip', M.gridCost(E, E.rg)).ok, 'SNU endrer ikke prisen');
  const cc = M.mirrorPlan(D, 'flip', 0.0001); void cc;
}
// ---------- 4) utvalg og kopi ----------
{
  const B = mkSite(wide); nd(B, -4, 0); nd(B, 0, 0); nd(B, -2, 2); const r1 = rod(B, 'kn1', 'kn2'), r2 = rod(B, 'kn1', 'kn3'), r3 = rod(B, 'kn2', 'kn3');
  const tri = M.selectField(B.rg, null, r1.id); assert.deepEqual([...tri.rods].sort(), [r1.id, r2.id, r3.id].sort(), 'en stav i en trekant gir trekanten'); assert.equal(tri.nodes.length, 3);
  const single = mkSite(wide); nd(single, -4, 0); nd(single, 0, 0); const sr = rod(single, 'kn1', 'kn2'); assert.deepEqual(M.selectField(single.rg, null, sr.id).rods, [sr.id], 'uten trekant: bare staven');
  assert.equal(M.selectField(B.rg, 'a2'), null, 'ankeret uten staver gir ingenting'); assert.equal(M.selectField(B.rg, null, 'finnes_ikke'), null);
  const h = B.history.length, before = snap(B);
  const pl = M.copyPlan(B, tri, 4, 0); assert.ok(pl.ok && pl.rods === 3 && pl.nodes === 2, 'kopi to felt til høyre: tre staver, to nye knuter (en festes til eksisterende)'); assert.equal(snap(B), before);
  assert.equal(pl.shape.rods.length, 3, 'spøkelset har alle stavene');
  const r = M.gCopy(B, tri, 4, 0); assert.ok(r.ok); assert.equal(B.history.length, h + 1, 'ett ANGRE-steg'); assert.equal(B.rg.rods.length, 6); assert.equal(B.rg.nodes.filter((n) => !n.fixed).length, 5, 'ingen dupliserte knuter');
  const seen = new Set(); for (const q of B.rg.rods) { const k = [q.a, q.b].sort().join('-'); assert.ok(!seen.has(k), 'ingen duplikater'); seen.add(k); }
  assert.equal(M.gCopy(B, tri, 4, 0).why, 'dup', 'samme kopi en gang til: finnes allerede'); assert.equal(M.copyPlan(B, tri, 0, 0).why, 'same'); assert.equal(B.history.length, h + 1);
  G.gUndo(B); assert.equal(snap(B), before, 'ANGRE tar hele kopien');
  assert.equal(M.copyPlan(B, tri, 40, 0).why, 'out', 'utenfor området'); assert.equal(M.copyPlan(B, tri, 0, 40).why, 'out');
  const cost = M.gridCost(B, B.rg); assert.equal(M.copyPlan(B, tri, 4, 0, cost + 0.5).why, 'budget', 'over budsjettet'); assert.ok(M.copyPlan(B, tri, 4, 0, cost + 100).ok);
  const so = M.startOffset(B, tri); assert.ok(M.copyPlan(B, tri, so.du, so.dv).ok, 'startstedet er lovlig');
  // overlapp: en kopi én rute til høyre deler knuter og hopper over det som finnes
  const ov = M.copyPlan(B, tri, 2, 0); assert.ok(ov.ok || ['over', 'dup'].includes(ov.why));
  // maks 12 staver fra en knute
  const L = mkSite({ ...wide, w: 80, anchors: [{ u: -30, v: 0 }, { u: 30, v: 0 }], grid: { step: 2 } }); let prev = 'a1'; for (let i = 0; i < 15; i++) { const r = G.gAddRodTo(L, prev, -30 + 2 * (i + 1), (i % 2) * 2, 'wood'); assert.ok(r.ok, 'lenke ' + i); prev = r.node.id; }
  const big = M.selectField(L.rg, 'a1'); assert.equal(big.rods.length, M.COPY_MAX, 'opptil 12 staver'); assert.equal(M.COPY_MAX, 12);
  // ankre: kopi av en stav fra ankeret gir en vanlig knute i kopien, ikke et nytt anker
  const A = mkSite(wide); const q = G.gAddRodTo(A, 'a1', -6, 2, 'wood'); assert.ok(q.ok); const sA = M.selectField(A.rg, null, q.rod.id); const cp = M.gCopy(A, sA, 4, 0); assert.ok(cp.ok && A.rg.nodes.filter((n) => n.fixed).length === 2, 'ankrene er uendret');
}
// ---------- 5) tekster, filer, ⚙ og logg ----------
{
  const T = I18.makeT(() => 'nb').T, En = I18.makeT(() => 'en').T, keys = [...I18.DICT_KEYS.nb].filter((k) => k.startsWith('mir.'));
  assert.ok(keys.length >= 25); for (const k of keys) { assert.ok(I18.DICT_KEYS.en.has ? I18.DICT_KEYS.en.has(k) : true, 'engelsk: ' + k); const t = T(k, { n: 3, cost: 4 }) + ' ' + En(k, { n: 3, cost: 4 }); assert.ok(!/\bklikk\b|\btast\b|\bpress\b/i.test(t), 'ingen taster i ' + k); assert.ok(!/\{[a-z]+\}/.test(t), 'plassholder fylt i ' + k); }
  assert.equal(T('mir.add'), 'SPEIL OG LEGG TIL'); assert.equal(T('mir.flip'), 'SNU'); assert.equal(T('mir.copy'), 'KOPIER');
  const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8'); assert.ok(/'grid_mirror'/.test(html) && /'grid_mirror_view'/.test(html), 'modulene ligger i files i index.html');
  const main = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8'); assert.match(main, /fl\('buildmirror', 'spill'/, 'SETTINGS: buildmirror i gruppen spill'); assert.match(main, /tlm\.buildmirror', true/, 'standard på'); assert.match(main, /logEv\('bygg', v \? 'speil\/kopi på'/);
  const bj = fs.readFileSync(new URL('./build.js', import.meta.url), 'utf8'); assert.match(bj, /getMirror = \(\) => true/); assert.match(bj, /getMirror: \(\) => getMirror\(\)/);
  const v = fs.readFileSync(new URL('./grid_mirror_view.js', import.meta.url), 'utf8'); assert.match(v, /logEv\('bygg', `speil /); assert.match(v, /logEv\('bygg', `kopi/);
  assert.match(fs.readFileSync(new URL('./docs/INNSTILLINGER.md', import.meta.url), 'utf8'), /tlm\.buildmirror/); assert.match(fs.readFileSync(new URL('./changes_data.js', import.meta.url), 'utf8'), /r121-speil-kopi/);
  const bv = fs.readFileSync(new URL('./buildux_view.js', import.meta.url), 'utf8'); assert.match(bv, /mirrorSheetMarkup\(\)/, 'ark-delen er med i den delte byggeskjermen (broene og Byggeskolen)');
  const css = (await import('./grid_mirror_view.js')).mirrorCss(); assert.ok(css.includes('.bxcopy{height:44px'), 'trykkflate minst 44 px');
}
// ---------- 6) byggeskjermen mot en DOM-stubb: valget styrer om knappene finnes ----------
{
  const mkEl = () => { const el = { style: {}, dataset: {}, children: [], _l: {}, _html: '', classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, f) { f ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } }, appendChild(c) { this.children.push(c); return c; }, addEventListener(t, f) { (this._l[t] ||= []).push(f); }, removeEventListener() {}, setPointerCapture() {}, releasePointerCapture() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844 }), closest: () => null, remove() {}, getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) }), querySelector: () => mkEl(), querySelectorAll: () => [], set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; }, width: 0, height: 0 }; return el; };
  const body = mkEl(); globalThis.document = { body, createElement: mkEl, head: mkEl(), getElementById: () => null, querySelector: () => mkEl() };
  globalThis.window = globalThis; globalThis.innerWidth = 390; globalThis.innerHeight = 844; globalThis.devicePixelRatio = 2; globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; globalThis.requestAnimationFrame = () => 0;
  const { createBuildMode } = await import('./build.js');
  const L = lvl('bro'), player = { x: 0, y: 2, z: 0, onGround: true, state: 'ground' }; const log = [], toasts = [];
  const mkBm = (mirror, lid = 'bro', LV = L) => createBuildMode({ scene: { add() {}, remove() {} }, LEVEL: JSON.parse(JSON.stringify(LV)), player, $: () => mkEl(), T: (k) => k, logEv: (t, d) => log.push([t, d]), toast: (m) => toasts.push(m), TOUCH: true, buzz() {}, audio: {}, isPlay: () => true, isMenu: () => false, isBoss: () => false, isWon: () => false, isOv: () => false, getSnap: () => true, setSnap() {}, allParts: () => false, onChange() {}, levelId: lid, getBuildUx: () => true, getMirror: () => mirror });
  const on = mkBm(true); on.update(0.016, true); assert.ok(on.open('bro1', { force: true })); assert.ok(on.bux.on() && on.bux.mir.avail(), 'Hyllebroen: speil/kopi finnes');
  assert.equal(on.bux.mir.mirror('add'), false); assert.ok(toasts.includes('mir.err.empty'), 'tomt bygg: tydelig tekst'); assert.ok(log.some(([t, d]) => t === 'bygg' && /speil avvist/.test(d)), 'avvisning logges');
  on.close('t'); const off = mkBm(false); off.update(0.016, true); assert.ok(off.open('bro1', { force: true })); assert.ok(off.bux.on() && !off.bux.mir.avail(), 'valget av: ingen speil/kopi');
  assert.equal(off.bux.mir.mirror('add'), false); assert.equal(off.bux.mir.copyStart(), false);
  off.close('t'); const lab = lvl('bygglab'), bl = mkBm(true, 'bygglab', lab); bl.update(0.016, true); assert.ok(bl.open('lab1', { force: true })); assert.ok(bl.bux.on() && bl.bux.mir.avail(), 'Byggeskolen (Bygglab): samme kode, samme funksjon');
}
console.log('test_gridmirror: ok');
