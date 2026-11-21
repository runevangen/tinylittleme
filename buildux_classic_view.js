// R96: byggeskjermens nye skall for klassiske steder (Trapp, Vippe, lekerom, stue, verksted, Bygglab-stedene uten rutenett), bak ⚙-valget «Byggeskjerm» (`buildux`).
// Samme utseende som broene (R92/R93): topplinje (← · stedsnavn n/N med stjerner · ⋯), byggeområde, delebrett, festeverktøy som store runde ikoner (TAPE, LEDD, TAU, GUMMI), ↶ og én stor PRØV.
// Liggende: sidepaneler (venstre ← ⋯ ↶, høyre de fire festeverktøyene og PRØV), delebrettet som rad langs nedre kant. Alt sjeldent (last, KODE/LIM INN/BESTE, NULLSTILL, SNAP, rotér, tilpass) ligger i ⋯;
// rotér og FJERN vises som en liten verktøylinje (↺ ↻ ✕) ved den valgte delen. Festing: instruksjon i byggeområdet, første del markert og en spøkelseslinje (grønn/rød) fra første del mot fingeren.
// De gamle knappene og delebrettet gjenbrukes (CSS flytter dem): mekanikken i build.js er uendret, og dagens skjerm er uendret når valget er av. Logikken ligger i buildux_classic_logic.js.
import { CBX, classicSite, classicMetrics, classicControls, selKindOf, barPlace, toolStep, stepKey, linkGhost, ghostKey, handPair, shouldShowCHand, tapHandAt, createCStats, statsAct, statsTurn, statsTry, statsWin, orientOf, orientName, actLine, winLine, turnLine } from './buildux_classic_logic.js';
import { selRowKind, selRowPlace } from './build_touch_logic.js';
import { corners, linkEnds } from './build_logic.js';
import { starText, starThresholds } from './build_budget.js';

const SAFE_T = 'max(8px,env(safe-area-inset-top))';
export const cbxCss = () => `
#bld{--cxs:max(8px,env(safe-area-inset-bottom))}
#bld .cbx,#bld .cxsheet,#bld .cxrail,#bld .cxsel{display:none}
#bld .cxprobe{display:block;position:absolute;left:0;top:0;width:0;height:0;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);pointer-events:none}
#bld.cbx .cbx{display:block}
#bld.cbx .bt.top,#bld.cbx .bt.bot,#bld.cbx .zoom,#bld.cbx .tools,#bld.cbx:not(.cxopen) .lab,#bld.cbx:not(.cxopen) .loads,#bld.cbx:not(.cxopen) .share{display:none!important}
#bld.cbx .hint{top:calc(${SAFE_T} + 56px);font-size:12.5px;line-height:1.25;color:#ffe9a8;z-index:2;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}   /* R109: høyst to linjer */
body.building #qbtn{z-index:30!important;pointer-events:auto!important}   /* R109: ⚑ ligger over alt i byggeskjermen */
#bld .cbx button{pointer-events:auto;font-family:system-ui}
#bld .cbx .cxtop{position:absolute;left:0;right:0;top:${SAFE_T};height:48px;display:flex;gap:8px;padding:0 8px;padding-right:max(52px,calc(env(safe-area-inset-right) + 52px));align-items:stretch;pointer-events:none;z-index:3}
#bld .cbx .cxback,#bld .cbx .cxmore{flex:0 0 52px;height:48px;border-radius:14px;border:2px solid #6ab8ff;background:#121a2ce6;color:#cfe8ff;font:800 24px/1 system-ui;padding:0}
#bld .cbx .cxname{flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:center;align-items:center;border-radius:14px;background:#0b1020cc;border:2px solid #ffa940;color:#fff0d8;padding:0 6px;text-align:center;line-height:1.1}
#bld .cbx .cxname b{font:800 13px system-ui;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#bld .cbx .cxname i{font:700 13px system-ui;font-style:normal;color:#ffd23f;letter-spacing:1px}
/* kostnadslinje (stående: over delebrettet) */
#bld .cbx .cxplate{position:absolute;left:0;right:0;bottom:calc(var(--cxs) + 178px);height:20px;display:flex;align-items:center;justify-content:center;gap:8px;color:#ffe9a8;font:800 13px system-ui;pointer-events:none;z-index:3}
#bld .cbx .cxplate .cxps{display:none}
#bld .cbx .cxpbar{flex:0 1 110px;height:8px;border-radius:4px;background:#0b1020;border:1px solid #ffffff55;overflow:hidden}
#bld .cbx .cxpbar i{display:block;height:100%;width:0;background:#3df0b0}
#bld .cbx .cxplate.over{color:#ff9a8a}#bld .cbx .cxplate.over .cxpbar i{background:#ff6a5a}
/* delebrettet: det gamle brettet, flyttet og pyntet */
#bld.cbx .tray{bottom:calc(var(--cxs) + 116px);height:${CBX.trayH}px;padding:2px 10px;background:#0b1020d9;border-top:2px solid #ffa94055;border-bottom:0;z-index:2;gap:10px}
#bld.cbx .chip{height:54px;min-width:64px;border-radius:14px;border:2px solid #ffffff66;background:#1d2433}
/* festeverktøy og ↶ */
#bld .cbx .cxtools{position:absolute;left:0;right:0;bottom:calc(var(--cxs) + 60px);height:${CBX.toolH}px;display:flex;gap:8px;padding:0 10px;justify-content:center;pointer-events:none;z-index:3}
#bld .cbx .cxtool{flex:1 1 0;max-width:84px;min-width:48px;height:${CBX.toolH}px;border-radius:26px;border:3px solid #ffffff55;background:#121a2ce6;color:#fff;padding:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;font:800 10.5px/1.05 system-ui}
#bld .cbx .cxtool .cxi{font-size:20px;line-height:1}
#bld .cbx .cxtool.on{border-color:#ffd23f;background:#5a4410;box-shadow:0 0 0 3px #ffd23f66}
#bld .cbx .cxundo{flex:0 0 ${CBX.toolH}px;width:${CBX.toolH}px;height:${CBX.toolH}px;border-radius:50%;padding:0;border:2px solid #ffa940;background:#121a2ce6;color:#ffd9a0;font:800 26px/1 system-ui}
#bld .cbx .cxundo[disabled]{opacity:.35}
#bld.sim .cbx .cxtools{display:none}
#bld .cbx .cxgo{position:absolute;left:0;right:0;bottom:var(--cxs);padding:0 10px;display:flex;gap:8px;align-items:stretch;pointer-events:none;z-index:3}
#bld .cbx .cxgo button{height:${CBX.goH}px;border-radius:28px;font:800 18px system-ui;border:3px solid #3df0b0;background:#2a7f62;color:#fff;flex:1 1 0;min-width:0;padding:0 6px}
#bld .cbx .cxgo button.cxsp{flex:0 0 28%;background:#121a2ce6;border:2px solid #ffa940;color:#ffd9a0;font-size:14px;display:none}
#bld .cbx .cxgo button.cxsp.on{background:#7a4a14;border-color:#fff}
#bld .cbx .cxgo button.cxsp[disabled]{opacity:.35}
#bld.sim .cbx .cxgo button.cxsp{display:block}
#bld.sim .cbx .cxgo button.try{background:#8a3a2a;border-color:#ff9a8a}
/* lita verktøylinje ved valgt del */
#bld .cbx .cxsel{position:absolute;display:none;gap:6px;z-index:6;pointer-events:none;justify-content:center;padding:0;border-radius:26px}   /* R109: fast rad over delebrettet, ikke flytende ved delen */
#bld .cbx .cxsel.show{display:flex}
#bld .cbx .cxsel button{width:48px;height:48px;border-radius:50%;padding:0;border:3px solid #fff;background:#2b3552;color:#fff;font:800 22px/1 system-ui;box-shadow:0 3px 10px #0008;pointer-events:auto}
#bld .cbx .cxsel button[data-cx="del"]{background:#d6422f}
#bld .cbx .cxsel.link [data-cx="rotl"],#bld .cbx .cxsel.link [data-cx="rotr"]{display:none}
/* ⋯-arket */
#bld .cxsheet{position:absolute;inset:0;z-index:5;align-items:flex-end;justify-content:center;background:#0009}
#bld.cbx.cxopen .cxsheet{display:flex}
#bld .cxsheet .card>*{flex:0 0 auto}
#bld .cxsheet .card{width:min(460px,100%);max-height:86%;overflow:auto;background:#17203a;border:2px solid #6ab8ff;border-radius:18px 18px 0 0;padding:12px 12px calc(var(--cxs) + 8px);display:flex;flex-direction:column;gap:10px;color:#fff}
#bld .cxsheet h3{margin:0;font:800 16px system-ui;color:#cfe8ff}
#bld .cxsheet .cxsec{display:flex;flex-direction:column;gap:6px}
#bld .cxsheet .cxsec small{font:700 11px system-ui;color:#9fb0d8;text-transform:uppercase;letter-spacing:.5px}
#bld .cxsheet .cxgrid{display:flex;flex-wrap:wrap;gap:8px}
#bld .cxsheet .cxgrid button,#bld .cxsheet .loads button,#bld .cxsheet .share button,#bld .cxsheet .lab button{height:52px;min-width:48px;flex:1 1 40%;max-width:none;font:800 14px system-ui;border-radius:14px;white-space:normal;line-height:1.1}
#bld .cxsheet .loads,#bld .cxsheet .share,#bld .cxsheet .lab{position:static;display:flex;flex-wrap:wrap;gap:8px;padding:0;pointer-events:auto}
#bld .cxsheet .lab .nm{flex:1 1 100%;order:-1;min-height:44px}
#bld .cxsheet .lab button[data-lb="prev"],#bld .cxsheet .lab button[data-lb="next"]{flex:1 1 40%;font-size:22px}
#bld .cxsheet .share button.bmode,#bld .cxsheet .share button.bguide{display:none!important}
#bld .cxsheet .loads:empty{display:none}
#bld .cxsheet .cxclose{height:54px;border-radius:14px;border:2px solid #3df0b0;background:#1f7a52;color:#fff;font:800 16px system-ui}
#bld .cxsheet .cxgrid button{border:2px solid #6ab8ff;background:#121a2ce6;color:#cfe8ff;pointer-events:auto}
#bld .cxsheet .cxgrid button[disabled]{opacity:.35}
/* liggende: sidepaneler som i R93 */
#bld.cbx.cxland{--cxl:calc(var(--cxpw,80px) + env(safe-area-inset-left));--cxr:calc(var(--cxpw,80px) + env(safe-area-inset-right));--cxb:52px}
#bld.cbx.cxland .cbx,#bld.cbx.cxland .cxtop,#bld.cbx.cxland .cxtools,#bld.cbx.cxland .cxgo{display:contents}
#bld.cbx.cxland .cxrail{display:block;position:absolute;top:0;bottom:0;z-index:2;background:linear-gradient(#111a2ef2,#0b1020f2);pointer-events:auto}
#bld.cbx.cxland .cxrail.l{left:0;width:var(--cxl);border-right:2px solid #6ab8ff66}
#bld.cbx.cxland .cxrail.r{right:0;width:var(--cxr);border-left:2px solid #6ab8ff66}
#bld.cbx.cxland .cbx .cxback,#bld.cbx.cxland .cbx .cxmore,#bld.cbx.cxland .cbx .cxundo{position:absolute;z-index:3;left:calc(env(safe-area-inset-left) + (var(--cxpw,80px) - var(--cxb))/2);width:var(--cxb);height:var(--cxb);min-width:var(--cxb);flex:none;margin:0;border-radius:14px;font-size:26px}
#bld.cbx.cxland .cbx .cxback{top:max(8px,env(safe-area-inset-top))}
#bld.cbx.cxland .cbx .cxmore{top:50%;margin-top:calc(var(--cxb) / -2);font-size:24px}
#bld.cbx.cxland .cbx .cxundo{bottom:var(--cxs);top:auto}
#bld.cbx.cxland .cbx .cxtool{position:absolute;z-index:3;right:calc(env(safe-area-inset-right) + (var(--cxpw,80px) - 64px)/2);width:64px;max-width:none;min-width:0;height:var(--cxts,56px);flex:none;border-radius:16px}
#bld.cbx.cxland .cbx .cxtool:nth-of-type(1){top:var(--cxmt,52px)}
#bld.cbx.cxland .cbx .cxtool:nth-of-type(2){top:calc(var(--cxmt,52px) + var(--cxst,60px))}
#bld.cbx.cxland .cbx .cxtool:nth-of-type(3){top:calc(var(--cxmt,52px) + 2 * var(--cxst,60px))}
#bld.cbx.cxland .cbx .cxtool:nth-of-type(4){top:calc(var(--cxmt,52px) + 3 * var(--cxst,60px))}
#bld.cbx.cxland.sim .cbx .cxtool,#bld.cbx.cxland.sim .cbx .cxundo{display:none}
#bld.cbx.cxland .cbx .cxgo button{position:absolute;z-index:3;right:calc(env(safe-area-inset-right) + 4px);width:calc(var(--cxpw,80px) - 8px);flex:none;margin:0;padding:0;border-radius:14px;line-height:1.05}
#bld.cbx.cxland .cbx .cxgo .try{bottom:var(--cxs);height:60px;font:800 13px/1.05 system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-radius:16px}
#bld.cbx.cxland .cbx .cxgo .try .cxi2{font-size:22px;line-height:1}
#bld.cbx.cxland .cbx .cxgo .cxsp{display:none;height:48px;font:800 12px/1.05 system-ui}
#bld.cbx.cxland.sim .cbx .cxgo .cxsp{display:block}
#bld.cbx.cxland .cbx .cxgo [data-cx="pause"]{bottom:calc(var(--cxs) + 66px)}
#bld.cbx.cxland .cbx .cxgo [data-cx="slow"]{bottom:calc(var(--cxs) + 66px + 54px)}
#bld.cbx.cxland .tray{left:var(--cxl);right:var(--cxr);bottom:var(--cxs);border-radius:14px 14px 0 0}
#bld.cbx.cxland .cbx .cxplate{left:var(--cxl);right:var(--cxr);top:max(6px,env(safe-area-inset-top));bottom:auto;margin:0 auto;width:max-content;max-width:calc(100% - var(--cxl) - var(--cxr) - 16px);height:40px;padding:0 12px;border-radius:12px;background:#0b1020e6;border:2px solid #3df0b0;white-space:nowrap}
#bld.cbx.cxland .cbx .cxplate.over{border-color:#ff6a5a}
#bld.cbx.cxland .cbx .cxplate .cxps{display:inline;color:#ffd23f;letter-spacing:1px}
#bld.cbx.cxland .cbx .cxplate .cxpbar{flex:0 0 64px}
#bld.cbx.cxland .cbx .cxname{position:absolute;z-index:3;top:calc(max(6px,env(safe-area-inset-top)) + 44px);left:var(--cxl);right:var(--cxr);margin:0 auto;width:max-content;max-width:calc(100% - var(--cxl) - var(--cxr) - 16px);flex:none;background:none;border:0;padding:0;height:auto;pointer-events:none}
#bld.cbx.cxland .cbx .cxname b{font:700 11.5px system-ui;color:#cfe8ff;text-shadow:0 1px 3px #000}
#bld.cbx.cxland .cbx .cxname i{display:none}
#bld.cbx.cxland .hint{left:var(--cxl);right:var(--cxr);top:calc(max(6px,env(safe-area-inset-top)) + 64px);font-size:12px;padding:0 8px}
#bld.cbx.cxland .cxsheet{align-items:center}
#bld.cbx.cxland .cxsheet .card{border-radius:18px;width:min(520px,calc(100% - var(--cxl) - var(--cxr)));max-height:calc(100% - 12px);padding-bottom:10px;gap:8px;padding-top:8px}
#bld.cbx.cxland .cxsheet .cxclose{position:sticky;bottom:0;min-height:48px;box-shadow:0 -8px 8px #17203a}
@media (orientation:landscape) and (max-height:340px){#bld.cbx.cxland{--cxb:48px}}
`;
export const cbxMarkup = () => `<div class="cbx"><div class="cxtop"><button data-cx="back" class="cxback" type="button"></button><div class="cxname"><b></b><i></i></div><button data-cx="more" class="cxmore" type="button">⋯</button></div><div class="cxplate"><span class="cxps"></span><span class="cxpc"></span><span class="cxpbar"><i></i></span></div><div class="cxtools">${CBX.tools.map((t) => `<button data-cx="${t.id}" class="cxtool" type="button"><span class="cxi">${t.icon}</span><span class="cxl"></span></button>`).join('')}<button data-cx="undo" class="cxundo" aria-label="↶" type="button">↶</button></div><div class="cxgo"><button data-cx="slow" class="cxsp" type="button"></button><button data-cx="pause" class="cxsp" type="button"></button><button data-cx="try" class="try" type="button"></button></div><div class="cxsel"><button data-cx="rotl" type="button">↺</button><button data-cx="rotr" type="button">↻</button><button data-cx="del" type="button">✕</button></div></div><div class="cxrail l"></div><div class="cxrail r"></div><div class="cxprobe"></div><div class="cxsheet"><div class="card"><h3 class="cxst"></h3><div class="cxsec cxloads"><small></small></div><div class="cxsec cxshare"><small></small></div><div class="cxsec cxlab"><small></small></div><div class="cxsec"><div class="cxgrid"><button data-cx="srotl" type="button"></button><button data-cx="srotr" type="button"></button><button data-cx="snap" type="button"></button><button data-cx="fit" type="button"></button><button data-cx="reset" class="cxreset" type="button"></button><button data-cx="menu" type="button"></button></div></div><button data-cx="close" class="cxclose" type="button"></button></div></div>`;

export function createClassicUx(ctx) {
  const { root, T, toast, logEv, buzz } = ctx;
  const q = (s) => { try { return root.querySelector(s); } catch { return null; } };
  const wall = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  const get = (k, d) => { try { return ctx.store ? ctx.store.get(k, d) : d; } catch { return d; } }, set = (k, v) => { try { ctx.store?.set(k, v); } catch { /* ok */ } };
  const stats = createCStats(orientOf(innerWidth, innerHeight), wall());
  let opened = false, lastO = null, sig = '', lastSig = '', insets = { t: 0, r: 0, b: 0, l: 0 }, insetsRead = false, attached = false, ptr = null, ghost = null, hand = null, handSeen = false, barSig = '', cur = null, bound = false;
  const site = () => ctx.site(), B = () => ctx.getB();
  const on = () => classicSite({ on: ctx.getOn(), site: site(), gridOn: ctx.gridOn(), buxOn: ctx.buxOn(), buxWanted: ctx.buxWanted() });
  const isLand = () => orientOf(innerWidth, innerHeight) === 'land';
  const readInsets = () => {
    insetsRead = true;
    try { const p = q('.cxprobe'); if (!p || typeof getComputedStyle !== 'function') return; const c = getComputedStyle(p), n = (v) => Math.max(0, parseFloat(v) || 0); insets = { t: n(c.paddingTop), r: n(c.paddingRight), b: n(c.paddingBottom), l: n(c.paddingLeft) }; } catch { /* ok */ }
  };
  const metrics = () => { if (!insetsRead) readInsets(); return classicMetrics({ w: innerWidth, h: innerHeight, insetL: insets.l, insetR: insets.r, insetT: insets.t, insetB: insets.b }); };
  const handDone = () => !!get(CBX.handKey, 0);

  // ---- ark med de sjeldne tingene: de gamle beholderne (last, deling, Bygglab-rad) flyttes dit mens skjermen er på ----
  const homes = new Map(), slots = { loads: '.cxloads', share: '.cxshare', lab: '.cxlab' };
  function attach() {
    try { for (const [cls, slot] of Object.entries(slots)) { const el = root.querySelector(`:scope > .${cls}`), box = q(slot); if (!el || !box) continue; homes.set(cls, { el, next: el.nextSibling }); box.appendChild(el); } } catch { /* ok */ }
  }
  function detach() {
    try { for (const [cls, h] of homes) { const el = h.el; if (el.parentNode !== root) { const ref = h.next && h.next.parentNode === root ? h.next : null; if (root.insertBefore) root.insertBefore(el, ref); else root.appendChild(el); } homes.delete(cls); } } catch { /* ok */ }
  }

  // ---- layout: kalles hver tegning ----
  function layout() {
    const want = on();
    root.classList.toggle('cbx', want);
    if (!want) {
      if (attached) { detach(); attached = false; }
      root.classList.remove('cxland', 'cxopen'); opened = false; lastO = null; sig = ''; cur = null; return false;
    }
    if (!bound) { bound = true; bindStops(); }
    if (!attached) { attach(); attached = true; }
    const o = orientOf(innerWidth, innerHeight);
    if (lastO === null) { stats.orient = o; lastO = o; readInsets(); }
    if (o !== lastO) {   // snudd: byggingen ligger i byggeskjermen (ikke i formatet), så ingenting mistes; bare layout og tilpasning
      readInsets(); const t = statsTurn(stats, o); lastO = o; sig = '';
      if (t) logEv('byggux', turnLine(t, B()?.placed.length ?? 0));
      ctx.cancelDrag?.(); ctx.fit?.();
    }
    root.classList.toggle('cxland', o === 'land');
    const m = metrics(), s = `${m.orient}|${m.pw}|${m.left}|${m.right}|${insets.t}|${insets.b}|${innerHeight}`;
    if (s !== sig) {
      sig = s; cur = m;
      try {
        const st = root.style; st.setProperty('--cxpw', (m.pw || 80) + 'px');
        if (m.orient === 'land') { st.setProperty('--cxmt', m.toolTop + 'px'); st.setProperty('--cxst', m.toolStep + 'px'); st.setProperty('--cxts', Math.max(CBX.touch, m.toolStep - (m.toolStep >= 54 ? 6 : 0)) + 'px'); }
      } catch { /* ok */ }
      if (m.orient === 'land') logEv('byggux', `modus klassisk: liggende layout ${innerWidth}×${innerHeight}: panel ${m.pw} px, delebrett som rad langs nedre kant`);
    }
    if (!opened) { opened = true; stats.t0 = wall(); logEv('byggux', `skjerm på ${site()?.id} (klassisk, ${isLand() ? 'liggende' : 'stående'})`); }
    if (!hand && !handSeen && !ctx.isSim() && shouldShowCHand({ seen: handDone(), hint: ctx.getHint(), guideOn: ctx.getGuideOn?.(), B: B(), sim: ctx.isSim() })) { hand = { t0: null }; logEv('byggux', 'modus klassisk: hånd-hjelp vist (trykk første del, så neste)'); }
    return true;
  }

  // ---- tekster og knapper (bare når noe er endret) ----
  function labelsNow(info) {
    const sg = [info.sim, info.done, info.speed, info.cost, info.parts, info.stars, info.on, info.tool, info.canUndo, info.name, info.nOf?.n, info.snap, info.hasSel, ctx.lang?.(), isLand() ? 'L' : 'P', info.budgetShown, info.over, Math.round(info.ratio * 100)].join('|');
    if (sg === lastSig) return; lastSig = sg;
    q('.cxback').setAttribute('aria-label', T('build.back')); q('.cxback').textContent = '←'; q('.cxmore').setAttribute('aria-label', T('bux.more'));
    q('.cxname b').textContent = info.nOf ? T('bux.site', { name: info.name, n: info.nOf.n, of: info.nOf.of }) : info.name;
    const stars = starText(info.on ? info.stars : info.best || 0); q('.cxname i').textContent = stars; q('.cxps').textContent = stars;
    const partsT = info.parts === 1 ? T('build.partOne') : T('build.partsN', { n: info.parts });
    q('.cxpc').textContent = info.budgetShown ? `${T('build.cost', { n: info.cost })} · ${partsT}` : partsT;
    q('.cxplate').classList.toggle('over', !!info.over); q('.cxpbar i').style.width = Math.round(100 * info.ratio) + '%';
    for (const t of CBX.tools) {
      const b = q(`[data-cx="${t.id}"]`); if (!b) continue; const on2 = info.tool === t.id;
      b.querySelector('.cxl').textContent = T('build.tool.' + t.id); b.classList.toggle('on', on2); b.setAttribute('aria-pressed', on2 ? 'true' : 'false'); b.setAttribute('aria-label', T('build.tool.' + t.id));
    }
    const u = q('.cxundo'); u.disabled = !info.canUndo; u.setAttribute('aria-label', T('build.undo'));
    const tr = q('.cxgo .try'); tr.innerHTML = `<span class="cxi2">${info.sim ? '■' : '▶'}</span> <span class="cxt">${T(info.sim ? 'build.stop' : 'build.try')}</span>`; tr.setAttribute('aria-label', T(info.sim ? 'build.stop' : 'build.try'));
    for (const k of ['slow', 'pause']) { const b = q(`.cxgo [data-cx="${k}"]`); b.textContent = k === 'pause' ? T(info.speed === 'pause' ? 'grid.resume' : 'grid.pause') : T('grid.slow'); b.classList.toggle('on', info.speed === k); b.disabled = !!info.done; b.setAttribute('aria-pressed', info.speed === k ? 'true' : 'false'); }
    q('.cxst').textContent = T('bux.sheet'); q('.cxloads small').textContent = T('bux.sec.load'); q('.cxshare small').textContent = T('bux.sec.share'); q('.cxlab small').textContent = T('bux.sec.lab');
    q('[data-cx="srotl"]').textContent = T('cbx.rotL'); q('[data-cx="srotr"]').textContent = T('cbx.rotR'); q('[data-cx="srotl"]').disabled = q('[data-cx="srotr"]').disabled = !info.hasSel;
    q('[data-cx="snap"]').textContent = T(info.snap ? 'build.snapOn' : 'build.snapOff'); q('[data-cx="fit"]').textContent = '⤢ ' + T('bux.fit'); q('.cxreset').textContent = T('build.reset'); q('[data-cx="menu"]').textContent = T('build.menu'); q('[data-cx="close"]').textContent = T('bux.close');
    q('.cxreset').style.display = info.lab ? 'none' : ''; q('.cxlab').style.display = info.lab ? '' : 'none';
    q('.cxloads').style.display = root.querySelector('.cxloads .loads')?.children.length ? '' : 'none';
    for (const [k, key] of [['rotl', 'cbx.rotl'], ['rotr', 'cbx.rotr'], ['del', 'cbx.del']]) q(`.cxsel [data-cx="${k}"]`).setAttribute('aria-label', T(key));
  }
  const invalidate = () => { lastSig = ''; barSig = ''; };

  // ---- verktøylinjen ved valgt del (R109: fast rad rett over delebrettet, vises så snart noe er valgt) ----
  function updateBar() {
    const el = q('.cxsel'); if (!el) return;
    const kind = selRowKind({ sel: ctx.getSel(), selLink: ctx.getSelLink(), sim: ctx.isSim(), dragging: ctx.isDragging(), sheet: root.classList.contains('cxopen') });
    if (!kind) { if (barSig !== 'x') { barSig = 'x'; el.classList.remove('show'); } return; }
    const m = cur || metrics(), pl = selRowPlace({ m, H: ctx.height(), kind }), s = `${kind}|${Math.round(pl.left)}|${Math.round(pl.y)}`; if (s === barSig) return; barSig = s;
    el.classList.add('show'); el.classList.toggle('link', kind === 'link'); el.style.left = pl.left + 'px'; el.style.top = pl.y + 'px'; el.style.width = pl.w + 'px';
  }

  // ---- tegning: spøkelseslinje, første del markert, hånd ----
  const tag = (g2, text, x, y, color) => {
    g2.font = '800 13px system-ui'; g2.textAlign = 'center'; const w = g2.measureText(text).width + 14;
    g2.fillStyle = 'rgba(14,20,36,.92)'; g2.beginPath(); g2.roundRect ? g2.roundRect(x - w / 2, y - 14, w, 24, 8) : g2.rect(x - w / 2, y - 14, w, 24); g2.fill();
    g2.strokeStyle = color; g2.lineWidth = 2; g2.stroke(); g2.fillStyle = '#fff'; g2.fillText(text, x, y + 3); g2.textAlign = 'start';
  };
  function draw(sx, tNow, g2) {
    if (!on()) return;
    updateBar();
    const b = B(), tool = ctx.getTool(), from = ctx.getLinkFrom(), step = toolStep({ tool, linkFrom: from });
    ghost = null;
    if (step === 'pick2' && b) {
      const fp = b.placed.find((z) => z.id === from);
      if (fp) {   // første del markert (pulserende ramme)
        const pts = corners(fp).map((c) => sx(c.u, c.v)); g2.save(); g2.lineJoin = 'round'; g2.beginPath(); pts.forEach((p, i) => (i ? g2.lineTo(p.x, p.y) : g2.moveTo(p.x, p.y))); g2.closePath();
        g2.strokeStyle = 'rgba(255,210,63,.45)'; g2.lineWidth = 9 + 3 * Math.sin(tNow * 7); g2.stroke(); g2.strokeStyle = '#ffd23f'; g2.lineWidth = 3; g2.stroke(); g2.restore();
      }
      ghost = ptr ? linkGhost(b, tool, from, ptr) : null;
      if (ghost && ghost.show) {
        const pa = sx(ghost.a.u, ghost.a.v), pb = sx(ghost.b.u, ghost.b.v), col = ghost.ok ? '#3df0b0' : '#ff6a5a';
        g2.save(); g2.lineCap = 'round'; g2.globalAlpha = ghost.ok ? 0.9 : 0.6;
        g2.strokeStyle = col; g2.lineWidth = 8; g2.beginPath(); g2.moveTo(pa.x, pa.y); g2.lineTo(pb.x, pb.y); g2.stroke();
        g2.strokeStyle = ghost.ok ? '#eafff6' : '#5a1f18'; g2.lineWidth = 3; g2.setLineDash(ghost.ok ? [] : [7, 6]); g2.beginPath(); g2.moveTo(pa.x, pa.y); g2.lineTo(pb.x, pb.y); g2.stroke(); g2.setLineDash([]); g2.restore();
        g2.beginPath(); g2.arc(pb.x, pb.y, 13, 0, 7); g2.strokeStyle = col; g2.lineWidth = 3; g2.stroke();
        const m = cur || metrics(), key = ghostKey(ghost), txt = key ? T(key, { name: T('build.tool.' + tool) }) : '';
        if (txt) tag(g2, txt, Math.min(Math.max(m.area.x0 + 90, (pa.x + pb.x) / 2), m.area.x1 - 90), Math.max(m.topPx + 18, Math.min(pa.y, pb.y) - 26), col);
      }
    }
    if (hand) {
      const pr = handPair(b);
      if (!pr) endHand('ferdig'); else {
        if (hand.t0 == null) hand.t0 = tNow; const a = sx(pr.a.u, pr.a.v), c = sx(pr.b.u, pr.b.v), h = tapHandAt(tNow - hand.t0, a, c);
        g2.save(); g2.lineWidth = 3; g2.strokeStyle = '#ffd23f';
        g2.beginPath(); g2.arc(a.x, a.y, 16 + (h.phase === 0 && h.down ? 6 : 0) + 3 * Math.sin(tNow * 8), 0, 7); g2.stroke();
        g2.beginPath(); g2.arc(c.x, c.y, 16 + (h.phase === 2 && h.down ? 6 : 0) + 3 * Math.sin(tNow * 8), 0, 7); g2.stroke();
        g2.font = '34px system-ui'; g2.textAlign = 'center'; g2.fillText('👆', h.x, h.y + 38); g2.restore();
        const m = cur || metrics(); tag(g2, T('cbx.hand'), Math.min(Math.max(m.area.x0 + 110, (a.x + c.x) / 2), m.area.x1 - 110), Math.max(m.topPx + 20, Math.min(a.y, c.y) - 44), '#ffd23f');
        if (h.done) endHand('ferdig');
      }
    }
  }
  function endHand(how) {
    if (!hand) return; hand = null; handSeen = true; set(CBX.handKey, 1); logEv('byggux', `modus klassisk: hånd-hjelp ${how}`);
  }
  // fingerens posisjon i skjermpunkter (fra build.js: trykk og flytt)
  function point(x, y) { if (!on()) return; ptr = ctx.toWorld(x, y); }
  function touch() { endHand('avbrutt av berøring'); }

  // ---- hint, tilstand fra build.js hver tegning ----
  const hint = () => { if (!on() || ctx.isSim()) return ''; const k = stepKey(toolStep({ tool: ctx.getTool(), linkFrom: ctx.getLinkFrom() })); return k ? T(k) : ''; };
  function frame() {
    if (!layout()) return;
    const b = B(), info = ctx.info(), th = starThresholds(site()), ratio = th.two.cost > 0 ? Math.min(1, info.cost / th.two.cost) : 0;
    labelsNow({ ...info, ratio, over: info.cost > th.two.cost, budgetShown: info.budgetShown, canUndo: !!b.history.length, tool: ctx.getTool(), snap: ctx.getSnap(), hasSel: !!ctx.getSel(), speed: ctx.getSpeed() });
  }

  // ---- logg og mål ----
  const act = (what) => { if (!on()) return; const n = statsAct(stats); logEv('byggux', actLine(what, stats.orient, n)); };
  function linked(kind, from, to) { if (!on()) return; ghost = null; act(`fest ${kind} ${from} → ${to || 'underlag'}`); }
  function onTry() { if (!on()) return; const n = statsTry(stats); logEv('byggux', `modus klassisk: prøv nr. ${n} (${isLand() ? 'liggende' : 'stående'})`); }
  function onResult(won) {
    if (!on() && !opened) return; if (!won) { logEv('byggux', 'modus klassisk: prøve feilet'); return; }
    const w = statsWin(stats, wall()); if (w.first) logEv('byggux', winLine(w, site())); else logEv('byggux', 'modus klassisk: prøve klarte det');
  }

  // ---- knapper ----
  function sheet(open) { root.classList.toggle('cxopen', !!open && on()); invalidate(); if (open) logEv('byggux', 'modus klassisk: meny åpnet'); }
  const actions = {
    back: () => ctx.act.back(), more: () => sheet(!root.classList.contains('cxopen')), close: () => sheet(false), undo: () => ctx.act.undo(), try: () => ctx.act.try(),
    menu: () => { sheet(false); ctx.act.menu(); }, reset: () => { sheet(false); ctx.act.reset(); }, fit: () => { ctx.fit(); sheet(false); },
    snap: () => ctx.act.snap(), slow: () => ctx.speed('slow'), pause: () => ctx.speed('pause'),
    rotl: () => ctx.act.rotl(), rotr: () => ctx.act.rotr(), del: () => ctx.act.del(), srotl: () => { ctx.act.rotl(); sheet(false); }, srotr: () => { ctx.act.rotr(); sheet(false); },
  };
  for (const t of CBX.tools) actions[t.id] = () => { ctx.setTool(t.id); logEv('byggux', `modus klassisk: verktøy ${ctx.getTool() || 'av'}`); buzz?.(5); };
  // R109: ↺ ↻ ✕ virker på slipp (ikke bare klikk): iOS kan svelge klikket rett etter et dra. Klikket som følger svelges så handlingen ikke gjøres to ganger.
  let fired = { k: '', t: 0 }, downK = '';
  root.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-cx]'), k = b?.dataset?.cx; if (!k || !Object.hasOwn(actions, k)) return; e.stopPropagation();
    if (k === fired.k && wall() - fired.t < SWALLOW_S) { fired = { k: '', t: 0 }; return; }   // R112: klikket til et trykk som alt er gjort på slipp svelges (også på treg enhet), så ett trykk = én rotasjon
    actions[k](); invalidate();
  }, true);
  const NEAR = ['rotl', 'rotr', 'del'], SWALLOW_S = 2;
  root.addEventListener('pointerdown', (e) => { fired = { k: '', t: 0 }; const k = e.target.closest?.('.cxsel [data-cx]')?.dataset?.cx; downK = k && NEAR.includes(k) ? k : ''; }, true);
  root.addEventListener('pointercancel', () => { downK = ''; }, true);
  root.addEventListener('pointerup', (e) => {
    const k = e.target.closest?.('.cxsel [data-cx]')?.dataset?.cx; if (!downK || k !== downK) { downK = ''; return; } downK = '';
    if (ctx.isSim()) return; fired = { k, t: wall() }; actions[k](); invalidate(); logEv('byggux', `modus klassisk: ${k} på slipp`);
  }, true);
  function bindStops() {   // knappene skal ikke starte panorering/berøring på brettet
    try { for (const el of root.querySelectorAll('.cbx button, .cxrail')) el.addEventListener('pointerdown', (e) => { e.stopPropagation(); touch(); }); } catch { /* ok */ }
    const sh = q('.cxsheet'); if (!sh) return;
    for (const ev of ['pointerdown', 'pointermove', 'touchstart', 'touchmove', 'wheel']) sh.addEventListener(ev, (e) => e.stopPropagation());
    sh.addEventListener('click', (e) => {
      if (e.target === sh) { sheet(false); return; }
      const b = e.target.closest?.('button'); if (b && (b.dataset.s === 'copy' || b.dataset.s === 'paste' || b.dataset.s === 'best' || b.dataset.s === 'replay' || b.dataset.lb === 'site' || b.dataset.lb === 'all' || b.dataset.lb === 'prev' || b.dataset.lb === 'next')) setTimeout(() => sheet(false), 0);
    });
  }
  const reset = () => { sheet(false); ptr = null; ghost = null; hand = null; barSig = ''; if (attached) { detach(); attached = false; } opened = false; invalidate(); };
  const topPx = () => metrics().topPx, botPx = () => metrics().botPx, insetsNow = () => { const m = metrics(); return m.orient === 'land' ? { l: m.left, r: m.right } : { l: 0, r: 0 }; };
  return {
    on, layout, frame, draw, point, touch, hint, act, linked, onTry, onResult, reset, sheet, invalidate, topPx, botPx, insets: insetsNow, metrics, isLand,
    get ghost() { return ghost; }, get handOn() { return !!hand; }, get stats() { return stats; }, skipHand: () => endHand('hoppet over'), get opened() { return opened; },
    controls: () => classicControls({ sim: ctx.isSim(), selKind: selKindOf({ sel: ctx.getSel(), selLink: ctx.getSelLink(), sim: ctx.isSim(), dragging: ctx.isDragging() }) }),
  };
}
export { orientName };
