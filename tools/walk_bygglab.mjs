// R67: bevis for Bygglab (levels/bygglab.level.json). Bruk: node tools/walk_bygglab.mjs [levels/bygglab.level.json] [--verbose]
// For hvert byggested (L.build.sites[i].lab): (1) den vanskelige veien UTEN bygging: gå på gulvet og hopp opp på sokkelen etter gapet, til målflagget;
// (2) hver kjent løsning (lab.solutions): PRØV i 2D-fysikken må vinne, bygget settes ut i verdenen som solide flater (med ALLE stedenes bygg stående samtidig),
// og den ekte figuren går fra gulvet opp på sokkelen foran gapet, over bygget og til målflagget;
// (3) hele banen på sokkelen med alle referansebyggene stående: fra første sokkel til siste flagg uten å gå ned på gulvet.
// Uten bygg stopper den samme ruta ved gapet (ellers er stedet ikke en byggeoppgave).
import fs from 'node:fs';
import * as BW from '../build_world.js';
import * as BP from '../build_phys.js';
import { walkRoute } from './walk_route.mjs';

const lane = (L, k) => { const a = L.boxes.find((b) => b.id === `ped_a${k}`); return { id: `lane_${k}`, x0: a.min[0] + 4, x1: a.min[0] + 7, z0: L.room.z0, z1: -9, top: 0 }; };   // gulvet rett sør for sokkelen: ruta går langs sørsiden og hopper opp derfra
const boxNode = (b) => ({ id: b.id, x0: b.min[0], x1: b.max[0], z0: b.min[2], z1: b.max[2], top: b.max[1] });

export function labSites(L) { return (L.build?.sites || []).filter((s) => s.lab); }
export function nodeMap(L, site, sol) {
  const m = new Map((L.route || []).map((n) => [n.id, n]));
  for (const b of L.boxes) if (b.id && b.type !== 'wall' && b.type !== 'floor') m.set(b.id, boxNode(b));
  for (const q of labSites(L)) m.set(`lane_${q.lab.n}`, lane(L, q.lab.n));
  const hd = BW.siteDepth(site) / 2; for (const q of sol?.surfaces || []) m.set(q.id, { id: q.id, x0: site.x + q.u0, x1: site.x + q.u1, z0: site.z - hd, z1: site.z + hd, top: site.y + q.top, tol: q.tol ?? 0.26 });
  return m;
}
const route = (m, ids) => { const r = ids.map((id) => m.get(id)); if (r.some((q) => !q)) throw new Error(`ukjent rutepunkt i ${ids}`); return r; };
const withGoal = (L, goal) => { const c = JSON.parse(JSON.stringify(L)); c.goal = goal; return c; };

// ruta uten bygging fra gulvet til flagget til sted k (via sokkelen etter gapet; trapp-stedet via trinnet)
export function hardIds(L, k) {
  const ss = labSites(L), n = ss.length;
  if (k === n) return ['gulv', `ped_b${k}`];
  return ['gulv', `lane_${k + 1}`, `ped_a${k + 1}`, ...(L.boxes.some((b) => b.id === `trinn_${k}`) ? [`trinn_${k}`] : []), `ped_b${k}`];
}
export function builtIds(L, site, sol) {
  const k = site.lab.n; return ['gulv', `lane_${k}`, ...(sol.route.slice(1))];
}
export function allSolids(L, pick = (s) => s.lab.solutions[0]) {
  const out = [];
  for (const s of labSites(L)) { const sol = pick(s); out.push(...BW.buildSolids(s, BP.settledPlaced({ site: s, placed: sol.placed, links: sol.links }))); }
  return out;
}

export function walkLab(L, { verbose = false } = {}) {
  const res = { hard: [], built: [], none: [], chain: null }, ss = labSites(L), say = (m) => verbose && console.log('  ' + m);
  for (const s of ss) {
    const k = s.lab.n, flag = s.lab.flag, G = withGoal(L, flag);
    const hard = walkRoute(null, { level: G, route: route(nodeMap(L, s), hardIds(L, k)) });
    res.hard.push({ k, ok: hard.ok, why: hard.why, secs: hard.secs }); say(`sted ${k} uten bygging: ${hard.ok ? 'går, ' + hard.secs + ' s' : 'FEIL ' + hard.why}`);
    // alle byggene står samtidig (ett sted skal ikke stenge et annet), men uten å bygge går ikke ruta over gapet
    for (const [i, sol] of s.lab.solutions.entries()) {
      const sim = BP.runSim({ site: s, placed: sol.placed, links: sol.links }, s.loads?.length ? { load: s.loads[0] } : {});
      const m = nodeMap(L, s, sol), r = route(m, builtIds(L, s, sol)), solids = allSolids(L, (q) => (q === s ? sol : q.lab.solutions[0]));
      const w = walkRoute(null, { level: G, route: r, extraBoxes: solids });
      res.built.push({ k, i, name: sol.name, sim: sim.result, ok: sim.result === 'won' && w.ok, why: sim.result !== 'won' ? `prøven: ${sim.reason}` : w.why, secs: w.secs }); say(`sted ${k} «${sol.name}»: prøve ${sim.result}, ruta over bygget ${w.ok ? 'går, ' + w.secs + ' s' : 'FEIL ' + w.why}`);
    }
    const none = walkRoute(null, { level: G, route: route(nodeMap(L, s, s.lab.solutions[0]), builtIds(L, s, s.lab.solutions[0])), extraBoxes: allSolids(L, (q) => (q === s ? { placed: [], links: [] } : q.lab.solutions[0])) });
    res.none.push({ k, ok: !none.ok }); say(`sted ${k} uten bygg på stedet: ruta over gapet ${none.ok ? 'GÅR (feil: da trengs ikke bygget)' : 'går ikke (riktig)'}`);
  }
  // hele banen på sokkelen med alle referansebyggene stående
  const m = new Map((L.route || []).map((n) => [n.id, n])); for (const b of L.boxes) if (b.id && b.type !== 'wall' && b.type !== 'floor') m.set(b.id, boxNode(b));
  const ids = ['gulv', 'lane_1'], hd = (s) => BW.siteDepth(s) / 2;
  m.set('lane_1', lane(L, 1));
  for (const s of ss) { const sol = s.lab.solutions[0], k = s.lab.n; for (const q of sol.surfaces || []) m.set(q.id + '_' + k, { id: q.id + '_' + k, x0: s.x + q.u0, x1: s.x + q.u1, z0: s.z - hd(s), z1: s.z + hd(s), top: s.y + q.top, tol: q.tol ?? 0.26 }); ids.push(`ped_a${k}`, ...sol.route.slice(2, -1).map((id) => (sol.surfaces.some((q) => q.id === id) ? id + '_' + k : id)), `ped_b${k}`); }
  const flagN = ss[ss.length - 1].lab.flag, whole = walkRoute(null, { level: withGoal(L, flagN), route: route(m, ids), extraBoxes: allSolids(L) });
  res.chain = { ok: whole.ok, why: whole.why, secs: whole.secs, steps: ids.length - 1 }; say(`hele banen på sokkelen med alle byggene: ${whole.ok ? 'går, ' + whole.secs + ' s' : 'FEIL ' + whole.why}`);
  res.ok = res.hard.every((q) => q.ok) && res.built.every((q) => q.ok) && res.none.every((q) => q.ok) && res.chain.ok;
  return res;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const file = process.argv.find((a) => a.endsWith('.json')) || 'levels/bygglab.level.json', L = JSON.parse(fs.readFileSync(file, 'utf8'));
  const r = walkLab(L, { verbose: true });
  console.log(r.ok ? `BYGGLAB GÅR: ${r.hard.length} steder uten bygging og med ${r.built.length} løsninger, hele banen på ${r.chain.secs} s` : 'BYGGLAB FEILER');
  process.exit(r.ok ? 0 : 2);
}
