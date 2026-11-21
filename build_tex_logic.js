// R117: teksturer på bygde deler i verdenen. Ren logikk (ingen DOM, ingen three.js, kjøres i node): hvilket materiale en del-type har,
// hvor store «fliser» teksturen har i verden (så UV følger lengden og aldri strekkes), tonevariasjon per del og knotter på klosser.
import { parseRod } from './build_materials.js';

// materialfamilier: én tekstur og ett materiale per familie (og farge), ikke per del
export const TEX_KINDS = ['wood', 'steel', 'rope', 'plastic', 'pencil', 'ruler', 'cloth', 'sponge'];
// flisestørrelse i verdenen [u, v] (enheter): teksturen gjentas hver slik flis. Trekornet går langs u (delens lengde).
export const TILE = { wood: [8, 1], steel: [4, 0.5], rope: [1, 0.3], plastic: [2, 2], pencil: [5, 0.4], ruler: [2.5, 0.4], cloth: [2, 2], sponge: [2, 2] };
// materialegenskaper per familie (roughness, metalness)
export const SURF = { wood: { rough: 0.7, metal: 0 }, steel: { rough: 0.4, metal: 0.2 }, rope: { rough: 0.9, metal: 0 }, plastic: { rough: 0.3, metal: 0 }, pencil: { rough: 0.5, metal: 0 }, ruler: { rough: 0.4, metal: 0 }, cloth: { rough: 0.85, metal: 0 }, sponge: { rough: 0.95, metal: 0 } };
export const TONE = 0.06;   // ±6 % tone per del

export function texKind(type) {
  const r = parseRod(type); if (r) return r.mat === 'cable' ? 'steel' : r.mat;      // staver: tre, stål, tau (R127: kabel er en stålwire)
  switch (type) {
    case 'block': case 'lego': return 'plastic';
    case 'weight': return 'steel';
    case 'pencil': return 'pencil';
    case 'ruler': return 'ruler';
    case 'book': return 'cloth';
    case 'sponge': return 'sponge';
    default: return 'wood';                           // planker, vippe og alt ukjent
  }
}
export const hasKnobs = (type) => type === 'lego' || type === 'block';

// stabil hash (FNV-1a) -> 0..1, fra del-id (samme del = samme utseende mellom økter)
export function hash01(s, salt = '') { let h = 2166136261; const t = String(s) + '|' + salt; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; }
export const toneFor = (id) => +(1 + (hash01(id, 'tone') * 2 - 1) * TONE).toFixed(4);   // 0,94 ... 1,06
// forskyvning av flisen (kvistene havner forskjellig sted per del)
export const uvOffset = (id) => ({ u: +hash01(id, 'u').toFixed(4), v: +hash01(id, 'v').toFixed(4) });

// antall gjentakelser av flisen per flate på en boks (w lang langs x, h høy langs y, d dyp langs z).
// BoxGeometry-rekkefølge: +x, -x, +y, -y, +z, -z. En flate er (bredde langs u, høyde langs v) i verdensenheter; repeat = mål / flis (tetthet likt overalt, ingen strekk).
export function faceRepeats(kind, w, h, d) {
  const [tu, tv] = TILE[kind] || TILE.wood, f = (a, b) => ({ u: a / tu, v: b / tv });
  return [f(d, h), f(d, h), f(w, d), f(w, d), f(w, h), f(w, h)];
}
// knottene på oversiden: rutenett med 1 enhets avstand, sentrert (maks 12 for å holde trekantene nede)
export function knobGrid(w, d, step = 1, max = 12) {
  let nx = Math.max(1, Math.floor(w / step + 1e-6)), nz = Math.max(1, Math.floor(d / step + 1e-6));
  while (nx * nz > max) { if (nz >= nx) nz--; else nx--; }
  const out = []; for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) out.push({ x: (i - (nx - 1) / 2) * step, z: (k - (nz - 1) / 2) * step });
  return out;
}
export const KNOB_R = 0.28, KNOB_H = 0.07;
