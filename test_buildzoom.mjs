// R44: zoom i byggeskjermen (build_zoom.js): grenser, trinn, rutenett vs zoom, dobbelttrykk, samme plassering uansett zoom.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as Z from './build_zoom.js';
import * as BL from './build_logic.js';

// grenser
assert.equal(Z.clampZoom(1e9), Z.ZOOM_MAX); assert.equal(Z.clampZoom(0), Z.ZOOM_MIN); assert.equal(Z.clampZoom(NaN), Z.ZOOM_MIN);
assert.ok(Z.ZOOM_MAX > 80, 'maks-zoom er økt'); assert.equal(BL.clampScale(1e9), Z.ZOOM_MAX);

// rutenett følger zoom
assert.equal(Z.gridForScale(20), 0.5); assert.equal(Z.gridForScale(45), 0.25); assert.equal(Z.gridForScale(100), 0.125);
assert.equal(Z.gridForScale(200, false), 0.5, 'finere rutenett kan slås av');
let prev = 1; for (let s = Z.ZOOM_MIN; s <= Z.ZOOM_MAX; s += 1) { const g = Z.gridForScale(s); assert.ok(g <= prev, 'rutenettet blir aldri grovere ved mer zoom'); prev = g; }
assert.ok(Z.anchorRadius(100) < Z.anchorRadius(20) && Z.anchorRadius(10) === 0.7 && Z.anchorRadius(100) > 0);

// zoom om et punkt: verdenspunktet blir stående
const site = { id: 's', w: 12, h: 8 }, W = 390, H = 844, fit = BL.fitView(site, W, H, 24, 130, 160);
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
{
  const sx = 300, sy = 400, before = BL.toWorld(fit, W, H, sx, sy), v2 = Z.zoomAbout(fit, W, H, sx, sy, fit.scale * 3), after = BL.toWorld(v2, W, H, sx, sy);
  assert.ok(near(before.u, after.u) && near(before.v, after.v), 'punktet under fingeren blir stående'); assert.ok(near(v2.scale, fit.scale * 3));
  const t = { u: 3, v: 2 }, p0 = BL.toScreen(fit, W, H, t.u, t.v), v3 = Z.zoomToward(fit, W, H, t.u, t.v, 2), p1 = BL.toScreen(v3, W, H, t.u, t.v);
  assert.ok(near(p0.x, p1.x) && near(p0.y, p1.y), 'zoom mot valgt del: delen blir stående');
  const c = Z.freeCenter(fit, W, H), v4 = Z.zoomStep(fit, W, H, +1), w0 = BL.toWorld(fit, W, H, c.x, c.y), w1 = BL.toWorld(v4, W, H, c.x, c.y);
  assert.ok(near(w0.u, w1.u) && near(w0.v, w1.v) && near(v4.scale, fit.scale * Z.ZOOM_STEP), '+ uten valgt del zoomer mot midten');
  let v = fit; for (let i = 0; i < 40; i++) v = Z.zoomStep(v, W, H, +1); assert.equal(v.scale, Z.ZOOM_MAX); for (let i = 0; i < 60; i++) v = Z.zoomStep(v, W, H, -1); assert.equal(v.scale, Z.ZOOM_MIN);
}

// dobbelttrykk
{
  const a = { t: 1000, x: 100, y: 100 };
  assert.ok(Z.isDoubleTap(a, { t: 1250, x: 110, y: 105 })); assert.ok(!Z.isDoubleTap(a, { t: 1500, x: 100, y: 100 }), 'for sent'); assert.ok(!Z.isDoubleTap(a, { t: 1200, x: 200, y: 100 }), 'for langt unna'); assert.ok(!Z.isDoubleTap(null, a));
  const inV = Z.dblTapView(fit, fit, W, H, 200, 300); assert.ok(inV.scale > fit.scale * 2, 'dobbelttrykk zoomer inn');
  const w0 = BL.toWorld(fit, W, H, 200, 300), w1 = BL.toWorld(inV, W, H, 200, 300); assert.ok(near(w0.u, w1.u) && near(w0.v, w1.v), 'inn mot trykkpunktet');
  assert.deepEqual(Z.dblTapView(inV, fit, W, H, 50, 50), fit, 'dobbelttrykk igjen: tilbake til hele byggeplassen');
}

// samme plassering uansett zoom: plassering er et tall i enheter, avhengig bare av rutenettet; grove rutenettpunkter er også gyldige i finere nett
{
  const mk = (scale, fine = true) => { const B = BL.createBuild({ ...site, anchors: [{ u: -5, v: 0 }, { u: 5, v: 0 }] }, { a: 'plank_s' }, ['a']); B.grid = Z.gridForScale(scale, fine); B.snapR = Z.anchorRadius(scale); return B; };
  const put = (B, u, v) => { const p = BL.place(B, 'a', u, v, 0); return [p.u, p.v, p.anchored]; };
  // samme verdenspunkt, samme zoom-nivå (samme rutenett): identisk resultat, også etter å ha zoomet via skjermen og tilbake
  for (const [u, v] of [[1.1, 2.3], [-2.74, 3.9], [0.26, 0.1]]) {
    for (const sc of [20, 45, 100, 200]) {
      const view = { ...fit, scale: sc, cu: 1, cv: 3 }, scr = BL.toScreen(view, W, H, u, v), back = BL.toWorld(view, W, H, scr.x, scr.y);
      assert.deepEqual(put(mk(sc), back.u, back.v), put(mk(sc), u, v), 'skjerm-rundtur gir samme plassering');
    }
    const grove = put(mk(20), u, v); assert.ok(grove[0] % 0.5 === 0 && grove[1] % 0.5 === 0);
    const fin = put(mk(100), u, v); assert.ok(Math.abs(fin[0] - u) <= 0.0625 + 1e-9 && Math.abs(fin[1] - v) <= 0.0625 + 1e-9, 'høy zoom: nærmeste 0,125');
    assert.ok(Math.abs(fin[0] - u) <= Math.abs(grove[0] - u) + 1e-9, 'finere rutenett er aldri lenger unna');
  }
  assert.deepEqual(put(mk(100), 0.5, 1.5), put(mk(20), 0.5, 1.5), 'et punkt på det grove rutenettet gir samme verdi i grovt og fint');
  // festepunkt: eksakt posisjon uansett zoom
  for (const sc of [10, 20, 45, 100, 240]) { const r = put(mk(sc), 5.05, 0.04); assert.deepEqual(r, [5, 0, true], `festepunkt eksakt ved skala ${sc}`); }
  // snapping av: fri plassering, uavhengig av zoom
  { const B = mk(200); B.snap = false; const p = BL.place(B, 'a', 1.234, 2.345, 0); assert.ok(near(p.u, 1.234) && near(p.v, 2.345)); }
  // rutenett-verdiene er eksakte i binærsystemet (ingen avrundingsdrift som kan gi ulik fysikk)
  for (const g of Z.GRID_STEPS) assert.equal(Math.round(g * 8), g * 8);
}

// moduler og kobling
const html = fs.readFileSync('index.html', 'utf8'); assert.ok(html.includes("'build_zoom'"), 'build_zoom mangler i files');
const src = fs.readFileSync('build.js', 'utf8'), main = fs.readFileSync('main.js', 'utf8');
assert.ok(/logEv\('bygg', `zoom /.test(src), 'zoom logges'); assert.ok(main.includes("'tlm.builddbl'") && main.includes("'tlm.buildfine'"), 'innstillinger finnes');
for (const f of ['i18n.js']) { const t = fs.readFileSync(f, 'utf8'); assert.equal((t.match(/'build\.zoomInfo'/g) || []).length, 2, 'zoom-tekst på nb og en'); }
assert.ok(!/build\.hintEmpty': '[^']*[Tt]aster/.test(fs.readFileSync('i18n.js', 'utf8')), 'hint nevner knapper, ikke taster');
console.log('zoom-tester grønne');
