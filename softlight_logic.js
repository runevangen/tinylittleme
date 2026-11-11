// R17 Mykere skygger og lysbaking: ren planlegging (ingen three). softlight.js tegner det som planen sier.
// Plan = bakte mørke «blobber» (omgivelsesokklusjon) og varme lysflekker; alt flate, myke ellipser rett over underlaget.
import { beamPlan } from './atmos_logic.js';

export const SOFT = { maxBlobs: 90, shadowRadius: 3.2, shadowRadiusOff: 1 };
const solid = (b) => b.type !== 'floor' && b.type !== 'wall' && !b.dyn && !b.carried && b.type !== 'book';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Mørke blobber: under og rundt hver stor, fast ting, og i gulvhjørnene. {x, y, z, rx, rz, op}: ellipse med radius rx/rz og styrke op (0..1).
export function planBlobs(L, floorY, sun = [28, 60, -24], max = SOFT.maxBlobs) {
  const room = L.room, out = [];
  const sl = Math.hypot(sun[0], sun[2]) || 1, lx = -sun[0] / sl, lz = -sun[2] / sl;   // skyggen faller bort fra sola
  const boxes = (L.boxes || []).filter(solid);
  for (const b of boxes) {
    const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
    if (Math.min(sx, sz) < 0.8 || sy < 0.4) continue;
    const base = b.min[1];
    const stands = base <= floorY + 0.05 || boxes.some((c) => c !== b && Math.abs(c.max[1] - base) < 0.06 && c.min[0] < b.max[0] && c.max[0] > b.min[0] && c.min[2] < b.max[2] && c.max[2] > b.min[2]);
    if (!stands) continue;
    const m = clamp(Math.min(sx, sz) * 0.45 + sy * 0.12, 0.7, 2.6);                  // høyere og bredere ting gir bredere mørk sone
    const nearWall = Math.min(b.min[0] - room.x0, room.x1 - b.max[0], b.min[2] - room.z0, room.z1 - b.max[2]) < 1.2;
    out.push({ kind: 'under', x: (b.min[0] + b.max[0]) / 2 + lx * m * 0.25, y: base, z: (b.min[2] + b.max[2]) / 2 + lz * m * 0.25, rx: sx / 2 + m, rz: sz / 2 + m, op: clamp(0.5 + sy * 0.012, 0.5, 0.64) * (nearWall ? 1.1 : 1), h: sy });
  }
  const cr = Math.min(6.5, Math.min(room.x1 - room.x0, room.z1 - room.z0) * 0.22);   // gulvhjørner
  for (const [cx, cz] of [[room.x0, room.z0], [room.x1, room.z0], [room.x0, room.z1], [room.x1, room.z1]]) out.push({ kind: 'corner', x: cx, y: floorY, z: cz, rx: cr, rz: cr, op: 0.6, h: 0 });
  out.sort((a, b) => b.rx * b.rz * b.op - a.rx * a.rz * a.op);
  return out.slice(0, max);
}

// Varm lysflekk på gulvet der vinduet lander: en stor, myk halo rundt den harde flekken fra atmos.js.
export function planGlows(L, floorY, sun = [28, 60, -24]) {
  const out = [];
  for (const w of L.windows || []) {
    const p = beamPlan(w, L.room, sun, floorY); if (!p) continue;
    const xs = p.patch.map((q) => q[0]), zs = p.patch.map((q) => q[2]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    const rx = Math.max(3, (Math.max(...xs) - Math.min(...xs)) * 1.1), rz = Math.max(3, (Math.max(...zs) - Math.min(...zs)) * 1.1);
    out.push({ x: clamp(cx, L.room.x0 + 1, L.room.x1 - 1), y: floorY, z: clamp(cz, L.room.z0 + 1, L.room.z1 - 1), rx, rz, op: 0.4 });
  }
  return out;
}

// Skygge-radius etter kvalitet: av (lav profil, Enkel grafikk eller valget av) gir dagens kant.
export const shadowRadius = (on, low) => (on && !low ? SOFT.shadowRadius : SOFT.shadowRadiusOff);
export const softActive = (on, low, gfxLow) => !!on && !low && !gfxLow;
