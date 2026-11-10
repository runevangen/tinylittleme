// Toy Story-lys og farge (R1): varmt nøkkellys, kjølig fyll, kantlys og mild fargegradering.
// Rene funksjoner (testes i node) + applyGrade som setter lysene. Bare utseende, ingen kollisjon.

export const GRADE_MODES = ['film', 'off'];

// Parametre for lyset. `look` er level.look (exposure, sun) fra scenen; film-modus løfter dem litt, bare relativt.
export function gradeParams(look = {}, mode = 'film', low = false) {
  const exposure = look.exposure ?? 1.05, sun = look.sun ?? 3.0;
  if (mode === 'off') return { exposure, sun, sunColor: 0xffe7c2, hemiSky: 0xeaf1ff, hemiGround: 0xa5845c, hemi: 0.42, fill: 0, rim: 0, filter: '' };
  return {
    exposure: exposure * 1.06,                 // litt lysere, så skyggene med mer kontrast ikke gjør rommet mørkere
    sun: sun * 1.1,
    sunColor: 0xffd9a0,                        // varm sol
    hemiSky: 0xcfe0ff, hemiGround: 0xb98a5a,   // kjølig himmel, varmt gjenskinn
    hemi: 0.4,
    fill: low ? 0 : 0.55,                      // kjølig fyll fra motsatt side (uten skygge)
    rim: low ? 0 : 0.9,                        // kantlys bakfra
    filter: low ? '' : 'saturate(1.18) contrast(1.06)',
  };
}

