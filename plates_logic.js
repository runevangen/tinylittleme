// Gåteverktøy (R60): trykkplate, dør/port/vindebro og bryter. Ren logikk (ingen tegning, kan testes i node); tegningen ligger i plates_view.js.
// Brettet (`gates` i level.json, laget av scene2level fra `gates` i scenen), alt i spillenheter:
//   plates:   [{ id, x0, x1, z0, z1, y, need, label? }]    y = flata platen ligger på; need = masse som må ligge på for å trykke den ned
//   switches: [{ id, x, y, z, label? }]                    slås av/på med TA når du står nær
//   doors:    [{ id, kind: 'door'|'bridge', min:[x,y,z], max:[x,y,z], needs:[id på plate/bryter], latch?, dir?: 'down'|'up', axis?: 'x'|'z', anchor?: 'min'|'max', label?, reward? }]
//             door  = en port/dør som står i veien til den åpnes (synker ned i gulvet, dir 'down', eller heves, dir 'up')
//             bridge = en vindebro: er der først når den er åpnet (vokser ut fra anchor-enden langs axis)
//             needs = ALLE må være aktive samtidig (to-plate-gåten); latch = blir stående åpen etter at den er åpnet; ellers lukkes den når vekten tas bort
// Masse: figuren 1, løse ting etter vekt (lett 2, medium 4, tung 6), bygde deler og andre bokser med `mass`. Ting som står oppå en annen ting på plata teller også.
export const GATE = {
  mass: { light: 2, medium: 4, heavy: 6 },   // massen til løse ting etter vekt (lette ting kan bæres, tyngre må dyttes)
  hero: 1,           // massen til figuren (admin: kan skrus opp så figuren alene kan trykke plater)
  needScale: 1,      // gange terskelen til alle plater (admin)
  slack: 0.15,       // hvor langt utenfor kanten midten av tingen kan ligge og likevel telle
  dy: 0.35,          // hvor langt over flata tingen kan ligge (hoppende ting trykker ikke)
  dur: 1.4,          // sekunder for å åpne eller lukke
  reach: 1.7,        // hvor nær du må stå en bryter (vannrett)
  seed: 0.3,         // minste lengde av en vindebro før den er solid
  heroHW: 0.3, heroH: 1,
};

const hit3 = (a, b) => a.min[0] < b.max[0] && a.max[0] > b.min[0] && a.min[1] < b.max[1] && a.max[1] > b.min[1] && a.min[2] < b.max[2] && a.max[2] > b.min[2];
const ctr = (b) => [(b.min[0] + b.max[0]) / 2, (b.min[2] + b.max[2]) / 2];

export function initGates(L) {
  const g = L.gates || {};
  L.gateS = {
    plates: (g.plates || []).map((p) => ({ ...p, load: 0, on: false })),
    switches: (g.switches || []).map((s) => ({ ...s, on: false })),
    doors: (g.doors || []).map((d) => ({ ...d, t: 0, want: false, latched: false, box: null, blocked: false })),
  };
  for (const d of L.gateS.doors) applyBox(L, d);                       // lukkede dører står i veien fra start
  return L.gateS;
}
export const hasGates = (L) => !!(L.gateS && (L.gateS.plates.length || L.gateS.doors.length || L.gateS.switches.length));
export const gateById = (L, id) => { const s = L.gateS; return s ? s.plates.find((q) => q.id === id) || s.switches.find((q) => q.id === id) || s.doors.find((q) => q.id === id) || null : null; };
export const doorById = (L, id) => (L.gateS?.doors || []).find((d) => d.id === id) || null;
export const isActive = (L, id) => { const s = L.gateS; if (!s) return false; const p = s.plates.find((q) => q.id === id); if (p) return p.on; const w = s.switches.find((q) => q.id === id); return !!w?.on; };
export const doorOpen = (d) => d.t >= 0.999;

// ---- massen på en plate -----------------------------------------------------------------------------------------------------------
export function massOf(b) {
  if (typeof b.mass === 'number') return b.mass;
  if (b.dyn) return GATE.mass[b.weight] ?? GATE.mass.medium;
  return 0;
}
// er midten av tingen over platen, og ligger den omtrent i flatas høyde (eller på toppen av noe som ligger der)?
const overPlate = (b, pl) => { const [cx, cz] = ctr(b); return cx >= pl.x0 - GATE.slack && cx <= pl.x1 + GATE.slack && cz >= pl.z0 - GATE.slack && cz <= pl.z1 + GATE.slack; };

// Samlet masse på en plate: ting som hviler på flata, ting som hviler på dem, og figuren (står på flata eller på noe som står der).
export function plateLoad(L, pl, p) {
  const things = (L.boxes || []).filter((b) => massOf(b) > 0 && b.alive !== false && !b.carried);
  const counted = new Set();
  let layer = things.filter((b) => overPlate(b, pl) && Math.abs(b.min[1] - pl.y) <= GATE.dy);
  while (layer.length) {                                               // stabler: det som hviler på toppen av det som allerede telles
    for (const b of layer) counted.add(b);
    layer = things.filter((c) => !counted.has(c) && [...counted].some((b) => Math.abs(c.min[1] - b.max[1]) <= GATE.dy && c.min[0] < b.max[0] && c.max[0] > b.min[0] && c.min[2] < b.max[2] && c.max[2] > b.min[2]));
  }
  let m = 0; for (const b of counted) m += massOf(b);
  if (p && p.onGround !== false && p.state !== 'air') {
    const onFlat = p.x >= pl.x0 - GATE.slack && p.x <= pl.x1 + GATE.slack && p.z >= pl.z0 - GATE.slack && p.z <= pl.z1 + GATE.slack && Math.abs(p.y - pl.y) <= GATE.dy;
    const onThing = [...counted].some((b) => p.x >= b.min[0] - 0.1 && p.x <= b.max[0] + 0.1 && p.z >= b.min[2] - 0.1 && p.z <= b.max[2] + 0.1 && Math.abs(p.y - b.max[1]) <= GATE.dy);
    if (onFlat || onThing) m += GATE.hero;
  }
  return m;
}
export const plateNeed = (pl) => pl.need * GATE.needScale;

// ---- dør og vindebro ---------------------------------------------------------------------------------------------------------------
// Den faste kroppen ved åpenhet t (0 lukket .. 1 åpen), eller null når den ikke er i veien (åpen dør, lukket bro).
export function doorBox(d, t) {
  if (d.kind === 'bridge') {
    const ax = d.axis === 'z' ? 2 : 0, full = d.max[ax] - d.min[ax], len = full * t;
    if (len < GATE.seed) return null;
    const min = [...d.min], max = [...d.max];
    if (d.anchor === 'min') max[ax] = min[ax] + len; else min[ax] = max[ax] - len;
    return { min, max };
  }
  if (t >= 0.999) return null;
  const min = [...d.min], max = [...d.max], h = d.max[1] - d.min[1];
  if (d.dir === 'up') min[1] = d.min[1] + h * t; else max[1] = d.max[1] - h * t;
  return { min, max };
}
function applyBox(L, d) {
  const r = doorBox(d, d.t);
  if (!r) { if (d.box) { const i = L.boxes.indexOf(d.box); if (i >= 0) L.boxes.splice(i, 1); d.box = null; } return; }
  if (!d.box) { d.box = { type: d.kind === 'bridge' ? 'wood' : 'plaster', material: d.kind === 'bridge' ? 'wood' : 'metal', id: d.id, gate: true, color: d.color ?? 0x8a5a3a, min: r.min, max: r.max }; L.boxes.push(d.box); }
  else { d.box.min = r.min; d.box.max = r.max; }
}
// står figuren eller en ting i veien for en dør som vil lukke seg?
function blockedBy(L, d, nt, p) {
  if (d.kind === 'bridge') return false;                              // en bro kan trekkes inn, det som står på den faller
  const r = doorBox(d, nt); if (!r) return false;
  if (p) { const me = { min: [p.x - GATE.heroHW, p.y, p.z - GATE.heroHW], max: [p.x + GATE.heroHW, p.y + GATE.heroH, p.z + GATE.heroHW] }; if (hit3(r, me)) return true; }
  for (const b of L.bodies || []) if (b.alive && !b.carried && hit3(r, b)) return true;
  return false;
}

// Ett tidssteg. Returnerer hendelser: { type: 'plate'|'door'|'doorDone'|'blocked'|'latch', id, ... }.
export function stepGates(L, dt, p = null, active = true) {
  const s = L.gateS, ev = []; if (!s) return ev;
  for (const pl of s.plates) {
    pl.load = active ? plateLoad(L, pl, p) : 0;
    const on = pl.load >= plateNeed(pl) - 1e-9;
    if (on !== pl.on) { pl.on = on; ev.push({ type: 'plate', id: pl.id, on, load: pl.load }); }
  }
  for (const d of s.doors) {
    const all = (d.needs || []).length > 0 && d.needs.every((id) => isActive(L, id));
    if (all && d.latch && !d.latched) { d.latched = true; ev.push({ type: 'latch', id: d.id }); }
    const want = all || d.latched, wasWant = d.want;
    if (want !== wasWant) { d.want = want; if (want || !d.blocked) ev.push({ type: 'door', id: d.id, open: want }); }
    if (want && d.t < 1) { d.t = Math.min(1, d.t + dt / GATE.dur); applyBox(L, d); if (d.t >= 1) ev.push({ type: 'doorDone', id: d.id, open: true }); }
    else if (!want && d.t > 0) {
      const nt = Math.max(0, d.t - dt / GATE.dur);
      if (blockedBy(L, d, nt, p)) { if (!d.blocked) { d.blocked = true; ev.push({ type: 'blocked', id: d.id }); } }
      else { d.blocked = false; d.t = nt; applyBox(L, d); if (d.t <= 0) ev.push({ type: 'doorDone', id: d.id, open: false }); }
    }
  }
  return ev;
}

// ---- bryter ------------------------------------------------------------------------------------------------------------------------
// nærmeste bryter innen rekkevidde (vannrett og omtrent i samme høyde), ellers null
export function nearSwitch(L, p, reach = GATE.reach) {
  let best = null, bd = Infinity;
  for (const w of L.gateS?.switches || []) {
    const d = Math.hypot(w.x - p.x, w.z - p.z);
    if (d <= reach && Math.abs(w.y - p.y) < 1.6 && d < bd) { bd = d; best = w; }
  }
  return best;
}
export function toggleSwitch(L, id) {
  const w = (L.gateS?.switches || []).find((q) => q.id === id); if (!w) return null;
  w.on = !w.on; return { type: 'switch', id, on: w.on };
}

// ---- lagring ------------------------------------------------------------------------------------------------------------------------
// Bare det som overlever at siden lastes på nytt: bryterne, og dører som står fast åpne (latch). Plater og ting regnes ut på nytt.
export function gatesSave(L) {
  const s = L.gateS; if (!s) return null;
  return { sw: s.switches.filter((w) => w.on).map((w) => w.id), open: s.doors.filter((d) => d.latched).map((d) => d.id) };
}
export function resetGates(L) {
  const s = L.gateS; if (!s) return;
  for (const d of s.doors) { d.t = 0; d.want = false; d.latched = false; d.blocked = false; applyBox(L, d); }
  for (const w of s.switches) w.on = false;
  for (const p of s.plates) { p.on = false; p.load = 0; }
}
export function restoreGates(L, saved) {
  resetGates(L); const s = L.gateS; if (!s || !saved || typeof saved !== 'object') return;
  const sw = new Set(Array.isArray(saved.sw) ? saved.sw : []), open = new Set(Array.isArray(saved.open) ? saved.open : []);
  for (const w of s.switches) w.on = sw.has(w.id);
  for (const d of s.doors) if (open.has(d.id)) { d.latched = true; d.want = true; d.t = 1; applyBox(L, d); }
}
// for walk_route og tester: alle dører åpne og alle broer ute (gåtene regnes som løst)
export function openAllGates(L) {
  const s = L.gateS; if (!s) return;
  for (const d of s.doors) { d.latched = true; d.want = true; d.t = 1; applyBox(L, d); }
}

// delmål-hekt (goals.js, type 'gate'): er døra åpen?
export const gateGoalDone = (L, id) => { const d = doorById(L, id); return !!d && d.t >= 0.999; };

// ---- kontroll av brettdata (test_plates.mjs) ------------------------------------------------------------------------------------------
export function checkGates(L, { levelId = '' } = {}) {
  const errs = [], g = L.gates; if (!g) return errs;
  const ids = new Set(), at = (id) => `${levelId}/${id}`;
  const all = [...(g.plates || []), ...(g.switches || []), ...(g.doors || [])];
  for (const o of all) { if (!o.id || ids.has(o.id)) errs.push(`${at(o.id)}: id mangler eller finnes to ganger`); ids.add(o.id); }
  for (const p of g.plates || []) if (!(p.x1 > p.x0 && p.z1 > p.z0) || !(p.need > 0)) errs.push(`${at(p.id)}: platen er ugyldig`);
  for (const d of g.doors || []) {
    if (!['door', 'bridge'].includes(d.kind)) errs.push(`${at(d.id)}: ukjent type ${d.kind}`);
    if (!Array.isArray(d.min) || !Array.isArray(d.max) || !d.min.every((v, i) => v < d.max[i])) errs.push(`${at(d.id)}: boksen er ugyldig`);
    if (!(d.needs || []).length) errs.push(`${at(d.id)}: needs mangler`);
    for (const n of d.needs || []) if (!(g.plates || []).some((q) => q.id === n) && !(g.switches || []).some((q) => q.id === n)) errs.push(`${at(d.id)}: finner ikke ${n}`);
  }
  return errs;
}

// ---- tegnebudsjett (tegnekall og trekanter) ------------------------------------------------------------------------------------------
// plates_view.js bruker delte geometrier og materialer (ingen nye shadere): plate = 3 deler, bryter = 3, dør = 2 + én lampe per krav, bro = 2.
export const GATE_VIEW = { plate: { calls: 3, tris: 36 }, sw: { calls: 3, tris: 12 + 40 + 80 }, door: { calls: 2, tris: 24 }, lamp: { calls: 1, tris: 80 }, bridge: { calls: 2, tris: 24 } };
export function gatesBudget(L) {
  const g = L.gates || {}, V = GATE_VIEW; let calls = 0, tris = 0;
  const add = (v, n = 1) => { calls += v.calls * n; tris += v.tris * n; };
  add(V.plate, (g.plates || []).length); add(V.sw, (g.switches || []).length);
  for (const d of g.doors || []) { add(d.kind === 'bridge' ? V.bridge : V.door); add(V.lamp, (d.needs || []).length); }
  return { calls, tris };
}
