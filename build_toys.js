// R46: leker som byggematerialer. Ren logikk (ingen DOM, ingen three.js, kjøres i node).
// Husholdningsting i barneskala som deler i byggeskjermen. Geometrien (TOY_TYPES) slås inn i PART_TYPES (build_logic.js),
// materialegenskapene (TOY_MATERIAL) i MATERIAL (build_phys.js). Regeltabellen står her så den kan testes uten fysikk.
//  - blyant: stiv og lett, tynn (brekker ved liten nedbøyning)
//  - linjal: lang, lett planke som bøyer seg mye, men tåler det
//  - legoklosse: knotter som snapper til rutenettet og til andre legoklosser
//  - bok: tung blokk
//  - svamp: myk og dempende, brekker aldri
// Gummistrikk (elastisk tau) og binders (ledd) er ikke med ennå; de trenger egne koblingstyper i build_phys.js.
export const STUD = 0.5;                 // knott-avstand (enheter): samme som rutenettet, så legoklosser aldri havner «mellom» knottene

export const TOY_TYPES = {
  pencil: { w: 5, h: 0.4, name: 'Blyant', en: 'Pencil', color: '#f2c230', toy: true, icon: '✏️', snd: 'Tikk!' },
  ruler: { w: 10, h: 0.4, name: 'Linjal', en: 'Ruler', color: '#e8dfb0', toy: true, icon: '📏', snd: 'Klonk!' },
  lego: { w: 2, h: 1.2, name: 'Legoklosse', en: 'Lego brick', color: '#d8362f', toy: true, icon: '🧱', snd: 'Klikk!', knobs: 4 },
  book: { w: 3, h: 2, name: 'Bok', en: 'Book', color: '#3b6fb5', toy: true, icon: '📘', snd: 'Dunk!' },
  sponge: { w: 4, h: 1.4, name: 'Svamp', en: 'Sponge', color: '#f0d24a', toy: true, icon: '🧽', snd: 'Pøff!' },
};
// m = masse per kule, alpha = stivhet (lavere = bøyer mer), snap = største nedbøyning før den brekker, damp = fartsdemping per steg (svamp)
export const TOY_MATERIAL = {
  pencil: { m: 0.25, alpha: 0.5, snap: 0.3, mcap: 1600 },   // R49a1: mcap = bøyemoment-kapasitet (se build_phys.js)
  ruler: { m: 0.3, alpha: 0.05, snap: 1.8, mcap: 6500 },
  lego: { m: 0.8, alpha: 1 },
  book: { m: 2.5, alpha: 1 },
  sponge: { m: 0.3, alpha: 0.02, damp: 0.97 },
};
export const TOY_IDS = Object.keys(TOY_TYPES);
export const isToy = (t) => !!TOY_TYPES[t];
export const hasKnobs = (t) => !!TOY_TYPES[t]?.knobs;

// legoknotter: finn et snappunkt mot andre legoklosser (rett oppå, rett under eller rett ved siden av). others: plasserte deler { id, type, u, v, rot }.
// Returnerer { u, v, to, kind } eller null om ingen er nær nok. Bare rette klosser (rot = 0) snapper, og bare mot rette klosser.
export function legoSnap(others, id, type, u, v, rot = 0, radius = 0.9) {
  const ty = TOY_TYPES[type]; if (!ty?.knobs || Math.abs(rot) > 0.02) return null;
  let best = null, bd = radius;
  for (const o of others || []) {
    if (o.id === id || o.type !== type || Math.abs(o.rot || 0) > 0.02) continue;
    const cand = [];
    const k = Math.round((u - o.u) / STUD);
    if (Math.abs(k * STUD) < ty.w) cand.push({ u: o.u + k * STUD, v: o.v + (v >= o.v ? ty.h : -ty.h), kind: 'stack' });   // knottene på ligger i hull mellom de under
    cand.push({ u: o.u + ty.w, v: o.v, kind: 'side' }, { u: o.u - ty.w, v: o.v, kind: 'side' });
    for (const c of cand) { const d = Math.hypot(c.u - u, c.v - v); if (d < bd - 1e-9) { bd = d; best = { u: c.u, v: c.v, to: o.id, kind: c.kind }; } }
  }
  return best;
}

// oppsummering av en del (til tester og logging): masse, stivhet, bruddgrense
export function toyInfo(type, mat, partType) {
  const ty = partType(type), M = mat[type] || {}, balls = Math.max(1, Math.round(ty.w / 0.5) * (ty.w >= ty.h * 2 ? 1 : Math.max(1, Math.round(ty.h / 0.5))));
  return { type, mass: +(balls * (M.m ?? 1)).toFixed(2), alpha: M.alpha ?? 1, snap: M.snap ?? null, damp: M.damp ?? null };
}
