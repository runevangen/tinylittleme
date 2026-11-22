// node test_autoload.mjs: R136, neste last velges automatisk etter bestått prøve (autoload_logic.js), hekter, tekster, valg.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const A = await import('./autoload_logic.js');
const site = { loads: ['ball', 'car'] };
{ const r = A.afterPass({ on: true, site, passed: ['ball'], current: 'ball' }); assert.deepEqual(r, { pick: 'car', next: 'car', done: 1, total: 2 }); }
{ const r = A.afterPass({ on: false, site, passed: ['ball'], current: 'ball' }); assert.equal(r.pick, null); assert.equal(r.next, 'car'); }
{ const r = A.afterPass({ on: true, site, passed: ['ball', 'car'], current: 'car' }); assert.equal(r.pick, null); assert.equal(r.next, null); assert.equal(r.done, 2); }
{ const r = A.afterPass({ on: true, site, passed: ['car'], current: 'car' }); assert.equal(r.pick, 'ball', 'første ubestått i rekkefølge'); }
{ const r = A.afterPass({ on: true, site: {}, passed: ['ball'], current: 'ball' }); assert.equal(r.pick, null); assert.equal(r.total, 0); }
assert.equal(A.cardLine({ next: null, done: 2, total: 2 }), null);
assert.deepEqual(A.cardLine({ next: 'car', done: 1, total: 2 }), { next: 'car', done: 1, total: 2 });
const html = fs.readFileSync('index.html', 'utf8'), main = fs.readFileSync('main.js', 'utf8'), b = fs.readFileSync('build.js', 'utf8'), i18n = fs.readFileSync('i18n.js', 'utf8');
assert.ok(html.includes("'autoload_logic'"), 'modulen er i files');
assert.ok(/fl\('autonextload', 'spill'/.test(main) && main.includes('getAutoNextLoad'), 'valget i SETTINGS og koblet');
assert.ok(b.includes("logEv('bygg', `neste last:") && b.includes('afterPass'), 'logEv og hekte i build.js');
assert.ok(i18n.split("'bn.nextLoad'").length === 3 && i18n.split("'build.wonMoreAuto'").length === 3, 'tekster på begge språk');
console.log('test_autoload: ok');
