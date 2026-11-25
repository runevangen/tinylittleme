---
name: tlm-ny-funksjon
description: Sjekkliste for en ny funksjon eller innstilling i tinylittleme (SETTINGS, logging, dokumentasjon, tekster, paritet). Bruk når du legger til noe brukeren kan se eller velge.
---
# Ny funksjon

1. **Bekreft forståelsen først** med Rune som klikkbare alternativer (anbefalt først) før kode eller roadmap endres.
2. **Innstilling:** legg valget i `SETTINGS` i `main.js` (hjelpere `fl` bool, `sl` valg, `rg` område) i riktig gruppe. Finjusteringer og ting som kan ødelegge opplevelsen: `group: 'admin'`. Dokumenter i `docs/INNSTILLINGER.md`.
3. **Logging:** viktige hendelser med `logEv(type, detalj)` så rapporten og testflyten viser dem.
4. **Tekst:** nevn knappene, ikke taster; norsk og engelsk (`i18n`, `leditor_text.js`, `changes_text.js`).
5. **NYTT-rad** i `changes_data.js` + engelsk i `changes_text.js` i samme commit som versjonsøkningen.
6. **Delt kode:** bygging går i de delte modulene så Byggeskolen følger med (tlm-brett-og-mobiltest).
7. **Nye filer** i `files`-lista i `index.html`.
8. Variabler som brukes før de er deklarert i `main.js` gir TDZ-krasj: legg kode etter at `LEVEL` er lastet. Sjekk at det ikke blir dobbel `import`.
9. Kjør hele utleggingen (tlm-utlegging).

Oppdatert v2.208
- Gruppe: legg nye innstillinger i `LAYOUT` i `settings_util.js` (ellers blir de stående i «Spill»); byggerelaterte i gruppen «Bygging og Byggeskolen» (undergrupper). ⚙ har «★ Favoritter» (☆/★ på hver rad, `tlm.setfav`) og «★ Topp 10 (mest brukt)» (`tlm.setuse`) øverst; nye innstillinger får stjerne og telles automatisk.
- Varige beskjeder (som «brett ferdig»): tilstand i `store` (`tlm.led.done`, `tlm.led.fail`, `tlm.led.bg`), vist som banner (`#ledBanner`) og merke på menyknappen, så den overlever at appen lukkes.
- Sjekk alltid både norsk og engelsk (`ltx`-nøkler, `changes_text.js`) og at ingen tekst nevner taster på mobil.
- Test med node (ren logikk i egen modul) og et nettleserskript (`tools/live_*.cjs`).
