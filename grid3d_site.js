// R130: stedet i 3D-laben (data, ren logikk). Én bro over et gap på 8 enheter, med to ankre på hver side (z = 0 og z = 4), dekk i z = 0 og en last (bil) som kjører over.
// En flat bro i ett lag (som i 2D) faller sidelengs; en bro med knuter i et annet lag (z = 2) og staver på skrå gjennom lagene står. Det er hele poenget med laben.
//  - guide: «SÅ SLIK» (tetraeder): første trekant-pyramide under veien, så den andre, så leddet mellom dem. Hvert trinn er en knute (på rutenettet) eller en stav mellom to nøkler.
//    Nøkler: a1..a4 (ankre), d1..d3 (dekk-knuter), k0..k2 (knuter spilleren legger).
export const LAB3D_ID = 'lab3d';
export const LAB3D = {
  id: LAB3D_ID, x: [0, 8], y: [-4, 6], z: [0, 4], floor: -4,
  anchors: [{ x: 0, y: 0, z: 0 }, { x: 8, y: 0, z: 0 }, { x: 0, y: 0, z: 4 }, { x: 8, y: 0, z: 4 }], road: { a: 0, b: 1 },
  budget: 60, stars: [20, 30], mats: ['wood', 'steel', 'rope'], load: 'car',
  guide: [
    { k: 'node', key: 'k0', p: [2, -2, 2], t: 'lab3d.g.keel' },
    { k: 'rod', a: 'k0', b: 'a1', t: 'lab3d.g.legs' }, { k: 'rod', a: 'k0', b: 'a3', t: 'lab3d.g.legs' }, { k: 'rod', a: 'k0', b: 'd1', t: 'lab3d.g.legs' }, { k: 'rod', a: 'd1', b: 'a3', t: 'lab3d.g.legs' },
    { k: 'node', key: 'k2', p: [6, -2, 2], t: 'lab3d.g.other' },
    { k: 'rod', a: 'k2', b: 'a2', t: 'lab3d.g.legs' }, { k: 'rod', a: 'k2', b: 'd3', t: 'lab3d.g.legs' }, { k: 'rod', a: 'd3', b: 'a4', t: 'lab3d.g.legs' },
    { k: 'node', key: 'k1', p: [4, -2, 2], t: 'lab3d.g.join' },
    { k: 'rod', a: 'k0', b: 'k1', t: 'lab3d.g.join' }, { k: 'rod', a: 'k1', b: 'k2', t: 'lab3d.g.join' },
  ],
};
// der bygget står i rommet: ahead enheter foran figuren (i kameraretningen), dekket dy enheter over gulvet
export const WORLD3 = { ahead: 9, dy: 3.4, post: 0.5 };
