// Nivå 9: Verkstedet/garasjen (R63). Det mest «tekniske» rommet: olje, verktøy og tung maskineri i liten skala.
// Skriver scenes/verksted.scene.json. Bruk: node tools/make_verksted.mjs && node tools/scene2level.mjs scenes/verksted.scene.json levels/verksted.level.json && node tools/walk_route.mjs levels/verksted.level.json
// Rommet (cm, x øst, z sør): gulv med oljeflekk (glatt) og et sykkeldekk som ruller -> kasse -> verktøykasse med oljet lokk (glatt) -> filleryy (grep) opp på arbeidsbenken
// -> gåtekammeret (to trykkplater, fem mutre: 3 på den tunge og 2 på den lette) -> port -> verktøyvegg (hull = grep) opp på hylla -> målet.
// Byggestedet (tape): to lange planker teipet sammen over porten, fra hylla over kammeret til hylla etter porten (snarvei forbi gåten). Den harde veien er gåten.
import fs from 'node:fs';
import { autoCrumbs } from './place_crumbs.mjs';

const o = (id, kind, material, color, box, extra = {}) => ({ id, kind, material, color, box, confidence: 1, photos: [], ...extra });
const OIL = '#23252b', RED = '#c9382f', GREY = '#8a929c', STEEL = '#aeb6bf', WOOD = '#b98a55', YEL = '#f0b429';
const s = {
  name: 'Nivå 9: Verkstedet', units: 'cm', frame: 'Origo i nordvestre hjørne. x øst, z sør, y opp.', validate: true, rev: 1,
  source: { photos: 0, views: [], interpreted_by: 'Oppdiktet rom (ikke fra bilder), laget for nivå 9 (R63): verksted/garasje i barneskala.', scale_anchors: ['arbeidsbenk 76 cm', 'verktøykasse 36 cm', 'mutter 8 cm'], uncertainty: 'Ingen: rommet er tegnet for spillet.',
    note: 'Nivå 9 (R63). Glatt olje på gulvet og på verktøykassa; fille og verktøyvegg å klatre i; vektgåte med to plater og en port; tape-bro som snarvei.' },
  room: { width: 700, depth: 260, height: 260, floor: { material: 'plaster', color: '#8f949b', slick: false }, walls: { material: 'plaster', color: '#c9c3b6' }, ceiling: { material: 'plaster', color: '#9aa0a8' } },
  start: { x: 30, z: 150 }, goal: { x: 542, y: 122, z: 30, on: 'maal', note: 'Motgift-bit i verktøykassa øverst på hylla til høyre.' },
  windows: [{ wall: 'N', z: 470, y: 160, w: 110, h: 70 }],
  hazards: [],
  objects: [
    // oljeflekken på gulvet (glatt): lav, så du går rett inn i den. Det er plass til å gå utenom langs sørveggen.
    o('olje_1', 'oil', 'plastic', OIL, [70, 175, 0, 2, 60, 205], { slick: true, help: 'Oljeflekk\nGlatt! Uten grep sklir du. Gå utenom, eller bruk farten: stikka styrer, men bremsene virker nesten ikke.' }),
    o('dekk_1', 'tire', 'plastic', '#2b2d31', [40, 54, 0, 14, 215, 229], { movable: 'light', help: 'Sykkeldekk\nDytt det med stikka så ruller det. Det kan også bæres med TA.' }),
    o('kasse_1', 'crate', 'wood', WOOD, [190, 245, 0, 18, 100, 175], { cp: true }),
    o('verktoykasse', 'toolbox', 'metal', RED, [245, 322, 0, 32, 70, 180], { slick: true, cp: true, help: 'Verktøykasse\nLokket er oljet og glatt. Gå inntil fillen og hold GREP for å klatre opp på arbeidsbenken.' }),
    o('fille', 'towel_hang', 'fabric', YEL, [322, 326, 32, 56, 110, 150], { grip: true, onto: 'benk_v', grip_drain: -0.3, help: 'Oljefille\nHold GREP mot fillen og klatre opp på arbeidsbenken. Den er ikke glatt.' }),
    o('benk_v', 'table', 'wood', '#9c7348', [326, 510, 0, 56, 0, 200], { cp: true }),   // arbeidsbenken i to deler (ingen sprekk): vest for porten (gåtekammeret) og øst for porten
    o('benk_o', 'table', 'wood', '#9c7348', [510, 700, 0, 56, 0, 200], { cp: true }),
    o('skrustikke', 'vise', 'metal', GREY, [336, 366, 56, 72, 10, 50], { help: 'Skrustikke\nTung og fast. Hopp opp på den med HOPP, eller gå utenom.' }),
    // gåtekammeret på benken: fem mutre (lette, kan bæres med TA) og to plater. Venstre plate trenger tre, høyre to.
    ...[[352, 62], [352, 87], [352, 112], [352, 137], [352, 160]].map(([x, z], i) => o(`mutter_${i + 1}`, 'nut', 'metal', STEEL, [x - 4, x + 4, 56, 64, z - 4, z + 4], { movable: 'light', ...(i === 0 ? { help: 'Mutre\nBær en mutter med TA og sett den på en trykkplate (TA igjen). Den tunge plata trenger tre, den lette to.' } : {}) })),
    // bro-hyllene: verktøyvegg 1 (vest, før porten) og 2 (øst, etter porten). Grep-flatene er hullbrett; toppen av hylla er det du kommer opp på.
    o('hylle_v', 'shelf', 'metal', STEEL, [427.5, 457.5, 96, 106, 0, 60]),
    o('vegg_v', 'towel_hang', 'metal', '#5f7ea8', [427.5, 457.5, 56, 106, 60, 64], { grip: true, onto: 'hylle_v', grip_drain: -0.2, help: 'Verktøyvegg\nHullbrett med knagger: hold GREP mot veggen og klatre opp på hylla. Her kan du bygge en bro til neste hylle.' }),
    o('hylle_o', 'shelf', 'metal', STEEL, [502.5, 580, 96, 106, 0, 60]),
    o('hylle_o2', 'shelf', 'metal', STEEL, [580, 700, 96, 106, 0, 60]),
    o('vegg_o', 'towel_hang', 'metal', '#5f7ea8', [640, 700, 56, 106, 60, 64], { grip: true, onto: 'hylle_o2', grip_drain: -0.2, help: 'Verktøyvegg\nHold GREP mot hullbrettet og klatre opp på hylla. Gå så tilbake langs hylla: målet er verktøykassa øverst.' }),
    o('maal', 'toolbox', 'metal', '#2f8f55', [525, 560, 106, 122, 10, 50], { cp: true }),
  ],
  look: { exposure: 1.0, sun: 2.4 }, audio: { reverb: 0.25, theme: 'verksted' },
  ants: [
    { id: 'maur_1', type: 'ant', on: 'gulv', from: [110, 232], to: [300, 232] },
    { id: 'maur_2', type: 'ant', on: 'benk_o', from: [540, 130], to: [690, 130] },
    { id: 'veps_1', type: 'wasp', on: 'gulv', from: [110, 55], to: [235, 55], alt: 45 },
  ],
  gates: {
    plates: [
      { id: 'pv', on: 'benk_v', box: [400, 440, 105, 145], need: 6, label: 'Tung plate', en: 'Heavy plate' },
      { id: 'ph', on: 'benk_v', box: [460, 500, 105, 145], need: 4, label: 'Lett plate', en: 'Light plate' },
    ],
    switches: [],
    doors: [{ id: 'port', kind: 'door', box: [506, 514, 56, 92, 0, 200], needs: ['pv', 'ph'], dir: 'down', label: 'Porten', en: 'The gate' }],
  },
  goals: [
    { id: 'smuler', type: 'crumbs', n: 6, label: 'Samle 6 smuler', en: 'Collect 6 crumbs' },
    { id: 'port', type: 'gate', door: 'port', label: 'Åpne porten (begge platene samtidig)', en: 'Open the gate (both plates at once)' },
    { id: 'bygg', type: 'flag', flag: 'verksted1', label: 'Bygg en teipet bro over porten (BYGG-knappen)', en: 'Build a taped bridge over the gate (BUILD button)' },
    { id: 'vegg', type: 'reach', on: 'hylle_o', gate: true, label: 'Klatre verktøyveggen', en: 'Climb the tool wall' },
  ],
  build: {
    sites: [{ id: 'verksted1', label: 'Gapet over porten', at: [480, 30], y: 106, w: 120, h: 60, d: 20, anchors: [[-22.5, 0], [22.5, 0]], deck: [[-52.5, -22.5], [22.5, 52.5]], start: [-45, 0], goal: [45, 0],
      ref: { placed: [{ id: 'p1', type: 'plank_l', u: -2, v: 0.25, rot: 0 }, { id: 'p2', type: 'plank_l', u: 2, v: 0.75, rot: 0 }],
        links: [{ id: 'k1', kind: 'tape', a: 'p2', la: { x: -2, y: -0.25 }, b: 'p1', lb: { x: 2, y: 0.25 } }], surfaces: [{ id: '@bro', u0: -6, u1: 6, top: 0.58, tol: 0.26 }], route: ['gulv', 'kasse_1', 'verktoykasse', 'fille', 'benk_v', 'vegg_v', 'hylle_v', '@bro', 'hylle_o', 'maal'] } }],
    parts: [{ id: 'p1', type: 'plank_l', on: 'benk_v', at: [378, 20] }, { id: 'p2', type: 'plank_l', on: 'benk_v', at: [378, 40] }, { id: 'p3', type: 'plank_s', on: 'benk_v', at: [395, 20] }, { id: 'p4', type: 'ruler', on: 'benk_v', at: [395, 40] },
      { id: 'p5', type: 'pencil', on: 'benk_v', at: [412, 40] }, { id: 'p6', type: 'weight', on: 'verktoykasse', at: [270, 100] }, { id: 'p7', type: 'block', on: 'verktoykasse', at: [295, 100] }, { id: 'p8', type: 'lego', on: 'gulv', at: [150, 230] }],
  },
};
s.collectibles = autoCrumbs(s);
fs.writeFileSync(new URL('../scenes/verksted.scene.json', import.meta.url), JSON.stringify(s, null, 2) + '\n');
console.log('skrev scenes/verksted.scene.json');
