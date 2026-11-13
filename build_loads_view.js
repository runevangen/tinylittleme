// R48: tegning av testlastene i byggeskjermen (canvas 2D, ingen nye shadere, ingen DOM utover konteksten som sendes inn).
// Hver last er noen få fyll og streker oppå sirkelen fysikken bruker (radius f.r). f = { u, v, r, roll, load }, c = skjermpunkt for midten, sc = piksler per enhet.
import { loadParams } from './build_loads.js';

const arc = (g, x, y, r, a0 = 0, a1 = 7) => { g.beginPath(); g.arc(x, y, r, a0, a1); };
const DRAW = {
  // testfiguren: gul rund fyr som ser fremover
  figure: (g, c, r) => { arc(g, c.x, c.y, r); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#3b2b00'; g.stroke(); g.fillStyle = '#3b2b00'; for (const ex of [0.25, 0.62]) { arc(g, c.x + (ex - 0.1) * r, c.y - r * 0.2, Math.max(1.5, r * 0.12)); g.fill(); } },
  // tennisball: gulgrønn med to sømmer som dreier seg med rullingen
  ball: (g, c, r, roll) => {
    arc(g, c.x, c.y, r); g.fillStyle = '#d6e84a'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#6b7a12'; g.stroke();
    g.save(); g.translate(c.x, c.y); g.rotate(roll); g.strokeStyle = '#f4f7d0'; g.lineWidth = Math.max(1.5, r * 0.12);
    g.beginPath(); g.arc(-r * 0.95, 0, r * 0.85, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(r * 0.95, 0, r * 0.85, Math.PI - 0.9, Math.PI + 0.9); g.stroke(); g.restore();
  },
  // leke-bil: rød kropp med vindu og to hjul (eiker dreier seg)
  car: (g, c, r, roll) => {
    g.fillStyle = '#e0453a'; g.strokeStyle = '#4a0f0a'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(c.x - 1.15 * r, c.y - 0.85 * r, 2.3 * r, 1.0 * r, r * 0.25); g.fill(); g.stroke();
    g.fillStyle = '#bfe6ff'; g.beginPath(); g.roundRect(c.x - 0.2 * r, c.y - 1.3 * r, 0.9 * r, 0.5 * r, r * 0.15); g.fill(); g.stroke();
    for (const wx of [-0.62, 0.62]) {
      const x = c.x + wx * r, y = c.y + 0.5 * r, k = r * 0.5;
      arc(g, x, y, k); g.fillStyle = '#222'; g.fill(); g.strokeStyle = '#000'; g.stroke();
      g.strokeStyle = '#ddd'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - Math.cos(roll) * k * 0.7, y - Math.sin(roll) * k * 0.7); g.lineTo(x + Math.cos(roll) * k * 0.7, y + Math.sin(roll) * k * 0.7); g.stroke(); g.lineWidth = 2;
    }
  },
  // wind-up-robot: boks med hode, øyne og en nøkkel i ryggen som dreier seg
  robot: (g, c, r, roll) => {
    g.fillStyle = '#8fa3b8'; g.strokeStyle = '#27323f'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(c.x - 0.8 * r, c.y - 0.55 * r, 1.6 * r, 1.5 * r, r * 0.2); g.fill(); g.stroke();
    g.beginPath(); g.roundRect(c.x - 0.6 * r, c.y - 1.25 * r, 1.2 * r, 0.7 * r, r * 0.15); g.fillStyle = '#a9bccf'; g.fill(); g.stroke();
    g.fillStyle = '#ffe36a'; for (const ex of [-0.22, 0.28]) { arc(g, c.x + ex * r, c.y - 0.9 * r, Math.max(1.5, r * 0.12)); g.fill(); }
    g.strokeStyle = '#27323f'; g.beginPath(); g.moveTo(c.x, c.y - 1.25 * r); g.lineTo(c.x, c.y - 1.55 * r); g.stroke(); arc(g, c.x, c.y - 1.6 * r, Math.max(2, r * 0.1)); g.fillStyle = '#e0453a'; g.fill();
    const kx = c.x - 0.85 * r, ky = c.y + 0.1 * r, a = Math.sin(roll * 2) * 0.6; g.strokeStyle = '#d9a63a'; g.lineWidth = 3; g.beginPath(); g.moveTo(kx - Math.cos(a) * r * 0.3, ky - Math.sin(a) * r * 0.3); g.lineTo(kx + Math.cos(a) * r * 0.3, ky + Math.sin(a) * r * 0.3); g.stroke();
  },
};
export function drawLoad(g, f, c, sc) { const id = DRAW[f.load] ? f.load : 'figure'; DRAW[id](g, c, f.r * sc, f.roll || 0); }
export const drawnLoads = Object.keys(DRAW);
export const loadColor = (id) => loadParams(id).color;
