// R24: byggeskjermen, ren logikk (ingen DOM, ingen three.js, kan testes i node).
// Et byggested (`build.sites` i brettet) er et sideriss: u = bortover, v = oppover, i enheter (1 enhet = 5 cm).
// Delene spilleren har plukket (`build.parts`) ligger i et brett; de dras ut, snappes til rutenett/festepunkter,
// roteres, angres og nullstilles. Ingen fysikk ennå (R25): her bare plassering.

export const GRID = 0.5;                 // rutenett (enheter)
export const ROT_STEP = Math.PI / 12;    // rotasjonstrinn: 15 grader
export const SNAP_R = 0.7;               // hvor nær et festepunkt delen snapper
export const PICK_R = 1.9;               // plukkradius for deler i verdenen
export const ENTER_R = 7;                // hvor nær byggestedet man må stå for å gå inn

export const PART_TYPES = {
  plank_s: { w: 4, h: 0.5, name: 'Kort planke', en: 'Short plank', color: '#d9a35f' },
  plank_l: { w: 8, h: 0.5, name: 'Lang planke', en: 'Long plank', color: '#c98a45' },
  block: { w: 1.5, h: 1.5, name: 'Kloss', en: 'Block', color: '#e0605a' },
  weight: { w: 1.5, h: 1.5, name: 'Vekt', en: 'Weight', color: '#6f7b8c' },   // R25: tung (motvekt)
  seesaw: { w: 8, h: 0.5, name: 'Vippe', en: 'Seesaw', color: '#3fa89b', pivot: true },   // R30: planke som svinger rundt midten (festet i en liten støtte under midtpunktet)
};
export const LINK_KINDS = ['tape', 'hinge', 'rope'];                   // R25: tape = stiv, ledd = svinger, tau = bare i strekk
export const LINK_MAX = 0.75;                                          // tape/ledd: delene må ligge inntil hverandre (avstand mellom kulene)
export const PR = 0.25;                                                // R25: kule-radius i modellen (alle deler er bygd av kuler)
export const layout = (t) => {                                         // R25: kulene en del er bygd av (lokale koordinater); fysikken bruker samme oppsett
  const ty = partType(t), pts = [];
  if (ty.pivot) { const n = Math.round(ty.w / (PR * 2)); for (let i = 0; i <= n; i++) pts.push({ x: (i - n / 2) * (ty.w - PR * 2) / n, y: 0 }); }   // R30: odde antall kuler, så én kule sitter nøyaktig på dreiepunktet (midten)
  else if (ty.w >= ty.h * 2) { const n = Math.round(ty.w / (PR * 2)); for (let i = 0; i < n; i++) pts.push({ x: (i + 0.5) * ty.w / n - ty.w / 2, y: 0 }); }
  else { const n = Math.max(1, Math.round(ty.w / (PR * 2))), m = Math.max(1, Math.round(ty.h / (PR * 2))); for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) pts.push({ x: (i + 0.5) * ty.w / n - ty.w / 2, y: (j + 0.5) * ty.h / m - ty.h / 2 }); }
  return pts;
};
export const toWorldPt = (p, x, y) => { const c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0); return { u: p.u + x * c - y * s, v: p.v + x * s + y * c }; };
export const toLocalPt = (p, u, v) => { const c = Math.cos(-(p.rot || 0)), s = Math.sin(-(p.rot || 0)), dx = u - p.u, dy = v - p.v; return { x: dx * c - dy * s, y: dx * s + dy * c }; };
export const partPoints = (p) => layout(p.type).map((q) => toWorldPt(p, q.x, q.y));
export const partType = (t) => PART_TYPES[t] || PART_TYPES.block;

export const snapRot = (r) => { const k = Math.round(r / ROT_STEP) * ROT_STEP; return Math.abs(k) < 1e-9 ? 0 : k; };
export const normRot = (r) => { const t = Math.PI * 2; let x = r % t; if (x > Math.PI) x -= t; if (x <= -Math.PI) x += t; return x; };
const snapG = (v, g) => Math.round(v / g) * g;

// byggestedet: { id, label, x, y, z, w, h, anchors?: [{u,v}] }; u går fra -w/2 til w/2 (midt = 0), v fra 0 (flata) til h
export function siteAnchors(site) {
  if (Array.isArray(site.anchors) && site.anchors.length) return site.anchors;
  const hw = site.w / 2;
  return [{ u: -hw, v: 0 }, { u: hw, v: 0 }];
}
export const clampToSite = (site, u, v) => ({ u: Math.min(site.w / 2, Math.max(-site.w / 2, u)), v: Math.min(site.h, Math.max(0, v)) });

// snapping: nærmeste festepunkt (om i nærheten), ellers rutenett. Slått av: fri plassering (men innenfor stedet).
export function snapPoint(site, u, v, { snap = true, grid = GRID } = {}) {
  const c = clampToSite(site, u, v);
  if (!snap) return { ...c, anchored: false };
  let best = null, bd = SNAP_R;
  for (const a of siteAnchors(site)) { const d = Math.hypot(a.u - c.u, a.v - c.v); if (d < bd) { bd = d; best = a; } }
  if (best) return { u: best.u, v: best.v, anchored: true };
  return { ...clampToSite(site, snapG(c.u, grid), snapG(c.v, grid)), anchored: false };
}

// hjørnene til en del (for tegning og treff)
export function corners(p) {
  const t = partType(p.type), hw = t.w / 2, hh = t.h / 2, c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0);
  return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => ({ u: p.u + x * c - y * s, v: p.v + x * s + y * c }));
}
export function hitPart(p, u, v, pad = 0.35) {
  const t = partType(p.type), c = Math.cos(-(p.rot || 0)), s = Math.sin(-(p.rot || 0)), dx = u - p.u, dy = v - p.v;
  const lx = dx * c - dy * s, ly = dx * s + dy * c;
  return Math.abs(lx) <= t.w / 2 + pad && Math.abs(ly) <= t.h / 2 + pad;
}

// ---------- byggetilstand ----------
// have: id-ene på delene spilleren har plukket (rekkefølge = brettet). types: id -> type.
export function createBuild(site, types = {}, have = []) {
  return { site, types, have: [...have], placed: [], links: [], history: [], snap: true };
}
const placedOf = (B, id) => B.placed.find((p) => p.id === id);
const clone = (placed) => placed.map((p) => ({ ...p }));
const snapshot = (B) => ({ placed: clone(B.placed), links: B.links.map((l) => ({ ...l, la: l.la && { ...l.la }, lb: l.lb && { ...l.lb }, g: l.g && { ...l.g } })) });
const pushHist = (B) => { B.history.push(snapshot(B)); if (B.history.length > 60) B.history.shift(); };

export const inTray = (B) => B.have.filter((id) => !placedOf(B, id));
export const partCount = (B) => B.have.length;

export function addPart(B, id) { if (!B.have.includes(id)) B.have.push(id); return B.have.length; }

// legg en del fra brettet (eller flytt en som ligger der). Returnerer den plasserte delen, eller null om den ikke finnes/ikke er plukket.
export function place(B, id, u, v, rot) {
  if (!B.have.includes(id)) return null;
  const s = snapPoint(B.site, u, v, { snap: B.snap }), ex = placedOf(B, id);
  pushHist(B);
  const r = normRot(B.snap ? snapRot(rot ?? ex?.rot ?? 0) : (rot ?? ex?.rot ?? 0));
  if (ex) { ex.u = s.u; ex.v = s.v; ex.rot = r; ex.anchored = s.anchored; return ex; }
  const p = { id, type: B.types[id] || 'block', u: s.u, v: s.v, rot: r, anchored: s.anchored };
  B.placed.push(p); return p;
}
export function rotate(B, id, delta) {
  const p = placedOf(B, id); if (!p) return null;
  pushHist(B); p.rot = normRot(B.snap ? snapRot(p.rot + delta) : p.rot + delta); return p;
}
export function remove(B, id) {          // tilbake i brettet
  const i = B.placed.findIndex((p) => p.id === id); if (i < 0) return false;
  pushHist(B); B.placed.splice(i, 1); B.links = B.links.filter((l) => l.a !== id && l.b !== id); return true;
}
export function undo(B) { const h = B.history.pop(); if (!h) return false; B.placed = h.placed; B.links = h.links; return true; }
export function reset(B) { if (!B.placed.length && !B.links.length) return false; pushHist(B); B.placed = []; B.links = []; return true; }

// ---------- R25: koblinger (tape, ledd, tau) ----------
// { id, kind, a, la:{x,y}, b|null, lb:{x,y}|null, g:{u,v}|null }: a og b er del-id-er (lokale punkt følger delen), b = null: festet i underlaget i g.
export function addLink(B, kind, aId, bId, groundPt) {
  if (!LINK_KINDS.includes(kind)) return { ok: false, why: 'kind' };
  const a = placedOf(B, aId), b = bId ? placedOf(B, bId) : null;
  if (!a || (bId && !b) || aId === bId) return { ok: false, why: 'part' };
  let la, lb = null, g = null;
  if (b) {
    if (B.links.some((l) => l.b && ((l.a === aId && l.b === bId) || (l.a === bId && l.b === aId)) && (l.kind === kind))) return { ok: false, why: 'dup' };
    const pa = partPoints(a), pb = partPoints(b); let best = Infinity, ia = 0, ib = 0;
    pa.forEach((x, i) => pb.forEach((y, j) => { const d = Math.hypot(x.u - y.u, x.v - y.v); if (d < best) { best = d; ia = i; ib = j; } }));
    if (kind === 'rope') { la = { x: 0, y: 0 }; lb = { x: 0, y: 0 }; }
    else {
      if (best > LINK_MAX) return { ok: false, why: 'far' };
      const m = { u: (pa[ia].u + pb[ib].u) / 2, v: (pa[ia].v + pb[ib].v) / 2 }; la = toLocalPt(a, m.u, m.v); lb = toLocalPt(b, m.u, m.v);
    }
  } else {
    g = { u: groundPt.u, v: groundPt.v };
    if (kind !== 'rope') { const near = Math.min(...partPoints(a).map((x) => Math.hypot(x.u - g.u, x.v - g.v))); if (near > LINK_MAX + 0.3) return { ok: false, why: 'far' }; }
    la = kind === 'rope' ? { x: 0, y: 0 } : toLocalPt(a, g.u, g.v);
  }
  pushHist(B);
  let n = 1; while (B.links.some((l) => l.id === 'k' + n)) n++;
  const l = { id: 'k' + n, kind, a: aId, la, b: bId || null, lb, g }; B.links.push(l); return { ok: true, link: l };
}
export const linkEnds = (B, l) => {            // verdensposisjon til begge ender (til tegning og treff)
  const a = placedOf(B, l.a), b = l.b ? placedOf(B, l.b) : null; if (!a) return null;
  const pa = toWorldPt(a, l.la.x, l.la.y), pb = l.b ? (b ? toWorldPt(b, l.lb.x, l.lb.y) : null) : { u: l.g.u, v: l.g.v };
  return pb ? [pa, pb] : null;
};
export function topLink(B, u, v, r = 0.6) {
  for (let i = B.links.length - 1; i >= 0; i--) {
    const e = linkEnds(B, B.links[i]); if (!e) continue;
    const mx = (e[0].u + e[1].u) / 2, my = (e[0].v + e[1].v) / 2;
    if (Math.hypot(u - mx, v - my) <= r || Math.hypot(u - e[0].u, v - e[0].v) <= r * 0.7 || Math.hypot(u - e[1].u, v - e[1].v) <= r * 0.7) return B.links[i];
  }
  return null;
}
export function removeLink(B, id) { const i = B.links.findIndex((l) => l.id === id); if (i < 0) return false; pushHist(B); B.links.splice(i, 1); return true; }
export function topHit(B, u, v) { for (let i = B.placed.length - 1; i >= 0; i--) if (hitPart(B.placed[i], u, v)) return B.placed[i]; return null; }
// flytt en del først i tegnerekkefølgen (øverst)
export function raise(B, id) { const i = B.placed.findIndex((p) => p.id === id); if (i >= 0 && i < B.placed.length - 1) B.placed.push(B.placed.splice(i, 1)[0]); }

// lagring: kun det som må overleve («Fortsett»)
const r3 = (x) => +x.toFixed(3);
export const serialize = (B) => ({
  have: [...B.have], placed: B.placed.map((p) => ({ id: p.id, u: +p.u.toFixed(3), v: +p.v.toFixed(3), rot: +p.rot.toFixed(4) })),
  links: B.links.map((l) => ({ id: l.id, kind: l.kind, a: l.a, la: { x: r3(l.la.x), y: r3(l.la.y) }, b: l.b, lb: l.lb && { x: r3(l.lb.x), y: r3(l.lb.y) }, g: l.g && { u: r3(l.g.u), v: r3(l.g.v) } })),
});
export function restore(B, data) {
  const known = new Set(Object.keys(B.types));
  B.have = (Array.isArray(data?.have) ? data.have : []).filter((id) => known.has(id));
  B.placed = (Array.isArray(data?.placed) ? data.placed : []).filter((p) => B.have.includes(p?.id) && Number.isFinite(p.u) && Number.isFinite(p.v))
    .map((p) => { const c = clampToSite(B.site, p.u, p.v); return { id: p.id, type: B.types[p.id], u: c.u, v: c.v, rot: Number.isFinite(p.rot) ? normRot(p.rot) : 0, anchored: false }; });
  const ok = (q) => Number.isFinite(q?.x) && Number.isFinite(q?.y);
  B.links = (Array.isArray(data?.links) ? data.links : []).filter((l) => LINK_KINDS.includes(l?.kind) && B.placed.some((p) => p.id === l.a) && ok(l.la)
    && (l.b ? B.placed.some((p) => p.id === l.b) && ok(l.lb) : Number.isFinite(l.g?.u) && Number.isFinite(l.g?.v)))
    .map((l) => ({ id: String(l.id), kind: l.kind, a: l.a, la: { x: l.la.x, y: l.la.y }, b: l.b || null, lb: l.b ? { x: l.lb.x, y: l.lb.y } : null, g: l.b ? null : { u: l.g.u, v: l.g.v } }));
  B.history = []; return B;
}

// to-fingers vri: ny rotasjon fra vinkelen mellom to fingre (rad) før/nå
export const twistRot = (rot0, a0, a1) => normRot(rot0 + (a1 - a0));

// ---------- kamera i byggeskjermen (ortografisk sideriss) ----------
export function fitView(site, w, h, pad = 24, top = 0, bot = 0) {     // skala (px per enhet) og midtpunkt så hele stedet er synlig i det frie området (top/bot = px opptatt av knapper og brett)
  const sc = Math.max(4, Math.min((w - pad * 2) / Math.max(1, site.w), (h - top - bot - pad * 2) / Math.max(1, site.h + 2)));
  return { scale: sc, cu: 0, cv: site.h / 2, oy: (top - bot) / 2 };
}
export const clampScale = (s) => Math.min(80, Math.max(6, s));
export const toScreen = (view, w, h, u, v) => ({ x: w / 2 + (u - view.cu) * view.scale, y: h / 2 + (view.oy || 0) - (v - view.cv) * view.scale });
export const toWorld = (view, w, h, x, y) => ({ u: view.cu + (x - w / 2) / view.scale, v: view.cv - (y - h / 2 - (view.oy || 0)) / view.scale });

// ---------- inn og ut av modus ----------
export const canEnterBuild = ({ play, won, menu, boss, ov, onGround }) => !!play && !won && !menu && !boss && !ov && !!onGround;
export const nearSite = (site, p, r = ENTER_R) => Math.hypot(site.x - p.x, site.z - p.z) <= r + site.w / 2 && p.y > site.y - 4 && p.y < site.y + site.h + 8;
export function nearestSite(sites, p) {
  let best = null, bd = Infinity;
  for (const s of sites || []) if (nearSite(s, p)) { const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < bd) { bd = d; best = s; } }
  return best;
}

// ---------- deler i verdenen (plukkes ved å gå bort til dem) ----------
export function initParts(L) {
  L.buildSites = (L.build?.sites || []).map((s) => ({ ...s }));
  L.buildParts = (L.build?.parts || []).map((q) => ({ id: q.id, type: q.type, x: q.x, y: q.y, z: q.z, got: false, phase: (q.x * 7.3 + q.z * 3.1) % 6 }));
}
export const partTypes = (L) => Object.fromEntries((L.buildParts || []).map((q) => [q.id, q.type]));
export const gotPartIds = (L) => (L.buildParts || []).filter((q) => q.got).map((q) => q.id);
export function stepParts(L, p, dt, active = true) {
  const ev = [];
  for (const q of L.buildParts || []) {
    q.phase += dt; if (q.got || !active) continue;
    const dy = q.y - p.y;
    if (Math.hypot(q.x - p.x, q.z - p.z) < PICK_R && dy > -0.8 && dy < 2.4) { q.got = true; ev.push({ type: 'part', id: q.id, kind: q.type, x: q.x, y: q.y, z: q.z, n: gotPartIds(L).length, total: L.buildParts.length }); }
  }
  return ev;
}
export function restoreParts(L, ids) { const set = new Set(Array.isArray(ids) ? ids : []); for (const q of L.buildParts || []) q.got = set.has(q.id); return gotPartIds(L).length; }
