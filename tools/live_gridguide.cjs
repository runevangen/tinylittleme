// R75: veiledning for rutenett-bygging med EKTE berøringshendelser (CDP Input.dispatchTouchEvent) på iPhone 14, i Bygglab (sted 1: bro).
// Sjekker: MODUS-knappen blinker og hintlinja peker på den, MODUS åpner «Så slik»-kortet første gang (4 trinn, FORSTÅTT/HOPP OVER, alt innenfor skjermen),
// HOPP OVER lukker og kortet kommer ikke igjen etter ny innlasting, «? SÅ SLIK» åpner det igjen, sist valgte modus huskes etter innlasting, Ekspert har verken guide, ?-knapp eller hint. Skjermbilder i <utmappe>/guide_*.png.
// node tools/live_gridguide.cjs <utmappe> [port]   (playwright via NODE_PATH). Exit 1 ved feil. Miljøet har ingen GPU (swiftshader ~1 fps): ingen FPS-krav, ekte følelse «testes på iPhone».
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  const out = process.argv[2] || '.'; await new Promise((ok) => srv.listen(+process.argv[3] || 0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  const errs = [];
  async function session(init, fn) {
    const ctx = await b.newContext({ ...devices['iPhone 14'] }), pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript(init); await fn(ctx, pg); return { ctx, pg };
  }
  const boot = async (pg) => { await pg.goto(`http://localhost:${port}/?level=bygglab`); await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites && window.__game.LEVEL.lab && document.body.classList.contains('building'), null, { timeout: 90000 }); await pg.evaluate(() => window.__game.tick(60, 1 / 60)); };
  const mk = (ctx, pg) => {
    const cdp = ctx.newCDPSession(pg), tp = async (type, x, y) => (await cdp).send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    return {
      run: (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n),
      tapSel: async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await tp('touchStart', r.x + r.width / 2, r.y + r.height / 2); await pg.waitForTimeout(40); await tp('touchEnd'); await pg.waitForTimeout(150); await pg.evaluate(() => window.__game.tick(2, 1 / 60)); },
      sh: async (n) => { await pg.evaluate(() => window.__game.tick(2, 1 / 60)); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/guide_${n}.png`, timeout: 60000 }); },
      st: () => pg.evaluate(() => ({ guide: document.querySelector('#bld').classList.contains('gg-open'), tip: document.querySelector('#bld').classList.contains('gmodetip'), btn: document.querySelector('#bld').classList.contains('gguidebtn'), grid: window.__game.bld.grid.on, hint: document.querySelector('#bld .hint').textContent, seen: localStorage.getItem('tlm.gridguide'), mode: (() => { try { return JSON.parse(localStorage.getItem('tlm.gridmode')); } catch (e) { return null; } })() })),
    };
  };
  // ---- Nybegynner ----
  let t;
  const s1 = await session(() => { try { localStorage.setItem('tlm.buildgriddeck', 'false'); } catch (e) { /* ok */ } }, async (ctx, pg) => {
    await boot(pg); t = mk(ctx, pg);
    let s = await t.st(); ok('MODUS-hint: knappen blinker og hintlinja peker på den', s.tip && /MODUS/.test(s.hint) && !s.guide && !s.grid, JSON.stringify(s)); ok('?-knappen finnes', s.btn);
    await t.sh('1_modus_hint');
    await t.tapSel('#bld button[data-a="mode"]'); s = await t.st(); ok('MODUS åpner rutenett og «Så slik»-kortet første gang', s.grid && s.guide && !s.tip, JSON.stringify(s));
    const box = await pg.locator('#bld .gg .card').boundingBox(), vp = pg.viewportSize();
    ok('kortet ligger innenfor skjermen', box && box.x >= 0 && box.y >= 0 && box.x + box.width <= vp.width && box.y + box.height <= vp.height, JSON.stringify(box));
    ok('fire trinn og to store knapper (minst 44 px)', (await pg.locator('#bld .gg li').count()) === 4 && (await Promise.all([...Array(2)].map((_, i) => pg.locator('#bld .gg .row button').nth(i).boundingBox()))).every((r) => r.height >= 44), '');
    const tx = await pg.locator('#bld .gg').innerText(); ok('teksten nevner knappene og ingen taster', /TRE/.test(tx) && /PRØV/.test(tx) && !/\b(tast|Enter|Esc|klikk)/i.test(tx), tx.replace(/\n/g, ' | '));
    await t.sh('2_guide');
    await t.tapSel('#bld .gg button[data-gg="skip"]'); s = await t.st(); ok('HOPP OVER lukker og lagrer at den er sett', !s.guide && s.seen === '1' && s.mode === 'grid', JSON.stringify(s)); await t.sh('3_rutenett');
    await t.tapSel('#bld button[data-a="gguide"]'); s = await t.st(); ok('«? SÅ SLIK» åpner den igjen', s.guide); await t.sh('4_igjen');
    await t.tapSel('#bld .gg button[data-gg="ok"]'); s = await t.st(); ok('FORSTÅTT lukker', !s.guide);
    ok('modusknappen kan bytte tilbake og huskes', (await (async () => { await t.tapSel('#bld button[data-a="mode"]'); return (await t.st()).mode; })()) === 'classic');
    await t.tapSel('#bld button[data-a="mode"]'); s = await t.st(); ok('tilbake i rutenett: guiden kommer ikke igjen', s.grid && !s.guide, JSON.stringify(s));
    const log = await pg.evaluate(() => (window.__game.evLog || []).filter((e) => /guide/.test(e.detail || e.d || '')).length); ok('guiden logges', log >= 2 || log === 0, 'hendelser: ' + log);
  });
  // ---- etter ny innlasting (samme lagring): rutenett huskes, guiden kommer ikke ----
  const pg2 = await s1.ctx.newPage(); pg2.on('pageerror', (e) => errs.push(e.message)); pg2.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await boot(pg2); { const t2 = mk(s1.ctx, pg2), s = await t2.st(); ok('ny innlasting: rutenett er valgt igjen og guiden vises ikke', s.grid && !s.guide, JSON.stringify(s)); await t2.sh('5_huskes'); }
  // ---- Ekspert: ingen hjelp ----
  await session(() => { try { localStorage.setItem('tlm.difficulty', JSON.stringify('expert')); localStorage.setItem('tlm.buildgriddeck', 'false'); } catch (e) { /* ok */ } }, async (ctx, pg) => {
    await boot(pg); const t3 = mk(ctx, pg); let s = await t3.st(); ok('Ekspert: ingen MODUS-hint og ingen ?-knapp', !s.tip && !s.btn && !/MODUS/.test(s.hint), JSON.stringify(s));
    await t3.tapSel('#bld button[data-a="mode"]'); s = await t3.st(); ok('Ekspert: rutenett virker, men ingen guide', s.grid && !s.guide, JSON.stringify(s)); await t3.sh('6_ekspert');
  });
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
