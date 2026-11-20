// R109: berøringstilstanden i byggeskjermen (ren logikk, kjøres i node: test_buildtouch.mjs).
// Fra Rune (iPhone): etter å ha satt ut en del gikk den ikke an å vri, ⚑ virket ikke, tekster lå over hverandre og skjermen var treg.
// Her ligger tilstandsmaskinen som sørger for at ingenting blir hengende (drag/gest/ptrs/pointer capture), regler for den faste ↺ ↻ ✕-raden,
// plasseringen av tekstlinjene (ingen overlapp) og en enkel teller for DOM-skrivinger (budsjettsjekk).

// hva henger igjen? s = { drag, gest, ptrs (antall), capture } → liste med navn (tom = rent)
export const hanging = (s = {}) => [s.drag ? 'drag' : '', s.gest ? 'gest' : '', s.ptrs > 0 ? 'ptrs' : '', s.capture ? 'capture' : ''].filter(Boolean);

// hva skal skje ved en hendelse? Hendelsene: 'up' (normal slipp), 'cancel' (pointercancel/touchcancel), 'lost' (lostpointercapture), 'blur', 'flag' (⚑ trykket).
// Returnerer { place, reset, release, log } der place = delen skal plasseres (bare ved normal slipp av riktig finger),
// reset = nullstill drag/gest/ptrs, release = frigi pointer capture, log = tekst til logEv (bare når noe faktisk hang)
export function touchEvent(ev, s = {}, pid = null) {
  const mine = s.drag && pid != null && s.drag.pid === pid, h = hanging(s);
  if (ev === 'up') return { place: !!mine, reset: false, release: true, log: '' };
  if (ev === 'lost') return mine || s.gest ? { place: false, reset: true, release: true, log: `mistet fingeren (${h.join(', ')}) nullstilt` } : { place: false, reset: false, release: false, log: '' };
  if (ev === 'cancel') return { place: false, reset: !!(mine || s.gest || s.ptrs > 1 || (s.drag && pid == null)), release: true, log: h.length ? `avbrutt berøring (${h.join(', ')}) nullstilt` : '' };
  if (ev === 'blur') return { place: false, reset: h.length > 0, release: true, log: h.length ? `blur: ${h.join(', ')} nullstilt` : '' };
  if (ev === 'flag') return { place: false, reset: h.length > 0, release: true, log: h.length ? `⚑ avbrøt ${h.join(', ')}` : '' };
  return { place: false, reset: false, release: false, log: '' };
}

// den faste raden ↺ ↻ ✕: vises så snart noe er valgt (del eller feste), aldri mens delen dras eller prøven går
export const selRowKind = ({ sel = null, selLink = null, sim = false, dragging = false, sheet = false } = {}) => (sim || dragging || sheet ? null : sel ? 'part' : selLink ? 'link' : null);
export const SELROW = { btn: 48, gap: 6, w3: 3 * 48 + 2 * 6, w1: 48 };
// plassering: rett over delebrettet (og over kostnadsplata i stående), midtstilt i byggeområdet. m = classicMetrics, H = høyde i px.
export function selRowPlace({ m, H, kind = 'part' }) {
  const w = kind === 'link' ? SELROW.w1 : SELROW.w3, h = SELROW.btn;
  const lift = m.orient === 'land' ? 64 + 6 : 60 + 20 + 8;   // delebrett (+ plate i stående)
  const x0 = m.area.x0, x1 = m.area.x1, left = x0 + (x1 - x0 - w) / 2, y = H - m.trayBottom - lift - h;
  return { left, y, w, h, right: left + w, bottom: y + h };
}
// tekstlinjene øverst: hintlinjen står først; plata («Smuler», «Tåler …», budsjett) starter under den, alltid på en egen rad.
// hintBottom = nedre kant av hintlinjen i px (0 = ingen hint). Returnerer øvre kant for plata.
export const plateTop = ({ topPx, hintBottom = 0, gap = 4 } = {}) => Math.max(topPx - 22, hintBottom > 0 ? hintBottom + gap : 0);
// overlapp mellom rektangler {x,y,r,b} (tester): liste med par som overlapper mer enn tol px
export function overlaps(boxes, tol = 1) {
  const out = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (Math.min(a.r, b.r) - Math.max(a.x, b.x) > tol && Math.min(a.b, b.b) - Math.max(a.y, b.y) > tol) out.push([a.k, b.k]);
  }
  return out;
}
// DOM-skrivinger per bilde/berøring (budsjett): enkel teller
export const createWriteCounter = () => { let n = 0; return { hit: () => { n++; }, get n() { return n; }, reset: () => { n = 0; } }; };
// skriv bare når verdien er endret (gjenbruk av tekst og disabled per bilde). cache = Map/WeakMap, key = element.
export function writeOnce(cache, key, val, apply, counter) { if (cache.get(key) === val) return false; cache.set(key, val); apply(val); counter?.hit(); return true; }
