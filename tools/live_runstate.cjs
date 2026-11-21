// R112: ingen rester av forrige prøve i noen overgang (iPhone 14, stående og liggende) + ett trykk = én rotasjon (ekte berøring via CDP).
// Bygg Vippe/Trapp, la en prøve feile, PRØV IGJEN, STOPP midt i en prøve, ◀ ▶ til annet sted og tilbake, snu telefonen, åpne ⋯ og tilbake, bestå og NESTE STED og tilbake.
// Etter hvert steg: (1) prøvetilstanden er ren (bld.runInfo().dirty tom når ingen prøve kjører), (2) ingen synlige halvt utfadede elementer (opacity 0..1) i #bld/#toast, (3) spøkelset tegnes ikke utenfor en kjørende prøve. Bilder i <utmappe>.
// node tools/live_runstate.cjs <utmappe> [port]  (playwright via NODE_PATH). Exit 1 ved feil. Ingen GPU (swiftshader): ingen FPS-krav; ekte følelse «testes på iPhone».
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
  for (const [nm, vp] of [['stående', { width: 390, height: 844 }], ['liggende', { width: 844, height: 390 }]]) {
    const ctx = await b.newContext({ ...devices['iPhone 14'], viewport: vp }), pg = await ctx.newPage(), cdp = await ctx.newCDPSession(pg);
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript(INIT); await pg.goto(`http://localhost:${port}/?level=bygglab`); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 120000 }); await pg.evaluate(() => window.__game.tick(30, 1 / 60));
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n), G = (f, a) => pg.evaluate(f, a);
    const tp = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : pts.map((p, i) => ({ x: p.x, y: p.y, id: i + 1 })) });
    const tap = async (x, y) => { await tp('touchStart', [{ x, y }]); await pg.waitForTimeout(40); await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); };
    const tapSel = async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await tap(r.x + r.width / 2, r.y + r.height / 2); };
    const faded = () => G(() => { const out = []; for (const e of document.querySelectorAll('#bld *, #toast')) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue; let o = 1; for (let n = e; n && n !== document.body; n = n.parentElement) { const c = getComputedStyle(n); o *= +c.opacity; if (c.display === 'none') { o = 0; break; } } const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; if (o > 0.02 && o < 0.98 && !/disabled|dis/.test(e.className + (e.disabled ? ' disabled' : ''))) out.push(e.tagName + '.' + String(e.className).slice(0, 30) + ':' + o.toFixed(2)); } return out.slice(0, 8); });
    const info = () => G(() => window.__game.bld.runInfo());
    const sh = async (n) => { await run(2); await pg.screenshot({ path: `${out}/run_${nm}_${n}.png`, timeout: 60000 }); };
    const fast = async () => { for (let i = 0; i < 300 && (await G(() => window.__game.bld.running)); i++) await G(() => window.__game.bld.update(1 / 20, true)); await run(3); return G(() => window.__game.bld.result); };
    const check = async (step, expectIdle = true) => { await pg.waitForTimeout(2200); await run(3); const i = await info(), f = await faded(); if (expectIdle) ok(`${nm}: ${step}: prøvetilstanden er ren`, i.dirty.length === 0 && !i.simSigned, JSON.stringify(i)); if (expectIdle) ok(`${nm}: ${step}: ingen halvt utfadede elementer`, f.length === 0, f.join(' ')); ok(`${nm}: ${step}: ingen spøkelse utenfor kjørende prøve`, !i.ghost || (i.sim && !i.done)); };
    // Vippe (lab3): referansebygg, så et ødelagt bygg (bare første del) som feiler
    await G(() => { const b = window.__game.bld; if (!b.siteId) b.open('lab1', { force: true }); for (let k = 0; k < 4 && b.siteId !== 'lab3'; k++) { b.lab.go(1); window.__game.tick(3, 1 / 60); } window.__game.tick(4, 1 / 60); b.placeRef('lab3'); window.__game.tick(3, 1 / 60); });
    await check('nytt sted', true);
    const full = await G(() => window.__game.bld.exportText());
    await G(() => window.__game.bld.startTry()); let r = await fast(); ok(`${nm}: første prøve (referansebygget) klarer det`, r && r.state === 'won', JSON.stringify(r && r.state));
    await G(() => window.__game.bld.stopTry()); await check('etter bestått + STOPP');
    // ødelagt bygg: bare første del, flyttet bort
    await G(() => { window.__game.bld.resetBuild(); window.__game.tick(3, 1 / 60); }); { const c = pg.locator('#bld .chip').first(); await c.scrollIntoViewIfNeeded(); const bb = await c.boundingBox(); await tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await run(4); }
    await G(() => window.__game.bld.startTry()); r = await fast(); ok(`${nm}: ødelagt bygg feiler`, r && r.state === 'lost', JSON.stringify(r && r.state)); await sh('1_feilet');
    let i = await info(); ok(`${nm}: resultat vises (ferdig prøve)`, i.done && !i.replaying);
    await check('rett etter «ikke bestått»', false);
    await tapSel('#bld .bnagain, #bld [data-bn="again"]').catch(() => {}); await run(3); await check('PRØV IGJEN');
    await G(() => window.__game.bld.startTry()); r = await fast(); i = await info(); ok(`${nm}: ny prøve (med forrige som mulig spøkelse)`, i.sim, JSON.stringify(i)); await G(() => window.__game.bld.stopTry()); await run(3);
    await check('STOPP');
    await G(() => window.__game.bld.startTry()); await G(() => { for (let k = 0; k < 6; k++) window.__game.bld.update(1 / 20, true); }); i = await info(); ok(`${nm}: midt i prøven er den kjørende og spøkelse kan vises`, i.sim && !i.done); await sh('2_midt'); await G(() => window.__game.bld.stopTry()); await check('STOPP midt i prøven');
    for (const k of ['next', 'prev']) { await G((k) => { window.__game.bld.lab.go(k === 'next' ? 1 : -1); window.__game.tick(4, 1 / 60); }, k); await check(`${k === 'next' ? '▶' : '◀'} annet sted`); }
    await G(() => window.__game.bld.startTry()); r = await fast(); await G(() => { window.__game.bld.lab.go(1); window.__game.tick(4, 1 / 60); }); await check('▶ rett etter en ferdig prøve'); await G(() => { window.__game.bld.lab.go(-1); window.__game.tick(4, 1 / 60); }); await check('◀ tilbake');
    await pg.setViewportSize({ width: vp.height, height: vp.width }); await run(3); await check('snudd telefon'); await pg.setViewportSize(vp); await run(3);
    await G(() => window.__game.bld.startTry()); r = await fast(); await tapSel('#bld .cxmore, #bld [data-cx="more"]').catch(() => {}); await run(3); await pg.waitForTimeout(300); await tapSel('#bld .cxmore, #bld [data-cx="more"]').catch(() => {}); await check('åpne ⋯ og tilbake', false); await G(() => window.__game.bld.stopTry());
    // bestått + NESTE STED
    await G((full) => { const b = window.__game.bld; b.importText(full); window.__game.tick(3, 1 / 60); b.startTry(); }, full); r = await fast(); await sh('3_bestatt');
    await G(() => { window.__game.bld.lab.go(1); window.__game.tick(4, 1 / 60); }); await check('NESTE STED etter bestått'); await G(() => { window.__game.bld.lab.go(-1); window.__game.tick(4, 1 / 60); }); await check('tilbake'); await sh('4_tilbake');
    // ett trykk = én rotasjon på 15 grader (ekte berøring), stående og liggende
    await G(() => { const b = window.__game.bld; b.resetBuild(); window.__game.tick(3, 1 / 60); });
    const chip = pg.locator('#bld .chip').first(); await chip.scrollIntoViewIfNeeded(); await chip.boundingBox().then((bb) => tap(bb.x + bb.width / 2, bb.y + bb.height / 2)); await run(4);
    const rot = () => G(() => { const s = window.__game.bld.state(), c = s.builds.find((x) => x.id === s.active); return c && c.parts.length ? c.parts[0].rot : null; });
    const r0 = await rot(); ok(`${nm}: del satt ut med trykk`, r0 !== null);
    if (r0 !== null) { await tapSel('#bld .cxsel [data-cx="rotr"]'); await pg.waitForTimeout(400); await run(3); const r1 = await rot(), d = Math.abs(((r1 - r0) * 180 / Math.PI + 540) % 360 - 180); ok(`${nm}: ett trykk på ↻ = 15 grader`, Math.abs(d - 15) < 0.5, `${d.toFixed(2)} grader`); await tapSel('#bld .cxsel [data-cx="rotl"]'); await pg.waitForTimeout(400); await run(3); const r2 = await rot(); ok(`${nm}: ett trykk på ↺ tilbake`, Math.abs(((r2 - r0) * 180 / Math.PI + 540) % 360 - 180) < 0.5 || Math.abs(r2 - r0) < 1e-6); }
    await ctx.close();
  }
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | ')); await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
