// R18: tegning og animasjon av levende leker (logikken ligger i toys_live.js). Alle fyller boksen sin, så kollisjonen stemmer med utseendet.
// Gruppen har origo i boksens midte. `g.userData.toy` holder delene som animeres.
import * as THREE from 'three';
import { TOY } from './toys_live.js';

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.4, ...o });
const mesh = (geo, mat, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; return m; };
const box = (w, h, d, mat) => mesh(new THREE.BoxGeometry(w, h, d), mat);
const lerpCol = (c, to, k) => new THREE.Color(c).lerp(new THREE.Color(to), k);

export const TOY_BUILDERS = {
  tennisball(sx, sy, sz, o) {                                        // tennisball: gulgrønn med to hvite sømmer
    const g = new THREE.Group(), r = Math.min(sx, sy, sz) / 2, ball = new THREE.Group();
    ball.add(mesh(new THREE.SphereGeometry(r, 28, 20), M(o.color, { roughness: 0.9 })));
    const seam = M(0xf6f4ea, { roughness: 0.7 });
    for (const s of [1, -1]) { const t = mesh(new THREE.TorusGeometry(r * 0.78, r * 0.05, 8, 36, Math.PI * 1.1), seam, false); t.position.set(s * r * 0.62, 0, 0); t.rotation.y = Math.PI / 2; t.rotation.z = s > 0 ? 0.2 : Math.PI + 0.2; t.scale.set(1, 1, 1); ball.add(t); }
    g.add(ball); g.userData.toy = { ball }; return g;
  },
  rockinghorse(sx, sy, sz, o) {                                      // vippehest: to buede medier, kropp, hode med manke. Rykker rundt langsaksen (x) når den gynger.
    const g = new THREE.Group(), long = sx >= sz, L = long ? sx : sz, W = long ? sz : sx, inner = new THREE.Group(), pivot = new THREE.Group();
    const wood = M(o.color, { roughness: 0.45 }), dark = M(lerpCol(o.color, 0x3a2412, 0.6)), pale = M(0xf4ead2, { roughness: 0.8 }), red = M(0xd2453b);
    pivot.position.y = -sy / 2; inner.add(pivot);
    const R = L * 0.72, arc = 1.4, t = Math.max(0.1, W * 0.12);
    for (const s of [-1, 1]) {                                       // medier
      const rk = mesh(new THREE.TorusGeometry(R, t, 8, 28, arc), dark); rk.rotation.z = -Math.PI / 2 - arc / 2; rk.position.set(0, R + t, s * W * 0.42); pivot.add(rk);
    }
    const bodyR = Math.min(W * 0.34, sy * 0.2), bodyLen = L * 0.5, top = sy - 0.02, by = top - bodyR;
    const body = mesh(new THREE.CapsuleGeometry(bodyR, bodyLen, 6, 14), wood); body.rotation.z = Math.PI / 2; body.position.set(-L * 0.02, by, 0); pivot.add(body);
    const saddle = box(L * 0.2, bodyR * 0.3, W * 0.6, red); saddle.position.set(0, by + bodyR * 0.95, 0); pivot.add(saddle);
    const neck = mesh(new THREE.CapsuleGeometry(bodyR * 0.5, bodyR * 1.4, 4, 10), wood); neck.position.set(L * 0.3, by + bodyR * 0.7, 0); neck.rotation.z = -0.55; pivot.add(neck);
    const head = mesh(new THREE.CapsuleGeometry(bodyR * 0.42, bodyR * 1.1, 4, 10), wood); head.position.set(L * 0.42, by + bodyR * 1.55, 0); head.rotation.z = -1.25; pivot.add(head);
    for (const s of [-1, 1]) { const ear = mesh(new THREE.ConeGeometry(bodyR * 0.16, bodyR * 0.4, 6), wood); ear.position.set(L * 0.35, by + bodyR * 2.1, s * bodyR * 0.25); pivot.add(ear); const eye = mesh(new THREE.SphereGeometry(bodyR * 0.09, 8, 6), M(0x111111), false); eye.position.set(L * 0.44, by + bodyR * 1.85, s * bodyR * 0.36); pivot.add(eye); }
    const mane = box(L * 0.05, bodyR * 1.1, bodyR * 0.22, pale); mane.position.set(L * 0.31, by + bodyR * 1.3, 0); mane.rotation.z = -0.5; pivot.add(mane);
    const tail = box(L * 0.04, bodyR * 1.2, bodyR * 0.3, pale); tail.position.set(-L * 0.33, by - bodyR * 0.1, 0); tail.rotation.z = 0.5; pivot.add(tail);
    for (const sx2 of [-1, 1]) for (const s of [-1, 1]) { const leg = mesh(new THREE.CylinderGeometry(bodyR * 0.16, bodyR * 0.13, by - bodyR * 0.4 - 0.1, 8), wood); leg.position.set(sx2 * L * 0.22, (by - bodyR * 0.4 + 0.1) / 2, s * W * 0.3); pivot.add(leg); }
    if (!long) inner.rotation.y = -Math.PI / 2;
    g.add(inner); g.userData.toy = { pivot }; return g;
  },
  windup(sx, sy, sz, o) {                                            // wind-up-robot av blikk med nøkkel i ryggen
    const g = new THREE.Group(), tin = M(o.color, { metalness: 0.55, roughness: 0.3 }), grey = M(0xb9bec4, { metalness: 0.8, roughness: 0.25 }), dark = M(0x2a2f36);
    const root = new THREE.Group(); root.position.y = -sy / 2; g.add(root);
    const bodyH = sy * 0.42, legH = sy * 0.2, headH = sy * 0.3, bw = sx * 0.9, bd = sz * 0.75;
    const body = new THREE.Group(); body.position.y = legH; root.add(body);
    const torso = box(bw, bodyH, bd, tin); torso.position.y = bodyH / 2; body.add(torso);
    const panel = box(bw * 0.5, bodyH * 0.45, 0.03, M(0xe9d36a, { metalness: 0.2 })); panel.position.set(0, bodyH * 0.55, bd / 2 + 0.01); body.add(panel);
    const head = box(bw * 0.7, headH, bd * 0.85, grey); head.position.y = bodyH + headH / 2; body.add(head);
    for (const s of [-1, 1]) { const eye = mesh(new THREE.SphereGeometry(headH * 0.12, 8, 6), M(0xffe27a, { emissive: 0x6a5a10 }), false); eye.position.set(s * bw * 0.16, bodyH + headH * 0.58, bd * 0.43); body.add(eye); }
    const ant = mesh(new THREE.CylinderGeometry(0.02, 0.02, headH * 0.4, 6), dark, false); ant.position.y = bodyH + headH + headH * 0.2; body.add(ant);
    const arms = []; for (const s of [-1, 1]) { const arm = new THREE.Group(); arm.position.set(s * (bw / 2 + 0.03), bodyH * 0.85, 0); const a = box(0.1, bodyH * 0.6, 0.12, grey); a.position.y = -bodyH * 0.25; arm.add(a); body.add(arm); arms.push(arm); }
    const key = new THREE.Group(); key.position.set(0, bodyH * 0.6, -bd / 2 - 0.02); const stem = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6), grey, false); stem.rotation.x = Math.PI / 2; key.add(stem);
    const wing = box(bw * 0.45, 0.04, 0.1, grey); wing.position.z = -0.1; key.add(wing); body.add(key);
    const feet = []; for (const s of [-1, 1]) { const foot = new THREE.Group(); foot.position.set(s * bw * 0.25, legH, 0); const f = box(bw * 0.3, legH, bd * 0.7, dark); f.position.y = -legH / 2; foot.add(f); root.add(foot); feet.push(foot); }
    g.userData.toy = { body, arms, key, feet }; return g;
  },
  jackbox(sx, sy, sz, o) {                                           // sprettboks: kasse med sveiv. Lokket slår opp og klovnen spretter ut på en fjær.
    const g = new THREE.Group(), main = M(o.color, { roughness: 0.35 }), trim = M(lerpCol(o.color, 0xffffff, 0.55), { roughness: 0.35 }), lidH = sy * 0.12, bodyH = sy - lidH;
    const body = box(sx, bodyH, sz, main); body.position.y = -sy / 2 + bodyH / 2; g.add(body);
    for (const [dx, dz, w, d] of [[0, 1, sx, 0.02], [0, -1, sx, 0.02], [1, 0, 0.02, sz], [-1, 0, 0.02, sz]]) { const band = box(w * 1.01 || 0.02, bodyH * 0.16, d * 1.01 || 0.02, trim); band.position.set(dx * sx / 2, -sy / 2 + bodyH * 0.5, dz * sz / 2); g.add(band); }
    const crank = new THREE.Group(); crank.position.set(sx / 2 + 0.03, -sy / 2 + bodyH * 0.5, 0); const rod = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 6), M(0xe4e6e8, { metalness: 0.8 }), false); rod.rotation.z = Math.PI / 2; crank.add(rod);
    const knob = mesh(new THREE.SphereGeometry(Math.min(0.12, sx * 0.06), 8, 6), M(0xd2453b), false); knob.position.set(0.1, Math.min(0.3, sy * 0.15), 0); crank.add(knob); g.add(crank);
    const head = new THREE.Group(), spring = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8), M(0xc8ccd0, { metalness: 0.8 }), false); head.add(spring);
    const face = mesh(new THREE.SphereGeometry(sx * 0.2, 16, 12), M(0xf5d3b3)); face.position.y = sx * 0.2; head.add(face);
    const nose = mesh(new THREE.SphereGeometry(sx * 0.05, 8, 6), M(0xd2453b), false); nose.position.set(0, sx * 0.2, sx * 0.19); head.add(nose);
    const hat = mesh(new THREE.ConeGeometry(sx * 0.16, sx * 0.3, 10), M(0x3a7bd5)); hat.position.y = sx * 0.2 + sx * 0.3; head.add(hat);
    const hx = -sy / 2 + bodyH; head.position.y = hx; g.add(head);                                  // hvile: inne i kassa (bare lokket dekker)
    const lid = new THREE.Group(); lid.position.set(0, -sy / 2 + bodyH, -sz / 2); const lp = box(sx * 1.02, lidH, sz * 1.02, trim); lp.position.set(0, lidH / 2, sz / 2); lid.add(lp); g.add(lid);
    g.userData.toy = { head, spring, lid, hx, sx, sy };
    head.visible = false; return g;
  },
};

// Animer én leke ut fra logikktilstanden (t = S.toys.get(id), clock = sekunder)
export function animateToy(mesh, kind, t, clock) {
  const u = mesh.userData.toy; if (!u || !t) return;
  if (kind === 'tennisball') u.ball.rotation.set(t.rx, 0, t.rz);
  else if (kind === 'rockinghorse') { const k = t.rock / TOY.rockT; u.pivot.rotation.z = k > 0 ? Math.sin(t.ph) * 0.2 * k * Math.min(1, k * 3 + 0.15) : 0; }
  else if (kind === 'windup') {
    const w = t.wind > 0, s = Math.sin(clock * 14);
    u.body.rotation.z = w ? s * 0.1 : 0; u.key.rotation.z = (w ? clock * 9 : t.wasCarried ? clock * 5 : 0);
    u.arms[0].rotation.x = w ? s * 0.7 : 0; u.arms[1].rotation.x = w ? -s * 0.7 : 0; u.feet[0].rotation.x = w ? -s * 0.5 : 0; u.feet[1].rotation.x = w ? s * 0.5 : 0;
  } else if (kind === 'jackbox') {
    const k = t.pop > 0 ? t.pop / TOY.popT : 0, ext = k > 0 ? Math.min(1, (1 - k) * 9) * Math.min(1, k * 3.5) : 0, bob = k > 0 ? Math.sin(clock * 26) * 0.06 * k : 0;
    u.head.visible = ext > 0.02; u.lid.rotation.x = -ext * 1.9;
    const h = u.sy * 0.75 * ext; u.spring.scale.y = Math.max(0.01, h); u.spring.position.y = h / 2; u.head.position.y = u.hx; u.head.children[1].position.y = h + u.sx * 0.2 + bob; u.head.children[2].position.y = h + u.sx * 0.2 + bob; u.head.children[3].position.y = h + u.sx * 0.5 + bob;
  } else if (kind === 'toycar') { const k = Math.min(1, t.cool / 0.4); mesh.rotation.z = k > 0 ? Math.sin(clock * 40) * 0.03 * k : 0; }
}
