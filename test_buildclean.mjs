// node test_buildclean.mjs: R154, byggeskjermen rydder etter seg: (1) fjernet stav tar løse endeknuter (kuler) med seg, og ANGRE tar alt tilbake; (2) mange runder bygg/fjern/angre gir en modell uten spøkelser;
// (3) FRA/TIL-etiketter flytter seg bort fra knuter; (4) byggeskjermen dekker verden helt (ingen blek tekst bak); (5) hengende berøring ryddes og knappene svarer; (6) valget er koblet inn.
// Ekte berøring og bilder: tools/live_buildclean.cjs (iPhone 14, Nivå 5 og Byggelab).
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const BL = await import('./build_logic.js'), G = await import('./grid_logic.js'), SP = await import('./buildspan_logic.js');
const src = (f) => fs.readFileSync(new URL(`./${f}`, import.meta.url), 'utf8');
const lvl = JSON.parse(src('levels/barnerom2.level.json')), site = lvl.build.sites.find((s) => s.id === 'barn2');
const mk = () => { const B = BL.createBuild(site, {}, []); G.setMode(B, 'grid'); return B; };
const loose = (B) => G.orphanNodes(B.rg);
const st = G.gridStep(site), an = mk().rg.nodes.filter((n) => n.fixed);
const lo = an.slice().sort((a, b) => a.u - b.u)[0];

// 1: stav og knute
{
  const B = mk(), a = B.rg.nodes.find((n) => n.fixed), n1 = G.gAddNode(B, a.u + st, st).node, n2 = G.gAddNode(B, a.u + 2 * st, st).node;
  const r1 = G.gAddRod(B, a.id, n1.id, 'wood').rod, r2 = G.gAddRod(B, n1.id, n2.id, 'wood').rod;
  const before = B.rg.nodes.length;
  assert.ok(G.gRemoveRod(B, r2.id)); assert.deepEqual(B.lastPruned, [n2.id], 'bare endeknuten uten flere staver ryddes'); assert.ok(G.nodeOf(B.rg, n1.id), 'knuten som har en stav til står igjen'); assert.equal(loose(B).length, 0);
  assert.ok(G.gRemoveRod(B, r1.id)); assert.deepEqual(B.lastPruned, [n1.id]); assert.equal(B.rg.nodes.length, before - 2); assert.ok(B.rg.nodes.every((q) => q.fixed || q.deck), 'bare ankre igjen');
  assert.ok(G.gUndo(B)); assert.ok(G.nodeOf(B.rg, n1.id) && G.rodOf(B.rg, r1.id), 'ANGRE gir stav og knute tilbake'); assert.ok(G.gUndo(B)); assert.ok(G.nodeOf(B.rg, n2.id) && G.rodOf(B.rg, r2.id));
  // FJERN knute: nabokuler uten flere staver følger med; ankre og dekk røres aldri
  assert.ok(G.gRemoveNode(B, n1.id)); assert.ok(!G.nodeOf(B.rg, n1.id)); assert.ok(!G.nodeOf(B.rg, n2.id), 'naboen som mistet siste stav ryddes'); assert.ok(G.nodeOf(B.rg, a.id), 'ankeret står');
  // valget av: som før
  const C = mk(); C.gridPrune = false; const c1 = G.gAddNode(C, a.u + st, st).node; const rr = G.gAddRod(C, a.id, c1.id, 'wood').rod; G.gRemoveRod(C, rr.id); assert.ok(G.nodeOf(C.rg, c1.id), 'valget av: knuten blir stående (som før)'); assert.equal(loose(C).length, 1);
  // en knute uten stav som ikke hører til staven som fjernes, røres ikke
  const D = mk(), d1 = G.gAddNode(D, a.u + st, st).node, d2 = G.gAddNode(D, a.u + 3 * st, st).node, d3 = G.gAddNode(D, a.u + 2 * st, st).node; const dr = G.gAddRod(D, a.id, d3.id, 'wood').rod; G.gRemoveRod(D, dr.id);
  assert.ok(G.nodeOf(D.rg, d1.id) && G.nodeOf(D.rg, d2.id), 'andre løse knuter (laget med trykk) er ikke del av fjerningen'); assert.ok(!G.nodeOf(D.rg, d3.id));
}
// 2: mange runder: modellen = det som tegnes, ingen løse knuter, ingen staver til borte knuter, PRØV-definisjonen stemmer
{
  const B = mk(); let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; const pts = []; for (let u = lo.u; u <= lo.u + 8 * st; u += st) for (const v of [0, st, 2 * st]) pts.push([u, v]);
  for (let i = 0; i < 400; i++) {
    const r = rnd(), nodes = B.rg.nodes, rods = B.rg.rods.filter((q) => !q.deck);
    if (r < 0.4) { const a = nodes[Math.floor(rnd() * nodes.length)], p = pts[Math.floor(rnd() * pts.length)]; G.gAddRodTo(B, a.id, p[0], p[1], ['wood', 'steel', 'rope'][i % 3]); }
    else if (r < 0.7 && rods.length) G.gRemoveRod(B, rods[Math.floor(rnd() * rods.length)].id);
    else if (r < 0.8) { const n = nodes.filter((q) => !q.fixed && !q.deck); if (n.length) G.gRemoveNode(B, n[Math.floor(rnd() * n.length)].id); }
    else if (r < 0.9) G.gUndo(B); else if (r < 0.95) G.gReset(B);
    else { const p = pts[Math.floor(rnd() * pts.length)]; G.gAddNode(B, p[0], p[1]); }
    const ids = new Set(B.rg.nodes.map((q) => q.id)); assert.ok(B.rg.rods.every((q) => ids.has(q.a) && ids.has(q.b)), 'ingen staver til knuter som er borte');
    assert.equal(new Set(B.rg.rods.map((q) => q.id)).size, B.rg.rods.length); assert.doesNotThrow(() => G.simDef(B));
  }
  // en gang til fra rent bord: bare bygg og fjern staver (ingen frie knuter laget med trykk): aldri en løs knute
  const C = mk(); G.gReset(C); const a = C.rg.nodes.find((n) => n.fixed);
  for (let i = 0; i < 200; i++) { const rods = C.rg.rods.filter((q) => !q.deck), r = rnd(); if (r < 0.55 || !rods.length) { const nn = C.rg.nodes.filter((q) => !q.deck), p = pts[Math.floor(rnd() * pts.length)]; G.gAddRodTo(C, nn[Math.floor(rnd() * nn.length)].id, p[0], p[1], 'wood'); } else G.gRemoveRod(C, rods[Math.floor(rnd() * rods.length)].id); assert.equal(loose(C).length, 0, `runde ${i}: ingen løse knuter`); }
  void a;
}
// 3: etiketten unngår knuter
{
  const p = { x: 200, y: 600 }, free = SP.tagTop(p, [], 60, 20); assert.equal(free, p.y - SP.TAG_LIFTS[0], 'uten knuter: som før');
  const hit = [{ x: 205, y: p.y - 55 }]; const y1 = SP.tagTop(p, hit, 60, 20); assert.ok(y1 < free, 'knute under etiketten: etiketten flyttes opp');
  assert.ok(!hit.some((q) => q.x > p.x - 42 && q.x < p.x + 42 && q.y > y1 - 12 && q.y < y1 + 32), 'og treffer ikke knuten');
  const many = SP.TAG_LIFTS.map((l) => ({ x: p.x, y: p.y - l + 10 })); assert.equal(SP.tagTop(p, many, 60, 20), p.y - SP.TAG_LIFTS[0], 'ingen ledig plass: standardplassen (aldri krasj)');
  assert.equal(SP.tagTop(p, [{ x: 400, y: p.y - 62 }], 60, 20), free, 'knuter langt til siden spiller ingen rolle');
}
// 4-6: koblinger
const build = src('build.js'), main = src('main.js'), html = src('index.html');
assert.ok(!/background:linear-gradient\(#26324bfa/.test(build) && /#bld\{[^}]*linear-gradient\(#26324bff,#141a2cff\)/.test(build), 'byggeskjermen er helt dekkende (ingen tekst fra verden skinner gjennom)');
assert.ok(/R154: hengende berøring ryddet/.test(build) && /addEventListener\('touchend'/.test(build) && /touchesNow/.test(build) && /heal\('knapp'\)/.test(build), 'hengende berøring ryddes og logges');
assert.ok(/tagTop\(p, avoidPts/.test(build), 'tegningen bruker etikett-vakten');
assert.match(main, /fl\('buildprune', 'spill'/); assert.ok(/tlm\.buildprune/.test(main) && /getPrune: \(\) => buildPrune/.test(main));
assert.ok(/R154: ryddet/.test(src('grid_view.js')) && /gridPrune/.test(src('grid_view.js')));
assert.ok(/buildprune/.test(src('settings_text.js')) && /tlm\.buildprune/.test(src('docs/INNSTILLINGER.md')), 'tekst og dokumentasjon finnes');
void html;
// berøringslogikk: hengende ting regnes ut riktig
const X = await import('./build_touch_logic.js'); assert.deepEqual(X.hanging({ drag: null, gest: null, ptrs: 0, capture: false }), []); assert.deepEqual(X.hanging({ ptrs: 1, capture: true }), ['ptrs', 'capture']);
console.log('build clean ok');
