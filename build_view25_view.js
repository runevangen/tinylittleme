// R137: tegnehjelper for 2,5D-visningen (canvas 2D, samme lerret som den flate tegningen: ingen ny shader, ingen ekstra lerret). Kalles bare når tilt25() er på.
import { depthVec, rodDepth, SLAB_DEPTH, shadeHex } from './build_view25.js';

// dybde og skygge bak en stav (kalles FØR selve staven tegnes). pa/pb er skjermpunkter, w tykkelsen, col materialfargen, path() tegner banen (rett eller kabelkurve)
export function rodDepth25(g2, pa, pb, w, col, path, slab = false) {
  const dz = slab ? SLAB_DEPTH : rodDepth(w), v = depthVec(dz), side = shadeHex(col, slab ? 0.8 : 0.5);
  g2.save(); g2.lineCap = slab ? 'butt' : 'round'; g2.lineJoin = 'round';
  g2.globalAlpha = 0.16; g2.strokeStyle = '#000'; g2.lineWidth = w + 6; g2.translate(0, dz * 1.4 + 3); path(); g2.stroke(); // myk skygge under bygget
  g2.restore(); g2.save(); g2.lineCap = slab ? 'butt' : 'round'; g2.lineJoin = 'round'; g2.strokeStyle = side;
  for (const k of [1, 0.66, 0.33]) { g2.save(); g2.translate(v.x * k, v.y * k); g2.lineWidth = w + 2; path(); g2.stroke(); g2.restore(); }
  g2.restore();
}
// kule på knuten: mørk kule bak, lys kant oppe til venstre
export function nodeBall25(g2, x, y, r, fill) {
  const v = depthVec(r * 0.9);
  g2.beginPath(); g2.arc(x + v.x, y + v.y, r, 0, 7); g2.fillStyle = shadeHex(fill, 0.45); g2.fill();
  g2.beginPath(); g2.arc(x, y, r, 0, 7); g2.fillStyle = fill; g2.fill(); g2.strokeStyle = '#0b1020'; g2.lineWidth = 2; g2.stroke();
  g2.beginPath(); g2.arc(x - r * 0.3, y - r * 0.3, r * 0.34, 0, 7); g2.fillStyle = 'rgba(255,255,255,.7)'; g2.fill();
}
// klosser under veien (hyller og kanter): sidene og toppflaten får dybde. pts = skjermhjørner [x0y1, x1y1, x1y0, x0y0] (topp-venstre, topp-høyre, bunn-høyre, bunn-venstre)
export function slab25(g2, pts, base) {
  const v = depthVec(14), [a, b] = pts;
  g2.beginPath(); g2.moveTo(a.x, a.y); g2.lineTo(b.x, b.y); g2.lineTo(b.x + v.x, b.y + v.y); g2.lineTo(a.x + v.x, a.y + v.y); g2.closePath(); g2.fillStyle = shadeHex(base, 1.35); g2.fill();
  g2.strokeStyle = 'rgba(0,0,0,.25)'; g2.lineWidth = 1; g2.stroke();
}
// rolig underlag: mørk plate under hele byggeflaten med en myk kant (poly = fire skjermhjørner)
export function plate25(g2, poly) {
  g2.beginPath(); poly.forEach((q, i) => (i ? g2.lineTo(q.x, q.y) : g2.moveTo(q.x, q.y))); g2.closePath();
  g2.fillStyle = 'rgba(8,14,30,.34)'; g2.fill(); g2.strokeStyle = 'rgba(255,255,255,.10)'; g2.lineWidth = 2; g2.stroke();
}
