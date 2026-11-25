// R188: ⚙ Innstillinger (iPhone 14): Topp 10 øverst, endres etter bruk, ÅPNE ALLE / LUKK ALLE.
// Kjør: NODE_PATH=$(npm root -g) node tools/live_settings.cjs [skjermbildemappe]
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = process.argv[2] || '/tmp';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
  if (!p.startsWith(root) || !fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(p).pipe(r); });
(async () => {
  await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await (await b.newContext({ ...devices['iPhone 14'] })).newPage(); const errs = []; let ok = true;
  const check = (n, c, d) => { console.log((c ? '✓ ' : '✗ ') + n + (d ? ' · ' + d : '')); if (!c) ok = false; };
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && !/Failed to load resource|net::/.test(m.text()) && errs.push(m.text()));
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.bygging.moved', 'true'); localStorage.setItem('tlm.cleared', JSON.stringify({ 1: 100 })); } catch (e) { /* */ } });
  await pg.goto(`http://localhost:${port}/?level=bad&start=0`); await pg.waitForSelector('#bSet', { state: 'attached', timeout: 180000 }); await pg.waitForTimeout(2500);
  await pg.mouse.click(200, 400); await pg.waitForTimeout(1500);   // hopp over introen
  await pg.dispatchEvent('#bSet', 'click'); await pg.waitForSelector('#panel details[data-g="top"]', { timeout: 15000 }).catch(() => {});
  const ids = () => pg.evaluate(() => [...document.querySelectorAll('#panel details[data-g="top"] [data-s]')].map((e) => e.dataset.s));
  const first = await ids(); check('Topp 10 står øverst med 10 innstillinger', first.length === 10 && (await pg.evaluate(() => document.querySelector('#panel details[data-g]').dataset.g)) === 'top', first.join(','));
  await pg.evaluate(() => { const c = document.getElementById('c'); if (c) c.style.display = 'none'; });   // 3D-bildet bremser skjermbilder i headless
  await pg.screenshot({ path: `${out}/settings_top.png` });
  // endre en innstilling som ikke står i listen (via gruppe) og se at den kommer med
  const target = await pg.evaluate((first) => { const el = [...document.querySelectorAll('#panel details[data-g]:not([data-g="top"]):not([data-g="admin"]) input[type=checkbox][data-s]')].find((e) => !first.includes(e.dataset.s)); return el ? el.dataset.s : ''; }, first);
  check('fant en innstilling utenfor Topp 10', !!target, target);
  await pg.evaluate((t) => { const el = document.querySelector(`#panel details:not([data-g="top"]) [data-s="${t}"]`); el.checked = !el.checked; el.dispatchEvent(new Event('change', { bubbles: true })); }, target); await pg.waitForTimeout(300);
  const use = await pg.evaluate(() => JSON.parse(localStorage.getItem('tlm.setuse') || '{}')); check('endringen telles', use[target] === 1, JSON.stringify(use));
  await pg.evaluate(() => document.getElementById('closePanel').click()); await pg.waitForTimeout(300); await pg.dispatchEvent('#bSet', 'click'); await pg.waitForTimeout(600);
  const second = await ids(); check('innstillingen du brukte kommer øverst i Topp 10', second[0] === target, second.slice(0, 3).join(','));
  await pg.evaluate(() => document.getElementById('pCloseAll').click()); await pg.waitForTimeout(300);
  check('LUKK ALLE lukker gruppene', (await pg.evaluate(() => [...document.querySelectorAll('#panel details[data-g]')].filter((d) => d.open).length)) === 0);
  await pg.evaluate(() => document.getElementById('pOpenAll').click()); await pg.waitForTimeout(300);
  check('ÅPNE ALLE åpner gruppene', (await pg.evaluate(() => [...document.querySelectorAll('#panel details[data-g]')].filter((d) => d.open).length)) >= 5);
  console.log(errs.length ? 'FEIL: ' + errs.slice(0, 3).join(' | ') : 'ingen konsollfeil'); await b.close(); srv.close(); process.exit(errs.length || !ok ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
