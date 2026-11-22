// Lager merkevare-filene i brand/ (logo og app-ikon) av tegningen «Liten på stor kloss».
// Kjør: NODE_PATH=$(npm root -g) node tools/make_logo.cjs   (trenger nett for skriften Fredoka)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'brand');
const DEFS = `
<linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0584E"/><stop offset="1" stop-color="#D23A31"/></linearGradient>
<linearGradient id="gYel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC933"/><stop offset="1" stop-color="#F2A900"/></linearGradient>
<symbol id="fig" viewBox="0 0 20 32">
<rect x="6" y="22" width="3.4" height="9" rx="1.5" fill="#3A4A6B"/><rect x="10.6" y="22" width="3.4" height="9" rx="1.5" fill="#3A4A6B"/>
<rect x="4" y="11" width="12" height="13" rx="4" fill="#2D7FF9"/><rect x="3" y="13" width="14" height="3.4" rx="1.6" fill="#F7B500"/>
<path d="M15.5 14 l3.2 3.4 -2.4 .6z" fill="#F7B500"/><circle cx="10" cy="6.2" r="5.2" fill="#F2C49B"/>
<path d="M4.9 5.6 q.6 -5.2 5.2 -5.2 q4.8 0 5 5.2 q-3 -2.6 -10.2 0z" fill="#6B3F24"/>
<circle cx="8.2" cy="6.6" r=".85" fill="#1C2A44"/><circle cx="11.8" cy="6.6" r=".85" fill="#1C2A44"/>
<path d="M8.6 8.6 q1.4 1 2.8 0" stroke="#1C2A44" stroke-width=".7" fill="none" stroke-linecap="round"/></symbol>
<symbol id="mark" viewBox="0 0 136 190">
<ellipse cx="68" cy="68" rx="24" ry="3.4" fill="#000" opacity=".2"/>
<rect x="22" y="62" width="14" height="10" rx="4" fill="#B52F27"/><rect x="100" y="62" width="14" height="10" rx="4" fill="#B52F27"/>
<rect x="0" y="68" width="136" height="122" rx="20" fill="url(#gRed)"/>
<rect x="18" y="69" width="100" height="9" rx="4.5" fill="#FF8A80" opacity=".55"/>
<rect x="122" y="84" width="14" height="86" rx="7" fill="#B52F27" opacity=".35"/>
<text x="62" y="168" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="104" fill="#fff">t</text>
<use href="#fig" x="55" y="26" width="26.25" height="42"/></symbol>`;
const logoSvg = (ink, me) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="6 0 335 208" width="670" height="416"><defs>${DEFS}</defs>
<use href="#mark" x="14" y="6" width="136" height="190"/>
<text x="176" y="126" font-family="Fredoka" font-weight="700" font-size="78" fill="${ink}">tiny</text>
<text x="178" y="172" font-family="Fredoka" font-weight="700" font-size="42" fill="${me}">little me</text></svg>`;
const iconSvg = (round) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs>${DEFS}</defs>
<rect width="120" height="120" rx="${round ? 27 : 0}" fill="url(#gYel)"/><use href="#mark" x="24.2" y="8" width="71.6" height="100"/></svg>`;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'logo-lys.svg'), logoSvg('#1C2A44', '#2D7FF9'));
  fs.writeFileSync(path.join(OUT, 'logo-mork.svg'), logoSvg('#FFFFFF', '#8FD0FF'));
  fs.writeFileSync(path.join(OUT, 'icon.svg'), iconSvg(false));
  const b = await chromium.launch();
  async function png(svg, w, h, file, transparent) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.setContent(`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@700&display=swap"><style>html,body{margin:0;background:transparent}svg{display:block;width:${w}px;height:${h}px}</style>${svg}`);
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
    await p.screenshot({ path: path.join(OUT, file), omitBackground: transparent });
    await p.close();
  }
  await png(logoSvg('#1C2A44', '#2D7FF9'), 670, 416, 'logo-lys.png', true);
  await png(logoSvg('#FFFFFF', '#8FD0FF'), 670, 416, 'logo-mork.png', true);
  await png(iconSvg(false), 180, 180, 'icon-180.png', false);
  await png(iconSvg(false), 192, 192, 'icon-192.png', false);
  await png(iconSvg(false), 512, 512, 'icon-512.png', false);
  await png(iconSvg(true), 32, 32, 'favicon-32.png', true);
  await b.close();
  console.log('ok', fs.readdirSync(OUT).join(' '));
})();
