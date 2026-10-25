// Håndlaget testbrett: «nattbord + bokhylle».
// Samme format skal senere genereres fra bilder (se CONCEPT.md → scene-skjema).
// Enhet: 1 ≈ 5 cm (spilleren er altså ~5 cm høy, nattbordet ~55 cm).
// Typer styrer bare utseende; fysikken bryr seg kun om min/max.

import { box } from './physics.js';

const W = 40; // halv romstørrelse

const boxes = [
  box('floor', -W, W, -2, 0, -W, W, { color: 0xffffff }),

  // rommurer (tykke, så ingen kan falle ut)
  box('wall', -W - 1, -W, 0, 120, -W, W, { color: 0xe9e1d3 }),
  box('wall', W, W + 1, 0, 120, -W, W, { color: 0xe9e1d3 }),
  box('wall', -W, W, 0, 120, -W - 1, -W, { color: 0xe9e1d3 }),
  box('wall', -W, W, 0, 120, W, W + 1, { color: 0xe9e1d3 }),

  // bokstige: hopp + kantgrep
  box('book', -14.5, -9.5, 0, 1.6, 6, 10, { color: 0xa23b2a }),
  box('book', -11, -6, 0, 3.2, 6, 10, { color: 0x2f5d7c }),
  box('book', -5.5, -0.5, 0, 5, 6, 10, { color: 0xc99a2e }),

  // nattbord med halvåpen skuff
  box('wood', 0, 10, 0, 11, -6, 4, { color: 0xb9845a, cp: true }),
  box('wood', 1.5, 8.5, 5.5, 7, 4, 10, { color: 0xc99a6c }),
  box('plastic', 6, 9, 11, 11.8, -5, -1.5, { color: 0x24262e }),     // mobil
  box('plastic', 1, 3.5, 11, 12.4, -4.5, -2, { color: 0xe8d9a8 }),   // lampefot

  // bokhylle: første hylle, så et «skorsteinsløp» for veggsprang
  box('wood', 17, 26, 12, 16, -8, 2, { color: 0x8c5a3a, cp: true }),
  box('book', 17, 18, 16, 29, -2, 2, { color: 0x5b3f7a }),           // vegg A
  box('book', 21, 22, 16, 29, -2, 2, { color: 0x1f6b8f }),           // vegg B
  box('wood', 21, 29, 26, 29, -4, 4, { color: 0x8c5a3a }),           // mål-hylle
];

// bare utseende (ingen kollisjon)
const decor = [
  { shape: 'box', pos: [7.5, 11.82, -3.25], size: [2.7, 0.04, 3.2], color: 0x0a1b33, emissive: 0x2a6bd6, rough: 0.2 }, // mobilskjerm
  { shape: 'sphere', pos: [5, 6.2, 10.15], size: [0.28], color: 0xd8c8a8, metal: 0.8, rough: 0.25 },                    // skuffeknott
];

export const LEVEL = {
  boxes,
  decor,
  // hengende kabel mellom nattbord og hylle – sving over gapet
  ropes: [{ x: 13.5, y: 22, z: 0, len: 10 }],
  start: [-16, 0, 8],
  goal: [25.5, 29, 0],
  // ruta pilen følger (flater i rekkefølge; `via` = ikke noe du står på, men noe du bruker: `act` sier hva)
  route: [
    { id: 'gulv', label: 'gulvet', x0: -W, x1: W, z0: -W, z1: W, top: 0 },
    { id: 'bok1', label: 'første bok', x0: -14.5, x1: -9.5, z0: 6, z1: 10, top: 1.6 },
    { id: 'bok2', label: 'andre bok', x0: -11, x1: -6, z0: 6, z1: 10, top: 3.2 },
    { id: 'bok3', label: 'tredje bok', x0: -5.5, x1: -0.5, z0: 6, z1: 10, top: 5 },
    { id: 'nattbord', label: 'nattbordet', x0: 0, x1: 10, z0: -6, z1: 4, top: 11 },
    { id: 'kabel', label: 'kabelen', x0: 13, x1: 14, z0: -0.5, z1: 0.5, top: 12, via: true, act: 'svinge' },
    { id: 'hylle1', label: 'bokhylla', x0: 17, x1: 26, z0: -8, z1: 2, top: 16 },
    { id: 'skorstein', label: 'mellom bøkene', x0: 18, x1: 21, z0: -2, z1: 2, top: 16, via: true, act: 'veggsprang' },
    { id: 'maalhylle', label: 'øverste hylle', x0: 21, x1: 29, z0: -4, z1: 4, top: 29 },
  ],
  deathY: -15,
  room: { x0: -W, x1: W, z0: -W, z1: W, height: 100, floor: { material: 'wood' }, walls: { material: 'plaster' }, ceiling: { material: 'plaster' } },
  windows: [{ wall: 'N', pos: [8, 46, -W + 0.05], size: [26, 34] }],
  sun: [28, 60, -24],
  audio: { reverb: 0.12 },
};
