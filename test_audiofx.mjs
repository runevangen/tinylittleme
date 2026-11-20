// R99: lydlogikk (variasjon, romtoner, bygglyd-valg, livssyklus, ekte lyd). Kjøres i node.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeVariation, VARIANTS, shouldVary, varyKey, buildMaterial, attachKind, ambienceFor, ambientOn, createAmbience, LAYERS, AMB_BY_ID, AMB_GAP, AMB_CEILING, lifecycle, sampleFile, sampleUrl } from './audio_fx.js';
import { createSampleBank } from './audio_samples.js';
import { SOUND_LIST } from './audio.js';

// variasjon: innenfor ±3–6 %, aldri samme variant to ganger på rad, ikke bare én verdi
{
  const v = makeVariation(() => 0.5);                           // verste tilfelle: rng gir alltid samme
  let prev = -1; const seen = new Set();
  for (let i = 0; i < 40; i++) { const r = v.pick('step'); assert.notEqual(r.idx, prev, 'samme variant to ganger'); prev = r.idx; seen.add(r.idx); assert.ok(Math.abs(r.pitch - 1) <= 0.06 + 1e-9 && Math.abs(r.gain - 1) <= 0.06 + 1e-9); }
  assert.ok(seen.size >= 2);
  const w = makeVariation(Math.random); const ps = new Set();
  for (let i = 0; i < 200; i++) { const r = w.pick('x'); ps.add(r.pitch.toFixed(4)); assert.ok(r.pitch >= 0.94 && r.pitch <= 1.06 && r.gain >= 0.94 && r.gain <= 1.06 && r.idx >= 0 && r.idx < VARIANTS); }
  assert.ok(ps.size >= 4 && ps.size <= VARIANTS);
  const a = makeVariation(() => 0.1), b2 = makeVariation(() => 0.1); a.pick('l'); b2.pick('l'); assert.equal(a.last('l'), b2.last('l'));
  assert.equal(makeVariation(Math.random, 0.5).pick('q').pitch <= 1.06, true, 'spredning klemmes til 6 %');
  assert.ok(shouldVary('step:wood') && shouldVary('land') && shouldVary('bplace') && !shouldVary('fall') && !shouldVary('win'));
  assert.equal(varyKey('step:tile'), 'step');
}
// bygglyd: materiale og feste
assert.equal(buildMaterial('plank_s'), 'wood'); assert.equal(buildMaterial('rod:steel'), 'steel'); assert.equal(buildMaterial('rod:rope'), 'rope'); assert.equal(buildMaterial('rod:wood'), 'wood');
assert.equal(buildMaterial('block'), 'block'); assert.equal(buildMaterial('lego'), 'block'); assert.equal(buildMaterial('seesaw'), 'wood'); assert.equal(buildMaterial(undefined), 'wood');
assert.equal(attachKind('hinge'), 'hinge'); assert.equal(attachKind('x'), 'tape');
// alle lyder har egen kanal og tilhører en gruppe; bygging i egen gruppe
for (const id of ['bplace', 'battach', 'bknot', 'brod', 'bpop', 'bstart', 'barrive', 'bstars', 'fridge', 'clock', 'room', 'amb']) assert.ok(SOUND_LIST.some((s) => s.id === id), id + ' mangler i SOUND_LIST');
assert.ok(SOUND_LIST.filter((s) => s.group === 'Bygging').length >= 8);
assert.equal(new Set(SOUND_LIST.map((s) => s.id)).size, SOUND_LIST.length, 'doble lyd-id-er');
// romtoner: alle ni nivåene (og variantene) har egen, svak romtone; ingen to like nabo-rom
const NINE = ['bad', 'barnerom', 'kjokken', 'bad2', 'barnerom2', 'kjokken2', 'leke', 'stue', 'verksted'];
for (const id of [...NINE, 'bygglab', 'soverom']) {
  const list = ambienceFor(id, null); assert.ok(list.length >= 1, id + ' har ingen romtone');
  for (const n of list) assert.ok(LAYERS[n], `${id}: ukjent lag ${n}`);
  assert.ok(list.some((n) => LAYERS[n].loop || LAYERS[n].clock), id + ' mangler jevn romtone');
}
const sig = (id) => ambienceFor(id, null).join('|');
assert.equal(new Set(['bad', 'barnerom', 'kjokken', 'leke', 'stue', 'verksted', 'soverom', 'bygglab'].map(sig)).size, 8, 'rom som deler samme romtone');
for (const l of Object.values(LAYERS)) if (l.loop) assert.ok(l.level > 0 && l.level <= AMB_CEILING, 'romtone for sterk');
assert.deepEqual(ambienceFor('x', { audio: { ambience: ['drip', 'fan'] } }), ['drip', 'fan']);
assert.deepEqual(ambienceFor('stue', { audio: { ambience: ['ukjent'] } }), AMB_BY_ID.stue, 'ugyldig liste faller tilbake på id');
// brettfilene stemmer med tabellen
for (const id of Object.keys(AMB_BY_ID)) { const f = `levels/${id}.level.json`; if (!fs.existsSync(f)) continue; const L = JSON.parse(fs.readFileSync(f, 'utf8')); if (L.audio) assert.deepEqual(L.audio.ambience, AMB_BY_ID[id], id + ' brettets audio.ambience'); }
// av i meny, under vann, i bakgrunnen, i bygging, før første trykk
assert.equal(ambientOn({}), true);
for (const k of ['menu', 'underwater', 'hidden', 'build', 'plan']) assert.equal(ambientOn({ [k]: true }), false, k);
assert.equal(ambientOn({ unlocked: false }), false);
// planlegger: ingen hendelser når av; hendelser aldri tettere enn AMB_GAP; klokken tikker jevnt
{
  const off = createAmbience(['drip', 'clock']); let n = 0; for (let i = 0; i < 600; i++) n += off.step(0.05, false).length; assert.equal(n, 0);
  let seed = 7; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const a = createAmbience(['drip', 'clock', 'gust'], rng); let t = 0, lastEv = -99, evs = 0, clocks = 0, minGap = 99;
  for (let i = 0; i < 20 * 600; i++) { t += 0.05; for (const e of a.step(0.05, true)) { if (e.kind === 'clock') clocks++; else { evs++; minGap = Math.min(minGap, t - lastEv); lastEv = t; } } }
  assert.ok(clocks >= 590 && clocks <= 601, 'klokke ' + clocks); assert.ok(evs > 30, 'hendelser ' + evs); assert.ok(minGap >= AMB_GAP - 1e-6, 'for tett: ' + minGap);
  assert.equal(a.hasClock, true); assert.equal(createAmbience(['fridge']).loops.length, 1);
}
// livssyklus
assert.equal(lifecycle({ unlocked: false, hidden: false, state: 'suspended' }), 'none');
assert.equal(lifecycle({ unlocked: false, hidden: true, state: 'running' }), 'none');
assert.equal(lifecycle({ unlocked: true, hidden: true, state: 'running' }), 'suspend');
assert.equal(lifecycle({ unlocked: true, hidden: false, state: 'suspended' }), 'resume');
assert.equal(lifecycle({ unlocked: true, hidden: false, state: 'interrupted' }), 'resume');
assert.equal(lifecycle({ unlocked: true, hidden: false, state: 'running' }), 'none');
assert.equal(lifecycle({ unlocked: true, hidden: true, state: 'suspended' }), 'none');
// ekte lyd: url med cache-bust, lazy, syntese til filen er lastet, mangler = aldri en feil
assert.equal(sampleFile('step:wood'), 'step_wood'); assert.equal(sampleUrl('step:wood', 'ogg', '2.76'), 'sounds/step_wood.ogg?v=2.76'); assert.equal(sampleUrl('bplace', 'm4a'), 'sounds/bplace.m4a');
{
  const calls = []; let decoded = 0, played = 0;
  const ctx = { decodeAudioData: (ab, ok) => { decoded++; ok({ len: 1 }); }, createBufferSource: () => ({ buffer: null, playbackRate: { value: 1 }, connect() {}, start() { played++; } }), createGain: () => ({ gain: { value: 1 }, connect() {} }) };
  const fetchFn = (u) => { calls.push(u); return Promise.resolve(u.includes('missing') ? { ok: false } : { ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }); };
  const bank = createSampleBank(ctx, { ids: { bplace: 'ogg', missing: 'mp3' }, version: '9.9', fetchFn });
  assert.equal(calls.length, 0, 'ingenting lastes ved oppstart'); assert.equal(bank.play('bknot', {}), false); assert.equal(bank.status('bknot'), 'none');
  assert.equal(bank.play('bplace', {}), false, 'første gang: syntese'); assert.equal(bank.status('bplace'), 'loading');
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(calls, ['sounds/bplace.ogg?v=9.9']); assert.equal(bank.status('bplace'), 'ready');
  assert.equal(bank.play('bplace', {}, { gain: 0.9, rate: 1.02 }), true); assert.equal(played, 1); assert.equal(decoded, 1);
  bank.play('missing', {}); await new Promise((r) => setTimeout(r, 20)); assert.equal(bank.status('missing'), 'missing'); assert.equal(bank.play('missing', {}), false);
  const off = createSampleBank(ctx, { ids: { bplace: 'ogg' }, fetchFn, enabled: () => false }); assert.equal(off.play('bplace', {}), false); assert.equal(off.status('bplace'), 'idle');
  assert.equal(createSampleBank(null, { ids: { a: 'ogg' }, fetchFn: null }).play('a', {}), false, 'uten fetch/ctx: bare syntese');
}
// moduler er med i index.html; ingen lydfiler følger med nå
const idx = fs.readFileSync('index.html', 'utf8');
for (const f of ['audio_fx', 'audio_samples']) assert.ok(idx.includes(`'${f}'`), `${f} mangler i files i index.html`);
const { SAMPLE_IDS } = await import('./audio_samples.js'); assert.deepEqual(SAMPLE_IDS, {});
console.log('audiofx: ok');
