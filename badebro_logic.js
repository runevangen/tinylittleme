// R119: «Bygg 5: Broen over badekaret». Ren logikk (ingen DOM, ingen three.js, kjøres i node: test_badebro.mjs).
// Brettet (`levels/badebro.level.json`, laget av `scenes/badebro.scene.json`) har ett byggested med gap så bredt og last så tung (`site.grid.stage`) at en rett rad av staver
// og en firkant uten diagonal gir etter; bare en bro av trekanter (fagverk) bærer lasten. Her ligger det som hører til lærestoffet:
//  - firkant uten diagonal i et bygg (hint i byggeskjermen: «En firkant gir etter. Legg inn en diagonal, så blir den stiv.»), felles for alle rutenett-steder (broene og Byggeskolen)
//  - kortet «Prøv Byggeskolen · Fagverk først» første gang brettet åpnes uten at Byggeskole-stedet Fagverk er bestått
export const BADEBRO = {
  levelId: 'badebro',
  siteId: 'bad1',
  schoolSite: 'lab4',        // Byggeskolen, sted 4: Fagverk (lab.key = fagverk)
  schoolKey: 'fagverk',
};

// ---------- firkant uten diagonal ----------
// G = B.rg ({ nodes, rods }). En firkant er fire ulike knuter a-b-c-d der stavene ab, bc, cd og da finnes, men verken ac eller bd. Er en av dem på plass, er firkanten stivet av to trekanter.
export function openSquares(G) {
  if (!G || !Array.isArray(G.rods) || !Array.isArray(G.nodes)) return [];
  const adj = new Map(); const add = (a, b) => { (adj.get(a) || adj.set(a, new Set()).get(a)).add(b); };
  for (const r of G.rods) if (r && r.a !== r.b) { add(r.a, r.b); add(r.b, r.a); }
  const has = (a, b) => !!adj.get(a)?.has(b), ids = [...adj.keys()].sort(), out = [], seen = new Set();
  for (const a of ids) for (const b of adj.get(a)) for (const d of adj.get(a)) {
    if (b === d) continue;
    for (const c of adj.get(b)) {
      if (c === a || c === d || !has(c, d)) continue;
      if (has(a, c) || has(b, d)) continue;   // en diagonal: ikke en åpen firkant
      const key = [a, b, c, d].sort().join('|'); if (seen.has(key)) continue; seen.add(key); out.push([a, b, c, d]);
    }
  }
  return out;
}
export const hasOpenSquare = (G) => openSquares(G).length > 0;
// hintet vises bare i rutenett-modus, når valget er på, og når bygget har en åpen firkant
export const squareTipShould = ({ on = true, grid = false, G = null, sim = false } = {}) => !!on && !!grid && !sim && hasOpenSquare(G);

// ---------- «Prøv Byggeskolen · Fagverk først» ----------
export const isBadebro = (levelId) => levelId === BADEBRO.levelId;
// passed: Set/array med bestått-id-er i Byggeskolen (passRead(store, 'bygglab')); state: byggeskole_logic.schoolRead; tip: tidligere visning (''|'tried'|'skipped')
export function fagverkCardShould({ level, difficulty, on = true, cinema = false, passed = [], shown = '' } = {}) {
  if (!on || cinema || !isBadebro(level) || difficulty === 'expert' || shown) return false;
  return !new Set(passed || []).has(BADEBRO.schoolSite);
}
