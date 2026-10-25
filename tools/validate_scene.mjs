// Kontrollerer en scene (tolket fra bilder) før den gjøres om til et brett.
// Bruk: node tools/validate_scene.mjs scenes/bad.scene.json [--strict]
// Feil (exit 1) = brettet kan ikke lages riktig. Advarsler = sannsynlige tolkningsfeil som et menneske bør se på.
import fs from 'node:fs';
import { KINDS, MATERIALS, WEIGHTS, HAZARDS, TOOLS } from '../kinds.js';

export function validateScene(scene) {
  const errors = [], warns = [];
  const err = (m) => errors.push(m), warn = (m) => warns.push(m);
  const num = (v) => typeof v === 'number' && Number.isFinite(v);
  const R = scene.room;
  if (scene.units !== 'cm') err('units må være "cm"');
  if (!R || !num(R.width) || !num(R.depth) || !num(R.height) || R.width <= 0 || R.depth <= 0 || R.height <= 0) { err('room.width/depth/height må være positive tall (cm)'); return { errors, warns }; }
  if (R.width > 800 || R.depth > 800 || R.height > 400) warn(`rommet er stort (${R.width}×${R.depth}×${R.height} cm). Stemmer målene?`);
  for (const [k, w] of [['floor', R.floor], ['walls', R.walls], ['ceiling', R.ceiling]]) if (!w || !w.material) err(`room.${k}.material mangler`);
  const inRoom = (x, z) => num(x) && num(z) && x >= 0 && x <= R.width && z >= 0 && z <= R.depth;
  if (!scene.start || !inRoom(scene.start.x, scene.start.z)) err('start.x/z må ligge i rommet');
  if (!scene.goal || !inRoom(scene.goal.x, scene.goal.z) || !num(scene.goal.y)) err('goal.x/y/z må ligge i rommet');
  if (!Array.isArray(scene.objects) || !scene.objects.length) { err('objects mangler eller er tom'); return { errors, warns }; }

  const ids = new Set(), groups = {};
  for (const [i, o] of scene.objects.entries()) {
    const w = `objekt ${o.id ?? '#' + i}`;
    if (typeof o.id !== 'string' || !o.id) { err(`objekt #${i}: id mangler`); continue; }
    if (ids.has(o.id)) err(`${w}: id brukes flere ganger`); ids.add(o.id);
    if (!Array.isArray(o.box) || o.box.length !== 6 || !o.box.every(num)) { err(`${w}: box må være [x0,x1,y0,y1,z0,z1] i cm`); continue; }
    const [x0, x1, y0, y1, z0, z1] = o.box;
    if (!(x0 < x1 && y0 < y1 && z0 < z1)) err(`${w}: box må ha min < maks i alle tre retninger ([x0,x1,y0,y1,z0,z1])`);
    const m = 6;
    if (x0 < -m || x1 > R.width + m || z0 < -m || z1 > R.depth + m || y0 < -m || y1 > R.height + m) warn(`${w}: ligger utenfor rommet`);
    if (!MATERIALS.includes(o.material)) warn(`${w}: ukjent material «${o.material}» (tegnes som vanlig plast). Kjente: ${MATERIALS.join(', ')}`);
    if (!/^#[0-9a-fA-F]{6}$/.test(o.color || '')) err(`${w}: color må være #rrggbb`);
    if (!KINDS[o.kind]) warn(`${w}: kind «${o.kind}» er ukjent og tegnes som en vanlig boks`);
    if (o.movable !== undefined && !WEIGHTS.includes(o.movable)) err(`${w}: movable må være ${WEIGHTS.join('|')}`);
    if (o.movable === 'light' && Math.max(x1 - x0, y1 - y0, z1 - z0) > 17) warn(`${w}: lett ting større enn 17 cm kan ikke bæres (grense 3,4 enheter)`);
    if (o.tool !== undefined && !TOOLS.includes(o.tool)) err(`${w}: tool må være ${TOOLS.join('|')}`);
    if (o.onto && !scene.objects.some((x) => x.id === o.onto)) err(`${w}: onto «${o.onto}» finnes ikke`);
    if (o.onto && !o.grip) warn(`${w}: onto gir bare mening sammen med grip: true`);
    if (o.tool && !o.movable) err(`${w}: tool krever movable: "light"`);
    if (o.pole !== undefined && !(num(o.pole) && o.pole > 0)) err(`${w}: pole må være et positivt tall (stavlengde i enheter)`);
    if (o.confidence !== undefined && !(o.confidence >= 0 && o.confidence <= 1)) err(`${w}: confidence må være 0–1`);
    if (o.group) (groups[o.group] ||= []).push(o);
    if (o.confidence !== undefined && o.confidence < 0.5) warn(`${w}: lav sikkerhet (${o.confidence}) – be brukeren sjekke`);
  }
  for (const [g, ms] of Object.entries(groups)) {
    const kinds = ms.map((m) => m.kind);
    if (kinds.includes('toilet_tank') !== kinds.includes('toilet_bowl')) err(`gruppe «${g}»: do trenger både toilet_tank og toilet_bowl`);
    if (kinds.some((k) => k === 'tub') && ms.length < 3) warn(`gruppe «${g}»: badekar bør ha minst tre bokser (sider og ender)`);
  }
  for (const [i, h] of (scene.hazards || []).entries()) {
    if (!HAZARDS.includes(h.type)) err(`fare #${i}: type må være ${HAZARDS.join('|')}`);
    if (!Array.isArray(h.box) || h.box.length !== 6 || !h.box.every(num)) err(`fare #${i}: box må være 6 tall`);
  }
  // overlapp mellom faste, ikke-gruppe-ting (mer enn 2 cm i alle tre retninger) er sannsynlig feil i tolkningen
  const solid = scene.objects.filter((o) => Array.isArray(o.box) && o.box.length === 6 && !o.movable && !o.decor);
  for (let a = 0; a < solid.length; a++) for (let b = a + 1; b < solid.length; b++) {
    const A = solid[a], B = solid[b]; if (A.group && A.group === B.group) continue;
    const ov = (i) => Math.min(A.box[i * 2 + 1], B.box[i * 2 + 1]) - Math.max(A.box[i * 2], B.box[i * 2]);
    if (ov(0) > 2 && ov(1) > 2 && ov(2) > 2) warn(`${A.id} og ${B.id} overlapper (${ov(0).toFixed(0)}×${ov(1).toFixed(0)}×${ov(2).toFixed(0)} cm)`);
  }
  return { errors, warns };
}

if (process.argv[1] && process.argv[1].endsWith('validate_scene.mjs')) {
  const file = process.argv[2], strict = process.argv.includes('--strict');
  if (!file) { console.error('bruk: validate_scene.mjs <scene.json> [--strict]'); process.exit(2); }
  const { errors, warns } = validateScene(JSON.parse(fs.readFileSync(file, 'utf8')));
  for (const e of errors) console.log('FEIL     ', e);
  for (const w of warns) console.log('advarsel ', w);
  console.log(`${file}: ${errors.length} feil, ${warns.length} advarsler`);
  process.exit(errors.length || (strict && warns.length) ? 1 : 0);
}
