# Runbook — Betrieb & Störungen (Phase 15)

Stand: 2026-09-04. Ergänzt `docs/QS-CHECKLISTE.md`. Konkrete Dashboard-Links,
Alert-Kanäle und der Secret-Store kommen mit dem Hosting in Phase 16 dazu.

## Observability — was bereits eingebaut ist

| Baustein               | Umsetzung                                                                                                                                                                                                                                                                                                                                                                                           | Offen                                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Strukturiertes Logging | Fastify/pino JSON-Logs; `authorization`/`cookie`/`stripe-signature` werden geschwärzt; Bodys werden nicht geloggt (keine Chat-Texte/Passwörter)                                                                                                                                                                                                                                                     | Log-Sink (z. B. an den Hoster / eine Log-Plattform) in Phase 16                                                                              |
| Healthchecks           | `GET /health/live` (Prozess, kein DB-Zugriff), `GET /health` + `/health/ready` (inkl. `SELECT 1`, `uptimeSek`)                                                                                                                                                                                                                                                                                      | Externe Uptime-Prüfung (Cron/Monitor) in Phase 16                                                                                            |
| Rate-Limiting          | `RateLimiter` als `onRequest`-Hook, Regeln §7 (auth 10/min·IP, ki 20/min, io 120/min, kontakt 3/min·IP), `429` + `Retry-After`                                                                                                                                                                                                                                                                      | Mehr-Instanz-Betrieb → Redis; User-Keying (Hook nach Auth); Schwellen nach echtem Traffic kalibrieren                                        |
| Error-Handling         | zentraler `setErrorHandler`: `HttpError` → sauberer Code, sonst `500` + `request.log.error`                                                                                                                                                                                                                                                                                                         | Error-Tracker (Sentry o. ä.) mit DSN in Phase 16 anschließen                                                                                 |
| Wartungs-Jobs          | `pnpm --filter @lesify/api job <name>` (Aufbewahrung, Usage-Historie, Token-Hygiene, Abo-Änderungen, KI-Kosten-Alarm), JSON-Summary, Exit-Code                                                                                                                                                                                                                                                      | Railway-Cron `lesify-jobs` (siehe unten), Fehler → Sentry                                                                                    |
| KI-Kosten              | `response.usage` wird je Call in `KiKosten` (Monat/Call-Typ/Modell) aggregiert (`api/src/lib/ki/kosten.ts`); Job `ki-kosten-alarm` vergleicht die Monatssumme gegen das aus `PLAN_ECONOMICS` abgeleitete Budget (aktive Sitze × geplante API-Kosten/Sitz, auf den bisherigen Monatsanteil hochgerechnet) und loggt `kiKostenAlarm`, wenn die Ist-Kosten mehr als das 1,5-fache des Budgets betragen | Anthropic-Preistabelle in `kosten.ts` ist Stand 2026-09 und **vor echten Ausgaben gegenprüfen**; Scheduler-Anbindung für den Job in Phase 16 |
| DB-Backups             | Überbrückung (Supabase Free): nächtlicher Job `db-backup` → privater Bucket `lesify-backups`, 14 Tage; Abschnitt „DB-Backups"                                                                                                                                                                                                                                                                       | Restore-Probe `backup pruefen` (2026-09-28 bestanden)                                                                                        |

## DB-Backups (Überbrückung bis Supabase Pro)

Supabase Free hat keine abrufbaren Backups (Entscheidung 2026-09-25: Pro erst
ab 2–3 zahlenden Kunden). Bis dahin:

- **Nächtlicher Dump:** Job `db-backup` läuft im 03-Uhr-UTC-Lauf von
  `lesify-jobs` **als erster** (vor den Lösch-Jobs). Postgres exportiert alle
  Tabellen als JSON in einem konsistenten Snapshot, gzip, Upload in den
  privaten Bucket `lesify-backups` (`BACKUP_BUCKET`) unter `db/…json.gz`.
  Die 14 neuesten bleiben liegen. Railway-Log: „Job db-backup fertig (… ms):
  {key, bytes, tabellen, zeilen, geloescht}". Kein Extra-Setup nötig — der
  Bucket legt sich beim ersten Lauf selbst an.
- **Neuesten Prod-Dump auf den Mac holen:** `bash scripts/prod-backup-holen.sh`
  (fragt den `SUPABASE_SERVICE_KEY` verdeckt ab) → `api/backups/` (gitignored,
  **enthält Personendaten** — nicht weitergeben, nach Gebrauch löschen).
- **Restore-Probe ohne Risiko:** `pnpm --filter @lesify/api backup pruefen
backups/<datei>` — legt in der Dev-DB (aus `api/.env`) ein Wegwerf-Schema an,
  migriert es, spielt den Dump ein, vergleicht Zeilenzahlen **und** Inhalte,
  löscht das Schema. Ohne Datei: frischer Dump der Dev-DB. Einmal im Monat
  mit einem echten Prod-Dump laufen lassen.
- **Ernstfall (Daten weg/kaputt):** neues Supabase-Projekt (oder geleertes
  Schema) → `prisma migrate deploy` auf **denselben Migrationsstand** wie im
  Dump (steht in der `holen`-Ausgabe) → mit der `DATABASE_URL`/`DIRECT_URL`
  des Ziels in `api/.env`: `pnpm --filter @lesify/api backup einspielen
backups/<datei> --wirklich` (bricht ab, wenn eine Tabelle nicht leer ist).
  Danach Railway-Variablen aufs neue Projekt zeigen lassen.
- **Grenzen:** nur die Datenbank — hochgeladene Dateien im Storage-Bucket sind
  nicht im Dump. Liegt im selben Supabase-Projekt (schützt vor Fehlern/
  versehentlichem Löschen, nicht vor Verlust des ganzen Projekts) — dafür den
  Prod-Dump gelegentlich per Skript auf den Mac holen. Ab Supabase Pro
  übernehmen dessen Backups; der Job kann dann bleiben oder raus.

## Wartungs-Jobs (Railway-Cron) + Migrationen beim Deploy

**Ein** Cron-Service reicht: `job geplant` läuft stündlich, führt
`token-hygiene` jede Stunde aus und alle übrigen Jobs (`inhalte-aufbewahrung`,
`usage-historie`, `abo-geplante-aenderungen`, `ki-kosten-alarm`,
`zahlung-offen-loeschung`) einmal täglich um 03 Uhr UTC
(`geplanteJobs()` in `api/src/lib/jobs.ts`). Fehler → Exit-Code 1 + Sentry.

Einrichtung (einmalig, Railway-Projekt):

1. **+ New → GitHub Repo → dasselbe Repo** → neuer Service, umbenennen in
   `lesify-jobs`.
2. **Settings → Build:** Root Directory leer (Repo-Wurzel), Build Command
   identisch zum API-Service (`pnpm install --frozen-lockfile && pnpm --filter
@lesify/shared build && pnpm --filter @lesify/api db:generate && pnpm
--filter @lesify/api build`).
3. **Settings → Deploy:** Start Command `pnpm --filter @lesify/api job:prod
geplant`, **Cron Schedule** `0 * * * *`, Restart Policy **Never**.
   Keine Public Domain.
4. **Variables:** alle Variablen des API-Services übernehmen (am einfachsten:
   „Shared Variables" oder Raw Editor kopieren) — mindestens `DATABASE_URL`,
   `SUPABASE_*`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `EMAIL_ABSENDER`,
   `MARKETING_URL`, `SENTRY_DSN`, `NODE_ENV=production`.
5. Prüfen: Deployments → der Lauf zur vollen Stunde zeigt „Wartungslauf
   startet: token-hygiene", „Job token-hygiene fertig (… ms): {…}" und
   „Wartungslauf beendet" (JSON-Logs mit `message`-Feld, Railway zeigt sonst
   leere Zeilen) und endet mit Exit 0. Seit 2026-09-28 laufen alle Services auf
   Node 22 (`.nvmrc`), die frühere supabase-js-Warnung „Node.js 20 and below
   are deprecated" sollte nicht mehr erscheinen.

**Migrationen automatisch beim Deploy** (ersetzt `scripts/prod-migrate.sh`
vor jedem Push): im **API-Service** → Settings → Deploy → **Pre-deploy
Command** `pnpm --filter @lesify/api db:deploy`. Dafür braucht der Service die
Variable `DIRECT_URL` = `DATABASE_URL` mit Port **5432** statt 6543 und ohne
`?pgbouncer=true`/`connection_limit`-Parameter (Session-Pooler). Schlägt die
Migration fehl, wird nicht ausgerollt — die alte Version läuft weiter.

## Störungsfälle

### KI-Anbieter (Anthropic) nicht erreichbar / langsam

1. `GET /health` bleibt `ok` (DB unabhängig) — betroffen sind nur KI-Endpunkte.
2. Erwartetes Verhalten: KI-Call läuft in Timeout → `502`/`503` an den Client,
   **kein** Usage-Verbrauch (Zähler erst nach Erfolg).
3. Statusseite von Anthropic prüfen. Wenn breiter Ausfall: Wartungsbanner im
   Frontend, KI-Buttons deaktivieren.
4. Nach Erholung: Fehlerrate im Log beobachten, Retry-Parameter des
   Anthropic-Clients (Phase 6) prüfen.

### KI-Kosten: Anthropic-Guthaben & Monatslimit

Anthropic rechnet Prepaid ab (Guthaben in der Konsole). Zwei Schutzebenen:

- **In der App (die eigentliche Bremse):** Kontingente je Sitz/Monat
  (`PLAN_LIMITS`), Chat-Verlauf-Fenster (max. 30 Nachrichten je Call) und
  Vorab-Filter — kein Nutzer kann mehr verbrauchen als sein Tarif hergibt.
  Einzige offene Lücke: Infinite hat `nachrichten: null` (Fair-Use offen).
- **Bei Anthropic (Sicherheitsnetz):** Auto-Reload + Monatslimit in der
  Konsole. **Faustregel Limit:** aktive Sitze je Tarif × KI-Kosten bei
  100 % Auslastung × 2 (Puffer). Gemessen 2026-09-23: Starter ~0,63 €,
  Premium ~1,67 €, Infinite ~6 € (bei 1.000 Nachrichten) je Sitz/Monat.
  Beispiel 50 Premium-Sitze → 50 × 1,67 € × 2 ≈ 170 €/Monat. Monatlich
  nachziehen, wenn die Sitzzahl wächst (`ki-kosten-alarm` hilft beim
  Kalibrieren).

**Wenn Guthaben/Limit erreicht ist:** Anthropic lehnt jeden Call ab →
KI-Endpunkte antworten `503 ki_nicht_verfuegbar`, die App zeigt „KI gerade
nicht erreichbar", **kein Usage-Verbrauch**; alles ohne KI (Noten, Lernplan,
Dateien ansehen, Abo) läuft weiter. Sofortmaßnahme: Guthaben aufladen bzw.
Limit anheben — wirkt ohne Neustart.

### Zahlungsanbieter (Stripe) nicht erreichbar

1. `POST /abo*` schlägt fehl → Nutzer:in bekommt Fehlermeldung, **kein**
   halb-angelegtes Abo (Transaktion).
2. Webhooks laufen bei Stripe in eine Retry-Queue — verpasste Events kommen
   nach. `POST /abo/webhook` ist idempotent.
3. Bestehende Nutzer:innen sind nicht betroffen (Status steht in der DB).
4. Nach Erholung: im Stripe-Dashboard fehlgeschlagene Webhook-Zustellungen
   manuell erneut senden; Abo-Status stichprobenartig gegen Stripe abgleichen.

### E-Mail-Anbieter (Resend) nicht erreichbar / Versand schlägt fehl

1. Betrifft nur Double-Opt-in-/Passwort-Reset-Mails — Zahlungs-/Abo-/Beleg-Mails
   laufen unabhängig über Stripe.
2. `POST /auth/registrieren`/`passwort-vergessen` schlagen dadurch **nicht**
   fehl (Mail-Versand ist try/catch, nur geloggt unter
   `email_bestaetigung_versand_fehlgeschlagen`/`passwort_reset_versand_fehlgeschlagen`) —
   Konto bzw. Reset-Token stehen trotzdem in der DB, nur die Mail kommt nicht an.
3. Log nach diesen beiden Fehlern filtern; Resend-Statusseite + Dashboard
   (Zustellprotokoll je E-Mail) prüfen.
4. Betroffene Nutzer:in kann sich beim Registrieren-Flow trotzdem sofort
   anmelden (E-Mail-Bestätigung ist nicht blockierend); beim Passwort-Reset:
   erneut über `/passwort-vergessen/` anfordern, sobald Resend wieder läuft.

### DB (Supabase) überlastet / nicht erreichbar

1. `GET /health` → `degraded`, `db:false`. Uptime-Alert feuert.
2. Supabase-Dashboard: Connection-Pooler-Auslastung, langsame Queries,
   CPU/IO. Ggf. Pooler-Limit / Plan hochsetzen.
3. Häufige Ursache: zu viele gleichzeitige KI-Calls halten Verbindungen →
   Rate-Limit-Klasse `ki` temporär senken (`api/src/lib/ratelimit.ts`).
4. Kein automatischer Failover — Recovery über Supabase. Sind Daten verloren:
   Abschnitt „DB-Backups" → Ernstfall.

### Datenschutz-Anfrage (Auskunft / Löschung)

1. Auskunft: Nutzer:in nutzt `GET /user/export` (vollständiger JSON-Export).
   Bei Anfrage per Mail: Identität prüfen, dann selben Export erzeugen.
2. Löschung: `POST /user/loeschen` (durch die Nutzer:in) löscht Konto + alle
   Inhalte hart inkl. Kind-Profile. Objektspeicher-Dateien: bis Phase 5 manuell
   im Bucket nachziehen.
3. Frist DSGVO: **1 Monat**. Vorgang dokumentieren.

### Rate-Limit-Fehlalarm (legitime Nutzer:innen bekommen 429)

1. Log nach `fehler:"rate_limit"` + `klasse` filtern.
2. Betroffene Klasse in `api/src/lib/ratelimit.ts` (`regelFuer`) anheben,
   deployen. Werte sind bewusst als Startwerte gesetzt.
3. Bei Verdacht auf geteilte IP (Schule/NAT): `ki`/`io` auf User-Keying ziehen
   (Hook nach `requireAuth`).

## Stripe: Umstellung Test → Live (Schlussrunde B)

Der Code braucht dafür **keine** Änderung außer dem Publishable Key: Produkte
(`lesify_starter`/`_premium`/`_infinite`) legt die API beim ersten Abo selbst
an, Preise kommen per `price_data` aus `@lesify/shared`. Welcher Modus läuft,
zeigt `GET /health` → `zahlung.modus` (`test`/`live`/`fake`) und
`zahlung.webhookSecret`.

**1. Vorbereiten — jederzeit, ändert nichts an der Kasse** (Dashboard mit
Schalter „Testmodus" **aus**; Live-Einstellungen werden nicht aus dem
Testmodus übernommen):

- [x] Konto aktivieren: Geschäftsdaten (Einzelunternehmen, Kleinunternehmer),
      Identität, Auszahlungskonto (IBAN), 2FA.
- [x] Öffentliche Angaben: Name „Lesify", Abrechnungstext auf dem
      Kontoauszug (z. B. `LESIFY.DE`), Support-E-Mail `kontakt@lesify.de`,
      Website, AGB-/Datenschutz-Links; Branding (Logo, Farbe) für Belege + Portal.
- [x] **Zahlungsmethoden** (Settings → Payment methods): Karte, PayPal
      (PayPal-Konto verknüpfen), Klarna, Amazon Pay aktivieren. Der Code
      verlangt genau diese vier (`payment_method_types` in
      `api/src/lib/zahlung.ts`) — fehlt eine im Live-Modus, lehnt Stripe
      `POST /abo` ab. Link bleibt aus (Entscheidung 2026-09-18).
- [x] **Kundenportal** (Settings → Billing → Customer portal): Zahlungsmethode
      ändern, Rechnungsverlauf, Rechnungsadresse **an**; Abo kündigen / Tarif
      wechseln **aus** — Kündigung und Tarif-/Sitzwechsel laufen über die App
      (`eltern-abo.html`, `/kuendigen/`), sonst geraten Sitze/Preise aus dem Takt.
- [x] **Rechnungen/Belege** (Settings → Billing → Invoices): Rechnungsnummer-
      Präfix, Absenderadresse wie im Impressum, Fußzeile
      „Gemäß § 19 UStG wird keine Umsatzsteuer berechnet."
- [x] **Kunden-E-Mails** (Settings → Customer emails): erfolgreiche Zahlungen + Erstattungen an; fehlgeschlagene Kartenzahlung + 3DS-Bestätigung an;
      Erinnerung vor Ende der Testphase und vor Jahresverlängerung an.
- [x] **Fehlgeschlagene Zahlungen** (Settings → Billing → Subscriptions and
      emails → Manage failed payments): Smart Retries (z. B. 4 Versuche in
      2 Wochen), danach Abo **kündigen**. In der App: `past_due`/`unpaid` →
      `zahlung_offen` (Kinder nur lesen), `canceled` → `gekuendigt`.
- [x] **Webhook** (Developers → Webhooks, Live): URL
      `https://lesify-production.up.railway.app/abo/webhook`, API-Version wie
      das SDK (`2026-08-26.dahlia`, stripe-node 22.6), Events
      `customer.subscription.created`, `.updated`, `.deleted`, `invoice.paid`,
      `invoice.payment_succeeded`, `invoice.payment_failed`. Signing Secret
      (`whsec_…`) bereithalten, **noch nicht** eintragen.
- [x] Live-Schlüssel bereithalten: `sk_live_…` (Secret, nur Railway) und
      `pk_live_…` (Publishable, öffentlich).
- [ ] Alte Testdaten klären: Konten mit Abos aus dem Testmodus zeigen auf
      Test-Subscriptions, die es live nicht gibt — Kündigen, Sitzwechsel,
      Zahlungsportal und der Job `abo-geplante-aenderungen` schlagen für sie
      fehl. Vor dem Umschalten löschen (Konto-Löschung) oder bewusst liegen lassen.

**2. Umschalten — in einem Rutsch, ruhige Uhrzeit, ~5 Minuten.** Zwischen
Schritt a und b schlägt die Kasse fehl (Test-Frontend gegen Live-Backend):

- [x] a) Railway: `STRIPE_SECRET_KEY` = `sk_live_…`, `STRIPE_WEBHOOK_SECRET`
      = Live-`whsec_…` → Redeploy abwarten.
- [x] b) `marketing/assets/js/stripe-config.js`: `publishableKey` =
      `pk_live_…`, `mode: 'live'` → Push (Cloudflare deployt in ~1 Min).
- [x] c) `GET /health` → `zahlung.modus: "live"`, `webhookSecret: true`. _(erledigt 2026-10-01: live umgeschaltet, `/health` bestätigt.)_

**3. Echte Zahlung prüfen**

- [ ] Neues Konto mit eigener E-Mail → Kasse → Abo mit eigener Karte → App
      zeigt den richtigen Status, Stripe → Webhooks zeigt 2xx-Zustellungen.
- [ ] Im Dashboard Zahlung erstatten, Abo über `/kuendigen/` bzw. die App
      kündigen → App zeigt gekündigt, Beleg-/Erstattungs-Mail kommt an.
- [ ] Einmal PayPal durchspielen (Testphase-Start = 0-€-Mandat), danach kündigen.

**Zurück auf Test:** beide Railway-Variablen + `stripe-config.js`
zurücksetzen. Live-Abos aus der Zwischenzeit laufen in Stripe weiter, werden
aber nicht mehr per Webhook abgeglichen — vorher im Live-Dashboard prüfen.

## Vor Go-Live abhaken (siehe auch QS §6)

- [x] Backups: Überbrückungs-Dump `db-backup` nächtlich + Restore-Probe bestanden (2026-09-28, Dev-DB); Supabase Pro nach 2–3 zahlenden Kunden
- [ ] Externe Uptime-Prüfung auf `/health/ready`
- [ ] Error-Tracker mit DSN verbunden, Test-Fehler kommt an
- [ ] Log-Sink erhält Logs, PII-Schwärzung stichprobenartig geprüft
- [ ] Scheduler ruft die Wartungs-Jobs, Job-Fehler alarmiert (Railway-Cron `lesify-jobs`, Abschnitt „Wartungs-Jobs")
- [ ] Rate-Limit-Schwellen nach Last-/Smoke-Test angepasst
