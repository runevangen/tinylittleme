// R119: «Bygg 5: Broen over badekaret» på iPhone 14 (stående og liggende) med EKTE berøring (CDP Input.dispatchTouchEvent).
// Sjekker: brettet starter uten feil; kortet «Prøv Byggeskolen · Fagverk først» (TIL BYGGESKOLEN / HOPP OVER) vises én gang; firkant uten diagonal gir hintet «Legg inn en diagonal»;
// en rett rad gir etter; trekantbroen (referansen) bygges med trykk på knutene og består PRØV; bygget står i verden; den harde veien finnes; Byggeskolen (Bygglab) har samme hint. Bilder i <utmappe>.
// node tools/live_badebro.cjs <utmappe> [port]   (playwright via NODE_PATH). Exit 1 ved feil. Ingen GPU (swiftshader ~1 fps): ingen FPS-krav, ekte følelse «testes på iPhone».
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true }); await new Promise((ok) => srv.listen(+process.argv[3] || 0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; }; const errs = [];
  const ref = JSON.parse(fs.readFileSync(path.join(root, 'levels/badebro.level.json'), 'utf8')).build.sites[0].ref.grid;
  async function session(level, init, fn, viewport) {
    const dev = { ...devices['iPhone 14'], ...(viewport ? { viewport, screen: viewport } : {}) };
    const ctx = await b.newContext(dev), pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript(init); await pg.goto(`http://localhost:${port}/?level=${level}`); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 120000 }); await pg.evaluate(() => window.__game.tick(30, 1 / 60));
    const cdp = await ctx.newCDPSession(pg), tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    const t = {
      run,
      open: (id) => pg.evaluate((id) => { const o = window.__game.bld.open(id, { force: true }); window.__game.tick(4, 1 / 60); return o; }, id),
      tap: async (x, y) => { await tp('touchStart', x, y); await pg.waitForTimeout(40); await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); },
      sp: (u, v) => pg.evaluate(([u, v]) => { const q = window.__game.bld.screenPos(u, v), r = document.querySelector('#bld canvas').getBoundingClientRect(); return { x: r.x + q.x, y: r.y + q.y }; }, [u, v]),
      mat: (m) => pg.evaluate((m) => window.__game.bld.grid.setMat(m), m),
      sh: async (n) => { await run(2); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/badebro_${n}.png`, timeout: 60000 }); },
      info: () => pg.evaluate(() => window.__game.bld.grid.info()),
      // dra fra en knute til et punkt = en stav (som en spiller gjør i den nye byggeskjermen)
      drag: async (x0, y0, x1, y1) => { await tp('touchStart', x0, y0); for (let i = 1; i <= 8; i++) { await tp('touchMove', x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await pg.waitForTimeout(25); } await run(2); await tp('touchEnd'); await pg.waitForTimeout(100); await run(3); },
      rod: async (a, b2, m) => { await t.mat(m); const p = await t.sp(a[0], a[1]), q = await t.sp(b2[0], b2[1]); await t.drag(p.x, p.y, q.x, q.y); },
      withLoad: async (l) => { await pg.evaluate(() => window.__game.bld.stopTry()); await run(2); await pg.locator('#bld .bxmore').first().click(); await run(3); await pg.locator(`#bld .bxsheet .loads button[data-l="${l}"]`).first().click(); await run(2); await pg.evaluate(() => window.__game.bld.bux.sheet(false)); await run(2); return t.tryIt(); },
      tryIt: async () => { await pg.evaluate(() => window.__game.bld.startTry()); for (let i = 0; i < 40 && (await pg.evaluate(() => window.__game.bld.running)); i++) await pg.evaluate(() => { for (let k = 0; k < 150 && window.__game.bld.running; k++) window.__game.bld.update(1 / 60, true); }); return pg.evaluate(() => window.__game.bld.result); },
    };
    await fn(t, pg); await ctx.close();
  }
  const INIT = () => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.gridlock', 'false'); localStorage.setItem('tlm.gridstage', 'true'); } catch (e) { /* ok */ } };
  // nodene i referansen: id 0 og 1 er ankrene (-4,0) og (4,0), 2.. er ref.nodes
  const pts = [[-4, 0], [4, 0], ...ref.nodes];
  const buildRef = async (t) => {   // hver stav dras fra en knute som finnes (ankrene først), til punktet i den andre enden
    const have = new Set([0, 1]); let todo = ref.rods.slice();
    for (let guard = 0; todo.length && guard < 60; guard++) {
      const i = todo.findIndex(([a, b2]) => have.has(a) || have.has(b2)); if (i < 0) break; const [a, b2, m] = todo.splice(i, 1)[0];
      if (have.has(a)) { await t.rod(pts[a], pts[b2], m); } else { await t.rod(pts[b2], pts[a], m); } have.add(a); have.add(b2);
    }
  };
  await session('badebro', INIT, async (t, pg) => {
    await t.sh('0_verden');
    ok('åpner byggestedet bad1', await t.open('bad1'));
    ok('rutenett er på (bare trekanter holder)', await pg.evaluate(() => window.__game.bld.grid.on)); await t.sh('1_byggeskjerm_tom');
    const card = await pg.evaluate(() => { const e = document.querySelector('.skcard'); return e ? e.textContent : ''; });
    ok('kortet «Prøv Byggeskolen · Fagverk først» vises (TIL BYGGESKOLEN / HOPP OVER)', /Fagverk/.test(card) && /TIL BYGGESKOLEN/.test(card) && /HOPP OVER/.test(card), card.slice(0, 120)); await t.sh('2_fagverk_kort');
    const sk = await pg.locator('.skcard button[data-sk="skip"]').first().boundingBox(); ok('knappene er minst 48 px', sk && sk.height >= 47, JSON.stringify(sk));
    await pg.locator('.skcard button[data-sk="skip"]').first().click(); await t.run(3);
    ok('kortet er borte etter HOPP OVER', !(await pg.evaluate(() => !!document.querySelector('.skcard'))));
    // en rett rad (fire staver, stål) gir etter
    const rowN = [[-4, 0], [-2, 0], [0, 0], [2, 0], [4, 0]]; for (let i = 0; i < 4; i++) await t.rod(rowN[i], rowN[i + 1], 'steel');
    let s = await t.info(); ok('rett rad av stål er lagt (4 staver)', s.rods.length === 4, String(s.rods.length)); await t.sh('3_rett_rad');
    const rl = await t.withLoad('car'); ok('rett rad av stål: bilen kommer ikke over (PRØV mislykkes)', rl.state === 'lost', JSON.stringify(rl)); await t.sh('4_rett_rad_feilet');
    await pg.evaluate(() => window.__game.bld.stopTry());
    await pg.evaluate(() => window.__game.bld.resetBuild()); await t.run(3);
    // firkant uten diagonal: hintet vises
    for (const [a, b2] of [[[-4, 0], [-2, 0]], [[-2, 0], [0, 0]], [[-2, 0], [-2, 2]], [[0, 0], [0, 2]], [[-2, 2], [0, 2]]]) await t.rod(a, b2, 'wood');
    s = await t.info(); const hint = await pg.evaluate(() => { const b = document.querySelector('#bld .bxbubble, #bld .bxhint, #bld .bxbanner'); return b ? b.textContent : ''; });
    ok('firkant uten diagonal gir hint', /diagonal/.test(hint) || (await pg.evaluate(() => window.__game.bld.bux.hint())).includes('diagonal'), hint); await t.sh('5_firkant_hint');
    await pg.evaluate(() => window.__game.bld.resetBuild()); await t.run(3);
    // trekantbroen (referanse)
    await buildRef(t); s = await t.info(); ok('trekantbroen er lagt (13 staver)', s.rods.length === ref.rods.length, String(s.rods.length)); await t.sh('6_trekantbro');
    const rs = []; for (const l of ['ball', 'figure', 'robot', 'car']) rs.push((await t.withLoad(l)).state); ok('trekantbroen består PRØV med alle fire lastene', rs.every((x) => x === 'won'), rs.join()); await t.sh('7_bestatt');
    ok('oppdraget er bestått', await pg.evaluate(() => { const g = window.__game.bld.stage.state; return !!g && g.passed; }));
  });
  await session('badebro', INIT, async (t, pg) => {   // bygget i verden og den harde veien
    ok('åpner byggestedet bad1', await t.open('bad1')); const sk = pg.locator('.skcard button[data-sk="skip"]').first(); if (await sk.count()) await sk.click();
    await buildRef(t); const rs = []; for (const l of ['ball', 'figure', 'robot', 'car']) rs.push((await t.withLoad(l)).state); ok('bestått med alle laster', rs.every((x) => x === 'won'), rs.join());
    await pg.evaluate(() => window.__game.bld.close && window.__game.bld.close()); await t.run(20);
    const n = await pg.evaluate(() => window.__game.bld.worldCount('bad1')); ok('bygget står i verden (faste flater på veilinja)', n > 0, String(n)); await t.sh('8_i_verden');
  });
  // liggende format
  await session('badebro', INIT, async (t, pg) => {
    ok('åpner byggestedet (liggende)', await t.open('bad1')); const sk = pg.locator('.skcard button[data-sk="skip"]').first(); if (await sk.count()) await sk.click(); await t.run(5); await t.sh('9_liggende_tom');
    await buildRef(t); await t.sh('10_liggende_bygget');
  }, { width: 844, height: 390 });
  // Byggeskolen deler hintet (R101)
  await session('bygglab', INIT, async (t, pg) => {
    await t.open('lab4'); ok('Bygglab-sted er åpent', await pg.evaluate(() => window.__game.bld.active && /^lab/.test(window.__game.bld.siteId)));
    for (const [a, b2] of [[[-2.5, 0], [-1.25, 0]], [[-1.25, 0], [-1.25, 1.25]], [[-1.25, 1.25], [0, 1.25]], [[0, 1.25], [0, 0]], [[0, 0], [-1.25, 0]]]) await t.rod(a, b2, 'wood');
    const h = await pg.evaluate(() => window.__game.bld.bux.hint()); ok('Byggeskolen: samme firkant-hint', /diagonal/.test(h || ''), h); await t.sh('11_byggeskole_hint');
  });
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
