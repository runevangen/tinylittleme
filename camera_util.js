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
  const far = Math.min(1, Math.max(0, (sep - 3) / 6));            // 0 tett inntil, 1 på 9 m eller mer
  const near = 1 - far;
  return {
    on: true, sep,
    shift: 0.42 * far,                                           // fokus mot midtpunktet så begge er i bildet
    dist: Math.min(9, sep * 0.55) * far + 3.2 * near,            // langt: trekk ut; tett: trekk ut og opp så sjefen ikke fyller skjermen
    pitch: 0.2 * far + 0.48 * near,
    yaw: (mode === 'windup' || mode === 'charge' || mode === 'stunned') && sep > 4 ? Math.atan2(-dx, -dz) : null,   // under varsling: se mot sjefen
  };
}
