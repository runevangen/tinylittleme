// R68: kinomodus i nettleseren (Playwright, 1280 x 720): ingen UI, setCam, fast frø (to renderinger av 5 bilder gir like bildefiler), byggeskjermen kan åpnes og prøven steges,
// valg som stigende vann settes uten å lagres, vanlig spilling er uendret uten ?cinema, og ingen konsollfeil. Skjermbilder i utmappa.
// node tools/live_cinema.cjs <utmappe> [port]   (server på porten; playwright via NODE_PATH). Exit 1 ved feil. Ingen GPU (swiftshader): ingen FPS-krav.
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8471, base = `http://localhost:${port}/`;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  const open = async (q, vp = { width: 1280, height: 720 }) => {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1 }), pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.goto(base + q); await pg.waitForFunction(() => window.__game && window.__game.player && window.__game.cine, null, { timeout: 90000 });
    return { ctx, pg, errs };
  };
  const POSE = { x: -23, y: 17, z: 23, tx: 20, ty: 4, tz: -2, fov: 62 };
  const frames = async (pg) => pg.evaluate((P) => {                 // 5 bilder: figuren satt, fritt kamera, 5 tikk per bilde, hash av hvert
    const c = window.__game.cine; c.seed(7); c.setHero({ x: -5.5, y: 0, z: 19.4, yaw: 0.5 }); c.setCam(P); const h = [];
    for (let i = 0; i < 5; i++) { c.step(5, 1 / 60); h.push(c.hash()); } return h;
  }, POSE);

  // ---- 1: vanlig spilling uendret (uten ?cinema) ----
  { const { ctx, pg, errs } = await open('?level=bad&start=0');
    const r = await pg.evaluate(() => ({ cls: document.body.classList.contains('cinema') || !!document.getElementById('cinecss'), vis: [...document.body.children].filter((e) => !['CANVAS', 'SCRIPT', 'STYLE'].includes(e.tagName) && getComputedStyle(e).display !== 'none').map((e) => e.id).join(','), rnd: /native code/.test(Math.random.toString()), on: window.__game.cine.isOn, ls: Object.keys(localStorage).length }));
    ok('uten ?cinema: ingen kinoklasse, UI synlig, Math.random er den vanlige', !r.cls && r.vis.length > 0 && r.rnd && !r.on, JSON.stringify(r));
    let thr = false; try { await pg.evaluate(() => window.__game.cine.setCam({ x: 0, y: 1, z: 0, tx: 1, ty: 1, tz: 1 })); } catch { thr = true; } ok('uten ?cinema: kamera-API-et nekter', thr);
    ok('uten ?cinema: ingen konsollfeil', errs.length === 0, errs.join(' | ')); await ctx.close(); }

  // ---- 2: kinomodus på badet: UI, setCam, followCam (egen innlasting) ----
  { const { ctx, pg, errs } = await open('?level=bad&cinema=1&cine_hold=1&cine_seed=3');
    const ui = await pg.evaluate(() => [...document.body.children].filter((e) => e.tagName !== 'CANVAS' && e.id !== 'bld' && e.tagName !== 'SCRIPT' && e.tagName !== 'STYLE' && getComputedStyle(e).display !== 'none').map((e) => e.tagName + '#' + e.id));
    ok('kinomodus: ingen synlig UI (bare tegneflata)', ui.length === 0, ui.join(','));
    const w = await pg.evaluate(() => { const g = window.__game, c = g.cine; return { cls: document.body.classList.contains('cinema'), live: c.live, seed: c.state().seed, ls: Object.keys(localStorage).filter((k) => k.startsWith('tlm.')).length, gm: c.isOn }; });
    ok('kinomodus: på, frosset, frø fra adressen, ingen tlm-nøkler skrevet', w.cls && !w.live && w.seed === 3 && w.ls === 0, JSON.stringify(w));
    await pg.evaluate((P) => { const c = window.__game.cine; c.setHero({ x: -5.5, y: 0, z: 19.4, yaw: 0.5 }); c.setCam(P); c.step(120, 1 / 60); c.render(); }, POSE);
    await pg.screenshot({ path: `${out}/cinema_bad_1280.png` });
    const cm = await pg.evaluate(() => { const c = window.__game.camera, d = new c.position.constructor(); c.getWorldDirection(d); return { p: [c.position.x, c.position.y, c.position.z], d: [d.x, d.y, d.z], fov: c.fov }; });
    const want = (() => { const v = [20 + 23, 4 - 17, -2 - 23], l = Math.hypot(...v); return v.map((q) => q / l); })();
    ok('setCam: kameraet står og ser som oppgitt', Math.hypot(cm.p[0] + 23, cm.p[1] - 17, cm.p[2] - 23) < 1e-3 && Math.hypot(cm.d[0] - want[0], cm.d[1] - want[1], cm.d[2] - want[2]) < 1e-3 && Math.abs(cm.fov - 62) < 1e-6, JSON.stringify(cm));
    const fc = await pg.evaluate(() => { const c = window.__game.cine; c.releaseCam(); c.setHero({ x: -5.5, y: 0, z: 19.4, yaw: 0.5 }); c.step(60, 1 / 60); c.followCam({ dist: 6, yaw: 0.8, pitch: 0.25, height: 1.2 }); c.render(); const g = window.__game, h = c.hero, cp = g.camera.position; return { d: Math.hypot(cp.x - h.x, cp.y - (h.y + 1.2), cp.z - h.z), h }; });
    ok('followCam: kameraet står ca. 6 fra blikkpunktet', Math.abs(fc.d - 6) < 0.6, JSON.stringify(fc));
    await pg.screenshot({ path: `${out}/cinema_bad_follow.png` });
    ok('kinomodus: ingen konsollfeil', errs.length === 0, errs.join(' | ')); await ctx.close(); }
  // ---- 2b: hash-test: to helt like kjøringer (hver i sin innlasting) av 5 bilder ----
  const hashes = [];
  for (const run of [1, 2]) { const { ctx, pg, errs } = await open('?level=bad&cinema=1&cine_hold=1&cine_seed=3'); await pg.waitForTimeout(3000); hashes.push(await frames(pg)); ok(`hash-kjøring ${run}: ingen konsollfeil`, errs.length === 0, errs.join(' | ')); await ctx.close(); }
  console.log(hashes.map((h) => h.join(' ')).join('\n'));
  ok('hash-test: to renderinger av 5 bilder gir identiske bildefiler', hashes[0].join() === hashes[1].join() && new Set(hashes[0]).size > 1, hashes[0].join(','));

  // ---- 3: stigende vann satt uten å lagres, bygg ----
  { const { ctx, pg, errs } = await open('?level=bad2&cinema=1&cine_hold=1&cine_opt=tlm.flood:rask;tlm.floodrate:2.5');
    const r = await pg.evaluate(() => { const c = window.__game.cine; const v = c.set('flood', 'vanlig'); return { v, ls: Object.keys(localStorage).filter((k) => k.startsWith('tlm.')).length }; });
    ok('cine.set: stigende vann settes uten å lagres', r.v === 'vanlig' && r.ls === 0, JSON.stringify(r)); ok('kinomodus (vann): ingen konsollfeil', errs.length === 0, errs.join(' | ')); await ctx.close(); }
  { const { ctx, pg, errs } = await open('?level=bygglab&cinema=1&cine_hold=1');
    const r = await pg.evaluate(() => { const c = window.__game.cine, B = c.build, bl = window.__game.bld; const sites = B.sites(); if (bl.active) B.close(); const o = B.open('lab7'); const a1 = bl.active; const placed = B.place('lab7'); const t0 = B.start(); B.step(0.4); const s1 = JSON.stringify(bl.result); return { sites, o, a1, placed, t0, s1 }; });
    ok('cine.build: åpner et byggested, legger inn referansebygget og starter prøven', r.a1 && r.placed && r.t0 && r.sites.length >= 7, JSON.stringify(r)); await pg.screenshot({ path: `${out}/cinema_bygg_1.png` });
    const r2 = await pg.evaluate(() => { const bl = window.__game.bld, c = window.__game.cine; const t = []; for (let i = 0; i < 40 && bl.running; i++) { c.build.step(0.25); t.push(+bl.result.t.toFixed(2)); } return { res: bl.result, t: t.slice(0, 4), n: t.length }; });
    ok('cine.build: prøven stegges (tiden vokser) og ender i seier eller brudd', r2.res && r2.res.t > 0.5 && r2.t[1] > r2.t[0] && ['won', 'lost'].includes(r2.res.state), JSON.stringify(r2)); await pg.screenshot({ path: `${out}/cinema_bygg_2.png` });
    ok('kinomodus (bygg): ingen konsollfeil', errs.length === 0, errs.join(' | ')); await ctx.close(); }
  await b.close(); console.log(bad ? `${bad} feil` : 'alt ok'); process.exit(bad ? 1 : 0);
})();
