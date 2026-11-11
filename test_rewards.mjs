// node test_rewards.mjs: belønning som varer (R16): lagring av beste resultat, opplåsing av tilbehør, valg som huskes.
import assert from 'node:assert/strict';
import { ACCESSORIES, SLOTS, accForLevel, recordRun, getBest, getUnlocks, getEquipped, toggleEquip, rt, TEXT_KEYS } from './rewards.js';

const mem = () => { const m = new Map(); return { get: (k, d) => (m.has(k) ? JSON.parse(m.get(k)) : d), set: (k, v) => m.set(k, JSON.stringify(v)), raw: m }; };

// ett tilbehør per nivå 1-6, gyldige plasser, tekster i begge språk
assert.equal(ACCESSORIES.length, 6);
for (let n = 1; n <= 6; n++) assert.ok(accForLevel(n), `nivå ${n}`);
for (const a of ACCESSORIES) { assert.ok(SLOTS.includes(a.slot)); for (const l of ['nb', 'en']) assert.notEqual(rt(l, 'acc.' + a.id), 'acc.' + a.id); if (a.slot !== 'hat') assert.ok(a.color > 0); }
assert.deepEqual(TEXT_KEYS.nb.slice().sort(), TEXT_KEYS.en.slice().sort(), 'nb og en har samme nøkler');
assert.ok(!/\b(trykk|tast)\s+(på\s+)?(mellomrom|space|E|F)\b/i.test(rt('nb', 'rw.sub')));

// beste smuler og tid huskes; dårligere resultat overskriver ikke
let st = mem();
let r = recordRun(st, { levelId: 'bad', n: 1, crumbs: 6, total: 10, t: 80 });
assert.equal(r.unlocked, null); assert.deepEqual(getBest(st).bad, { crumbs: 6, total: 10, t: 80 });
r = recordRun(st, { levelId: 'bad', n: 1, crumbs: 4, total: 10, t: 60 });
assert.equal(getBest(st).bad.crumbs, 6); assert.equal(getBest(st).bad.t, 80); assert.ok(!r.newBestTime && !r.newBestCrumbs, 'raskere men færre smuler er ikke rekord');
r = recordRun(st, { levelId: 'bad', n: 1, crumbs: 6, total: 10, t: 60 });
assert.equal(getBest(st).bad.t, 60); assert.ok(r.newBestTime && !r.newBestCrumbs, 'like mange smuler og raskere');
r = recordRun(st, { levelId: 'bad', n: 1, crumbs: 5, total: 10, t: 90 });
assert.equal(getBest(st).bad.t, 60, 'tregere tid overskriver ikke');

// rask tur med få smuler overskriver ikke tiden til 10/10
{ const s3 = mem(); recordRun(s3, { levelId: 'bad', n: 1, crumbs: 10, total: 10, t: 83 }); const r3 = recordRun(s3, { levelId: 'bad', n: 1, crumbs: 2, total: 10, t: 20 });
  assert.deepEqual(getBest(s3).bad, { crumbs: 10, total: 10, t: 83 }); assert.equal(r3.newBestTime, false);
  recordRun(s3, { levelId: 'bad', n: 1, crumbs: 10, total: 10, t: 70 }); assert.equal(getBest(s3).bad.t, 70);
  const s4 = mem(); recordRun(s4, { levelId: 'bad', n: 1, crumbs: 2, total: 10, t: 20 }); recordRun(s4, { levelId: 'bad', n: 1, crumbs: 5, total: 10, t: 90 });
  assert.deepEqual(getBest(s4).bad, { crumbs: 5, total: 10, t: 90 }, 'flere smuler: tiden følger det løpet'); }

// flymodus teller ikke
r = recordRun(st, { levelId: 'bad', n: 1, crumbs: 10, total: 10, t: 5, flew: true });
assert.equal(r.unlocked, null); assert.deepEqual(getUnlocks(st), []);

// alle smuler gir tilbehøret, og det tas på med en gang; gjentatt rekord gir ikke ny opplåsing
r = recordRun(st, { levelId: 'bad', n: 1, crumbs: 10, total: 10, t: 70 });
assert.equal(r.unlocked?.id, 'propeller'); assert.deepEqual(getUnlocks(st), ['propeller']); assert.equal(getEquipped(st).hat, 'propeller');
r = recordRun(st, { levelId: 'bad', n: 1, crumbs: 10, total: 10, t: 50 });
assert.equal(r.unlocked, null); assert.deepEqual(getUnlocks(st), ['propeller']);

// nivå uten smuler gir ingenting; ikke alle smuler gir ingenting
assert.equal(recordRun(st, { levelId: 'x', n: 2, crumbs: 0, total: 0, t: 10 }).unlocked, null);
assert.equal(recordRun(st, { levelId: 'barnerom', n: 2, crumbs: 9, total: 10, t: 10 }).unlocked, null);

// valg: av/på med ett trykk, én hatt om gangen, plasser er uavhengige, låste kan ikke velges
recordRun(st, { levelId: 'barnerom', n: 2, crumbs: 10, total: 10, t: 40 });
recordRun(st, { levelId: 'bad2', n: 4, crumbs: 10, total: 10, t: 40 });
assert.deepEqual(getEquipped(st), { hat: 'crown', scarf: 'redscarf', pack: null });
assert.equal(toggleEquip(st, 'cowboy'), null, 'låst');
assert.equal(toggleEquip(st, 'propeller').hat, 'propeller');
assert.equal(toggleEquip(st, 'propeller').hat, null, 'andre trykk tar av');
assert.equal(toggleEquip(st, 'propeller').scarf, 'redscarf');

// omlasting: nytt store-objekt over samme data gir samme valg
const st2 = { get: (k, d) => (st.raw.has(k) ? JSON.parse(st.raw.get(k)) : d), set: () => { throw new Error('ikke skriv'); } };
assert.deepEqual(getEquipped(st2), { hat: 'propeller', scarf: 'redscarf', pack: null });
assert.deepEqual(getUnlocks(st2).sort(), ['crown', 'propeller', 'redscarf']);

// ødelagt lagring: ukjente id-er og feil plass ignoreres
const bad = mem(); bad.set('tlm.unlocks', ['crown', 'finnesikke', 7]); bad.set('tlm.equip', { hat: 'redscarf', scarf: 'crown', pack: 'bluepack' }); bad.set('tlm.best', 'x');
assert.deepEqual(getUnlocks(bad), ['crown']); assert.deepEqual(getEquipped(bad), { hat: null, scarf: null, pack: null }); assert.deepEqual(getBest(bad), {});
// admin: alt åpent
assert.equal(getEquipped(mem(), true).hat, null); assert.equal(toggleEquip(mem(), 'cowboy', true).hat, 'cowboy');
console.log('rewards: ok');
