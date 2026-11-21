// R120: delene er der fra start, på iPhone 14 med ekte berøring (CDP). Hyllebroen fra ny lagring: åpne byggestedet uten å ha samlet noe, dra en del opp i bildet, bilder.
// Også ⚙-valget av (som før: tomt delebrett). node tools/live_partsbonus.cjs <utmappe> [port]  (playwright via NODE_PATH). Ingen FPS-krav (ingen GPU).
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
(async () => {
  const out = process.argv[2] || '.'; await new Promise((ok) => srv.listen(+process.argv[3] || 0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; }; const errs = [];
  for (const [name, init, expectParts] of [['paa', () => { try { localStorage.setItem('tlm.gridplay', 'false'); } catch {} }, true], ['av', () => { try { localStorage.setItem('tlm.gridplay', 'false'); localStorage.setItem('tlm.partsfromstart', 'false'); } catch {} }, false]]) {
    const ctx = await b.newContext({ ...devices['iPhone 14'] }), pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript(init); await pg.goto(`http://localhost:${port}/?level=bro`); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 90000 }); await pg.evaluate(() => window.__game.tick(30, 1 / 60));
    const cdp = await ctx.newCDPSession(pg), tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    const opened = await pg.evaluate(() => { const o = window.__game.bld.open('bro1', { force: true }); window.__game.tick(4, 1 / 60); return o; });
    ok(name + ': byggestedet åpnes', opened);
    { const sk = pg.getByText('HOPP OVER', { exact: true }); if (await sk.count()) { await sk.first().tap(); await run(3); } }   // «Ny til bygging?»-kortet (R95)
    const chips = await pg.locator('#bld .chip').count(); ok(name + ': delebrettet', expectParts ? chips >= 8 : chips === 0, `${chips} deler`);
    if (expectParts) {
      const l = pg.locator('#bld .chip:visible').first(); const r = await l.boundingBox();
      const q = await pg.evaluate(() => { const s = window.__game.bld.screenPos(0, 0.25), c = document.querySelector('#bld canvas').getBoundingClientRect(); return { x: c.x + s.x, y: c.y + s.y }; });
      const x0 = r.x + r.width / 2, y0 = r.y + r.height / 2; await tp('touchStart', x0, y0); for (let i = 1; i <= 8; i++) { await tp('touchMove', x0 + (q.x - x0) * i / 8, y0 + (q.y - y0) * i / 8); await pg.waitForTimeout(30); } await run(2); await tp('touchEnd'); await pg.waitForTimeout(150); await run(3);
      const placed = await pg.evaluate(() => window.__game.bld.state().builds[0].placed); ok(name + ': del dratt ut uten å ha samlet noe', placed >= 1, `${placed} plassert`);
    }
    await run(2); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/partsbonus_${name}.png`, timeout: 60000 });
    await ctx.close();
  }
  ok('ingen sidefeil', errs.length === 0, errs.slice(0, 3).join(' | ')); await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
