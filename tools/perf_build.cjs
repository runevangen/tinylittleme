// R109: tid per bilde i byggeskjermen med og uten 3D-pause (Chromium uten GPU, SwiftShader, CPU-struping ×4), og DOM-skrivinger per bilde/berøring.
// node tools/perf_build.cjs [port]  (playwright via NODE_PATH). Tallene er relative (SwiftShader), ikke iPhone-fps: ekte følelse «testes på iPhone».
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(p).pipe(r); });
(async () => {
  await new Promise((ok) => srv.listen(+process.argv[2] || 0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] }), pg = await ctx.newPage();
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.buildall', 'true'); localStorage.setItem('tlm.cbxhand', '1'); localStorage.setItem('tlm.skole', JSON.stringify({ opened: true, card: 'skipped', done: false })); } catch (e) { /* ok */ } });
  await pg.goto(`http://localhost:${port}/?level=trapp`); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 90000 }); await pg.evaluate(() => window.__game.tick(30, 1 / 60));
  const cdp = await ctx.newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await pg.evaluate(() => { window.__game.bld.open('trapp1', { force: true }); window.__game.tick(4, 1 / 60); });
  const meas = (noPause) => pg.evaluate((np) => new Promise((res) => { window.__noPause3d = np; let n = 0, worst = 0, last = performance.now(); const t0 = last; const f = (t) => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < 5000) requestAnimationFrame(f); else res({ ms: (t - t0) / n, worst }); }; requestAnimationFrame(f); }), noPause);
  const before = await meas(true), after = await meas(false);
  const w = await pg.evaluate(() => { const g = window.__game.bld.touch; g.resetWrites(); const t0 = performance.now(); return new Promise((r) => { let n = 0; const f = () => { if (++n < 60) requestAnimationFrame(f); else r(g.writes); }; requestAnimationFrame(f); }); });
  console.log(JSON.stringify({ msPerFrameBefore: +before.ms.toFixed(1), msPerFrameAfter: +after.ms.toFixed(1), worstBefore: +before.worst.toFixed(0), worstAfter: +after.worst.toFixed(0), domWritesPer60Frames: w }));
  await b.close(); srv.close();
})();
