// R152: «Lag brett fra bilder» (DOM). Bruker startskjermens #start og knappestiler (.mbtn) som VELG BRETT/MINE BRETT. Logikk: leditor_logic.js, tekster: leditor_text.js.
// Flyt: veiledning + samtykke → 2–4 bilder (nedskalert her, i minnet) → fire spørsmål → LAG BRETT (tjenesten) → forslag med SJEKK, JUSTER, SPILL, DEL, LAGRE. Bilder lagres aldri.
import { LE } from './leveleditor_logic.js';
import { LED, photoCountOk, fitDim, splitDataUrl, imageFits, lowerQuality, callTolk, sceneToRoom, canPlay, checkVerdict, thingsOf, thingAt, moveThing, deleteThing, undoStack, saveRoom, defaultName, ledLog, goalCandidates, summarizeScene, interpretation, brightenData, lastRoom, setLastRoom, saveRoomScene, loadRoomScene, STEPS, stepNow, setStep, moveThings, moveThingTo, deleteThings, thingInfo, moveThingsY, setThingsY, stepLight, lightPct } from './leditor_logic.js';
import { shareRoom, setRoomCode, safeName, listRooms, fmtWhen } from './rooms_logic.js';
import { thingName } from './kindnames.js';
import { ltx, lerr, lverdict, lsub } from './leditor_text.js';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CSS = `#start.rml{justify-content:flex-start;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-top:max(26px,env(safe-area-inset-top));padding-bottom:max(18px,env(safe-area-inset-bottom))}
#start .ledbox{width:min(340px,88vw);background:#ffffff14;border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;text-align:left;font:500 14px/1.35 system-ui}
#start .ledbox ul{margin:0;padding-left:18px}#start .ledbox b{font:800 15px system-ui}
#start .ledrow{display:flex;gap:6px;flex-wrap:wrap;width:min(340px,88vw)}#start .ledrow .mbtn{flex:1 1 40%;min-width:0;padding:12px 4px;font-size:15px}
#start .ledrow .mbtn.on{background:#ffd9a0;color:#1a2238;border-color:#ffd9a0}
#start .ledth{display:flex;gap:6px;flex-wrap:wrap;width:min(340px,88vw)}#start .ledth div{position:relative;width:76px;height:76px;border-radius:8px;overflow:hidden;background:#0b1226}
#start .ledth img{width:100%;height:100%;object-fit:cover}#start .ledth button{position:absolute;right:2px;bottom:2px;border:0;border-radius:6px;background:#000b;color:#fff;font:700 11px system-ui;padding:6px 8px;min-height:30px}
#start .ledmsg{min-height:20px;max-width:min(340px,88vw);font:600 14px/1.3 system-ui;color:#ffd9a0;text-align:center}
#start .ledin{width:min(320px,84vw);box-sizing:border-box;font:700 17px system-ui;text-align:center;padding:12px;border-radius:10px;border:2px solid #ffffff55;background:#0b1226;color:#fff}
#start canvas.ledmap{position:static;inset:auto;display:block;width:min(340px,88vw);border-radius:10px;background:#0b1226;touch-action:manipulation}
#start .ledmeas{display:flex;flex-direction:column;gap:4px;font-size:13px;opacity:.9;flex:1;min-width:0}#start .ledmeas .ledin{width:100%;box-sizing:border-box;text-align:center}
#start .ledarrows{display:grid;grid-template-columns:repeat(3,56px);gap:6px;justify-content:center}#start .ledarrows .mbtn{width:auto;min-width:0;padding:0;height:52px;font-size:22px}`;

// Skalerer et bilde (File/Blob) til lengste side LE.maxDim og JPEG. Gir { media_type, data, url } eller null. Bildet ligger bare i minnet.
async function scaleFile(file) {
  let src, w, h, cleanup = () => {};
  try {
    if (typeof createImageBitmap === 'function') { const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); src = bmp; w = bmp.width; h = bmp.height; cleanup = () => bmp.close?.(); }
    else throw new Error('no bitmap');
  } catch {
    const u = URL.createObjectURL(file);
    try { const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = u; }); src = img; w = img.naturalWidth; h = img.naturalHeight; } catch { URL.revokeObjectURL(u); return null; }
    cleanup = () => URL.revokeObjectURL(u);
  }
  try {
    let dim = LE.maxDim, bright = null;
    for (let tries = 0; tries < 4; tries++) {
      const f = fitDim(w, h, dim), c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
      const g2 = c.getContext('2d'); g2.drawImage(src, 0, 0, f.w, f.h);
      if (!bright) { try { const id = g2.getImageData(0, 0, f.w, f.h); bright = brightenData(id.data); if (bright.gamma < 1) g2.putImageData(id, 0, 0); } catch { bright = { mean: -1, gamma: 1, after: -1 }; } }   // R163: for mørkt bilde lysnes (bare i minnet)
      for (let q = LED.quality; q !== null; q = lowerQuality(q)) {
        const url = c.toDataURL('image/jpeg', q), im = splitDataUrl(url);
        if (imageFits(im)) return { ...im, url, bright };
      }
      dim = Math.round(dim * 0.75);
    }
    return null;
  } finally { cleanup(); }
}

// ctx: { $, st, lang, getCode, getVersion, logEv, toast, onPlay(id), onBack(), onMine() }
export function createLeditorView(ctx) {
  const { $, st, logEv } = ctx; const L = () => ctx.lang();
  let S = null, busy = false, abort = null, tick = null;
  const T = (k, ...a) => ltx(L(), k, ...a);
  const css = () => { if (!document.getElementById('ledcss')) { const s = document.createElement('style'); s.id = 'ledcss'; s.textContent = CSS; document.head.appendChild(s); } };
  const fresh = () => ({ photos: [], answers: { goal: 'top', difficulty: 'medium', theme: '', foes: true, measures: { w: '', d: '', h: '' } }, scene: null, room: null, savedId: '', name: '', usage: { cost_usd: 0, ms: 0 }, edits: 0, undo: undoStack(), sels: [], multi: false, code: '', job: '' });
  const root = () => { css(); const el = $('start'); el.classList.add('rml'); return el; };
  const msg = (t) => { const m = $('ledMsg'); if (m) m.textContent = t || ''; };
  const consented = () => { try { return localStorage.getItem(LED.consentKey) === '1'; } catch { return false; } };
  const setConsent = () => { try { localStorage.setItem(LED.consentKey, '1'); } catch { /* uten lagring spør vi igjen */ } };
  // R173: TILBAKE fra resultat og JUSTER går til lag-brett-menyen. Et brett som ikke er lagret ennå, lagres først (ellers mistes tolkningen).
  const autosave = () => {
    if (!S || !S.room || !S.room.ok) return;
    if (S.savedId) { saveRoom(st, { id: S.savedId, name: S.name, level: S.room.level }); saveRoomScene(st, S.savedId, S.scene); return; }
    const res = saveRoom(st, { id: '', name: S.name || 'Mitt brett', level: S.room.level });
    if (res.ok) { S.savedId = res.id; saveRoomScene(st, res.id, S.scene); setLastRoom(st, res.id); logEv?.('leveleditor', 'lagret ved tilbake'); }
  };
  const backToMenu = () => { autosave(); show(); };
  const leave = () => { stopTick(); abort?.abort(); if (S) S.photos.length = 0; S = null; const el = $('start'); el.classList.remove('rml'); ctx.onBack?.(); };
  const stopTick = () => { if (tick) { clearInterval(tick); tick = null; } };

  // ---- 1. veiledning og samtykke ----
  function show() {
    S = fresh(); logEv?.('leveleditor', 'åpnet'); const last = lastRoom(st);   // R167: det siste brettet kan åpnes igjen (JUSTER, MÅL, VIS TOLKNING)
    const el = root();
    el.innerHTML = `<h1>${esc(T('title'))}</h1><div class="ledbox"><b>${esc(T('guideH'))}</b><ul>${T('guide').map((g) => `<li>${esc(g)}</li>`).join('')}</ul></div>`
      + (consented() ? '' : `<div class="ledbox"><b>${esc(T('consentH'))}</b><span>${esc(T('consent'))}</span></div>`)
      + (getK(DONE_KEY) ? `<button class="mbtn" id="ledDone">${esc(T('bgOpen'))}</button>` : '')
      + (busy && !getK(DONE_KEY) ? `<p class="tag">${esc(T('bgRunning'))}</p>` : (getK(BG_KEY) && !getK(DONE_KEY) ? `<button class="mbtn" id="ledBgGet">${esc(T('bgGet'))}</button>` : ''))
      + (last ? `<button class="mbtn" id="ledLast">${esc(T('lastBtn', last.name, fmtWhen(last.at)))}</button>` : '')
      + (ctx.onMine && listRooms(st).length ? `<button class="mbtn sec" id="ledMine">${esc(T('mine'))}</button>` : '')
      + `<button class="mbtn${last ? ' sec' : ''}" id="ledGo">${esc(consented() ? T('next') : T('consentBtn'))}</button><button class="mbtn sec" id="ledBack">${esc(T('back'))}</button>`;
    if ($('ledDone')) $('ledDone').onclick = () => { const d = getK(DONE_KEY); setK(DONE_KEY, null); if (d && d.scene) { logEv?.('leveleditor', 'åpner ferdig bakgrunnsjobb'); accept({ ok: true, scene: d.scene, usage: d.usage }, Date.now()); } };
    if ($('ledBgGet')) $('ledBgGet').onclick = () => { const b = getK(BG_KEY); if (!b || !b.job) return; S.job = b.job; if (b.answers) S.answers = b.answers; logEv?.('leveleditor', 'henter pågående tolkning'); make(); };
    if (last) $('ledLast').onclick = () => resume(last.id);
    if ($('ledMine')) $('ledMine').onclick = () => { const el2 = $('start'); el2.classList.remove('rml'); ctx.onMine?.(); };
    $('ledGo').onclick = () => { setConsent(); photos(); };
    $('ledBack').onclick = leave;
  }

  // ---- 2. bilder ----
  function photos() {
    const el = root();
    el.innerHTML = `<h1>${esc(T('title'))}</h1><p class="tag" id="ledCount">${esc(T('count', S.photos.length))}</p><div class="ledth" id="ledTh"></div>`
      + `<div class="ledrow"><button class="mbtn" id="ledTake">📷 ${esc(T('take'))}</button><button class="mbtn sec" id="ledPick">🖼 ${esc(T('pick'))}</button></div>`
      + `<input type="file" accept="image/*" capture="environment" id="ledFileCam" hidden><input type="file" accept="image/*" multiple id="ledFileSel" hidden>`
      + `<div class="ledmsg" id="ledMsg"></div><button class="mbtn" id="ledNext">${esc(T('next'))}</button><button class="mbtn sec" id="ledBack">${esc(T('back'))}</button>`;
    const draw = () => {
      $('ledCount').textContent = T('count', S.photos.length);
      $('ledTh').innerHTML = S.photos.map((p, i) => `<div><img alt="" src="${p.url}"><button data-i="${i}">${esc(T('remove'))}</button></div>`).join('');
      $('ledTh').querySelectorAll('button').forEach((b) => { b.onclick = () => { S.photos.splice(+b.dataset.i, 1); draw(); }; });
    };
    const add = async (files) => {
      for (const f of [...files]) {
        if (S.photos.length >= LE.photosMax) { msg(T('tooMany')); break; }
        msg(T('scaling')); const p = await scaleFile(f);
        if (!p) { msg(T('badImage')); continue; }
        S.photos.push(p); msg(p.bright && p.bright.mean >= 0 && p.bright.mean < LED.darkTip ? T('darkTip') : ''); draw();
        if (p.bright && p.bright.mean >= 0) logEv?.('leveleditor', `bilde lysstyrke ${p.bright.mean}${p.bright.gamma < 1 ? ` → ${p.bright.after} (lysnet, gamma ${p.bright.gamma})` : ' (ikke lysnet)'}`);
      }
    };
    $('ledTake').onclick = () => $('ledFileCam').click(); $('ledPick').onclick = () => $('ledFileSel').click();
    for (const id of ['ledFileCam', 'ledFileSel']) $(id).onchange = (e) => { const fl = e.target.files; add(fl).then(() => { e.target.value = ''; }); };
    $('ledNext').onclick = () => { if (!photoCountOk(S.photos.length)) { msg(S.photos.length < LE.photosMin ? T('needMore') : T('tooMany')); return; } questions(); };
    $('ledBack').onclick = show;
    draw();
  }

  // ---- 3. spørsmål (store knapper, ett trykk hver) ----
  function questions() {
    const el = root(), A = S.answers;
    const grp = (q, key, opts, labelGroup) => `<p class="tag">${esc(T(q))}</p><div class="ledrow" data-k="${key}">${opts.map((o) => `<button class="mbtn sec${String(A[key]) === String(o.v) ? ' on' : ''}" data-v="${esc(o.v)}">${esc(o.t)}</button>`).join('')}</div>`;
    el.innerHTML = `<h1>${esc(T('qH'))}</h1>`
      + grp('qGoal', 'goal', ['top', 'out', 'treasure'].map((v) => ({ v, t: lsub(L(), 'goal', v) })))
      + grp('qDiff', 'difficulty', ['easy', 'medium', 'hard'].map((v) => ({ v, t: lsub(L(), 'diff', v) })))
      + grp('qTheme', 'theme', LED.themes.map((v) => ({ v, t: lsub(L(), 'theme', v) })))
      + grp('qFoes', 'foes', [{ v: true, t: lsub(L(), 'foes', 'on') }, { v: false, t: lsub(L(), 'foes', 'off') }])
      + `<p class="tag">${esc(T('measuresH'))}</p><p class="tag" style="max-width:320px;margin-top:-4px">${esc(T('measuresHelp'))}</p>`
      + `<div class="ledrow" id="ledMeas">${['w', 'd', 'h'].map((k) => `<label class="ledmeas">${esc(T('meas_' + k))}<input class="ledin" data-m="${k}" inputmode="decimal" autocomplete="off" placeholder="${esc(T('measPh'))}" value="${esc((A.measures || {})[k] || '')}"></label>`).join('')}</div>`
      + `<div class="ledmsg" id="ledMsg"></div><button class="mbtn" id="ledMake">${esc(T('make'))}</button><button class="mbtn sec" id="ledBack">${esc(T('back'))}</button>`;
    el.querySelectorAll('.ledrow[data-k]').forEach((row) => row.querySelectorAll('button').forEach((b) => {
      b.onclick = () => { const k = row.dataset.k; A[k] = k === 'foes' ? b.dataset.v === 'true' : b.dataset.v; row.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); };
    }));
    el.querySelectorAll('#ledMeas input').forEach((i) => { i.oninput = () => { A.measures = A.measures || {}; A.measures[i.dataset.m] = i.value; }; });
    $('ledMake').onclick = make; $('ledBack').onclick = photos;
  }

  // ---- 4. kall til tjenesten ----
  const BG_KEY = 'tlm.led.bg', DONE_KEY = 'tlm.led.done';
  const getK = (k) => { try { return st.get(k, null); } catch { return null; } };
  const setK = (k, v) => { try { st.set(k, v); } catch { /* uten lagring */ } };
  function finishDetached(run, res, t0) {
    stopTick(); busy = false; abort = null;
    if (res.ok) { setK(DONE_KEY, { scene: res.scene, usage: res.usage || { cost_usd: 0, ms: 0 }, at: Date.now() }); setK(BG_KEY, null); logEv?.('leveleditor', `bakgrunnsjobb ferdig etter ${Math.round((Date.now() - t0) / 1000)} s`); ctx.toast?.(T('bgDone')); }
    else { setK(BG_KEY, res.job ? { job: res.job, at: Date.now(), answers: run.answers } : null); logEv?.('leveleditor', `bakgrunnsjobb feilet: ${res.reason}`); ctx.toast?.(T('bgFail', lerr(L(), res.reason))); }
  }
  const KEEP_PHOTOS = ['nett', 'feil', 'tolkning', 'avbrutt'];
  async function make() {
    if (busy) return; busy = true; const run = S; const t0 = Date.now(); abort = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const el = root(); let step = 0;
    el.innerHTML = `<h1>${esc(T('title'))}</h1><p class="tag" id="ledStep">${esc(T('working')[0])}</p><p class="tag" id="ledEl"></p><p class="tag" style="max-width:300px">${esc(T('workingNote'))}</p><button class="mbtn" id="ledBg" style="display:none">${esc(T('bgBtn'))}</button><button class="mbtn sec" id="ledCancel">${esc(T('cancel'))}</button>`;
    $('ledCancel').onclick = () => abort?.abort();
    $('ledBg').onclick = () => { run.detached = true; stopTick(); run.photos.length = 0; logEv?.('leveleditor', 'jobber videre i bakgrunnen'); const e2 = $('start'); e2.classList.remove('rml'); ctx.onBack?.(); };   // R183: den asynkrone jobben fortsetter, bildene slippes
    tick = setInterval(() => { const s = Math.round((Date.now() - t0) / 1000); const e = $('ledEl'); if (e) e.textContent = T('elapsed', s); const k = s < 4 ? 0 : s < 25 ? 1 : 2; if (k !== step) { step = k; const st2 = $('ledStep'); if (st2) st2.textContent = T('working')[k]; } }, 500);
    logEv?.('leveleditor', `sender ${S.photos.length} bilder${(() => { const o = ctx.getOpts?.() || {}; return o.model || o.mode ? ' (' + [o.model, o.mode].filter(Boolean).join(', ') + ')' : ''; })()}${S.answers.measures && (S.answers.measures.w || S.answers.measures.d || S.answers.measures.h) ? ' (med romtall)' : ''}`);
    const tolk = (job) => callTolk({ code: ctx.getCode(), images: S.photos, answers: S.answers, opts: ctx.getOpts?.() }, { signal: abort?.signal, job, onJob: (id) => { S.job = id; try { st.set(BG_KEY, { job: id, at: Date.now(), answers: S.answers }); } catch { /* uten lagring */ } const bb = $('ledBg'); if (bb) bb.style.display = ''; logEv?.('leveleditor', `jobb startet ${String(id).slice(0, 8)}`); } });
    if (S.job) logEv?.('leveleditor', `henter jobb ${String(S.job).slice(0, 8)} på nytt (uten å sende bildene)`);
    let res = await tolk(S.job || '');
    if (!res.ok && res.reason === 'finnes_ikke' && S.job && S.photos.length) { S.job = ''; logEv?.('leveleditor', 'jobben var borte: sender bildene på nytt'); res = await tolk(''); }
    if (!res.ok && res.unreadable && S.photos.length && !abort?.signal?.aborted) {   // svaret kom, men kunne ikke leses: ett nytt forsøk av seg selv med de samme bildene
      logEv?.('leveleditor', `svar ${res.status} kunne ikke leses etter ${res.ms} ms: prøver én gang til`);
      res = await tolk('');
    }
    if (run.detached) { finishDetached(run, res, t0); return; }   // R183: du gjorde andre ting mens den jobbet
    stopTick(); busy = false; abort = null;
    S.job = res.ok ? '' : (res.job || '');   // et tidsavbrudd beholder jobben så NYTT FORSØK henter den samme uten ny tolkning
    // Bildene lagres aldri, bare i minnet. Ved nett- og tjenestefeil beholdes de så du slipper å velge dem på nytt (NYTT FORSØK); ellers slippes de straks.
    if (!res.ok) { const keep = KEEP_PHOTOS.includes(res.reason) && S.photos.length; if (!keep) S.photos.length = 0; logEv?.('leveleditor', `feilet: ${res.reason} · status ${res.status ?? '?'}${res.unreadable ? ' (svar kunne ikke leses)' : ''}${res.diag ? ' · ' + JSON.stringify(res.diag).slice(0, 120) : ''} (${Date.now() - t0} ms)${keep ? ' · bildene beholdt for nytt forsøk' : ''}`); failed(res.reason); return; }
    accept(res, t0);
  }
  // R183: resten av tolkningen (felles for «venter her» og «hentet fra bakgrunnen»)
  function accept(res, t0) {
    setK(BG_KEY, null);
    S.photos.length = 0;
    S.scene = res.scene; S.usage = res.usage || { cost_usd: 0, ms: 0 }; logEv?.('leveleditor', `tolket: ${S.usage.model || '?'} · ${S.usage.mode || '?'} · trinn ${(S.usage.stages || []).join('+') || '?'} · ${S.usage.cost_usd ?? '?'} USD · ${Math.round((S.usage.ms || 0) / 1000)} s`); S.name = defaultName(res.scene);
    const room = sceneToRoom(res.scene); S.room = room; if (room.scene) S.scene = room.scene;
    if (!room.ok) { logEv?.('leveleditor', `scene ble ikke brett: ${room.reason}${room.detail ? ' (' + room.detail + ')' : ''} · ${summarizeScene(S.scene)}`); failed(room.reason); return; }
    if (room.autoGoal) logEv?.('leveleditor', `auto-mål på ${room.autoGoal}`);
    logEv?.('leveleditor', ledLog({ what: 'forslag', cost: S.usage.cost_usd, ms: S.usage.ms || Date.now() - t0, edits: 0, bot: room.solvable ? 'vei' : 'ingen', extra: `${room.things} ting, ${room.helperCount} hjelpeobjekter` }));
    result(room.autoGoal ? T('autoGoal') : '');
  }
  function failed(reason) {
    const el = root();
    const hasScene = !!(S && S.scene && S.scene.room);   // forslaget finnes, men ble ikke et brett: JUSTER og VIS TOLKNING gir en vei videre
    el.innerHTML = `<h1>${esc(T('title'))}</h1><p class="tag">${esc(lerr(L(), reason))}</p>`
      + (hasScene ? `<button class="mbtn" id="ledFixAdj">${esc(T('adjust'))}</button><button class="mbtn sec" id="ledFixInt">${esc(T('interp'))}</button>` : '')
      + `<button class="mbtn${hasScene ? ' sec' : ''}" id="ledAgain">${esc(T('again'))}</button><button class="mbtn sec" id="ledBack">${esc(T('back'))}</button>`;
    if (hasScene) { $('ledFixAdj').onclick = () => { logEv?.('leveleditor', `juster etter feil: ${reason}`); adjust(); }; $('ledFixInt').onclick = () => interp(); }
    $('ledAgain').onclick = () => { S.photos.length ? questions() : (logEv?.('leveleditor', 'nytt forsøk: velg bilder på nytt'), photos()); };
    $('ledBack').onclick = show;
  }

  // ---- 5. forslaget ----
  const verdictText = () => { const r = S.room, k = checkVerdict(r); return lverdict(L(), k, r && r.helperCount); };
  const logSummary = (what) => logEv?.('leveleditor', ledLog({ what, cost: S.usage.cost_usd, ms: S.usage.ms, edits: S.edits, bot: S.room && S.room.ok ? (S.room.solvable ? 'vei' : 'ingen') : '' }));
  function result(note = '') {
    const el = root(), r = S.room, ok = canPlay(r);
    el.innerHTML = `<h1>${esc(T('resultH'))}</h1><div class="ledbox"><b>${esc(S.name)}</b><span>${esc(T('things', r.things))}</span><span id="ledVerdict">${esc(verdictText())}</span></div>`
      + `<p class="tag">${esc(T('nameLabel'))}</p><input class="ledin" id="ledName" maxlength="30" value="${esc(S.name)}" autocomplete="off">`
      + `<div class="ledrow"><button class="mbtn" id="ledPlay">${esc(T('play'))}</button><button class="mbtn sec" id="ledAdj">${esc(T('adjust'))}</button><button class="mbtn sec" id="ledChk">${esc(T('check'))}</button><button class="mbtn sec" id="ledShare">${esc(T('share'))}</button><button class="mbtn sec" id="ledInt">${esc(T('interp'))}</button><button class="mbtn sec" id="ledFly">${esc(T('fly'))}</button></div>`
      + `<div class="ledmsg" id="ledMsg">${esc(note)}</div><button class="mbtn sec" id="ledSave">${esc(S.savedId ? T('mine') : T('save'))}</button><button class="mbtn sec" id="ledBack">${esc(T('back'))}</button>`;
    const nm = () => { S.name = safeName($('ledName').value, S.name || 'Mitt brett'); return S.name; };
    const save = () => {
      const lvl = S.room.level, res = saveRoom(st, { id: S.savedId, name: nm(), level: lvl });
      if (!res.ok) { msg(lerr(L(), res.reason)); logEv?.('leveleditor', `lagring feilet: ${res.reason}`); return null; }
      if (!res.again) logSummary('lagret'); S.savedId = res.id; saveRoomScene(st, res.id, S.scene); setLastRoom(st, res.id); return res.id;   // R167: tolkningen følger brettet, så JUSTER kan åpnes igjen etter spilling
    };
    $('ledPlay').disabled = false; if (!ok) $('ledPlay').classList.add('sec');
    $('ledPlay').onclick = () => { const id = save(); if (id) { logSummary('spiller'); ctx.onPlay?.(id); } };
    $('ledAdj').onclick = adjust; $('ledInt').onclick = () => interp();
    $('ledFly').onclick = () => { const id = save(); if (id) { logSummary('flyr'); ctx.onFly ? ctx.onFly(id) : ctx.onPlay?.(id); } };   // R174: åpner brettet i flymodus
    $('ledChk').onclick = () => { S.room = sceneToRoom(S.scene, S.name); if (S.room.scene) S.scene = S.room.scene; logSummary('sjekk'); result(); };
    $('ledSave').onclick = () => { if (S.savedId) { ctx.onMine?.(); return; } const id = save(); if (id) { result(T('saved')); } };
    $('ledBack').onclick = backToMenu;
    $('ledShare').onclick = async () => {
      if (busy) return; const id = save(); if (!id) return;
      let code = S.code; busy = true;
      if (!code) {
        msg(T('sharing')); const res = await shareRoom({ tcode: ctx.getCode(), name: S.name, level: S.room.level, version: ctx.getVersion?.() }); busy = false;
        if (!res.ok) { msg(lerr(L(), res.reason === 'nett' ? 'nettdel' : res.reason)); logEv?.('leveleditor', `del feilet: ${res.reason}`); return; }
        code = S.code = res.code; setRoomCode(st, id, code); logSummary('delt');
      } else busy = false;
      try { navigator.clipboard?.writeText(code).then(() => ctx.toast?.(T('copied')), () => ctx.toast?.(T('copyFail'))); } catch { ctx.toast?.(T('copyFail')); }
      msg(T('shared', code));
    };
  }

  // ---- 5b. vis tolkningen: hva spillet fant i bildene (liste), og hva det la inn selv ----
  function interp() {
    const el = root(), I = interpretation(S.scene, S.room), ok = !!(S.room && S.room.ok);
    el.innerHTML = `<h1>${esc(T('interpH'))}</h1><p class="tag" style="max-width:320px">${esc(T('interpIntro', I.things.length))}</p>`
      + `<div class="ledbox" style="text-align:left;max-height:46vh;overflow-y:auto">${I.things.length ? '<ul>' + I.things.map((t) => `<li>${esc(T('interpRow', { ...t, name: thingName(t.kind, t.label, L()) }))}</li>`).join('') + '</ul>' : esc(T('interpNone'))}</div>`
      + (I.goalAuto ? `<p class="tag">${esc(T('interpAuto'))}</p>` : '') + (I.helpers.length ? `<p class="tag">${esc(T('interpHelpers', I.helpers.length))}</p>` : '')
      + (I.uncertainty ? `<p class="tag" style="max-width:320px">${esc(T('interpUnc'))} ${esc(I.uncertainty)}</p>` : '')
      + `<button class="mbtn" id="ledIntBack">${esc(T('back'))}</button>`;
    $('ledIntBack').onclick = () => (ok ? result() : failed(S.room ? S.room.reason : 'scene'));
  }

  // ---- 6. juster: kart ovenfra, trykk en ting, flytt med piler eller slett ----
  function adjust() {
    const el = root(), sc = () => S.scene;
    el.innerHTML = `<h1>${esc(T('adjH'))}</h1><p class="tag" style="max-width:320px">${esc(T('adjIntro'))}</p><canvas class="ledmap" id="ledMap"></canvas>`
      + `<p class="tag" id="ledSel">${esc(T('adjNone'))}</p>`
      + `<div class="ledrow"><button class="mbtn sec" id="ledMulti">${esc(T('multiBtn'))}</button></div>`
      + `<div class="ledrow" id="ledPos"><label class="ledmeas">${esc(T('posX'))}<input class="ledin" id="ledPx" inputmode="numeric" autocomplete="off"></label><label class="ledmeas">${esc(T('posZ'))}<input class="ledin" id="ledPz" inputmode="numeric" autocomplete="off"></label><label class="ledmeas">${esc(T('posY'))}<input class="ledin" id="ledPy" inputmode="numeric" autocomplete="off"></label></div>`
      + `<div class="ledrow" id="ledHt"><button class="mbtn sec" id="ledUp">${esc(T('hUp'))}</button><button class="mbtn sec" id="ledDown">${esc(T('hDown'))}</button><button class="mbtn sec" id="ledFloor">${esc(T('hFloor'))}</button></div>`
      + `<p class="tag" style="margin-bottom:0">${esc(T('stepH'))}</p><div class="ledrow" id="ledSteps">${STEPS.map((v) => `<button class="mbtn sec" data-s="${v}">${v}</button>`).join('')}</div>`
      + `<div class="ledarrows"><span></span><button class="mbtn sec" data-d="0,-1">▲</button><span></span><button class="mbtn sec" data-d="-1,0">◀</button><button class="mbtn sec" id="ledDel" style="font-size:13px">${esc(T('del'))}</button><button class="mbtn sec" data-d="1,0">▶</button><span></span><button class="mbtn sec" data-d="0,1">▼</button><span></span></div>`
      + `<p class="tag">${esc(T('goalH'))}</p><div class="ledrow" id="ledGoals"></div>`
      + `<p class="tag" id="ledLightV"></p><div class="ledrow"><button class="mbtn sec" id="ledDark">${esc(T('lightDown'))}</button><button class="mbtn sec" id="ledBright">${esc(T('lightUp'))}</button></div>`
      + `<div class="ledmsg" id="ledMsg"></div><div class="ledrow"><button class="mbtn sec" id="ledUndo">${esc(T('undo'))}</button><button class="mbtn" id="ledDone">${esc(T('done'))}</button></div><button class="mbtn sec" id="ledAdjBack">${esc(T('back'))}</button>`;
    const cv = $('ledMap'), R = sc().room, W = 340, Hh = Math.round(W * R.depth / R.width); cv.width = W * 2; cv.height = Hh * 2; cv.style.height = `${Hh}px`; cv.style.touchAction = 'none';   // dra på kartet skal ikke rulle siden
    const k = (W * 2) / R.width;
    let drag = null;   // { p0:{x,z}, keys, dx, dz, moved, toggle }
    let cands = goalCandidates(S.scene, 4);   // målforslag: de høyeste flatene (helst nåbare), nummerert på kartet
    const renderGoals = () => { const g = $('ledGoals'); g.innerHTML = cands.map((c, i) => `<button class="mbtn sec" data-g="${i}">${esc(T('goalN', i + 1))}</button>`).join(''); g.querySelectorAll('[data-g]').forEach((b) => { b.onclick = () => { const i = +b.dataset.g; if (apply(cands[i].scene, `mål ${i + 1}`)) { msg(T('goalSet', i + 1)); cands = goalCandidates(S.scene, 4); renderGoals(); draw(); } }; }); };
    const renderSteps = () => { const now = stepNow(st); el.querySelectorAll('#ledSteps [data-s]').forEach((b) => b.classList.toggle('on', +b.dataset.s === now)); };
    const draw = () => {
      const g = cv.getContext('2d'), s = sc(); g.clearRect(0, 0, cv.width, cv.height); g.strokeStyle = '#ffffff66'; g.lineWidth = 3; g.strokeRect(1, 1, cv.width - 2, cv.height - 2);
      const th = thingsOf(s).sort((a, b) => a.top - b.top), mx = Math.max(1, ...th.map((t) => t.top));
      for (const t of th) {
        const sel = S.sels.includes(t.key), off = drag && drag.moved && sel ? [drag.dx, drag.dz] : [0, 0];   // mens du drar, vises tingen der den havner
        g.fillStyle = `hsl(${210 - 160 * (t.top / mx)} 55% ${sel ? 62 : 42}% / ${sel ? 1 : 0.8})`; g.strokeStyle = sel ? '#fff' : '#0b1226'; g.lineWidth = sel ? 5 : 2;
        const rx = (t.rect.x0 + off[0]) * k, rz = (t.rect.z0 + off[1]) * k, rw = (t.rect.x1 - t.rect.x0) * k, rh = (t.rect.z1 - t.rect.z0) * k;
        g.fillRect(rx, rz, rw, rh); g.strokeRect(rx, rz, rw, rh);
      }
      cands.forEach((c, i) => { g.beginPath(); g.arc(c.x * k, c.z * k, 12, 0, 7); g.fillStyle = '#ffd24a55'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#ffd24a'; g.stroke(); g.fillStyle = '#fff'; g.font = 'bold 20px sans-serif'; g.textAlign = 'center'; g.fillText(String(i + 1), c.x * k, c.z * k + 7); });
      const ring = (x, z, c) => { g.beginPath(); g.arc(x * k, z * k, 14, 0, 7); g.lineWidth = 6; g.strokeStyle = c; g.stroke(); };
      if (s.start) ring(s.start.x, s.start.z, '#59e07a'); if (s.goal) ring(s.goal.x, s.goal.z, '#ffd24a');
      info();
    };
    const info = () => {
      const one = S.sels.length === 1 ? thingInfo(sc(), S.sels[0]) : null;
      $('ledSel').textContent = S.sels.length > 1 ? T('selN', S.sels.length) : one ? T('infoOne', { ...one, name: thingName(one.kind, one.label, L()) }) : T('adjNone');
      const px = $('ledPx'), pz = $('ledPz'), py = $('ledPy'); px.disabled = pz.disabled = py.disabled = !one; px.value = one ? one.x : ''; pz.value = one ? one.z : ''; py.value = one ? one.y : '';
      ['ledUp', 'ledDown', 'ledFloor'].forEach((id) => { $(id).disabled = !S.sels.length; });
      $('ledMulti').classList.toggle('on', S.multi); $('ledMulti').textContent = T(S.multi ? 'multiOn' : 'multiBtn');
    };
    const apply = (next, what) => {
      if (!next) return false; const room = sceneToRoom(next, S.name, { auto: false });   // ved justering skjules ingenting: ødelegger flyttingen brettet, angres den
      const wasBad = !S.room || !S.room.ok;   // er brettet allerede ødelagt (kom hit etter en feil), godtas rettingen selv om det ikke blir helt bra ennå
      if (!room.ok && !wasBad) { msg(T('adjFail')); return false; }
      if (!room.ok) { S.undo.push(S.scene); S.scene = next; S.room = room; S.edits++; msg(T('adjStill')); logEv?.('leveleditor', `retting ${S.edits}: ${what} (fortsatt ikke riktig: ${room.reason})`); return true; }
      S.undo.push(S.scene); S.scene = next; S.room = room; S.edits++;
      if (S.savedId) { saveRoom(st, { id: S.savedId, name: S.name, level: room.level }); saveRoomScene(st, S.savedId, S.scene); if (S.code) { setRoomCode(st, S.savedId, ''); S.code = ''; } }   // rettet brett: den delte versjonen er gammel, DEL gir ny kode
      msg(verdictText()); logEv?.('leveleditor', `retting ${S.edits}: ${what}`); return true;
    };
    // trykk velger (flere om VELG FLERE er på), dra flytter alle valgte, slipp legger tingen der (ett ANGRE-steg)
    const pt = (e) => { const b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left) / b.width * R.width, z: (e.clientY - b.top) / b.height * R.depth }; };
    cv.onpointerdown = (e) => {
      const p = pt(e), t = thingAt(thingsOf(sc()), p.x, p.z);
      if (!t) { if (!S.multi) S.sels = []; drag = null; draw(); return; }
      let toggle = false;
      if (S.multi) { if (S.sels.includes(t.key)) toggle = true; else S.sels.push(t.key); } else if (!S.sels.includes(t.key) || S.sels.length > 1) S.sels = [t.key];
      drag = { p0: p, keys: S.sels.slice(), dx: 0, dz: 0, moved: false, toggle, tap: t.key }; try { cv.setPointerCapture(e.pointerId); } catch { /* ok */ }
      e.preventDefault(); draw();
    };
    cv.onpointermove = (e) => {
      if (!drag) return; const p = pt(e); drag.dx = p.x - drag.p0.x; drag.dz = p.z - drag.p0.z;
      if (!drag.moved && Math.hypot(drag.dx, drag.dz) > 6) drag.moved = true;   // under ca. 6 cm er det et trykk, ikke en dra
      if (drag.moved) draw();
    };
    const end = () => {
      const d = drag; drag = null; if (!d) return;
      if (d.moved) { const dx = Math.round(d.dx), dz = Math.round(d.dz); if (apply(moveThings(sc(), d.keys, dx, dz), `dra ${d.keys.length}`)) { /* flyttet */ } }
      else if (d.toggle) S.sels = S.sels.filter((q) => q !== d.tap);   // trykk på en valgt ting i VELG FLERE tar den ut igjen
      draw();
    };
    cv.onpointerup = end; cv.onpointercancel = () => { drag = null; draw(); };
    $('ledMulti').onclick = () => { S.multi = !S.multi; if (!S.multi && S.sels.length > 1) S.sels = [S.sels[0]]; msg(S.multi ? T('multiHelp') : ''); draw(); };
    const move = () => { const px = $('ledPx'), pz = $('ledPz'); if (S.sels.length !== 1) return; if (apply(moveThingTo(sc(), S.sels[0], px.value, pz.value), 'tall')) draw(); else info(); };
    $('ledPx').onchange = move; $('ledPz').onchange = move;
    const moveY = (next, what) => { if (apply(next, what)) draw(); else info(); };
    $('ledPy').onchange = () => { if (S.sels.length === 1) moveY(setThingsY(sc(), S.sels, $('ledPy').value), 'høyde tall'); };
    const lightTxt = () => { const e = $('ledLightV'); if (e) e.textContent = T('lightNow', lightPct(sc())); };
    const light = (dir) => { const n = stepLight(sc(), dir); if (!n) { msg(T('lightEnd')); return; } if (apply(n, dir > 0 ? 'lys opp' : 'lys ned')) { lightTxt(); msg(T('lightSet')); } };
    lightTxt(); $('ledDark').onclick = () => light(-1); $('ledBright').onclick = () => light(1);
    $('ledUp').onclick = () => { if (S.sels.length) moveY(moveThingsY(sc(), S.sels, stepNow(st)), 'høyde opp'); };
    $('ledDown').onclick = () => { if (S.sels.length) moveY(moveThingsY(sc(), S.sels, -stepNow(st)), 'høyde ned'); };
    $('ledFloor').onclick = () => { if (S.sels.length) moveY(setThingsY(sc(), S.sels, 0), 'på gulvet'); };
    el.querySelectorAll('#ledSteps [data-s]').forEach((b) => { b.onclick = () => { setStep(st, +b.dataset.s); renderSteps(); }; });
    el.querySelectorAll('[data-d]').forEach((b) => { b.onclick = () => { if (!S.sels.length) { msg(T('adjNone')); return; } const [dx, dz] = b.dataset.d.split(',').map(Number), stp = stepNow(st); if (apply(moveThings(sc(), S.sels, dx * stp, dz * stp), 'flytt')) draw(); }; });
    $('ledDel').onclick = () => { if (!S.sels.length) { msg(T('adjNone')); return; } const n = deleteThings(sc(), S.sels); if (!n) { msg(T('noGoalDel')); return; } if (apply(n, S.sels.length > 1 ? `slett ${S.sels.length}` : 'slett')) { S.sels = []; draw(); } };
    $('ledUndo').onclick = () => { const p = S.undo.pop(); if (!p) return; S.scene = p; S.room = sceneToRoom(p, S.name); S.edits = Math.max(0, S.edits - 1); if (S.savedId && S.room.ok) { saveRoom(st, { id: S.savedId, name: S.name, level: S.room.level }); saveRoomScene(st, S.savedId, S.scene); } S.sels = []; msg(verdictText()); draw(); };
    $('ledDone').onclick = () => { if (S.room && S.room.ok) result(); else { logEv?.('leveleditor', `ferdig uten brett: ${S.room ? S.room.reason : '?'}`); failed(S.room ? S.room.reason : 'scene'); } };
    $('ledAdjBack').onclick = backToMenu;
    renderGoals(); renderSteps(); if (!S.room || !S.room.ok) msg(T('adjBad')); draw();
  }
  // R167: åpner et eget brett på nytt i editoren (resultatskjermen med SPILL, JUSTER, SJEKK, DEL, VIS TOLKNING). Tolkningen er lagret på telefonen, aldri bilder.
  function resume(id) {
    const sc = loadRoomScene(st, id), meta = listRooms(st).find((r) => r.id === id);
    S = fresh(); if (!sc || !meta) { logEv?.('leveleditor', 'fortsett: fant ikke brettet'); show(); return; }
    S.scene = sc; S.savedId = id; S.name = meta.name; S.code = meta.code || ''; S.room = sceneToRoom(sc, meta.name, { auto: false });
    logEv?.('leveleditor', `fortsetter brett ${id}${S.room.ok ? '' : ' (' + S.room.reason + ')'}`); setLastRoom(st, id);
    root(); if (S.room.ok) result(); else failed(S.room.reason);
  }
  return { show, resume };
}
export const ledBtnHtml = (lang, last = null) => `<div class="bgrp" id="dfLed"><button class="mbtn sec" id="mLed">📷 ${esc(ltx(lang, 'btn'))}<small>${esc(ltx(lang, 'btnSub'))}</small></button>${last ? `<button class="mbtn sec" id="mLedLast">✏️ ${esc(ltx(lang, 'lastBtn', last.name))}</button>` : ''}</div>`;
