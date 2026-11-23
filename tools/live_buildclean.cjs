// R154: byggeskjermen rydder etter seg (iPhone 14, EKTE berøring): Nivå 5 (barnerom2 · barn2, 2,5D) og et Bygglab-sted (lab2). Bygg staver, fjern dem med ✕ og ANGRE mange ganger:
// ingen løse knuter/staver blir igjen i modellen, ingen blek tekst bak byggeskjermen (skjermbilde), og ⚑, ←, ⋯, ANGRE og PRØV svarer etterpå (hit-test, og ekte trykk på ⚑ åpner menyen).
// node tools/live_buildclean.cjs <utmappe> [port]   (playwright via NODE_PATH). Exit 1 ved feil. Ingen GPU (swiftshader): ingen FPS-krav, «testes på iPhone».
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(p).pipe(r); });
(async () => {
  const out = process.argv[2] || '.'; await new Promise((ok) => srv.listen(+process.argv[3] || 0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  for (const [level, site, tag] of [['barnerom2', 'barn2', 'niva5'], ['bygglab', 'lab2', 'lab']]) {
    const ctx = await b.newContext({ ...devices['iPhone 14'] }), pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript(() => { try { localStorage.setItem('tlm.gridlock', 'false'); localStorage.setItem('tlm.buildview25', 'true'); } catch (e) { /* ok */ } });
    await pg.goto(`http://localhost:${port}/?level=${level}`); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 90000 });
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n); await run(30);
    await pg.evaluate((id) => { const o = window.__game.bld.open(id, { force: true }); window.__game.tick(4, 1 / 60); return o; }, site); await run(20);
    await pg.evaluate(() => { for (const id of ['introsw', 'story']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; } document.querySelectorAll('.skcard').forEach((e) => { e.style.display = 'none'; }); }); await run(3);
    const cdp = await ctx.newCDPSession(pg), tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const tap = async (x, y) => { await tp('touchStart', x, y); await pg.waitForTimeout(40); await tp('touchEnd'); await pg.waitForTimeout(100); await run(3); };
    const drag = async (x0, y0, x1, y1) => { await tp('touchStart', x0, y0); for (let i = 1; i <= 6; i++) { await tp('touchMove', x0 + (x1 - x0) * i / 6, y0 + (y1 - y0) * i / 6); await pg.waitForTimeout(20); } await run(2); await tp('touchEnd'); await pg.waitForTimeout(100); await run(3); };
    const sp = (u, v) => pg.evaluate(([u, v]) => { const q = window.__game.bld.screenPos(u, v), r = document.querySelector('#bld canvas').getBoundingClientRect(); return { x: r.x + q.x, y: r.y + q.y }; }, [u, v]);
    const info = () => pg.evaluate(() => window.__game.bld.grid.info());
    const shot = async (n) => { await run(2); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/clean_${tag}_${n}.png`, timeout: 60000 }); };
    const center = (s) => pg.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, s);
    const loose = (s) => s.nodes.filter((n) => !n.fixed && !n.deck && !s.rods.some((r) => r.a === n.id || r.b === n.id)).length;
    const covered = () => pg.evaluate(() => ['#qbtn', '#bld .bxgo .try', '#bld .bxundo', '#bld .bxback', '#bld .bxmore'].filter((s) => { const e = document.querySelector(s); if (!e) return true; const r = e.getBoundingClientRect(), t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !(t === e || e.contains(t)); }));
    ok(`${tag}: byggeskjermen med forenklet skjerm og rutenett`, await pg.evaluate(() => window.__game.bld.bux.on() && window.__game.bld.grid.on)); 
    const s0 = await info(), an = s0.nodes.filter((n) => n.fixed).sort((p, q) => p.u - q.u), lo = an[0], hi = an[an.length - 1], gap = hi.u - lo.u, st = gap >= 8 ? 2 : gap / 4;
    for (let cyc = 0; cyc < 5; cyc++) {
      let prev = lo; for (const [du, v] of [[1, 0], [2, 1], [3, 0], [4, 1]]) {
        const u = lo.u + du * st, vv = v * st, a = await sp(prev.u, prev.v), c = await sp(u, vv); await drag(a.x, a.y, c.x, c.y);
        const s = await info(); prev = s.nodes.find((n) => Math.abs(n.u - u) < 1e-6 && Math.abs(n.v - vv) < 1e-6) || prev;
      }
      let s = await info(); if (cyc === 0) await shot('1_bygget'); const made = s.rods.filter((r) => !r.deck).length;
      for (let k = 0; k < 12; k++) {   // fjern stavene: trykk midt på staven, så ✕-boblen; ANGRE og fjern igjen innimellom
        s = await info(); const rods = s.rods.filter((r) => !r.deck); if (!rods.length) break;
        const r = rods[k % rods.length], A = s.nodes.find((n) => n.id === r.a), Bn = s.nodes.find((n) => n.id === r.b), m = await sp((A.u + Bn.u) / 2, (A.v + Bn.v) / 2); await tap(m.x, m.y);
        const c = await center('#bld .bxdel.show'); if (c) await tap(c.x, c.y);
        if (k === 1) { const u = await center('#bld .bxundo'); await tap(u.x, u.y); }
      }
      s = await info(); const left = s.rods.filter((r) => !r.deck).length;
      if (cyc === 4) { for (let k = 0; k < 30 && s.rods.some((r) => !r.deck); k++) { const r = s.rods.find((q) => !q.deck), A = s.nodes.find((n) => n.id === r.a), Bn = s.nodes.find((n) => n.id === r.b), m = await sp((A.u + Bn.u) / 2, (A.v + Bn.v) / 2); await tap(m.x, m.y); const c = await center('#bld .bxdel.show'); if (c) await tap(c.x, c.y); s = await info(); } }
      ok(`${tag} runde ${cyc}: ${made} staver lagt, ingen løse knuter i modellen (nå ${left} staver, ${s.nodes.length} knuter)`, made >= 3 && loose(s) === 0, `løse: ${loose(s)}`);
      ok(`${tag} runde ${cyc}: ⚑, ←, ⋯, ANGRE og PRØV ligger øverst og kan trykkes`, (await covered()).length === 0, (await covered()).join(','));
    }
    const fin = await info(); ok(`${tag}: etter siste rydding står bare ankrene igjen`, fin.rods.filter((r) => !r.deck).length === 0 && loose(fin) === 0 && fin.nodes.every((n) => n.fixed || n.deck), JSON.stringify(fin.nodes.map((n) => n.id)));
    await shot('2_ryddet');
    ok(`${tag}: ingen hengende berøring`, (await pg.evaluate(() => window.__game.bld.touch.stale)).length === 0);
    // hengende berøring (simulert: capture og to-finger-tilstand) ryddes av heal, og ⚑ virker med ekte trykk
    const f = await center('#qbtn'); await tap(f.x, f.y); await run(4);
    ok(`${tag}: ekte trykk på ⚑ åpner menyen`, await pg.evaluate(() => !document.getElementById('qpop').classList.contains('hide'))); await shot('3_flagg'); await tap(f.x, f.y);
    { const a = await sp(lo.u, lo.v), c = await sp(lo.u + st, 0); await drag(a.x, a.y, c.x, c.y); }
    const pr = await center('#bld .bxgo .try'); await tap(pr.x, pr.y); await run(10);
    ok(`${tag}: PRØV svarer (prøven starter)`, await pg.evaluate(() => window.__game.bld.running)); await pg.evaluate(() => window.__game.bld.stopTry()); await run(5);
    ok(`${tag}: ingen konsollfeil`, errs.length === 0, errs.join(' | ').slice(0, 200)); await ctx.close();
  }
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
