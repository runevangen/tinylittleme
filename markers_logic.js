// Flagg og mål (R11): ren logikk (testes i node). Tegningen står i markers.js.
export const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Tenning av lagringsflagget: `lit` er 0..1 (glød), `burst` er et kort oppblink når flagget tennes.
export function createFlagState() {
  const s = { lit: 0, target: 0, burst: 0 };
  return {
    s,
    ignite(quiet = false) { s.target = 1; if (quiet) s.lit = 1; else s.burst = 1; },
    extinguish() { s.target = 0; s.lit = 0; s.burst = 0; },
    update(dt) {
      s.lit += (s.target - s.lit) * clamp01(dt * 3.5);
      s.burst = Math.max(0, s.burst - dt / 1.1);
      return { lit: s.lit, burst: s.burst, glow: 0.12 + 0.88 * s.lit + 0.9 * s.burst };
    },
  };
}
// Myk puls (0..1) for målringen/fyret.
export const pulse = (t, speed = 2.2) => 0.5 + 0.5 * Math.sin(t * speed);
// Bølge i flagget: utslag i z for et punkt x (0 ved stanga, 1 ytterst), tid t.
export const clothWave = (x, y, t, amp = 0.07) => Math.sin(x * 7 - t * 4.2 + y * 2.5) * amp * x * x + Math.sin(t * 1.3) * 0.02 * x;
