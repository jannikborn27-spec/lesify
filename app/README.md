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

**`klausur.html` als sechste Seite umgestellt (2026-09-12) — wie erhofft
deutlich leichter.** Die eingebettete Lernplan-Sektion läuft unverändert mit
den Bausteinen aus `lernplan.html` weiter, **kein Backend-Change nötig für
diese Seite**. Nur zwei Kleinigkeiten: `k.note` (eingebettet mit
`GET /klausuren/:id`) ersetzt `Lesify.klausurNote()`; `Lesify.getThema(id)`
lieferte Zählwerte unter `.stats.chats` statt der `anzahlChats`-Konvention —
`api.js` spiegelt das jetzt zusätzlich und merged das Thema ins Themen-Cache.
`renderAll()` awaitet `drawThemen()` zuerst (füllt den Themen-Cache), bevor
die Lernplan-Sektion ihre Diagnose-Chips rendert.

**`lernplan-lernzettel.html` als siebte Seite umgestellt (2026-09-12) —
ebenfalls kein Backend-Change nötig.** `lp.klausur` kommt eingebettet,
`R.lernzettelSeite()` bekam denselben Thenable-Check wie andere geteilte
Funktionen (weicht auf `Lesify.lernplanStatus(id).lernplan` aus). Der
Download-Button brauchte einen echten Rewrite: `GET /lernplaene/:id/
lernzettel/dokument` hat **keinen** `?token=`-Fallback wie
`dateiInhaltUrl()` — eine simple `<a href>` hätte 401 bekommen. Jetzt holt
der Button den Text per `fetch()` + Bearer-Header und baut daraus einen
Blob-Download. Details: `backend-planning.md` §9.

**`thema.html` als achte Seite umgestellt (2026-09-12) — bisher der größte
Umbau nach `lernplan.html`.** Fünf Inhaltstypen (Übersicht +
Chats/Lernzettel/Dateien/Klausuren-Tabs), echter Datei-Upload, Klausur-
Anlage-Modal. Neue `loadDaten()` lädt alle vier Listen **einmal** statt bis
zu 4× pro Redraw (vorher lasen `chatItems()` & Co. bei jedem Tab-Wechsel
frisch nach). Datei-Upload komplett neu geschrieben (kein reiner
Await-Umbau): `Lesify.uploadDatei()` + `Lesify.pollDateiStatus()` ersetzt
die clientseitige data.js-Simulation — live mit einer absichtlich kaputten
Test-PDF geprüft, Fehlerpfad ("Dateiformat wird nicht unterstützt.") greift
sauber. Neue `api.js`-Lücke: `GET /dateien` liefert `groesseBytes` (Zahl)
statt der von `dateiCard()` erwarteten `groesse`-Zeichenkette — neue
`formatBytes()`/`mitDateiForm()`. Details: `backend-planning.md` §9.

**`themen.html` als neunte Seite umgestellt (2026-09-12) — kleinste
Konvertierung bisher (49 Zeilen), deckte aber eine Backend-Lücke auf.**
`R.themaCard(t)` wird ohne `opts` aufgerufen und nutzt darum den Default-
`countKeys` inkl. `'klausuren'` — `GET /themen` (fächerübergreifend) hatte
bisher keine eingebetteten Zählwerte. Fix serverseitig statt im Frontend:
neue `klausurenAnzahlProThema(prisma, userId)` in `api/src/lib/themen.ts`
(Batch-Read über `Klausur.themaIds`, String-Array-Feld ohne `_count`-
Unterstützung), `themaDTO()` um optionales `klausuren`-Feld erweitert. `GET
/themen` und `GET /faecher/:id/themen` liefern jetzt beide vollständig
`anzahlChats`/`anzahlLernzettel`/`anzahlDateien`/`anzahlKlausuren`
eingebettet. `themaCard()` in `app.js` liest `t.anzahlKlausuren || 0` statt
der alten hartcodierten 0. Details: `backend-planning.md` §9.

**`chat.html` als zehnte Seite umgestellt (2026-09-12) — größter Umbau der
Reihe.** Der komplette simulierte KI-Chat (Platzhalter-Antwortpools,
`Lesify.incrementUsage()`, separates `setLernplanChatId()`) weicht dem einen
echten `POST /chats/:id/nachrichten` (Guard + Limit + KI-Call + Titel + Usage
+ chatMap-Update atomar). `lernplanKontext: {lernplanId, tag}` im Request
ersetzt den separaten Lernplan-Client-Call komplett. Lokaler `chatList`-Cache
(`await Lesify.chats()`) ersetzt das synchrone `Lesify.chats()` für Verlauf +
Fach-Filter — `GET /chats` liefert bereits neueste zuerst, data.js'
`.reverse()` musste weg. Datei-Anhänge laufen über den echten
Upload+Polling-Pfad (`anhangDateiId` im Request); beim Laden eines
bestehenden Chats wird der Anhang-Dateiname einmalig nachgeladen. Guard-/
Limit-Fehler landen als Toast statt die Seite zu blockieren. Nebenbei
gefundener Bug (zum ersten Mal sichtbar, weil diese Seite als erste den
Nutzungs-Ring rendert): `GET /usage`s `resetDatum` ist ein volles
ISO-Datetime statt "YYYY-MM-DD" — Fix in `api.js`s `usage()`. Live
durchgespielt: neuer Chat per Fach/Thema-Picker, echte Nachricht gesendet,
Titel per `chatTitelErzeugen` gesetzt, Reload über `?chat=<id>` stellt den
vollen Verlauf wieder her, „Neuer Chat" setzt sauber zurück, Nutzungs-Ring
zeigt nach Fix das richtige Reset-Datum. Details: `backend-planning.md` §9.

**`testklausur.html` als elfte Seite umgestellt (2026-09-12).** Kein
`GET /testklausuren`-Bulk-Endpunkt — die Seite braucht immer `?id=`, sonst
zurück aufs Dashboard. `GET /testklausuren/:id` liefert flache `ergebnisse`-
Zeilen; neue `reshapeTestklausur()` in `api.js` nestet sie zu
`t.ergebnis = {note, prozent, proThema}` (gleiche Formel wie
`testklausurFuerLernplanUI()` im Backend). Lösungs-Upload läuft über den
echten Multipart-Pfad `POST /testklausuren/:id/loesung` (neue
`Lesify.ladeTestklausurLoesungHoch()`), Download per `fetch`+Blob wie bei
`lernplan-lernzettel.html`. Live durchgespielt: Download geprüft, Upload mit
falschem MIME-Typ korrekt mit 400 abgefangen, echter Upload + Analyse mit
Ergebnis (Note, Ampel-Karten, Lernplan-Teaser), Reload stellt den
analysierten Zustand wieder her. Details: `backend-planning.md` §9.

Nächste Seite: eigenes Ermessen. Cache inkl.
`mergeCache`/`_faecherCache`/`_cache.lernplaene`, CORS inkl. PATCH/DELETE,
echte Umgebung stehen jetzt für alle ~9 verbleibenden Seiten bereit.

Basis-URL: `window.LESIFY_API_BASE` (Default `http://localhost:3000`).
Session-Token: `localStorage['lesify:token']`.
