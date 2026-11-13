// R44: zoom i byggeskjermen, ren logikk (ingen DOM, kan testes i node).
// Zoomgrenser, trinn for +/−, zoom mot et punkt (valgt del eller midten), dobbelttrykk, og rutenett/festeradius som blir
// finere jo mer du zoomer. Plasseringen er alltid et tall i verdens-enheter: samme verdi uansett zoom (fysikken ser aldri zoomen).

export const ZOOM_MIN = 6;          // px per enhet
export const ZOOM_MAX = 240;        // R44: opp fra 80
export const ZOOM_STEP = 1.5;       // ett trykk på + eller −
export const DBL_MS = 320;          // dobbelttrykk: maks tid mellom to trykk
export const DBL_PX = 32;           // ... og maks avstand
export const DBL_FACTOR = 2.5;      // dobbelttrykk zoomer inn så mye
export const FINE_FROM = [40, 80];  // skala (px per enhet) der rutenettet halveres første og andre gang
export const GRID_STEPS = [0.5, 0.25, 0.125];
export const ANCHOR_PX = 30;        // festepunkt fanger innenfor så mange px (og aldri mer enn SNAP_R enheter)

export const clampZoom = (s) => (Number.isFinite(s) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s)) : ZOOM_MIN);

// rutenettets trinn (enheter) ved en skala. fine = false: alltid grovt rutenett (innstilling).
export function gridForScale(scale, fine = true) {
  if (!fine) return GRID_STEPS[0];
  return scale >= FINE_FROM[1] ? GRID_STEPS[2] : scale >= FINE_FROM[0] ? GRID_STEPS[1] : GRID_STEPS[0];
}
// festepunktenes fangradius (enheter): krymper med zoom så presis plassering nær et festepunkt er mulig, men festepunktet selv er alltid eksakt
export const anchorRadius = (scale, maxR = 0.7) => Math.min(maxR, ANCHOR_PX / Math.max(1, scale));

// zoom slik at verdenspunktet under skjermpunktet (sx, sy) blir stående
export function zoomAbout(view, W, H, sx, sy, newScale) {
  const sc = clampZoom(newScale), oy = view.oy || 0;
  const u = view.cu + (sx - W / 2) / view.scale, v = view.cv - (sy - H / 2 - oy) / view.scale;
  return { ...view, scale: sc, cu: u - (sx - W / 2) / sc, cv: v + (sy - H / 2 - oy) / sc };
}
// zoom mot et verdenspunkt (valgt del) med en faktor; punktet blir stående der det er på skjermen
export function zoomToward(view, W, H, u, v, factor) {
  const sx = W / 2 + (u - view.cu) * view.scale, sy = H / 2 + (view.oy || 0) - (v - view.cv) * view.scale;
  return zoomAbout(view, W, H, sx, sy, view.scale * factor);
}
// midten av det frie området (der brettet ligger), i skjermkoordinater
export const freeCenter = (view, W, H) => ({ x: W / 2, y: H / 2 + (view.oy || 0) });

// + og −: mot valgt del (target = {u,v}) ellers mot midten
export function zoomStep(view, W, H, dir, target = null) {
  const f = dir > 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
  if (target) return zoomToward(view, W, H, target.u, target.v, f);
  const c = freeCenter(view, W, H); return zoomAbout(view, W, H, c.x, c.y, view.scale * f);
}

export const isDoubleTap = (last, cur, { ms = DBL_MS, px = DBL_PX } = {}) => !!last && cur.t - last.t <= ms && cur.t >= last.t && Math.hypot(cur.x - last.x, cur.y - last.y) <= px;
// dobbelttrykk: er man allerede innzoomet (merkbart over «tilpass») går man tilbake til hele byggeplassen, ellers inn mot punktet
export function dblTapView(view, fit, W, H, x, y) {
  if (view.scale > fit.scale * 1.4) return { ...fit };
  return zoomAbout(view, W, H, x, y, view.scale * DBL_FACTOR);
}
export const zoomLabel = (view, fit) => `×${(view.scale / fit.scale).toFixed(1)}`;
