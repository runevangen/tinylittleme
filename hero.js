// Figuren (v0.62): den lille utforskeren med mer naturtro kropp. Samme skjelett som før (hofter, knær, skuldre, albuer),
// så animasjonene i main.js virker som før, men kroppen har form: avsmalnende armer og ben, jakke med snitt, hender med fingre,
// støvler med hæl og lisser, og stoff, strikk og lær med relieff. Bare utseende: ingen kollisjon her.
import * as THREE from 'three';
import { roundedBoxGeo } from './props.js';

export const RIG_S = 1.07;   // figuren tegnes litt større enn animasjonsrommet (så den blir ~1,0 høy)

export function buildHero(look = {}) {
  const root = new THREE.Group();
  const rig = new THREE.Group(); rig.scale.setScalar(RIG_S); root.add(rig);
  const nm = (t, x, y, k = 0.6) => (t ? { normalMap: look.rep(t, x, y), normalScale: new THREE.Vector2(k, k) } : {});
  const mat = (color, rough = 0.75, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });
  const M = {
    skin: mat(0xe8b796, 0.55), lip: mat(0xa8524a, 0.5), jacket: mat(0xd9692a, 0.82, nm(look.weave, 26, 26, 0.35)), jacketD: mat(0xb04c1a, 0.85, nm(look.weave, 14, 14, 0.35)),
    scarf: mat(0x1f9a94, 0.95, nm(look.knit, 5, 2, 0.9)), pants: mat(0x35475a, 0.88, nm(look.twill, 14, 18, 0.5)), patch: mat(0x2b3a4a, 0.9, nm(look.twill, 3, 3, 0.7)),
    boot: mat(0x6e4a30, 0.6, nm(look.leather, 2, 2, 0.6)), bootD: mat(0x4e3320, 0.55, nm(look.leather, 2, 2, 0.6)), sole: mat(0x2e2a26, 0.9), lace: mat(0xd8cdb4, 0.9),
    glove: mat(0x5a3d28, 0.7, nm(look.leather, 2, 2, 0.7)), hair: mat(0x4a2f1c, 0.75), helmet: mat(0xf0b530, 0.38), helmetD: mat(0xc98f1c, 0.45),
    strap: mat(0x4a3322, 0.8, nm(look.leather, 3, 1, 0.5)), lens: new THREE.MeshPhysicalMaterial({ color: 0xffe27a, roughness: 0.08, transparent: true, opacity: 0.6, clearcoat: 1 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xffe9a0, emissiveIntensity: 0.9 }), pack: mat(0x66713a, 0.92, nm(look.weave, 12, 12, 0.6)), roll: mat(0x4d6d82, 0.92, nm(look.weave, 6, 3, 0.7)),
    pouch: mat(0x86663f, 0.8, nm(look.leather, 2, 2, 0.6)), gold: mat(0xd8b24a, 0.3, { metalness: 0.85 }), steel: mat(0xb9bec4, 0.3, { metalness: 0.9 }), rope: mat(0xd9c79a, 0.95),
    white: mat(0xf7f4ee, 0.25), iris: mat(0x6a4a2c, 0.3), pupil: new THREE.MeshBasicMaterial({ color: 0x111111 }), glint: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    brow: mat(0x3a2418, 0.9), mouth: new THREE.MeshBasicMaterial({ color: 0x6e2a2a }), blush: new THREE.MeshBasicMaterial({ color: 0xf08080, transparent: true, opacity: 0 }),
    sweat: new THREE.MeshStandardMaterial({ color: 0x9fd8f0, roughness: 0.1, transparent: true, opacity: 0.85 }),
  };
  const mesh = (geo, m) => { const o = new THREE.Mesh(geo, m); o.castShadow = true; return o; };
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  const sph = (r, m, ws = 12, hs = 10) => mesh(new THREE.SphereGeometry(r, ws, hs), m);
  const lathe = (pts, m, seg = 14) => mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y)), seg), m);
  const boxm = (w, h, d, m) => mesh(new THREE.BoxGeometry(w, h, d), m);

  // ledd med form: profilen (radius, andel av lengden nedover) dreies rundt benet. Lengdene er de samme som i det gamle skjelettet.
  const limb = (up, lo, r, profUp, profLo, matUp, matLo = matUp) => {
    const l1 = up + r * 1.2, l2 = lo + r * 1.2;
    const top = new THREE.Group(); top.add(lathe(profUp.map(([k, t]) => [r * k, -l1 * t]).reverse(), matUp));
    const mid = new THREE.Group(); mid.position.y = -l1; top.add(mid);
    mid.add(lathe(profLo.map(([k, t]) => [r * k, -l2 * t]).reverse(), matLo));
    return { top, mid, end: -l2, l1, l2 };
  };

  // ryggrad i to deler: bekken (følger hoftene) og bryst (kan bøye og vri seg)
  const body = new THREE.Group(); body.position.y = 0.46; rig.add(body);
  const pelvis = lathe([[0.0, -0.085], [0.07, -0.075], [0.092, -0.03], [0.094, 0.02], [0.086, 0.06], [0.0, 0.07]], M.pants); pelvis.scale.set(1.22, 1, 0.82); body.add(pelvis);
  const belt = mesh(new THREE.TorusGeometry(0.1, 0.013, 8, 28), M.strap); belt.rotation.x = Math.PI / 2; belt.scale.set(1.27, 0.86, 1.5); belt.position.y = 0.04; body.add(belt);
  body.add(at(boxm(0.032, 0.028, 0.012, M.gold), 0, 0.04, 0.088));
  for (const sx of [-1, 1]) {                                              // verktøybelte: lommer med klaff og knapp
    const po = at(mesh(roundedBoxGeo(0.044, 0.055, 0.03, 0.01, 0.006), M.pouch), sx * 0.098, 0.0, 0.052); po.rotation.y = sx * 0.55; body.add(po);
    const fl = at(boxm(0.047, 0.02, 0.033, M.strap), sx * 0.098, 0.047, 0.052); fl.rotation.y = sx * 0.55; body.add(fl);
    const bt = at(sph(0.005, M.gold, 6, 5), sx * 0.108, 0.04, 0.068); body.add(bt);
  }
  { const coil = mesh(new THREE.TorusGeometry(0.03, 0.009, 6, 16), M.rope); coil.position.set(-0.118, -0.01, -0.03); coil.rotation.y = Math.PI / 2 - 0.3; body.add(coil);      // taukveil i beltet
    const coil2 = coil.clone(); coil2.position.x -= 0.012; coil2.scale.setScalar(0.92); body.add(coil2); }
  const chest = new THREE.Group(); chest.position.y = 0.09; body.add(chest);
  // jakke: smalere i livet, bredest over brystet, skuldre som skråner inn mot halsen, og en kant nederst
  const torso = lathe([[0.0, -0.1], [0.097, -0.1], [0.101, -0.085], [0.094, -0.03], [0.096, 0.03], [0.103, 0.09], [0.104, 0.125], [0.097, 0.16], [0.08, 0.188], [0.05, 0.208], [0.0, 0.216]], M.jacket, 20);
  torso.scale.set(1.12, 1, 0.78); chest.add(torso);
  const hem = mesh(new THREE.TorusGeometry(0.099, 0.008, 6, 24), M.jacketD); hem.rotation.x = Math.PI / 2; hem.scale.set(1.12, 0.78, 1); hem.position.y = -0.094; chest.add(hem);
  chest.add(at(boxm(0.012, 0.25, 0.008, M.jacketD), 0, 0.055, 0.0795));                                                 // glidelås med stolpe
  chest.add(at(boxm(0.005, 0.24, 0.006, M.steel), 0, 0.055, 0.0835)); chest.add(at(boxm(0.011, 0.016, 0.008, M.steel), 0, 0.165, 0.0845));
  for (const sx of [-1, 1]) {                                              // brystlommer med klaff og knapp
    const pk = at(boxm(0.046, 0.04, 0.008, M.jacket), sx * 0.058, 0.108, 0.073); pk.rotation.y = sx * 0.36; chest.add(pk);
    const fl = at(boxm(0.05, 0.016, 0.011, M.jacketD), sx * 0.058, 0.13, 0.0735); fl.rotation.y = sx * 0.36; chest.add(fl);
    const bn = at(sph(0.0042, M.gold, 6, 5), sx * 0.06, 0.126, 0.08); chest.add(bn);
    const st = mesh(new THREE.TorusGeometry(0.088, 0.0085, 6, 22), M.strap); st.rotation.y = Math.PI / 2; st.scale.set(1, 1.05, 1); st.position.set(sx * 0.072, 0.105, -0.008); chest.add(st);   // sekkens bærestropper
  }
  const neck = mesh(new THREE.CylinderGeometry(0.029, 0.034, 0.06, 12), M.skin); neck.position.y = 0.225; chest.add(neck);
  const collar = mesh(new THREE.CylinderGeometry(0.047, 0.052, 0.03, 16, 1, true), M.jacketD); collar.material.side = THREE.DoubleSide; collar.position.y = 0.212; chest.add(collar);
  const scarfRing = mesh(new THREE.TorusGeometry(0.052, 0.022, 8, 20), M.scarf); scarfRing.rotation.x = Math.PI / 2; scarfRing.position.y = 0.222; scarfRing.scale.set(1.12, 1, 0.9); chest.add(scarfRing);
  const scarf2 = mesh(new THREE.TorusGeometry(0.05, 0.018, 8, 20), M.scarf); scarf2.rotation.set(Math.PI / 2 + 0.22, 0.1, 0); scarf2.position.y = 0.238; scarf2.scale.set(1.1, 1, 0.9); chest.add(scarf2);
  const knot = sph(0.026, M.scarf); knot.position.set(0.04, 0.208, 0.058); knot.scale.set(1, 0.85, 0.8); chest.add(knot);
  // skjerfhaler (to ledd) som flagrer bakover med farten
  const tailA = new THREE.Group(); tailA.position.set(0.022, 0.21, -0.06); chest.add(tailA);
  tailA.add(at(boxm(0.05, 0.1, 0.012, M.scarf), 0, -0.05, 0));
  const tailB = new THREE.Group(); tailB.position.y = -0.1; tailA.add(tailB);
  tailB.add(at(boxm(0.05, 0.085, 0.012, M.scarf), 0, -0.0425, 0)); tailB.add(at(boxm(0.052, 0.012, 0.014, M.jacket), 0, -0.064, 0));
  for (let i = -2; i <= 2; i++) tailB.add(at(boxm(0.005, 0.016, 0.008, M.scarf), i * 0.01, -0.092, 0));                 // frynser
  // sekk med lokk, spenner, sidelomme og sovepose
  const packG = new THREE.Group(); packG.position.set(0, 0.09, -0.1); chest.add(packG);
  packG.add(at(mesh(roundedBoxGeo(0.145, 0.18, 0.08, 0.028, 0.014), M.pack), 0, -0.085, -0.006));
  packG.add(at(mesh(roundedBoxGeo(0.15, 0.04, 0.086, 0.03, 0.012), M.pack), 0, 0.068, -0.008));                          // lokk
  packG.add(at(mesh(roundedBoxGeo(0.09, 0.07, 0.03, 0.012, 0.008), M.pouch), 0, -0.07, -0.05));                          // ytterlomme
  for (const sx of [-1, 1]) { packG.add(at(boxm(0.012, 0.11, 0.006, M.strap), sx * 0.04, 0.03, -0.049)); packG.add(at(boxm(0.016, 0.012, 0.009, M.steel), sx * 0.04, -0.005, -0.05)); }
  const rollM = mesh(new THREE.CapsuleGeometry(0.03, 0.105, 5, 12), M.roll); rollM.rotation.z = Math.PI / 2; rollM.position.set(0, 0.135, -0.004); packG.add(rollM);
  for (const sx of [-1, 1]) { const rs = mesh(new THREE.TorusGeometry(0.031, 0.004, 5, 14), M.strap); rs.rotation.y = Math.PI / 2; rs.position.set(sx * 0.038, 0.135, -0.004); packG.add(rs); }
  { const cup = mesh(new THREE.CylinderGeometry(0.016, 0.014, 0.026, 10), M.steel); cup.position.set(0.082, -0.02, -0.012); packG.add(cup); }      // blikkopp som henger på siden

  // hode: litt mindre enn før (mer menneskelig), med kjeve, øyne med iris og øyelokk, hjelm med kam, lykt og hakerem
  const HS = 1.18;
  const head = new THREE.Group(); head.position.y = 0.283; chest.add(head);
  const headS = new THREE.Group(); headS.scale.setScalar(HS); head.add(headS);
  const skull = sph(0.075, M.skin, 24, 18); skull.scale.set(0.96, 1.03, 1); headS.add(skull);
  const jaw = sph(0.056, M.skin, 16, 12); jaw.position.set(0, -0.034, 0.01); jaw.scale.set(1.02, 0.92, 1.0); headS.add(jaw);
  const nose = sph(0.0115, M.skin, 8, 8); nose.position.set(0, -0.01, 0.077); nose.scale.set(0.95, 0.9, 1.15); headS.add(nose);
  const bridge = sph(0.008, M.skin, 6, 6); bridge.position.set(0, 0.004, 0.073); bridge.scale.set(0.8, 1.6, 0.9); headS.add(bridge);
  for (const sx of [-1, 1]) { const ear = sph(0.017, M.skin, 8, 8); ear.position.set(sx * 0.072, -0.006, -0.002); ear.scale.set(0.5, 1, 0.8); headS.add(ear); }
  // hår: en kappe i nakken og langs sidene, og tuster som stikker ut under hjelmkanten
  const hairCap = mesh(new THREE.SphereGeometry(0.0775, 22, 10, Math.PI * 1.08, Math.PI * 0.84, Math.PI * 0.3, Math.PI * 0.42), M.hair); hairCap.scale.set(0.98, 1.03, 1.02); headS.add(hairCap);
  for (const [x, y, z, r] of [[0.064, 0.02, 0.03, 0.011], [-0.065, 0.02, 0.03, 0.011], [0.03, 0.033, 0.064, 0.01], [-0.022, 0.035, 0.066, 0.01], [0.07, -0.012, 0.004, 0.01], [-0.07, -0.012, 0.004, 0.01]]) { const h = sph(r, M.hair, 7, 6); h.position.set(x, y, z); h.scale.set(1, 0.8, 0.7); headS.add(h); }
  const helmG = new THREE.Group(); helmG.position.y = 0.026; helmG.rotation.x = -0.2; headS.add(helmG);
  const helmet = mesh(new THREE.SphereGeometry(0.084, 26, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), M.helmet); helmG.add(helmet);
  const rim = mesh(new THREE.TorusGeometry(0.0845, 0.0055, 6, 30), M.helmetD); rim.rotation.x = Math.PI / 2; helmG.add(rim);
  const ridge = mesh(new THREE.TorusGeometry(0.0845, 0.006, 5, 20, Math.PI), M.helmetD); ridge.rotation.y = Math.PI / 2; helmG.add(ridge);          // kam fra panne til nakke
  const visor = mesh(new THREE.CylinderGeometry(0.086, 0.103, 0.007, 20, 1, false, -Math.PI * 0.32, Math.PI * 0.64), M.helmet); visor.position.set(0, 0.002, 0.012); visor.rotation.x = 0.16; helmG.add(visor);   // brem
  for (const sx of [-1, 1]) { const v = boxm(0.006, 0.02, 0.016, M.helmetD); v.position.set(sx * 0.062, 0.05, 0.022); v.rotation.z = -sx * 0.85; helmG.add(v); }
  const gband = mesh(new THREE.TorusGeometry(0.0855, 0.0055, 6, 30), M.strap); gband.rotation.x = Math.PI / 2; gband.position.y = 0.024; gband.scale.setScalar(0.965); helmG.add(gband);   // brillestropp
  for (const sx of [-1, 1]) {                                              // briller skjøvet opp på hjelmen
    const cupG = new THREE.Group(); cupG.position.set(sx * 0.03, 0.03, 0.076); cupG.rotation.x = -0.32; helmG.add(cupG);
    const cu = mesh(new THREE.CylinderGeometry(0.021, 0.023, 0.014, 14), M.strap); cu.rotation.x = Math.PI / 2; cupG.add(cu);
    const ln = mesh(new THREE.CircleGeometry(0.018, 14), M.lens); ln.position.z = 0.0075; ln.castShadow = false; cupG.add(ln);
  }
  helmG.add(at(boxm(0.014, 0.008, 0.008, M.strap), 0, 0.03, 0.08));
  const lampG = new THREE.Group(); lampG.position.set(0, 0.068, 0.052); lampG.rotation.x = -0.75; helmG.add(lampG);
  { const hs = mesh(new THREE.CylinderGeometry(0.017, 0.014, 0.022, 12), M.steel); hs.rotation.x = Math.PI / 2; lampG.add(hs);
    const gl = mesh(new THREE.CylinderGeometry(0.0135, 0.0135, 0.004, 12), M.lamp); gl.rotation.x = Math.PI / 2; gl.position.z = 0.012; gl.castShadow = false; lampG.add(gl); }
  const chin = mesh(new THREE.TorusGeometry(0.0745, 0.003, 5, 22, Math.PI), M.strap); chin.rotation.z = Math.PI; chin.scale.set(0.98, 1.08, 1); chin.position.set(0, 0.0, 0.012); headS.add(chin);   // hakerem
  // ansikt
  const BROW_Y = 0.034;
  const face = { eyes: [], pupils: [], brows: [], blush: [], browY: BROW_Y };
  for (const sx of [-1, 1]) {
    const eye = new THREE.Group(); eye.position.set(sx * 0.029, 0.004, 0.0655); headS.add(eye);
    const white = sph(0.0175, M.white, 14, 12); white.scale.set(1.08, 1.0, 0.45); white.castShadow = false; eye.add(white);
    const pupil = new THREE.Group(); pupil.position.z = 0.0065; eye.add(pupil);                                    // iris + pupill + glimt (flyttes og skaleres samlet)
    const iris = sph(0.0102, M.iris, 12, 10); iris.castShadow = false; pupil.add(iris);
    const pp = sph(0.0058, M.pupil, 10, 8); pp.position.z = 0.0062; pp.castShadow = false; pupil.add(pp);
    const glint = sph(0.0028, M.glint, 6, 6); glint.position.set(0.0035, 0.004, 0.0105); glint.castShadow = false; pupil.add(glint);
    const lid = mesh(new THREE.SphereGeometry(0.0188, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.36), M.skin); lid.scale.set(1.1, 1.0, 0.5); lid.position.z = 0.0008; lid.rotation.x = -0.25; lid.castShadow = false; eye.add(lid);   // øvre øyelokk
    face.eyes.push(eye); face.pupils.push(pupil);
    const brow = boxm(0.03, 0.0062, 0.008, M.brow); brow.position.set(sx * 0.03, BROW_Y, 0.066); brow.castShadow = false; headS.add(brow); face.brows.push(brow);
    const bl = new THREE.Mesh(new THREE.CircleGeometry(0.013, 12), M.blush); bl.position.set(sx * 0.046, -0.022, 0.0605); bl.rotation.y = sx * 0.55; headS.add(bl); face.blush.push(bl);
  }
  face.smile = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.0034, 6, 14, Math.PI), M.mouth); face.smile.position.set(0, -0.03, 0.0715); headS.add(face.smile);
  face.open = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), M.mouth); face.open.position.set(0, -0.034, 0.07); face.open.scale.set(1, 1, 0.4); face.open.visible = false; headS.add(face.open);
  face.sweat = new THREE.Group(); { const d = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), M.sweat); const c = new THREE.Mesh(new THREE.ConeGeometry(0.0085, 0.02, 8), M.sweat); c.position.y = 0.014; face.sweat.add(d, c); face.sweat.position.set(0.062, 0.035, 0.045); face.sweat.visible = false; headS.add(face.sweat); }

  const arm = (s) => {
    const a = limb(0.09, 0.09, 0.034, [[1.2, 0], [1.16, 0.25], [1.0, 0.7], [0.95, 1]], [[0.95, 0], [1.0, 0.25], [0.86, 0.75], [0.9, 0.86], [0.9, 1]], M.jacket);
    a.top.position.set(s * 0.127, 0.16, 0); chest.add(a.top);
    const shoulder = sph(0.043, M.jacket); shoulder.scale.set(1, 0.95, 1); a.top.add(shoulder);
    a.top.add(at(boxm(0.03, 0.006, 0.05, M.jacketD), s * 0.004, 0.036, 0));                                         // skulderklaff
    a.mid.add(sph(0.0325, M.jacket, 10, 8));                                                                       // albue
    const el = sph(0.03, M.jacketD, 8, 6); el.position.set(0, -0.012, -0.012); el.scale.set(0.9, 1.3, 0.6); a.mid.add(el);   // albuelapp
    const cuff = mesh(new THREE.CylinderGeometry(0.0325, 0.0335, 0.02, 12), M.jacketD); cuff.position.y = a.end + 0.012; a.mid.add(cuff);
    // hånd: håndflate, tommel og fingre som kan krumme seg rundt det han holder
    const hand = new THREE.Group(); hand.position.y = a.end - 0.004; a.mid.add(hand);
    const palm = sph(0.027, M.glove, 10, 8); palm.scale.set(0.62, 1.0, 1.0); palm.position.y = -0.02; hand.add(palm);
    const thumb = mesh(new THREE.CapsuleGeometry(0.0085, 0.016, 3, 6), M.glove); thumb.position.set(0, -0.02, 0.028); thumb.rotation.x = -0.7; hand.add(thumb);
    const fingers = new THREE.Group(); fingers.position.set(0, -0.04, 0.004); hand.add(fingers);
    const tips = new THREE.Group(); tips.position.y = -0.021;
    for (let i = 0; i < 4; i++) { const z = 0.018 - i * 0.0125, ln = i === 0 || i === 3 ? 0.012 : 0.016;
      const f1 = mesh(new THREE.CapsuleGeometry(0.0068, ln, 3, 6), M.glove); f1.position.set(0, -0.009, z); fingers.add(f1);
      const f2 = mesh(new THREE.CapsuleGeometry(0.0062, ln * 0.8, 3, 6), M.glove); f2.position.set(0, -0.008, z); tips.add(f2); }
    fingers.add(tips);
    a.fingers = fingers; a.tips = tips; a.thumb = thumb;
    return a;
  };
  const leg = (s) => {
    const l = limb(0.15, 0.15, 0.047, [[1.24, 0], [1.2, 0.2], [1.02, 0.75], [0.96, 1]], [[0.96, 0], [1.04, 0.22], [0.9, 0.55], [0.8, 0.82], [0.86, 1]], M.pants);
    l.top.position.set(s * 0.058, 0.46, 0); rig.add(l.top);
    l.top.add(at(sph(0.057, M.pants, 10, 8), 0, -0.004, 0));
    const cargo = at(mesh(roundedBoxGeo(0.02, 0.06, 0.05, 0.008, 0.005), M.patch), s * 0.05, -0.15, 0.002); l.top.add(cargo);                 // lårlomme
    l.mid.add(sph(0.046, M.pants, 10, 8));                                                                                                // kne
    const kp = sph(0.04, M.patch, 10, 8); kp.position.set(0, -0.006, 0.014); kp.scale.set(0.9, 1.15, 0.75); l.mid.add(kp);                 // knelapp
    const footG = new THREE.Group(); footG.position.y = l.end; l.mid.add(footG); l.footG = footG;      // ankelen
    const bunch = mesh(new THREE.TorusGeometry(0.036, 0.011, 6, 14), M.pants); bunch.rotation.x = Math.PI / 2; bunch.position.y = l.end + 0.06; l.mid.add(bunch);   // buksa bretter seg over støvelen
    const shaft = lathe([[0.046, -0.01], [0.044, 0.02], [0.047, 0.052], [0.043, 0.056]], M.boot, 12); footG.add(shaft);
    const boot = mesh(roundedBoxGeo(0.086, 0.056, 0.172, 0.032, 0.016), M.boot); boot.geometry.translate(0, -0.028, 0); boot.position.set(0, 0.014, 0.036); footG.add(boot);
    const toe = sph(0.04, M.bootD, 10, 8); toe.scale.set(1.02, 0.62, 1.05); toe.position.set(0, -0.004, 0.088); footG.add(toe);                   // tåhette
    const sole = mesh(roundedBoxGeo(0.092, 0.014, 0.182, 0.034, 0.004), M.sole); sole.geometry.translate(0, -0.007, 0); sole.position.set(0, -0.022, 0.036); footG.add(sole);
    footG.add(at(boxm(0.08, 0.014, 0.06, M.sole), 0, -0.03, -0.018));                                                                    // hæl
    for (let i = 0; i < 3; i++) { const lc = boxm(0.05, 0.005, 0.007, M.lace); lc.position.set(0, 0.034 - i * 0.004, 0.046 + i * 0.02); lc.rotation.set(0.5, 0, i % 2 ? 0.35 : -0.35); footG.add(lc); }
    return l;
  };
  const L = { armL: arm(-1), armR: arm(1), legL: leg(-1), legR: leg(1) };
  const cur = { aL: 0, aR: 0, zL: 0, zR: 0, eL: 0, eR: 0, hL: 0, hR: 0, kL: 0, kR: 0, lean: 0, chest: 0, twist: 0, hy: 0, hp: 0, fp: 0, lzL: 0, lzR: 0, roll: 0, sway: 0, fgL: 0.4, fgR: 0.4 };
  const hero = { root, body, chest, head, ...L, cur, yaw: 0, ph: 0, gph: 0, accLean: 0, bob: 0, pv: null, ikW: 0, hipY: 0.46,
    face, tailA, tailB, packG, helmet, sec: { a: 0, av: 0, b: 0, bv: 0, pk: 0, pkv: 0 }, mood: { name: '', t: 0 }, look: { x: 0, y: 0, tx: 0, ty: 0, t: 0 }, blink: { t: 2, v: 0 }, idleT: 0, talkT: 0 };
  root.traverse((o) => { if (o.isMesh && o.castShadow !== false) o.castShadow = true; });
  return hero;
}
