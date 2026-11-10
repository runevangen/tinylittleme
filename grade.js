// Toy Story-lys og farge (R1): varmt nøkkellys, kjølig fyll, kantlys og mild fargegradering.
// Rene funksjoner (testes i node) + applyGrade som setter lysene. Bare utseende, ingen kollisjon.

export const GRADE_MODES = ['film', 'off'];

// Parametre for lyset. `look` er level.look (exposure, sun) fra scenen; film-modus løfter dem litt, bare relativt.
export function gradeParams(look = {}, mode = 'film', low = false) {
  const exposure = look.exposure ?? 1.05, sun = look.sun ?? 3.0;
  if (mode === 'off') return { exposure, sun, sunColor: 0xffe7c2, hemiSky: 0xeaf1ff, hemiGround: 0xa5845c, hemi: 0.42, fill: 0, rim: 0, env: 0.55, filter: '', gloss: 1 };
  return {
    exposure: exposure * 1.0,                 // omtrent som før: kontrasten kommer fra lysfargene, ikke fra mørkere rom
    sun: sun * 1.25,
    sunColor: 0xffae55,                        // tydelig varm (gyllen) sol
    hemiSky: 0x7aa4ff, hemiGround: 0xd9873f,   // kjølig blå himmel i skyggene, varmt gjenskinn fra gulvet
    hemi: 0.55,
    env: 0.4,                                  // mindre nøytralt miljølys, så farget lys og skygge vinner
    fill: low ? 0 : 0.9,                       // kjølig fyll fra motsatt side (uten skygge)
    rim: low ? 0 : 1.1,                        // varmt kantlys bakfra (lyser opp omrisset på figuren)
    warmTile: [1.0, 0.9, 0.74],                // fliser (grå i brettet) får varm krem-tone
    gloss: low ? 1 : 1.7,                      // miljøspeiling på blank plast/porselen (klarlakk): synlige glansflekker
    filter: low ? '' : 'saturate(1.45) contrast(1.14) sepia(0.14)',   // Enkel grafikk: ingen filter (billig)
  };
}
