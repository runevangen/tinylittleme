// tinylittleme – lydlogikk uten Web Audio (R99): variasjon, romtoner, bygglyd-valg og livssyklus.
// Ren logikk, testet i node (test_audiofx.mjs). audio.js bruker variasjon og sampler; main.js bruker romtonene.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---- variasjon: liten tilfeldig tonehøyde/styrke, aldri samme variant to ganger på rad --------------
export const VARIANTS = 6;                                 // antall varianter per lyd
export function makeVariation(rng = Math.random, spread = 0.045) {
  const last = new Map();
  return {
    // pick(id) → { idx, pitch, gain }: pitch og gain ligger innenfor ±spread (±3–6 %), idx er forskjellig fra forrige
    pick(id, s = spread) {
      let idx = Math.floor(rng() * VARIANTS);
      if (idx === last.get(id)) idx = (idx + 1 + Math.floor(rng() * (VARIANTS - 1))) % VARIANTS;
      last.set(id, idx);
      const t = (idx / (VARIANTS - 1)) * 2 - 1;            // -1 … +1 jevnt fordelt, så to naboer ikke blir like
      const k = clamp(s, 0.03, 0.06);
      const u = (((idx * 5) % VARIANTS) / (VARIANTS - 1)) * 2 - 1;   // annen rekkefølge enn t, så tonehøyde og styrke ikke følger hverandre
      return { idx, pitch: 1 + t * k, gain: 1 + u * k };
    },
    last: (id) => last.get(id),
  };
}
// lyder som gjentas og får variasjon (kanal-id)
export const VARY_IDS = new Set(['step', 'land', 'drop', 'pickup', 'grab', 'bplace', 'battach', 'bknot', 'brod', 'bpop', 'bhop']);
export const varyKey = (ch) => (ch.startsWith('step:') ? 'step' : ch);
export const shouldVary = (ch) => VARY_IDS.has(varyKey(ch));

// ---- byggelyd: hvilken lyd passer til hvilken del/feste ----------------------------------------------
export function buildMaterial(type) {
  const t = String(type || '');
  if (/^rod:/.test(t) || /^grid:/.test(t)) { const m = t.split(':')[1]; return m === 'steel' ? 'steel' : m === 'rope' ? 'rope' : 'wood'; }
  if (/steel|metal|ruler|weight/.test(t)) return /ruler/.test(t) ? 'wood' : 'steel';
  if (/rope|tau/.test(t)) return 'rope';
  if (/block|lego|book|sponge|pencil/.test(t)) return 'block';
  return 'wood';                                           // plank_*, seesaw
}
export const MATERIAL_NAMES = ['wood', 'steel', 'rope', 'block'];
export const ATTACH_KINDS = ['tape', 'hinge', 'rope', 'band'];
export const attachKind = (k) => (ATTACH_KINDS.includes(k) ? k : 'tape');

// brudd: knirk vokser med belastning (0–1.5), smell først når det går i stykker
export const creakLevel = (stress) => clamp(0.15 + (+stress || 0) * 0.85, 0.1, 1.5);

// ---- romtoner ------------------------------------------------------------------------------------
// Lag (navn brukt i brettets audio.ambience). loop = jevn bakgrunn, ev = enkelthendelse med intervall (s), clock = tikking.
export const LAYERS = {
  drip: { ev: 'drip', every: [2.4, 6] },
  fan: { loop: 'fan', level: 0.05 },
  fridge: { loop: 'fridge', level: 0.045, freq: 95, q: 1.4, type: 'lowpass' },
  clock: { clock: 1.0, level: 1 },
  'room:toy': { loop: 'room', level: 0.028, freq: 420, q: 0.5, type: 'lowpass' },
  'room:play': { loop: 'room', level: 0.026, freq: 520, q: 0.5, type: 'lowpass' },
  'room:stue': { loop: 'room', level: 0.03, freq: 160, q: 0.7, type: 'lowpass' },
  'room:shop': { loop: 'room', level: 0.034, freq: 260, q: 0.9, type: 'lowpass' },
  'room:night': { loop: 'room', level: 0.022, freq: 300, q: 0.4, type: 'lowpass' },
  'room:lab': { loop: 'room', level: 0.024, freq: 360, q: 0.8, type: 'lowpass' },
  plink: { ev: 'plink', every: [7, 14] },
  knock: { ev: 'knock', every: [9, 18] },
  gust: { ev: 'gust', every: [10, 20] },
};
export const AMB_BY_ID = {
  bad: ['drip', 'fan'], bad2: ['drip', 'fan'],
  barnerom: ['room:toy', 'plink'], barnerom2: ['room:toy', 'plink'],
  kjokken: ['fridge', 'clock', 'drip'], kjokken2: ['fridge', 'clock', 'drip'], kjokkenbro: ['fridge', 'clock', 'drip'], badebro: ['drip', 'fan'], bro2: ['room:lab'], kjokkenbro2: ['fridge', 'clock', 'drip'],
  leke: ['room:play', 'plink'], stue: ['room:stue', 'clock', 'gust'], verksted: ['room:shop', 'knock'],
  soverom: ['room:night', 'gust'], bygglab: ['room:lab', 'knock'],
  bro: ['room:lab'], trapp: ['room:lab'], vippe: ['room:toy'], gaate: ['room:stue'], poc: ['room:lab'], klatring: ['room:lab'], kontroll: ['room:lab'],
};
// romtonen for et brett: brettets egen liste hvis den bare bruker kjente lag, ellers fra id
export function ambienceFor(levelId, level) {
  const own = level?.audio?.ambience;
  if (Array.isArray(own) && own.length && own.every((n) => LAYERS[n])) return own.slice();
  return (AMB_BY_ID[levelId] || []).slice();
}
// skal romtonen være på nå?
export const ambientOn = ({ menu = false, underwater = false, hidden = false, build = false, plan = false, unlocked = true } = {}) =>
  !!unlocked && !menu && !underwater && !hidden && !build && !plan;
// romtoner skal ligge under skritt: høyeste nivå (lineær gain før mikser) for loop-lag
export const AMB_CEILING = 0.06;

// Planlegger for enkelthendelser. step(dt, on) → liste av { kind, pan }. Hendelser av ulik type kommer aldri tett
// (minst GAP s), og med klokke i rommet legges de midt mellom to tikk, så ingenting lyder samtidig.
export const AMB_GAP = 1.2;
export function createAmbience(list, rng = Math.random) {
  const layers = (list || []).map((n) => ({ name: n, ...LAYERS[n] })).filter((l) => l.ev || l.clock);
  const clock = layers.find((l) => l.clock);
  const evs = layers.filter((l) => l.ev).map((l) => ({ ...l, t: l.every[0] * 0.5 + rng() * (l.every[1] - l.every[0]) }));
  let sinceAny = 99, tick = 0, ticks = 0, flip = false;
  return {
    loops: (list || []).map((n) => ({ name: n, ...LAYERS[n] })).filter((l) => l.loop),
    hasClock: !!clock,
    step(dt, on = true) {
      const out = [];
      if (!on) return out;
      sinceAny += dt;
      if (clock) {
        tick += dt;
        if (tick >= clock.clock) { tick -= clock.clock; flip = !flip; ticks++; out.push({ kind: 'clock', alt: flip, pan: 0 }); }
      }
      for (const e of evs) {
        e.t -= dt;
        if (e.t > 0) continue;
        const phaseOk = !clock || (tick > 0.3 && tick < 0.7);
        if (sinceAny < AMB_GAP || !phaseOk) { e.t = 0.1; continue; }          // vent på ledig plass
        e.t = e.every[0] + rng() * (e.every[1] - e.every[0]);
        sinceAny = 0;
        out.push({ kind: e.ev, pan: (rng() * 2 - 1) * 0.6 });
        break;                                                                // maks én hendelse per bilde
      }
      return out;
    },
    get ticks() { return ticks; },
  };
}

// ---- livssyklus (iPhone): ingenting før første trykk, stille i bakgrunnen ---------------------------
export function lifecycle({ unlocked = false, hidden = false, state = 'suspended' } = {}) {
  if (!unlocked) return 'none';                            // ingen lyd før første trykk
  if (hidden) return state === 'running' ? 'suspend' : 'none';
  return state === 'running' ? 'none' : 'resume';
}

// ---- ekte lyd (valgfritt): sounds/<id>.ogg|mp3|m4a ----------------------------------------------------
export const SAMPLE_EXTS = ['ogg', 'mp3', 'm4a'];
export const sampleFile = (id) => String(id).replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
export const sampleUrl = (id, ext = 'ogg', version = '') => `sounds/${sampleFile(id)}.${ext}${version ? '?v=' + encodeURIComponent(version) : ''}`;
