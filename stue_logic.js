// R62: Stuen (nivå 8). Ren logikk uten three (testes i node, test_stue.mjs): hvilket hint skal vises nå (finn fjernkontrollen, bær den til plata, bygg broen),
// og en oppsummering av rommet til rapporten. Selve rommet er data (scenes/stue.scene.json, laget av tools/make_stue.mjs); gåten bruker plates_logic.js (R60),
// byggestedet build.js (R30), og teppet/sofaen er vanlige bokser (puter er myke). Hintene nevner knappene (TA, BYGG), aldri taster.
export const STUE = {
  id: 'stue', hintGap: 14,        // hvor langt unna (enheter) du må være en ting for at hintet om den vises
  plateNear: 14, buildNear: 12,   // nær plata / nær gapet mellom sofaen og bordet
};
export const isStue = (L) => !!L && (L.name === 'Nivå 8: Stuen' || L.id === STUE.id || /stue/i.test(String(L.audio?.theme || '')));

const d2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const mid = (b) => [(b.min[0] + b.max[0]) / 2, (b.min[2] + b.max[2]) / 2];

// Hvilket hint passer nå? Returnerer nøkkelen i i18n (stue.*) eller null. Hvert hint vises bare én gang (seen = Set med nøkler) og aldri etter at gåten er løst.
// p = figuren, L = brettet med L.gateS (R60) og L.movables. built = byggestedet er løst.
export function stueHint(L, p, seen = new Set(), built = false) {
  if (!isStue(L) || !p || !p.onGround) return null;
  const s = L.gateS, door = s?.doors?.find((d) => d.id === 'd1'), plate = s?.plates?.find((q) => q.id === 'p1');
  const pick = (k) => (seen.has(k) ? null : k);
  if (door && plate && !(door.latched || door.t >= 0.999)) {
    const pc = [(plate.x0 + plate.x1) / 2, (plate.z0 + plate.z1) / 2], rc = remote(L);
    if (p.carry && p.carry.id === 'fjernkontroll' && d2(p.x, p.z, pc[0], pc[1]) < STUE.plateNear * 2) return pick('stue.plate');
    if (!p.carry && d2(p.x, p.z, pc[0], pc[1]) < STUE.plateNear) return pick('stue.door');
    if (!p.carry && rc && d2(p.x, p.z, rc[0], rc[1]) < STUE.hintGap) return pick('stue.remote');
    return null;
  }
  const gap = L.build?.sites?.[0];
  if (gap && !built && gap.x !== undefined && d2(p.x, p.z, gap.x, gap.z) < STUE.buildNear * 2.5 && p.y > gap.y - 1.5) return pick('stue.build');
  return null;
}
export function remote(L) { const b = (L.movables || L.bodies || []).find((m) => m.id === 'fjernkontroll'); return b ? mid(b) : null; }

// Til rapporten: hva rommet har (logges én gang når brettet åpnes).
export function stueSummary(L) {
  const g = L.gateS || L.gates || {}, boxes = L.boxes || [];
  return {
    cushions: boxes.filter((b) => b.kind === 'cushion' && b.soft).length,
    plates: (g.plates || []).length, doors: (g.doors || []).length,
    goals: (L.goals || []).length, crumbs: (L.collectibles || []).length, foes: (L.ants || []).length,
    hasBuild: !!L.build?.sites?.length, hasRemote: !!remote(L),
  };
}
