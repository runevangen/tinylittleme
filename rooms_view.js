// R153: MINE BRETT (DOM). Bruker startskjermens #start og knappestiler (.mbtn) som VELG BRETT. Logikk: rooms_logic.js, tekster: rooms_text.js.
import { ROOMS, listRooms, loadRoom, loadRoomScene, addRoom, removeRoom, setRoomCode, shareRoom, fetchRoom, deleteSharedRoom, reportRoom, cleanRoomCode } from './rooms_logic.js';
import { rtx, rerr } from './rooms_text.js';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CSS = `#start.rml{justify-content:flex-start;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-top:max(26px,env(safe-area-inset-top));padding-bottom:max(18px,env(safe-area-inset-bottom))}
#start .rmcard{width:min(340px,88vw);background:#ffffff14;border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;text-align:left}
#start .rmcard b{font:800 17px system-ui;overflow-wrap:anywhere}#start .rmcard small{font:500 12px system-ui;color:#c4cee3}
#start .rmrow{display:flex;gap:6px}#start .rmrow .mbtn{flex:1;min-width:0;padding:10px 4px;font-size:15px}
#start .rmin{width:min(320px,84vw);box-sizing:border-box;font:700 18px system-ui;letter-spacing:2px;text-align:center;padding:12px;border-radius:10px;border:2px solid #ffffff55;background:#0b1226;color:#fff;text-transform:uppercase}
#start .rmmsg{min-height:20px;max-width:min(340px,88vw);font:600 14px/1.3 system-ui;color:#ffd9a0;text-align:center}`;
export const roomsBtnHtml = (lang) => `<div class="bgrp" id="dfRooms"><button class="mbtn sec" id="mRooms">🏠 ${esc(rtx(lang, 'btn'))}<small>${esc(rtx(lang, 'btnSub'))}</small></button></div>`;

// ctx: { $, st (store), lang: () => 'nb'|'en', getCode: () => testerkode, getVersion, logEv, toast, onPlay(id), onBack() }
export function createRoomsView(ctx) {
  const { $, st, logEv } = ctx; const L = () => ctx.lang(); let delArm = null, busy = false;
  const css = () => { if (!document.getElementById('rmcss')) { const s = document.createElement('style'); s.id = 'rmcss'; s.textContent = CSS; document.head.appendChild(s); } };
  const msg = (t) => { const m = $('rmMsg'); if (m) m.textContent = t || ''; };
  function show() {
    css(); const el = $('start'); el.classList.add('rml'); const list = listRooms(st);
    el.innerHTML = `<h1>${esc(rtx(L(), 'title'))}</h1><p class="tag">${esc(rtx(L(), 'intro'))}</p>`
      + (list.length ? list.map((r) => `<div class="rmcard" data-r="${r.id}"><b>${esc(r.name)}</b><small>${esc(r.mine ? rtx(L(), 'mineTag') : rtx(L(), 'otherTag'))}${r.code ? ' · ' + esc(rtx(L(), 'codeOf', r.code)) : ''}</small>`
        + `<div class="rmrow"><button class="mbtn" data-a="play">${esc(rtx(L(), 'play'))}</button>${r.mine && loadRoomScene(st, r.id) ? `<button class="mbtn sec" data-a="adjust">${esc(rtx(L(), 'adjust'))}</button>` : ''}<button class="mbtn sec" data-a="share">${esc(rtx(L(), 'share'))}</button><button class="mbtn sec" data-a="del">${esc(rtx(L(), 'del'))}</button>${r.mine ? '' : `<button class="mbtn sec" data-a="report">${esc(rtx(L(), 'report'))}</button>`}</div></div>`).join('')
        : `<p class="tag" id="rmEmpty">${esc(rtx(L(), 'empty'))}</p>`)
      + `<p class="tag" style="margin-top:8px">${esc(rtx(L(), 'codeLabel'))}</p><input class="rmin" id="rmCode" placeholder="${esc(rtx(L(), 'codePh'))}" autocomplete="off" autocapitalize="characters" spellcheck="false">`
      + `<button class="mbtn" id="rmFetch">${esc(rtx(L(), 'fromCode'))}</button><div class="rmmsg" id="rmMsg"></div><button class="mbtn sec" id="rmBack">${esc(rtx(L(), 'back'))}</button>`;
    el.querySelectorAll('.rmcard button[data-a]').forEach((b) => { b.onclick = () => act(b.closest('.rmcard').dataset.r, b.dataset.a); });
    $('rmFetch').onclick = () => fromCode($('rmCode').value);
    $('rmBack').onclick = () => { el.classList.remove('rml'); ctx.onBack?.(); };
    logEv?.('mine brett', `åpnet: ${list.length} brett`);
  }
  async function act(id, a) {
    const r = listRooms(st).find((x) => x.id === id); if (!r || busy) return;
    if (a === 'adjust') { logEv?.('mine brett', 'juster eget brett'); const el = $('start'); el.classList.remove('rml'); ctx.onAdjust?.(id); return; }
    if (a === 'play') { logEv?.('mine brett', `spiller ${r.mine ? 'eget' : 'hentet'} brett`); ctx.onPlay?.(id); return; }
    if (a === 'share') {
      if (r.code) { copy(r.code); msg(rtx(L(), 'shared', r.code)); return; }
      const lvl = loadRoom(st, id); busy = true; msg(rtx(L(), 'sharing'));
      const t0 = Date.now(), res = await shareRoom({ tcode: ctx.getCode(), name: r.name, level: lvl, version: ctx.getVersion?.() }); busy = false;
      if (!res.ok) { msg(rerr(L(), res.reason)); logEv?.('mine brett', `del feilet: ${res.reason}`); return; }
      setRoomCode(st, id, res.code); logEv?.('mine brett', `delt (${Date.now() - t0} ms)`); show(); copy(res.code); msg(rtx(L(), 'shared', res.code)); return;
    }
    if (a === 'del') {
      if (delArm !== id) { delArm = id; msg(rtx(L(), 'confirmDel')); setTimeout(() => { if (delArm === id) { delArm = null; msg(''); } }, 4000); return; }
      delArm = null; let both = false;
      if (r.mine && r.code) { busy = true; const d = await deleteSharedRoom({ tcode: ctx.getCode(), rcode: r.code }); busy = false; both = d.ok; }   // slett også fra delingen (bare eier kan)
      removeRoom(st, id); logEv?.('mine brett', `slettet${both ? ' (også fra delingen)' : ''}`); show(); msg(rtx(L(), both ? 'deletedBoth' : 'deleted')); return;
    }
    if (a === 'report') {
      busy = true; const d = await reportRoom({ tcode: ctx.getCode(), rcode: r.code }); busy = false;
      logEv?.('mine brett', `meldt: ${d.ok ? 'ok' : d.reason}`); msg(d.ok ? rtx(L(), 'reported') : rerr(L(), d.reason));
    }
  }
  async function fromCode(raw) {
    if (busy) return; const rc = cleanRoomCode(raw); if (!rc) { msg(rerr(L(), 'kodeformat')); return; }
    busy = true; msg(rtx(L(), 'fetching')); const t0 = Date.now();
    const res = await fetchRoom({ tcode: ctx.getCode(), rcode: rc }); busy = false;
    if (!res.ok) { msg(rerr(L(), res.reason)); logEv?.('mine brett', `hent feilet: ${res.reason}`); return; }
    const ad = addRoom(st, { name: res.name, level: res.level, code: rc, mine: false });
    if (!ad.ok) { msg(rerr(L(), ad.reason)); logEv?.('mine brett', `lagring feilet: ${ad.reason}`); return; }
    logEv?.('mine brett', `hentet fra kode (${Date.now() - t0} ms)`); show(); msg(rtx(L(), 'got', res.name));
  }
  function copy(t) { try { navigator.clipboard?.writeText(t).then(() => ctx.toast?.(rtx(L(), 'copied')), () => ctx.toast?.(rtx(L(), 'copyFail'))); } catch { ctx.toast?.(rtx(L(), 'copyFail')); } }
  return { show, add: (o) => addRoom(st, o), ROOMS };
}
