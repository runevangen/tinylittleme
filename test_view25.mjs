// R137: node test_view25.mjs: 2,5D-visning i byggeskjermen. Rundturs-projeksjon av alle rutenettpunkter (Hyllebroen og alle Bygglab-steder), at skråkameraet ikke endrer data,
// valget `buildview25`, delt kode (R101) og statisk tegnebudsjett. Ekte FPS og følelse: testes på iPhone.
import fs from 'node:fs';
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const V = await import('./build_view25.js'), BL = await import('./build_logic.js'), G = await import('./grid_logic.js'), P = await import('./grid_play.js');
const lvl = (n) => JSON.parse(fs.readFileSync(new URL(`./levels/${n}.level.json`, import.meta.url), 'utf8'));
const read = (f) => fs.readFileSync(new URL(`./${f}`, import.meta.url), 'utf8');
const W = 390, H = 844;
// (1) av = nøyaktig dagens avbildning
V.setTilt25(false);
const view0 = { scale: 40, cu: 1.5, cv: 3, oy: 20 };
assert.deepEqual(BL.toScreen(view0, W, H, 2, 4), { x: W / 2 + 0.5 * 40, y: H / 2 + 20 - 1 * 40 });
// (2) homografi: invers eksakt, perspektiv mild, midten uendret
for (let i = 0; i < 400; i++) { const p = (Math.random() - 0.5) * 900, q = (Math.random() - 0.5) * 900, r = V.proj25(p, q), b = V.unproj25(r.x, r.y); assert.ok(Math.abs(b.p - p) < 1e-6 && Math.abs(b.q - q) < 1e-6, 'invers'); }
const o = V.proj25(0, 0); assert.ok(Math.abs(o.x) < 1e-9 && Math.abs(o.y) < 1e-9, 'sentrum står');
const top = V.proj25(0, 300), bot = V.proj25(0, -300); assert.ok(top.y > 0 && bot.y < 0 && top.y < 300 && -bot.y > 300 * Math.cos(V.TILT.pitch) * 0.98, 'toppen er lenger unna (mindre), bunnen nærmere');
assert.ok(Math.abs(V.TILT.pitch * 180 / Math.PI - 18) < 3.1, 'pitch 15–20°'); assert.ok(V.proj25(100, 0).x / 100 > 0.97, 'mild forkortning sideveis');
// (3) alle rutenettpunkter rundturs: Hyllebroen + alle Bygglab-steder, flere zoomnivåer og forskyvninger
let pts = 0;
for (const name of ['bro', 'kjokkenbro', 'badebro', 'bygglab']) {
  const L = lvl(name); P.ensurePlayGrid?.(L.build.sites);
  for (const site of L.build.sites) {
    if (!G.siteHasGrid(site)) continue;
    for (const view of [{ scale: 44, cu: 0, cv: site.h / 2, oy: 30 }, { scale: 80, cu: 1, cv: site.h / 3, oy: -20 }, { scale: 14, cu: -2, cv: 1, oy: 0 }]) {
      for (const on of [false, true]) {
        V.setTilt25(on);
        for (const p of G.latticePoints(site)) {
          const s = BL.toScreen(view, W, H, p.u, p.v), w = BL.toWorld(view, W, H, s.x, s.y);
          assert.ok(Math.abs(w.u - p.u) < 1e-7 && Math.abs(w.v - p.v) < 1e-7, `${name}/${site.id} rundtur (${p.u},${p.v}) ${on}`);
          if (on) assert.deepEqual(G.nearestPoint(site, w.u, w.v) && { u: G.nearestPoint(site, w.u, w.v).u, v: G.nearestPoint(site, w.u, w.v).v }, { u: p.u, v: p.v }, 'et trykk på det tegnede punktet treffer samme punkt');
          pts++;
        }
      }
    }
  }
}
assert.ok(pts > 500, 'mange punkter prøvd: ' + pts);
// (4) knutene ligger ikke på hverandre og ikke utenfor skjermen i tilt: avstand mellom nabopunkter ≥ 90 % av flat (treffflater like store)
V.setTilt25(true);
const vw = { scale: 44, cu: 0, cv: 3, oy: 0 }; let minRatio = 9;
for (const [u, v] of [[-3, 0], [0, 0], [3, 0], [0, 6], [-3, 6]]) { const a = BL.toScreen(vw, W, H, u, v), b = BL.toScreen(vw, W, H, u + 1, v), c = BL.toScreen(vw, W, H, u, v + 1); minRatio = Math.min(minRatio, Math.hypot(b.x - a.x, b.y - a.y) / 44, Math.hypot(c.x - a.x, c.y - a.y) / 44); }
assert.ok(minRatio > 0.88, 'treffflatene krymper bare litt: ' + minRatio.toFixed(3));
V.setTilt25(false);
// (5) fargehjelp, dybde og budsjett
assert.equal(V.shadeHex('#c98a45', 0.5), '#654523'); assert.equal(V.shadeHex('rødt', 0.5), 'rødt');
const dv = V.depthVec(10); assert.ok(dv.y < 0 && dv.x > 0, 'dybden går bakover: opp og litt til siden');
assert.ok(V.rodDepth(3) >= 5 && V.rodDepth(40) <= 13); assert.ok(V.EXTRA_STROKES_PER_ROD <= 4, 'budsjett: høyst 4 ekstra strøk per stav (ingen nye shadere, samme lerret)');
// (6) delt kode, valg og logg
const bv = read('grid_view.js'), main = read('main.js'), b = read('build.js'), idx = read('index.html');
assert.match(bv, /rodDepth25/); assert.match(bv, /nodeBall25/); assert.ok(!/lab\d/.test(bv), 'ingen egen kode for Bygglab (R101)');
assert.match(main, /fl\('buildview25', 'spill'[^\n]*, true, \(\) => buildView25/, 'valget buildview25 i ⚙ → Spill, standard på');
assert.match(main, /logEv\('bygg', `visning 2,5D/); assert.match(b, /visning 2,5D/); assert.match(main, /getView25: \(\) => buildView25/);
for (const f of ['build_view25', 'build_view25_view']) assert.ok(idx.includes(`'${f}'`), f + ' i files i index.html');
assert.match(read('docs/INNSTILLINGER.md'), /buildview25/);
console.log('test_view25: ok (' + pts + ' rundturer)');
