// R167: editoren tilgjengelig igjen etter spilling (Playwright, iPhone 14): VELG BRETT har «juster siste brett», MINE BRETT har JUSTER, begge åpner editoren på det lagrede brettet.
// Kjør: NODE_PATH=$(npm root -g) node tools/live_leditor_resume.cjs [skjermbildemappe]
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = process.argv[2] || '/tmp';
const fx = JSON.parse(fs.readFileSync(process.env.ROOM_FIXTURE || '/tmp/room_fixture.json', 'utf8'));   // { level, scene } lages av node (se test_leditor)
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
  if (!p.startsWith(root) || !fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(p).pipe(r); });
(async () => {
  await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await (await b.newContext({ ...devices['iPhone 14'] })).newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && !/Failed to load resource|net::/.test(m.text()) && errs.push(m.text()));
  await pg.addInitScript(([fx]) => { try {
    localStorage.setItem('tlm.bygging.moved', 'true'); localStorage.setItem('tlm.cleared', JSON.stringify({ 1: 100 })); localStorage.setItem('tlm.tcode', JSON.stringify('rune'));
    localStorage.setItem('tlm.rooms', JSON.stringify([{ id: 'mine-abc123', name: 'Stuen', code: '', mine: true, at: 1 }])); localStorage.setItem('tlm.room.mine-abc123', JSON.stringify(fx.level));
    localStorage.setItem('tlm.roomscene.mine-abc123', JSON.stringify(fx.scene)); localStorage.setItem('tlm.led.last', JSON.stringify('mine-abc123')); localStorage.setItem('tlm.level', JSON.stringify('mine-abc123')); } catch (e) { /* */ } }, [fx]);
  await pg.goto(`http://localhost:${port}/`); await pg.waitForSelector('#mLevels', { timeout: 180000 });
  await pg.click('#mLevels', { noWaitAfter: true, timeout: 90000 }); await pg.waitForSelector('#mLedLast', { timeout: 30000 }); console.log('VELG BRETT:', (await pg.textContent('#mLedLast')).trim());
  await pg.screenshot({ path: `${out}/led_resume_picker.png` });
  await pg.click('#mLedLast', { noWaitAfter: true }); await pg.waitForSelector('#ledPlay', { timeout: 30000 }); console.log('editor åpnet på lagret brett:', (await pg.textContent('#start h1')).trim(), '·', (await pg.textContent('#ledVerdict')).trim());
  await pg.screenshot({ path: `${out}/led_resume_result.png`, fullPage: true });
  await pg.click('#ledInt', { noWaitAfter: true }); await pg.waitForSelector('#ledIntBack'); console.log('VIS TOLKNING:', await pg.evaluate(() => document.querySelectorAll('#start li').length), 'rader'); await pg.click('#ledIntBack', { noWaitAfter: true });
  await pg.click('#ledAdj', { noWaitAfter: true }); await pg.waitForSelector('#ledGoals [data-g]'); console.log('JUSTER: målforslag', await pg.evaluate(() => document.querySelectorAll('#ledGoals [data-g]').length));
  await pg.click('#ledBack, #ledDone', { noWaitAfter: true }).catch(() => {});
  // MINE BRETT har JUSTER på eget brett
  await pg.goto(`http://localhost:${port}/`); await pg.waitForSelector('#mLevels', { timeout: 180000 }); await pg.click('#mLevels', { noWaitAfter: true }); await pg.waitForSelector('#mRooms', { timeout: 30000 }); await pg.click('#mRooms', { noWaitAfter: true });
  await pg.waitForSelector('.rmcard [data-a="adjust"]', { timeout: 30000 }); console.log('MINE BRETT: JUSTER-knapp finnes'); await pg.screenshot({ path: `${out}/led_resume_rooms.png`, fullPage: true });
  await pg.click('.rmcard [data-a="adjust"]', { noWaitAfter: true }); await pg.waitForSelector('#ledPlay', { timeout: 30000 }); console.log('JUSTER fra MINE BRETT åpnet editoren');
  // i eget brett: menyen har JUSTER DETTE BRETTET
  await pg.goto(`http://localhost:${port}/`); await pg.waitForSelector('#mLevels', { timeout: 180000 }); await pg.waitForTimeout(1500);   // brettet står i tlm.level (som etter at du har spilt det), så menyen vises med det som aktivt brett
  const has = await pg.evaluate(() => !!document.getElementById('mLedThis')); console.log('menyen i eget brett har JUSTER DETTE BRETTET:', has); await pg.screenshot({ path: `${out}/led_resume_menu.png` });
  if (has) { await pg.click('#mLedThis', { noWaitAfter: true }); await pg.waitForSelector('#ledPlay', { timeout: 30000 }); console.log('JUSTER DETTE BRETTET åpnet editoren'); }
  console.log(errs.length ? 'FEIL: ' + errs.slice(0, 3).join(' | ') : 'ingen konsollfeil'); await b.close(); srv.close(); process.exit(errs.length || !has ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
