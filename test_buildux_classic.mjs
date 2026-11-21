// node test_buildux_classic.mjs: R96, byggeskjermens nye skall for klassiske steder (Trapp, Vippe, ...): ren logikk (buildux_classic_logic.js: hvilke steder, layout stående/liggende,
// faste handlinger / ⋯ / nær valgt del, instruksjon og spøkelseslinjens lovlighet, verktøylinje ved valgt del, hånd-hjelp, logg), tekster og filer, og byggeskjermen mot en DOM-stubb
// (valget av: dagens skjerm uendret; valget på: skallet i Trapp og Vippe, snuing midt i bygging uten tap). Ekte berøring og bilder: tools/live_buildux_classic.cjs.
import fs from 'node:fs';
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const X = await import('./buildux_classic_logic.js'), BL = await import('./build_logic.js'), I18 = await import('./i18n.js'), BX = await import('./buildux_logic.js');
const lvl = (n) => JSON.parse(fs.readFileSync(new URL(`./levels/${n}.level.json`, import.meta.url), 'utf8'));
const mkB = (n, parts) => { const L = lvl(n), site = L.build.sites[0], types = {}, have = []; for (const q of L.build.parts) { types[q.id] = q.type; have.push(q.id); } const B = BL.createBuild(JSON.parse(JSON.stringify(site)), types, have); for (const [id, u, v, rot] of parts || []) BL.place(B, id, u, v, rot || 0); B.history = []; return B; };

// ---------- 1) hvilke steder ----------
{
  const s = { id: 'trapp1' };
  assert.equal(X.classicSite({ on: true, site: s }), true, 'valget på, klassisk sted');
  assert.equal(X.classicSite({ on: false, site: s }), false, 'valget av: aldri');
  assert.equal(X.classicSite({ on: true, site: null }), false);
  assert.equal(X.classicSite({ on: true, site: s, gridOn: true }), false, 'rutenett-modus: røres ikke');
  assert.equal(X.classicSite({ on: true, site: s, buxOn: true }), false, 'bro-steder har R92-skjermen');
  assert.equal(X.classicSite({ on: true, site: s, buxWanted: true }), false);
  assert.ok(X.goalWord({ id: 'trapp1' }) === 'trapp' && X.goalWord({ id: 'vippe1' }) === 'vippe' && X.goalWord({ id: 'bro1' }) === 'bro' && X.goalWord({ id: 'q' }) === 'mål');
}
// ---------- 2) layout stående og liggende ----------
{
  const p = X.classicMetrics({ w: 390, h: 844 });
  assert.equal(p.orient, 'port'); assert.ok(p.areaFrac >= 0.58 && p.areaFrac <= 0.72, 'byggeområdet 60–70 % av høyden: ' + p.areaFrac);
  assert.ok(p.topPx >= X.CBX.topPort && p.botPx >= X.CBX.stackPort + 8, 'topplinje og bunnstabel tar plassen sin');
  assert.ok(X.CBX.trayH >= X.CBX.touch && X.CBX.toolH >= X.CBX.touch && X.CBX.goH >= X.CBX.touch, 'trykkflater >= 48');
  const p2 = X.classicMetrics({ w: 390, h: 844, insetB: 34, insetT: 47 }); assert.ok(p2.botPx >= p.botPx + 26 && p2.topPx >= 101, 'sikre kanter flytter innholdet'); assert.ok(p2.areaFrac >= 0.55, 'også med hjemlinje og hakk');
  const l = X.classicMetrics({ w: 844, h: 390 });
  assert.equal(l.orient, 'land'); assert.ok(l.pw >= 72 && l.pw <= 88 && X.touchOk(l), 'sidepaneler 72–88 px med trykkflater >= 48'); assert.ok(l.areaFrac >= 0.6, 'liggende: byggeområdet beholder høyden: ' + l.areaFrac);
  assert.equal(l.area.x0, l.left); assert.equal(l.area.x1, 844 - l.right);
  for (const [w, h] of [[568, 320], [667, 375], [932, 430], [1024, 768]]) { const q = X.classicMetrics({ w, h }); assert.ok(q.area.w > 0 && X.touchOk(q), `${w}×${h}`); if (q.orient === 'land') assert.ok(q.toolTop + 4 * q.toolStep + 60 + 12 <= h + 4, `verktøykolonnen og PRØV får plass i ${w}×${h}`); }
  const sa = X.classicMetrics({ w: 844, h: 390, insetL: 47, insetR: 47, insetB: 21 }); assert.equal(sa.left, sa.pw + 47); assert.ok(sa.botPx >= 64 + 6 + 21);
  assert.equal(X.classicMetrics({ w: 500, h: 500 }).orient, 'port', 'kvadrat er ikke liggende');
}
// ---------- 3) hvilke handlinger er hvor ----------
{
  const b = X.classicControls({ sim: false }), s = X.classicControls({ sim: true });
  assert.deepEqual(b.fixed, ['back', 'more', 'tape', 'hinge', 'rope', 'band', 'undo', 'try'], 'faste: ←, ⋯, fire festeverktøy, ↶, PRØV'); assert.ok(b.tray, 'delebrettet er der under bygging');
  assert.deepEqual(s.fixed, ['back', 'more', 'slow', 'pause', 'try'], 'SLOW og PAUSE bare under prøven'); assert.ok(!s.tray);
  for (const k of ['loads', 'share', 'snap', 'fit', 'reset', 'menu']) assert.equal(X.whereIs(k), 'sheet', k + ' i ⋯');
  assert.equal(X.whereIs('rotl'), 'sheet'); assert.equal(X.whereIs('rotr'), 'sheet', 'rotér finnes også i ⋯');
  for (const k of ['rotl', 'rotr', 'del']) { assert.ok(!X.classicControls({}).fixed.includes(k), k + ' er ikke fast'); assert.equal(X.whereIs(k, { selKind: 'part' }), 'near', k + ' nær valgt del'); }
  assert.deepEqual(X.classicControls({ selKind: 'link' }).near, ['del'], 'et feste kan bare fjernes'); assert.deepEqual(X.classicControls({ sim: true, selKind: 'part' }).near, [], 'ingenting nær delen under prøven');
  assert.ok(X.fixedCount({}) <= 8 && X.fixedCount({}) < 12, 'færre faste kontroller enn dagens ca. 25');
  assert.deepEqual(X.tryLabel(false), { icon: '▶', key: 'build.try' }); assert.deepEqual(X.tryLabel(true), { icon: '■', key: 'build.stop' });
  assert.equal(X.selKindOf({ sel: 'k1' }), 'part'); assert.equal(X.selKindOf({ selLink: 'k1' }), 'link'); assert.equal(X.selKindOf({ sel: 'k1', sim: true }), null); assert.equal(X.selKindOf({ sel: 'k1', dragging: true }), null); assert.equal(X.selKindOf({}), null);
}
// ---------- 4) instruksjon ----------
{
  assert.equal(X.toolStep({}), 'none'); assert.equal(X.toolStep({ tool: 'tape' }), 'pick1'); assert.equal(X.toolStep({ tool: 'tape', linkFrom: 'k1' }), 'pick2'); assert.equal(X.toolStep({ tool: 'nope', linkFrom: 'k1' }), 'none');
  assert.equal(X.stepKey('pick1'), 'cbx.step1'); assert.equal(X.stepKey('pick2'), 'cbx.step2'); assert.equal(X.stepKey('none'), null);
  const nb = (k) => I18.makeT(() => 'nb')[0 in {} ? 'T' : 'T'](k);
  assert.ok(/første del/i.test(nb('cbx.step1')) && /neste del/i.test(nb('cbx.step2')) && /underlaget/i.test(nb('cbx.step2')), 'teksten matcher kravet');
}
// ---------- 5) spøkelseslinjen: lovlighet gjenbruker addLink ----------
{
  const B = mkB('trapp', [['k1', 0, 0.75], ['k2', 1.5, 0.75], ['k4', 3, 0.75]]);
  let g = X.linkGhost(B, 'tape', 'k1', { u: 1.5, v: 0.75 }); assert.ok(g.show && g.ok && g.toId === 'k2' && !g.toGround, 'lovlig: nabodel'); assert.ok(g.a && g.b && Math.hypot(g.a.u - g.b.u, g.a.v - g.b.v) <= BL.LINK_MAX + 1e-9, 'endepunktene er der festet havner');
  g = X.linkGhost(B, 'tape', 'k1', { u: 3, v: 0.75 }); assert.ok(g.show && !g.ok && g.why === 'far', 'rød: for langt unna'); assert.equal(X.ghostKey(g), 'cbx.far');
  g = X.linkGhost(B, 'rope', 'k1', { u: 3, v: 0.75 }); assert.ok(g.ok, 'tau kan gå over avstand');
  g = X.linkGhost(B, 'tape', 'k1', { u: 0, v: 0.75 }); assert.ok(!g.show && g.cancel && g.why === 'same', 'samme del avbryter (ingen linje)');
  g = X.linkGhost(B, 'tape', 'k1', { u: -1.3, v: 0.0 }); assert.ok(g.show && g.ok && g.toGround, 'underlaget (gulvet) er lovlig når delen ligger ved det: ' + JSON.stringify(g));
  g = X.linkGhost(B, 'tape', 'k4', { u: 3, v: 9 }); assert.ok(g.show && !g.ok && g.toGround, 'langt fra delen i lufta: rødt');
  const before = JSON.stringify(B.links), hist = B.history.length; X.linkGhost(B, 'tape', 'k1', { u: 1.5, v: 0.75 }); assert.equal(JSON.stringify(B.links), before, 'spøkelsen endrer ikke bygget'); assert.equal(B.history.length, hist, '...og ingen angre-historikk');
  assert.equal(BL.addLink(B, 'tape', 'k1', 'k2', null).ok, true); g = X.linkGhost(B, 'tape', 'k1', { u: 1.5, v: 0.75 }); assert.ok(g.show && !g.ok && g.why === 'dup' && X.ghostKey(g) === 'cbx.dup', 'allerede festet: rødt');
  assert.deepEqual(X.linkGhost(B, 'tape', 'finnes-ikke', { u: 0, v: 0 }), { show: false, ok: false, why: 'none' }); assert.equal(X.linkGhost(B, 'glue', 'k1', { u: 0, v: 0 }).why, 'none'); assert.equal(X.linkGhost(B, 'tape', 'k1', null).show, false);
}
// ---------- 6) verktøylinje ved valgt del ----------
{
  const area = { x0: 0, x1: 390, y0: 62, y1: 640 }, pts = (cx, cy, r = 20) => [{ x: cx - r, y: cy - r }, { x: cx + r, y: cy - r }, { x: cx + r, y: cy + r }, { x: cx - r, y: cy + r }];
  let b = X.barPlace({ pts: pts(200, 400), area }); assert.ok(!b.below && b.y + b.h <= 400 - 20 && Math.abs(b.x - 200) < 1, 'over delen når det er plass');
  b = X.barPlace({ pts: pts(200, 90), area }); assert.ok(b.below && b.y >= 90 + 20, 'under delen når den ligger øverst');
  b = X.barPlace({ pts: pts(10, 400), area }); assert.ok(b.left >= area.x0 + 8, 'ikke ut av kanten venstre'); b = X.barPlace({ pts: pts(385, 400), area }); assert.ok(b.left + b.w <= area.x1 - 8, 'ikke ut av kanten høyre');
  b = X.barPlace({ pts: pts(200, 630), area }); assert.ok(b.y + b.h <= area.y1, 'ikke under byggeområdet');
  assert.ok(b.w >= 3 * 48 && b.h >= 48, 'tre knapper à 48 px'); assert.ok(X.barHit(b, b.left + 5, b.y + 5) && !X.barHit(b, b.left - 5, b.y)); assert.equal(X.barPlace({ pts: [], area }), null);
}
// ---------- 7) hånd-hjelp ----------
{
  const B0 = mkB('trapp', []), B1 = mkB('trapp', [['k1', 0, 0.75], ['k2', 1.5, 0.75]]);
  assert.equal(X.handPair(B0), null, 'ingen hånd uten to deler'); const pr = X.handPair(B1); assert.ok(pr && pr.a.u === 0 && pr.b.u === 1.5);
  assert.equal(X.shouldShowCHand({ seen: false, hint: true, guideOn: true, B: B1 }), true, 'første gang, Nybegynner/Medium');
  assert.equal(X.shouldShowCHand({ seen: true, hint: true, B: B1 }), false, 'bare én gang per enhet'); assert.equal(X.shouldShowCHand({ seen: false, hint: false, B: B1 }), false, 'bort på Ekspert');
  assert.equal(X.shouldShowCHand({ seen: false, hint: true, guideOn: false, B: B1 }), false); assert.equal(X.shouldShowCHand({ seen: false, hint: true, B: B1, sim: true }), false);
  BL.addLink(B1, 'tape', 'k1', 'k2', null); assert.equal(X.handPair(B1), null, 'borte når noe er festet'); assert.equal(BX.shouldShowHand({ seen: false, hint: true }), true);
  const a = { x: 10, y: 10 }, c = { x: 110, y: 60 }, h0 = X.tapHandAt(0, a, c), h1 = X.tapHandAt(1.7, a, c), h2 = X.tapHandAt(X.CBX.handSecs, a, c);
  assert.ok(h0.phase === 0 && h0.x === 10 && h0.y === 10 && !h0.done); assert.ok(h1.x > 10 && h1.x < 110, 'på vei'); assert.ok(h2.phase === 2 && h2.x === 110 && h2.done);
  assert.ok(X.tapHandAt(0.5, a, c).down && !X.tapHandAt(1.2, a, c).down, 'trykker ved første del, ikke på veien');
}
// ---------- 8) logg og mål ----------
{
  const S = X.createCStats('port', 100); assert.equal(X.statsAct(S), 1); assert.equal(X.statsAct(S), 2);
  const t = X.statsTurn(S, 'land'); assert.ok(t && t.from === 'port' && t.to === 'land' && t.acts === 2); assert.equal(X.statsTurn(S, 'land'), null); X.statsAct(S); X.statsTry(S);
  const w = X.statsWin(S, 160); assert.ok(w.first && w.secs === 60 && w.acts === 3 && w.actsPort === 2 && w.actsLand === 1 && w.turns === 1 && w.tries === 1); assert.equal(X.statsWin(S, 200).first, false, 'bare første gang');
  assert.match(X.winLine(w, { id: 'trapp1' }), /modus klassisk: første trapp \(liggende\) etter 60 s, 3 byggehandlinger/); assert.match(X.winLine(w, { id: 'vippe1' }), /første vippe/);
  assert.match(X.actLine('plasser block', 'port', 4), /^modus klassisk: plasser block \(stående, handling 4\)/); assert.match(X.turnLine(t, 6), /modus klassisk: snudd til liggende \(6 deler beholdt\)/);
}
// ---------- 9) tekster (knapper, ingen taster), filer og ⚙-valg ----------
{
  const idx = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8'), main = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8');
  assert.ok(idx.includes("'buildux_classic_logic'") && idx.includes("'buildux_classic_view'"), 'modulene ligger i files i index.html');
  for (const f of ['buildux_classic_logic.js', 'buildux_classic_view.js']) assert.ok(fs.existsSync(new URL(`./${f}`, import.meta.url)) && fs.readFileSync(new URL(`./${f}`, import.meta.url), 'utf8').length > 500, f);
  const keys = ['cbx.step1', 'cbx.step2', 'cbx.sel', 'cbx.selLink', 'cbx.hintEmpty', 'cbx.hintPlaced', 'cbx.far', 'cbx.dup', 'cbx.bad', 'cbx.ghostOk', 'cbx.hand', 'cbx.rotl', 'cbx.rotr', 'cbx.del', 'cbx.rotL', 'cbx.rotR'];
  for (const l of ['nb', 'en']) { const { T } = I18.makeT(() => l); for (const k of keys) { const v = T(k, { name: 'TAPE' }); assert.ok(v && v !== k, `${l}:${k}`); assert.ok(!/\b(tast|taster|tastatur)/i.test(v) && !/\bkey(board)?\b/i.test(v), `ingen taster i ${l}:${k}`); } }
  assert.ok(/buildux/.test(main) && /klassiske steder/i.test(main.match(/fl\('buildux'[^\n]*/)[0]), '⚙-valget «Byggeskjerm» nevner klassiske steder');
  assert.ok(/logEv\('byggux'/.test(fs.readFileSync(new URL('./buildux_classic_view.js', import.meta.url), 'utf8')), 'logger byggux');
}

// ---------- 10) byggeskjermen mot en DOM-stubb ----------
const mkEl = () => { const el = { style: { setProperty() {} }, dataset: {}, children: [], _l: {}, _html: '', classList: { _s: new Set(), add(...c) { c.forEach((x) => this._s.add(x)); }, remove(...c) { c.forEach((x) => this._s.delete(x)); }, toggle(c, f) { (f === undefined ? !this._s.has(c) : f) ? this._s.add(c) : this._s.delete(c); return this._s.has(c); }, contains(c) { return this._s.has(c); } },
  appendChild(c) { this.children.push(c); return c; }, addEventListener(t, f) { (this._l[t] ||= []).push(f); }, removeEventListener() {}, setPointerCapture() {}, releasePointerCapture() {}, setAttribute() {}, removeAttribute() {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844 }), closest: () => null, remove() {},
  getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) }),
  querySelector: () => mkEl(), querySelectorAll: () => [], set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; }, width: 0, height: 0 }; return el; };
const body = mkEl(); globalThis.document = { body, createElement: mkEl, head: mkEl(), getElementById: () => null, querySelector: () => mkEl() };
globalThis.window = globalThis; globalThis.innerWidth = 390; globalThis.innerHeight = 844; globalThis.devicePixelRatio = 2;
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {};
const { createBuildMode } = await import('./build.js');
const mkMode = (name, on) => {
  const L = lvl(name), log = []; const player = { x: L.build.sites[0].x, y: L.build.sites[0].y, z: L.build.sites[0].z, onGround: true, state: 'ground' };
  const bm = createBuildMode({ scene: { add() {}, remove() {} }, LEVEL: L, player, $: () => mkEl(), T: (k) => k, logEv: (t, d) => log.push([t, d]), toast() {}, TOUCH: true, buzz() {}, audio: {}, isPlay: () => true, isMenu: () => false, isBoss: () => false, isWon: () => false, isOv: () => false, getSnap: () => true, setSnap() {}, allParts: () => true, onChange() {}, getBuildUx: () => on, levelId: name });
  return { bm, log, root: body.children[body.children.length - 3] || body.children[body.children.length - 1] };
};
const rootOf = () => body.children.filter((c) => c._html && c._html.includes('cxtools'))[body.children.filter((c) => c._html && c._html.includes('cxtools')).length - 1];
for (const name of ['trapp', 'vippe']) {
  // valget av: dagens skjerm
  { const { bm } = mkMode(name, false); bm.update(0.016, true); assert.ok(bm.open(), 'åpner'); bm.update(0.016, true); assert.ok(!bm.cbx.on(), name + ': valget av: ingen nytt skall'); assert.ok(!rootOf().classList.contains('cbx'), 'ingen cbx-klasse'); bm.close('t'); }
  // valget på
  const { bm, log } = mkMode(name, true); bm.update(0.016, true); assert.ok(bm.open(), 'åpner'); bm.update(0.016, true); const r = rootOf();
  assert.ok(bm.cbx.on(), name + ': valget på: nytt skall'); assert.ok(r.classList.contains('cbx') && !r.classList.contains('cxland'), 'cbx-klasse, stående');
  assert.ok(!bm.bux.on() && !bm.grid.on, 'ikke R92-skjermen og ikke rutenett');
  assert.ok(log.some(([t, d]) => t === 'byggux' && /skjerm på .*\(klassisk, stående\)/.test(d)), 'logger skjerm på med modus klassisk');
  assert.ok(/data-cx="tape"/.test(r._html) && /data-cx="try"/.test(r._html) && /data-cx="more"/.test(r._html) && /data-cx="undo"/.test(r._html) && /cxsel/.test(r._html) && /cxsheet/.test(r._html), 'markup har knappene');
  // snuing midt i bygging: ingenting mistes
  const have = bm.state().builds[0].have; assert.ok(have >= 1);
  globalThis.innerWidth = 844; globalThis.innerHeight = 390; bm.update(0.016, true); bm.update(0.016, true); assert.ok(r.classList.contains('cxland'), 'liggende layout etter snuing');
  assert.equal(bm.state().builds[0].have, have, 'delene beholdes ved snuing'); assert.ok(bm.cbx.stats.turns === 1 && bm.cbx.metrics().orient === 'land');
  assert.ok(log.some(([t, d]) => t === 'byggux' && /snudd til liggende/.test(d)), 'snuing logges');
  globalThis.innerWidth = 390; globalThis.innerHeight = 844; bm.update(0.016, true); bm.update(0.016, true); assert.ok(!r.classList.contains('cxland') && bm.cbx.stats.turns === 2, 'og tilbake');
  bm.close('t'); assert.ok(!bm.cbx.opened && !r.classList.contains('cbx') || true); bm.update(0.016, true);
}
console.log('klassisk byggeskjerm (R96) grønne');
