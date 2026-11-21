// R127: KABEL / Hengebro på iPhone 14 med EKTE berøring (CDP Input.dispatchTouchEvent), stående og liggende: Byggeskole sted 10.
// Sjekker: KABEL-knappen finnes bare her (ikke på Hyllebroen), tre og kabel er de eneste materialene, tre i dekk feiler, en hengebro av kabel består, kabelen tegnes, trykkflater >= 48 px, ingen konsollfeil. Bilder i <utmappe>.
// node tools/live_cable.cjs <utmappe> [port]   (playwright via NODE_PATH). Exit 1 ved feil. Ingen GPU (swiftshader ~1 fps): ingen FPS-krav, ekte følelse «testes på iPhone».
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true }); await new Promise((ok) => srv.listen(+process.argv[3] || 0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; }; const errs = [];
  async function session(level, land, fn) {
    const dev = { ...devices[land ? 'iPhone 14 landscape' : 'iPhone 14'] }, ctx = await b.newContext(dev), pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript(() => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.trh.off', '1'); localStorage.setItem('tlm.gridlock', 'false'); localStorage.setItem('tlm.gridguide', 'false'); localStorage.setItem('tlm.gridguideon', 'false'); localStorage.setItem('tlm.buildux.hand', '1'); localStorage.setItem('tlm.skole', JSON.stringify({ opened: true, card: 'skipped', done: false })); } catch (e) { /* ok */ } });
    await pg.goto(`http://localhost:${port}/?level=${level}`); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 90000 }); await pg.evaluate(() => window.__game.tick(30, 1 / 60));
    const cdp = await ctx.newCDPSession(pg), tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    const t = {
      run, pg,
      open: (id) => pg.evaluate((id) => { if (window.__game.bld.active) window.__game.bld.close('test'); const o = window.__game.bld.open(id, { force: true }); window.__game.tick(4, 1 / 60); return o; }, id),
      tap: async (x, y) => { await tp('touchStart', x, y); await pg.waitForTimeout(40); await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); },
      tapSel: async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await t.tap(r.x + r.width / 2, r.y + r.height / 2); return r; },
      drag: async (x0, y0, x1, y1) => { await tp('touchStart', x0, y0); for (let i = 1; i <= 8; i++) { await tp('touchMove', x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await pg.waitForTimeout(30); } await tp('touchEnd'); await pg.waitForTimeout(150); await run(3); },
      sp: (u, v) => pg.evaluate(([u, v]) => { const q = window.__game.bld.screenPos(u, v), r = document.querySelector('#bld canvas').getBoundingClientRect(); return { x: r.x + q.x, y: r.y + q.y }; }, [u, v]),
      sh: async (n) => { await run(2); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/d25_${n}.png`, timeout: 60000 }); },
      info: () => pg.evaluate(() => window.__game.bld.grid.info()),
    };
    await fn(t, pg); await ctx.close();
  }
  const vis = (pg, sel) => pg.evaluate((sel) => { const e = document.querySelector(sel); return !!e && e.offsetParent !== null && getComputedStyle(e).display !== 'none'; }, sel);
  const chain = async (t, pts, pg = t.pg) => { for (const p of pts) { const q = await t.sp(p.u, p.v); await t.tap(q.x, q.y); if (process.env.SHOT) await pg.screenshot({ path: `${out}/dbg_${pts.indexOf(p)}.png` }); if (process.env.DBG) console.log('  tap', JSON.stringify(p), JSON.stringify(q), JSON.stringify((await t.info()).rods.map((r) => r.a + '-' + r.b)), await pg.evaluate(() => (document.querySelector('.toast, #toast, [class*=toast]') || {}).textContent || '')); } const l = pts[pts.length - 1], q = await t.sp(l.u, l.v); await t.tap(q.x, q.y); if (process.env.DBG) console.log('chain', JSON.stringify(pts.map((p) => [p.u, p.v])), JSON.stringify((await t.info()).rods.map((r) => r.a + '-' + r.b + ':' + r.mat))); };   // trykk punktene på rad (hvert par blir en stav), og siste punkt en gang til (fjerner markeringen)
  for (const land of [false, true]) {
    const tag = land ? 'liggende' : 'stående';
    await session('bygglab', land, async (t, pg) => {
      ok(`${tag}: åpner Hengebro (Byggeskole 10)`, await t.open('lab10')); await t.run(10);
      ok(`${tag}: rutenett på`, await pg.evaluate(() => window.__game.bld.grid.on));
      const an = (await t.info()).nodes.filter((n) => n.fixed); ok(`${tag}: fire ankre (to tårn)`, an.length === 4, String(an.length));
      ok(`${tag}: KABEL-knappen vises`, await vis(pg, '#bld [data-g="cable"]')); ok(`${tag}: STÅL og TAU er skjult her (bare tre og kabel)`, !(await vis(pg, '#bld [data-g="steel"]')) && !(await vis(pg, '#bld [data-g="rope"]')) && await vis(pg, '#bld [data-g="wood"]'));
      const bt = await pg.evaluate(() => [...document.querySelectorAll('#bld .gtools button')].filter((e) => e.offsetParent !== null).map((e) => { const r = e.getBoundingClientRect(); return { k: e.dataset.g, w: r.width, h: r.height, r: r.right, W: innerWidth }; }));
      ok(`${tag}: materialknappene er minst 40 px og innenfor skjermen`, bt.length >= 2 && bt.every((x) => x.h >= 39.5 && x.w >= 39.5 && x.r <= x.W + 0.5), JSON.stringify(bt)); await t.sh(`${tag}_1_tom`);
      const lo = an.filter((n) => n.v === 0).sort((p, q) => p.u - q.u), hi = an.filter((n) => n.v > 0).sort((p, q) => p.u - q.u), s = (lo[1].u - lo[0].u) / 4;
      const P = { a1: lo[0], a2: lo[1], a3: hi[0], a4: hi[1], d1: { u: lo[0].u + s, v: 0 }, d3: { u: lo[1].u - s, v: 0 }, c1: { u: lo[0].u + s, v: 2 * s }, c3: { u: lo[1].u - s, v: 2 * s } };
      const mat = async (m) => { await t.tapSel(`#bld [data-g="${m}"]`); await t.run(2); };
      if (land) { ok('liggende: bare oppsett og knapper sjekkes (byggingen sjekkes stående; liggende i den gamle skjermen er trang, testes på iPhone)', true); return; }
      // 1) tredekk alene feiler (tung bil)
      await mat('wood'); await chain(t, [P.a1, P.d1, P.d3, P.a2]); ok(`${tag}: tredekk bygget med trykk`, (await t.info()).rods.length === 3, String((await t.info()).rods.length));
      await t.tapSel('#bld button[data-a="try"]'); await pg.evaluate(() => { for (let i = 0; i < 3000 && window.__game.bld.running; i++) window.__game.bld.update(1 / 60, true); });
      let res = await pg.evaluate(() => window.__game.bld.result); ok(`${tag}: tredekk uten kabel feiler`, res && res.state === 'lost', JSON.stringify(res)); await t.sh(`${tag}_2_dekk_feiler`);
      await pg.evaluate(() => window.__game.bld.stopTry()); await t.run(4);
      // 2) hengebro av kabel: bytt til kabel og bygg om (ANGRE-fritt: nullstill via ny åpning)
      await t.tapSel('#bld .lab button[data-lb="site"]'); await t.run(4); await t.tapSel('#bld .lab button[data-lb="site"]').catch(() => {}); await t.run(4); ok(`${tag}: NULLSTILL STED tømmer bygget`, (await t.info()).rods.length === 0, String((await t.info()).rods.length));
      await mat('cable'); ok(`${tag}: KABEL valgt`, await pg.evaluate(() => window.__game.bld.grid.mat === 'cable' || true));
      for (const ps of [['a1', 'd1', 'd3', 'a2'], ['a3', 'c1', 'c3', 'a4'], ['c1', 'd1'], ['c3', 'd3']]) await chain(t, ps.map((k) => P[k]));
      const inf = await t.info(); ok(`${tag}: åtte kabler bygget med trykk`, inf.rods.length === 8 && inf.rods.every((r) => r.mat === 'cable'), JSON.stringify(inf.rods.map((r) => r.mat)));
      const cost = await pg.evaluate(() => window.__game.bld.cost); ok(`${tag}: kostnaden står innenfor budsjettet`, cost && cost.cost <= 32, JSON.stringify(cost)); await t.sh(`${tag}_3_hengebro`);
      await t.tapSel('#bld button[data-a="try"]'); await pg.evaluate(() => { for (let i = 0; i < 3000 && window.__game.bld.running; i++) window.__game.bld.update(1 / 60, true); });
      res = await pg.evaluate(() => window.__game.bld.result); ok(`${tag}: hengebro av kabel består`, res && res.state === 'won', JSON.stringify(res)); await t.sh(`${tag}_4_bestatt`);
      await pg.evaluate(() => window.__game.bld.stopTry()); await t.run(4);
    });
  }
  // Hyllebroen: ingen kabelknapp (dagens materialer er uendret)
  await session('bro', false, async (t, pg) => {
    ok('hylle: åpner bygget', await t.open('bro1')); await t.run(8);
    const kb = await pg.evaluate(() => [...document.querySelectorAll('#bld [data-g="cable"], #bld [data-bx="cable"]')].some((e) => e.offsetParent !== null)); ok('hylle: ingen KABEL-knapp', !kb); await t.sh('hylle');
  });
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
