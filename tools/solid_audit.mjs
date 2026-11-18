// R91: revisjon av dekor uten kollisjon. Går gjennom alle levels/*.level.json og lister dekor (LEVEL.decor, tegnet uten kollisjonsboks) per dom:
//   solid    stort nok og står fritt: får boks (solid_decor_logic.js)  ·  covered  har kollisjon rett ved  ·  flat  plate/panel  ·  small  for liten  ·  high  henger høyt
// Bruk: node tools/solid_audit.mjs [--json]. Avslutter 1 hvis noe stort står igjen uten kollisjon etter at boksene er lagt til (ikke dekket av decorSolidBoxes).
import fs from 'node:fs';
import { decorReport, decorSolidBoxes, classifyDecor, SOLID } from '../solid_decor_logic.js';

export function auditAll(dir = new URL('../levels/', import.meta.url).pathname) {
  const res = [];
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.level.json')).sort()) {
    const L = JSON.parse(fs.readFileSync(dir + f, 'utf8')), rep = decorReport(L), boxes = decorSolidBoxes(L);
    // store ting som fortsatt mangler kollisjon: kjør dommen på nytt med boksene lagt til; 'solid' skal da være dekket (covered)
    const L2 = { ...L, boxes: [...L.boxes, ...boxes] };
    const missing = (L.decor || []).filter((d) => classifyDecor(d, L2.boxes) === 'solid');
    res.push({ level: f.replace('.level.json', ''), rep, nBoxes: boxes.length, missing });
  }
  return res;
}
if (process.argv[1] && process.argv[1].endsWith('solid_audit.mjs')) {
  const res = auditAll(); let bad = 0;
  if (process.argv.includes('--json')) console.log(JSON.stringify(res.map((r) => ({ level: r.level, nBoxes: r.nBoxes, ...Object.fromEntries(Object.entries(r.rep).map(([k, v]) => [k, v.map((d) => d.id)])) })), null, 1));
  else {
    console.log(`Dekor-revisjon (grenser: flat < ${SOLID.flatT}, stor > ${SOLID.bigH} høy eller > ${SOLID.bigW} bred, høyt > ${SOLID.highGap} over underlag, nær ${SOLID.near})`);
    for (const r of res) {
      const c = (k) => r.rep[k].length;
      if (!(r.rep.solid.length + r.rep.covered.length + r.rep.flat.length + r.rep.small.length + r.rep.high.length)) continue;
      console.log(`${r.level.padEnd(11)} solid ${c('solid')} (+${r.nBoxes} bokser) · dekket ${c('covered')} · flat ${c('flat')} · liten ${c('small')} · høyt ${c('high')}${r.missing.length ? ` · MANGLER ${r.missing.map((d) => d.id)}` : ''}`);
      for (const k of ['solid', 'covered', 'small', 'high']) if (r.rep[k].length) console.log(`    ${k}: ${r.rep[k].map((d) => `${d.id}[${d.kind} ${d.size.join('x')}]`).join(', ')}`);
    }
  }
  for (const r of res) bad += r.missing.length;
  if (bad) { console.error(`${bad} store ting uten kollisjon`); process.exit(1); }
}
