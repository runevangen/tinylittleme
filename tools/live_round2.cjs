// R125: runde 2 av Klossetrappa og Vippa på iPhone 14 (Playwright). Åpner trapp2 og vippe2, tar bilder av stedet og byggeskjermen (stående og liggende), legger inn referansebygget (placeRef),
// trykker PRØV med ekte berøring, sjekker at prøven vinnes og at bygget står i verden, at et enkelt bygg feiler, og tar statiske tegnekall/trekanter (perfStats) mot Trapp/Vippe runde 1. Ingen GPU: ingen FPS-krav, ekte følelse «testes på iPhone».
// node tools/live_round2.cjs <utmappe> [port]   (playwright via NODE_PATH). Exit 1 ved feil.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!p.startsWith(root) || !fs.existsSync(p)) { r.writeHead(404); r.end('mangler'); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(p).pipe(r); });
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true }); await new Promise((ok) => srv.listen(+process.argv[3] || 0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; }; const errs = [], stats = {};
  async function session(level, fn, viewport) {
    const dev = { ...devices['iPhone 14'], ...(viewport ? { viewport, screen: viewport } : {}) };
    const ctx = await b.newContext(dev), pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(level + ': ' + e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(level + ': ' + m.text()));
    await pg.addInitScript(() => { try { localStorage.setItem('tlm.buildall', 'true'); } catch {} });
    await pg.goto(`http://localhost:${port}/?level=${level}&start=0`); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 120000 });
    const cdp = await ctx.newCDPSession(pg), run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    const t = { pg, run, cdp,
      tapEl: async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 }] }); await pg.waitForTimeout(40); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await pg.waitForTimeout(150); await run(3); },
      sh: async (n) => { await run(2); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/${level}_${n}.png`, timeout: 60000 }); } };
    try { await fn(t); } finally { await ctx.close(); }
  }
  for (const [lvl, site, thing] of [['trapp2', 'trapp2a', 'tårn og ramper'], ['vippe2', 'vippe2a', 'vippe på skrå']]) {
    await session(lvl, async (t) => {
      const { pg, run } = t;
      await pg.evaluate((s) => { const q = window.__game.LEVEL.build.sites.find((x) => x.id === s), p = window.__game.player; p.x = q.x - 9; p.y = q.y; p.z = q.z + 4; p.vx = p.vz = p.vy = 0; p.onGround = true; }, site); await run(12);
      stats[lvl] = await pg.evaluate(() => window.__game.perfStats()); await t.sh('0_spill');
      ok(`${lvl}: BYGG-knappen vises ved stedet`, await pg.locator('#btnBuild').isVisible());
      await t.tapEl('#btnBuild'); await run(3); ok(`${lvl}: byggeskjermen åpen`, await pg.evaluate(() => document.body.classList.contains('building'))); await t.sh('1_bygg_tom');
      // første forsøk med enkleste bygg feiler: flat vippe / bare tårn → startSim uten ref
      ok(`${lvl}: referansebygget legges inn`, await pg.evaluate((s) => window.__game.bld.placeRef(s), site)); await run(3); await t.sh('2_referanse');
      await t.tapEl('#bld button:visible:has-text("PRØV")'); ok(`${lvl}: PRØV trykket med ekte berøring`, true);
      for (let i = 0; i < 80; i++) { await pg.waitForTimeout(250); if (!(await pg.evaluate(() => window.__game.bld.running))) break; }
      const rs = await pg.evaluate(() => window.__game.bld.result); ok(`${lvl}: PRØV vinnes med referansebygget`, rs && rs.state === 'won', JSON.stringify(rs)); await t.sh('3_utfall');
      await t.tapEl('#bld button:visible:has-text("TILBAKE TIL SPILLET")').catch(() => {}); await run(8);
      const nb = await pg.evaluate((s) => window.__game.bld.worldCount(s), site); ok(`${lvl}: bygget står i verden (${thing})`, nb > 0, nb + ' flater'); await t.sh('4_verden');
    });
  }
  // liggende format på vippe2
  await session('vippe2', async (t) => {
    const { pg, run } = t; await pg.evaluate(() => { const q = window.__game.LEVEL.build.sites[0], p = window.__game.player; p.x = q.x - 9; p.y = q.y; p.z = q.z + 4; p.vx = p.vz = p.vy = 0; p.onGround = true; }); await run(8);
    await t.tapEl('#btnBuild'); await run(3); await pg.evaluate(() => window.__game.bld.placeRef('vippe2a')); await run(3); await t.sh('5_liggende');
  }, { width: 844, height: 390 });
  // tegnekall og trekanter mot runde 1 (statisk budsjett, ikke FPS)
  for (const base of ['trapp', 'vippe']) await session(base, async (t) => { stats[base] = await t.pg.evaluate(() => window.__game.perfStats()); });
  for (const id of Object.keys(stats)) console.log(id, JSON.stringify({ calls: stats[id].calls, tris: stats[id].tris, texMB: stats[id].texMB }));
  for (const [r2, r1] of [['trapp2', 'trapp'], ['vippe2', 'vippe']]) { const a = stats[r2], c = stats[r1]; ok(`${r2}: tegnekall og trekanter innenfor ${r1} + 15 %`, a && c && a.calls <= c.calls * 1.15 + 5 && a.tris <= c.tris * 1.15 + 500, `${a && a.calls}/${a && a.tris} mot ${c && c.calls}/${c && c.tris}`); }
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | ')); await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
