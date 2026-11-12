// R25: byggeskjermens 2D-fysikk (ren logikk: ingen DOM, ingen three.js, kjøres i node).
// Modellen er «posisjonsbasert»: hver del er bygd av små kuler (samme oppsett som `layout` i build_logic.js), holdt sammen av avstandsbånd.
//  - klosser og vekter: alle kuler stivt låst til hverandre (vekt = mange ganger tyngre)
//  - planker: en kjede av kuler med et mykt «bøyebånd» (hver kule mot nummer to bortover): bøyer seg synlig, og brekker når vinkelen mellom to biter blir for stor
//  - tape: stiv sveis mellom to deler (eller del og underlag), ryker når den strekkes for mye; ledd: ett festepunkt som svinger; tau: bare en maksavstand (trekker, skyver ikke)
//  - testfiguren er en liten rund fyr som går mot høyre og hopper når den støter mot noe
// Fast tidssteg og fast rekkefølge: samme bygg gir alltid samme resultat (se test_buildphys.mjs).
import { partType, layout, toWorldPt, PR } from './build_logic.js';

export const DT = 1 / 60, SUB = 2, ITER = 6;
export const G = 32;                    // tyngde (enheter/s²); en enhet = 5 cm, men spillet skal føles tungt og lesbart
export const FIG_R = 0.4;               // testfigurens radius
export const FIG_SPEED = 3.4, FIG_HOP = 11.5;
export const SETTLE = 0.25;              // først en rolig start så overlapp og tyngde setter seg
export const MAX_T = 30;                // lengste prøve (s)
// materialer: m = masse per kule, alpha = stivhet (0..1 per runde, lavere = bøyer mer), snap = største nedbøyning (enheter) før planken brekker
export const MATERIAL = {
  plank_s: { m: 0.5, alpha: 0.12, snap: 0.9 },
  plank_l: { m: 0.5, alpha: 0.03, snap: 0.9 },
  seesaw: { m: 0.5, alpha: 0.6, snap: 3 },   // R30: stiv planke (bøyer seg lite) med fast dreiepunkt i midten
  block: { m: 1, alpha: 1 },
  weight: { m: 5, alpha: 1 },
};
export const LINK_SNAP = { tape: 1000, hinge: 6000, rope: 1100, pivot: 30000 };   // kraft (masse·enhet/s²) som får koblingen til å ryke; en vekt henger med 1440, en kloss med 288, så tau og tape ryker av en hengende vekt, ledd holder
const FRICTION = 0.7, FIG_FRICTION = 0.1;

const mat = (t) => MATERIAL[t] || MATERIAL.block;
const isChain = (t) => { const ty = partType(t); return ty.w >= ty.h * 2; };

// byggestedets faste flater: dekk (hyller/kanter) som rektangler, topp = v (standard 0), 5 enheter tykke
export function siteBoxes(site) {
  const hw = site.w / 2, dk = Array.isArray(site.deck) && site.deck.length ? site.deck : [{ u0: -hw - 6, u1: -hw }, { u0: hw, u1: hw + 6 }];
  return dk.map((d) => { const top = d.top || 0; return { x0: d.u0, x1: d.u1, y0: top - 5, y1: top }; });
}
export const siteStart = (site) => ({ u: site.start?.u ?? -site.w / 2 + 1, v: site.start?.v ?? 0 });
export const siteGoal = (site) => ({ u: site.goal?.u ?? site.w / 2 - 1, v: site.goal?.v ?? 0 });

// def: { site, placed: [{id,type,u,v,rot}], links: [...] (se build_logic.addLink) }, opts: { strength = 1 (skalerer brekkgrensene), figure = true }
export function createSim(def, opts = {}) {
  const site = def.site, strength = opts.strength ?? 1, boxes = siteBoxes(site);
  const P = [], bodies = [], cons = [], noCol = new Set(), events = [];
  const bodyOf = new Map();
  const mk = (x, y, w, r, b) => { const p = { x, y, px: x, py: y, vx: 0, vy: 0, w, r, b }; P.push(p); return P.length - 1; };

  for (const part of def.placed) {
    const t = part.type, M = mat(t), lay = layout(t), bi = bodies.length;
    const idx = lay.map((q) => { const w = toWorldPt(part, q.x, q.y); const k = mk(w.u, w.v, 1 / M.m, PR, bi); P[k].lx = q.x; P[k].ly = q.y; return k; });
    const body = { id: part.id, type: t, kind: isChain(t) ? 'chain' : 'rect', idx, groups: [], alpha: M.alpha ?? 1, snap: (M.snap || 99) * strength, stress: 0, creakT: -9, broken: false, part };
    body.groups.push(mkGroup(idx));
    bodies.push(body); bodyOf.set(part.id, bi);
  }
  // en gruppe = kuler som holdes mot sin stive form («formtilpasning»); en brukket planke blir to grupper
  function mkGroup(idx) { let rx = 0, ry = 0; for (const i of idx) { rx += P[i].lx; ry += P[i].ly; } return { idx, rx: rx / idx.length, ry: ry / idx.length }; }
  function fit(g) {
    const n = g.idx.length; let cx = 0, cy = 0; for (const i of g.idx) { cx += P[i].x; cy += P[i].y; } cx /= n; cy /= n;
    let sa = 0, sb = 0; for (const i of g.idx) { const p = P[i], qx = p.lx - g.rx, qy = p.ly - g.ry, ux = p.x - cx, uy = p.y - cy; sa += qx * ux + qy * uy; sb += qx * uy - qy * ux; }
    g.c = Math.cos(Math.atan2(sb, sa)); g.s = Math.sin(Math.atan2(sb, sa)); g.cx = cx; g.cy = cy;
  }
  function matchGroup(g, alpha) {
    fit(g); let dev = 0, at = -1;
    for (let k = 0; k < g.idx.length; k++) {
      const p = P[g.idx[k]], qx = p.lx - g.rx, qy = p.ly - g.ry, gx = g.cx + g.c * qx - g.s * qy, gy = g.cy + g.s * qx + g.c * qy, ex = gx - p.x, ey = gy - p.y, d = Math.hypot(ex, ey);
      if (d > dev) { dev = d; at = k; }
      if (alpha) { p.x += ex * alpha; p.y += ey * alpha; }
    }
    return { dev, at };
  }
  function dist(a, b) { return Math.hypot(P[a].x - P[b].x, P[a].y - P[b].y); }
  const nearest = (bi, u, v, n) => bodies[bi].idx.map((i) => ({ i, d: Math.hypot(P[i].x - u, P[i].y - v) })).sort((a, b) => a.d - b.d || a.i - b.i).slice(0, n).map((q) => q.i);
  const pin = (u, v) => mk(u, v, 0, 0, -1);

  // koblinger
  const links = [];
  // R30: en vippe har et fast dreiepunkt i midten (ligger som et skjult ledd mot underlaget, så den svinger fritt men faller ikke)
  const pivots = def.placed.filter((p) => partType(p.type).pivot).map((p) => ({ id: p.id + '_dreie', kind: 'pivot', a: p.id, b: null, la: { x: 0, y: 0 }, g: { u: p.u, v: p.v } }));
  for (const l of [...(def.links || []), ...pivots]) {
    const ai = bodyOf.get(l.a); if (ai === undefined) continue;
    const bi = l.b ? bodyOf.get(l.b) : -1; if (l.b && bi === undefined) continue;
    const A = bodies[ai].part, wa = toWorldPt(A, l.la.x, l.la.y), B = l.b ? bodies[bi].part : null;
    const wb = l.b ? toWorldPt(B, l.lb.x, l.lb.y) : { u: l.g.u, v: l.g.v };
    const link = { id: l.id, kind: l.kind, a: ai, b: bi, cons: [], broken: false, over: 0, snap: LINK_SNAP[l.kind] * strength, pa: -1, pb: -1, hidden: l.kind === 'pivot' };
    if (l.kind === 'rope') {
      link.pa = nearest(ai, wa.u, wa.v, 1)[0]; link.pb = bi >= 0 ? nearest(bi, wb.u, wb.v, 1)[0] : pin(wb.u, wb.v);
      const c = { a: link.pa, b: link.pb, rest: dist(link.pa, link.pb) + 0.3, k: 1, type: 'max', link }; cons.push(c); link.cons.push(c);
    } else {
      const na = nearest(ai, wa.u, wa.v, l.kind === 'tape' ? 2 : 1);
      link.pa = na[0];
      if (bi >= 0) {
        const nb = nearest(bi, wb.u, wb.v, l.kind === 'tape' ? 2 : 1); link.pb = nb[0];
        for (const x of na) for (const y of nb) { const c = { a: x, b: y, rest: dist(x, y), k: 1, type: 'eq', link }; cons.push(c); link.cons.push(c); }
        noCol.add(ai < bi ? `${ai},${bi}` : `${bi},${ai}`);
      } else {
        for (const x of na) { const q = pin(P[x].x, P[x].y); if (x === link.pa) link.pb = q; const c = { a: x, b: q, rest: 0, k: 1, type: 'eq', link }; cons.push(c); link.cons.push(c); }
      }
    }
    links.push(link);
  }

  // testfiguren
  const st = siteStart(site), goal = siteGoal(site);
  const fig = bodies.length; bodies.push({ id: 'figur', kind: 'ball', idx: [], groups: [] });
  const fi = mk(st.u, st.v + FIG_R, 1, FIG_R, fig); bodies[fig].idx.push(fi);
  const F = P[fi]; let supported = false, blocked = false, hopCd = 0;
  const state = { t: 0, state: 'run', reason: '', won: 0, stuckX: F.x, stuckT: 0 };

  // start: løft deler som ligger delvis inne i underlaget rett opp (ellers skyter de av gårde)
  for (const B of bodies) {
    let lift = 0; for (const i of B.idx) for (const bx of boxes) { const p = P[i]; if (p.x > bx.x0 - p.r && p.x < bx.x1 + p.r && p.y < bx.y1 + p.r && p.y > bx.y0) lift = Math.max(lift, bx.y1 + p.r - p.y); }
    if (lift > 0 && lift < 1) for (const i of B.idx) { P[i].y += lift; P[i].py = P[i].y; }
  }
  const nb = bodies.length;
  const bbox = bodies.map(() => ({ x0: 0, y0: 0, x1: 0, y1: 0 }));
  const noColide = (a, b) => noCol.has(a < b ? `${a},${b}` : `${b},${a}`);

  function collidePair(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y, rr = a.r + b.r, d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr) return;
    const d = Math.sqrt(d2) || 1e-9, nx = d2 > 1e-18 ? dx / d : 0, ny = d2 > 1e-18 ? dy / d : 1, pen = rr - d, ws = a.w + b.w; if (!ws) return;
    const ca = pen * a.w / ws, cb = pen * b.w / ws;
    a.x += nx * ca; a.y += ny * ca; b.x -= nx * cb; b.y -= ny * cb;
    // friksjon: demp sidelengs bevegelse mellom de to i dette steget
    const rx = (a.x - a.px) - (b.x - b.px), ry = (a.y - a.py) - (b.y - b.py), tn = rx * nx + ry * ny, tx = rx - tn * nx, ty = ry - tn * ny, tl = Math.hypot(tx, ty);
    if (tl > 1e-12) { const f = Math.min(1, ((a === F || b === F) ? FIG_FRICTION : FRICTION) * pen / tl); a.x -= tx * f * a.w / ws; a.y -= ty * f * a.w / ws; b.x += tx * f * b.w / ws; b.y += ty * f * b.w / ws; }
    if (a === F || b === F) { const s = a === F ? 1 : -1; if (ny * s > 0.5) supported = true; if (nx * s < -0.5) blocked = true; }
  }
  function collideBox(p, bx) {
    const cx = Math.min(bx.x1, Math.max(bx.x0, p.x)), cy = Math.min(bx.y1, Math.max(bx.y0, p.y)); let dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy), nx, ny, pen;
    if (d >= p.r) return;
    if (d > 1e-9) { nx = dx / d; ny = dy / d; pen = p.r - d; }
    else { const l = p.x - bx.x0, r = bx.x1 - p.x, bt = p.y - bx.y0, tp = bx.y1 - p.y, m = Math.min(l, r, bt, tp); if (m === tp) { nx = 0; ny = 1; } else if (m === l) { nx = -1; ny = 0; } else if (m === r) { nx = 1; ny = 0; } else { nx = 0; ny = -1; } pen = m + p.r; }
    p.x += nx * pen; p.y += ny * pen;
    const rx = p.x - p.px, ry = p.y - p.py, tn = rx * nx + ry * ny, tx = rx - tn * nx, ty = ry - tn * ny, tl = Math.hypot(tx, ty);
    if (tl > 1e-12) { const f = Math.min(1, (p === F ? FIG_FRICTION : FRICTION) * pen / tl); p.x -= tx * f; p.y -= ty * f; }
    if (p === F) { if (ny > 0.5) supported = true; if (nx < -0.5) blocked = true; }
  }
  function solveCon(c) {
    const a = P[c.a], b = P[c.b], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < 1e-9) return;
    if (c.type === 'max' && d <= c.rest) return;
    const ws = a.w + b.w; if (!ws) return;
    const f = (d - c.rest) / d * c.k / ws; if (c.link) c.lam += (d - c.rest) * c.k / ws;
    a.x += a.w * f * dx; a.y += a.w * f * dy; b.x -= b.w * f * dx; b.y -= b.w * f * dy;
  }
  function updateBoxes() {
    for (let i = 0; i < nb; i++) { const bb = bbox[i]; bb.x0 = bb.y0 = Infinity; bb.x1 = bb.y1 = -Infinity; for (const k of bodies[i].idx) { const p = P[k]; if (p.x < bb.x0) bb.x0 = p.x; if (p.x > bb.x1) bb.x1 = p.x; if (p.y < bb.y0) bb.y0 = p.y; if (p.y > bb.y1) bb.y1 = p.y; } bb.x0 -= 0.7; bb.y0 -= 0.7; bb.x1 += 0.7; bb.y1 += 0.7; }
  }

  function substep(h) {
    // fart og posisjon
    const drive = state.state === 'run' && state.t >= SETTLE && !opts.hold;   // hold: figuren står stille (brukes til å finne hvor delene lander, se settledPlaced)
    if (drive) { const tgt = FIG_SPEED, ac = supported ? 14 : 3; F.vx += (tgt - F.vx) * Math.min(1, ac * h); if (supported && blocked && hopCd <= 0) { F.vy = FIG_HOP; hopCd = 0.45; events.push({ type: 'hop', u: F.x, v: F.y }); } }
    hopCd -= h; supported = false; blocked = false; const calm = state.t < SETTLE;
    for (const p of P) { if (!p.w) continue; p.vy -= G * h; p.px = p.x; p.py = p.y; p.x += p.vx * h; p.y += p.vy * h; }
    updateBoxes(); for (const c of cons) if (c.link) c.lam = 0;
    for (let it = 0; it < ITER; it++) {
      for (const B of bodies) for (const g of B.groups) matchGroup(g, B.alpha);
      for (const c of cons) if (!c.link || !c.link.broken) solveCon(c);
      for (let i = 0; i < nb; i++) for (let j = i + 1; j < nb; j++) {
        const A = bbox[i], B = bbox[j]; if (A.x1 < B.x0 || B.x1 < A.x0 || A.y1 < B.y0 || B.y1 < A.y0 || noColide(i, j)) continue;
        for (const ia of bodies[i].idx) for (const ib of bodies[j].idx) collidePair(P[ia], P[ib]);
      }
      for (const p of P) if (p.w) for (const bx of boxes) collideBox(p, bx);
    }
    for (const c of cons) if (c.link) c.f = Math.abs(c.lam) / (h * h);
    for (const p of P) { if (!p.w) continue; p.vx = calm ? 0 : (p.x - p.px) / h; p.vy = calm ? 0 : (p.y - p.py) / h; const sp = Math.hypot(p.vx, p.vy); if (sp > 60) { p.vx *= 60 / sp; p.vy *= 60 / sp; } p.vx *= 0.9995; p.vy *= 0.9995; }
  }

  function checkBreaks() {
    // planker: avstand fra stiv form (nedbøyning). For stor nedbøyning: planken brekker der den bøyer mest
    for (let bi = 0; bi < bodies.length; bi++) {
      const B = bodies[bi]; if (B.kind !== 'chain') continue;
      let worst = 0;
      for (let gi = 0; gi < B.groups.length; gi++) {
        const g = B.groups[gi], r = matchGroup(g, 0); if (r.dev > worst) worst = r.dev;
        if (r.dev > B.snap && g.idx.length >= 4) {
          // brekkpunkt: der vinkelen mellom to biter er størst (men ikke helt ytterst)
          let best = 1, ba = -1;
          for (let k = 1; k + 1 < g.idx.length; k++) { const a = P[g.idx[k - 1]], m = P[g.idx[k]], c = P[g.idx[k + 1]], ux = m.x - a.x, uy = m.y - a.y, vx = c.x - m.x, vy = c.y - m.y, ang = Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)); if (ang > ba) { ba = ang; best = k; } }
          const L = g.idx.slice(0, best + 1), R = g.idx.slice(best + 1); B.groups.splice(gi, 1, mkGroup(L), mkGroup(R)); B.broken = true;
          events.push({ type: 'break', id: B.id, u: P[g.idx[best]].x, v: P[g.idx[best]].y, t: state.t }); gi++;
        }
      }
      B.stress = Math.min(1.5, worst / B.snap);
      if (B.stress > 0.6 && state.t - B.creakT > 0.9) { B.creakT = state.t; events.push({ type: 'creak', id: B.id, stress: B.stress }); }
    }
    // koblinger: for stort strekk i noen steg på rad
    for (const l of links) {
      if (l.broken) continue; let over = 0;
      for (const c of l.cons) over += c.f || 0;
      l.over = over > l.snap ? l.over + 1 : 0; l.stress = Math.min(1.5, over / l.snap);
      if (l.over >= 3) { l.broken = true; events.push({ type: 'linkbreak', id: l.id, kind: l.kind, u: P[l.pa].x, v: P[l.pa].y, t: state.t }); }
    }
  }

  function step() {
    if (state.state !== 'run') return state;
    for (let s = 0; s < SUB; s++) substep(DT / SUB);
    state.t += DT; if (state.t >= SETTLE) checkBreaks();
    // seier / tap
    if (F.y < -6) { state.state = 'lost'; state.reason = 'fell'; events.push({ type: 'lose', why: 'fell', u: F.x, v: F.y }); events.push({ type: 'splash', u: F.x, v: F.y }); }
    else if (F.x >= goal.u && F.y >= goal.v + FIG_R - 0.35 && supported) { state.won += DT; if (state.won >= 0.3) { state.state = 'won'; events.push({ type: 'win', u: F.x, v: F.y }); } }
    else state.won = 0;
    if (state.state === 'run') {
      if (Math.abs(F.x - state.stuckX) > 0.4) { state.stuckX = F.x; state.stuckT = state.t; }
      if (state.t - state.stuckT > 5) { state.state = 'lost'; state.reason = 'stuck'; events.push({ type: 'lose', why: 'stuck', u: F.x, v: F.y }); }
      else if (state.t >= MAX_T) { state.state = 'lost'; state.reason = 'time'; events.push({ type: 'lose', why: 'time', u: F.x, v: F.y }); }
    }
    return state;
  }

  // visning: planker som kjeder (synlig nedbøyning), klosser som rektangler, koblinger, testfiguren
  function pose() {
    const parts = bodies.slice(0, fig).map((B) => {
      const pts = B.idx.map((i) => ({ u: P[i].x, v: P[i].y }));
      if (B.kind === 'chain') {
        const segs = B.groups.map((g) => g.idx.map((i) => ({ u: P[i].x, v: P[i].y })));
        return { id: B.id, type: B.type, kind: 'chain', pts, segs, broken: B.broken, stress: B.stress };
      }
      const a = P[B.idx[0]], b = P[B.idx[1]], n = B.idx.length; let cx = 0, cy = 0; for (const i of B.idx) { cx += P[i].x; cy += P[i].y; }
      return { id: B.id, type: B.type, kind: 'rect', u: cx / n, v: cy / n, rot: Math.atan2(b.y - a.y, b.x - a.x), pts, broken: false, stress: 0 };
    });
    return {
      parts, figure: { u: F.x, v: F.y, r: FIG_R, vx: F.vx, vy: F.vy, supported },
      links: links.filter((l) => !l.hidden).map((l) => ({ id: l.id, kind: l.kind, broken: l.broken, stress: l.stress || 0, a: { u: P[l.pa].x, v: P[l.pa].y }, b: { u: P[l.pb].x, v: P[l.pb].y }, len: l.kind === 'rope' ? l.cons[0].rest : 0 })),
    };
  }
  const drain = () => events.splice(0, events.length);
  return { step, pose, drain, state, figure: F, get t() { return state.t; }, breaks: () => bodies.filter((b) => b.broken).map((b) => b.id) };
}

// R26: hvor delene kommer til å ligge når de har satt seg (klosser faller ned på hverandre, løftes opp av underlaget): brukes når bygget flyttes ut i verdenen.
// Planker settes rett (nedbøyningen er bare visuell i verden). Samme fast tidssteg, så samme bygg gir alltid samme resultat.
export function settledPlaced(def, opts = {}) {
  const sim = createSim(def, { ...opts, hold: true }), n = Math.round((opts.secs ?? 1.5) / DT);
  for (let i = 0; i < n && sim.state.state === 'run'; i++) sim.step();
  const by = new Map(sim.pose().parts.map((p) => [p.id, p]));
  return def.placed.map((d) => {
    const p = by.get(d.id); if (!p) return { ...d };
    if (p.kind === 'rect') return { id: d.id, type: d.type, u: p.u, v: p.v, rot: p.rot };
    const a = p.pts[0], b = p.pts[p.pts.length - 1];       // rett linje mellom endene (der planken hviler); synlig nedbøyning faker vi bare
    return { id: d.id, type: d.type, u: (a.u + b.u) / 2, v: (a.v + b.v) / 2, rot: Math.atan2(b.v - a.v, b.u - a.u) };
  });
}

// kjør en hel prøve uten visning (tester og bevis). Returnerer { result: 'won'|'lost', reason, t, breaks: [{id,u,v}], linkBreaks }
export function runSim(def, opts = {}) {
  const sim = createSim(def, opts), breaks = [], linkBreaks = []; const maxT = opts.maxT ?? MAX_T;
  while (sim.state.state === 'run' && sim.t < maxT + 0.001) {
    sim.step();
    for (const e of sim.drain()) { if (e.type === 'break') breaks.push({ id: e.id, u: e.u, v: e.v, t: e.t }); else if (e.type === 'linkbreak') linkBreaks.push({ id: e.id, kind: e.kind, u: e.u, v: e.v, t: e.t }); }
  }
  return { result: sim.state.state === 'won' ? 'won' : 'lost', reason: sim.state.reason, t: +sim.t.toFixed(3), breaks, linkBreaks, figure: { u: sim.figure.x, v: sim.figure.y } };
}
