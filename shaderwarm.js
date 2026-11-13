// R35: færre hakk. three kompilerer et nytt shaderprogram hver gang noe i scenen får en ny «nøkkel» (antall lys, skygge på/av, skyggetype,
// utfarge/toneMapping i gjennomsiktighetspasset ...). Hver slik kompilering midt i spillet er et hakk på 300–3000 ms på iPhone.
// Ren logikk uten three-import (tar renderer/scene/sun som argument), så den testes i node (test_shaderwarm.mjs).

export const programCount = (renderer) => (renderer && renderer.info && renderer.info.programs ? renderer.info.programs.length : 0);

// Tegner ett helt bilde der ALT regnes som synlig (ingen frustum-utvelging), så three kompilerer også variantene som bare brukes i
// gjennomsiktighetspasset (glass, flasken ved målet): renderer.compile() tar ikke med dem, og de kom først når glasset kom i syne.
// Gjenoppretter flaggene etterpå. Returnerer antall objekter som ble rørt.
export function warmRender(renderer, scene, camera) {
  const touched = [];
  scene.traverse((o) => { if (o.frustumCulled) { touched.push(o); o.frustumCulled = false; } });
  try { renderer.render(scene, camera); } finally { for (const o of touched) o.frustumCulled = true; }
  return touched.length;
}

// R35b: ting som tones ut (vegger/gardiner mellom kamera og figur) får en gjennomsiktig kopi av materialet (transparent=true gir en annen shadernøkkel),
// og kopien kompilerte først første gang noe kom i veien midt i spillet. Slå på utoning for ALLE, tegn ett bilde, slå av og tøm kopiene (programmene blir i hurtigbufferen).
// entries: liste med fade-oppføringer; on(e)/off(e) bytter materialer; render() tegner. Returnerer antall oppføringer. Gjenoppretter også ved feil.
export function warmFades(entries, on, off, render) {
  const done = [];
  try { for (const e of entries) { on(e); done.push(e); } render(); }
  finally { for (const e of done) { off(e); if (e.clone && e.clone.clear) e.clone.clear(); if (e.orig && e.orig.clear) e.orig.clear(); } }
  return done.length;
}

// Lav profil skal ikke endre noe som inngår i shader-nøkkelen (da kompileres alle materialer på nytt midt i spillet).
// I stedet for sun.castShadow = false: behold skyggelyset, men gi skygge-kartet bittelite størrelse og et kamera som ikke ser noe
// (ingen skyggetegning, ingen kartminne). Skyggen kommer tilbake ved å gjenopprette størrelse og kamera. Forventer sun.shadow med camera og mapSize.
export const LOW_SHADOW = { size: 16, near: 1e5, far: 1e5 + 1 };
export function setSunShadowLow(sun, on, normal) {
  const sh = sun.shadow, cam = sh.camera;
  if (on) { sh.mapSize.set(LOW_SHADOW.size, LOW_SHADOW.size); cam.near = LOW_SHADOW.near; cam.far = LOW_SHADOW.far; }
  else { sh.mapSize.set(normal.size, normal.size); cam.near = normal.near; cam.far = normal.far; }
  cam.updateProjectionMatrix();
  if (sh.map) { sh.map.dispose(); sh.map = null; }          // frigjør gammelt kart; three lager et nytt i riktig størrelse ved neste tegning
  return on;
}

// Følger antall shaderprogram etter forvarmingen. tick() kalles ofte (billig) og gir en hendelse når antallet har økt.
// R35b: describe (valgfri) gir en liste med korte programnøkler; ved økning rapporteres de nye (ev.keys), så rapporten viser hvilket materiale som ga den siste shaderen.
export const programKeys = (renderer) => (renderer && renderer.info && renderer.info.programs ? renderer.info.programs.map((p) => `${p.name || ''}#${keyHash(String(p.cacheKey || p.id || ''))}`) : []);
export function keyHash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0; return h.toString(36); }
export function createShaderWatch(count, describe) {
  let base = null, last = null, grew = 0, known = new Set();
  return {
    mark() { base = last = count(); if (describe) known = new Set(describe()); return base; },
    get base() { return base; }, get now() { return last; }, get grew() { return grew; },
    tick(near = '') { if (base === null) return null; const n = count(); if (n <= last) { last = Math.min(last, n); return null; } const ev = { from: last, to: n, base, near }; if (describe) { const now = describe(), fresh = now.filter((k) => !known.has(k)); fresh.forEach((k) => known.add(k)); ev.keys = fresh.slice(0, 6); } grew += n - last; last = n; return ev; },
    line() { return base === null ? 'ikke forvarmet' : `${base} ved start, ${last} nå${last > base ? ` (+${last - base} etter forvarming)` : ''}`; },
  };
}
