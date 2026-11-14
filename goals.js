// R23: delmål (milepæler) i hvert nivå. Ren logikk (ingen DOM/three, kan testes i node); visning ligger i goals_view.js.
// Brettet (`goals` i level.json, laget av scene2level fra `goals` i scenen):
//   { id, type, label, en?, req?, gate?, after?, ... }
//   type: 'reach'  { x0, x1, z0, z1, top }  stå på flata (id på tingen står i `on`)
//         'crumbs' { n }                      samle n smuler i brettet
//         'stomp'  { n }                      knus n maur/edderkopper
//         'puzzle' { puzzle }                 åpne gåten (nøkkel og lås, R7)
//         'gate'   { door }                   åpne en dør/port/vindebro (plate eller bryter, R60, plates_logic.js)
//         'boss'                              slå sjef-mauren (R9)
//         'flag'   { flag }                   settes utenfra med setGoalFlag (f.eks. «bygg broen» fra byggeskjermen, R24)
//   gate:  må være klart før målet åpner (alltid påkrevd). req: påkrevd for «alle delmål klare», men låser ikke målet.
//   after: id på et delmål som må være klart først (ordnet kjede); delmålet teller ikke før det.
// Uten `gate` er et delmål valgfritt og hindrer aldri at du kommer i mål.
export const GOAL = {
  slackXZ: 0.3,       // reach: hvor langt utenfor kanten av flata du kan stå og likevel telle
  below: 0.3,         // reach: føttene kan være så langt under flatas topp
  above: 3.0,         // reach: ... og så langt over (stå oppå en løs ting på flata)
  minPerLevel: 2, maxPerLevel: 4,
};
export const GOAL_TYPES = ['reach', 'crumbs', 'stomp', 'puzzle', 'gate', 'boss', 'flag'];

export function initGoals(L) {
  L.goalList = (L.goals || []).map((g) => ({ ...g, done: false }));
  L.goalFlags = new Set();
}
export function resetGoals(L) { for (const g of L.goalList || []) g.done = false; L.goalFlags = new Set(); }
export const goalTotal = (L) => (L.goalList || []).length;
export const goalDone = (L) => (L.goalList || []).filter((g) => g.done).length;
export const goalDoneIds = (L) => (L.goalList || []).filter((g) => g.done).map((g) => g.id);
export const goalFlagList = (L) => [...(L.goalFlags || [])];
// fra autolagringen: ukjente id-er (brettet er endret) ignoreres
export function restoreGoals(L, ids, flags = []) {
  const set = new Set(Array.isArray(ids) ? ids : []);
  L.goalFlags = new Set(Array.isArray(flags) ? flags.filter((f) => typeof f === 'string') : []);
  for (const g of L.goalList || []) g.done = set.has(g.id);
  return goalDone(L);
}
export const isRequired = (g) => !!(g.gate || g.req);
export const goalById = (L, id) => (L.goalList || []).find((g) => g.id === id);
export const goalAvailable = (L, g) => !g.after || !!goalById(L, g.after)?.done;
// første delmål som ikke er klart og som er åpent (ordnet kjede følges), ellers null
export const activeGoal = (L) => (L.goalList || []).find((g) => !g.done && goalAvailable(L, g)) || null;
// delmål som låser målet og ennå ikke er klare
export const lockingGoals = (L) => (L.goalList || []).filter((g) => g.gate && !g.done);
export const goalsOpen = (L) => lockingGoals(L).length === 0;
export const allRequiredDone = (L) => (L.goalList || []).filter(isRequired).every((g) => g.done);
export function setGoalFlag(L, flag) { L.goalFlags ||= new Set(); const had = L.goalFlags.has(flag); L.goalFlags.add(flag); return !had; }

// står spilleren på flata?
export function onSurface(g, p) {
  const dy = p.y - g.top;
  return p.onGround !== false && dy > -GOAL.below && dy < GOAL.above
    && p.x > g.x0 - GOAL.slackXZ && p.x < g.x1 + GOAL.slackXZ && p.z > g.z0 - GOAL.slackXZ && p.z < g.z1 + GOAL.slackXZ;
}
// fremdrift: { cur, need } (for smuler og knusing flere trinn, ellers 0/1)
export function goalProgress(L, g, ctx = {}) {
  switch (g.type) {
    case 'crumbs': return { cur: Math.min(ctx.crumbs || 0, g.n), need: g.n };
    case 'stomp': return { cur: Math.min(ctx.stomps || 0, g.n), need: g.n };
    case 'reach': return { cur: ctx.player && onSurface(g, ctx.player) ? 1 : 0, need: 1 };
    case 'puzzle': return { cur: (L.puzzleList || []).find((q) => q.id === g.puzzle)?.open ? 1 : 0, need: 1 };
    case 'gate': return { cur: (L.gateS?.doors || []).find((q) => q.id === g.door)?.t >= 0.999 ? 1 : 0, need: 1 };
    case 'boss': return { cur: L.bossS?.gone ? 1 : 0, need: 1 };
    case 'flag': return { cur: L.goalFlags?.has(g.flag) ? 1 : 0, need: 1 };
    default: return { cur: 0, need: 1 };
  }
}
// Ett steg. ctx: { player, crumbs, stomps }. Returnerer nye hendelser [{ type: 'goal', id, n, total, last }] (en per klart delmål).
// Et delmål teller først når forgjengeren (`after`) er klar. Klare delmål forblir klare.
export function stepGoals(L, ctx, active = true) {
  const ev = [];
  if (!active) return ev;
  for (let guard = 0; guard < 8; guard++) {                    // en kjede kan bli klar i samme steg (smuler du allerede har)
    let any = false;
    for (const g of L.goalList || []) {
      if (g.done || !goalAvailable(L, g)) continue;
      const pr = goalProgress(L, g, ctx);
      if (pr.cur >= pr.need) { g.done = true; any = true; ev.push({ type: 'goal', id: g.id, n: goalDone(L), total: goalTotal(L), last: goalDone(L) === goalTotal(L), gate: !!g.gate }); }
    }
    if (!any) break;
  }
  return ev;
}

// Hvor peker pila for dette delmålet? { x, y, z } eller null (gåter og flagg har egen veiledning).
// R65: opts.dry(y) -> bool: bare mål som er tørre kommer med (stigende vann). Uten opts er alt som før.
export function goalTarget(L, g, p, opts = {}) {
  if (!g) return null;
  const dry = opts.dry || (() => true);
  const nearest = (list) => list.reduce((best, c) => { const d = Math.hypot(c.x - p.x, c.z - p.z); return !best || d < best.d ? { c, d } : best; }, null)?.c || null;
  if (g.type === 'reach') return { x: Math.max(g.x0, Math.min(g.x1, p.x)), y: g.top, z: Math.max(g.z0, Math.min(g.z1, p.z)) };
  if (g.type === 'crumbs') { const c = nearest((L.crumbList || []).filter((q) => !q.got && dry(q.y - 0.8))); return c ? { x: c.x, y: c.y - 0.8, z: c.z } : null; }
  if (g.type === 'stomp') { const a = nearest((L.antList || []).filter((q) => q.alive && dry(q.y))); return a ? { x: a.x, y: a.y, z: a.z } : null; }
  if (g.type === 'gate') {                                       // pila peker på første plate/bryter som ikke er trykket ennå
    const d = (L.gateS?.doors || []).find((q) => q.id === g.door); if (!d || d.t > 0) return null;
    for (const id of d.needs || []) { const pl = L.gateS.plates.find((q) => q.id === id); if (pl && !pl.on) return { x: (pl.x0 + pl.x1) / 2, y: pl.y, z: (pl.z0 + pl.z1) / 2 }; const sw = L.gateS.switches.find((q) => q.id === id); if (sw && !sw.on) return { x: sw.x, y: sw.y, z: sw.z }; }
    return null;
  }
  if (g.type === 'boss') { const b = L.bossS; return b && !b.gone ? { x: b.x, y: b.y, z: b.z } : null; }
  return null;
}

// ---------- tekster (UI) ----------
export const goalLabel = (g, lang) => (lang === 'en' && g.en) || g.label || g.id;
// Linje til panelet: «Samle 5 smuler (3/5)»
export function goalLine(L, g, lang, ctx = {}) {
  const pr = goalProgress(L, g, ctx);
  const stars = g.type === 'flag' && g.done && ctx.stars?.[g.flag] ? ` ${'★'.repeat(ctx.stars[g.flag])}${'☆'.repeat(3 - ctx.stars[g.flag])}` : '';   // R47: byggestjerner bak byggedelmålet
  return (pr.need > 1 && !g.done ? `${goalLabel(g, lang)} (${pr.cur}/${pr.need})` : goalLabel(g, lang)) + stars;
}

// ---------- kontroll av brettdata (brukes av test_goals.mjs) ----------
export function checkGoals(L, { levelId = '' } = {}) {
  const errs = [], gs = L.goals || [], ids = new Set();
  if (gs.length < GOAL.minPerLevel || gs.length > GOAL.maxPerLevel) errs.push(`${levelId}: ${gs.length} delmål (skal være ${GOAL.minPerLevel}-${GOAL.maxPerLevel})`);
  const routeIds = new Set((L.route || []).filter((w) => !w.grip && !w.via).map((w) => w.id));
  for (const g of gs) {
    const at = `${levelId}/${g.id}`;
    if (!g.id || ids.has(g.id)) errs.push(`${at}: id mangler eller finnes to ganger`); ids.add(g.id);
    if (!GOAL_TYPES.includes(g.type)) errs.push(`${at}: ukjent type ${g.type}`);
    if (!g.label || !g.en) errs.push(`${at}: label og en må være satt`);
    if (/\b(trykk|tast)\s+(på\s+)?(mellomrom|space|E|F)\b/i.test(`${g.label} ${g.en}`)) errs.push(`${at}: teksten nevner taster`);
    if ((g.type === 'crumbs' || g.type === 'stomp') && !(g.n >= 1)) errs.push(`${at}: n mangler`);
    if (g.type === 'crumbs' && g.n > (L.collectibles || []).length) errs.push(`${at}: flere smuler enn det finnes`);
    if (g.type === 'stomp' && g.n > (L.ants || []).length) errs.push(`${at}: flere enn det finnes maur`);
    if (g.type === 'puzzle' && !(L.puzzles || []).some((q) => q.id === g.puzzle)) errs.push(`${at}: gåten ${g.puzzle} finnes ikke`);
    if (g.type === 'gate' && !(L.gates?.doors || []).some((q) => q.id === g.door)) errs.push(`${at}: døra ${g.door} finnes ikke`);
    if (g.type === 'boss' && !L.boss) errs.push(`${at}: brettet har ingen sjef`);
    if (g.type === 'flag' && !g.flag) errs.push(`${at}: flag mangler`);
    if (g.type === 'reach') {
      if (!(g.x1 > g.x0 && g.z1 > g.z0) || typeof g.top !== 'number') errs.push(`${at}: flata er ugyldig`);
      if (g.gate && !routeIds.has(g.on)) errs.push(`${at}: et delmål som låser målet må ligge på ruta (${g.on})`);
    }
    if (g.gate && !['reach', 'crumbs'].includes(g.type)) errs.push(`${at}: bare reach/crumbs kan låse målet`);
  }
  for (const g of gs) if (g.after && !ids.has(g.after)) errs.push(`${levelId}/${g.id}: after ${g.after} finnes ikke`);
  // ingen sirkel i after-kjeden
  for (const g of gs) { let k = g, n = 0; while (k?.after && n++ < 10) k = gs.find((q) => q.id === k.after); if (n >= 10) errs.push(`${levelId}/${g.id}: after-kjeden går i ring`); }
  return errs;
}
