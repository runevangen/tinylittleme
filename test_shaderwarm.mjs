// R35: testene for shaderwarm.js (ren logikk) + at Lav profil ikke rører ting som inngår i shader-nøkkelen.
import { programCount, programKeys, keyHash, warmFades, warmRender, setSunShadowLow, LOW_SHADOW, createShaderWatch } from './shaderwarm.js';
import { readFileSync } from 'node:fs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FEIL', m); } };

ok(programCount(null) === 0 && programCount({ info: { programs: [1, 2, 3] } }) === 3 && programCount({ info: {} }) === 0, 'programCount');

// warmRender: slår av frustumCulled under tegning og gjenoppretter, også ved feil
{
  const objs = [{ frustumCulled: true }, { frustumCulled: false }, { frustumCulled: true }];
  const scene = { traverse: (f) => objs.forEach(f) }; let seen = null;
  const n = warmRender({ render: () => { seen = objs.map((o) => o.frustumCulled); } }, scene, {});
  ok(n === 2 && seen.every((v) => v === false), 'warmRender: alt «synlig» under tegning');
  ok(objs[0].frustumCulled === true && objs[1].frustumCulled === false && objs[2].frustumCulled === true, 'warmRender: gjenoppretter');
  let thrown = false; try { warmRender({ render: () => { throw new Error('x'); } }, scene, {}); } catch { thrown = true; }
  ok(thrown && objs[0].frustumCulled === true, 'warmRender: gjenoppretter ved feil');
}

// Lav profil-skygge: castShadow røres ikke; kart og kamera byttes og kommer tilbake
{
  let upd = 0, disposed = 0;
  const sun = { castShadow: true, shadow: { mapSize: { x: 2048, y: 2048, set(a, b) { this.x = a; this.y = b; } }, camera: { near: 1, far: 220, updateProjectionMatrix() { upd++; } }, map: { dispose() { disposed++; } } } };
  const normal = { size: 2048, near: 1, far: 220 };
  setSunShadowLow(sun, true, normal);
  ok(sun.castShadow === true, 'lav profil: castShadow står (ellers nye shadere)');
  ok(sun.shadow.mapSize.x === LOW_SHADOW.size && sun.shadow.camera.near === LOW_SHADOW.near && sun.shadow.camera.far > sun.shadow.camera.near, 'lav profil: bittelite kart og kamera som ikke ser noe');
  ok(sun.shadow.map === null && disposed === 1, 'lav profil: gammelt skyggekart frigjort');
  sun.shadow.map = { dispose() { disposed++; } };
  setSunShadowLow(sun, false, normal);
  ok(sun.shadow.mapSize.x === 2048 && sun.shadow.camera.near === 1 && sun.shadow.camera.far === 220 && upd === 2, 'tilbake: kart og kamera gjenopprettet');
  ok(sun.castShadow === true && sun.shadow.map === null && disposed === 2, 'tilbake: nytt kart lages ved neste tegning');
}

// shaderovervåking: teller bare økning etter forvarming
{
  let n = 42; const w = createShaderWatch(() => n);
  ok(w.tick('a') === null && w.line() === 'ikke forvarmet', 'før forvarming: ingen hendelser');
  w.mark(); ok(w.base === 42 && w.tick() === null && w.line() === '42 ved start, 42 nå', 'etter mark: uendret');
  n = 45; const ev = w.tick('landing'); ok(ev && ev.from === 42 && ev.to === 45 && ev.base === 42 && ev.near === 'landing', 'økning gir hendelse');
  ok(w.tick() === null && w.grew === 3 && /\+3 etter forvarming/.test(w.line()), 'samme antall igjen: stille; linje viser økning');
  n = 40; ok(w.tick() === null, 'nedgang (frigjort) er ikke hakk');
}

// R35b: utoningskopier forvarmes (gjennomsiktige materialer = egne shadere), alt gjenopprettes, nye programmer får korte nøkler i loggen
{
  const log = []; const es = [{ id: 1, clone: new Map([[1, 2]]), orig: new Map([[1, 3]]) }, { id: 2, clone: new Map(), orig: new Map() }];
  const n = warmFades(es, (e) => log.push('on' + e.id), (e) => log.push('off' + e.id), () => log.push('render'));
  ok(n === 2 && log.join() === 'on1,on2,render,off1,off2', 'warmFades: alle på, én tegning, alle av');
  ok(es[0].clone.size === 0 && es[0].orig.size === 0, 'warmFades: kopiene tømmes (programmene blir i hurtigbufferen)');
  const log2 = []; let thrown = false;
  try { warmFades(es, (e) => { if (e.id === 2) throw new Error('x'); log2.push('on' + e.id); }, (e) => log2.push('off' + e.id), () => {}); } catch { thrown = true; }
  ok(thrown && log2.join() === 'on1,off1', 'warmFades: gjenoppretter dem som var slått på ved feil');
  ok(keyHash('abc') === keyHash('abc') && keyHash('abc') !== keyHash('abd'), 'keyHash stabil');
  ok(programKeys({ info: { programs: [{ name: 'a', cacheKey: 'x' }, { name: 'b', id: 7 }] } }).length === 2 && programKeys(null).length === 0, 'programKeys');
  let n2 = 2, set = ['a#1', 'b#2']; const w = createShaderWatch(() => n2, () => set); w.mark(); n2 = 3; set = ['a#1', 'b#2', 'c#3'];
  const ev = w.tick('stomp'); ok(ev && ev.keys.length === 1 && ev.keys[0] === 'c#3', 'økning rapporterer nøkkelen til det nye programmet');
}

// kildesjekk: ingen kode som endrer lysenes antall/skygge-nøkkel ved Lav profil
{
  const main = readFileSync(new URL('./main.js', import.meta.url), 'utf8'), grade = readFileSync(new URL('./grade_apply.js', import.meta.url), 'utf8'), soft = readFileSync(new URL('./softlight.js', import.meta.url), 'utf8');
  const lp = main.slice(main.indexOf('function applyLowProfile'), main.indexOf('function applyLowProfile') + 900);
  ok(!/sun\.castShadow\s*=\s*!on/.test(lp) && /setSunShadowLow\(/.test(lp), 'applyLowProfile bruker setSunShadowLow');
  ok(!/\.visible\s*=\s*!on/.test(grade), 'grade.setLow slår ikke lys av/på med visible');
  ok(/softShadowType\(onSet, false, gfxLow\)/.test(soft), 'softlight: Lav profil bytter ikke skyggetype');
  ok(/warmFades\(fadeEntries/.test(main) && /nye: /.test(main), 'main: utoningskopier forvarmes og nye nøkler logges');
  ok(/warmRender\(/.test(main) && /logEv\('shadere'/.test(main), 'main: full forvarming og logg av nye shadere');
}
console.log(bad ? `${bad} feil` : 'ok: shaderwarm');
process.exit(bad ? 1 : 0);
