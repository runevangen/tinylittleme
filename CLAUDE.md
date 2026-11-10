# Arbeidsregler for tinylittleme

- **Nye filer:** en ny `.js`-modul i roten må legges i lista `files` i `index.html` (den laster filene med `?v=<versjon>` så brukeren alltid får nyeste). En test passer på dette.
- **Nivåer:** et nytt eller endret brett skal gås med `node tools/walk_route.mjs levels/<navn>.level.json` før det legges ut (se `docs/NIVAER.md`). De tre nivåene sjekkes av `npm test`.
- **Versjonsnummer:** for hver endring som committes: øk `VERSION` i `version.js` og legg en linje øverst i `CHANGELOG.md`. Versjonen vises i HUD-en i spillet, slik at brukeren ser hvilken versjon som kjører (spillet testes fra GitHub Pages / `main`).
- `npm test` skal være grønn før commit.
- **Utlegging:** etter hver ferdig endring (tester grønne, versjon økt): push til `main` (`git push origin HEAD:main`), uten å spørre. Brukeren tester fra GitHub Pages, som bygges fra `main`. Hvis `main` har gått videre: hent og slå sammen først.
- **Mobil først:** brukeren tester på mobil (iPhone, GitHub Pages). All tekst i spillet skal nevne knappene (TA, HOPP, GREP, ⚙), ikke taster; taster nevnes bare på tastatur (se `TOUCH`, `TA`, `key()` i `main.js`). Nye funksjoner må kunne brukes med stikke + TA/HOPP/GREP + ⚙, uten tastatur. Sjekk visuelt med Playwright `devices['iPhone 14']`.

- **Innstillinger:** nye valg legges inn i `SETTINGS` (`main.js`) så lenge det er mulig, i riktig gruppe; verdier som bare er til finjustering eller kan ødelegge opplevelsen får `group: 'admin'`. Se `docs/INNSTILLINGER.md`. Husk rapport/test-flyten ved nye mekanikker: viktige hendelser skal logges med `logEv(type, detalj)`.
- **Svarformat:** avslutt hvert svar til brukeren med en kort **Status**: (1) om det er kjørt til `main` (og versjon), (2) hva som er gjort, (3) hvordan teste (konkrete trinn på mobil/PC).
