// node test_goals.mjs: delmål (R23): rekkefølge, lås, lagring/gjenoppretting, brettdata i alle seks nivåene, tekster.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initGoals, resetGoals, restoreGoals, stepGoals, goalDoneIds, goalFlagList, goalTotal, goalDone, activeGoal, goalsOpen, lockingGoals, allRequiredDone, goalTarget, goalProgress, onSurface, goalLine, setGoalFlag, checkGoals, GOAL } from './goals.js';
import { makeT, DICT_KEYS } from './i18n.js';

const flat = { x0: 0, x1: 4, z0: 0, z1: 4, top: 6 };
const mk = (goals, extra = {}) => { const L = { goals, collectibles: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }], ...extra }; initGoals(L); return L; };
const P = (x, y, z, onGround = true) => ({ x, y, z, onGround });

// reach: stå på flata (ikke ved siden av, ikke i lufta, ikke langt under/over)
assert.ok(onSurface({ ...flat }, P(2, 6, 2)) && onSurface({ ...flat }, P(4.2, 6, 2)) && onSurface({ ...flat }, P(2, 8.5, 2)), 'på flata, kanten og oppå en ting');
assert.ok(!onSurface(flat, P(5, 6, 2)) && !onSurface(flat, P(2, 3, 2)) && !onSurface(flat, P(2, 6, 2, false)) && !onSurface(flat, P(2, 12, 2)));

// rekkefølge: «after» teller ikke før forgjengeren er klar; kjeden kan bli klar i samme steg
{
  const L = mk([{ id: 'a', type: 'reach', ...flat }, { id: 'b', type: 'crumbs', n: 2, after: 'a' }, { id: 'c', type: 'stomp', n: 1, after: 'b' }]);
  assert.equal(activeGoal(L).id, 'a');
  let ev = stepGoals(L, { player: P(9, 0, 9), crumbs: 3, stomps: 5 });                       // alt annet er oppfylt, men a ikke
  assert.deepEqual(ev, []); assert.equal(goalDone(L), 0, 'b og c venter på a');
  ev = stepGoals(L, { player: P(2, 6, 2), crumbs: 3, stomps: 5 });
  assert.deepEqual(ev.map((e) => e.id), ['a', 'b', 'c'], 'hele kjeden i ett steg, i rekkefølge'); assert.ok(ev[2].last && !ev[0].last); assert.equal(ev[1].n, 2);
  assert.equal(activeGoal(L), null); assert.deepEqual(stepGoals(L, { player: P(2, 6, 2), crumbs: 3, stomps: 5 }), [], 'ingen nye hendelser');
}
// aktivt delmål = første ikke-klare og åpne, uavhengig av valgfrie
{
  const L = mk([{ id: 'x', type: 'crumbs', n: 3 }, { id: 'y', type: 'reach', ...flat }]);
  stepGoals(L, { player: P(2, 6, 2), crumbs: 1, stomps: 0 }); assert.equal(activeGoal(L).id, 'x', 'y klart, men x først');
  assert.deepEqual(goalDoneIds(L), ['y'], 'delmål kan løses i vilkårlig rekkefølge når de ikke er ordnet');
  assert.deepEqual(goalProgress(L, L.goalList[0], { crumbs: 1 }), { cur: 1, need: 3 }); assert.equal(goalLine(L, L.goalList[0], 'nb', { crumbs: 1 }), 'x (1/3)');
}
// lås: bare gate-delmål låser målet; valgfrie og req gjør ikke det
{
  const L = mk([{ id: 'g1', type: 'reach', ...flat, gate: true, label: 'G', en: 'G' }, { id: 'o', type: 'stomp', n: 1 }, { id: 'r', type: 'crumbs', n: 1, req: true }]);
  assert.ok(!goalsOpen(L)); assert.deepEqual(lockingGoals(L).map((g) => g.id), ['g1']);
  stepGoals(L, { player: P(2, 6, 2), crumbs: 0, stomps: 0 }); assert.ok(goalsOpen(L), 'valgfrie og req låser ikke'); assert.ok(!allRequiredDone(L)); 
  stepGoals(L, { player: P(2, 6, 2), crumbs: 1, stomps: 0 }); assert.ok(allRequiredDone(L));
  assert.deepEqual(stepGoals(mk([{ id: 'z', type: 'crumbs', n: 1 }]), { crumbs: 9 }, false), [], 'ingen fremdrift når steget ikke er aktivt (meny/mål/fly)');
}
// gåte, sjef og flagg (bygg-delmål fra R24)
{
  const L = mk([{ id: 'p', type: 'puzzle', puzzle: 'bro' }, { id: 's', type: 'boss' }, { id: 'f', type: 'flag', flag: 'build_bridge' }], { puzzleList: [{ id: 'bro', open: false }], bossS: { gone: false } });
  assert.deepEqual(stepGoals(L, { player: P(0, 0, 0) }), []);
  L.puzzleList[0].open = true; assert.deepEqual(stepGoals(L, { player: P(0, 0, 0) }).map((e) => e.id), ['p']);
  L.bossS.gone = true; assert.deepEqual(stepGoals(L, { player: P(0, 0, 0) }).map((e) => e.id), ['s']);
  assert.ok(setGoalFlag(L, 'build_bridge') && !setGoalFlag(L, 'build_bridge'), 'flagg settes én gang');
  assert.deepEqual(stepGoals(L, { player: P(0, 0, 0) }).map((e) => e.id), ['f']);
}
// lagring og gjenoppretting: ukjente id-er ignoreres, tilbakestilling tømmer, flagg overlever
{
  const L = mk([{ id: 'a', type: 'crumbs', n: 1 }, { id: 'b', type: 'flag', flag: 'q' }]);
  stepGoals(L, { player: P(0, 0, 0), crumbs: 1 }); setGoalFlag(L, 'q');
  const saved = JSON.parse(JSON.stringify({ g: goalDoneIds(L), f: goalFlagList(L) })); assert.deepEqual(saved, { g: ['a'], f: ['q'] });
  const M = mk([{ id: 'a', type: 'crumbs', n: 1 }, { id: 'b', type: 'flag', flag: 'q' }]);
  assert.equal(restoreGoals(M, [...saved.g, 'finnesikke'], saved.f), 1); assert.deepEqual(goalDoneIds(M), ['a']);
  assert.deepEqual(stepGoals(M, { player: P(0, 0, 0), crumbs: 0 }).map((e) => e.id), ['b'], 'flagget er husket, så b teller etter gjenoppretting');
  assert.equal(restoreGoals(M, undefined), 0); resetGoals(M); assert.equal(goalDone(M), 0); assert.deepEqual(goalFlagList(M), []);
}
// pil: nærmeste uplukkede smule, nærmeste levende maur, flata (klemt til nærmeste punkt)
{
  const L = mk([], { crumbList: [{ x: 10, y: 3, z: 0, got: false }, { x: 2, y: 3, z: 0, got: false }, { x: 1, y: 3, z: 0, got: true }], antList: [{ x: 5, y: 0, z: 5, alive: false }, { x: 9, y: 0, z: 9, alive: true }], bossS: { gone: true } });
  assert.equal(goalTarget(L, { type: 'crumbs' }, P(0, 0, 0)).x, 2); assert.equal(goalTarget(L, { type: 'stomp' }, P(0, 0, 0)).x, 9);
  assert.deepEqual(goalTarget(L, { type: 'reach', ...flat }, P(10, 0, 2)), { x: 4, y: 6, z: 2 }); assert.equal(goalTarget(L, { type: 'boss' }, P(0, 0, 0)), null); assert.equal(goalTarget(L, { type: 'puzzle' }, P(0, 0, 0)), null);
  L.crumbList.forEach((c) => (c.got = true)); assert.equal(goalTarget(L, { type: 'crumbs' }, P(0, 0, 0)), null, 'ingen smuler igjen: pila faller tilbake til ruta');
}
// brettene: alle seks nivåene har 2-4 gyldige delmål, lås-delmålene ligger på ruta, og målet kan ikke låses av noe utenfor ruta
for (const id of ['bad', 'barnerom', 'kjokken', 'bad2', 'barnerom2', 'kjokken2', 'leke']) {
  const L = JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8'));
  assert.deepEqual(checkGoals(L, { levelId: id }), [], id);
  assert.ok(L.goals.length >= GOAL.minPerLevel && L.goals.length <= GOAL.maxPerLevel, id);
  assert.ok(L.goals.some((g) => g.gate), `${id}: minst ett delmål åpner målet`);
  // en spiller som går ruta (står på hvert rute-steg) klarer alle lås-delmål
  const R = L.route.filter((w) => !w.grip && !w.via); initGoals(L);
  for (const w of R) stepGoals(L, { player: P((w.x0 + w.x1) / 2, w.top, (w.z0 + w.z1) / 2), crumbs: 0, stomps: 0 });
  assert.ok(goalsOpen(L), `${id}: ruta alene åpner målet (${lockingGoals(L).map((g) => g.id)})`);
  assert.ok(!allRequiredDone(L) || L.goals.every((g) => !g.req || g.done));
}
// feil i brettdata fanges
{
  const bad = { goals: [{ id: 'a', type: 'crumbs', n: 99, label: 'x', en: 'x', gate: true }, { id: 'a', type: 'hopp', label: 'x' }, { id: 'c', type: 'reach', x0: 0, x1: 1, z0: 0, z1: 1, top: 1, on: 'finnes_ikke', gate: true, label: 'x', en: 'x', after: 'zz' }], collectibles: [], route: [] };
  const e = checkGoals(bad, { levelId: 't' }).join('|');
  assert.match(checkGoals({ goals: [{ id: 'a', type: 'puzzle', puzzle: 'x', gate: true, label: 'a', en: 'a' }], route: [], puzzles: [{ id: 'x' }] }).join('|'), /skal være 2-4/); assert.match(checkGoals({ goals: [{ id: 'a', type: 'boss', gate: true, label: 'a', en: 'a' }, { id: 'b', type: 'boss', label: 'a', en: 'a' }] }).join('|'), /bare reach\/crumbs|ingen sjef/);
  for (const m of [/finnes to ganger/, /ukjent type/, /flere smuler/, /ligge på ruta/, /after zz/, /label og en/]) assert.match(e, m);
}
// tekster: begge språk, uten taster, plassholdere går opp
{
  const keys = DICT_KEYS.nb.filter((k) => k.startsWith('goal.')); assert.ok(keys.length >= 8); assert.deepEqual(keys.slice().sort(), DICT_KEYS.en.filter((k) => k.startsWith('goal.')).sort());
  let lang = 'nb'; const { T } = makeT(() => lang);
  for (const l of ['nb', 'en']) { lang = l; for (const k of keys) { const s = T(k, { name: 'N' }); assert.ok(!/\{\w+\}/.test(s) && s !== k, `${l}:${k}`); assert.ok(!/\b(mellomrom|space|tast)\b/i.test(s), `${l}:${k} nevner taster`); } }
  assert.equal(T('goal.done', { name: 'Kurv' }), 'Goal complete: Kurv');
}
console.log('delmål-tester grønne');
