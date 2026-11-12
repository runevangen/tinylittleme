// node test_breath.mjs: R38, pustelyd er av som standard og kan slås på; andre lyder er uendret.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createAudio } from './audio.js';

function mockCtx() {
  const c = { sources: 0, osc: 0, sampleRate: 8000, destination: {}, currentTime: 0, state: 'running' };
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
  const node = () => ({ connect() {}, disconnect() {}, gain: param(), frequency: param(), Q: param(), pan: param(), detune: param(), start() {}, stop() {}, buffer: null, type: '' });
  c.createGain = node; c.createDynamicsCompressor = () => ({ ...node(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() });
  c.createConvolver = node; c.createBiquadFilter = node; c.createStereoPanner = node; c.createPanner = node;
  c.createBuffer = (n, len) => ({ getChannelData: () => new Float32Array(len) });
  c.createBufferSource = () => { c.sources++; return node(); };
  c.createOscillator = () => { c.osc++; return node(); };
  return c;
}
const count = (fn, opts) => { const c = mockCtx(), a = createAudio(c, opts); const s0 = c.sources, o0 = c.osc; fn(a); return { s: c.sources - s0, o: c.osc - o0, a }; };

// standard: av. Hverken tick, breath eller windup lager støykilder for pust.
assert.equal(createAudio(mockCtx()).isBreath(), false, 'av som standard');
{
  const c = mockCtx(), a = createAudio(c); const s0 = c.sources;
  for (let i = 0; i < 600; i++) a.tick(0.05, { active: true, rest: true, speed01: 1, climbing: true });
  a.breath('in', 1, 0.5); a.breath('out', 1, 0.5);
  assert.equal(c.sources, s0, 'ingen pustelyd når den er av (tick/rest/anstrengelse)');
  // andre lyder spilles fortsatt: hopp og landing bruker oscillator/støy utenom pust
  const o0 = c.osc, s1 = c.sources; a.jump(); a.land('wood', 20); a.step('wood', 0.8, 0); a.grab();
  assert.ok(c.osc > o0 && c.sources > s1, 'hopp, landing, skritt og grep lager fortsatt lyd');
}
// jump uten pust har færre støykilder enn med pust (pusten er den eneste forskjellen)
{
  const off = count((a) => a.jump()), on = count((a) => a.jump(), { breath: true });
  assert.ok(on.s > off.s, 'pustedelen av hopp-lyden faller bort når av'); assert.equal(on.o, off.o, 'tonedelen er lik');
}
// på: tick lager pust; kan slås av og på
{
  const c = mockCtx(), a = createAudio(c, { breath: true }); assert.equal(a.isBreath(), true);
  const s0 = c.sources; for (let i = 0; i < 200; i++) a.tick(0.05, { active: true, rest: false, speed01: 1 });
  assert.ok(c.sources > s0, 'pust spilles når på');
  a.setBreath(false); const s1 = c.sources; for (let i = 0; i < 200; i++) a.tick(0.05, { active: true, rest: true, speed01: 1 }); assert.equal(c.sources, s1, 'av igjen');
  a.setBreath(true); assert.equal(a.isBreath(), true);
  const b = createAudio(mockCtx()), c2 = b.ctx; const p0 = c2.sources; b.preview('breath'); assert.ok(c2.sources > p0, '«Hør pust» spilles også når pust er av');
}
// innstilling i main.js: av som standard, i gruppen lyd, egen nøkkel, logEv
const m = fs.readFileSync('./main.js', 'utf8');
assert.match(m, /store\.get\('tlm\.breathsound', false\)/, 'standard av, ny lagringsnøkkel');
assert.match(m, /fl\('breathsound', 'lyd', 'Pustelyd[^']*', false,/, 'innstilling i lyd, standard av');
assert.match(m, /logEv\('pustelyd'/, 'logEv');
assert.match(m, /breath: breathSound/, 'lydmotoren starter med valget');
console.log('test_breath ok');
