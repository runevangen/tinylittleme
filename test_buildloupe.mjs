// node test_buildloupe.mjs: R106, hjørneglass i byggeskjermen: ren logikk (build_loupe_logic.js), glass-elementet mot en DOM-stubb (build_loupe_view.js),
// filer, ⚙-valg og at ingen tast nevnes. Ekte berøring og bilder (iPhone 14, stående og liggende): tools/live_loupe.cjs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const L = await import('./build_loupe_logic.js'), V = await import('./build_loupe_view.js');

// zoom og størrelse
assert.equal(L.LOUPE.defZoom, 3.75); assert.equal(L.normZoom(2), 2); assert.equal(L.normZoom('4'), 4); assert.equal(L.normZoom(3.8), 3.75, 'rundes til 0,25'); assert.equal(L.normZoom(9), 6); assert.equal(L.normZoom(0.2), 1.5); assert.equal(L.normZoom(NaN), 3.75); assert.equal(L.normZoom(undefined), 3.75);
assert.equal(L.normSizePct(500), 200); assert.equal(L.normSizePct(10), 70); assert.equal(L.normSizePct('abc'), 100); assert.equal(L.glassSize(390, 844, 150), 210); assert.equal(L.glassSize(390, 844, 200), 280 > 390 - 16 ? 374 : 280, 'holdes inne i skjermen'); assert.equal(L.glassSize(390, 844), 140);
assert.equal(L.glassSize(390, 844), 140); assert.equal(L.glassSize(844, 390), 120); assert.ok(L.glassSize(100, 100) <= 84);
assert.ok(L.LOUPE.size >= 120 && L.LOUPE.size <= 150 && L.LOUPE.sizeLand >= 96 - 1);

// utsnitt: 2×/3×/4× gir side size/zoom, midtstilt og holdt inne i canvaset
for (const z of [2, 3, 4]) { const r = L.sourceRect(200, 300, 112, z, 390, 844); assert.ok(Math.abs(r.sw - 112 / z) < 1e-9 && r.sw === r.sh); assert.ok(Math.abs(r.sx + r.sw / 2 - 200) < 1e-9 && Math.abs(r.fx - 0.5) < 1e-9 && Math.abs(r.fy - 0.5) < 1e-9); }
{ const r = L.sourceRect(2, 3, 112, 3, 390, 844); assert.equal(r.sx, 0); assert.equal(r.sy, 0); assert.ok(r.fx < 0.5 && r.fy < 0.5 && r.fx > 0); }
{ const r = L.sourceRect(389, 843, 112, 3, 390, 844); assert.ok(r.sx + r.sw <= 390 + 1e-9 && r.sy + r.sh <= 844 + 1e-9); assert.ok(r.fx > 0.5 && r.fx <= 1 && r.fy > 0.5 && r.fy <= 1); }
for (const [x, y] of [[-50, -50], [9999, 9999], [0, 844], [390, 0]]) { const r = L.sourceRect(x, y, 112, 4, 390, 844); assert.ok(r.sx >= 0 && r.sy >= 0 && r.sx + r.sw <= 390 + 1e-9 && r.sy + r.sh <= 844 + 1e-9, `inne ${x},${y}`); }
{ const o = {}; assert.equal(L.sourceRect(10, 10, 112, 3, 390, 844, o), o, 'gjenbruker objektet'); }
{ const r = L.sourceRect(200, 300, 112, 4, 390, 844); const q = L.toGlass(r, 200, 300); assert.ok(Math.abs(q.fx - 0.5) < 1e-9 && Math.abs(q.fy - 0.5) < 1e-9); assert.equal(L.toGlass(r, 0, 0), null); assert.ok(L.toGlass(r, 200 + 10, 300 - 10).fx > 0.5); }

// hjørne med hysterese
{ let s = L.chooseSide(null, 100, 390, 0); assert.equal(s.side, 'right', 'finger til venstre -> glass til høyre');
  assert.equal(L.chooseSide(null, 300, 390, 0).side, 'left');
  const s1 = L.chooseSide(s, 300, 390, 100); assert.equal(s1.side, 'right', 'bytter ikke før 400 ms'); assert.equal(s1, s);
  const s2 = L.chooseSide(s, 300, 390, 401); assert.equal(s2.side, 'left'); assert.equal(s2.t, 401);
  assert.equal(L.chooseSide(s2, 100, 390, 500).side, 'left', 'hysterese begge veier'); assert.equal(L.chooseSide(s2, 100, 390, 801).side, 'right');
  // fingeren havner under glasset: bytt med en gang
  const rect = { x: 270, y: 140, w: 112, h: 132 }; assert.equal(L.chooseSide({ side: 'right', t: 0 }, 300, 390, 10, rect).side, 'left');
  // ellers hopper det aldri oftere enn hvert 0,4 s selv om fingeren krysser midten fram og tilbake
  let cur = L.chooseSide(null, 100, 390, 0), flips = 0; for (let t = 10; t < 4000; t += 16) { const n = L.chooseSide(cur, Math.floor(t / 50) % 2 ? 100 : 300, 390, t); if (n.side !== cur.side) flips++; cur = n; } assert.ok(flips <= 4000 / 400 + 1, 'flips ' + flips); }

// plassering: under topplinjen, i hjørnet, mellom sidepanelene, unna zoomknapper og flagg
{ const base = { W: 390, H: 844, size: 112, top: 130, bottom: 700 };
  const r = L.placeGlass({ ...base, side: 'right' }); assert.equal(r.side, 'right'); assert.equal(r.x, 390 - 8 - 112); assert.ok(r.y >= 130 && r.y + r.h <= 700);
  const l = L.placeGlass({ ...base, side: 'left' }); assert.equal(l.x, 8);
  const land = L.placeGlass({ W: 844, H: 390, size: 96, top: 60, bottom: 330, insetL: 150, insetR: 150, side: 'left' }); assert.equal(land.x, 158); assert.ok(land.y >= 60 && land.y + land.h <= 330);
  const land2 = L.placeGlass({ W: 844, H: 390, size: 96, top: 60, bottom: 330, insetL: 150, insetR: 150, side: 'right' }); assert.equal(land2.x, 844 - 150 - 8 - 96);
  const zoom = { x: 320, y: 104, w: 56, h: 42 }; const z = L.placeGlass({ ...base, side: 'right', avoid: [zoom] }); assert.ok(!L.rectsOverlap(z, zoom) && z.y + z.h <= 700, 'unna zoomknapper');
  const fl = { x: 300, y: 130, w: 34, h: 600 }; const f = L.placeGlass({ ...base, side: 'right', avoid: [fl] }); assert.equal(f.side, 'left', 'andre hjørnet når det første er blokkert'); assert.ok(!L.rectsOverlap(f, fl));
  const both = L.placeGlass({ ...base, side: 'right', avoid: [{ x: 0, y: 0, w: 390, h: 900 }] }); assert.ok(both && both.fits === false); }

// synlighet: vises mens fingeren plasserer, 150 ms etter slipp, aldri når av / under PRØV
{ const v = L.createVisibility();
  assert.equal(v.update(0, false), false); assert.equal(v.update(10, true), true); assert.equal(v.update(100, true), true);
  assert.equal(v.update(200, false), true, '100 ms etter: fortsatt synlig'); assert.equal(v.update(249, false), true); assert.equal(v.update(260, false), false, '150 ms etter slipp: borte'); assert.equal(v.visible, false);
  assert.equal(v.update(300, true), true); assert.equal(v.update(310, true, false), false, 'av (PRØV/valg): borte med en gang'); assert.equal(v.update(320, false), false, 'og ingen ettervisning');
  v.update(400, true); v.reset(); assert.equal(v.update(401, false), false); }
// hold: 0,3 s
assert.equal(L.LOUPE.holdMs, 300); assert.equal(L.holdReached(0, 299), false); assert.equal(L.holdReached(0, 300), true); assert.equal(L.holdReached(0, 900, false), false, 'flyttet: ikke hold'); assert.equal(L.holdReached(null, 900), false); assert.equal(L.holdReached(undefined, 900), false);
// regel
assert.equal(L.wantsLoupe({ placing: true }), true); assert.equal(L.wantsLoupe({ placing: true, sim: true }), false); assert.equal(L.wantsLoupe({ placing: true, on: false }), false); assert.equal(L.wantsLoupe({ placing: true, fingers: 2 }), false); assert.equal(L.wantsLoupe({ placing: false }), false);
// tekst for klassiske deler
{ const T = (k, p) => (k === 'loupe.anchor' ? 'Festes her' : `x ${p.m} · høyde ${p.n}`); assert.equal(L.partLine(T, { anchored: true }, 1, 2), 'Festes her'); assert.equal(L.partLine(T, null, 1.25, 0.5), 'x 1,25 · høyde 0,5'); }

// ---------- glass-elementet mot en DOM-stubb ----------
{
  const mk = () => { const style = {}, o = { style, className: '', textContent: '', children: [], width: 0, height: 0, _q: {} }; o.querySelector = (s) => o._q[s] || null; return o; };
  const calls = []; const g = { setTransform() {}, clearRect() {}, drawImage: (...a) => calls.push(['draw', ...a]), beginPath() {}, arc: (...a) => calls.push(['arc', ...a]), moveTo() {}, lineTo() {}, stroke() {}, set lineWidth(v) {}, set strokeStyle(v) {} };
  const canvas = mk(); canvas.getContext = () => g; const tx = mk(), el = mk(); el._q = { canvas, '.blt': tx };
  const cv = { width: 780, height: 1688 }, root = mk(); root._q = { '.bloupe': el };
  const logs = []; let on = true, zoom = 3;
  const lp = V.createLoupe({ root, cv, T: (k) => k, logEv: (t, d) => logs.push([t, d]), getOn: () => on, getZoom: () => zoom, dpr: () => 2 });
  const lay = { W: 390, H: 844, top: 130, bottom: 700, insetL: 0, insetR: 0, sim: false, avoid: [] };
  const info = { placing: true, fingers: 1, x: 100, y: 400, tx: 110, ty: 405, ok: true, text: 'Rute 3, 4', kind: 'test' };
  assert.equal(lp.frame(info, lay), true); assert.equal(el.style.display, 'block'); assert.equal(lp.visible, true); assert.equal(lp.shown, 1);
  assert.equal(el.className, 'bloupe r', 'finger til venstre: glass til høyre'); assert.equal(el.style.left, '242px'); assert.equal(tx.textContent, 'Rute 3, 4');
  const d = calls.find((c) => c[0] === 'draw'); assert.ok(d, 'kopierer fra byggecanvaset'); assert.equal(d[1], cv); assert.ok(Math.abs(d[4] - (140 / 3) * 2) < 1e-6, '3×: kilde = glass/3 (i enhetspiksler)'); assert.equal(calls.filter((c) => c[0] === 'arc').length, 1, 'ring ved snappunktet');
  zoom = 4; calls.length = 0; lp.frame(info, lay); assert.ok(Math.abs(calls.find((c) => c[0] === 'draw')[4] - (140 / 4) * 2) < 1e-6, '4×');
  assert.equal(lp.frame({ ...info, placing: false }, lay), true, 'rett etter slipp: fortsatt synlig'); assert.equal(logs.length, 1); assert.match(logs[0][1], /^glass vist/);
  assert.equal(lp.takeShown(), 1); assert.equal(lp.takeShown(), 0);
  lp.frame({ ...info, placing: true, fingers: 2 }, lay); // to fingre
  await new Promise((r) => setTimeout(r, 200)); assert.equal(lp.frame({ ...info, placing: false, fingers: 0 }, lay), false); assert.equal(el.style.display, 'none', '150 ms etter slipp: skjult');
  lp.frame(info, { ...lay, sim: true }); assert.equal(el.style.display, 'none', 'aldri under PRØV');
  on = false; lp.frame(info, lay); assert.equal(el.style.display, 'none', 'valget av'); on = true;
  lp.frame({ ...info, x: 300 }, lay); assert.equal(el.className, 'bloupe l', 'finger til høyre: glass til venstre'); assert.equal(el.style.left, '8px'); assert.equal(logs.length, 1, 'første gang per økt: logges bare én gang'); assert.ok(lp.shown >= 1);
  lp.reset(); assert.equal(lp.visible, false);
}

// ---------- CSS: tar ikke berøring ----------
{ const css = V.loupeCss(), mk = V.loupeMarkup(); assert.match(css, /\.bloupe\{[^}]*pointer-events:none/); assert.match(css, /canvas\{[^}]*pointer-events:none/); assert.match(css, /\.blt\{[^}]*pointer-events:none/); assert.match(css, /#bld\.sim \.bloupe\{display:none/); assert.match(mk, /aria-hidden="true"/); assert.ok(!/tast/i.test(mk + css)); }

// ---------- filer, valg, tekster, hekter ----------
const html = fs.readFileSync('index.html', 'utf8'), main = fs.readFileSync('main.js', 'utf8'), bld = fs.readFileSync('build.js', 'utf8'), i18 = fs.readFileSync('i18n.js', 'utf8'), docs = fs.readFileSync('docs/INNSTILLINGER.md', 'utf8');
for (const m of ['build_loupe_logic', 'build_loupe_view']) assert.ok(html.includes(`'${m}'`), `${m} mangler i files`);
assert.match(main, /fl\('buildloupe', 'spill'/); assert.match(main, /rg\('buildloupezoom', 'spill'/); assert.ok(main.includes('getLoupe: () => buildLoupe') && main.includes('getLoupeZoom: () => buildLoupeZoom'));
assert.ok(bld.includes('loupeStep()') && bld.includes('createLoupe(') && bld.includes('loupeMarkup()') && bld.includes('loupe.takeShown()'), 'build.js hekter');
assert.ok(i18.includes("'loupe.anchor'") && i18.includes("'loupe.pos'"));
assert.ok(docs.includes('buildloupe') && docs.includes('buildloupezoom'), 'docs/INNSTILLINGER.md');
// glasset tegnes sist (etter drawBoard), og klassiske/rutenett-berøringer leverer fingerpunktet
assert.match(bld, /function draw\(\) \{ drawBoard\(\); loupeStep\(\); \}/);
const gv = fs.readFileSync('grid_view.js', 'utf8'), bv = fs.readFileSync('buildux_view.js', 'utf8'); assert.ok(gv.includes('touchInto') && gv.includes('holdInto') && bv.includes('touchInto'));
console.log('test_buildloupe ok');
