// node test_buildux_land.mjs: R93, liggende byggeskjerm (sidepaneler): ren logikk (buildux_land_logic.js: format, panelmål, sikre kanter, knapper, låser, veiledning, banner, mål),
// tekster og filer, og byggeskjermen mot en DOM-stubb i begge formater (snuing midt i bygging uten tap). Ekte berøring og bilder: tools/live_buildux_land.cjs.
import fs from 'node:fs';
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const X = await import('./buildux_land_logic.js'), BL = await import('./build_logic.js'), G = await import('./grid_logic.js'), P = await import('./grid_play.js'), I18 = await import('./i18n.js');
const lvl = (n) => JSON.parse(fs.readFileSync(new URL(`./levels/${n}.level.json`, import.meta.url), 'utf8'));
const mk = (n, sid) => { const L = lvl(n); P.ensurePlayGrid(L.build.sites); const site = L.build.sites.find((s) => s.id === sid), B = BL.createBuild(JSON.parse(JSON.stringify(site)), {}, []); B.gridDeck = false; G.setMode(B, 'grid'); return { L, site: B.site, B }; };

// ---------- 1) format og mål ----------
{
  assert.equal(X.orientOf(844, 390), 'land'); assert.equal(X.orientOf(390, 844), 'port'); assert.equal(X.orientOf(500, 500), 'port', 'kvadrat er ikke liggende');
  const m = X.landMetrics({ w: 844, h: 390 });
  assert.ok(m.pw >= 72 && m.pw <= 88, 'panel 72–88 px: ' + m.pw); assert.ok(m.btn >= 48 && m.tryW >= 48 && X.touchOk(m), 'trykkflater >= 48');
  assert.equal(m.left, m.pw); assert.equal(m.area.x0, m.left); assert.equal(m.area.x1, 844 - m.right); assert.equal(m.area.h, 390, 'byggeområdet har hele høyden'); assert.equal(m.area.y0, 0);
  for (const [w, h] of [[568, 320], [667, 375], [932, 430], [1024, 768], [1366, 1024]]) { const q = X.landMetrics({ w, h }); assert.ok(q.pw >= 72 && q.pw <= 88 && X.touchOk(q) && q.area.w > 0, `${w}×${h}`); }
  // sikre kanter: hakket (venstre) og hjemlinje (nederst) flytter innholdet
  const s = X.landMetrics({ w: 844, h: 390, insetL: 47, insetR: 47, insetB: 21 });
  assert.equal(s.left, s.pw + 47); assert.equal(s.right, s.pw + 47); assert.ok(s.leftX >= 47 && s.rightX >= 47, 'knappene inne i sikker kant'); assert.ok(s.botPx >= 27, 'nederst: sikker kant');
  assert.equal(X.centerShift(X.landMetrics({ w: 844, h: 390, insetL: 40 })), 20, 'byggeområdet sentreres mellom panelene'); assert.equal(X.centerShift(X.portMetrics({ w: 390, h: 844 })), 0);
  assert.equal(X.metricsOf({ w: 390, h: 844 }).orient, 'port'); assert.equal(X.metricsOf({ w: 844, h: 390 }).orient, 'land');
  assert.ok(X.portMetrics({ w: 390, h: 844 }).pw === 0, 'ingen paneler stående');
}
// ---------- 2) knapper ----------
{
  const b = X.landButtons({ sim: false }), s = X.landButtons({ sim: true });
  assert.deepEqual(b.left, ['back', 'more', 'undo']); assert.deepEqual(b.right, ['wood', 'steel', 'rope', 'try']); assert.ok(b.mats && b.undo);
  assert.deepEqual(s.right, ['slow', 'pause', 'try'], 'SLOW og PAUSE bare under prøven, rett over STOPP'); assert.ok(!s.mats && !s.undo); assert.deepEqual(s.left, ['back', 'more']);
  assert.equal(X.landTryLabel(false).icon, '▶'); assert.equal(X.landTryLabel(true).icon, '■'); assert.equal(X.landTryLabel(true).key, 'build.stop');
  assert.ok(X.matsTop(X.landMetrics({ w: 844, h: 390 })) >= X.LAND.flagReserve, 'materialene starter under ⚑');
}
// ---------- 3) materiallåser ----------
{
  const { site } = mk('bro', 'bro1'); assert.deepEqual(X.matLocks({ site }), {}, 'ingen steder har låst materiale i dag');
  const lk = X.matLocks({ site: { lockMats: { steel: { crumbs: 5 }, rope: { budget: 8 } } }, crumbs: 3, budget: 6 }); assert.equal(lk.steel.reason, 'crumbs'); assert.equal(lk.rope.reason, 'budget'); assert.equal(lk.steel.need, 5);
  assert.deepEqual(X.matLocks({ site: { lockMats: { steel: { crumbs: 5 } } }, crumbs: 5 }), {}, 'nok smuler: åpent');
  assert.equal(X.pickMat('steel', lk), 'wood', 'låst materiale velges ikke'); assert.equal(X.pickMat('wood', lk), 'wood');
  assert.equal(X.lockText(lk.steel).key, 'buxl.lock.crumbs'); assert.equal(X.lockText(lk.rope).key, 'buxl.lock.budget'); assert.equal(X.lockText(null), null);
}
// ---------- 4) veiledning, forslag, etiketter, banner ----------
{
  const { site, B } = mk('bro', 'bro1'), gl = X.guideLines(site, B.rg);
  assert.ok(gl && gl.deck.u0 < gl.deck.u1 && gl.cliffs.length === 2 && gl.start.u < gl.goal.u, 'ankerlinjer og flagg'); assert.equal(X.guideLines(site, { nodes: [] }), null);
  const n = G.gAddNode(B, 0, 0).node; G.gAddRod(B, 'a1', n.id, 'wood'); G.gAddRod(B, n.id, 'a2', 'wood');
  const t = X.nextTriangle(site, B); assert.ok(t && t.c.v > 0 && G.nearestPoint(site, t.c.u, t.c.v, 0.01), 'forslag: et gyldig punkt over broen: ' + JSON.stringify(t));
  const r = G.gAddRodTo(B, t.ids[0], t.c.u, t.c.v, 'wood'); assert.ok(r.ok, 'forslaget er en lovlig stav (' + (r.why || '') + ')');
  assert.ok(X.shouldSuggest({ suggest: true }) && !X.shouldSuggest({ suggest: false }), 'bare Nybegynner'); assert.ok(!X.shouldSuggest({ suggest: true, skipped: true }) && !X.shouldSuggest({ suggest: true, sim: true }) && !X.shouldSuggest({ suggest: true, guideOn: false }));
  assert.ok(X.shouldShowLabels({ labels: true, seen: false, land: true }) && !X.shouldShowLabels({ labels: false, seen: false, land: true }) && !X.shouldShowLabels({ labels: true, seen: true, land: true }) && !X.shouldShowLabels({ labels: true, seen: false, land: false }), 'etiketter: første gang, ikke Ekspert');
  assert.ok(X.shouldShowBanner({ orient: 'port', on: true, shown: false, dismissed: false })); for (const o of [{ orient: 'land' }, { on: false }, { shown: true }, { dismissed: true }]) assert.ok(!X.shouldShowBanner({ orient: 'port', on: true, shown: false, dismissed: false, ...o }), JSON.stringify(o));
}
// ---------- 5) logg og mål ----------
{
  const S = X.createOrientStats('port', 10); X.statsAct(S); X.statsAct(S); assert.equal(X.statsTurn(S, 'port'), null, 'samme format: ingen snuing');
  const t = X.statsTurn(S, 'land'); assert.deepEqual([t.from, t.to, t.turns, t.acts], ['port', 'land', 1, 2]); X.statsAct(S); X.statsTry(S);
  const w = X.statsWin(S, 70); assert.ok(w.first && w.secs === 60 && w.orient === 'land' && w.acts === 3 && w.actsPort === 2 && w.actsLand === 1 && w.tries === 1);
  assert.equal(X.statsWin(S, 99).first, false, 'første bro måles én gang'); assert.match(X.winText(w), /liggende.*60 s.*3 byggehandlinger/);
}
// ---------- 6) tekster, filer, ⚙, NYTT ----------
{
  const T = I18.makeT(() => 'nb').T, En = I18.makeT(() => 'en').T, keys = [...I18.DICT_KEYS.nb].filter((k) => k.startsWith('buxl.'));
  assert.ok(keys.length >= 6); for (const k of keys) { assert.ok(!/\bklikk\b|\btast\b|\bpress\b|\bkey\b/i.test(T(k, { n: 1 }) + En(k, { n: 1 })), 'ingen taster: ' + k); }
  assert.match(T('buxl.banner'), /Snu telefonen for mer plass/);
  const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8'); assert.ok(/'buildux_land_logic'/.test(html) && /'buildux_land_view'/.test(html), 'modulene ligger i files i index.html');
  const main = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8'); assert.match(main, /fl\('builduxland', 'spill'/, 'SETTINGS: builduxland'); assert.match(main, /tlm\.buildux\.land', true/, 'standard på');
  const ch = fs.readFileSync(new URL('./changes_data.js', import.meta.url), 'utf8'); assert.match(ch, /r93-/, 'NYTT-rad finnes');
  const css = (await import('./buildux_land_view.js')).landCss(); for (const k of ['.bxrail.l', '.bxrail.r', '.bxplate', 'env(safe-area-inset-left)', 'env(safe-area-inset-right)', '.bxmat button.locked', 'bxsp']) assert.ok(css.includes(k), 'CSS: ' + k);
}
// ---------- 7) byggeskjermen mot en DOM-stubb: snuing midt i bygging ----------
{
  const mkEl = () => { const el = { style: { setProperty() {} }, dataset: {}, children: [], _l: {}, _html: '', classList: { _s: new Set(), add(...c) { c.forEach((x) => this._s.add(x)); }, remove(...c) { c.forEach((x) => this._s.delete(x)); }, toggle(c, f) { f ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } }, appendChild(c) { this.children.push(c); return c; }, addEventListener(t, f) { (this._l[t] ||= []).push(f); }, removeEventListener() {}, setPointerCapture() {}, releasePointerCapture() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844 }), closest: () => null, remove() {}, setAttribute() {}, getAttribute: () => '', removeAttribute() {}, getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) }), querySelector: () => mkEl(), querySelectorAll: () => [], set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; }, width: 0, height: 0 }; return el; };
  globalThis.document = { body: mkEl(), createElement: mkEl, head: mkEl(), getElementById: () => null, querySelector: () => mkEl() };
  globalThis.window = globalThis; globalThis.innerWidth = 390; globalThis.innerHeight = 844; globalThis.devicePixelRatio = 2; globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
  const { createBuildMode } = await import('./build.js'), log = [];
  const L = lvl('bro'), player = { x: 0, y: 2, z: 0, onGround: true, state: 'ground' };
  const bm = createBuildMode({ scene: { add() {}, remove() {} }, LEVEL: JSON.parse(JSON.stringify(L)), player, $: () => mkEl(), T: (k) => k, logEv: (t, d) => log.push([t, d]), toast() {}, TOUCH: true, buzz() {}, audio: {}, isPlay: () => true, isMenu: () => false, isBoss: () => false, isWon: () => false, isOv: () => false, getSnap: () => true, setSnap() {}, allParts: () => false, onChange() {}, levelId: 'bro', getBuildUx: () => true, getBuxHelp: () => ({ labels: true, suggest: true }) });
  bm.update(0.016, true); assert.ok(bm.open('bro1', { force: true })); assert.ok(bm.bux.on(), 'valget på: ny skjerm');
  const px = (o) => { globalThis.innerWidth = o[0]; globalThis.innerHeight = o[1]; bm.bux.layout(); };
  px([390, 844]); assert.ok(!bm.bux.land.isLand() && bm.bux.insets().l === 0, 'stående: ingen sideinnrykk');
  const B = bm.grid.info(); const n = G.gAddNode; assert.ok(B.rods.length === 0);
  px([844, 390]); assert.ok(bm.bux.land.isLand(), 'liggende'); const m = bm.bux.land.cur; assert.ok(m.orient === 'land' && m.area.h === 390 && bm.bux.insets().l === m.left && bm.bux.insets().r === m.right, 'innrykk = panelene');
  assert.equal(bm.bux.topPx(), m.topPx); assert.equal(bm.bux.botPx(), m.botPx); assert.ok(log.some((l) => l[0] === 'byggux' && /liggende layout/.test(l[1])), 'logg: liggende layout');
  px([390, 844]); assert.ok(log.some((l) => l[0] === 'byggux' && /snudd til stående/.test(l[1])), 'logg: snuing'); assert.equal(bm.bux.insets().l, 0, 'stående igjen: ingen innrykk'); assert.ok(bm.bux.on() && bm.grid.on, 'skjermen og rutenettet består');
  bm.close('t');
  // valget av: ingenting nytt (ingen sidepaneler, ingen logg om liggende)
  log.length = 0; const off = createBuildMode({ scene: { add() {}, remove() {} }, LEVEL: JSON.parse(JSON.stringify(L)), player, $: () => mkEl(), T: (k) => k, logEv: (t, d) => log.push([t, d]), toast() {}, TOUCH: true, buzz() {}, audio: {}, isPlay: () => true, isMenu: () => false, isBoss: () => false, isWon: () => false, isOv: () => false, getSnap: () => true, setSnap() {}, allParts: () => false, onChange() {}, levelId: 'bro', getBuildUx: () => false });
  off.update(0.016, true); off.open('bro1', { force: true }); globalThis.innerWidth = 844; globalThis.innerHeight = 390; off.update(0.016, true); assert.ok(!off.bux.on() && !log.some((l) => /liggende|snudd|banner/.test(l[1])), 'valget av: dagens skjerm, urørt');
}
console.log('buildux-land-tester grønne');
