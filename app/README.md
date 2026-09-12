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

Cut-over **pro Seite** (noch offen — kann inzwischen lokal geprüft werden,
`api/.env` mit echten Supabase-/Stripe-Werten liegt vor Ort, CORS steht seit
2026-09-12, kein `staging` mehr nötig zum Testen):

1. `<script src="assets/js/data.js">` → `assets/js/api.js`, davor
   `assets/js/auth-gate.js` einbinden.
2. Jeden `Lesify.xyz(...)`-Aufruf `await`en bzw. `.then(...)` — die Renderer in
   `app.js` erwarten aktuell synchrone Rückgaben.
3. Fehler/Guard-Popups über `Lesify.fehlerText(err)` + Toast zeigen
   (`limit_erreicht`, `datei_zu_gross`, `nicht_schulrelevant`, `rate_limit`, …).
4. Datei-Viewer auf `Lesify.dateiInhaltUrl(id)` + `Lesify.pollDateiStatus(id, cb)`
   umstellen, Dev-Switcher (Suche-Varianten, Pill-Style, Testklausur-Phasen)
   hinter einen Dev-Flag legen oder entfernen.

**Erledigt (2026-09-12):** Marketing-Formulare (`marketing/login/`,
`registrieren/`, `passwort-vergessen/` + neu `passwort-zuruecksetzen/`,
`kontakt/`) rufen jetzt echt `POST /auth/login`/`registrieren`/
`passwort-vergessen`/`passwort-zuruecksetzen`/`POST /kontakt` auf
(`marketing/assets/js/auth-forms.js`, eigenständig statt `api.js` zu laden —
gleicher Ansatz wie `checkout.js`). `login/` enthält auch die Rollen-/
Familien-Weiche (Schritt oben unter „App-Seiten" bezieht sich nur noch auf
die eingeloggten `app/*.html`-Seiten selbst).

**`dashboard.html` als erste App-Seite umgestellt (2026-09-12)** — Schritte 1+2
oben durchlaufen, live gegen die echte Supabase-DB geprüft (Feed, Live-Suche,
Rollen-Redirect, Logout-Redirect). Dabei wurde `assets/js/api.js` um einiges
erweitert, das für **jede** weitere Seite gebraucht wird (Details:
`backend-planning.md` §9 „api.js-Cache-Layer"):
- Fächer-/Themen-Cache mit synchronen `getFach(id)`/`label(themaId)` —
  Voraussetzung für `badge`/`fachColorVars`/`fachBadge`/`cardWatermark`/…
  (die lesen Fach-/Thema-Daten synchron per ID, wie im data.js-Prototyp).
  Braucht ein vorheriges `await Lesify.faecher()`/`Lesify.themen()` auf der
  Seite — bei den meisten Seiten ohnehin schon Teil der Hauptdaten-Ladung.
- Reine Formeln/Design-Tokens gespiegelt: `prozentZuNote`/`noteAmpel`/
  `noteLabel`/`tierLabel`/`klausurVergangen`, `FACH_COLORS`/`getFachColor`/
  `FACH_PRESETS`/`getFachIconSvg`.
- Neu: `relativeTime()` für `.updated`-Anzeigen (Chats/Lernzettel/Dateien).
- `GET /lernzettel(?themaId=)` — neue Backend-Route, fehlte für Feeds.

**`faecher.html` als zweite Seite umgestellt (2026-09-12)** — Fach-Karten,
Fach-Farbe ändern, neues Fach anlegen live geprüft. Dabei zwei generische
Lehren für **jede** weitere Seite:
- **CORS-`methods` fehlte** — `@fastify/cors` erlaubt ohne explizite Angabe
  nur `GET,HEAD,POST`; jeder `PATCH`/`DELETE` (Fach-Farbe, Checklist, Abo,
  Kind-Profile, …) lief lautlos ins Leere (Preflight `204`, Request nie
  abgeschickt). Fix in `api/src/app.ts`. **Beim nächsten Cut-over sofort eine
  schreibende Aktion mittesten, nicht nur Lesen** — `dashboard.html` (nur
  `GET`) hätte das nie gezeigt.
- Geteilte `app.js`-Funktionen mit einem Lesify-Schreibaufruf ohne
  Rückgabewert (hier `openFachColorPicker()`) brauchen denselben
  Thenable-Check wie `renderChrome()`, sonst rennt „Modal schließen + neu
  rendern" dem noch offenen `PATCH`/`POST` davon.
- Embedded-Aggregate wie bei `klausurNoteBox()`: `Fach.anzahlThemen`/
  `anzahlKlausuren` kommen mit `GET /faecher` schon mit — kein
  `Lesify.countsForFach()`-Äquivalent nötig.

Nächste Seite: eigenes Ermessen, aber die Grundbausteine (Cache, CORS inkl.
PATCH/DELETE, echte Umgebung) stehen jetzt für alle ~18 verbleibenden Seiten
bereit.

Basis-URL: `window.LESIFY_API_BASE` (Default `http://localhost:3000`).
Session-Token: `localStorage['lesify:token']`.
