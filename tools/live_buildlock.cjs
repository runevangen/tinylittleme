// R111: låste byggesteder i det nye skallet (iPhone 14, stående og liggende). Åtte Byggeskole-steder låst (standardinnstillinger, tom lagring) og åpnet (gridstage/gridlock av),
// Hyllebroen (åpen), Kjøkkenbroen (låst av Hyllebroen) og Trapp: ingen gamle knapper synlige (MODUS/RUTENETT, KODE-rad, Figur/Ball/Bil/Robot, rotér/SNAP/FJERN, ⌂ MENY/NULLSTILL i topprad).
// Låst Fagverk: kort, GÅ TIL VIPPE hopper til Vippe, ingen PRØV, berøring av byggeflaten gjør ingenting; låsen forsvinner uten omstart når Vippe er bestått. Bilder i <utmappe>.
// node tools/live_buildlock.cjs <utmappe> [port]  (playwright via NODE_PATH). Exit 1 ved feil. Ingen GPU (swiftshader): ingen FPS-krav; ekte følelse «testes på iPhone».
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true }); await new Promise((o) => srv.listen(+process.argv[3] || 0, o)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); let bad = 0; const errs = [];
  const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, c ? '' : d); if (!c) bad++; };
  const VPS = [['stående', { width: 390, height: 844 }], ['liggende', { width: 844, height: 390 }]];
  // gamle knapper: alt som hører til den gamle byggeskjermen og er synlig (eget display, ingen skjult forelder, størrelse > 0)
  const OLD = '#bld .bt.top button,#bld .bt.bot button,#bld .tools button,#bld .share button,#bld .zoom button,#bld .lab button,#bld .loads button,#bld [data-a="mode"],#bld .gtools button,#bld .gsim button';
  const oldVisible = (pg) => pg.evaluate((sel) => { const vis = (e) => { for (let n = e; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden') return false; } const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }; return [...document.querySelectorAll(sel)].filter(vis).map((e) => (e.dataset.a || e.dataset.t || e.dataset.s || e.className || e.tagName) + ':' + e.textContent.trim().slice(0, 12)); }, OLD);
  async function session(level, vp, init, fn) {
    const ctx = await b.newContext({ ...devices['iPhone 14'], viewport: vp }), pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript((o) => { try { localStorage.clear(); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); } catch { /* ok */ } }, init);
    await pg.goto(`http://localhost:${port}/?level=${level}&start=0`); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 120000 });
    await fn(pg); await ctx.close();
  }
  const settle = async (pg) => { await pg.waitForTimeout(900); await pg.evaluate(() => window.__game.tick(20, 1 / 60)); await pg.waitForTimeout(250); };
  const shot = async (pg, n) => { await pg.screenshot({ path: `${out}/lock_${n}.png`, timeout: 60000 }); };
  const OPEN = { 'tlm.gridstage': 'false', 'tlm.gridlock': 'false', 'tlm.gridplaylock': 'false' };
  // 1) Byggeskolen: åtte steder, låst og åpnet, begge formater
  for (const [vn, vp] of VPS) for (const [mode, init] of [['låst', {}], ['åpnet', OPEN]]) {
    await session('bygglab', vp, init, async (pg) => {
      await pg.evaluate(() => window.__game.bld.open('lab1', { force: true })); await settle(pg);
      for (let i = 1; i <= 8; i++) {
        if (i > 1) { await pg.evaluate(() => window.__game.bld.lab.go(1)); await settle(pg); }
        const tag = `Byggeskole ${i}/8 ${mode} ${vn}`, o = await oldVisible(pg);
        ok(`${tag}: ingen gamle knapper`, o.length === 0, o.join(' '));
        const s = await pg.evaluate(() => { const R = document.querySelector('#bld'), g = window.__game.bld; const v = (sel) => [...R.querySelectorAll(sel)].some((e) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none'); return { id: g.siteId, lockCard: R.classList.contains('blkon'), card: v('.blkcard'), go: v('.blkgo button'), tryB: v('.bux [data-bx="try"],.cbx .try'), bux: R.classList.contains('bux'), cbx: R.classList.contains('cbx'), locked: g.stage.locked(g.siteId) }; });
        ok(`${tag}: nytt skall (kort, grid eller klassisk)`, s.lockCard || s.bux || s.cbx, JSON.stringify(s));
        if (s.lockCard) { ok(`${tag}: kort og GÅ TIL vises, ingen PRØV`, s.card && s.go && !s.tryB, JSON.stringify(s)); }
        if (mode === 'åpnet') ok(`${tag}: åpent sted har ikke låsekort`, !s.lockCard, JSON.stringify(s));
        if (i === 4 || i === 1) await shot(pg, `byggeskole${i}_${mode}_${vn}`);
        else if (i === 2 || i === 8) await shot(pg, `byggeskole${i}_${mode}_${vn}`);
      }
    });
  }
  // 2) Fagverk låst i detalj: tekst, knapper ≥ 48 px, innenfor skjermen, GÅ TIL, berøring gjør ingenting, ingen PRØV, låsen forsvinner uten omstart
  for (const [vn, vp] of VPS) await session('bygglab', vp, {}, async (pg) => {
    await pg.evaluate(() => { const b = window.__game.bld; b.open('lab1', { force: true }); b.lab.go(1); b.lab.go(1); b.lab.go(1); }); await settle(pg);
    const info = await pg.evaluate(() => { const R = document.querySelector('#bld'), W = innerWidth, H = innerHeight; const bx = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, r: r.right, b: r.bottom, w: r.width, h: r.height }; }; const vis = (e) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none';
      const btns = [...R.querySelectorAll('.blkx button')].filter(vis).filter((e) => !e.closest('.blksheet')).map((e) => ({ k: e.dataset.bl, ...bx(e) })); return { W, H, site: window.__game.bld.siteId, t: R.querySelector('.blkt').textContent, name: R.querySelector('.blkname').textContent, go: R.querySelector('[data-bl="go"]').textContent, card: bx(R.querySelector('.blkcard')), btns, state: window.__game.bld.state() }; });
    const tag = `Fagverk låst ${vn}`;
    ok(`${tag}: stedet er lab4`, info.site === 'lab4'); ok(`${tag}: kortet nevner stedet som mangler med nummer`, /Bestå Vippe \(3\/8\) først for å åpne Fagverk/.test(info.t), info.t); ok(`${tag}: topplinje «Fagverk 4/8 🔒»`, /Fagverk/.test(info.name) && /4\/8/.test(info.name), info.name);
    ok(`${tag}: stor knapp GÅ TIL VIPPE`, /GÅ TIL VIPPE/.test(info.go), info.go);
    ok(`${tag}: alle knapper ≥ 48 px og innenfor skjermen`, info.btns.every((x) => x.w >= 47.5 && x.h >= 47.5 && x.x >= 0 && x.r <= info.W + 0.5 && x.b <= info.H + 0.5), JSON.stringify(info.btns));
    const ov = (a, c) => a.x < c.r - 1 && c.x < a.r - 1 && a.y < c.b - 1 && c.y < a.b - 1; let hit = false; for (const x of info.btns) if (ov(info.card, x)) hit = true; ok(`${tag}: kortet overlapper ingen knapper`, !hit, JSON.stringify([info.card, info.btns]));
    ok(`${tag}: kortet innenfor skjermen`, info.card.x >= 0 && info.card.r <= info.W + 0.5 && info.card.y >= 0 && info.card.b <= info.H + 0.5, JSON.stringify(info.card));
    // berøring av byggeflaten: ingenting skjer
    const before = await pg.evaluate(() => window.__game.bld.exportText()); await pg.touchscreen.tap(info.W / 2, info.H * 0.3); await pg.touchscreen.tap(info.W / 2, info.H * 0.62); await settle(pg);
    ok(`${tag}: trykk på byggeflaten bygger ingenting`, (await pg.evaluate(() => window.__game.bld.exportText())) === before);
    ok(`${tag}: ingen PRØV mens låst`, (await pg.evaluate(() => window.__game.bld.try?.() ?? 'ingen')) !== true);
    await pg.locator('#bld [data-bl="next"]').tap(); await pg.waitForTimeout(200);
    ok(`${tag}: ▶ forklarer låsen (ingen hopp)`, (await pg.evaluate(() => window.__game.bld.siteId)) === 'lab4');
    await pg.locator('#bld [data-bl="more"]').tap(); await pg.waitForTimeout(200); await shot(pg, `fagverk_meny_${vn}`); await pg.locator('#bld [data-bl="close"]').tap(); await pg.waitForTimeout(100);
    // låsen forsvinner uten omstart når Vippe er bestått
    await pg.evaluate(() => window.__game.bld.stage.markPassed('lab3')); await settle(pg);
    const after = await pg.evaluate(() => { const R = document.querySelector('#bld'); return { blk: R.classList.contains('blkon'), bux: R.classList.contains('bux'), grid: R.classList.contains('gridmode') }; });
    ok(`${tag}: låsen forsvinner uten omstart (vanlig skall)`, !after.blk && after.bux && after.grid, JSON.stringify(after)); ok(`${tag}: etter åpning ingen gamle knapper`, (await oldVisible(pg)).length === 0, (await oldVisible(pg)).join(' ')); await shot(pg, `fagverk_aapnet_${vn}`);
  });
  // 3) GÅ TIL VIPPE hopper til Vippe
  await session('bygglab', VPS[0][1], {}, async (pg) => {
    await pg.evaluate(() => { const b = window.__game.bld; b.open('lab1', { force: true }); b.lab.go(1); b.lab.go(1); b.lab.go(1); }); await settle(pg);
    await pg.locator('#bld [data-bl="go"]').tap(); await settle(pg);
    ok('GÅ TIL VIPPE: hopper til sted 3 (Vippe)', (await pg.evaluate(() => window.__game.bld.siteId)) === 'lab3');
    await pg.locator('#bld [data-bl="more"]').count();
  });
  // 4) Vanlige brett: Hyllebroen (åpen), Kjøkkenbroen (låst av Hyllebroen), Trapp
  for (const [vn, vp] of VPS) for (const [level, site, mode, init] of [['bro', 'bro1', 'åpen', {}], ['kjokkenbro', 'kjokken1', 'låst', {}], ['kjokkenbro', 'kjokken1', 'åpnet', OPEN], ['trapp', 'trapp1', 'åpen', {}]]) {
    await session(level, vp, init, async (pg) => {
      await pg.evaluate((s) => window.__game.bld.open(s, { force: true }), site); await settle(pg);
      const tag = `${level}/${site} ${mode} ${vn}`, o = await oldVisible(pg), s = await pg.evaluate(() => { const R = document.querySelector('#bld'); return { blk: R.classList.contains('blkon'), bux: R.classList.contains('bux'), cbx: R.classList.contains('cbx') }; });
      ok(`${tag}: ingen gamle knapper`, o.length === 0, o.join(' ')); ok(`${tag}: nytt skall`, s.blk || s.bux || s.cbx, JSON.stringify(s));
      if (mode === 'låst') { ok(`${tag}: låsekort`, s.blk); const t = await pg.locator('#bld .blkt').textContent(), g = await pg.locator('#bld [data-bl="go"]').textContent(); ok(`${tag}: kort og GÅ TIL HYLLEBROEN`, /Bestå Hyllebroen først/.test(t) && /GÅ TIL HYLLEBROEN/.test(g), t + '|' + g); }
      if (mode !== 'åpen' || level === 'trapp' || level === 'bro') await shot(pg, `${level}_${mode}_${vn}`);
    });
  }
  // 5) Byggeskjerm av: gammel skjerm uendret (låst Fagverk)
  await session('bygglab', VPS[0][1], { 'tlm.buildux': 'false' }, async (pg) => {
    await pg.evaluate(() => { const b = window.__game.bld; b.open('lab1', { force: true }); b.lab.go(1); b.lab.go(1); b.lab.go(1); }); await settle(pg);
    const o = await oldVisible(pg), blk = await pg.evaluate(() => document.querySelector('#bld').classList.contains('blkon')); ok('Byggeskjerm av: gammel skjerm uendret og ingen låsekort', o.length > 3 && !blk, o.join(' ') + blk);
  });
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | ')); console.log(bad ? `${bad} FEIL` : 'alt ok'); await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
