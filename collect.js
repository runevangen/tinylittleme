// Smuler (R3): gullfargede smuler som ligger rundt i brettet som belønning for å utforske.
// Ren logikk (ingen tegning, kan testes i node); modellen (buildCrumb) ligger i props.js. Smulene hører til brettet (`collectibles` i level.json):
//   { id, x, y, z }   y er midten av smula (like over flaten). Du plukker den ved å gå (eller hoppe) inn i den.
export const CRUMB = {
  rad: 1.25,                // plukkradius (horisontalt), i enheter (1 enhet = 5 cm)
  below: 0.5, above: 1.7,   // hvor langt under / over føttene dine midten av smula kan ligge og likevel bli tatt
  points: 10,               // poeng per smule
  lift: 0.8,                // midten av smula over flaten (brukes av scene2level)
};

export function initCollect(L) {
  L.crumbList = (L.collectibles || []).map((c) => ({ id: c.id, x: c.x, y: c.y, z: c.z, got: false, phase: Math.random() * 6 }));
}
export function resetCollect(L) { for (const c of L.crumbList || []) c.got = false; }
export const crumbTotal = (L) => (L.crumbList || []).length;
export const crumbCount = (L) => (L.crumbList || []).filter((c) => c.got).length;
export const collectedIds = (L) => (L.crumbList || []).filter((c) => c.got).map((c) => c.id);
// fra autolagringen: ukjente id-er (brettet er endret) ignoreres
export function restoreCollected(L, ids) {
  const set = new Set(Array.isArray(ids) ? ids : []);
  for (const c of L.crumbList || []) c.got = set.has(c.id);
  return crumbCount(L);
}
export function crumbReachable(c, p) {
  const dy = c.y - p.y;
  return Math.hypot(c.x - p.x, c.z - p.z) < CRUMB.rad && dy > -CRUMB.below && dy < CRUMB.above;
}
// Ett tidssteg: plukk smulene spilleren berører. Returnerer hendelser [{ type: 'crumb', id, x, y, z, n, total }].
export function stepCollect(L, p, dt, active = true) {
  const ev = [];
  for (const c of L.crumbList || []) {
    c.phase += dt;
    if (c.got || !active) continue;
    if (crumbReachable(c, p)) { c.got = true; ev.push({ type: 'crumb', id: c.id, x: c.x, y: c.y, z: c.z, n: crumbCount(L), total: crumbTotal(L) }); }
  }
  return ev;
}
