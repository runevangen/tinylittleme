// R50: tegner spøkelset (forrige prøve) i byggeskjermen: gjennomsiktige omriss, vanlige canvas-kall, få tegnejobber (ingen nye shadere).
import { corners } from './build_logic.js';
import { loadParams } from './build_loads.js';
// pose: fra decodeFrame, sx: (u,v) -> skjermpunkt, sc: piksler per enhet
export function drawGhost(g, pose, sx, sc, alpha = 0.32) {
  g.save(); g.globalAlpha = alpha; g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = '#bfe6ff'; g.fillStyle = '#bfe6ff';
  for (const p of pose.parts) {
    if (p.kind === 'rect') { const pts = corners(p).map((c) => sx(c.u, c.v)); g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.closePath(); g.fill(); }
    else for (const seg of p.segs) { if (!seg.length) continue; g.lineWidth = Math.max(3, sc * 0.5); g.beginPath(); seg.forEach((q, i) => { const s = sx(q.u, q.v); i ? g.lineTo(s.x, s.y) : g.moveTo(s.x, s.y); }); if (seg.length === 1) { const s = sx(seg[0].u, seg[0].v); g.lineTo(s.x + 0.1, s.y); } g.stroke(); }
  }
  const f = pose.figure, c = sx(f.u, f.v); g.fillStyle = loadParams(f.load).color; g.beginPath(); g.arc(c.x, c.y, f.r * sc, 0, 7); g.fill();
  g.restore();
}
