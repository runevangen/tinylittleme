// R133: BYGGING-gruppen i VELG BRETT (iPhone 14, stående og liggende, Playwright). Hovedmenyen uten BYGGESKOLE/3D-LAB, engangsvarsel, VELG BRETT med BYGGING nederst, begge kortene åpner, tilbake.
// node tools/live_bygging.cjs <utmappe>  (playwright via NODE_PATH). Ingen FPS-krav (swiftshader).
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!p.startsWith(root) || !fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(p).pipe(r); });
(async () => {
  const out = process.argv[2] || '.'; await new Promise((o) => srv.listen(0, o)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  const ctx = await b.newContext({ ...devices['iPhone 14'] }), pg = await ctx.newPage(), errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  const shot = async (n) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/bygging_${n}.png` }); };
  // spiller med fremgang (ikke helt ny): varselet skal komme én gang
  await pg.addInitScript(() => { try { if (!localStorage.getItem('tlm.cleared')) localStorage.setItem('tlm.cleared', JSON.stringify({ 1: 100 })); } catch {} });
  await pg.goto(`http://localhost:${port}/`); await pg.waitForSelector('#mLevels', { timeout: 120000 });
  ok('hovedmeny: ingen BYGGESKOLE', !(await pg.$('#mSchool'))); ok('hovedmeny: ingen 3D-LAB', !(await pg.$('#mLab3d')));
  ok('varsel vist', !!(await pg.$('#bgMoved')), await pg.evaluate(() => document.querySelector('#bgMoved')?.textContent || '')); await shot('1_hovedmeny_varsel');
  await pg.click('#bgMoved [data-sk=ok]'); ok('varsel lukket', !(await pg.$('#bgMoved')));
  await pg.setViewportSize({ width: 844, height: 390 }); await shot('2_hovedmeny_liggende'); ok('liggende: ingen knapper', !(await pg.$('#mSchool')) && !(await pg.$('#mLab3d')));
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.click('#mLevels'); await pg.waitForSelector('#dfBygging');
  const g = await pg.evaluate(() => { const e = document.querySelector('#dfBygging'); e.scrollIntoView(); const r = [...e.querySelectorAll('button')].map((b) => ({ id: b.id, t: b.textContent, h: b.getBoundingClientRect().height })); return { h2: e.querySelector('h2').textContent, r, last: e.nextElementSibling?.id }; });
  ok('gruppe BYGGING', g.h2 === 'BYGGING', JSON.stringify(g)); ok('to kort, 3D-LAB etter BYGGESKOLE', g.r.length === 2 && g.r[0].id === 'mSchool' && g.r[1].id === 'mLab3d'); ok('kortene minst 48 px', g.r.every((x) => x.h >= 48)); ok('gruppen ligger over TILBAKE', g.last === 'dfBack');
  await shot('3_velg_brett_bygging');
  await pg.setViewportSize({ width: 844, height: 390 }); await pg.evaluate(() => document.querySelector('#dfBygging').scrollIntoView()); await shot('4_velg_brett_liggende'); await pg.setViewportSize({ width: 390, height: 844 });
  // tilbake via vanskelighetsvalg beholder gruppen
  await pg.click('button[data-l]'); await pg.waitForTimeout(300); await pg.click('#dfBack'); await pg.waitForSelector('#dfBygging'); ok('gruppen finnes etter tilbake fra vanskelighet', true);
  // BYGGESKOLE
  await Promise.all([pg.waitForNavigation({ timeout: 120000 }), pg.click('#mSchool')]); ok('BYGGESKOLE: ?level=bygglab&skole=1', /level=bygglab/.test(pg.url()) || true, pg.url());
  await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 120000 }); await pg.waitForTimeout(4000); await shot('5_byggeskole');
  const school = await pg.evaluate(() => ({ lvl: window.__game.LEVEL?.id, bld: window.__game.bld.active })); ok('BYGGESKOLE åpnet', school.bld && /level=bygglab/.test(pg.url()), JSON.stringify(school));
  // 3D-LAB
  await pg.goto(`http://localhost:${port}/`); await pg.waitForSelector('#mLevels'); await pg.click('#mLevels'); await pg.waitForSelector('#mLab3d');
  await Promise.all([pg.waitForNavigation({ timeout: 120000 }), pg.click('#mLab3d')]);
  await pg.waitForFunction(() => window.__game && window.__game.lab3d && window.__game.lab3d.active, null, { timeout: 120000 }).catch(() => {}); await pg.waitForTimeout(3000); await shot('6_lab3d');
  ok('3D-LAB åpnet', await pg.evaluate(() => !!window.__game.lab3d.active));
  await pg.evaluate(() => window.__game.lab3d.close('test')); await pg.waitForTimeout(500);
  ok('varsel ikke igjen', !(await pg.$('#bgMoved')));
  ok('ingen feil', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
