// R41: kombinasjonsmotor (BotW/Scribblenauts-stil). Ren logikk uten three, testes i node (test_combo.mjs).
// Tre trinn: EGENSKAP (hva en ting er) → REGEL (hva to egenskaper gjør sammen) → RESULTAT (hva som skjer med tingene).
// Du bærer én ting (TA) og trykker TA kort ved en annen:
//   svamp (suger) + vann      → svampen blir våt: tung og myk (bløt landing, men du går saktere med den)
//   håndkle + håndkle         → knyttes til ett langt tau (rulles ut som et bånd over en kant, tåler hele nedturen)
//   tung ting + papirhaug     → haugen presses sammen til et lavere trinn
// Ingen kombinasjon er nødvendig for å nå målet: de er alternative veier (se docs/KLATREHJELP.md).
// physics.js kaller findCombo / applyCombo (fra useTool når du bærer en ting uten verktøy), og toolHint for knappen.

export const COMBO = {
  on: true,
  reach: 1.7,      // hvor nær (vannrett, fra figuren til tingens kant) du må stå
  wetGrow: 1.5,    // svampen sveller til denne faktoren i høyden
  wetSoft: 0.15,   // andel av landingsfarten en våt svamp tar imot (tørr myk flate: P.softFactor)
  wetSlow: 0.85,   // fartsfaktor når du bærer en våt svamp (på toppen av vanlig bærefart)
  pressTo: 0.5,    // en presset papirhaug blir denne andelen av høyden
  knotMul: 1.8,    // et knyttet håndkle-tau er så mange ganger lengre enn et dopapirbånd
  vaultAnim: true, // stavhopp-animasjon (vault_anim.js)
};

// 1) EGENSKAPER: per kind (fast), pluss de som ligger på tingen selv (våt, tung, flagg i brettet).
export const KIND_PROPS = {
  sponge: ['absorbent'],
  towel: ['knottable'],
  water_bowl: ['water'],
};
const FLAGS = { wet: 'wet', compress: 'compressible' };
export function propsOf(t) {
  const s = new Set(KIND_PROPS[t?.kind] || []);
  if (!t) return s;
  for (const [k, v] of Object.entries(FLAGS)) if (t[k]) s.add(v);
  if (t.weight === 'heavy') s.add('heavy');
  if (t.wet) { s.add('heavy'); s.delete('absorbent'); }
  if (t.knotted) { s.delete('knottable'); s.add('rope'); }
  if (t.pressed) s.delete('compressible');
  return s;
}

// 2) REGLER: a = egenskap hos det du bærer, b = egenskap hos det du står ved, gjør = resultatnavn.
export const RULES = [
  { id: 'sponge_water', a: 'absorbent', b: 'water', does: 'wet', btn: 'soak' },
  { id: 'towel_towel', a: 'knottable', b: 'knottable', does: 'knot', btn: 'knot' },
  { id: 'pile_press', a: 'heavy', b: 'compressible', does: 'press', btn: 'press' },
];
export const RULE_IDS = RULES.map((r) => r.id);
export const matchRule = (carry, other) => {
  const pa = propsOf(carry), pb = propsOf(other);
  return RULES.find((r) => pa.has(r.a) && pb.has(r.b)) || null;
};

// Ting innen rekkevidde: løse (L.bodies) og faste (L.boxes uten dyn, ikke gulv/vegg). Avstand vannrett fra figuren til tingens kant.
export function thingsNear(p, L, reach = COMBO.reach, H = 1) {
  const out = [], seen = new Set();
  for (const b of [...(L.bodies || []), ...(L.boxes || [])]) {
    if (seen.has(b)) continue; seen.add(b);
    if (b.alive === false || b.carried || b === p.carry || b.owner || b.type === 'floor' || b.type === 'wall') continue;
    if (!KIND_PROPS[b.kind] && !b.compress && !b.wet) continue;
    const dx = Math.max(b.min[0] - p.x, 0, p.x - b.max[0]), dz = Math.max(b.min[2] - p.z, 0, p.z - b.max[2]), d = Math.hypot(dx, dz);
    if (d > reach || b.max[1] < p.y - 0.3 || b.min[1] > p.y + H + 0.6) continue;
    out.push({ b, d });
  }
  return out.sort((x, y) => x.d - y.d);
}

// Finn en kombinasjon for det du bærer: { rule, other } eller null. Krever at du står på bakken og at kombinasjoner er på.
export function findCombo(p, L, cfg = COMBO) {
  const c = p.carry; if (!cfg.on || !c || c.tool || !p.onGround) return null;
  for (const { b } of thingsNear(p, L, cfg.reach)) {
    if (b === p.groundBox && matchRule(c, b)?.does === 'press') continue;      // ikke press haugen du står på
    const rule = matchRule(c, b); if (!rule || (rule.does === 'knot' && !b.dyn)) continue;      // bare løse håndklær kan knyttes (ikke de som henger fast)
    return { rule, other: b };
  }
  return null;
}
// Hint-navn for TA-knappen (brukes av physics.toolHint): 'wet' | 'knot' | 'press' eller null.
export const comboHint = (p, L, cfg = COMBO) => findCombo(p, L, cfg)?.rule.does || null;

// 3) RESULTATER. ops = { removeBody(L, b, type) } fra physics.js. Returnerer hendelsen som ble lagt i L.events.
export function applyCombo(found, p, L, ops, cfg = COMBO) {
  const { rule, other } = found, c = p.carry; L.events = L.events || [];
  if (rule.does === 'wet') {
    const h = c.max[1] - c.min[1];
    c.wet = true; c.weight = 'heavy'; c.softK = cfg.wetSoft; c.max[1] = c.min[1] + h * cfg.wetGrow;
  } else if (rule.does === 'knot') {
    ops.removeBody(L, other, 'used');
    c.knotted = true; c.tool = 'roll'; c.stripMul = cfg.knotMul; c.noTear = true;
  } else if (rule.does === 'press') {
    other.h0 = other.h0 ?? (other.max[1] - other.min[1]);
    other.pressed = true; other.max[1] = other.min[1] + other.h0 * cfg.pressTo;
    ops.dropCarry(p, L);
  }
  const ev = { type: 'combo', rule: rule.id, does: rule.does, id: c.id, other: other.id };
  L.events.push(ev);
  return ev;
}

// Tilbakestilling (resetBodies): tingene får sine opprinnelige egenskaper.
export function resetCombo(b) {
  if (b.wet) { b.wet = false; b.softK = undefined; b.weight = b.weight0 || b.weight; }
  b.knotted = false; b.stripMul = undefined; b.noTear = false;
  if (b.pressed) { b.pressed = false; if (b.h0 !== undefined) b.max[1] = b.min[1] + b.h0; }
}
