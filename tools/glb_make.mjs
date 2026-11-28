// R194: lager en liten syntetisk «skannet» stue som GLB (binær glTF) uten three: brukes av test_scan.mjs og tools/live_scan.cjs.
// roomMesh() gir { pos, idx } i meter (y opp): rom 4 × 5 m, gulv litt over 0 og forskjøvet fra origo (som ekte skann), bord med ben og en sofa-boks.
export function boxTris(x0, x1, y0, y1, z0, z1) {
  const v = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
  const f = [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]];
  return { v, f };
}
export function makeMesh() {
  const pos = [], idx = [], col = []; let cur = [0.8, 0.75, 0.65];
  const quad = (a, b, c, d) => { const o = pos.length / 3; for (const p of [a, b, c, d]) { pos.push(...p); col.push(...cur); } idx.push(o, o + 1, o + 2, o, o + 2, o + 3); };
  const box = (x0, x1, y0, y1, z0, z1) => { const { v, f } = boxTris(x0, x1, y0, y1, z0, z1); for (const q of f) quad(v[q[0]], v[q[1]], v[q[2]], v[q[3]]); };
  return { pos, idx, col, quad, box, color: (c) => { cur = c; } };
}
export function roomMesh({ ox = 10, oz = -3, fy = 0.31, w = 4, d = 5, h = 2.5 } = {}) {
  const m = makeMesh(), X = (x) => ox + x, Z = (z) => oz + z, Y = (y) => fy + y;
  m.color([0.55, 0.38, 0.22]);
  m.quad([X(0), Y(0), Z(0)], [X(0), Y(0), Z(d)], [X(w), Y(0), Z(d)], [X(w), Y(0), Z(0)]);          // gulv
  m.color([0.9, 0.9, 0.85]);
  m.quad([X(0), Y(h), Z(0)], [X(w), Y(h), Z(0)], [X(w), Y(h), Z(d)], [X(0), Y(h), Z(d)]);          // tak
  m.quad([X(0), Y(0), Z(0)], [X(w), Y(0), Z(0)], [X(w), Y(h), Z(0)], [X(0), Y(h), Z(0)]);          // vegger
  m.quad([X(0), Y(0), Z(d)], [X(0), Y(h), Z(d)], [X(w), Y(h), Z(d)], [X(w), Y(0), Z(d)]);
  m.quad([X(0), Y(0), Z(0)], [X(0), Y(h), Z(0)], [X(0), Y(h), Z(d)], [X(0), Y(0), Z(d)]);
  m.quad([X(w), Y(0), Z(0)], [X(w), Y(0), Z(d)], [X(w), Y(h), Z(d)], [X(w), Y(h), Z(0)]);
  m.color([0.2, 0.45, 0.8]);
  m.box(X(1.4), X(2.6), Y(0.7), Y(0.74), Z(3.2), Z(4.0));                                          // bordplate (70 cm høyt)
  for (const [lx, lz] of [[1.45, 3.25], [2.5, 3.25], [1.45, 3.9], [2.5, 3.9]]) m.box(X(lx), X(lx + 0.05), Y(0), Y(0.7), Z(lz), Z(lz + 0.05));
  m.color([0.8, 0.25, 0.2]);
  m.box(X(0.2), X(2.2), Y(0), Y(0.42), Z(0.3), Z(1.2));                                            // sofa (setehøyde 42 cm)
  m.box(X(0.2), X(2.2), Y(0.42), Y(0.85), Z(0.3), Z(0.5));                                         // rygg
  // støy: én trekant langt under gulvet og én flytende
  m.quad([X(3), Y(-1.5), Z(2)], [X(3.1), Y(-1.5), Z(2)], [X(3.1), Y(-1.4), Z(2)], [X(3), Y(-1.4), Z(2)]);
  return { pos: m.pos, idx: m.idx, col: m.col };
}
// glTF 2.0 binær: JSON-del + BIN-del (POSITION som float32, indekser som uint32), én enkel farget materialet.
export function writeGLB({ pos, idx, col }, { color = [1, 1, 1, 1] } = {}) {
  const P = new Float32Array(pos), I = new Uint32Array(idx), C = col ? new Float32Array(col) : null;
  let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[i + k]); mx[k] = Math.max(mx[k], P[i + k]); }
  const pb = Buffer.from(P.buffer), ib = Buffer.from(I.buffer), cb = C ? Buffer.from(C.buffer) : Buffer.alloc(0), bin = Buffer.concat([pb, ib, cb]);
  const json = { asset: { version: '2.0', generator: 'tlm glb_make' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, ...(C ? { COLOR_0: 2 } : {}) }, indices: 1, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: color, metallicFactor: 0, roughnessFactor: 1 } }],
    accessors: [{ bufferView: 0, componentType: 5126, count: P.length / 3, type: 'VEC3', min: mn, max: mx }, { bufferView: 1, componentType: 5125, count: I.length, type: 'SCALAR' }, ...(C ? [{ bufferView: 2, componentType: 5126, count: C.length / 3, type: 'VEC3' }] : [])],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: pb.length, target: 34962 }, { buffer: 0, byteOffset: pb.length, byteLength: ib.length, target: 34963 }, ...(C ? [{ buffer: 0, byteOffset: pb.length + ib.length, byteLength: cb.length, target: 34962 }] : [])], buffers: [{ byteLength: bin.length }] };
  let js = Buffer.from(JSON.stringify(json)); while (js.length % 4) js = Buffer.concat([js, Buffer.from(' ')]);
  let b = bin; while (b.length % 4) b = Buffer.concat([b, Buffer.alloc(1)]);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + b.length, 8);
  const c1 = Buffer.alloc(8); c1.writeUInt32LE(js.length, 0); c1.writeUInt32LE(0x4e4f534a, 4);
  const c2 = Buffer.alloc(8); c2.writeUInt32LE(b.length, 0); c2.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([head, c1, js, c2, b]);
}
