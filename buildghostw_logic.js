// R132: spøkelsesbro i verden og oppdragskort ved BYGG-knappen. Ren logikk (ingen DOM/three, testes i node: test_buildghostw.mjs).
// Tegningen står i buildghostw_view.js, koblingen i build.js. Alt regnes fra det som allerede ligger i brettdataene (spanOf i buildspan_logic.js: FRA og TIL):
// bro = et dekk mellom kantene, trapp = trinn opp til hylla, vippe = en planke over gapet. Ingen byggesteder, ankre eller regler endres.
import { SPAN, spanOf, spanVisible, spanParts, fmtLen } from './buildspan_logic.js';
import { requiredLoads, DEFAULT_LOAD, LOADS } from './build_loads.js';

export const GHOST = {
  thick: 0.8,         // tykkelse på dekk og planke (enheter à 5 cm)
  stepH: 1.5,         // ønsket trinnhøyde i trappa
  maxSteps: 6, minSteps: 2,
  ext: 0.6,           // vippeplanken stikker litt ut over kantene
  depthDefault: 4,    // dybde (z) når stedet ikke sier noe (site.d)
  key: 'tlm.ghostseen',   // steder der spilleren har trykket BYGG minst én gang (kortet krymper)
  fillOp: [0.3, 0.5], lineOp: [0.9, 1], dash: 0.7, gap: 0.5,
};
export const GHOST_KINDS = ['bridge', 'stairs', 'seesaw'];

// Hva slags bygg stedet ber om. Trapp: underlaget henger sammen (ingen åpen kant), men står høyere på andre siden. Vippe: ett støttepunkt (anker) midt i gapet.
export function ghostKind(site) {
  const dk = Array.isArray(site?.deck) && site.deck.length ? site.deck : null;
  const a = dk && dk[0], b = dk && dk[dk.length - 1];
  const contiguous = !!dk && dk.length > 1 && b.u0 - a.u1 < SPAN.minGap;
  if (contiguous) return 'stairs';
  if (Array.isArray(site?.anchors) && site.anchors.length === 1) return 'seesaw';
  return 'bridge';
}

// Delene som tegnes: hver er fire punkter (u, v) i stedets egne koordinater, rekkefølge nede-venstre, nede-høyre, oppe-høyre, oppe-venstre.
export function ghostSlabs(site) {
  const sp = spanOf(site), kind = ghostKind(site), { from, to } = sp, th = GHOST.thick;
  if (kind === 'stairs') {
    const rise = Math.max(0, to.v - from.v), n = Math.max(GHOST.minSteps, Math.min(GHOST.maxSteps, Math.round(rise / GHOST.stepH))), dx = (to.u - from.u) / n, out = [];
    for (let i = 0; i < n; i++) { const u0 = from.u + i * dx, u1 = u0 + dx, v1 = from.v + rise * (i + 1) / n; out.push([[u0, from.v], [u1, from.v], [u1, v1], [u0, v1]]); }
    return { kind, sp, slabs: out };
  }
  if (kind === 'seesaw') {
    const dx = to.u - from.u, dy = to.v - from.v, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, e = GHOST.ext;
    const a = [from.u - ux * e, from.v - uy * e], b = [to.u + ux * e, to.v + uy * e];
    return { kind, sp, slabs: [[[a[0], a[1] - th], [b[0], b[1] - th], [b[0], b[1]], [a[0], a[1]]]] };
  }
  return { kind, sp, slabs: [[[from.u, from.v - th], [to.u, to.v - th], [to.u, to.v], [from.u, from.v]]] };
}

// Posisjoner og farger (FRA grønn til TIL gul langs vannrett retning) for en merget linjemesh og en merget flatemesh. Verdenskoordinater.
const mix = (c0, c1, t) => [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
export function ghostBuffers(site) {
  const { kind, sp, slabs } = ghostSlabs(site), depth = site.d || GHOST.depthDefault, z0 = site.z - depth / 2, z1 = site.z + depth / 2;
  const c0 = hex(SPAN.colFrom), c1 = hex(SPAN.colTo), span = Math.max(1e-6, sp.to.u - sp.from.u);
  const lp = [], lc = [], tp = [], tc = [];
  const col = (u) => mix(c0, c1, Math.max(0, Math.min(1, (u - sp.from.u) / span)));
  const W = (u, v, z) => ({ p: [site.x + u, site.y + v, z], c: col(u) });
  const seg = (a, b) => { lp.push(...a.p, ...b.p); lc.push(...a.c, ...b.c); };
  const tri = (a, b, c) => { for (const q of [a, b, c]) { tp.push(...q.p); tc.push(...q.c); } };
  for (const s of slabs) {
    const F = s.map(([u, v]) => W(u, v, z1)), B = s.map(([u, v]) => W(u, v, z0));
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; seg(F[i], F[j]); seg(B[i], B[j]); seg(F[i], B[i]); }
    tri(F[0], F[1], F[2]); tri(F[0], F[2], F[3]); tri(B[0], B[2], B[1]); tri(B[0], B[3], B[2]);
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; tri(F[i], F[j], B[j]); tri(F[i], B[j], B[i]); }
  }
  return { kind, sp, slabs: slabs.length, line: lp, lineCol: lc, tri: tp, triCol: tc, segs: lp.length / 6, tris: tp.length / 9 };
}

// Skal spøkelset stå i verdenen? Samme regler som FRA/TIL (skjult på Ekspert uten hjelp), pluss: valget, ikke bestått, ikke byggeskjermen åpen.
export function ghostWorldVisible({ on = true, near = false, playing = true, buildOpen = false, done = false, expert = false, help = 'normal' } = {}) {
  return !!on && !done && spanVisible({ on: true, buildOpen, playing, expert, help, inRange: !!near });
}

// Oppdragskortet: én setning om hva som skal bygges, over hva, hva som kjører over og gapets mål. T = oversettelse.
export function loadIds(site) { const r = requiredLoads(site); return r.length ? r : [DEFAULT_LOAD]; }
export function loadsText(site, T) {
  const names = loadIds(site).map((id) => T('ghw.load.' + id));
  return names.length <= 1 ? names[0] : names.slice(0, -1).join(', ') + ' ' + T('ghw.and') + ' ' + names[names.length - 1];
}
export function ghostCard(site, T, { touch = true } = {}) {
  const kind = ghostKind(site), sp = spanOf(site), pr = spanParts(sp), loads = loadsText(site, T), ids = loadIds(site);
  const key = kind === 'seesaw' && pr.dir === 'level' ? 'bridge' : kind;
  const args = { loads, g: pr.gap, z: pr.dv };
  const tap = T('ghw.tap', { btn: touch ? T('build.enter') : T('build.enterKey') });
  return {
    kind, icon: ids.length === 1 ? (LOADS[ids[0]]?.icon || '') : ids.map((i) => LOADS[i]?.icon || '').join(''),
    title: T('ghw.title'), full: T('ghw.' + key, args), short: T('ghw.short.' + key, args), tap,
  };
}
export const cardCompact = (seen, id) => Array.isArray(seen) && seen.includes(id);
export const cardMark = (seen, id) => (Array.isArray(seen) && seen.includes(id) ? seen : [...(Array.isArray(seen) ? seen : []), id]);
export { fmtLen };
