// node test_perf2.mjs: R94, ytelse del 2. Teksturtak og delte kilder, skyggeutvalg og -tempo, maurdetalj, oppstart i små steg, budsjett og kobling i main.js.
// Alt er statiske mål (tegnekall, trekanter, MB); ekte fps og følelse på iPhone bekreftes av testeren («testes på iPhone»).
import * as THREE from './lib/three.module.min.js';
import fs from 'node:fs';
import { register } from 'node:module';
import { capSide, texMB, antQ, antSeg, ANT_Q, SHADOW, sphereOf, wantsShadow, createShadowCull, createShadowPacer, movedBy, planWarm, chunkByKey, runSteps } from './perf2_logic.js';
import { memStats, ROOM_CAPS } from './perf_budget.js';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FEIL', m); } };

// ---- teksturer ----
ok(capSide(1024) === 512 && capSide(256) === 256 && capSide(1024, 1024) === 1024, 'capSide: 1024 → 512, små urørt, 1024 tillatt');
ok(Math.abs(texMB(1024, 1024) - 5.333) < 0.01 && texMB(512, 512) * 4 === texMB(1024, 1024), 'texMB: 1024 er fire ganger 512');
{
  // delte kilder: klonede teksturer (ulik repeat) er ett bilde på GPU og telles én gang
  const img = { width: 512, height: 512 };
  const t = new THREE.Texture(img); t.generateMipmaps = true;
  const clones = [t, t.clone(), t.clone(), t.clone()]; clones.forEach((c, i) => c.repeat.set(i + 1, 1));
  const root = new THREE.Group();
  for (const c of clones) root.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map: c })));
  const s = memStats(root);
  ok(s.textures === 4 && s.sources === 1, `delte kilder: 4 teksturer, 1 bilde (${s.textures}/${s.sources})`);
  ok(Math.abs(s.texMB - texMB(512, 512)) < 0.01, `teksturminne telles én gang (${s.texMB.toFixed(2)} MB)`);
  const other = new THREE.Texture({ width: 256, height: 256 }); root.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map: other })));
  const s2 = memStats(root); ok(s2.sources === 2 && s2.texMB > s.texMB, 'et annet bilde legges til');
}

// ---- maur ----
ok(antQ(undefined) === ANT_Q.def && antQ(5) === 1 && antQ(0.1) === ANT_Q.min && antQ('0.8') === 0.8, 'antQ: standard, tak og gulv');
ok(antSeg(20, 6, 1) === 20 && antSeg(20, 6, 0.6) === 12 && antSeg(8, 5, 0.3) === 5, 'antSeg: full, 60 %, nedre grense');
{
  register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { return s === 'three' ? { url: ${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)}, shortCircuit: true } : n(s, c); }`));
  globalThis.document = globalThis.document || { createElement: () => ({ getContext: () => null, width: 0, height: 0 }) };
  const { buildAnt, buildSpider, setAntDetail } = await import('./props.js');
  const count = (a) => { let t = 0, m = 0; a.root.traverse((o) => { if (o.isMesh) { m++; t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } }); return { t, m }; };
  const size = (a) => { a.root.updateMatrixWorld(true); return new THREE.Box3().setFromObject(a.root).getSize(new THREE.Vector3()); };
  for (const [name, fn] of [['maur', buildAnt], ['edderkopp', buildSpider]]) {
    setAntDetail(1); const full = fn(), cf = count(full), sf = size(full);
    setAntDetail(0.6); const lo = fn(), cl = count(lo), sl = size(lo);
    console.log(`${name}: ${cf.t} trekanter i full detalj, ${cl.t} ved 0,6 (${Math.round(100 * (1 - cl.t / cf.t))} % færre), ${cf.m} meshes`);
    ok(cl.t <= cf.t * 0.65, `${name}: minst 35 % færre trekanter (${cl.t} mot ${cf.t})`);
    ok(cf.m === cl.m, `${name}: samme antall deler`);
    ok(sf.distanceTo(sl) < 0.04 * sf.length(), `${name}: samme størrelse (${sf.toArray().map((v) => v.toFixed(2))} mot ${sl.toArray().map((v) => v.toFixed(2))})`);
    lo.update(1.2, 2, 0, true); ok(Number.isFinite(lo.root.position.x), `${name}: animasjonen virker`);
  }
  setAntDetail(1);
}

// ---- skygger: utvalg ----
{
  const mk = (x, z, s, cast = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshStandardMaterial()); m.position.set(x, 0, z); m.castShadow = cast; return m; };
  const root = new THREE.Group();
  const near = mk(3, 0, 1), far = mk(40, 0, 1), tiny = mk(2, 0, 0.05), bigFar = mk(25, 0, 12), hero = mk(60, 0, 1), notCaster = mk(1, 1, 1, false);
  root.add(near, far, tiny, bigFar, hero, notCaster); root.updateMatrixWorld(true);
  const cull = createShadowCull({ radius: 17, minSize: 0.12 });
  ok(cull.collect(root, (o) => o === hero) === 5, 'collect: bare meshes som kaster skygge');
  const ch = cull.update({ x: 0, y: 0, z: 0 });
  ok(ch && near.castShadow && !far.castShadow && !tiny.castShadow && hero.castShadow, 'nær og stor kaster, fjern og bittelitt ikke, «keep» alltid');
  ok(bigFar.castShadow, 'stor ting som rekker inn i radius (kanten teller) kaster fortsatt');
  ok(cull.stats.total === 5 && cull.stats.active === 3 && cull.stats.culled === 2, `statistikk 5/3/2 (${JSON.stringify(cull.stats)})`);
  ok(cull.update({ x: 0, y: 0, z: 0 }) === false, 'uendret fokus gir ingen endring');
  ok(cull.update({ x: 40, y: 0, z: 0 }) && far.castShadow && !near.castShadow, 'fokus flyttes: fjern ting får skygge, nær mister den');
  cull.setOn(false); ok(near.castShadow && far.castShadow && tiny.castShadow, 'av: alle får tilbake originalt valg');
  ok(cull.update({ x: 0, y: 0, z: 0 }) === false && far.castShadow, 'av: update gjør ingenting');
  const s = sphereOf(far); ok(Math.abs(s.x - 40) < 1e-6 && s.r > 0.8, 'sphereOf: verdenssenter og radius');
  far.scale.setScalar(3); far.updateMatrixWorld(true); ok(sphereOf(far).r > 2.5, 'sphereOf følger skala');
  ok(!wantsShadow(null, { x: 0, y: 0, z: 0 }) && wantsShadow({ x: 10, y: 0, z: 0, r: 1 }, { x: 0, y: 0, z: 0 }), 'wantsShadow');
}

// ---- skygger: tempo ----
{
  const p = createShadowPacer({ every: 3, settle: 4 });
  let draws = 0; for (let i = 0; i < 20; i++) if (p.step(true)) draws++;
  ok(draws === 20, 'i bevegelse tegnes skyggen hvert bilde');
  draws = 0; const seq = []; for (let i = 0; i < 30; i++) { const d = p.step(false); seq.push(d ? 1 : 0); if (d) draws++; }
  ok(draws >= 7 && draws <= 12, `stille: ca. hvert 3. bilde (${draws} av 30)`);
  const tail = seq.slice(10); let maxGap = 0, gap = 0; for (const d of tail) { if (d) { maxGap = Math.max(maxGap, gap); gap = 0; } else gap++; }
  ok(maxGap <= 2, `aldri mer enn 2 bilder uten ny skygge (${maxGap})`);
  ok(p.step(true) === true, 'bevegelse gir tegning med en gang');
  for (let i = 0; i < 10; i++) p.step(false); p.force(); ok(p.step(false) === true, 'force: tegner i neste bilde');
  const p1 = createShadowPacer({ every: 1, settle: 0 }); ok([...Array(5)].every(() => p1.step(false)), 'tempo 1 = hvert bilde');
  p.every = 9; ok(p.every === 4, 'tempo har tak på hvert 4. bilde');
  ok(p.skipped > 0 && p.drawn > 0, 'teller tegnet og hoppet over');
  ok(movedBy([1, 2], [1, 2]) === false && movedBy([1, 2], [1, 2.1]) === true && movedBy([1], null) === true, 'movedBy');
}

// ---- oppstart i små steg ----
{
  const plan = planWarm({ textures: 20, per: 6, meshes: 150, chunk: 70, fades: true });
  ok(plan.filter((s) => s.kind === 'tex').length === 4 && plan.filter((s) => s.kind === 'draw').length === 3 && plan.some((s) => s.kind === 'fades'), 'planWarm: 4 teksturstegn, 3 tegnebiter, utoning');
  ok(plan[plan.length - 1].kind === 'done', 'planWarm ender med done');
  const draws = plan.filter((s) => s.kind === 'draw'); ok(draws[0].from === 0 && draws[2].to === 150 && draws.every((d) => d.to - d.from <= 70), 'tegnebitene dekker alle meshes, maks 70 hver');
  const texS = plan.filter((s) => s.kind === 'tex'); ok(texS.every((s) => s.to - s.from <= 6) && texS[3].to === 20, 'teksturstegene dekker alle');
  {
    const keys = ['a', 'b', 'a', 'c', 'd', 'b', 'e', 'a']; const ch = chunkByKey(keys, { maxKeys: 2, maxItems: 3 });
    ok(ch.flat().sort().join() === [0, 1, 2, 3, 4, 5, 6, 7].join(), 'chunkByKey: alle meshes med nøyaktig én gang');
    ok(ch.every((c) => new Set(c.map((i) => keys[i])).size <= 2 && c.length <= 3), `chunkByKey: høyst 2 programmer og 3 meshes per bit (${JSON.stringify(ch)})`);
    const big = chunkByKey(Array(10).fill('x'), { maxKeys: 3, maxItems: 4 }); ok(big.length === 3 && big.every((c) => c.length <= 4), 'chunkByKey: stor gruppe deles');
    const p2 = planWarm({ textures: 7, per: 3, chunks: ch, fades: false }); ok(p2.filter((s) => s.kind === 'draw').length === ch.length && p2.at(-1).kind === 'done' && !p2.some((s) => s.kind === 'fades'), 'planWarm med biter etter program');
  }
  ok(planWarm({}).length === 2, 'tom scene: compile-fritt, bare tegn-null og done');   // 0 teksturer, 0 meshes, fades: true
  const order = []; let t = 0; const queue = [];
  runSteps(plan.filter((s) => s.kind !== 'done'), (s) => { order.push(s.kind); t += s.kind === 'draw' ? 40 : 5; }, (fn) => queue.push(fn), (r) => order.push('ferdig:' + Math.round(r.worst) + r.worstKind), () => t);
  let loops = 0; while (queue.length && loops++ < 100) queue.shift()();
  ok(order[order.length - 1].startsWith('ferdig'), 'runSteps kaller done');
  ok(queue.length === 0 && loops <= plan.length + 2, 'ett steg per kall (hvert i sitt eget bilde)');
  const errs = []; runSteps([{ kind: 'x' }], () => { throw new Error('boom'); }, (fn) => fn(), (r) => errs.push(r.error)); ok(errs[0] === 'boom', 'feil i et steg stopper rolig og rapporteres');
}

// ---- budsjett og tak fra målingen (docs/ytelse_etter.json, før: docs/ytelse_r94_for.json) ----
{
  const after = JSON.parse(fs.readFileSync(new URL('./docs/ytelse_etter.json', import.meta.url), 'utf8')), before = JSON.parse(fs.readFileSync(new URL('./docs/ytelse_r94_for.json', import.meta.url), 'utf8'));
  for (const id of ['bad', 'kjokken', 'bygglab']) {
    const m = after[id], b = before[id]; ok(!!m && !!b && !!ROOM_CAPS[id], `${id}: målt før og etter, med tak`); if (!m || !b) continue;
    ok(m.texMB <= b.texMB * 0.7 || m.texMB <= 30, `${id}: teksturminne ≥ 30 % ned eller under 30 MB (${b.texMB} til ${m.texMB} MB)`);
    ok(ROOM_CAPS[id].texMB <= 30, `${id}: taket for teksturminne er under 30 MB (${ROOM_CAPS[id].texMB})`);
    ok(m.shadowOn.calls <= m.shadowOff.calls && m.shadowOn.tris < m.shadowOff.tris || (id === 'bygglab' && m.shadowOn.calls <= m.shadowOff.calls), `${id}: skyggepasset er billigere med utvalg (${m.shadowOff.calls} til ${m.shadowOn.calls} kall, ${m.shadowOff.tris} til ${m.shadowOn.tris} trekanter)`);
  }
  ok(after.bygglab.texMB <= before.bygglab.texMB * 0.7 && after.bro.texMB <= before.bro.texMB * 0.7 && after.stue.texMB <= before.stue.texMB * 0.7, 'gulvet på 512: Bygglab, Bro og Stue har ≥ 30 % mindre teksturminne enn med 1024');
  const ant = (m) => (m.byPart['maur/skapninger'] || { tris: 0 }).tris;
  ok(ant(after.bad2) <= ant(before.bad2) * 0.5 && ant(before.bad2) > 10000, `maurene i Nivå 4: ≥ 50 % færre trekanter (${ant(before.bad2)} til ${ant(after.bad2)})`);
  ok(after.bad2.tris < before.bad2.tris * 0.8, `Nivå 4 Bad: hele bildet ≥ 20 % færre trekanter (${before.bad2.tris} til ${after.bad2.tris})`);
  for (const id of Object.keys(ROOM_CAPS)) { const m = after[id]; ok(!!m, `${id}: målt`); if (!m) continue; ok(m.calls <= ROOM_CAPS[id].calls && m.tris <= ROOM_CAPS[id].tris && m.texMB <= ROOM_CAPS[id].texMB, `${id}: innenfor taket`); ok(m.shadowOn.calls <= m.shadowOff.calls, `${id}: skyggekall med utvalg ≤ uten`); ok(ROOM_CAPS[id].texMB >= m.texMB * 1.0 && ROOM_CAPS[id].texMB <= m.texMB * 1.08 + 1, `${id}: taket er målingen + ca. 8 %`); }
  const md = fs.readFileSync(new URL('./docs/YTELSE.md', import.meta.url), 'utf8');
  ok(/R94/.test(md) && /skyggekall/i.test(md) && /testes på iPhone/.test(md) && /delte kilder/i.test(md), 'docs/YTELSE.md: R94-seksjon med skyggetelling, kilder og «testes på iPhone»');
}

// ---- koblinger i main.js, innstillinger, NYTT-rad, modulliste ----
{
  const m = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8'), idx = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8'), ch = fs.readFileSync(new URL('./changes_data.js', import.meta.url), 'utf8');
  for (const id of ['texmax', 'antdetail', 'shcull', 'shradius', 'shevery', 'warmspread']) ok(new RegExp(`(sl|fl)\\('${id}', 'admin'`).test(m), `SETTINGS: ${id} (admin)`);
  ok(/logEv\('ytelse', `skyggekastere/.test(m) && /logEv\('ytelse', `oppstart/.test(m) && /logEv\('ytelse', `teksturtak/.test(m), "logEv('ytelse', …) for skygger, oppstart og teksturtak");
  ok(/renderer\.shadowMap\.autoUpdate = false/.test(m) && /stepShadows\(now\)/.test(m) && /shPacer\.step\(/.test(m), 'skyggekartet styres av tempoet');
  ok(/makeLook\(\{ aniso: maxAniso, low: texLow, texMax \}\)/.test(m) && /setAntDetail\(antQv\)/.test(m), 'teksturtak og maurdetalj sendt inn');
  ok(/warmUpSpread/.test(m) && /runSteps\(/.test(m), 'forvarmingen går i små steg');
  ok(/'perf2_logic'/.test(idx), 'perf2_logic står i files i index.html');
  ok(/r94-ytelse/.test(ch) && /Kjøkken, Bad og Bygglab/.test(ch), 'NYTT-rad for R94');
}
if (bad) { console.log(bad, 'feil'); process.exit(1); } console.log('test_perf2: ok');
