// node test_scan.mjs: R194, skannet rom (GLB) som bane: scan_logic.js (gulv, voxel, bokser, start/mål, grenser, determinisme) + hekter i filene.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { SCAN, findFloor, scanToScene, goalOptions, withGoal, fileCheck, scanInfo, scanOk, newScanId, SCAN_ID_RE, triCount } from './scan_logic.js';
import { roomMesh, makeMesh, writeGLB } from './tools/glb_make.mjs';
import { sceneToRoom } from './leditor_logic.js';

const mesh = roomMesh();   // 4 × 5 m, gulv på y = 0,31, bord (70 cm) og sofa (42 cm, rygg 85 cm), støy under gulvet
assert.equal(triCount(mesh), mesh.idx.length / 3);
// gulvet: laveste tette horisontale lag; støytrekanten 1,5 m under gulvet teller ikke
const fl = findFloor(mesh); assert.ok(fl && Math.abs(fl.y - 0.31) < 0.03, 'gulv ' + (fl && fl.y));
assert.equal(findFloor({ pos: [0, 0, 0, 0.5, 0, 0, 0, 0, 0.5], idx: [0, 1, 2] }), null, 'for lite flate er ikke gulv');

const r = scanToScene(mesh); assert.ok(r.ok, JSON.stringify(r));
const I = r.info, sc = r.scene;
assert.equal(I.widthCm, 400); assert.equal(I.depthCm, 500); assert.ok(I.heightCm >= 240 && I.heightCm <= 260, 'høyde ' + I.heightCm);
assert.equal(r.transform.scale, 20); assert.deepEqual(r.transform.offset, [-240, -6.2, 10], 'x: −minX·20 − halv bredde (enheter); y: −gulv·20; z: −minZ·20 − halv dybde');
assert.ok(I.boxes > 5 && I.boxes <= SCAN.maxBoxes, 'bokser ' + I.boxes);
assert.equal(sc.objects.length, I.boxes); assert.equal(sc.units, 'cm');
for (const o of sc.objects) {   // alt innenfor rommet, ingenting under gulvet, ingen overlapp i ids
  const [x0, x1, y0, y1, z0, z1] = o.box; assert.ok(x0 >= 0 && x1 <= 400 && z0 >= 0 && z1 <= 500 && y0 >= 0 && y1 <= I.heightCm && x1 > x0 && y1 > y0 && z1 > z0, o.id);
}
assert.equal(new Set(sc.objects.map((o) => o.id)).size, sc.objects.length);
// bordet (70 cm) og sofaen (42/85 cm) er der, ca. på riktig sted (rutenett 8 cm)
const near = (v, t, tol) => Math.abs(v - t) <= tol;
assert.ok(sc.objects.some((o) => near(o.box[3], 72, 9) && o.box[0] < 260 && o.box[1] > 140 && o.box[4] < 400 && o.box[5] > 320), 'bordplata');
assert.ok(sc.objects.some((o) => near(o.box[3], 88, 9) && o.box[0] < 60 && o.box[4] < 60), 'sofaryggen');
// start: ledig flekk (ingen boks over gulvet innen 12 cm), inne i rommet
{ const { x, z } = sc.start; assert.ok(x > 0 && x < 400 && z > 0 && z < 500); assert.ok(!sc.objects.some((o) => x >= o.box[0] - 8 && x <= o.box[1] + 8 && z >= o.box[4] - 8 && z <= o.box[5] + 8 && o.box[2] < 12), 'start er fritt'); }
// mål: høyeste brede flate først; målet ligger på en boks som finnes
assert.ok(r.goals.length >= 2 && r.goals[0].top >= r.goals[1].top); const gb = sc.objects.find((o) => o.id === sc.goal.on); assert.ok(gb && near(sc.goal.y, gb.box[3], 0.2), 'målet på en flate');
assert.ok(r.goals.every((g) => g.top >= SCAN.goalMinTopCm && g.top <= I.heightCm - 20));
assert.equal(withGoal(sc, r.goals[1]).goal.on, r.goals[1].on);
// deterministisk
assert.equal(JSON.stringify(scanToScene(roomMesh())), JSON.stringify(r), 'samme mesh gir samme scene');
// valgbar celle og tak på bokser: grovere celle, aldri flere bokser enn taket
{ const fine = scanToScene(mesh, { cellCm: 5 }), coarse = scanToScene(mesh, { cellCm: 12 }); assert.ok(fine.ok && coarse.ok); assert.ok(fine.info.cellCm === 5 && coarse.info.cellCm === 12); assert.ok(fine.info.voxels > r.info.voxels && coarse.info.voxels < r.info.voxels, 'finere celle gir flere voxler'); }
{ const t = scanToScene(mesh, { maxBoxes: 12 }); assert.ok(t.ok && t.scene.objects.length <= 12, 'taket holder: ' + t.scene.objects.length); assert.ok(t.info.cellCm > 8 || t.info.truncated > 0, 'grovere celle eller kuttet'); }
// grenser og feil
assert.equal(scanToScene({ pos: [], idx: [] }).reason, 'tom');
assert.equal(scanToScene(mesh, { maxTris: 10 }).reason, 'mange');
{ const m = makeMesh(); m.quad([0, 0, 0], [0, 2.5, 0], [4, 2.5, 0], [4, 0, 0]); m.quad([0, 0, 3], [4, 0, 3], [4, 2.5, 3], [0, 2.5, 3]); assert.equal(scanToScene({ pos: m.pos, idx: m.idx }).reason, 'ingen_gulv', 'bare vegger: ingen gulv'); }
{ const m = makeMesh(); m.quad([0, 0, 0], [0, 0, 40], [40, 0, 40], [40, 0, 0]); assert.equal(scanToScene({ pos: m.pos, idx: m.idx }).reason, 'stor', 'gulv på 40 m'); }
{ const m = makeMesh(); m.quad([0, 0, 0], [0, 0, 0.5], [0.5, 0, 0.5], [0.5, 0, 0]); assert.ok(['ingen_gulv', 'liten'].includes(scanToScene({ pos: m.pos, idx: m.idx }).reason)); }
assert.equal(fileCheck(0), 'tom'); assert.equal(fileCheck(80 * 1048576 + 1), 'fil_stor'); assert.equal(fileCheck(20 * 1048576), '');
assert.equal(SCAN.maxFileMB, 80); assert.equal(SCAN.maxTris, 1500000);
// støy: tre løse trekanter langt over rommet endrer ikke gulv og mål
{ const m = roomMesh(); m.pos.push(12, 9, 0, 12.1, 9, 0, 12, 9.1, 0); m.idx.push(m.pos.length / 3 - 3, m.pos.length / 3 - 2, m.pos.length / 3 - 1); const n = scanToScene(m); assert.ok(n.ok && n.info.widthCm === 400 && Math.abs(n.info.floorM - 0.31) < 0.03 && n.info.heightCm < 300, 'støy ignoreres'); }
// uten indekser (tre og tre hjørner)
{ const flat = { pos: [] }; for (const i of mesh.idx) flat.pos.push(mesh.pos[i * 3], mesh.pos[i * 3 + 1], mesh.pos[i * 3 + 2]); const f = scanToScene(flat); assert.ok(f.ok && f.info.boxes === I.boxes, 'samme resultat uten indekser'); }

// brettet: går gjennom sceneToRoom (som brett fra bilder), skaninfoen følger med, kan vinnes
{ const info = scanInfo('scan-abcd2345', r.transform, I.heightCm); assert.ok(scanOk(info) && info.cut > 0 && info.cut < I.heightCm / 5);
  const s2 = { ...sc, scan: info }; const room = sceneToRoom(s2, 'Test'); assert.ok(room.ok, JSON.stringify(room).slice(0, 200));
  assert.deepEqual(room.level.scan, info, 'scan følger brettet'); assert.ok(room.level.boxes.length <= 600 && JSON.stringify(room.level).length < 150000);
  let any = false; for (const g of r.goals.slice(0, 6)) { const q = sceneToRoom({ ...withGoal(sc, g), scan: info }, 'T', { auto: false }); if (q.ok && q.solvable && !q.tooMany) { any = true; break; } } assert.ok(any, 'minst ett av de seks høyeste målene kan vinnes'); }
assert.ok(SCAN_ID_RE.test(newScanId()) && !scanOk({ id: '../x', scale: 20, offset: [0, 0, 0] }) && !scanOk({ id: 'scan-abcd2345', scale: 0, offset: [0, 0, 0] }) && !scanOk(null));
// GLB-skriveren (brukes av tools/live_scan.cjs): gyldig binær glTF-header
{ const g = writeGLB(mesh); assert.equal(g.readUInt32LE(0), 0x46546c67); assert.equal(g.readUInt32LE(4), 2); assert.equal(g.readUInt32LE(8), g.length); assert.equal(g.length % 4, 0); }

// hekter i filene (modulene i files, valg i SETTINGS, tekster, dokumentasjon, logg)
const rd = (f) => fs.readFileSync(f, 'utf8'), main = rd('main.js'), html = rd('index.html'), view = rd('leditor_view.js');
assert.ok(html.includes("'scan_logic'") && html.includes("'scan_view'"), 'modulene er i files');
assert.ok(/fl\('scanshow', 'test'/.test(main) && /rg\('scancell', 'admin'/.test(main) && main.includes('loadScanVisual') && main.includes("get('scan')"), 'valg og hekter i main.js');
assert.ok(main.includes('scanLogEarly') && main.indexOf('scanLogEarly') < main.indexOf('let won = false, clock = 0;') && !/loadScanVisual\(\{[^}]*logEv,/.test(main), 'logEv brukes ikke før clock finnes (TDZ): meldingene køes');
assert.ok(rd('scene2level_core.js').includes('scene.scan'), 'level.scan fra scenen');
assert.ok(/logEv\?*\.?\('skann'/.test(view) && rd('scan_view.js').includes("'skann'"), 'logEv(skann)');
assert.ok(rd('docs/SKANNING.md').includes('Scaniverse') && rd('docs/SKANNING.md').includes('Polycam') && rd('docs/INNSTILLINGER.md').includes('scanshow') && rd('docs/INNSTILLINGER.md').includes('scancell'), 'dokumentasjon');
assert.ok(fs.existsSync('lib/GLTFLoader.js') && fs.existsSync('lib/BufferGeometryUtils.js') && /from '\.\/BufferGeometryUtils\.js'/.test(rd('lib/GLTFLoader.js')), 'GLTFLoader i lib/ med importen rettet');
{ const tx = await import('./leditor_text.js'); for (const lang of ['nb', 'en']) { for (const k of ['scanBtn', 'scanBtnSub', 'scanH', 'scanGuide', 'scanCellH', 'scanCell', 'scanPick', 'scanReading', 'scanBuilding', 'scanChecking', 'scanNoStore', 'scanDone']) assert.ok(tx.ltx(lang, k), lang + ' ' + k); for (const e of ['fil_stor', 'tom', 'mange', 'ingen_gulv', 'stor', 'liten', 'ugyldig_glb']) assert.ok(tx.lerr(lang, e) !== tx.lerr(lang, 'feil'), lang + ' feil ' + e); } }
console.log('test_scan: ok');
