// R107: «Neste sted» i byggeren på iPhone 14 med EKTE berøring (CDP Input.dispatchTouchEvent), stående og liggende.
// Byggeskolen: ▶ i topplinjen (🔒 til Bro er bestått, trykk viser hvorfor), bestå Bro med eksempelbroen, resultatkort med NESTE STED ▶ («Trapp · 2/8»), trykk den, se Trapp 2/8, ◀ og se at Bro-bygget står der.
// Hyllebroen: resultatkort med TILBAKE TIL SPILLET. Trapp (klassisk): resultatkort etter ferdig trapp. Skjermbilder i utmappa. node tools/live_buildnext.cjs <utmappe> [port]  (playwright via NODE_PATH). Ingen FPS-krav (ingen GPU).
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(p).pipe(r); });
(async () => {
  const out = process.argv[2] || '.'; await new Promise((ok) => srv.listen(+process.argv[3] || 0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; }; const errs = [];
  async function session(level, init, land, fn) {
    const ctx = await b.newContext({ ...devices[land ? 'iPhone 14 landscape' : 'iPhone 14'] }), pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript(init); await pg.goto(`http://localhost:${port}/?level=${level}`); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 90000 }); await pg.evaluate(() => window.__game.tick(30, 1 / 60));
    const cdp = await ctx.newCDPSession(pg), tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    const t = {
      run, pg,
      open: (id) => pg.evaluate((id) => { const o = window.__game.bld.open(id, { force: true }); window.__game.tick(4, 1 / 60); return o; }, id),
      tap: async (x, y) => { await tp('touchStart', x, y); await pg.waitForTimeout(40); await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); },
      tapVis: async (sel) => { const r = await t.box(sel); if (!r) throw new Error('fant ikke ' + sel); await t.tap(r.x + r.w / 2, r.y + r.h / 2); },
      tapSel: async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await t.tap(r.x + r.width / 2, r.y + r.height / 2); },
      drag: async (x0, y0, x1, y1) => { await tp('touchStart', x0, y0); for (let i = 1; i <= 8; i++) { await tp('touchMove', x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await pg.waitForTimeout(30); } await run(2); await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); },
      sp: (u, v) => pg.evaluate(([u, v]) => { const q = window.__game.bld.screenPos(u, v), r = document.querySelector('#bld canvas').getBoundingClientRect(); return { x: r.x + q.x, y: r.y + q.y }; }, [u, v]),
      chip: async (id) => { const l = pg.locator(`#bld .chip[data-id="${id}"]`); await l.scrollIntoViewIfNeeded(); const r = await l.boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; },
      place: async (id, u, v) => { const c = await t.chip(id), p = await t.sp(u, v); await t.drag(c.x, c.y, p.x, p.y); },
      sh: async (n) => { await run(2); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/buildnext_${n}.png`, timeout: 60000 }); },
      win: async () => { for (let i = 0; i < 200 && (await pg.evaluate(() => window.__game.bld.running)); i++) await pg.evaluate(() => window.__game.bld.update(1 / 20, true)); await run(3); return await pg.evaluate(() => window.__game.bld.result); },
      box: (sel) => pg.evaluate((s) => { const all = [...document.querySelectorAll(s)], e = all.find((x) => x.getBoundingClientRect().width > 0 && getComputedStyle(x).display !== 'none') || all[0]; if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return { x: r.x, y: r.y, r: r.right, b: r.bottom, w: r.width, h: r.height, vis: cs.display !== 'none' && r.width > 0, t: e.textContent }; }, sel),
      site: () => pg.evaluate(() => window.__game.bld.siteId),
    };
    await fn(t, pg); await ctx.close();
  }
  const ON = () => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.buildall', 'true'); localStorage.setItem('tlm.cbxhand', '1'); localStorage.setItem('tlm.gridbudgetk', '6'); localStorage.setItem('tlm.skole', JSON.stringify({ opened: true, card: 'skipped', done: false })); } catch (e) { /* ok */ } };
  const overlap = (a, c) => a && c && a.x < c.r && a.r > c.x && a.y < c.b && a.b > c.y;
  for (const land of [false, true]) {
    const nm = land ? 'liggende' : 'stående', L = land ? 'l' : 'p', W = land ? 844 : 390, H = land ? 390 : 844;
    await session('bygglab', ON, land, async (t, pg) => {
      await t.run(60); ok(`${nm}: Byggeskolen åpner byggeskjermen`, await pg.evaluate(() => document.body.classList.contains('building')));
      for (let i = 0; i < 6 && (await pg.evaluate(() => window.__game.bld.bux.handOn)); i++) await pg.evaluate(() => { for (let k = 0; k < 10; k++) window.__game.bld.update(0.4, true); });
      ok(`${nm}: på Bro (1/8)`, (await t.site()) === 'lab1');
      let nx = await t.box('#bld .bnnext'); const flag = await t.box('#qbtn'), more = await t.box('#bld .bxmore'), back = await t.box('#bld .bxback');
      ok(`${nm}: ▶-knappen står i topplinjen med 🔒 og navnet «Trapp» (låst til Bro er bestått)`, nx && nx.vis && /🔒/.test(nx.t) && /Trapp/.test(nx.t), nx && nx.t);
      ok(`${nm}: ▶-knappen er minst 48 px`, nx && nx.w >= 47.5 && nx.h >= 47.5, nx && `${nx.w}x${nx.h}`);
      ok(`${nm}: ingen overlapp med ⋯, ← og ⚑`, nx && !overlap(nx, more) && !overlap(nx, back) && !overlap(nx, flag), JSON.stringify([nx, more, flag]));
      ok(`${nm}: innenfor skjermen`, nx && nx.x >= 0 && nx.r <= W + 0.5 && nx.y >= 0 && nx.b <= H + 0.5);
      await t.sh(`1_topp_laast_${L}`);
      await t.tapVis('#bld .bnnext'); await t.run(3);
      ok(`${nm}: trykk på låst ▶ blir på Bro og forklarer hvorfor`, (await t.site()) === 'lab1');
      const toast = await pg.evaluate(() => [...document.querySelectorAll('body *')].map((e) => e.children.length === 0 ? e.textContent : '').find((s) => /Bestå .* for å åpne/.test(s)) || '');
      ok(`${nm}: «Bestå Bro for å åpne Trapp»`, /Bestå Bro for å åpne Trapp/.test(toast), toast);
      // bestå Bro med eksempelbroen
      await pg.evaluate(() => window.__game.bld.grid.example()); await t.run(3);
      const nRods = await pg.evaluate(() => window.__game.bld.state().builds.find((q) => q.id === 'lab1').placed);
      await t.tapVis('#bld .bxgo .try, #bld .cxgo .try'); await t.run(2); const res = await t.win();
      ok(`${nm}: eksempelbroen vinner`, res && res.state === 'won', JSON.stringify(res && { s: res.state, r: res.reason }));
      const card = await t.box('#bld .bnres'), prim = await t.box('#bld .bnp'), sec = await t.box('#bld .bnq'), tryB = await t.box('#bld .bxgo');
      ok(`${nm}: resultatkortet vises og PRØV-raden er byttet ut`, card && card.vis && tryB && !tryB.vis || (tryB && tryB.w === 0), JSON.stringify([card && card.vis, tryB && tryB.vis]));
      ok(`${nm}: «Bestått» med stjerner`, card && /Bestått/.test(card.t) && /[★☆]{3}/.test(card.t), card && card.t);
      ok(`${nm}: stor NESTE STED ▶ med navn og nummer «Trapp · 2/8»`, prim && /NESTE STED ▶/.test(prim.t) && /Trapp · 2\/8/.test(prim.t), prim && prim.t);
      ok(`${nm}: PRØV IGJEN finnes og begge knappene er minst 48 px`, sec && /PRØV IGJEN/.test(sec.t) && sec.h >= 47.5 && prim.h >= 47.5 && prim.w >= 47.5 && sec.w >= 47.5, JSON.stringify([prim && [prim.w, prim.h], sec && [sec.w, sec.h]]));
      ok(`${nm}: kortet innenfor skjermen og uten overlapp med ⚑`, card && card.x >= 0 && card.r <= W + 0.5 && card.b <= H + 0.5 && !overlap(card, flag), JSON.stringify(card));
      nx = await t.box('#bld .bnnext'); ok(`${nm}: ▶ i topplinjen er åpen (ikke 🔒)`, nx && /▶/.test(nx.t) && !/🔒/.test(nx.t), nx && nx.t);
      await t.sh(`2_resultat_${L}`);
      await t.tapVis('#bld .bnp'); await t.run(3);
      ok(`${nm}: NESTE STED tar deg til Trapp (lab2)`, (await t.site()) === 'lab2');
      const nm2 = await t.box('#bld .bxname b, #bld .cxname b'); ok(`${nm}: topplinjen viser stedet som «Trapp · 2/8»`, land ? true : nm2 && /Trapp · 2\/8/.test(nm2.t), nm2 && nm2.t);
      ok(`${nm}: kortet er borte og PRØV-raden er tilbake`, !(await t.box('#bld .bnres')).vis && (await t.box('#bld .bxgo .try, #bld .cxgo .try')).vis);
      await t.sh(`3_trapp_${L}`);
      await pg.evaluate(() => document.querySelector('#bld .lab button[data-lb="prev"]').click()); await t.run(3);
      ok(`${nm}: ◀ tilbake til Bro`, (await t.site()) === 'lab1');
      const n2 = await pg.evaluate(() => window.__game.bld.state().builds.find((q) => q.id === 'lab1').placed);
      ok(`${nm}: Bro-bygget står der (uten tap)`, n2 === nRods && n2 > 0, `${n2} av ${nRods}`);
      // ▶ i topplinjen går nå til Trapp (åpen)
      await t.tapVis('#bld .bnnext'); await t.run(3); ok(`${nm}: ▶ i topplinjen tar deg til Trapp når den er åpen`, (await t.site()) === 'lab2');
      // siste sted: ingen ▶ og FERDIG
      await pg.evaluate(() => { for (let i = 0; i < 6; i++) window.__game.bld.lab.go(1); }); await t.run(3);
      ok(`${nm}: siste sted (8/8) har ingen ▶ i topplinjen`, (await t.site()) === 'lab8' && !(await t.box('#bld .bnnext')).vis);
    });
    if (!land) {
      await session('bro', ON, land, async (t, pg) => {
        ok('Hyllebroen åpnes', await t.open('bro1')); await t.run(10);
        for (let i = 0; i < 6 && (await pg.evaluate(() => window.__game.bld.bux.handOn)); i++) await pg.evaluate(() => { for (let k = 0; k < 10; k++) window.__game.bld.update(0.4, true); });
        ok('Hyllebroen: ingen ▶ i topplinjen (ett sted)', !(await t.box('#bld .bnnext')).vis);
        await pg.evaluate(() => window.__game.bld.grid.example()); await t.run(3);
        await t.tapVis('#bld .bxgo .try, #bld .cxgo .try'); await t.run(2); const res = await t.win(); ok('Hyllebroen: eksempelbroen vinner', res && res.state === 'won', JSON.stringify(res && { s: res.state, r: res.reason }));
        const prim = await t.box('#bld .bnp'); ok('Hyllebroen: primærknappen er TILBAKE TIL SPILLET', prim && /TILBAKE TIL SPILLET/.test(prim.t) && prim.h >= 47.5, prim && prim.t); ok('Hyllebroen: ingen NESTE STED', !/NESTE STED/.test((await t.box('#bld .bnres')).t));
        await t.sh('4_hyllebro'); await t.tapVis('#bld .bnp'); await t.run(4); ok('Hyllebroen: knappen lukker byggeskjermen', !(await pg.evaluate(() => document.body.classList.contains('building'))));
      });
      await session('trapp', ON, false, async (t, pg) => {
        ok('Trapp åpnes', await t.open('trapp1')); await t.run(10);
        for (const [id, u, vv] of [['k1', 0, 0.75], ['k2', 1.5, 0.75], ['k3', 1.5, 2.25], ['k4', 3, 0.75], ['k5', 3, 2.25], ['k6', 3, 3.75]]) await t.place(id, u, vv);
        await t.tapSel('#bld [data-cx="try"]'); await t.run(1); const res = await t.win(); ok('Trapp: figuren kommer i mål', res && res.state === 'won', JSON.stringify(res && { s: res.state, r: res.reason }));
        const card = await t.box('#bld .bnres'), prim = await t.box('#bld .bnp'); ok('Trapp (klassisk): resultatkort med TILBAKE TIL SPILLET', card && card.vis && /Bestått/.test(card.t) && prim && /TILBAKE TIL SPILLET/.test(prim.t), card && card.t);
        ok('Trapp: PRØV-raden er byttet ut', !(await t.box('#bld .cxgo')).vis); await t.sh('5_trapp_klassisk');
        await t.tapSel('#bld .bnq'); await t.run(3); ok('Trapp: PRØV IGJEN går tilbake til bygging', !(await t.box('#bld .bnres')).vis && (await t.box('#bld [data-cx="try"]')).vis);
      });
    }
  }
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
