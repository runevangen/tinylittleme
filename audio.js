// tinylittleme – lyd. Alt er syntetisert med Web Audio (ingen lydfiler), og ctx injiseres,
// så motoren kan testes med OfflineAudioContext (se tools/audio_check.cjs).
//
// Lydene: skritt per underlag, landing, pust som følger anstrengelse, innpust ved «tar sats»,
// avspark, fallvind, skrens, dytting, og hendelser (knuse, klemt, ta/slipp ting, skylles ned).

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;

// Fra et brett-objekt til lydunderlag
const SURF = {
  wood: 'wood', woodpanel: 'wood', floor: 'wood', plaster: 'wood', wall: 'wood',
  tile: 'tile', porcelain: 'tile', ceramic: 'tile',
  plastic: 'plastic', fabric: 'soft', mat: 'soft', book: 'paper', paper: 'paper',
  metal: 'metal', glass: 'glass', wicker: 'wicker',
};
export function surfaceOf(b) {
  if (!b) return 'wood';
  return SURF[b.material] || SURF[b.type] || 'wood';
}

// Alle lyder som har egen volumkontroll (id, navn, gruppe). Brukes også til å bygge mikseren i menyen.
export const SOUND_LIST = [
  { id: 'step', label: 'Skritt (alle underlag)', group: 'Bevegelse' },
  { id: 'land', label: 'Landing', group: 'Bevegelse' },
  { id: 'windup', label: 'Tar sats (innpust)', group: 'Bevegelse' },
  { id: 'jump', label: 'Avspark («hup»)', group: 'Bevegelse' },
  { id: 'fall', label: 'Fallvind', group: 'Bevegelse' },
  { id: 'skid', label: 'Skrens', group: 'Bevegelse' },
  { id: 'breath', label: 'Pust', group: 'Pust' },
  { id: 'grab', label: 'Gripe kant/tau', group: 'Klatring' },
  { id: 'mantle', label: 'Hive seg opp', group: 'Klatring' },
  { id: 'reach', label: 'Rekke ut', group: 'Klatring' },
  { id: 'pickup', label: 'Ta opp ting', group: 'Ting' },
  { id: 'drop', label: 'Slippe ting', group: 'Ting' },
  { id: 'scrape', label: 'Dytte (skrap)', group: 'Ting' },
  { id: 'shatter', label: 'Ting knuses', group: 'Ting' },
  { id: 'crush', label: 'Klemt', group: 'Hendelser' },
  { id: 'splash', label: 'Kar / skylles ned', group: 'Hendelser' },
  { id: 'checkpoint', label: 'Sjekkpunkt', group: 'Hendelser' },
  { id: 'win', label: 'Mål', group: 'Hendelser' },
  { id: 'drip', label: 'Dryppende kran', group: 'Rom' },
  { id: 'fan', label: 'Vifte / romtone', group: 'Rom' },
  { id: 'step:wood', label: 'Skritt: tre', group: 'Skritt per underlag' },
  { id: 'step:tile', label: 'Skritt: flis/porselen', group: 'Skritt per underlag' },
  { id: 'step:soft', label: 'Skritt: matte/tekstil', group: 'Skritt per underlag' },
  { id: 'step:paper', label: 'Skritt: papir/bok', group: 'Skritt per underlag' },
  { id: 'step:plastic', label: 'Skritt: plast', group: 'Skritt per underlag' },
  { id: 'step:metal', label: 'Skritt: metall', group: 'Skritt per underlag' },
  { id: 'step:glass', label: 'Skritt: glass', group: 'Skritt per underlag' },
  { id: 'step:wicker', label: 'Skritt: kurv', group: 'Skritt per underlag' },
];

export function createAudio(ctx, opts = {}) {
  let volume = opts.volume ?? 0.7, muted = false;
  const master = ctx.createGain(); master.gain.value = volume;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
  master.connect(comp); comp.connect(ctx.destination);

  // rom: litt etterklang (mer i bad med fliser)
  const bus = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain(), rev = ctx.createConvolver();
  const irLen = Math.floor(ctx.sampleRate * 1.2), ir = ctx.createBuffer(1, irLen, ctx.sampleRate), ird = ir.getChannelData(0);
  for (let i = 0; i < irLen; i++) ird[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2.4);
  rev.buffer = ir; wet.gain.value = opts.reverb ?? 0.12;
  bus.connect(dry); dry.connect(master); bus.connect(rev); rev.connect(wet); wet.connect(master);

  // kanaler: hver lyd har egen volumnode (0–2). Underlag-skritt mater inn i «step».
  const chan = {}, levels = {};
  for (const { id } of SOUND_LIST) { chan[id] = ctx.createGain(); chan[id].gain.value = 1; levels[id] = 1; }
  for (const { id } of SOUND_LIST) chan[id].connect(id.startsWith('step:') ? chan.step : bus);
  for (const k in opts.levels || {}) if (chan[k]) { levels[k] = clamp(opts.levels[k], 0, 2); chan[k].gain.value = levels[k]; }   // lagrede nivåer fra forrige økt
  let cur = bus;                                              // gjeldende utgang for lyden som lages akkurat nå
  const use = (name, fn) => { const prev = cur; cur = chan[name] || bus; try { return fn(); } finally { cur = prev; } };

  const noiseLen = ctx.sampleRate * 2, noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate), nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) nd[i] = Math.random() * 2 - 1;

  const now = () => ctx.currentTime;
  const panner = (p) => { if (!p || !ctx.createStereoPanner) return null; const n = ctx.createStereoPanner(); n.pan.value = p; n.connect(cur); return n; };

  function envelope(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
  // kort støystøt gjennom et filter
  function burst({ type = 'bandpass', freq = 1000, freq2, q = 1, gain = 0.2, attack = 0.002, decay = 0.05, delay = 0, pan = 0 }) {
    const t = now() + delay, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, t + attack + decay);
    envelope(g, t, gain, attack, decay);
    s.connect(f); f.connect(g); g.connect(panner(pan) || cur);
    s.start(t, rnd(0, 1.5)); s.stop(t + attack + decay + 0.05);
  }
  // kort tone (tupp, ring, dunk)
  function tone({ freq = 200, freq2, type = 'sine', gain = 0.2, attack = 0.002, decay = 0.1, delay = 0, pan = 0 }) {
    const t = now() + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (freq2) o.frequency.exponentialRampToValueAtTime(freq2, t + attack + decay);
    envelope(g, t, gain, attack, decay);
    o.connect(g); g.connect(panner(pan) || cur);
    o.start(t); o.stop(t + attack + decay + 0.05);
  }

  // ---- skritt per underlag ----------------------------------------------
  const STEP = {
    wood:    (i, p) => { tone({ freq: rnd(100, 135), freq2: 62, gain: 0.5 * i, decay: 0.09, pan: p }); burst({ freq: rnd(700, 1000), q: 1.2, gain: 0.22 * i, decay: 0.04, pan: p }); burst({ type: 'highpass', freq: 2600, gain: 0.05 * i, decay: 0.02, pan: p }); },
    tile:    (i, p) => { burst({ type: 'highpass', freq: 3200, q: 0.7, gain: 0.22 * i, decay: 0.028, pan: p }); tone({ freq: rnd(1500, 1900), type: 'triangle', gain: 0.08 * i, decay: 0.035, pan: p }); tone({ freq: rnd(90, 120), freq2: 70, gain: 0.25 * i, decay: 0.06, pan: p }); },
    soft:    (i, p) => { burst({ type: 'lowpass', freq: 600, q: 0.5, gain: 0.28 * i, attack: 0.012, decay: 0.09, pan: p }); tone({ freq: 70, gain: 0.12 * i, decay: 0.07, pan: p }); },
    paper:   (i, p) => { burst({ freq: rnd(2200, 3000), q: 0.8, gain: 0.2 * i, attack: 0.008, decay: 0.07, pan: p }); tone({ freq: 100, gain: 0.14 * i, decay: 0.06, pan: p }); },
    plastic: (i, p) => { burst({ freq: rnd(1100, 1500), q: 4, gain: 0.24 * i, decay: 0.05, pan: p }); tone({ freq: rnd(180, 240), gain: 0.2 * i, decay: 0.05, pan: p }); },
    metal:   (i, p) => { tone({ freq: rnd(1000, 1300), gain: 0.12 * i, decay: 0.18, pan: p }); tone({ freq: rnd(2300, 2700), gain: 0.07 * i, decay: 0.12, pan: p }); burst({ type: 'highpass', freq: 3500, gain: 0.12 * i, decay: 0.015, pan: p }); tone({ freq: 110, gain: 0.18 * i, decay: 0.05, pan: p }); },
    glass:   (i, p) => { tone({ freq: rnd(2300, 2600), gain: 0.1 * i, decay: 0.1, pan: p }); tone({ freq: rnd(3500, 4100), gain: 0.06 * i, decay: 0.08, pan: p }); burst({ type: 'highpass', freq: 4000, gain: 0.1 * i, decay: 0.012, pan: p }); tone({ freq: 120, gain: 0.18 * i, decay: 0.05, pan: p }); },
    wicker:  (i, p) => { burst({ freq: rnd(1300, 1800), q: 2.5, gain: 0.2 * i, attack: 0.01, decay: 0.09, pan: p }); tone({ freq: 90, gain: 0.14 * i, decay: 0.06, pan: p }); },
  };
  function step(kind, intensity = 0.6, side = 0) {
    const k = STEP[kind] ? kind : 'wood';
    use('step:' + k, () => STEP[k](clamp(intensity, 0.08, 1) * rnd(0.88, 1.1) * 1.7, side * 0.18));   // skritt skal være tydelige men lette
  }

  // ---- pust --------------------------------------------------------------
  function breath(kind, intensity, dur, delay = 0) {
    const t = now() + delay, k = clamp(intensity, 0, 1);
    const peak = (kind === 'in' ? 0.04 : 0.055) + 0.26 * Math.pow(k, 1.3);
    const att = kind === 'in' ? dur * 0.6 : dur * 0.18;
    for (const [freq, q, mult] of [[kind === 'in' ? 1500 : 1100, 0.7 - 0.35 * k, 1], [3400, 0.5, 0.35 + 0.4 * k]]) {   // nese + munn (mer munn ved anstrengelse)
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; lp.type = 'lowpass'; lp.frequency.value = 5200;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak * mult, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(lp); lp.connect(g); g.connect(cur);
      s.start(t, rnd(0, 1.5)); s.stop(t + dur + 0.05);
    }
  }

  // anstrengelse (0..1) styrer pustefrekvens og styrke; ro gir langsom, nesten hørbar pust
  let effort = 0, bphase = 0;
  const bump = (x) => { effort = clamp(effort + x, 0, 1); };
  function tick(dt, st = {}) {
    if (!st.active) return;
    use('breath', () => tickBreath(dt, st));
  }
  function tickBreath(dt, st) {
    const target = clamp((st.speed01 || 0) * 0.85 + (st.climbing ? 0.5 : 0), 0, 1);
    if (target > effort) effort += (target - effort) * (1 - Math.exp(-dt / 2.0));
    else effort = Math.max(target, effort - 0.06 * dt);
    const T = lerp(4.2, 0.7, Math.pow(effort, 0.8));
    bphase += dt / T;
    if (bphase >= 1) {
      bphase -= 1;
      breath('in', 0.1 + 0.9 * effort, T * 0.42);
      breath('out', 0.1 + 0.9 * effort, T * 0.5, T * 0.45);
    }
  }

  // ---- bevegelse ---------------------------------------------------------
  const windup = () => use('windup', () => { breath('in', 0.65, 0.13); burst({ type: 'lowpass', freq: 700, gain: 0.1, attack: 0.04, decay: 0.1 }); });             // tar sats: kort innpust + tøy
  const jump = () => use('jump', () => { breath('out', 0.85, 0.15); tone({ freq: 90, freq2: 55, gain: 0.3, decay: 0.08 }); burst({ freq: 900, q: 1, gain: 0.12, decay: 0.05 }); bump(0.12); });   // avspark + «hup»
  const land = (kind, impact) => use('land', () => {
    const i = clamp((impact - 3) / 22, 0, 1);
    (STEP[kind] || STEP.wood)(0.45 + 0.8 * i, 0);
    tone({ freq: 62, freq2: 35, gain: 0.5 * (0.2 + i), decay: 0.18 });
    burst({ type: 'lowpass', freq: 400, gain: 0.3 * i, decay: 0.15 });
    if (i > 0.3) { breath('out', 0.5 + 0.5 * i, 0.3, 0.05); bump(0.2 * i); }
  });
  const grab = () => use('grab', () => { breath('in', 0.6, 0.12); burst({ freq: 1800, q: 0.8, gain: 0.14, decay: 0.05 }); tone({ freq: 140, gain: 0.2, decay: 0.07 }); bump(0.08); });
  const mantle = () => use('mantle', () => { breath('out', 0.9, 0.7); burst({ type: 'lowpass', freq: 900, gain: 0.14, attack: 0.1, decay: 0.55 }); tone({ freq: 80, freq2: 55, gain: 0.28, decay: 0.12, delay: 0.7 }); bump(0.3); });
  const reach = () => use('reach', () => burst({ type: 'highpass', freq: 1200, freq2: 3500, gain: 0.1, attack: 0.03, decay: 0.12 }));

  // kontinuerlige lyder (skrus opp og ned): fallvind, skrens, dytting
  function loopNoise(freq, q, type) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(cur); s.start();
    return { f, g };
  }
  const loops = {};
  const hold = {};                                            // forhåndsvisning holder en kontinuerlig lyd på en stund
  function setLoop(name, make, level, freq) {
    if (now() < (hold[name] || 0)) return;
    const l = loops[name] || (loops[name] = use(name === 'wind' ? 'fall' : name, make));
    const t = now();
    l.g.gain.setTargetAtTime(level, t, 0.06);
    if (freq) l.f.frequency.setTargetAtTime(freq, t, 0.08);
  }
  const fall = (speed) => setLoop('wind', () => loopNoise(500, 0.7, 'bandpass'), clamp((speed - 5) / 18, 0, 1) * 0.22, 350 + speed * 45);
  const skid = (level) => setLoop('skid', () => loopNoise(2400, 8, 'bandpass'), clamp(level, 0, 1) * 0.1, 2000 + level * 700);
  const scrape = (level) => setLoop('scrape', () => loopNoise(700, 1, 'lowpass'), clamp(level, 0, 1) * 0.25, 500 + level * 500);

  // ---- ting og hendelser ---------------------------------------------------
  const pickup = () => use('pickup', () => burst({ freq: 1800, q: 0.9, gain: 0.16, attack: 0.02, decay: 0.12 }));
  const drop = (kind) => use('drop', () => { (STEP[kind] || STEP.wood)(0.8, 0); tone({ freq: 80, freq2: 50, gain: 0.3, decay: 0.1 }); });
  const shatter = () => use('shatter', () => {
    burst({ type: 'highpass', freq: 3000, gain: 0.4, decay: 0.25 });
    for (let k = 0; k < 7; k++) tone({ freq: rnd(2400, 6200), gain: rnd(0.04, 0.1), decay: rnd(0.05, 0.18), delay: rnd(0, 0.35) });
    tone({ freq: 140, freq2: 70, gain: 0.3, decay: 0.1 });
  });
  const crush = () => use('crush', () => { tone({ freq: 55, freq2: 38, gain: 0.7, decay: 0.3 }); burst({ type: 'lowpass', freq: 500, gain: 0.45, decay: 0.25 }); breath('out', 0.9, 0.3, 0.08); });
  const splash = (kind) => use('splash', () => {                                                      // fare: kar/do
    burst({ type: 'lowpass', freq: kind === 'flush' ? 1500 : 800, freq2: 180, gain: 0.35, attack: 0.02, decay: kind === 'flush' ? 1.2 : 0.4 });
    tone({ freq: 120, freq2: 60, gain: 0.4, decay: 0.25 });
  });
  const checkpoint = () => use('checkpoint', () => { tone({ freq: 880, type: 'triangle', gain: 0.1, decay: 0.35 }); tone({ freq: 1320, type: 'triangle', gain: 0.07, decay: 0.45, delay: 0.08 }); });
  const win = () => use('win', () => [523, 659, 784, 1047].forEach((f, k) => tone({ freq: f, type: 'triangle', gain: 0.12, decay: 0.5, delay: k * 0.11 })));

  // ---- romlyd (kommer fra brettets audio.ambience) -------------------------------------
  const drip = (pan = 0) => use('drip', () => {                // én dråpe: kort «plink» med litt tunk og klikk
    tone({ freq: rnd(1900, 2500), freq2: rnd(850, 1150), gain: 0.14, attack: 0.001, decay: 0.07, pan });
    tone({ freq: rnd(280, 340), freq2: 170, gain: 0.07, attack: 0.002, decay: 0.12, delay: 0.015, pan });
    burst({ type: 'highpass', freq: 3600, gain: 0.05, decay: 0.02, pan });
  });
  const hum = (level = 0.05) => setLoop('fan', () => loopNoise(210, 0.9, 'lowpass'), clamp(level, 0, 1), 210);   // vifte / lav romtone
  function quietLoops() { for (const k in loops) if (k !== 'fan' && now() >= (hold[k] || 0)) loops[k].g.gain.setTargetAtTime(0, now(), 0.08); }

  // ---- mikser ---------------------------------------------------------------
  const MAXLEVEL = 2;
  function setLevel(id, v) {
    if (!chan[id]) return;
    levels[id] = clamp(v, 0, MAXLEVEL);
    chan[id].gain.setTargetAtTime(levels[id], now(), 0.02);
  }
  function setLevels(obj) { for (const k in obj || {}) setLevel(k, obj[k]); }
  // spill av en lyd med typiske verdier, så den kan justeres uten å spille
  function preview(id) {
    if (id.startsWith('step:')) { const k = id.slice(5); step(k, 0.9, -1); step(k, 0.9, 1) }
    else switch (id) {
      case 'step': step('wood', 0.9, -1); step('tile', 0.9, 1); break;
      case 'land': land('wood', 16); break;
      case 'windup': windup(); break;
      case 'jump': jump(); break;
      case 'breath': use('breath', () => { breath('in', 0.7, 0.5); breath('out', 0.7, 0.6, 0.55); }); break;
      case 'grab': grab(); break;
      case 'mantle': mantle(); break;
      case 'reach': reach(); break;
      case 'pickup': pickup(); break;
      case 'drop': drop('wood'); break;
      case 'shatter': shatter(); break;
      case 'crush': crush(); break;
      case 'splash': splash('flush'); break;
      case 'checkpoint': checkpoint(); break;
      case 'win': win(); break;
      case 'drip': drip(-0.3); drip(0.3); break;
      case 'fan': hold.fan = now() + 1.4; setLoop2('fan', 'fan', () => loopNoise(210, 0.9, 'lowpass'), 0.06, 210); break;
      case 'fall': hold.wind = now() + 1.4; setLoop2('wind', 'fall', () => loopNoise(500, 0.7, 'bandpass'), 0.22, 1300); break;
      case 'skid': hold.skid = now() + 1.0; setLoop2('skid', 'skid', () => loopNoise(2400, 8, 'bandpass'), 0.1, 2700); break;
      case 'scrape': hold.scrape = now() + 1.0; setLoop2('scrape', 'scrape', () => loopNoise(700, 1, 'lowpass'), 0.25, 1000); break;
    }
  }
  function setLoop2(name, channel, make, level, freq) {         // som setLoop, men uten hold, og stenges av etter hold-tiden
    const l = loops[name] || (loops[name] = use(channel, make)), t = now();
    l.g.gain.setTargetAtTime(level, t, 0.04); l.f.frequency.setTargetAtTime(freq, t, 0.05);
    l.g.gain.setTargetAtTime(0, hold[name], 0.08);
  }

  // ---- styring -------------------------------------------------------------
  const apply = () => master.gain.setTargetAtTime(muted ? 0 : volume, now(), 0.03);
  return {
    ctx, step, land, breath, tick, bump, windup, jump, grab, mantle, reach, fall, skid, scrape, quietLoops,
    pickup, drop, shatter, crush, splash, checkpoint, win, drip, hum,
    setLevel, setLevels, preview, getLevels: () => ({ ...levels }), sounds: SOUND_LIST,
    resume: () => (ctx.state === 'suspended' && ctx.resume ? ctx.resume() : Promise.resolve()),
    setVolume: (v) => { volume = clamp(v, 0, 1); apply(); },
    setMuted: (m) => { muted = !!m; apply(); },
    setReverb: (v) => { wet.gain.value = v; },
    get effort() { return effort; },
    surfaces: Object.keys(STEP),
  };
}
