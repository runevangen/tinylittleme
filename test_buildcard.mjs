// node test_buildcard.mjs: R144 oppdragskortet er kort, forsvinner av seg selv, vises ikke etter BYGG, kan skrus av (SETTINGS), gjelder Byggeskolen (delt kode).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CARD_SECS, CARD_FADE, cardShow, cardOpacity } from './buildghostw_logic.js';
assert.ok(cardShow({ shown: 0 }) && cardShow({ shown: CARD_SECS - 0.1 }) && !cardShow({ shown: CARD_SECS }), 'forsvinner av seg selv');
assert.ok(!cardShow({ seen: true, shown: 0 }), 'ikke igjen etter BYGG');
assert.ok(!cardShow({ on: false, shown: 0 }), 'valget av');
assert.equal(cardOpacity(0), 1); assert.ok(cardOpacity(CARD_SECS - CARD_FADE / 2) < 1 && cardOpacity(CARD_SECS) === 0);
const b = fs.readFileSync('build.js', 'utf8'), m = fs.readFileSync('main.js', 'utf8');
assert.ok(/getCard\(\)/.test(b) && /oppdragskort vist/.test(b) && /oppdragskort borte av seg selv/.test(b), 'build.js: kobling og logg');
assert.ok(/fl\('buildcard', 'spill'/.test(m) && /store\.get\('tlm\.buildcard', true\)/.test(m) && /getCard: \(\) => buildCard/.test(m) && /logEv\('bygg', v \? 'oppdragskort på'/.test(m), 'main.js: SETTINGS spill, logg');
console.log('buildcard: ok');
