// Rene hjelpefunksjoner for innstillinger og testrapport (ingen DOM, så de kan testes i node).
// Selve innstillingslista (SETTINGS) bor i main.js, siden hver innstilling henger i variabler der.

// defs: [{id, label, def, get}] → liste over det som er endret fra standard
export function changedSettings(defs) {
  const out = [];
  for (const d of defs) {
    const v = d.get();
    if (!sameValue(v, d.def)) out.push({ id: d.id, label: d.label, value: v, def: d.def });
  }
  return out;
}
const sameValue = (a, b) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-6 : a === b);

// Eksport/import av innstillinger som tekst (kan limes inn i en melding og tilbake)
export const SETTINGS_TAG = 'tinylittleme-innstillinger';
export function exportSettings(defs, extra = {}) {
  const values = {};
  for (const d of defs) values[d.id] = d.get();
  return JSON.stringify({ tag: SETTINGS_TAG, ...extra, values });
}
// Returnerer {values} eller {error}. Ukjente nøkler og verdier av feil type hoppes over (rapporteres som `skipped`).
export function parseSettings(text, defs) {
  let o;
  try { o = JSON.parse(String(text).trim().replace(/^[^{]*/, '').replace(/[^}]*$/, '')); } catch { return { error: 'Ikke gyldig tekst' }; }
  if (!o || o.tag !== SETTINGS_TAG || typeof o.values !== 'object') return { error: 'Ikke innstillinger fra tinylittleme' };
  const values = {}, skipped = [];
  for (const [k, v] of Object.entries(o.values)) {
    const d = defs.find((x) => x.id === k);
    if (!d) { skipped.push(k); continue; }
    if (d.type === 'bool' && typeof v === 'boolean') values[k] = v;
    else if (d.type === 'range' && typeof v === 'number' && Number.isFinite(v)) values[k] = Math.min(d.max, Math.max(d.min, v));
    else if (d.type === 'select' && d.options.some(([val]) => val === v)) values[k] = v;
    else skipped.push(k);
  }
  return { values, skipped };
}

const fmt = (v) => (typeof v === 'number' ? String(+v.toFixed(3)) : typeof v === 'boolean' ? (v ? 'på' : 'av') : String(v));

// Testrapport som kan limes inn i en melding. info: se main.js (buildReportInfo).
export function formatReport(info) {
  const L = [];
  L.push(`tinylittleme testrapport · v${info.version} · ${info.level}`);
  L.push(`${info.when} · ${info.device}`);
  L.push(`Skjerm ${info.screen} · ${info.platform || (info.touch ? 'touch' : 'tastatur/mus')} · ${info.fps}`);
  L.push(`Hoppvalg: ${info.preset} · tid ${info.clock} s · poeng ${info.points}`);
  if (info.metrics) L.push(`Kamera og styring: ${info.metrics}`);
  if (info.perf) L.push(`Scene: ${info.perf}`);
  L.push(`Figuren: (${info.pos.join(', ')}) · ${info.state}${info.target ? ` · neste: ${info.target}` : ''}`);
  L.push(`Lagret ${info.stats.saves} · tilbake ${info.stats.respawns} · knust ${info.stats.broken} · nullstilt ${info.stats.resets} · hard landing ${info.stats.hard}${info.stats.flew ? ' · FLYMODUS BRUKT' : ''}`);
  L.push('');
  if (info.changed.length) {
    L.push(`Innstillinger endret fra standard (${info.changed.length}):`);
    for (const c of info.changed) L.push(`- ${c.label}: ${fmt(c.value)} (standard ${fmt(c.def)})`);
  } else L.push('Innstillinger: alle på standard');
  L.push('');
  if (info.marks.length) {
    L.push('Markert av testeren:');
    for (const m of info.marks) {                         // v0.87: hver markering viser brettet og versjonen den ble gjort i (tiden starter på 0 for hvert brett), og eldre versjoner er merket, siden de kan være rettet
      const tag = [m.lv, m.v && m.v !== info.version ? `fra v${m.v}, kan være rettet` : ''].filter(Boolean).join(' · ');
      L.push(`- [${m.c} s${tag ? ' · ' + tag : ''}] (${m.pos.join(', ')}) ${m.detail || '(ingen tekst)'}`);
    }
    L.push('');
  }
  if (info.backlog?.length) {
    L.push('Til backloggen (idéer, ikke feil):');
    for (const m of info.backlog) L.push(`- [${m.c} s] ${m.detail}`);
    L.push('');
  }
  if (info.ratings?.length) {
    L.push('Vurderinger:');
    for (const r of info.ratings) L.push(`- [${r.c} s] ${r.detail} (${r.pos.join(', ')})`);
    L.push('');
  }
  L.push(`Siste hendelser (${info.events.length}):`);
  for (const e of info.events) L.push(`${String(e.c).padStart(6)} s  ${e.type}${e.detail ? ' ' + e.detail : ''}  (${e.pos.join(', ')}) ${e.st}`);
  return L.join('\n');
}

// ---------- gruppering av innstillingspanelet ----------
// Rekkefølgen her er det spilleren ser. En streng er én innstilling (id i SETTINGS i main.js); {sub, ids} er en sammenfoldet undermeny i gruppa.
// Nye innstillinger som ikke står her havner sist i sin egen `group` (fra SETTINGS), så det er trygt å glemme dem, men legg dem gjerne inn her.
export const GROUPS = [
  ['spill', 'Spill'], ['innhold', 'Innhold og utfordring'], ['styring', 'Styring'], ['figur', 'Figuren'], ['kamera', 'Kamera'],
  ['grafikk', 'Grafikk og ytelse'], ['hjelp', 'Hjelp og veiledning'], ['lyd', 'Lyd og stemme'], ['test', 'Test og tilbakemelding'], ['admin', 'Admin'],
];
export const LAYOUT = {
  spill: ['lang', 'autosave', 'startscreen', 'confirm2', 'lostreturn'],
  innhold: ['puzzles', 'gates', 'goals', 'crumbs', 'rewards', 'story', 'ants', 'boss', 'creatures', 'wasp', 'wasplevel', 'toys', 'varmood', 'vartwist', { sub: 'Byggeskjerm', ids: ['buildsnap', 'buildslow', 'buildbudget', 'buildbonus'] }],
  styring: ['preset', 'help', 'stickfloat', 'stickcurve', 'stickdead', 'btnscale', 'speedscale', 'inertia', 'autograb', 'magnet', 'aimthrow', 'dbltap', 'showcenter', 'showmapbtn', 'vib',
    { sub: 'Mus og tastatur (PC)', ids: ['pcbtns', 'mousesens', 'mouselook'] }],
  figur: ['stepadapt', 'reactanim', 'idlewink', 'shimmy', 'roll', 'careful', 'ropeheavy'],
  kamera: ['followstr', 'camdist', 'fov', 'pitchbase', 'lookahead', 'camassist', 'fade', 'fadeop', 'camsens', 'camrelay', 'blob', 'view',
    { sub: 'Skulderkamera', ids: ['shdist', 'shoff', 'shside', 'xhair'] }],
  grafikk: ['gfx', 'grade', 'gradefilter', 'softlight', 'ao', 'rays', 'dust', 'floordetail', 'clutter', 'resq', 'texsmall', 'lowprofile', 'fps'],
  hjelp: ['tband', 'tbsize', 'goalarrow', 'shortcuthint', 'compassmode', 'beacon', 'minimap', 'markers', 'drawercue', 'griphi', 'failhint', 'bubbles', 'hudtech', 'puzcam', 'gatecam', { sub: 'Nivåstart', ids: ['introsweep', 'intromark', 'introhint'] }],
  lyd: ['sound', 'vol', 'music', 'musicvol', 'voice', 'voicevol', { sub: 'Pust og lydnivåer', ids: ['restbreath', 'mix_breath', 'mix_steps', 'mix_move', 'mix_things', 'mix_toys', 'mix_room'] }],
  test: ['qbtn'],
};
export const layoutIds = () => Object.values(LAYOUT).flatMap((l) => l.flatMap((e) => (typeof e === 'string' ? [e] : e.ids)));
// Setter group/sub på hver innstilling og sorterer lista etter oppsettet (ukjente id-er beholder sin gruppe og står sist). Admin røres ikke.
export function applyLayout(settings) {
  const rank = new Map(); let i = 0;
  for (const [g, list] of Object.entries(LAYOUT)) for (const e of list) for (const id of (typeof e === 'string' ? [e] : e.ids)) {
    rank.set(id, { g, sub: typeof e === 'string' ? null : e.sub, r: i++ });
  }
  for (const d of settings) { const r = rank.get(d.id); if (r && d.group !== 'admin') { d.group = r.g; d.sub = r.sub; } }
  const order = new Map(settings.map((d, k) => [d, k]));
  settings.sort((a, b) => (rank.get(a.id)?.r ?? 1e6 + order.get(a)) - (rank.get(b.id)?.r ?? 1e6 + order.get(b)));
  return settings;
}
