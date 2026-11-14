// R65: visning for stigende vann (flood_logic.js): vannflata blir mørkere og tettere jo dypere det er (ingen ny mesh, ingen ny shader: samme materiale som før),
// og en rød kant rundt bildet mens hodet er under vann (ett DOM-element). Ingenting gjøres når stigende vann er av.
const CSS = `#floodVig{position:fixed;inset:0;z-index:3;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,#d9302000 55%,#d93020cc 100%);transition:opacity .15s}
body.ovview #floodVig{display:none}`;
const SHALLOW = [0x4f, 0xb8, 0xe0], DEEP = [0x1c, 0x5f, 0x8f];

export function createFloodView() {
  if (!document.getElementById('floodcss')) { const s = document.createElement('style'); s.id = 'floodcss'; s.textContent = CSS; document.head.appendChild(s); }
  const vig = document.createElement('div'); vig.id = 'floodVig'; document.body.appendChild(vig);
  let styled = false, lastVig = -1;
  return {
    // mesh: variant.waterMesh. pct 0..1 (dybde i forhold til toppen), now i sekunder. Kalles etter variant.update, som setter grunnverdiene.
    style(mesh, pct, now, on) {
      if (!mesh) return;
      if (on) {
        const k = Math.min(1, Math.max(0, pct)), c = SHALLOW.map((v, i) => Math.round(v + (DEEP[i] - v) * k));
        mesh.material.color.setRGB(c[0] / 255, c[1] / 255, c[2] / 255);
        mesh.material.opacity = 0.5 + 0.3 * k + 0.05 * Math.sin(now * 0.9);
        styled = true;
      } else if (styled) { mesh.material.color.setHex(0x4fb8e0); styled = false; }
    },
    vignette(frac) { const v = Math.round(frac * 20) / 20; if (v !== lastVig) { lastVig = v; vig.style.opacity = String(v); } },
    state: () => ({ vig: lastVig, styled }),
    dispose() { vig.remove(); },
  };
}
