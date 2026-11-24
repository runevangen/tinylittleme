// R157: roller i byggeren: GULV, BJELKE og TAU. Ren logikk (ingen DOM, ingen three.js, kjøres i node).
//  - gulv:   kan gås på, bærer last, stopper figuren og løse ting (ball, bil, robot)
//  - bjelke: bærer last, men stopper ingenting (ligger bak veibanen: figuren og lasten går forbi) og kan ikke gripes
//  - tau:    bærer bare i strekk, stopper ingenting
// Rollen er ETT felt per stav/del (`role`), og det settes bare når spilleren har valgt selv. Uten valg gjelder standardrollen,
// som følger delen når den flyttes eller roteres. Fysikken (bæreevne, knekking, brudd) er helt uendret: rollen styrer bare hva lasten
// i PRØV støter mot (`def.loadPass`, build_phys.js) og hva som blir faste flater i rommet (`opts.skip`, build_world.js).
// Rutenett-stavene bruker de samme reglene fra grid_logic.js (rodRole); klassiske deler bruker partRole her.
import { parseRod, GRID_MAT } from './build_materials.js';

export const ROLE_FLOOR = 'gulv', ROLE_BEAM = 'bjelke', ROLE_ROPE = 'tau';
export const ROLES = [ROLE_FLOOR, ROLE_BEAM, ROLE_ROPE];
export const ROLE_CHOICES = [ROLE_FLOOR, ROLE_BEAM];            // det spilleren kan velge mellom (rekkefølgen er en del av kodeformatet: 1 = gulv, 2 = bjelke)
export const ROLE_MAX_TILT = Math.PI / 6;                       // flatere enn 30° = gulv, brattere = bjelke
export const ROLE_GAP = 2.4;                                    // hopplengden (enheter): lengre gap mellom gulvdeler markeres før prøven
// pass: ⚙ → Admin `buildgridpass` (R108). Av = hele ordningen er av: alle deler er faste som før. gap: ⚙ → Admin `buildrolegap`.
export const ROLEOPT = { pass: true, gap: ROLE_GAP };

export const isChoice = (r) => r === ROLE_FLOOR || r === ROLE_BEAM;
export const roleCode = (r) => (isChoice(r) ? ROLE_CHOICES.indexOf(r) + 1 : 0);      // til delekodene: 0 = ikke valgt
export const roleFromCode = (n) => ROLE_CHOICES[n - 1] || null;
// helningen fra vannrett (0 … π/2), uansett hvilken vei delen peker
export function tiltOf(rot) { const t = Math.abs(rot || 0) % Math.PI; return Math.min(t, Math.PI - t); }
export const tiltRole = (rot) => (tiltOf(rot) <= ROLE_MAX_TILT + 2e-3 ? ROLE_FLOOR : ROLE_BEAM);
export const isPlank = (type) => typeof type === 'string' && type.startsWith('plank_');
// deler som aldri kan bytte rolle: vippeplanken er alltid gulv, tau-materialer (tau, kabel) er alltid tau
export function fixedRole(type) {
  if (type === 'seesaw') return ROLE_FLOOR;
  const r = parseRod(type); if (r && GRID_MAT[r.mat]?.rope) return ROLE_ROPE;
  return null;
}
// klassisk bygger: planker følger helningen, klosser og leker starter som gulv
export const classicDefault = (p) => fixedRole(p.type) || (isPlank(p.type) ? tiltRole(p.rot) : ROLE_FLOOR);
export const partRole = (p) => fixedRole(p.type) || (isChoice(p.role) ? p.role : classicDefault(p));
export const partCanSwitch = (p) => !!p && !fixedRole(p.type);
export const nextRole = (r) => (r === ROLE_FLOOR ? ROLE_BEAM : ROLE_FLOOR);
// id-ene lasten og figuren går forbi (alt som ikke er gulv). Tom når ordningen er slått av.
export const classicPass = (placed) => (ROLEOPT.pass ? (placed || []).filter((p) => partRole(p) !== ROLE_FLOOR).map((p) => p.id) : []);
// definisjonen fysikken vil ha for et klassisk bygg (B.placed/B.links eller et referansebygg), med rollene lagt på
export function classicDef(site, placed, links) {
  const pass = classicPass(placed);
  return { site, placed: (placed || []).map((p) => ({ id: p.id, type: p.type, u: p.u, v: p.v, rot: p.rot })), links: links || [], ...(pass.length ? { loadPass: pass } : {}) };
}
export const classicSkip = (placed) => { const pass = classicPass(placed); return pass.length ? new Set(pass) : null; };

// ---------- tall til rapport og logg ----------
// roles: liste av { role, chosen }
export function roleCount(list) {
  const out = { gulv: 0, bjelke: 0, tau: 0, valgt: 0 };
  for (const q of list || []) { if (out[q.role] != null) out[q.role]++; if (q.chosen) out.valgt++; }
  return out;
}
export const roleLine = (c) => `gulv ${c.gulv}, bjelke ${c.bjelke}, tau ${c.tau} (valgt selv: ${c.valgt})`;

// ---------- varsler før prøven ----------
// spans: gulvdelenes utstrekning bortover [{ u0, u1 }], ground: underlaget på hver side [{ u0, u1 }], from/to: start og mål (u).
// Returnerer hullene i gulvet mellom start og mål som er lengre enn hopplengden: [{ u0, u1, len }].
export function floorGaps(spans, ground, from, to, maxGap = ROLEOPT.gap) {
  const lo = Math.min(from, to), hi = Math.max(from, to);
  const all = [...(spans || []), ...(ground || [])].filter((s) => Number.isFinite(s.u0) && Number.isFinite(s.u1)).map((s) => ({ u0: Math.min(s.u0, s.u1), u1: Math.max(s.u0, s.u1) })).sort((a, b) => a.u0 - b.u0);
  const gaps = []; let reach = lo;
  for (const s of all) {
    if (s.u1 <= reach) continue; if (s.u0 >= hi) break;
    if (s.u0 > reach + 1e-6) gaps.push({ u0: reach, u1: s.u0, len: s.u0 - reach });
    reach = Math.max(reach, s.u1);
  }
  if (reach < hi - 1e-6) gaps.push({ u0: reach, u1: hi, len: hi - reach });
  return gaps.filter((g) => g.len > maxGap + 1e-6);
}
// samlet varsel: { none: true } når bygget har deler, men ingen er gulv; ellers hullene. Av = ingen varsler.
export function roleWarnings({ parts, floorSpans, ground, from, to, maxGap }) {
  if (!ROLEOPT.pass || !parts) return { none: false, gaps: [] };
  return { none: !(floorSpans || []).length, gaps: floorGaps(floorSpans, ground, from, to, maxGap) };
}
