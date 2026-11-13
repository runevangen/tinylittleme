// R49a2: materialtabell for byggedelene. Ren data og regler (ingen DOM, ingen three.js, kjøres i node), brukt av fysikken (build_phys.js) og testene.
// Hver del har ett sett egenskaper:
//  m       masse per kule (tetthet = m / areal per kule, se `density`)
//  alpha   bøyestivhet (0..1 per runde i formtilpasningen, lavere = bøyer mer)
//  mcap    bøyemoment-kapasitet for profil med dybde 1 (R49a1); snap = bare rangering
//  E       stivhet (elastisitetsmodul, relativ: planke = 1000). Styrer knekking: Pcr = EULER · E · h³ / L²  (h = dybde, L = lengde; kapasitet ∝ EI/L²)
//  st, sc  styrke per dybde i strekk og i trykk (kraft per enhet dybde): strekkapasitet = st · h, knusekapasitet = sc · h
//  brittle 1 = sprø (brekker brått), 0 = seig (bøyer seg først, se duct)
//  duct    hvor mye over bøyekapasiteten delen tåler mens den gir etter (0 = ingenting)
//  damp    fartsdemping per steg (svamp)
//  fric    friksjon mot andre deler (0..1)
//  axial   hvor stiv delen er langs lengden (1 = nesten uuttøyelig, svamp er myk)
// Gummistrikk er ingen del, men en kobling: se BAND (stivhet og bruddgrense).
export const EULER = 822;              // π²/12 · 1000: gir Pcr = 822 · E · h³ / L² (fritt opplagt i begge ender)
export const FRIC_DEFAULT = 0.7;
export const AXIAL_CAL = 0.85;          // målt kraft langs delen ligger 20–40 % over statikken (Gauss-Seidel og støt); skaleres ned så Euler-lasten stemmer i fagverk
export const CRUSH_FILTER = 0.05;      // glatting av kraft langs delen per steg (demper støt)

// planke: samme formler som R49a1 (profildybde d gir masse ∝ √d, stivhet ∝ d³, kapasitet ∝ d²)
const beam = (m, alpha, mc, d = 1) => ({ m: m * Math.sqrt(d), alpha: Math.min(1, alpha * d * d * d), mcap: mc * d * d, d, snap: 0.9 });
const MC_PLANK = 2200, MC_SEESAW = 5000;
const wood = { E: 1000, st: 12000, sc: 14000, brittle: 1, duct: 0, fric: FRIC_DEFAULT, axial: 1 };

export const MATERIALS = {
  plank_s: { ...beam(0.5, 0.12, MC_PLANK), ...wood },
  plank_l: { ...beam(0.5, 0.03, MC_PLANK), ...wood },
  plank_t: { ...beam(0.5, 0.03, MC_PLANK, 2.4), ...wood },
  seesaw: { m: 0.5, alpha: 0.6, snap: 3, mcap: MC_SEESAW, ...wood },
  block: { m: 1, alpha: 1, E: 1000, st: 9000, sc: 8000, brittle: 1, duct: 0, fric: FRIC_DEFAULT, axial: 1 },
  weight: { m: 5, alpha: 1, E: 3000, st: 20000, sc: 60000, brittle: 0, duct: 0, fric: FRIC_DEFAULT, axial: 1 },
  // leker (R46): blyanten er slank og knekker lett i trykk, tåler mer i strekk; linjalen er seig plast; legoklosse og bok er sprø men tåler trykk; svampen gir etter jevnt
  pencil: { m: 0.25, alpha: 0.5, snap: 0.3, mcap: 1600, E: 800, st: 12000, sc: 16000, brittle: 1, duct: 0, fric: 0.5, axial: 1 },
  ruler: { m: 0.3, alpha: 0.05, snap: 1.8, mcap: 6500, E: 700, st: 14000, sc: 14000, brittle: 0, duct: 1.2, fric: 0.5, axial: 1 },
  lego: { m: 0.8, alpha: 1, E: 2000, st: 6000, sc: 4500, brittle: 1, duct: 0, fric: 0.6, axial: 1 },
  book: { m: 2.5, alpha: 1, E: 1500, st: 8000, sc: 6000, brittle: 1, duct: 0, fric: 0.7, axial: 1 },
  sponge: { m: 0.3, alpha: 0.02, damp: 0.97, E: 20, st: 1500, sc: 3000, brittle: 0, duct: 4, fric: 1, axial: 0.12 },
};
// gummistrikk: ekte fjær (kraft = K · utstrekning), bare i strekk; ryker ved BAND.snap
export const BAND = { K: 240, snap: 1500 };

export const materialOf = (t) => MATERIALS[t] || MATERIALS.block;
// areal per kule (kjedene har kulene på en linje, tykkelsen er h): tetthet = masse / areal
export function density(type, ty) { const M = materialOf(type), slim = ty.w >= ty.h * 2, ball = slim ? 0.5 * ty.h : 0.25; return +(M.m / ball).toFixed(3); }

// kapasitetene for en slank del (kjede) av en gitt lengde L og dybde h. Alt er kraft (masse · enhet / s²).
export function buckleLoad(type, L, h) { const M = materialOf(type); return EULER * M.E * h * h * h / (L * L); }       // Euler-knekking: ∝ E · h³ / L²
export const tensionCap = (type, h) => materialOf(type).st * h;
export const crushCap = (type, h) => materialOf(type).sc * h;
// hva som røyk først for en slank del: knekker den i trykk før den ryker i strekk? (til tester, hjelp og tekst)
export function capacities(type, ty) {
  const L = Math.max(ty.w, ty.h), h = Math.min(ty.w, ty.h), P = buckleLoad(type, L, h), T = tensionCap(type, h), C = crushCap(type, h);
  return { type, L, h, buckle: P, tension: T, crush: C, compression: Math.min(P, C), slender: P < T, ratio: +(L / h).toFixed(2) };
}
// R49a2: hvor nær knekking er en del (0 = ingen last, 1 = knekker nå)? n = trykkraft langs delen.
export const buckleRatio = (n, pcr) => (pcr > 0 ? Math.max(0, n) / pcr : 0);
