// R55: skuffer som er lette å skille: åpen eller lukket. Ren logikk (ingen three/DOM) så den kan testes i node (test_drawers.mjs).
// Tilstanden kommer fra scenedata (`drawer: { open, front, handle, style }` på en ting med kind «drawer»), ikke fra id-navn.
// Åpen skuff: synlig front (med mørk fuge rundt), åpen kasse med lyse kanter og mørk innside øverst. Lukket skuff: flat front med tydelig fuge.
// Alt slås sammen til ÉN geometri per skuff (én tegnekall) med vertexfarger. Lokal +z er skuffas front (mot rommet).

export const DRAWER_BASE = { front: 0xe8e2d2, handle: 0xc9ccd0, fuge: 0x17120e };
let CUE = true;                                   // ⚙ → Hjelp: «Tydelige skuffer» (gjelder fra neste brett)
export const setDrawerCue = (v) => { CUE = !!v; };
export const drawerCue = () => CUE;

const num = (c, d) => (typeof c === 'number' && Number.isFinite(c) ? c : (typeof c === 'string' && /^#?[0-9a-f]{6}$/i.test(c) ? parseInt(c.replace('#', ''), 16) : d));
export function shade(c, k) {
  const r = Math.min(255, Math.round(((c >> 16) & 255) * k)), g = Math.min(255, Math.round(((c >> 8) & 255) * k)), b = Math.min(255, Math.round((c & 255) * k));
  return (r << 16) | (g << 8) | b;
}
// d: `drawer`-feltet fra scenen (kan mangle), color: tingens egen farge (brukes som front hvis d.front mangler)
export function drawerSpec(d, color) {
  const o = d && typeof d === 'object' ? d : {};
  const front = num(o.front, num(color, DRAWER_BASE.front));
  return { open: o.open !== false, front, handle: num(o.handle, DRAWER_BASE.handle), style: o.style === 'bar' ? 'bar' : 'knob', tray: shade(front, 0.9), lining: shade(front, 0.42), shadeIn: shade(front, 0.24), panel: shade(front, 1.07), fuge: DRAWER_BASE.fuge };
}

// Deler som bokser: { role, c: [x, y, z] (sentrum), s: [bredde, høyde, dybde], color }. Sentrert i boksen (sx, sy, sz).
export function drawerParts(sx, sy, sz, spec) {
  const P = [], add = (role, c, s, color) => P.push({ role, c, s, color });
  const hy = sy / 2, hz = sz / 2, m = 0.07;                                   // m: fugebredde rundt fronten
  if (!spec.open) {                                                           // lukket: flat front, mørk fuge rundt, håndtak
    const t = Math.max(0.05, sz);
    add('fuge', [0, 0, 0], [sx, sy, t * 0.6], spec.fuge);
    add('front', [0, 0, t * 0.2], [sx - 2 * m, sy - 2 * m, t * 0.6], spec.front);
    handleParts(add, spec, 0, 0, t * 0.5, sx, sy);
    return P;
  }
  const t = Math.min(0.4, sz * 0.3), base = 0.16;                             // t: fronttykkelse, base: mørk kontaktkant under
  const iw = sx - 0.64, iz0 = -hz + 0.3, iz1 = hz - t, ilen = iz1 - iz0, izc = (iz0 + iz1) / 2;
  add('fuge', [0, -hy + base / 2, -t / 2], [sx * 0.995, base, sz - t], spec.fuge);                            // mørk kant/kontaktskygge nederst
  add('fuge', [0, 0, hz - t * 0.7], [sx, sy, t * 0.6], spec.fuge);                                            // mørk fuge bak fronten
  add('front', [0, 0, hz - t * 0.5], [sx - 2 * m, sy - 2 * m, t], spec.front);                                 // fronten står fram
  add('panel', [0, 0, hz + 0.012], [Math.max(0.2, (sx - 2 * m) * 0.72), Math.max(0.2, (sy - 2 * m) * 0.5), 0.03], spec.panel);   // innfelt speil på fronten
  const sh = sy - base, sy0 = -hy + base + sh / 2;
  for (const sg of [-1, 1]) add('side', [sg * (sx / 2 - 0.16), sy0, -t / 2], [0.32, sh, sz - t], spec.tray);   // lyse kanter øverst = skuffas vegger
  add('back', [0, sy0, -hz + 0.15], [sx - 0.64, sh, 0.3], spec.tray);
  add('lining', [0, hy - 0.06 - 0.05, izc], [iw, 0.1, ilen], spec.lining);                                    // innsiden (mørk, litt senket)
  const sTop = hy - 0.03, sT = 0.05;
  for (const sg of [-1, 1]) add('shadeIn', [sg * (iw / 2 - 0.11), sTop - sT / 2, izc], [0.22, sT, ilen], spec.shadeIn);   // mørk skygge inn mot veggene
  add('shadeIn', [0, sTop - sT / 2, iz0 + 0.11], [iw, sT, 0.22], spec.shadeIn);
  add('shadeIn', [0, sTop - sT / 2, iz1 - 0.11], [iw, sT, 0.22], spec.shadeIn);
  handleParts(add, spec, 0, sy * 0.05, hz + 0.02, sx, sy);
  return P;
}
function handleParts(add, spec, x, y, z, sx, sy) {
  if (spec.style === 'bar') {
    const w = Math.min(sx * 0.4, 3.2);
    add('handle', [x, y, z + 0.2], [w, 0.2, 0.16], spec.handle);
    for (const sg of [-1, 1]) add('handle', [x + sg * (w / 2 - 0.1), y, z + 0.08], [0.2, 0.2, 0.24], spec.handle);
  } else {
    add('handle', [x, y, z + 0.1], [0.34, 0.34, 0.24], shade(spec.handle, 0.8));
    add('handle', [x, y, z + 0.3], [0.7, 0.7, 0.24], spec.handle);
  }
}

const FACES = [
  { n: [1, 0, 0], v: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]], k: 0.82 },
  { n: [-1, 0, 0], v: [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]], k: 0.82 },
  { n: [0, 1, 0], v: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]], k: 1 },
  { n: [0, -1, 0], v: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], k: 0.5 },
  { n: [0, 0, 1], v: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], k: 0.92 },
  { n: [0, 0, -1], v: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]], k: 0.7 },
];
// Slår delene til rå buffere: { pos, nor, col (0..1, lett kantskygge per flate), idx }. Én mesh, ingen overlappende flater med lik dybde.
const lin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
export function partsBuffers(parts) {
  const pos = [], nor = [], col = [], idx = [];
  for (const p of parts) {
    const r = lin((p.color >> 16) & 255), g = lin((p.color >> 8) & 255), b = lin(p.color & 255);   // vertexfarger er lineære i three: sRGB → lineær
    for (const f of FACES) {
      const base = pos.length / 3;
      for (const v of f.v) { pos.push(p.c[0] + v[0] * p.s[0] / 2, p.c[1] + v[1] * p.s[1] / 2, p.c[2] + v[2] * p.s[2] / 2); nor.push(...f.n); col.push(r * f.k, g * f.k, b * f.k); }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  return { pos, nor, col, idx, tris: idx.length / 3 };
}

// Oppsummering av tilstanden i et brett (for test og logg): { open: n, closed: n, fronts: antall ulike frontfarger, handles: antall ulike håndtaksfarger }
export function drawerSummary(level) {
  const all = [...(level.boxes || []), ...(level.decor || [])].filter((b) => b.kind === 'drawer');
  const specs = all.map((b) => drawerSpec(b.drawer, b.color));
  return { total: all.length, open: specs.filter((s) => s.open).length, closed: specs.filter((s) => !s.open).length, fronts: new Set(specs.map((s) => s.front)).size, handles: new Set(specs.map((s) => s.handle)).size };
}
