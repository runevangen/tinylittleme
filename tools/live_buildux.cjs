// R92: forenklet byggeskjerm (buildux) på iPhone 14 med EKTE berøring (CDP Input.dispatchTouchEvent): Hyllebroen (bro) og Bygglab (bro, fagverk).
// Sjekker: valget av = dagens skjerm (MODUS-knapp, mange knapper); valget på = ny skjerm med ca. 8 synlige kontroller, byggeområde ca. 70 % av høyden, materialvalg, hånd-animasjon én gang,
// en bro bygges ved å dra fra knuter (spøkelsesstav grønn/rød), trykk-for-knute, slette-boble, flytt valgt knute, ⋯-ark, PRØV kommer i mål, trykkflater >= 48 px, ingen overlapp med ⚑ og ingen konsollfeil.
// node tools/live_buildux.cjs <utmappe> [port]   (playwright via NODE_PATH). Exit 1 ved feil. Ingen GPU (swiftshader ~1 fps): ingen FPS-krav, ekte følelse «testes på iPhone».
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(p).pipe(r); });
(async () => {
  const out = process.argv[2] || '.'; await new Promise((ok) => srv.listen(+process.argv[3] || 0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; }; const errs = [];
  async function session(level, init, fn) {
    const ctx = await b.newContext({ ...devices['iPhone 14'] }), pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript(init); await pg.goto(`http://localhost:${port}/?level=${level}`); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 90000 }); await pg.evaluate(() => window.__game.tick(30, 1 / 60));
    const cdp = await ctx.newCDPSession(pg), tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    const t = {
      run,
      open: (id) => pg.evaluate((id) => { const o = window.__game.bld.open(id, { force: true }); window.__game.tick(4, 1 / 60); return o; }, id),
      tap: async (x, y) => { await tp('touchStart', x, y); await pg.waitForTimeout(40); await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); },
      tapSel: async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await t.tap(r.x + r.width / 2, r.y + r.height / 2); },
      drag: async (x0, y0, x1, y1, hold = false) => { await tp('touchStart', x0, y0); for (let i = 1; i <= 8; i++) { await tp('touchMove', x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await pg.waitForTimeout(30); } await run(2); if (hold) return; await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); },
      end: async () => { await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); },
      sp: (u, v) => pg.evaluate(([u, v]) => { const q = window.__game.bld.screenPos(u, v), r = document.querySelector('#bld canvas').getBoundingClientRect(); return { x: r.x + q.x, y: r.y + q.y }; }, [u, v]),
      sh: async (n) => { await run(2); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/buildux_${n}.png`, timeout: 60000 }); },
      info: () => pg.evaluate(() => window.__game.bld.grid.info()),
      vis: () => pg.evaluate(() => { const el = document.querySelector('#bld'), vis = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; }; return [...el.querySelectorAll('button')].filter(vis).map((e) => { const r = e.getBoundingClientRect(); return { k: e.dataset.bx || e.dataset.a || e.dataset.g || e.dataset.s || e.dataset.z || e.dataset.t || e.dataset.l || e.dataset.lb || e.dataset.gs || '?', w: r.width, h: r.height, x: r.x, y: r.y, b: r.bottom, r: r.right }; }); }),
    };
    await fn(t, pg); await ctx.close();
  }
  const ON = () => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.gridlock', 'false'); } catch (e) { /* ok */ } }, OFF = () => { try { localStorage.setItem('tlm.buildux', 'false'); } catch (e) { /* ok */ } };
  let nOff = 0; const only = process.env.ONLY || '';   // ONLY=lab: bare Bygglab-delen
  if (only !== 'lab') await session('bro', OFF, async (t) => {
    ok('åpner Hyllebroen (valget av)', await t.open('bro1')); const v = await t.vis(); nOff = v.length;
    ok('valget av: dagens skjerm (MODUS-knappen finnes, ingen PRØV-ark)', v.some((x) => x.k === 'mode') && !v.some((x) => x.k === 'more'), v.map((x) => x.k).join(','));
    ok('valget av: mange kontroller (dagens skjerm)', v.length >= 12, String(v.length)); await t.sh('0_av');
  });
  if (only !== 'lab') await session('bro', ON, async (t, pg) => {
    ok('åpner Hyllebroen (valget på)', await t.open('bro1')); await t.run(10);
    const v = await t.vis(), keys = v.map((x) => x.k);
    ok('valget på: rutenett er på uten MODUS-knapp', (await pg.evaluate(() => window.__game.bld.grid.on)) && !keys.includes('mode'), keys.join(','));
    const core = ['back', 'more', 'wood', 'steel', 'rope', 'undo', 'try'];
    ok('valget på: kontrollene er tilbake, meny, tre materialer, angre og PRØV (7) + ⚑', core.every((k) => keys.includes(k)) && v.length <= 8, `${v.length} synlige (før: ${nOff}): ${keys.join(',')}`);
    ok('trykkflater er minst 48 px', v.every((x) => x.w >= 48 && x.h >= 48), JSON.stringify(v.filter((x) => x.w < 48 || x.h < 48)));
    const H = await pg.evaluate(() => innerHeight), area = await pg.evaluate(() => { const g = window.__game.bld; return g.areaPx ? g.areaPx() : null; });
    const top = Math.max(...v.filter((x) => x.y < 100).map((x) => x.b)), bot = Math.min(...v.filter((x) => x.y > 500).map((x) => x.y));
    ok('byggeområdet fyller ca. 70 % av høyden', (bot - top) / H >= 0.62, `${(100 * (bot - top) / H).toFixed(0)} % (${top.toFixed(0)}–${bot.toFixed(0)}), ${JSON.stringify(area)}`);
    const flag = await pg.evaluate(() => { const e = document.querySelector('#qbtn'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, r: r.right, b: r.bottom }; });
    const ov = flag && v.some((x) => x.x < flag.r && x.r > flag.x && x.y < flag.b && x.b > flag.y);
    ok('ingen overlapp med ⚑', !ov, JSON.stringify(flag));
    ok('hånd-animasjonen vises første gang', await pg.evaluate(() => window.__game.bld.bux.handOn)); await t.sh('1_paa_hand');
    for (let i = 0; i < 8 && (await pg.evaluate(() => window.__game.bld.bux.handOn)); i++) { await pg.evaluate(() => { for (let k = 0; k < 10; k++) window.__game.bld.update(0.4, true); }); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); }
    ok('hånd-animasjonen avslutter seg selv', !(await pg.evaluate(() => window.__game.bld.bux.handOn)));
    const a1 = await t.sp(-3.5, 0), a2 = await t.sp(3.5, 0), p1 = await t.sp(-1.75, 0), p2 = await t.sp(1.75, 0);
    // spøkelsesstav: dra fra ankeret mot et punkt (hold fingeren nede)
    await t.drag(a1.x, a1.y, p1.x, p1.y, true); let g = await pg.evaluate(() => { const x = window.__game.bld.bux.ghost; return x && { show: x.show, ok: x.ok, len: x.len, cost: x.cost, why: x.why }; });
    ok('spøkelsesstav følger fingeren: lovlig, med lengde og pris', g && g.show && g.ok && g.len > 1 && g.cost >= 1, JSON.stringify(g)); await t.sh('2_spokelse_gronn'); await t.end();
    let s = await t.info(); ok('slipp på punkt = stav og ny knute', s.rods.length === 1 && s.nodes.length === 3, JSON.stringify(s.rods));
    // ulovlig: for lang stav (rød), slipp = ingen stav
    const far = await t.sp(3.5, 3.5); const n1 = s.nodes.find((n) => !n.fixed); const pn = await t.sp(n1.u, n1.v);
    await t.drag(a1.x, a1.y, far.x, far.y, true); g = await pg.evaluate(() => { const x = window.__game.bld.bux.ghost; return x && { show: x.show, ok: x.ok, why: x.why }; });
    ok('spøkelsesstav er rød når den er for lang', g && g.show && !g.ok && g.why === 'far', JSON.stringify(g)); await t.sh('3_spokelse_rod'); await t.end();
    s = await t.info(); ok('ulovlig slipp lager ingen stav', s.rods.length === 1, String(s.rods.length));
    // fullfør broen ved å dra fra knute til knute
    const m = await t.sp(0, 0); await t.drag(pn.x, pn.y, m.x, m.y); await t.drag(m.x, m.y, p2.x, p2.y); await t.drag(p2.x, p2.y, a2.x, a2.y);
    s = await t.info(); ok('fire staver fra klippe til klippe (bare dra)', s.rods.length === 4, JSON.stringify(s.rods.map((r) => [r.a, r.b])));
    await t.sh('4_bygget');
    // slette-boble: trykk en stav, trykk ✕
    const rm = await pg.evaluate(() => { const i = window.__game.bld.grid.info(), r = i.rods[1], a = i.nodes.find((n) => n.id === r.a), b = i.nodes.find((n) => n.id === r.b); return { u: (a.u + b.u) / 2, v: (a.v + b.v) / 2 }; });
    const rp = await t.sp(rm.u, rm.v); await t.tap(rp.x, rp.y); const del = await pg.locator('#bld .bxdel.show').first().boundingBox().catch(() => null);
    ok('trykk på en stav: ✕-boble ved den (>= 48 px)', !!del && del.width >= 48 && del.height >= 48, JSON.stringify(del)); await t.sh('5_slette_boble');
    await t.tapSel('#bld .bxdel'); s = await t.info(); ok('✕ sletter staven', s.rods.length === 3, String(s.rods.length));
    await t.tapSel('#bld [data-bx="undo"]'); s = await t.info(); ok('↶ angrer', s.rods.length === 4, String(s.rods.length));
    // trykk på tomt punkt = knute
    const e = await t.sp(0, 1.75); await t.tap(e.x, e.y); s = await t.info(); await t.tap(e.x, e.y);   // andre trykk på den eksisterende knuten: valgt og klar til å flyttes
     ok('trykk på tomt rutenettpunkt = knute', s.nodes.length === 4 + 0 || s.nodes.some((n) => n.u === 0 && n.v === 1.75), JSON.stringify(s.nodes.map((n) => [n.u, n.v])));
    // flytt: den nye knuten er valgt: dra den
    const e2 = await t.sp(1.75, 1.75); await t.drag(e.x, e.y, e2.x, e2.y); s = await t.info(); ok('dra en valgt knute = flytt', s.nodes.some((n) => n.u === 1.75 && n.v === 1.75), JSON.stringify(s.nodes.map((n) => [n.u, n.v])));
    // materiale og ⋯
    await t.tapSel('#bld [data-bx="steel"]'); ok('STÅL velger materialet', (await pg.evaluate(() => window.__game.bld.grid.mat)) === 'steel');
    await t.tapSel('#bld [data-bx="more"]'); await t.run(3); const v2 = await t.vis(); ok('⋯ åpner arket med store knapper (>= 48 px)', v2.some((x) => x.k === 'fit') && v2.filter((x) => ['fit', 'dots', 'copy', 'paste', 'best', 'close', 'menu', 'reset'].includes(x.k)).every((x) => x.h >= 48), v2.map((x) => x.k + ':' + Math.round(x.h)).join(',')); await t.sh('6_meny');
    await t.tapSel('#bld [data-bx="dots"]'); ok('rutenett av/på i ⋯', (await pg.evaluate(() => !window.__game.bld.grid.dots))); await t.tapSel('#bld [data-bx="close"]');
    ok('arket lukkes', !(await pg.evaluate(() => document.querySelector('#bld').classList.contains('bxopen'))));
    // rett tilbake til TRE, fjern ekstra knute og prøv
    await t.tapSel('#bld [data-bx="wood"]');
    await pg.evaluate((c) => window.__game.bld.importText(c), 'TLM1.WzIsImJybzEiLFtbLTE3NTAsMF0sWzAsMF0sWzE3NTAsMF1dLFtbMCwyLDBdLFsyLDMsMF0sWzMsNCwwXSxbNCwxLDBdXV0.10lvxrq');
    await t.tapSel('#bld [data-bx="try"]'); await t.run(1); const sim = await t.vis(); ok('under prøven: STOPP, SLOW og PAUSE i samme rad, materialene borte', ['slow', 'pause', 'try'].every((k) => sim.some((x) => x.k === k)) && !sim.some((x) => x.k === 'wood'), sim.map((x) => x.k).join(','));
    for (let i = 0; i < 60 && (await pg.evaluate(() => window.__game.bld.running)); i++) await pg.evaluate(() => window.__game.bld.update(1 / 20, true));
    const res = await pg.evaluate(() => window.__game.bld.result); ok('PRØV: figuren kommer over', res && res.state === 'won', JSON.stringify(res)); await t.sh('7_prove');
  });
  await session('bygglab', ON, async (t, pg) => {
    await t.run(60); const v = await t.vis(), keys = v.map((x) => x.k);
    ok('Bygglab sted 1 (bro) har den forenklede skjermen', keys.includes('more') && !keys.includes('mode'), keys.join(',')); await t.sh('8_lab_bro');
    await t.tapSel('#bld [data-bx="more"]'); await t.run(3); const v2 = await t.vis(); ok('⋯ i Bygglab har ◀ ▶ og NULLSTILL STED/ALLE', ['prev', 'next', 'site', 'all'].every((k) => v2.some((x) => x.k === k)), v2.map((x) => x.k).join(',')); await t.sh('9_lab_meny');
    await t.tapSel('#bld [data-bx="close"]');
    const nextSite = async () => { if (await pg.locator('#bld [data-bx="more"]').first().boundingBox()) { await t.tapSel('#bld [data-bx="more"]'); await t.tapSel('#bld [data-lb="next"]'); if (await pg.locator('#bld [data-bx="close"]').first().boundingBox()) await t.tapSel('#bld [data-bx="close"]'); } else await t.tapSel('#bld [data-lb="next"]'); };
    const goTo = async (id) => { for (let i = 0; i < 8 && (await pg.evaluate(() => window.__game.bld.siteId)) !== id; i++) await nextSite(); return pg.evaluate(() => window.__game.bld.siteId); };
    ok('når sted 4 (fagverk) med ▶', (await goTo('lab4')) === 'lab4');
    await t.run(10); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const k3 = (await t.vis()).map((x) => x.k); ok('sted 4 (fagverk) har den forenklede skjermen (låsen av for testen; med låsen på venter rutenett til forrige sted er bestått)', k3.includes('more') && !k3.includes('mode'), k3.join(',') + ' ' + JSON.stringify(await pg.evaluate(() => ({ id: window.__game.bld.siteId, on: window.__game.bld.grid.on, avail: window.__game.bld.grid.available, wanted: window.__game.bld.bux.wanted(), cls: document.querySelector('#bld').className })))); await t.sh('10_lab_fagverk');
    await nextSite();
    await t.run(10); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const k5 = (await t.vis()).map((x) => x.k); ok('sted 5 (tau) har dagens skjerm', (await pg.evaluate(() => window.__game.bld.siteId)) === 'lab5' && !k5.includes('more') && k5.length >= 8, k5.join(','));
  });
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | ')); await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
