// R130: det bestått 3D-bygget står i rommet (three.js). Staver som tekstur-bokser (R117: tre, stål, tau, samme materialer som i Rutenett), dekket som bred planke, og fire stolper ned til gulvet.
// Bevisst bare TEGNET: ingen kollisjonsbokser, så det finnes ingen usynlige vegger (R116). Ett materiale per familie (delt), én boks per stav; tak 120 staver + 40 knuter (build 3D-tak) = under 170 tegnekall.
// Rene tall (stavenes posisjon, retning, mål) står i rodPlacement og testes uten three.js.

export const ROD_T = { wood: 0.34, steel: 0.26, rope: 0.18, cable: 0.2 };   // tykkelse i enheter
export const DECK_W = 1.6;                                                  // dekket er en bred planke (z)
const NODE_R = 0.28;
// bygget settes midt foran figuren (W.ahead enheter i kameraretningen fwd = { x, z }); origo (x = 0, y = 0, z = 0) er hjørnet av stedet (stedet er 8 × 4 i x og z)
export const worldOrigin = (pos, fwd, W, site = { x: [0, 8], z: [0, 4] }) => {
  const l = Math.hypot(fwd.x, fwd.z) || 1, fx = fwd.x / l, fz = fwd.z / l, cx = pos.x + fx * W.ahead, cz = pos.z + fz * W.ahead;
  return { x: cx - (site.x[0] + site.x[1]) / 2, y: (pos.y || 0) + W.dy, z: cz - (site.z[0] + site.z[1]) / 2 };
};
// en stav: midtpunkt, lengde og retning (enhetsvektor) i verden, tykkelse og bredde
export function rodPlacement(G, r, o) {
  const a = G.nodes.find((n) => n.id === r.a), b = G.nodes.find((n) => n.id === r.b); if (!a || !b) return null;
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, len = Math.hypot(dx, dy, dz); if (len < 1e-6) return null;
  const t = r.deck ? 0.3 : ROD_T[r.mat] || 0.3;
  return { id: r.id, mat: r.mat, deck: !!r.deck, len, dir: { x: dx / len, y: dy / len, z: dz / len }, mid: { x: o.x + (a.x + b.x) / 2, y: o.y + (a.y + b.y) / 2, z: o.z + (a.z + b.z) / 2 }, t, wide: r.deck ? DECK_W : t };
}
export const rodType = (mat) => `rod_${mat}_100`;
// stolpene: fra hvert anker ned til gulvet (y = floor)
export function postPlacements(G, site, o) {
  return G.nodes.filter((n) => n.fixed).map((n) => { const h = n.y - site.floor; return { id: 'post_' + n.id, x: o.x + n.x, z: o.z + n.z, y0: o.y + site.floor, h: Math.max(0.2, h) }; });
}
export const worldStats = (G, site) => ({ rods: G.rods.length, nodes: G.nodes.filter((n) => !n.fixed && !n.deck).length, posts: G.nodes.filter((n) => n.fixed).length, draws: G.rods.length + G.nodes.filter((n) => !n.fixed && !n.deck).length + G.nodes.filter((n) => n.fixed).length, floor: site.floor });

// THREE: modulen, tx: createBuildTex-objektet (kan være null: enkle materialer), scene: der gruppen legges. Returnerer { group, stats, dispose }
export function showWorld3(THREE, tx, scene, G, site, o) {
  const g = new THREE.Group(); g.name = 'lab3d'; const fallback = new Map();
  const mat = (type, color) => { if (tx) return tx.material(type, color); const k = type + color; let m = fallback.get(k); if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: 0.65 }); fallback.set(k, m); } return m; };
  const COL = { wood: '#c98a45', steel: '#b8c4d2', rope: '#d8b46a', cable: '#c0c8d2' }, X = new THREE.Vector3(1, 0, 0), dir = new THREE.Vector3(), q = new THREE.Quaternion();
  const own = [];
  for (const r of G.rods) {
    const p = rodPlacement(G, r, o); if (!p) continue; const type = rodType(p.mat);
    const geo = tx ? tx.geometry(type, p.len, p.t, p.wide, r.id) : new THREE.BoxGeometry(p.len, p.t, p.wide); if (!tx) own.push(geo);
    const m = new THREE.Mesh(geo, mat(type, p.deck ? '#d9b47a' : COL[p.mat] || '#c98a45')); m.position.set(p.mid.x, p.mid.y, p.mid.z);
    dir.set(p.dir.x, p.dir.y, p.dir.z); q.setFromUnitVectors(X, dir); m.quaternion.copy(q); m.castShadow = true; m.receiveShadow = true; g.add(m);
  }
  const nodeGeo = new THREE.SphereGeometry(NODE_R, 8, 6); own.push(nodeGeo); const nodeMat = mat('rod_steel_100', '#ffffff');
  for (const n of G.nodes) if (!n.fixed && !n.deck) { const m = new THREE.Mesh(nodeGeo, nodeMat); m.position.set(o.x + n.x, o.y + n.y, o.z + n.z); g.add(m); }
  for (const s of postPlacements(G, site, o)) {
    const geo = tx ? tx.geometry('plank', 0.8, s.h, 0.8, s.id) : new THREE.BoxGeometry(0.8, s.h, 0.8); if (!tx) own.push(geo);
    const m = new THREE.Mesh(geo, mat('plank', '#9a6b3c')); m.position.set(s.x, s.y0 + s.h / 2, s.z); m.castShadow = true; m.receiveShadow = true; g.add(m);
  }
  scene.add(g);
  const stats = worldStats(G, site);
  return { group: g, stats, dispose() { scene.remove(g); for (const o2 of own) o2.dispose?.(); g.traverse?.((m) => { if (m.geometry && tx) m.geometry.dispose?.(); }); } };
}
