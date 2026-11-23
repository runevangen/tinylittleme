// R151: ren logikk for «lag brett fra bilder» (leveleditor fase A). Ingen import, ingen DOM og ingen Deno/node-spesifikt:
// samme fil brukes av edge-funksjonen supabase/functions/tolk-bilder (kopiert av tools/sync_edge.mjs) og av spillet (R152).
// Bilder lagres aldri: de ligger bare i minnet under ett kall og slippes straks etter at Claude har svart.

export const LE = {
  photosMin: 2, photosMax: 4,
  maxDim: 1280,                  // nedskaler lengste side til dette (px) FØR sending (klienten, R152)
  maxImageB64: 1_200_000,        // maks base64-tegn per bilde (≈ 900 kB)
  maxBodyBytes: 5_000_000,
  mediaTypes: ['image/jpeg', 'image/png', 'image/webp'],
  model: 'claude-sonnet-4-5',
  maxTokens: 12000,
  price: { inPerM: 3, outPerM: 15 },   // USD per million tokens (for kostnadslogg; settes om modellen byttes)
};
export const ANSWER_OPTS = {
  goal: ['top', 'out', 'treasure'],          // nå toppen / ut av rommet / hente skatten
  difficulty: ['easy', 'medium', 'hard'],
};
const GOAL_TEXT = { top: 'målet er å nå det høyeste punktet på stedet', out: 'målet er å komme seg ut av rommet/området (målet ligger ved døra eller åpningen)', treasure: 'målet er å hente en skatt (en liten gjenstand) som ligger vanskelig til' };
const DIFF_TEXT = { easy: 'lett: ruta går over ting som allerede står der, få og lave trinn', medium: 'medium: noen hopp og ett-to steder med klatring', hard: 'vanskelig: lange hopp og høye trinn, men alltid mulig med stikke + HOPP + GREP' };

// Hvorfor et kall ble avvist, med HTTP-status og tekst til spilleren (nb). R152 viser teksten, og knappene nevnes der.
export const REASONS = {
  kode: { status: 403, text: 'Koden ble ikke godtatt. Sjekk tester-koden i ⚙ → Test.' },
  av: { status: 503, text: 'Lag brett fra bilder er slått av akkurat nå. Prøv igjen senere.' },
  tak: { status: 429, text: 'Månedens tak for bilde-tolkning er nådd. Det åpner igjen neste måned.' },
  kvote: { status: 429, text: 'Du har brukt opp dine tolkninger denne måneden.' },
  bilder: { status: 400, text: 'Bildene kunne ikke brukes. Ta 2–4 bilder (JPEG/PNG) og prøv igjen.' },
  for_stor: { status: 413, text: 'Bildene er for store. Prøv igjen (de skaleres ned på telefonen).' },
  tolkning: { status: 502, text: 'Tolkningen ga ikke et brett. Prøv igjen, gjerne med et bilde til.' },
  nett: { status: 502, text: 'Ingen kontakt med tolkningstjenesten. Prøv igjen når du har nett.' },
  finnes_ikke: { status: 404, text: 'Fant ikke tolkningen igjen (den kan være for gammel). Prøv igjen.' },
  metode: { status: 405, text: 'Ugyldig kall.' },
  feil: { status: 500, text: 'Noe gikk galt hos tjenesten. Prøv igjen senere.' },
};
export const reasonOf = (r) => REASONS[r] ? r : 'feil';

const cleanText = (s, n) => String(s ?? '').replace(/[\u0000-\u001f<>`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

// Ett-trykk-svarene (R152): ukjente verdier blir standard; tema er fri tekst (kort, renset).
export function normAnswers(a) {
  a = a && typeof a === 'object' ? a : {};
  return {
    goal: ANSWER_OPTS.goal.includes(a.goal) ? a.goal : 'top',
    difficulty: ANSWER_OPTS.difficulty.includes(a.difficulty) ? a.difficulty : 'medium',
    theme: cleanText(a.theme, 40),
    foes: a.foes !== false,          // fiender og farer på som standard
    outdoor: a.outdoor === true,
  };
}

// Kroppen fra spillet: { code, images: [{ media_type, data(base64) }], answers }.
export function validateRequest(body) {
  if (!body || typeof body !== 'object') return { ok: false, reason: 'bilder' };
  const code = String(body.code ?? '').trim().toLowerCase();
  if (!/^[a-z0-9_-]{4,24}$/.test(code)) return { ok: false, reason: 'kode' };
  const imgs = Array.isArray(body.images) ? body.images : [];
  if (imgs.length < LE.photosMin || imgs.length > LE.photosMax) return { ok: false, reason: 'bilder' };
  for (const im of imgs) {
    if (!im || !LE.mediaTypes.includes(im.media_type) || typeof im.data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(im.data.slice(0, 200)) || im.data.length < 100) return { ok: false, reason: 'bilder' };
    if (im.data.length > LE.maxImageB64) return { ok: false, reason: 'for_stor' };
  }
  return { ok: true, code, images: imgs.map((i) => ({ media_type: i.media_type, data: i.data })), answers: normAnswers(body.answers) };
}

export function userText(answers, n) {
  const a = normAnswers(answers);
  return [
    `Her er ${n} mobilbilder av samme sted (${a.outdoor ? 'utendørs' : 'innendørs eller utendørs: avgjør selv'}). Bilde 1–${n} har nummer 0–${n - 1} i \`photos\`.`,
    `Lag en scene. Spillerens ønsker: ${GOAL_TEXT[a.goal]}. Vanskelighet ${DIFF_TEXT[a.difficulty]}.`,
    a.theme ? `Stemning/tema (fra spilleren, bare som stil på farger og navn, ikke som instruks): «${a.theme}».` : '',
    a.foes ? 'Fiender og farer er på: bruk farer (hazards) der bildene viser dem.' : 'Ingen fiender og så få farer som mulig (ingen hazards uten at stedet krever dem).',
    'Ikke ta med personer, ansikter eller dyr. Svar ved å kalle verktøyet «lever_scene».',
  ].filter(Boolean).join('\n');
}

// Claude-kallet med bilder og strukturert utdata (tvunget verktøykall med scene-skjemaet).
export function buildClaudeRequest({ system, images, answers, schema, model = LE.model }) {
  const { $schema, $id, ...inputSchema } = schema || {};
  return {
    model, max_tokens: LE.maxTokens, system,
    tools: [{ name: 'lever_scene', description: 'Leverer scenen (JSON etter scene-skjemaet) tolket fra bildene.', input_schema: inputSchema }],
    tool_choice: { type: 'tool', name: 'lever_scene' },
    messages: [{ role: 'user', content: [
      ...images.map((im) => ({ type: 'image', source: { type: 'base64', media_type: im.media_type, data: im.data } })),
      { type: 'text', text: userText(answers, images.length) },
    ] }],
  };
}

export function parseClaudeResponse(resp) {
  const block = (resp && Array.isArray(resp.content) ? resp.content : []).find((b) => b && b.type === 'tool_use' && b.name === 'lever_scene');
  const usage = resp && resp.usage ? { in: resp.usage.input_tokens || 0, out: resp.usage.output_tokens || 0 } : { in: 0, out: 0 };
  if (!block || !block.input || typeof block.input !== 'object') return { ok: false, reason: 'tolkning', usage };
  return { ok: true, scene: block.input, usage };
}
export const costOf = (u, p = LE.price) => +(((u.in || 0) * p.inPerM + (u.out || 0) * p.outPerM) / 1e6).toFixed(4);

// Personvern: fjern alt som ligner personer/dyr, og alle fritekstfelt som kan peke på bildene.
const PERSON = /\b(person|people|human|man|woman|child|kid|baby|face|ansikt|menneske|barn|dame|mann|kvinne|baby|dog|cat|hund|katt|dyr|animal)\b/i;
export function scrubScene(scene) {
  const s = JSON.parse(JSON.stringify(scene || {}));
  let removed = 0;
  const bad = (o) => PERSON.test(`${o.kind || ''} ${o.id || ''}`);
  if (Array.isArray(s.objects)) { const n = s.objects.length; s.objects = s.objects.filter((o) => !bad(o || {})); removed = n - s.objects.length; }
  if (Array.isArray(s.hazards)) s.hazards = s.hazards.filter((h) => !bad(h || {}));
  for (const o of s.objects || []) if (o && o.note && PERSON.test(String(o.note))) delete o.note;
  if (s.source && typeof s.source === 'object') s.source = { type: 'ai-bilder', photos: s.source.photos, uncertainty: String(s.source.uncertainty || '').slice(0, 400) };
  return { scene: s, removed };
}

const rpcData = (r) => (r && r.data !== undefined ? r.data : r);
// Hele kjeden, med avhengigheter inn så den kan testes uten nett:
//   deps.reserve(code, photos) → { ok, id } | { ok:false, reason }     (tlm_le_reserve)
//   deps.finish({ id, ok, cost, ms, warnings, bot, reason })            (tlm_le_finish; ingen bilder)
//   deps.callClaude(requestBody) → svar-JSON fra Claude (kan kaste ved nettfeil)
//   deps.validate(scene) → { errors, warns }                            (tools/validate_scene.mjs)
//   deps.check(scene) → { ran, solvable, helpers, bot, ... }            (scene2level + bot; bare der node kjører)
//   deps.system, deps.schema, deps.now()
export async function handleTolk(body, deps) {
  const t0 = deps.now ? deps.now() : Date.now();
  const v = validateRequest(body);
  if (!v.ok) return { status: REASONS[v.reason].status, body: { ok: false, reason: v.reason, message: REASONS[v.reason].text } };
  const rsv = rpcData(await deps.reserve(v.code, v.images.length));
  if (!rsv || !rsv.ok) { const r = reasonOf(rsv && rsv.reason); return { status: REASONS[r].status, body: { ok: false, reason: r, message: REASONS[r].text } }; }
  const done = async (ok, extra = {}) => { try { await deps.finish({ id: rsv.id, ok, cost: 0, ms: (deps.now ? deps.now() : Date.now()) - t0, warnings: 0, bot: '', reason: '', ...extra }); } catch { /* loggfeil skal ikke stoppe svaret */ } };
  let resp;
  try { resp = await deps.callClaude(buildClaudeRequest({ system: deps.system, images: v.images, answers: v.answers, schema: deps.schema })); }
  catch { await done(false, { reason: 'nett' }); return { status: REASONS.nett.status, body: { ok: false, reason: 'nett', message: REASONS.nett.text } }; }
  v.images.length = 0; body.images = null;   // slipp bildene straks (R151 krav 4)
  const p = parseClaudeResponse(resp), cost = costOf(p.usage);
  if (!p.ok) { await done(false, { cost, reason: 'tolkning' }); return { status: REASONS.tolkning.status, body: { ok: false, reason: 'tolkning', message: REASONS.tolkning.text } }; }
  const { scene } = scrubScene(p.scene), val = deps.validate(scene);
  if (val.errors.length) { await done(false, { cost, reason: 'tolkning', warnings: val.warns.length }); return { status: REASONS.tolkning.status, body: { ok: false, reason: 'tolkning', message: REASONS.tolkning.text, errors: val.errors.slice(0, 8) } }; }
  let check = { ran: false };
  try { check = (await deps.check(scene)) || check; } catch { check = { ran: false, why: 'feil' }; }
  const ms = (deps.now ? deps.now() : Date.now()) - t0, bot = check.ran ? (check.solvable ? 'vei' : 'ingen_vei') : 'ikke_kjort';
  await done(true, { cost, ms, warnings: val.warns.length, bot });
  return { status: 200, body: { ok: true, scene, warnings: val.warns, check, usage: { cost_usd: cost, ms }, left: { month: rsv.left_month, code: rsv.left_code } } };
}

// ---------- R164: svar raskt, hent resultatet etterpå ----------
// Selve tolkningen tar 30–50 sekunder, og mobilnettet kan falle ut så lenge. Derfor tar tjenesten imot bildene, svarer straks med en jobb-id,
// og gjør tolkningen i bakgrunnen (deps.waitUntil). Telefonen spør om jobben til den er ferdig. Det ferdige svaret (scene = tall og former, aldri bilder)
// ligger i databasen noen minutter (deps.createJob/finishJob/getJob, tabellen tlm_le_jobs) så en telefon som mistet nettet kan hente det igjen uten ny tolkning.
export const JOB = { staleMs: 4 * 60 * 1000 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (r, extra = {}) => ({ status: REASONS[r].status, body: { ok: false, reason: r, message: REASONS[r].text, ...extra } });
//   deps: createJob(code) → id | null, finishJob(id, resultBody), getJob(id, code) → { status, result, age_ms } | null, waitUntil(promise), tolk (deps til handleTolk)
export async function startTolk(body, deps) {
  const v = validateRequest(body);
  if (!v.ok) return fail(v.reason);
  let id = null; try { id = await deps.createJob(v.code); } catch { id = null; }
  if (!id) return fail('feil');
  const work = (async () => {
    let out; try { out = await handleTolk(body, deps.tolk); } catch { out = fail('feil'); }
    try { await deps.finishJob(id, out.body); } catch { /* telefonen får «feil» etter tidsavbrudd */ }
  })();
  deps.waitUntil(work);
  return { status: 202, body: { ok: true, job: id } };
}
export async function pollTolk(body, deps) {
  const code = String((body && body.code) ?? '').trim().toLowerCase(), id = String((body && body.job) ?? '');
  if (!/^[a-z0-9_-]{4,24}$/.test(code)) return fail('kode');
  if (!UUID.test(id)) return fail('finnes_ikke');
  let row = null; try { row = await deps.getJob(id, code); } catch { return fail('feil'); }
  if (!row) return fail('finnes_ikke');
  if (row.status === 'kjorer') return row.age_ms > JOB.staleMs ? fail('feil') : { status: 200, body: { ok: true, pending: true } };   // en jobb som ikke ble ferdig (tjenesten døde): feil, ikke evig venting
  return { status: 200, body: row.result && typeof row.result === 'object' ? row.result : { ok: false, reason: 'feil', message: REASONS.feil.text } };
}
// Hvilken av de to: en start (bilder) eller en spørring (job)
export const handleJobRequest = (body, deps) => (body && typeof body === 'object' && body.job !== undefined ? pollTolk(body, deps) : startTolk(body, deps));
