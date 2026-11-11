// Nøkkel og lås (R7): en liten gåte per brett. Finn nøkkelen (en løs, lett ting), bær den til platen (TA, så SETT PÅ),
// og en bro ruller ut. Gåten er en valgfri snarvei: rutekartet og walk_route bruker den aldri.
// Ren logikk (ingen tegning, kan testes i node); tegningen ligger i puzzle_view.js.
// Brettet (`puzzles` i level.json, laget av scene2level fra `puzzles` i scenen):
//   { id, key: <id til en løs ting>, plate: { x, y, z, r, on, x0, x1, z0, z1 },     y = flata platen ligger på; x0.. = hele flata (for veiledning)
//     bridge: { min:[x,y,z], max:[x,y,z], axis: 'x'|'z', anchor: 'min'|'max' },     ferdig bro; den vokser ut fra anchor-enden
//     label?, en? }
export const PUZ = {
  keyDy: 0.7,        // nøkkelen må ligge så nær flata (høyde over platen) for å telle som «på platen»
  plateSlack: 0.9,   // ekstra radius (nøkkelen er ikke et punkt)
  dur: 1.8,          // sekunder for å rulle ut broen
  seed: 0.5,         // hvor lang (enheter) broen er når den begynner å rulle ut
  zoneUp: 3.5,       // veiledningen gjelder når du står på flata (høyde over platen, opp)
};

export function initPuzzles(L) {
  L.puzzleList = (L.puzzles || []).map((p) => ({ ...p, open: false, t: 0, pressed: false, box: null }));
}
export const puzzleTotal = (L) => (L.puzzleList || []).length;
export const puzzleOpenIds = (L) => (L.puzzleList || []).filter((p) => p.open).map((p) => p.id);

export function bridgeBox(p, t) {                              // broen ved framdrift t (0..1): lengden vokser fra anchor-enden
  const b = p.bridge, ax = b.axis === 'z' ? 2 : 0, full = b.max[ax] - b.min[ax];
  const len = Math.min(full, PUZ.seed + (full - PUZ.seed) * t);
  const min = [...b.min], max = [...b.max];
  if (b.anchor === 'max') min[ax] = max[ax] - len; else max[ax] = min[ax] + len;
  return { min, max };
}
function ensureBox(L, p) {
  if (p.box) return;
  const b = p.bridge, r = bridgeBox(p, 0);
  p.box = { type: 'wood', kind: 'plank', id: `${p.id}_bro`, material: 'wood', color: b.color ?? 0xc98f4a, min: r.min, max: r.max, bridge: true };
  L.boxes.push(p.box);
}
function setT(L, p, t) {
  p.t = Math.max(0, Math.min(1, t));
  ensureBox(L, p); const r = bridgeBox(p, p.t); p.box.min = r.min; p.box.max = r.max;
}

// er nøkkelen på platen? (ikke båret, midten innenfor platen, omtrent i flatas høyde)
export function keyOnPlate(key, plate) {
  if (!key || !key.alive || key.carried) return false;
  const cx = (key.min[0] + key.max[0]) / 2, cz = (key.min[2] + key.max[2]) / 2;
  return Math.hypot(cx - plate.x, cz - plate.z) <= plate.r + PUZ.plateSlack && Math.abs(key.min[1] - plate.y) < PUZ.keyDy;
}

// Ett tidssteg. Returnerer hendelser: { type: 'placed'|'open'|'done', id }.
export function stepPuzzles(L, dt, active = true) {
  const ev = [];
  for (const p of L.puzzleList || []) {
    const key = (L.bodies || []).find((b) => b.id === p.key), on = active && keyOnPlate(key, p.plate);
    if (on && !p.pressed) ev.push({ type: 'placed', id: p.id });
    p.pressed = on;
    if (!p.open && on) { p.open = true; ev.push({ type: 'open', id: p.id }); }
    if (p.open && p.t < 1) { setT(L, p, p.t + dt / PUZ.dur); if (p.t >= 1) ev.push({ type: 'done', id: p.id }); }
  }
  return ev;
}
export function resetPuzzles(L) {
  for (const p of L.puzzleList || []) {
    if (p.box) { const i = L.boxes.indexOf(p.box); if (i >= 0) L.boxes.splice(i, 1); p.box = null; }
    p.open = false; p.t = 0; p.pressed = false;
  }
}
// fra autolagringen: åpne gåter står åpne (broen er ferdig); ukjente id-er ignoreres
export function restorePuzzles(L, ids) {
  resetPuzzles(L);
  const set = new Set(Array.isArray(ids) ? ids : []);
  for (const p of L.puzzleList || []) if (set.has(p.id)) { p.open = true; setT(L, p, 1); }
}

// Veiledning (pil/kompass): står du på flata der gåten ligger og den er uløst, peker pila først på nøkkelen, så på platen.
// Returnerer { x, y, z, key: 'key'|'plate', puzzle } eller null.
export function puzzleTarget(L, p0) {
  for (const p of L.puzzleList || []) {
    if (p.open) continue;
    const pl = p.plate, key = (L.bodies || []).find((b) => b.id === p.key);
    if (!key || !key.alive) continue;
    const onFlat = p0.x >= pl.x0 - 0.3 && p0.x <= pl.x1 + 0.3 && p0.z >= pl.z0 - 0.3 && p0.z <= pl.z1 + 0.3 && p0.y - pl.y > -0.3 && p0.y - pl.y < PUZ.zoneUp;
    if (!onFlat) continue;
    if (p0.carry === key) return { x: pl.x, y: pl.y, z: pl.z, key: 'plate', puzzle: p };
    if (p0.carry) continue;
    return { x: (key.min[0] + key.max[0]) / 2, y: key.min[1], z: (key.min[2] + key.max[2]) / 2, key: 'key', puzzle: p };
  }
  return null;
}
// bærer spilleren en gåte-nøkkel nær nok platen til at SETT PÅ gir mening? (til hint-teksten)
export function carryingKeyNear(L, p0, dist = 6) {
  for (const p of L.puzzleList || []) if (!p.open && p0.carry && p0.carry.id === p.key && Math.hypot(p0.x - p.plate.x, p0.z - p.plate.z) < dist && Math.abs(p0.y - p.plate.y) < 2) return p;
  return null;
}

// Enden av broen lengst fra platen (der du kommer over), til pila/kompasset etter at gåten er åpnet.
export function bridgeFarEnd(p) {
  const b = p.bridge, ax = b.axis === 'z' ? 2 : 0, o = 2 - ax, far = b.anchor === 'max' ? b.min[ax] : b.max[ax], mid = (b.min[o] + b.max[o]) / 2, c = [0, b.max[1], 0];
  c[ax] = far; c[o] = mid; return { x: c[0], y: c[1], z: c[2] };
}
export const bridgeMid = (p) => ({ x: (p.bridge.min[0] + p.bridge.max[0]) / 2, y: p.bridge.max[1], z: (p.bridge.min[2] + p.bridge.max[2]) / 2 });
