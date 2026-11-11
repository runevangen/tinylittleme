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
const L = { build: { sites: [{ id: 's', x: 0, y: 2, z: 0, w: 11, h: 8, anchors: [{ u: -1.5, v: 0 }, { u: 1.5, v: 0 }] }], parts: [{ id: 'a', type: 'plank_s', x: 10, y: 1, z: 0 }, { id: 'b', type: 'plank_l', x: 30, y: 1, z: 0 }] } };
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
console.log('bygg-DOM-tester grønne');
