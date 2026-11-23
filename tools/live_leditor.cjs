// R152: LAG BRETT FRA BILDER i nettleser (Playwright, iPhone 14, falsk tolkningstjeneste): bilder → spørsmål → forslag → juster → lagre → spill.
// Kjør: NODE_PATH=$(npm root -g) node tools/live_leditor.cjs [skjermbildemappe]
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = process.argv[2] || '/tmp';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
  if (!p.startsWith(root) || !fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(p).pipe(r); });
(async () => {
  await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await (await b.newContext({ ...devices['iPhone 14'] })).newPage(); const errs = [], calls = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  const scene = JSON.parse(fs.readFileSync(path.join(root, 'scenes/bad.scene.json'), 'utf8'));
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };
  await pg.route('**/functions/v1/tolk-bilder', async (rt) => {
    if (rt.request().method() === 'OPTIONS') return rt.fulfill({ status: 204, headers: cors });
    const body = JSON.parse(rt.request().postData()); calls.push(`tolk:${body.images.length} bilder, mål ${body.answers.goal}, ${body.answers.difficulty}, tema «${body.answers.theme}», fiender ${body.answers.foes}, kode ${body.code}`);
    await new Promise((ok) => setTimeout(ok, 1500));
    return rt.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ ok: true, scene, warnings: [], check: { ran: false }, usage: { cost_usd: 0.0452, ms: 31000 }, left: { month: 150, code: 9 } }) });
  });
  await pg.route('**/rest/v1/rpc/**', async (rt) => { const n = rt.request().url().split('/').pop(); calls.push(n); return rt.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ ok: true, code: n === 'tlm_share_room' ? JSON.parse(rt.request().postData()).rc : undefined }) }); });
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.bygging.moved', 'true'); localStorage.setItem('tlm.cleared', JSON.stringify({ 1: 100 })); localStorage.setItem('tlm.tcode', JSON.stringify('rune')); } catch {} });
  await pg.goto(`http://localhost:${port}/`); await pg.waitForSelector('#mLevels', { timeout: 120000 });
  await pg.click('#mLevels', { noWaitAfter: true, timeout: 90000 }); await pg.waitForSelector('#mLed'); await pg.screenshot({ path: `${out}/led_picker.png` });
  await pg.click('#mLed', { noWaitAfter: true, timeout: 90000 }); await pg.waitForSelector('#ledGo'); await pg.screenshot({ path: `${out}/led_guide.png` });
  await pg.click('#ledGo', { noWaitAfter: true }); await pg.waitForSelector('#ledFileSel', { state: 'attached' });
  // tre syntetiske bilder (store, så nedskaleringen kjøres)
  const jpg = async (w, h, c) => Buffer.from((await pg.evaluate(([w, h, c]) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.fillStyle = c; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(w / 4, h / 4, w / 2, h / 2); return cv.toDataURL('image/jpeg', 0.9).split(',')[1]; }, [w, h, c])), 'base64');
  const files = [await jpg(3000, 2000, '#775544'), await jpg(2000, 3000, '#446677'), await jpg(2400, 1800, '#667744')].map((buffer, i) => ({ name: `p${i}.jpg`, mimeType: 'image/jpeg', buffer }));
  await pg.setInputFiles('#ledFileSel', files.slice(0, 1)); await pg.waitForFunction(() => document.querySelectorAll('#ledTh img').length === 1);
  await pg.click('#ledNext', { noWaitAfter: true }); await pg.waitForFunction(() => /Ta minst 2/.test(document.getElementById('ledMsg').textContent));   // minst 2
  await pg.setInputFiles('#ledFileSel', files.slice(1)); await pg.waitForFunction(() => document.querySelectorAll('#ledTh img').length === 3, null, { timeout: 60000 });
  const dims = await pg.evaluate(() => [...document.querySelectorAll('#ledTh img')].map((i) => `${i.naturalWidth}x${i.naturalHeight}`)); console.log('nedskalert', dims.join(' '));
  await pg.screenshot({ path: `${out}/led_photos.png` });
  await pg.click('#ledNext', { noWaitAfter: true }); await pg.waitForSelector('#ledMake'); await pg.click('.ledrow[data-k="goal"] button[data-v="out"]'); await pg.click('.ledrow[data-k="difficulty"] button[data-v="easy"]'); await pg.click('.ledrow[data-k="theme"] button[data-v="jungel"]'); await pg.click('.ledrow[data-k="foes"] button[data-v="false"]');
  await pg.screenshot({ path: `${out}/led_questions.png`, fullPage: true });
  await pg.click('#ledMake', { noWaitAfter: true }); await pg.waitForSelector('#ledCancel'); await pg.screenshot({ path: `${out}/led_working.png` });
  await pg.waitForSelector('#ledPlay', { timeout: 60000 }); await pg.screenshot({ path: `${out}/led_result.png`, fullPage: true });
  console.log('verdikt', await pg.textContent('#ledVerdict'));
  await pg.click('#ledAdj', { noWaitAfter: true }); await pg.waitForSelector('#ledMap'); await pg.evaluate(() => { document.getElementById('start').scrollTop = 0; }); console.log('layout', JSON.stringify(await pg.evaluate(() => [...document.getElementById('start').children].map((e) => `${e.tagName}${e.id ? '#' + e.id : ''}:${Math.round(e.getBoundingClientRect().top)}-${Math.round(e.getBoundingClientRect().bottom)}`)))); await pg.screenshot({ path: `${out}/led_adjust_top.png` }); const box = await pg.locator('#ledMap').boundingBox();
  await pg.mouse.click(box.x + box.width * (177 / 265), box.y + box.height * (162 / 250)); await pg.waitForFunction(() => /Valgt/.test(document.getElementById('ledSel').textContent)); console.log(await pg.textContent('#ledSel'));
  await pg.click('[data-d="0,1"]', { noWaitAfter: true }); await pg.waitForTimeout(300); await pg.screenshot({ path: `${out}/led_adjust.png`, fullPage: true });
  await pg.click('#ledUndo', { noWaitAfter: true }); await pg.click('#ledDone', { noWaitAfter: true }); await pg.waitForSelector('#ledPlay');
  await pg.click('#ledShare', { noWaitAfter: true }); await pg.waitForFunction(() => /Delt\. Koden er RM-/.test(document.getElementById('ledMsg').textContent), null, { timeout: 30000 }); console.log(await pg.textContent('#ledMsg'));
  const saved = await pg.evaluate(() => ({ list: JSON.parse(localStorage.getItem('tlm.rooms')), keys: Object.keys(localStorage).filter((k) => /img|photo|jpeg|base64/i.test(k + localStorage.getItem(k).slice(0, 40))) })); console.log('lagret', saved.list.length, saved.list[0].name, saved.list[0].code, 'bildenøkler', saved.keys.length);
  await pg.screenshot({ path: `${out}/led_shared.png`, fullPage: true });
  await pg.click('#ledPlay', { noWaitAfter: true }); await pg.waitForFunction(() => window.__game && window.__game.LEVEL && location.search.includes('mine-'), null, { timeout: 120000 });
  console.log('spiller', await pg.evaluate(() => location.search + ' · ' + window.__game.LEVEL.name)); await pg.waitForTimeout(3000); await pg.screenshot({ path: `${out}/led_play.png` });
  const ev = await pg.evaluate(() => JSON.parse(localStorage.getItem('tlm.evlog') || '[]').filter((e) => /leveleditor/.test(JSON.stringify(e))).map((e) => JSON.stringify(e).slice(0, 160)));
  console.log('kall', calls.join(' | ')); console.log('logg', ev.join('\n      '));
  console.log(errs.length ? 'FEIL: ' + errs.slice(0, 3).join(' | ') : 'ingen konsollfeil'); await b.close(); srv.close(); process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
