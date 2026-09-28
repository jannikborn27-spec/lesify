# QS-Checkliste (Phase 14)

Stand: 2026-09-04, §2 neu 2026-09-28. Was automatisiert läuft, hakt hier ab; der Rest ist eine
Vorlage für den QS-Durchlauf vor dem Launch (Phase 16).

## 1. Automatisierte Tests (`pnpm test`)

| Bereich                                                                                       | Datei(en)                                      | Status |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------ |
| Notenformel, `noteAmpel`, `lernplanStatus`, Checklist-Keys, Paritäts-Fixtures                 | `shared/src/noten.test.ts`, `lernplan.test.ts` | ✅     |
| Usage: Ratio/Stufe                                                                            | `shared/src/usage.test.ts`                     | ✅     |
| Abo-Preise / Sitz-Regeln                                                                      | `shared/src/abo.test.ts`                       | ✅     |
| Auth-Flow (registrieren → login → bestätigen → reset → logout, Einwilligung)                  | `api/src/routes/auth.test.ts`                  | ✅     |
| Kern-CRUD (Fächer/Themen/User/Usage/Suche/Kontakt)                                            | `api/src/routes/kern.test.ts`                  | ✅     |
| Chats/Klausuren/Lernplan/Testklausur-Skelett + Phase-7-Status                                 | `api/src/routes/flow2.test.ts`                 | ✅     |
| Usage-Limit-Durchsetzung (403 `limit_erreicht`)                                               | `api/src/routes/usage.test.ts`                 | ✅     |
| Abo/Stripe-Fake (Trial, Wechsel, Webhook, Kündigung, Pause, Kinder, Phase-12-Eltern-Features) | `api/src/routes/abo.test.ts`                   | ✅     |
| Wartungs-Jobs (Aufbewahrung, Usage-Historie, Token-Hygiene)                                   | `api/src/lib/jobs.test.ts`                     | ✅     |
| DSGVO Export + Konto-Löschung                                                                 | `api/src/routes/dsgvo.test.ts`                 | ✅     |
| **userId-Scoping über Nutzergrenzen** (B sieht A nie)                                         | `api/src/routes/scoping.test.ts`               | ✅     |

**Offen (Abhängigkeiten):**

- [ ] Datei-Upload / -Verarbeitung (Phase 5) — Integrationstests fehlen noch.
- [ ] KI-Endpunkte (Phase 6) — mit **aufgezeichneten Fixtures** testen, damit CI
      nicht echt zahlt; zusätzlich pro Release ein manueller Smoke-Test gegen die
      echte Anthropic-API.
- [ ] DB-Tests in CI: laufen lokal gegen Supabase, in CI via
      `describe.runIf(DATABASE_URL)` übersprungen → in Phase 16 eine Test-DB
      (eigenes Supabase-Projekt oder Postgres-Service im Workflow) einhängen.

## 2. Testdurchgang vor dem Launch (Schlussrunde, Stand 2026-09-28)

Gegen **Produktion** (www.lesify.de) mit Stripe im **Test-Modus** — Staging
kommt erst nach dem Launch (Entscheidung 2026-09-23). Neues Konto über die
Website, echte Mail-Adresse (z. B. `deinname+test1@…`). Befund → kurz
notieren (Seite, was passiert, Screenshot/Konsole), am Ende gesammelt fixen und
nachtesten. KI-Kosten des Durchgangs: wenige Euro.

**Stripe-Testkarten:** `4242 4242 4242 4242` (klappt) · `4000 0027 6000 3184`
(3-D-Secure) · `4000 0000 0000 0002` (abgelehnt) · `4000 0000 0000 0341`
(hinterlegen klappt, spätere Abbuchung scheitert). Ablauf/CVC beliebig
(Zukunft/3 Ziffern). Testphase sofort beenden: Stripe-Dashboard (Test-Modus) →
Abo → „Testzeitraum beenden".

### A. Website & Rechtliches

- [ ] Alle Seiten laden auf Desktop + Handy: Start, Preise, Über uns, FAQ, Kontakt, Login, Registrieren, Impressum, Datenschutz, AGB, 404 (`/gibtsnicht`)
- [ ] Footer-Links überall (inkl. „Verträge hier kündigen"), keine toten Links
- [ ] Preisrechner: Tarif/Intervall/Kinderzahl wählen → Kasse zeigt genau das
- [ ] Kontaktformular → Mail kommt bei `kontakt@lesify.de` an, „Antworten" geht an die Absender:in
- [ ] Kündigungsbutton: ohne Login ausfüllen → „jetzt kündigen" → Ergebnis-Seite mit Uhrzeit, Bestätigungsmail kommt, Kopie bei `kontakt@`; bei Konto mit Abo steht das Abo danach auf „gekündigt" (Eltern-Bereich)
- [ ] Werbeaussagen auf der Startseite/Preise entsprechen der Entscheidung (keine unbelegten Zahlen/Zitate)

### B. Konto

- [ ] Registrieren (Eltern) mit Einwilligung → Bestätigungsmail im Posteingang (nicht Spam), Link bestätigt
- [ ] Login mit/ohne „angemeldet bleiben", Logout
- [ ] Falsches Passwort mehrfach → Meldung, nach ~10 Versuchen/Min. kurz gebremst
- [ ] Passwort vergessen → Mail → neues Passwort setzen → alte Sitzungen abgemeldet
- [ ] Passwort ändern (Eltern: „Datenschutz & Konto") → zweites Gerät/Browser ist danach abgemeldet

### C. Kasse & Abo (Stripe-Test-Modus)

- [ ] Abschluss mit `4242…` → Testphase aktiv, Eltern-Bereich zeigt Tarif + Enddatum (bestätigt/entkräftet Kasse-Bug 2026-09-16)
- [ ] 3-D-Secure-Karte → Bestätigungsfenster → klappt
- [ ] Abgelehnte Karte → verständliche Fehlermeldung, kein halbes Abo
- [ ] Zweite Testphase mit derselben Karte (neues Konto) → wird abgelehnt, Abschluss ohne Testphase angeboten
- [ ] PayPal (Test) einmal durchspielen
- [ ] Tarif wechseln mit Kostenvorschau → Preis stimmt, bleibt beim Angebotspreis
- [ ] Platz hinzufügen (sofort) / Platz entfernen (erst zum Periodenende, Hinweis sichtbar)
- [ ] Pausieren → Kind gesperrt; Reaktivieren → Kind wieder frei
- [ ] Kündigen in der App → „läuft bis …"; Kündigung zurücknehmen
- [ ] Zahlungsportal öffnet (Zahlungsmethode, Belege)
- [ ] Testphase im Stripe-Dashboard beenden → Abo wird aktiv, App zeigt es (Webhook)
- [ ] Mit `…0341`: Abbuchung scheitert → Eltern-Banner „Zahlung offen", Kinder nur lesend; nach Zahlungsmethode ändern wieder normal

### D. Familie / Kinder

- [ ] Kind anlegen mit Benutzername + Passwort → Kind-Login mit Benutzername klappt
- [ ] Kind per E-Mail einladen → Mail → Kind setzt Passwort → Login
- [ ] Eltern-Übersicht zeigt Wochenzahlen, **nie** Chat-/Lernzettel-Inhalte
- [ ] Kind-Passwort vergessen → Mail geht an die Eltern
- [ ] Kind entfernen → Kind-Login schlägt fehl

### E. Lernen (als Kind)

- [ ] Fach anlegen, Farbe ändern, Thema anlegen
- [ ] KI-Chat: Antwort streamt, Tonfall aus den Einstellungen wirkt, Titel entsteht; schulfremde Frage → freundliche Ablehnung
- [ ] Datei-Upload: PDF + Handyfoto → „bereit", Vorschau; Datei > 5 MB → abgelehnt
- [ ] Lernzettel erzeugen → Änderung anfragen → PDF herunterladen
- [ ] Klausur anlegen → Lernplan (7 Tage) + Testklausur 1 entstehen
- [ ] Lernplan: Checklisten-Haken (Tag 2/3/4/6/7) bleiben nach Neuladen gesetzt
- [ ] Testklausur 1: PDF öffnen → Lösung hochladen (Foto) → Analyse → Note + Ampel pro Thema
- [ ] Testklausur 2 (Tag 5): nur schwache/wackelige Themen
- [ ] Klausur mit Datum in der Vergangenheit → Note eintragen, „erledigt"-Darstellung
- [ ] Suche (Dashboard-Dropdown + Suchseite) findet Fach/Thema/Chat/Datei
- [ ] Ladezustand: Seiten zeigen kurz Platzhalter statt weiß, alles lädt zügig

### F. Limits

- [ ] Auf Starter ein Kontingent aufbrauchen (z. B. 1 Klausurvorbereitung) → nur dieses Feature stoppt, Rest geht; Anzeige in den Einstellungen stimmt

### G. Datenschutz

- [ ] Datenexport (Kind + Eltern) lädt eine JSON-Datei
- [ ] Kind-Konto löschen, dann Familienkonto löschen → Login schlägt fehl, Abo in Stripe beendet

### H. Geräte & Barrierefreiheit

- [ ] iPhone Safari, Android Chrome, Desktop Chrome/Safari/Firefox
- [ ] Dunkles Design (Einstellungen) auf allen Seiten lesbar
- [ ] Nur Tastatur: durch Login, Chat, Lernplan kommen (sichtbarer Fokus, Escape schließt Dialoge)
- [ ] VoiceOver kurz: Navigation, ein Dialog, eine Meldung werden vorgelesen

### I. Betrieb (mit Claude)

- [ ] Railway-Log `lesify-jobs`: nächtlicher Lauf lesbar, `db-backup` fertig
- [ ] `bash scripts/prod-backup-holen.sh` + `backup pruefen` mit dem Prod-Dump → bestanden
- [ ] Sentry: Test-Fehler kommt an (Web + API)
- [ ] Browser-Konsole der Kernseiten ohne CSP-/JS-Fehler
- [ ] `GET /health` ok; `ki:kosten` nach dem Durchgang ansehen
- [ ] Leichter Lasttest (Claude): ~10 parallele Chats + 1 Analyse, Antwortzeiten + DB-Verbindungen

## 3. Sicherheitsreview

| Punkt                                                                              | Stand                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth: argon2id, opake DB-Sessions, Logout/Reset invalidieren wirklich              | ✅ Phase 3                                                                                                                                                                                                                                                                                                             |
| `userId`-Scoping auf allen Ressourcen-Endpunkten, fremde IDs → 404                 | ✅ Phase 4 + `scoping.test.ts`                                                                                                                                                                                                                                                                                         |
| Passwort/Token nie im Log, Timing-Angleich bei unbekannter E-Mail                  | ✅ Phase 3                                                                                                                                                                                                                                                                                                             |
| Webhook-Signaturprüfung (`stripe-signature`)                                       | ✅ Phase 9 (2026-09-12) — echte HMAC via `stripe.webhooks.constructEvent`                                                                                                                                                                                                                                              |
| Upload-Validierung (MIME, 5 MB hart serverseitig)                                  | ✅ Phase 5                                                                                                                                                                                                                                                                                                             |
| Signierte, ablaufende Objektspeicher-URLs statt öffentlicher Links                 | ✅ Phase 5                                                                                                                                                                                                                                                                                                             |
| Rate-Limiting (Auth streng, KI moderat, `/kontakt` sehr streng)                    | ✅ Phase 15 (`rateLimit`-Plugin) — Startwerte nach echtem Traffic kalibrieren                                                                                                                                                                                                                                          |
| KI-Vorab-Filter (Themen-/Größen-/Spam-Guard)                                       | ✅ Phase 6, seit 2026-09-16 zusätzlich mit Missbrauchs-Signalen + temporärer Sperre (`MissbrauchsWaechter`)                                                                                                                                                                                                            |
| Secrets nur serverseitig, `.env` in `.gitignore`                                   | ✅                                                                                                                                                                                                                                                                                                                     |
| SQL-Injection: ausschließlich Prisma-Query-Builder, kein Roh-SQL mit Nutzereingabe | ✅                                                                                                                                                                                                                                                                                                                     |
| CORS/Origin-Politik für die API festlegen                                          | ✅ Phase 11 (2026-09-12) — `@fastify/cors`, dev/test offen, `CORS_ORIGINS` in production (fail-closed ohne die Variable — echte Domain noch in Phase 16 zu setzen); `methods` explizit auf GET/HEAD/POST/PATCH/DELETE gesetzt (Plugin-Default erlaubte nur GET/HEAD/POST, PATCH/DELETE liefen sonst lautlos ins Leere) |
| Security-Header API (HSTS, X-Content-Type-Options, Referrer-Policy, …)             | ✅ 2026-09-16 — `@fastify/helmet` in `api/src/app.ts` (CSP aus, reines JSON-API; `crossOriginResourcePolicy: cross-origin` für die von `app/` eingebettete Datei-Vorschau; COOP/COEP bewusst aus). Tests: `api/src/app.test.ts`                                                                                        |
| Security-Header `app/`+`marketing/` (HSTS, CSP als HTTP-Header)                    | ⬜ Phase 16 — **blockiert von GitHub Pages** (Interim-Hosting, Phase 0): setzt keine eigenen HTTP-Response-Header, nur über den echten Hosting-Wechsel lösbar, nicht per Code hier                                                                                                                                     |

## 4. Lasttest (teure Pfade)

- [ ] `POST /chats/:id/nachrichten` unter Last: KI-Timeout-Verhalten, gleichzeitige Calls
- [ ] `POST /testklausuren/:id/analyse` (großes Lösungsdokument)
- [ ] DB-Verbindungslimit (Supabase Pooler) unter parallelen Requests
- [ ] Ziel-Richtwerte: p95 Lese-Endpunkte < 300 ms, KI-Endpunkte je nach Modell

## 5. Barrierefreiheit & Responsiveness

- [x] Tastatur-Navigation + sichtbare Fokuszustände — _bereits im Design
      angelegt (`:focus-visible`-Regeln in `style.css`/`marketing.css`); die
      `[data-href]`-Kartenlinks (Klausur-/Datei-Karten) sind zusätzlich per
      `tabindex="0"`/`role="link"` + eigenem Enter/Space-Handler bedienbar
      (`app.js` `initCardLinks()`)._
- [x] **Kontrast WCAG AA (2026-09-28)** — gemessen statt geschätzt: ein
      Browser-Skript prüft jeden sichtbaren Text gegen seinen tatsächlichen
      Hintergrund (inkl. halbtransparenter Ebenen), 4,5:1 bzw. 3:1 für große
      Schrift; alle App-Seiten (Kind + Eltern) hell/dunkel und alle
      Website-Seiten. Fixes: `--ink-500` #6e8494 → #5b7080 (App + Website),
      Text-Regeln von `--ink-400`/`--ink-300` auf `--ink-500`, neue
      `--gruen-ink`/`--rot-ink` für Ampel-Text (Flächen unverändert), aktiver
      Lernplan-Tag auf `--fach-ink` (alle 8 Fachfarben ≥ 5:1). Ergebnis: 0
      Befunde außer den Avatar-Initialen der Testimonial-Elemente (hängen an
      der Inhalts-Entscheidung, siehe UMSETZUNGSPLAN). Ursprünglicher Punkt:
      Kontrastwerte (Fog-Blue-Palette, Ampel-Farben) gegen WCAG AA prüfen —
      _der Dark-Mode-Lesbarkeitsdurchlauf (Phase 0, 2026-09-08) hat einen
      Kontrast-Audit gemacht, aber nicht formal gegen WCAG-AA-Werte
      gerechnet; noch offen._
- [x] **Statischer Audit + Fixes (2026-09-16):** alle `<img>` (statisch +
      dynamisch in `app.js`/`marketing.js`) haben bereits `alt`; 8
      Formularfelder ohne erreichbaren Namen gefunden und gefixt
      (`aria-label`/`aria-labelledby` ergänzt: Suche auf `dashboard.html`/
      `suche.html`, „Neues Fach"/„Neues Thema" auf `chat.html`/
      `klausuren.html`/`thema.html`, Lösch-Bestätigungsfeld auf
      `eltern-kind.html`/`eltern-kinder.html`). Toasts (`app.js`
      `ensureToastStack`, `marketing.js` `toast`) bekommen jetzt
      `role="status"`/`aria-live="polite"` — vorher wurden sie von
      Screenreadern gar nicht angekündigt. **Modals ohne Dialog-Semantik**
      (kein `role="dialog"`, kein Anfangsfokus) war der größte Fund: alle
      ~10 Erzeugungsstellen (Fach-Farbwähler, Datei-Modal, 4× Eltern-
      Bestätigungsdialoge, …) bauen `.modal-scrim` dynamisch per
      `document.createElement` — statt jede Stelle einzeln zu patchen, jetzt
      **zentral** in `initModals()` gelöst: ein `MutationObserver` auf
      `document.body` erkennt jedes neu eingefügte `.modal-scrim`, setzt
      `role="dialog"`/`aria-modal="true"`/`aria-labelledby` (verlinkt auf den
      `.modal-title`) und verschiebt den Fokus auf das erste sinnvolle
      Element. Escape-Handling gab es schon global, blieb unverändert. Live
      gegen den Dev-Stack verifiziert (`faecher.html` → Farbe ändern:
      korrektes `role`/`aria-modal`/`aria-labelledby`, Fokus im Modal,
      Escape schließt; Toast-Stack trägt `role="status"`). Kein Build/keine
      Tests für `app/`/`marketing/` (Vanilla JS) — reiner Code-Review +
      Live-Check, kein automatisierter Test.
- [ ] Screenreader: Nav, Usage-Ring — noch offener manueller Durchgang mit
      echtem Screenreader (VoiceOver/NVDA); Modals/Toasts siehe oben.
- [x] Mobile Breakpoints: `app/` und `marketing/` bis 360 px (2026-09-28,
      gemessen + Sichtprüfung; Lernplan-Grid-Überlauf behoben). Echte Geräte
      im Testdurchgang.
- [x] `prefers-reduced-motion` respektieren — _bereits vorhanden (22
      Fundstellen in CSS/JS), im Audit nur bestätigt, keine Lücke gefunden._

## 6. Fehler-Budget

**Launch-Blocker (muss vor Go-Live sitzen):**

- Auth, `userId`-Scoping, Zahlungs-Webhook (echt), Upload-Validierung,
  1-Jahres-Löschung läuft, DSGVO-Export/-Löschung, Rechtstexte live,
  Backups + Restore getestet.

**Post-Launch-Fix vertretbar:**

- Feinschliff Rate-Limit-Schwellen, KI-Kosten-Kalibrierung, Suche auf Volltext,
  Barrierefreiheits-Details unterhalb AA-Blocker, Eltern-Opt-out-Feinheiten.
