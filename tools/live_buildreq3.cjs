// R140: påkrevd bygg i Nivå 5 (fagverk) og Nivå 6 (stål) på mobil (iPhone 14 stående og liggende, Playwright): BYGG-knappen og oppdragskortet ved gapet, kortet «Ny til bygging?» med egen tekst,
// byggeskjermen med TREKANT-knappen (Nivå 5), og valget «Påkrevd bygg» av (gammel plassering). node tools/live_buildreq3.cjs <utmappe> [port]. Ingen FPS-krav (ingen GPU: swiftshader).
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = process.argv[2] || '.', port = +(process.argv[3] || 8484);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/json', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(p).pipe(r); });
(async () => {
  await new Promise((r) => srv.listen(port, r));
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  const open = async (level, opts, pre) => {
    const ctx = await b.newContext({ ...opts }), pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && !/navigator.vibrate/.test(m.text()) && errs.push(m.text()));
    await pg.addInitScript((pre) => { try { localStorage.setItem('tlm.intro', '0'); localStorage.setItem('tlm.labstart', 'false'); localStorage.setItem('tlm.story', 'false'); localStorage.setItem('tlm.introsweep', 'false'); for (const [k, v] of Object.entries(pre || {})) localStorage.setItem(k, v); } catch (e) { /* */ } }, pre);
    await pg.goto(`http://localhost:${port}/?level=${level}`);
    await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites, null, { timeout: 90000 });
    return { ctx, pg, errs };
  };
  const CASES = [
    { level: 'barnerom2', site: 'barn2', gap: 8, a: 'nattbok', bnode: 'hylle_a', card: /Her holder ikke én planke/, dx: -9, yaw: Math.PI / 2, truss: true },
    { level: 'kjokken2', site: 'kjk6', gap: 12, a: 'kjoleskap', bnode: 'hylle_over_vask', card: /Tung last/, dx: 9, yaw: -Math.PI / 2, truss: false },
  ];
  for (const C of CASES) for (const [fmt, opts] of [['st', devices['iPhone 14']], ['li', devices['iPhone 14 landscape']]]) {
    const { ctx, pg, errs } = await open(C.level, opts);
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    const sh = async (n) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/req2_${C.level}_${fmt}_${n}.png`, timeout: 180000 }); };
    await run(30);
    const info = await pg.evaluate((C) => { const g = window.__game, L = g.LEVEL, s = L.buildSites[0], A = L.boxes.find((x) => x.id === C.a), B = L.boxes.find((x) => x.id === C.bnode); const gap = C.level === 'barnerom2' ? +(B.min[0] - A.max[0]).toFixed(2) : +(B.min[0] - A.max[0]).toFixed(2); return { req: !!L.required && !L.required.eased, gap, site: s.id, sx: s.x, sy: s.y, sz: s.z, need: s.need }; }, C);
    ok(`${C.level} ${fmt}: påkrevd bygg på, gap ${C.gap * 5} cm`, info.req && info.site === C.site && Math.abs(Math.abs(info.gap) - C.gap) < 0.05, JSON.stringify(info));
    const place = (dx, dz) => pg.evaluate(([x, y, z, yaw]) => { const g = window.__game; Object.assign(g.player, { x, y, z, vx: 0, vy: 0, vz: 0 }); g.cam.yaw = yaw; }, [info.sx + C.dx, info.sy + 0.2, info.sz + dz, C.yaw]);
    await place(0, 0); await run(60); await sh('1_gapet');
    const card = await pg.evaluate(() => { const e = document.getElementById('btnBuildCard'), bb = document.getElementById('btnBuild'); return { t: e && e.innerText, btn: bb && getComputedStyle(bb).display }; });
    ok(`${C.level} ${fmt}: BYGG-knappen og oppdragskortet vises ved gapet`, card.btn !== 'none' && /BYGG/.test(card.t || ''), JSON.stringify(card));
    await pg.evaluate(() => window.__game.bld.open()); await run(6); await new Promise((r) => setTimeout(r, 300)); await sh('2_bygg_kort');
    const sk = await pg.evaluate(() => { const e = document.querySelector('.skcard'); return e ? { t: e.innerText, r: e.getBoundingClientRect().toJSON(), vw: innerWidth, vh: innerHeight, btns: [...e.querySelectorAll('button')].map((x) => x.innerText) } : null; });
    ok(`${C.level} ${fmt}: kortet «Ny til bygging?» med egen tekst og SÅ SLIK`, sk && C.card.test(sk.t) && sk.btns.join('|') === 'SÅ SLIK|FORSTÅTT' && sk.r.left >= 0 && sk.r.right <= sk.vw && sk.r.bottom <= sk.vh && !/\btast/i.test(sk.t), JSON.stringify(sk));
    await pg.evaluate(() => document.querySelector('.skcard [data-sk="skip"]').click()); await run(4); await new Promise((r) => setTimeout(r, 300)); await sh('3_bygg_skjerm');
    const bs = await pg.evaluate(() => { const vis = (e) => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0; const help = document.querySelector('.gtr [data-th="help"]'); return { active: window.__game.bld.active, trekant: vis(help), grid: !!document.querySelector('.gtr'), txt: (document.body.innerText || '').slice(0, 300) }; });
    ok(`${C.level} ${fmt}: byggeskjermen åpen${C.truss ? ' og trekanthjelpen (? og TREKANT/DIAGONAL ved valg) er på' : ''}`, bs.active === true && (!C.truss || bs.trekant), JSON.stringify(bs).slice(0, 300));
    await pg.evaluate(() => window.__game.bld.close('test')); await run(4);
    await pg.evaluate(() => window.__game.bld.open()); await run(6); ok(`${C.level} ${fmt}: kortet vises ikke igjen`, !(await pg.evaluate(() => !!document.querySelector('.skcard'))));
    ok(`${C.level} ${fmt}: ingen konsollfeil`, errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  for (const [level, id, eased] of [['barnerom2', 'hylle_a', (b) => b.max[1] < 17], ['kjokken2', 'kjoleskap', (b) => Math.abs(b.min[0] + 30) < 0.05]]) {   // valget av: dagens plassering
    const { ctx, pg, errs } = await open(level, devices['iPhone 14'], { 'tlm.buildrequired': 'false' });
    const info = await pg.evaluate((id) => { const L = window.__game.LEVEL, b = L.boxes.find((x) => x.id === id); return { eased: !!L.required.eased, min: b.min, max: b.max, sc: (L.shortcuts || []).length }; }, id);
    ok(`${level}: valget av gir dagens plassering`, info.eased && eased(info) && (level !== 'barnerom2' || info.sc === 1), JSON.stringify(info));
    ok(`${level}: valget av: ingen konsollfeil`, errs.length === 0, errs.join(' | ')); await ctx.close();
  }
  await b.close(); srv.close(); console.log(bad ? `${bad} FEIL` : 'alt ok'); process.exit(bad ? 1 : 0);
})();
