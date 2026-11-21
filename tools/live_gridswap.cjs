// R128: BYTT TIL STÅL på iPhone 14 med EKTE berøring (CDP Input.dispatchTouchEvent): Hyllebroen og Byggeskolen (Bygglab). Svak tre-bro feiler, staven som tok mest pulserer, trykk den, trykk BYTT TIL STÅL, ANGRE tar det tilbake.
// node tools/live_gridswap.cjs <utmappe> [port]   (playwright via NODE_PATH). Exit 1 ved feil. Ingen GPU (swiftshader ~1 fps): ingen FPS-krav, ekte følelse «testes på iPhone».
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(p).pipe(r); });
(async () => {
  const out = process.argv[2] || '.'; await new Promise((ok) => srv.listen(+process.argv[3] || 0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; }; const errs = [];
  async function session(level, init, fn, dev = 'iPhone 14') {
    const ctx = await b.newContext({ ...devices[dev] }), pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript(init); await pg.goto(`http://localhost:${port}/?level=${level}`); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 90000 }); await pg.evaluate(() => window.__game.tick(30, 1 / 60));
    const cdp = await ctx.newCDPSession(pg), tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    const t = {
      run,
      tap: async (x, y) => { await tp('touchStart', x, y); await pg.waitForTimeout(40); await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); },
      tapSel: async (sel) => { await pg.locator(sel).first().scrollIntoViewIfNeeded(); const r = await pg.locator(sel).first().boundingBox(); await t.tap(r.x + r.width / 2, r.y + r.height / 2); },
      sp: (u, v) => pg.evaluate(([u, v]) => { const q = window.__game.bld.screenPos(u, v), r = document.querySelector('#bld canvas').getBoundingClientRect(); return { x: r.x + q.x, y: r.y + q.y }; }, [u, v]),
      sh: async (n) => { await run(2); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/gridswap_${n}.png`, timeout: 60000 }); },
    };
    await fn(t, pg); await ctx.close();
  }
  const ON = () => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.gridlock', 'false'); localStorage.setItem('tlm.buildswapsteel', 'true'); localStorage.setItem('tlm.schoolcard', 'false'); localStorage.setItem('tlm.bnudge', 'false'); localStorage.setItem('tlm.buildstrength', '0.12'); } catch (e) { /* ok */ } };
  const OFF = () => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.gridlock', 'false'); localStorage.setItem('tlm.buildswapsteel', 'false'); localStorage.setItem('tlm.schoolcard', 'false'); localStorage.setItem('tlm.buildstrength', '0.12'); } catch (e) { /* ok */ } };
  const info = (pg) => pg.evaluate(() => window.__game.bld.grid.info());
  // lager en svak bro (fagverk i tre) som kode og legger den inn
  async function flow(t, pg, tag, id, lvlFile, maxCost = 999) {
    await pg.evaluate(() => window.__game.bld.open); 
    const opened = await pg.evaluate((id) => { const o = window.__game.bld.open(id, { force: true }); window.__game.tick(4, 1 / 60); return o; }, id); if (!opened && tag === 'Hyllebroen') ok(`${tag}: åpner ${id}`, opened); await t.run(10);
    await pg.evaluate(() => window.__game.bld.bux.skipHand?.());
    await pg.evaluate(() => window.__game.bld.grid.on || window.__game.bld.grid.toggle());
    const code = await pg.evaluate(async ([lvlFile, id, maxCost]) => {
      const L = await (await fetch('/levels/' + lvlFile + '.level.json')).json(), P = await import('/grid_play.js'), EX = await import('/grid_example.js'), BL = await import('/build_logic.js'), G = await import('/grid_logic.js');
      P.ensurePlayGrid(L.build.sites); const site = L.build.sites.find((s) => s.id === id), B = BL.createBuild(JSON.parse(JSON.stringify(site)), {}, []); B.gridDeck = true; G.setMode(B, 'grid');
      const g = EX.exampleGrid(site, 6.5, { top: 'wood', side: 'wood' }); if (!g) return null; B.rg = g; G.derive(B);
      const BB = await import('/build_budget.js'); while (BB.buildCost(B.placed, B.links).cost > maxCost) { const r = [...B.rg.rods].reverse().find((q) => !q.deck); if (!r) break; G.gRemoveRod(B, r.id); }   // billigere bygg så det er rom for stål i oppdragsbudsjettet
      return G.gridExport(B);
    }, [lvlFile, id, maxCost]); ok(`${tag}: svak bro som kode`, !!code);
    ok(`${tag}: importerer`, await pg.evaluate((c) => window.__game.bld.importText(c), code)); await t.run(4);
    const n0 = (await info(pg)).steel; await t.sh(`${tag}_1_bygget`);
    await pg.evaluate(() => window.__game.bld.startTry()); await pg.evaluate(() => { const bld = window.__game.bld; for (let i = 0; i < 8000 && bld.running; i++) bld.update(1 / 60, true); });
    const res = await pg.evaluate(() => window.__game.bld.result); ok(`${tag}: prøven feilet`, res.state === 'lost', JSON.stringify(res)); await t.sh(`${tag}_2_feilet`);
    await pg.evaluate(() => window.__game.bld.stopTry()); await t.run(6);
    const h = await pg.evaluate(() => window.__game.bld.swp.hint); ok(`${tag}: hint finnes etter feilet prøve`, !!h, JSON.stringify(h));
    await t.run(8); await t.sh(`${tag}_3_pulserer`);
    const inf = await info(pg), r = inf.rods.find((q) => q.id === h.id), na = inf.nodes.find((q) => q.id === r.a), nb = inf.nodes.find((q) => q.id === r.b);
    let sel = null; for (const f of [0.5, 0.35, 0.65, 0.25, 0.75]) { const p = await t.sp(na.u + (nb.u - na.u) * f, na.v + (nb.v - na.v) * f); await t.tap(p.x, p.y); await t.run(4); sel = await pg.evaluate(() => window.__game.bld.grid.selRod); if (sel === h.id) break; await pg.evaluate(() => window.__game.bld.grid.tap(-999, -999)); await t.run(2); }
    ok(`${tag}: trykk på staven velger den`, sel === h.id, String(sel));
    const vis = await pg.evaluate(() => { const e = document.querySelector('#bld .gsw'); const r = e.getBoundingClientRect(); return { show: e.classList.contains('show'), w: r.width, h: r.height, x: r.x, y: r.y, r: r.right, b: r.bottom, txt: e.textContent, iw: innerWidth, ih: innerHeight }; });
    ok(`${tag}: BYTT TIL STÅL-knappen vises med pris`, vis.show && /BYTT TIL STÅL \(\+\d/.test(vis.txt), JSON.stringify(vis)); ok(`${tag}: knappen er minst 44 px og innenfor skjermen`, vis.h >= 44 && vis.w >= 44 && vis.x >= 0 && vis.r <= vis.iw && vis.b <= vis.ih, JSON.stringify(vis));
    ok(`${tag}: teksten nevner ikke taster`, !/\b(Enter|Tab|Space|mellomrom)\b/i.test(vis.txt)); await t.sh(`${tag}_4_knapp`);
    await t.tapSel('#bld .gsw'); await t.run(4); const i2 = await info(pg); ok(`${tag}: ett trykk bytter staven til stål`, i2.rods.find((q) => q.id === h.id).mat === 'steel' && i2.steel === n0 + 1 && i2.cost > inf.cost, `${inf.cost} -> ${i2.cost}`);
    ok(`${tag}: hintet er borte`, !(await pg.evaluate(() => window.__game.bld.swp.hint))); await t.sh(`${tag}_5_byttet`);
    await t.tapSel('[data-bx="undo"]'); await t.run(4); const i3 = await info(pg); ok(`${tag}: ↶ tar bort byttet i ett steg`, i3.rods.find((q) => q.id === h.id).mat !== 'steel' && i3.cost === inf.cost, `${i3.cost} vs ${inf.cost}`); await t.sh(`${tag}_6_angret`);
    await pg.evaluate(() => window.__game.bld.close('t'));
  }
  await session('bro', ON, async (t, pg) => { await flow(t, pg, 'Hyllebroen', 'bro1', 'bro'); });
  await session('bygglab', ON, async (t, pg) => { await t.run(60); await flow(t, pg, 'Byggeskolen', 'lab1', 'bygglab', 6); });
  await session('bro', OFF, async (t, pg) => {
    await pg.evaluate(() => { const o = window.__game.bld.open('bro1', { force: true }); window.__game.tick(4, 1 / 60); return o; }); await t.run(10); await pg.evaluate(() => window.__game.bld.bux.skipHand?.()); await pg.evaluate(() => window.__game.bld.grid.on || window.__game.bld.grid.toggle());
    ok('valget av: hjelpen er ikke aktiv', !(await pg.evaluate(() => window.__game.bld.swp.active())));
  });
  ok('ingen sidefeil', errs.length === 0, errs.slice(0, 3).join(' | ')); await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
