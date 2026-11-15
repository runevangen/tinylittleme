// R67: Bygglab, prøverommet som starter i byggemodus. Ren logikk (ingen DOM, ingen three.js, testes i node: test_bygglab.mjs).
// Brettet (`levels/bygglab.level.json`, laget av tools/make_bygglab.mjs) har åtte byggesteder på rad. Hvert sted har `lab: { key, n, of, flag: [x, y, z], cap?, solutions }`.
// Her ligger: rekkefølgen på stedene og ◀ ▶ mellom dem, ubegrenset mengde av alle deler (deler med id `lab_<type>_<n>` fylles på etter hvert som de brukes),
// målflagg per sted (nådd når figuren står ved flagget), hvor figuren settes når du går ut av byggeskjermen, og når byggeskjermen åpnes av seg selv ved start.
import { PART_TYPES } from './build_logic.js';

export const LAB = {
  spare: 3,          // minst så mange ubrukte deler av hver type i brettet (ubegrenset: fylles på)
  fixed: 2,          // uten «ubegrenset»: så mange av hver type
  flagR: 2.2,        // hvor nær flagget figuren må stå (enheter)
  flagDy: 2.5,       // ... og høyde over/under flaggfoten
  homeU: -9,         // hvor på stedet figuren settes når du går ut (u fra midten: på sokkelen før gapet)
};

export const isLab = (L) => !!L && !!L.lab;
// stedene i rekkefølge (lab.n)
export const labSitesOf = (L) => ((L && (L.buildSites || L.build?.sites)) || []).filter((s) => s.lab).sort((a, b) => (a.lab.n || 0) - (b.lab.n || 0));
export const labTypes = () => Object.keys(PART_TYPES);
export const labId = (type, n) => `lab_${type}_${n}`;
export const labTypeOf = (id) => { const m = /^lab_([a-z_]+)_(\d+)$/.exec(String(id)); return m && PART_TYPES[m[1]] ? m[1] : null; };

// ---------- ubegrenset mengde ----------
// B: byggetilstand (build_logic.createBuild). types: delenes id -> type (delt med build.js). Sørger for at hver type har minst `spare` ubrukte deler i brettet.
// Returnerer id-ene som ble lagt til. unlimited = false: bare `fixed` av hver type, aldri mer.
export function labFill(B, types, { unlimited = true, spare = LAB.spare, fixed = LAB.fixed } = {}) {
  const added = [], used = new Set(B.placed.map((p) => p.id));
  for (const t of labTypes()) {
    const mine = B.have.filter((id) => labTypeOf(id) === t);
    let free = mine.filter((id) => !used.has(id)).length, n = mine.reduce((m, id) => Math.max(m, +id.slice(id.lastIndexOf('_') + 1) || 0), 0);
    const need = unlimited ? Math.max(0, spare - free) : Math.max(0, fixed - mine.length);   // ubegrenset: alltid `spare` ubrukte; ellers aldri flere enn `fixed` til sammen
    for (let k = 0; k < need; k++) { const id = labId(t, ++n); types[id] = t; B.have.push(id); added.push(id); }
  }
  return added;
}
// etter «Fortsett»: id-ene som ligger i lagringen må kjennes igjen (typen står i id-en)
export function labRegister(types, ids) { let n = 0; for (const id of ids || []) { const t = labTypeOf(id); if (t && !types[id]) { types[id] = t; n++; } } return n; }
// brettet som vises: én brikke per type (første ubrukte), i fast rekkefølge; andre deler (ekstradeler, plukkede) som vanlig. free = ubrukte av typen
export function labTrayItems(B) {
  const used = new Set(B.placed.map((p) => p.id)), out = [];
  for (const t of labTypes()) { const free = B.have.filter((id) => labTypeOf(id) === t && !used.has(id)); if (free.length) out.push({ id: free[0], type: t, free: free.length, lab: true }); }
  for (const id of B.have) if (!labTypeOf(id)) out.push({ id, type: B.types[id], free: 1, lab: false, used: used.has(id) });
  return out;
}

// ---------- stedene ----------
export const labIndex = (sites, id) => Math.max(0, sites.findIndex((s) => s.id === id));
// neste/forrige sted, rundt (◀ på første går til siste)
export function labStepSite(sites, id, dir) { if (!sites.length) return null; const i = labIndex(sites, id); return sites[(i + (dir < 0 ? -1 : 1) + sites.length) % sites.length]; }
export const labInfoOf = (site, sites) => ({ n: (site.lab?.n) || labIndex(sites, site.id) + 1, of: site.lab?.of || sites.length, key: site.lab?.key || site.id, cap: site.lab?.cap || 0, loads: site.loads || [] });
export const labNameKey = (site) => `lab.name.${site.lab?.key || site.id}`;
export const labTaskKey = (site) => `lab.task.${site.lab?.key || site.id}`;

// ---------- målflagg ----------
export const flagNear = (site, p) => { const f = site.lab?.flag; return !!f && p.onGround !== false && Math.hypot(p.x - f[0], p.z - f[2]) <= LAB.flagR && Math.abs(p.y - f[1]) <= LAB.flagDy; };
// ett steg: nye flagg som ble nådd (sett av id-er), hendelser [{ id, n, of, total, all }]
export function labFlagStep(sites, reached, p) {
  const ev = [];
  for (const s of sites) if (!reached.has(s.id) && flagNear(s, p)) { reached.add(s.id); ev.push({ id: s.id, n: s.lab.n, of: s.lab.of || sites.length, total: reached.size, all: reached.size === sites.length }); }
  return ev;
}
export const labReachedSave = (reached) => [...reached];
export const labReachedLoad = (ids, sites) => new Set((Array.isArray(ids) ? ids : []).filter((id) => sites.some((s) => s.id === id)));

// ---------- figuren ----------
// hvor figuren står når du går ut av byggeskjermen på et annet sted enn der du sto: på sokkelen før gapet (så du kan gå over det du bygde)
export function labHome(site) { return { x: site.x + LAB.homeU, y: site.y + 0.01, z: site.z }; }
export const labFar = (site, p) => Math.hypot(site.x - p.x, site.z - p.z) > 17 || p.y > site.y + 14;   // lenger unna enn å nå stedet (ENTER_R + w / 2)

// ---------- start ----------
// åpner byggeskjermen av seg selv ved start (én gang per økt, når spillet er i gang og figuren står stille på bakken)
export const labAutoOpen = ({ lab, on, done, playing, onGround }) => !!lab && !!on && !done && !!playing && !!onGround;

// ---------- kontroll av brettdata (test_bygglab.mjs) ----------
export function checkLab(L) {
  const errs = [], ss = labSitesOf(L); if (!isLab(L)) return ['brettet har ikke lab'];
  if (ss.length < 7) errs.push(`minst 7 byggesteder (fant ${ss.length})`);
  const seen = new Set(); ss.forEach((s, i) => {
    const w = `sted ${i + 1} (${s.id})`, l = s.lab;
    if (l.n !== i + 1) errs.push(`${w}: lab.n må være ${i + 1}`); if (l.of !== ss.length) errs.push(`${w}: lab.of må være ${ss.length}`);
    if (!l.key || seen.has(l.key)) errs.push(`${w}: lab.key mangler eller finnes to ganger`); seen.add(l.key);
    if (!Array.isArray(l.flag) || l.flag.length !== 3 || !l.flag.every(Number.isFinite)) errs.push(`${w}: målflagg mangler`);
    if (!Array.isArray(l.solutions) || l.solutions.length < 2) errs.push(`${w}: minst to løsninger`);
    if (!s.ref?.placed?.length || !(l.solutions?.[0]?.route?.length >= 3)) errs.push(`${w}: referansebygg og rute mangler`);
  });
  return errs;
}
