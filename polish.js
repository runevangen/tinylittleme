// Figur-polering (R10): ren logikk uten three.js, så den kan testes.
//  - stepOffset: fothøyde over/under standflaten (føtter som tilpasser seg trinn)
//  - createReact: korte reaksjoner på maur: glede + sprett når du knuser en, sammenkrøping/rykk når en maur støter deg
//  - hangSway: heng og sving: kroppen og bena henger og svinger med bevegelsen
//  - fpsWatch: måler bilder per sekund og sier fra når en telefon sliter
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (x) => x * x * (3 - 2 * x);

// høyde (verdensrom) fra standflaten til det foten treffer; null (ingen flate) gir 0. Begrenset så beinet ikke strekkes.
export function stepOffset(surfaceTop, baseY, up = 0.28, down = 0.1) {
  if (surfaceTop == null || !Number.isFinite(surfaceTop)) return 0;
  return clamp(surfaceTop - baseY, -down, up);
}

// reaksjoner: trigger('stomp'|'hurt'), update(dt) gir verdier som main.js legger oppå posen
export function createReact() {
  const s = { kind: '', t: 0, dur: 0 };
  const out = { sy: 1, sxz: 1, hop: 0, armsUp: 0, lean: 0, crouch: 0, flinch: 0, spin: 0, active: false };
  return {
    out,
    trigger(kind) {
      if (kind === 'stomp') { s.kind = 'stomp'; s.t = 0; s.dur = 0.9; }
      else if (kind === 'hurt') { s.kind = 'hurt'; s.t = 0; s.dur = 0.8; }
    },
    update(dt) {
      s.t += dt;
      const u = s.kind ? clamp(s.t / s.dur, 0, 1) : 1;
      Object.assign(out, { sy: 1, sxz: 1, hop: 0, armsUp: 0, lean: 0, crouch: 0, flinch: 0, spin: 0, active: false });
      if (!s.kind || u >= 1) { s.kind = ''; return out; }
      out.active = true;
      if (s.kind === 'stomp') {
        const strech = Math.sin(clamp(u / 0.3, 0, 1) * Math.PI);                  // strekk i oppsprettet
        const land = u > 0.55 ? Math.sin(clamp((u - 0.55) / 0.3, 0, 1) * Math.PI) : 0;   // klem ved neste landing
        out.sy = 1 + 0.16 * strech - 0.2 * land; out.sxz = 1 - 0.08 * strech + 0.12 * land;
        out.armsUp = smooth(clamp(u / 0.15, 0, 1)) * (1 - smooth(clamp((u - 0.7) / 0.3, 0, 1)));
        out.hop = 0.2 * Math.sin(clamp(u / 0.45, 0, 1) * Math.PI);   // tydelig sprett (ca. 20 cm) som på en trampoline
        out.spin = 0.5 * Math.sin(u * Math.PI * 2) * (1 - u);                      // lite jubel-vrid i overkroppen
      } else {
        const hit = Math.exp(-u * 5);                                              // rykk med en gang, så demper det
        out.flinch = hit; out.lean = -0.5 * hit; out.crouch = 0.6 * hit;
        out.sy = 1 - 0.12 * hit; out.sxz = 1 + 0.07 * hit;
        out.spin = 0.35 * Math.sin(u * Math.PI * 7) * (1 - u);                     // rister på hodet
      }
      return out;
    },
  };
}

// heng/sving: bena dingler og kroppen vugger med sidefarten. vlat = fart langs kanten, sec = tid
export function hangSway(sec, vlat, swinging = false) {
  const k = clamp(vlat / 2.5, -1, 1), w = Math.sin(sec * 1.5);
  const amp = swinging ? 0.35 : 0.1;
  return { legL: 0.12 + w * amp - 0.25 * Math.abs(k), legR: 0.22 - w * amp - 0.25 * Math.abs(k), kneeL: 0.3 + 0.3 * Math.abs(k), kneeR: 0.15 + 0.3 * Math.abs(k), roll: -0.1 * k, lean: w * 0.03 };
}

// FPS-måler: mate med bildetid i ms; hvert intervall rapporteres snitt. low = under grensen.
export function fpsWatch(limit = 30, interval = 3000) {
  let sum = 0, n = 0, worst = 0, lowRuns = 0;
  return {
    push(ms) {
      if (!(ms > 0 && ms < 2000)) return null;
      sum += ms; n++; worst = Math.max(worst, ms);
      if (sum < interval) return null;
      const fps = 1000 * n / sum, r = { fps, worst, low: fps < limit, lowRuns: 0 };
      lowRuns = r.low ? lowRuns + 1 : 0; r.lowRuns = lowRuns; sum = n = worst = 0; return r;
    },
  };
}
