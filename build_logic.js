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
};
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
  return { site, types, have: [...have], placed: [], history: [], snap: true };
}
const placedOf = (B, id) => B.placed.find((p) => p.id === id);
const clone = (placed) => placed.map((p) => ({ ...p }));
const pushHist = (B) => { B.history.push(clone(B.placed)); if (B.history.length > 60) B.history.shift(); };

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
  pushHist(B); B.placed.splice(i, 1); return true;
}
export function undo(B) { const h = B.history.pop(); if (!h) return false; B.placed = h; return true; }
export function reset(B) { if (!B.placed.length) return false; pushHist(B); B.placed = []; return true; }
export function topHit(B, u, v) { for (let i = B.placed.length - 1; i >= 0; i--) if (hitPart(B.placed[i], u, v)) return B.placed[i]; return null; }
// flytt en del først i tegnerekkefølgen (øverst)
export function raise(B, id) { const i = B.placed.findIndex((p) => p.id === id); if (i >= 0 && i < B.placed.length - 1) B.placed.push(B.placed.splice(i, 1)[0]); }

// lagring: kun det som må overleve («Fortsett»)
export const serialize = (B) => ({ have: [...B.have], placed: B.placed.map((p) => ({ id: p.id, u: +p.u.toFixed(3), v: +p.v.toFixed(3), rot: +p.rot.toFixed(4) })) });
export function restore(B, data) {
  const known = new Set(Object.keys(B.types));
  B.have = (Array.isArray(data?.have) ? data.have : []).filter((id) => known.has(id));
  B.placed = (Array.isArray(data?.placed) ? data.placed : []).filter((p) => B.have.includes(p?.id) && Number.isFinite(p.u) && Number.isFinite(p.v))
    .map((p) => { const c = clampToSite(B.site, p.u, p.v); return { id: p.id, type: B.types[p.id], u: c.u, v: c.v, rot: Number.isFinite(p.rot) ? normRot(p.rot) : 0, anchored: false }; });
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
