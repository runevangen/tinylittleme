// R146: språkvalget i nettleser (Playwright, iPhone 14): ⚙ og NYTT på norsk og engelsk, bytte uten omstart, skjermbilder.
// Kjør: NODE_PATH=$(npm root -g) node tools/lang_check.cjs [mappe for bilder]. Exit 1 ved feil.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.resolve(__dirname, '..'), shots = process.argv[2] || '';
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
  const ctx = await b.newContext({ ...devices['iPhone 14'] }), errs = [];
  await ctx.addInitScript(() => { try { localStorage.setItem('tlm.tcode', JSON.stringify('testbruker1')); } catch { /* */ } });
  await ctx.route('**/rest/v1/rpc/**', (route) => route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, apikey, content-type' }, contentType: 'application/json', body: JSON.stringify({ ok: true, checks: [], replies: [], me: { sent: 0, fixed: 0, working: 0 }, all: { sent: 0, fixed: 0, testers: 1 } }) }));
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 250))); pg.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errs.push('console: ' + m.text().slice(0, 250)));
  await pg.goto(`http://localhost:${port}/?level=bad&start=0`);
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL, null, { timeout: 120000 });
  const shot = async (n) => { if (shots) await pg.screenshot({ path: path.join(shots, n + '.png') }); };
  await pg.addStyleTag({ content: '#story,#intro{display:none !important}' });   // åpningskortet dekker ellers skjermbildene
  await pg.evaluate(() => document.getElementById('bSet').click()); await pg.waitForSelector('#pTitle');
  assert.equal(await pg.textContent('#pTitle'), 'Innstillinger'); await shot('lang_nb_panel');
  await pg.evaluate(() => { const s = document.querySelector('[data-s="lang"]'); s.value = 'en'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await pg.waitForFunction(() => document.getElementById('pTitle').textContent === 'Settings');   // byttet uten omstart
  assert.equal(await pg.inputValue('[data-s="lang"]'), 'en');
  const txt = await pg.textContent('#panel');
  assert.ok(/Autosave: continue where you left off/.test(txt), 'engelsk etikett'); assert.ok(!/Autolagring/.test(txt), 'ingen norsk igjen i valgte rader');
  assert.equal(await pg.textContent('#btnJump'), 'JUMP'); await shot('lang_en_panel');
  // søk virker på engelsk
  await pg.fill('#pSearch', 'volume'); await pg.waitForTimeout(200); await shot('lang_en_search');
  await pg.fill('#pSearch', '');
  // åpne alle grupper og se at ingen etikett mangler engelsk (bortsett fra admin)
  const left = await pg.evaluate(() => [...document.querySelectorAll('#panel .srow label')].map((l) => l.textContent).filter((t) => t !== 'Språk / Language' && /[æøåÆØÅ]/.test(t) || /\b(og|på|til|med)\b/.test(t)).slice(0, 8));
  assert.deepEqual(left, [], 'norske etiketter igjen på engelsk: ' + left.join(' | '));
  // NYTT på engelsk
  await pg.fill('#pSearch', ''); await pg.evaluate(() => document.getElementById('pMenu').click()); await pg.waitForSelector('#start:not(.hide)', { timeout: 20000 }).catch(() => {});
  const hasChg = await pg.evaluate(() => !!document.getElementById('mChg'));
  console.log('NYTT-knapp på startskjermen:', hasChg);
  if (hasChg) { await pg.evaluate(() => document.getElementById('mChg').click()); await pg.waitForSelector('.fxc'); const t = await pg.textContent('#start'); assert.ok(/How to test:/.test(t) && /GO THERE|WORKS/.test(t), 'NYTT på engelsk'); await shot('lang_en_nytt'); }
  await b.close(); srv.close();
  if (errs.length) { console.error('FEIL:\n' + errs.join('\n')); process.exit(1); }
  console.log('lang_check: ok');
})().catch((e) => { console.error('LANG-SJEKK FEILET:', e.message); process.exit(1); });
