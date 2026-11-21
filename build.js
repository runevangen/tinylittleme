// R24: byggeskjermen (DOM + three). Logikken ligger i build_logic.js. Verden fryses og dimmes; et sideriss (2D) tar over,
// og du styrer med direkte berøring: dra deler ut av brettet, de snapper, to fingre vrir/zoomer, store knapper nederst.
// Kobles inn fra main.js med createBuildMode(). R25: tape/ledd/tau-verktøy og PRØV (fysikk i build_phys.js, tegnet her).
import * as THREE from 'three';
import {
  PART_TYPES, partType, createBuild, inTray, addPart, place, rotate, remove, undo, reset, topHit, pickPad, raise, corners, serialize, restore,
  addLink, linkTargets, removeLink, topLink, linkEnds, LINK_KINDS, twistRot, fitView, clampScale, toScreen, toWorld, canEnterBuild, nearestSite, initParts, partTypes, gotPartIds, stepParts, restoreParts, snapPoint, siteAnchors, ROT_STEP,
} from './build_logic.js';
import { ZOOM_STEP, gridForScale, anchorRadius, zoomAbout, zoomStep, freeCenter, isDoubleTap, dblTapView, zoomLabel } from './build_zoom.js';   // R44
import { capacity } from './build_capacity.js';   // R49a1: «Tåler X»-måler
import { trussHelp, helpKey } from './build_truss.js';   // R49a2: ledd som kan svinge og slanke deler
import { createSim, runSim, DT, siteBoxes, siteGoal, siteStart, FIG_R, settledPlaced } from './build_phys.js';
import { stressCss, tint, loadMap, whyBroke, breakTempo, ringAt } from './build_stress.js';   // R45: lesbar svikt
import { drawToyDetail, drawToyChain } from './build_toys_view.js';   // R46: leker som materialer
import { isToy } from './build_toys.js';
import { starsFor, starText, betterBuild, bonusTypes, BONUS, bonusAt, unlockedBonus, nextBonus, partCost } from './build_budget.js';   // R47: kostnad, stjerner, smulebudsjett
import { getBuildStars, recordBuildStars, getBonusUnlocks, recordBonus } from './rewards.js';
import { LOADS, DEFAULT_LOAD, offered, requiredLoads, afterWin, nextLoad, cleanPassed } from './build_loads.js';   // R48: leker som testlast
import { drawLoad } from './build_loads_view.js';
import { exportCode, importCode, applyImport } from './build_logic.js';   // R50: deling som kode
import { createRecorder, createReplay, ghostPose } from './build_replay.js';   // R50: replay og spøkelse
import { drawGhost } from './build_replay_view.js';
import { ghostChoice } from './build_ghost.js';   // R78
import { submitBridge, bestBridges, bridgeLevel, netReady, standing } from './build_net.js';   // R50: beste bygg på nett
import { createBuildTex } from './build_tex.js';   // R117: teksturer på bygde deler i verdenen
import { applyBuilt, clearBuilt, liftOut, builtCount, fulcrum, worldMeshDepth } from './build_world.js';   // R26: bygget flyttes ut i verdenen
import { trayIds, foundCount, withBonus, goalReached, dropIds, logLine, PB } from './partsbonus_logic.js';   // R120: delene er der fra start
import { isLab, labSitesOf, labFill, labRegister, labTrayItems, labStepSite, labInfoOf, labNameKey, labTaskKey, labFlagStep, labReachedSave, labReachedLoad, labHome, labFar } from './bygglab_logic.js';   // R67: Bygglab
import { labCss, labMarkup, labSync, LAB_TOP, LAB_TOP_LAND } from './bygglab_view.js';
import { parseRod } from './build_materials.js';
import { spanOf, spanSite, spanLine, spanArrowTarget, spanGuideShould, KEY_SEEN as SPAN_KEY, SPAN } from './buildspan_logic.js';   // R118: FRA og TIL
import { createSpanView } from './buildspan_view.js';
import { createTrussHelp, trhCss, trhMarkup } from './grid_truss_view.js';   // R122: TREKANT, DIAGONAL og ? (forslag i rutenett-bygging)
import { trussOn } from './grid_truss_help.js';
import { createGridUI, gridCss, gridMarkup } from './grid_view.js';   // R72: rutenett-bygging: knutepunkter og staver
import { GRID_PX } from './grid_view.js';
import { ensurePlayGrid, isPlaySite, playLocked, firstPassed, playStore, codeMode, PLAY } from './grid_play.js';   // R82: rutenett i de vanlige byggebrettene
import { createGridGuide, guideMarkup } from './grid_guide_view.js';   // R75: «Så slik»-guide for rutenett
import { createBuildUx, buxCss, buxMarkup, BUX_TOP, BUX_BOT, BUX_TOP_LAND, BUX_BOT_LAND } from './buildux_view.js';   // R92: forenklet byggeskjerm (prototype bak ⚙-valget buildux)
import { KEY_MODE, KEY_TIP } from './grid_guide_logic.js';
import { createLoupe, loupeCss, loupeMarkup } from './build_loupe_view.js';   // R106: hjørneglass (build_loupe_logic.js)
import { holdReached, partLine } from './build_loupe_logic.js';
import { blankRun, staleKeys, dirtyKeys, ghostVisible } from './build_runstate.js';
import { createBuildNext, bnCss, bnMarkup } from './buildnext_view.js';
import { createBuildLock, blkCss, blkMarkup } from './buildlock_view.js';   // R111: låste steder får det nye skallet (kort + GÅ TIL)
import { lockShown } from './buildlock_logic.js';   // R107: resultatkort og NESTE STED
import { seriesOf, phaseOf, topNext } from './buildnext_logic.js';
import { isTap, hitsAt, tapAction, trayPlace, capShown, capWait, createCapStats, TAP } from './build_tap_logic.js';   // R110: trykk på brikke/del, «Tåler» bare der måleren vises
import { buxSite, budgetOf } from './buildux_logic.js';
import { touchEvent, hanging, plateTop, createWriteCounter, writeOnce } from './build_touch_logic.js';   // R109: berøringstilstand, tekstplassering, DOM-skrivinger
import { createClassicUx, cbxCss, cbxMarkup } from './buildux_classic_view.js';   // R96: samme nye skall for klassiske steder (Trapp, Vippe, ...)
import { createPeaks, loadsNow, peakSummary, stressCss as gStressCss, colorCss as gColorCss, widthK as gWidthK, isDanger as gDanger, shown as gShown, pct as gPct } from './grid_stress.js';   // R73: farge etter belastning, «største belastning»
import { squareTipShould } from './badebro_logic.js';   // R119: firkant uten diagonal
import { stageScaled, stageSite, stageOf, hasStage, overBudget, stagesOf, stagePrev, stageLocked, stageLockText, stageLines, passRead, passRecord, passClear } from './grid_stage.js';   // R74: rutenett-oppdrag: mål, budsjett, tung last, låsing
import { gridAnchors, gridStep, isGrid, simDef as gridSimDef, simDefAuto as gridSimDefAuto, loadPass as gridLoadPass, gUndo, gReset, wipe as gridWipe, exportAny, importAny, gApplyImport, gridSave, gridLoad, gridStats } from './grid_logic.js';

const css = `
#bld{position:fixed;inset:0;z-index:7;display:none;background:linear-gradient(#26324bfa,#141a2cff);touch-action:none;user-select:none;-webkit-user-select:none;color:#fff;font:600 14px system-ui}
body.building #bld{display:block}
body.building #panel{z-index:10}
#bld canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}
#bld .bt{position:absolute;left:0;right:0;display:flex;flex-wrap:nowrap;gap:6px;justify-content:center;padding:0 8px;pointer-events:none}
#bld .bt.top{top:max(8px,env(safe-area-inset-top))}
body.flagscr #bld .bt.top{right:max(46px,calc(env(safe-area-inset-right) + 46px))}   /* R71: plass til ⚑ øverst til høyre */
#bld .bt.top button{font-size:12px;padding:0 3px;overflow:hidden;text-overflow:clip;flex:1 1 auto}   /* R76: fem knapper i toppraden; teksten får ikke stikke ut */
#bld .bt.top button[data-a="menu"]{border-color:#ffffff66;color:#ffd9a0;background:#121a2cb3}   /* R69/R76: Avslutt til meny står i toppraden (dekker ingenting) */
@media (max-width:380px){#bld .bt.top button{font-size:11px;padding:0 2px}}
#bld.sim .bmenu{display:none}
#bld .bt.bot{bottom:max(8px,env(safe-area-inset-bottom))}
#bld button{pointer-events:auto;flex:1 1 0;min-width:0;height:48px;padding:0 4px;border-radius:14px;border:2px solid #ffa940;background:#121a2ce6;color:#ffd9a0;font:700 14px system-ui;white-space:nowrap;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
#bld button:active{background:#2a3350}
#bld .zoom{position:absolute;right:8px;top:calc(max(8px,env(safe-area-inset-top)) + 96px);display:flex;gap:6px;pointer-events:none}
#bld .zoom button{flex:0 0 auto;width:56px;height:42px;padding:0;font:800 24px system-ui;line-height:1}
#bld.sim .zoom{opacity:.4}
#bld button.go{background:#2a7f62;border-color:#3df0b0;color:#fff}
#bld button.on{background:#7a4a14}
#bld button[disabled]{opacity:.4}
#bld .tray{position:absolute;left:0;right:0;bottom:calc(max(8px,env(safe-area-inset-bottom)) + 56px);height:70px;display:flex;gap:10px;align-items:center;padding:6px 10px;background:#0b1020aa;border-top:2px solid #ffa94066;border-bottom:2px solid #ffa94066;overflow-x:auto;touch-action:pan-x}
#bld .chip{flex:0 0 auto;height:54px;min-width:70px;border:2px solid #fff6;border-radius:10px;background:#1d2433;display:flex;align-items:center;justify-content:center;touch-action:none;position:relative}
#bld .chip i{display:block;border-radius:3px;border:2px solid #0006}
#bld .chip.used{opacity:.3}
#bld .hint{position:absolute;left:0;right:0;top:calc(max(8px,env(safe-area-inset-top)) + 58px);text-align:center;color:#ffd9a0;font:600 13px system-ui;pointer-events:none;padding:0 12px;text-shadow:0 1px 3px #000}
#bld .tools{position:absolute;left:0;right:0;bottom:calc(max(8px,env(safe-area-inset-bottom)) + 56px + 92px);display:flex;gap:6px;justify-content:center;padding:0 8px;pointer-events:none}
#bld .tools button{height:42px;flex:0 1 96px;font-size:13px}
#bld .tools button.on{background:#7a4a14;border-color:#fff}
#bld .loads{position:absolute;left:0;right:0;bottom:calc(max(8px,env(safe-area-inset-bottom)) + 56px + 92px + 48px);display:flex;gap:6px;justify-content:center;padding:0 8px;pointer-events:none}
#bld .loads button{height:44px;flex:1 1 0;max-width:110px;font-size:13px}
#bld .loads button.on{background:#7a4a14;border-color:#fff}
#bld.sim .loads{display:none}
#bld .share{position:absolute;left:0;right:0;bottom:calc(max(8px,env(safe-area-inset-bottom)) + 56px + 92px + 48px);display:flex;gap:6px;justify-content:center;padding:0 8px;pointer-events:none}
#bld.hasloads .share{bottom:calc(max(8px,env(safe-area-inset-bottom)) + 56px + 92px + 96px)}
#bld.sim .share{bottom:calc(max(8px,env(safe-area-inset-bottom)) + 56px + 92px)}
#bld .share button{height:42px;flex:1 1 0;max-width:110px;font-size:12px;border-color:#6ab8ff;color:#cfe8ff}
#bld .share button[disabled]{opacity:.35}
#bld .modal{position:absolute;inset:0;z-index:5;background:#000b;display:none;align-items:center;justify-content:center;padding:12px}
#bld .modal.open{display:flex}
#bld .modal .box{background:#1d2433;border:2px solid #ffa940;border-radius:14px;padding:12px;width:100%;max-width:420px;max-height:86%;overflow:auto;display:flex;flex-direction:column;gap:8px}
#bld .modal .mt{color:#ffd9a0;font:700 14px system-ui}
#bld .modal textarea{width:100%;box-sizing:border-box;height:110px;border-radius:8px;border:2px solid #fff6;background:#0b1020;color:#fff;font:12px ui-monospace,monospace;padding:6px;user-select:text;-webkit-user-select:text;touch-action:auto}
#bld .modal .row{display:flex;gap:8px;align-items:center;color:#fff;font:600 13px system-ui}#bld .modal .row span{flex:1}#bld .modal .row button{flex:0 0 auto;height:40px;padding:0 10px}
#bld .modal .mb{display:flex;gap:8px}
#bld .tray>:first-child{margin-left:auto}#bld .tray>:last-child{margin-right:auto}   /* R26: midtstilt, men venstre kant kan rulles til når det er mange deler */
#bld .chip.bonus{outline:2px solid #ffd23f;outline-offset:1px}
#bld.sim .tray,#bld.sim .tools{display:none}
#bld.sim button[data-a="undo"],#bld.sim button[data-a="reset"],#bld.sim button[data-a="rotl"],#bld.sim button[data-a="rotr"],#bld.sim button[data-a="snap"],#bld.sim button[data-a="del"]{opacity:.25;pointer-events:none}
#btnBuild{position:fixed;right:12px;top:calc(max(8px,env(safe-area-inset-top)) + 112px);z-index:4;height:50px;max-width:min(64vw,300px);padding:0 18px;border-radius:25px;border:2px solid #3df0b0;background:#2a7f62dd;color:#fff;font:800 16px system-ui;display:none;touch-action:manipulation;line-height:1.05}#btnBuild small{display:block;font:600 11px system-ui;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#btnBuildSpan{position:fixed;right:12px;top:calc(max(8px,env(safe-area-inset-top)) + 166px);z-index:4;max-width:min(64vw,300px);padding:4px 10px;border-radius:12px;background:#0b1020cc;color:#fff;font:700 12px system-ui;text-align:center;display:none;pointer-events:none;line-height:1.3}#btnBuildSpan b.f{color:#3df0b0}#btnBuildSpan b.t{color:#ffd23f}#btnBuildSpan span{display:block;font-weight:600;color:#cfe8ff}
@media (orientation:landscape) and (max-height:520px){#bld .share{bottom:calc(max(8px,env(safe-area-inset-bottom)) + 48px + 76px + 44px)}#bld.hasloads .share{bottom:calc(max(8px,env(safe-area-inset-bottom)) + 48px + 76px + 88px)}#bld.sim .share{bottom:calc(max(8px,env(safe-area-inset-bottom)) + 48px + 76px)}#bld .share button{height:34px}#bld .zoom{flex-direction:column;top:max(56px,calc(env(safe-area-inset-top) + 48px));gap:4px}#bld .zoom button{height:34px;width:48px;font-size:20px}#btnBuild{top:max(56px,calc(env(safe-area-inset-top) + 48px))}#btnBuildSpan{top:max(56px,calc(env(safe-area-inset-top) + 48px));right:250px;max-width:220px}#bld .tray{height:54px;bottom:calc(max(8px,env(safe-area-inset-bottom)) + 48px)}#bld .tools{bottom:calc(max(8px,env(safe-area-inset-bottom)) + 48px + 76px)}#bld .loads{bottom:calc(max(8px,env(safe-area-inset-bottom)) + 48px + 76px + 44px)}#bld .loads button{height:36px}#bld .tools button{height:34px}#bld .chip{height:40px}#bld button{height:40px}}
`;

export function createBuildMode({ onGoLevel = () => {}, onMenu, onStat = () => {}, onOpen = () => {}, onClose = () => {}, onStagePass = () => {}, menuLabel = () => 'Avslutt til meny', scene, LEVEL, player, $, T, logEv, toast, isPlay, isMenu, isBoss, isWon, isOv, getSnap, setSnap, allParts, audio, buzz, onChange, TOUCH, getSlow = () => false, getStrength = () => 1, onSolved = () => {}, getWorld = () => true, getBuildTex = () => true, getTexLow = () => false, getSeeHint = () => true, getDbl = () => true, getFine = () => true, getStress = () => true, getBreakFx = () => true, getLego = () => true, store = null, levelId = '', getBudget = () => true, getBonus = () => true, getCrumbs = () => 0, getBonusStep = () => 1, getLoads = () => true, getShare = () => true, getGhost = () => true, getCap = () => true, getTruss = () => true, getAxial = () => 1, getVersion = () => '', getCode = () => '', netFetch = undefined, copyText = undefined, getLabFree = () => true, getGrid = () => true, getGridHint = () => true, getSquareTip = () => true, getGridGuide = () => true, getGridMax = () => 6.5, getGridStress = () => true, getGridPeak = () => true, getGridDeck = () => true, getGridGamma = () => 0.5, getGridSlow = () => 0.3, getStage = () => ({ on: false }), getPlayGrid = () => true, getPlayLock = () => true, getBuildUx = () => false, getLoupe = () => true, getLoupeZoom = () => 3, getLoupeSize = () => 100, getBuildNext = () => true, getBuxHelp = () => ({ labels: true, suggest: false }), getSpan = () => ({ on: true, expert: false, help: 'normal' }), getPartsStart = () => true, getMirror = () => true, getTruss2 = () => ({ mode: 'auto', expert: false }) }) {
  initParts(LEVEL);
  const sites = LEVEL.buildSites, parts = LEVEL.buildParts;
  const enabled = sites.length > 0;
  if (!isLab(LEVEL)) { const pg = ensurePlayGrid(sites); if (pg.length) logEv('bygg', `rutenett åpent i vanlige brett: ${pg.join(', ')}`); }   // R82: steder med to ankre og dekk får MODUS-knappen (brettfilene er uendret)
  const labSites = isLab(LEVEL) ? labSitesOf(LEVEL) : [], lab = labSites.length ? { reached: new Set(), moved: false, home: null } : null;   // R67: Bygglab (bygglab_logic.js): stedene på rad, ◀ ▶, ubegrenset mengde, målflagg
  const st = document.createElement('style'); st.textContent = css + gridCss() + trhCss() + buxCss() + cbxCss() + loupeCss() + bnCss() + blkCss() + (lab ? labCss() : ''); document.head.appendChild(st);
  const types = { ...partTypes(LEVEL), ...bonusTypes() };   // R47: ekstradelene (smulebudsjett) har egne id-er og bor i samme tabell
  const mem = new Map(), st0 = store || { get: (k, d) => (mem.has(k) ? mem.get(k) : d), set: (k, v) => mem.set(k, v) };   // uten lagring (tester) holdes alt i minnet
  const bonusOpen = () => (getBonus() ? [...new Set([...unlockedBonus(getCrumbs(), getBonusStep()).map((b) => b.id), ...getBonusUnlocks(st0, levelId, Object.keys(bonusTypes()))])] : []);
  const B0 = (site) => createBuild(site, types, bonusOpen());
  const builds = new Map();                  // stedets id -> byggetilstand
  const labOpts = () => ({ unlimited: getLabFree() || allParts() });
  const getB = (site) => { let b = builds.get(site.id); if (!b) { b = B0(site); builds.set(site.id, b); if (lab) labFill(b, types, labOpts()); } return b; };
  const TOPPX = () => cbx.on() ? cbx.topPx() : bux.on() ? bux.topPx() : (innerHeight <= 520 ? 100 : 130) + (lab ? (innerHeight <= 520 ? LAB_TOP_LAND : LAB_TOP) : 0), BOTPX = () => cbx.on() ? cbx.botPx() : bux.on() ? bux.botPx() : (grid.on() ? (innerHeight <= 520 ? 96 : 124) : (innerHeight <= 520 ? 110 : 160)) + (active && loadList().length > 1 ? (innerHeight <= 520 ? 40 : 48) : 0) + (active ? (innerHeight <= 520 ? 40 : 46) : 0);   // R50: delingsrad over lastknappene
  let active = null, view = null, sel = null, selLink = null, tool = null, linkFrom = null, drag = null, W = 0, H = 0, hint = '';
  let lastTap = null, zoomMsg = '', zoomMsgT = 0;   // R44: dobbelttrykk og zoom-melding
  let gPeaks = null, gSum = null, gSpeed = 'play';   // R73: topp per stav, «største belastning» etter prøven, tempo (SLOW/PAUSE)
  let loadMore = null, simLoad = DEFAULT_LOAD, sim = null, simAcc = 0, simMarks = [], simDone = false, simT0 = 0, confetti = [], simBreaks = [], simWhy = null, simHelp = null, breakAt = -9;   // R25: PRØV
  const solved = new Set(); let seeShown = false;
  const recs = new Map(); let recorder = null, ghostRec = null, replaying = false, winSolved = false;   // R50: siste prøve per sted (opptak), spøkelse, replay
  let winRes = null, starsCache = null, lastCrumbs = -1, lastBo = true, lastBonusKey = '';   // R47: siste vellykkede bygg (kostnad og stjerner), bufret stjernekart, bonus-sjekk
  const wonText = () => (getBudget() && winRes ? T('build.wonStars', { name: starText(winRes.stars), n: winRes.cost }) : T('build.won'));
  const starsMap = () => { if (!starsCache) { starsCache = {}; for (const [k, v] of Object.entries(getBuildStars(st0, levelId))) starsCache[k] = v.stars; } return starsCache; };
  // R47: ekstradeler som smulene har åpnet legges i brettet til alle byggestedene (og husk dem, så de ikke forsvinner om smulene nullstilles)
  function syncBonus(announce = true) {
    const open = bonusOpen(), key = open.join(',');
    if (key === lastBonusKey) return; lastBonusKey = key;
    const fresh = recordBonus(st0, levelId, open, Object.keys(bonusTypes()));
    for (const s of sites) { const b = getB(s); for (const id of open) if (!b.have.includes(id)) addPart(b, id); }
    if (announce) for (const id of fresh) { const b = BONUS.find((x) => x.id === id); logEv('bygg', `ekstradel ${id} (${b.type}) åpnet med ${getCrumbs()} smuler`); toast(T('build.bonusNew', { name: T('build.p.' + b.type) })); audio?.bhop?.(); }
    if (active) trayRender(); if (fresh.length) onChange?.();
  }
  const loadSel = new Map(), passedL = new Map();   // R48: valgt testlast per sted, og hvilke laster som har klart gjeldende bygg ({ sig, ids })
  // R74: oppdraget i rutenett-modus (grid_stage.js): egne laster (tyngre), budsjett og låsing; bare når byggingen står i rutenett-modus og innstillingen er på
  const stageCfg = () => getStage() || {};
  const stageHere = () => !!active && !!stageCfg().on && hasStage(active);
  const stageNow = () => (stageHere() && isGrid(getB(active)) ? withBonus(stageScaled(active, { massK: stageCfg().massK, budgetK: stageCfg().budgetK }), foundCount(parts), getPartsStart() && !lab) : null);   // R120: funnet del = +1 på budsjettet (bonus)
  const lsite = () => stageSite(active, stageNow());
  let gPassCache = null; const gPass = () => gPassCache || (gPassCache = passRead(st0, levelId));
  const playHere = () => !!active && isPlaySite(active);
  const pstore = playStore(st0), gstore = { get: (k, d) => (playHere() ? pstore : st0).get(k, d), set: (k, v) => (playHere() ? pstore : st0).set(k, v) };   
  const playLockedFor = (site) => !!site && playLocked({ levelId, site, passed: firstPassed(getBuildStars(st0, PLAY.firstLevel)), lockOn: getPlayLock() });
  const stageLockedFor = (site) => !!site && !!stageCfg().on && hasStage(site) && stageLocked(sites, gPass(), site.id, stageCfg().lock !== false);
  let winOver = false;
  const loadsOn = () => (getLoads() || !!lab || requiredLoads(lsite()).length > 0);
  const loadList = () => offered(lsite(), getLoads() || !!lab);
  const curLoad = () => { const l = loadList(), v = loadSel.get(active.id); return l.includes(v) ? v : l.includes(DEFAULT_LOAD) ? DEFAULT_LOAD : l[0]; };
  const passedOf = (site) => { const b = builds.get(site.id), e = passedL.get(site.id); return e && b && e.sig === sigOf(b) ? e.ids : []; };
  const committed = new Map();               // R26: stedets id -> bygget (som tekst) som står i verdenen akkurat nå
  const worldPlaced = new Map();             // stedets id -> delene slik de ligger etter at de har satt seg
  const worldMeshes = new Map();             // stedets id -> three-gruppe med de ferdige delene
  const sigOf = (B) => JSON.stringify(serialize(B).placed);
  let btex = null;   // R117: delte teksturer/materialer for bygde deler (lages første gang de trengs)
  const worldTex = () => btex || (btex = createBuildTex(THREE, { make: (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }, low: !!getTexLow?.() }));
  function showWorld(site) {                 // tegn bygget i verdenen (nedbøyning er bare faket: delene står i designposen)
    hideWorld(site.id); const g = new THREE.Group(), hd = worldMeshDepth(site), tx = getBuildTex?.() !== false ? worldTex() : null;   // R112: litt smalere enn sokkelen (ingen z-fighting)
    const dress = (m) => { if (tx) { m.castShadow = true; m.receiveShadow = true; } return m; };   // R117: som møblene (skyggebudsjettet i main.js begrenser kasterne)
    for (const p of worldPlaced.get(site.id) || []) {
      const t = partType(p.type), m = dress(tx ? new THREE.Mesh(tx.geometry(p.type, t.w, t.h, hd, p.id), tx.material(p.type, t.color))
        : new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, hd), new THREE.MeshStandardMaterial({ color: t.color, roughness: 0.65, metalness: p.type === 'weight' ? 0.5 : 0 })));
      m.position.set(site.x + p.u, site.y + p.v, site.z); m.rotation.z = p.rot || 0; g.add(m);
      if (t.pivot) { const f = fulcrum(site, p); if (f) { const fw = f.max[0] - f.min[0], fh = f.max[1] - f.min[1], fm = dress(tx ? new THREE.Mesh(tx.geometry('plank_s', fw, fh, hd, f.id), tx.material('plank_s', '#' + f.color.toString(16).padStart(6, '0'))) : new THREE.Mesh(new THREE.BoxGeometry(fw, fh, hd), new THREE.MeshStandardMaterial({ color: f.color, roughness: 0.7 }))); fm.position.set((f.min[0] + f.max[0]) / 2, (f.min[1] + f.max[1]) / 2, (f.min[2] + f.max[2]) / 2); g.add(fm); } }
    }
    scene.add(g); worldMeshes.set(site.id, g);
    if (tx && g.children.length) { const st = tx.stats(); logEv('bygg', `teksturer på bygde deler: ${site.id}, ${g.children.length} deler, ${st.materials} materialer, ${st.textures} teksturer, ${(st.bytes / 1024).toFixed(0)} KB`); }
  }
  const redrawWorld = () => { for (const id of [...worldMeshes.keys()]) { const s = sites.find((q) => q.id === id); if (s) showWorld(s); } };   // R117: ⚙-valget slått av/på midt i spillet
  const worldTex_shared = (m) => !!m?.userData?.buildTex;   // R117: delte materialer disponeres ikke per del
  function hideWorld(id) { const g = worldMeshes.get(id); if (g) { scene.remove(g); g.traverse?.((o) => { o.geometry?.dispose?.(); if (!worldTex_shared(o.material)) o.material?.dispose?.(); }); worldMeshes.delete(id); } }
  function commitWorld(site, why) {          // R26: flytt bygget ut i verdenen som solid
    if (!getWorld() || !LEVEL.boxes) return 0; const B = getB(site);
    const wp = settledPlaced(isGrid(B) ? gridSimDef(B) : { site, placed: B.placed.map((p) => ({ id: p.id, type: p.type, u: p.u, v: p.v, rot: p.rot })), links: B.links }, { strength: getStrength() }); worldPlaced.set(site.id, wp);   // delene der de ender opp (klosser har falt på plass)
    const n = applyBuilt(LEVEL, site, wp, { skip: isGrid(B) ? new Set(gridLoadPass(B)) : null });   // R119: bare veien er fast i verdenen
    committed.set(site.id, sigOf(B)); if (liftOut(LEVEL, player, site.id)) logEv('bygg', 'figuren løftet ut av bygget'); showWorld(site);
    logEv('bygg', `bygget står i verdenen (${why}): ${site.id}, ${B.placed.length} deler, ${n} flater`); return n;
  }
  function uncommitWorld(site, why) { if (!committed.has(site.id)) return; clearBuilt(LEVEL, site.id); hideWorld(site.id); committed.delete(site.id); worldPlaced.delete(site.id); logEv('bygg', `bygget fjernet fra verden (${why}): ${site.id}`); }
  const ptrs = new Map(); let gest = null;
  // R109: pointer capture settes bare på lerretet og frigis alltid (slipp, avbrudd, mistet capture, blur); drag/gest/ptrs nullstilles ved avbrutt berøring
  const capIds = new Set(), wc = createWriteCounter(), wcache = new WeakMap();
  function capture(e) { try { cv.setPointerCapture(e.pointerId); capIds.add(e.pointerId); } catch { /* ok */ } }
  function uncap(pid) { try { for (const id of (pid == null ? [...capIds] : [pid])) { capIds.delete(id); if (cv.hasPointerCapture?.(id)) cv.releasePointerCapture(id); } } catch { /* ok */ } }
  const wr = (el, key, val, apply) => writeOnce(wcache.get(el) || wcache.set(el, new Map()).get(el), key, val, apply, wc);   // skriv til DOM bare når verdien er endret
  const setDis = (b, v) => { v = !!v; wr(b, 'dis', v, (x) => { b.disabled = x; }); };
  const setHint = (t) => wr(hintEl, 'txt', t, (x) => { hintEl.textContent = x; });
  let hintBox = { sig: '', bottom: 0 };
  const hintBottom = () => { const t = hintEl.textContent; if (!t) return 0; const sig = `${t}|${innerWidth}|${innerHeight}`; if (hintBox.sig !== sig) { const r = hintEl.getBoundingClientRect(), o = root.getBoundingClientRect(); hintBox = { sig, bottom: r.height ? r.bottom - o.top : 0 }; } return hintBox.bottom; };
  let budgetBox = null, flagLogged = false;
  function touchReset(ev, e) {
    if (!active) return; const st = { drag, gest, ptrs: ptrs.size, capture: capIds.size > 0 }, r = touchEvent(ev, st, e ? e.pointerId : null);
    if (r.release) uncap(ev === 'up' || ev === 'cancel' ? e?.pointerId : null);
    if (r.reset) { drag = null; gest = null; ptrs.clear(); grid.cancel(); bux.cancel(); uncap(null); trayRender(); }
    if (r.log) logEv('bygg', r.log);
  }

  // ---- verden: deler som ligger og lyser, og byggestedet som en gylden ramme ----
  const partMeshes = parts.map((q) => {
    const t = partType(q.type), g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(t.w * 0.6, Math.max(0.35, t.h * 0.9), 0.9), new THREE.MeshStandardMaterial({ color: t.color, roughness: 0.6, emissive: t.color, emissiveIntensity: 0.18 }));
    g.add(m); g.position.set(q.x, q.y, q.z); scene.add(g); return { q, g };
  });
  const siteMeshes = sites.map((s) => {
    const g = new THREE.Group(), mat = new THREE.LineBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85 });
    const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(s.w, s.h, 1.2)), mat); box.position.y = s.h / 2; g.add(box);
    g.position.set(s.x, s.y, s.z); scene.add(g); return { s, g, mat };
  });

  const spanLogged = new Set(); let spanV = null, marksOn = true; try { spanV = createSpanView({ scene, sites, T, getOn: () => getSpan().on && marksOn }); } catch (e) { spanV = null; }   // R118: FRA/TIL-markører i verden (buildspan_view.js)

  // ---- DOM ----
  const root = document.createElement('div'); root.id = 'bld';
  root.innerHTML = `<canvas></canvas><div class="bt top"><button data-a="menu"></button><button data-a="back"></button><button data-a="undo"></button><button data-a="reset"></button><button data-a="try" class="go"></button></div>
  ${lab ? labMarkup() : ''}<div class="hint"></div><div class="zoom"><button data-z="in" aria-label="+">+</button><button data-z="out" aria-label="−">−</button><button data-z="fit" aria-label="⤢">⤢</button></div><div class="tools"><button data-t="tape"></button><button data-t="hinge"></button><button data-t="rope"></button><button data-t="band"></button></div><div class="loads"></div><div class="share"><button data-a="mode" class="bmode"></button><button data-a="gguide" class="bguide"></button><button data-s="replay"></button><button data-s="copy"></button><button data-s="paste"></button><button data-s="best"></button></div><div class="modal"><div class="box"><div class="mt"></div><textarea spellcheck="false" autocapitalize="off" autocomplete="off"></textarea><div class="list"></div><div class="mb"><button data-m="use"></button><button data-m="close"></button></div></div></div><div class="tray"></div><div class="bt bot"><button data-a="rotl">↺</button><button data-a="rotr">↻</button><button data-a="snap"></button><button data-a="del"></button></div>${gridMarkup()}${guideMarkup()}${trhMarkup()}${buxMarkup()}${cbxMarkup()}${loupeMarkup()}${bnMarkup()}${blkMarkup()}`;   // R72: modusknapp og materialvalg (rutenett)
  if (lab) root.classList.add('lab');
  document.body.appendChild(root);
  const cv = root.querySelector('canvas'), g2 = cv.getContext('2d'), tray = root.querySelector('.tray'), loadsEl = root.querySelector('.loads'), hintEl = root.querySelector('.hint'), modal = root.querySelector('.modal'), mTitle = modal.querySelector('.mt'), mText = modal.querySelector('textarea'), mList = modal.querySelector('.list'), sBtn = (k) => root.querySelector(`[data-s="${k}"]`);
  const btn = (a) => root.querySelector(`[data-a="${a}"]`);
  const spanRow = document.createElement('div'); spanRow.id = 'btnBuildSpan'; document.body.appendChild(spanRow);   // R118: «FRA ◀ … ▶ TIL» og gap under BYGG-knappen
  const enterBtn = document.createElement('button'); enterBtn.id = 'btnBuild'; document.body.appendChild(enterBtn);
  const dpr = () => Math.min(2, window.devicePixelRatio || 1);
  const gguide = createGridGuide({ root, T, store: gstore, logEv, getOn: () => getGridGuide() && !bux.wanted(), getHint: () => getGridHint(), onClose: () => grid.sync() });   // R75 (R92: den forenklede skjermen har egen hånd-animasjon)
  const grid = createGridUI({   // R72: rutenett-bygging (grid_view.js, grid_logic.js)
    root, T, toast, logEv, buzz, audio, onChange, store: gstore, guide: gguide, getGuideOn: () => getGridGuide(), getB: () => (active ? getB(active) : null), site: () => active, view: () => view, toWorld: (x, y) => toWorld(view, W, H, x, y), loc: (e) => loc(e), now: () => tNow, botY: () => H - BOTPX(), isSim: () => !!sim, trayRender: () => trayRender(),
    getOn: () => getGrid() && (!playHere() || getPlayGrid()), getHint: () => getGridHint(), getMaxLen: () => getGridMax(), getDeck: () => getGridDeck() && !stageHere() && !playHere(), stageOn: () => stageHere() || playHere(), locked: () => stageLockedFor(active) || playLockedFor(active), lockText: () => (stageLockedFor(active) ? stageLockText(sites, active.id, T) : T('gplay.locked')),
    startPan: (e, x, y) => { sel = null; gest = { kind: 'pan', x, y, cu: view.cu, cv: view.cv, t: e.timeStamp || performance.now(), tn: performance.now(), moved: false }; capture(e); },
  });
  const loupe = createLoupe({ root, cv, T, logEv, getOn: () => getLoupe(), getZoom: () => getLoupeZoom(), getSizePct: () => getLoupeSize?.(), dpr });   // R106
  const buxCtx = {   // R92: forenklet byggeskjerm (buildux_view.js, buildux_logic.js): bruker rutenett-koden over, men egne knapper og direkte bygging
    root, T, toast, logEv, buzz, audio, grid, levelId, store: st0, onChange, getOn: () => getBuildUx(), getMirror: () => getMirror(), getHelp: () => getBuxHelp(), getCrumbs: () => getCrumbs(), budgetNow: () => { const g = stageNow(); return g ? g.budget : undefined; }, getHint: () => getGridHint(), squareTip: () => !!active && squareTipNow(getB(active)), getGuideOn: () => getGridGuide(), getDbl: () => getDbl(),
    site: () => active, getB: () => (active ? getB(active) : null), view: () => view, toWorld: (x, y) => toWorld(view, W, H, x, y), loc: (e) => loc(e), isSim: () => !!sim, width: () => W, topY: () => TOPPX(), trayRender: () => trayRender(),
    startPan: (e, x, y) => { sel = null; gest = { kind: 'pan', x, y, cu: view.cu, cv: view.cv, t: e.timeStamp || performance.now(), tn: performance.now(), moved: false }; capture(e); },
    fit: () => zoomAct.fit(), speed: (k) => { if (active && sim && grid.on() && !simDone) gSpeed = grid.setSpeed(k); },
    undo: () => { if (active && gUndo(getB(active))) { audio?.bpop?.(); grid.clearSel(); trayRender(); onChange?.(); } },
    act: { back: () => act.back(), undo: () => act.undo(), try: () => act.try(), menu: () => act.menu(), reset: () => act.reset() },
    info: () => { const b = getB(active), r = starsFor(active, b.placed, b.links), g = stageNow(), best = getBuildStars(st0, levelId)[active.id], li = lab ? labInfo() : null; return { sim: !!sim, done: !!sim && simDone, cost: r.cost, stars: r.stars, on: gridStats(b).rods > 0, best: best ? best.stars : 0, name: lab ? T(labNameKey(active)) : (active.label || active.id), nOf: li ? { n: li.n, of: li.of } : null, lab: !!lab, stageBudget: g ? g.budget : null }; },
  };
  const bux = createBuildUx(buxCtx);
  const trh = createTrussHelp({   // R122: TREKANT / DIAGONAL / ? (grid_truss_view.js, grid_truss_help.js): delt kode for broene, Byggeskolen og den gamle rutenett-skjermen
    root, T, toast, logEv, buzz, audio, grid, store: st0, onChange, getB: () => (active ? getB(active) : null), site: () => active, view: () => view, isSim: () => !!sim, width: () => W, topY: () => TOPPX(), botY: () => H - BOTPX(), trayRender: () => trayRender(),
    toWorld: (x, y) => toWorld(view, W, H, x, y), insets: () => (cbx.on() ? cbx.insets() : bux.on() ? bux.insets() : { l: 0, r: 0 }), getCfg: () => ({ on: trussOn(getTruss2()) }),
    getBudget: () => { const g = active ? stageNow() : null; if (!g) return null; const b = getB(active), r = starsFor(active, b.placed, b.links); return budgetOf({ site: active, cost: r.cost, stageBudget: g.budget }); },   // bare et oppdragsbudsjett (Byggeskolen) er en grense; i Hyllebroen er «budsjettet» tersklen for to stjerner og hjelpen blir ikke stoppet av den
  });
  const cbxCtx = {   // R96: samme nye skall for klassiske steder (buildux_classic_view.js, buildux_classic_logic.js): gjenbruker delebrett, festing og fysikk, men med egne knapper og layout
    root, T, toast, logEv, buzz, store: st0, getOn: () => getBuildUx(), getHint: () => getGridHint(), getGuideOn: () => getGridGuide(),
    gridOn: () => grid.on(), buxOn: () => bux.on(), buxWanted: () => bux.wanted(),
    site: () => active, getB: () => (active ? getB(active) : null), toWorld: (x, y) => toWorld(view, W, H, x, y), isSim: () => !!sim, height: () => H,
    getTool: () => tool, setTool: (t) => { if (sim) return; tool = tool === t ? null : t; linkFrom = null; sel = null; selLink = null; labels(); }, getLinkFrom: () => linkFrom, getSel: () => sel, getSelLink: () => selLink, isDragging: () => !!drag,
    getSnap: () => getSnap(), getSpeed: () => grid.speed, speed: (k) => { if (active && sim && !simDone) gSpeed = grid.setSpeed(k); },
    fit: () => zoomAct.fit(), cancelDrag: () => { drag = null; gest = null; ptrs.clear(); if (active) trayRender(); },
    act: { back: () => act.back(), undo: () => act.undo(), try: () => act.try(), menu: () => act.menu(), reset: () => act.reset(), snap: () => act.snap(), rotl: () => act.rotl(), rotr: () => act.rotr(), del: () => act.del() },
    info: () => { const b = getB(active), r = starsFor(active, b.placed, b.links), best = getBuildStars(st0, levelId)[active.id], li = lab ? labInfo() : null; return { sim: !!sim, done: !!sim && simDone, cost: r.cost, parts: r.parts, stars: r.stars, on: b.placed.length > 0, best: best ? best.stars : 0, name: lab ? T(labNameKey(active)) : (active.label || active.id), nOf: li ? { n: li.n, of: li.of } : sites.length > 1 ? { n: sites.indexOf(active) + 1, of: sites.length } : null, lab: !!lab, budgetShown: !!getBudget() }; },
  };
  const cbx = createClassicUx(cbxCtx);
  // R107: resultatkort og NESTE STED (buildnext_view.js, buildnext_logic.js): felles for begge skall (broer/Byggeskolen og klassiske steder)
  const bnList = () => (lab ? labSites : sites), bnName = (s) => (lab ? T(labNameKey(s)) : (s.label || s.id));
  function bnState() {
    if (!active || !getBuildNext()) return null;
    const skin = cbx.on() || bux.on() ? 'on' : null; if (!skin) return null;
    const series = seriesOf(bnList(), active.id), nx = series && series.next, nextLocked = !!nx && stageLockedFor(nx), tn = topNext({ series, nextLocked });
    const phase = phaseOf({ sim: !!sim, done: !!sim && simDone, replaying });
    const r = phase === 'resultat' ? { won: sim.state.state === 'won', solved: winSolved, over: winOver, loadMore: !!loadMore, stars: winRes ? winRes.stars : 0, nextStar: winRes ? winRes.next : null } : {};
    const prev = series && series.idx > 0 ? bnList()[series.idx - 1] : null;
    return { skin, series, nextLocked, topState: tn ? tn.state : null, nextName: nx ? bnName(nx) : '', curName: bnName(active), prevName: prev ? bnName(prev) : '', phase, ...r, allDone: !!lab && stagesOf(sites).every((q) => gPass().has(q.id)) };
  }
  const bn = createBuildNext({ root, T, logEv, toast, state: bnState, goNext: (how) => { const s = bnState(), nx = s && s.series && s.series.next; return !!nx && !s.nextLocked && siteGoTo(nx); }, again: () => { if (sim) stopSim('resultatknapp'); }, back: () => { if (sim) stopSim('resultatknapp'); close('tilbake'); } });
  // R111: låste steder (rutenett-skallet, men stedet er låst): samme skall med kort og GÅ TIL i stedet for den gamle skjermen (buildlock_view.js, buildlock_logic.js)
  function blkState() {
    if (!active) return null;
    const stL = stageLockedFor(active), plL = playLockedFor(active);
    if (!lockShown({ on: getBuildUx(), wanted: bux.wanted(), gridOn: grid.on(), stageLocked: stL, playLocked: plL })) return null;
    const list = bnList(), series = seriesOf(list, active.id), prev = series && series.idx > 0 ? list[series.idx - 1] : null, nx = series && series.next;
    const cur = { id: active.id, name: bnName(active), n: lab ? labInfo().n : series ? series.n : 0, of: lab ? labSites.length : series ? series.of : 0 };
    const p = stL ? stagePrev(sites, active.id) : null;
    const miss = stL && p ? { id: p.id, name: bnName(p), n: p.lab?.n || 0, of: labSites.length } : { name: T('blk.firstName'), level: PLAY.firstLevel };
    return { siteId: active.id, kind: stL && p ? 'stage' : 'play', cur, miss, series, prevName: prev ? bnName(prev) : '', nextName: nx ? bnName(nx) : '' };
  }
  const blk = createBuildLock({ root, T, logEv, toast, state: blkState, back: () => close('tilbake'), menu: () => act.menu(), prev: () => { const s = blkState(), l = bnList(), i = s && s.series ? s.series.idx : -1; if (i > 0) siteGoTo(l[i - 1]); },
    go: (c) => { if (c.go.kind === 'level') { onGoLevel(c.go.id); return true; } const t = sites.find((q) => q.id === c.go.id); return !!t && siteGoTo(t); },
    onUnlock: () => { if (active) { buxEnter(); labels(); trayRender(); onChange?.(); } } });   // låsen forsvinner uten omstart: det vanlige skallet tilbake, bygget beholdt
  function buxEnter() {   // R92: stedet får den forenklede skjermen: rutenett er eneste modus der (huskt MODUS-valg og MODUS-hintet røres ikke)
    if (!active || !bux.wanted() || grid.on() || !grid.enabledHere() || stageLockedFor(active) || playLockedFor(active)) { bux.layout(); return false; }
    const m0 = gstore.get(KEY_MODE, 'classic'), t0 = gstore.get(KEY_TIP, 0), ok = grid.toggleMode('buildux'); gstore.set(KEY_MODE, m0); gstore.set(KEY_TIP, t0);
    if (ok) view = fitNow(); labels(); bux.layout(); return ok;
  }
  // R118: BYGG-knappen sier hvilket sted det gjelder, og raden under viser FRA, TIL og spennet (gap og høydeforskjell)
  function setEnter(s) {
    const base = TOUCH ? T('build.enter') : T('build.enterKey'), on = getSpan().on && s, key = s ? `${s.id}|${base}|${on}` : '';
    if (enterBtn.dataset.k === key) return; enterBtn.dataset.k = key; enterBtn.dataset.l = T('build.enter');
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    if (on) { enterBtn.innerHTML = `${esc(base)}<small>${esc(s.label || '')}</small>`; enterBtn.setAttribute?.('aria-label', `${base} · ${s.label || ''}`); } else enterBtn.textContent = base;
    if (on) { spanRow.innerHTML = `<b class="f">${esc(T('span.from'))} ◀</b> … <b class="t">▶ ${esc(T('span.to'))}</b><span>${esc(spanLine(spanOf(s), T))}</span>`; spanRow.dataset.site = s.id; } else spanRow.dataset.site = '';
  }
  function labels() {
    btn('menu').textContent = T('build.menu'); btn('menu').setAttribute?.('aria-label', menuLabel()); btn('back').textContent = T('build.back'); btn('undo').textContent = T('build.undo'); btn('reset').textContent = T('build.reset'); btn('try').textContent = T('build.try');
    btn('snap').textContent = T(getSnap() ? 'build.snapOn' : 'build.snapOff'); btn('snap').classList.toggle('on', getSnap()); btn('del').textContent = T('build.del');
    for (const k of LINK_KINDS) { const b = root.querySelector(`[data-t="${k}"]`); b.textContent = T('build.tool.' + k); b.classList.toggle('on', tool === k); }
    if (sim) btn('try').textContent = T('build.stop');
    for (const k of ['replay', 'copy', 'paste', 'best']) sBtn(k).textContent = T('build.share.' + k); modal.querySelector('[data-m="use"]').textContent = T('build.share.use'); modal.querySelector('[data-m="close"]').textContent = T('build.share.close'); shareSync();
    enterBtn.dataset.k = ''; setEnter(near); labUI(); grid.sync();
  }
  // R118: samme FRA/TIL-språk inne i byggeskjermen: grønn etikett FRA ved start-ankeret, gul TIL ved målet (over underlaget, under delene)
  function drawSpanTags(S, sx) {
    const sp = spanOf(S), tag = (w, col, txt) => {
      const p = sx(w.u, w.v); g2.font = '800 12px system-ui'; const tw = g2.measureText(txt).width + 14, x = p.x - tw / 2, y = p.y - 62;
      g2.fillStyle = 'rgba(12,18,32,.85)'; g2.strokeStyle = col; g2.lineWidth = 2; g2.beginPath(); (g2.roundRect ? g2.roundRect(x, y, tw, 20, 6) : g2.rect(x, y, tw, 20)); g2.fill(); g2.stroke();
      g2.fillStyle = col; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(txt, p.x, y + 10.5); g2.textAlign = 'start'; g2.textBaseline = 'alphabetic';
      g2.strokeStyle = col; g2.lineWidth = 1.5; g2.setLineDash([3, 3]); g2.beginPath(); g2.moveTo(p.x, y + 20); g2.lineTo(p.x, p.y - 8); g2.stroke(); g2.setLineDash([]);
    };
    tag(sp.from, SPAN.colFrom, T('span.from')); tag(sp.to, SPAN.colTo, T('span.to'));
  }
  function size() { W = innerWidth; H = innerHeight; const d = dpr(); if (cv.width !== Math.round(W * d)) { cv.width = Math.round(W * d); cv.height = Math.round(H * d); } }

  function loadsRender() {   // R48: store knapper for testlast (ingen tastatur): ikon og kort navn, hake når lasten har klart dette bygget
    loadsEl.innerHTML = ''; root.classList.toggle('hasloads', !!active && loadList().length > 1); if (!active) return; const list = loadList(); if (list.length < 2) return; const cur = curLoad(), done = passedOf(active);
    for (const id of list) { const b = document.createElement('button'); b.dataset.l = id; b.className = id === cur ? 'on' : ''; b.textContent = `${LOADS[id].icon} ${T('build.load.' + id)}${done.includes(id) ? ' ✓' : ''}`; b.setAttribute?.('aria-pressed', id === cur ? 'true' : 'false'); loadsEl.appendChild(b); }
  }
  function trayRender() {
    loadsRender();
    const B = active && getB(active); tray.innerHTML = '';
    if (!B) return;
    const have = B.have;
    if (!have.length) { const e = document.createElement('div'); e.textContent = T('build.noParts'); e.style.cssText = 'color:#ffd9a0;font-size:13px;padding:0 8px;text-align:center'; tray.appendChild(e); return; }
    if (lab) labFill(B, types, labOpts());   // R67: Bygglab: alltid ubrukte deler av alle typer; én brikke per type, med ∞ (eller antall igjen)
    const items = lab ? labTrayItems(B) : have.map((id) => ({ id, type: B.types[id], used: B.placed.some((p) => p.id === id) }));
    for (const it of items) {
      const id = it.id, t = partType(it.type), used = !!it.used;
      const c = document.createElement('div'); c.className = 'chip' + (used ? ' used' : '') + (BONUS.some((b) => b.id === id) ? ' bonus' : ''); c.dataset.id = id; c.title = T('build.p.' + it.type);
      if (it.lab) { const bd = document.createElement('b'); bd.textContent = labOpts().unlimited ? '∞' : String(it.free); bd.style.cssText = 'position:absolute;right:3px;top:1px;font:800 11px system-ui;color:#ffe9a8;pointer-events:none'; c.appendChild(bd); }
      const i = document.createElement('i'); const k = cbx.on() ? 9 : 6; i.style.cssText = `width:${Math.min(66, t.w * k)}px;height:${Math.min(cbx.on() ? 38 : 99, Math.max(t.icon ? 22 : 8, t.h * k))}px;background:${t.color}`; if (t.icon) { i.textContent = t.icon; i.style.cssText += ';display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;overflow:hidden'; } c.appendChild(i);
      c.addEventListener('pointerdown', (e) => { if (!used) startDrag(e, id, true); else { toast(T('build.usedHint')); } });
      tray.appendChild(c);
    }
    if (items.length && !sim && getGridHint() && !st0.get(TAP.hintKey, 0)) { st0.set(TAP.hintKey, 1); toast(T('tray.tap')); logEv('bygg', 'hjelp: trykk eller dra en del i delebrettet'); }   // R110: én gang, bort på Ekspert
  }

  // ---- R44: zoom ----
  const fitNow = () => {   // R72: i rutenett-modus vises punktene minst 44 px fra hverandre (om stedet er bredt nok), midtstilt rundt dekket
    const sd = cbx.on() ? cbx.insets() : bux.on() ? bux.insets() : { l: 0, r: 0 };   // R93: sidepanelene i liggende format tar plass til siden (R96: også i klassisk skall)
    const v = fitView(active, W - sd.l - sd.r, H, 24, TOPPX(), BOTPX()); if (!grid.on()) return cbx.on() ? { ...v, cu: -(sd.l - sd.r) / (2 * v.scale) } : v;
    const sc = clampScale(Math.max(v.scale, GRID_PX / gridStep(active))), free = (H - TOPPX() - BOTPX()) / sc;
    return { ...v, scale: sc, cu: -(sd.l - sd.r) / (2 * sc), cv: Math.min(active.h / 2, Math.max(0.5, free / 2 - 1.2)), oy: (TOPPX() - BOTPX()) / 2 };
  };
  const curGrid = () => gridForScale(view.scale, getFine());
  const syncSnap = (B) => { B.grid = curGrid(); B.snapR = anchorRadius(view.scale); B.lego = getLego(); };   // plassering er alltid et tall i enheter: samme verdi uansett zoom, bare rutenettets trinn følger zoomen
  const zoomTarget = () => { const B = getB(active), id = drag?.id || sel, p = id && (drag && drag.id === id ? drag.part : B.placed.find((z) => z.id === id)); return p ? { u: p.u, v: p.v } : null; };
  function setView(nv, why, x, y) {
    const old = view.scale; view = nv;
    if (drag) { const r = toWorld(view, W, H, drag.x, drag.y); drag.part.u = r.u + drag.ox; drag.part.v = r.v + drag.oy; }   // del i hånden følger fingeren mens det zoomes
    const f = zoomLabel(view, fitNow()), g = curGrid(); zoomMsg = T('build.zoomInfo', { z: f, g: String(g).replace('.', ',') }); zoomMsgT = tNow + 1.8;
    if (Math.abs(view.scale - old) > 1e-6) logEv('bygg', `zoom ${why} ${f}, rutenett ${g}`);
  }
  const zoomAct = {
    in: () => setView(zoomStep(view, W, H, +1, zoomTarget()), '+'),
    out: () => setView(zoomStep(view, W, H, -1, zoomTarget()), '−'),
    fit: () => setView(fitNow(), 'tilpass'),
  };
  const zoomEl = root.querySelector('.zoom');
  zoomEl.addEventListener('pointerdown', (e) => {   // pointerdown (ikke click): virker også mens en annen finger holder en del
    const z = e.target.closest?.('button')?.dataset.z; if (!z || !active || sim) return; e.preventDefault(); e.stopPropagation(); zoomAct[z](); buzz?.(5);
  });

  // ---- tegning ----
  function draw() { drawBoard(); loupeStep(); }   // R106: glasset kopierer det ferdige bildet, så det tegnes sist
  function drawBoard() {
    if (!active) return; size(); const d = dpr(), B = getB(active), S = active; bux.frame(); cbx.frame(); bn.frame(); blk.frame(); trh.frame();
    g2.setTransform(d, 0, 0, d, 0, 0); g2.clearRect(0, 0, W, H);
    const sx = (u, v) => toScreen(view, W, H, u, v);
    // rutenett
    g2.lineWidth = 1; g2.strokeStyle = 'rgba(255,255,255,.07)';
    const a = sx(-S.w / 2, S.h), b = sx(S.w / 2, 0);
    for (let u = -S.w / 2; u <= S.w / 2 + 1e-6; u += 1) { const p = sx(u, 0), q = sx(u, S.h); g2.beginPath(); g2.moveTo(p.x, p.y); g2.lineTo(q.x, q.y); g2.stroke(); }
    for (let v = 0; v <= S.h + 1e-6; v += 1) { const p = sx(-S.w / 2, v), q = sx(S.w / 2, v); g2.beginPath(); g2.moveTo(p.x, p.y); g2.lineTo(q.x, q.y); g2.stroke(); }
    const gs = curGrid();
    if (gs < 0.5 && getSnap()) {   // R44: finere rutenett ved høy zoom (én sti, ett strøk)
      g2.strokeStyle = 'rgba(255,255,255,.05)'; g2.beginPath();
      const u0 = Math.max(-S.w / 2, toWorld(view, W, H, 0, 0).u), u1 = Math.min(S.w / 2, toWorld(view, W, H, W, 0).u), vT = Math.min(S.h, toWorld(view, W, H, 0, 0).v), vB = Math.max(0, toWorld(view, W, H, 0, H).v);
      for (let u = Math.ceil(u0 / gs) * gs; u <= u1 + 1e-6; u += gs) { const p = sx(u, 0), q = sx(u, S.h); g2.moveTo(p.x, p.y); g2.lineTo(q.x, q.y); }
      for (let v = Math.ceil(vB / gs) * gs; v <= vT + 1e-6; v += gs) { const p = sx(-S.w / 2, v), q = sx(S.w / 2, v); g2.moveTo(p.x, p.y); g2.lineTo(q.x, q.y); }
      g2.stroke();
    }
    g2.strokeStyle = '#ffd23f'; g2.lineWidth = 2; g2.setLineDash([8, 6]); g2.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); g2.setLineDash([]);
    // underlaget: stedets to sider (hyller/kanter) som klosser under v = 0
    g2.fillStyle = '#6b5d4a';
    for (const bx of siteBoxes(S)) { const p = sx(bx.x0, bx.y1), q = sx(bx.x1, bx.y0); g2.fillRect(Math.min(p.x, q.x), Math.min(p.y, q.y), Math.abs(q.x - p.x), Math.abs(q.y - p.y)); }
    const gl = siteGoal(S), gp = sx(gl.u, gl.v); g2.fillStyle = '#ffd23f'; g2.fillRect(gp.x - 1.5, gp.y - 38, 3, 38); g2.beginPath(); g2.moveTo(gp.x + 1.5, gp.y - 38); g2.lineTo(gp.x + 22, gp.y - 31); g2.lineTo(gp.x + 1.5, gp.y - 24); g2.fill();   // målflagg
    // festepunkter
    for (const an of (isGrid(B) ? gridAnchors(S) : siteAnchors(S))) { const p = sx(an.u, an.v); g2.beginPath(); g2.arc(p.x, p.y, 7, 0, 7); g2.fillStyle = '#3df0b0'; g2.fill(); g2.strokeStyle = '#0b1020'; g2.lineWidth = 2; g2.stroke(); }
    if (getSpan().on) drawSpanTags(S, sx);
    if (sim) { drawSim(S, sx); drawBudget(B); cbx.draw(sx, tNow, g2); return; }
    if (grid.on()) {   // R72: rutenett-modus: prikker, knuter og staver i stedet for deler fra brettet
      grid.draw(sx, tNow, g2); if (bux.on()) bux.draw(sx, tNow, g2); else drawBudget(B); trh.draw(sx, tNow, g2);
      setHint((zoomMsg && tNow < zoomMsgT ? zoomMsg : '') || (bux.on() ? bux.hint() : grid.hint()));
      setDis(btn('del'), !(grid.selNode || grid.selRod)); setDis(btn('undo'), !B.history.length); setDis(btn('reset'), !gridStats(B).rods); return;
    }
    // deler
    const all = B.placed.filter((p) => !(drag && drag.id === p.id)).concat(drag && drag.part ? [drag.part] : []);
    const linkOk = linkFrom && tool ? new Set(linkTargets(B, tool, linkFrom).parts) : null;   // R113
    for (const p of all) {
      const t = partType(p.type), pts = corners(p).map((c) => sx(c.u, c.v));
      g2.beginPath(); pts.forEach((q, i) => (i ? g2.lineTo(q.x, q.y) : g2.moveTo(q.x, q.y))); g2.closePath();
      g2.globalAlpha = p === (drag && drag.part) ? 0.8 : 1; g2.fillStyle = t.color; g2.fill(); g2.lineWidth = sel === p.id || linkFrom === p.id ? 4 : 2; g2.strokeStyle = sel === p.id || linkFrom === p.id ? '#fff' : '#2a1d10'; g2.stroke(); g2.globalAlpha = 1;
      drawToyDetail(g2, p, sx, view.scale);
      if (t.pivot) drawPivot(p, sx);
      if (p.anchored) { const c = sx(p.u, p.v); g2.beginPath(); g2.arc(c.x, c.y, 4, 0, 7); g2.fillStyle = '#3df0b0'; g2.fill(); }
      if (linkOk && linkOk.has(p.id)) { g2.save(); g2.beginPath(); pts.forEach((q, i) => (i ? g2.lineTo(q.x, q.y) : g2.moveTo(q.x, q.y))); g2.closePath(); g2.globalAlpha = 0.55 + 0.4 * Math.sin(tNow * 6); g2.lineWidth = 5; g2.strokeStyle = '#3df0b0'; g2.setLineDash([9, 6]); g2.stroke(); g2.restore(); }   // R113: delene første del kan festes til
    }
    if (bounce) { const q = (tNow - bounce.t) / TAP.bounceSecs, p0 = B.placed.find((z) => z.id === bounce.id); if (q >= 1 || q < 0 || !p0) bounce = null; else { const c = sx(p0.u, p0.v); g2.beginPath(); g2.arc(c.x, c.y, 16 + 36 * q, 0, 7); g2.strokeStyle = `rgba(255,233,168,${(1 - q).toFixed(2)})`; g2.lineWidth = 4; g2.stroke(); } }   // R110: sprett etter trykk-ut
    drawLinks(B, sx);
    if (!drag) drawHelp(helpOf(B), sx);
    cbx.draw(sx, tNow, g2);   // R96: første del markert, spøkelseslinje, hånd-hjelp, verktøylinje ved valgt del
    // snapforhåndsvisning
    if (drag && drag.part && getSnap()) { const s = snapPoint(S, drag.part.u, drag.part.v, { snap: true, grid: curGrid(), snapR: anchorRadius(view.scale) }), p = sx(s.u, s.v); g2.beginPath(); g2.arc(p.x, p.y, s.anchored ? 12 : 4, 0, 7); g2.strokeStyle = s.anchored ? '#3df0b0' : '#ffffff99'; g2.lineWidth = 2; g2.stroke(); }
    // dra-til-brettet-sone
    if (drag && drag.part) { const r = tray.getBoundingClientRect(); if (drag.y > r.top) { g2.fillStyle = 'rgba(255,80,80,.18)'; g2.fillRect(0, r.top, W, r.height); } }
    drawBudget(B);
    const left = inTray(B).length;
    setHint((zoomMsg && tNow < zoomMsgT ? zoomMsg : '') || hint || cbx.hint() || (cbx.on() ? '' : grid.modeTip()) || (requiredLoads(lsite()).length && B.placed.length ? T('build.loadNeed', { list: requiredLoads(lsite()).filter((i) => !passedOf(active).includes(i)).map((i) => T('build.load.' + i)).join(', ') || T('build.loadAllDone') }) : '') || (linkFrom ? T(tool && linkTargets(B, tool, linkFrom).parts.length ? 'build.hint.link2' : 'build.hint.link2none') : tool ? T('build.hint.link1') : cbx.on() && sel ? T('cbx.sel') : cbx.on() && selLink ? T('cbx.selLink') : lab ? labLine() : B.placed.length ? T(cbx.on() ? 'cbx.hintPlaced' : 'build.hintPlaced') : left ? T(cbx.on() ? 'cbx.hintEmpty' : 'build.hintEmpty') : B.have.length ? T('build.allUsed') : ''));
    setDis(btn('del'), !sel && !selLink); setDis(btn('rotl'), !sel); setDis(btn('rotr'), !sel); setDis(btn('undo'), !B.history.length); setDis(btn('reset'), !B.placed.length);
  }


  // ---- R106: hjørneglass: hva fingeren gjør akkurat nå (info) og hvor glasset kan stå (layout). Gjenbrukte objekter: ingen allokering per bilde ----
  const LI = { placing: false, fingers: 0, x: 0, y: 0, tx: null, ty: null, ok: true, text: '', kind: '' }, LT = { x: 0, y: 0, tu: null, tv: null, ok: true, text: '', kind: '' };
  const LAY = { W: 0, H: 0, top: 0, bottom: 0, insetL: 0, insetR: 0, sim: false, avoid: [{ x: 0, y: 0, w: 0, h: 0 }] }, LAV = LAY.avoid;
  function loupeStep() {
    if (!active) { loupe.reset(); return; }
    LAY.sim = !!sim; if (sim || !getLoupe()) { LI.placing = false; loupe.frame(LI, LAY); return; }
    const fingers = ptrs.size + (drag && !ptrs.has(drag.pid) ? 1 : 0); let ok = false; LI.tx = LI.ty = null; LI.ok = true; LI.text = '';
    if (fingers === 1) {
      if (drag && drag.part) {   // klassisk: drar en del (fra delebrettet eller en plassert)
        const tr = tray.getBoundingClientRect();
        if (!(drag.y > tr.top - root.getBoundingClientRect().top)) {
          ok = true; LI.x = drag.x; LI.y = drag.y; LI.kind = 'del';
          let s = null; if (getSnap()) { s = snapPoint(active, drag.part.u, drag.part.v, { snap: true, grid: curGrid(), snapR: anchorRadius(view.scale) }); const q = toScreen(view, W, H, s.u, s.v); LI.tx = q.x; LI.ty = q.y; }
          LI.text = partLine(T, s, s ? s.u : drag.part.u, s ? s.v : drag.part.v);
        }
      } else if (grid.on()) {
        let got = false;
        if (bux.on() && bux.touchInto(LT)) got = true; else if (grid.touchInto(LT)) got = true;
        else if (gest && gest.kind === 'pan' && !gest.moved && ptrs.size === 1 && holdReached(gest.tn, performance.now()) && grid.holdInto(LT, gest.x, gest.y)) got = true;
        if (got) { ok = true; LI.x = LT.x; LI.y = LT.y; LI.kind = LT.kind; LI.ok = LT.ok; LI.text = LT.text; if (LT.tu != null) { const q = toScreen(view, W, H, LT.tu, LT.tv); LI.tx = q.x; LI.ty = q.y; } }
      }
    }
    LI.fingers = ok ? 1 : fingers; LI.placing = ok;
    if (!ok && !loupe.visible) return;
    const sd = cbx.on() ? cbx.insets() : bux.on() ? bux.insets() : null;
    LAY.W = W; LAY.H = H; LAY.top = TOPPX(); LAY.bottom = H - BOTPX(); LAY.insetL = sd ? sd.l : 0; LAY.insetR = sd ? sd.r : 0;
    const gl = siteGoal(active), gp = toScreen(view, W, H, gl.u, gl.v), fg = LAV[0]; fg.x = gp.x - 8; fg.y = gp.y - 42; fg.w = 34; fg.h = 46;   // målflagget
    if (!loupe.visible) {   // knappene (og ⚑) som glasset ikke skal dekke: leses én gang når glasset skal vises (zoomknapper, delingsrad, lastknapper i gamle skjermen)
      let n = 1; const q = (e) => { if (!e || !e.offsetWidth) return; const r = e.getBoundingClientRect(); const o = LAV[n] || (LAV[n] = { x: 0, y: 0, w: 0, h: 0 }); o.x = r.left; o.y = r.top; o.w = r.width; o.h = r.height; n++; };
      for (const e of root.querySelectorAll('button')) q(e); q(document.getElementById('qbtn')); LAV.length = n;
    }
    loupe.frame(LI, LAY);
  }

  // R47: kostnad og stjerner (og smuler) nede til høyre over brettet. Vanlige canvas-kall, ingen nye tegnejobber utover én avrundet boks og noen tekstlinjer.
  // R49a1: «Tåler ca. N klosser» (build_capacity.js): regnes ut litt etter at du slipper en del (ikke mens du drar), og bufres per bygg
  let capKey = '', capRes = null, capTimer = 0; const capCache = new Map();
  const capStats = createCapStats();
  const capOn = () => capShown({ lab: !!lab, labCap: !!active?.lab?.cap, gridOn: grid.on(), setting: getCap(), bridge: !!active && buxSite({ levelId, site: active }) });   // R67: Bygglab: «Tåler X»-stedet viser alltid måleren. R110: ellers bare på bro-steder (ikke Trapp/Vippe m.fl.)
  function capUpdate(B) {
    if (!capOn() || !B.placed.length) { capRes = null; capKey = ''; return; }
    if (drag) { capKey = ''; return; }
    const key = `${active.id}|${sigOf(B)}|${JSON.stringify(B.links)}|${getStrength()}`; if (key === capKey) return; capKey = key;
    if (capCache.has(key)) { capRes = capCache.get(key); return; }
    capRes = null; clearTimeout(capTimer);   // R110: ny endring avbryter ventende beregning (debounce)
    capTimer = setTimeout(() => {
      if (capKey !== key || !active) return; const t0 = performance.now();
      const r = capacity({ site: active, placed: B.placed.map((p) => ({ id: p.id, type: p.type, u: p.u, v: p.v, rot: p.rot })), links: B.links }, { strength: getStrength() }); r.ms = Math.round(performance.now() - t0); capCache.set(key, r); capStats.add(r.ms);
      if (capKey === key) { capRes = r; logEv('bygg', `tåler ca. ${r.n}${r.capped ? '+' : ''} klosser midt på spennet (${r.ms} ms, ${r.sims} sim)`); }
    }, capWait({ shown: true }));
  }
  // R49a2: hjelp som viser ledd som kan svinge og slanke deler (build_truss.js). Algebra uten simulering, bufret per bygg.
  let helpKeyStr = '', helpRes = null;
  function helpOf(B) {
    if (!getTruss() || !active || grid.on()) return null;
    const key = `${active.id}|${sigOf(B)}|${JSON.stringify(B.links)}|${getStrength() * getAxial()}`; if (key === helpKeyStr) return helpRes;
    helpKeyStr = key; helpRes = B.placed.length ? trussHelp({ placed: B.placed.map((p) => ({ id: p.id, type: p.type, u: p.u, v: p.v, rot: p.rot })), links: B.links }, { strength: getStrength() * getAxial() }) : null;
    if (helpRes && (helpRes.joints.length || helpRes.slender.length)) logEv('bygg', `hjelp: ${helpRes.joints.length} ledd kan svinge, ${helpRes.slender.length} slanke deler${helpRes.suggest ? ', diagonal foreslått' : ''}`);
    return helpRes;
  }
  function drawHelp(h, sx, pulse, posOf) {
    if (!h) return;
    for (const j of h.joints) { const q = posOf ? posOf(j) : sx(j.u, j.v); if (!q) continue; g2.beginPath(); g2.arc(q.x, q.y, 13 + 2.5 * Math.sin(tNow * 5), 0, 7); g2.strokeStyle = '#ffa940'; g2.lineWidth = 3; g2.stroke(); }
    if (h.suggest && h.joints.length) { const a = sx(h.suggest.a.u, h.suggest.a.v), b = sx(h.suggest.b.u, h.suggest.b.v); g2.save(); g2.setLineDash([8, 6]); g2.lineDashOffset = -tNow * 14; g2.strokeStyle = '#ffd23f'; g2.lineWidth = 3; g2.beginPath(); g2.moveTo(a.x, a.y); g2.lineTo(b.x, b.y); g2.stroke(); g2.restore(); }
    for (const s of h.slender) { const q = sx(s.u, s.v); g2.font = '800 12px system-ui'; g2.textAlign = 'center'; const t = '⚠ ' + s.blocks; const w = g2.measureText(t).width + 10; g2.fillStyle = 'rgba(14,20,36,.85)'; g2.fillRect(q.x - w / 2, q.y - 22, w, 18); g2.fillStyle = '#ffa940'; g2.fillText(t, q.x, q.y - 9); g2.textAlign = 'start'; }
  }
  function drawBudget(B) {
    if (bux.on()) return;   // R92: budsjettlinjen ligger i DOM-skjermen
    capUpdate(B); const gstate = stageState(B); budgetBox = null;
    if (!gstate && !getBudget() && !getBonus() && !capOn() && !getTruss()) return;
    const lines = [];
    if (gstate) for (const l of stageLines(gstate, T)) lines.push({ ...l, wrap: true });   // R74: mål, budsjett og vurdering (erstatter vanlig stjernelinje)
    if (capOn() && B.placed.length) lines.push({ t: capRes ? (!capRes.n ? T('build.capNone') : capRes.capped ? T('build.capMax', { n: capRes.n }) : T('build.cap', { n: capRes.n })) : T('build.capWait'), c: '#9fe3ff', b: true });
    if (getBudget() && !gstate && !cbx.on()) {   // R96: i det nye skallet ligger stjerner og kostnad i DOM-plata
      const r = starsFor(active, B.placed, B.links), best = getBuildStars(st0, levelId)[active.id], on = B.placed.length > 0;
      lines.push({ t: `${on ? starText(r.stars) : '☆☆☆'}  ${T('build.cost', { n: r.cost })} · ${(r.parts === 1 ? T('build.partOne') : T('build.partsN', { n: r.parts }))}`, c: '#ffe9a8', b: true });
      lines.push({ t: !on ? '' : r.next ? T('build.nextStar', { n: r.next.cost, total: r.next.parts }) : T('build.threeStars'), c: '#ffd9a0' });
      if (best) lines.push({ t: T('build.record', { name: starText(best.stars) }), c: '#bde8cf' });
    }
    { const h = !sim && !drag ? helpOf(B) : null, k = h && helpKey(h); if (k) lines.push({ t: T(k, { n: h.slender[0]?.blocks ?? 0 }), c: '#ffa940', b: true }); }
    if (getBonus()) { const n = getCrumbs(), nb = nextBonus(n, getBonusStep()); lines.push({ t: nb ? T('build.crumbsNext', { n, total: bonusAt(nb, getBonusStep()) }) : T('build.crumbsAll', { n }), c: '#ffd23f' }); }
    const land = innerHeight <= 520, maxW = land ? 230 : Math.max(120, W - 214);   // til venstre, under teksten og ved siden av zoomknappene (ingen kollisjon med verktøy, brett eller flagg)
    g2.textAlign = 'left'; const ls = [];
    for (const l of lines) {   // R74: lange tekster (oppdraget) brytes i stedet for å presses sammen
      if (!l.t) continue; if (!l.wrap) { ls.push(l); continue; }
      g2.font = `${l.b ? 800 : 600} 12px system-ui`; let cur = ''; for (const wd of l.t.split(' ')) { const t = cur ? cur + ' ' + wd : wd; if (cur && g2.measureText(t).width > maxW) { ls.push({ ...l, t: cur }); cur = wd; } else cur = t; } if (cur) ls.push({ ...l, t: cur });
    }
    if (!ls.length) { budgetBox = null; return; } let w = 0; for (const l of ls) { g2.font = `${l.b ? 800 : 600} 12px system-ui`; w = Math.max(w, g2.measureText(l.t).width); }
    w = Math.min(w, maxW); const lh = 16, bh = ls.length * lh + 8, x0 = cbx.on() ? cbx.insets().l + 10 : 10, y0 = cbx.on() ? plateTop({ topPx: TOPPX() + 22, hintBottom: hintBottom() }) : TOPPX() - (land ? 14 : 14);   // R96: under hint-linjen
    budgetBox = { x: x0, y: y0, r: x0 + w + 14, b: y0 + bh };
    g2.fillStyle = 'rgba(14,20,36,.78)'; g2.beginPath(); g2.roundRect ? g2.roundRect(x0, y0, w + 14, bh, 9) : g2.rect(x0, y0, w + 14, bh); g2.fill();
    ls.forEach((l, i) => { g2.font = `${l.b ? 800 : 600} 12px system-ui`; g2.fillStyle = l.c; g2.fillText(l.t, x0 + 7, y0 + 8 + lh * i + 11, w); });
    g2.textAlign = 'start';
  }
  const LINK_COL = { tape: '#f3e36b', hinge: '#ffffff', rope: '#c79a5a', band: '#ff7a8a' };
  const ropey = (l) => l.kind === 'rope' || l.kind === 'band';      // tau og gummistrikk er «snorer»: kan gå over avstand
  function drawPivot(c, sx) {            // R30: støtta under dreiepunktet til en vippe (trekant) og selve dreiepunktet
    const q = sx(c.u, c.v), h = Math.max(14, view.scale * 1.6), w = Math.max(9, view.scale * 0.7);
    g2.beginPath(); g2.moveTo(q.x, q.y); g2.lineTo(q.x - w, q.y + h); g2.lineTo(q.x + w, q.y + h); g2.closePath(); g2.fillStyle = '#2d6f67'; g2.fill(); g2.lineWidth = 2; g2.strokeStyle = '#0d2f2b'; g2.stroke();
    g2.beginPath(); g2.arc(q.x, q.y, 5, 0, 7); g2.fillStyle = '#fff'; g2.fill(); g2.strokeStyle = '#0d2f2b'; g2.stroke();
  }
  function drawLinks(B, sx) {
    for (const l of B.links) {
      const e = linkEnds(B, l); if (!e) continue; const a = sx(e[0].u, e[0].v), b = sx(e[1].u, e[1].v), isSel = selLink === l.id;
      g2.lineCap = 'round'; g2.strokeStyle = isSel ? '#fff' : '#1a1208'; g2.lineWidth = (l.kind === 'tape' ? 9 : ropey(l) ? 6 : 3) + (isSel ? 4 : 2);
      if (l.kind !== 'hinge') { g2.beginPath(); g2.moveTo(a.x, a.y); if (ropey(l)) g2.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + 10, b.x, b.y); else g2.lineTo(b.x, b.y); g2.stroke(); }
      g2.strokeStyle = LINK_COL[l.kind]; g2.lineWidth = l.kind === 'tape' ? 6 : ropey(l) ? 3 : 2;
      if (l.kind === 'tape') g2.setLineDash([5, 4]);
      if (l.kind !== 'hinge') { g2.beginPath(); g2.moveTo(a.x, a.y); if (ropey(l)) g2.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + 10, b.x, b.y); else g2.lineTo(b.x, b.y); g2.stroke(); }
      g2.setLineDash([]);
      for (const q of l.kind === 'hinge' ? [a] : [a, b]) { g2.beginPath(); g2.arc(q.x, q.y, l.kind === 'hinge' ? 7 : 4, 0, 7); g2.fillStyle = l.kind === 'hinge' ? '#444' : LINK_COL[l.kind]; g2.fill(); g2.strokeStyle = l.kind === 'hinge' ? '#fff' : '#1a1208'; g2.lineWidth = 2; g2.stroke(); }
      if (!l.b && !ropey(l)) { g2.fillStyle = '#6b5d4a'; g2.fillRect(b.x - 8, b.y + 2, 16, 4); }
    }
  }
  const mixCol = (hex, k) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return `rgb(${Math.round(r + (230 - r) * k)},${Math.round(g * (1 - k * 0.8))},${Math.round(b * (1 - k * 0.8))})`; };
  function drawSim(S, sx) {
    const pose = sim.pose(), sc = view.scale, stressOn = getStress(), lm = loadMap(pose);
    const gOn = !!gPeaks && !replaying && getGridStress() && isGrid(getB(active)), gamma = getGridGamma(), gLive = gOn && !simDone && sim.axial ? loadsNow(sim.axial()) : null;   // R73: farge etter belastning i rutenett-modus (nå under prøven, toppen etter)
    const gR = (id) => (gOn ? (simDone ? gPeaks.peaks.get(id) : gLive?.get(id)) : null);
    if (ghostVisible({ ghostRec, replaying, simDone, sim, on: getGhost() })) drawGhost(g2, ghostPose(ghostRec, Math.round(sim.t / DT)), sx, sc);   // R50: forrige prøve som spøkelse
    for (const p of pose.parts) {
      const t = partType(p.type);
      if (t.pivot) { const m = p.pts[(p.pts.length - 1) / 2]; drawPivot({ u: m.u, v: m.v }, sx); }
      if (p.kind === 'chain') {
        for (const seg of p.segs) {
          if (!seg.length) continue; const pts = seg.map((q) => sx(q.u, q.v));
          const gx = gR(p.id), gk = gx ? gWidthK(gx.kind) : 1;   // R73: strekk tynnere, trykk tykkere
          for (const [w, col] of [[t.h * sc * gk + 4, '#2a1d10'], [t.h * sc * gk, gx ? gStressCss(gx.r, gamma) : stressOn ? tint(t.color, lm.parts.get(p.id), 0.8) : mixCol(t.color, Math.min(1, Math.max(0, (p.stress - 0.35) / 0.65)))]]) {
            g2.lineCap = 'round'; g2.lineJoin = 'round'; g2.lineWidth = w; g2.strokeStyle = col; g2.beginPath(); pts.forEach((q, i) => (i ? g2.lineTo(q.x, q.y) : g2.moveTo(q.x, q.y))); if (pts.length === 1) g2.lineTo(pts[0].x + 0.1, pts[0].y); g2.stroke();
          }
          if (gx && gDanger(gx.r, gamma)) { g2.save(); g2.setLineDash([6, 6]); g2.lineDashOffset = -tNow * 18; g2.strokeStyle = 'rgba(255,255,255,.9)'; g2.lineWidth = Math.max(2, t.h * sc * gk * 0.22); g2.beginPath(); pts.forEach((q, i) => (i ? g2.lineTo(q.x, q.y) : g2.moveTo(q.x, q.y))); g2.stroke(); g2.restore(); }   // varselstrek (også uten farger)
          drawToyChain(g2, p.type, pts, sc);
        }
      } else {
        const pts = corners(p).map((c) => sx(c.u, c.v)); g2.beginPath(); pts.forEach((q, i) => (i ? g2.lineTo(q.x, q.y) : g2.moveTo(q.x, q.y))); g2.closePath(); if (p.broken) g2.globalAlpha = 0.35; g2.fillStyle = stressOn ? tint(t.color, lm.parts.get(p.id), 0.8) : t.color; g2.fill(); g2.lineWidth = 2; g2.strokeStyle = '#2a1d10'; g2.stroke(); g2.globalAlpha = 1;   // R49a2: knust del vises svakt
        drawToyDetail(g2, p, sx, sc);
        if (p.type === 'weight') { const c = sx(p.u, p.v); g2.fillStyle = '#fff'; g2.font = `700 ${Math.max(9, sc * 0.5)}px system-ui`; g2.textAlign = 'center'; g2.fillText('kg', c.x, c.y + sc * 0.18); }
      }
    }
    for (const l of pose.links) {
      if (l.broken) continue; const a = sx(l.a.u, l.a.v), b = sx(l.b.u, l.b.v);
      g2.lineCap = 'round'; g2.strokeStyle = stressOn ? stressCss(lm.links.get(l.id)) : l.stress > 0.6 ? '#ff6a5a' : LINK_COL[l.kind]; g2.lineWidth = l.kind === 'tape' ? 5 : ropey(l) ? 3 : 2;
      if (l.kind === 'tape' && document.body.classList.contains('cinema')) {   // kinomodus (trailer): tapen tegnes tykkere med mørk kant så den synes
        const col = g2.strokeStyle; g2.beginPath(); g2.moveTo(a.x, a.y); g2.lineTo(b.x, b.y); g2.lineWidth = 13; g2.strokeStyle = '#2a1d10'; g2.stroke(); g2.lineWidth = 8; g2.strokeStyle = col; g2.stroke();
      } else
      if (l.kind !== 'hinge') { g2.beginPath(); g2.moveTo(a.x, a.y); g2.lineTo(b.x, b.y); g2.stroke(); }
      g2.beginPath(); g2.arc(a.x, a.y, l.kind === 'hinge' ? 6 : 3.5, 0, 7); g2.fillStyle = l.kind === 'hinge' ? '#444' : LINK_COL[l.kind]; g2.fill(); g2.strokeStyle = '#fff'; g2.lineWidth = 1.5; g2.stroke();
    }
    // testfiguren: en rund fyr som ser fremover
    drawLoad(g2, pose.figure, sx(pose.figure.u, pose.figure.v), sc);   // R48: testlasten (figur, ball, bil eller robot)
    // brudd: rødt kryss der noe røk
    for (const m of simMarks) { const q = sx(m.u, m.v), k = 9 + 3 * Math.sin(tNow * 8); g2.strokeStyle = '#ff3b30'; g2.lineWidth = 4; g2.lineCap = 'round'; g2.beginPath(); g2.moveTo(q.x - k, q.y - k); g2.lineTo(q.x + k, q.y + k); g2.moveTo(q.x + k, q.y - k); g2.lineTo(q.x - k, q.y + k); g2.stroke(); }
    for (const m of simMarks) { const ring = ringAt(tNow - m.t0); if (!ring) continue; const q = sx(m.u, m.v); g2.beginPath(); g2.arc(q.x, q.y, ring.r, 0, 7); g2.strokeStyle = `rgba(255,59,48,${ring.a.toFixed(2)})`; g2.lineWidth = 4; g2.stroke(); }   // R45: ring der det røk
    if (simWhy && simDone) { const q = sx(simWhy.u, simWhy.v), k = 20 + 3 * Math.sin(tNow * 6); g2.beginPath(); g2.arc(q.x, q.y, k, 0, 7); g2.strokeStyle = '#ffd23f'; g2.lineWidth = 3; g2.setLineDash([6, 5]); g2.stroke(); g2.setLineDash([]); }   // R45: gul ring rundt svakeste punkt
    if (stressOn || gOn) { const lx = 12, ly = H - BOTPX() - 22 + (isGrid(getB(active)) ? 30 : 0), lw = Math.min(150, W * 0.4), gr = g2.createLinearGradient(lx, 0, lx + lw, 0); if (gOn) for (const q of [0, 0.4, 0.68, 1]) gr.addColorStop(q, gColorCss(q)); else { gr.addColorStop(0, stressCss(0)); gr.addColorStop(0.5, stressCss(0.5)); gr.addColorStop(1, stressCss(1)); } g2.fillStyle = gr; g2.fillRect(lx, ly, lw, 7); g2.strokeStyle = '#2a1d10'; g2.lineWidth = 1; g2.strokeRect(lx, ly, lw, 7); g2.fillStyle = '#fff'; g2.font = '600 10px system-ui'; g2.textAlign = 'left'; g2.fillText(T('build.legend'), lx, ly - 3); g2.textAlign = 'right'; g2.fillText(T('build.legend2'), lx + lw, ly - 3); g2.textAlign = 'left'; }   // R45: forklaring på fargene
    if (simDone && sim.state.state === 'lost' && getTruss() && simHelp) {      // R49a2: etter en feilet prøve: ledd som kan svinge (ringer ved leddene slik de ligger nå) og deler nær knekking
      const at = new Map(pose.links.map((l) => [l.id, l.a])); drawHelp({ joints: simHelp.joints, suggest: null, slender: [] }, sx, true, (j) => { const a = at.get(j.id); return a ? sx(a.u, a.v) : null; });
      for (const a of sim.axial()) { const r = a.nc / Math.min(a.pcr, a.ccap); if (a.broken || r < 0.6) continue; const part = pose.parts.find((p) => p.id === a.id); if (!part) continue; const m = part.pts[part.pts.length >> 1], q = sx(m.u, m.v); g2.font = '800 12px system-ui'; g2.textAlign = 'center'; g2.fillStyle = '#ffa940'; g2.fillText('⚠ ' + Math.round(r * 100) + '%', q.x, q.y - 12); g2.textAlign = 'start'; }
    }
    if (gSum && simDone && getGridPeak()) {   // R73: «største belastning»: staven som brakk først, ellers den som var nærmest brudd
      const hl = gSum.first || gSum.top, pr = hl && pose.parts.find((p) => p.id === hl.id);
      if (pr) { const m = pr.pts[pr.pts.length >> 1], q = sx(m.u, m.v), txt = peakLine(); g2.font = '800 12px system-ui'; const w = Math.min(W - 16, g2.measureText(txt).width + 14), x0 = Math.max(8, Math.min(W - 8 - w, q.x - w / 2)), y0 = Math.max(TOPPX(), q.y - 46); g2.fillStyle = 'rgba(14,20,36,.9)'; g2.beginPath(); g2.roundRect ? g2.roundRect(x0, y0, w, 22, 8) : g2.rect(x0, y0, w, 22); g2.fill(); g2.strokeStyle = gSum.first ? '#ff6a5a' : '#ffd23f'; g2.lineWidth = 2; g2.stroke(); g2.fillStyle = '#ffe9a8'; g2.textAlign = 'center'; g2.fillText(txt, x0 + w / 2, y0 + 15, w - 8); g2.textAlign = 'start'; g2.beginPath(); g2.arc(q.x, q.y, 16, 0, 7); g2.strokeStyle = gSum.first ? '#ff6a5a' : '#ffd23f'; g2.lineWidth = 3; g2.stroke(); }
    }
    for (const q of confetti) { const p = sx(q.u, q.v); g2.fillStyle = q.c; g2.fillRect(p.x, p.y, 5, 8); }
    const st = sim.state;
    setHint(simText() + (gSum && simDone && getGridPeak() ? ' ' + peakLine() : ''));
    btn('try').textContent = T('build.stop'); btn('del').disabled = true; btn('rotl').disabled = btn('rotr').disabled = true; btn('undo').disabled = btn('reset').disabled = true;
  }

  // ---- dra og trykk ----
  const loc = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  let bounce = null;
  function trayTap(B, id) {   // R110: trykk på brikke i delebrettet: legg delen ut på et fornuftig sted, velg den og gi et lite sprett
    const type = B.types[id], tp = trayPlace({ B, id, type, view }), p = place(B, id, tp.u, tp.v, tp.rot);
    if (!p) { logEv('bygg', 'trykk på del uten effekt: delen kunne ikke legges ut'); return; }
    sel = id; selLink = null; linkFrom = null; bounce = { id, t: tNow };
    logEv('bygg', `trykk på del i delebrettet legger ut ${id} (${type}) ${tp.why}${tp.why === 'full' ? ' (brettet er fullt)' : ''}`); cbx.act(`plasser ${type}`); buzz?.(10); audio?.bplace?.(type); onChange?.();
  }
  function startDrag(e, id, fromTray) {
    e.preventDefault(); e.stopPropagation(); const B = getB(active); const { x, y } = loc(e);
    const w = toWorld(view, W, H, x, y), ex = B.placed.find((p) => p.id === id);
    drag = { id, fromTray, pid: e.pointerId, x, y, x0: x, y0: y, hits: hitsAt(B, w.u, w.v, pickPad(view.scale)), wasSel: sel, part: { id, type: B.types[id], u: w.u, v: w.v, rot: ex?.rot || 0 }, ox: ex ? ex.u - w.u : 0, oy: ex ? ex.v - w.v : 0 };
    sel = id; if (ex) { raise(B, id); }
    capture(e);   // R109: capture på lerretet (ikke på roten), og bare mens fingeren er nede
  }
  const onCanvasDown = (e) => {
    if (!active) return; e.preventDefault(); const { x, y } = loc(e), B = getB(active); ptrs.set(e.pointerId, { x, y }); cbx.point(x, y); cbx.touch();   // R96
    if (ptrs.size === 2) { drag = drag && drag.fromTray ? drag : null; grid.cancel(); bux.cancel(); startGesture(); return; }
    const w = toWorld(view, W, H, x, y), hit = topHit(B, w.u, w.v, pickPad(view.scale));
    if (sim) { ptrs.delete(e.pointerId); if (hit) logEv('bygg', tapAction({ sim: true }).log); return; }
    if (trh.tapAt(x, y)) { ptrs.delete(e.pointerId); return; }   // R122: trykk på et trekantforslag eller en «gir etter»-prikk
    if (bux.on()) { bux.down(e, x, y); return; }   // R92
    if (grid.on()) { grid.down(e, x, y); return; }   // R72: rutenett-modus tolker trykket selv (knute, stav, flytt eller panorering)
    const cur = { t: e.timeStamp || performance.now(), x, y };
    if (getDbl() && !tool && !drag && !hit && isDoubleTap(lastTap, cur)) { lastTap = null; ptrs.delete(e.pointerId); setView(dblTapView(view, fitNow(), W, H, x, y), 'dobbelttrykk'); return; }   // R44
    if (tool && hit) { const before = hit.rot; startDrag(e, hit.id, false); drag.before = { u: hit.u, v: hit.v, rot: before }; drag.x0 = x; drag.y0 = y; drag.tapLink = w; ptrs.delete(e.pointerId); return; }   // R70: med et verktøy valgt kan en del fortsatt dras; bare et trykk (uten å dra) kobler
    if (tool) { ptrs.delete(e.pointerId); linkTap(B, hit, w); return; }
    const lk = !hit && topLink(B, w.u, w.v);
    if (lk) { selLink = lk.id; sel = null; ptrs.delete(e.pointerId); return; }
    selLink = null;
    if (hit) { const before = hit.rot; startDrag(e, hit.id, false); drag.before = { u: hit.u, v: hit.v, rot: before }; }
    else { sel = null; gest = { kind: 'pan', x, y, cu: view.cu, cv: view.cv, t: cur.t, moved: false }; capture(e); }
  };
  cv.addEventListener('pointerdown', onCanvasDown);
  // R70: delene ligger ofte rett ved bakken, der knapperaden (TAPE/LEDD/last/del) ligger like under: nettleserens berøringsjustering flytter da trykket over på knappen, og delen lar seg ikke gripe.
  // Treffer fingeren en del, men ikke selve knappen, går trykket til delen, og klikket som følger svelges.
  let swallowClick = 0;
  root.addEventListener('pointerdown', (e) => {
    if (!active || sim) return; const bt = e.target.closest?.('.tools button,.share button,.loads button'); if (!bt) return;
    const r = bt.getBoundingClientRect(); if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return;
    const { x, y } = loc(e), w = toWorld(view, W, H, x, y); if (!topHit(getB(active), w.u, w.v, 0.1)) return;
    swallowClick = performance.now(); logEv('bygg', 'grep del bak knapp'); e.stopPropagation(); onCanvasDown(e);
  }, true);
  root.addEventListener('click', (e) => { if (swallowClick && performance.now() - swallowClick < 900 && e.target.closest?.('.tools button,.share button,.loads button')) { swallowClick = 0; e.stopPropagation(); e.preventDefault(); } }, true);
  function linkTap(B, hit, w) {
    const ta = tapAction({ tool, linkFrom, hits: hit ? [hit.id] : [] }); if (ta.log) logEv('bygg', ta.log);   // R110: alltid logg/tilbakemelding
    if (ta.kind === 'none') return;
    if (ta.kind === 'linkFirst') { linkFrom = hit.id; sel = null; selLink = null; buzz?.(6); return; }
    if (ta.kind === 'select') { linkFrom = null; sel = ta.id; selLink = null; buzz?.(6); return; }   // R110: trykk på første del igjen velger den heller enn å avbryte uten å si noe
    const r = addLink(B, tool, linkFrom, hit ? hit.id : null, { u: w.u, v: w.v });
    if (r.ok) { logEv('bygg', `${tool} ${linkFrom} ${hit ? hit.id : 'underlag'}`); audio?.battach?.(tool); buzz?.(10); selLink = r.link.id; cbx.linked(tool, linkFrom, hit ? hit.id : null); onChange?.(); }
    else toast(T(r.why === 'dup' ? 'build.link.dup' : 'build.link.far'));
    linkFrom = null;
  }
  function startGesture() {
    const [p, q] = [...ptrs.values()], B = getB(active);
    gest = { kind: 'two', d: Math.hypot(q.x - p.x, q.y - p.y) || 1, a: Math.atan2(q.y - p.y, q.x - p.x), sc: view.scale, mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2, cu: view.cu, cv: view.cv, rot: sel ? B.placed.find((z) => z.id === sel)?.rot : null, twisted: false };
    if (gest.rot != null) { /* vri: hent historikk bare én gang når vrien faktisk starter */ }
  }
  addEventListener('pointermove', (e) => {
    if (!active) return;
    if (cbx.on()) { const r0 = loc(e); cbx.point(r0.x, r0.y); }   // R96: spøkelseslinjen følger fingeren
    if (ptrs.has(e.pointerId)) { const r = loc(e); ptrs.set(e.pointerId, r); }
    if (ptrs.size >= 2 && gest?.kind === 'two') {
      const [p, q] = [...ptrs.values()], B = getB(active), d = Math.hypot(q.x - p.x, q.y - p.y) || 1, a = Math.atan2(q.y - p.y, q.x - p.x);
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;   // R44: klyp zoomer mot midten mellom fingrene, og følger fingrene sideveis
      const nv = zoomAbout({ scale: gest.sc, cu: gest.cu, cv: gest.cv, oy: view.oy }, W, H, gest.mx, gest.my, gest.sc * d / gest.d);
      view.scale = nv.scale; view.cu = nv.cu - (mx - gest.mx) / nv.scale; view.cv = nv.cv + (my - gest.my) / nv.scale;
      const part = sel && B.placed.find((z) => z.id === sel);
      if (part && gest.rot != null) { const da = a - gest.a; if (Math.abs(da) > 0.12 || gest.twisted) { if (!gest.twisted) { gest.twisted = true; gest.hist = true; } part.rot = twistRot(gest.rot, gest.a, a); } }
      return;
    }
    if (bux.on() && bux.move(e)) return;
    if (grid.on() && grid.move(e)) return;
    if (drag && e.pointerId === drag.pid) {
      const r = loc(e), w = toWorld(view, W, H, r.x, r.y); drag.x = r.x; drag.y = r.y; drag.part.u = w.u + drag.ox; drag.part.v = w.v + drag.oy;
    } else if (gest?.kind === 'pan' && ptrs.has(e.pointerId) && ptrs.size === 1) {
      const r = loc(e); if (Math.hypot(r.x - gest.x, r.y - gest.y) > 8) gest.moved = true; view.cu = gest.cu - (r.x - gest.x) / view.scale; view.cv = gest.cv + (r.y - gest.y) / view.scale;
    }
  });
  function up(e) {
    if (!active) return; uncap(e.pointerId); ptrs.delete(e.pointerId); syncSnap(getB(active));
    if (bux.on() && bux.up(e)) return;
    if (grid.on() && grid.up(e)) return;
    if (gest?.kind === 'two' && ptrs.size < 2) {
      if (gest.twisted) { const B = getB(active), p = B.placed.find((z) => z.id === sel); if (p) { const r = p.rot; p.rot = gest.rot; place(B, p.id, p.u, p.v, r); logEv('bygg', `vri ${p.id}`); onChange?.(); } }
      gest = null;
    }
    if (drag && e.pointerId === drag.pid) {
      const B = getB(active), tr = tray.getBoundingClientRect(), over = drag.y > tr.top - root.getBoundingClientRect().top;
      const ex = B.placed.find((p) => p.id === drag.id), tapped = isTap(drag.x0, drag.y0, drag.x, drag.y);
      if (drag.fromTray && !ex && tapped && !sim) { trayTap(B, drag.id); drag = null; trayRender(); return; }   // R110: kort trykk på brikke i delebrettet legger delen ut og velger den
      if (drag.tapLink && ex && Math.hypot(drag.x - drag.x0, drag.y - drag.y0) < 10) { const w0 = drag.tapLink; drag = null; if (tool) linkTap(B, ex, w0); trayRender(); return; }   // R70: trykk med verktøy = koble
      if (over) { if (ex) { remove(B, drag.id); logEv('bygg', `tilbake i brettet ${drag.id}`); cbx.act('tilbake i brettet'); onChange?.(); } sel = null; }
      else {
        const moved = ex ? !tapped && Math.hypot(drag.part.u - drag.before.u, drag.part.v - drag.before.v) > 0.05 : true;
        if (ex && tapped && !tool) { const ta = tapAction({ tool, linkFrom, sel: drag.wasSel, hits: drag.hits }); if (ta.kind === 'select') { sel = ta.id; selLink = null; if (ta.id !== drag.id) raise(B, ta.id); if (ta.log) logEv('bygg', ta.log); buzz?.(5); } }   // R110: trykk på del velger den (igjen: delen under)
        if (ex && !moved && getDbl()) lastTap = { t: e.timeStamp || performance.now(), x: drag.x, y: drag.y };   // R44: trykk på en del teller som første trykk i et dobbelttrykk
        if (moved) { const p = place(B, drag.id, drag.part.u, drag.part.v, drag.part.rot); logEv('bygg', `${drag.fromTray ? 'plasser' : 'flytt'} ${drag.id} (${p.type}) ${p.snapTo ? 'lego-klikk mot ' + p.snapTo : p.anchored ? 'festet' : 'rutenett'}`); cbx.act(`${drag.fromTray ? 'plasser' : 'flytt'} ${p.type}`); buzz?.(p.snapTo ? 14 : 8); audio?.bplace?.(p.type); if (isToy(p.type) && (drag.fromTray || p.snapTo)) toast(T('build.snd.' + p.type)); if (drag.fromTray && partType(p.type).pivot && getSeeHint() && !seeShown) { seeShown = true; toast(T('build.seesawHint')); } onChange?.(); }
      }
      drag = null; trayRender();
    }
    if (ptrs.size === 0 && gest?.kind === 'pan') { if (bux.on() && !sim) { if (!gest.moved) bux.tap(gest.x, gest.y, e.timeStamp || performance.now()); grid.release(); } else if (grid.on() && !sim) { if (!gest.moved) grid.tapPoint(gest.x, gest.y); grid.release(); } else if (!gest.moved && getDbl()) lastTap = { t: e.timeStamp || performance.now(), x: gest.x, y: gest.y }; gest = null; }
  }
  addEventListener('pointerup', up);
  // R109: avbrutt berøring (iOS sender pointercancel/touchcancel ved systemgester), mistet capture og blur: delen plasseres ikke, ingenting henger, valgt del beholdes
  addEventListener('pointercancel', (e) => { if (!active) return; ptrs.delete(e.pointerId); touchReset('cancel', e); });
  addEventListener('touchcancel', () => touchReset('cancel', null), { passive: true });
  addEventListener('lostpointercapture', (e) => { if (!active || e.target !== cv) return; capIds.delete(e.pointerId); if ((drag && drag.pid === e.pointerId) || (gest && ptrs.size <= 1 && gest.kind === 'two')) touchReset('lost', e); });
  addEventListener('blur', () => touchReset('blur', null));
  document.addEventListener?.('visibilitychange', () => { if (document.hidden) touchReset('blur', null); });
  { const qb = document.getElementById?.('qbtn');   // R109: ⚑ avbryter alltid pågående dra, og virker også om nettleseren ikke sender klikk etter et trykk (iOS)
    if (qb) {
      let qClick = 0; qb.addEventListener('click', () => { qClick = performance.now(); }, true);
      qb.addEventListener('pointerdown', () => { if (!active) return; touchReset('flag', null); if (!flagLogged) { flagLogged = true; logEv('bygg', '⚑ trykket i byggeskjermen'); } }, true);
      qb.addEventListener('pointerup', () => { if (!active) return; const t0 = performance.now(); setTimeout(() => { if (active && qClick < t0) { logEv('bygg', '⚑ klikk uteble, åpnet via slipp'); qb.click(); } }, 350); }, true);
    } }
  cv.addEventListener('wheel', (e) => { if (!active) return; e.preventDefault(); const r = loc(e); view = zoomAbout(view, W, H, r.x, r.y, view.scale * (e.deltaY < 0 ? 1.12 : 1 / 1.12)); }, { passive: false });

  // ---- R67: Bygglab: velg sted (◀ ▶), nullstill sted/alle, oppgavetekst, målflagg ----
  const labInfo = () => labInfoOf(active, labSites);
  function labLine() {   // oppgaven for stedet som hint-tekst: «Sted 3/8: Fagverk — bygg en bro av trekanter» (✓ når «Tåler X»-målet er nådd)
    const i = labInfo(), ok = i.cap && capRes && capRes.n >= i.cap ? ' ✓' : '';
    return T('lab.line', { n: i.n, of: i.of, name: T(labNameKey(active)), task: T(labTaskKey(active), { n: i.cap }) }) + ok;
  }
  function labUI() { if (lab && active) labSync(root, T, labInfo(), T(labNameKey(active)), lab.reached.has(active.id)); }
  function labGo(dir) {
    if (!lab || !active) return false;
    const next = labStepSite(labSites, active.id, dir); if (!next || next === active) return false;
    return siteGoTo(next);
  }
  function siteGoTo(next) {   // R107: felles for ◀ ▶ i ⋯-arket, ▶ i topplinjen og NESTE STED i resultatkortet; bygget på stedet du forlater beholdes
    if (!active || !next || next === active) return false;
    stopSim('sted');
    const B = getB(active);
    if (committed.has(active.id) && committed.get(active.id) !== sigOf(B)) { uncommitWorld(active, 'endret uten ny prøve'); solved.delete(active.id); }
    closeModal(); tool = null; linkFrom = null; selLink = null; sel = null; drag = null; gest = null; ptrs.clear(); lastTap = null; zoomMsg = ''; grid.reset();
    active = next; getB(next).snap = getSnap(); size(); view = fitNow(); hint = ''; if (lab) lab.moved = true;
    bux.reset(); cbx.reset(); trh.reset(); bn.reset(); buxEnter(); labels(); trayRender();
    if (lab) { const i = labInfo(); logEv('bygglab', `sted ${i.n}/${i.of} (${i.key})`); } else logEv('bygg', `sted ${next.id}`);
    onChange?.(); return true;
  }
  function labReset(s, why) {
    const b = getB(s), had = !!(b.placed.length || b.links.length || committed.has(s.id) || solved.has(s.id) || lab.reached.has(s.id) || passedL.has(s.id) || recs.has(s.id));
    if (active === s) stopSim('nullstill');
    uncommitWorld(s, 'nullstilt'); gridWipe(b); if (active === s) grid.reset(); solved.delete(s.id); passedL.delete(s.id); recs.delete(s.id); lab.reached.delete(s.id); loadSel.delete(s.id);
    if (active === s) { sel = null; selLink = null; linkFrom = null; drag = null; bux.reset(); cbx.reset(); trh.reset(); buxEnter(); labels(); trayRender(); labUI(); }   // R105: nullstilling setter stedet tilbake til klassisk modus (gridWipe): gå inn i den nye byggeskjermen igjen
    logEv('bygglab', `nullstilt ${s.id} (${why})`); onChange?.(); return had;
  }
  function labResetAll() { if (!lab) return false; for (const s of labSites) labReset(s, 'alle'); logEv('bygglab', 'alle steder nullstilt'); toast(T('lab.allReset')); return true; }
  const labAct = { prev: () => labGo(-1), next: () => labGo(1), site: () => { if (active && labReset(active, 'knapp') !== undefined) toast(T('lab.siteReset', { n: labInfo().n })); }, all: () => labResetAll() };

  // ---- knapper ----
  const act = {
    back: () => { if (sim) stopSim('tilbake'); else close('tilbake'); },
    menu: () => { onMenu?.(); },
    gguide: () => { if (active && !sim) gguide.show('knapp'); },
    mode: () => { if (grid.toggleMode()) { sel = null; selLink = null; view = fitNow(); labels(); } },
    undo: () => { const B = getB(active); if (gUndo(B)) { grid.clearSel(); logEv('bygg', 'angre'); audio?.bpop?.(); cbx.act('angre'); sel = null; trayRender(); onChange?.(); } },
    reset: () => { const B = getB(active); if (isGrid(B) ? gReset(B) : reset(B)) { grid.clearSel(); logEv('bygg', 'nullstill'); audio?.bpop?.(); cbx.act('nullstill'); sel = null; trayRender(); onChange?.(); } },
    try: () => (sim ? stopSim('stopp') : startSim()),
    rotl: () => rot(ROT_STEP), rotr: () => rot(-ROT_STEP),   // R30: ↺ dreier mot klokka (positiv vinkel i sideriss med v oppover), ↻ med klokka
    snap: () => { setSnap(!getSnap()); const B = getB(active); B.snap = getSnap(); labels(); logEv('bygg', `snapping ${getSnap() ? 'på' : 'av'}`); },
    del: () => { const B = getB(active); if (isGrid(B)) { grid.del(); return; } if (selLink && removeLink(B, selLink)) { logEv('bygg', `fjernet ${selLink}`); audio?.bpop?.(); cbx.act('fjern feste'); selLink = null; onChange?.(); } else if (sel && remove(B, sel)) { logEv('bygg', `tilbake i brettet ${sel}`); audio?.bpop?.(); cbx.act('fjern del'); sel = null; trayRender(); onChange?.(); } },
  };
  function rot(d) { const B = getB(active); if (sel && rotate(B, sel, d)) { logEv('bygg', `roter ${sel}`); cbx.act('roter'); onChange?.(); } }
  root.addEventListener('click', (e) => { const gs = e.target.closest?.('button')?.dataset.gs; if (gs && active && sim && grid.on() && !simDone) { gSpeed = grid.setSpeed(gs); return; } const gm = e.target.closest?.('button')?.dataset.g; if (gm && active && !sim) { grid.setMat(gm); return; } const lb = e.target.closest?.('button')?.dataset.lb; if (lb && lab && active && labAct[lb]) { labAct[lb](); return; } const l = e.target.closest?.('button')?.dataset.l; if (l && active && !sim && loadList().includes(l)) { loadSel.set(active.id, l); logEv('bygg', `last valgt: ${l}`); loadsRender(); return; } const sh = e.target.closest?.('button')?.dataset.s; if (sh && active && shareAct[sh]) { shareAct[sh](); return; } const t = e.target.closest?.('button')?.dataset.t; if (t) { tool = tool === t ? null : t; linkFrom = null; labels(); return; } const a = e.target.closest?.('button')?.dataset.a; if (a && act[a]) act[a](); });
  enterBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); open(); });
  addEventListener('keydown', (e) => {
    if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return;   // R71: skriving i ⚑-boksen skal ikke trigge byggetaster
    if (active) {
      if (e.code === 'Escape' || e.code === 'KeyB') { e.preventDefault(); close('tast'); }
      else if (e.code === 'Equal' || e.code === 'NumpadAdd') zoomAct.in(); else if (e.code === 'Minus' || e.code === 'NumpadSubtract') zoomAct.out(); else if (e.code === 'Digit0' || e.code === 'Numpad0') zoomAct.fit(); else if (e.code === 'KeyZ') act.undo(); else if (e.code === 'KeyQ') rot(-ROT_STEP); else if (e.code === 'KeyR' || e.code === 'KeyE') rot(ROT_STEP); else if (e.code === 'Delete' || e.code === 'Backspace') act.del();
      e.stopImmediatePropagation(); return;
    }
    if (e.code === 'KeyB' && !e.repeat && !e.ctrlKey && !e.metaKey) open();
  }, true);

  // ---- PRØV (R25) ----
  function starsNow() { try { return starsFor(active, getB(active).placed, getB(active).links).stars; } catch { return 1; } }   // R99: melodien følger antall stjerner
  function startSim() {
    if (blk.on()) return false;   // R111: ingen PRØV mens stedet er låst
    const B = getB(active); if (!B.placed.length) { toast(T('build.tryEmpty')); return false; }
    const so = { strength: getStrength(), load: curLoad(), axial: getAxial(), ...(stageNow() ? { massK: stageNow().massK } : {}) };
    resetRunState('ny prøve'); let gdef = null; if (isGrid(B)) { const a = gridSimDefAuto(B); gdef = a.def; if (a.passed && !startSim.logged) { startSim.logged = true; logEv('bygg', 'lasten kjører bare på veien: støttestaver stopper den ikke'); } }
    sim = createSim(isGrid(B) ? gdef : { site: active, placed: B.placed.map((p) => ({ id: p.id, type: p.type, u: p.u, v: p.v, rot: p.rot })), links: B.links }, { strength: getStrength(), load: curLoad(), axial: getAxial(), ...(stageNow() ? { massK: stageNow().massK } : {}) });
    simLoad = curLoad(); winOver = false; loadMore = null; replaying = false; winSolved = false; { const gc = getGhost() ? ghostChoice(recs.get(active.id), sim.pose()) : { rec: null, why: 'av' }; ghostRec = gc.rec; if (gc.why === 'endret') logEv('bygg', 'spøkelse skjult: delene er endret siden forrige prøve'); } recorder = createRecorder(sim, { load: simLoad }); simAcc = 0; simMarks = []; simBreaks = []; simWhy = null; simHelp = null; breakAt = -9; simDone = false; simT0 = tNow; confetti = []; sel = null; selLink = null; linkFrom = null; drag = null; gest = null; ptrs.clear();
    gPeaks = isGrid(B) ? createPeaks() : null; gSum = null; gSpeed = 'play'; grid.simSync('play', false); bux.onTry(); cbx.onTry();
    audio?.bstart?.(); root.classList.add('sim'); labels(); logEv('bygg', `prøv ${active.id}: ${B.placed.length} deler, ${B.links.length} koblinger, last ${simLoad}, modus ${isGrid(B) ? 'rutenett' : 'klassisk'}${ghostRec ? ', med spøkelse' : ''}, glass ${loupe.takeShown()} visninger, resultatknapper ${bn.takeUsed()} trykk`); return true;
  }
  const loadThe = (id) => T('build.loadThe.' + id);
  function simText() {   // R48: teksten nevner lasten som prøves (testfiguren har egne, eldre tekster)
    const L = simLoad !== DEFAULT_LOAD, st = sim.state, nm = loadThe(simLoad);
    if (replaying && !simDone) return T('build.hintReplay');
    if (!simDone) return L ? T('build.hintRunL', { name: nm }) : T('build.hintRun');
    if (st.state === 'won' && winOver && winRes) return T('gstage.over', { cost: winRes.cost, budget: stageNow()?.budget ?? 0 });
    if (st.state === 'won') return loadMore ? T('build.wonMore', { name: nm, next: loadThe(loadMore) }) : getBudget() && winRes ? wonText() : L ? T('build.wonL', { name: nm }) : T('build.won');
    return simWhy ? T(simWhy.key) : simMarks.length ? T('build.lostBreak') : st.reason === 'fell' ? (L ? T('build.lostFellL', { name: nm }) : T('build.lostFell')) : (L ? T('build.lostStuckL', { name: nm }) : T('build.lostStuck'));
  }
  // R112: ALL prøvetilstand nullstilles her (sim, opptak, spøkelse, merker, forklaring, resultat, konfetti, toppbelastning, resultatkort); alle veier bruker den
  function resetRunState(why) {
    const stale = staleKeys({ sim, simAcc, simMarks, simDone, simBreaks, simWhy, simHelp, confetti, breakAt, loadMore, winSolved, winOver, replaying, recorder, ghostRec, gPeaks, gSum, gSpeed });
    ({ sim, simAcc, simMarks, simDone, simBreaks, simWhy, simHelp, confetti, breakAt, loadMore, winSolved, winOver, replaying, recorder, ghostRec, gPeaks, gSum, gSpeed } = blankRun());
    root.classList.remove('sim'); bn.reset();
    if (stale.length) logEv('bygg', `prøvetilstand nullstilt: ${why} (${stale.join(', ')})`);
  }
  function stopSim(why) {
    if (!sim) { resetRunState(why); return; } logEv('bygg', `stopp prøve (${why}) etter ${sim.t.toFixed(1)} s`); resetRunState(why); labels(); trayRender();
  }
  // R73: «største belastning» (grid_stress.js): tekst om staven som brakk først, ellers den som var nærmest brudd
  function rodName(id) { const p = getB(active).placed.find((q) => q.id === id), r = p && parseRod(p.type); return r ? `${T('grid.mat.' + r.mat).toLowerCase()} ${String(+r.len.toFixed(2)).replace('.', ',')}` : id; }
  function peakLine() {
    if (!gSum) return ''; const h = gSum.first, t = gSum.top; if (!h && !t) return '';
    if (h) return T('grid.peak.first', { name: rodName(h.id), mat: T('grid.kind.' + (h.kind || 'trykk')), len: (+h.t || 0).toFixed(1).replace('.', ',') });
    return T('grid.peak.top', { name: rodName(t.id), mat: T('grid.kind.' + t.kind), n: gPct(t.r) });
  }
  // R74: oppdraget bestått: husk det (neste sted åpnes), logg og si fra
  function stagePass(gst, res) {
    const r = passRecord(st0, levelId, active.id); gPassCache = null; const nx = stagesOf(sites).find((q) => (q.lab?.n || 0) > (active.lab?.n || 0));
    logEv('bygg', `oppdrag bestått ${active.id}: ${res.stars} stjerner, kostnad ${res.cost} av ${gst.budget}, ${res.parts} staver, last ${gst.loads.join('+')}${gst.massK > 1 ? ' x' + gst.massK : ''}${r.first ? ', første gang' : ''}`);
    try { onStagePass(active.id, { first: r.first, stars: res.stars }); } catch { /* R95 */ }
    grid.sync(); if (r.first) toast(nx ? T('gstage.unlocked', { n: nx.lab?.n || 0 }) : T('gstage.allDone'));
  }
  // R119: en firkant uten diagonal i rutenett-bygget (hintet «Legg inn en diagonal»); logges én gang per bygg
  let tipSig = '';
  function squareTipNow(B) {
    const on = squareTipShould({ on: getSquareTip(), grid: isGrid(B), G: B.rg }); if (!on) { tipSig = ''; return false; }
    const sg = JSON.stringify(B.rg.rods.map((r) => r.id)); if (sg !== tipSig) { tipSig = sg; logEv('bygg', `hint: firkant uten diagonal (${active?.id})`); }
    return true;
  }
  function stageState(B) {   // tallene til infokortet (grid_stage.js: stageLines)
    const gst = stageNow(); if (!gst) return null;
    const r = starsFor(active, B.placed, B.links), req = requiredLoads(lsite()), done = passedOf(active), won = !!sim && simDone && sim.state.state === 'won';
    return { st: gst, cost: r.cost, parts: r.parts, stars: r.stars, next: r.next, over: overBudget(gst, r.cost), on: B.placed.length > 0, ran: !!sim && simDone && !replaying, won, passed: won && winSolved && !winOver, loadsLeft: req.filter((i) => !done.includes(i)), peak: sim && simDone ? peakLine() : '', done: gPass().has(active.id), tip: squareTipNow(B) };
  }
  function peakFinish() {
    gSpeed = 'play'; grid.simSync('play', true);
    if (!gPeaks || replaying) return;
    gSum = peakSummary(gPeaks.peaks, simBreaks.filter((b) => gPeaks.peaks.has(b.id)));
    const h = gSum.first, t = gSum.top; if (!t) return;
    logEv('bygg', `største belastning ${t.id} ${gPct(t.r)} % ${t.kind}${h ? `; brakk først ${h.id} ved ${(+h.t || 0).toFixed(1)} s` : ''}`);
  }
  function stepSim(dt) {
    if (!sim || simDone) return; simAcc += dt * (getSlow() ? 0.35 : 1) * (gSpeed === 'slow' ? getGridSlow() : 1) * (gSpeed === 'pause' ? 0 : 1) * breakTempo(tNow - breakAt, getBreakFx());   // R73: SLOW og PAUSE (rutenett)
    for (let n = 0; simAcc >= DT && n < 6 && !simDone; n++) {
      simAcc -= DT; sim.step();
      if (gPeaks && sim.axial && !replaying) gPeaks.feed(sim.axial(), sim.t);   // R73: høyeste belastning per stav
      const evs = sim.drain(); recorder?.frame(sim, evs);   // R50: opptak (bare ekte prøver, ikke replay)
      for (const e of evs) {
        if (e.type === 'break') { simMarks.push({ u: e.u, v: e.v, t0: tNow }); simBreaks.push({ kind: e.mode || (isGrid(getB(active)) ? 'rod' : 'plank'), id: e.id, t: e.t, u: e.u, v: e.v }); breakAt = tNow; logEv('bygg', e.mode ? `${e.mode === 'buckle' ? 'knakk' : e.mode === 'tear' ? 'revnet' : 'knust'} ${e.id} ved ${e.t.toFixed(1)} s (kraft ${e.m} mot grense ${e.cap})` : `brakk ${e.id} ved ${e.t.toFixed(1)} s`); audio?.bbreak?.(); buzz?.(25); }
        else if (e.type === 'linkbreak') { simMarks.push({ u: e.u, v: e.v, t0: tNow }); simBreaks.push({ kind: e.kind, id: e.id, t: e.t, u: e.u, v: e.v }); breakAt = tNow; logEv('bygg', `${e.kind} røk ${e.id} ved ${e.t.toFixed(1)} s`); audio?.bbreak?.(); buzz?.(25); }
        else if (e.type === 'yield') logEv('bygg', `${e.id} bøyer seg (seigt materiale gir etter)`);
        else if (e.type === 'creak') audio?.bcreak?.(e.stress);
        else if (e.type === 'hop') audio?.bhop?.();
        else if (e.type === 'splash') audio?.bsplash?.();
        else if (e.type === 'win') { audio?.barrive?.(); audio?.bstars?.(starsNow()); buzz?.([30, 40, 30]); if (!replaying) { winRes = starsFor(active, getB(active).placed, getB(active).links); const gst = stageNow(); winOver = overBudget(gst, winRes.cost); const r = winOver ? { passed: passedOf(active), solved: false, left: [] } : afterWin(lsite(), passedOf(active), simLoad); if (winOver) logEv('bygg', `oppdrag: holdt, men over budsjett (${winRes.cost} av ${gst.budget}) ${active.id}`); else { passedL.set(active.id, { sig: sigOf(getB(active)), ids: r.passed }); logEv('bygg', `last ${simLoad} bestått (${r.passed.length}/${requiredLoads(lsite()).length || 1})`); } winSolved = !replaying && r.solved; if (!replaying && r.solved) { const rec = recordBuildStars(st0, levelId, active.id, winRes); starsCache = null; logEv('bygg', `stjerner ${winRes.stars} (kostnad ${winRes.cost}, ${winRes.parts} deler, modus ${isGrid(getB(active)) ? 'rutenett' : 'klassisk'}) ${active.id}${rec.first ? ', første gang' : rec.improved ? ', ny rekord' : ''}`); solved.add(active.id); if (gst) stagePass(gst, winRes); else if (stageHere()) stagePass({ loads: [simLoad], budget: stageOf(active)?.budget || 0, massK: 1 }, winRes); commitWorld(active, 'prøve klarte det');   // R115: bestått i klassisk modus (Vippe, Trapp) teller også for låsingen av neste sted
 onSolved(active.id); } else if (!replaying && !winOver) loadMore = nextLoad(lsite(), r.passed); } for (let i = 0; i < 46; i++) confetti.push({ u: e.u + (i % 9 - 4) * 0.3, v: e.v + 1 + (i % 5) * 0.2, vx: ((i * 37) % 13 - 6) * 0.4, vy: 5 + (i * 17) % 7, c: ['#ffd23f', '#3df0b0', '#ff6a5a', '#6ab8ff'][i % 4] }); }
      }
      if (sim.state.state !== 'run') { simDone = true; if (!replaying) { bux.onResult(sim.state.state === 'won'); cbx.onResult(sim.state.state === 'won'); trh.onResult(sim.state.state === 'won'); } if (recorder) { recs.set(active.id, recorder.finish(sim.state)); logEv('bygg', `opptak lagret: ${recorder.rec.frames.length} steg`); recorder = null; if (winSolved) submitBest(); } shareSync(); if (!replaying) { const rs = starsFor(active, getB(active).placed, getB(active).links); onStat('build_try', { sted: active.id, modus: isGrid(getB(active)) ? 'rutenett' : 'klassisk', resultat: sim.state.state === 'won' ? 'vant' : 'tapte', kostnad: rs.cost, stjerner: rs.stars, deler: rs.parts }); } simWhy = sim.state.state === 'lost' ? whyBroke(simBreaks) : null; simHelp = sim.state.state === 'lost' && getTruss() ? helpOf(getB(active)) : null; if (!simWhy && simHelp?.joints.length) { const j = simHelp.joints[0]; simWhy = { key: 'build.why.floppy', kind: 'floppy', id: j.id, u: j.u, v: j.v, t: sim.t }; } if (simWhy) logEv('bygg', `forklaring: ${simWhy.kind} ${simWhy.id}`); peakFinish(); logEv('bygg', `prøve ${sim.state.state === 'won' ? 'klarte det' : 'feilet: ' + sim.state.reason} etter ${sim.t.toFixed(1)} s${simMarks.length ? `, ${simMarks.length} brudd` : ''}`); if (sim.state.state === 'won') toast(simText()); onChange?.(); }
    }
    for (const q of confetti) { q.u += q.vx * dt; q.v += q.vy * dt; q.vy -= 14 * dt; }
    confetti = confetti.filter((q) => q.v > -8);
  }

  // ---- R50: replay, kode og beste bygg ----
  const shareOn = () => getShare();
  const netOk = () => netReady({ enabled: shareOn(), code: getCode() });
  function shareSync() {   // hvilke knapper som vises: i prøve bare SE IGJEN (når den er ferdig), ellers alle (BESTE bare med tester-kode og nett)
    if (!active) return; const has = !!recs.get(active.id), idle = !sim, vis = (b, v) => { b.style.display = v ? '' : 'none'; };
    const re = sBtn('replay'); vis(re, has && (idle || simDone)); re.disabled = !has; vis(sBtn('copy'), idle); vis(sBtn('paste'), idle); vis(sBtn('best'), idle && netOk());
  }
  function startReplay() {
    const rec = active && recs.get(active.id); if (!rec) return false;
    const rp = createReplay(rec), q = [], st = { state: 'run', reason: '' }; resetRunState('replay');
    sim = { state: st, get t() { return rp.i * DT; }, pose: () => rp.pose(), drain: () => q.splice(0, q.length), step() { for (const e of rp.step()) q.push(e); if (rp.done) { st.state = rec.result ? rec.result.state : 'lost'; st.reason = rec.result ? rec.result.reason : 'time'; } } };
    simLoad = rec.meta?.load || DEFAULT_LOAD; replaying = true; simT0 = tNow;
    sel = null; selLink = null; linkFrom = null; drag = null; gest = null; ptrs.clear(); gPeaks = null; gSum = null; gSpeed = 'play'; grid.simSync('play', false); root.classList.add('sim'); labels();
    logEv('bygg', `replay ${active.id}: ${rec.frames.length - 1} steg, last ${simLoad}`); return true;
  }
  function submitBest() {   // etter et vellykket bygg: send til topplista (bare med tester-kode og nett; ellers skjer ingenting)
    if (!netOk() || !active) return; const B = getB(active), code = exportAny(B, exportCode); if (!code) return;
    const r = starsFor(active, B.placed, B.links), lvl = bridgeLevel(levelId, active.id); 
    submitBridge({ code: getCode(), level: lvl, version: getVersion(), parts: r.parts, cost: r.cost, stars: r.stars, bcode: code }, netFetch ? { fetchFn: netFetch } : undefined).then((res) => {
      if (res) { logEv('bygg', `beste bygg sendt ${lvl}: nr ${res.rank} (kostnad ${res.cost}, ${res.parts} deler)`); toast(T('build.share.rank', { rank: res.rank })); } else logEv('bygg', `beste bygg ikke sendt ${lvl} (nett eller kode)`);
    }).catch(() => {});
  }
  function openModal(title, { text = null, list = false, use = false } = {}) {
    mTitle.textContent = title; mText.style.display = text === null ? 'none' : ''; if (text !== null) mText.value = text; mList.style.display = list ? '' : 'none'; if (list) mList.innerHTML = '';
    modal.querySelector('[data-m="use"]').style.display = use ? '' : 'none'; modal.classList.add('open');
    if (text !== null) { try { mText.focus?.(); if (!use) mText.select?.(); } catch { /* ok */ } }
  }
  const closeModal = () => { modal.classList.remove('open'); try { mText.blur?.(); } catch { /* ok */ } };
  function doImport(raw) {
    const B = getB(active), r = importAny(raw, B, importCode);
    if (!r.ok) { logEv('bygg', `kode avvist: ${r.why}`); toast(T('build.share.err.' + r.why, { n: r.missing || 0 })); return false; }
    if (r.grid) gApplyImport(B, r); else applyImport(B, r); grid.reset(); sel = null; selLink = null; syncSnap(B); labels(); const nP = r.grid ? r.grid.rods.length : r.placed.length; logEv('bygg', `kode importert: ${nP} ${r.grid ? 'staver' : 'deler'}${r.grid ? '' : ', ' + r.links.length + ' koblinger'}`); toast(T('build.share.imported', { n: nP })); trayRender(); onChange?.(); return true;
  }
  async function showBest() {
    openModal(T('build.share.bestTitle'), { list: true }); mList.textContent = T('build.share.loading'); const site = active, lvl = bridgeLevel(levelId, site.id);
    const list = await bestBridges(getCode(), lvl, netFetch ? { fetchFn: netFetch } : undefined); if (!modal.classList.contains('open') || active !== site) return;
    if (!list) { mList.textContent = T('build.share.offline'); return; }
    logEv('bygg', `beste bygg hentet ${lvl}: ${list.length}`); mList.innerHTML = '';
    const sd = standing(list), head = document.createElement('div'); head.className = 'row'; head.textContent = sd ? (sd.of ? T('build.share.standing', { rank: sd.rank, of: sd.of }) : T('build.share.standingTop', { rank: sd.rank })) : (list.length ? '' : T('build.share.empty')); if (head.textContent) mList.appendChild(head);
    for (const b of list) {
      const row = document.createElement('div'); row.className = 'row'; const sp = document.createElement('span'); sp.textContent = T('build.share.row', { rank: b.rank, stars: starText(b.stars), cost: b.cost, parts: b.parts }) + (codeMode(b.code) === 'grid' ? T('gplay.rowMark') : '') + (b.me ? T('build.share.me') : '');
      const bt = document.createElement('button'); bt.textContent = T('build.share.try'); bt.addEventListener('click', () => { if (doImport(b.code)) closeModal(); });
      row.appendChild(sp); row.appendChild(bt); mList.appendChild(row);
    }
  }
  const shareAct = {
    replay: () => { if (sim && !simDone) return; startReplay(); },
    copy: async () => {
      const B = getB(active); if (!B.placed.length) { toast(T('build.share.none')); return; }
      const code = exportAny(B, exportCode); if (!code) { toast(T('build.share.long')); return; }
      logEv('bygg', `kode eksportert: ${code.length} tegn, ${B.placed.length} deler${isGrid(B) ? ' (rutenett)' : ''}`);
      try { if (copyText) await copyText(code); else await navigator.clipboard.writeText(code); toast(T('build.share.copied', { n: code.length })); }
      catch { openModal(T('build.share.show'), { text: code }); }
    },
    paste: () => openModal(T('build.share.pasteTitle'), { text: '', use: true }),
    best: () => { showBest(); },
  };
  modal.addEventListener('click', (e) => {
    const m = e.target.closest?.('button')?.dataset.m; if (m === 'close') closeModal(); else if (m === 'use') { if (doImport(mText.value)) closeModal(); }
  });

  // R120: delmålet «Finn tre rare deler» (valgfritt flagg); sjekkes når en del plukkes og etter innlasting (gamle lagringer med funnede deler)
  function partsGoalCheck() {
    if (lab || !goalReached(foundCount(parts), parts.length) || !onSolved) return;
    if (LEVEL.goalFlags?.has(PB.goalId)) return;
    logEv('bygg', `bonus: ${foundCount(parts)} rare deler funnet`); onSolved(PB.goalId);
  }
  // ---- inn og ut ----
  let near = null;
  function open(siteId, { force = false } = {}) {   // R68: open('<sted>', { force: true }) åpner et bestemt sted uten nærhets- og tilstandssjekk (kinomodus)
    if (!enabled || active) return false;
    const s = typeof siteId === 'string' ? sites.find((q) => q.id === siteId) : near || nearestSite(sites, player);
    if (!s || !(force && typeof siteId === 'string') && !canEnterBuild({ play: isPlay(), won: isWon(), menu: isMenu(), boss: isBoss(), ov: isOv(), onGround: player.onGround || player.state === 'ground' })) return false;
    active = s; const B = getB(s); B.snap = getSnap();
    if (!lab) {   // R120: delene er der fra første gang stedet åpnes; funnede deler er bonus (budsjett +1, delmålet «Finn tre rare deler»)
      const fromStart = getPartsStart();
      for (const id of trayIds(parts, fromStart)) addPart(B, id);
      if (!fromStart) { const drop = new Set(dropIds(parts, B.placed.map((p) => p.id))); if (drop.size) B.have = B.have.filter((id) => !drop.has(id)); }   // av = som før: bare det du har funnet
      if (!B.partsLogged) { B.partsLogged = true; logEv('bygg', `${logLine(fromStart, foundCount(parts), parts.length)} (${s.id})`); }
    } else for (const q of parts) if (q.got) addPart(B, q.id);
    if (allParts()) for (const q of parts) addPart(B, q.id);
    loupe.reset(); resetRunState('inn'); closeModal(); root.classList.remove('sim'); tool = null; linkFrom = null; selLink = null;
    sel = null; drag = null; gest = null; ptrs.clear(); lastTap = null; zoomMsg = ''; grid.reset(); gguide.reset(); size(); view = fitNow(); hint = '';
    document.body.classList.add('building'); labels(); trayRender();
    if (grid.restoreMode()) { view = fitNow(); labels(); }   // R75: sist valgte modus huskes
    bux.reset(); cbx.reset(); trh.reset(); bn.reset(); buxEnter();   // R92 (R96: cbx)
    logEv('bygg', `inn ${s.id}: ${B.have.length} deler, ${B.placed.length} plassert`);
    try { onOpen(s.id); } catch { /* R95: hekt for Byggeskolen */ }
    return true;
  }
  function close(why) {
    if (!active) return; const B = getB(active);
    logEv('bygg', `ut (${why}): ${B.placed.length}/${B.have.length} plassert`);
    if (committed.has(active.id) && committed.get(active.id) !== sigOf(B)) { uncommitWorld(active, 'endret uten ny prøve'); solved.delete(active.id); }   // R26: et endret bygg må prøves på nytt før det står i verden
    resetRunState('ut'); closeModal(); gguide.reset(); tool = null; linkFrom = null;
    if (lab && (lab.moved || labFar(active, player))) { const h = labHome(active); Object.assign(player, { x: h.x, y: h.y, z: h.z, vx: 0, vy: 0, vz: 0, onGround: true }); logEv('bygglab', `figuren flyttet til sted ${labInfo().n}`); }   // R67: ut fra et annet sted enn der du sto: på sokkelen før gapet
    if (lab) lab.moved = false;
    cbx.reset(); bn.reset(); loupe.reset(); active = null; drag = null; gest = null; ptrs.clear(); document.body.classList.remove('building'); onChange?.();
    try { onClose(); } catch { /* R95 */ }
  }

  // ---- hver ramme ----
  let tNow = 0;
  function update(dt, playing) {
    tNow += dt;
    near = enabled && playing && !active ? nearestSite(sites, player) : null;
    const show = !!near && canEnterBuild({ play: isPlay(), won: isWon(), menu: isMenu(), boss: isBoss(), ov: isOv(), onGround: player.onGround || player.state === 'ground' });
    enterBtn.style.display = show ? 'block' : 'none';
    if (show && enterBtn.dataset.l !== T('build.enter')) labels();
    if (show) setEnter(near);
    spanRow.style.display = show && spanRow.dataset.site ? 'block' : 'none';
    if (spanV) {   // R118: FRA/TIL-markører i verdenen, logg og veiledning første gang per sted
      const sg = getSpan(), id = spanV.update(dt, { player, playing: playing && !active && isPlay() && !isMenu() && !isWon(), buildOpen: !!active, expert: sg.expert, help: sg.help });
      if (id && !spanLogged.has(id)) { spanLogged.add(id); logEv('bygg', `fra/til-markør vist: ${id}`); }
      if (id && show && near?.id === id && spanGuideShould({ on: sg.on && sg.guide !== false, expert: sg.expert, seen: st0.get(SPAN_KEY, []), id: levelId + ':' + id })) {
        const seen = st0.get(SPAN_KEY, []); st0.set(SPAN_KEY, [...seen, levelId + ':' + id]); toast(T('span.guide')); logEv('bygg', `fra/til-veiledning vist: ${id}`);
      }
    }
    for (const { q, g } of partMeshes) { g.visible = !q.got; if (!q.got) { g.position.y = q.y + Math.sin(q.phase * 2) * 0.12; g.rotation.y = q.phase * 0.8; } }
    for (const { s, mat } of siteMeshes) mat.opacity = 0.5 + 0.35 * Math.sin(tNow * 2 + s.x);
    if (playing) { const c = getCrumbs(), bo = getBonus(); if (c !== lastCrumbs || bo !== lastBo) { lastCrumbs = c; lastBo = bo; syncBonus(); } }
    if (lab && playing && !active) for (const ev of labFlagStep(labSites, lab.reached, player)) {   // R67: målflagg per sted
      logEv('bygglab', `målflagg ${ev.n}/${ev.of} nådd (${ev.total}/${labSites.length})`); toast(T(ev.all ? 'lab.flagAll' : 'lab.flag', { n: ev.n, of: ev.of, total: ev.total })); audio?.crumb?.(ev.total, labSites.length); buzz?.(15); onChange?.();
    }
    if (playing && !active) for (const ev of stepParts(LEVEL, player, dt, true)) {
      logEv('bygg', `plukket ${ev.id} ${ev.n}/${ev.total}`); audio?.crumb?.(ev.n, ev.total); buzz?.(15);
      toast(T(getPartsStart() ? 'build.got2' : 'build.got', { name: T('build.p.' + ev.kind), n: ev.n, total: ev.total })); for (const b of builds.values()) addPart(b, ev.id); partsGoalCheck(); onChange?.();
    }
    if (active) { stepSim(dt); draw(); }
  }

  return {
    get active() { return !!active; }, get siteId() { return active?.id || null; }, enabled, update, open, close, labels, get siteIds() { return sites.map((q) => q.id); }, spanStats: () => spanV?.stats() || { shown: null, draw: 0, shadow: 0, sites: 0 }, spanSites: () => sites, spanArrow: (p) => { const sg = getSpan(); if (!sg.on || !sites.length) return null; const nearest = sites.slice().sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; return spanArrowTarget(nearest, p); }, placeRef(siteId) {   // R68: legger stedets referansebygg (site.ref) på brettet, som om du hadde plassert det selv (kinomodus; deler av samme type tas fra de du har)
      const s = sites.find((q) => q.id === siteId), ref = s?.ref; if (!enabled || !ref?.placed?.length) return false; const B = getB(s), used = new Set(), map = new Map();
      for (const p of ref.placed) { const id = B.have.find((h) => !used.has(h) && B.types[h] === p.type); if (!id) return false; used.add(id); map.set(p.id, id); }
      restore(B, { have: B.have, placed: ref.placed.map((p) => ({ ...p, id: map.get(p.id) })), links: (ref.links || []).map((l) => ({ ...l, a: map.get(l.a), b: l.b ? map.get(l.b) : null })) });
      if (active && active.id === s.id) { resetRunState('referansebygg'); labels(); trayRender(); draw(); }
      logEv('bygg', `referansebygg lagt inn ${s.id}: ${B.placed.length} deler`); return true;
    },
    showMarks(v) { marksOn = !!v; for (const { g } of siteMeshes) g.visible = !!v; },   // R68: stedsrammene kan skjules (kinomodus)
    
    save: () => (enabled ? { ...(lab ? { lab: { flags: labReachedSave(lab.reached) } } : {}), got: gotPartIds(LEVEL), solved: [...solved], loads: Object.fromEntries([...passedL].map(([k, e]) => [k, cleanPassed(e.ids)])), sites: Object.fromEntries([...builds].map(([k, b]) => [k, { ...serialize(b), ...gridSave(b, serialize) }])) } : undefined),
    load(data) {
      if (!enabled || !data) return; restoreParts(LEVEL, data.got); partsGoalCheck(); solved.clear(); for (const id of Array.isArray(data.solved) ? data.solved : []) solved.add(id);
      if (lab) lab.reached = labReachedLoad(data.lab?.flags, labSites);
      for (const s of sites) { const d = data.sites?.[s.id]; if (!d) continue; const b = getB(s); if (lab) labRegister(types, d.have); restore(b, { have: d.have, placed: d.placed, links: d.links }); gridLoad(b, d, (B2, c) => restore(B2, { have: d.have, placed: c.placed, links: c.links })); for (const id of data.got || []) addPart(b, id); }
      lastBonusKey = ''; syncBonus(false);
      for (const s of sites) { const ids = cleanPassed(data.loads?.[s.id]); if (ids.length) passedL.set(s.id, { sig: sigOf(getB(s)), ids }); }
      for (const s of sites) if (solved.has(s.id) && getB(s).placed.length) commitWorld(s, 'fortsett');   // R26: bygget gjenopprettes i verdenen
    },
    resetAll() { if (passClear(st0, levelId)) logEv('bygg', 'oppdrag nullstilt (start på nytt)'); gPassCache = null; if (lab) { lab.reached.clear(); lab.moved = false; } for (const s of sites) uncommitWorld(s, 'start på nytt'); for (const q of parts) q.got = false; builds.clear(); solved.clear(); passedL.clear(); loadSel.clear(); recs.clear(); resetRunState('start på nytt'); winRes = null; lastBonusKey = ''; lastCrumbs = -1; },
    screenPos: (u, v) => (active && view ? toScreen(view, W, H, u, v) : null),   // til tester på mobil (Playwright)
    starsMap, bonusOpen, get lastResult() { return winRes; }, get cap() { return capRes; },
    world: { redraw: redrawWorld, texStats: () => (btex ? btex.stats() : null), commit: (id) => { const s = sites.find((q) => q.id === id); return s ? commitWorld(s, 'kode') : 0; }, uncommit: (id) => { const s = sites.find((q) => q.id === id); if (s) uncommitWorld(s, 'kode'); }, info: (id) => { const g = worldMeshes.get(id), bx = (LEVEL.boxes || []).filter((q) => q.built === id).map((q) => ({ id: q.id, min: q.min, max: q.max })), ms = []; g?.updateMatrixWorld?.(true); g?.children.forEach((m) => { const bb = new THREE.Box3().setFromObject(m); ms.push({ min: bb.min.toArray(), max: bb.max.toArray() }); }); return { boxes: bx, meshes: ms, placed: worldPlaced.get(id) || [] }; } },   // R116: til tester
    isSolved: (id) => solved.has(id), inWorld: (id) => committed.has(id), worldCount: (id) => builtCount(LEVEL, id), get running() { return !!sim && !simDone; }, get result() { return sim ? { state: sim.state.state, reason: sim.state.reason, t: sim.t, marks: simMarks.length, why: simWhy ? { kind: simWhy.kind, id: simWhy.id } : null, hint: hintEl.textContent } : null; },
    startTry: () => !!active && startSim(), stopTry: () => stopSim('kode'), resetBuild: () => !!active && act.reset(),   // R74: til tester
    stage: { markPassed: (id) => { const r = passRecord(st0, levelId, id); gPassCache = null; return r.first; }, get now() { return stageNow(); }, locked: (id) => stageLockedFor(sites.find((q) => q.id === id)), get passed() { return [...gPass()]; }, get over() { return winOver; }, lines: () => (active && stageState(getB(active)) ? stageLines(stageState(getB(active)), T) : []), get state() { return active ? stageState(getB(active)) : null; } },   // R74
    bux, bn, trh,   // R92: til tester (R107: bn, R122: trh)
    cap: { get shown() { return capOn(); }, get runs() { return capStats.runs; }, get ms() { return capStats.ms; }, get last() { return capStats.last; }, reset: () => capStats.reset() },   // R110: til tester: «Tåler»-beregninger
    cbx,   // R96: til tester
    touch: { get hanging() { return hanging({ drag, gest, ptrs: ptrs.size, capture: capIds.size > 0 }); }, get writes() { return wc.n; }, resetWrites: () => wc.reset(), get budgetBox() { return budgetBox; }, hintBottom: () => hintBottom(), get sel() { return sel; }, get selLink() { return selLink; }, get linkFrom() { return linkFrom; }, get capture() { return capIds.size; } },   // R109: til tester
    guide: { get open() { return gguide.isOpen(); }, get btn() { return root.classList.contains('gguidebtn'); }, get tip() { return root.classList.contains('gmodetip'); }, tipText: () => grid.modeTip(), show: () => gguide.show('test'), hide: (h) => gguide.hide(h), act: () => act.gguide() },
    grid: { get speed() { return gSpeed; }, setSpeed: (k) => { if (sim && !simDone) gSpeed = grid.setSpeed(k); return gSpeed; }, example: () => grid.example(), get peaks() { return gPeaks ? [...gPeaks.peaks].map(([id, p]) => ({ id, ...p })) : null; }, get summary() { return gSum; }, get on() { return grid.on(); }, get available() { return !!active && grid.enabledHere(); }, toggle: () => grid.toggleMode('kode'), setMat: (m) => grid.setMat(m), tap: (x, y) => grid.tap(x, y), del: () => grid.del(), get mat() { return grid.mat; }, get selNode() { return grid.selNode; }, get selRod() { return grid.selRod; }, info: () => (active && getB(active).rg ? { mode: getB(active).mode || 'classic', ...gridStats(getB(active)), cost: starsFor(active, getB(active).placed, getB(active).links).cost, nodes: getB(active).rg.nodes.map((n) => ({ id: n.id, u: n.u, v: n.v, fixed: !!n.fixed, ...(n.deck ? { deck: true } : {}) })), rods: getB(active).rg.rods.map((r) => ({ ...r })) } : null) },   // R72: til tester (node og Playwright)
    runInfo: () => ({ dirty: dirtyKeys({ sim, simAcc, simMarks, simDone, simBreaks, simWhy, simHelp, confetti, breakAt, loadMore, winSolved, winOver, replaying, recorder, ghostRec, gPeaks, gSum, gSpeed }), ghost: ghostVisible({ ghostRec, replaying, simDone, sim, on: getGhost() }), sim: !!sim, done: simDone, replaying, simSigned: root.classList.contains('sim') }),   // R112: til tester
    startReplay: () => !!active && startReplay(), get replaying() { return replaying; }, record: (id) => recs.get(id) || null, importText: (t) => !!active && doImport(t), exportText: () => (active ? exportAny(getB(active), exportCode) : null),   // R50: til tester (node og Playwright)
    lab: lab ? { go: labGo, resetSite: (id) => { const s = labSites.find((q) => q.id === id); return s ? labReset(s, 'kode') : false; }, resetAll: labResetAll, get reached() { return [...lab.reached]; }, sites: labSites.map((q) => q.id), line: () => (active ? labLine() : ''), info: () => (active ? labInfo() : null), get home() { return lab.moved; } } : null,   // R67: til tester
    state: () => ({ active: active?.id || null, view: view ? { scale: view.scale, cu: view.cu, cv: view.cv, oy: view.oy || 0, W, H } : null, builds: [...builds].map(([k, b]) => ({ id: k, have: b.have.length, placed: b.placed.length, links: b.links.length, parts: b.placed.map((p) => ({ id: p.id, u: p.u, v: p.v, rot: p.rot })) })) }),
  };
}
