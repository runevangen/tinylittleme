// R115: bestått prøve i KLASSISK modus på et sted i stage-kjeden (Vippe, Trapp) skal registreres som bestått, så neste sted åpnes. Ekte nettleser: tools/live_vippepass.cjs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const b = fs.readFileSync(new URL('./build.js', import.meta.url), 'utf8');
assert.match(b, /if \(gst\) stagePass\(gst, winRes\); else if \(stageHere\(\)\) stagePass\(/, 'klassisk bestått registreres');
assert.match(b, /stageOf,/, 'stageOf importert');
console.log('test_vippepass: ok');
