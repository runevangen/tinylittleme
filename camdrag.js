// R59: kameradreining med høyre tommel. Rene hjelpere (ingen DOM) så de kan testes i node.
// Årsak (reprodusert i Playwright): en dra som starter på HOPP/GREP/TA (inkl. kantfeltet rundt dem) eller på toppbåndet havnet på det elementet og nådde aldri canvas,
// så kameraet sto stille. Her får slike dra gå videre til kameraet, og kantfeltet rundt knappene (utenfor selve sirkelen) teller som bilde, ikke knapp.

export const CAM_SLOP = 8;            // px før en dra fra en knapp/et bånd regnes som kameradra (ellers er det et trykk)
export const TAP_MS = 350;            // et kantfelt-trykk som slippes raskere enn dette og ikke har flyttet seg, blir et vanlig knappetrykk

// Er (x,y) innenfor selve sirkelen til knappen? rect = getBoundingClientRect(), shrink = px som trekkes av radius (tydelig trykkflate).
export function inCore(x, y, rect, shrink = 0) {
  const r = Math.min(rect.width, rect.height) / 2 - shrink, cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  return Math.hypot(x - cx, y - cy) <= r;
}

// Holder styr på pekere som startet på en knapp/et bånd og kan bli kameradra. Alt uten DOM.
export class Relay {
  constructor(slop = CAM_SLOP) { this.slop = slop; this.map = new Map(); }
  has(id) { return this.map.has(id); }
  get size() { return this.map.size; }
  // src: 'knapp' | 'kant' | 'bånd'; tap: valgfri funksjon som kjøres om kantfeltet bare ble trykket
  start(id, x, y, t, src, tap = null) { this.map.set(id, { x, y, x0: x, y0: y, t0: t, src, tap, drag: false }); }
  // Returnerer null (ikke dra ennå / ukjent) eller { dx, dy, first, src } der dx/dy er pikslene siden sist.
  move(id, x, y) {
    const p = this.map.get(id); if (!p) return null;
    if (!p.drag) {
      if (Math.hypot(x - p.x0, y - p.y0) < this.slop) return null;
      p.drag = true; const dx = x - p.x0, dy = y - p.y0; p.x = x; p.y = y; return { dx, dy, first: true, src: p.src };
    }
    const dx = x - p.x, dy = y - p.y; p.x = x; p.y = y; return { dx, dy, first: false, src: p.src };
  }
  // Returnerer { tap, src, fn } når pekeren slippes (tap: kort trykk uten dra), eller null om den ikke var med.
  end(id, t) {
    const p = this.map.get(id); if (!p) return null; this.map.delete(id);
    return { tap: !p.drag && t - p.t0 < TAP_MS, src: p.src, fn: p.tap, dragged: p.drag };
  }
  clear() { this.map.clear(); }
}

// Gir kameradreining for en dra (piksler) som hastighet i radianer: samme formel overalt (canvas, knapper, bånd).
export const yawDelta = (dx, camSens, mouseSens = 1) => dx * mouseSens * 0.006 * camSens;
export const pitchDelta = (dy, camSens, invY, mouseSens = 1) => dy * mouseSens * 0.005 * camSens * (invY ? -1 : 1);

// Hint første gang: bare på berøring, i spill, etter `after` sekunder uten noen sveip, og bare én gang.
export const shouldHintDrag = (o) => !!o.touch && o.play && !o.shown && o.swipes === 0 && o.t >= (o.after ?? 25);
