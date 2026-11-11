// Rene kamerahjelpere (ingen DOM) så de kan testes i node.

const wrap = (a) => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
export const angleDiff = (from, to) => wrap(to - from);

// Mario-stil: kameraet svinger rolig bak figuren når du går bort fra det. Går du mot kameraet (mer enn ca. 100° unna) stiller det seg ikke om.
// yaw: kameraets retning (blikk = (−sin yaw, −cos yaw)), (vx,vz): figurens fart, speed0: toppfart. Returnerer ny yaw.
export function followYaw(yaw, vx, vz, speed0, dt, opt = {}) {
  const sp = Math.hypot(vx, vz), min = opt.minSpeed ?? 0.8, rate = (opt.rate ?? 1.4) * (opt.rateScale ?? 1), maxAngle = opt.maxAngle ?? 1.75;
  if (sp < min) return yaw;
  const d = angleDiff(yaw, Math.atan2(-vx, -vz)), ad = Math.abs(d);
  if (ad < 0.05 || ad > maxAngle) return yaw;                       // allerede bak figuren, eller du går mot kameraet
  const gain = Math.min(1, sp / speed0), cap = (ad < 0.9 ? 0.8 : 0.45) * gain * (opt.capScale ?? 1);   // aldri raskere enn dette (rad/s): går du rett til siden blir det en rolig bue, ikke en snurr
  const step = Math.max(-cap * dt, Math.min(cap * dt, d * rate * gain * dt));
  return yaw + step;
}

// Landingsfart hvis du faller fra høyde h med vertikal fart vy (g negativ). Myke flater tar bare softFactor av den.
export const impactSpeed = (vy, h, g) => Math.sqrt(Math.max(0, vy * vy + 2 * Math.abs(g) * Math.max(0, h)));
// Farge på landingsmarkøren: 'ok' (tåler det), 'hard' (bedøvet), 'knock' (tilbake til lagringspunkt)
export const landingClass = (v, hardLand, knockV) => (v >= knockV ? 'knock' : v >= hardLand ? 'hard' : 'ok');

// Sjef-kamera (R9): holder både figur og sjef i bildet når sjefen kjemper, og løfter kameraet over sjefen når du står tett inntil.
// Returnerer { on, shift (andel av vektoren figur->sjef som kameraets fokus flyttes), dist (ekstra avstand), pitch (ekstra vinkel), yaw (ønsket retning eller null) }.
const FRAME_MODES = ['windup', 'charge', 'stunned', 'hit', 'tired'];
export function bossFrame(px, pz, bx, bz, mode) {
  const dx = bx - px, dz = bz - pz, sep = Math.hypot(dx, dz);
  if (!FRAME_MODES.includes(mode) || sep > 30) return { on: false, shift: 0, dist: 0, pitch: 0, yaw: null, sep };
  const far = Math.min(1, Math.max(0, (sep - 2) / 2));            // 0 tett inntil (ryggen), 1 på 4 m eller mer
  const near = 1 - far, mid = Math.min(1, Math.max(0, (sep - 6) / 2));   // mid: 0 til 6 m, 1 fra 8 m (flatere og lengre unna)
  // Sjefen er ca. 6,8 m høy med krone og antenner. Kameraet går høyt og trekker ut så hele sjefen havner under HUD-baren og varselstripen øverst (ca. 140 px på iPhone),
  // mens figuren blir under midten, utenfor ◎-knappen (verdiene er funnet med rutenett-søk og sjekkes projisert i test_bosscam.mjs).
  return {
    on: true, sep,
    shift: 0.75 * far * (1 - 0.5 * Math.min(1, Math.max(0, (sep - 14) / 14))),      // fokus mot sjefen så begge er i bildet
    dist: 5.5 * near + far * Math.min(25, 13.5 + 1.3 * (sep - 3)),
    pitch: 0.55 * near + far * (0.85 - 0.5 * mid),
    yaw: sep > 1.5 ? Math.atan2(-dx, -dz) : null,                 // kameraet bak figuren med blikk mot sjefen (figuren står da alltid foran sjefen, aldri skjult bak den)
  };
}

// Glatter og styrer sjef-kameraet ett steg. s = { k, shift, dist, pitch, ox, oz } (muteres), f = bossFrame(...), B = {x,z} eller null, p = {x,z}.
// Fokus flyttes bare så mye som kameraet allerede ser mot sjefen (ellers havner figuren utenfor bildet i smalt portrettformat), og yaw dreies raskt nok til å rekke varselet.
// Returnerer ny yaw.
export const BOSS_YAW_RATE = 5, BOSS_ALIGN = 0.5;
export function bossCamStep(s, f, B, p, yaw, dt, play = true) {
  const kb = 1 - Math.pow(f.on ? 0.05 : 0.15, dt);
  s.k += ((f.on ? 1 : 0) - s.k) * kb; s.shift += (f.shift - s.shift) * kb; s.dist += (f.dist - s.dist) * kb; s.pitch += (f.pitch - s.pitch) * kb;
  if (f.yaw !== null && play) { const d = angleDiff(yaw, f.yaw); yaw += Math.max(-BOSS_YAW_RATE * dt, Math.min(BOSS_YAW_RATE * dt, d * 8 * dt)); }
  if (f.on && B) {
    const align = f.yaw === null ? 1 : Math.max(0, 1 - Math.abs(angleDiff(yaw, f.yaw)) / BOSS_ALIGN);
    const dx = B.x - p.x, dz = B.z - p.z, len = Math.hypot(dx, dz) || 1, m = Math.min(len * s.shift, 7) * align / len;   // aldri mer enn 7 m
    s.ox = dx * m; s.oz = dz * m;
  } else { s.ox *= 1 - kb; s.oz *= 1 - kb; }
  return yaw;
}

// Figur-anker (R9): etter at kameraposisjonen er endelig (vegger kan ha dratt det tett inn), flytt blikkpunktet loddrett så figuren havner innenfor [lo, hi] i bildet
// (NDC y, -1 nederst). Det hindrer at figuren havner under stikke/knappene eller bak sjefen når kameraet ikke får full avstand.
// cam = [x,y,z], look = [x,y,z] (blikkpunkt), hero = [x,y,z]. Returnerer nytt blikkpunkt (samme retning sideveis, bare dreid opp/ned).
export function anchorLook(cam, look, hero, fovDeg, lo, hi) {
  const lx = look[0] - cam[0], ly = look[1] - cam[1], lz = look[2] - cam[2], lh = Math.hypot(lx, lz), len = Math.hypot(lx, ly, lz);
  const hx = hero[0] - cam[0], hy = hero[1] - cam[1], hz = hero[2] - cam[2], hh = Math.hypot(hx, hz);
  if (lh < 1e-6 || hh < 1e-6) return look;
  const a0 = Math.atan2(ly, lh), ah = Math.atan2(hy, hh), th = Math.tan(fovDeg * Math.PI / 360);
  const ndc = Math.tan(ah - a0) / th, want = Math.max(lo, Math.min(hi, ndc));
  if (want === ndc) return look;
  const a1 = ah - Math.atan(want * th);
  return [cam[0] + lx / lh * Math.cos(a1) * len, cam[1] + Math.sin(a1) * len, cam[2] + lz / lh * Math.cos(a1) * len];
}
// Sidestilling (R9): flytt blikkpunktet sidelengs så figuren havner på NDC x = xt (litt til venstre for midten, så den ikke havner ved ◎-knappen som sitter høyre for midten).
// Små vinkler, så en flat forskyvning av blikkpunktet holder; maks `maxS` NDC så kameraet aldri svinger voldsomt. aspect = bredde/høyde.
export function shiftLookX(cam, look, hero, fovDeg, aspect, xt, maxS = 0.15) {
  const fx = look[0] - cam[0], fy = look[1] - cam[1], fz = look[2] - cam[2], fl = Math.hypot(fx, fy, fz), fh = Math.hypot(fx, fz);
  if (fl < 1e-6 || fh < 1e-6) return look;
  const f = [fx / fl, fy / fl, fz / fl], r = [-fz / fh, 0, fx / fh], th = Math.tan(fovDeg * Math.PI / 360) * aspect;
  const v = [hero[0] - cam[0], hero[1] - cam[1], hero[2] - cam[2]], z = v[0] * f[0] + v[1] * f[1] + v[2] * f[2];
  if (z < 0.1) return look;
  const x0 = (v[0] * r[0] + v[2] * r[2]) / z / th, s = Math.max(-maxS, Math.min(maxS, x0 - xt)) * fl * th;   // look flyttes mot høyre => figuren går mot venstre
  return [look[0] + r[0] * s, look[1], look[2] + r[2] * s];
}
export const BOSS_HERO_X = -0.05;
export const BOSS_HERO_Y = [-0.26, 0.22];   // trygg skjermsone for figuren under sjefkamp (NDC y): over stikke/TA/HOPP/GREP/Tilbake nederst, under helsebar og varselstripe øverst
