// R82: rutenett-bygging i de vanlige byggebrettene (valgfri, MODUS-knappen). Ren logikk (ingen DOM, ingen three.js, kjøres i node: test_gridplay.mjs).
// Bygglab har rutenett på alle åtte steder (data i brettet). I de vanlige brettene (bro, kjokkenbro, ...) er brettfilene uendret: ved oppstart får hvert sted som passer (to klippe-ankre på samme høyde og kjøredekk
// på begge sider = rutenett kan lage en bro mellom dem) et `grid`-felt i minnet. Trapp og vippe (ingen eller ett anker) passer ikke og får aldri MODUS-knappen.
// Klassisk modus er standard. Valget huskes for vanlige brett for seg (nøklene under, med endelsen .play), så det man gjorde i Bygglab ikke slår om vanlige brett.
// Låsen: rutenett er åpent i første byggested (bro1 i `bro`) og i alle brett etter at det er bestått (en stjerne i klassisk eller rutenett). Kostnad og stjerner er som i klassisk modus (site.stars).
// BESTE viser begge moduser blandet, med et rutenett-merke på rader som er rutenett-bygg (koden bærer modusen).
import { deckPoints, gridAnchors, siteHasGrid, setMode, gAddNode, gAddRod, exportAny } from './grid_logic.js';
import { fromB64 } from './build_logic.js';

// sites = steder som er bevist med en kjent rutenett-løsning og en bot som går den (test_gridplay.mjs, tools/bot.mjs); verksted1 venter (hengebroen er for bratt for boten der)
export const PLAY = { sites: ['bro1', 'kjokken1', 'leke1', 'stue1'], div: 4, firstLevel: 'bro', firstSite: 'bro1', suffix: '.play', keys: ['tlm.gridmode', 'tlm.gridguide', 'tlm.gridmodetip'] };

// kan rutenett lage en bro her? (to ankre på samme høyde og dekk på begge sider)
export function playEligible(site) {
  if (!site || site.lab || site.grid || !PLAY.sites.includes(site.id)) return false;
  const an = Array.isArray(site.anchors) ? site.anchors : []; if (an.length !== 2 || !Array.isArray(site.deck) || site.deck.length < 2) return false;
  const probe = { ...site, grid: { step: Math.abs(an[1].u - an[0].u) / PLAY.div } };
  return !!deckPoints(probe) && probe.grid.step > 0.4;
}
// rutenett-feltet for et slikt sted: trinnet er gapet delt i fire (begge ankrene på rutenettet)
export const playGridOf = (site) => (playEligible(site) ? { step: Math.abs(site.anchors[1].u - site.anchors[0].u) / PLAY.div, play: true } : null);
// gir alle passende steder rutenett i minnet (ikke i brettfilen). Returnerer id-ene.
export function ensurePlayGrid(sites) {
  const out = []; for (const s of sites || []) { const g = playGridOf(s); if (g) { s.grid = g; out.push(s.id); } } return out;
}
export const isPlaySite = (site) => !!site && siteHasGrid(site) && !!site.grid.play;

// ---------- lås ----------
// predecessorPassed: har spilleren bestått første byggested? (rewards.getBuildStars(st, 'bro').bro1)
export const firstPassed = (stars) => !!(stars && stars[PLAY.firstSite] && stars[PLAY.firstSite].stars >= 1);
export function playLocked({ levelId, site, passed, lockOn = true }) {
  if (!lockOn || !isPlaySite(site)) return false;
  if (levelId === PLAY.firstLevel && site.id === PLAY.firstSite) return false;   // ingen forgjenger: alltid åpent
  return !passed;
}

// ---------- husket valg per vanlige brett ----------
// en lagring som legger .play på nøklene til MODUS-valget og guiden, slik at Bygglab og de vanlige brettene husker hver sitt
export function playStore(st) {
  const k = (key) => (PLAY.keys.includes(key) ? key + PLAY.suffix : key);
  return { get: (key, d) => st.get(k(key), d), set: (key, v) => st.set(k(key), v) };
}

// ---------- modus fra kode (BESTE-lista) ----------
export function codeMode(code) {
  try { const m = /^TLM1\.([A-Za-z0-9_-]+)\.[0-9a-z]+$/.exec(String(code || '')); if (!m) return 'classic'; const j = JSON.parse(fromB64(m[1])); return Array.isArray(j) && j[0] >= 2 ? 'grid' : 'classic'; } catch { return 'classic'; }
}

// ---------- kjent referanseløsning (bevis i test_gridplay.mjs og tools/bot.mjs) ----------
// en rett rad av fire staver av tre mellom ankrene (nodene på rutenettets rad), bærer figuren og lastene som stedet krever
export function rowSpec(site, mat = 'wood') {
  const an = gridAnchors(site).slice().sort((a, b) => a.u - b.u), st = site.grid.step, nodes = [], rods = [], N = Math.max(2, Math.round((an[1].u - an[0].u) / st));
  for (let i = 1; i < N; i++) nodes.push([an[0].u + i * st, an[0].v]);
  for (let i = 0; i < N; i++) rods.push([i === 0 ? 0 : i + 1, i === N - 1 ? 1 : i + 2, mat]);
  return { nodes, rods };
}
// legger spesifikasjonen i et bygg (B må være laget med createBuild); 0 og 1 = ankrene, 2.. = nodes. Returnerer { ok, why }.
export function applySpec(B, spec) {
  setMode(B, 'grid'); const ids = ['a1', 'a2'];
  for (const [u, v] of spec.nodes) { const r = gAddNode(B, u, v); if (!r.ok) return { ok: false, why: 'node ' + r.why }; ids.push(r.node.id); }
  for (const [a, b, m] of spec.rods) { const r = gAddRod(B, ids[a], ids[b], m); if (!r.ok) return { ok: false, why: 'stav ' + r.why }; }
  return { ok: true };
}
export const specCode = (B) => exportAny(B, () => null);
// ruta over det rutenett-bygde: den klassiske referanseruta med flata `@bro` byttet ut med smale flater langs bygget (stavene henger ned i midten som en hengebro, så høyden følger toppen av stavene
// for hver halve enhet, med toleranse). Brukes av tools/bot.mjs og test_gridplay.mjs.
export function gridRefRoute(site, solids, w = 0.5, tol = 0.2) {
  const ref = site.ref; if (!ref?.route || !solids?.length) return null;
  const an = gridAnchors(site).slice().sort((a, b) => a.u - b.u), surfaces = [], ids = [];
  for (let u = an[0].u - 0.2, k = 1; u < an[1].u + 0.2 - 1e-6; u += w, k++) {
    const u1 = Math.min(u + w + 0.1, an[1].u + 0.2), x0 = site.x + u, x1 = site.x + u1;
    const tops = solids.filter((q) => q.max[0] > x0 && q.min[0] < x1).map((q) => q.max[1] - site.y);
    if (!tops.length) return null; const top = Math.max(...tops);
    const id = '@rutenett' + k; surfaces.push({ id, u0: u, u1, top, tol }); ids.push(id);
  }
  const back = site.walkDir === -1;   // R140: figuren går mot venstre i rommet (Nivå 6): flatene rekkes fra høyre (prøven i byggeskjermen går fortsatt fra venstre)
  return { surfaces, route: ref.route.flatMap((id) => (id === '@bro' ? (back ? ids.slice().reverse() : ids) : [id])) };
}
