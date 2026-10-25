// Hvilke «slag» ting (kind) spillet kjenner, og hvordan de tegnes. Brukes av scene-validatoren og av instruksen til
// bildetolkningen (docs/VISJON_PROMPT.md). Ukjent kind er lov: tingen tegnes da som en vanlig boks av riktig material.
// shaped: har egen form i props.js. Alle ting har uansett kollisjon som boks.
export const KINDS = {
  // fast innredning (grupper tegnes som én ting)
  tub:          { shaped: true,  group: true,  desc: 'badekar: lag fire bokser (to langsider, to ender) i samme group; en fare «pit» for innsiden' },
  toilet_tank:  { shaped: true,  group: true,  desc: 'do: sisterne (stående boks mot veggen), i samme group som toilet_bowl' },
  toilet_bowl:  { shaped: true,  group: true,  desc: 'do: skålen som fire bokser rundt et hull (fare «flush» i hullet), i samme group' },
  toilet_lid:   { shaped: true,  group: true,  desc: 'do: åpent lokk (tynn stående boks mot sisternen), i samme group' },
  vanity:       { shaped: true,  desc: 'vaskeskap (tre) med dører' },
  vanity_top:   { shaped: true,  desc: 'benkeplate/vask (porselen), flat topp; sluk og vann tegnes automatisk' },
  chest:        { shaped: false, desc: 'kommode, benk, hylle, kasse av tre (vanlig boks)' },
  table:        { shaped: false, desc: 'bord (vanlig boks)' },
  box:          { shaped: false, desc: 'eske / enkel boks' },
  crate:        { shaped: false, desc: 'kasse (tre)' },
  vase:         { shaped: false, desc: 'vase / skjør pynteting (breakable: true)' },
  wall_cabinet: { shaped: false, desc: 'veggskap' },
  door:         { shaped: false, desc: 'dør / åpen skapdør' },
  sill:         { shaped: false, desc: 'vinduskarm' },
  shelf:        { shaped: true,  desc: 'glasshylle med braketter' },
  mirror:       { shaped: true,  desc: 'speil med ramme (bruk decor: true)' },
  light_box:    { shaped: true,  desc: 'lampeboks / lysrør over speil' },
  // småting (kan være movable)
  bottle:       { shaped: true,  desc: 'flaske (såpe, sjampo …); id med «pump» får pumpehode' },
  tube:         { shaped: true,  desc: 'tube (tannkrem)' },
  faucet:       { shaped: true,  desc: 'kran (krom)' },
  shaver:       { shaped: true,  desc: 'barbermaskin / føner' },
  roll:         { shaped: true,  desc: 'toalettrull' },
  cup:          { shaped: true,  desc: 'tannglass / kopp' },
  toothbrush:   { shaped: true,  desc: 'tannbørste' },
  knob:         { shaped: true,  desc: 'knott / håndtak (decor: true)' },
  towel:        { shaped: true,  desc: 'brettet håndkle (frotté)' },
  towel_hang:   { shaped: true,  desc: 'håndkle som henger langs en vegg; sett grip: true for klatring' },
  mat:          { shaped: true,  desc: 'matte / dørmatte' },
  basket:       { shaped: true,  desc: 'vaskekurv / flettet kurv' },
  bag:          { shaped: true,  desc: 'pose / toalettveske' },
  caddy:        { shaped: true,  desc: 'dusjkurv (kromtråd)' },
  pole:         { shaped: true,  desc: 'doskrubb / stang' },
  // klatrehjelp
  qtip:         { shaped: true,  desc: 'ørepinne (stav): movable light + pole: 1.5' },
  sponge:       { shaped: true,  desc: 'svamp: movable light + soft: true' },
  paper_pile:   { shaped: true,  desc: 'haug med dopapir: soft: true (fast myk flate)' },
  needle:       { shaped: true,  desc: 'nål: movable light + tool: "needle" (trædes med en trådsnelle til en taubane)' },
  spool:        { shaped: true,  desc: 'trådsnelle: movable light + tool: "spool" + thread: true' },
  gel_bottle:   { shaped: true,  desc: 'hårgelé: movable light + tool: "gel"' },
};
export const MATERIALS = ['wood', 'woodpanel', 'tile', 'porcelain', 'ceramic', 'plastic', 'fabric', 'paper', 'metal', 'glass', 'mirror', 'wicker', 'book', 'plaster'];
export const WEIGHTS = ['light', 'medium', 'heavy'];
export const HAZARDS = ['pit', 'flush'];
export const TOOLS = ['gel', 'roll', 'needle', 'spool'];
