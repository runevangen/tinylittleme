// Renderer musikken per rom og stemning til WAV (OfflineAudioContext), så den kan lyttes til på en ekte enhet.
// Bruk: python3 -m http.server 8318 &  node tools/music_wav.cjs http://localhost:8318 docs/r5
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const base = process.argv[2] || 'http://localhost:8318', outDir = process.argv[3] || 'docs/r5';
(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const pg = await b.newPage(); await pg.goto(base + '/package.json');
  const res = await pg.evaluate(async () => {
    const { createAudio } = await import('./audio.js'); const { createMusic, THEMES } = await import('./music.js');
    const SR = 22050, secs = 16, out = {};
    for (const room of ['bad', 'barnerom', 'kjokken']) for (const mood of ['calm', 'tense', 'win']) {
      const real = new OfflineAudioContext(1, SR * secs, SR), au = createAudio(real, { volume: 0.7, reverb: 0.12 });
      let fake = 0; const ctx = new Proxy(real, { get: (t, p) => p === 'currentTime' ? fake : p === 'state' ? 'running' : typeof t[p] === 'function' ? t[p].bind(t) : t[p] });
      const m = createMusic(ctx, au.out, { theme: THEMES[room], on: true }); m.setMood(mood); m.start();
      for (fake = 0; fake < secs; fake += 0.1) m.pump(); m.stop();
      const d = (await real.startRendering()).getChannelData(0), i16 = new Int16Array(d.length);
      for (let i = 0; i < d.length; i++) i16[i] = Math.max(-1, Math.min(1, d[i])) * 32767;
      let s = ''; const u8 = new Uint8Array(i16.buffer); for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
      out[`${room}_${mood}`] = btoa(s);
    }
    return { SR, out };
  });
  for (const [k, v] of Object.entries(res.out)) {
    const pcm = Buffer.from(v, 'base64'), h = Buffer.alloc(44);
    h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
    h.writeUInt32LE(res.SR, 24); h.writeUInt32LE(res.SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
    fs.writeFileSync(path.join(outDir, k + '.wav'), Buffer.concat([h, pcm])); console.log(k, pcm.length);
  }
  await b.close();
})();
