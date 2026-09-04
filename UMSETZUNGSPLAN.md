# Lesify — Umsetzungsplan: vom Prototyp zum Live-Produkt

> Chronologische Schritt-für-Schritt-Liste. Von oben nach unten abarbeiten —
> die Phasen bauen aufeinander auf. Jede Zeile mit `- [ ]` ist ein
> abschließbarer Arbeitsschritt; hak sie ab, wenn das dort genannte Ergebnis
> steht.
>
> **Grundregeln für die ganze Umsetzung**
> - Projektsprache bleibt **Deutsch** (Code-Kommentare, UI, Doku, Commit-Messages nach Belieben).
> - `Konzept-texts/backend-planning.md` ist die **Quelle der Wahrheit** für
>   Datenmodell, Endpunkte, Notenlogik. Jede Änderung an Feldern, Formeln oder
>   Endpunkten wird **dort zuerst** eingepflegt, bevor der Schritt als erledigt gilt
>   (siehe `CLAUDE.md`).
> - Das Backend **reproduziert** das Verhalten aus `assets/js/data.js` — es erfindet
>   nichts neu. Funktionssignaturen aus `data.js` bleiben das Ziel-Interface des API-Clients.
> - Nichts optimieren, bevor es weh tut (Themen-Memory, Suche, Caching): erst die
>   einfache Variante, Ausbau nur bei echtem Bedarf.

### Pflege dieser Datei

**Diese Datei wird bei jeder Arbeit am Lesify-Projekt mitgeführt.** Sobald in
diesem Ordner etwas passiert, das einem Schritt hier entspricht:

- den erledigten Schritt auf `- [x]` setzen (bei Teilfortschritt einen kurzen
  Klammerzusatz, z. B. `- [ ] … (API steht, Tests fehlen)`),
- neu entstandene oder verschobene Aufgaben als Zeilen ergänzen,
- getroffene Entscheidungen mit Datum in **Phase 0** festhalten,
- bei Änderungen an Datenmodell / Notenlogik / Limits / Endpunkten zusätzlich
  `Konzept-texts/backend-planning.md` nachziehen (siehe `CLAUDE.md`).

Der Abgleich passiert **im selben Arbeitsschritt** wie die Änderung, nicht später.

---

## Phase 0 — Bestandsaufnahme & Entscheidungen

Blockiert alles Weitere. Erst die offenen Produktfragen klären, dann bauen.

- [x] **Prototyp-Parität prüfen:** `assets/js/data.js` gegen `backend-planning.md`
      §1/§2/§9 diffen (Feldnamen, Enums, Statuswerte, Formeln). — _2026-09-03: die
      von den Entscheidungen betroffenen Felder (`Thema.mastery`, `Klausur.note`)
      in beiden Dokumenten entfernt, §1/§4/§5/§6/§7/§8 nachgezogen. Ein voller
      Feld-für-Feld-Abgleich der übrigen Entities steht bei Bedarf noch aus._
- [x] **Alle Nutzer-Flows im Prototyp einmal manuell durchklicken.** — _2026-09-04:
      vorab erledigt, gefundene Bugs sind gefixt._
- [x] **Getroffene Entscheidungen (Stand 2026-09-03)** — in `backend-planning.md`
      §8 abgehakt und in die betroffenen Abschnitte eingearbeitet:
  - [x] **Limit-Werte je Tarif:** bestätigt, Werte in `stripe-config.js` sind korrekt.
  - [x] **Preise & Intervalle:** monatlich **und** jährlich. **MwSt. wird nicht
        ausgewiesen** (Kleinunternehmerregelung — intern vermerkt, **nirgends auf
        der Website erwähnen**). _Noch offen:_ Angebotsdauer, Jahrespreis-Rundung,
        ob der Angebotspreis dauerhaft an den Vertrag gebunden bleibt.
  - [x] **Limit erreicht:** **Hard-Stop nur des betroffenen Features.** Datei-Limit
        erreicht → Uploads gesperrt, Chats und (Test-)Klausuren laufen normal weiter.
        Kein Soft-Warning, keine automatische Upgrade-Erzwingung.
  - [x] **Trial:** **14 Tage** (nicht 7). Nach 14 Tagen wird **automatisch der
        Monatsbetrag abgebucht**, sofern nicht vorher gekündigt — echter
        Stripe-Trial → Subscription, kein separater „Trial-Ende"-Zustand, keine
        eigenen Reminder-Mails (Stripe übernimmt die Zahlungs-Mails).
  - [x] **Zahlungsanbieter:** **Stripe.**
  - [x] **Schul-SSO:** **kommt nicht.** Button in `login.html` entfernen,
        `GET /auth/sso/schule` streichen.
  - [x] **Eltern-Kind-Modell:** **wird später geklärt** (Registrierung fragt die
        Rolle weiter ab, tiefere Mechanik zurückgestellt).
  - [x] **Familien-Sitz hinzufügen/entfernen:** Mechanik **später**. Fest: beim
        **Entfernen eines Sitzes werden dessen Inhalte gelöscht.**
  - [x] **`Thema.mastery`:** **wird ersatzlos entfernt** (war nie real hergeleitet)
        — aus `data.js`, `app.js`, `testklausur.html` und `backend-planning.md`.
  - [x] **Testklausur-Lösungs-Uploads:** **ausgenommen** vom Datei-/Content-Limit.
  - [x] **Usage-Reset:** **fix zum Monatsersten.**
  - [x] **Erreichte `Klausur.note`:** **wird nirgends eingetragen** — Lesify ist zur
        Vorbereitung da, das Endergebnis ist irrelevant. Feld `Klausur.note` und die
        „Deine Note"-Anzeige auf geschriebenen Klausur-Karten entfallen; der
        „Geschrieben"-Zustand (aus `datum` abgeleitet) bleibt als neutraler Chip.
  - [x] **Datenaufbewahrung:** **alle Inhalte** (Dateien, Klausuren, Chats,
        Lernzettel, Testklausuren, Lernpläne) werden **nach einem Jahr automatisch
        gelöscht.** Dieser Hinweis muss in den Einstellungen (oder an der dafür
        besten Stelle) sichtbar stehen. Ersetzt die offene „Archivierungs"-Frage.
  - [x] **Benachrichtigungs-Versand:** **keine eigene E-Mail-Infrastruktur** — die
        wichtigen Mails (Zahlung, Abo, Beleg) laufen über Stripe. Eigener Versand
        von Klausur-Erinnerung / Wochenreport ist zurückgestellt.
  - [x] **KI-Missbrauchsschutz:** die KI darf **nur für schulrelevante Themen**
        genutzt werden. Alles darüber hinaus wird **direkt abgeblockt** (Guard vor
        jedem Chat-/Generierungs-Call, siehe Phase 6 + Phase 15).
  - [x] **Weitere Entscheidungen (2026-09-04):**
    - **Chat-Titel:** kurzer KI-Call nach der ersten Nachricht (Prompt 07), an
      `POST /chats/:id/nachrichten` angehängt. Client-Kürzung nur im Prototyp.
    - **Dritte Testklausur:** Backend lehnt einen dritten `POST /testklausuren`
      zur selben `klausurId` **hart ab** — genau zwei pro Klausurvorbereitung.
    - **Lernplan-Neustart:** gibt es nicht — pro Klausur genau ein 7-Tage-Zyklus.
  - [x] **Architekturfragen (chatMap, Datei-Status, Suche, Rate-Limiting):**
        entschieden am 2026-09-04 — siehe Abschnitt **„Architekturfragen"** unten.
- [x] **Prototyp-Bereinigung aus den Entscheidungen** (im statischen Frontend, vor
      dem Backend-Bau) — _erledigt 2026-09-03_:
  - [x] `Thema.mastery` überall entfernt: Seed + `addThema` in
        [assets/js/data.js](assets/js/data.js); der simulierte Auswertungs-Basiswert
        kommt jetzt aus `themaBasis(themaId)` (stabiler Hash) in `data.js` bzw.
        inline in [testklausur.html](testklausur.html). Keine `mastery`-Referenz mehr.
  - [x] `Klausur.note` + `klausurErgebnisBox` / „Deine Note" entfernt:
        [assets/js/data.js](assets/js/data.js) (Seed + Kommentar),
        [assets/js/app.js](assets/js/app.js) (`klausurErgebnisBox` gelöscht, aus
        `Render`-Export raus, `klausurCard` zeigt für geschriebene Klausuren keinen
        Fuß mehr), [klausur.html](klausur.html) (`drawHead` ohne Ergebnis-Box).
        „Geschrieben"-Flag bleibt.
  - [x] Trial `7` → `14` + Abbuchungs-Logik:
        [frontend/assets/js/stripe-config.js](frontend/assets/js/stripe-config.js)
        (`trialDays: 14` + Kommentare),
        [frontend/assets/js/checkout.js](frontend/assets/js/checkout.js) (Kommentar;
        die UI-Zeile leitet sich aus `trialDays` ab und stimmt damit automatisch),
        „7 Tage" → „14 Tage" in `index.html` / `preise.html` / `registrieren.html` /
        `vergleich.html` / `faq.html` / `checkout.html` / `agb.html`, und alle
        Stellen mit „ohne Zahlungsdaten / kein automatischer Wechsel" auf das neue
        Modell umgeschrieben (Zahlungsart bei Anmeldung, Auto-Abbuchung nach 14 Tagen,
        Kündigung in der Testphase = keine Berechnung). **Die AGB-Klausel (§4) und
        die Datenschutzerklärung müssen in Phase 13 noch rechtlich geprüft werden**
        (Auto-Renewal-/Widerrufs-Pflichtangaben).
  - [x] Schul-SSO-Block (Divider + Button + Inline-Skript) aus
        [frontend/login.html](frontend/login.html) entfernt.
  - [x] [einstellungen.html](einstellungen.html): Karte „Daten & Aufbewahrung"
        mit dem 1-Jahres-Löschhinweis ergänzt.
  - [x] **Landing-Lab entfernt (2026-09-04):** `frontend/landing-lab.html` und
        `frontend/assets/js/landing-lab.js` gelöscht.
        `frontend/assets/css/landing-lab.css` **bleibt** — die aktuelle
        `frontend/index.html` nutzt seine `lab-*`-Klassen, es ist damit faktisch
        das Landing-Stylesheet. Die öffentliche Website wird ohnehin erst später
        überarbeitet (dann ggf. umbenennen/aufräumen).

### Architekturfragen — entschieden am 2026-09-04

- [x] **`Lernplan.chatMap` → A: eigenes JSON-Feld am `Lernplan`** (Override-Muster
      wie im Prototyp, gepflegt über `PATCH /lernplaene/:id` bzw. gebündelt in
      `POST /chats/:id/nachrichten`). Nicht aus Nachrichten-Metadaten rekonstruiert.
      → Phase 2 (Spalte), Phase 4 (Endpunkt).
- [x] **Datei-Status → A: Client-Polling** von `GET /dateien/:id` (kurzer Backoff,
      Stopp bei `bereit`/`fehler` oder ~60 s Timeout). Kein Websocket/SSE.
      → Phase 5 (Server), Phase 11 (Frontend).
- [x] **Suche → A: DB-Substring** (`ILIKE '%q%'`) über **Titel-/Namensfelder**.
      Kein Volltext-Index, kein Suchen in Lernzettel-Inhalt / Datei-Zusammenfassung /
      Nachrichtentext. Später auf Postgres-Volltext hebbar. → Phase 4.
- [x] **Rate-Limiting & Missbrauchsschutz → es gibt beides.** Konkrete Regeln
      stehen jetzt in `backend-planning.md` §7 „Rate-Limiting & Missbrauchsschutz":
    - Request-Rate pro Endpunkt-Klasse (Auth streng, KI-Calls moderat, Lesen locker,
      `/kontakt` sehr streng), Schlüssel User + IP, Überschreitung → `429` +
      `Retry-After`.
    - **Vorab-Filter vor jedem KI-Call** (kein Usage-Verbrauch, jeweils
      **Popup-/Toast-Meldung**): Themen-Guard (nur schulrelevant), Größen-Guard
      (zu große Anfrage/Kontext → gar nicht an die KI), Spam-Guard (Flooding /
      Wiederholungen).
    - Missbrauchs-Signale (viele Guard-Treffer, fehlgeschlagene Logins,
      Upload-Flooding) → Logging + temporäre Sperre.
    - _Default, änderbar:_ Auth-Fehlversuche → IP-Drosselung + Backoff, **kein**
      harter Account-Lockout. `/kontakt` → IP-Limit + Honeypot, **kein Captcha**.
    → Phase 6 (Vorab-Filter), Phase 15 (Rate-Limiting produktiv).
- [x] **DB-Anbieter → Supabase (EU-Region)** für PostgreSQL **und** Objektspeicher.
      Nur als Postgres + Storage genutzt, **nicht** Supabase Auth. → Phase 2 / §0.
- [x] **Row-Level-Security → nein (App-Ebene + FK-Constraints).** Datentrennung
      rein über die `userId`-gescopte Query-Schicht (Auth-Middleware, Phase 3).
      Supabase-RLS scheidet aus, weil es Supabase-Auth voraussetzt. RLS als
      spätere Härtung offen. → Phase 2, `backend-planning.md` §1/§8.
- [x] **ORM/Migrationen → Prisma.** `api/prisma/schema.prisma`, `prisma migrate`.
      → Phase 2 / §0.

---

## Phase 1 — Stack-Entscheidung & Projekt-Setup

- [x] **Backend-Stack wählen** — _2026-09-04: entschieden & in `backend-planning.md`
      §0 „Stack" dokumentiert. TypeScript-Monorepo (pnpm-Workspaces), PostgreSQL +
      Objektspeicher über Supabase (EU-Region), Auth selbst gebaut, Stripe, E-Mail
      zurückgestellt. Umsetzungs-Ebene (Fastify/Prisma/Vitest/GitHub Actions) als
      revidierbarer Vorschlag._ Kriterien, nach denen entschieden wurde:
  - Sprache: TypeScript end-to-end senkt Reibung (Frontend ist bereits JS, `data.js`-Signaturen lassen sich 1:1 als Client nachbauen).
  - Datenbank: relational (Postgres) — das Datenmodell in §1 ist stark relational (FKs, Enums, Arrays).
  - Hosting: managed vs. self-hosted; EU-Region wegen DSGVO/Minderjährigendaten **Pflicht**.
  - Objektspeicher: S3-kompatibel mit signierten URLs (AWS S3, Cloudflare R2, Scaleway, Supabase Storage).
  - Auth: selbst bauen vs. Bibliothek/BaaS — muss Rollen (`schueler`/`elternteil`) und `parentUserId`-Scoping abbilden.
  - Zahlungen: **Stripe** (Phase 0 — Trial → Subscription, Proration, Familien-Sitze).
  - E-Mail: **zurückgestellt.** Zahlungs-/Abo-/Beleg-Mails laufen über Stripe; ob
    und wie Double-Opt-in-/Reset-Mails versendet werden, wird später entschieden
    (Token-Flow wird aber jetzt schon gebaut).
  - Ein Repo oder getrennt: Monorepo (Marketing + App + API) hält Design-Tokens und Typen synchron.
  - _Pragmatische Default-Empfehlung, falls nichts dagegen spricht: TypeScript-Monorepo, Postgres (managed, EU), S3-kompatibler Objektspeicher, Stripe, ein EU-Hoster mit Staging + Prod._
- [x] **Repo initialisieren:** — _2026-09-04: `git init` (war vorher kein Repo).
      Monorepo-Umbau: `frontend/` → `marketing/`, Root-`*.html` + `assets/` +
      `lesifylog.png` → `app/`, neu `api/` (Fastify-Stub `api/src/index.ts` mit
      `/health`) + `shared/` (leerer `@lesify/shared`-Platzhalter, echte Formeln
      erst Phase 7). `.gitignore`, `README.md`, `LICENSE` (proprietär),
      `app/README.md`, `marketing/README.md` angelegt. Pfad-Referenzen in
      `CLAUDE.md` und `backend-planning.md` (`frontend/`→`marketing/`,
      `assets/`→`app/assets/`) nachgezogen. Noch offen: erster Commit._
- [x] **Tooling:** — _2026-09-04: `pnpm`-Workspace (`pnpm-workspace.yaml`),
      `package.json` (Scripts `dev`/`lint`/`format`/`typecheck`/`test`),
      `tsconfig.base.json` + je `tsconfig.json` in `api/`/`shared/`,
      ESLint 9 Flat-Config (`eslint.config.js`), Prettier
      (`.prettierrc.json`/`.prettierignore`), `.editorconfig`, `.nvmrc`,
      Pre-Commit-Hook via `simple-git-hooks` + `lint-staged`. Aktiv nach dem
      ersten `pnpm install` (Lockfile + `node_modules` stehen dann)._
- [x] **Umgebungen definieren:** — _2026-09-04: `local`/`staging`/`production`
      in `backend-planning.md` §0 + `README.md` beschrieben (je eigene DB,
      eigener Supabase-Bucket, eigene Secrets). `.env.example` im Root committet
      (alle Variablennamen, ohne Werte)._
- [x] **Secret-Management:** — _2026-09-04: Secret-Liste in `backend-planning.md`
      §0 + `.env.example` (`ANTHROPIC_API_KEY`, `DATABASE_URL`, `SUPABASE_URL`,
      `SUPABASE_SERVICE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
      `SESSION_SECRET`). `.env`/`​.env.*` in `.gitignore`, nur `.env.example`
      ausgenommen. Konkreter Secret-Store pro Umgebung wird mit dem Hoster in
      Phase 16 festgelegt._
- [x] **CI-Pipeline (Grundgerüst):** — _2026-09-04: `.github/workflows/ci.yml`
      (GitHub Actions) — bei jedem Push/PR: `pnpm install --frozen-lockfile` →
      `format:check` → `lint` → `typecheck` → `test`. Läuft grün, sobald das
      Lockfile committet ist. Deploy kommt Phase 16._
- [x] **Lokales Dev-Setup dokumentieren:** — _2026-09-04: `pnpm dev`
      (`scripts/dev.mjs`) startet parallel API (:3000), App (:4001),
      Marketing (:4002). Dokumentiert in `README.md`. Eine echte lokale DB
      hängt an der Supabase-Einrichtung (Phase 2)._

---

## Phase 2 — Datenmodell & Datenbank

Grundlage: `backend-planning.md` §1. Reihenfolge so, dass FKs immer schon existieren.

- [x] **Migrations-Werkzeug einrichten** — _2026-09-04: Prisma (`api/prisma/`),
      Scripts `db:migrate`/`db:deploy`/`db:seed`/`db:studio`/`db:reset` in
      `api/package.json`. Migrations-Ordner wird beim ersten `db:migrate`
      angelegt und committet; `db:deploy` läuft später in CI/Deploy (Phase 16).
      Prisma-Migrationen sind vorwärtsgerichtet („down" bei Bedarf als eigene
      Migration)._
- [x] **Enums anlegen** — _2026-09-04: alle 12 als Prisma-Enums in
      `schema.prisma` (`Rolle`, `AboPaket`, `AboArt`, `AboIntervall`,
      `AboStatus`, `DateiTyp`, `DateiStatus`, `NachrichtRolle` (= auch
      `LernzettelRevision.rolle`), `ChatModus` (nullable), `TestklausurStatus`,
      `Ampel`, `KiTonfall`)._
- [x] **Kern-Tabellen** — _2026-09-04: alle 17 Modelle in `schema.prisma`,
      Feldnamen/-typen/`nullable` nach §1. Kein `Thema.mastery`, kein
      `Klausur.note`. `Lernplan.chatMap`/`checklist` als `Json`-Spalten.
      Migration `20260904083856_init` gegen Supabase (eu-west-1) angewandt,
      `api/prisma/migrations/` committet._
- [x] **`parentUserId`-Scoping** — _2026-09-04: `userId` auf **allen**
      nutzergebundenen Tabellen denormalisiert (nicht nur Fach/Einstellungen/
      Usage), plus `User.parentUserId` (self-FK) für Kind-Profile. Datentrennung
      über die `userId`-gescopte Query-Schicht (Auth-Middleware, Phase 3) +
      FK-Constraints. **Kein DB-RLS** (Entscheidung 2026-09-04: Supabase-RLS
      braucht Supabase-Auth, die wir nicht nutzen) — als spätere Härtung offen._
- [x] **Indizes** — _2026-09-04: `@@index` auf allen FK-Spalten,
      `Chat.aktualisiertAm`, `Datei.status`, `Klausur.datum`;
      `@@unique([userId, monat])` auf `Usage`._
- [ ] **Seed-Skript** — _2026-09-04 (teilweise, ausgeführt): `api/prisma/seed.ts`
      gegen Supabase gelaufen — Demo-User + Einstellungen + Abo + Usage, alle
      5 Fächer / 15 Themen, 6 Chats (+14 Nachrichten), 5 Lernzettel
      (+4 Revisionen), 6 Dateien, 11 Klausuren.
      **Fehlt noch:** Testklausuren + Aufgaben + TestklausurErgebnis +
      Vorbereitungsstand + Lernpläne — werden zusammen mit Phase 7 (Noten-/
      Ampel-/lernplanStatus-Logik) portiert._
- [x] **backend-planning.md aktualisieren** — _2026-09-04: §1 um „Umsetzung:
      Prisma-Schema" ergänzt (userId-Denormalisierung, `email` nullable+unique,
      1:1-`unique` auf Lernplan-Testklausur-FKs, Enum-Namen, Löschverhalten,
      RLS-Entscheidung). §0 „Umsetzungs-Ebene" auf „Prisma in Benutzung"
      aktualisiert._

---

## Phase 3 — Auth

Beliefert `marketing/login.html`, `registrieren.html`, `passwort-vergessen.html`.
Endpunkte: `backend-planning.md` §4 „Auth", Regeln §5.

- [x] **Passwort-Hashing** — _2026-09-04: argon2id via `@node-rs/argon2` (prebuilt,
      kein Build-Step), `m=19456,t=2,p=1`. `api/src/lib/password.ts`, Unit-Tests._
- [x] **`POST /auth/registrieren`** — _2026-09-04: `{rolle,name,klassenstufe,email,
      passwort}` → `User` + leerer `Einstellungen`-Satz, `trialEndetAm = +14 Tage`,
      kein `Abo`. `VerificationToken` (email_bestaetigung, 7 Tage). Doppelte
      E-Mail → 409. Dev gibt den Token in der Antwort zurück (kein Mailversand)._
- [x] **`POST /auth/email-bestaetigen`** — _2026-09-04: `{token}` → `emailVerifiedAt`,
      Einmal-Token (`eingeloestAm`), abgelaufen/verbraucht → 400._
- [x] **`POST /auth/login`** — _2026-09-04: `{email,passwort,angemeldetBleiben?}` →
      opaker Bearer-Token, DB-`Session` (7 bzw. 90 Tage). Timing-Angleich gegen
      Dummy-Hash bei unbekannter E-Mail. Falsch → 401._
- [x] **`POST /auth/logout`** — _2026-09-04: löscht die `Session`-Zeile zum
      Bearer-Token (idempotent, immer 200)._
- [x] **`POST /auth/passwort-vergessen`** — _2026-09-04: immer 200, entwertet
      offene Reset-Token, legt neuen an (1 Tag); Dev gibt `resetToken` zurück._
- [x] **`POST /auth/passwort-zuruecksetzen`** — _2026-09-04: `{token,neuesPasswort}`,
      Token einmalig + befristet, setzt Passwort **und löscht alle Sessions**._
- [x] **Schul-SSO gestrichen** — _kein `/auth/sso/*`; `marketing/login.html` hat
      keinen SSO-Block mehr (schon Phase 0)._
- [x] **Auth-Middleware** — _2026-09-04: `app.requireAuth` (preHandler) prüft den
      Bearer-Token gegen `Session`, setzt `request.userId`. `GET /auth/me` nutzt
      sie bereits; ab Phase 4 hängt sie an allen Ressourcen-Endpunkten.
      Eltern-Aggregat-Sicht: Phase 12._
- [x] **E-Mail-Verifikation + Trial testen** — _2026-09-04: `api/src/routes/auth.test.ts`
      fährt den kompletten Flow gegen die echte Supabase-DB (registrieren →
      login → /me → bestätigen (2×) → vergessen → zurücksetzen → logout),
      23 Tests grün. DB-Tests via `describe.runIf(DATABASE_URL)` — in CI
      übersprungen, bis dort eine Test-DB steht (Phase 14/16)._
- [x] **backend-planning.md §1/§5** — _2026-09-04: §1 „Auth-Tabellen" (Session,
      VerificationToken) ergänzt, §5 „Umsetzung" mit Hashing/Session-/Token-/
      Timing-Details, §4 um `GET /auth/me`. Eltern-Kind-Mechanik bleibt
      zurückgestellt (nur `rolle` gespeichert)._

---

## Phase 4 — Kern-API ohne KI

Alles aus `backend-planning.md` §4 außer den KI-Workflows. Ziel: die App läuft
echt mit Multi-User, KI-Antworten noch als deterministischer Platzhalter.

> _2026-09-04: umgesetzt in 3 Commits — 4a `d676fb0` (CRUD), 4b/4c `6540aa7`
> (Chats + Klausuren/Lernplan/Testklausur-Skelett). Alle Endpunkte
> `userId`-gescoped, `requireAuth` als Plugin-preHandler. Tests: 401-ohne-Token
> + volle Flows gegen Supabase (`runIf DATABASE_URL`), 55 grün._

- [x] **Fächer** — _`GET/POST /faecher`, `PATCH /faecher/:id` (nur `farbe`,
      Default reihum aus `FACH_COLOR_KEYS`), `GET /faecher/:id/themen`. `icon`
      nur bei Erstellung, geprüft gegen `FACH_PRESETS`._
- [x] **Themen** — _`GET /themen` (Aggregat mit Fachname/Farbe), `POST /themen`,
      `GET /themen/:id` inkl. echter Zählwerte + Kurzlisten (5 je Typ)._
- [x] **Chats** — _`GET /chats(?fachId=)`, `POST /chats` (leere Zeile; Client
      ruft erst beim ersten Senden), `GET /chats/:id` inkl. Nachrichten,
      `POST /chats/:id/nachrichten` (User-Nachricht + deterministische
      Platzhalter-KI-Antwort, Titel-Kürzung beim 1. Mal, `nachrichtenUsed++`,
      `chatMap` bei `lernplanKontext` idempotent)._
- [x] **Lernzettel (CRUD-Teil)** — _`GET /lernzettel/:id` (Content + Revisionen
      + `freeMessagesUsed`). Erstell-/Revisions-KI: Phase 6._
- [x] **Dateien (Metadaten-Teil)** — _`GET /dateien(?themaId=)`,
      `GET /dateien/:id`. Upload/`/inhalt`: Phase 5._
- [x] **Klausuren + Lernplan** — _`POST /klausuren` legt in **einer** Transaktion
      `Klausur` + Testklausur 1 (+ Platzhalter-Aufgaben) + `Lernplan` an.
      `GET /klausuren(/:id)`. Kein `PATCH /klausuren/:id`. „Geschrieben" bleibt
      client-seitig aus `datum`._
- [x] **Lernplan-Endpunkte** — _`GET /lernplaene/:id` + `/klausuren/:id/lernplan`
      liefern den **Rohzustand** (berechneter Zustand = Phase 7),
      `PATCH /lernplaene/:id/checklist` (`{tag,key,checked}` → `checklist`-JSON;
      `{tag,checked}` → `tageErledigt`-Legacy bis Phase 7),
      `PATCH /lernplaene/:id` (`chatMap`-Eintrag),
      `GET /lernplaene/:id/lernzettel/dokument` (Markdown).
      `testklausur2` / `.../lernzettel`: Phase 6._
- [x] **Testklausuren (Skelett)** — _`GET /testklausuren/:id` (+`/dokument`),
      `POST /testklausuren/:id/loesung` (JSON-Skelett `{geloesteDateiId}` →
      Status `geloest`; multipart = Phase 5). `POST /testklausuren` + `/analyse`
      + 3.-Aufruf-Riegel: Phase 6._
- [x] **Usage** — _`GET /usage` → vier `{used,limit}` + `resetDatum` + `planName`
      + `paket`. Zähl-/Reset-/Durchsetzungs-Logik: Phase 8. Zähler wird bereits
      hochgezählt (`lib/usage.ts`, Upsert)._
- [x] **Profil & Einstellungen** — _`GET/PATCH /user`, `GET/PATCH
      /user/einstellungen` (Teilupdate, `upsert`, jeder Toggle einzeln)._
- [x] **Suche** — _`GET /suche?q=` über Fach-/Themen-Name + Chat-/Lernzettel-/
      Klausur-/Testklausur-Titel + Datei-Name via `contains`+`mode:'insensitive'`,
      Antwortform `[{type,label,icon,items:[{title,sub,href,fachId,fachName}]}]`._
- [x] **Kontakt** — _`POST /kontakt` (kein Login), Honeypot-Feld `website` +
      In-Memory-IP-Limit; Ziel (Support-Postfach/Ticket) noch offen → nur
      strukturiertes Logging (`TODO` im Code + §8)._
- [x] **Alle Endpunkte gegen `backend-planning.md` §4 abgleichen** — _§4
      angemerkt: `GET /auth/me` neu; `POST /chats` legt eine leere Zeile an
      (Lazy-Verhalten Client-seitig); Lösung-Upload-Skelett nimmt JSON statt
      multipart bis Phase 5; berechneter Lernplan-Zustand explizit Phase 7._

---

## Phase 5 — Datei-Speicherung & async Verarbeitung

`backend-planning.md` §6.

- [ ] **Objektspeicher-Bucket je Umgebung** (EU-Region), Zugriff nur über
      **zeitlich begrenzte signierte URLs**, nie öffentliche Links.
- [ ] **`POST /themen/:id/dateien`:** multipart, **5-MB-Limit serverseitig hart
      validiert** (zusätzlich zum Client), MIME → `typ` (`pdf`/`doc`/`img`),
      Objekt-Key in `Datei.speicherPfad`, Status `verarbeitung`.
- [ ] **Verarbeitungs-Queue/Job:** Datei → KI-Zusammenfassung (Phase 6, Prompt 01)
      → Status `bereit`; bei Fehler Status `fehler`.
- [ ] **Status-Abfrage durch den Client:** **Polling** von `GET /dateien/:id`
      (kurzer Backoff, Stopp bei `bereit`/`fehler` oder ~60 s Timeout) — kein
      Websocket/SSE (Entscheidung 2026-09-04).
- [ ] **`GET /dateien/:id/inhalt`:** signierte URL / Stream der Originaldatei
      (PDF inline, Bild-Vorschau, Download-Button). Ersetzt die simulierte
      Vorschau des Prototyps.
- [ ] **Testklausur-Lösungs-Uploads** laufen über denselben Mechanismus, landen
      aber **nicht** in der Themen-Dateiliste und zählen **nicht** gegen das
      Content-Aufnahmen-Limit (Phase-0-Entscheidung).
- [ ] **backend-planning.md §6/§8** auf den umgesetzten Stand bringen.

---

## Phase 6 — KI-Integration (Claude API)

Prompt-Entwürfe: `Konzept-texts/prompts/01`–`12` + `00-overview.md`.
Preise/Modellwahl-Prinzipien: `00-overview.md` §7.

- [ ] **Anthropic-Client kapseln:** ein Modul mit Retry, Timeout, `response.usage`-
      Logging pro Call (für die Kostenkalibrierung), Modellwahl als Config je
      Call-Typ (nicht fest verdrahtet).
- [ ] **KI-Vorab-Filter** (Phase 0, Details `backend-planning.md` §3): vor jedem
      Chat-/Generierungs-Call drei Prüfungen, bei Treffer **kein KI-Call, kein
      Usage-Verbrauch, Popup-/Toast-Meldung**:
  - **Themen-Guard:** Anfrage schulrelevant? Sonst abgewiesen. Umsetzung: günstige
    Klassifikation (kleiner Call oder Regelwerk) + fester Riegel im System-Prompt
    aller Modi.
  - **Größen-Guard:** Anfrage / zusammengebauter Kontext über einer Token-/
    Zeichen-Grenze → abgewiesen, wird gar nicht an die KI geschickt.
  - **Spam-Guard:** identische/near-identische Nachricht in Folge, Flooding →
    abgewiesen/gedrosselt.
  - Trefferquoten + Fehlalarme loggen (Kalibrierung).
- [ ] **Prompt-Templates 01–12 als Code-Vorlagen** anlegen, jeweils mit
      Platzhaltern (`{{tonfallBaustein}}` etc.), festen JSON-Schemas für alle
      Calls, die in DB-Felder schreiben (Tool-Use / structured output), Freitext
      nur für die vier Chat-Antworten (03–06) und `antwortText` der
      Lernzettel-Revision (09).
- [ ] **Notenableitung strikt deterministisch:** das Modell gibt **nur Prozent**
      zurück; `note`, `ampel`, Bestanden-Status rechnet das Backend
      (Formel §2 / Phase 7). Kein Rundungs-Drift zwischen KI und Notenlogik.
- [ ] **Prompt Caching:** `cache_control`-Breakpoint ans **Ende des kompletten
      System-Prompts** der Chat-Modi (Themen Memory + Tonfall + Modus sind stabil,
      nur `messages` wächst).
- [ ] **Call 01 — Datei-Zusammenfassung** (`POST /themen/:id/dateien`, async aus
      Phase 5): Rohdatei **einmalig** an die KI, danach nur noch die gespeicherte
      `zusammenfassung` verwenden.
- [ ] **Call 02 — Themen Memory:** Kontext-Block aus allen Lernzetteln (voll) +
      Datei-Zusammenfassungen + bisherigen Chat-Titeln. Grundfall = einfache
      Konkatenation; Verdichtungs-Pipeline nur als markierte Erweiterung bei
      Kontext-Überlauf.
- [ ] **Calls 03–06 — Chat-Antworten** (`POST /chats/:id/nachrichten`):
      modusabhängiger System-Prompt (erklären / hausaufgaben / üben / zusammenfassen)
      + neutraler „freie Frage"-Prompt, wenn `modus = null`. Sokratik-Grad je Modus
      wie in `00-overview.md` §2. Antwort streamt zurück.
- [ ] **Call 07 — Chat-Titel:** günstigste/schnellste Modellklasse, ~20 Output-
      Tokens, an den ersten `POST /chats/:id/nachrichten` angehängt (Phase-0-
      Entscheidung — kein eigener Endpunkt).
- [ ] **Call 08 — Lernzettel-Erstellung** (`POST /themen/:id/lernzettel`):
      vollautomatisch aus allen Chats + Dateien des Themas. Usage: `lernzettelUsed`.
- [ ] **Call 09 — Lernzettel-Revision** (`POST /lernzettel/:id/revisionen`):
      Such-/Ersetzen-Patches statt Vollersatz, gibt nur den geänderten Ausschnitt
      zurück. Erste 10 Revisionen je Lernzettel gratis (`freeMessagesUsed`).
- [ ] **Call 10 — Testklausur-Erstellung** (`POST /testklausuren`): **ein** Call
      für alle Aufgaben (1 pro Thema, keine Multiple-Choice). Gleicher Call für
      Testklausur 1 (alle Themen) und Testklausur 2 (nur schwache/wackelige).
      `POST /lernplaene/:id/testklausur2` ruft ihn mit kleinerem `themaIds`-Umfang.
- [ ] **Call 11 — Testklausur-Analyse** (`POST /testklausuren/:id/analyse`):
      **ein** Call wertet das komplette Lösungsdokument aus → `TestklausurErgebnis`
      (eingefroren) + `Vorbereitungsstand` (dreistufige Ampel je Thema, direkt bei
      der Analyse via `noteAmpel`). Status → `analysiert`.
- [ ] **Call 12 — Lernplan-Lernzettel** (`POST /lernplaene/:id/lernzettel`,
      Tag 3/4/6): kurzes „wichtigste Dinge zum Merken"-Markdown je Thema,
      **angehängt** statt neu geschrieben.
- [ ] **Niveau-Hinweis:** jeder generierende Prompt endet mit der Klassenstufe
      (`Fach.klasse`, ersatzweise `User.klasse`).
- [ ] **Kosten-Log auswerten:** nach ein paar Testläufen `response.usage` gegen die
      Schätzungen in `00-overview.md` §7 / `PLAN_ECONOMICS` halten.
- [ ] **backend-planning.md §3** (Call-Tabelle) auf den umgesetzten Stand bringen.

---

## Phase 7 — Notenlogik & Lernplan-Berechnung serverseitig

Der gesamte abgeleitete Zustand muss **bit-genau** zu `data.js` passen.

- [ ] **`shared/`-Modul für die reinen Formeln:** `note = round(6 − prozent/100 × 5, 1)`,
      `noteAmpel(note)` (≤2.5 grün · ≤4.0 gelb · sonst rot), Notenlabels,
      `AMPEL_GRUEN_MAX_NOTE = 2.5`. Wird von Frontend und Backend genutzt.
- [ ] **`lernplanStatus` serverseitig nachbauen:** aktueller Tag, schwache Themen,
      Fokus-/Kurz-Aufteilung ab `LERNPLAN_FOKUS_LIMIT = 3`, `intensitaet`
      (`null`/`tief`/`normal`/`triagiert`), Tag-1↔Tag-5-Vergleich, „nichts zu tun"-
      Kurzschluss bei komplett starker Testklausur 1, `letzteTestNote`/`letzteTestNr`.
- [ ] **`klausurNote(klausurId)`** → `{note, testNr, testklausur} | null`: Note der
      zuletzt **analysierten** Testklausur (2, sonst 1), sonst Status-Chip.
- [ ] **Checklist-Keys je Lerntag** deterministisch aus `fokusThemen`/`kurzThemen`/
      `intensitaet` bzw. (Tag 6) `stubborn`/`aufgefrischt` berechnen — dieselben
      Keys wie in `data.js` **und** `app.js` (die Key-Liste wird an beiden Stellen
      gepflegt).
- [ ] **`GET /lernplaene/:id`** liefert exakt diesen berechneten Zustand.
- [ ] **Paritäts-Tests:** Testfälle mit denselben Eingaben durch die `data.js`-
      Funktionen **und** das Backend schicken, Ergebnisse müssen identisch sein
      (Note, Ampel, aktueller Tag, schwache Themen, Testklausur-2-Bedarf).
- [ ] **Weiche Tagesübergänge:** kein Zugriffs-Gate — Tage in beliebiger
      Reihenfolge abschließbar, Testklausur 2 jederzeit nach Analyse von
      Testklausur 1 startbar.

---

## Phase 8 — Usage-Tracking & Limits

`backend-planning.md` §7.

- [ ] **`Lesify.PLAN_LIMITS` serverseitig spiegeln** (Quelle: `stripe-config.js` →
      `limits`), vier Zähler pro Sitz: Nachrichten, Content-Aufnahmen, Lernzettel,
      Testklausuren.
- [ ] **Zähl-Logik:** jede User-Chat-Nachricht zählt; Lernzettel-Revisionen erst
      **ab der 11.** je Lernzettel; jede Datei (Chat-Anhang oder „Dateien"-Upload)
      als Content-Aufnahme; **Testklausur-Lösungs-Uploads sind ausgenommen** (Phase 0).
- [ ] **Monatlicher Reset:** **fix zum Monatsersten** (Phase 0), Cron **oder** lazy
      beim ersten Request nach Monatswechsel. **Kein Übertrag.**
- [ ] **Harte serverseitige Durchsetzung** der Paketgrenzen. Beim Upgrade gelten
      neue Grenzen sofort, verbrauchte Zähler bleiben stehen.
- [ ] **Limit-erreicht-Verhalten (Phase 0):** **Hard-Stop nur des betroffenen
      Features** — z. B. Datei-Limit erreicht ⇒ Uploads gesperrt, Chats und
      (Test-)Klausuren laufen normal weiter. Kein Soft-Warning, keine erzwungene
      Upgrade-Aufforderung. Pro Zähler eine eigene, klare API-Fehlerantwort.
- [ ] **Trial:** in der **14-tägigen** Testphase (`trialEndetAm`, kein `Abo`) gelten
      die **Premium**-Kontingente. Nach 14 Tagen bucht Stripe automatisch den
      gewählten Tarif ab (siehe Phase 9); nur bei vorheriger Kündigung endet der
      Zugang — dann Schreib-Aktionen gesperrt.
- [ ] **`GET /usage`** liefert Zähler + Limit + `resetDatum` + `planName`; der
      Ring zeigt das Maximum der vier Quoten, `null`-Limit zählt als 0.
      Warnschwellen grün 0–33 % / gelb 33–66 % / rot ≥ 66 % (wie `uwRatioCls`).

---

## Phase 9 — Abo & Abrechnung

`backend-planning.md` §4 „Abo & Abrechnung", §1 `Abo`/`KindProfil`. Anbieter: **Stripe** (Phase 0).

- [ ] **Stripe-Konto** (Test- + Live-Modus), Produkte/Preise dort anlegen passend
      zu `stripe-config.js` (`plans`, `family`, Intervalle, Angebot).
- [ ] **Trial-Modell (Phase 0):** Bei der Registrierung wählt die/der Nutzer:in
      Tarif + Intervall und hinterlegt eine Zahlungsart (`frontend/checkout.html`).
      Es wird **sofort** eine Stripe-Subscription mit **`trial_period_days: 14`**
      angelegt (`Abo.status = test`, `Abo.trialEndetAm`). **Nach 14 Tagen bucht
      Stripe automatisch ab**, sofern nicht vorher gekündigt — kein manueller
      „jetzt bezahlen"-Schritt.
- [ ] **`GET /abo`:** `paket`, `art`, `sitze`, `intervall`, `status`, `angebot`,
      `trialEndetAm`, `aktuellerZeitraumEnde` + abgeleitete Kontingente je Sitz.
- [ ] **`POST /abo`:** Subscription anlegen (Tarif/Intervall/Sitze + 14-Tage-Trial),
      aktives `angebot` fixieren. **MwSt. nicht ausweisen** (Kleinunternehmer —
      nicht auf der Website erwähnen).
- [ ] **`PATCH /abo`:** Tarif-/Intervall-/Sitzwechsel mit Proration;
      Sitzverringerung erst zum `aktuellerZeitraumEnde`.
- [ ] **`POST /abo/kuendigen`** (zum Zeitraumende, kein Sofort-Verlust),
      **`POST /abo/pausieren`** (Sommerpause, Inhalte bleiben).
- [ ] **`POST /abo/webhook`:** Zahlungsergebnisse → `status`
      (`aktiv`/`zahlung_offen`/…), idempotent, Signatur prüfen.
- [ ] **`GET/POST/DELETE /abo/kinder`:** Kind-Profile im Familien-Abo (max.
      `Abo.sitze`, 2–4). Detaillierte Sitz-/Einladungsmechanik ist zurückgestellt
      (Phase 0) — fest: **beim Entfernen eines Sitzes werden dessen Inhalte
      gelöscht.**
- [ ] **Rechnungsstellung** + Umgang mit fehlgeschlagenen Zahlungen (Retry,
      Mahnlogik, Zugriff bei `zahlung_offen`).
- [ ] **backend-planning.md §1/§7/§8** (Preise, Limits, offene Punkte) auf den
      final beschlossenen Stand bringen.

---

## Phase 10 — Benachrichtigungen & Cron

Phase 0: **keine eigene E-Mail-Infrastruktur.** Zahlungs-/Abo-/Beleg-Mails
übernimmt Stripe. Eigener Versand von Klausur-Erinnerung und Wochenreport ist
**zurückgestellt** — die Toggles `erinnerungVorKlausuren` /
`woechentlicheZusammenfassung` bleiben in den Einstellungen, aber ohne Wirkung,
bis das Thema wieder aufgemacht wird.

- [ ] **Stripe-Mails konfigurieren** (Beleg-/Zahlungs-/Kündigungs-Mails im
      Stripe-Dashboard aktivieren, Wording prüfen).
- [ ] **Double-Opt-in-/Reset-Versand:** Entscheidung aus Phase 0 abwarten; bis
      dahin existiert nur der Token-Flow (Phase 3) ohne Versandweg.
- [ ] **Cron-Infrastruktur** aufsetzen — zunächst nur für den **Usage-Reset zum
      Monatsersten** und die **1-Jahres-Datenlöschung** (Phase 13), mit Monitoring,
      dass die Jobs laufen.
- [ ] _(zurückgestellt)_ `erinnerungVorKlausuren`, `woechentlicheZusammenfassung`,
      Trial-Reminder.

---

## Phase 11 — Frontend an das echte Backend anbinden

Ziel: `assets/js/data.js` wird durch einen API-Client **mit identischer
Funktionssignatur** ersetzt (`backend-planning.md` §9). Die Seiten bleiben
sonst unverändert.

- [ ] **API-Client `assets/js/api.js`** mit denselben Namen wie `data.js`
      (`Lesify.addTestklausur` → `POST /testklausuren`, `Lesify.lernplanStatus` →
      `GET /lernplaene/:id`, `Lesify.usage` → `GET /usage`, `LesifyUI.search` →
      `GET /suche?q=`, …). Vollständige Mapping-Liste in §9 abarbeiten.
- [ ] **Auth-Gate für `app/`:** ohne gültige Session → Redirect auf
      `marketing/login.html`. Session-Handling (Cookie/Token) im Client.
- [ ] **Marketing-Formulare verdrahten:** Login, Registrierung, Passwort-Reset,
      Kontakt rufen jetzt die echten Endpunkte (statt nur Toast).
      Rollen-Auswahl (Elternteil/Schüler:in) an `POST /auth/registrieren`.
- [ ] **Fehler-/Ladezustände + Guard-Popups:** Limit erreicht, Datei zu groß,
      KI-Timeout, Offline — und die **Vorab-Filter-Meldungen** (nicht schulrelevant /
      Anfrage zu groß / Spam) als Popup/Toast statt stillem Fehlschlag.
- [ ] **Datei-Viewer** (`LesifyUI.openDateiModal`) auf `GET /dateien/:id/inhalt`
      umstellen (echte Vorschau + echter Download statt `.txt`-Ersatz).
- [ ] **Async-Datei-Status** im UI per **Polling** von `GET /dateien/:id`:
      `verarbeitung` → `bereit` ohne Reload.
- [ ] **Abo-/Einstellungs-Bereich in der App:** Tarif ansehen/wechseln/kündigen/
      pausieren, Kind-Profile verwalten, Nutzungsanzeige aus `GET /usage`.
- [ ] **Dev-Switcher entfernen/abschalten,** die keinen Backend-Bezug haben
      (Suche-Varianten, Testklausur-Phasen-Umschalter, Pill-Style) — oder klar
      hinter einen Dev-Flag legen.
- [ ] **Seed-Parität prüfen:** angebundene App auf `staging` sieht identisch aus
      wie der Prototyp mit `SEED`.

---

## Phase 12 — Familien-/Eltern-Features

- [ ] **Kind-Profil-Anlage & -Einladung** (E-Mail-Einladung oder Direktanlage
      durchs Elternkonto), max. `Abo.sitze`.
- [ ] **Kontext-Wechsel im UI:** Elternkonto wählt aktives Kind-Profil; jedes
      Profil hat eigenen `userId`-Scope (eigene Fächer/Themen/Fortschritte).
- [ ] **Eltern-Zusammenfassung:** aggregierte Wochenkennzahlen je Kind, **kein**
      Chat-Wortlaut; Opt-out fürs Kind nach Phase 0.
- [ ] **Sitz-Änderungen:** hinzufügen (Proration sofort), entfernen (zum
      Zeitraumende), Umgang mit Inhalten eines entfernten Sitzes wie beschlossen.

---

## Phase 13 — Recht, Datenschutz, Jugendschutz

Kritisch, weil Zielgruppe minderjährig ist.

- [ ] **Impressum / Datenschutzerklärung / AGB** mit echten Angaben füllen
      (`marketing/impressum.html`, `datenschutz.html`, `agb.html`) — rechtlich
      prüfen lassen.
- [ ] **Auftragsverarbeitung mit Anthropic** (und allen Sub-Prozessoren:
      Hosting, DB, Objektspeicher, E-Mail, Zahlungsanbieter) abschließen und im
      Verzeichnis der Verarbeitungstätigkeiten führen.
- [ ] **Eltern-/Minderjährigen-Einwilligung** im Registrierungsflow umsetzen
      (Ablauf aus Phase 0), inkl. nachweisbarer Doku.
- [ ] **Datenexport & Konto-Löschung** (DSGVO Art. 15/17): Endpunkt + UI, harte
      Löschung inkl. Objektspeicher-Dateien und KI-Logs.
- [ ] **Cookie-/Consent-Banner** nur wenn nötig (kein Tracking = kein Banner);
      alles Nicht-Essentielle standardmäßig aus.
- [ ] **1-Jahres-Löschung umsetzen (Phase 0):** Cron-Job löscht **alle Inhalte**
      (Dateien inkl. Objektspeicher, Klausuren, Chats + Nachrichten, Lernzettel,
      Testklausuren, Lernpläne) automatisch ein Jahr nach Erstellung. Diese Frist
      in der Datenschutzerklärung nennen **und** in den Einstellungen sichtbar
      machen ([einstellungen.html](einstellungen.html) bzw. beste Stelle).
- [ ] **KI-Nutzungshinweis** für Schüler:innen/Eltern (Antworten können falsch
      sein, keine Leistungsbewertung durch die Schule etc.).

---

## Phase 14 — Qualitätssicherung

- [ ] **Unit-Tests** für alle reinen Berechnungen (Notenformel, `lernplanStatus`,
      Checklist-Keys, Usage-Zählung) — inkl. der Paritäts-Tests aus Phase 7.
- [ ] **API-Integrationstests** je Endpunkt (Happy Path + `userId`-Scoping +
      Limit-Grenzen + Fehlerfälle).
- [ ] **End-to-End-Test der Kern-Flows** gegen `staging`: Registrierung →
      Verifikation → Fach/Thema → Chat → Datei → Lernzettel → Klausur → Lernplan
      Tag 1–7 → Testklausur 1+2 → Abo abschließen → kündigen.
- [ ] **KI-Calls mit aufgezeichneten Fixtures testen** (deterministisch, ohne bei
      jedem CI-Lauf echt zu zahlen); zusätzlich ein manueller Smoke-Test gegen die
      echte API pro Release.
- [ ] **Lasttest** der teuren Pfade (Chat, Analyse) — Timeouts, gleichzeitige
      KI-Calls, DB-Verbindungslimit.
- [ ] **Sicherheitsreview:** Auth, `userId`-Scoping, signierte URLs, Upload-
      Validierung (Typ/Größe/Inhalt), Rate-Limiting, Webhook-Signaturen,
      Injection, Secrets nicht im Client.
- [ ] **Barrierefreiheit & Responsiveness** der App- und Marketing-Seiten
      (Fokuszustände sind im Design schon angelegt) durchgehen.
- [ ] **Fehler-Budget definieren:** was blockiert den Launch, was ist Post-Launch-Fix.

---

## Phase 15 — Betrieb & Observability

- [ ] **Strukturiertes Logging** (ohne personenbezogene Inhalte / Chat-Texte im Log).
- [ ] **Error-Tracking** (Backend + Frontend) mit Alerting.
- [ ] **Uptime-/Healthcheck-Monitoring** für API, DB, KI-Erreichbarkeit, Cron-Jobs.
- [ ] **DB-Backups** (automatisch, regelmäßig, Restore einmal echt getestet).
- [ ] **KI-Kosten-Dashboard:** `response.usage` je Call-Typ aggregieren, gegen
      `PLAN_ECONOMICS` (API-Kosten/Monat je Sitz) halten, Alarm bei Ausreißern.
- [ ] **Rate-Limiting produktiv scharf schalten** nach den Regeln in
      `backend-planning.md` §7 („Rate-Limiting & Missbrauchsschutz"): Limits pro
      Endpunkt-Klasse (Schlüssel User + IP), `429` + `Retry-After`, Startwerte nach
      echtem Traffic kalibrieren.
- [ ] **Vorab-Filter + Missbrauchssignale überwachen** (Phase 6): Trefferquoten von
      Themen-/Größen-/Spam-Guard und Fehlalarm-Rate im Blick behalten, Schwellen /
      Prompt nachziehen. Temporäre Sperren bei wiederholten Guard-Treffern /
      Login-Fehlversuchen / Upload-Flooding.
- [ ] **Runbook:** was tun bei KI-Ausfall, Zahlungsanbieter-Ausfall,
      DB-Überlastung, Datenschutz-Anfrage.

---

## Phase 16 — Deployment & Go-Live

- [ ] **Domain + DNS + TLS** für App und Marketing (EU-Hosting bestätigt).
- [ ] **CI/CD vervollständigen:** Merge auf `main` → Deploy auf `staging`;
      manueller Promote `staging` → `production`. Migrationen laufen automatisch,
      rückrollbar.
- [ ] **Prod-Secrets & -Konfiguration** final setzen (Zahlungsanbieter Live-Keys,
      Anthropic-Prod-Key mit Budget-Limit, E-Mail-Domain verifiziert/SPF/DKIM).
- [ ] **Staging-Vollprobe:** kompletter E2E-Flow inkl. echter Test-Zahlung.
- [ ] **Launch-Checkliste:** Impressum/Datenschutz/AGB live, Kontaktweg
      funktioniert, Reminder-Cron läuft, Backups laufen, Monitoring grün,
      Rollback-Weg dokumentiert.
- [ ] **Soft-Launch** mit kleiner Nutzergruppe, Fehler + KI-Kosten beobachten.
- [ ] **Öffentlicher Launch.**

---

## Phase 17 — Nach dem Launch

- [ ] **KI-Kosten vs. Preis-Modell** über echte Nutzung kalibrieren; Limits/Preise
      in `stripe-config.js` + `backend-planning.md` §7/§8 nachziehen, falls nötig.
- [ ] **Themen-Memory-Verdichtung** aktivieren, sobald Kontexte real zu groß werden
      (nicht vorher).
- [ ] **Suche** auf echten Index heben, falls die Substring-Variante nicht mehr trägt.
- [ ] **Zurückgestellte Themen wieder aufmachen:** Eltern-Kind-Modell, Familien-Sitz-
      Mechanik (Proration/Einladung), Klausur-Erinnerung + Wochenreport-Versand,
      manueller Lernplan-Neustart, Double-Opt-in-/Reset-Mail-Versand.
- [ ] **Feedback-Schleife** mit Schüler:innen/Eltern; Backlog priorisieren.
- [ ] **`backend-planning.md` bleibt das lebende Dokument** — bei jeder Änderung an
      Datenmodell, Notenlogik, Limits oder Endpunkten zuerst dort einpflegen.
