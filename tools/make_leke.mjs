// Nivå 7: Lekerommet (R31). Grunnscene med legoknotter på gulv og tak, en egen fiende (tinnsoldat), delmål, en verktøy-gåte (hårgelé-trapp) og et byggested (bro).
// Skriver scenes/leke.scene.json. Bruk: node tools/make_leke.mjs   (deretter: node tools/scene2level.mjs scenes/leke.scene.json levels/leke.level.json  og  node tools/walk_route.mjs levels/leke.level.json)
// Geometrien til byggestedet (gapet på 35 cm mellom «platta» og «tarn») er den samme som i kjokkenbro (R30), så referansebygget (en lang planke) bærer.
import fs from 'node:fs';
import { autoCrumbs } from './place_crumbs.mjs';

const lego = (id, color, box, extra = {}) => ({ id, kind: 'legoblock', material: 'plastic', color, box, confidence: 1, photos: [], ...extra });
const RED = '#e8453c', YEL = '#f6c52b', GRN = '#3fae5a', BLU = '#3a78d8', ORA = '#f08a2c', WHT = '#ece8dc';
const s = {
  name: 'Nivå 7: Lekerommet', units: 'cm', frame: 'Origo i nordvestre hjørne. x øst, z sør, y opp.', validate: true, rev: 1,
  source: { photos: 0, views: [], interpreted_by: 'Oppdiktet rom (ikke fra bilder), laget for nivå 7 (R31): lekerom med legoknotter som gulv og tak.', scale_anchors: ['legoklosser 10 cm per lag', 'tårnet 160 cm'], uncertainty: 'Ingen: rommet er tegnet for spillet.',
    note: 'Nivå 7 (R31). Lekerommet: gulv og tak er legoplater (knotter). Den harde veien går langs gulvet og opp den smale trappa til høyre; byggestedet (bro over gapet) og hårgelé-trappa er snarveier.' },
  room: { width: 600, depth: 300, height: 260, floor: { material: 'plastic', color: '#2f9e57', slick: false }, walls: { material: 'plaster', color: '#f3e3b8' }, ceiling: { material: 'plastic', color: '#cfe3f5' } },
  start: { x: 30, z: 115 }, goal: { x: 572, y: 96, z: 60, on: 'maal', note: 'Motgift-bit øverst på lekekasse-tårnet (siste plate).' },
  windows: [{ wall: 'N', z: 300, y: 150, w: 120, h: 80 }],
  hazards: [],
  objects: [
    // venstre: trappa som bare kan brukes med byggingen (gapet mellom platta og tarn er 35 cm)
    lego('k1', RED, [60, 100, 0, 10, 40, 100]), lego('k2', YEL, [100, 140, 0, 20, 40, 100]), lego('k3', GRN, [140, 180, 0, 30, 40, 100]),
    lego('platta', BLU, [180, 260, 0, 40, 40, 100], { cp: true, help: 'Gapet\nHer mangler broen. Trykk BYGG, bygg en bro over gapet, eller ta den lange veien langs gulvet.' }),
    lego('tarn', WHT, [295, 365, 0, 40, 40, 100]), lego('t1', YEL, [365, 395, 0, 52, 40, 100]), lego('t2', RED, [395, 425, 0, 64, 40, 100], { cp: true }),
    // den harde veien: smale trinn opp langs østveggen (fra sørøst-hjørnet og nordover) til tårnet
    lego('r1', BLU, [515, 600, 0, 15, 265, 300]), lego('r2', GRN, [545, 600, 0, 31, 230, 265]), lego('r3', ORA, [545, 600, 0, 47, 195, 230]), lego('r4', RED, [545, 600, 0, 63, 160, 195], { cp: true }), lego('r5', YEL, [545, 600, 0, 79, 125, 160]),
    // snarveien via byggingen: klosser langs nordveggen opp til tårnet (gulvet foran er fritt)
    lego('m1', BLU, [395, 425, 0, 72, 0, 40]), lego('n1', GRN, [425, 455, 0, 80, 0, 40], { cp: true }), lego('n2', ORA, [455, 535, 0, 88, 0, 40]),
    lego('maal', RED, [545, 600, 0, 96, 0, 125], { cp: true }),
    // verktøy-gåten: hårgelé-flaska ligger på gulvet, trappa opp til t2 har et første trinn som er for høyt å hoppe på
    { id: 'hargele_leke', kind: 'gel_bottle', material: 'plastic', color: '#8fd8ee', box: [338, 342, 0, 10, 270, 274], confidence: 1, photos: [], movable: 'light', tool: 'gel',
      help: 'Hårgelé\nTa flaska (TA), bær den til det høye trinnet og trykk SMØR. Legg den fra deg (SLIPP) og klatre i gelen (GREP). Våt i 20 s: sklir.' },
    lego('gele_leke_trinn_1', YEL, [485, 505, 0, 27, 125, 160], { shortcut: true, help: 'Høyt trinn\nFor høyt å hoppe på. Smør hårgelé på trinnet (TA med flaska), klatre opp og gå trappa langs veggen. Den lange veien går fortsatt.' }),
    lego('gele_leke_trinn_2', ORA, [505, 525, 0, 45, 125, 160], { shortcut: true }), lego('gele_leke_trinn_3', RED, [525, 545, 0, 63, 125, 160], { shortcut: true, cp: true }),
  ],
  look: { exposure: 1.0, sun: 2.6 }, audio: { reverb: 0.2, theme: 'leke' },
  // legoknotter på gulv og tak (lekerom_view.js). plates: [x0, x1, z0, z1, farge] i cm: fargede legoplater i gulvet som peiler deg.
  lego: { floor: true, ceiling: true, color: '#46bb6c', ceilColor: '#e8f2fb', plates: [[0, 130, 60, 160, '#e8453c'], [420, 600, 160, 230, '#f6c52b'], [180, 300, 0, 40, '#3a78d8']] },
  ants: [
    { id: 'soldat_1', type: 'ant', skin: 'soldier', on: 'gulv', from: [95, 150], to: [290, 150] },
    { id: 'soldat_2', type: 'ant', skin: 'soldier', on: 'gulv', from: [440, 225], to: [505, 225] },
  ],
  goals: [
    { id: 'smuler', type: 'crumbs', n: 6, label: 'Samle 6 smuler', en: 'Collect 6 crumbs' },
    { id: 'soldat', type: 'stomp', n: 1, label: 'Knus en tinnsoldat', en: 'Squash a tin soldier' },
    { id: 'bygg', type: 'flag', flag: 'leke1', label: 'Bygg en bro over gapet (BYGG-knappen)', en: 'Build a bridge over the gap (BUILD button)' },
    { id: 'tarn', type: 'reach', on: 'r4', gate: true, label: 'Klatre trappa langs veggen', en: 'Climb the stairs along the wall' },
  ],
  shortcuts: [{ id: 'gele_leke', tool: 'gel', item: 'hargele_leke', label: 'Smør hårgelé og klatre trappa opp langs veggen', en: 'Smear hair gel and climb the stairs along the wall', stand: [480.5, 142.5], face: [1, 0],
    steps: ['gele_leke_trinn_1', 'gele_leke_trinn_2', 'gele_leke_trinn_3'], join: 'r5' }],
  build: {
    sites: [{ id: 'leke1', label: 'Gapet mellom platta og tårnet', at: [277.5, 70], y: 40, w: 100, h: 60, d: 20, anchors: [[-17.5, 0], [17.5, 0]], deck: [[-47.5, -17.5], [17.5, 47.5]], start: [-40, 0], goal: [40, 0], loads: ['ball', 'car'],
      ref: { placed: [{ id: 'p1', type: 'plank_l', u: 0, v: 0.25, rot: 0 }], links: [], surfaces: [{ id: '@bro', u0: -4, u1: 4, top: 0.5 }], route: ['gulv', 'k1', 'k2', 'k3', 'platta', '@bro', 'tarn', 't1', 't2', 'm1', 'n1', 'n2', 'maal'] } }],
    parts: [{ id: 'p1', type: 'plank_l', on: 'gulv', at: [300, 170] }, { id: 'p2', type: 'plank_s', on: 'k1', at: [80, 80] }, { id: 'p3', type: 'block', on: 'gulv', at: [120, 215] }, { id: 'p4', type: 'weight', on: 'gulv', at: [200, 215] }, { id: 'p5', type: 'plank_s', on: 'platta', at: [220, 80] },
      { id: 'p6', type: 'pencil', on: 'gulv', at: [260, 235] }, { id: 'p7', type: 'lego', on: 'gulv', at: [150, 235] }, { id: 'p8', type: 'lego', on: 'gulv', at: [175, 235] }, { id: 'p9', type: 'ruler', on: 'gulv', at: [60, 235] }, { id: 'p10', type: 'book', on: 'gulv', at: [330, 235] }],   // R46: leker som materialer
  },
};
s.collectibles = autoCrumbs(s);
fs.writeFileSync(new URL('../scenes/leke.scene.json', import.meta.url), JSON.stringify(s, null, 2) + '\n');
console.log('skrev scenes/leke.scene.json');
