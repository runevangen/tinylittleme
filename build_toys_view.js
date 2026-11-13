// R46: tegning av lekene i byggeskjermen (canvas 2D, ingen nye shadere): knotter, blyantspiss, linjalstreker, bokrygg, svamphull.
// Bruker bare vanlige tegnekall oppå flaten delen allerede har fått. Ingen DOM utover canvas-konteksten som sendes inn.
import { partType, toWorldPt } from './build_logic.js';
import { isToy } from './build_toys.js';

const TOY_DETAIL = {
  lego: (g, f, sc) => { const r = Math.max(2, sc * 0.17); for (const x of [-0.75, -0.25, 0.25, 0.75]) { const q = f(x, 0.6); g.beginPath(); g.arc(q.x, q.y, r, 0, 7); g.fillStyle = '#ff7a70'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#7a1510'; g.stroke(); } },
  book: (g, f, sc) => { g.lineWidth = Math.max(2, sc * 0.12); g.strokeStyle = '#f6efe0'; g.beginPath(); const a = f(-1.2, -0.7), b = f(1.3, -0.7), c = f(1.3, 0.7), d = f(-1.2, 0.7); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.stroke(); g.strokeStyle = '#1d3a68'; g.beginPath(); const s0 = f(-1.4, -1), s1 = f(-1.4, 1); g.moveTo(s0.x, s0.y); g.lineTo(s1.x, s1.y); g.stroke(); },
  sponge: (g, f, sc) => { g.fillStyle = '#b8962a'; for (const [x, y] of [[-1, 0.15], [-0.3, -0.25], [0.4, 0.2], [1.05, -0.1]]) { const q = f(x, y); g.beginPath(); g.arc(q.x, q.y, Math.max(1.5, sc * 0.11), 0, 7); g.fill(); } },
};
// stiv visning (plassert eller rett kloss i PRØV): f(x, y) = lokalt punkt -> skjerm
export function drawToyDetail(g, part, sx, sc) {
  if (!isToy(part.type)) return;
  const f = (x, y) => { const w = toWorldPt(part, x, y); return sx(w.u, w.v); };
  const d = TOY_DETAIL[part.type]; if (d) d(g, f, sc);
  const t = partType(part.type);
  if (part.type === 'pencil') { const a = f(t.w / 2 - 1, 0), b = f(t.w / 2, 0), e = f(-t.w / 2, 0), e2 = f(-t.w / 2 + 0.6, 0); g.lineCap = 'round'; g.strokeStyle = '#333'; g.lineWidth = Math.max(3, t.h * sc); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.strokeStyle = '#f08a9a'; g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(e2.x, e2.y); g.stroke(); }
  if (part.type === 'ruler') { g.strokeStyle = '#6b5d4a'; g.lineWidth = 1.5; for (let x = -t.w / 2 + 0.5; x < t.w / 2; x += 1) { const a = f(x, t.h / 2), b = f(x, t.h / 2 - (Math.round(x * 2) % 2 ? 0.15 : 0.25)); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); } }
}
// bøyd planke i PRØV (kjede av punkter, allerede i skjermkoordinater): spiss, strek eller hull følger bøyningen
export function drawToyChain(g, type, pts, sc) {
  if (!isToy(type) || pts.length < 2) return;
  g.lineCap = 'round';
  if (type === 'pencil') { const a = pts[pts.length - 1], b = pts[Math.max(0, pts.length - 3)]; g.strokeStyle = '#333'; g.lineWidth = Math.max(3, 0.4 * sc); g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(a.x, a.y); g.stroke(); }
  else if (type === 'ruler') { g.fillStyle = '#6b5d4a'; for (let i = 0; i < pts.length; i++) { g.beginPath(); g.arc(pts[i].x, pts[i].y - 0.15 * sc, Math.max(1.2, sc * 0.05), 0, 7); g.fill(); } }
  else if (type === 'sponge') { g.fillStyle = '#b8962a'; for (let i = 0; i < pts.length; i += 2) { g.beginPath(); g.arc(pts[i].x, pts[i].y, Math.max(1.5, sc * 0.11), 0, 7); g.fill(); } }
}
