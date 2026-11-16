// R73: rutenett-bygging, fagverk-følelse, med EKTE berøringshendelser (CDP Input.dispatchTouchEvent) på iPhone 14, i Bygglab (sted 1: bro).
// Sjekker: kjøredekket står der fra start, en bro av trekanter bygges med trykk, PRØV med SLOW og PAUSE (knapper), stavene skifter farge (piksler på lerretet), «største belastning» vises etterpå,
// SÅ SLIK legger inn eksempelbroen, og hjelpen er borte på Ekspert. Miljøet har ingen GPU (swiftshader ~1 fps): ingen FPS-krav, ekte følelse «testes på iPhone».
// node tools/live_trussgrid.cjs <utmappe> [port]   (server på porten; playwright via NODE_PATH). Exit 1 ved feil.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!p.startsWith(root) || !fs.existsSync(p)) { r.writeHead(404); r.end('mangler'); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(p).pipe(r); });
(async () => {
  const out = process.argv[2] || '.'; await new Promise((ok) => srv.listen(+process.argv[3] || 0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  async function session(opts, body) {
    const ctx = await b.newContext({ ...devices['iPhone 14'] }), pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript((o) => { try { for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); } catch (e) { /* ok */ } }, opts);
    await pg.goto(`http://localhost:${port}/?level=bygglab`);
    await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites && window.__game.LEVEL.lab, null, { timeout: 90000 });
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n), cdp = await ctx.newCDPSession(pg);
    const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const ttap = async (x, y) => { await tp('touchStart', x, y); await pg.waitForTimeout(40); await tp('touchEnd'); await pg.waitForTimeout(120); await run(2); };
    const sh = async (n) => { await run(2); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/truss_${n}.png`, timeout: 60000 }); };
    const sp = (u, v) => pg.evaluate(([u, v]) => { const q = window.__game.bld.screenPos(u, v), r = document.querySelector('#bld canvas').getBoundingClientRect(); return { x: r.x + q.x, y: r.y + q.y }; }, [u, v]);
    const tapUV = async (u, v) => { const p = await sp(u, v); await ttap(p.x, p.y); };
    const tapSel = async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await ttap(r.x + r.width / 2, r.y + r.height / 2); };
    const info = () => pg.evaluate(() => window.__game.bld.grid.info());
    const pixel = async (u, v) => { const p = await sp(u, v); return pg.evaluate(([x, y]) => { const c = document.querySelector('#bld canvas'), r = c.getBoundingClientRect(), k = c.width / r.width, d = c.getContext('2d').getImageData(Math.round((x - r.x) * k), Math.round((y - r.y) * k), 1, 1).data; return [d[0], d[1], d[2]]; }, [p.x, p.y]); };
    await run(60); await body({ pg, run, tp, ttap, sh, sp, tapUV, tapSel, info, pixel, errs, ctx });
    ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | ')); await ctx.close();
  }
  const waitDone = async (pg, n = 160) => { for (let i = 0; i < n; i++) { await pg.waitForTimeout(250); if (!(await pg.evaluate(() => window.__game.bld.running))) break; } };

  // ---- 1) bygg en bro av trekanter med trykk, SLOW og PAUSE, farger og største belastning (svak bro så fargene skifter) ----
  await session({ 'tlm.buildstrength': '0.4', 'tlm.gridstage': 'false' }, async (S) => {
    const { pg, run, tapUV, tapSel, info, sh, pixel } = S;
    ok('byggeskjermen er åpen i Bygglab', await pg.evaluate(() => document.body.classList.contains('building')));
    await tapSel('#bld button[data-a="mode"]'); ok('MODUS bytter til rutenett', await pg.evaluate(() => window.__game.bld.grid.on));
    let st = await info(); ok('kjøredekket står der fra start: 4 dekk-staver, 3 dekk-knuter', st.deck === 4 && st.rods.filter((r) => r.deck).length === 4 && st.nodes.filter((n) => n.deck).length === 3 && st.rods.length === 4, JSON.stringify([st.deck, st.rods.length]));
    await sh('1_dekk');
    // dekk-knuten kan ikke slettes eller dras vekk
    await tapUV(-1.75, 0); await tapSel('#bld .bt.bot button[data-a="del"]'); st = await info(); ok('FJERN rører ikke dekket', st.rods.length === 4 && st.nodes.some((n) => n.deck && Math.abs(n.u + 1.75) < 0.01));
    // trekantene: en vei gjennom knutene (stål på toppen og skråstavene)
    await tapSel('#bld .gtools button[data-g="steel"]');
    const clear = async () => { await tapUV(-9, 6); };
    const path1 = [[-3.5, 0], [-1.75, 1.75], [-1.75, 0], [0, 1.75], [0, 0], [1.75, 1.75], [1.75, 0], [0, 1.75]];
    for (const [u, v] of path1) await tapUV(u, v); await clear();
    for (const [u, v] of [[-1.75, 1.75], [0, 1.75], [1.75, 1.75], [3.5, 0]]) await tapUV(u, v); await clear();
    st = await info(); ok('bro av trekanter bygd med trykk (10 staver over dekket)', st.rods.filter((r) => !r.deck).length === 10, JSON.stringify(st.rods.map((r) => r.id + r.mat[0])));
    await sh('2_bro');
    await tapSel('#bld button[data-a="try"]');
    for (let i = 0; i < 8; i++) await pg.waitForTimeout(250);
    // SLOW og PAUSE er knapper (ingen taster)
    const slow = pg.locator('#bld .gsim button[data-gs="slow"]'), pause = pg.locator('#bld .gsim button[data-gs="pause"]'); const bs = await slow.boundingBox(), bp = await pause.boundingBox();
    ok('SLOW og PAUSE vises under prøven, stor nok å treffe (minst 44 px)', !!bs && !!bp && bs.height >= 44 && bp.height >= 44 && bs.width >= 60, JSON.stringify([bs, bp]));
    await tapSel('#bld .gsim button[data-gs="slow"]'); ok('SLOW slår på sakte tempo', (await pg.evaluate(() => window.__game.bld.grid.speed)) === 'slow' && /on/.test(await slow.getAttribute('class')));
    await tapSel('#bld .gsim button[data-gs="pause"]'); const t0 = await pg.evaluate(() => window.__game.bld.result && window.__game.bld.result.t); await pg.waitForTimeout(800); await run(30); const t1 = await pg.evaluate(() => window.__game.bld.result.t);
    ok('PAUSE stopper prøven', (await pg.evaluate(() => window.__game.bld.grid.speed)) === 'pause' && t1 === t0, `${t0} -> ${t1}`); ok('PAUSE-knappen heter FORTSETT', /FORTSETT/i.test(await pause.textContent()), await pause.textContent());
    await sh('3_pause');
    const pk = await pg.evaluate(() => window.__game.bld.grid.peaks); const pos = pk && pk.length ? pk.slice().sort((x, y) => y.r - x.r)[0] : null; ok('belastningen følges (toppverdier per stav)', pk && pk.length >= 14 && pos.r > 0.05, JSON.stringify(pos));
    await tapSel('#bld .gsim button[data-gs="pause"]'); ok('FORTSETT gir vanlig tempo igjen', (await pg.evaluate(() => window.__game.bld.grid.speed)) === 'play');
    await waitDone(pg);
    const res = await pg.evaluate(() => window.__game.bld.result), sum = await pg.evaluate(() => window.__game.bld.grid.summary);
    ok('prøven er ferdig og «største belastning» finnes', !!res && res.state && !!sum && !!sum.top, JSON.stringify([res && res.state, sum && sum.top, sum && sum.first]));
    ok('hjelpeteksten nevner største belastning', /Største belastning/.test(res.hint), res.hint); await sh('4_utfall');
    // fargene: stavene har ulik farge etter belastningen (toppene vises etter prøven)
    const bands = await pg.evaluate(() => { const p = window.__game.bld.grid.peaks, set = new Set(p.map((x) => (x.r < 0.01 ? 0 : Math.round(Math.sqrt(Math.min(1, x.r)) * 5)))); return [...set]; });
    ok('stavene skifter farge: minst to ulike fargebånd i bygget', bands.length >= 2, JSON.stringify(bands));
  });

  // ---- 2) SÅ SLIK på vanlig vanskelighet, og pikselfargene på lerretet i en vanlig prøve ----
  await session({ 'tlm.gridstage': 'false' }, async (S) => {
    const { pg, run, tapSel, info, sh, pixel, tapUV } = S;
    await tapSel('#bld button[data-a="mode"]');
    const ex = pg.locator('#bld .gtools button[data-g="example"]'); const eb = await ex.boundingBox(); ok('SÅ SLIK-knappen vises (ikke Ekspert), stor nok', !!eb && eb.height >= 44 && eb.width >= 60, JSON.stringify(eb)); ok('knappen heter SÅ SLIK', /SÅ SLIK/.test(await ex.textContent()));
    await tapSel('#bld .gtools button[data-g="example"]'); let st = await info(); ok('SÅ SLIK legger inn eksempelbroen (9 staver over dekket)', st.rods.filter((r) => !r.deck).length === 9, JSON.stringify(st.rods.length)); await sh('5_eksempel');
    await tapSel('#bld button[data-a="undo"]'); st = await info(); ok('ANGRE tar eksempelbroen bort, dekket står', st.rods.length === 4);
    await tapSel('#bld .gtools button[data-g="example"]'); await tapSel('#bld button[data-a="try"]');
    const colors = []; for (let k = 0; k < 6; k++) { await pg.waitForTimeout(500); colors.push(await pixel(-0.875, 1.75)); }
    await waitDone(pg); const res = await pg.evaluate(() => window.__game.bld.result); ok('eksempelbroen bærer figuren over', res && res.state === 'won', JSON.stringify(res && res.state)); await sh('6_eksempel_prove');
    ok('stavene tegnes med belastningsfarge (grønn/gul, ikke trefarge)', colors.some((c) => c[1] > 150 && c[2] < 140 && c[0] > 80), JSON.stringify(colors.slice(-3)));
    const code = await pg.evaluate(() => window.__game.bld.exportText()); ok('KODE for bygget med dekk', /^TLM1\./.test(code));
  });

  // ---- 3) Ekspert: ingen SÅ SLIK ----
  await session({ 'tlm.difficulty': '"expert"', 'tlm.gridstage': 'false' }, async (S) => {
    const { pg, tapSel } = S; await tapSel('#bld button[data-a="mode"]'); const vis = await pg.locator('#bld .gtools button[data-g="example"]').isVisible();
    const lvl = await pg.evaluate(() => localStorage.getItem('tlm.difficulty')); ok('SÅ SLIK er borte på Ekspert', !vis, 'nivå ' + lvl);
  });
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
