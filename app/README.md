# app/ — eingeloggte Lesify-App

Statischer Prototyp: HTML/CSS/Vanilla-JS, **kein Build-Tool**. Bisher lag dieser
Ordner im Projekt-Root; beim Monorepo-Umbau (2026-09-04) nach `app/` verschoben.

- Einstieg: `dashboard.html`
- Logik & Dummy-Daten: `assets/js/data.js`, `assets/js/app.js`
- Design-System: `assets/css/style.css`

Lokal ausliefern: `pnpm dev` (Projekt-Root) → http://localhost:4001, oder direkt
`python3 -m http.server 4001` in diesem Ordner. `file://` funktioniert außer
`localStorage`-Persistenz.

Ab **Phase 11** (`UMSETZUNGSPLAN.md`) wird `assets/js/data.js` durch einen
API-Client mit identischen Funktionssignaturen ersetzt.
