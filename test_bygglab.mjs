// node test_bygglab.mjs: Bygglab (R67), prøverommet som starter i byggemodus med åtte byggesteder.
// Scene og brett er à jour med generatoren; hvert sted har minst to løsninger som vinner i den deterministiske fysikken (og et dårlig bygg som feiler); referansebyggene
// settes ut i verdenen og kan gås over av den ekte figuren (tools/walk_bygglab.mjs: uten bygging, med bygg, hele banen); byggeskjermen: åpnes ved start, ◀ ▶ mellom stedene,
// ubegrenset mengde av alle deler, nullstill sted/alle, målflagg, lagring; tekster nb/en nevner knappene; valg i SETTINGS; ingen nye shadere eller tegnekall.
import { register } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const mkEl = () => { const el = { style: {}, dataset: {}, children: [], _l: {}, _html: '', classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, f) { f ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
  appendChild(c) { this.children.push(c); return c; }, addEventListener(t, f) { (this._l[t] ||= []).push(f); }, removeEventListener() {}, setPointerCapture() {}, releasePointerCapture() {}, setAttribute() {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844 }), closest: () => null, remove() {},
  getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) }),
  querySelector: () => mkEl(), querySelectorAll: () => [], set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; }, width: 0, height: 0 }; return el; };
const body = mkEl();
globalThis.document = { body, createElement: mkEl, head: mkEl(), getElementById: () => null, querySelector: () => mkEl() };
globalThis.window = globalThis; globalThis.innerWidth = 390; globalThis.innerHeight = 844; globalThis.devicePixelRatio = 2;
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {};

const { createBuildMode } = await import('./build.js');
const LG = await import('./bygglab_logic.js');
const BL = await import('./build_logic.js');
const BP = await import('./build_phys.js');
const BW = await import('./build_world.js');
const CP = await import('./build_capacity.js');
const LD = await import('./build_loads.js');
const { walkLab, labSites } = await import('./tools/walk_bygglab.mjs');
const { makeT, DICT_KEYS } = await import('./i18n.js');
const { validateScene } = await import('./tools/validate_scene.mjs');

const lv = (id) => JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8'));
const L = lv('bygglab'), scene = JSON.parse(fs.readFileSync('scenes/bygglab.scene.json', 'utf8'));

// 1) scene og brett er à jour med generatoren, og scenen er gyldig
{
  assert.deepEqual(validateScene(scene).errors, [], 'scenen er gyldig');
  const before = fs.readFileSync('scenes/bygglab.scene.json', 'utf8');
  execFileSync('node', ['tools/make_bygglab.mjs'], { stdio: 'pipe' });
  assert.equal(fs.readFileSync('scenes/bygglab.scene.json', 'utf8'), before, 'scenes/bygglab.scene.json er laget av tools/make_bygglab.mjs (kjør verktøyet på nytt)');
  const out = '/tmp/bygglab_check.level.json'; execFileSync('node', ['tools/scene2level.mjs', 'scenes/bygglab.scene.json', out], { stdio: 'pipe' });
  assert.deepEqual(JSON.parse(fs.readFileSync(out, 'utf8')), L, 'levels/bygglab.level.json er laget av scenen (kjør scene2level på nytt)'); fs.rmSync(out);
}

// 2) brettdata: minst sju steder, hvert med nøkkel, flagg, referansebygg og minst to løsninger
const sites = labSites(L);
assert.deepEqual(LG.checkLab(L), [], 'brettdata i orden'); assert.ok(sites.length >= 7, `minst 7 byggesteder (${sites.length})`);
assert.ok(LG.isLab(L) && !LG.isLab(lv('kontroll')) && !LG.isLab(lv('stue')), 'bare Bygglab er et lab-brett');
assert.deepEqual(sites.map((s) => s.lab.key), ['bro', 'trapp', 'vippe', 'fagverk', 'tau', 'last', 'taaler', 'materialer'], 'rekkefølgen: bro, trapp, vippe, fagverk, tau og gummi, lasttest, «Tåler X», materialer');
assert.ok(L.build.parts.length === 0, 'ingen deler å lete etter: alt kommer fra byggeskjermen'); assert.ok(sites.every((s) => s.d === 4 && s.lab.solutions.length >= 2));
for (const s of sites) assert.ok(L.boxes.some((b) => b.id === `ped_a${s.lab.n}`) && L.boxes.some((b) => b.id === `ped_b${s.lab.n}`), `${s.id}: sokler før og etter gapet`);
// dekker alle byggefunksjonene fra R24–R50: planke, tape, trapp, vippe, fagverk (ledd), tau, gummistrikk, laster (ball, bil, robot), «Tåler X», materialer
{
  const used = (pred) => sites.some((s) => s.lab.solutions.some(pred)), kinds = new Set(sites.flatMap((s) => s.lab.solutions.flatMap((q) => q.links.map((l) => l.kind)))), types = new Set(sites.flatMap((s) => s.lab.solutions.flatMap((q) => q.placed.map((p) => p.type))));
  for (const k of BL.LINK_KINDS) assert.ok(kinds.has(k), `koblingstypen ${k} brukes i en løsning`);
  for (const t of ['plank_s', 'plank_l', 'plank_t', 'block', 'seesaw', 'pencil', 'ruler']) assert.ok(types.has(t), `delen ${t} brukes i en løsning`);
  assert.ok(used((q) => q.placed.length >= 3 && q.links.some((l) => l.kind === 'hinge')), 'fagverk av ledd');
  const last = sites.find((s) => s.lab.key === 'last'); assert.deepEqual(last.loads, ['ball', 'car', 'robot'], 'lasttesten krever ball, bil og robot'); assert.ok(LD.LOAD_IDS.length >= 4);
  assert.ok(sites.find((s) => s.lab.key === 'taaler').lab.cap >= 8, '«Tåler X»-stedet har et mål');
}

// 3) bevis i fysikken: hver løsning vinner (deterministisk, uten brudd), et dårlig bygg feiler, og bygget står i verdenen
for (const s of sites) {
  const loads = s.loads?.length ? s.loads : [undefined];
  for (const sol of s.lab.solutions) {
    for (const ld of loads) {
      const a = BP.runSim({ site: s, placed: sol.placed, links: sol.links }, ld ? { load: ld } : {}), b = BP.runSim({ site: s, placed: sol.placed, links: sol.links }, ld ? { load: ld } : {});
      assert.equal(a.result, 'won', `${s.id} «${sol.name}» ${ld || ''}: vinner (${a.reason})`); assert.equal(a.breaks.length + a.linkBreaks.length, 0, `${s.id} «${sol.name}»: ingen brudd`); assert.deepEqual(a, b, `${s.id} «${sol.name}»: samme resultat hver gang`);
    }
    const sp = BP.settledPlaced({ site: s, placed: sol.placed, links: sol.links }); assert.equal(sp.length, sol.placed.length); assert.ok(BW.buildSolids(s, sp).length >= sol.placed.length, `${s.id}: bygget blir solide flater`);
  }
  assert.equal(BP.runSim({ site: s, placed: [], links: [] }).result, 'lost', `${s.id}: uten bygg består ikke prøven`);
  const shortOnly = BP.runSim({ site: s, placed: [{ id: 'x', type: 'pencil', u: -3, v: 0.2, rot: 0 }], links: [] }, s.loads?.length ? { load: s.loads[0] } : {}); assert.equal(shortOnly.result, 'lost', `${s.id}: en for kort del (blyant) holder ikke`);
  const sig = new Set(s.lab.solutions.map((q) => JSON.stringify([q.placed.map((p) => [p.type, +p.u.toFixed(1), +p.v.toFixed(1), +p.rot.toFixed(2)]), q.links.map((l) => l.kind)]))); assert.ok(sig.size >= 2, `${s.id}: minst to ulike løsninger (ulike deler, koblinger eller form)`);
  assert.deepEqual(s.ref.placed, s.lab.solutions[0].placed, `${s.id}: referansebygget er første løsning`);
}
// «Tåler X»: alle løsningene på stedet tåler målet, mens en enkel kort planke ikke gjør det; kravet med laster: dårlig bygg (tape-dobbel planke) feiler med ballen
{
  const t = sites.find((s) => s.lab.key === 'taaler');
  for (const sol of t.lab.solutions) assert.ok(CP.capacity({ site: t, placed: sol.placed, links: sol.links }).n >= t.lab.cap, `«${sol.name}» tåler minst ${t.lab.cap} klosser`);
  assert.ok(CP.capacity({ site: t, placed: [{ id: 'a', type: 'plank_l', u: 0, v: 0.25, rot: 0 }], links: [] }).n < t.lab.cap, 'en vanlig lang planke tåler ikke målet');
  const l = sites.find((s) => s.lab.key === 'last'); assert.equal(BP.runSim({ site: l, placed: [{ id: 'a', type: 'plank_l', u: 0, v: 0.25, rot: 0 }, { id: 'b', type: 'plank_l', u: 0, v: 0.75, rot: 0 }], links: [{ id: 'k', kind: 'tape', a: 'a', la: { x: 0, y: 0.25 }, b: 'b', lb: { x: 0, y: -0.25 } }] }, { load: 'car' }).result, 'lost', 'lasttesten: et feil bygg feiler med bilen');
}
// fagverk: en firkant gir etter, en trekant holder (R49a2); vippa trenger vridning (rot 0 holder ikke)
{
  const f = sites.find((s) => s.lab.key === 'fagverk'), P = (id, type, u, v, rot = 0) => ({ id, type, u, v, rot }), h = (id, a, ax, ay, b, bx, by) => ({ id, kind: 'hinge', a, la: { x: ax, y: ay }, b, lb: { x: bx, y: by } });
  const sq = { placed: [P('b', 'plank_l', 0, 0.25), P('sl', 'plank_s', -3, 2.75, Math.PI / 2), P('sr', 'plank_s', 3, 2.75, Math.PI / 2), P('t', 'plank_l', 0, 5)], links: [h('h1', 'b', -3, 0.25, 'sl', -2, 0), h('h2', 'b', 3, 0.25, 'sr', -2, 0), h('h3', 'sl', 2, 0, 't', -3, 0), h('h4', 'sr', 2, 0, 't', 3, 0)] };
  assert.ok(CP.capacity({ site: f, ...sq }).n <= 2 && CP.capacity({ site: f, placed: f.lab.solutions[0].placed, links: f.lab.solutions[0].links }).n >= 8, 'firkanten tåler nesten ingenting, trekanten holder');
  const v = sites.find((s) => s.lab.key === 'vippe'); assert.equal(BP.runSim({ site: v, placed: [P('v1', 'seesaw', 0, 2, 0)], links: [] }).result, 'lost', 'en rett vippe når ikke den høye siden');
}

// 4) den ekte figuren: den vanskelige veien uten bygging, hver løsning over bygget (med alle byggene stående), og hele banen på sokkelen
{
  const w = walkLab(L); assert.ok(w.hard.every((q) => q.ok), `uten bygging: ${JSON.stringify(w.hard.filter((q) => !q.ok))}`); assert.equal(w.hard.length, sites.length);
  assert.ok(w.built.every((q) => q.ok), `over bygget: ${JSON.stringify(w.built.filter((q) => !q.ok))}`); assert.equal(w.built.length, sites.reduce((n, s) => n + s.lab.solutions.length, 0));
  assert.ok(w.none.every((q) => q.ok), 'uten bygg på stedet går ikke ruta over gapet (da er det en byggeoppgave)'); assert.ok(w.chain.ok, `hele banen: ${w.chain.why}`); assert.ok(w.ok);
  const { walkRoute } = await import('./tools/walk_route.mjs'); const r = walkRoute('levels/bygglab.level.json'); assert.ok(r.ok, `hovedruta (vanskelig vei uten bygging): ${r.why}`);
  assert.ok(L.boxes.every((b) => !b.built), 'brettet inneholder ingen ferdige bygg (de legges ut av spillet)');
}

// 5) ren logikk: ubegrenset mengde, brettet, ◀ ▶, flagg, hjem, start
{
  const site = sites[0], types = {}, B = BL.createBuild(site, types, []);
  assert.deepEqual(LG.labTypes(), Object.keys(BL.PART_TYPES), 'alle delene fra R24–R46'); assert.equal(LG.labTypeOf('lab_plank_l_3'), 'plank_l'); assert.equal(LG.labTypeOf('lab_zzz_1'), null); assert.equal(LG.labTypeOf('p1'), null);
  const add = LG.labFill(B, types); assert.equal(add.length, LG.labTypes().length * LG.LAB.spare, 'tre ubrukte av hver type'); assert.ok(add.every((id) => types[id] === LG.labTypeOf(id)) && B.have.length === add.length);
  assert.deepEqual(LG.labFill(B, types), [], 'ingenting å fylle på når alt er ubrukt');
  for (let i = 0; i < 40; i++) { const it = LG.labTrayItems(B).find((q) => q.type === 'plank_l'); assert.ok(it, `fortsatt en plank igjen etter ${i} brukte`); BL.place(B, it.id, -8 + (i % 5), 1 + i * 0.2, 0); LG.labFill(B, types); }
  assert.equal(B.placed.length, 40, '40 planker plassert: ubegrenset'); assert.equal(LG.labTrayItems(B).filter((q) => q.lab).length, LG.labTypes().length, 'én brikke per type i brettet'); assert.ok(LG.labTrayItems(B).find((q) => q.type === 'plank_l').free >= LG.LAB.spare);
  const B2 = BL.createBuild(site, {}, []), t2 = {}; LG.labFill(B2, t2, { unlimited: false }); assert.equal(B2.have.length, LG.labTypes().length * LG.LAB.fixed, 'uten ubegrenset: to av hver'); LG.labFill(B2, t2, { unlimited: false }); assert.equal(B2.have.length, LG.labTypes().length * LG.LAB.fixed, 'og aldri flere');
  const t3 = {}; assert.equal(LG.labRegister(t3, ['lab_block_2', 'p9', 'lab_seesaw_1']), 2); assert.deepEqual(t3, { lab_block_2: 'block', lab_seesaw_1: 'seesaw' }, 'typen leses av id-en ved Fortsett');
  assert.equal(LG.labStepSite(sites, sites[0].id, -1).id, sites.at(-1).id, '◀ på første sted går til siste'); assert.equal(LG.labStepSite(sites, sites.at(-1).id, 1).id, sites[0].id, '▶ på siste går til første'); assert.equal(LG.labStepSite(sites, sites[2].id, 1).id, sites[3].id);
  const seen = new Set(); let id = sites[0].id; for (let i = 0; i < sites.length; i++) { seen.add(id); id = LG.labStepSite(sites, id, 1).id; } assert.equal(seen.size, sites.length, 'alle stedene nås med ▶'); assert.deepEqual(LG.labInfoOf(sites[2], sites), { n: 3, of: 8, key: 'vippe', cap: 0, loads: [] });
  const reached = new Set(), f = sites[1].lab.flag, pl = { x: f[0], y: f[1], z: f[2], onGround: true };
  assert.equal(LG.labFlagStep(sites, reached, { x: 0, y: 0, z: 0, onGround: true }).length, 0, 'ikke ved noe flagg'); assert.equal(LG.labFlagStep(sites, reached, { ...pl, y: f[1] + 8 }).length, 0, 'ikke i lufta langt over');
  const ev = LG.labFlagStep(sites, reached, pl); assert.deepEqual(ev.map((e) => [e.n, e.of, e.total, e.all]), [[2, 8, 1, false]]); assert.equal(LG.labFlagStep(sites, reached, pl).length, 0, 'bare én gang');
  assert.deepEqual([...LG.labReachedLoad(LG.labReachedSave(reached), sites)], [sites[1].id]); assert.equal(LG.labReachedLoad(['finnes_ikke', 7], sites).size, 0);
  const home = LG.labHome(sites[3]); assert.ok(home.x < sites[3].x && home.x > sites[3].x - 15 && Math.abs(home.y - sites[3].y) < 0.1 && home.z === sites[3].z, 'hjem: på sokkelen før gapet'); assert.ok(!LG.labFar(sites[3], home) && LG.labFar(sites[3], { x: sites[5].x, y: 0, z: 0 }));
  assert.ok(LG.labAutoOpen({ lab: true, on: true, done: false, playing: true, onGround: true }) && !LG.labAutoOpen({ lab: true, on: false, done: false, playing: true, onGround: true }) && !LG.labAutoOpen({ lab: true, on: true, done: true, playing: true, onGround: true }) && !LG.labAutoOpen({ lab: false, on: true, done: false, playing: true, onGround: true }) && !LG.labAutoOpen({ lab: true, on: true, done: false, playing: false, onGround: true }) && !LG.labAutoOpen({ lab: true, on: true, done: false, playing: true, onGround: false }), 'åpner av seg selv bare når det skal');
  assert.ok(LG.checkLab({ lab: {}, build: { sites: [] } }).length >= 1, 'kontrollen fanger et tomt lab');
}

// 6) byggeskjermen mot en DOM-stubb: åpnes ved start, ◀ ▶, ubegrenset mengde, bygg og prøv, i verdenen, nullstill, målflagg, lagring
{
  const LV = JSON.parse(JSON.stringify(L)), player = { x: LV.start[0], y: 0, z: LV.start[2], onGround: true, state: 'ground' }, log = [], toasts = [], solvedIds = [];
  const mk = (LVL, pl = player, free = true) => createBuildMode({ scene: { add() {}, remove() {} }, LEVEL: LVL, player: pl, $: () => mkEl(), T: (k, p) => k + (p ? JSON.stringify(p) : ''), logEv: (t, d) => log.push([t, d]), toast: (m) => toasts.push(m), TOUCH: true, buzz() {}, audio: {}, isPlay: () => true, isMenu: () => false, isBoss: () => false, isWon: () => false, isOv: () => false,
    getSnap: () => false, setSnap() {}, allParts: () => false, onChange() {}, levelId: 'bygglab', getLabFree: () => free, onSolved: (id) => solvedIds.push(id) });
  const bm = mk(LV), root = body.children[body.children.length - 3], click = (lb) => { for (const f of root._l.click || []) f({ target: { closest: () => ({ dataset: { lb } }) } }); };
  assert.ok(bm.enabled && bm.lab, 'byggeskjermen og lab er på'); assert.ok(root.classList.contains('lab'), 'lab-raden er på'); assert.ok(root.innerHTML.includes('data-lb="prev"') && root.innerHTML.includes('data-lb="next"') && root.innerHTML.includes('data-lb="site"') && root.innerHTML.includes('data-lb="all"'), 'knappene ◀ ▶ NULLSTILL STED NULLSTILL ALLE finnes (store knapper, ingen tastatur)');
  bm.update(0.016, true); assert.ok(bm.open() && bm.active, 'åpner ved start fra figuren sin plass (startet nær sted 1)'); assert.equal(bm.lab.info().n, 1); assert.ok(bm.lab.line().includes('lab.task.bro') && bm.lab.line().includes('lab.name.bro'), 'oppgaven vises: «Sted 1/8: Bro — …»');
  // ubegrenset mengde: alle delene finnes (først brettet), og blir ikke borte
  const st = () => bm.state().builds.find((q) => q.id === 'lab1'); assert.equal(st().have, LG.labTypes().length * LG.LAB.spare, 'tre av hver type med en gang');
  // ◀ ▶
  const seq = []; for (let i = 0; i < 8; i++) { assert.ok(bm.lab.go(1)); seq.push(bm.lab.info().n); } assert.deepEqual(seq, [2, 3, 4, 5, 6, 7, 8, 1], '▶ går gjennom alle åtte og rundt'); assert.ok(bm.lab.go(-1) && bm.lab.info().n === 8, '◀ går bakover rundt'); bm.lab.go(1);
  click('next'); assert.equal(bm.lab.info().n, 2, 'knappen ▶ (data-lb) virker'); click('prev'); assert.equal(bm.lab.info().n, 1, 'knappen ◀ virker'); assert.ok(log.some(([t, d]) => t === 'bygglab' && /^sted 2\/8 \(trapp\)/.test(d)), 'valg av sted logges (bygglab)');
  assert.ok(bm.lab.go(1) && bm.lab.go(1) && bm.lab.go(1) && bm.lab.go(1) && bm.lab.go(1) && bm.lab.go(1), 'til sted 7'); assert.equal(bm.lab.info().n, 7); assert.equal(bm.lab.info().cap, 10); assert.ok(bm.lab.line().includes('lab.task.taaler'), 'Tåler-stedet har sin oppgave'); bm.lab.go(-1); bm.lab.go(-1); bm.lab.go(-1); bm.lab.go(-1); bm.lab.go(-1); bm.lab.go(-1);
  assert.equal(bm.lab.info().n, 1);
  // bygg på sted 1 med ubrukte deler fra brettet: en lang planke (ingen leting) og prøv
  const types = {}, B = BL.createBuild(LV.build.sites[0], types, []), added = LG.labFill(B, types); void added;
  const code = (() => { const T = { lab_plank_l_1: 'plank_l' }, BB = BL.createBuild(LV.build.sites[0], T, ['lab_plank_l_1']); BL.place(BB, 'lab_plank_l_1', 0, 0.25, 0); return BL.exportCode(BB); })();
  assert.ok(bm.importText(code), 'koden for en lang planke kan limes inn (delene finnes i brettet)'); assert.equal(st().placed, 1);
  assert.ok(bm.startTry()); for (let i = 0; i < 2400 && bm.running; i++) bm.update(1 / 60, true); assert.equal(bm.result.state, 'won', 'PRØV vinner med planken'); assert.ok(bm.isSolved('lab1') && solvedIds.includes('lab1'), 'stedet er løst');
  assert.ok(bm.inWorld('lab1') && bm.worldCount('lab1') >= 1 && LV.boxes.some((b) => b.built === 'lab1'), 'bygget står i verdenen som solid (R26)');
  bm.stopTry();
  // ◀ ▶ med et bygg: går videre uten å miste det, og hjem-flytting ved TILBAKE
  bm.lab.go(1); assert.ok(bm.inWorld('lab1'), 'bygget blir stående når du bytter sted'); assert.equal(bm.lab.info().n, 2); bm.close('tilbake');
  assert.ok(!bm.active, 'TILBAKE går ut til rommet'); const s2 = LV.build.sites[1]; assert.ok(Math.abs(player.x - (s2.x + LG.LAB.homeU)) < 1e-6 && Math.abs(player.y - s2.y) < 0.05 && player.z === s2.z, 'figuren står på sokkelen før gapet på stedet du bygde på'); assert.ok(log.some(([t, d]) => t === 'bygglab' && /^figuren flyttet til sted 2/.test(d)));
  // BYGG-knappen tilbake inn: står figuren ved et sted, åpnes det stedet
  bm.update(0.016, true); assert.ok(bm.open() && bm.lab.info().n === 2, 'BYGG åpner stedet figuren står ved');
  // nullstill dette stedet / alle
  bm.lab.go(-1); assert.ok(bm.inWorld('lab1')); assert.equal(bm.lab.resetSite('lab1'), true); assert.ok(!bm.inWorld('lab1') && !bm.isSolved('lab1') && !LV.boxes.some((b) => b.built === 'lab1') && st().placed === 0, 'NULLSTILL STED fjerner bygget, løsningen og delene på stedet'); assert.ok(log.some(([t, d]) => t === 'bygglab' && /^nullstilt lab1/.test(d)));
  assert.equal(bm.lab.resetSite('lab1'), false, 'ingenting å nullstille to ganger'); assert.equal(bm.lab.info().n, 1, 'blir stående på stedet');
  assert.ok(bm.importText(code)); assert.ok(bm.startTry()); for (let i = 0; i < 2400 && bm.running; i++) bm.update(1 / 60, true); assert.ok(bm.isSolved('lab1')); bm.stopTry();
  click('site'); assert.ok(!bm.isSolved('lab1') && !bm.inWorld('lab1'), 'knappen NULLSTILL STED (data-lb) virker'); assert.ok(bm.importText(code)); assert.ok(bm.startTry()); for (let i = 0; i < 2400 && bm.running; i++) bm.update(1 / 60, true); bm.stopTry(); assert.ok(bm.isSolved('lab1'));
  click('all'); assert.ok(!bm.isSolved('lab1') && !bm.inWorld('lab1') && bm.state().builds.every((q) => q.placed === 0) && !LV.boxes.some((b) => b.built), 'NULLSTILL ALLE nullstiller alle stedene'); assert.ok(log.some(([t, d]) => t === 'bygglab' && d === 'alle steder nullstilt'));
  // lagring og fortsett (lab-ider kjennes igjen, flagg og bygg gjenopprettes)
  assert.ok(bm.importText(code)); assert.ok(bm.startTry()); for (let i = 0; i < 2400 && bm.running; i++) bm.update(1 / 60, true); bm.stopTry(); bm.close('test');
  const saved = JSON.parse(JSON.stringify(bm.save())); assert.ok(saved.lab && Array.isArray(saved.lab.flags)); assert.ok(saved.sites.lab1.have.some((id) => id.startsWith('lab_plank_l_')) && saved.solved.includes('lab1'), 'lagres');
  const LV2 = JSON.parse(JSON.stringify(L)), p2 = { x: 0, y: 0, z: 0, onGround: true, state: 'ground' }, b2 = mk(LV2, p2); b2.load(saved);
  assert.ok(b2.inWorld('lab1') && LV2.boxes.some((b) => b.built === 'lab1'), 'bygget gjenopprettes i verdenen'); p2.x = LV2.start[0]; p2.z = LV2.start[2]; b2.update(0.016, true); assert.ok(b2.open()); assert.equal(b2.state().builds.find((q) => q.id === 'lab1').placed, 1, 'delene ligger igjen på brettet');
  b2.close('test'); b2.resetAll(); assert.ok(!b2.inWorld('lab1'), 'start på nytt nullstiller også lab');
  // målflagg: figuren står ved flagg 3
  const f3 = LV.build.sites[2].lab.flag; Object.assign(player, { x: f3[0], y: f3[1], z: f3[2], onGround: true }); bm.update(0.016, true); assert.deepEqual(bm.lab.reached, ['lab3'], 'flagg 3 nådd'); assert.ok(log.some(([t, d]) => t === 'bygglab' && /^målflagg 3\/8 nådd \(1\/8\)/.test(d)) && toasts.some((m) => m.startsWith('lab.flag{"n":3,"of":8')), 'logges og vises');
  assert.deepEqual(JSON.parse(JSON.stringify(bm.save())).lab.flags, ['lab3'], 'flagg lagres');
  // uten «ubegrenset»: bare to av hver
  const LV3 = JSON.parse(JSON.stringify(L)), p3 = { x: LV3.start[0], y: 0, z: LV3.start[2], onGround: true, state: 'ground' }, b3 = mk(LV3, p3, false); b3.update(0.016, true); assert.ok(b3.open()); assert.equal(b3.state().builds.find((q) => q.id === 'lab1').have, LG.labTypes().length * LG.LAB.fixed, 'admin: bare to av hver når ubegrenset er av');
}

// 7) tekster nb/en nevner knappene og har alle stedene; valg i SETTINGS; brettet i nivålista; filene i lista; dokumentasjon
{
  const keys = DICT_KEYS.nb.filter((k) => k.startsWith('lab.')); assert.deepEqual(keys.slice().sort(), DICT_KEYS.en.filter((k) => k.startsWith('lab.')).sort(), 'samme lab-nøkler på norsk og engelsk');
  let lang = 'nb'; const { T } = makeT(() => lang);
  for (const s of sites) for (const k of [`lab.name.${s.lab.key}`, `lab.task.${s.lab.key}`]) assert.ok(keys.includes(k), `${k} finnes`);
  for (const l of ['nb', 'en']) { lang = l; for (const k of keys) { const t = T(k, { n: 3, of: 8, name: 'X', task: 'Y', total: 2 }); assert.ok(!/\{\w+\}/.test(t) && t !== k, `${l}:${k}`); assert.ok(!/\b(mellomrom|space|tast|taster|keyboard|key)\b/i.test(t), `${l}:${k} nevner taster`); }
    for (const s of sites) assert.match(T(`lab.task.${s.lab.key}`, { n: 10 }), /PRØV|TRY|TAPE|LEDD|HINGE|TAU|ROPE|GUMMI|BAND|↺|knappene|buttons|Tåler|Holds|LEDD|BAND/, `${l}: oppgaven for ${s.lab.key} nevner en knapp`);
    assert.match(T('lab.resetSite'), l === 'nb' ? /NULLSTILL/ : /RESET/); assert.match(T('lab.resetAll'), l === 'nb' ? /ALLE/ : /ALL/); }
  lang = 'nb'; assert.equal(T('lab.line', { n: 4, of: 8, name: T('lab.name.fagverk'), task: T('lab.task.fagverk') }).slice(0, 31), 'Sted 4/8: Fagverk — bygg en bro');
  const main = fs.readFileSync('main.js', 'utf8'), html = fs.readFileSync('index.html', 'utf8'), settings = fs.readFileSync('settings_util.js', 'utf8');
  assert.match(main, /id: 'bygglab', label: 'Byggeskole/, 'Bygglab (Byggeskole) i nivålista (?level=bygglab)'); assert.match(main, /fl\('labstart', 'spill'/); assert.match(main, /fl\('labfree', 'admin'/); assert.match(main, /store\.get\('tlm\.labstart', true\)/, 'start i byggemodus er på som standard'); assert.ok(settings.includes("'labstart'"), 'labstart står i LAYOUT');
  assert.match(main, /labAutoOpen\(/); assert.match(main, /logEv\('bygglab'/); assert.ok(fs.readFileSync('build.js', 'utf8').includes("logEv('bygglab'"), 'hendelser logges som bygglab');
  const list = (html.match(/const files = \[([^\]]+)\]/) || [])[1] || ''; for (const f of ['bygglab_logic', 'bygglab_view']) assert.ok(list.includes(`'${f}'`), `index.html: ${f} i lista`);
  assert.ok(fs.readFileSync('docs/NIVAER.md', 'utf8').includes('Bygglab') && fs.readFileSync('docs/INNSTILLINGER.md', 'utf8').includes('tlm.labstart'), 'brukeranvisning og innstillinger er beskrevet');
}

// 8) ingen økning i tegnekall eller shadere: modulene bruker ikke three, brettet har få bokser og ingen nye materialer
{
  for (const f of ['bygglab_logic.js', 'bygglab_view.js']) assert.ok(!/from 'three'|import\('three'\)|THREE\./.test(fs.readFileSync(f, 'utf8')), `${f} bruker ikke three (ingen nye tegnekall eller shadere)`);
  const mats = new Set(['wood', 'plaster', 'plastic', 'fabric', 'metal', 'tile', 'glass']), used = new Set(L.boxes.map((b) => b.material).filter(Boolean)); for (const m of used) assert.ok(mats.has(m), `kjent materiale ${m}`);
  assert.ok(L.boxes.length + L.decor.length <= 60, `få objekter (${L.boxes.length} bokser, ${L.decor.length} dekor)`); assert.equal(L.ants.length + (L.movables || []).length + (L.collectibles || []).length, 0, 'ingen fiender, løse ting eller smuler å tegne');
  const bld = fs.readFileSync('build.js', 'utf8'); assert.ok(!/new THREE\.(Mesh|Line|Group)[^;]*lab/i.test(bld.split('R67: Bygglab: velg sted')[1]?.slice(0, 3000) || ''), 'Bygglab-delen av build.js lager ingen nye three-objekter');
}
console.log('bygglab-tester grønne');
