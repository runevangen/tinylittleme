// R50: replay av siste prøve i byggeskjermen. Ren logikk (ingen DOM, ingen three.js, kjøres i node).
// Mens en prøve går, lagres tilstanden etter hvert fysikksteg (posisjoner, spenning, brudd, lasten) i en tallrekke per steg. Replay og spøkelse spiller av disse
// rekkene: det simuleres ikke på nytt, og avspillingen er bit-for-bit lik originalen (se test_buildreplay.mjs). Hendelser (brudd, seier, tap) lagres med stegnummer.
export const MAX_FRAMES = 2100;   // lengste prøve er 30 s = 1800 steg; litt slingringsmonn
const one = (v) => (v ? 1 : 0);

// pose (fra createSim().pose()) -> flat Float64Array. Rekkefølgen følger skjelettet (deler og koblinger i fast rekkefølge).
export function encodeFrame(pose) {
  const a = [pose.figure.u, pose.figure.v, pose.figure.vx, pose.figure.vy, one(pose.figure.supported)];
  for (const p of pose.parts) {
    if (p.kind === 'rect') a.push(p.u, p.v, p.rot, p.stress || 0, one(p.broken));
    else { a.push(p.stress || 0, one(p.broken), p.segs.length); for (const s of p.segs) { a.push(s.length); for (const q of s) a.push(q.u, q.v); } }
  }
  for (const l of pose.links) a.push(one(l.broken), l.stress || 0, l.a.u, l.a.v, l.b.u, l.b.v);
  return Float64Array.from(a);
}
export const skeletonOf = (pose) => ({
  parts: pose.parts.map((p) => ({ id: p.id, type: p.type, kind: p.kind })),
  links: pose.links.map((l) => ({ id: l.id, kind: l.kind, len: l.len })),
  load: pose.figure.load, r: pose.figure.r,
});
// motsatt vei: gir en pose med samme felt som tegningen bruker (pts for deler utelates, de brukes ikke av tegningen)
export function decodeFrame(skel, f) {
  let k = 0; const nx = () => f[k++];
  const figure = { u: nx(), v: nx(), r: skel.r, vx: nx(), vy: nx(), supported: !!nx(), load: skel.load }; figure.roll = figure.u / skel.r;
  const parts = skel.parts.map((s) => {
    if (s.kind === 'rect') { const u = nx(), v = nx(), rot = nx(), stress = nx(), broken = !!nx(); return { id: s.id, type: s.type, kind: 'rect', u, v, rot, broken, stress }; }
    const stress = nx(), broken = !!nx(), n = nx(), segs = [];
    for (let i = 0; i < n; i++) { const m = nx(), seg = []; for (let j = 0; j < m; j++) seg.push({ u: nx(), v: nx() }); segs.push(seg); }
    return { id: s.id, type: s.type, kind: 'chain', segs, pts: segs.flat(), broken, stress };
  });
  const links = skel.links.map((s) => { const broken = !!nx(), stress = nx(), a = { u: nx(), v: nx() }, b = { u: nx(), v: nx() }; return { id: s.id, kind: s.kind, broken, stress, a, b, len: s.len }; });
  return { parts, figure, links };
}

// opptak: kall frame(sim, hendelser) én gang etter hvert steg (og én gang med steg 0 før første steg, uten hendelser).
export function createRecorder(sim, meta = {}) {
  const first = sim.pose(), rec = { skel: skeletonOf(first), frames: [encodeFrame(first)], events: [], meta, truncated: false, result: null };
  return {
    rec,
    frame(s, evs = []) {
      const i = rec.frames.length;
      for (const e of evs) rec.events.push({ i, ...e });
      if (i >= MAX_FRAMES) { rec.truncated = true; return false; }
      rec.frames.push(encodeFrame(s.pose())); return true;
    },
    finish(state) { rec.result = { state: state.state, reason: state.reason, steps: rec.frames.length - 1 }; return rec; },
  };
}

// avspilling (replay og spøkelse): peker på et steg. step() går ett steg fram og gir hendelsene som hører til det steget.
export function createReplay(rec) {
  let i = 0; const last = rec.frames.length - 1;
  return {
    get i() { return i; }, get last() { return last; }, get done() { return i >= last; },
    pose: () => decodeFrame(rec.skel, rec.frames[i]),
    step() { if (i >= last) return []; i++; return rec.events.filter((e) => e.i === i); },
    seek(n) { i = Math.max(0, Math.min(last, n | 0)); },
  };
}
// spøkelsets steg ved et gitt antall steg i den nye prøven (stopper på siste steg)
export const ghostPose = (rec, step) => decodeFrame(rec.skel, rec.frames[Math.max(0, Math.min(rec.frames.length - 1, step | 0))]);
export const recSeconds = (rec) => +(((rec?.frames?.length || 1) - 1) / 60).toFixed(1);
