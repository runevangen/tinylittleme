// R133: BYGGING-gruppen i VELG BRETT (BYGGESKOLE og 3D-LAB flyttet fra hovedmenyen). Ren logikk (ingen DOM/three, testes i node: test_bygging.mjs);
// visning i bygging_view.js, hekter i main.js.
export const BYGGING = {
  seenKey: 'tlm.bygging.moved',   // engangsvarselet er sett (eller ikke aktuelt)
  lab3dUrl: (path) => `${path}?level=bygglab&lab3d=1`,
};
// Hvilke kort gruppen har: BYGGESKOLE alltid (unntatt kinomodus), 3D-LAB bare med valget build3d på.
export function buildingCards({ cinema = false, build3d = true } = {}) {
  if (cinema) return [];
  return build3d ? ['school', 'lab3d'] : ['school'];
}
// Skal engangsvarselet «BYGGESKOLE og 3D-LAB ligger nå under VELG BRETT» vises nå? Ikke for nye spillere (de har aldri sett knappene),
// ikke i kinomodus, ikke når det er sett, ikke når valget er av.
export const movedNoticeShould = ({ on = true, seen = false, firstRun = false, cinema = false } = {}) => !!on && !seen && !firstRun && !cinema;
