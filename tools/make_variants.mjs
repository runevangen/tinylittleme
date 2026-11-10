// Nivå 4–6: de samme rommene som nivå 1–3, men ommøblert, med nye hyller og nye ting, så de må løses på en ny måte.
// Leser grunnscenene og skriver variantene. Bruk: node tools/make_variants.mjs   (deretter scene2level + walk_route for hver)
import fs from 'node:fs';
import { autoCrumbs } from './place_crumbs.mjs';
const load = (n) => JSON.parse(fs.readFileSync(new URL(`../scenes/${n}.scene.json`, import.meta.url), 'utf8'));
const save = (n, s) => { s.collectibles = autoCrumbs(s); fs.writeFileSync(new URL(`../scenes/${n}.scene.json`, import.meta.url), JSON.stringify(s, null, 2) + '\n'); };
const kit = (s) => ({
  get: (id) => { const o = s.objects.find((x) => x.id === id); if (!o) throw new Error(`fant ikke ${id}`); return o; },
  del: (...ids) => { for (const id of ids) { const i = s.objects.findIndex((x) => x.id === id); if (i < 0) throw new Error(`fant ikke ${id}`); s.objects.splice(i, 1); } },
  set(id, patch) { Object.assign(this.get(id), patch); },
  add: (id, kind, material, color, box, extra = {}) => s.objects.push({ id, kind, material, color, box, confidence: 1, photos: [], ...extra }),
});

// ---------- Nivå 4: Badet, ommøblert. Vaskekurven står under knaggene, og motgiften er flyttet opp på den øverste hylla (2 m). ----------
{
  const s = load('bad'), k = kit(s);
  s.name = 'Nivå 4: Badet, ommøblert'; s.rev = 1;
  s.source.interpreted_by += '. Ommøblert for nivå 4 (kurven flyttet, ny hylle, to nye håndklær).';
  k.set('vaskekurv', { box: [140, 182, 0, 60, 140, 184], help: 'Vaskekurven er flyttet\nNå står den under knaggene. Klatre opp på den (GREP), og videre opp badekåpa til knaggrekka.' });
  k.set('dopapir', { box: [60, 70, 80, 90, 4, 14] });                                       // rullen ligger på sisternen nå
  k.del('bukse', 'kurv_liten_aapen');                                                       // buksa er tatt ned, og den lille kurven er flyttet ned på gulvet
  k.add('kurv_liten_aapen', 'hamper', 'wicker', '#b88a4a', [46, 70, 0, 23, 150, 190], {});
  k.set('badekape_bla', { box: [176, 185, 60, 135, 144, 158], onto: 'knaggrekke', grip_drain: -0.6, help: 'Badekåpa\nKlatre fra kurven og opp til knaggrekka. Det er et langt tak: start med fulle krefter.' });
  k.set('badekape_lilla', { box: [174, 185, 62, 130, 158, 174] });
  k.set('knaggrekke', { box: [180, 185, 130, 135, 144, 188], cp: true });
  // ny hylle under den øverste, dyp nok til å stå foran neste håndkle
  k.add('ny_hylle', 'chest', 'wood', '#c79a5e', [138, 185, 160, 163, 190, 232], { cp: true, help: 'Ny hylle\nHvil her til kreftene er fulle. Det siste håndkleet henger fra den øverste hylla.' });
  k.add('handkle_ny_1', 'towel_hang', 'fabric', '#e0a23a', [170, 184, 135, 163, 188, 190], { grip: true, onto: 'ny_hylle', grip_drain: -0.3 });
  k.add('handkle_ny_2', 'towel_hang', 'fabric', '#c9483b', [154, 157, 163, 199, 200, 216], { grip: true, onto: 'hylle', grip_drain: -0.3 });
  s.goal = { x: 172, y: 199, z: 210, on: 'hylle', note: 'Motgift-bit på den øverste hylla, der den lille kurven sto' };
  s.ants = [{ id: 'baerer_gulv', type: 'carrier', on: 'gulv', from: [92, 55], to: [242, 55] }, { id: 'edderkopp_dusj', type: 'spider', on: 'gulv', from: [42.5, 115] }];   // R6: bærer-maur og en edderkopp-vakt (fri flate rundt, langt fra start)
  save('bad2', s);
}

// ---------- Nivå 5: Barnerommet, ommøblert. Krakken er borte: balanser på en ny hylle over lekebøtta, og fortsett fra klesskapet bortover nye hyller. ----------
{
  const s = load('barnerom'), k = kit(s);
  s.name = 'Nivå 5: Barnerommet, ommøblert'; s.rev = 1;
  s.source.interpreted_by += '. Ommøblert for nivå 5.';
  k.del('krakk', 'nattlampe');
  k.set('blyantkopp', { box: [270, 280, 74, 88, 100, 110] });                              // flyttet, så du ikke lander på den fra hylla
  k.set('nattbord', { help: 'Ny vei\nKrakken er borte. Gå opp på bøkene og balanser bortover den smale hylla over lekebøtta. Skyv stikken forsiktig.' });
  k.add('nattbok', 'box', 'book', '#3f7d5a', [100, 136, 62, 74, 22, 44], {});
  k.add('hylle_a', 'chest', 'wood', '#c79a5e', [136, 206, 80, 83, 20, 34], {});
  k.add('hylle_a_konsoll', 'box', 'metal', '#3a3d42', [168, 172, 60, 80, 20, 22], { decor: true });
  k.set('klesskap', { help: 'Videre fra klesskapet\nMotgiften er flyttet. Gå bortover hylla over døra og hopp over til den siste hylla.' });
  k.add('hylle_b', 'chest', 'wood', '#c79a5e', [110, 240, 147, 150, 266, 280], {});
  k.add('hylle_c', 'chest', 'wood', '#c79a5e', [20, 90, 147, 150, 266, 280], {});
  k.add('robot', 'cup', 'metal', '#9aa0a6', [24, 38, 150, 170, 268, 278], {});
  k.add('vimpel', 'box', 'paper', '#e0483e', [20, 240, 190, 192, 279, 279.6], { decor: true });
  s.goal = { x: 60, y: 150, z: 273, on: 'hylle_c', note: 'Motgift-bit på hylla i hjørnet, ved roboten' };
  save('barnerom2', s);
}

// ---------- Nivå 6: Kjøkkenet, ryddet om. Skuffene er lukket: opp via kassa og håndkleet på komfyren. Overskapet er kortere og kjøleskapet flyttet: to hopp i høyden. ----------
{
  const s = load('kjokken'), k = kit(s);
  s.name = 'Nivå 6: Kjøkkenet, ryddet om'; s.rev = 1;
  s.source.interpreted_by += '. Ryddet om for nivå 6.';
  for (let i = 1; i <= 4; i++) k.del(`skuff_${i}`, `skuffknott_${i}`);
  for (let i = 1; i <= 4; i++) k.add(`skuffront_${i}`, 'box', 'wood', '#d9d2c0', [70, 115, i * 20 - 17, i * 20 - 1, 60, 60.6], { decor: true });   // skuffene er lukket
  k.add('kasse', 'crate', 'wood', '#b88a4a', [208, 252, 0, 20, 66, 100], { help: 'Skuffene er lukket\nNy vei opp: hopp opp på kassa og klatre i håndkleet som henger på komfyren (hold GREP).' });
  k.add('komfyrhandkle', 'towel_hang', 'fabric', '#3f8fd6', [214, 246, 20, 90, 62, 65], { grip: true, onto: 'komfyr_front', grip_drain: -0.6 });
  k.del('komfyr_handtak');
  k.set('komfyr_front', { cp: true, help: 'Kokeplatene\nPlatene bak deg er varme. Gå rett til siden langs kanten.' });
  k.set('overskap', { box: [165, 258, 140, 200, 0, 35] });
  k.del('overskap_fuge_1');
  k.set('kjoleskap', { box: [30, 95, 0, 190, 0, 65], help: 'Kjøleskapet er flyttet\nOverskapet er kortere nå. Fra enden hopper du til den lille hylla, og derfra til kjøleskapet.' });
  k.set('kjoleskap_handtak', { box: [86, 89, 70, 150, 65, 68] }); k.set('kjoleskap_fuge', { box: [30, 95, 118, 119, 65, 65.5] });
  k.set('kakeboks', { box: [38, 60, 190, 208, 8, 30] });
  k.add('hylle_over_vask', 'chest', 'wood', '#c79a5e', [118, 142, 194, 198, 0, 30], {});
  k.add('potteplante', 'cup', 'ceramic', '#6f8f3a', [122, 132, 198, 212, 2, 12], {});
  s.goal = { x: 76, y: 190, z: 44, on: 'kjoleskap', note: 'Motgift-bit på toppen av kjøleskapet' };
  s.ants.push({ id: 'edderkopp_skap', type: 'spider', on: 'gulv', from: [90, 185] });                         // R6: ekstra edderkopp-vakt i nivå 6
  { const m = s.ants.find((x) => x.id === 'maur_matte'); if (m) m.to = [m.from[0] + 55, m.from[1]]; }      // kassa står på matta nå: kortere patrulje (maurene må ha fri bane)
  // R7: gåten flyttes. Broen ruller ut mellom overskapet og den lille hylla (første hopp); platen ligger nærmere kanten enn i nivå 3. Nøkkelen arves.
  s.puzzles = [{ id: 'bro', key: 'noekkel', label: 'låsen', en: 'the lock', plate: { on: 'overskap', at: [205, 25], r: 10 }, bridge: { box: [142, 165, 195, 198, 3, 27], axis: 'x', anchor: 'max' } }];
  save('kjokken2', s);
}
console.log('skrev scenes/bad2, barnerom2, kjokken2');
