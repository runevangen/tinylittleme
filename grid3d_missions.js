// R131: 3D-laben, tre oppdrag som bare går an i 3D (ren logikk: ingen DOM, ingen three.js, kjøres i node: test_grid3d_missions.mjs).
//  1. Broen (R130, uendret): bil over et gap; en flat bro faller sidelengs, en bro med knuter i et annet lag står.
//  2. Tårnet: en last på toppen, 8 enheter opp. En stav alene velter; tre staver ned til hvert sitt hjørne (tripod) står.
//  3. Tripoden: en last hengt i tau under toppen av tre staver. To staver velter sidelengs; tre står.
//  4. Bred bro, sidevind: samme gap som Broen, men vinden tar tak i dekket fra siden. Tre alene ryker ved anker-leddene: bytt dem til stål.
// Hvert oppdrag er et «sted» som i grid_stage.js (`lab`, `grid.stage`): rekkefølge og lås (stagesOf, stageLocked, passRead/passRecord med brett-id `lab3d`) er de samme som for Byggeskolens steder 9 og 10.
// Data i et sted: goal { p: [x,y,z], m } = knuten som må ligge i punktet; lasten m står på den (top) eller henger i tau under den (hang: { drop }). wind = sidevind (build_phys3.js, z). msgs = tekst-nøkler (lab3d.m.*).
import { LAB3D } from './grid3d_site.js';
import { simDef3 } from './build_phys3.js';
import { nodeAt } from './grid3d_logic.js';

export const MISSION_LEVEL = 'lab3d';   // nøkkelen i tlm.gstage (grid_stage.js passRead/passRecord)
export const mkey = (id) => (id === LAB3D.id ? 'tlm.lab3d' : 'tlm.lab3d.' + id);   // lagring av bygget (Broen beholder den gamle nøkkelen)
const stage = (budget) => ({ stage: { budget, loads: ['ball'] } });

const BRIDGE = { ...LAB3D, lab: { n: 1, key: 'bridge' }, grid: stage(LAB3D.budget), name: 'lab3d.mis.bridge', msgs: {} };

const TOWER = {
  id: 'tower3d', name: 'lab3d.mis.tower', lab: { n: 2, key: 'tower' }, grid: stage(50),
  x: [0, 4], y: [0, 8], z: [0, 4], floor: 0, maxLen: 9,
  anchors: [{ x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }, { x: 0, y: 0, z: 4 }, { x: 4, y: 0, z: 4 }],
  budget: 50, stars: [40, 46], mats: ['wood', 'steel', 'rope'],
  goal: { p: [2, 8, 2], m: 120 },
  msgs: { intro: 'intro.tower', fall: 'fall.tower', brk: 'brk.tower', nogoal: 'nogoal.tower' },
  guide: [
    { k: 'node', key: 'k0', p: [2, 8, 2], t: 'lab3d.g.tower.top' },
    { k: 'rod', a: 'k0', b: 'a1', m: 'steel', t: 'lab3d.g.tower.legs' }, { k: 'rod', a: 'k0', b: 'a2', m: 'steel', t: 'lab3d.g.tower.legs' }, { k: 'rod', a: 'k0', b: 'a3', m: 'steel', t: 'lab3d.g.tower.legs' },
  ],
};

const TRIPOD = {
  id: 'tripod3d', name: 'lab3d.mis.tripod', lab: { n: 3, key: 'tripod' }, grid: stage(45),
  x: [0, 4], y: [0, 8], z: [0, 4], floor: 0, maxLen: 7,
  anchors: [{ x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }, { x: 2, y: 0, z: 4 }],
  budget: 45, stars: [31, 38], mats: ['wood', 'steel', 'rope'],
  goal: { p: [2, 6, 2], m: 120, hang: { drop: 2 } },
  msgs: { intro: 'intro.tripod', fall: 'fall.tripod', brk: 'brk.tripod', nogoal: 'nogoal.tripod' },
  guide: [
    { k: 'node', key: 'k0', p: [2, 6, 2], t: 'lab3d.g.tripod.top' },
    { k: 'rod', a: 'k0', b: 'a1', m: 'steel', t: 'lab3d.g.tripod.legs' }, { k: 'rod', a: 'k0', b: 'a2', m: 'steel', t: 'lab3d.g.tripod.legs' }, { k: 'rod', a: 'k0', b: 'a3', m: 'steel', t: 'lab3d.g.tripod.legs' },
  ],
};

// Bred bro i sidevind: som broguiden fra R130, men med flere staver til siden (vinden tar tak der) og STÅL i de to beina ved ankrene (k0-a1, k2-a2); alt annet er tre
const WR = (a, b, t, m) => ({ k: 'rod', a, b, t, ...(m ? { m } : {}) });
const WINDGUIDE = [
  { k: 'node', key: 'k0', p: [2, -2, 2], t: 'lab3d.g.keel' },
  WR('k0', 'a1', 'lab3d.g.wind.legs', 'steel'), WR('k0', 'a3', 'lab3d.g.legs'), WR('k0', 'd1', 'lab3d.g.legs'), WR('d1', 'a3', 'lab3d.g.legs'),
  { k: 'node', key: 'k2', p: [6, -2, 2], t: 'lab3d.g.other' },
  WR('k2', 'a2', 'lab3d.g.wind.legs', 'steel'), WR('k2', 'a4', 'lab3d.g.legs'), WR('k2', 'd3', 'lab3d.g.legs'), WR('d3', 'a4', 'lab3d.g.legs'),
  { k: 'node', key: 'k1', p: [4, -2, 2], t: 'lab3d.g.join' },
  WR('k0', 'k1', 'lab3d.g.join'), WR('k1', 'k2', 'lab3d.g.join'), WR('k1', 'd2', 'lab3d.g.join'), WR('k0', 'd2', 'lab3d.g.join'), WR('k2', 'd2', 'lab3d.g.join'), WR('k1', 'd1', 'lab3d.g.join'), WR('k1', 'd3', 'lab3d.g.join'), WR('k1', 'a3', 'lab3d.g.join'), WR('d2', 'a4', 'lab3d.g.join'),
];
const WIND = {
  ...LAB3D, id: 'wind3d', name: 'lab3d.mis.wind', lab: { n: 4, key: 'wind' }, grid: stage(70),
  budget: 70, stars: [48, 60], wind: 2, guide: WINDGUIDE,
  msgs: { intro: 'intro.wind', fall: 'fall.wind', brk: 'brk.wind', nogoal: 'nogoal.wind' },
};

export const MISSIONS = [BRIDGE, TOWER, TRIPOD, WIND];
export const missionOf = (id) => MISSIONS.find((m) => m.id === id) || null;
export const missionIndex = (id) => MISSIONS.findIndex((m) => m.id === id);
export const hasGoal = (site) => !!(site && site.goal && Array.isArray(site.goal.p) && site.goal.p.length === 3);
export const goalPoint = (site) => (hasGoal(site) ? { x: site.goal.p[0], y: site.goal.p[1], z: site.goal.p[2] } : null);
// knuten spilleren har lagt i målpunktet (eller null)
export const goalNode = (B, site) => { const p = goalPoint(site); return p ? nodeAt(B.rg, p) || null : null; };
// sidevind i prøven: stedets vind ganger innstillingen (admin)
export const windOf = (site, k = 1) => (Number.isFinite(site?.wind) && site.wind > 0 ? site.wind * (Number.isFinite(k) && k > 0 ? k : 1) : 0);

// definisjonen simulatoren skal ha: bygget + lasten. { ok: false, why: 'nogoal' } når knuten mangler i målpunktet.
// top: lasten er ekstra masse i knuten. hang: en egen knute ('load') henger i et tau under knuten (tauet er ikke en del av bygget og koster ingenting).
export function missionDef3(B, site) {
  if (!hasGoal(site)) return { ok: true, def: simDef3(B) };
  const gn = goalNode(B, site); if (!gn) return { ok: false, why: 'nogoal' };
  const m = site.goal.m, h = site.goal.hang;
  if (!h) return { ok: true, def: simDef3(B, { [gn.id]: m }), goal: gn.id };
  const def = simDef3(B); def.nodes.push({ id: 'load', x: gn.x, y: gn.y - h.drop, z: gn.z, fixed: false }); def.rods.push({ id: 'hang', a: gn.id, b: 'load', mat: 'rope', deck: false }); def.mass = { ...def.mass, load: m };
  return { ok: true, def, goal: gn.id, hang: 'load' };
}

// ---------- rekkefølge og lås (grid_stage.js) ----------
// bestått-settet: stedene i tlm.gstage['lab3d'] + Broen fra R130 (tlm.lab3d.passed) som allerede er bestått
export function passedIds(store, passRead) {
  const s = passRead(store, MISSION_LEVEL); try { const old = store.get('tlm.lab3d', null); if (old && old.passed) s.add(LAB3D.id); } catch { /* ingen lagring */ }
  return s;
}
