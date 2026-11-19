// node test_goalway.mjs: R98 oppdragslinje og peiling: tekst per målkilde, når linja vises (vanskelighet, ⚙, trykk), peilingens klokke (stille, feil vei, framdrift, pause, glød, lang stillstand),
// kant-ikonets retning, kontroll i alle brett (tools/goal_check.mjs), i18n, SETTINGS og at modulen er koblet inn.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { WAY, GOAL_ICON, questModel, questVisible, normQuestMode, createWay, stepWay, peekMark, wayTarget, peekAngle } from './goalway_logic.js';
import { initGoals, activeGoal } from './goals.js';
import { aim } from './guide_logic.js';
import { DIFFS, diffProfile } from './difficulty.js';
import { makeT } from './i18n.js';

const T = makeT(() => 'nb').T, Te = makeT(() => 'en').T;
const mkL = (goals) => { const L = { goals }; initGoals(L); return L; };

// ---- oppdragslinje: tekst og ikon ----
{
  const L = mkL([{ id: 'a', type: 'reach', label: 'Kom opp på kjøkkenbenken', en: 'Get up on the counter', x0: 0, x1: 1, z0: 0, z1: 1, top: 3 }, { id: 'b', type: 'crumbs', n: 5, label: 'Samle 5 smuler', en: 'Collect 5 crumbs' }, { id: 'c', type: 'flag', flag: 'bro1', label: 'Bygg en bro over gapet (BYGG-knappen)', en: 'Build a bridge (BUILD button)' }]);
  const m = questModel({ L, goal: activeGoal(L), t: { label: 'benk', kind: 'route', grip: false }, T, lang: 'nb' });
  assert.equal(m.text, 'Kom opp på kjøkkenbenken'); assert.equal(m.icon, GOAL_ICON.reach); assert.equal(m.src, 'goal');
  assert.equal(questModel({ L, goal: activeGoal(L), t: null, T, lang: 'en' }).text, 'Get up on the counter', 'engelsk tekst');
  L.goalList[0].done = true;
  const c = questModel({ L, goal: activeGoal(L), t: null, T, lang: 'nb', ctx: { crumbs: 2 } }); assert.equal(c.text, 'Samle 5 smuler (2/5)', 'framdrift i linja'); assert.equal(c.icon, '🍪');
  L.goalList[1].done = true;
  const f = questModel({ L, goal: activeGoal(L), t: { label: 'kant', kind: 'route', grip: false }, T, lang: 'nb' }); assert.ok(/BYGG-knappen/.test(f.text) && !/mellomrom|tast/i.test(f.text), 'byggemål nevner knappen'); assert.equal(f.icon, '🔨');
  assert.notEqual(c.key, f.key, 'nøkkelen endres når målet skifter');
  // gåtemål (nøkkel, plate) går foran delmålet
  const k = questModel({ L: mkL([]), goal: { id: 'x', type: 'reach', label: 'Annet', en: 'Other' }, t: { label: 'Nøkkelen', kind: 'key' }, T, lang: 'nb' }); assert.equal(k.text, 'Nøkkelen'); assert.equal(k.icon, '🔑'); assert.equal(k.src, 'puzzle');
  // uten delmål: neste flate på ruta, ellers siste mål
  const r = questModel({ L: mkL([]), goal: null, t: { label: 'vask', kind: 'route', grip: false }, T, lang: 'nb' }); assert.equal(r.text, 'Gå til vask'); assert.equal(Te('quest.goTo', { name: 'sink' }), 'Go to sink');
  const e = questModel({ L: mkL([]), goal: null, t: { label: 'mål', kind: 'route', final: true }, T, lang: 'nb' }); assert.equal(e.text, 'Nå målet'); assert.equal(e.icon, '🚩'); assert.equal(Te('quest.final'), 'Reach the goal');
  assert.equal(questModel({ L: mkL([]), goal: null, t: null, T, lang: 'nb' }), null, 'ingenting å si');
}

// ---- når linja vises ----
{
  assert.ok(questVisible({ mode: 'auto', diffOn: diffProfile('beginner').questLine, now: 1 }) && questVisible({ mode: 'auto', diffOn: diffProfile('medium').questLine, now: 1 }), 'på for Nybegynner og Medium');
  assert.ok(!questVisible({ mode: 'auto', diffOn: diffProfile('expert').questLine, now: 1 }), 'av for Ekspert');
  assert.ok(questVisible({ mode: 'auto', diffOn: false, tapUntil: 7000, now: 1000 }), 'trykk på ⋯ eller mål-ikonet henter den fram, også på Ekspert');
  assert.ok(!questVisible({ mode: 'auto', diffOn: false, tapUntil: 7000, now: 7001 }), 'og den går bort igjen');
  assert.ok(questVisible({ mode: 'on', diffOn: false, now: 1 }) && !questVisible({ mode: 'off', diffOn: true, now: 1 }), '⚙ kan overstyre begge veier');
  assert.equal(normQuestMode('x'), 'auto'); assert.equal(normQuestMode('off'), 'off');
}

// ---- peilingens klokke ----
{
  const run = (fn, ms = 40000, dt = 100) => { const s = createWay(), log = []; for (let t = 0; t <= ms; t += dt) { const r = stepWay(s, t, fn(t)); if (r.peek) log.push({ t, why: r.peek }); if (r.long) log.push({ t, why: 'lang' }); } return { s, log }; };
  // stå stille: første peiling etter 8 s, så hvert 8. s; «lang stillstand» ved 20 s, én gang
  const still = run(() => ({ key: 'k', dist: 30, moving: false, inFrame: false }), 25000);
  assert.deepEqual(still.log.filter((e) => e.why !== 'lang').map((e) => [e.t, e.why]), [[8000, 'stille'], [16000, 'stille'], [24000, 'stille']]);
  assert.deepEqual(still.log.filter((e) => e.why === 'lang').map((e) => e.t), [20000], 'lang stillstand logges én gang');
  // feil vei: går, men kommer ikke nærmere (avstanden vokser)
  const wrong = run((t) => ({ key: 'k', dist: 30 + t / 1000, moving: true, inFrame: false }), 9000);
  assert.deepEqual(wrong.log.map((e) => e.why), ['feil vei']);
  // riktig vei: nærmere hele tiden: aldri peiling
  const right = run((t) => ({ key: 'k', dist: 60 - t / 1000 * 2, moving: true, inFrame: false }), 25000); assert.equal(right.log.length, 0, 'framdrift nullstiller klokka');
  // nytt mål nullstiller
  { const s = createWay(); stepWay(s, 0, { key: 'a', dist: 30, moving: false, inFrame: false }); const r = stepWay(s, 8500, { key: 'b', dist: 30, moving: false, inFrame: false }); assert.equal(r.peek, null, 'nytt mål: klokka starter på nytt'); }
  // peilingen står bare ca. 1 s
  { const s = createWay(); let shown = 0; for (let t = 0; t <= 10000; t += 100) if (stepWay(s, t, { key: 'k', dist: 30, moving: false, inFrame: false }).showing) shown += 100; assert.ok(shown >= 900 && shown <= 1100, `ikonet står ca. 1 s (${shown} ms)`); }
  // pause (meny, intro): klokka teller ikke
  { const s = createWay(); for (let t = 0; t <= 30000; t += 100) assert.equal(stepWay(s, t, { key: 'k', dist: 30, moving: false, inFrame: false, active: false }).peek, null); const r = stepWay(s, 30100, { key: 'k', dist: 30, moving: false, inFrame: false }); assert.equal(r.peek, null, 'etter pausen starter klokka på nytt'); }
  // målet er på skjermen, men loddrett over (ikke «i bildet»): glød OG peiling
  { const s = createWay(); let ic = 0, gl = 0; for (let t = 0; t <= 9000; t += 100) { const r = stepWay(s, t, { key: 'k', dist: 30, moving: false, inFrame: false, seen: true }); if (r.peek) ic++; if (r.glow) gl++; } assert.equal(ic, 1); assert.ok(gl > 0); }
  // målet i bildet: ingen kant-ikon, men glød
  { const s = createWay(); let ic = 0, gl = 0; for (let t = 0; t <= 9000; t += 100) { const r = stepWay(s, t, { key: 'k', dist: 30, moving: false, inFrame: true }); if (r.peek) ic++; if (r.glow) gl++; } assert.equal(ic, 0, 'i bildet: ingen kant-ikon'); assert.ok(gl > 0, 'i bildet: gløden lyser'); }
  // glød når målet kommer i syne, og den slukker etter glowMs
  { const s = createWay(); stepWay(s, 0, { key: 'k', dist: 30, moving: true, inFrame: false }); assert.equal(stepWay(s, 100, { key: 'k', dist: 29, moving: true, inFrame: false }).glow, false);
    assert.equal(stepWay(s, 200, { key: 'k', dist: 28, moving: true, inFrame: true }).glow, true, 'glød når målet kommer i syne'); assert.equal(stepWay(s, 200 + WAY.glowMs + 50, { key: 'k', dist: 20, moving: true, inFrame: true }).glow, false, 'ikke permanent'); }
  // for langt unna: ingen glød
  { const s = createWay(); assert.equal(stepWay(s, 0, { key: 'k', dist: WAY.glowRange + 20, moving: true, inFrame: true }).glow, false); }
}

// ---- kant-ikonet peker mot målet ----
{
  for (const [dx, dz, yaw] of [[0, -10, 0], [10, 0, 0], [-10, 0, 0], [0, 10, 0], [6, -6, 1.2]]) {
    const a = aim({ dx, dy: 0, dz, yaw }), m = peekMark({ a, w: 390, h: 844 });
    assert.ok(m && m.x >= 34 - 0.5 && m.x <= 390 - 34 + 0.5 && m.y >= 96 - 0.5 && m.y <= 844 - 170 + 0.5, 'ikonet ligger på skjermen, unna toppbånd og knapper');
    const ox = m.x - 195, oy = m.y - 422; assert.ok(Math.abs(Math.sin(a.ang)) < 0.2 || Math.sign(ox) === Math.sign(Math.sin(a.ang)), 'høyre målvinkel gir ikon på høyre side');
    if (Math.abs(a.ang) > 2.6) assert.ok(oy > 0, 'mål bak: ikonet nederst'); if (Math.abs(a.ang) < 0.3) assert.ok(oy < 0, 'mål rett frem: ikonet øverst');
  }
  const L = { start: [0, 0, 0], route: [{ id: 'a', x0: -1, x1: 1, z0: -1, z1: 1, top: 0 }, { id: 'b', x0: 10, x1: 12, z0: -1, z1: 1, top: 0 }, { id: 'c', x0: 20, x1: 22, z0: -1, z1: 1, top: 0 }], goal: [21, 0, 0], goals: [] }; initGoals(L);
  const t = wayTarget(L, { x: 0, y: 0, z: 0 }, 0); assert.ok(t.x >= 10 && t.src === 'route', 'uten delmål: neste flate på ruta'); assert.ok(Math.abs(peekAngle({ x: 0, y: 0, z: 0 }, t, -Math.PI / 2)) < 0.05, 'kamera snudd mot +x: målet rett frem');
  assert.equal(wayTarget(L, { x: 11, y: 0, z: 0 }, 1).src, 'final', 'siste flate: målet');
}

// ---- profil, innstillinger, i18n, tilkobling ----
{
  assert.deepEqual(DIFFS.map((d) => diffProfile(d).questLine), [true, true, false]);
  const main = fs.readFileSync('main.js', 'utf8'), idx = fs.readFileSync('index.html', 'utf8');
  assert.ok(/sl\('questline', 'spill'/.test(main) && /fl\('waypeek', 'spill'/.test(main) && /rg\('waypeekms', 'admin'/.test(main), 'SETTINGS: oppdragslinje og peiling i riktig gruppe');
  for (const f of ['goalway_logic', 'goalway_view']) assert.ok(idx.includes(`'${f}'`), `${f} ligger i files i index.html`);
  assert.ok(/logEv\('maalvei'/.test(main), 'hendelser logges som maalvei');
  assert.ok(/wayFrame\(now, t, ga\)/.test(main) && /DIF\.questLine/.test(main), 'koblet inn i spillsløyfa');
  const view = fs.readFileSync('goalway_view.js', 'utf8'); assert.ok(!/\b(mellomrom|tast)\b/i.test(view), 'ingen taster i teksten');
  const i18n = fs.readFileSync('i18n.js', 'utf8'); assert.equal((i18n.match(/'quest\.goTo'/g) || []).length, 2); assert.equal((i18n.match(/'quest\.final'/g) || []).length, 2);
}

// ---- alle brett (tools/goal_check.mjs): ingen feil ----
{
  const out = execFileSync('node', ['tools/goal_check.mjs'], { encoding: 'utf8' });
  assert.ok(/goal_check: grønn/.test(out), out); assert.ok(/nivå 9/.test(out), 'alle ni nivåer er med');
}
console.log('goalway-tester grønne');
