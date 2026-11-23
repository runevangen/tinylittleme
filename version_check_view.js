// R77: versjonsjekk i spillet (version_check_view.js). Henter version.js uten mellomlager, viser kortet «NY VERSJON … TRYKK FOR Å OPPDATERE»
// når en høyere versjon ligger ute, og laster siden på nytt (ny spørringsstreng, tømt mellomlager) uten å røre lagrede data (tlm.*).
// Logikken (tolking, sammenligning, intervall, rolig tilstand) ligger i version_check_logic.js og testes i node.
import { tl } from './i18n.js';
import { runCheck, dueNow, intervalMs, calmNow, cardText, menuLine, upToDateText, reloadUrl } from './version_check_logic.js';

export function createVersionCheck({ version, $, logEv, toast, getScreen, getClock, isBoss, isCinema, isTesting, isOn, getIntervalMin, beforeUpdate, store, lang = () => 'nb', doc = document, win = window, now = () => Date.now() }) {
  const st = { remote: null, last: 0, lastStatus: 'ikke sjekket', checking: false, updating: false, manual: false };
  const style = doc.createElement('style');
  style.textContent = `#vercard{position:fixed;left:max(10px,env(safe-area-inset-left));right:max(58px,calc(env(safe-area-inset-right) + 54px));top:max(8px,env(safe-area-inset-top));z-index:12;box-sizing:border-box;padding:8px 8px;border-radius:14px;border:2px solid #9fe0c8;background:#10261ff2;color:#eafff6;font:700 12px/1.2 system-ui;text-align:center;white-space:nowrap;overflow:hidden;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
  #vercard.hide,body.cinema #vercard{display:none}`;
  doc.head.appendChild(style);
  const card = doc.createElement('button'); card.id = 'vercard'; card.className = 'hide'; card.type = 'button'; card.setAttribute('aria-live', 'polite');
  doc.body.appendChild(card);
  let panelBtn = null, panelNote = null;

  const calm = () => calmNow({ screen: getScreen(), boss: isBoss(), cinema: isCinema(), testing: isTesting() });
  const newer = () => !!st.remote;
  function renderPanel() {
    if (!panelBtn) return;
    panelBtn.textContent = st.updating ? tl(lang(), 'vc.updating') : newer() ? tl(lang(), 'vc.updBtn', { v: st.remote }) : menuLine(version, st.checking ? 'checking' : 'idle', lang());
    panelBtn.disabled = st.checking || st.updating;
    if (panelNote) panelNote.textContent = st.updating ? '' : newer() ? tl(lang(), 'vc.newNote', { v: st.remote }) : st.lastStatus === 'nyeste' ? upToDateText(lang()) : st.lastStatus === 'feil' ? tl(lang(), 'vc.noContactNote') : '';
  }
  function renderCard() {
    const show = isOn() && (newer() || st.updating) && (st.updating || calm()) && getScreen() !== 'innstillinger';   // ⚙-panelet har egen knapp
    card.classList.toggle('hide', !show);
    card.textContent = st.updating ? tl(lang(), 'vc.updating') : newer() ? cardText(st.remote, lang()) : '';
  }
  async function fetchText() {
    const r = await win.fetch(new URL('version.js', win.location.href).toString() + '?t=' + now() + '.' + Math.floor(Math.random() * 1e6), { cache: 'no-store' });
    if (!r.ok) throw new Error('http ' + r.status);
    return r.text();
  }
  async function check({ force = false, why = 'auto' } = {}) {
    if (st.checking || st.updating || isCinema()) return st.lastStatus;
    if (!force && (!isOn() || !dueNow({ now: now(), last: st.last, interval: intervalMs(getIntervalMin()) }))) return st.lastStatus;
    st.checking = true; renderPanel();
    const res = await runCheck(version, fetchText);
    st.checking = false; st.last = now(); st.lastStatus = res.status;
    if (res.status === 'ny') { if (st.remote !== res.remote) logEv('versjon', `ny funnet v${res.remote} (kjører v${version}, ${why})`); st.remote = res.remote; }
    else { st.remote = null; if (why !== 'auto' || res.status === 'nyeste') logEv('versjon', `sjekk ${res.status} (${why})`); }
    if (res.status === 'feil' && why === 'auto') logEv('versjon', 'sjekk feilet (stille)');
    renderPanel(); renderCard();
    return res.status;
  }
  async function update() {
    if (st.updating || !newer()) return false;
    const to = st.remote; st.updating = true; logEv('versjon', `oppdaterer v${version} til v${to}`);
    renderCard(); renderPanel();
    try { beforeUpdate && beforeUpdate(); } catch { /* lagring feilet: last likevel */ }
    try { if (win.caches && win.caches.keys) { const ks = await win.caches.keys(); await Promise.all(ks.map((k) => win.caches.delete(k))); } } catch { /* ikke tilgjengelig */ }
    try { if (win.navigator.serviceWorker && win.navigator.serviceWorker.getRegistrations) { const rs = await win.navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map((r) => r.unregister())); } } catch { /* ingen service worker */ }
    try { store.set('tlm.verupd', { from: version, to, at: now() }); } catch { /* privat modus */ }
    win.location.replace(reloadUrl(win.location.href, to, now()));
    return true;
  }
  card.addEventListener('click', (e) => { e.stopPropagation(); update(); });
  win.addEventListener('pointerdown', (e) => { if (e.target === card) e.stopPropagation(); }, true);
  doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'visible') check({ why: 'synlig' }); });
  const timer = win.setInterval(() => { check({ why: 'auto' }); }, 15000), timer2 = win.setInterval(renderCard, 500);   // kortet følger skjermen (meny, panel, mål) uten egne hekter
  win.setTimeout(() => check({ why: 'start' }), 2500);   // ved start (litt etter at spillet er oppe)

  return {
    bindPanel(btn, note) {
      panelBtn = btn; panelNote = note; renderPanel();
      btn.onclick = async () => {
        if (newer()) { update(); return; }
        const s = await check({ force: true, why: 'meny' });
        toast(s === 'nyeste' ? upToDateText(lang()) : s === 'ny' ? tl(lang(), 'vc.newToast', { v: st.remote }) : tl(lang(), 'vc.noContactToast'), true);
      };
    },
    check, update, render: () => { renderCard(); renderPanel(); }, calm,
    info: () => `kjører v${version}${st.remote ? `, ny v${st.remote} ligger ute` : ''}, sist sjekket ${st.last ? new Date(st.last).toLocaleTimeString('nb-NO') : 'aldri'} (${st.lastStatus})`,
    state: () => ({ ...st }), stop: () => { win.clearInterval(timer); win.clearInterval(timer2); },
  };
}
