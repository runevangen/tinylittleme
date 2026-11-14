// node test_music.mjs: logikken i music.js (skala, mønster, tempo som funksjon av tilstand)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { THEMES, SCALES, themeFor, moodFor, tempoFor, layersFor, scaleFor, degreeToMidi, patternFor, bassFor, rng, midiFreq, createMusic } from './music.js';

assert.equal(Math.round(midiFreq(69)), 440);
for (const id of ['bad', 'barnerom', 'kjokken', 'bad2', 'barnerom2', 'kjokken2', 'leke', 'stue', 'verksted']) {
  const L = JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8'));
  assert.equal(themeFor(L).id, id.replace('2', ''), `${id}: tema`);
}
assert.equal(themeFor({ name: 'x', audio: { theme: 'bad' } }).id, 'bad');
assert.equal(themeFor(null).id, 'barnerom');
assert.equal(moodFor({}), 'calm'); assert.equal(moodFor({ alerted: true }), 'tense'); assert.equal(moodFor({ alerted: true, won: true }), 'win');
for (const t of Object.values(THEMES)) {
  assert.ok(tempoFor(t, 'tense') > tempoFor(t, 'calm'), 'fare gir raskere tempo');
  assert.ok(SCALES[t.scale] && SCALES[t.dark]);
  assert.notDeepEqual(scaleFor(t, 'tense'), scaleFor(t, 'calm'), 'fare gir mørkere skala');
  assert.equal(degreeToMidi(t, 'calm', 0), t.root); assert.equal(degreeToMidi(t, 'calm', 5), t.root + 12); assert.equal(degreeToMidi(t, 'calm', -1), t.root + SCALES[t.scale][4] - 12);
  for (const m of ['calm', 'tense', 'win']) for (let bar = 0; bar < 8; bar++) {
    const p = patternFor(t, bar, m); assert.equal(p.length, 8); assert.notEqual(p[0], null);
    assert.deepEqual(p, patternFor(t, bar, m), 'deterministisk');
  }
  assert.ok(bassFor(t, 0)[0] !== undefined);
}
const dens = (m) => Object.values(THEMES).reduce((n, t) => n + [0, 1, 2, 3].reduce((a, b) => a + patternFor(t, b, m).filter((x) => x != null).length, 0), 0);
assert.ok(dens('tense') > dens('calm'), 'tettere melodi ved fare');
assert.ok(layersFor('tense').pulse && !layersFor('calm').pulse && layersFor('win').sparkle);
const r = rng(5), a = r(); assert.ok(a >= 0 && a < 1); assert.equal(rng(5)(), a);

// motoren mot en falsk AudioContext: planlegger toner, og av/på og stemning virker
{
  let osc = 0, t = 0; const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
  const node = () => ({ connect() {}, gain: param(), frequency: param(), start() {}, stop() {}, type: '' });
  const ctx = { get currentTime() { return t; }, sampleRate: 8000, createGain: node, createOscillator: () => { osc++; return node(); }, createBiquadFilter: node, createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }), createBufferSource: node };
  const m = createMusic(ctx, node(), { theme: THEMES.bad });
  m.start(); t = 2; m.pump(); assert.ok(osc > 3, 'planlegger toner'); m.stop(); assert.equal(m.state.running, false);
  m.setMood('tense'); assert.equal(m.state.mood, 'tense'); m.setOn(false); assert.equal(m.state.on, false);
}

// ducking, og at pumpen stopper når lyden stopper (iPhone: 'interrupted') eller fanen er skjult
{
  let osc = 0, t = 0, calls = [], state = 'running', ls = {}, vis = {};
  const param = () => ({ value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime: (v) => calls.push(v), cancelScheduledValues() {} });
  const node = () => ({ connect() {}, gain: param(), frequency: param(), start() {}, stop() {}, type: '' });
  const ctx = { get currentTime() { return t; }, get state() { return state; }, resume() { state = 'running'; ls.statechange?.(); return Promise.resolve(); }, addEventListener: (n, f) => { ls[n] = f; }, removeEventListener() {}, sampleRate: 8000, createGain: node, createOscillator: () => { osc++; return node(); }, createBiquadFilter: node, createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }), createBufferSource: node };
  globalThis.document = { hidden: false, addEventListener: (n, f) => { vis[n] = f; }, removeEventListener() {} };
  const m = createMusic(ctx, node(), { theme: THEMES.kjokken });
  m.start(); t = 1; m.pump(); const n1 = osc; assert.ok(n1 > 0);
  state = 'interrupted'; t = 3; m.pump(); assert.equal(osc, n1, 'ingen planlegging mens lyden er stoppet');
  m.onVis(); assert.equal(ctx.state, 'running', 'resume ved synlig fane'); t = 5; m.pump(); assert.ok(osc > n1, 'spiller igjen etter resume');
  document.hidden = true; vis.visibilitychange?.(); assert.equal(m.state.ticking, false, 'pumpen stoppet i skjult fane');
  document.hidden = false; vis.visibilitychange?.(); assert.equal(m.state.ticking, true);
  calls.length = 0; m.duck(0.4, 0.9); assert.equal(calls[0], 0.4); assert.equal(calls[1], 1); m.stop(); delete globalThis.document;
}
console.log('test_music: ok');
