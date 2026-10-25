// Håndlaget testbrett: «nattbord + bokhylle».
// Samme format skal senere genereres fra bilder (se CONCEPT.md → scene-skjema).
// Typer styrer bare utseende; fysikken bryr seg kun om min/max.

import { box } from './physics.js';

const boxes = [
  box('floor', -40, 40, -2, 0, -40, 40, { color: 0xd9b382 }),

  // usynlige rommurer
  box('bound', -41, -40, 0, 120, -40, 40, { hidden: true }),
  box('bound', 40, 41, 0, 120, -40, 40, { hidden: true }),
  box('bound', -40, 40, 0, 120, -41, -40, { hidden: true }),
  box('bound', -40, 40, 0, 120, 40, 41, { hidden: true }),

  // bokstige: hopp + kantgrep
  box('book', -14.5, -9.5, 0, 1.6, 6, 10, { color: 0xe4572e }),
  box('book', -11, -6, 0, 3.2, 6, 10, { color: 0x2e86ab }),
  box('book', -5.5, -0.5, 0, 5, 6, 10, { color: 0xf6c744 }),

  // nattbord med halvåpen skuff (dobbelthopp + kantgrep opp til toppen)
  box('wood', 0, 10, 0, 11, -6, 4, { color: 0xa8744a, cp: true }),
  box('wood', 1.5, 8.5, 5.5, 7, 4, 10, { color: 0xc08a5a }),
  box('plastic', 6, 9, 11, 11.8, -5, -1.5, { color: 0x3a3f58 }),     // mobil
  box('plastic', 1, 3.5, 11, 12.4, -4.5, -2, { color: 0xffe08a }),   // lampefot

  // bokhylle: første hylle, så et «skorsteinsløp» for veggsprang
  box('wood', 17, 26, 12, 16, -8, 2, { color: 0x8c5a3a, cp: true }),
  box('book', 17, 18, 16, 29, -2, 2, { color: 0x6a4c93 }),           // vegg A
  box('book', 21, 22, 16, 29, -2, 2, { color: 0x1982c4 }),           // vegg B
  box('wood', 21, 29, 26, 29, -4, 4, { color: 0x8c5a3a }),           // mål-hylle
];

export const LEVEL = {
  boxes,
  // hengende kabel mellom nattbord og hylle – sving over gapet
  ropes: [{ x: 13.5, y: 22, z: 0, len: 10 }],
  start: [-16, 0, 8],
  goal: [25.5, 29, 0],
  deathY: -15,
};
