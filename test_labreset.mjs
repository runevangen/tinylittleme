// R105: NULLSTILL STED/ALLE i Byggeskolen setter stedet tilbake til klassisk modus (gridWipe), så den nye byggeskjermen må tas i bruk igjen. Se tools/live_labreset.cjs for ekte nettleser.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const b = fs.readFileSync(new URL('./build.js', import.meta.url), 'utf8');
const i = b.indexOf('function labReset(s, why)'), j = b.indexOf('function labResetAll'); assert.ok(i > 0 && j > i);
const body = b.slice(i, j);
assert.match(body, /gridWipe\(b\)/, 'nullstilling visker rutenettet'); assert.match(body, /buxEnter\(\)/, 'og går inn i den nye byggeskjermen igjen');
assert.ok(body.indexOf('gridWipe(b)') < body.indexOf('buxEnter()'), 'buxEnter etter gridWipe');
console.log('test_labreset: ok');
