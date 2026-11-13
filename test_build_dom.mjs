// R24: inn/ut av byggemodus (open/close i build.js) mot en enkel DOM-stubb: body.building, tilbake til spill, tastene B/Escape.
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
globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {};
const { createBuildMode } = await import('./build.js');
const L = { boxes: [], build: { sites: [{ id: 's', x: 0, y: 2, z: 0, w: 11, h: 8, anchors: [{ u: -1.5, v: 0 }, { u: 1.5, v: 0 }] }], parts: [{ id: 'a', type: 'plank_s', x: 10, y: 1, z: 0 }, { id: 'b', type: 'plank_l', x: 30, y: 1, z: 0 }] } };
const player = { x: 0, y: 2, z: 0, onGround: true, state: 'ground' }; const log = []; let play = true;
const bm = createBuildMode({ scene: { add() {}, remove() {} }, LEVEL: L, player, $: () => mkEl(), T: (k) => k, logEv: (t, d) => log.push([t, d]), toast() {}, TOUCH: true, buzz() {}, audio: {}, isPlay: () => play, isMenu: () => false, isBoss: () => false, isWon: () => false, isOv: () => false, getSnap: () => true, setSnap() {}, allParts: () => false, onChange() {} });
assert.ok(bm.enabled, 'bygg er på');
assert.ok(!bm.active && !body.classList.contains('building'));
bm.update(0.016, true); assert.ok(bm.open(), 'åpner ved byggested'); assert.ok(bm.active && body.classList.contains('building'), 'body.building satt');
assert.ok(!bm.open(), 'ikke åpne to ganger');
assert.ok(!bm.startTry() && !bm.running, 'PRØV uten deler starter ingenting (R25)');
bm.close('test'); assert.ok(!bm.active && !body.classList.contains('building'), 'tilbake til spill: body.building fjernet');
assert.ok(log.some(([t, d]) => t === 'bygg' && /^inn/.test(d)) && log.some(([t, d]) => t === 'bygg' && /^ut/.test(d)), 'inn og ut logges');
play = false; bm.update(0.016, false); assert.ok(!bm.open(), 'ikke inn utenfor spill'); play = true;
bm.update(0.016, true); const key = (code) => ({ code, preventDefault() {}, stopImmediatePropagation() {}, repeat: false }); for (const f of keys) f(key('KeyB'));
assert.ok(bm.active, 'B åpner på tastatur'); for (const f of keys) f(key('Escape')); assert.ok(!bm.active && !body.classList.contains('building'), 'Escape lukker');
// R26: bygget står i verden etter «Fortsett», overlever å åpne og lukke uendret, og fjernes ved «Start på nytt»
{
  const saved = { got: ['a', 'b'], solved: ['s'], sites: { s: { have: ['a', 'b'], placed: [{ id: 'b', u: 0, v: 0.25, rot: 0 }], links: [] } } };
  assert.equal(bm.inWorld('s'), false); bm.load(saved);
  assert.ok(bm.inWorld('s') && L.boxes.some((b) => b.built === 's'), 'bygget gjenopprettes i verden ved fortsett'); assert.equal(bm.worldCount('s'), 1);
  assert.ok(bm.isSolved('s')); bm.update(0.016, true); assert.ok(bm.open()); bm.close('test'); assert.ok(bm.inWorld('s'), 'uendret bygg blir stående etter å ha åpnet og lukket');
  assert.deepEqual(JSON.parse(JSON.stringify(bm.save())).solved, ['s']); assert.equal(JSON.parse(JSON.stringify(bm.save())).sites.s.placed.length, 1, 'lagres med autolagringen');
  assert.ok(log.some(([t, d]) => t === 'bygg' && /står i verdenen/.test(d)), 'logges');
  bm.resetAll(); assert.ok(!bm.inWorld('s') && !L.boxes.some((b) => b.built), 'start på nytt fjerner bygget fra verden');
}

// R48: leker som testlast: valg uten tastatur, brettet krever ball og bil, løst først når begge har klart bygget, lagres og gjenopprettes
{
  const L2 = { boxes: [], build: { sites: [{ id: 'q', x: 0, y: 2, z: 0, w: 6, h: 8, loads: ['ball', 'car'], anchors: [{ u: -1.5, v: 0 }, { u: 1.5, v: 0 }], start: { u: -4, v: 0 }, goal: { u: 4, v: 0 } }], parts: [{ id: 'p', type: 'plank_l', x: 10, y: 1, z: 0 }] } };
  const log2 = []; const solvedIds = [];
  const b2 = createBuildMode({ scene: { add() {}, remove() {} }, LEVEL: L2, player, $: () => mkEl(), T: (k) => k, logEv: (t, d) => log2.push([t, d]), toast() {}, TOUCH: true, buzz() {}, audio: {}, isPlay: () => true, isMenu: () => false, isBoss: () => false, isWon: () => false, isOv: () => false, getSnap: () => true, setSnap() {}, allParts: () => true, onSolved: (id) => solvedIds.push(id), getWorld: () => false });
  const root2 = body.children[body.children.length - 2], click = (l) => { for (const f of root2._l.click || []) f({ target: { closest: () => ({ dataset: { l } }) } }); };
  b2.update(0.016, true); assert.ok(b2.open()); b2.close('t');
  b2.load({ got: ['p'], solved: [], sites: { q: { have: ['p'], placed: [{ id: 'p', u: 0, v: 0.25, rot: 0 }], links: [] } } });
  b2.update(0.016, true); assert.ok(b2.open());
  const runTry = () => { assert.ok(b2.startTry()); for (let i = 0; i < 2400 && b2.running; i++) b2.update(1 / 60, true); return b2.result.state; };
  click('ball'); assert.ok(log2.some(([t, d]) => t === 'bygg' && d === 'last valgt: ball'), 'valg av last logges');
  assert.equal(runTry(), 'won', 'ballen klarer broa'); assert.ok(!b2.isSolved('q') && !solvedIds.length, 'ett krav igjen: ikke løst ennå');
  assert.ok(log2.some(([t, d]) => /last ball bestått \(1\/2\)/.test(d)), 'bestått logges');
  const mid = JSON.parse(JSON.stringify(b2.save())); assert.deepEqual(mid.loads, { q: ['ball'] }, 'bestått last lagres');
  b2.stopTry(); click('car'); assert.equal(runTry(), 'won', 'bilen klarer broa'); assert.ok(b2.isSolved('q') && solvedIds[0] === 'q', 'begge bestått: løst');
  b2.stopTry(); b2.close('t');
  const b3 = createBuildMode({ scene: { add() {}, remove() {} }, LEVEL: JSON.parse(JSON.stringify(L2)), player, $: () => mkEl(), T: (k) => k, logEv() {}, toast() {}, TOUCH: true, buzz() {}, audio: {}, isPlay: () => true, isMenu: () => false, isBoss: () => false, isWon: () => false, isOv: () => false, getSnap: () => true, setSnap() {}, allParts: () => true, getWorld: () => false });
  b3.load(mid); assert.deepEqual(JSON.parse(JSON.stringify(b3.save())).loads, { q: ['ball'] }, 'bestått last gjenopprettes ved fortsett');
}
console.log('bygg-DOM-tester grønne');
