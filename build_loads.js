// R48: leker som testlast. Ren logikk (ingen DOM, ingen three.js, kjøres i node).
// Prøven i byggeskjermen kan bruke ulike laster i stedet for bare testfiguren: tennisballen (ruller, hopper ikke), leke-bilen (tung, hjul, små hopp)
// og wind-up-roboten (går selv, ujevnt og med pauser). Fysikkparametrene brukes av build_phys.js (createSim, opts.load); alt er deterministisk (ingen tilfeldighet, bare tid).
//   mass: masse (testfiguren = 1; plankekulene i build_phys har 0,3–0,5 hver, så bilen er mye tyngre enn ballen)
//   r: radius (enheter), speed: fart den vil holde (enheter/s), acc / accAir: hvor raskt den når farten på bakken / i lufta (per s)
//   hop: hoppfart når den støter mot noe, fric: friksjon mot underlaget (lav = ruller)
// Et brett kan kreve laster (data i scenen: site.loads = ['ball', 'car']): da må alle prøves og bestås, i valgfri rekkefølge. Uten krav er valget fritt.
export const DEFAULT_LOAD = 'figure';
export const LOADS = {
  figure: { name: 'Testfigur', en: 'Test figure', icon: '🟡', color: '#ffd23f', mass: 1, r: 0.4, speed: 3.4, acc: 14, accAir: 3, hop: 11.5, fric: 0.1, snd: 'Tripp!' },
  ball: { name: 'Tennisball', en: 'Tennis ball', icon: '🎾', color: '#d6e84a', mass: 0.6, r: 0.45, speed: 4.2, acc: 5, accAir: 0.8, hop: 6.5, fric: 0.02, roll: true, snd: 'Boing!' },
  car: { name: 'Leke-bil', en: 'Toy car', icon: '🚗', color: '#e0453a', mass: 14, r: 0.5, speed: 5, acc: 6, accAir: 1.5, hop: 4.5, fric: 0.02, wheels: true, snd: 'Brrmm!' },
  robot: { name: 'Robot', en: 'Wind-up robot', icon: '🤖', color: '#8fa3b8', mass: 1.8, r: 0.45, speed: 2.6, acc: 10, accAir: 2, hop: 8, fric: 0.1, wobble: true, snd: 'Knirk-knirk!' },
};
export const LOAD_IDS = Object.keys(LOADS);
export const isLoad = (id) => !!LOADS[id];
export const loadParams = (id) => LOADS[id] || LOADS[DEFAULT_LOAD];

// fart etter tid: roboten går i rykk (fjæra trekkes opp og slippes) og stopper helt et øyeblikk hver tredje sekund; de andre holder jevn fart
export const WIND = { period: 1.1, pausePeriod: 3.2, pause: 0.5 };
export function driveSpeed(id, t) {
  const L = loadParams(id); if (!L.wobble) return L.speed;
  if (t % WIND.pausePeriod > WIND.pausePeriod - WIND.pause) return 0;
  return L.speed * (0.45 + 0.9 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI / WIND.period)));
}

// kravene til et sted: gyldige id-er i site.loads (ukjente forkastes, ingen dobler), rekkefølge bevart
export function requiredLoads(site) {
  const out = []; for (const id of Array.isArray(site?.loads) ? site.loads : []) if (isLoad(id) && !out.includes(id)) out.push(id);
  return out;
}
// hvilke laster som kan velges i byggeskjermen: de kravte hvis brettet krever noe; ellers alle (eller bare testfiguren når valget er slått av)
export function offered(site, enabled = true) {
  const req = requiredLoads(site); if (req.length) return req;
  return enabled ? [...LOAD_IDS] : [DEFAULT_LOAD];
}
// etter en vellykket prøve: hvilke laster er bestått, og er stedet løst? Uten krav løser enhver last det.
export function afterWin(site, passed, load) {
  const req = requiredLoads(site), done = [...new Set([...(passed || []).filter(isLoad), ...(isLoad(load) ? [load] : [])])];
  const left = req.filter((id) => !done.includes(id));
  return { passed: done, left, solved: req.length ? left.length === 0 : true };
}
// ved lagring/gjenoppretting: bare kjente id-er
export const cleanPassed = (a) => (Array.isArray(a) ? [...new Set(a.filter(isLoad))] : []);
// neste last å prøve etter at denne er bestått (første som mangler), ellers null
export const nextLoad = (site, passed) => requiredLoads(site).find((id) => !(passed || []).includes(id)) || null;
