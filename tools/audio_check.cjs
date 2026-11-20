// Kontrollerer lydmotoren uten ører: rendrer hver lyd offline og måler topp, RMS og spektral tyngdepunkt.
// Bruk (krever playwright og en lokal server, f.eks. python3 -m http.server 8766):
//   node tools/audio_check.cjs http://localhost:8766
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:8766';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const pg = await b.newPage();
  const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
  await pg.goto(base + '/index.html');
  const res = await pg.evaluate(async () => {
    const { createAudio } = await import('./audio.js');
    const SR = 44100;
    const fft = (re) => {                        // enkel radix-2 FFT, returnerer størrelser
      const n = re.length, im = new Float32Array(n), x = Float32Array.from(re);
      for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [x[i], x[j]] = [x[j], x[i]]; } }
      for (let len = 2; len <= n; len <<= 1) {
        const ang = -2 * Math.PI / len;
        for (let i = 0; i < n; i += len) for (let k = 0; k < len / 2; k++) {
          const wr = Math.cos(ang * k), wi = Math.sin(ang * k), ur = x[i + k], ui = im[i + k];
          const vr = x[i + k + len / 2] * wr - im[i + k + len / 2] * wi, vi = x[i + k + len / 2] * wi + im[i + k + len / 2] * wr;
          x[i + k] = ur + vr; im[i + k] = ui + vi; x[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        }
      }
      return Array.from({ length: n / 2 }, (_, i) => Math.hypot(x[i], im[i]));
    };
    const render = async (secs, fn) => {
      const ctx = new OfflineAudioContext(1, Math.floor(SR * secs), SR);
      const a = createAudio(ctx, { volume: 1, reverb: 0.1, breath: true });   // pust er av som standard (R38), så den slås på her
      fn(a);
      const buf = await ctx.startRendering();
      return buf.getChannelData(0);
    };
    const stats = (d, from = 0, to = d.length) => {
      let peak = 0, sum = 0, nan = false; const n = to - from;
      for (let i = from; i < to; i++) { const v = d[i]; if (!Number.isFinite(v)) nan = true; peak = Math.max(peak, Math.abs(v)); sum += v * v; }
      const N = 4096, seg = d.slice(from, Math.min(to, from + N)); const spec = fft(seg.length === N ? seg : Float32Array.from([...seg, ...new Float32Array(N - seg.length)]));
      let num = 0, den = 0; spec.forEach((m, i) => { num += m * (i * SR / N); den += m; });
      return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / n).toFixed(4), centroid: Math.round(num / (den || 1)), nan };
    };
    const out = {};
    for (const kind of ['wood', 'tile', 'soft', 'paper', 'plastic', 'metal', 'glass', 'wicker']) {
      const d = await render(0.6, (a) => a.step(kind, 0.8, 0)); out['step_' + kind] = stats(d, 0, SR * 0.3);
    }
    out.land_soft = stats(await render(1.2, (a) => a.land('wood', 6)), 0, SR * 0.6);
    out.land_hard = stats(await render(1.2, (a) => a.land('wood', 25)), 0, SR * 0.6);
    out.breath_idle = stats(await render(2, (a) => a.breath('out', 0.1, 0.5)), 0, SR * 1);
    out.breath_hard = stats(await render(2, (a) => a.breath('out', 1, 0.5)), 0, SR * 1);
    out.windup = stats(await render(0.6, (a) => a.windup()), 0, SR * 0.4);
    out.jump = stats(await render(0.6, (a) => a.jump()), 0, SR * 0.4);
    out.mantle = stats(await render(1.6, (a) => a.mantle()), 0, SR * 1.2);
    out.grab = stats(await render(0.6, (a) => a.grab()), 0, SR * 0.4);
    out.shatter = stats(await render(1.2, (a) => a.shatter()), 0, SR * 0.8);
    out.crush = stats(await render(1.2, (a) => a.crush()), 0, SR * 0.8);
    out.splash_flush = stats(await render(2, (a) => a.splash('flush')), 0, SR * 1.5);
    out.fall_fast = stats(await render(1.5, (a) => a.fall(22)), SR * 0.8, SR * 1.5);
    out.fall_slow = stats(await render(1.5, (a) => a.fall(4)), SR * 0.8, SR * 1.5);
    out.skid = stats(await render(1.5, (a) => a.skid(1)), SR * 0.8, SR * 1.5);
    out.scrape = stats(await render(1.5, (a) => a.scrape(1)), SR * 0.8, SR * 1.5);
    // pustemodell: i ro vs. etter løping – teller åndedrag og måler styrke
    const breathRun = async (speed01, secs) => {
      const ctx = new OfflineAudioContext(1, Math.floor(SR * (secs + 1)), SR); const a = createAudio(ctx, { volume: 1, breath: true });
      for (let t = 0; t < secs; t += 1 / 60) a.tick(1 / 60, { active: true, speed01, climbing: false });
      const d = (await ctx.startRendering()).getChannelData(0); return { ...stats(d, 0, d.length), effort: +a.effort.toFixed(2) };
    };
    out.breathing_rest_8s = await breathRun(0, 8);
    out.breathing_run_8s = await breathRun(1, 8);
    // R99: bygglyder, romtoner og variasjon
    const FX = await import('./audio_fx.js');
    out.b_place_wood = stats(await render(0.6, (a) => a.bplace('plank_s')), 0, SR * 0.3);
    out.b_place_steel = stats(await render(0.8, (a) => a.bplace('rod:steel')), 0, SR * 0.5);
    out.b_place_rope = stats(await render(0.6, (a) => a.bplace('rod:rope')), 0, SR * 0.3);
    out.b_place_block = stats(await render(0.6, (a) => a.bplace('block')), 0, SR * 0.3);
    for (const k of ['tape', 'hinge', 'rope', 'band']) out['b_attach_' + k] = stats(await render(0.6, (a) => a.battach(k)), 0, SR * 0.3);
    out.b_knot = stats(await render(0.6, (a) => a.bknot()), 0, SR * 0.3);
    out.b_rod_wood = stats(await render(0.6, (a) => a.brod('wood')), 0, SR * 0.3);
    out.b_rod_steel = stats(await render(0.8, (a) => a.brod('steel')), 0, SR * 0.5);
    out.b_pop = stats(await render(0.5, (a) => a.bpop()), 0, SR * 0.25);
    out.b_start = stats(await render(0.7, (a) => a.bstart()), 0, SR * 0.4);
    out.b_arrive = stats(await render(0.8, (a) => a.barrive()), 0, SR * 0.5);
    out.b_stars1 = stats(await render(1.5, (a) => a.bstars(1)), 0, SR * 1.2);
    out.b_stars3 = stats(await render(1.8, (a) => a.bstars(3)), 0, SR * 1.5);
    out.b_creak_low = stats(await render(0.8, (a) => a.bcreak(0.2)), 0, SR * 0.5);
    out.b_creak_high = stats(await render(0.8, (a) => a.bcreak(1.3)), 0, SR * 0.5);
    out.b_break = stats(await render(0.8, (a) => a.bbreak()), 0, SR * 0.5);
    out.ev_clock = stats(await render(0.4, (a) => a.clockTick(false)), 0, SR * 0.2);
    out.ev_plink = stats(await render(1.2, (a) => a.plink()), 0, SR * 0.9);
    out.ev_knock = stats(await render(0.5, (a) => a.knock()), 0, SR * 0.3);
    out.ev_gust = stats(await render(3, (a) => a.gust()), 0, SR * 2.5);
    out.ev_drip = stats(await render(0.5, (a) => a.drip(0)), 0, SR * 0.3);
    out.room = {};
    for (const id of ['bad', 'kjokken', 'barnerom', 'stue', 'verksted', 'leke', 'soverom', 'bygglab']) {
      const loops = FX.createAmbience(FX.ambienceFor(id, null)).loops;
      out.room[id] = stats(await render(2.5, (a) => a.amb(loops, true)), SR * 1.2, SR * 2.5);
    }
    out.room_off = stats(await render(1.5, (a) => a.amb(FX.createAmbience(FX.ambienceFor('stue', null)).loops, false)), SR * 0.5, SR * 1.5);
    // variasjon: skritt etter hverandre i én lyd-kontekst (nye varianter hver gang, aldri to like på rad)
    const seq = async (n, gap, fn, fnVar) => {
      const ctx = new OfflineAudioContext(1, Math.floor(SR * (n + 1) * gap + SR * 0.3), SR);   // første gap er oppvarming: en frisk offline-kontekst gir første lyd ved t=0 ca. 3x svakere enn senere
      const a = createAudio(ctx, { volume: 1, reverb: 0 }); const vars = [];   // uten etterklang, ellers bygger halen seg opp mellom skrittene
      for (let i = 0; i < n; i++) ctx.suspend((i + 1) * gap + 0.001).then(() => { fn(a, i); vars.push(fnVar(a)); ctx.resume(); });
      const d = (await ctx.startRendering()).getChannelData(0);
      const segs = []; for (let i = 0; i < n; i++) segs.push(stats(d, Math.floor(SR * ((i + 1) * gap)), Math.floor(SR * ((i + 1) * gap + gap * 0.9))));
      return { segs, vars };
    };
    const sq = await seq(14, 0.3, (a, i) => a.step('wood', 0.8, i % 2 ? 1 : -1), (a) => { const v = a.lastVar.step; return { idx: v.idx, pitch: v.pitch, gain: v.gain }; });
    out.var_steps = { vars: sq.vars, segs: sq.segs };
    const sl = await seq(10, 0.5, (a) => a.land('wood', 14), (a) => { const v = a.lastVar.land; return { idx: v.idx, pitch: v.pitch, gain: v.gain }; });
    out.var_lands = { vars: sl.vars, segs: sl.segs };
    // mikser: hver lyd kan forhåndsspilles, er stille ved 0 og tydelig sterkere ved 2
    const { SOUND_LIST } = await import('./audio.js');
    out.mixer = {};
    for (const { id } of SOUND_LIST) {
      const run = async (lv) => {
        const ctx = new OfflineAudioContext(1, Math.floor(SR * 1.8), SR); const a = createAudio(ctx, { volume: 1, levels: lv === null ? {} : { [id]: lv } });
        a.preview(id); const d = (await ctx.startRendering()).getChannelData(0); return stats(d, 0, d.length);
      };
      const base = await run(null), off = await run(0), loud = await run(2);
      out.mixer[id] = { base: base.rms, off: off.rms, x2: loud.rms, nan: base.nan || off.nan || loud.nan, peak: Math.max(base.peak, loud.peak) };
    }
    return out;
  });
  let fail = 0;
  const ok = (cond, msg) => { if (!cond) { fail++; console.log('  FEIL:', msg); } };
  for (const [k, v] of Object.entries(res)) if (!['mixer', 'room', 'var_steps', 'var_lands'].includes(k)) console.log(k.padEnd(20), JSON.stringify(v));
  const mx = res.mixer; delete res.mixer; const room = res.room; delete res.room; const vs = res.var_steps, vl = res.var_lands; delete res.var_steps; delete res.var_lands;
  for (const [k, v] of Object.entries(res)) { ok(!v.nan, k + ' har NaN'); ok(v.peak <= 1.0001, k + ' klipper'); ok(v.peak > 0.001 || ['fall_slow', 'room_off', 'breathing_rest_8s'].includes(k), k + ' er stille'); }
  ok(res.step_tile.centroid > res.step_wood.centroid, 'flis skal låte lysere enn tre');
  ok(res.step_wood.centroid > res.step_soft.centroid, 'tre skal låte lysere enn tekstil');
  ok(res.land_hard.rms > res.land_soft.rms * 1.5, 'hard landing skal være tydelig sterkere');
  ok(res.breath_hard.rms > res.breath_idle.rms * 2, 'anstrengt pust skal være sterkere enn rolig');
  ok(res.fall_fast.rms > 0.02 && res.fall_slow.rms < 0.001, 'fallvind: stille ved lav fart, tydelig ved høy');
  ok(res.breathing_run_8s.rms > res.breathing_rest_8s.rms * 2, 'pust etter løping skal høres mer enn i ro');
  ok(res.breathing_run_8s.effort > 0.5 && res.breathing_rest_8s.effort < 0.05, 'anstrengelsesmodellen');
  // R99: bygglyder: hørbare, ikke klipp, ikke tyngre enn hard landing; stål lysere enn tre; knirk vokser med belastning
  for (const k of Object.keys(res).filter((x) => x.startsWith('b_'))) { ok(res[k].rms > (k === 'b_creak_low' ? 0.002 : 0.004), `${k} er for svak (${res[k].rms})`); ok(res[k].peak < 0.95, `${k} nærmer seg klipping (${res[k].peak})`); ok(res[k].rms < res.land_hard.rms * 1.5, `${k} er for sterk mot hard landing`); }
  ok(res.b_place_steel.centroid > res.b_place_wood.centroid * 1.5, 'stål skal låte lysere enn tre');
  ok(res.b_rod_steel.centroid > res.b_rod_wood.centroid * 1.5, 'stav i stål (ping) skal være lysere enn tre (dunk)');
  ok(res.b_creak_high.rms > res.b_creak_low.rms * 1.2, 'knirk skal vokse med belastning');
  ok(res.b_stars3.rms > res.b_stars1.rms * 0.8, 'tre stjerner skal ikke låte svakere enn én');
  // R99: romtoner og enkelthendelser skal ligge under skritt (rms og topp), og være av når de skrus av
  const stepRms = res.step_wood.rms, stepPeak = res.step_wood.peak;
  for (const [id, r] of Object.entries(room)) { console.log('romtone ' + id, JSON.stringify(r)); ok(!r.nan && r.peak <= 1, `romtone ${id}: NaN/klipp`); ok(r.rms > 0.0003, `romtone ${id} er stille (${r.rms})`); ok(r.rms < stepRms * 0.3, `romtone ${id} er ikke tydelig under skritt (${r.rms} mot ${stepRms})`); }
  ok(new Set(Object.values(room).map((r) => r.centroid)).size >= 5, 'romtonene skal ha ulik klang');
  ok(res.room_off.rms < 0.0003, 'romtone skal være av når den skrus av');
  for (const k of ['ev_clock', 'ev_plink', 'ev_knock', 'ev_gust', 'ev_drip']) { ok(res[k].peak < stepPeak * 0.6, `${k} skal ligge under skritt (${res[k].peak} mot ${stepPeak})`); ok(res[k].peak > 0.003, `${k} er for svak`); }
  // R99: variasjon: aldri samme variant to ganger på rad, ingen klipp, ingen for svake
  for (const [name, v] of [['skritt', vs], ['landing', vl]]) {
    let same = 0; for (let i = 1; i < v.vars.length; i++) if (v.vars[i].idx === v.vars[i - 1].idx) same++;
    ok(same === 0, `${name}: samme variant to ganger på rad (${same})`);
    ok(new Set(v.vars.map((x) => x.pitch.toFixed(3))).size >= 4, `${name}: for lite variasjon`);
    ok(v.vars.every((x) => Math.abs(x.pitch - 1) <= 0.0601 && Math.abs(x.gain - 1) <= 0.0601), `${name}: variasjon utenfor ±6 %`);
    const rs = v.segs.map((x) => x.rms), med = rs.slice().sort((a, b) => a - b)[rs.length >> 1];
    ok(v.segs.every((x) => !x.nan && x.peak <= 1.0001), `${name}: NaN/klipp`);
    ok(rs.every((x) => x > med * 0.4 && x < med * 2.5), `${name}: en variant er for svak/sterk (${rs.map((x) => x.toFixed(3)).join(' ')})`);
    let identical = 0; for (let i = 1; i < v.segs.length; i++) if (v.segs[i].rms === v.segs[i - 1].rms && v.segs[i].centroid === v.segs[i - 1].centroid) identical++;
    ok(identical === 0, `${name}: to påfølgende er identiske`);
  }
  console.log('variasjon: skritt-pitch ' + vs.vars.map((x) => x.pitch.toFixed(3)).join(' '));
  for (const [id, m] of Object.entries(mx)) {
    ok(!m.nan && m.peak <= 1.0001, `mikser ${id}: NaN/klipping`);
    ok(m.base > 0.0003, `mikser ${id}: forhåndsvisning er stille (${m.base})`);
    ok(m.off < m.base * 0.02 + 1e-6, `mikser ${id}: 0 skal gi stille (${m.off} vs ${m.base})`);
    ok(m.x2 > m.base * 1.4, `mikser ${id}: 200 % skal være tydelig sterkere (${m.x2} vs ${m.base})`);
  }
  console.log('mikser: ' + Object.keys(mx).length + ' lyder kontrollert');
  ok(errs.length === 0, 'sidefeil: ' + errs.join(' | '));
  console.log(fail ? `\n${fail} kontroll(er) feilet` : '\nalle lydkontroller OK');
  await b.close(); process.exit(fail ? 1 : 0);
})();
