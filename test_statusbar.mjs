// R155: statuslinjen (klokke/batteri) skal ligge over en mørk bakgrunn og spillet skal gå helt ut til kanten
import assert from 'node:assert/strict';
import fs from 'node:fs';
const h = fs.readFileSync('index.html', 'utf8');
assert.match(h, /viewport-fit=cover/, 'viewport-fit=cover');
assert.match(h, /<meta name="theme-color" content="#141a2c">/, 'mørk theme-color');
assert.match(h, /apple-mobile-web-app-status-bar-style" content="black-translucent"/, 'statuslinje over spillet på hjemmeskjerm');
assert.match(h, /html,body\{[^}]*background:#141a2c/, 'mørk bakgrunn bak statuslinjen');
assert.match(h, /canvas\{position:fixed;inset:0;width:100%;height:100%/, 'lerretet fyller hele skjermen');
for (const id of ['hud', 'bar', 'stick', 'btnJump', 'btnGrab']) assert.match(h.split('\n').filter((l) => l.includes('#' + id + '{')).join('\n'), /safe-area-inset/, `#${id} innenfor sikker sone`);
assert.match(h, /body::before\{[^}]*env\(safe-area-inset-top\)/, 'mørk tone bak statuslinjen');
const b = fs.readFileSync('build.js', 'utf8');
assert.match(b, /#bld\{position:fixed;inset:0;[^}]*background:linear-gradient\(#26324b/, 'byggeskjermen er mørk helt ut');
assert.match(b, /#bld \.bt\.top\{top:max\(8px,env\(safe-area-inset-top\)\)\}/, 'byggeknapper under statuslinjen');
console.log('statusbar: ok');
