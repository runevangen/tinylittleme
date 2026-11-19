// R94: ytelse del 2. Ren logikk (uten three-import, tar objekter som argument, så den testes i node: test_perf2.mjs).
//  1. Teksturer: tak på kantlengde (floorSide, capSide) og teller som regner delte GPU-teksturer én gang (se perf_budget.memStats).
//  2. Skygger: kasterutvalg (nærhet + størrelse) og tempo (hvert 2.–4. bilde når alt står stille).
//  3. Maur: oppdelingskutt (antSeg) etter samme prinsipp som figuren (herodetail).
//  4. Oppstart: forvarmingen deles i små steg (planWarm) som kjøres ett per bilde, slik at ingen bilder blir lange.

// ---------- 1. teksturer ----------
export const TEX_MAX = { def: 512, options: [512, 1024] };   // kantlengde-tak for store flater (gulv): 512 holder på mobil; 1024 = tidligere
export const capSide = (side, max = TEX_MAX.def) => (side > max ? max : side);
// Antall MB (RGBA8 + mipmap-kjede) for en tekstur av gitt størrelse
export const texMB = (w, h, mips = true) => (w * h * 4 * (mips ? 4 / 3 : 1)) / 1048576;

// ---------- 3. maur ----------
export const ANT_Q = { def: 0.6, min: 0.3 };
export const antQ = (q) => Math.max(ANT_Q.min, Math.min(1, +q || ANT_Q.def));
// segmenttall etter detaljnivå q (1 = full): samme formel som figuren (hero.js sg)
export const antSeg = (n, lo, q = 1) => (q >= 1 ? n : Math.max(lo, Math.round(n * q)));

// ---------- 2. skygger ----------
export const SHADOW = { radius: 17, minSize: 0.12, every: 3, settle: 8 };   // radius: enheter fra figuren; minSize: minste diameter på en kaster; every: tempo når alt står stille; settle: antall bilder stille før tempoet senkes

// Verdenssfære for et mesh (senter + radius), regnet fra matrixWorld og geometriens avgrensningskule
export function sphereOf(mesh, out = { x: 0, y: 0, z: 0, r: 0 }) {
  const g = mesh.geometry; if (!g) return null;
  if (!g.boundingSphere && g.computeBoundingSphere) g.computeBoundingSphere();
  const bs = g.boundingSphere; if (!bs) return null;
  const e = mesh.matrixWorld.elements, c = bs.center;
  out.x = e[0] * c.x + e[4] * c.y + e[8] * c.z + e[12]; out.y = e[1] * c.x + e[5] * c.y + e[9] * c.z + e[13]; out.z = e[2] * c.x + e[6] * c.y + e[10] * c.z + e[14];
  const sx = Math.hypot(e[0], e[1], e[2]), sy = Math.hypot(e[4], e[5], e[6]), sz = Math.hypot(e[8], e[9], e[10]);
  out.r = bs.radius * Math.max(sx, sy, sz); return out;
}
// Skal en kaster tegnes i skyggepasset? Innenfor radius (kanten av kulen teller) og stor nok til å synes.
export const wantsShadow = (s, focus, radius = SHADOW.radius, minSize = SHADOW.minSize) => !!s && s.r * 2 >= minSize && Math.hypot(s.x - focus.x, s.y - focus.y, s.z - focus.z) - s.r <= radius;

// Skyggekasterne i scenen: hvert mesh som kaster skygge huskes (originalt valg), og castShadow slås av/på etter nærhet og størrelse.
// castShadow på meshen er ikke en del av shaderens nøkkel, så det kompilerer ingenting på nytt. keep(mesh) = alltid med (figuren, maur, ting som beveger seg).
export function createShadowCull({ radius = SHADOW.radius, minSize = SHADOW.minSize } = {}) {
  let list = [], on = true, stats = { total: 0, active: 0, culled: 0 };
  const tmp = { x: 0, y: 0, z: 0, r: 0 };
  return {
    get stats() { return stats; }, get on() { return on; },
    set radius(v) { radius = v; }, get radius() { return radius; },
    set minSize(v) { minSize = v; }, get minSize() { return minSize; },
    // samle meshes som kaster skygge nå (kalles etter at brettet er bygd og sammenslått)
    collect(root, keep = () => false) { list = []; root.traverse((o) => { if (o.isMesh && o.castShadow) list.push({ o, keep: !!keep(o), was: true }); }); stats = { total: list.length, active: list.length, culled: 0 }; return list.length; },
    setOn(v) { on = !!v; if (!on) for (const e of list) e.o.castShadow = e.was; },
    // oppdater utvalget rundt fokus (figuren). Returnerer true hvis noe endret seg (skyggekartet må tegnes på nytt).
    update(focus) {
      if (!on) return false;
      let changed = false, act = 0;
      for (const e of list) {
        let want = true;
        if (!e.keep) { e.o.updateWorldMatrix(true, false); want = wantsShadow(sphereOf(e.o, tmp), focus, radius, minSize); }
        if (e.o.castShadow !== want) { e.o.castShadow = want; changed = true; }
        if (want) act++;
      }
      stats = { total: list.length, active: act, culled: list.length - act }; return changed;
    },
  };
}

// Tempo for skyggekartet: hvert bilde når noe beveger seg, hvert `every`. bilde når kameraet, figuren og lyset har stått stille i `settle` bilder.
// step(moved) → true hvis kartet skal tegnes i dette bildet. force() gir en tegning i neste bilde (kart byttet, lav profil, kasterutvalg endret).
export function createShadowPacer({ every = SHADOW.every, settle = SHADOW.settle } = {}) {
  let still = 0, since = 0, forced = true, drawn = 0, skipped = 0;
  return {
    get every() { return every; }, set every(v) { every = Math.max(1, Math.min(4, v | 0 || 1)); },
    get drawn() { return drawn; }, get skipped() { return skipped; },
    force() { forced = true; },
    step(moved) {
      if (moved) { still = 0; since = 0; } else still++;
      let draw = forced || every <= 1 || still < settle;
      if (!draw && ++since >= every) draw = true;
      if (draw) { forced = false; since = 0; drawn++; } else skipped++;
      return draw;
    },
  };
}

// Har noe beveget seg? (posisjon/kamera sammenlignes med forrige bilde)
export const movedBy = (a, b, eps = 1e-3) => !a || !b || a.some((v, i) => Math.abs(v - b[i]) > eps);

// ---------- 4. oppstart ----------
// Deler meshes i biter for prøvetegning: meshes med samme shaderprogram (key) holdes sammen, og hver bit har høyst `maxKeys` ulike programmer (første tegning med et program kompilerer det, og det er det dyre) og `maxItems` meshes.
// keys: én nøkkel per mesh (samme nøkkel = samme program). Returnerer en liste med lister av mesh-indekser.
export function chunkByKey(keys, { maxKeys = 3, maxItems = 70 } = {}) {
  const groups = new Map(); keys.forEach((k, i) => { if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i); });
  const out = []; let cur = [], curKeys = 0;
  const flush = () => { if (cur.length) out.push(cur); cur = []; curKeys = 0; };
  for (const list of groups.values()) {
    if (curKeys >= maxKeys) flush();
    curKeys++;
    for (const i of list) { if (cur.length >= maxItems) { flush(); curKeys = 1; } cur.push(i); }
  }
  flush(); return out;
}
// Planlegger forvarmingen som en liste med små steg. Hvert steg kjøres i sitt eget bilde (eller i ledig tid).
// textures: antall teksturer, per: teksturer per steg; chunks: biter av mesh-indekser (se chunkByKey) eller meshes + chunk for jevne biter.
export function planWarm({ textures = 0, per = 3, meshes = 0, chunk = 60, chunks = null, fades = true } = {}) {
  const steps = [];
  for (let i = 0; i < textures; i += per) steps.push({ kind: 'tex', from: i, to: Math.min(textures, i + per) });
  if (chunks) chunks.forEach((idx) => steps.push({ kind: 'draw', idx }));
  else for (let i = 0; i < meshes; i += chunk) steps.push({ kind: 'draw', from: i, to: Math.min(meshes, i + chunk) });
  if (fades) steps.push({ kind: 'fades' });
  steps.push({ kind: 'done' });
  return steps;
}
// Kjører stegene ett om gangen: `next(fn)` bestemmer når (requestIdleCallback eller setTimeout/rAF). Logger tid per steg og verste steg.
export function runSteps(steps, run, next, done, now = () => Date.now()) {
  let i = 0, worst = 0, worstKind = '', total = 0;
  const go = () => {
    if (i >= steps.length) { done({ total, worst, worstKind, steps: steps.length }); return; }
    const s = steps[i++], t0 = now();
    try { run(s); } catch (e) { done({ total, worst, worstKind, steps: steps.length, error: String(e && e.message || e) }); return; }
    const dt = now() - t0; total += dt; if (dt > worst) { worst = dt; worstKind = s.kind; }
    next(go);
  };
  next(go);
}
