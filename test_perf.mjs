import * as THREE from './lib/three.module.min.js';
import { memStats, memOver, memLine, texBytes, disposeTree, shrinkSceneTextures, shrinkCanvas, lowSide, MEM_BUDGET, LOW_TEX_CUT } from './perf_budget.js';
import { mergeRigid, refsIn, movingNodes, mergeStatic, matSig, createLowProfile, overBudget, BUDGET, statsLine } from './perf_budget.js';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FEIL', m); } };
// sammenslåing: samme materiale blir ett mesh, andre blir stående
{
  const root = new THREE.Group(); root.position.set(5, 0, 2); root.rotation.y = 0.7;
  const a = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5 }), a2 = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5 }), b = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  const mk = (g, m, x, sh = true) => { const o = new THREE.Mesh(g, m); o.position.set(x, 1, 0); o.castShadow = sh; root.add(o); return o; };
  mk(new THREE.BoxGeometry(1, 1, 1), a, 0); mk(new THREE.SphereGeometry(0.5, 8, 6), a2, 2); mk(new THREE.CylinderGeometry(0.3, 0.3, 1, 8), a, 4); mk(new THREE.BoxGeometry(1, 1, 1), b, 6); mk(new THREE.BoxGeometry(1, 1, 1), a, 8, false);
  const sub = new THREE.Group(); sub.position.set(0, 3, 0); sub.scale.set(-1, 1, 1); root.add(sub); const mm = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 3), a); mm.castShadow = true; sub.add(mm);
  root.updateMatrixWorld(true);
  let tris0 = 0; root.traverse((o) => { if (o.isMesh) tris0 += o.geometry.index.count / 3; });
  ok(matSig(a) === matSig(a2) && matSig(a) !== matSig(b), 'matSig: lik og ulik');
  const bb0 = new THREE.Box3().setFromObject(root);
  const st = mergeStatic(THREE, root);
  ok(st.before === 6 && st.after === 3, `slått sammen 6 til 3 (fikk ${st.before} til ${st.after})`);
  const bb1 = new THREE.Box3().setFromObject(root);
  ok(bb0.min.distanceTo(bb1.min) < 1e-4 && bb0.max.distanceTo(bb1.max) < 1e-4, 'samme utstrekning i verden etter sammenslåing');
  let tris = 0; root.traverse((o) => { if (o.isMesh) tris += o.geometry.index.count / 3; });
  ok(tris === tris0, `samme antall trekanter (${tris} mot ${tris0})`);
  const merged = root.children.find((c) => c.userData.merged);
  ok(merged && merged.userData.merged === 4 && merged.castShadow, 'sammenslått mesh med skygge');
  const nr = merged.geometry.attributes.normal; let okN = true; for (let i = 0; i < nr.count; i++) if (Math.abs(Math.hypot(nr.getX(i), nr.getY(i), nr.getZ(i)) - 1) > 1e-3) okN = false; ok(okN, 'normaler er enhetsvektorer');
}
// rot med funksjoner i userData (tråd, tørk) røres ikke
{
  const root = new THREE.Group(); root.userData.thread = () => {}; const m = new THREE.MeshStandardMaterial();
  for (let i = 0; i < 3; i++) root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m));
  const st = mergeStatic(THREE, root); ok(st.before === 3 && st.after === 3, 'rot med userData røres ikke');
}
// usynlige blir stående, ulike materialer slås ikke sammen
{
  const root = new THREE.Group(); const m = new THREE.MeshStandardMaterial(), t = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.5 });
  const hid = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m); hid.visible = false;
  root.add(hid, new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m), new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m), new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), t));
  const st = mergeStatic(THREE, root); ok(st.before === 4 && st.after === 3, 'usynlig blir stående, to like slås sammen');
}
// ruter: fjerne deler slås ikke sammen
{
  const root = new THREE.Group(), m = new THREE.MeshStandardMaterial();
  for (const x of [0, 1, 100, 101]) { const o = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m); o.position.x = x; root.add(o); }
  const st = mergeStatic(THREE, root, { cell: 40 }); ok(st.after === 2, 'rutedeling gir to sammenslåtte mesher');
}
// rigid: ledd som beveger seg (kept) slås sammen for seg, og beveger seg riktig etterpå
{
  const root = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x336699 }), arm = new THREE.Group(); arm.position.set(1, 2, 0); root.add(arm);
  const hero = { root, arm, parts: [arm] };
  for (let i = 0; i < 3; i++) { const o = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m); o.position.x = i; root.add(o); const q = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 4), m); q.position.y = -i; arm.add(q); }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })); root.add(eye); hero.blush = [eye];
  const keep = refsIn(hero); ok(keep.has(arm) && keep.has(eye) && keep.has(root), 'refsIn finner ledd og deler');
  const st = mergeRigid(THREE, root, keep);
  ok(st.before === 7 && st.after === 3, `rigid: 7 til 3 (fikk ${st.before} til ${st.after})`);
  arm.rotation.z = Math.PI / 2; arm.updateMatrixWorld(true);
  const armMesh = arm.children.find((c) => c.userData.merged); const bb = new THREE.Box3().setFromObject(armMesh);
  ok(armMesh && armMesh.userData.merged === 3 && bb.max.x > 3.1 && bb.min.x < 0.8 && Math.abs(bb.max.y - 2.3) < 0.01, 'merget del følger leddet når det dreier');
  ok(eye.parent === root, 'styrt del blir stående');
}
// movingNodes: finner det som endrer seg mellom stillinger (matrise, synlighet)
{
  const root = new THREE.Group(), m = new THREE.MeshStandardMaterial(), leg = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m), still = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m), crumb = new THREE.Group(); crumb.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m)); root.add(leg, still, crumb);
  const mv = movingNodes(root, [() => { leg.position.y = 0; crumb.visible = true; }, () => { leg.position.y = 1; crumb.visible = false; leg.updateMatrix(); }]);
  ok(mv.has(leg) && mv.has(crumb) && !mv.has(still), 'movingNodes: bein og skjult smule beveger seg, resten står');
}
// budsjett
ok(overBudget({ calls: 100, tris: 1000, lights: 3 }).length === 0, 'innenfor budsjett');
ok(overBudget({ calls: BUDGET.calls + 1, tris: BUDGET.tris + 1, lights: 9 }).length === 3, 'over budsjett på alle tre');
ok(/tegnekall 5/.test(statsLine({ calls: 5, tris: 6, lights: 2, shadowLights: 1, meshes: 9 }, { before: 20, after: 9 })), 'statslinje');
// lav profil
{
  const lp = createLowProfile(), W = (fps) => ({ fps });
  ok(lp.decide(W(10), 1, 1, 'auto') === null && lp.decide(W(10), 1, 1, 'auto') === null && lp.decide(W(10), 1, 1, 'auto') === true && lp.active, 'auto: slås på etter tre lave vinduer på bunnen');
  ok(lp.decide(W(60), 1, 1, 'auto') === null && lp.active, 'auto: blir på');
  const l2 = createLowProfile(); for (let i = 0; i < 6; i++) ok(l2.decide(W(10), 1.5, 1, 'auto') === null, 'auto: ikke før oppløsningen er på bunnen'); ok(!l2.active, 'ikke aktiv med høy oppløsning');
  const l3 = createLowProfile(); l3.decide(W(10), 1, 1, 'auto'); l3.decide(W(10), 1, 1, 'auto'); l3.decide(W(60), 1, 1, 'auto'); ok(l3.decide(W(10), 1, 1, 'auto') === null, 'et bra vindu nullstiller tellingen');
  const l4 = createLowProfile(); ok(l4.decide(null, 2, 1, 'on') === true && l4.active, 'på: alltid'); ok(l4.decide(null, 2, 1, 'off') === false && !l4.active, 'av: slår av');
  const l5 = createLowProfile(); ok(l5.decide(W(5), 1, 1, 'auto', false) === null && l5.decide(W(5), 1, 1, 'auto', false) === null && l5.decide(W(5), 1, 1, 'auto', false) === null && !l5.active, 'ikke under oppvarming');
}
// R17: softlight (myke skygger) har et fast budsjett av tegnekall/trekanter etter sammenslåing, i alle brett; beviser tapet mot FPS-kravet
{
  const fs = await import('node:fs'), { makeSoftLight } = await import('./softlight.js'), { SOFT } = await import('./softlight_logic.js');
  const fakeCtx = { createRadialGradient: () => ({ addColorStop() {} }), fillRect() {}, set fillStyle(v) {} };
  globalThis.document = { createElement: () => ({ getContext: () => fakeCtx }) };
  for (const id of ['bad', 'barnerom', 'kjokken', 'poc', 'klatring', 'barnerom2', 'kjokken2', 'bad2', 'leke', 'verksted']) {
    const L = JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8')), fy = Math.max(0, ...L.boxes.filter((b) => b.type === 'floor').map((b) => b.max[1]));
    const scene = new THREE.Scene(), sun = { shadow: { radius: 1 } }, renderer = { shadowMap: { type: THREE.PCFSoftShadowMap } };
    const soft = makeSoftLight({ THREE, scene, LEVEL: L, floorY: fy, sun, sunDir: L.sun || [28, 60, -24], renderer });
    const m = mergeStatic(THREE, soft.group, { cell: 80 });
    let calls = 0, tris = 0; soft.group.traverse((o) => { if (o.isMesh) { calls++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
    ok(calls <= SOFT.budget.calls, `softlight ${id}: ${calls} tegnekall > budsjett ${SOFT.budget.calls} (${m.before} før sammenslåing)`);
    ok(tris <= SOFT.budget.tris, `softlight ${id}: ${tris} trekanter > budsjett ${SOFT.budget.tris}`);
    ok(m.after <= m.before && calls === m.after, `softlight ${id}: sammenslåing gir færre kall (${m.before} til ${m.after})`);
    // av/på: lav profil og Enkel grafikk beholder dagens look (ingen tegnekall fra softlight, PCFSoft, radius 1); på gir PCF (radius virker bare der)
    soft.update(true, false, false); ok(soft.group.visible && sun.shadow.radius === SOFT.shadowRadius && renderer.shadowMap.type === THREE.PCFShadowMap, `${id}: på gir synlig + PCFShadowMap + radius`);
    soft.update(true, true, false); ok(!soft.group.visible && sun.shadow.radius === SOFT.shadowRadiusOff && renderer.shadowMap.type === THREE.PCFShadowMap, `${id}: lav profil slår alt av (R35: skyggetypen står, ellers nye shadere)`);
    soft.update(true, false, true); ok(!soft.group.visible, `${id}: Enkel grafikk slår alt av`);
    if (id === 'barnerom') console.log(`softlight budsjett: ${calls} tegnekall, ${tris} trekanter (maks ${SOFT.budget.calls} / ${SOFT.budget.tris})`);
  }
}
// R13: gulvdetaljene (fdet) har et fast budsjett av tegnekall/trekanter etter sammenslåing, i alle brett, også på høyeste tetthet (Mange). Statisk telling, ingen GPU:
// uten sammenslåing ville hvert småting vært et eget tegnekall. Ekte FPS på telefon er ikke målt her.
{
  const fs = await import('node:fs'), { register } = await import('node:module');
  register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { return s === 'three' ? { url: ${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)}, shortCircuit: true } : n(s, c); }`));
  const { makeFloorDetail } = await import('./floordetail.js'), { FDET } = await import('./floordetail_logic.js');
  const fakeCtx = { createRadialGradient: () => ({ addColorStop() {} }), fillRect() {}, set fillStyle(v) {} };
  globalThis.document = { createElement: () => ({ getContext: () => fakeCtx }) };
  const rows = [];
  for (const id of ['bad', 'barnerom', 'kjokken', 'poc', 'klatring', 'barnerom2', 'kjokken2', 'bad2', 'leke', 'verksted']) for (const [q, dens] of [['high', 1.6], ['high', 1], ['mid', 1]]) {
    const L = JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8')), fy = Math.max(0, ...L.boxes.filter((b) => b.type === 'floor').map((b) => b.max[1]));
    const scene = new THREE.Scene(), fd = makeFloorDetail({ scene, LEVEL: L, floorY: fy, quality: q, density: dens, name: id });
    const stat = () => { let calls = 0, tris = 0; fd.group.traverse((o) => { if (o.isMesh) { calls++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } }); return { calls, tris }; };
    const b4 = stat(), m = mergeStatic(THREE, fd.group, { cell: FDET.cell }), af = stat();
    ok(af.calls <= FDET.budget.calls, `fdet ${id} ${q}/${dens}: ${af.calls} tegnekall > budsjett ${FDET.budget.calls} (${b4.calls} før sammenslåing)`);
    ok(af.tris <= FDET.budget.tris, `fdet ${id} ${q}/${dens}: ${af.tris} trekanter > budsjett ${FDET.budget.tris}`);
    ok(af.calls === m.after && af.calls < b4.calls, `fdet ${id} ${q}/${dens}: sammenslåing gir færre kall (${b4.calls} til ${af.calls})`);
    ok(af.tris === b4.tris, `fdet ${id}: sammenslåing endrer ikke trekanttallet`);
    rows.push({ id, q, dens, b4, af });
  }
  const d1 = rows.filter((r) => r.q === 'high' && r.dens === 1);
  console.log(`fdet budsjett (statisk, uten GPU): standard tetthet ${Math.min(...d1.map((r) => r.af.calls))}-${Math.max(...d1.map((r) => r.af.calls))} tegnekall etter sammenslåing (${Math.min(...d1.map((r) => r.b4.calls))}-${Math.max(...d1.map((r) => r.b4.calls))} uten), maks ${Math.max(...rows.map((r) => r.af.calls))} / ${Math.max(...rows.map((r) => r.af.tris))} trekanter (budsjett ${FDET.budget.calls} / ${FDET.budget.tris})`);
}
// R21: teksturminne. Falsk lerret-DOM (ingen ekte tegning): størrelser og antall er det som telles
{
  const mkCanvas = () => { const c = { width: 0, height: 0, getContext: () => ({ imageSmoothingEnabled: true, drawImage() {}, createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {}, fillRect() {}, createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), set fillStyle(v) {}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {}, arc() {}, ellipse() {}, save() {}, restore() {}, rect() {}, clip() {}, fillText() {}, clearRect() {}, set strokeStyle(v) {}, set lineWidth(v) {}, set lineCap(v) {}, set font(v) {}, set textAlign(v) {}, set textBaseline(v) {}, set lineJoin(v) {}, set globalAlpha(v) {}, set globalCompositeOperation(v) {}, set shadowBlur(v) {}, set shadowColor(v) {}, translate() {}, rotate() {}, scale() {}, closePath() {}, quadraticCurveTo() {}, bezierCurveTo() {}, arcTo() {}, roundRect() {}, strokeRect() {}, setTransform() {}, drawImage2() {} }) }; return c; };
  globalThis.document = { createElement: mkCanvas };
  ok(lowSide(1024) === 512 && lowSide(256) === 128 && lowSide(128) === 128 && lowSide(64) === 64, 'lowSide: halv fra 256 og opp, aldri under 128');
  const big = mkCanvas(); big.width = 1024; big.height = 1024; ok(shrinkCanvas(big, true, (w, h) => { const o = mkCanvas(); o.width = w; o.height = h; return o; }).width === 512, 'shrinkCanvas halverer på lav');
  ok(shrinkCanvas(big, false, () => null) === big, 'shrinkCanvas lar full være');
  const { register } = await import('node:module');      // look.js importerer 'three' (import-map i nettleseren): pek den på den lokale kopien
  register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { return s === 'three' ? { url: ${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)}, shortCircuit: true } : n(s, c); }`));
  const { makeLook } = await import('./look.js');
  const mem = (low) => { const sc = new THREE.Scene(), L = makeLook({ aniso: 4, low });
    const mats = [L.floor, L.plaster, L.tile, L.wood, L.panel].filter(Boolean); const seen = []; for (const m of mats) for (const t of [m.map, m.normalMap, m.roughnessMap]) if (t) seen.push(t);
    const mm = new THREE.MeshBasicMaterial(); const holder = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mm); sc.add(holder);
    let b = 0; for (const t of new Set(seen)) b += texBytes(t); return { b, n: new Set(seen).size, L, mats }; };
  const hi = mem(false), lo = mem(true);
  ok(hi.n > 6 && lo.n > 4, `teksturer finnes (høy ${hi.n}, lav ${lo.n})`);
  ok(lo.b <= hi.b * (1 - LOW_TEX_CUT), `lav profil: minst ${LOW_TEX_CUT * 100} % mindre teksturminne (${(hi.b / 1048576).toFixed(1)} MB til ${(lo.b / 1048576).toFixed(1)} MB)`);
  console.log(`teksturminne look: full ${(hi.b / 1048576).toFixed(1)} MB, lav ${(lo.b / 1048576).toFixed(1)} MB`);
  ok(hi.b / 1048576 <= MEM_BUDGET.texMB && lo.b / 1048576 <= MEM_BUDGET.texMBLow, 'look-teksturer innenfor minnebudsjett');
  // R21: ekte nivåbygging 1→6 (props.js bygger brettets ting av nivåfilene), rapport per nivå, og frigjøring med disposeTree
  const { readFileSync } = await import('node:fs');
  const { buildGroup, buildSingle, setTexLow } = await import('./props.js');
  const ids = ['bad', 'barnerom', 'kjokken', 'bad2', 'barnerom2', 'kjokken2', 'leke', 'verksted'];
  const buildLevel = (id) => {
    const LV = JSON.parse(readFileSync(new URL(`./levels/${id}.level.json`, import.meta.url))), root = new THREE.Group(), groups = new Map(), drawn = new Set();
    for (const b of LV.boxes) if (b.group) { if (!groups.has(b.group)) groups.set(b.group, []); groups.get(b.group).push(b); }
    for (const [, ms] of groups) { const o = buildGroup(ms); if (o) { root.add(o); ms.forEach((x) => drawn.add(x)); } }
    for (const b of LV.boxes) { if (drawn.has(b) || !b.kind || b.type === 'floor' || b.type === 'wall' || b.dyn) continue;
      const g = buildSingle(b.kind, [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]], { color: b.color, id: b.id, material: b.material }); if (g) root.add(g); }
    return root;
  };
  const sc = new THREE.Scene(), first = [];
  for (const id of ids) {
    const root = buildLevel(id); sc.add(root); const s = memStats(root); first.push(s);
    console.log(`nivå ${id}: ${memLine(s)}`);
    ok(s.geometries > 10, `${id}: ekte bygging gir geometrier (${s.geometries})`);
    ok(memOver(s).length === 0, `${id}: innenfor minnebudsjett`);
    disposeTree(root); const z = memStats(sc); ok(z.geometries === 0 && sc.children.length === 0, `${id}: scenen er tom etter frigjøring`);
  }
  const again = memStats(buildLevel(ids[0]));
  ok(again.geometries === first[0].geometries && again.textures === first[0].textures, `bygge nivå 1 igjen etter 1→6 gir samme tall (${again.geometries} geometrier, ${again.textures} teksturer): ingenting vokser`);
  // Lav profil midt i spillet: de ekte teksturene (look + props) krympes i scenen
  { const sc2 = new THREE.Scene(); const L = makeLook({ aniso: 4, low: false }); const h = new THREE.Group();
    for (const m of [L.floor, L.plaster, L.tile, L.wood, L.panel].filter(Boolean)) h.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m));
    h.add(buildLevel('kjokken2')); sc2.add(h);
    const before = memStats(sc2), r = shrinkSceneTextures(sc2, (w, hh) => { const o = mkCanvas(); o.width = w; o.height = hh; return o; }), after = memStats(sc2), r2 = shrinkSceneTextures(sc2, (w, hh) => { const o = mkCanvas(); o.width = w; o.height = hh; return o; });
    console.log(`lav profil midt i spillet: ${before.texMB.toFixed(1)} MB til ${after.texMB.toFixed(1)} MB (${r.n} teksturer)`);
    ok(after.texMB <= before.texMB * (1 - LOW_TEX_CUT), 'Lav profil midt i spillet: minst 40 % mindre teksturminne (look + props i scenen)');
    ok(r2.n === 0 && memStats(sc2).texMB === after.texMB, 'krymping skjer bare én gang'); }
  ok(memOver({ texMB: MEM_BUDGET.texMB + 1, geoMB: 1 }).length === 1 && memOver({ texMB: MEM_BUDGET.texMBLow + 1, geoMB: 1 }, true).length === 1 && memOver({ texMB: 1, geoMB: 1 }).length === 0, 'memOver');
  ok(/teksturer 2 \(1\.0 MB\)/.test(memLine({ textures: 2, texMB: 1, geometries: 3, geoMB: 0.5, materials: 1 })), 'memLine');
  delete globalThis.document;
}
if (bad) { console.log(bad, 'feil'); process.exit(1); } console.log('test_perf: ok');
