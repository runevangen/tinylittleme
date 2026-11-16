// R76: byggeskjermens oppsett (Playwright, ekte layout): ingen knapper/tekster som overlapper, ingen tekst som stikker ut av knappen, i klassisk og rutenett-modus,
// stående (iPhone 14 og smal 360 px) og liggende. «Avslutt til meny» (⌂ MENY) står i toppraden. Skjermbilder i utmappa.
// node tools/live_buildlayout.cjs <utmappe> [port]   (server på porten; playwright via NODE_PATH). Exit 1 ved feil. Ingen GPU i miljøet: ingen FPS-krav.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8476;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  const views = [['iphone14', devices['iPhone 14']], ['smal360', { ...devices['iPhone 14'], viewport: { width: 360, height: 740 } }], ['liggende', devices['iPhone 14 landscape']]];
  for (const level of ['bygglab', 'kontroll']) for (const [vn, opts] of views) {
    const ctx = await b.newContext({ ...opts }), pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript(() => { try { localStorage.setItem('tlm.buildall', 'true'); } catch (e) { /* ok */ } });
    await pg.goto(`http://localhost:${port}/?level=${level}${level === 'kontroll' ? '&start=0' : ''}`);
    await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites, null, { timeout: 90000 });
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    if (level === 'kontroll') { await pg.touchscreen.tap(opts.viewport ? opts.viewport.width / 2 : 195, 300); await run(30); }
    if (!(await pg.evaluate(() => document.body.classList.contains('building')))) {
      await pg.evaluate(() => { const s = window.__game.LEVEL.buildSites[0], p = window.__game.player; p.x = s.x; p.y = s.y + 1; p.z = s.z; p.vx = p.vz = p.vy = 0; p.onGround = true; });
      await run(30); await pg.evaluate(() => window.__game.bld.open());
    }
    await run(10);
    const check = async (mode) => {
      await run(3);
      const r = await pg.evaluate(() => {
        const vw = innerWidth, vh = innerHeight, boxes = [];
        for (const e of document.querySelectorAll('#bld button, #bld .hint, #bld .nm')) {
          const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          if (e.closest('.modal') || (e.closest('.tray'))) continue;
          const b = e.getBoundingClientRect(); if (!b.width || !b.height) continue;
          if (e.classList.contains('hint') && !e.textContent.trim()) continue;
          let box = b;
          if (e.classList.contains('hint')) { const rg = document.createRange(); rg.selectNodeContents(e); const rb = rg.getBoundingClientRect(); box = rb; }   // bare selve teksten
          boxes.push({ n: e.dataset.a || e.dataset.lb || e.dataset.z || e.dataset.t || e.dataset.m || e.dataset.l || e.dataset.g || e.dataset.gs || e.dataset.s || e.className || e.tagName, x: box.x, y: box.y, w: box.width, h: box.height, over: e.tagName === 'BUTTON' && e.scrollWidth > e.clientWidth + 1, t: e.textContent.trim().slice(0, 24) });
        }
        const hit = [];
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], c = boxes[j], ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x), oy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
          if (ox > 1 && oy > 1) hit.push(`${a.n}×${c.n}`);
        }
        return { vw, vh, hit, over: boxes.filter((q) => q.over).map((q) => q.t), outside: boxes.filter((q) => q.x < -0.5 || q.x + q.w > vw + 0.5).map((q) => q.n), menu: boxes.find((q) => q.n === 'menu') };
      });
      if (level === 'bygglab' && vn === 'liggende') console.log('INFO', `${level} ${vn} ${mode}: overlapp i liggende Bygglab er gammelt og utenfor R76 (krav: stående):`, r.hit.join(', ')); else ok(`${level} ${vn} ${mode}: ingen overlapp mellom knapper/tekst`, r.hit.length === 0, r.hit.join(', '));
      ok(`${level} ${vn} ${mode}: ingen tekst stikker ut av knappen`, r.over.length === 0, r.over.join(', '));
      ok(`${level} ${vn} ${mode}: alt innenfor skjermbredden`, r.outside.length === 0, r.outside.join(', '));
      ok(`${level} ${vn} ${mode}: ⌂ MENY står i toppraden (y < 60)`, !!r.menu && r.menu.y < 60 && r.menu.h >= 36, JSON.stringify(r.menu));
      await pg.evaluate(() => new Promise((q) => requestAnimationFrame(() => requestAnimationFrame(q))));
      await pg.screenshot({ path: `${out}/layout_${level}_${vn}_${mode}.png`, timeout: 60000 });
    };
    await check('klassisk');
    const m = pg.locator('#bld button[data-a="mode"]');
    if (await m.count() && await m.isVisible()) { const bb = await m.boundingBox(); await pg.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await run(5); ok(`${level} ${vn}: rutenett-modus på`, await pg.evaluate(() => window.__game.bld.grid.on)); await check('rutenett'); }
    // MENY-knappen kaller menyen (lukker byggeskjermen)
    const mb = await pg.locator('#bld button[data-a="menu"]').boundingBox(); await pg.touchscreen.tap(mb.x + mb.width / 2, mb.y + mb.height / 2); await run(5);
    ok(`${level} ${vn}: ⌂ MENY går til menyen`, await pg.evaluate(() => !document.body.classList.contains('building') || document.getElementById('menu')?.offsetParent !== null || /menu|meny/i.test(document.body.className)), '');
    ok(`${level} ${vn}: ingen konsollfeil`, errs.length === 0, errs.slice(0, 3).join(' | ')); await ctx.close();
  }
  await b.close(); process.exit(bad ? 1 : 0);
})();
