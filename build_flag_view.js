// R145: tegner målflagget i byggeskjermen (Canvas 2D, ingen nye shadere): mørk kant så det står ut mot den gule rammen og gule veien,
// bakkeskygge og fot, stoff som vaier lett, og en liten pil mot målet når flagget er festet til skjermkanten. Brukes av alle byggeskjermer (R101).
import { clothPoints } from './build_flag_logic.js';
const GOLD = '#ffd23f', EDGE = 'rgba(10,14,28,.92)';
export function drawGoalFlag(g2, plan, t, { t25 = false } = {}) {
  const { x, y, h } = plan, tx = x, ty = y - h;
  g2.save();
  g2.fillStyle = 'rgba(0,0,0,.28)'; g2.beginPath(); g2.ellipse(x + (t25 ? 6 : 3), y + 1, 12, t25 ? 3.5 : 2.5, 0, 0, 7); g2.fill();   // skygge på veien
  g2.lineJoin = 'round'; g2.lineCap = 'round';
  g2.strokeStyle = EDGE; g2.lineWidth = 7; g2.beginPath(); g2.moveTo(x, y); g2.lineTo(tx, ty); g2.stroke();                            // kant rundt stanga
  g2.strokeStyle = '#fff4c2'; g2.lineWidth = 3; g2.beginPath(); g2.moveTo(x, y); g2.lineTo(tx, ty); g2.stroke();                       // lys stang
  const c = clothPoints(plan, t), pts = [...c.top, ...c.bot.slice().reverse()];
  g2.beginPath(); pts.forEach((p, i) => (i ? g2.lineTo(tx + 1 + p.x, ty + p.y) : g2.moveTo(tx + 1 + p.x, ty + p.y))); g2.closePath();
  g2.fillStyle = GOLD; g2.fill(); g2.strokeStyle = EDGE; g2.lineWidth = 2.6; g2.stroke();                                                // stoff med kant
  g2.fillStyle = EDGE; g2.beginPath(); g2.arc(tx, ty, 4.2, 0, 7); g2.fill(); g2.fillStyle = GOLD; g2.beginPath(); g2.arc(tx, ty, 2.2, 0, 7); g2.fill();   // knott
  if (plan.side) {   // festet til kanten: liten pil som viser hvor målet egentlig ligger
    const a = plan.side, px = x + (a > 0 ? plan.len + 11 : -11), py = y - h * 0.5;
    g2.fillStyle = GOLD; g2.strokeStyle = EDGE; g2.lineWidth = 2; g2.beginPath(); g2.moveTo(px + 7 * a, py); g2.lineTo(px - 3 * a, py - 8); g2.lineTo(px - 3 * a, py + 8); g2.closePath(); g2.stroke(); g2.fill();
  }
  g2.restore();
}
