// node test_buildux.mjs: R92, forenklet byggeskjerm (prototype bak ⚙-valget `buildux`): ren logikk (buildux_logic.js), tekster (knapper, ingen taster), filer og ⚙-valg,
// og byggeskjermen mot en DOM-stubb (valget av: ingenting endres). Ekte berøring og bilder: tools/live_buildux.cjs.
import fs from 'node:fs';
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const X = await import('./buildux_logic.js'), BL = await import('./build_logic.js'), G = await import('./grid_logic.js'), BM = await import('./build_materials.js'), P = await import('./grid_play.js'), I18 = await import('./i18n.js');
const lvl = (n) => JSON.parse(fs.readFileSync(new URL(`./levels/${n}.level.json`, import.meta.url), 'utf8'));
const mk = (n, sid) => { const L = lvl(n); P.ensurePlayGrid(L.build.sites); const site = L.build.sites.find((s) => s.id === sid), B = BL.createBuild(JSON.parse(JSON.stringify(site)), {}, []); B.gridDeck = false; G.setMode(B, 'grid'); return { L, site: B.site, B }; };

// ---------- 1) hvilke steder ----------
{
  const bro = mk('bro', 'bro1'), kb = mk('kjokkenbro', 'kjokken1'), lab = lvl('bygglab').build.sites;
  assert.ok(X.buxSite({ levelId: 'bro', site: bro.site }) && X.buxSite({ levelId: 'kjokkenbro', site: kb.site }), 'bro og kjokkenbro');
  assert.ok(!X.buxSite({ levelId: 'kjokkenbro', site: bro.site }) && !X.buxSite({ levelId: 'bro', site: null }), 'riktig brett og sted');
  const yes = lab.filter((s) => X.buxSite({ levelId: 'bygglab', site: s })).map((s) => s.lab.key);
  assert.deepEqual(yes, ['bro', 'fagverk'], 'Bygglab: bare «bro» og «fagverk»');
  for (const n of ['leke', 'stue', 'trapp', 'vippe', 'verksted', 'kontroll']) { const L = lvl(n); P.ensurePlayGrid(L.build.sites); assert.ok(L.build.sites.every((s) => !X.buxSite({ levelId: n, site: s })), n + ' får ikke skjermen'); }
  assert.equal(X.buxWanted({ on: false, levelId: 'bro', site: bro.site }), false, 'valget av: aldri'); assert.equal(X.buxWanted({ on: true, levelId: 'bro', site: bro.site }), true);
}

// ---------- 2) snapping ----------
{
  const { site, B } = mk('bro', 'bro1'), Gd = B.rg, sc = 44 / G.gridStep(site), st = G.gridStep(site);
  const a1 = Gd.nodes.find((n) => n.id === 'a1');
  let t = X.resolveTarget(site, Gd, a1.u + 0.1 * st, a1.v + 0.1 * st, sc); assert.equal(t.kind, 'node'); assert.equal(t.node.id, 'a1', 'snapper til nær knute');
  t = X.resolveTarget(site, Gd, a1.u + st + 0.1, a1.v + st - 0.05, sc, 'a1'); assert.equal(t.kind, 'point'); assert.ok(Math.abs(t.u - (a1.u + st)) < 1e-6, 'snapper til nærmeste rutenettpunkt');
  t = X.resolveTarget(site, Gd, a1.u + 0.05, a1.v + 0.05, sc, 'a1'); assert.equal(t.kind, 'self', 'fingeren er over startknuten');
  assert.equal(X.resolveTarget(site, Gd, 1000, 1000, sc), null, 'ingenting nær');
  const n2 = G.gAddNode(B, a1.u + st, a1.v).node; t = X.resolveTarget(site, Gd, n2.u + 0.05, n2.v, sc, 'a1'); assert.equal(t.kind, 'node'); assert.equal(t.node.id, n2.id, 'eksisterende knute foretrekkes');
}
// ---------- 3) spøkelsesstav: lengde, pris, lovlig/ulovlig ----------
{
  const { site, B } = mk('bro', 'bro1'), Gd = B.rg, sc = 44 / G.gridStep(site), st = G.gridStep(site), a1 = Gd.nodes.find((n) => n.id === 'a1');
  let g = X.ghostOf(B, 'a1', X.resolveTarget(site, Gd, a1.u + st, a1.v + st, sc, 'a1'), 'wood');
  assert.ok(g.show && g.ok && g.newNode && Math.abs(g.len - Math.hypot(st, st)) < 1e-9 && g.cost === BM.rodPrice('wood', g.len), JSON.stringify(g));
  g = X.ghostOf(B, 'a1', X.resolveTarget(site, Gd, a1.u + st, a1.v + st, sc, 'a1'), 'steel'); assert.equal(g.cost, BM.rodPrice('steel', g.len), 'pris følger materialet'); assert.ok(g.cost >= BM.rodPrice('wood', g.len));
  g = X.ghostOf(B, 'a1', X.resolveTarget(site, Gd, a1.u + 5 * st, a1.v + st, sc, 'a1'), 'wood'); assert.ok(g.show && !g.ok && g.why === 'far', 'for lang: rød, ' + JSON.stringify(g));
  assert.equal(Gd.nodes.length, 2, 'spøkelset legger ikke igjen noe midlertidig');
  g = X.ghostOf(B, 'a1', X.resolveTarget(site, Gd, a1.u + 0.05, a1.v, sc, 'a1'), 'wood'); assert.ok(!g.show && g.why === 'same', 'ingen stav til seg selv');
  g = X.ghostOf(B, 'a1', null, 'wood'); assert.ok(!g.show); assert.ok(!X.ghostOf(B, 'a1', { kind: 'point', u: 0, v: 0 }, 'plast').show, 'ukjent materiale');
  // staven som er lovlig i spøkelset legges også inn (samme regler som gAddRodTo/gAddRod)
  const n = G.gAddNode(B, a1.u + st, a1.v).node; G.gAddRod(B, 'a1', n.id, 'wood');
  g = X.ghostOf(B, 'a1', X.resolveTarget(site, Gd, n.u, n.v, sc, 'a1'), 'wood'); assert.ok(g.show && !g.ok && g.why === 'dup', 'dobbel stav er rød');
  const tg = X.resolveTarget(site, Gd, a1.u + st, a1.v + st, sc, 'a1'), gh = X.ghostOf(B, 'a1', tg, 'wood'), r = G.gAddRodTo(B, 'a1', tg.u, tg.v, 'wood'); assert.ok(gh.ok === r.ok && Math.abs(gh.len - r.len) < 1e-9 && gh.cost === r.cost, 'spøkelse og fest er enige');
}
// ---------- 4) slette-boble, treff, flytt ----------
{
  const { site, B } = mk('bro', 'bro1'), Gd = B.rg, st = G.gridStep(site), sc = 44 / st;
  const n1 = G.gAddNode(B, -3.5 + st, 0).node, r1 = G.gAddRod(B, 'a1', n1.id, 'wood').rod;
  assert.equal(X.deletable(Gd, 'a1', null), null, 'ankre kan ikke slettes: ingen boble'); assert.deepEqual(X.deletable(Gd, n1.id, null), { kind: 'node', id: n1.id }); assert.deepEqual(X.deletable(Gd, null, r1.id), { kind: 'rod', id: r1.id });
  assert.equal(X.deletable(Gd, null, null), null); assert.equal(X.deletable(null, 'a1', null), null);
  const a = X.bubbleAnchor(Gd, { kind: 'rod', id: r1.id }); assert.ok(Math.abs(a.u - (-3.5 + st / 2)) < 1e-9 && a.v === 0, 'midt på staven'); assert.deepEqual(X.bubbleAnchor(Gd, { kind: 'node', id: n1.id }), { u: n1.u, v: n1.v }); assert.equal(X.bubbleAnchor(Gd, null), null);
  assert.ok(X.BUX.bubblePx >= 48, 'boblen er minst 48 px'); assert.ok(X.bubbleHit({ x: 100, y: 100, r: 26 }, 120, 100) && !X.bubbleHit({ x: 100, y: 100, r: 26 }, 140, 100) && !X.bubbleHit(null, 1, 1));
  assert.equal(X.pickAt(Gd, n1.u, n1.v, sc).kind, 'node'); assert.equal(X.pickAt(Gd, n1.u - st / 2, 0.02, 90 / st).kind, 'rod', 'midt på staven treffes (stav lenger enn 2 × 28 px)'); assert.equal(X.pickAt(Gd, 0, 5, sc).kind, 'empty');
  assert.equal(X.dragMeaning(n1, null), 'rod', 'dra fra en uvalgt knute = stav'); assert.equal(X.dragMeaning(n1, n1.id), 'move', 'dra en valgt knute = flytt'); assert.equal(X.dragMeaning(Gd.nodes[0], 'a1'), 'rod', 'ankre flyttes ikke');
  // flytt (grid_logic): staven følger
  const m = G.gMoveNode(B, n1.id, n1.u, n1.v + st); assert.ok(m.ok && m.moved && G.nodeOf(Gd, n1.id).v === st, 'knuten flyttes'); assert.equal(Gd.rods.length, 1, 'staven følger knuten');
  assert.ok(G.gRemoveNode(B, n1.id) && Gd.rods.length === 0, 'sletting av knute tar stavene med'); assert.ok(G.gUndo(B) && B.rg.rods.length === 1, 'ANGRE bringer den tilbake');
}
// ---------- 5) budsjett, materialer, tid til første bro, hånd ----------
{
  const { site } = mk('bro', 'bro1');
  const b = X.budgetOf({ site, cost: 3 }); assert.equal(b.budget, 6, 'to-stjerners-grensen'); assert.ok(!b.over && b.ratio === 0.5); assert.ok(X.budgetOf({ site, cost: 9 }).over && X.budgetOf({ site, cost: 9 }).ratio === 1);
  assert.equal(X.budgetOf({ site, cost: 2, stageBudget: 8 }).budget, 8, 'oppdragets budsjett går foran');
  assert.deepEqual(X.BUX.mats.map((m) => m.id), BM.GRID_MATS, 'tre materialer'); for (const m of BM.GRID_MATS) { const i = X.matInfo(m); assert.equal(i.price, BM.GRID_MAT[m].price); assert.ok(i.strength >= 1 && i.strength <= 3 && i.icon); }
  assert.ok(X.matInfo('steel').strength > X.matInfo('wood').strength && X.matInfo('wood').strength > X.matInfo('rope').strength); assert.equal(X.strengthBars(2), '▮▮▯'); assert.equal(X.COMMA(1.5), '1,5');
  const T = X.createTimer(); X.timerOpen(T, 10); X.timerOpen(T, 99); assert.equal(T.t0, 10, 'starter én gang'); assert.deepEqual(X.timerRod(T, 14), { first: true, secs: 4 }); assert.equal(X.timerRod(T, 20).first, false); assert.equal(X.timerTry(T), 1);
  const w = X.timerWin(T, 70); assert.ok(w.first && w.secs === 60 && w.tries === 1 && w.rods === 2); assert.equal(X.timerWin(T, 99).first, false, 'første bro måles bare én gang');
  assert.equal(X.shouldShowHand({ seen: false, hint: true }), true); for (const o of [{ seen: true }, { hint: false }, { guideOn: false }, { wanted: false }]) assert.equal(X.shouldShowHand({ seen: false, hint: true, ...o }), false, JSON.stringify(o));
  const h0 = X.handAt(0, { x: 0, y: 0 }, { x: 100, y: 0 }), h1 = X.handAt(X.BUX.handSecs * 0.5, { x: 0, y: 0 }, { x: 100, y: 0 }), h2 = X.handAt(X.BUX.handSecs, { x: 0, y: 0 }, { x: 100, y: 0 });
  assert.ok(h0.x === 0 && h1.x > 0 && h1.x < 100 && h2.x === 100 && h2.done && !h0.done, 'hånden dras fra punktet'); assert.ok(X.BUX.handSecs >= 2 && X.BUX.handSecs <= 3, '2–3 sekunder');
  const { B } = mk('bro', 'bro1'); const hp = X.handPath(site, B.rg); assert.ok(hp && hp.a.u === -3.5 && G.nearestPoint(site, hp.b.u, hp.b.v), 'banen går fra første anker til et rutenettpunkt');
  assert.equal(X.BUX.controls.build.length, 7, 'sju knapper i byggetilstand (+ ⚑ = 8)'); assert.ok(X.BUX.controls.build.length + 1 <= 9 && X.BUX.controls.sim.length <= 6);
}
// ---------- 6) tekster, filer og ⚙ ----------
{
  const T = I18.makeT(() => 'nb').T, En = I18.makeT(() => 'en').T, keys = [...I18.DICT_KEYS.nb].filter((k) => k.startsWith('bux.'));
  assert.ok(keys.length >= 15); for (const k of keys) { assert.ok(!/\bklikk\b|\btast\b|\bpress\b/i.test(T(k, { name: 'x', n: 1, of: 2, c: 1, budget: 2 }) + En(k, { name: 'x', n: 1, of: 2, c: 1, budget: 2 })), 'ingen taster i ' + k); }
  assert.match(T('bux.hint.start'), /Dra fra/); assert.match(T('bux.hint.node'), /✕/);
  const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8'); assert.ok(/'buildux_logic'/.test(html) && /'buildux_view'/.test(html), 'modulene ligger i files i index.html');
  const main = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8'); assert.match(main, /fl\('buildux', 'spill'/, 'SETTINGS: buildux i gruppen spill'); assert.match(main, /tlm\.buildux', false/, 'standard av'); assert.match(main, /logEv\('byggux'/, 'logEv byggux');
  const bj = fs.readFileSync(new URL('./build.js', import.meta.url), 'utf8'); assert.match(bj, /getBuildUx = \(\) => false/, 'valget er av som standard i byggeskjermen');
  const ch = fs.readFileSync(new URL('./changes_data.js', import.meta.url), 'utf8'); assert.match(ch, /r92-/, 'NYTT-rad finnes');
  const css = (await import('./buildux_view.js')).buxCss(); for (const k of ['.bux .bxgo button{height:56px', 'bxmat button{flex:0 0 auto;width:60px;height:60px', '.bxdel{position:absolute;display:none;width:52px;height:52px']) assert.ok(css.includes(k), 'trykkflater: ' + k);
}

// ---------- 7) byggeskjermen mot en DOM-stubb: valget av = ingenting endres ----------
{
  const mkEl = () => { const el = { style: {}, dataset: {}, children: [], _l: {}, _html: '', classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, f) { f ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } }, appendChild(c) { this.children.push(c); return c; }, addEventListener(t, f) { (this._l[t] ||= []).push(f); }, removeEventListener() {}, setPointerCapture() {}, releasePointerCapture() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844 }), closest: () => null, remove() {}, getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) }), querySelector: () => mkEl(), querySelectorAll: () => [], set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; }, width: 0, height: 0 }; return el; };
  const body = mkEl(); globalThis.document = { body, createElement: mkEl, head: mkEl(), getElementById: () => null, querySelector: () => mkEl() };
  globalThis.window = globalThis; globalThis.innerWidth = 390; globalThis.innerHeight = 844; globalThis.devicePixelRatio = 2; globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; globalThis.requestAnimationFrame = () => 0;
  const { createBuildMode } = await import('./build.js');
  const L = lvl('bro'), player = { x: 0, y: 2, z: 0, onGround: true, state: 'ground' }; const log = [];
  const mkBm = (on) => createBuildMode({ scene: { add() {}, remove() {} }, LEVEL: JSON.parse(JSON.stringify(L)), player, $: () => mkEl(), T: (k) => k, logEv: (t, d) => log.push([t, d]), toast() {}, TOUCH: true, buzz() {}, audio: {}, isPlay: () => true, isMenu: () => false, isBoss: () => false, isWon: () => false, isOv: () => false, getSnap: () => true, setSnap() {}, allParts: () => false, onChange() {}, levelId: 'bro', getBuildUx: () => on });
  const off = mkBm(false); off.update(0.016, true); assert.ok(off.open('bro1', { force: true })); assert.ok(!off.grid.on, 'valget av: klassisk modus er standard (ingen automatisk rutenett)'); assert.ok(!off.bux.on(), 'valget av: ingen ny skjerm'); assert.ok(!log.some(([t]) => t === 'byggux'), 'ingenting logges fra byggux når valget er av'); off.close('t');
  log.length = 0; const on = mkBm(true); on.update(0.016, true); assert.ok(on.open('bro1', { force: true })); assert.ok(on.grid.on, 'valget på: rutenett åpnes av seg selv'); assert.ok(on.bux.on(), 'valget på: ny skjerm'); assert.ok(log.some(([t, d]) => t === 'byggux' && /skjerm på bro1/.test(d)), 'logger at skjermen er på');
  on.close('t'); log.length = 0; const lab = createBuildMode({ scene: { add() {}, remove() {} }, LEVEL: JSON.parse(JSON.stringify(lvl('bygglab'))), player, $: () => mkEl(), T: (k) => k, logEv() {}, toast() {}, TOUCH: true, buzz() {}, audio: {}, isPlay: () => true, isMenu: () => false, isBoss: () => false, isWon: () => false, isOv: () => false, getSnap: () => true, setSnap() {}, allParts: () => false, onChange() {}, levelId: 'bygglab', getBuildUx: () => true });
  lab.update(0.016, true); assert.ok(lab.open('lab1', { force: true })); assert.ok(lab.bux.on(), 'Bygglab sted 1 (bro): ny skjerm'); lab.close('t'); assert.ok(lab.open('lab2', { force: true })); assert.ok(!lab.bux.on(), 'Bygglab sted 2 (trapp): dagens skjerm'); lab.close('t');
}
console.log('buildux-tester grønne');
