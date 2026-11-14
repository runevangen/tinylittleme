// Gåterommet (R60): testbrett for trykkplate, dør, vindebro og bryter. Skriver scenes/gaate.scene.json.
// Bruk: node tools/make_gaate.mjs && node tools/scene2level.mjs scenes/gaate.scene.json levels/gaate.level.json && node tools/walk_route.mjs levels/gaate.level.json
// Tre gåter på hovedveien (alle har en løsning boten beviser, se test_plates.mjs) og en valgfri med belønning:
//   1. Bær klossen til den gule platen, så åpner porten seg (så lenge klossen ligger der).
//   2. To plater som må trykkes samtidig: to klosser, én på hver.
//   3. Bryteren på plattformen (TA) senker en vindebro over gapet til målet.
//   +  Valgfri: stå på platen i hjørnet (figuren alene er tung nok), da åpner nisjen seg for godt: tre smuler.
import fs from 'node:fs';

const WHITE = '#efe9dc';
const box = (id, kind, material, color, b, extra = {}) => ({ id, kind, material, color, box: b, confidence: 1, photos: [], ...extra });
const s = {
  name: 'Gåterommet', units: 'cm', frame: 'Origo i nordvestre hjørne. x øst, z sør, y opp.', validate: true, rev: 1,
  source: { photos: 0, views: [], interpreted_by: 'Oppdiktet testbrett for R60 (trykkplate, dør, vindebro og bryter).', scale_anchors: ['klosser 12 cm', 'porter i full romhøyde'], uncertainty: 'Ingen: rommet er tegnet for spillet.',
    note: 'R60. Tre gåter på hovedveien (klosse til plata, to plater samtidig, bryter og vindebro) og en valgfri nisje med smuler.' },
  room: { width: 800, depth: 240, height: 200, floor: { material: 'wood', color: '#d9b382', slick: false }, walls: { material: 'plaster', color: '#e9e1d3' }, ceiling: { material: 'plaster', color: '#f5f1e8' } },
  start: { x: 40, z: 120 }, goal: { x: 660, y: 30, z: 120, on: 'plat_b', note: 'Flagget står på plattformen bak vindebroen.' },
  windows: [{ wall: 'N', z: 240, y: 110, w: 140, h: 70 }],
  hazards: [],
  objects: [
    // nisja i hjørnet (valgfri): en lav mur med en dør som åpner seg når figuren står på platen
    box('nisje_v1', 'chest', 'wood', '#b88a5a', [0, 40, 0, 60, 185, 190]), box('nisje_v2', 'chest', 'wood', '#b88a5a', [70, 100, 0, 60, 185, 190]), box('nisje_o', 'chest', 'wood', '#b88a5a', [100, 105, 0, 60, 185, 240]),
    // løse klosser (lette: kan bæres med TA)
    box('klosse_a', 'letterblock', 'plastic', '#e8453c', [70, 82, 0, 12, 30, 42], { movable: 'light', help: 'Gåte 1\nTa klossen (TA), bær den til den gule platen og sett den fra deg (TA igjen). Er den tung nok, åpner porten seg.' }),
    box('klosse_b', 'toyblock', 'wood', '#3a78d8', [230, 242, 0, 12, 90, 102], { movable: 'light', help: 'Gåte 2\nTo plater må trykkes ned samtidig. Bær en kloss til hver plate (TA).' }),
    box('klosse_c', 'legoblock', 'plastic', '#f6c52b', [230, 242, 0, 12, 130, 142], { movable: 'light' }),
    // trapp og plattformer til målet, med gapet for vindebroen
    box('trinn_a', 'chest', 'wood', '#a9764a', [440, 480, 0, 15, 60, 180], { cp: true }),
    box('plat_a', 'chest', 'wood', '#8c5a3a', [480, 540, 0, 30, 60, 180], { help: 'Gåte 3\nGå inntil bryteren og trykk TA: en bro senkes over gapet. HOPP over når den er ute.' }),
    box('plat_b', 'chest', 'wood', '#8c5a3a', [620, 700, 0, 30, 60, 180], { cp: true }),
  ],
  look: { exposure: 1.0, sun: 2.4 }, audio: { reverb: 0.15 },
  collectibles: [{ id: 'smule_1', on: 'gulv', at: [20, 215] }, { id: 'smule_2', on: 'gulv', at: [50, 215] }, { id: 'smule_3', on: 'gulv', at: [80, 215] }],
  // plater, brytere og dører (cm): plate { id, on, box: [x0, x1, z0, z1], need }, bryter { id, on, at: [x, z] }, dør { id, kind, box, needs, ... }
  gates: {
    plates: [
      { id: 'p1', on: 'gulv', box: [120, 160, 100, 140], need: 2, label: 'Gul plate', en: 'Yellow plate' },
      { id: 'p2', on: 'gulv', box: [300, 340, 40, 80], need: 2, label: 'Plate 1 av 2', en: 'Plate 1 of 2' },
      { id: 'p3', on: 'gulv', box: [300, 340, 160, 200], need: 2, label: 'Plate 2 av 2', en: 'Plate 2 of 2' },
      { id: 'p4', on: 'gulv', box: [30, 70, 20, 60], need: 1, label: 'Hjørneplata', en: 'Corner plate' },
    ],
    switches: [{ id: 's1', on: 'plat_a', at: [510, 120], label: 'Bryter', en: 'Switch' }],
    doors: [
      { id: 'd1', kind: 'door', box: [200, 210, 0, 200, 0, 240], needs: ['p1'], dir: 'down', label: 'Porten', en: 'The gate' },
      { id: 'd2', kind: 'door', box: [420, 430, 0, 200, 0, 240], needs: ['p2', 'p3'], dir: 'down', label: 'Den andre porten', en: 'The second gate' },
      { id: 'd3', kind: 'bridge', box: [540, 620, 26, 30, 90, 150], needs: ['s1'], axis: 'x', anchor: 'min', label: 'Vindebroen', en: 'The drawbridge' },
      { id: 'd4', kind: 'door', box: [40, 70, 0, 60, 185, 190], needs: ['p4'], dir: 'down', latch: true, label: 'Nisja', en: 'The nook' },
    ],
  },
  goals: [
    { id: 'port1', type: 'gate', door: 'd1', label: 'Åpne den første porten (kloss på platen)', en: 'Open the first gate (block on the plate)' },
    { id: 'port2', type: 'gate', door: 'd2', label: 'Trykk begge platene samtidig', en: 'Press both plates at once' },
    { id: 'bro', type: 'reach', on: 'plat_b', gate: true, label: 'Senk vindebroen med bryteren og kom over', en: 'Lower the drawbridge with the switch and cross' },
    { id: 'nisje', type: 'crumbs', n: 3, label: 'Åpne nisja og ta de tre smulene (valgfritt)', en: 'Open the nook and take the three crumbs (optional)' },
  ],
};
fs.writeFileSync(new URL('../scenes/gaate.scene.json', import.meta.url), JSON.stringify(s, null, 2) + '\n');
console.log('skrev scenes/gaate.scene.json');
