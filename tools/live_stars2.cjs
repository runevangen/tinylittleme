// R126: runde 2 på iPhone 14 med EKTE berøring (CDP Input.dispatchTouchEvent), stående og liggende: Byggeskole · Fagverk (lab4) og Badebroen (bad1).
// Bygger spesifikasjonen fra stars2_data.js med dra mellom rutenettpunkt, trykker PRØV, og sjekker at resultatkortet viser BILLIGST, LETTEST og SMULE (★) og beste-lista,
// at stedsraden viser «★n/m», at kortet ligger innenfor skjermen og at ingen konsollfeil kommer. Bilder i <utmappe>. node tools/live_stars2.cjs <utmappe> [port]  (playwright via NODE_PATH). Ingen FPS-krav (ingen GPU).
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
      sh: async (n) => { await run(2); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/round2_${n}.png`, timeout: 60000 }); },
      win: async () => { for (let i = 0; i < 200 && (await pg.evaluate(() => window.__game.bld.running)); i++) await pg.evaluate(() => window.__game.bld.update(1 / 20, true)); await run(3); return await pg.evaluate(() => window.__game.bld.result); },
      box: (sel) => pg.evaluate((s) => { const all = [...document.querySelectorAll(s)], e = all.find((x) => x.getBoundingClientRect().width > 0 && getComputedStyle(x).display !== 'none') || all[0]; if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return { x: r.x, y: r.y, r: r.right, b: r.bottom, w: r.width, h: r.height, vis: cs.display !== 'none' && r.width > 0, t: e.textContent }; }, sel),
      site: () => pg.evaluate(() => window.__game.bld.siteId),
    };
    await fn(t, pg); await ctx.close();
  }
  const ON = () => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.buildall', 'true'); localStorage.setItem('tlm.gridlock', 'false'); localStorage.setItem('tlm.gridguide', 'false'); localStorage.setItem('tlm.skole', JSON.stringify({ opened: true, card: 'skipped', done: false })); } catch (e) { /* ok */ } };
  const { STARS2_DATA } = await import(path.join(root, 'stars2_data.js'));
  async function buildSpec(t, pg, spec) {
    const info = await pg.evaluate(() => window.__game.bld.grid.info()), an = info.nodes.filter((n) => n.fixed).sort((p, q) => p.u - q.u), pts = [an[0], an[1], ...spec.nodes.map(([u, v]) => ({ u, v }))];
    const seen = new Set([0, 1]);   // en dra må starte i en knute som finnes: snu retningen når bare enden finnes
    for (const [a0, c0, m] of spec.rods) { const sw = !seen.has(a0) && seen.has(c0), a = sw ? c0 : a0, c = sw ? a0 : c0; seen.add(a); seen.add(c); await pg.evaluate((m) => window.__game.bld.grid.setMat(m), m); const p = await t.sp(pts[a].u, pts[a].v), q = await t.sp(pts[c].u, pts[c].v); await t.drag(p.x, p.y, q.x, q.y); }
    const fin = await pg.evaluate(() => window.__game.bld.grid.info()); if (process.env.R2DEBUG) console.log('rods', JSON.stringify(fin.rods.map((r) => [r.a, r.b, r.mat])), JSON.stringify(fin.nodes.map((n) => [n.id, n.u, n.v])), JSON.stringify(spec));
    return fin.rods.length;
  }
  for (const [level, site, nm] of [['bygglab', 'lab4', 'Byggeskole · Fagverk'], ['badebro', 'bad1', 'Badebroen']]) {
    for (const land of [false, true]) {
      const tag = `${nm} ${land ? 'liggende' : 'stående'}`, L = `${site}_${land ? 'l' : 'p'}`, W = land ? 844 : 390, H = land ? 390 : 844, D = STARS2_DATA[site];
      await session(level, ON, land, async (t, pg) => {
        await t.run(60); if (level === 'bygglab') { for (let k = 0; k < 9 && (await t.site()) !== site; k++) { await pg.evaluate(() => window.__game.bld.lab.go(1)); await t.run(3); } } else { await t.open(site); await t.run(3); const sk = pg.locator('.skcard button[data-sk="skip"]').first(); if (await sk.count()) await sk.click(); await t.run(3); }
        ok(`${tag}: på stedet ${site}`, (await t.site()) === site, await t.site());
        for (let i = 0; i < 6 && (await pg.evaluate(() => window.__game.bld.bux.handOn)); i++) await pg.evaluate(() => { for (let k = 0; k < 10; k++) window.__game.bld.update(0.4, true); });
        const hint = await pg.evaluate(() => window.__game.bld.stage.lines().map((l) => l.t).join(' | ')); ok(`${tag}: infokortet nevner runde 2-målene`, /Runde 2/.test(hint) && /BILLIGST/.test(hint) && /LETTEST/.test(hint), hint);
        // tre bygg: smulebygget (bare SMULE), det billige (BILLIGST) og det lette (LETTEST). Stjernene samles opp på stedet og beste-lista vokser.
        const plan = [['smule', D.refBonus, ['bonus']], ['billigst', D.refCheap, ['cheap']], ['lettest', D.refLight, ['light']]];
        let first = true;
        for (const [name, spec, want] of plan) {
          if (!spec) continue;
          if (!first) if (level === 'bygglab') await pg.evaluate((id) => window.__game.bld.lab.resetSite(id), site); else { await t.tapVis('#bld .bxmore'); await t.tapVis('#bld .bxreset'); } await t.run(3); first = false;
          const n = await buildSpec(t, pg, spec); ok(`${tag}: ${name}: bygget lagt med ekte berøring (${n} staver)`, n >= spec.rods.length, String(n));
          if (name === 'smule') await t.sh(`1_bygd_${L}`);
          let res = null; const loads = await pg.evaluate(() => window.__game.bld.stage.now.loads);
          const tryIt = async () => { await pg.evaluate(() => window.__game.bld.startTry()); for (let i = 0; i < 40 && (await pg.evaluate(() => window.__game.bld.running)); i++) await pg.evaluate(() => { for (let q = 0; q < 150 && window.__game.bld.running; q++) window.__game.bld.update(1 / 60, true); }); await t.run(3); return pg.evaluate(() => window.__game.bld.result); };
          for (const l of loads.length > 1 ? loads : [null]) {   // flere laster: velg hver i ⋯-menyen (som en spiller) og trykk PRØV
            if (l) { await pg.evaluate(() => window.__game.bld.stopTry()); await t.run(2); await pg.evaluate(() => window.__game.bld.bux.sheet(false)); await t.run(2); await pg.locator('#bld .bxmore').first().click(); await t.run(3); await pg.locator(`#bld .bxsheet .loads button[data-l="${l}"]`).first().click(); await t.run(2); await pg.evaluate(() => window.__game.bld.bux.sheet(false)); await t.run(2); }
            res = await tryIt(); if (!(res && res.state === 'won')) break;
          }
          if (process.env.R2DEBUG) console.log('res', JSON.stringify(res), JSON.stringify(await pg.evaluate(() => ({ ov: window.__game.bld.stage.over, solved: window.__game.bld.stage.passed, l: window.__game.bld.stage.lines().map((l) => l.t) }))));
          ok(`${tag}: ${name}: prøven vinner`, res && res.state === 'won', JSON.stringify(res && { s: res.state, r: res.reason }));
          const r2 = await pg.evaluate(() => { const r = window.__game.bld.round2; return r && { got: r.ev.got, n: r.ev.n, rank: r.rec.rank, all: r.rec.got, list: r.rec.list.length }; });
          ok(`${tag}: ${name}: runde 2 vurdert, tar ${want.join('+')}`, r2 && want.every((k) => r2.got.includes(k)), JSON.stringify(r2));
          const card = await t.box('#bld .bnres'), chips = await t.box('#bld .bnres .r2c'), best = await t.box('#bld .bnres .r2b'), lbl = { cheap: 'BILLIGST', light: 'LETTEST', bonus: 'SMULE' };
          ok(`${tag}: ${name}: kortet viser ★ for ${want.map((k) => lbl[k]).join(' og ')} og ☆ for de andre`, card && card.vis && chips && want.every((k) => chips.t.includes('★ ' + lbl[k])) && Object.keys(lbl).filter((k) => !want.includes(k) && !(r2 && r2.got.includes(k))).every((k) => !chips.t.includes('★ ' + lbl[k])), chips && chips.t);
          if (!land) ok(`${tag}: ${name}: beste-lista vises`, best && best.vis && /BESTE/.test(best.t) && /1\./.test(best.t), best && best.t);
          ok(`${tag}: ${name}: kortet ligger innenfor skjermen`, card && card.x >= -0.5 && card.r <= W + 0.5 && card.y >= 0 && card.b <= H + 0.5, JSON.stringify(card));
          if (name === 'billigst') await t.sh(`2_kort_${L}`);
        }
        const fin = await pg.evaluate((id) => JSON.parse(localStorage.getItem('tlm.best2') || '{}'), site), sv = Object.values(fin)[0] && Object.values(Object.values(fin)[0])[0];
        ok(`${tag}: stjernene er samlet og lagret, beste-lista har flere bygg`, sv && sv.got.length >= 2 && sv.list.length >= (level === 'bygglab' ? 2 : 1), JSON.stringify(sv || fin).slice(0, 200));
        if (level === 'bygglab') { const bar = await t.box('#bld .lab .nm'); ok(`${tag}: stedsraden viser ★n/3`, bar && /★[23]\/3/.test(bar.t), bar && bar.t); }
        await t.sh(`3_slutt_${L}`);
      });
    }
  }
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
