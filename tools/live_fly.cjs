// R174: FLY-knappen i egne brett (iPhone 14): synlig i eget brett, ikke i vanlige brett; trykk slår på flymodus og trykk igjen lander.
// Kjør: NODE_PATH=$(npm root -g) node tools/live_fly.cjs [skjermbildemappe]   (trenger /tmp/room_fixture.json, se tools/live_leditor_resume.cjs)
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = process.argv[2] || '/tmp';
const fx = JSON.parse(fs.readFileSync(process.env.ROOM_FIXTURE || '/tmp/room_fixture.json', 'utf8'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
  if (!p.startsWith(root) || !fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(p).pipe(r); });
(async () => {
  await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await (await b.newContext({ ...devices['iPhone 14'] })).newPage(); const errs = []; let ok = true;
  const check = (n, c, d) => { console.log((c ? '✓ ' : '✗ ') + n + (d ? ' · ' + d : '')); if (!c) ok = false; };
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && !/Failed to load resource|net::/.test(m.text()) && errs.push(m.text()));
  await pg.addInitScript(([fx]) => { try { localStorage.setItem('tlm.bygging.moved', 'true'); localStorage.setItem('tlm.cleared', JSON.stringify({ 1: 100 })); localStorage.setItem('tlm.tcode', JSON.stringify('rune'));
    localStorage.setItem('tlm.rooms', JSON.stringify([{ id: 'mine-abc123', name: 'Stuen', code: '', mine: true, at: 1 }])); localStorage.setItem('tlm.room.mine-abc123', JSON.stringify(fx.level));
    localStorage.setItem('tlm.roomscene.mine-abc123', JSON.stringify(fx.scene)); localStorage.setItem('tlm.led.last', JSON.stringify('mine-abc123')); } catch (e) { /* */ } }, [fx]);
  // 1) vanlig brett: ingen FLY-knapp
  await pg.goto(`http://localhost:${port}/?level=bad&start=0`); await pg.waitForSelector('#btnFly', { state: 'attached', timeout: 180000 }); await pg.waitForTimeout(2500);
  check('vanlig brett: FLY-knappen er skjult', !(await pg.locator('#btnFly').isVisible()));
  // 2) eget brett: FLY-knappen er synlig, trykk slår på, trykk igjen lander
  await pg.goto(`http://localhost:${port}/?level=mine-abc123&fresh=1`); await pg.waitForSelector('#btnFly', { state: 'attached', timeout: 180000 }); await pg.waitForTimeout(4000);
  check('eget brett: FLY-knappen er synlig', await pg.locator('#btnFly').isVisible()); await pg.screenshot({ path: `${out}/fly_button.png` });
  check('eget brett: NAVN-knappen er synlig', await pg.locator('#btnTags').isVisible());
  await pg.dispatchEvent('#btnFly', 'pointerdown'); await pg.waitForTimeout(400); check('trykk slår på flymodus', await pg.evaluate(() => document.getElementById('btnFly').classList.contains('on')));
  await pg.waitForTimeout(800); const tags = await pg.evaluate(() => [...document.querySelectorAll('#tags span')].filter((e) => e.style.display === 'block').map((e) => e.textContent));
  check('navnelapper vises i flymodus (norske navn)', tags.length > 0 && tags.every((t) => t.length > 0 && !/^[a-z]+_[a-z_]+$/.test(t)), tags.slice(0, 8).join(', '));
  await pg.screenshot({ path: `${out}/fly_on.png` });
  await pg.dispatchEvent('#btnTags', 'pointerdown'); await pg.waitForTimeout(400); const off = await pg.evaluate(() => [...document.querySelectorAll('#tags span')].filter((e) => e.style.display === 'block').length); check('NAVN slår lappene av', off === 0, `${off} synlige`);
  await pg.dispatchEvent('#btnTags', 'pointerdown'); await pg.waitForTimeout(500); const on2 = await pg.evaluate(() => [...document.querySelectorAll('#tags span')].filter((e) => e.style.display === 'block').length); check('NAVN slår lappene på igjen', on2 > 0, `${on2} synlige`);
  // R176: tydelig LAND-knapp og lapp mens du flyr
  check('mens du flyr heter knappen LAND', (await pg.textContent('#btnFly')).trim() === 'LAND'); check('lapp sier hvordan du kommer ut', await pg.locator('#flyHint').isVisible(), (await pg.textContent('#flyHint')).trim());
  // R177: LISTE over ting; trykk markerer tingen i rommet
  check('LISTE-knappen er synlig', await pg.locator('#btnList').isVisible()); await pg.dispatchEvent('#btnList', 'pointerdown'); await pg.waitForTimeout(300);
  const nList = await pg.locator('#thingListBody button').count(); check('listen viser tingene med navn og avstand', nList > 0 && (await pg.locator('#thingListBody button').first().textContent()).includes(' m'), `${nList} ting · ${(await pg.locator('#thingListBody button').first().textContent()).trim()}`);
  await pg.screenshot({ path: `${out}/fly_list.png` });
  const firstName = (await pg.locator('#thingListBody button span').first().textContent()).trim(); await pg.locator('#thingListBody button').first().click(); await pg.waitForTimeout(1800);   // kameraet dreies mot tingen
  check('listen lukkes når du trykker en ting', !(await pg.locator('#thingList').isVisible())); const hi = await pg.evaluate(() => [...document.querySelectorAll('#tags span.hi')].filter((e) => e.style.display === 'block').map((e) => e.textContent));
  check('tingen markeres i rommet (uthevet lapp)', hi.includes(firstName), `${firstName} → ${hi.join(', ')}`); await pg.screenshot({ path: `${out}/fly_highlight.png` });
  await pg.dispatchEvent('#btnFly', 'pointerdown'); await pg.waitForTimeout(400); check('trykk igjen lander', !(await pg.evaluate(() => document.getElementById('btnFly').classList.contains('on'))));
  check('etter landing heter knappen FLY og lappen er borte', (await pg.textContent('#btnFly')).trim() === 'FLY' && !(await pg.locator('#flyHint').isVisible()));
  console.log(errs.length ? 'FEIL: ' + errs.slice(0, 3).join(' | ') : 'ingen konsollfeil'); await b.close(); srv.close(); process.exit(errs.length || !ok ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
