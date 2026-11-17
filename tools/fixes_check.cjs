// R80: hele Rettelser-flyten i nettleser (Playwright, iPhone 14) mot en falsk server: meny med tall, GÅ DIT (riktig brett og sted), avkryssing (riktig RPC).
// Kjør: NODE_PATH=$(npm root -g) node tools/fixes_check.cjs [mappe for bilder]. Exit 1 ved feil.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.resolve(__dirname, '..'), shots = process.argv[2] || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
  if (!p.startsWith(root) || !fs.existsSync(p)) { r.writeHead(404); r.end('mangler'); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(p).pipe(r);
});
const vk = JSON.parse(fs.readFileSync(path.join(root, 'levels/verksted.level.json'), 'utf8')), pl = vk.gates.plates[0];
const spot = { x: +((pl.x0 + pl.x1) / 2).toFixed(2), y: pl.y, z: +((pl.z0 + pl.z1) / 2).toFixed(2) };
const rows = [
  { id: 'r-plate', at: '2026-05-02T10:00:00Z', version: '2.27', message: 'Rettet: trykkplata er flush med gulvet i Verkstedet', read: true, level: 'verksted', spot, check: null, note: '' },
  { id: 'r-old', at: '2026-04-20T10:00:00Z', version: '2.20', message: 'Rettet: veiledningen for rutenett-bygging', read: true, level: 'bygglab', spot: null, check: null, note: '' },
  { id: 'r-done', at: '2026-04-10T10:00:00Z', version: '2.10', message: 'Rettet: eksempelbroen', read: true, level: 'bro', spot: null, check: 'ok', note: '' },
  { id: 'r-new', at: '2026-05-03T10:00:00Z', version: '9.99', message: 'Rettet: noe som ikke er utlagt her ennå', read: true, level: 'bad', spot: null, check: null, note: '' },
];
(async () => {
  await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port, base = `http://localhost:${port}`;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] }), calls = [], errs = [];
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('tlm.tcode')) localStorage.setItem('tlm.tcode', JSON.stringify('rune')); } catch { /* */ } });
  await ctx.route('**/rest/v1/rpc/**', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop(), body = JSON.parse(route.request().postData() || '{}'); calls.push({ name, body });
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, apikey, content-type' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (name === 'tlm_my_inbox') return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ ok: true, me: { sent: 4, fixed: 3, working: 0 }, all: { sent: 4, fixed: 3, testers: 1 }, replies: rows.map((r) => ({ ...r })) }) });
    if (name === 'tlm_check_reply') { const r = rows.find((x) => x.id === body.rid); if (r) { r.check = body.res; r.note = body.note || ''; } return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ ok: true }) }); }
    return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: '{}' });
  });
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 250))); pg.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errs.push('console: ' + m.text().slice(0, 250)));
  const shot = async (n) => { if (shots) await pg.screenshot({ path: path.join(shots, n + '.png') }); };
  await pg.goto(base + '/'); await pg.waitForSelector('#mFix', { timeout: 120000 });
  await pg.waitForFunction(() => /· 3/.test(document.getElementById('mFix').textContent), null, { timeout: 60000 }).catch(async (e) => { console.error('dbg:', JSON.stringify(await pg.evaluate(async () => { try { const m = await import('./feedback_send.js'); const r = await m.fetchInbox('rune'); return r ? r.replies.map((x) => x.check) : 'null'; } catch (e) { return 'ERR ' + e.message; } })), 'knapp:', await pg.textContent('#mFix'), 'kall:', JSON.stringify(calls), 'feil:', errs.join('|')); throw e; });
  assert.equal((await pg.textContent('#mFix')).trim(), 'RETTELSER · 3', 'tallet = ikke avkrysset'); await shot('1_meny');
  await pg.click('#mFix'); await pg.waitForSelector('[data-fx]'); await pg.waitForTimeout(400);
  const order = await pg.$$eval('[data-fx]', (els) => els.map((e) => e.dataset.fx)); assert.deepEqual(order, ['r-new', 'r-plate', 'r-old', 'r-done'], 'nyeste først');
  assert.ok(await pg.$('[data-upd="r-new"]'), 'nyere versjon: OPPDATER'); assert.ok(!(await pg.$('[data-go="r-new"]'))); assert.ok(await pg.$('[data-go="r-plate"]'), 'GÅ DIT på v2.27-rettelsen');
  await shot('2_liste'); await pg.locator('[data-fx="r-plate"]').scrollIntoViewIfNeeded(); await shot('3_rettelse');
  // ✗ med tekst
  await pg.click('[data-no="r-old"]'); await pg.fill('[data-fx="r-old"] [data-note]', 'plata gjør ingenting'); await shot('4_virker_ikke'); await pg.click('[data-send="r-old"]'); await pg.waitForTimeout(300);
  const c1 = calls.filter((c) => c.name === 'tlm_check_reply').pop(); assert.deepEqual(c1.body, { c: 'rune', rid: 'r-old', res: 'fail', note: 'plata gjør ingenting' });
  assert.ok(await pg.$('[data-fx="r-old"].fail'), 'viser ✗');
  // ✓
  await pg.click('[data-ok="r-plate"]'); await pg.waitForTimeout(300);
  const c2 = calls.filter((c) => c.name === 'tlm_check_reply').pop(); assert.deepEqual(c2.body, { c: 'rune', rid: 'r-plate', res: 'ok', note: '' }); assert.ok(await pg.$('[data-fx="r-plate"].ok'));
  await shot('5_avkrysset');
  // endre ✗ til ✓ er mulig
  await pg.click('[data-ok="r-old"]'); await pg.waitForTimeout(300); assert.ok(await pg.$('[data-fx="r-old"].ok'), 'kan endres fra ✗ til ✓');
  // tilbake: tallet går ned (1 igjen: r-new)
  await pg.click('#fxBack'); await pg.waitForSelector('#mFix'); assert.equal((await pg.textContent('#mFix')).trim(), 'RETTELSER · 1', 'tallet gikk ned');
  // GÅ DIT: sett r-plate tilbake til ikke sjekket først er unødvendig; gå dit
  await pg.click('#mFix'); await pg.waitForSelector('[data-go="r-plate"]');
  await Promise.all([pg.waitForNavigation({ timeout: 60000 }), pg.click('[data-go="r-plate"]')]);
  assert.ok(/level=verksted/.test(pg.url()) && /go=/.test(pg.url()), 'URL: ' + pg.url());
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL && window.__game.evLog.some((e) => e.type === 'rettelser'), null, { timeout: 120000 });
  const st = await pg.evaluate(() => ({ p: [window.__game.player.x, window.__game.player.y, window.__game.player.z], yaw: window.__game.cam.yaw, id: window.__game.LEVEL.name, ev: window.__game.evLog.filter((e) => e.type === 'rettelser').map((e) => e.detail || e.d || e.text || JSON.stringify(e)) }));
  const dist = Math.hypot(st.p[0] - spot.x, st.p[2] - spot.z); console.log('ankom', JSON.stringify(st), 'avstand', dist.toFixed(2));
  assert.ok(dist > 1.5 && dist < 6, 'figuren står et par enheter fra plata'); assert.ok(!/go=/.test(pg.url()), 'go fjernes fra adressen');
  await pg.waitForTimeout(2500); await shot('6_ved_plata');
  await ctx.close(); await b.close(); srv.close();
  assert.deepEqual(errs, [], 'konsollfeil');
  console.log('fixes_check: ok');
})().catch((e) => { console.error('FIXES-TEST FEILET:', e.message); process.exit(1); });
