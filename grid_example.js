// R73: eksempelbro for rutenett-bygging («SÅ SLIK»): et ferdig fagverk av trekanter over kjøredekket, regnet ut fra stedets rutenett. Ren logikk (ingen DOM), kjøres i node.
// Utformingen er en Pratt-bjelke: topp-knuter rett over hver dekk-knute, en loddrett stav ved hver, topp-stav mellom dem og skråstaver som heller ned mot midten (de blir strukket, de korte loddrette presses). R74: alt i stål (tre er svakt i rutenett).
// Alle staver ligger på rutenettet og er lovlige etter reglene i grid_logic.js; eksempelet gjelder bare steder med kjøredekk og minst tre felt.
import { createGrid, deckPoints, nodeAt, rodCheck, maxLenOf, pushHistGrid, derive, hasDeck, MAX_LEN } from './grid_logic.js';
import { gridStep } from './grid_logic.js';

export const EXAMPLE_MIN_PANELS = 3;
// stavene i eksempelet: { nodes: [[u, v]], rods: [[a, b, mat]] } der a og b er «d<i>» (dekk-knute, 0 = venstre anker, N = høyre anker) eller «t<i>» (topp-knute). Null når stedet ikke passer.
export function exampleSpec(site, opts = {}) {
  const d = deckPoints(site); if (!d) return null;
  const cols = [d.left, ...d.mid, d.right], N = cols.length - 1; if (N < EXAMPLE_MIN_PANELS) return null;
  const st = gridStep(site), rows = opts.rows || 1, v = d.left.v + rows * st, steel = opts.top || 'steel', side = opts.side || 'steel';
  const nodes = [], rods = [];
  for (let i = 1; i < N; i++) nodes.push([`t${i}`, cols[i].u, v]);
  for (let i = 1; i < N; i++) rods.push([`d${i}`, `t${i}`, side]);   // loddrette
  for (let i = 1; i < N - 1; i++) rods.push([`t${i}`, `t${i + 1}`, steel]);   // toppstav
  rods.push(['d0', 't1', steel], [`t${N - 1}`, `d${N}`, steel]);   // endene
  for (let i = 1; i < N - 1; i++) rods.push(i + 0.5 < N / 2 ? [`t${i}`, `d${i + 1}`, steel] : [`t${i + 1}`, `d${i}`, steel]);   // skråstaver mot midten
  return { cols, N, nodes, rods };
}
// et nytt rutenett med dekk og eksempelet på, eller null
export function exampleGrid(site, maxLen = MAX_LEN, opts = {}) {
  const sp = exampleSpec(site, opts); if (!sp) return null;
  const G = createGrid(site, true); if (!hasDeck(G)) return null;
  const ref = new Map(); sp.cols.forEach((c, i) => { const n = nodeAt(G, c.u, c.v); if (!n) return; ref.set(`d${i}`, n.id); });
  for (const [k, u, v] of sp.nodes) { const n = { id: 'kn' + G.n++, u, v }; G.nodes.push(n); ref.set(k, n.id); }
  for (const [a, b, mat] of sp.rods) {
    const ia = ref.get(a), ib = ref.get(b); if (!ia || !ib) return null;
    const c = rodCheck(G, ia, ib, maxLen); if (!c.ok) return null;
    G.rods.push({ id: 'st' + G.r++, a: ia, b: ib, mat });
  }
  return G;
}
export const hasExample = (site) => !!exampleSpec(site);
// legger eksempelet på byggestedet (kan angres med ANGRE); returnerer { ok, rods } eller { ok: false }
export function applyExample(B, opts) {
  const G = exampleGrid(B.site, maxLenOf(B), opts); if (!G || !B.rg) return { ok: false };
  pushHistGrid(B); B.rg = G; derive(B); return { ok: true, rods: G.rods.filter((r) => !r.deck).length };
}

