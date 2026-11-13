// R53: dynamisk toppbånd. Ren logikk (ingen DOM) for hva båndet skal vise akkurat nå: prioritert kø med ttl, avbrytelse og ingen dobbeltmeldinger.
// Visningen står i topband_view.js; koblingen mot spillet i main.js. Testes i test_topband.mjs.
//
// Prioritet (høyest først): fare/boss > svar fra Claude og send-status > kontekstuell hint > NESTE-mål/delmål > hvile (brett, versjon, ★).
export const PRIO = { rest: 1, next: 2, hint: 3, reply: 4, danger: 5 };
export const MAX_QUEUE = 8;
export const AUTO_CLOSE_MS = 6000;
export const SIZES = { compact: 32, normal: 40 };

export const createQueue = () => ({ items: [], seq: 0 });

// Legg inn (eller fornye) en melding. Samme id erstatter den gamle (ingen dobbeltmelding). Samme tekst og prioritet under en annen id slår sammen.
// ttl i sekunder; 0 = står til den fjernes (clear). Returnerer meldingen.
export function push(q, { id, prio, text, ttl = 4, kind = 'msg' }, now) {
  if (!id || !text || !(prio > 0)) return null;
  q.items = q.items.filter((m) => m.id !== id && !(m.text === text && m.prio === prio));
  const m = { id, prio, text, kind, until: ttl > 0 ? now + ttl * 1000 : Infinity, seq: ++q.seq };
  q.items.push(m);
  if (q.items.length > MAX_QUEUE) { q.items.sort((a, b) => b.prio - a.prio || b.seq - a.seq); q.items.length = MAX_QUEUE; }
  return m;
}
export function clear(q, id) { const n = q.items.length; q.items = q.items.filter((m) => m.id !== id); return q.items.length !== n; }
export function prune(q, now) { q.items = q.items.filter((m) => m.until > now); }

// Den meldingen som skal vises nå: høyeste prioritet, ved likt den nyeste. En ny melding med høyere prioritet avbryter; lavere ligger i køen og kommer tilbake.
export function active(q, now) {
  prune(q, now);
  let best = null;
  for (const m of q.items) if (!best || m.prio > best.prio || (m.prio === best.prio && m.seq > best.seq)) best = m;
  return best;
}

// ctx: { levelLabel, version, nextText, nextAng, goalHead, crumbs: {n, total}|null, goalDone, goalTotal }
// Returnerer det båndet viser: { kind, prio, text, arrow (vinkel i radianer eller null), dim, id }
export function compose(q, ctx, now) {
  const m = active(q, now);
  if (m) return { kind: m.kind, prio: m.prio, text: m.text, arrow: null, dim: false, id: m.id };
  if (ctx.nextText) return { kind: 'next', prio: PRIO.next, text: ctx.nextText, arrow: Number.isFinite(ctx.nextAng) ? ctx.nextAng : null, dim: false, id: 'next' };
  if (ctx.goalHead) return { kind: 'goal', prio: PRIO.next, text: ctx.goalHead, arrow: null, dim: false, id: 'goal' };
  return { kind: 'rest', prio: PRIO.rest, text: ctx.levelLabel || '', arrow: null, dim: true, id: 'rest' };
}

// Det faste i båndet (alltid lesbart): versjon og ★-teller. ★ kommer fra delmål hvis de finnes, ellers fra smuler.
export function statusParts(ctx) {
  const star = ctx.goalTotal > 0 ? `★ ${ctx.goalDone}/${ctx.goalTotal}` : ctx.crumbs && ctx.crumbs.total > 0 ? `★ ${ctx.crumbs.n}/${ctx.crumbs.total}` : '';
  return { ver: ctx.version ? `v${ctx.version}` : '', star };
}

// Nøkkel som endres når båndets innhold bytter (brukes til logEv og til å unngå unødvendig DOM-skriving).
export const bandKey = (c) => `${c.kind}|${c.id}|${c.text}`;

// Utvidet panel: alt som lå løst før, samlet. goals: [{text, done, active}], rep: siste svar, send: status.
export function panelModel(ctx) {
  const lines = [];
  lines.push({ k: 'head', text: `${ctx.version ? `v${ctx.version} · ` : ''}${ctx.levelLabel || ''}` });
  if (ctx.goals && ctx.goals.length) lines.push({ k: 'goals', items: ctx.goals });
  if (ctx.nextText) lines.push({ k: 'next', text: ctx.nextText });
  if (ctx.send) lines.push({ k: 'send', text: ctx.send });
  if (ctx.reply) lines.push({ k: 'reply', text: ctx.reply });
  if (ctx.counts && ctx.counts.length) lines.push({ k: 'counts', items: ctx.counts });
  return lines;
}

// Lukking: automatisk etter AUTO_CLOSE_MS uten trykk, eller ved trykk utenfor.
export const shouldClose = (lastTouch, now, ms = AUTO_CLOSE_MS) => now - lastTouch >= ms;
export const bandHeight = (size) => SIZES[size] || SIZES.compact;
