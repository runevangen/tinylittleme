// Oppstartstest: åpner index.html i en ekte nettleser (Playwright, iPhone 14) og sjekker at spillet starter.
// npm test kjører bare koden i node og fanger IKKE feil som stopper hele siden (f.eks. manglende eksport, 404 på en modul, syntaksfeil).
// Kjør: node tools/boot_check.cjs   (playwright via NODE_PATH, f.eks. NODE_PATH=$(npm root -g)). Exit 1 ved feil. Bruker ca. 30 s uten GPU.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
  if (!p.startsWith(root) || !fs.existsSync(p)) { r.writeHead(404); r.end('mangler'); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(p).pipe(r);
});
(async () => {
  await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const bad = [];
  for (const url of ['/', '/?level=bad&start=0']) {
    const pg = await (await b.newContext({ ...devices['iPhone 14'] })).newPage(); const errs = [];
    pg.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 250)));
    pg.on('console', (m) => m.type() === 'error' && errs.push('console: ' + m.text().slice(0, 250)));
    pg.on('response', (r) => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url().slice(-80)); });
    await pg.goto(`http://localhost:${port}${url}`);
    const ok = await pg.waitForFunction(() => window.__game && window.__game.LEVEL, null, { timeout: 120000 }).then(() => true, () => false);
    const ver = await pg.evaluate(() => (document.getElementById('hud') || {}).textContent || '').catch(() => '');
    console.log(`${url}: ${ok ? 'startet' : 'STARTET IKKE'}${errs.length ? ', ' + errs.length + ' feil' : ''}${ver ? ' · ' + ver.trim().slice(0, 40) : ''}`);
    if (!ok || errs.length) bad.push(`${url}: ${ok ? '' : 'startet ikke; '}${errs.slice(0, 3).join(' | ')}`);
    await pg.context().close();
  }
  await b.close(); srv.close();
  if (bad.length) { console.error('OPPSTARTSTEST FEILET:\n' + bad.join('\n')); process.exit(1); }
  console.log('boot: ok');
})().catch((e) => { console.error('OPPSTARTSTEST FEILET:', e.message); process.exit(1); });
