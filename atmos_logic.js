// Lysstråler, småting og hjørner (R4): ren logikk uten three, så den kan testes i node (test_atmos.mjs). Selve tegningen ligger i atmos.js.
export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
export function hashStr(str) { let h = 2166136261; for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

const WALLS = { N: { inward: [0, 0, 1], right: [1, 0, 0] }, S: { inward: [0, 0, -1], right: [-1, 0, 0] }, E: { inward: [-1, 0, 0], right: [0, 0, 1] }, W: { inward: [1, 0, 0], right: [0, 0, -1] } };
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };

// Plan for lysstrålene fra ett vindu: retningen lyset går (ned og inn i rommet), og striper (parallellogrammer) fra vinduet til gulvet.
// sun = retningen mot sola (som SUN i main.js). Strålen tvinges alltid inn i rommet og litt ned, og klippes mot romveggene.
// R57: første treff langs en stråle (p + t*d) mot faste bokser; null hvis fritt. Starter strålen inni en boks, hoppes den boksen over (vindu bak/inni møbel).
export const beamSolid = (b) => b.type !== 'floor' && b.type !== 'wall' && b.type !== 'glass' && !b.dyn && !b.carried;   // glass slipper lyset gjennom
export function rayHitT(p, d, boxes, tmax = Infinity) {
  let best = null;
  for (const b of boxes) {
    let t0 = 1e-6, t1 = tmax, inside = true;
    for (let k = 0; k < 3; k++) {
      if (p[k] > b.min[k] && p[k] < b.max[k]) { if (Math.abs(d[k]) < 1e-9) continue; } else inside = false;
      if (Math.abs(d[k]) < 1e-9) { if (p[k] <= b.min[k] || p[k] >= b.max[k]) { t1 = -1; break; } continue; }
      let a = (b.min[k] - p[k]) / d[k], c = (b.max[k] - p[k]) / d[k]; if (a > c) [a, c] = [c, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, c);
    }
    if (inside || t1 < t0) continue;
    if (best === null || t0 < best) best = t0;
  }
  return best;
}
// Bokser som kan stoppe en stråle fra dette vinduet: faste ting, men ikke glass og ikke vinduets egen ramme/karm/sims (bokser som rekker inn til veggen og overlapper vindusflaten).
export function beamBlockers(win, boxes) {
  const wl0 = WALLS[win.wall]; if (!wl0) return [];
  const ax = Math.abs(wl0.inward[0]) ? 0 : 2, ra = ax === 0 ? 2 : 0, w = (win.size[0] + win.size[1]) * 0.06 + 1, wallC = win.pos[ax];
  const own = (b) => (Math.min(Math.abs(b.min[ax] - wallC), Math.abs(b.max[ax] - wallC)) < 3 || (b.min[ax] < wallC && b.max[ax] > wallC))
    && b.max[ra] > win.pos[ra] - win.size[0] / 2 - w && b.min[ra] < win.pos[ra] + win.size[0] / 2 + w && b.max[1] > win.pos[1] - win.size[1] / 2 - w && b.min[1] < win.pos[1] + win.size[1] / 2 + w;
  return boxes.filter((b) => beamSolid(b) && !own(b));
}
export function beamPlan(win, room, sun, floorY, slabs = 5, boxes = []) {
  const blockers = beamBlockers(win, boxes);
  const wl = WALLS[win.wall]; if (!wl) return null;
  const s = norm(sun), h = [-s[0], -s[2]];
  const dy = -Math.min(0.8, Math.max(0.45, Math.abs(s[1])));                       // hvor bratt lyset faller
  let hi = h[0] * wl.inward[0] + h[1] * wl.inward[2], hr = h[0] * wl.right[0] + h[1] * wl.right[2];
  hi = Math.max(hi, 0.35 * Math.hypot(h[0], h[1]), 0.25); hr = Math.max(-0.6 * hi, Math.min(0.6 * hi, hr));
  const hn = Math.hypot(hi, hr), k = Math.sqrt(1 - dy * dy) / hn;
  const dir = [(wl.inward[0] * hi + wl.right[0] * hr) * k, dy, (wl.inward[2] * hi + wl.right[2] * hr) * k];
  const [ww, wh] = win.size, c = win.pos, push = 0.3;                              // starter litt innenfor veggen
  const at = (u, v) => [c[0] + wl.right[0] * u + wl.inward[0] * push, c[1] + v, c[2] + wl.right[2] * u + wl.inward[2] * push];
  const reach = (p) => {                                                           // hvor langt langs dir før gulv eller vegg
    let t = (p[1] - floorY) / -dir[1];
    for (const [pc, dc, lo, hi2] of [[p[0], dir[0], room.x0, room.x1], [p[2], dir[2], room.z0, room.z1]]) if (dc > 1e-6) t = Math.min(t, (hi2 - 0.2 - pc) / dc); else if (dc < -1e-6) t = Math.min(t, (lo + 0.2 - pc) / dc);
    return Math.max(0, t);
  };
  const ends = (p, t) => [p[0] + dir[0] * t, p[1] + dir[1] * t, p[2] + dir[2] * t];
  const hit = (p, t) => { const h = rayHitT(p, dir, blockers, t); return h === null ? t : Math.max(0, h - 0.05); };   // R57: stråle stopper mot faste bokser
  const out = [];
  for (let i = 0; i < slabs; i++) {
    const u = -ww / 2 + ww * (i + 0.5) / slabs, a = at(u, -wh / 2), b = at(u, wh / 2);
    let ta = reach(a), tb = reach(b);
    if (blockers.length) {   // hele striper (ikke bare kantene): prøv flere linjer mellom a og b, og stripa kortes til den første som treffer
      let tc = Math.max(ta, tb);
      for (let j = 0; j <= 6; j++) { const f = j / 6, p = [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * f); tc = Math.min(tc, hit(p, Math.max(ta, tb))); }
      ta = Math.min(ta, tc); tb = Math.min(tb, tc);
      if (Math.max(ta, tb) < 0.6) continue;
    }
    out.push({ a, b, a2: ends(a, ta), b2: ends(b, tb), len: Math.max(ta, tb) });
  }
  // lyset på gulvet (R57): et rutenett av små flater som slås sammen til ett nett (samme tegnekall). En rute tas bare med når strålene til den er åpne og ingen boks står i den.
  // Hver rute bærer uv i hele flekkens rom, så den myke kanten sitter rundt hele flekken og ikke rundt hver rute.
  const G = 4, gp = [];
  for (let i = 0; i <= G; i++) { gp.push([]); for (let j = 0; j <= G; j++) { const u = -ww / 2 + ww * i / G, v = -wh / 2 + wh * j / G, p = at(u, v), t = reach(p), q = ends(p, t); gp[i].push({ q: [q[0], floorY + 0.04, q[2]], free: !blockers.length || rayHitT(p, dir, blockers, t) === null, uv: [i / G, j / G] }); } }
  const cells = [];
  for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
    const c = [gp[i][j], gp[i + 1][j], gp[i + 1][j + 1], gp[i][j + 1]];
    if (!c.every((g) => g.free)) continue;
    const x0 = Math.min(...c.map((g) => g.q[0])), x1 = Math.max(...c.map((g) => g.q[0])), z0 = Math.min(...c.map((g) => g.q[2])), z1 = Math.max(...c.map((g) => g.q[2]));
    if (blockers.some((b) => b.max[0] > x0 && b.min[0] < x1 && b.max[2] > z0 && b.min[2] < z1 && b.min[1] <= floorY + 0.3 && b.max[1] > floorY + 0.04)) continue;
    cells.push({ q: c.map((g) => g.q), uv: c.map((g) => g.uv) });
  }
  const patch = cells.length ? cells : null, outline = [[-ww / 2, -wh / 2], [ww / 2, -wh / 2], [ww / 2, wh / 2], [-ww / 2, wh / 2]].map(([u, v]) => { const p = at(u, v), q = ends(p, reach(p)); return [q[0], floorY + 0.04, q[2]]; });   // outline = hele flekkens omriss uten hensyn til bokser (softlight_logic.js bruker den til halo)
  return { dir, slabs: out, patch, outline };
}

const solid = (b) => b.type !== 'floor' && b.type !== 'wall' && !b.dyn && !b.carried;
// Steder for små ting (smuler, knapper, hår): på gulvet (mest langs vegger) og oppå større flater som hyller og bord.
// Aldri inni eller under en kloss, og ikke nær kanten av flaten. Bare utseende: ingen kollisjon.
// avoid = steder som skal holdes fri (start, mål, foten av stiene): {x, z, r} (sirkel) eller {x0, x1, z0, z1} (rektangel).
export function inAvoid(avoid, x, z) { return avoid.some((a) => a.r !== undefined ? Math.hypot(x - a.x, z - a.z) < a.r : x > a.x0 && x < a.x1 && z > a.z0 && z < a.z1); }
export function avoidZones(L, floorY) {   // fri sone rundt start, mål og under/foran hvert trinn på ruta (der helten går)
  const out = [];
  if (L.start) out.push({ x: L.start[0], z: L.start[2], r: 9 });
  if (L.goal) out.push({ x: L.goal[0], z: L.goal[2], r: 9 });
  for (const s of L.route || []) if (s.top > floorY + 0.5 && s.x0 !== undefined) out.push({ x0: s.x0 - 4, x1: s.x1 + 4, z0: s.z0 - 4, z1: s.z1 + 4 });
  return out;
}
export const KINDS = ['crumb', 'crumb', 'pebble', 'button', 'hair', 'hair', 'chip', 'pill', 'clip', 'coin', 'pebble', 'crumb'];
export function pickSpots(boxes, room, floorY, seed, n = 40, avoid = []) {
  const r = rng(seed), blocks = boxes.filter(solid), kinds = KINDS;
  const tops = blocks.filter((b) => (b.max[0] - b.min[0]) > 3 && (b.max[2] - b.min[2]) > 3 && b.max[1] < room.height - 6 && b.max[1] > floorY + 1);
  const covered = (x, z, y, skip) => blocks.some((b) => b !== skip && x > b.min[0] - 0.6 && x < b.max[0] + 0.6 && z > b.min[2] - 0.6 && z < b.max[2] + 0.6 && b.min[1] < y + 5 && b.max[1] > y - 0.05);
  const out = []; let tries = 0;
  while (out.length < n && tries++ < n * 40) {
    let x, y, z, surf = 'floor';
    if (tops.length && r() < 0.35) {
      const b = tops[Math.floor(r() * tops.length)], m = 1.2;
      x = b.min[0] + m + r() * (b.max[0] - b.min[0] - 2 * m); z = b.min[2] + m + r() * (b.max[2] - b.min[2] - 2 * m); y = b.max[1]; surf = 'top';
      if (covered(x, z, y, b) || inAvoid(avoid, x, z)) continue;
    } else {
      const edge = r() < 0.55, w = room.x1 - room.x0, d = room.z1 - room.z0, e = 1 + r() * 5;
      x = room.x0 + 1.2 + r() * (w - 2.4); z = room.z0 + 1.2 + r() * (d - 2.4);
      if (edge) { const side = Math.floor(r() * 4); if (side === 0) z = room.z0 + e; else if (side === 1) z = room.z1 - e; else if (side === 2) x = room.x0 + e; else x = room.x1 - e; }
      y = floorY; if (covered(x, z, y, null) || inAvoid(avoid, x, z)) continue;
    }
    out.push({ x, y, z, surf, kind: kinds[Math.floor(r() * kinds.length)], rot: r() * Math.PI * 2, s: 0.55 + r() * 0.9, c: r(), h: r(), a: r() });
  }
  return out;
}
