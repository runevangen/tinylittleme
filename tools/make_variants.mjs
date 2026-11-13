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


// ---------- R29: verktøy-genveier. En trapp av trinn (merket `shortcut`: ikke en del av den vanlige ruta) der første trinn er for høyt til å hoppe opp på, men går an med hårgelé.
// steps: [[x0, x1, z0, z1, topp]] i cm, første trinn nærmest flaska. Den vanlige ruta er den lengre veien uten verktøyet. Bevises av tools/walk_route.mjs (og test_shortcut.mjs).
const addShortcut = (s, k, { id, bottle, bottleAt, steps, stand, face, join, label, en, help, stepHelp }) => {
  k.add(bottle, 'gel_bottle', 'plastic', '#8fd8ee', [bottleAt[0] - 2, bottleAt[0] + 2, 0, 10, bottleAt[1] - 2, bottleAt[1] + 2], { movable: 'light', tool: 'gel', help });
  const ids = steps.map(([x0, x1, z0, z1, top], i) => { const sid = `${id}_trinn_${i + 1}`; k.add(sid, 'crate', 'wood', ['#d9a86c', '#c99556', '#b98446', '#a8753a'][i % 4], [x0, x1, 0, top, z0, z1], { shortcut: true, ...(i === 0 && stepHelp ? { help: stepHelp } : {}), ...(i === steps.length - 1 ? { cp: true } : {}) }); return sid; });
  (s.shortcuts ||= []).push({ id, tool: 'gel', item: bottle, label, en, stand, face, steps: ids, join });
};

// ---------- Nivå 4: Badet, ommøblert. Vaskekurven står under knaggene, og motgiften er flyttet opp på den øverste hylla (2 m). ----------
{
  const s = load('bad'), k = kit(s);
  s.name = 'Nivå 4: Badet, ommøblert'; s.rev = 1;
  s.source.interpreted_by += '. Ommøblert for nivå 4 (kurven flyttet, ny hylle, to nye håndklær).';
  k.set('vaskekurv', { box: [140, 182, 0, 60, 140, 184], help: 'Vaskekurven er flyttet\nNå står den under knaggene. Klatre opp på den (GREP), og videre opp badekåpa til knaggrekka.' });
  k.set('dopapir', { box: [60, 70, 80, 90, 4, 14] });                                       // rullen ligger på sisternen nå
  k.del('kurv_knagg', 'knagg_hylle', 'medisin_handkle');                                  // R42: nivå 1 sin klatrevei til medisinskapet (kurv ved knaggene, hylle, håndkle) brukes ikke her: nivå 4 har sin egen (vaskekurv, ny hylle)
  k.del('bukse', 'kurv_liten_aapen');                                                       // buksa er tatt ned, og den lille kurven er flyttet ned på gulvet
  k.add('kurv_liten_aapen', 'hamper', 'wicker', '#b88a4a', [46, 70, 0, 23, 150, 190], {});
  k.set('badekape_bla', { box: [176, 185, 60, 135, 144, 158], onto: 'knaggrekke', grip_drain: -0.6, help: 'Badekåpa\nKlatre fra kurven og opp til knaggrekka. Det er et langt tak: start med fulle krefter.' });
  k.set('badekape_lilla', { box: [174, 185, 62, 130, 158, 174] });
  k.set('knaggrekke', { box: [180, 185, 130, 135, 144, 188], cp: true });
  // ny hylle under den øverste, dyp nok til å stå foran neste håndkle
  k.add('ny_hylle', 'chest', 'wood', '#c79a5e', [138, 185, 160, 163, 190, 232], { cp: true, help: 'Ny hylle\nHvil her til kreftene er fulle. Det siste håndkleet henger fra den øverste hylla.' });
  k.add('handkle_ny_1', 'towel_hang', 'fabric', '#e0a23a', [170, 184, 135, 163, 188, 190], { grip: true, onto: 'ny_hylle', grip_drain: -0.3 });
  k.add('handkle_ny_2', 'towel_hang', 'fabric', '#c9483b', [154, 157, 163, 199, 200, 216], { grip: true, onto: 'hylle', grip_drain: -0.3 });
  s.goal = { x: 172, y: 199, z: 232, on: 'hylle', note: 'Motgift-bit på den øverste hylla, i enden bak panelet (v0.88: flyttet bort fra det grønne håndkleet, så lyssøylen ikke dekker det)' };
  s.ants = [{ id: 'baerer_gulv', type: 'carrier', on: 'gulv', from: [92, 55], to: [242, 55] }, { id: 'edderkopp_dusj', type: 'spider', on: 'gulv', from: [42.5, 115] }];   // R6: bærer-maur og en edderkopp-vakt (fri flate rundt, langt fra start)
  // R12: egen stemning. Kveldslys og korallfarger; vri: vannet stiger (vading = tregere og mister krefter, så klatre opp!). Rekvisitter er bare pynt (ingen kollisjon).
  s.variant = { mood: 'evening', twist: { type: 'water', max: 4, dry: 16, rise: 9, hold: 6, drain: 9, flood: { max: 70 } },   // R42: flood = valgfri stigende-vann-variant (⚙ → Spill → «Nivå 4: stigende vann»), 70 cm dypt til slutt
   
    props: [{ type: 'rug', x: 105, z: 195, w: 70, d: 38, color: '#e8574a', stripe: '#ffe2b8' }, { type: 'rug', x: 62, z: 90, w: 40, d: 40, shape: 'round', color: '#7a5cc8', stripe: '#f4d6ff' }, { type: 'duck', x: 150, z: 112, r: 9 }] };
  s.ants.push({ id: 'traad_dusj', type: 'dangler', on: 'gulv', from: [42.5, 80] }, { id: 'traad_vask', type: 'dangler', on: 'gulv', from: [212.5, 75] });   // R19: nivå 4 = edderkopper i tråd fra taket (ingen pillbug)
  s.goals = [{ id: 'kurv', type: 'reach', on: 'vaskekurv', gate: true, label: 'Klatre opp på vaskekurven', en: 'Climb the laundry basket' },
    { id: 'hylle', type: 'reach', on: 'ny_hylle', gate: true, after: 'kurv', label: 'Nå den nye hylla', en: 'Reach the new shelf' },
    { id: 'smuler', type: 'crumbs', n: 5, label: 'Samle 5 smuler', en: 'Collect 5 crumbs' },
    { id: 'vokter', type: 'stomp', n: 1, label: 'Knus en vokter', en: 'Squash a guard' }];                                                         // R23: delmål (goals.js)
  // R42: den harde veien uten klatring arves fra nivå 1 (eskene opp til medisinskapet), og fortsetter med et hopp over til den øverste hylla der motgiften ligger.
  s.alts = [{ id: 'trapp_bad', label: 'Den harde veien: hopp opp eskene, over medisinskapet og til den øverste hylla uten å klatre', en: 'The hard way: jump up the crates, across the medicine cabinet and onto the top shelf without climbing', path: [...s.alts[0].path.slice(0, -1), 'medisinskap', 'hylle'] }];
  addShortcut(s, k, { id: 'gele_bad', bottle: 'hargele_bad', bottleAt: [92, 210], stand: [106.5, 152.5], face: [1, 0], join: 'vaskekurv', steps: [[110, 125, 142.5, 162.5, 27], [125, 140, 142.5, 162.5, 47]],
    label: 'Smør hårgelé og klatre opp trinnene til vaskekurven', en: 'Smear hair gel and climb the steps to the laundry basket',
    help: 'Hårgelé\nTa flaska (TA), bær den til det høye trinnet ved vaskekurven og trykk SMØR. Legg den fra deg (SLIPP) og klatre i gelen (GREP). Våt i 20 s: sklir.',
    stepHelp: 'Høyt trinn\nFor høyt å hoppe på. Smør hårgelé på trinnet (TA med flaska), så klatrer du opp og går videre til vaskekurven. Den lange veien går fortsatt.' });
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
  // R12: natt. Mørkt rom med lommelykt-kjegle fra hjelmen, stjerner i taket og et leketog som kjører på sporet midt i rommet (hopp på lokomotivet eller gå rundt).
  { const sp = s.ants.find((x) => x.id === 'edderkopp_hjorne'); if (sp) sp.from = [172, 120]; const c = s.ants.find((x) => x.id === 'maur_gulv'); if (c) c.from = [125, 90]; }
  s.ants.push({ id: 'tog', type: 'ant', skin: 'train', on: 'gulv', from: [104, 72], to: [104, 212], speed: 3.2 });
  s.variant = { mood: 'night', twist: { type: 'train', ant: 'tog' },
    props: [{ type: 'rug', x: 170, z: 200, w: 110, d: 90, shape: 'round', color: '#3b64c4', stripe: '#ffd45a' }, { type: 'track', from: [104, 72], to: [104, 212] }, { type: 'stars', count: 46 }] };
  s.ants.push({ id: 'traad_hylle', type: 'dangler', on: 'gulv', from: [155, 75] }, { id: 'pillbug_gulv', type: 'roller', on: 'gulv', from: [115, 135], to: [145, 135] });   // R19: nivå 5 = en tråd-edderkopp og en pillbug på den trange gulvstripa
  s.goals = [{ id: 'kasse', type: 'reach', on: 'lekekasse', gate: true, label: 'Hopp opp på lekekassen', en: 'Jump onto the toy box' },
    { id: 'smuler', type: 'crumbs', n: 5, label: 'Samle 5 smuler', en: 'Collect 5 crumbs' },
    { id: 'maur', type: 'stomp', n: 2, label: 'Knus to maur', en: 'Squash two ants' },
    { id: 'vegg', type: 'reach', on: 'vegghylle', gate: true, after: 'kasse', label: 'Nå vegghylla', en: 'Reach the wall shelf' }];                                                         // R23: delmål (goals.js)
  addShortcut(s, k, { id: 'gele_barn', bottle: 'hargele_barn', bottleAt: [165, 250], stand: [272.5, 214.5], face: [0, -1], join: 'skrivebord', steps: [[255, 290, 190, 210, 27], [255, 290, 170, 190, 46], [255, 290, 150, 170, 64]],
    label: 'Smør hårgelé og klatre opp trinnene til skrivebordet', en: 'Smear hair gel and climb the steps to the desk',
    help: 'Hårgelé\nTa flaska (TA), bær den til det høye trinnet foran skrivebordet og trykk SMØR. Legg den fra deg (SLIPP) og klatre i gelen (GREP). Våt i 20 s: sklir.',
    stepHelp: 'Høyt trinn\nFor høyt å hoppe på. Smør hårgelé på trinnet (TA med flaska), klatre opp og gå trappa til skrivebordet. Den lange veien via leke- og bokhyllene går fortsatt.' });
  save('barnerom2', s);
}

// ---------- Nivå 6: Kjøkkenet, ryddet om. Skuffene er lukket: opp via kassa og håndkleet på komfyren. Overskapet er kortere og kjøleskapet flyttet: to hopp i høyden. ----------
{
  const s = load('kjokken'), k = kit(s);
  s.name = 'Nivå 6: Kjøkkenet, ryddet om'; s.rev = 1;
  s.source.interpreted_by += '. Ryddet om for nivå 6.';
  const drw = ['skuff_1', 'skuff_2', 'skuff_3', 'skuff_4'].map((id) => k.get(id).drawer);   // R55: samme frontfarger og håndtak som i nivå 3, men lukket (flat front, tydelig fuge)
  for (let i = 1; i <= 4; i++) k.del(`skuff_${i}`);
  for (let i = 1; i <= 4; i++) k.add(`skuffront_${i}`, 'drawer', 'wood', drw[i - 1].front, [70, 115, i * 20 - 17, i * 20 - 1, 60, 60.6], { decor: true, drawer: { ...drw[i - 1], open: false } });   // skuffene er lukket
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
  // R12: kveld i kjøkkenet, og lyset slås av med jevne mellomrom: da lyser bare hjelmlykta (kjegle foran deg). Kakeboks på gulvet og løpere i fargerike striper.
  k.add('kakeboks_gulv', 'cup', 'metal', '#c8423c', [318, 342, 0, 14, 138, 162], {});
  s.variant = { mood: 'dusk', twist: { type: 'lights', on: 15, off: 8, blink: 1 },
    props: [{ type: 'rug', x: 180, z: 150, w: 130, d: 30, color: '#e08a2e', stripe: '#fff0c8' }, { type: 'rug', x: 110, z: 240, w: 50, d: 50, shape: 'round', color: '#2f9a8a', stripe: '#ffe9b0' }] };
  { const m = s.ants.find((x) => x.id === 'maur_gulv'); if (m) m.from = [135, m.from[1]]; }               // R9: bærer-mauren går ikke gjennom sjefens område (venstre del av rommet)
  s.boss = { id: 'sjef', on: 'gulv', from: [25, 110], to: [85, 110] };                                        // R9: sjef-maur på den åpne gulvflata til venstre (veggen og kjøleskapet står som vegger for støtet)
  s.ants.push({ id: 'traad_kjokken', type: 'dangler', on: 'gulv', from: [300, 165] });                          // R19: nivå 6 = pillbugen fra nivå 3 (arvet) pluss en tråd-edderkopp
  s.goals = [{ id: 'smuler', type: 'crumbs', n: 6, label: 'Samle 6 smuler', en: 'Collect 6 crumbs' },
    { id: 'sjef', type: 'boss', label: 'Slå sjef-mauren', en: 'Beat the boss ant' },
    { id: 'bro', type: 'puzzle', puzzle: 'bro', label: 'Åpne snarveien med nøkkelen', en: 'Open the shortcut with the key' },
    { id: 'skap', type: 'reach', on: 'overskap', gate: true, label: 'Nå overskapet', en: 'Reach the top cabinet' }];                                                         // R23: delmål (goals.js)
  { const m = s.ants.find((x) => x.id === 'maur_gulv'); if (m) m.to = [250, m.from[1]]; const r = s.ants.find((x) => x.id === 'pillbug_gulv'); if (r) { r.from = [318, r.from[1]]; r.to = [348, r.to[1]]; } }   // R29: trappa til benken står der bærer-mauren og pillbuggen gikk: kortere bane for bæreren, pillbuggen rullet til høyre for trappa
  addShortcut(s, k, { id: 'gele_kjokken', bottle: 'hargele_kjokken', bottleAt: [90, 255], stand: [292.5, 146.5], face: [0, -1], join: 'benk_o', steps: [[275, 310, 122, 142, 27], [275, 310, 102, 122, 45], [275, 310, 82, 102, 63], [275, 310, 62, 82, 80]],
    label: 'Smør hårgelé og klatre trappa opp til kjøkkenbenken', en: 'Smear hair gel and climb the stairs up to the counter',
    help: 'Hårgelé\nTa flaska (TA), bær den til det høye trinnet ved benken og trykk SMØR. Legg den fra deg (SLIPP) og klatre i gelen (GREP). Våt i 20 s: sklir.',
    stepHelp: 'Høyt trinn\nFor høyt å hoppe på. Smør hårgelé på trinnet (TA med flaska), klatre opp og gå trappa til benken. Den lange veien via kassa og håndkleet går fortsatt.' });
  save('kjokken2', s);
}
console.log('skrev scenes/bad2, barnerom2, kjokken2');
