import { classify, impactAt, markerStyle, fallShare, windBoost, fovTarget, approach, landingEvent, REACT, CLASSES } from './landing.js';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FEIL', m); } };
// landingsklasser (tre)
ok(CLASSES.length === 3 && CLASSES.every((c) => REACT[c]), 'tre klasser med reaksjon');
ok(classify(5, 18, 27) === 'soft' && classify(17.9, 18, 27) === 'soft', 'myk under hard');
ok(classify(18, 18, 27) === 'hard' && classify(26.9, 18, 27) === 'hard', 'hard fra terskel');
ok(classify(27, 18, 27) === 'danger' && classify(60, 18, 27) === 'danger', 'farlig fra knockV');
ok(classify(99, Infinity, Infinity) === 'soft', 'Klassisk (ingen skade): alltid myk');
// fart og myk flate
ok(Math.abs(impactAt(-10, 0, -20) - 10) < 1e-9, 'ingen høyde: samme fart');
ok(Math.abs(impactAt(0, 10, -20) - 20) < 1e-9, 'fritt fall 10: sqrt(2gh)');
ok(Math.abs(impactAt(-20, 10, -20, true, 0.35) - impactAt(-20, 10, -20) * 0.35) < 1e-9, 'myk flate tar andel');
// markør
for (const c of CLASSES) { const m = markerStyle(c, 123); ok(m.scale > 0.3 && m.scale < 0.9 && m.opacity > 0.4, 'markør ' + c); }
ok(markerStyle('soft', 0).color !== markerStyle('hard', 0).color && markerStyle('hard', 0).color !== markerStyle('danger', 0).color, 'markørfarger ulike');
// vind og FOV
ok(fallShare(0, 18) === 0 && fallShare(6, 18) === 0, 'ingen vind i rolig fall');
ok(fallShare(18, 18) === 1 && fallShare(40, 18) === 1, 'full ved terskel');
let prev = -1; for (let s = 0; s <= 30; s++) { const f = fallShare(s, 18); ok(f >= prev, 'monoton'); prev = f; } 
ok(windBoost(0, 18) === 1 && windBoost(18, 18, 1) > 2 && windBoost(18, 18, 0) === 1, 'vindfaktor');
ok(fovTarget(0, 18, 6) === 0 && Math.abs(fovTarget(18, 18, 6) - 6) < 1e-9 && fovTarget(18, 18, 0) === 0, 'FOV 0..maks, av med 0');
ok(fovTarget(15, Infinity, 6) > 0 && fovTarget(15, Infinity, 6) < 6, 'uendelig terskel bruker standard 24');
let x = 0; for (let i = 0; i < 120; i++) x = approach(x, 6, 1 / 60); ok(x > 4.5 && x <= 6, 'glir opp');
for (let i = 0; i < 240; i++) x = approach(x, 0, 1 / 60); ok(x < 0.05, 'glir tilbake');
// landingshendelse
ok(landingEvent(-5, 5, 18, 27) === null, 'lite fall: ingen hendelse');
ok(landingEvent(0, 20, 18, 27) === null, 'ikke fall');
const a = landingEvent(-12, 12, 18, 27), b = landingEvent(-20, 20, 18, 27), c = landingEvent(-30, 30, 18, 27);
ok(a.cls === 'soft' && a.sound === 'soft' && a.cue && !a.mood, 'myk: lyd og tekst, ingen skade');
ok(b.cls === 'hard' && b.mood === 'hurt' && b.buzz > 0, 'hard: reaksjon');
ok(c.cls === 'danger' && c.moodT > b.moodT && c.buzz > b.buzz && c.cue !== b.cue, 'farlig: sterkere og egen tekst');
ok(new Set([a.sound, b.sound, c.sound]).size === 3, 'egen lyd per klasse');
if (bad) { console.log(bad, 'feil'); process.exit(1); } console.log('landing: ok');
