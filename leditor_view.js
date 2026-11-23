// R152: «Lag brett fra bilder» (DOM). Bruker startskjermens #start og knappestiler (.mbtn) som VELG BRETT/MINE BRETT. Logikk: leditor_logic.js, tekster: leditor_text.js.
// Flyt: veiledning + samtykke → 2–4 bilder (nedskalert her, i minnet) → fire spørsmål → LAG BRETT (tjenesten) → forslag med SJEKK, JUSTER, SPILL, DEL, LAGRE. Bilder lagres aldri.
import { LE } from './leveleditor_logic.js';
import { LED, photoCountOk, fitDim, splitDataUrl, imageFits, lowerQuality, callTolk, sceneToRoom, canPlay, checkVerdict, thingsOf, thingAt, moveThing, deleteThing, undoStack, saveRoom, defaultName, ledLog } from './leditor_logic.js';
import { shareRoom, setRoomCode, safeName } from './rooms_logic.js';
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
    let dim = LE.maxDim;
    for (let tries = 0; tries < 4; tries++) {
      const f = fitDim(w, h, dim), c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
      c.getContext('2d').drawImage(src, 0, 0, f.w, f.h);
      for (let q = LED.quality; q !== null; q = lowerQuality(q)) {
        const url = c.toDataURL('image/jpeg', q), im = splitDataUrl(url);
        if (imageFits(im)) return { ...im, url };
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
  const fresh = () => ({ photos: [], answers: { goal: 'top', difficulty: 'medium', theme: '', foes: true }, scene: null, room: null, savedId: '', name: '', usage: { cost_usd: 0, ms: 0 }, edits: 0, undo: undoStack(), sel: '', code: '' });
  const root = () => { css(); const el = $('start'); el.classList.add('rml'); return el; };
  const msg = (t) => { const m = $('ledMsg'); if (m) m.textContent = t || ''; };
  const consented = () => { try { return localStorage.getItem(LED.consentKey) === '1'; } catch { return false; } };
  const setConsent = () => { try { localStorage.setItem(LED.consentKey, '1'); } catch { /* uten lagring spør vi igjen */ } };
  const leave = () => { stopTick(); abort?.abort(); if (S) S.photos.length = 0; S = null; const el = $('start'); el.classList.remove('rml'); ctx.onBack?.(); };
  const stopTick = () => { if (tick) { clearInterval(tick); tick = null; } };

  // ---- 1. veiledning og samtykke ----
  function show() {
    S = fresh(); logEv?.('leveleditor', 'åpnet');
    const el = root();
    el.innerHTML = `<h1>${esc(T('title'))}</h1><div class="ledbox"><b>${esc(T('guideH'))}</b><ul>${T('guide').map((g) => `<li>${esc(g)}</li>`).join('')}</ul></div>`
      + (consented() ? '' : `<div class="ledbox"><b>${esc(T('consentH'))}</b><span>${esc(T('consent'))}</span></div>`)
      + `<button class="mbtn" id="ledGo">${esc(consented() ? T('next') : T('consentBtn'))}</button><button class="mbtn sec" id="ledBack">${esc(T('back'))}</button>`;
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
        S.photos.push(p); msg(''); draw();
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
      + `<div class="ledmsg" id="ledMsg"></div><button class="mbtn" id="ledMake">${esc(T('make'))}</button><button class="mbtn sec" id="ledBack">${esc(T('back'))}</button>`;
    el.querySelectorAll('.ledrow[data-k]').forEach((row) => row.querySelectorAll('button').forEach((b) => {
      b.onclick = () => { const k = row.dataset.k; A[k] = k === 'foes' ? b.dataset.v === 'true' : b.dataset.v; row.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); };
    }));
    $('ledMake').onclick = make; $('ledBack').onclick = photos;
  }

  // ---- 4. kall til tjenesten ----
  const KEEP_PHOTOS = ['nett', 'feil', 'tolkning', 'avbrutt'];
  async function make() {
    if (busy) return; busy = true; const t0 = Date.now(); abort = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const el = root(); let step = 0;
    el.innerHTML = `<h1>${esc(T('title'))}</h1><p class="tag" id="ledStep">${esc(T('working')[0])}</p><p class="tag" id="ledEl"></p><p class="tag" style="max-width:300px">${esc(T('workingNote'))}</p><button class="mbtn sec" id="ledCancel">${esc(T('cancel'))}</button>`;
    $('ledCancel').onclick = () => abort?.abort();
    tick = setInterval(() => { const s = Math.round((Date.now() - t0) / 1000); const e = $('ledEl'); if (e) e.textContent = T('elapsed', s); const k = s < 4 ? 0 : s < 25 ? 1 : 2; if (k !== step) { step = k; const st2 = $('ledStep'); if (st2) st2.textContent = T('working')[k]; } }, 500);
    logEv?.('leveleditor', `sender ${S.photos.length} bilder`);
    let res = await callTolk({ code: ctx.getCode(), images: S.photos, answers: S.answers }, { signal: abort?.signal });
    if (!res.ok && res.unreadable && S.photos.length && !abort?.signal?.aborted) {   // svaret kom, men kunne ikke leses: ett nytt forsøk av seg selv med de samme bildene
      logEv?.('leveleditor', `svar ${res.status} kunne ikke leses etter ${res.ms} ms: prøver én gang til`);
      res = await callTolk({ code: ctx.getCode(), images: S.photos, answers: S.answers }, { signal: abort?.signal });
    }
    stopTick(); busy = false; abort = null;
    // Bildene lagres aldri, bare i minnet. Ved nett- og tjenestefeil beholdes de så du slipper å velge dem på nytt (NYTT FORSØK); ellers slippes de straks.
    if (!res.ok) { const keep = KEEP_PHOTOS.includes(res.reason) && S.photos.length; if (!keep) S.photos.length = 0; logEv?.('leveleditor', `feilet: ${res.reason} · status ${res.status ?? '?'}${res.unreadable ? ' (svar kunne ikke leses)' : ''} (${Date.now() - t0} ms)${keep ? ' · bildene beholdt for nytt forsøk' : ''}`); failed(res.reason); return; }
    S.photos.length = 0;
    S.scene = res.scene; S.usage = res.usage || { cost_usd: 0, ms: 0 }; S.name = defaultName(res.scene);
    const room = sceneToRoom(res.scene); S.room = room; if (room.scene) S.scene = room.scene;
    if (!room.ok) { logEv?.('leveleditor', `scene ble ikke brett: ${room.reason}`); failed(room.reason); return; }
    if (room.autoGoal) logEv?.('leveleditor', `auto-mål på ${room.autoGoal}`);
    logEv?.('leveleditor', ledLog({ what: 'forslag', cost: S.usage.cost_usd, ms: S.usage.ms || Date.now() - t0, edits: 0, bot: room.solvable ? 'vei' : 'ingen', extra: `${room.things} ting, ${room.helperCount} hjelpeobjekter` }));
    result(room.autoGoal ? T('autoGoal') : '');
  }
  function failed(reason) {
    const el = root();
    el.innerHTML = `<h1>${esc(T('title'))}</h1><p class="tag">${esc(lerr(L(), reason))}</p><button class="mbtn" id="ledAgain">${esc(T('again'))}</button><button class="mbtn sec" id="ledBack">${esc(T('back'))}</button>`;
    $('ledAgain').onclick = () => { S.photos.length ? questions() : (logEv?.('leveleditor', 'nytt forsøk: velg bilder på nytt'), photos()); };
    $('ledBack').onclick = leave;
  }

  // ---- 5. forslaget ----
  const verdictText = () => { const r = S.room, k = checkVerdict(r); return lverdict(L(), k, r && r.helperCount); };
  const logSummary = (what) => logEv?.('leveleditor', ledLog({ what, cost: S.usage.cost_usd, ms: S.usage.ms, edits: S.edits, bot: S.room && S.room.ok ? (S.room.solvable ? 'vei' : 'ingen') : '' }));
  function result(note = '') {
    const el = root(), r = S.room, ok = canPlay(r);
    el.innerHTML = `<h1>${esc(T('resultH'))}</h1><div class="ledbox"><b>${esc(S.name)}</b><span>${esc(T('things', r.things))}</span><span id="ledVerdict">${esc(verdictText())}</span></div>`
      + `<p class="tag">${esc(T('nameLabel'))}</p><input class="ledin" id="ledName" maxlength="30" value="${esc(S.name)}" autocomplete="off">`
      + `<div class="ledrow"><button class="mbtn" id="ledPlay">${esc(T('play'))}</button><button class="mbtn sec" id="ledAdj">${esc(T('adjust'))}</button><button class="mbtn sec" id="ledChk">${esc(T('check'))}</button><button class="mbtn sec" id="ledShare">${esc(T('share'))}</button></div>`
      + `<div class="ledmsg" id="ledMsg">${esc(note)}</div><button class="mbtn sec" id="ledSave">${esc(S.savedId ? T('mine') : T('save'))}</button><button class="mbtn sec" id="ledBack">${esc(T('back'))}</button>`;
    const nm = () => { S.name = safeName($('ledName').value, S.name || 'Mitt brett'); return S.name; };
    const save = () => {
      const lvl = S.room.level, res = saveRoom(st, { id: S.savedId, name: nm(), level: lvl });
      if (!res.ok) { msg(lerr(L(), res.reason)); logEv?.('leveleditor', `lagring feilet: ${res.reason}`); return null; }
      if (!res.again) logSummary('lagret'); S.savedId = res.id; return res.id;
    };
    $('ledPlay').disabled = false; if (!ok) $('ledPlay').classList.add('sec');
    $('ledPlay').onclick = () => { const id = save(); if (id) { logSummary('spiller'); ctx.onPlay?.(id); } };
    $('ledAdj').onclick = adjust;
    $('ledChk').onclick = () => { S.room = sceneToRoom(S.scene, S.name); if (S.room.scene) S.scene = S.room.scene; logSummary('sjekk'); result(); };
    $('ledSave').onclick = () => { if (S.savedId) { ctx.onMine?.(); return; } const id = save(); if (id) { result(T('saved')); } };
    $('ledBack').onclick = leave;
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

  // ---- 6. juster: kart ovenfra, trykk en ting, flytt med piler eller slett ----
  function adjust() {
    const el = root(), sc = () => S.scene;
    el.innerHTML = `<h1>${esc(T('adjH'))}</h1><p class="tag" style="max-width:320px">${esc(T('adjIntro'))}</p><canvas class="ledmap" id="ledMap"></canvas>`
      + `<p class="tag" id="ledSel">${esc(T('adjNone'))}</p>`
      + `<div class="ledarrows"><span></span><button class="mbtn sec" data-d="0,-1">▲</button><span></span><button class="mbtn sec" data-d="-1,0">◀</button><button class="mbtn sec" id="ledDel" style="font-size:13px">${esc(T('del'))}</button><button class="mbtn sec" data-d="1,0">▶</button><span></span><button class="mbtn sec" data-d="0,1">▼</button><span></span></div>`
      + `<div class="ledmsg" id="ledMsg"></div><div class="ledrow"><button class="mbtn sec" id="ledUndo">${esc(T('undo'))}</button><button class="mbtn" id="ledDone">${esc(T('done'))}</button></div>`;
    const cv = $('ledMap'), R = sc().room, W = 340, Hh = Math.round(W * R.depth / R.width); cv.width = W * 2; cv.height = Hh * 2; cv.style.height = `${Hh}px`;
    const k = (W * 2) / R.width;
    const draw = () => {
      const g = cv.getContext('2d'), s = sc(); g.clearRect(0, 0, cv.width, cv.height); g.strokeStyle = '#ffffff66'; g.lineWidth = 3; g.strokeRect(1, 1, cv.width - 2, cv.height - 2);
      const th = thingsOf(s).sort((a, b) => a.top - b.top), mx = Math.max(1, ...th.map((t) => t.top));
      for (const t of th) {
        const sel = t.key === S.sel; g.fillStyle = `hsl(${210 - 160 * (t.top / mx)} 55% ${sel ? 62 : 42}% / ${sel ? 1 : 0.8})`; g.strokeStyle = sel ? '#fff' : '#0b1226'; g.lineWidth = sel ? 5 : 2;
        g.fillRect(t.rect.x0 * k, t.rect.z0 * k, (t.rect.x1 - t.rect.x0) * k, (t.rect.z1 - t.rect.z0) * k); g.strokeRect(t.rect.x0 * k, t.rect.z0 * k, (t.rect.x1 - t.rect.x0) * k, (t.rect.z1 - t.rect.z0) * k);
      }
      const ring = (x, z, c) => { g.beginPath(); g.arc(x * k, z * k, 14, 0, 7); g.lineWidth = 6; g.strokeStyle = c; g.stroke(); };
      if (s.start) ring(s.start.x, s.start.z, '#59e07a'); if (s.goal) ring(s.goal.x, s.goal.z, '#ffd24a');
      const t = th.find((q) => q.key === S.sel); $('ledSel').textContent = t ? T('adjSel', t.label) : T('adjNone');
    };
    const apply = (next, what) => {
      if (!next) return false; const room = sceneToRoom(next, S.name, { auto: false });   // ved justering skjules ingenting: ødelegger flyttingen brettet, angres den
      if (!room.ok) { msg(T('adjFail')); return false; }
      S.undo.push(S.scene); S.scene = next; S.room = room; S.edits++;
      if (S.savedId) { saveRoom(st, { id: S.savedId, name: S.name, level: room.level }); if (S.code) { setRoomCode(st, S.savedId, ''); S.code = ''; } }   // rettet brett: den delte versjonen er gammel, DEL gir ny kode
      msg(verdictText()); logEv?.('leveleditor', `retting ${S.edits}: ${what}`); return true;
    };
    cv.onclick = (e) => { const b = cv.getBoundingClientRect(), x = (e.clientX - b.left) / b.width * R.width, z = (e.clientY - b.top) / b.height * R.depth; const t = thingAt(thingsOf(sc()), x, z); S.sel = t ? t.key : ''; draw(); };
    el.querySelectorAll('[data-d]').forEach((b) => { b.onclick = () => { if (!S.sel) { msg(T('adjNone')); return; } const [dx, dz] = b.dataset.d.split(',').map(Number); if (apply(moveThing(sc(), S.sel, dx * LED.step, dz * LED.step), 'flytt')) draw(); }; });
    $('ledDel').onclick = () => { if (!S.sel) { msg(T('adjNone')); return; } const n = deleteThing(sc(), S.sel); if (!n) { msg(T('noGoalDel')); return; } if (apply(n, 'slett')) { S.sel = ''; draw(); } };
    $('ledUndo').onclick = () => { const p = S.undo.pop(); if (!p) return; S.scene = p; S.room = sceneToRoom(p, S.name); S.edits = Math.max(0, S.edits - 1); if (S.savedId && S.room.ok) saveRoom(st, { id: S.savedId, name: S.name, level: S.room.level }); S.sel = ''; msg(verdictText()); draw(); };
    $('ledDone').onclick = () => result();
    draw();
  }
  return { show };
}
export const ledBtnHtml = (lang) => `<div class="bgrp" id="dfLed"><button class="mbtn sec" id="mLed">📷 ${esc(ltx(lang, 'btn'))}<small>${esc(ltx(lang, 'btnSub'))}</small></button></div>`;
