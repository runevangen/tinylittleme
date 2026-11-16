// R76: byggeskjermens toppoppsett: «Avslutt til meny» er en knapp i toppraden (ikke absolutt plassert over raden under), NULLSTILL-teksten får plass,
// og knappene i toppraden (anslått bredde) går inn på smale skjermer uten å overlappe. Ekte layout sjekkes i tools/live_buildlayout.cjs (Playwright).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeT } from './i18n.js';

const src = fs.readFileSync(new URL('./build.js', import.meta.url), 'utf8');
assert.ok(!/#bld \.bmenu\{[^}]*position:absolute/.test(src), 'menyknappen er ikke lenger absolutt plassert over raden under');
assert.ok(/<div class="bt top"><button data-a="menu">/.test(src), 'menyknappen står først i toppraden');
assert.ok(/#bld \.bt\.top button\{[^}]*overflow:hidden/.test(src), 'tekst i toppknapper kan ikke stikke ut');
assert.ok(/menuLabel\(\)/.test(src) && /aria-label/.test(src.slice(src.indexOf("btn('menu')"), src.indexOf("btn('menu')") + 200)), 'hele «Avslutt til meny» ligger i aria-label');

for (const lang of ['nb', 'en']) {
  const { T } = makeT(() => lang);
  const key = T('build.menu'); assert.ok(key && key !== 'build.menu' && key.length <= 8, `kort menytekst (${lang}): ${key}`);
}

// anslått bredde (konservativt: 0,72 em per stor bokstav) av fem knapper i toppraden, per skjermbredde; ⚑ tar 46 px til høyre, 8 px marg, 6 px mellomrom
const em = 0.72;
for (const lang of ['nb', 'en']) {
  const { T } = makeT(() => lang);
  for (const W of [360, 375, 390, 430, 844]) {
    const fs_ = W <= 380 ? 11 : 12, pad = W <= 380 ? 4 : 6;
    const labels = ['build.menu', 'build.back', 'build.undo', 'build.reset', 'build.try'].map((k) => T(k));
    const need = labels.reduce((s, t) => s + [...t].length * em * fs_ + pad, 0) + 6 * (labels.length - 1);
    const have = W - 16 - 46;
    assert.ok(need <= have, `${lang} ${W}px: toppraden trenger ca. ${Math.round(need)} av ${have} px`);
  }
}
console.log('test_buildlayout: ok');
