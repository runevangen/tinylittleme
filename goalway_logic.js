// R98: tydelig mål og vei i hvert brett. Ren logikk (ingen DOM/three, testes i test_goalway.mjs og tools/goal_check.mjs); visning i goalway_view.js, kobling i main.js.
//  1. Oppdragslinje: «ikon + neste mål med få ord» (tekstene finnes fra før: delmålene i goals.js; rute og siste mål får korte standardtekster).
//  2. Peiling (Ekspert, ingen piler): et mål-ikon glir inn ved skjermkanten i riktig retning ca. 1 s når du har stått stille eller gått feil vei en stund, og en lysglød på målet når det kommer i syne.
import { activeGoal, goalTarget, goalLine, goalLabel, goalAvailable } from './goals.js';
import { aim, edgeMark, GUIDE } from './guide_logic.js';

export const WAY = {
  idleMs: 8000,      // uten framdrift så lenge: peilingen vises (stille eller feil vei)
  longMs: 20000,     // «lang stillstand» logges (én gang per stillstand)
  showMs: 1000,      // så lenge peilingen står
  glowMs: 4000,      // så lenge lysgløden står når målet kommer i syne
  closer: 1.0,       // framdrift = nærmere målet enn dette (brettenheter) siden sist
  glowRange: 60,     // ingen glød lenger unna enn dette
  tapMs: 6000,       // oppdragslinjen hentes fram så lenge ved trykk på mål-ikonet eller ⋯ (når den ellers er av)
  moveSpeed: 0.4,    // fart over dette = «går» (ellers «står stille»)
};

// ---------- oppdragslinje ----------
export const GOAL_ICON = { reach: '📍', crumbs: '🍪', stomp: '👟', puzzle: '🔑', gate: '🚪', boss: '👑', flag: '🔨' };
export const KIND_ICON = { reach: '📍', route: '📍', crumbs: '🍪', ant: '👟', dangler: '👟', key: '🔑', plate: '⬇️', switch: '🔘', goal: '🚪' };
export const FINAL_ICON = '🚩';
export const QUEST_MODES = ['auto', 'on', 'off'];
export const normQuestMode = (v) => (QUEST_MODES.includes(v) ? v : 'auto');

// Skal linja vises? mode: 'auto' (følger vanskelighetens rad `questLine`), 'on', 'off'. tapUntil: hentet fram ved trykk (gjelder også når den er av).
export function questVisible({ mode = 'auto', diffOn = true, tapUntil = 0, now = 0 }) {
  if (now < tapUntil) return true;
  const m = normQuestMode(mode);
  return m === 'on' || (m === 'auto' && !!diffOn);
}

// Hva er neste mål? goal: aktivt delmål (activeGoal) eller null; t: målet pila ville pekt på ({label, kind, final, grip?}) eller null; ctx: { crumbs, stomps, stars }.
// Gåtemål (nøkkel, plate, bryter) har egen, nær veiledning og går foran delmålet. Ellers styrer delmålet teksten (også «Bygg en bro …», som ikke har noe punkt i verden).
// Uten delmål: neste flate på ruta («Gå til …») eller det siste målet. Retur { icon, text, key, src } eller null.
export function questModel({ L, goal, t, T, lang, ctx = {} }) {
  const puzzleKind = t && (t.kind === 'key' || t.kind === 'plate' || t.kind === 'switch');
  if (puzzleKind) return { icon: KIND_ICON[t.kind], text: t.label, key: `t|${t.kind}|${t.label}`, src: 'puzzle' };
  if (goal) { const text = goalLine(L, goal, lang, ctx); return { icon: GOAL_ICON[goal.type] || '📍', text, key: `g|${goal.id}|${text}`, src: 'goal' }; }
  if (!t) return null;
  if (t.final) return { icon: FINAL_ICON, text: T('quest.final'), key: 'final', src: 'final' };
  if (t.kind === 'route' && t.grip !== undefined) return { icon: KIND_ICON.route, text: T('quest.goTo', { name: t.label }), key: `r|${t.label}`, src: 'route' };   // grip er satt bare når målet er neste flate på ruta
  return { icon: KIND_ICON[t.kind] || '📍', text: t.label, key: `t|${t.kind}|${t.label}`, src: 'target' };
}

// ---------- peiling ----------
export const createWay = () => ({ key: '', t0: null, d0: Infinity, nextPeekAt: 0, longLogged: false, wasIn: false, peekUntil: 0, glowUntil: 0 });
// Kalles hver ramme. s: createWay(); inn: { key, dist, moving, inFrame, active }. Retur { peek: null|'stille'|'feil vei', glow: bool, long: bool, key }
// «Framdrift» (nærmere målet, nytt mål) nullstiller klokka; stå stille eller gå uten å komme nærmere i idleMs gir peiling, og så igjen hvert idleMs så lenge det varer.
export function stepWay(s, now, { key, dist, moving, inFrame, seen = inFrame, active = true }) {   // seen: målet er på skjermen (glød), inFrame: og ikke «loddrett» (ellers peiling)
  const out = { peek: null, glow: false, long: false };
  if (!active) { s.t0 = null; s.wasIn = seen; return finish(s, now, out); }
  const newKey = key !== s.key;
  if (newKey || s.t0 === null || dist < s.d0 - WAY.closer) { s.key = key; s.t0 = now; s.d0 = dist; s.nextPeekAt = now + WAY.idleMs; s.longLogged = false; }
  if (newKey && seen && dist <= WAY.glowRange) s.glowUntil = now + WAY.glowMs;                       // nytt mål som allerede er i bildet
  else if (seen && !s.wasIn && dist <= WAY.glowRange) s.glowUntil = now + WAY.glowMs;               // målet kom i syne
  s.wasIn = seen;
  if (now - s.t0 >= WAY.idleMs && now >= s.nextPeekAt) {
    s.nextPeekAt = now + WAY.idleMs;
    if (seen && inFrame) { if (dist <= WAY.glowRange) s.glowUntil = now + WAY.glowMs; }   // i bildet: gløden viser vei, ingen kantikon
    else { s.peekUntil = now + WAY.showMs; out.peek = moving ? 'feil vei' : 'stille'; }
  }
  if (!s.longLogged && now - s.t0 >= WAY.longMs) { s.longLogged = true; out.long = true; }
  return finish(s, now, out);
}
function finish(s, now, out) { out.showing = now < s.peekUntil; out.glow = now < s.glowUntil; out.key = s.key; return out; }

// Hvor i kanten og hvilken vei peker ikonet? a: aim(); retur { x, y, rot } (alltid i kanten: målet er utenfor bildet når peilingen vises).
// Større avstand fra kanten enn kantmerket (guide_logic): ikonet er 44 px og skal ikke ligge over toppbåndet, oppdragslinja eller knappene.
export const PEEK_PAD = { pad: 34, top: 96, bottom: 170 };
export function peekMark({ a, w, h }) { return edgeMark({ s: null, a, w, h, pad: PEEK_PAD.pad, padTop: PEEK_PAD.top, padBottom: PEEK_PAD.bottom }); }

// ---------- ren målsøking for kontroll (tools/goal_check.mjs): samme regel som nextTarget() i main.js, uten gåter, vann og DOM ----------
// L: brett med initGoals/initCollect/initAnts/initGates/initBoss kjørt. p: {x,y,z}. Retur { x, y, z, label, src } eller null.
export function wayTarget(L, p, routeIdx = 0) {
  const g = activeGoal(L), gt = g && goalTarget(L, g, p);
  if (gt) return { ...gt, label: g.label || g.id, src: `goal:${g.type}` };
  const R = L.route;
  if (R?.length > 1) {
    const w = R[Math.min(routeIdx + 1, R.length - 1)];
    if (w !== R[R.length - 1]) return { x: Math.max(w.x0, Math.min(w.x1, p.x)), y: w.top, z: Math.max(w.z0, Math.min(w.z1, p.z)), label: w.label || w.id, src: 'route' };
  }
  return L.goal ? { x: L.goal[0], y: L.goal[1], z: L.goal[2], label: 'mål', src: 'final' } : null;
}
// Peilingens vinkel fra p mot t med kamera yaw: 0 = opp på skjermen, positiv = høyre (samme som guide_logic.aim).
export const peekAngle = (p, t, yaw) => aim({ dx: t.x - p.x, dy: t.y - p.y, dz: t.z - p.z, yaw }).ang;
export { GUIDE, goalAvailable, goalLabel };
