# QS-Checkliste (Phase 14)

Stand: 2026-09-04. Was automatisiert läuft, hakt hier ab; der Rest ist eine
Vorlage für den QS-Durchlauf vor dem Launch (Phase 16).

## 1. Automatisierte Tests (`pnpm test`)

| Bereich                                                                                       | Datei(en)                                      | Status |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------ |
| Notenformel, `noteAmpel`, `lernplanStatus`, Checklist-Keys, Paritäts-Fixtures                 | `shared/src/noten.test.ts`, `lernplan.test.ts` | ✅     |
| Usage: Ratio/Stufe, Gratis-Revisionen                                                         | `shared/src/usage.test.ts`                     | ✅     |
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
- [ ] Lernzettel erzeugen, Revision anfragen (erste 10 gratis)
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

| Punkt                                                                              | Stand                                                                         |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Auth: argon2id, opake DB-Sessions, Logout/Reset invalidieren wirklich              | ✅ Phase 3                                                                    |
| `userId`-Scoping auf allen Ressourcen-Endpunkten, fremde IDs → 404                 | ✅ Phase 4 + `scoping.test.ts`                                                |
| Passwort/Token nie im Log, Timing-Angleich bei unbekannter E-Mail                  | ✅ Phase 3                                                                    |
| Webhook-Signaturprüfung (`stripe-signature`)                                       | ⚠️ Platzhalter — echte HMAC in Phase 16                                       |
| Upload-Validierung (MIME, 5 MB hart serverseitig)                                  | ⬜ Phase 5                                                                    |
| Signierte, ablaufende Objektspeicher-URLs statt öffentlicher Links                 | ⬜ Phase 5                                                                    |
| Rate-Limiting (Auth streng, KI moderat, `/kontakt` sehr streng)                    | ✅ Phase 15 (`rateLimit`-Plugin) — Startwerte nach echtem Traffic kalibrieren |
| KI-Vorab-Filter (Themen-/Größen-/Spam-Guard)                                       | ⬜ Phase 6                                                                    |
| Secrets nur serverseitig, `.env` in `.gitignore`                                   | ✅                                                                            |
| SQL-Injection: ausschließlich Prisma-Query-Builder, kein Roh-SQL mit Nutzereingabe | ✅                                                                            |
| CORS/Origin-Politik für die API festlegen                                          | ⬜ Phase 16                                                                   |
| Security-Header (HSTS, CSP für `app/`+`marketing/`)                                | ⬜ Phase 16                                                                   |

## 4. Lasttest (teure Pfade)

- [ ] `POST /chats/:id/nachrichten` unter Last: KI-Timeout-Verhalten, gleichzeitige Calls
- [ ] `POST /testklausuren/:id/analyse` (großes Lösungsdokument)
- [ ] DB-Verbindungslimit (Supabase Pooler) unter parallelen Requests
- [ ] Ziel-Richtwerte: p95 Lese-Endpunkte < 300 ms, KI-Endpunkte je nach Modell

## 5. Barrierefreiheit & Responsiveness

- [ ] Tastatur-Navigation + sichtbare Fokuszustände (im Design angelegt) auf allen Seiten
- [ ] Kontrastwerte (Fog-Blue-Palette, Ampel-Farben) gegen WCAG AA prüfen
- [ ] Screenreader: Nav, Modals, Toasts, Usage-Ring mit sinnvollen Labels
- [ ] Mobile Breakpoints: `app/` und `marketing/` bis ~360 px Breite
- [ ] `prefers-reduced-motion` respektieren

## 6. Fehler-Budget

**Launch-Blocker (muss vor Go-Live sitzen):**

- Auth, `userId`-Scoping, Zahlungs-Webhook (echt), Upload-Validierung,
  1-Jahres-Löschung läuft, DSGVO-Export/-Löschung, Rechtstexte live,
  Backups + Restore getestet.

**Post-Launch-Fix vertretbar:**

- Feinschliff Rate-Limit-Schwellen, KI-Kosten-Kalibrierung, Suche auf Volltext,
  Barrierefreiheits-Details unterhalb AA-Blocker, Eltern-Opt-out-Feinheiten.
