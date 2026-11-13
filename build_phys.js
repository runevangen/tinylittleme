// R25: byggeskjermens 2D-fysikk (ren logikk: ingen DOM, ingen three.js, kjøres i node).
// Modellen er «posisjonsbasert»: hver del er bygd av små kuler (samme oppsett som `layout` i build_logic.js), holdt sammen av avstandsbånd.
//  - klosser og vekter: alle kuler stivt låst til hverandre (vekt = mange ganger tyngre)
//  - planker: en kjede av kuler med et mykt «bøyebånd» (hver kule mot nummer to bortover): bøyer seg synlig, og brekker når vinkelen mellom to biter blir for stor
//  - tape: stiv sveis mellom to deler (eller del og underlag), ryker når den strekkes for mye; ledd: ett festepunkt som svinger; tau: bare en maksavstand (trekker, skyver ikke)
//  - testfiguren er en liten rund fyr som går mot høyre og hopper når den støter mot noe
// R49a1: planker brekker nå av BØYEMOMENT, ikke av vinkel. Formtilpasningen virker som elastiske krefter (masse · rettelse / h²) på kulene; summen av dem på den ene siden av et snitt
//  er kraften og momentet planken faktisk overfører over snittet (statikk). Brudd når momentet over delens kapasitet: kapasitet ∝ materiale · dybde² (profil), stivhet ∝ dybde³.
//  Last nær opplager gir lite moment (a·(L−a)/L), midt på mye; en støtte under kutter spennet; sammenteipede lag får `composite`-faktor etter antall og plassering av tapepunkter.
// Delene og koblingene løses i en fast rekkefølge uavhengig av hvilken rekkefølge de ble plassert i (sortert etter geometri), så samme bygg gir alltid samme resultat uansett.
// Fast tidssteg og fast rekkefølge: samme bygg gir alltid samme resultat (se test_buildphys.mjs).
import { partType, layout, toWorldPt, PR } from './build_logic.js';
import { MATERIALS, BAND, buckleLoad, tensionCap, crushCap, FRIC_DEFAULT, CRUSH_FILTER } from './build_materials.js';   // R49a2: materialtabell (inkl. R46-lekene)
import { loadParams, driveSpeed, isLoad, DEFAULT_LOAD } from './build_loads.js';   // R48: leker som testlast

const MOM_FILTER = 0.03;                             // R49a1: glatting av momentet per delsteg (demper støt og numerisk støy)
const TAPE_LAMINATE = 4;                            // R49a1: skjærstyrke for teip mellom parallelle planker (× LINK_SNAP.tape)
const COMP_K = 0.25;                                  // R49a1: hvor mange tapepunkter (veid) som skal til for å nå halv sammensatt virkning
export const DT = 1 / 60, SUB = 2, ITER = 6;
export const G = 32;                    // tyngde (enheter/s²); en enhet = 5 cm, men spillet skal føles tungt og lesbart
export const FIG_R = 0.4;               // testfigurens radius
export const FIG_SPEED = 3.4, FIG_HOP = 11.5;
export const SETTLE = 0.25;              // først en rolig start så overlapp og tyngde setter seg
export const MAX_T = 30;                // lengste prøve (s)
// materialer: tabellen står i build_materials.js (masse, stivhet, bøyekapasitet, E, trykk- og strekkstyrke, sprøhet, demping, friksjon)
export const MATERIAL = { ...MATERIALS };
export const LINK_SNAP = { tape: 1000, hinge: 6000, rope: 1100, band: BAND.snap, pivot: 30000 };   // kraft (masse·enhet/s²) som får koblingen til å ryke; en vekt henger med 1440, en kloss med 288, så tau og tape ryker av en hengende vekt, ledd holder
const FRICTION = 0.7;

const mat = (t) => MATERIAL[t] || MATERIAL.block;
const isChain = (t) => { const ty = partType(t); return ty.w >= ty.h * 2; };

// byggestedets faste flater: dekk (hyller/kanter) som rektangler, topp = v (standard 0), 5 enheter tykke
export function siteBoxes(site) {
  const hw = site.w / 2, dk = Array.isArray(site.deck) && site.deck.length ? site.deck : [{ u0: -hw - 6, u1: -hw }, { u0: hw, u1: hw + 6 }];
  return dk.map((d) => { const top = d.top || 0; return { x0: d.u0, x1: d.u1, y0: top - 5, y1: top }; });
}
export const siteStart = (site) => ({ u: site.start?.u ?? -site.w / 2 + 1, v: site.start?.v ?? 0 });
export const siteGoal = (site) => ({ u: site.goal?.u ?? site.w / 2 - 1, v: site.goal?.v ?? 0 });

// def: { site, placed: [{id,type,u,v,rot}], links: [...] (se build_logic.addLink) }, opts: { strength = 1 (skalerer brekkgrensene), load = 'figure' (testlast, se build_loads.js), hold }
export function createSim(def, opts = {}) {
  const site = def.site, strength = opts.strength ?? 1, boxes = siteBoxes(site);
  const P = [], bodies = [], cons = [], noCol = new Set(), events = [];
  const bodyOf = new Map();
  const mk = (x, y, w, r, b) => { const p = { x, y, px: x, py: y, vx: 0, vy: 0, w, r, b }; P.push(p); return P.length - 1; };

  // R49a1: fast løsningsrekkefølge uavhengig av plasseringsrekkefølge: delene sorteres etter geometri (type, u, v, rot), id bare som siste avgjører
  const q6 = (x) => Math.round((x || 0) * 1e6);
  const orig = new Map(def.placed.map((p, i) => [p.id, i]));
  const sorted = [...def.placed].sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : 0) || q6(a.u) - q6(b.u) || q6(a.v) - q6(b.v) || q6(a.rot) - q6(b.rot) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const part of sorted) {
    const t = part.type, M = mat(t), lay = layout(t), bi = bodies.length, chain = isChain(t), rad = chain && M.d > 1 ? Math.max(PR, partType(t).h / 2) : PR;   // høye bjelker (dybde > 1) har tykke kuler så formen og kontakten stemmer med tegningen
    const idx = lay.map((q) => { const w = toWorldPt(part, q.x, q.y); const k = mk(w.u, w.v, 1 / M.m, rad, bi); P[k].lx = q.x; P[k].ly = q.y; P[k].sx = 0; P[k].sy = 0; if (M.damp) P[k].d = M.damp; return k; });
    const ty = partType(t), body = { id: part.id, bi, oi: orig.get(part.id), type: t, kind: chain ? 'chain' : 'rect', idx, groups: [], alpha: M.alpha ?? 1, mcap: (M.mcap || (M.snap || 99) * 100) * strength, comp: 0, stress: 0, creakT: -9, broken: false, part,
      pcr: chain ? buckleLoad(t, ty.w, ty.h) * strength : 0, tcap: chain ? tensionCap(t, ty.h) * strength : 0, ccapC: chain ? crushCap(t, ty.h) * strength : 0, ccap: chain ? 0 : crushCap(t, Math.min(ty.w, ty.h)) * strength,   // R49a2: knekk-, strekk- og knusekapasitet
      brittle: M.brittle ?? 1, duct: M.duct || 0, nc: 0, nt: 0, cf: 0, shattered: false, bars: [], yielded: false };
    for (const i of idx) P[i].fr = M.fric ?? FRIC_DEFAULT;
    if (chain) for (let k = 0; k + 1 < idx.length; k++) { const a = P[idx[k]], b = P[idx[k + 1]], c = { type: 'bar', a: idx[k], b: idx[k + 1], rest: Math.hypot(a.x - b.x, a.y - b.y), k: M.axial ?? 1, bar: true, off: false, lam: 0 }; cons.push(c); body.bars.push(c); }   // R49a2: stav mellom nabokuler: delen kan ikke strekkes eller presses sammen, og kraften langs den (trykk/strekk) leses av her
    body.groups.push(mkGroup(idx));
    bodies.push(body); bodyOf.set(part.id, bi);
  }
  // en gruppe = kuler som holdes mot sin stive form («formtilpasning»); en brukket planke blir to grupper
  function mkGroup(idx) { let rx = 0, ry = 0; for (const i of idx) { rx += P[i].lx; ry += P[i].ly; } return { idx, rx: rx / idx.length, ry: ry / idx.length, mf: 0, at: 0 }; }
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
      if (alpha) { p.x += ex * alpha; p.y += ey * alpha; p.sx += ex * alpha; p.sy += ey * alpha; }   // sx/sy: summen av rettelsene = den elastiske kraften (·m/h²) som R49a1 leser momentet av
    }
    return { dev, at };
  }
  // R49a1: bøyemoment langs en kjede (kuler i rekkefølge). Kraft per kule = masse · samlet rettelse / h². Momentet i snitt k = momentet (om snittpunktet) av kreftene på kulene til venstre for snittet.
  function moments(g, h) {
    let sfx = 0, sfy = 0, sm = 0, best = 0, at = 0; const n = g.idx.length, k2 = 1 / (h * h);
    for (let k = 0; k + 1 < n; k++) {
      const p = P[g.idx[k]], m = p.w ? 1 / p.w : 0, fx = p.sx * m * k2, fy = p.sy * m * k2;
      sfx += fx; sfy += fy; sm += p.x * fy - p.y * fx;
      const q = P[g.idx[k + 1]], xc = (p.x + q.x) / 2, yc = (p.y + q.y) / 2, M = Math.abs(sm - (xc * sfy - yc * sfx));
      if (M > best) { best = M; at = k; }
    }
    return { m: best, at };
  }
  function cutBars(B, i, j) { for (const s of B.bars) if (s.a === i && s.b === j) s.off = true; }
  function bodyCenter(B) { let x = 0, y = 0; for (const i of B.idx) { x += P[i].x; y += P[i].y; } return { x: x / B.idx.length, y: y / B.idx.length }; }
  function dist(a, b) { return Math.hypot(P[a].x - P[b].x, P[a].y - P[b].y); }
  const nearest = (bi, u, v, n) => bodies[bi].idx.map((i) => ({ i, d: Math.hypot(P[i].x - u, P[i].y - v) })).sort((a, b) => a.d - b.d || a.i - b.i).slice(0, n).map((q) => q.i);
  const pin = (u, v) => mk(u, v, 0, 0, -1);
  // R49a2: et punkt festet til to nabokuler: p = P1 + a·d + b·n (d = P2−P1, n = d vridd 90°). Følger delen, også når den bøyer seg.
  function pinAt(bi, u, v) {
    const [i, j] = nearest(bi, u, v, 2), P1 = P[i], P2 = P[j ?? i], dx = P2.x - P1.x, dy = P2.y - P1.y, d2 = dx * dx + dy * dy || 1, ex = u - P1.x, ey = v - P1.y;
    return j === undefined ? { i, j: i, a: 0, b: 0, ox: ex, oy: ey } : { i, j, a: (ex * dx + ey * dy) / d2, b: (-ex * dy + ey * dx) / d2, ox: 0, oy: 0 };
  }
  const pinPt = (q) => { const P1 = P[q.i], P2 = P[q.j], dx = P2.x - P1.x, dy = P2.y - P1.y; return { x: P1.x + q.a * dx - q.b * dy + q.ox, y: P1.y + q.a * dy + q.b * dx + q.oy }; };

  // koblinger
  const links = [];
  // R30: en vippe har et fast dreiepunkt i midten (ligger som et skjult ledd mot underlaget, så den svinger fritt men faller ikke)
  const pivots = def.placed.filter((p) => partType(p.type).pivot).map((p) => ({ id: p.id + '_dreie', kind: 'pivot', a: p.id, b: null, la: { x: 0, y: 0 }, g: { u: p.u, v: p.v } }));
  const rank = (id) => { const i = bodyOf.get(id); return i === undefined ? -1 : i; };
  const lkey = (l) => [l.kind === 'tape' ? 0 : l.kind === 'hinge' ? 1 : l.kind === 'rope' ? 2 : l.kind === 'band' ? 4 : 3, rank(l.a), l.b ? rank(l.b) : -1, q6(l.la?.x), q6(l.la?.y), q6(l.lb?.x), q6(l.lb?.y), q6(l.g?.u), q6(l.g?.v)];
  const linkOrder = (def.links || []).map((l, i) => ({ l, i, k: lkey(l) })).sort((a, b) => { for (let j = 0; j < a.k.length; j++) if (a.k[j] !== b.k[j]) return a.k[j] - b.k[j]; return a.i - b.i; }).map((o) => o.l);
  const origLink = new Map((def.links || []).map((l, i) => [l.id, i]));
  for (const l of [...linkOrder, ...pivots]) {
    const ai = bodyOf.get(l.a); if (ai === undefined) continue;
    const bi = l.b ? bodyOf.get(l.b) : -1; if (l.b && bi === undefined) continue;
    const A = bodies[ai].part, wa = toWorldPt(A, l.la.x, l.la.y), B = l.b ? bodies[bi].part : null;
    const wb = l.b ? toWorldPt(B, l.lb.x, l.lb.y) : { u: l.g.u, v: l.g.v };
    const link = { id: l.id, oi: origLink.get(l.id) ?? 1e9, la: l.la, lb: l.lb, kind: l.kind, a: ai, b: bi, cons: [], broken: false, over: 0, snap: LINK_SNAP[l.kind] * strength, pa: -1, pb: -1, hidden: l.kind === 'pivot' };
    if (l.kind === 'band') {
      link.pa = nearest(ai, wa.u, wa.v, 1)[0]; link.pb = bi >= 0 ? nearest(bi, wb.u, wb.v, 1)[0] : pin(wb.u, wb.v);
      const c = { a: link.pa, b: link.pb, rest: dist(link.pa, link.pb), k: 1, type: 'band', link, lam: 0 }; cons.push(c); link.cons.push(c);
    } else if (l.kind === 'rope') {
      link.pa = nearest(ai, wa.u, wa.v, 1)[0]; link.pb = bi >= 0 ? nearest(bi, wb.u, wb.v, 1)[0] : pin(wb.u, wb.v);
      const c = { a: link.pa, b: link.pb, rest: dist(link.pa, link.pb) + 0.3, k: 1, type: 'max', link }; cons.push(c); link.cons.push(c);
    } else if (l.kind === 'hinge' && bi >= 0) {      // R49a2: et ledd er et ekte punktledd (fjerner to frihetsgrader): punktet er festet til to nabokuler i hver del, så en trekant av tre ledd-forbundne planker blir stiv
      const A = pinAt(ai, wa.u, wa.v), Bq = pinAt(bi, wb.u, wb.v); link.pa = A.i; link.pb = Bq.i;
      const c = { type: 'pin', A, B: Bq, link, lx: 0, ly: 0 }; cons.push(c); link.cons.push(c); noCol.add(ai < bi ? `${ai},${bi}` : `${bi},${ai}`);
    } else {
      const na = nearest(ai, wa.u, wa.v, l.kind === 'tape' ? 2 : 1);
      link.pa = na[0];
      if (bi >= 0) {
        const nb = nearest(bi, wb.u, wb.v, l.kind === 'tape' ? 2 : 1); link.pb = nb[0];
        for (const x of na) for (const y of nb) { const c = { a: x, b: y, rest: dist(x, y), k: 1, type: 'eq', link }; cons.push(c); link.cons.push(c); }
        if (!(l.kind === 'tape' && bodies[ai].kind === 'chain' && bodies[bi].kind === 'chain')) noCol.add(ai < bi ? `${ai},${bi}` : `${bi},${ai}`);   // R49a1: sammenteipede planker (lag) trykker fortsatt mot hverandre, ellers bærer teipen hele lasten alene
      } else {
        for (const x of na) { const q = pin(P[x].x, P[x].y); if (x === link.pa) link.pb = q; const c = { a: x, b: q, rest: 0, k: 1, type: 'eq', link }; cons.push(c); link.cons.push(c); }
      }
    }
    links.push(link);
  }

  // R49a1: sammenteipede lag (to parallelle planker med tape mellom): tape overfører skjær, så lagene virker mer sammen. Tapepunkt nær midten overfører lite (der er skjæret null), nær endene mye.
  // composite γ = Σw / (Σw + COMP_K) i 0..1; hvert lag får moment-kapasitet ×(1+γ) og stivhet ×(1+3γ): to like lag helt sammensatt = 4× (som én dobbelt så dyp bjelke).
  {
    const pair = new Map();
    for (const l of links) {
      if (l.kind !== 'tape' || l.b < 0) continue; const A = bodies[l.a], B = bodies[l.b]; if (A.kind !== 'chain' || B.kind !== 'chain') continue;
      if (Math.abs(Math.sin((A.part.rot || 0) - (B.part.rot || 0))) > 0.3) continue;
      const hl = Math.min(partType(A.type).w, partType(B.type).w) / 2, s = Math.min(1, Math.abs(l.la.x) / (0.9 * hl)), key = l.a + ',' + l.b;
      pair.set(key, (pair.get(key) || 0) + 0.25 + 0.75 * s);
      l.snap *= TAPE_LAMINATE;   // teip langs en flate mellom to planker tåler mer enn teip mellom vilkårlige deler
    }
    for (const [key, w] of pair) { const [a, b] = key.split(',').map(Number), gm = w / (w + COMP_K); for (const [i, j] of [[a, b], [b, a]]) { const B = bodies[i]; B.comp = Math.max(B.comp, gm); (B.partners || (B.partners = [])).push(j); } }
    for (const B of bodies) if (B.comp) { B.mcap *= 1 + B.comp; B.alpha = Math.min(1, B.alpha * (1 + 3 * B.comp)); B.pcr *= 1 + 3 * B.comp; B.tcap *= 1 + B.comp; }   // R49a2: lagdelt: knekker senere (stivhet), tåler mer strekk
  }

  // testfiguren
  const st = siteStart(site), goal = siteGoal(site);
  const fig = bodies.length; bodies.push({ id: 'figur', kind: 'ball', idx: [], groups: [] });
  const loadId = isLoad(opts.load) ? opts.load : DEFAULT_LOAD, LD = loadParams(loadId);   // R48: lasten har egen masse, radius, fart og friksjon
  const fi = mk(st.u, st.v + LD.r, 1 / LD.mass, LD.r, fig); bodies[fig].idx.push(fi);
  const F = P[fi]; let supported = false, blocked = false, hopCd = 0;
  const state = { t: 0, state: 'run', reason: '', won: 0, stuckX: F.x, stuckT: 0 };

  // start: løft deler som ligger delvis inne i underlaget rett opp (ellers skyter de av gårde)
  for (const B of bodies) {
    let lift = 0; for (const i of B.idx) for (const bx of boxes) { const p = P[i]; if (p.x > bx.x0 - p.r && p.x < bx.x1 + p.r && p.y < bx.y1 + p.r && p.y > bx.y0) lift = Math.max(lift, bx.y1 + p.r - p.y); }
    if (lift > 0 && lift < 1) for (const i of B.idx) { P[i].y += lift; P[i].py = P[i].y; }
  }
  const nb = bodies.length, cl = new Float64Array(nb);   // cl: kontaktimpuls per del i dette delsteget (til knusing av klosser)
  const bbox = bodies.map(() => ({ x0: 0, y0: 0, x1: 0, y1: 0 }));
  const noColide = (a, b) => noCol.has(a < b ? `${a},${b}` : `${b},${a}`);

  function collidePair(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y, rr = a.r + b.r, d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr) return;
    const d = Math.sqrt(d2) || 1e-9, nx = d2 > 1e-18 ? dx / d : 0, ny = d2 > 1e-18 ? dy / d : 1, pen = rr - d, ws = a.w + b.w; if (!ws) return;
    const ca = pen * a.w / ws, cb = pen * b.w / ws; cl[a.b] += pen / ws; cl[b.b] += pen / ws;
    a.x += nx * ca; a.y += ny * ca; b.x -= nx * cb; b.y -= ny * cb;
    // friksjon: demp sidelengs bevegelse mellom de to i dette steget
    const rx = (a.x - a.px) - (b.x - b.px), ry = (a.y - a.py) - (b.y - b.py), tn = rx * nx + ry * ny, tx = rx - tn * nx, ty = ry - tn * ny, tl = Math.hypot(tx, ty);
    if (tl > 1e-12) { const f = Math.min(1, ((a === F || b === F) ? LD.fric : ((a.fr ?? FRIC_DEFAULT) + (b.fr ?? FRIC_DEFAULT)) / 2) * pen / tl); a.x -= tx * f * a.w / ws; a.y -= ty * f * a.w / ws; b.x += tx * f * b.w / ws; b.y += ty * f * b.w / ws; }
    if (a === F || b === F) { const s = a === F ? 1 : -1; if (ny * s > 0.5) supported = true; if (nx * s < -0.5) blocked = true; }
  }
  function collideBox(p, bx) {
    const cx = Math.min(bx.x1, Math.max(bx.x0, p.x)), cy = Math.min(bx.y1, Math.max(bx.y0, p.y)); let dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy), nx, ny, pen;
    if (d >= p.r) return;
    if (d > 1e-9) { nx = dx / d; ny = dy / d; pen = p.r - d; }
    else { const l = p.x - bx.x0, r = bx.x1 - p.x, bt = p.y - bx.y0, tp = bx.y1 - p.y, m = Math.min(l, r, bt, tp); if (m === tp) { nx = 0; ny = 1; } else if (m === l) { nx = -1; ny = 0; } else if (m === r) { nx = 1; ny = 0; } else { nx = 0; ny = -1; } pen = m + p.r; }
    p.x += nx * pen; p.y += ny * pen; if (p.w) cl[p.b] += pen / p.w;
    const rx = p.x - p.px, ry = p.y - p.py, tn = rx * nx + ry * ny, tx = rx - tn * nx, ty = ry - tn * ny, tl = Math.hypot(tx, ty);
    if (tl > 1e-12) { const f = Math.min(1, (p === F ? LD.fric : ((p.fr ?? FRIC_DEFAULT) + FRICTION) / 2) * pen / tl); p.x -= tx * f; p.y -= ty * f; }
    if (p === F) { if (ny > 0.5) supported = true; if (nx < -0.5) blocked = true; }
  }
  function solvePin(c) {
    const A = c.A, B = c.B, pa = pinPt(A), pb = pinPt(B), ex = pb.x - pa.x, ey = pb.y - pa.y, a1 = 1 - A.a, a2 = A.a, b1 = 1 - B.a, b2 = B.a;
    const pA1 = P[A.i], pA2 = P[A.j], pB1 = P[B.i], pB2 = P[B.j], D = a1 * a1 * pA1.w + (A.j !== A.i ? a2 * a2 * pA2.w : 0) + b1 * b1 * pB1.w + (B.j !== B.i ? b2 * b2 * pB2.w : 0);
    if (!D) return; const s = 1 / D; c.lx += ex * s; c.ly += ey * s;
    pA1.x += a1 * pA1.w * ex * s; pA1.y += a1 * pA1.w * ey * s; if (A.j !== A.i) { pA2.x += a2 * pA2.w * ex * s; pA2.y += a2 * pA2.w * ey * s; }
    pB1.x -= b1 * pB1.w * ex * s; pB1.y -= b1 * pB1.w * ey * s; if (B.j !== B.i) { pB2.x -= b2 * pB2.w * ex * s; pB2.y -= b2 * pB2.w * ey * s; }
  }
  // R49a2: gummistrikk = ekte fjær (XPBD): kraft = K · utstrekning, bare i strekk; uavhengig av masse og antall runder
  let curH = DT / SUB;
  function solveBand(c) {
    const a = P[c.a], b = P[c.b], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy), ws = a.w + b.w; if (d < 1e-9 || !ws) return;
    const at = 1 / (BAND.K * curH * curH), nl = Math.min(0, c.lam + (-(d - c.rest) - at * c.lam) / (ws + at)), dl = nl - c.lam; c.lam = nl;
    const nx = dx / d, ny = dy / d; a.x += a.w * dl * nx; a.y += a.w * dl * ny; b.x -= b.w * dl * nx; b.y -= b.w * dl * ny;
  }
  function solveCon(c) {
    if (c.type === 'pin') return solvePin(c);
    if (c.off) return;
    if (c.type === 'band') return solveBand(c);
    const a = P[c.a], b = P[c.b], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < 1e-9) return;
    if (c.type === 'max' && d <= c.rest) return;
    const ws = a.w + b.w; if (!ws) return;
    const f = (d - c.rest) / d * c.k / ws; if (c.link || c.bar) c.lam += (d - c.rest) * c.k / ws;
    a.x += a.w * f * dx; a.y += a.w * f * dy; b.x -= b.w * f * dx; b.y -= b.w * f * dy;
  }
  function updateBoxes() {
    for (let i = 0; i < nb; i++) { const bb = bbox[i]; bb.x0 = bb.y0 = Infinity; bb.x1 = bb.y1 = -Infinity; for (const k of bodies[i].idx) { const p = P[k]; if (p.x < bb.x0) bb.x0 = p.x; if (p.x > bb.x1) bb.x1 = p.x; if (p.y < bb.y0) bb.y0 = p.y; if (p.y > bb.y1) bb.y1 = p.y; } bb.x0 -= 0.7; bb.y0 -= 0.7; bb.x1 += 0.7; bb.y1 += 0.7; }
  }

  function substep(h) {
    // fart og posisjon
    const drive = state.state === 'run' && state.t >= SETTLE && !opts.hold;   // hold: figuren står stille (brukes til å finne hvor delene lander, se settledPlaced)
    if (drive) { const tgt = driveSpeed(loadId, state.t), ac = supported ? LD.acc : LD.accAir; F.vx += (tgt - F.vx) * Math.min(1, ac * h); if (supported && blocked && hopCd <= 0 && LD.hop > 0) { F.vy = LD.hop; hopCd = 0.45; events.push({ type: 'hop', u: F.x, v: F.y }); } }
    hopCd -= h; supported = false; blocked = false; const calm = state.t < SETTLE;
    for (const p of P) { if (!p.w) continue; p.vy -= G * h; p.px = p.x; p.py = p.y; p.x += p.vx * h; p.y += p.vy * h; }
    updateBoxes(); curH = h; cl.fill(0); for (const c of cons) if (c.link || c.bar) { c.lam = 0; c.lx = 0; c.ly = 0; }
    for (const B of bodies) if (B.kind === 'chain') for (const i of B.idx) { P[i].sx = 0; P[i].sy = 0; }
    for (let it = 0; it < ITER; it++) {
      for (const B of bodies) for (const g of B.groups) matchGroup(g, B.alpha);
      for (const c of cons) if (!c.link || !c.link.broken) solveCon(c);
      for (let i = 0; i < nb; i++) for (let j = i + 1; j < nb; j++) {
        const A = bbox[i], B = bbox[j]; if (A.x1 < B.x0 || B.x1 < A.x0 || A.y1 < B.y0 || B.y1 < A.y0 || noColide(i, j)) continue;
        for (const ia of bodies[i].idx) for (const ib of bodies[j].idx) collidePair(P[ia], P[ib]);
      }
      for (const p of P) if (p.w) for (const bx of boxes) collideBox(p, bx);
    }
    for (const c of cons) if (c.link) c.f = (c.type === 'pin' ? Math.hypot(c.lx, c.ly) : Math.abs(c.lam)) / (h * h);
    for (const B of bodies) if (B.kind === 'chain') for (const g of B.groups) { const r = moments(g, h); g.mf += (r.m - g.mf) * MOM_FILTER; g.at = r.at; }   // R49a1: bøyemoment (glattet)
    for (const B of bodies) {      // R49a2: kraft langs delen (stavene) og knusing av klosser, glattet
      if (B.kind === 'chain') { let c = 0, t = 0; for (const s of B.bars) if (!s.off) { const q = s.lam / (h * h); if (-q > c) c = -q; if (q > t) t = q; } B.nc += (c - B.nc) * CRUSH_FILTER; B.nt += (t - B.nt) * CRUSH_FILTER; }
      else if (B.ccap && !B.shattered) B.cf += (cl[B.bi] / (h * h) / 2 - B.cf) * CRUSH_FILTER;
    }
    for (const p of P) { if (!p.w) continue; p.vx = calm ? 0 : (p.x - p.px) / h; p.vy = calm ? 0 : (p.y - p.py) / h; const sp = Math.hypot(p.vx, p.vy); if (sp > 60) { p.vx *= 60 / sp; p.vy *= 60 / sp; } const dm = p.d || 0.9995; p.vx *= dm; p.vy *= dm; }
  }

  function checkBreaks() {
    // planker: bøyemoment over kapasiteten brekker planken i snittet med størst moment (R49a1; før: vinkel/nedbøyning)
    for (let bi = 0; bi < bodies.length; bi++) {
      const B = bodies[bi];
      if (B.kind !== 'chain') {      // R49a2: sprø klosser (bok, legoklosse) knuses av for stor trykkraft; stakken under faller sammen
        if (B.ccap && !B.shattered && B.brittle) { const r = B.cf / B.ccap; B.crush = r; if (r > 1) { B.shattered = true; B.groups = []; const c = bodyCenter(B); events.push({ type: 'break', mode: 'crush', id: B.id, u: c.x, v: c.y, t: state.t, m: +B.cf.toFixed(1), cap: +B.ccap.toFixed(1) }); } else if (r > 0.6 && state.t - B.creakT > 0.9) { B.creakT = state.t; events.push({ type: 'creak', id: B.id, stress: r }); } }
        continue;
      }
      let worst = 0;
      for (let gi = 0; gi < B.groups.length; gi++) {
        const g = B.groups[gi]; let own = g.mf;
        if (B.comp && B.partners) { let sum = own; for (const j of B.partners) sum += Math.max(...bodies[j].groups.map((q) => q.mf)); own += B.comp * (sum / (1 + B.partners.length) - own); }   // sammensatt: lagene deler momentet (i forhold til γ)
        const r = own / B.mcap; if (r > worst) worst = r;
        if (r > 1 && B.duct && g.idx.length >= 4 && r <= 1 + B.duct) {   // R49a2: seige materialer (linjal, svamp) gir etter først: stivheten synker jevnt, og de brekker først langt over grensen
          B.alpha = Math.max(0.01, B.alpha * 0.985); if (!B.yielded) { B.yielded = true; events.push({ type: 'yield', id: B.id, u: P[g.idx[g.at]].x, v: P[g.idx[g.at]].y, t: state.t }); }
        } else if (r > 1 && g.idx.length >= 4) {
          const best = Math.min(g.idx.length - 2, Math.max(1, g.at + 1));   // snittet ligger mellom kule `at` og `at+1`; ikke helt ytterst
          cutBars(B, g.idx[best], g.idx[best + 1]);
          const L = g.idx.slice(0, best + 1), R = g.idx.slice(best + 1); B.groups.splice(gi, 1, mkGroup(L), mkGroup(R)); B.broken = true;
          events.push({ type: 'break', id: B.id, u: P[g.idx[best]].x, v: P[g.idx[best]].y, t: state.t, m: +own.toFixed(1), cap: +B.mcap.toFixed(1) }); gi++;
        }
      }
      // R49a2: trykk og strekk er ulike. En slank del knekker i trykk (Euler: Pcr ∝ E·h³/L²) og ryker i strekk ved en annen grense; ved knekking bøyer den ut i midten og er ferdig som bærer.
      if (!B.broken && B.groups.length === 1) {
        const rc = B.nc / Math.min(B.pcr, B.ccapC), rt = B.nt / B.tcap; worst = Math.max(worst, rc, rt); B.ratioC = B.nc / B.pcr; B.ratioT = rt;
        const mode = B.nc > B.pcr ? 'buckle' : B.nt > B.tcap ? 'tear' : B.nc > B.ccapC ? 'crush' : null, g = B.groups[0];
        if (mode && g.idx.length >= 4) {
          const best = Math.min(g.idx.length - 2, Math.max(1, (g.idx.length >> 1) - 1)); cutBars(B, g.idx[best], g.idx[best + 1]);
          const L = g.idx.slice(0, best + 1), R = g.idx.slice(best + 1); B.groups.splice(0, 1, mkGroup(L), mkGroup(R)); B.broken = true; B.mode = mode;
          events.push({ type: 'break', mode, id: B.id, u: P[g.idx[best]].x, v: P[g.idx[best]].y, t: state.t, m: +(mode === 'tear' ? B.nt : B.nc).toFixed(1), cap: +(mode === 'buckle' ? B.pcr : mode === 'tear' ? B.tcap : B.ccapC).toFixed(1) });
        }
      }
      B.stress = Math.min(1.5, worst);
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
    else if (F.x >= goal.u && F.y >= goal.v + LD.r - 0.35 && supported) { state.won += DT; if (state.won >= 0.3) { state.state = 'won'; events.push({ type: 'win', u: F.x, v: F.y }); } }
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
    const parts = bodies.slice(0, fig).sort((x, y) => x.oi - y.oi).map((B) => {
      const pts = B.idx.map((i) => ({ u: P[i].x, v: P[i].y }));
      if (B.kind === 'chain') {
        const segs = B.groups.map((g) => g.idx.map((i) => ({ u: P[i].x, v: P[i].y })));
        return { id: B.id, type: B.type, kind: 'chain', pts, segs, broken: B.broken, stress: B.stress, mode: B.mode || null, buckle: B.ratioC || 0 };
      }
      const a = P[B.idx[0]], b = P[B.idx[1]], n = B.idx.length; let cx = 0, cy = 0; for (const i of B.idx) { cx += P[i].x; cy += P[i].y; }
      let ls = 0; for (const l of links) if (!l.broken && (bodies[l.a] === B || (l.b >= 0 && bodies[l.b] === B))) ls = Math.max(ls, l.stress || 0);   // R45: stive deler viser belastningen i leddene sine
      return { id: B.id, type: B.type, kind: 'rect', u: cx / n, v: cy / n, rot: Math.atan2(b.y - a.y, b.x - a.x), pts, broken: B.shattered, stress: Math.max(ls, B.ccap ? Math.min(1.5, B.cf / B.ccap) : 0) };
    });
    return {
      parts, figure: { u: F.x, v: F.y, r: LD.r, vx: F.vx, vy: F.vy, supported, load: loadId, roll: F.x / LD.r },
      links: links.filter((l) => !l.hidden).sort((x, y) => x.oi - y.oi).map((l) => ({ id: l.id, kind: l.kind, broken: l.broken, stress: l.stress || 0, a: { u: P[l.pa].x, v: P[l.pa].y }, b: { u: P[l.pb].x, v: P[l.pb].y }, len: l.kind === 'rope' || l.kind === 'band' ? l.cons[0].rest : 0 })),
    };
  }
  const drain = () => events.splice(0, events.length);
  return { step, pose, drain, state, figure: F, get t() { return state.t; }, breaks: () => bodies.filter((b) => b.broken).sort((x, y) => x.oi - y.oi).map((b) => b.id), axial: () => bodies.filter((b) => b.kind === 'chain').sort((x, y) => x.oi - y.oi).map((b) => ({ id: b.id, type: b.type, nc: b.nc, nt: b.nt, pcr: b.pcr, tcap: b.tcap, ccap: b.ccapC, broken: b.broken, mode: b.mode || null })), moments: () => bodies.filter((b) => b.kind === 'chain').sort((x, y) => x.oi - y.oi).map((b) => ({ id: b.id, m: Math.max(...b.groups.map((g) => g.mf)), cap: b.mcap, comp: b.comp })) };
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
  return { load: isLoad(opts.load) ? opts.load : DEFAULT_LOAD, result: sim.state.state === 'won' ? 'won' : 'lost', reason: sim.state.reason, t: +sim.t.toFixed(3), breaks, linkBreaks, figure: { u: sim.figure.x, v: sim.figure.y } };
}
