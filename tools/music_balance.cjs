// Måler musikkbalansen uten ører: rendrer musikk (calm/tense) og effekter offline gjennom samme kjede og skriver RMS i dBFS.
// Bruk: python3 -m http.server 8318 &  node tools/music_balance.cjs http://localhost:8318
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:8318';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const pg = await b.newPage(); await pg.goto(base + '/package.json');
  const res = await pg.evaluate(async () => {
    const { createAudio } = await import('./audio.js'); const { createMusic, THEMES } = await import('./music.js');
    const SR = 22050, db = (x) => +(20 * Math.log10(Math.max(x, 1e-9))).toFixed(1);
    const rms = (d, a, z) => { let s = 0; for (let i = a; i < z; i++) s += d[i] * d[i]; return Math.sqrt(s / Math.max(1, z - a)); };
    const run = async (secs, fn) => {
      const real = new OfflineAudioContext(1, SR * secs, SR), au = createAudio(real, { volume: 0.7, reverb: 0.12 });
      let fake = 0; const ctx = new Proxy(real, { get: (t, p) => p === 'currentTime' ? fake : p === 'state' ? 'running' : typeof t[p] === 'function' ? t[p].bind(t) : t[p] });   // egen klokke, så pumpen kan planlegge hele forløpet på forhånd
      let m = null; fn(au, ctx, (o) => { m = createMusic(ctx, au.out, o); m.start(); return m; });
      if (m) { for (fake = 0; fake < secs; fake += 0.1) m.pump(); m.stop(); }
      const buf = await real.startRendering(); return buf.getChannelData(0);
    };
    const out = {};
    for (const mood of ['calm', 'tense']) {
      const d = await run(8, (au, ctx, mk) => { const m = mk({ theme: THEMES.barnerom, volume: 0.2, on: true }); m.setMood(mood); });
      out['musikk ' + mood] = db(rms(d, SR * 2, SR * 8));
    }
    const fx = { skritt: (a) => { a.step('soft', 0.6, 0); }, landing: (a) => a.land('tile', 9), pust: (a) => a.breath('out', 0.7, 0.6) };
    for (const [k, f] of Object.entries(fx)) { const d = await run(2, (au) => f(au)); let pk = 0; for (const v of d) pk = Math.max(pk, Math.abs(v)); out['effekt ' + k + ' (topp-RMS 0,25 s)'] = db(Math.max(...Array.from({ length: 6 }, (_, i) => rms(d, Math.floor(i * SR / 4), Math.floor((i + 1) * SR / 4))))); }
    return out;
  });
  console.log(JSON.stringify(res, null, 1)); await b.close();
})();
