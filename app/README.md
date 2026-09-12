# app/ — eingeloggte Lesify-App

Statischer Prototyp: HTML/CSS/Vanilla-JS, **kein Build-Tool**. Bisher lag dieser
Ordner im Projekt-Root; beim Monorepo-Umbau (2026-09-04) nach `app/` verschoben.

- Einstieg: `dashboard.html` (Schüler) bzw. `eltern.html` (Elternkonto mit
  Familien-Abo). Der Eltern-Bereich ist vier eigenständige Seiten (Stand
  2026-09-12, nicht nur Anker-Abschnitte): `eltern.html` (Übersicht —
  Familien-Kennzahlen, Kind-Kurzkarten, Datenschutz-Hinweis),
  `eltern-kinder.html` (Kind-Verwaltung — anlegen/einladen/entfernen/
  Benachrichtigungen), `eltern-kind.html?id=…` (Einzelansicht — Wochen-
  Kennzahlen, Fächer- und Klausur-Metadaten je Kind), `eltern-abo.html`
  (Tarif/Sitze/Status) und `eltern-datenschutz.html` (Export/Löschung).
  Ansicht im Prototyp über den Schalter „Ansicht" auf `einstellungen.html`.
- Logik & Dummy-Daten: `assets/js/data.js`, `assets/js/app.js`
- Design-System: `assets/css/style.css` — token-basierte „Fog Blue"-Rampe.
  **Dunkles Design** über die Einstellung `settings.darkMode` (Karte
  „Erscheinungsbild" auf `einstellungen.html`): setzt `data-theme="dark"` an
  `<html>` (Anti-Flash-Snippet im `<head>` jeder Seite + `applyTheme()` in
  `app.js`), der `:root[data-theme="dark"]`-Block am Ende von `style.css`
  invertiert die Tokens. Nur `app/`, nicht `marketing/`.

Lokal ausliefern: `pnpm dev` (Projekt-Root) → http://localhost:4001, oder direkt
`python3 -m http.server 4001` in diesem Ordner. `file://` funktioniert außer
`localStorage`-Persistenz.

## Phase 11 — Anbindung ans echte Backend

`assets/js/api.js` ist der API-Client, der `assets/js/data.js` ablöst: gleiche
`Lesify.*`-Namen, aber **asynchron** (Promises). `assets/js/auth-gate.js`
schützt eine eingeloggte Seite (Redirect ohne Session).

Cut-over **pro Seite** (noch offen, braucht laufendes Backend auf `staging`):

1. `<script src="assets/js/data.js">` → `assets/js/api.js`, davor
   `assets/js/auth-gate.js` einbinden.
2. Jeden `Lesify.xyz(...)`-Aufruf `await`en bzw. `.then(...)` — die Renderer in
   `app.js` erwarten aktuell synchrone Rückgaben.
3. Fehler/Guard-Popups über `Lesify.fehlerText(err)` + Toast zeigen
   (`limit_erreicht`, `datei_zu_gross`, `nicht_schulrelevant`, `rate_limit`, …).
4. Datei-Viewer auf `Lesify.dateiInhaltUrl(id)` + `Lesify.pollDateiStatus(id, cb)`
   umstellen, Dev-Switcher (Suche-Varianten, Pill-Style, Testklausur-Phasen)
   hinter einen Dev-Flag legen oder entfernen.
5. Marketing-Formulare (`marketing/login.html`, `registrieren.html`,
   `passwort-vergessen.html`, `kontakt.html`) an `Lesify.login` / `registrieren`
   / `passwortVergessen` / `kontakt` hängen.

Basis-URL: `window.LESIFY_API_BASE` (Default `http://localhost:3000`).
Session-Token: `localStorage['lesify:token']`.
