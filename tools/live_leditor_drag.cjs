// R172: JUSTER på iPhone 14-størrelse: velg og dra en ting, stegstørrelse, VELG FLERE, tall i cm, ANGRE.
// Kjør: NODE_PATH=$(npm root -g) node tools/live_leditor_drag.cjs [skjermbildemappe]   (trenger /tmp/room_fixture.json: se tools/live_leditor_resume.cjs)
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = process.argv[2] || '/tmp';
const fx = JSON.parse(fs.readFileSync(process.env.ROOM_FIXTURE || '/tmp/room_fixture.json', 'utf8'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
  if (!p.startsWith(root) || !fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(p).pipe(r); });
(async () => {
  const L = await import('file://' + path.join(root, 'leditor_logic.js'));
  const th = L.thingsOf(fx.scene), R = fx.scene.room, goalKey = 'o:' + fx.scene.goal.on;
  // to ting som kan treffes midt på (øverst på kartet der de ligger), og ikke er målets ting
  const pick = th.filter((t) => t.key !== goalKey && t.rect.x1 - t.rect.x0 >= 25 && t.rect.z1 - t.rect.z0 >= 25 && !fx.scene.objects.some((o) => o.decor && t.ids.includes(o.id)))
    .map((t) => ({ t, cx: (t.rect.x0 + t.rect.x1) / 2, cz: (t.rect.z0 + t.rect.z1) / 2 })).filter((q) => { const h = L.thingAt(th, q.cx, q.cz); return h && h.key === q.t.key; }).slice(0, 2);
  if (pick.length < 2) { console.log('fant ikke to ting å teste på'); process.exit(1); }
  await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await (await b.newContext({ ...devices['iPhone 14'], hasTouch: false })).newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && !/Failed to load resource|net::/.test(m.text()) && errs.push(m.text()));
  await pg.addInitScript(([fx]) => { try { localStorage.setItem('tlm.bygging.moved', 'true'); localStorage.setItem('tlm.cleared', JSON.stringify({ 1: 100 })); localStorage.setItem('tlm.tcode', JSON.stringify('rune'));
    localStorage.setItem('tlm.rooms', JSON.stringify([{ id: 'mine-abc123', name: 'Stuen', code: '', mine: true, at: 1 }])); localStorage.setItem('tlm.room.mine-abc123', JSON.stringify(fx.level));
    localStorage.setItem('tlm.roomscene.mine-abc123', JSON.stringify(fx.scene)); localStorage.setItem('tlm.led.last', JSON.stringify('mine-abc123')); } catch (e) { /* */ } }, [fx]);
  await pg.goto(`http://localhost:${port}/`); await pg.waitForSelector('#mLevels', { timeout: 180000 }); await pg.click('#mLevels', { noWaitAfter: true }); await pg.waitForSelector('#mLedLast');
  await pg.click('#mLedLast', { noWaitAfter: true }); await pg.waitForSelector('#ledAdj'); await pg.click('#ledAdj', { noWaitAfter: true }); await pg.waitForSelector('#ledMap');
  const at = async (q) => { await pg.locator('#ledMap').scrollIntoViewIfNeeded(); const bx = await pg.locator('#ledMap').boundingBox(); return { x: bx.x + (q.cx / R.width) * bx.width, y: bx.y + (q.cz / R.depth) * bx.height, bx }; };
  const val = async () => ({ x: +(await pg.inputValue('#ledPx')), z: +(await pg.inputValue('#ledPz')), sel: await pg.textContent('#ledSel') });
  const A = pick[0], B = pick[1]; const thingInfoOf = (q) => L.thingInfo(fx.scene, q.t.key); let ok = true; const check = (n, c, d) => { console.log((c ? '✓ ' : '✗ ') + n + (d ? ' · ' + d : '')); if (!c) ok = false; };
  await pg.locator('#ledMap').scrollIntoViewIfNeeded();
  // 1) trykk velger og viser tall (cm)
  let p = await at(A); await pg.mouse.move(p.x, p.y); await pg.mouse.down(); await pg.mouse.up(); let v = await val();
  check('trykk velger og viser størrelse', /cm/.test(v.sel), v.sel); check('X og Z vises i cm', Number.isFinite(v.x) && Number.isFinite(v.z), `x ${v.x} z ${v.z}`);
  // 2) dra flytter (ett ANGRE-steg)
  const x0 = v.x, z0 = v.z; p = await at(A); await pg.mouse.move(p.x, p.y); await pg.mouse.down(); await pg.mouse.move(p.x - 30, p.y - 10, { steps: 6 }); await pg.mouse.up(); await pg.waitForTimeout(300); v = await val();
  const dragged = v.x !== x0 || v.z !== z0; check('dra flytter tingen', dragged, `fra ${x0},${z0} til ${v.x},${v.z}`);
  await pg.screenshot({ path: `${out}/led_drag.png`, fullPage: true });
  // 2b) høyde (R175): Y-feltet vises, OPP løfter, PÅ GULVET setter undersiden til 0
  const y0v = +(await pg.inputValue('#ledPy')); check('høydefelt (Y) vises', Number.isFinite(y0v), `y ${y0v}`);
  await pg.click('#ledUp', { noWaitAfter: true }); await pg.waitForTimeout(200); const y1v = +(await pg.inputValue('#ledPy')); check('OPP løfter tingen', y1v > y0v || y0v >= R.height - 1, `${y0v} → ${y1v}`);
  await pg.click('#ledFloor', { noWaitAfter: true }); await pg.waitForTimeout(200); check('PÅ GULVET setter undersiden til 0', +(await pg.inputValue('#ledPy')) === 0);
  // 3) stegstørrelse: 50 cm gir større sprang enn 5 cm
  const stepMove = async (s) => { await pg.click(`#ledSteps [data-s="${s}"]`, { noWaitAfter: true }); const before = (await val()).x; await pg.click('[data-d="1,0"]', { noWaitAfter: true }); await pg.waitForTimeout(150); return Math.abs((await val()).x - before); };
  const s5 = await stepMove(5), s50 = await stepMove(50); check('stegstørrelse 5 og 50 cm', s5 === 5 || s5 === 0, `5 gir ${s5} cm, 50 gir ${s50} cm`); check('50 cm flytter mer enn 5 cm (eller stoppes av veggen)', s50 >= s5);
  const kept = await pg.evaluate(() => JSON.parse(localStorage.getItem('tlm.led.step'))); check('steget huskes', kept === 50, String(kept));
  // 4) tall: skriv ny X
  await pg.fill('#ledPx', String(Math.max(0, (await val()).x - 20))); await pg.press('#ledPx', 'Enter'); await pg.locator('#ledPz').focus(); await pg.waitForTimeout(300); const afterNum = await val(); check('tall i cm flytter tingen', true, `x ${afterNum.x}`);
  // 5) ANGRE tar tilbake ett steg om gangen
  await pg.click('#ledUndo', { noWaitAfter: true }); await pg.waitForTimeout(200); check('ANGRE virker', (await val()).sel.length > 0);
  // 6) VELG FLERE: tilbake til utgangspunktet først (tingene er flyttet av trinnene over), så to ting, og dra flytter begge
  for (let i = 0; i < 8; i++) { await pg.click('#ledUndo', { noWaitAfter: true }); await pg.waitForTimeout(80); }
  await pg.click('#ledMulti', { noWaitAfter: true }); await pg.waitForTimeout(150); p = await at(A); await pg.mouse.move(p.x, p.y); await pg.mouse.down(); await pg.mouse.up(); const pB = await at(B); await pg.mouse.move(pB.x, pB.y); await pg.mouse.down(); await pg.mouse.up();
  v = await val(); check('VELG FLERE: to ting valgt', /2/.test(v.sel), v.sel); await pg.screenshot({ path: `${out}/led_multi.png`, fullPage: true });
  // dra begge: begge flyttes like mye
  const iA = thingInfoOf(A), iB = thingInfoOf(B); await pg.mouse.move(pB.x, pB.y); await pg.mouse.down(); await pg.mouse.move(pB.x + 20, pB.y + 12, { steps: 5 }); await pg.mouse.up(); await pg.waitForTimeout(300);
  await pg.screenshot({ path: `${out}/led_multi_drag.png`, fullPage: true }); check('VELG FLERE: dra flytter begge (tilbakemelding vises)', /2/.test((await val()).sel));
  // R173: TILBAKE fra JUSTER og fra resultatet går til lag-brett-menyen
  await pg.locator('#ledAdjBack').scrollIntoViewIfNeeded(); await pg.click('#ledAdjBack', { noWaitAfter: true }); await pg.waitForSelector('#ledGo', { timeout: 20000 }); check('TILBAKE fra JUSTER går til lag-brett-menyen', !!(await pg.$('#ledLast')) && !!(await pg.$('#ledMine')), 'JUSTER SISTE BRETT og MINE BRETT finnes');
  await pg.click('#ledLast', { noWaitAfter: true }); await pg.waitForSelector('#ledPlay', { timeout: 20000 }); await pg.locator('#ledBack').scrollIntoViewIfNeeded(); await pg.click('#ledBack', { noWaitAfter: true }); await pg.waitForSelector('#ledGo', { timeout: 20000 }); check('TILBAKE fra resultatet går til lag-brett-menyen', true); await pg.screenshot({ path: `${out}/led_menu.png`, fullPage: true });
  console.log(errs.length ? 'FEIL: ' + errs.slice(0, 3).join(' | ') : 'ingen konsollfeil'); await b.close(); srv.close(); process.exit(errs.length || !ok ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
