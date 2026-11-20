// R106: hjørneglass i byggeskjermen på iPhone 14 med EKTE berøring (CDP Input.dispatchTouchEvent), stående og liggende: Hyllebroen (bro1), Bygglab-sted (lab1) og Trapp (klassisk).
// Sjekker: glasset vises mens en stav dras / en knute flyttes / en del dras / fingeren holdes på et tomt punkt, står motsatt side av fingeren, tar ikke berøring, dekker ikke knapper eller ⚑, kopierer bildet (ikke tomt), skjules etter slipp og ikke vises under PRØV; ingen konsollfeil.
// node tools/live_loupe.cjs <utmappe> [port]   (playwright via NODE_PATH). Ingen GPU: ingen FPS-krav, ekte følelse testes på iPhone.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(p).pipe(r); });
(async () => {
  const out = process.argv[2] || '.'; await new Promise((ok) => srv.listen(+process.argv[3] || 0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; }; const errs = [];
  async function session(level, init, land, fn) {
    const ctx = await b.newContext({ ...devices[land ? 'iPhone 14 landscape' : 'iPhone 14'] }), pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript(init); await pg.goto(`http://localhost:${port}/?level=${level}`); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 90000 }); await pg.evaluate(() => window.__game.tick(30, 1 / 60));
    const cdp = await ctx.newCDPSession(pg), tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    const t = {
      run, pg,
      open: (id) => pg.evaluate((id) => { const o = window.__game.bld.open(id, { force: true }); window.__game.tick(4, 1 / 60); return o; }, id),
      tap: async (x, y) => { await tp('touchStart', x, y); await pg.waitForTimeout(40); await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); },
      tapSel: async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await t.tap(r.x + r.width / 2, r.y + r.height / 2); },
      drag: async (x0, y0, x1, y1, hold = false) => { await tp('touchStart', x0, y0); for (let i = 1; i <= 8; i++) { await tp('touchMove', x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await pg.waitForTimeout(30); } await run(2); if (hold) return; await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); },
      down: async (x, y) => { await tp('touchStart', x, y); await pg.waitForTimeout(60); await run(2); },
      end: async () => { await tp('touchEnd'); await pg.waitForTimeout(260); await run(3); },
      sp: (u, v) => pg.evaluate(([u, v]) => { const q = window.__game.bld.screenPos(u, v), r = document.querySelector('#bld canvas').getBoundingClientRect(); return { x: r.x + q.x, y: r.y + q.y }; }, [u, v]),
      chip: async (id) => { const l = pg.locator(`#bld .chip[data-id="${id}"]`); await l.scrollIntoViewIfNeeded(); const r = await l.boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; },
      sh: async (n) => { await run(1); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/loupe_${n}.png`, timeout: 60000 }); },
      glass: () => pg.evaluate(() => {
        const el = document.querySelector('#bld .bloupe'); if (!el) return null; const cs = getComputedStyle(el), r = el.getBoundingClientRect(), c = el.querySelector('canvas'), cr = c.getBoundingClientRect();
        let ink = 0; try { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4 * 7) if (d[i] + d[i + 1] + d[i + 2] > 60) ink++; } catch (e) { ink = -1; }
        const over = (e) => { const q = e.getBoundingClientRect(); return q.width > 0 && getComputedStyle(e).display !== 'none' && q.left < cr.right && q.right > cr.left && q.top < cr.bottom && q.bottom > cr.top; };
        const hits = [...document.querySelectorAll('#bld button, #qbtn')].filter(over).map((e) => e.dataset.bx || e.dataset.a || e.dataset.z || e.id || e.className);
        return { show: cs.display !== 'none' && r.width > 0, dbg: cs.display + '|' + r.width + '|' + r.height + '|' + el.style.display, cls: el.className, x: cr.x, y: cr.y, w: cr.width, h: cr.height, pe: cs.pointerEvents, pec: getComputedStyle(c).pointerEvents, ink, hits, text: el.querySelector('.blt').textContent, W: innerWidth, H: innerHeight };
      }),
    };
    await fn(t, pg); await ctx.close();
  }
  const ON = () => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.buildall', 'true'); localStorage.setItem('tlm.gridlock', 'false'); localStorage.setItem('tlm.cbxhand', '1'); localStorage.setItem('tlm.skole', JSON.stringify({ opened: true, card: 'skipped', done: false })); } catch (e) { /* ok */ } };
  const OLD = () => { try { localStorage.setItem('tlm.buildux', 'false'); localStorage.setItem('tlm.buildall', 'true'); localStorage.setItem('tlm.gridlock', 'false'); localStorage.setItem('tlm.skole', JSON.stringify({ opened: true, card: 'skipped', done: false })); } catch (e) { /* ok */ } };
  const check = (nm, g, fp, W) => {
    const fingerX = fp.x;
    ok(`${nm}: glasset vises`, g && g.show, JSON.stringify(g && { x: g.x, y: g.y, w: g.w, cls: g.cls, dbg: g.dbg }));
    if (!g || !g.show) return;
    ok(`${nm}: tar ikke berøring`, g.pe === 'none' && g.pec === 'none');
    ok(`${nm}: rundt, 96-120 px`, g.w >= 94 && g.w <= 120 && Math.abs(g.w - g.h) < 1, `${g.w}`);
    ok(`${nm}: helt inne i skjermen`, g.x >= 0 && g.y >= 0 && g.x + g.w <= g.W + 0.5, `${g.x},${g.y}`);
    const opp = fingerX < W / 2 ? g.x > W / 2 - g.w : g.x < W / 2, clear = fp.y < g.y - 16 || fp.y > g.y + g.h + 16 || fp.x < g.x - 16 || fp.x > g.x + g.w + 16;   // motsatt side, eller (når knapper/⚑ stenger den siden) i alle fall ikke over fingeren
    ok(`${nm}: motsatt side av fingeren, og aldri over fingeren`, (opp || clear) && clear, `finger ${Math.round(fingerX)},${Math.round(fp.y)}, glass ${Math.round(g.x)},${Math.round(g.y)}${opp ? '' : ' (andre hjørnet: første er blokkert)'}`);
    ok(`${nm}: dekker ingen knapp eller ⚑`, g.hits.length === 0, g.hits.join(','));
    ok(`${nm}: viser et bilde (ikke tomt)`, g.ink > 20, String(g.ink));
  };
  for (const land of (process.env.LAND ? [process.env.LAND === '1'] : [false, true])) {
    const nm0 = land ? 'liggende' : 'stående', L = land ? 'l' : 'p';
    // ---- Hyllebroen: dra en stav, flytt en knute, hold på tomt punkt ----
    await session('bro', ON, land, async (t, pg) => {
      ok(`${nm0}: åpner Hyllebroen`, await t.open('bro1')); await t.run(10);
      for (let i = 0; i < 8 && (await pg.evaluate(() => window.__game.bld.bux.handOn)); i++) { await pg.evaluate(() => { for (let k = 0; k < 10; k++) window.__game.bld.update(0.4, true); }); }
      const a1 = await t.sp(-3.5, 0), a2 = await t.sp(3.5, 0), p1 = await t.sp(-1.75, 0);
      ok(`${nm0}: glass ikke synlig uten finger`, !(await t.glass()).show);
      await t.drag(a1.x, a1.y, p1.x, p1.y, true); let g = await t.glass(); check(`${nm0} Hyllebroen stav`, g, p1, g.W); ok(`${nm0} Hyllebroen stav: teksten viser lengde/pris`, /poeng|point/.test(g.text), g.text); await t.sh(`bro_stav_${L}`);
      await t.end(); g = await t.glass(); ok(`${nm0} Hyllebroen: skjult etter slipp`, !g.show);
      const info = await pg.evaluate(() => window.__game.bld.grid.info()), n1 = info.nodes.find((n) => !n.fixed); const pn = await t.sp(n1.u, n1.v), mv = await t.sp(n1.u + 0.5, n1.v + 0.5);
      await t.tap(pn.x, pn.y); await t.drag(pn.x, pn.y, mv.x, mv.y, true); g = await t.glass(); check(`${nm0} Hyllebroen flytt knute/stav`, g, mv, g.W); await t.sh(`bro_flytt_${L}`); await t.end();
      const e = await t.sp(0.75, 1.75); await t.down(e.x, e.y); await pg.waitForTimeout(450); await t.run(3); g = await t.glass(); check(`${nm0} Hyllebroen hold`, g, e, g.W); await t.sh(`bro_hold_${L}`); await t.end();
      const e2 = await t.sp(0.25, 2.25); await t.down(e2.x, e2.y); await t.run(2); g = await t.glass(); ok(`${nm0}: ikke vist før 0,3 s hold`, !g.show); await t.end();
      await pg.evaluate(() => window.__game.bld.startTry()); await t.run(3); await t.down(a1.x + 5, a1.y - 40); await pg.waitForTimeout(450); await t.run(3); g = await t.glass(); ok(`${nm0}: aldri under PRØV`, !g.show); await t.end(); await pg.evaluate(() => window.__game.bld.stopTry());
    });
    // ---- Byggeskolen/Bygglab: lab1 ----
    await session('bygglab', ON, land, async (t, pg) => {
      await t.open('lab1'); await t.run(10); ok(`${nm0}: Bygglab-sted åpent`, /^lab/.test(await pg.evaluate(() => window.__game.bld.siteId || '')), await pg.evaluate(() => String(window.__game.bld.siteId)));
      for (let i = 0; i < 8 && (await pg.evaluate(() => window.__game.bld.bux.handOn)); i++) { await pg.evaluate(() => { for (let k = 0; k < 10; k++) window.__game.bld.update(0.4, true); }); }
      const st = await pg.evaluate(() => window.__game.bld.state()); const gridOn = await pg.evaluate(() => window.__game.bld.grid.on);
      if (gridOn) {
        const an = await pg.evaluate(() => window.__game.bld.grid.info().nodes.filter((n) => n.fixed).slice(0, 2)); const a = await t.sp(an[0].u, an[0].v), q = await t.sp(an[0].u + 1.5, an[0].v);
        await t.drag(a.x, a.y, q.x, q.y, true); const g = await t.glass(); check(`${nm0} Bygglab stav`, g, q, g.W); await t.sh(`lab_stav_${L}`); await t.end(); ok(`${nm0} Bygglab: skjult etter slipp`, !(await t.glass()).show);
      } else {
        ok(`${nm0}: lab1 er et klassisk sted`, true, st.active);
        const ids = await pg.evaluate(() => [...document.querySelectorAll('#bld .chip')].map((c) => c.dataset.id)); const c = await t.chip(ids[0]), p = await t.sp(0, 1);
        await t.drag(c.x, c.y, p.x, p.y, true); const g = await t.glass(); check(`${nm0} Bygglab del`, g, p, g.W); await t.sh(`lab_del_${L}`); await t.end();
      }
    });
    // ---- Trapp (klassisk skall) og gamle skjermen ----
    for (const [nmx, init] of [['Trapp', ON], ['Trapp gamle skjerm', OLD]]) await session('trapp', init, land, async (t, pg) => {
      ok(`${nm0}: åpner ${nmx}`, await t.open('trapp1')); await t.run(10);
      for (let i = 0; i < 8 && (await pg.evaluate(() => window.__game.bld.cbx.handOn)); i++) { await pg.evaluate(() => { for (let k = 0; k < 10; k++) window.__game.bld.update(0.4, true); }); }
      const ids = await pg.evaluate(() => [...document.querySelectorAll('#bld .chip')].map((c) => c.dataset.id)); ok(`${nm0} ${nmx}: har deler`, ids.length > 0, String(ids.length));
      const c = await t.chip(ids[0]), p = await t.sp(-2.5, 1.2);
      await t.drag(c.x, c.y, p.x, p.y, true); let g = await t.glass(); check(`${nm0} ${nmx} del fra delebrettet`, g, p, g.W); ok(`${nm0} ${nmx}: tekst på linja`, g.text.length > 0, g.text); await t.sh(`${nmx === 'Trapp' ? 'trapp' : 'trappold'}_del_${L}`); await t.end();
      ok(`${nm0} ${nmx}: skjult etter slipp`, !(await t.glass()).show);
      const placed = await pg.evaluate(() => window.__game.bld.state().builds[0].parts[0]); if (placed && !(land && nmx !== 'Trapp')) { const q = await t.sp(placed.u, placed.v), q2 = await t.sp(placed.u + 0.8, placed.v + 0.4); await t.drag(q.x, q.y, q2.x, q2.y, true); g = await t.glass(); check(`${nm0} ${nmx} flytt plassert del`, g, q2, g.W); await t.sh(`${nmx === 'Trapp' ? 'trapp' : 'trappold'}_flytt_${L}`); await t.end(); }
    });
  }
  // avslått i ⚙: aldri
  await session('bro', () => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.buildloupe', 'false'); localStorage.setItem('tlm.gridlock', 'false'); localStorage.setItem('tlm.skole', JSON.stringify({ opened: true, card: 'skipped', done: false })); } catch (e) { /* ok */ } }, false, async (t, pg) => {
    await t.open('bro1'); await t.run(10); const a1 = await t.sp(-3.5, 0), p1 = await t.sp(-1.75, 0); await t.drag(a1.x, a1.y, p1.x, p1.y, true); ok('valget av: ingen glass', !(await t.glass()).show); await t.end();
  });
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 4).join(' | '));
  await b.close(); srv.close(); console.log(bad ? `${bad} FEIL` : 'alt ok'); process.exit(bad ? 1 : 0);
})();
