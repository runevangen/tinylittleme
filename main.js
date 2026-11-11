import * as THREE from 'three';
import { RoomEnvironment } from './lib/RoomEnvironment.js';
import { createAudio, surfaceOf, SOUND_LIST } from './audio.js';
import { createMusic, themeFor, moodFor } from './music.js';
import { VERSION } from './version.js';
import { buildGroup, buildSingle, roundedBoxGeo, setAniso, buildAnt, buildCrumb, buildSpider, buildCarrier, buildDropCrumb } from './props.js';
import { initAnts, resetAnts, stepAnts } from './ants.js';
import { initPuzzles, resetPuzzles, restorePuzzles, stepPuzzles, puzzleOpenIds, puzzleTotal, puzzleTarget, carryingKeyNear, bridgeFarEnd, bridgeMid, nearBridge } from './puzzle.js';
import { buildPuzzleViews } from './puzzle_view.js';
import { buildFlag, buildGoalRing } from './markers.js';
import { shouldShowIntro, finishData, winHTML, showCard, heroSVG, totals, endHTML } from './story.js';
import { CRUMB, initCollect, resetCollect, stepCollect, crumbCount, crumbTotal, collectedIds, restoreCollected } from './collect.js';
import { makeLook } from './look.js';
import { makeAtmos } from './atmos.js';
import { applyGrade } from './grade_apply.js';
import { gradeTint } from './grade.js';
import { buildHero, RIG_S } from './hero.js';
import { createVoice } from './voice.js';
import { makeT, LANGS } from './i18n.js';
import { stepOffset, createReact, hangSway, fpsWatch, createAutoQ } from './polish.js';
import { followYaw, impactSpeed, landingClass } from './camera_util.js';
import { changedSettings, exportSettings, parseSettings, formatReport } from './settings_util.js';
import { surfaceBelow, returnBody, P, PRESETS, applyPreset, newPlayer, resetPlayer, step, freeAt, inHazard, initBodies, resetBodies, drainEvents, findCarryTarget, findPlaceSpot, throwVelocity, toolHint, zipNear, findReachTarget } from './physics.js';

const $ = (id) => document.getElementById(id);
// mobil (berøring) er hovedplattformen: tekst som nevner taster skal si knappene i stedet
// sjekk ved oppstart: mobil (berøring som hovedpeker) eller PC (mus/tastatur). Kan overstyres i ⚙ → Test.
const platform = (() => {
  const q = (s) => matchMedia(s).matches;
  let pref = 'auto'; try { pref = JSON.parse(localStorage.getItem('tlm.platform')) || 'auto'; } catch { /* privat modus */ }
  const auto = q('(pointer:coarse)') ? 'mobil' : 'pc';
  return { kind: pref === 'auto' ? auto : pref, pref, auto, coarse: q('(pointer:coarse)'), fine: q('(any-pointer:fine)'), hover: q('(hover:hover)'), touchPoints: navigator.maxTouchPoints || 0 };
})();
const TOUCH = platform.kind === 'mobil';
let pcButtons = true; try { pcButtons = JSON.parse(localStorage.getItem('tlm.pcbtns')) !== false; } catch { /* privat modus */ }
const applyPlatformUi = () => {
  document.body.classList.toggle('mobile', TOUCH); document.body.classList.toggle('pc', !TOUCH);
  document.body.classList.toggle('showbtns', TOUCH || pcButtons);
  if (!TOUCH) for (const [id, k] of [['btnCarry', 'F'], ['btnJump', 'Mellomrom'], ['btnGrab', 'E / Shift'], ['btnCenter', 'Z']]) { const el = document.getElementById(id); if (el) el.dataset.k = k; }
};
applyPlatformUi();
let lang = (() => { try { return JSON.parse(localStorage.getItem('tlm.lang')) || 'nb'; } catch { return 'nb'; } })();
const { T, name: kindName } = makeT(() => lang);
let GREP = TOUCH ? T('btn.grab') : 'Shift/E', TA = TOUCH ? T('btn.take') : 'F';          // TA følger knappen: sier den SMØR, heter den SMØR i teksten
const key = (k) => (TOUCH ? '' : ` (${k})`);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* privat modus e.l. */ } },
};

// Brett: ?level=bad (eller barnerom/kjokken/soverom …). Uten parameter åpnes brettet du sist spilte; første gang nivå 1.
// De seks første er nivåene (n = nivånummer, stigende vanskelighetsgrad; 4–6 er de samme rommene ommøblert); resten er ekstra- og prøverom.
const LEVELS = [
  { id: 'bad', n: 1, label: 'Nivå 1: Badet', short: 'Nivå 1 · Bad' },
  { id: 'barnerom', n: 2, label: 'Nivå 2: Barnerommet', short: 'Nivå 2 · Barnerom' },
  { id: 'kjokken', n: 3, label: 'Nivå 3: Kjøkkenet', short: 'Nivå 3 · Kjøkken' },
  { id: 'bad2', n: 4, label: 'Nivå 4: Badet, ommøblert', short: 'Nivå 4 · Bad' },
  { id: 'barnerom2', n: 5, label: 'Nivå 5: Barnerommet, ommøblert', short: 'Nivå 5 · Barnerom' },
  { id: 'kjokken2', n: 6, label: 'Nivå 6: Kjøkkenet, ryddet om', short: 'Nivå 6 · Kjøkken' },
  { id: 'soverom', label: 'Ekstra: Soverom (håndlaget)', short: 'Soverom' },
  { id: 'poc', label: 'Prøverom: flytte ting', short: 'Prøverom' },
  { id: 'klatring', label: 'Prøverom: klatrehjelp (stav, svamp, fall)', short: 'Klatring' },
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
store.set('tlm.level', levelId);
const levelInfo = LEVELS.find((l) => l.id === levelId), levelLabel = levelInfo?.short || levelId;
const nextLevel = levelInfo?.n ? LEVELS.find((l) => l.n === levelInfo.n + 1) : null;
const goLevel = (id) => { store.set('tlm.level', id); location.search = `?level=${id}`; };
const SUN = LEVEL.sun || [28, 60, -24];

// ---------- lyd ----------
// Web Audio kan først startes etter en brukerhandling (nettleserregel), så den opprettes ved første tastetrykk/trykk.
let audio = null, music = null, musicMood = 'calm';
let soundMuted = store.get('tlm.muted', false);
function primeVoice() { try { if (hasTTS) speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance(' '), { volume: 0 })); } catch { /* ok */ } }
function unlockAudio(e) {
  if (!e || ['pointerdown', 'keydown', 'touchend'].includes(e.type)) primeVoice();      // (de nye hendelsene touchstart/pointerup/click gjelder bare lydmotoren)
  if (!audio) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audio = createAudio(new Ctx(), { volume: store.get('tlm.vol', 0.7), reverb: store.get('tlm.reverb', null) ?? LEVEL.audio?.reverb ?? 0.12, levels: store.get('tlm.mix2', {}) });
      audio.setMuted(soundMuted);
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
  pill.style.cssText = 'position:fixed;left:50%;bottom:max(150px,calc(env(safe-area-inset-bottom) + 140px));transform:translateX(-50%);z-index:6;display:none;padding:10px 18px;border-radius:999px;border:2px solid #ffa94099;background:#121a2cdd;color:#ffd9a0;font:700 15px system-ui';
  document.body.appendChild(pill);
  const t0 = performance.now(); let logged = false;
  const running = () => audio?.ctx?.state === 'running';
  setInterval(() => {
    const ok = running();
    if (ok && !logged) { logged = true; logEv('lyd klar', `${Math.round(performance.now() - t0)} ms etter oppstart`); }
    let inMenu = false; try { inMenu = menuOpen; } catch { /* startskjermen er ikke satt opp ennå */ }
    pill.style.display = !ok && TOUCH && performance.now() - t0 > 1200 && !inMenu ? 'block' : 'none';
  }, 400);
}
// iPhone stopper lyden (suspended/interrupted) ved lås eller fanebytte: ta den opp igjen når fanen er synlig, og ved neste trykk (unlockAudio)
document.addEventListener('visibilitychange', () => { if (!document.hidden) audio?.resume(); });
addEventListener('pageshow', () => audio?.resume());
// valgfri kamerafølging: kameraet dreier seg langsomt bak figuren når den går (av etter at du selv har dratt i kameraet)
let autoCam = store.get('tlm.follow', true), lastDrag = -99;
function toggleAutoCam() { autoCam = !autoCam; store.set('tlm.follow', autoCam); toast(autoCam ? 'Kamera følger retning' : 'Kamera følger ikke'); const c = document.getElementById('chkAutoCam'); if (c) c.checked = autoCam; }

let vibOn = store.get('tlm.vib', true);
const buzz = (ms) => { if (vibOn && navigator.vibrate) try { navigator.vibrate(ms); } catch { /* ikke støttet */ } };   // Android; iOS Safari støtter ikke vibrasjon

// ---------- innstillinger som flagg (selve lista og panelet står lenger ned: SETTINGS) ----------
let autosaveOn = store.get('tlm.autosave', true), lostReturnOn = store.get('tlm.lostreturn', true), failHintOn = store.get('tlm.failhint', true);
let confirm2On = store.get('tlm.confirm2', true), aimThrowOn = store.get('tlm.aimthrow', true), dblTapOn = store.get('tlm.dbltap', true);
let showCenter = store.get('tlm.showcenter', true), stickDead = store.get('tlm.stickdead', 0.22), btnScale = store.get('tlm.btnscale', 1);
let puzzlesOn = store.get('tlm.puzzles', true), puzCamOn = store.get('tlm.puzcam', true), bridgeGuide = null;   // nøkkel og lås (R7)
let storyOn = store.get('tlm.story', true);   // fortelling i nivåstart og avslutning (R8)
let crumbsOn = store.get('tlm.crumbs', true);   // smuler (R3)
let antsOn = store.get('tlm.ants', true);   // maur (v0.77)
let camDistSet = store.get('tlm.camdist', 5.5), hudTech = store.get('tlm.hudtech', false), hudOpen = false, fpsOn = store.get('tlm.fps', false);
// PC (v0.72): PUBG-styring som standard: WASD går, musa ser deg rundt (klikk i bildet låser pekeren), skulderkamera. Gjøres én gang; kan byttes tilbake i ⚙.
if (!TOUCH && !store.get('tlm.pcpubg1', false)) { store.set('tlm.pcpubg1', true); store.set('tlm.preset4', 'pubg'); store.set('tlm.view3', 'shoulder'); store.set('tlm.custom4', {}); }
const DEFAULT_PRESET = TOUCH ? 'mario' : 'pubg', DEFAULT_VIEW = TOUCH ? 'third' : 'shoulder';
let viewMode = new URLSearchParams(location.search).get('view') || store.get('tlm.view3', DEFAULT_VIEW);   // third | shoulder | first (standard fra v0.59: vanlig 3. person med kamera som følger etter)
if (!['third', 'shoulder', 'first'].includes(viewMode)) viewMode = 'shoulder';
let viewFirst = viewMode === 'first', shDist = store.get('tlm.shdist', 3), shOff = store.get('tlm.shoff', 0.5), shSide = store.get('tlm.shside', 'right') === 'left' ? -1 : 1, xhairOn = store.get('tlm.xhair', true);
let edgeGuardOn = store.get('tlm.edgeguard', true), autoJumpOn = store.get('tlm.autojump', true), lookAheadOn = store.get('tlm.lookahead', true), dustOn = store.get('tlm.dust', true), raysOn = store.get('tlm.rays', true), aoOn = store.get('tlm.ao', true), clutterOn = store.get('tlm.clutter', true);   // v0.62: kanthjelp, kamera som ser foran deg, støv i lufta
let airSteadyOn = store.get('tlm.airsteady', true), magnetOn = store.get('tlm.magnet', true), holdGrabOn = store.get('tlm.holdgrab', true);   // v0.65: stabilisering i lufta
let compassMode = store.get('tlm.compassmode', store.get('tlm.compass', true) === false ? 'off' : 'both');   // both | compass | arrow | off
const applyUiFlags = () => { document.body.classList.toggle('nocenter', !showCenter); document.documentElement.style.setProperty('--bs', btnScale); $('fps').style.display = fpsOn ? 'block' : 'none'; $('qbtn').style.display = qbtnOn ? 'flex' : 'none'; };

// ---------- hendelseslogg og FPS: brukes i testrapporten ----------
const evLog = store.get('tlm.evlog', []);
const logEv = (type, detail = '') => { evLog.push({ c: +clock.toFixed(1), type, detail, pos: [player.x, player.y, player.z].map((v) => +v.toFixed(1)), st: player.state, v: VERSION, lv: levelLabel }); if (evLog.length > 120) evLog.shift(); };
const fpsW = fpsWatch(24, 3000);   // 24, ikke 30: iPhone i strømsparemodus låser til 30 fps og er frisk
const autoQC = createAutoQ();      // polish.js: når oppløsningen går ned/opp (testet i test_polish.mjs)
let resQ = store.get('tlm.resq', 'auto'); if (!['auto', 'full', 'mid', 'low'].includes(resQ)) resQ = 'auto';   // R10: auto = følger FPS (ned ved vedvarende lav, opp igjen når det går fint); ellers fast valg
let autoQ = resQ === 'auto', qSteps = 0, basePr = 1, qToasted = false;
const perf = { n: 0, sum: 0, worst: 0, win: 0, winN: 0 };
addEventListener('pagehide', () => store.set('tlm.evlog', evLog.slice(-120)));

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
const SCORE = { start: 1000, save: 25, respawn: 10, broken: 5, resetThings: 15, perTenSeconds: 2, hardLand: 3, antHit: 4, crumb: CRUMB.points, carried: 5 };

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
scene.add(sun, sun.target);

// ---------- utseende: teksturer med relieff, bøker, kontaktskygger og støv (look.js) ----------
const gfxLow = store.get('tlm.gfx', 'high') === 'low';
if (gfxLow) renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
basePr = renderer.getPixelRatio();   // full oppløsning (autoq går ned fra og opp til denne)
const applyRes = () => { const t = resQ === 'low' ? 1 : resQ === 'mid' ? Math.max(1, Math.round(basePr * 75) / 100) : basePr, np = Math.min(basePr, Math.max(1, t)); if (Math.abs(np - renderer.getPixelRatio()) > 0.005) { renderer.setPixelRatio(np); renderer.setSize(innerWidth, innerHeight, false); } };
if (resQ !== 'auto') applyRes();
const maxAniso = gfxLow ? 4 : Math.min(16, renderer.capabilities.getMaxAnisotropy());
setAniso(maxAniso);
const look = makeLook({ aniso: maxAniso, low: gfxLow });
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
let labelsOn = store.get('tlm.labels', true);
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
let infoPrev = performance.now();
function updateLabels() {
  const now = performance.now(), dt = Math.min(0.1, (now - infoPrev) / 1000); infoPrev = now;
  let near = null;
  for (const l of labels) { l.d = Math.hypot(player.x - l.pos[0], player.z - l.pos[2], (player.y - l.pos[1]) * 0.5); if (!near || l.d < near.d) near = l; }
  const on = labelsOn && mode === 'play' && labels.length > 0, tabOn = mode === 'play' && !won;
  for (const l of labels) {
    const o = on ? Math.max(0, Math.min(1, (13 - l.d) / 4)) : 0;
    l.sp.material.opacity += (o - l.sp.material.opacity) * 0.2; l.sp.visible = l.sp.material.opacity > 0.03;
  }
  infoCard.style.display = tabOn ? '' : 'none';
  if (!tabOn) { if (infoOpen) closeInfo(); return; }
  infoTab.classList.toggle('dim', false);
  if (!on) { if (infoOpen) { infoT -= dt; if (infoT <= 0) closeInfo(); } return; }
  if (!infoOpen && near && near.d < 5.5 && !infoSeen.has(near)) openInfo(near, false);              // første gang du kommer nær: skyv inn
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
let bookN = 0; const col0 = (b) => b.color ?? 0xcccccc;
for (const b of LEVEL.boxes) {
  if (drawn.has(b)) continue;
  const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
  const cx = b.min[0] + sx / 2, cy = b.min[1] + sy / 2, cz = b.min[2] + sz / 2;
  const shaped = b.kind && b.type !== 'floor' && b.type !== 'wall' && !b.dyn ? buildSingle(b.kind, [sx, sy, sz], { color: b.color, id: b.id, material: b.material }) : null;
  if (b.grip) gripMark(b);
  if (shaped) { shaped.position.set(cx, cy, cz); scene.add(shaped); regFade(shaped, [b]); continue; }
  if (b.type !== 'floor' && b.type !== 'wall' && !b.dyn && Math.min(sx, sz) > 0.4 && LEVEL.boxes.some((c) => c !== b && !c.dyn && Math.abs(c.max[1] - b.min[1]) < 0.05 && c.min[0] < b.max[0] && c.max[0] > b.min[0] && c.min[2] < b.max[2] && c.max[2] > b.min[2])) {
    const cs = look.contactShadow(sx, sz, Math.max(0.3, Math.min(0.9, Math.min(sx, sz) * 0.35))); cs.position.set(cx, b.min[1] + 0.02, cz); scene.add(cs);   // myk mørk kant der tingen står
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
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ map: look.skyTex(), color: 0xc4cfe0, toneMapped: false })));
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
  const sg = d.kind && buildSingle(d.kind, d.size, { color: d.color, id: d.id, material: d.material });
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
const hero = buildHero(look);
scene.add(hero.root);
// rund skygge under figuren (som i Mario: viser hvor du lander) og landingsmarkør når du faller
const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const flatMat = (o) => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide, ...o });
const blob = new THREE.Mesh(new THREE.CircleGeometry(1, 28), flatMat({ map: blobTex })); blob.rotation.x = -Math.PI / 2; blob.renderOrder = 2; blob.visible = false; scene.add(blob);
const landRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 40), flatMat({ color: 0xffffff })); landRing.rotation.x = -Math.PI / 2; landRing.renderOrder = 3; landRing.visible = false; scene.add(landRing);
const LAND_COL = { ok: 0xffffff, hard: 0xffa940, knock: 0xff4b3e };
function updateBlob(now) {
  const p = player, off = () => { blob.visible = landRing.visible = false; };
  if (!blobOn || mode !== 'play' || ['climb', 'hang', 'swing', 'zip', 'mantle'].includes(p.state)) return off();
  const s = surfaceBelow(LEVEL, p.x, p.y + 0.05, p.z, 0.3); if (!s) return off();
  const h = Math.max(0, p.y - s.top); if (h > 40) return off();
  const r = 0.42 + 0.03 * Math.min(h, 12);
  blob.visible = true; blob.position.set(p.x, s.top + 0.03, p.z); blob.scale.setScalar(r * 1.15); blob.material.opacity = 0.8 * (1 - Math.min(0.75, h / 16));
  const falling = !p.onGround && p.vy < -3 && h > 1.2;
  if (!falling) { landRing.visible = false; return; }
  const v = impactSpeed(p.vy, h, P.gravity) * (s.soft ? P.softFactor : 1), cls = landingClass(v, P.hardLand, P.knockV);
  landRing.visible = true; landRing.position.set(p.x, s.top + 0.05, p.z); landRing.material.color.setHex(LAND_COL[cls]);
  landRing.scale.setScalar(0.55 + (cls === 'ok' ? 0.05 : 0.18) * Math.sin(now / 110)); landRing.material.opacity = cls === 'ok' ? 0.55 : 0.95;
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
const DIP_MAX = 0.17;   // hvor mye hoftene kan synke i hurk (landing/forberedelse)

function poseHero(p, now, dt, mode) {
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
  if (ownGait && p.onGround) { const tw = idleW * clampN((Math.abs(yawRate) - 1) / 3, 0, 1), sn = Math.sin(gph); pathL.y += 0.035 * tw * Math.max(0, sn); pathR.y += 0.035 * tw * Math.max(0, -sn); }   // løfter føttene når han snur seg på stedet
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
    const sway = Math.sin(sec * 1.5), hs = hangSway(sec, Math.hypot(p.vx, p.vz), false);   // heng: rolig dingling
    Object.assign(T, { aL: -3.05, aR: -3.05, eL: -0.12, eR: -0.12, hL: hs.legL, hR: hs.legR, kL: hs.kneeL, kR: hs.kneeR, lean: hs.lean, roll: hs.roll, chest: -0.05, hp: -0.2, twist: sway * 0.05 });
  } else if (p.state === 'swing') {
    const k = clampN((p.vx * p.fx + p.vz * p.fz) * 0.1, -0.8, 0.8), ss = hangSway(sec * 1.4, Math.hypot(p.vx, p.vz), true);   // sving: stort pendel i bena, kroppen lener med farten
    Object.assign(T, { aL: -3.0, aR: -3.1, eL: -0.1, eR: -0.1, hL: ss.legL - 0.5 * k, hR: ss.legR - 0.5 * k, kL: ss.kneeL + 0.3, kR: ss.kneeR + 0.5, lean: -0.25 * k + ss.lean * 2, roll: ss.roll, chest: -0.1 * k, hp: -0.15, twist: 0.06 * Math.sin(sec * 2.1) });
  } else if (p.reach > 0) {
    const rt = clampN((hero.reachT || 0) / 0.25, 0, 1), fl = Math.sin(sec * 15), wv = Math.sin(sec * 11);   // armene strekker seg mer og mer, bena sparker, kroppen vrir seg mot grepet
    Object.assign(T, { aL: -2.55 - 0.3 * rt + 0.1 * wv, aR: -2.8 - 0.35 * rt - 0.1 * wv, eL: -0.3 + 0.25 * rt, eR: -0.25 + 0.2 * rt, hL: -0.6 + 0.35 * fl, hR: 0.3 - 0.35 * fl, kL: 0.9 + 0.45 * Math.max(0, fl), kR: 0.5 + 0.45 * Math.max(0, -fl),
      lean: 0.12 + 0.12 * rt, chest: 0.1 + 0.14 * rt, hp: -0.2, twist: 0.12 * wv * rt });
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
  if ((hero.catchT || 0) > 0 && (p.state === 'climb' || p.state === 'hang')) {                     // tar imot: albuene bøyes og kroppen dypper, så strammer han seg opp igjen
    const g = hero.catchT, g2 = g * g;
    T.eL -= 0.9 * g2; T.eR -= 0.9 * g2; T.chest += 0.16 * g2; T.lean += 0.1 * g2; T.hL += 0.35 * g2 * Math.sin(sec * 12); T.hR -= 0.35 * g2 * Math.sin(sec * 12); T.kL += 0.5 * g2; T.kR += 0.5 * g2; bob -= 0.08 * g2;
  }
  if (!p.skid && p.state !== 'mantle' && p.state !== 'hang' && p.state !== 'swing' && mode !== 'fly' && p.onGround) T.lean += hero.accLean;

  // fingrene: knyttet rundt det han holder eller henger i, løst knyttet i løp, åpne når han rekker ut
  T.fgL = T.fgR = p.carry || ['hang', 'climb', 'swing', 'zip', 'mantle'].includes(p.state) ? 1.2 : p.reach > 0 || (!p.onGround && p.vy < -8) ? 0.05 : 0.35 + 0.55 * kSp * (p.onGround ? 1 : 0);
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
initBodies(LEVEL); initAnts(LEVEL); initCollect(LEVEL); initPuzzles(LEVEL);
const bodyMeshes = LEVEL.bodies.map((b) => {
  const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
  const mesh = (b.kind && buildSingle(b.kind, [sx, sy, sz], { color: b.color, id: b.id, material: b.material })) || new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material({ type: b.type, material: b.material, color: b.color }));
  mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh); if (!gfxLow) look.detailize(mesh);
  return { b, mesh, size: [sx, sy, sz] };
});
// maur: én modell per patrulje (v0.77)
const ANT_COL = [0x9a3a1e, 0x7a2a16, 0xb04a22, 0x8a3320];
const antMeshes = (LEVEL.antList || []).map((t, i) => {
  const a = t.type === 'spider' ? buildSpider() : t.type === 'carrier' ? buildCarrier() : buildAnt({ color: ANT_COL[i % ANT_COL.length], crumb: !!LEVEL.ants[i].crumb });   // R6: tre slag, hver med egen modell
  a.root.userData.antId = t.id; scene.add(a.root); if (!gfxLow) look.detailize(a.root);
  let drop = null; if (t.type === 'carrier') { drop = buildDropCrumb(); drop.visible = false; scene.add(drop); }                 // smula bæreren slipper når den knuses
  return { t, a, drop, rot: Math.atan2(-t.fz, t.fx) };
});
// smuler (R3): gylne smuler som flyter og snurrer; tatt = skjult
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
const stats = { saves: 0, respawns: 0, broken: 0, resets: 0, hard: 0, hits: 0, squashed: 0, crumbs: 0, carried: 0, flew: false };
let mode = 'play';                 // play | plan | fly
let won = false, clock = 0;

function toast(msg, low = false) {
  const t = $('toast'); t.textContent = msg; t.classList.toggle('low', low); t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1700);
}
const points = () => Math.max(0, SCORE.start - stats.saves * SCORE.save - stats.respawns * SCORE.respawn - stats.broken * SCORE.broken - stats.resets * SCORE.resetThings - stats.hard * SCORE.hardLand - (stats.hits || 0) * SCORE.antHit - Math.floor(clock / 10) * SCORE.perTenSeconds + (stats.crumbs || 0) * SCORE.crumb + (stats.carried || 0) * SCORE.carried);
function placeFlag() { flagV.place(save.pos); }
placeFlag();

// ---------- autolagring: fremgangen huskes per brett, så en kort mobiløkt kan fortsette der du var ----------
const progKey = `tlm.progress.${levelId}${LEVEL.rev ? '.r' + LEVEL.rev : ''}`;       // rev: brettet er bygd om (gammel fremgang passer ikke lenger)
let autoPos = null, autoT = 0, resumed = false;
let noSave = false;       // satt rett før siden lastes på nytt etter «Nytt spill», så pagehide ikke skriver gammel fremgang tilbake
function saveProgress() { if (won || !autosaveOn || noSave) return; store.set(progKey, { save: save.pos, auto: autoPos, stats, clock, fails: [...failCells], crumbs: collectedIds(LEVEL), puzzles: puzzleOpenIds(LEVEL) }); }
function clearProgress() { autoPos = null; store.set(progKey, null); }
const failCells = new Map();
let compassForce = 0;
function failAt(why = 'fall') {
  logEv('tilbake', why);
  const k = `${Math.round(player.x / 6)}|${Math.round(player.y / 6)}|${Math.round(player.z / 6)}`, n = (failCells.get(k) || 0) + 1; failCells.set(k, n);
  if (failHintOn && n >= 3 && n % 3 === 0) setTimeout(() => { const t = nextTarget(); compassForce = performance.now() + 15000; toast(`Tips: prøv ${t.final ? 'målet' : t.label}${t.act ? ` (${t.act})` : ''}. Pilen viser veien.`); }, 1800);
}
{
  const pr = store.get(progKey, null), okAt = (p) => Array.isArray(p) && p.length === 3 && freeAt(LEVEL, p[0], p[1] + 0.05, p[2]);
  if (autosaveOn && pr && pr.clock > 4 && okAt(pr.save)) {
    save.pos = pr.save; Object.assign(stats, pr.stats || {}); clock = pr.clock; autoPos = okAt(pr.auto) ? pr.auto : null;
    for (const [k, v] of pr.fails || []) failCells.set(k, v);
    stats.crumbs = restoreCollected(LEVEL, pr.crumbs); restorePuzzles(LEVEL, pr.puzzles);
    resetPlayer(player, ...(autoPos || save.pos)); placeFlag(); if (stats.saves > 0) flagV.ignite(true); resumed = true;
  }
}
addEventListener('pagehide', saveProgress);
if (resumed) logEv('gjenopptatt');
logEv('grade', gradeMode + (gfxLow ? ' (enkel: ingen kantlys/fyll/filter)' : ''));   // R1: hvilken gradering som kjører (rapporten)
if (resumed) setTimeout(() => toast('Fortsetter der du var · ⚙ → Start på nytt for å begynne på nytt'), 1500);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveProgress(); });

function doSave() {
  if (mode !== 'play') return toast('Gå ut av plan-/flymodus først');
  if (!player.onGround) return toast('Stå støtt for å lagre');
  save.pos = [player.x, player.y, player.z]; stats.saves++; placeFlag(); flagV.ignite(); audio?.checkpoint(); saveProgress();
  logEv('lagret'); logEv('flagg tent', 'lagringspunkt'); toast(`Lagringspunkt satt  −${SCORE.save} poeng`);
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
  logEv('ting nullstilt'); resetBodies(LEVEL, player); stats.resets++; say('reset');
  toast(`Ting satt tilbake  −${SCORE.resetThings} poeng`);
}
function restartAll() {
  clearProgress(); failCells.clear();
  resetPlayer(player, ...LEVEL.start);
  resetBodies(LEVEL, player);
  save.pos = [...LEVEL.start]; stats.saves = stats.respawns = stats.broken = stats.resets = stats.hits = stats.squashed = stats.crumbs = stats.carried = 0; stats.flew = false; resetAnts(LEVEL); resetCollect(LEVEL); resetPuzzles(LEVEL); bridgeGuide = null;
  won = false; clock = 0; placeFlag(); flagV.extinguish(); $('win').classList.add('hide'); setMode('play');
}

// ---------- modus: plan / fly ----------
if (grade.params.gloss > 1) scene.traverse((o) => { const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; for (const m of ms) if (m.isMeshPhysicalMaterial && m.clearcoat > 0 && !m.transparent && !m.envMap) { m.envMap = scene.environment; o.geometry.computeBoundingBox(); const bs = o.geometry.boundingBox.getSize(new THREE.Vector3()).multiply(o.getWorldScale(new THREE.Vector3())); m.envMapIntensity = Math.max(bs.x, bs.y, bs.z) > 30 ? 1 : grade.params.gloss; } });   // R1 (store flater får ikke ekstra speiling, ellers utbrent): all blank klarlakk (props.js m.m.) speiler miljøet tydelig
const cam = { yaw: 0.35, pitch: viewMode === 'shoulder' ? 0.18 : viewMode === 'first' ? 0.05 : 0.3, dist: camDistSet, cur: viewMode === 'shoulder' ? shDist : camDistSet, target: new THREE.Vector3(...LEVEL.start) };
let camLook = 0, camPitchBias = 0, camLift = 0, camUpTilt = 0, camAssist = store.get('tlm.camassist', true);
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
let helpLevel = store.get('tlm.helplevel', 'normal'), followStrength = store.get('tlm.followstr', 1), fovSet = store.get('tlm.fov', 52), pitchBase = store.get('tlm.pitchbase', 0.26);
let stickCurve = store.get('tlm.stickcurve', 1.3), inertia = store.get('tlm.inertia', 1), speedScale = store.get('tlm.speedscale', 1), qbtnOn = store.get('tlm.qbtn', true);
const metrics = { swipes: 0, dragPx: 0, yawUser: 0, yawAuto: 0, stickT: 0, t: 0 };
let stepAdapt = store.get('tlm.stepadapt', true), reactAnim = store.get('tlm.reactanim', true);
let idleWink = store.get('tlm.idlewink', true), restBreath = store.get('tlm.restbreath', false);
const mixSet = (ids, v) => { const mix = store.get('tlm.mix2', {}); for (const id of ids) { mix[id] = v; audio?.setLevel(id, v); } store.set('tlm.mix2', mix); };
const mixGet = (id) => store.get('tlm.mix2', {})[id] ?? 1;
let stickFloat = store.get('tlm.stickfloat', false), mouseLook = store.get('tlm.mouselook', true);
let camAnim = null;                                                           // mykt kameraskift: {from, to, pf, pt, t}
const angDiff = (a, b) => ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
function turnCamera(toYaw, toPitch) { camAnim = { from: cam.yaw, d: angDiff(cam.yaw, toYaw), pf: cam.pitch, pt: toPitch ?? cam.pitch, t: 0 }; lastDrag = -99; }
const camBehind = () => turnCamera(Math.atan2(-player.fx, -player.fz), viewFirst ? 0.1 : 0.32);                       // bak figuren, litt ovenfra
// neste hinder: ruta fra rute-grafen (flater og grep-flater i rekkefølge); uten rute (håndlagde brett) er det målet
let routeCur = 0;
function nextTarget() {
  const R = LEVEL.route, g = LEVEL.goal;
  if (puzzlesOn && mode === 'play' && bridgeGuide) {                              // R7: etter åpning peker pila på broen til du er over
    const e = bridgeFarEnd(bridgeGuide);
    if (Math.hypot(player.x - e.x, player.z - e.z) < 2 || performance.now() > bridgeGuide.until || !nearBridge(bridgeGuide, player)) bridgeGuide = null;   // også når du har falt/respawnet bort fra broen
    else return { x: e.x, y: e.y, z: e.z, label: T('puz.bridgeLbl'), final: false, act: '' };
  }
  if (puzzlesOn && mode === 'play') { const pt = puzzleTarget(LEVEL, player); if (pt) return { x: pt.x, y: pt.y, z: pt.z, label: T('puz.' + pt.key), final: false, act: pt.key === 'plate' ? T('btn.drop') : T('btn.take') }; }   // R7: nøkkel, så lås
  if (R?.length > 1) {
    let i = -1;
    if (player.state === 'climb') i = R.findIndex((w) => (w.grip || w.via) && w.id === player.climb?.box?.id);
    else if (player.onGround) R.forEach((w, k) => { if (!w.grip && !w.via && player.y - w.top > -0.3 && player.y - w.top < 3.5 && player.x >= w.x0 - 0.3 && player.x <= w.x1 + 0.3 && player.z >= w.z0 - 0.3 && player.z <= w.z1 + 0.3) i = k; });   // flaten du står på (også når du står på en løs ting oppå)
    if (i >= 0) routeCur = i;
    const w = R[Math.min(routeCur + 1, R.length - 1)];
    if (w !== R[R.length - 1]) return { x: Math.max(w.x0, Math.min(w.x1, player.x)), y: w.top, z: Math.max(w.z0, Math.min(w.z1, player.z)), label: (lang === 'en' && w.en) || w.label || nameOfId(w.id).replace(/_/g, ' '), final: false, act: w.act || (w.grip ? 'klatre' : '') };
  }
  return { x: g[0], y: g[1], z: g[2], label: T('compass.goal'), final: true };
}
const camToGoal = () => { const t = nextTarget(); turnCamera(Math.atan2(-(t.x - player.x), -(t.z - player.z)), viewFirst ? 0.1 : 0.32); };    // neste mål rett frem
function stepCamAnim(dt) {
  if (!camAnim) return; camAnim.t = Math.min(1, camAnim.t + dt / 0.4); const k = 1 - Math.pow(1 - camAnim.t, 3);
  cam.yaw = camAnim.from + camAnim.d * k; cam.pitch = camAnim.pf + (camAnim.pt - camAnim.pf) * k; if (camAnim.t >= 1) camAnim = null;
}
const compEl = $('compass'), compArrow = $('compArrow'), compTxt = $('compTxt');
const goalArrow = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([[0, 0.5], [0.3, -0.25], [0, -0.1], [-0.3, -0.25]].map(([x, y]) => new THREE.Vector2(x, y)))),
  new THREE.MeshBasicMaterial({ color: 0xffa940, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }));
goalArrow.rotation.x = -Math.PI / 2; goalArrow.renderOrder = 5; goalArrow.visible = false;
const goalArrowG = new THREE.Group(); goalArrowG.add(goalArrow); scene.add(goalArrowG);
let compKey = '', compShowUntil = 0, compIdleSince = 0;
function compassFrame(now) {
  const t = nextTarget(), dx = t.x - player.x, dz = t.z - player.z, dist = Math.hypot(dx, dz);
  const forced = performance.now() < compassForce, show = (compassMode !== 'off' || forced) && mode === 'play' && !won && dist > (t.final ? 2.5 : 0.6);
  { const key = (t.final ? '!' : '') + t.label, idle = player.onGround && Math.hypot(player.vx, player.vz) < 0.3;       // v0.75: bare pila til vanlig; teksten vises ved nytt mål, tips, og når du står stille
    if (key !== compKey) { compKey = key; compShowUntil = now + 6000; }
    if (!idle) compIdleSince = now; else if (!compIdleSince) compIdleSince = now;
    compEl.classList.toggle('mini', !(forced || now < compShowUntil || (idle && now - compIdleSince > 2500))); }
  compEl.style.display = show && (compassMode === 'both' || compassMode === 'compass' || forced) ? 'flex' : 'none';
  goalArrow.visible = show && player.onGround && (compassMode === 'both' || compassMode === 'arrow' || forced); goalArrowG.visible = goalArrow.visible;
  if (!show) { goalArrowG.visible = false; return; }
  const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
  const ang = Math.atan2(dx * cy - dz * sy, -dx * sy - dz * cy);                     // 0 = rett frem på skjermen, positiv = til høyre
  compArrow.style.transform = `rotate(${ang}rad)`;
  const dy = t.y - player.y;
  $('compLbl').textContent = t.final ? T('compass.goal') : T('compass.next', { name: t.label.toUpperCase() });
  compTxt.textContent = `${(dist * 0.05).toFixed(1).replace('.', ',')} m${t.act ? ` · ▲ ${t.act}` : Math.abs(dy) > 0.6 ? (dy > 0 ? ' · ▲ opp' : ' · ▼ ned') : ''}`;
  goalArrowG.position.set(player.x + dx / dist * 1.4, player.y + 0.03 + 0.01 * Math.sin(now / 200), player.z + dz / dist * 1.4);
  goalArrowG.rotation.y = Math.atan2(-dx, -dz);
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
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() }); metrics.swipes++;
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); }
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId === stickId) { stickMove(e); return; }            // fingeren styrer stikken (flytende), ikke kameraet
  const p = pointers.get(e.pointerId); if (!p) return;
  const ms = e.pointerType === 'mouse' ? mouseSens : 1, dx = (e.clientX - p.x) * ms, dy = (e.clientY - p.y) * ms; p.x = e.clientX; p.y = e.clientY;
  const c = activeCam();
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch0) zoom(pinch0 / d); pinch0 = d; return;
  }
  camAnim = null; c.yaw -= dx * 0.006 * camSens; lastDrag = performance.now() / 1000; metrics.dragPx += Math.abs(dx) + Math.abs(dy); metrics.yawUser += Math.abs(dx * 0.006 * camSens);
  c.pitch += dy * 0.005 * camSens * (camInvY && mode !== 'plan' ? -1 : 1);
  const lim = mode === 'plan' ? [-0.3, 1.5] : viewFirst ? [-1.25, 1.25] : viewMode === 'shoulder' ? [-0.85, 1.2] : [-0.85, 1.35];
  c.pitch = Math.min(lim[1], Math.max(lim[0], c.pitch));
});
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
function bindBtn(id, key, edge) {
  const el = $(id);
  el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); touch[key] = true; edge(); });
  const up = () => { touch[key] = false; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}
bindBtn('btnJump', 'jump', () => { jumpEdge = true; });
bindBtn('btnGrab', 'grab', () => { grabEdge = true; });
bindBtn('btnCarry', 'carry', () => { carryEdge = true; });
// kast med dra og slipp: hold TA, dra fingeren bakover (som en slynge), slipp. Retning og kraft følger draget; uten drag er det som før (hold lenge = langt kast).
const aimPt = { id: null, x0: 0, y0: 0, x: 0, y: 0 };
{
  const el = $('btnCarry');
  el.addEventListener('pointerdown', (e) => { aimPt.id = e.pointerId; aimPt.x0 = aimPt.x = e.clientX; aimPt.y0 = aimPt.y = e.clientY; });
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
$('again').onclick = restartAll;

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
let presetName = store.get('tlm.preset4', DEFAULT_PRESET);
if (!PRESETS[presetName]) presetName = 'prince';
applyPreset(presetName);
Object.assign(P, store.get('tlm.custom4', {}));
// hjelp-nivå og fart/treghet legges oppå forhåndsinnstillingen
function reapplyKnobs() {
  const base = PRESETS[presetName] || {}, b = (k) => base[k] ?? P0_SNAPSHOT[k];
  const lv = { none: { coyote: 0.1, jumpBuffer: 0.08, reachSnap: 0.3, stepUp: 0, autoGrab: false }, normal: { coyote: 0.14, jumpBuffer: 0.12, reachSnap: 0.45, stepUp: b('stepUp'), autoGrab: base.autoGrab ?? false }, much: { coyote: 0.22, jumpBuffer: 0.2, reachSnap: 0.7, stepUp: Math.max(0.6, b('stepUp')), autoGrab: true } }[helpLevel] || {};
  Object.assign(P, lv);
  P.edgeGuard = edgeGuardOn && helpLevel !== 'none'; P.autoJump = autoJumpOn && helpLevel !== 'none';       // kanthjelp: stopp ved kanten (forsiktig) og hopp selv over gap (løp)
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
const GROUPS = [['spill', 'Spill'], ['styring', 'Styring'], ['kamera', 'Kamera'], ['hjelp', 'Hjelp og tekst'], ['lyd', 'Lyd og stemme'], ['test', 'Test'], ['admin', 'Admin']];

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
const SETTINGS = [
  // Spill
  fl('pcbtns', 'styring', 'Vis skjermknapper på PC (TA, HOPP, GREP)', true, () => pcButtons, kp('tlm.pcbtns', (v) => { pcButtons = v; applyPlatformUi(); })),
  sl('lang', 'spill', 'Språk / Language', 'nb', LANGS, () => lang, kp('tlm.lang', (v) => { lang = v; applyLang(); })),
  fl('autosave', 'spill', 'Autolagring: fortsett der du var', true, () => autosaveOn, kp('tlm.autosave', (v) => { autosaveOn = v; if (!v) store.set(progKey, null); })),
  fl('startscreen', 'spill', 'Vis startskjerm (Nytt spill / Fortsett) når spillet åpnes', true, () => startScreenOn, kp('tlm.startscreen', (v) => { startScreenOn = v; })),
  fl('puzzles', 'spill', 'Gåter (nøkkel og lås: en snarvei du åpner)', true, () => puzzlesOn, kp('tlm.puzzles', (v) => { puzzlesOn = v; })),
  fl('puzcam', 'hjelp', 'Gåter: kort kamerasveip mot broen når den åpnes', true, () => puzCamOn, kp('tlm.puzcam', (v) => { puzCamOn = v; })),
  fl('story', 'spill', 'Fortelling i starten av hvert nivå', true, () => storyOn, kp('tlm.story', (v) => { storyOn = v; })),
  fl('crumbs', 'spill', 'Smuler (gylne smuler å samle, gir poeng)', true, () => crumbsOn, kp('tlm.crumbs', (v) => { crumbsOn = v; })),
  fl('ants', 'hjelp', 'Maur (fiender som patruljerer): av = ingen maur i brettene', true, () => antsOn, kp('tlm.ants', (v) => { antsOn = v; })),
  fl('lostreturn', 'spill', 'Ting som forsvinner kommer tilbake av seg selv', true, () => lostReturnOn, kp('tlm.lostreturn', (v) => { lostReturnOn = v; })),
  fl('confirm2', 'spill', 'Lagre / Tilbake / Ting: trykk to ganger', true, () => confirm2On, kp('tlm.confirm2', (v) => { confirm2On = v; })),
  sl('gfx', 'spill', 'Grafikk (laster siden på nytt)', 'high', [['high', 'Detaljert'], ['low', 'Enkel (for eldre telefoner)']], () => (gfxLow ? 'low' : 'high'), (v) => { if ((v === 'low') === gfxLow) return; store.set('tlm.gfx', v); setTimeout(() => location.reload(), 150); }),
  sl('grade', 'spill', 'Fargegradering (Toy Story-lys, laster siden på nytt)', 'film', [['film', 'Varm film'], ['off', 'Av (opprinnelig lys)']], () => gradeMode, (v) => { if (v === gradeMode) return; logEv('grade', v); store.set('tlm.grade', v); setTimeout(() => location.reload(), 150); }),
  fl('gradefilter', 'spill', 'Fargefilter på skjermen (Varm film; slå av om det går tregt)', true, () => store.get('tlm.gradefilter', true) !== false, (v) => { store.set('tlm.gradefilter', v); logEv('gradefilter', v ? 'på' : 'av'); grade.setFilter(v); }),
  fl('dust', 'spill', 'Støv i lufta', true, () => dustOn, kp('tlm.dust', (v) => { dustOn = v; })),
  ...(gfxLow ? [] : [
    fl('rays', 'spill', 'Lysstråler fra vinduet (Detaljert grafikk)', true, () => raysOn, kp('tlm.rays', (v) => { raysOn = v; logEv('lysstraaler', v ? 'på' : 'av'); })),
    fl('ao', 'spill', 'Mørkere hjørner og kontaktskygger (Detaljert grafikk)', true, () => aoOn, kp('tlm.ao', (v) => { aoOn = v; logEv('hjorner', v ? 'på' : 'av'); })),
    fl('clutter', 'spill', 'Småting på gulv og hyller: smuler, knapper, hår (Detaljert grafikk)', true, () => clutterOn, kp('tlm.clutter', (v) => { clutterOn = v; logEv('smating', v ? 'på' : 'av'); }))]),
  fl('hudtech', 'spill', 'Vis alltid tekniske tall (høyde, tid, poeng). Ellers: trykk på teksten øverst', false, () => hudTech, kp('tlm.hudtech', (v) => { hudTech = v; })),
  // Styring
  ...(!TOUCH ? [rg('mousesens', 'styring', 'Mus: følsomhet (lavere = roligere kamera)', 0.45, 0.15, 1.5, 0.05, () => mouseSens, kp('tlm.mousesens', (v) => { mouseSens = v; }), { pct: true })] : []),
  rg('camsens', 'styring', 'Kamerafølsomhet (dra)', 1, 0.4, 2, 0.1, () => camSens, kp('tlm.camsens', (v) => { camSens = v; })),
  sl('caminvy', 'styring', TOUCH ? 'Kamera: når du drar tommelen opp' : 'Kamera: når du drar musa opp', 'up', [['up', 'Se opp (standard)'], ['down', 'Se ned (omvendt)']], () => (camInvY ? 'down' : 'up'), (v) => { camInvY = v === 'down'; store.set('tlm.caminvy', camInvY); }),
  rg('stickdead', 'styring', 'Stikke: dødsone (mot skjelving)', 0.22, 0, 0.4, 0.02, () => stickDead, kp('tlm.stickdead', (v) => { stickDead = v; })),
  rg('btnscale', 'styring', 'Knappestørrelse', 1, 0.8, 1.3, 0.05, () => btnScale, kp('tlm.btnscale', (v) => { btnScale = v; applyUiFlags(); })),
  sl('help', 'styring', 'Hjelp-nivå (tilgivende hopp, kantgrep, hinder)', 'normal', [['none', 'Ingen (som Prince)'], ['normal', 'Normal'], ['much', 'Mye hjelp']], () => helpLevel, kp('tlm.helplevel', (v) => { helpLevel = v; reapplyKnobs(); })),
  rg('inertia', 'styring', 'Treghet (lav = kjapp, høy = tung)', 1, 0.5, 1.6, 0.05, () => inertia, kp('tlm.inertia', (v) => { inertia = v; reapplyKnobs(); }), { pct: true }),
  rg('speedscale', 'styring', 'Gangfart', 1, 0.6, 1.5, 0.05, () => speedScale, kp('tlm.speedscale', (v) => { speedScale = v; reapplyKnobs(); }), { pct: true }),
  rg('stickcurve', 'styring', 'Stikke: følsomhet (1 = lineær, høyere = finere i midten)', 1.3, 1, 2.2, 0.1, () => stickCurve, kp('tlm.stickcurve', (v) => { stickCurve = v; })),
  fl('stickfloat', 'styring', 'Flytende stikke (følger tommelen) i stedet for fast som i PUBG', false, () => stickFloat, kp('tlm.stickfloat', (v) => { stickFloat = v; })),
  ...(!TOUCH ? [fl('mouselook', 'styring', 'Musestyring (klikk i bildet: mus ser deg rundt, venstre = TA, høyre = GREP)', true, () => mouseLook, kp('tlm.mouselook', (v) => { mouseLook = v; if (!v && document.pointerLockElement) document.exitPointerLock(); }))] : []),
  fl('aimthrow', 'styring', 'Kast med dra og slipp (hold TA, dra ned)', true, () => aimThrowOn, kp('tlm.aimthrow', (v) => { aimThrowOn = v; })),
  fl('dbltap', 'styring', 'Dobbelttrykk på skjermen sentrerer kameraet', true, () => dblTapOn, kp('tlm.dbltap', (v) => { dblTapOn = v; })),
  fl('showcenter', 'styring', 'Vis ◎-knappen (sentrer kamera)', true, () => showCenter, kp('tlm.showcenter', (v) => { showCenter = v; applyUiFlags(); })),
  fl('edgeguard', 'styring', TOUCH ? 'Kanthjelp: stopp ved kanten når du skyver stikken forsiktig' : 'Kanthjelp: stopp ved kanten når du går forsiktig (C)', true, () => edgeGuardOn, kp('tlm.edgeguard', (v) => { edgeGuardOn = v; reapplyKnobs(); })),
  fl('autojump', 'styring', TOUCH ? 'Kanthjelp: hopp av seg selv over gap når du løper (stikken helt ut)' : 'Kanthjelp: hopp av seg selv over gap når du løper mot kanten', true, () => autoJumpOn, kp('tlm.autojump', (v) => { autoJumpOn = v; reapplyKnobs(); })),
  fl('airsteady', 'styring', TOUCH ? 'I lufta: demp skjelving på stikken' : 'I lufta: demp små rykk i styringen', true, () => airSteadyOn, kp('tlm.airsteady', (v) => { airSteadyOn = v; reapplyKnobs(); })),
  fl('magnet', 'styring', 'I lufta: sikte-hjelp (trekkes svakt mot grep, kanter og tau du nesten treffer)', true, () => magnetOn, kp('tlm.magnet', (v) => { magnetOn = v; reapplyKnobs(); })),
  fl('holdgrab', 'styring', TOUCH ? 'I lufta: hold GREP inne for å gripe det første du når' : 'I lufta: hold E / Shift inne for å gripe det første du når', true, () => holdGrabOn, kp('tlm.holdgrab', (v) => { holdGrabOn = v; reapplyKnobs(); })),
  { id: 'autograb', group: 'styring', type: 'bool', label: 'Grip kanten automatisk', get def() { return !!PRESETS[presetName]?.autoGrab; }, get: () => P.autoGrab, set: (v) => { P.autoGrab = v; saveCustom(); } },
  ...(navigator.vibrate ? [fl('vib', 'styring', 'Vibrasjon', true, () => vibOn, kp('tlm.vib', (v) => { vibOn = v; if (v) buzz(30); }))] : []),
  // Kamera
  fl('autocam', 'kamera', `Kameraet følger etter deg automatisk${key('X')}`, true, () => autoCam, kp('tlm.follow', (v) => { autoCam = v; })),
  rg('followstr', 'kamera', 'Kamerafølging: styrke (0 = av)', 1, 0, 2.5, 0.1, () => followStrength, kp('tlm.followstr', (v) => { followStrength = v; })),
  rg('fov', 'kamera', 'Synsfelt (grader)', 52, 38, 80, 1, () => fovSet, kp('tlm.fov', (v) => { fovSet = v; }), { digits: 0 }),
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
  fl('stepadapt', 'spill', 'Føttene tilpasser seg trinn og kanter', true, () => stepAdapt, kp('tlm.stepadapt', (v) => { stepAdapt = v; })),
  sl('resq', 'test', 'Oppløsning (Auto senker ved lav FPS og skrur opp igjen)', 'auto', [['auto', 'Auto (følger FPS)'], ['full', 'Full (skarp)'], ['mid', 'Middels (75 %)'], ['low', 'Lav (1×, raskest)']], () => resQ, kp('tlm.resq', (v) => { resQ = v; autoQ = v === 'auto'; if (autoQ) autoQC.reset(); applyRes(); })),
  fl('reactanim', 'spill', 'Figuren jubler (knuser maur) og rykker (maur støter)', true, () => reactAnim, kp('tlm.reactanim', (v) => { reactAnim = v; })),
  fl('idlewink', 'spill', 'Figuren snur seg og blunker når du står stille i 3 s', true, () => idleWink, kp('tlm.idlewink', (v) => { idleWink = v; })),
  fl('beacon', 'hjelp', 'Lyssøyle over målet', true, () => beaconOn, kp('tlm.beacon', (v) => { beaconOn = v; })),
  fl('failhint', 'hjelp', 'Tips etter 3 fall på samme sted', true, () => failHintOn, kp('tlm.failhint', (v) => { failHintOn = v; })),
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
  rg('mix_breath', 'lyd', 'Pust: volum (0 = av)', 1, 0, 2, 0.05, () => mixGet('breath'), (v) => mixSet(['breath', 'windup'], v), { pct: true }),
  fl('restbreath', 'lyd', 'Rolig pust også når du står stille', false, () => restBreath, kp('tlm.restbreath', (v) => { restBreath = v; })),
  rg('mix_steps', 'lyd', 'Skritt: volum', 1, 0, 2, 0.05, () => mixGet('step'), (v) => mixSet(['step'], v), { pct: true }),
  rg('mix_move', 'lyd', 'Hopp, landing og fallvind: volum', 1, 0, 2, 0.05, () => mixGet('jump'), (v) => mixSet(['jump', 'land', 'fall', 'skid'], v), { pct: true }),
  rg('mix_things', 'lyd', 'Ting (ta, slipp, knus): volum', 1, 0, 2, 0.05, () => mixGet('pickup'), (v) => mixSet(['pickup', 'drop', 'scrape', 'shatter'], v), { pct: true }),
  rg('mix_room', 'lyd', 'Romlyd (drypp, vifte): volum', 1, 0, 2, 0.05, () => mixGet('drip'), (v) => mixSet(['drip', 'fan'], v), { pct: true }),
  // Test
  sl('preset', 'styring', 'Styringsstil', DEFAULT_PRESET, Object.entries(PRESETS).map(([k, v]) => [k, v.label]), () => presetName, (v) => { presetName = v; store.set('tlm.preset4', v); applyPreset(v); store.set('tlm.custom4', {}); if (v === 'pubg') setViewMode('shoulder'); else if (v === 'mario') setViewMode('third'); helpLevel = 'normal'; inertia = 1; speedScale = 1; store.set('tlm.helplevel', 'normal'); store.set('tlm.inertia', 1); store.set('tlm.speedscale', 1); reapplyKnobs(); }),
  sl('platform', 'test', `Enhet (sjekket ved start: ${platform.auto === 'mobil' ? 'mobil' : 'PC'})`, 'auto', [['auto', 'Automatisk'], ['mobil', 'Mobil (berøring)'], ['pc', 'PC (mus og tastatur)']], () => platform.pref, (v) => { store.set('tlm.platform', v); setTimeout(() => location.reload(), 150); }),
  fl('qbtn', 'test', 'Vis vurderingsknappen ⚑ på skjermen', true, () => qbtnOn, kp('tlm.qbtn', (v) => { qbtnOn = v; applyUiFlags(); })),
  fl('fps', 'test', 'Vis bilder per sekund (FPS)', false, () => fpsOn, kp('tlm.fps', (v) => { fpsOn = v; applyUiFlags(); })),
  // Admin: hoppinnstillinger og fininnstilling av mekanikker (verdiene lagres som egen «custom»)
  ...[...TUNE, ...ADMIN_TUNE].map(([k, label, min, max, st]) => ({ id: 'p_' + k, group: 'admin', type: 'range', label, min, max, step: st, get def() { return defOf(k); }, get: () => P[k], set: PSET(k), digits: 2 })),
];
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
const marks = [];
// rask vurdering mens du spiller: ⚑ → velg tema → 👍 / 😐 / 😫 (havner i testrapporten med posisjon og innstillinger)
{
  let tag = store.get('tlm.qtag', 'Styring'); const pop = $('qpop'), tags = ['Styring', 'Kamera', 'Hopp', 'Gange', 'Annet'];
  const draw = () => { const cb = pop.querySelector('.qc'); if (cb) { const n = unsent('MARKERT') + unsent('BACKLOGG'); cb.textContent = `📋 Kopier tilbakemeldinger${n ? ` (${n})` : ''}`; } pop.querySelectorAll('[data-tag]').forEach((b) => b.classList.toggle('on', b.dataset.tag === tag)); };
  pop.innerHTML = `<input type="text" id="qtext" placeholder="Skriv hva som skjedde" enterkeyhint="send" autocomplete="off"><div class="qa"><button data-mark="1" class="qm">⚑ Meld feil</button><button data-backlog="1" class="qb">💡 Legg til backloggen</button></div><div class="qt">${tags.map((t) => `<button data-tag="${t}">${t}</button>`).join('')}</div><div class="qr"><button data-r="bra">👍 Bra</button><button data-r="ok">😐 OK</button><button data-r="vanskelig">😫 Vanskelig</button></div><small>Tema og vurdering er valgfritt</small><button data-copy="1" class="qc">📋 Kopier tilbakemeldinger</button>`;
  const qtext = () => { const el = $('qtext'), v = el.value.trim(); el.value = ''; return v; };
  pop.addEventListener('click', (e) => {
    e.stopPropagation(); const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tag) { tag = b.dataset.tag; store.set('tlm.qtag', tag); draw(); return; }
    if (b.dataset.copy) { doShare(true).then((r) => { toast(r === 'kopiert' ? 'Tilbakemeldingene er kopiert. Lim dem inn til Claude' : 'Kunne ikke kopiere: åpne ⚙ → Test → Vis tilbakemeldingene'); if (r === 'kopiert') pop.classList.add('hide'); }); return; }
    if (b.dataset.mark) { markHere(`${tag}: ${qtext()}`.replace(/: $/, '')); pop.classList.add('hide'); return; }
    if (b.dataset.backlog) { const tx = qtext(); if (!tx) { toast('Skriv hva som skal i backloggen først'); $('qtext').focus(); return; } logEv('BACKLOGG', tx); updateMarkBadge(); toast(`Lagt til backloggen (${unsent('BACKLOGG')} ny)`); pop.classList.add('hide'); return; }
    if (b.dataset.r) { const tx = qtext(); logEv('vurdering', `${b.dataset.r} · ${tag}${tx ? ' · ' + tx : ''}`); pop.classList.add('hide'); toast(`Takk! Registrert: ${b.textContent} (${tag})`); }
  });
  pop.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'qtext') { e.preventDefault(); pop.querySelector('[data-mark]').click(); } });
  $('qbtn').addEventListener('click', (e) => { e.stopPropagation(); pop.classList.toggle('hide'); draw(); if (!pop.classList.contains('hide')) setTimeout(() => $('qtext').focus(), 30); });
  document.addEventListener('pointerdown', (e) => { if (!pop.classList.contains('hide') && !pop.contains(e.target) && e.target !== $('qbtn')) pop.classList.add('hide'); });
}
const unsent = (type) => evLog.filter((e) => e.type === type && !e.sent).length, markCount = () => unsent('MARKERT');
function updateMarkBadge() { const n = markCount() + unsent('BACKLOGG'), el = $('qcnt'); el.textContent = n; el.style.display = n ? 'flex' : 'none'; const h = $('repHead'); if (h) h.innerHTML = repHeadHtml(); }
function repHeadHtml() { const f = markCount(), b = unsent('BACKLOGG'); return f || b ? `<b>${f} feil meldt${b ? ` · ${b} i backloggen` : ''}</b><br>Send til Claude: <button id="hShare">Del tilbakemeldinger</button> <button id="hCopy">Kopier tilbakemeldinger</button>` : ''; }
function markHere(text) { logEv('MARKERT', text || ''); marks.push(evLog[evLog.length - 1]); updateMarkBadge(); toast(`Feil meldt (${markCount()} totalt). Husk å sende rapporten etterpå.`); }
function markSent() { for (const e of evLog) if (e.type === 'MARKERT' || e.type === 'BACKLOGG') e.sent = true; updateMarkBadge(); }
const doShare = async (copyOnly) => { const t = reportText(); { const rb = $('reportBox'); if (rb) rb.value = t; } let r; if (copyOnly) { try { await navigator.clipboard.writeText(t); r = 'kopiert'; } catch { r = 'vis'; } } else r = await shareText(t, `tinylittleme v${VERSION} testrapport`); if (r === 'delt' || r === 'kopiert') markSent(); return r; };
$('panel').addEventListener('click', (e) => { if (e.target.id === 'hShare') doShare(false).then((r) => toast(r === 'delt' ? 'Delt' : r === 'kopiert' ? 'Tilbakemeldingene er kopiert' : r === 'vis' ? 'Åpne ⚙ → Test → Vis rapporten og kopier' : 'Avbrutt')); if (e.target.id === 'hCopy') doShare(true).then((r) => toast(r === 'kopiert' ? 'Rapporten er kopiert. Lim inn til Claude' : 'Kunne ikke kopiere: åpne ⚙ → Test → Vis rapporten')); });
updateMarkBadge();
function buildReportInfo() {
  const t = nextTarget();
  return {
    version: VERSION, level: levelLabel, when: new Date().toLocaleString('nb-NO'), device: navigator.userAgent.replace(/^Mozilla\/5\.0 /, '').slice(0, 90),
    screen: `${innerWidth}×${innerHeight} @${devicePixelRatio}x`, touch: TOUCH, platform: `${TOUCH ? 'mobil' : 'PC'} (${platform.pref === 'auto' ? 'automatisk' : 'valgt'}; berøring ${platform.coarse ? 'hovedpeker' : 'nei'}, mus ${platform.fine ? 'ja' : 'nei'}, berøringspunkter ${platform.touchPoints})`, preset: PRESETS[presetName].label, clock: Math.round(clock), points: points(),
    fps: perf.n ? `${(1000 * perf.n / perf.sum).toFixed(0)} fps snitt, verste bilde ${Math.round(perf.worst)} ms` : 'fps ukjent',
    pos: [player.x, player.y, player.z].map((v) => +v.toFixed(1)), state: player.state, target: t.final ? 'målet' : t.label, stats: { ...stats },
    changed: changedSettings(SETTINGS.filter((d) => d.group !== 'admin' || true).map((d) => ({ id: d.id, label: d.label, def: d.def, get: d.get }))),
    marks: evLog.filter((e) => e.type === 'MARKERT' && !e.sent).slice(-10), backlog: evLog.filter((e) => e.type === 'BACKLOGG' && !e.sent).slice(-10), events: evLog.slice(-30),
    ratings: evLog.filter((e) => e.type === 'vurdering').slice(-12),
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
  const row = (d) => {
    if (d.type === 'bool') return `<label class="chk"><input type="checkbox" data-s="${d.id}"> ${d.label}</label>`;
    if (d.type === 'range') return `<label>${d.label}<span data-v="${d.id}"></span></label><input type="range" data-s="${d.id}" min="${d.min}" max="${d.max}" step="${d.step}">`;
    return `<label>${d.label}</label><select data-s="${d.id}">${d.options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`;
  };
  const groupHtml = (g, title) => {
    const items = SETTINGS.filter((d) => d.group === g && visible(d));
    let extra = '';
    if (g === 'spill') extra = `<label>Brett</label><select id="levelSel">${LEVELS.map((l) => `<option value="${l.id}">${l.label}${store.get('tlm.cleared', {})[l.id] ? ' ✓' : ''}</option>`).join('')}</select><div class="row"><button id="pRestart">Start på nytt</button><button id="pMenu">${T('menu.menu')}</button></div>`;
    if (g === 'test') extra = `
      <label>Noe galt her? (valgfri tekst)</label><input type="text" id="markText" placeholder="f.eks. «kom ikke opp på hylla»">
      <div class="row"><button id="bMark">⚑ Marker her</button></div>
      <div class="row"><button id="bReport">Del tilbakemeldinger</button><button id="bCopyRep">Kopier tilbakemeldinger</button></div>
      <details><summary>Vis tilbakemeldingene (rapporten)</summary><textarea id="reportBox" readonly rows="9"></textarea></details>
      <small>Bare innstillingene (ikke tilbakemeldinger):</small><div class="row"><button id="bExport">Kopier innstillinger</button><button id="bImport">Lim inn innstillinger</button></div>
      <div class="row"><button id="bResetAll">Alt til standard</button></div>
      <small>Rapporten har versjon, enhet, endrede innstillinger, markeringer og siste hendelser. Send den som melding.</small>`;
    if (g === 'lyd') extra = `<div class="row"><button id="bHearBreath">Hør pust</button><button id="bHearStep">Hør skritt</button><button id="bHearJump">Hør hopp</button></div><small id="voiceNote"></small>`;
    if (g === 'admin') extra = `<div class="row"><button id="pPlan">Plan</button><button id="pFly">Fly (ugyldig resultat)</button></div>
      <details><summary>Lydmikser: volum for hver lyd (0 = av, ▶ spiller den)</summary><label>Etterklang (rom) <span id="v_rev"></span></label><input type="range" id="s_rev" min="0" max="0.8" step="0.02">${mixerHtml()}
        <div class="row"><button id="mixAll100">Alle 100 %</button><button id="mixAllOff">Alle av</button><button id="mixReset">Nullstill lyd</button></div></details>
      ${helperCount ? `<label class="chk"><input type="checkbox" id="chkHelpers"> Merk ${helperCount} hjelpeobjekter (lagt inn av brettlageren)</label><small>${(LEVEL.report?.helpers || []).map((h) => `${h.id}: ${h.size_cm.join('×')} cm, topp ${h.top_cm} cm ved (${h.at_cm.join(', ')})`).join('<br>')}</small>` : ''}
      <small><b>Prince:</b> vekt og treghet: du bygger opp fart, snur ikke på stedet, hopp har forberedelse, landing etter fall tar tid og å hive seg opp tar tid. ${TOUCH ? 'Skyv stikken forsiktig for å gå forsiktig.' : 'Hold C for å gå forsiktig.'}<br><b>Klassisk:</b> raskt, dobbelthopp, kanten grips av seg selv.<br><b>Spenning:</b> tyngre og tregere hopp, ingen dobbelthopp. Du må trykke ${GREP}${key('Shift/E')} i riktig øyeblikk for å gripe kant eller tau.</small>
      <div class="row"><button id="lockAdmin">Lås admin</button></div>`;
    const n = changedSettings(items).length;
    return `<details data-g="${g}" ${open[g] ? 'open' : ''}${g === 'admin' ? ' class="adm"' : ''}><summary>${title}${n ? ` <em>${n} endret</em>` : ''}</summary>${items.map(row).join('')}${extra}</details>`;
  };
  p.innerHTML = `<div class="phead"><h3 id="pTitle">Innstillinger</h3><span class="pver">v${VERSION}${adminOn ? ' · ADMIN' : ''}</span></div>
    <div id="repHead" class="rhead">${repHeadHtml()}</div>
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
  p.querySelectorAll('details[data-g]').forEach((el) => el.addEventListener('toggle', () => { open[el.dataset.g] = el.open; store.set('tlm.panelopen', open); }));
  $('levelSel').value = levelId; $('levelSel').onchange = (e) => { store.set('tlm.level', e.target.value); location.search = `?level=${e.target.value}`; };
  confirmed($('pRestart'), 'Start på nytt', 0, () => { restartAll(); $('panel').classList.add('hide'); toast('Startet på nytt'); });
  $('pMenu').onclick = () => { $('panel').classList.add('hide'); showStart(); };
  $('closePanel').onclick = () => $('panel').classList.add('hide');
  // admin skjules bak 7 trykk på tittelen (eller ?admin=1)
  let taps = 0, tapT = 0;
  $('pTitle').onclick = () => { const n = performance.now(); taps = n - tapT < 900 ? taps + 1 : 1; tapT = n; if (taps >= 7) { taps = 0; adminOn = !adminOn; store.set('tlm.admin', adminOn); toast(adminOn ? 'Admin på' : 'Admin av'); buildPanel(); } };
  if ($('lockAdmin')) $('lockAdmin').onclick = () => { adminOn = false; store.set('tlm.admin', false); buildPanel(); toast('Admin låst'); };
  // test
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
setTimeout(() => $('help').classList.add('hide'), 15000);   // H henter den tilbake

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
function antEvent(ev) {
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
// smuler: plukk (R3). Små, rolige tilbakemeldinger: lyd, poeng, kort melding, gnister
function crumbEvent(ev) {
  stats.crumbs = ev.n; logEv('smule', `${ev.id} ${ev.n}/${ev.total}`); audio?.crumb(ev.n, ev.total); buzz(15); setMood('happy', 0.9); spawnShards([ev.x, ev.y, ev.z], 0xffc83a);
  toast(ev.n === ev.total ? `Alle smulene! ${ev.n}/${ev.total}  +${SCORE.crumb} poeng` : `Smule ${ev.n}/${ev.total}  +${SCORE.crumb} poeng`);
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
  autoT += dt; if (mode === 'play' && !won) { metrics.t += dt; if (Math.hypot(touch.x, touch.y) > 0.2 || held('KeyW', 'KeyA', 'KeyS', 'KeyD')) metrics.stickT += dt; }
  if (autoT > 5 && mode === 'play' && !won) {                         // trygg autolagring: en rolig stund på fast grunn
    autoT = 0;
    if (player.onGround && player.state === 'ground' && !player.carry && player.recover <= 0 && player.groundBox && !player.groundBox.dyn && !player.groundBox.owner && player.y > LEVEL.deathY + 5 && !inHazard(LEVEL, player)) { autoPos = [player.x, player.y, player.z]; saveProgress(); }
  }
  const inp = {
    mx: rx * ix + fx * iz, mz: rz * ix + fz * iz,
    jumpPressed: jumpEdge, jumpHeld: held('Space') || touch.jump,
    grabPressed: grabEdge, grabHeld: held('ShiftLeft', 'ShiftRight', 'KeyE') || touch.grab,
    carryPressed: carryEdge, carryHeld: held('KeyF') || touch.carry, aim: aimInput(fx, fz, rx, rz) ?? shoulderAim(dt, fx, fz, held('KeyF') || touch.carry),
    walk: held('KeyC', 'AltLeft', 'AltRight') || (P.faceCam && TOUCH && touch.x * touch.x + touch.y * touch.y < 0.3 && touch.x * touch.x + touch.y * touch.y > 0.01),
    face: P.faceCam && mode === 'play' ? { dx: fx, dz: fz } : undefined,
  };
  jumpEdge = grabEdge = carryEdge = false;
  const pre = { onGround: player.onGround, vy: player.vy, state: player.state, windup: player.windup, carry: !!player.carry, hard: player.hardLands, reach: player.reach > 0, bodies: (LEVEL.bodies || []).map((b) => b.min[0] + b.min[2]) };
  step(player, inp, dt, LEVEL);
  if (antsOn) for (const ev of stepAnts(LEVEL, player, dt, mode === 'play' && !won)) antEvent(ev);
  if (puzzlesOn || puzzleOpenIds(LEVEL).length) for (const ev of stepPuzzles(LEVEL, dt, puzzlesOn && mode === 'play' && !won)) puzzleEvent(ev);
  if (puzzlesOn && mode === 'play' && !won) puzzleIntro();
  if (crumbsOn) for (const ev of stepCollect(LEVEL, player, dt, mode === 'play' && !won)) crumbEvent(ev);
  if (autoCam && !P.faceCam && !viewFirst && mode === 'play' && !camAnim && ['ground', 'air'].includes(player.state) && performance.now() / 1000 - lastDrag > 1.1) {      // Mario-stil: kameraet svinger rolig bak deg
    const k = player.onGround ? 1 : 0.5, sp0 = Math.hypot(player.vx, player.vz);
    const y0 = cam.yaw; if (followStrength > 0) cam.yaw = followYaw(cam.yaw, player.vx, player.vz, P.speed, dt * k, { rateScale: followStrength, capScale: followStrength }); metrics.yawAuto += Math.abs(cam.yaw - y0);
    if (sp0 > 1) { const base = viewMode === 'shoulder' ? pitchBase - 0.08 : pitchBase; cam.pitch += (base - cam.pitch) * Math.min(1, 0.35 * dt); }       // vinkelen går sakte tilbake til normal
  }
  musicFrame(); audioFrame(pre, dt); cueFrame(pre); ambientTick(dt);

  if (player.onGround && player.groundBox?.cp && player.y > save.pos[1] + 0.01) { save.pos = [player.x, player.y, player.z]; placeFlag(); flagV.ignite(); saveProgress(); logEv('sjekkpunkt'); toast('Sjekkpunkt'); audio?.checkpoint(); cue('sjekkpunkt'); setMood('happy', 1.6); say('checkpoint'); }
  if (player.y < LEVEL.deathY) { failAt('falt'); resetPlayer(player, ...save.pos); stats.respawns++; toast(`Falt – tilbake til lagringspunkt  −${SCORE.respawn} poeng`); }
  for (const ev of drainEvents(LEVEL)) {
    logEv(ev.type, ev.id || ev.tool || ev.why || '');
    if (ev.type === 'broke') { audio?.shatter(); cue('noe knuses'); stats.broken++; spawnShards(ev.pos, LEVEL.bodies.find((b) => b.id === ev.id)?.color); toast(`${ev.id} gikk i stykker  −${SCORE.broken} poeng`); }
    else if (ev.type === 'lost') { audio?.splash('pit'); cue('plask'); toast(lostReturnOn ? `${ev.id} forsvant – kommer tilbake om litt` : `${ev.id} forsvant`); if (lostReturnOn) lostQueue.push({ id: ev.id, t: 3 }); }
    else if (ev.type === 'exhausted') { setMood('hurt', 0.6); buzz(30); cue('puster tungt'); }
    else if (ev.type === 'use') {
      audio?.pickup(); buzz(20); setMood('happy', 0.9);
      if (ev.tool === 'thread') { toast(T('toast.threaded', { tieTop: T('btn.tieTop') })); say('thread'); }
      else if (ev.tool === 'zipA') toast(T('toast.tiedTop', { tieEnd: T('btn.tieEnd') }));
      else if (ev.tool === 'zip') { toast(T('toast.zipMade', { grab: GREP })); say('zip'); }
      else say(ev.tool === 'gel' ? 'gel' : 'roll');
    }
    else if (ev.type === 'toolhint') toast(ev.tool === 'needle' ? T('toast.needSpool', { thread: T('btn.thread') }) : ev.tool === 'spool' ? T('toast.needNeedle', { thread: T('btn.thread') }) : ev.tool === 'zip' ? ({ 'zip-flat': T('toast.zipFlat'), 'zip-far': T('toast.zipFar'), 'zip-blocked': T('toast.zipBlocked') }[ev.why] || T('toast.zipStand', { tieTop: T('btn.tieTop') })) : ev.tool === 'gel' ? T('toast.needGel', { smear: T('btn.smear'), drop: T('btn.drop') }) : T('toast.needRoll', { unroll: T('btn.unroll'), drop: T('btn.drop') }));
    else if (ev.type === 'autojump') { buzz(15); if (!store.get('tlm.seen.autojump', false)) { store.set('tlm.seen.autojump', true); toast(TOUCH ? 'Hoppet av seg selv: stikken helt ut mot en kant = hopp over. Skyv forsiktig for å stoppe ved kanten.' : 'Hoppet av seg selv over gapet. Hold C for å gå forsiktig og stoppe ved kanten.'); } }
    else if (ev.type === 'edgestop') { buzz(10); if (!store.get('tlm.seen.edgestop', false)) { store.set('tlm.seen.edgestop', true); toast(TOUCH ? 'Stopper ved kanten. Skyv stikken helt ut for å hoppe over eller gå utfor.' : 'Stopper ved kanten. Slipp C for å gå utfor.'); } }
    else if (ev.type === 'tore') { audio?.drop('paper'); toast('Papirbåndet revnet'); say('tore'); }
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
    toast(`${hz.message || 'Fare!'}  −${SCORE.respawn} poeng`);
  }

  const g = LEVEL.goal;
  if (!won && Math.hypot(player.x - g[0], player.z - g[2]) < 2 && Math.abs(player.y - g[1]) < 2.5) {
    won = true; logEv('MÅL NÅDD', `${clock.toFixed(1)} s`); audio?.win(); music?.duck(0.3, 1.6); setMood('happy', 6); say('goal', true);
    let d;
    { const cl = store.get('tlm.cleared', {}), prevBest = cl[levelId] || 0, n = levelInfo?.n; if (!stats.flew) { cl[levelId] = Math.max(prevBest, points()); store.set('tlm.cleared', cl); store.set('tlm.done', false); const runs = store.get('tlm.runs', {}); runs[levelId] = { t: clock, ants: stats.squashed || 0, crumbs: crumbCount(LEVEL), total: crumbTotal(LEVEL) }; store.set('tlm.runs', runs); }       // husk hvilke nivåer som er klart (beste poeng)
      d = finishData({ n, nextExists: !!nextLevel, clock, stats, crumbs: crumbCount(LEVEL), crumbTotal: crumbTotal(LEVEL), points: points(), prevBest, flew: stats.flew });
      $('winTitle').textContent = n ? (nextLevel ? T('win.level', { n }) : T('win.all')) : T('win.top');
      $('winStats').innerHTML = winHTML(d, T); logEv('målskjerm', `${d.time}, maur ${d.squashed}, smuler ${d.crumbs}/${d.total}`);
      const nb = $('nextLevel'); nb.style.display = nextLevel || (n && storyOn) ? '' : 'none';
      if (nextLevel) { nb.textContent = `${T('win.next')} →`; nb.onclick = () => goLevel(nextLevel.id); }
      else if (n && storyOn) { nb.textContent = `${T('win.ending')} →`; nb.onclick = showEnding; }
      $('again').textContent = T('win.again'); }
    $('win').classList.remove('hide'); $('winHero').innerHTML = heroSVG(d.stars >= 2 ? 'cheer' : 'hi'); $('winConfetti').innerHTML = Array.from({ length: 22 }, (_, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${(i % 7) * 0.12}s;background:${['#ffd9a0', '#e85d4a', '#9fe0c8', '#8fb4ff'][i % 4]}"></i>`).join(''); clearProgress();
  }
}

// romlyd: dryppende kran m.m. fra brettets audio.ambience, planlagt her slik at lydtekst virker uten lyd
const AMB = LEVEL.audio?.ambience || [];
const dripSrc = LEVEL.boxes.find((b) => b.kind === 'faucet');
let dripT = 1 + Math.random() * 2;
function panOf(x, z) {                                       // -1 venstre … +1 høyre sett fra kameraet
  const rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  return Math.max(-1, Math.min(1, ((x - player.x) * rx + (z - player.z) * rz) / 14));
}
function ambientTick(dt) {
  if (mode === 'plan') return;
  if (AMB.includes('fan')) audio?.hum(0.05);
  if (AMB.includes('drip')) {
    dripT -= dt;
    if (dripT <= 0) {
      dripT = 2.4 + Math.random() * 3.6;
      const pan = dripSrc ? panOf((dripSrc.min[0] + dripSrc.max[0]) / 2, (dripSrc.min[2] + dripSrc.max[2]) / 2) : 0;
      audio?.drip(pan); cue('drypp', pan);
    }
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
  if (!pre.onGround && p.onGround && pre.vy < -9) cue(p.landImpact >= P.hardLand ? 'hard landing' : 'landing');
  if (p.landImpact >= P.hardLand && !pre.onGround && p.onGround) buzz(45);
  if ((pre.state !== 'hang' && p.state === 'hang') || (pre.state !== 'climb' && p.state === 'climb')) buzz(14);
  if (pre.state !== 'hang' && p.state === 'hang') cue('tak i kanten');
  if (!pre.carry && p.carry) cue('tok tingen');
  if (pre.carry && !p.carry) cue('slapp / kastet');
}

// R5: stemningen i musikken følger faren (en maur ser deg) og målet
function musicFrame() {
  if (!music) return;
  const m = moodFor({ alerted: antsOn && (LEVEL.antList || []).some((a) => a.alive && a.alerted), won });
  if (m !== musicMood) { musicMood = m; music.setMood(m); logEv('musikk', m); }
}
// lyder som følger av hva som skjedde i dette bildet
function audioFrame(pre, dt) {
  if (!audio) return;
  const p = player, sp = Math.hypot(p.vx, p.vz), surf = surfaceOf(p.groundBox);
  if (pre.windup === 0 && p.windup > 0) audio.windup();                                       // tar sats
  if (pre.onGround && !p.onGround && p.vy > 5) audio.jump();                                  // avspark
  if (!pre.onGround && p.onGround && pre.vy < -3) audio.land(surf, -pre.vy);                  // landing
  if (pre.state !== 'hang' && p.state === 'hang') audio.grab();
  if (pre.state !== 'climb' && p.state === 'climb') audio.grab();
  if (pre.state !== 'swing' && p.state === 'swing') audio.grab();
  if (pre.state !== 'zip' && p.state === 'zip') { audio.grab(); setMood('happy', 3); say('zipping', true); }
  if (pre.state !== 'mantle' && p.state === 'mantle') audio.mantle();
  if (!pre.reach && p.reach > 0) audio.reach();
  if (!pre.carry && p.carry) audio.pickup();
  if (pre.carry && !p.carry) audio.drop(surf);
  audio.fall(p.state === 'air' && p.vy < 0 ? -p.vy : 0);                                      // fallvind
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
const atmos = gfxLow ? null : makeAtmos({ scene, LEVEL, floorY: Math.max(0, ...LEVEL.boxes.filter((b) => b.type === 'floor').map((b) => b.max[1])), sun: SUN, look, name: levelName || LEVEL.name || 'x' });   // R4: lysstråler, mørke hjørner, småting (atmos.js)
function render(now, dt) {
  updateCarryButton();
  hero.gripNear = mode === 'play' && !player.carry && player.reach <= 0 && !!findReachTarget(player, LEVEL, 0.35);      // hånden løftes litt når noe kan gripes
  poseHero(player, now, dt, mode); animateHero(player, now, dt); updateBubble(now); updateStam();
  updateArc(); syncMade(); syncZips(); updateLabels();
  const pulse = 0.5 + 0.5 * Math.sin(now / 260);
  for (const m of gripMarks) { m.edges.material.opacity = gripHi ? 0.7 + 0.3 * pulse : 0.85; m.glow.material.opacity = gripHi ? 0.12 + 0.2 * pulse : 0.07; }
  hero.stepOff = (hero.stepOff || 0) * Math.exp(-dt / 0.07) + (player.stepDy || 0); player.stepDy = 0;                     // trinnhopp: figuren glir opp i stedet for å poppe
  { const rx = react.out, on = reactAnim && rx.active;                      // bare korte, tydelige strekk/klem etter knus/støt (ikke konstant puls)
    hero.root.position.set(player.x, player.y - hero.stepOff + (on ? rx.hop : 0), player.z); updateBlob(now);
    hero.root.scale.set(on ? rx.sxz : 1, on ? rx.sy : 1, on ? rx.sxz : 1); }

  for (const { r, line, end } of ropes) {
    const a = new THREE.Vector3(r.x, r.y, r.z);
    const b = player.rope === r ? new THREE.Vector3(player.x, player.y + 0.85, player.z) : new THREE.Vector3(r.x, r.y - r.len, r.z);
    setCyl(line, a, b); end.position.copy(b);
  }
  for (const v of puzzleViews) v.update(now);
  for (const { c, m } of crumbMeshes) { m.update(c.phase, c.got || !crumbsOn); }
  for (const m of antMeshes) {
    const { t, a, drop } = m;
    if (drop) { drop.visible = antsOn && !!t.drop && !t.drop.taken; if (drop.visible) { drop.position.set(t.drop.x, t.drop.y + 0.35 + Math.sin(clock * 3) * 0.06, t.drop.z); drop.rotation.y = clock * 1.5; } } a.root.visible = antsOn && (t.alive || t.squash < 0.98);
    a.root.position.set(t.x, t.y, t.z);
    const want = Math.atan2(-t.fz, t.fx); let dr = want - m.rot; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); m.rot += dr * Math.min(1, dt * 10); a.root.rotation.y = m.rot;
    a.update(t.phase, t.speedNow || 0, t.squash, t.alerted, t);
  }
  for (const { b, mesh, size } of bodyMeshes) {
    mesh.visible = b.alive;
    if (b.kind === 'needle' && mesh.userData.thread && mesh.userData.on !== !!b.threaded) { mesh.userData.on = !!b.threaded; mesh.userData.thread(!!b.threaded); }
    const bx = b.max[0] - b.min[0], by = b.max[1] - b.min[1], bz = b.max[2] - b.min[2];
    mesh.position.set(b.min[0] + bx / 2, b.min[1] + by / 2, b.min[2] + bz / 2);
    if (b.pole) mesh.rotation.y = b.carried ? Math.atan2(-player.fz, player.fx) : (bz > bx ? Math.PI / 2 : 0);   // staven peker fremover når du bærer den
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
    const ACT = { gel: 'hint.smear', roll: 'hint.unroll', thread: 'hint.thread', 'zip-a': 'hint.tieTop' };
    const pk = puzzlesOn && player.carry && carryingKeyNear(LEVEL, player), pt = puzzlesOn && !player.carry && puzzleTarget(LEVEL, player);
    hint.textContent = pk && !SENT[st.th] && player.charge < P.throwMin ? T('puz.keyPlate', { place: B })
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
    const kxz = 1 - Math.pow(0.04, dt);
    { const la = lookAheadOn && mode === 'play' && player.state === 'ground' ? 0.17 : 0, ka = 1 - Math.pow(0.25, dt);       // se litt foran figuren i gangretningen (mer av det du går mot)
      camAhead.x += (player.vx * la - camAhead.x) * ka; camAhead.z += (player.vz * la - camAhead.z) * ka; }
    cam.target.x += (player.x + camAhead.x - cam.target.x) * kxz; cam.target.z += (player.z + camAhead.z - cam.target.z) * kxz;
    // kameraassistanse: se der du lander (fall) og opp mot neste grep (klatring), og løft deg over vegger i stedet for å bli trukket tett inn
    const falling = !player.onGround && player.vy < -6 && !['hang', 'mantle', 'swing', 'climb', 'zip'].includes(player.state);
    const climbing = ['climb', 'hang'].includes(player.state);
    const lookT = camAssist ? (falling ? -0.9 : climbing ? 0.8 : 0) : 0, pitchT = camAssist ? (falling ? 0.14 : climbing ? -0.08 : 0) : 0;
    const ka = 1 - Math.pow(0.15, dt);
    camLook += (lookT - camLook) * ka; camPitchBias += (pitchT - camPitchBias) * ka;
    cam.target.y = camFocusY + 0.62 + camLook;
    const SH = viewMode === 'shoulder', baseDist = SH ? shDist : cam.dist;
    const sdx = SH ? shSide * shOff * Math.cos(cam.yaw) : 0, sdz = SH ? -shSide * shOff * Math.sin(cam.yaw) : 0;       // sideforskyvning: kameraet over skulderen
    const dirAt = (pitch) => { const c = Math.cos(pitch); return new THREE.Vector3(Math.sin(cam.yaw) * c, Math.sin(pitch), Math.cos(cam.yaw) * c); };
    // v0.86: kameraet blir inne i rommet (ikke utenfor veggen / over taket): bak et vindu eller en vegg ble figuren borte bak karmen eller veggen
    const RM = LEVEL.room, keepIn = !!RM && Number.isFinite(RM.x0) && player.x > RM.x0 && player.x < RM.x1 && player.z > RM.z0 && player.z < RM.z1;
    const inRoom = (x, y, z) => !keepIn || (x > RM.x0 + 0.4 && x < RM.x1 - 0.4 && z > RM.z0 + 0.4 && z < RM.z1 - 0.4 && y < (RM.height || 1e9) - 0.4);
    const clearAt = (dv, dd) => { const x = cam.target.x + dv.x * dd + sdx, y = cam.target.y + dv.y * dd, z = cam.target.z + dv.z * dd + sdz; return !insideAny(x, y, z, 0.25) && inRoom(x, y, z); };
    // v0.87: ved lav kameravinkel sjekkes hele strekningen fra figuren til kameraet, ikke bare endepunktet (ellers kan kameraet havne under en tynn bordplate)
    const clearPath = (dv, dd) => { if (!clearAt(dv, dd)) return false; if (dv.y > 0.15) return true; for (let k = 0.6; k < dd; k += 0.3) if (!clearAt(dv, k)) return false; return true; };
    let liftT = 0;
    if (camAssist && mode !== 'fly' && !clearPath(dirAt(cam.pitch + camPitchBias), baseDist)) {         // noe i veien på full avstand: prøv en høyere vinkel
      for (let o = 0.12; o <= 0.96; o += 0.12) { const pp = Math.min(1.3, cam.pitch + camPitchBias + o); if (clearPath(dirAt(pp), baseDist)) { liftT = pp - cam.pitch - camPitchBias; break; } }
    }
    camLift += (liftT - camLift) * (liftT > camLift ? 1 - Math.pow(0.02, dt) : 1 - Math.pow(0.2, dt));
    const pitchNow = Math.min(1.3, cam.pitch + camPitchBias + camLift);
    // v0.87: ser du selv oppover (dro kameraet ned) mens noe under hindrer kameraet, løftes kameraet som før, men blikket tiltes opp i stedet for å bli tvunget ned igjen (stå på et bord og se mot taket)
    const userUp = cam.pitch < 0.1 && performance.now() / 1000 - lastDrag < 8 && mode !== 'fly';
    camUpTilt += ((userUp ? Math.tan(Math.min(0.8, Math.max(0, camLift))) * cam.cur : 0) - camUpTilt) * (1 - Math.pow(0.1, dt));
    const cp = Math.cos(pitchNow), dir = new THREE.Vector3(Math.sin(cam.yaw) * cp, Math.sin(pitchNow), Math.cos(cam.yaw) * cp);
    let d = baseDist;
    for (; d > (SH ? 0.8 : 1.1); d -= 0.2) { if (clearPath(dir, d)) break; }
    cam.cur += (d - cam.cur) * (d < cam.cur ? 0.5 : 0.08);
    if (!window.__camLock) { camera.position.copy(cam.target).addScaledVector(dir, cam.cur); camera.position.x += sdx; camera.position.z += sdz;
    camera.lookAt(cam.target.x + sdx, cam.target.y + (SH ? 0.12 : 0) + camUpTilt, cam.target.z + sdz); }
  }
  { const fp = viewFirst && mode === 'play', fov = fp ? 74 : viewMode === 'shoulder' ? fovSet + 8 : fovSet;
    for (const o of [hero.head, hero.packG, hero.tailA, hero.tailB]) if (o) o.visible = !fp;
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); } }
  { const xh = $('xhair'); if (xh) xh.style.display = viewMode === 'shoulder' && xhairOn && mode === 'play' ? 'block' : 'none'; }
  if (dust) { dust.points.visible = dustOn && mode !== 'plan'; if (dust.points.visible) dust.update(now / 1000, camera.position.x, camera.position.y, camera.position.z); }
  if (atmos) atmos.update(now / 1000, { rays: raysOn, ao: aoOn, clutter: clutterOn, plan: mode === 'plan', cam: camera.position });
  camera.updateMatrixWorld(); updateFades(dt); updateOffscreen();
  sun.target.position.set(player.x, player.y, player.z);
  sun.position.set(player.x + SUN[0], player.y + SUN[1], player.z + SUN[2]);
  grade.follow(player, camera);
  renderer.render(scene, camera);
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
const TA_MAP = { gel: ['smear', 1], 'need-gel': ['smear', 0], roll: ['unroll', 1], 'need-roll': ['unroll', 0], thread: ['thread', 1], 'need-thread': ['thread', 0], 'need-needle': ['thread', 0], 'zip-a': ['tieTop', 1], 'zip-b': ['tieEnd', 1] };
function taState() {
  const p = player;
  if (p.carry) {
    if (p.charge >= P.throwMin) return { key: 'throw', tone: 'throw', ready: true, th: null };
    const th = toolHint(p, LEVEL), m = TA_MAP[th];
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
  const n = levelInfo?.n; if (!shouldShowIntro({ n, enabled: storyOn, resumed, seen: store.get(`tlm.storySeen.${levelId}`, false) })) return;
  menuOpen = true; keys.clear(); touch.x = touch.y = 0; touch.jump = touch.grab = touch.carry = false; logEv('fortelling', `nivå ${n}`);
  showCard($('story'), { art: heroSVG('hi'), title: T(`story.title.${n}`), text: T(`story.${n}`), btn: T('story.go'), skip: T('story.skip'), onDone: () => { menuOpen = false; store.set(`tlm.storySeen.${levelId}`, true); } });
}
function showEnding() {
  logEv('avslutning');
  const tt = totals(store.get('tlm.runs', {}));
  showCard($('story'), { art: `<div class="sconf">${Array.from({ length: 22 }, (_, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${(i % 7) * 0.12}s;background:${['#ffd9a0', '#e85d4a', '#9fe0c8', '#8fb4ff'][i % 4]}"></i>`).join('')}</div>` + heroSVG('cheer'), title: T('story.endTitle'), text: T('story.end'), extra: `<b class="stot">${T('story.endTotal')}</b>${endHTML(tt, T)}`, btn: T('story.endBtn'), onDone: () => { gameDone = true; clearAllProgress(); store.set('tlm.done', true); store.set('tlm.cleared', {}); store.set('tlm.level', 'bad'); $('win').classList.add('hide'); showStart(); } });
}

// ---------- startskjerm (v0.73): Nytt spill · Fortsett · Innstillinger · Avslutt ----------
// Vises når siden åpnes uten ?level=… (en lenke med brett, «Neste nivå» og brettvelgeren hopper over den). Spillet står stille bak.
let startScreenOn = store.get('tlm.startscreen', true), menuOpen = false;
const startWanted = startScreenOn && levelParam === null && new URLSearchParams(location.search).get('start') !== '0';
let gameDone = store.get('tlm.done', false);   // satt etter avslutningen: menyen viser da bare Nytt spill
const hasProgress = () => !gameDone && (resumed || clock > 4 || levelId !== 'bad' || Object.keys(store.get('tlm.cleared', {})).length > 0);
function clearAllProgress() { try { Object.keys(localStorage).filter((k) => k.startsWith('tlm.progress.') || k.startsWith('tlm.storySeen.') || k === 'tlm.runs').forEach((k) => localStorage.removeItem(k)); } catch { /* privat modus */ } }
function hideStart() { menuOpen = false; $('start').classList.add('hide'); document.body.classList.remove('instart'); }
function newGame() {
  clearAllProgress(); logEv('nytt spill');
  gameDone = false; store.set('tlm.done', false);
  if (levelId === 'bad') { restartAll(); hideStart(); toast('Nytt spill'); resumed = false; showIntro(); }
  else { noSave = true; goLevel('bad'); }                                  // laster nivå 1 på nytt (noSave: pagehide skal ikke skrive tilbake gammel fremgang)
}
function quitGame() {
  saveProgress(); logEv('avslutt');
  $('start').innerHTML = `<h1>${T('menu.byeTitle')}</h1><p class="tag">${T('menu.byeText')}</p><button class="mbtn" id="mBack">${T('menu.back')}</button>`;
  $('mBack').onclick = showStart;
  try { window.close(); } catch { /* nettlesere lar bare skript-åpnede vinduer lukkes: da blir takkesiden stående */ }
}
function showStart() {
  menuOpen = true; keys.clear(); touch.x = touch.y = 0; touch.jump = touch.grab = touch.carry = false; saveProgress();
  if (document.pointerLockElement) document.exitPointerLock();
  const has = hasProgress();
  $('start').innerHTML = `<h1>tinylittleme</h1><p class="tag">${T('menu.tagline')}</p>
    <button class="mbtn" id="mCont" ${has ? '' : 'disabled'}>${T('menu.continue')}<small>${has ? levelLabel : T('menu.nosave')}</small></button>
    <button class="mbtn ${has ? 'sec' : ''}" id="mNew">${T('menu.new')}</button>
    <button class="mbtn sec" id="mSet">${T('menu.settings')}</button>
    <button class="mbtn sec" id="mQuit">${T('menu.quit')}</button>
    <div class="ver">v${VERSION}</div>`;
  $('start').classList.remove('hide'); document.body.classList.add('instart');
  $('mCont').onclick = () => { unlockAudio(); hideStart(); logEv('fortsett'); };
  let armed = 0;
  $('mNew').onclick = () => {
    unlockAudio();
    if (has && !armed) { armed = 1; $('mNew').classList.add('warn'); $('mNew').classList.remove('sec'); $('mNew').textContent = T('menu.sure'); setTimeout(() => { armed = 0; if ($('mNew')) { $('mNew').classList.remove('warn'); $('mNew').classList.toggle('sec', has); $('mNew').textContent = T('menu.new'); } }, 4000); return; }
    newGame();
  };
  $('mSet').onclick = () => { buildPanel(); $('help').classList.add('hide'); $('panel').classList.remove('hide'); };
  $('mQuit').onclick = quitGame;
}
if (startWanted) showStart(); else showIntro();

applyLang();
logEv('plattform', `${platform.kind} (auto: ${platform.auto}, coarse=${platform.coarse}, fine=${platform.fine}, hover=${platform.hover}, touch=${platform.touchPoints})`);
if (!TOUCH && !store.get('tlm.pcseen2', false)) { store.set('tlm.pcseen2', true); setTimeout(() => toast('PC: klikk i bildet for å styre blikket med musa (Esc slipper). WASD går, mellomrom hopper, venstre museknapp eller F tar, høyre eller E griper.'), 2500); }
let last = performance.now();
function frame(now) {
  const raw = now - last, dt = Math.max(0, Math.min(0.05, raw / 1000)); last = now;      // aldri negativ tid (første bilde kan ha et tidsstempel fra før oppstarten var ferdig)
  if (raw > 0 && raw < 2000) { perf.n++; perf.sum += raw; perf.worst = Math.max(perf.worst, raw); perf.win += raw; perf.winN++; if (perf.win > 500) { if (fpsOn) $('fps').textContent = `${Math.round(1000 * perf.winN / perf.win)} fps${renderer.getPixelRatio() < basePr - 0.01 ? ' · ' + renderer.getPixelRatio().toFixed(2) + '×' : ''}`; perf.win = perf.winN = 0; } }
  { const fr = fpsW.push(raw); if (fr && mode === 'play' && !menuOpen && fr.low && (fr.lowRuns === 1 || fr.lowRuns % 10 === 0)) logEv('lav fps', `${fr.fps.toFixed(0)} fps, verste ${Math.round(fr.worst)} ms`);
    if (mode === 'play' && !menuOpen) autoQC.feed(raw);
    const dq = fr && mode === 'play' && !menuOpen ? autoQC.decide(fr, renderer.getPixelRatio(), autoQ, basePr) : null;
    if (dq) { const pr = renderer.getPixelRatio(); renderer.setPixelRatio(dq.pr); renderer.setSize(innerWidth, innerHeight, false); qSteps++; logEv(dq.dir === 'down' ? 'kvalitet ned' : 'kvalitet opp', `oppløsning ${pr.toFixed(2)}× til ${dq.pr.toFixed(2)}× (${fr.fps.toFixed(0)} fps)`); if (dq.dir === 'down' && !qToasted) { qToasted = true; toast('Lavere oppløsning for jevnere bilde. ⚙ → Test → Oppløsning styrer det', true); } } }   // én melding per økt, nede ved kanten så den ikke dekker målpilen; resten logges bare
  if (!window.__paused && !menuOpen) update(dt);
  stepCamAnim(dt); compassFrame(now);
  render(now, dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__markDrag = () => { lastDrag = performance.now() / 1000; };   // testing: som om du nettopp dro i kameraet
window.__camDbg = () => ({ camLook, camPitchBias, camLift, camUpTilt, cur: cam.cur, pitch: cam.pitch });
window.__fadeCount = () => fadeEntries.filter((e) => e.t > 0.5).length;
window.__fadeIds = () => fadeEntries.filter((e) => e.t > 0.01).map((e) => e.boxes.map((b) => b.id).join('+') + ':' + e.t.toFixed(2));
window.__game = { react, footSm, antMeshes, camera, goalArrow, goalArrowG, say, setMood, touch, get audio() { return audio; }, get music() { return music; }, get evLog() { return evLog; }, unlockAudio, player, LEVEL, P, save, stats, setMode, cam, planCam, restartAll, update, poseHero, animateHero, hero, tick: (n, dt = 1 / 60) => { for (let i = 0; i < n; i++) update(dt); } };   // tick: kjør spillogikk raskt (testing)
