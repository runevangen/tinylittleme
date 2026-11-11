// R20: kart og kompass. Ren logikk (ingen DOM/three) så den kan testes i node (test_overview.mjs). Tegningen står i overview.js.
// Verdenskoordinater: x, z i gulvplanet (1 enhet = 5 cm). Kameraets yaw: blikk = (-sin yaw, -cos yaw), høyre = (cos yaw, -sin yaw).

// Plassering og størrelse (CSS-piksler) for minikartet: stående øverst til venstre under HUD-en og kompassbobla; liggende under kompassbobla og høyre for stikka. Alltid utenfor stikka og knappene.
export function miniLayout(vw, vh) {
  const land = vw > vh;
  return land ? { size: 76, left: 200, top: 112 } : { size: 100, left: 12, top: 168 };   // liggende: under kompassbobla, høyre for stikka
}

// Rotert slik at kameraets blikkretning peker opp på kartet: u = mot høyre, v = frem, sett fra (cx, cz).
export function relPoint(x, z, cx, cz, yaw) {
  const dx = x - cx, dz = z - cz, s = Math.sin(yaw), c = Math.cos(yaw);
  return { u: dx * c - dz * s, v: -dx * s - dz * c };
}

// Kartskala: hele rommet er alltid innenfor sirkelen, uansett rotasjon (radius = halve diagonalen).
export function mapScale(room, size) {
  const hw = (room.x1 - room.x0) / 2, hd = (room.z1 - room.z0) / 2, R = Math.hypot(hw, hd) || 1;
  return (size / 2 - 4) / R;
}

// Verdenspunkt -> kartpunkt i piksler (0..size). Kartet er sentrert på rommet, så mål og flagg ligger stille mens figuren og retningen flytter seg.
export function toMap(x, z, room, size, yaw) {
  const cx = (room.x0 + room.x1) / 2, cz = (room.z0 + room.z1) / 2, k = mapScale(room, size), r = relPoint(x, z, cx, cz, yaw);
  return { x: size / 2 + r.u * k, y: size / 2 - r.v * k };
}

// Prikker for kart og oversikt: uoppdagede smuler, lagringsflagg (bare når et lagringspunkt er tatt), mål og figuren (sist = øverst).
export function mapDots({ goal, save, saves = 0, crumbs = [], player, crumbsOn = true }) {
  const d = [];
  if (crumbsOn) for (const c of crumbs) if (!c.got) d.push({ kind: 'crumb', x: c.x, y: c.y, z: c.z, id: c.id });
  if (save && saves > 0) d.push({ kind: 'flag', x: save[0], y: save[1], z: save[2] });
  if (goal) d.push({ kind: 'goal', x: goal[0], y: goal[1], z: goal[2] });
  if (player) d.push({ kind: 'hero', x: player.x, y: player.y, z: player.z });
  return d;
}

// Oversiktskamera: rett over rommet (litt skrå, så «opp» på skjermen er bakover i rommet) med hele rommet i bildet i stående og liggende format.
// aspect = bredde/høyde, fovDeg = loddrett synsfelt. Gir posisjon og blikkpunkt; yaw = 0 (nord opp).
export function overviewCam(room, aspect, fovDeg) {
  const cx = (room.x0 + room.x1) / 2, cz = (room.z0 + room.z1) / 2, hw = (room.x1 - room.x0) / 2, hd = (room.z1 - room.z0) / 2;
  const th = Math.tan(fovDeg * Math.PI / 360), tw = th * aspect;
  const top = (room.height || 40) * 0.85;                                         // mål og hyller står høyt over gulvet og kommer nærmere kameraet, så høyden regnes med
  const h = top + Math.max(hw / (tw * 0.92), hd / (th * 0.88));                  // litt luft: oversikten holdes unna HUD øverst og knappene nederst
  return { pos: [cx, h, cz + h * 0.1], look: [cx, 0, cz - h * 0.04], height: h };
}

// Tidslinje for oversikten: opp, hold (3 sekunder), ned. t = sekunder siden start; skipAt = tidspunkt for avbrudd (trykk), ellers null.
export const OV = { rise: 0.55, hold: 3, fall: 0.55 };
const ease = (x) => x * x * (3 - 2 * x);
const raw = (t) => (t < 0 || t >= OV.rise + OV.hold + OV.fall ? 0 : t < OV.rise ? ease(t / OV.rise) : t < OV.rise + OV.hold ? 1 : ease(1 - (t - OV.rise - OV.hold) / OV.fall));
// 0 = vanlig kamera, 1 = oversikt. Ved avbrudd synker den derfra den var, så kameraet aldri hopper.
export function ovBlend(t, skipAt = null) {
  if (skipAt === null || t <= skipAt) return raw(t);
  return Math.max(0, raw(skipAt) * (1 - (t - skipAt) / OV.fall));
}
export const ovDone = (t, skipAt = null) => (skipAt === null ? t >= OV.rise + OV.hold + OV.fall : t >= skipAt + OV.fall);
// Prikkene vises mens kameraet er oppe eller nesten oppe.
export const ovDotsAlpha = (k) => Math.max(0, Math.min(1, (k - 0.5) * 2));

// Kan oversikten starte nå? Bare i vanlig spillmodus, på bakken, uten sjefkamp, uten åpen meny og ikke midt i en annen oversikt.
export const canOverview = ({ play, won, menu, onGround, boss, active }) => !!play && !won && !menu && !!onGround && !boss && !active;
