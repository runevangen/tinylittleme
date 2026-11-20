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
      sh: async (n) => { await run(2); await pg.screenshot({ path: `${out}/cbx_${n}.png`, timeout: 60000 }); },
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
  const overl = (bx) => { const o = []; for (let i = 0; i < bx.length; i++) for (let j = i + 1; j < bx.length; j++) { const a = bx[i], c = bx[j]; if (a.k.startsWith('btn:') && c.k.startsWith('btn:')) continue; if (Math.min(a.r, c.r) - Math.max(a.x, c.x) > 1 && Math.min(a.b, c.b) - Math.max(a.y, c.y) > 1) o.push(a.k + ' × ' + c.k); } return o; };
  const VPS = [['stående', { width: 390, height: 844 }], ['liggende', { width: 844, height: 390 }], ['liggende liten', { width: 667, height: 375 }]];
  const ONLY = process.env.ONLY || '', PICK = process.env.PICK || '';
  // --- 1) berøringsflyt i Trapp og Vippe (klassiske steder), stående og liggende, rask og treg enhet
  for (const [vn, vp] of VPS.slice(0, 2)) for (const [lvl, site, part, drop] of [['trapp', 'trapp1', 'k1', [0, 0.75]], ['vippe', 'vippe1', 'v1', [0, 1.25]]]) for (const slow of [0, 180]) {
    if (ONLY && ONLY !== 'touch') continue; if (PICK && PICK !== `${lvl}${vn}${slow}`) continue;
    await session(lvl, vp, async (t, pg) => {
      const tag = `${lvl} ${vn}${slow ? ' treg' : ''}`; t.setSlow(slow);
      ok(`${tag}: åpner stedet`, await t.open(site)); await t.run(10);
      const c = await t.chip(part), p = await t.sp(drop[0], drop[1]); await t.drag(c.x, c.y, p.x, p.y);   // sett ut
      let s = await t.st(); ok(`${tag}: delen er satt ut`, s.builds[0].placed === 1, String(s.builds[0].placed)); ok(`${tag}: ingenting henger etter slipp`, (await t.hang()) === '|cap0', await t.hang());
      let btns = await t.selBtns(); if (!btns) console.log('DBG', await pg.evaluate(() => JSON.stringify({ sel: window.__game.bld.touch.sel, cls: document.querySelector('#bld .cxsel').className, st: document.querySelector('#bld .cxsel').getAttribute('style'), cx: document.querySelector('#bld').className, h: window.__game.bld.touch.hanging }))); ok(`${tag}: ↺ ↻ ✕ vises straks (fast rad)`, !!btns && btns.length === 3, JSON.stringify(btns && btns.map((x) => x.k)));
      ok(`${tag}: knappene er minst 48 px`, !!btns && btns.every((x) => x.w >= 47.5 && x.h >= 47.5));
      const tray = await t.box('#bld .tray'), H = vp.height; ok(`${tag}: raden ligger over delebrettet og på skjermen`, !!btns && btns.every((x) => x.b <= tray.y + 1 && x.t >= 0 && x.r <= vp.width), JSON.stringify(btns && btns[0]));
      if (!slow && vn === 'stående' && lvl === 'vippe') await t.sh(`${lvl}_${vn}_valgt`);
      let e0 = await t.exp(); const rr = btns.find((x) => x.k === 'rotr'), rl = btns.find((x) => x.k === 'rotl'), dl = btns.find((x) => x.k === 'del');
      await t.tap(rr.x, rr.y, 20); let e1 = await t.exp(); ok(`${tag}: ↻ rett etter utsetting endrer delen`, e1 !== e0);
      await t.tap(rl.x, rl.y, 20); let e2 = await t.exp(); ok(`${tag}: ↺ endrer den tilbake`, e2 !== e1);
      ok(`${tag}: delen er fortsatt valgt etter vridning`, (await t.selBtns())?.length === 3 && (await pg.evaluate(() => !!window.__game.bld.touch.sel)));
      // ⚑ rett etter vridning
      const fl = await t.box('#qbtn'); ok(`${tag}: ⚑ finnes og er på skjermen`, !!fl && fl.r <= vp.width && fl.b <= vp.height);
      const fz = await pg.evaluate(() => { const e = document.getElementById('qbtn'), r = e.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2, top = document.elementFromPoint(x, y); return top === e || e.contains(top); }); ok(`${tag}: ⚑ ligger øverst (ikke dekket)`, fz);
      await t.tap(fl.x + fl.w / 2, fl.y + fl.h / 2, 20); await pg.waitForTimeout(500); ok(`${tag}: ⚑ åpner panelet rett etter vridning`, await t.flagOpen()); if (!slow && lvl === 'vippe' && vn === 'liggende') await t.sh(`${lvl}_${vn}_flagg`);
      await t.tap(fl.x + fl.w / 2, fl.y + fl.h / 2, 20); await pg.waitForTimeout(500); ok(`${tag}: ⚑ lukker panelet`, !(await t.flagOpen()));
      // trykk på tom flate, så delen igjen
      await t.tap(vp.width / 2, vp.height * 0.3); ok(`${tag}: tom flate fjerner valget`, !(await t.selBtns()));
      const pp = await t.sp(drop[0], drop[1]); await pg.waitForTimeout(450); await t.tap(pp.x, pp.y); ok(`${tag}: trykk på delen velger den igjen`, (await t.selBtns())?.length === 3);
      // hold stille 600 ms
      await t.tap(pp.x, pp.y, 600); ok(`${tag}: hold stille 600 ms henger ikke`, (await t.hang()) === '|cap0', await t.hang());
      // avbrutt berøring midt i et dra av delen
      const before = (await t.st()).builds[0].placed, e3 = await t.exp(); await t.drag(pp.x, pp.y, pp.x + 60, pp.y - 40, false); await t.cancel(); await pg.waitForTimeout(100); await t.run(2);
      ok(`${tag}: touchCancel midt i dra nullstiller alt`, (await t.hang()) === '|cap0', await t.hang()); ok(`${tag}: avbrutt dra flytter ikke delen`, (await t.exp()) === e3 && (await t.st()).builds[0].placed === before);
      // avbrutt dra fra delebrettet: ingen del settes ut
      await pg.waitForTimeout(450); await t.tap(pp.x, pp.y); const c2 = await t.chip(part === 'k1' ? 'k2' : 'v2').catch(() => null);
      if (c2) { const p2 = await t.sp(drop[0] + 2, drop[1]); await t.drag(c2.x, c2.y, p2.x, p2.y, false); await t.cancel(); await pg.waitForTimeout(100); await t.run(2); ok(`${tag}: avbrutt dra fra delebrettet setter ikke ut noe`, (await t.st()).builds[0].placed === before && (await t.hang()) === '|cap0', await t.hang()); }
      // to raske berøringer
      await t.two({ x: vp.width / 2, y: vp.height * 0.3 }, { x: vp.width / 2 + 50, y: vp.height * 0.3 + 30 }); await t.run(2); ok(`${tag}: to raske berøringer henger ikke`, (await t.hang()) === '|cap0', await t.hang());
      // verktøyraden virker fortsatt: velg delen, ✕ fjerner den
      await pg.waitForTimeout(450); await t.tap(pp.x, pp.y); btns = await t.selBtns(); if (btns) { const d2 = btns.find((x) => x.k === 'del'); await t.tap(d2.x, d2.y, 20); ok(`${tag}: ✕ fjerner delen`, (await t.st()).builds[0].placed === before - 1); }
      ok(`${tag}: ⚑-trykk avbryter et pågående dra`, await (async () => { const c3 = await t.chip(part); const p3 = await t.sp(drop[0], drop[1]); await t.drag(c3.x, c3.y, p3.x, p3.y, false); const f2 = await t.box('#qbtn'); await pg.evaluate(() => document.getElementById('qbtn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 77 }))); const h = await t.hang(); await t.cancel(); if (await t.flagOpen()) await pg.evaluate(() => document.getElementById('qbtn').click()); return h === '|cap0'; })());
    });
  }
  // --- 2) tekstoverlapp i tre formater (Vippe 3/8 i Byggeskolen, Vippe klassisk, Trapp, Hyllebroen)
  for (const [vn, vp] of VPS) for (const [lvl, site, labGo] of [['bygglab', 'lab1', 2], ['vippe', 'vippe1', 0], ['trapp', 'trapp1', 0], ['bro', 'bro1', 0]]) {
    if (ONLY && ONLY !== 'text') continue; console.log('... ', lvl, vn);
    await session(lvl, vp, async (t, pg) => {
      const tag = `tekst ${lvl}/${site}${labGo ? ' (Vippe 3/8)' : ''} ${vn}`;
      await t.open(site); if (labGo) await pg.evaluate((n) => { for (let i = 0; i < n; i++) window.__game.bld.lab.go(1); window.__game.tick(6, 1 / 60); }, labGo); await t.run(12);
      let bx = await t.texts(); let o = overl(bx); ok(`${tag}: ingen overlapp (tom)`, o.length === 0, o.join('; ') + ' | ' + bx.map((x) => x.k).join(','));
      const ht = await pg.evaluate(() => document.querySelector('#bld .hint')?.textContent || ''); ok(`${tag}: ingen MODUS-hint i det nye skallet`, !/MODUS/.test(ht), ht);
      if (lvl !== 'bro') { const pm = lvl === 'bygglab' ? null : (lvl === 'trapp' ? ['k1', 0, 0.75] : ['v1', 0, 1.25]); if (pm) { const c = await t.chip(pm[0]), p = await t.sp(pm[1], pm[2]); await t.drag(c.x, c.y, p.x, p.y); await t.run(6); bx = await t.texts(); o = overl(bx); ok(`${tag}: ingen overlapp (del valgt)`, o.length === 0, o.join('; ')); } }
      await t.sh(`tekst_${lvl}_${vp.width}x${vp.height}`);
    });
  }
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); srv.close(); console.log(bad ? `${bad} FEIL` : 'alt ok'); process.exit(bad ? 1 : 0);
})();
