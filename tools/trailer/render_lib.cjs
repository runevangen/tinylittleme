// Rendringsbibliotek for traileren: statisk filserver + Chromium (swiftshader) + kinomodus-API. Se README.md, seksjonen «Rendering».
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function startServer(root = ROOT) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
      const f = path.join(root, path.normalize(p));
      if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
      fs.readFile(f, (e, d) => {
        if (e) { res.writeHead(404); return res.end('404'); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d);
      });
    });
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

function loadPlaywright() {
  try { return require('playwright'); } catch (e) {
    const np = process.env.NODE_PATH || '/usr/local/lib/node_modules_global';
    return require(require.resolve('playwright', { paths: np.split(path.delimiter) }));
  }
}

// cine-proxy: cine.step(5, 1/60) kaller window.__game.cine.step(5, 1/60) i siden; cine.build.open(..) likeså.
// Egenskaper (isOn, hero, ...) leses med cine.get('navn').
function makeCine(page) {
  const call = (p, args) => page.evaluate(([p, a]) => {
    const parent = p.slice(0, -1).reduce((t, k) => t[k], window.__game.cine);
    return parent[p[p.length - 1]](...a);
  }, [p, args]);
  const mk = (p) => new Proxy(function () {}, {
    get: (_, k) => (typeof k === 'string' && k !== 'then' ? mk([...p, k]) : undefined),
    apply: (_, __, args) => call(p, args),
  });
  const root = mk([]);
  return new Proxy({}, { get: (_, k) => (k === 'get' ? (n) => page.evaluate((n) => window.__game.cine[n], n) : k === 'then' ? undefined : root[k]) });
}

const fmt = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

async function renderClip(clip, opts = {}) {
  const list = JSON.parse(fs.readFileSync(path.join(__dirname, 'shotlist.json'), 'utf8')).klipp;
  const sl = list.find((k) => k.id === clip.id);
  if (!sl) throw new Error('Klipp-id ikke i shotlist.json: ' + clip.id);
  const outBase = opts.out || process.env.TRAILER_FRAMES;
  if (!outBase) throw new Error('Mangler utmappe: bruk --out <mappe> eller env TRAILER_FRAMES');
  if (path.resolve(outBase).startsWith(ROOT + path.sep)) console.warn('ADVARSEL: utmappa ligger inne i repoet; ikke sjekk inn bilder.');
  const dir = path.resolve(outBase, opts.test ? path.join('_test', clip.id) : clip.id);
  fs.mkdirSync(dir, { recursive: true });
  const n = sl.bilder, fps = 12, ticksPerFrame = clip.ticksPerFrame || 5;
  const from = opts.from != null ? Math.max(0, opts.from) : 0, to = opts.to != null ? Math.min(n - 1, opts.to) : n - 1;
  const want = (i) => (opts.test ? (i === 0 || i === Math.floor((n - 1) / 2) || i === n - 1) : true);

  const { srv, port } = await startServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const t0 = Date.now(); let rendered = 0, skipped = 0;
  try {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.error('sidefeil:', e.message));
    const ls = Object.assign({}, sl.innstillinger || {}, clip.localStorage || {});
    if (Object.keys(ls).length) await page.addInitScript((o) => { try { for (const k in o) localStorage.setItem(k, o[k]); } catch (e) {} }, ls);
    let url = sl.url || ('?level=' + sl.brett); if (!url.startsWith('?')) url = '?' + url;
    url += '&cinema=1&cine_hold=1';
    await page.goto(`http://127.0.0.1:${port}/index.html${url}`);
    await page.waitForFunction(() => window.__game && window.__game.player && window.__game.cine, null, { timeout: 180000 });
    const cine = makeCine(page);
    const c = { page, cine, fps, ticksPerFrame, n, shot: sl, advance: (t) => cine.step(t, 1 / 60) };
    if (clip.setup) await clip.setup(c);
    for (let i = 0; i < n; i++) {
      await clip.frame(c, i, n);
      await c.advance(ticksPerFrame);
      const file = path.join(dir, String(i + 1).padStart(4, '0') + '.png');
      if (i >= from && i <= to && want(i)) {
        if (fs.existsSync(file)) skipped++;
        else { await cine.render(); await page.screenshot({ path: file }); rendered++; }
        const el = (Date.now() - t0) / 1000, per = rendered ? el / rendered : 0;
        console.log(`[${clip.id}] bilde ${i + 1}/${n} (${rendered} rendret, ${skipped} hoppet over) ${fmt(el)} brukt, ca. ${fmt((to - i) * per)} igjen`);
      }
    }
    if (!opts.test && from === 0 && to === n - 1) fs.writeFileSync(path.join(dir, '.done'), new Date().toISOString() + '\n');
    console.log(`[${clip.id}] ferdig: ${rendered} rendret, ${skipped} hoppet over, ${fmt((Date.now() - t0) / 1000)} -> ${dir}`);
    return { dir, rendered, skipped };
  } finally { await browser.close(); srv.close(); }
}

module.exports = { renderClip, startServer, makeCine, ROOT };
