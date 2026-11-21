// R131: 3D-oppdragene på mobil (iPhone 14, Playwright, stående og liggende): ?level=bygglab&lab3d=1 viser OPPDRAG-raden, låste oppdrag sier ifra, Tårnet bygges med berøring (målpunkt, stål, tripod),
// Tripoden (last i tau), Bred bro i sidevind; neste oppdrag åpnes etter bestått; lenke ?m=tower3d; bygget og lasten står i rommet; ingen konsollfeil. Skjermbilder i utmappa.
// Ingen GPU (swiftshader): ingen FPS-krav, prøven kjøres med en gang (runAll). node tools/live_lab3d_missions.cjs <utmappe>   (playwright via NODE_PATH). Exit 1 ved feil.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = process.argv[2] || '.';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(r); });
(async () => {
  await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  for (const [name, opts, pre] of [['staaende', devices['iPhone 14'], null], ['liggende', devices['iPhone 14 landscape'], null], ['lenke', devices['iPhone 14'], 'link']]) {
    const ctx = await b.newContext({ ...opts }), pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    if (pre === 'link') await pg.addInitScript(() => { try { localStorage.setItem('tlm.build3dlock', 'false'); } catch { /* ok */ } });
    await pg.goto(`http://localhost:${port}/?level=bygglab&lab3d=1${pre === 'link' ? '&m=tripod3d' : ''}`);
    await pg.waitForFunction(() => window.__game && window.__game.LEVEL && window.__game.lab3d, null, { timeout: 90000 });
    await pg.evaluate(() => window.__game.tick(120, 1 / 60));
    const V = (f, a) => pg.evaluate(f, a);
    const sh = async (n) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/lab3dm_${name}_${n}.png` }); };
    const click = async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await pg.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await pg.waitForTimeout(60); };
    const proj = (p) => pg.evaluate((p) => { const c = window.__game.lab3d.ctl, cv = document.querySelector('#lab3d canvas'), r = cv.getBoundingClientRect(); return import('./grid3d_cam.js').then((C) => { const q = C.project(c.cam, p, r.width, r.height); return { x: r.left + q.x, y: r.top + q.y }; }); }, p);
    const tapPt = async (p) => { const q = await proj(p); await pg.touchscreen.tap(q.x, q.y); await pg.waitForTimeout(60); };
    const cur = () => V(() => window.__game.lab3d.site.id);
    const msg = () => V(() => document.querySelector('#lab3d .msg').textContent);
    const finish = async () => { await V(() => { const v = window.__game.lab3d; v.ctl.runAll(); v.finished(); v.redraw(); }); await pg.waitForTimeout(150); return V(() => window.__game.lab3d.ctl.last); };
    const vp = pg.viewportSize();
    if (pre === 'link') {
      ok(`${name}: lenke ?m=tripod3d åpner Tripoden`, (await cur()) === 'tripod3d', await cur());
      await sh('0_tripod'); const f = await V(() => window.__game.lab3d.ctl.frame(390, 500)); ok(`${name}: lasten i tau og målpunktet vises`, f.goal && f.mass && f.mass.hang);
      ok(`${name}: ingen konsollfeil`, errs.length === 0, errs.join(' | ').slice(0, 300)); await ctx.close(); continue;
    }
    ok(`${name}: oppdragsraden vises, Broen først`, (await cur()) === 'lab3d' && /1\/4/.test(await pg.evaluate(() => document.querySelector('#lab3d .mt').textContent)));
    const btns = await pg.evaluate(() => [...document.querySelectorAll('#lab3d button')].filter((b) => b.offsetParent).map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), r: Math.round(r.right), bt: Math.round(r.bottom) }; }));
    ok(`${name}: knappene er store nok og innenfor skjermen`, btns.every((q) => q.h >= 40 && q.w >= 40 && q.x >= 0 && q.r <= vp.width + 1 && q.bt <= vp.height + 1), JSON.stringify(btns.filter((q) => q.h < 40 || q.w < 40 || q.r > vp.width + 1 || q.bt > vp.height + 1)));
    ok(`${name}: teksten nevner ikke taster`, await pg.evaluate(() => !/\b(tast|Space|Enter|WASD)\b/i.test(document.querySelector('#lab3d').textContent)));
    await sh('0_start');
    await click('#lab3d [data-l="mnext"]'); ok(`${name}: ▶ på låst oppdrag sier ifra og blir`, (await cur()) === 'lab3d' && /Låst/.test(await msg()), await msg());
    // Broen: SÅ SLIK-bygg, bestå => neste åpnes
    await V(() => { const c = window.__game.lab3d.ctl; c.guideAuto('wood'); });
    let last = await finish(); ok(`${name}: Broen består`, last && last.passed);
    ok(`${name}: beskjeden sier at neste er åpnet`, /åpnet/i.test(await msg()), await msg());
    await click('#lab3d [data-l="mnext"]'); ok(`${name}: ▶ åpner Tårnet`, (await cur()) === 'tower3d', await cur()); await sh('1_tower');
    const f0 = await V(() => window.__game.lab3d.ctl.frame(390, 500)); ok(`${name}: målpunkt og last vises`, f0.goal && f0.goal.placed === false && f0.mass && f0.mass.m === 120);
    // PRØV uten knute i målpunktet
    await V(() => { const c = window.__game.lab3d.ctl; c.setLayer(2); });
    await tapPt({ x: 4, y: 4, z: 2 }); await tapPt({ x: 0, y: 0, z: 0 });   // en stav, men ingen knute i målet
    await click('#lab3d [data-l="try"]'); ok(`${name}: PRØV uten målknute sier hva som mangler`, /gule/i.test(await msg()), await msg());
    await click('#lab3d [data-l="reset"]');
    // en stav alene: velter (berøring)
    await click('#lab3d [data-l="mat:steel"]'); await V(() => window.__game.lab3d.ctl.setLayer(2));
    await tapPt({ x: 2, y: 8, z: 2 }); await tapPt({ x: 0, y: 0, z: 0 });
    last = await (async () => { await click('#lab3d [data-l="try"]'); return finish(); })(); ok(`${name}: en stav alene velter`, last && !last.passed && last.reason === 'fall', JSON.stringify(last)); await sh('2_tower_fall');
    ok(`${name}: rådet snakker om tripod`, /tripod|tre/i.test(await msg()), await msg());
    // tre staver i stål: består
    await click('#lab3d [data-l="try"]'); await V(() => { const c = window.__game.lab3d.ctl; c.setView('3d'); c.setLayer(2); });
    await tapPt({ x: 2, y: 8, z: 2 }); await tapPt({ x: 4, y: 0, z: 0 }); await tapPt({ x: 2, y: 8, z: 2 }); await tapPt({ x: 0, y: 0, z: 4 });
    await sh('3_tower_bygget');
    const nr = await V(() => window.__game.lab3d.ctl.status().rods); ok(`${name}: tre staver lagt med berøring`, nr === 3, String(nr));
    await click('#lab3d [data-l="try"]'); last = await finish(); ok(`${name}: tripod av stål består`, last && last.passed && last.stars === 3, JSON.stringify(last)); await sh('4_tower_bestatt');
    await click('#lab3d [data-l="mnext"]'); ok(`${name}: Tripoden åpnet`, (await cur()) === 'tripod3d');
    await V(() => window.__game.lab3d.ctl.guideAuto('wood')); last = await finish(); ok(`${name}: Tripoden består med SÅ SLIK-bygget`, last && last.passed, JSON.stringify(last)); await V(() => window.__game.lab3d.ctl.setView('3d')); await V(() => window.__game.lab3d.redraw()); await sh('5_tripod_bestatt');
    await click('#lab3d [data-l="mnext"]'); ok(`${name}: Bred bro i sidevind åpnet`, (await cur()) === 'wind3d');
    await V(() => window.__game.lab3d.ctl.guideAuto('wood')); last = await finish(); ok(`${name}: broen i sidevind består (stål i beina)`, last && last.passed, JSON.stringify(last)); await sh('6_vind_bestatt');
    const log = await V(() => (window.__game.log || []).length); void log;
    await click('#lab3d [data-l="back"]'); await pg.evaluate(() => window.__game.tick(30, 1 / 60));
    const st = await V(() => { const g = window.__game.scene; let g3 = null; g && g.traverse((o) => { if (o.name === 'lab3d') g3 = o; }); return g3 ? g3.children.length : -1; });
    ok(`${name}: bygget står i rommet (tegnet)`, st > 10, String(st)); await sh('7_rommet');
    ok(`${name}: ingen konsollfeil`, errs.length === 0, errs.join(' | ').slice(0, 300));
    await ctx.close();
  }
  await b.close(); srv.close(); console.log(bad ? `live_lab3d_missions: ${bad} feil` : 'live_lab3d_missions: ok'); process.exit(bad ? 1 : 0);
})();
