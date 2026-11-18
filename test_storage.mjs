// node test_storage.mjs: R86, lagring og fremdrift (storage_logic.js, storage_view.js): trygg lagring, migrering fra gamle former (fixtures under), eksport/import, hva som slettes, koblinger.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createStore, normProgress, progressForm, normCleared, normRuns, normBadges, migrateAll, wipePlan, wipe, fmtClock, resumeLine, exportProgress, parseProgress, applyImport, isProgressKey, isSettingKey, sv, TEXT_KEYS, PROGRESS_VERSION, STORE_VERSION, savedSummary } from './storage_logic.js';
import { PROFILE, progressKey } from './difficulty.js';

// ---- fake localStorage ----
const mem = (init = {}, { failSet = false, failGet = false } = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k) => { if (failGet) throw new Error('nei'); return m.has(k) ? m.get(k) : null; }, setItem: (k, v) => { if (failSet) { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; } m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m }; };

// ---- 1. robusthet ----
{
  const be = mem({ 'tlm.good': '{"a":1}', 'tlm.bad': '{ikke json', 'tlm.arr': '[1,2]', 'tlm.num': '5' });
  const s = createStore(be);
  assert.deepEqual(s.get('tlm.good', {}), { a: 1 });
  assert.deepEqual(s.get('tlm.bad', { d: 1 }), { d: 1 }, 'korrupt JSON gir standard');
  assert.deepEqual(s.get('tlm.arr', {}), {}, 'liste der objekt ventes gir standard');
  assert.deepEqual(s.get('tlm.num', []), [], 'tall der liste ventes gir standard');
  assert.equal(s.get('tlm.num', 0), 5); assert.equal(s.get('tlm.mangler', 'x'), 'x');
  assert.equal(be.getItem('tlm.bad'), '{ikke json', 'korrupt nøkkel slettes ikke');
  assert.equal(be.getItem('tlm.good'), '{"a":1}', 'gyldig nøkkel urørt');
  assert.deepEqual(s.status().corrupt.sort(), ['tlm.arr', 'tlm.bad', 'tlm.num']);
  assert.equal(s.set('tlm.bad', { ok: 1 }), true); assert.ok(!s.status().corrupt.includes('tlm.bad'), 'riktig skriving rydder korrupt-merket');
  assert.deepEqual(s.keys('tlm.g'), ['tlm.good']);
  // kvote full
  let failed = 0; const s2 = createStore(mem({}, { failSet: true }), { onFail: () => failed++ });
  assert.equal(s2.set('tlm.x', 1), false); assert.equal(failed, 1); assert.equal(s2.status().failures, 1); assert.match(s2.status().lastError, /Quota/);
  assert.equal(s2.probe(), false);
  // privat modus: getItem/hele localStorage kaster
  const s3 = createStore(() => { throw new Error('SecurityError'); });
  assert.equal(s3.get('tlm.x', 7), 7); assert.equal(s3.set('tlm.x', 1), false); assert.deepEqual(s3.keys(), []); assert.equal(s3.status().available, false); assert.equal(s3.remove('a'), false);
  const s4 = createStore(mem({}, { failGet: true })); assert.equal(s4.get('tlm.x', 3), 3);
}

// ---- 2. migrering: fixtures fra gamle formater ----
const V0 = { save: [1, 0.5, 2], auto: null, stats: { saves: 1, falls: 2 }, clock: 95.5, fails: [['0|0|0', 2]] };                      // opprinnelig (v0.48)
const V1 = { ...V0, crumbs: ['c1', 'c2'], puzzles: ['p1'], goals: ['g1'], goalFlags: ['f'], build: { parts: [] } };                       // + smuler, gåter, delmål, bygg
const V2 = { ...V1, gates: [{ id: 'g' }], dmin: 1 };                                                                                       // + porter og vanskelighet (uten v-felt)
const V3 = { ...V2, v: PROGRESS_VERSION };
assert.deepEqual([V0, V1, V2, V3].map(progressForm), [0, 1, 2, 3]);
{
  const n0 = normProgress(V0); assert.equal(n0.v, PROGRESS_VERSION); assert.deepEqual(n0.save, [1, 0.5, 2]); assert.equal(n0.clock, 95.5); assert.deepEqual(n0.crumbs, []); assert.deepEqual(n0.fails, [['0|0|0', 2]]); assert.equal(n0.stats.saves, 1);
  assert.ok(!('dmin' in n0) && !('gates' in n0), 'v0 får ikke påfunnet porter eller vanskelighet');
  const n1 = normProgress(V1); assert.deepEqual(n1.crumbs, ['c1', 'c2']); assert.deepEqual(n1.puzzles, ['p1']); assert.deepEqual(n1.goals, ['g1']); assert.deepEqual(n1.build, { parts: [] });
  const n2 = normProgress(V2); assert.equal(n2.dmin, 1); assert.deepEqual(n2.gates, [{ id: 'g' }]); assert.equal(n2.v, PROGRESS_VERSION);
  assert.deepEqual(normProgress(V3), n2, 'nyeste form er stabil (idempotent)'); assert.deepEqual(normProgress(n2), n2);
  // ødelagte felt: rettes, krasjer ikke
  const bad = normProgress({ save: [1, 2, 3], clock: 'tull', fails: 'x', crumbs: 5, stats: 7, dmin: 9 });
  assert.equal(bad.clock, 0); assert.deepEqual(bad.fails, []); assert.deepEqual(bad.crumbs, []); assert.deepEqual(bad.stats, {}); assert.ok(!('dmin' in bad));
  for (const junk of [null, 5, 'x', [], {}, { save: [1, 2] }, { save: ['a', 'b', 'c'] }]) assert.equal(normProgress(junk), null, 'ikke fremgang: ' + JSON.stringify(junk));
}
{
  assert.deepEqual(normCleared({ bad: 120, kjokken: true, x: 'tull' }), { bad: 120, kjokken: 1 }); assert.deepEqual(normCleared(['bad', 'bad2']), { bad: 1, bad2: 1 }); assert.deepEqual(normCleared(5), {});
  assert.deepEqual(normRuns({ bad: 41.5, barnerom: { t: 60, ants: 2, crumbs: 3, total: 5 }, x: 'tull' }), { bad: { t: 41.5, ants: 0, crumbs: 0, total: 0 }, barnerom: { t: 60, ants: 2, crumbs: 3, total: 5 } });
  assert.deepEqual(normBadges(['bad']), { bad: { beginner: 1 } }); assert.deepEqual(normBadges({ bad: { medium: 1, junk: 1 }, x: {} }), { bad: { medium: 1 } });
}
{
  // hele lagringen fra «før R86»: fremgang i alle former, merker, innstillinger; skal leses riktig etter oppdatering uten å miste noe
  const be = mem({
    'tlm.progress.bad': JSON.stringify(V0), 'tlm.progress.barnerom': JSON.stringify(V1), [progressKey('kjokken', 0, 'medium')]: JSON.stringify(V2), 'tlm.progress.bad.expert': JSON.stringify(V3),
    'tlm.progress.rotete': '{"foo":1}', 'tlm.cleared': JSON.stringify(['bad']), 'tlm.runs': JSON.stringify({ bad: 50 }), 'tlm.badges': JSON.stringify({ bad: { beginner: 1 } }),
    'tlm.difficulty': '"medium"', 'tlm.level': '"barnerom"', 'tlm.vol': '0.4', 'tlm.tcode': '"tlm-abc1"', 'andre.app': 'ikke vår',
  });
  const s = createStore(be), r = migrateAll(s, s);
  assert.deepEqual(r.migrated.sort(), ['tlm.cleared', 'tlm.progress.bad', 'tlm.progress.bad.expert', 'tlm.progress.barnerom', 'tlm.progress.kjokken.medium', 'tlm.runs'].sort());
  assert.deepEqual(r.skipped, ['tlm.progress.rotete'], 'noe som ikke ligner fremgang lates stå');
  assert.equal(be.getItem('tlm.progress.rotete'), '{"foo":1}');
  assert.equal(s.get('tlm.progress.bad', null).clock, 95.5); assert.deepEqual(s.get('tlm.progress.barnerom', null).crumbs, ['c1', 'c2']); assert.equal(s.get('tlm.progress.bad.expert', null).dmin, 1);
  assert.deepEqual(s.get('tlm.cleared', {}), { bad: 1 }); assert.equal(s.get('tlm.runs', {}).bad.t, 50);
  for (const k of ['tlm.vol', 'tlm.difficulty', 'tlm.level', 'tlm.tcode', 'andre.app']) assert.ok(be.getItem(k) !== null, k + ' urørt');
  assert.equal(s.get('tlm.storev', 0), STORE_VERSION);
  assert.deepEqual(migrateAll(s, s).migrated, [], 'andre kjøring endrer ingenting');
  assert.deepEqual(savedSummary(s, s), { boards: 4, cleared: 1, badges: 1 });
}

// ---- 3. eksport og import ----
{
  const be = mem({ 'tlm.progress.bad': JSON.stringify(normProgress(V2)), 'tlm.cleared': '{"bad":120}', 'tlm.badges': '{"bad":{"medium":1}}', 'tlm.tcode': '"tlm-abc1"', 'tlm.vol': '0.3', 'tlm.evlog': '[]', 'tlm.storySeen.bad': 'true' });
  const s = createStore(be), code = exportProgress(s, s, { version: '9.9', now: 1 });
  assert.ok(code.startsWith('TLMSAVE1.')); assert.ok(!/\s/.test(code)); assert.ok(!code.includes('tlm.vol'));
  const p = parseProgress(`her er koden min:\n${code}\ntakk!`);
  assert.equal(p.error, undefined); assert.equal(p.boards, 1); assert.equal(p.cleared, 1); assert.equal(p.version, '9.9');
  assert.deepEqual(Object.keys(p.data).sort(), ['tlm.badges', 'tlm.cleared', 'tlm.progress.bad', 'tlm.storySeen.bad', 'tlm.tcode'], 'bare fremgang og tester-kode, ikke innstillinger eller logg');
  const be2 = mem({ 'tlm.vol': '0.9' }), s2 = createStore(be2);
  assert.equal(applyImport(s2, p), 5); assert.equal(s2.get('tlm.progress.bad', null).clock, V2.clock); assert.equal(s2.get('tlm.vol', 0), 0.9, 'innstillinger urørt'); assert.equal(s2.get('tlm.tcode', ''), 'tlm-abc1');
  // norsk tegn i tester-kode/tekst overlever (utf-8)
  const be3 = mem({ 'tlm.tcode': '"tlm-æøå"' }), s3 = createStore(be3); assert.equal(parseProgress(exportProgress(s3, s3)).data['tlm.tcode'], 'tlm-æøå');
  // feil
  for (const [t, e] of [['', 'empty'], ['bare tekst', 'nocode'], ['TLMSAVE1.@@@', 'nocode'], ['TLMSAVE1.abcd', 'broken'], [code.slice(0, 30), 'broken'], ['x'.repeat(2_000_001), 'big']]) assert.equal(parseProgress(t).error, e, 'feil for ' + t.slice(0, 20));
  const forged = 'TLMSAVE1.' + Buffer.from(JSON.stringify({ f: 1, d: { 'tlm.vol': 1, 'tlm.progress.x': { junk: 1 }, 'evil.key': 1 } })).toString('base64url');
  assert.equal(parseProgress(forged).error, 'none', 'fremmede og ugyldige nøkler hoppes over');
  const mixed = parseProgress('TLMSAVE1.' + Buffer.from(JSON.stringify({ f: 1, d: { 'tlm.cleared': ['bad'], 'tlm.vol': 1 } })).toString('base64url'));
  assert.deepEqual(mixed.data, { 'tlm.cleared': { bad: 1 } }); assert.deepEqual(mixed.skipped, ['tlm.vol']);
  assert.equal(applyImport(createStore(mem({}, { failSet: true })), mixed), 0, 'lagring feiler: ingen kræsj, 0 skrevet');
}

// ---- 4. hva som slettes ----
{
  const be = mem({ 'tlm.progress.bad': JSON.stringify(V3), 'tlm.progress.bad.expert': JSON.stringify(V3), 'tlm.storySeen.bad': 'true', 'tlm.cardseen.bad': 'true', 'tlm.runs': '{"bad":{"t":5}}', 'tlm.cleared': '{"bad":9}', 'tlm.badges': '{"bad":{"medium":1}}', 'tlm.vol': '0.3', 'tlm.tcode': '"tlm-abc1"', 'tlm.changechecks': '{}', 'tlm.storev': '3', 'andre.app': '1' });
  const s = createStore(be);
  const pn = wipePlan('new', s.keys('tlm.'), s); assert.equal(pn.boards, 2); assert.equal(pn.runs, 1); assert.ok(!pn.del.includes('tlm.cleared') && !pn.del.includes('tlm.badges') && !pn.del.includes('tlm.vol') && !pn.del.includes('tlm.tcode'), 'Nytt spill beholder klarte brett, merker, innstillinger, tester-kode');
  const pa = wipePlan('all', s.keys('tlm.'), s); assert.ok(pa.del.includes('tlm.cleared') && pa.del.includes('tlm.vol') && pa.del.includes('tlm.badges')); assert.ok(!pa.del.includes('tlm.tcode') && !pa.del.includes('tlm.changechecks') && !pa.del.includes('tlm.storev'), 'Nullstill alt beholder tester-kode');
  assert.equal(pa.badges, 1); assert.ok(pa.settings >= 1 && pa.keepTester);
  assert.equal(wipe('all', s), pa.del.length); assert.equal(be.getItem('andre.app'), '1', 'andres nøkler røres aldri'); assert.equal(be.getItem('tlm.tcode'), '"tlm-abc1"'); assert.equal(be.getItem('tlm.progress.bad'), null);
  assert.equal(wipePlan('new', [], s).empty, true); assert.equal(wipePlan('all', [], s).empty, true);
  assert.ok(isProgressKey('tlm.progress.bad.r2.expert') && !isProgressKey('tlm.vol') && isSettingKey('tlm.vol') && !isSettingKey('tlm.progress.bad') && !isSettingKey('tlm.tcode'));
}

// ---- 5. «Fortsett»-linja og tekster ----
assert.equal(fmtClock(95.4), '1:35'); assert.equal(fmtClock(5), '0:05'); assert.equal(fmtClock(-3), '0:00'); assert.equal(fmtClock(NaN), '0:00');
assert.equal(resumeLine({ label: 'Nivå 1 · Bad', diff: 'Medium', clock: 95 }), 'Nivå 1 · Bad · Medium · 1:35'); assert.equal(resumeLine({ label: 'Bad', diff: 'Medium', clock: 2 }), 'Bad · Medium');
assert.deepEqual(TEXT_KEYS.nb, TEXT_KEYS.en, 'nb og en har like nøkler');
for (const lang of ['nb', 'en']) for (const k of TEXT_KEYS[lang]) { const t = sv(lang, k, { n: 1, boards: 1, cleared: 1, badges: 1 }); assert.ok(t && !t.includes('{'), `${lang} ${k}`); assert.ok(!/\b(trykk på [A-Z]|taster|tastatur)\b/i.test(t), 'ingen taster: ' + k); }
assert.ok(sv('nb', 'sv.copy') === 'KOPIER FREMGANG' && sv('nb', 'sv.paste') === 'LIM INN FREMGANG');

// ---- 6. koblinger ----
const main = fs.readFileSync('main.js', 'utf8'), html = fs.readFileSync('index.html', 'utf8');
for (const m of ['storage_logic', 'storage_view']) assert.ok(html.includes(`'${m}'`), `${m} i files`);
assert.ok(!/localStorage\.(getItem|setItem|removeItem)/.test(main), 'main.js bruker ikke localStorage direkte (alt går via disk/store)');
for (const id of ['bSaveCopy', 'bSavePaste', 'bWipeAll', 'svView.confirmWipe', 'normProgress(store.get(progKey', 'PROGRESS_VERSION', 'migrateAll', "logEv('lagring'"]) assert.ok(main.includes(id), `main.js har ${id}`);
assert.ok(fs.existsSync('docs/LAGRING.md'));
const doc = fs.readFileSync('docs/LAGRING.md', 'utf8'); for (const k of ['tlm.progress.', 'tlm.cleared', 'tlm.badges', 'tlm.tcode', 'tlm.runs', 'tlm.storev', 'korrupt', 'privat modus']) assert.ok(doc.includes(k), `LAGRING.md nevner ${k}`);
assert.ok(PROFILE.medium);
console.log('lagrings-tester grønne');
