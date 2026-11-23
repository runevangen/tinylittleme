// Scene (tolket fra bilder) → spillbart brett, med enkel rute-validering og hjelpeobjekter. Selve omregningen ligger i ../scene2level_core.js (R152, også brukt i spillet).
// Bruk: node tools/scene2level.mjs scenes/bad.scene.json levels/bad.level.json
// Bekreft etterpå med fysikk-boten: node tools/solve.mjs spenning --level=<fil>
import { applyLevelEn } from './add_levels_en.mjs';
import fs from 'node:fs';
import { applyEasyPatch, levelEasy } from './scene_patch.mjs';
import { sceneToLevel } from '../scene2level_core.js';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) { console.error('bruk: scene2level.mjs <scene.json> <level.json>'); process.exit(1); }
const scene = JSON.parse(fs.readFileSync(inPath, 'utf8'));
let r;
try { r = sceneToLevel(scene, { applyEasyPatch, levelEasy, debug: !!process.env.DEBUG }); } catch (e) { console.error(e.message); process.exit(1); }
const { level, noValidate, solvable, helpers, boxes, hazards, holds, decor, movables } = r;
if (!process.env.SCENE2LEVEL_NO_EN) applyLevelEn(level);   // R147: engelske tekster (en-felt) fra tools/levels_en_data.mjs
fs.mkdirSync(outPath.replace(/[^/]+$/, '') || '.', { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(level, null, 1));
console.log(`${level.name}: ${boxes.length} bokser, ${hazards.length} farer, ${holds.length} klatretak (ennå ubrukt), ${decor.length} dekor`);
console.log(`løse ting (kan flyttes): ${movables.length}`);
console.log(noValidate ? 'rute-graf: hoppet over (validate:false, brettet er laget for å flytte ting)' : `rute-graf: ${solvable ? 'MÅL NÅS' : 'MÅL IKKE NÅDD'}  |  hjelpeobjekter lagt inn: ${helpers.length}`);
for (const h of helpers) console.log(`  + ${h.id.padEnd(16)} ${h.size_cm.join('×')} cm, topp ${h.top_cm} cm, ved (${h.at_cm.join(', ')})`);
process.exit(solvable || noValidate ? 0 : 2);
