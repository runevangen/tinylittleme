// Hvilke «slag» ting (kind) spillet kjenner, og hvordan de tegnes. Brukes av scene-validatoren og av instruksen til
// bildetolkningen (docs/VISJON_PROMPT.md). Ukjent kind er lov: tingen tegnes da som en vanlig boks av riktig material.
// shaped: har egen form i props.js. Alle ting har uansett kollisjon som boks.
export const KINDS = {
  // fast innredning (grupper tegnes som én ting)
  tub:          { shaped: true,  group: true,  desc: 'badekar: lag fire bokser (to langsider, to ender) i samme group; en fare «pit» for innsiden; face: "S" setter kran og sluk i sørenden' },
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
  drawer:       { shaped: true,  desc: 'skuff (R55): tegnes åpen eller lukket etter «drawer»: { open, front, handle, style } i scenen; lukket front = decor: true' },
  knob:         { shaped: true,  desc: 'knott / håndtak (decor: true)' },
  towel:        { shaped: true,  desc: 'brettet håndkle (frotté)' },
  towel_hang:   { shaped: true,  desc: 'håndkle som henger langs en vegg; sett grip: true for klatring' },
  mat:          { shaped: true,  desc: 'matte / dørmatte' },
  basket:       { shaped: true,  desc: 'vaskekurv / flettet kurv' },
  hamper:       { shaped: true,  desc: 'firkantet flettet kurv: vaskekurv med lokk; id med «aapen» gir åpen kurv (hylle)' },
  toyblock:     { shaped: true,  desc: 'trekloss (avrundet terning); høyere enn bred = flere stablet' },
  letterblock:  { shaped: true,  desc: 'bokstavkloss (pastell, avrundet, bokstav på sidene): bokstaven er siste tegn i id-en etter «_» (bokstav_a); høyere enn bred = stablet, hvert lag neste bokstav; kan være movable' },
  legoblock:    { shaped: true,  desc: 'Lego-aktig kloss med knotter oppå (knottene ligger innenfor boksen, ca. 0,6 cm): stables og klatres på, ca. 10 cm høy per lag' },
  toycar:       { shaped: true,  desc: 'leketøysbil (varebil/buss) i fast boks (med movable light: skyves og tuter, R18): hele boksen er karosseri med flat topp, hjul og vinduer er pynt; lengste side er kjøreretningen' },
  tennisball:   { shaped: true,  desc: 'tennisball (R18): movable light, boksen må være en kube (ca. 13 cm); piper og ruller videre når den dyttes eller lander' },
  rockinghorse: { shaped: true,  desc: 'vippehest (R18): movable heavy, ca. 24×10×16 cm; gynger og knirker når du lander på den; lengste side er langsaksen' },
  windup:       { shaped: true,  desc: 'wind-up-robot av blikk (R18): movable light, ca. 10×8×14 cm; TA den og slipp den, så går den noen skritt og stopper' },
  jackbox:      { shaped: true,  desc: 'sprettboks (R18): movable medium, kube ca. 14 cm; lokket slår opp og klovnen spretter ut når du lander på den eller tar den' },
  ball:         { shaped: true,  desc: 'ball (løs kule med ekte kulekollisjon; boksen må være en kube)' },
  bag:          { shaped: true,  desc: 'pose / toalettveske' },
  caddy:        { shaped: true,  desc: 'dusjkurv (kromtråd)' },
  pole:         { shaped: true,  desc: 'doskrubb / stang' },
  // listverk (lister og foringer, ofte decor: true)
  listverk:     { shaped: true,  desc: 'listverk (lister og foringer, generell): lang og smal, tegnes med profil' },
  fotlist:      { shaped: true,  desc: 'fotlist / gulvlist (langs gulv og vegg), ca. 10–12 cm høy' },
  taklist:      { shaped: true,  desc: 'taklist / gesims (hulkil mellom vegg og tak)' },
  gerikt:       { shaped: true,  desc: 'gerikt (list rundt dør og vindu); også dørfôr/vindusfôr' },
  // klatrehjelp
  qtip:         { shaped: true,  desc: 'ørepinne (stav): movable light + pole: 1.5' },
  sponge:       { shaped: true,  desc: 'svamp: movable light + soft: true' },
  water_bowl:   { shaped: true,  desc: 'vannskål (R41): lav, fast boks med vann; en svamp du bærer og TA-trykker ved den blir våt (tung og myk)' },
  paper_pile:   { shaped: true,  desc: 'haug med dopapir: soft: true (fast myk flate); compress: true = kan presses sammen til halv høyde av en tung ting du bærer (R41)' },
  needle:       { shaped: true,  desc: 'nål: movable light + tool: "needle" (trædes med en trådsnelle til en taubane)' },
  spool:        { shaped: true,  desc: 'trådsnelle: movable light + tool: "spool" + thread: true' },
  key:          { shaped: true,  desc: 'nøkkel (R7): movable light, ca. 14×3×6 cm; brukes i en gåte (`puzzles` i scenen) og legges på en plate for å rulle ut en bro' },
  gel_bottle:   { shaped: true,  desc: 'hårgelé: movable light + tool: "gel"' },
  // verksted (R63): vanlige bokser med verkstedsutseende gjennom material og farge, unntatt dekket som ruller
  oil:          { shaped: false, desc: 'oljeflekk (R63): lav boks med slick: true; du sklir uten grep, tegnes med glansstriper og rød ✕' },
  toolbox:      { shaped: false, desc: 'verktøykasse (metall, vanlig boks); slick: true gir et oljet lokk' },
  vise:         { shaped: false, desc: 'skrustikke (metall, vanlig boks)' },
  nut:          { shaped: false, desc: 'mutter (R63): movable light, ca. 8 cm kube; veier 2 på en trykkplate' },
  tire:         { shaped: true,  desc: 'sykkeldekk (R63): movable light, kube ca. 14 cm; ekte kulekollisjon (ruller når du dytter det), bæres med TA' },
};
export const MATERIALS = ['wood', 'woodpanel', 'tile', 'porcelain', 'ceramic', 'plastic', 'fabric', 'paper', 'metal', 'glass', 'mirror', 'wicker', 'book', 'plaster'];
export const WEIGHTS = ['light', 'medium', 'heavy'];
export const HAZARDS = ['pit', 'flush'];
export const TOOLS = ['gel', 'roll', 'needle', 'spool'];
