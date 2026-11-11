// R16: belønning som varer. Ren logikk (ingen DOM/three, kan testes i node): beste smuler/tid per nivå, tilbehør som låses opp
// når alle smulene i et nivå er tatt, og valget (hatt, skjerf, sekk) som huskes. `st` er { get(k, d), set(k, v) } (store i main.js).
// Nøkler: tlm.best = { nivå-id: { crumbs, total, t } }, tlm.unlocks = [id], tlm.equip = { hat, scarf, pack }.
export const SLOTS = ['hat', 'scarf', 'pack'];
// n = nivået som gir tilbehøret (alle smuler tatt). color: ny farge for skjerf/sekk.
export const ACCESSORIES = [
  { id: 'propeller', n: 1, slot: 'hat' },
  { id: 'redscarf', n: 2, slot: 'scarf', color: 0xd8402f },
  { id: 'bluepack', n: 3, slot: 'pack', color: 0x3a6fb5 },
  { id: 'crown', n: 4, slot: 'hat' },
  { id: 'party', n: 5, slot: 'hat' },
  { id: 'cowboy', n: 6, slot: 'hat' },
];
export const accById = (id) => ACCESSORIES.find((a) => a.id === id) || null;
export const accForLevel = (n) => ACCESSORIES.find((a) => a.n === n) || null;

const TXT = {
  nb: {
    'rw.closet': 'Lekerom', 'rw.title': 'Lekerommet', 'rw.sub': 'Alt du har samlet. Trykk på noe for å ta det på eller av.', 'rw.back': 'Tilbake',
    'rw.locked': 'Ta alle smulene i nivå {n}', 'rw.on': 'PÅ', 'rw.records': 'Rekorder', 'rw.none': 'ikke spilt', 'rw.new': 'Nytt tilbehør: {name}! Det er på figuren.',
    'rw.best': '{crumbs}/{total} smuler, {time}', 'rw.newbest': 'Ny beste tid!',
    'acc.propeller': 'Propelllue', 'acc.redscarf': 'Rødt skjerf', 'acc.bluepack': 'Blå sekk', 'acc.crown': 'Gullkrone', 'acc.party': 'Festhatt', 'acc.cowboy': 'Cowboyhatt',
    'rw.slot.hat': 'Hatt', 'rw.slot.scarf': 'Skjerf', 'rw.slot.pack': 'Sekk', 'rw.count': '{n} av {total} samlet',
  },
  en: {
    'rw.closet': 'Toy room', 'rw.title': 'The toy room', 'rw.sub': 'Everything you have collected. Tap something to put it on or take it off.', 'rw.back': 'Back',
    'rw.locked': 'Collect all crumbs in level {n}', 'rw.on': 'ON', 'rw.records': 'Records', 'rw.none': 'not played', 'rw.new': 'New accessory: {name}! It is on your hero.',
    'rw.best': '{crumbs}/{total} crumbs, {time}', 'rw.newbest': 'New best time!',
    'acc.propeller': 'Propeller cap', 'acc.redscarf': 'Red scarf', 'acc.bluepack': 'Blue backpack', 'acc.crown': 'Gold crown', 'acc.party': 'Party hat', 'acc.cowboy': 'Cowboy hat',
    'rw.slot.hat': 'Hat', 'rw.slot.scarf': 'Scarf', 'rw.slot.pack': 'Pack', 'rw.count': '{n} of {total} collected',
  },
};
export const rt = (lang, key, vars = {}) => (TXT[lang]?.[key] ?? TXT.nb[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
export const TEXT_KEYS = { nb: Object.keys(TXT.nb), en: Object.keys(TXT.en) };

export const getBest = (st) => { const b = st.get('tlm.best', {}); return b && typeof b === 'object' ? b : {}; };
export const getUnlocks = (st) => { const u = st.get('tlm.unlocks', []); return Array.isArray(u) ? u.filter((id) => accById(id)) : []; };
export const isUnlocked = (st, id, all = false) => !!accById(id) && (all || getUnlocks(st).includes(id));
// Valgt tilbehør per plass. Ukjente eller ikke opplåste id-er ignoreres (lagringen kan være gammel eller endret for hånd).
export function getEquipped(st, all = false) {
  const e = st.get('tlm.equip', {}) || {}, out = {};
  for (const s of SLOTS) { const a = accById(e[s]); out[s] = a && a.slot === s && isUnlocked(st, a.id, all) ? a.id : null; }
  return out;
}
// Trykk på et tilbehør: tar det på, eller av hvis det allerede er på. Returnerer nytt valg (eller null hvis det er låst).
export function toggleEquip(st, id, all = false) {
  const a = accById(id); if (!a || !isUnlocked(st, id, all)) return null;
  const cur = getEquipped(st, all); cur[a.slot] = cur[a.slot] === id ? null : id; st.set('tlm.equip', cur); return cur;
}
// Resultat av et nivå (ikke med flymodus). Husker beste smuler og beste tid, og låser opp tilbehøret når alle smuler er tatt.
// Returnerer { unlocked: tilbehør|null (bare første gang), newBestTime, newBestCrumbs }.
export function recordRun(st, { levelId, n, crumbs, total, t, flew }) {
  const out = { unlocked: null, newBestTime: false, newBestCrumbs: false };
  if (flew || !levelId) return out;
  const b = getBest(st), old = b[levelId];
  // Beste tid gjelder bare løp med minst like mange smuler som rekorden, så «10/10 smuler, 0:20» aldri kommer fra to ulike løp.
  const oc = old?.crumbs || 0, nc = crumbs || 0, tt = t > 0 ? Math.round(t * 10) / 10 : 0;
  const cur = { crumbs: Math.max(oc, nc), total: total || old?.total || 0, t: old?.t > 0 ? old.t : 0 };
  out.newBestCrumbs = nc > oc;
  if (nc > oc) cur.t = tt;                                                              // flere smuler enn før: tiden følger det løpet
  else if (nc === oc && tt > 0 && (!(old?.t > 0) || tt < old.t)) { out.newBestTime = !!(old?.t > 0); cur.t = tt; }
  b[levelId] = cur; st.set('tlm.best', b);
  const acc = total > 0 && crumbs >= total ? accForLevel(n) : null;
  if (acc && !getUnlocks(st).includes(acc.id)) {
    st.set('tlm.unlocks', [...getUnlocks(st), acc.id]);
    const e = getEquipped(st); e[acc.slot] = acc.id; st.set('tlm.equip', e);       // det nye tilbehøret tas på med en gang
    out.unlocked = acc;
  }
  return out;
}
