// R138: påkrevd bygg (plan: docs/PLAN_BYGG_TIDLIG.md). Nivå 2 (Barnerommet) har et gap over lekebøtta som er for langt til å hoppe: figuren må bygge en bro.
// Brettet (levels/barnerom.level.json) lagres med den VANSKELIGE plasseringen. `L.required = { site, ease: [{ id, min, max, route? }], easeHints? }` bærer den gamle, lette plasseringen.
// Valget buildrequired (⚙ → Admin, standard på): av = ease legges tilbake, og brettet er som før (bygging er bare en snarvei). Ren logikk (ingen DOM), kjøres i node.
export const REQ = { site: 'barn1', cardKey: 'tlm.reqcard', cardLevels: ['barnerom', 'barnerom2', 'kjokken2'] };
// R140: hvert brett med påkrevd bygg har sitt eget kort (egen tekst og egen «sett»-nøkkel): Nivå 2 bro, Nivå 5 trekanter (fagverk), Nivå 6 materialer (stål)
export const REQ_CARDS = { barnerom: { key: 'tlm.reqcard', kind: 'req' }, barnerom2: { key: 'tlm.reqcard.barnerom2', kind: 'req.truss' }, kjokken2: { key: 'tlm.reqcard.kjokken2', kind: 'req.mat' } };
export const cardKeyOf = (level) => (REQ_CARDS[level] || REQ_CARDS.barnerom).key;
export const cardKindOf = (level) => (REQ_CARDS[level] || REQ_CARDS.barnerom).kind;

export const requiredOf = (L) => (L && L.required && typeof L.required.site === 'string' ? L.required : null);
export const needsBuild = (L, on = true) => !!on && !!requiredOf(L) && !L.required.eased;

// legg den lette plasseringen tilbake (valget er av). Idempotent. Returnerer 'hard' (uendret), 'easy' (lettet) eller null (brettet har ingen påkrevd bygg).
export function applyRequired(L, on = true) {
  const r = requiredOf(L); if (!r) return null;
  if (on || r.eased) return r.eased ? 'easy' : 'hard';
  if (Array.isArray(r.easeGoal) && r.easeGoal.length === 3) L.goal = [...r.easeGoal];   // R140: målet slik det sto før (Nivå 6)
  for (const e of r.ease || []) {
    if (e.decor) { const d = (L.decor || []).find((q) => q.id === e.id); if (d) { d.pos = [...e.pos]; d.size = [...e.size]; } continue; }   // R140: dekor følger med
    const b = (L.boxes || []).find((q) => q.id === e.id); if (!b) continue;
    b.min = [...e.min]; b.max = [...e.max];
    const n = (L.route || []).find((q) => q.id === e.id); if (n && e.route) Object.assign(n, e.route);
  }
  for (const [id, text] of Object.entries(r.easeHints || {})) { const h = (L.hints || []).find((q) => q.id === id); if (h) h.text = text; }
  if (r.restore) {   // R140: en verktøy-genvei som ville gått forbi det påkrevde bygget legges tilbake (hårgelé-trappa i Nivå 5)
    const rs = JSON.parse(JSON.stringify(r.restore));
    for (const [key, arr] of [['boxes', L.boxes], ['movables', L.movables], ['hints', L.hints]]) for (const o of rs[key] || []) if (arr && !arr.some((q) => q.id === o.id)) arr.push(o);
    if (rs.shortcuts?.length) L.shortcuts = [...(L.shortcuts || []), ...rs.shortcuts];
  }
  r.eased = true; return 'easy';
}

// lagret posisjon fra en tidligere versjon: står figuren bortenfor gapet (på krakken eller høyere) uten at broen er bygd, settes den trygt ved gapet (venstre kant)
export function safeResume(L, pos, solvedIds, on = true) {
  const r = requiredOf(L); if (!r || !needsBuild(L, on) || !Array.isArray(pos) || pos.length < 3) return null;
  const site = ((L.build && L.build.sites) || []).find((s) => s.id === r.site); if (!site) return null;
  if ((solvedIds instanceof Set ? solvedIds.has(site.id) : (solvedIds || []).includes(site.id))) return null;
  const topY = site.y - 2.5, back = site.walkDir === -1;   // R140: figuren kan gå mot venstre i rommet (Nivå 6); toppen av kjøleskapet ligger 2 cm under broen
  if (!(back ? pos[0] < site.x : pos[0] > site.x) || !(pos[1] >= topY)) return null;
  const d = (site.deck && site.deck[back ? 1 : 0]), left = d ? (d.u0 + d.u1) / 2 : (back ? 1 : -1) * (site.w || 20) / 4;
  return [+(site.x + left).toFixed(3), site.y, site.z];
}

// kortet «Ny til bygging?»: én gang, første gang byggeskjermen åpnes i et brett med påkrevd bygg
export function reqCardShould({ L, level, on = true, cinema = false, seen = false }) {
  return !!on && !cinema && !seen && needsBuild(L, on) && REQ.cardLevels.includes(level);
}

// forsøk per påkrevd bygg, til loggen «påkrevd bygg: bestått etter N forsøk»
export function createTryCounter() {
  const n = new Map();
  return { tried: (id) => { n.set(id, (n.get(id) || 0) + 1); return n.get(id); }, count: (id) => n.get(id) || 0,
    solved(id) { const k = Math.max(1, n.get(id) || 0); n.delete(id); return k; } };
}
export const solvedLine = (n) => `påkrevd bygg: bestått etter ${n} forsøk`;
