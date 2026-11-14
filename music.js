// tinylittleme – musikk og stemning per rom (R5). Alt er syntetisert med Web Audio (ingen filer).
// Delt i to: ren, testbar logikk (skala, mønster, tempo som funksjon av tilstand) øverst, og motoren
// createMusic(ctx, out) under, som bare trenger en AudioContext og en utgangsnode.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const midiFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Skalaer som halvtone-trinn fra grunntonen. «dark» er en mørkere variant av samme grunntone (brukes ved fare).
export const SCALES = {
  major: [0, 2, 4, 7, 9],           // dur-pentatonisk: lyst og trygt
  mixo: [0, 2, 4, 7, 10],           // litt skjev og leken
  minor: [0, 3, 5, 7, 10],          // moll-pentatonisk: spenning
  dim: [0, 3, 6, 7, 10],            // mørkere, uro
};

// Tema per rom: grunntone (midi), skala, tempo (slag/min), akkordgang (trinn i skalaen), og klang.
export const THEMES = {
  bad:      { id: 'bad',      label: 'Badet',       root: 62, scale: 'major', dark: 'minor', bpm: 84,  prog: [0, 3, 1, 4], timbre: 'bell',  swing: 0 },
  barnerom: { id: 'barnerom', label: 'Barnerommet', root: 60, scale: 'major', dark: 'minor', bpm: 104, prog: [0, 2, 3, 1], timbre: 'box',   swing: 0.12 },
  leke:     { id: 'leke',     label: 'Lekerommet',  root: 64, scale: 'major', dark: 'dim',   bpm: 126, prog: [0, 4, 3, 1], timbre: 'box',   swing: 0.28 },   // R31: marsjerende spilledåse (tinnsoldater)
  stue:     { id: 'stue',     label: 'Stuen',       root: 57, scale: 'major', dark: 'minor', bpm: 92,  prog: [0, 3, 2, 1], timbre: 'bell',  swing: 0.18 },   // R62: rolig stue-vals (lunt, litt søvnig)
  verksted: { id: 'verksted', label: 'Verkstedet',  root: 57, scale: 'mixo',  dark: 'dim',   bpm: 96,  prog: [0, 5, 3, 4], timbre: 'pluck', swing: 0.05 },   // R63: tung, jevn maskinrytme (lav grunntone, rolig tempo)
  kjokken:  { id: 'kjokken',  label: 'Kjøkkenet',   root: 55, scale: 'mixo',  dark: 'dim',   bpm: 116, prog: [0, 1, 3, 2], timbre: 'pluck', swing: 0.2 },
};
export const DEFAULT_THEME = 'barnerom';

// Hvilket tema hører til brettet? Eksplisitt `audio.theme`, ellers ut fra navnet.
export function themeFor(level) {
  const t = level?.audio?.theme; if (t && THEMES[t]) return THEMES[t];
  const n = String(level?.name || '').toLowerCase();
  if (/\bbad|bath/.test(n)) return THEMES.bad;
  if (/kj[øo]kken|kitchen/.test(n)) return THEMES.kjokken;
  if (/leke|toy/.test(n)) return THEMES.leke;
  if (/stue|living/.test(n)) return THEMES.stue;
  if (/verksted|garasje|workshop|garage/.test(n)) return THEMES.verksted;
  if (/barn|nursery|kids/.test(n)) return THEMES.barnerom;
  return THEMES[DEFAULT_THEME];
}

// Stemning ut fra spilltilstand: 'win' (mål), 'tense' (en maur ser deg), ellers 'calm'.
export function moodFor(s = {}) { return s.won ? 'win' : s.alerted ? 'tense' : 'calm'; }

// Tempo (slag/min) som funksjon av tema og stemning
export function tempoFor(theme, mood) { return Math.round(theme.bpm * ({ calm: 1, tense: 1.32, win: 1.12 }[mood] ?? 1)); }

// Hvilke lag som spiller i en stemning (dynamikk)
export function layersFor(mood) {
  return { pad: true, bass: true, melody: true, perc: mood !== 'calm', pulse: mood === 'tense', sparkle: mood === 'win', gain: { calm: 0.8, tense: 1, win: 1 }[mood] ?? 0.8 };
}

// Gjeldende skala: mørk når det er fare
export function scaleFor(theme, mood) { return SCALES[mood === 'tense' ? theme.dark : theme.scale]; }

// Trinn i skalaen (kan være negativt/over 4) til midi-tone
export function degreeToMidi(theme, mood, deg) {
  const sc = scaleFor(theme, mood), n = sc.length, oct = Math.floor(deg / n), i = ((deg % n) + n) % n;
  return theme.root + sc[i] + 12 * oct;
}

// Enkel deterministisk tilfeldighet, så samme takt låter likt hver gang
export function rng(seed) { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

// Melodimønster for én takt (8 åttedeler): liste av trinn (eller null = pause).
export function patternFor(theme, bar, mood = 'calm') {
  const r = rng(theme.root * 977 + (bar % 8) * 131 + (mood === 'tense' ? 7 : 0));
  const chord = theme.prog[bar % theme.prog.length], out = [];
  const dens = mood === 'tense' ? 0.8 : mood === 'win' ? 0.85 : 0.5;
  for (let i = 0; i < 8; i++) {
    if (i === 0) { out.push(chord + 5); continue; }                       // første slag: akkordtonen, én oktav opp
    if (r() > dens) { out.push(null); continue; }
    out.push(chord + [0, 2, 4, 5, 7][Math.floor(r() * 5)] + (r() < 0.25 ? 5 : 0));
  }
  return out;
}
// Bass for en takt: akkordgrunntonen på slag 1 og en tone høyere på slag 3
export function bassFor(theme, bar) { const c = theme.prog[bar % theme.prog.length]; return { 0: c - 5, 4: c - 3 }; }

// ---- motor ---------------------------------------------------------------
export function createMusic(ctx, out, opts = {}) {
  let theme = opts.theme || THEMES[DEFAULT_THEME], mood = 'calm', vol = opts.volume ?? 0.2, on = opts.on ?? true, running = false;
  const master = ctx.createGain(), duckG = ctx.createGain(); master.gain.value = on ? vol : 0; duckG.gain.value = 1; master.connect(duckG); duckG.connect(out);
  const doc = typeof document !== 'undefined' ? document : null;
  let timer = null, nextT = 0, stepI = 0, bpm = tempoFor(theme, mood), bpmNow = bpm;
  const now = () => ctx.currentTime;

  function note(m, t, { type = 'sine', gain = 0.1, dur = 0.3, attack = 0.005, partial = 0 }) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = midiFreq(m);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + attack + dur + 0.05);
    if (partial) {
      const o2 = ctx.createOscillator(), g2 = ctx.createGain(); o2.type = 'sine'; o2.frequency.value = midiFreq(m) * partial;
      g2.gain.setValueAtTime(0.0001, t); g2.gain.linearRampToValueAtTime(gain * 0.35, t + attack); g2.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur * 0.5);
      o2.connect(g2); g2.connect(master); o2.start(t); o2.stop(t + attack + dur * 0.5 + 0.05);
    }
  }
  const TIMBRE = {
    bell: (m, t, g) => note(m + 12, t, { type: 'sine', gain: 0.09 * g, dur: 0.9, partial: 2.76 }),
    box: (m, t, g) => note(m + 12, t, { type: 'triangle', gain: 0.08 * g, dur: 0.5, partial: 4 }),
    pluck: (m, t, g) => note(m + 12, t, { type: 'triangle', gain: 0.11 * g, dur: 0.22, attack: 0.002, partial: 2 }),
  };
  function noiseTick(t, gain) {
    const len = Math.floor(ctx.sampleRate * 0.04), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = buf; f.type = 'highpass'; f.frequency.value = 5000; g.gain.value = gain; s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }

  // planlegger ett åttedels trinn
  function scheduleStep(i, t) {
    const bar = Math.floor(i / 8), k = i % 8, L = layersFor(mood), tm = TIMBRE[theme.timbre];
    const mel = patternFor(theme, bar, mood)[k];
    if (L.melody && mel != null) tm(degreeToMidi(theme, mood, mel), t, L.gain);
    const b = bassFor(theme, bar)[k];
    if (L.bass && b != null) note(degreeToMidi(theme, mood, b) - 12, t, { type: 'triangle', gain: 0.14 * L.gain, dur: 0.45, partial: 3 });   // partial 3 (ca 300 Hz): hørbar i iPhone-høyttaleren, som mangler alt under ca 150 Hz
    if (k === 0 && L.pad) for (const d of [0, 2, 4]) note(degreeToMidi(theme, mood, theme.prog[bar % theme.prog.length] + d), t, { type: 'sine', gain: 0.035, dur: 60 / bpmNow * 3.6, attack: 0.25 });
    if (L.perc && k % 2 === 1) noiseTick(t, 0.05);
    if (L.pulse && k % 2 === 0) note(theme.root, t, { type: 'triangle', gain: 0.12, dur: 0.18, partial: 2 });   // puls: grunntonen (ca 200–300 Hz) med overtone, ikke sub-bass
    if (L.sparkle && k % 2 === 0) note(degreeToMidi(theme, mood, 10 + (k >> 1)), t, { type: 'sine', gain: 0.05, dur: 0.3 });
  }
  const alive = () => !ctx.state || ctx.state === 'running';                  // 'suspended'/'interrupted' (iPhone etter lås eller fanebytte): ikke planlegg noe
  function pump() {
    if (!alive()) return;
    if (nextT < now()) nextT = now() + 0.05;                                  // etter pause i fanen: ikke spill igjen det som er gått
    while (nextT < now() + 0.2) {
      bpmNow += (bpm - bpmNow) * 0.35;                                        // tempoet glir over mot nytt tempo
      const stepLen = 30 / bpmNow, sw = stepI % 2 ? theme.swing * stepLen : 0;
      scheduleStep(stepI, nextT + sw);
      nextT += stepLen; stepI++;
    }
  }
  const halt = () => { if (timer) clearInterval(timer); timer = null; };
  const tryResume = () => { try { if (!alive() && ctx.resume) { const r = ctx.resume(); if (r && r.catch) r.catch(() => {}); } } catch { /* trenger brukertrykk */ } };
  function onVis() { if (!running) return; if (doc.hidden) halt(); else { tryResume(); nextT = now() + 0.1; if (!timer) timer = setInterval(pump, 40); } }
  function onState() { if (running && alive()) nextT = now() + 0.1; else if (running && doc && !doc.hidden) tryResume(); }
  function start() {
    if (running) return; running = true; nextT = now() + 0.1;
    if (!(doc && doc.hidden)) timer = setInterval(pump, 40);
    if (doc) doc.addEventListener('visibilitychange', onVis);
    if (ctx.addEventListener) ctx.addEventListener('statechange', onState);
  }
  function stop() {
    running = false; halt();
    if (doc) doc.removeEventListener('visibilitychange', onVis);
    if (ctx.removeEventListener) ctx.removeEventListener('statechange', onState);
  }
  // ducking: musikken dukker kort når en effekt skal høres (mål, maur-støt, knusing), og kommer tilbake
  function duck(depth = 0.4, secs = 0.9) {
    const g = duckG.gain, t = now();
    if (g.cancelScheduledValues) g.cancelScheduledValues(t);
    g.setTargetAtTime(depth, t, 0.03); g.setTargetAtTime(1, t + 0.25, secs / 3);
  }
  const apply = () => master.gain.setTargetAtTime(on ? vol : 0, now(), 0.15);
  return {
    start, stop, pump, duck, onVis, onState,
    setTheme: (t) => { theme = typeof t === 'string' ? THEMES[t] || theme : t; bpm = tempoFor(theme, mood); },
    setMood: (m) => { mood = m; bpm = tempoFor(theme, mood); },
    setVolume: (v) => { vol = clamp(v, 0, 1); apply(); },
    setOn: (o) => { on = !!o; apply(); },
    get state() { return { theme: theme.id, mood, bpm: Math.round(bpmNow), running, on, vol, ticking: !!timer, ctxState: ctx.state || 'running' }; },
  };
}
