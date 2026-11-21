// R98: kontroll av «neste mål» i alle brett og vanskelighetsgrader. node tools/goal_check.mjs [--verbose] [--json]
// For hvert brett og hver vanskelighetsgrad: (a) hvert delmål-trinn har en neste-mål-tekst (norsk og engelsk) i oppdragslinja, (b) peilingen peker mot riktig mål fra tre startpunkter
// (brettstart, midt på ruta, siste flate før målet) med flere kamerasyn, (c) ingen mål er skjult uten vei: låste mål har en beskjed om hva som mangler, og hvert delmål har et punkt eller en ruteflate å peile mot.
// Skriver hull som en liste (legges i docs/NIVAER.md). Exit 1 ved feil i (a) eller (b); hull i (c) rapporteres og gir exit 0 hvis de er kjent.
import fs from 'node:fs';
import { initGoals, activeGoal, goalTarget, goalLabel, lockingGoals, goalDone, goalTotal, checkGoals, GOAL } from '../goals.js';
import { initAnts, resetAnts } from '../ants.js';
import { initCollect } from '../collect.js';
import { initBoss } from '../boss.js';
import { initPuzzles } from '../puzzle.js';
import { initGates } from '../plates_logic.js';
import { initBodies } from '../physics.js';
import { lockMessage } from '../goal_lock_logic.js';
import { questModel, questVisible, wayTarget, peekAngle, peekMark, createWay, stepWay, WAY } from '../goalway_logic.js';
import { aim } from '../guide_logic.js';
import { DIFFS, diffProfile } from '../difficulty.js';
import { makeT } from '../i18n.js';

const verbose = process.argv.includes('--verbose'), json = process.argv.includes('--json');
const IDS = { bad: 1, barnerom: 2, kjokken: 3, bad2: 4, barnerom2: 5, kjokken2: 6, leke: 7, stue: 8, verksted: 9, bro: 0, trapp: 0, vippe: 0, kjokkenbro: 0, badebro: 0, trapp2: 0, vippe2: 0, gaate: 0 };
const Tn = makeT(() => 'nb').T, Te = makeT(() => 'en').T;
const load = (id) => { const L = JSON.parse(fs.readFileSync(new URL(`../levels/${id}.level.json`, import.meta.url), 'utf8')); initBodies(L); initAnts(L); resetAnts(L); initBoss(L); initCollect(L); initPuzzles(L); initGoals(L); initGates(L); return L; };
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const rep = { errors: [], holes: [], levels: {} };
const err = (m) => rep.errors.push(m), hole = (id, m) => rep.holes.push(`${id}: ${m}`);

for (const id of Object.keys(IDS)) {
  const L = load(id), R = L.route || [], info = { goals: (L.goals || []).length, steps: [], starts: 0 };
  rep.levels[id] = info;
  for (const e of checkGoals(L, { levelId: id })) if (!/delmål \(skal være/.test(e)) err(e);
  // (a) hvert delmål-trinn: tekst på norsk og engelsk, uten taster; deretter slutten (rute/siste mål)
  const stage = (goal, p, t) => {
    for (const [lang, T] of [['nb', Tn], ['en', Te]]) {
      const m = questModel({ L, goal, t, T, lang });
      if (!m || !m.text || m.text.length < 4 || /\{\w+\}/.test(m.text)) err(`${id}${goal ? '/' + goal.id : ''} (${lang}): mangler neste-mål-tekst`);
      else if (!m.icon) err(`${id}${goal ? '/' + goal.id : ''}: mangler ikon`);
      else if (lang === 'nb') info.steps.push(`${m.icon} ${m.text}`);
    }
  };
  const p0 = { x: L.start[0], y: L.start[1], z: L.start[2], onGround: true };
  let guard = 0;
  for (let g = activeGoal(L); g && guard++ < 12; g = activeGoal(L)) {
    const wt = wayTarget(L, p0, 0);
    stage(g, p0, wt && { label: wt.label, kind: 'route', grip: false });
    // (c) mål uten vei: finnes det et punkt å peile mot, og en beskjed når det låser?
    const gt = goalTarget(L, g, p0);
    if (!gt) {
      if (g.type === 'flag') hole(id, `«${g.label}» er et byggemål uten punkt i verden: peilingen går til neste flate på ruta`);
      else if (g.type === 'puzzle') { const q = (L.puzzles || []).find((z) => z.id === g.puzzle); if (!q || !(L.bodies || []).some((b) => b.id === q.key)) hole(id, `gåten «${g.puzzle}» mangler nøkkel i brettet`); }
      else hole(id, `«${g.label}» (${g.type}) har ikke noe punkt å peile mot ved start`);
    }
    if (g.gate) { const lm = lockMessage(L, { hints: true, lang: 'nb', T: Tn }); if (!lm || !lm.includes(g.label)) err(`${id}/${g.id}: låst mål mangler beskjed om hva som mangler`); }
    if (g.type === 'gate') { const d = (L.gates?.doors || []).find((q) => q.id === g.door); for (const n of d?.needs || []) if (!(L.gates.plates || []).some((q) => q.id === n) && !(L.gates.switches || []).some((q) => q.id === n)) hole(id, `døra ${g.door} trenger ${n} som ikke finnes`); }
    g.done = true; if (g.type === 'crumbs') for (const c of L.crumbList) c.got = true;
  }
  { const w1 = R.find((w, i) => i > 0 && !w.grip && !w.via); if (w1) stage(null, p0, { label: w1.label || w1.id.replace(/_/g, ' '), kind: 'route', grip: !!w1.grip }); }
  stage(null, p0, { label: 'mål', kind: 'route', final: true });
  for (const g of L.goalList) g.done = false; for (const c of L.crumbList) c.got = false;
  // (b) peiling fra tre startpunkter: brettstart, midt på ruta, siste flate før målet
  const flats = R.filter((w) => !w.grip && !w.via), pick = [p0];
  if (flats.length > 2) { const mid = flats[Math.floor(flats.length / 2)], last = flats[flats.length - 2]; for (const w of [mid, last]) pick.push({ x: (w.x0 + w.x1) / 2, y: w.top, z: (w.z0 + w.z1) / 2, onGround: true }); }
  else for (let k = 0; k < 2; k++) pick.push({ x: p0.x + 1 + k, y: p0.y, z: p0.z + 1 + k, onGround: true });
  const idx = [0, Math.floor(R.length / 2), Math.max(0, R.length - 2)];
  pick.forEach((p, k) => {
    info.starts++;
    const t = wayTarget(L, p, idx[k]); if (!t) { err(`${id}: ingen mål å peile mot fra punkt ${k + 1}`); return; }
    const face = Math.atan2(-(t.x - p.x), -(t.z - p.z));
    for (const dyaw of [0, Math.PI / 2, -Math.PI / 2, Math.PI * 0.9]) {
      const yaw = face - dyaw, ang = peekAngle(p, t, yaw), a = aim({ dx: t.x - p.x, dy: t.y - p.y, dz: t.z - p.z, yaw });
      if (!a.vertDom) { const want = wrap(dyaw); if (Math.abs(wrap(ang - want)) > 0.02 && Math.abs(wrap(ang + want)) > 0.02) err(`${id}: peilingen fra punkt ${k + 1} peker ${ang.toFixed(2)} rad, målet ligger ${want.toFixed(2)} rad`); }
      const m = peekMark({ a, w: 390, h: 844 });
      if (!m || !(m.x >= 0 && m.x <= 390 && m.y >= 0 && m.y <= 844)) err(`${id}: kant-ikonet havner utenfor skjermen`);
    }
    // målet er det riktige: på flata for «nå»-delmål, ellers på ruta
    const g = activeGoal(L); if (g?.type === 'reach' && t.src === 'goal:reach' && !(t.x >= g.x0 && t.x <= g.x1 && t.z >= g.z0 && t.z <= g.z1)) err(`${id}: peilingen peker utenfor delmålets flate`);
  });
}
// vanskelighetsgrader: linja og peilingen
for (const d of DIFFS) {
  const P = diffProfile(d), peek = !P.worldArrow && !P.compass;
  if (questVisible({ mode: 'auto', diffOn: P.questLine, tapUntil: 0, now: 1 }) !== (d !== 'expert')) err(`${d}: oppdragslinje på/av stemmer ikke med vanskeligheten`);
  if (!questVisible({ mode: 'auto', diffOn: P.questLine, tapUntil: 5000, now: 1 })) err(`${d}: oppdragslinja kommer ikke fram ved trykk`);
  if (peek !== (d === 'expert')) err(`${d}: peiling skal bare finnes uten piler (Ekspert)`);
}
// klokka: stå stille 8 s gir peiling, så peiling igjen etter 8 s til; framdrift nullstiller
{
  const s = createWay(); let n = 0, t = 0; const inp = { key: 'k', dist: 30, moving: false, inFrame: false };
  for (; t <= 17000; t += 100) if (stepWay(s, t, inp).peek) n++;
  if (n !== 2) err(`klokka: ventet 2 peilinger på 17 s stillstand, fikk ${n}`);
}
const ok = rep.errors.length === 0;
if (json) console.log(JSON.stringify(rep, null, 1));
else {
  for (const [id, i] of Object.entries(rep.levels)) console.log(`${id.padEnd(11)} nivå ${IDS[id] || '-'}  delmål ${i.goals}  startpunkter ${i.starts}${verbose ? '\n   ' + i.steps.join('\n   ') : ''}`);
  console.log(rep.holes.length ? `\nHull (${rep.holes.length}):\n - ` + rep.holes.join('\n - ') : '\nIngen hull.');
  console.log(ok ? '\ngoal_check: grønn' : `\nFEIL (${rep.errors.length}):\n - ` + rep.errors.join('\n - '));
}
process.exit(ok ? 0 : 1);
