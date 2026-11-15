// R71: ⚑ (tilbakemelding) skal finnes på alle skjermer. Ren logikk uten DOM (testes i node: test_flag.mjs).
// screenOf: hvilken skjerm er oppe (til rapporten og til plasseringen). floatOn: skal den flytende ⚑-knappen vises
// (i toppbåndet ligger ⚑ inni båndet, og i ⚙-panelet ligger den i panelhodet).
export const FLAG_SCREENS = ['spill', 'meny', 'start', 'brettvalg', 'bygg', 'oversikt', 'mal', 'intro', 'historie', 'innstillinger'];
const FLOAT_IN_PLAY = new Set(['spill', 'meny']);   // her finnes ⚑ fra før (flytende eller i toppbåndet)

// s: { panel, building, buildSite, ov, story, win, intro, start, pick, more }  (sanne/usanne verdier; pick = «Velg brett»/vanskelighet)
export function screenOf(s = {}) {
  let id = 'spill';
  if (s.panel) id = 'innstillinger';
  else if (s.building) id = 'bygg';
  else if (s.ov) id = 'oversikt';
  else if (s.story) id = 'historie';
  else if (s.start) id = s.pick ? 'brettvalg' : 'start';
  else if (s.win) id = 'mal';
  else if (s.intro) id = 'intro';
  else if (s.more) id = 'meny';
  return id === 'bygg' && s.buildSite ? { id, label: `byggeskjerm (${s.buildSite})` } : { id, label: id === 'bygg' ? 'byggeskjerm' : id };
}

// Skal den flytende knappen vises? qbtnOn = innstillingen «Vis vurderingsknappen», tbOn = toppbåndet er på, cinema = kinomodus.
export function floatOn(screenId, { qbtnOn = true, tbOn = false, cinema = false } = {}) {
  if (cinema || !qbtnOn) return false;
  if (screenId === 'innstillinger') return false;                   // egen ⚑ i panelhodet
  if (!FLAG_SCREENS.includes(screenId)) return false;
  return FLOAT_IN_PLAY.has(screenId) ? !tbOn : true;               // i spill/meny: bare uten toppbånd (som før)
}

