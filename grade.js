// Toy Story-lys og farge (R1): varmt nøkkellys, kjølig fyll, kantlys og mild fargegradering.
// Rene funksjoner (testes i node) + applyGrade som setter lysene. Bare utseende, ingen kollisjon.

export const GRADE_MODES = ['film', 'off'];

// Parametre for lyset. `look` er level.look (exposure, sun) fra scenen; film-modus løfter dem litt, bare relativt.
// Mildt fargefilter: ingen sepia (ga ensfarget beige), lav kontrast (ga utbrente flater)
export const FILTER = 'saturate(1.18) contrast(1.04)';

export function gradeParams(look = {}, mode = 'film', low = false, filterOn = true) {
  const exposure = look.exposure ?? 1.05, sun = look.sun ?? 3.0;
  if (mode === 'off') return { exposure, sun, sunColor: 0xffe7c2, hemiSky: 0xeaf1ff, hemiGround: 0xa5845c, hemi: 0.42, fill: 0, rim: 0, env: 0.55, filter: '', gloss: 1, tileRough: 0 };
  return {
    exposure: exposure * 1.0,                 // omtrent som før: kontrasten kommer fra lysfargene, ikke fra mørkere rom
    sun: sun * 1.05,                           // nesten som før: sterkere sol brente ut fliser
    sunColor: 0xffd8a0,                        // varm sol, men ikke så oransje at alt blir beige
    hemiSky: 0x8fb0ff, hemiGround: 0xa88a66,   // kjølig blå himmel i skyggene, dempet varmt gjenskinn
    hemi: 0.55,
    env: 0.4,                                  // mindre nøytralt miljølys, så farget lys og skygge vinner
    fill: low ? 0 : 0.6,                       // kjølig fyll fra motsatt side (uten skygge)
    rim: low ? 0 : 0.5,                        // varmt kantlys bakfra (lyser opp omrisset på figuren)
    tileRough: 0.9,                            // fliser matte nok til at solspeilingen ikke klipper til hvitt
    gloss: low ? 1 : 1.7,                      // miljøspeiling på blank plast/porselen (klarlakk): synlige glansflekker
    filter: low || !filterOn ? '' : FILTER,                 // eget valg (gradefilter); Enkel grafikk: aldri filter (billig)
  };
}
