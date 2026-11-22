// R136: neste last velges automatisk etter bestått prøve. Ren logikk (ingen DOM, kjøres i node: test_autoload.mjs).
// Delt av alle byggesteder med flere laster (Lekerom, Hyllebroen, Byggeskolen, runde 2) via build.js (R101).
import { requiredLoads, nextLoad } from './build_loads.js';

// etter en bestått prøve: hva skjer med lastvalget? on: valget autonextload. current: lasten som ligger valgt nå.
// Returnerer { pick, next, done, total }: next = neste ubestått last (eller null), pick = lasten som skal velges (null = behold valget).
export function afterPass({ on, site, passed, current }) {
  const total = requiredLoads(site).length, p = Array.isArray(passed) ? passed : [];
  const done = requiredLoads(site).filter((id) => p.includes(id)).length;
  const next = nextLoad(site, p);
  return { pick: on && next && next !== current ? next : null, next, done, total };
}

// tekstlinjen på resultatkortet: { next, done, total } eller null når ingen last står igjen
export function cardLine({ next, done, total }) { return next && total > 1 ? { next, done, total } : null; }
