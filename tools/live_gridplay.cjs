// R82: rutenett i de vanlige byggebrettene på iPhone 14 (ekte berøring via CDP): Hyllebroen (bro) viser MODUS-knappen, klassisk er standard, MODUS åpner rutenett (tom flate, ankrene på rutenettet),
// referansebygget limes inn og PRØV kommer i mål; Kjøkkenbroen er låst til Hyllebroen er bestått; Trappa har ingen MODUS. Skjermbilder i <utmappe>/gridplay_*.png.
// node tools/live_gridplay.cjs <utmappe> [port]   (playwright via NODE_PATH). Exit 1 ved feil. Ingen GPU (swiftshader ~1 fps): ingen FPS-krav, ekte følelse «testes på iPhone».
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
const CODE = 'TLM1.WzIsImJybzEiLFtbLTE3NTAsMF0sWzAsMF0sWzE3NTAsMF1dLFtbMCwyLDBdLFsyLDMsMF0sWzMsNCwwXSxbNCwxLDBdXV0.10lvxrq';
(async () => {
  const out = process.argv[2] || '.'; await new Promise((ok) => srv.listen(+process.argv[3] || 0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; }; const errs = [];
  async function session(level, init, fn) {
    const ctx = await b.newContext({ ...devices['iPhone 14'] }), pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript(init); await pg.goto(`http://localhost:${port}/?level=${level}`); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 90000 }); await pg.evaluate(() => window.__game.tick(30, 1 / 60));
    const cdp = await ctx.newCDPSession(pg), tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const t = {
      open: (id) => pg.evaluate((id) => { const o = window.__game.bld.open(id, { force: true }); window.__game.tick(3, 1 / 60); return o; }, id),
      tap: async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await tp('touchStart', r.x + r.width / 2, r.y + r.height / 2); await pg.waitForTimeout(40); await tp('touchEnd'); await pg.waitForTimeout(120); await pg.evaluate(() => window.__game.tick(3, 1 / 60)); },
      sh: async (n) => { await pg.evaluate(() => window.__game.tick(2, 1 / 60)); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/gridplay_${n}.png` }); },
      st: () => pg.evaluate(() => { const g = window.__game.bld.grid, el = document.querySelector('#bld'); return { avail: g.available, on: g.on, modeBtn: (el.querySelector('[data-a="mode"]') || {}).textContent || '', shown: !!el.querySelector('[data-a="mode"]') && getComputedStyle(el.querySelector('[data-a="mode"]')).display !== 'none', hint: (el.querySelector('.hint') || {}).textContent || '' }; }),
    };
    await fn(t, pg); await ctx.close();
  }
  const noGuide = () => { try { localStorage.setItem('tlm.gridguideon', 'false'); } catch (e) { /* ok */ } };
  await session('bro', noGuide, async (t, pg) => {
    ok('åpner Hyllebroen (bro1)', await t.open('bro1')); let s = await t.st();
    ok('MODUS-knappen vises, klassisk er standard', s.avail && s.shown && !s.on && /Klassisk/i.test(s.modeBtn), JSON.stringify(s)); await t.sh('1_bro_klassisk');
    await t.tap('#bld button[data-a="mode"]'); s = await t.st(); ok('MODUS åpner rutenett (tom flate)', s.on && /Rutenett/i.test(s.modeBtn), JSON.stringify(s)); await t.sh('2_bro_rutenett');
    ok('referansebygget limes inn', await pg.evaluate((c) => window.__game.bld.importText(c), CODE)); await t.sh('3_bro_bygget');
    await t.tap('#bld button[data-a="try"]'); await pg.evaluate(() => window.__game.tick(1, 1 / 60)); for (let i = 0; i < 40 && (await pg.evaluate(() => window.__game.bld.running)); i++) await pg.evaluate(() => window.__game.bld.update(1 / 20, true));
    const res = await pg.evaluate(() => window.__game.bld.result); ok('PRØV: figuren kommer over', res && res.state === 'won', JSON.stringify(res)); await t.sh('4_bro_prove');
  });
  await session('kjokkenbro', noGuide, async (t) => { ok('åpner kjøkkenbroen', await t.open('kjokken1')); let s = await t.st(); ok('MODUS vises men er låst før Hyllebroen er bestått', s.avail && /🔒/.test(s.modeBtn), JSON.stringify(s)); await t.sh('5_kjokken_last'); await t.tap('#bld button[data-a="mode"]'); s = await t.st(); ok('trykk på låst MODUS åpner ikke rutenett', !s.on, JSON.stringify(s)); });
  await session('trapp', noGuide, async (t) => { ok('åpner trappa', await t.open('trapp1')); const s = await t.st(); ok('ingen MODUS i trapp', !s.avail && !s.shown, JSON.stringify(s)); await t.sh('6_trapp'); });
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | ')); await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
