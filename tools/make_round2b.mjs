// R124: runde 2 av Hyllebroen og Kjøkkenbroen («Runde 2»-brett). Lager scenes/bro2.scene.json og scenes/kjokkenbro2.scene.json av grunnscenene (bro, kjokkenbro), som er uendret.
// Bruk: node tools/make_round2b.mjs && node tools/validate_scene.mjs scenes/bro2.scene.json && node tools/scene2level.mjs scenes/bro2.scene.json levels/bro2.level.json && node tools/walk_route.mjs levels/bro2.level.json
// (samme for kjokkenbro2). Kjør på nytt hvis en grunnscene endres.
// Vrien i runde 2: gapet er 12 (Hyllebroen) og 16 (Kjøkkenbroen) byggeenheter (60 og 80 cm, i dag 7), så tre alene ikke holder og fagverk i stål trengs; to mål i ulik høyde (flagget øverst og en lavere
// hylle, begge teller for delmålet «Nå flagget»); variert last (bil, robot og figur etter hverandre) med tung vekt. Hver last kommer etter hverandre i samme prøve (build_loads.js).
import fs from 'node:fs';
import { R2 } from '../round2_logic.js';

const load = (n) => JSON.parse(fs.readFileSync(new URL(`../scenes/${n}.scene.json`, import.meta.url), 'utf8'));
const save = (n, s) => fs.writeFileSync(new URL(`../scenes/${n}.scene.json`, import.meta.url), JSON.stringify(s, null, 2) + '\n');
const set = (s, id, box, extra = {}) => { const o = s.objects.find((x) => x.id === id); if (!o) throw new Error('fant ikke ' + id); o.box = box; Object.assign(o, extra); };

// ---------- Hyllebroen · Runde 2: gap 12 (60 cm) ----------
{
  const s = load('bro'), C = R2.bro2;
  s.name = 'Hyllebroen · Runde 2'; s.audio = { ...s.audio, ambience: ['room:lab'] };
  s.source = { note: 'Byggebrett runde 2 (R124): gapet mellom hyllene er 60 cm (12 byggeenheter, i dag 7). Tre alene holder ikke; bare et fagverk med stål bærer bil, robot og figur etter hverandre. To mål i ulik høyde: flagget øverst og en lavere hylle. Den harde veien er langt rundt og opp den smale trappa til høyre.' };
  set(s, 'a1', [50, 90, 0, 10, 40, 120]); set(s, 'a2', [90, 130, 0, 20, 40, 120]); set(s, 'a3', [130, 170, 0, 30, 40, 120]);
  set(s, 'hylleA', [170, 260, 0, 40, 40, 120], { help: 'Runde 2: et stort gap\nGapet er 12 byggeenheter. Tre alene holder ikke: trykk BYGG ved kanten og bygg et fagverk med stål. Eller ta den harde veien rundt.' });
  set(s, 'hylleB', [320, 370, 0, 40, 40, 120]);
  set(s, 's1', [370, 398, 0, 52, 40, 120]); set(s, 's2', [398, 426, 0, 64, 40, 120]);
  s.objects.push({ id: 'balkong', kind: 'chest', material: 'wood', color: '#9fc5a0', box: [330, 380, 0, 30, 125, 168], confidence: 1, help: 'Det lave målet\nOgså denne hylla teller som mål: den ligger lavere enn flagget og kan bare nås fra hylla etter broen.' });
  s.ants = [{ id: 'maur_gulv', on: 'gulv', from: [250, 187], to: [360, 187] }];   // maura går langs vegg-siden så den ikke krasjer med den lave hylla
  s.goal = { x: 412, y: 64, z: 80, on: 's2', note: 'Flagget står øverst på s2.' };
  s.collectibles = [{ id: 'smule_1', on: 'gulv', at: [150, 170] }, { id: 'smule_2', on: 'balkong', at: [355, 146] }, { id: 'smule_3', on: 'gulv', at: [420, 170] }];
  s.goals = [
    { id: 'bygg', type: 'flag', flag: C.site, label: 'Bygg en bro over det store gapet (BYGG-knappen)', en: 'Build a bridge over the big gap (BUILD button)' },
    { id: 'flagg', type: 'reach', on: 's2', also: ['balkong'], label: 'Nå flagget, eller den lave hylla', en: 'Reach the flag, or the low shelf', gate: true },
    { id: 'smuler', type: 'crumbs', n: 3, label: 'Samle 3 smuler', en: 'Collect 3 crumbs' }];
  s.build.sites = [{ id: C.site, label: 'Det store gapet mellom hyllene (runde 2)', at: [290, 80], y: 40, w: 120, h: 80, d: 20, anchors: [[-30, 0], [30, 0]], deck: [[-57.5, -30], [30, 57.5]], start: [-50, 0], goal: [50, 0],
    grid: { step: 2, stars: C.stars, stage: C.stage }, ref: { placed: [], links: [], surfaces: [], grid: C.ref, best: C.best, route: ['gulv', 'a1', 'a2', 'a3', 'hylleA', '@bro', 'hylleB', 's1', 's2'] } }];
  s.build.parts = [{ id: 'd1', type: 'plank_s', on: 'a1', at: [70, 80] }, { id: 'd2', type: 'plank_l', on: 'gulv', at: [300, 170] }, { id: 'd3', type: 'block', on: 'gulv', at: [120, 180] }, { id: 'd4', type: 'weight', on: 'gulv', at: [200, 180] },
    { id: 'd5', type: 'plank_l', on: 'hylleA', at: [220, 80] }, { id: 'd6', type: 'pencil', on: 'gulv', at: [260, 215] }, { id: 'd7', type: 'lego', on: 'gulv', at: [150, 215] }, { id: 'd8', type: 'lego', on: 'gulv', at: [175, 215] }, { id: 'd9', type: 'book', on: 'gulv', at: [60, 215] }, { id: 'd10', type: 'sponge', on: 'gulv', at: [330, 215] }];
  save('bro2', s);
}

// ---------- Kjøkkenbroen · Runde 2: gap 16 (80 cm) ----------
{
  const s = load('kjokkenbro'), C = R2.kjokkenbro2;
  s.name = 'Bro til kjøleskapet · Runde 2'; s.audio = { ...s.audio, ambience: ['fridge', 'clock', 'drip'] };
  s.source = { note: 'Byggebrett runde 2 (R124, kjøkken): gapet mellom benken og kjøleskapet er 80 cm (16 byggeenheter, i dag 7). Tre alene holder ikke; bare et fagverk med stål bærer robot, bil og figur etter hverandre. To mål i ulik høyde: flagget øverst på kjøleskapet og en lavere hylle. Den harde veien er langt rundt og opp den smale trappa til høyre.' };
  set(s, 'skuff1', [40, 75, 0, 10, 40, 120]); set(s, 'skuff2', [75, 110, 0, 20, 40, 120]); set(s, 'skuff3', [110, 145, 0, 30, 40, 120]);
  set(s, 'benk', [145, 230, 0, 40, 40, 120], { help: 'Runde 2: et stort gap\nGapet er 16 byggeenheter. Tre alene holder ikke: trykk BYGG ved kanten og bygg et fagverk med stål. Eller ta den harde veien rundt.' });
  set(s, 'kjoleskap', [310, 360, 0, 40, 40, 120]); set(s, 'topp1', [360, 395, 0, 52, 40, 120]); set(s, 'topp2', [395, 426, 0, 64, 40, 120]);
  s.objects.push({ id: 'skap_lav', kind: 'chest', material: 'wood', color: '#9fc5a0', box: [320, 370, 0, 30, 125, 168], confidence: 1, help: 'Det lave målet\nOgså denne hylla teller som mål: den ligger lavere enn flagget og kan bare nås fra kjøleskapet.' });
  s.ants = [{ id: 'maur_gulv', on: 'gulv', from: [250, 187], to: [360, 187] }];
  s.goal = { x: 410, y: 64, z: 80, on: 'topp2', note: 'Flagget står øverst på topp2.' };
  s.collectibles = [{ id: 'smule_1', on: 'gulv', at: [150, 170] }, { id: 'smule_2', on: 'skap_lav', at: [345, 146] }, { id: 'smule_3', on: 'gulv', at: [420, 170] }];
  s.goals = [
    { id: 'bygg', type: 'flag', flag: C.site, label: 'Bygg en bro over det store gapet (BYGG-knappen)', en: 'Build a bridge over the big gap (BUILD button)' },
    { id: 'flagg', type: 'reach', on: 'topp2', also: ['skap_lav'], label: 'Nå flagget, eller den lave hylla', en: 'Reach the flag, or the low shelf', gate: true },
    { id: 'smuler', type: 'crumbs', n: 3, label: 'Samle 3 smuler', en: 'Collect 3 crumbs' }];
  s.build.sites = [{ id: C.site, label: 'Det store gapet mellom benken og kjøleskapet (runde 2)', at: [270, 80], y: 40, w: 140, h: 90, d: 20, anchors: [[-40, 0], [40, 0]], deck: [[-67.5, -40], [40, 67.5]], start: [-60, 0], goal: [60, 0],
    grid: { step: 2, stars: C.stars, stage: C.stage }, ref: { placed: [], links: [], surfaces: [], grid: C.ref, best: C.best, route: ['gulv', 'skuff1', 'skuff2', 'skuff3', 'benk', '@bro', 'kjoleskap', 'topp1', 'topp2'] } }];
  s.build.parts = [{ id: 'p1', type: 'plank_l', on: 'gulv', at: [300, 170] }, { id: 'p2', type: 'plank_s', on: 'skuff1', at: [55, 80] }, { id: 'p3', type: 'block', on: 'gulv', at: [120, 180] }, { id: 'p4', type: 'weight', on: 'gulv', at: [200, 180] },
    { id: 'p5', type: 'plank_s', on: 'benk', at: [190, 80] }, { id: 'p6', type: 'pencil', on: 'gulv', at: [260, 215] }, { id: 'p7', type: 'lego', on: 'gulv', at: [150, 215] }, { id: 'p8', type: 'lego', on: 'gulv', at: [175, 215] }, { id: 'p9', type: 'book', on: 'gulv', at: [60, 215] }, { id: 'p10', type: 'sponge', on: 'gulv', at: [330, 215] }, { id: 'p11', type: 'ruler', on: 'gulv', at: [230, 230] }];
  save('kjokkenbro2', s);
}
console.log('skrev scenes/bro2.scene.json og scenes/kjokkenbro2.scene.json');
