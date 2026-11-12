// R34: sprettboksen kaster figuren. Ren logikk (uten three.js): står figuren på boksen når den popper, får han et kast opp og litt bort
// fra boksens midte, en kort «uskadd»-tid (ingen hard landing / knockout fra selve kastet) og en pause før et nytt kast.
// Verdiene ligger i KICK og kan justeres i ⚙ (admin). main.js kaller tryKick ved toy-hendelsen `pop` og tickKick hvert bilde.

export const KICK = {
  on: true,
  speed: 5.5,    // enheter/s bort fra boksen (vannrett)
  up: 11,        // enheter/s opp (til sammenligning: vanlig hopp er ca. 12)
  safeT: 1.6,    // sekunder uten hard landing / knockout etter kastet
  cool: 1.0,     // sekunder før boksen kan kaste igjen
  lock: 0.3,     // sekunder uten styring så farten ikke dempes med en gang
  maxSpeed: 9,   // tak på vannrett fart, så ingen kastes urettferdig langt
};

const ctr = (b) => [(b.min[0] + b.max[0]) / 2, (b.min[2] + b.max[2]) / 2];

// Står figuren på denne boksen? (Bare da kastes han.)
export function standsOn(p, b) { return !!p && !!b && p.groundBox === b && !!p.onGround; }

// Kastvektor: retning fra boksens midte til figuren (vannrett), normalisert. Står han midt på, kastes han i blikkretningen.
// Returnerer { vx, vy, vz, dx, dz, dist } der dist er avstanden fra boksens midte (til test/logg).
export function kickVector(b, p, cfg = KICK) {
  const [cx, cz] = ctr(b);
  let dx = p.x - cx, dz = p.z - cz; const dist = Math.hypot(dx, dz);
  if (dist < 0.15) { const fl = Math.hypot(p.fx || 0, p.fz || 0); dx = fl > 1e-6 ? p.fx / fl : 0; dz = fl > 1e-6 ? p.fz / fl : 1; }
  else { dx /= dist; dz /= dist; }
  const sp = Math.max(0, Math.min(cfg.speed, cfg.maxSpeed));
  return { vx: dx * sp, vy: Math.max(0, cfg.up), vz: dz * sp, dx, dz, dist };
}

// Kaster figuren hvis han står på boksen, kast er på og pausen har gått. Returnerer kastvektoren, ellers null.
export function tryKick(p, b, cfg = KICK) {
  if (!cfg.on || !standsOn(p, b) || (p.kickCd || 0) > 0) return null;
  const k = kickVector(b, p, cfg);
  p.vx = k.vx; p.vz = k.vz; p.vy = k.vy;
  p.onGround = false; p.groundBox = null; p.state = 'air'; p.jumping = false; p.coyote = 0; p.landT = 9;
  p.lock = Math.max(p.lock || 0, cfg.lock); p.fx = k.dx; p.fz = k.dz;
  p.safeT = cfg.safeT; p.kickCd = cfg.cool;
  return k;
}

// Teller ned uskadd-tid og pause (physics.js teller ikke ned safeT selv, så tickKick må kalles hvert bilde).
export function tickKick(p, dt) {
  if (p.safeT > 0) p.safeT = Math.max(0, p.safeT - dt);
  if (p.kickCd > 0) p.kickCd = Math.max(0, p.kickCd - dt);
}
