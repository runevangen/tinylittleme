// R83: hele NYTT-flyten i nettleser (Playwright, iPhone 14) mot en falsk server: knapp med tall, faner, avkryssing (lokalt og til server), GÅ DIT, uten kode.
// Kjør: NODE_PATH=$(npm root -g) node tools/changes_check.cjs [mappe for bilder]. Exit 1 ved feil.
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
const src = fs.readFileSync(path.join(root, 'changes_data.js'), 'utf8');
const N = (src.match(/^\s*\{ id: '/gm) || []).length, FIRST = src.match(/\{ id: '([^']+)'/)[1], PLATE = 'r79-trykkplate-flush';
const NOW = '2026-11-19T12:00:00Z';
async function session(b, { code }) {
  const ctx = await b.newContext({ ...devices['iPhone 14'] }), calls = [], errs = [], server = [{ id: 'r81-rettelser-faner', check: 'ok', note: '', checked_at: '2026-11-18T10:00:00Z' }];
  await ctx.addInitScript(([c, now]) => { try { if (c && !localStorage.getItem('tlm.tcode')) localStorage.setItem('tlm.tcode', JSON.stringify(c)); } catch { /* */ } const real = Date.now, t0 = real(), base = new Date(now).getTime(); Date.now = () => base + (real() - t0); }, [code, NOW]);
  await ctx.route('**/rest/v1/rpc/**', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop(), body = JSON.parse(route.request().postData() || '{}'); calls.push({ name, body });
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, apikey, content-type' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const j = (o) => route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(o) });
    if (name === 'tlm_my_inbox') return j({ ok: true, me: { sent: 0, fixed: 0, working: 0 }, all: { sent: 0, fixed: 0, testers: 1 }, replies: [] });
    if (name === 'tlm_my_change_checks') return j({ ok: true, checks: server });
    if (name === 'tlm_check_change') { server.push({ id: body.cid, check: body.res, note: body.note, checked_at: new Date().toISOString() }); return j(true); }
    return j({});
  });
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 250))); pg.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errs.push('console: ' + m.text().slice(0, 250)));
  return { ctx, pg, calls, errs, server };
}
(async () => {
  await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port, base = `http://localhost:${port}`;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  // ---- med tester-kode ----
  {
    const { ctx, pg, calls, errs } = await session(b, { code: 'rune' });
    const shot = async (n) => { if (shots) await pg.screenshot({ path: path.join(shots, 'nytt_' + n + '.png') }); };
    await pg.goto(base + '/'); await pg.waitForSelector('#mChg', { timeout: 120000 });
    await pg.waitForFunction((n) => document.getElementById('mChg').textContent.trim() === `NYTT · ${n - 1}`, N, { timeout: 60000 }).catch(async (e) => { console.error('dbg', await pg.textContent('#mChg'), JSON.stringify(calls), errs.join('|')); throw e; });   // serveren har én ✓
    assert.ok(await pg.$('#mFix'), 'RETTELSER ved siden av'); await shot('1_meny');
    const bb = await pg.evaluate(() => ['mChg', 'mFix'].map((i) => { const r = document.getElementById(i).getBoundingClientRect(); return [r.left, r.right, r.top, r.bottom, r.height]; }));
    assert.ok(bb[0][1] <= bb[1][0] + 1 && Math.abs(bb[0][2] - bb[1][2]) < 2 && bb[0][4] >= 44, 'knappene ved siden av hverandre, store nok');
    await pg.click('#mChg'); await pg.waitForSelector('[data-fx]'); await pg.waitForTimeout(300);
    assert.equal((await pg.textContent('h1.fxh')).trim(), 'Nytt');
    const order = await pg.$$eval('[data-fx]', (els) => els.map((e) => e.dataset.fx)); assert.equal(order[0], FIRST, 'nyeste først'); assert.ok(!order.includes('r81-rettelser-faner'), 'server-✓ ligger i SJEKKET');
    assert.ok((await pg.textContent('[data-tab="sjekket"]')).includes('(1)'), 'fanen SJEKKET');
    const txt = await pg.textContent(`[data-fx="${FIRST}"]`); assert.ok(/Slik tester du:/.test(txt) && /Kom i v2\.36/.test(txt), 'how og versjon: ' + txt);
    await shot('2_liste'); await pg.locator(`[data-fx="${FIRST}"]`).scrollIntoViewIfNeeded(); await shot('3_rad');
    // ✗ med tekst → server + ny sjekket
    await pg.click(`[data-no="${FIRST}"]`); await pg.fill(`[data-fx="${FIRST}"] [data-note]`, 'kameraet rykker'); await shot('4_virker_ikke'); await pg.click(`[data-send="${FIRST}"]`); await pg.waitForTimeout(400);
    const c1 = calls.filter((c) => c.name === 'tlm_check_change').pop(); assert.deepEqual(c1.body, { c: 'rune', cid: FIRST, res: 'fail', note: 'kameraet rykker', ver: c1.body.ver, lvl: 'bad' }); assert.match(c1.body.ver, /^\d+\.\d+/);
    assert.ok(!(await pg.$(`[data-fx="${FIRST}"]`)), 'flyttet til SJEKKET');
    // ✓ på en rad med brett + sted
    await pg.click(`[data-ok="${PLATE}"]`); await pg.waitForTimeout(400); assert.deepEqual(calls.filter((c) => c.name === 'tlm_check_change').pop().body.cid, PLATE);
    await pg.click('[data-tab="sjekket"]'); await pg.waitForTimeout(200); assert.ok(await pg.$(`[data-fx="${FIRST}"].fail`) && await pg.$(`[data-fx="${PLATE}"].ok`)); await shot('5_sjekket');
    await pg.click('#fxBack'); await pg.waitForSelector('#mChg'); assert.equal((await pg.textContent('#mChg')).trim(), `NYTT · ${N - 3}`, 'tallet gikk ned');
    // GÅ DIT (brett og sted)
    await pg.click('#mChg'); await pg.waitForSelector('[data-tab]'); await pg.click('[data-tab="sjekket"]'); await pg.waitForSelector(`[data-go="${PLATE}"]`);
    await Promise.all([pg.waitForNavigation({ timeout: 60000 }), pg.click(`[data-go="${PLATE}"]`)]);
    assert.ok(/level=verksted/.test(pg.url()) && /go=14%2C11\.2%2C-1|go=14,11\.2,-1/.test(pg.url()), 'URL: ' + pg.url());
    await pg.waitForFunction(() => window.__game && window.__game.LEVEL && window.__game.evLog.some((e) => e.type === 'nytt'), null, { timeout: 120000 });
    const ev = await pg.evaluate(() => window.__game.evLog.filter((e) => e.type === 'nytt').map((e) => e.detail)); assert.ok(ev.some((d) => /gå dit verksted/.test(d)) && ev.some((d) => /avkryssing/.test(d)), 'logEv: ' + ev.join('|'));
    await pg.waitForTimeout(2000); await shot('6_ved_stedet');
    await ctx.close(); assert.deepEqual(errs, [], 'konsollfeil (med kode)');
  }
  // ---- uten kode: lokalt, og synk når kode finnes ----
  {
    const { ctx, pg, calls, errs, server } = await session(b, { code: '' });
    await pg.goto(base + '/'); await pg.waitForSelector('#mChg', { timeout: 120000 });
    assert.ok(!(await pg.$('#mFix')), 'ingen RETTELSER uten kode'); assert.equal((await pg.textContent('#mChg')).trim(), `NYTT · ${N}`);
    await pg.click('#mChg'); await pg.waitForSelector('[data-fx]'); await pg.click(`[data-ok="${FIRST}"]`); await pg.waitForTimeout(300);
    assert.deepEqual(calls.filter((c) => c.name === 'tlm_check_change'), [], 'ingen server-kall uten kode');
    assert.ok(await pg.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), 'tlm.changechecks').then((o) => o[FIRST] && o[FIRST].check === 'ok'), 'lagret lokalt');
    await pg.click('#fxBack'); await pg.waitForSelector('#mChg'); assert.equal((await pg.textContent('#mChg')).trim(), `NYTT · ${N - 1}`);
    await pg.reload(); await pg.waitForSelector('#mChg', { timeout: 120000 }); assert.equal((await pg.textContent('#mChg')).trim(), `NYTT · ${N - 1}`, 'husket etter omlasting');
    // kode settes: neste visning av menyen synker det lokale
    await pg.evaluate(() => localStorage.setItem('tlm.tcode', JSON.stringify('rune'))); await pg.click('#mSet').catch(() => {}); await pg.reload(); await pg.waitForSelector('#mChg', { timeout: 120000 });
    for (let i = 0; i < 60 && !server.some((x) => x.id === FIRST); i++) await pg.waitForTimeout(1000);
    assert.ok(server.some((s) => s.id === FIRST && s.check === 'ok'), 'lokal avkryssing synket til serveren: ' + JSON.stringify(calls.map((c) => c.name)));
    await ctx.close(); assert.deepEqual(errs, [], 'konsollfeil (uten kode)');
  }
  await b.close(); srv.close();
  console.log('changes_check: ok');
})().catch((e) => { console.error('CHANGES-TEST FEILET:', e.message); process.exit(1); });
