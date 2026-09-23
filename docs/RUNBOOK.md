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
| Wartungs-Jobs          | `pnpm --filter @lesify/api job <name>` (Aufbewahrung, Usage-Historie, Token-Hygiene, Abo-Änderungen, KI-Kosten-Alarm), JSON-Summary, Exit-Code                                                                                                                                                                                                                                                      | Scheduler + Job-Monitoring in Phase 16                                                                                                       |
| KI-Kosten              | `response.usage` wird je Call in `KiKosten` (Monat/Call-Typ/Modell) aggregiert (`api/src/lib/ki/kosten.ts`); Job `ki-kosten-alarm` vergleicht die Monatssumme gegen das aus `PLAN_ECONOMICS` abgeleitete Budget (aktive Sitze × geplante API-Kosten/Sitz, auf den bisherigen Monatsanteil hochgerechnet) und loggt `kiKostenAlarm`, wenn die Ist-Kosten mehr als das 1,5-fache des Budgets betragen | Anthropic-Preistabelle in `kosten.ts` ist Stand 2026-09 und **vor echten Ausgaben gegenprüfen**; Scheduler-Anbindung für den Job in Phase 16 |
| DB-Backups             | Supabase (automatische Backups im Projekt aktivieren)                                                                                                                                                                                                                                                                                                                                               | Restore **einmal echt testen** vor Go-Live                                                                                                   |

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
4. Kein automatischer Failover — Recovery über Supabase. Danach Backup-Aktualität
   prüfen.

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

## Vor Go-Live abhaken (siehe auch QS §6)

- [ ] Supabase automatische Backups an + Restore einmal getestet
- [ ] Externe Uptime-Prüfung auf `/health/ready`
- [ ] Error-Tracker mit DSN verbunden, Test-Fehler kommt an
- [ ] Log-Sink erhält Logs, PII-Schwärzung stichprobenartig geprüft
- [ ] Scheduler ruft die Wartungs-Jobs, Job-Fehler alarmiert
- [ ] Rate-Limit-Schwellen nach Last-/Smoke-Test angepasst
