// Bygglab (R67): et prøverom som starter i byggemodus og samler alle byggestedene (R24-R50) i én lang, ryddig bane.
// Skriver scenes/bygglab.scene.json. Bruk: node tools/make_bygglab.mjs && node tools/scene2level.mjs scenes/bygglab.scene.json levels/bygglab.level.json && node tools/walk_route.mjs levels/bygglab.level.json
// Rommet (cm, x øst, z sør): én lang hylle (to sokler per sted, 17,5 cm over gulvet) med et gap midt på hvert sted. Åtte steder, 150 cm fra hverandre:
//   1 bro (planker, tape) · 2 trapp (klosser) · 3 vippe · 4 fagverk (trekanter) · 5 tau og gummistrikk · 6 lasttest (ball, bil, robot) · 7 «Tåler X» · 8 materialer.
// Den vanskelige veien uten bygging: gå på gulvet langs rommet (sokkelen står midt i rommet, gulvet er fritt på begge sider) og hopp opp på sokkelen etter gapet.
// Hvert sted har et målflagg etter gapet og minst to kjente løsninger (`lab.solutions`, den første er også `ref` som test og bot bruker).
import fs from 'node:fs';

const U = 5;                                          // cm per enhet
const P = (id, type, u, v, rot = 0) => ({ id, type, u, v, rot });
const hinge = (id, a, ax, ay, b, bx, by) => ({ id, kind: 'hinge', a, la: { x: ax, y: ay }, b, lb: { x: bx, y: by } });
const tape = (id, a, ax, ay, b, bx, by) => ({ id, kind: 'tape', a, la: { x: ax, y: ay }, b, lb: { x: bx, y: by } });
const gnd = (id, kind, a, u, v) => ({ id, kind, a, la: { x: 0, y: 0 }, b: null, lb: null, g: { u, v } });
const o = (id, kind, material, color, box, extra = {}) => ({ id, kind, material, color, box, confidence: 1, photos: [], ...extra });

const TOP = 15, ZA = 60, ZB = 140, ZC = 100, STEP = 150, XC = (k) => STEP * k, W = STEP * 8 + 100;
const TOPP = (top) => ({ id: '@topp', u0: -0.6, u1: 0.6, top });   // fagverk i verden: figuren klatrer opp sperren og over mønet
const BRO = (id = '@bro', u0 = -4, u1 = 4, top = 0.5) => ({ id, u0, u1, top });
const triangle = (rt = 'plank_s', L = 4, hs = 3) => {   // tre planker og tre ledd: base over gapet og to sperrer som møtes i toppen (fagverk, R49a2)
  const rise = Math.sqrt(L * L - hs * hs), th = Math.atan2(rise, hs);
  return { placed: [P('b', 'plank_l', 0, 0.25), P('rl', rt, -hs / 2, 0.5 + rise / 2, th), P('rr', rt, hs / 2, 0.5 + rise / 2, -th)], links: [hinge('h1', 'b', -hs, 0.25, 'rl', -L / 2, 0), hinge('h2', 'b', hs, 0.25, 'rr', L / 2, 0), hinge('h3', 'rl', L / 2, 0, 'rr', -L / 2, 0)] };
};
const tri1 = triangle('plank_s', 4, 3), tri2 = triangle('plank_s', 4, 2);

// gap (enheter), stigning på neste sokkel (enheter), byggestedets høyde, løsninger. Første løsning = ref.
const SITES = [
  { key: 'bro', gap: 7, h: 12, solutions: [
    { name: 'lang planke', placed: [P('p1', 'plank_l', 0, 0.25)], links: [], surfaces: [BRO()] },
    { name: 'linjal', placed: [P('p1', 'ruler', 0, 0.2)], links: [], surfaces: [BRO('@bro', -5, 5, 0.4)] },
    { name: 'lang planke med en kort oppå', placed: [P('a', 'plank_l', 0, 0.25), P('b', 'plank_s', 0, 0.75)], links: [], surfaces: [BRO('@bro', -4, 4, 1)] },
  ] },
  { key: 'trapp', gap: 0, split: 4.25, rise: 5, h: 12, solutions: [
    { name: 'trapp av seks klosser', placed: [P('k1', 'block', 0, 0.75), P('k2', 'block', 1.5, 0.75), P('k3', 'block', 1.5, 2.25), P('k4', 'block', 3, 0.75), P('k5', 'block', 3, 2.25), P('k6', 'block', 3, 3.75)], links: [],
      surfaces: [{ id: '@t1', u0: -0.75, u1: 0.75, top: 1.5 }, { id: '@t2', u0: 0.75, u1: 2.25, top: 3 }, { id: '@t3', u0: 2.25, u1: 3.75, top: 4.5 }], steps: ['@t1', '@t2', '@t3'] },
    { name: 'tårn av tre klosser og en rampe', placed: [P('k1', 'block', 3.25, 0.75), P('k2', 'block', 3.25, 2.25), P('k3', 'block', 3.25, 3.75), P('a', 'plank_l', 0, 3.2, 0.45)], links: [], surfaces: [], steps: [] },
  ] },
  { key: 'vippe', gap: 6.5, rise: 3.5, h: 12, drop: TOP / U, solutions: [
    { name: 'vippe', placed: [P('v1', 'seesaw', 0, 2, 0.2618)], links: [], surfaces: [] },
    { name: 'skrå lang planke', placed: [P('p1', 'plank_l', 0, 2, 0.5236)], links: [], surfaces: [] },
  ] },
  { key: 'fagverk', gap: 5, h: 14, solutions: [
    { name: 'trekant, lav (sperrer 4 lange, 3 ut)', ...tri1, surfaces: [TOPP(3.29)] },
    { name: 'trekant, høy (sperrer 4 lange, 2 ut)', ...tri2, surfaces: [TOPP(4.04)] },
  ] },
  { key: 'tau', gap: 7, h: 12, solutions: [
    { name: 'to korte planker, tape og tau', placed: [P('a', 'plank_s', -2, 0.25), P('b', 'plank_s', 2, 0.25)], links: [tape('t1', 'a', 2, 0, 'b', -2, 0), gnd('r1', 'rope', 'a', 0, 6)], surfaces: [BRO('@bro', -4, 4, 0.5)] },
    { name: 'to korte planker, ledd og gummistrikk', placed: [P('a', 'plank_s', -2, 0.25), P('b', 'plank_s', 2, 0.25)], links: [hinge('h1', 'a', 2, 0, 'b', -2, 0), gnd('g1', 'band', 'a', -2, 4), gnd('g2', 'band', 'b', 2, 4)], surfaces: [BRO('@bro', -4, 4, 0.5)] },
    { name: 'lang planke i to tau', placed: [P('a', 'plank_l', 0, 0.25)], links: [gnd('r1', 'rope', 'a', -3, 8), gnd('r2', 'rope', 'a', 3, 8)], surfaces: [BRO()] },
  ] },
  { key: 'last', gap: 7, h: 12, loads: ['ball', 'car', 'robot'], solutions: [
    { name: 'lang planke', placed: [P('p1', 'plank_l', 0, 0.25)], links: [], surfaces: [BRO()] },
    { name: 'linjal', placed: [P('p1', 'ruler', 0, 0.2)], links: [], surfaces: [BRO('@bro', -5, 5, 0.4)] },
  ] },
  { key: 'taaler', gap: 5, h: 14, cap: 10, solutions: [
    { name: 'trekant (fagverk)', ...tri1, surfaces: [TOPP(3.29)] },
    { name: 'to lange planker med tape', placed: [P('a', 'plank_l', 0, 0.25), P('b', 'plank_l', 0, 0.75)], links: [tape('t1', 'a', 0, 0.25, 'b', 0, -0.25)], surfaces: [BRO('@bro', -4, 4, 1)] },
    { name: 'høykant-planke', placed: [P('p1', 'plank_t', 0, 0.6)], links: [], surfaces: [BRO('@bro', -4, 4, 1.2)] },
  ] },
  { key: 'materialer', gap: 7, h: 12, solutions: [
    { name: 'linjal', placed: [P('p1', 'ruler', 0, 0.2)], links: [], surfaces: [BRO('@bro', -5, 5, 0.4)] },
    { name: 'to linjaler teipet oppå hverandre', placed: [P('p1', 'ruler', 0, 0.2), P('p2', 'ruler', 0, 0.6)], links: [tape('t1', 'p1', 0, 0.2, 'p2', 0, -0.2)], surfaces: [BRO('@bro', -5, 5, 0.8)] },
    { name: 'linjal med en blyant oppå', placed: [P('p1', 'ruler', 0, 0.2), P('p2', 'pencil', 0, 0.6)], links: [], surfaces: [BRO('@bro', -5, 5, 0.8)] },
  ] },
];
const N = SITES.length;
const nameOf = (s) => `sted${SITES.indexOf(s) + 1}`;

const objects = [], sites = [], flags = [];
const COLA = ['#b98a55', '#a98050'], COLB = ['#c99a65', '#b98a55'];
SITES.forEach((s, i) => {
  const k = i + 1, xc = XC(k), half = s.gap * U / 2, rise = (s.rise || 0) * U, split = s.split !== undefined ? s.split * U : half;
  const aEnd = xc + (s.split !== undefined ? split : -half), bStart = xc + (s.split !== undefined ? split : half);
  objects.push(o(`ped_a${k}`, 'box', 'wood', COLA[i % 2], [xc - 75, aEnd, 0, TOP, ZA, ZB], { help: `Sted ${k}/${N}\nTrykk BYGG for å bygge her.` }));
  objects.push(o(`ped_b${k}`, 'box', 'wood', COLB[i % 2], k === N ? [bStart, W - 25, 0, TOP + rise, 0, 200] : [bStart, xc + 75, 0, TOP + rise, ZA, ZB]));   // den siste sokkelen går over hele dybden (gulvet kan nås rett opp på den)
  const top = TOP + rise, fx = xc + 62;
  objects.push(o(`flagg_stang_${k}`, 'box', 'plastic', '#f5f1e8', [fx - 0.8, fx + 0.8, top, top + 30, ZC - 0.8, ZC + 0.8], { decor: true }));
  objects.push(o(`flagg_duk_${k}`, 'box', 'fabric', '#e0453a', [fx + 0.8, fx + 12, top + 20, top + 30, ZC - 0.5, ZC + 0.5], { decor: true }));
  flags.push({ k, x: fx, y: top, z: ZC });
  const [ref, ...rest] = s.solutions;
  const route = ['gulv', `ped_a${k}`, ...(ref.steps || ref.surfaces.map((q) => q.id)), `ped_b${k}`];
  const site = { id: `lab${k}`, label: `Sted ${k}/${N}`, at: [xc, ZC], y: TOP, w: 100, h: s.h * U, d: 20,
    anchors: s.gap ? [[-half, 0], [half, 0]] : [], deck: s.split !== undefined ? [[-47.5, split], [split, 47.5, rise]] : [[-47.5, -half], [half, 47.5, ...(rise ? [rise] : [])]],
    start: [-40, 0], goal: [40, rise], ...(s.drop ? { drop: s.drop * U } : {}), ...(s.loads ? { loads: s.loads } : {}),
    ref: { placed: ref.placed, links: ref.links, surfaces: ref.surfaces },   // (uten route: ruta over hvert sted går fra gulvet og står i lab.solutions; boten går hovedruta)
    lab: { key: s.key, n: k, of: N, flag: [fx, top, ZC], ...(s.cap ? { cap: s.cap } : {}), solutions: [ref, ...rest].map((q) => ({ name: q.name, placed: q.placed, links: q.links, surfaces: q.surfaces, route: ['gulv', `ped_a${k}`, ...((q.steps ?? q.surfaces.map((z) => z.id))), `ped_b${k}`] })) } };
  // R72: rutenett-modus på «bro» og «fagverk»: trinnet er gapet delt i fire, slik at begge ankrene ligger på rutenettet (stjerner: { three, two } = { kostnad, staver })
  if (s.key === 'bro') site.grid = { step: s.gap * U / 4, stars: { three: { cost: 5, parts: 4 }, two: { cost: 9, parts: 8 } } };
  if (s.key === 'fagverk') site.grid = { step: s.gap * U / 4, stars: { three: { cost: 12, parts: 12 }, two: { cost: 20, parts: 18 } } };
  if (s.key === 'vippe') site.anchors = [[0, 2 * U]];   // vippas dreiepunkt
  if (s.key === 'trapp') site.start = [-40, 0];
  sites.push(site);
  void nameOf;
});
// trinn opp til de høye sokkelene (stigning over 3 enheter): den vanskelige veien går fra neste sokkel opp på trinnet og så på den høye sokkelen
SITES.forEach((q, i) => {
  if ((q.rise || 0) <= 3) return;
  const k = i + 1, xe = XC(k) + 75;
  objects.push(o(`trinn_${k}`, 'box', 'wood', '#8c6a3f', [xe, xe + 15, TOP, TOP + q.rise * U / 2, ZA, ZB], { help: 'Trinn\nVeien opp på den høye hylla uten å bygge.' }));
});
const last = flags[flags.length - 1];
const s = {
  name: 'Prøverom: Bygglab', units: 'cm', frame: 'Origo i nordvestre hjørne. x øst, z sør, y opp.', validate: true, rev: 1,
  source: { photos: 0, views: [], interpreted_by: 'Oppdiktet prøverom (ikke fra bilder), laget for R67: alle byggestedene på rad.', scale_anchors: ['sokkel 15 cm', 'gap 25–35 cm'], uncertainty: 'Ingen: rommet er tegnet for testing.',
    note: 'Bygglab (R67). Åtte byggesteder i én bane; spillet åpner byggeskjermen ved start (valg i ⚙). Vanskelig vei uten bygging: gå på gulvet og hopp opp på sokkelen.' },
  room: { width: W, depth: 200, height: 240, floor: { material: 'wood', color: '#d9b382', slick: false }, walls: { material: 'plaster', color: '#e9e1d3' }, ceiling: { material: 'plaster', color: '#f5f1e8' }, fdetMax: 60 },
  start: { x: 110, z: 55 }, goal: { x: last.x + 4, y: last.y, z: last.z, on: `ped_b${N}`, note: 'Flagget etter siste sted.' },
  windows: [{ wall: 'N', z: 330, y: 150, w: 150, h: 80 }, { wall: 'N', z: 930, y: 150, w: 150, h: 80 }],
  hazards: [],
  objects,
  look: { exposure: 1.0, sun: 2 }, audio: { reverb: 0.15 },
  ants: [],
  build: { sites, parts: [] },
  lab: { start: true },   // R67: merker brettet som Bygglab (bygglab_logic.js): byggeskjermen åpnes ved start, steder kan velges og nullstilles
  collectibles: [],
};
fs.writeFileSync(new URL('../scenes/bygglab.scene.json', import.meta.url), JSON.stringify(s, null, 2) + '\n');
console.log('skrev scenes/bygglab.scene.json');
