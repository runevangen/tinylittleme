// R110: trykk i byggeskjermen (ren logikk, kjøres i node: test_buildtap.mjs).
// Fra Rune (iPhone, Byggeskole · Vippe): «Her får jeg ikke klikket på noen planker». Her ligger reglene for hva et kort trykk gjør:
//  - trykk på en brikke i delebrettet legger delen ut (på et fornuftig sted, aldri oppå en annen del) og velger den,
//  - trykk på en plassert del velger den alltid (også med festeverktøy valgt), og trykk igjen velger delen under,
//  - «Tåler»-beregningen kjøres bare der måleren vises, og først når fingeren er sluppet (debounce).
import { corners, hitPart, clampToSite, siteAnchors, partType } from './build_logic.js';

export const TAP = { px: 10, ringStep: 0.5, ringMax: 14, capDelay: 160, capDelayMax: 300, bounceSecs: 0.42, hintKey: 'tlm.traytap' };

// kort trykk (ikke dra): fingeren har flyttet seg mindre enn px
export const isTap = (x0, y0, x1, y1, px = TAP.px) => Math.hypot(x1 - x0, y1 - y0) < px;

// delene under et punkt: de som fingeren treffer rett på først (øverst først), så de i treffmarginen (også øverst først)
export function hitsAt(B, u, v, pad = 0.35) {
  const out = [];
  for (let i = B.placed.length - 1; i >= 0; i--) if (hitPart(B.placed[i], u, v, 0)) out.push(B.placed[i].id);
  for (let i = B.placed.length - 1; i >= 0; i--) { const p = B.placed[i]; if (!out.includes(p.id) && hitPart(p, u, v, pad)) out.push(p.id); }
  return out;
}
// trykk igjen på den valgte delen: neste del under (fast rekkefølge etter id, så alle nås). Ellers øverste.
export function nextUnder(hits, selId) {
  if (!hits.length) return null;
  if (hits.length < 2 || !hits.includes(selId)) return hits[0];
  const ring = [...hits].sort(), i = ring.indexOf(selId); return ring[(i + 1) % ring.length];
}

// hva gjør et trykk? s = { sim, tool, linkFrom, sel, hits (id-er, øverst først) }.
// → { kind: 'none'|'select'|'linkFirst'|'link'|'ground'|'deselect', id?, why?, log }
export function tapAction({ sim = false, tool = null, linkFrom = null, sel = null, hits = [] } = {}) {
  if (sim) return { kind: 'none', why: 'prøve pågår', log: 'trykk på del uten effekt: prøve pågår' };
  const top = hits[0] || null;
  if (tool) {
    if (!top) return linkFrom ? { kind: 'ground', log: '' } : { kind: 'none', why: 'ingen del under fingeren', log: 'trykk på del uten effekt: ingen del under fingeren (verktøy valgt, ingen første del)' };
    if (!linkFrom) return { kind: 'linkFirst', id: top, log: `trykk på del: første del ${top} (${tool})` };
    if (hits.includes(linkFrom)) return { kind: 'select', id: linkFrom, log: `trykk på del: valgt ${linkFrom} (festing avbrutt)` };
    return { kind: 'link', id: top, log: '' };
  }
  if (!top) return { kind: 'deselect', log: '' };
  const id = nextUnder(hits, sel); return { kind: 'select', id, log: `trykk på del: valgt ${id}${id !== top ? ' (under en annen)' : ''}` };
}

// ---------- trykk på brikke i delebrettet: hvor legges delen? ----------
const bbox = (pts) => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of pts) { if (p.u < a) a = p.u; if (p.u > c) c = p.u; if (p.v < b) b = p.v; if (p.v > d) d = p.v; } return [a, b, c, d]; };
// to roterte rektangler overlapper (SAT), med litt slingringsmonn
export function partsOverlap(p, q, eps = 0.04) {
  const A = corners(p), Bq = corners(q);
  for (const poly of [A, Bq]) for (let i = 0; i < 4; i++) {
    const a = poly[i], b = poly[(i + 1) % 4], nx = -(b.v - a.v), ny = b.u - a.u, l = Math.hypot(nx, ny) || 1;
    const pr = (P) => { let lo = Infinity, hi = -Infinity; for (const c of P) { const d = (c.u * nx + c.v * ny) / l; if (d < lo) lo = d; if (d > hi) hi = d; } return [lo, hi]; };
    const [a0, a1] = pr(A), [b0, b1] = pr(Bq); if (a1 <= b0 + eps || b1 <= a0 + eps) return false;
  }
  return true;
}
const freeAt = (B, cand) => !B.placed.some((p) => p.id !== cand.id && partsOverlap(cand, p));
// midt i det synlige utsnittet (view.cu, view.cv), flyttet i ringer til første ledige sted. Gir { u, v, rot, why } (why = 'full' om alt er opptatt: da midt i utsnittet).
export function trayPlace({ B, id, type, view, anchorR = 1.2 } = {}) {
  const site = B.site, t = partType(type || B.types?.[id] || 'block');
  const c0 = clampToSite(site, view && Number.isFinite(view.cu) ? view.cu : 0, view && Number.isFinite(view.cv) ? view.cv : site.h / 2);
  const mk = (u, v) => { const c = clampToSite(site, u, v); return { id, type: type || B.types?.[id], u: c.u, v: c.v, rot: 0 }; };
  // et ledig festepunkt rett ved midten (underlag der delen passer) vinner
  for (const a of siteAnchors(site)) if (Math.hypot(a.u - c0.u, a.v - c0.v) <= anchorR) { const c = mk(a.u, a.v); if (freeAt(B, c)) return { u: c.u, v: c.v, rot: 0, why: 'festepunkt' }; }
  const step = TAP.ringStep;
  for (let r = 0; r <= TAP.ringMax; r += step) {
    const n = r === 0 ? 1 : Math.max(8, Math.round(r / step) * 4);
    for (let k = 0; k < n; k++) {
      const ang = (k / n) * Math.PI * 2 + Math.PI / 2, c = mk(c0.u + Math.cos(ang) * r * 1.0, c0.v + Math.sin(ang) * r * 0.6);   // oppover og sideveis først
      if (freeAt(B, c) && c.v + t.h / 2 <= site.h + 0.5) return { u: c.u, v: c.v, rot: 0, why: r === 0 ? 'midten' : 'ledig' };
    }
  }
  return { u: c0.u, v: c0.v, rot: 0, why: 'full' };
}

// ---------- «Tåler»-beregningen ----------
// vises måleren her? lab: Byggeskolen (bare stedet «Tåler X» viser den); ellers bare på bro-steder (ikke Trapp/Vippe/lekerom/stue/verksted), ikke i rutenett
export const capShown = ({ lab = false, labCap = false, gridOn = false, setting = true, bridge = false } = {}) => (lab ? !!labCap : !!setting && !gridOn && !!bridge);
// når skal beregningen kjøres? Aldri mens fingeren er nede; senest capDelayMax ms etter siste endring (debounce). Gir ventetid i ms, eller -1 (ikke nå).
export const capWait = ({ shown = false, dragging = false, hasParts = true, cached = false } = {}) => (!shown || dragging || !hasParts || cached ? -1 : TAP.capDelay);
// teller: kjøringer og tid (til YTELSE.md og test)
export const createCapStats = () => ({ runs: 0, ms: 0, last: 0, add(ms) { this.runs++; this.ms += ms; this.last = ms; }, reset() { this.runs = 0; this.ms = 0; this.last = 0; } });
