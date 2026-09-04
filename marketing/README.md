# marketing/ — öffentliche Lesify-Website

Statischer Prototyp: HTML/CSS/Vanilla-JS, **kein Build-Tool**. Bisher `frontend/`;
beim Monorepo-Umbau (2026-09-04) nach `marketing/` umbenannt.

- Einstieg: `index.html`
- Stylesheets: `assets/css/marketing.css`, `assets/css/landing-lab.css`
  (Letzteres liefert die `lab-*`-Klassen der aktuellen `index.html`)
- JS: `assets/js/marketing.js`, `assets/js/checkout.js`
- Zentrale Zahlen (Tarife, Limits, Trial): `assets/js/stripe-config.js`

Lokal ausliefern: `pnpm dev` (Projekt-Root) → http://localhost:4002, oder direkt
`python3 -m http.server 4002` in diesem Ordner.

`index.html.bak` ist ein Alt-Stand und wird von Git ignoriert.

Ab **Phase 11** (`UMSETZUNGSPLAN.md`) rufen die Formulare (Login, Registrierung,
Passwort-Reset, Kontakt) die echten Auth-/Kontakt-Endpunkte.
