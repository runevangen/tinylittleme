// node test_voice.mjs: replikkene: variasjon, minstemellomrom, prioritet, sannsynlighet
import assert from 'node:assert/strict';
import { LINES, createVoice } from './voice.js';

let t = 100, spoken = [], shown = [];
const mk = (rndv = 0) => { t = 100; spoken = []; shown = []; return createVoice({ speak: (x) => spoken.push(x), show: (x, s) => shown.push([x, s]), now: () => t, rnd: () => rndv }); };

// alle replikker finnes og er korte nok til å vises i en boble
for (const [k, L] of Object.entries(LINES)) { assert.ok(L.say.length >= 1 && L.gap > 0 && L.p > 0 && L.p <= 1, k); for (const s of L.say) assert.ok(s.length <= 40, `${k}: «${s}» er for lang`); }

let v = mk(0);
assert.ok(v.say('hardland'), 'sier noe'); assert.equal(spoken.length, 1); assert.equal(shown.length, 1); assert.ok(shown[0][1] >= 1.5);
assert.equal(v.say('hardland'), null, 'samme replikk igjen for tidlig');
t += 7; assert.ok(v.say('hardland'), 'etter gap (6 s) og globalt mellomrom kan den sies igjen');
v = mk(0); v.say('hardland'); t += 1; assert.equal(v.say('fall'), null, 'to ulike replikker rett etter hverandre: globalt mellomrom');
t += 3; assert.ok(v.say('fall'), 'etter globalt mellomrom går det');
v = mk(0); v.say('hardland'); t += 0.5; assert.ok(v.say('knockout'), 'prioriterte replikker kommer rett etter');
// sannsynlighet: høyt terningkast hopper over, men prøver igjen etter halve pausen
v = mk(0.99); assert.equal(v.say('pickup'), null, 'p=0,45 og terningkast 0,99: ingen replikk');
t += LINES.pickup.gap * 0.5 + 0.1; v = null;
// variasjon: ulike terningkast gir ulike varianter
const seen = new Set(); for (const r of [0, 0.4, 0.8]) { const vv = mk(r); seen.add(vv.say('hardland').text); }
assert.ok(seen.size >= 2, 'varianter');
// avslått: ingenting
let on = false; const off = createVoice({ speak: () => assert.fail('skal ikke snakke'), enabled: () => on, now: () => t, rnd: () => 0 }); assert.equal(off.say('goal'), null);
// force omgår pauser
v = mk(0); v.say('goal'); assert.ok(v.say('goal', true), 'force');
console.log('stemme-tester grønne');
