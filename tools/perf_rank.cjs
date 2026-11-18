// R85: måler relative kostnader per rom i en ekte nettleser (Playwright, iPhone 14, SwiftShader uten GPU) og rangerer rommene.
//   node tools/perf_rank.cjs [--root <mappe>] [--out <fil.json>] [--md <fil.md>] [--levels bad,verksted,...]
// Kjør med NODE_PATH=$(npm root -g). Tallene er IKKE iPhone-fps: tegnekall, trekanter, teksturer, lys og skygger er statiske mål (de er like på alle maskiner for samme bilde);
// tid per tick og per tegning er SwiftShader-tid (programvare) og brukes bare som relativ rangering mellom rom og mellom endringer.
// «Tegnekall» og «trekanter» er hovedpasset (renderer.info; skyggepasset telles ikke av three). Kameraet står på startposisjonen, så tallene er like fra kjøring til kjøring.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const root = path.resolve(arg('root', path.join(__dirname, '..')));
const outJson = arg('out', ''), outMd = arg('md', '');
const ALL = ['bad', 'barnerom', 'kjokken', 'bad2', 'barnerom2', 'kjokken2', 'leke', 'stue', 'verksted', 'bro', 'trapp', 'vippe', 'kjokkenbro', 'bygglab'];
const levels = arg('levels', ALL.join(',')).split(',');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
  if (!p.startsWith(root) || !fs.existsSync(p)) { r.writeHead(404); r.end('mangler'); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(p).pipe(r);
});

// kjøres i siden: mål + de dyreste enkeltpostene (synlige i bildet)
async function measure() {
  const T = await import('/lib/three.module.min.js'), g = window.__game, r = g.renderer;
  window.__paused = true; await new Promise((x) => setTimeout(x, 400));
  const st = g.perfStats();
  const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];
  const rt = []; for (let i = 0; i < 5; i++) { const t0 = performance.now(); r.render(g.scene, g.camera); r.getContext().finish(); rt.push(performance.now() - t0); }
  const tt = []; window.__paused = false; for (let i = 0; i < 5; i++) { const t0 = performance.now(); g.tick(20); tt.push((performance.now() - t0) / 20); } window.__paused = true;
  g.camera.updateMatrixWorld(true);
  const fr = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(g.camera.projectionMatrix, g.camera.matrixWorldInverse));
  const items = [], within = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
  g.scene.traverse((o) => {
    if (!(o.isMesh || o.isPoints) || !o.geometry || !o.geometry.attributes.position) return;
    for (let p = o; p; p = p.parent) if (!p.visible) return;
    if (o.frustumCulled && !fr.intersectsObject(o)) return;
    const gg = o.geometry, tris = Math.round(gg.index ? gg.index.count / 3 : gg.attributes.position.count / 3);
    let part = 'rekvisitt/brettdel';
    if (within(o, g.hero.root)) part = 'figuren'; else if (g.antMeshes.some((a) => within(o, a.a.root))) part = 'maur/skapninger';
    else { let top = o; while (top.parent && top.parent !== g.scene) top = top.parent; if (top.type === 'Group' && !top.name && top.children.length > 6 && [...top.children].every((c) => c.isMesh)) part = 'gulvdetaljer/småting'; else if (o.material && o.material.transparent) part = 'gjennomsiktig'; }
    items.push({ tris, part, shadow: !!o.castShadow, merged: o.userData.merged || 0, mat: (o.material.type || '').replace('Material', '') + (o.material.transparent ? '+gjennomsiktig' : ''), color: o.material.color ? o.material.color.getHexString() : '' });
  });
  items.sort((a, b) => b.tris - a.tris);
  const byPart = {}; for (const i of items) { const k = i.part; byPart[k] = byPart[k] || { calls: 0, tris: 0 }; byPart[k].calls++; byPart[k].tris += i.tris; }
  return { calls: st.calls, tris: st.tris, meshes: st.meshes, lights: st.lights, shadowLights: st.shadowLights, textures: st.textures, texMB: +st.texMB.toFixed(1), geoMB: +st.geoMB.toFixed(1), materials: st.materials,
    renderMs: +med(rt).toFixed(1), tickMs: +med(tt).toFixed(2), visibleItems: items.length, byPart, top: items.slice(0, 10) };
}

(async () => {
  await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const res = {};
  for (const lv of levels) {
    const pg = await (await b.newContext({ ...devices['iPhone 14'] })).newPage(); const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
    await pg.goto(`http://localhost:${port}/?level=${lv}&start=0`);
    const ok = await pg.waitForFunction(() => window.__game && window.__game.LEVEL && window.__game.perfStats().calls > 0, null, { timeout: 120000 }).then(() => true, () => false);
    if (!ok) { console.log(lv, 'STARTET IKKE'); res[lv] = { error: 'startet ikke' }; await pg.context().close(); continue; }
    await pg.waitForTimeout(4500);
    res[lv] = await pg.evaluate(measure); if (errs.length) res[lv].errors = errs;
    const m = res[lv]; console.log(`${lv.padEnd(10)} tegnekall ${m.calls}, trekanter ${m.tris}, teksturer ${m.textures} (${m.texMB} MB), lys ${m.lights}/${m.shadowLights}, tegning ${m.renderMs} ms, tick ${m.tickMs} ms`);
    await pg.context().close();
  }
  await b.close(); srv.close();
  if (outJson) fs.writeFileSync(outJson, JSON.stringify(res, null, 1) + '\n');
  if (outMd) fs.writeFileSync(outMd, toMd(res));
})().catch((e) => { console.error(e); process.exit(1); });

// relativ kostnadsscore: tegnekall og trekanter veier like (tegnekall /150 + trekanter /30000 + teksturminne /60 MB), bare til rangering
const score = (m) => m.calls / 150 + m.tris / 30000 + m.texMB / 60;
function toMd(res) {
  const rows = Object.entries(res).filter(([, m]) => !m.error).sort((a, b) => score(b[1]) - score(a[1]));
  let s = '| Rom | Tegnekall | Trekanter | Teksturer (MB) | Lys (skygge) | Tegning ms* | Tick ms* | Score |\n|---|---|---|---|---|---|---|---|\n';
  for (const [k, m] of rows) s += `| ${k} | ${m.calls} | ${m.tris} | ${m.textures} (${m.texMB}) | ${m.lights} (${m.shadowLights}) | ${m.renderMs} | ${m.tickMs} | ${score(m).toFixed(2)} |\n`;
  s += '\nDe 10 dyreste enkeltpostene (mesh i bildet, etter trekanter) i de tre dyreste rommene:\n';
  for (const [k, m] of rows.slice(0, 3)) { s += `\n**${k}**\n\n| # | Del | Trekanter | Skygge | Slått sammen | Materiale |\n|---|---|---|---|---|---|\n`; m.top.forEach((i, n) => { s += `| ${n + 1} | ${i.part} | ${i.tris} | ${i.shadow ? 'ja' : 'nei'} | ${i.merged || '-'} | ${i.mat} #${i.color} |\n`; }); s += '\nFordeling: ' + Object.entries(m.byPart).sort((a, b) => b[1].tris - a[1].tris).map(([p, v]) => `${p} ${v.calls} kall / ${v.tris} trekanter`).join('; ') + '\n'; }
  return s;
}
module.exports = { score };
