// R121: speiling og kopi i Rutenett-byggeren på iPhone 14 (stående og liggende) med EKTE berøring (CDP Input.dispatchTouchEvent): Hyllebroen og Byggeskolen (Bygglab, bro).
// Bygger halve broen og speiler den (SPEIL OG LEGG TIL), ANGRE tar hele speilingen i ett steg, kopierer en trekant over to felt (KOPIER: spøkelse, dra, SETT INN), valget av = ingen knapper.
// node tools/live_gridmirror.cjs <utmappe> [port]   (playwright via NODE_PATH). Exit 1 ved feil. Ingen GPU (swiftshader ~1 fps): ingen FPS-krav, ekte følelse «testes på iPhone».
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
      open: (id) => pg.evaluate((id) => { const o = window.__game.bld.open(id, { force: true }); window.__game.tick(4, 1 / 60); return o; }, id),
      tap: async (x, y) => { await tp('touchStart', x, y); await pg.waitForTimeout(40); await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); },
      tapSel: async (sel) => { await pg.locator(sel).first().scrollIntoViewIfNeeded(); const r = await pg.locator(sel).first().boundingBox(); await t.tap(r.x + r.width / 2, r.y + r.height / 2); },
      drag: async (x0, y0, x1, y1, hold = false) => { await tp('touchStart', x0, y0); for (let i = 1; i <= 8; i++) { await tp('touchMove', x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await pg.waitForTimeout(30); } await run(2); if (hold) return; await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); },
      end: async () => { await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); },
      sp: (u, v) => pg.evaluate(([u, v]) => { const q = window.__game.bld.screenPos(u, v), r = document.querySelector('#bld canvas').getBoundingClientRect(); return { x: r.x + q.x, y: r.y + q.y }; }, [u, v]),
      sh: async (n) => { await run(2); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/gridmirror_${n}.png`, timeout: 60000 }); },
      info: () => pg.evaluate(() => window.__game.bld.grid.info()),
      vis: () => pg.evaluate(() => { const el = document.querySelector('#bld'), vis = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; }; return [...el.querySelectorAll('button')].filter(vis).map((e) => { const r = e.getBoundingClientRect(); return { k: e.dataset.bx || e.dataset.a || e.dataset.g || e.dataset.s || e.dataset.z || e.dataset.t || e.dataset.l || e.dataset.lb || e.dataset.gs || '?', w: r.width, h: r.height, x: r.x, y: r.y, b: r.bottom, r: r.right }; }); }),
    };
    await fn(t, pg); await ctx.close();
  }
  const ON = () => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.gridlock', 'false'); localStorage.setItem('tlm.buildmirror', 'true'); localStorage.setItem('tlm.schoolcard', 'false'); localStorage.setItem('tlm.bnudge', 'false'); } catch (e) { /* ok */ } };
  const OFF = () => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.gridlock', 'false'); localStorage.setItem('tlm.buildmirror', 'false'); localStorage.setItem('tlm.schoolcard', 'false'); } catch (e) { /* ok */ } };
  const nRods = (pg) => pg.evaluate(() => window.__game.bld.grid.info().rods.filter((r) => !r.deck).length);
  const sheetVis = (pg) => pg.evaluate(() => { const e = document.querySelector('#bld .bxmir'); return !!e && getComputedStyle(e).display !== 'none'; });
  const dragTo = async (t, from, to) => { const a = await t.sp(from[0], from[1]), c = await t.sp(to[0], to[1]); await t.drag(a.x, a.y, c.x, c.y); };
  const symOk = (pg) => pg.evaluate(() => { const i = window.__game.bld.grid.info(), f = (n) => `${Math.round(n.u * 1000)},${Math.round(n.v * 1000)}`, key = (a, b, m) => [a, b].sort().join('|') + m, nn = (id) => i.nodes.find((n) => n.id === id), have = new Set(i.rods.filter((r) => !r.deck).map((r) => key(f(nn(r.a)), f(nn(r.b)), r.mat)));
    return i.rods.filter((r) => !r.deck).every((r) => { const g = (n) => `${Math.round(-n.u * 1000)},${Math.round(n.v * 1000)}`; return have.has(key(g(nn(r.a)), g(nn(r.b)), r.mat)); }); });
  const copyState = (pg) => pg.evaluate(() => { const m = window.__game.bld.bux.mir, s = m.state, p = s && m.plan(); return s && { du: s.du, dv: s.dv, rods: s.sel.rods.length, ok: p.ok, why: p.why, n: p.rods }; });
  async function copyFlow(t, pg, tag, selMid, fieldsPx, ref, extra) {
    await t.tap(selMid.x, selMid.y); await t.run(4);
    const copyVis = await pg.evaluate(() => { const e = document.querySelector('#bld .bxcopy'); return !!e && e.classList.contains('show') && getComputedStyle(e).display !== 'none'; }); ok(`${tag}: KOPIER-knappen står ved valgt stav`, copyVis); await t.sh(`${tag}_4_valgt`);
    const bb = await pg.locator('#bld .bxcopy').first().boundingBox(); ok(`${tag}: KOPIER-knappen er minst 44 px`, bb && bb.height >= 44 && bb.width >= 44, JSON.stringify(bb));
    await t.tapSel('#bld .bxcopy'); await t.run(4); const st = await copyState(pg); ok(`${tag}: kopien vises som spøkelse (lovlig)`, st && st.ok, JSON.stringify(st)); await t.sh(`${tag}_5_spokelse`);
    ok(`${tag}: hjelpeteksten nevner SETT INN (ingen taster)`, /SETT INN/.test(await pg.evaluate(() => document.querySelector('#bld .hint')?.textContent || '')));
    const from = await t.sp(ref[0] + st.du, ref[1] + st.dv), to = await t.sp(ref[0] + extra.du, ref[1] + extra.dv); await t.drag(from.x, from.y, to.x, to.y); await t.run(3);
    const st2 = await copyState(pg); ok(`${tag}: ett dra flytter kopien`, st2 && (st2.du !== st.du || st2.dv !== st.dv) && st2.ok, JSON.stringify([st, st2])); await t.sh(`${tag}_6_dratt`);
    const nBefore = await nRods(pg); await t.tapSel('#bld .bxcopy'); await t.run(4); const nAfter = await nRods(pg);
    ok(`${tag}: SETT INN setter kopien`, nAfter > nBefore, `${nBefore} -> ${nAfter}`); await t.sh(`${tag}_7_satt`);
    await t.tapSel('[data-bx="undo"]'); await t.run(4); ok(`${tag}: ↶ tar hele kopien i ett steg`, (await nRods(pg)) === nBefore, `${await nRods(pg)} vs ${nBefore}`);
  }
  async function flowA(t, pg, tag) {
    ok(`${tag}: åpner Hyllebroen`, await t.open('bro1')); await t.run(10); await pg.evaluate(() => window.__game.bld.bux.skipHand());
    ok(`${tag}: speil/kopi er på`, await pg.evaluate(() => window.__game.bld.bux.mir.avail()));
    await dragTo(t, [-3.5, 0], [-1.75, 1.75]); const n0 = await nRods(pg); ok(`${tag}: halve broen er bygget`, n0 === 1, 'staver: ' + n0); await t.sh(`${tag}_1_halv`);
    await t.tapSel('[data-bx="more"]'); await t.run(4); ok(`${tag}: ⋯-arket har SPEIL BYGGET`, await sheetVis(pg)); await t.sh(`${tag}_2_ark`);
    await t.tapSel('[data-bx="mirrorAdd"]'); await t.run(6); const n1 = await nRods(pg); ok(`${tag}: SPEIL OG LEGG TIL la til staver`, n1 === 2, `${n0} -> ${n1}`);
    ok(`${tag}: bygget er symmetrisk om midten`, await symOk(pg)); await t.sh(`${tag}_3_speilet`);
    await t.tapSel('[data-bx="undo"]'); await t.run(4); ok(`${tag}: ↶ tar hele speilingen i ett steg`, (await nRods(pg)) === n0, 'staver: ' + (await nRods(pg)));
    await t.tapSel('[data-bx="more"]'); await t.run(4); await t.tapSel('[data-bx="mirrorFlip"]'); await t.run(6);
    ok(`${tag}: SNU flytter bygget til høyre side`, (await nRods(pg)) === n0 && (await pg.evaluate(() => window.__game.bld.grid.info().nodes.some((n) => !n.fixed && n.u > 0))));
    await t.tapSel('[data-bx="undo"]'); await t.run(4);
    // for dyrt: en kopi som går over budsjettet nektes med tekst (bygg 2 til og prøv å speile)
    const A = await t.sp(-3.5, 0), M = await t.sp(-1.75, 1.75);
    await copyFlow(t, pg, tag, { x: (A.x + M.x) / 2, y: (A.y + M.y) / 2 }, null, [-3.5, 0], { du: 3.5, dv: 0 });
  }
  async function flowB(t, pg, tag) {   // Byggeskolen · Bro: kopier en trekant over to felt, og speil
    await t.run(60); ok(`${tag}: Byggeskole · Bro er åpen`, await pg.evaluate(() => window.__game.bld.siteId === 'lab1')); await pg.evaluate(() => window.__game.bld.bux.skipHand());
    ok(`${tag}: speil/kopi er på (samme kode som Hyllebroen)`, await pg.evaluate(() => window.__game.bld.bux.mir.avail()));
    const P = await t.sp(-1.75, 0); await t.tap(P.x, P.y); await t.run(3);   // en knute ved trykk
    await dragTo(t, [-1.75, 0], [-1.75, 1.75]); await dragTo(t, [-1.75, 1.75], [0, 0]); await dragTo(t, [0, 0], [-1.75, 0]);
    const n0 = await nRods(pg); ok(`${tag}: trekanten er bygget (tre staver)`, n0 === 3, 'staver: ' + n0); await t.sh(`${tag}_1_trekant`);
    const A = await t.sp(-1.75, 0), M = await t.sp(-1.75, 1.75);
    await t.tap((A.x + M.x) / 2 - 6, (A.y + M.y) / 2); await t.run(4); const sel = await pg.evaluate(() => window.__game.bld.bux.mir.sel()); ok(`${tag}: en stav i trekanten velger hele trekanten`, sel && sel.rods.length === 3, JSON.stringify(sel));
    await t.tapSel('#bld .bxcopy'); await t.run(4); const st = await copyState(pg); ok(`${tag}: spøkelset er lovlig`, st && st.ok, JSON.stringify(st)); await t.sh(`${tag}_2_spokelse`);
    const from = await t.sp(-1.75 + st.du, 0 + st.dv), to = await t.sp(-1.75 + 3.5, 0); await t.drag(from.x, from.y, to.x, to.y); await t.run(3);
    const st2 = await copyState(pg); ok(`${tag}: dratt over to felt`, st2 && Math.abs(st2.du - 3.5) < 0.01 && st2.ok, JSON.stringify(st2)); await t.sh(`${tag}_3_to_felt`);
    await t.tapSel('#bld .bxcopy'); await t.run(4); const n1 = await nRods(pg); ok(`${tag}: kopien er satt (tre nye staver, festet til ankeret)`, n1 === 6, `${n0} -> ${n1}`); await t.sh(`${tag}_4_satt`);
    const dup = await pg.evaluate(() => { const i = window.__game.bld.grid.info(), k = i.rods.map((r) => [r.a, r.b].sort().join('-')); return k.length === new Set(k).size; }); ok(`${tag}: ingen duplikate staver`, dup);
    await t.tapSel('[data-bx="undo"]'); await t.run(4); ok(`${tag}: ↶ tar hele kopien i ett steg`, (await nRods(pg)) === n0);
  }
  await session('bro', ON, async (t, pg) => { await flowA(t, pg, 'stående'); });
  await session('bro', ON, async (t, pg) => { await flowA(t, pg, 'liggende'); }, 'iPhone 14 landscape');
  await session('bygglab', ON, async (t, pg) => { await flowB(t, pg, 'Byggeskolen'); });
  await session('bro', OFF, async (t, pg) => {
    ok('valget av: åpner Hyllebroen', await t.open('bro1')); await t.run(10); await pg.evaluate(() => window.__game.bld.bux.skipHand());
    ok('valget av: speil/kopi er ikke tilgjengelig', !(await pg.evaluate(() => window.__game.bld.bux.mir.avail())));
    await t.tapSel('[data-bx="more"]'); await t.run(4); ok('valget av: ⋯-arket har ikke SPEIL BYGGET', !(await sheetVis(pg))); await t.sh('av_ark');
  });
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
