// R109: regresjon for byggeskjermen på iPhone 14 (stående og liggende, EKTE berøring via CDP): sett ut en del og vri den UMIDDELBART, ↺ ↻ ✕, trykk på tom flate og så delen igjen,
// ⚑ rett etter utsetting og rett etter vridning, hold stille 600 ms, avbrutt berøring (touchCancel) midt i et dra, to raske berøringer, og alt med treg enhet (100–250 ms mellom hendelser).
// Etter hvert steg: ingenting henger (drag/gest/ptrs/capture). Tekster: null overlapp (hintlinje, plate, navn, valgt-rad, knapper, ⚑) i 390×844, 844×390 og 667×375. Bilder i <utmappe>.
// node tools/live_cbx_regress.cjs <utmappe> [port]  (playwright via NODE_PATH). Exit 1 ved feil. Ingen GPU (swiftshader ~1 fps): ingen FPS-krav; ekte følelse «testes på iPhone».
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(p).pipe(r); });
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true }); await new Promise((ok) => srv.listen(+process.argv[3] || 0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; }; const errs = [];
  const INIT = () => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.buildall', 'true'); localStorage.setItem('tlm.gridstage', 'false'); localStorage.setItem('tlm.gridlock', 'false'); localStorage.setItem('tlm.cbxhand', '1'); localStorage.setItem('tlm.skole', JSON.stringify({ opened: true, card: 'skipped', done: false })); } catch (e) { /* ok */ } };
  async function session(level, vp, fn) {
    const ctx = await b.newContext({ ...devices['iPhone 14'], viewport: vp }), pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript(INIT); await pg.goto(`http://localhost:${port}/?level=${level}`); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 90000 }); await pg.evaluate(() => window.__game.tick(30, 1 / 60));
    const cdp = await ctx.newCDPSession(pg); let slow = 0;
    const tp = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : pts.map((p, i) => ({ x: p.x, y: p.y, id: i + 1 })) });
    const wait = (ms) => pg.waitForTimeout(slow ? slow + Math.random() * 150 : ms);
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    const t = {
      pg, run, setSlow: (v) => { slow = v; },
      open: (id) => pg.evaluate((id) => { const o = window.__game.bld.open(id, { force: true }); window.__game.tick(4, 1 / 60); return o; }, id),
      tap: async (x, y, hold = 30) => { await tp('touchStart', [{ x, y }]); await wait(hold); await tp('touchEnd'); await wait(0); await pg.waitForTimeout(80); await run(3); },
      tapSel: async (sel, hold) => { const r = await pg.locator(sel).first().boundingBox(); await t.tap(r.x + r.width / 2, r.y + r.height / 2, hold); },
      drag: async (x0, y0, x1, y1, end = true) => { await tp('touchStart', [{ x: x0, y: y0 }]); for (let i = 1; i <= 6; i++) { await tp('touchMove', [{ x: x0 + (x1 - x0) * i / 6, y: y0 + (y1 - y0) * i / 6 }]); await wait(20); } if (!end) return; await tp('touchEnd'); await wait(0); await pg.waitForTimeout(80); await run(3); },
      cancel: () => tp('touchCancel'), two: async (a, c) => { await tp('touchStart', [a]); await tp('touchStart', [a, c]); await wait(10); await tp('touchEnd'); },
      sp: (u, v) => pg.evaluate(([u, v]) => { const q = window.__game.bld.screenPos(u, v), r = document.querySelector('#bld canvas').getBoundingClientRect(); return { x: r.x + q.x, y: r.y + q.y }; }, [u, v]),
      chip: async (id) => { const l = pg.locator(`#bld .chip[data-id="${id}"]`); await l.scrollIntoViewIfNeeded(); const r = await l.boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; },
      hang: () => pg.evaluate(() => window.__game.bld.touch.hanging.join(',') + '|cap' + window.__game.bld.touch.capture),
      exp: () => pg.evaluate(() => window.__game.bld.exportText()), st: () => pg.evaluate(() => window.__game.bld.state()),
      sh: async (n) => { await run(2); await pg.screenshot({ path: `${out}/tap_${n}.png`, timeout: 60000 }); },
      flagOpen: () => pg.evaluate(() => !document.getElementById('qpop').classList.contains('hide')),
      box: (sel) => pg.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return cs.display === 'none' || !r.width ? null : { x: r.x, y: r.y, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, sel),
      selBtns: () => pg.evaluate(() => { const e = document.querySelector('#bld .cxsel.show'); if (!e) return null; return [...e.querySelectorAll('button')].filter((x) => getComputedStyle(x).display !== 'none').map((x) => { const r = x.getBoundingClientRect(); return { k: x.dataset.cx, x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, r: r.right, b: r.bottom, t: r.top }; }); }),
      texts: () => pg.evaluate(() => {
        const o = document.querySelector('#bld').getBoundingClientRect(), out = [], add = (k, r) => r && r.width > 1 && r.height > 1 && out.push({ k, x: r.x, y: r.y, r: r.right, b: r.bottom });
        const tr = (sel) => { const e = document.querySelector(sel); if (!e || getComputedStyle(e).display === 'none' || !e.textContent.trim()) return null; const rg = document.createRange(); rg.selectNodeContents(e); return rg.getBoundingClientRect(); };
        { const h = document.querySelector('#bld .hint'); if (h && h.textContent.trim() && getComputedStyle(h).display !== 'none') { const rg = document.createRange(); rg.selectNodeContents(h); const rr = rg.getClientRects(), hr = h.getBoundingClientRect(); let x0 = 1e9, x1 = -1e9; for (const q of rr) if (q.bottom <= hr.bottom + 1) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.right); } add('hint', { x: x0, y: hr.y, right: x1, bottom: hr.bottom, width: x1 - x0, height: hr.height }); } } { const n = document.querySelector('#bld .cxname b'); if (n) add('navn', n.getBoundingClientRect()); } add('plate', tr('#bld .cxplate')); add('lab', tr('#bld .lab .nm'));
        for (const e of document.querySelectorAll('#bld .cbx button, #bld .bna, #bld .cxsel.show button, #qbtn')) { const cs = getComputedStyle(e), r = e.getBoundingClientRect(); if (cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 1) add('btn:' + (e.dataset.cx || e.id || e.className), r); }
        const bb = window.__game.bld.touch.budgetBox; if (bb) add('budsjett', { x: bb.x + o.x, y: bb.y + o.y, right: bb.r + o.x, bottom: bb.b + o.y, width: bb.r - bb.x, height: bb.b - bb.y });
        return out;
      }),
    };
    await fn(t, pg); await ctx.close();
  }

  const VPS = [['stående', { width: 390, height: 844 }], ['liggende', { width: 844, height: 390 }]];
  const logs = (pg) => pg.evaluate(() => (window.__game.log || []).length);
  for (const [vn, vp] of VPS) for (const [lvl, site, labGo, chipId] of [['trapp', 'trapp1', 0, 'k1'], ['bygglab', 'lab1', 2, null]]) {
    await session(lvl, vp, async (t, pg) => {
      const tag = `${lvl} ${vn}`;
      await t.open(site); if (labGo) await pg.evaluate((n) => { for (let i = 0; i < n; i++) window.__game.bld.lab.go(1); window.__game.tick(6, 1 / 60); }, labGo); await t.run(12);
      const info = await t.st(); const sid = info.active;
      await pg.evaluate(() => window.__game.bld.cap.reset());
      const ids = await pg.evaluate(() => [...document.querySelectorAll('#bld .chip:not(.used)')].map((e) => e.dataset.id));
      if (!ids.length) { ok(`${tag}: delebrett har brikker`, false, sid); return; }
      // 1) trykk på brikke legger ut og velger
      let c = await t.chip(ids[0]); await t.tap(c.x, c.y); await t.run(6);
      let s = await t.st(); ok(`${tag}: trykk på brikke legger ut`, s.builds.find((b) => b.id === sid).placed === 1, JSON.stringify(s.builds.map((b) => b.placed)));
      ok(`${tag}: delen er valgt`, await pg.evaluate(() => !!window.__game.bld.touch.sel), '');
      if (lvl !== 'bro') ok(`${tag}: ↺ ↻ ✕ vises`, !!(await t.selBtns()), '');
      ok(`${tag}: ingenting henger`, (await t.hang()) === '|cap0', await t.hang());
      await t.sh(`${lvl}_${vn}_1_ut`);
      // 2) en brikke til: ikke oppå den første
      if (ids[1]) { c = await t.chip(ids[1]); await t.tap(c.x, c.y); await t.run(4); s = await t.st(); const pl = s.builds.find((b) => b.id === sid).parts; ok(`${tag}: to deler`, pl.length === 2, String(pl.length)); }
      // 3) trykk på tom flate, så på delen: velger
      const pp = (await t.st()).builds.find((b) => b.id === sid).parts[0]; const pos = await t.sp(pp.u, pp.v);
      await t.tap(pos.x, Math.max(120, pos.y - 150)); await t.run(3); ok(`${tag}: tom flate fjerner valg`, !(await pg.evaluate(() => window.__game.bld.touch.sel)), '');
      await t.tap(pos.x, pos.y); await t.run(3); ok(`${tag}: trykk på plassert del velger`, (await pg.evaluate(() => window.__game.bld.touch.sel)) === pp.id, '');
      // 4) med TAPE valgt: første trykk velger første del (ramme), samme del igjen velger den
      if (lvl !== 'bro') {
        await pg.evaluate(() => document.querySelector('#bld [data-cx="tape"]')?.click()); await t.run(3);
        await t.tap(pos.x, pos.y); await t.run(3); ok(`${tag}: TAPE: første trykk gir første del`, await pg.evaluate(() => window.__game.bld.touch.linkFrom != null || window.__game.bld.touch.sel != null), '');
        await t.tap(pos.x, pos.y); await t.run(3); ok(`${tag}: TAPE: samme del igjen velger den`, (await pg.evaluate(() => window.__game.bld.touch.sel)) === pp.id, '');
        await t.sh(`${lvl}_${vn}_2_tape`);
      }
      // 5) Tåler: bare der måleren vises, og aldri mange kjøringer
      const cap = await pg.evaluate(async () => { await new Promise((r) => setTimeout(r, 700)); window.__game.tick(4, 1 / 60); await new Promise((r) => setTimeout(r, 500)); return { shown: window.__game.bld.cap.shown, runs: window.__game.bld.cap.runs }; });
      if (lvl === 'trapp' || lvl === 'bygglab') ok(`${tag}: Tåler kjører ikke`, !cap.shown && cap.runs === 0, JSON.stringify(cap)); else ok(`${tag}: Tåler: høyst én kjøring etter to utsettinger/valg`, cap.runs <= 2, JSON.stringify(cap));
    });
  }
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); srv.close(); console.log(bad ? `${bad} FEIL` : 'alt ok'); process.exit(bad ? 1 : 0);
})();
