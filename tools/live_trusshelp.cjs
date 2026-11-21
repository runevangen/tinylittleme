// R122: fagverk-hjelp (TREKANT, DIAGONAL, ?) på iPhone 14 med EKTE berøring (CDP Input.dispatchTouchEvent): Hyllebroen (bro) og Byggeskole · Fagverk (Bygglab lab4).
// Sjekker: knappene vises når to knuter/en stav er valgt, spøkelsesforslag, TREKANT bygger en bro som består, DIAGONAL på en firkant (oransje prikk), ⋯ skjuler hjelpen, valget av = ingen knapper,
// trykkflater >= 44 px, ingen overlapp med bunnkontrollene, ingen konsollfeil. node tools/live_trusshelp.cjs <utmappe> [port]  (playwright via NODE_PATH). Ingen GPU: ingen FPS-krav, «testes på iPhone».
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
(async () => {
  const out = process.argv[2] || '.'; await new Promise((ok) => srv.listen(+process.argv[3] || 0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; }; const errs = [];
  async function session(level, init, fn, opts = {}) {
    const ctx = await b.newContext({ ...devices['iPhone 14'], ...(opts.landscape ? { viewport: { width: 844, height: 390 }, isMobile: true } : {}) }), pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript(init); await pg.goto(`http://localhost:${port}/?level=${level}`); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 90000 }); await pg.evaluate(() => window.__game.tick(30, 1 / 60));
    const cdp = await ctx.newCDPSession(pg), tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    const t = {
      run,
      open: (id) => pg.evaluate((id) => { const o = window.__game.bld.open(id, { force: true }); window.__game.tick(4, 1 / 60); return o; }, id),
      tap: async (x, y) => { await tp('touchStart', x, y); await pg.waitForTimeout(40); await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); },
      tapSel: async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await t.tap(r.x + r.width / 2, r.y + r.height / 2); },
      drag: async (x0, y0, x1, y1) => { await tp('touchStart', x0, y0); for (let i = 1; i <= 8; i++) { await tp('touchMove', x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await pg.waitForTimeout(30); } await run(2); await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); },
      sp: (u, v) => pg.evaluate(([u, v]) => { const q = window.__game.bld.screenPos(u, v), r = document.querySelector('#bld canvas').getBoundingClientRect(); return { x: r.x + q.x, y: r.y + q.y }; }, [u, v]),
      sh: async (n) => { await run(2); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/trusshelp_${n}.png`, timeout: 60000 }); },
      info: () => pg.evaluate(() => window.__game.bld.grid.info()),
      row: () => pg.evaluate(() => { const g = document.querySelector('#bld .gtr'); if (!g) return null; const cs = getComputedStyle(g), btn = (k) => { const e = g.querySelector(`[data-th="${k}"]`); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom, text: e.textContent } : null; }; return { shown: cs.display !== 'none', tri: btn('tri'), diag: btn('diag'), help: btn('help') }; }),
      bottom: () => pg.evaluate(() => { const e = document.querySelector('#bld .bxbot'); const r = e && e.getBoundingClientRect(); return r ? { y: r.y, h: r.height } : null; }),
      log: () => pg.evaluate(() => window.__game.evLog.filter((e) => e.type === 'bygg').map((e) => e.detail)),
      budget: () => pg.evaluate(() => window.__game.bld.trh.budgetNow),
      st: () => pg.evaluate(() => window.__game.bld.trh.stats),
      cache: () => pg.evaluate(() => { const c = window.__game.bld.trh.cache; return { tri: c.tri.list.length, why: c.tri.why, quads: c.quads.length }; }),
    };
    await fn(t, pg); await ctx.close();
  }
  const ON = () => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.gridlock', 'false'); localStorage.removeItem('tlm.buildtruss2'); localStorage.setItem('tlm.schoolcard', 'false'); } catch (e) { /* ok */ } };
  const OFFSET = () => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.gridlock', 'false'); localStorage.setItem('tlm.buildtruss2', JSON.stringify('off')); localStorage.setItem('tlm.schoolcard', 'false'); } catch (e) { /* ok */ } };
  const goTo = async (t, pg, id) => {
    for (let i = 0; i < 8 && (await pg.evaluate(() => window.__game.bld.siteId)) !== id; i++) { await pg.evaluate(() => window.__game.bld.lab.go(1)); await t.run(4); }
    for (let i = 0; i < 8 && (await pg.evaluate(() => window.__game.bld.bux.handOn)); i++) { await pg.evaluate(() => { for (let k = 0; k < 10; k++) window.__game.bld.update(0.4, true); }); }
    return (await pg.evaluate(() => window.__game.bld.siteId)) === id;
  };
  const tries = async (t, pg) => {
    await t.tapSel('#bld [data-bx="try"]'); await t.run(1);
    for (let i = 0; i < 80 && (await pg.evaluate(() => window.__game.bld.running)); i++) await pg.evaluate(() => window.__game.bld.update(1 / 20, true));
    return pg.evaluate(() => window.__game.bld.result);
  };
  async function bridgeWithHelp(t, pg, label, mat) {
    // velg stål, og bygg veien av staver mellom ankrene (dra fra knute til knute) i Hyllebroen
    await t.tapSel(`#bld [data-bx="${mat}"]`);
    const rods = await pg.evaluate(() => window.__game.bld.grid.info().rods.length);
    return rods;
  }

  // ---------- Hyllebroen (bro1) ----------
  await session('bro', ON, async (t, pg) => {
    ok('åpner Hyllebroen', await t.open('bro1')); await t.run(10);
    for (let i = 0; i < 8 && (await pg.evaluate(() => window.__game.bld.bux.handOn)); i++) { await pg.evaluate(() => { for (let k = 0; k < 10; k++) window.__game.bld.update(0.4, true); }); }
    ok('ingen knapper før noe er valgt', !(await t.row())?.shown);
    await t.tapSel('#bld [data-bx="steel"]');
    const a1 = await t.sp(-3.5, 0), p1 = await t.sp(-1.75, 0), m = await t.sp(0, 0), p2 = await t.sp(1.75, 0), a2 = await t.sp(3.5, 0);
    await t.drag(a1.x, a1.y, p1.x, p1.y); await t.drag(p1.x, p1.y, m.x, m.y); await t.drag(m.x, m.y, p2.x, p2.y); await t.drag(p2.x, p2.y, a2.x, a2.y);
    let s = await t.info(); ok('veien: fire staver fra klippe til klippe', s.rods.length === 4, String(s.rods.length));
    // to knuter valgt: trykk den ene, så den andre
    await t.tap(p1.x, p1.y); await t.tap(m.x, m.y); await t.run(3);
    let r = await t.row(); ok('to knuter valgt: TREKANT vises', r && r.shown && r.tri && r.tri.text === 'TREKANT', JSON.stringify(r));
    ok('trykkflater >= 44 px', r && [r.tri, r.help].every((x) => x && x.w >= 44 && x.h >= 44), JSON.stringify(r));
    const bt = await t.bottom(); ok('knappene ligger over bunnkontrollene (ingen overlapp)', r && bt && r.tri.b <= bt.y + 1, JSON.stringify([r && r.tri, bt]));
    const c0 = await t.cache(); console.log('budsjett', JSON.stringify(await t.budget())); ok('forslag finnes (ringer i byggeskjermen)', c0.tri >= 1, JSON.stringify(c0)); await t.sh('1_hyllebro_forslag');
    // ? forklarer
    await t.tapSel('#bld [data-th="help"]'); await pg.waitForTimeout(200); await t.sh('2_hjelp');
    // bygg trekanter langs veien: velg hver stav (trykk den), trykk TREKANT
    for (let i = 0; i < 4; i++) {
      const rod = await pg.evaluate((i) => { const g = window.__game.bld.grid.info(), q = g.rods[i], a = g.nodes.find((n) => n.id === q.a), b = g.nodes.find((n) => n.id === q.b); return { u: (a.u + b.u) / 2, v: (a.v + b.v) / 2 }; }, i);
      const rp = await t.sp(rod.u, rod.v); await t.tap(rp.x, rp.y); await t.run(2);
      const rr = await t.row(); if (!(rr && rr.tri)) { ok(`stav ${i + 1}: TREKANT vises`, false, JSON.stringify(rr)); continue; }
      const before = (await t.info()).rods.length; await t.tapSel('#bld [data-th="tri"]'); const after = (await t.info()).rods.length;
      ok(`stav ${i + 1}: TREKANT legger til to staver og en knute`, after - before === 2, `${before} -> ${after}`);
    }
    await t.sh('3_hyllebro_bygget');
    s = await t.info(); ok('bygget har trekanter (flere staver enn veien)', s.rods.length >= 12, String(s.rods.length));
    // ANGRE tar bort et helt forslag
    const n0 = s.rods.length; await t.tapSel('#bld [data-bx="undo"]'); s = await t.info(); ok('↶ tar bort hele trekanten (2 staver)', n0 - s.rods.length === 2, `${n0} -> ${s.rods.length}`);
    // legg den tilbake med TREKANT (forslaget er valgt fra før)
    const lg = await t.log(); ok('bruk logges (trekantforslag vist og brukt)', lg.some((x) => /^trekantforslag vist/.test(x)) && lg.some((x) => /^trekantforslag brukt/.test(x)), lg.filter((x) => /forslag/.test(x)).slice(-3).join(' | '));
    const lastRod = await pg.evaluate(() => { const g = window.__game.bld.grid.info(), q = g.rods[3], a = g.nodes.find((n) => n.id === q.a), b = g.nodes.find((n) => n.id === q.b); return { u: (a.u + b.u) / 2, v: (a.v + b.v) / 2 }; });
    const lp = await t.sp(lastRod.u, lastRod.v); await t.tap(lp.x, lp.y); await t.tapSel('#bld [data-th="tri"]');
    s = await t.info(); const res = await tries(t, pg); ok('PRØV: broen bygget med hjelp består', res && res.state === 'won', JSON.stringify(res)); await t.sh('4_hyllebro_prove');
    const lg2 = await t.log(); ok('utfallet logges (forslag brukt i bygget)', lg2.some((x) => /forslag brukt i bygget .*klarte det/.test(x)), lg2.filter((x) => /forslag brukt i bygget/.test(x)).join(' | '));
  });

  // ---------- Byggeskole · Fagverk: to knuter, DIAGONAL ----------
  await session('bygglab', ON, async (t, pg) => {
    await t.run(60); ok('åpner Byggeskole · Fagverk', await goTo(t, pg, 'lab4'));
    ok('ingen knapper før noe er valgt', !(await t.row())?.shown);
    await t.tapSel('#bld [data-bx="steel"]');
    const d1 = await t.sp(-1.25, 0), d2 = await t.sp(0, 0);
    await t.tap(d1.x, d1.y); await t.tap(d2.x, d2.y); await t.run(3);
    let r = await t.row(); ok('Fagverk: to knuter valgt gir TREKANT', r && r.shown && r.tri, JSON.stringify(r)); await t.sh('5_fagverk_forslag');
    await t.tapSel('#bld [data-th="tri"]'); let s = await t.info(); ok('TREKANT: grunnlinje, to staver og en knute (to knuter uten stav mellom)', s.rods.length === 3 && s.nodes.filter((n) => !n.fixed).length === 3, JSON.stringify(s.rods.map((q) => q.id)));
    ok('byggeskolens oppdragsbudsjett er med i forslaget', !!(await t.budget()), JSON.stringify(await t.budget()));
    await t.sh('6_fagverk_trekant');
    // en firkant: to staver opp og en toppstav, uten diagonal
    await t.tapSel('#bld [data-bx="undo"]'); await t.tapSel('#bld [data-bx="wood"]');
    const t1 = await t.sp(0, 1.25), t0 = await t.sp(-1.25, 1.25);
    await t.drag(d1.x, d1.y, d2.x, d2.y); await t.drag(d2.x, d2.y, t1.x, t1.y); await t.drag(d1.x, d1.y, t0.x, t0.y); await t.drag(t0.x, t0.y, t1.x, t1.y);
    s = await t.info(); const c = await t.cache(); ok('firkant uten diagonal oppdages', c.quads === 1, JSON.stringify(c) + ' ' + s.rods.length);
    r = await t.row(); ok('DIAGONAL-knappen vises', r && r.shown && r.diag && r.diag.text === 'DIAGONAL', JSON.stringify(r)); await t.sh('7_fagverk_firkant');
    const n0 = (await t.info()).rods.length; await t.tapSel('#bld [data-th="diag"]'); const n1 = (await t.info()).rods.length; ok('DIAGONAL legger inn én stav', n1 - n0 === 1, `${n0} -> ${n1}`);
    ok('firkanten er borte', (await t.cache()).quads === 0); await t.sh('8_fagverk_diagonal');
    // ⋯ skjuler hjelpen
    await t.tapSel('#bld [data-bx="more"]'); await t.run(3); const tog = await pg.locator('#bld [data-th="toggle"]').first().boundingBox(); ok('⋯ har knappen «Trekanthjelp» (>= 48 px)', !!tog && tog.height >= 48, JSON.stringify(tog)); await t.sh('9_meny');
    await t.tapSel('#bld [data-th="toggle"]'); await t.tapSel('#bld [data-bx="close"]'); await t.run(3);
    ok('skjult i ⋯: ingen knapper', !(await t.row())?.shown, JSON.stringify(await t.row()));
    const lg = await t.log(); ok('logger diagonalforslag', lg.some((x) => /^diagonalforslag vist/.test(x)) && lg.some((x) => /^diagonalforslag brukt/.test(x)), lg.filter((x) => /diagonal/.test(x)).join(' | '));
  });

  // ---------- Byggeskole · Fagverk: bestå med hjelp (oppdraget: bil, budsjett 7) ----------
  await session('bygglab', ON, async (t, pg) => {
    await t.run(60); await goTo(t, pg, 'lab4'); await t.tapSel('#bld [data-bx="wood"]');
    const a1 = await t.sp(-2.5, 0), n0 = await t.sp(0, 0), a2 = await t.sp(2.5, 0);
    await t.tap(n0.x, n0.y); await t.drag(a1.x, a1.y, n0.x, n0.y); await t.drag(n0.x, n0.y, a2.x, a2.y);
    let s = await t.info(); ok('Fagverk: veien av to treplanker', s.rods.length === 2, String(s.rods.length));
    await t.tap(a1.x, a1.y); await t.tap(n0.x, n0.y); await t.run(3);   // to knuter: ankeret og midtpunktet
    const r = await t.row(); ok('Fagverk: to valgte knuter med stav mellom gir TREKANT', r && r.shown && r.tri, JSON.stringify(r)); await t.sh('11_fagverk_bestaa_forslag');
    await t.tapSel('#bld [data-th="tri"]'); s = await t.info(); ok('TREKANT legger til to staver', s.rods.length === 4, String(s.rods.length)); await t.sh('12_fagverk_bestaa_bygget');
    const res = await tries(t, pg); ok('Fagverk: PRØV består med trekantbygget', res && res.state === 'won', JSON.stringify(res)); await t.sh('13_fagverk_bestaatt');
    const lg = await t.log(); ok('oppdraget består og utfallet logges', lg.some((x) => /^oppdrag bestått lab4/.test(x)) && lg.some((x) => /forslag brukt i bygget \(tri\): prøven klarte det/.test(x)), lg.filter((x) => /oppdrag|forslag brukt i bygget/.test(x)).join(' | '));
  });

  // ---------- liggende ----------
  await session('bygglab', ON, async (t, pg) => {
    await t.run(60); await goTo(t, pg, 'lab4');
    const d1 = await t.sp(-1.25, 0), d2 = await t.sp(0, 0); await t.tap(d1.x, d1.y); await t.tap(d2.x, d2.y); await t.run(3);
    const r = await t.row(); ok('liggende: TREKANT vises og er trykkbar', r && r.shown && r.tri && r.tri.w >= 44, JSON.stringify(r)); await t.sh('10_liggende');
  }, { landscape: true });

  // ---------- valget av: ingen knapper ----------
  await session('bygglab', OFFSET, async (t, pg) => {
    await t.run(60); await goTo(t, pg, 'lab4');
    const d1 = await t.sp(-1.25, 0), d2 = await t.sp(0, 0); await t.tap(d1.x, d1.y); await t.tap(d2.x, d2.y); await t.run(3);
    ok('valget av: ingen TREKANT/DIAGONAL-knapper', !(await t.row())?.shown, JSON.stringify(await t.row()));
  });
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
