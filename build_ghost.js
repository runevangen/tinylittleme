// R78: spøkelset (forrige prøve, R50) skal bare vises når det er den samme delelisten. Ellers tegnes en del du har fjernet (FJERN, dra tilbake i brettet, ANGRE)
// halvgjennomsiktig på nytt idet du trykker PRØV, og det ser ut som den kom tilbake. Ren logikk (ingen DOM), kjøres i node.
import { skeletonOf } from './build_replay.js';
const sig = (s) => JSON.stringify([s.parts.map((p) => p.id + ':' + p.type), s.links.map((l) => l.id + ':' + l.kind)]);
// rec = opptaket av forrige prøve, pose = poseen til den nye prøven ved steg 0 (sim.pose()). true: samme deler og koblinger (flytting og vridning er greit).
export function ghostFits(rec, pose) {
  if (!rec?.skel || !pose) return false;
  return sig(rec.skel) === sig(skeletonOf(pose));
}
// hvilket opptak som skal være spøkelse: null når det ikke passer (og hvorfor, til loggen)
export function ghostChoice(rec, pose) {
  if (!rec) return { rec: null, why: 'ingen' };
  return ghostFits(rec, pose) ? { rec, why: 'ok' } : { rec: null, why: 'endret' };
}
