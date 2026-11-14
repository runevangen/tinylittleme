// Nivå 8: Stuen (R62). Sofa med puter, sofabord, TV-benk og en bokhylle som klatrevei, i barneskala. En skyvedør deler rommet i to: fjernkontrollen må bæres til trykkplata (R60) for at døra åpner seg.
// Skriver scenes/stue.scene.json. Bruk: node tools/make_stue.mjs   (deretter: node tools/scene2level.mjs scenes/stue.scene.json levels/stue.level.json  og  node tools/walk_route.mjs levels/stue.level.json)
// Byggestedet (gapet på 35 cm mellom sofaen og sofabordet) har samme mål som i lekerommet og kjøkkenbroen (R30/R31), så referansebygget (en lang planke) bærer.
import fs from 'node:fs';
import { autoCrumbs } from './place_crumbs.mjs';

const box = (id, kind, material, color, b, extra = {}) => ({ id, kind, material, color, box: b, confidence: 1, photos: [], ...extra });
const deco = (id, kind, material, color, b, extra = {}) => box(id, kind, material, color, b, { decor: true, ...extra });
const WOOD = '#9a6a3c', DARK = '#4a3426', SOFA = '#b3452f', SOFA2 = '#8e3424', CREAM = '#efe3c8';
const s = {
  name: 'Nivå 8: Stuen', units: 'cm', frame: 'Origo i nordvestre hjørne. x øst, z sør, y opp.', validate: true, rev: 1,
  source: { photos: 0, views: [], interpreted_by: 'Oppdiktet rom (ikke fra bilder), laget for nivå 8 (R62): stue i barneskala.', scale_anchors: ['sofaen 40 cm høy i setet', 'sofabordet 40 cm', 'bokhyllen 96 cm'], uncertainty: 'Ingen: rommet er tegnet for spillet.',
    note: 'Nivå 8 (R62). Vest: teppet, fjernkontrollen og trykkplata foran skyvedøren. Øst: sofa med puter, sofabord, TV-benk og bokhyllen som klatrevei. Den harde veien går langs gulvet og opp bokhylla; byggestedet (bro mellom sofa og sofabord) er snarveien.' },
  room: { fdetMax: 118, width: 670, depth: 280, height: 260, floor: { material: 'wood', color: '#c99a62', slick: false }, walls: { material: 'plaster', color: '#e9d7b0' }, ceiling: { material: 'plaster', color: '#f6efe0' } },
  start: { x: 90, z: 200 }, goal: { x: 647, y: 96, z: 45, on: 'maal', note: 'Motgift-bit øverst i bokhylla.' },
  windows: [{ wall: 'N', z: 320, y: 150, w: 150, h: 90 }, { wall: 'N', z: 90, y: 150, w: 100, h: 90 }],
  hazards: [{ id: 'kabelfelle', type: 'pit', box: [500, 595, 0, 4, 114, 128], message: 'Kabelfelle! Du floket deg i TV-ledningen' }],
  objects: [
    // teppet i vest er en hel verden: lesbare soner (rød ramme, gul stripe, blå midte), bare utseende
    deco('teppe', 'rug', 'fabric', '#b2402f', [10, 195, 0, 0.5, 70, 260]), deco('teppe_stripe', 'rug', 'fabric', '#f0c45a', [20, 185, 0.5, 0.9, 82, 248]), deco('teppe_midt', 'rug', 'fabric', '#2f5f9e', [45, 160, 0.9, 1.3, 110, 220]),
    deco('teppe_ring', 'rug', 'fabric', '#f4e8cc', [75, 130, 1.3, 1.7, 140, 190]),
    // leker på teppet (vanlige leke-kinds fra R2/R18): en varebil, en vippehest og bokstavklosser, utenfor gangveiene
    box('lekebil', 'toycar', 'plastic', '#e8453c', [25, 60, 0, 14, 88, 106]), box('vippehest', 'rockinghorse', 'wood', '#c9a46a', [28, 52, 0, 16, 250, 260]), box('bokstav_a', 'letterblock', 'plastic', '#f6c52b', [130, 142, 0, 12, 70, 82]), box('bokstav_b', 'letterblock', 'plastic', '#3fae5a', [146, 158, 0, 12, 70, 82]),
    // fjernkontrollen og en bok: lette ting som kan bæres (TA) til plata
    box('fjernkontroll', 'remote', 'plastic', '#2b2b30', [60, 76, 0, 5, 235, 243], { movable: 'light', help: 'Fjernkontrollen\nTa den (TA) og bær den til den gule plata foran skyvedøren. Legg den fra deg (TA igjen): døra åpner seg.' }),
    box('bok_lys', 'toyblock', 'book', '#3a78d8', [110, 122, 0, 12, 245, 257], { movable: 'light' }),
    // skyvedøren i midten av rommet står i veien til sofaen og bokhylla (se `gates`)
    // sofaen: sete, rygg og arm. Puter (myke) står på setet; trappa av bøker foran er veien opp
    box('bok_1', 'chest', 'book', '#3f8f6a', [268, 308, 0, 12, 150, 180]), box('bok_2', 'chest', 'book', '#d9902f', [268, 308, 0, 24, 125, 150]), box('bok_3', 'chest', 'book', '#7a4fa8', [268, 308, 0, 36, 100, 125], { cp: true }),
    box('sofa', 'sofa', 'fabric', SOFA, [262, 370, 0, 40, 20, 100], { cp: true, help: 'Sofaen\nKlatre på bøkene og opp i sofaen. Gapet til sofabordet er for bredt: trykk BYGG og bygg en bro, eller ta den lange veien.' }),
    box('sofa_rygg', 'sofa', 'fabric', SOFA2, [250, 370, 0, 80, 0, 20]), box('sofa_arm', 'sofa', 'fabric', SOFA2, [250, 262, 0, 56, 20, 100]),
    box('pute_1', 'cushion', 'fabric', '#f0c45a', [272, 312, 40, 52, 26, 76], { soft: true }), box('pute_2', 'cushion', 'fabric', '#4aa6b8', [316, 336, 40, 48, 40, 74], { soft: true }),
    // sofabordet med spill, og TV-benken med TV-en på veggen over
    box('bord', 'table', 'wood', WOOD, [405, 500, 0, 40, 20, 110], { cp: true }), box('spilleske', 'box', 'paper', '#d9453c', [450, 495, 40, 47, 24, 56]),
    box('tv_benk', 'chest', 'wood', DARK, [500, 550, 0, 52, 20, 110], { cp: true }),
    deco('tv', 'tv', 'plastic', '#141418', [495, 565, 95, 150, 0, 6]), deco('tv_skjerm', 'tv', 'glass', '#2a4b6e', [498, 562, 98, 147, 6, 7]),
    // bokhylla: trinn opp langs østveggen (den harde veien, 7 trinn), og tre hyllefjell fra TV-benken (snarveien) til toppen
    box('hylle_1', 'chest', 'wood', '#a9764a', [585, 625, 0, 12, 245, 280]), box('hylle_2', 'chest', 'wood', '#8c5a3a', [625, 670, 0, 24, 245, 280]), box('hylle_3', 'chest', 'wood', '#a9764a', [625, 670, 0, 36, 210, 245]),
    box('hylle_4', 'chest', 'wood', '#8c5a3a', [625, 670, 0, 48, 175, 210], { cp: true }), box('hylle_5', 'chest', 'wood', '#a9764a', [625, 670, 0, 60, 140, 175]), box('hylle_6', 'chest', 'wood', '#8c5a3a', [625, 670, 0, 72, 105, 140]), box('hylle_7', 'chest', 'wood', '#a9764a', [625, 670, 0, 84, 70, 105]),
    box('hylle_n1', 'chest', 'wood', '#a9764a', [550, 575, 0, 64, 20, 110]), box('hylle_n2', 'chest', 'wood', '#8c5a3a', [575, 600, 0, 76, 20, 110]), box('hylle_n3', 'chest', 'wood', '#a9764a', [600, 625, 0, 88, 20, 110]),
    box('maal', 'chest', 'wood', '#c8553d', [625, 670, 0, 96, 20, 70], { cp: true }),
    deco('bokhylle_bak', 'chest', 'wood', '#5a3b26', [662, 670, 96, 200, 20, 245]), deco('bokrygger', 'toyblock', 'book', '#3a78d8', [654, 662, 96, 140, 110, 245]),
    deco('bokrygger_2', 'toyblock', 'book', '#e8453c', [654, 662, 140, 175, 110, 245]),
  ],
  look: { exposure: 1.0, sun: 2.4 }, audio: { reverb: 0.25, theme: 'stue' },
  ants: [
    { id: 'maur_stue_1', type: 'ant', on: 'gulv', from: [260, 235], to: [500, 235] },
    { id: 'maur_stue_2', type: 'ant', on: 'gulv', from: [520, 190], to: [600, 190] },
    { id: 'veps_stue', type: 'wasp', on: 'gulv', from: [30, 60], to: [160, 60], alt: 17 },
  ],
  goals: [
    { id: 'smuler', type: 'crumbs', n: 6, label: 'Samle 6 smuler', en: 'Collect 6 crumbs' },
    { id: 'port', type: 'gate', door: 'd1', label: 'Åpne skyvedøren (fjernkontrollen på plata)', en: 'Open the sliding door (remote on the plate)' },
    { id: 'bygg', type: 'flag', flag: 'stue1', label: 'Bygg en bro mellom sofaen og bordet (BYGG-knappen)', en: 'Build a bridge from the sofa to the table (BUILD button)' },
    { id: 'hylla', type: 'reach', on: 'maal', gate: true, label: 'Klatre opp bokhylla', en: 'Climb the bookshelf' },
  ],
  gates: {
    plates: [{ id: 'p1', on: 'gulv', box: [145, 195, 130, 190], need: 2, label: 'Gul plate', en: 'Yellow plate' }],
    switches: [],
    doors: [{ id: 'd1', kind: 'door', box: [210, 222, 0, 260, 0, 280], needs: ['p1'], dir: 'down', latch: true, label: 'Skyvedøren', en: 'The sliding door' }],
  },
  build: {
    sites: [{ id: 'stue1', label: 'Gapet mellom sofaen og sofabordet', at: [387.5, 70], y: 40, w: 100, h: 60, d: 20, stars: { three: { cost: 3, parts: 2 }, two: { cost: 6, parts: 4 } }, anchors: [[-17.5, 0], [17.5, 0]], deck: [[-47.5, -17.5], [17.5, 47.5]], start: [-40, 0], goal: [40, 0], loads: ['ball', 'car'],
      ref: { placed: [{ id: 'p1', type: 'plank_l', u: 0, v: 0.25, rot: 0 }], links: [], surfaces: [{ id: '@bro', u0: -4, u1: 4, top: 0.5 }], route: ['gulv', 'bok_1', 'bok_2', 'bok_3', 'sofa', '@bro', 'bord', 'tv_benk', 'hylle_n1', 'hylle_n2', 'hylle_n3', 'maal'] } }],
    parts: [{ id: 'p1', type: 'plank_l', on: 'gulv', at: [300, 250] }, { id: 'p2', type: 'plank_s', on: 'gulv', at: [340, 250] }, { id: 'p3', type: 'block', on: 'gulv', at: [380, 250] }, { id: 'p4', type: 'weight', on: 'gulv', at: [270, 262] },
      { id: 'p5', type: 'plank_s', on: 'gulv', at: [330, 262] }, { id: 'p6', type: 'pencil', on: 'gulv', at: [400, 262] }, { id: 'p7', type: 'lego', on: 'gulv', at: [450, 262] }, { id: 'p8', type: 'lego', on: 'gulv', at: [490, 262] },
      { id: 'p9', type: 'ruler', on: 'gulv', at: [540, 262] }, { id: 'p10', type: 'book', on: 'gulv', at: [430, 250] }],
  },
};
s.collectibles = autoCrumbs(s);
fs.writeFileSync(new URL('../scenes/stue.scene.json', import.meta.url), JSON.stringify(s, null, 2) + '\n');
console.log('skrev scenes/stue.scene.json');
