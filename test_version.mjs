// node test_version.mjs: version.js må eksportere VERSION (ellers krasjer hele spillet ved oppstart), og den må stemme med øverste linje i CHANGELOG.md
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { VERSION } from './version.js';
assert.equal(typeof VERSION, 'string', 'version.js må eksportere VERSION som tekst');
assert.match(VERSION, /^\d+\.\d+$/, 'VERSION må ha formen «1.23»');
const top = fs.readFileSync('CHANGELOG.md', 'utf8').split('\n').map((l) => l.match(/^(?:- )?\*{0,2}v?(\d+\.\d+)\*{0,2}\b/)).find(Boolean);
assert.ok(top, 'CHANGELOG.md må ha en versjonslinje øverst');
assert.equal(top[1], VERSION, `øverste linje i CHANGELOG.md (${top[1]}) må stemme med version.js (${VERSION})`);
console.log('version: ok', VERSION);
