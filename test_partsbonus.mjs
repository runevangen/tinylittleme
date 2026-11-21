// R120: delene er der fra start, samling er bonus. Ren logikk (partsbonus_logic.js), alle byggebrett (stedet kan bygges uten å ha funnet noe),
// byggemodus mot en DOM-stubb (open() fyller delebrettet, bonusbudsjett, delmål), ⚙-valg, tekster, filer og dokumenter.
// Ekte berøring og bilder (iPhone 14): node tools/live_partsbonus.cjs <utmappe> (Playwright).
import { register } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const P = await import('./partsbonus_logic.js');

// ---- ren logikk ----
const mk = (gots) => ['a', 'b', 'c', 'd'].map((id, i) => ({ id, got: gots.includes(id) }));
assert.deepEqual(P.trayIds(mk([]), true), ['a', 'b', 'c', 'd'], 'på: alle deler uten å ha funnet noe');
assert.deepEqual(P.trayIds(mk(['c']), true), ['c', 'a', 'b', 'd'], 'på: funnede først, ingen dubletter');
assert.deepEqual(P.trayIds(mk(['c']), false), ['c'], 'av: bare funnede (som før)');
assert.deepEqual(P.trayIds(mk([]), false), []); assert.deepEqual(P.trayIds(null, true), []);
assert.equal(P.foundCount(mk(['a', 'b'])), 2);
assert.equal(P.bonusBudget(0, true), 0); assert.equal(P.bonusBudget(2, true), 2); assert.equal(P.bonusBudget(9, true), P.PB.maxBonus, 'bonus har tak'); assert.equal(P.bonusBudget(2, false), 0, 'av: ingen bonus');
assert.equal(P.withBonus(null, 3, true), null); assert.equal(P.withBonus({ budget: 10, x: 1 }, 2, true).budget, 12); assert.equal(P.withBonus({ budget: 10 }, 2, false).budget, 10);
assert.ok(!P.goalReached(2, 10) && P.goalReached(3, 10) && !P.goalReached(2, 2) && !P.goalReached(3, 2), 'delmålet: tre funnet i brett med nok deler');
assert.deepEqual(P.dropIds(mk(['a']), ['b']), ['c', 'd'], 'av: ufunnede, uplasserte deler tas ut');
const Lg = { build: { sites: [{ id: 's' }], parts: mk([]) }, goalList: [{ id: 'bygg', type: 'flag', flag: 's', done: false }] };
assert.ok(P.addPartsGoal(Lg) && !P.addPartsGoal(Lg) && Lg.goalList.length === 2, 'delmål legges til én gang');
const g = Lg.goalList[1]; assert.equal(g.type, 'flag'); assert.ok(!g.gate && !g.req, 'valgfritt delmål, låser aldri'); assert.ok(/Finn tre rare deler/.test(g.label));
assert.ok(!P.addPartsGoal({ build: { sites: [{ id: 's' }], parts: mk([]).slice(0, 2) }, goalList: [] }), 'for få deler: ingen delmål');
assert.ok(!P.addPartsGoal({ build: { sites: [], parts: mk([]) }, goalList: [] }), 'uten byggested: ingen delmål');

// ---- byggemodus mot DOM-stubb ----
const mkEl = () => ({ style: {}, dataset: {}, children: [], _l: {}, _html: '', classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, f) { f ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
  appendChild(c) { this.children.push(c); return c; }, addEventListener(t, f) { (this._l[t] ||= []).push(f); }, removeEventListener() {}, setPointerCapture() {}, releasePointerCapture() {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844 }), closest: () => null, remove() {},
  getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) }),
  querySelector: () => mkEl(), querySelectorAll: () => [], set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; }, width: 0, height: 0 });
globalThis.document = { body: mkEl(), createElement: mkEl, head: mkEl(), getElementById: () => null, querySelector: () => mkEl() };
globalThis.window = globalThis; globalThis.innerWidth = 390; globalThis.innerHeight = 844; globalThis.devicePixelRatio = 2;
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {};
const { createBuildMode } = await import('./build.js');
const { initGoals, setGoalFlag, goalById } = await import('./goals.js');
const boards = ['bro', 'trapp', 'vippe', 'kjokkenbro', ...(fs.existsSync('levels/badebro.level.json') ? ['badebro'] : [])];
for (const id of boards) {
  const mkLevel = () => { const L = JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8')); initGoals(L); P.addPartsGoal(L); return L; };
  const run = (on, gotIds = []) => {
    const L = mkLevel(), log = []; const s0 = L.build.sites[0];
    const player = { x: s0.x, y: s0.y, z: s0.z, onGround: true, state: 'ground' };
    const bm = createBuildMode({ scene: { add() {}, remove() {} }, LEVEL: L, player, $: () => mkEl(), T: (k) => k, logEv: (t, d) => log.push([t, d]), toast() {}, TOUCH: true, buzz() {}, audio: {}, isPlay: () => true, isMenu: () => false, isBoss: () => false, isWon: () => false, isOv: () => false, getSnap: () => true, setSnap() {}, allParts: () => false, onChange() {}, getPartsStart: () => on, onSolved: (f) => setGoalFlag(L, f) });
    if (gotIds.length) bm.load({ got: gotIds, solved: [], sites: {} });
    bm.update(0.016, true); assert.ok(bm.open(s0.id, { force: true }), `${id}: åpner`);
    const st = bm.state(); return { L, log, bm, have: st.builds.find((b) => b.id === s0.id).have, total: L.build.parts.length };
  };
  const a = run(true); assert.equal(a.have, a.total, `${id}: alle ${a.total} deler i delebrettet uten at noe er funnet`);
  assert.ok(a.log.some(([t, d]) => t === 'bygg' && /deler fra start på: 0\//.test(d)), `${id}: logges`);
  assert.ok(a.L.build.parts.length === a.total && a.L.buildParts.every((q) => !q.got), `${id}: delene ligger fortsatt i rommet`);
  a.bm.close('t');
  const b = run(false); assert.equal(b.have, 0, `${id}: av = som før (ingen deler uten å finne dem)`);
  const c = run(false, [mkLevel().build.parts[0].id]); assert.equal(c.have, 1, `${id}: av: funnet del er med`);
  const d = run(true, [mkLevel().build.parts[0].id]); assert.equal(d.have, d.total, `${id}: funnet del beholdes som bonus, ingen dubletter`);
}
{ // delmål og lagring: tre funnede deler gir flagget; gammel lagring med funnede deler teller
  const L = JSON.parse(fs.readFileSync('levels/bro.level.json', 'utf8')); initGoals(L); P.addPartsGoal(L); const s0 = L.build.sites[0], log = [];
  const bm = createBuildMode({ scene: { add() {}, remove() {} }, LEVEL: L, player: { x: s0.x, y: s0.y, z: s0.z, onGround: true, state: 'ground' }, $: () => mkEl(), T: (k) => k, logEv: (t, d) => log.push([t, d]), toast() {}, TOUCH: true, buzz() {}, audio: {}, isPlay: () => true, isMenu: () => false, isBoss: () => false, isWon: () => false, isOv: () => false, getSnap: () => true, setSnap() {}, allParts: () => false, onChange() {}, getPartsStart: () => true, onSolved: (f) => setGoalFlag(L, f) });
  bm.load({ got: ['d1', 'd2'], solved: [], sites: {} }); assert.ok(!L.goalFlags.has('deler'), 'to deler: ikke ennå');
  bm.load({ got: ['d1', 'd2', 'd3'], solved: [], sites: {} }); assert.ok(L.goalFlags.has('deler') && log.some(([, d]) => /bonus: 3 rare deler/.test(d)), 'tre deler: delmål (gammel lagring)');
  assert.deepEqual(bm.save().got, ['d1', 'd2', 'd3'], 'got lagres som før (bakoverkompatibelt)');
  assert.ok(goalById(L, 'deler') && !goalById(L, 'deler').gate, 'valgfritt');
}

// ---- ⚙-valg, tekster, filer, dokumenter ----
const main = fs.readFileSync('main.js', 'utf8'), html = fs.readFileSync('index.html', 'utf8'), i18n = fs.readFileSync('i18n.js', 'utf8');
assert.match(main, /fl\('partsfromstart', 'spill'/); assert.ok(main.includes('getPartsStart: () => partsStart') && main.includes("store.get('tlm.partsfromstart', true)"));
assert.ok(html.includes("'partsbonus_logic'"), 'partsbonus_logic i files');
assert.equal((i18n.match(/'build\.got2'/g) || []).length, 2, 'build.got2 på nb og en');
assert.ok(!/\b(tast|taster)\b/i.test(i18n.match(/'build\.got2': '[^']*'/g).join(' ')), 'ingen taster i teksten');
assert.ok(fs.readFileSync('docs/INNSTILLINGER.md', 'utf8').includes('partsfromstart'), 'docs/INNSTILLINGER.md');
assert.ok(fs.readFileSync('docs/NIVAER.md', 'utf8').includes('R120'), 'docs/NIVAER.md');
assert.ok(fs.readFileSync('changes_data.js', 'utf8').includes("r120-"), 'NYTT-rad');
console.log('test_partsbonus ok');
