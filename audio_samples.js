// tinylittleme – valgfrie ekte lydfiler (R99). Finnes en fil for en lyd-id, brukes den i stedet for syntese; ellers syntese.
// Ingen lydfiler er lagt inn ennå. Slik legger du inn en: legg filen i sounds/<id>.<ext> og føy id og format til SAMPLE_IDS
// (se docs/LYD.md). Filene lastes først når lyden skal brukes (lazy), blokkerer aldri oppstart, og får ?v=<versjon>.
import { sampleUrl } from './audio_fx.js';

export const SAMPLE_IDS = {};          // { 'bplace': 'm4a', 'step:wood': 'ogg', … }

export function createSampleBank(ctx, { ids = SAMPLE_IDS, version = '', fetchFn = (typeof fetch === 'function' ? fetch : null), enabled = () => true } = {}) {
  const buf = new Map(), state = new Map();             // id → AudioBuffer | 'loading' | 'missing'
  function load(id) {
    if (state.has(id) || !ids[id] || !fetchFn || !ctx?.decodeAudioData) return;
    state.set(id, 'loading');
    Promise.resolve().then(() => fetchFn(sampleUrl(id, ids[id], version)))
      .then((r) => { if (!r || !r.ok) throw new Error('mangler'); return r.arrayBuffer(); })
      .then((ab) => new Promise((ok, no) => { const p = ctx.decodeAudioData(ab, ok, no); if (p && p.then) p.then(ok, no); }))
      .then((b) => { buf.set(id, b); state.set(id, 'ready'); })
      .catch(() => state.set(id, 'missing'));
  }
  return {
    has: (id) => !!ids[id],
    status: (id) => state.get(id) || (ids[id] ? 'idle' : 'none'),
    // spill filen hvis den er lastet; ellers start lasting i bakgrunnen og returner false (syntese brukes denne gangen)
    play(id, dest, { gain = 1, rate = 1 } = {}) {
      if (!enabled() || !ids[id]) return false;
      const b = buf.get(id);
      if (!b) { load(id); return false; }
      const s = ctx.createBufferSource(), g = ctx.createGain();
      s.buffer = b; s.playbackRate.value = rate; g.gain.value = gain; s.connect(g); g.connect(dest); s.start();
      return true;
    },
    preload() { for (const id of Object.keys(ids)) load(id); },
  };
}
