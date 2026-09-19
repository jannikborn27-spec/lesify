# QS-Checkliste (Phase 14)

Stand: 2026-09-04. Was automatisiert läuft, hakt hier ab; der Rest ist eine
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

## 2. End-to-End-Kern-Flow (manuell gegen `staging`)

- [ ] Registrierung (Rolle Schüler:in) inkl. Einwilligungs-Checkbox → 14-Tage-Trial aktiv
- [ ] E-Mail-Bestätigung über Token
- [ ] Fach anlegen → Farbe ändern → Thema anlegen
- [ ] Chat: Nachricht senden, Titel entsteht, Usage-Zähler steigt
- [ ] Datei hochladen (5 MB Grenze prüfen), Status `verarbeitung` → `bereit` per Polling
- [ ] Lernzettel erzeugen, Revision anfragen (zählt als Chat-Nachricht)
- [ ] Klausur anlegen → Lernplan + Testklausur 1 entstehen automatisch
- [ ] Lernplan Tag 1–7 durchklicken, Checklisten-Haken persistieren
- [ ] Testklausur 1 lösen (Upload) → Analyse → Vorbereitungsstand-Ampel
- [ ] Testklausur 2 (Tag 5) nur für schwache Themen; dritter Aufruf wird abgelehnt
- [ ] Abo abschließen (`POST /abo`) → Trial-Status → Webhook `trial_beendet` → aktiv
- [ ] Tarif wechseln (Proration), kündigen (Zugang bis Zeitraumende), pausieren
- [ ] Familien-Abo: Kind-Profil anlegen + einladen, Kontext-Wechsel, Zusammenfassung
- [ ] Limit erreichen → Hard-Stop **nur** des betroffenen Features, andere laufen
- [ ] DSGVO: Export herunterladen, Konto löschen → alles weg, Login schlägt fehl
- [ ] Nach 12 Monaten: `inhalte-aufbewahrung`-Job löscht alte Inhalte (auf `staging` mit Backdating testen)

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
- [ ] Kontrastwerte (Fog-Blue-Palette, Ampel-Farben) gegen WCAG AA prüfen —
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
- [ ] Mobile Breakpoints: `app/` und `marketing/` bis ~360 px Breite
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
