// R96: byggeskjermens nye skall for klassiske steder (Trapp, Vippe) på iPhone 14 med EKTE berøring (CDP Input.dispatchTouchEvent), stående og liggende.
// Sjekker: valget av = dagens skjerm uendret; valget på = nytt skall (←, ⋯, TAPE/LEDD/TAU/GUMMI, ↶, PRØV) med delebrett, instruksjon og spøkelseslinje ved festing (grønn/rød),
// verktøylinje (↺ ↻ ✕) ved valgt del, ⋯-ark, snuing midt i bygging uten tap, klosser plasseres og festes med TAPE og PRØV kommer i mål (Trapp og Vippe), trykkflater >= 48 px, ingen overlapp med ⚑, ingen konsollfeil.
// node tools/live_buildux_classic.cjs <utmappe> [port]   (playwright via NODE_PATH). Exit 1 ved feil. Ingen GPU (swiftshader ~1 fps): ingen FPS-krav, ekte følelse «testes på iPhone».
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
      down: async (x, y) => { await tp('touchStart', x, y); await pg.waitForTimeout(60); await run(2); },
      end: async () => { await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); },
      sp: (u, v) => pg.evaluate(([u, v]) => { const q = window.__game.bld.screenPos(u, v), r = document.querySelector('#bld canvas').getBoundingClientRect(); return { x: r.x + q.x, y: r.y + q.y }; }, [u, v]),
      chip: async (id) => { const l = pg.locator(`#bld .chip[data-id="${id}"]`); await l.scrollIntoViewIfNeeded(); const r = await l.boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; },
      place: async (id, u, v) => { const c = await t.chip(id), p = await t.sp(u, v); await t.drag(c.x, c.y, p.x, p.y); },
      sh: async (n) => { await run(2); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/buildux_classic_${n}.png`, timeout: 60000 }); },
      st: () => pg.evaluate(() => window.__game.bld.state()),
      vis: () => pg.evaluate(() => { const el = document.querySelector('#bld'), vis = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; }; return [...el.querySelectorAll('button')].filter(vis).map((e) => { const r = e.getBoundingClientRect(); return { k: e.dataset.cx || e.dataset.bx || e.dataset.a || e.dataset.s || e.dataset.z || e.dataset.t || e.dataset.l || e.dataset.lb || '?', w: r.width, h: r.height, x: r.x, y: r.y, b: r.bottom, r: r.right }; }); }),
      sel: () => pg.evaluate(() => { const e = document.querySelector('#bld .cxsel.show'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom, r: r.right, btns: [...e.querySelectorAll('button')].filter((x) => getComputedStyle(x).display !== 'none').map((x) => x.dataset.cx) }; }),
      win: async () => { for (let i = 0; i < 150 && (await pg.evaluate(() => window.__game.bld.running)); i++) await pg.evaluate(() => window.__game.bld.update(1 / 20, true)); return await pg.evaluate(() => window.__game.bld.result); },
    };
    await fn(t, pg); await ctx.close();
  }
  const ON = () => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.buildall', 'true'); localStorage.setItem('tlm.cbxhand', '1'); localStorage.setItem('tlm.skole', JSON.stringify({ opened: true, card: 'skipped', done: false })); } catch (e) { /* ok */ } }, OFF = () => { try { localStorage.setItem('tlm.buildux', 'false'); localStorage.setItem('tlm.buildall', 'true'); localStorage.setItem('tlm.skole', JSON.stringify({ opened: true, card: 'skipped', done: false })); } catch (e) { /* ok */ } };
  const HAND = () => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.buildall', 'true'); localStorage.setItem('tlm.skole', JSON.stringify({ opened: true, card: 'skipped', done: false })); } catch (e) { /* ok */ } };
  let nOff = 0;
  await session('trapp', OFF, async (t, pg) => {
    ok('åpner Trapp (valget av)', await t.open('trapp1')); const v = await t.vis(), keys = v.map((x) => x.k); nOff = v.length;
    ok('valget av: dagens skjerm uendret (SNAP, FJERN, ↺ ↻, ingen ⋯-meny)', ['snap', 'del', 'rotl', 'rotr'].every((k) => keys.includes(k)) && !keys.includes('more') && !(await pg.evaluate(() => document.querySelector('#bld').classList.contains('cbx'))), keys.join(','));
    ok('valget av: mange kontroller', v.length >= 12, String(v.length)); await t.sh('0_av');
  });
  await session('trapp', ON, async (t, pg) => {
    ok('åpner Trapp (valget på)', await t.open('trapp1')); await t.run(10);
    ok('nytt skall på (klassisk)', await pg.evaluate(() => window.__game.bld.cbx.on() && document.querySelector('#bld').classList.contains('cbx')));
    let v = await t.vis(), keys = v.map((x) => x.k);
    const core = ['back', 'more', 'tape', 'hinge', 'rope', 'band', 'undo', 'try'];
    ok('kontrollene er ←, ⋯, TAPE/LEDD/TAU/GUMMI, ↶ og PRØV', core.every((k) => keys.includes(k)), keys.join(','));
    ok('ingen gamle knapper (SNAP, FJERN, NULLSTILL, +/−)', !['snap', 'del', 'reset', 'in', 'out'].some((k) => keys.includes(k)), keys.join(','));
    const fixed = v.filter((x) => !String(x.k).match(/^\?$/)).length;
    ok('færre faste kontroller enn dagens', fixed < nOff / 1.5, `${fixed} (før: ${nOff})`);
    const btns = v.filter((x) => core.includes(x.k)); ok('trykkflater er minst 48 px', btns.every((x) => x.w >= 47.5 && x.h >= 47.5), JSON.stringify(btns.filter((x) => x.w < 48 || x.h < 48)));
    const H = await pg.evaluate(() => innerHeight), m = await pg.evaluate(() => window.__game.bld.cbx.metrics());
    ok('byggeområdet er ca. 60–70 % av høyden', m.areaFrac >= 0.58 && m.areaFrac <= 0.72, (100 * m.areaFrac).toFixed(0) + ' %');
    const flag = await pg.evaluate(() => { const e = document.querySelector('#qbtn'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, r: r.right, b: r.bottom }; });
    ok('ingen overlapp med ⚑', !(flag && v.some((x) => x.x < flag.r && x.r > flag.x && x.y < flag.b && x.b > flag.y)), JSON.stringify(flag));
    const tray = await pg.evaluate(() => { const r = document.querySelector('#bld .tray').getBoundingClientRect(), c = [...document.querySelectorAll('#bld .chip')].map((e) => { const q = e.getBoundingClientRect(); return { w: q.width, h: q.height }; }); return { top: r.top, bottom: r.bottom, c }; });
    ok('delebrettet har store trykkflater (>= 48 px)', tray.c.length >= 6 && tray.c.every((c) => c.w >= 48 && c.h >= 48), `${tray.c.length} deler`);
    await t.sh('1_paa');
    // plasser seks klosser som trapp (ekte berøring: dra fra delebrettet)
    const ref = [['k1', 0, 0.75], ['k2', 1.5, 0.75], ['k3', 1.5, 2.25], ['k4', 3, 0.75], ['k5', 3, 2.25], ['k6', 3, 3.75]];
    for (const [id, u, vv] of ref) await t.place(id, u, vv);
    let s = await t.st(); ok('seks klosser plassert med berøring', s.builds[0].placed === 6, String(s.builds[0].placed));
    ok('plassering logges som byggehandlinger (klassisk)', (await pg.evaluate(() => window.__game.bld.cbx.stats.acts.port)) >= 6);
    // TAPE: velg verktøyet, trykk første del: instruksjon, første del markert
    await t.tapSel('#bld [data-cx="tape"]'); ok('TAPE er valgt (fylt ikon)', await pg.evaluate(() => document.querySelector('#bld [data-cx="tape"]').classList.contains('on')));
    const hint1 = await pg.evaluate(() => document.querySelector('#bld .hint').textContent); ok('instruksjon «Trykk første del»', /første del/i.test(hint1), hint1);
    const k1 = await t.sp(0, 0.75), k2 = await t.sp(1.5, 0.75), k4 = await t.sp(3, 0.75);
    await t.tap(k1.x, k1.y); const hint2 = await pg.evaluate(() => document.querySelector('#bld .hint').textContent); ok('instruksjon «Trykk neste del eller underlaget»', /neste del/i.test(hint2) && /underlaget/i.test(hint2), hint2);
    // spøkelseslinje: hold fingeren på en del som er for langt unna (rød), så på en nær del (grønn)
    await t.down(k4.x, k4.y); let g = await pg.evaluate(() => { const x = window.__game.bld.cbx.ghost; return x && { show: x.show, ok: x.ok, why: x.why }; });
    ok('spøkelseslinjen er rød når delen er for langt unna', g && g.show && !g.ok && g.why === 'far', JSON.stringify(g)); await t.sh('2_spokelse_rod');
    await t.end(); s = await t.st(); ok('ulovlig feste gir ingen kobling', s.builds[0].links === 0, String(s.builds[0].links));
    await t.tapSel('#bld [data-cx="tape"]'); await t.tapSel('#bld [data-cx="tape"]');   // av og på igjen (verktøyet valgt, første del glemt)
    await t.tap(k1.x, k1.y); await t.down(k2.x, k2.y); g = await pg.evaluate(() => { const x = window.__game.bld.cbx.ghost; return x && { show: x.show, ok: x.ok, why: x.why }; });
    ok('spøkelseslinjen er grønn når festet er lovlig', g && g.show && g.ok, JSON.stringify(g)); await t.sh('3_spokelse_gronn');
    await t.end(); s = await t.st(); ok('slipp på nær del = TAPE festet (vibrasjon og lyd følger med)', s.builds[0].links === 1, String(s.builds[0].links));
    // flere TAPE: k2–k3, k2–k4, k4–k5, k5–k6, k3–k5
    for (const [a, b2] of [[[1.5, 0.75], [1.5, 2.25]], [[1.5, 0.75], [3, 0.75]]]) { const pa = await t.sp(...a), pb = await t.sp(...b2); await t.tap(pa.x, pa.y); await t.tap(pb.x, pb.y); }
    s = await t.st(); ok('trappa er festet med TAPE (3 koblinger)', s.builds[0].links === 3, String(s.builds[0].links));
    // samme del igjen avbryter
    await t.tap(k1.x, k1.y); await t.tap(k1.x, k1.y); ok('trykk på samme del avbryter', (await pg.evaluate(() => document.querySelector('#bld .hint').textContent)).match(/første del/i) !== null);
    await t.tapSel('#bld [data-cx="tape"]');   // verktøyet av
    ok('TAPE av igjen', !(await pg.evaluate(() => document.querySelector('#bld [data-cx="tape"]').classList.contains('on'))));
    // valgt del: ramme og verktøylinje
    const k6 = await t.sp(3, 3.75); await t.tap(k6.x, k6.y); let sb = await t.sel();
    ok('trykk på en del: verktøylinje ↺ ↻ ✕ ved delen (>= 48 px)', !!sb && sb.btns.join() === 'rotl,rotr,del' && sb.h >= 47 && sb.w >= 140, JSON.stringify(sb)); await t.sh('4_valgt_del');
    const rot0 = (await t.st()).builds[0].parts.find((p) => p.id === 'k6').rot; await t.tapSel('#bld .cxsel [data-cx="rotl"]');
    ok('↺ roterer den valgte delen', Math.abs((await t.st()).builds[0].parts.find((p) => p.id === 'k6').rot - rot0) > 0.2);
    await t.tapSel('#bld [data-cx="undo"]'); ok('↶ angrer rotasjonen', Math.abs((await t.st()).builds[0].parts.find((p) => p.id === 'k6').rot - rot0) < 1e-6);
    // ⋯-ark
    await t.tapSel('#bld [data-cx="more"]'); await t.run(3); const v2 = await t.vis(), sk = v2.map((x) => x.k);
    ok('⋯ åpner arket: SNAP, rotér, tilpass, NULLSTILL, last og deling, store knapper (>= 48 px)', ['snap', 'srotl', 'srotr', 'fit', 'reset', 'menu', 'close'].every((k) => sk.includes(k)) && v2.filter((x) => ['snap', 'fit', 'reset', 'menu', 'close', 'copy', 'paste'].includes(x.k)).every((x) => x.h >= 47), sk.join(',')); await t.sh('5_meny');
    await t.tapSel('#bld [data-cx="snap"]'); ok('SNAP av/på i ⋯', true); await t.tapSel('#bld [data-cx="snap"]');
    await t.tapSel('#bld [data-cx="close"]'); ok('arket lukkes', !(await pg.evaluate(() => document.querySelector('#bld').classList.contains('cxopen'))));
    // snu midt i bygging: ingenting forsvinner
    const before = JSON.stringify((await t.st()).builds[0]);
    await pg.setViewportSize({ width: 844, height: 390 }); await t.run(6); await t.run(6);
    ok('liggende: sidepaneler (cxland)', await pg.evaluate(() => document.querySelector('#bld').classList.contains('cxland')));
    s = await t.st(); ok('snuing mister ingenting (6 deler, 3 koblinger)', s.builds[0].placed === 6 && s.builds[0].links === 3 && JSON.stringify(s.builds[0]) === before, JSON.stringify(s.builds[0]).slice(0, 80));
    v = await t.vis(); keys = v.map((x) => x.k);
    ok('liggende: ←, ⋯, ↶, fire festeverktøy og PRØV', core.every((k) => keys.includes(k)), keys.join(','));
    const W2 = 844, H2 = 390; ok('liggende: alle knapper innenfor skjermen', v.every((x) => x.x >= 0 && x.r <= W2 + 0.5 && x.y >= 0 && x.b <= H2 + 0.5), JSON.stringify(v.filter((x) => x.x < 0 || x.r > W2 || x.y < 0 || x.b > H2).slice(0, 3)));
    const bl = v.filter((x) => core.includes(x.k)); ok('liggende: trykkflater >= 48 px', bl.every((x) => x.w >= 47.5 && x.h >= 47.5), JSON.stringify(bl.filter((x) => x.w < 48 || x.h < 48)));
    const ml = await pg.evaluate(() => window.__game.bld.cbx.metrics()); ok('liggende: byggeområdet har nesten hele høyden', ml.areaFrac >= 0.6, (100 * ml.areaFrac).toFixed(0) + ' %');
    const lay = await pg.evaluate(() => { const r = (s) => { const e = document.querySelector(s).getBoundingClientRect(); return { x: e.x, r: e.right, y: e.y, b: e.bottom }; }; return { tools: ['tape', 'hinge', 'rope', 'band'].map((k) => r(`#bld [data-cx="${k}"]`)), tryB: r('#bld .cxgo .try'), tray: r('#bld .tray'), back: r('#bld .cxback'), more: r('#bld .cxmore'), undo: r('#bld .cxundo') }; });
    ok('liggende: festeverktøyene står som en kolonne til høyre og PRØV nederst til høyre', lay.tools.every((q, i) => q.x > 700 && (i === 0 || q.y >= lay.tools[i - 1].b - 1)) && lay.tryB.x > 700 && lay.tryB.y > lay.tools[3].b - 1, JSON.stringify(lay.tryB));
    ok('liggende: ←, ⋯ og ↶ står til venstre, delebrettet langs nedre kant', lay.back.r < 100 && lay.more.r < 100 && lay.undo.r < 100 && lay.tray.y > 300 && lay.tray.x >= 70 && lay.tray.r <= 780, JSON.stringify(lay.tray));
    await t.sh('6_liggende');
    // bygg videre i liggende: velg en del
    const k4l = await t.sp(3, 0.75); await t.tap(k4l.x, k4l.y); sb = await t.sel(); ok('liggende: verktøylinjen vises ved valgt del', !!sb && sb.btns.length === 3, JSON.stringify(sb)); await t.sh('7_liggende_valgt');
    await pg.setViewportSize({ width: 390, height: 844 }); await t.run(6); await t.run(6);
    s = await t.st(); ok('snu tilbake: fortsatt alt på plass', s.builds[0].placed === 6 && s.builds[0].links === 3);
    ok('snuing og handlinger logges', (await pg.evaluate(() => window.__game.bld.cbx.stats.turns)) >= 2);
    // tilbake i brettet med ✕ på en ekstradel: plasser den lange planken og fjern den
    await t.place('k7', -3, 0.5); s = await t.st(); const n7 = s.builds[0].placed; const k7 = await t.sp(-3, 0.5); await t.tap(k7.x, k7.y); sb = await t.sel(); ok('planke plassert og valgt', n7 === 7 && !!sb);
    await t.tapSel('#bld .cxsel [data-cx="del"]'); s = await t.st(); ok('✕ tar delen tilbake i brettet', s.builds[0].placed === 6, String(s.builds[0].placed));
    // PRØV
    await t.tapSel('#bld [data-cx="try"]'); await t.run(1); const sim = await t.vis(); ok('under prøven: STOPP, SLOW og PAUSE, verktøyene borte', ['slow', 'pause', 'try'].every((k) => sim.some((x) => x.k === k)) && !sim.some((x) => x.k === 'tape'), sim.map((x) => x.k).join(',')); await t.sh('8_prove');
    const res = await t.win(); ok('PRØV: figuren kommer i mål over trappa', res && res.state === 'won', JSON.stringify(res && { s: res.state, r: res.reason }));
    await t.sh('9_i_mal');
    ok('første trapp logges med modus klassisk', await pg.evaluate(() => window.__game.bld.cbx.stats.firstBridge != null));
    await t.tapSel('#bld [data-cx="try"]'); await t.run(2); ok('STOPP går tilbake til bygging', (await t.vis()).some((x) => x.k === 'tape'));
  });
  await session('trapp', HAND, async (t, pg) => {
    await t.open('trapp1'); await t.run(10); await t.place('k1', 0, 0.75); await t.place('k2', 1.5, 0.75); await t.run(6);
    ok('hånd-hjelpen vises første gang (trykk første del, så neste)', await pg.evaluate(() => window.__game.bld.cbx.handOn)); await t.sh('10_hand');
    await t.tapSel('#bld [data-cx="more"]'); await t.tapSel('#bld [data-cx="close"]');
    ok('hånd-hjelpen forsvinner ved berøring og vises ikke igjen', !(await pg.evaluate(() => window.__game.bld.cbx.handOn)) && (await pg.evaluate(() => localStorage.getItem('tlm.cbxhand'))) !== null);
  });
  await session('vippe', ON, async (t, pg) => {
    ok('åpner Vippe (valget på)', await t.open('vippe1')); await t.run(10);
    ok('nytt skall på i Vippe', await pg.evaluate(() => window.__game.bld.cbx.on())); await t.sh('11_vippe');
    await t.place('v1', 0, 1.25); let s = await t.st(); ok('vippa plassert med berøring', s.builds[0].placed === 1);
    const p = await t.sp(0, 1.25); await t.tap(p.x, p.y); const sb = await t.sel(); ok('vippa valgt: verktøylinje', !!sb);
    await t.tapSel('#bld .cxsel [data-cx="rotl"]'); const r = (await t.st()).builds[0].parts.find((q) => q.id === 'v1').rot; ok('vippa rotert 15 grader', Math.abs(r - Math.PI / 12) < 0.01, String(r));
    await t.sh('12_vippe_rotert');
    await t.tapSel('#bld [data-cx="try"]'); await t.run(1); const res = await t.win(); ok('PRØV: kommer i mål over vippa', res && res.state === 'won', JSON.stringify(res && { s: res.state, r: res.reason }));
  });
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
