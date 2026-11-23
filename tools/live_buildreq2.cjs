// R139: påkrevd bygg i Nivå 3 (trapp) og Nivå 4 (vippe) på mobil (iPhone 14 stående og liggende, Playwright): kortet «Ny til bygging?», BYGG-knappen og oppdragskortet,
// byggeskjermen med delene klare, og valget «Påkrevd bygg» av (dagens brett). node tools/live_buildreq2.cjs <utmappe> [port]. Ingen FPS-krav (ingen GPU: swiftshader).
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = process.argv[2] || '.', port = +(process.argv[3] || 8484);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/json', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
const CASES = [
  { level: 'kjokken', site: 'kjokk1', gap: (L) => { const m = L.boxes.find((x) => x.id === 'mikro'), h = L.boxes.find((x) => x.id === 'krydderhylle'); return +(h.max[1] - m.max[1]).toFixed(2); }, want: 6, text: /krydderhylla/i, easyGap: 6.8 },
  { level: 'bad2', site: 'bad1', gap: (L) => { const a = L.boxes.find((x) => x.id === 'ny_hylle'), b = L.boxes.find((x) => x.id === 'hylle_ost'); return +(b.min[0] - a.max[0]).toFixed(2); }, want: 6.5, text: /dusjhylla/i },
];
(async () => {
  await new Promise((r) => srv.listen(port, r));
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  const open = async (level, opts, pre) => {
    const ctx = await b.newContext({ ...opts }), pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && !/navigator.vibrate/.test(m.text()) && errs.push(m.text()));
    await pg.addInitScript((pre) => { try { localStorage.setItem('tlm.intro', '0'); localStorage.setItem('tlm.labstart', 'false'); localStorage.setItem('tlm.story', 'false'); localStorage.setItem('tlm.introsweep', 'false'); for (const [k, v] of Object.entries(pre || {})) localStorage.setItem(k, v); } catch (e) { /* */ } }, pre);
    await pg.goto(`http://localhost:${port}/?level=${level}`);
    await pg.waitForFunction(() => window.__game && window.__game.LEVEL, null, { timeout: 120000 });
    return { ctx, pg, errs };
  };
  for (const C of CASES) for (const [fmt, opts] of [['st', devices['iPhone 14']], ['li', devices['iPhone 14 landscape']]]) {
    const { ctx, pg, errs } = await open(C.level, opts);
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    const sh = async (n) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/req2_${C.level}_${fmt}_${n}.png`, timeout: 180000 }); };
    await run(30);
    const info = await pg.evaluate(([site, gapSrc]) => { const g = window.__game, L = g.LEVEL, s = (L.buildSites || []).find((q) => q.id === site); return { req: !!L.required && !L.required.eased, site: s && { x: s.x, y: s.y, z: s.z }, parts: (L.build.parts || []).length }; }, [C.site, '']);
    const gap = await pg.evaluate((src) => { const L = window.__game.LEVEL; return (new Function('L', 'return (' + src + ')(L)'))(L); }, C.gap.toString());
    ok(`${C.level}/${fmt}: påkrevd bygg på, gap/trinn ${C.want}`, info.req && Math.abs(gap - C.want) < 0.05 && !!info.site, JSON.stringify({ ...info, gap }));
    await pg.evaluate(([x, y, z]) => { const g = window.__game; Object.assign(g.player, { x: x - 3, y: y + 0.2, z, vx: 0, vy: 0, vz: 0 }); g.cam.yaw = Math.PI / 2; }, [info.site.x, info.site.y, info.site.z]);
    await run(60); await sh('1_ved_stedet');
    const card = await pg.evaluate(() => { const e = document.getElementById('btnBuildCard'), bb = document.getElementById('btnBuild'); return { t: e && e.innerText, btn: bb && getComputedStyle(bb).display, bt: bb && bb.innerText }; });
    ok(`${C.level}/${fmt}: BYGG-knappen og oppdragskortet vises`, card.btn !== 'none' && /BYGG/.test((card.t || '') + (card.bt || '')), JSON.stringify(card));
    await pg.evaluate(() => window.__game.bld.open()); await run(6); await new Promise((r) => setTimeout(r, 300)); await sh('2_bygg_kort');
    const sk = await pg.evaluate(() => { const e = document.querySelector('.skcard'); return e ? { t: e.innerText, r: e.getBoundingClientRect().toJSON(), vw: innerWidth, vh: innerHeight, btns: [...e.querySelectorAll('button')].map((x) => x.innerText) } : null; });
    ok(`${C.level}/${fmt}: kortet «Ny til bygging?» med egen setning og SÅ SLIK`, sk && /Ny til bygging/.test(sk.t) && C.text.test(sk.t) && /BYGG/.test(sk.t) && /PRØV/.test(sk.t) && sk.btns.join('|') === 'SÅ SLIK|FORSTÅTT' && sk.r.left >= 0 && sk.r.right <= sk.vw && sk.r.bottom <= sk.vh && !/\btast/i.test(sk.t), JSON.stringify(sk));
    await pg.evaluate(() => document.querySelector('.skcard [data-sk="skip"]').click()); await run(4); await sh('3_bygg_skjerm');
    const bs = await pg.evaluate(() => ({ active: window.__game.bld.active }));
    ok(`${C.level}/${fmt}: byggeskjermen åpen`, bs.active === true, JSON.stringify(bs));
    await pg.evaluate(() => window.__game.bld.close('test')); await run(4);
    await pg.evaluate(() => window.__game.bld.open()); await run(6); ok(`${C.level}/${fmt}: kortet vises ikke igjen`, !(await pg.evaluate(() => !!document.querySelector('.skcard'))));
    ok(`${C.level}/${fmt}: ingen konsollfeil`, errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  for (const C of CASES) { // valget av: dagens brett, ingen byggested, ingen kort
    const { ctx, pg, errs } = await open(C.level, devices['iPhone 14'], { 'tlm.buildrequired': 'false' });
    const info = await pg.evaluate(() => { const L = window.__game.LEVEL; return { eased: !!L.required.eased, build: !!L.build, sites: (L.buildSites || []).length, flag: (L.goals || []).some((g) => g.type === 'flag') }; });
    ok(`${C.level}: valget av gir dagens brett (ingen byggested)`, info.eased && !info.build && info.sites === 0 && !info.flag, JSON.stringify(info));
    await pg.evaluate(() => window.__game.tick(30, 1 / 60)); await pg.screenshot({ path: `${out}/req2_${C.level}_av.png`, timeout: 180000 });
    ok(`${C.level}/av: ingen konsollfeil`, errs.length === 0, errs.join(' | ')); await ctx.close();
  }
  await b.close(); srv.close(); console.log(bad ? `${bad} FEIL` : 'alt ok'); process.exit(bad ? 1 : 0);
})();
