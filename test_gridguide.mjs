// node test_gridguide.mjs: R75, veiledning for rutenett-bygging: logikk (grid_guide_logic.js), tekster (knapper, ingen taster), index.html, ⚙-valget
// og byggeskjermen mot en DOM-stubb (guiden vises én gang, kan hoppes over og åpnes igjen, MODUS huskes, Ekspert uten hjelp). Ekte berøring: tools/live_gridguide.cjs.
import fs from 'node:fs';
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const L = await import('./grid_guide_logic.js'), I18 = await import('./i18n.js'), D = await import('./difficulty.js');
const mem = () => { const m = new Map(); return { get: (k, d) => (m.has(k) ? m.get(k) : d), set: (k, v) => m.set(k, v), m }; };

// ---------- 1) logikk ----------
{
  assert.deepEqual(L.STEPS, ['point', 'point2', 'mat', 'try']);
  const st = mem(); assert.equal(L.isSeen(st), false); L.markSeen(st); assert.equal(L.isSeen(st), true); L.resetSeen(st); assert.equal(L.isSeen(st), false);
  assert.equal(L.shouldAutoShow({ on: true, hint: true, seen: false }), true);
  assert.equal(L.shouldAutoShow({ on: true, hint: true, seen: true }), false, 'bare én gang');
  assert.equal(L.shouldAutoShow({ on: false, hint: true, seen: false }), false, 'av i ⚙');
  assert.equal(L.shouldAutoShow({ on: true, hint: false, seen: false }), false, 'ikke på Ekspert');
  assert.equal(L.showHelpBtn({ enabled: true, hint: true }), true); assert.equal(L.showHelpBtn({ enabled: true, hint: false }), false); assert.equal(L.showHelpBtn({ enabled: false, hint: true }), false);
  assert.equal(L.shouldTipMode({ enabled: true, inGrid: false, hint: true, tipped: false, locked: false }), true);
  for (const o of [{ enabled: false }, { inGrid: true }, { hint: false }, { tipped: true }, { locked: true }]) assert.equal(L.shouldTipMode({ enabled: true, inGrid: false, hint: true, tipped: false, locked: false, ...o }), false, JSON.stringify(o));
  assert.equal(L.getMode(st), 'classic'); L.setModeMem(st, 'grid'); assert.equal(L.getMode(st), 'grid'); L.setModeMem(st, 'x'); assert.equal(L.getMode(st), 'classic'); st.set(L.KEY_MODE, 'tull'); assert.equal(L.getMode(st), 'classic');
  const ok = { mem: 'grid', enabled: true, inGrid: false, locked: false, placed: false };
  assert.equal(L.shouldRestoreMode(ok), true);
  for (const o of [{ mem: 'classic' }, { enabled: false }, { inGrid: true }, { locked: true }, { placed: true }]) assert.equal(L.shouldRestoreMode({ ...ok, ...o }), false, JSON.stringify(o));
  // vanskelighetsprofilen: guide følger gridHint (av på Ekspert)
  assert.deepEqual(D.DIFFS.map((d) => D.diffProfile(d).gridHint), [true, true, false]);
}

// ---------- 2) tekster og filer ----------
{
  let lang = 'nb'; const { T } = I18.makeT(() => lang);
  for (const l of ['nb', 'en']) { lang = l; for (const k of ['gguide.title', 'gguide.s.point', 'gguide.s.point2', 'gguide.s.mat', 'gguide.s.try', 'gguide.ok', 'gguide.skip', 'gguide.again', 'gguide.btn', 'gguide.modeTip']) { const t = T(k); assert.ok(t && !t.startsWith('gguide.'), `${l} ${k}`); } }
  lang = 'nb'; const all = ['gguide.s.point', 'gguide.s.point2', 'gguide.s.mat', 'gguide.s.try', 'gguide.modeTip', 'gguide.again'].map((k) => T(k)).join(' ');
  assert.ok(!/\b(tast|Enter|Esc|klikk|Space|mellomrom)/i.test(all), 'ingen taster i teksten'); assert.ok(/PRØV/.test(T('gguide.s.try')) && /TRE/.test(T('gguide.s.mat')) && /MODUS/.test(T('gguide.modeTip')), 'nevner knappene');
  const html = fs.readFileSync('index.html', 'utf8'); for (const f of ['grid_guide_logic', 'grid_guide_view']) assert.ok(html.includes(`'${f}'`), `${f} i files`);
  const main = fs.readFileSync('main.js', 'utf8'); assert.ok(/fl\('gridguide', 'spill'/.test(main) && /getGridGuide: \(\) => gridGuide/.test(main), '⚙-valget er koblet');
}

// ---------- 3) byggeskjermen mot en DOM-stubb ----------
{
  const els = [];
  const mkEl = () => { const el = { style: { setProperty() {} }, dataset: {}, children: [], _l: {}, _html: '', classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, f) { (f === undefined ? !this._s.has(c) : f) ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    appendChild(c) { this.children.push(c); return c; }, addEventListener(t, f) { (this._l[t] ||= []).push(f); }, removeEventListener() {}, setPointerCapture() {}, releasePointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844 }), closest: () => null, remove() {},
    getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) }),
    querySelector: () => mkEl(), querySelectorAll: () => [], set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; }, width: 0, height: 0 }; els.push(el); return el; };
  const body = mkEl(); globalThis.document = { body, createElement: mkEl, head: mkEl(), getElementById: () => null, querySelector: () => mkEl() };
  globalThis.window = globalThis; globalThis.innerWidth = 390; globalThis.innerHeight = 844; globalThis.devicePixelRatio = 2; globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {};
  const { createBuildMode } = await import('./build.js');
  const S = { id: 'bro', x: 0, y: 2, z: 0, w: 20, h: 12, d: 4, anchors: [{ u: -3.5, v: 0 }, { u: 3.5, v: 0 }], deck: [{ u0: -9.5, u1: -3.5 }, { u0: 3.5, u1: 9.5 }], start: { u: -8, v: 0 }, goal: { u: 8, v: 0 }, grid: { step: 1.75 } };
  const S2 = { id: 'plain', x: 40, y: 2, z: 0, w: 12, h: 8, anchors: [{ u: -2, v: 0 }, { u: 2, v: 0 }] };
  const Lv = { boxes: [], build: { sites: [S, S2], parts: [{ id: 'a', type: 'plank_s', x: 10, y: 3, z: 0 }] } }, player = { x: 0, y: 2, z: 0, onGround: true, state: 'ground' };
  const mk = (opts = {}) => { const log = [], store = opts.store || mem(); const bm = createBuildMode({ scene: { add() {}, remove() {} }, LEVEL: JSON.parse(JSON.stringify(Lv)), player: { ...player }, $: () => mkEl(), T: (k, v) => k + (v ? JSON.stringify(v) : ''), logEv: (t, d) => log.push([t, d]), toast: (m) => log.push(['toast', m]), TOUCH: true, buzz() {}, audio: {}, isPlay: () => true, isMenu: () => false, isBoss: () => false, isWon: () => false, isOv: () => false, getSnap: () => true, setSnap() {}, allParts: () => true, onChange() {}, getGridDeck: () => false, store, ...opts }); bm.update(0.016, true); return { bm, log, store }; };

  // Nybegynner: MODUS-hint før modusen er brukt, guide første gang, bare én gang, ?-knapp åpner igjen
  {
    const { bm, log, store } = mk(); assert.ok(bm.open('bro', { force: true }));
    assert.ok(bm.guide.tip && /gguide.modeTip/.test(bm.guide.tipText()), 'hint peker på MODUS-knappen'); assert.ok(bm.guide.btn, '?-knappen vises'); assert.ok(!bm.guide.open, 'guiden venter til rutenett tas i bruk');
    assert.ok(bm.grid.toggle() && bm.grid.on); assert.ok(bm.guide.open, 'guiden vises første gang rutenett brukes'); assert.ok(log.some(([t, d]) => t === 'bygg' && /^rutenett-guide vist/.test(d)), 'vist logges');
    assert.ok(!bm.guide.tip, 'MODUS-hintet er borte etter bruk'); assert.equal(store.get('tlm.gridmode'), 'grid', 'modusvalget huskes');
    assert.ok(bm.guide.hide('skip')); assert.ok(!bm.guide.open); assert.equal(store.get('tlm.gridguide'), 1, 'sett-merke lagres'); assert.ok(log.some(([t, d]) => /^rutenett-guide hoppet over/.test(d)));
    bm.grid.toggle(); assert.ok(!bm.grid.on); assert.equal(store.get('tlm.gridmode'), 'classic', 'klassisk huskes også'); bm.grid.toggle(); assert.ok(!bm.guide.open, 'ikke igjen (én gang)');
    bm.guide.act(); assert.ok(bm.guide.open, '?-knappen åpner igjen'); assert.ok(bm.guide.hide('ok')); assert.ok(log.some(([t, d]) => /^rutenett-guide lest/.test(d)));
    bm.close('test');
    // modusvalget huskes: nytt sted, sist valgt rutenett, tomt klassisk bygg → rutenett automatisk (guiden vises ikke igjen)
    const r = mk({ store }); assert.ok(r.bm.open('bro', { force: true })); assert.ok(r.bm.grid.on, 'rutenett er valgt igjen ved åpning'); assert.ok(!r.bm.guide.open); assert.ok(r.log.some(([t, d]) => /^modus rutenett \(husket\)/.test(d)));
    r.bm.close('test'); store.set('tlm.gridmode', 'classic'); const r2 = mk({ store }); assert.ok(r2.bm.open('bro', { force: true })); assert.ok(!r2.bm.grid.on, 'klassisk huskes også');
    // sted uten rutenett: ingen hint, ingen ?-knapp
    r2.bm.close('test'); assert.ok(r2.bm.open('plain', { force: true })); assert.ok(!r2.bm.guide.tip && !r2.bm.guide.btn && !r2.bm.grid.on);
  }
  // ⚙-valget av: ingen guide og ingen hint; på igjen i main.js nullstiller sett-merket (testes i main-koden)
  {
    const { bm } = mk({ getGridGuide: () => false }); assert.ok(bm.open('bro', { force: true })); assert.ok(!bm.guide.tip, 'ingen hint når guiden er av'); assert.ok(bm.grid.toggle()); assert.ok(!bm.guide.open, 'ingen automatisk guide');
    assert.ok(bm.guide.show(), 'men den kan åpnes med ?-knappen'); assert.ok(bm.guide.open);
  }
  // Ekspert (gridHint av): ingen guide, ingen hint, ingen ?-knapp, men rutenett virker
  {
    const { bm } = mk({ getGridHint: () => false }); assert.ok(bm.open('bro', { force: true })); assert.ok(!bm.guide.tip && !bm.guide.btn, 'ingen hint og ingen ?-knapp'); assert.ok(bm.grid.toggle() && bm.grid.on); assert.ok(!bm.guide.open, 'guiden kommer ikke av seg selv');
  }
  // åpen guide lukkes stille når man går ut og inn (ikke «sett»)
  {
    const { bm, store } = mk(); bm.open('bro', { force: true }); bm.grid.toggle(); assert.ok(bm.guide.open); bm.close('test'); bm.open('bro', { force: true }); assert.ok(!bm.guide.open, 'lukket ved nytt sted'); assert.equal(store.get('tlm.gridguide', 0), 0, 'ikke merket som sett uten et valg');
  }
}
console.log('rutenett-guide-tester grønne');
