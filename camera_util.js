// Rene kamerahjelpere (ingen DOM) så de kan testes i node.

const wrap = (a) => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
export const angleDiff = (from, to) => wrap(to - from);

// Mario-stil: kameraet svinger rolig bak figuren når du går bort fra det. Går du mot kameraet (mer enn ca. 100° unna) stiller det seg ikke om.
// yaw: kameraets retning (blikk = (−sin yaw, −cos yaw)), (vx,vz): figurens fart, speed0: toppfart. Returnerer ny yaw.
export function followYaw(yaw, vx, vz, speed0, dt, opt = {}) {
  const sp = Math.hypot(vx, vz), min = opt.minSpeed ?? 0.8, rate = opt.rate ?? 1.4, maxAngle = opt.maxAngle ?? 1.75;
  if (sp < min) return yaw;
  const d = angleDiff(yaw, Math.atan2(-vx, -vz)), ad = Math.abs(d);
  if (ad < 0.05 || ad > maxAngle) return yaw;                       // allerede bak figuren, eller du går mot kameraet
  const gain = Math.min(1, sp / speed0), cap = (ad < 0.9 ? 0.8 : 0.45) * gain;   // aldri raskere enn dette (rad/s): går du rett til siden blir det en rolig bue, ikke en snurr
  const step = Math.max(-cap * dt, Math.min(cap * dt, d * rate * gain * dt));
  return yaw + step;
}

// Landingsfart hvis du faller fra høyde h med vertikal fart vy (g negativ). Myke flater tar bare softFactor av den.
export const impactSpeed = (vy, h, g) => Math.sqrt(Math.max(0, vy * vy + 2 * Math.abs(g) * Math.max(0, h)));
// Farge på landingsmarkøren: 'ok' (tåler det), 'hard' (bedøvet), 'knock' (tilbake til lagringspunkt)
export const landingClass = (v, hardLand, knockV) => (v >= knockV ? 'knock' : v >= hardLand ? 'hard' : 'ok');
