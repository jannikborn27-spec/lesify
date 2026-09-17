# Lesify — Backend Planning

> Lebendes Dokument. Wird bei jeder Änderung an Datenmodell, API-Anforderungen
> oder Backend-Logik aktualisiert (siehe `CLAUDE.md` im Projekt-Root für die
> Update-Pflicht). Stand: Frontend-Prototyp (statisches HTML/CSS/JS, Dummy-Daten
> in `app/assets/js/data.js`).
>
> **Neu:** Der Ordner `marketing/` enthält jetzt die öffentliche Marketing-Website.
> Vier Nav-Einträge (Stand 2026-09-12): **Home** (`index.html`), **Preise**
> (Anker `index.html#price`), **Über uns** (`ueber-uns.html`), **FAQ** (Anker
> `index.html#faq`); dazu Utility-Seiten ohne Nav-Eintrag: Login, Registrierung,
> Passwort vergessen, Checkout, Kontakt, Impressum, Datenschutz, AGB. Eigene
> Seiten `preise.html` und `faq.html` gibt es **nicht mehr** — beide Inhalte
> sind Abschnitte auf der Startseite (wie zuvor schon Funktions-Unterseiten
> und `vergleich.html`: Vergleich unter `index.html#cmp`). Preis-Karten +
> Sitzplatz-Rechner leben als `PRICE`-Objekt direkt in
> `marketing/assets/js/marketing.js` (`renderPrice`/`priceInit`), FAQ-Einträge
> im `FAQ`-Objekt dort (`renderFaq`). Sie ist ein
> eigenständiger statischer Prototyp (`marketing/assets/css/marketing.css`,
> `marketing/assets/js/marketing.js`) im selben Design-System wie die eingeloggte
> App, ohne Backend-Anbindung. Die daraus resultierenden Backend-Anforderungen
> (Auth, Abo/Abrechnung, Kontaktformular, Paket-Limits) sind unten in §1, §4,
> §5, §7, §8 und §11 eingearbeitet. Die Preise im `PRICE`-Objekt
> (`marketing.js`) sind seit 2026-09-14 **final** (siehe §8 „Entschieden am
> 2026-09-14"), nicht mehr Design-Platzhalter — nur die Monatskontingente
> (`limits`) bleiben es weiterhin.
>
> **Preis-Modell (Stand 2026-09-03).** Kein dauerhaft kostenloser Tarif —
> stattdessen **14 Tage kostenlose Testphase**. Tarif + Intervall werden **bei
> der Registrierung** gewählt und eine Zahlungsart hinterlegt; nach 14 Tagen
> bucht Stripe **automatisch** den Monats-/Jahresbetrag ab, sofern nicht vorher
> gekündigt (echter Stripe-Trial → Subscription, kein separater „jetzt bezahlen"-
> Schritt). Drei Einzelplatz-Tarife **Starter · Premium (Bestseller) ·
> Infinite** und **Familien-Pakete** (Tarif × 2/3/4 Sitzplätze, jeder Sitz mit
> dem vollen Monatskontingent seines Tarifs — Nutzung wird **nicht** zwischen
> Sitzen geteilt oder in den Folgemonat übertragen). Aktuelles Angebot **−20 %
> zum Schuljahresstart** (Angebotspreis = berechneter Preis, Normalpreis nur
> durchgestrichen). Preise gibt es **monatlich und jährlich**. **Die MwSt. wird
> nicht ausgewiesen (Kleinunternehmerregelung — interner Vermerk, wird auf der
> Website nicht erwähnt).** Zahlungsanbieter ist **Stripe**. Die maßgeblichen
> Zahlen (Beträge, Kontingente, interne API-Kosten/LTV) stehen zentral in
> `marketing/assets/js/stripe-config.js` (`plans`, `family`, `limits`,
> `economics`, `trialDays: 14`); `app/assets/js/data.js` (`Lesify.PLAN_LIMITS`)
> spiegelt die Kontingente 1:1.

Dieses Dokument beschreibt, was gebaut werden muss, damit der bestehende
Frontend-Prototyp durch ein echtes Backend ersetzt werden kann. Die Feldnamen,
Statuswerte und Berechnungsformeln entsprechen 1:1 dem, was in `data.js`
bereits im Frontend läuft — das Backend muss dieses Verhalten reproduzieren,
nicht neu erfinden.

---

## 0. Stack (Entscheidung 2026-09-04)

Grundsatz: **Das Backend reproduziert `app/assets/js/data.js`, es erfindet nichts
neu.** Die Funktionsnamen aus `data.js` (§9) bleiben das Ziel-Interface des
späteren API-Clients.

### Beschlossen

| Bereich | Wahl | Begründung |
|---|---|---|
| Sprache | **TypeScript** end-to-end | Frontend ist bereits JS; `data.js`-Signaturen 1:1 als typisierter Client nachbaubar; ein Sprachraum für `shared/`-Formeln. |
| Repo-Form | **Monorepo** mit `pnpm`-Workspaces | Marketing + App + API + geteilte Tokens/Typen/Formeln synchron in einem Repo. |
| Datenbank | **PostgreSQL**, managed, **EU-Region** | Datenmodell (§1) ist stark relational (FKs, Enums, Arrays). EU-Region Pflicht (DSGVO, Minderjährigendaten). |
| DB- & Storage-Anbieter | **Supabase (EU-Region)** | Postgres **und** S3-kompatibler Objektspeicher aus einer Hand → weniger Anbieter/Verträge für den Start. **Nur** als Postgres + Storage genutzt. |
| Auth | **selbst gebaut** (nicht Supabase Auth) | §3/§5 brauchen eigenen Double-Opt-in-Token-Flow, Rollen (`schueler`/`elternteil`) und `parentUserId`-Scoping — passt nicht zu einem fertigen BaaS-Auth. Supabase Auth wird bewusst **nicht** verwendet. |
| Objektspeicher-Zugriff | **Supabase Storage**, nur über **zeitlich begrenzte signierte URLs** | Keine öffentlichen Datei-Links (§6). |
| Zahlungen | **Stripe** (Test- + Live-Modus) | Phase-0-Entscheidung: Trial → Subscription, Proration, Familien-Sitze. |
| E-Mail | **Resend** (Entscheidung 2026-09-17) | Zahlungs-/Abo-/Beleg-Mails weiterhin über Stripe. Double-Opt-in-/Passwort-Reset-Mails laufen über Resend (`api/src/lib/mailer.ts`); ohne `RESEND_API_KEY` läuft ein Fake-Gateway (nur Logging). Klausur-Erinnerung/Wochenreport bleiben zurückgestellt (§8). |

### Umsetzungs-Ebene

- **API-Framework:** Fastify (schlank, natives JSON-Schema-Validieren — passt zu
  den festen JSON-Schemas der KI-Calls in §3). _Stub `api/src/index.ts` steht (Phase 1)._
- **DB-Zugriff & Migrationen:** **Prisma** — seit Phase 2 in Benutzung
  (`api/prisma/schema.prisma`), Migrationen über `prisma migrate`. Prisma-
  Migrationen sind vorwärtsgerichtet; „down" bei Bedarf als separate Migration.
- **Tests:** Vitest (Unit für `shared/`-Formeln + Paritäts-Tests gegen `data.js`,
  Phase 7/14).
- **Lint/Format:** ESLint + Prettier, Commit-Hook via `simple-git-hooks` +
  `lint-staged`.
- **CI:** GitHub Actions — bei jedem Push Lint + Typecheck + Tests. Deploy erst
  Phase 16.
- **API-Hosting:** **Railway** (Entscheidung 2026-09-14), Root Directory bleibt
  Repo-Wurzel (nicht `api/` — sonst sieht Railpack `pnpm-workspace.yaml`/
  `pnpm-lock.yaml` nicht und fällt auf `npm` zurück, das `workspace:*` nicht
  auflösen kann). Build Command: `pnpm install --frozen-lockfile && pnpm
  --filter @lesify/shared build && pnpm --filter @lesify/api db:generate &&
  pnpm --filter @lesify/api build`. Start Command: `pnpm --filter @lesify/api
  start`. `shared/` hat jetzt (2026-09-14) einen echten Build-Schritt
  (`shared/package.json` `main`/`types`/`exports` zeigen auf `dist/`, Script
  `build`: `tsc -p tsconfig.json`) — vorher zeigte `main` direkt auf
  `src/index.ts`, was lokal (`tsx`) unbemerkt blieb, aber `node dist/index.js`
  in Produktion mit `ERR_UNKNOWN_FILE_EXTENSION` crashen ließ, weil Node
  `.ts`-Dateien nicht nativ lädt.

### Ziel-Ordnerstruktur (Monorepo)

```
/                     Repo-Wurzel (pnpm-workspace.yaml, .editorconfig, README, LICENSE)
├─ marketing/         früher `frontend/`   (öffentliche Website, kein Build)
├─ app/               heutige *.html im Root + assets/  (eingeloggte App, kein Build)
├─ api/               NEU — Fastify + Prisma Backend
├─ shared/            reine Formeln/Typen/Tokens, von app/ und api/ importiert
│                     (Notenformel, noteAmpel, Limits, Enums — Quelle für Phase 7)
└─ .github/workflows/ CI
```

`marketing/` und `app/` bleiben **ohne Build-Tool** (statisches HTML/CSS/JS wie
heute). Nur `api/` und `shared/` sind TypeScript-Pakete.

### Umgebungen

`local` · `staging` · `production` — je eigene DB, eigener Supabase-Storage-Bucket,
eigene Secrets. `.env.example` (alle Variablennamen, **ohne Werte**) liegt im Repo;
echte Werte nur im Secret-Store der jeweiligen Umgebung. Benötigte Secrets:
`ANTHROPIC_API_KEY`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SESSION_SECRET`,
`RESEND_API_KEY`. Kein Secret, aber Pflicht-Config in `production`:
`CORS_ORIGINS` (kommagetrennte Liste erlaubter Origins für Marketing/App —
siehe §11, 2026-09-12) — ohne sie bleibt CORS dort zu. Auch ohne Secret, aber
mit sinnvollem Default: `EMAIL_ABSENDER`, `MARKETING_URL` (Basis-URL für die
Links in den Mails — in `production` auf die echte Marketing-Domain setzen).

---

## 1. Datenmodell

### User
Im Prototyp der eingeloggten App ein einzelner Nutzer, dessen Name/Klassenstufe
über `einstellungen.html` editierbar ist (Overlay in `localStorage`, kein
Multi-User). Backend braucht echte Multi-User-Fähigkeit von Anfang an —
`name`/`klassenstufe` bleiben editierbar, `initials` wird serverseitig oder
clientseitig aus `name` abgeleitet (erste Buchstaben der ersten zwei Wörter),
nicht separat gespeichert.

**Seit 2026-09-16 legt die öffentliche Registrierung (`marketing/registrieren/`)
NUR noch ein Elternkonto an** — kein Rollen-Picker mehr, kein Kind-Name/
Klassenstufe im Formular. `POST /auth/registrieren` nimmt nur noch
`{name, email, passwort, einwilligung}` entgegen und setzt `rolle` serverseitig
fest auf `elternteil`; `klassenstufe` bleibt `null`. Das gilt **auch bei
Einzelplatz (1 Sitz)** — die frühere Ausnahme „Solo-Elternteil = ist selbst der
Lernaccount" ist gestrichen (siehe UMSETZUNGSPLAN.md „Eltern-only Signup" für
die Entscheidung). Kind-Profile entstehen ausschließlich danach, im Konto,
über `POST /abo/kinder` (dort weiterhin mit eigener `klassenstufe` und
`rolle = schueler`, siehe `KindProfil`/§4) — bis zu `Abo.sitze` Stück, auch bei
`sitze = 1` genau eines. `app/assets/js/auth-gate.js` erzwingt das: jedes
`rolle = elternteil`-Konto landet immer im Eltern-Bereich (`eltern-kinder.html`
ohne Kind-Profil, sonst `eltern.html`), nie auf `dashboard.html`.

| Feld | Typ | Hinweis |
|---|---|---|
| id | uuid | |
| name | string | editierbar über Profil-Formular; bei Elternkonto der/die Sorgeberechtigte, bei Kind-Profil das Kind |
| klassenstufe | string, nullable | nur bei Kind-Profilen (`rolle = schueler`) gesetzt, z. B. „8. Klasse"; bei Elternkonten `null` |
| email | string | Login-Kennung; bei Kind-Profilen im Familien-Abo optional/leer |
| rolle | enum | `schueler` \| `elternteil` — bei öffentlicher Registrierung immer `elternteil`; `schueler` nur für Kind-Profile (`POST /abo/kinder`) |
| parentUserId | uuid (FK, nullable) | gesetzt bei Kind-Profilen, die zu einem Elternkonto/Familien-Abo gehören |
| aboId | uuid (FK, nullable) | aktives `Abo` (siehe unten). Wird i. d. R. **schon bei der Registrierung** gesetzt (Tarif-Wahl + Zahlungsart), `Abo.status` startet auf `test`. `null` nur, falls kein Checkout abgeschlossen wurde |
| trialEndetAm | timestamp (nullable) | Ende der **14-tägigen** kostenlosen Testphase (`createdAt + 14 Tage`). Danach bucht Stripe automatisch ab (→ `Abo.status = aktiv`), außer es wurde vorher gekündigt — dann sind die Schreib-Aktionen (Chat, Uploads, Testklausuren) gesperrt |
| passwordHash | string | serverseitig, nie im Klartext (Prototyp hat keine echte Auth) |
| emailVerifiedAt | timestamp (nullable) | Double-Opt-in nach Registrierung |
| createdAt | timestamp | |

### Abo (Subscription)
Nicht im Prototyp der App enthalten. Ergibt sich aus dem `PRICE`-Objekt in
`marketing/assets/js/marketing.js` (Preis-Abschnitt `index.html#price`) +
`marketing/assets/js/stripe-config.js`: drei Tarife, Einzelplatz oder Familien-
Paket (2–4 Sitze), monatliche oder jährliche Abrechnung, **14 Tage Trial mit
automatischer Abbuchung danach** (Stripe), jederzeit kündbar.

| Feld | Typ | Hinweis |
|---|---|---|
| id | uuid | |
| ownerUserId | uuid (FK) | Vertragsinhaber (bei Familie: das Elternkonto) |
| paket | enum | `starter` \| `premium` \| `infinite` (kein `kostenlos` mehr) |
| art | enum | `einzel` \| `familie` |
| sitze | int | 1 bei `einzel`; 2–4 bei `familie`. Jeder Sitz = ein `KindProfil` mit dem vollen Monatskontingent des `paket` |
| geplanteSitze | int (nullable) | Phase 12: gemerkte **Sitzverringerung**, wirksam zum `aktuellerZeitraumEnde`, sobald genug Kind-Profile entfernt sind (Job `abo-geplante-aenderungen`). `null` = keine geplante Änderung |
| intervall | enum | `monatlich` \| `jaehrlich` (jährlich = niedrigerer Monatswert, siehe `stripe-config.js`) |
| angebot | string (nullable) | aktive Rabatt-Kampagne, z. B. `schuljahresstart_-20` — fixiert den Angebotspreis für die Vertragslaufzeit |
| status | enum | `test` (14-Tage-Trial) \| `aktiv` \| `gekuendigt` \| `pausiert` (Sommerpause) \| `zahlung_offen` |
| trialEndetAm | timestamp (nullable) | nur bei `status = test`; `createdAt + 14 Tage`. Bei Ablauf ohne Kündigung → Stripe bucht ab, `status → aktiv` |
| aktuellerZeitraumEnde | date | Kündigung wird zu diesem Datum wirksam |
| zahlungsanbieterRef | string (nullable) | Stripe-Referenz (Customer/Subscription). Phase 9: gesetzt als `fake_sub_…` durch den Platzhalter-Anbieter, echte Stripe-Referenz ab Phase 16 |
| erstelltAm | timestamp | |

Phase 9 (2026-09-04): Endpunkte `GET/POST/PATCH /abo`, `/abo/kuendigen`,
`/abo/pausieren`, `/abo/webhook`, `/abo/kinder` umgesetzt (§4 „Umsetzungsstand
Phase 9"). Preise/Regeln als Code in `shared/src/abo.ts`.

### KindProfil (nur Familien-Abo)
`Abo.sitze` Stück pro Familien-Abo (2–4). Reine Verknüpfungssicht auf `User`-Datensätze mit
gesetztem `parentUserId`; getrennte Fächer/Themen/Fortschritte je Kind, das
Elternkonto sieht pro Kind nur die aggregierte Wochen-Zusammenfassung
(`Einstellungen.woechentlicheZusammenfassung`), nicht den Chat-Wortlaut.
Phase 9: angelegt/gelistet/gelöscht über `GET/POST/DELETE /abo/kinder`
(`rolle = schueler`, `parentUserId` + `aboId` = Elternkonto,
`passwordHash = "kind:kein-login"` bis zur echten Einladung in Phase 12).
`DELETE` → `User`-Zeile weg → Cascade löscht alle Inhalte des Sitzes.

### Einstellungen
Ein Datensatz pro User. Aktuell im Prototyp: Benachrichtigungs-Toggles,
KI-Tonfall und das App-Erscheinungsbild — Kandidat für spätere Erweiterung
(z. B. Sprache, Barrierefreiheit).

| Feld | Typ | Hinweis |
|---|---|---|
| userId | uuid (FK) | |
| erinnerungVorKlausuren | bool | Hinweis ein paar Tage vor einem eingetragenen Klausurtermin — Versandmechanismus (E-Mail/Push) offen, siehe §8 |
| woechentlicheZusammenfassung | bool | wöchentlicher Report zu Fortschritt/offenen Lerntagen — Versandmechanismus offen, siehe §8 |
| kiTonfall | enum | `freundlich` \| `direkt` \| `motivierend` — fließt in den System-Prompt für Chat/Lernzettel/Erklärungen ein |
| _(kein DB-Feld)_ darkMode | — | dunkles Design, **nur eingeloggter Bereich** (`app/`). **Entscheidung Phase 11 (2026-09-12):** bewusst KEIN Backend-Feld — reine Geräte-Einstellung in `localStorage['lesify:darkmode']` (`'1'`/`'0'`), unabhängig vom Account/Gerät. Setzt beim Seitenaufbau `data-theme="dark"` an `<html>` (Anti-Flash-Snippet im `<head>` jeder App-Seite + `applyTheme()` in `app.js`, beide lesen denselben Key); CSS-Override-Block am Ende von `app/assets/css/style.css`. Marketing-Seiten sind ausgenommen. |

### Fach
| Feld | Typ | Hinweis |
|---|---|---|
| id | uuid | |
| userId | uuid (FK) | |
| name | string | |
| klasse | string | optional, z. B. „8. Klasse" |
| initial | string | 1 Zeichen, UI-Avatar-Fallback — kann im Backend auch rein clientseitig aus `name` abgeleitet werden |
| farbe | enum | Frei wählbar aus einer festen Palette (`FACH_COLORS`, aktuell 8 kuratierte Farbschlüssel wie `blue`/`rose`/`amber`/…, definiert in `app/assets/js/data.js`); rein für Wayfinding/Unterscheidbarkeit der Fächer, keine Statusbedeutung wie das Ampel-Konzept. Kein Freitext-Colorpicker — das Frontend bietet eine feste Auswahl, damit Kontrast/Lesbarkeit garantiert bleiben |
| icon | enum (nullable) | Schlüssel aus einer kuratierten Icon-Bibliothek (`FACH_ICONS`/`FACH_PRESETS` in `app/assets/js/data.js`, aktuell 18 gängige Schulfächer wie `mathematik`/`deutsch`/`biologie`/…). Beim Anlegen wählt der Nutzer optional eine Vorlage aus dieser Liste (Name + Icon werden übernommen, bleiben editierbar) oder legt ein „eigenes Fach" ohne Vorlage an — dann bleibt `icon` `null` und die UI fällt auf den `initial`-Avatar zurück. Wird als Kartenavatar (`fach.html`/`faecher.html`) **und** als blasses Wasserzeichen auf Themen-/Klausur-/Datei-Karten verwendet (nur wenn gesetzt) |

### Thema
| Feld | Typ | Hinweis |
|---|---|---|
| id | uuid | |
| fachId | uuid (FK) | Pflicht — jedes Thema gehört zu genau einem Fach |
| name | string | |
| beschreibung | text | |

> **Entfällt:** `mastery` (int 0–100). Entscheidung 2026-09-03 — der Wert war nie
> real hergeleitet und wird ersatzlos entfernt (aus `data.js`, `app.js`,
> `testklausur.html`). Lernstand zeigt sich allein über die beiden
> Testklausur-Noten je Klausur.

### Chat
| Feld | Typ | Hinweis |
|---|---|---|
| id | uuid | |
| fachId | uuid (FK) | denormalisiert für schnelle Filterung, ergibt sich aus themaId |
| themaId | uuid (FK) | Pflicht |
| titel | string | wird aus der ersten Nutzer-Nachricht generiert (KI-Call, siehe §3) |
| modus | enum (nullable) | `erklaeren` \| `hausaufgaben` \| `ueben` \| `zusammenfassen` — **optional**. Im Composer (`chat.html`) sind die Modus-Pills nicht mehr pflicht: der Nutzer kann Fach + Thema wählen und direkt senden. Ohne Modus bleibt das Feld `null`; UI und System-Prompt fallen auf einen neutralen „freie Frage"-Modus zurück (Kopfzeile „Freie Frage", generische Vorschläge/Antworten). Lernplan-Deep-Links setzen weiterhin immer einen konkreten Modus |
| erstelltAm | timestamp | |
| aktualisiertAm | timestamp | für „zuletzt aktiv"-Sortierung |

### Nachricht
| Feld | Typ | Hinweis |
|---|---|---|
| id | uuid | |
| chatId | uuid (FK) | |
| rolle | enum | `user` \| `ai` |
| text | text | |
| anhangDateiId | uuid (FK, nullable) | siehe Datei |
| erstelltAm | timestamp | |
| zaehltGegenLimit | bool | siehe §5 — jede User-Nachricht zählt, aber Lernzettel-Revisionen haben eine Freikontingent-Sonderregel |

### Lernzettel
| Feld | Typ | Hinweis |
|---|---|---|
| id | uuid | |
| fachId | uuid (FK) | |
| themaId | uuid (FK) | Pflicht |
| titel | string | |
| content | text (Markdown) | vollautomatisch generiert, danach editierbar über Revisionen |
| freeMessagesUsed | int | 0–10, siehe §5 |
| erstelltAm / aktualisiertAm | timestamp | |

### LernzettelRevision
Eigene Tabelle statt Embedding, damit Nachrichten für Usage-Auswertung
einzeln zählbar sind.

| Feld | Typ | Hinweis |
|---|---|---|
| id | uuid | |
| lernzettelId | uuid (FK) | |
| rolle | enum | `user` \| `ai` |
| text | text | |
| erstelltAm | timestamp | |

### Datei
| Feld | Typ | Hinweis |
|---|---|---|
| id | uuid | |
| fachId | uuid (FK) | |
| themaId | uuid (FK) | Pflicht |
| name | string | Originaldateiname |
| typ | enum | `pdf` \| `doc` \| `img` (abgeleitet aus MIME-Type) |
| mime | string | Original-MIME (Phase 5) — unterscheidet `.docx`/Legacy-`.doc` bzw. Bild-Subtyp für Vision |
| groesseBytes | int | Limit: 5 MB pro Datei (hart validiert, Backend UND Frontend) |
| speicherPfad | string | siehe §6 |
| status | enum | `verarbeitung` \| `bereit` \| `fehler` |
| zweck | enum | `thema` \| `testklausurLoesung` (Phase 5) — Lösungs-Uploads erscheinen nicht in der Themen-Dateiliste, zählen nicht gegen das Content-Limit |
| zusammenfassung | text (nullable) | KI-generiert beim Upload, siehe §3 |
| erstelltAm | timestamp | |

### Klausur
Der **echte** Klausurtermin — reine Verwaltungsinformation, kein KI-Workflow.

| Feld | Typ | Hinweis |
|---|---|---|
| id | uuid | |
| fachId | uuid (FK) | |
| themaIds | uuid[] | ein Termin kann mehrere Themen abdecken |
| titel | string | |
| datum | date | |
| erstelltAm | timestamp | |

Eine `Klausur` hat keine nachträglich editierbaren Felder (Titel/Datum/Themen
werden nur beim Anlegen gesetzt) — kein Override-Mechanismus.

> **Entfällt:** `note` (die tatsächlich erreichte Klausurnote).
> Entscheidung 2026-09-03 — Lesify ist zur **Vorbereitung** da; das
> Klausur-Endergebnis wird bewusst nirgends erfasst. Feld, ein Eingabe-Flow und
> die „Deine Note"-Anzeige auf geschriebenen Karten entfallen (aus `data.js`,
> `app.js` `klausurErgebnisBox`, `klausur.html`).

**Bereits geschriebene Klausuren.** Ob eine Klausur „vorbei" ist, wird **allein aus
`datum` abgeleitet** (`datum < heute` → `Lesify.klausurVergangen(k)`), es gibt kein
eigenes Statusfeld. Solche Klausuren werden überall, wo Klausuren erscheinen
(Klausuren-Übersicht, Fach-Seite, Thema-Tab, Klausur-Detailseite), gedämpft und als
**„Geschrieben"** dargestellt: gestrichelte, entsättigte Karte, `datum`-Zeile zeigt
„vor N Tagen", plus ein neutraler „Geschrieben"-Chip (keine Note).
Die gemeinsame Liste (`R.klausurListe`) sortiert anstehende Klausuren nach vorne
(nächster Termin oben) und listet die geschriebenen darunter unter der Überschrift
„Bereits geschrieben" (neueste zuerst). Das **Dashboard** blendet geschriebene
Klausuren in „Nächste Klausur" / „Anstehende Klausuren" komplett aus.

### Lernplan
Der **7-Tage-Lernplan** zu einer Klausur — die strukturierte Vorbereitung, die den
früheren „Action Plan · Nachtest"-Flow ersetzt. Wird **automatisch bei der
Klausur-Erstellung** angelegt (1:1, `POST /klausuren` legt ihn mit an, siehe §4) und
läuft von `klausur.datum − 7 Tage` bis zur Klausur:

| Tag | Inhalt |
|---|---|
| 1 | Testklausur 1 (diagnostisch, deckt alle `klausur.themaIds` ab) → Themen in stark/wackelig/schwach |
| 2 | **Schritt 1 „Verstehen anhand des Fehlers"**: Erklärung bezogen auf die tatsächlich falsch gelöste Testklausur-1-Aufgabe + Alltagsbeispiel/Analogie + kurzer Verständnis-Check (3 Checklisten-Punkte pro Fokus-Thema) |
| 3 | **Schritt 2 „Beispielaufgaben selbstständig lösen"**: Abfrage-Punkte (interleaved ab 2 Fokus-Themen) + Korrektur-Checkpoint („Lösungen checken") · Lernzettel startet |
| 4 | **Schritt 3 „Feynman als Konsolidierung"**: den Stoff jetzt selbst erklären (Abschluss-Check, nicht Einstieg) + Wiederholung des Tag-2-Inhalts + bei genau einem schwachen Thema zusätzlich eine Transferaufgabe · Lernzettel wächst |
| 5 | Testklausur 2 (Re-Diagnose, deckt **alle** an Tag 1 schwachen/wackeligen Themen ab — Fokus **und** Kurz) |
| 6 | Hartnäckige Lücken aus Testklausur 2 + Auffrischen der ursprünglichen Schwachstellen |
| 7 | Selbsttest mit dem Lernzettel (leicht, kein neuer Stoff) |

**Tag als Checkliste (Tag 2/3/4/6/7):** Jeder dieser Tage ist eine geordnete Liste
abhakbarer Aufgaben-Punkte (Chat-Deep-Links). Der Frontend-Zustand `lernplan.checklist`
(`{ "<tag>": { "<aufgabenKey>": true } }`) hält, welche Punkte erledigt sind; die
Key-Liste je Tag berechnet `lernplanStatus` deterministisch aus `fokusThemen`/`kurzThemen`/
`intensitaet` bzw. (Tag 6) `stubborn`/`aufgefrischt`. **Ein Tag gilt als erledigt, sobald
alle seine Punkte gehakt sind** — Abwählen öffnet ihn wieder (`aktuellerTag` folgt).
Der „Tag abschließen"-Button setzt alle Punkte auf einmal. Tag 1/5 bleiben Testklausur-
gesteuert, der „nichts zu tun"-Kurzschluss (Tag 2–4/6 bei komplett starker Testklausur 1)
gilt weiter.

**Adaptive Lastverteilung (Tag 2–4):** `Lesify.lernplanStatus` sortiert `schwacheThemen`
nach Ampel-Schwere (rot vor gelb, dann schlechtere Note zuerst) und teilt sie ab
`LERNPLAN_FOKUS_LIMIT` (= 3) schwachen Themen in `fokusThemen` (die 3 schwersten, volle
3-Schritt-Behandlung) und `kurzThemen` (Rest, kompakter gebündelter „Kurzwiederholung"-Block
auf Tag 2 und 3, keine eigene Karte auf Tag 4) auf. `intensitaet` ∈ `null` (0 Themen) /
`'tief'` (genau 1 → Tag 3 mit 5 statt 3 Aufgaben, Tag 4 mit Transferaufgabe) / `'normal'`
(2–3, alle sind Fokus, `kurzThemen` leer) / `'triagiert'` (4+, Aufteilung greift).
Testklausur 2 (Tag 5, `Lesify.starteTestklausur2`) deckt weiterhin **alle** `schwacheThemen`
ab, nicht nur `fokusThemen` — sonst würden Kurz-Themen nie erneut geprüft.

| Feld | Typ | Hinweis |
|---|---|---|
| id | uuid | |
| klausurId | uuid (FK) | 1:1 — jede `Klausur` bekommt bei Erstellung genau einen Lernplan |
| testklausur1Id | uuid (FK) | Tag 1 — deckt alle `klausur.themaIds` ab |
| testklausur2Id | uuid (FK, nullable) | Tag 5 — deckt nur die an Tag 1 schwachen/wackeligen Themen ab; `null` bis Tag 5 gestartet wird |
| checklist | `{ "<tag>": { "<aufgabenKey>": bool } }` | pro Lerntag (2/3/4/6/7) die abgehakten Aufgaben-Punkte. Ein Tag ist erledigt, wenn alle seine (in `lernplanStatus` berechneten) Keys `true` sind. Tag 1/5 ergeben sich aus dem Status der jeweiligen Testklausur |
| tageErledigt | int[] | **Legacy** — früherer „manuell abgeschlossen"-Marker (Teilmenge `{2,3,4,6,7}`). Wird nur noch als Fallback gelesen (Tag ⇒ alle Keys gehakt) und beim ersten `setLernplanCheck` in `checklist` materialisiert; neue Lernpläne nutzen ausschließlich `checklist` |
| lernzettel | `{content, aktualisiertAm}` \| `null` | kumulatives Markdown-„Merkzettel"-Dokument; `null` bis Tag 3 zum ersten Mal aktualisiert wird (danach angehängt an Tag 4/6) |
| chatMap | `{ "<tag>\|<modus>\|<themaId>": chatId }` | Kontinuitäts-Zuordnung: welcher Chat gehört zu welchem Lernplan-Schritt. Leeres Objekt bei Erstellung. Mehrere Aufgaben-Punkte desselben Tages mit gleichem Modus **und** Thema (z. B. Tag 2 „Fehler klären" + „Beispiel dazu", beide `erklaeren`; oder Tag 3 Abfrage-Chip + Korrektur-Checkpoint, beide `ueben`) teilen sich denselben, fortsetzbaren Chat. Der Tag steckt fest im Schlüssel — **kein** Chat über mehrere Tage oder den ganzen Lernplan (dafür ist später der „Themen Memory"-Block zuständig, siehe §3). Ein Punkt mit anderem Modus zum selben Thema/Tag bekommt bewusst einen eigenen Chat. Tag 1/5 (Testklausur-gesteuert) und Tag 7 (einzelner Selbsttest-Chip) nutzen `chatMap` nicht |
| erstelltAm | timestamp | |

`chatMap` ist ein **eigenes JSON-Feld am `Lernplan`** (Entscheidung 2026-09-04) —
gepflegt über `PATCH /lernplaene/:id` bzw. gebündelt in `POST /chats/:id/nachrichten`
mit `lernplanKontext`. **Nicht** serverseitig aus `Nachricht`-Metadaten rekonstruiert;
ein Lesezugriff, exakt das Prototyp-Verhalten.

Gleiches Seed+Store+Override-Muster wie `Klausur`/`fachOverrides` im Prototyp
(`store.lernplaene` + `store.lernplanOverrides`, `Lesify.lernplaene()`,
`Lesify.getLernplan(id)`, `Lesify.getLernplanFuerKlausur(klausurId)`). Der gesamte
abgeleitete Zustand (aktueller Tag, welche Themen schwach sind, ob Testklausur 2
nötig ist, Tag-1↔Tag-5-Vergleich, „nichts zu tun"-Kurzschluss bei komplett starker
Testklausur 1) wird in **einer** Funktion `Lesify.lernplanStatus(lernplanId)`
berechnet — Seiten rendern nur. Alle Tagesübergänge sind **weich** (kein
Zugriffs-Gate): der Schüler kann Tage in beliebiger Reihenfolge abschließen und
Testklausur 2 jederzeit nach der Analyse von Testklausur 1 starten.

### Testklausur
Der KI-Vorbereitungs-Workflow. Kann optional an eine `Klausur` gebunden sein,
muss aber nicht (auch direkt von einer Themen-Seite aus erstellbar).

**Genau zwei pro Lernplan.** Ein `Lernplan` bindet bis zu zwei Testklausuren derselben
`klausurId`: Testklausur 1 (Tag 1, alle Themen) und Testklausur 2 (Tag 5, nur die an
Tag 1 schwachen/wackeligen Themen). Die frühere Produktentscheidung „höchstens eine
Testklausur pro Klausur" ist aufgehoben; stattdessen sind es **exakt zwei** — das
Backend weist einen dritten `POST /testklausuren` zur selben `klausurId` hart ab
(Entscheidung 2026-09-04). Es gibt auch keinen Lernplan-Neustart, der einen neuen
Zyklus erzeugen würde.
`Lesify.testklausurenForKlausur(klausurId)` liefert beide (Array),
`Lesify.testklausurForKlausur(klausurId)` die **zuletzt erstellte** (= Testklausur 2,
sobald vorhanden, sonst Testklausur 1).
Die eigentliche Erstellen→Lösen→Analyse-Mechanik ist für Testklausur 1 und 2
identisch (`testklausur.html` arbeitet nur über `t.id`).

**Es gibt genau zwei Noten — Testklausur 1 und Testklausur 2 — und keine eigene,
fortlaufend aktualisierte „Klausurvorbereitungsnote" mehr.** Die auf `klausur.html`,
dem Dashboard und den Klausur-/Fach-/Thema-Karten angezeigte Note ist immer die
**eingefrorene `TestklausurErgebnis`-Gesamtnote der zuletzt _abgeschlossenen_
(analysierten) Testklausur**: Testklausur 2, sobald sie analysiert ist, sonst
Testklausur 1; ist noch keine analysiert, zeigt die Karte einen Status-Chip statt
einer Note. `Lesify.klausurNote(klausurId)` kapselt diese Auswahl und gibt
`{ note, testNr, testklausur } | null` zurück (`testNr` ∈ {1, 2}).

| Feld | Typ | Hinweis |
|---|---|---|
| id | uuid | |
| klausurId | uuid (FK, nullable) | bei Lernplan-Testklausuren immer gesetzt |
| fachId | uuid (FK) | |
| themaIds | uuid[] | ein Thema → eine Aufgabe |
| titel | string | |
| status | enum | `erstellt` → `geloest` → `analysiert` (siehe Statusmaschine unten) |
| geloesteDateiId | uuid (FK, nullable) | Upload der Lösung durch den Schüler |
| loesungsText | string (nullable) | Klartext der Lösung, Grundlage für Call 11. **Phase 5:** wird bei einem multipart-Upload automatisch extrahiert (pdf/docx-Text bzw. Vision-Transkription bei Bildern); der direkte JSON-`{loesungsText}`-Pfad aus Phase 6 bleibt als Bridge/Testing-Weg erhalten |
| erstelltAm | timestamp | |

### Aufgabe
Eine pro Thema innerhalb einer Testklausur. Nicht Multiple-Choice.

| Feld | Typ | Hinweis |
|---|---|---|
| id | uuid | |
| testklausurId | uuid (FK) | |
| themaId | uuid (FK) | |
| frage | text | KI-generiert aus Chat- + Datei-Content des Themas |
| reihenfolge | int | |

### TestklausurErgebnis (eingefroren)
Ein Eintrag pro Aufgabe, entsteht bei der Analyse und wird danach **nie mehr verändert** — das ist die „Testklausurnote".

| Feld | Typ | Hinweis |
|---|---|---|
| id | uuid | |
| testklausurId | uuid (FK) | |
| themaId | uuid (FK) | |
| prozent | int | |
| note | decimal(2,1) | deutsche Skala 1.0–6.0, siehe Formel in §2 |
| erklaerung | text | KI-generiertes Feedback, insbesondere bei Fehlern |

Gesamtnote der Testklausur = Durchschnitt der `note`-Werte aller
zugehörigen `TestklausurErgebnis`-Einträge (gleichgewichtet pro Thema).

### Vorbereitungsstand (`Testklausur.vorbereitung.proThema[]`)
Ein Eintrag pro Thema innerhalb einer Testklausur — die **dreistufige Ampel pro
Thema** (stark / wackelig / schwach), aus der der Lernplan die schwachen Themen,
Fokus-/Kurz-Aufteilung und den Testklausur-1↔2-Vergleich ableitet. Entsteht
**einmalig bei der Analyse** als Klon von `TestklausurErgebnis` und ändert sich
danach nicht mehr (der frühere Nachtest-Überschreibmechanismus ist entfallen — der
Fortschritt zeigt sich jetzt im Vergleich Testklausur 1 ↔ Testklausur 2). Es gibt
**keine daraus abgeleitete Gesamt-„Vorbereitungsnote"** mehr — die angezeigte Note
einer Klausur ist immer eine der beiden eingefrorenen `TestklausurErgebnis`-Noten
(siehe `Lesify.klausurNote`).

| Feld | Typ | Hinweis |
|---|---|---|
| id | uuid | |
| testklausurId | uuid (FK) | |
| themaId | uuid (FK) | |
| prozent | int | |
| note | decimal(2,1) | |
| ampel | enum | `gruen` \| `gelb` \| `rot` — **direkt bei der Analyse dreistufig** vergeben über `noteAmpel(note)` (≤2.5 gruen · ≤4.0 gelb · sonst rot). Im Lernplan als **stark / wackelig / schwach** angezeigt. |

`lernplanStatus` liefert die Note der zuletzt abgeschlossenen Testklausur als
`letzteTestNote` (+ `letzteTestNr` ∈ {1, 2}) mit; `gesamtnoteAktuell` bleibt als
Rückwärtskompat-Alias auf denselben Wert bestehen. Beides ist identisch zu
`Lesify.klausurNote(klausurId).note` — es gibt keine separat gemittelte
„Vorbereitungsnote" mehr.

### Lernen im KI-Chat (kein eigener Datensatz)
Der Lernplan verlinkt pro Lerntag und schwachem Thema **vorformulierte Chat-Prompts**
(Deep-Links nach `chat.html?fach=…&thema=…&mode=…&prompt=…`): Fehler-Erklärung +
Alltagsbeispiel + Verständnis-Check (Tag 2), selbstständiges Üben + Korrektur-Checkpoint
(Tag 3), Feynman-Konsolidierung + Wiederholung + ggf. Transferaufgabe (Tag 4), gezieltes
Lückenschließen + Auffrischen (Tag 6), Selbsttest mit dem Lernzettel (Tag 7). Der
Fehler-Prompt an Tag 2 zitiert die konkrete falsch gelöste Aufgabe (`Testklausur1.aufgaben[].frage`)
und die eingefrorene Diagnose (`Testklausur1.ergebnis.proThema[].erklaerung`) — beides
existiert bereits, kein neues Feld. Jeder generierende Prompt (Übungsaufgaben,
Verständnisfragen, Erklärung, Transferaufgabe …) endet mit einem Niveau-Hinweis auf die
**Klassenstufe** (`Fach.klasse`, ersatzweise `User.klasse`), damit die KI Schwierigkeit
und Umfang passend wählt.
Der Schüler lernt also **im Gespräch mit der KI** (fällt unter das normale
Nachrichten-Limit, siehe §7) statt über vorgenerierte Beispielaufgaben.
`chat.html` liest `mode` (`erklaeren` \| `hausaufgaben` \| `ueben` \|
`zusammenfassen`) und `prompt` (URL-encodiert) und legt das Eingabefeld
vor — **ohne** automatisch zu senden. Kein zusätzlicher Datensatz, kein
zusätzlicher KI-Call. `mode` ist im URL wie im Composer optional; fehlt er
oder ist er unbekannt, startet der Chat ohne Modus (neutraler Kontext).
Lernplan-Deep-Links setzen ihn immer.

**Chat-Kontinuität pro Lernplan-Schritt (Frontend-Datenfluss).** Ein Lernplan-Chip
öffnet den Chat auf zwei Wegen: frisch (`chat.html?fach=…&thema=…&mode=…&prompt=…`)
oder — sobald `Lernplan.chatMap` für `"<tag>\|<modus>\|<themaId>"` schon einen Chat
kennt — als Fortsetzung (`chat.html?chat=<chatId>&prompt=…`). Beide Formen tragen
zusätzlich `&lp=<lernplanId>&lptag=<tag>`, damit `chat.html` die (evtl. gerade erst
angelegte) `chatId` über `Lesify.setLernplanChatId(lernplanId, tag, modus, themaId,
chatId)` in die `chatMap` zurückschreiben kann. Der Prompt-Text wird auch bei
Fortsetzung erneut vorbelegt (kann ignoriert/überschrieben werden). Ein
Deep-Link-Chat wird jetzt beim **ersten Absenden** regulär über `POST /chats`
angelegt und jede Nachricht über `POST /chats/:id/nachrichten` persistiert
(`Lesify.appendChatMessages` im Prototyp) — vorher lebte er nur im Seiten-State
und ging bei Reload verloren. **Bewusster Nicht-Umfang:** kein Chat über mehrere
Tage/den ganzen Lernplan, kein echter „Themen Memory"-Call — die `chatMap` legt nur
die Frontend-Datenstruktur so an, dass ein Backend später sauber andocken kann.
Backend-seitig ist `chatMap` ein Teilaspekt von `PATCH /lernplaene/:id` (Override-
Muster) bzw. fällt beim Anlegen einer Chat-Nachricht mit Lernplan-Kontext an.

### Usage / Limits
Pro User (= pro Sitz), monatlich, resettet am 1. jedes Monats (aktuell fix,
siehe §8). **Nichts wird in den Folgemonat übertragen.** Die konkreten
`*Limit`-Werte hängen am `Abo.paket` und gelten pro Sitz identisch — ein
Familien-Paket vervielfacht nur die Sitze, nicht die Quote je Kind.
Frontend-Spiegel: `Lesify.PLAN_LIMITS` in `app/assets/js/data.js`,
`Lesify.usage()` liefert die vier Zähler + Limit + `resetDatum` + `planName`.

| Feld | Typ | Hinweis |
|---|---|---|
| userId | uuid (FK) | ein Zähler-Satz je Sitz |
| monat | string (YYYY-MM) | |
| nachrichtenUsed / nachrichtenLimit | int / int·nullable | `null` = unbegrenzt (nur `infinite`) |
| dateienUsed / dateienLimit | int / int | „Content-Aufnahmen" — Datei- & Chat-Uploads, siehe unten |
| lernzettelUsed / lernzettelLimit | int / int | **neu** — Anzahl aktiver Lernzettel |
| testklausurenUsed / testklausurenLimit | int / int | pro Monat |

**Monatskontingente je Sitz (maßgeblich: `marketing/assets/js/stripe-config.js` → `limits`; Design-Platzhalter):**

| Tarif | Fächer | Content-Aufnahmen/Monat | KI-Nachrichten/Monat | Lernzettel | Testklausuren/Monat | Erinnerung vor Klausuren | Eltern-Zusammenfassung |
|---|---|---|---|---|---|---|---|
| Starter | alle | 20 | 100 | 5 | 1 | – | – |
| Premium (Bestseller) | alle | 50 | 250 | 15 | 5 | ja | – |
| Infinite | alle | 100 | unbegrenzt | 50 | 15 | ja | ja |
| Familie · <Tarif> · N Kinder | alle | Tarifwert **je Kind** | Tarifwert **je Kind** | Tarifwert **je Kind** | Tarifwert **je Kind** | wie Tarif | ja (wöchentlich) |

Interne Planungswerte (nicht in der Schüler-UI): API-Kosten/Monat und LTV je
Sitz — Starter 1,57 € / 110 €, Premium 4,13 € / 130 €, Infinite 11,28 € / 180 €
(`stripe-config.js` → `economics`, `data.js` → `Lesify.PLAN_ECONOMICS`).

Ein Lernplan enthält zwei Testklausuren (Tag 1 + Tag 5); bei **Starter**
(1 Testklausur/Monat) reicht das Kontingent für einen Lernplan-Durchlauf pro
Monat ohne Testklausur 2.

Der Ampel-Ring in `chat.html`/`einstellungen.html` zeigt das Maximum aller vier
Quoten; ein `null`-Limit (unbegrenzte Nachrichten bei `infinite`) zählt als 0.

**Was zählt als „Nachricht" gegen das Limit:**
- Jede User-Nachricht in einem KI-Chat.
- Jede Lernzettel-Revisionsnachricht **ab der 11.** pro Lernzettel (die ersten
  10 sind pro Lernzettel gratis, siehe `Lernzettel.freeMessagesUsed`).

**Was zählt als „Content-Aufnahme" gegen das Limit:**
- Jede Datei, die im Chat angehängt oder über „Dateien" hochgeladen wird.
- Testklausur-Lösungs-Uploads (Testklausur 1 und 2) zählen **aktuell nicht** gegen das
  Datei-Limit im Prototyp (sind Teil des Kern-Workflows) — offene Entscheidung,
  siehe §8.

### Umsetzung: Prisma-Schema (Phase 2, 2026-09-04)

Das Datenmodell liegt jetzt als `api/prisma/schema.prisma` vor (Prisma +
PostgreSQL, Migrationen über `prisma migrate`). Präzisierungen ggü. der Tabelle
oben — nichts inhaltlich Neues, nur beim Umsetzen festgelegt:

- **`userId` auf allen nutzergebundenen Tabellen** denormalisiert (nicht nur
  `Fach`/`Einstellungen`/`Usage`, sondern auch `Thema`, `Chat`, `Nachricht`,
  `Lernzettel`, `LernzettelRevision`, `Datei`, `Klausur`, `Lernplan`,
  `Testklausur`, `Aufgabe`, `TestklausurErgebnis`, `Vorbereitungsstand`).
  Grund: das Scoping in der Auth-Middleware (§5, Phase 3) und die Usage-Zählung
  (§7, Phase 8) brauchen `userId` sonst über 2–3 Joins. FK-Kette (`fachId` →
  `themaId` → …) bleibt zusätzlich bestehen.
- **`User.email` ist `nullable` + `unique`** (mehrere `NULL` erlaubt) — Kind-
  Profile im Familien-Abo haben keine eigene Login-Mail.
- **`Lernplan.testklausur1Id` / `testklausur2Id`**: je `unique` (echte 1:1-
  Bindung Lernplan ↔ Testklausur, zusätzlich zur `klausurId`-1:1).
- **Enum-Namen in Prisma** (PascalCase, Werte unverändert): `Rolle`, `AboPaket`,
  `AboArt`, `AboIntervall`, `AboStatus`, `KiTonfall`, `ChatModus` (nullable),
  `NachrichtRolle` (gilt auch für `LernzettelRevision.rolle`), `DateiTyp`,
  `DateiStatus`, `TestklausurStatus`, `Ampel`.
- **Löschverhalten**: `onDelete: Cascade` von `User` und entlang der
  `Fach`→`Thema`→… -Kette (entspricht „Fach löschen" / „Sitz entfernen löscht
  Inhalte", Phase 0). Nullable Datei-Referenzen (`Nachricht.anhangDateiId`,
  `Testklausur.geloesteDateiId`) → `SetNull`.
- **Row-Level-Security**: kommt **nicht** als DB-Feature (Entscheidung
  2026-09-04) — Datentrennung rein über die `userId`-gescopte Query-Schicht +
  FK-Constraints. Supabase-RLS setzt Supabase-Auth voraus, die hier nicht
  genutzt wird. RLS als spätere Härtung offen (§8).
- **JSON-Spalten**: `Lernplan.checklist` / `chatMap` (`@default("{}")`),
  `Lernplan.lernzettel` (nullable), `Lernplan.tageErledigt` (`Int[]`).
- **Arrays ohne FK**: `Klausur.themaIds`, `Testklausur.themaIds` (`String[] @db.Uuid`).

### Auth-Tabellen (Phase 3, 2026-09-04)

Zwei Tabellen, die in §1 oben nicht stehen — sie tragen das „Session/JWT"-
Konzept aus §5:

| Tabelle | Feld | Typ | Hinweis |
|---|---|---|---|
| **Session** | id | uuid | opake, DB-gestützte Sitzung |
| | userId | uuid (FK, Cascade) | |
| | tokenHash | string (unique) | `sha256(roh)` hex — der Rohwert (base64url, 32 Byte) geht nur an den Client, als `Authorization: Bearer` |
| | ablaeuftAm | timestamp | `login` + 7 Tage, mit `angemeldetBleiben` 90 Tage (`SESSION_TAGE` / `SESSION_TAGE_ANGEMELDET_BLEIBEN`) |
| | erstelltAm | timestamp | |
| **VerificationToken** | id | uuid | Einmal-Token für Double-Opt-in **und** Passwort-Reset |
| | userId | uuid (FK, Cascade) | |
| | typ | enum `VerificationTokenTyp` | `email_bestaetigung` \| `passwort_reset` |
| | tokenHash | string (unique) | wie Session |
| | ablaeuftAm | timestamp | E-Mail-Token 7 Tage, Reset-Token 1 Tag |
| | eingeloestAm | timestamp (nullable) | gesetzt = verbraucht (Einmal-Nutzung) |
| | erstelltAm | timestamp | |

Migrationen: `20260904083856_init` (Kernmodell) + `20260904084337_auth_sessions_tokens`.

---

## 2. Notenlogik (muss exakt reproduziert werden)

```
note = 6 − (prozent / 100) × 5        // 100 % → 1.0, 0 % → 6.0
note = round(note, 1 Nachkommastelle)

AMPEL_GRUEN_MAX_NOTE = 2.5             // Note ≤ 2.5 (~70 %) → grün / „stark"
```

Notenlabels (rein informativ, für Anzeige):
`≤1.5 sehr gut · ≤2.5 gut · ≤3.5 befriedigend · ≤4.5 ausreichend · ≤5.5 mangelhaft · sonst ungenügend`

**Dreistufige Ampel für eine einzelne Note** (`noteAmpel(note)` in `data.js`) — genutzt
sowohl für die große, farbige Testklausur-Note auf den Klausur-Karten
(Dashboard/Fach/Thema/Klausuren-Übersicht) **als auch pro Thema im `Vorbereitungsstand`**
(dort direkt bei der Analyse vergeben, im Lernplan als stark/wackelig/schwach benannt):

```
note ≤ 2.5   → gruen   // stark
note ≤ 4.0   → gelb    // wackelig   (4.0 = deutsche Bestehensgrenze)
sonst        → rot     // schwach
```

Auf den Karten angezeigt wird die **Note der zuletzt abgeschlossenen Testklausur**
(`Lesify.klausurNote(klausurId)` → eingefrorene `TestklausurErgebnis`-Gesamtnote von
Testklausur 2, sobald sie **analysiert** ist, sonst Testklausur 1), beschriftet mit der
Testklausur-Nummer. Da jede Klausur seit ihrer Erstellung einen Lernplan mit
Testklausur 1 hat, ist der „keine Testklausur"-Zustand normalerweise nicht erreichbar;
solange noch keine Analyse vorliegt, zeigt die Karte den Status-Chip (`erstellt`/`geloest`).

### Umsetzung (Phase 7, 2026-09-04)

Bit-genauer Port aus `data.js` liegt in **`@lesify/shared`** (von Frontend und
Backend gleich nutzbar):

- **`shared/src/noten.ts`** — `prozentZuNote` (`round((6 − p/100·5)·10)/10`),
  `noteAmpel`, `noteLabel`, `AMPEL_GRUEN_MAX_NOTE` (2.5), `AMPEL_GELB_MAX_NOTE`
  (4.0), `TIER_LABEL`.
- **`shared/src/lernplan.ts`** — `lernplanStatus(eingabe)` (reine Funktion:
  aktueller Tag, `schwacheThemen` sortiert rot→gelb dann schlechtere Note,
  `fokusThemen`/`kurzThemen` ab `LERNPLAN_FOKUS_LIMIT` = 3, `intensitaet`
  null/tief/normal/triagiert, „nichts zu tun"-Kurzschluss, `stubborn`/
  `aufgefrischt` aus Testklausur 2, `aufgabenKeys` je Lerntag — **identische
  Keys wie `lpTagAufgaben()` in `app.js`**, `letzteTestNote`/`letzteTestNr`),
  `klausurNote(tks)`, `testklausurGesamtNote(prozente)` (=
  `prozentZuNote(round(avg(prozent je Thema)))`).
- **Backend-Anbindung** (`api/src/lib/lernplan.ts`): `berechneLernplanStatus`
  lädt Klausur + beide Testklausuren (Ergebnisse→Gesamtnote,
  Vorbereitungsstand→proThema) und ruft `lernplanStatus`. `GET /lernplaene/:id`
  und `GET /klausuren/:id/lernplan` liefern `{…persistiert, status}`.
  `GET /klausuren(/:id)` liefern zusätzlich `note` (= `klausurNote`).
- **Paritäts-Tests** (`shared/src/*.test.ts`, 39 Stück): die SEED-Szenarien
  lp1…lp6 aus `data.js` als Fixtures; verifiziert, dass die berechneten
  `aktuellerTag`-Werte (3 · 1 · 1 · 6 · 7 · fertig) den SEED-Kommentaren
  entsprechen.
- **Weiche Tagesübergänge**: `lernplanStatus` hat kein Zugriffs-Gate — Tage in
  beliebiger Reihenfolge abschließbar, Testklausur 2 jederzeit nach Analyse von
  Testklausur 1 (`tag5.verfuegbar = tk1Analysiert`).

---

## 3. Wo/wann KI-Calls passieren (usage-sparsam)

Prinzip aus `Thema.pdf` („Themen Memory"): Kontext wird bei Bedarf frisch aus
den Quellen zusammengezogen statt separat extrahiert/dupliziert. Erst
cachen/zusammenfassen, wenn der Kontext zu groß wird — nicht vorher optimieren.

| Zeitpunkt | Call | Zweck | Sparsamkeits-Prinzip |
|---|---|---|---|
| Datei-Upload | 1× | Datei lesen → Name + Zusammenfassung erzeugen | Einmalig bei Upload, danach nur noch die gespeicherte Zusammenfassung lesen — nie erneut die Rohdatei an die KI schicken |
| Chat-Start | 1× (System-Prompt) | „Themen Memory" zusammenbauen: alle Lernzettel (voll) + Datei-Zusammenfassungen + Titel bisheriger Chats als Kontext-Block | Ein Call für den ganzen Kontext, keine Einzel-Extraktion pro Quelle |
| Jede Chat-Nachricht | 1× | Antwort generieren (Modus-abhängiger System-Prompt: erklären / hausaufgaben / üben / zusammenfassen; ohne gewählten Modus ein neutraler „freie Frage"-System-Prompt) | — |
| Chat-Titel (nur 1. Nachricht) | 1× | Kurzen `Chat.titel` aus der ersten Nutzer-Nachricht erzeugen (`prompts/07-chat-titel.md`) | Günstigste/schnellste Modellklasse, ~20 Output-Tokens; an den ersten `POST /chats/:id/nachrichten` angehängt, kein eigener Call-Roundtrip nötig |
| Lernzettel erstellen | 1× | Vollautomatisch aus allen Chats + Dateien des Themas generieren | On-demand, nicht bei jeder Chat-Nachricht neu |
| Lernzettel-Revision | 1× pro Nachricht | Zettel gemäß Anweisung anpassen | Erste 10 Nachrichten pro Lernzettel gratis, danach normale Abrechnung |
| Testklausur erstellen | 1× | Pro Thema eine Aufgabe generieren (nicht Multiple-Choice), basierend auf Chat- + Datei-Content des Themas | Ein Call für alle Aufgaben der Testklausur zusammen, nicht pro Thema einzeln. **Gleicher Call für Testklausur 1 (alle Themen) und Testklausur 2 (nur die schwachen/wackeligen)** — keine neue Call-Art |
| Testklausur-Analyse | 1× | Hochgeladene Lösung auswerten: Punktzahl/Note + Aufgabe-für-Aufgabe-Erklärung. Daraus leitet das Backend deterministisch `Vorbereitungsstand` + dreistufige Ampel ab | Ein Call pro Analyse. Kein Nachtest-Pool mehr — das strukturierte Lernen übernimmt der 7-Tage-Lernplan (Lerntage + verlinkte Chat-Prompts), nicht ein Vor-Generierungs-Call |
| Testklausur 2 (Tag 5) | 1× Erstellung + 1× Analyse | Re-Diagnose, auf die an Tag 1 schwachen/wackeligen Themen beschränkt | **Wiederverwendung** der beiden Testklausur-Calls oben, nur kleinerer `themaIds`-Umfang — keine neue Call-Art |
| Lernzettel-Aktualisierung (Tag 3/4/6) | 1× pro Aktualisierung | Kurzes „wichtigste Dinge zum Merken"-Markdown je Thema erzeugen und **anhängen** statt neu schreiben | Kleiner, usage-sparsamer Call, gleiche Klasse wie Lernzettel-Erstellung; kurzer Output. Diff-/Anhäng-Prinzip wie bei der Lernzettel-Revision (`09-lernzettel-revision.md`) |

**Wichtig:** Die Reihenfolge „Aufgaben generieren → herunterladen → User löst
offline → Lösung als Dokument hochladen → auswerten" bedeutet, dass die KI
selbst **keine Multiple-Choice-Zwischenschritte** validiert — sie liest am
Ende ein komplettes Lösungsdokument und wertet alle Aufgaben in einem Call
aus. Das ist sowohl fachlich gewollt (freie Antworten statt Multiple Choice)
als auch usage-sparsam (ein Call statt N Calls pro Teilaufgabe).

**KI-Missbrauchsschutz / Vorab-Filter (Entscheidung 2026-09-03 / 2026-09-04).**
Vor jedem Chat- und Generierungs-Call laufen drei Prüfungen; schlägt eine an,
wird die Anfrage **direkt abgeblockt** — keine KI-Antwort, kein Usage-Verbrauch,
und das Frontend zeigt eine **Popup-/Toast-Meldung**:

1. **Themen-Guard:** ist die Anfrage **schulrelevant**? Nicht schulbezogene
   Anfragen werden abgewiesen. Umsetzung: günstige Klassifikation (kleiner Call
   oder Regelwerk) **plus** fester Riegel im System-Prompt aller vier Chat-Modi.
2. **Größen-Guard:** Anfrage bzw. zusammengebauter Kontext über einer festen
   Token-/Zeichen-Grenze → abgewiesen mit dem Hinweis, die Frage/den Kontext zu
   kürzen. Wird nicht an die KI geschickt.
3. **Spam-Guard:** identische/near-identische Nachricht in kurzer Folge,
   offensichtliches Flooding → abgewiesen/gedrosselt.

Block-Quote und Fehlalarm-Rate werden geloggt und kalibriert. Siehe auch
§7 „Rate-Limiting & Missbrauchsschutz".

### Umsetzung (Phase 6, 2026-09-04)

Alle zwölf Calls aus `Konzept-texts/prompts/01`–`12` sind als Code-Vorlagen
gebaut (`api/src/lib/ki/calls.ts`), gegen einen deterministischen
`FakeKiClient` (`api/src/lib/ki/client.ts`) end-to-end verdrahtet und
getestet — wie `FakeZahlungsGateway` in Phase 9: ohne `ANTHROPIC_API_KEY`
läuft nirgends ein echter Call, mit Key nutzt `AnthropicKiClient` das
`@anthropic-ai/sdk` (Retry/Timeout aus den SDK-Client-Optionen,
`response.usage` strukturiert geloggt).

- **Verdrahtet (Endpunkte laufen echt, keine Platzhalter mehr):**
  `POST /chats/:id/nachrichten` (Calls 03–06/frei + 07 Titel),
  `POST /themen/:id/lernzettel` (08), `POST /lernzettel/:id/revisionen` (09,
  inkl. `wendePatchesAn()` fürs Such-/Ersetzen-Format),
  `POST /klausuren` **und** `POST /testklausuren` (10, gemeinsame Funktion
  `testklausurErstellen()` in `api/src/lib/testklausur.ts`, dort auch der
  3.-Aufruf-Riegel), `POST /testklausuren/:id/analyse` (11),
  `POST /lernplaene/:id/testklausur2` (10, schwache/wackelige Themen aus
  `lernplanStatus`) und `POST /lernplaene/:id/lernzettel` (12, angehängt).
- **Call 01 — Phase 5 verdrahtet:** `dateiZusammenfassungErzeugen()` läuft
  jetzt fire-and-forget nach jedem `POST /themen/:id/dateien`
  (`themenDateiVerarbeiten()` in `api/src/lib/dateiVerarbeitung.ts`), Rohinhalt
  kommt aus dem echten Objektspeicher-Upload (§6).
- **`Testklausur.loesungsText` — Phase 5 verdrahtet:** wird bei einem
  multipart-Upload automatisch extrahiert; die JSON-Bridge (`loesungsText`
  direkt mitschicken, neben `geloesteDateiId`) bleibt zusätzlich als
  Testing-/Fallback-Pfad bestehen. `POST /testklausuren/:id/analyse` braucht
  ihn weiterhin (`422 keine_loesung_extrahiert`, wenn keiner vorliegt).
- **Themen-Guard/Größen-Guard/Spam-Guard:** `api/src/lib/ki/guard.ts`.
  Themen-Guard als **Regelwerk** (konservative Muster-Liste, bewusst kein
  eigener Klassifikations-Call — beide Varianten sind laut §3 erlaubt);
  Größen-Guard über `KI_ANFRAGE_MAX_ZEICHEN` (Default 6000 Zeichen) auf die
  rohe Nutzer-Eingabe; Spam-Guard über ein In-Memory-Fenster pro User
  (gleiche Nachricht >2× in 30 s). Laufen vor `POST /chats/:id/nachrichten`
  und `POST /lernzettel/:id/revisionen`; kein Usage-Verbrauch bei Treffer.
  Fehlercodes (`nicht_schulrelevant`/`anfrage_zu_gross`/`spam_erkannt`) kennt
  `app/assets/js/api.js` (`fehlerText`) bereits aus Phase 11. Jeder Treffer
  löst zusätzlich ein Missbrauchs-Signal aus (`MissbrauchsWaechter`, Phase 15,
  §7 unten) — ab 5 Treffern/Stunde eine 30-minütige Sperre
  (`429 missbrauch_gesperrt`, ebenfalls in `fehlerText` hinterlegt).
- **Themen Memory / Material:** `api/src/lib/ki/kontext.ts` —
  `themenMemoryBlock()` (Grundfall, reines Assembly, keine Verdichtung: „erst
  optimieren, wenn nötig"), `themaMaterial()` (Lernzettel bevorzugt, sonst
  Rohchats — Calls 10–12), `themaChatsUndDateien()` (immer Rohchats — Call
  08), `klassenstufeFuer()` (`Fach.klasse`, sonst `User.klassenstufe`).
- **Modellwahl als Config:** `env.KI_MODELL_GUENSTIG` / `KI_MODELL_STANDARD`,
  beide Default `claude-haiku-4-5-20251001` (Kostenschätzung `00-overview.md`
  §7 rechnet durchgängig mit Haiku 4.5) — pro Call-Klasse in `calls.ts`
  zugeordnet, ohne Call-Sites anzufassen.
- **Kein DB-`$transaction` über einen KI-Call hinweg:** `POST /klausuren`
  legt die `Klausur` an, ruft `testklausurErstellen()` (inkl. KI-Call)
  außerhalb einer Transaktion auf und räumt die `Klausur` bei einem
  Fehlschlag manuell wieder ab — eine offene DB-Transaktion darf nie auf
  einen Netzwerk-Call warten (Verbindungspool).
- **Prompt Caching:** `cache: true` auf den vier Chat-Modi/frei (Calls
  03–06) — `cache_control` ans Ende des kompletten System-Prompts (Modus +
  Themen Memory + Tonfall), wie in `00-overview.md` §7 vorgegeben.
- **Offen:** echter Anthropic-Key + Budget-Cap fürs erste Live-Testen (siehe
  `docs/RUNBOOK.md`); Themen-Memory-Verdichtung, wenn ein Thema über die
  ~4.000-Token-Schwelle wächst (Erweiterung, noch nicht gebraucht);
  KI-Kosten-Dashboard aus dem Usage-Log (Phase 15/17).

#### Dev-only-Alternative: eigene Claude-Subscription statt API-Key (2026-09-05)

Für lokales Testen vor dem ersten `ANTHROPIC_API_KEY` gibt es
`ClaudeAgentSdkKiClient` (`api/src/lib/ki/devAgentSdkClient.ts`) — nutzt die
persönliche Claude Pro/Max-Subscription über `@anthropic-ai/claude-agent-sdk`
(`devDependency`) statt API-Billing. Aktiv **nur** bei `NODE_ENV=development`
**und** explizit gesetztem `KI_DEV_ADAPTER=claude-agent-sdk` in
`getKiClient()` — sonst (Produktion, Tests, normaler Dev-Betrieb) immer
`FakeKiClient`, auch wenn `CLAUDE_CODE_OAUTH_TOKEN` in `.env` steht. Läuft nie
gegen echte Nutzer:innen: technisch (Paket fehlt in einem Produktions-Install)
und weil eine persönliche Subscription grundsätzlich keinen Traffic für ein
drittes Produkt bedienen darf (Entscheidung 2026-09-04).

**Wichtiger Befund beim Bauen:** `claude -p` (CLI-Print-Modus) lädt **immer**
das volle Claude-Code-Tool-Preset — gemessen 25.000–45.000 Token Overhead pro
Call, ~0,15–0,27 $/Call, unabhängig von `--system-prompt`/`--allowedTools`.
`--bare` schaltet das ab, verlangt dann aber `ANTHROPIC_API_KEY` statt OAuth
(kein Ausweg über die CLI). Der **SDK-Weg** (`query()` aus
`@anthropic-ai/claude-agent-sdk`) mit `tools: []` (keine eingebauten Tools),
`settingSources: []` (keine CLAUDE.md/Settings) und einem reinen
**String**-`systemPrompt` (kein `{type:'preset', preset:'claude_code'}`)
umgeht das komplett — gemessen ~230 Input-Tokens/< 1 Cent für eine Freitext-
Antwort. Für strukturierte Ausgaben gibt es nativ `outputFormat:
{type:'json_schema', schema}` → `structured_output`-Feld im `result`, ohne
eigenes Tool-Use-Parsing; `thinking: {type:'disabled'}` vermeidet unnötige
Extended-Thinking-Tokens. End-to-end mit echten Lesify-Calls
(`chatTitelErzeugen`, `chatAntwortErzeugen`) verifiziert: ~0,3–0,5 Cent/Call,
in der von `00-overview.md` §7 erwarteten Größenordnung.

Multi-Turn-Chatverläufe werden dabei nicht als `messages`-Array geschickt
(ein SDK-`query()`-Aufruf ist ein Einzel-Turn), sondern in den System-Prompt
gefaltet, nur die letzte Nachricht geht als `prompt` — für schnelles manuelles
Gegenprüfen ausreichend, keine exakte Parität zum Produktionspfad
(`AnthropicKiClient`, echtes `messages`-Array + Prompt-Caching).

---

## 4. API-Endpunkte

Alle Endpunkte `Authorization: Bearer <token>`, Antworten JSON.

### Umsetzungsstand (Phase 4, 2026-09-04)

Gebaut ist **alles außer den KI-Workflows** (Phase 6), der Datei-Speicherung
(Phase 5) und der berechneten Lernplan-/Notenlogik (Phase 7). Anmerkungen /
Abweichungen von den Tabellen unten:

- **`GET /auth/me`** ist neu (Sitzungs-Check fürs Frontend-Auth-Gate) — siehe §5.
- **`POST /chats`** legt sofort eine Chat-Zeile mit leerem `titel` an; das
  „entsteht erst beim ersten Senden" ist Client-Verhalten (kein Aufruf vor dem
  ersten Send). Titel wird bei der ersten `POST /chats/:id/nachrichten` per
  Client-Kürzung gesetzt (KI-Titel = Prompt 07, Phase 6).
- **`POST /chats/:id/nachrichten`** speichert die User-Nachricht + eine
  deterministische Platzhalter-KI-Antwort (`rolle=ai`, `zaehltGegenLimit=false`),
  prüft **vor** dem Call `pruefeUsageLimit(…, 'nachrichten')` (→ `403
  limit_erreicht` bei erreichtem Kontingent, Phase 8) und erhöht danach
  `Usage.nachrichtenUsed` (Upsert). Bei `lernplanKontext` zusätzlich der
  `chatMap`-Eintrag `"<tag>|<modus>|<themaId>"`.
- **`POST /klausuren`** legt in **einer** Transaktion `Klausur` + `Testklausur 1`
  (mit Platzhalter-`Aufgabe` je Thema) + `Lernplan` an und gibt alle drei zurück.
- **`GET /lernplaene/:id`** (und `GET /klausuren/:id/lernplan`) liefern vorerst
  den **Rohzustand** (`checklist`, `tageErledigt`, `chatMap`, `lernzettel`,
  Testklausur-IDs). Der berechnete Zustand (`lernplanStatus`) kommt in Phase 7.
- **`PATCH /lernplaene/:id/checklist`**: `{tag,key,checked}` pflegt das
  `checklist`-JSON; `{tag,checked}` („Tag abschließen") toggelt bis Phase 7 den
  Legacy-Marker `tageErledigt` (die Key-Liste je Tag braucht `lernplanStatus`).
- **`POST /testklausuren/:id/loesung`** nahm im Phase-4-Skelett nur JSON
  (`{geloesteDateiId}`/`{loesungsText}`) entgegen; seit Phase 5 zusätzlich
  multipart über den echten Objektspeicher (siehe §6/§4-Endpunkttabelle).
- **`POST /kontakt`**: Honeypot-Feld `website` (gefüllt → 200, still verworfen) +
  In-Memory-IP-Limit; Zielsystem (Support-Postfach/Ticket) weiter offen (§8),
  bis dahin nur strukturiertes Logging.
- Alle Ressourcen strikt `userId`-gescoped (Auth-Middleware, §5); fremde/
  unbekannte IDs → `404 nicht_gefunden`. Validierungsfehler → `400 validierung`
  mit `details`.

### Fächer & Themen
| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/faecher` | Liste aller Fächer des Users |
| POST | `/faecher` | `{name, klasse?, farbe?, icon?}` → neues Fach; `farbe` optional (Server vergibt sonst reihum eine aus `FACH_COLORS`), `icon` optional (Schlüssel aus `FACH_PRESETS`/`FACH_ICONS`; weggelassen bei „eigenes Fach" ohne Vorlage → Avatar fällt auf `initial` zurück) |
| PATCH | `/faecher/:id` | `{farbe}` — bislang einziges nachträglich editierbare Feld; Auslöser des Farbwählers: Klick auf das Fach-Logo (Avatar) auf `fach.html` bzw. den Swatch-Button auf `faecher.html`. `icon` wird nur bei Erstellung gesetzt, es gibt aktuell keine UI, ein Icon nachträglich zu ändern |
| GET | `/faecher/:id/themen` | Themen eines Fachs, je Thema mit `anzahlChats`/`anzahlLernzettel`/`anzahlDateien`/`anzahlKlausuren` (2026-09-12, für `fach.html`s Themen-Karten) — Chats/Lernzettel/Dateien per `_count`, Klausuren über den Batch-Helfer `klausurenAnzahlProThema()` (`Klausur.themaIds` ist ein String-Array, keine echte Relation, `_count` geht dafür nicht). **Kein** `anzahlTestklausuren` (bislang von keiner Seite gebraucht) |
| GET | `/themen` | Fächerübergreifende Aggregat-Liste aller Themen (eigene Nav-Seite `themen.html`), je Thema mit denselben vier Zählwerten wie `/faecher/:id/themen` (2026-09-12) |
| POST | `/themen` | `{fachId, name, beschreibung?}` → neues Thema |
| GET | `/themen/:id` | Thema inkl. Stats (Anzahl Chats/Lernzettel/Dateien/Klausuren/Testklausuren) |

### Chats
| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/chats` | Fächerübergreifende Liste aller Chats des Users, neueste zuerst — beliefert den Chat-Verlauf in der linken Spalte von `chat.html` (Claude-artiges Layout: Verlauf links mit „Neuer Chat"-Button, aktiver Chat/leerer Zustand rechts). Optionaler Query-Param `?fachId=` für den Fach-Filter im Verlauf (Prototyp filtert clientseitig; UI: Einfachauswahl „ein Fach oder Alle", Fach-Liste nur aus Fächern mit ≥1 Chat) |
| POST | `/chats` | `{fachId, themaId, modus?}` → neuer Chat, liefert System-Prompt-Kontext-Block. `modus` ist **optional** (Composer-Pills sind nicht mehr pflicht); fehlt er, wird der Chat ohne Modus angelegt (`modus = null`) und der neutrale „freie Frage"-System-Prompt genutzt. Wird im Prototyp erst beim Senden der ersten Nachricht angelegt (nicht schon beim reinen Öffnen von `chat.html`) — gilt jetzt **auch für Lernplan-Deep-Links** (`?fach=…&thema=…&mode=…`): auch die werden erst beim ersten Absenden zum echten Chat, nicht mehr flüchtig gehalten |
| GET | `/chats/:id` | Chat inkl. Nachrichten. Lernplan-Chips können hierher deep-linken (`chat.html?chat=<id>`), wenn `Lernplan.chatMap` den Schritt schon kennt (Fortsetzung statt Neuanlage) |
| POST | `/chats/:id/nachrichten` | `{text, anhangDateiId?, lernplanKontext?: {lernplanId, tag}}` → Vorab-Filter (Themen-/Größen-/Spam-Guard), Usage-Limit-Check, User-Nachricht speichern, echte KI-Antwort (Calls 03–06/frei, **Phase 6 verdrahtet**) + `Chat.titel` (Call 07) generieren, Usage inkrementieren. **Streaming steht noch aus** — die Antwort kommt aktuell komplett fertig zurück, nicht token-weise (§3/Prompt-Dateien empfehlen Streaming fürs Chat-Tempo; Nachholbedarf, kein Blocker). Bei gesetztem `lernplanKontext` zusätzlich `Lernplan.chatMap["<tag>\|<chat.modus>\|<chat.themaId>"] = chat.id` setzen (idempotent) |

### Lernzettel
| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/lernzettel?themaId=` oder ohne Filter | **Neu (Phase 11, 2026-09-12).** Übersichts-Liste ohne Revisionsverlauf — für Feeds/Dashboards (z. B. „Zuletzt bearbeitet"). Fehlte bis dahin (nur Einzel-Fetch über `:id`) |
| POST | `/themen/:id/lernzettel` | Vollautomatische Erstellung (Call 08, **Phase 6 verdrahtet**), liefert fertigen Lernzettel |
| GET | `/lernzettel/:id` | Inhalt + Revisionsverlauf + `freeMessagesUsed` |
| POST | `/lernzettel/:id/revisionen` | `{text}` → KI passt `content` an (Call 09, **Phase 6 verdrahtet**: Vorab-Filter + Such-/Ersetzen-Patches), gibt aktualisierten Lernzettel + Revisionsverlauf zurück |

### Dateien
| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/themen/:id/dateien` | **Phase 5 verdrahtet.** multipart Upload (max. 5 MB, hart via `@fastify/multipart`-Limit + manueller Check), Status `verarbeitung` → async Call 01 (Text-Extraktion oder Vision bei Bildern) → Status `bereit`/`fehler`. Der Client erfährt den Wechsel per **Polling** von `GET /dateien/:id` (kurzer Backoff, Stopp bei `bereit`/`fehler` oder ~60 s Timeout) — kein Websocket/SSE (Entscheidung 2026-09-04) |
| GET | `/dateien?themaId=` oder ohne Filter | Aggregat-Liste, nur `zweck: thema` (Testklausur-Lösungs-Uploads ausgeschlossen) |
| GET | `/dateien/:id` | Datei-Detail (Metadaten + KI-Zusammenfassung + Status) für den **Datei-Viewer**: Klick auf eine Datei-Karte/-Zeile (`dateien.html`, `thema.html` inkl. Übersicht, Dashboard-Feed) öffnet jetzt ein Modal (`LesifyUI.openDateiModal`) mit Dokument-Ansicht statt zur Themen-Dateien-Unterseite zu navigieren. Im Prototyp aus der bereits geladenen Liste bedient |
| GET | `/dateien/:id/inhalt` | **Phase 5 verdrahtet.** 302-Redirect auf eine 60 s gültige signierte URL — zum Einbetten/Anzeigen im Viewer (PDF inline, Bild-Vorschau) **und** für den „Herunterladen"-Button im Viewer-Modal. Läuft **ohne** den normalen `requireAuth`-Hook (eigener Plugin-Scope), weil `dateiInhaltUrl()` direkt als `<a href>`/`<img src>` genutzt wird und keinen `Authorization`-Header mitschicken kann — Auth via Header **oder** `?token=`. Im Prototyp nicht vorhanden — das Modal zeigt eine simulierte Vorschau (Zusammenfassung + Platzhalter) und der Download liefert ersatzweise ein `.txt` mit Metadaten + KI-Zusammenfassung (`Lesify.downloadText`), keinen echten Datei-Inhalt |

### Klausuren (echter Termin)
| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/klausuren` | `{fachId, themaIds, titel, datum}`. **Legt Klausur + Testklausur 1 (Call 10, Phase 6 verdrahtet) + Lernplan an** (kein DB-`$transaction` über den KI-Call hinweg, siehe §3 „Umsetzung Phase 6") (siehe Lernplan-Endpunkte unten) und gibt beide mit zurück. `themaIds` ist ein Array (≥1); die Erstell-Modals wählen mehrere Themen aus (**kein** „×"-Entfernen — Ab-/Anwählen per Klick, Abbruch über den Abbrechen-Button; die Modals haben auch kein „×"-Schließen mehr) und legen neue inline an. `klausuren.html` (`#nk-form`) nutzt ein Pill-Raster mit Dev-Switcher für 5 fach-gefärbte Pill-Styles (`localStorage['lesify:themepick:pill']`: Solid/Soft/Outline/Dot/Bar), `thema.html` (`#mk-form`) eine einfache Dropdown-Variante. Der Client macht vorab N× `POST /themen` und schickt dann alle IDs; ein Batch-`{neueThemen: [{name}]}` im selben Call wäre denkbar, ist aber nicht nötig |
| GET | `/klausuren` / `/klausuren/:id` | Liste / Detail. „Bereits geschrieben" wird client-seitig aus `datum` abgeleitet — kein Server-Filter, kein Statusfeld |

Kein `PATCH /klausuren/:id` — eine `Klausur` hat keine editierbaren Felder (Entscheidung 2026-09-03: die erreichte Note wird nicht erfasst).

### Lernplan (7-Tage-Struktur, 1:1 zur Klausur)
| Methode | Pfad | Zweck |
|---|---|---|
| — | (`POST /klausuren`) | Der Lernplan entsteht **automatisch mit der Klausur** — kein separater Erstell-Aufruf durch den Client. Alternativ als eigener Schritt denkbar: `POST /klausuren/:id/lernplan` |
| GET | `/lernplaene/:id` bzw. `/klausuren/:id/lernplan` | Persistierte Felder + berechneter `status` (aktueller Tag, schwache Themen, Tag-1↔Tag-5-Vergleich, ob Testklausur 2 nötig ist) **+ (2026-09-12) volle `klausur`/`testklausur1`/`testklausur2`-Objekte** in der data.js-Prototyp-Form — `Lesify.lernplanStatus` im Frontend faltet das auf `{lernplan, klausur, testklausur1, testklausur2, tag1..tag7, aktuellerTag, letzteTestNote, letzteTestNr, gesamtnoteAktuell}` zusammen (§9 „api.js-Cache-Layer") |
| POST | `/lernplaene/:id/testklausur2` | Startet Testklausur 2 (Tag 5), begrenzt auf die an Tag 1 schwachen/wackeligen Themen — intern derselbe `testklausurErstellen()` wie `POST /testklausuren` (**Phase 6 verdrahtet**), danach `Lernplan.testklausur2Id` gesetzt. `409`, wenn Tag 5 noch nicht verfügbar/nötig oder schon gestartet |
| POST | `/lernplaene/:id/lernzettel` | `{themaIds}` → erzeugt/ergänzt den Lernzettel (Call 12, **Phase 6 verdrahtet**, hängt Markdown-Abschnitte an), gibt `Lernplan.lernzettel` zurück |
| GET | `/lernplaene/:id/lernzettel/dokument` | Lernzettel als Markdown-Download |
| PATCH | `/lernplaene/:id/checklist` | `{tag, key, checked}` (ein Punkt) bzw. `{tag, checked}` (alle Punkte des Tages = „Tag abschließen") — pflegt `Lernplan.checklist`; Tag-Erledigt-Status ergibt sich daraus. Override-Muster wie `PATCH /faecher/:id` |
| PATCH | `/lernplaene/:id` (bzw. gebündelt in `POST /chats/:id/nachrichten`) | Setzt einen `chatMap`-Eintrag `"<tag>\|<modus>\|<themaId>" → chatId` (Override-Muster). Im Prototyp: `Lesify.setLernplanChatId`. Client liest die Zuordnung aus `GET /lernplaene/:id` und deep-linkt Lernplan-Chips entsprechend frisch oder als Chat-Fortsetzung |

### Testklausuren (KI-Workflow, 2× pro Lernplan)
| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/testklausuren` | `{fachId, themaIds, titel, klausurId?}` → generiert Aufgaben (Call 10, **Phase 6 verdrahtet**, `testklausurErstellen()`), Status `erstellt`. Genutzt für Testklausur 1 (auch via `POST /klausuren`, alle Themen) **und** Testklausur 2 (nur schwache/wackelige Themen). Ein **dritter** Aufruf zur selben `klausurId` → `409 testklausur_limit_erreicht` (max. 2 pro Klausurvorbereitung) |
| GET | `/testklausuren/:id` | Voller Zustand: Aufgaben, Ergebnis (falls vorhanden), Vorbereitungsstand |
| GET | `/testklausuren/:id/dokument` | Aufgaben als Download (Text/PDF) |
| POST | `/testklausuren/:id/loesung` | **Phase 5 verdrahtet.** multipart Upload → `Datei` (`zweck: testklausurLoesung`, zählt nicht gegen das Content-Limit, nicht in der Themenliste) → Text-Extraktion/Vision-Transkription synchron im Request → `loesungsText` gesetzt, Status `geloest`. Der direkte JSON-`{loesungsText}`-Pfad (Phase 6) bleibt als Bridge/Testing-Weg erhalten |
| POST | `/testklausuren/:id/analyse` | Triggert Auswertung (Call 11, **Phase 6 verdrahtet**) → `TestklausurErgebnis` + `Vorbereitungsstand` (dreistufige Ampel) → Status `analysiert`. Braucht `status=geloest` **und** `loesungsText` (sonst `409`/`422`) |

### Usage
| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/usage` | Aktueller Monatsstand für Ring/Popover + Einstellungen-Seite: `{ paket, planName, resetDatum, nachrichten, dateien, lernzettel, testklausuren, ring: { ratio, stufe } }`, jede Quote `{ used, limit, resetDatum }` (Spiegel `Lesify.usage()`). Limits live aus dem aktiven Paket, Reset implizit über den `Usage.monat`-Schlüssel (§7 „Umsetzung Phase 8") |

### Profil & Einstellungen
| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/user` | Aktuelles Profil (Name, Klassenstufe) — füllt Seitenleiste, Dashboard-Begrüßung und Profil-Formular |
| PATCH | `/user` | `{name?, klassenstufe?}` → Profil aktualisieren (beide optional, mind. eines nötig); `klassenstufe` nur bei Kind-Profilen sinnvoll — leerer String schlägt an der Validierung fehl, Eltern-Accounts lassen das Feld weg |
| GET | `/user/einstellungen` | Aktuelle Einstellungen (Benachrichtigungen, KI-Tonfall) |
| PATCH | `/user/einstellungen` | Teilupdate einzelner Einstellungen (jeder Toggle/jede Auswahl speichert für sich, kein Sammel-Formular) |
| GET | `/user/export` | **DSGVO Art. 15** — kompletter JSON-Export aller zum Konto gespeicherten Daten (ohne `passwordHash`), `Content-Disposition: attachment` (Phase 13) |
| POST | `/user/loeschen` | **DSGVO Art. 17** — `{passwort}` bestätigt, dann harte Löschung des Kontos **und aller Inhalte** (Cascade); bei `elternteil` inkl. aller Kind-Profile. Objektspeicher-Dateien werden vor der DB-Löschung eingesammelt und danach best effort aus dem Bucket entfernt (Phase 5, siehe §6) |

### Suche
| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/suche?q=` | Fächerübergreifende Suche über Fächer/Themen/Chats/Lernzettel/Dateien/Klausuren/Testklausuren, gruppiert nach Typ — beliefert sowohl die Schnellsuche im Dashboard als auch `suche.html` |

**Such-Strategie (Entscheidung 2026-09-04):** serverseitiger **Substring-Match**
(`ILIKE '%q%'`) über **Titel-/Namensfelder** (Fach-/Themen-Name, Chat-/Lernzettel-/
Klausur-/Testklausur-Titel, Datei-Name). **Kein Volltext-Index**, kein Suchen in
Lernzettel-Inhalt, Datei-Zusammenfassung oder Nachrichtentext. Bei einigen hundert
Datensätzen pro Nutzer ausreichend; später auf Postgres-Volltext heben, falls
Inhaltssuche gewünscht wird.

Antwortform: `[{ type, label, icon, items: [{ title, sub, href, fachId, fachName }] }]`.
`fachId`/`fachName` pro Treffer sind Pflicht — die Ergebnis-Darstellung färbt jede
Zeile über `--fach-color/-ink/-bg` nach Fach ein (gemeinsames Render-Modul für
Dashboard-Dropdown und `suche.html`, 5 umschaltbare Design-Varianten über den
Dev-Switch, `localStorage['lesify:search:v']` — nur Prototyp).

**`href` relativ (Bugfix 2026-09-12):** war zunächst absolut (`/fach.html?id=…`)
— in Produktion läuft `app/` aber unter `/app/`, das wäre auf die falsche Seite
(Marketing-Root) gesprungen. Jetzt wie jeder andere Link im Prototyp relativ
(`fach.html?id=…`); `chat`/`dateien`-Treffer bekamen zusätzlich dieselben
Query-Parameter, die `chat.html`/`thema.html` aus dem client-seitigen
`searchAll()` (`app.js`) schon kennen (`?fach=&thema=&chat=` bzw.
`thema.html?id=&tab=dateien` statt einer eigenen `dateien.html?datei=`-Route).

### Auth (neu — beliefert `marketing/login.html`, `registrieren.html`, `passwort-vergessen.html`)
| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/auth/registrieren` | `{name, email, passwort, einwilligung: true}` → **Eltern-Konto** anlegen (`rolle` server-seitig fest `elternteil`, `klassenstufe = null` — kein Client-Input mehr seit 2026-09-16), Double-Opt-in-Token erzeugen und per Mail verschicken (Resend, `marketing/email-bestaetigen/`; ohne `RESEND_API_KEY` nur geloggt), **14-Tage-Testphase** starten (`User.trialEndetAm = createdAt + 14 Tage`). `einwilligung` (Zustimmung zu Nutzungsbedingungen/Datenschutz) ist **Pflicht** — fehlt sie → `400`; der Zeitpunkt landet als `User.einwilligungAm`. Tarif-Wahl + Zahlungsart laufen über den Checkout (`POST /abo`); Kind-Profile kommen erst danach über `POST /abo/kinder` |
| POST | `/auth/login` | `{email, passwort, angemeldetBleiben?}` → Session/JWT |
| POST | `/auth/logout` | Session invalidieren |
| POST | `/auth/passwort-vergessen` | `{email}` → Reset-Token, per Mail verschickt (Resend, `marketing/passwort-zuruecksetzen/`; immer 200, keine Konto-Enumeration) |
| POST | `/auth/passwort-zuruecksetzen` | `{token, neuesPasswort}` → Passwort setzen, Token verbrauchen, **alle Sessions löschen** |
| POST | `/auth/email-bestaetigen` | `{token}` → `emailVerifiedAt` setzen (Einmal-Token) |
| GET | `/auth/me` | aktuelle Sitzung → `{user}` (`requireAuth`); für das Frontend-Auth-Gate (Phase 11) |

### Abo & Abrechnung (neu — beliefert den Preis-Abschnitt `index.html#price` und den späteren Einstellungen-Bereich)
| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/abo` | Aktueller `paket`, `art`, `sitze`, `intervall`, `status`, `angebot`, `trialEndetAm`, `aktuellerZeitraumEnde` + abgeleitete Monatskontingente je Sitz |
| POST | `/abo` | `{paket, intervall, sitze?}` → Checkout-Abschluss bei der Registrierung (Tarif + Intervall wählen, Zahlungsart hinterlegen). `paket` ∈ `starter\|premium\|infinite`; `sitze` 1 (Einzel) oder 2–4 (Familie); `intervall` ∈ `monatlich\|jaehrlich`. Legt bei Stripe Customer + Subscription mit **`trial_period_days: 14`** an (`Abo.status = test`), fixiert das aktive `angebot`. Nach 14 Tagen bucht Stripe automatisch ab → `status = aktiv`. **MwSt. nicht ausweisen** (Kleinunternehmer, nicht auf der Website nennen) |
| PATCH | `/abo` | `{paket?, intervall?, sitze?}` → Tarif-/Intervall-/Sitzwechsel (Up-/Downgrade, Proration). Sitzverringerung erst zum `aktuellerZeitraumEnde` |
| POST | `/abo/kuendigen` | Kündigung zum `aktuellerZeitraumEnde`, kein sofortiger Zugriffsverlust |
| POST | `/abo/pausieren` | Sommerpause (Status `pausiert`), Inhalte bleiben erhalten |
| POST | `/abo/reaktivieren` | **Neu (2026-09-13).** Hebt Kündigung/Pause auf → `status = aktiv`; nur von `gekuendigt`/`pausiert` aus, sonst `409 abo_nicht_reaktivierbar`. Stripe: `cancel_at_period_end=false` + `pause_collection=null` |
| POST | `/abo/webhook` | Callback des Zahlungsanbieters (Zahlung erfolgreich/fehlgeschlagen → `status`) |
| GET | `/abo/kinder` · POST · DELETE | Kind-Profile im Familien-Abo verwalten (max. `Abo.sitze`, 2–4). `GET` liefert je Kind zusätzlich `eingeladen: boolean` (2026-09-13, aus `!!email`) |
| POST | `/abo/kinder/:id/einladung` | `{email}` → E-Mail am Kind-Profil setzen + `emailVerifiedAt` (Elternkonto bürgt), Passwort-Token ausgeben; das Kind setzt sein Passwort über `POST /auth/passwort-zuruecksetzen` (Phase 12) |
| POST | `/abo/kinder/:id/sitzung` | Kontext-Wechsel: gibt eine echte `Session` fürs Kind-Profil zurück (`{token, kindId}`); das Elternkonto handelt damit vollständig als Kind, Zurückwechseln = eigenes Token (Phase 12) |
| GET | `/abo/kinder/:id/zusammenfassung` | Aggregierte Wochenkennzahlen (Fächer/Themen/Chats+Nachrichten der Woche/Lernzettel/Testklausuren/anstehende Klausuren) — **kein Chat-Wortlaut** (Phase 12). Liefert zusätzlich `faecherListe` (`{name, farbe, themen}[]`) und `anstehendeKlausurenListe` (`{fach, datum}[]`) für `eltern-kind.html` (2026-09-13) — reine Metadaten, kein neuer Content-Zugriff. |

#### Umsetzungsstand (Phase 9, 2026-09-04; Stripe-Adapter 2026-09-12)

Endpunkt-Schicht + Datenmodell-Logik komplett. Zahlungsanbieter-Adapter
(`api/src/lib/zahlung.ts`, `ZahlungsGateway`-Interface, dekoriert als
`app.zahlung`) — wie bei KI (`FakeKiClient`/`AnthropicKiClient`) und Storage
(`FakeStorageGateway`/`SupabaseStorageGateway`) entscheidet die Präsenz des
echten Keys: **`STRIPE_SECRET_KEY` gesetzt → `StripeZahlungsGateway`, sonst
`FakeZahlungsGateway`** (`getZahlungsGateway()`). In `api/src/routes/abo.test.ts`
wird der Fake über `buildApp({zahlung: new FakeZahlungsGateway()})` **immer**
erzwungen, unabhängig von einem lokal gesetzten Key — sonst würden Tests echte
Stripe-Calls auslösen.

`StripeZahlungsGateway` (real, gegen Stripe Test-Mode verifiziert):
- **Preise ohne Dashboard-Pflege:** `price_data` inline bei
  `subscriptions.create`/`.update` (Betrag aus `aboPreis()`, `@lesify/shared`)
  — kein manuell zu pflegender Preis-Katalog. Nur drei feste Stripe-Produkte
  (`lesify_starter`/`_premium`/`_infinite`, ein Produkt je Paket, keins je
  Sitzzahl/Intervall), die sich beim ersten Gebrauch selbst anlegen
  (`products.retrieve` → 404 → `products.create` mit fester ID).
- **`subscriptionAnlegen`:** Stripe Customer + Subscription
  (`trial_period_days: 14`, `payment_behavior: 'default_incomplete'`,
  `payment_settings.save_default_payment_method: 'on_subscription'`). Liefert
  zusätzlich `clientSecret` — bei Trial ohne Sofortbelastung ein
  **SetupIntent** (`pending_setup_intent`, Präfix `seti_…`), sonst das
  PaymentIntent der ersten Rechnung (`latest_invoice.confirmation_secret`,
  Präfix `pi_…`). `marketing/assets/js/checkout.js` unterscheidet am Präfix,
  ob `stripe.confirmSetup` oder `stripe.confirmPayment` zu rufen ist.
- **`subscriptionAendern`:** `subscriptions.update` mit neuem `price_data` auf
  dem bestehenden Item, `proration_behavior: 'create_prorations'`.
- **`subscriptionKuendigen`:** `cancel_at_period_end: true`.
  **`subscriptionPausieren`:** `pause_collection: {behavior: 'void'}`.
- **Webhook-Signaturprüfung ist jetzt echt** (`stripe.webhooks.constructEvent`)
  — dafür braucht die Route den **rohen** Body-Buffer, nicht den geparsten
  JSON-Body. `app.ts` schneidet ihn in einem eigenen
  `application/json`-Content-Type-Parser mit (`req.rawBody`, `fastify.d.ts`);
  alle anderen Routen sehen weiter ganz normal den geparsten Body. Verarbeitete
  Stripe-Event-Typen: `customer.subscription.created`/`.updated`/`.deleted`,
  `invoice.paid`/`.payment_succeeded`/`.payment_failed` → gemappt auf unseren
  internen `AboStatus` (`trialing→test`, `active→aktiv`, `canceled→gekuendigt`,
  `paused→pausiert`, `past_due`/`unpaid→zahlung_offen`). Das Stripe-
  Webhook-Endpoint sollte in Produktion nur auf genau diese Events abonniert
  werden (`enabled_events` bei der Endpoint-Erstellung), sonst führen
  uninteressante Events zu `400 ereignis_unbekannt`.
- **Lokal getestet** über die Stripe CLI (`stripe listen --forward-to
  localhost:3000/abo/webhook --events …`, `stripe trigger …`) gegen echtes
  Stripe Test-Mode: Anlegen (SetupIntent-Secret kam korrekt zurück), Wechsel,
  Pause, Kündigung, Webhook-Signaturprüfung — alle grün.
- **`marketing/assets/js/checkout.js`:** ruft `POST /abo` auf `LESIFY_API_BASE`
  mit `Authorization: Bearer <lesify:token>` — auf `lesify.de`/`www.lesify.de`
  automatisch gegen die produktive Railway-API, sonst `http://localhost:3000`
  (siehe §0 „API-Hosting"). Ohne Token → Hinweis, sich zuerst zu
  registrieren/anmelden. **Das frühere `mode: 'demo'`-Gate ist entfernt
  (Entscheidung 2026-09-14)** — die Kasse löst überall echte `POST
  /abo`-Aufrufe aus, nicht mehr nur „validiert, kein Abschluss" auf der
  öffentlichen Seite. `stripe-config.js`s `mode`-Feld ist jetzt rein
  informativ (`'test'`/`'live'`, muss zum Präfix von `publishableKey`/
  `STRIPE_SECRET_KEY` passen), steuert nichts mehr im Code.
- **Neu:** `marketing/checkout-erfolg.html` (Erfolgsseite für
  `confirmSetup`/`confirmPayment`-`return_url`, existierte vorher nicht).
- **2026-09-12 (Nachtrag):** `marketing/registrieren.html` und `login.html`
  sind jetzt ebenfalls echt verdrahtet (Registrieren → Auto-Login → `checkout/`,
  siehe §11 „Formulare echt verdrahtet") — die Kasse bekommt ihr Token jetzt
  aus dem echten Flow statt von Hand besorgt. Ohne CORS-Freischaltung
  (ebenfalls 2026-09-12, siehe §11) hätte das nicht funktioniert, da Marketing
  und API auf verschiedenen Origins laufen.
- **2026-09-14:** `api/` läuft jetzt produktiv (siehe §0), das Kasse-Gate von
  oben ist entfernt. **Weiterhin offen:** `STRIPE_SECRET_KEY`/
  `STRIPE_WEBHOOK_SECRET` bei Railway setzen (Stripe Test-Modus zuerst, siehe
  UMSETZUNGSPLAN.md Abschnitt „Geld") — ohne die Variablen läuft serverseitig
  weiterhin der `FakeZahlungsGateway`, die Kasse ruft zwar echt `POST /abo`
  auf, es entsteht aber noch keine echte Stripe-Subscription. Live-Modus,
  Rechnungsstellung / Umgang mit wiederholt fehlgeschlagenen Zahlungen (Retry,
  Mahnlogik) weiterhin offen, als eigener Schritt nach dem Test-Modus.

- **Preise/Regeln als Code:** `shared/src/abo.ts` spiegelt `stripe-config.js`
  (`EINZEL_PREISE`, `FAMILIE_PREISE` in Cent, `ABO_ANGEBOT`, `ABO_TRIAL_TAGE = 14`,
  `FAMILIE_SITZ_OPTIONEN = [2,3,4]`, `aboPreis()`, `aboArtFuerSitze()`).
- **`GET /abo`** → `aboDTO` (`id, paket, planName, art, sitze, intervall,
  angebot, status, trialEndetAm, aktuellerZeitraumEnde, kontingente`); `404
  nicht_gefunden`, wenn der User (noch) kein Abo besitzt.
- **`POST /abo`** `{paket, intervall, sitze?}` (sitze default 1) → `art` aus
  `sitze` abgeleitet, `aboPreis` aufgelöst, `zahlung.subscriptionAnlegen`
  (Trial 14 Tage), `Abo`-Zeile (`status = test`, `trialEndetAm`,
  `aktuellerZeitraumEnde`, `angebot`, `zahlungsanbieterRef = fake_sub_…`),
  `User.aboId` gesetzt + `User.trialEndetAm` genullt. Zweiter Aufruf → `409
  abo_vorhanden`. Antwort **201**.
- **`PATCH /abo`** `{paket?, intervall?, sitze?}` → Paket-/Intervall-/
  Sitz**erhöhung** sofort (Proration beim Anbieter). Sitz**verringerung**
  (Phase 12) wird als `Abo.geplanteSitze` gemerkt (`sitze` bleibt); der Job
  `abo-geplante-aenderungen` senkt `sitze` zum `aktuellerZeitraumEnde`, sobald
  `belegt <= geplanteSitze` (er löscht **keine** Kind-Profile selbst).
- **`POST /abo/kuendigen`** → `status = gekuendigt` (Zugang bis
  `aktuellerZeitraumEnde`), **`POST /abo/pausieren`** → `status = pausiert`.
- **`POST /abo/webhook`** (kein Login): Body `{typ, aboRef}`, Header
  `stripe-signature` (bei gesetztem `STRIPE_WEBHOOK_SECRET` geprüft, sonst
  akzeptiert — echte HMAC-Prüfung Phase 16). `typ` → `status`
  (`zahlung_erfolgreich`/`trial_beendet`/`abo_reaktiviert` → `aktiv`,
  `zahlung_fehlgeschlagen` → `zahlung_offen`, `abo_gekuendigt` → `gekuendigt`,
  `abo_pausiert` → `pausiert`). Idempotent; unbekannte `aboRef` → `200
  {ok, ignoriert}`, unbekannter `typ` → `400 ereignis_unbekannt`.
- **`GET/POST/DELETE /abo/kinder`**: Kind-Profile = `User`-Zeilen mit
  `parentUserId` + `aboId` des Elternkontos, `rolle = schueler`,
  `passwordHash = "kind:kein-login"` (echte Einladung/Passwort-Setzung Phase 12).
  `POST` nur bei `art = familie`, gedeckelt auf `Abo.sitze` (→ `409
  sitze_ausgeschoepft`). `DELETE` löscht die `User`-Zeile → **Cascade entfernt
  alle Inhalte des Sitzes** (Phase-0-Entscheidung).
- **Offen (Phase 9-Rest):** echtes Stripe-Adapter, Rechnungsstellung / Umgang
  mit fehlgeschlagenen Zahlungen (Retry, Mahnlogik, Zugriff bei
  `zahlung_offen`), Stripe-Konto/-Produkte.

### Kontakt (neu — beliefert `marketing/kontakt.html`)
| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/kontakt` | `{name, email, thema, nachricht}` → Ticket/Weiterleitung an Support-Postfach, Spam-Schutz serverseitig, kein Login nötig |

---

## 5. Auth

Die eingeloggte App (`*.html` im Projekt-Root) hat weiterhin keinen Login-Screen.
Die **Marketing-Website** (`marketing/`) enthält jetzt aber `login.html`,
`registrieren.html` und `passwort-vergessen.html` als statische UI-Prototypen
ohne Backend (Formulare zeigen nur einen Toast). Für das echte Backend:
- E-Mail/Passwort als Standard (Formulare in `marketing/` sind darauf ausgelegt),
  plus Double-Opt-in und Passwort-Reset per Token (Endpunkte in §4).
- Öffentliche Registrierung legt **nur** ein Elternkonto an (`rolle` fest
  `elternteil`, siehe §1 `User.rolle`) — die/der Sorgeberechtigte richtet das
  Konto ein und willigt in die Nutzungsbedingungen ein. `rolle = schueler`
  existiert nur für Kind-Profile, die danach im Konto entstehen (§1 „Eltern-
  Kind-Modell", Entscheidung 2026-09-16, korrigiert die frühere Zurückstellung
  vom 2026-09-03).
- **Schul-SSO entfällt** (Entscheidung 2026-09-03) — kein `GET /auth/sso/schule`,
  der Button ist aus `marketing/login.html` entfernt.
- Session/JWT, an jeden Endpunkt gebunden.
- Alle Ressourcen (Fach, Thema, Chat, …) sind strikt userId-gescoped — nie
  fach-/themenübergreifend zwischen Usern sichtbar. Im Familien-Abo hat jedes
  Kind-Profil einen eigenen userId-Scope; das Elternkonto erhält nur aggregierte
  Fortschritts-Zusammenfassungen, keinen Chat-Wortlaut.

### Umsetzung (Phase 3, 2026-09-04)

- **Passwort-Hashing:** argon2id (`@node-rs/argon2`, prebuilt — kein Build-Step),
  Parameter `m=19456, t=2, p=1`. Klartext-Passwort nie gespeichert/geloggt.
- **Sitzungen: opake Bearer-Tokens, DB-gestützt** (Tabelle `Session`, siehe §1)
  — nicht signierte JWTs, damit `logout` (und Passwort-Reset) eine Sitzung
  **wirklich** invalidieren kann. Client schickt `Authorization: Bearer <roh>`;
  Middleware `requireAuth` schlägt `sha256(roh)` in `Session` nach, prüft
  `ablaeuftAm`, setzt `request.userId`. Cookie-Variante später nachrüstbar.
- **Session-Cache (2026-09-16, Performance-Fix):** `requireAuth` hielt jeden
  einzelnen Request mit einem eigenen `prisma.session.findUnique`-Roundtrip
  auf — bei Seiten, die mehrere `Lesify.*()`-Calls parallel absetzen (z. B.
  Dashboard: 7 gleichzeitige Requests), summierte sich das spürbar
  (Supabase in `eu-west-1`, ~150-450 ms je Query von einem entfernten Client
  aus gemessen) und war mitverantwortlich für "Seite lädt verzögert, dann
  erscheint alles auf einmal". Fix: `SessionCache` (`api/src/lib/sessionCache.ts`,
  pro Prozess ein `Map<tokenHash, {userId, ablaeuftAm}>`, TTL 30 s) hält
  bereits validierte Tokens kurz im Speicher — spart bei wiederholten Requests
  mit demselben Token den DB-Lookup. `logout` und
  `passwort-zuruecksetzen` räumen betroffene Einträge sofort weg
  (`sessionCache.invalidate`/`invalidateUser`). **Trade-off:** eine
  widerrufene Session kann in einem Race bis zu 30 s nach dem Widerruf noch
  als gültig gelten, falls sie kurz zuvor anderswo gecached wurde — bewusst
  akzeptiert, bei mehreren API-Instanzen (Redis-Wechsel, siehe Rate-Limiting
  unten) neu bewerten.
- **Endpunkte** (Prefix `/auth`): `POST /registrieren`, `POST /email-bestaetigen`,
  `POST /login`, `POST /logout`, `POST /passwort-vergessen`,
  `POST /passwort-zuruecksetzen`, **`GET /me`** (neu — Sitzungs-Check fürs
  Frontend-Auth-Gate, Phase 11).
- **Registrierung:** legt `User` (+ leeren `Einstellungen`-Satz) an,
  `trialEndetAm = jetzt + 14 Tage`, **kein `Abo`**. Erzeugt `VerificationToken`
  (`email_bestaetigung`, 7 Tage). Doppelte E-Mail → `409 email_vergeben`.
- **E-Mail-Versand (Phase 10, 2026-09-17):** `/registrieren` und
  `/passwort-vergessen` verschicken die Mail über `api/src/lib/mailer.ts`
  (`MailGateway`, Resend-Adapter aktiv sobald `RESEND_API_KEY` gesetzt ist,
  sonst `FakeMailGateway`, der nur loggt — wie beim KI-/Zahlungs-/Storage-
  Adapter). Mail-Fehler lassen die Requests **nicht** scheitern (Konto/Token
  stehen schon in der DB), nur Logging (siehe `docs/RUNBOOK.md`). Zusätzlich
  geben `/registrieren` und `/passwort-vergessen` außerhalb von `production`
  weiterhin den Roh-Token direkt in der Antwort zurück (`emailBestaetigungToken`
  / `resetToken`), damit der Flow auch ohne Mail-Postfach testbar bleibt.
- **`/passwort-vergessen`** antwortet **immer `200`** (keine Konto-Enumeration),
  entwertet vorher offene Reset-Token desselben Users.
- **`/passwort-zuruecksetzen`** setzt das neue Passwort, verbraucht den Token und
  **löscht alle Sessions** des Users (Neu-Anmeldung überall erzwungen).
- **Timing-Angleich beim Login:** bei unbekannter E-Mail wird trotzdem gegen
  einen Dummy-argon2-Hash geprüft, damit „User existiert" nicht an der
  Antwortzeit erkennbar ist. Falsche Anmeldedaten → `401 anmeldedaten_falsch`.
- **Eingabevalidierung:** `zod` pro Endpunkt; Fehler → `400 validierung` mit
  `details` (`z.flattenError`).
- **Rate-Limiting** für `/auth/*` ist noch **nicht** scharf — kommt in Phase 15
  (siehe §7).

## 6. Datei-Speicherung

- Objektspeicher (z. B. S3-kompatibel), nicht in der DB.
- `Datei.speicherPfad` referenziert den Objekt-Key.
- Zugriff nur über zeitlich begrenzte signierte URLs, nie direkte öffentliche Links.
- 5-MB-Limit pro Datei serverseitig hart validiert (nicht nur clientseitig, wie
  aktuell im Prototyp).
- Testklausur-Lösungs-Uploads laufen über denselben Mechanismus,
  landen aber nicht in der normalen „Dateien"-Liste des Themas (separater Zweck).
  Sie zählen **nicht** gegen das Content-Aufnahmen-Limit (Entscheidung 2026-09-03).

### Umsetzung (Phase 5, 2026-09-05)

- **Objektspeicher-Adapter** — `api/src/lib/storage.ts`: `StorageGateway`-
  Interface (`hochladen`/`signierteUrl`/`lesen`/`loeschen`). `SupabaseStorageGateway`
  (`@supabase/supabase-js`, `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`/
  `SUPABASE_STORAGE_BUCKET`, Default-Bucket `lesify-local`) legt den Bucket beim
  ersten Zugriff automatisch an (`createBucket`, `public: false`), falls er noch
  nicht existiert — ersetzt den manuellen Dashboard-Schritt. Ohne die beiden
  Supabase-Variablen läuft `FakeStorageGateway` (In-Memory) — wie
  `FakeKiClient`/`FakeZahlungsGateway`. `lesen()` ist der serverseitige
  Direktzugriff für die Verarbeitungs-Jobs (kein Umweg über eine signierte URL).
- **`POST /themen/:id/dateien`** — multipart (`@fastify/multipart`,
  `limits.fileSize = DATEI_MAX_BYTES`, Default 5 MB). MIME → `typ` (`typAusMime`
  in `api/src/lib/dateiExtraktion.ts`; pdf/docx/png/jpeg/webp — **kein** HEIC,
  von Claudes Vision-API nicht akzeptiert). Größe wird sowohl vom Multipart-Limit
  als auch manuell geprüft (`api/src/lib/upload.ts` → `liesDateiTeil`, übersetzt
  `FST_REQ_FILE_TOO_LARGE` in `413 datei_zu_gross`). `pruefeUsageLimit`/
  `inkrementiereUsage('dateien')` wie die anderen Zähler. Upload → `Datei`-Zeile
  (`status: verarbeitung`, `zweck: thema`, `mime` gespeichert) → Call 01
  **fire-and-forget** (`themenDateiVerarbeiten` in `api/src/lib/dateiVerarbeitung.ts`,
  kein externer Queue-Dienst — „nichts optimieren, bevor es weh tut"): Text
  extrahieren (`pdf-parse` für PDF, `mammoth` für `.docx`; legacy-`.doc` und
  unbekannte Formate → `status: fehler`) bzw. bei Bildern das Bild direkt als
  Vision-Block an Call 01 anhängen (`KiClient.bilder`, neu in `client.ts`) →
  `Datei.status` → `bereit`/`fehler`.
- **`GET /dateien` / `GET /dateien/:id`** — filtert `zweck: thema`, damit
  Testklausur-Lösungs-Dateien nicht in der Themenliste erscheinen.
- **`GET /dateien/:id/inhalt`** — eigener Plugin-Scope **ohne** den
  `requireAuth`-Hook (`dateiInhaltRoutes`): `dateiInhaltUrl()` wird im Frontend
  direkt als `<a href>`/`<img src>` genutzt und kann daher keinen
  `Authorization`-Header mitschicken. Auth läuft wahlweise über den Header
  (fetch) oder `?token=` (direkte Navigation, `api.js` hängt den Token an).
  302-Redirect auf eine 60 s gültige signierte URL, nie ein öffentlicher Link.
- **Testklausur-Lösungs-Upload** — `POST /testklausuren/:id/loesung` erkennt
  jetzt `multipart` (`req.isMultipart()`) zusätzlich zum bisherigen JSON-Bridge-
  Pfad (`loesungsText` direkt, bleibt für Tests/Dev nutzbar). Multipart:
  `Datei`-Zeile mit `zweck: testklausurLoesung` (zählt nicht gegen `dateien`,
  taucht nicht in der Themenliste auf), Extraktion läuft **synchron** im Request
  (kurze Solo-Datei, kein Hintergrund-Job nötig): pdf/docx wie oben, Bilder über
  eine eigene Vision-Transkription (`loesungTextAusBildErzeugen` in `calls.ts`,
  gibt den wörtlichen Text zurück statt einer Zusammenfassung) — setzt
  `Testklausur.loesungsText` automatisch, ersetzt die bisherige reine
  JSON-Bridge für den Upload-Fall.
- **Neues Feld `Datei.mime`** (Migration `datei_mime`) — Original-MIME wird
  gebraucht, um bei der Verarbeitung zwischen `.docx`/Legacy-`.doc` bzw. dem
  konkreten Bild-Subtyp (Vision-`media_type`) zu unterscheiden; reiner
  `DateiTyp`-Enum (`pdf`/`doc`/`img`) reicht dafür nicht.
- **Neues Feld `Datei.zweck`** (Enum `DateiZweck`: `thema`/`testklausurLoesung`,
  Migration `phase5_datei_speicherung`) — expliziter Ersatz für eine
  Relations-basierte Unterscheidung.

### Datenaufbewahrung (Entscheidung 2026-09-03)

**Alle Inhalte** — Dateien (inkl. Objektspeicher-Objekt), Klausuren, Chats +
Nachrichten, Lernzettel, Testklausuren, Lernpläne — werden **automatisch ein Jahr
nach ihrer Erstellung gelöscht** (Cron-Job). Die Frist steht in der
Datenschutzerklärung **und** sichtbar in den Einstellungen. Ersetzt die frühere
offene „Archivierungs"-Frage.

**Umsetzung (Phase 10, 2026-09-04; Objektspeicher-Teil Phase 5, 2026-09-05):**
Job `inhalte-aufbewahrung` in `api/src/lib/jobs.ts`
(`inhalteAelterAlsEinJahrLoeschen`) sammelt zuerst die `speicherPfad`-Keys aller
betroffenen Dateien ein, löscht dann in einer Transaktion Lernpläne →
Testklausuren → Klausuren → Chats → Lernzettel → Dateien mit
`erstelltAm < jetzt − 365 Tage` (Kind-Tabellen wie Nachricht/Revision/Aufgabe/
Ergebnis/Vorbereitungsstand gehen per Cascade mit) und räumt **danach** den
Objektspeicher auf (`storage.loeschen(keys)`, außerhalb der DB-Transaktion,
best effort — ein einzelner fehlgeschlagener Objekt-Löschversuch bricht den Job
nicht ab, wird nur geloggt). Dieselbe Reihenfolge (erst Keys einsammeln, dann
DB löschen, dann Objektspeicher aufräumen) nutzt auch
`POST /user/loeschen` (DSGVO-Konto-Löschung, §8/Phase 13). Aufruf über
`pnpm --filter @lesify/api job inhalte-aufbewahrung`; Einhängen in einen echten
Scheduler = Phase 16. Weitere Jobs: `usage-historie` (Usage-Zeilen > 12 Monate),
`token-hygiene` (abgelaufene Sessions/Verification-Token).

## 7. Usage-Tracking & Limits

- Monatlicher Reset **fix zum Monatsersten** (Entscheidung 2026-09-03; Cron oder
  lazy bei erstem Request nach Monatswechsel). **Kein Übertrag** ungenutzter
  Kontingente in den Folgemonat.
- Vier Zähler pro Sitz: Nachrichten, Content-Aufnahmen, Lernzettel,
  Testklausuren. Limits am `Abo.paket` (Tabelle in §1 „Usage / Limits"):
  Starter 100 / 20 / 5 / 1, Premium 250 / 50 / 15 / 5, Infinite
  ∞ / 100 / 50 / 15. Bei Familien-Paketen gilt der Tarifwert **pro Kind**
  (kein geteiltes Pool-Kontingent). Maßgeblich: `stripe-config.js` → `limits`,
  gespiegelt in `data.js` → `Lesify.PLAN_LIMITS`. Weiterhin
  **Design-Platzhalter** (siehe §8). Der frühere Platzhalter aus
  `Ki Chat.pdf` (100/200) und die Plus/Familie-Werte (300/40) sind überholt.
- In der **14-tägigen** Testphase (`User.trialEndetAm`) gelten die
  Premium-Kontingente. Nach 14 Tagen bucht Stripe automatisch den gewählten
  Tarif ab (`Abo.status → aktiv`); nur bei vorheriger Kündigung endet der Zugang
  und Schreib-Aktionen sind gesperrt.
- Paketgrenzen serverseitig hart durchsetzen; beim Wechsel auf einen größeren
  Tarif gelten die neuen Grenzen sofort, die verbrauchten Zähler bleiben stehen.
- Warnschwellen für den Ampel-Ring (Donut mit runden Enden, keine %-Zahl):
  grün 0–33 %, gelb 33–66 %, rot ≥ 66 % (im Frontend bereits so
  implementiert — `uwRatioCls` in `chat.html`, gespiegelt in
  `einstellungen.html` und `usageRatioClass` in `app.js`). Der Ring zeigt das
  Maximum aller vier Quoten; ein `null`-Limit (unbegrenzte Nachrichten bei
  `infinite`) zählt als 0.
- **Bei 100 %: Hard-Stop nur des betroffenen Features** (Entscheidung 2026-09-03).
  Ist z. B. das Content-Aufnahmen-Limit erreicht, sind nur Uploads gesperrt —
  Chat und (Test-)Klausuren laufen normal weiter. Kein Soft-Warning, keine
  erzwungene Upgrade-Aufforderung, kein Nachkauf. Pro Zähler eine eigene, klare
  API-Fehlerantwort.

### Umsetzung (Phase 8, 2026-09-04)

- **`@lesify/shared`** (`shared/src/index.ts`): `PLAN_LIMITS` / `PLAN_NAMES`
  (Spiegel `stripe-config.js` → `limits`), `USAGE_ZAEHLER`
  (`nachrichten|dateien|lernzettel|testklausuren`), `usageRatio(used, limit)`
  (null-Limit → 0, geklemmt auf [0,1]), `usageStufe(ratio)` (grün < 0.33,
  gelb < 0.66, rot ≥ 0.66 — bit-genau wie `usageRatioClass` in `app.js`),
  `GRATIS_REVISIONEN_PRO_LERNZETTEL = 10` + `revisionZaehltGegenLimit(freeMessagesUsed)`.
- **`api/src/lib/usage.ts`**:
  - `usageStand(prisma, userId)` — einzige Quelle für `GET /usage` **und** die
    Durchsetzung. Limits kommen **live** aus `paketFuerUser` (Abo → sonst
    Premium im Trial → sonst Starter); bei Upgrade gelten die neuen Grenzen
    sofort, verbrauchte Zähler bleiben stehen. Liefert zusätzlich `ringRatio`
    (Max der vier Quoten) + `stufe`.
  - `pruefeUsageLimit(prisma, userId, art)` — wirft `403 limit_erreicht` mit
    `details: { zaehler, used, limit, resetDatum }`, wenn der Zähler sein
    Paketlimit erreicht hat. **Vor** der teuren Aktion aufrufen.
  - `inkrementiereUsage(prisma, userId, art, betrag?)` — Upsert des
    Monats-Zählers; setzt die Limit-Spalten der Zeile als Momentaufnahme auf
    das aktuelle Paket (maßgeblich bleiben die Live-Limits).
- **Monats-Reset = implizit**: `Usage` ist über `@@unique([userId, monat])`
  (`monat` = `YYYY-MM`) gekeyt. Neuer Monat → neuer Schlüssel → `findUnique`
  liefert `null` → Zähler 0, kein Übertrag. Kein Cron nötig; alte Zeilen räumt
  die 1-Jahres-Löschung (Phase 13) mit ab.
- **Durchgesetzt** — alle vier Zähler nach demselben Vor-Prüfen/Nach-Zählen-
  Muster: `nachrichten` in `POST /chats/:id/nachrichten`, `dateien` in
  `POST /themen/:id/dateien` (Phase 5), `lernzettel`/`testklausuren` an den
  jeweiligen KI-Endpunkten (Phase 6). Lernzettel-Revisionen zählen erst ab der
  11. je Lernzettel (`revisionZaehltGegenLimit`). Testklausur-Lösungs-Uploads
  zählen **nicht** (`zweck: testklausurLoesung`).
- **`GET /usage`** liefert `{ paket, planName, resetDatum, nachrichten, dateien,
  lernzettel, testklausuren, ring: { ratio, stufe } }`; jede Quote ist
  `{ used, limit, resetDatum }` (Spiegel `Lesify.usage()`).
- **Offen (Phase 9):** Zugang nach Trial-Ende ohne Abo bzw. nach Kündigung —
  aktuell fällt `paketFuerUser` nach Trial-Ende ohne Abo auf `starter` zurück;
  das echte „Schreib-Aktionen gesperrt" braucht den Abo-/Kündigungs-Status.

### Rate-Limiting & Missbrauchsschutz (Entscheidung 2026-09-04)

Getrennt vom bezahlten Nutzungs-Limit. Schützt gegen Scripting, Spam und
Ressourcen-Missbrauch. Alle Abweisungen liefern eine klare API-Fehlerantwort,
die das Frontend als **Popup/Toast** zeigt.

**1. Request-Rate (Startwerte, nach echtem Traffic kalibrieren):**

| Endpunkt-Klasse | Limit | Schlüssel |
|---|---|---|
| Auth (`/auth/login`, `/auth/registrieren`, `/auth/passwort-*`) | ~5–10 / min | IP (+ E-Mail bei Login) |
| Teure KI-Calls (`POST /chats/:id/nachrichten`, `POST /testklausuren*`, `POST /lernzettel/:id/revisionen`, `POST /themen/:id/lernzettel`, `POST /themen/:id/dateien`) | ~10–20 / min | User |
| Lese-Endpunkte | ~100 / min | User (bzw. IP) |
| `POST /kontakt` | ~3 / min, ~10 / Tag | IP (+ Honeypot-Feld, kein Captcha) |

Überschreitung → **HTTP 429** mit `Retry-After`, kein harter Bann.
Auth-Fehlversuche → Drosselung + exponentieller Backoff pro IP/Konto; **kein**
harter Account-Lockout (Default, änderbar — siehe §8 „Weiterhin offen").

**2. Vorab-Filter vor jedem KI-Call** (kein Usage-Verbrauch bei Abweisung,
jeweils Popup-Meldung):

- **Themen-Guard:** nicht schulrelevante Anfrage → abgewiesen (siehe §3).
- **Größen-Guard:** Anfrage bzw. zusammengebauter Kontext über einer festen
  Token-/Zeichen-Grenze → abgewiesen mit Hinweis, die Frage/den Kontext zu
  kürzen. Wird **nicht** an die KI geschickt.
- **Spam-Guard:** identische/near-identische Nachricht in kurzer Folge,
  offensichtliches Flooding → abgewiesen/gedrosselt.

**3. Missbrauchs-Signale (Logging + temporäre Sperre):** wiederholte
Themen-Guard-Treffer, viele fehlgeschlagene Logins, Upload-Flooding. —
**Umgesetzt für Guard-Treffer** (2026-09-16, siehe „Umsetzung" unten);
fehlgeschlagene Logins/Upload-Flooding weiterhin offen (§8).

### Umsetzung (Phase 15, 2026-09-04)

- **Request-Rate:** `api/src/lib/ratelimit.ts` — `RateLimiter` (In-Memory
  Fixed-Window) als globaler `onRequest`-Hook (`buildApp({ rateLimit })`, im Test
  aus). `regelFuer(method, pfad)` klassifiziert: **auth** 10/min·IP
  (`/auth/login|registrieren|passwort-*`), **ki** 20/min
  (`POST /chats/:id/nachrichten`, `/testklausuren*`, `/lernzettel/:id/revisionen`,
  `/themen/:id/{lernzettel,dateien}`, `/lernplaene/:id/{testklausur2,lernzettel}`),
  **kontakt** 3/min·IP, **io** 120/min alles andere; `/health*` + `/abo/webhook`
  ausgenommen. Überschreitung → `429 rate_limit` + `Retry-After`. Schlüssel
  aktuell IP (Hook läuft vor `requireAuth`) — User-Keying/Redis später. Das
  frühere Ad-hoc-IP-Limit in `POST /kontakt` ist entfernt.
- **Logging:** pino-JSON mit `redact` (`authorization`/`cookie`/
  `stripe-signature` entfernt); Bodys werden nicht geloggt.
- **Healthchecks:** `GET /health/live` (ohne DB), `GET /health` + `/health/ready`
  (inkl. `SELECT 1`, `uptimeSek`, `zeit`).
- **KI-Vorab-Filter** (Themen-/Größen-/Spam-Guard): `api/src/lib/ki/guard.ts`
  (Phase 6), vor `POST /chats/:id/nachrichten` und
  `POST /lernzettel/:id/revisionen`. Tests: `api/src/routes/ki.test.ts`.
- **KI-Kosten-Dashboard** (2026-09-16): `api/src/lib/ki/kosten.ts` —
  `response.usage` je Call in Euro-Millionstel umgerechnet (Anthropic-
  Listenpreise, Stand 2026-09, vor echten Ausgaben gegenprüfen) und in
  `KiKosten` je Monat/Call-Typ/Modell aggregiert (`onUsage` in
  `AnthropicKiClient`, fire-and-forget). Wartungs-Job `ki-kosten-alarm`
  vergleicht die Monatssumme gegen das aus `PLAN_ECONOMICS` (§7 oben,
  Backend-Spiegel in `shared/src/index.ts`) abgeleitete Budget und loggt
  einen Alarm bei > 1,5× Überschreitung. Tests: `api/src/lib/ki/kosten.test.ts`.
- **Missbrauchs-Signale** (2026-09-16): `MissbrauchsWaechter` in
  `api/src/lib/ki/guard.ts` — jeder Guard-Treffer (Größe/Themen/Spam) eines
  Nutzers wird strukturiert geloggt (`missbrauchssignal`); häufen sich die
  Treffer eines Nutzers (≥ 5 in 1 Stunde), greift zusätzlich eine 30-minütige
  temporäre Sperre der KI-Funktionen für genau diesen Nutzer
  (`429 missbrauch_gesperrt`, unabhängig vom IP-basierten Rate-Limiting) —
  geloggt als `missbrauchVerdacht`. In `pruefeKiEingabe()` gebündelt, also vor
  jedem KI-Vorab-Filter-Aufruf aktiv. Fehlgeschlagene Logins/Upload-Flooding
  bleiben offen (§8). Tests: `api/src/lib/ki/guard.test.ts`.
- **Offen (Phase 16):** Error-Tracker-DSN, Log-Sink, Backup-Restore-Test,
  Scheduler-Anbindung für alle fünf Wartungs-Jobs. Runbook: `docs/RUNBOOK.md`.

---

## 8. Offene Entscheidungen / TODOs

### Entschieden am 2026-09-03

- [x] **Limit-Werte**: bestätigt — Starter 20/100/5/1, Premium 50/250/15/5, Infinite 100/∞/50/15 (Content-Aufnahmen / Nachrichten / Lernzettel / Testklausuren je Sitz/Monat) aus `stripe-config.js` sind korrekt.
- [x] **Preise & Intervalle**: monatlich **und** jährlich. **MwSt. wird nicht ausgewiesen** (Kleinunternehmerregelung — interner Vermerk, **nicht auf der Website erwähnen**). _Weiterhin offen:_ Angebotsdauer/-verlängerung, Jahrespreis-Rundung, ob der Angebotspreis dauerhaft an den Vertrag gebunden bleibt.
- [x] **Verhalten bei erreichtem Limit**: **Hard-Stop nur des betroffenen Features** (Datei-Limit erreicht ⇒ Uploads gesperrt, Chat/Klausuren laufen weiter). Kein Soft-Warning, keine Upgrade-Erzwingung, kein Nachkauf.
- [x] **Trial-Ende**: **14 Tage** (statt 7). Danach bucht Stripe **automatisch** den gewählten Tarif ab, außer es wurde vorher gekündigt (dann Schreibsperre). Keine eigenen Reminder-Mails.
- [x] **Zahlungsanbieter**: **Stripe.** Webhook-Verarbeitung, Belege und `Abo.status = zahlung_offen` laufen darüber.
- [x] **Auth-Methode / Schul-SSO**: E-Mail/Passwort. **Schul-SSO entfällt** (Endpunkt + Button streichen). Eltern-Kind-Verknüpfung: **später** geklärt.
- [x] **`Thema.mastery`**: **entfällt ersatzlos** (war nie real hergeleitet) — aus `data.js`, `app.js`, `testklausur.html`, Datenmodell §1.
- [x] **Testklausur-Uploads vs. Datei-Limit**: **ausgenommen** (wie im Prototyp).
- [x] **Reset-Datum**: **fix zum Monatsersten.**
- [x] **Erreichte Klausurnote nachtragen**: **wird nicht umgesetzt.** `Klausur.note` entfällt — Lesify erfasst das Endergebnis bewusst nicht. „Geschrieben"-Karte zeigt nur einen neutralen Chip.
- [x] **Archivierung / Aufbewahrung**: **alle Inhalte werden nach 1 Jahr automatisch gelöscht** (Cron); Hinweis in Datenschutz **und** Einstellungen (siehe §6 „Datenaufbewahrung"). Ersetzt die Archivierungs-Frage.
- [x] **Familien-Sitz entfernen**: **Inhalte des Sitzes werden gelöscht.** Restliche Sitz-/Proration-/Einladungsmechanik: später.
- [x] **Benachrichtigungs-Versand**: Wichtige Mails (Zahlung/Abo/Beleg) über Stripe. `erinnerungVorKlausuren` / `woechentlicheZusammenfassung` bleiben als wirkungslose Toggles, eigener Versand dafür zurückgestellt. (Double-Opt-in/Reset-Mails laufen seit 2026-09-17 über Resend, siehe §8 „Entschieden am 2026-09-17".)
- [x] **KI-Missbrauchsschutz**: die KI ist **auf schulrelevante Themen begrenzt**, alles andere wird direkt abgeblockt (Themen-Guard vor jedem Chat-/Generierungs-Call, siehe §3).
- [x] **Testklausuren pro Klausur**: **genau zwei** pro Klausur, gebündelt durch den `Lernplan` (Testklausur 1 Tag 1 alle Themen, Testklausur 2 Tag 5 nur schwache/wackelige). Angezeigt wird die Note der zuletzt _analysierten_ (`Lesify.klausurNote`), keine gemittelte „Vorbereitungsnote". **(2026-09-04)** Das Backend verhindert eine **dritte** Testklausur zur selben `klausurId` **hart** — es gibt pro Klausurvorbereitung genau diese zwei.
- [x] **Chat-Kontinuität im Lernplan**: **ein Chat pro `(Lerntag, Modus, Thema)`** in `Lernplan.chatMap`. Kein Chat über mehrere Tage.

### Entschieden am 2026-09-04

- [x] **Chat-Titel-Generierung**: **kurzer KI-Call** nach der ersten Nutzer-Nachricht (Prompt-Entwurf `prompts/07-chat-titel.md`, günstigste/schnellste Modellklasse, angehängt an den ersten `POST /chats/:id/nachrichten`). Die Client-seitige ~48-Zeichen-Kürzung ist nur Prototyp-Ersatz.
- [x] **Manueller Lernplan-Neustart**: **entfällt.** Pro Klausur gibt es genau einen 7-Tage-Lernplan (bei Klausur-Erstellung angelegt); kein „nochmal von vorn". Damit auch keine Frage nach Umgang mit alten `chatMap`-Chats.
- [x] **Design-Exploration `landing-lab`**: **entfernt** — `landing-lab.html` + `marketing/assets/js/landing-lab.js` gelöscht, `landing-lab.css` bleibt als Landing-Stylesheet (siehe §11). Die öffentliche Website wird erst später überarbeitet.
- [x] **Prototyp-Flow-Durchlauf**: alle Nutzer-Flows im Prototyp wurden manuell durchgeklickt, gefundene Bugs sind gefixt.
- [x] **`Lernplan.chatMap` — Speicherung**: **eigenes DB-Feld am `Lernplan`** (JSON, Override-Muster wie im Prototyp) — nicht serverseitig aus Nachrichten-Metadaten rekonstruiert. Ein Lesezugriff, exakt heutiges Verhalten.
- [x] **Datei-Verarbeitung async**: **Client-Polling** von `GET /dateien/:id` (kurzer Backoff, Stopp bei `bereit`/`fehler` oder ~60 s Timeout). Kein Websocket/SSE.
- [x] **Such-Strategie**: **DB-Substring** (`ILIKE '%q%'`) serverseitig über **Titel-/Namensfelder** — findet Fach/Thema/Chat-Titel/Klausur/Datei-Name nach ungefährem Namen. **Kein Volltext-Index**, kein Suchen in Lernzettel-Inhalt / Datei-Zusammenfassung / Nachrichtentext. (Später auf Postgres-Volltext heben, falls Inhaltssuche gewünscht wird.)
- [x] **Backend-Stack**: TypeScript-Monorepo (`pnpm`-Workspaces), PostgreSQL + Objektspeicher über **Supabase (EU-Region)**, Auth selbst gebaut (nicht Supabase Auth), Stripe für Zahlungen, E-Mail zurückgestellt. Details + Ordnerstruktur siehe **§0 „Stack"**. Umsetzungs-Ebene (Fastify/Prisma/Vitest/GitHub Actions) als revidierbarer Vorschlag festgehalten.
- [x] **Rate-Limiting & Missbrauchsschutz**: Es gibt Rate-Limiting (getrennt vom Nutzungs-Limit). KI-Anfragen, die nicht schulrelevant sind, **Spam** oder **übergroß** (Kontext/Token über einer Grenze), werden **vor** dem KI-Call abgewiesen — kein Usage-Verbrauch, dafür eine **Popup-/Toast-Meldung** an die/den Schüler:in. Details siehe **§7 → „Rate-Limiting & Missbrauchsschutz"**.

### Entschieden am 2026-09-08

- [x] **Eltern-Kind-Modell**: **getrennte, verknüpfte Accounts.** Das Elternkonto (`User.rolle = elternteil`) besitzt das `Abo` (`ownerUserId`) und verwaltet 1–4 Kind-Profile — eigene `User`-Zeilen mit `rolle = schueler`, `parentUserId` = Elternkonto, gemeinsames `aboId`. Kein „ein Account mit Unterprofilen". Die Endpunkte (`/abo/kinder`, `.../einladung`, `.../sitzung`, `.../zusammenfassung`) waren bereits so gebaut (Phase 12). Prototyp-Umsetzung: `app/eltern.html` + Familien-Modell in `data.js` (`Lesify.familie/kinder/kindZusammenfassung/wechsleZuKind/…`), Plan `Konzept-texts/eltern-zugang-plan.md`.
      **Korrektur 2026-09-16 (Entscheidung, siehe UMSETZUNGSPLAN.md „Eltern-only
      Signup"):** die frühere Ausnahme „Solo-Elternteil (`Abo.art = einzel`) hat
      kein Kind-Profil — der Account *ist* selbst der Lern-Account" ist
      **gestrichen**. Auch bei 1 Sitz legt der Elternteil danach ein eigenes
      Kind-Profil an (`POST /abo/kinder`) — die öffentliche Registrierung
      erstellt nie direkt einen Lernaccount. `app/assets/js/auth-gate.js`s
      Weiche wurde entsprechend angepasst: **jedes** `rolle = elternteil`-Konto
      landet immer im Eltern-Bereich (ohne Kind-Profil → `eltern-kinder.html`
      zum Anlegen, sonst `eltern.html`), nie auf `dashboard.html`.
- [x] **Familien-Abo-Sichtbarkeit**: Der Eltern-Bereich zeigt je Kind **nur aggregierte Wochenkennzahlen** aus `GET /abo/kinder/:id/zusammenfassung` (Fächer, Themen, Chats/Nachrichten der Woche, Lernzettel gesamt, Testklausuren der Woche, anstehende Klausuren) plus eine daraus abgeleitete Aktivitäts-Ampel. **Kein** Chat-Wortlaut, **keine** Lernzettel-Inhalte, **keine** Noten. Frequenz vorerst rein in-app (Pull beim Öffnen); E-Mail-Digest hängt am projektweit zurückgestellten E-Mail-Versand. Dediziertes Kind-Opt-out bleibt Nach-Launch-Thema (Phase 17). **2026-09-12:** Eltern-Bereich auf vier Seiten aufgeteilt (`app/eltern.html`, `eltern-kinder.html`, `eltern-kind.html?id=…`, `eltern-abo.html`, `eltern-datenschutz.html`, siehe `app/README.md`); die neue Einzelansicht je Kind zeigt zusätzlich Fach- und Klausur-*Metadaten* (Name/Datum + Anzahl, siehe Endpunkt-Zeile oben) — weiterhin ohne Inhalte oder Ergebnisse.
- [x] **Kontext-Wechsel „Als Kind ansehen"**: Elternkonto kann per `POST /abo/kinder/:id/sitzung` eine eigene Kind-Session ziehen und voll im `userId`-Scope des Kindes arbeiten; Rückweg = eigenes Eltern-Token. UI: dauerhaftes „Elternmodus"-Banner auf allen Schüler-Seiten (`app.js` → `renderElternBanner`), `localStorage`-Flag statt Token im Prototyp.

### Entschieden am 2026-09-14

- [x] **Preistabelle final**: komplette Tabelle (Einzel + Familie × 2/3/4
  Sitze, monatlich/jährlich, normal/Angebot) von dir geliefert und in
  `shared/src/abo.ts` (maßgeblich für die tatsächliche Abrechnung),
  `marketing/assets/js/stripe-config.js` (Kasse) und
  `marketing/assets/js/marketing.js` (Preis-Seite, vorher nur eine
  `seatFactor`-Näherung für Familienpreise) synchronisiert. Dabei mehrere
  vorbestehende Inkonsistenzen zwischen den drei Preisquellen korrigiert
  (echte Bugs, siehe `UMSETZUNGSPLAN.md` Abschnitt „Geld"). Die Beträge sind
  damit **kein Design-Platzhalter mehr**.

### Entschieden am 2026-09-17

- [x] **E-Mail-Anbieter: Resend.** Double-Opt-in-/Passwort-Reset-Mails laufen
      jetzt über `api/src/lib/mailer.ts` (`ResendMailGateway`, aktiv sobald
      `RESEND_API_KEY` gesetzt ist; ohne Key `FakeMailGateway`, nur Logging —
      wie beim KI-/Zahlungs-/Storage-Adapter). Neue Frontend-Seite
      `marketing/email-bestaetigen/` (gab es vorher nicht — der Bestätigungs-
      Link hatte kein Ziel). Zahlungs-/Abo-/Beleg-Mails bleiben bei Stripe.
      Klausur-Erinnerung + Wochenreport (Toggles in `einstellungen.html`)
      bleiben bewusst zurückgestellt — dafür wird kein Versand ausgelöst.

### Weiterhin offen

- [ ] **Preis-Feinheiten**: Angebotsdauer/-verlängerung, Jahrespreis-Rundung, Bindung des Angebotspreises an den Vertrag — reine Geschäftsentscheidungen, unabhängig von der jetzt finalen Preistabelle.
- [x] **Stripe-Adapter (2026-09-12):** `StripeZahlungsGateway` (Trial/Wechsel/
      Kündigung/Pause/Webhook-HMAC-Prüfung), aktiv sobald `STRIPE_SECRET_KEY`
      gesetzt ist — siehe „Umsetzungsstand" oben.
- [ ] **Abrechnung produktiv (Phase 16, Rest):** `api/` öffentlich hosten
      (Stripe-Webhook-Endpoint braucht eine erreichbare HTTPS-URL) inkl.
      `CORS_ORIGINS` auf die echte Domain setzen (siehe §11), Live-Mode-Keys,
      Rechnungsstellung, Retry-/Mahnlogik bei `zahlung_offen`. Registrierungs-/
      Login-Anbindung der Marketing-Seite ist seit 2026-09-12 erledigt (§11).
- [ ] **Eltern-/Minderjährigen-Einwilligung**: Ablauf/Erneuerung der Einwilligung bei der Schüler:in-Rolle (das Eltern-Kind-Modell selbst ist entschieden, siehe oben).
- [ ] **Familien-Paket-Mechanik (produktiv)**: Sitz nachträglich hinzufügen/entfernen mit echter Proration/Downgrade zum Zeitraumende. Backend-Grundlage (`PATCH /abo` + `geplanteSitze` + Job `abo-geplante-aenderungen`) steht; offen ist nur das echte Stripe-Adapter.
- [ ] **Kontaktformular** (`marketing/kontakt.html`): Zielsystem (Support-Postfach/Ticketsystem). Spam-Schutz = IP-Rate-Limit + Honeypot-Feld (kein Captcha), Feinheiten offen.
- [ ] **Klausur-Erinnerung + Wöchentliche Zusammenfassung**: Toggles in `einstellungen.html` bleiben wirkungslos — eigener Mail-Versand dafür ist bewusst zurückgestellt (siehe „Entschieden am 2026-09-17").
- [ ] **Auth-Fehlversuche**: temporärer Account-Lockout nach X Fehlversuchen vs. nur IP-Drosselung (Default aktuell: Drosselung + exponentieller Backoff, kein harter Lockout).

---

## 9. Mapping Frontend-Dummy → Backend

`app/assets/js/data.js` hält aktuell alles in einem `SEED`-Objekt plus
`localStorage`-Overlay (`lesify_db_v2`). Die dortigen Funktionsnamen sind
bewusst so gewählt, dass sie 1:1 zu den Endpunkten oben passen
(`Lesify.addTestklausur` → `POST /testklausuren`,
`Lesify.analysiereTestklausur` → `POST /testklausuren/:id/analyse`,
`Lesify.starteLernplan(klausurId)` → Teil von `POST /klausuren` (legt Lernplan +
Testklausur 1 an),
`Lesify.lernplanStatus(id)` → `GET /lernplaene/:id`,
`Lesify.starteTestklausur2(id)` → `POST /lernplaene/:id/testklausur2`,
`Lesify.aktualisiereLernzettel(id, themaIds)` → `POST /lernplaene/:id/lernzettel`,
`Lesify.setLernplanCheck(id, tag, key, checked)` / `Lesify.setLernplanTagChecks(id, tag, checked)` → `PATCH /lernplaene/:id/checklist`,
`Lesify.getLernplanChatId(id, tag, modus, themaId)` → aus `GET /lernplaene/:id` (`chatMap`) gelesen,
`Lesify.setLernplanChatId(id, tag, modus, themaId, chatId)` → `PATCH /lernplaene/:id` bzw. Teil von `POST /chats/:id/nachrichten` mit `lernplanKontext`,
`Lesify.appendChatMessages(chatId, msgs)` → `POST /chats/:id/nachrichten` (persistiert jede User-/KI-Nachricht),
`Lesify.lernplanNaechsteAufgabe(id)` / `R.lernplanTagMeta(n)` (in `app.js`, abgeleitet aus `lernplanStatus` bzw. `LP_TAGE`) → clientseitig, kein eigener Endpunkt,
`Lesify.lernzettelDokument(lp)` → `GET /lernplaene/:id/lernzettel/dokument`,
`Lesify.getUser`/`updateUser` → `GET`/`PATCH /user`,
`Lesify.getSettings`/`updateSettings` → `GET`/`PATCH /user/einstellungen`,
`Lesify.kinder`/`addKind`/`removeKind` → `GET`/`POST`/`DELETE /abo/kinder`,
`Lesify.kindEinladung(id, email)` → `POST /abo/kinder/:id/einladung`,
`Lesify.kindZusammenfassung(id)` → `GET /abo/kinder/:id/zusammenfassung`,
`Lesify.wechsleZuKind(id)` → `POST /abo/kinder/:id/sitzung` (+ Token-Parken client-seitig),
`Lesify.getRolle`/`istElternteil` → aus `GET /auth/me` (`user.rolle`) + `GET /abo/kinder` (Familien-Abo ja/nein),
`Lesify.setFamilieSitze`/`setAboStatus` → `PATCH /abo` bzw. `POST /abo/kuendigen`·`/abo/pausieren`,
`LesifyUI.search` (in `app.js`, nicht `data.js`) → `GET /suche?q=`,
usw.) — beim Anbinden des echten Backends sollte `data.js` durch einen
API-Client mit identischer Funktionssignatur ersetzt werden, damit die
Seiten (`chat.html`, `thema.html`, `testklausur.html`, `lernplan.html`,
`lernplan-lernzettel.html`, `lernzettel.html`, `suche.html`, `einstellungen.html`, …)
unverändert bleiben können.

Neue Dummy-Felder/Entities: `Lernplan` (`store.lernplaene` + `store.lernplanOverrides`,
Seed in `SEED.lernplaene`), `Lernplan.lernzettel` (`{content, aktualisiertAm}`,
Markdown-Dummy im Stil von `LERNZETTEL_ABSCHNITTE`), `Lernplan.checklist`
(abgehakte Aufgaben-Punkte je Lerntag; `Lernplan.tageErledigt` nur noch als Legacy-Fallback),
`Lernplan.chatMap` (`"<tag>\|<modus>\|<themaId>" → chatId`, leeres Objekt bei
Erstellung; Seed-Lernpläne ohne Feld ⇒ Zuordnung entsteht erst über `store.lernplanOverrides`).
Deep-Link-Chats aus dem Lernplan werden jetzt beim ersten Absenden über `Lesify.addChat`
angelegt und über `Lesify.appendChatMessages` fortgeschrieben (vorher: flüchtig im Seiten-State).
Entfallen: `Testklausur.nachtestPool`, `Vorbereitungsstand.nachtestsVerwendet`,
`Lesify.nachtestVersuch`, `Lesify.nachtestDokument`, `NACHTEST_ERFOLGSCHANCE`.

**`api.js`-Cache-Layer für synchrone Renderer (2026-09-12, mit `dashboard.html`
als erster Seite):** `app.js`s geteilte Render-Helfer (`badge`, `fachColorVars`,
`fachBadge`, `cardWatermark`, `klausurCard`, `fachFilterChips`, …) lesen Fach-/
Thema-Daten **synchron** per ID (`Lesify.getFach(id)`, `Lesify.label(themaId)`)
— im data.js-Prototyp trivial, weil ohnehin alles im Speicher liegt. Damit
dieselben Renderer unverändert auch unter `api.js` laufen, hält `api.js` jetzt
einen kleinen Fächer-/Themen-Cache (befüllt als Nebeneffekt von `faecher()`/
`themen()`) und beantwortet `getFach`/`label` synchron daraus — die aufrufende
Seite muss dafür einmal `faecher()`/`themen()` geawaitet haben (macht jede
Seite ohnehin für ihre Hauptdaten). Reine Formeln/Design-Tokens ohne
Server-Abhängigkeit (`prozentZuNote`/`noteAmpel`/`noteLabel`/`tierLabel`/
`klausurVergangen`, `FACH_COLORS`/`getFachColor`/`FACH_PRESETS`/
`getFachIconSvg`) sind 1:1 aus `data.js` nach `api.js` gespiegelt (identisch
zum bereits vorhandenen `slugify`/`uid`-Muster). Neu: `relativeTime()` berechnet
`.updated`-Anzeigen ("vor 2 Stunden") aus dem echten Zeitstempel — im
Prototyp war das nur ein fest verdrahteter Seed-Text. `getUser()` bekam
zusätzlich `.klasse` (Alias für `klassenstufe`) und berechnete `.initials`.
`klausurNoteBox()` (in `app.js`) nutzt unter `api.js` das mit `GET /klausuren`
eingebettete `note`-Feld statt (wie im Prototyp) einen flachen
Testklausur-Index zu durchsuchen, den es im echten Backend nicht gibt — beide
Pfade bleiben nebeneinander bestehen (Unterscheidung: trägt das übergebene
Objekt ein `note`-Feld, auch `null`). Gilt für **jede** künftige Seite im
Cut-over, nicht nur `dashboard.html`.

**Nachtrag `fach.html` (2026-09-12):** zwei Cache-Layer-Lücken, die **jede**
künftige Seite treffen können, gefunden und gefixt. (1) Teil-Listen wie
`themenFuerFach(fachId)` schrieben den Themen-Cache nirgends fest — `label()`/
`badge()` zeigten „—" statt Fach-/Thema-Namen. `api.js` hat jetzt
`mergeCache(target, list)` (fügt/aktualisiert per `id`, statt den ganzen Cache
zu ersetzen); `faecher()`/`themen()`/`themenFuerFach()` nutzen es alle.
`themenFuerFach()` ergänzt zusätzlich `fachName`/`farbe` aus dem bereits
geladenen Fächer-Cache, weil `GET /faecher/:id/themen` dafür keinen
`fach`-Include hat (anders als die volle `GET /themen`-Liste). (2) Eine echte
Race Condition in `fach.html` selbst (nicht im Cache-Layer): mehrere
Draw-Funktionen liefen per `Promise.all([…])` parallel, aber eine liest
synchron aus einem Cache, den eine andere erst füllt — ohne Sequenzierung
(die cache-füllende Funktion zuerst einzeln awaiten) manchmal noch leer.
**Nachtrag `lernplan-lernzettel.html` (2026-09-12):** `R.lernzettelSeite()`
(app.js) rief `Lesify.getLernplan()` synchron auf — Thenable-Check weicht auf
`Lesify.lernplanStatus(id).lernplan` aus. Der Download-Button brauchte einen
echten Rewrite (nicht nur `await`): `GET /lernplaene/:id/lernzettel/
dokument` sitzt hinter dem normalen `requireAuth`-Hook **ohne** `?token=`-
Fallback (anders als `dateiInhaltUrl()`/`testklausurDokumentUrl()`, die
einen eigenen Plugin-Scope mit Query-Token haben) — eine simple `<a href>`-
Navigation hätte ohne Authorization-Header eine 401 bekommen. Fix: Button
holt den Text per `fetch()` + Bearer-Header, baut daraus einen Blob +
`URL.createObjectURL`-Download.

**Nachtrag `thema.html` (2026-09-12) — bisher der größte Umbau nach
`lernplan.html`:** fünf Inhaltstypen (Übersicht + Chats/Lernzettel/Dateien/
Klausuren-Tabs) + echter Datei-Upload + Klausur-Anlage-Modal. Neue
`loadDaten()` lädt Chats (fach-gefiltert → clientseitig auf `themaId`
eingeengt, `GET /chats` kennt keinen `themaId`-Filter)/Lernzettel/Dateien
(serverseitig `themaId`-gefiltert)/Klausuren (ungefiltert → clientseitig
eingeengt) **einmal statt bis zu 4×** — vorher lasen `chatItems()` &
Co. bei jedem Tab-/Übersicht-Redraw frisch. Datei-Upload komplett neu
geschrieben (kein reiner Await-Umbau): `Lesify.uploadDatei()` (multipart) +
`Lesify.pollDateiStatus()` ersetzt die rein clientseitige data.js-Simulation,
inkl. serverseitiger MIME-Prüfung statt Client-Extension-Heuristik. Neue
`api.js`-Lücke: `GET /dateien` liefert `groesseBytes` (Zahl), aber
`dateiCard()`/`dateiRow()` erwarten die formatierte `groesse`-Zeichenkette
("1.2 MB") wie im data.js-Seed — neue `formatBytes()`/`mitDateiForm()`,
jetzt einheitlich in `dateien()`/`getDatei()`/`uploadDatei()`.

**Nachtrag `themen.html` (2026-09-12) — kleinste Konvertierung bisher, aber
Backend-Lücke aufgedeckt:** die Seite ruft `R.themaCard(t)` ohne `opts` auf,
das nutzt den Default-`countKeys` inkl. `'klausuren'` — `GET /themen`
(fächerübergreifend) hatte aber bisher keine eingebetteten Zählwerte. Fix
serverseitig statt im Frontend: neue `klausurenAnzahlProThema(prisma, userId)`
in `api/src/lib/themen.ts` (Batch-Read über `Klausur.themaIds`, da String-
Array-Feld ohne `_count`-Unterstützung), `themaDTO()` um optionales
`klausuren`-Feld erweitert. `GET /themen` und `GET /faecher/:id/themen`
liefern jetzt beide vollständig `anzahlChats`/`anzahlLernzettel`/
`anzahlDateien`/`anzahlKlausuren` eingebettet.

**Nachtrag `chat.html` (2026-09-12) — größter Umbau der Cutover-Reihe:** der
gesamte simulierte KI-Chat (Platzhalter-Antwortpools, client-seitiges
`incrementUsage`, separates `setLernplanChatId`) weicht dem einen echten
`POST /chats/:id/nachrichten`, der Guard + Limit + KI-Call + Titel + Usage +
(bei Lernplan-Kontext) chatMap-Update atomar erledigt — `lernplanKontext:
{lernplanId, tag}` im Request ersetzt den separaten Client-Call komplett.
Lokaler `chatList`-Cache (`await Lesify.chats()`) ersetzt das synchrone
`Lesify.chats()` für Verlauf-Spalte/Fach-Filter; `GET /chats` liefert bereits
neueste zuerst (data.js' `.reverse()` musste weg). Datei-Anhänge laufen über
den echten Upload+Polling-Pfad, `anhangDateiId` geht in den Request; beim
Laden eines bestehenden Chats wird der Dateiname pro Anhang einmalig
nachgeladen. Guard-/Limit-Fehler landen als Toast statt die Seite zu
blockieren. **Bug gefunden (nicht durch diese Seite verursacht, hier zum
ersten Mal sichtbar):** `GET /usage`s `resetDatum` ist ein volles
ISO-Datetime, `formatDatum()` erwartet "YYYY-MM-DD" — Fix in `api.js`s
`usage()`, kürzt auf die ersten 10 Zeichen.

**Nachtrag `testklausur.html` (2026-09-12):** kein `GET /testklausuren`-Bulk-
Endpunkt (anders als `/klausuren`) — die Seite braucht immer `?id=`, sonst
zurück aufs Dashboard. `GET /testklausuren/:id` liefert flache `ergebnisse`-
Zeilen, die UI erwartet ein genestetes `t.ergebnis = {note, prozent,
proThema}` — neue `reshapeTestklausur()` in `api.js` baut das wie
`testklausurFuerLernplanUI()` im Backend (`prozentZuNote(round(avg(prozent)))`,
siehe `testklausurGesamtNote` in `shared/`). Lösungs-Upload läuft über den
echten Multipart-Pfad `POST /testklausuren/:id/loesung` (neue
`Lesify.ladeTestklausurLoesungHoch()`) statt dem alten Zwei-Schritt
`uploadDatei`+`loeseTestklausur`. Download per `fetch`+Blob (kein
`?token=`-Fallback am Dokument-Endpunkt).

**Nachtrag `lernzettel.html` (2026-09-12) — kleinste Konvertierung seit
`themen.html`:** der simulierte Revisions-Chat weicht dem echten `POST
/lernzettel/:id/revisionen` (Call 09). Feldnamen-Anpassung: `revisionMessages`/
`role` (data.js) → `revisionen`/`rolle` (Server). `getLernzettel()` in `api.js`
bekam `mitUpdated()` nachgezogen (fehlte bisher). Kein `id`-Fallback über eine
eigene Bulk-Route, sondern über die ungefilterte `GET /lernzettel` (schon
sortiert) — `[0]` ist der zuletzt bearbeitete.

**Nachtrag `dateien.html` (2026-09-12) — seitenübergreifender Bug in
`openDateiModal()` gefunden:** die geteilte Funktion (app.js, global per
Klick-Delegation auf `[data-datei-id]` ausgelöst — betrifft auch
`thema.html`s Dateien-Tab) rief `Lesify.getDatei()` noch synchron auf, obwohl
das unter `api.js` ein Promise ist. Fix: Thenable-Check, Rendering in neue
`renderDateiModal(d)` ausgelagert. Zweiter Fund: der Download-Button rief das
nur in `data.js` existierende `Lesify.downloadText()` — Fallback auf lokalen
Blob-Download, wenn die Funktion fehlt.

**Nachtrag `suche.html` (2026-09-12):** die client-seitige `searchAll()`
(sechs sync `Lesify.*`-Listen) geht unter `api.js` nicht mehr —
`dashboard.html` hatte das bei seiner eigenen Umstellung bereits mit
`Lesify.suche(q)` (echtes `GET /suche`) gelöst, `suche.html` übernimmt
dasselbe Muster inkl. Race-Guard. `searchAll()` danach ungenutzt, aus
`app.js` entfernt. **Seitenübergreifender Bug (betraf auch `dashboard.html`s
schon laufende Schnellsuche):** `GET /suche`s Gruppen-`icon`-Werte sind
Entity-Namen, keine `Icons`-Schlüssel — fiel für alles außer „chat" auf die
generische Lupe zurück. Neue `SEARCH_ICON_MAP` in `app.js` übersetzt korrekt.

**Nachtrag `einstellungen.html` (2026-09-12) — mehrere Konzept-Differenzen
zum echten Backend aufgedeckt:** `ki_tonfall` → `kiTonfall` (camelCase).
**„Dunkles Design" hat kein Backend-Feld** (`Einstellungen`-Schema kennt nur
`erinnerungVorKlausuren`/`woechentlicheZusammenfassung`/`kiTonfall`) — als
reine Geräte-Einstellung gelöst: `localStorage['lesify:darkmode']`,
unabhängig vom Account. Boot-Skript in **allen 20** `app/*.html`-Köpfen von
`lesify_db_v2`(data.js-Store) auf den neuen Key umgestellt. **Zweiter,
gravierenderer Bug dabei gefunden:** `applyTheme()` (app.js, läuft auf jeder
Seite beim Boot) rief `Lesify.getSettings().darkMode` synchron auf — unter
`api.js` ein Promise, `.darkMode` immer `undefined` → hat Dark Mode auf
jeder bereits umgestellten Seite beim Laden automatisch wieder
abgeschaltet, seit `dashboard.html`s Umstellung, nie aufgefallen. Fix:
liest jetzt direkt aus demselben `localStorage`-Key. **„Ansicht"
(Schüler ⇄ Eltern) komplett entfernt** — kein echter Endpunkt, mit dem ein
Schüler-Konto sich selbst zum Elternteil macht; `renderChrome()`s
Sidebar-Verzweigung liest ohnehin direkt `user.rolle`. **Tarif ist jetzt
echt** (`Lesify.getAbo()`/`aendernAbo({paket})` statt Prototyp-Toggle),
Karte blendet sich aus ohne aktives Abo. `updateUser()` übersetzt
`{name,klasse}` → `{name,klassenstufe}` und spiegelt `.klasse`/`.initials`.

**Nachtrag `eltern-*.html` (2026-09-13) — alle fünf Seiten umgestellt,
Phase 11 komplett:** war zuvor an fünf Produktentscheidungen blockiert
(Aktivitäts-Ampel, „Eingeladen"-Status, „letzte Aktivität",
Kind-Avatar-Farbe, Abo-Reaktivierung), alle vom Nutzer beantwortet.
**Backend:** neuer Endpunkt `POST /abo/reaktivieren` + `ZahlungsGateway.
subscriptionReaktivieren()` (Fake: No-op; Stripe: `cancel_at_period_end=
false` + `pause_collection=null`), nur von `gekuendigt`/`pausiert` aus
(sonst `409 abo_nicht_reaktivierbar`). `GET /abo/kinder` liefert
`eingeladen: boolean` (`!!email`). `GET /abo/kinder/:id/zusammenfassung`
liefert zusätzlich `faecherListe`/`anstehendeKlausurenListe` (reine
Metadaten — Name/Farbe/Themenzahl bzw. Fach/Datum, kein Inhalt) — die
Seite erwartete diese Listen schon vorher, der Endpunkt lieferte sie nie.
`userDTO()` bekam `einwilligungAm` (fehlte). Aktivitäts-Ampel bewusst NICHT
gebaut (Nutzer-Entscheidung: „kann komplett entfernt werden") — die Seiten
zeigen jetzt die rohen Wochenzahlen ohne Einstufung. **Frontend:** neue
`Lesify.getKindColor(kindId)` (deterministischer Hash) ersetzt den
Kind-Farb-Picker im Prototyp; `Lesify.loeschenKonto(passwort)` neu, seit
2026-09-13 auf `eltern-datenschutz.html` verdrahtet (Export/Löschung dort
liefen im Prototyp nur als Fake-Toasts). „Als Kind ansehen" ist jetzt ein
echter Kontextwechsel (`kinderSitzung()` → `_setToken()` → Redirect).
**Zwei Bugs gefunden:** (1) `auth-gate.js`s Rollen-/Familie-Weiche kannte
nur `eltern.html` als Eltern-Seite (`hier === 'eltern.html'`) — ein
Schüler-Account auf z. B. `eltern-kinder.html` wäre nicht abgefangen
worden; Fix: `hier.indexOf('eltern-') === 0` zusätzlich geprüft. (2)
`eltern-abo.html`s Status-Anzeige kannte nur `aktiv`/`gekuendigt`/
`pausiert` aus dem Prototyp, das echte `AboStatus`-Enum hat zusätzlich
`test` (Trial) und `zahlung_offen` — ein Trial-Abo zeigte „Aktiv", aber den
„Abo reaktivieren"-Button (der nur bei gekündigt/pausiert erscheinen
soll); Fix: vollständige Status-Tabelle + `laeuft`-Flag für die
Button-Logik. Außerdem derselbe `formatDatum`-Bug wie bei `chat.html`s
`resetDatum`: `einwilligungAm` kam als volles ISO-Datetime — Fix in
`getUser()`, auf die ersten 10 Zeichen gekürzt. Und der geteilte,
fünffach duplizierte `modal()`-Helfer behandelte `onConfirm(scrim)` bisher
synchron — mit den jetzt async gewordenen Bestätigungs-Callbacks
(`await Lesify.…`) wäre das Modal immer sofort geschlossen worden, auch
bei einem Validierungsfehler; Fix: Promise-Erkennung vor dem Schließen.
**Zwei weitere Bugs beim „Als Kind ansehen"-Kontextwechsel gefunden:**
(3) `istElternAnsicht()` (app.js, entscheidet Eltern- vs. Schüler-Sidebar)
rief die data.js-only `Lesify.istElternteil()` auf — unter `api.js`
`undefined`, jede Eltern-Seite hätte die falsche Sidebar gezeigt. Fix:
unter `api.js` entscheidet der Seitenname selbst (`eltern.html`/
`eltern-`-Präfix), `auth-gate.js` hat die Berechtigung ohnehin schon
geprüft. (4) Der Kontextwechsel selbst war unvollständig:
`kinderSitzung()` ersetzt das Token direkt, ohne das Eltern-Token vorher
zu sichern — kein Weg zurück außer Neu-Login; das alte „Elternmodus"-
Banner hing an rein data.js-Funktionen. Fix: neue
`Lesify.startElternModus()`/`beendeElternModus()` (merkt/stellt das
Eltern-Token in `localStorage['lesify:elternToken']` wieder her),
`renderElternBanner()` unterstützt jetzt beide Welten.

**Nachtrag `klausur.html` (2026-09-12) — deutlich leichter als erwartet:**
kein Backend-Change nötig — die komplette eingebettete Lernplan-Sektion
läuft unverändert mit den Bausteinen aus `lernplan.html` weiter. Zwei
Kleinigkeiten in `api.js`: `k.note` (mit `GET /klausuren/:id` eingebettet)
ersetzt den nicht existierenden `Lesify.klausurNote(kId)`. Und
`Lesify.getThema(id)` lieferte Zählwerte unter `.stats.chats` statt der
sonst genutzten `anzahlChats`-Konvention (dritte, andere Form neben
`GET /themen` ohne Zähler und `GET /faecher/:id/themen` mit `anzahlX`) —
`api.js` spiegelt `stats.*` jetzt zusätzlich als `anzahlChats`/… und merged
das Thema ins Themen-Cache.

**Nachtrag `lernplan.html` (2026-09-12) — mit Abstand der größte Umbau
bisher:** `app.js`s komplettes Lernplan-Renderer-Bündel
(`lernplanSeite`/`lpVariantSplit`/`lpTag1Body`…`lpTag7Body`/`wireLernplan`/
`lernplanNaechsteAufgabe`/`lernplanTeaser`/`lernplanFocusTag`/
`lernplanSplitMain`) liest synchron `Lesify.lernplanStatus(id)` inkl. der
darin verschachtelten vollen `s.klausur`/`s.testklausur1`/`s.testklausur2`-
Objekte (data.js-Prototyp-Form) — nicht nur die reine
`shared/src/lernplan.ts`-Berechnung, die `GET /lernplaene/:id` bis dahin als
`status` lieferte. Fix in zwei Teilen: (1) **Backend:** neue
`testklausurFuerLernplanUI()` (`api/src/lib/lernplan.ts`) lädt Aufgaben +
Ergebnisse + Vorbereitung einer Testklausur und formt sie in die
verschachtelte `{ergebnis: {note, prozent, proThema}, vorbereitung: {note,
proThema}}`-Form um — **anders** als die flachen `ergebnisse`/
`vorbereitung`-Arrays von `GET /testklausuren/:id`. `lernplaene.ts`s
`mitStatus()` bettet jetzt zusätzlich `klausur`/`testklausur1`/
`testklausur2` ein (rein additiv — die gut getestete `berechneLernplanStatus()`/
`lernplanStatus()` bleibt unverändert). (2) **Frontend:** `api.js` bekam
einen Lernplan-Cache (`_cache.lernplaene`, Objekt statt Array — immer
Einzel-Lookup per ID) + einen sync `lernplanStatus(id)`, der die API-Antwort
auf die exakte data.js-Form zusammenfaltet, plus `getLernplanChatId()`
(liest `chatMap` **im Backend-Key-Format** `tag|modus|themaId`, leerer statt
`"null"`-String bei fehlendem Modus — data.js nutzt dort `String(modus)`,
das passt nicht zu dem, was der Server unter `chatMap` tatsächlich
speichert). `wireLernplan()` (Checklisten-Haken, „Tag abschließen",
Lernzettel starten, Testklausur 2 starten, Tag-Fokus wechseln) ist jetzt
komplett `async` mit explizitem Re-Fetch (`Lesify.getLernplan(id)`) vor
jedem Re-Render — `await` auf einem synchronen Rückgabewert (data.js) läuft
einfach einen Mikrotask später durch, bei Klick-/Change-Events technisch
folgenlos, darum **kein** Thenable-Check nötig (anders als `renderChrome()`,
wo ein sichtbarer Lade-Flash vermieden werden sollte). **Bekannte,
zurückgestellte Lücke:** `lpKlasse()` (Chat-Prompt „für die 8. Klasse")
fällt unter api.js auf den Fach-Wert zurück, weil `Lesify.getUser()` dort
async ist — betrifft nur die Prompt-Formulierung, keine Funktion.

**Nachtrag `klausuren.html` (2026-09-12):** drei weitere generische Lücken,
alle im Cache-/Seiten-Muster, nicht seitenspezifisch. (1) `fachFilterChips()`
(app.js) rief `Lesify.faecher()` synchron auf — unter api.js ein Promise.
Neu: `Lesify._faecherCache()` (Sync-Snapshot), `fachFilterChips()` nutzt es,
wenn vorhanden. (2) `Lesify.themen(fachId)` (gefiltert) gibt es unter api.js
nicht — nur `themenFuerFach(fachId)` (async); das „neue Klausur"-Formular
lädt Themen jetzt einmal pro Fach-Wechsel in eine lokale Variable statt sie
synchron abzufragen. (3) **Cache-Warm-Lücke wie bei `fach.html`, diesmal
fächerübergreifend:** die Liste awaitete nur `Lesify.faecher()`, nie
`Lesify.themen()` — Klausur-Karten zeigten „—·—" statt Fach/Thema.
**Faustregel:** jede Seite mit Thema-Badges braucht **sowohl**
`faecher()` **als auch** `themen()` (oder eine Teilmenge wie
`themenFuerFach()`) vorher geawaitet. Außerdem: `POST /klausuren` legt
Klausur + Testklausur 1 (echter KI-Call) + Lernplan in einem Request an —
`Lesify.starteLernplan()` aus data.js entfällt unter api.js ersatzlos, die
Antwort liefert `lernplan.id` direkt.
**Nachtrag `faecher.html` (2026-09-12):** dasselbe Embedded-Aggregat-Muster
gilt für `Fach.anzahlThemen`/`anzahlKlausuren` (`fachDTO` in `api/src/lib/
dto.ts`, mit `GET /faecher` eingebettet) — kein eigener
`Lesify.countsForFach()`-Aufruf nötig, anders als im data.js-Prototyp, wo das
eine separate synchrone Berechnung ist. Zwei weitere generische Lehren:
(1) **jede geteilte `app.js`-Funktion, die einen Lesify-Schreibaufruf ohne
Rückgabewert nutzt** (hier `openFachColorPicker()` → `Lesify.updateFach()`),
braucht denselben Thenable-Check wie `renderChrome()` — sonst rennt der
UI-Nachher-Schritt (Modal schließen, neu rendern) dem noch nicht
abgeschlossenen `PATCH`/`POST` davon. (2) **Formulare dürfen `null` nicht als
JSON-Wert für ein `.optional()`-Feld mitschicken** — Zod lehnt das ab (`400
validierung`), anders als `undefined`/fehlender Key. Betrifft jedes Formular,
das einen im Prototyp „leeren aber gesetzten" Wert (hier `icon: null`) an
einen entsprechenden API-Endpunkt schickt.

Dunkles Design: `SEED.settings.darkMode` (bool) — von `Lesify.getSettings`/
`updateSettings` mitgeführt, sonst kein Datenfluss (reine Client-Darstellung,
`data-theme` am `<html>` + CSS-Token-Override). Nur `app/`, nicht Marketing.

Eltern-Zugang (Phase 12): `SEED.familie` (`elternName`, `elternEmail`,
`einwilligungAm`, `kinder[]` mit je `woche`-Kennzahlen), `SEED.user.rolle`
(`schueler`\|`elternteil`), `SEED.plan.status` (`aktiv`\|`gekuendigt`\|`pausiert`)
und `SEED.plan.familie` (`{sitze}`). Store-Overlay: `rolleOverride` (Dev-Schalter
Ansicht Schüler ⇄ Elternteil), `kinder` (nach erster Mutation Quelle der
Kind-Liste), `elternModus` (`{kindId, kindName, kindKlasse}` während „Als Kind
ansehen"). Neue Seite `app/eltern.html`; `app/assets/js/app.js` hat eine eigene
`ELTERN_NAV_ITEMS`-Variante + `renderElternBanner()`.

---

## 10. Seiten-Layouts (nur Prototyp / Frontend)

Dashboard, Thema, `lernplan.html` und `klausur.html` haben je genau **ein**
Layout — die früheren Layout-Dev-Switcher wurden entfernt. `testklausur.html` hat **ein festes Split-Layout**
(DOM `.tkx-head`/`.tkx-steps`/`.tkx-panel`/`.tkx-result`; ab 880px Grid `210px 1fr`
mit vertikaler Step-Schiene links, darunter einspaltig mit horizontalem Stepper).
Verbliebene lokale Prototyp-Dev-Switcher (`.layout-dev`-Panel, kein Backend-Bezug):
die Suche-Ergebnis-Darstellung (`localStorage['lesify:search:v']`); der
**Phasen-Umschalter** auf `testklausur.html` (`lesify:tk:stage` =
erstellt/geloest/analysiert/leer) — überschreibt nur die angezeigte Phase
(`effStatus()`), nicht den Store, fehlende Daten werden lokal synthetisiert
(`previewErgebnis()`); und der **Pill-Style-Umschalter** im Neue-Klausur-Modal auf
`klausuren.html` (`lesify:themepick:pill` = 1–5: Solid / Soft / Outline / Dot / Bar,
alle fach-gefärbt). Der frühere **Ansicht-Umschalter** auf `einstellungen.html`
(Karte „Ansicht", `Lesify.setRolle` → `store.rolleOverride`, Schüler-App ⇄
Eltern-Bereich) ist mit der Phase-11-Umstellung dieser Seite (2026-09-12)
entfallen — es gibt keinen echten Endpunkt, mit dem ein Schüler-Konto sich
selbst zum Elternteil macht; die Sidebar-Verzweigung (`renderChrome()`)
liest die Rolle ohnehin direkt vom Account (`user.rolle`). Fach-Färbung auf `testklausur.html` (Step-Nummern bleiben als
Zahl sichtbar, weiß auf `--fach-color`; fach-getönte Kartenränder + Panel-Wash bei
Lösen/Analyse; `vb-note-<ampel>` auf der Testklausurnote) ist rein kosmetisch.

`lernplan.html` nutzt fest das **Split-Layout** (`lpVariantSplit` in `app.js`, über
`R.lernplanSeite(lernplanId)`): Schritt-Navigation + Fortschrittsbalken links (aside),
gewählter Tag rechts, einspaltig auf Mobile. Der gewählte Tag lebt in einem
Modul-Zustand (`lpFocusTag`, `data-lp-focus`, zurückgesetzt bei Lernplan-Wechsel);
alles liest aus `Lesify.lernplanStatus`, Tages-Inhalte aus `LP_DAY_BODY`. Kein
Backend-Bezug. `testklausur.html` zeigt nur einen Teaser (`R.lernplanTeaser`).
Die Seite ist in `<div class="lp-page lp-fc--4">` mit den Fach-Farbvariablen
(`--fach-color/-ink/-bg` aus `Fach.farbe`) gewickelt — die Fachfarben-Akzent-Variante
ist final auf **„Kräftig" (`lp-fc--4`)** festgelegt (`lpFcClass()` konstant, kein
Switcher mehr): gefüllte aktive Navi, getönte Tages-Kopfleiste, alle „fertig"-Signale
in Fachfarbe; Ampel-Grün bleibt unberührt. `klausur.html` bettet dieselbe volle
Tag-Ansicht (`R.lernplanSplitMain`) mit horizontaler Pills-Fortschrittsleiste ein,
ebenfalls in `lp-fc--4`.

- **Dashboard** — Welcome-/Landing-Kopf (zentrierte Überschrift, breite
  Suche, Schnellzugriff-Pills) + ruhiges 2×2-Bento:
  KI-Chat · **Nächste Klausur** (dieselbe `R.klausurCard` wie auf der
  Klausuren-Seite) · **Zuletzt bearbeitet** (Aktivitäts-Feed) ·
  **Anstehende Klausuren** (kompakte, klickbare Liste der Klausuren nach
  der nächsten). Beide Klausur-Flächen zeigen **nur anstehende** Klausuren
  (`Lesify.klausurVergangen` herausgefiltert). Kein Backend-Bezug.
- **Thema** — Kopf ohne KPI-Streifen (die Zählwerte stehen bereits in den
  Tabs). Übersicht = Zweispalten-Panels (Chats/Lernzettel ·
  Dateien/Klausuren), Fach-Farbe durchgehend, **keine Testklausuren**
  (kein Tab, keine Karte — künftig nur über die zugehörige Klausur;
  `Testklausur.klausurId` bleibt der Anker, reine IA-Entscheidung),
  **kein Vorbereitungsstand** mehr (`Testklausur.vorbereitung` bleibt im
  Datenmodell und wird weiter auf der Klausur-Seite genutzt). Kein „Alle
  ansehen"-Button mehr — die Inhalts-Zeilen sind direkt klickbar
  (Chat/Lernzettel/… öffnen, Hover-Feedback). Die Unterseiten Chats und
  Lernzettel nutzen dieselbe Panel-/Zeilen-Optik wie die Übersicht.
  `GET /themen/:id` bzw. die Listen-Endpunkte sollten Chats, Lernzettel,
  Dateien und Klausuren pro Thema (ggf. gekürzt) mitliefern — kein neuer
  Endpunkt.
- **Klausur / Testklausur** — kein eingebetteter Lernplan. `testklausur.html` zeigt
  nur den **Teaser** (`R.lernplanTeaser(lernplanId)`). `klausur.html` erweitert das;
  Sektions-Reihenfolge: Kopf → **Zugehörige Themen** → **Schnellzugriff** → **Lernplan**.
  Schnellzugriff = drei feste Ziele: „Neuer Chat" → `chat.html`; „Nächste
  Lernplan-Aufgabe" → Deep-Link zum ersten offenen Checklisten-Punkt des aktuellen
  Tages via `R.lernplanNaechsteAufgabe`, inkl. Chat-Kontinuität; „Lernzettel zur
  Klausur" → `lernplan-lernzettel.html?lernplan=…`. Lernplan-Sektion = **die volle
  Tag-Ansicht von `lernplan.html`** (`R.lernplanSplitMain(lp.id)` + `R.wireLernplan`,
  voll interaktiv: Haken, Tag-Wechsel) mit einer **horizontalen Pills-
  Fortschrittsleiste** darüber statt der Aside, gewickelt in `lp-page lp-fc--4`
  (gleiche Fachfarben-Akzente wie die Lernplan-Seite). Festes Layout, kein
  Dev-Werkzeug mehr. Link auf `lernplan.html` bleibt. `klausur.html` löst
  den Lernplan über `Lesify.getLernplanFuerKlausur(klausurId)` auf, `testklausur.html`
  über `getLernplanFuerKlausur(t.klausurId)`. `R.lernplanNaechsteAufgabe(lernplanId)`
  und `R.lernplanTagMeta(n)` sind rein abgeleitet (aus `lernplanStatus` bzw. der
  statischen `LP_TAGE`-Liste), kein Endpunkt.
  Bei einer **bereits geschriebenen** Klausur (`Lesify.klausurVergangen`) zeigt der
  Kopf nur den „Geschrieben"-Marker (keine Note — `Klausur.note` entfällt); ohne
  zugehörigen Lernplan entfällt die Schnellzugriff-Sektion und die Lernplan-Sektion
  weist nur darauf hin, dass die Klausur vorbei ist.
- **`lernplan.html`** (`?id=<lernplanId>` oder `?klausur=<klausurId>`) —
  **eigene Seite für den ganzen 7-Tage-Lernplan** (`R.lernplanSeite(lernplanId)`),
  festes Split-Layout (Schritt-Navigation links, aktiver Tag rechts), alles aus
  `Lesify.lernplanStatus`. Inhalte pro Tag:
  - **Kopf** — `fachBadge`, Klausur-Titel, `countdown(klausur.datum)` (Ampel-rot
    bei ≤ 3 Tagen). Fortschritt „x / 7 Tagen" + 7-Schritt-Navigation
    (done / current / open) sitzen in der linken Spalte des Split-Layouts.
  - **Tag 1** — Status/CTA je nach `testklausur1.status`; bei `analysiert` die
    stark/wackelig/schwach-Chips pro Thema + das eingefrorene KI-Feedback
    (`Testklausur.ergebnis.proThema[].erklaerung`).
  - **Tag 2/3/4/6/7** — die Tagesziele als **abhakbare Checkliste**: pro Punkt
    ein Chat-Deep-Link (`chat.html`, Fach/Thema/Modus + vorbelegter, nicht
    gesendeter Prompt; jeder generierende Prompt nennt die Klassenstufe) und eine
    Checkbox. Für Tag 2/3/4/6 verweist der Link auf einen schon bestehenden Chat
    (`?chat=<id>`), sobald `Lernplan.chatMap` einen zu `<tag>|<modus>|<themaId>`
    kennt — sonst frisch; beide Formen tragen `&lp=&lptag=` (siehe §3,
    „Chat-Kontinuität"). Tag 7 bleibt ein einfacher Deep-Link ohne Kontinuität.
    Haken → `Lesify.setLernplanCheck`; alle Punkte gehakt ⇒ Tag erledigt,
    Abwählen öffnet ihn wieder. „Tag X abschließen"-Button (Override) →
    `Lesify.setLernplanTagChecks(id, tag, true)`. Tag 3 startet den Lernzettel,
    Tag 4/6 hängen an (`Lesify.aktualisiereLernzettel`).
  - **Tag 5** — wenn nicht nötig: Hinweis; sonst „Testklausur 2 starten"
    (`Lesify.starteTestklausur2`) bzw. Link in `testklausur.html`; nach der
    Analyse ein Tag-1↔Tag-5-Vergleich pro Thema (verbessert / gleich / noch offen).
  - **Tag 7** — Lernzettel-Vorschau (+ Link `lernplan-lernzettel.html?lernplan=…`),
    ein Selbsttest-Checklistenpunkt, „Lernplan abschließen"-Button; danach der
    Abschluss-Hinweis „Lernplan abgeschlossen. Du bist vorbereitet.".
  Zurück-Link → `klausur.html`. Datenquelle: `GET /lernplaene/:id`
  (bzw. `GET /klausuren/:id` + die beiden `GET /testklausuren/:id`).
- **`lernplan-lernzettel.html`** (`?lernplan=<lernplanId>`) — read-only Ansicht des
  kumulativen `Lernplan.lernzettel.content` (gleicher Markdown-Block-Renderer
  wie `lernzettel.html`), `fachBadge`/Klausur-Titel im Kopf, „Herunterladen"
  (`Lesify.downloadText` / `lernzettelDokument`), Zurück-Link zum Lernplan.
  Kein Chat-/Revisions-UI — der Lernzettel wird ausschließlich über
  `aktualisiereLernzettel` aus den Lerntagen fortgeschrieben. Empty-State,
  solange `Lernplan.lernzettel === null`.

---

## 11. Marketing-Website (`marketing/`)

Eigenständiger statischer Prototyp der öffentlichen Website, im selben
Design-System wie die eingeloggte App (identische Tokens, Schriften Outfit +
Hanken Grotesk, Ampel-Farben, „Fog Blue"-Tonleiter). Kein Build, Vanilla JS.

- **Struktur (Stand 2026-09-12):** Vier Nav-Einträge, aber nur noch zwei
  eigene Seiten — `marketing/index.html` (Home/Landing) und `ueber-uns.html`
  (persönliche Gründer-Seite). „Preise" und „FAQ" verlinken auf Abschnitte der
  Startseite (`index.html#price`, `index.html#faq`) statt auf eigene Seiten.
  Ohne Nav-Eintrag, aber vorhanden: `kontakt.html`, `checkout.html`,
  `login.html`, `registrieren.html`, `passwort-vergessen.html`,
  `passwort-zuruecksetzen.html` (**neu, 2026-09-12** — nimmt `?token=` aus dem
  Link entgegen, den `passwort-vergessen.html` im Dev-Modus direkt anzeigt, und
  ruft `POST /auth/passwort-zuruecksetzen`), `email-bestaetigen.html` (**neu,
  2026-09-17** — Ziel des Bestätigungslinks aus der Registrierungs-Mail, nimmt
  `?token=` entgegen und ruft `POST /auth/email-bestaetigen`), `impressum.html`,
  `datenschutz.html`, `agb.html`. Eingestellt:
  `funktionen.html` + `feature-*.html` (Funktions-Unterseiten), `vergleich.html`
  (lebt als Abschnitt `index.html#cmp`), sowie `preise.html` + `faq.html`
  (leben als Abschnitte `index.html#price` / `index.html#faq`).
- **Shared:** `marketing/assets/css/marketing.css` (redeklariert den `:root`-
  Token-Block aus `app/assets/css/style.css` und ergänzt Marketing-Komponenten),
  `marketing/assets/js/marketing.js` (baut Navigation + Footer per JS, Scroll-
  Reveal via IntersectionObserver, Mobile-Menü, Preis-Umschalter monatlich/
  jährlich, Demo-Formular-Handler mit Toast, Zähler-Animation).
- **Zielgruppe der Landing:** Eltern von Schüler:innen der 8./9. Klasse.
  Kernbotschaften: günstiger und jederzeit verfügbar als klassische Nachhilfe,
  messbare Klausurvorbereitung (Testklausur + Notenprognose + Ampel + Lernplan).
  Enthält einen ehrlichen Vergleich (auch Punkte, in denen Nachhilfe gewinnt).
- **`ueber-uns.html`:** persönliche Gründer-Seite (Jannik Born) — Story vom
  Abitur-Lernsystem 2023 über das Studium und die App für die Schwester bis zum
  Unternehmen; Leitsatz „KI als Helfer, nicht als Löser". Foto unter
  `assets/img/ueber-uns/jannik.jpg`, mit Initialen-Fallback im Markup, falls die
  Datei fehlt.
- **Formulare echt verdrahtet (2026-09-12):** `login.html`, `registrieren.html`,
  `passwort-vergessen.html` (+ neu `passwort-zuruecksetzen.html`) und
  `kontakt.html` rufen jetzt wirklich die API (`marketing/assets/js/
  auth-forms.js`, gleicher eigenständiger Ansatz wie `checkout.js` — kein
  Laden von `app/assets/js/api.js`, gleicher `localStorage['lesify:token']`-
  Schlüssel). `registrieren.html` legt den `User` an und loggt danach direkt
  ein (Registrierung selbst liefert kein Token, §5), damit die Kasse
  (`checkout/`) sofort ein Konto hat; Ziel ist `checkout/` (Plan-/Intervall-
  Query-Parameter durchgereicht). `login.html` spiegelt die Rollen-/Familien-
  Weiche aus `app/assets/js/auth-gate.js` (`GET /abo/kinder` → Eltern mit
  Kind-Profilen nach `/app/eltern.html`, sonst `/app/dashboard.html`; `?weiter=`
  wird respektiert, wenn vorhanden). `kontakt.html` hat jetzt ein Honeypot-Feld
  (`name="website"`, `.visually-hidden`) für den Server-Filter. Preise/Limits
  bleiben Design-Platzhalter. Die daraus abgeleiteten echten Anforderungen
  stehen in §1 (User, Abo, KindProfil, Usage-Limits pro Paket), §4 (Auth-,
  Abo-, Kontakt-Endpunkte), §5 (Auth) und §7 (Limits).
- **E-Mail-Versand + `email-bestaetigen.html` (2026-09-17, neu):**
  `/registrieren` und `/passwort-vergessen` verschicken jetzt echte Mails über
  Resend (siehe §0, §5, §8). Die neue Seite `email-bestaetigen.html` ist das
  Ziel des Bestätigungslinks (rief vorher nirgends etwas auf — der Token-Flow
  bestand serverseitig, aber ohne Frontend-Gegenstück).
- **CORS (2026-09-12, neu):** Marketing/App liefen bisher auf anderem Origin
  als die API (lokal andere Ports, produktiv andere Domain, Phase 16) — ohne
  CORS scheiterten Browser-Requests von dort an den Server stumm (Preflight-
  `OPTIONS` lief ins Leere). `@fastify/cors` registriert in `api/src/app.ts`
  (`corsOriginOption()` in `api/src/lib/cors.ts`): `development`/`test`
  erlauben jeden Origin (lokale Ports variieren je nach Tooling —
  `pnpm dev` nutzt 4001/4002, andere Tools andere Ports); `production` nur die
  in `CORS_ORIGINS` gelisteten Origins (kommagetrennt) — **fail-closed** ohne
  die Variable. Neue Env-Var `CORS_ORIGINS` in `.env.example`/`api/.env.example`;
  muss in Phase 16 mit der echten Domain gesetzt werden. Tests:
  `api/src/lib/cors.test.ts` (5) + `api/src/app.test.ts` (2, Preflight +
  echte Antwort tragen den Header).
- **CORS-Nachtrag (2026-09-12, mit `faecher.html`):** `@fastify/cors` erlaubt
  ohne explizite `methods`-Option nur `GET,HEAD,POST` — jeder `PATCH`/`DELETE`-
  Endpunkt lief bis dahin lautlos ins Leere (Preflight `204`, aber der Browser
  schickte den eigentlichen Request nie ab). Fix: `methods: ['GET','HEAD',
  'POST','PATCH','DELETE']` explizit gesetzt. Tests: `api/src/app.test.ts`
  (+2, `it.each` für PATCH/DELETE).
- **Backend-Pflege:** Ändern sich im `PRICE`-Objekt (`marketing/assets/js/
  marketing.js`) die Pakete, Limits oder Preise, müssen die Tabelle in §1
  „Usage / Limits", §7 und die offenen Punkte in §8 mitgezogen werden.
- **Design-Exploration entfernt** (Entscheidung 2026-09-04): `landing-lab.html`
  und `marketing/assets/js/landing-lab.js` sind gelöscht. `marketing/assets/css/landing-lab.css`
  bleibt vorerst, weil die aktuelle `index.html` seine `lab-*`-Klassen nutzt —
  effektiv ist es jetzt das Landing-Stylesheet, kein Spielwiesen-Artefakt.
- **Aktuelle `index.html`:** statisches Landing-Markup, lädt `marketing.css` +
  `landing-lab.css` + `marketing.js`. Vorige Fassung liegt als `index-backup.html`.
- **Navigation (2026-09-08 überarbeitet):** `NAV_LINKS` in `marketing.js` hat nur
  noch vier flache Links (Home · Preise · Über uns · FAQ), kein „Funktionen"-
  Mega-Menü mehr. Das Mega-Menü- und Feature-Seiten-Gerüst in `marketing.js`
  (`initMegaMenu`, `FEATURE_PAGES`, `buildFeaturePage`) bleibt vorerst im Code,
  ist aber inert (kein Nav-Eintrag mit `.mega`, keine Seite mit `#feature-page`).
  `marketing/assets/css/feature.css` wird von keiner Seite mehr geladen.
