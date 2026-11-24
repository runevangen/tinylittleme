// R157: roller i byggeren (gulv, bjelke, tau) på iPhone 14 med EKTE berøring (CDP Input.dispatchTouchEvent), stående og liggende.
// Sjekker: GULV / BJELKE-knappen ved valgt stav (ny rutenett-skjerm) og valgt del (ny klassisk skjerm og gammel skjerm), ett trykk bytter rolle, ↶ angrer,
// standardrollen følger helningen, varsler før prøven (ingen gulvdel, hull i gulvet), bare gulv blir faste flater i rommet, ingen konsollfeil.
// node tools/live_roles.cjs <utmappe> [port]   (playwright via NODE_PATH). Exit 1 ved feil. Ingen GPU (swiftshader ~1 fps): ingen FPS-krav; om skillet er lett å se «testes på iPhone».
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
      drag: async (x0, y0, x1, y1) => { await tp('touchStart', x0, y0); for (let i = 1; i <= 8; i++) { await tp('touchMove', x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await pg.waitForTimeout(30); } await run(2); await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); },
      sp: (u, v) => pg.evaluate(([u, v]) => { const q = window.__game.bld.screenPos(u, v), r = document.querySelector('#bld canvas').getBoundingClientRect(); return { x: r.x + q.x, y: r.y + q.y }; }, [u, v]),
      rod: async (a, c) => { const p = await t.sp(...a), q = await t.sp(...c); await t.drag(p.x, p.y, q.x, q.y); },
      chips: () => pg.evaluate(() => [...document.querySelectorAll('#bld .chip')].map((e) => ({ id: e.dataset.id, used: e.classList.contains('used') }))),
      place: async (id, u, v) => { const l = pg.locator(`#bld .chip[data-id="${id}"]`); await l.scrollIntoViewIfNeeded(); const r = await l.boundingBox(), p = await t.sp(u, v); await t.drag(r.x + r.width / 2, r.y + r.height / 2, p.x, p.y); },
      sh: async (n) => { await run(2); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/roles_${n}.png`, timeout: 60000 }); },
      roles: () => pg.evaluate(() => { const r = window.__game.bld.roles; return { stats: r.stats(), btn: r.btn, warn: r.warn(), on: r.on }; }),
      of: (id) => pg.evaluate((id) => window.__game.bld.roles.of(id), id),
      st: () => pg.evaluate(() => window.__game.bld.state()), info: () => pg.evaluate(() => window.__game.bld.grid.info()),
      land: async () => { await pg.setViewportSize({ width: 844, height: 390 }); await pg.waitForTimeout(250); await run(6); }, port: async () => { await pg.setViewportSize({ width: 390, height: 664 }); await pg.waitForTimeout(250); await run(6); },
      inView: async (r) => { const v = await pg.evaluate(() => ({ w: innerWidth, h: innerHeight })); return !!r && r.x >= 0 && r.y >= 0 && r.x + r.w <= v.w + 0.5 && r.y + r.h <= v.h + 0.5; },
      overlaps: (r) => pg.evaluate((r) => { const vis = (e) => { const q = e.getBoundingClientRect(), cs = getComputedStyle(e); return q.width > 0 && q.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; }; return [...document.querySelectorAll('#bld button, #qbtn')].filter((e) => !e.classList.contains('rolebtn') && vis(e)).map((e) => { const q = e.getBoundingClientRect(); return { k: e.dataset.bx || e.dataset.cx || e.dataset.a || e.dataset.th || e.dataset.sw || e.id || e.className, x: q.left, y: q.top, r: q.right, b: q.bottom }; }).filter((q) => q.x < r.x + r.w && q.r > r.x && q.y < r.y + r.h && q.b > r.y).map((q) => q.k); }, r),
      win: async () => { for (let i = 0; i < 200 && (await pg.evaluate(() => window.__game.bld.running)); i++) await pg.evaluate(() => window.__game.bld.update(1 / 20, true)); return await pg.evaluate(() => window.__game.bld.result); },
      ev: (re) => pg.evaluate((re) => (window.__game.evLog || []).filter((e) => new RegExp(re).test(`${e.type} ${e.detail}`)).map((e) => e.detail), re),
    };
    await fn(t, pg); await ctx.close();
  }
  const ON = () => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.gridlock', 'false'); localStorage.setItem('tlm.buildall', 'true'); localStorage.setItem('tlm.cbxhand', '1'); localStorage.setItem('tlm.skole', JSON.stringify({ opened: true, card: 'skipped', done: false })); } catch (e) { /* ok */ } };
  const OFF = () => { try { localStorage.setItem('tlm.buildux', 'false'); localStorage.setItem('tlm.buildall', 'true'); localStorage.setItem('tlm.skole', JSON.stringify({ opened: true, card: 'skipped', done: false })); } catch (e) { /* ok */ } };

  // ---- 1) ny rutenett-skjerm (Byggeskolen · Fagverk): staver, valgt stav, GULV / BJELKE ----
  await session('bygglab', ON, async (t, pg) => {
    await t.open('lab1'); await t.run(10); ok('åpner Bro (lab1)', (await t.st()).active === 'lab1');
    ok('ny rutenett-skjerm', await pg.evaluate(() => window.__game.bld.bux.on() && window.__game.bld.grid.on));
    const st = 1.75, A = [-3.5, 0];
    await t.rod(A, [-3.5 + st, st]);   // bare en skrå støtte: ingen gulvdel ennå
    let r = await t.roles(); ok('skrå stav fra ankeret er BJELKE (ikke på veilinjen)', r.stats && r.stats.bjelke === 1 && r.stats.gulv === 0, JSON.stringify(r.stats));
    ok('varsel: ingen gulvdel, og hele gapet er markert', r.warn.none === true && r.warn.gaps.length === 1, JSON.stringify(r.warn)); await t.sh('1_rutenett_ingen_gulv');
    const started = await pg.evaluate(() => window.__game.bld.startTry()); await t.run(3);
    ok('PRØV stoppes med beskjed når ingen del er gulv', started === false && !(await pg.evaluate(() => window.__game.bld.running)));
    const toast = await pg.evaluate(() => document.body.innerText); ok('beskjeden nevner GULV-knappen', /Du trenger noe å gå på\. Velg en del og trykk GULV\./.test(toast));
    await t.rod(A, [-3.5 + st, 0]); r = await t.roles(); ok('stav langs veilinjen er GULV', r.stats.gulv === 1 && r.stats.bjelke === 1, JSON.stringify(r.stats));
    ok('hull i gulvet er markert (resten av gapet)', r.warn.none === false && r.warn.gaps.length === 1 && r.warn.gaps[0].len > 2.5, JSON.stringify(r.warn.gaps)); await t.sh('2_rutenett_hull');
    await t.rod([-3.5 + st, 0], [0, 0]); await t.rod([0, 0], [st, 0]); await t.rod([st, 0], [3.5, 0]); await t.rod([-3.5 + st, st], [0, 0]);
    r = await t.roles(); ok('fire veistaver er gulv, to skrå er bjelker', r.stats.gulv === 4 && r.stats.bjelke === 2 && r.stats.valgt === 0, JSON.stringify(r.stats)); ok('ingen hull igjen', r.warn.gaps.length === 0);
    // velg den skrå støtta med et trykk: knappen kommer
    const info = await t.info(), sup = info.rods.find((q) => { const a = info.nodes.find((n) => n.id === q.a), c = info.nodes.find((n) => n.id === q.b); return [a, c].some((n) => n.fixed) && [a, c].some((n) => n.v > 0.5); });
    const mid = await t.sp(-3.5 + st / 2, st / 2); await t.tap(mid.x, mid.y); await t.run(3);
    ok('trykk på staven velger den', (await pg.evaluate(() => window.__game.bld.grid.selRod)) === sup.id, sup.id);
    r = await t.roles(); ok('GULV / BJELKE-knappen vises ved valgt stav og viser BJELKE', r.btn.shown && r.btn.role === 'bjelke', JSON.stringify(r.btn));
    ok('knappen er stor nok for en finger (>= 44 px høy, >= 120 px bred)', r.btn.rect && r.btn.rect.h >= 44 && r.btn.rect.w >= 120, JSON.stringify(r.btn.rect)); ok('knappen er innenfor skjermen', await t.inView(r.btn.rect));
    let ov = await t.overlaps(r.btn.rect); ok('knappen dekker ingen andre knapper (stående)', ov.length === 0, ov.join(',')); await t.sh('3_rutenett_valgt_bjelke_staaende');
    await t.tapSel('#bld .rolebtn'); r = await t.roles(); ok('ett trykk: støtta er nå GULV', (await t.of(sup.id)) === 'gulv' && r.btn.role === 'gulv' && r.stats.valgt === 1, JSON.stringify(r.stats)); await t.sh('4_rutenett_valgt_gulv_staaende');
    ok('rollebyttet er logget', (await t.ev('rolle ' + sup.id)).length === 1, JSON.stringify(await t.ev('rolle ')));
    await t.tapSel('#bld [data-bx="undo"]'); ok('↶ angrer rollebyttet', (await t.of(sup.id)) === 'bjelke');
    // liggende
    await t.land(); const m2 = await t.sp(-3.5 + st / 2, st / 2); if ((await pg.evaluate(() => window.__game.bld.grid.selRod)) !== sup.id) await t.tap(m2.x, m2.y); await t.run(3);
    r = await t.roles(); ok('liggende: knappen vises og er innenfor skjermen', r.btn.shown && (await t.inView(r.btn.rect)), JSON.stringify(r.btn)); ov = r.btn.rect ? await t.overlaps(r.btn.rect) : ['mangler']; ok('liggende: knappen dekker ingen andre knapper', ov.length === 0, ov.join(',')); await t.sh('5_rutenett_valgt_liggende');
    await t.tapSel('#bld .rolebtn'); ok('liggende: ett trykk bytter rolle', (await t.of(sup.id)) === 'gulv'); await t.tapSel('#bld .rolebtn'); ok('og tilbake til bjelke', (await t.of(sup.id)) === 'bjelke');
    await t.port();
    // i rommet: bare gulvet er faste flater
    const w = await pg.evaluate(() => { const b = window.__game.bld; b.world.commit('lab1'); const i = b.world.info('lab1'); return { roles: b.roles.world('lab1'), boxes: [...new Set(i.boxes.map((q) => q.id))], meshes: i.meshes.length }; });
    const beams = Object.entries(w.roles).filter(([, v]) => v === 'bjelke').map(([k]) => k); ok('i rommet: bjelkene har ingen kollisjonsflater', beams.length === 2 && beams.every((id) => !w.boxes.some((q) => q.endsWith('_' + id))) && w.boxes.length === 4, JSON.stringify(w.boxes)); ok('i rommet: alle seks stavene tegnes (samme antall som før)', w.meshes === 6, String(w.meshes));
    await pg.evaluate(() => window.__game.bld.world.uncommit('lab1'));
    // PRØV: lasten går på veien og forbi bjelkene
    ok('PRØV starter', await pg.evaluate(() => window.__game.bld.startTry())); await t.run(20); await t.sh('6_rutenett_prov'); const res = await t.win(); console.log('    prøve:', JSON.stringify(res && { state: res.state, reason: res.reason }));
    ok('prøven ble kjørt til ende', !!res && res.state !== 'run'); ok('prøven logger rollene', (await t.ev('prøv lab1.*roller gulv 4, bjelke 2')).length >= 1);
  });

  // ---- 2) ny klassisk skjerm (Byggeskolen · Trapp): planke og kloss ----
  await session('bygglab', ON, async (t, pg) => {
    await pg.evaluate(() => window.__game.bld.lab.go(1)); await t.run(10); ok('åpner Trapp (lab2)', (await t.st()).active === 'lab2', JSON.stringify((await t.st()).active)); ok('ny klassisk skjerm', await pg.evaluate(() => window.__game.bld.cbx.on()));
    const chips = await t.chips(), types = await pg.evaluate(() => Object.fromEntries([...document.querySelectorAll('#bld .chip')].map((e) => [e.dataset.id, e.dataset.type || e.title || e.getAttribute('aria-label') || ''])));
    const pick = (re) => chips.find((c) => !c.used && re.test(c.id + ' ' + types[c.id]));
    const plank = pick(/plank_s|kort planke|short plank/i) || pick(/plank/i), block = pick(/block|kloss/i);
    ok('delebrettet har planke og kloss', !!plank && !!block, JSON.stringify(chips.slice(0, 12)));
    await t.place(plank.id, -3, 3); await t.place(block.id, 1, 0.75); let r = await t.roles(); ok('flat planke og kloss starter som GULV', r.stats.gulv === 2 && r.stats.bjelke === 0, JSON.stringify(r.stats));
    const pp = async () => { const s = await t.st(), q = s.builds.find((x) => x.id === 'lab2').parts.find((x) => x.id === plank.id); return t.sp(q.u, q.v); };
    let c = await pp(); await t.tap(c.x, c.y); r = await t.roles(); ok('valgt planke: knappen vises og viser GULV', r.btn.shown && r.btn.role === 'gulv', JSON.stringify(r.btn)); await t.sh('7_klassisk_valgt_gulv_staaende');
    for (let i = 0; i < 3; i++) await t.tapSel('#bld .cxsel [data-cx="rotl"]');
    r = await t.roles(); ok('rotert til 45°: standardrollen følger med og blir BJELKE', (await t.of(plank.id)) === 'bjelke' && r.btn.role === 'bjelke', JSON.stringify(r.btn));
    let ov = await t.overlaps(r.btn.rect); ok('knappen dekker ingen andre knapper (stående, klassisk)', ov.length === 0, ov.join(',')); ok('innenfor skjermen', await t.inView(r.btn.rect)); await t.sh('8_klassisk_skraa_bjelke_staaende');
    await t.tapSel('#bld .rolebtn'); ok('ett trykk: den skrå planken er GULV (valgt selv)', (await t.of(plank.id)) === 'gulv' && (await t.roles()).stats.valgt === 1);
    for (let i = 0; i < 3; i++) await t.tapSel('#bld .cxsel [data-cx="rotl"]'); ok('valget står fast når delen roteres videre (90°)', (await t.of(plank.id)) === 'gulv');
    await t.tapSel('#bld [data-cx="undo"]'); await t.tapSel('#bld [data-cx="undo"]'); await t.tapSel('#bld [data-cx="undo"]'); await t.tapSel('#bld [data-cx="undo"]'); ok('↶ angrer rollebyttet', (await t.of(plank.id)) === 'bjelke');
    const bp = await t.sp(1, 0.75); await t.tap(bp.x, bp.y); r = await t.roles(); ok('valgt kloss: knappen viser GULV', r.btn.shown && r.btn.role === 'gulv', JSON.stringify(r.btn));
    await t.tapSel('#bld .rolebtn'); ok('klossen kan merkes som BJELKE', (await t.of(block.id)) === 'bjelke'); await t.sh('9_klassisk_kloss_bjelke_staaende');
    r = await t.roles(); ok('begge er bjelker: varsel om ingen gulvdel', r.warn.none === true, JSON.stringify(r.warn));
    await t.land(); await t.tap(...Object.values(await t.sp(1, 0.75))); r = await t.roles(); ok('liggende (klassisk): knappen vises og er innenfor skjermen', r.btn.shown && (await t.inView(r.btn.rect)), JSON.stringify(r.btn)); ov = r.btn.rect ? await t.overlaps(r.btn.rect) : ['mangler']; ok('liggende (klassisk): dekker ingen andre knapper', ov.length === 0, ov.join(',')); await t.sh('10_klassisk_liggende');
    await t.tapSel('#bld .rolebtn'); ok('liggende: ett trykk gjør klossen til GULV igjen', (await t.of(block.id)) === 'gulv');
    const w = await pg.evaluate(() => { const b = window.__game.bld; b.world.commit('lab2'); const i = b.world.info('lab2'); return { roles: b.roles.world('lab2'), boxes: [...new Set(i.boxes.map((q) => q.id))], meshes: i.meshes.length }; });
    ok('i rommet: den skrå planken (bjelke) er ikke en trapp av små trinn, klossen (gulv) er fast', w.boxes.length === 1 && w.boxes[0].endsWith('_' + block.id) && w.meshes === 2, JSON.stringify(w));
  });

  // ---- 3) gammel skjerm (valget buildux av): samme knapp ----
  await session('bygglab', OFF, async (t, pg) => {
    await t.open('lab1'); await t.run(10); ok('åpner Bro (lab1), gammel skjerm', (await t.st()).active === 'lab1'); ok('gammel skjerm', !(await pg.evaluate(() => window.__game.bld.cbx.on() || window.__game.bld.bux.on())));
    const chips = await t.chips(), plank = chips.find((c) => /plank/i.test(c.id)) || chips[0];
    await t.place(plank.id, 0, 3); const s = await t.st(), q = s.builds.find((x) => x.id === 'lab1').parts[0], c = await t.sp(q.u, q.v); await t.tap(c.x, c.y);
    let r = await t.roles(); ok('gammel skjerm: knappen vises ved valgt del', r.btn.shown && (await t.inView(r.btn.rect)), JSON.stringify(r.btn)); await t.sh('11_gammel_klassisk');
    const before = await t.of(q.id); await t.tapSel('#bld .rolebtn'); ok('gammel skjerm: ett trykk bytter rolle', (await t.of(q.id)) !== before);
    await pg.evaluate(() => { localStorage.setItem('tlm.buildgridpass', 'false'); });
  });
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); srv.close(); console.log(bad ? `${bad} FEIL` : 'live_roles: alt ok'); process.exit(bad ? 1 : 0);
})();
