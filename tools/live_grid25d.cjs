// R123: DOBBEL BRO (2,5D) på iPhone 14 med EKTE berøring (CDP Input.dispatchTouchEvent), stående og liggende: Byggeskole sted 9 (Bred bro) og Hyllebroen.
// Sjekker: ⋯ → DOBBEL BRO åpner dialogen med 3D-forhåndsvisning (lerret tegnes, dra snur bildet), bredde og tverrstag, kostnad; BRUK gir planet bak i byggeskjermen; enkel bro feiler i vind, dobbel består;
// den dobbelte broen står i verdenen (to plan og dekk), ANGRE tar den bort, trykkflater >= 48 px, dialogen ligger innenfor skjermen og ingen konsollfeil. Bilder i <utmappe>.
// node tools/live_grid25d.cjs <utmappe> [port]   (playwright via NODE_PATH). Exit 1 ved feil. Ingen GPU (swiftshader ~1 fps): ingen FPS-krav, ekte følelse «testes på iPhone».
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true }); await new Promise((ok) => srv.listen(+process.argv[3] || 0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; }; const errs = [];
  async function session(level, land, fn) {
    const dev = { ...devices[land ? 'iPhone 14 landscape' : 'iPhone 14'] }, ctx = await b.newContext(dev), pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript(() => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.gridlock', 'false'); localStorage.setItem('tlm.gridguide', 'false'); localStorage.setItem('tlm.gridguideon', 'false'); localStorage.setItem('tlm.buildux.hand', '1'); localStorage.setItem('tlm.skole', JSON.stringify({ opened: true, card: 'skipped', done: false })); } catch (e) { /* ok */ } });
    await pg.goto(`http://localhost:${port}/?level=${level}`); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 90000 }); await pg.evaluate(() => window.__game.tick(30, 1 / 60));
    const cdp = await ctx.newCDPSession(pg), tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    const t = {
      run, pg,
      open: (id) => pg.evaluate((id) => { if (window.__game.bld.active) window.__game.bld.close('test'); const o = window.__game.bld.open(id, { force: true }); window.__game.tick(4, 1 / 60); return o; }, id),
      tap: async (x, y) => { await tp('touchStart', x, y); await pg.waitForTimeout(40); await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); },
      tapSel: async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await t.tap(r.x + r.width / 2, r.y + r.height / 2); return r; },
      drag: async (x0, y0, x1, y1) => { await tp('touchStart', x0, y0); for (let i = 1; i <= 8; i++) { await tp('touchMove', x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await pg.waitForTimeout(30); } await tp('touchEnd'); await pg.waitForTimeout(150); await run(3); },
      sp: (u, v) => pg.evaluate(([u, v]) => { const q = window.__game.bld.screenPos(u, v), r = document.querySelector('#bld canvas').getBoundingClientRect(); return { x: r.x + q.x, y: r.y + q.y }; }, [u, v]),
      sh: async (n) => { await run(2); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/d25_${n}.png`, timeout: 60000 }); },
      info: () => pg.evaluate(() => window.__game.bld.grid.info()),
    };
    await fn(t, pg); await ctx.close();
  }
  // bygg fire staver mellom ankrene med ekte trykk: trykk ankeret og så hvert rutenettpunkt
  async function buildRow(t, pg) {
    const info = await t.info(), an = info.nodes.filter((n) => n.fixed).sort((p, q) => p.u - q.u), st = await pg.evaluate(() => { const g = window.__game.bld.state(); return g; }); void st;
    const gap = an[1].u - an[0].u, step = gap / 4, pts = [an[0], { u: an[0].u + step, v: an[0].v }, { u: an[0].u + 2 * step, v: an[0].v }, { u: an[0].u + 3 * step, v: an[0].v }, an[1]];
    for (let i = 0; i + 1 < pts.length; i++) { const a = await t.sp(pts[i].u, pts[i].v), c = await t.sp(pts[i + 1].u, pts[i + 1].v); await t.drag(a.x, a.y, c.x, c.y); }
    return (await t.info()).rods.length;
  }
  const inside = async (pg, sel) => pg.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, r: r.right, b: r.bottom, w: r.width, h: r.height, W: innerWidth, H: innerHeight }; }, sel);
  const dialogChecks = async (t, pg, tag) => {
    const card = await inside(pg, '#bld .d25 .card'); ok(`${tag}: dialogen ligger innenfor skjermen`, card && card.x >= 0 && card.y >= 0 && card.r <= card.W + 0.5 && card.b <= card.H + 0.5, JSON.stringify(card));
    const btns = await pg.evaluate(() => [...document.querySelectorAll('#bld .d25 button')].filter((e) => e.offsetParent !== null).map((e) => { const r = e.getBoundingClientRect(); return { k: e.dataset.d, w: r.width, h: r.height }; }));
    ok(`${tag}: knappene er minst 48 px høye`, btns.length >= 7 && btns.every((x) => x.h >= 47.5 && x.w >= 47.5), JSON.stringify(btns.filter((x) => x.h < 47.5 || x.w < 47.5)));
    const cv = await inside(pg, '#bld .d25 canvas'); ok(`${tag}: 3D-lerretet har størrelse`, cv && cv.w > 150 && cv.h > 80, JSON.stringify(cv));
  };
  const canvasInk = (pg) => pg.evaluate(() => { const c = document.querySelector('#bld .d25 canvas'), g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; let n = 0, h = 0; for (let i = 0; i < d.length; i += 4) { if (d[i] + d[i + 1] + d[i + 2] > 150) n++; h = (h * 31 + d[i] + d[i + 1] * 3) >>> 0; } return { n, h }; });

  for (const land of [false, true]) {
    if (process.env.ONLY === 'hylle' || (process.env.ONLY === 'port' && land)) break;
    const tag = land ? 'liggende' : 'stående';
    await session('bygglab', land, async (t, pg) => {
      ok(`${tag}: åpner Bred bro (Byggeskole 9)`, await t.open('lab9')); await t.run(10);
      ok(`${tag}: rutenett på`, await pg.evaluate(() => window.__game.bld.grid.on));
      ok(`${tag}: oppdraget har sidevind`, (await pg.evaluate(() => window.__game.bld.stage.now))?.wind === 1.6);
      // uten staver: ⋯ → DOBBEL BRO gir forklaring, ikke dialog
      await t.tapSel('#bld .bxmore'); await t.run(4); const hasBtn = await pg.locator('#bld [data-bx="dbl"]').first().isVisible(); ok(`${tag}: ⋯-arket har DOBBEL BRO`, hasBtn); await t.sh(`${tag}_1_ark`);
      await t.tapSel('#bld [data-bx="dbl"]'); await t.run(4); ok(`${tag}: uten staver åpnes ikke dialogen`, !(await pg.evaluate(() => window.__game.bld.d25.isOpen())));
      const n = await buildRow(t, pg); ok(`${tag}: fire staver bygget med trykk`, n === 4, String(n)); await t.sh(`${tag}_2_enkel`);
      // enkel bro: PRØV feiler i vinden
      await t.tapSel('#bld .bxgo .try'); await pg.evaluate(() => { for (let i = 0; i < 3000 && window.__game.bld.running; i++) window.__game.bld.update(1 / 60, true); });
      let res = await pg.evaluate(() => window.__game.bld.result); ok(`${tag}: enkel bro velter i sidevinden`, res && res.state === 'lost' && res.reason === 'wind', JSON.stringify(res)); await t.sh(`${tag}_3_enkel_velter`);
      await pg.evaluate(() => window.__game.bld.stopTry()); await t.run(4);
      // DOBBEL BRO
      await t.tapSel('#bld .bxmore'); await t.run(4); await t.tapSel('#bld [data-bx="dbl"]'); await t.run(4); await pg.waitForTimeout(400);
      ok(`${tag}: dialogen åpnes`, await pg.evaluate(() => window.__game.bld.d25.isOpen())); await pg.waitForTimeout(500); await dialogChecks(t, pg, tag);
      const ink0 = await canvasInk(pg); ok(`${tag}: 3D-forhåndsvisningen er tegnet`, ink0.n > 200, JSON.stringify(ink0)); await t.sh(`${tag}_4_dialog`);
      // dra i lerretet snur bildet
      const cvb = await pg.locator('#bld .d25 canvas').boundingBox(); await t.drag(cvb.x + cvb.width * 0.3, cvb.y + cvb.height / 2, cvb.x + cvb.width * 0.7, cvb.y + cvb.height / 2); await pg.waitForTimeout(400);
      const ink1 = await canvasInk(pg); ok(`${tag}: å dra i bildet snur det`, ink1.h !== ink0.h, `${ink0.h} → ${ink1.h}`); await t.sh(`${tag}_5_dialog_snudd`);
      await t.tapSel('#bld .d25 [data-d="w:bred"]'); await t.tapSel('#bld .d25 [data-d="b:rett"]'); await pg.waitForTimeout(300); await t.sh(`${tag}_6_bred_rett`);
      const costTxt = await pg.locator('#bld .d25 .cost').innerText(); ok(`${tag}: kostnaden står i dialogen`, /\d/.test(costTxt), costTxt);
      await t.tapSel('#bld .d25 [data-d="use"]'); await t.run(4); ok(`${tag}: BRUK lukker dialogen og velger dobbel bro`, !(await pg.evaluate(() => window.__game.bld.d25.isOpen())) && (await pg.evaluate(() => window.__game.bld.double)));
      const cost = await pg.evaluate(() => window.__game.bld.cost); ok(`${tag}: kostnaden teller planet bak og tverrstagene`, cost.cost >= 15 && cost.cost <= 20, JSON.stringify(cost)); await t.sh(`${tag}_7_dobbel_i_byggeskjerm`);
      await t.tapSel('#bld .bxgo .try'); await pg.evaluate(() => { for (let i = 0; i < 3000 && window.__game.bld.running; i++) window.__game.bld.update(1 / 60, true); });
      res = await pg.evaluate(() => window.__game.bld.result); ok(`${tag}: dobbel bro består prøven med sidekraft`, res && res.state === 'won', JSON.stringify(res)); await t.sh(`${tag}_8_dobbel_bestatt`);
      // ut i verdenen
      ok(`${tag}: bygget står i verdenen`, await pg.evaluate(() => window.__game.bld.inWorld('lab9')), String(await pg.evaluate(() => window.__game.bld.worldCount('lab9'))));
      const wc = await pg.evaluate(() => window.__game.bld.worldCount('lab9')); ok(`${tag}: kollisjonsflater for to plan og dekk`, wc >= 12, String(wc));
      await pg.evaluate(() => window.__game.bld.close('test')); await t.run(6);
      if (process.env.WORLD) {   // bilder fra verdenen (tungt uten GPU): WORLD=1
        for (const [i, [dx, dz, nm]] of [[-9, 7, '9_verden_nær'], [-22, 14, '10_verden_fra_siden']].entries()) { void i; await pg.evaluate(([dx, dz]) => { const s = window.__game.LEVEL.build.sites.find((q) => q.id === 'lab9'), p = window.__game.player; p.x = s.x + dx; p.y = s.y + 0.1; p.z = s.z + dz; window.__game.tick(20, 1 / 60); }, [dx, dz]); await t.sh(`${tag}_${nm}`); }
      }
      await pg.evaluate(() => window.__game.bld.open('lab9', { force: true })); await t.run(6);
      // ANGRE tar den bort
      await t.tapSel('#bld .bxundo'); await t.run(4); ok(`${tag}: ANGRE tar bort dobbel bro`, !(await pg.evaluate(() => window.__game.bld.double))); await t.sh(`${tag}_11_angret`);
    });
  }
  // Hyllebroen: knappen finnes og dialogen virker også der (delt kode)
  for (const land of [false, true]) {
    if (process.env.ONLY === 'port') break;
    const tag = 'Hyllebroen ' + (land ? 'liggende' : 'stående');
    await session('bro', land, async (t, pg) => {
      ok(`${tag}: åpner bro1`, await t.open('bro1')); await t.run(10); ok(`${tag}: rutenett på`, await pg.evaluate(() => window.__game.bld.grid.on));
      await t.sh(`hylle_${land ? 'l' : 's'}_start`); const n = await buildRow(t, pg); ok(`${tag}: staver bygget`, n >= 3, String(n));
      await t.tapSel('#bld .bxmore'); await t.run(4); await t.tapSel('#bld [data-bx="dbl"]'); await t.run(4); await pg.waitForTimeout(500);
      ok(`${tag}: dialogen åpnes`, await pg.evaluate(() => window.__game.bld.d25.isOpen())); await dialogChecks(t, pg, tag); await t.sh(`hylle_${land ? 'l' : 's'}_dialog`);
      await t.tapSel('#bld .d25 [data-d="close"]'); await t.run(3); ok(`${tag}: LUKK lukker`, !(await pg.evaluate(() => window.__game.bld.d25.isOpen())));
    });
  }
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); srv.close(); console.log(bad ? `${bad} FEIL` : 'live_grid25d: ok'); process.exit(bad ? 1 : 0);
})();
