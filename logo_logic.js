// R134: logoen «Liten på stor kloss» (brand/). Ren logikk uten DOM: filnavn med ?v=<versjon>, når logoen vises, tekst/HTML for hovedmeny og lasteskjerm.
// Visningen (stil, lasteskjerm som lukkes av seg selv) ligger i logo_view.js. Testes i node (test_logo.mjs).
export const LOGO = {
  key: 'tlm.showlogo',          // lagres som JSON i localStorage (false = av)
  dir: 'brand',
  menu: 'logo-mork.png',        // hovedmenyen har mørk bakgrunn: hvit tekst
  splash: 'logo-mork.png',      // lasteskjermen er mørk
  ratio: 440 / 208,             // bredde / høyde på logofilene
  splashMaxMs: 6000,            // lasteskjermen lukkes uansett etter dette (også hvis menyen aldri kommer)
  splashMinMs: 700,             // vises minst så lenge (så den ikke blinker forbi)
  fadeMs: 350,
  icons: { favicon: 'favicon-32.png', apple: 'icon-180.png', i192: 'icon-192.png', i512: 'icon-512.png' },
  theme: '#F7B500',
};
export const logoUrl = (file, v = '') => `./${LOGO.dir}/${file}${v ? '?v=' + encodeURIComponent(v) : ''}`;
// raw: strengen fra localStorage (eller null/undefined). Bare en uttrykkelig «false» skrur logoen av.
export const logoOn = (raw) => { if (raw === false) return false; if (typeof raw !== 'string') return true; try { return JSON.parse(raw) !== false; } catch { return true; } };
export const menuLogoHtml = ({ on = true, v = '', alt = 'tinylittleme' } = {}) =>
  on ? `<h1 class="logoh1"><img class="logoimg" src="${logoUrl(LOGO.menu, v)}" alt="${alt}" width="440" height="208" decoding="async"></h1>` : `<h1>${alt}</h1>`;
// Når kan lasteskjermen lukkes? Når menyen vises og den har stått minst splashMinMs, eller etter splashMaxMs uansett.
export const splashCloseDelay = ({ elapsed = 0, menuShown = false } = {}) => (elapsed >= LOGO.splashMaxMs ? 0 : menuShown ? Math.max(0, LOGO.splashMinMs - elapsed) : Math.max(0, LOGO.splashMaxMs - elapsed));
export const manifestJson = () => ({
  name: 'tinylittleme', short_name: 'tinylittleme', start_url: './', scope: './', display: 'standalone', orientation: 'any',
  background_color: LOGO.theme, theme_color: LOGO.theme,
  icons: [{ src: `${LOGO.dir}/${LOGO.icons.i192}`, sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: `${LOGO.dir}/${LOGO.icons.i512}`, sizes: '512x512', type: 'image/png', purpose: 'any' }],
});
export const LOGO_FILES = [LOGO.menu, LOGO.splash, ...Object.values(LOGO.icons)];
