// R182: møbelmaler med ekte former (sofa, seng, skrivebord, bord, hylleenhet, lampe, puff, koffert).
// Modellen (bildetolkningen) leverer ÉN boks med hele ytre mål; spillet tegner formen, slik badekaret gjør. Kollisjonen er fortsatt boksen.
// Hver bygger har samme signatur som SINGLE i props.js: (sx, sy, sz, o) => THREE.Group sentrert i boksen (mål i enheter, 1 enhet = 5 cm).
// Lokal retning: ryggen/hodegavlen/åpningen mot −z (nord, standard); `face` ('N'|'S'|'E'|'W') snur det i buildSingle (faceWrap under).
// Uten dette skal eldre brett (sofa i tre bokser: sete, rygg, arm; bord som tynn plate) tegnes som før: tilpasset(kind, mål) gir da false.
import * as THREE from 'three';

export const CM = 0.2;                                                 // enheter per cm
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shade = (c, f) => { const k = new THREE.Color(c); return f >= 0 ? k.lerp(new THREE.Color(0xffffff), f) : k.multiplyScalar(1 + f); };

// avrundet boks på y=0 sentrert i x/z (lite detalj: få segmenter, møblene er mange)
function rbox(w, h, d, r = 0.3, bv = 0.12) {
  const m = Math.min(w, h, d); bv = clamp(bv, 0, m * 0.45); const iw = Math.max(0.02, w - 2 * bv), id = Math.max(0.02, d - 2 * bv), rr = clamp(r, 0.01, Math.min(iw, id) / 2 - 0.005);
  const s = new THREE.Shape(), x = iw / 2, y = id / 2;
  s.moveTo(-x + rr, -y); s.lineTo(x - rr, -y); s.quadraticCurveTo(x, -y, x, -y + rr); s.lineTo(x, y - rr); s.quadraticCurveTo(x, y, x - rr, y);
  s.lineTo(-x + rr, y); s.quadraticCurveTo(-x, y, -x, y - rr); s.lineTo(-x, -y + rr); s.quadraticCurveTo(-x, -y, -x + rr, -y);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.01, h - 2 * bv), bevelEnabled: bv > 0.005, bevelThickness: bv, bevelSize: bv, bevelSegments: 1, curveSegments: 3 });
  g.rotateX(-Math.PI / 2); g.translate(0, bv, 0); return g;
}
// materialvalg: stoff matt, tre halvmatt, metall blankt, plast litt blankt
function finish(o, base = 'wood') {
  const m = o.material || base, p = { roughness: 0.6, metalness: 0 };
  if (m === 'fabric' || m === 'wicker' || m === 'paper') p.roughness = 0.95;
  else if (m === 'metal') { p.roughness = 0.35; p.metalness = 0.7; } else if (m === 'plastic' || m === 'ceramic' || m === 'porcelain') p.roughness = 0.35; else if (m === 'glass') p.roughness = 0.1;
  return p;
}
const mat = (color, p) => new THREE.MeshStandardMaterial({ color, roughness: p.roughness, metalness: p.metalness });

// kontekst for en bygger: legg til deler i boks-koordinater (fra boksens min-hjørne, y opp fra bunnen)
function ctx(sx, sy, sz) {
  const g = new THREE.Group();
  const put = (geo, m, cx, y0, cz, shadow = true, rot) => { const me = new THREE.Mesh(geo, m); me.castShadow = shadow; me.receiveShadow = true; me.position.set(cx - sx / 2, y0 - sy / 2, cz - sz / 2); if (rot) me.rotation.set(...rot); g.add(me); return me; };
  // boks fra x0..x1, y0..y1, z0..z1
  const box = (m, x0, x1, y0, y1, z0, z1, r = 0.3, bv = 0.12, shadow = true) => put(rbox(x1 - x0, y1 - y0, z1 - z0, r, bv), m, (x0 + x1) / 2, y0, (z0 + z1) / 2, shadow);
  return { g, put, box };
}
// sylinder fra y0 til y1 (put plasserer sentrum: korriger)
function cyl(c, m, cx, cz, y0, y1, r0, r1, n = 10, shadow = false) { const h = y1 - y0; return c.put(new THREE.CylinderGeometry(r1, r0, h, n), m, cx, y0 + h / 2, cz, shadow); }

// ---------- gjenkjenning: er boksen et helt møbel (og ikke en del av et eldre brett)? ----------
const MIN = { sofa: [11, 8], table: [4, 6], bed: [4, 10], desk: [10, 8], shelf_unit: [14, 4], lamp: [3, 0], pouffe: [2, 0], suitcase: [5, 0] };   // [minste høyde, minste smaleste grunnflatemål] i enheter
export function tilpasset(kind, sx, sy, sz) { const m = MIN[kind]; return !!m && sy >= m[0] && Math.min(sx, sz) >= m[1]; }

// ---------- sofa: sete, rygg, to armlener, lave ben ----------
function sofa(sx, sy, sz, o) {
  const c = ctx(sx, sy, sz), p = finish(o, 'fabric'), base = o.color, M = mat(base, p), Md = mat(shade(base, -0.18), p), Ml = mat(shade(base, 0.07), p), Mleg = mat(0x3a2a20, finish({ material: 'wood' }));
  const legH = clamp(sy * 0.1, 0.9, 1.6), aw = clamp(sx * 0.09, 1.4, sz * 0.2), bt = sz * 0.26, seatTop = legH + (sy - legH) * 0.52, armTop = legH + (sy - legH) * 0.68, ix0 = aw, ix1 = sx - aw;
  c.box(Md, ix0 - 0.2, ix1 + 0.2, legH, legH + (seatTop - legH) * 0.55, 0.2, sz, 0.4, 0.2);                       // understell
  c.box(M, ix0 - 0.2, ix1 + 0.2, legH, sy * 0.86, 0, bt, 0.5, 0.25);                                                // rygg
  for (const [x0, x1] of [[0, aw], [sx - aw, sx]]) c.box(M, x0, x1, legH, armTop, 0, sz, 0.6, 0.3);              // armlener
  const gap = 0.12, mid = (ix0 + ix1) / 2;
  for (const [x0, x1] of [[ix0, mid - gap], [mid + gap, ix1]]) {
    c.box(Ml, x0, x1, legH + (seatTop - legH) * 0.5, seatTop, bt * 0.85, sz - 0.1, 0.5, 0.35);                      // setepute
    const bk = c.box(Ml, x0 + 0.1, x1 - 0.1, seatTop - 0.2, sy - 0.5, bt * 0.5, bt * 0.5 + bt * 0.7, 0.5, 0.3); bk.rotation.x = -0.14;   // ryggpute lent bakover
  }
  for (const [x, z] of [[aw * 0.5, sz - aw * 0.5], [sx - aw * 0.5, sz - aw * 0.5], [aw * 0.5, aw * 0.5], [sx - aw * 0.5, aw * 0.5]]) cyl(c, Mleg, x, z, 0, legH + 0.05, 0.3, 0.4, 6);
  return c.g;
}
// ---------- seng: madrass, hodegavl, to puter, ramme med ben ----------
function bed(sx, sy, sz, o) {
  const c = ctx(sx, sy, sz), pw = finish({ material: 'wood' }), pf = finish({ material: 'fabric' }), frame = mat(0x7a5a3c, pw), Mm = mat(0xf0ece2, pf), Md = mat(o.color, pf), Mp = mat(shade(0xf4f1ea, 0), pf);
  const legH = clamp(sy * 0.1, 0.8, 2.4), railTop = clamp(sy * 0.36, legH + 1.2, legH + 6), matTop = railTop + clamp(sy * 0.16, 1.2, 4), t = clamp(sz * 0.035, 0.5, 1.2), headT = clamp(sz * 0.03, 0.6, 1.4);
  c.box(frame, 0, sx, legH, sy, 0, headT, 0.4, 0.15);                                                              // hodegavl (full høyde)
  c.box(frame, 0, sx, legH, Math.min(sy, railTop + sy * 0.18), sz - t, sz, 0.3, 0.12);                             // fotgavl
  for (const x0 of [0, sx - t]) c.box(frame, x0, x0 + t, legH, railTop, headT, sz - t, 0.2, 0.1);                  // sideramme
  c.box(Mm, t * 0.7, sx - t * 0.7, railTop - 0.3, matTop, headT + 0.05, sz - t - 0.05, 0.8, 0.4);                  // madrass
  c.box(Md, t * 0.5, sx - t * 0.5, railTop + 0.2, matTop + 0.5, sz * 0.34, sz - t * 0.5, 0.7, 0.45);               // dyne
  const pillowW = (sx - 3) / 2, ph = clamp(sy * 0.1, 0.9, 2.4);
  for (const k of [0, 1]) { const x0 = 1 + k * (pillowW + 1); c.box(Mp, x0, x0 + pillowW, matTop - 0.1, matTop + ph, headT + 0.2, headT + 0.2 + sz * 0.17, 0.9, 0.5); }
  for (const [x, z] of [[t * 0.5, headT * 0.5], [sx - t * 0.5, headT * 0.5], [t * 0.5, sz - t * 0.5], [sx - t * 0.5, sz - t * 0.5]]) cyl(c, frame, x, z, 0, legH + 0.1, 0.4, 0.4, 6);
  return c.g;
}
// ---------- skrivebord: plate + ben + skuffeblokk ----------
function desk(sx, sy, sz, o) {
  const c = ctx(sx, sy, sz), p = finish(o, 'wood'), top = mat(o.color, p), body = mat(shade(o.color, -0.1), p), leg = mat(shade(o.color, -0.28), p), knob = mat(0xd8d8d4, { roughness: 0.25, metalness: 0.9 });
  const th = clamp(sy * 0.05, 0.5, 0.9), pw = clamp(sx * 0.3, 4, 10), lw = clamp(Math.min(sx, sz) * 0.07, 0.5, 1.0), yTop = sy - th;
  c.box(top, 0, sx, yTop, sy, 0, sz, 0.5, 0.2);                                                                    // plate
  c.box(body, sx - pw, sx - 0.2, 0.3, yTop, 0.4, sz - 0.5, 0.2, 0.1);                                              // skuffeblokk (høyre)
  const n = 3, h = (yTop - 0.3 - 0.6) / n;
  for (let i = 0; i < n; i++) {
    const y0 = 0.3 + 0.3 + i * h;
    c.box(top, sx - pw + 0.3, sx - 0.5, y0, y0 + h - 0.25, sz - 0.52, sz - 0.1, 0.2, 0.06, false);                 // skufffront
    c.box(knob, sx - pw / 2 - 0.9, sx - pw / 2 + 0.9, y0 + h / 2 - 0.15, y0 + h / 2 + 0.15, sz - 0.1, sz + 0.0, 0.1, 0.04, false);
  }
  for (const [x, z] of [[lw / 2 + 0.2, lw / 2 + 0.3], [lw / 2 + 0.2, sz - lw / 2 - 0.3], [sx - pw - lw / 2 - 0.1, lw / 2 + 0.3], [sx - pw - lw / 2 - 0.1, sz - lw / 2 - 0.3]]) c.box(leg, x - lw / 2, x + lw / 2, 0, yTop, z - lw / 2, z + lw / 2, 0.05, 0.03);
  return c.g;
}
// ---------- bord: plate + fire ben (og en list under platen) ----------
function table(sx, sy, sz, o) {
  const c = ctx(sx, sy, sz), p = finish(o, 'wood'), top = mat(o.color, p), leg = mat(shade(o.color, -0.2), p);
  const th = clamp(sy * 0.09, 0.4, 1.0), lw = clamp(Math.min(sx, sz) * 0.07, 0.4, 1.1), yTop = sy - th, ins = lw * 0.5 + 0.25, ah = clamp(sy * 0.12, 0.4, 1.4);
  c.box(top, 0, sx, yTop, sy, 0, sz, 0.5, 0.15);
  for (const x of [ins, sx - ins]) for (const z of [ins, sz - ins]) c.box(leg, x - lw / 2, x + lw / 2, 0, yTop + 0.05, z - lw / 2, z + lw / 2, 0.06, 0.03, false);
  for (const z of [ins, sz - ins]) c.box(leg, ins, sx - ins, yTop - ah, yTop + 0.02, z - lw * 0.3, z + lw * 0.3, 0.05, 0.02, false);
  for (const x of [ins, sx - ins]) c.box(leg, x - lw * 0.3, x + lw * 0.3, yTop - ah, yTop + 0.02, ins, sz - ins, 0.05, 0.02, false);
  return c.g;
}
// ---------- hylleenhet: to sider, topp, bunn og 2–4 hyller etter høyde, åpen mot front ----------
function shelfUnit(sx, sy, sz, o) {
  const c = ctx(sx, sy, sz), p = finish(o, 'wood'), M = mat(o.color, p), Mb = mat(shade(o.color, -0.22), p);
  const t = clamp(Math.min(sx, sz) * 0.06 + 0.15, 0.4, 0.8), kick = clamp(sy * 0.02, 0.3, 0.8), bk = Math.min(0.3, sz * 0.05);
  c.box(M, 0, t, 0, sy, 0, sz, 0.05, 0.04); c.box(M, sx - t, sx, 0, sy, 0, sz, 0.05, 0.04);                       // sider
  c.box(M, t, sx - t, sy - t, sy, 0, sz, 0.05, 0.04); c.box(M, t, sx - t, kick, kick + t, 0, sz, 0.05, 0.04);     // topp og bunn
  c.box(Mb, t, sx - t, kick, sy - t, 0, bk, 0.02, 0.02, false);                                                    // rygg (mot veggen)
  const n = clamp(Math.round(sy / 9), 2, 4), lo = kick + t, hi = sy - t;                                          // 9 enheter = 45 cm per hylle
  for (let i = 1; i <= n; i++) { const y = lo + (hi - lo) * i / (n + 1); c.box(M, t, sx - t, y - t / 2, y + t / 2, bk, sz - 0.05, 0.04, 0.03); }
  return c.g;
}
// ---------- lampe: sokkel, stang, konisk skjerm med svak glød ----------
function lamp(sx, sy, sz, o) {
  const c = ctx(sx, sy, sz), R = Math.min(sx, sz) / 2, baseMat = mat(0x2d2d30, { roughness: 0.35, metalness: 0.6 });
  const shH = clamp(sy * 0.28, 0.9, 6), shTop = sy - 0.05, shBot = shTop - shH, rb = R * 0.97, rt = R * 0.55, stem = Math.max(0.12, R * 0.07);
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, shH, 20, 1, true), new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.9, emissive: 0xffd9a0, emissiveIntensity: 0.55, side: THREE.DoubleSide }));
  sh.position.set(0, shBot + shH / 2 - sy / 2, 0); c.g.add(sh);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(rt * 0.55, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff2c8 })); bulb.position.set(0, shBot + shH * 0.45 - sy / 2, 0); c.g.add(bulb);
  cyl(c, baseMat, sx / 2, sz / 2, 0, Math.min(0.5, sy * 0.05) + 0.01, R * 0.62, R * 0.55, 16, true);                 // sokkel
  cyl(c, baseMat, sx / 2, sz / 2, 0.3, shBot + 0.2, stem, stem, 8);                                              // stang
  return c.g;
}
// ---------- puff: rundet, med sømmer ----------
function pouffe(sx, sy, sz, o) {
  const g = new THREE.Group(), p = finish(o, 'fabric'), M = mat(o.color, p), Ms = mat(shade(o.color, -0.3), p), Rx = sx / 2, Rz = sz / 2, Rm = 0.985;
  const rAt = (t) => Rm * (0.86 + 0.14 * Math.sin(Math.PI * clamp(t * 0.92 + 0.04, 0, 1)));                      // radius (0–1) ved høyde t (0–1)
  const shrink = [1, 1, 1, 1, 1, 1, 1, 1, 0.97, 0.85, 0.5], pts = [new THREE.Vector2(0.001, -sy / 2)];
  for (let i = 0; i <= 10; i++) pts.push(new THREE.Vector2(Math.max(0.001, rAt(i / 10) * shrink[i]), (i / 10) * sy - sy / 2));
  pts.push(new THREE.Vector2(0.001, sy / 2 - 0.02));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), M); body.scale.set(Rx, 1, Rz); body.castShadow = body.receiveShadow = true; g.add(body);
  for (const t of [0.3, 0.72]) {                                                                                  // sømmer rundt
    const seam = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 5, 28), Ms); seam.rotation.x = Math.PI / 2;
    seam.scale.set(Rx * (rAt(t) - 0.015), Rz * (rAt(t) - 0.015), Math.min(Rx, Rz)); seam.position.y = t * sy - sy / 2; g.add(seam);
  }
  const btn = new THREE.Mesh(new THREE.SphereGeometry(Math.min(Rx, Rz) * 0.1, 8, 6), Ms); btn.position.y = sy / 2 - Math.min(Rx, Rz) * 0.05; btn.scale.y = 0.5; g.add(btn);   // knapp i toppen
  return g;
}
// ---------- koffert: hardt skall med hjul, håndtak og ribber ----------
function suitcase(sx, sy, sz, o) {
  const c = ctx(sx, sy, sz), p = finish(o, 'plastic'), M = mat(o.color, p), Md = mat(0x26272a, { roughness: 0.5, metalness: 0.3 }), Mm = mat(0xcfd2d6, { roughness: 0.25, metalness: 0.9 });
  const wr = clamp(Math.min(sy * 0.05, 0.6), 0.3, 0.7), hh = clamp(sy * 0.06, 0.3, 0.9), bodyLo = wr * 1.6, bodyHi = sy - hh;
  const mid = (bodyLo + bodyHi) / 2, e = 0.12;
  c.box(M, e, sx - e, bodyLo, bodyHi, e, sz - e, Math.min(sx, sz) * 0.15, 0.25);                                  // skall
  c.box(Md, 0, sx, mid - 0.12, mid + 0.12, 0, sz, 0.3, 0.05, false);                                              // glidelåsstripe rundt
  for (const x of [sx * 0.28, sx * 0.5, sx * 0.72]) c.box(M, x - 0.2, x + 0.2, bodyLo + 0.4, bodyHi - 0.4, sz - e - 0.02, sz, 0.05, 0.02, false);   // ribber foran
  c.box(Md, sx / 2 - sx * 0.14, sx / 2 + sx * 0.14, bodyHi - 0.05, sy, sz / 2 - 0.35, sz / 2 + 0.35, 0.3, 0.12);  // bærehåndtak
  for (const x of [sx * 0.22, sx * 0.78]) c.box(Md, x - 0.18, x + 0.18, bodyHi - 0.1, bodyHi + 0.2, sz / 2 - 0.25, sz / 2 + 0.25, 0.05, 0.03, false);   // festene
  for (const [x, z] of [[wr + 0.2, wr + 0.2], [sx - wr - 0.2, wr + 0.2], [wr + 0.2, sz - wr - 0.2], [sx - wr - 0.2, sz - wr - 0.2]]) c.put(new THREE.CylinderGeometry(wr, wr, wr * 0.9, 10), Md, x, wr, z, false, [0, 0, Math.PI / 2]);   // hjul
  for (const x of [0.5, sx - 0.5]) for (const z of [0.5, sz - 0.5]) c.box(Md, x - 0.45, x + 0.45, bodyLo, bodyLo + 0.8, z - 0.45, z + 0.45, 0.1, 0.05, false);   // hjørnebeskyttere nederst
  for (const x of [sx * 0.35, sx * 0.65]) c.box(Mm, x - 0.4, x + 0.4, mid - 0.5, mid + 0.5, sz - e, sz, 0.05, 0.02, false);                 // lås foran
  return c.g;
}

let ON = true;                                                          // ⚙ → Admin «Møbler med ekte form» (R182); av = vanlige bokser som før
export const setFurnitureOn = (v) => { ON = !!v; };
export const furnitureOn = () => ON;
// hvor mange bokser i et brett som blir tegnet som ekte møbler (til hendelseslogg og tester)
export function furnitureCount(boxes) { let n = 0; for (const b of boxes || []) if (FURNITURE[b.kind] && b.type !== 'floor' && b.type !== 'wall' && tilpasset(b.kind, b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2])) n++; return n; }
export const FURNITURE = { sofa, bed, desk, table, shelf_unit: shelfUnit, lamp, pouffe, suitcase };
export const FACED = new Set(['sofa', 'bed', 'desk', 'shelf_unit', 'suitcase']);           // har en retning (rygg/hodegavl/åpning)

// bygg et møbel med retning: face = hvilken vegg ryggen står mot (standard N). E/W bytter om bredde og dybde.
export function buildFurniture(kind, sx, sy, sz, o = {}, face) {
  const fn = FURNITURE[kind]; if (!ON || !fn || !tilpasset(kind, sx, sy, sz)) return null;
  const f = FACED.has(kind) ? String(face || 'N').toUpperCase() : 'N', ew = f === 'E' || f === 'W';
  const g = fn(ew ? sz : sx, sy, ew ? sx : sz, { ...o, color: o.color ?? 0xcccccc });
  if (f === 'N') return g;
  const w = new THREE.Group(); w.add(g); w.rotation.y = f === 'S' ? Math.PI : f === 'E' ? -Math.PI / 2 : Math.PI / 2;
  return w;
}
