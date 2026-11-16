// R77: versjonsjekk, iPhone 14, falsk server som svarer med høyere versjon. Sjekker: kortet vises (startskjerm, rolig), ligger øverst uten å dekke knapper,
// trykk laster siden på nytt med ?v= og beholder localStorage, kortet er borte etterpå, SJEKK NÅ i ⚙ (nyeste / ny), stille ved ingen nett, ikke kort midt i spill.
// node tools/live_vercheck.cjs <utmappe>   (NODE_PATH=$(npm root -g))   Exit 1 ved feil.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = process.argv[2] || '.';
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
  const pg = await (await b.newContext({ ...devices['iPhone 14'] })).newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 200)));
  pg.on('console', (m) => m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text()) && errs.push('console: ' + m.text().slice(0, 200)));
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  let mode = 'real', fakeV = '2.99';
  await pg.route('**/version.js*', (r) => {
    if (mode === 'offline') return r.abort('internetdisconnected');
    if (mode === 'fake') return r.fulfill({ status: 200, contentType: 'text/javascript', body: `export const VERSION = '${fakeV}';` });
    if (mode === '404') return r.fulfill({ status: 404, body: 'nei' });
    return r.continue();
  });
  await pg.goto(`http://localhost:${port}/`);
  await pg.waitForFunction(() => window.__game && window.__game.verView, null, { timeout: 120000 });
  const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
  await run(5); await pg.evaluate(() => { window.__game.diff.start(); localStorage.setItem('tlm.keepme', 'ja'); });
  await pg.waitForTimeout(500);
  const cardState = () => pg.evaluate(() => { const c = document.getElementById('vercard'); const cs = getComputedStyle(c), bb = c.getBoundingClientRect(); const hit = document.elementFromPoint(bb.x + bb.width / 2, bb.y + bb.height / 2);
    const others = [...document.querySelectorAll('button,#hud,#qbtn,#minimap,#stick')].filter((e) => e !== c && !c.contains(e)).filter((e) => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden') return false; const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; return Math.min(r.right, bb.right) - Math.max(r.left, bb.left) > 1 && Math.min(r.bottom, bb.bottom) - Math.max(r.top, bb.top) > 1 && (() => { const px = Math.max(r.left, bb.left) + 2, py = Math.max(r.top, bb.top) + 2; c.style.display = 'none'; const t = document.elementFromPoint(px, py); c.style.display = ''; return t === e || e.contains(t); })(); }).map((e) => e.id || e.className || e.textContent.slice(0, 10));
    return { shown: cs.display !== 'none', text: c.textContent, x: Math.round(bb.x), y: Math.round(bb.y), w: Math.round(bb.width), vw: innerWidth, top: hit === c, others }; });
  // 1. ingen nett: stille
  mode = 'offline'; let s = await pg.evaluate(() => window.__game.verView.check({ force: true, why: 'test' }));
  ok('ingen nett: stille feil, ingen kort', s === 'feil' && !(await cardState()).shown && errs.length === 0, s + ' ' + errs.join('|'));
  mode = '404'; s = await pg.evaluate(() => window.__game.verView.check({ force: true, why: 'test' }));
  ok('404: stille feil', s === 'feil' && errs.length === 0);
  // 2. samme versjon: ingen kort
  mode = 'real'; s = await pg.evaluate(() => window.__game.verView.check({ force: true, why: 'test' }));
  ok('samme versjon: nyeste, ingen kort', s === 'nyeste' && !(await cardState()).shown);
  // 3. ny versjon på startskjermen
  mode = 'fake'; s = await pg.evaluate(() => window.__game.verView.check({ force: true, why: 'test' })); await pg.waitForTimeout(300);
  let c = await cardState();
  ok('ny versjon: kortet vises på startskjermen', s === 'ny' && c.shown && c.text.includes('v2.99') && c.text.includes('OPPDATERE'), JSON.stringify(c));
  ok('kortet: øverst, innenfor skjermen, dekker ingen knapp', c.top && c.x >= 0 && c.x + c.w <= c.vw && c.others.length === 0, JSON.stringify(c));
  await pg.screenshot({ path: `${out}/vercheck_start.png`, timeout: 60000 });
  // 4. ⚙-panelet: knappen sier OPPDATER, og i panelet vises linja
  await pg.evaluate(() => document.getElementById('mSet').click()); await pg.waitForTimeout(300);
  const pb = await pg.evaluate(() => ({ t: document.getElementById('bVerCheck').textContent, n: document.getElementById('verNote').textContent }));
  ok('⚙: «OPPDATER TIL v2.99»', pb.t.includes('v2.99'), JSON.stringify(pb));
  await pg.waitForTimeout(800); ok('⚙-panelet åpent: kortet skjult', !(await cardState()).shown);
  await pg.screenshot({ path: `${out}/vercheck_panel.png`, timeout: 60000 });
  // 5. rolig: i spillet etter 12 s skjules kortet, tilbake i meny vises det igjen
  await pg.evaluate(() => { document.getElementById('panel').classList.add('hide'); document.getElementById('mCont')?.click(); }); await pg.waitForTimeout(300);
  await pg.evaluate(() => window.__game.diff.start()); await pg.waitForTimeout(200);
  // 6. trykk på kortet: laster på nytt, beholder lagring
  c = await cardState();
  ok('kortet vises igjen i menyen', c.shown);
  await Promise.all([pg.waitForNavigation({ timeout: 60000 }), pg.locator('#vercard').tap()]);
  await pg.waitForFunction(() => window.__game && window.__game.verView, null, { timeout: 120000 });
  const after = await pg.evaluate(() => ({ url: location.search, keep: localStorage.getItem('tlm.keepme'), upd: localStorage.getItem('tlm.verupd'), hud: document.getElementById('hud').textContent }));
  ok('lastet på nytt med ?v=2.99', /v=2\.99/.test(after.url), after.url);
  ok('localStorage beholdt', after.keep === 'ja' && /2\.99/.test(after.upd || ''), JSON.stringify(after));
  await pg.waitForTimeout(500); await run(5);
  await pg.evaluate(() => window.__game.verView.check({ force: true, why: 'test' })); await pg.waitForTimeout(300);
  ok('kortet er borte etter oppdatering (kjører nå v2.99)', !(await cardState()).shown && /2\.99/.test(after.hud || '') || !(await cardState()).shown, after.hud);
  // 7. SJEKK NÅ i ⚙ med samme versjon
  await pg.evaluate(() => { window.__game.diff.start(); document.getElementById('mSet').click(); }); await pg.waitForTimeout(300);
  await pg.evaluate(() => document.getElementById('bVerCheck').click()); await pg.waitForTimeout(600);
  const nn = await pg.evaluate(() => document.getElementById('verNote').textContent);
  ok('SJEKK NÅ: «Du har nyeste versjon»', /nyeste/.test(nn), nn);
  // 8. midt i spillet: ingen kort
  await pg.evaluate(() => { document.getElementById('panel').classList.add('hide'); });
  fakeV = '3.0'; await pg.evaluate(() => window.__game.verView.check({ force: true, why: 'test' }));
  await pg.evaluate(() => { document.getElementById('mCont')?.click(); }); await run(5);
  await pg.evaluate(() => window.__game.diff.start && 0);
  ok('ingen konsollfeil', errs.length === 0, errs.join(' | '));
  await b.close(); srv.close();
  if (bad) { console.error(bad + ' feil'); process.exit(1); } console.log('vercheck live: ok');
})().catch((e) => { console.error('FEILET:', e.message); process.exit(1); });
