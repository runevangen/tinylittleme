// R15: ytelsesbudsjett for eldre telefoner. Ren logikk (ttar three som argument, så den testes i node):
//  - målinger av scenen (tegnekall, trekanter, lys) fra renderer.info, og budsjett-sjekk
//  - mergeStatic: slår sammen statiske meshes med samme materiale til ett tegnekall (flere kall = tregt på gamle telefoner)
//  - createLowProfile: avgjør når «Lav profil» (ingen skygge-kart, støv, korn, ekstra lys) slås på av seg selv

export const BUDGET = { calls: 220, tris: 60000, lights: 6 };   // anbefalt tak per bilde (inkl. skyggepass); over det logges en advarsel

// R21: minnebudsjett (MB) for teksturer og geometrier; iPhone 8-klassen; målt i full kvalitet: 41 MB (bad) og 66 MB (kjokken2), med små teksturer 7 og 10 MB. Over det logges en advarsel.
export const MEM_BUDGET = { texMB: 80, texMBLow: 24, geoMB: 20 };
export const LOW_TEX_CUT = 0.4;                         // «Lav profil» skal bruke minst 40 % mindre teksturminne

// R21: ett teksturminne-anslag i byte (RGBA8 + mipmap-kjede), uavhengig av GPU
export function texBytes(t) {
  const im = t && t.image; if (!im) return 0;
  const w = im.width || im.videoWidth || 0, h = im.height || im.videoHeight || 0; if (!w || !h) return 0;
  return Math.round(w * h * 4 * (t.generateMipmaps === false || t.minFilter === 1003 || t.minFilter === 1006 ? 1 : 4 / 3));
}
export const geoBytes = (g) => { let n = 0; for (const a of Object.values(g.attributes || {})) n += (a.array ? a.array.byteLength : 0); if (g.index && g.index.array) n += g.index.array.byteLength; return n; };
const TEXKEYS = ['map', 'emissiveMap', 'roughnessMap', 'normalMap', 'bumpMap', 'alphaMap', 'aoMap', 'metalnessMap', 'clearcoatMap'];
// Teller unike teksturer, materialer og geometrier under en node (delte ting telles én gang)
export function memStats(root) {
  const tex = new Set(), geo = new Set(), mat = new Set();
  root.traverse((o) => {
    if (o.geometry) geo.add(o.geometry);
    for (const m of [].concat(o.material || [])) { mat.add(m); for (const k of TEXKEYS) if (m[k]) tex.add(m[k]); if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u && u.value && u.value.isTexture) tex.add(u.value); }
  });
  let tb = 0, gb = 0; for (const t of tex) tb += texBytes(t); for (const g of geo) gb += geoBytes(g);
  return { textures: tex.size, geometries: geo.size, materials: mat.size, texMB: tb / 1048576, geoMB: gb / 1048576 };
}
export function memOver(s, low = false, b = MEM_BUDGET) {
  const w = []; const lim = low ? b.texMBLow : b.texMB;
  if (s.texMB > lim) w.push(`teksturminne ${s.texMB.toFixed(1)} MB > ${lim} MB`);
  if (s.geoMB > b.geoMB) w.push(`geometriminne ${s.geoMB.toFixed(1)} MB > ${b.geoMB} MB`);
  return w;
}
export const memLine = (s) => `teksturer ${s.textures} (${s.texMB.toFixed(1)} MB), geometrier ${s.geometries} (${s.geoMB.toFixed(1)} MB), materialer ${s.materials}`;
// Frigjør alt under en node (geometrier, materialer, teksturer) og fjerner den fra scenen: brukes ved nivåbytte i samme side
export function disposeTree(root) {
  const seen = new Set();
  root.traverse((o) => {
    if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
    for (const m of [].concat(o.material || [])) { if (seen.has(m)) continue; seen.add(m); for (const k of TEXKEYS) if (m[k] && !seen.has(m[k])) { seen.add(m[k]); m[k].dispose(); } m.dispose(); }
  });
  if (root.parent) root.parent.remove(root);
  return seen.size;
}
// Lav profil: tegn teksturen i full størrelse, men lag GPU-versjonen i halv størrelse (sider fra 256 og opp, ned til minst 128). Returnerer samme lerret hvis ingenting gjøres.
export function lowSide(side) { return side >= 256 ? Math.max(128, side >> 1) : side; }
export function shrinkCanvas(c, low, make) {
  if (!low) return c;
  const w = lowSide(c.width), h = lowSide(c.height); if (w === c.width && h === c.height) return c;
  const o = make(w, h), g = o.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, w, h); return o;
}

// mål fra renderer.info etter at et bilde er tegnet
export function sceneStats(renderer, scene) {
  let meshes = 0, lights = 0, shadowLights = 0;
  scene.traverse((o) => { if (o.isMesh) meshes++; if (o.isLight && o.visible) { lights++; if (o.castShadow) shadowLights++; } });
  const i = renderer.info;
  return { calls: i.render.calls, tris: i.render.triangles, meshes, lights, shadowLights, gpuGeos: i.memory.geometries, gpuTex: i.memory.textures, ...memStats(scene) };
}
export function overBudget(s, b = BUDGET) {
  const w = [];
  if (s.calls > b.calls) w.push(`tegnekall ${s.calls} > ${b.calls}`);
  if (s.tris > b.tris) w.push(`trekanter ${s.tris} > ${b.tris}`);
  if (s.lights > b.lights) w.push(`lys ${s.lights} > ${b.lights}`);
  return w;
}
export const statsLine = (s, merged) => `tegnekall ${s.calls}, trekanter ${s.tris}, lys ${s.lights} (${s.shadowLights} med skygge), meshes ${s.meshes}${merged ? ` (sammenslått ${merged.before} til ${merged.after})` : ''}`;

// nøkkel for «samme materiale»: to materialer med lik nøkkel ser likt ut og kan deles
export function matSig(m) {
  const h = (c) => (c && c.getHex ? c.getHex() : 0);
  return [m.type, h(m.color), h(m.emissive), m.emissiveIntensity, m.roughness, m.metalness, m.clearcoat, m.clearcoatRoughness, m.opacity, +m.transparent, m.side, m.map?.uuid, m.normalMap?.uuid, m.roughnessMap?.uuid, m.bumpMap?.uuid, m.bumpScale,
    m.transmission, +m.depthWrite, +m.depthTest, +m.polygonOffset, m.polygonOffsetFactor, m.polygonOffsetUnits, +m.flatShading, +m.toneMapped, m.envMapIntensity, m.userData?.detailed ? 1 : 0, m.customProgramCacheKey ? m.customProgramCacheKey() : ''].join('|');
}

const ATTRS = new Set(['position', 'normal', 'uv']), FLAG_KEYS = new Set(['noDetail', 'merged', 'antId']);   // userData-flagg som ikke hindrer sammenslåing (alt annet = funksjoner/tilstand som main.js bruker)
const blocked = (o) => !!o.userData && Object.keys(o.userData).some((k) => !FLAG_KEYS.has(k));
// kan geometrien slås sammen? (bare position/normal/uv, ett materiale, ingen morph)
function mergeable(o) {
  const g = o.geometry, mt = o.material;
  if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || Array.isArray(mt) || !mt || !g || !g.attributes.position || !g.attributes.normal) return false;
  if (g.morphAttributes && Object.keys(g.morphAttributes).length) return false;
  for (const k of Object.keys(g.attributes)) if (!ATTRS.has(k)) return false;
  return !blocked(o);
}

// Slår sammen meshes under `root` (statiske relativt til roten!) med samme materiale og skyggevalg til ett mesh per gruppe, i rotens lokale koordinater.
// opts.cell: rutestørrelse (enheter); meshes i ulike ruter slås ikke sammen (så usynlige deler kan kulles bort).
// opts.keep: Set med noder som beveger seg eller styres av koden (ledd, ansiktsdeler, deler som skjules): de og alt under en kept gruppe røres ikke her (slås sammen for seg i sin egen gruppe, se mergeRigid).
// Returnerer { before, after } (antall meshes under roten, kept grupper medregnet ikke).
export function mergeStatic(THREE, root, opts = {}) {
  const cell = opts.cell || 0, keep = opts.keep || null;
  if (blocked(root)) { let n = 0; root.traverse((x) => { if (x.isMesh) n++; }); return { before: n, after: n }; }
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map(), sigMat = new Map(); let before = 0;
  const visit = (o) => {
    for (const c of o.children) {
      if (keep && keep.has(c) && !c.isMesh) continue;                    // egen gruppe: slås sammen for seg
      if (!c.visible || (!c.isMesh && blocked(c))) { c.traverse((x) => { if (x.isMesh) before++; }); continue; }   // skjult eller styrt av koden: ikke rør
      if (c.isMesh) {
        before++;
        if (!(keep && keep.has(c)) && mergeable(c)) {
          const sig = matSig(c.material);
          if (!sigMat.has(sig)) sigMat.set(sig, c.material);
          const rel = new THREE.Matrix4().multiplyMatrices(inv, c.matrixWorld);
          let key = `${sig}#${+c.castShadow}${+c.receiveShadow}#${c.renderOrder}`;
          if (cell) { const e = rel.elements; key += `#${Math.floor(e[12] / cell)},${Math.floor(e[13] / cell)},${Math.floor(e[14] / cell)}`; }
          if (!buckets.has(key)) buckets.set(key, { sig, list: [] });
          buckets.get(key).list.push({ o: c, rel });
        }
      }
      if (c.children.length) visit(c);
    }
  };
  visit(root);
  let after = before;
  const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const { sig, list } of buckets.values()) {
    if (list.length < 2) continue;
    let nv = 0, ni = 0; for (const { o } of list) { const g = o.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0, io = 0;
    for (const { o, rel } of list) {
      const g = o.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv; nm.getNormalMatrix(rel);
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(rel); pos.set([v.x, v.y, v.z], (vo + i) * 3);
        n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.set([n.x, n.y, n.z], (vo + i) * 3);
        if (U) uv.set([U.getX(i), U.getY(i)], (vo + i) * 2);
      }
      const flip = rel.determinant() < 0, cnt = g.index ? g.index.count : P.count;
      for (let i = 0; i < cnt; i += 3) {
        const a = g.index ? g.index.getX(i) : i, b = g.index ? g.index.getX(i + 1) : i + 1, c = g.index ? g.index.getX(i + 2) : i + 2;
        idx[io++] = vo + a; idx[io++] = vo + (flip ? c : b); idx[io++] = vo + (flip ? b : c);
      }
      vo += P.count;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeBoundingSphere(); geo.computeBoundingBox();
    const first = list[0].o, m = new THREE.Mesh(geo, sigMat.get(sig));
    m.castShadow = first.castShadow; m.receiveShadow = first.receiveShadow; m.renderOrder = first.renderOrder; m.userData.merged = list.length;
    root.add(m);
    for (const { o } of list) { o.parent.remove(o); o.geometry.dispose(); }
    after -= list.length - 1;
  }
  return { before, after };
}

// Alt som beveger seg: slår sammen i roten og i hver kept gruppe (hver for seg). Returnerer samlet { before, after }.
export function mergeRigid(THREE, root, keep) {
  const tot = { before: 0, after: 0 };
  const groups = [root]; root.traverse((o) => { if (o !== root && !o.isMesh && keep.has(o)) groups.push(o); });
  for (const g of groups) { const r = mergeStatic(THREE, g, { keep }); tot.before += r.before; tot.after += r.after; }
  return tot;
}

// Alle Object3D (ledd, deler) som koden holder referanse til i et vanlig objekt (f.eks. hero): disse styres av animasjonen
export function refsIn(obj, out = new Set(), seen = new Set(), depth = 0) {
  if (!obj || typeof obj !== 'object' || seen.has(obj) || depth > 4) return out;
  seen.add(obj);
  if (obj.isObject3D) { out.add(obj); return out; }
  for (const k of Array.isArray(obj) ? obj.keys() : Object.keys(obj)) { let v; try { v = obj[k]; } catch { continue; } refsIn(v, out, seen, depth + 1); }
  return out;
}

// Finn ut hva som beveger seg ved å kjøre animasjonen i noen ulike stillinger: noder der matrise eller synlighet endres. `poses` = liste av funksjoner som setter stilling.
export function movingNodes(root, poses) {
  const snaps = poses.map((pose) => { pose(); const m = new Map(); root.traverse((o) => { m.set(o, o.matrix.elements.join(',') + (o.visible ? 'v' : 'h') + (o.material && !Array.isArray(o.material) ? o.material.opacity : '')); }); return m; });
  const moving = new Set(); root.traverse((o) => { if (o !== root && snaps.some((m) => m.get(o) !== snaps[0].get(o))) moving.add(o); });
  return moving;
}

// «Lav profil»: av = aldri, on = alltid, auto = slås på når FPS er lav og oppløsningen allerede er på bunnen (bare ett vindu «bra» skrur den ikke av igjen)
export function createLowProfile({ limit = 22, runs = 3 } = {}) {
  let bad = 0, active = false;
  return {
    get active() { return active; },
    reset() { bad = 0; active = false; },
    // fr = { fps }, pr = nåværende pikselforhold, minPr = laveste, mode = 'off' | 'auto' | 'on'. Returnerer true/false ved endring, ellers null.
    decide(fr, pr, minPr, mode, warm = true) {
      const want = mode === 'on' ? true : mode === 'off' ? false : active;
      if (mode !== 'auto') { bad = 0; if (want !== active) { active = want; return active; } return null; }
      if (active || !fr || !warm) return null;
      if (fr.fps < limit && pr <= minPr + 0.01) bad++; else bad = 0;
      if (bad >= runs) { active = true; bad = 0; return true; }
      return null;
    },
  };
}
