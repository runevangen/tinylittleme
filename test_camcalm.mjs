// node test_camcalm.mjs: R54 roligere kamera (synsfelt etter skjermformat, engangs-migrering av følging)
import assert from 'node:assert/strict';
import { fovForAspect, hFov, effectiveFov, fovChosen, migrateCalm, camLine, CALM_KEY } from './camcalm_logic.js';
import { formatReport } from './settings_util.js';
import { approach } from './landing.js';
import { readFileSync } from 'node:fs';

assert.equal(fovForAspect(390 / 844), 70, 'stående iPhone: 70');
assert.equal(fovForAspect(844 / 390), 52, 'liggende iPhone: 52');
assert.equal(fovForAspect(1.6), 52, 'PC-vindu: 52');
assert.ok(hFov(70, 390 / 844) > hFov(52, 390 / 844) + 8, 'bredere vannrett synsfelt stående');
assert.ok(hFov(52, 390 / 844) < 27, 'gammelt: ca. 25° vannrett');
assert.equal(effectiveFov(null, 70), 70); assert.equal(effectiveFov(undefined, 52), 52); assert.equal(effectiveFov(60, 70), 60, 'valgt beholdes');
assert.equal(fovChosen(null), false); assert.equal(fovChosen(52), false); assert.equal(fovChosen(70), true);

// myk overgang når telefonen snus: ingen sprang, ender på målet
{ let c = 52, mx = 0; for (let i = 0; i < 300; i++) { const n = approach(c, 70, 1 / 60, 3, 3); mx = Math.max(mx, Math.abs(n - c)); c = n; } assert.ok(mx < 1 && Math.abs(c - 70) < 0.1, `glatt (maks steg ${mx.toFixed(2)} grader)`); }

// migrering
{ const st = { 'tlm.follow': true }, get = (k, d) => (k in st ? st[k] : d), set = (k, v) => { st[k] = v; };
  assert.equal(migrateCalm(get, set), true, 'kjører første gang'); assert.equal(st['tlm.follow'], false, 'følging av'); assert.equal(st[CALM_KEY], true);
  st['tlm.follow'] = true;   // spilleren slår den på igjen
  assert.equal(migrateCalm(get, set), false, 'bare én gang'); assert.equal(st['tlm.follow'], true, 'valget står'); }
{ const st = {}, get = (k, d) => (k in st ? st[k] : d), set = (k, v) => { st[k] = v; }; migrateCalm(get, set); assert.equal(st['tlm.follow'], false, 'ny spiller: av'); }

// rapport
const line = camLine({ fov: 70, auto: true, aspect: 390 / 844, follow: false, strength: 1 });
assert.ok(line.includes('70°') && line.includes('stående') && line.includes('kamerafølging av'), line);
assert.ok(camLine({ fov: 60, auto: false, aspect: 2, follow: true, strength: 1 }).includes('valgt av spilleren'));
const rep = formatReport({ version: '9', level: 'Bad', when: 'x', device: 'd', screen: 's', touch: true, preset: 'p', clock: 1, points: 1, fps: 'f', pos: [0, 0, 0], state: 'ground', target: 't', stats: {}, changed: [], marks: [], events: [], camera: line });
assert.ok(rep.includes('Kamera: synsfelt 70°'), 'synsfelt i testrapporten');

// kilde: modulen er lastet, innstillinger og logging finnes
const html = readFileSync('./index.html', 'utf8'), main = readFileSync('./main.js', 'utf8');
assert.ok(html.includes("'camcalm_logic'"), 'i files i index.html');
assert.ok(main.includes("fl('fovauto'") && main.includes("logEv('kamera'") && main.includes("store.get('tlm.follow', false)"), 'SETTINGS + logEv + standard av');
console.log('camcalm-tester grønne');
