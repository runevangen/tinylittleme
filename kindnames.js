// R171/R175: norske og engelske navn på tingtyper (kind), til VIS TOLKNING, JUSTER og navnelappene i flymodus.
// Alle typene i kinds.js har navn på begge språk (test_leditor). Ukjent type (modellen finner på egne): kjente engelske navn under, ellers «pent» id-navn.
const NB = {
  tub: 'badekar', toilet_tank: 'do-sisterne', toilet_bowl: 'do', toilet_lid: 'dolokk', vanity: 'vaskeskap', vanity_top: 'servant', chest: 'kommode', table: 'bord', bed: 'seng', desk: 'skrivebord', shelf_unit: 'hylleenhet', lamp: 'lampe', pouffe: 'puff', suitcase: 'koffert', box: 'eske', crate: 'kasse', vase: 'vase',
  wall_cabinet: 'veggskap', door: 'dør', sill: 'vinduskarm', shelf: 'hylle', mirror: 'speil', light_box: 'lampe', bottle: 'flaske', tube: 'tube', faucet: 'kran', shaver: 'føner', roll: 'toalettrull',
  cup: 'glass', toothbrush: 'tannbørste', drawer: 'skuff', knob: 'knott', towel: 'håndkle', towel_hang: 'hengende håndkle', mat: 'matte', basket: 'kurv', hamper: 'kurv med lokk', toyblock: 'trekloss',
  letterblock: 'bokstavkloss', legoblock: 'legokloss', toycar: 'leketøysbil', tennisball: 'tennisball', rockinghorse: 'vippehest', windup: 'opptrekksrobot', jackbox: 'sprettboks', ball: 'ball', bag: 'pose',
  caddy: 'dusjkurv', pole: 'stang', listverk: 'listverk', fotlist: 'fotlist', taklist: 'taklist', gerikt: 'gerikt', qtip: 'ørepinne', sponge: 'svamp', water_bowl: 'vannskål', paper_pile: 'papirhaug',
  needle: 'nål', spool: 'trådsnelle', key: 'nøkkel', rug: 'teppe', sofa: 'sofa', cushion: 'pute', tv: 'TV', remote: 'fjernkontroll', gel_bottle: 'hårgelé', oil: 'oljeflekk', toolbox: 'verktøykasse',
  vise: 'skrustikke', nut: 'mutter', tire: 'dekk', stone: 'stein', grass: 'gress', gravel: 'grus', bench: 'benk', stairs: 'trapp', hedge: 'hekk', playground: 'lekeapparat', water: 'vann', curb: 'kantstein',
};
const EN = {
  tub: 'bathtub', toilet_tank: 'toilet tank', toilet_bowl: 'toilet', toilet_lid: 'toilet lid', vanity: 'vanity', vanity_top: 'sink top', chest: 'chest', table: 'table', bed: 'bed', desk: 'desk', shelf_unit: 'shelf unit', lamp: 'lamp', pouffe: 'pouffe', suitcase: 'suitcase', box: 'box', crate: 'crate', vase: 'vase',
  wall_cabinet: 'wall cabinet', door: 'door', sill: 'window sill', shelf: 'shelf', mirror: 'mirror', light_box: 'light', bottle: 'bottle', tube: 'tube', faucet: 'tap', shaver: 'hair dryer', roll: 'toilet roll',
  cup: 'cup', toothbrush: 'toothbrush', drawer: 'drawer', knob: 'knob', towel: 'towel', towel_hang: 'hanging towel', mat: 'mat', basket: 'basket', hamper: 'hamper', toyblock: 'toy block',
  letterblock: 'letter block', legoblock: 'Lego block', toycar: 'toy car', tennisball: 'tennis ball', rockinghorse: 'rocking horse', windup: 'wind-up robot', jackbox: 'jack-in-the-box', ball: 'ball', bag: 'bag',
  caddy: 'shower caddy', pole: 'pole', listverk: 'trim', fotlist: 'skirting board', taklist: 'ceiling trim', gerikt: 'door trim', qtip: 'cotton bud', sponge: 'sponge', water_bowl: 'water bowl', paper_pile: 'paper pile',
  needle: 'needle', spool: 'spool', key: 'key', rug: 'rug', sofa: 'sofa', cushion: 'cushion', tv: 'TV', remote: 'remote', gel_bottle: 'hair gel', oil: 'oil spill', toolbox: 'toolbox',
  vise: 'vise', nut: 'nut', tire: 'tyre', stone: 'stone', grass: 'grass', gravel: 'gravel', bench: 'bench', stairs: 'stairs', hedge: 'hedge', playground: 'play equipment', water: 'water', curb: 'curb',
};
// Navn på typer modellen ofte finner på selv (ikke i kinds.js)
const EXTRA_NB = { bed: 'seng', desk: 'skrivebord', lamp: 'lampe', bookshelf: 'bokhylle', window: 'vindu', curtain: 'gardin', blind: 'rullegardin', suitcase: 'koffert', stool: 'krakk', chair: 'stol',
  wardrobe: 'garderobe', cabinet: 'skap', fridge: 'kjøleskap', stove: 'komfyr', sink: 'vask', couch: 'sofa', pouffe: 'puff', ottoman: 'puff', ironing_board: 'strykebrett', side_table: 'sidebord',
  tv_stand: 'TV-benk', plant: 'plante', picture: 'bilde', poster: 'plakat', frame: 'ramme', speaker: 'høyttaler', heater: 'panelovn', radiator: 'radiator', laptop: 'bærbar PC', sewing_machine: 'symaskin',
  nightstand: 'nattbord', pillow: 'pute', blanket: 'pledd', duvet: 'dyne', bedside_table: 'nattbord', coffee_table: 'salongbord', dresser: 'kommode', wall: 'vegg', floor: 'gulv', ceiling: 'tak',
  fotlist_: 'fotlist', trim: 'list', shelf_unit: 'hylleenhet', sofa_bed: 'sovesofa', sofabed: 'sovesofa', bin: 'søppelbøtte', trash_can: 'søppelbøtte', wastebasket: 'søppelbøtte', clock: 'klokke' };
const EXTRA_EN = { bed: 'bed', desk: 'desk', lamp: 'lamp', bookshelf: 'bookshelf', window: 'window', curtain: 'curtain', blind: 'blind', suitcase: 'suitcase', stool: 'stool', chair: 'chair', wardrobe: 'wardrobe',
  cabinet: 'cabinet', fridge: 'fridge', stove: 'stove', sink: 'sink', couch: 'couch', pouffe: 'pouffe', ottoman: 'ottoman', ironing_board: 'ironing board', side_table: 'side table', tv_stand: 'TV stand',
  plant: 'plant', picture: 'picture', poster: 'poster', frame: 'frame', speaker: 'speaker', heater: 'heater', radiator: 'radiator', laptop: 'laptop', sewing_machine: 'sewing machine', nightstand: 'nightstand',
  pillow: 'pillow', blanket: 'blanket', duvet: 'duvet', bedside_table: 'bedside table', coffee_table: 'coffee table', dresser: 'dresser', wall: 'wall', floor: 'floor', ceiling: 'ceiling', trim: 'trim',
  shelf_unit: 'shelf unit', sofa_bed: 'sofa bed', sofabed: 'sofa bed', bin: 'bin', trash_can: 'bin', wastebasket: 'bin', clock: 'clock' };
export const KIND_NAMES = { nb: NB, en: EN };
const pretty = (s) => String(s || '').toLowerCase().replace(/[_\-\d]+/g, ' ').replace(/\s+/g, ' ').trim();
// Navn for en type på valgt språk. Ukjent type: kjent engelsk navn (for norsk også norsk), ellers «pent» id-navn.
export function kindName(kind, lang = 'nb') {
  const k = String(kind || '').toLowerCase().trim(), en = lang === 'en', base = en ? EN : NB, extra = en ? EXTRA_EN : EXTRA_NB;
  return base[k] || extra[k] || pretty(k) || (en ? 'thing' : 'ting');
}
// Navn for en ting: typen først, så id-en som det modellen kalte den hvis typen er ukjent eller «box»
export function thingName(kind, id, lang = 'nb') {
  const k = String(kind || '').toLowerCase(), known = !!(NB[k] || EXTRA_NB[k]);
  if (known && k !== 'box') return kindName(k, lang);
  const idp = pretty(id); return idp ? (lang === 'en' ? idp : (EXTRA_NB[String(id).toLowerCase().replace(/\d+$/, '').replace(/_+$/, '')] || idp)) : kindName(k, lang);
}
