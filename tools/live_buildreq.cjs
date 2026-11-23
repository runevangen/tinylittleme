// R138: påkrevd bygg i Nivå 2 · Barnerommet på mobil (iPhone 14 stående og liggende, Playwright): kortet «Ny til bygging?» (SÅ SLIK/FORSTÅTT), BYGG-knappen og oppdragskort ved nattbordet,
// byggeskjermen med planken klar, og valget «Påkrevd bygg» av (gammelt gap). node tools/live_buildreq.cjs <utmappe> [port]. Ingen FPS-krav (ingen GPU: swiftshader).
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = process.argv[2] || '.', port = +(process.argv[3] || 8483);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/json', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
(async () => {
  await new Promise((r) => srv.listen(port, r));
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  const open = async (opts, pre) => {
    const ctx = await b.newContext({ ...opts }), pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && !/navigator.vibrate/.test(m.text()) && errs.push(m.text()));
    await pg.addInitScript((pre) => { try { localStorage.setItem('tlm.intro', '0'); localStorage.setItem('tlm.labstart', 'false'); localStorage.setItem('tlm.story', 'false'); localStorage.setItem('tlm.introsweep', 'false'); for (const [k, v] of Object.entries(pre || {})) localStorage.setItem(k, v); } catch (e) { /* */ } }, pre);
    await pg.goto(`http://localhost:${port}/?level=barnerom`);
    await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites, null, { timeout: 90000 });
    return { ctx, pg, errs };
  };
  for (const [fmt, opts] of [['st', devices['iPhone 14']], ['li', devices['iPhone 14 landscape']]]) {
    const { ctx, pg, errs } = await open(opts);
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    const sh = async (n) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/req_${fmt}_${n}.png`, timeout: 180000 }); };
    await run(30);
    const info = await pg.evaluate(() => { const g = window.__game, L = g.LEVEL, k = L.boxes.find((x) => x.id === 'krakk'), n = L.boxes.find((x) => x.id === 'nattbord'); return { req: !!L.required && !L.required.eased, gap: +(k.min[0] - n.max[0]).toFixed(2), site: L.buildSites[0].id, sx: L.buildSites[0].x, sy: L.buildSites[0].y, sz: L.buildSites[0].z, parts: (L.build.parts || []).length }; });
    ok(`${fmt}: påkrevd bygg på, gap 35 cm (7 enheter)`, info.req && Math.abs(info.gap - 7) < 0.05 && info.site === 'barn1', JSON.stringify(info));
    const place = (dx, dz) => pg.evaluate(([x, y, z]) => { const g = window.__game; Object.assign(g.player, { x, y, z, vx: 0, vy: 0, vz: 0 }); g.cam.yaw = Math.PI / 2; }, [info.sx - 9 + dx, info.sy + 0.2, info.sz + dz]);
    await place(0, 0); await run(60); await sh('1_nattbord');
    const card = await pg.evaluate(() => { const e = document.getElementById('btnBuildCard'), bb = document.getElementById('btnBuild'); return { vis: e && getComputedStyle(e).display, t: e && e.innerText, btn: bb && getComputedStyle(bb).display }; });
    ok(`${fmt}: BYGG-knappen og oppdragskortet vises ved gapet`, card.btn !== 'none' && /BYGG/.test(card.t || ''), JSON.stringify(card));
    await pg.evaluate(() => window.__game.bld.open()); await run(6); await new Promise((r) => setTimeout(r, 300)); await sh('2_bygg_kort');
    const sk = await pg.evaluate(() => { const e = document.querySelector('.skcard'); return e ? { t: e.innerText, r: e.getBoundingClientRect().toJSON(), vw: innerWidth, vh: innerHeight, btns: [...e.querySelectorAll('button')].map((x) => x.innerText) } : null; });
    ok(`${fmt}: kortet «Ny til bygging?» med én setning og SÅ SLIK`, sk && /Ny til bygging/.test(sk.t) && /BYGG/.test(sk.t) && /PRØV/.test(sk.t) && sk.btns.join('|') === 'SÅ SLIK|FORSTÅTT' && sk.r.left >= 0 && sk.r.right <= sk.vw && sk.r.bottom <= sk.vh && !/\btast/i.test(sk.t), JSON.stringify(sk));
    await pg.evaluate(() => document.querySelector('.skcard [data-sk="skip"]').click()); await run(4); await sh('3_bygg_skjerm');
    const bs = await pg.evaluate(() => ({ active: window.__game.bld.active, parts: document.querySelectorAll('#bTray *').length, txt: (document.body.innerText || '').slice(0, 400) }));
    ok(`${fmt}: byggeskjermen åpen`, bs.active === true, JSON.stringify(bs).slice(0, 300));
    await pg.evaluate(() => window.__game.bld.close('test')); await run(4);
    const log = await pg.evaluate(() => (window.__game.log || []).length);
    // kortet vises bare én gang
    await pg.evaluate(() => window.__game.bld.open()); await run(6); ok(`${fmt}: kortet vises ikke igjen`, !(await pg.evaluate(() => !!document.querySelector('.skcard'))));
    ok(`${fmt}: ingen konsollfeil`, errs.length === 0, errs.join(' | ')); void log;
    await ctx.close();
  }
  { // valget av: gammelt gap (25 cm), ingen kort
    const { ctx, pg, errs } = await open(devices['iPhone 14'], { 'tlm.buildrequired': 'false' });
    const info = await pg.evaluate(() => { const L = window.__game.LEVEL, k = L.boxes.find((x) => x.id === 'krakk'), n = L.boxes.find((x) => x.id === 'nattbord'); return { eased: !!L.required.eased, gap: +(k.min[0] - n.max[0]).toFixed(2), help: L.hints.find((h) => h.id === 'nattbord').text.slice(0, 20) }; });
    ok('valget av: gammelt gap (25 cm = 5 enheter) og gammel tekst', info.eased && Math.abs(info.gap - 5) < 0.05 && /Hopp over/.test(info.help), JSON.stringify(info));
    ok('valget av: ingen konsollfeil', errs.length === 0, errs.join(' | ')); await ctx.close();
  }
  await b.close(); srv.close(); console.log(bad ? `${bad} FEIL` : 'alt ok'); process.exit(bad ? 1 : 0);
})();
