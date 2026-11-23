// R138: påkrevd bygg (plan: docs/PLAN_BYGG_TIDLIG.md). Nivå 2 (Barnerommet) har et gap over lekebøtta som er for langt til å hoppe: figuren må bygge en bro.
// Brettet (levels/barnerom.level.json) lagres med den VANSKELIGE plasseringen. `L.required = { site, ease: [{ id, min, max, route? }], easeHints? }` bærer den gamle, lette plasseringen.
// Valget buildrequired (⚙ → Admin, standard på): av = ease legges tilbake, og brettet er som før (bygging er bare en snarvei). Ren logikk (ingen DOM), kjøres i node.
// R139: Nivå 3 (kjokken: trapp av klosser, `kjokk1`) og Nivå 4 (bad2: vippe, `bad1`) bruker samme mekanikk. Brettet bærer `required = { site, beyond?, easy? }`:
//   easy   = det som skiller det lette brettet (dagens, valget av) fra det vanskelige (tools/scene2level.mjs, tools/scene_patch.mjs): lister av ting som fjernet/lagt til, alt annet erstattet
//   beyond = { x0?, y0 } (enheter): står figuren bortenfor dette uten bygd bro, settes den ved gapet (safeResume)
export const REQ = { site: 'barn1', cardKey: 'tlm.reqcard', cardLevels: ['barnerom', 'kjokken', 'bad2', 'barnerom2', 'kjokken2'] };
export const cardKeyOf = (level) => (level === 'barnerom' ? REQ.cardKey : `${REQ.cardKey}.${level}`);   // «Ny til bygging?» vises én gang per brett (hvert brett har en ny type bygg)
// R140: Nivå 5 (trekanter, fagverk) og Nivå 6 (materialer, stål) har hvert sitt kort (egen tekst, `kind`)
export const REQ_CARDS = { barnerom: { kind: 'req' }, barnerom2: { kind: 'req.truss' }, kjokken2: { kind: 'req.mat' } };
export const cardKindOf = (level) => (REQ_CARDS[level] || REQ_CARDS.barnerom).kind;
export const EASY_SETS = ['boxes', 'hints', 'decor', 'holds', 'movables', 'collectibles', 'hazards', 'ants'];

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
  if (r.easy) applyEasy(L, r.easy);
  if (r.restore) {   // R140: en verktøy-genvei som ville gått forbi det påkrevde bygget legges tilbake (hårgelé-trappa i Nivå 5)
    const rs = JSON.parse(JSON.stringify(r.restore));
    for (const [key, arr] of [['boxes', L.boxes], ['movables', L.movables], ['hints', L.hints]]) for (const o of rs[key] || []) if (arr && !arr.some((q) => q.id === o.id)) arr.push(o);
    if (rs.shortcuts?.length) L.shortcuts = [...(L.shortcuts || []), ...rs.shortcuts];
  }
  r.eased = true; return 'easy';
}
// R139: legg det lette brettet tilbake (se `required.easy`): lister av ting som sett (del = fjernes, add = legges til), alt annet erstattes (null = fjernes)
export function applyEasy(L, easy) {
  const jq = (x) => JSON.stringify(x);
  for (const [k, v] of Object.entries(easy || {})) {
    if (v === null) { delete L[k]; continue; }
    if (EASY_SETS.includes(k) && v && Array.isArray(v.del) && Array.isArray(v.add)) {
      const arr = Array.isArray(L[k]) ? L[k] : []; L[k] = arr;
      for (const d of v.del) { const i = arr.findIndex((x) => jq(x) === jq(d)); if (i >= 0) arr.splice(i, 1); }
      for (const a of v.add) arr.push(JSON.parse(jq(a)));
    } else L[k] = JSON.parse(jq(v));
  }
  return L;
}

// lagret posisjon fra en tidligere versjon: står figuren bortenfor gapet (på krakken eller høyere) uten at broen er bygd, settes den trygt ved gapet (venstre kant)
export function safeResume(L, pos, solvedIds, on = true) {
  const r = requiredOf(L); if (!r || !needsBuild(L, on) || !Array.isArray(pos) || pos.length < 3) return null;
  const site = ((L.build && L.build.sites) || []).find((s) => s.id === r.site); if (!site) return null;
  if ((solvedIds instanceof Set ? solvedIds.has(site.id) : (solvedIds || []).includes(site.id))) return null;
  const back = site.walkDir === -1;   // R140: figuren kan gå mot venstre i rommet (Nivå 6)
  const topY = r.beyond && Number.isFinite(r.beyond.y0) ? r.beyond.y0 : site.y - (back ? 2.5 : 0.5), x0 = r.beyond ? (Number.isFinite(r.beyond.x0) ? r.beyond.x0 : -Infinity) : site.x;   // R139: `beyond` setter «bortenfor» for brett der gapet ikke er et rett sidehopp (trapp opp til en hylle)
  if (!(back ? pos[0] < site.x : pos[0] > x0) || !(pos[1] >= topY)) return null;
  const d = (site.deck && site.deck[back ? 1 : 0]), left = d ? (d.u0 + d.u1) / 2 : (back ? 1 : -1) * (site.w || 20) / 4;
  return [+(site.x + left).toFixed(3), site.y, site.z];
}

// kortet «Ny til bygging?»: én gang, første gang byggeskjermen åpnes i et brett med påkrevd bygg
export function reqCardShould({ L, level, on = true, cinema = false, seen = false }) {
  return !!on && !cinema && !seen && needsBuild(L, on) && REQ.cardLevels.includes(level);
}
export const reqCardTextKey = (level) => `req.card.text.${level}`;   // R139: egen setning per brett (gapet, trappa, vippa); `req.card.text` er reserven

// forsøk per påkrevd bygg, til loggen «påkrevd bygg: bestått etter N forsøk»
export function createTryCounter() {
  const n = new Map();
  return { tried: (id) => { n.set(id, (n.get(id) || 0) + 1); return n.get(id); }, count: (id) => n.get(id) || 0,
    solved(id) { const k = Math.max(1, n.get(id) || 0); n.delete(id); return k; } };
}
export const solvedLine = (n) => `påkrevd bygg: bestått etter ${n} forsøk`;
