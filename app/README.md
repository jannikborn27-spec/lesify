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

**`fach.html` als dritte Seite umgestellt (2026-09-12)** — Kopf/Zähler,
Themen-Grid, Klausur-Liste, neues Thema anlegen, Farbe ändern. Zwei weitere
generische Cache-Lücken gefixt, die **jede** weitere Seite treffen können:
- `themenFuerFach(fachId)` schrieb den Themen-Cache nirgends fest — Badges
  zeigten „—" statt Fach-/Thema-Name. `api.js` hat jetzt `mergeCache()`
  (fügt/aktualisiert per `id`, ersetzt den Cache nicht komplett);
  `faecher()`/`themen()`/`themenFuerFach()` nutzen es alle.
- **Race Condition, nicht im Cache-Layer:** mehrere Draw-Funktionen liefen
  per `Promise.all([…])` parallel, aber eine liest synchron aus einem Cache,
  den eine andere erst füllt. **Faustregel:** die cache-füllende
  Draw-Funktion zuerst einzeln awaiten, erst danach den Rest parallelisieren.

**`klausuren.html` als vierte Seite umgestellt (2026-09-12)** — Liste +
Fach-Filter + Klausur anlegen (inkl. neues Fach/Thema im selben Formular,
echter KI-Call für Testklausur 1). Drei weitere Lücken im selben Muster:
- `fachFilterChips()` (app.js) rief `Lesify.faecher()` synchron auf — neu:
  `Lesify._faecherCache()` als Sync-Snapshot.
- `Lesify.themen(fachId)` (gefiltert) gibt es unter api.js nicht — nur
  `themenFuerFach(fachId)` (async); Themen-Pillen jetzt lokal zwischengespeichert.
- **Cache-Warm-Lücke wie bei `fach.html`, diesmal fächerübergreifend:** nur
  `faecher()`, nie `themen()` geawaitet → Klausur-Karten zeigten „—·—".
  **Faustregel:** Seiten mit Thema-Badges brauchen **beide** Caches warm,
  nicht nur den Fächer-Cache. `POST /klausuren` legt Klausur + Testklausur 1
  + Lernplan in einem Request an — kein separates `starteLernplan()` mehr
  nötig, `ergebnis.lernplan.id` kommt direkt in der Antwort.

**`lernplan.html` als fünfte Seite umgestellt (2026-09-12) — mit Abstand der
größte Umbau bisher.** `app.js`s komplettes Lernplan-Renderer-Bündel
(Split-Ansicht, 7-Tage-Checklisten, Tag-Fokus, Lernzettel-Start, Testklausur
2 starten) liest synchron `Lesify.lernplanStatus(id)` inkl. voller
`klausur`/`testklausur1`/`testklausur2`-Objekte (data.js-Form) — nicht nur
die reine `shared/src/lernplan.ts`-Berechnung, die `GET /lernplaene/:id`
bis dahin lieferte. Details + Backend-Fix (`testklausurFuerLernplanUI()`,
neues eingebettetes `klausur`/`testklausur1`/`testklausur2`):
`backend-planning.md` §9. In `api.js`: `_cache.lernplaene` (Objekt, keyed
per ID) + sync `lernplanStatus(id)` + `getLernplanChatId()`.
`wireLernplan()` ist jetzt komplett `async` mit explizitem Re-Fetch vor
jedem Re-Render — für data.js unschädlich (`await` auf einem synchronen
Wert läuft nur einen Mikrotask später durch). Live durchgeklickt:
Diagnose-Auswertung, Tag-Fokus wechseln, Checkbox abhaken →
Fortschritt/Status/Abschluss-Meldung aktualisieren sich sofort, per
`GET /lernplaene/:id` serverseitig verifiziert. `klausur.html` und
`lernplan-lernzettel.html` sollten jetzt leichter fallen — sie nutzen
dieselben Renderer.

Nächste Seite: eigenes Ermessen, aber die Grundbausteine (Cache inkl.
`mergeCache`/`_faecherCache`/`_cache.lernplaene`, CORS inkl. PATCH/DELETE,
echte Umgebung) stehen jetzt für alle ~15 verbleibenden Seiten bereit.

Basis-URL: `window.LESIFY_API_BASE` (Default `http://localhost:3000`).
Session-Token: `localStorage['lesify:token']`.
