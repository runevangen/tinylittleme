// R14: lesbare verdensmarkører. Rene funksjoner (ingen DOM/three) så de kan testes i node (test_markers.mjs).
// Rektangler er {x0,y0,x1,y1} i skjermpiksler. Knapper og HUD er «forbudte» soner; markører holdes utenfor dem og innenfor skjermkanten.

export const inRect = (x, y, r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
export const inAny = (x, y, rects) => rects.some((r) => inRect(x, y, r));
export const inflate = (r, m) => ({ x0: r.x0 - m, y0: r.y0 - m, x1: r.x1 + m, y1: r.y1 + m });

// punktet der en stråle fra skjermens midte med retning ang (0 = rett opp, positiv = høyre) treffer den innsatte skjermkanten
export function edgePoint(ang, vw, vh, margin = 14) {
  const dx = Math.sin(ang), dy = -Math.cos(ang), hw = vw / 2 - margin, hh = vh / 2 - margin;
  const k = Math.min(Math.abs(dx) > 1e-9 ? hw / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-9 ? hh / Math.abs(dy) : Infinity);
  return { x: vw / 2 + dx * k, y: vh / 2 + dy * k };
}

// Flytt et skjermpunkt til nærmeste trygge sted: innenfor skjermen (margin) og utenfor alle rektangler.
// Returnerer {x, y, moved, safe, ang} der ang er retningen fra det trygge stedet mot det opprinnelige punktet
// (0 = opp, positiv = høyre); null når punktet ikke måtte flyttes.
export function placeMarker(px, py, vw, vh, rects = [], margin = 14) {
  let x = Math.max(margin, Math.min(vw - margin, px)), y = Math.max(margin, Math.min(vh - margin, py));
  for (let it = 0; it < 8; it++) {
    const hit = rects.find((r) => inRect(x, y, r));
    if (!hit) break;
    const c = [[hit.x0 - 1, y], [hit.x1 + 1, y], [x, hit.y0 - 1], [x, hit.y1 + 1]]
      .map(([cx, cy]) => ({ x: cx, y: cy, d: Math.hypot(cx - x, cy - y) }))
      .filter((o) => o.x >= margin && o.x <= vw - margin && o.y >= margin && o.y <= vh - margin)
      .sort((a, b) => a.d - b.d);
    const free = c.find((o) => !inAny(o.x, o.y, rects)) || c[0];
    if (!free) break;
    x = free.x; y = free.y;
  }
  const safe = !inAny(x, y, rects), moved = Math.abs(x - px) > 0.5 || Math.abs(y - py) > 0.5;
  return { x, y, moved, safe, ang: moved ? Math.atan2(px - x, -(py - y)) : null };
}

// En ting rett foran figuren i lufta som aldri kan gripes (glatt vegg eller kant langt over rekkevidde).
// p: {x,y,z,fx,fz,onGround,carry}, boxes: LEVEL.boxes, k: {HW, H, reach (maks kant over hodet), range (maks avstand)}.
// Returnerer {x,y,z,nx,nz,box} (punkt på flaten i håndhøyde) eller null.
export function ungrippableAhead(p, boxes, k) {
  if (p.carry || p.onGround) return null;
  const ax = Math.abs(p.fx) >= Math.abs(p.fz) ? 0 : 2, sgn = Math.sign(ax === 0 ? p.fx : p.fz) || 1, o = 2 - ax;
  const pa = ax === 0 ? p.x : p.z, po = ax === 0 ? p.z : p.x;
  let best = null;
  for (const b of boxes) {
    if (b.carried || b.dyn || b.type === 'floor' || b.grip) continue;
    if (po < b.min[o] - 0.05 || po > b.max[o] + 0.05) continue;
    if (p.y + k.H < b.min[1] || p.y > b.max[1]) continue;                                   // ikke i høyde med hendene
    const gap = ((sgn > 0 ? b.min[ax] : b.max[ax]) - pa) * sgn - k.HW;
    if (gap < -0.05 || gap > k.range) continue;
    if (b.max[1] - (p.y + k.H) <= k.reach) continue;                                        // kanten er innen rekkevidde: kan gripes som kant
    if (!best || gap < best.gap) best = { b, gap };
  }
  if (!best) return null;
  const pos = [p.x, p.y + k.H * 0.8, p.z]; pos[ax] = sgn > 0 ? best.b.min[ax] : best.b.max[ax];
  return { x: pos[0], y: pos[1], z: pos[2], nx: ax === 0 ? -sgn : 0, nz: ax === 2 ? -sgn : 0, box: best.b };
}

// Hyller: flater på ruta (ikke grep, gulv, vegg eller løse ting) som står som egne bokser. Gir ids som får teal kant.
export function shelfIds(route = [], boxes = []) {
  const ok = new Set(boxes.filter((b) => b.type !== 'floor' && b.type !== 'wall' && !b.grip && !b.dyn).map((b) => b.id));
  return route.filter((w) => !w.grip && !w.via && ok.has(w.id)).map((w) => w.id);
}

// Figurens skjermrektangel ut fra hodet og føttene (skjermpunkter). Pil og markører holdes utenfor så de aldri dekker hovedpersonen.
export function figureRect(head, feet, pad = 10) {
  if (!head || !feet) return null;
  const h = Math.max(40, Math.abs(feet.y - head.y)), half = Math.max(34, h * 0.4), cx = (head.x + feet.x) / 2;
  return { x0: cx - half - pad, y0: Math.min(head.y, feet.y) - pad, x1: cx + half + pad, y1: Math.max(head.y, feet.y) + pad };
}

// Gulvpila prøves på stadig lengre avstand foran figuren til den havner på et fritt sted på skjermen (utenfor knapper og figur).
// spot(d) gir skjermpunktet {x,y} (eller null bak kameraet) for avstand d. Returnerer første d som er fri, ellers null.
export function pickArrowDistance(spot, dists, vw, vh, rects, margin = 14) {
  for (const d of dists) {
    const s = spot(d);
    if (s && s.x > margin && s.x < vw - margin && s.y > margin && s.y < vh - margin && !inAny(s.x, s.y, rects)) return d;
  }
  return null;
}
