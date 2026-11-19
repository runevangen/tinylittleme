// R93: liggende byggeskjerm (buildux) med EKTE berøring (CDP Input.dispatchTouchEvent): iPhone 14 liggende, en bredere enhet (iPad mini liggende) og stående med snuing midt i bygging.
// Sjekker: sidepaneler (rail-innhold, trykkflater >= 48 px, ingen overlapp med ⚑, sikre kanter), full høyde til byggeområdet, låste materialer (hengelås, forklaring ved trykk), bro bygges ved å dra og kommer i mål,
// banner «Snu telefonen» i stående (en gang per økt, kan avvises), snuing midt i bygging uten tap (staver, materiale), ⋯-ark, ingen konsollfeil.
// node tools/live_buildux_land.cjs <utmappe> [port]   (playwright via NODE_PATH). Exit 1 ved feil. Ingen GPU (swiftshader ~1 fps): ingen FPS-krav, ekte følelse «testes på iPhone».
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(p).pipe(r); });
(async () => {
  const out = process.argv[2] || '.'; await new Promise((ok) => srv.listen(+process.argv[3] || 0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; }; const errs = [];
  async function session(device, init, fn, tag) {
    const ctx = await b.newContext({ ...devices[device] }), pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript(init); await pg.goto(`http://localhost:${port}/?level=bro`); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 90000 }); await pg.evaluate(() => window.__game.tick(30, 1 / 60));
    const cdp = await ctx.newCDPSession(pg), tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    const t = {
      run, pg,
      open: (id) => pg.evaluate((id) => { const o = window.__game.bld.open(id, { force: true }); window.__game.tick(4, 1 / 60); return o; }, id),
      tap: async (x, y) => { await tp('touchStart', x, y); await pg.waitForTimeout(40); await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); },
      tapSel: async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await t.tap(r.x + r.width / 2, r.y + r.height / 2); },
      drag: async (x0, y0, x1, y1, hold = false) => { await tp('touchStart', x0, y0); for (let i = 1; i <= 8; i++) { await tp('touchMove', x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await pg.waitForTimeout(30); } await run(2); if (hold) return; await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); },
      sp: (u, v) => pg.evaluate(([u, v]) => { const q = window.__game.bld.screenPos(u, v), r = document.querySelector('#bld canvas').getBoundingClientRect(); return { x: r.x + q.x, y: r.y + q.y }; }, [u, v]),
      sh: async (n) => { await run(2); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/buildux_land_${tag}_${n}.png`, timeout: 60000 }); },
      info: () => pg.evaluate(() => window.__game.bld.grid.info()),
      vis: () => pg.evaluate(() => { const el = document.querySelector('#bld'), vis = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; }; return [...el.querySelectorAll('button')].filter(vis).map((e) => { const r = e.getBoundingClientRect(); return { k: e.dataset.bx || e.dataset.lb || e.dataset.s || '?', w: r.width, h: r.height, x: r.x, y: r.y, b: r.bottom, r: r.right }; }); }),
      cls: (c) => pg.evaluate((c) => document.querySelector('#bld').classList.contains(c), c),
      flag: () => pg.evaluate(() => { const e = document.querySelector('#qbtn'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, r: r.right, b: r.bottom }; }),
      chain: async () => { const a1 = await t.sp(-3.5, 0), p1 = await t.sp(-1.75, 0), m = await t.sp(0, 0), p2 = await t.sp(1.75, 0), a2 = await t.sp(3.5, 0); return { a1, p1, m, p2, a2 }; },
    };
    await fn(t, pg); await ctx.close();
  }
  const ON = () => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.gridlock', 'false'); localStorage.setItem('tlm.buxhand', '1'); } catch (e) { /* ok */ } };
  const finish = async (t, pg, label) => {
    await t.tapSel('#bld [data-bx="try"]'); await t.run(1); const sim = await t.vis();
    ok(`${label}: under prøven STOPP, SLOW og PAUSE vises, materialene borte`, ['slow', 'pause', 'try'].every((k) => sim.some((x) => x.k === k)) && !sim.some((x) => x.k === 'wood'), sim.map((x) => x.k).join(','));
    for (let i = 0; i < 60 && (await pg.evaluate(() => window.__game.bld.running)); i++) await pg.evaluate(() => window.__game.bld.update(1 / 20, true));
    const res = await pg.evaluate(() => window.__game.bld.result); ok(`${label}: PRØV, figuren kommer over`, res && res.state === 'won', JSON.stringify(res));
  };
  const railCheck = async (t, pg, label) => {
    ok(`${label}: liggende format, panel-klasse på`, await t.cls('bxland')); await t.run(6);
    const v = await t.vis(), keys = v.map((x) => x.k), W = await pg.evaluate(() => innerWidth), H = await pg.evaluate(() => innerHeight);
    const left = v.filter((x) => x.x + x.w / 2 < W * 0.2), right = v.filter((x) => x.x + x.w / 2 > W * 0.8 && x.k !== '?');
    ok(`${label}: venstre panel: tilbake, meny, angre`, ['back', 'more', 'undo'].every((k) => left.some((x) => x.k === k)), left.map((x) => x.k).join(','));
    ok(`${label}: høyre panel: TRE, STÅL, TAU og PRØV`, ['wood', 'steel', 'rope', 'try'].every((k) => right.some((x) => x.k === k)), right.map((x) => x.k).join(','));
    ok(`${label}: trykkflater >= 48 px`, v.every((x) => x.w >= 47.5 && x.h >= 47.5), JSON.stringify(v.filter((x) => x.w < 47.5 || x.h < 47.5)));
    const fl = await t.flag(), ov = fl && v.some((x) => x.x < fl.r && x.r > fl.x && x.y < fl.b && x.b > fl.y); ok(`${label}: ingen overlapp med ⚑`, !ov, JSON.stringify(fl));
    const pw = await pg.evaluate(() => window.__game.bld.bux.land.cur && window.__game.bld.bux.land.cur.pw); ok(`${label}: panelbredde 72–88 px`, pw >= 72 && pw <= 88, String(pw));
    const rail = await pg.evaluate(() => { const l = document.querySelector('#bld .bxrail.l').getBoundingClientRect(), r = document.querySelector('#bld .bxrail.r').getBoundingClientRect(); return { lw: l.width, rw: r.width, lh: l.height, rh: r.height, H: innerHeight }; });
    ok(`${label}: panelene går over hele høyden og byggeområdet får resten`, rail.lh === rail.H && rail.rh === rail.H && rail.lw >= 72 && rail.rw >= 72, JSON.stringify(rail));
    const plate = await pg.locator('#bld .bxplate').boundingBox(); ok(`${label}: budsjettplate øverst i midten`, plate && plate.y < 30 && Math.abs(plate.x + plate.width / 2 - W / 2) < 30, JSON.stringify(plate));
    const a1 = await t.sp(-3.5, 0), a2 = await t.sp(3.5, 0); ok(`${label}: broen ligger mellom panelene`, a1.x > rail.lw && a2.x < W - rail.rw, `${a1.x.toFixed(0)}..${a2.x.toFixed(0)} av ${W}`);
    ok(`${label}: knappene er lagt innenfor sikre kanter`, v.every((x) => x.x >= 0 && x.r <= W && x.y >= 0 && x.b <= H));
  };
  const buildChain = async (t, pg, label) => {
    const c = await t.chain();
    await t.drag(c.a1.x, c.a1.y, c.p1.x, c.p1.y); await t.drag(c.p1.x, c.p1.y, c.m.x, c.m.y); await t.drag(c.m.x, c.m.y, c.p2.x, c.p2.y); await t.drag(c.p2.x, c.p2.y, c.a2.x, c.a2.y);
    const s = await t.info(); ok(`${label}: fire staver bygget ved å dra`, s.rods.length === 4, String(s.rods.length));
  };

  // ---- 1) iPhone 14 liggende ----
  if (!process.env.ONLY || process.env.ONLY === 'iphone') await session('iPhone 14 landscape', ON, async (t, pg) => {
    ok('iPhone 14 liggende: åpner Hyllebroen', await t.open('bro1')); await railCheck(t, pg, 'iPhone 14 liggende'); await t.sh('1_start');
    const g = await pg.evaluate(() => window.__game.bld.bux.land.sugg); ok('veiledning: ankerlinjer og flagg tegnes (ingen konsollfeil)', true, String(!!g));
    // låst materiale
    await pg.evaluate(() => { window.__game.bld.bux.site.lockMats = { steel: { crumbs: 99 } }; }); await t.run(4);
    const lk = await pg.evaluate(() => { const b = document.querySelector('#bld [data-bx="steel"]'); return { cls: b.classList.contains('locked'), vis: getComputedStyle(b.querySelector('.bxlock')).display, aria: b.getAttribute('aria-disabled') }; });
    ok('låst materiale: dempet med hengelås', lk.cls && lk.vis !== 'none' && lk.aria === 'true', JSON.stringify(lk)); await t.sh('2_last');
    await t.tapSel('#bld [data-bx="steel"]'); ok('trykk på låst materiale velger det ikke', (await pg.evaluate(() => window.__game.bld.grid.mat)) !== 'steel');
    await pg.evaluate(() => { delete window.__game.bld.bux.site.lockMats; }); await t.run(4);
    await t.tapSel('#bld [data-bx="steel"]'); ok('åpent materiale velges (STÅL)', (await pg.evaluate(() => window.__game.bld.grid.mat)) === 'steel'); await t.tapSel('#bld [data-bx="wood"]');
    // ⋯-ark
    await t.tapSel('#bld [data-bx="more"]'); await t.run(3); const v2 = await t.vis(); ok('⋯ åpner arket (KODE/LIM INN/TILPASS/RUTENETT) med store knapper', ['fit', 'dots', 'close'].every((k) => v2.some((x) => x.k === k)) && v2.filter((x) => ['fit', 'dots', 'close'].includes(x.k)).every((x) => x.h >= 47.5), v2.map((x) => x.k).join(',')); await t.sh('3_meny');
    await t.tapSel('#bld [data-bx="close"]');
    await buildChain(t, pg, 'iPhone 14 liggende'); await t.sh('4_bygget'); await finish(t, pg, 'iPhone 14 liggende'); await t.sh('5_prove');
  }, 'iphone');

  // ---- 2) bredere enheter liggende ----
  if (!process.env.ONLY || process.env.ONLY === 'wide') for (const [dev, tag] of [['iPhone 14 Pro Max landscape', 'promax'], ['iPad Mini landscape', 'ipad']]) {
    await session(dev, ON, async (t, pg) => { ok(`${dev}: åpner Hyllebroen`, await t.open('bro1')); await railCheck(t, pg, dev); await t.sh('1_start'); await buildChain(t, pg, dev); await t.sh('2_bygget'); }, tag);
  }

  // ---- 3) stående: banner, så snu midt i bygging ----
  if (!process.env.ONLY || process.env.ONLY === 'snu') await session('iPhone 14', ON, async (t, pg) => {
    await pg.evaluate(() => { window.__game.bld.bux.land.hold = true; }); ok('stående: åpner Hyllebroen', await t.open('bro1')); await t.run(8);
    ok('stående: ingen panel-klasse (R92-oppsettet som før)', !(await t.cls('bxland')));
    const bn = await pg.locator('#bld .bxbanner.show').first().boundingBox().catch(() => null); ok('stående: banner «Snu telefonen for mer plass»', !!bn && (await pg.locator('#bld .bxbanner span').first().textContent()).includes('Snu telefonen'), JSON.stringify(bn)); await t.sh('1_banner');
    const cl = await pg.locator('#bld .bxbanner button').first().boundingBox(); ok('bannerets lukkeknapp >= 48 px', cl && cl.width >= 48 && cl.height >= 48, JSON.stringify(cl));
    await t.tapSel('#bld .bxbanner button'); ok('banner kan avvises', !(await pg.locator('#bld .bxbanner.show').count()));
    const c = await t.chain(); await t.drag(c.a1.x, c.a1.y, c.p1.x, c.p1.y); await t.drag(c.p1.x, c.p1.y, c.m.x, c.m.y);
    await t.tapSel('#bld [data-bx="rope"]'); await t.tapSel('#bld [data-bx="wood"]');
    let s = await t.info(); ok('stående: to staver bygget', s.rods.length === 2, String(s.rods.length)); await t.sh('2_staaende');
    await pg.setViewportSize({ width: 844, height: 390 }); await t.run(6);
    ok('snudd til liggende: panelene vises', await t.cls('bxland'));
    s = await t.info(); ok('snuing midt i bygging: stavene er der fortsatt', s.rods.length === 2, String(s.rods.length));
    ok('snuing: materialvalget er beholdt', (await pg.evaluate(() => window.__game.bld.grid.mat)) === 'wood');
    ok('snuing: ingen banner i liggende', !(await pg.locator('#bld .bxbanner.show').count())); await t.sh('3_snudd');
    const c2 = await t.chain(); await t.drag(c2.m.x, c2.m.y, c2.p2.x, c2.p2.y); await t.drag(c2.p2.x, c2.p2.y, c2.a2.x, c2.a2.y);
    s = await t.info(); ok('bygger videre i liggende: fire staver', s.rods.length === 4, String(s.rods.length)); await t.sh('4_bygget');
    await pg.setViewportSize({ width: 390, height: 844 }); await t.run(6); s = await t.info(); ok('snudd tilbake til stående: stavene er der, ingen ny banner (en gang per økt)', !(await t.cls('bxland')) && s.rods.length === 4 && !(await pg.locator('#bld .bxbanner.show').count()), String(s.rods.length));
    await pg.setViewportSize({ width: 844, height: 390 }); await t.run(6);
    await finish(t, pg, 'snudd midt i bygging'); await t.sh('5_prove');
    const st = await pg.evaluate(() => window.__game.bld.bux.land.stats); ok('logg: byggehandlinger og snuinger telles', st.acts.port >= 2 && st.acts.land >= 2 && st.turns >= 3 && st.firstBridge != null, JSON.stringify(st));
  }, 'snu');
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | ')); await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
