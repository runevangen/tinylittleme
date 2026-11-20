// R103: rapporten (⚑) tar med byggekoden når byggeskjermen er oppe, slik at et bygg som feiler kan gjenskapes (LIM INN).
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { formatReport } from './settings_util.js';
const base = { version: '9', level: 'Bad', when: 'x', device: 'd', screen: 's', touch: true, preset: 'p', clock: 1, points: 1, fps: 'f', pos: [0, 0, 0], state: 'ground', target: 't', stats: {}, changed: [], marks: [], events: [], camera: 'c' };
assert.ok(formatReport({ ...base, where: 'byggeskjerm (lab1)', buildCode: 'TLM1.abc' }).includes('Bygg (kode, kan limes inn med LIM INN): TLM1.abc'), 'koden står i rapporten');
assert.ok(!formatReport({ ...base, buildCode: '' }).includes('Bygg (kode'), 'uten kode ingen linje');
const main = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8'); assert.match(main, /buildCode: \(\(\) =>/, 'main.js legger koden i rapporten');
console.log('test_reportbuild: ok');
