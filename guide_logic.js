// R64: veiledning når målet er under, bak eller ikke i bildet. Ren logikk (ingen DOM/three, testes i test_guide.mjs); visning i guide_view.js, kobling i main.js.
// Én retning for alt: pila i bildet, pila i båndet og kantmerket bruker samme `aim` (også loddrett: mål under = ned).
export const GUIDE = {
  vertMin: 0.6,        // høydeforskjell (brettenheter) før «opp»/«ned» nevnes
  vertDom: 0.7,        // loddrett veier mest når |dy| >= vertDom * vannrett avstand
  stallMs: 45000,      // uten framdrift så lenge: neste flate utheves
  stallDist: 2.0,      // framdrift = nærmere målet enn dette, nytt delmål eller høyere ruteflate
  showHold: 2.4,       // «Vis meg»: sekunder kameraet står mot målet
  repeatMs: 20000,     // hvor ofte hele handlingssetningen gjentas i båndet mens målet er skjult
  edgePad: 26,         // kantmerke: avstand fra skjermkanten (px)
  edgePadBottom: 150,  // ... nederst (knappene)
  edgePadTop: 56,      // ... øverst (toppbåndet)
  unit: 0.05,          // brettenheter til meter
};

// dx, dy, dz: mål minus figur. yaw: kamera. Retur: { ang (0 = opp på skjermen, positiv = høyre), hdist, dy, vert: 'up'|'down'|'level', vertDom, behind, meters }
export function aim({ dx, dy, dz, yaw }) {
  const sy = Math.sin(yaw), cy = Math.cos(yaw);
  const lat = dx * cy - dz * sy, fwd = -dx * sy - dz * cy, hdist = Math.hypot(dx, dz);
  const vert = dy > GUIDE.vertMin ? 'up' : dy < -GUIDE.vertMin ? 'down' : 'level';
  const vertDom = vert !== 'level' && Math.abs(dy) >= Math.max(GUIDE.vertMin, GUIDE.vertDom * hdist);
  const ang = vertDom ? Math.atan2(lat * 0.5, dy) : Math.atan2(lat, fwd);   // loddrett: 0 = opp, ±π = ned (litt sidelengs etter x)
  return { ang, hdist, dy, vert, vertDom, behind: !vertDom && fwd < 0 && Math.abs(lat) < -fwd * 0.5, meters: (vertDom ? Math.abs(dy) : hdist) * GUIDE.unit };
}
export const glyph = (a) => (a.vert === 'up' ? '▲' : a.vert === 'down' ? '▼' : '');
export const fmtM = (m) => `${m.toFixed(1).replace('.', ',')} m`;

// Hvilken fase er dangler (edderkopp i tråd) i? 'wait' = oppe, trygg; 'warn' = rister; 'low' = henger lavt (knus nå); 'rise' = trekkes opp
export function danglerPhase(t) {
  if (!t || t.type !== 'dangler') return null;
  return t.mode === 'plunge' || t.mode === 'hold' ? 'low' : t.mode === 'warn' ? 'warn' : t.mode === 'rise' ? 'rise' : 'wait';
}

// Hva skal spilleren gjøre? Returnerer { key, params } til i18n (nøkler 'guide.*'). kind: 'dangler'|'ant'|'crumbs'|'key'|'plate'|'bridge'|'switch'|'reach'|'route'|'goal'
// a: resultat av aim(), phase: danglerPhase, grip: flaten er en klatreflate, act: tekst fra ruta (f.eks. «klatre»)
export function actionFor({ kind, a, phase, grip = false, act = '' }) {
  const m = fmtM(a.meters);
  if (kind === 'dangler') {
    if (phase === 'low') return { key: 'guide.dangLow', params: { m } };
    if (a.vert === 'down' && a.vertDom) return { key: 'guide.dangDown', params: { m } };
    return { key: 'guide.dangWait', params: { m } };
  }
  if (kind === 'ant') return a.vert === 'down' && a.vertDom ? { key: 'guide.stompDown', params: { m } } : { key: 'guide.stomp', params: { m } };
  if (kind === 'crumbs') return a.vert === 'down' && a.vertDom ? { key: 'guide.jumpDown', params: { m } } : a.vert === 'up' && a.vertDom ? { key: 'guide.up', params: { m } } : { key: 'guide.crumb', params: { m } };
  if (kind === 'key') return { key: a.hdist < 2.5 ? 'guide.takeKey' : 'guide.goKey', params: { m } };
  if (kind === 'plate') return { key: a.hdist < 2.5 ? 'guide.putKey' : 'guide.goPlate', params: { m } };
  if (kind === 'switch') return { key: a.hdist < 2.5 ? 'guide.switchNear' : 'guide.goSwitch', params: { m } };
  if (a.vert === 'down' && a.vertDom) return { key: 'guide.jumpDown', params: { m } };
  if (a.vert === 'up' && a.vertDom) return { key: grip || /klatre|climb/i.test(act) ? 'guide.climb' : 'guide.up', params: { m } };
  if (a.vert === 'up') return { key: grip || /klatre|climb/i.test(act) ? 'guide.climbWalk' : 'guide.walkUp', params: { m } };
  if (a.vert === 'down') return { key: 'guide.walkDown', params: { m } };
  return { key: a.behind ? 'guide.turn' : 'guide.walk', params: { m } };
}
// Kort hint (til høyre i båndet): glyf + kort handling. Nøkkelen er 'guide.s.<kind av action>'; her: delmengden som ikke trenger parametre.
export const shortKey = (action) => `${action.key.replace('guide.', 'guide.s.')}`;

// Kantmerke: hvor i skjermkanten og hvilken vei det peker. s: {x,y}|null (null = bak kameraet). Retur { x, y, rot } (rot: 0 = opp, positiv = høyre) eller null når målet er i bildet.
export function edgeMark({ s, a, w, h, pad = GUIDE.edgePad, padTop = GUIDE.edgePadTop, padBottom = GUIDE.edgePadBottom }) {
  const inFrame = s && !a.vertDom && s.x >= pad && s.x <= w - pad && s.y >= padTop && s.y <= h - padBottom;
  if (inFrame) return null;
  const cx = w / 2, cy = h / 2;
  let dx, dy;
  if (a.vertDom || !s) { dx = Math.sin(a.ang); dy = -Math.cos(a.ang); }              // loddrett eller bak: bruk den felles retningen
  else { dx = s.x - cx; dy = s.y - cy; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; }
  const hw = cx - pad, up = cy - padTop, dn = h - cy - padBottom;
  const k = Math.min(Math.abs(dx) > 1e-9 ? hw / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-9 ? (dy < 0 ? up : dn) / Math.abs(dy) : Infinity);
  return { x: cx + dx * k, y: cy + dy * k, rot: Math.atan2(dx, -dy) };
}

// ---------- framdrift og ruteuthevning ----------
export const createStall = () => ({ t0: null, key: '', best: -1, done: -1, d0: Infinity });
// Kalles hver ramme. p: {x,z}, goalKey: id på aktivt mål, routeIdx: høyeste ruteflate nådd, done: antall delmål klare, dist: avstand til målet.
// Framdrift nullstiller klokka: nytt mål, flere delmål klare, høyere ruteflate, eller tydelig nærmere målet enn før.
export function stepStall(s, now, { goalKey, routeIdx, done, dist }) {
  const newGoal = goalKey !== s.key;
  const prog = s.t0 === null || newGoal || done !== s.done || routeIdx > s.best || dist < s.d0 - GUIDE.stallDist;
  if (prog) { s.t0 = now; s.best = newGoal ? routeIdx : Math.max(s.best, routeIdx); s.key = goalKey; s.done = done; s.d0 = dist; }
  return s;
}
export const stalled = (s, now, ms = GUIDE.stallMs) => s.t0 !== null && now - s.t0 >= ms;

// Neste flate på ruta etter indeks i (siste flate = null; målet er ikke en flate).
export function nextSurface(route, i) {
  if (!route || route.length < 2) return null;
  const w = route[Math.min(i + 1, route.length - 1)];
  return w && w !== route[route.length - 1] ? w : null;
}
// Punkt på kanten av flata man står på, nærmest et mål (der man bør hoppe av eller klatre opp). from: {x0,x1,z0,z1,top}, to: {x,z}.
export function ledgePoint(from, to) {
  if (!from) return null;
  return { x: Math.max(from.x0, Math.min(from.x1, to.x)), y: from.top, z: Math.max(from.z0, Math.min(from.z1, to.z)) };
}

// ---------- «Vis meg»: kort kamerasveip mot målet og tilbake ----------
// Fasene: to (kameraet dreies), hold (står stille), back (tilbake). Alt i sekunder; skip() går rett til tilbake.
export function createShowMe() { return { phase: 'idle', t: 0 }; }
export function startShowMe(s, saved, plan) { s.phase = 'to'; s.t = 0; s.saved = saved; s.plan = plan; return s; }
export function skipShowMe(s) { if (s.phase === 'to' || s.phase === 'hold') { s.phase = 'back'; s.t = 0; return true; } return false; }
// Returnerer { act: 'turn'|'none'|'done', yaw, pitch } (mål for turnCamera når act === 'turn')
export function stepShowMe(s, dt) {
  if (s.phase === 'idle') return { act: 'none' };
  const first = s.t === 0; s.t += dt;
  if (s.phase === 'to') { if (first) return { act: 'turn', yaw: s.plan.yaw, pitch: s.plan.pitch }; if (s.t >= 0.45) { s.phase = 'hold'; s.t = 0; } return { act: 'none' }; }
  if (s.phase === 'hold') { if (s.t >= (s.plan.hold ?? GUIDE.showHold)) { s.phase = 'back'; s.t = 0; } return { act: 'none' }; }
  if (first) return { act: 'turn', yaw: s.saved.yaw, pitch: s.saved.pitch };
  if (s.t >= 0.45) { s.phase = 'idle'; s.t = 0; return { act: 'done' }; }
  return { act: 'none' };
}
// Kameraplan mot målet: yaw mot målet fra figuren; når målet er under tippes kameraet ned (ser ned over kanten), når det er over tippes det opp.
export function showMePlan({ dx, dz, a, pitch0 }) {
  const pitch = a.vert === 'down' && a.vertDom ? 0.95 : a.vert === 'up' && a.vertDom ? 0.0 : pitch0;
  return { yaw: Math.atan2(-dx, -dz), pitch, hold: GUIDE.showHold };
}

// Teksten for «Vis meg»-knappen og dagens retningsord; samlet så båndet, panelet og testene bruker det samme.
export function bandHint(action, a, T) {
  return `${glyph(a)} ${T(shortKey(action))}`.trim();
}
