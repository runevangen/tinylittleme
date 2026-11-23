// R147: språkvalget (nb/en) for brett: navnene i LEVELS (menyer, HUD) og teksten i selve brettet (hint-lapper, byggesteder, Byggeskolens løsningsnavn).
// Brett-JSON har `en`-felt ved siden av den norske teksten (laget av tools/add_levels_en.mjs). Her byttes teksten på stedet, så en åpen lapp følger språket uten omstart.

// id → [label, short] på engelsk (norsk står i LEVELS i main.js)
export const LEVEL_NAMES_EN = {
  bad: ['Level 1: The bathroom', 'Level 1 · Bathroom'], barnerom: ['Level 2: The nursery', 'Level 2 · Nursery'], kjokken: ['Level 3: The kitchen', 'Level 3 · Kitchen'],
  bad2: ['Level 4: The bathroom, rearranged', 'Level 4 · Bathroom'], barnerom2: ['Level 5: The nursery, rearranged', 'Level 5 · Nursery'], kjokken2: ['Level 6: The kitchen, tidied up', 'Level 6 · Kitchen'],
  leke: ['Level 7: The playroom', 'Level 7 · Playroom'], stue: ['Level 8: The living room', 'Level 8 · Living room'], verksted: ['Level 9: The workshop', 'Level 9 · Workshop'],
  bro: ['Build 1: The shelf bridge (build a bridge, or take the hard way)', 'Build · Bridge'], trapp: ['Build 2: The block stairs (build stairs, or take the hard way)', 'Build · Stairs'],
  vippe: ['Build 3: The seesaw over the gap (nursery: build a seesaw, or take the hard way)', 'Build · Seesaw'], kjokkenbro: ['Build 4: Bridge to the fridge (kitchen: build a bridge, or take the hard way)', 'Build · Kitchen bridge'],
  badebro: ['Build 5: The bridge over the bathtub (bathroom: build a bridge of triangles, or take the hard way)', 'Build · Bathtub bridge'],
  trapp2: ['Round 2 · Build 2: The block stairs, high shelf (build a tower and two ramps, or take the hard way)', 'Build · Stairs, round 2'],
  vippe2: ['Round 2 · Build 3: The seesaw over the high gap (nursery: tilt the seesaw, or take the hard way)', 'Build · Seesaw, round 2'],
  bro2: ['Round 2: The shelf bridge, big gap (build a steel truss, or take the hard way)', 'Round 2 · Shelf bridge'], kjokkenbro2: ['Round 2: Bridge to the fridge, an even bigger gap (steel truss, two goals)', 'Round 2 · Kitchen bridge'],
  soverom: ['Extra: Bedroom (hand-made)', 'Bedroom'], gaate: ['Test room: puzzles (plate, door, switch and drawbridge)', 'Puzzles'], poc: ['Test room: moving things', 'Test room'],
  klatring: ['Test room: climbing aids (pole, sponge, falls)', 'Climbing'], bygglab: ['Build school (Build lab): learn to build, eight build spots with a grid, wood, steel and rope. Optional, but recommended', 'Build school'],
  kontroll: ['The control course (test of steering and camera)', 'Control'],
};

// Gjør label/short på hvert nivå språkavhengige (getter). Norsk originaltekst ligger i l.nb (rapporter bruker den).
export function localizeLevels(levels, getLang) {
  for (const l of levels) {
    if (l.nb) continue;
    l.nb = { label: l.label, short: l.short };
    const en = LEVEL_NAMES_EN[l.id];
    Object.defineProperty(l, 'label', { enumerable: true, configurable: true, get: () => (getLang() === 'en' && en ? en[0] : l.nb.label) });
    Object.defineProperty(l, 'short', { enumerable: true, configurable: true, get: () => (getLang() === 'en' && en ? en[1] : l.nb.short) });
  }
  return levels;
}

const FIELDS = [['hints', 'text'], ['del', 'text'], ['add', 'text'], ['sites', 'label'], ['solutions', 'name']];
const orig = new WeakMap();   // objekt → norsk original, per felt
// Bytter teksten i hint-lappene, byggestedene og løsningsnavnene til `lang`. Tekst uten en-felt blir stående på norsk.
export function setLevelLang(level, lang) {
  if (!level) return 0;
  let n = 0;
  const seen = new Set();
  const swap = (o, field) => {
    if (!o || typeof o !== 'object' || seen.has(o) || typeof (orig.get(o)?.[field] ?? o[field]) !== 'string') return;
    seen.add(o);
    const m = orig.get(o) || {}; if (!(field in m)) { m[field] = o[field]; orig.set(o, m); }
    o[field] = lang === 'en' && o.en ? o.en : m[field]; n++;
  };
  const walk = (o, key) => {
    if (Array.isArray(o)) { for (const v of o) walk(v, key); return; }
    if (!o || typeof o !== 'object') return;
    for (const [k, f] of FIELDS) if (key === k) swap(o, f);
    for (const [k, v] of Object.entries(o)) if (v && typeof v === 'object' && k !== 'ref' && k !== 'grid') walk(v, k);
  };
  walk(level, '');
  return n;
}

export const levelNameL = (level, lang) => (lang === 'en' && level?.nameEn) || level?.name || '';
