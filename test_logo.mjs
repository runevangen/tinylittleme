// node test_logo.mjs: R134 logo. Filer finnes (og er PNG), versjonsparameter, valget showlogo, manifest, index.html (ikoner, lasteskjerm, moduler i files), hekter i main.js, lasteskjermens tidsfrister.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LOGO, LOGO_FILES, logoUrl, logoOn, menuLogoHtml, splashCloseDelay, manifestJson } from './logo_logic.js';
for (const f of LOGO_FILES) { const b = fs.readFileSync(`brand/${f}`); assert.equal(b.slice(1, 4).toString(), 'PNG', f + ' er PNG'); }
const px = (f) => { const b = fs.readFileSync(`brand/${f}`); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
assert.deepEqual(px('icon-180.png'), [180, 180]); assert.deepEqual(px('icon-192.png'), [192, 192]); assert.deepEqual(px('icon-512.png'), [512, 512]); assert.deepEqual(px('favicon-32.png'), [32, 32]);
const [lw, lh] = px(LOGO.menu); assert.ok(Math.abs(lw / lh - LOGO.ratio) < 0.02, 'logoens sideforhold');
assert.equal(logoUrl('a.png', '2.130'), './brand/a.png?v=2.130'); assert.equal(logoUrl('a.png'), './brand/a.png');
assert.ok(menuLogoHtml({ v: '2.5' }).includes('logo-mork.png?v=2.5') && menuLogoHtml({ on: false }) === '<h1>tinylittleme</h1>');
assert.ok(logoOn(null) && logoOn(undefined) && logoOn('true') && logoOn('rar{') && !logoOn('false') && !logoOn(false));
// lasteskjerm: lukkes alltid
assert.equal(splashCloseDelay({ elapsed: 0, menuShown: true }), LOGO.splashMinMs);
assert.equal(splashCloseDelay({ elapsed: 5000, menuShown: true }), 0);
assert.equal(splashCloseDelay({ elapsed: 100, menuShown: false }), LOGO.splashMaxMs - 100);
assert.equal(splashCloseDelay({ elapsed: 99999, menuShown: false }), 0);
// manifest
const man = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8')); assert.deepEqual(man, manifestJson());
assert.equal(man.display, 'standalone'); assert.equal(man.name, 'tinylittleme'); assert.equal(man.theme_color, '#F7B500');
for (const i of man.icons) assert.ok(fs.existsSync(i.src), i.src);
// index.html
const idx = fs.readFileSync('index.html', 'utf8');
for (const f of ['logo_logic', 'logo_view']) assert.ok(idx.includes(`'${f}'`), `${f} mangler i files`);
assert.ok(idx.includes('rel="icon"') && idx.includes('brand/favicon-32.png') && idx.includes('rel="apple-touch-icon"') && idx.includes('brand/icon-180.png') && idx.includes('rel="manifest"'));
assert.ok(/id="splash"/.test(idx) && /#splash\{[^}]*pointer-events:none/.test(idx) && /animation:splashgone/.test(idx), 'lasteskjermen tar aldri trykk og lukkes av CSS');
assert.ok(idx.includes('logo-mork.png?v="+window.__assetV'), 'lasteskjermens bilde har ?v=');
// main.js: valg og hekter
const main = fs.readFileSync('main.js', 'utf8');
assert.ok(/fl\('showlogo', 'spill'/.test(main) && main.includes("tlm.showlogo") && main.includes('logoUi.menu('), 'valg og hekte');
assert.ok(fs.readFileSync('.gitignore', 'utf8').includes('!brand/*.png'), 'brand-PNG-ene er ikke ignorert av git');
console.log('logo: ok');
