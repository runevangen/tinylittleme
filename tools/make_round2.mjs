// R125: runde 2 av Klossetrappa og Vippa. Lager scenene scenes/trapp2.scene.json og scenes/vippe2.scene.json av grunnscenene (dagens brett er uendret).
// Etterpå: node tools/scene2level.mjs scenes/trapp2.scene.json levels/trapp2.level.json (og vippe2). Kjør på nytt hvis grunnscenen endres.
//  - trapp2: hylla er 45 cm (9 enheter) i stedet for 30. Et tårn av klosser (3 høye) og to ramper (lange planker): én opp til tårnet og én fra tårnet og opp på hylla. Kloss-trappa fra runde 1 når ikke (21 klosser).
//  - vippe2: den andre hylla er 20 cm høyere enn den første (4 enheter, i dag 2) og gapet litt bredere: vippa må stå på skrå (30 til 45 grader), ellers tipper lasten ned i gapet.
import fs from 'node:fs';
const rd = (f) => JSON.parse(fs.readFileSync(new URL(`../scenes/${f}.scene.json`, import.meta.url), 'utf8'));
export const sceneText = (s) => JSON.stringify(s, null, 1) + '\n';
const wr = (f, s) => { out[f] = s; };
const out = {};
const obj = (s, id) => s.objects.find((o) => o.id === id);

// ---- Klossetrappa, runde 2 ------------------------------------------------------------------
{
  const s = rd('trapp');
  s.name = 'Klossetrappa, runde 2';
  s.source = { note: 'Byggebrett runde 2 (R125): hylla er 45 cm (9 enheter). Den smarte veien er et tårn av klosser og to ramper av lange planker; den harde veien er to små trinn bak hylla (21 og 33 cm) og et gaphopp. Laget av tools/make_round2.mjs.' };
  obj(s, 'hylle').box = [300, 420, 0, 45, 40, 140];
  obj(s, 'hylle').help = 'Høy hylle\nHer er hylla for høy for en vanlig trapp. Trykk BYGG: sett opp et tårn av tre klosser og legg to lange planker som ramper, én opp til tårnet og én opp på hylla. Eller ta den harde veien bak hylla.';
  s.objects.push({ id: 'e2', kind: 'chest', material: 'wood', color: '#f2b84b', box: [428, 458, 0, 33, 50, 130], confidence: 1 });
  const e1 = obj(s, 'e1'); e1.box = [466, 496, 0, 21, 50, 130];
  s.goal = { x: 365, y: 45, z: 90, on: 'hylle', note: 'Flagget står på den høye hylla.' };
  s.goals = [
    { id: 'bygg', type: 'flag', flag: 'trapp2a', label: 'Bygg tårn og ramper (BYGG-knappen)', en: 'Build a tower and ramps (BUILD button)' },
    { id: 'flagg', type: 'reach', on: 'hylle', label: 'Kom opp på den høye hylla', en: 'Get up on the tall shelf', gate: true },
  ];
  // referansebygg (enheter): tårn av tre klosser ved u = -3 og to ramper på 30 grader; fysikken setter delene (BP.settledPlaced)
  const p2 = { id: 'k7', type: 'plank_l', u: 0, v: 6.5, rot: +(Math.PI / 6).toFixed(4) };
  s.build = {
    sites: [{
      id: 'trapp2a', label: 'Foran den høye hylla (tårn og ramper)', at: [285, 90], y: 0, w: 140, h: 70, d: 20,
      stars: { three: { cost: 7, parts: 5 }, two: { cost: 10, parts: 8 } },   // 3 stjerner = referansebygget (kostnad 7, 5 deler)
      anchors: [], deck: [[-85, 15], [15, 70, 45]], start: [-60, 0], goal: [45, 45],
      ref: { placed: [{ id: 'k1', type: 'block', u: -3, v: 0.75, rot: 0 }, { id: 'k2', type: 'block', u: -3, v: 2.25, rot: 0 }, { id: 'k3', type: 'block', u: -3, v: 3.75, rot: 0 }, { id: 'k6', type: 'plank_l', u: -7, v: 2.5, rot: +(Math.PI / 6).toFixed(4) }, p2], links: [], surfaces: [{ id: '@r1', u0: -6, u1: -5.5, top: 3.7 }], route: ['gulv', '@r1', 'hylle'] },
    }],
    parts: [
      { id: 'k1', type: 'block', on: 'gulv', at: [100, 40] }, { id: 'k2', type: 'block', on: 'gulv', at: [140, 160] }, { id: 'k3', type: 'block', on: 'gulv', at: [180, 40] },
      { id: 'k4', type: 'block', on: 'gulv', at: [220, 170] }, { id: 'k5', type: 'block', on: 'gulv', at: [100, 160] },
      { id: 'k6', type: 'plank_l', on: 'gulv', at: [200, 30] }, { id: 'k7', type: 'plank_l', on: 'gulv', at: [60, 40] },
      { id: 'k8', type: 'plank_s', on: 'gulv', at: [150, 30] }, { id: 'k9', type: 'weight', on: 'gulv', at: [60, 160] },
    ],
  };
  wr('trapp2', s);
}

// ---- Vippa, runde 2 ---------------------------------------------------------------------------
{
  const s = rd('vippe');
  s.name = 'Vippa, runde 2';
  s.source = { note: 'Byggebrett runde 2 (R125, barnerom): den andre hylla er 20 cm høyere enn den første og gapet er litt bredere. Vippa må stå på skrå (30 til 45 grader) for at lasten skal nå over; ligger den rett eller bare litt på skrå, tipper lasten ned i gapet. Den harde veien er den samme som i runde 1. Laget av tools/make_round2.mjs.' };
  obj(s, 'hylleB').box = [292.5, 345, 0, 60, 40, 120];
  obj(s, 'hylleB').help = 'Høy hylle\nHylla på den andre siden er høyere. Trykk BYGG og vri vippa med ↺ ↻ til den står på skrå, så lasten kommer opp. Ligger den rett, tipper lasten ned i gapet. Eller ta den harde veien.';
  s.goals = [
    { id: 'bygg', type: 'flag', flag: 'vippe2a', label: 'Bygg en vippe på skrå (BYGG-knappen)', en: 'Build a tilted seesaw (BUILD button)' },
    { id: 'flagg', type: 'reach', on: 's2', label: 'Nå flagget øverst', en: 'Reach the flag on top', gate: true },
  ];
  const old = s.build.sites[0];
  s.build.sites = [{ ...old, id: 'vippe2a', label: 'Gapet foran den høyeste hylla (vippe på skrå)', at: [276.25, 80], w: 100, h: 70, anchors: [[0, 5]], deck: [[-47.5, -16.25], [20, 47.5, 20]], start: [-40, 0], goal: [40, 20],
    stars: { three: { cost: 5, parts: 2 }, two: { cost: 8, parts: 4 } },
    ref: { placed: [{ id: 'v1', type: 'seesaw', u: 0, v: 1, rot: +(Math.PI / 6).toFixed(4) }], links: [], surfaces: [], route: old.ref.route } }];
  wr('vippe2', s);
}
export const makeRound2 = () => out;
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  for (const [f, sc] of Object.entries(out)) fs.writeFileSync(new URL(`../scenes/${f}.scene.json`, import.meta.url), sceneText(sc));
  console.log('trapp2 og vippe2: scener skrevet (kjør scene2level.mjs på begge)');
}
