// R124: «Runde 2» av Hyllebroen (`bro2`) og Kjøkkenbroen (`kjokkenbro2`). Ren logikk (ingen DOM, ingen three.js, kjøres i node: test_round2.mjs).
// Brettene lages av tools/make_round2.mjs (scenes/*2.scene.json → levels/*2.level.json); dagens brett (bro, kjokkenbro) er uendret. Her ligger dataene som begge ender bruker:
//  - gap, oppdrag (laster, tung vekt, budsjett), stjerner og kjente løsninger (ref = fagverk i stål, best = billigere fagverk) for hvert brett
//  - tre alene holder ikke (alle staver i tre gir etter), en rett rad av staver gir etter, bare fagverk med stål bærer bil, robot og figur etter hverandre
//  - listen over brett i ⚙ → Brett følger valget `buildround2` (Runde 2 på/av)
export const ROUND2_IDS = ['bro2', 'kjokkenbro2'];
export const isRound2 = (levelId) => ROUND2_IDS.includes(levelId);

// Et fagverk som spenner over gapet (half = halvt gap i byggeenheter, rutenett-trinn 2): nedre rad (veien) på v = 0, øvre rad på v = h, stolper, og diagonaler som peker mot midten.
// Format som grid_play.applySpec: indeks 0 og 1 er ankrene, 2.. er nodene i `nodes` (nedre rad først, så øvre rad).
// m = { b: nedre rad, t: øvre rad, v: stolper, d: diagonaler } (materialer 'wood' | 'steel' | 'rope')
export function trussSpec(half, m = {}, h = 2) {
  const mb = m.b || 'steel', mt = m.t || mb, mv = m.v || mb, md = m.d || mb, xs = [];
  for (let u = -half + 2; u <= half - 2; u += 2) xs.push(u);
  const n = xs.length, B = (i) => 2 + i, T = (i) => 2 + n + i, nodes = [...xs.map((u) => [u, 0]), ...xs.map((u) => [u, h])], rods = [];
  rods.push([0, B(0), mb]); for (let i = 0; i < n - 1; i++) rods.push([B(i), B(i + 1), mb]); rods.push([B(n - 1), 1, mb]);
  for (let i = 0; i < n - 1; i++) rods.push([T(i), T(i + 1), mt]);
  rods.push([0, T(0), md], [1, T(n - 1), md]);
  for (let i = 0; i < n; i++) rods.push([B(i), T(i), mv]);
  for (let i = 0; i < n - 1; i++) rods.push(i < (n - 1) / 2 ? [B(i), T(i + 1), md] : [T(i), B(i + 1), md]);
  return { nodes, rods };
}
// en rett rad av staver mellom ankrene (ingen trekanter)
export function rowSpecOf(half, mat = 'steel') {
  const n = half - 1, nodes = [], rods = [];
  for (let i = 1; i <= n; i++) nodes.push([-half + 2 * i, 0]);
  for (let i = 0; i <= n; i++) rods.push([i === 0 ? 0 : i + 1, i === n ? 1 : i + 2, mat]);
  return { nodes, rods };
}
// samme bygg med alle staver i ett materiale
export const allIn = (spec, mat) => ({ nodes: spec.nodes, rods: spec.rods.map(([a, b]) => [a, b, mat]) });

export const R2 = {
  bro2: {
    level: 'bro2', site: 'hylle2', base: 'bro', half: 6, gap: 12,
    stage: { loads: ['car', 'robot', 'figure'], massK: 18, budget: 80 },
    stars: { three: { cost: 40, parts: 12 }, two: { cost: 76, parts: 21 } },
    ref: trussSpec(6, { b: 'steel' }),
    best: { nodes: [[-4, 0], [-2, 0], [0, 0], [2, 0], [4, 0], [-4, 2], [-2, 2], [0, 2], [2, 2], [4, 2]], rods: [[0, 2, 'steel'], [2, 3, 'steel'], [3, 4, 'steel'], [4, 5, 'steel'], [5, 6, 'steel'], [6, 1, 'steel'], [10, 11, 'steel'], [1, 11, 'steel'], [5, 10, 'steel'], [6, 11, 'wood'], [10, 6, 'steel']] },
  },
  kjokkenbro2: {
    level: 'kjokkenbro2', site: 'kjk2', base: 'kjokkenbro', half: 8, gap: 16,
    stage: { loads: ['robot', 'car', 'figure'], massK: 11, budget: 110 },
    stars: { three: { cost: 50, parts: 17 }, two: { cost: 104, parts: 29 } },
    ref: trussSpec(8, { b: 'steel' }),
    best: { nodes: [[-6, 0], [-4, 0], [-2, 0], [0, 0], [2, 0], [4, 0], [6, 0], [-6, 2], [-4, 2], [-2, 2], [0, 2], [2, 2], [4, 2], [6, 2]], rods: [[0, 2, 'steel'], [2, 3, 'steel'], [3, 4, 'steel'], [4, 5, 'steel'], [5, 6, 'steel'], [6, 7, 'steel'], [7, 8, 'steel'], [8, 1, 'steel'], [13, 14, 'steel'], [14, 15, 'steel'], [1, 15, 'steel'], [6, 13, 'wood'], [7, 14, 'wood'], [8, 15, 'wood'], [13, 7, 'steel'], [14, 8, 'wood']] },
  },
};

// brettlisten i ⚙ → Brett: Runde 2-brettene (`round2: true`) vises bare når valget er på
export const round2Levels = (levels, on = true) => (on ? levels : (levels || []).filter((l) => !l.round2));
