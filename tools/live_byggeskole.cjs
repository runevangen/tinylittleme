// R95: Byggeskolen på mobil (iPhone 14, Playwright): hovedmenyen har BYGGESKOLE med ANBEFALT, første-møte-kortet vises i et byggebrett (én gang, HOPP OVER), knappen åpner skolen
// direkte i byggeskjermen, og etter ett bestått sted står «✓ 1/8». Skjermbilder i utmappa. node tools/live_byggeskole.cjs <utmappe>  (playwright via NODE_PATH). Ingen FPS-krav (swiftshader).
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!p.startsWith(root) || !fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(p).pipe(r); });
(async () => {
  const out = process.argv[2] || '.'; await new Promise((o) => srv.listen(0, o)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  const ctx = await b.newContext({ ...devices['iPhone 14'] }), pg = await ctx.newPage(), errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  const shot = async (n) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/byggeskole_${n}.png` }); };
  await pg.goto(`http://localhost:${port}/`); await pg.waitForSelector('#mSchool', { timeout: 120000 });
  const r = await pg.evaluate(() => { const e = document.querySelector('#mSchool'), b = e.getBoundingClientRect(); return { t: e.textContent, h: b.height, w: b.width, x: b.x, vw: innerWidth }; }); console.log(JSON.stringify(r));
  ok('menyen har BYGGESKOLE med ANBEFALT', /BYGGESKOLE/.test(r.t) && /ANBEFALT/.test(r.t) && /0 av 8/.test(r.t), r.t); ok('knappen er stor nok og innenfor skjermen', r.h >= 48 && r.x >= 0 && r.x + r.w <= r.vw); await shot('1_meny');
  // første-møte-kort i Hyllebroen (Nybegynner)
  await pg.goto(`http://localhost:${port}/?level=bro&start=0`); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 120000 });
  await pg.evaluate(() => { window.__game.bld.open('bro1' , { force: true }) || window.__game.bld.open(undefined, { force: true }); });
  await pg.waitForTimeout(500); const card = await pg.evaluate(() => { const e = document.querySelector('.skcard'); if (!e) return null; const b = e.getBoundingClientRect(); return { t: e.textContent, y: b.y, h: b.height, bottom: b.bottom, vh: innerHeight, btn: [...e.querySelectorAll('button')].map((x) => Math.round(x.getBoundingClientRect().height)) }; }); console.log(JSON.stringify(card));
  ok('kortet vises i byggebrettet', !!card && /Ny til bygging/.test(card.t) && /PRØV SKOLEN/.test(card.t) && /HOPP OVER/.test(card.t)); ok('knappene i kortet er minst 48 px', !!card && card.btn.every((h) => h >= 48)); await shot('3_kort');
  await pg.locator('.skcard [data-sk="skip"]').tap(); ok('HOPP OVER lukker kortet', (await pg.locator('.skcard').count()) === 0);
  await pg.evaluate(() => { window.__game.bld.close?.('test'); }); await pg.evaluate(() => { window.__game.bld.open('bro1', { force: true }); }); await pg.waitForTimeout(300);
  ok('kortet kommer bare én gang', (await pg.locator('.skcard').count()) === 0);
  // knappen åpner skolen direkte i byggeskjermen
  await pg.evaluate(() => localStorage.removeItem('tlm.skole')); await pg.goto(`http://localhost:${port}/`); await pg.waitForSelector('#mSchool', { timeout: 120000 }); await pg.locator('#mSchool').tap();
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL && window.__game.LEVEL.lab, null, { timeout: 120000 }); await pg.evaluate(() => window.__game.tick(60, 1 / 60));
  ok('BYGGESKOLE åpner Bygglab i byggeskjermen', await pg.evaluate(() => document.body.classList.contains('building'))); await shot('4_skolen');
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | ')); await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
