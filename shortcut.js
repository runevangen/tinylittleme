// R29: verktøy-gåter (genveier) i nivå 4–6. Ren logikk uten three (testes i node, test_shortcut.mjs).
// En genvei er en trapp av trinn (egne bokser merket `shortcut` i scenen) der første trinn er for høyt til å hoppe opp på,
// men som du kommer opp på ved å smøre hårgelé på trinnet (verktøyet), og som ender på en flate i den vanlige ruta.
// Den vanlige ruta (L.route) er den lengre og vanskeligere veien uten verktøyet: den berøres ikke.
// Data i brettet (laget av tools/make_variants.mjs via scene2level):
//   shortcuts: [{ id, tool: 'gel', item: <id på flaska>, label, en, stand: [x, z], face: [dx, dz], steps: [id, …], join: <id på flate i ruta> }]
import { P, newPlayer, initBodies, step, applyPreset } from './physics.js';

export const SHORTCUT_TOOLS = ['gel'];
const DT = 1 / 60;

export const shortcutsOf = (L) => L.shortcuts || [];
export const stepIds = (L) => new Set(shortcutsOf(L).flatMap((s) => s.steps));

// Rutepunkt (flate) for en boks: samme form som i L.route.
export const nodeOf = (L, id) => {
  const b = L.boxes.find((x) => x.id === id); if (!b) return null;
  return { id: b.id, x0: b.min[0], x1: b.max[0], z0: b.min[2], z1: b.max[2], top: b.max[1] };
};
// Ruta via genveien: fra gulvet opp trinnene og videre langs den vanlige ruta fra `join` (siste forekomst av flata) til målet.
export function shortcutRoute(L, sc) {
  const R = L.route || [], start = R[0], ji = R.map((r) => r.id).lastIndexOf(sc.join);
  if (ji < 0) return null;
  const nodes = [start, ...sc.steps.map((id) => nodeOf(L, id))];
  if (nodes.some((n) => !n)) return null;
  return [...nodes, ...R.slice(ji)];
}
// Ruta bare til første trinn (for å bevise at trinnet ikke kan hoppes opp på uten verktøyet).
export function gateRoute(L, sc) { const R = L.route || [], g = nodeOf(L, sc.steps[0]); return g ? [R[0], g] : null; }

// Bruker verktøyet med den ekte fysikken: figuren står med flaska på `stand`, ser mot `face`, og trykker TA (kort).
// Returnerer boksene verktøyet lager (gelfeltet), klare til å legges inn i brettet.
export function toolBoxes(L0, sc) {
  applyPreset('mario');
  const L = JSON.parse(JSON.stringify(L0)); initBodies(L);
  const item = L.bodies.find((b) => b.id === sc.item); if (!item) return { boxes: [], why: `fant ikke flaska ${sc.item}` };
  const p = newPlayer(sc.stand[0], 0, sc.stand[1]), idle = { mx: 0, mz: 0, jumpPressed: false, jumpHeld: false, grabPressed: false, grabHeld: false };
  for (let i = 0; i < 30; i++) step(p, idle, DT, L);
  const l = Math.hypot(sc.face[0], sc.face[1]) || 1; p.fx = sc.face[0] / l; p.fz = sc.face[1] / l;
  const sz = [0, 1, 2].map((i) => item.max[i] - item.min[i]), c = [p.x + p.fx * 0.9, p.y + 0.35, p.z + p.fz * 0.9];          // flaska i hånden (bæres foran figuren)
  item.min = [c[0] - sz[0] / 2, c[1], c[2] - sz[2] / 2]; item.max = [c[0] + sz[0] / 2, c[1] + sz[1], c[2] + sz[2] / 2];
  p.carry = item; item.carried = true;
  step(p, { ...idle, carryHeld: true }, DT, L); step(p, { ...idle, carryHeld: false }, DT, L);          // kort trykk på TA = bruk verktøyet
  const boxes = (L.made || []).map((m) => JSON.parse(JSON.stringify(m)));
  return { boxes, why: boxes.length ? '' : 'verktøyet laget ikke noe her (står figuren inntil trinnet?)', stood: [p.x, p.z] };
}

// Hendelser mens du spiller: første gang du står på et trinn i en genvei, og når du har kommet til toppen av den.
export function createShortcutWatch(L) { return { L, seen: new Set(), done: new Set() }; }
export function resetShortcutWatch(S) { S.seen.clear(); S.done.clear(); }
export function stepShortcutWatch(S, p) {
  const ev = [], gb = p.groundBox; if (!gb || !p.onGround) return ev;
  for (const sc of shortcutsOf(S.L)) {
    if (sc.steps.includes(gb.id) && !S.seen.has(sc.id)) { S.seen.add(sc.id); ev.push({ type: 'shortcut', act: 'step', id: sc.id }); }
    if (gb.id === sc.steps[sc.steps.length - 1] && !S.done.has(sc.id)) { S.done.add(sc.id); ev.push({ type: 'shortcut', act: 'top', id: sc.id }); }
  }
  return ev;
}
