// R149: «Mangler for full score». Ren logikk (ingen DOM, kjøres i node: test_missing.mjs). Tre skall bruker den:
//  - målskjermen i vanlige brett (stjerner = smuler, delmål, bygg-stjerner per sted)
//  - resultatkortet i byggeskjermen i rutenett (Hyllebroen/Badebroen/Bygglab/Byggeskolen, R101): stjerner, BILLIGST, LETTEST, SMULE
//  - resultatkortet i klassiske byggesteder (samme funksjon, ingen egen kode)
// Bare det som allerede måles: ingen nye mål. Ingen linje når alt er oppnådd. Maks 3 linjer. Tekstene står i i18n.js (ms.*) på nb og en og nevner bare knapper.
export const MS = { max: 3 };

// Linjene er { key, vars } (i18n-nøkkel + variabler), så teksten følger språkvalget og testene slipper DOM.
// Vanlig brett (målskjermen). Inndata:
//  stars/crumbs/total: stjerner nå (1–3) og smuler tatt; goalsDone/goalsTotal: delmål; sitesLeft/sitesTotal: byggesteder uten tre stjerner;
//  flew: flymodus (da gjelder ingenting). Merket har allerede egen linje («Prøv Ekspert», difficulty_view.js), så den gjentas ikke her.
export function levelMissing({ stars, crumbs, total, goalsDone = 0, goalsTotal = 0, sitesLeft = 0, sitesTotal = 0, flew = false } = {}) {
  if (flew) return [];
  const out = [];
  if (total > 0 && crumbs < total && stars < 3) out.push({ key: 'ms.crumbs', vars: { n: total - crumbs, total } });
  if (goalsTotal > 0 && goalsDone < goalsTotal) out.push({ key: 'ms.goals', vars: { n: goalsTotal - goalsDone, total: goalsTotal } });
  if (sitesTotal > 0 && sitesLeft > 0) out.push({ key: 'ms.sites', vars: { n: sitesLeft, total: sitesTotal } });
  return out.slice(0, MS.max);
}
// Byggested (resultatkort etter bestått prøve). Inndata:
//  stars (0–3), next: { cost, parts } fra build_budget (neste stjerne), chips: [{ k: 'cheap'|'light'|'bonus', ok, target }] fra stars2_logic.chips (tom uten runde 2)
// Gir ÉN linje med det som mangler (tom når alt er tatt): «Mangler: ★ (under 12 kr) · BILLIGST (under 9) · LETTEST (under 3,5)»
export function siteMissing({ stars = 0, next = null, chips = [] } = {}) {
  const items = [];
  if (stars < 3) items.push({ k: 'star', cost: next && Number.isFinite(next.cost) ? next.cost : null, parts: next && Number.isFinite(next.parts) ? next.parts : null });
  for (const c of chips || []) if (!c.ok) items.push({ k: c.k, target: c.target ?? null });
  return items;
}
// Tekst av siteMissing: T(key, vars) og vekttekst-funksjon fra stars2_logic. Tom streng uten noe som mangler.
export function siteMissingText(items, T, weightText = String) {
  if (!items || !items.length) return '';
  const parts = items.map((it) => {
    if (it.k === 'star') return it.cost != null ? T('ms.site.star', { cost: it.cost }) : T('ms.site.star0');
    const lab = T('r2.' + it.k);
    if (it.target == null) return lab;
    return `${lab} ${T('r2.goal', { c: it.k === 'cheap' ? it.target : weightText(it.target) })}`;
  });
  return T('ms.site', { list: parts.join(' · ') });
}
// Tekst av en linje fra levelMissing
export function lineText(l, T) {
  return T(l.key, l.vars);
}
