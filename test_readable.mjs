// node test_markers.mjs: R14, pilplassering (ren funksjon) og ugripbare flater
import { placeMarker, edgePoint, inAny, inflate, ungrippableAhead, shelfIds, figureRect, pickArrowDistance } from './readable.js';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FEIL', m); } };
// iPhone 14 stående (390x844) og liggende (844x390) med knapper omtrent som i index.html
const layouts = {
  portrait: { w: 390, h: 844, rects: [{ x0: 276, y0: 628, x1: 364, y1: 716 }, { x0: 284, y0: 716, x1: 360, y1: 792 }, { x0: 280, y0: 540, x1: 356, y1: 616 }, { x0: 22, y0: 594, x1: 152, y1: 724 }, { x0: 0, y0: 0, x1: 200, y1: 80 }, { x0: 0, y0: 790, x1: 390, y1: 844 }] },
  landscape: { w: 844, h: 390, rects: [{ x0: 730, y0: 200, x1: 818, y1: 288 }, { x0: 738, y0: 290, x1: 814, y1: 366 }, { x0: 734, y0: 110, x1: 810, y1: 186 }, { x0: 22, y0: 220, x1: 152, y1: 350 }, { x0: 0, y0: 0, x1: 260, y1: 70 }] },
};
for (const [name, L] of Object.entries(layouts)) {
  const rs = L.rects.map((r) => inflate(r, 6));
  const under = placeMarker(320, 670, L.w, L.h, rs);
  ok(under.safe && !inAny(under.x, under.y, rs), name + ': punkt under knapp flyttes ut');
  const free = placeMarker(200, 200, L.w, L.h, rs); ok(!free.moved && free.ang === null, name + ': fritt punkt urørt');
  const off = placeMarker(-300, 50, L.w, L.h, rs); ok(off.x >= 14 && off.y >= 14 && off.x <= L.w - 14 && off.y <= L.h - 14, name + ': utenfor skjermen: festes i kanten');
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let fails = 0; for (let i = 0; i < 4000; i++) { const r = placeMarker(rnd() * L.w * 1.6 - L.w * 0.3, rnd() * L.h * 1.6 - L.h * 0.3, L.w, L.h, rs); if (r.x < 14 || r.y < 14 || r.x > L.w - 14 || r.y > L.h - 14 || inAny(r.x, r.y, rs)) fails++; }
  ok(fails === 0, `${name}: ${fails} av 4000 tilfeldige punkter endte bak en knapp eller utenfor`);
  for (const a of [0, 1, 2, 3, -1, -2.5, Math.PI]) { const e = edgePoint(a, L.w, L.h); ok(e.x >= 13.9 && e.x <= L.w - 13.9 && e.y >= 13.9 && e.y <= L.h - 13.9, `${name}: edgePoint ${a} innenfor`); }
}
{ const r = placeMarker(100, 100, 390, 844, [{ x0: 50, y0: 50, x1: 150, y1: 150 }]); ok(r.moved && r.ang !== null && Math.abs(r.ang) <= Math.PI + 1e-9, 'moved gir retning mot opprinnelig punkt'); }
{ const up = edgePoint(0, 390, 844); ok(Math.abs(up.x - 195) < 1e-6 && up.y === 14, 'rett opp: toppkanten'); const rt = edgePoint(Math.PI / 2, 390, 844); ok(rt.x === 376 && Math.abs(rt.y - 422) < 1e-6, 'høyre: høyrekanten'); }
// ugripbar flate
const k = { HW: 0.3, H: 1, reach: 0.4, range: 0.5 };
const wall = { type: 'wall', min: [1, 0, -5], max: [2, 40, 5], id: 'vegg' }, shelf = { type: 'wood', min: [1, 0, -5], max: [2, 1.3, 5], id: 'hylle' }, gripB = { type: 'fabric', grip: true, min: [1, 0, -5], max: [2, 40, 5], id: 'g' };
const pl = (o) => ({ x: 0.5, y: 2, z: 0, fx: 1, fz: 0, onGround: false, carry: null, ...o });
ok(ungrippableAhead(pl({}), [wall], k)?.box === wall, 'glatt vegg foran i lufta gir markør');
ok(ungrippableAhead(pl({ onGround: true }), [wall], k) === null, 'på bakken: ingen markør');
ok(ungrippableAhead(pl({}), [gripB], k) === null, 'grep gir ikke kryss');
ok(ungrippableAhead(pl({ y: 0.5 }), [shelf], k) === null, 'kant innen rekkevidde gir ikke kryss');
ok(ungrippableAhead(pl({ x: -3 }), [wall], k) === null, 'for langt unna');
ok(ungrippableAhead(pl({ fx: -1 }), [wall], k) === null, 'ser bort fra veggen');
const u = ungrippableAhead(pl({}), [wall], k); ok(u && u.nx === -1 && u.x === 1, 'markøren ligger på flaten med normal mot deg');
ok(shelfIds([{ id: 'hylle' }, { id: 'g', grip: true }, { id: 'gulv' }], [shelf, gripB, { type: 'floor', id: 'gulv', min: [0, 0, 0], max: [1, 1, 1] }]).join() === 'hylle', 'bare ekte hyller får hyllekant');
// figur og gulvpil
{ const fr = figureRect({ x: 195, y: 380 }, { x: 195, y: 470 }); ok(fr && inAny(195, 420, [fr]) && fr.x1 - fr.x0 >= 68, 'figurrektangel dekker kroppen');
  ok(figureRect(null, { x: 1, y: 2 }) === null, 'figurrektangel uten punkt gir null');
  const spot = (d) => ({ x: 195, y: 470 - d * 40 });                              // pila rykker oppover skjermen jo lenger fram
  ok(pickArrowDistance(spot, [1.4, 2.2, 3.0, 3.8], 390, 844, [fr]) === 3.0, 'pila flyttes lenger fram til den er fri for figuren');
  ok(pickArrowDistance(spot, [1.4, 2.2], 390, 844, [fr]) === null, 'ingen fri avstand gir null (kantpil)');
  ok(pickArrowDistance(() => null, [1.4], 390, 844, []) === null, 'bak kameraet gir null');
  const r = placeMarker(195, 420, 390, 844, [inflate(fr, 18)]); ok(r.safe && !inAny(r.x, r.y, [fr]), 'markør på figuren flyttes utenfor figuren'); }
console.log(bad ? `${bad} feil` : 'markør-tester grønne'); if (bad) process.exit(1);
