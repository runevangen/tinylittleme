// R194: skannet rom (GLB) som bane: lesing av GLB, lagring i nettleseren (IndexedDB), og utseendet i spillet. Logikken (voxel, bokser, start/mål) ligger i scan_logic.js.
// GLB-filen sendes aldri til noen tjeneste: den ligger bare i IndexedDB på enheten, knyttet til brettet med en tilfeldig id (`level.scan.id`).
// GLTFLoader (lib/GLTFLoader.js, three r170) lastes først når en skanning åpnes, så oppstarten er uendret uten skanning.
import { SCAN, scanOk } from './scan_logic.js';

// ---- IndexedDB (alt i try/catch: privat modus og blokkert lagring gir bare «ikke lagret») ----
const DB = 'tlm-scan', STORE = 'glb';
const openDb = () => new Promise((ok, no) => { try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); r.onblocked = () => no(new Error('blokkert')); } catch (e) { no(e); } });
async function tx(mode, fn) { const db = await openDb(); try { return await new Promise((ok, no) => { const t = db.transaction(STORE, mode), q = fn(t.objectStore(STORE)); t.oncomplete = () => ok(q && q.result); t.onerror = () => no(t.error); t.onabort = () => no(t.error || new Error('avbrutt')); }); } finally { db.close(); } }
export async function saveGlb(id, buf) { try { await tx('readwrite', (s) => s.put(buf, id)); return true; } catch { return false; } }
export async function loadGlb(id) { try { return (await tx('readonly', (s) => s.get(id))) || null; } catch { return null; } }
export async function deleteGlb(id) { try { await tx('readwrite', (s) => s.delete(id)); return true; } catch { return false; } }

// ---- GLB → three-scene → trekanter i verdensrom ----
async function gltfLoader() { const m = await import('./lib/GLTFLoader.js'); return new m.GLTFLoader(); }
export async function parseGlbScene(buf) { const ld = await gltfLoader(); return new Promise((ok, no) => { try { ld.parse(buf, '', ok, no); } catch (e) { no(e); } }); }
// { ok:true, mesh:{pos:Float32Array, idx:Uint32Array}, tris } | { ok:false, reason:'mange'|'tom', tris }
export function extractTris(root, o = {}) {
  const max = o.maxTris ?? SCAN.maxTris; root.updateMatrixWorld(true);
  const parts = []; let tris = 0, verts = 0;
  root.traverse((m) => { const g = m.isMesh && m.geometry, p = g && g.attributes && g.attributes.position; if (!p) return; const n = g.index ? g.index.count : p.count; parts.push(m); tris += Math.floor(n / 3); verts += p.count; });
  if (tris > max) return { ok: false, reason: 'mange', tris };
  if (!tris) return { ok: false, reason: 'tom', tris: 0 };
  const pos = new Float32Array(verts * 3), idx = new Uint32Array(tris * 3); let vo = 0, io = 0; const v = { x: 0, y: 0, z: 0 };
  for (const m of parts) {
    const g = m.geometry, p = g.attributes.position, e = m.matrixWorld.elements;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      v.x = e[0] * x + e[4] * y + e[8] * z + e[12]; v.y = e[1] * x + e[5] * y + e[9] * z + e[13]; v.z = e[2] * x + e[6] * y + e[10] * z + e[14];
      const o3 = (vo + i) * 3; pos[o3] = v.x; pos[o3 + 1] = v.y; pos[o3 + 2] = v.z;
    }
    const n = g.index ? g.index.count : p.count, n3 = n - (n % 3);
    for (let i = 0; i < n3; i++) idx[io++] = vo + (g.index ? g.index.getX(i) : i);
    vo += p.count;
  }
  return { ok: true, mesh: { pos, idx: idx.subarray(0, io) }, tris: io / 3 };
}

// ---- utseendet i spillet ----
// Skanninger har lyset bakt inn i teksturen, så materialene gjøres om til ulyste (MeshBasicMaterial): billig, ingen skygger. Taket klippes bort (info.cut) så kameraet ser ned i rommet.
// info = level.scan = { id, scale, offset:[x,y,z], cut? }. Gir { group, tris, ms } eller null (ingen fil lagret på denne enheten, eller feil).
export async function loadScanVisual({ THREE, renderer, info, logEv, show = true }) {
  if (!scanOk(info) || !show) { logEv?.('skann', `utseende ikke vist (${!scanOk(info) ? 'ugyldig skanneinfo' : 'valget er av'}): kollisjonsboksene tegnes`); return null; }
  const t0 = performance.now(), buf = await loadGlb(info.id);
  if (!buf) { logEv?.('skann', 'utseende mangler (GLB-en ligger ikke på denne enheten): kollisjonsboksene tegnes'); return null; }
  try {
    const gltf = await parseGlbScene(buf), group = new THREE.Group(), cache = new Map(); let tris = 0;
    const plane = Number.isFinite(info.cut) ? new THREE.Plane(new THREE.Vector3(0, -1, 0), info.cut) : null;
    if (plane) renderer.localClippingEnabled = true;
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return; o.castShadow = o.receiveShadow = false; o.userData.scan = true;
      const old = o.material, vc = !!(o.geometry.attributes && o.geometry.attributes.color);
      const conv = (m) => { let r = cache.get(m); if (!r) { r = new THREE.MeshBasicMaterial({ map: m.map || null, color: m.color ? m.color.clone() : 0xffffff, vertexColors: vc, side: THREE.DoubleSide, ...(plane ? { clippingPlanes: [plane] } : {}) }); cache.set(m, r); } return r; };
      o.material = Array.isArray(old) ? old.map(conv) : conv(old);
      tris += Math.floor((o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3);
    });
    group.add(gltf.scene); group.scale.setScalar(info.scale); group.position.set(info.offset[0], info.offset[1], info.offset[2]); group.userData.scan = true;
    const ms = performance.now() - t0; logEv?.('skann', `utseende lastet: ${tris} trekanter, ${(buf.byteLength / 1048576).toFixed(1)} MB, ${Math.round(ms)} ms (testes på telefon: ekte FPS)`);
    return { group, tris, ms };
  } catch (e) { logEv?.('skann', `utseende feilet: ${String(e && e.message || e).slice(0, 80)}: kollisjonsboksene tegnes`); return null; }
}
