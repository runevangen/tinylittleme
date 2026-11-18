// node test_ytelse.mjs: R85, ytelse. Figurens trekanter, fargebakt sammenslåing (vertexColors), rombudsjett fra målingen (docs/ytelse_etter.json) og at kvalitetsstyringen er koblet inn.
// Tegnekall og trekanter er statiske mål (like på alle maskiner for samme bilde). Ekte fps på iPhone måles ikke her: det bekreftes av testeren («testes på iPhone»).
import * as THREE from './lib/three.module.min.js';
import fs from 'node:fs';
import { register } from 'node:module';
import { mergeStatic, colorBakeable, ROOM_CAPS, roomCaps, BUDGET, overBudget } from './perf_budget.js';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FEIL', m); } };

// ---- fargebakt sammenslåing: meshes som bare er ulike i farge blir ett tegnekall med fargen i hjørnepunktene ----
{
  const root = new THREE.Group(); root.position.set(1, 0, 2);
  const mk = (hex, rough = 0.6) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough });
  const add = (g, m, x) => { const o = new THREE.Mesh(g, m); o.position.set(x, 0, 0); o.castShadow = true; root.add(o); return o; };
  add(new THREE.BoxGeometry(1, 1, 1), mk(0xff0000), 0); add(new THREE.SphereGeometry(0.5, 8, 6), mk(0x00ff00), 2); add(new THREE.BoxGeometry(1, 1, 1), mk(0x0000ff), 4);
  add(new THREE.BoxGeometry(1, 1, 1), mk(0x888888, 0.2), 6);                                   // annen ruhet: egen gruppe
  const tm = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }); add(new THREE.BoxGeometry(1, 1, 1), tm, 8);   // gjennomsiktig: aldri bakt
  const prot = mk(0x1f9a94); const p1 = add(new THREE.BoxGeometry(1, 1, 1), prot, 10), p2 = add(new THREE.BoxGeometry(1, 1, 1), prot, 12);   // beskyttet (koden endrer fargen senere)
  root.updateMatrixWorld(true);
  const tris0 = (() => { let n = 0; root.traverse((o) => { if (o.isMesh) n += o.geometry.index.count / 3; }); return n; })();
  ok(colorBakeable(mk(1)) && !colorBakeable(tm), 'colorBakeable: ugjennomsiktig ja, gjennomsiktig nei');
  const plain = root.clone(true); const s0 = mergeStatic(THREE, plain);
  const st = mergeStatic(THREE, root, { vcolor: true, protect: new Set([prot]) });
  ok(st.before === 7 && st.after === 4, `fargebakt: 7 meshes til 4 (rød/grønn/blå sammen, grå, gjennomsiktig, beskyttet par): fikk ${st.before} til ${st.after}`);
  ok(s0.after > st.after, `uten vcolor blir det flere kall (${s0.after}) enn med (${st.after})`);
  let tris1 = 0, withCol = null; root.traverse((o) => { if (o.isMesh) { tris1 += o.geometry.index.count / 3; if (o.geometry.attributes.color) withCol = o; } });
  ok(tris1 === tris0, 'samme antall trekanter etter sammenslåing');
  ok(withCol && withCol.material.vertexColors && withCol.material.color.getHex() === 0xffffff, 'bakt mesh: vertexColors på, materialfarge hvit');
  const c = withCol.geometry.attributes.color, seen = new Set(); for (let i = 0; i < c.count; i++) seen.add([c.getX(i), c.getY(i), c.getZ(i)].map((v) => v.toFixed(3)).join(','));
  ok(seen.size === 3, `tre ulike hjørnefarger (${seen.size})`);
  ok(prot.color.getHex() === 0x1f9a94 && !prot.vertexColors, 'beskyttet materiale er urørt (fargen kan endres senere)');
  ok(root.children.some((o) => o.isMesh && o.material === prot && o.userData.merged === 2), 'beskyttede meshes slås bare sammen med hverandre');
  ok(!root.children.some((o) => o.material === tm && o.geometry.attributes.color), 'gjennomsiktig mesh har ikke hjørnefarger');
  const bb = new THREE.Box3().setFromObject(root); ok(Math.abs(bb.max.x - bb.min.x - 13) < 0.05, `utstrekning uendret (${(bb.max.x - bb.min.x).toFixed(2)} bredde)`);
}

// ---- figuren: færre trekanter med standard detaljnivå, samme størrelse ----
{
  register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { return s === 'three' ? { url: ${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)}, shortCircuit: true } : n(s, c); }`));
  const { buildHero } = await import('./hero.js');
  const count = (h) => { let t = 0, m = 0; h.root.traverse((o) => { if (o.isMesh) { m++; t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } }); return { t, m }; };
  const full = buildHero({}), lo = buildHero({ heroQ: 0.6 }), cf = count(full), cl = count(lo);
  console.log(`figuren: ${cf.t} trekanter i full detalj, ${cl.t} ved 0,6 (${Math.round(100 * (1 - cl.t / cf.t))} % færre), ${cf.m} meshes`);
  ok(cl.t <= cf.t * 0.6, `figuren: minst 40 % færre trekanter ved standard detaljnivå (${cl.t} mot ${cf.t})`);
  ok(cl.t <= 17000, `figuren: tak 17000 trekanter (${cl.t})`);
  ok(cf.m === cl.m, 'figuren: samme antall deler (bare tessellering endres)');
  const bf = new THREE.Box3().setFromObject(full.root), bl = new THREE.Box3().setFromObject(lo.root), sf = bf.getSize(new THREE.Vector3()), sl = bl.getSize(new THREE.Vector3());
  ok(sf.distanceTo(sl) < 0.02 * sf.length(), `figuren: samme størrelse (${sf.toArray().map((v) => v.toFixed(2))} mot ${sl.toArray().map((v) => v.toFixed(2))})`);
  ok(!!lo.M.scarf && !!lo.M.pack && lo.face && lo.armL && lo.legR, 'figuren: ledd og materialer koden bruker finnes fortsatt');
}

// ---- rombudsjett: tak per rom satt etter målingen (docs/ytelse_etter.json), dokumentert i docs/YTELSE.md ----
{
  const after = JSON.parse(fs.readFileSync(new URL('./docs/ytelse_etter.json', import.meta.url), 'utf8')), before = JSON.parse(fs.readFileSync(new URL('./docs/ytelse_for.json', import.meta.url), 'utf8'));
  const N19 = ['bad', 'barnerom', 'kjokken', 'bad2', 'barnerom2', 'kjokken2', 'leke', 'stue', 'verksted'];
  for (const id of N19) {
    const m = after[id], cap = ROOM_CAPS[id]; ok(!!m && !!cap, `${id}: målt og med tak`); if (!m || !cap) continue;
    ok(m.calls <= cap.calls, `${id}: ${m.calls} tegnekall > tak ${cap.calls}`); ok(m.tris <= cap.tris, `${id}: ${m.tris} trekanter > tak ${cap.tris}`);
    ok(m.texMB <= cap.texMB, `${id}: ${m.texMB} MB teksturer > tak ${cap.texMB}`); ok(m.lights <= BUDGET.lights, `${id}: ${m.lights} lys`);
    ok(overBudget({ calls: m.calls, tris: m.tris, lights: m.lights }, { ...BUDGET, ...roomCaps(id) }).length === 0, `${id}: overBudget(roomCaps) tom`);
    const b = before[id]; ok(b && m.calls <= b.calls && m.tris <= b.tris, `${id}: aldri dyrere enn før (${m.calls}/${m.tris} mot ${b && b.calls}/${b && b.tris})`);
  }
  const v = after.verksted, v0 = before.verksted;
  ok(v.tris <= v0.tris * 0.7 || v.calls <= v0.calls * 0.7, `Verksted: minst 30 % færre trekanter eller tegnekall (${v0.tris} til ${v.tris} trekanter, ${v0.calls} til ${v.calls} kall)`);
  const worst = Object.entries(after).filter(([k]) => N19.includes(k)).map(([k, m]) => [k, m.calls / 150 + m.tris / 30000 + m.texMB / 60]).sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]);
  const worst0 = Object.entries(before).filter(([k]) => N19.includes(k)).map(([k, m]) => [k, m.calls / 150 + m.tris / 30000 + m.texMB / 60]).sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]);
  for (const id of worst0) ok(after[id].tris <= before[id].tris * 0.9 || after[id].calls <= before[id].calls * 0.9, `${id}: dyrest før, målbart billigere nå`);
  console.log(`de tre dyreste før: ${worst0.join(', ')}; nå: ${worst.join(', ')}`);
  const md = fs.readFileSync(new URL('./docs/YTELSE.md', import.meta.url), 'utf8');
  ok(/testes på iPhone/.test(md) && /Før og etter/.test(md) && /dyreste/.test(md) && /SwiftShader/.test(md), 'docs/YTELSE.md: har før/etter, rangering, forklaring av tallene og «testes på iPhone»');
  ok(overBudget({ calls: BUDGET.calls + 1, tris: 1, lights: 1 }).length === 1, 'overBudget slår til over taket');
}

// ---- kvalitetsstyring og innstillinger er koblet inn i main.js ----
{
  const m = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8');
  ok(/sl\('herodetail', 'admin'/.test(m) && /sl\('qfps', 'admin'/.test(m), 'SETTINGS: herodetail og qfps (admin)');
  ok(/logEv\('ytelse', `\$\{levelId\}: oppløsning/.test(m) && /logEv\('ytelse', `figurdetalj/.test(m), "logEv('ytelse', …) ved kvalitetsendring og endret figurdetalj");
  ok(/createAutoQ\(\{ limit: qFps \}\)/.test(m) && /fpsWatch\(qFps, 2000\)/.test(m), 'Auto-oppløsningen bruker mål-FPS (27) og 2 s vinduer');
  ok(/vcolor: true/.test(m) && /protect: new Set\(\[hero\.M\.scarf, hero\.M\.pack\]\)/.test(m), 'main.js: fargebakt sammenslåing med skjerf og sekk beskyttet');
  ok(/snitt per rom/.test(m), 'testrapporten viser snitt-fps per rom');
}
if (bad) { console.log(bad, 'feil'); process.exit(1); } console.log('test_ytelse: ok');
