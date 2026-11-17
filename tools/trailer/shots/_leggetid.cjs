// Felles for forhistorien «Leggetid» (docs/FORHISTORIE.md): badet om kvelden i full skala. Alt er ekte spillmotor (nivå «bad»): figuren tegnes HS ganger større (cine.heroScale),
// speil, speilskap, flaske, lapp, glass og tablett er enkle props (cine.prop). Speilbildet er en flat, speilvendt kopi av figuren som projiseres inn på speilflata fra kameraet (per bilde).
// Armen (til å rekke mot skapet og holde tabletten) styres fra skriptet ved at armleddenes rotasjon overstyres i siden (forceArm); ingen endring i spillkoden.
const HS = 24;                          // figuren er ca. 1 enhet høy (5 cm); 24 = ca. 1,2 m i et bad der vasken er 0,8 m høy
const HERO = { x: -1, y: 0, z: -12, yaw: Math.PI };
// Felles sted S for figuren i alle Leggetid-klipp, krympingen og starten av 01_bad_oversikt: hun flyttes aldri; bare skalaen (og kameraet) endres.
const S = { x: HERO.x, z: HERO.z };
// siste kamerapose i krympingen (gulvnivå, litt skrått bakfra) = første pose i 01_bad_oversikt (match-cut). Blikkpunktet er brystet til figuren i skala 1.
const END_CAM = { x: S.x - 3.0, y: 2.4, z: S.z + 4.8, tx: S.x, ty: 0.58, tz: S.z, fov: 42 };
const MX = -3.8, MW = 13.4;             // speilets midte og bredde
const MZ = -24.9;                       // speilflata (mot veggen over vasken)
const sm = (t) => t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;
const cl = (t) => Math.max(0, Math.min(1, t));

// kveld: k = 1 er natt (dempet, kaldt lys, lite omgivelseslys), k = 0 er det vanlige dagslyset i brettet. Kalles hvert bilde (spillet kan sette lysene selv).
async function night(page, k = 1) {
  await page.evaluate((k) => {
    const g = window.__game, sc = g.scene, N = (window.__nt = window.__nt || {});
    if (N.exp === undefined) { N.exp = g.renderer.toneMappingExposure; N.env = sc.environmentIntensity; N.bg = sc.background && sc.background.getHex ? sc.background.getHex() : null; N.fog = sc.fog ? sc.fog.color.getHex() : null; }
    const lerpHex = (a, b, t) => { const r = (a >> 16 & 255) * (1 - t) + (b >> 16 & 255) * t, gg = (a >> 8 & 255) * (1 - t) + (b >> 8 & 255) * t, bb = (a & 255) * (1 - t) + (b & 255) * t; return (Math.round(r) << 16) | (Math.round(gg) << 8) | Math.round(bb); };
    sc.traverse((o) => {
      if (!o.isLight || o.userData.cineProp) return;
      if (o.userData.i0 === undefined) { o.userData.i0 = o.intensity; o.userData.c0 = o.color.getHex(); }
      const f = o.isAmbientLight || o.isHemisphereLight ? 0.55 : 0.28;
      o.intensity = o.userData.i0 * (1 - k + k * f); o.color.setHex(lerpHex(o.userData.c0, 0x9fb2e8, k));
    });
    if ('environmentIntensity' in sc && N.env !== undefined) sc.environmentIntensity = N.env * (1 - k) + 0.25 * k;
    g.renderer.toneMappingExposure = N.exp * (1 - k) + 0.62 * k;
    if (N.bg !== null) sc.background.setHex(lerpHex(N.bg, 0x0b1022, k));
    if (N.fog !== null) sc.fog.color.setHex(lerpHex(N.fog, 0x0b1022, k));
  }, k);
}

async function build(ctx, opts = {}) {
  const { page, cine } = ctx, P = cine.prop;
  await cine.seed(1);
  await night(page, 1);
  const h = Object.assign({}, HERO, opts.hero || {});
  await cine.setHero(h);
  await cine.heroScale(opts.scale || HS);
  await cine.step(2, 1 / 60); await cine.render();      // figuren får sin retning og pose (settes ved tegning) før speilbildet kopieres
  const ids = { all: [] };
  const add = async (o) => { const id = await P.add(o); ids.all.push(id); return id; };
  const box = (o) => add(Object.assign({ shape: 'box' }, o));
  // mørkt vindu (kveld) utenfor ruta i østveggen
  await box({ shape: 'plane', x: 26.36, y: 30.6, z: -14.8, sx: 11.6, sy: 12, ry: -Math.PI / 2, color: 0x0a1230, emissive: 0x0a1230 });
  // speil over vasken (blank flate + hvit ramme) og en varm lampe over det
  ids.mirror = await add({ shape: 'plane', x: MX, y: 27, z: MZ + 0.05, sx: MW, sy: 20, color: 0x8fa9c4, emissive: 0x1c2a3a });
  for (const [x, y, sx, sy] of [[MX, 37.2, MW + 0.8, 0.8], [MX, 16.9, MW + 0.8, 0.5], [MX - MW / 2 - 0.4, 27, 0.8, 20], [MX + MW / 2 + 0.4, 27, 0.8, 20]]) await box({ x, y, z: MZ + 0.25, sx, sy, sz: 0.5, color: 0xf2efe6 });
  ids.tint = await add({ shape: 'plane', x: MX, y: 27, z: MZ + 1.7, sx: MW, sy: 20, color: 0x4f78b8, opacity: 0.28 });      // blålig glassfilm foran speilbildet: gjør det til refleksjon
  ids.lamp = await P.add({ shape: 'light', x: -1.8, y: 40, z: -14, color: 0xffd9a0, intensity: 90, dist: 60 });
  // speilskapets åpne hyller (skapet står fra før i brettet; døra er åpen): mørk bakvegg, to hyller, flaske, tannkrem og plaster
  await box({ x: 6.3, y: 30.8, z: -21.72, sx: 4.8, sy: 15.6, sz: 0.2, color: 0x1d2530 });
  await box({ x: 6.3, y: 33.4, z: -21.1, sx: 4.8, sy: 0.35, sz: 1.5, color: 0xe9e7df });
  await box({ x: 6.3, y: 27.6, z: -21.1, sx: 4.8, sy: 0.35, sz: 1.5, color: 0xe9e7df });
  await add({ shape: 'cyl', x: 4.7, y: 28.95, z: -21.0, sx: 0.8, sy: 2.5, sz: 0.8, color: 0x2f6fd0 });                          // tannkrem
  await add({ shape: 'cyl', x: 4.7, y: 30.35, z: -21.0, sx: 0.7, sy: 0.4, sz: 0.7, color: 0xffffff });
  await box({ x: 5.9, y: 28.5, z: -21.0, sx: 1.6, sy: 1.5, sz: 1.0, color: 0xe5b99a });                                         // plasterboks
  await box({ x: 4.9, y: 34.5, z: -21.0, sx: 1.4, sy: 1.8, sz: 1.0, color: 0xcfd8dc });                                         // krukke på øvre hylle
  await box({ x: 7.4, y: 34.7, z: -21.0, sx: 1.0, sy: 2.2, sz: 1.0, color: 0xb0c4a8 });
  await add({ shape: 'cyl', x: 7.4, y: 29.2, z: -20.9, sx: 1.5, sy: 2.6, sz: 1.5, color: 0x9a5a1a });                           // den lille flaska som ikke hører hjemme
  await add({ shape: 'cyl', x: 7.4, y: 30.7, z: -20.9, sx: 1.2, sy: 0.5, sz: 1.2, color: 0xf3f3f3 });
  ids.note = await add({ shape: 'plane', x: 6.55, y: 29.15, z: -20.1, sx: 3.0, sy: 1.0, text: 'IKKE ta denne.', tbg: 0xfff2b0, tfg: 0x2a2a2a, rz: -0.06 });  // lappen
  // vannglass på vasken
  await add({ shape: 'cyl', x: -1.5, y: 18.1, z: -22.5, sx: 1.7, sy: 2.6, sz: 1.7, color: 0xbfe6ff, opacity: 0.45 });
  await add({ shape: 'cyl', x: -1.5, y: 17.7, z: -22.5, sx: 1.55, sy: 1.5, sz: 1.55, color: 0x7fc4ee, opacity: 0.6 });
  // tabletten (plasseres i hånda per bilde) og speilbildet (kopi av figuren; posisjon settes per bilde i reflect())
  ids.pill = await add({ shape: 'cyl', x: 0, y: -50, z: 0, sx: 0.9, sy: 0.35, sz: 0.9, color: 0xffffff, emissive: 0x555555 });
  ids.refl = await P.add({ shape: 'hero', ry: h.yaw, sx: 1, sy: 1, sz: -0.1 });
  return ids;
}

// Projiserer speilbildet inn på speilflata sett fra kameraet (cam = {x,y,z}); blink 0..1
async function reflect(ctx, ids, cam, blink = 0, h = HERO, scale = HS) {
  const vz = 2 * MZ - h.z, t = (MZ - cam.z) / (vz - cam.z);
  const px = cam.x + t * (h.x - cam.x), py = cam.y + t * (h.y - cam.y);
  const k = scale * t;
  await ctx.cine.prop.set(ids.refl, { x: px, y: py, z: MZ + 0.9, sx: k, sy: k, sz: -k * 0.12, blink, ry: h.yaw });
}

// Armen: overstyrer skulder (aR) og albue (eR) på høyrearmen i siden (spillets egen animasjon skriver ellers over). Verdier som i animateHero (aR: -1,6 = fram, -3 = rett opp).
async function forceArm(page, v) {
  await page.evaluate((v) => {
    const arm = window.__game.hero.armR;
    window.__armF = v;
    if (!arm.top.rotation.__patched) {
      const r = arm.top.rotation, orig = r.set.bind(r); r.set = (x, y, z) => { const f = window.__armF; if (f) orig(f.aR, f.yR || 0, -(f.zR || 0)); else orig(x, y, z); }; r.__patched = true;
      const m = arm.mid.rotation, d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(m), 'x');
      Object.defineProperty(m, 'x', { get() { return d.get.call(m); }, set(val) { const f = window.__armF; d.set.call(m, f && f.eR != null ? f.eR : val); } });
    }
  }, v);
}
// Håndflata (høyre hånd) i verden, fra forrige tegning: senter litt ut langs underarmen (+ side i håndas x-retning: side = -1/1)
async function handPos(page, side = 1) {
  return page.evaluate((side) => { const hd = window.__game.hero.armR.fingers.parent; hd.updateWorldMatrix(true, false); const e = hd.matrixWorld.elements, sc = Math.hypot(e[0], e[1], e[2]);
    const o = [e[12], e[13], e[14]], dn = [-e[4] / sc, -e[5] / sc, -e[6] / sc], lx = [e[0] / sc, e[1] / sc, e[2] / sc];
    return { x: o[0], y: o[1], z: o[2], px: o[0] + dn[0] * 0.055 * sc + lx[0] * 0.0 * side * sc, py: o[1] + dn[1] * 0.055 * sc + lx[1] * 0.0 * side * sc, pz: o[2] + dn[2] * 0.055 * sc + lx[2] * 0.0 * side * sc }; }, side);
}
// Tona alle props (utenom speilbildet) til 0..1 gjennomsiktighet; a = 1 er synlig
async function fadeProps(ctx, ids, a) {
  const P = ctx.cine.prop;
  for (const id of ids.all) await P.set(id, { opacity: id === ids.tint ? 0.28 * a : a });
  await P.set(ids.lamp, { intensity: 90 * a });
}

// valgfritt kamera fra miljøvariabel (utforsking): LT_CAM="x,y,z,tx,ty,tz,fov"
function envCam() { const v = process.env.LT_CAM; if (!v) return null; const a = v.split(',').map(Number); return { x: a[0], y: a[1], z: a[2], tx: a[3], ty: a[4], tz: a[5], fov: a[6] || 50 }; }

module.exports = { HS, HERO, S, END_CAM, MZ, sm, mix, cl, build, reflect, night, forceArm, handPos, fadeProps, envCam };
