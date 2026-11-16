// node test_vercheck.mjs: R77, versjonsjekk (version_check_logic.js): tolking, tallvis sammenligning, intervall, rolig tilstand, stille ved feil, hekter i index.html/main.js.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseVersion, compareVersions, isNewer, intervalMs, dueNow, calmNow, runCheck, reloadUrl, cardText, menuLine } from './version_check_logic.js';
import { VERSION } from './version.js';

assert.deepEqual(parseVersion("export const VERSION = '2.23';\n"), { major: 2, minor: 23, text: '2.23' });
assert.equal(parseVersion('v2.5').text, '2.5');
for (const bad of ['', null, undefined, '<html>404</html>', "VERSION = 'x.y'", 'export const VERSION = ;']) assert.equal(parseVersion(bad), null, String(bad));
assert.equal(compareVersions('2.9', '2.10'), -1, '2.9 < 2.10');
assert.equal(compareVersions('2.10', '2.9'), 1);
assert.equal(compareVersions('2.10', '2.10'), 0);
assert.equal(compareVersions('1.99', '2.0'), -1);
assert.equal(compareVersions('2.1', 'abc'), null);
assert.ok(isNewer('2.22', '2.22') === false && isNewer('2.23', '2.22') === false && isNewer('2.22', '2.23') === true && isNewer('2.22', 'søppel') === false);
assert.ok(isNewer('2.9', '2.10'));

assert.equal(intervalMs(5), 300000); assert.equal(intervalMs(0), 300000); assert.equal(intervalMs('x'), 300000);
assert.equal(intervalMs(0.2), 60000, 'minst 1 minutt'); assert.equal(intervalMs(999), 3600000, 'høyst 60 minutter');
assert.ok(dueNow({ now: 1000, last: 0, interval: 300000 }), 'aldri sjekket: sjekk');
assert.ok(!dueNow({ now: 100000, last: 1000, interval: 300000 }), 'ikke oftere enn intervallet');
assert.ok(dueNow({ now: 301000, last: 1000, interval: 300000 }));
assert.ok(dueNow({ now: 2000, last: 1000, interval: 300000, force: true }), 'SJEKK NÅ ignorerer intervallet');

assert.ok(calmNow({ screen: 'start' }) && calmNow({ screen: 'brettvalg' }) && calmNow({ screen: 'mal' }) && calmNow({ screen: 'innstillinger' }) && calmNow({ screen: 'meny' }));
assert.ok(!calmNow({ screen: 'spill' }), 'i spillet: ikke rolig (toppbånd og knapper trenger plassen)');
for (const s of ['bygg', 'oversikt', 'intro']) assert.ok(!calmNow({ screen: s }), s);
assert.ok(!calmNow({ screen: 'start', boss: true }) && !calmNow({ screen: 'start', cinema: true }) && !calmNow({ screen: 'start', testing: true }));

assert.deepEqual(await runCheck('2.22', async () => "export const VERSION = '2.23';"), { status: 'ny', remote: '2.23' });
assert.deepEqual(await runCheck('2.22', async () => "export const VERSION = '2.22';"), { status: 'nyeste', remote: '2.22' });
assert.deepEqual(await runCheck('2.22', async () => "export const VERSION = '2.9';"), { status: 'nyeste', remote: '2.9' }, 'lavere er ikke ny');
assert.equal((await runCheck('2.22', async () => { throw new Error('offline'); })).status, 'feil');
assert.equal((await runCheck('2.22', async () => '<html>404</html>')).status, 'feil');
assert.equal((await runCheck('2.22', () => { throw new TypeError('sync'); })).status, 'feil');

const u = new URL(reloadUrl('https://x.github.io/tinylittleme/?level=bad&start=0', '2.30', 123));
assert.equal(u.searchParams.get('v'), '2.30'); assert.equal(u.searchParams.get('level'), 'bad'); assert.equal(u.searchParams.get('u'), '123');
assert.equal(reloadUrl('ikke url', '1.0'), 'ikke url');
assert.ok(cardText('2.30').includes('v2.30') && cardText('2.30').includes('OPPDATERE'));
assert.ok(menuLine('2.22', 'idle').includes('SJEKK NÅ'));

const idx = fs.readFileSync('index.html', 'utf8'), main = fs.readFileSync('main.js', 'utf8');
for (const f of ['version_check_logic', 'version_check_view']) assert.ok(idx.includes(`'${f}'`), `${f} i files i index.html`);
assert.ok(/fl\('versionCheck', 'spill'/.test(main) && /rg\('versionCheckInterval', 'admin'/.test(main), 'SETTINGS');
assert.ok(fs.readFileSync('version_check_view.js', 'utf8').includes("logEv('versjon'"), 'logEv');
assert.ok(typeof VERSION === 'string');
console.log('vercheck: ok');
