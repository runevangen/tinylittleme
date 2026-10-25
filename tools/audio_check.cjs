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
      const a = createAudio(ctx, { volume: 1, reverb: 0.1 });
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
      const ctx = new OfflineAudioContext(1, Math.floor(SR * (secs + 1)), SR); const a = createAudio(ctx, { volume: 1 });
      for (let t = 0; t < secs; t += 1 / 60) a.tick(1 / 60, { active: true, speed01, climbing: false });
      const d = (await ctx.startRendering()).getChannelData(0); return { ...stats(d, 0, d.length), effort: +a.effort.toFixed(2) };
    };
    out.breathing_rest_8s = await breathRun(0, 8);
    out.breathing_run_8s = await breathRun(1, 8);
    return out;
  });
  let fail = 0;
  const ok = (cond, msg) => { if (!cond) { fail++; console.log('  FEIL:', msg); } };
  for (const [k, v] of Object.entries(res)) console.log(k.padEnd(20), JSON.stringify(v));
  for (const [k, v] of Object.entries(res)) { ok(!v.nan, k + ' har NaN'); ok(v.peak <= 1.0001, k + ' klipper'); ok(v.peak > 0.001 || k === 'fall_slow', k + ' er stille'); }
  ok(res.step_tile.centroid > res.step_wood.centroid, 'flis skal låte lysere enn tre');
  ok(res.step_wood.centroid > res.step_soft.centroid, 'tre skal låte lysere enn tekstil');
  ok(res.land_hard.rms > res.land_soft.rms * 1.5, 'hard landing skal være tydelig sterkere');
  ok(res.breath_hard.rms > res.breath_idle.rms * 2, 'anstrengt pust skal være sterkere enn rolig');
  ok(res.fall_fast.rms > 0.02 && res.fall_slow.rms < 0.001, 'fallvind: stille ved lav fart, tydelig ved høy');
  ok(res.breathing_run_8s.rms > res.breathing_rest_8s.rms * 2, 'pust etter løping skal høres mer enn i ro');
  ok(res.breathing_run_8s.effort > 0.5 && res.breathing_rest_8s.effort < 0.05, 'anstrengelsesmodellen');
  ok(errs.length === 0, 'sidefeil: ' + errs.join(' | '));
  console.log(fail ? `\n${fail} kontroll(er) feilet` : '\nalle lydkontroller OK');
  await b.close(); process.exit(fail ? 1 : 0);
})();
