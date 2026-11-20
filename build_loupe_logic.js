// R106: hjørneglass i byggeskjermen, ren logikk (ingen DOM, kan testes i node).
// Fingeren dekker stedet du plasserer på. Mens en finger gjør en plasserende handling vises et rundt glass i et hjørne
// (motsatt side av fingeren) med et utsnitt av byggetegningen rundt fingerpunktet, forstørret 2×/3×/4×.
// Glasset er en kopi av byggecanvaset (drawImage), ingen ny scene. Visningen ligger i build_loupe_view.js.

export const LOUPE = {
  size: 112,         // diameter (px), stående
  sizeLand: 96,      // diameter (px), liggende
  textH: 20,         // linjen under glasset (px)
  holdMs: 300,       // finger holdt stille på et tomt punkt (rutenett) før glasset vises
  hideMs: 150,       // glasset forsvinner så lenge etter at fingeren slippes
  hystMs: 400,       // glasset bytter ikke hjørne oftere enn dette
  margin: 8,         // avstand til skjermkant og mellom glass og annet
  zooms: [2, 3, 4],
  defZoom: 3,
};

export const normZoom = (v) => { const n = Math.round(+v); return LOUPE.zooms.includes(n) ? n : LOUPE.defZoom; };
export const glassSize = (W, H) => Math.max(64, Math.min(H <= 520 ? LOUPE.sizeLand : LOUPE.size, W - 2 * LOUPE.margin, H - 2 * LOUPE.margin));

// utsnittet av canvaset (CSS-px) rundt (px, py): kvadrat med side size/zoom, holdt inne i [0,W]×[0,H].
// fx, fy: hvor fingerpunktet ligger i glasset (0..1; 0,5 midt i glasset, ellers forskjøvet når utsnittet er skjøvet inn mot kanten)
export function sourceRect(px, py, size, zoom, W, H, out = {}) {   // out: valgfritt objekt som gjenbrukes (ingen allokering per bilde)
  const z = normZoom(zoom), s = Math.min(size / z, W, H);
  const sx = Math.min(Math.max(0, px - s / 2), Math.max(0, W - s)), sy = Math.min(Math.max(0, py - s / 2), Math.max(0, H - s));
  out.sx = sx; out.sy = sy; out.sw = s; out.sh = s; out.fx = (px - sx) / s; out.fy = (py - sy) / s; out.zoom = z; return out;
}
// et punkt i canvaset -> plass i glasset (0..1), eller null når det ligger utenfor utsnittet
export function toGlass(rect, x, y) {
  const fx = (x - rect.sx) / rect.sw, fy = (y - rect.sy) / rect.sh;
  return fx < 0 || fx > 1 || fy < 0 || fy > 1 ? null : { fx, fy };
}

const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
export const rectsOverlap = hit;

// hjørnet motsatt fingeren: finger i venstre halvdel -> glass til høyre, ellers til venstre. Bytter ikke oftere enn hystMs
// (unntatt når fingeren ville havnet under glasset: da byttes det med en gang). prev = { side, t } eller null.
export function chooseSide(prev, fx, W, now, rect = null) {
  const want = fx < W / 2 ? 'right' : 'left';
  if (!prev) return { side: want, t: now };
  if (want === prev.side) return prev;
  const under = !!rect && fx >= rect.x - LOUPE.margin && fx <= rect.x + rect.w + LOUPE.margin;
  return under || now - prev.t >= LOUPE.hystMs ? { side: want, t: now } : prev;
}

// plass til glasset (med linjen under): fast øverst, under topplinjen, i byggeområdet mellom sidepanelene.
// avoid: rektangler som glasset ikke skal dekke (zoomknapper, målflagg). Havner glasset på en slik, skyves det ned under den;
// får det ikke plass, prøves det andre hjørnet. Gir { side, x, y, w, h } (w = size).
export function placeGlass({ side, W, H, size, top, bottom, insetL = 0, insetR = 0, avoid = [] }) {
  const m = LOUPE.margin, h = size + LOUPE.textH, bot = (bottom ?? H) - m;
  const at = (sd) => {
    const x = sd === 'right' ? W - insetR - m - size : insetL + m;
    let y = top + m, tries = 0;
    for (; tries < 6; tries++) { const r = { x, y, w: size, h }; const b = avoid.find((a) => hit(r, a)); if (!b) break; y = b.y + b.h + m; }
    const r = { x, y, w: size, h };
    return { side: sd, x, y, w: size, h, fits: y + h <= bot && !avoid.some((a) => hit(r, a)) };
  };
  const first = at(side), second = at(side === 'right' ? 'left' : 'right');
  return first.fits || !second.fits ? first : second;
}

// synlighet: vises mens fingeren plasserer, og hideMs etter at den slapp. aldri når enabled er av (f.eks. under PRØV).
export function createVisibility() {
  let last = -Infinity, vis = false;
  return {
    update(now, placing, enabled = true) {
      if (!enabled) { vis = false; last = -Infinity; return false; }
      if (placing) { last = now; vis = true; return true; }
      vis = now - last <= LOUPE.hideMs; return vis;
    },
    get visible() { return vis; },
    reset() { last = -Infinity; vis = false; },
  };
}

// holder fingeren stille på et tomt punkt lenge nok? (t0: tidspunktet fingeren kom ned)
export const holdReached = (t0, now, still = true) => !!still && t0 != null && now - t0 >= LOUPE.holdMs;

// skal glasset vises akkurat nå? (ren regel; build.js leverer tilstanden)
export const wantsLoupe = ({ on = true, sim = false, fingers = 1, placing = false } = {}) => !!on && !sim && fingers === 1 && !!placing;

// linja under glasset: lengde/koordinater i rutenett (samme tekst som ellers) eller kort tekst for klassiske deler
export const partLine = (T, s, u, v) => (s && s.anchored ? T('loupe.anchor') : T('loupe.pos', { m: String(+u.toFixed(2)).replace('.', ','), n: String(+v.toFixed(2)).replace('.', ',') }));
