// R151: scene → brett → bot, i node (scene2level og boten trenger fs og fysikken, og kan ikke kjøre i edge-funksjonen).
// Brukes av testene, av en eventuell node-vert for tjenesten og av «Sjekk» på en maskin. Skriver bare til en midlertidig mappe.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { botSolve } from './bot.mjs';

export function checkScene(scene, { bot = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scene-')), sin = path.join(dir, 's.scene.json'), lout = path.join(dir, 'l.level.json');
  try {
    fs.writeFileSync(sin, JSON.stringify(scene));
    const r = spawnSync(process.execPath, [fileURLToPath(new URL('./scene2level.mjs', import.meta.url)), sin, lout], { encoding: 'utf8', env: { ...process.env, SCENE2LEVEL_NO_EN: '1' } });
    if (!fs.existsSync(lout)) return { ran: true, solvable: false, why: 'scene2level feilet: ' + String(r.stderr || r.stdout).split('\n')[0].slice(0, 120) };
    const L = JSON.parse(fs.readFileSync(lout, 'utf8')), rep = L.report || {};
    const out = { ran: true, solvable_by_graph: !!rep.solvable_by_graph, helpers: (rep.helpers || []).map((h) => ({ id: h.id, size_cm: h.size_cm, at_cm: h.at_cm })), helperCount: (rep.helpers || []).length, level: L };
    if (!bot) return { ...out, solvable: out.solvable_by_graph };
    const b = botSolve(lout, { level: L });
    return { ...out, bot: b.verdict, solvable: b.verdict === 'BESTÅR_STRENG' || b.verdict === 'BESTÅR_LØS', tooManyHelpers: out.helperCount > 5 };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
