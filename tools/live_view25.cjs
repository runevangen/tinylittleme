// R137: 2,5D-visning på iPhone 14 (stående og liggende): Hyllebroen og et Bygglab-sted, før (av) og etter (på) med skjermbilder; ekte trykk treffer samme rutenettpunkter; ingen konsollfeil.
// node tools/live_view25.cjs <utmappe> [port]   (server på porten; playwright via NODE_PATH). Ingen GPU: ingen FPS-krav, «testes på iPhone».
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8473;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  for (const [level, tag] of [['bro', 'hylle'], ['bygglab', 'lab']]) for (const land of [false, true]) for (const t25 of [false, true]) {
    const dev = { ...devices['iPhone 14'] }; if (land) { dev.viewport = { width: 844, height: 390 }; dev.screen = { width: 844, height: 390 }; }
    const ctx = await b.newContext(dev), pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript((v) => { try { localStorage.setItem('tlm.buildview25', v); } catch (e) { /* ok */ } }, String(t25));
    await pg.goto(`http://localhost:${port}/?level=${level}`);
    await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 90000 });
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    const shot = async (n) => { await run(3); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/v25_${tag}_${land ? 'land' : 'stand'}_${n}.png`, timeout: 60000 }); };
    const sp = (u, v) => pg.evaluate(([u, v]) => { const q = window.__game.bld.screenPos(u, v), r = document.querySelector('#bld canvas').getBoundingClientRect(); return { x: r.x + q.x, y: r.y + q.y }; }, [u, v]);
    const cdp = await ctx.newCDPSession(pg), tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const ttap = async (x, y) => { await tp('touchStart', x, y); await pg.waitForTimeout(40); await tp('touchEnd'); await pg.waitForTimeout(120); await run(2); };
    await run(30); await pg.evaluate((id) => { const o = window.__game.bld.open(id, { force: true }); window.__game.tick(4, 1 / 60); return o; }, level === 'bro' ? 'bro1' : 'lab1'); await run(20);
    { const sk = pg.getByText('HOPP OVER', { exact: true }); if (await sk.count() && await sk.first().isVisible()) { await sk.first().click(); await run(5); } }   // kortet «Ny til bygging?» skal ikke fange trykkene
    const mb = pg.locator('#bld button[data-a="mode"]'); if (await mb.count() && !(await pg.evaluate(() => window.__game.bld.grid.on))) { const r = await mb.first().boundingBox(); if (r) await ttap(r.x + r.width / 2, r.y + r.height / 2); }
    const a = await pg.evaluate(() => { const g = window.__game.bld.grid; return g.on ? g.info() : null; });
    if (a && t25) {   // bygg to staver med ekte trykk: ankre og et punkt
      const an = a.nodes.filter((n) => n.fixed).slice(0, 2); if (an.length === 2) {
        const lo = an[0].u < an[1].u ? an[0] : an[1], hi = lo === an[0] ? an[1] : an[0], mid = { u: (lo.u + hi.u) / 2, v: lo.v };
        for (const p of [lo, mid, hi]) { const q = await sp(p.u, p.v); await ttap(q.x, q.y); }
        const st = await pg.evaluate(() => window.__game.bld.grid.info()); ok(`${tag} ${land ? 'liggende' : 'stående'} ${t25 ? 'på' : 'av'}: ekte trykk i 2,5D trykk treffer samme rutenettpunkt som tegnet (ny knute midt mellom ankrene)`, st.nodes.some((n) => Math.abs(n.u - mid.u) < 1e-6 && Math.abs(n.v - mid.v) < 1e-6), JSON.stringify(st.rods.length));
      }
    }
    await shot(t25 ? 'paa' : 'av'); ok(`${tag}: valget gjelder (tilt ${t25})`, await pg.evaluate(() => (localStorage.getItem('tlm.buildview25') === 'true')) === t25); ok(`${tag} ${land ? 'liggende' : 'stående'} ${t25 ? 'på' : 'av'}: ingen konsollfeil`, errs.length === 0, errs.join(' | ').slice(0, 200));
    await ctx.close();
  }
  await b.close(); process.exit(bad ? 1 : 0);
})();
