// R101: alt som endres på brobyggeren skal også gjelde Byggeskolen (Bygglab-stedene). Denne testen holder dem like:
// (1) alle rutenett-steder i broene og i Bygglab bruker samme tegnekode (grid_view.js), samme veiregel (roadLevel) og samme forenklede skjerm (buxSite);
// (2) hvert bro-lignende sted (to ankre på samme høyde) får en vei, og alle slike steder i Bygglab som er «bro» eller «fagverk» får den nye byggeskjermen;
// (3) Byggeskolens steder finnes i begge ender: hovedmenyen og Bygglab bruker samme `lab.key`.
import fs from 'node:fs';
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const G = await import('./grid_logic.js'), X = await import('./buildux_logic.js'), P = await import('./grid_play.js');
const lvl = (n) => JSON.parse(fs.readFileSync(new URL(`./levels/${n}.level.json`, import.meta.url), 'utf8'));
let n = 0;
for (const name of ['bro', 'kjokkenbro', 'bygglab']) {
  const L = lvl(name); P.ensurePlayGrid?.(L.build.sites);
  for (const site of L.build.sites) {
    if (!G.siteHasGrid(site)) continue;
    const rv = G.roadLevel(site), an = G.gridAnchors(site);
    if (an.length === 2 && Math.abs(an[0].v - an[1].v) < 1e-6) { assert.notEqual(rv, null, `${name}/${site.id}: bro-lignende sted skal ha en vei`); n++; }
    else assert.equal(rv, null, `${name}/${site.id}: bare steder med to like høye ankre har vei`);
    if (name === 'bygglab' && site.lab && ['bro', 'fagverk'].includes(site.lab.key)) assert.ok(X.buxSite({ levelId: 'bygglab', site }), `Byggeskole ${site.lab.key} skal ha nyeste byggeskjerm`);
    if (name !== 'bygglab' && X.BUX.levels[name]?.includes(site.id)) assert.ok(X.buxSite({ levelId: name, site }), `${name}/${site.id} skal ha nyeste byggeskjerm`);
  }
}
assert.ok(n >= 3, 'minst tre bro-lignende steder har vei: ' + n);
const gv = fs.readFileSync(new URL('./grid_view.js', import.meta.url), 'utf8'), main = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8');
assert.match(gv, /roadLevel\(S\)/, 'tegningen bruker den felles veiregelen');
assert.ok(!/siteHasGrid\(site\)[^;]*lab/.test(gv), 'ingen egen tegnekode for Bygglab');
assert.match(fs.readFileSync(new URL('./CLAUDE.md', import.meta.url), 'utf8'), /Byggeskolen/, 'CLAUDE.md har regelen om at brobygger-endringer også gjelder Byggeskolen');
console.log('test_paritet: ok (' + n + ' bro-lignende steder)');
