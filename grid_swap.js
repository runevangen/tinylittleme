// R128: belastningsvisning som verktøy: «BYTT TIL STÅL» i Rutenett-bygging (ren logikk: ingen DOM, ingen three.js, kjøres i node: test_gridswap.mjs).
//  - Etter en feilet PRØV huskes hvilken stav som tok mest (hintOf): den pulserer når spilleren er tilbake i bygging, så det er lett å se hva som er svakt.
//  - Velg en stav av tre eller tau, og ett trykk på BYTT TIL STÅL gjør den om til stål (samme knuter, samme id, ett ANGRE-steg). Prisforskjellen kontrolleres mot budsjettet.
// Tillegg til grid_logic.js; dagens bygging og knapper er uendret. Delt av broene og Byggeskolen (R101): all kode ligger her og i grid_swap_view.js.
import { rodPrice, GRID_MATS } from './build_materials.js';
import { pushHist } from './build_logic.js';
import { nodeOf, rodOf, rodLen, derive, isGrid } from './grid_logic.js';

export const SW = {
  to: 'steel',                 // materialet staven byttes til
  minHintR: 0.1,               // en stav som tok mindre enn dette (andel av brudd) er ikke verdt å peke ut (ellers peker vi alltid på den som tok mest)
};
// kan en stav byttes? (bare brukerens egne staver av tre eller tau; dekket og stål kan ikke)
export const swappable = (r) => !!r && !r.deck && r.mat !== SW.to && GRID_MATS.includes(r.mat);

// { ok, from, to, len, delta (ekstra pris), cost (stavens nye pris) } eller { ok: false, why: 'mode' | 'none' | 'deck' | 'already' | 'budget', need? }. Endrer ikke B.
// left = hvor mye budsjettet har igjen (null/undefined = ingen grense som stopper deg)
export function swapPlan(B, rodId, left = null) {
  if (!isGrid(B)) return { ok: false, why: 'mode' };
  const G = B.rg, r = rodOf(G, rodId); if (!r) return { ok: false, why: 'none' };
  if (r.deck) return { ok: false, why: 'deck' };
  if (!swappable(r)) return { ok: false, why: 'already' };
  const L = rodLen(G, r), cost = rodPrice(SW.to, L), delta = cost - rodPrice(r.mat, L);
  if (Number.isFinite(left) && delta > left + 1e-9) return { ok: false, why: 'budget', need: delta - Math.max(0, left), delta };
  return { ok: true, from: r.mat, to: SW.to, len: L, delta, cost };
}
// bytter (ett ANGRE-steg). Staven beholder id og knuter; fysikken og kostnaden regnes på nytt (derive).
export function gSwap(B, rodId, left = null) {
  const p = swapPlan(B, rodId, left); if (!p.ok) return p;
  pushHist(B); rodOf(B.rg, rodId).mat = SW.to; derive(B); return p;
}
// pris å vise på knappen for valgt stav (null når den ikke kan byttes)
export const swapPrice = (B, rodId) => { const p = swapPlan(B, rodId, null); return p.ok ? p.delta : null; };

// ---------- hint etter en feilet prøve ----------
// stavens kjennetegn: id, materiale og endepunkter. Hintet gjelder bare så lenge staven er uendret.
export function rodSig(G, r) { const a = nodeOf(G, r.a), b = nodeOf(G, r.b); return a && b ? `${r.id}|${r.mat}|${a.u},${a.v}>${b.u},${b.v}` : ''; }
// peaks = [{ id, r, kind, broken }] (fra createPeaks); first = staven som brakk først ({ id } | null). Velger staven som tok mest av dem som kan byttes (brakk først går foran).
// Returnerer { id, sig, r, kind, broken } eller null (ingen stav å peke på, eller alt var rolig).
export function hintOf(B, peaks, first = null) {
  if (!isGrid(B) || !Array.isArray(peaks)) return null; const G = B.rg;
  const cand = peaks.filter((p) => { const r = rodOf(G, p.id); return swappable(r) && (p.broken || p.r >= SW.minHintR); }).sort((a, b) => b.r - a.r || (a.id < b.id ? -1 : 1));
  const f = first && cand.find((p) => p.id === first.id), top = f || cand[0]; if (!top) return null;
  return { id: top.id, sig: rodSig(G, rodOf(G, top.id)), r: top.r, kind: top.kind || 'trykk', broken: !!top.broken };
}
// er hintet fortsatt riktig for bygget nå?
export function hintValid(B, h) { if (!h || !isGrid(B)) return false; const r = rodOf(B.rg, h.id); return swappable(r) && rodSig(B.rg, r) === h.sig; }
