// R47: kostnad, stjerner og smulebudsjett: ren logikk (build_budget.js), lagring (rewards.js) og hekter i build.js mot en DOM-stubb.
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const mkEl = () => { const el = { style: {}, dataset: {}, children: [], _l: {}, _html: '', classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, f) { f ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
  appendChild(c) { this.children.push(c); return c; }, addEventListener(t, f) { (this._l[t] ||= []).push(f); }, removeEventListener() {}, setPointerCapture() {}, releasePointerCapture() {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844 }), closest: () => null, remove() {},
  getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) }),
  querySelector: () => mkEl(), querySelectorAll: () => [], set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; }, width: 0, height: 0 }; return el; };
const body = mkEl(); const keys = [];
globalThis.document = { body, createElement: mkEl, head: mkEl(), getElementById: () => null, querySelector: () => mkEl() };
globalThis.window = globalThis; globalThis.innerWidth = 390; globalThis.innerHeight = 844; globalThis.devicePixelRatio = 2;
globalThis.addEventListener = (t, f) => { if (t === 'keydown') keys.push(f); }; globalThis.removeEventListener = () => {};
const { createBuildMode } = await import('./build.js');
import fs from 'node:fs';
import * as BB from './build_budget.js';
import * as BL from './build_logic.js';
import * as RW from './rewards.js';
const lv = (n) => JSON.parse(fs.readFileSync(`./levels/${n}.level.json`, 'utf8'));
const mkStore = () => { const m = new Map(); return { get: (k, d) => (m.has(k) ? JSON.parse(m.get(k)) : d), set: (k, v) => m.set(k, JSON.stringify(v)) }; };

// 1. kostnadstabellen dekker alle deler og koblinger
for (const t of Object.keys(BL.PART_TYPES)) assert.ok(Number.isFinite(BB.PART_COST[t]) && BB.PART_COST[t] >= 1, `del ${t} har pris`);
for (const k of BL.LINK_KINDS) assert.ok(Number.isFinite(BB.LINK_COST[k]) && BB.LINK_COST[k] >= 0, `kobling ${k} har pris`);
assert.ok(BB.PART_COST.plank_s < BB.PART_COST.lego && BB.PART_COST.lego < BB.PART_COST.weight && BB.PART_COST.ruler < BB.PART_COST.book, 'tre/linjal billig, legoklosse middels, vekt/bok dyrt');
assert.deepEqual(BB.buildCost([{ type: 'plank_l' }, { type: 'weight' }], [{ kind: 'hinge' }, { kind: 'tape' }]), { parts: 2, cost: 2 + 4 + 1 + 0 });
assert.deepEqual(BB.buildCost([], []), { parts: 0, cost: 0 });

// 2. kjente bygg gir forventede stjerner (terskler fra brettene)
const bro = lv('bro').build.sites[0];
const P = (...t) => t.map((type) => ({ type }));
assert.equal(BB.starsFor(bro, P('plank_l'), []).stars, 3, 'referansebroen gir tre stjerner');
assert.equal(BB.starsFor(bro, P('plank_s', 'plank_s'), [{ kind: 'tape' }]).stars, 3, 'to korte planker med tape: 2 deler, kostnad 2');
assert.equal(BB.starsFor(bro, P('plank_l', 'plank_s', 'block'), []).stars, 2, 'tre deler, kostnad 4: to stjerner');
assert.equal(BB.starsFor(bro, P('plank_l', 'weight'), []).stars, 2, 'kostnad 6, to deler: to stjerner');
assert.equal(BB.starsFor(bro, P('plank_l', 'weight', 'book'), []).stars, 1, 'tung bygging gir én stjerne');
assert.equal(BB.starsFor(bro, P('plank_s', 'plank_s', 'plank_s', 'plank_s', 'plank_s'), []).stars, 1, 'mange deler gir én stjerne');
{ const r = BB.starsFor(bro, P('plank_l', 'weight'), []); assert.deepEqual(r.next, { stars: 3, cost: 3, parts: 2 }, 'viser hva som skal til for neste stjerne'); assert.equal(BB.starsFor(bro, P('plank_l'), []).next, null); }
assert.equal(BB.starsFor(bro, P('plank_l'), []).stars, BB.starsFor(bro, P('plank_l'), []).stars, 'deterministisk');
assert.equal(BB.starText(2), '★★☆'); assert.equal(BB.starText(9), '★★★'); assert.equal(BB.starText(-1), '☆☆☆');

// 3. terskler: manglende/ugyldig data faller tilbake, to stjerner er aldri strengere enn tre
assert.deepEqual(BB.starThresholds({}), BB.DEFAULT_STARS);
assert.deepEqual(BB.starThresholds({ stars: { three: { cost: -1, parts: 'x' }, two: null } }), BB.DEFAULT_STARS);
{ const t = BB.starThresholds({ stars: { three: { cost: 9, parts: 9 }, two: { cost: 3, parts: 3 } } }); assert.ok(t.two.cost >= t.three.cost && t.two.parts >= t.three.parts); }
for (const n of ['bro', 'kjokkenbro', 'leke', 'vippe', 'trapp', 'kontroll']) {
  for (const s of lv(n).build.sites) {
    const t = BB.starThresholds(s); assert.ok(t.three.cost <= t.two.cost && t.three.parts <= t.two.parts, `${n}: terskler stigende`);
    if (s.ref) { assert.ok(s.stars, `${n}/${s.id}: stjerne-terskler er satt i scenen`); const r = BB.starsFor(s, s.ref.placed, s.ref.links || []); assert.equal(r.stars, 3, `${n}/${s.id}: referansebygget gir tre stjerner (kostnad ${r.cost})`); }
  }
}

// 4. smulebudsjett: ekstradeler ved smuleantall
assert.equal(BB.unlockedBonus(0).length, 0); assert.deepEqual(BB.unlockedBonus(3).map((b) => b.id), ['bx1']); assert.equal(BB.unlockedBonus(10).length, BB.BONUS.length);
assert.equal(BB.unlockedBonus(3, 2).length, 0, 'dobbelt terskel: 3 smuler er ikke nok'); assert.equal(BB.unlockedBonus(6, 2).length, 1);
assert.equal(BB.nextBonus(4).id, 'bx2'); assert.equal(BB.nextBonus(9), null);
for (const b of BB.BONUS) { assert.ok(BL.PART_TYPES[b.type], `ekstradel ${b.id} har gyldig type`); assert.ok(!(['d1', 'p1', 'v1']).includes(b.id)); }
for (const n of ['bro', 'kjokkenbro', 'leke', 'vippe', 'trapp', 'kontroll']) for (const p of lv(n).build.parts) assert.ok(!BB.isBonusId(p.id), `${n}: ${p.id} kolliderer ikke med ekstradeler`);

// 5. lagring (rewards.js): bare bedre bygg erstatter, ugyldig lagring ignoreres, ekstradeler huskes
{
  const st = mkStore();
  assert.deepEqual(RW.getBuildStars(st, 'bro'), {});
  let r = RW.recordBuildStars(st, 'bro', 'bro1', { stars: 2, cost: 5, parts: 3 }); assert.ok(r.first && r.improved);
  r = RW.recordBuildStars(st, 'bro', 'bro1', { stars: 1, cost: 2, parts: 1 }); assert.ok(!r.improved, 'færre stjerner erstatter ikke'); assert.equal(RW.getBuildStars(st, 'bro').bro1.stars, 2);
  r = RW.recordBuildStars(st, 'bro', 'bro1', { stars: 2, cost: 4, parts: 3 }); assert.ok(r.improved && !r.first, 'lavere kostnad med samme stjerner er bedre'); assert.equal(RW.getBuildStars(st, 'bro').bro1.cost, 4);
  r = RW.recordBuildStars(st, 'bro', 'bro1', { stars: 3, cost: 9, parts: 9 }); assert.equal(RW.getBuildStars(st, 'bro').bro1.stars, 3);
  assert.ok(!RW.recordBuildStars(st, 'bro', 'x', { stars: 7, cost: 1, parts: 1 }).improved, 'ugyldig stjerneantall avvises'); assert.ok(!RW.recordBuildStars(st, '', 'x', { stars: 1, cost: 1, parts: 1 }).improved);
  assert.deepEqual(RW.getBuildStars(st, 'vippe'), {}, 'per nivå');
  const bad = mkStore(); bad.set('tlm.bstars', { bro: { a: { stars: 'tre' }, b: { stars: 2, cost: 3, parts: 2 } } }); assert.deepEqual(Object.keys(RW.getBuildStars(bad, 'bro')), ['b']);
  const junk = mkStore(); junk.set('tlm.bstars', 'tull'); junk.set('tlm.bbonus', 5); assert.deepEqual(RW.getBuildStars(junk, 'bro'), {}); assert.deepEqual(RW.getBonusUnlocks(junk, 'bro'), []);
  assert.deepEqual(RW.recordBuildStars(junk, 'bro', 'a', { stars: 1, cost: 1, parts: 1 }).improved, true, 'skriver over ødelagt lagring');
  const bs = mkStore(), known = BB.BONUS_IDS;
  assert.deepEqual(RW.recordBonus(bs, 'bro', ['bx1', 'zz'], known), ['bx1'], 'ukjent id avvises'); assert.deepEqual(RW.recordBonus(bs, 'bro', ['bx1', 'bx2'], known), ['bx2'], 'bare nye'); assert.deepEqual(RW.getBonusUnlocks(bs, 'bro', known), ['bx1', 'bx2']); assert.deepEqual(RW.getBonusUnlocks(bs, 'vippe', known), []);
}

// 6. hekter i build.js: ekstradeler ved smuler (lagres og gjenopprettes), stjerner ved vellykket prøve, av/på
const toasts = [], log = [];
function mk(levelName, { crumbs = () => 0, store = mkStore(), budget = () => true, bonus = () => true } = {}) {
  const L = lv(levelName); L.boxes = L.boxes || []; const s0 = L.build.sites[0]; const player = { x: s0.x, y: s0.y, z: s0.z, onGround: true, state: 'ground' };
  const bm = createBuildMode({ scene: { add() {}, remove() {} }, LEVEL: L, player, $: () => mkEl(), T: (k, v) => k + (v ? JSON.stringify(v) : ''), logEv: (t, d) => log.push([t, d]), toast: (m) => toasts.push(m), TOUCH: true, buzz() {}, audio: {}, isPlay: () => true, isMenu: () => false, isBoss: () => false, isWon: () => false, isOv: () => false, getSnap: () => true, setSnap() {}, allParts: () => true, onChange() {}, store, levelId: levelName, getCrumbs: crumbs, getBudget: budget, getBonus: bonus });
  return { bm, L, store, s0 };
}
{
  let c = 0; const { bm, store } = mk('bro', { crumbs: () => c });
  const have = () => JSON.parse(JSON.stringify(bm.save())).sites.bro1?.have || [];
  bm.update(0.016, true); assert.deepEqual(bm.bonusOpen(), [], 'ingen smuler, ingen ekstradeler');
  c = 3; bm.update(0.016, true); assert.deepEqual(bm.bonusOpen(), ['bx1']); assert.ok(have().includes('bx1'), 'ekstradelen ligger i brettet'); assert.ok(toasts.some((t) => /build.bonusNew/.test(t)), 'melding vises'); assert.ok(log.some(([t, d]) => t === 'bygg' && /ekstradel bx1/.test(d)), 'logges');
  assert.deepEqual(RW.getBonusUnlocks(store, 'bro', BB.BONUS_IDS), ['bx1'], 'lagres i rewards');
  c = 0; bm.update(0.016, true); assert.deepEqual(bm.bonusOpen(), ['bx1'], 'forblir åpen selv om smulene nullstilles');
  // gjenopprettes: ny økt med samme lagring
  const m2 = mk('bro', { store }); m2.bm.update(0.016, true); m2.bm.load(JSON.parse(JSON.stringify(bm.save())));
  assert.deepEqual(m2.bm.bonusOpen(), ['bx1']); assert.ok((JSON.parse(JSON.stringify(m2.bm.save())).sites.bro1?.have || []).includes('bx1'), 'gjenopprettet etter «Fortsett»');
  // av: ingen ekstradeler for et nytt spill
  const m3 = mk('bro', { crumbs: () => 9, bonus: () => false }); m3.bm.update(0.016, true); assert.deepEqual(m3.bm.bonusOpen(), [], 'av i innstillinger: ingen ekstradeler');
  // ukjente/ikke åpnede ekstradeler i en lagret fil slipper ikke inn via smuler (id-ene er kjent, men telles ikke som åpne)
  const m4 = mk('bro', { crumbs: () => 10 }); m4.bm.update(0.016, true); assert.deepEqual(m4.bm.bonusOpen(), ['bx1', 'bx2', 'bx3']);
}
{
  // vellykket prøve gir stjerner: planka legges i festepunktene og testfiguren går over
  const { bm, store } = mk('bro'); bm.update(0.016, true); assert.ok(bm.open());
  const saved = { got: ['d2'], solved: [], sites: { bro1: { have: ['d2'], placed: [{ id: 'd2', u: 0, v: 0.25, rot: 0 }], links: [] } } };
  bm.close('t'); bm.load(saved); bm.update(0.016, true); assert.ok(bm.open());
  assert.ok(bm.startTry(), 'prøven starter'); for (let i = 0; i < 4000 && bm.running; i++) bm.update(1 / 60, true);
  assert.equal(bm.result?.state, 'won', 'referansebroen klarer prøven'); assert.equal(bm.lastResult.stars, 3); assert.equal(bm.lastResult.cost, 2);
  assert.equal(RW.getBuildStars(store, 'bro').bro1.stars, 3, 'stjernene lagres'); assert.equal(bm.starsMap().bro1, 3);
  assert.ok(log.some(([t, d]) => t === 'bygg' && /^stjerner 3 /.test(d)), 'stjerner logges'); assert.ok(toasts.some((t) => /build.wonStars/.test(t) && /★★★/.test(t)), 'stjerner vises i meldingen');
  bm.close('t');
}
console.log('bygg-budsjett-tester grønne');
