import { parseCinema, installRandom, cineStore } from './cinema_logic.js';   // R68: kinomodus (først: fast frø for Math.random før noe annet kjører)
import * as THREE from 'three';
import { RoomEnvironment } from './lib/RoomEnvironment.js';
import { createAudio, surfaceOf, SOUND_LIST } from './audio.js';
import { ambienceFor, createAmbience, ambientOn, lifecycle } from './audio_fx.js';   // R99: romtoner, variasjon, livssyklus
import { createSampleBank } from './audio_samples.js';   // R99: valgfrie ekte lydfiler (sounds/)
import { createMusic, themeFor, moodFor } from './music.js';
import { VERSION } from './version.js';
import { buildPayload, sendFeedback, validCode, cleanCode, REASON_TEXT, fetchInbox, markRead, unreadReplies, statsLines, checkReply } from './feedback_send.js';
import { fetchChangeChecks, checkChange } from './feedback_send.js';
import { parseChangeChecks, pendingChecks } from './changes_logic.js';
import { menuVisible, buttonLabel, uncheckedCount, parseGo, safePlacement, goUrl } from './fixes_logic.js';   // R80: Rettelser-menyen (fixes_logic.js, fixes_view.js)
import { showFixes } from './fixes_view.js';
import { shortDevice, noteWanted, NOTE_KEY } from './privacy_logic.js';   // R87: personvern (privacy_logic.js, privacy_view.js)
import { createPrivacy } from './privacy_view.js';
import { createStats, createRoomAgg, hasBackData, routeShare, fpsOf, screenClass, deviceClass, sendBlocked, STATS } from './stats_logic.js';   // R88: anonym statistikk (stats_logic.js, stats_net.js)
import { createStatsNet } from './stats_net.js';
import { CHANGES } from './changes_data.js';   // R83: NYTT-menyen (changes_data.js, changes_logic.js; visningen er den samme som Rettelser)
import * as chg from './changes_logic.js';
import { setDrawerCue, drawerCue, drawerSummary } from './drawers.js';
import { buildGroup, buildSingle, roundedBoxGeo, setAniso, setTexLow, setAntDetail, buildAnt, buildCrumb, buildSpider, buildCarrier, buildDropCrumb } from './props.js';
import { initAnts, resetAnts, stepAnts } from './ants.js';
import { TUNE as CREATURE_TUNE, DANGLER } from './creatures.js';
import { buildRoller, buildDangler, ROLLER_COL, DANGLER_COL } from './creatures_view.js';
import { TUNE as WASP_TUNE } from './wasp.js';   // R61: veps som flyr
import { buildWasp, WASP_COL } from './wasp_view.js';
import { initPuzzles, resetPuzzles, restorePuzzles, stepPuzzles, puzzleOpenIds, puzzleTotal, puzzleTarget, carryingKeyNear, bridgeFarEnd, bridgeMid, nearBridge } from './puzzle.js';
import { buildPuzzleViews } from './puzzle_view.js';
import { GATE, initGates, resetGates, restoreGates, gatesSave, stepGates, nearSwitch, toggleSwitch, doorById, hasGates, gatesBudget } from './plates_logic.js';   // R60: trykkplate, dør, vindebro og bryter
import { buildGateViews } from './plates_view.js';
import { SCHOOL, schoolProgress, schoolRead, schoolMark, schoolCardShould, schoolDoneShould, schoolUrl } from './byggeskole_logic.js';   // R95: Byggeskolen i menyen
import { createSchoolView, schoolMenuHtml } from './byggeskole_view.js';
import { fagverkCardShould } from './badebro_logic.js';   // R119
import { passRead } from './grid_stage.js';
import { isLab, labAutoOpen } from './bygglab_logic.js';   // R67: Bygglab: byggeskjermen åpnes av seg selv ved start (build.js har resten)
import { addPartsGoal } from './partsbonus_logic.js';   // R120: delene fra start, delmålet «Finn tre rare deler»
import { stueHint, isStue, stueSummary } from './stue_logic.js';   // R62: Stuen (nivå 8): hint om fjernkontrollen, plata og broen
import { buildFlag, buildGoalRing } from './markers.js';
import { GUIDE, aim, glyph, fmtM, danglerPhase, actionFor, bandHint, edgeMark, createStall, stepStall, stalled, nextSurface, ledgePoint, createShowMe, startShowMe, skipShowMe, stepShowMe, showMePlan } from './guide_logic.js';   // R64: veiledning når målet er skjult
import { createGuideView } from './guide_view.js';
import { WAY, createWay, stepWay, questModel, questVisible, normQuestMode, peekMark } from './goalway_logic.js';   // R98: oppdragslinje og peiling (Ekspert)
import { createGoalWayView } from './goalway_view.js';
import { MARK, budgetFor, selectMarkers, goalDirection, noteGrab, markerStyle as rankStyle } from './markers_rank.js';   // R66: markørbudsjett og rangering
import { FG, isWet, pickGoal, refuge, dropIntoWater, drownAlert, shakeOffset, beepDue, levelBadge, floodPct } from './flood_logic.js';   // R65: stigende vann i Nivå 4: mål og varsler tar hensyn til vannstanden
import { createFloodView } from './flood_view.js';
import { FR, firstRunActive, isFirstRun, menuPlan, createHints, hintsSave, noteUse, stepHints, progressInfo, braText, createBlind, stepBlind, noteWrongTa, ft } from './firstrun_logic.js';   // R97: første fem minutter
import { createFirstRunView } from './firstrun_view.js';
import { lockMessage, lockLogText } from './goal_lock_logic.js';   // R89: beskjed ved låst mål også uten hint
import { initGoals, resetGoals, restoreGoals, stepGoals, goalDoneIds, goalFlagList, goalTotal, goalDone, goalById, activeGoal, goalTarget, goalLabel, goalLine, goalsOpen, lockingGoals, setGoalFlag } from './goals.js';   // R23: delmål
import { createGoalView } from './goals_view.js';
import { DIFFS, DEFAULT_DIFF, normDiff, diffProfile, offElements, markerBudget as diffBudget, progressKey as diffProgKey, awardBadge, badgeTotals, bestBadge, isCustomHelp, dt as dft, badgeRow } from './difficulty.js';   // R69: vanskelighetsnivå (difficulty.js, difficulty_view.js)
import { createDifficultyView } from './difficulty_view.js';
import { createStore, migrateAll, normProgress, normCleared, PROGRESS_VERSION, isNewGameKey, wipePlan, wipe, fmtClock, resumeLine, exportProgress, parseProgress, applyImport, sv, savedSummary } from './storage_logic.js';   // R86: trygg lagring, migrering, eksport/import (storage_logic.js, storage_view.js)
import { createStorageView } from './storage_view.js';
import { screenOf, floatOn } from './flag_logic.js';   // R71: ⚑ på alle skjermer
import { createTopBand } from './topband_view.js';   // R53: dynamisk toppbånd
import { PRIO } from './topband_logic.js';
import { createSlickTracker, nextLevelOf, isLastLevel } from './workshop_logic.js';   // R63: verkstedet: glatte flater og nivårekkefølge
import { introKey, shouldShowIntro, finishData, winHTML, showCard, heroSVG, totals, endHTML } from './story.js';
import { firstTarget, reachedFirst, createSweep, sweepPose } from './intro.js';
import { createIntroView } from './intro_view.js';
import { initBoss, resetBoss, stepBoss } from './boss.js';   // R9: sjef-maur i siste rom (egen logikk, modell og helsebar)
import { buildBoss, buildPrize } from './boss_model.js';
import { createBossBar } from './boss_ui.js';
import { createBuildMode } from './build.js';
import { createVersionCheck } from './version_check_view.js';   // R77: versjonsjekk og «Start ny versjon» (version_check_logic.js)
import { createCinema } from './cinema_view.js';   // R68: kinomodus: kamera-API, fast tid og byggeskjerm for trailer-opptak
import { CRUMB, initCollect, resetCollect, stepCollect, crumbCount, crumbTotal, collectedIds, restoreCollected } from './collect.js';
import { makeLook } from './look.js';
import { makeAtmos } from './atmos.js';
import { makeFloorDetail } from './floordetail.js';
import { createDecorSolid } from './solid_decor_logic.js';   // R91: solid dekor (glass på hylla …)
import { makeLekerom, buildSoldier } from './lekerom_view.js';   // R31: lekerommet (nivå 7): legoknotter på gulv og tak, tinnsoldat
import { isSoldier } from './lekerom_logic.js';
import { makeSoftLight } from './softlight.js';
import { applyGrade } from './grade_apply.js';
import { gradeTint } from './grade.js';
import { buildHero, RIG_S } from './hero.js';
import { unlockSchool, recordRun, getEquipped, rt as rwT, accById, getBest, getBuildStars } from './rewards.js';
import { starText } from './build_budget.js';   // R47
import { applyAccessories, updateAccessories, showCloset, previewSVG } from './rewards_view.js';
import { makeVariant, buildTrain } from './variant_view.js';   // R12: nivå 4–6 som egne rom (stemning, hjelmlykt, vri)
import { createVoice } from './voice.js';
import { createShortcutWatch, resetShortcutWatch, stepShortcutWatch } from './shortcut.js';   // R29: verktøy-genveier (hårgelé-trapper i nivå 4–6)
import { createToyLife, resetToys, stepToys, TOY, TOY_SOUND, TOY_CUE } from './toys_live.js';
import { COMBO } from './combos.js';   // R41: kombinasjoner (svamp + vann, håndkle + håndkle, papirhaug)
import { vaultPose, isVaulting } from './vault_anim.js';   // R41: stavhopp-animasjon
import { KICK, tryKick, tickKick } from './toy_kick.js';   // R34: sprettboksen kaster figuren   // R18: leker som lever og reagerer
import { animateToy } from './toys_view.js';
import { makeT, LANGS } from './i18n.js';
import { stepOffset, createReact, hangSway, fpsWatch, createAutoQ } from './polish.js';
import { MOVE, createTurnSteps, createStepOver, gripPose, effectiveStepUp } from './hero_move.js';
import { createMarkerView } from './readable_view.js';
import { createOverview } from './overview.js';
import { spanMapDots } from './buildspan_logic.js';   // R118
import { climbFeel, CF } from './climbfeel.js';   // R58: klatring som ser levende ut (heng med vekt, fingre rundt kanten, bena skyver, avspark)
import { FIN, rollProgress } from './finpuss.js';   // R39: finpuss av Prince (kant-shimmy, rulle, forsiktig gange, tyngre tau)
import { classify as landClass, impactAt, markerStyle, windBoost, fovTarget, approach, landingEvent } from './landing.js';
import { Relay, inCore, CAM_SLOP, yawDelta, pitchDelta, shouldHintDrag } from './camdrag.js';
import { fovForAspect, effectiveFov, fovChosen, migrateCalm, camLine } from './camcalm_logic.js';
import { followYaw, impactSpeed, landingClass, bossFrame, bossCamStep, angleDiff, anchorLook, shiftLookX, BOSS_HERO_X, BOSS_HERO_Y } from './camera_util.js';
import { createShadowCull, createShadowPacer, movedBy, planWarm, chunkByKey, runSteps, SHADOW, TEX_MAX, ANT_Q, antQ } from './perf2_logic.js';   // R94: teksturtak, skyggeutvalg og -tempo, maurdetalj, oppstart i små steg
import { programCount, programKeys, warmRender, warmFades, setSunShadowLow, createShaderWatch } from './shaderwarm.js';   // R35: forvarming av alle shadervarianter, Lav profil uten ny kompilering
import { shrinkSceneTextures, mergeStatic, mergeRigid, refsIn, movingNodes, sceneStats, overBudget, statsLine, createLowProfile, memLine, memOver, roomCaps, BUDGET, MEM_BUDGET } from './perf_budget.js';   // R15: tegnekall-budsjett, sammenslåing av statiske meshes, Lav profil
import { GRIDOPT } from './grid_logic.js';
import { normZoom, normSizePct } from './build_loupe_logic.js';   // R106   // R102
import { changedSettings, exportSettings, parseSettings, formatReport, GROUPS, applyLayout } from './settings_util.js';
import { surfaceBelow, returnBody, P, PRESETS, applyPreset, newPlayer, resetPlayer, step, freeAt, inHazard, initBodies, resetBodies, drainEvents, findCarryTarget, findPlaceSpot, throwVelocity, toolHint, zipNear, findReachTarget } from './physics.js';

const $ = (id) => document.getElementById(id);
// mobil (berøring) er hovedplattformen: tekst som nevner taster skal si knappene i stedet
// sjekk ved oppstart: mobil (berøring som hovedpeker) eller PC (mus/tastatur). Kan overstyres i ⚙ → Test.
const disk = createStore(() => window.localStorage, { onFail: (k, e) => noteSaveFail(k, e) });   // R86: all lagring går hit; kaster aldri, og en korrupt nøkkel gir standardverdi uten å slette noe
const platform = (() => {
  const q = (s) => matchMedia(s).matches;
  const pref = disk.get('tlm.platform', 'auto') || 'auto';
  const auto = q('(pointer:coarse)') ? 'mobil' : 'pc';
  return { kind: pref === 'auto' ? auto : pref, pref, auto, coarse: q('(pointer:coarse)'), fine: q('(any-pointer:fine)'), hover: q('(hover:hover)'), touchPoints: navigator.maxTouchPoints || 0 };
})();
const TOUCH = platform.kind === 'mobil';
let pcButtons = disk.get('tlm.pcbtns', true) !== false;
const applyPlatformUi = () => {
  document.body.classList.toggle('mobile', TOUCH); document.body.classList.toggle('pc', !TOUCH);
  document.body.classList.toggle('showbtns', TOUCH || pcButtons);
  if (!TOUCH) for (const [id, k] of [['btnCarry', 'F'], ['btnJump', 'Mellomrom'], ['btnGrab', 'E / Shift'], ['btnCenter', 'Z']]) { const el = document.getElementById(id); if (el) el.dataset.k = k; }
};
applyPlatformUi();
let lang = disk.get('tlm.lang', 'nb') || 'nb';
const { T, name: kindName } = makeT(() => lang);
let GREP = TOUCH ? T('btn.grab') : 'Shift/E', TA = TOUCH ? T('btn.take') : 'F';          // TA følger knappen: sier den SMØR, heter den SMØR i teksten
const key = (k) => (TOUCH ? '' : ` (${k})`);
const CINE = parseCinema(location.search), cineRnd = CINE.on ? installRandom(CINE.seed) : null;   // R68: ?cinema=1 (alt under er av ellers)
const store = cineStore({ get: disk.get, set: disk.set }, CINE.opts, CINE.on);   // kinomodus: leser bare standardene (+ cine_opt) og skriver aldri (ingen fremgang, ingen autolagring)

// Brett: ?level=bad (eller barnerom/kjokken/soverom …). Uten parameter åpnes brettet du sist spilte; første gang nivå 1.
// De åtte første er nivåene (n = nivånummer, stigende vanskelighetsgrad; 4–6 er de samme rommene ommøblert); resten er ekstra- og prøverom.
const LEVELS = [
  { id: 'bad', n: 1, label: 'Nivå 1: Badet', short: 'Nivå 1 · Bad' },
  { id: 'barnerom', n: 2, label: 'Nivå 2: Barnerommet', short: 'Nivå 2 · Barnerom' },
  { id: 'kjokken', n: 3, label: 'Nivå 3: Kjøkkenet', short: 'Nivå 3 · Kjøkken' },
  { id: 'bad2', n: 4, label: 'Nivå 4: Badet, ommøblert', short: 'Nivå 4 · Bad' },
  { id: 'barnerom2', n: 5, label: 'Nivå 5: Barnerommet, ommøblert', short: 'Nivå 5 · Barnerom' },
  { id: 'kjokken2', n: 6, label: 'Nivå 6: Kjøkkenet, ryddet om', short: 'Nivå 6 · Kjøkken' },
  { id: 'leke', n: 7, label: 'Nivå 7: Lekerommet', short: 'Nivå 7 · Lekerom' },
  { id: 'stue', n: 8, label: 'Nivå 8: Stuen', short: 'Nivå 8 · Stue' },
  { id: 'verksted', n: 9, label: 'Nivå 9: Verkstedet', short: 'Nivå 9 · Verksted' },   // R63 (nivå 8 er reservert til Stuen, R62: «neste nivå» hopper over hull)
  { id: 'bro', label: 'Bygg 1: Hyllebroen (bygg en bro, eller ta den harde veien)', short: 'Bygg · Bro' },
  { id: 'trapp', label: 'Bygg 2: Klossetrappa (bygg en trapp, eller ta den harde veien)', short: 'Bygg · Trapp' },
  { id: 'vippe', label: 'Bygg 3: Vippa over gapet (barnerom: bygg en vippe, eller ta den harde veien)', short: 'Bygg · Vippe' },
  { id: 'kjokkenbro', label: 'Bygg 4: Bro til kjøleskapet (kjøkken: bygg en bro, eller ta den harde veien)', short: 'Bygg · Kjøkkenbro' },
  { id: 'badebro', label: 'Bygg 5: Broen over badekaret (bad: bygg en bro av trekanter, eller ta den harde veien)', short: 'Bygg · Badebro' },   // R119
  { id: 'soverom', label: 'Ekstra: Soverom (håndlaget)', short: 'Soverom' },
  { id: 'gaate', label: 'Prøverom: gåter (plate, dør, bryter og vindebro)', short: 'Gåter' },
  { id: 'poc', label: 'Prøverom: flytte ting', short: 'Prøverom' },
  { id: 'klatring', label: 'Prøverom: klatrehjelp (stav, svamp, fall)', short: 'Klatring' },
  { id: 'bygglab', label: 'Byggeskole (Bygglab): lær å bygge, åtte byggesteder med rutenett, tre, stål og tau. Valgfri, men anbefalt', short: 'Byggeskole' },   // R67
  { id: 'kontroll', label: 'Kontrollbanen (test av styring og kamera)', short: 'Kontroll' },
];
const levelParam = new URLSearchParams(location.search).get('level');
let levelId = levelParam === '' ? 'soverom' : (levelParam ?? store.get('tlm.level', 'bad'));
let LEVEL = null, levelName = '';
if (levelId && levelId !== 'soverom') {
  try {
    const r = await fetch(`./levels/${encodeURIComponent(levelId)}.level.json?v=${encodeURIComponent(window.__assetV || VERSION)}`);       // brettet følger versjonen, så et ombygd brett ikke hentes fra mellomlageret
    if (!r.ok) throw new Error(r.status);
    LEVEL = await r.json(); levelName = levelId;
  } catch { LEVEL = null; }
}
if (!LEVEL) { LEVEL = (await import('./level.js')).LEVEL; levelId = 'soverom'; }
const schoolVisit = levelParam === SCHOOL.levelId && new URLSearchParams(location.search).get('skole') === '1';   // R95: åpnet fra BYGGESKOLE: «sist spilte brett» beholdes
if (!schoolVisit) store.set('tlm.level', levelId);
if (schoolVisit) { try { const u = new URL(location.href); u.searchParams.delete('skole'); history.replaceState(null, '', u.pathname + u.search); } catch { /* ingen historikk */ } }
const levelInfo = LEVELS.find((l) => l.id === levelId), levelLabel = levelInfo?.short || levelId;
const nextLevel = levelInfo?.n ? nextLevelOf(LEVELS, levelInfo.n) : null;   // R63: lavest n over dette nivået (et hull i nummereringen stopper ikke spillet)
const goLevel = (id) => { store.set('tlm.level', id); location.search = `?level=${id}`; };
const SUN = LEVEL.sun || [28, 60, -24];

// ---------- lyd ----------
// Web Audio kan først startes etter en brukerhandling (nettleserregel), så den opprettes ved første tastetrykk/trykk.
let audio = null, music = null, musicMood = 'calm';
let soundMuted = store.get('tlm.muted', false);
function primeVoice() { try { if (hasTTS) speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance(' '), { volume: 0 })); } catch { /* ok */ } }
function unlockAudio(e) {
  if (CINE.on) return;   // R68: ingen lyd i kinomodus
  if (!e || ['pointerdown', 'keydown', 'touchend'].includes(e.type)) primeVoice();      // (de nye hendelsene touchstart/pointerup/click gjelder bare lydmotoren)
  if (!audio) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const actx = new Ctx();
      audio = createAudio(actx, { samples: createSampleBank(actx, { version: VERSION, enabled: () => realSounds }), hidden: () => document.hidden, volume: store.get('tlm.vol', 0.7), reverb: store.get('tlm.reverb', null) ?? LEVEL.audio?.reverb ?? 0.12, levels: store.get('tlm.mix2', {}), breath: breathSound });
      audio.setMuted(soundMuted); logEv('lyd', `låst opp (${actx.state})`);
      music = createMusic(audio.ctx, audio.out, { theme: themeFor(LEVEL), volume: store.get('tlm.musicvol', 0.2), on: store.get('tlm.music', true) });   // R5: musikk starter etter første trykk
      music.setMood(musicMood); music.start();
    } catch { audio = null; music = null; }
  }
  audio?.resume();
}
for (const ev of ['pointerdown', 'pointerup', 'keydown', 'click']) addEventListener(ev, unlockAudio);
addEventListener('touchstart', unlockAudio, { passive: true }); addEventListener('touchend', unlockAudio, { passive: true });   // iPhone låser opp lyden først når fingeren løftes (touchend/pointerup/click): prøv ved alle
// v0.87: etter «Neste nivå» lastes siden på nytt og lyden er låst til første trykk er løftet. Holder du stikka, kommer lyden sent: vis en liten knapp til lyden går
{
  const pill = document.createElement('button'); pill.id = 'soundPill'; pill.textContent = '🔈 Trykk for lyd';
  pill.style.cssText = 'position:fixed;left:50%;top:max(46px,calc(env(safe-area-inset-top) + 40px));transform:translateX(-50%);z-index:6;display:none;padding:7px 12px;border-radius:999px;border:2px solid #ffa94099;background:#121a2cdd;color:#ffd9a0;font:700 13px system-ui;white-space:nowrap';   // R14: rett under HUD-linja i midten, vekk fra figuren og TA/HOPP; skjules mens infokortet er ute
  document.body.appendChild(pill);
  const t0 = performance.now(); let logged = false;
  const running = () => audio?.ctx?.state === 'running';
  setInterval(() => {
    const ok = running();
    if (ok && !logged) { logged = true; logEv('lyd klar', `${Math.round(performance.now() - t0)} ms etter oppstart`); }
    let inMenu = false; try { inMenu = menuOpen; } catch { /* startskjermen er ikke satt opp ennå */ }
    pill.style.display = !ok && TOUCH && performance.now() - t0 > 1200 && !inMenu && !document.getElementById('infocard')?.classList.contains('show') ? 'block' : 'none';
  }, 400);
}
// iPhone stopper lyden (suspended/interrupted) ved lås eller fanebytte: ta den opp igjen når fanen er synlig, og ved neste trykk (unlockAudio)
document.addEventListener('visibilitychange', () => { if (!audio) return; const a = lifecycle({ unlocked: true, hidden: document.hidden, state: audio.ctx.state }); if (a === 'suspend') audio.suspend(); else if (a === 'resume') audio.resume(); });   // R99: stille i bakgrunnen
addEventListener('pageshow', () => audio?.resume());
// valgfri kamerafølging: kameraet dreier seg langsomt bak figuren når den går (av etter at du selv har dratt i kameraet)
migrateCalm((k, d) => store.get(k, d), (k, v) => store.set(k, v));   // R54: følging av som standard (én gang, også for gammel lagret verdi)
let autoCam = store.get('tlm.follow', false), lastDrag = -99;
function toggleAutoCam() { autoCam = !autoCam; store.set('tlm.follow', autoCam); toast(autoCam ? 'Kamera følger retning' : 'Kamera følger ikke'); const c = document.getElementById('chkAutoCam'); if (c) c.checked = autoCam; }

let vibOn = store.get('tlm.vib', true);
const buzz = (ms) => { if (vibOn && navigator.vibrate) try { navigator.vibrate(ms); } catch { /* ikke støttet */ } };   // Android; iOS Safari støtter ikke vibrasjon

// ---------- innstillinger som flagg (selve lista og panelet står lenger ned: SETTINGS) ----------
let autosaveOn = store.get('tlm.autosave', true), lostReturnOn = store.get('tlm.lostreturn', true), failHintOn = store.get('tlm.failhint', true);
let confirmNewOn = store.get('tlm.confirmnew', true);   // R86: bekreftelse før «Nytt spill» sletter (admin)
let confirm2On = store.get('tlm.confirm2', true), aimThrowOn = store.get('tlm.aimthrow', true), dblTapOn = store.get('tlm.dbltap', true), camRelayOn = store.get('tlm.camrelay', true), camSlop = store.get('tlm.camslop', CAM_SLOP), camHintShown = store.get('tlm.camhint', false);
let showMapBtn = store.get('tlm.showmapbtn2', false), showCenter = store.get('tlm.showcenter2', false),   // v1.35: ◎ og kartknappen er av som standard (nye nøkler, så alle starter uten dem)
   stickDead = store.get('tlm.stickdead', 0.22), btnScale = store.get('tlm.btnscale', 1);
let keyHelpOn = store.get('tlm.keyhelp', false);   // tastehjelp-kortet (PC) er skjult som standard: det forvirret ved start (fra tester: Rune)
let stueHintOn = store.get('tlm.stuehint', true); const stueSeen = new Set();   // R62: Stuen: hint om fjernkontrollen, plata og broen
let slickHintOn = store.get('tlm.slickhint', true);   // glatte flater (R63): hint første gang du sklir
P.slickAccel = +store.get('tlm.slickaccel', P.slickAccel) || P.slickAccel;
let gatesOn = store.get('tlm.gates', true), gateCamOn = store.get('tlm.gatecam', true);   // gåteverktøy (R60)
let puzzlesOn = store.get('tlm.puzzles', true), puzCamOn = store.get('tlm.puzcam', true), bridgeGuide = null;   // nøkkel og lås (R7)
let introSweepOn = store.get('tlm.introsweep', true), introMarkOn = store.get('tlm.intromark', true), introHintOn = store.get('tlm.introhint', true);   // R22: start-lesbarhet (intro.js, intro_view.js)
let repliesOn = store.get('tlm.replies', true);   // svar og tellere fra Claude i ⚑-boksen (R36)
let storyOn = store.get('tlm.story', true);   // fortelling i nivåstart og avslutning (R8)
let shaderWarm = store.get('tlm.shaderwarm', true);   // R35: full tegning av alt under forvarmingen (admin)
let schoolCardOn = store.get('tlm.schoolcard', true);   // R95
let squareTipOn = store.get('tlm.squaretip', true), fagverkCardOn = store.get('tlm.fagverkcard', true);   // R119: firkant-hint i byggeren, og «Prøv Byggeskolen · Fagverk først» på Badebro
let labStart = store.get('tlm.labstart', true), labFree = store.get('tlm.labfree', true), labAuto = { done: false };   // R67: Bygglab: åpne byggeskjermen ved start, ubegrenset mengde av alle deler
GRIDOPT.pass = store.get('tlm.buildgridpass', true) !== false;
let buildPause3d = store.get('tlm.buildpause3d', true), pause3dLogged = false;   // R109: 3D-verdenen tegnes ikke mens byggeskjermen dekker hele skjermen
let buildLoupe = store.get('tlm.buildloupe', true), buildLoupeZoom = normZoom(store.get('tlm.buildloupezoom', 3.75)), buildLoupeSize = normSizePct(store.get('tlm.buildloupesize', 100));   // R106: hjørneglass i byggeskjermen
let buildMirror = store.get('tlm.buildmirror', true);   // R121: speiling og kopi i Rutenett-byggeren (⋯ → SPEIL BYGGET, KOPIER ved valgt del)
let buildSpan = store.get('tlm.buildfromto', true);   // R118: FRA og TIL ved byggestedet (markører i verden, tekst på BYGG-knappen, etiketter i byggeskjermen)
let partsStart = store.get('tlm.partsfromstart', true);   // R120: delene er der fra start; samling er bonus
let buildNext = store.get('tlm.buildnext', true);   // R107: resultatkort med NESTE STED og ▶ i topplinjen i byggeren
let buildSnap = store.get('tlm.buildsnap', true), buildAll = store.get('tlm.buildall', false), buildSlow = store.get('tlm.buildslow', false), buildStrength = store.get('tlm.buildstrength', 1), buildWorld = store.get('tlm.buildworld', true), buildTex = store.get('tlm.buildtex', true), buildSeeHint = store.get('tlm.buildsee', true), buildDbl = store.get('tlm.builddbl', true), buildFine = store.get('tlm.buildfine', true), buildStress = store.get('tlm.buildstress', true), buildBreakFx = store.get('tlm.buildbreakfx', true), buildLego = store.get('tlm.buildlego', true), buildBudget = store.get('tlm.buildbudget', true), buildBonus = store.get('tlm.buildbonus', true), buildBonusStep = +store.get('tlm.buildbonusstep', 1) || 1, buildLoads = store.get('tlm.buildloads', true), buildShare = store.get('tlm.buildshare', true), buildGhost = store.get('tlm.buildghost', false), buildCap = store.get('tlm.buildcap', true), buildTruss = store.get('tlm.buildtruss', true), buildAxial = store.get('tlm.buildaxial', 1), buildGrid = store.get('tlm.buildgrid', true), buildUx = store.get('tlm.buildux', true), buildUxLand = store.get('tlm.buildux.land', true), gridGuide = store.get('tlm.gridguideon', true), buildGridMax = +store.get('tlm.buildgridmax', 6.5) || 6.5, buildGridStress = store.get('tlm.buildgridstress', true), buildGridPeak = store.get('tlm.buildgridpeak', true), buildGridDeck = store.get('tlm.buildgriddeck', true), buildGridGamma = +store.get('tlm.buildgridgamma', 0.5) || 0.5, buildGridSlow = +store.get('tlm.buildgridslow', 0.3), gridStage = store.get('tlm.gridstage', true), gridLock = store.get('tlm.gridlock', true), gridMassK = +store.get('tlm.gridmassk', 1) || 1, gridBudgetK = +store.get('tlm.gridbudgetk', 1) || 1   /* R74: rutenett-oppdrag */ || 0.3;   // R73: farge etter belastning, største belastning, kjøredekk, SLOW   // R72: rutenett-bygging   // R49a2: hjelp for fagverk, knekk-/strekkgrense   // R49a1: «Tåler»-måler;   // R50: deling, beste bygg og spøkelse;   // R47: kostnad/stjerner, smule-ekstradeler; R24: byggeskjermen
let gridPlay = store.get('tlm.gridplay', true), gridPlayLock = store.get('tlm.gridplaylock', true);   // R82: rutenett (MODUS-knappen) i de vanlige byggebrettene, og låsen til første byggested er bestått
let crumbsOn = store.get('tlm.crumbs', true);   // smuler (R3)
let toysOn = store.get('tlm.toys', true);   // R18
TOY.windT = store.get('tlm.toywind', TOY.windT);
COMBO.on = store.get('tlm.combo', COMBO.on); COMBO.vaultAnim = store.get('tlm.vaultanim', COMBO.vaultAnim); COMBO.wetSoft = store.get('tlm.combowet', COMBO.wetSoft); COMBO.pressTo = store.get('tlm.combopress', COMBO.pressTo); COMBO.knotMul = store.get('tlm.comboknot', COMBO.knotMul);   // R41
KICK.on = store.get('tlm.kick', KICK.on); KICK.speed = store.get('tlm.kickspeed', KICK.speed); KICK.up = store.get('tlm.kickup', KICK.up); KICK.safeT = store.get('tlm.kicksafe', KICK.safeT);   // R34
let shimmyOn = store.get('tlm.shimmy', true), rollOn = store.get('tlm.roll', true), carefulOn = store.get('tlm.careful', true), ropeHeavyOn = store.get('tlm.ropeheavy', true);   // R39: finpuss av Prince
for (const [k, id] of [['shimmySpeed', 'shimspeed'], ['rollSafe', 'rollsafe'], ['carefulMul', 'carefulmul'], ['ropeG', 'ropeg'], ['ropePush', 'ropepush'], ['ropeLag', 'ropelag']]) FIN[k] = store.get('tlm.' + id, FIN[k]);
let creaturesOn = store.get('tlm.creatures', true), creatureWarn = store.get('tlm.creaturewarn', 1);   // R19
let waspOn = store.get('tlm.wasp', true), waspLevel = store.get('tlm.wasplevel', 'normal');   // R61: veps som flyr
WASP_TUNE.level = waspLevel;
let antsOn = store.get('tlm.ants', true);   // maur (v0.77)
let goalsOn = store.get('tlm.goals', true), goalArrowOn = store.get('tlm.goalarrow', true), goalLockOn = store.get('tlm.goallock', true);   // delmål (R23)
let shortcutHintOn = store.get('tlm.shortcuthint', true);   // verktøy-genveier (R29): varsel når du bruker en genvei
let rewardsOn = store.get('tlm.rewards', true), rewardsAll = store.get('tlm.rewardsall', false);   // belønninger (R16)
let bossOn = store.get('tlm.boss', true);   // sjef-maur (R9)
let camDistSet = store.get('tlm.camdist', 5.5), hudTech = store.get('tlm.hudtech', false), hudOpen = false, fpsOn = store.get('tlm.fps', false);
// PC (v0.72): PUBG-styring som standard: WASD går, musa ser deg rundt (klikk i bildet låser pekeren), skulderkamera. Gjøres én gang; kan byttes tilbake i ⚙.
if (!TOUCH && !store.get('tlm.pcpubg1', false)) { store.set('tlm.pcpubg1', true); store.set('tlm.preset4', 'pubg'); store.set('tlm.view3', 'shoulder'); store.set('tlm.custom4', {}); }
const DEFAULT_PRESET = TOUCH ? 'mario' : 'pubg', DEFAULT_VIEW = TOUCH ? 'third' : 'shoulder';
let viewMode = new URLSearchParams(location.search).get('view') || store.get('tlm.view3', DEFAULT_VIEW);   // third | shoulder | first (standard fra v0.59: vanlig 3. person med kamera som følger etter)
if (!['third', 'shoulder', 'first'].includes(viewMode)) viewMode = 'shoulder';
let viewFirst = viewMode === 'first', shDist = store.get('tlm.shdist', 3), shOff = store.get('tlm.shoff', 0.5), shSide = store.get('tlm.shside', 'right') === 'left' ? -1 : 1, xhairOn = store.get('tlm.xhair', true);
let edgeGuardOn = store.get('tlm.edgeguard', true), autoJumpOn = store.get('tlm.autojump', true), lookAheadOn = store.get('tlm.lookahead', true), dustOn = store.get('tlm.dust', true), raysOn = store.get('tlm.rays', true), aoOn = store.get('tlm.ao', true), clutterOn = store.get('tlm.clutter', true), softOn = store.get('tlm.softlight', true);   // v0.62: kanthjelp, kamera som ser foran deg, støv i lufta
let airSteadyOn = store.get('tlm.airsteady', true), magnetOn = store.get('tlm.magnet', true), holdGrabOn = store.get('tlm.holdgrab', true);   // v0.65: stabilisering i lufta
let difficulty = normDiff(store.get('tlm.difficulty', DEFAULT_DIFF)), DIF = diffProfile(difficulty);   // R69: hjelpen etter vanskelighet (tabellen i difficulty.js)
let compassMode = store.get('tlm.compassmode', store.get('tlm.compass', true) === false ? 'off' : 'both');   // both | compass | arrow | off
const applyUiFlags = () => { document.body.classList.toggle('nocenter', !showCenter); document.body.classList.toggle('nomapbtn', !showMapBtn || !DIF.minimap); document.body.classList.toggle('nohints', !DIF.hintBubbles); document.documentElement.style.setProperty('--bs', btnScale); $('fps').style.display = fpsOn ? 'block' : 'none'; $('qbtn').style.display = qbtnOn ? 'flex' : 'none'; };

// ---------- hendelseslogg og FPS: brukes i testrapporten ----------
const evLog = store.get('tlm.evlog', []);
let statHook = null;   // R88: settes når statistikken er klar (logEv kan kalles før)
const logEv = (type, detail = '') => { if (type === 'tilbake' && statHook) statHook.back(detail); evLog.push({ c: +clock.toFixed(1), type, detail, pos: [player.x, player.y, player.z].map((v) => +v.toFixed(1)), st: player.state, v: VERSION, lv: levelLabel }); if (evLog.length > 120) evLog.shift(); };
// R86: ved feil under lagring (privat modus, full lagring) sies det én gang; spilleren får også en rød linje på hovedmenyen (saveWarn)
let saveFailNoted = false;
function noteSaveFail(k, e) { if (saveFailNoted) return; try { logEv('lagring', `FEIL ved skriving av ${k}: ${e}`); setTimeout(() => toast(sv(lang, 'sv.fail')), 300); saveFailNoted = true; } catch { /* clock/toast ikke klar ennå: prøver igjen ved neste feil */ } }
const storeNotes = [];   // logges når klokka finnes (logEv bruker clock)
if (!CINE.on) { const mg = migrateAll(store, disk); if (mg.migrated.length || mg.skipped.length) storeNotes.push(`migrert ${mg.migrated.length}${mg.skipped.length ? ', lot stå ' + mg.skipped.length : ''}`); if (!disk.probe()) storeNotes.push('lagring virker ikke på denne enheten'); }
const qFps = +store.get('tlm.qfps', 27) || 27;   // R85: mål-FPS for Auto-oppløsningen (27: målet er 30, og en iPhone i strømsparemodus låst til 30 er frisk)
const fpsW = fpsWatch(qFps, 2000);   // R85: vinduer på 2 s (før 3 s) så Auto reagerer tidligere
const autoQC = createAutoQ({ limit: qFps });      // polish.js: når oppløsningen går ned/opp (testet i test_polish.mjs)
let resQ = store.get('tlm.resq', 'auto'); if (!['auto', 'full', 'mid', 'low'].includes(resQ)) resQ = 'auto';   // R10: auto = følger FPS (ned ved vedvarende lav, opp igjen når det går fint); ellers fast valg
let lowMode = store.get('tlm.lowprofile', 'auto'); if (!['off', 'auto', 'on'].includes(lowMode)) lowMode = 'auto';   // R15 Lav profil: av / auto (når FPS er lav) / på
const texMax = [512, 1024].includes(+store.get('tlm.texmax', TEX_MAX.def)) ? +store.get('tlm.texmax', TEX_MAX.def) : TEX_MAX.def;   // R94: tak på kantlengden til store teksturer (gulv): 512 (standard) eller 1024; laster siden på nytt
const antQv = antQ(store.get('tlm.antdetail', ANT_Q.def));   // R94: maurenes tessellering (som figuren); laster siden på nytt
let shCullOn = store.get('tlm.shcull', true), shRadius = +store.get('tlm.shradius', SHADOW.radius) || SHADOW.radius, shEvery = Math.max(1, Math.min(4, +store.get('tlm.shevery', SHADOW.every) || SHADOW.every));   // R94: skyggekasterne begrenses til nærhet og størrelse; kartet tegnes sjeldnere når alt står stille
let warmSpread = store.get('tlm.warmspread', true);   // R94: forvarmingen i små steg (ett per bilde)
const heroQ = +store.get('tlm.herodetail', 0.6) || 0.6;   // R85: figurens tessellering (1 = full, 0,6 = standard: ca. 40 % færre trekanter i figuren; laster siden på nytt)
const fdDens = +store.get('tlm.fdens', 1) || 1;   // R13: gulvdetaljer (floordetail.js): blyanter, perler, flekker, fugeskitt; tetthet etter rom og kvalitet (halvert med Lav profil «På», tom med Enkel grafikk)
let floorDetailOn = store.get('tlm.floordetail', true);
let pencilSolidOn = store.get('tlm.pencilsolid', true);   // R90: blyanter og viskelær på gulvet er solide
let decorSolidOn = store.get('tlm.decorsolid', true);   // R91: dekor som glass og krukker på hyller har kollisjon
let beadSolidOn = store.get('tlm.beadsolid', true);   // R37: perlene i gulvdetaljene er solide små kuler (kan stås på/glis av)
const legoDens = +store.get('tlm.legodens', 1) || 1; let legoOn = store.get('tlm.lego', true);   // R31: legoknotter på gulv og tak i lekerommet (lekerom_view.js)
const lowP = createLowProfile(); let lowOn = false;
let autoQ = resQ === 'auto', qSteps = 0, basePr = 1, qToasted = false;
const perf = { n: 0, sum: 0, worst: 0, win: 0, winN: 0 };
const fpsRooms = (() => { const o = store.get('tlm.fpsrooms', {}); return o && typeof o === 'object' ? o : {}; })();   // R85: { rom: { n, sum } } på tvers av økter
const fpsRoomsLine = () => { const r = Object.entries(fpsRooms).filter(([, v]) => v && v.n > 60).map(([k, v]) => `${k} ${(1000 * v.n / v.sum).toFixed(0)}`); return r.length ? ` · snitt per rom: ${r.join(', ')}` : ''; };
// R88: anonym statistikk (bare tilfeldig id, versjon, enhetsklasse og spillhendelser; kan slås av i ⚙ → PERSONVERN). Se docs/STATISTIKK.md.
let statsOn = store.get(STATS.onKey, false) === true;   // standard AV: spilleren slår den på selv (valg fra Rune, 2026-11-18)
const sts = createStats({ store, on: () => statsOn, blocked: () => sendBlocked({ cinema: CINE.on || document.body.classList.contains('cinema'), search: location.search }), version: () => VERSION });
const stn = createStatsNet({ stats: sts, logEv });
const roomAgg = createRoomAgg();
const seg = { on: false, t0: 0, broken0: 0, perf0: { n: 0, sum: 0 } };   // pågående brettøkt for statistikken
statHook = { back: (why) => roomAgg.back(why) };
const statLv = () => levelId;
function statsLevelStart() {
  if (seg.on) return; seg.on = true; seg.t0 = clock; seg.broken0 = stats.broken; seg.perf0 = { n: perf.n, sum: perf.sum };
  sts.track('level_start', statLv(), { diff: difficulty });
}
// Avslutter økten: sammendrag av tilbake/fall/knust og snitt-fps for rommet (ett per økt, ikke per bilde)
function statsLevelEnd(kind, extra) {
  if (!seg.on) return; seg.on = false;
  if (kind === 'quit') { const g = LEVEL.goal, st0 = LEVEL.start; sts.track('level_quit', statLv(), { sek: Math.max(0, clock - seg.t0), andel: routeShare(st0, g, [player.x, player.y, player.z]) }); }
  else if (kind === 'complete') sts.track('level_complete', statLv(), extra);
  const bk = roomAgg.take(Math.max(0, stats.broken - seg.broken0)); if (hasBackData(bk)) sts.track('checkpoint_back', statLv(), bk);
  const fps = fpsOf(perf.n - seg.perf0.n, perf.sum - seg.perf0.sum); if (fps) sts.track('fps_room', statLv(), { fps, res: renderer.getPixelRatio() });
}
sts.track('session_start', statLv(), { platform: deviceClass(platform.kind), screen: screenClass(innerWidth, innerHeight), diff: difficulty });
addEventListener('pagehide', () => { statsLevelEnd('quit'); stn.flush('lukket', { unloading: true }); });
addEventListener('error', (e) => { sts.track('js_error', statLv(), { msg: e?.message }); });
addEventListener('pagehide', () => { store.set('tlm.evlog', evLog.slice(-120)); if (perf.n > 30) { const r = fpsRooms[levelId] || { n: 0, sum: 0 }; r.n = Math.min(r.n + perf.n, 20000); r.sum = Math.min(r.sum + perf.sum, 20000 * 40); fpsRooms[levelId] = r; store.set('tlm.fpsrooms', fpsRooms); perf.n = 0; perf.sum = 0; } });

// lydtekst: viser korte tekster for viktige lyder (for hørselshemmede, og når lyden er av). Skritt og pust er utelatt.
let cuesOn = store.get('tlm.cues', false);
function cue(text, pan = 0) {
  if (!cuesOn) return;
  const box = document.getElementById('cues'); if (!box) return;
  const el = document.createElement('div'); el.className = 'cue'; el.textContent = `${pan < -0.3 ? '◀ ' : ''}🔊 ${text}${pan > 0.3 ? ' ▶' : ''}`;
  box.appendChild(el); while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => el.classList.add('out'), 1500); setTimeout(() => el.remove(), 2000);
}
function toggleCues() { cuesOn = !cuesOn; store.set('tlm.cues', cuesOn); toast(cuesOn ? 'Lydtekst på' : 'Lydtekst av'); const c = document.getElementById('chkCues'); if (c) c.checked = cuesOn; }

function toggleSound() {
  soundMuted = !soundMuted; store.set('tlm.muted', soundMuted);
  audio?.setMuted(soundMuted);
  const b = document.getElementById('bSound'); if (b) { b.textContent = soundMuted ? 'Lyd av' : 'Lyd'; b.classList.toggle('on', !soundMuted); }
}

// ---------- poeng ----------
const SCORE = { start: 1000, save: 25, respawn: 10, broken: 5, resetThings: 15, perTenSeconds: 2, hardLand: 3, antHit: 4, crumb: CRUMB.points, carried: 5, boss: 25 };

// ---------- renderer / scene ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = LEVEL.look?.exposure ?? 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcbbfae);
scene.fog = new THREE.Fog(0xcbbfae, 55, 150);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 400);
const EYE_H = 0.8;   // øyehøyde over føttene (enheter)

const sun = new THREE.DirectionalLight(0xffe7c2, LEVEL.look?.sun ?? 3.0);
sun.castShadow = true;
const bigShadow = Math.min(renderer.capabilities.maxTextureSize, 4096);
sun.shadow.mapSize.set(devicePixelRatio > 2 || innerWidth < 700 ? 2048 : bigShadow, devicePixelRatio > 2 || innerWidth < 700 ? 2048 : bigShadow);
const shHalf = devicePixelRatio > 2 || innerWidth < 700 ? 17 : 26;       // v0.76: mindre område rundt deg på mobil = skarpere skygger (færre trappetrinn i kantene)
Object.assign(sun.shadow.camera, { left: -shHalf, right: shHalf, top: shHalf, bottom: -shHalf, near: 1, far: 220 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
const SHADOW_NORMAL = { size: sun.shadow.mapSize.x, near: 1, far: 220 };   // R35: Lav profil bytter størrelse/kamera, ikke castShadow (ellers nye shadere)
scene.add(sun, sun.target);

// ---------- utseende: teksturer med relieff, bøker, kontaktskygger og støv (look.js) ----------
const gfxLow = store.get('tlm.gfx', 'high') === 'low';
if (gfxLow) renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
basePr = renderer.getPixelRatio();   // full oppløsning (autoq går ned fra og opp til denne)
const applyRes = () => { const t = resQ === 'low' ? 1 : resQ === 'mid' ? Math.max(1, Math.round(basePr * 75) / 100) : basePr, np = Math.min(basePr, Math.max(1, t)); if (Math.abs(np - renderer.getPixelRatio()) > 0.005) { renderer.setPixelRatio(np); renderer.setSize(innerWidth, innerHeight, false); } };
if (resQ !== 'auto') applyRes();
const maxAniso = gfxLow ? 4 : Math.min(16, renderer.capabilities.getMaxAnisotropy());
setAniso(maxAniso);
const texLow = gfxLow || lowMode === 'on' || store.get('tlm.texsmall', false) === true;   // R21: små (halve) prosedyreteksturer: Enkel grafikk, Lav profil «På» eller eget valg i ⚙ (kan ikke byttes midt i spillet, så siden lastes på nytt)
setTexLow(texLow);
setDrawerCue(store.get('tlm.drawercue', true) !== false);   // R55: tydelige skuffer (drawers.js), leses før brettet bygges
setAntDetail(antQv);
const look = makeLook({ aniso: maxAniso, low: texLow, texMax });
const gradeMode = store.get('tlm.grade', 'film');   // R1: Toy Story-lys (film) eller opprinnelig lys (off); lys i grade.js
const grade = applyGrade({ renderer, scene, sun, canvas, look: LEVEL.look, mode: gradeMode, low: gfxLow, filterOn: store.get('tlm.gradefilter', true) !== false });
const bigBox = (b, lim = 120) => Array.isArray(b.min) && Array.isArray(b.max) && Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]) > lim;   // store flater: dempet clearcoat, ellers hvite glansflekker
// Blank overflate (clearcoat) er dyrere enn Standard: bare med Grafikk «Detaljert» og ikke «Enkel»
const glossy = (b, o, cc, ccr) => {
  if (gfxLow) return std(o);
  const big = bigBox(b), tall = grade.params.gloss > 1 && bigBox(b, 30);
  if (tall && o.color != null) o = { ...o, color: new THREE.Color(o.color).multiplyScalar(0.8) };   // R1: store lyse flater (kjøleskap) dempes i film-lys, ellers klipper de til hvitt
  const m = new THREE.MeshPhysicalMaterial({ ...o, clearcoat: big ? Math.min(cc, 0.35) : cc, clearcoatRoughness: big ? Math.max(ccr, 0.35) : ccr * (grade.params.gloss > 1 ? 0.4 : 1) });
  if (grade.params.gloss > 1) { m.envMap = scene.environment; m.envMapIntensity = bigBox(b, 30) ? 1 : grade.params.gloss; }   // R1: klarlakken (store flate ting som kjøleskap: ingen ekstra speiling, ellers utbrent hvit) speiler miljøet tydelig (film-gradering)
  return m;
};
const texMat = (set, o = {}) => std({ map: set.map.clone(), normalMap: set.normalMap ? set.normalMap.clone() : null, roughnessMap: set.roughnessMap ? set.roughnessMap.clone() : null, ...o });
const eachMap = (mat, fn) => { for (const k of ['map', 'normalMap', 'roughnessMap']) if (mat[k]) fn(mat[k]); };

// ---------- brettet ----------
const room = LEVEL.room;
const std = (o) => new THREE.MeshStandardMaterial(o);

const tileR = (r) => Math.max(r, grade.params.tileRough || 0);   // R1: fliser matte i film-gradering (ingen utbrent solspeiling)
function material(b) {
  let col = b.color ?? 0xcccccc;
  const kind = b.type === 'floor' || b.type === 'wall' ? `${b.type}:${b.material || 'default'}` : (b.material || b.type);
  const c0 = new THREE.Color(col), tint = gradeTint(levelId, kind, (c0.r + c0.g + c0.b) / 3, gradeMode);   // R1: fargeaksent per rom (bare film)
  if (tint) col = c0.multiply(new THREE.Color(...tint)).getHex();
  switch (kind) {
    case 'floor:default': case 'floor:wood': return texMat(look.floor, { ...(tint ? { color: col } : {}), roughness: 1 });
    case 'floor:tile': return texMat(look.tile, { color: col, roughness: tileR(0.55), ...(grade.params.tileRough ? { roughnessMap: null } : {}) });
    case 'wall:tile': return texMat(look.tile, { color: col, roughness: tileR(0.7), ...(grade.params.tileRough ? { roughnessMap: null } : {}) });
    case 'wall:default': case 'wall:plaster': case 'wall': return texMat(look.plaster, { color: col, roughness: 0.95 });
    case 'woodpanel': return texMat(look.panel, { color: col, roughness: 0.7 });       // stående panelbord
    case 'wood': return texMat(look.wood, { color: col, roughness: 0.55 });
    case 'book': return std({ color: col, roughness: 0.78 });
    case 'plastic': return glossy(b, { color: col, roughness: 0.3, metalness: 0.1 }, 0.7, 0.18);     // R1: blank plast
    case 'porcelain': return glossy(b, { color: col, roughness: 0.1 }, 0.8, 0.12);
    case 'ceramic': return glossy(b, { color: col, roughness: 0.15 }, 0.7, 0.15);
    case 'glass': return new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.04, transparent: true, opacity: 0.4, transmission: 0.6 });
    case 'metal': return std({ color: col, roughness: 0.22, metalness: 1 });
    case 'mirror': return std({ color: 0xffffff, roughness: 0.02, metalness: 1 });
    case 'fabric': return std({ color: col, roughness: 1 });
    case 'wicker': case 'paper': return std({ color: col, roughness: 0.92 });
    default: return std({ color: col, roughness: 0.7 });
  }
}
const woodKinds = new Set(['wood', 'woodpanel']);

// brukslapper: små lapper med bruksanvisning ved ting som kan gjøre noe (brettets `hints`, bl.a. i treningsrommet). Vises når du er nær.
let labelsOn = store.get('tlm.labels', true), markersOn = store.get('tlm.markers', true);
// R66: markørbudsjett (markers_rank.js): høyst 3 (Normal) / 6 (Mye) verdensmarkører samtidig, rangert; Ingen = ingen verdensmarkører
let markRankOn = store.get('tlm.markrank', true), markBudN = store.get('tlm.markbudn', MARK.budgetNormal), markBudM = store.get('tlm.markbudm', MARK.budgetMuch), markMerge = store.get('tlm.markmerge', MARK.merge);
let markInfoNear = store.get('tlm.markinfo', MARK.infoNear), markWear = store.get('tlm.markwear', MARK.wearN), markStallS = store.get('tlm.markstall', MARK.stallMs / 1000), markCalm = store.get('tlm.markcalm', true);
let markPlan = { on: false, allow: new Set(), order: [], primary: null }, goalInfo = { show: false }, markLog = '', markLogAt = 0;
const markUse = (() => { try { const o = store.get('tlm.gripuse', {}); return o && typeof o === 'object' ? o : {}; } catch { return {}; } })();   // grep per flate (nivå:id), til «brukt ofte før»
const markUseKey = (id) => `${levelInfo?.n ?? ''}:${id}`;
let miniOn = store.get('tlm.minimap', null);   // R20: minikart; av som standard på «Enkel» grafikk (eldre telefoner)
const labels = [];
function makeBadge() {                                         // liten «i»-merking som viser at tingen kan gjøre noe
  const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d');
  g.fillStyle = 'rgba(18,26,44,0.92)'; g.beginPath(); g.arc(48, 48, 44, 0, 7); g.fill();
  g.strokeStyle = '#ffa940'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#ffd9a0'; g.font = '700 54px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('i', 48, 52);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, opacity: 0, sizeAttenuation: false }));
  sp.scale.set(0.045, 0.045, 1); sp.renderOrder = 20; sp.visible = false; return sp;
}
// hjelpekort: en skuff som sklir inn fra høyre når du kommer nær noe du ikke har lest om, og sklir ut igjen etter noen sekunder.
// Fliken («i») blir stående ved kanten: trykk på den for å hente teksten frem igjen (for tingen nær deg, ellers den siste).
const infoCard = document.createElement('div'); infoCard.id = 'infocard';
infoCard.innerHTML = '<button id="infotab" aria-label="Bruksanvisning">i</button><div id="infobody"></div>'; document.body.appendChild(infoCard);
const infoBody = infoCard.querySelector('#infobody'), infoTab = infoCard.querySelector('#infotab');
const infoSeen = new Set(); let infoCur = null, infoOpen = false, infoPinned = false, infoT = 0, infoLast = null;
function manualHtml() {
  const v = { jump: TOUCH ? T('btn.jump') : 'Mellomrom', grab: TOUCH ? T('btn.grab') : 'E / Shift', take: TOUCH ? T('btn.take') : 'F', center: TOUCH ? '◎' : 'Z' };
  return `<b>${T('manual.title')}</b>` + ['manual.goal', TOUCH ? 'manual.move.touch' : 'manual.move.pc', 'manual.jump', 'manual.grab', 'manual.take', 'manual.cam', 'manual.menu'].map((k) => `<span>${T(k, v)}</span>`).join('');
}
function openInfo(l, pinned) {                       // l = ting (brukslapp), eller null = den generelle bruksanvisningen
  infoCur = l; if (l) infoLast = l;
  const near = labels.filter((x) => x.d < 13).sort((a, b) => a.d - b.d)[0];
  infoBody.innerHTML = l ? `<button class="ilink" data-i="manual">${T('manual.show')} ›</button><b>${l.title}</b>${l.body ? `<span>${l.body}</span>` : ''}` : `${manualHtml()}${near ? `<button class="ilink" data-i="item">‹ ${T('manual.near')}: ${near.title}</button>` : ''}`;
  infoOpen = true; infoPinned = !!pinned || !l; infoT = pinned || !l ? 14 : 5.5; infoCard.classList.add('show'); if (l) infoSeen.add(l);
  infoCard.classList.toggle('manual', !l);
}
function closeInfo() { infoOpen = false; infoPinned = false; infoCard.classList.remove('show'); }
// fliken: ting nær deg (hvis du ikke har lest den), ellers bruksanvisningen. «›» og «‹» i kortet bytter mellom de to.
infoTab.addEventListener('click', () => { if (infoOpen) { closeInfo(); return; } const n = labels.filter((l) => l.d < 13).sort((a, b) => a.d - b.d)[0]; openInfo(n && !infoSeen.has(n) ? n : null, true); logEv('bruksanvisning'); });
infoBody.addEventListener('click', (e) => {
  const lk = e.target.closest?.('.ilink');
  if (lk) { e.stopPropagation(); if (lk.dataset.i === 'manual') openInfo(null, true); else openInfo(labels.filter((l) => l.d < 13).sort((a, b) => a.d - b.d)[0] || null, true); return; }
  closeInfo();
});
for (const h of LEVEL.hints || []) { const sp = makeBadge(); sp.position.set(...h.pos); scene.add(sp); const [title, ...rest] = h.text.split('\n'); labels.push({ sp, pos: h.pos, title, body: rest.join(' ') }); }
const cardSeen = (add) => { const k = `tlm.cardseen.${levelId}`; let a = store.get(k, []); if (!Array.isArray(a)) a = []; if (add !== undefined && !a.includes(add)) { a.push(add); store.set(k, a); } return a; };
let infoPrev = performance.now();
function updateLabels() {
  const now = performance.now(), dt = Math.min(0.1, (now - infoPrev) / 1000); infoPrev = now;
  let near = null;
  for (const l of labels) { l.d = Math.hypot(player.x - l.pos[0], player.z - l.pos[2], (player.y - l.pos[1]) * 0.5); if (!near || l.d < near.d) near = l; }
  const on = labelsOn && DIF.infoMarks && mode === 'play' && labels.length > 0, tabOn = mode === 'play' && !won && DIF.helpCards !== 'off';   // R69: Ekspert har ingen ℹ-kort
  for (const [li, l] of labels.entries()) {
    const rkOk = !markPlan.on || markPlan.allow.has(`info:${li}`), rng = markPlan.on ? markInfoNear : 13;   // R66: ⓘ bare når den er valgt av rangeringen (nær, ulest, ingen annen markør konkurrerer)
    const o = on && rkOk && !(mv && mv.covered(l.pos[0], l.pos[1], l.pos[2])) ? Math.max(0, Math.min(1, (rng - l.d) / 4)) : 0;   // R14: ikke bak knapper
    l.sp.material.opacity += (o - l.sp.material.opacity) * 0.2; l.sp.visible = l.sp.material.opacity > 0.03;
  }
  infoCard.style.display = tabOn ? '' : 'none';
  if (!tabOn) { if (infoOpen) closeInfo(); return; }
  infoTab.classList.toggle('dim', false);
  if (!labelsOn || mode !== 'play' || labels.length === 0) { if (infoOpen) { infoT -= dt; if (infoT <= 0) closeInfo(); } return; }
  const nIdx = near ? labels.indexOf(near) : -1, firstTime = DIF.helpCards !== 'first' || !cardSeen().includes(nIdx);   // R69: Medium: kortet skyves bare inn første gang (husket per brett)
  if (!infoOpen && near && near.d < 5.5 && !infoSeen.has(near) && firstTime) { openInfo(near, false); if (DIF.helpCards === 'first') cardSeen(nIdx); }              // første gang du kommer nær: skyv inn
  if (infoOpen) {
    infoT -= dt;
    if (infoPinned && infoCur ? infoCur.d > 9 : infoT <= 0) closeInfo();                          // lest ferdig eller gått bort
  }
}

const nice = (id) => (id && (LEVEL.hints || []).find((h) => h.id === id)?.text.split('\n')[0]) || id || 'flaten';   // pent navn til hint-linja når brettet har en lapp for tingen

// grep-kode: alt som kan klatres i har en varm oransje kant (alltid litt synlig); «Fremhev grep» i ⚙ gjør dem tydeligere og pulserende
let gripHi = store.get('tlm.griphi', false);
const gripMarks = [];
function gripMark(b) {
  const sx = b.max[0] - b.min[0] + 0.08, sy = b.max[1] - b.min[1] + 0.08, sz = b.max[2] - b.min[2] + 0.08;
  const g = new THREE.Group(), cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2, cz = (b.min[2] + b.max[2]) / 2;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(sx, sy, sz)), new THREE.LineBasicMaterial({ color: 0xffa940, transparent: true, opacity: 0.6 }));
  const glow = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.06, sy + 0.06, sz + 0.06), new THREE.MeshBasicMaterial({ color: 0xffa940, transparent: true, opacity: 0.2, depthWrite: false }));
  g.add(edges, glow); g.position.set(cx, cy, cz); scene.add(g);
  const m = { g, edges, glow }; gripMarks.push(m); return m;
}

// synlige objekter per kollisjonsboks: brukes til å tone ut ting som står mellom kamera og figur
const fadeEntries = [];
const regFade = (obj, boxes, extra = []) => { if (boxes.some((b) => b.type !== 'floor')) fadeEntries.push({ obj: [obj, ...extra], boxes: boxes.filter((b) => b.type !== 'floor'), t: 0, orig: new Map(), clone: new Map() }); };

// ting som består av flere bokser (do, badekar …) tegnes som én ekte form; kollisjonen er fortsatt boksene
const drawn = new Set(); let hasToilet = false;
{
  const groups = new Map();
  for (const b of LEVEL.boxes) if (b.group) { if (!groups.has(b.group)) groups.set(b.group, []); groups.get(b.group).push(b); }
  for (const [, members] of groups) {
    const o = buildGroup(members); if (!o) continue;
    scene.add(o); members.forEach((m) => drawn.add(m)); regFade(o, members);
    if (members.some((m) => m.kind === 'toilet_tank')) hasToilet = true;
  }
}
const csHolder = new THREE.Group(); scene.add(csHolder);   // kontaktskygger samles her så de kan slås sammen til noen få tegnekall (R15)
const pressViews = [];   // R41: papirhauger som kan presses sammen (tegnes om i høyden)
let bookN = 0; const col0 = (b) => b.color ?? 0xcccccc;
for (const b of LEVEL.boxes) {
  if (drawn.has(b)) continue;
  const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
  const cx = b.min[0] + sx / 2, cy = b.min[1] + sy / 2, cz = b.min[2] + sz / 2;
  const shaped = b.kind && b.type !== 'floor' && b.type !== 'wall' && !b.dyn ? buildSingle(b.kind, [sx, sy, sz], { color: b.color, id: b.id, material: b.material, drawer: b.drawer }) : null;
  if (b.grip) gripMark(b);
  if (shaped && b.compress) { const w = new THREE.Group(); w.position.set(cx, cy, cz); w.add(shaped); scene.add(w); regFade(shaped, [b]); pressViews.push({ b, mesh: w, h0: sy }); continue; }   // R41: egen innpakning som skaleres i høyden (kan ikke slås sammen med resten)
  if (shaped) { shaped.position.set(cx, cy, cz); scene.add(shaped); regFade(shaped, [b]); continue; }
  if (b.type !== 'floor' && b.type !== 'wall' && !b.dyn && Math.min(sx, sz) > 0.4 && LEVEL.boxes.some((c) => c !== b && !c.dyn && Math.abs(c.max[1] - b.min[1]) < 0.05 && c.min[0] < b.max[0] && c.max[0] > b.min[0] && c.min[2] < b.max[2] && c.max[2] > b.min[2])) {
    const cs = look.contactShadow(sx, sz, Math.max(0.3, Math.min(0.9, Math.min(sx, sz) * 0.35))); cs.position.set(cx, b.min[1] + 0.02, cz); csHolder.add(cs);   // myk mørk kant der tingen står
  }
  if (b.type === 'book' && !b.material) {                    // bok: permer med tittel, avrundet rygg og sideblokk
    const bk = look.buildBook(sx, sy, sz, col0(b), ++bookN); bk.position.set(cx, cy, cz); scene.add(bk); regFade(bk, [b]); continue;
  }
  const mat = material(b);
  const tiled = b.material === 'tile';
  if (b.type === 'floor') {
    const rep = tiled ? 4 : 18;
    eachMap(mat, (t) => { t.repeat.set(sx / rep, sz / rep); if (tiled) { t.center.set(0.5, 0.5); t.rotation = room.floor?.diagonal ? Math.PI / 4 : 0; } });
  } else if ((b.material || b.type) === 'woodpanel') {
    eachMap(mat, (t) => t.repeat.set(Math.max(sx, sz) / 9.6, sy / 9.6));           // fire bord per 48 cm
  } else if (woodKinds.has(b.material || b.type)) {
    eachMap(mat, (t) => t.repeat.set(Math.max(1, Math.max(sx, sz) / 8), Math.max(1, sy / 8)));
  } else if (b.type === 'wall') {
    eachMap(mat, (t) => (tiled ? t.repeat.set(Math.max(sx, sz) / 4, Math.max(1, sy / 4)) : t.repeat.set(Math.max(sx, sz) / 10, 8)));
  }
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  m.position.set(cx, cy, cz);
  m.castShadow = b.type !== 'floor' && b.type !== 'wall' && b.material !== 'glass'; m.receiveShadow = true;
  scene.add(m);
  regFade(m, [b]);
}

// sokkellist (kun med malte vegger), tak og vinduer
{
  const w = room.x1 - room.x0, d = room.z1 - room.z0, ox = (room.x0 + room.x1) / 2, oz = (room.z0 + room.z1) / 2;
  if (room.walls?.material !== 'tile' && !levelName) {
    // fotlist (12 cm) og taklist (hulkil) langs alle fire vegger, med profil (listverk.js-former i props.js)
    const cl = 0xf3efe6, H0 = 2.4, TH = 1.0;
    for (const [kind, sx, sy, sz, x, y, z, ry] of [
      ['fotlist', w, H0, 0.55, ox, H0 / 2, room.z0 + 0.275, 0], ['fotlist', w, H0, 0.55, ox, H0 / 2, room.z1 - 0.275, Math.PI],
      ['fotlist', 0.55, H0, d, room.x0 + 0.275, H0 / 2, oz, 0], ['fotlist', 0.55, H0, d, room.x1 - 0.275, H0 / 2, oz, Math.PI],
      ['taklist', w, TH, TH, ox, room.height - TH / 2, room.z0 + TH / 2, 0], ['taklist', w, TH, TH, ox, room.height - TH / 2, room.z1 - TH / 2, Math.PI],
      ['taklist', TH, TH, d, room.x0 + TH / 2, room.height - TH / 2, oz, 0], ['taklist', TH, TH, d, room.x1 - TH / 2, room.height - TH / 2, oz, Math.PI],
    ]) {
      const t = buildSingle(kind, [sx, sy, sz], { color: cl }); if (!t) continue;
      t.position.set(x, y, z); t.rotation.y = ry; scene.add(t);
    }
  }
  const ceilMat = room.ceiling?.material === 'woodpanel'
    ? texMat(look.panel, { color: hexNum(room.ceiling.color), roughness: 0.7 })
    : std({ color: 0xf5f1e8, roughness: 1 });
  eachMap(ceilMat, (t) => t.repeat.set(w / 9.6, d / 9.6));
  {                                                            // mørkere inn mot veggene, der gulv og vegg møtes
    const fy = Math.max(0, ...LEVEL.boxes.filter((b) => b.type === 'floor').map((b) => b.max[1])) + 0.02, sw = Math.min(4, Math.min(w, d) * 0.12);
    for (const [len, x, z, rz] of [[w, ox, room.z0 + sw / 2, 0], [w, ox, room.z1 - sw / 2, Math.PI], [d, room.x0 + sw / 2, oz, Math.PI / 2], [d, room.x1 - sw / 2, oz, -Math.PI / 2]]) {
      const es = look.edgeShade(len, sw); es.rotation.set(-Math.PI / 2, 0, rz); es.position.set(x, fy, z); scene.add(es);
    }
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(ox, room.height, oz); ceil.receiveShadow = true; scene.add(ceil);

  const frameMat = std({ color: 0xf0ead8, roughness: 0.5 });
  frameMat.polygonOffset = true; frameMat.polygonOffsetFactor = 2; frameMat.polygonOffsetUnits = 2;       // v0.87: rammen ligger i samme høyde som vinduskarmen (flimret der du står); karmen vinner nå
  for (const win of LEVEL.windows || []) {
    const g = new THREE.Group(); g.position.set(...win.pos);
    g.rotation.y = { N: 0, S: Math.PI, E: -Math.PI / 2, W: Math.PI / 2 }[win.wall] ?? 0;
    const [ww, wh] = win.size;
    const skyPane = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ map: look.skyTex(), color: 0xc4cfe0, toneMapped: false })); skyPane.userData.win = true; g.add(skyPane);   // win: stemningen (variant_view.js) farger himmelen
    for (const [x, y, sx, sy] of [[0, wh / 2 + 0.4, ww + 1.6, 0.8], [0, -wh / 2 - 0.4, ww + 1.6, 0.8], [-ww / 2 - 0.4, 0, 0.8, wh], [ww / 2 + 0.4, 0, 0.8, wh], [0, 0, 0.4, wh]]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 0.7), frameMat); f.position.set(x, y, 0.3); g.add(f);
    }
    for (const [sx, sy, x, y] of [[ww + 3.2, 1.2, 0, wh / 2 + 1.4], [ww + 3.2, 1.2, 0, -wh / 2 - 1.4], [1.2, wh + 0.4, -ww / 2 - 1.4, 0], [1.2, wh + 0.4, ww / 2 + 1.4, 0]]) {      // gerikt rundt vinduet
      const ge = buildSingle('gerikt', [sx, sy, 0.35], { color: 0xf3efe6 }); if (ge) { ge.position.set(x, y, 0.2); g.add(ge); }
    }
    scene.add(g);
  }
}
function hexNum(h) { return typeof h === 'number' ? h : parseInt(String(h).replace('#', ''), 16); }

for (const d of LEVEL.decor || []) {
  const sg = d.kind && buildSingle(d.kind, d.size, { color: d.color, id: d.id, material: d.material, drawer: d.drawer });
  if (sg) { sg.position.set(...d.pos); scene.add(sg); continue; }
  const geo = d.shape === 'sphere' ? new THREE.SphereGeometry(d.size[0], 16, 12) : new THREE.BoxGeometry(...d.size);
  const mat = d.emissive !== undefined || d.metal !== undefined
    ? std({ color: d.color, emissive: d.emissive ?? 0, roughness: d.rough ?? 0.5, metalness: d.metal ?? 0 })
    : material({ type: d.material || 'plastic', material: d.material, color: d.color });
  if (d.material === 'woodpanel') eachMap(mat, (t) => t.repeat.set(Math.max(d.size[0], d.size[2]) / 9.6, d.size[1] / 9.6));
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...d.pos); m.castShadow = d.material !== 'mirror'; m.receiveShadow = true; scene.add(m);
}

for (const h of LEVEL.hazards || []) {   // litt synlig vann i do-skålen
  if (h.type !== 'flush' || hasToilet) continue;
  const r = Math.min(h.max[0] - h.min[0], h.max[2] - h.min[2]) / 2 - 0.3;
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.05, 24), new THREE.MeshStandardMaterial({ color: 0x5a8fa8, roughness: 0.05, transparent: true, opacity: 0.8 }));
  disc.position.set((h.min[0] + h.max[0]) / 2, 2.2, (h.min[2] + h.max[2]) / 2); scene.add(disc);
}

// tau
const ropeMat = new THREE.MeshStandardMaterial({ color: 0x3a2f28, roughness: 0.9 });
const Y = new THREE.Vector3(0, 1, 0);
function makeCyl(r) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8), ropeMat); m.castShadow = true; scene.add(m); return m; }
function setCyl(m, a, b) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, len, 1);
  m.quaternion.setFromUnitVectors(Y, d.normalize());
}
const ropes = LEVEL.ropes.map((r) => {
  const top = makeCyl(0.05), line = makeCyl(0.09);
  setCyl(top, new THREE.Vector3(r.x, LEVEL.room.height, r.z), new THREE.Vector3(r.x, r.y, r.z));
  const end = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), new THREE.MeshStandardMaterial({ color: 0xc1121f, roughness: 0.4 }));
  end.castShadow = true; scene.add(end);
  return { r, line, end };
});

// kastebue: vises mens du lader opp et kast (hold F)
const ARC_N = 28;
const arcGeo = new THREE.BufferGeometry(); arcGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARC_N * 3), 3));
const arc = new THREE.Line(arcGeo, new THREE.LineBasicMaterial({ color: 0xffd23f }));
arc.frustumCulled = false; arc.visible = false; scene.add(arc);
function updateArc() {
  const p = player, b = p.carry;
  if (!b || p.charge < P.throwMin || mode !== 'play') { arc.visible = false; return; }
  const k = Math.min(1, (p.charge - P.throwMin) / P.throwFull), v = throwVelocity(p, k), a = arcGeo.attributes.position, h = 0.05;
  let x = (b.min[0] + b.max[0]) / 2, y = (b.min[1] + b.max[1]) / 2, z = (b.min[2] + b.max[2]) / 2, vy = v.vy, n = 0;
  for (; n < ARC_N; n++) {
    a.setXYZ(n, x, y, z);
    vy += P.gravity * h; x += v.vx * h; y += vy * h; z += v.vz * h;
    if (insideAny(x, y, z, 0)) { n++; break; }
  }
  a.needsUpdate = true; arcGeo.setDrawRange(0, Math.max(2, n)); arc.visible = true;
}

// mål: flaske
const goal = new THREE.Group();
const glass = new THREE.MeshPhysicalMaterial({ color: 0x77ffd0, emissive: 0x1fbf90, emissiveIntensity: 0.9, roughness: 0.1, transmission: 0.2, transparent: true, opacity: 0.9 });
goal.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.72, 1.1, 20), glass));
const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.3, 0.5, 14), glass); neck.position.y = 0.78; goal.add(neck);
const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.2, 12), new THREE.MeshStandardMaterial({ color: 0xa9774b, roughness: 0.9 })); cork.position.y = 1.12; goal.add(cork);
goal.position.set(...LEVEL.goal); scene.add(goal);
const glow = new THREE.PointLight(0x66ffcc, 30, 14); glow.position.y = 1; goal.add(glow);
// målfyr (v0.69): en lyssøyle fra gulv til tak ved målet og en glorie på selve målet, så du finner det når du ser deg rundt (skjules av ting som står foran)
let beaconOn = store.get('tlm.beacon', true);
const beacon = new THREE.Group(); beacon.position.set(LEVEL.goal[0], LEVEL.goal[1], LEVEL.goal[2]); scene.add(beacon);
{
  const bh = Math.max(12, (LEVEL.room?.height ?? 60) - LEVEL.goal[1] - 0.5);
  const gc = document.createElement('canvas'); gc.width = 8; gc.height = 128; { const g = gc.getContext('2d'), lg = g.createLinearGradient(0, 0, 0, 128); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.35, 'rgba(255,255,255,.55)'); lg.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = lg; g.fillRect(0, 0, 8, 128); }
  const gt = new THREE.CanvasTexture(gc), bm = (o) => new THREE.MeshBasicMaterial({ color: 0x19d79a, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, ...o });   // vanlig blanding (ikke additiv): synes også mot hvite fliser
  const geo = new THREE.CylinderGeometry(1.1, 0.45, bh, 20, 1, true); geo.translate(0, bh / 2, 0);
  const core = new THREE.Mesh(geo, bm({ opacity: 0.5, map: gt })); core.renderOrder = 6;
  const fh = bh + LEVEL.goal[1], full = new THREE.CylinderGeometry(0.9, 0.9, fh, 20, 1, true); full.translate(0, bh - fh / 2, 0);                 // helt fra gulvet til taket, så den er i synsfeltet uansett hvor høyt målet ligger
  const ghost = new THREE.Mesh(full, bm({ opacity: 0.3 })); ghost.renderOrder = 7;                                      // skjules av det som står foran (v0.70: ikke lenger synlig gjennom ting)
  const hc = document.createElement('canvas'); hc.width = hc.height = 128; { const g = hc.getContext('2d'), rg = g.createRadialGradient(64, 64, 2, 64, 64, 62); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.25, 'rgba(60,235,170,.85)'); rg.addColorStop(1, 'rgba(25,215,154,0)'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; for (const a of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) { g.beginPath(); g.moveTo(64 - Math.cos(a) * 58, 64 - Math.sin(a) * 58); g.lineTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58); g.stroke(); } }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(hc), color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false, sizeAttenuation: false, fog: false }));
  halo.scale.setScalar(0.14); halo.position.y = 0.9; halo.renderOrder = 8;
  beacon.add(core, ghost, halo); beacon.userData = { core, ghost, halo };
}

// lagringsflagg og målring (R11: markers.js)
const flagV = buildFlag(scene, { low: gfxLow }), goalRing = buildGoalRing(scene, LEVEL.goal, { low: gfxLow });

// ---------- figur ----------
if (!gfxLow) look.detailize(scene);                                   // fint korn på alle flater i brettet (v0.76)
look.heroQ = heroQ;   // R85: tessellering av figuren (SETTINGS «herodetail»)
const hero = buildHero(look);
scene.add(hero.root);
const heroArt = (pose) => (rewardsOn ? previewSVG(getEquipped(store, rewardsAll), pose) : heroSVG(pose));   // R16: figuren med valgt tilbehør også på introkort og målskjerm
const refreshAccessories = () => applyAccessories(hero, rewardsOn ? getEquipped(store, rewardsAll) : {});   // R16: valgt tilbehør på figuren
refreshAccessories();
// rund skygge under figuren (som i Mario: viser hvor du lander) og landingsmarkør når du faller
const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const flatMat = (o) => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide, ...o });
const blob = new THREE.Mesh(new THREE.CircleGeometry(1, 28), flatMat({ map: blobTex })); blob.rotation.x = -Math.PI / 2; blob.renderOrder = 2; blob.visible = false; scene.add(blob);
const landRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 40), flatMat({ color: 0xffffff })); landRing.rotation.x = -Math.PI / 2; landRing.renderOrder = 3; landRing.visible = false; scene.add(landRing);
// R28: terskler for landingsklassene (uendelige i Klassisk/Snappy = alltid myk) og glatt synsfelt-økning i fall
const landTh = () => [Number.isFinite(P.hardLand) ? P.hardLand : Infinity, Number.isFinite(P.knockV) ? P.knockV : Infinity];
let landWarn = store.get('tlm.landwarn', true), landFovMax = store.get('tlm.landfov', 6), landWindMul = store.get('tlm.landwind', 1), landMinV = store.get('tlm.landmin', 9), landFovCur = 0;
function updateBlob(now) {
  const p = player, off = () => { blob.visible = landRing.visible = false; };
  if (!blobOn || mode !== 'play' || ['climb', 'hang', 'swing', 'zip', 'mantle'].includes(p.state)) return off();
  const s = surfaceBelow(LEVEL, p.x, p.y + 0.05, p.z, 0.3); if (!s) return off();
  const h = Math.max(0, p.y - s.top); if (h > 40) return off();
  const r = 0.42 + 0.03 * Math.min(h, 12);
  blob.visible = true; blob.position.set(p.x, s.top + 0.03, p.z); blob.scale.setScalar(r * 1.15); blob.material.opacity = 0.8 * (1 - Math.min(0.75, h / 16));
  const falling = !p.onGround && p.vy < -3 && h > 1.2;
  if (!falling || !DIF.landingMarker) { landRing.visible = false; return; }
  const [hv, dv] = landTh(), v = impactAt(p.vy, h, P.gravity, s.soft, P.softFactor), cls = landClass(v, hv, dv), ms = markerStyle(cls, now);
  landRing.visible = true; landRing.position.set(p.x, s.top + 0.05, p.z); landRing.material.color.setHex(ms.color);
  landRing.scale.setScalar(ms.scale); landRing.material.opacity = ms.opacity;
}

// To-ledds bein-IK i sagittalplanet: gitt hoftehøyde og ankelens posisjon (z fremover, y opp) → hofte- og kneledd.
const ANKLE_H = 0.037;                       // ankel over såle (rig-lokalt)
function solveLeg(leg, hipY, z, ankleY) {
  const l1 = leg.l1, l2 = leg.l2, dy = ankleY - hipY;
  const d = Math.min(Math.max(Math.hypot(z, dy), Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-4);
  const clamp1 = (v) => Math.max(-1, Math.min(1, v));
  const kappa = Math.PI - Math.acos(clamp1((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2)));   // knebøy
  const beta = Math.acos(clamp1((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const theta = Math.atan2(-z, -dy) - beta;                                                  // lår (negativ = fremover)
  return { theta, kappa };
}
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth3 = (x) => x * x * (3 - 2 * x);
// Fotbane over ett skrittløp (u = 0..1). Standfasen går bakover like fort som kroppen går fremover, så foten står fast.
function footPath(u, s, A, lift) {
  const um = (u + s / 2) % 1;
  if (um < s) return { z: A - 2 * A * (um / s), y: 0, pitch: 0 };
  const v = (um - s) / (1 - s), e = smooth3(v);
  // tåen peker litt ned når foten løftes og litt opp rett før hælen treffer
  const pitch = 0.35 * smooth3(clampN(v / 0.2, 0, 1)) * (1 - smooth3(clampN((v - 0.2) / 0.4, 0, 1))) - 0.3 * smooth3(clampN((v - 0.7) / 0.3, 0, 1));
  // svingen starter og slutter med samme fart som foten har mot gulvet (Hermite) → ingen knekk ved tåavspark og hælstrøk
  const T = -2 * A * (1 - s) / s, v2 = v * v, v3 = v2 * v;
  const z = A * (-1 + 6 * v2 - 4 * v3) + T * (2 * v3 - 3 * v2 + v);
  return { z, y: lift * Math.sin(Math.PI * v), pitch };
}

function footstep(side, sp) {
  if (!audio) return;
  audio.step(surfaceOf(player.groundBox), Math.max(0.2, Math.min(1, 0.3 + 0.7 * sp / P.speed)), side);
}

const react = createReact();      // reaksjoner på maur (polish.js): jubel ved knus, rykk ved støt
const footSm = { L: 0, R: 0 };   // glattet fothøyde over trinn/kanter
const turnSteps = createTurnSteps(), stepOverAnim = createStepOver();   // R40 (hero_move.js): snu med skritt, tråkke over hinder
const DIP_MAX = 0.17;   // hvor mye hoftene kan synke i hurk (landing/forberedelse)

let vaultNow = null;   // R41: stavhopp-posen akkurat nå (eller null)
function poseHero(p, now, dt, mode) {
  vaultNow = isVaulting(p, COMBO.vaultAnim) && mode === 'play' ? vaultPose(p) : null;
  if (vaultNow && !hero.vaultLogged) { hero.vaultLogged = true; logEv('kombo', 'stavhopp'); } else if (!vaultNow) hero.vaultLogged = false;
  const c = hero.cur, sp = Math.hypot(p.vx, p.vz), sec = now / 1000;
  const T = { aL: 0, aR: 0, zL: 0.06, zR: -0.06, eL: -0.15, eR: -0.15, hL: 0, hR: 0, kL: 0, kR: 0, lean: 0, chest: 0, twist: 0, hy: 0, hp: 0, fp: 0, lzL: 0, lzR: 0, roll: 0, sway: 0, fgL: 0.35, fgR: 0.35 };
  let bob = 0;
  // v0.86: levende grep: tid siden hånden ble rakt ut, og et «fang»-støt når du tar tak (kroppen tar imot, albuene bøyes, bena svinger)
  { const gripSt = p.state === 'climb' || p.state === 'hang';
    if (gripSt && hero.pst !== 'climb' && hero.pst !== 'hang') hero.catchT = 1;
    hero.pst = p.state; hero.catchT = Math.max(0, (hero.catchT || 0) - dt / 0.55);
    hero.reachT = p.reach > 0 ? (hero.reachT || 0) + dt : 0; }
  // stå stille i 3 s: figuren snur seg mot kameraet og blunker (bare i skulder-/3. persons-visning med PUBG-styring)
  { const [ix, iz] = axes(), idleIn = Math.hypot(ix, iz) < 0.05, ok = idleWink && P.faceCam && !viewFirst && mode === 'play' && !won && p.onGround && p.state === 'ground' && !p.carry && Math.hypot(p.vx, p.vz) < 0.15 && idleIn && p.recover <= 0;
    hero.stillT = ok ? (hero.stillT || 0) + dt : 0;
    const want = ok && hero.stillT > 3 ? 1 : 0;
    hero.camTurn = (hero.camTurn || 0) + (want - (hero.camTurn || 0)) * (1 - Math.exp(-dt / (want ? 0.28 : 0.14)));
    if (want && hero.camTurn > 0.9 && !hero.winked) { hero.winked = true; setMood('wink', 1.5); say('wink'); logEv('blunker'); }
    if (!ok) hero.winked = false; }

  // akselerasjon langs blikkretningen: fremover når du setter fart, bakover når du bremser
  if (!hero.pv) hero.pv = [p.vx, p.vz];
  const acc = ((p.vx - hero.pv[0]) * p.fx + (p.vz - hero.pv[1]) * p.fz) / Math.max(dt, 1e-3);
  hero.pv = [p.vx, p.vz];
  hero.accLean += (clampN(acc * 0.012, -0.3, 0.3) - hero.accLean) * (1 - Math.exp(-dt / 0.15));

  // fotbaner fra fysikkens skrittfase (samme distanse som kroppen faktisk har gått → ingen gliding)
  // Mario-stil (v0.62): også her settes føttene fast i gulvet. Skrittfasen følger distansen figuren faktisk har gått, og skrittene blir lengre (med svev) når han løper.
  const ownGait = !P.gaitMode && !P.faceCam, ikGait = P.gaitMode || ownGait, yawRate = hero.yawRate || 0;
  if (ownGait) {
    hero.stepLen = clampN(0.3 + 0.19 * sp, 0.3, 1.15);
    const walking = p.onGround && p.state === 'ground' && mode !== 'fly';
    if (walking && sp > 0.05) hero.gph = (hero.gph + Math.PI * sp * dt / hero.stepLen) % (Math.PI * 2);
    else if (walking && Math.abs(yawRate) > 1.2) hero.gph = (hero.gph + Math.abs(yawRate) * dt * 1.7) % (Math.PI * 2);   // snur på stedet: små skritt
  }
  const gph = P.gaitMode ? p.gait : hero.gph, stepLen = P.gaitMode ? p.stepLen : (hero.stepLen || 0.3);
  const A_MAX = 0.25, kSp = clampN(sp / P.speed, 0, 1), SL = 2 * stepLen;
  const sFrac = Math.max(ownGait ? 0.2 : 0.28, Math.min(0.64, 2 * A_MAX / SL)), A = sFrac * SL / 2, lift = ownGait ? 0.03 + 0.1 * kSp : 0.025 + 0.06 * kSp;
  const u = (gph / (Math.PI * 2)) % 1, idleW = clampN(1 - sp / 0.35, 0, 1);
  const pathL = footPath(u, sFrac, A, lift), pathR = footPath((u + 0.5) % 1, sFrac, A, lift);
  for (const f of [pathL, pathR]) { f.z *= 1 - idleW; f.y *= 1 - idleW; f.pitch *= 1 - idleW; }
  if (ownGait && p.onGround && !turnStepsOn) { const tw = idleW * clampN((Math.abs(yawRate) - 1) / 3, 0, 1), sn = Math.sin(gph); pathL.y += 0.035 * tw * Math.max(0, sn); pathR.y += 0.035 * tw * Math.max(0, -sn); }   // løfter føttene når han snur seg på stedet
  const gaitN = { L: pathL.z / (A + 1e-6), R: pathR.z / (A + 1e-6) };
  pathL.z /= RIG_S; pathR.z /= RIG_S;          // rig-lokalt: figuren er skalert, så foten må flyttes tilsvarende mindre
  const gaitOn = ikGait && mode !== 'fly' && p.state === 'ground' && p.onGround && !p.skid;
  // føtter som tilpasser seg trinn: hver fot løftes/senkes til flaten den faktisk treffer (bare i svingfasen og i standfasen, begrenset)
  { const vs = Math.hypot(p.vx, p.vz), dx = vs > 0.12 ? p.vx / vs : Math.sin(hero.yaw), dz = vs > 0.12 ? p.vz / vs : Math.cos(hero.yaw);
    for (const [key, f] of [['L', pathL], ['R', pathR]]) {
      let off = 0;
      if (gaitOn && stepAdapt && vs > 0.12 && f.y > 0.004) {            // svingfoten kikker litt fremover og går opp på/ned fra det den ser komme
        const d = 0.6 + 0.2 * clampN(f.z * RIG_S, 0, 0.3), sf = surfaceBelow(LEVEL, p.x + dx * d, p.y + 0.3, p.z + dz * d, 0.04);
        off = stepOffset(sf ? sf.top : null, p.y) * clampN(f.y / 0.02, 0, 1);
      }
      footSm[key] += (off - footSm[key]) * (1 - Math.exp(-dt / 0.04));
      f.y += footSm[key] / RIG_S; f.pitch += -footSm[key] * 0.8;
    } }
  // R40: snu på stedet med små skritt (annenhver fot løftes og svinger ut), og tråkke over små hindre (fremste fot løftes over kanten)
  { const standing = ownGait && gaitOn && sp < MOVE.standSpeed && mode === 'play';
    const ts = turnSteps.update(dt, { yawRate, standing, on: turnStepsOn });
    if (ts.stepped) logEv('snusteg', `${ts.dir > 0 ? 'venstre' : 'høyre'} #${ts.steps}`);
    if (ts.active) { pathL.y += ts.liftL; pathR.y += ts.liftR; T.lzL = ts.spreadL; T.lzR = ts.spreadR; T.twist += ts.twist; }
    if (stepOverOn && p.stepDy > 0 && gaitOn && stepOverAnim.trigger(p.stepDy, Math.max(P.stepUp, MOVE.stepOverMax))) logEv('trinn', `${p.stepDy.toFixed(2)} over hinder`);
    const so = stepOverAnim.update(dt);
    if (so.active) { const lf = Math.min(so.lift, 0.3) / RIG_S; (so.foot ? pathR : pathL).y += lf; (so.foot ? pathL : pathR).y += lf * 0.35; T.lean += so.lean; } }

  // hurk: forberedelse før hopp (armene bak) og demping etter landing (armene frem). 0 = oppreist, 1 = dypt.
  const wDF = p.windup > 0 ? smooth3(clampN((P.jumpWindup - p.windup) / 0.07, 0, 1)) : 0;
  const li = clampN((p.landImpact - 3) / 18, 0, 1);
  const lDF = li * (p.landT < 0.06 ? p.landT / 0.06 : Math.exp(-(p.landT - 0.06) * 5.5));
  const rDF = p.recover > 0 ? 0.9 * smooth3(clampN(p.recover / 0.15, 0, 1)) : 0;
  const df = p.onGround ? Math.max(wDF, lDF, rDF) : 0;
  const idleNow = sp < 0.15 && p.onGround && !p.windup && df < 0.05;

  if (mode === 'fly') {
    Object.assign(T, { lean: 0.9, aL: -2.6, aR: -2.6, eL: 0, eR: 0, hL: 0.3, hR: 0.1, kL: 0.2, kR: 0.5, chest: 0.1 });
  } else if (p.state === 'mantle' && p.mantle) {
    const uu = Math.min(1, p.mantle.t / p.mantle.dur), pull = smooth3(Math.min(1, uu / 0.6)), over = smooth3(Math.max(0, (uu - 0.6) / 0.4));
    Object.assign(T, {
      aL: -3.05 + 2.3 * pull, aR: -3.05 + 2.3 * pull, eL: -0.1 - 0.7 * pull, eR: -0.1 - 0.7 * pull,
      hL: -0.2 - 0.9 * Math.sin(pull * Math.PI), hR: 0.1, kL: 0.4 + 0.9 * Math.sin(pull * Math.PI), kR: 0.3,
      lean: 0.1 + 0.3 * pull * (1 - over), chest: 0.15 * pull * (1 - over), hp: -0.25 * (1 - over), twist: 0.08 * Math.sin(pull * Math.PI),
    });
    bob = -0.06 * pull;
  } else if (p.state === 'climb') {                              // klatrer: én arm rekker frem og opp mot veggen mens den andre trekker, bena trår mot veggen
    const m = clampN(p.climbMove / 0.8, 0, 1), s1 = Math.sin(p.climbPh * 2), tired = clampN(1 - p.stam / (P.stamina * 0.3), 0, 1);
    const u = lerpN(0.6, (s1 + 1) / 2, m), v = 1 - u + (0.6 - (1 - 0.6)) * (1 - m);      // venstre/høyre arm: 1 = rekker, 0 = trekker (i ro: begge halvveis oppe)
    const vv = lerpN(0.6, 1 - (s1 + 1) / 2, m);
    const shake = tired * 0.05 * Math.sin(sec * 37);
    const stepL = lerpN(0.3, smooth3(vv), m), stepR = lerpN(0.3, smooth3(u), m);          // kryssmønster: venstre bein trår når høyre arm rekker
    Object.assign(T, {
      aL: lerpN(-1.1, -2.85, u) + shake, aR: lerpN(-1.1, -2.85, vv) - shake, eL: lerpN(-1.7, -0.15, u), eR: lerpN(-1.7, -0.15, vv),
      zL: 0.16, zR: -0.16,
      hL: lerpN(-0.3, -1.05, stepL), hR: lerpN(-0.3, -1.05, stepR), kL: lerpN(0.5, 1.5, stepL), kR: lerpN(0.5, 1.5, stepR),
      lean: 0.2 + 0.05 * tired, chest: 0.1, hp: -0.28, twist: 0.12 * s1 * m,
      roll: 0.05 * s1 * m + (1 - m) * 0.015 * Math.sin(sec * 1.3), sway: 0.012 * s1 * m,   // vekten flyttes mot armen som trekker; i ro dingler han litt
    });
    { const id = 1 - m, a1 = Math.sin(sec * 1.9), a2 = Math.sin(sec * 2.7 + 1.3);       // i ro henger han ikke stille: puster, flytter vekten, leter etter fotfeste
      T.aL += id * 0.1 * a1; T.aR -= id * 0.1 * a1; T.hL += id * 0.12 * a2; T.hR -= id * 0.12 * a2; T.kL += id * 0.2 * (a2 + 1) / 2; T.kR += id * 0.2 * (1 - a2) / 2;
      T.twist += id * 0.06 * a1; T.lean += id * 0.015 * a2; T.chest += id * 0.03 * a1; T.hy += 0.25 * Math.sin(sec * 0.8) * id; }
    bob = -0.05 - 0.012 * Math.abs(s1) * m;
  } else if (p.state === 'hang' || p.state === 'zip') {
    const sway = Math.sin(sec * 1.5), hm = p.state === 'hang' ? clampN(Math.abs(p.hangMove || 0) / FIN.shimmySpeed, 0, 1) : 0, hs = hangSway(sec, Math.hypot(p.vx, p.vz) + 2 * hm, false);   // heng: rolig dingling (R39: bena og hender følger med når han går sidelengs)
    hero.shimPh = (hero.shimPh || 0) + hm * dt * 7; const shp = Math.sin(hero.shimPh) * hm;                                 // hendene bytter på å ta tak
    Object.assign(T, { aL: -3.05 + 0.18 * shp, aR: -3.05 - 0.18 * shp, eL: -0.12, eR: -0.12, hL: hs.legL, hR: hs.legR, lean: hs.lean, roll: hs.roll, chest: -0.05, hp: -0.2, twist: sway * 0.05 + 0.12 * shp, kL: hs.kneeL + 0.15 * hm * Math.max(0, shp), kR: hs.kneeR + 0.15 * hm * Math.max(0, -shp) });
  } else if (p.state === 'swing') {
    const k = clampN((p.vx * p.fx + p.vz * p.fz) * 0.1, -0.8, 0.8), ss = hangSway(sec * 1.4, Math.hypot(p.vx, p.vz), true);   // sving: stort pendel i bena, kroppen lener med farten
    Object.assign(T, { aL: -3.0, aR: -3.1, eL: -0.1, eR: -0.1, hL: ss.legL - 0.5 * k, hR: ss.legR - 0.5 * k, kL: ss.kneeL + 0.3, kR: ss.kneeR + 0.5, lean: -0.25 * k + ss.lean * 2, roll: ss.roll, chest: -0.1 * k, hp: -0.15, twist: 0.06 * Math.sin(sec * 2.1) });
  } else if (p.reach > 0) {
    const rt = clampN((hero.reachT || 0) / 0.25, 0, 1), fl = Math.sin(sec * 15), wv = Math.sin(sec * 11);   // armene strekker seg mer og mer, bena sparker, kroppen vrir seg mot grepet
    Object.assign(T, { aL: -2.55 - 0.3 * rt + 0.1 * wv, aR: -2.8 - 0.35 * rt - 0.1 * wv, eL: -0.3 + 0.25 * rt, eR: -0.25 + 0.2 * rt, hL: -0.6 + 0.35 * fl, hR: 0.3 - 0.35 * fl, kL: 0.9 + 0.45 * Math.max(0, fl), kR: 0.5 + 0.45 * Math.max(0, -fl),
      lean: 0.12 + 0.12 * rt, chest: 0.1 + 0.14 * rt, hp: -0.2, twist: 0.12 * wv * rt });
  } else if (vaultNow) {                                          // R41: stavhopp: plant, sving, topp, slipp (vault_anim.js)
    Object.assign(T, vaultNow.T);
  } else if (!p.onGround) {
    if (p.sliding) {
      Object.assign(T, { aL: -2.8, aR: -2.8, eL: -0.3, eR: -0.3, hL: -0.2, hR: 0.1, kL: 0.6, kR: 0.7, lean: 0.05, hp: -0.15 });
    } else {
      // hopp/fall som en bevegelse: strekk ved avspark → trekke opp til toppen → strekke bena ned mot landing
      const r = clampN(p.vy / P.jump, -1.6, 1);                                   // 1 = avspark, 0 = toppunkt, <0 = faller
      const run = clampN(sp / (P.speed * 1.3), 0, 1);                              // løpehopp (skritt) vs stående hopp
      const e = p.vy > 0 && p.airT < 0.22 ? 1 - p.airT / 0.22 : 0;                // avsparkets strekk
      const fallK = smooth3(clampN(-r / 1.1, 0, 1));
      const tuck = smooth3(1 - clampN(r, 0, 1)) * (1 - fallK) * (1 - e);
      const fast = clampN((-p.vy - 8) / 14, 0, 1);                                // hardt fall: armene opp
      const hL = lerpN(-0.95, -1.05, run) * tuck, hR = lerpN(-0.95, 0.55, run) * tuck;
      const kL = lerpN(1.35, 0.45, run) * tuck, kR = lerpN(1.35, 1.2, run) * tuck;
      T.hL = hL + 0.08 * e - (0.3 + 0.15 * run) * fallK; T.hR = hR + 0.08 * e - 0.08 * fallK;
      T.kL = kL * (1 - fallK) + 0.3 * fallK; T.kR = kR * (1 - fallK) + 0.22 * fallK; T.fp = 0.75 * e + 0.2 * tuck;
      T.aL = -3.0 * e - 0.9 * tuck - 1.2 * fallK - 0.9 * fast; T.aR = T.aL * lerpN(0.9, 0.75, run);
      T.zL = 0.2 + 0.55 * tuck + 0.5 * fallK; T.zR = -(0.2 + 0.5 * tuck + 0.55 * fallK);
      T.eL = T.eR = -0.35 - 0.5 * tuck - 0.2 * fallK;
      T.lean = 0.06 + 0.12 * run * (1 - fallK) - 0.04 * e; T.chest = 0.05 + 0.1 * tuck; T.hp = -0.1 - 0.1 * fast;
      T.twist = 0.12 * run * tuck;
    }
  } else if (p.skid) {                                          // du skrider mens du snur: lent bakover, bein foran
    Object.assign(T, { aL: -0.9, aR: -0.4, zL: 0.5, zR: -0.5, eL: -0.3, eR: -0.3, hL: -0.55, hR: 0.45, kL: 0.2, kR: 0.6, lean: -0.3, chest: -0.08 });
  } else {
    if (ikGait && sp > 0.15) {
      const k = kSp, amp = (0.28 + 0.58 * k) * smooth3(clampN(sp / 0.8, 0, 1));   // armsving vokser jevnt med farten (ikke en terskel)
      const run = ownGait ? smooth3(clampN((k - 0.45) / 0.4, 0, 1)) : 0;           // løp: albuene i vinkel, mer fremoverlent, armene pumper
      Object.assign(T, { aL: -amp * gaitN.R + 0.1 * run, aR: -amp * gaitN.L + 0.1 * run,
        eL: -0.22 - 0.45 * k - 0.6 * run - 0.3 * k * Math.max(0, gaitN.R), eR: -0.22 - 0.45 * k - 0.6 * run - 0.3 * k * Math.max(0, gaitN.L),   // albuen bøyes mer når armen er fremme
        zL: 0.07 + 0.06 * run, zR: -0.07 - 0.06 * run, lean: 0.04 + 0.1 * k + 0.07 * run, chest: 0.03 + 0.07 * k, hp: -0.04 * k - 0.05 * run });
      T.twist = -(0.14 + 0.1 * run) * k * (gaitN.L - gaitN.R) / 2;                  // overkroppen vrir seg motsatt hoftene
      if (ownGait) { const cg = Math.cos(gph) * smooth3(clampN(sp / 0.8, 0, 1)); T.sway = -0.013 * (1 - 0.6 * run) * cg; T.roll = 0.03 * (1 - 0.5 * run) * cg; }   // vekten over standbenet, hoften synker litt på svingsiden
    } else if (sp > 0.4 && !ikGait) {
      const k = Math.min(1, sp / 5.6);
      hero.ph += dt * (2.2 + sp * 1.0);                         // takten følger farten (ikke en fast frekvens)
      const stepIdx = Math.floor(hero.ph / Math.PI);
      if (stepIdx !== hero.lastStep) { hero.lastStep = stepIdx; if (audio && mode === 'play') footstep(stepIdx % 2 ? 1 : -1, sp); }
      const ph = hero.ph, sn = Math.sin(ph), amp = 0.5 + 0.45 * k;
      // retning relativt til kroppen (PUBG: du går sidelengs og bakover): lf = fremover(+)/bakover(−), lx = sidelengs i kroppens x-retning
      const lf = clampN((p.vx * p.fx + p.vz * p.fz) / sp, -1, 1), lx = clampN((p.vx * p.fz - p.vz * p.fx) / sp, -1, 1), side = Math.abs(lx), back = Math.max(0, -lf);
      const swing = lf * (1 - 0.35 * side);                      // forover/bakover-sving: snur retning når du rygger, minkes mot sidelengs
      const liftL = Math.max(0, sn), liftR = Math.max(0, -sn);   // benet som løftes
      Object.assign(T, {
        hL: -sn * amp * swing, hR: sn * amp * swing,
        kL: Math.max(0, Math.sin(ph + 1.6)) * (0.5 + 0.7 * k) * (1 - 0.3 * back), kR: Math.max(0, Math.sin(ph + 1.6 + Math.PI)) * (0.5 + 0.7 * k) * (1 - 0.3 * back),
        aL: sn * (0.35 + 0.5 * k) * Math.max(0.25, lf), aR: -sn * (0.35 + 0.5 * k) * Math.max(0.25, lf), eL: -0.25 - 0.45 * k, eR: -0.25 - 0.45 * k,
        lean: Math.max(0.0, 0.06 + 0.1 * k) * Math.max(0, lf) - 0.04 * back, chest: 0.04 * Math.max(0.2, lf), twist: -0.1 * sn * k * Math.abs(lf),
        // sidesteg: benet i svevefasen setter foten ut mot gangretningen, standbenet følger etter; kroppen lener seg litt inn i bevegelsen
        lzL: lx * (0.55 * liftL - 0.12 * liftR) * Math.min(1, side * 1.3), lzR: lx * (0.55 * liftR - 0.12 * liftL) * Math.min(1, side * 1.3), roll: -lx * 0.09 * k,
      });
      bob = Math.abs(Math.cos(ph)) * 0.02 * k;
    } else if (idleNow) {                                       // hvile: pust i brystet, litt armsvev, hodet ser seg rundt
      const br = Math.sin(sec * 1.7);
      T.chest = br * 0.02; T.lean = br * 0.008;
      T.aL = Math.sin(sec * 0.9) * 0.025 + br * 0.01; T.aR = Math.sin(sec * 0.9 + 1.3) * 0.025 - br * 0.01;
      { const ws = Math.sin(sec * 0.31) + 0.4 * Math.sin(sec * 0.13 + 1); T.sway = 0.009 * ws; T.roll = 0.016 * ws; T.zL += br * 0.014; T.zR -= br * 0.014; T.twist = 0.03 * Math.sin(sec * 0.19); }   // flytter vekten rolig fra ben til ben, skuldrene følger pusten
      T.hy = Math.sin(sec * 0.43) * 0.28 + Math.sin(sec * 0.17) * 0.18; T.hp = Math.sin(sec * 0.29) * 0.07;
      if ((hero.camTurn || 0) > 0.3) { T.hy *= 1 - hero.camTurn; T.hp = 0.04 * hero.camTurn; }       // ser rett på deg
    }
    if (df > 0.01) {                                            // hurk: lent frem, armene bak (forberedelse) eller frem (landing)
      T.lean += 0.42 * df; T.chest += 0.14 * df; T.zL += 0.15 * df; T.zR -= 0.15 * df;
      T.aL += 0.6 * wDF - 0.85 * Math.max(0, df - wDF); T.aR += 0.6 * wDF - 0.85 * Math.max(0, df - wDF);
      if (!ikGait) { T.hL += -0.65 * df; T.hR += -0.65 * df; T.kL += 1.3 * df; T.kR += 1.3 * df; bob = -DIP_MAX * 0.8 * df; }
    }
    if (p.carry) { T.aL = T.aR = -1.25; T.eL = T.eR = -0.95; T.zL = 0.1; T.zR = -0.1; T.lean -= 0.04; }       // holder tingen foran seg
    else if (p.pushT > 0) { T.lean += 0.22; T.chest += 0.1; T.aL = T.aR = -1.4; T.eL = T.eR = -0.2; }          // lener seg inn i det han dytter
  }
  if (gripPosesOn && mode !== 'fly') {                                 // R40: nye poser for heng, veggglid og sving (hender som tar tak, vekt og holdning følger farten)
    const gs = p.state === 'hang' || p.state === 'zip' ? 'hang' : p.state === 'swing' ? 'swing' : !p.onGround && p.sliding && !p.reach ? 'slide' : '';
    if (gs) Object.assign(T, gripPose(gs, { sec, speed: Math.hypot(p.vx, p.vz), signed: p.vx * p.fx + p.vz * p.fz, tired: clampN(1 - p.stam / (P.stamina * 0.4), 0, 1), vy: p.vy }));
    if (gs && hero.gripPoseWas !== gs) logEv('grepspose', gs);
    hero.gripPoseWas = gs;
  }
  if ((hero.catchT || 0) > 0 && (p.state === 'climb' || p.state === 'hang')) {                     // tar imot: albuene bøyes og kroppen dypper, så strammer han seg opp igjen
    const g = hero.catchT, g2 = g * g;
    T.eL -= 0.9 * g2; T.eR -= 0.9 * g2; T.chest += 0.16 * g2; T.lean += 0.1 * g2; T.hL += 0.35 * g2 * Math.sin(sec * 12); T.hR -= 0.35 * g2 * Math.sin(sec * 12); T.kL += 0.5 * g2; T.kR += 0.5 * g2; bob -= 0.08 * g2;
  }
  { const st = p.state, cf0 = hero.cfPrev;                                  // R58: avspark ved hopp ut av heng/klatring (kun pose; fysikken gjør hoppet)
    if ((cf0 === 'hang' || cf0 === 'climb') && st === 'air' && p.vy > 2) { hero.kickT = 1; logEv('klatrepose', 'avspark'); }
    hero.kickT = st === 'air' ? Math.max(0, (hero.kickT || 0) - dt / CF.kickDur) : 0; hero.cfPrev = st;
    const cf = mode === 'fly' ? null : climbFeel({ state: st, sec, catchT: hero.catchT || 0, kickT: hero.kickT, mantleU: st === 'mantle' && p.mantle ? Math.min(1, p.mantle.t / p.mantle.dur) : -1, tired: clampN(1 - p.stam / (P.stamina * 0.4), 0, 1), speed: Math.hypot(p.vx, p.vz), s1: Math.sin((p.climbPh || 0) * 2), climbMove: p.climbMove || 0, strength: climbFeelStr });
    if (cf && cf.phase) {
      for (const k in cf.d) T[k] += cf.d[k]; bob += cf.bob; hero.cfFg = [cf.fgL, cf.fgR];
      if (hero.cfPhaseWas !== cf.phase) logEv('klatrepose', cf.phase);
    } else hero.cfFg = null;
    hero.cfPhaseWas = cf ? cf.phase : ''; }
  if (!p.skid && p.state !== 'mantle' && p.state !== 'hang' && p.state !== 'swing' && mode !== 'fly' && p.onGround) T.lean += hero.accLean;
  if (p.rollT > 0 && p.state === 'ground' && mode !== 'fly') {                                     // R39: rulle ved landing: kroppen krøller seg sammen fremover og reiser seg igjen
    const rp = rollProgress(p.rollT), rs = Math.sin(Math.PI * rp);
    T.lean = 0.95 * rs; T.chest = 0.7 * rs; T.hp = 0.4 * rs; T.aL = T.aR = -0.9 * rs; T.eL = T.eR = -1.3 * rs; T.hL = T.hR = -1.1 * rs; T.kL = T.kR = 1.6 * rs; T.roll = 0; bob -= 0.1 * rs;
  }

  // fingrene: knyttet rundt det han holder eller henger i, løst knyttet i løp, åpne når han rekker ut
  T.fgL = T.fgR = p.carry || ['hang', 'climb', 'swing', 'zip', 'mantle'].includes(p.state) ? 1.2 : p.reach > 0 || (!p.onGround && p.vy < -8) ? 0.05 : 0.35 + 0.55 * kSp * (p.onGround ? 1 : 0);
  if (hero.cfFg) { if (hero.cfFg[0] != null) T.fgL = hero.cfFg[0]; if (hero.cfFg[1] != null) T.fgR = hero.cfFg[1]; }   // R58: fingrene rundt kanten
  if (hero.gripNear && (p.state === 'ground' || p.state === 'air') && !p.carry) { T.aR = Math.min(T.aR, -1.75); T.eR = -0.45; T.fgR = 0.05; }   // rekker en arm mot grepet
  if (ownGait && p.onGround && p.state === 'ground' && mode === 'play') {
    T.roll += clampN(-yawRate * 0.06 * kSp, -0.2, 0.2);                            // lener seg inn i svingen
    const [jx, jz] = axes();                                                       // hodet ser dit du styrer, litt før kroppen har snudd seg
    if (Math.hypot(jx, jz) > 0.2) { const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw); T.hy += clampN(angDiff(hero.yaw, Math.atan2(cy * jx - sy * jz, -sy * jx - cy * jz)), -0.8, 0.8) * 0.5; }
  }

  // reaksjoner (polish.js): jubel og sprett når en maur knuses, rykk og sammenkrøping når en støter deg
  const rx = react.update(dt);
  if (rx.active) {
    if (rx.armsUp > 0) { T.aL = lerpN(T.aL, -2.9, rx.armsUp); T.aR = lerpN(T.aR, -2.9, rx.armsUp); T.zL = lerpN(T.zL, 0.45, rx.armsUp); T.zR = lerpN(T.zR, 0.45, rx.armsUp); T.eL = lerpN(T.eL, -0.3, rx.armsUp); T.eR = lerpN(T.eR, -0.3, rx.armsUp); T.fgL = T.fgR = 0.05; }
    if (rx.flinch > 0) { T.aL = lerpN(T.aL, -1.5, rx.flinch); T.aR = lerpN(T.aR, -1.3, rx.flinch); T.zL = lerpN(T.zL, 0.35, rx.flinch); T.zR = lerpN(T.zR, 0.35, rx.flinch); T.eL = lerpN(T.eL, -1.7, rx.flinch); T.eR = lerpN(T.eR, -1.7, rx.flinch); T.hp += 0.3 * rx.flinch; T.fgL = T.fgR = 1.0; if (p.onGround && !ikGait) { T.kL += rx.crouch; T.kR += rx.crouch; }
      if (p.onGround && ikGait) { T.zL += 0.1 * rx.flinch; T.zR -= 0.1 * rx.flinch; } }
    T.lean += rx.lean; T.twist += rx.spin; T.hy += rx.spin * 1.4; T.chest += rx.flinch * 0.2;
    if (rx.flinch > 0) bob -= rx.crouch * 0.16;   // synker tydelig sammen (også med IK-gange)
  }

  // jevn overgang: armer/overkropp rolig, ben raskere; alt raskere i lufta og i hurk
  const quick = !p.onGround || p.windup > 0 || df > 0.2;
  const slowKeys = new Set(['aL', 'aR', 'zL', 'zR', 'eL', 'eR', 'lean', 'chest', 'twist', 'hy', 'hp', 'roll', 'sway', 'fgL', 'fgR']);
  for (const key in T) c[key] += (T[key] - c[key]) * (1 - Math.exp(-dt / (slowKeys.has(key) ? (quick ? (!p.onGround && p.airT < 0.25 ? 0.04 : 0.06) : 0.14) : (!p.onGround ? 0.05 : 0.08))));
  hero.armL.top.rotation.set(c.aL, 0, -c.zL); hero.armR.top.rotation.set(c.aR, 0, -c.zR);
  hero.armL.mid.rotation.x = c.eL; hero.armR.mid.rotation.x = c.eR;
  hero.armL.fingers.rotation.z = c.fgL; hero.armL.tips.rotation.z = c.fgL * 0.9; hero.armR.fingers.rotation.z = -c.fgR; hero.armR.tips.rotation.z = -c.fgR * 0.9;

  // bein: bland mellom FK-posene og IK (fast fot) etter om vi går/står
  hero.ikW += ((gaitOn ? 1 : 0) - hero.ikW) * (1 - Math.exp(-(gaitOn ? (p.landT < 0.12 ? 25 : 10) : 12) * dt));
  const w = hero.ikW, Lmax = hero.legL.l1 + hero.legL.l2;
  // hoftehøyde = laveste av de to føttenes rekkevidde (jevn funksjon; en av/på-test på «stående fot» ga et hopp i hoften ved hvert skritt)
  const Lc = 0.985 * Lmax, reach = (f) => ANKLE_H + f.y + Math.sqrt(Math.max(1e-4, Lc * Lc - f.z * f.z));
  const rA = reach(pathL), rB = reach(pathR), sh = Math.max(0, 0.05 - Math.abs(rA - rB)) / 0.05;   // myk min: ingen knekk der foten som begrenser hoften byttes
  const ikHip = Math.min(rA, rB) - sh * sh * 0.0125 - 0.02 * kSp - DIP_MAX * df;
  hero.bob += (bob - hero.bob) * (1 - Math.exp(-dt / 0.06));
  const hipY = 0.46 + hero.bob + (ikHip - (0.46 + hero.bob)) * w;
  const ikL = solveLeg(hero.legL, hipY, pathL.z, ANKLE_H + pathL.y), ikR = solveLeg(hero.legR, hipY, pathR.z, ANKLE_H + pathR.y);
  // skritt-lyd: lyd når en fot treffer gulvet (samme øyeblikk som animasjonen)
  const plL = pathL.y < 0.002, plR = pathR.y < 0.002;
  if (audio && mode === 'play' && gaitOn && hero.gaitWas) { if (plL && !hero.plL) footstep(-1, sp); if (plR && !hero.plR) footstep(1, sp); }
  hero.plL = plL; hero.plR = plR; hero.gaitWas = gaitOn;
  const mix = (fk, ik) => fk + (ik - fk) * w;
  hero.legL.top.rotation.x = mix(c.hL, ikL.theta); hero.legR.top.rotation.x = mix(c.hR, ikR.theta);
  hero.legL.top.rotation.z = c.lzL; hero.legR.top.rotation.z = c.lzR; hero.body.rotation.z = c.roll;
  hero.legL.mid.rotation.x = mix(c.kL, ikL.kappa); hero.legR.mid.rotation.x = mix(c.kR, ikR.kappa);
  hero.legL.footG.rotation.x = mix(c.fp, -(ikL.theta + ikL.kappa) + pathL.pitch); hero.legR.footG.rotation.x = mix(c.fp, -(ikR.theta + ikR.kappa) + pathR.pitch);
  hero.legL.top.position.y = hero.legR.top.position.y = hipY;

  // overkropp: bekken bærer lean, bryst bøyer og vrir mer, hodet ser dit kroppen går (pluss litt omkringsyn i hvile)
  hero.body.position.y = hipY; hero.body.position.x = c.sway;
  hero.body.rotation.x = c.lean; hero.body.rotation.y = -c.twist * 0.4;
  hero.chest.rotation.x = c.chest; hero.chest.rotation.y = c.twist;
  hero.head.rotation.x = c.hp - (c.lean + c.chest) * 0.7; hero.head.rotation.y = c.hy - c.twist * 0.6;

  // kroppen: i gange-modus snur fysikken gradvis; ellers begrenses snuhastigheten her
  let target = Math.atan2(p.fx, p.fz);
  if ((hero.camTurn || 0) > 0.002) { const toCam = Math.atan2(camera.position.x - p.x, camera.position.z - p.z), dd = ((toCam - target + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; hero.yaw = target + dd * hero.camTurn; }
  else if (P.gaitMode) hero.yaw = target;
  else {
    const d = ((target - hero.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    const maxStep = P.turnRate * dt;
    hero.yaw += Math.max(-maxStep, Math.min(maxStep, d));
  }
  hero.root.rotation.y = hero.yaw;
  { const dy = angDiff(hero.yawPrev ?? hero.yaw, hero.yaw); hero.yawPrev = hero.yaw; hero.yawRate = yawRate + (dy / Math.max(dt, 1e-3) - yawRate) * (1 - Math.exp(-dt / 0.12)); }   // hvor fort han snur seg (til sving-helling og skritt på stedet)
}
function lerpN(a, b, t) { return a + (b - a) * t; }

// ---------- sjarm: ansikt (blunking, blikk, uttrykk) og ting som henger etter (skjerf, sekk) ----------
const setMood = (name, secs) => { hero.mood.name = name; hero.mood.t = secs; };

// stemmen: korte replikker (voice.js) sies med nettleserens talesyntese (høy tone, norsk stemme om den finnes) og vises i en snakkeboble over hodet
const hasTTS = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
let voiceOn = store.get('tlm.voice', true), bubblesOn = store.get('tlm.bubbles', true), voiceVol = store.get('tlm.voicevol', 0.9), ttsVoice = null;
function pickVoice() { const vs = hasTTS ? speechSynthesis.getVoices() : []; ttsVoice = vs.find((v) => /^nb/i.test(v.lang)) || vs.find((v) => /^no/i.test(v.lang)) || vs.find((v) => /^nn/i.test(v.lang)) || null; }
if (hasTTS) { pickVoice(); speechSynthesis.addEventListener?.('voiceschanged', pickVoice); }
function speakTTS(text) {
  if (!hasTTS || !voiceOn || soundMuted || !ttsVoice) return;                       // uten norsk stemme: bare snakkebobler
  try {
    const u = new SpeechSynthesisUtterance(text); u.voice = ttsVoice; u.lang = ttsVoice.lang; u.pitch = 1.9; u.rate = 1.12; u.volume = voiceVol;
    if (speechSynthesis.speaking) speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch { /* ikke støttet */ }
}
const bubbleEl = document.getElementById('bubble'); let bubbleUntil = 0;
function showBubble(text, secs) { if (!bubblesOn) return; bubbleEl.textContent = text; bubbleEl.classList.add('show'); bubbleUntil = performance.now() / 1000 + secs; hero.talkT = secs; }
const voice = createVoice({ speak: speakTTS, show: showBubble, now: () => performance.now() / 1000, enabled: () => (voiceOn || bubblesOn) && mode === 'play' });
const say = (key, force) => voice.say(key, force);
const _v3 = new THREE.Vector3();
function updateBubble(now) {
  if (viewFirst) { bubbleEl.classList.remove('show'); return; }
  if (now / 1000 > bubbleUntil) { bubbleEl.classList.remove('show'); return; }
  hero.head.getWorldPosition(_v3); _v3.y += 0.22; _v3.project(camera);
  if (_v3.z > 1) { bubbleEl.classList.remove('show'); return; }
  const x = Math.max(80, Math.min(innerWidth - 80, (_v3.x * 0.5 + 0.5) * innerWidth)), y = Math.max(70, (-_v3.y * 0.5 + 0.5) * innerHeight);
  bubbleEl.style.left = `${x}px`; bubbleEl.style.top = `${y}px`;
}
const stamEl = $('stam'), stamFill = stamEl.firstElementChild;
function updateStam() {                                   // krefter-stripe over hodet mens du klatrer eller er sliten
  const f = clampN(player.stam / P.stamina, 0, 1), show = mode === 'play' && !viewFirst && (player.state === 'climb' || f < 0.97);
  stamEl.style.display = show ? 'block' : 'none'; if (!show) return;
  hero.head.getWorldPosition(_v3); _v3.y += 0.18; _v3.project(camera);
  stamEl.style.left = `${(_v3.x * 0.5 + 0.5) * innerWidth}px`; stamEl.style.top = `${(-_v3.y * 0.5 + 0.5) * innerHeight}px`;
  stamFill.style.transform = `scaleX(${f})`; stamEl.className = f < 0.15 ? 'crit' : f < 0.3 ? 'low' : '';
}
const F = { sm: 0.35, op: 0, bw: 0, bl: 0, eyeY: 1, pup: 1, blush: 0, sweat: 0 };       // glattede uttrykksverdier
function animateHero(p, now, dt) {
  updateAccessories(hero, dt);
  const sec = now / 1000, h = hero, f = h.face, st = p.state, sp = Math.hypot(p.vx, p.vz);
  h.mood.t = Math.max(0, h.mood.t - dt); const mood = h.mood.t > 0 ? h.mood.name : '';
  const climbing = st === 'climb' || st === 'hang' || st === 'mantle', falling = !p.onGround && p.vy < -7 && !climbing, rising = !p.onGround && p.vy > 3 && !climbing;
  const stunned = (p.recover > 0.35 && p.landImpact >= P.hardLand && p.onGround) || mood === 'hurt', tired = Math.max(0, 1 - p.stam / (P.stamina * 0.3));
  // idle: gjesp etter lang tid i ro
  h.idleT = (sp < 0.15 && p.onGround && !p.carry && mode === 'play') ? h.idleT + dt : 0;
  if (h.idleT > 26 && !mood) { setMood('yawn', 2.2); say('yawn'); h.idleT = 0; }
  if (h.idleT > 14 && h.idleT - dt <= 14) say('idle');
  h.talkT = Math.max(0, h.talkT - dt);
  // mål for uttrykk
  let sm = 0.35, op = 0, bw = 0, bl = 0, eyeY = 1, pup = 1, blush = 0, sweat = 0;
  if (climbing) { sm = -0.25; bw = -0.25; eyeY = 0.8; if (tired > 0.1) { bw = 0.3 * tired - 0.25 * (1 - tired); blush = 0.5 * tired; sweat = tired > 0.5 ? 1 : 0; sm = -0.5; } }
  if (rising) { sm = 0.8; bl = 0.004; }
  if (falling) { eyeY = 1.2; pup = 0.75; bw = 0.3; bl = 0.012; op = 0.9; sm = 0; }
  if (p.carry && p.onGround) { bw = -0.1; sm = 0.1; }
  if (stunned) { eyeY = 0.12; bw = 0.35; op = 0.4; sm = -0.4; blush = 0.4; }
  if (mood === 'happy') { sm = 1; eyeY = 0.55; bl = 0.008; blush = 0.6; op = 0; bw = 0; }
  if (mood === 'worry') { bw = 0.4; bl = 0.008; sm = -0.3; eyeY = 1.1; }
  if (mood === 'wink') { sm = 1; blush = 0.55; eyeY = 1; bw = -0.12; bl = 0.006; }
  if (mood === 'yawn') { op = 1.3; eyeY = 0.1; sm = 0; bl = 0.01; }
  if (h.talkT > 0 && !stunned) { op = Math.max(op, 0.55 + 0.45 * Math.sin(sec * 17)); sm = Math.max(sm, 0.2); }          // munnen beveger seg mens han snakker
  const k = 1 - Math.exp(-dt / 0.07);
  F.sm += (sm - F.sm) * k; F.op += (op - F.op) * k; F.bw += (bw - F.bw) * k; F.bl += (bl - F.bl) * k; F.eyeY += (eyeY - F.eyeY) * k; F.pup += (pup - F.pup) * k; F.blush += (blush - F.blush) * k; F.sweat += (sweat - F.sweat) * k;
  // blunking
  h.blink.t -= dt; if (h.blink.t <= 0 && h.blink.v === 0) { h.blink.v = 1; h.blink.ph = 0; }
  let bAmt = 0; if (h.blink.v) { h.blink.ph += dt / 0.16; bAmt = Math.sin(Math.min(1, h.blink.ph) * Math.PI); if (h.blink.ph >= 1) { h.blink.v = 0; h.blink.t = 1.8 + Math.random() * 3.6; } }
  // blikk: ser dit han går/hopper, ellers lett rundt i hvile
  h.look.t -= dt;
  if (h.look.t <= 0) { h.look.t = 1.2 + Math.random() * 2.2; if (sp < 0.2 && p.onGround) { h.look.tx = (Math.random() - 0.5) * 1.6; h.look.ty = (Math.random() - 0.4) * 1.0; } else { h.look.tx = 0; h.look.ty = 0; } }
  let ty = h.look.ty, tx = h.look.tx; if (falling) ty = -0.7; else if (rising || climbing) ty = 0.7; if (stunned) { tx = 0; ty = 0; }
  h.look.x += (tx - h.look.x) * (1 - Math.exp(-dt / 0.09)); h.look.y += (ty - h.look.y) * (1 - Math.exp(-dt / 0.09));
  for (let i = 0; i < 2; i++) {
    const e = f.eyes[i], pu = f.pupils[i];
    e.scale.y = Math.max(0.07, F.eyeY * (1 - 0.93 * bAmt)); e.scale.x = 1 + (F.eyeY > 1 ? 0.08 : 0);
    pu.scale.set(F.pup, 1.1 * F.pup, 0.5); pu.position.set(h.look.x * 0.0075, h.look.y * 0.006, 0.0065);
    f.brows[i].rotation.z = (i === 0 ? 1 : -1) * F.bw; f.brows[i].position.y = f.browY + F.bl + (F.eyeY < 0.4 ? -0.006 : 0);
    f.blush[i].material.opacity = F.blush;
  }
  if (mood === 'wink') { const wv = Math.sin(clampN((1.45 - h.mood.t) / 0.75, 0, 1) * Math.PI); f.eyes[1].scale.y = Math.max(0.07, 1 - 0.93 * wv); f.brows[1].position.y -= 0.012 * wv; }       // blunker med det ene øyet
  f.smile.visible = F.op < 0.5; f.smile.rotation.z = F.sm >= 0 ? Math.PI : 0; f.smile.scale.set(1 + 0.25 * Math.abs(F.sm), Math.max(0.12, Math.abs(F.sm)), 1);
  f.smile.position.y = -0.03 + (F.sm >= 0 ? 0.004 : -0.004);
  f.open.visible = F.op >= 0.5; f.open.scale.set(1 + 0.3 * F.op, 0.5 + 0.9 * F.op, 0.4);
  f.sweat.visible = F.sweat > 0.5; f.sweat.position.y = 0.035 - 0.012 * ((sec * 1.2) % 1);
  // skjerf: to ledd som fjærer. Flyr bakover med fart, løftes i fall, henger ned i ro
  const sf = p.vx * p.fx + p.vz * p.fz, S = h.sec;
  const tA = clampN(sf * 0.16, -0.2, 1.0) + clampN(-p.vy * 0.045, 0, 1.2) - clampN(p.vy * 0.02, 0, 0.35) + (climbing ? 0.05 : 0);
  S.av += ((tA - S.a) * 70 - S.av * 7) * dt; S.a += S.av * dt;
  S.bv += (((S.a * 0.9 + (tA - S.a) * 0.4) - S.b) * 90 - S.bv * 8) * dt; S.b += S.bv * dt;
  h.tailA.rotation.x = 0.12 + S.a; h.tailB.rotation.x = S.b * 0.7; h.tailA.rotation.z = Math.sin(sec * 3 + S.a * 4) * 0.05 * Math.min(1, Math.abs(S.a) * 2);
  // sekk: slenger med akselerasjon og fjærer ved landing
  if (p.landT < dt * 2.5 && p.landImpact > 3) S.pkv -= p.landImpact * 0.012;
  S.pkv += ((-S.pk) * 120 - S.pkv * 9) * dt; S.pk += S.pkv * dt;
  h.packG.position.y = 0.09 + S.pk; h.packG.rotation.x = -h.accLean * 0.9 - S.pk * 2;
}

// ---------- tilstand ----------
initBodies(LEVEL); initAnts(LEVEL); initBoss(LEVEL); initCollect(LEVEL); initPuzzles(LEVEL); initGoals(LEVEL); if (!isLab(LEVEL)) addPartsGoal(LEVEL); GATE.hero = +store.get('tlm.gatehero', GATE.hero) || GATE.hero; GATE.needScale = +store.get('tlm.gateneed', 1) || 1; GATE.dur = +store.get('tlm.gatedur', GATE.dur) || GATE.dur; initGates(LEVEL);
const bodyMeshes = LEVEL.bodies.map((b) => {
  const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
  const mesh = (b.kind && buildSingle(b.kind, [sx, sy, sz], { color: b.color, id: b.id, material: b.material, drawer: b.drawer })) || new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material({ type: b.type, material: b.material, color: b.color }));
  mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh); if (!gfxLow) look.detailize(mesh);
  return { b, mesh, size: [sx, sy, sz] };
});
const shortcutWatch = createShortcutWatch(LEVEL);   // R29 (shortcut.js)
const toyLife = createToyLife(LEVEL); toyLife.on = toysOn;   // R18: leker som lever (toys_live.js): reagerer på dytt, landing og TA/slipp
// maur: én modell per patrulje (v0.77)
LEVEL.noCreatures = !creaturesOn; CREATURE_TUNE.warn = creatureWarn;     // R19
LEVEL.noWasps = !waspOn;                                                  // R61
const ANT_COL = [0x9a3a1e, 0x7a2a16, 0xb04a22, 0x8a3320];
const antMeshes = (LEVEL.antList || []).map((t, i) => {
  const a = LEVEL.ants[i].skin === 'train' ? buildTrain() : isSoldier(LEVEL.ants[i]) ? buildSoldier() : t.type === 'roller' ? buildRoller() : t.type === 'dangler' ? buildDangler({ ceil: LEVEL.room?.height ?? 48 }) : t.type === 'wasp' ? buildWasp() : t.type === 'spider' ? buildSpider() : t.type === 'carrier' ? buildCarrier() : buildAnt({ color: ANT_COL[i % ANT_COL.length], crumb: !!LEVEL.ants[i].crumb });   // R6: tre slag, hver med egen modell
  a.root.userData.antId = t.id; scene.add(a.root); if (!gfxLow) look.detailize(a.root);
  let drop = null; if (t.type === 'carrier') { drop = buildDropCrumb(); drop.visible = false; scene.add(drop); }                 // smula bæreren slipper når den knuses
  return { t, a, drop, rot: Math.atan2(-t.fz, t.fx) };
});
// sjef-maur (R9): én stor modell, premien (gyllen smule) og helsebaren
const bossMesh = LEVEL.bossS ? (() => { const m = buildBoss(), prize = buildPrize(); prize.visible = false; scene.add(m.root, prize); if (!gfxLow) look.detailize(m.root); return { ...m, prize, rot: 0 }; })() : null;
const bossBar = LEVEL.bossS ? createBossBar(document.body, TOUCH ? T('btn.jump') : 'Mellomrom') : null;
// smuler (R3): gylne smuler som flyter og snurrer; tatt = skjult
const gateViews = buildGateViews(scene, LEVEL);   // R60: plater, dører, broer og brytere (ingenting tegnes i brett uten `gates`)
const puzzleViews = buildPuzzleViews(scene, LEVEL);                                                                              // R7: plate og bro
const crumbMeshes = (LEVEL.crumbList || []).map((c) => { const m = buildCrumb(); m.root.position.set(c.x, c.y, c.z); scene.add(m.root); return { c, m }; });
// taubaner (nål + tråd) opprettes av fysikken: en tynn rød tråd mellom to knuter
const zipMeshes = new Map();
function syncZips() {
  const alive = new Set(LEVEL.zips || []);
  for (const z of alive) if (!zipMeshes.has(z)) {
    const line = makeCyl(0.035), k1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), line.material), k2 = k1.clone();
    line.material = new THREE.MeshStandardMaterial({ color: 0xd04a4a, roughness: 0.8, emissive: 0x3a0c0c }); k1.material = k2.material = line.material;
    k1.position.set(...z.a); k2.position.set(...z.b); setCyl(line, new THREE.Vector3(...z.a), new THREE.Vector3(...z.b));
    scene.add(line, k1, k2); zipMeshes.set(z, [line, k1, k2]);
  }
  for (const [z, ms] of zipMeshes) if (!alive.has(z)) { scene.remove(...ms); zipMeshes.delete(z); }
}
// laget grep (hårgelé, papirbånd) opprettes av fysikken mens du spiller: tegnes her
const madeMeshes = new Map();
function syncMade() {
  const alive = new Set(LEVEL.made || []);
  for (const b of alive) {
    if (!madeMeshes.has(b)) {
      const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
      const g = buildSingle(b.kind, [sx, sy, sz], { color: b.color, id: b.id, material: b.material });
      if (!g) continue;
      g.position.set(b.min[0] + sx / 2, b.min[1] + sy / 2, b.min[2] + sz / 2); scene.add(g); madeMeshes.set(b, { g, dry: false, mark: b.grip ? gripMark(b) : null });
    }
    const m = madeMeshes.get(b);
    if (m && b.kind === 'gel' && !b.wet && !m.dry) { m.dry = true; m.g.userData.dry?.(); }
  }
  for (const [b, m] of madeMeshes) if (!alive.has(b)) { scene.remove(m.g); if (m.mark) { scene.remove(m.mark.g); gripMarks.splice(gripMarks.indexOf(m.mark), 1); } madeMeshes.delete(b); }
}
const shards = [];
function spawnShards(pos, color) {
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshStandardMaterial({ color: color ?? 0xdddddd, roughness: 0.4 }));
    m.position.set(...pos); m.castShadow = true; scene.add(m);
    shards.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 8, 3 + Math.random() * 5, (Math.random() - 0.5) * 8), t: 1.6 });
  }
}

const player = newPlayer(...LEVEL.start);
const save = { pos: [...LEVEL.start] };
const stats = { boss: 0, saves: 0, respawns: 0, broken: 0, resets: 0, hard: 0, hits: 0, squashed: 0, crumbs: 0, carried: 0, flew: false };
let mode = 'play';                 // play | plan | fly
let won = false, clock = 0;
if (hasGates(LEVEL)) { const gb = gatesBudget(LEVEL); logEv('gåte', `${gateViews.count} deler, ${gb.calls} tegnekall, ${gb.tris} trekanter`); }
let buildSndLogged = false;   // R99: logg første bygglyd
const buildSnd = (n) => (...a) => { if (!buildSndLogged && audio) { buildSndLogged = true; logEv('lyd', `første bygglyd: ${n}`); } return audio?.[n]?.(...a); };
const buildAudio = Object.fromEntries(['crumb', 'bcreak', 'bbreak', 'bsplash', 'bhop', 'win', 'bplace', 'brod', 'battach', 'bknot', 'bpop', 'bstart', 'barrive', 'bstars'].map((n) => [n, buildSnd(n)]));
const bld = createBuildMode({ onGoLevel: (id) => goLevel(id), onOpen: (id) => schoolOnBuildOpen(id), onClose: () => schoolV.hide(), onStagePass: (id, r) => schoolOnPass(id, r), onMenu: () => quitToMenu('bygg'), onStat: (name, data) => sts.track(name, levelId, data), menuLabel: () => dft(lang, 'df.menu'), scene, LEVEL, player, $, T, logEv, toast, TOUCH, buzz, audio: buildAudio, getSlow: () => buildSlow, getStrength: () => buildStrength, getWorld: () => buildWorld, getBuildTex: () => buildTex, getTexLow: () => texLow, getSeeHint: () => buildSeeHint, getDbl: () => buildDbl, getFine: () => buildFine, getStress: () => buildStress, getBreakFx: () => buildBreakFx, getLego: () => buildLego, store, levelId, getBudget: () => buildBudget, getBonus: () => buildBonus, getBonusStep: () => buildBonusStep, getLoads: () => buildLoads, getLabFree: () => labFree, getShare: () => buildShare, getGhost: () => buildGhost, getCap: () => buildCap, getTruss: () => buildTruss, getAxial: () => buildAxial, getGrid: () => buildGrid, getGridHint: () => DIF.gridHint, getSquareTip: () => squareTipOn, getGridGuide: () => gridGuide, getGridMax: () => buildGridMax, getGridStress: () => buildGridStress, getGridPeak: () => buildGridPeak, getGridDeck: () => buildGridDeck, getGridGamma: () => buildGridGamma, getGridSlow: () => buildGridSlow, getStage: () => ({ on: gridStage, lock: gridLock, massK: gridMassK, budgetK: gridBudgetK }), getPlayGrid: () => gridPlay, getBuildUx: () => buildUx, getLoupe: () => buildLoupe, getLoupeZoom: () => buildLoupeZoom, getLoupeSize: () => buildLoupeSize, getBuildNext: () => buildNext, getPartsStart: () => partsStart, getMirror: () => buildMirror, getSpan: () => ({ on: buildSpan, expert: difficulty === 'expert', help: helpLevel }), getBuxHelp: () => ({ labels: DIF.gridHint && buildUxLand, suggest: difficulty === 'beginner' && buildUxLand }), getPlayLock: () => gridPlayLock, getVersion: () => VERSION, getCode: () => store.get('tlm.tcode', ''), getCrumbs: () => (crumbsOn ? Math.max(crumbCount(LEVEL), getBest(store)[levelId]?.crumbs || 0) : 0), onSolved: (id) => { if (setGoalFlag(LEVEL, id)) logEv('delmål', `bygget ${id} klart`); }, isPlay: () => mode === 'play', isMenu: () => menuOpen, isBoss: () => bossFighting(), isWon: () => won, isOv: () => ov.active, getSnap: () => buildSnap, setSnap: (v) => { buildSnap = v; store.set('tlm.buildsnap', v); }, allParts: () => buildAll, onChange: () => saveProgress() });   // R24: byggeskjermen (build.js, build_logic.js)

// Sjefkamp (R9): er figuren skjult bak sjefen sett fra kameraet, tegnes den over (uten dybdetest) så spilleren alltid ser hvor figuren er (Pixar-regi: helten alltid i bildet)
const _ray = new THREE.Raycaster(), _hv = new THREE.Vector3(), _hd = new THREE.Vector3();
let heroXray = false;
function heroSeen(check) {
  let want = false;
  if (check) {
    _hv.set(player.x, player.y + 0.6, player.z); _hd.copy(_hv).sub(camera.position); const dist = _hd.length(); _hd.normalize();
    _ray.set(camera.position, _hd); _ray.far = dist;
    const hits = _ray.intersectObject(bossMesh.root, true); want = hits.length > 0 && hits[0].distance < dist - 0.25;
  }
  if (want === heroXray) return; heroXray = want;
  hero.root.traverse((o) => { if (!o.isMesh) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) { if (m.userData.dt0 === undefined) m.userData.dt0 = m.depthTest; m.depthTest = want ? false : m.userData.dt0; } o.renderOrder = want ? 40 : 0; });
}
function toast(msg, low = false) {
  const t = $('toast'); t.textContent = msg; t.classList.toggle('low', low); t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1700);
}
// R53: viktige tekster går via toppbåndet når det er på (ellers vanlig toast). prio: PRIO.danger / reply / hint.
let tbReady = null;
const bandSay = (id, prio, msg, ttl = 5, kind = 'msg') => { if (!(tbReady && tbReady.push(id, prio, msg, ttl, kind))) toast(msg); };
const tip = (msg) => { if (DIF.contextHints) bandSay('tip', PRIO.hint, msg, 6, 'hint'); };   // R69: Ekspert har ingen hint som dukker opp
const points = () => Math.max(0, SCORE.start - stats.saves * SCORE.save - stats.respawns * SCORE.respawn - stats.broken * SCORE.broken - stats.resets * SCORE.resetThings - stats.hard * SCORE.hardLand - (stats.hits || 0) * SCORE.antHit - Math.floor(clock / 10) * SCORE.perTenSeconds + (stats.crumbs || 0) * SCORE.crumb + (stats.carried || 0) * SCORE.carried + (stats.boss || 0) * SCORE.boss);
let camReady = false;       // cam er deklarert lenger ned
function placeFlag() {          // flagget settes ved siden av figuren (ikke under beina), og bare der det finnes gulv
  const [x, y, z] = save.pos, ok = (px, pz) => { const s = surfaceBelow(LEVEL, px, y + 0.1, pz, 0.12); return !!s && Math.abs(s.top - y) < 0.06; };
  // plassering i skjermrom: foran-til-venstre for figuren sett fra kameraet, bort fra knappesonen (TA/HOPP/GREP nede til høyre, stikka nede til venstre)
  const yaw = camReady ? cam.yaw : 0.35, rx = Math.cos(yaw), rz = -Math.sin(yaw), fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const dirs = [[-0.7, 0.7], [-1, 0.2], [0, 1], [-1, -0.4], [-0.4, 1], [-0.9, 0.9], [0.5, 1], [1, 0.6]];   // [høyre, frem] i skjermrom
  let best = [x, y, z], found = false;
  for (const r of [1.1, 1.4, 0.95]) {
    for (const [sx, sf] of dirs) {
      const l = Math.hypot(sx, sf), dx = (rx * sx + fx * sf) / l, dz = (rz * sx + fz * sf) / l, px = x + dx * r, pz = z + dz * r;
      const base = surfaceBelow(LEVEL, px, y + 0.1, pz, 0.4);
      if (base && Math.abs(base.top - y) < 0.06 && ok(px, pz) && freeAt(LEVEL, px, y + 0.5, pz)) { best = [px, y, pz]; found = true; break; }
    }
    if (found) break;
  }
  flagV.place(best, found ? ok : () => false);       // ingen trygg plass: stang ved beina, uten klosser og uten glødring
}
function lightFlag(why, quiet = false) { flagV.ignite(quiet); if (!quiet) logEv('flagg tent', why); }
placeFlag();
{ const g = LEVEL.goal; goalRing.clip((px, pz) => { const s = surfaceBelow(LEVEL, px, g[1] + 0.1, pz, 0.12); return !!s && Math.abs(s.top - g[1]) < 0.12; }); }

// ---------- autolagring: fremgangen huskes per brett, så en kort mobiløkt kan fortsette der du var ----------
let progKey = diffProgKey(levelId, LEVEL.rev, difficulty);       // rev: brettet er bygd om (gammel fremgang passer ikke lenger). R69: per vanskelighet (Nybegynner = gammel nøkkel)
let runDiffMin = DIFFS.indexOf(difficulty);                       // R69: laveste (mest hjelp) vanskelighet brukt i dette løpet; merket følger den
if (new URLSearchParams(location.search).get('fresh') === '1') { store.set(progKey, null); try { const u = new URL(location.href); u.searchParams.delete('fresh'); history.replaceState(null, '', u.pathname + u.search); } catch { /* ingen historikk */ } }   // «Velg brett»: spill fra start uten å slette annen fremgang
let autoPos = null, autoT = 0, resumed = false;
let noSave = false;       // satt rett før siden lastes på nytt etter «Nytt spill», så pagehide ikke skriver gammel fremgang tilbake
function saveProgress() { if (won || !autosaveOn || noSave) return; store.set(progKey, { v: PROGRESS_VERSION, save: save.pos, auto: autoPos, stats, clock, fails: [...failCells], crumbs: collectedIds(LEVEL), puzzles: puzzleOpenIds(LEVEL), gates: gatesSave(LEVEL), goals: goalDoneIds(LEVEL), goalFlags: goalFlagList(LEVEL), build: bld.save(), dmin: runDiffMin }); }
function clearProgress() { autoPos = null; store.set(progKey, null); }
const failCells = new Map();
let compassForce = 0;
function failAt(why = 'fall') {
  logEv('tilbake', why);
  const k = `${Math.round(player.x / 6)}|${Math.round(player.y / 6)}|${Math.round(player.z / 6)}`, n = (failCells.get(k) || 0) + 1; failCells.set(k, n);
  if (failHintOn && DIF.failTips > 0 && n >= DIF.failTips && n % DIF.failTips === 0) setTimeout(() => { const t = nextTarget(); compassForce = performance.now() + 15000; toast(`Tips: prøv ${t.final ? 'målet' : t.label}${t.act ? ` (${t.act})` : ''}. Pilen viser veien.`); }, 1800);
}
{
  const pr = normProgress(store.get(progKey, null)), okAt = (p) => Array.isArray(p) && p.length === 3 && freeAt(LEVEL, p[0], p[1] + 0.05, p[2]);
  if (autosaveOn && pr && pr.clock > 4 && okAt(pr.save)) {
    if (Number.isInteger(pr.dmin)) runDiffMin = Math.max(0, Math.min(runDiffMin, pr.dmin));
    save.pos = pr.save; Object.assign(stats, pr.stats || {}); clock = pr.clock; autoPos = okAt(pr.auto) ? pr.auto : null;
    for (const [k, v] of pr.fails || []) failCells.set(k, v);
    stats.crumbs = restoreCollected(LEVEL, pr.crumbs); restorePuzzles(LEVEL, pr.puzzles); restoreGates(LEVEL, pr.gates); restoreGoals(LEVEL, pr.goals, pr.goalFlags); bld.load(pr.build);
    resetPlayer(player, ...(autoPos || save.pos)); placeFlag(); if (stats.saves > 0) flagV.ignite(true); resumed = true;
  }
}
addEventListener('pagehide', saveProgress);
for (const n of storeNotes) logEv('lagring', n);
if (resumed) logEv('gjenopptatt');
logEv('grade', gradeMode + (gfxLow ? ' (enkel: ingen kantlys/fyll/filter)' : ''));   // R1: hvilken gradering som kjører (rapporten)
if (resumed) setTimeout(() => toast('Fortsetter der du var · ⚙ → Start på nytt for å begynne på nytt'), 1500);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveProgress(); });

function doSave() {
  if (mode !== 'play') return toast('Gå ut av plan-/flymodus først');
  if (!player.onGround) return toast('Stå støtt for å lagre');
  save.pos = [player.x, player.y, player.z]; stats.saves++; placeFlag(); lightFlag('lagringspunkt'); audio?.checkpoint(); saveProgress();
  logEv('lagret'); toast(`Lagringspunkt satt  −${SCORE.save} poeng`);
}
function goBack() {
  if (mode !== 'play') return;
  logEv('tilbake', 'knapp'); resetPlayer(player, ...save.pos); stats.respawns++;
  toast(`Tilbake til lagringspunkt  −${SCORE.respawn} poeng`);
}
const lostQueue = [];
function stepLost(dt) {
  for (let i = lostQueue.length - 1; i >= 0; i--) {
    const q = lostQueue[i]; q.t -= dt; if (q.t > 0) continue;
    if (returnBody(LEVEL, q.id, player)) { toast(`${q.id} er tilbake på plassen sin`); lostQueue.splice(i, 1); } else q.t = 1;
  }
}
function resetThings() {
  if (mode !== 'play') return;
  if (!(LEVEL.bodies || []).some((b) => !b.alive || b.min.some((v, i) => Math.abs(v - b.home.min[i]) > 0.05))) return toast('Alt står på plass');
  logEv('ting nullstilt'); resetBodies(LEVEL, player); resetToys(toyLife); resetShortcutWatch(shortcutWatch); stats.resets++; say('reset');
  toast(`Ting satt tilbake  −${SCORE.resetThings} poeng`);
}
function restartAll() {
  runDiffMin = DIFFS.indexOf(difficulty); clearProgress(); failCells.clear(); bld.resetAll();
  resetPlayer(player, ...LEVEL.start);
  resetBodies(LEVEL, player); resetToys(toyLife); resetShortcutWatch(shortcutWatch);
  save.pos = [...LEVEL.start]; stats.saves = stats.respawns = stats.broken = stats.resets = stats.hits = stats.squashed = stats.crumbs = stats.carried = stats.boss = 0; stats.flew = false; resetAnts(LEVEL); resetBoss(LEVEL); resetCollect(LEVEL); resetPuzzles(LEVEL); resetGates(LEVEL); resetGoals(LEVEL); bridgeGuide = null;
  won = false; clock = 0; placeFlag(); flagV.extinguish(); $('win').classList.add('hide'); setMode('play');
}

// ---------- modus: plan / fly ----------
if (grade.params.gloss > 1) scene.traverse((o) => { const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; for (const m of ms) if (m.isMeshPhysicalMaterial && m.clearcoat > 0 && !m.transparent && !m.envMap) { m.envMap = scene.environment; o.geometry.computeBoundingBox(); const bs = o.geometry.boundingBox.getSize(new THREE.Vector3()).multiply(o.getWorldScale(new THREE.Vector3())); m.envMapIntensity = Math.max(bs.x, bs.y, bs.z) > 30 ? 1 : grade.params.gloss; } });   // R1 (store flater får ikke ekstra speiling, ellers utbrent): all blank klarlakk (props.js m.m.) speiler miljøet tydelig
const camReady0 = (camReady = true);
const cam = { yaw: 0.35, pitch: viewMode === 'shoulder' ? 0.18 : viewMode === 'first' ? 0.05 : 0.3, dist: camDistSet, cur: viewMode === 'shoulder' ? shDist : camDistSet, target: new THREE.Vector3(...LEVEL.start) };
let camBossOx = 0, camBossOz = 0, camBossK = 0, camBossShift = 0, camBossDist = 0, camBossPitch = 0;   // sjef-kamera (R9), glattet
let camLook = 0, camPitchBias = 0, camLift = 0, camUpTilt = 0, camAssist = store.get('tlm.camassist', true);
let cineH = 0, cineHS = 1;   // R68: kinomodus: ekstra høyde på blikkpunktet i følgekameraet
let camFocusY = null;   // rolig høydefølging: kameraet hopper ikke med hvert hopp
const planCam = { yaw: 0.6, pitch: 0.7, dist: 55, pivot: new THREE.Vector3(8, 15, 0) };
if (levelName) {                                   // mindre rom: nærmere og mer ovenfra
  planCam.dist = Math.max(LEVEL.room.x1 - LEVEL.room.x0, LEVEL.room.z1 - LEVEL.room.z0) * 1.05;
  planCam.pitch = 1.15;
}

function setMode(m) {
  audio?.quietLoops();
  if (m === mode) m = 'play';
  if (mode === 'fly' && m !== 'fly') {      // lande: ikke fast inni noe
    player.vx = player.vy = player.vz = 0; player.state = 'air';
    for (let i = 0; i < 400 && !freeAt(LEVEL, player.x, player.y, player.z); i++) player.y += 0.25;
  }
  mode = m;
  if (m === 'plan') planCam.pivot.set(player.x, player.y + 4, player.z);
  if (m === 'fly') { stats.flew = true; toast('Flymodus – tiden teller ikke som gyldig'); }
  $('bPlan').classList.toggle('on', m === 'plan'); $('bFly').classList.toggle('on', m === 'fly');
  if (m === 'plan') toast(TOUCH ? 'Plan: stikken flytter, dra for å snurre, klyp for zoom' : 'Plan: WASD flytter, dra for å snurre, hjul/klyp for zoom');
}

// ---------- input ----------
const keys = new Set();
let jumpEdge = false, grabEdge = false, carryEdge = false;
const touch = { x: 0, y: 0, jump: false, grab: false, carry: false };
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
  if (menuOpen) { if (e.code === 'Escape') $('panel').classList.add('hide'); return; }       // startskjermen er oppe: ingen spilltaster
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  if (e.repeat || keys.has(e.code)) return;
  keys.add(e.code);
  if (e.code === 'Space') jumpEdge = true;
  if (['ShiftLeft', 'ShiftRight', 'KeyE'].includes(e.code)) grabEdge = true;
  if (e.code === 'KeyK') doSave();
  if (e.code === 'KeyR') goBack();
  if (e.code === 'KeyZ') camBehind();
  if (e.code === 'KeyT') restartAll();
  if (e.code === 'KeyF') carryEdge = true;
  if (e.code === 'KeyN') resetThings();
  if (e.code === 'KeyM') toggleSound();
  if (e.code === 'KeyV') toggleCues();
  if (e.code === 'KeyX') toggleAutoCam();
  if (e.code === 'KeyL' && labels.length) { labelsOn = !labelsOn; store.set('tlm.labels', labelsOn); toast(labelsOn ? 'Brukslapper på' : 'Brukslapper av'); const c = document.getElementById('chkLabels'); if (c) c.checked = labelsOn; }
  if (e.code === 'KeyP' || e.code === 'Tab') setMode('plan');
  if (e.code === 'KeyG') setMode('fly');
  if (e.code === 'KeyH') $('help').classList.toggle('hide');
  if (e.code === 'Escape') $('panel').classList.add('hide');
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
const held = (...codes) => codes.some((c) => keys.has(c));

let mouseSens = store.get('tlm.mousesens', 0.45);                              // mus er mye raskere enn en tommel: egen følsomhet (v0.69)
let camSens = store.get('tlm.camsens', 1), camInvY = store.get('tlm.caminvy', false);   // camInvY: dra opp = se ned (omvendt av standard)
let blobOn = store.get('tlm.blob', true);
let helpLevel = store.get('tlm.helplevel', 'normal'), followStrength = store.get('tlm.followstr', 1), fovSet = store.get('tlm.fov', 52), fovManual = store.get('tlm.fovauto', null) === null ? fovChosen(store.get('tlm.fov', null)) : !store.get('tlm.fovauto', true), fovAutoCur = fovForAspect(innerWidth / innerHeight), fovOrient = null, pitchBase = store.get('tlm.pitchbase', 0.26);
let stickCurve = store.get('tlm.stickcurve', 1.3), inertia = store.get('tlm.inertia', 1), speedScale = store.get('tlm.speedscale', 1), qbtnOn = store.get('tlm.qbtn', true);
const metrics = { swipes: 0, dragPx: 0, yawUser: 0, yawAuto: 0, stickT: 0, t: 0 };
let stepAdapt = store.get('tlm.stepadapt', true), reactAnim = store.get('tlm.reactanim', true);
let turnStepsOn = store.get('tlm.turnsteps', true), stepOverOn = store.get('tlm.stepover', true), gripPosesOn = store.get('tlm.gripposes', true), climbFeelStr = store.get('tlm.climbfeel', 1);
let roomTone = store.get('tlm.roomtone', true), realSounds = store.get('tlm.realsounds', true);   // R99
let breathSound = store.get('tlm.breathsound', false);                        // R38: pustelyd av som standard (egen lagringsnøkkel)
let idleWink = store.get('tlm.idlewink', true), restBreath = store.get('tlm.restbreath', false);
const mixSet = (ids, v) => { const mix = store.get('tlm.mix2', {}); for (const id of ids) { mix[id] = v; audio?.setLevel(id, v); } store.set('tlm.mix2', mix); };
const mixGet = (id) => store.get('tlm.mix2', {})[id] ?? 1;
let stickFloat = store.get('tlm.stickfloat', false), mouseLook = store.get('tlm.mouselook', true);
let camAnim = null;                                                           // mykt kameraskift: {from, to, pf, pt, t}
const angDiff = (a, b) => ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
function turnCamera(toYaw, toPitch) { camAnim = { from: cam.yaw, d: angDiff(cam.yaw, toYaw), pf: cam.pitch, pt: toPitch ?? cam.pitch, t: 0 }; lastDrag = -99; }
const camBehind = () => turnCamera(Math.atan2(-player.fx, -player.fz), viewFirst ? 0.1 : 0.32);                       // bak figuren, litt ovenfra
// neste hinder: ruta fra rute-grafen (flater og grep-flater i rekkefølge); uten rute (håndlagde brett) er det målet
let routeCur = 0, goalLockMsg = 0, goalView = null;
function nextTarget() {
  const R = LEVEL.route, g = LEVEL.goal;
  if (puzzlesOn && mode === 'play' && bridgeGuide) {                              // R7: etter åpning peker pila på broen til du er over
    const e = bridgeFarEnd(bridgeGuide);
    if (Math.hypot(player.x - e.x, player.z - e.z) < 2 || performance.now() > bridgeGuide.until || !nearBridge(bridgeGuide, player)) bridgeGuide = null;   // også når du har falt/respawnet bort fra broen
    else return { x: e.x, y: e.y, z: e.z, label: T('puz.bridgeLbl'), final: false, act: '', kind: 'route' };
  }
  if (puzzlesOn && mode === 'play') { const pt = puzzleTarget(LEVEL, player); if (pt) return { x: pt.x, y: pt.y, z: pt.z, label: T('puz.' + pt.key), final: false, act: pt.key === 'plate' ? T('btn.drop') : T('btn.take'), kind: pt.key === 'plate' ? 'plate' : 'key' }; }   // R7: nøkkel, så lås
  const fw = mode === 'play' ? floodNow() : null;                                    // R65: stigende vann på: bare tørre mål, ellers høyeste tørre flate
  if (goalsOn && goalArrowOn && mode === 'play') {                                  // R23: pila peker mot aktivt delmål (reach/smuler/maur/sjef); gåter har egen veiledning over
    let ag, gt;
    if (fw) { const pk = pickGoal(LEVEL, player, fw.wl, { crumbs: crumbCount(LEVEL), stomps: stats.squashed || 0 }); floodPick = pk; ag = pk.goal; gt = pk.target; if (!ag && pk.refuge) return { ...pk.refuge, label: T('water.refuge'), final: false, act: '', kind: 'reach' }; }
    else { floodPick = null; ag = activeGoal(LEVEL); gt = ag && goalTarget(LEVEL, ag, player); }
    if (!gt && ag?.type === 'flag' && buildSpan) { const st = bld.spanArrow(player); if (st) gt = { x: st.x, y: st.y, z: st.z }; }   // R118: delmålet «bygg» har ikke noe punkt: pila peker mot FRA-siden av byggestedet til du er nær
    if (gt) return { x: gt.x, y: gt.y, z: gt.z, label: goalLabel(ag, lang), final: false, act: '', kind: guideKind(ag, gt), ref: guideRef(ag, gt) };
  }
  if (R?.length > 1) {
    routeIndex();
    const w = R[Math.min(routeCur + 1, R.length - 1)];
    if (fw && w !== R[R.length - 1] && !w.grip && isWet(w.top, fw.wl)) { const rf = refugeOf(fw); if (rf) return { ...rf, label: T('water.refuge'), final: false, act: '', kind: 'reach' }; }   // R65: neste trinn er under vann
    if (w !== R[R.length - 1]) return { x: Math.max(w.x0, Math.min(w.x1, player.x)), y: w.top, z: Math.max(w.z0, Math.min(w.z1, player.z)), label: (lang === 'en' && w.en) || w.label || nameOfId(w.id).replace(/_/g, ' '), final: false, act: w.act || (w.grip ? 'klatre' : ''), kind: 'route', grip: !!w.grip };
  }
  return { x: g[0], y: g[1], z: g[2], label: T('compass.goal'), final: true, kind: 'route' };
}
// R64: hvilken flate på ruta står figuren på (oppdaterer routeCur). Egen funksjon så veiledningen kan bruke den også når delmål styrer pila.
function routeIndex() {
  const R = LEVEL.route; if (!(R?.length > 1)) return 0;
  let i = -1;
  if (player.state === 'climb') i = R.findIndex((w) => (w.grip || w.via) && w.id === player.climb?.box?.id);
  else if (player.onGround) R.forEach((w, k) => { if (!w.grip && !w.via && player.y - w.top > -0.3 && player.y - w.top < 3.5 && player.x >= w.x0 - 0.3 && player.x <= w.x1 + 0.3 && player.z >= w.z0 - 0.3 && player.z <= w.z1 + 0.3) i = k; });   // flaten du står på (også når du står på en løs ting oppå)
  if (i >= 0) routeCur = i;
  return routeCur;
}
// R64: type mål for veiledningen (dangler/maur/smuler/bryter/flate) og selve skapningen
function guideRef(ag, gt) { return ag.type === 'stomp' ? (LEVEL.antList || []).find((q) => q.alive && q.x === gt.x && q.y === gt.y && q.z === gt.z) || null : null; }
function guideKind(ag, gt) {
  if (ag.type === 'stomp') { const q = guideRef(ag, gt); return q?.type === 'dangler' ? 'dangler' : 'ant'; }
  if (ag.type === 'crumbs') return 'crumbs';
  if (ag.type === 'gate') return (LEVEL.gateS?.switches || []).some((q) => q.x === gt.x && q.y === gt.y && q.z === gt.z) ? 'switch' : 'goal';
  return 'reach';
}
const camToGoal = () => { const t = nextTarget(); turnCamera(Math.atan2(-(t.x - player.x), -(t.z - player.z)), viewFirst ? 0.1 : 0.32); };    // neste mål rett frem
function stepCamAnim(dt) {
  if (!camAnim) return; camAnim.t = Math.min(1, camAnim.t + dt / 0.4); const k = 1 - Math.pow(1 - camAnim.t, 3);
  cam.yaw = camAnim.from + camAnim.d * k; cam.pitch = camAnim.pf + (camAnim.pt - camAnim.pf) * k; if (camAnim.t >= 1) camAnim = null;
}
const compEl = $('compass'), compArrow = $('compArrow'), compTxt = $('compTxt');
const arrowShape = new THREE.Shape([[0, 0.5], [0.3, -0.25], [0, -0.1], [-0.3, -0.25]].map(([x, y]) => new THREE.Vector2(x, y)));
const arrowGeo = new THREE.ShapeGeometry(arrowShape);
const arrowMat = (color, order) => { const m = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }); m.userData.order = order; return m; };
const goalArrow = new THREE.Mesh(arrowGeo, arrowMat(0xff9a1f, 7));   // R14: full dekning, med hvit glorie og mørk kant så pila leses på lyse gulv og fra lavt kamera
goalArrow.rotation.x = -Math.PI / 2; goalArrow.renderOrder = 7; goalArrow.visible = false;
for (const [color, k, ord, z] of [[0x10151f, 1.5, 5, -0.004], [0xffffff, 1.28, 6, -0.002]]) { const o = new THREE.Mesh(arrowGeo, arrowMat(color)); o.scale.set(k, k, 1); o.renderOrder = ord; goalArrow.add(o); }
const goalArrowG = new THREE.Group(); goalArrowG.add(goalArrow); scene.add(goalArrowG);
const introV = createIntroView({ scene, $, T, low: gfxLow });
{ const sh = introV.showHint.bind(introV), hh = introV.hideHint.bind(introV);       // R53: hint-bobla går via båndet når det er på
  introV.showHint = (label, text) => { sh(label, text); tb.push('intro', PRIO.hint, `${label ? label + ': ' : ''}${text}`, 10, 'hint'); };
  introV.hideHint = () => { hh(); tb.clear('intro'); }; }
let introSweep = null, introTgt = null, introHintT = 0;   // R22: sveip, første delmål og hint-tid
function introEnd(skipped) {
  introSweep = null; introV.hideSweep(); menuOpen = false; logEv('intro', skipped ? 'sveip hoppet over' : 'sveip ferdig');
  if (introHintOn && DIF.introHint && introKey(levelInfo?.n)) { const nm = introTgt ? ((lang === 'en' && introTgt.en) || introTgt.label || nameOfId(introTgt.id).replace(/_/g, ' ')) : ''; introV.showHint(introTgt && introMarkOn && DIF.introMark ? T('intro.first', { name: nm.toUpperCase() }) : '', T(introKey(levelInfo.n), { jump: TOUCH ? T('btn.jump') : 'mellomrom', take: TA, grab: GREP })); introHintT = 10; }
}
function introBegin() {            // kalles ved friskt nivåstart (etter fortellerkortet), ikke ved Fortsett
  const n = levelInfo?.n; if (!n || !introKey(n)) return;
  introTgt = firstTarget(LEVEL.route, LEVEL.start, n); introV.setTarget(introTgt); introV.markerOn(introMarkOn && DIF.introMark); introV.hideHint();
  logEv('intro', introTgt ? `første delmål: ${introTgt.id}` : 'ingen første delmål');
  if (introSweepOn && DIF.introSweep && mode === 'play') { menuOpen = true; keys.clear(); touch.x = touch.y = 0; touch.jump = touch.grab = touch.carry = false; introSweep = createSweep(); introV.showSweep(() => { introSweep?.skip(); }); }
  else introEnd(false);
}
const mv = createMarkerView({ scene, camera, LEVEL, player, P, $, isPlay: () => mode === 'play' && !won, isOn: () => markersOn, logEv, getRank: () => markPlan });   // R14: markører som holder seg unna knappene (readable.js, readable_view.js)
const ov = createOverview({ scene, camera, LEVEL, player, mv, $, getYaw: () => cam.yaw, getSave: () => save.pos, getSaves: () => stats.saves, crumbsOn: () => crumbsOn, miniOn: () => (miniOn ?? !gfxLow) && DIF.minimap, isPlay: () => mode === 'play', isMenu: () => menuOpen, isBoss: () => bossFighting(), isWon: () => won, logEv, toast, getSpans: () => (buildSpan && bld.enabled ? spanMapDots(bld.spanSites()) : []) });   // R20: minikart (R118: byggesteder som spenn) og oversikt (overview.js, overview_logic.js)
let compKey = '', compShowUntil = 0, compIdleSince = 0;
const bossFighting = () => bossOn && !!LEVEL.bossS && !LEVEL.bossS.gone && ['windup', 'charge', 'stunned', 'hit', 'tired'].includes(LEVEL.bossS.mode);   // under sjefkamp: skjul NESTE-pillen så varsel og tekst får plass
// R14: infokortet skal aldri dekke HUD-en eller NESTE-bobla: kortet legges under HUD-en, og bobla under kortet (eller skjules når bruksanvisningen er åpen)
const hudEl = $('hud');
goalView = createGoalView({ $, T, getLang: () => lang, L: LEVEL, hudEl }); goalView.setOn(goalsOn && DIF.subgoalText);   // R23: delmål-panelet (goals_view.js)
// R53: toppbåndet samler HUD-linje, delmål, NESTE, hint, ℹ og ⚑. Av (innstilling) gir tilbake de gamle elementene.
let tbandOn = store.get('tlm.tband', true), tbSize = store.get('tlm.tbsize', 'compact');
const tb = createTopBand({ T, logEv, onInfo: () => { $('qpop').classList.add('hide'); infoTab.click(); }, onFlag: () => { if (infoOpen) closeInfo(); $('qbtn').click(); }, onNext: () => (guideOn ? startShowMeNow() : camToGoal()), onOpen: () => { $('qpop').classList.add('hide'); if (infoOpen) closeInfo(); questTapUntil = performance.now() + WAY.tapMs; logEv('maalvei', 'oppdragslinje hentet fram med ⋯'); } });
tb.setSize(tbSize); tb.setOn(tbandOn); tbReady = tb;
function bandCtx() {
  const act = activeGoal(LEVEL), total = goalTotal(LEVEL), st = { crumbs: crumbCount(LEVEL), stomps: stats.squashed || 0 };
  const play = mode === 'play' && !won;
  const fwn = play ? floodNow() : null;
  const c = { water: fwn ? levelBadge(fwn.level, fwn.cfg) : '', version: VERSION, noArrow: DIF.nextLine !== 'full', levelLabel: DIF.subgoalText ? levelLabel : '', nextText: play ? compState.text : null, nextHint: play ? compState.hint : '', nextAction: play ? compState.action : '', nextAng: compState.ang, goalHead: !DIF.subgoalText ? '' : play && act ? goalLine(LEVEL, act, lang, st) : (total > 0 && goalDone(LEVEL) === total ? T('goal.all') : ''),
    goalDone: goalDone(LEVEL), goalTotal: total, crumbs: crumbsOn && crumbTotal(LEVEL) ? { n: crumbCount(LEVEL), total: crumbTotal(LEVEL) } : null,
    infoOn: infoCard.style.display !== 'none', flagOn: qbtnOn, unread: $('qbtn').classList.contains('hasreply'), badge: markCount() + unsent('BACKLOGG') };
  if (tb.isOpen()) {
    c.goals = !DIF.subgoalText ? [] : (LEVEL.goalList || []).map((g) => ({ text: goalLine(LEVEL, g, lang, st), done: !!g.done, active: g === act }));
    c.send = sendState; const r = inbox?.replies?.[0]; c.reply = r ? `${r.version ? 'v' + r.version + ': ' : ''}${r.message}` : '';
    c.counts = inbox ? statsLines(inbox) : [];
  }
  return c;
}
function topLayout() {
  const open = infoCard.classList.contains('show'), cw = infoCard.offsetWidth, left = innerWidth - cw;
  const hr0 = hudEl.getBoundingClientRect(), gr = goalView?.el.classList.contains('show') ? goalView.el.getBoundingClientRect() : null;      // R23: delmål-panelet hører til samme øvre venstre hjørne som HUD-en
  const hr = gr ? { right: Math.max(hr0.right, gr.right), bottom: Math.max(hr0.bottom, gr.bottom), width: hr0.width } : hr0, hudHit = open && left < hr.right && hr.width > 0;
  const cardTop = hudHit ? Math.round(hr.bottom + 6) : null;
  infoCard.style.top = cardTop === null ? '' : `${cardTop}px`;
  let ct = ''; compEl.style.top = '';
  if (open && compEl.style.display !== 'none') {
    const cr = compEl.getBoundingClientRect(), natural = cr.top;
    const top = cardTop === null ? infoCard.getBoundingClientRect().top : cardTop, bottom = top + infoCard.offsetHeight;
    if (left < cr.left + cr.width && natural < bottom + 6 && natural + cr.height > top - 4) ct = `${Math.round(bottom + 6)}px`;
  }
  compEl.style.top = ct;
  if (open && ct && infoCard.classList.contains('manual')) compEl.style.display = 'none';
}
const compState = { text: null, hint: '', ang: 0, action: '' };    // R53: det NESTE-bobla viser, til toppbåndet
// R64: veiledning når målet er under, bak eller ikke i bildet (guide_logic.js, guide_view.js)
let guideOn = store.get('tlm.guide', true); GUIDE.stallMs = store.get('tlm.guidestall', 45) * 1000;
const stall = createStall(), showMe = createShowMe();
let guideKey = '', guideMsgAt = 0, guideRouteLogged = '', frGlowUntil = 0;
const guideV = createGuideView({ scene, T, logEv, onShow: () => startShowMeNow() });
// R98: oppdragslinje («ikon + neste mål») og peiling uten piler (Ekspert): goalway_logic.js / goalway_view.js
let questMode = normQuestMode(store.get('tlm.questline', 'auto')), wayPeekOn = store.get('tlm.waypeek', true), questTapUntil = 0; WAY.idleMs = (+store.get('tlm.waypeekms', 8) || 8) * 1000;
const wayS = createWay();
const wayV = createGoalWayView({ scene, T, logEv, onTap: (src) => { questTapUntil = performance.now() + WAY.tapMs; logEv('maalvei', src === 'ikon' ? 'trykk på mål-ikonet' : 'trykk på oppdragslinjen'); if (src === 'linje' && DIF.showMe) startShowMeNow(); } });
const questNow = (t) => questModel({ L: LEVEL, goal: goalsOn ? activeGoal(LEVEL) : null, t, T, lang, ctx: { crumbs: crumbCount(LEVEL), stomps: stats.squashed || 0, stars: buildBudget && bld.enabled ? bld.starsMap() : null } });
function wayFrame(now, t, ga) {
  const play = mode === 'play' && !won && !menuOpen && !introSweep && !bossFighting();
  const q = play ? questNow(t) : null, vis = play && questVisible({ mode: questMode, diffOn: DIF.questLine, tapUntil: questTapUntil, now }) && !infoCard.classList.contains('show');
  wayV.setQuest(q, vis, now < questTapUntil);
  const peekOn = play && wayPeekOn && !DIF.worldArrow && !DIF.compass;           // peilingen kommer i stedet for piler (Ekspert)
  const w = innerWidth, h = innerHeight, sc = peekOn ? mv?.toScreen(t.x, t.y, t.z) ?? null : null, inFrame = !!sc && !edgeMark({ s: sc, a: ga, w, h }), seen = !!sc && sc.x >= 0 && sc.x <= w && sc.y >= 0 && sc.y <= h;
  const r = stepWay(wayS, now, { key: (t.final ? '!' : '') + t.label, dist: ga.hdist + Math.abs(ga.dy), moving: Math.hypot(player.vx, player.vz) > WAY.moveSpeed, inFrame, seen, active: peekOn });
  if (!peekOn) { wayV.setPeek(null); wayV.setGlow(null, now); return; }
  if (r.peek) logEv('maalvei', `peiling vist (${r.peek}): ${q?.text || t.label}`);
  if (r.long) logEv('maalvei', `lang stillstand: ${q?.text || t.label}`);
  wayV.setPeek(r.showing && !inFrame ? peekMark({ a: ga, w, h }) : null, q?.icon || '📍');
  wayV.setGlow(r.glow && seen ? t : null, now);
}
const guideP = () => ({ jump: TOUCH ? T('btn.jump') : 'mellomrom', grab: GREP, take: TA, drop: TOUCH ? T('btn.drop') : 'F' });
const guideAimOf = (t) => aim({ dx: t.x - player.x, dy: t.y - player.y, dz: t.z - player.z, yaw: cam.yaw });
const guideAction = (t, a) => actionFor({ kind: t.kind || 'route', a, phase: danglerPhase(t.ref), grip: !!t.grip, act: t.act });
function startShowMeNow() {
  if (!DIF.showMe || showMe.phase !== 'idle' || mode !== 'play' || won || introSweep) return;
  const t = nextTarget(), dx = t.x - player.x, dz = t.z - player.z, a = guideAimOf(t);
  startShowMe(showMe, { yaw: cam.yaw, pitch: cam.pitch }, showMePlan({ dx, dz, a, pitch0: cam.pitch }));
  logEv('veiledning', `vis meg: ${t.label} (${a.vert}${a.vertDom ? ', loddrett' : ''})`);
}
function showMeFrame(dt) {
  if (showMe.phase === 'idle') return;
  if (mode !== 'play' || won) { showMe.phase = 'idle'; return; }
  const r = stepShowMe(showMe, dt);
  if (r.act === 'turn') turnCamera(r.yaw, r.pitch); else if (r.act === 'done') logEv('veiledning', 'vis meg: ferdig');
  lastDrag = performance.now() / 1000;                      // ingen automatisk dreining bak figuren mens kameraet viser veien
}
document.addEventListener('pointerdown', (e) => { if ((showMe.phase === 'to' || showMe.phase === 'hold') && !e.target.closest?.('#guideEdge')) { skipShowMe(showMe); logEv('veiledning', 'vis meg: hoppet over'); } }, true);
document.addEventListener('keydown', () => { if (showMe.phase === 'to' || showMe.phase === 'hold') skipShowMe(showMe); }, true);
// R65: stigende vann i Nivå 4 (flood_logic.js, flood_view.js). Bare aktivt når «stigende vann» er på; «Av (vanlig vann)» er uendret.
let floodWarnOn = store.get('tlm.floodwarn', true), floodShakeK = store.get('tlm.floodshake', 1), floodPick = null, floodVar = null;
const floodV = createFloodView(), floodSt = { drop: null, under: 0, shake: 0, highAt: -1e9, pct: -1, keys: {}, sayAt: {} };
function floodNow() { const cfg = floodWarnOn && DIF.waterWarn && floodVar?.floodCfg; return cfg ? { cfg, level: floodVar.water, wl: floodVar.water > 0.05 ? floodVar.floorY + floodVar.water : -Infinity, under: floodVar.under } : null; }   // wl = -Infinity så lenge vannet ikke har begynt å stige
const refugeOf = (fw) => refuge(LEVEL, fw.wl, player);
const floodEv = (k, detail) => { if (floodSt.keys[k] !== detail) { floodSt.keys[k] = detail; if (detail) logEv('vann', detail); } };
function floodSay(id, prio, txt, ttl, kind, now) { if (tb.isOn()) tb.push(id, prio, txt, ttl, kind, now); else if (!(now - (floodSt.sayAt[id] || 0) < 4000)) { floodSt.sayAt[id] = now; toast(txt, true); } }
function floodFrame(now, dt) {
  const cfg = floodVar?.floodCfg || null;
  floodV.style(floodVar?.waterMesh, cfg ? floodVar.water / cfg.max : 0, now / 1000, !!cfg);
  const fw = mode === 'play' && !won ? floodNow() : null;
  if (!fw) { floodV.vignette(0); floodSt.drop = null; floodSt.shake = 0; floodSt.under = 0; floodEv('under', ''); floodEv('drop', ''); floodEv('high', ''); return; }
  const al = drownAlert(fw.under, fw.cfg.grace), drop = dropIntoWater(LEVEL, player, fw.wl);
  floodV.vignette(al.on ? 0.2 + 0.5 * al.frac : 0); floodSt.shake = al.shake * floodShakeK;
  if (beepDue(floodSt.under, fw.under)) { audio?.floodwarn?.(); buzz(40); }
  floodSt.under = fw.under; floodSt.drop = drop;
  const blocked = !!floodPick && !floodPick.goal && floodPick.blocked.length > 0;
  const P = { jump: T('btn.jump'), grab: T('btn.grab') };
  if (al.on) { floodSay('flood', PRIO.danger, T('water.deep', { ...P, n: Math.ceil(al.left) }), 0.6, 'danger', now); floodEv('under', `hodet under vann (${al.left.toFixed(1)} s igjen)`); }
  else { floodEv('under', ''); if (drop) { floodSay('flood', PRIO.danger, T('water.below'), 0.6, 'danger', now); floodEv('drop', `varsel: nedhopp ${drop.drop.toFixed(1)} lander i vann`); } else floodEv('drop', ''); }
  if (!al.on && !drop && blocked) {
    if (now - floodSt.highAt > FG.highMs) { floodSt.highAt = now; floodSay('flood', PRIO.hint, T('water.high', P), 7, 'hint', now); }
    floodEv('high', `mål under vann: ${floodPick.blocked.join(', ')} · pek mot ${floodPick.refuge?.id || 'ingen flate'}`);
  } else if (!blocked) floodEv('high', '');
  const pc = Math.floor(floodPct(fw.level, fw.cfg) / 25) * 25; if (pc !== floodSt.pct) { floodSt.pct = pc; logEv('vann', `vannstand ${pc} %+`); }
}
// R66: ring på selve målet når det er i bildet (i stedet for pil); dempes og blir større med avstand, pulserer bare når målet er den viktigste markøren
const ringSpec = (t, a) => ({ ghost: t, ghostK: Math.min(4, Math.max(1, a.hdist / 8)), ghostA: rankStyle({ dist: a.hdist }, { range: 60 }).alpha, pulseGhost: !markPlan.on || !markCalm || markPlan.primary === 'goal:goal' });
const guideHide = (now = 0, a = null, t = null) => guideV.update({ ghost: null, ledge: null, mark: null, route: null, routeOn: false, ...(a && t && markPlan.on && goalDir.ring ? ringSpec(t, a) : {}) }, now);
let goalDir = { ring: false, arrow: true, chevron: true };
// Hver ramme når pila vises: kantmerke, ring, uthevet flate og båndtekst. a: aim(), t: nextTarget(), show: pila vises
function guideFrame(now, t, a, show) {
  const R = LEVEL.route, idx = routeIndex();
  if (!guideOn || !show || mode !== 'play' || won) { guideHide(now, show && mode === 'play' && !won ? a : null, t); return; }
  if (menuOpen || introSweep || showMe.phase !== 'idle') { stall.t0 = stall.t0 === null ? null : now; }    // pause: menyen og sveipene teller ikke som stillstand
  stepStall(stall, now, { goalKey: (t.final ? '!' : '') + t.label, routeIdx: idx, done: goalDone(LEVEL), dist: a.hdist });
  const w = innerWidth, h = innerHeight, sc = mv?.toScreen(t.x, t.y, t.z) ?? null, markRaw = edgeMark({ s: sc, a, w, h }), hidden = !!markRaw || a.vertDom;
  const mark = markPlan.on && helpLevel === 'none' ? null : markRaw;   // R66: Ingen hjelp = ingen verdensmarkører (båndet viser retningen)
  const surf = nextSurface(R, idx), routeOn = (now < frGlowUntil || (DIF.routeGlow && stalled(stall, now))) && !!surf;   // R97: hjelp til en som står fast tvinger lysglød en stund
  let ledge = null;
  if (showMe.phase === 'hold') { const cur = R?.[idx]; const lp = cur && !cur.grip ? ledgePoint(cur, t) : null; if (lp && Math.hypot(lp.x - player.x, lp.z - player.z) > 0.5 && (a.vert !== 'up' || a.vertDom)) ledge = lp; }
  guideV.update({ ...(hidden && a.hdist + Math.abs(a.dy) > 1.5 && !(markPlan.on && helpLevel === 'none') ? { ghost: t, pulseGhost: !markPlan.on || !markCalm || (markPlan.primary === 'goal:goal' && !routeOn) } : markPlan.on && goalDir.ring ? ringSpec(t, a) : { ghost: null }), pulseFrame: !markPlan.on || !markCalm || routeOn, ledge, mark, markText: mark ? (floodSt.drop ? `💧 ${T('water.edge')}` : `${glyph(a)} ${a.vertDom ? T(a.vert === 'down' ? 'guide.edge.down' : 'guide.edge.up') : T('guide.show')}`.trim()) : '', route: surf, routeOn }, now);
  if (routeOn && surf && guideRouteLogged !== surf.id) { guideRouteLogged = surf.id; logEv('veiledning', `rute utheves etter ${Math.round(GUIDE.stallMs / 1000)} s uten framdrift: ${surf.id}`); }
  if (!routeOn) guideRouteLogged = '';
  if (hidden && DIF.guideText) {                                                    // hele handlingssetningen i båndet når målet er skjult (ved nytt mål og så med jevne mellomrom)
    const key = (t.final ? '!' : '') + t.label + '|' + a.vert + (a.vertDom ? 'v' : '');
    if (key !== guideKey || now - guideMsgAt > GUIDE.repeatMs) {
      if (key !== guideKey) logEv('veiledning', `skjult mål: ${t.label} · ${a.vert}${a.vertDom ? ' loddrett' : ''}${a.behind ? ' bak' : ''}${mark ? ' kantmerke' : ''}`);
      guideKey = key; guideMsgAt = now;
      const act = guideAction(t, a), txt = T(act.key, { ...guideP(), ...act.params });
      if (!tb.push('guide', PRIO.hint, txt, 7, 'hint', now)) toast(txt, true);
    }
  } else guideKey = '';
}
function compassFrame(now) {
  document.body.classList.toggle('bossfight', bossFighting());
  if (bossFighting()) { const bm = LEVEL.bossS.mode; if (bm === 'windup' || bm === 'charge') tb.push('boss', PRIO.danger, T('tb.boss.dodge'), 0.6, 'danger'); else if (bm === 'stunned') tb.push('boss', PRIO.danger, T('tb.boss.stun', { jump: TOUCH ? T('btn.jump') : 'Mellomrom' }), 0.6, 'danger'); }
  const t = nextTarget(), dx = t.x - player.x, dz = t.z - player.z, dist = Math.hypot(dx, dz);
  const ga = guideAimOf(t); wayFrame(now, t, ga); const anyArrow = DIF.compass || DIF.worldArrow, forced = anyArrow && performance.now() < compassForce, show = anyArrow && (compassMode !== 'off' || forced) && mode === 'play' && !won && (dist > (t.final ? 2.5 : 0.6) || (guideOn && ga.vertDom && Math.abs(ga.dy) > 2)) && !bossFighting();
  { const key = (t.final ? '!' : '') + t.label, idle = player.onGround && Math.hypot(player.vx, player.vz) < 0.3;       // v0.75: bare pila til vanlig; teksten vises ved nytt mål, tips, og når du står stille
    if (key !== compKey) { compKey = key; compShowUntil = now + 6000; }
    if (!idle) compIdleSince = now; else if (!compIdleSince) compIdleSince = now;
    compEl.classList.toggle('mini', !(forced || now < compShowUntil || (idle && now - compIdleSince > 2500))); }
  compEl.style.display = show && DIF.compass && (compassMode === 'both' || compassMode === 'compass' || forced) ? 'flex' : 'none';
  goalArrow.visible = show && DIF.worldArrow && player.onGround && (compassMode === 'both' || compassMode === 'arrow' || forced); goalArrowG.visible = goalArrow.visible;
  topLayout();
  const bandNext = show && DIF.nextLine !== 'none' && (compassMode === 'both' || compassMode === 'compass' || forced);
  if (!bandNext) { compState.text = null; compState.hint = ''; compState.action = ''; }
  if (!show) { goalInfo = { show: false }; goalDir = { ring: false, arrow: false, chevron: true }; compArrow.style.visibility = ''; goalArrowG.visible = false; mv?.arrowFrame(null, 0, false); guideFrame(now, t, ga, false); return; }
  const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
  const ang = guideOn ? ga.ang : Math.atan2(dx * cy - dz * sy, -dx * sy - dz * cy);   // 0 = rett frem på skjermen (R64: opp når målet er over, ned når det er under), positiv = til høyre
  compArrow.style.transform = `rotate(${ang}rad)`;
  const dy = t.y - player.y;
  $('compLbl').textContent = t.final ? T('compass.goal') : T('compass.next', { name: t.label.toUpperCase() });
  const distTxt = guideOn ? fmtM(ga.meters) : `${(dist * 0.05).toFixed(1).replace('.', ',')} m`;
  const hintTxt = guideOn ? bandHint(guideAction(t, ga), ga, (k) => T(k, guideP())) : t.act ? `▲ ${t.act}` : Math.abs(dy) > 0.6 ? (dy > 0 ? '▲ opp' : '▼ ned') : '';
  compTxt.textContent = distTxt + (hintTxt ? ` · ${hintTxt}` : '');
  if (floodSt.drop) { $('compLbl').textContent = `💧 ${T('water.below')}`; }   // R65: pila viser vannvarselet når nedhoppet lander i vann
  if (bandNext) { compState.text = `${$('compLbl').textContent} · ${distTxt}`; compState.hint = hintTxt; compState.ang = ang; compState.action = guideOn ? (() => { const ac = guideAction(t, ga); return T(ac.key, { ...guideP(), ...ac.params }); })() : ''; }   // R56: knappehintet for seg, så det aldri kuttes
  if (bandNext && DIF.nextLine !== 'full') { compState.hint = ''; compState.ang = null; compState.action = ''; }   // R69: Medium: bare navn og avstand i NESTE-linja (ingen pil, ingen handlingstekst)
  { const gsc = mv?.toScreen(t.x, t.y, t.z) ?? null, inFrame = !edgeMark({ s: gsc, a: ga, w: innerWidth, h: innerHeight });      // R66: én retningsangivelse om gangen
    goalDir = markRankOn ? goalDirection({ inFrame, help: helpLevel, show: true }) : { ring: false, arrow: true, chevron: true };
    goalInfo = { show: true, inFrame, sx: gsc?.x, sy: gsc?.y, dist: ga.hdist + Math.abs(ga.dy), key: (t.final ? '!' : '') + t.label }; }
  const lowCam = innerWidth > innerHeight; guideFrame(now, t, ga, DIF.worldArrow); goalArrowG.scale.setScalar(lowCam ? 1.35 : 1);   // liggende: lavere kamera, så pila er større og hevet litt
  const placeArrow = (d) => goalArrowG.position.set(player.x + dx / dist * d, player.y + (lowCam ? 0.14 : 0.07) + 0.01 * Math.sin(now / 200), player.z + dz / dist * d);
  placeArrow(1.4); goalArrowG.rotation.y = Math.atan2(-dx, -dz);
  if (markRankOn && (!goalDir.arrow || (guideOn && guideV.state().edge))) goalArrow.visible = goalArrowG.visible = false;   // R66: pila i bildet vises bare når målet er utenfor bildet, og aldri sammen med kantmerket
  if (guideOn && ga.vertDom) { goalArrow.visible = goalArrowG.visible = false; mv?.arrowFrame(null, 0, false); }   // R64: målet er loddrett over/under: gulvpila ville pekt feil vei, kantmerket og båndet viser «ned»/«opp»
  else if (goalArrow.visible && mv?.arrowFrame(placeArrow, ang, true)) goalArrow.visible = goalArrowG.visible = false;   // R14: bak en knapp, bak figuren eller utenfor skjermen: kantstilt pil i stedet (ellers flyttes gulvpila lenger fram)
  else if (!goalArrow.visible) mv?.arrowFrame(null, 0, false);
  if (markRankOn) {                                                               // R66: chevron i båndet bare når pila ikke er i bildet (ellers ville det vært to piler)
    const arrowPic = goalArrow.visible || !!mv?.edgeOn() || (guideOn && guideV.state().edge), chev = goalDir.chevron || !arrowPic;
    compArrow.style.visibility = chev ? '' : 'hidden'; if (bandNext && !chev) compState.ang = null;
  } else compArrow.style.visibility = '';
}
// R66: velg hvilke markører som vises nå (mål, høyst 2 grep, ⓘ) etter hjelp-nivå. Kjøres én gang per bilde før tegning.
const routeIdSet = new Set((LEVEL.route || []).filter((w) => !w.via).map((w) => w.id));
const markStall = createStall();
function markerPlanFrame(now) {
  if (!markRankOn) { if (markPlan.on) markPlan = { on: false, allow: new Set(), order: [], primary: null }; return; }
  const play = mode === 'play' && !won && markersOn, budget = play ? diffBudget(difficulty, helpLevel, { normal: markBudN, much: markBudM }) : 0;   // R69: vanskelighetens tak (6/2/0), aldri over Hjelp-nivå
  if (menuOpen || !play) { if (markStall.t0 !== null) markStall.t0 = now; }
  else stepStall(markStall, now, { goalKey: goalInfo.key || '', routeIdx: routeCur, done: goalDone(LEVEL), dist: goalInfo.dist ?? 0 });
  const cands = [];
  if (budget > 0) {
    if (goalInfo.show) cands.push({ id: 'goal', tier: 'goal', dist: goalInfo.dist ?? 0, prio: 1, sx: goalInfo.inFrame ? goalInfo.sx : undefined, sy: goalInfo.inFrame ? goalInfo.sy : undefined });
    cands.push(...mv.gripCands(routeIdSet, LEVEL.route?.[Math.min(routeCur + 1, (LEVEL.route?.length || 1) - 1)]?.id, (id) => markUse[markUseKey(id)] || 0));
    if (labelsOn && DIF.infoMarks) labels.forEach((l, i) => { const sc = mv.toScreen(l.pos[0], l.pos[1], l.pos[2]); cands.push({ id: i, tier: 'info', dist: l.d ?? 99, read: infoSeen.has(l), sx: sc?.x, sy: sc?.y }); });
  }
  const sel = selectMarkers(cands, { merge: markMerge, infoNear: markInfoNear, wearN: markWear }, budget), order = sel.picked.map((c) => `${c.tier}:${c.id}`);
  markPlan = { on: true, allow: new Set(order), order, primary: order[0] || null, merge: markMerge, wearN: markWear, use: (id) => markUse[markUseKey(id)] || 0, stalledMs: markStall.t0 === null ? 0 : now - markStall.t0, stallMs: markStallS * 1000, much: helpLevel === 'much', calm: markCalm, budget, picked: sel.picked };
  const ng = sel.picked.filter((c) => c.tier === 'grip').length, ni = sel.picked.filter((c) => c.tier === 'info').length, hasGoal = sel.picked.some((c) => c.tier === 'goal');
  const key = `${helpLevel} ${hasGoal ? 'mål ' : ''}${ng} grep${ni ? ' ⓘ' : ''} av ${budget}`;
  if (key !== markLog && now - markLogAt > 5000) { markLog = key; markLogAt = now; logEv('markør', `rangert: ${key}`); }
}
compEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); camToGoal(); });
$('btnCenter').addEventListener('pointerdown', (e) => { e.stopPropagation(); camBehind(); });
const pointers = new Map();
let pinch0 = 0;
function activeCam() { return mode === 'plan' ? planCam : cam; }
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  if (document.pointerLockElement === canvas) return;
  if (!TOUCH && mouseLook && P.faceCam && mode === 'play' && e.pointerType === 'mouse' && canvas.requestPointerLock) { try { canvas.requestPointerLock(); } catch { /* ikke tillatt */ } }      // PC: klikk for å styre blikket med musa (Esc slipper); dra med musa virker også uten lås
  if (TOUCH && stickFloat && mode !== 'fly' && stickId === null && e.clientX < innerWidth * 0.5 && e.clientY > innerHeight * 0.2) {      // venstre halvdel: stikken dukker opp der tommelen treffer
    stickId = e.pointerId; setStickCenter(e.clientX, e.clientY); stick.classList.add('float'); stickMove(e); return;
  }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), tm: performance.now() }); metrics.swipes++;
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); }
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId === stickId) { stickMove(e); return; }            // fingeren styrer stikken (flytende), ikke kameraet
  const p = pointers.get(e.pointerId); if (!p) return;
  const ms = e.pointerType === 'mouse' ? mouseSens : 1, dx = (e.clientX - p.x) * ms, dy = (e.clientY - p.y) * ms; p.x = e.clientX; p.y = e.clientY; p.tm = performance.now();
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch0) zoom(pinch0 / d); pinch0 = d; return;
  }
  dragCam(dx, dy);
});
function dragCam(dx, dy) {                                           // felles for canvas, knapper og toppbånd (R59)
  const c = activeCam();
  camAnim = null; c.yaw -= yawDelta(dx, camSens); lastDrag = performance.now() / 1000; metrics.dragPx += Math.abs(dx) + Math.abs(dy); metrics.yawUser += Math.abs(yawDelta(dx, camSens));
  c.pitch += pitchDelta(dy, camSens, camInvY && mode !== 'plan');
  const lim = mode === 'plan' ? [-0.3, 1.5] : viewFirst ? [-1.25, 1.25] : viewMode === 'shoulder' ? [-0.85, 1.2] : [-0.85, 1.35];
  c.pitch = Math.min(lim[1], Math.max(lim[0], c.pitch));
}
// R59: dra som starter på HOPP/GREP, kantfeltet rundt TA/HOPP/GREP eller toppbåndet dreier også kameraet (før nådde de aldri bildet).
const relay = new Relay(camSlop);
const relayLog = new Set();
function relayStart(e, src, tap) { if (camRelayOn && mode !== 'fly' && e.pointerType !== 'mouse') relay.start(e.pointerId, e.clientX, e.clientY, performance.now(), src, tap); }
document.addEventListener('pointermove', (e) => {
  if (!relay.has(e.pointerId)) return; relay.slop = camSlop;
  const r = relay.move(e.pointerId, e.clientX, e.clientY); if (!r) return;
  if (r.first) { metrics.swipes++; metrics.relay = (metrics.relay || 0) + 1; if (!relayLog.has(r.src)) { relayLog.add(r.src); logEv('kamera', `dra fra ${r.src} dreier kameraet`); } }
  dragCam(r.dx, r.dy);
});
const relayEnd = (e) => { const r = relay.end(e.pointerId, performance.now()); if (r && r.tap && r.fn) r.fn(); };
document.addEventListener('pointerup', relayEnd); document.addEventListener('pointercancel', (e) => relay.end(e.pointerId, 1e12));
document.addEventListener('pointerdown', (e) => { if (e.target.closest?.('#topband, #hud')) relayStart(e, 'bånd'); }, true);
// robusthet: en peker som mistes uten pointerup (iPhone-bevegelser, overlegg) må ikke bli stående og gjøre neste dra om til klyping
const dropPtr = (e) => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch0 = 0; };
canvas.addEventListener('lostpointercapture', dropPtr);
for (const ev of ['touchend', 'touchcancel']) document.addEventListener(ev, (e) => { if (e.touches.length === 0) { pointers.clear(); pinch0 = 0; relay.clear(); } }, { passive: true });
let lastTap = { t: 0, x: 0, y: 0 };
const endPtr = (e) => {
  const p = pointers.get(e.pointerId);
  if (p && pointers.size === 1 && mode === 'play' && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 10 && performance.now() - p.t0 < 280) {      // kort trykk
    const now = performance.now();
    if (dblTapOn && now - lastTap.t < 330 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 45) { camBehind(); lastTap.t = 0; } else lastTap = { t: now, x: e.clientX, y: e.clientY };
  }
  pointers.delete(e.pointerId); pinch0 = 0;
};
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
function zoom(f) {
  if (mode === 'plan') planCam.dist = Math.min(120, Math.max(8, planCam.dist * f));
  else cam.dist = Math.min(16, Math.max(2.2, cam.dist * f));
}
canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoom(Math.exp(e.deltaY * 0.0012)); }, { passive: false });

// PC: musestyring som i PUBG (pekerlås): musa dreier blikket, venstre knapp = TA (hold = lad kast), høyre = GREP
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas || mode !== 'play') return;
  cam.yaw -= e.movementX * 0.0022 * camSens * mouseSens; lastDrag = performance.now() / 1000; camAnim = null;
  const lim = viewFirst ? [-1.25, 1.25] : viewMode === 'shoulder' ? [-0.85, 1.2] : [-0.85, 1.35];
  cam.pitch = Math.min(lim[1], Math.max(lim[0], cam.pitch + e.movementY * 0.0018 * camSens * mouseSens * (camInvY ? -1 : 1)));
});
canvas.addEventListener('mousedown', (e) => { if (document.pointerLockElement !== canvas) return; if (e.button === 0) { touch.carry = true; carryEdge = true; } if (e.button === 2) { touch.grab = true; grabEdge = true; } });
addEventListener('mouseup', (e) => { if (e.button === 0) touch.carry = false; if (e.button === 2) touch.grab = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
const stick = $('stick'), knob = $('knob');
let stickId = null, stickC = null;                                   // pekerid og midtpunkt (px) mens stikken er i bruk
function setStickCenter(x, y) { stickC = [x, y]; stick.style.left = `${x - 65}px`; stick.style.top = `${y - 65}px`; stick.style.bottom = 'auto'; stick.style.display = 'block'; }
function stickMove(e) {
  if (!stickC) { const r = stick.getBoundingClientRect(); stickC = [r.left + r.width / 2, r.top + r.height / 2]; }
  let dx = (e.clientX - stickC[0]) / 65, dy = (e.clientY - stickC[1]) / 65;
  const l = Math.hypot(dx, dy);
  if (l > 1) {                                                        // dras utenfor kanten: stikken følger etter, så tommelen aldri «går tom»
    setStickCenter(stickC[0] + (dx / l) * (l - 1) * 65, stickC[1] + (dy / l) * (l - 1) * 65); stick.classList.add('float');
    dx /= l; dy /= l;
  }
  touch.x = dx; touch.y = -dy; knob.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
  { const m = Math.min(1, Math.hypot(dx, dy)), out = m < stickDead ? 0 : Math.pow((m - stickDead) / (1 - stickDead), stickCurve);       // fargen på stikken viser sonen: forsiktig (stopper ved kanter) eller løp (hopper over gap)
    stick.classList.toggle('run', out >= P.autoJumpMin && (P.autoJump || P.edgeGuard)); stick.classList.toggle('soft', out > 0 && out < P.guardMax && P.edgeGuard); }
}
stick.addEventListener('pointerdown', (e) => { stickId = e.pointerId; stick.setPointerCapture(e.pointerId); stickC = null; stickMove(e); });
stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) stickMove(e); });
const stickEnd = (e) => {
  if (e.pointerId !== stickId) return; stickId = null; stickC = null; touch.x = touch.y = 0; knob.style.transform = ''; stick.classList.remove('run', 'soft');
  if (stick.classList.contains('float')) { stick.classList.remove('float'); stick.style.left = stick.style.top = stick.style.bottom = ''; stick.style.display = ''; }   // tilbake til hvilestilling (flyttet eller flytende)
};
stick.addEventListener('pointerup', stickEnd); stick.addEventListener('pointercancel', stickEnd);
canvas.addEventListener('pointerup', (e) => { if (e.pointerId === stickId) stickEnd(e); }); canvas.addEventListener('pointercancel', (e) => { if (e.pointerId === stickId) stickEnd(e); });
const tapKey = (key, edge) => () => { touch[key] = true; edge(); setTimeout(() => { touch[key] = false; }, 90); };   // R59: kort trykk på kantfeltet gir fortsatt et knappetrykk
function bindBtn(id, key, edge, relayCore = true) {
  const el = $(id);
  el.addEventListener('pointerdown', (e) => {
    if (camRelayOn && TOUCH && e.pointerType !== 'mouse' && !inCore(e.clientX, e.clientY, el.getBoundingClientRect())) { relayStart(e, 'kant', tapKey(key, edge)); return; }   // utenfor sirkelen: bildet, ikke knappen
    if (relayCore) relayStart(e, 'knapp'); el.setPointerCapture(e.pointerId); touch[key] = true; edge();
  });
  const up = () => { touch[key] = false; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}
bindBtn('btnJump', 'jump', () => { jumpEdge = true; });
bindBtn('btnGrab', 'grab', () => { grabEdge = true; });
bindBtn('btnCarry', 'carry', () => { carryEdge = true; }, false);   // TA: dra i sirkelen er kast-sikte, ikke kamera
// kast med dra og slipp: hold TA, dra fingeren bakover (som en slynge), slipp. Retning og kraft følger draget; uten drag er det som før (hold lenge = langt kast).
const aimPt = { id: null, x0: 0, y0: 0, x: 0, y: 0 };
{
  const el = $('btnCarry');
  el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && camRelayOn && TOUCH && !inCore(e.clientX, e.clientY, el.getBoundingClientRect())) return; aimPt.id = e.pointerId; aimPt.x0 = aimPt.x = e.clientX; aimPt.y0 = aimPt.y = e.clientY; });
  el.addEventListener('pointermove', (e) => { if (e.pointerId === aimPt.id) { aimPt.x = e.clientX; aimPt.y = e.clientY; } });
  const end = (e) => { if (e.pointerId === aimPt.id) aimPt.id = null; };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
// skulderkamera: etter at TA er holdt inne en stund kastes dit hårkorset peker (midt på skjermen); kraften vokser med holdetiden
let shHold = 0;
function shoulderAim(dt, fx, fz, held) {
  shHold = held && player.carry ? shHold + dt : 0;
  if (viewMode !== 'shoulder' || shHold < P.throwMin) return undefined;
  return { dx: fx, dz: fz, k: Math.min(1, (shHold - P.throwMin) / P.throwFull) };
}
function aimInput(fx, fz, rx, rz) {
  if (!aimThrowOn || aimPt.id === null || !touch.carry || !player.carry) return undefined;
  const dx = aimPt.x - aimPt.x0, dy = aimPt.y - aimPt.y0, len = Math.hypot(dx, dy);
  if (len < 22) return undefined;
  const ux = dx / len, uy = dy / len;                               // trekk ned = kast fremover, trekk til venstre = kast til høyre
  let wx = fx * uy + rx * -ux, wz = fz * uy + rz * -ux; const wl = Math.hypot(wx, wz) || 1;
  return { dx: wx / wl, dz: wz / wl, k: Math.min(1, (len - 22) / 110) };
}
// knapper som koster poeng må trykkes to ganger (første trykk «armerer» i 2,5 s), så de ikke utløses ved et uhell
function confirmed(btn, label, cost, fn) {
  let t = null; const orig = btn.textContent;
  btn.onclick = () => {
    if (!confirm2On) { fn(); return; }
    if (t) { clearTimeout(t); t = null; btn.classList.remove('armed'); btn.textContent = orig; fn(); return; }
    btn.classList.add('armed'); btn.textContent = cost ? `Sikker? −${cost}` : 'Trykk igjen';
    t = setTimeout(() => { t = null; btn.classList.remove('armed'); btn.textContent = orig; }, 2500);
  };
}
confirmed($('bThings'), 'Ting', SCORE.resetThings, () => { resetThings(); closeMore(); });
$('bLevel').textContent = `Brett: ${levelLabel}`;
$('bLevel').onclick = () => { const i = LEVELS.findIndex((l) => l.id === levelId), n = LEVELS[(i + 1) % LEVELS.length].id; store.set('tlm.level', n); location.search = `?level=${n}`; };
$('bSound').onclick = toggleSound; $('bSound').textContent = soundMuted ? 'Lyd av' : 'Lyd'; $('bSound').classList.toggle('on', !soundMuted);
confirmed($('bSave'), 'Lagre', SCORE.save, () => { doSave(); closeMore(); }); confirmed($('bBack'), 'Tilbake', SCORE.respawn, goBack);
// ⋯-menyen (v0.75): Lagre, Ting ↺ (og på PC Brett, Plan, Fly, Lyd) ligger skjult, så bunnlinjen bare er Tilbake · ⋯ · ⚙
function closeMore() { $('more').classList.add('hide'); $('bMore').classList.remove('open'); }
$('bMore').onclick = (e) => { e.stopPropagation(); const open = $('more').classList.contains('hide'); $('more').classList.toggle('hide', !open); $('bMore').classList.toggle('open', open); };
document.addEventListener('pointerdown', (e) => { if (!$('more').classList.contains('hide') && !$('more').contains(e.target) && e.target !== $('bMore')) closeMore(); });
for (const id of ['bLevel', 'bPlan', 'bFly', 'bSound']) $(id).addEventListener('click', closeMore);
$('hud').addEventListener('pointerdown', (e) => { e.stopPropagation(); hudOpen = !hudOpen; logEv('hud', hudOpen ? 'utvidet' : 'kort'); });
$('bPlan').onclick = () => setMode('plan'); $('bFly').onclick = () => setMode('fly');
$('again').onclick = playAgain;   // R69: «Spill igjen» spør om vanskelighet først
$('winMenu').onclick = () => quitToMenu('målskjerm'); $('winMenu').textContent = ft(lang, 'fr.backMenu');
$('bMenu').onclick = () => { closeMore(); quitToMenu('⋯'); }; $('bMenu').textContent = dft(lang, 'df.menu');

// ---------- innstillingspanel (hoppfølelse) ----------
const TUNE = [
  ['gravity', 'Tyngdekraft', -45, -14, 1], ['jump', 'Hoppkraft', 8, 16, 0.1], ['airJumps', 'Dobbelthopp (0 = av)', 0, 1, 1],
  ['airAccel', 'Styring i lufta', 2, 40, 1], ['speed', 'Løpefart', 3, 10, 0.1],
  ['accel', 'Akselerasjon', 4, 60, 1], ['decel', 'Bremsing', 4, 60, 1], ['turnDecel', 'Retningsskifte (lavt = tregt)', 4, 60, 1],
  ['jumpWindup', 'Hopp: forberedelse (s)', 0, 0.3, 0.01], ['mantleTime', 'Hiv deg opp: tid (s)', 0, 1.5, 0.05], ['landK', 'Landing: hurk per fallfart', 0, 0.05, 0.002],
  ['jumpBoost', 'Løpehopp: fartsfaktor', 1, 2, 0.05], ['turnRate', 'Snu-hastighet (rad/s)', 2, 16, 0.5],
  ['reachTime', 'Grep: varighet (s)', 0.1, 1, 0.05], ['reachCooldown', 'Grep: pause (s)', 0, 1.5, 0.05],
  ['reachAbove', 'Grep: ekstra rekkevidde opp', 0, 1.5, 0.05], ['ropeReach', 'Tau-rekkevidde', 0.8, 3.5, 0.1],
];
const P0_SNAPSHOT = { ...P };
let smallStepH = store.get('tlm.smallstep', MOVE.stepOverMax);   // R40
let presetName = store.get('tlm.preset4', DEFAULT_PRESET);
if (!PRESETS[presetName]) presetName = 'prince';
applyPreset(presetName);
Object.assign(P, store.get('tlm.custom4', {}));
// hjelp-nivå og fart/treghet legges oppå forhåndsinnstillingen
function reapplyKnobs() {
  const base = PRESETS[presetName] || {}, b = (k) => base[k] ?? P0_SNAPSHOT[k];
  const lv = { none: { coyote: 0.1, jumpBuffer: 0.08, reachSnap: 0.3, stepUp: 0, autoGrab: false }, normal: { coyote: 0.14, jumpBuffer: 0.12, reachSnap: 0.45, stepUp: b('stepUp'), autoGrab: base.autoGrab ?? false }, much: { coyote: 0.22, jumpBuffer: 0.2, reachSnap: 0.7, stepUp: Math.max(0.6, b('stepUp')), autoGrab: true } }[helpLevel] || {};
  Object.assign(P, lv);
  P.stepUp = effectiveStepUp(lv.stepUp, smallStepH, helpLevel !== 'none');   // R40: små hindre (≤ smallStepH) tråkkes alltid over
  P.edgeGuard = edgeGuardOn && helpLevel !== 'none'; P.autoJump = autoJumpOn && helpLevel !== 'none';       // kanthjelp: stopp ved kanten (forsiktig) og hopp selv over gap (løp)
  P.shimmy = shimmyOn; P.rollOn = rollOn && helpLevel !== 'none'; P.carefulOn = carefulOn && helpLevel !== 'none'; P.ropeHeavy = ropeHeavyOn;   // R39: finpuss
  P.airSteady = airSteadyOn && helpLevel !== 'none'; P.magnet = magnetOn && helpLevel !== 'none'; P.holdGrab = holdGrabOn && helpLevel !== 'none';   // stabilisering i lufta: demping, sikte-hjelp, hold GREP
  P.accel = b('accel') * inertia; P.decel = b('decel') * inertia; P.turnDecel = b('turnDecel') * inertia; P.speed = b('speed') * speedScale;
}
reapplyKnobs();
// ---------- lydmikser ----------
function mixerHtml() {
  const groups = {};
  for (const sd of SOUND_LIST) (groups[sd.group] ||= []).push(sd);
  return Object.entries(groups).map(([g, items]) => `<div class="mixg">${g}</div>` + items.map((sd) =>
    `<div class="mixrow"><div class="mixh"><span>${sd.label}</span><span><b data-val="${sd.id}"></b> <button class="pl" data-play="${sd.id}">▶</button></span></div><input type="range" data-mix="${sd.id}" min="0" max="2" step="0.05"></div>`).join('')).join('');
}
const mixText = (v) => (v <= 0 ? 'av' : `${Math.round(v * 100)} %`);
function wireMixer() {
  const mix = store.get('tlm.mix2', {});
  const setOne = (id, v, save = true) => {
    const el = document.querySelector(`[data-mix="${id}"]`), lab = document.querySelector(`[data-val="${id}"]`);
    if (el) el.value = v; if (lab) lab.textContent = mixText(v);
    if (save) { mix[id] = v; store.set('tlm.mix2', mix); }
    audio?.setLevel(id, v);
  };
  for (const sd of SOUND_LIST) {
    const v = mix[sd.id] ?? 1, el = document.querySelector(`[data-mix="${sd.id}"]`);
    el.value = v; document.querySelector(`[data-val="${sd.id}"]`).textContent = mixText(v);
    el.oninput = () => setOne(sd.id, +el.value);
  }
  document.querySelectorAll('[data-play]').forEach((btn) => {
    btn.onclick = () => { unlockAudio(); Promise.resolve(audio?.resume()).then(() => audio?.preview(btn.dataset.play)); };
  });
  $('mixAll100').onclick = () => SOUND_LIST.forEach((sd) => setOne(sd.id, 1));
  $('mixAllOff').onclick = () => SOUND_LIST.forEach((sd) => setOne(sd.id, 0));
  $('mixReset').onclick = () => { SOUND_LIST.forEach((sd) => setOne(sd.id, 1)); store.set('tlm.mix2', {}); store.set('tlm.reverb', null); $('s_rev').value = LEVEL.audio?.reverb ?? 0.12; $('v_rev').textContent = (+$('s_rev').value).toFixed(2); audio?.setReverb(LEVEL.audio?.reverb ?? 0.12); toast('Lyd nullstilt'); };
  const rev0 = store.get('tlm.reverb', null) ?? LEVEL.audio?.reverb ?? 0.12;
  $('s_rev').value = rev0; $('v_rev').textContent = (+rev0).toFixed(2);
  $('s_rev').oninput = (e) => { const v = +e.target.value; store.set('tlm.reverb', v); audio?.setReverb(v); $('v_rev').textContent = v.toFixed(2); };
}

// hjelpeobjekter (trappetrinn o.l. som brettlageren la inn for at ruten skal gå) kan merkes med gule kanter, så et menneske kan se over dem
const helperBoxes = LEVEL.boxes.filter((b) => b.helper), helperCount = helperBoxes.length;
const helperMarks = new THREE.Group(); helperMarks.visible = false; scene.add(helperMarks);
for (const b of helperBoxes) {
  const g = new THREE.BoxGeometry(b.max[0] - b.min[0] + 0.06, b.max[1] - b.min[1] + 0.06, b.max[2] - b.min[2] + 0.06);
  const l = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: 0xffd23f }));
  l.position.set((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2); helperMarks.add(l);
}

// ---------- innstillinger: ÉN liste (SETTINGS) styrer panelet, «endret fra standard», eksport/import, nullstilling og testrapporten ----------
// Regler: nye valg legges inn her så lenge det er mulig. `admin: true` = bare synlig for admin (tåler å gjøre feil, eller er for finjustering).
const P0 = { ...P0_SNAPSHOT };
const defOf = (k) => PRESETS[presetName]?.[k] ?? P0[k];
let adminOn = store.get('tlm.admin', false);
{ const a = new URLSearchParams(location.search).get('admin'); if (a === '1') { adminOn = true; store.set('tlm.admin', true); } if (a === '0') { adminOn = false; store.set('tlm.admin', false); } }
const fl = (id, group, label, def, get, set, o = {}) => ({ id, group, type: 'bool', label, def, get, set, ...o });
const rg = (id, group, label, def, min, max, step, get, set, o = {}) => ({ id, group, type: 'range', label, def, min, max, step, get, set, ...o });
const sl = (id, group, label, def, options, get, set, o = {}) => ({ id, group, type: 'select', label, def, options, get, set, ...o });
const kp = (key, fn) => (v) => { fn(v); store.set(key, v); };
// GROUPS og rekkefølgen i panelet (LAYOUT) ligger i settings_util.js

const ADMIN_TUNE = [
  ['stamina', 'Krefter: sekunder', 3, 20, 0.5], ['staminaRegen', 'Krefter: påfyll på bakken (s/s)', 0.5, 8, 0.1], ['exhaustT', 'Utmattet: skli-tid (s)', 0, 1.5, 0.05],
  ['climbUp', 'Klatring: fart opp', 0.5, 4, 0.1], ['climbDown', 'Klatring: fart ned', 0.5, 5, 0.1], ['climbSide', 'Klatring: fart sidelengs', 0.3, 3, 0.1],
  ['coyote', 'Tilgivelse: tid etter kanten (s)', 0, 0.3, 0.01], ['jumpBuffer', 'Tilgivelse: hoppbuffer (s)', 0, 0.3, 0.01], ['reachSnap', 'Grep: snap-avstand', 0, 1, 0.05],
  ['throwMin', 'Kast: minste holdetid (s)', 0.1, 0.8, 0.02], ['throwFull', 'Kast: tid til full kraft (s)', 0.3, 2, 0.05],
  ['hardLand', 'Hard landing fra (fart)', 8, 30, 1], ['knockV', 'Tilbake til lagring fra (fart)', 14, 40, 1], ['softFactor', 'Myk flate: andel av fallfart', 0.1, 1, 0.05],
  ['gelDry', 'Hårgelé: tørketid (s)', 5, 60, 1], ['stripTear', 'Dopapirbånd: holder (s)', 2, 30, 1],
  ['zipMax', 'Taubane: lengste tråd', 8, 40, 1], ['zipMinDrop', 'Taubane: minste fall', 0.5, 4, 0.1], ['zipVmax', 'Taubane: toppfart', 3, 16, 0.5], ['zipAcc', 'Taubane: akselerasjon', 1, 12, 0.5],
];
const PSET = (k) => (v) => { P[k] = v; saveCustom(); };
function setViewMode(v) { viewMode = v; viewFirst = v === 'first'; store.set('tlm.view3', v); cam.pitch = v === 'shoulder' ? pitchBase - 0.08 : v === 'first' ? 0.05 : pitchBase; if (v === 'third') cam.cur = camDistSet; }
let verCheckOn = store.get('tlm.vercheck', true), verCheckMin = store.get('tlm.vercheckmin', 5), verView = null;   // R77
const SETTINGS = [
  // Spill
  fl('pcbtns', 'styring', 'Vis skjermknapper på PC (TA, HOPP, GREP)', true, () => pcButtons, kp('tlm.pcbtns', (v) => { pcButtons = v; applyPlatformUi(); })),
  sl('lang', 'spill', 'Språk / Language', 'nb', LANGS, () => lang, kp('tlm.lang', (v) => { lang = v; applyLang(); })),
  fl('autosave', 'spill', 'Autolagring: fortsett der du var', true, () => autosaveOn, kp('tlm.autosave', (v) => { autosaveOn = v; if (!v) store.set(progKey, null); })),
  fl('versionCheck', 'spill', 'Sjekk om det finnes en nyere versjon (kort øverst: «NY VERSJON · TRYKK FOR Å OPPDATERE»; fremgangen beholdes)', true, () => verCheckOn, kp('tlm.vercheck', (v) => { verCheckOn = v; logEv('versjon', v ? 'sjekk på' : 'sjekk av'); verView?.render(); })),
  rg('versionCheckInterval', 'admin', 'Versjonsjekk: hvor ofte spillet sjekker (minutter)', 5, 1, 60, 1, () => verCheckMin, kp('tlm.vercheckmin', (v) => { verCheckMin = v; }), { digits: 0 }),
  fl('startscreen', 'spill', 'Vis startskjerm (Nytt spill / Fortsett) når spillet åpnes', true, () => startScreenOn, kp('tlm.startscreen', (v) => { startScreenOn = v; })),
  fl('puzzles', 'spill', 'Gåter (nøkkel og lås: en snarvei du åpner)', true, () => puzzlesOn, kp('tlm.puzzles', (v) => { puzzlesOn = v; })),
  fl('gates', 'spill', 'Gåteverktøy (trykkplater, porter, vindebroer og brytere: bær ting til plata, slå bryteren med TA)', true, () => gatesOn, kp('tlm.gates', (v) => { gatesOn = v; logEv('gåte', v ? 'på' : 'av'); })),
  fl('gatecam', 'hjelp', 'Gåteverktøy: kort kamerasveip mot døra eller broen når den åpnes', true, () => gateCamOn, kp('tlm.gatecam', (v) => { gateCamOn = v; })),
  rg('gatehero', 'admin', 'Gåteverktøy: figurens vekt på plater (1 = for lett til de fleste plater, 3 = klarer plater alene)', 1, 0.5, 6, 0.5, () => GATE.hero, kp('tlm.gatehero', (v) => { GATE.hero = v; }), { digits: 1 }),
  rg('gateneed', 'admin', 'Gåteverktøy: terskel på alle plater (gange, 1 = som i brettet)', 1, 0.25, 3, 0.25, () => GATE.needScale, kp('tlm.gateneed', (v) => { GATE.needScale = v; }), { digits: 2 }),
  rg('gatedur', 'admin', 'Gåteverktøy: hvor lenge dører og broer bruker på å åpne (sekunder)', 1.4, 0.4, 5, 0.2, () => GATE.dur, kp('tlm.gatedur', (v) => { GATE.dur = v; }), { digits: 1 }),
  fl('slickhint', 'hjelp', 'Glatte flater: hint første gang du sklir på olje eller såpe (rød ✕ og glansstriper viser dem alltid)', true, () => slickHintOn, kp('tlm.slickhint', (v) => { slickHintOn = v; logEv('glatt', v ? 'hint på' : 'hint av'); })),
  rg('slickaccel', 'admin', 'Glatte flater: hvor raskt du skifter fart på olje og såpe (5 = sklir mye, 34 = som vanlig gulv)', 5, 2, 34, 1, () => P.slickAccel, kp('tlm.slickaccel', (v) => { P.slickAccel = v; logEv('glatt', `grep ${v}`); }), { digits: 0 }),
  fl('puzcam', 'hjelp', 'Gåter: kort kamerasveip mot broen når den åpnes', true, () => puzCamOn, kp('tlm.puzcam', (v) => { puzCamOn = v; })),
  fl('firstrun', 'spill', 'Første møte (nivå 1): én START på menyen, rolige knappe-hint ett og ett (stikke, HOPP, TA, GREP), «Bra!» ved delmål og hjelp hvis du står fast i 10 s. Av gir den gamle menyen og ingen slike hint', true, () => firstRunOn, kp('tlm.firstrun', (v) => { firstRunOn = v; if (!v) frV.hideHint(); logEv('forstekjoring', v ? 'på' : 'av'); })),
  rg('frhelpms', 'admin', 'Første møte: sekunder stille før hjelp (R64-veiledning) kommer', 10, 4, 12, 1, () => Math.round(FR.helpMs / 1000), kp('tlm.frhelpms', (v) => { FR.helpMs = v * 1000; }), { digits: 0 }),
  fl('goals', 'spill', 'Delmål (milepæler: panel øverst, jubel når et delmål er klart)', true, () => goalsOn, kp('tlm.goals', (v) => { goalsOn = v; goalView?.setOn(v && DIF.subgoalText); logEv('delmål', v ? 'på' : 'av'); })),
  fl('keyhelp', 'hjelp', 'PC: vis tastehjelp-kortet de første 15 sekundene ved start (H henter det fram når som helst)', false, () => keyHelpOn, kp('tlm.keyhelp', (v) => { keyHelpOn = v; logEv('hjelp', v ? 'tastehjelp ved start på' : 'tastehjelp ved start av'); })),
  fl('stuehint', 'hjelp', 'Stuen: hint om fjernkontrollen, den gule plata og broen mellom sofaen og bordet (nivå 8)', true, () => stueHintOn, kp('tlm.stuehint', (v) => { stueHintOn = v; logEv('stue', v ? 'hint på' : 'hint av'); })),
  fl('shortcuthint', 'hjelp', 'Verktøy-genveier: varsel når du klatrer en trapp med hårgelé (nivå 4–6)', true, () => shortcutHintOn, kp('tlm.shortcuthint', (v) => { shortcutHintOn = v; logEv('genvei', v ? 'varsel på' : 'varsel av'); })),
  sl('questline', 'spill', 'Oppdragslinje: «ikon + neste mål» under toppbåndet (Etter vanskelighet: på for Nybegynner og Medium, av for Ekspert; trykk ⋯ eller mål-ikonet for å hente den fram)', 'auto', [['auto', 'Etter vanskelighet'], ['on', 'På'], ['off', 'Av']], () => questMode, kp('tlm.questline', (v) => { questMode = normQuestMode(v); logEv('maalvei', `oppdragslinje: ${questMode}`); })),
  fl('waypeek', 'spill', 'Peiling uten piler (Ekspert): et mål-ikon glir kort inn ved kanten i riktig retning når du har stått stille eller gått feil vei en stund, og målet gløder når det kommer i syne', true, () => wayPeekOn, kp('tlm.waypeek', (v) => { wayPeekOn = v; logEv('maalvei', v ? 'peiling på' : 'peiling av'); })),
  rg('waypeekms', 'admin', 'Peiling: sekunder uten framdrift før ikonet vises', 8, 3, 30, 1, () => Math.round(WAY.idleMs / 1000), kp('tlm.waypeekms', (v) => { WAY.idleMs = v * 1000; }), { digits: 0 }),
  fl('guide', 'hjelp', 'Veiledning når målet er skjult: handling i teksten, pil ned/opp, kantmerke, ring gjennom hindre, «Vis meg» og glød på neste flate', true, () => guideOn, kp('tlm.guide', (v) => { guideOn = v; if (!v) guideHide(); logEv('veiledning', v ? 'på' : 'av'); })),
  fl('floodwarn', 'hjelp', 'Stigende vann: pila og delmål hopper over mål under vann, varsel «Vann under deg», vannstand i båndet og rødt varsel før du drukner', true, () => floodWarnOn, kp('tlm.floodwarn', (v) => { floodWarnOn = v; if (!v) { floodSt.drop = null; floodSt.shake = 0; floodV.vignette(0); } logEv('vann', v ? 'varsel på' : 'varsel av'); })),
  rg('floodshake', 'admin', 'Stigende vann: kameraskjelv før du drukner (0 = av)', 1, 0, 2, 0.1, () => floodShakeK, kp('tlm.floodshake', (v) => { floodShakeK = v; }), { digits: 1 }),
  rg('guidestall', 'admin', 'Veiledning: sekunder uten framdrift før neste flate utheves', 45, 15, 120, 1, () => Math.round(GUIDE.stallMs / 1000), kp('tlm.guidestall', (v) => { GUIDE.stallMs = v * 1000; }), { digits: 0 }),
  fl('goalarrow', 'hjelp', 'Pila og kompasset peker mot aktivt delmål', true, () => goalArrowOn, kp('tlm.goalarrow', (v) => { goalArrowOn = v; logEv('delmål', v ? 'pil følger delmål' : 'pil følger ruta'); })),
  fl('stats', 'test', 'Anonym statistikk (R88): sender hvor langt spillere kommer (tilfeldig id, ingen navn eller posisjon). Se PERSONVERN (standard av)', false, () => statsOn, kp(STATS.onKey, (v) => { statsOn = v; if (!v) sts.clear(); syncStatsBtn(); logEv('statistikk', v ? 'på' : 'av'); })),
  fl('privnote', 'admin', 'Personvern (R87): vis linja «Sendes til utvikleren. Ikke skriv navn …» med lenke til PERSONVERN til du har sendt første gang', true, () => privNoteOn, kp('tlm.privnotes', (v) => { privNoteOn = v; syncPrivNotes(); logEv('personvern', v ? 'sendelinje på' : 'sendelinje av'); })),
  fl('goallock', 'admin', 'Delmål som låser målet (målet åpner først når de er klare)', true, () => goalLockOn, kp('tlm.goallock', (v) => { goalLockOn = v; logEv('delmål', v ? 'lås på' : 'lås av'); })),
  fl('rewards', 'spill', 'Tilbehør på figuren (hatter, skjerf, sekk du har samlet)', true, () => rewardsOn, kp('tlm.rewards', (v) => { rewardsOn = v; refreshAccessories(); logEv('belønning', v ? 'tilbehør på' : 'tilbehør av'); })),
  fl('rewardsall', 'admin', 'Alt tilbehør åpent (test av lekerommet)', false, () => rewardsAll, kp('tlm.rewardsall', (v) => { rewardsAll = v; refreshAccessories(); })),
  fl('introsweep', 'hjelp', 'Nivåstart: kort kamerasveip fra målet tilbake til figuren (trykk for å hoppe over)', true, () => introSweepOn, kp('tlm.introsweep', (v) => { introSweepOn = v; })),
  fl('intromark', 'hjelp', 'Nivåstart: pil over første delmål (neste hylle, kasse eller kurv)', true, () => introMarkOn, kp('tlm.intromark', (v) => { introMarkOn = v; if (!v) introV.markerOn(false); })),
  fl('tband', 'hjelp', 'Dynamisk toppbånd: ett bånd øverst samler versjon, delmål, NESTE, hint, ℹ og ⚑ (trykk på det for mer). Av gir tilbake de løse boblene', true, () => tbandOn, kp('tlm.tband', (v) => { tbandOn = v; tb.setOn(v); logEv('bånd', v ? 'på' : 'av'); })),
  sl('tbsize', 'hjelp', 'Toppbånd: størrelse', 'compact', [['compact', 'Kompakt'], ['normal', 'Normal']], () => tbSize, kp('tlm.tbsize', (v) => { tbSize = v; tb.setSize(v); })),
  fl('introhint', 'hjelp', 'Nivåstart: hint-boble som nevner riktig knapp', true, () => introHintOn, kp('tlm.introhint', (v) => { introHintOn = v; if (!v) introV.hideHint(); })),
  fl('story', 'spill', 'Fortelling i starten av hvert nivå', true, () => storyOn, kp('tlm.story', (v) => { storyOn = v; })),
  fl('buildsnap', 'spill', 'Byggeskjerm: delene snapper til rutenett og festepunkter', true, () => buildSnap, kp('tlm.buildsnap', (v) => { buildSnap = v; })),
  fl('builddbl', 'spill', 'Byggeskjerm: dobbelttrykk zoomer inn (og tilbake til hele byggeplassen)', true, () => buildDbl, kp('tlm.builddbl', (v) => { buildDbl = v; })),
  fl('buildfine', 'spill', 'Byggeskjerm: rutenettet blir finere jo mer du zoomer inn (0,5 → 0,25 → 0,125)', true, () => buildFine, kp('tlm.buildfine', (v) => { buildFine = v; })),
  fl('buildsee', 'hjelp', 'Byggeskjerm: hint om vippa når du legger den ut (den har dreiepunkt på midten: legg den over gapet og rotér den skrått)', true, () => buildSeeHint, kp('tlm.buildsee', (v) => { buildSeeHint = v; })),
  fl('buildstress', 'spill', 'Byggeskjerm: farge på delene i PRØV viser belastning (blå = slapp, gul = belastet, rød = nær brudd)', true, () => buildStress, kp('tlm.buildstress', (v) => { buildStress = v; })),
  fl('buildcap', 'spill', 'Byggeskjerm: «Tåler ca. N klosser»-måler (hvor mange klosser bygget tåler midt på spennet, regnes ut når du slipper en del)', true, () => buildCap, kp('tlm.buildcap', (v) => { buildCap = v; })),
  fl('buildgrid', 'spill', 'Byggeskjerm: rutenett-bygging (R72): på steder som tillater det kan du velge «Rutenett» og trekke staver av tre, stål eller tau mellom knutepunkter på rutenettet. Av = bare klassisk bygging', true, () => buildGrid, kp('tlm.buildgrid', (v) => { buildGrid = v; })),
  fl('buildux', 'spill', 'Byggeskjerm (R92/R96): nyeste byggeskjerm, standard på; forenklet skjerm for rutenett-bygging i Hyllebroen, Kjøkkenbroen og Bygglab-stedene «bro» og «fagverk» (topplinje, tre store materialvalg, angre og én PRØV-knapp; dra fra en knute for å trekke en stav), og samme skall for klassiske steder (Trapp, Vippe, Lekerom, Stue, Verksted): delebrett, festeverktøy TAPE/LEDD/TAU/GUMMI som store ikoner og spøkelseslinje ved festing. Resten ligger i ⋯. Av = gamle byggeskjermen. Gjelder når du åpner byggeskjermen på nytt', true, () => buildUx, kp('tlm.buildux', (v) => { buildUx = v; logEv('byggux', v ? 'valg på (forenklet byggeskjerm)' : 'valg av (dagens byggeskjerm)'); })),
  fl('buildpause3d', 'admin', 'Pause 3D-verdenen mens byggeskjermen er åpen (R109): byggeskjermen dekker hele skjermen, så 3D-verdenen tegnes ikke bak den (jevnere og raskere bygging). Slå av bare for å feilsøke', true, () => buildPause3d, kp('tlm.buildpause3d', (v) => { buildPause3d = v; logEv('bygg', v ? '3D-pause på' : '3D-pause av'); })),
  fl('buildloupe', 'spill', 'Forstørrelsesglass i byggeskjermen (R106): mens en finger drar en stav ut fra en knute, flytter en knute eller en del, eller holder på et tomt punkt, vises et rundt glass i et hjørne (motsatt side av fingeren) med et forstørret utsnitt rundt fingeren, kryss, og grønn (rød hvis ulovlig) ring der staven eller delen lander. Gjelder alle byggesteder. Skjules rett etter at du slipper og aldri under PRØV', true, () => buildLoupe, kp('tlm.buildloupe', (v) => { buildLoupe = v; logEv('bygg', v ? 'glass på' : 'glass av'); })),
  fl('buildmirror', 'spill', 'Speiling og kopi i byggeren (R121): i Rutenett (broene og Byggeskolen) speiler ⋯ → SPEIL BYGGET alle staver om midten mellom ankrene (SPEIL OG LEGG TIL eller SNU), og KOPIER ved valgt knute eller stav setter inn et felt (opptil 12 staver) som spøkelse du drar og setter med et trykk. Samme sjekker som vanlige staver, ANGRE tar alt i ett steg. Av = knappene vises ikke', true, () => buildMirror, kp('tlm.buildmirror', (v) => { buildMirror = v; logEv('bygg', v ? 'speil/kopi på' : 'speil/kopi av'); })),
  fl('buildfromto', 'spill', 'Vis fra og til ved byggestedet (R118): nær et byggested står grønn FRA og gul TIL i rommet med en stiplet bue mellom, BYGG-knappen sier hvilket sted det gjelder med gap og høydeforskjell, FRA og TIL står også i byggeskjermen, og første gang per sted kommer en kort veiledning (ikke på Ekspert). Skjules på Ekspert uten hjelp. Minikartet viser stedet som et spenn', true, () => buildSpan, kp('tlm.buildfromto', (v) => { buildSpan = v; logEv('bygg', v ? 'fra/til på' : 'fra/til av'); })),
  fl('partsfromstart', 'spill', 'Delene er der fra start (R120): i byggebrettene ligger alle delene stedet trenger i delebrettet første gang du åpner det, uten at du må samle dem i rommet. Delene i rommet er en bonus: hver du finner gir +1 på budsjettet i byggeoppdraget (opptil +3) og teller i delmålet «Finn tre rare deler». Av = som før (du må finne delene selv)', true, () => partsStart, kp('tlm.partsfromstart', (v) => { partsStart = v; logEv('bygg', v ? 'deler fra start på' : 'deler fra start av'); })),
  fl('buildnext', 'spill', 'Neste sted i byggeren (R107): etter en prøve vises et resultatkort med «Bestått ★★☆», en stor knapp NESTE STED ▶ med navn og nummer (eller TILBAKE TIL SPILLET) og en mindre PRØV IGJEN, og topplinjen har en ▶-knapp til neste sted (🔒 når det er låst). Gjelder broene, Byggeskolen og de klassiske stedene', true, () => buildNext, kp('tlm.buildnext', (v) => { buildNext = v; logEv('bygg', v ? 'resultatkort på' : 'resultatkort av'); })),
  fl('builduxland', 'spill', 'Byggeskjerm i liggende format (R93): med forenklet byggeskjerm på og telefonen snudd får du sidepaneler og full høyde; forklaring av ikonene første gang og forslag til neste trekant (Nybegynner). Av = bare R92-oppsettet og ingen forklaringer', true, () => buildUxLand, kp('tlm.buildux.land', (v) => { buildUxLand = v; logEv('byggux', v ? 'liggende hjelp på' : 'liggende hjelp av'); })),
  fl('gridguide', 'spill', 'Byggeskjerm (rutenett, R75): «Så slik»-guiden vises første gang du bruker rutenett (og MODUS-knappen blinker til du har prøvd den); bare på Nybegynner og Medium. Slå av og på igjen for å få guiden på nytt (den finnes også under ?-knappen i byggeskjermen)', true, () => gridGuide, kp('tlm.gridguideon', (v) => { const was = gridGuide; gridGuide = v; if (v && !was) { store.set('tlm.gridguide', 0); store.set('tlm.gridmodetip', 0); store.set('tlm.gridguide.play', 0); store.set('tlm.gridmodetip.play', 0); } logEv('bygg', v ? 'rutenett-guide på' : 'rutenett-guide av'); })),
  rg('buildgridmax', 'admin', 'Byggeskjerm: lengste stav i rutenett-modus (enheter à 5 cm; staven må være minst 1,2)', 6.5, 2, 10, 0.5, () => buildGridMax, kp('tlm.buildgridmax', (v) => { buildGridMax = v; }), { digits: 1 }),
  fl('buildgridstress', 'spill', 'Byggeskjerm (rutenett, R73): stavene farges grønn, gul, oransje og rød etter belastning under og etter prøven (strekk tegnes tynnere enn trykk). Av = vanlig utseende', true, () => buildGridStress, kp('tlm.buildgridstress', (v) => { buildGridStress = v; })),
  fl('buildgridpeak', 'spill', 'Byggeskjerm (rutenett, R73): «største belastning» etter prøven: viser staven som brakk først, ellers den som var nærmest brudd', true, () => buildGridPeak, kp('tlm.buildgridpeak', (v) => { buildGridPeak = v; })),
  fl('buildgridpass', 'admin', 'Byggeskjerm (rutenett, R108): lasten kjører bare på veien (stavene på veilinjen mellom ankrene). Alle andre staver er konstruksjon som bærer veien: de stopper ikke lasten, og lasten kan ikke klatre opp på dem. Av = alle staver er faste som før', true, () => GRIDOPT.pass, kp('tlm.buildgridpass', (v) => { GRIDOPT.pass = v; logEv('bygg', v ? 'lasten kjører bare på veien' : 'alle staver stopper lasten'); })),
  fl('buildgriddeck', 'admin', 'Byggeskjerm (rutenett, R73): nytt bygg i rutenett-modus starter med kjøredekk mellom de to ankrene (rett kjede som ikke kan slettes). Av = tomt rutenett som før', true, () => buildGridDeck, kp('tlm.buildgriddeck', (v) => { buildGridDeck = v; })),
  rg('buildgridgamma', 'admin', 'Byggeskjerm (rutenett, R73): fargekurve for belastning (visning = belastning ^ dette; 0,5 gjør små laster synlige, 1 = rett fram)', 0.5, 0.25, 1, 0.05, () => buildGridGamma, kp('tlm.buildgridgamma', (v) => { buildGridGamma = v; }), { digits: 2 }),
  rg('buildloupezoom', 'spill', 'Glass i byggeskjermen: forstørrelse (ganger, 1,5 til 6; standard 3,75 = 25 % mer enn før)', 3.75, 1.5, 6, 0.25, () => buildLoupeZoom, kp('tlm.buildloupezoom', (v) => { buildLoupeZoom = normZoom(v); logEv('bygg', `glass forstørrelse ${buildLoupeZoom}`); })),
  rg('buildloupesize', 'spill', 'Glass i byggeskjermen: størrelse (% av 140 px stående og 120 px liggende; standard 100)', 100, 70, 200, 5, () => buildLoupeSize, kp('tlm.buildloupesize', (v) => { buildLoupeSize = normSizePct(v); logEv('bygg', `glass størrelse ${buildLoupeSize} %`); })),
  rg('buildgridslow', 'admin', 'Byggeskjerm (rutenett, R73): tempo i SLOW under prøven (1 = vanlig fart)', 0.3, 0.1, 0.8, 0.05, () => buildGridSlow, kp('tlm.buildgridslow', (v) => { buildGridSlow = v; }), { digits: 2 }),
  fl('squaretip', 'hjelp', 'Byggeskjerm (R119): hint når bygget har en firkant uten diagonal: «En firkant gir etter. Legg inn en diagonal, så blir den stiv.» Gjelder rutenett-bygging i alle steder (broene og Byggeskolen)', true, () => squareTipOn, kp('tlm.squaretip', (v) => { squareTipOn = v; logEv('bygg', v ? 'firkant-hint på' : 'firkant-hint av'); })),
  fl('fagverkcard', 'hjelp', 'Badebro (R119): første gang du bygger på «Bygg 5: Broen over badekaret» uten at Byggeskolen · Fagverk er bestått, vises «Prøv Byggeskolen · Fagverk først» (TIL BYGGESKOLEN / HOPP OVER). Én gang, aldri på Ekspert', true, () => fagverkCardOn, kp('tlm.fagverkcard', (v) => { fagverkCardOn = v; logEv('byggeskole', v ? 'fagverk-kort på' : 'fagverk-kort av'); })),
  fl('schoolcard', 'spill', 'Byggeskole (R95): vis et lite kort første gang du åpner byggeskjermen i et vanlig byggebrett («Ny til bygging? Prøv BYGGESKOLE først»). Vises bare én gang, aldri på Ekspert', true, () => schoolCardOn, kp('tlm.schoolcard', (v) => { schoolCardOn = v; logEv('byggeskole', v ? 'første-møte-kort på' : 'første-møte-kort av'); })),
  fl('gridstage', 'spill', 'Bygglab, rutenett (R74): hvert sted har et mål (last som må over), et budsjett og stjerner etter pris; tyngre last enn i klassisk modus. Av = fri rutenett-bygging uten krav', true, () => gridStage, kp('tlm.gridstage', (v) => { gridStage = v; logEv('bygg', v ? 'rutenett-oppdrag på' : 'rutenett-oppdrag av'); })),
  fl('gridlock', 'spill', 'Bygglab, rutenett (R74): neste sted åpnes i rutenett først når forrige er bestått. Av = alle steder åpne', true, () => gridLock, kp('tlm.gridlock', (v) => { gridLock = v; logEv('bygg', v ? 'rutenett-låsing på' : 'rutenett-låsing av'); })),
  fl('gridplay', 'spill', 'Byggeskjerm (rutenett, R82): MODUS-knappen finnes også i de vanlige brettene (Hyllebroen, Kjøkkenbroen og andre steder med to klipper og kjøredekk). Klassisk er alltid standard. Av = bare klassisk bygging i de vanlige brettene', true, () => gridPlay, kp('tlm.gridplay', (v) => { gridPlay = v; logEv('bygg', v ? 'rutenett i vanlige brett på' : 'rutenett i vanlige brett av'); })),
  fl('gridplaylock', 'spill', 'Byggeskjerm (rutenett, R82): rutenett i de vanlige brettene åpnes etter at første byggested (Hyllebroen) er bestått. Av = åpent overalt', true, () => gridPlayLock, kp('tlm.gridplaylock', (v) => { gridPlayLock = v; logEv('bygg', v ? 'rutenett-lås i vanlige brett på' : 'rutenett-lås i vanlige brett av'); })),
  rg('gridmassk', 'admin', 'Bygglab, rutenett (R74): faktor på hvor tung lasten er (1 = standard; lavere gjør stedene lettere)', 1, 0.25, 2, 0.25, () => gridMassK, kp('tlm.gridmassk', (v) => { gridMassK = v; }), { digits: 2 }),
  rg('gridbudgetk', 'admin', 'Bygglab, rutenett (R74): faktor på budsjettet (1 = standard; høyere gir mer å bygge for)', 1, 0.5, 3, 0.25, () => gridBudgetK, kp('tlm.gridbudgetk', (v) => { gridBudgetK = v; }), { digits: 2 }),
  fl('buildtruss', 'hjelp', 'Byggeskjerm: viser ledd som kan svinge (ringer + stiplet diagonal) og slanke deler som knekker lett (⚠ med antall klosser); etter en feilet prøve også deler nær knekking', true, () => buildTruss, kp('tlm.buildtruss', (v) => { buildTruss = v; })),
  fl('buildbreakfx', 'spill', 'Byggeskjerm: kort pause og sakte film når noe brekker i PRØV (med ring rundt bruddet)', true, () => buildBreakFx, kp('tlm.buildbreakfx', (v) => { buildBreakFx = v; })),
  fl('buildbudget', 'spill', 'Byggeskjerm: kostnad og stjerner (1-3 etter pris og antall deler; vises i byggeskjermen, delmålet og målskjermen)', true, () => buildBudget, kp('tlm.buildbudget', (v) => { buildBudget = v; })),
  fl('buildbonus', 'spill', 'Byggeskjerm: smuler åpner ekstradeler (en ekstra planke/kloss ved et antall smuler)', true, () => buildBonus, kp('tlm.buildbonus', (v) => { buildBonus = v; })),
  rg('buildbonusstep', 'admin', 'Byggeskjerm: smuler per ekstradel (faktor på 3/6/9 smuler, 1 = standard)', 1, 0.5, 3, 0.5, () => buildBonusStep, kp('tlm.buildbonusstep', (v) => { buildBonusStep = v; }), { digits: 1 }),
  fl('buildtex', 'spill', 'Teksturer på bygde deler: tre, stål, tau, plast og leker får ekte overflate i verden (av = enkle farger som før)', true, () => buildTex, kp('tlm.buildtex', (v) => { buildTex = v; logEv('bygg', v ? 'teksturer på bygde deler: på' : 'teksturer på bygde deler: av'); bld.world.redraw?.(); })),
  fl('buildlego', 'spill', 'Byggeskjerm: legoklosser klikker sammen (snapper til knottene på andre legoklosser)', true, () => buildLego, kp('tlm.buildlego', (v) => { buildLego = v; })),
  fl('buildloads', 'spill', 'Byggeskjerm: leker som testlast (tennisball, leke-bil og robot kan prøves i stedet for testfiguren, velges med knappene over delene)', true, () => buildLoads, kp('tlm.buildloads', (v) => { buildLoads = v; })),
  fl('buildshare', 'spill', 'Byggeskjerm: dele bygg (kopier og lim inn kode; med tester-kode og nett sendes vellykkede bygg til «Beste bygg» anonymt, og du kan prøve andres)', true, () => buildShare, kp('tlm.buildshare', (v) => { buildShare = v; })),
  fl('buildghost', 'spill', 'Byggeskjerm: spøkelse av forrige prøve vises under neste PRØV, og SE IGJEN spiller av siste prøve (standard av: skyggen av forrige runde forvirret)', false, () => buildGhost, kp('tlm.buildghost', (v) => { buildGhost = v; })),
  fl('buildslow', 'spill', 'Byggeskjerm: PRØV i sakte film (lettere å se hvor det bøyer og brekker)', false, () => buildSlow, kp('tlm.buildslow', (v) => { buildSlow = v; })),
  rg('buildaxial', 'admin', 'Byggeskjerm: knekk-, strekk- og knusegrense langs delene (faktor, 1 = standard; Euler-lasten E·h³/L²)', 1, 0.3, 3, 0.1, () => buildAxial, kp('tlm.buildaxial', (v) => { buildAxial = v; }), { digits: 1 }),
  rg('buildstrength', 'admin', 'Byggeskjerm: hvor sterkt bygget er (faktor på brekkgrensene, 1 = standard)', 1, 0.5, 2, 0.1, () => buildStrength, kp('tlm.buildstrength', (v) => { buildStrength = v; }), { digits: 1 }),
  fl('buildworld', 'admin', 'Byggeskjerm: et prøvd bygg står i verden som solid (figuren kan gå på det)', true, () => buildWorld, kp('tlm.buildworld', (v) => { buildWorld = v; })),
  fl('shaderwarm', 'admin', 'Forvarm alle shadere under oppstart (full tegning, også glass); av = bare renderer.compile', true, () => shaderWarm, kp('tlm.shaderwarm', (v) => { shaderWarm = v; })),
  fl('buildall', 'admin', 'Byggeskjerm: alle deler åpne (test)', false, () => buildAll, kp('tlm.buildall', (v) => { buildAll = v; })),
  fl('labstart', 'spill', 'Bygglab: åpne byggeskjermen med en gang når prøverommet starter (TILBAKE går ut til rommet, BYGG-knappen tilbake inn)', true, () => labStart, kp('tlm.labstart', (v) => { labStart = v; logEv('bygglab', v ? 'start i byggemodus på' : 'start i byggemodus av'); })),
  fl('labfree', 'admin', 'Bygglab: ubegrenset mengde av alle deler (av = bare to av hver type)', true, () => labFree, kp('tlm.labfree', (v) => { labFree = v; logEv('bygglab', v ? 'ubegrenset mengde på' : 'ubegrenset mengde av'); })),
  fl('crumbs', 'spill', 'Smuler (gylne smuler å samle, gir poeng)', true, () => crumbsOn, kp('tlm.crumbs', (v) => { crumbsOn = v; })),
  fl('ants', 'hjelp', 'Maur (fiender som patruljerer): av = ingen maur i brettene', true, () => antsOn, kp('tlm.ants', (v) => { antsOn = v; })),
  fl('toys', 'spill', 'Levende leker (tennisball, bil, vippehest, wind-up og sprettboks reagerer med lyd og bevegelse)', true, () => toysOn, kp('tlm.toys', (v) => { toysOn = v; toyLife.on = v; logEv('leke', v ? 'levende leker på' : 'levende leker av'); })),
  fl('replies', 'test', 'Vis svar og tellere fra Claude (⚑-boksen)', true, () => repliesOn, kp('tlm.replies', (v) => { repliesOn = v; if (v) refreshInbox(false); else renderInbox(); })),
  fl('combo', 'spill', 'Kombinasjoner: svamp + vann, håndkle + håndkle, tung ting + papirhaug (TA ved siden av)', true, () => COMBO.on, kp('tlm.combo', (v) => { COMBO.on = v; logEv('kombo', v ? 'kombinasjoner på' : 'kombinasjoner av'); })),
  fl('vaultanim', 'spill', 'Stavhopp: egen animasjon (figuren svinger over staven)', true, () => COMBO.vaultAnim, kp('tlm.vaultanim', (v) => { COMBO.vaultAnim = v; logEv('kombo', v ? 'stavhopp-animasjon på' : 'stavhopp-animasjon av'); })),
  rg('combowet', 'admin', 'Våt svamp: andel av landingsfarten den tar imot (lavere = mykere)', 0.15, 0.02, 0.35, 0.01, () => COMBO.wetSoft, kp('tlm.combowet', (v) => { COMBO.wetSoft = v; }), { digits: 2 }),
  rg('combopress', 'admin', 'Presset papirhaug: andel av høyden som blir igjen', 0.5, 0.2, 0.8, 0.05, () => COMBO.pressTo, kp('tlm.combopress', (v) => { COMBO.pressTo = v; }), { digits: 2 }),
  rg('comboknot', 'admin', 'Knyttet håndkle-tau: lengde i forhold til dopapirbånd', 1.8, 1, 3, 0.1, () => COMBO.knotMul, kp('tlm.comboknot', (v) => { COMBO.knotMul = v; }), { digits: 1 }),
  fl('kick', 'spill', 'Sprettboksen kaster figuren bort når den popper under ham', true, () => KICK.on, kp('tlm.kick', (v) => { KICK.on = v; logEv('leke', v ? 'sprettbokskast på' : 'sprettbokskast av'); })),
  rg('kickspeed', 'admin', 'Sprettboks-kast: fart bort fra boksen', 5.5, 0, 9, 0.5, () => KICK.speed, kp('tlm.kickspeed', (v) => { KICK.speed = v; }), { digits: 1 }),
  rg('kickup', 'admin', 'Sprettboks-kast: fart opp', 11, 4, 16, 0.5, () => KICK.up, kp('tlm.kickup', (v) => { KICK.up = v; }), { digits: 1 }),
  rg('kicksafe', 'admin', 'Sprettboks-kast: uskadd-tid etter kastet (sekunder)', 1.6, 0, 4, 0.2, () => KICK.safeT, kp('tlm.kicksafe', (v) => { KICK.safeT = v; }), { digits: 1 }),
  rg('toywind', 'admin', 'Levende leker: hvor lenge wind-up-roboten går (sekunder)', 2.6, 1, 6, 0.2, () => TOY.windT, kp('tlm.toywind', (v) => { TOY.windT = v; }), { digits: 1 }),
  fl('creatures', 'spill', 'Nye skapninger (pillbug som ruller, edderkopp i tråd): av = bare maur', true, () => creaturesOn, kp('tlm.creatures', (v) => { creaturesOn = v; LEVEL.noCreatures = !v; logEv('fiende', v ? 'skapninger på' : 'skapninger av'); })),
  rg('creaturewarn', 'admin', 'Nye skapninger: varseltid (faktor, 1 = standard)', 1, 0.7, 2.5, 0.1, () => creatureWarn, kp('tlm.creaturewarn', (v) => { creatureWarn = v; CREATURE_TUNE.warn = v; }), { digits: 1 }),
  fl('wasp', 'spill', 'Veps som flyr (varsler, stuper mot deg: gjem deg under en ting, stikk til siden eller hopp på den); av = ingen veps', true, () => waspOn, kp('tlm.wasp', (v) => { waspOn = v; LEVEL.noWasps = !v; logEv('fiende', v ? 'veps på' : 'veps av'); })),
  sl('wasplevel', 'spill', 'Veps: vanskelighet (lett = lengre varsel og saktere stup)', 'normal', [['easy', 'Lett'], ['normal', 'Normal'], ['hard', 'Vanskelig']], () => waspLevel, kp('tlm.wasplevel', (v) => { waspLevel = v; WASP_TUNE.level = v; logEv('fiende', 'veps-vanskelighet ' + v); })),
  fl('boss', 'hjelp', 'Sjef-maur i siste rom (nivå 6): av = ingen sjef', true, () => bossOn, kp('tlm.boss', (v) => { bossOn = v; logEv('sjef', v ? 'på' : 'av'); })),
  fl('lostreturn', 'spill', 'Ting som forsvinner kommer tilbake av seg selv', true, () => lostReturnOn, kp('tlm.lostreturn', (v) => { lostReturnOn = v; })),
  fl('confirmnew', 'admin', 'Vis bekreftelse med oversikt før NYTT SPILL sletter fremgangen (R86)', true, () => confirmNewOn, kp('tlm.confirmnew', (v) => { confirmNewOn = v; })),
  fl('confirm2', 'spill', 'Lagre / Tilbake / Ting: trykk to ganger', true, () => confirm2On, kp('tlm.confirm2', (v) => { confirm2On = v; })),
  sl('gfx', 'spill', 'Grafikk (laster siden på nytt)', 'high', [['high', 'Detaljert'], ['low', 'Enkel (for eldre telefoner)']], () => (gfxLow ? 'low' : 'high'), (v) => { if ((v === 'low') === gfxLow) return; store.set('tlm.gfx', v); setTimeout(() => location.reload(), 150); }),
  sl('grade', 'spill', 'Fargegradering (Toy Story-lys, laster siden på nytt)', 'film', [['film', 'Varm film'], ['off', 'Av (opprinnelig lys)']], () => gradeMode, (v) => { if (v === gradeMode) return; logEv('grade', v); store.set('tlm.grade', v); setTimeout(() => location.reload(), 150); }),
  fl('gradefilter', 'spill', 'Fargefilter på skjermen (Varm film; slå av om det går tregt)', true, () => store.get('tlm.gradefilter', true) !== false, (v) => { store.set('tlm.gradefilter', v); logEv('gradefilter', v ? 'på' : 'av'); grade.setFilter(v); }),
  fl('varmood', 'spill', 'Nivå 4–6: egen stemning (kveld, natt, hjelmlykt)', true, () => variantMoodOn, kp('tlm.varmood', (v) => { variantMoodOn = v; logEv('stemning', v ? 'på' : 'av'); })),
  fl('vartwist', 'spill', 'Nivå 4–6: egen vri (vann som stiger, lys som slukkes, tog)', true, () => variantTwistOn, kp('tlm.vartwist', (v) => { variantTwistOn = v; logEv('vri', v ? 'på' : 'av'); })),
  sl('flood', 'spill', 'Nivå 4: stigende vann (vannet stiger sakte, du må klatre høyere enn det; druknet = tilbake til lagringspunktet)', 'av', [['av', 'Av (vanlig vann)'], ['rolig', 'Rolig'], ['vanlig', 'Vanlig'], ['rask', 'Rask']], () => floodMode, (v) => { floodMode = v; store.set('tlm.flood', v); logEv('flood', `valg: ${v}`); }),
  rg('floodrate', 'admin', 'Stigende vann: fartsfaktor (1 = standard)', 1, 0.5, 2.5, 0.1, () => floodMult, kp('tlm.floodrate', (v) => { floodMult = v; }), { digits: 1 }),
  rg('lamp', 'admin', 'Hjelmlykt: styrke', 1, 0.3, 2.5, 0.1, () => lampPower, kp('tlm.lamp', (v) => { lampPower = v; }), { digits: 1 }),
  fl('dust', 'spill', 'Støv i lufta', true, () => dustOn, kp('tlm.dust', (v) => { dustOn = v; })),
  ...(gfxLow ? [] : [
    fl('rays', 'spill', 'Lysstråler fra vinduet (Detaljert grafikk)', true, () => raysOn, kp('tlm.rays', (v) => { raysOn = v; logEv('lysstraaler', v ? 'på' : 'av'); })),
    fl('ao', 'spill', 'Mørkere hjørner og kontaktskygger (Detaljert grafikk)', true, () => aoOn, kp('tlm.ao', (v) => { aoOn = v; logEv('hjorner', v ? 'på' : 'av'); })),
    fl('softlight', 'spill', 'Myke skygger og lysflekk: mørke hjørner og under møbler, varm flekk fra vinduet (Detaljert grafikk, ikke Lav profil)', true, () => softOn, kp('tlm.softlight', (v) => { softOn = v; logEv('myke skygger', v ? 'på' : 'av'); })),
    fl('floordetail', 'spill', 'Gulvdetaljer: blyantstumper, perler, flekker og skitt i fugene for målestokk (Detaljert grafikk)', true, () => floorDetailOn, kp('tlm.floordetail', (v) => { floorDetailOn = v; logEv('gulvdetaljer', v ? 'på' : 'av'); })),
    fl('beadsolid', 'spill', 'Perler på gulvet er solide: du stoppes av dem og kan stå på dem (Detaljert grafikk)', true, () => beadSolidOn, kp('tlm.beadsolid', (v) => { beadSolidOn = v; logEv('perler', v ? 'solide' : 'gjennomtrengelige'); })),
    fl('decorsolid', 'admin', 'Dekor på hyller og lignende (glass, krydderbokser) er solid: du stoppes av dem, kan hoppe over og stå på dem', true, () => decorSolidOn, kp('tlm.decorsolid', (v) => { decorSolidOn = v; logEv('dekor', v ? 'solid' : 'gjennomtrengelig'); })),
    fl('pencilsolid', 'admin', 'Blyanter og viskelær på gulvet er solide: du stoppes av dem, kan hoppe over og stå på dem (Detaljert grafikk)', true, () => pencilSolidOn, kp('tlm.pencilsolid', (v) => { pencilSolidOn = v; logEv('gulvdetaljer', v ? 'blyanter solide' : 'blyanter gjennomtrengelige'); })),
    fl('lego', 'spill', 'Legoknotter på gulv og tak i lekerommet, nivå 7 (Detaljert grafikk)', true, () => legoOn, kp('tlm.lego', (v) => { legoOn = v; logEv('legoknotter', v ? 'på' : 'av'); })),
    sl('legodens', 'admin', 'Legoknotter: tetthet (laster siden på nytt)', '1', [['0.5', 'Få'], ['1', 'Vanlig'], ['1.6', 'Mange']], () => String(legoDens), (v) => { if (+v === +legoDens) return; store.set('tlm.legodens', +v); logEv('legoknotter', `tetthet ${v}`); setTimeout(() => location.reload(), 150); }),
    sl('cinema', 'admin', 'Kinomodus for trailer-opptak: skjuler all UI, ingen lyd og lagring, fast frø, skript styrer kamera og tid (laster siden på nytt; slå av igjen med ?cinema=0 eller ved å fjerne cinema fra adressen)', 'av', [['av', 'Av'], ['paa', 'På (kinomodus)']], () => (CINE.on ? 'paa' : 'av'), (v) => { if ((v === 'paa') === CINE.on) return; logEv('kino', `valg: ${v}`); setTimeout(() => (v === 'paa' ? window.__game.cine.on() : window.__game.cine.off()), 150); }),
    sl('qfps', 'admin', 'Auto-oppløsning: senk bildet når FPS er under (laster siden på nytt)', '27', [['24', '24 fps (sjeldnere)'], ['27', '27 fps (standard)'], ['30', '30 fps (tidligere)']], () => String(qFps), (v) => { if (+v === +qFps) return; store.set('tlm.qfps', +v); logEv('ytelse', `kvalitetsgrense ${v} fps`); setTimeout(() => location.reload(), 150); }),
    sl('texmax', 'admin', 'Teksturer: største kantlengde på store flater, f.eks. gulvet (laster siden på nytt). 512 gir ca. 70 % mindre teksturminne enn 1024 uten synlig tap på mobil', String(TEX_MAX.def), [['512', '512 (standard)'], ['1024', '1024 (tidligere)']], () => String(texMax), (v) => { if (+v === +texMax) return; store.set('tlm.texmax', +v); logEv('ytelse', `teksturtak ${v}`); setTimeout(() => location.reload(), 150); }),
    sl('antdetail', 'admin', 'Maur og edderkopper: detaljnivå på formene (laster siden på nytt). Lavere = færre trekanter i Nivå 4–6', String(ANT_Q.def), [['0.4', 'Lav'], ['0.6', 'Normal'], ['0.8', 'Høy'], ['1', 'Full']], () => String(antQv), (v) => { if (+v === +antQv) return; store.set('tlm.antdetail', +v); logEv('ytelse', `maurdetalj ${v}`); setTimeout(() => location.reload(), 150); }),
    fl('shcull', 'admin', 'Skygger: tegn bare kastere som er nær figuren og store nok til å synes', true, () => shCullOn, (v) => { shCullOn = v; store.set('tlm.shcull', v); logEv('ytelse', v ? 'skyggeutvalg på' : 'skyggeutvalg av'); shPacer.force(); }),
    sl('shradius', 'admin', 'Skygger: kasterne tegnes innenfor denne avstanden fra figuren (enheter)', String(SHADOW.radius), [['12', '12 (nærmest)'], ['17', '17 (standard)'], ['26', '26 (alt i kartet)']], () => String(shRadius), (v) => { shRadius = +v; store.set('tlm.shradius', +v); logEv('ytelse', `skyggeradius ${v}`); shPacer.force(); }),
    sl('shevery', 'admin', 'Skygger: skyggekartet tegnes på nytt hvert n-te bilde når alt står stille (1 = hvert bilde)', String(SHADOW.every), [['1', 'Hvert bilde'], ['2', 'Hvert 2.'], ['3', 'Hvert 3. (standard)'], ['4', 'Hvert 4.']], () => String(shEvery), (v) => { shEvery = +v; store.set('tlm.shevery', +v); logEv('ytelse', `skyggetempo 1/${v}`); shPacer.force(); }),
    fl('warmspread', 'admin', 'Forvarming i små steg (ett per bilde) i stedet for ett langt stopp under oppstart', true, () => warmSpread, (v) => { warmSpread = v; store.set('tlm.warmspread', v); }),
    sl('herodetail', 'admin', 'Figuren: detaljnivå på formene (laster siden på nytt). Lavere = færre trekanter og jevnere bilde på eldre telefoner', '0.6', [['0.4', 'Lav'], ['0.6', 'Normal'], ['0.8', 'Høy'], ['1', 'Full']], () => String(heroQ), (v) => { if (+v === +heroQ) return; store.set('tlm.herodetail', +v); logEv('ytelse', `figurdetalj ${v}`); setTimeout(() => location.reload(), 150); }),
    sl('fdens', 'admin', 'Gulvdetaljer: tetthet (laster siden på nytt)', '1', [['0.5', 'Få'], ['1', 'Vanlig'], ['1.6', 'Mange']], () => String(fdDens), (v) => { if (+v === +fdDens) return; store.set('tlm.fdens', +v); logEv('gulvdetaljer', `tetthet ${v}`); setTimeout(() => location.reload(), 150); }),
    fl('clutter', 'spill', 'Småting på gulv og hyller: smuler, knapper, hår (Detaljert grafikk)', true, () => clutterOn, kp('tlm.clutter', (v) => { clutterOn = v; logEv('smating', v ? 'på' : 'av'); }))]),
  fl('hudtech', 'spill', 'Vis alltid tekniske tall (høyde, tid, poeng). Ellers: trykk på teksten øverst', false, () => hudTech, kp('tlm.hudtech', (v) => { hudTech = v; })),
  // Styring
  ...(!TOUCH ? [rg('mousesens', 'styring', 'Mus: følsomhet (lavere = roligere kamera)', 0.45, 0.15, 1.5, 0.05, () => mouseSens, kp('tlm.mousesens', (v) => { mouseSens = v; }), { pct: true })] : []),
  rg('camsens', 'styring', 'Kamerafølsomhet (dra)', 1, 0.4, 2, 0.1, () => camSens, kp('tlm.camsens', (v) => { camSens = v; })),
  sl('caminvy', 'styring', TOUCH ? 'Kamera: når du drar tommelen opp' : 'Kamera: når du drar musa opp', 'up', [['up', 'Se opp (standard)'], ['down', 'Se ned (omvendt)']], () => (camInvY ? 'down' : 'up'), (v) => { camInvY = v === 'down'; store.set('tlm.caminvy', camInvY); }),
  rg('stickdead', 'styring', 'Stikke: dødsone (mot skjelving)', 0.22, 0, 0.4, 0.02, () => stickDead, kp('tlm.stickdead', (v) => { stickDead = v; })),
  rg('btnscale', 'styring', 'Knappestørrelse', 1, 0.8, 1.3, 0.05, () => btnScale, kp('tlm.btnscale', (v) => { btnScale = v; applyUiFlags(); })),
  sl('difficulty', 'hjelp', 'Vanskelighet (Nybegynner: all hjelp · Medium: mindre · Ekspert: ingen piler, kompass eller hint). Endrer du hjelpevalg under, står det Egendefinert', DEFAULT_DIFF, [['beginner', dft('nb', 'df.beginner')], ['medium', dft('nb', 'df.medium')], ['expert', dft('nb', 'df.expert')], ['custom', dft('nb', 'df.custom')]], () => (isCustomHelp(store) ? 'custom' : difficulty), (v) => { if (v !== 'custom') applyDifficulty(v, { carry: true, why: '⚙' }); }),
  sl('help', 'styring', 'Hjelp-nivå (tilgivende hopp, kantgrep, hinder)', 'normal', [['none', 'Ingen (som Prince)'], ['normal', 'Normal'], ['much', 'Mye hjelp']], () => helpLevel, kp('tlm.helplevel', (v) => { helpLevel = v; reapplyKnobs(); })),
  rg('inertia', 'styring', 'Treghet (lav = kjapp, høy = tung)', 1, 0.5, 1.6, 0.05, () => inertia, kp('tlm.inertia', (v) => { inertia = v; reapplyKnobs(); }), { pct: true }),
  rg('speedscale', 'styring', 'Gangfart', 1, 0.6, 1.5, 0.05, () => speedScale, kp('tlm.speedscale', (v) => { speedScale = v; reapplyKnobs(); }), { pct: true }),
  rg('stickcurve', 'styring', 'Stikke: følsomhet (1 = lineær, høyere = finere i midten)', 1.3, 1, 2.2, 0.1, () => stickCurve, kp('tlm.stickcurve', (v) => { stickCurve = v; })),
  fl('stickfloat', 'styring', 'Flytende stikke (følger tommelen) i stedet for fast som i PUBG', false, () => stickFloat, kp('tlm.stickfloat', (v) => { stickFloat = v; })),
  ...(!TOUCH ? [fl('mouselook', 'styring', 'Musestyring (klikk i bildet: mus ser deg rundt, venstre = TA, høyre = GREP)', true, () => mouseLook, kp('tlm.mouselook', (v) => { mouseLook = v; if (!v && document.pointerLockElement) document.exitPointerLock(); }))] : []),
  fl('aimthrow', 'styring', 'Kast med dra og slipp (hold TA, dra ned)', true, () => aimThrowOn, kp('tlm.aimthrow', (v) => { aimThrowOn = v; })),
  fl('camrelay', 'kamera', 'Dra fra knapper, kantfeltet rundt dem og toppbåndet dreier kameraet (høyre tommel)', true, () => camRelayOn, kp('tlm.camrelay', (v) => { camRelayOn = v; relay.clear(); logEv('kamera', v ? 'dra fra knapper på' : 'dra fra knapper av'); })),
  rg('camslop', 'admin', 'Kamera: piksler fingeren må flytte seg fra en knapp før det regnes som dra', CAM_SLOP, 3, 24, 1, () => camSlop, kp('tlm.camslop', (v) => { camSlop = v; })),
  fl('dbltap', 'styring', 'Dobbelttrykk på skjermen sentrerer kameraet', true, () => dblTapOn, kp('tlm.dbltap', (v) => { dblTapOn = v; })),
  fl('showmapbtn', 'styring', 'Vis kart-knappen (oversikt) ved siden av ◎. Av = ingen knapp; minikartet øverst virker fortsatt', false, () => showMapBtn, kp('tlm.showmapbtn2', (v) => { showMapBtn = v; applyUiFlags(); })),
  fl('showcenter', 'styring', 'Vis ◎-knappen (sentrer kamera)', false, () => showCenter, kp('tlm.showcenter2', (v) => { showCenter = v; applyUiFlags(); })),
  fl('edgeguard', 'styring', TOUCH ? 'Kanthjelp: stopp ved kanten når du skyver stikken forsiktig' : 'Kanthjelp: stopp ved kanten når du går forsiktig (C)', true, () => edgeGuardOn, kp('tlm.edgeguard', (v) => { edgeGuardOn = v; reapplyKnobs(); })),
  fl('shimmy', 'styring', TOUCH ? 'Kant-shimmy: heng i en kant og skyv stikken sidelengs for å gå langs den' : 'Kant-shimmy: heng i en kant og gå sidelengs langs den (A/D)', true, () => shimmyOn, kp('tlm.shimmy', (v) => { shimmyOn = v; reapplyKnobs(); logEv('finpuss', 'shimmy ' + (v ? 'på' : 'av')); })),
  fl('roll', 'styring', TOUCH ? 'Rulle ved landing: lander du hardt i fart og skyver stikken, ruller du i stedet for å bli bedøvd' : 'Rulle ved landing: lander du hardt i fart og styrer, ruller du i stedet for å bli bedøvd', true, () => rollOn, kp('tlm.roll', (v) => { rollOn = v; reapplyKnobs(); logEv('finpuss', 'rulle ' + (v ? 'på' : 'av')); })),
  fl('careful', 'styring', TOUCH ? 'Forsiktig gange: lett stikke gir rolig gange (stopper ved kanten med Kanthjelp)' : 'Forsiktig gange: lett styring gir rolig gange (stopper ved kanten med Kanthjelp)', true, () => carefulOn, kp('tlm.careful', (v) => { carefulOn = v; reapplyKnobs(); logEv('finpuss', 'forsiktig gange ' + (v ? 'på' : 'av')); })),
  fl('ropeheavy', 'styring', 'Tyngre tau: lengre sving med mer treghet og fart i utsvinget', true, () => ropeHeavyOn, kp('tlm.ropeheavy', (v) => { ropeHeavyOn = v; reapplyKnobs(); logEv('finpuss', 'tungt tau ' + (v ? 'på' : 'av')); })),
  rg('shimspeed', 'admin', 'Kant-shimmy: fart sidelengs (enheter/s)', 1.1, 0.4, 2.5, 0.1, () => FIN.shimmySpeed, kp('tlm.shimspeed', (v) => { FIN.shimmySpeed = v; }), { digits: 1 }),
  rg('rollsafe', 'admin', 'Rulle: uskadd-tid etter rullen (sekunder)', 0.9, 0, 3, 0.1, () => FIN.rollSafe, kp('tlm.rollsafe', (v) => { FIN.rollSafe = v; }), { digits: 1 }),
  rg('carefulmul', 'admin', 'Forsiktig gange: fartsfaktor ved lett stikke', 0.7, 0.3, 1, 0.05, () => FIN.carefulMul, kp('tlm.carefulmul', (v) => { FIN.carefulMul = v; }), { digits: 2 }),
  rg('ropeg', 'admin', 'Tau: tyngdekraft på svingen (lavere = lengre periode)', 0.8, 0.4, 1, 0.05, () => FIN.ropeG, kp('tlm.ropeg', (v) => { FIN.ropeG = v; }), { digits: 2 }),
  rg('ropepush', 'admin', 'Tau: fart fra stikka i utsvinget (faktor)', 1.2, 0.6, 2, 0.05, () => FIN.ropePush, kp('tlm.ropepush', (v) => { FIN.ropePush = v; }), { digits: 2 }),
  rg('ropelag', 'admin', 'Tau: treghet i stikka (sekunder)', 0.22, 0, 0.8, 0.02, () => FIN.ropeLag, kp('tlm.ropelag', (v) => { FIN.ropeLag = v; }), { digits: 2 }),
  fl('autojump', 'styring', TOUCH ? 'Kanthjelp: hopp av seg selv over gap når du løper (stikken helt ut)' : 'Kanthjelp: hopp av seg selv over gap når du løper mot kanten', true, () => autoJumpOn, kp('tlm.autojump', (v) => { autoJumpOn = v; reapplyKnobs(); })),
  fl('airsteady', 'styring', TOUCH ? 'I lufta: demp skjelving på stikken' : 'I lufta: demp små rykk i styringen', true, () => airSteadyOn, kp('tlm.airsteady', (v) => { airSteadyOn = v; reapplyKnobs(); })),
  fl('magnet', 'styring', 'I lufta: sikte-hjelp (trekkes svakt mot grep, kanter og tau du nesten treffer)', true, () => magnetOn, kp('tlm.magnet', (v) => { magnetOn = v; reapplyKnobs(); })),
  fl('holdgrab', 'styring', TOUCH ? 'I lufta: hold GREP inne for å gripe det første du når' : 'I lufta: hold E / Shift inne for å gripe det første du når', true, () => holdGrabOn, kp('tlm.holdgrab', (v) => { holdGrabOn = v; reapplyKnobs(); })),
  { id: 'autograb', group: 'styring', type: 'bool', label: 'Grip kanten automatisk', get def() { return !!PRESETS[presetName]?.autoGrab; }, get: () => P.autoGrab, set: (v) => { P.autoGrab = v; saveCustom(); } },
  ...(navigator.vibrate ? [fl('vib', 'styring', 'Vibrasjon', true, () => vibOn, kp('tlm.vib', (v) => { vibOn = v; if (v) buzz(30); }))] : []),
  // Kamera
  fl('autocam', 'kamera', `Kameraet følger etter deg automatisk${key('X')}`, false, () => autoCam, kp('tlm.follow', (v) => { autoCam = v; })),
  rg('followstr', 'kamera', 'Kamerafølging: styrke (0 = av)', 1, 0, 2.5, 0.1, () => followStrength, kp('tlm.followstr', (v) => { followStrength = v; })),
  fl('fovauto', 'kamera', 'Synsfelt etter skjermformat (ca. 70° stående, 52° liggende)', true, () => !fovManual, kp('tlm.fovauto', (v) => { fovManual = !v; logEv('kamera', `synsfelt ${v ? 'automatisk' : 'valgt'}`); })),
  rg('fov', 'kamera', 'Synsfelt (grader; å flytte den velger selv og slår av automatikken)', 52, 38, 80, 1, () => (fovManual ? fovSet : Math.round(fovAutoCur)), (v) => { fovSet = v; store.set('tlm.fov', v); if (!fovManual) { fovManual = true; store.set('tlm.fovauto', false); } logEv('kamera', `synsfelt valgt ${v}`); }, { digits: 0 }),
  rg('pitchbase', 'kamera', 'Kameravinkel (høyere = mer ovenfra)', 0.26, 0.05, 0.7, 0.01, () => pitchBase, kp('tlm.pitchbase', (v) => { pitchBase = v; if (viewMode !== 'first') cam.pitch = viewMode === 'shoulder' ? v - 0.08 : v; })),
  fl('lookahead', 'kamera', 'Kameraet ser litt foran deg når du går', true, () => lookAheadOn, kp('tlm.lookahead', (v) => { lookAheadOn = v; })),
  fl('blob', 'kamera', 'Skygge under figuren og landingsmarkør', true, () => blobOn, kp('tlm.blob', (v) => { blobOn = v; })),
  sl('view', 'kamera', 'Kamerasyn / View', DEFAULT_VIEW, [['third', '3. person (bak figuren)'], ['shoulder', 'Over skulderen (som PUBG)'], ['first', '1. person (prøve)']], () => viewMode, setViewMode),
  rg('shdist', 'kamera', 'Skulderkamera: avstand', 3, 1.6, 5, 0.1, () => shDist, kp('tlm.shdist', (v) => { shDist = v; })),
  rg('shoff', 'kamera', 'Skulderkamera: sideforskyvning', 0.5, 0.2, 1.3, 0.05, () => shOff, kp('tlm.shoff', (v) => { shOff = v; })),
  sl('shside', 'kamera', 'Skulderkamera: side', 'right', [['right', 'Høyre skulder'], ['left', 'Venstre skulder']], () => (shSide < 0 ? 'left' : 'right'), (v) => { shSide = v === 'left' ? -1 : 1; store.set('tlm.shside', v); }),
  fl('xhair', 'kamera', 'Hårkors i skulderkamera (kast mot midten)', true, () => xhairOn, kp('tlm.xhair', (v) => { xhairOn = v; })),
  fl('camassist', 'kamera', 'Kameraet hjelper (over vegger, i fall og klatring)', true, () => camAssist, kp('tlm.camassist', (v) => { camAssist = v; })),
  fl('fade', 'kamera', 'Tone ut ting som står i veien for kameraet', true, () => fadeOn, kp('tlm.fade', (v) => { fadeOn = v; })),
  rg('fadeop', 'kamera', 'Utoning: synlighet (lavt = gjennomsiktig)', 0.16, 0.04, 0.7, 0.02, () => fadeOp, kp('tlm.fadeop', (v) => { fadeOp = v; }), { pct: true }),
  rg('camdist', 'kamera', 'Kameraavstand', 5.5, 3, 9, 0.1, () => cam.dist, kp('tlm.camdist', (v) => { cam.dist = v; camDistSet = v; })),
  // Hjelp og tekst
  sl('compassmode', 'hjelp', 'Retningshjelp mot neste hinder', 'both', [['both', 'Kompass og gulvpil'], ['compass', 'Bare kompass'], ['arrow', 'Bare gulvpil'], ['off', 'Av']], () => compassMode, kp('tlm.compassmode', (v) => { compassMode = v; })),
  fl('turnsteps', 'spill', 'Figuren snur med små skritt når du snur raskt på stedet', true, () => turnStepsOn, kp('tlm.turnsteps', (v) => { turnStepsOn = v; })),
  fl('stepover', 'spill', 'Figuren løfter foten over små hindre han tråkker opp på', true, () => stepOverOn, kp('tlm.stepover', (v) => { stepOverOn = v; })),
  rg('climbfeel', 'spill', 'Levende klatring: vekt i heng, fingre rundt kanten, bena skyver og sparker fra (0 = av)', 1, 0, CF.maxStrength, 0.1, () => climbFeelStr, kp('tlm.climbfeel', (v) => { climbFeelStr = v; }), { digits: 1 }),
  fl('gripposes', 'spill', 'Nye poser i heng, sving og veggglid (hender som tar tak)', true, () => gripPosesOn, kp('tlm.gripposes', (v) => { gripPosesOn = v; })),
  { id: 'smallstep', group: 'admin', type: 'range', label: 'Hinder under denne høyden tråkkes over uten hopp (0 = av)', min: 0, max: 0.4, step: 0.01, def: MOVE.stepOverMax, get: () => smallStepH, set: (v) => { smallStepH = v; store.set('tlm.smallstep', v); reapplyKnobs(); }, digits: 2 },
  fl('stepadapt', 'spill', 'Føttene tilpasser seg trinn og kanter', true, () => stepAdapt, kp('tlm.stepadapt', (v) => { stepAdapt = v; })),
  sl('resq', 'test', 'Oppløsning (Auto senker ved lav FPS og skrur opp igjen)', 'auto', [['auto', 'Auto (følger FPS)'], ['full', 'Full (skarp)'], ['mid', 'Middels (75 %)'], ['low', 'Lav (1×, raskest)']], () => resQ, kp('tlm.resq', (v) => { resQ = v; autoQ = v === 'auto'; if (autoQ) autoQC.reset(); applyRes(); })),
  fl('texsmall', 'test', 'Små teksturer: halv oppløsning på overflater, ca. 50 % mindre teksturminne (laster siden på nytt; alltid på med Enkel grafikk og Lav profil «På»)', false, () => texLow, (v) => { if (v === texLow) return; store.set('tlm.texsmall', v); logEv('teksturer', v ? 'små' : 'full'); setTimeout(() => location.reload(), 150); }),
  sl('lowprofile', 'test', 'Lav profil (ingen skygge-kart, støv, korn eller ekstra lys; Auto slår den på ved lav FPS)', 'auto', [['auto', 'Auto (ved lav FPS)'], ['off', 'Av'], ['on', 'På (alltid)']], () => lowMode, kp('tlm.lowprofile', (v) => { lowMode = v; if (v === 'auto') { if (lowOn) { lowP.reset(); applyLowProfile(false); } } else { lowP.decide(null, 9, 1, v); if (v === 'on' !== lowOn) applyLowProfile(v === 'on'); } })),
  fl('reactanim', 'spill', 'Figuren jubler (knuser maur) og rykker (maur støter)', true, () => reactAnim, kp('tlm.reactanim', (v) => { reactAnim = v; })),
  fl('idlewink', 'spill', 'Figuren snur seg og blunker når du står stille i 3 s', true, () => idleWink, kp('tlm.idlewink', (v) => { idleWink = v; })),
  fl('beacon', 'hjelp', 'Lyssøyle over målet', true, () => beaconOn, kp('tlm.beacon', (v) => { beaconOn = v; })),
  fl('landwarn', 'hjelp', 'Fallvarsel: vind og synsfelt øker mot hard landing, egen lyd og tekst for myk, hard og farlig landing', true, () => landWarn, kp('tlm.landwarn', (v) => { landWarn = v; logEv('fallvarsel', v ? 'på' : 'av'); })),
  rg('landfov', 'admin', 'Fallvarsel: synsfelt-økning mot fallterskelen (grader)', 6, 0, 14, 1, () => landFovMax, kp('tlm.landfov', (v) => { landFovMax = v; }), { digits: 0 }),
  rg('landwind', 'admin', 'Fallvarsel: ekstra fallvind (faktor, 0 = som før)', 1, 0, 2, 0.1, () => landWindMul, kp('tlm.landwind', (v) => { landWindMul = v; }), { digits: 1 }),
  rg('landmin', 'admin', 'Fallvarsel: minste landingsfart som gir lydtekst og logg', 9, 4, 16, 1, () => landMinV, kp('tlm.landmin', (v) => { landMinV = v; }), { digits: 0 }),
  fl('failhint', 'hjelp', 'Tips etter 3 fall på samme sted', true, () => failHintOn, kp('tlm.failhint', (v) => { failHintOn = v; })),
  fl('minimap', 'hjelp', 'Minikart øverst til venstre (trykk på det for oversikt; av som standard med Enkel grafikk)', true, () => miniOn ?? !gfxLow, kp('tlm.minimap', (v) => { miniOn = v; logEv('minikart', v ? 'på' : 'av'); })),
  fl('drawercue', 'hjelp', 'Tydelige skuffer (åpne står fram med mørk innside, lukkede er flate med fuge; gjelder fra neste brett)', true, () => drawerCue(), kp('tlm.drawercue', (v) => { setDrawerCue(v); logEv('skuffer', v ? 'tydelige' : 'enkle'); })),
  fl('markers', 'hjelp', 'Tydelige markører (grep ▲, hylle, glatt, pil i kanten)', true, () => markersOn, kp('tlm.markers', (v) => { markersOn = v; logEv('markør', v ? 'på' : 'av'); })),
  fl('markrank', 'hjelp', 'Færre markører: rangert budsjett etter Hjelp-nivå (Normal høyst 3 samtidig, Mye 6, Ingen 0), én pil om gangen, dempet med avstand og erfaring, bare den viktigste pulserer', true, () => markRankOn, kp('tlm.markrank', (v) => { markRankOn = v; logEv('markør', v ? 'rangering på' : 'rangering av (alle markører i nærheten)'); })),
  rg('markbudn', 'admin', 'Markørbudsjett på Normal (mål + grep + ⓘ)', MARK.budgetNormal, 1, 6, 1, () => markBudN, kp('tlm.markbudn', (v) => { markBudN = v; }), { digits: 0 }),
  rg('markbudm', 'admin', 'Markørbudsjett på Mye hjelp', MARK.budgetMuch, 2, 10, 1, () => markBudM, kp('tlm.markbudm', (v) => { markBudM = v; }), { digits: 0 }),
  rg('markmerge', 'admin', 'Markører nærmere enn dette (px) slås sammen', MARK.merge, 40, 160, 5, () => markMerge, kp('tlm.markmerge', (v) => { markMerge = v; }), { digits: 0 }),
  rg('markinfo', 'admin', 'ⓘ vises bare nærmere enn dette (brettenheter)', MARK.infoNear, 4, 40, 1, () => markInfoNear, kp('tlm.markinfo', (v) => { markInfoNear = v; }), { digits: 0 }),
  rg('markwear', 'admin', 'Grep-markør dempes til kontur etter så mange grep på flaten (0 = aldri)', MARK.wearN, 0, 20, 1, () => markWear, kp('tlm.markwear', (v) => { markWear = v; }), { digits: 0 }),
  rg('markstall', 'admin', 'Dempede markører vises tydelig igjen etter så mange sekunder uten framdrift', MARK.stallMs / 1000, 10, 90, 5, () => markStallS, kp('tlm.markstall', (v) => { markStallS = v; }), { digits: 0 }),
  fl('markcalm', 'admin', 'Ro: bare den viktigste markøren pulserer (av = alle pulserer som før)', true, () => markCalm, kp('tlm.markcalm', (v) => { markCalm = v; })),
  fl('griphi', 'hjelp', 'Fremhev grep (oransje, pulserende)', false, () => gripHi, kp('tlm.griphi', (v) => { gripHi = v; })),
  ...(labels.length ? [fl('labels', 'hjelp', `Brukslapper ved ting${key('L')}`, true, () => labelsOn, kp('tlm.labels', (v) => { labelsOn = v; }))] : []),
  fl('cues', 'hjelp', `Lydtekst: vis tekst for lyder${key('V')}`, false, () => cuesOn, kp('tlm.cues', (v) => { cuesOn = v; })),
  fl('bubbles', 'hjelp', 'Snakkebobler', true, () => bubblesOn, kp('tlm.bubbles', (v) => { bubblesOn = v; })),
  // Lyd og stemme
  rg('vol', 'lyd', 'Hovedvolum', 0.7, 0, 1, 0.05, () => store.get('tlm.vol', 0.7), kp('tlm.vol', (v) => audio?.setVolume(v)), { pct: true }),
  fl('sound', 'lyd', 'Lyd på', true, () => !soundMuted, (v) => { if (v === soundMuted) toggleSound(); }),
  fl('music', 'lyd', 'Musikk (spiller etter første trykk)', true, () => store.get('tlm.music', true), kp('tlm.music', (v) => { music?.setOn(v); logEv('musikk', v ? 'på' : 'av'); })),
  rg('musicvol', 'lyd', 'Musikk: volum', 0.2, 0, 1, 0.05, () => store.get('tlm.musicvol', 0.2), kp('tlm.musicvol', (v) => music?.setVolume(v)), { pct: true }),
  ...(hasTTS ? [
    fl('voice', 'lyd', 'Stemme (figuren snakker)', true, () => voiceOn, kp('tlm.voice', (v) => { voiceOn = v; if (v) { primeVoice(); say('checkpoint', true); } })),
    rg('voicevol', 'lyd', 'Stemmevolum', 0.9, 0.2, 1, 0.1, () => voiceVol, kp('tlm.voicevol', (v) => { voiceVol = v; })),
  ] : []),
  // Lydvalg som er lette å finne (hele lydmikseren med alle lydene ligger bak admin)
  fl('breathsound', 'lyd', 'Pustelyd (pust ved anstrengelse)', false, () => breathSound, kp('tlm.breathsound', (v) => { breathSound = v; audio?.setBreath(v); logEv('pustelyd', v ? 'på' : 'av'); })),
  fl('roomtone', 'lyd', 'Romtone (svak lyd i rommet: kjøleskap, klokke, drypp)', true, () => roomTone, kp('tlm.roomtone', (v) => { roomTone = v; logEv('lyd', 'romtone ' + (v ? 'på' : 'av')); })),
  rg('mix_build', 'lyd', 'Bygging: volum (sette ut, feste, brudd, mål)', 1, 0, 2, 0.05, () => mixGet('bplace'), (v) => mixSet(['bplace', 'battach', 'bknot', 'brod', 'bpop', 'bstart', 'barrive', 'bstars', 'bcreak', 'bbreak', 'bsplash', 'bhop'], v), { pct: true }),
  fl('realsounds', 'admin', 'Bruk ekte lydfiler (sounds/) når de finnes, ellers syntese', true, () => realSounds, kp('tlm.realsounds', (v) => { realSounds = v; logEv('lyd', 'ekte lydfiler ' + (v ? 'på' : 'av')); })),
  rg('mix_breath', 'lyd', 'Pust: volum (0 = av)', 1, 0, 2, 0.05, () => mixGet('breath'), (v) => mixSet(['breath', 'windup'], v), { pct: true }),
  fl('restbreath', 'lyd', 'Rolig pust også når du står stille', false, () => restBreath, kp('tlm.restbreath', (v) => { restBreath = v; })),
  rg('mix_steps', 'lyd', 'Skritt: volum', 1, 0, 2, 0.05, () => mixGet('step'), (v) => mixSet(['step'], v), { pct: true }),
  rg('mix_move', 'lyd', 'Hopp, landing og fallvind: volum', 1, 0, 2, 0.05, () => mixGet('jump'), (v) => mixSet(['jump', 'land', 'fall', 'skid'], v), { pct: true }),
  rg('mix_things', 'lyd', 'Ting (ta, slipp, knus): volum', 1, 0, 2, 0.05, () => mixGet('pickup'), (v) => mixSet(['pickup', 'drop', 'scrape', 'shatter'], v), { pct: true }),
  rg('mix_toys', 'lyd', 'Leker (pip, tut, knirk, boing, tikk): volum', 1, 0, 2, 0.05, () => mixGet('squeak'), (v) => mixSet(['squeak', 'honk', 'creak', 'boing', 'tick'], v), { pct: true }),
  rg('mix_room', 'lyd', 'Romlyd (drypp, vifte): volum', 1, 0, 2, 0.05, () => mixGet('drip'), (v) => mixSet(['drip', 'fan'], v), { pct: true }),
  // Test
  sl('preset', 'styring', 'Styringsstil', DEFAULT_PRESET, Object.entries(PRESETS).map(([k, v]) => [k, v.label]), () => presetName, (v) => { presetName = v; store.set('tlm.preset4', v); applyPreset(v); store.set('tlm.custom4', {}); if (v === 'pubg') setViewMode('shoulder'); else if (v === 'mario') setViewMode('third'); helpLevel = 'normal'; inertia = 1; speedScale = 1; store.set('tlm.helplevel', 'normal'); store.set('tlm.inertia', 1); store.set('tlm.speedscale', 1); reapplyKnobs(); }),
  sl('platform', 'test', `Enhet (sjekket ved start: ${platform.auto === 'mobil' ? 'mobil' : 'PC'})`, 'auto', [['auto', 'Automatisk'], ['mobil', 'Mobil (berøring)'], ['pc', 'PC (mus og tastatur)']], () => platform.pref, (v) => { store.set('tlm.platform', v); setTimeout(() => location.reload(), 150); }),
  fl('qbtn', 'test', 'Vis vurderingsknappen ⚑ på skjermen', true, () => qbtnOn, kp('tlm.qbtn', (v) => { qbtnOn = v; applyUiFlags(); })),
  fl('fps', 'test', 'Vis bilder per sekund (FPS)', false, () => fpsOn, kp('tlm.fps', (v) => { fpsOn = v; applyUiFlags(); })),
  // Admin: hoppinnstillinger og fininnstilling av mekanikker (verdiene lagres som egen «custom»)
  ...[...TUNE, ...ADMIN_TUNE].map(([k, label, min, max, st]) => ({ id: 'p_' + k, group: 'admin', type: 'range', label, min, max, step: st, get def() { return defOf(k); }, get: () => P[k], set: PSET(k), digits: 2 })),
];
applyLayout(SETTINGS);
const visible = (d) => d.group !== 'admin' || adminOn;

function saveCustom() { const o = { autoGrab: P.autoGrab }; for (const [k] of [...TUNE, ...ADMIN_TUNE]) o[k] = P[k]; store.set('tlm.custom4', o); }
function resetAllSettings() {
  presetName = DEFAULT_PRESET; store.set('tlm.preset4', presetName); applyPreset(presetName); store.set('tlm.custom4', {});
  for (const [k] of ADMIN_TUNE) P[k] = P0[k];
  for (const d of SETTINGS) if (d.group !== 'admin' && d.id !== 'preset' && d.id !== 'autograb') d.set(d.def);
  store.set('tlm.mix2', {}); store.set('tlm.reverb', null); SOUND_LIST.forEach((sd) => audio?.setLevel(sd.id, 1)); restBreath = false; store.set('tlm.restbreath', false);
}
const fmtVal = (d, v) => (d.pct ? `${Math.round(v * 100)} %` : typeof v === 'number' ? (+v).toFixed(d.digits ?? (d.step < 0.1 ? 2 : 1)) : v);

// ---------- testrapport ----------
// R87: personvern: PERSONVERN-siden og linja «Sendes til utvikleren» (vises til første sending er gjort)
let privNoteOn = store.get('tlm.privnotes', true);
const priv = createPrivacy({ T, logEv, stats: { get: () => statsOn, set: (v) => { statsOn = v; if (!v) sts.clear(); store.set(STATS.onKey, v); logEv('statistikk', v ? 'på' : 'av'); const c = document.querySelector('[data-s="stats"]'); if (c) c.checked = v; } } });
const syncStatsBtn = () => priv.sync?.();
const syncPrivNotes = () => document.querySelectorAll('.privnote').forEach((n) => { n.style.display = noteWanted(store, privNoteOn) ? '' : 'none'; });
const addPrivNote = (host, from) => { if (host) { priv.note(host, from); syncPrivNotes(); } };
const marks = [];
// rask vurdering mens du spiller: ⚑ → velg tema → 👍 / 😐 / 😫 (havner i testrapporten med posisjon og innstillinger)
{
  let tag = store.get('tlm.qtag', 'Styring'); const pop = $('qpop'), tags = ['Styring', 'Kamera', 'Hopp', 'Gange', 'Annet'];
  const draw = () => { syncPrivNotes(); const qc = $('qcode'); if (qc) qc.style.display = validCode(store.get('tlm.tcode', '')) ? 'none' : 'block'; const cb = pop.querySelector('.qc'); if (cb) { const n = unsent('MARKERT') + unsent('BACKLOGG'); cb.textContent = `📋 Kopier tilbakemeldinger${n ? ` (${n})` : ''}`; } pop.querySelectorAll('[data-tag]').forEach((b) => b.classList.toggle('on', b.dataset.tag === tag)); };
  pop.innerHTML = `<div id="qinbox"></div><input type="text" id="qtext" placeholder="Skriv hva som skjedde" enterkeyhint="send" autocomplete="off"><div class="qa"><button data-mark="1" class="qm">⚑ Meld feil</button><button data-backlog="1" class="qb">💡 Legg til backloggen</button></div><div class="qt">${tags.map((t) => `<button data-tag="${t}">${t}</button>`).join('')}</div><div class="qr"><button data-r="bra">👍 Bra</button><button data-r="ok">😐 OK</button><button data-r="vanskelig">😫 Vanskelig</button></div><small>Tema og vurdering er valgfritt</small><input type="text" id="qcode" placeholder="Tester-kode (én gang)" autocomplete="off" autocapitalize="off" spellcheck="false"><button data-send="1" class="qs">📤 Send til Claude</button><button data-copy="1" class="qc">📋 Kopier tilbakemeldinger</button><div id="qprivhost"></div>`;
  addPrivNote($('qprivhost'), '⚑');
  const qtext = () => { const el = $('qtext'), v = el.value.trim(); el.value = ''; return v; };
  pop.addEventListener('click', (e) => {
    e.stopPropagation(); const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tag) { tag = b.dataset.tag; store.set('tlm.qtag', tag); draw(); return; }
    if (b.dataset.send) { const c = $('qcode'); if (c && c.value.trim()) { store.set('tlm.tcode', cleanCode(c.value)); c.value = ''; } const tx = qtext(); sendToClaude(tx ? `${tag}: ${tx}` : '').then((r) => { if (r === 'ok') pop.classList.add('hide'); draw(); }); return; }
    if (b.dataset.copy) { doShare(true).then((r) => { toast(r === 'kopiert' ? 'Tilbakemeldingene er kopiert. Lim dem inn til Claude' : 'Kunne ikke kopiere: åpne ⚙ → Test → Vis tilbakemeldingene'); if (r === 'kopiert') pop.classList.add('hide'); }); return; }
    if (b.dataset.mark) { markHere(`${tag}: ${qtext()}`.replace(/: $/, '')); pop.classList.add('hide'); return; }
    if (b.dataset.backlog) { const tx = qtext(); if (!tx) { toast('Skriv hva som skal i backloggen først'); $('qtext').focus(); return; } logEv('BACKLOGG', tx); updateMarkBadge(); toast(`Lagt til backloggen (${unsent('BACKLOGG')} ny)`); pop.classList.add('hide'); return; }
    if (b.dataset.r) { const tx = qtext(); logEv('vurdering', `${b.dataset.r} · ${tag}${tx ? ' · ' + tx : ''}`); pop.classList.add('hide'); toast(`Takk! Registrert: ${b.textContent} (${tag})`); }
  });
  pop.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'qtext') { e.preventDefault(); pop.querySelector('[data-mark]').click(); } });
  $('qbtn').addEventListener('click', (e) => { e.stopPropagation(); pop.classList.toggle('hide'); logEv('flagg', `${pop.classList.contains('hide') ? 'lukket' : 'åpnet'} på ${currentScreen().id}`); draw(); if (!pop.classList.contains('hide')) refreshInbox(true); if (!pop.classList.contains('hide')) setTimeout(() => $('qtext').focus(), 30); });
  document.addEventListener('pointerdown', (e) => { if (!pop.classList.contains('hide') && !pop.contains(e.target) && !e.target.closest?.('#qbtn, #pFlag, #topband')) pop.classList.add('hide'); }, true);   // R71: capture, så det også virker over byggeskjermen
}
// R71: hvilken skjerm er oppe (flag_logic.js): styrer den flytende ⚑ og står i rapporten
const hidden = (id) => $(id).classList.contains('hide'), bodyHas = (c) => document.body.classList.contains(c);
const currentScreen = () => screenOf({ panel: !hidden('panel'), building: bld.active, buildSite: bld.siteId, ov: bodyHas('ovview'), story: !hidden('story'), start: !hidden('start'), pick: !!$('start').querySelector('#dfBack'), win: !hidden('win'), intro: !hidden('introsw'), more: !hidden('more') });
verView = createVersionCheck({ version: VERSION, $, logEv, toast, store, getScreen: () => currentScreen().id, getClock: () => clock, isBoss: () => bossFighting(), isCinema: () => CINE.on || bodyHas('cinema'), isTesting: () => bld.active, isOn: () => verCheckOn, getIntervalMin: () => verCheckMin, beforeUpdate: () => saveProgress() });   // R77
let flagScr = '';
function syncFlagScreen() {
  const scr = currentScreen(), on = floatOn(scr.id, { qbtnOn, tbOn: tbandOn, cinema: bodyHas('cinema') });
  document.body.classList.toggle('flagscr', on);
  const key = scr.id + (on ? '+' : '-'); if (key !== flagScr) { flagScr = key; if (scr.id !== 'spill') logEv('flagg', `skjerm ${scr.id}${on ? ': ⚑ øverst til høyre' : ''}`); }
}
setInterval(syncFlagScreen, 250);
const unsent = (type) => evLog.filter((e) => e.type === type && !e.sent).length, markCount = () => unsent('MARKERT');
function updateMarkBadge() { const n = markCount() + unsent('BACKLOGG'), el = $('qcnt'); el.textContent = n; el.style.display = n ? 'flex' : 'none'; const h = $('repHead'); if (h) h.innerHTML = repHeadHtml(); }
function repHeadHtml() { const f = markCount(), b = unsent('BACKLOGG'); return f || b ? `<b>${f} feil meldt${b ? ` · ${b} i backloggen` : ''}</b><br>Send til Claude: <button id="hSend">📤 Send direkte</button> <button id="hShare">Del tilbakemeldinger</button> <button id="hCopy">Kopier tilbakemeldinger</button>` : ''; }
function markHere(text) { logEv('MARKERT', text || ''); marks.push(evLog[evLog.length - 1]); updateMarkBadge(); toast(`Feil meldt (${markCount()} totalt). Husk å sende rapporten etterpå.`); }
function markSent() { for (const e of evLog) if (e.type === 'MARKERT' || e.type === 'BACKLOGG') e.sent = true; updateMarkBadge(); }
const doShare = async (copyOnly) => { const t = reportText(); { const rb = $('reportBox'); if (rb) rb.value = t; } let r; if (copyOnly) { try { await navigator.clipboard.writeText(t); r = 'kopiert'; } catch { r = 'vis'; } } else r = await shareText(t, `tinylittleme v${VERSION} testrapport`); if (r === 'delt' || r === 'kopiert') markSent(); return r; };
// Svar fra Claude og tellere (R36): hentes når spillet starter og når ⚑ åpnes; ⚑ lyser grønt når det er et ulest svar.
let inbox = null, inboxToast = false;
const escH = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function renderInbox() {
  const el = $('qinbox'), btn = $('qbtn'); if (!el || !btn) return;
  const unread = inbox ? inbox.replies.filter((r) => r.fresh).length : 0;
  btn.classList.toggle('hasreply', repliesOn && unread > 0);
  if (!repliesOn || !inbox) { el.style.display = 'none'; el.innerHTML = ''; return; }
  const lines = statsLines(inbox), rs = inbox.replies.slice(0, 3);
  el.style.display = 'block';
  el.innerHTML = lines.map((l) => `<div class="qs1">${escH(l)}</div>`).join('') + rs.map((r) => `<div class="qrep${r.fresh ? ' new' : ''}">✉ ${r.version ? 'v' + escH(r.version) + ': ' : ''}${escH(r.message)}</div>`).join('');
}
async function refreshInbox(opened) {
  const code = store.get('tlm.tcode', '');
  if (!repliesOn || !validCode(code)) { inbox = null; renderInbox(); return; }
  const got = await fetchInbox(code); if (!got) return;
  const seen = new Set((inbox?.replies || []).filter((r) => !r.fresh && r.read).map((r) => r.id));
  got.replies.forEach((r) => { r.fresh = !r.read && !seen.has(r.id); });
  inbox = got; renderInbox();
  const fresh = inbox.replies.filter((r) => r.fresh);
  if (fresh.length && !inboxToast && !opened) { inboxToast = true; bandSay('reply', PRIO.reply, `✉ Svar fra Claude: ${fresh[0].message}`, 9, 'reply'); logEv('svar', `${fresh.length} nytt`); }
  if (fresh.length && opened) { markRead(code, fresh.map((r) => r.id)); fresh.forEach((r) => { r.read = true; }); $('qbtn').classList.remove('hasreply'); }
}
setTimeout(() => refreshInbox(false), 4000);

// «Send til Claude» (v1.27): sender rapporten + teksten direkte til tabellen tlm_feedback (se feedback_send.js, docs/TILBAKEMELDING.md).
let sending = false, sendState = '';
async function sendToClaude(body) {
  if (sending) return 'opptatt';
  const code = store.get('tlm.tcode', '');
  if (!validCode(code)) { toast('Skriv tester-koden din først (feltet i ⚑-boksen, eller ⚙ → Test)'); return 'kode'; }
  const built = buildPayload({ code, version: VERSION, level: levelLabel, kind: 'rapport', body, report: reportText(), ua: shortDevice(navigator.userAgent) });
  if (built.error) { toast(REASON_TEXT[built.error] || REASON_TEXT.feil); return built.error; }
  sending = true; sendState = T('tb.sending'); bandSay('send', PRIO.reply, T('tb.sending'), 0, 'reply');
  const res = await sendFeedback(built.row);
  sending = false; tb.clear('send');
  if (res.ok) { markSent(); if (!store.get(NOTE_KEY, false)) { store.set(NOTE_KEY, true); syncPrivNotes(); } logEv('sendt', `til Claude (${built.row.report.length} tegn)`); sendState = T('tb.sent'); bandSay('send', PRIO.reply, 'Sendt! Takk, Claude ser den.', 5, 'reply'); refreshInbox(true); return 'ok'; }
  logEv('sendfeil', `${res.reason} ${res.status ?? ''}`);
  sendState = REASON_TEXT[res.reason] || REASON_TEXT.feil; bandSay('send', PRIO.reply, sendState, 6, 'reply'); return res.reason;
}
$('panel').addEventListener('click', (e) => { if (e.target.id === 'hSend') sendToClaude(''); if (e.target.id === 'hShare') doShare(false).then((r) => toast(r === 'delt' ? 'Delt' : r === 'kopiert' ? 'Tilbakemeldingene er kopiert' : r === 'vis' ? 'Åpne ⚙ → Test → Vis rapporten og kopier' : 'Avbrutt')); if (e.target.id === 'hCopy') doShare(true).then((r) => toast(r === 'kopiert' ? 'Rapporten er kopiert. Lim inn til Claude' : 'Kunne ikke kopiere: åpne ⚙ → Test → Vis rapporten')); });
updateMarkBadge();
function buildReportInfo() {
  const t = nextTarget();
  return {
    version: VERSION, level: levelLabel, difficulty: `${difficulty}${isCustomHelp(store) ? ' (egendefinert hjelp)' : ''} · hjelp av: ${offElements(difficulty).join(', ') || 'ingen'} · merker ${badgeLine() || 'ingen'}`, when: new Date().toLocaleString('nb-NO'), device: shortDevice(navigator.userAgent),
    verCheck: verView ? verView.info() : '',
    buildCode: (() => { try { const c = bld.exportText?.(); return c && c.length <= 1500 ? c : ''; } catch (e) { return ''; } })(),   // R103: byggekoden følger rapporten når byggeskjermen er oppe, så bygget kan gjenskapes
    where: currentScreen().label, screen: `${innerWidth}×${innerHeight} @${devicePixelRatio}x`, touch: TOUCH, platform: `${TOUCH ? 'mobil' : 'PC'} (${platform.pref === 'auto' ? 'automatisk' : 'valgt'}; berøring ${platform.coarse ? 'hovedpeker' : 'nei'}, mus ${platform.fine ? 'ja' : 'nei'}, berøringspunkter ${platform.touchPoints})`, preset: PRESETS[presetName].label, clock: Math.round(clock), points: points(),
    perf: perfLine + ' · shadere ' + shw.line(),
    fps: (perf.n ? `${levelId}: ${(1000 * perf.n / perf.sum).toFixed(0)} fps snitt, verste bilde ${Math.round(perf.worst)} ms, oppløsning ${renderer.getPixelRatio().toFixed(2)}×` : 'fps ukjent') + fpsRoomsLine(),   // R85: snitt per rom (lagret i nettleseren) så rapporten viser hvilke rom som er trege
    pos: [player.x, player.y, player.z].map((v) => +v.toFixed(1)), state: player.state, target: t.final ? 'målet' : t.label, stats: { ...stats },
    changed: changedSettings(SETTINGS.filter((d) => d.group !== 'admin' || true).map((d) => ({ id: d.id, label: d.label, def: d.def, get: d.get }))),
    marks: evLog.filter((e) => e.type === 'MARKERT' && !e.sent).slice(-10), backlog: evLog.filter((e) => e.type === 'BACKLOGG' && !e.sent).slice(-10), events: evLog.slice(-30),
    ratings: evLog.filter((e) => e.type === 'vurdering').slice(-12),
    camera: camLine({ fov: effectiveFov(fovManual ? fovSet : null, fovAutoCur), auto: !fovManual, aspect: innerWidth / innerHeight, follow: autoCam, strength: followStrength }),
    metrics: (() => { const mn = Math.max(metrics.t / 60, 0.05); return `sveip ${metrics.swipes} (${(metrics.swipes / mn).toFixed(1)}/min), dratt ${Math.round(metrics.dragPx)} px, kamera dreid av deg ${metrics.yawUser.toFixed(1)} rad og automatisk ${metrics.yawAuto.toFixed(1)} rad, stikke i bruk ${Math.round(100 * metrics.stickT / Math.max(metrics.t, 0.1))} % av ${mn.toFixed(1)} min`; })(),
  };
}
const reportText = () => formatReport(buildReportInfo());
async function shareText(text, title) {
  try { if (navigator.share) { await navigator.share({ title, text }); return 'delt'; } } catch (e) { if (e?.name === 'AbortError') return 'avbrutt'; }
  try { await navigator.clipboard.writeText(text); return 'kopiert'; } catch { return 'vis'; }
}

function buildPanel() {
  const p = $('panel'), open = store.get('tlm.panelopen', { spill: true });
  const nChanged = changedSettings(SETTINGS.filter(visible)).length;
  const row0 = (d) => {
    if (d.type === 'bool') return `<label class="chk"><input type="checkbox" data-s="${d.id}"> ${d.label}</label>`;
    if (d.type === 'range') return `<label>${d.label}<span data-v="${d.id}"></span></label><input type="range" data-s="${d.id}" min="${d.min}" max="${d.max}" step="${d.step}">`;
    return `<label>${d.label}</label><select data-s="${d.id}">${d.options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`;
  };
  const row = (d) => `<div class="srow" data-q="${(d.label + ' ' + d.id).toLowerCase().replace(/"/g, '')}">${row0(d)}</div>`;   // innpakket så søket kan skjule enkeltrader
  const groupHtml = (g, title) => {
    const items = SETTINGS.filter((d) => d.group === g && visible(d));
    let extra = '';
    if (g === 'spill') extra = `<label>Brett</label><select id="levelSel">${LEVELS.map((l) => `<option value="${l.id}">${l.label}${store.get('tlm.cleared', {})[l.id] ? ' ✓' : ''}</option>`).join('')}</select><div class="row"><button id="pRestart">Start på nytt</button><button id="pMenu">${dft(lang, 'df.menu')}</button></div><small id="saveNote"></small><div class="row"><button id="bSaveCopy">${sv(lang, 'sv.copy')}</button><button id="bSavePaste">${sv(lang, 'sv.paste')}</button></div>`;
    if (g === 'test') extra = `
      <label>Noe galt her? (valgfri tekst)</label><input type="text" id="markText" placeholder="f.eks. «kom ikke opp på hylla»">
      <div class="row"><button id="bMark">⚑ Marker her</button></div>
      <label>Tester-kode (får du av Rune)</label><input type="text" id="testerCode" placeholder="tlm-…" autocomplete="off" autocapitalize="off" spellcheck="false">
      <div class="row"><button id="bSend">📤 Send til Claude</button></div><div id="privHost"></div>
      <div class="row"><button id="bReport">Del tilbakemeldinger</button><button id="bCopyRep">Kopier tilbakemeldinger</button></div>
      <details><summary>Vis tilbakemeldingene (rapporten)</summary><textarea id="reportBox" readonly rows="9"></textarea></details>
      <small>Bare innstillingene (ikke tilbakemeldinger):</small><div class="row"><button id="bExport">Kopier innstillinger</button><button id="bImport">Lim inn innstillinger</button></div>
      <div class="row"><button id="bResetAll">Alt til standard</button></div>
      <small>Rapporten har versjon, enhet, endrede innstillinger, markeringer og siste hendelser. Send den som melding.</small>`;
    if (g === 'lyd') extra = `<div class="row"><button id="bHearBreath">Hør pust</button><button id="bHearStep">Hør skritt</button><button id="bHearJump">Hør hopp</button></div><small id="voiceNote"></small>`;
    if (g === 'admin') extra = `<div class="row"><button id="bWipeAll">${sv(lang, 'sv.allBtn')}</button></div><div class="row"><button id="pPlan">Plan</button><button id="pFly">Fly (ugyldig resultat)</button></div>
      <details><summary>Lydmikser: volum for hver lyd (0 = av, ▶ spiller den)</summary><label>Etterklang (rom) <span id="v_rev"></span></label><input type="range" id="s_rev" min="0" max="0.8" step="0.02">${mixerHtml()}
        <div class="row"><button id="mixAll100">Alle 100 %</button><button id="mixAllOff">Alle av</button><button id="mixReset">Nullstill lyd</button></div></details>
      ${helperCount ? `<label class="chk"><input type="checkbox" id="chkHelpers"> Merk ${helperCount} hjelpeobjekter (lagt inn av brettlageren)</label><small>${(LEVEL.report?.helpers || []).map((h) => `${h.id}: ${h.size_cm.join('×')} cm, topp ${h.top_cm} cm ved (${h.at_cm.join(', ')})`).join('<br>')}</small>` : ''}
      <small><b>Prince:</b> vekt og treghet: du bygger opp fart, snur ikke på stedet, hopp har forberedelse, landing etter fall tar tid og å hive seg opp tar tid. ${TOUCH ? 'Skyv stikken forsiktig for å gå forsiktig.' : 'Hold C for å gå forsiktig.'}<br><b>Klassisk:</b> raskt, dobbelthopp, kanten grips av seg selv.<br><b>Spenning:</b> tyngre og tregere hopp, ingen dobbelthopp. Du må trykke ${GREP}${key('Shift/E')} i riktig øyeblikk for å gripe kant eller tau.</small>
      <div class="row"><button id="lockAdmin">Lås admin</button></div>`;
    const n = changedSettings(items).length;
    return `<details data-g="${g}" ${open[g] ? 'open' : ''}${g === 'admin' ? ' class="adm"' : ''}><summary>${title}${n ? ` <em>${n} endret</em>` : ''}</summary>${items.filter((d) => !d.sub).map(row).join('')}${[...new Set(items.filter((d) => d.sub).map((d) => d.sub))].map((sb) => { const si = items.filter((d) => d.sub === sb), sn = changedSettings(si).length; return `<details class="sub" data-sub="${g}:${sb}"><summary>${sb}${sn ? ` <em>${sn} endret</em>` : ''}</summary>${si.map(row).join('')}</details>`; }).join('')}${extra}</details>`;
  };
  p.innerHTML = `<div class="phead"><button id="pCloseTop" class="pclose" aria-label="Lukk">✕ Lukk</button><button id="pFlag" aria-label="Meld og vurder">⚑</button><h3 id="pTitle">Innstillinger</h3><span class="pver">v${VERSION}${adminOn ? ' · ADMIN' : ''}</span></div>
    <div id="repHead" class="rhead">${repHeadHtml()}</div>
    <div class="row"><button id="bVerCheck"></button><button id="bPriv">${T('priv.btn')}</button></div><small id="verNote"></small>
    <input type="search" id="pSearch" placeholder="Søk i innstillinger" autocomplete="off" enterkeyhint="search">
    ${nChanged ? `<div class="pchg">${nChanged} innstilling${nChanged > 1 ? 'er' : ''} endret fra standard</div>` : ''}
    ${GROUPS.filter(([g]) => g !== 'admin' || adminOn).map(([g, t]) => groupHtml(g, t)).join('')}
    <div class="row"><button id="closePanel">Lukk</button></div>`;

  // koble hver rad til registeret
  const refresh = (d) => { const v = d.get(), el = p.querySelector(`[data-s="${d.id}"]`); if (!el) return; if (d.type === 'bool') el.checked = !!v; else el.value = v; const lab = p.querySelector(`[data-v="${d.id}"]`); if (lab) lab.textContent = fmtVal(d, v); };
  for (const d of SETTINGS.filter(visible)) {
    const el = p.querySelector(`[data-s="${d.id}"]`); if (!el) continue;
    refresh(d);
    el.oninput = el.onchange = (e) => {
      const v = d.type === 'bool' ? e.target.checked : d.type === 'range' ? +e.target.value : e.target.value;
      d.set(v); refresh(d); logEv('innstilling', `${d.id}=${v}`);
      if (d.id === 'preset') buildPanel();
    };
  }
  const subOpen = store.get('tlm.subopen', {});
  p.querySelectorAll('details[data-g]').forEach((el) => el.addEventListener('toggle', () => { if (el._prog) { el._prog = false; return; } open[el.dataset.g] = el.open; store.set('tlm.panelopen', open); }));
  p.querySelectorAll('details[data-sub]').forEach((el) => { el.open = !!subOpen[el.dataset.sub]; el.addEventListener('toggle', () => { if (el._prog) { el._prog = false; return; } subOpen[el.dataset.sub] = el.open; store.set('tlm.subopen', subOpen); }); });
  // søk: skjuler rader som ikke treffer og åpner gruppene som har treff; tomt søk gjenoppretter det du hadde åpent
  const setOpen = (el, v) => { if (el.open !== v) { el._prog = true; el.open = v; } };
  $('pSearch').oninput = (e) => {
    const q = e.target.value.trim().toLowerCase();
    p.querySelectorAll('.srow').forEach((r) => { r.style.display = !q || r.dataset.q.includes(q) ? '' : 'none'; });
    p.querySelectorAll('details[data-sub]').forEach((el) => { const hit = !q || [...el.querySelectorAll('.srow')].some((r) => r.style.display !== 'none'); el.style.display = hit ? '' : 'none'; setOpen(el, q ? hit : !!subOpen[el.dataset.sub]); });
    p.querySelectorAll('details[data-g]').forEach((el) => { const hit = !q || [...el.querySelectorAll('.srow')].some((r) => r.style.display !== 'none'); el.style.display = hit ? '' : 'none'; setOpen(el, q ? hit : !!open[el.dataset.g]); });
  };
  $('levelSel').value = levelId; $('levelSel').onchange = (e) => { store.set('tlm.level', e.target.value); location.search = `?level=${e.target.value}`; };
  confirmed($('pRestart'), 'Start på nytt', 0, () => { restartAll(); $('panel').classList.add('hide'); toast('Startet på nytt'); });
  $('pMenu').onclick = () => quitToMenu('⚙');
  $('closePanel').onclick = () => $('panel').classList.add('hide');
  $('pCloseTop').onclick = () => $('panel').classList.add('hide');
  verView?.bindPanel($('bVerCheck'), $('verNote'));   // R77
  $('pFlag').onclick = (e) => { e.stopPropagation(); $('qbtn').click(); };   // R71: ⚑ i panelhodet åpner samme boks
  // admin skjules bak 7 trykk på tittelen (eller ?admin=1)
  let taps = 0, tapT = 0;
  $('pTitle').onclick = () => { const n = performance.now(); taps = n - tapT < 900 ? taps + 1 : 1; tapT = n; if (taps >= 7) { taps = 0; adminOn = !adminOn; store.set('tlm.admin', adminOn); toast(adminOn ? 'Admin på' : 'Admin av'); buildPanel(); } };
  if ($('lockAdmin')) $('lockAdmin').onclick = () => { adminOn = false; store.set('tlm.admin', false); buildPanel(); toast('Admin låst'); };
  // test
  $('bPriv').onclick = () => priv.open('⚙'); addPrivNote($('privHost'), '⚙');   // R87
  $('testerCode').value = store.get('tlm.tcode', '');
  $('testerCode').onchange = () => { const v = cleanCode($('testerCode').value); store.set('tlm.tcode', v); if (v && !validCode(v)) toast('Koden ser feil ut (4–24 tegn: bokstaver, tall, - og _)'); };
  $('bSend').onclick = () => { $('testerCode').onchange(); const tx = $('markText').value.trim(); sendToClaude(tx).then((r) => { if (r === 'ok') { $('markText').value = ''; $('reportBox').value = reportText(); } }); };
  $('bMark').onclick = () => { markHere($('markText').value.trim()); $('markText').value = ''; $('reportBox').value = reportText(); };
  $('bCopyRep').onclick = () => doShare(true).then((r) => { toast(r === 'kopiert' ? 'Tilbakemeldingene er kopiert. Lim dem inn til Claude' : 'Kunne ikke kopiere: åpne «Vis tilbakemeldingene» og kopier teksten'); if (r === 'vis') $('reportBox').closest('details').open = true; });
  $('bReport').onclick = async () => { const r = await doShare(false); toast(r === 'vis' ? 'Kunne ikke dele: åpne «Vis rapporten» og kopier teksten' : r === 'kopiert' ? 'Tilbakemeldingene er kopiert' : r === 'delt' ? 'Delt' : 'Avbrutt'); if (r === 'vis') $('reportBox').closest('details').open = true; };
  $('reportBox').closest('details').addEventListener('toggle', () => { $('reportBox').value = reportText(); });
  $('bExport').onclick = async () => { const t = exportSettings(SETTINGS.filter((d) => d.group !== 'admin' || adminOn).map((d) => ({ id: d.id, get: d.get })), { v: VERSION }); const r = await shareText(t, 'tinylittleme innstillinger'); toast(r === 'vis' ? 'Kunne ikke kopiere' : 'Innstillingene er kopiert'); };
  $('bImport').onclick = async () => {
    let text = ''; try { text = await navigator.clipboard.readText(); } catch { text = prompt('Lim inn innstillinger her:') || ''; }
    if (!text) return;
    const r = parseSettings(text, SETTINGS.filter((d) => d.group !== 'admin' || adminOn).map((d) => ({ id: d.id, type: d.type, min: d.min, max: d.max, options: d.options })));
    if (r.error) return toast(r.error);
    for (const [k, v] of Object.entries(r.values)) SETTINGS.find((d) => d.id === k)?.set(v);
    logEv('importerte innstillinger', `${Object.keys(r.values).length} verdier`); buildPanel(); toast(`${Object.keys(r.values).length} innstillinger importert`);
  };
  { // R86: lagringsstatus, KOPIER/LIM INN FREMGANG (⚙ → Spill) og NULLSTILL ALT (⚙ → Admin)
    const sm = savedSummary(store, disk); if ($('saveNote')) $('saveNote').textContent = (disk.status().failures || !disk.status().available ? '⚠ ' + sv(lang, 'sv.fail') : '✓ ' + sv(lang, 'sv.saved') + ': ' + sv(lang, 'sv.status', sm)) + ' ' + sv(lang, 'sv.note');
    if ($('bSaveCopy')) $('bSaveCopy').onclick = async () => { saveProgress(); const r = await shareText(exportProgress(store, disk, { version: VERSION }), 'tinylittleme fremgang'); logEv('lagring', `eksport: ${r}`); toast(r === 'vis' ? sv(lang, 'sv.copyFail') : sv(lang, 'sv.copied')); };
    if ($('bSavePaste')) $('bSavePaste').onclick = async () => {
      let text = ''; try { text = await navigator.clipboard.readText(); } catch { text = prompt(sv(lang, 'sv.pastePrompt')) || ''; }
      if (!text) return;
      const r = parseProgress(text); if (r.error) { logEv('lagring', `import avvist: ${r.error}`); return toast(sv(lang, 'sv.err.' + r.error)); }
      if (!confirm(sv(lang, 'sv.pasteAsk', { boards: r.boards, cleared: r.cleared }))) return logEv('lagring', 'import avbrutt');
      const n = applyImport(store, r); logEv('lagring', `import: ${n} av ${Object.keys(r.data).length} nøkler${r.skipped.length ? ', hoppet over ' + r.skipped.length : ''}`);
      toast(sv(lang, 'sv.pasteDone', { n })); noSave = true; setTimeout(() => location.reload(), 900);   // noSave: pagehide skal ikke skrive gammel fremgang oppå
    };
    if ($('bWipeAll')) $('bWipeAll').onclick = () => { $('panel').classList.add('hide'); $('start').classList.remove('hide'); document.body.classList.add('instart'); menuOpen = true; svView.confirmWipe({ kind: 'all', plan: wipePlan('all', disk.keys('tlm.'), store), onCancel: showStart, onOk: () => { logEv('lagring', 'nullstill alt'); noSave = true; const n = wipe('all', disk); toast(sv(lang, 'sv.allDone') + ` (${n})`); setTimeout(() => { location.href = location.pathname + '?start=1'; }, 700); } }); };
  }
  confirmed($('bResetAll'), 'Alt til standard', 0, () => { resetAllSettings(); logEv('alt til standard'); buildPanel(); applyUiFlags(); toast('Alt er satt til standard'); });
  // lyd
  for (const [id, snd] of [['bHearBreath', 'breath'], ['bHearStep', 'step:wood'], ['bHearJump', 'jump']]) $(id).onclick = () => { unlockAudio(); Promise.resolve(audio?.resume()).then(() => audio?.preview(snd)); };
  if ($('voiceNote')) $('voiceNote').textContent = hasTTS ? (ttsVoice ? `Stemme: ${ttsVoice.name} (${ttsVoice.lang}). Lyden kommer fra telefonen.` : 'Fant ingen norsk stemme på denne enheten: da vises bare snakkebobler.') : '';
  // admin
  if (adminOn) {
    $('pPlan').onclick = () => { setMode('plan'); $('panel').classList.add('hide'); }; $('pFly').onclick = () => { setMode('fly'); $('panel').classList.add('hide'); };
    wireMixer();
    if ($('chkHelpers')) { $('chkHelpers').checked = helperMarks.visible; $('chkHelpers').onchange = (e) => { helperMarks.visible = e.target.checked; }; }
  }
}
$('bSet').onclick = () => { buildPanel(); $('help').classList.add('hide'); $('panel').classList.toggle('hide'); };
applyUiFlags();
if (keyHelpOn && !TOUCH) { $('help').classList.remove('hide'); setTimeout(() => $('help').classList.add('hide'), 15000); }   // valgfritt ved start; H henter den fram når som helst

// ---------- oppdatering ----------
const V = new THREE.Vector3();
function axes() {
  // dødsone på stikken: en tommel som bare hviler der skal ikke gi bevegelse (ga skjelvende armer og mikroskritt)
  const mag = Math.hypot(touch.x, touch.y), DZ = stickDead, tk = mag < DZ ? 0 : Math.pow((mag - DZ) / (1 - DZ), stickCurve) / mag;   // myk kurve: finere kontroll nær midten
  const arrowsLook = P.faceCam && mode === 'play';                    // PUBG: piltastene ser deg rundt, WASD går
  const ix = (held('KeyD', ...(arrowsLook ? [] : ['ArrowRight'])) ? 1 : 0) - (held('KeyA', ...(arrowsLook ? [] : ['ArrowLeft'])) ? 1 : 0) + touch.x * tk;
  const iz = (held('KeyW', ...(arrowsLook ? [] : ['ArrowUp'])) ? 1 : 0) - (held('KeyS', ...(arrowsLook ? [] : ['ArrowDown'])) ? 1 : 0) + touch.y * tk;
  return [Math.max(-1, Math.min(1, ix)), Math.max(-1, Math.min(1, iz))];
}
const upKey = () => held('Space') || touch.jump;
const downKey = () => held('KeyC', 'ControlLeft', 'ControlRight') || touch.grab;
const boost = () => held('ShiftLeft', 'ShiftRight');

// maur: hopp på ryggen = knus og sprett; ellers støt tilbake (v0.77)
// R19: pillbug (roller) og tråd-edderkopp (dangler): varsel, støt, knus. Alle hendelser logges som «fiende».
function creatureEvent(ev) {
  const J = TOUCH ? T('btn.jump') : 'Mellomrom', roller = ev.kind === 'roller', seen = (k, msg) => { if (!store.get('tlm.seen.' + k, false)) { store.set('tlm.seen.' + k, true); tip(msg); } };
  logEv('fiende', `${ev.kind} ${ev.type} ${ev.id}`);
  if (ev.type === 'alert') { audio?.spiderhiss(); buzz(15); if (roller) seen('roller', `En pillbug! Den ruller seg sammen og ruller rett mot deg: stikk til siden, eller hopp på den (${J})`); else seen('dangler', `Edderkopp i tråd! Den rister før den stuper: løp forbi mens den er oppe, eller hopp på den (${J}) når den henger lavt`); }
  else if (ev.type === 'roll' || ev.type === 'plunge') { audio?.spiderleap(); buzz(25); }
  else if (ev.type === 'stomp') { react.trigger('stomp'); stats.squashed++; audio?.squash(); music?.duck(0.45, 0.8); buzz(25); setMood('happy', 1.4); cue('knust!'); spawnShards([ev.x, ev.y, ev.z], roller ? ROLLER_COL : DANGLER_COL); }
  else if (ev.type === 'hurt') { react.trigger('hurt'); stats.hits++; audio?.anthit(); music?.duck(0.4, 0.9); buzz(70); setMood('hurt', 0.9); toast(`Au! ${roller ? 'Pillbuggen rullet over deg' : 'Edderkoppen falt ned på deg'}  −${SCORE.antHit} poeng. Hopp på den (${J}) for å knuse den`); }
}
// R61: veps som flyr: varsel (summing + rød glød + ring på flata), stup, krasj, knus og støt. Alt logges som «fiende».
function waspEvent(ev) {
  const J = TOUCH ? T('btn.jump') : 'Mellomrom';
  logEv('fiende', `veps ${ev.type} ${ev.id}`);
  if (ev.type === 'alert') { audio?.waspbuzz(); buzz(15); cue('summing!'); if (!store.get('tlm.seen.wasp', false)) { store.set('tlm.seen.wasp', true); tip(`En veps! Den lyser rødt før den stuper: gjem deg under en ting, stikk til siden, eller hopp på den (${J}) når den stuper`); } }
  else if (ev.type === 'dive') { audio?.waspdive(); buzz(25); cue('vepsen stuper!'); }
  else if (ev.type === 'crash') { audio?.bossbump(); cue('vepsen smalt i noe'); }
  else if (ev.type === 'stomp') { react.trigger('stomp'); stats.squashed++; audio?.squash(); music?.duck(0.45, 0.8); buzz(25); setMood('happy', 1.4); cue('knust!'); spawnShards([ev.x, ev.y, ev.z], WASP_COL); }
  else if (ev.type === 'hurt') { react.trigger('hurt'); stats.hits++; audio?.anthit(); music?.duck(0.4, 0.9); buzz(70); setMood('hurt', 0.9); toast(`Au! Vepsen stupte på deg  −${SCORE.antHit} poeng. Gjem deg under en ting, eller hopp på den (${J}) når den stuper`); }
}
function antEvent(ev) {
  if (ev.id && isSoldier(LEVEL.ants?.find((a) => a.id === ev.id))) {            // R31: tinnsoldaten (egen fiende i nivå 7): egne meldinger og logg, ellers som en maur
    logEv(ev.type === 'stomp' ? 'tinnsoldat knust' : ev.type === 'hurt' ? 'tinnsoldat støt' : 'tinnsoldat ' + ev.type, ev.id);
    if (ev.type === 'alert' && !store.get('tlm.seen.soldier', false)) { store.set('tlm.seen.soldier', true); toast(T('leke.soldier', { jump: TOUCH ? T('btn.jump') : 'Mellomrom' })); }
    ev = { ...ev, kind: 'ant', soldier: true };
  }
  if (ev.kind === 'wasp') { waspEvent(ev); return; }                                           // R61 (wasp.js)
  if (ev.kind === 'roller' || ev.kind === 'dangler') { creatureEvent(ev); return; }          // R19 (creatures.js)
  if (ev.type === 'alert' && ev.kind === 'spider') { if (!store.get('tlm.seen.spider', false)) { store.set('tlm.seen.spider', true); toast(`En edderkopp-vakt! Den dukker og hopper: rygg unna, eller hopp på ryggen (${TOUCH ? T('btn.jump') : 'Mellomrom'}) for å knuse den`); } audio?.spiderhiss(); }
  else if (ev.type === 'alert' && !store.get('tlm.seen.ant', false)) { store.set('tlm.seen.ant', true); toast(`En maur! Unngå den, eller hopp på ryggen (${TOUCH ? T('btn.jump') : 'Mellomrom'}) for å knuse den`); }
  if (ev.type === 'leap') { logEv('edderkopp hopper', ev.id); audio?.spiderleap(); }
  else if (ev.type === 'drop') { logEv('smule sluppet', ev.id); if (!store.get('tlm.seen.crumb', false)) { store.set('tlm.seen.crumb', true); toast('Bæreren slapp smula! Gå bort til den for å ta den'); } }
  else if (ev.type === 'crumb') { stats.carried++; logEv('bærer-smule tatt', ev.id); audio?.crumb(5, 99); buzz(20); setMood('happy', 1); cue('smule!'); toast(`Smule tatt  +${SCORE.carried} poeng`); }
  if (ev.type === 'stomp') { react.trigger('stomp'); stats.squashed++; logEv(ev.kind === 'spider' ? 'edderkopp knust' : 'maur knust', ev.id); audio?.squash(); music?.duck(0.45, 0.8); buzz(25); setMood('happy', 1.4); cue('knust!'); spawnShards([ev.x, ev.y, ev.z], ev.kind === 'spider' ? 0x6a3a86 : ev.kind === 'carrier' ? 0x5f6b2a : 0x9a3a1e); }
  else if (ev.type === 'hurt') { react.trigger('hurt'); stats.hits++; logEv(ev.kind === 'spider' ? 'edderkopp støt' : 'maur støt', ev.id); audio?.anthit(); music?.duck(0.4, 0.9); buzz(70); setMood('hurt', 0.9); toast(`Au! ${ev.kind === 'spider' ? 'Edderkoppen hoppet på deg' : 'En maur støtet deg'}  −${SCORE.antHit} poeng. Hopp på ryggen for å knuse den`); }
}
// første gang du står på flata der gåten ligger: én kort forklaring (bruker knappenavn)
function puzzleIntro() {
  if (store.get('tlm.seen.puzzle', false) || !puzzleTotal(LEVEL)) return;
  const pt = puzzleTarget(LEVEL, player); if (!pt || !player.onGround) return;
  store.set('tlm.seen.puzzle', true); toast(T('puz.intro', { take: TOUCH ? T('btn.take') : 'F', drop: TOUCH ? T('btn.drop') : 'F' }));
}
// gåter (R7): nøkkelen legges på platen og broen ruller ut. Rolige tilbakemeldinger: lyd, melding, logg
function puzzleEvent(ev) {
  if (ev.type === 'placed') { logEv('gåte: nøkkel på plata', ev.id); audio?.pickup(); buzz(15); }
  else if (ev.type === 'open') { logEv('gåte: åpnet', ev.id); audio?.crumb(9, 10); buzz(25); setMood('happy', 1); cue('klikk!'); toast(T('puz.bridge'));
    const p = LEVEL.puzzleList.find((q) => q.id === ev.id);
    if (p) { bridgeGuide = { ...p, until: performance.now() + 90000 }; if (puzCamOn) { const m = bridgeMid(p); turnCamera(Math.atan2(player.x - m.x, player.z - m.z), 0.5); setTimeout(() => { if (mode === 'play' && !won) camBehind(); }, 3600); } } }
  else if (ev.type === 'done') logEv('gåte: broen ute', ev.id);
}
// gåteverktøy (R60): plate, bryter, dør og vindebro. Lesbart uten tekst (plata synker og lyser, døra viser rødt/grønt), pluss lyd, lydtekst og logg
const gateName = (o) => (lang === 'en' && o?.en) || o?.label || o?.id || '';
// glatte flater (R63): oljeflekken og det oljede verktøykasse-lokket; logges og gir ett hint første gang
const slickTrack = LEVEL.boxes.some((b) => b.slick && b.type !== 'wall') ? createSlickTracker() : null;
function slickEvent(ev) {
  if (ev.type === 'glir') {
    logEv('glatt', `glir på ${ev.id} (${ev.speed} enh/s)`); cue('sklir'); if (!store.get('tlm.seen.slick', false) && slickHintOn) { store.set('tlm.seen.slick', true); tip(T('slick.hint', { grab: TOUCH ? T('btn.grab') : 'Shift', jump: TOUCH ? T('btn.jump') : 'Mellomrom' })); }
  } else if (ev.type === 'grep') logEv('glatt', `fast grunn igjen etter ${ev.id}`);
}
function gateEvent(ev) {
  if (!ev) return;
  if (ev.type === 'plate') { logEv('gåte', `plate ${ev.id} ${ev.on ? 'ned' : 'opp'} (last ${ev.load})`); audio?.pickup(); buzz(ev.on ? 20 : 8); cue(ev.on ? 'klikk!' : 'klikk'); }
  else if (ev.type === 'switch') { logEv('gåte', `bryter ${ev.id} ${ev.on ? 'på' : 'av'}`); audio?.pickup(); audio?.drop('metal'); buzz(25); cue('klikk!'); toast(T(ev.on ? 'gate.switchOn' : 'gate.switchOff')); }
  else if (ev.type === 'door') { const d = doorById(LEVEL, ev.id); logEv('gåte', `${d?.kind === 'bridge' ? 'bro' : 'dør'} ${ev.id} ${ev.open ? 'åpnes' : 'lukkes'}`); audio?.creak(1); cue(ev.open ? 'rumler' : 'rumler igjen'); buzz(15);
    if (ev.open) { toast(T(d?.kind === 'bridge' ? 'gate.bridgeOpen' : 'gate.doorOpen', { name: gateName(d) })); setMood('happy', 1);
      if (gateCamOn && d && !(d.kind !== 'bridge' && Math.hypot(player.x - (d.min[0] + d.max[0]) / 2, player.z - (d.min[2] + d.max[2]) / 2) < 8)) { const mx = (d.min[0] + d.max[0]) / 2, mz = (d.min[2] + d.max[2]) / 2; turnCamera(Math.atan2(player.x - mx, player.z - mz), 0.5); setTimeout(() => { if (mode === 'play' && !won) camBehind(); }, 3000); } }
    else toast(T('gate.doorClose', { name: gateName(d) })); }
  else if (ev.type === 'doorDone') logEv('gåte', `${ev.id} ${ev.open ? 'helt åpen' : 'helt lukket'}`);
  else if (ev.type === 'latch') { logEv('gåte', `${ev.id} blir stående åpen`); audio?.crumb(9, 10); cue('klikk! låst opp'); }
  else if (ev.type === 'blocked') { logEv('gåte', `${ev.id} kan ikke lukkes: noe står i veien`); toast(T('gate.blocked')); }
}
function stueTick() {                                     // R62: hint i Stuen, ett om gangen og bare en gang hver
  if (!stueHintOn || !isStue(LEVEL) || $('toast').classList.contains('show')) return;
  const k = stueHint(LEVEL, player, stueSeen, !!LEVEL.goalFlags?.has('stue1')); if (!k) return;
  stueSeen.add(k); logEv('stue', `hint ${k}`); toast(T(k, { take: TOUCH ? T('btn.take') : 'F' }));
}
function gateIntro() {
  if (store.get('tlm.seen.gates', false)) return;
  const near = (LEVEL.gateS.plates.some((q) => Math.hypot((q.x0 + q.x1) / 2 - player.x, (q.z0 + q.z1) / 2 - player.z) < 12) || nearSwitch(LEVEL, player, 6)) && player.onGround;
  if (!near) return;
  store.set('tlm.seen.gates', true); toast(T('gate.intro', { take: TOUCH ? T('btn.take') : 'F', drop: TOUCH ? T('btn.drop') : 'F' }));
}
// sjef-maur (R9): varsel, støt i veggen, skade, seier og premie
function bossEvent(ev) {
  const seen = (k, msg) => { if (!store.get('tlm.seen.' + k, false)) { store.set('tlm.seen.' + k, true); tip(msg); } };
  const J = TOUCH ? T('btn.jump') : 'Mellomrom';
  if (ev.type === 'alert') { logEv('sjef varsler', ev.id); audio?.bossroar(false); music?.duck(0.5, 1); buzz(30); seen('boss', 'Sjef-maur! Den varsler, så stormer den rett fram. Stikk til siden. Smeller den i veggen, eller blir sliten, er den svimmel: hopp på ryggen'); }
  else if (ev.type === 'charge') { logEv('sjef stormer', ev.id); audio?.bossroar(true); buzz(40); }
  else if (ev.type === 'bump') { logEv('sjef svimmel', ev.id); audio?.bossbump(); music?.duck(0.4, 1.2); buzz(60); setMood('happy', 1); cue('bom!'); spawnShards([ev.x, ev.y + 1, ev.z], 0xc8c0b0); seen('boss2', `Den er svimmel! Hopp på ryggen (${J}) mens stjernene går rundt`); }
  else if (ev.type === 'tired') { logEv(ev.worn ? 'sjef slumper' : 'sjef sliten', ev.id); if (ev.worn) { cue('sliten!'); setMood('happy', 0.8); seen('boss4', `Den er helt utslitt og svimmel! Hopp på ryggen (${J})`); } }
  else if (ev.type === 'hit') { logEv('sjef truffet', `${ev.hp} igjen`); audio?.squash(); buzz(40); setMood('happy', 1.6); cue(ev.hp > 0 ? 'au!' : 'seier!'); spawnShards([ev.x, ev.y, ev.z], 0x7c1f14); }
  else if (ev.type === 'phase') { logEv('sjef fase', ev.phase); toast(ev.phase === 3 ? 'Rasende!' : 'Sint!'); }
  else if (ev.type === 'clang') { logEv('sjef pansret'); audio?.anthit(); buzz(20); seen('boss3', 'Ryggen er for hard nå. Vent til den er svimmel'); }
  else if (ev.type === 'hurt') { stats.hits++; logEv('sjef støt', ev.id); audio?.anthit(); music?.duck(0.4, 0.9); buzz(80); setMood('hurt', 1); toast(`Au! −${SCORE.antHit}`); }
  else if (ev.type === 'defeat') { stats.squashed++; logEv('SJEF SLÅTT', ev.id); audio?.fanfare(); music?.duck(0.2, 3); buzz([40, 60, 40, 60, 120]); setMood('happy', 6); cue('SJEF SLÅTT!'); toast('Du slo sjef-mauren! Ta den gylne smula'); for (let i = 0; i < 3; i++) spawnShards([ev.x + (i - 1) * 0.8, ev.y + 1.4, ev.z], [0xffc83a, 0xe23a3a, 0x3aa0e2][i]); }
  else if (ev.type === 'prize') { stats.boss++; logEv('sjef-smule tatt', ev.id); audio?.crumb(12, 12); buzz(30); setMood('happy', 3); cue('siste smule!'); toast(`Den siste smula! +${SCORE.boss} poeng`); spawnShards([ev.x, ev.y, ev.z], 0xffc83a); }
}
// smuler: plukk (R3). Små, rolige tilbakemeldinger: lyd, poeng, kort melding, gnister
function crumbEvent(ev) {
  stats.crumbs = ev.n; logEv('smule', `${ev.id} ${ev.n}/${ev.total}`); audio?.crumb(ev.n, ev.total); buzz(15); setMood('happy', 0.9); spawnShards([ev.x, ev.y, ev.z], 0xffc83a);
  toast(ev.n === ev.total ? `Alle smulene! ${ev.n}/${ev.total}  +${SCORE.crumb} poeng` : `Smule ${ev.n}/${ev.total}  +${SCORE.crumb} poeng`);
}
// R23: målskjermen viser hvilke delmål som er klare
// R47: stjerner for byggene i nivået på målskjermen (bare steder som er klart)
function buildStarsWinHTML() {
  if (!buildBudget || !LEVEL.buildSites?.length) return '';
  const best = getBuildStars(store, levelId), rows = LEVEL.buildSites.filter((s) => best[s.id]).map((s) => `<div style="font-size:14px;text-align:left">🔨 ${(s.label || s.id).replace(/[<>&]/g, '')}: <b style="color:#ffd23f">${starText(best[s.id].stars)}</b> <small>${T('build.cost', { n: best[s.id].cost })}</small></div>`).join('');
  return rows ? `<div class="wpts" style="font-size:15px;margin-top:8px">${T('build.starsTitle')}</div><div style="display:inline-block;margin:4px 0">${rows}</div>` : '';
}
function goalsWinHTML() {
  if (!goalTotal(LEVEL) || !goalsOn) return '';
  const rows = LEVEL.goalList.map((g) => `<div style="font-size:13px;opacity:${g.done ? 1 : 0.55};text-align:left">${g.done ? '✓' : '○'} ${goalLabel(g, lang).replace(/[<>&]/g, '')}</div>`).join('');
  return `<div class="wpts" style="font-size:15px;margin-top:8px">★ ${T('goal.title')} ${goalDone(LEVEL)}/${goalTotal(LEVEL)}</div><div style="display:inline-block;margin:4px 0">${rows}</div>`;
}
// R23: delmål klart: kort jubel (lyd, puls i panelet, stjerne-smuler), logg og autolagring
function goalEvent(ev) {
  const g = goalById(LEVEL, ev.id), name = g ? goalLabel(g, lang) : ev.id;
  logEv('delmål', `${ev.id} ${ev.n}/${ev.total}${ev.last ? ' (alle)' : ''}`);
  if (ev.last) { audio?.fanfare(); music?.duck(0.3, 2); buzz([30, 50, 30, 50, 90]); setMood('happy', 4); cue('alle delmål!'); toast(T('goal.cheer')); }
  else { audio?.crumb(ev.n, ev.total); audio?.checkpoint(); buzz(25); setMood('happy', 1.6); cue('delmål!'); const bra = firstRunOn && levelInfo?.n === FR.level ? braText(ev) : null; toast(bra ? `${ft(lang, bra.key, bra.params)} · ${name}` : T('goal.done', { name })); if (bra) { frEv(`bra ${ev.n}/${ev.total} ${frStat.t.toFixed(1)} s`); frV.pop(); } }
  for (let i = 0; i < 3; i++) spawnShards([player.x + (i - 1) * 0.6, player.y + 1.6, player.z], [0xffd23f, 0xffffff, 0xff9a1f][i]);
  goalView?.cheer(); saveProgress();
}
// R97: første fem minutter (firstrun_logic.js, firstrun_view.js). Tiden her er spilletid (ikke veggklokke), så testboten kan kjøre raskt.
let firstRunOn = store.get('tlm.firstrun', true), frHelpMs = +store.get('tlm.frhelpms', FR.helpMs / 1000) * 1000 || FR.helpMs; FR.helpMs = frHelpMs;
const frV = createFirstRunView({ $, hudEl }), frHints = createHints(store.get('tlm.fr.hints', null)), frBlind = createBlind(), frLog = [];
const frStat = { t: 0, acc: 0, moved: false, jumped: false, took: false, grabbed: false, hintN: 0, helpN: 0, idle8: 0 };
const frAct = () => firstRunActive({ on: firstRunOn, n: levelInfo?.n, diff: difficulty }) && DIF.contextHints;
const frEv = (detail) => { logEv('forstekjoring', detail); frLog.push({ t: +frStat.t.toFixed(1), detail }); };
const frSave = () => store.set('tlm.fr.hints', hintsSave(frHints));
function frUse(id, label) {
  if (noteUse(frHints, id)) { frSave(); }
  const k = { stick: 'moved', jump: 'jumped', take: 'took', grab: 'grabbed' }[id];
  if (!frStat[k]) { frStat[k] = true; frEv(`første ${label} ${frStat.t.toFixed(1)} s`); }
}
function frHelp(why) {
  const t = nextTarget(), now = performance.now(); frStat.helpN++;
  frGlowUntil = now + 9000; compassForce = now + 15000; startShowMeNow();
  tip(ft(lang, 'fr.help', { name: t.label }));
  frEv(`blindgate ${why}: hjelp (R64) mot ${t.label} etter ${frStat.t.toFixed(1)} s`);
}
function frInput(inp) {                              // kalles med knappene som ble trykt denne rammen
  if (levelInfo?.n !== FR.level || mode !== 'play' || won || menuOpen) return;
  if (inp.jumpPressed) frUse('jump', 'hopp');
  if (inp.grabPressed) frUse('grab', 'GREP');
  if (inp.carryPressed) {
    if (player.carry || findCarryTarget(player, LEVEL)) frUse('take', 'TA');
    else if (frAct()) { const r = noteWrongTa(frBlind, frStat.t * 1000); frEv('TA på feil sted'); if (r) frHelp(r.why); }
  }
}
function frTick(dt) {
  const play = mode === 'play' && !won && !menuOpen && !introSweep && !ov.active && !bld.active && !bossFighting();
  if (!play || levelInfo?.n !== FR.level) { frV.hideHint(); frV.progress({ show: false }, false); return; }
  frStat.t += dt; frStat.acc += dt; if (frStat.acc < 0.2) return; frStat.acc = 0;
  if (Math.hypot(player.vx, player.vz) > 0.4) frUse('stick', 'bevegelse');
  const act = frAct(), gt = frStat.t * 1000, t = nextTarget(), a = guideAimOf(t);
  for (const e of stepBlind(frBlind, gt, { x: player.x, y: player.y, z: player.z, dist: a.hdist, key: (t.final ? '!' : '') + t.label }, { act: firstRunOn && levelInfo?.n === FR.level })) {
    if (e.kind === 'still8') { frStat.idle8++; frEv(`sto stille ${Math.round(e.ms / 1000)} s`); }
    else if (e.kind === 'help' && act) frHelp(e.why);
  }
  const near = { take: !player.carry && !!findCarryTarget(player, LEVEL), grab: !!t.grip && a.hdist < 4, jump: !t.grip && a.hdist < 6 && t.y - player.y > 0.5 };
  const r = stepHints(frHints, gt, { diff: difficulty, play: act && TOUCH, t: frStat.t, near });
  if (r.hide) { frV.hideHint(); frEv(`hint borte: ${r.hide} (${r.why})`); }
  if (r.show) { frStat.hintN++; frSave(); frV.showHint(r.show, ft(lang, 'fr.hint.' + r.show, { jump: T('btn.jump'), take: TA, grab: GREP })); frEv(`hint vist: ${r.show}`); }
  else if (frV.hintId()) frV.refresh();
  const total = goalTotal(LEVEL), panel = goalsOn && DIF.subgoalText;
  frV.progress(progressInfo({ done: goalDone(LEVEL), total, diff: difficulty }), firstRunOn && !panel, ft(lang, 'fr.prog', { text: '' }).trim());
}
function update(dt) {
  if (P.faceCam && mode === 'play') {                                  // PC: piltastene ser deg rundt (WASD går)
    const yawIn = (held('ArrowLeft') ? 1 : 0) - (held('ArrowRight') ? 1 : 0), pitchIn = (held('ArrowDown') ? 1 : 0) - (held('ArrowUp') ? 1 : 0);
    if (yawIn || pitchIn) { camAnim = null; lastDrag = performance.now() / 1000; cam.yaw += yawIn * 1.9 * camSens * dt; const lim = viewFirst ? [-1.25, 1.25] : viewMode === 'shoulder' ? [-0.85, 1.2] : [-0.85, 1.35]; cam.pitch = Math.min(lim[1], Math.max(lim[0], cam.pitch + pitchIn * 1.2 * camSens * dt)); }
  }
  const [ix, iz] = axes();
  if (mode === 'plan') {
    const c = planCam, sp = c.dist * 0.6 * (boost() ? 2.5 : 1);
    const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
    c.pivot.x += (rx * ix + fx * iz) * sp * dt; c.pivot.z += (rz * ix + fz * iz) * sp * dt;
    c.pivot.y += ((upKey() ? 1 : 0) - (downKey() ? 1 : 0)) * sp * dt;
    c.pivot.y = Math.max(0, c.pivot.y);
    jumpEdge = grabEdge = false;
    return;
  }
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  if (mode === 'fly') {
    const sp = boost() ? 38 : 13, cp = Math.cos(cam.pitch), sn = Math.sin(cam.pitch);
    // fremover = der kameraet ser, også opp/ned: ser du ned mot et brett, flyr du ned mot det
    const mx = rx * ix + fx * cp * iz, mz = rz * ix + fz * cp * iz;
    player.x += mx * sp * dt;
    player.z += mz * sp * dt;
    player.y += (-sn * iz + (upKey() ? 1 : 0) - (downKey() ? 1 : 0)) * sp * dt;
    player.y = Math.max(0, player.y);
    player.vx = player.vz = player.vy = 0; player.state = 'air'; player.onGround = false;
    if (ix || iz) { const l = Math.hypot(mx, mz) || 1; player.fx = mx / l; player.fz = mz / l; }
    jumpEdge = grabEdge = false;
    return;
  }

  if (!won) clock += dt;
  stepLost(dt);
  if (shouldHintDrag({ touch: TOUCH, play: mode === 'play' && !won && !introSweep, shown: camHintShown, swipes: metrics.swipes, t: metrics.t })) { camHintShown = true; store.set('tlm.camhint', true); tip('Dra med høyre tommel på bildet for å se deg rundt.'); logEv('kamera', 'hint: dra for å se deg rundt'); }
  autoT += dt; if (mode === 'play' && !won) { metrics.t += dt; if (Math.hypot(touch.x, touch.y) > 0.2 || held('KeyW', 'KeyA', 'KeyS', 'KeyD')) metrics.stickT += dt; }
  if (autoT > 5 && mode === 'play' && !won) {                         // trygg autolagring: en rolig stund på fast grunn
    autoT = 0;
    if (player.onGround && player.state === 'ground' && !player.carry && player.recover <= 0 && player.groundBox && !player.groundBox.dyn && !player.groundBox.owner && player.y > LEVEL.deathY + 5 && !inHazard(LEVEL, player)) { autoPos = [player.x, player.y, player.z]; saveProgress(); }
  }
  if (carryEdge && gatesOn && mode === 'play' && !won && !player.carry) {          // R60: TA ved en bryter slår den (hvis ikke en ting er nærmere)
    const sw = nearSwitch(LEVEL, player), t0 = findCarryTarget(player, LEVEL);
    if (sw && !t0) { carryEdge = false; gateEvent(toggleSwitch(LEVEL, sw.id)); }
  }
  const inp = {
    mx: rx * ix + fx * iz, mz: rz * ix + fz * iz,
    jumpPressed: jumpEdge, jumpHeld: held('Space') || touch.jump,
    grabPressed: grabEdge, grabHeld: held('ShiftLeft', 'ShiftRight', 'KeyE') || touch.grab,
    carryPressed: carryEdge, carryHeld: held('KeyF') || touch.carry, aim: aimInput(fx, fz, rx, rz) ?? shoulderAim(dt, fx, fz, held('KeyF') || touch.carry),
    walk: held('KeyC', 'AltLeft', 'AltRight') || (P.faceCam && TOUCH && touch.x * touch.x + touch.y * touch.y < 0.3 && touch.x * touch.x + touch.y * touch.y > 0.01),
    face: P.faceCam && mode === 'play' ? { dx: fx, dz: fz } : undefined,
  };
  frInput(inp); frTick(dt); jumpEdge = grabEdge = carryEdge = false;
  const pre = { onGround: player.onGround, vy: player.vy, state: player.state, windup: player.windup, carry: !!player.carry, hard: player.hardLands, reach: player.reach > 0, bodies: (LEVEL.bodies || []).map((b) => b.min[0] + b.min[2]) };
  variant.beforeStep(player, dt, mode === 'play' && !won);
  step(player, inp, dt, LEVEL);
  variant.afterStep();
  if (slickTrack && mode === 'play' && !won) for (const ev of slickTrack.update(player, dt)) slickEvent(ev);
  if (antsOn) for (const ev of stepAnts(LEVEL, player, dt, mode === 'play' && !won)) antEvent(ev);
  if (puzzlesOn || puzzleOpenIds(LEVEL).length) for (const ev of stepPuzzles(LEVEL, dt, puzzlesOn && mode === 'play' && !won)) puzzleEvent(ev);
  if (puzzlesOn && mode === 'play' && !won) puzzleIntro();
  if (hasGates(LEVEL)) { for (const ev of stepGates(LEVEL, dt, player, gatesOn && mode === 'play' && !won)) gateEvent(ev); if (gatesOn && mode === 'play' && !won) { gateIntro(); stueTick(); } }
  if (bossOn && LEVEL.bossS) for (const ev of stepBoss(LEVEL, player, dt, mode === 'play' && !won)) bossEvent(ev);
  if (crumbsOn) for (const ev of stepCollect(LEVEL, player, dt, mode === 'play' && !won)) crumbEvent(ev);
  if (goalTotal(LEVEL) && goalsOn) for (const ev of stepGoals(LEVEL, { player, crumbs: crumbCount(LEVEL), stomps: stats.squashed || 0 }, mode === 'play' && !won)) goalEvent(ev);
  if (autoCam && !P.faceCam && !viewFirst && mode === 'play' && !camAnim && ['ground', 'air'].includes(player.state) && performance.now() / 1000 - lastDrag > 1.1) {      // Mario-stil: kameraet svinger rolig bak deg
    const k = player.onGround ? 1 : 0.5, sp0 = Math.hypot(player.vx, player.vz);
    const y0 = cam.yaw; if (followStrength > 0) cam.yaw = followYaw(cam.yaw, player.vx, player.vz, P.speed, dt * k, { rateScale: followStrength, capScale: followStrength }); metrics.yawAuto += Math.abs(cam.yaw - y0);
    if (sp0 > 1) { const base = viewMode === 'shoulder' ? pitchBase - 0.08 : pitchBase; cam.pitch += (base - cam.pitch) * Math.min(1, 0.35 * dt); }       // vinkelen går sakte tilbake til normal
  }
  musicFrame(); audioFrame(pre, dt); cueFrame(pre); ambientTick(dt);

  if (player.onGround && player.groundBox?.cp && player.y > save.pos[1] + 0.01) { save.pos = [player.x, player.y, player.z]; placeFlag(); lightFlag('sjekkpunkt'); saveProgress(); logEv('sjekkpunkt'); toast('Sjekkpunkt'); audio?.checkpoint(); cue('sjekkpunkt'); setMood('happy', 1.6); say('checkpoint'); }
  if (player.y < LEVEL.deathY) { failAt('falt'); resetPlayer(player, ...save.pos); stats.respawns++; toast(`Falt – tilbake til lagringspunkt  −${SCORE.respawn} poeng`); }
  for (const ev of drainEvents(LEVEL)) {
    if (ev.type === 'combo') { comboEvent(ev); continue; }
    logEv(ev.type, ev.id || ev.tool || ev.why || '');
    if (ev.type === 'broke') { audio?.shatter(); cue('noe knuses'); stats.broken++; spawnShards(ev.pos, LEVEL.bodies.find((b) => b.id === ev.id)?.color); toast(`${ev.id} gikk i stykker  −${SCORE.broken} poeng`); }
    else if (ev.type === 'lost') { audio?.splash('pit'); cue('plask'); toast(lostReturnOn ? `${ev.id} forsvant – kommer tilbake om litt` : `${ev.id} forsvant`); if (lostReturnOn) lostQueue.push({ id: ev.id, t: 3 }); }
    else if (ev.type === 'exhausted') { setMood('hurt', 0.6); buzz(30); if (breathSound) cue('puster tungt'); }
    else if (ev.type === 'use') {
      audio?.pickup(); buzz(20); setMood('happy', 0.9);
      if (ev.tool === 'thread') { toast(T('toast.threaded', { tieTop: T('btn.tieTop') })); say('thread'); }
      else if (ev.tool === 'zipA') toast(T('toast.tiedTop', { tieEnd: T('btn.tieEnd') }));
      else if (ev.tool === 'zip') { toast(T('toast.zipMade', { grab: GREP })); say('zip'); }
      else if (ev.tool === 'knotrope') { toast(T('toast.knotRope', { grab: GREP })); say('knot'); logEv('kombo', 'tau hengt ned'); }
      else say(ev.tool === 'gel' ? 'gel' : 'roll');
    }
    else if (ev.type === 'toolhint') tip(ev.tool === 'needle' ? T('toast.needSpool', { thread: T('btn.thread') }) : ev.tool === 'spool' ? T('toast.needNeedle', { thread: T('btn.thread') }) : ev.tool === 'zip' ? ({ 'zip-flat': T('toast.zipFlat'), 'zip-far': T('toast.zipFar'), 'zip-blocked': T('toast.zipBlocked') }[ev.why] || T('toast.zipStand', { tieTop: T('btn.tieTop') })) : ev.tool === 'gel' ? T('toast.needGel', { smear: T('btn.smear'), drop: T('btn.drop') }) : T('toast.needRoll', { unroll: T('btn.unroll'), drop: T('btn.drop') }));
    else if (ev.type === 'autojump') { buzz(15); if (!store.get('tlm.seen.autojump', false)) { store.set('tlm.seen.autojump', true); toast(TOUCH ? 'Hoppet av seg selv: stikken helt ut mot en kant = hopp over. Skyv forsiktig for å stoppe ved kanten.' : 'Hoppet av seg selv over gapet. Hold C for å gå forsiktig og stoppe ved kanten.'); } }
    else if (ev.type === 'edgestop') { buzz(10); if (!store.get('tlm.seen.edgestop', false)) { store.set('tlm.seen.edgestop', true); toast(TOUCH ? 'Stopper ved kanten. Skyv stikken helt ut for å hoppe over eller gå utfor.' : 'Stopper ved kanten. Slipp C for å gå utfor.'); } }
    else if (ev.type === 'shimmy') { logEv('shimmy'); buzz(8); if (!store.get('tlm.seen.shimmy', false)) { store.set('tlm.seen.shimmy', true); toast(TOUCH ? `Du kan gå sidelengs i kanten: skyv stikken til siden. ${T('btn.jump')} hiver deg opp.` : 'Du kan gå sidelengs i kanten (A/D). Mellomrom hiver deg opp.'); } }
    else if (ev.type === 'roll') { logEv('rulle', `v=${ev.v}`); audio?.roll(); buzz(20); cue('rulle'); setMood('happy', 0.8); say('roll'); if (!store.get('tlm.seen.roll', false)) { store.set('tlm.seen.roll', true); toast('Rullet! Fart og stikke i landingen gjør at du ikke blir bedøvd.'); } }
    else if (ev.type === 'tore') { audio?.drop('paper'); toast('Papirbåndet revnet'); say('tore'); }
  }
  if (LEVEL.shortcuts?.length && mode === 'play') for (const ev of stepShortcutWatch(shortcutWatch, player)) {           // R29: genvei med verktøy
    logEv('genvei', `${ev.id} ${ev.act === 'top' ? 'oppe' : 'første trinn'}`);
    if (shortcutHintOn) { if (ev.act === 'top') { audio?.checkpoint(); buzz(25); tip(T('toast.shortcutTop')); } else tip(T('toast.shortcutStep', { jump: T('btn.jump') })); }
  }
  tickKick(player, dt);
  if (toysOn) for (const ev of stepToys(toyLife, LEVEL, player, dt)) {                // R18: små stemmer i rommet
    if (ev.act === 'pop' && ev.onTop && mode === 'play') {                              // R34: står du på sprettboksen når den popper, kastes du bort
      const k = tryKick(player, LEVEL.bodies.find((b) => b.id === ev.id));
      if (k) { logEv('leke', `${ev.id} kast ${k.dist.toFixed(1)} v=${Math.hypot(k.vx, k.vz).toFixed(1)}/${k.vy.toFixed(1)}`); react.trigger('thrown'); say('thrown'); setMood('hurt', 0.6); buzz(30); cue('wææh!'); }
    }
    const snd = TOY_SOUND[ev.act]; if (snd === 'squeak') audio?.squeak(ev.amp); else if (snd === 'honk') audio?.honk(ev.amp); else if (snd === 'creak') audio?.creak(ev.amp); else if (snd === 'boing') audio?.boing(ev.amp); else if (snd === 'tick') audio?.toyTick();
    if (ev.act !== 'tick') { logEv('leke', `${ev.id} ${ev.act}`); cue(TOY_CUE[ev.act] || ev.act); if (ev.act !== 'stop') buzz(12); }
  }
  if (player.hardLands > pre.hard) { logEv('hard landing'); setMood('hurt', 1.3); say('hardland'); stats.hard++; toast(`Hardt landet – bedøvet  −${SCORE.hardLand} poeng`); }
  if (player.knockout) {
    player.knockout = false; audio?.crush(); buzz(90); say('knockout'); failAt('hardt fall');
    resetPlayer(player, ...save.pos); stats.respawns++;
    toast(`Landet for hardt – tilbake til lagringspunkt  −${SCORE.respawn} poeng`);
  }
  if (player.crushed) {
    const id = player.crushed; player.crushed = null; failAt('klemt'); audio?.crush(); cue('dunk: klemt');
    resetPlayer(player, ...save.pos); stats.respawns++;
    toast(`Klemt av ${id}!  −${SCORE.respawn} poeng`);
  }
  const hz = inHazard(LEVEL, player);
  if (hz) {
    failAt(hz.type || 'fare');
    audio?.splash(hz.type === 'flush' ? 'flush' : 'pit'); cue(hz.type === 'flush' ? 'skylling' : 'plask'); say(hz.type === 'flush' ? 'flush' : 'pit');
    resetPlayer(player, ...(hz.type === 'flush' ? LEVEL.start : save.pos)); stats.respawns++;
    toast(`${hz.message || 'Fare!'}  −${SCORE.respawn} poeng`); bandSay('hazard', PRIO.danger, hz.message || 'Fare!', 3, 'danger');
  }

  const g = LEVEL.goal;
  if (!won && goalTotal(LEVEL) && goalsOn && goalLockOn && !goalsOpen(LEVEL) && mode === 'play' && !stats.flew && Math.hypot(player.x - g[0], player.z - g[2]) < 2 && Math.abs(player.y - g[1]) < 2.5) {
    if (performance.now() > goalLockMsg) { goalLockMsg = performance.now() + 4000; logEv('mål låst', lockLogText(LEVEL)); bandSay('tip', PRIO.hint, lockMessage(LEVEL, { hints: DIF.contextHints, lang, T }), 6, 'hint'); }   // R89: alltid en beskjed (uten hint bare «Målet er låst.»)
  } else if (!won && Math.hypot(player.x - g[0], player.z - g[2]) < 2 && Math.abs(player.y - g[1]) < 2.5) {
    won = true; logEv('MÅL NÅDD', `${clock.toFixed(1)} s`); if (levelInfo?.n === FR.level) frEv(`mål nådd ${frStat.t.toFixed(1)} s spilletid, ${frStat.hintN} hint, ${frStat.helpN} hjelp, ${frStat.idle8} stillstand`); frV.hideHint(); frV.progress({ show: false }, false); if (!stats.flew) statsLevelEnd('complete', { sek: clock - seg.t0, poeng: points(), merke: DIFFS[runDiffMin] }); audio?.win(); music?.duck(0.3, 1.6); setMood('happy', 6); say('goal', true);
    let d, rw = null, bdg = null;
    { const cl = store.get('tlm.cleared', {}), prevBest = cl[levelId] || 0, n = levelInfo?.n; if (!stats.flew) { cl[levelId] = Math.max(prevBest, points()); store.set('tlm.cleared', cl); store.set('tlm.done', false); const runs = store.get('tlm.runs', {}); runs[levelId] = { t: clock, ants: stats.squashed || 0, crumbs: crumbCount(LEVEL), total: crumbTotal(LEVEL) }; store.set('tlm.runs', runs);
        rw = recordRun(store, { levelId, n, crumbs: crumbCount(LEVEL), total: crumbTotal(LEVEL), t: clock, flew: stats.flew }); logEv('belønning', `beste ${crumbCount(LEVEL)}/${crumbTotal(LEVEL)}${rw.unlocked ? ', låste opp ' + rw.unlocked.id : ''}${rw.newBestTime ? ', ny beste tid' : ''}`); if (rw.unlocked) refreshAccessories(); }       // husk hvilke nivåer som er klart (beste poeng)
      bdg = awardBadge(store, levelId, DIFFS[runDiffMin]); logEv('vanskelighet', `merke ${DIFFS[runDiffMin]}${bdg.isNew ? ' (nytt)' : ''} på ${levelId}`);   // R69: merke per brett og nivå (det letteste nivået brukt i løpet)
      d = finishData({ n, nextExists: !!nextLevel, clock, stats, crumbs: crumbCount(LEVEL), crumbTotal: crumbTotal(LEVEL), points: points(), prevBest, flew: stats.flew });
      $('winTitle').textContent = n ? (nextLevel ? T('win.level', { n }) : T('win.all')) : T('win.top');
      $('winStats').innerHTML = winHTML(d, T) + goalsWinHTML() + buildStarsWinHTML() + (rw?.unlocked && rewardsOn ? `<div class="wpts" style="font-size:17px;line-height:1.3">🎁 ${rwT(lang, 'rw.new', { name: rwT(lang, 'acc.' + rw.unlocked.id) })}</div>` : '') + (rw?.newBestTime ? `<div class="wpts" style="font-size:15px"><small>${rwT(lang, 'rw.newbest')}</small></div>` : '') + (bdg ? dv.winBadgeHtml({ levelId, diff: DIFFS[runDiffMin], isNew: bdg.isNew, st: store }) : ''); logEv('målskjerm', `${d.time}, maur ${d.squashed}, smuler ${d.crumbs}/${d.total}`);
      const nb = $('nextLevel'); nb.style.display = nextLevel || (n && storyOn) ? '' : 'none';
      if (nextLevel) { nb.textContent = `${T('win.next')} →`; nb.onclick = () => goLevel(nextLevel.id); }
      else if (n && storyOn) { nb.textContent = `${T('win.ending')} →`; nb.onclick = showEnding; }
      $('again').textContent = T('win.again'); }
    $('win').classList.remove('hide'); $('winHero').innerHTML = heroArt(d.stars >= 2 ? 'cheer' : 'hi'); $('winConfetti').innerHTML = Array.from({ length: 22 }, (_, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${(i % 7) * 0.12}s;background:${['#ffd9a0', '#e85d4a', '#9fe0c8', '#8fb4ff'][i % 4]}"></i>`).join(''); clearProgress();
  }
}

// romlyd: dryppende kran m.m. fra brettets audio.ambience, planlagt her slik at lydtekst virker uten lyd
const AMB = ambienceFor(levelId, LEVEL), ambience = createAmbience(AMB);   // R99: egen romtone i hvert brett (audio_fx.js)
const dripSrc = LEVEL.boxes.find((b) => b.kind === 'faucet');
function panOf(x, z) {                                       // -1 venstre … +1 høyre sett fra kameraet
  const rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  return Math.max(-1, Math.min(1, ((x - player.x) * rx + (z - player.z) * rz) / 14));
}
function ambientTick(dt) {
  if (!audio) return;
  let inMenu = false; try { inMenu = menuOpen; } catch { /* startskjermen er ikke satt opp ennå */ }
  const on = roomTone && ambientOn({ menu: inMenu, underwater: floodSt.under > 0, hidden: document.hidden, build: !!bld?.active, plan: mode === 'plan' });
  audio.amb(ambience.loops, on);                              // av (nivå 0) i meny, under vann og i bygging
  for (const ev of ambience.step(dt, on)) {
    if (ev.kind === 'drip') { const pan = dripSrc ? panOf((dripSrc.min[0] + dripSrc.max[0]) / 2, (dripSrc.min[2] + dripSrc.max[2]) / 2) : 0; audio.drip(pan); cue('drypp', pan); }
    else if (ev.kind === 'clock') audio.clockTick(ev.alt);
    else audio.ambEvent(ev.kind, ev.pan);
  }
}
// lydtekst for det som skjer (uavhengig av om lyden er på)
let sayFell = false, sayTired = false;
function voiceFrame(pre) {
  const p = player;
  if (mode !== 'play') return;
  if (!p.onGround && p.vy < -13 && !sayFell && p.state === 'air') { sayFell = true; say('fall'); }
  if (p.onGround) sayFell = false;
  if (!pre.onGround && p.onGround && pre.vy < -16 && p.landImpact < P.hardLand && !p.knockout) say('softland');
  if (pre.onGround && !p.onGround && p.vaulting) say('vault');
  if (pre.state === 'mantle' && p.state !== 'mantle') say('top');
  const climbingNow = p.state === 'climb' || p.state === 'hang';
  if (climbingNow && p.stam < 2.6 && !sayTired) { sayTired = true; say('tired'); }
  if (!climbingNow && p.stam > 5) sayTired = false;
  if (!pre.carry && p.carry) say('pickup');
  if (pre.carry && !p.carry) say((LEVEL.bodies || []).some((b) => !b.carried && Math.hypot(b.vx || 0, b.vz || 0) > 1) ? 'throw' : 'drop');
}
function cueFrame(pre) {
  const p = player;
  voiceFrame(pre);
  if (landWarn) {
    const ev = landingEvent(pre.vy, p.landImpact, ...landTh(), landMinV);
    if (ev && !pre.onGround && p.onGround && !(p.rollT > 0)) {   // R39: rullet landing meldes som «rulle»
      logEv('landing', `${ev.cls} ${ev.v}`); cue(ev.cue);
      if (ev.cls === 'soft' && ev.v > landMinV + 2) setMood('happy', 0.6);
    }
  } else if (!pre.onGround && p.onGround && pre.vy < -9) cue(p.landImpact >= P.hardLand ? 'hard landing' : 'landing');
  if (p.landImpact >= P.hardLand && !pre.onGround && p.onGround && !(p.rollT > 0)) buzz(45);
  if ((pre.state !== 'hang' && p.state === 'hang') || (pre.state !== 'climb' && p.state === 'climb')) buzz(14);
  if (pre.state !== 'hang' && p.state === 'hang') cue('tak i kanten');
  if (!pre.carry && p.carry) cue('tok tingen');
  if (pre.carry && !p.carry) cue('slapp / kastet');
}

// R5: stemningen i musikken følger faren (en maur ser deg) og målet
function musicFrame() {
  if (!music) return;
  const m = moodFor({ alerted: (antsOn && (LEVEL.antList || []).some((a) => a.alive && a.alerted)) || (bossOn && !!LEVEL.bossS?.alerted), won });
  if (m !== musicMood) { musicMood = m; music.setMood(m); logEv('musikk', m); }
}
// lyder som følger av hva som skjedde i dette bildet
function audioFrame(pre, dt) {
  if (!audio) return;
  const p = player, sp = Math.hypot(p.vx, p.vz), surf = surfaceOf(p.groundBox);
  if (pre.windup === 0 && p.windup > 0) audio.windup();                                       // tar sats
  if (pre.onGround && !p.onGround && p.vy > 5) audio.jump();                                  // avspark
  if (!pre.onGround && p.onGround && pre.vy < -3) audio.land(surf, -pre.vy, landWarn && !(p.rollT > 0) ? landClass(p.landImpact, ...landTh()) : 'soft');   // landing (R28: egen lyd per klasse)
  if (pre.state !== 'hang' && p.state === 'hang') audio.grab();
  if (pre.state !== 'climb' && p.state === 'climb') { audio.grab(); const gid = p.climb?.box?.id; if (gid) { noteGrab(markUse, markUseKey(gid)); try { store.set('tlm.gripuse', markUse); } catch { /* ikke lagret */ } } }
  if (pre.state !== 'swing' && p.state === 'swing') audio.grab();
  if (pre.state !== 'zip' && p.state === 'zip') { audio.grab(); setMood('happy', 3); say('zipping', true); }
  if (pre.state !== 'mantle' && p.state === 'mantle') audio.mantle();
  if (!pre.reach && p.reach > 0) audio.reach();
  if (!pre.carry && p.carry) audio.pickup();
  if (pre.carry && !p.carry) audio.drop(surf);
  { const fs = p.state === 'air' && p.vy < 0 ? -p.vy : 0; audio.fall(fs, landWarn ? windBoost(fs, landTh()[0], landWindMul) : 1); }                                      // fallvind
  audio.skid(p.skid ? Math.min(1, sp / P.speed) : 0);
  let moved = 0; (LEVEL.bodies || []).forEach((b, i) => { if (b.alive && !b.carried) moved += Math.abs(b.min[0] + b.min[2] - pre.bodies[i]); });
  audio.scrape(Math.min(1, moved / (dt * 3)));                                               // dytting
  audio.tick(dt, { active: true, rest: restBreath, speed01: sp / P.speed, climbing: ['hang', 'mantle', 'swing', 'climb'].includes(p.state) });
}

// ---------- tegning ----------
function insideAny(x, y, z, m) {
  for (const b of LEVEL.boxes) if (!b.carried && x > b.min[0] - m && x < b.max[0] + m && y > b.min[1] - m && y < b.max[1] + m && z > b.min[2] - m && z < b.max[2] + m) return true;
  return false;
}

const camAhead = { x: 0, z: 0 };
const dust = gfxLow ? null : look.makeDust(); if (dust) scene.add(dust.points);
let floodMode = store.get('tlm.flood', 'av'), floodMult = store.get('tlm.floodrate', 1);   // R42: stigende vann i nivå 4 (variant.js: floodCfg)
let variantMoodOn = store.get('tlm.varmood', true), variantTwistOn = store.get('tlm.vartwist', true), lampPower = store.get('tlm.lamp', 1);   // R12
const variant = makeVariant({ scene, LEVEL, renderer, sun, floorY: Math.max(0, ...LEVEL.boxes.filter((b) => b.type === 'floor').map((b) => b.max[1])),
  opts: { moods: () => variantMoodOn, twists: () => variantTwistOn, lamp: () => lampPower, aim: () => cam.pitch, P, say: (k) => toast(T(k, { jump: T('btn.jump'), grab: T('btn.grab') })), logEv,
    flood: () => floodMode, floodMult: () => floodMult,
    onDrown: () => { failAt('druknet'); audio?.splash?.('pit'); buzz(60); say('knockout'); resetPlayer(player, ...save.pos); stats.respawns++; variant.restartFlood(); toast(T('flood.drown', { jump: T('btn.jump'), grab: T('btn.grab') }) + `  −${SCORE.respawn} poeng`); } } });
floodVar = variant;
if (variant.active) logEv('stemning', `${variant.mood} + ${variant.twist}`);
const atmos = gfxLow ? null : makeAtmos({ scene, LEVEL, floorY: Math.max(0, ...LEVEL.boxes.filter((b) => b.type === 'floor').map((b) => b.max[1])), sun: SUN, look, name: levelName || LEVEL.name || 'x' });   // R4: lysstråler, mørke hjørner, småting (atmos.js)
const fdet = gfxLow ? null : makeFloorDetail({ scene, LEVEL, floorY: Math.max(0, ...LEVEL.boxes.filter((b) => b.type === 'floor').map((b) => b.max[1])), quality: lowMode === 'on' ? 'mid' : 'high', density: fdDens, name: levelName || LEVEL.name || 'x' });
if (fdet) logEv('gulvdetaljer', `${fdet.count} stk, ${fdet.beads.length} perler, ${fdet.pencils.length} blyant-/viskelærbokser`);
const dsolid = createDecorSolid(LEVEL); logEv('dekor', `${dsolid.count} solide bokser`);   // R91: boksene legges i LEVEL.boxes av dsolid.set() hver ramme (billig når ingenting endres)
const leke = gfxLow ? null : makeLekerom({ scene, LEVEL, floorY: Math.max(0, ...LEVEL.boxes.filter((b) => b.type === 'floor').map((b) => b.max[1])), quality: lowMode === 'on' ? 'mid' : 'high', density: legoDens });   // R31: legoknotter (2 tegnekall, ikke slått sammen)
if (isStue(LEVEL)) { const ss = stueSummary(LEVEL); logEv('stue', `${ss.cushions} puter, ${ss.plates} plate, ${ss.doors} dør, ${ss.goals} delmål, ${ss.crumbs} smuler, ${ss.foes} fiender`); }
if (leke?.count) logEv('lekerom', `${leke.count} knotter, ${leke.calls} tegnekall, ${leke.tris} trekanter`);
const soft = gfxLow ? null : makeSoftLight({ THREE, scene, LEVEL, floorY: Math.max(0, ...LEVEL.boxes.filter((b) => b.type === 'floor').map((b) => b.max[1])), sun, sunDir: SUN, renderer });   // R17: myke skygger og lysbaking (softlight.js)
// ---------- R15: budsjett og lav profil (perf_budget.js) ----------
const perfMerge = { before: 0, after: 0 };
{
  const roots = new Set(); for (const e of fadeEntries) for (const o of e.obj) if (!o.isMesh) roots.add(o);   // ting med flere deler: hver for seg (utoning virker fortsatt per ting)
  for (const r of roots) { const m = mergeStatic(THREE, r, { vcolor: true }); perfMerge.before += m.before; perfMerge.after += m.after; }
  { const m = mergeRigid(THREE, hero.root, refsIn(hero), { vcolor: true, protect: new Set([hero.M.scarf, hero.M.pack]) }); perfMerge.before += m.before; perfMerge.after += m.after; }      // figuren: deler som følger samme ledd slås sammen (ledd og ansiktsdeler som koden styrer røres ikke)
  for (const am of antMeshes) {                                                                                           // maur: finn hva som beveger seg ved å kjøre animasjonen i noen stillinger
    try {
      const T = [{}, { carry: false, crouchK: 0.8, mode: 'leap' }, { crouchK: 0.3, mode: 'crouch' }, { crouchK: 1, mode: 'roll', y: 3 }, { mode: 'plunge', y: 2, shake: 1 }];   // R19: også rulle- og stup-stilling
      const keep = movingNodes(am.a.root, [[0, 0, 0, false, 0], [1.7, 2, 0, true, 1], [3.9, 1, 0.5, false, 2], [5.2, 0.5, 0, true, 1], [2.2, 7, 0, true, 3], [4.1, 0, 0, true, 4]].map(([ph, sp, sq, al, ti]) => () => { am.a.update(ph, sp, sq, al, T[ti]); if (am.t.type === 'roller' || am.t.type === 'dangler') am.a.root.updateMatrixWorld(true); }));   // R19: skapningene må ha oppdatert matrise for at bevegelige deler skal oppdages (ellers slås kula/ringen sammen i hvilestilling)
      am.a.update(0, 0, 0, false, T[0]);
      const m = mergeRigid(THREE, am.a.root, keep); perfMerge.before += m.before; perfMerge.after += m.after;
    } catch (e) { console.warn('maur ikke slått sammen', e); }
  }
  for (const r of [csHolder, atmos?.groups.ao, atmos?.groups.clutter, fdet?.group, soft?.group]) if (r) { const m = mergeStatic(THREE, r, { cell: r === soft?.group || r === fdet?.group ? 80 : 40 }); perfMerge.before += m.before; perfMerge.after += m.after; }
}
// ---------- R94: skyggekastere og skyggetempo (perf2_logic.js) ----------
const shCull = createShadowCull({ radius: shRadius }), shPacer = createShadowPacer({ every: shEvery });
{
  const dyn = new Set([hero.root, ...antMeshes.map((a) => a.a.root)]); if (bossMesh) dyn.add(bossMesh.root);
  const n = shCull.collect(scene, (o) => { for (let q = o; q; q = q.parent) if (dyn.has(q)) return true; return false; });
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;   // skyggekartet tegnes bare når shPacer sier det
  logEv('ytelse', `skyggekastere: ${n} (radius ${shRadius}, tempo 1/${shEvery} når stille, ${shCullOn ? 'utvalg på' : 'utvalg av'})`);
}
const bodySum = () => { let s = 0; for (const b of LEVEL.bodies || []) s += b.min[0] + b.min[1] * 1.3 + b.min[2] * 1.7; return s; };   // leker som flytter seg (dytt, kast, fall) holder skyggen i full takt
let shLast = null, shCullAt = -99, shFocus = { x: 0, y: 0, z: 0 };
function stepShadows(now) {
  if (lowOn) { renderer.shadowMap.needsUpdate = false; return; }
  const key = [player.x, player.y, player.z, camera.position.x, camera.position.y, camera.position.z, sun.intensity, ...antMeshes.map((a) => a.a.root.position.x + a.a.root.position.z * 1.7 + a.a.root.position.y), bossMesh ? bossMesh.root.position.x + bossMesh.root.position.z : 0, bodySum()];
  const mv = movedBy(key, shLast, 1e-3) || !!player.carry; shLast = key;
  shFocus.x = player.x; shFocus.y = player.y; shFocus.z = player.z;
  shCull.on !== shCullOn && shCull.setOn(shCullOn);
  if (shCullOn && (now - shCullAt > 160)) { shCullAt = now; shCull.radius = shRadius; if (shCull.update(shFocus)) shPacer.force(); }
  shPacer.every = shEvery;
  renderer.shadowMap.needsUpdate = shPacer.step(mv);
}
// Skyggepasset telles slik: «kastere» = synlige meshes med castShadow; «skyggekall» = de som også ligger i lysets skyggekamera (det three tegner i skyggepasset). renderer.info teller ikke skyggepasset.
function shadowStats() {
  sun.target.updateMatrixWorld(); sun.updateMatrixWorld(); sun.shadow.updateMatrices(sun);
  const cam = sun.shadow.camera, fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  let casters = 0, calls = 0, tris = 0;
  scene.traverse((o) => { if (!o.isMesh || !o.castShadow) return; for (let q = o; q; q = q.parent) if (!q.visible) return; casters++; if (!o.frustumCulled || fr.intersectsObject(o)) { calls++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
  return { casters, calls, tris: Math.round(tris), cull: { ...shCull.stats, on: shCull.on }, pace: { drawn: shPacer.drawn, skipped: shPacer.skipped } };
}
let perfFrames = 0, perfPending = true, perfLine = '';
function applyLowProfile(on) {                       // slår av skygge-kart, støv, korn, lysstråler og ekstra lys; kommer tilbake når den slås av
  if (on && !texLow) { const r = shrinkSceneTextures(scene, (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }); logEv('teksturer', `krympet ${r.n} teksturer midt i spillet (−${r.savedMB.toFixed(1)} MB)`); }
  lowOn = on; setSunShadowLow(sun, on, SHADOW_NORMAL); shPacer.force(); grade.setLow(on); look.setDetail(!on); glow.intensity = on ? 0 : 30;        // lysets antall, skygge-på/av og skyggetype endres ikke (ville tvunget alle shadere til å kompileres på nytt midt i spillet, R35)
  perfPending = true; perfFrames = 0; logEv('lav profil', on ? 'på (ingen skygge-kart, støv, korn, lysstråler eller ekstra lys)' : 'av');
}
if (lowMode === 'on') { lowP.decide(null, 9, 1, 'on'); applyLowProfile(true); }
function render(now, dt) {
  if (bld.active && buildPause3d && !CINE.on && !window.__noPause3d) { if (!pause3dLogged) { pause3dLogged = true; logEv('bygg', '3D-verdenen pauset mens byggeskjermen er åpen'); } bld.update(dt, false); return; }   // R109: byggeskjermen dekker alt; ingen 3D-tegning bak den
  updateCarryButton();
  hero.gripNear = mode === 'play' && !player.carry && player.reach <= 0 && !!findReachTarget(player, LEVEL, 0.35);      // hånden løftes litt når noe kan gripes
  poseHero(player, now, dt, mode); animateHero(player, now, dt); updateBubble(now); updateStam();
  updateArc(); syncMade(); syncZips(); markerPlanFrame(now); updateLabels(); mv.update(now, dt);
  const pulse = 0.5 + 0.5 * Math.sin(now / 260);
  for (const m of gripMarks) { m.g.visible = !CINE.on; m.edges.material.opacity = gripHi ? 0.7 + 0.3 * pulse : 0.85; m.glow.material.opacity = gripHi ? 0.12 + 0.2 * pulse : 0.07; }
  hero.stepOff = (hero.stepOff || 0) * Math.exp(-dt / 0.07) + (player.stepDy || 0); player.stepDy = 0;                     // trinnhopp: figuren glir opp i stedet for å poppe
  { const rx = react.out, on = reactAnim && rx.active;                      // bare korte, tydelige strekk/klem etter knus/støt (ikke konstant puls)
    hero.root.position.set(player.x, player.y - hero.stepOff + (on ? rx.hop : 0), player.z); updateBlob(now);
    hero.root.scale.set(on ? rx.sxz : 1, on ? rx.sy : 1, on ? rx.sxz : 1).multiplyScalar(cineHS); }

  for (const { r, line, end } of ropes) {
    const a = new THREE.Vector3(r.x, r.y, r.z);
    const b = player.rope === r ? new THREE.Vector3(player.x, player.y + 0.85, player.z) : new THREE.Vector3(r.x, r.y - r.len, r.z);
    setCyl(line, a, b); end.position.copy(b);
  }
  gateViews.update(now);
  for (const v of puzzleViews) v.update(now);
  for (const { c, m } of crumbMeshes) { m.update(c.phase, c.got || !crumbsOn); }
  for (const m of antMeshes) {
    const { t, a, drop } = m;
    if (drop) { drop.visible = antsOn && !!t.drop && !t.drop.taken; if (drop.visible) { drop.position.set(t.drop.x, t.drop.y + 0.35 + Math.sin(clock * 3) * 0.06, t.drop.z); drop.rotation.y = clock * 1.5; } } a.root.visible = antsOn && !(LEVEL.noCreatures && (t.type === 'roller' || t.type === 'dangler')) && !(LEVEL.noWasps && t.type === 'wasp') && (t.alive || t.squash < 0.98);
    a.root.position.set(t.x, t.y, t.z);
    const want = Math.atan2(-t.fz, t.fx); let dr = want - m.rot; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); m.rot += dr * Math.min(1, dt * 10); a.root.rotation.y = m.rot;
    a.update(t.phase, t.speedNow || 0, t.squash, t.alerted, t);
  }
  if (bossMesh) {                                                  // sjef-maur: modell, premie og helsebar
    const B = LEVEL.bossS, on = bossOn;
    bossMesh.root.visible = on && !B.gone; bossMesh.root.position.set(B.x, B.y, B.z);
    const want = Math.atan2(-B.fz, B.fx); let dr = want - bossMesh.rot; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); bossMesh.rot += dr * Math.min(1, dt * (B.mode === 'windup' ? 14 : 8)); bossMesh.root.rotation.y = bossMesh.rot;
    bossMesh.update(B, clock); if (!on) bossMesh.root.visible = false;
    const pz = B.prize; bossMesh.prize.visible = on && !!pz && !pz.taken; if (bossMesh.prize.visible) { bossMesh.prize.position.set(pz.x, pz.y + 0.35 + Math.sin(clock * 3) * 0.12, pz.z); bossMesh.prize.rotation.y = clock * 1.8; }
    bossBar.update(on ? B : null, mode === 'play' && !won && (B.mode !== 'patrol' || Math.hypot(player.x - B.x, player.z - B.z) < 22));
  }
  for (const v of pressViews) { const h = v.b.max[1] - v.b.min[1]; v.mesh.scale.y = h / v.h0; v.mesh.position.y = v.b.min[1] + h / 2; }   // R41
  for (const { b, mesh, size } of bodyMeshes) {
    mesh.visible = b.alive;
    if (b.kind === 'needle' && mesh.userData.thread && mesh.userData.on !== !!b.threaded) { mesh.userData.on = !!b.threaded; mesh.userData.thread(!!b.threaded); }
    const bx = b.max[0] - b.min[0], by = b.max[1] - b.min[1], bz = b.max[2] - b.min[2];
    mesh.position.set(b.min[0] + bx / 2, b.min[1] + by / 2, b.min[2] + bz / 2);
    animateToy(mesh, b.kind, toyLife.toys.get(b.id), clock);          // R18
    if (b.pole) { mesh.rotation.y = b.carried ? Math.atan2(-player.fz, player.fx) : (bz > bx ? Math.PI / 2 : 0); mesh.rotation.z = b.carried && vaultNow ? vaultNow.poleTilt : 0; }   // staven peker fremover når du bærer den; R41: heller under stavhopp
    if (Math.abs(by / size[1] - 1) > 1e-3 || mesh.userData.sy) { mesh.scale.y = by / size[1]; mesh.userData.sy = 1; }   // R41: våt svamp har svulmet
    if (!!b.wet !== !!mesh.userData.wet) { mesh.userData.wet = !!b.wet; const k = b.wet ? 0.62 : 1 / 0.62; mesh.traverse((o) => { if (o.isMesh && o.material?.color) o.material.color.multiplyScalar(k); }); }   // R41: våt = mørkere
  }
  for (let i = shards.length - 1; i >= 0; i--) {
    const s = shards[i]; s.t -= dt; s.v.y -= 22 * dt;
    s.m.position.addScaledVector(s.v, dt);
    if (s.m.position.y < 0.12) { s.m.position.y = 0.12; s.v.set(0, 0, 0); }
    if (s.t <= 0) { scene.remove(s.m); shards.splice(i, 1); }
  }
  const hint = $('hint');
  if (mode === 'play' && !won) {
    const t = player.carry ? null : findCarryTarget(player, LEVEL);
    const st = taState(), B = TOUCH ? T('btn.' + st.key) : 'F', zn = !player.carry && zipNear(player, LEVEL);
    const throwTxt = TOUCH && aimThrowOn ? T('hint.dragThrow') : T('hint.holdThrow');
    const SENT = { 'need-gel': 'hint.needGel', 'need-roll': 'hint.needRoll', 'need-thread': 'hint.needThread', 'need-needle': 'hint.needNeedle', 'zip-b': 'hint.tieEnd' };   // hele setninger (resten starter med knappen)
    const ACT = { wet: 'hint.soak', knot: 'hint.knot', press: 'hint.press', gel: 'hint.smear', roll: player.carry?.knotted ? 'hint.hangrope' : 'hint.unroll', thread: 'hint.thread', 'zip-a': 'hint.tieTop' };
    const pk = puzzlesOn && player.carry && carryingKeyNear(LEVEL, player), pt = puzzlesOn && !player.carry && puzzleTarget(LEVEL, player);
    const gsw = gatesOn && hasGates(LEVEL) && !player.carry && !t && nearSwitch(LEVEL, player);
    hint.textContent = gsw ? T('gate.switchHint', { btn: B, name: gateName(gsw) }) : pk && !SENT[st.th] && player.charge < P.throwMin ? T('puz.keyPlate', { place: B })
      : pt && pt.key === 'key' && t && t.id === pt.puzzle.key ? T('puz.takeKey', { take: B })
      : player.carry
      ? (player.charge >= P.throwMin ? T('hint.releaseThrow', { btn: B })
        : SENT[st.th] ? `${T(SENT[st.th], { btn: B })} · ${throwTxt}`
        : ACT[st.th] ? `${B}: ${T(ACT[st.th])} · ${throwTxt}`
        : `${B}: ${st.key === 'place' ? T('hint.place', { name: nameOfObj(st.sp.c) }) : T('hint.drop')} · ${throwTxt}`)
      : zn ? T('hint.zipRide', { btn: GREP }) : t ? `${B}: ${T('hint.take', { name: nameOfObj(t) })}` : (() => { const n = P.faceCam ? findCarryTarget(player, LEVEL, true) : null; return n ? T('hint.turn', { name: nameOfObj(n), look: T(TOUCH ? 'hint.look.touch' : 'hint.look.pc') }) : ''; })();
    hint.classList.toggle('hide', !hint.textContent);
  } else hint.classList.add('hide');
  goal.rotation.y = now * 0.002; goal.position.y = LEVEL.goal[1] + 0.35 + Math.sin(now * 0.003) * 0.12;
  { const u = beacon.userData, pu = 0.5 + 0.5 * Math.sin(now * 0.0025), near = Math.min(1, Math.hypot(player.x - LEVEL.goal[0], player.y - LEVEL.goal[1], player.z - LEVEL.goal[2]) / 6);   // dempes når du står ved målet
    beacon.visible = beaconOn && !won && mode !== 'plan'; u.core.material.opacity = (0.42 + 0.16 * pu) * near; u.ghost.material.opacity = (0.26 + 0.1 * pu) * near; u.halo.material.opacity = (0.65 + 0.3 * pu) * near; u.halo.material.rotation = now * 0.0004; beacon.rotation.y = now * 0.0006; }
  flagV.update(now, dt); goalRing.update(now, !won && mode !== 'plan');

  let desired, look;
  if (mode === 'plan') {
    const c = planCam, cp = Math.cos(c.pitch);
    look = c.pivot;
    desired = new THREE.Vector3(c.pivot.x + Math.sin(c.yaw) * cp * c.dist, Math.max(0.6, c.pivot.y + Math.sin(c.pitch) * c.dist), c.pivot.z + Math.cos(c.yaw) * cp * c.dist);
    camera.position.lerp(desired, 1 - Math.pow(0.0005, dt));
    camera.lookAt(look);
  } else if (viewFirst && mode === 'play') {
    // 1. person: kameraet sitter i figurens øyehøyde og følger den stivt (ingen etterslep). Hodet, skjerf og sekk skjules så de ikke står i veien.
    const eyeY = player.y + EYE_H - (player.recover > 0.2 ? 0.12 : 0);
    const fxz = [-Math.sin(cam.yaw), -Math.cos(cam.yaw)], cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    camera.position.set(player.x + fxz[0] * 0.14, eyeY, player.z + fxz[1] * 0.14);
    camera.lookAt(camera.position.x - Math.sin(cam.yaw) * cp, camera.position.y - sp, camera.position.z - Math.cos(cam.yaw) * cp);
    cam.target.set(player.x, player.y + 0.62, player.z); camFocusY = player.y; cam.cur = cam.dist;
  } else {
    if (camFocusY === null || Math.hypot(player.x - cam.target.x, player.z - cam.target.z) > 12 || Math.abs(player.y - camFocusY) > 14) {
      camFocusY = player.y; cam.target.set(player.x, player.y + 0.62, player.z);   // stor teleportering (respawn): hopp direkte
    }
    const settled = player.onGround || ['hang', 'mantle', 'swing', 'climb'].includes(player.state) || mode === 'fly';
    if (settled) camFocusY += (player.y - camFocusY) * (1 - Math.pow(0.08, dt));        // følg rolig når du står
    else camFocusY = Math.min(player.y + 0.9, Math.max(player.y - 0.9, camFocusY));       // i lufta: ikke følg hvert hopp
    const kxz = 1 - Math.pow(0.04 - 0.0395 * Math.min(1, camBossK), dt);       // under sjefkamp følger kameraet figuren nesten uten forsinkelse (støt fra sjefen kaster figuren langt)
    { const la = lookAheadOn && mode === 'play' && player.state === 'ground' ? 0.17 : 0, ka = 1 - Math.pow(0.25, dt);       // se litt foran figuren i gangretningen (mer av det du går mot)
      camAhead.x += (player.vx * la - camAhead.x) * ka; camAhead.z += (player.vz * la - camAhead.z) * ka; }
    cam.target.x += (player.x + camAhead.x - cam.target.x) * kxz; cam.target.z += (player.z + camAhead.z - cam.target.z) * kxz;
    // kameraassistanse: se der du lander (fall) og opp mot neste grep (klatring), og løft deg over vegger i stedet for å bli trukket tett inn
    const falling = !player.onGround && player.vy < -6 && !['hang', 'mantle', 'swing', 'climb', 'zip'].includes(player.state);
    const climbing = ['climb', 'hang'].includes(player.state);
    { const B = bossOn && LEVEL.bossS && !LEVEL.bossS.gone && !won ? LEVEL.bossS : null, f = B ? bossFrame(player.x, player.z, B.x, B.z, B.mode) : { on: false, shift: 0, dist: 0, pitch: 0, yaw: null };
      const bs = { k: camBossK, shift: camBossShift, dist: camBossDist, pitch: camBossPitch, ox: camBossOx, oz: camBossOz };
      cam.yaw = bossCamStep(bs, f, B, player, cam.yaw, dt, mode === 'play');
      camBossK = bs.k; camBossShift = bs.shift; camBossDist = bs.dist; camBossPitch = bs.pitch; camBossOx = bs.ox; camBossOz = bs.oz; }
    const lookT = camAssist ? (falling ? -0.9 : climbing ? 0.8 : 0) : 0, pitchT = (camAssist ? (falling ? 0.14 : climbing ? -0.08 : 0) : 0);
    const ka = 1 - Math.pow(0.15, dt);
    camLook += (lookT - camLook) * ka; camPitchBias += (pitchT - camPitchBias) * ka;
    cam.target.y = camFocusY + 0.62 + camLook + cineH;
    const SH = viewMode === 'shoulder', baseDist = (SH ? shDist : cam.dist) + camBossDist;
    const sdx = (SH ? shSide * shOff * Math.cos(cam.yaw) : 0) + camBossOx, sdz = (SH ? -shSide * shOff * Math.sin(cam.yaw) : 0) + camBossOz;       // sideforskyvning: kameraet over skulderen
    const dirAt = (pitch) => { const c = Math.cos(pitch); return new THREE.Vector3(Math.sin(cam.yaw) * c, Math.sin(pitch), Math.cos(cam.yaw) * c); };
    // v0.86: kameraet blir inne i rommet (ikke utenfor veggen / over taket): bak et vindu eller en vegg ble figuren borte bak karmen eller veggen
    const RM = LEVEL.room, keepIn = !!RM && Number.isFinite(RM.x0) && player.x > RM.x0 && player.x < RM.x1 && player.z > RM.z0 && player.z < RM.z1;
    const inRoom = (x, y, z) => !keepIn || (x > RM.x0 + 0.4 && x < RM.x1 - 0.4 && z > RM.z0 + 0.4 && z < RM.z1 - 0.4 && y < (RM.height || 1e9) - 0.4);
    const clearAt = (dv, dd) => { const x = cam.target.x + dv.x * dd + sdx, y = cam.target.y + dv.y * dd, z = cam.target.z + dv.z * dd + sdz; return !insideAny(x, y, z, 0.25) && inRoom(x, y, z); };
    // v0.87: ved lav kameravinkel sjekkes hele strekningen fra figuren til kameraet, ikke bare endepunktet (ellers kan kameraet havne under en tynn bordplate)
    const clearPath = (dv, dd) => { if (!clearAt(dv, dd)) return false; if (dv.y > 0.15) return true; for (let k = 0.6; k < dd; k += 0.3) if (!clearAt(dv, k)) return false; return true; };
    let liftT = 0;
    if (camAssist && mode !== 'fly' && !clearPath(dirAt(cam.pitch + camPitchBias + camBossPitch), baseDist)) {         // noe i veien på full avstand: prøv en høyere vinkel
      for (let o = 0.12; o <= 0.96; o += 0.12) { const pp = Math.min(1.3, cam.pitch + camPitchBias + camBossPitch + o); if (clearPath(dirAt(pp), baseDist)) { liftT = pp - cam.pitch - camPitchBias - camBossPitch; break; } }
    }
    camLift += (liftT - camLift) * (liftT > camLift ? 1 - Math.pow(0.02, dt) : 1 - Math.pow(0.2, dt));
    const pitchNow = Math.min(1.3, cam.pitch + camPitchBias + camBossPitch + camLift);
    // v0.87: ser du selv oppover (dro kameraet ned) mens noe under hindrer kameraet, løftes kameraet som før, men blikket tiltes opp i stedet for å bli tvunget ned igjen (stå på et bord og se mot taket)
    const userUp = cam.pitch < 0.1 && performance.now() / 1000 - lastDrag < 8 && mode !== 'fly';
    camUpTilt += ((userUp ? Math.tan(Math.min(0.8, Math.max(0, camLift))) * cam.cur : 0) - camUpTilt) * (1 - Math.pow(0.1, dt));
    const cp = Math.cos(pitchNow), dir = new THREE.Vector3(Math.sin(cam.yaw) * cp, Math.sin(pitchNow), Math.cos(cam.yaw) * cp);
    let d = baseDist;
    for (; d > (SH ? 0.8 : 1.1); d -= 0.2) { if (clearPath(dir, d)) break; }
    cam.cur += (d - cam.cur) * (d < cam.cur ? 0.5 : 0.08);
    if (!window.__camLock) { camera.position.copy(cam.target).addScaledVector(dir, cam.cur); camera.position.x += sdx; camera.position.z += sdz;
    { let lk = [cam.target.x + sdx, cam.target.y + (SH ? 0.12 : 0) + camUpTilt, cam.target.z + sdz];
      if (camBossK > 0.02 && !SH) { const cp3 = [camera.position.x, camera.position.y, camera.position.z], h3 = [player.x, player.y + 0.6, player.z], a = shiftLookX(cp3, anchorLook(cp3, lk, h3, camera.fov, BOSS_HERO_Y[0], BOSS_HERO_Y[1]), h3, camera.fov, camera.aspect, BOSS_HERO_X), w = Math.min(1, camBossK); lk = lk.map((v, i) => v + (a[i] - v) * w); }   // sjefkamp: figuren holdes over knappene og under varselstripen selv om veggen drar kameraet tett inn
      camera.lookAt(lk[0], lk[1], lk[2]); } }
  }
  if (introSweep) {          // R22: kamerasveip fra målet tilbake til figuren; ett trykk hopper over
    const r = introSweep.update(dt);
    if (r.done) introEnd(introSweep.s.skipped);
    else { const f = new THREE.Vector3(); camera.getWorldDirection(f); const np = camera.position.toArray(), nl = [np[0] + f.x * cam.cur, np[1] + f.y * cam.cur, np[2] + f.z * cam.cur];
      const o = sweepPose({ e: r.e, goal: [LEVEL.goal[0], LEVEL.goal[1] + 0.8, LEVEL.goal[2]], hero: [player.x, player.y + 0.62, player.z], yaw: cam.yaw, pitch: 0.45, dist: 16, nPos: np, nLook: nl, room: LEVEL.room });
      camera.position.set(...o.pos); camera.lookAt(...o.look); }
  }
  if (introTgt && introV) {
    introV.update(now); if (introHintT > 0) { introHintT -= dt; if (introHintT <= 0) introV.hideHint(); }
    if (!introSweep && introMarkOn && DIF.introMark && reachedFirst(introTgt, player) && mode === 'play') { introV.markerOn(false); introV.hideHint(); introHintT = 0; logEv('intro', 'første delmål nådd'); introTgt = null; }
  }
  { const fs = landWarn && mode === 'play' && !player.onGround && player.state === 'air' && player.vy < 0 ? -player.vy : 0;
    landFovCur = approach(landFovCur, fovTarget(fs, landTh()[0], landFovMax), dt);
    const asp = innerWidth / innerHeight, aTgt = fovForAspect(asp); fovAutoCur = approach(fovAutoCur, aTgt, dt, 3, 3); if (Math.abs(fovAutoCur - aTgt) < 0.05) fovAutoCur = aTgt;   // R54: myk overgang når telefonen snus
    if (fovOrient !== (asp < 1)) { fovOrient = asp < 1; logEv('kamera', `skjerm ${asp < 1 ? 'stående' : 'liggende'}, synsfelt ${fovManual ? fovSet : aTgt}`); }
    const fovBase = effectiveFov(fovManual ? fovSet : null, fovAutoCur);
    const fp = viewFirst && mode === 'play', fov = (fp ? 74 : viewMode === 'shoulder' ? fovBase + 8 : fovBase) + landFovCur;
    for (const o of [hero.head, hero.packG, hero.tailA, hero.tailB]) if (o) o.visible = !fp;
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); } }
  { const xh = $('xhair'); if (xh) xh.style.display = viewMode === 'shoulder' && xhairOn && mode === 'play' ? 'block' : 'none'; }
  if (dust) { dust.points.visible = dustOn && !lowOn && mode !== 'plan'; if (dust.points.visible) dust.update(now / 1000, camera.position.x, camera.position.y, camera.position.z); }
  variant.update(now / 1000, dt, player, mode);
  if (soft) soft.update(softOn, lowOn, gfxLow);
  if (dsolid.set(decorSolidOn) && dsolid.count) logEv('dekor', decorSolidOn ? `${dsolid.count} bokser på` : 'bokser av');   // R91
  if (fdet) { fdet.update(floorDetailOn && !lowOn && mode !== 'plan'); const sol = floorDetailOn && !lowOn && beadSolidOn; if (sol !== fdet.solid) logEv('perler', sol ? `${fdet.beads.length} solide` : 'ikke solide'); const psol = floorDetailOn && !lowOn && pencilSolidOn; if (psol !== fdet.pencilSolid) logEv('gulvdetaljer', psol ? `${fdet.pencils.length} blyantbokser solide` : 'blyanter ikke solide'); fdet.setSolid(sol, psol); }   // R37
  if (leke) leke.update(legoOn && !lowOn && mode !== 'plan');
  if (atmos) atmos.update(now / 1000, { rays: raysOn && !lowOn && variant.raysFactor > 0.3, ao: aoOn, clutter: clutterOn, plan: mode === 'plan', cam: camera.position });
  ov.applyCamera(); camera.updateMatrixWorld(); ov.update(dt, now); bld.update(CINE.on ? 0 : dt, mode === 'play' && !won && !menuOpen && !ov.active);   // kinomodus: byggetiden går bare i cine.step / cine.build.step
  if (labAutoOpen({ lab: isLab(LEVEL), on: labStart, done: labAuto.done, playing: mode === 'play' && !won && !menuOpen && !ov.active && !bossFighting(), onGround: player.onGround || player.state === 'ground' }) && bld.open()) { labAuto.done = true; logEv('bygglab', 'byggeskjermen åpnet ved start'); }   // R67
  updateFades(dt); updateOffscreen();
  heroSeen(bossMesh && bossOn && !LEVEL.bossS.gone && camBossK > 0.05 && mode === 'play' && !viewFirst);
  sun.target.position.set(player.x, player.y, player.z);
  sun.position.set(player.x + SUN[0], player.y + SUN[1], player.z + SUN[2]);
  grade.follow(player, camera);
  if (floodSt.shake > 0 && mode === 'play' && !window.__camLock && !CINE.on) { const [sx, sy] = shakeOffset(floodSt.shake, now / 1000); camera.position.x += sx; camera.position.y += sy; }   // R65: lett kameraskjelv før man drukner
  stepShadows(now);   // R94: skyggekartet tegnes bare når tempoet sier det
  cine.applyCam();   // R68: fritt kamera (setCam) overstyrer følgekameraet per bilde
  renderer.render(scene, camera);
  if (perfPending && ++perfFrames >= 30) { perfPending = false; const st = sceneStats(renderer, scene); perfLine = statsLine(st, perfMerge) + ' · ' + memLine(st) + (texLow ? ' · små teksturer' : '') + (lowOn ? ' · lav profil' : ''); const ds = drawerSummary(LEVEL); if (ds.total) logEv('skuffer', `${ds.open} åpne, ${ds.closed} lukkede, ${ds.fronts} frontfarger, tydelige ${drawerCue() ? 'på' : 'av'}`); const rc = roomCaps(levelId), w = overBudget(st, { ...BUDGET, ...rc }).concat(memOver(st, texLow || lowOn, rc.texMB ? { ...MEM_BUDGET, texMB: Math.min(MEM_BUDGET.texMB, rc.texMB) } : MEM_BUDGET)); /* R85: tak per rom */ logEv('budsjett', perfLine + (w.length && !lowOn ? ` · OVER BUDSJETT: ${w.join(', ')}` : '')); }
  goalView?.update({ crumbs: crumbCount(LEVEL), stomps: stats.squashed || 0, stars: buildBudget && bld.enabled ? bld.starsMap() : null, show: mode === 'play' && !won && !menuOpen }, now);
  if (tb.isOn()) tb.update(bandCtx(), now);
  const crumbHud = crumbsOn && crumbTotal(LEVEL) ? ` · ★ ${crumbCount(LEVEL)}/${crumbTotal(LEVEL)}` : '';
  $('hud').textContent = !(hudTech || hudOpen) ? `v${VERSION} · ${levelLabel}${crumbHud}${player.stam < P.stamina - 0.05 ? '  grep ' + '▮'.repeat(Math.max(0, Math.round(10 * player.stam / P.stamina))) : ''}` :
    `v${VERSION} · ${levelLabel} · ${mode === 'plan' ? 'PLAN' : mode === 'fly' ? 'FLY' : player.state}${player.sliding ? ' (glir)' : ''}${player.reach > 0 ? ' · GREPER' : ''}\n` +
    `høyde ${player.y.toFixed(1)}  tid ${clock.toFixed(0)}s${player.state === 'climb' || player.stam < P.stamina - 0.05 ? '  grep ' + '▮'.repeat(Math.max(0, Math.round(10 * player.stam / P.stamina))) + '▯'.repeat(10 - Math.max(0, Math.round(10 * player.stam / P.stamina))) : ''}\nlagret ${stats.saves} · tilbake ${stats.respawns}${crumbHud} · poeng ${points()}${renderer.getPixelRatio() < basePr - 0.01 ? `\noppløsning ${renderer.getPixelRatio().toFixed(2)}× (⚙ → Test)` : ''}`;
}

// ---------- kamerahjelp: tone ut det som står i veien, og vis hvor figuren er når den er utenfor skjermen ----------
let fadeOn = store.get('tlm.fade', true);
let fadeOp = store.get('tlm.fadeop', 0.16);
function segHitsBox(a, d, b, pad) {                              // linjestykke a→a+d mot boks (utvidet med pad): slab-metoden
  let t0 = 0, t1 = 1;
  for (let i = 0; i < 3; i++) {
    const lo = b.min[i] - pad, hi = b.max[i] + pad;
    if (Math.abs(d[i]) < 1e-9) { if (a[i] < lo || a[i] > hi) return false; continue; }
    let u = (lo - a[i]) / d[i], v = (hi - a[i]) / d[i]; if (u > v) [u, v] = [v, u];
    t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) return false;
  }
  return true;
}
function setFadeMats(e, on) {
  for (const root of e.obj) root.traverse((o) => {
    if (!o.isMesh) return;
    if (on) {
      if (!e.orig.has(o)) e.orig.set(o, o.material);
      if (!e.clone.has(o)) { const cl = (x) => { const c = x.clone(); c.transparent = true; return c; }; e.clone.set(o, Array.isArray(o.material) ? o.material.map(cl) : cl(o.material)); }
      o.material = e.clone.get(o);
    } else if (e.orig.has(o)) o.material = e.orig.get(o);
  });
}
function updateFades(dt) {
  const on = fadeOn && mode !== 'plan' && cam.cur > 0.6 && !(viewFirst && mode === 'play');
  const a = [camera.position.x, camera.position.y, camera.position.z], d = [cam.target.x - a[0], cam.target.y - a[1], cam.target.z - a[2]];
  const hc = [player.x, player.y + 0.5, player.z], insideBody = (b) => hc[0] > b.min[0] - 0.05 && hc[0] < b.max[0] + 0.05 && hc[1] > b.min[1] && hc[1] < b.max[1] && hc[2] > b.min[2] - 0.05 && hc[2] < b.max[2] + 0.05;
  for (const e of fadeEntries) {
    const hit = on && e.boxes.some((b) => !b.carried && (segHitsBox(a, d, b, 0.12) || insideBody(b)));   // v0.80: sitter figuren inni tingen (henger i kanten bak en gardin), tones den ut uansett kameravinkel
    const was = e.t;
    e.t = Math.max(0, Math.min(1, e.t + (hit ? 1 : -1) * dt * 6));
    if (e.t > 0 && was === 0) setFadeMats(e, true);
    if (e.t > 0) {
      const op = 1 - (1 - fadeOp) * e.t;
      for (const o of e.clone.keys()) for (const mt of [].concat(e.clone.get(o))) { mt.opacity = op; mt.depthWrite = e.t < 0.5; }
    }
    if (e.t === 0 && was > 0) setFadeMats(e, false);
  }
}
// R41: kombinasjoner: lyd, lydtekst, hint-tekst og logg (reglene ligger i combos.js)
function comboEvent(ev) {
  logEv('kombo', `${ev.rule}: ${ev.id}${ev.other ? ' + ' + ev.other : ''}`);
  audio?.pickup(); buzz(25); setMood('happy', 1.2);
  if (ev.does === 'wet') { audio?.splash('pit'); cue('plask, svampen suger'); toast(T('toast.soaked', { press: T('btn.press') })); say('soak'); }
  else if (ev.does === 'knot') { audio?.drop('fabric'); cue('knyter'); toast(T('toast.knotted', { hang: T('btn.hangrope') })); say('knot'); }
  else if (ev.does === 'press') { audio?.drop('paper'); cue('papir presses sammen'); toast(T('toast.pressed', { jump: T('btn.jump') })); say('press'); }
}
const offEl = $('offscreen');
function updateOffscreen() {
  hero.head.getWorldPosition(_v3); _v3.project(camera);
  const behind = _v3.z > 1, x = behind ? -_v3.x : _v3.x, y = behind ? -_v3.y : _v3.y;
  const out = behind || Math.abs(_v3.x) > 1.02 || _v3.y > 1.02 || _v3.y < -1.02;
  const fpv = viewFirst && mode === 'play';
  offEl.style.display = out && mode === 'play' && !fpv ? 'flex' : 'none';
  if (!out || mode !== 'play' || fpv) return;
  const k = 1 / Math.max(Math.abs(x) / 0.86, Math.abs(y) / 0.72, 1e-3);
  offEl.style.left = `${(x * k * 0.5 + 0.5) * innerWidth}px`; offEl.style.top = `${(-y * k * 0.5 + 0.5) * innerHeight}px`;
  offEl.firstElementChild.style.transform = `rotate(${Math.atan2(x, y)}rad)`;
}

// ---------- TA-knappen: navn, farge og «klar» etter hva du holder og hva som er mulig der du står ----------
const TA_MAP = { wet: ['soak', 1], knot: ['knot', 1], press: ['press', 1], gel: ['smear', 1], 'need-gel': ['smear', 0], roll: ['unroll', 1], 'need-roll': ['unroll', 0], thread: ['thread', 1], 'need-thread': ['thread', 0], 'need-needle': ['thread', 0], 'zip-a': ['tieTop', 1], 'zip-b': ['tieEnd', 1] };
function taState() {
  const p = player;
  if (p.carry) {
    if (p.charge >= P.throwMin) return { key: 'throw', tone: 'throw', ready: true, th: null };
    const th = toolHint(p, LEVEL), m = p.carry.knotted && (th === 'roll' || th === 'need-roll') ? ['hangrope', th === 'roll' ? 1 : 0] : TA_MAP[th];   // R41: knyttet håndkle-tau heter HENG TAU
    if (m) return { key: m[0], tone: 'use', ready: !!m[1], th };
    const sp = findPlaceSpot(p, LEVEL);
    return { key: sp && sp.c.type !== 'floor' && sp.min[1] > p.y + 0.2 ? 'place' : 'drop', tone: 'drop', ready: true, th, sp };
  }
  return { key: 'take', tone: 'take', ready: !!findCarryTarget(p, LEVEL), th: null };
}
let taPrev = '';
function updateCarryButton() {
  const s = taState(), label = T('btn.' + s.key), sig = `${s.key}|${s.tone}|${s.ready}|${lang}`;
  if (TOUCH) TA = label;
  if (sig === taPrev) return; taPrev = sig;
  const tb = $('btnCarry'); tb.textContent = label; tb.className = `tbtn ${s.tone} ${s.ready ? 'ready' : 'dim'}${label.length > 6 ? ' long' : ''}`;
}
function applyLang() { GREP = TOUCH ? T('btn.grab') : 'Shift/E'; $('btnGrab').textContent = T('btn.grab'); $('btnJump').textContent = T('btn.jump'); taPrev = ''; if (typeof player !== 'undefined') updateCarryButton(); }
// navn på ting: fra kind (norsk/engelsk), ellers lappen eller id-en
const nameOfId = (id) => kindName(LEVEL.bodies?.find((b) => b.id === id)?.kind ?? LEVEL.boxes.find((b) => b.id === id)?.kind, nice(id));
const nameOfObj = (o) => kindName(o?.kind, nice(o?.id));

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- fortelling (R8): kort tekst ved nivåstart og en avslutning etter nivå 6 (story.js) ----------
function showIntro() {
  const n = levelInfo?.n; if (!shouldShowIntro({ n, enabled: storyOn, resumed, seen: store.get(`tlm.storySeen.${levelId}`, false) })) { if (!resumed) introBegin(); return; }
  menuOpen = true; keys.clear(); touch.x = touch.y = 0; touch.jump = touch.grab = touch.carry = false; logEv('fortelling', `nivå ${n}`);
  showCard($('story'), { art: heroArt('hi'), title: T(`story.title.${n}`), text: T(`story.${n}`), btn: T('story.go'), skip: T('story.skip'), onDone: () => { menuOpen = false; store.set(`tlm.storySeen.${levelId}`, true); introBegin(); } });
}
function showEnding() {
  logEv('avslutning');
  const tt = totals(store.get('tlm.runs', {}));
  showCard($('story'), { art: `<div class="sconf">${Array.from({ length: 22 }, (_, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${(i % 7) * 0.12}s;background:${['#ffd9a0', '#e85d4a', '#9fe0c8', '#8fb4ff'][i % 4]}"></i>`).join('')}</div>` + heroArt('cheer'), title: T('story.endTitle'), text: T('story.end'), extra: `<b class="stot">${T('story.endTotal')}</b>${endHTML(tt, T)}`, btn: T('story.endBtn'), onDone: () => { gameDone = true; clearAllProgress(); store.set('tlm.done', true); store.set('tlm.cleared', {}); store.set('tlm.level', 'bad'); $('win').classList.add('hide'); showStart(); } });
}

// ---------- startskjerm (v0.73): Nytt spill · Fortsett · Innstillinger · Avslutt ----------
// Vises når siden åpnes uten ?level=… (en lenke med brett, «Neste nivå» og brettvelgeren hopper over den). Spillet står stille bak.
let startScreenOn = store.get('tlm.startscreen', true), menuOpen = false;
const startWanted = !CINE.on && startScreenOn && levelParam === null && new URLSearchParams(location.search).get('start') !== '0';
let gameDone = store.get('tlm.done', false);   // satt etter avslutningen: menyen viser da bare Nytt spill
const hasProgress = () => !gameDone && (resumed || clock > 4 || levelId !== 'bad' || Object.keys(normCleared(store.get('tlm.cleared', {}))).length > 0);
const svView = createStorageView({ $, lang: () => lang, logEv });   // R86: bekreftelse før noe slettes
const saveWarn = () => (disk.status().failures > 0 || !disk.status().available ? `<p class="tag" id="mSaveWarn" style="color:#ffb4a8">${sv(lang, 'sv.fail')}</p>` : '');
function clearAllProgress() { disk.keys('tlm.').filter((k) => isNewGameKey(k) && k !== 'tlm.cleared').forEach((k) => disk.remove(k)); }   // R86: «Nytt spill» (tlm.cleared settes tom av kalleren)
function hideStart() { statsLevelStart(); menuOpen = false; $('start').classList.add('hide'); $('start').classList.remove('dfl'); document.body.classList.remove('instart'); }
// R69: vanskelighet. Bare hjelpen endres (tabellen i difficulty.js). carry: ta fremgangen med til det nye nivåets nøkkel (endring midt i et brett).
const dv = createDifficultyView({ $, lang: () => lang, logEv });
function applyDifficulty(v, { carry = false, why = 'valgt' } = {}) {
  const nv = normDiff(v), old = difficulty;
  if (carry && nv !== old) { saveProgress(); const cur = store.get(progKey, null); progKey = diffProgKey(levelId, LEVEL.rev, nv); if (cur && store.get(progKey, null) === null) store.set(progKey, cur); }
  else progKey = diffProgKey(levelId, LEVEL.rev, nv);
  difficulty = nv; DIF = diffProfile(nv); store.set('tlm.difficulty', nv);
  runDiffMin = carry ? Math.min(runDiffMin, DIFFS.indexOf(nv)) : DIFFS.indexOf(nv);
  applyUiFlags(); goalView?.setOn(goalsOn && DIF.subgoalText);
  if (!(introMarkOn && DIF.introMark)) introV.markerOn(false);
  if (!DIF.introHint) introV.hideHint();
  if (DIF.helpCards === 'off' && infoOpen) closeInfo();
  if (!DIF.minimap) ov.skip?.();
  logEv('vanskelighet', `${why}: ${old === nv ? nv : old + ' til ' + nv} · av: ${offElements(nv).join(', ') || 'ingenting'}`);
}
// teller synlige hjelpeelementer akkurat nå (test og rapport): DOM og 3D. Ekspert skal gi 0 i alt.
function helpVisibleCount() {
  const vis = (el) => !!el && el.style.display !== 'none' && el.style.visibility !== 'hidden' && !el.classList.contains('hide') && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  const d = mv?.debug?.() || {}, n = {
    kompass: vis(compEl) ? 1 : 0, gulvpil: goalArrow.visible ? 1 : 0, kantpil: mv?.edgeOn?.() ? 1 : 0, kantmerke: guideV.state().edge ? 1 : 0, ring: guideV.state().ghost ? 1 : 0,
    markorGrep: d.gripsShown || 0, markorListe: markPlan.on ? markPlan.order.length : 0, introPil: introV.markerShown?.() ? 1 : 0, landingsring: landRing.visible ? 1 : 0,
    minikart: vis($('minimap')) ? 1 : 0, kartknapp: vis($('btnMap')) ? 1 : 0, info: vis($('infotab')) ? 1 : 0, infoKort: infoCard.classList.contains('show') ? 1 : 0, infoMerker: labels.filter((l) => l.sp.visible).length,
    delmaal: vis($('goals')) ? 1 : 0, introHint: vis($('introhint')) ? 1 : 0, tastehjelp: vis($('help')) && !DIF.hintBubbles ? 1 : 0,
    baandNeste: tb.isOn() && tb.current()?.kind === 'next' ? 1 : 0, baandHint: tb.isOn() && tb.current()?.kind === 'hint' ? 1 : 0, baandDelmaal: tb.isOn() && tb.current()?.kind === 'goal' ? 1 : 0,
  };
  n.sum = Object.values(n).reduce((a, b) => a + b, 0); return n;
}
const badgeLine = () => { const t = badgeTotals(store, LEVELS.filter((l) => l.n).map((l) => l.id)); return t.total ? `🥉${t.beginner} 🥈${t.medium} 🥇${t.expert}` : ''; };
// «Avslutt til meny»: lagrer og går til startskjermen. Virker fra spill, bygg, oversikt, boss-kamp og målskjerm.
function quitToMenu(from = 'meny') {
  logEv('avslutt til meny', from); statsLevelEnd('quit');
  if (bld.active) bld.close('meny');
  if (ov.active) ov.skip();
  if (showMe.phase !== 'idle') skipShowMe(showMe);
  $('panel').classList.add('hide'); closeMore(); if (infoOpen) closeInfo();
  showStart({ saved: true });
}
function newGame(diff = difficulty) {
  clearAllProgress(); logEv('nytt spill', diff);
  gameDone = false; store.set('tlm.done', false);
  applyDifficulty(diff, { why: 'nytt spill' });
  if (levelId === 'bad') { restartAll(); hideStart(); toast('Nytt spill'); resumed = false; showIntro(); }
  else { noSave = true; goLevel('bad'); }                                  // laster nivå 1 på nytt (noSave: pagehide skal ikke skrive tilbake gammel fremgang)
}
// «Velg brett» og «Spill igjen»: spill et brett fra start på valgt vanskelighet uten å slette annen fremgang
function playFresh(id, diff) {
  logEv('velg brett', `${id} på ${diff}`); store.set('tlm.difficulty', normDiff(diff)); store.set('tlm.level', id);
  if (id === levelId) { applyDifficulty(diff, { why: 'velg brett' }); restartAll(); hideStart(); resumed = false; showIntro(); return; }
  saveProgress(); location.search = `?level=${id}&fresh=1`;
}
function playAgain() {
  $('start').classList.remove('hide'); document.body.classList.add('instart'); menuOpen = true;
  dv.pickDifficulty({ title: dft(lang, 'df.again'), allowed: DIFFS.slice(Math.max(0, bestBadge(store, levelId) ? DIFFS.indexOf(bestBadge(store, levelId)) : 0)), current: difficulty, onPick: (d) => { applyDifficulty(d, { why: 'spill igjen' }); restartAll(); hideStart(); resumed = false; showIntro(); }, onBack: () => { hideStart(); } });
}
function quitGame() {
  saveProgress(); logEv('avslutt');
  $('start').innerHTML = `<h1>${T('menu.byeTitle')}</h1><p class="tag">${T('menu.byeText')}</p><button class="mbtn" id="mBack">${T('menu.back')}</button>`;
  $('mBack').onclick = showStart;
  try { window.close(); } catch { /* nettlesere lar bare skript-åpnede vinduer lukkes: da blir takkesiden stående */ }
}
// R80: Rettelser-menyen. fixList huskes i økta så tallet på knappen står der med en gang; hentes på nytt hver gang startskjermen vises.
let fixList = [];
const testerCode = () => store.get('tlm.tcode', '');
async function fetchFixes() { const code = testerCode(); if (!validCode(code)) return null; const got = await fetchInbox(code); if (got) fixList = got.replies; return got ? fixList : null; }
function fixesBtnRefresh() { const b = $('mFix'); if (b) b.textContent = buttonLabel(uncheckedCount(fixList)); }
function openFixes() {
  const el = $('start');
  showFixes(el, { list: fixList, version: VERSION, levels: LEVELS, logEv, refresh: fetchFixes, check: (id, res, note) => checkReply(testerCode(), id, res, note), onChange: (l) => { fixList = l; },
    goTo: (fix) => { saveProgress(); location.href = goUrl(location.href, fix); }, update: async () => { await verView.check({ force: true, why: 'rettelser' }); await verView.update(); }, onBack: () => showStart() });
}
// R83: NYTT-menyen. Avkryssinger lagres alltid lokalt (localStorage) og sendes til serveren når tester-kode og nett finnes; aldri feil uten nett.
let chgServer = {};
const chgLocal = () => chg.parseLocal(JSON.stringify(store.get(chg.LOCAL_KEY, {})));
const chgRows = () => chg.buildRows(CHANGES, chg.mergeChecks(chgServer, chgLocal()));
function chgBtnRefresh() { const b = $('mChg'); if (b) b.textContent = chg.buttonLabel(uncheckedCount(chgRows())); }
async function fetchChanges() {
  const code = testerCode(); if (!validCode(code)) return null;
  const d = await fetchChangeChecks(code); if (!d) return null;
  chgServer = parseChangeChecks(d);
  for (const p of pendingChecks(chgServer, chgLocal())) {   // synk det som ble krysset av uten kode eller nett
    const lv = (CHANGES.find((c) => c.id === p.id) || {}).level || '';
    if (await checkChange(code, p.id, p.check, p.note, VERSION, lv)) chgServer[p.id] = { check: p.check, note: p.note, checked_at: p.checked_at };
  }
  return chgRows();
}
function openChanges() {
  const code = testerCode(), cfg = { title: 'Nytt', tag: 'nytt', word: 'Kom', intro: (n) => (n ? `${n} nye ting å prøve. Trykk GÅ DIT, prøv det, og si om det fungerer.` : 'Ingenting nytt å sjekke akkurat nå.'), emptyA: 'Ingenting nytt å sjekke her.', emptyB: 'Ingenting sjekket å vise.' };
  showFixes($('start'), { cfg, list: chgRows(), version: VERSION, levels: LEVELS, logEv, refresh: fetchChanges,
    check: async (id, res, note) => {
      const at = new Date().toISOString(), cur = chgLocal(), v = { check: res, note: res === 'fail' ? String(note || '').slice(0, 200) : '', checked_at: at };
      store.set(chg.LOCAL_KEY, { ...cur, [id]: v });   // lokalt først: virker uten kode og uten nett
      if (validCode(testerCode())) { try { if (await checkChange(testerCode(), id, res, v.note, VERSION, (CHANGES.find((c) => c.id === id) || {}).level || '')) chgServer[id] = v; } catch { /* sendes ved neste henting */ } }
      return true;
    },
    onChange: () => chgBtnRefresh(),
    goTo: (fix) => { saveProgress(); location.href = goUrl(location.href, fix); }, update: async () => { await verView.check({ force: true, why: 'nytt' }); await verView.update(); }, onBack: () => showStart() });
}
// R95: Byggeskolen i menyen (byggeskole_logic.js, byggeskole_view.js): valgfri, men anbefalt. Ingen sperre foran byggebrettene.
const schoolV = createSchoolView({ T, logEv });
const schoolProg = () => schoolProgress(passRead(store, SCHOOL.levelId));
function openSchool(from) {
  logEv('byggeskole', `åpnet fra ${from}`); schoolMark(store, { opened: true }); saveProgress();
  try { location.href = schoolUrl(location.pathname); } catch { location.search = `?level=${SCHOOL.levelId}&skole=1`; }
}
function schoolOnBuildOpen(id) {
  if (CINE.on) return;
  if (levelId === SCHOOL.levelId) { if (!schoolRead(store).opened) { schoolMark(store, { opened: true }); logEv('byggeskole', 'byggeskjermen åpnet i skolen'); } return; }
  if (levelId === 'badebro') {   // R119: Badebro har sitt eget kort («Prøv Byggeskolen · Fagverk først»); det vanlige første-møte-kortet gjelder ikke her
    const shown = store.get('tlm.fagverkcard.seen', '');
    if (!fagverkCardShould({ level: levelId, difficulty, on: fagverkCardOn, cinema: CINE.on, passed: [...passRead(store, SCHOOL.levelId)], shown })) return;
    store.set('tlm.fagverkcard.seen', 'skipped'); logEv('byggeskole', 'fagverk-kort vist (badebro)');
    schoolV.showFagverk({ onTry: () => { store.set('tlm.fagverkcard.seen', 'tried'); logEv('byggeskole', 'fagverk-kort: til Byggeskolen'); openSchool('fagverk'); }, onSkip: () => logEv('byggeskole', 'fagverk-kort: hoppet over') });
    return;
  }
  const state = schoolRead(store);
  if (!schoolCardShould({ level: levelId, difficulty, on: schoolCardOn, cinema: CINE.on, state, prog: schoolProg() })) return;
  schoolMark(store, { card: 'skipped' });   // vises bare én gang, uansett hva spilleren gjør
  logEv('byggeskole', `første-møte-kort vist (${levelId})`);
  schoolV.showCard({ onTry: () => { schoolMark(store, { card: 'tried' }); logEv('byggeskole', 'første-møte-kort: prøv skolen'); openSchool('kort'); }, onSkip: () => logEv('byggeskole', 'første-møte-kort: hoppet over') });
}
function schoolOnPass(id, r) {
  const prog = schoolProg(); if (levelId !== SCHOOL.levelId) return;
  if (r?.first) logEv('byggeskole', `sted bestått ${id} (${prog.n}/${prog.total})`);
  if (schoolDoneShould({ prog, state: schoolRead(store) })) {
    schoolMark(store, { done: true }); const acc = unlockSchool(store); if (acc) refreshAccessories?.();
    logEv('byggeskole', `klar: alle ${prog.total} steder bestått${acc ? `, ${acc.id} låst opp` : ''}`);
    schoolV.showDone({ onOk: () => {} });
  }
}
function showStart(o = {}) {
  menuOpen = true; keys.clear(); touch.x = touch.y = 0; touch.jump = touch.grab = touch.carry = false; saveProgress();
  if (document.pointerLockElement) document.exitPointerLock();
  const has = hasProgress(), bl = badgeLine(), dn = dft(lang, 'df.' + difficulty);
  $('start').classList.remove('dfl', 'fxl');
  const plan = menuPlan({ has, firstRun: isFirstRun(normCleared(store.get('tlm.cleared', {}))), on: firstRunOn }), coll = plan.collapse;   // R97: første gang: én tydelig START, resten under «mer»
  const resume = has ? resumeLine({ label: levelLabel, diff: dn, clock: clock > 4 ? clock : (normProgress(store.get(progKey, null))?.clock || 0) }) : T('menu.nosave');
  const bContinue = `<button class="mbtn ${coll ? 'big' : ''}" id="mCont" ${has ? '' : 'disabled'}>${coll ? ft(lang, 'fr.continue') : T('menu.continue')}<small>${resume}</small></button>`;
  const bStart = `<button class="mbtn big" id="mStart">${ft(lang, 'fr.start')}</button>`;
  const rest = `<button class="mbtn ${has ? 'sec' : ''}" id="mNew">${T('menu.new')}</button>
    <button class="mbtn sec" id="mLevels">${dft(lang, 'df.pick')}${bl ? `<small>${bl}</small>` : ''}</button>
    ${CINE.on ? '' : schoolMenuHtml(T, schoolProg())}
    <button class="mbtn sec" id="mToys">🧸 ${rwT(lang, 'rw.closet')}</button>
    ${menuVisible(testerCode(), validCode) ? `<div class="mrow"><button class="mbtn sec" id="mChg">${chg.buttonLabel(uncheckedCount(chgRows()))}</button><button class="mbtn sec" id="mFix">${buttonLabel(uncheckedCount(fixList))}</button></div>` : `<button class="mbtn sec" id="mChg">${chg.buttonLabel(uncheckedCount(chgRows()))}</button>`}
    <button class="mbtn sec" id="mSet">${T('menu.settings')}</button>
    <button class="mbtn sec" id="mQuit">${T('menu.quit')}</button>`;
  $('start').innerHTML = `<h1>tinylittleme</h1><p class="tag">${o.saved ? '✓ ' + dft(lang, 'df.saved') : T('menu.tagline')}</p>${saveWarn()}
    ${coll ? `${has ? bContinue : bStart}<button class="mmore" id="mMore">${ft(lang, 'fr.more')} ▾</button><div class="mfold" id="mFold">${rest}</div>` : `${bContinue}${rest}`}
    <div class="ver">v${VERSION}</div>`;
  $('start').classList.remove('hide'); document.body.classList.add('instart');
  if ($('mCont')) $('mCont').onclick = () => { unlockAudio(); hideStart(); logEv('fortsett'); };
  if ($('mStart')) $('mStart').onclick = () => { unlockAudio(); logEv('forstekjoring', 'START valgt (ny spiller, ' + DEFAULT_DIFF + ')'); newGame(DEFAULT_DIFF); };   // R97: ingen vanskelighetsvalg første gang (⚙ → Spill → Vanskelighet)
  if ($('mMore')) $('mMore').onclick = () => { const open = $('mFold').classList.toggle('open'); $('mMore').textContent = `${ft(lang, open ? 'fr.less' : 'fr.more')} ${open ? '▴' : '▾'}`; };
  $('mNew').onclick = () => {
    unlockAudio();
    const pick = () => dv.pickDifficulty({ current: difficulty, onPick: (d) => newGame(d), onBack: showStart });   // R69: velg vanskelighet først
    if (!has || !confirmNewOn) { pick(); return; }
    svView.confirmWipe({ kind: 'new', plan: wipePlan('new', disk.keys('tlm.'), store), onCancel: showStart, onOk: pick });   // R86: vis hva som slettes FØR noe slettes (selve slettingen skjer i newGame)
  };
  $('mLevels').onclick = () => { unlockAudio(); dv.pickLevel({ levels: LEVELS, st: store, cleared: store.get('tlm.cleared', {}), current: difficulty, onPlay: (id, d) => { unlockAudio(); playFresh(id, d); }, onBack: showStart, ...(CINE.on ? {} : { school: { label: T('school.label'), sub: T('school.sub', { n: schoolProg().n, total: schoolProg().total }), onOpen: () => openSchool('velg brett') } }) }); };
  if ($('mSchool')) $('mSchool').onclick = () => { unlockAudio(); openSchool('meny'); };
  $('mToys').onclick = () => { logEv('belønning', 'lekerom åpnet'); showCloset($('start'), { st: store, lang, all: rewardsAll, levels: LEVELS, onChange: (e) => { refreshAccessories(); logEv('belønning', `valgt ${Object.values(e).filter(Boolean).join(',') || 'ingen'}`); }, onBack: showStart }); };
  $('mChg').onclick = () => { logEv('nytt', 'knapp'); openChanges(); };
  if (validCode(testerCode())) { const tryChg = (left) => fetchChanges().then((l) => { if (l) chgBtnRefresh(); else if (left > 0) setTimeout(() => { if ($('mChg')) tryChg(left - 1); }, 8000); }).catch(() => {}); tryChg(2); }   // stille ved feil, med nytt forsøk som Rettelser
  if ($('mFix')) { $('mFix').onclick = openFixes; const tryFx = (left) => fetchFixes().then((l) => { if (l) fixesBtnRefresh(); else if (left > 0) setTimeout(() => { if ($('mFix')) tryFx(left - 1); }, 8000); }).catch(() => {}); tryFx(2); }   // stille: ingen nett eller treg start gir nytt forsøk, ikke feil
  $('mSet').onclick = () => { buildPanel(); $('help').classList.add('hide'); $('panel').classList.remove('hide'); };
  $('mQuit').onclick = quitGame;
}
// R80: «GÅ DIT» i Rettelser-menyen åpner ?level=<id>&go=x,y,z: figuren settes på fast grunn et par enheter fra stedet, med kameraet mot det. Ingen fysikk endres.
{
  const spot = parseGo(location.search);
  if (spot) {
    try { const u = new URL(location.href); u.searchParams.delete('go'); history.replaceState(null, '', u.pathname + u.search); } catch { /* ingen historikk */ }
    const pl = safePlacement(spot, LEVEL);
    if (pl) {
      resetPlayer(player, pl.x, pl.y, pl.z); cam.yaw = pl.yaw; camFocusY = null; cam.target.set(pl.x, pl.y + 0.62, pl.z); resumed = true;   // resumed: hopp over fortelling og intro
      logEv('rettelser', `ankom ${levelId} ved ${spot.x.toFixed(1)},${spot.y.toFixed(1)},${spot.z.toFixed(1)}: stod ${pl.dist} unna`);
      setTimeout(() => toast('Her ble det rettet. Prøv stedet, og kryss av i RETTELSER.'), 1200);
    } else { logEv('rettelser', `ankom ${levelId}: ingen trygg plass ved stedet, vanlig start`); setTimeout(() => toast('Fant ikke stedet, så du starter vanlig'), 1200); }
  }
}
if (startWanted) showStart(); else { statsLevelStart(); showIntro(); }

applyLang();
logEv('plattform', `${platform.kind} (auto: ${platform.auto}, coarse=${platform.coarse}, fine=${platform.fine}, hover=${platform.hover}, touch=${platform.touchPoints})`);
if (!TOUCH && !store.get('tlm.pcseen2', false)) { store.set('tlm.pcseen2', true); setTimeout(() => toast('PC: klikk i bildet for å styre blikket med musa (Esc slipper). WASD går, mellomrom hopper, venstre museknapp eller F tar, høyre eller E griper.'), 2500); }
// v0.97: forvarming. three kompilerer shadere og laster opp teksturer først når noe kommer i syne, som gir et plutselig «stopp» (100-300 ms) første gang du ser nytt område eller en effekt. Gjør alt på forhånd, mens introskjermen vises
const shw = createShaderWatch(() => programCount(renderer), () => programKeys(renderer));   // R35: teller shaderprogram etter forvarmingen
function warmUp() {
  const t0 = performance.now(); const hidden = [];
  try {
    scene.traverse((o) => { if (!o.visible && !o.isLight) { hidden.push(o); o.visible = true; } });
    const seen = new Set();
    scene.traverse((o) => { for (const m of [].concat(o.material || [])) for (const k of ['map', 'emissiveMap', 'roughnessMap', 'normalMap', 'bumpMap', 'alphaMap', 'aoMap']) { const t = m[k]; if (t && !seen.has(t)) { seen.add(t); try { renderer.initTexture(t); } catch { /* ikke støttet */ } } } });
    renderer.compile(scene, camera);
    if (shaderWarm) { warmRender(renderer, scene, camera); const nf = warmFades(fadeEntries, (e) => { setFadeMats(e, true); for (const c of e.clone.values()) for (const mt of [].concat(c)) { mt.opacity = fadeOp; mt.depthWrite = false; } }, (e) => setFadeMats(e, false), () => warmRender(renderer, scene, camera)); logEv('forvarming', `utoning: ${nf} ting`); }   // R35b: også de gjennomsiktige utoningskopiene
    // R35: compile() tar ikke med variantene i gjennomsiktighetspasset (glass, målflasken): én full tegning gjør det
  } catch (e) { logEv('forvarming feilet', String(e.message || e)); }
  for (const o of hidden) o.visible = false;
  shw.mark();
  logEv('forvarming', `${Math.round(performance.now() - t0)} ms (shadere og teksturer klargjort) · ${shw.base} shadere`);
}
// R94: forvarming i små steg. Hvert steg (noen teksturer, en bit av scenen, noen utoningskopier) kjøres i sitt eget bilde, så ingen bilder blir lange (før: ett langt stopp, verste bilde 832 ms i Kjøkken).
function warmUpSpread() {
  const t0 = performance.now(); const hiddenAll = [];
  scene.traverse((o) => { if (!o.visible && !o.isLight) hiddenAll.push(o); });
  const texs = [], seen = new Set(), items = [];
  scene.traverse((o) => { if (o.isMesh || o.isPoints) items.push(o); for (const m of [].concat(o.material || [])) for (const k of ['map', 'emissiveMap', 'roughnessMap', 'normalMap', 'bumpMap', 'alphaMap', 'aoMap']) { const t = m[k]; if (t && !seen.has(t.source || t)) { seen.add(t.source || t); texs.push(t); } } });
  const progKey = (o) => [].concat(o.material || []).map((mt) => [mt.type, !!mt.map, !!mt.normalMap, !!mt.roughnessMap, !!mt.bumpMap, !!mt.alphaMap, mt.vertexColors, mt.transparent, mt.side, mt.flatShading, o.receiveShadow, o.isPoints, mt.customProgramCacheKey ? mt.customProgramCacheKey() : ''].join(',')).join('|');   // omtrent shadernøkkelen
  const plan = planWarm({ textures: texs.length, per: 12, chunks: chunkByKey(items.map(progKey), { maxKeys: 3, maxItems: 80 }), fades: shaderWarm && fadeEntries.length > 0 });
  const FSLICE = 6; warmProg.i = 0; warmProg.n = plan.length - 1;
  const withVisible = (only, fn) => {             // vis bare `only` (og lys): tegn: gjenopprett
    const was = new Map(); const hidden = hiddenAll.filter((o) => !o.visible);
    for (const o of hidden) o.visible = true;
    if (only) for (const o of items) { was.set(o, o.visible); if (!only.has(o)) o.visible = false; }
    const fc = []; scene.traverse((o) => { if (o.frustumCulled) { fc.push(o); o.frustumCulled = false; } });
    try { fn(); } finally { for (const o of fc) o.frustumCulled = true; for (const [o, v] of was) o.visible = v; for (const o of hidden) o.visible = false; }
  };
  const run = (s) => {
    warmProg.i++;
    if (s.kind === 'tex') { for (const t of texs.slice(s.from, s.to)) { try { renderer.initTexture(t); } catch { /* ikke støttet */ } } }
    else if (s.kind === 'draw') { const only = new Set(s.idx.map((i) => items[i])); withVisible(only, () => { renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera); }); }
    else if (s.kind === 'fades') {
      const es = fadeEntries.slice(); const done = []; let fi = 0;
      try { while (fi < es.length) { const part = es.slice(fi, fi + FSLICE); fi += FSLICE; const only = new Set(); for (const e of part) { for (const o of e.clone.keys()) only.add(o); }
        for (const e of part) { setFadeMats(e, true); done.push(e); for (const c of e.clone.values()) for (const mt of [].concat(c)) { mt.opacity = fadeOp; mt.depthWrite = false; } }
        withVisible(only, () => { renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera); });
        for (const e of part) { setFadeMats(e, false); } }
      } finally { for (const e of done) { setFadeMats(e, false); if (e.clone && e.clone.clear) e.clone.clear(); if (e.orig && e.orig.clear) e.orig.clear(); } }
      logEv('forvarming', `utoning: ${done.length} ting`);
    }
  };
  runSteps(plan.filter((s) => s.kind !== 'done'), run, (fn) => requestAnimationFrame(() => setTimeout(fn, 0)), (r) => {
    renderer.shadowMap.needsUpdate = true; shPacer.force(); shw.mark();
    warmInfo = { ...r, ms: Math.round(performance.now() - t0), shaders: shw.base };
    logEv('forvarming', `${warmInfo.ms} ms i ${r.steps} steg, verste steg ${Math.round(r.worst)} ms (${r.worstKind}) · ${shw.base} shadere${r.error ? ' · FEIL ' + r.error : ''}`);
    logEv('ytelse', `oppstart: verste steg ${Math.round(r.worst)} ms (${r.worstKind}), ${r.steps} steg`);
  });
}
let warmInfo = null; const warmProg = { i: 0, n: 0 };
requestAnimationFrame(() => setTimeout(warmSpread ? warmUpSpread : warmUp, 50));
let lastHitch = -99, shwN = 0;
let last = performance.now();
function frame(now) {
  if (CINE.on) { cine.frame(now); requestAnimationFrame(frame); return; }   // R68: kinomodus: skriptet styrer tid og bilde; før det tar over går spillet vanlig (med skjult UI)
  const raw = now - last, dt = Math.max(0, Math.min(0.05, raw / 1000)); last = now;      // aldri negativ tid (første bilde kan ha et tidsstempel fra før oppstarten var ferdig)
  if (raw > 90 && raw < 3000 && mode === 'play' && !menuOpen && clock - lastHitch > 2) {          // v0.97: hakking logges med det som skjedde like før, så vi ser årsaken i neste rapport
    lastHitch = clock; const near = evLog.filter((e) => e.c >= clock - 1.5 && e.type !== 'hakk' && e.type !== 'lav fps').slice(-3).map((e) => e.type).join(', ');
    logEv('hakk', `${Math.round(raw)} ms${near ? ' etter: ' + near : ''} · ${renderer.info.programs?.length ?? '?'} shadere, ${renderer.info.render.calls} tegnekall`);
  }
  if ((++shwN & 15) === 0) { const ev = shw.tick(); if (ev) { const near = evLog.filter((e) => e.c >= clock - 1.5 && e.type !== 'hakk' && e.type !== 'shadere').slice(-3).map((e) => e.type).join(', '); logEv('shadere', `${ev.from} til ${ev.to} (start ${ev.base})${ev.keys && ev.keys.length ? ' nye: ' + ev.keys.join(' ') : ''}${near ? ' etter: ' + near : ''}`); } }   // R35: hver ny shader etter forvarmingen logges med det som skjedde like før
  if (raw > 0 && raw < 2000) { perf.n++; perf.sum += raw; perf.worst = Math.max(perf.worst, raw); perf.win += raw; perf.winN++; if (perf.win > 500) { if (fpsOn) $('fps').textContent = `${Math.round(1000 * perf.winN / perf.win)} fps${renderer.getPixelRatio() < basePr - 0.01 ? ' · ' + renderer.getPixelRatio().toFixed(2) + '×' : ''}`; perf.win = perf.winN = 0; } }
  { const fr = fpsW.push(raw); if (fr && mode === 'play' && !menuOpen && fr.low && (fr.lowRuns === 1 || fr.lowRuns % 10 === 0)) logEv('lav fps', `${fr.fps.toFixed(0)} fps, verste ${Math.round(fr.worst)} ms`);
    if (mode === 'play' && !menuOpen) autoQC.feed(raw);
    const dq = fr && mode === 'play' && !menuOpen ? autoQC.decide(fr, renderer.getPixelRatio(), autoQ, basePr) : null;
    { const lp = fr && mode === 'play' && !menuOpen ? lowP.decide(fr, renderer.getPixelRatio(), 1, lowMode, autoQC.warm) : null; if (lp !== null) { applyLowProfile(lp); if (lp && lowMode === 'auto') toast('Lav profil på for jevnere bilde. ⚙ → Test → Lav profil styrer det', true); } }
    if (dq) { const pr = renderer.getPixelRatio(); renderer.setPixelRatio(dq.pr); renderer.setSize(innerWidth, innerHeight, false); qSteps++; logEv(dq.dir === 'down' ? 'kvalitet ned' : 'kvalitet opp', `oppløsning ${pr.toFixed(2)}× til ${dq.pr.toFixed(2)}× (${fr.fps.toFixed(0)} fps)`); logEv('ytelse', `${levelId}: oppløsning ${dq.dir === 'down' ? 'ned' : 'opp'} ${pr.toFixed(2)}× til ${dq.pr.toFixed(2)}× · ${fr.fps.toFixed(0)} fps, verste ${Math.round(fr.worst)} ms · ${renderer.info.render.calls} tegnekall, ${renderer.info.render.triangles} trekanter`); if (dq.dir === 'down' && !qToasted) { qToasted = true; toast('Lavere oppløsning for jevnere bilde. ⚙ → Test → Oppløsning styrer det', true); } } }   // én melding per økt, nede ved kanten så den ikke dekker målpilen; resten logges bare
  if (!window.__paused && !menuOpen && !ov.active && !bld.active) update(dt);   // R20: spillet venter mens oversikten vises
  showMeFrame(dt); stepCamAnim(dt); compassFrame(now); floodFrame(now, dt);
  render(now, dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__markDrag = () => { lastDrag = performance.now() / 1000; };   // testing: som om du nettopp dro i kameraet
window.__camDbg = () => ({ camLook, camPitchBias, camLift, camUpTilt, cur: cam.cur, pitch: cam.pitch });
window.__fadeCount = () => fadeEntries.filter((e) => e.t > 0.5).length;
window.__fadeIds = () => fadeEntries.filter((e) => e.t > 0.01).map((e) => e.boxes.map((b) => b.id).join('+') + ':' + e.t.toFixed(2));
const cine = createCinema({ state: CINE, rng: cineRnd || { reseed() {} }, camera, canvas: renderer.domElement, cam, player, update, render, bld, settings: () => SETTINGS, logEv, onFollow: (h) => { cineH = h; }, snapCam: () => { camFocusY = null; }, isPlay: () => mode === 'play' && !won && !menuOpen && !ov.active, levelId: () => levelId, version: VERSION, THREE, scene, hero, onHeroScale: (k) => { cineHS = k; } });   // R68: kinomodus (cinema_view.js)
if (CINE.on) bld.showMarks(false);   // de gule rammene rundt byggesteder skjules (gripMarks skjules i render())
window.__game = { fr: { log: frLog, stat: frStat, hints: frHints, blind: frBlind, view: frV, active: frAct }, cine, diff: { get: () => difficulty, set: (v) => applyDifficulty(v, { carry: true, why: 'test' }), profile: () => DIF, count: helpVisibleCount, quit: quitToMenu, start: showStart, key: () => progKey, tb }, markPlan: () => markPlan, mv, markers: { goalInfo: () => goalInfo, goalDir: () => goalDir }, way: { v: wayV, s: wayS, quest: () => questNow(nextTarget()), tap: (src = 'linje') => { questTapUntil = performance.now() + WAY.tapMs; logEv('maalvei', src === 'ikon' ? 'trykk på mål-ikonet' : 'trykk på oppdragslinjen'); } }, guide: { v: guideV, showMe, stall, aimOf: guideAimOf, nextTarget, tick: (dt) => { showMeFrame(dt); stepCamAnim(dt); } }, shw, fadeAll: (on) => { for (const e of fadeEntries) { setFadeMats(e, on); if (on) for (const c of e.clone.values()) for (const mt of [].concat(c)) mt.opacity = fadeOp; } return fadeEntries.length; }, programCount: () => programCount(renderer), setGoalFlag: (f) => setGoalFlag(LEVEL, f), mv, ov, bld, doSave, variant, renderer, scene, perfStats: () => ({ ...sceneStats(renderer, scene), low: lowOn, merged: perfMerge, shadow: shadowStats(), warm: warmInfo, warmProg }), shCull, shPacer, sun, setLow: (v) => { lowMode = v; lowP.decide(null, 9, 1, v); if ((v === 'on') !== lowOn) applyLowProfile(v === 'on'); }, react, footSm, antMeshes, camera, goalArrow, goalArrowG, say, setMood, touch, get audio() { return audio; }, get music() { return music; }, get evLog() { return evLog; }, unlockAudio, player, LEVEL, P, save, stats, setMode, cam, planCam, restartAll, update, poseHero, animateHero, hero, tick: (n, dt = 1 / 60) => { for (let i = 0; i < n; i++) update(dt); } };   // tick: kjør spillogikk raskt (testing)
window.__game.verView = verView;   // R77: test-hekte
