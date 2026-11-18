// R88: Playwright (iPhone 14): med statistikk på sendes bare de listede hendelsene i én gruppe til en falsk server (nettkallet avlyttes, den ekte
// serveren nås aldri); med den av sendes ingenting og ingen cid lages. Kjør: NODE_PATH=$(npm root -g) node tools/stats_check.cjs
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!p.startsWith(root) || !fs.existsSync(p)) { r.writeHead(404); r.end('x'); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(p).pipe(r); });
(async () => {
  await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const bad = []; const shots = process.env.SHOTS || '/tmp';
  for (const on of [true, false]) {
    const ctx = await b.newContext({ ...devices['iPhone 14'] }); const pg = await ctx.newPage(); const posts = []; const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('https://pthpjpxfbfvgoqkqxotj.supabase.co/**', (rt) => { const rq = rt.request(); if (/tlm_events/.test(rq.url())) posts.push(rq.postData()); rt.fulfill({ status: 201, body: '' }); });
    if (!on) await pg.addInitScript(() => { try { localStorage.setItem('tlm.stats', 'false'); } catch {} });
    await pg.goto(`http://localhost:${port}/?level=bad&start=0`);
    await pg.waitForFunction(() => window.__game && window.__game.LEVEL, null, { timeout: 120000 });
    await pg.waitForTimeout(1500);
    if (on) { await pg.evaluate(() => { window.__statsFlush = true; }); }
    await pg.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); dispatchEvent(new Event('pagehide')); });
    await pg.waitForTimeout(1500);
    const cid = await pg.evaluate(() => localStorage.getItem('tlm.statscid'));
    const rows = posts.flatMap((p) => JSON.parse(p));
    const names = rows.map((r) => r.name);
    console.log(`statistikk ${on ? 'på' : 'av'}: ${posts.length} kall, hendelser [${names.join(', ')}], cid ${cid ? 'laget' : 'ingen'}`);
    if (on) {
      if (!posts.length || !names.includes('session_start') || !names.includes('level_start')) bad.push('på: mangler session_start/level_start');
      if (rows.some((r) => !/^[a-z0-9]{8,32}$/.test(r.cid) || /tester|code|mail/i.test(JSON.stringify(r)))) bad.push('på: ugyldig rad');
      if (new Set(rows.map((r) => r.cid)).size !== 1 || !cid) bad.push('på: cid');
      if (posts.length > 1 && posts.length > 2) bad.push('på: ikke gruppert');
    } else if (posts.length || cid) bad.push(`av: sendte ${posts.length} kall, cid ${cid}`);
    if (errs.length) bad.push('feil: ' + errs.slice(0, 2).join(' | '));
    if (on) {
      await pg.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); });
      const open = await pg.evaluate(() => { const b = document.getElementById('bPriv'); return !!b; });
    }
    await ctx.close();
  }
  // PERSONVERN-siden med statistikkavsnitt og knapp
  { const ctx = await b.newContext({ ...devices['iPhone 14'] }); const pg = await ctx.newPage();
    await pg.goto(`http://localhost:${port}/?level=bad&start=0`); await pg.waitForFunction(() => window.__game && window.__game.LEVEL, null, { timeout: 120000 });
    await pg.evaluate(() => { document.querySelector('#gear, #bGear, [aria-label="Innstillinger"]')?.click(); });
    await pg.waitForTimeout(500);
    const clicked = await pg.evaluate(() => { const b = document.getElementById('bPriv'); if (!b) return false; b.click(); return true; });
    await pg.waitForTimeout(500);
    const st = await pg.evaluate(() => { const b = document.querySelector('#privacy [data-stats]'); return b ? b.textContent : null; });
    console.log('PERSONVERN åpnet:', clicked, '· knapp:', st);
    if (!st || !/PÅ/.test(st)) bad.push('PERSONVERN: knapp mangler');
    else { await pg.click('#privacy [data-stats]'); const st2 = await pg.evaluate(() => [document.querySelector('#privacy [data-stats]').textContent, localStorage.getItem('tlm.stats')]); console.log('etter trykk:', st2.join(' · ')); if (!/AV/.test(st2[0]) || st2[1] !== 'false') bad.push('knappen slo ikke av'); }
    await pg.evaluate(() => { document.querySelector('#privacy [data-sec="stats"]')?.scrollIntoView(); });
    await pg.screenshot({ path: `${shots}/r88_privacy.png` });
    await ctx.close(); }
  await b.close(); srv.close();
  if (bad.length) { console.error('STATISTIKK-TEST FEILET:\n' + bad.join('\n')); process.exit(1); }
  console.log('stats_check: ok');
})().catch((e) => { console.error('FEILET:', e.message); process.exit(1); });
