// R74: rutenett-oppdrag i Bygglab med EKTE berøringshendelser (CDP Input.dispatchTouchEvent) på iPhone 14: sted 2 er låst i rutenett, sted 1 har mål og budsjett (kort), en bro bygges med trykk,
// PRØV, bestått-kortet, og neste sted åpnes. Skjermbilder i <utmappe>/stage_*.png. Miljøet har ingen GPU (swiftshader ~1 fps): ingen FPS-krav, ekte følelse «testes på iPhone».
// node tools/live_gridstage.cjs <utmappe> [port]   (server på porten; playwright via NODE_PATH). Exit 1 ved feil.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } }); });
(async () => {
  const out = process.argv[2] || '.'; await new Promise((ok) => srv.listen(+process.argv[3] || 0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  const ctx = await b.newContext({ ...devices['iPhone 14'] }), pg = await ctx.newPage(), errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.goto(`http://localhost:${port}/?level=bygglab`);
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites && window.__game.LEVEL.lab, null, { timeout: 90000 });
  const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n), cdp = await ctx.newCDPSession(pg);
  const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const ttap = async (x, y) => { await tp('touchStart', x, y); await pg.waitForTimeout(40); await tp('touchEnd'); await pg.waitForTimeout(120); await run(2); };
  const sh = async (n) => { await run(2); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/stage_${n}.png`, timeout: 60000 }); };
  const sp = (u, v) => pg.evaluate(([u, v]) => { const q = window.__game.bld.screenPos(u, v), r = document.querySelector('#bld canvas').getBoundingClientRect(); return { x: r.x + q.x, y: r.y + q.y }; }, [u, v]);
  const tapUV = async (u, v) => { const p = await sp(u, v); await ttap(p.x, p.y); };
  const tapSel = async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await ttap(r.x + r.width / 2, r.y + r.height / 2); };
  const info = () => pg.evaluate(() => window.__game.bld.grid.info());
  const waitDone = async (n = 240) => { for (let i = 0; i < n; i++) { await pg.waitForTimeout(250); if (!(await pg.evaluate(() => window.__game.bld.running))) break; } };
  await run(60);
  ok('byggeskjermen er åpen i Bygglab', await pg.evaluate(() => document.body.classList.contains('building')));
  // sted 2 (trapp) er låst i rutenett til sted 1 er bestått
  await tapSel('#bld .lab button[data-lb="next"]'); ok('◀ ▶ går til sted 2', (await pg.evaluate(() => window.__game.bld.siteId)) === 'lab2');
  ok('stedet er låst i rutenett', await pg.evaluate(() => window.__game.bld.stage.locked('lab2')));
  const mb = await pg.locator('#bld button[data-a="mode"]').first().boundingBox(); ok('MODUS-knappen viser lås og er stor nok', mb && mb.height >= 40 && /🔒/.test(await pg.locator('#bld button[data-a="mode"]').first().textContent()), JSON.stringify(mb));
  await tapSel('#bld button[data-a="mode"]'); ok('låst: MODUS bytter ikke til rutenett', !(await pg.evaluate(() => window.__game.bld.grid.on))); await sh('1_last');
  await pg.evaluate(() => document.querySelector('#bld .lab button[data-lb="prev"]').click()); await run(2); ok('tilbake på sted 1', (await pg.evaluate(() => window.__game.bld.siteId)) === 'lab1');
  await tapSel('#bld button[data-a="mode"]'); ok('MODUS bytter til rutenett på sted 1', await pg.evaluate(() => window.__game.bld.grid.on));
  let st = await info(); ok('ingen kjøredekk i oppdraget', st.deck === 0 && st.rods.length === 0, JSON.stringify([st.deck, st.rods.length]));
  const stg = await pg.evaluate(() => window.__game.bld.stage.now); ok('oppdrag: ball og budsjett 8', stg && stg.budget === 8 && stg.loads.join() === 'ball', JSON.stringify(stg)); await sh('2_mal');
  // bygg en bro av tre med trykk (fire staver) og prøv
  await tapSel('#bld .gtools button[data-g="wood"]');
  const an = st.nodes.filter((n) => n.fixed).sort((p, q) => p.u - q.u), step = 1.75;
  await tapUV(an[0].u, an[0].v); await tapUV(an[0].u + step, 0); await tapUV(an[0].u + 2 * step, 0); await tapUV(an[0].u + 3 * step, 0); await tapUV(an[1].u, an[1].v);
  st = await info(); ok('bro av fire staver, kostnad 4', st.rods.length === 4 && st.cost === 4, JSON.stringify([st.rods.length, st.cost])); await sh('3_bygd');
  await tapSel('#bld button[data-a="try"]'); await waitDone();
  const res = await pg.evaluate(() => window.__game.bld.result), stt = await pg.evaluate(() => window.__game.bld.stage.state);
  ok('prøven vant og oppdraget er bestått', res.state === 'won' && stt && stt.passed, JSON.stringify([res.state, stt && stt.passed])); await sh('4_bestatt');
  ok('sted 2 er åpnet i rutenett', !(await pg.evaluate(() => window.__game.bld.stage.locked('lab2'))));
  await tapSel('#bld button[data-a="try"]'); // STOPP
  await tapSel('#bld .lab button[data-lb="next"]'); await tapSel('#bld button[data-a="mode"]'); ok('sted 2: rutenett åpnes', await pg.evaluate(() => window.__game.bld.grid.on)); await sh('5_sted2');
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
