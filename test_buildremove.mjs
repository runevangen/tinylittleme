// R78: fjernet del skal ikke være med i PRØV: verken i fysikken, i kostnad/stjerner eller som spøkelse (forrige prøve) i tegningen.
// Årsak (funnet): spøkelset fra forrige prøve (R50) tegnet den gamle delelisten halvgjennomsiktig idet PRØV ble trykket, så en fjernet planke så ut som den kom tilbake.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const BL = await import('./build_logic.js'), G = await import('./grid_logic.js'), BP = await import('./build_phys.js'), BB = await import('./build_budget.js'), RP = await import('./build_replay.js'), GH = await import('./build_ghost.js');
const site = JSON.parse(fs.readFileSync('levels/kontroll.level.json', 'utf8')).build.sites[0];
const lab = JSON.parse(fs.readFileSync('levels/bygglab.level.json', 'utf8'));
const gsite = lab.build.sites.find((s) => s.grid);
const types = { a: 'plank_l', b: 'plank_s', c: 'plank_l' };
const defOf = (B) => (G.isGrid(B) ? G.simDef(B) : { site: B.site, placed: B.placed.map((p) => ({ id: p.id, type: p.type, u: p.u, v: p.v, rot: p.rot })), links: B.links });
const ids = (B) => BP.createSim(defOf(B), {}).pose().parts.map((p) => p.id).sort();
const record = (B, steps = 30) => { const s = BP.createSim(defOf(B), {}), r = RP.createRecorder(s, {}); for (let i = 0; i < steps; i++) { s.step(); r.frame(s, s.drain()); } return r.finish(s.state); };
const check = (B, gone, why) => {
  assert.ok(!B.placed.some((p) => p.id === gone), why + ': delen ligger ikke i B.placed');
  assert.ok(!ids(B).includes(gone), why + ': delen er ikke med i fysikken (PRØV)');
  const sf = BB.starsFor(B.site, B.placed, B.links), bc = BB.buildCost(B.placed, B.links); assert.equal(sf.cost, bc.cost, why + ': kostnad stemmer'); assert.equal(sf.parts, B.placed.length, why + ': antall deler stemmer');
  assert.ok(!B.links.some((l) => l.a === gone || l.b === gone), why + ': ingen koblinger til delen');
};

// ---------- klassisk: tre veier ----------
{
  const mk = () => { const B = BL.createBuild(site, types, Object.keys(types)); BL.place(B, 'a', 0, 0.25, 0); BL.place(B, 'b', 2, 1, 0); BL.place(B, 'c', -3, 1, 0); BL.addLink(B, 'tape', 'a', 'b'); BL.addLink(B, 'tape', 'a', 'c'); return B; };
  let B = mk(); const before = BB.buildCost(B.placed, B.links).cost;
  BL.remove(B, 'b'); check(B, 'b', 'FJERN/dra tilbake'); assert.ok(BB.buildCost(B.placed, B.links).cost < before, 'billigere uten delen');
  B = mk(); BL.place(B, 'b', 5, 2, 0); BL.undo(B); check(B, 'zz', 'angre flytting'); // angre setter delen tilbake dit den var, ikke inn igjen
  B = mk(); const n = B.placed.length; BL.remove(B, 'c'); BL.undo(B); assert.equal(B.placed.length, n, 'ANGRE av fjerning setter delen tilbake (ønsket)'); BL.remove(B, 'c'); BL.remove(B, 'b'); BL.undo(B); BL.undo(B); BL.remove(B, 'b'); check(B, 'b', 'fjern, angre, angre, fjern');
  B = mk(); BL.reset(B); assert.equal(ids(B).length, 0, 'nullstill: ingenting igjen'); BL.undo(B); BL.reset(B); assert.equal(B.placed.length, 0);
  // spøkelset: opptak av hele bygget passer ikke etter fjerning, og passer igjen etter ANGRE
  B = mk(); const rec = record(B), pose = (b) => BP.createSim(defOf(b), {}).pose();
  assert.ok(GH.ghostFits(rec, pose(B)), 'samme bygg: spøkelset vises'); BL.place(B, 'b', 2.5, 1.2, 0.2); assert.ok(GH.ghostFits(rec, pose(B)), 'flyttet del: spøkelset vises (det er poenget med det)');
  BL.remove(B, 'b'); assert.ok(!GH.ghostFits(rec, pose(B)), 'fjernet del: spøkelset skjules'); assert.equal(GH.ghostChoice(rec, pose(B)).rec, null); assert.equal(GH.ghostChoice(rec, pose(B)).why, 'endret');
  BL.undo(B); assert.ok(GH.ghostFits(rec, pose(B)), 'ANGRE: spøkelset passer igjen'); assert.equal(GH.ghostChoice(null, pose(B)).why, 'ingen');
  const B3 = mk(); BL.removeLink(B3, B3.links[0].id); assert.ok(!GH.ghostFits(rec, pose(B3)), 'fjernet kobling: spøkelset skjules');
  assert.ok(!GH.ghostFits(null, pose(B)) && !GH.ghostFits(rec, null), 'tomme innganger tåles');
}

// ---------- rutenett: fjern stav, fjern knute, angre, bytte modus ----------
{
  const B = BL.createBuild(gsite, {}, []); G.setMode(B, 'grid'); const an = B.rg.nodes.filter((n) => n.fixed), st = G.gridStep(gsite);
  const p1 = { u: an[0].u + st, v: st }, p2 = { u: an[0].u + 2 * st, v: st };
  const n1 = G.gAddNode(B, p1.u, p1.v).node, n2 = G.gAddNode(B, p2.u, p2.v).node;
  const r1 = G.gAddRod(B, an[0].id, n1.id, 'wood').rod, r2 = G.gAddRod(B, n1.id, n2.id, 'wood').rod, r3 = G.gAddRod(B, an[0].id, n2.id, 'steel');
  const rec = record(B), pose = () => BP.createSim(defOf(B), {}).pose();
  assert.ok(G.gRemoveRod(B, r2.id)); check(B, r2.id, 'rutenett: FJERN stav'); assert.ok(!GH.ghostFits(rec, pose()), 'rutenett: spøkelset skjules');
  assert.ok(G.gUndo(B)); assert.ok(ids(B).includes(r2.id) && GH.ghostFits(rec, pose()), 'rutenett: ANGRE gir staven tilbake');
  assert.ok(G.gRemoveNode(B, n1.id)); check(B, r1.id, 'rutenett: FJERN knute tar stavene'); check(B, r2.id, 'rutenett: FJERN knute tar stavene (2)');
  G.gUndo(B); G.gRemoveRod(B, r1.id); G.setMode(B, 'classic'); G.setMode(B, 'grid'); check(B, r1.id, 'rutenett: modusbytte henter ikke staven tilbake');
  assert.equal(ids(B).length, B.placed.length, 'PRØV bygger fra det som vises');
  // klassisk del fjernet før bytte til rutenett og tilbake
  const C = BL.createBuild(gsite, types, Object.keys(types)); BL.place(C, 'a', 0, 0.25, 0); BL.place(C, 'b', 2, 1, 0); G.setMode(C, 'grid'); G.setMode(C, 'classic'); BL.remove(C, 'b'); G.setMode(C, 'grid'); G.setMode(C, 'classic'); check(C, 'b', 'klassisk: fjernet før modusbytte');
  void r3;
}

// ---------- loggen, filene ----------
const src = fs.readFileSync('build.js', 'utf8'); assert.ok(/logEv\('bygg', `tilbake i brettet/.test(src) && /logEv\('bygg', `fjernet stav/.test(fs.readFileSync('grid_view.js', 'utf8')) && /logEv\('bygg', `prøv \$\{active\.id\}: \$\{B\.placed\.length\} deler/.test(src), 'fjerning og prøvestart logges med antall deler');
assert.ok(/spøkelse skjult/.test(src) && /ghostChoice/.test(src), 'build.js bruker vakten og logger den');
assert.ok(fs.readFileSync('index.html', 'utf8').includes("'build_ghost'"), 'build_ghost i files');
console.log('build remove ok');
