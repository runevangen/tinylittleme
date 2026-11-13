// R41: stavhopp-animasjon. Ren logikk uten three (testes i test_combo.mjs): gitt fysikkens tilstand (loddrett fart, avsparkfart,
// tid i lufta) gir vaultPose() målverdier for figurens ledd og stavens helning. main.js legger dem inn i poseHero (T-objektet)
// og heller den bårne staven. Fysikken (launchVy i physics.js) er uendret, bortsett fra at den husker avsparkfarten i p.vaultV0.
//
// Faser (r = vy / avspark): 1) PLANT: staven settes ned foran og figuren skyver fra (r > 0,7), 2) SVING: kroppen henger etter staven
// og bena svinger opp og frem (0,7 > r > 0,1), 3) TOPP: strekk over staven, bena fremover, armene skyver fra (0,1 > r > -0,35),
// 4) SLIPP: staven slippes, armene ut til siden, bena ned mot landing (r < -0,35).

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sm = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

export function vaultPhase(r) {
  if (r > 0.7) return 'plant';
  if (r > 0.1) return 'swing';
  if (r > -0.35) return 'top';
  return 'release';
}

// Er figuren midt i et stavhopp? (bærer en stav, i lufta, fysikken har merket hoppet som stavhopp)
export const isVaulting = (p, on = true) => !!on && !!p && !!p.vaulting && !p.onGround && !!p.carry?.pole && p.state === 'air';

// Målverdier for T i poseHero + poleTilt (radianer rundt stavens tverraksel; negativ = fremre ende nedover).
export function vaultPose(p) {
  const v0 = Math.max(1, p.vaultV0 || p.vy || 1), r = clamp((p.vy || 0) / v0, -1.6, 1), ph = vaultPhase(r);
  const a = sm((r - 0.55) / 0.45);                  // 1 ved avspark (plant)
  const sw = sm((0.95 - r) / 0.5) * (1 - sm((0.1 - r) / 0.45));   // midt i svingen
  const top = sm((0.2 - r) / 0.3) * (1 - sm((-0.35 - r) / 0.3)); // toppen
  const rel = sm((-0.2 - r) / 0.5);               // etter toppen: slipp og land
  const T = {
    aL: mix(-1.3, -2.0, 1 - a) * (1 - rel) + -0.5 * rel, aR: mix(-1.1, -1.9, 1 - a) * (1 - rel) + -0.5 * rel,   // armene holder staven fremover/opp, så skyver de fra
    eL: -0.45 * (1 - top) - 0.1 * top, eR: -0.4 * (1 - top) - 0.1 * top,
    zL: 0.12 + 0.55 * rel, zR: -0.12 - 0.55 * rel,                                                           // slipp: armene ut til siden
    hL: -0.7 * a + (-1.35) * sw + (-0.9) * top + 0.1 * rel, hR: -0.2 * a + (-1.1) * sw + (-0.7) * top - 0.05 * rel,   // bena svinger opp og frem
    kL: 0.5 * a + 1.5 * sw + 0.6 * top + 0.3 * rel, kR: 0.9 * a + 1.3 * sw + 0.7 * top + 0.35 * rel,
    lean: 0.15 * a - 0.35 * sw + 0.1 * top + 0.1 * rel, chest: 0.1 * a - 0.15 * sw + 0.05 * top, hp: -0.1 * sw,
    twist: 0.18 * sw, fgL: 1.2 * (1 - rel) + 0.2 * rel, fgR: 1.2 * (1 - rel) + 0.2 * rel,
  };
  // staven: plantet skrått foran (nedover), reiser seg mens figuren svinger over, og stikker oppover når den slippes
  const KEY = [[1, -1.1], [0.7, -0.95], [0.1, -0.35], [-0.35, 0.4], [-1, 0.8]];
  let poleTilt = KEY[KEY.length - 1][1];
  for (let i = 0; i < KEY.length - 1; i++) { const [r0, t0] = KEY[i], [r1, t1] = KEY[i + 1]; if (r <= r0 && r >= r1) { poleTilt = mix(t0, t1, (r0 - r) / (r0 - r1)); break; } }
  return { T, phase: ph, r, poleTilt };
}
