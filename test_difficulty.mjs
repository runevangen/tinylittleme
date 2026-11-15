// node test_difficulty.mjs: R69, vanskelighetsnivå (difficulty.js): profiltabell, markørbudsjett, lagringsnøkler, opplåsing, merker, Egendefinert og at main.js leser hver rad.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DIFFS, PROFILE, HELP_KEYS, diffProfile, normDiff, offElements, markerBudget, progressKey, getBadges, awardBadge, bestBadge, hasBadge, badgeRow, badgeTotals, unlockedLevels, allowedDiffs, isCustomHelp, HELP_SETTINGS, dt, TEXT_KEYS } from './difficulty.js';
import { badgeCount } from './rewards.js';
const mem = () => { const m = new Map(); return { get: (k, d) => (m.has(k) ? m.get(k) : d), set: (k, v) => { if (v === null) m.delete(k); else m.set(k, v); }, m }; };

// ---- tre nivå, ukjent verdi faller tilbake på Nybegynner ----
assert.deepEqual(DIFFS, ['beginner', 'medium', 'expert']);
assert.equal(normDiff('x'), 'beginner'); assert.equal(normDiff(undefined), 'beginner'); assert.equal(normDiff('expert'), 'expert');

// ---- profiltabellen: alle hjelpeelement per nivå (forventet verdi for hver rad) ----
const WANT = {
  markerBudget: [6, 2, 0], infoMarks: [true, false, false], worldArrow: [true, true, false], compass: [true, true, false], nextLine: ['full', 'plain', 'none'],
  guideText: [true, false, false], showMe: [true, true, false], routeGlow: [true, false, false], introSweep: [true, true, false], introMark: [true, false, false],
  introHint: [true, false, false], helpCards: ['always', 'first', 'off'], contextHints: [true, true, false], failTips: [3, 5, 0], landingMarker: [true, true, false],
  waterWarn: [true, true, false], minimap: [true, true, false], subgoalText: [true, true, false], hintBubbles: [true, true, false],
};
assert.deepEqual([...HELP_KEYS].sort(), Object.keys(WANT).sort(), 'tabellen har akkurat de forventede radene');
for (const [k, vals] of Object.entries(WANT)) DIFFS.forEach((d, i) => assert.equal(PROFILE[d][k], vals[i], `${k} på ${d}`));
// Ekspert: ingen piler, kompass, hint, markører, NESTE, Vis meg, ruteutheving, kart, kort, tips
const E = diffProfile('expert');
for (const k of ['worldArrow', 'compass', 'guideText', 'showMe', 'routeGlow', 'introMark', 'introHint', 'contextHints', 'landingMarker', 'waterWarn', 'minimap', 'subgoalText', 'infoMarks', 'hintBubbles', 'introSweep']) assert.equal(E[k], false, `Ekspert: ${k} av`);
assert.equal(E.markerBudget, 0); assert.equal(E.nextLine, 'none'); assert.equal(E.helpCards, 'off'); assert.equal(E.failTips, 0);
assert.equal(offElements('expert').length, HELP_KEYS.length, 'Ekspert har alle hjelpeelement av');
assert.equal(offElements('beginner').length, 0, 'Nybegynner har alt på');
// Medium: mellom
const M = diffProfile('medium');
assert.equal(M.nextLine, 'plain'); assert.equal(M.markerBudget, 2); assert.equal(M.infoMarks, false); assert.equal(M.introSweep, true); assert.equal(M.introHint, false); assert.equal(M.routeGlow, false);
assert.equal(M.showMe, true); assert.equal(M.helpCards, 'first'); assert.equal(M.failTips, 5); assert.equal(M.minimap, true); assert.equal(M.waterWarn, true);
// hver kolonne er jevnt «mindre hjelp»: ingenting er på i Ekspert som er av i Medium, og ingenting på i Medium som er av i Nybegynner
for (const k of HELP_KEYS) { const [b, m, e] = DIFFS.map((d) => PROFILE[d][k]); if (typeof b === 'boolean') { assert.ok(+b >= +m && +m >= +e, `${k} er monotont`); } }

// ---- markørbudsjett: vanskelighetens tak, aldri over Hjelp-nivå ----
assert.equal(markerBudget('beginner', 'normal'), 3); assert.equal(markerBudget('beginner', 'much'), 6); assert.equal(markerBudget('beginner', 'none'), 0);
assert.equal(markerBudget('medium', 'normal'), 2); assert.equal(markerBudget('medium', 'much'), 2); assert.equal(markerBudget('expert', 'much'), 0); assert.equal(markerBudget('expert', 'normal'), 0);
assert.equal(markerBudget('beginner', 'normal', { normal: 5 }), 5);

// ---- lagringsnøkler per brett og nivå (Nybegynner = gammel nøkkel) ----
assert.equal(progressKey('bad', 0, 'beginner'), 'tlm.progress.bad'); assert.equal(progressKey('bad', 2, 'beginner'), 'tlm.progress.bad.r2');
assert.equal(progressKey('bad', 0, 'medium'), 'tlm.progress.bad.medium'); assert.equal(progressKey('bad', 2, 'expert'), 'tlm.progress.bad.r2.expert');
assert.equal(new Set(DIFFS.map((d) => progressKey('bad2', 3, d))).size, 3, 'tre ulike nøkler');
assert.equal(progressKey('bad', 0, 'ukjent'), 'tlm.progress.bad', 'ukjent nivå behandles som Nybegynner');

// ---- merker per brett og nivå ----
{ const st = mem();
  assert.equal(bestBadge(st, 'bad'), null); assert.equal(badgeRow(st, 'bad'), '');
  assert.equal(awardBadge(st, 'bad', 'beginner').isNew, true); assert.equal(awardBadge(st, 'bad', 'beginner').isNew, false, 'samme merke to ganger er ikke nytt');
  awardBadge(st, 'bad', 'expert'); awardBadge(st, 'barnerom', 'medium');
  assert.ok(hasBadge(st, 'bad', 'beginner') && hasBadge(st, 'bad', 'expert') && !hasBadge(st, 'bad', 'medium'));
  assert.equal(bestBadge(st, 'bad'), 'expert'); assert.equal(badgeRow(st, 'bad'), '🥉🥇');
  assert.deepEqual(badgeTotals(st), { beginner: 1, medium: 1, expert: 1, total: 3 }); assert.deepEqual(badgeTotals(st, ['bad']), { beginner: 1, medium: 0, expert: 1, total: 2 });
  assert.deepEqual(badgeCount(st), badgeTotals(st), 'rewards.js teller merkene');
  st.set('tlm.badges', 'skrot'); assert.deepEqual(getBadges(st), {}, 'ødelagt lagring tåles'); }

// ---- opplåsing og valg ved gjentatt spilling ----
const LV = [{ id: 'bad', n: 1 }, { id: 'barnerom', n: 2 }, { id: 'kjokken', n: 3 }, { id: 'bro' }];
assert.deepEqual(unlockedLevels(LV, {}).map((l) => l.id), ['bad'], 'første brett er åpent, ellers ingenting');
assert.deepEqual(unlockedLevels(LV, { bad: 50 }).map((l) => l.id), ['bad', 'barnerom']);
assert.deepEqual(unlockedLevels(LV, { bad: 50, barnerom: 40 }).map((l) => l.id), ['bad', 'barnerom', 'kjokken']);
assert.deepEqual(unlockedLevels(LV, {}, { bad: { medium: 1 } }).map((l) => l.id), ['bad', 'barnerom'], 'merke åpner også neste');
assert.ok(!unlockedLevels(LV, { bad: 1, barnerom: 1, kjokken: 1 }).some((l) => l.id === 'bro'), 'ekstrarom uten n er ikke i lista');
{ const st = mem();
  assert.deepEqual(allowedDiffs(st, 'bad'), ['beginner', 'medium', 'expert']);
  awardBadge(st, 'bad', 'medium'); assert.deepEqual(allowedDiffs(st, 'bad'), ['medium', 'expert'], 'samme eller vanskeligere');
  awardBadge(st, 'bad', 'expert'); assert.deepEqual(allowedDiffs(st, 'bad'), ['expert']); }

// ---- Egendefinert: et endret hjelpevalg ----
{ const st = mem(); assert.equal(isCustomHelp(st), false);
  for (const k of Object.keys(HELP_SETTINGS)) { const s2 = mem(); s2.set(k, typeof HELP_SETTINGS[k] === 'boolean' ? !HELP_SETTINGS[k] : 'none'); assert.equal(isCustomHelp(s2), true, `${k} endret gir Egendefinert`); }
  st.set('tlm.difficulty', 'expert'); assert.equal(isCustomHelp(st), false, 'selve nivåvalget er ikke egendefinert'); }

// ---- tekster: nb og en har samme nøkler, og plassholdere går opp ----
assert.deepEqual([...TEXT_KEYS.nb].sort(), [...TEXT_KEYS.en].sort());
for (const l of ['nb', 'en']) for (const k of TEXT_KEYS[l]) assert.ok(!/\{\w+\}/.test(dt(l, k, { n: 1, glyph: 'g', name: 'n' })), `${l}:${k}`);
assert.ok(dt('nb', 'df.menu').includes('meny')); assert.ok(!/taste|tast /i.test(Object.values(Object.fromEntries(TEXT_KEYS.nb.map((k) => [k, dt('nb', k)]))).join(' ')), 'tekstene nevner ikke taster');

// ---- main.js leser hver tabellrad (så en rad ikke bare står i tabellen) ----
const main = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8');
for (const k of HELP_KEYS) assert.ok(k === 'markerBudget' ? /diffBudget\(difficulty/.test(main) : new RegExp(`DIF\\.${k}\\b`).test(main), `main.js bruker DIF.${k}`);
assert.ok(/progKey = diffProgKey\(/.test(main) && /quitToMenu/.test(main) && /logEv\('vanskelighet'/.test(main), 'koblinger i main.js');
const idx = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
assert.ok(idx.includes("'difficulty'") && idx.includes("'difficulty_view'"), 'modulene ligger i files i index.html');
assert.ok(idx.includes('id="bMenu"') && idx.includes('id="winMenu"'), 'Avslutt til meny i ⋯-menyen og på målskjermen');
console.log('vanskelighets-tester grønne');
