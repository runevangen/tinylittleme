# Arbeidsregler for tinylittleme

- **Versjonsnummer:** for hver endring som committes: øk `VERSION` i `version.js` og legg en linje øverst i `CHANGELOG.md`. Versjonen vises i HUD-en i spillet, slik at brukeren ser hvilken versjon som kjører (spillet testes fra GitHub Pages / `main`).
- `npm test` skal være grønn før commit.
- **Utlegging:** etter hver ferdig endring (tester grønne, versjon økt): push til `main` (`git push origin HEAD:main`), uten å spørre. Brukeren tester fra GitHub Pages, som bygges fra `main`. Hvis `main` har gått videre: hent og slå sammen først.
