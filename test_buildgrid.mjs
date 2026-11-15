// R72: rutenett-bygging: knutepunkter og staver på koordinatene (grid_logic.js, grid_view.js, build_materials.js, build.js).
// node test_buildgrid.mjs: materialer og priser, knute/stav-regler, bruddgrenser og determinisme, kode og lagring, modusbytte, Bygglab-stedene, og byggeskjermen mot en DOM-stubb.
import fs from 'node:fs';
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const BL = await import('./build_logic.js'), G = await import('./grid_logic.js'), BP = await import('./build_phys.js'), BM = await import('./build_materials.js'), BB = await import('./build_budget.js'), BW = await import('./build_world.js'), I18 = await import('./i18n.js');
const lab = JSON.parse(fs.readFileSync(new URL('./levels/bygglab.level.json', import.meta.url), 'utf8'));
const labSite = (key) => lab.build.sites.find((s) => s.lab.key === key);
const mk = (site, ...a) => { const B = BL.createBuild(site, {}, []); G.setMode(B, 'grid'); B.gridMaxLen = a[0] || 6.5; return B; };
const wide = { id: 'w', w: 30, h: 14, anchors: [{ u: -8, v: 0 }, { u: 8, v: 0 }], deck: [{ u0: -14, u1: -8 }, { u0: 8, u1: 14 }], start: { u: -12, v: 0 }, goal: { u: 12, v: 0 }, grid: { step: 2 } };

// ---------- 1) materialer, typer og priser ----------
{
  assert.deepEqual(BM.GRID_MATS, ['wood', 'steel', 'rope']);
  for (const m of BM.GRID_MATS) for (const k of ['name', 'en', 'color', 'h', 'price', 'm', 'E', 'st', 'sc', 'mcap', 'brittle', 'joint']) assert.ok(BM.GRID_MAT[m][k] !== undefined, `${m}.${k}`);
  const t = BM.rodType('steel', 1.75); assert.equal(t, 'rod_steel_175'); assert.deepEqual(BM.parseRod(t), { mat: 'steel', len: 1.75 }); assert.equal(BM.parseRod('plank_s'), null); assert.equal(BM.parseRod('rod_gold_100'), null);
  const pt = BL.partType(t); assert.equal(pt.w, 1.75); assert.equal(pt.h, 0.5); assert.equal(BL.partType(t), pt, 'samme objekt hver gang (cache)'); assert.equal(BL.partType('finnes_ikke'), BL.PART_TYPES.block, 'ukjent type er fortsatt kloss');
  assert.ok(BM.materialOf('rod_rope_300').rope && !BM.materialOf('rod_wood_300').rope, 'bare tau er tau'); assert.ok(BM.materialOf('rod_steel_300').E > BM.materialOf('rod_wood_300').E, 'stål er stivere');
  assert.ok(BM.GRID_MAT.steel.price > BM.GRID_MAT.wood.price && BM.GRID_MAT.steel.st > BM.GRID_MAT.wood.st && BM.GRID_MAT.steel.joint > BM.GRID_MAT.wood.joint, 'stål er dyrt og sterkt, tre billig og svakt');
  for (const L of [1.2, 2, 4, 6.5]) assert.ok(BM.rodPrice('wood', L) <= BM.rodPrice('steel', L) && BM.rodPrice('rope', L) >= 1, 'pris stiger med materialet');
  assert.ok(BM.rodPrice('wood', 6) > BM.rodPrice('wood', 2), 'pris per lengde'); assert.equal(BB.partCost('rod_wood_200'), BM.rodPrice('wood', 2), 'partCost kjenner staver');
  assert.equal(BB.buildCost([{ type: 'rod_wood_200' }], [{ kind: 'hinge', free: true }]).cost, BM.rodPrice('wood', 2), 'knutepunkt er gratis i rutenett-modus');
  assert.equal(BB.buildCost([{ type: 'plank_s' }], [{ kind: 'hinge' }]).cost, BB.PART_COST.plank_s + BB.LINK_COST.hinge, 'klassisk pris uendret');
  for (const id of Object.keys(BL.PART_TYPES)) assert.ok(!BM.isRod(id), 'ingen klassisk del er en stav');
}

// ---------- 2) knuter og staver ----------
{
  const site = { ...wide }, B = mk(site), Gd = B.rg;
  assert.equal(Gd.nodes.length, 2); assert.ok(Gd.nodes.every((n) => n.fixed), 'ankrene er faste knuter'); assert.deepEqual(Gd.nodes.map((n) => [n.u, n.v]), [[-8, 0], [8, 0]]);
  const pts = G.latticePoints(site); assert.ok(pts.some((p) => p.u === -8 && p.v === 0) && pts.some((p) => p.u === 8 && p.v === 0) && pts.every((p) => Math.abs(p.u) <= 15 && p.v >= 0 && p.v <= 14), 'rutenettet ligger i stedet og har ankrene');
  assert.deepEqual(G.nearestPoint(site, -5.2, 0.9), { u: -6, v: 0 }); assert.equal(G.nearestPoint(site, -5.2, 0.9, 0.1), null, 'for langt fra et punkt');
  const n1 = G.gAddNode(B, -5.9, 0.2); assert.ok(n1.ok && !n1.existed && n1.node.u === -6 && n1.node.v === 0, 'knute snapper til rutenettet'); assert.ok(G.gAddNode(B, -6.2, 0.1).existed, 'samme punkt gir samme knute');
  assert.equal(B.placed.length, 0, 'en knute alene er ingen stav');
  const r1 = G.gAddRod(B, 'a1', n1.node.id, 'wood'); assert.ok(r1.ok && Math.abs(r1.len - 2) < 1e-9 && r1.cost === BM.rodPrice('wood', 2), JSON.stringify(r1));
  assert.equal(B.placed.length, 1); assert.equal(B.placed[0].type, 'rod_wood_200'); assert.equal(B.links.length, 1, 'ankeret er et ledd mot underlaget'); assert.ok(B.links[0].b === null && B.links[0].g.u === -8 && B.links[0].free);
  assert.equal(G.gAddRod(B, n1.node.id, 'a1', 'steel').why, 'dup', 'én stav per par'); assert.equal(G.gAddRod(B, 'a1', 'a1', 'wood').why, 'same');
  assert.equal(G.gAddRod(B, 'a1', 'a2', 'wood').why, 'far', 'maks lengde'); assert.equal(G.gAddRod(B, 'a1', n1.node.id, 'plast').ok, false, 'ukjent materiale');
  const far = G.gAddNode(B, 8, 6).node; assert.equal(G.gAddRod(B, n1.node.id, far.id, 'wood').why, 'far');
  const near = mk({ ...site, grid: { step: 1 } }); const q1 = G.gAddNode(near, -7, 0).node; assert.equal(G.gAddRod(near, 'a1', q1.id, 'wood').why, 'short', 'for kort stav');
  // en stav kan ikke gå gjennom en annen knute
  const C = mk(site), m = G.gAddNode(C, -4, 0).node, e = G.gAddNode(C, 0, 0).node; assert.equal(G.gAddRod(C, 'a1', e.id, 'wood', 6.5).ok, false, 'a1 til e er 8 lang'); C.gridMaxLen = 9; assert.equal(G.gAddRod(C, 'a1', e.id, 'wood').why, 'over', 'staven ville gått gjennom knuten ved -4'); void m;
  // anker kan ikke slettes eller flyttes
  assert.equal(G.gRemoveNode(B, 'a1'), false, 'ankerpunktet kan ikke slettes'); assert.equal(G.gMoveNode(B, 'a1', 0, 0).why, 'fixed', 'ankerpunktet kan ikke flyttes'); assert.equal(Gd.nodes.filter((n) => n.fixed).length, 2);
  // flytt en knute: staver følger; ulovlig flytting avvises og endrer ingenting
  const mv = G.gMoveNode(B, n1.node.id, -6, 2); assert.ok(mv.ok && mv.moved && n1.node.v === 2, JSON.stringify(mv)); assert.ok(Math.abs(B.placed[0].rot) > 0.1, 'staven følger knuten');
  const before = JSON.stringify(B.rg); assert.equal(G.gMoveNode(B, n1.node.id, 8, 8).why, 'far'); assert.equal(JSON.stringify(B.rg), before, 'avvist flytting endrer ingenting'); assert.equal(G.gMoveNode(B, n1.node.id, -8, 0).why, 'taken', 'der står ankeret');
  // slett: knute tar stavene med seg; stav alene
  assert.ok(G.gRemoveRod(B, r1.rod.id) && B.placed.length === 0 && B.links.length === 0); assert.ok(G.gUndo(B) && B.placed.length === 1, 'ANGRE tar stava tilbake');
  assert.ok(G.gRemoveNode(B, n1.node.id) && B.placed.length === 0 && !G.nodeOf(B.rg, n1.node.id), 'knuten og stavene på den er borte'); assert.ok(G.gUndo(B) && B.placed.length === 1);
  assert.ok(G.gReset(B) && B.rg.rods.length === 0 && B.rg.nodes.length === 2, 'NULLSTILL: ankrene står igjen'); assert.equal(G.gReset(B), false, 'allerede tomt'); assert.ok(G.gUndo(B) && B.rg.rods.length === 1, 'ANGRE tar tilbake det nullstilte');
  // ledd: tre staver i én knute gir to ledd, og stavene støter ikke mot hverandre
  const D = mk(site), c = G.gAddNode(D, 0, 2).node, l = G.gAddNode(D, -2, 0).node, rr = G.gAddNode(D, 2, 0).node, up = G.gAddNode(D, 0, 4).node;
  for (const x of [l, rr, up]) assert.ok(G.gAddRod(D, c.id, x.id, 'wood').ok);
  assert.equal(D.links.length, 2, 'tre staver i en knute: to ledd'); assert.equal(G.noCollide(D).length, 3, 'alle par i knuten er uten kollisjon');
  assert.equal(JSON.stringify(G.simDef(D).placed), JSON.stringify(D.placed.map((p) => ({ id: p.id, type: p.type, u: p.u, v: p.v, rot: p.rot }))));
}

// ---------- 3) fysikk: bro over gapet, brudd, determinisme ----------
const bridge = (site, mat = 'wood', order = null) => {   // flatt dekke fra anker til anker
  const B = mk(site, 99), us = []; const a = site.anchors, st = G.gridStep(site); for (let u = a[0].u + st; u < a[1].u - 1e-6; u += st) us.push(+u.toFixed(3));
  const ids = ['a1']; for (const u of us) ids.push(G.gAddNode(B, u, 0).node.id); ids.push('a2');
  const pairs = ids.slice(0, -1).map((x, i) => [x, ids[i + 1]]); if (order) pairs.reverse();
  for (const [x, y] of pairs) assert.ok(G.gAddRod(B, x, y, mat).ok); return B;
};
{
  const Bw = bridge(wide);
  for (const load of ['figure', 'ball', 'car', 'robot']) { const r = BP.runSim(G.simDef(Bw), { load }); assert.equal(r.result, 'won', `tredekke bærer ${load}: ${r.reason}`); }
  const open = mk(wide); G.gAddRodTo(open, 'a1', -6, 0, 'wood'); assert.equal(BP.runSim(G.simDef(open), {}).result, 'lost', 'en bro som ikke når over, vinner ikke');
  // determinisme: samme bygg (satt opp i motsatt rekkefølge) gir samme resultat, og samme bygg to ganger gir identisk bevegelse
  const Bw2 = bridge(wide, 'wood', true), r1 = BP.runSim(G.simDef(Bw), {}), r2 = BP.runSim(G.simDef(Bw), {}), r3 = BP.runSim(G.simDef(Bw2), {});
  assert.deepEqual(r1, r2, 'samme bygg: identisk'); assert.deepEqual({ ...r1, figure: 0 }, { ...r3, figure: 0 }, 'rekkefølgen på staver og knuter spiller ingen rolle (utfall, tid og brudd)'); assert.ok(Math.abs(r1.figure.u - r3.figure.u) < 1e-9 && Math.abs(r1.figure.v - r3.figure.v) < 1e-9, 'også samme sluttposisjon');
  // fagverk (Pratt) av tre og stål: ved halv styrke brekker tre, stål holder (stål er sterkere i knutene)
  const pratt = (mat) => {
    const B = mk(wide), id = (u, v) => G.nodeAt(B.rg, u, v)?.id || G.gAddNode(B, u, v).node.id, R = (a, b, m) => assert.ok(G.gAddRod(B, a, b, m).ok, `${a}-${b}`), us = [-8, -6, -4, -2, 0, 2, 4, 6, 8];
    for (let i = 0; i < 8; i++) R(id(us[i], 0), id(us[i + 1], 0), mat); for (let i = 1; i < 7; i++) R(id(us[i], 2), id(us[i + 1], 2), mat); R(id(-8, 0), id(-6, 2), mat); R(id(8, 0), id(6, 2), mat);
    for (let i = 1; i <= 7; i++) R(id(us[i], 0), id(us[i], 2), mat); for (let i = 1; i < 4; i++) R(id(us[i], 0), id(us[i + 1], 2), mat); for (let i = 5; i < 8; i++) R(id(us[i], 0), id(us[i - 1], 2), mat); return B;
  };
  const pw = pratt('wood'), ps = pratt('steel');
  assert.equal(BP.runSim(G.simDef(pw), {}).result, 'won', 'trekantbro av tre over 16 enheter'); assert.equal(BP.runSim(G.simDef(ps), {}).result, 'won', 'og av stål');
  const w5 = BP.runSim(G.simDef(pw), { strength: 0.5 }), s5 = BP.runSim(G.simDef(ps), { strength: 0.5 });
  assert.equal(w5.result, 'lost', 'tre ryker når grensene halveres'); assert.ok(w5.linkBreaks.length > 0, 'leddene ryker (kraft over grensen)'); assert.equal(s5.result, 'won', 'stål holder ved halv styrke'); assert.ok(BB.starsFor(wide, pw.placed, pw.links).cost < BB.starsFor(wide, ps.placed, ps.links).cost, 'tre er billigere enn stål');
  // tau bærer bare strekk: en stående tau-stav kollapser under en vekt, tre og stål bærer den
  const strut = (mat) => { const site = { id: 'x', w: 30, h: 14, anchors: [{ u: 0, v: 0 }], deck: [{ u0: -14, u1: 14 }], start: { u: -12, v: 0 }, goal: { u: 12, v: 0 } };
    const s = BP.createSim({ site, placed: [{ id: 's1', type: BM.rodType(mat, 3), u: 0, v: 1.5, rot: Math.PI / 2 }, { id: 'w', type: 'weight', u: 0, v: 3.75, rot: 0 }], links: [{ id: 'h1', kind: 'hinge', a: 's1', la: { x: -1.5, y: 0 }, b: null, lb: null, g: { u: 0, v: 0 } }, { id: 'h2', kind: 'hinge', a: 's1', la: { x: 1.5, y: 0 }, b: 'w', lb: { x: 0, y: -0.75 } }], noCollide: [] }, { hold: true });
    for (let i = 0; i < 600; i++) s.step(); return s.pose().parts.find((p) => p.id === 'w').v; };
  assert.ok(strut('wood') > 3.5 && strut('steel') > 3.5, 'tre og stål bærer i trykk'); assert.ok(strut('rope') < 3.2, 'tau gir etter i trykk: ' + strut('rope'));
  // tau bærer i strekk: tau mellom ankrene bærer figuren over et kort gap
  const gap = { id: 'g', w: 20, h: 12, anchors: [{ u: -3.5, v: 0 }, { u: 3.5, v: 0 }], deck: [{ u0: -9.5, u1: -3.5 }, { u0: 3.5, u1: 9.5 }], start: { u: -8, v: 0 }, goal: { u: 8, v: 0 }, grid: { step: 1.75 } };
  assert.equal(BP.runSim(G.simDef(bridge(gap, 'rope')), {}).result, 'won', 'tau i strekk bærer figuren');
  // brudd gir rød fargeovergang først: belastningen (stress) stiger mot 1 før noe brekker, og bruddet meldes med id
  const sim = BP.createSim(G.simDef(pw), { strength: 0.5 }); let top = 0, broke = null; for (let i = 0; i < 900 && sim.state.state === 'run'; i++) { sim.step(); for (const p of sim.pose().links) top = Math.max(top, p.stress || 0); for (const e of sim.drain()) if (e.type === 'linkbreak' && !broke) broke = e; }
  assert.ok(top >= 1 && broke && broke.id, 'belastningen nådde 1 og bruddet kom med id');
}

// ---------- 4) stjerner og terskler ----------
{
  const site = { ...wide, grid: { step: 2, stars: { three: { cost: 20, parts: 9 }, two: { cost: 30, parts: 12 } } }, stars: { three: { cost: 1, parts: 1 }, two: { cost: 2, parts: 2 } } };
  const B = bridge(site); const r = BB.starsFor(site, B.placed, B.links); assert.equal(r.parts, 8); assert.equal(r.stars, 3, 'rutenett-bygg bruker site.grid.stars: ' + JSON.stringify(r));
  const cl = BB.starsFor(site, [{ type: 'plank_l' }], []); assert.equal(cl.stars, 2, 'klassisk bygg bruker site.stars (ikke site.grid.stars): ' + JSON.stringify(cl));
  assert.equal(BB.starsFor({ ...site, stars: undefined }, [{ type: 'plank_l' }, { type: 'plank_l' }, { type: 'plank_l' }, { type: 'plank_l' }], []).stars, 2, 'klassisk uten egne terskler: standard');
}

// ---------- 5) modus, lagring og kode ----------
{
  const site = { ...wide }, parts = ['p1', 'p2'], types = { p1: 'plank_s', p2: 'plank_l' }, B = BL.createBuild(site, types, parts);
  BL.place(B, 'p2', -3, 0.25, 0); assert.equal(B.placed.length, 1);
  assert.equal(G.setMode(B, 'grid'), true, 'bytter til rutenett'); assert.equal(B.placed.length, 0, 'rutenett starter tomt'); assert.ok(G.isGrid(B));
  assert.equal(G.setMode(B, 'grid'), false, 'allerede i modus'); const r = G.gAddNode(B, -6, 0).node; G.gAddRod(B, 'a1', r.id, 'steel'); const n = B.placed.length;
  assert.equal(G.setMode(B, 'classic'), true); assert.equal(B.placed.length, 1, 'klassisk bygg står der du lot det'); assert.equal(B.placed[0].id, 'p2'); assert.ok(!G.isGrid(B));
  assert.equal(G.setMode(B, 'grid'), true); assert.equal(B.placed.length, n, 'rutenett-bygget er tilbake'); assert.equal(B.rg.rods[0].mat, 'steel');
  assert.equal(G.setMode(BL.createBuild({ id: 'x', w: 10, h: 5 }, {}, []), 'grid'), false, 'steder uten site.grid tillater ikke rutenett');
  // lagring («Fortsett»): rutenett og klassisk bygg overlever; gamle lagringer uten rutenett lastes som før
  const raw = JSON.parse(JSON.stringify({ ...BL.serialize(B), ...G.gridSave(B, BL.serialize) })); assert.equal(raw.mode, 'grid'); assert.equal(raw.classic.placed.length, 1);
  const B2 = BL.createBuild(site, types, parts); BL.restore(B2, { have: raw.have, placed: raw.placed, links: raw.links }); assert.ok(G.gridLoad(B2, raw, (b, c) => BL.restore(b, { have: raw.have, placed: c.placed, links: c.links })));
  assert.ok(G.isGrid(B2) && B2.rg.rods.length === 1 && B2.placed.length === n, 'rutenett lastet'); G.setMode(B2, 'classic'); assert.equal(B2.placed[0].id, 'p2', 'klassisk bygg lastet');
  const old = BL.createBuild(site, types, parts); BL.restore(old, { have: parts, placed: [{ id: 'p2', u: 0, v: 0.25, rot: 0 }], links: [] }); assert.equal(G.gridLoad(old, { have: parts, placed: [], links: [] }, () => {}), false); assert.equal(old.placed.length, 1, 'gammel lagring uten rutenett: uendret');
  // skadet lagring kastes pent
  const bad = G.gridFromSnapshot(site, { nodes: [['kn1', 99, 99], ['kn2', -6, 0], ['x', 0, 0], 5], rods: [['st1', 'a1', 'kn2', 'wood'], ['st2', 'a1', 'kn9', 'wood'], ['st3', 'a1', 'kn2', 'gull'], ['st4', 'a1', 'a2', 'wood']] }, 6.5);
  assert.equal(bad.nodes.length, 3, 'bare lovlige knuter (to ankre og kn2)'); assert.equal(bad.rods.length, 1, 'bare lovlige staver');
  // kode
  const code = G.gridExport(B); assert.ok(/^TLM1\.[A-Za-z0-9_-]+\.[a-z0-9]+$/.test(code) && code.length < BL.CODE_MAX, code);
  const T2 = BL.createBuild(site, types, parts); const imp = G.importAny(code, T2, BL.importCode); assert.ok(imp.ok && imp.grid, JSON.stringify(imp)); assert.ok(G.gApplyImport(T2, imp), 'brukes'); assert.ok(G.isGrid(T2) && T2.placed.length === n);
  assert.equal(G.gridExport(T2), code, 'kode ut = kode inn (rundtur)'); assert.ok(G.gUndo(T2) || true);
  for (const [name, c, why] of [['feil sted', G.gridExport({ ...B, site: { ...site, id: 'annet' } }), 'sted'], ['for lang stav', null, 'verdi'], ['rot', 'TLM1.abc.def', null]]) { if (!c) continue; const r2 = G.importAny(c, T2, BL.importCode); assert.ok(!r2.ok && (!why || r2.why === why), name + ' ' + JSON.stringify(r2)); }
  const bodyOf = (cd) => JSON.parse(Buffer.from(cd.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
  const forge = (j) => { const b = BL.toB64(JSON.stringify(j)); return `TLM1.${b}.${BL.fnv(b)}`; };
  const j = bodyOf(code); assert.equal(j[0], 2); assert.equal(j[1], site.id);
  for (const [name, mut] of [['ukjent materiale', [2, site.id, [[-6000, 0]], [[0, 2, 9]]]], ['punkt utenfor rutenettet', [2, site.id, [[-6123, 0]], [[0, 2, 0]]]], ['stav til ukjent knute', [2, site.id, [], [[0, 7, 0]]]], ['for lang', [2, site.id, [], [[0, 1, 0]]]], ['negativ indeks', [2, site.id, [], [[-1, 1, 0]]]], ['desimal', [2, site.id, [[-6000.5, 0]], []]], ['feil format', [2, site.id, 5, 6]]]) { const r2 = G.importAny(forge(mut), T2, BL.importCode); assert.ok(!r2.ok, name + ' avvist: ' + JSON.stringify(r2)); }
  assert.ok(G.importAny(code.slice(0, -1) + 'x', T2, BL.importCode).ok === false, 'sjekksummen stemmer ikke');
  // klassiske koder (versjon 1) virker som før, også i et rutenett-sted
  const C1 = BL.createBuild(site, types, parts); BL.place(C1, 'p2', -3, 0.25, 0); const c1 = BL.exportCode(C1); const rr = G.importAny(c1, BL.createBuild(site, types, parts), BL.importCode); assert.ok(rr.ok && rr.placed && !rr.grid, 'versjon 1-kode leses som før');
  assert.equal(G.exportAny(C1, BL.exportCode), c1, 'klassisk modus eksporterer klassisk kode');
}

// ---------- 6) treff (skjermbasert margin) ----------
{
  const B = mk(wide), a = G.gAddNode(B, -4, 0).node, b = G.gAddNode(B, -4, 2).node; G.gAddRod(B, a.id, b.id, 'wood');
  for (const sc of [6, 12, 25]) { const px = 24, d = px / sc * 0.95; assert.equal(G.hitNode(B.rg, -4 + d, 0, sc)?.id, a.id, `fingeren treffer knuten ${px} px unna ved ${sc} px/enhet`); assert.equal(G.hitNode(B.rg, -4 + px / sc * 1.2, 0, sc), null, 'utenfor margen'); }
  assert.equal(G.hitRod(B.rg, -4 + 10 / 20, 1, 20)?.mat, 'wood', 'stav treffes 10 px unna'); assert.equal(G.hitRod(B.rg, -4 + 30 / 20, 1, 20), null);
}

// ---------- 7) Bygglab: stedene med rutenett ----------
{
  const gs = lab.build.sites.filter((s) => s.grid); assert.ok(gs.length >= 1 && gs.some((s) => s.lab.key === 'bro'), 'Bygglab har minst ett sted i rutenett-modus: ' + gs.map((s) => s.lab.key));
  for (const s of gs) {
    const pts = G.latticePoints(s); for (const an of s.anchors) assert.ok(pts.some((p) => Math.abs(p.u - an.u) < 1e-6 && Math.abs(p.v - an.v) < 1e-6), `${s.id}: ankrene ligger på rutenettet`);
    assert.ok(G.gridStep(s) > 0.5 && G.gridStep(s) <= 3 && s.grid.stars?.three && s.grid.stars?.two, `${s.id}: trinn og terskler`);
    for (const load of ['figure', ...(s.loads || [])]) { const B = bridge(s), r = BP.runSim(G.simDef(B), { load }); assert.equal(r.result, 'won', `${s.id}: flatt dekke i rutenettet vinner med ${load}`); }
    const st = BB.starsFor(s, bridge(s).placed, bridge(s).links); assert.equal(st.stars, 3, `${s.id}: enkleste bro gir tre stjerner (${JSON.stringify(st)})`);
  }
  // bygget står i verden som faste flater (figuren kan gå på dem), og stedene uten rutenett er uendret
  const s = labSite('bro'), B = bridge(s); const solids = BW.buildSolids(s, B.placed); assert.ok(solids.length >= 4, 'staver blir faste flater i verden');
  for (const k of lab.build.sites) if (!k.grid) assert.equal(G.siteHasGrid(k), false);
  assert.equal(lab.build.sites.filter((q) => !q.grid).length, lab.build.sites.length - gs.length);
}

// ---------- 8) tekster: begge språk, nevner knappene ----------
{
  let lang = 'nb'; const { T } = I18.makeT(() => lang);
  for (const l of ['nb', 'en']) { lang = l; for (const k of ['grid.modeBtn', 'grid.mat.wood', 'grid.mat.steel', 'grid.mat.rope', 'grid.hint.start', 'grid.hint.short', 'grid.hint.sel', 'grid.hint.rod', 'grid.err.far', 'grid.err.dup', 'grid.anchorFixed', 'grid.delNone', 'grid.coord', 'grid.rodInfo', 'build.why.rod']) { const t = T(k, { m: 'M', mat: 'TRE', n: 6, c: 1, r: 2, len: 3, cost: 2 }); assert.ok(t && !t.startsWith('grid.') && !t.startsWith('build.'), `${l} ${k}`); } }
  lang = 'nb'; const hs = T('grid.hint.start') + T('grid.hint.sel', { mat: 'TRE' }) + T('grid.hint.rod'); assert.ok(!/\b(tast|Enter|Esc|klikk)/i.test(hs), 'ingen taster i hjelpeteksten'); assert.ok(/FJERN/.test(T('grid.hint.rod')), 'nevner knappen FJERN');
}

// ---------- 9) byggeskjermen mot en DOM-stubb ----------
{
  const mkEl = () => { const el = { style: { setProperty() {} }, dataset: {}, children: [], _l: {}, _html: '', classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, f) { (f === undefined ? !this._s.has(c) : f) ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    appendChild(c) { this.children.push(c); return c; }, addEventListener(t, f) { (this._l[t] ||= []).push(f); }, removeEventListener() {}, setPointerCapture() {}, releasePointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844 }), closest: () => null, remove() {},
    getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) }),
    querySelector: () => mkEl(), querySelectorAll: () => [], set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; }, width: 0, height: 0 }; return el; };
  const body = mkEl(); globalThis.document = { body, createElement: mkEl, head: mkEl(), getElementById: () => null, querySelector: () => mkEl() };
  globalThis.window = globalThis; globalThis.innerWidth = 390; globalThis.innerHeight = 844; globalThis.devicePixelRatio = 2; globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {};
  const { createBuildMode } = await import('./build.js');
  const S = { id: 'bro', x: 0, y: 2, z: 0, w: 20, h: 12, d: 4, anchors: [{ u: -3.5, v: 0 }, { u: 3.5, v: 0 }], deck: [{ u0: -9.5, u1: -3.5 }, { u0: 3.5, u1: 9.5 }], start: { u: -8, v: 0 }, goal: { u: 8, v: 0 }, grid: { step: 1.75, stars: { three: { cost: 5, parts: 4 }, two: { cost: 9, parts: 8 } } } };
  const S2 = { id: 'plain', x: 40, y: 2, z: 0, w: 12, h: 8, anchors: [{ u: -2, v: 0 }, { u: 2, v: 0 }] };
  const L = { boxes: [], build: { sites: [S, S2], parts: [{ id: 'a', type: 'plank_s', x: 10, y: 3, z: 0 }] } }, player = { x: 0, y: 2, z: 0, onGround: true, state: 'ground' }, log = [];
  const mkB = (opts = {}) => createBuildMode({ scene: { add() {}, remove() {} }, LEVEL: JSON.parse(JSON.stringify(L)), player: { ...player }, $: () => mkEl(), T: (k, v) => k + (v ? JSON.stringify(v) : ''), logEv: (t, d) => log.push([t, d]), toast: (m) => log.push(['toast', m]), TOUCH: true, buzz() {}, audio: {}, isPlay: () => true, isMenu: () => false, isBoss: () => false, isWon: () => false, isOv: () => false, getSnap: () => true, setSnap() {}, allParts: () => true, onChange() {}, ...opts });
  const bm = mkB(); bm.update(0.016, true); assert.ok(bm.open('bro', { force: true }), 'åpner stedet');
  assert.ok(bm.grid.available && !bm.grid.on, 'rutenett tilgjengelig, klassisk som standard'); assert.ok(body.classList.contains('building'));
  assert.ok(bm.grid.toggle() && bm.grid.on, 'modusknappen bytter til rutenett'); assert.ok(log.some(([t, d]) => t === 'bygg' && /^modus rutenett/.test(d)), 'modus logges');
  const px = (u, v) => bm.screenPos(u, v), tap = (u, v) => { const p = px(u, v); bm.grid.tap(p.x, p.y); };
  tap(-3.5, 0); assert.equal(bm.grid.selNode, 'a1', 'trykk på ankeret velger det'); tap(-1.75, 0); assert.equal(bm.grid.selNode, 'kn1', 'trykk på et tomt punkt med valgt knute: stav + ny knute, den nye er valgt');
  tap(0, 0); tap(1.75, 0); tap(3.5, 0); const info = bm.grid.info(); assert.equal(info.rods.length, 4, 'fire staver: ' + JSON.stringify(info.rods)); assert.equal(info.mode, 'grid');
  assert.ok(log.filter(([t, d]) => t === 'bygg' && /^stav st\d+ wood/.test(d)).length === 4, 'hver stav logges med materiale, lengde og kost');
  tap(-12, 6); assert.equal(bm.grid.selNode, null, 'trykk utenfor rutenettet tømmer valget');
  bm.grid.setMat('steel'); assert.equal(bm.grid.mat, 'steel'); tap(1.75, 1.75); assert.equal(bm.grid.info().rods.length, 4, 'tomt punkt uten valgt knute: bare en knute, ingen stav'); assert.equal(bm.grid.selNode, 'kn4');
  tap(1.75, 0); assert.equal(bm.grid.info().rods.length, 5, 'trykk en knute: stav av stål'); assert.equal(bm.grid.info().rods[4].mat, 'steel'); tap(-12, 6);
  assert.ok(bm.startTry(), 'PRØV starter'); for (let i = 0; i < 2400 && bm.running; i++) bm.update(1 / 60, true); assert.equal(bm.result.state, 'won', 'figuren kommer over broen på rutenettet: ' + JSON.stringify(bm.result)); bm.stopTry();
  assert.ok(bm.lastResult && bm.lastResult.stars >= 1, 'stjerner gis: ' + JSON.stringify(bm.lastResult));
  assert.ok(log.some(([t, d]) => t === 'bygg' && /^prøv bro/.test(d)), 'prøven logges');
  // kode, lagring og tilbake
  const code = bm.exportText(); assert.ok(/^TLM1\./.test(code), code); const saved = JSON.parse(JSON.stringify(bm.save())); assert.equal(saved.sites.bro.mode, 'grid');
  bm.close('test'); const bm2 = mkB(); bm2.load(saved); bm2.update(0.016, true); assert.ok(bm2.open('bro', { force: true })); assert.ok(bm2.grid.on && bm2.grid.info().rods.length >= 4, 'rutenett-bygget kommer tilbake etter lagring'); assert.equal(bm2.exportText(), bm2.exportText());
  assert.ok(bm2.importText(code), 'koden kan limes inn igjen'); bm2.stopTry();
  // FJERN, ANGRE, NULLSTILL
  const n0 = bm2.grid.info().rods.length; const tap2 = (u, v) => { const p = bm2.screenPos(u, v); bm2.grid.tap(p.x, p.y); }; tap2(0, 0); assert.ok(bm2.grid.selNode); assert.ok(bm2.grid.del(), 'FJERN tar knuten og stavene på den'); assert.ok(bm2.grid.info().rods.length < n0);
  tap2(-3.5, 0); assert.equal(bm2.grid.del(), false, 'ankerpunktet kan ikke fjernes'); assert.ok(log.some(([t, m]) => t === 'toast' && /anchorFixed/.test(m)));
  // stedet uten rutenett: ingen modusknapp (grid.available er usant), klassisk uendret
  bm2.close('test'); assert.ok(bm2.open('plain', { force: true })); assert.ok(!bm2.grid.available && !bm2.grid.on, 'steder uten site.grid har ikke rutenett'); assert.equal(bm2.grid.toggle(), false); bm2.close('test');
  // av i ⚙: ingen rutenett selv der stedet tillater det
  const bm3 = mkB({ getGrid: () => false }); bm3.update(0.016, true); assert.ok(bm3.open('bro', { force: true })); assert.ok(!bm3.grid.available && bm3.grid.toggle() === false, 'innstillingen slår av rutenett');
}
console.log('rutenett-tester grønne');
