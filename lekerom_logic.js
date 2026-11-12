// R31: Lekerommet (nivå 7). Ren logikk uten three (testes i node, test_lekerom.mjs): legoknotter på gulv og tak, og marsjen til tinnsoldaten (den egne fienden).
// Tegningen ligger i lekerom_view.js. Brettet (`lego` i level.json, laget av tools/scene2level.mjs fra `lego` i scenen):
//   { floor: bool, ceiling: bool, color: '#rrggbb' (knott på gulvet), ceilColor, plates: [[x0, x1, z0, z1, '#rrggbb']] (fargede plater i gulvet, enheter) }
// Knottene er bare utseende (ingen kollisjon). De fargede platene peiler deg i rommet; knottene hopper over det som står på gulvet.
export const LEGO = {
  pitchFloor: 3.2, pitchCeil: 5.6,     // avstand mellom knotter (enheter, 1 enhet = 5 cm): 16 cm på gulvet, 28 cm i taket (få trekanter: rommet har allerede nær hele budsjettet)
  maxFloor: 650, maxCeil: 220,         // tak på antall (økes pitch til det passer)
  studR: 0.55, studH: 0.14, sides: 6,   // sekskantet knott: 18 trekanter (sider + lokk, ingen bunn)
  trisPerStud: 18, wallGap: 0.9,        // minste avstand fra veggen
  budget: { calls: 2, tris: 16000 },    // etter oppbygging: to tegnekall (gulv og tak, én InstancedMesh hver), høyst 16 000 trekanter til sammen
};
export const isLekerom = (L) => !!(L && L.lego && (L.lego.floor || L.lego.ceiling));
export const hexInt = (c, d = 0x46bb6c) => { const n = typeof c === 'number' ? c : parseInt(String(c || '').replace('#', ''), 16); return Number.isFinite(n) ? n : d; };

// Rektanglene på gulvet som er dekket av ting (knottene tegnes ikke under dem): bokser som står på gulvet, ikke vegger og gulvet selv.
export function floorBlocks(L, margin = 0.3) {
  return (L.boxes || []).filter((b) => b.type !== 'floor' && b.type !== 'wall' && b.min[1] < 0.5).map((b) => [b.min[0] - margin, b.max[0] + margin, b.min[2] - margin, b.max[2] + margin])
    .concat((L.movables || []).filter((b) => b.min[1] < 0.5).map((b) => [b.min[0] - margin, b.max[0] + margin, b.min[2] - margin, b.max[2] + margin]));
}
const inRect = (x, z, r) => x > r[0] && x < r[1] && z > r[2] && z < r[3];
// Rutenett av knotter innenfor rommet. mode 'floor' hopper over det som er dekket; 'ceil' dekker hele taket. Pitch økes til antallet er under taket.
export function studGrid(L, mode, { pitch, max, blocks = [] } = {}) {
  const R = L.room; if (!R || !Number.isFinite(R.x0)) return [];
  const gap = LEGO.wallGap, w = R.x1 - R.x0 - 2 * gap, d = R.z1 - R.z0 - 2 * gap; if (w <= 0 || d <= 0) return [];
  for (let k = 0; k < 40; k++) {
    const nx = Math.max(1, Math.floor(w / pitch) + 1), nz = Math.max(1, Math.floor(d / pitch) + 1), sx = nx > 1 ? w / (nx - 1) : 0, sz = nz > 1 ? d / (nz - 1) : 0, out = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const x = R.x0 + gap + (nx > 1 ? i * sx : w / 2), z = R.z0 + gap + (nz > 1 ? j * sz : d / 2);
      if (mode === 'floor' && blocks.some((r) => inRect(x, z, r))) continue;
      out.push([+x.toFixed(3), +z.toFixed(3)]);
    }
    if (out.length <= max) return out;
    pitch *= 1.08;
  }
  return [];
}
// Hele planen for et brett: knotter på gulv og tak med farge. quality 'mid' (Lav profil På) gir glissnere knotter; density er et valg i ⚙ (admin).
export function studPlan(L, { quality = 'high', density = 1 } = {}) {
  if (!isLekerom(L)) return { floor: [], ceil: [], studs: 0, tris: 0, pitch: 0 };
  const k = (quality === 'mid' ? 1.4 : 1) / Math.sqrt(Math.max(0.25, density)), g = L.lego, plates = (g.plates || []).map(([a, b, c, d, col]) => [a, b, c, d, hexInt(col)]);
  const base = hexInt(g.color), colorAt = (x, z) => (plates.find((r) => inRect(x, z, r)) || [0, 0, 0, 0, base])[4];
  const floor = g.floor ? studGrid(L, 'floor', { pitch: LEGO.pitchFloor * k, max: LEGO.maxFloor, blocks: floorBlocks(L) }).map(([x, z]) => ({ x, z, c: colorAt(x, z) })) : [];
  const ceil = g.ceiling ? studGrid(L, 'ceil', { pitch: LEGO.pitchCeil * k, max: LEGO.maxCeil }).map(([x, z]) => ({ x, z, c: hexInt(g.ceilColor, 0xe8f2fb) })) : [];
  return { floor, ceil, studs: floor.length + ceil.length, tris: (floor.length + ceil.length) * LEGO.trisPerStud, pitch: LEGO.pitchFloor * k };
}

// Tinnsoldaten (maur med skin 'soldier'): går som en maur langs streken, men marsjerer stivt: bena og armene svinger motsatt, kroppen duver litt. phase går opp mens den går; speed 0 gir hvile.
export const SOLDIER = { legSwing: 0.7, armSwing: 0.55, bob: 0.05, phaseRate: 1 };
export function marchPose(phase, speed = 0, spec = SOLDIER) {
  const a = Math.min(1, Math.max(0, speed / 1.5)), s = Math.sin(phase * spec.phaseRate * 2.2);
  return { legL: s * spec.legSwing * a, legR: -s * spec.legSwing * a, armL: -s * spec.armSwing * a, armR: s * spec.armSwing * a, bob: Math.abs(s) * spec.bob * a };
}
export const isSoldier = (a) => !!a && a.skin === 'soldier';
