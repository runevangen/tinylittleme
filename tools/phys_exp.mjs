import * as BP from '../build_phys.js';
const P = (id, type, u, v, rot = 0) => ({ id, type, u, v, rot });
const wide = { id: 'w', w: 13, h: 8, deck: [{ u0: -9.5, u1: -3.5 }, { u0: 3.5, u1: 9.5 }] };
const settle = (placed, links, T = 4) => { const sim = BP.createSim({ site: wide, placed, links }); let minV = 9; for (let i = 0; i < T * 60; i++) { sim.step(); } const pose = sim.pose(); for (const p of pose.parts) for (const q of p.pts) minV = Math.min(minV, q.v); return { broke: sim.breaks().length > 0, minV: +minV.toFixed(2) }; };
const stack = (k) => Array.from({ length: k }, (_, i) => P('w' + i, 'weight', 0, 1.25 + 1.5 * i));
const cap = (base, links = []) => { let best = 0; for (let k = 1; k <= 8; k++) { const r = settle([...base, ...stack(k)], links); if (r.broke || r.minV < -3) break; best = k; } return best; };

const blocks = (k, u0, v0) => Array.from({ length: k }, (_, i) => P('b' + i, 'block', u0, v0 + 1.5 * i));
const capB = (base, links, v0, uu = 0) => { let best = 0; for (let k = 1; k <= 10; k++) { const r = settle([...base, ...blocks(k, uu, v0)], links); if (r.broke || r.minV < -3) break; best = k; } return best; };
console.log('A  én lang planke, klosser stablet midt:', capB([P('a', 'plank_l', 0, 0)], [], 1.25), 'klosser');
const tp = { id: 'k1', kind: 'tape', a: 'b', la: { x: 0, y: 0.25 }, b: 'a', lb: { x: 0, y: -0.25 }, g: null };
console.log('C  to planker oppå hverandre med tape:', capB([P('a', 'plank_l', 0, 0), P('b', 'plank_l', 0, 0.5)], [tp], 1.75), 'klosser');
const tp3 = [tp, { id: 'k2', kind: 'tape', a: 'b', la: { x: -3, y: 0.25 }, b: 'a', lb: { x: -3, y: -0.25 }, g: null }, { id: 'k3', kind: 'tape', a: 'b', la: { x: 3, y: 0.25 }, b: 'a', lb: { x: 3, y: -0.25 }, g: null }];
console.log('C2 samme, tape på tre steder:', capB([P('a', 'plank_l', 0, 0), P('b', 'plank_l', 0, 0.5)], tp3, 1.75), 'klosser');
console.log('F  last nær enden av planken (u=2.4):', capB([P('a', 'plank_l', 0, 0)], [], 1.25, 2.4), 'klosser · midt:', capB([P('a', 'plank_l', 0, 0)], [], 1.25, 0), '· (ulik posisjon gir ulik tåleevne = lastfordeling virker)');
const three = (uu) => settle([P('a', 'plank_l', 0, 0), P('x', 'block', uu - 1.6, 1.25), P('y', 'block', uu, 1.25), P('z', 'block', uu + 1.6, 1.25)], []);
console.log('G  3 klosser spredt langs planken:', three(0), '· stablet 3 høyt midt:', settle([P('a', 'plank_l', 0, 0), ...blocks(3, 0, 1.25)], []));
const tri = settle([P('a', 'plank_l', 0, 0), P('b', 'block', 0, 1.25)], []); console.log('H  én kloss midt:', tri);
