// R54: roligere kamera. Rene funksjoner (ingen DOM) for synsfelt etter skjermformat og engangs-migrering av kamerafølging.
export const FOV_LAND = 52, FOV_PORT = 70;
export const CALM_KEY = 'tlm.calm1';

// Loddrett synsfelt i grader for en skjerm: stående (høyde > bredde) 70, liggende 52 (som før).
export const fovForAspect = (aspect) => (aspect < 1 ? FOV_PORT : FOV_LAND);
export const orientationOf = (aspect) => (aspect < 1 ? 'stående' : 'liggende');

// Vannrett synsfelt i grader ved gitt loddrett synsfelt og skjermformat (til test og rapport).
export const hFov = (vDeg, aspect) => 2 * Math.atan(Math.tan(vDeg * Math.PI / 360) * aspect) * 180 / Math.PI;

// Valgt synsfelt: har spilleren selv valgt et i ⚙ (manual), brukes det; ellers automatisk etter format.
export const effectiveFov = (manual, autoDeg) => (manual === null || manual === undefined ? autoDeg : manual);

// Lagret tlm.fov regnes som spillerens eget valg hvis det finnes og avviker fra gammel standard (52).
export const fovChosen = (stored) => typeof stored === 'number' && Math.abs(stored - FOV_LAND) > 1e-6;

// Engangs-migrering: følging av som standard for alle, også dem med gammel lagret verdi. Returnerer true hvis den kjørte.
export function migrateCalm(get, set) {
  if (get(CALM_KEY, false)) return false;
  set(CALM_KEY, true); set('tlm.follow', false);
  return true;
}

export const camLine = ({ fov, auto, aspect, follow, strength }) =>
  `synsfelt ${Math.round(fov)}° ${auto ? `(automatisk, ${orientationOf(aspect)})` : '(valgt av spilleren)'}, vannrett ca. ${Math.round(hFov(fov, aspect))}°, kamerafølging ${follow && strength > 0 ? `på (styrke ${strength})` : 'av'}`;
