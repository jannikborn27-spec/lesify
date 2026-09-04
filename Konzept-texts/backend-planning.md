# Lesify — Backend Planning

> Lebendes Dokument. Wird bei jeder Änderung an Datenmodell, API-Anforderungen
> oder Backend-Logik aktualisiert (siehe `CLAUDE.md` im Projekt-Root für die
> Update-Pflicht). Stand: Frontend-Prototyp (statisches HTML/CSS/JS, Dummy-Daten
> in `app/assets/js/data.js`).
>
> **Neu:** Der Ordner `marketing/` enthält jetzt die öffentliche Marketing-Website
> (Landing, Preise, Vergleich, Funktionen, FAQ, Login, Registrierung, Passwort
> vergessen, Über uns, Kontakt, Impressum, Datenschutz, AGB). Sie ist ein
> eigenständiger statischer Prototyp (`marketing/assets/css/marketing.css`,
> `marketing/assets/js/marketing.js`) im selben Design-System wie die eingeloggte
> App, ohne Backend-Anbindung. Die daraus resultierenden Backend-Anforderungen
> (Auth, Abo/Abrechnung, Kontaktformular, Paket-Limits) sind unten in §1, §4,
> §5, §7, §8 und §11 eingearbeitet. Die auf `marketing/preise.html` genannten
> Preise und Limits sind **Design-Platzhalter**, keine Produktentscheidung.
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
| E-Mail | **zurückgestellt** | Zahlungs-/Abo-/Beleg-Mails über Stripe. Token-Flow für Double-Opt-in/Reset wird gebaut, Versandweg später (§8). |

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
- **API-Hosting:** noch offen (Phase 16). Pflicht: **EU-Region**. Kandidaten mit
  EU-Rechenzentrum: Railway, Render, Fly.io (Region `fra`), Scaleway
  Containers. Nicht jetzt festlegen.

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
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SESSION_SECRET` (E-Mail-Keys
später).

---

## 1. Datenmodell

### User
Im Prototyp der eingeloggten App ein einzelner Nutzer, dessen Name/Klassenstufe
über `einstellungen.html` editierbar ist (Overlay in `localStorage`, kein
Multi-User). Backend braucht echte Multi-User-Fähigkeit von Anfang an —
`name`/`klassenstufe` bleiben editierbar, `initials` wird serverseitig oder
clientseitig aus `name` abgeleitet (erste Buchstaben der ersten zwei Wörter),
nicht separat gespeichert.

Die Marketing-Registrierung (`marketing/registrieren.html`) fragt zusätzlich eine
**Rolle** ab (Elternteil vs. Schüler:in). Bei einem Elternkonto ist die
`email` die der/des Sorgeberechtigten, `name`/`klassenstufe` beziehen sich auf
das Kind. Ein Familien-Abo kann mehrere Kind-Profile bündeln (siehe
`KindProfil` unten); technisch ist jedes Kind-Profil ein eigener,
ressourcengescopeter Account, verknüpft über `parentUserId` + gemeinsames `Abo`.

| Feld | Typ | Hinweis |
|---|---|---|
| id | uuid | |
| name | string | editierbar über Profil-Formular; bei Elternkonto = Name des Kindes |
| klassenstufe | string | z. B. „8. Klasse", editierbar |
| email | string | Login-Kennung; bei Kind-Profilen im Familien-Abo optional/leer |
| rolle | enum | `schueler` \| `elternteil` — aus der Registrierung, steuert u. a. die Eltern-Zusammenfassung |
| parentUserId | uuid (FK, nullable) | gesetzt bei Kind-Profilen, die zu einem Elternkonto/Familien-Abo gehören |
| aboId | uuid (FK, nullable) | aktives `Abo` (siehe unten). Wird i. d. R. **schon bei der Registrierung** gesetzt (Tarif-Wahl + Zahlungsart), `Abo.status` startet auf `test`. `null` nur, falls kein Checkout abgeschlossen wurde |
| trialEndetAm | timestamp (nullable) | Ende der **14-tägigen** kostenlosen Testphase (`createdAt + 14 Tage`). Danach bucht Stripe automatisch ab (→ `Abo.status = aktiv`), außer es wurde vorher gekündigt — dann sind die Schreib-Aktionen (Chat, Uploads, Testklausuren) gesperrt |
| passwordHash | string | serverseitig, nie im Klartext (Prototyp hat keine echte Auth) |
| emailVerifiedAt | timestamp (nullable) | Double-Opt-in nach Registrierung |
| createdAt | timestamp | |

### Abo (Subscription)
Nicht im Prototyp der App enthalten. Ergibt sich aus `marketing/preise.html` +
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
| intervall | enum | `monatlich` \| `jaehrlich` (jährlich = niedrigerer Monatswert, siehe `stripe-config.js`) |
| angebot | string (nullable) | aktive Rabatt-Kampagne, z. B. `schuljahresstart_-20` — fixiert den Angebotspreis für die Vertragslaufzeit |
| status | enum | `test` (14-Tage-Trial) \| `aktiv` \| `gekuendigt` \| `pausiert` (Sommerpause) \| `zahlung_offen` |
| trialEndetAm | timestamp (nullable) | nur bei `status = test`; `createdAt + 14 Tage`. Bei Ablauf ohne Kündigung → Stripe bucht ab, `status → aktiv` |
| aktuellerZeitraumEnde | date | Kündigung wird zu diesem Datum wirksam |
| zahlungsanbieterRef | string (nullable) | Stripe-Referenz (Customer/Subscription), siehe §8 |
| erstelltAm | timestamp | |

### KindProfil (nur Familien-Abo)
`Abo.sitze` Stück pro Familien-Abo (2–4). Reine Verknüpfungssicht auf `User`-Datensätze mit
gesetztem `parentUserId`; getrennte Fächer/Themen/Fortschritte je Kind, das
Elternkonto sieht pro Kind nur die aggregierte Wochen-Zusammenfassung
(`Einstellungen.woechentlicheZusammenfassung`), nicht den Chat-Wortlaut.

### Einstellungen
Ein Datensatz pro User. Aktuell im Prototyp: Benachrichtigungs-Toggles und
KI-Tonfall — Kandidat für spätere Erweiterung (z. B. Sprache, Barrierefreiheit).

| Feld | Typ | Hinweis |
|---|---|---|
| userId | uuid (FK) | |
| erinnerungVorKlausuren | bool | Hinweis ein paar Tage vor einem eingetragenen Klausurtermin — Versandmechanismus (E-Mail/Push) offen, siehe §8 |
| woechentlicheZusammenfassung | bool | wöchentlicher Report zu Fortschritt/offenen Lerntagen — Versandmechanismus offen, siehe §8 |
| kiTonfall | enum | `freundlich` \| `direkt` \| `motivierend` — fließt in den System-Prompt für Chat/Lernzettel/Erklärungen ein |

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
| groesseBytes | int | Limit: 5 MB pro Datei (hart validiert, Backend UND Frontend) |
| speicherPfad | string | siehe §6 |
| status | enum | `verarbeitung` \| `bereit` \| `fehler` |
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
  erhöht `Usage.nachrichtenUsed` (Upsert; harte Grenzen Phase 8) und setzt bei
  `lernplanKontext` den `chatMap`-Eintrag `"<tag>|<modus>|<themaId>"`.
- **`POST /klausuren`** legt in **einer** Transaktion `Klausur` + `Testklausur 1`
  (mit Platzhalter-`Aufgabe` je Thema) + `Lernplan` an und gibt alle drei zurück.
- **`GET /lernplaene/:id`** (und `GET /klausuren/:id/lernplan`) liefern vorerst
  den **Rohzustand** (`checklist`, `tageErledigt`, `chatMap`, `lernzettel`,
  Testklausur-IDs). Der berechnete Zustand (`lernplanStatus`) kommt in Phase 7.
- **`PATCH /lernplaene/:id/checklist`**: `{tag,key,checked}` pflegt das
  `checklist`-JSON; `{tag,checked}` („Tag abschließen") toggelt bis Phase 7 den
  Legacy-Marker `tageErledigt` (die Key-Liste je Tag braucht `lernplanStatus`).
- **`POST /testklausuren/:id/loesung`** nimmt im Skelett JSON
  `{geloesteDateiId}` (bereits vorhandene Datei) statt multipart — der echte
  Upload läuft ab Phase 5 über den Objektspeicher.
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
| GET | `/faecher/:id/themen` | Themen eines Fachs |
| GET | `/themen` | Fächerübergreifende Aggregat-Liste aller Themen (eigene Nav-Seite `themen.html`) |
| POST | `/themen` | `{fachId, name, beschreibung?}` → neues Thema |
| GET | `/themen/:id` | Thema inkl. Stats (Anzahl Chats/Lernzettel/Dateien/Klausuren/Testklausuren) |

### Chats
| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/chats` | Fächerübergreifende Liste aller Chats des Users, neueste zuerst — beliefert den Chat-Verlauf in der linken Spalte von `chat.html` (Claude-artiges Layout: Verlauf links mit „Neuer Chat"-Button, aktiver Chat/leerer Zustand rechts). Optionaler Query-Param `?fachId=` für den Fach-Filter im Verlauf (Prototyp filtert clientseitig; UI: Einfachauswahl „ein Fach oder Alle", Fach-Liste nur aus Fächern mit ≥1 Chat) |
| POST | `/chats` | `{fachId, themaId, modus?}` → neuer Chat, liefert System-Prompt-Kontext-Block. `modus` ist **optional** (Composer-Pills sind nicht mehr pflicht); fehlt er, wird der Chat ohne Modus angelegt (`modus = null`) und der neutrale „freie Frage"-System-Prompt genutzt. Wird im Prototyp erst beim Senden der ersten Nachricht angelegt (nicht schon beim reinen Öffnen von `chat.html`) — gilt jetzt **auch für Lernplan-Deep-Links** (`?fach=…&thema=…&mode=…`): auch die werden erst beim ersten Absenden zum echten Chat, nicht mehr flüchtig gehalten |
| GET | `/chats/:id` | Chat inkl. Nachrichten. Lernplan-Chips können hierher deep-linken (`chat.html?chat=<id>`), wenn `Lernplan.chatMap` den Schritt schon kennt (Fortsetzung statt Neuanlage) |
| POST | `/chats/:id/nachrichten` | `{text, anhangDateiId?, lernplanKontext?: {lernplanId, tag}}` → User-Nachricht speichern, KI-Antwort triggern (streamt zurück), Usage inkrementieren. **Beim ersten Aufruf eines Chats** zusätzlich ein kurzer KI-Call für `Chat.titel` (Prompt `07-chat-titel.md`, günstigste Modellklasse) — kein eigener Endpunkt. Bei gesetztem `lernplanKontext` zusätzlich `Lernplan.chatMap["<tag>\|<chat.modus>\|<chat.themaId>"] = chat.id` setzen (idempotent) — so führt ein zweiter Chip zu Tag+Modus+Thema in denselben Chat |

### Lernzettel
| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/themen/:id/lernzettel` | Vollautomatische Erstellung (KI-Call), liefert fertigen Lernzettel |
| GET | `/lernzettel/:id` | Inhalt + Revisionsverlauf + `freeMessagesUsed` |
| POST | `/lernzettel/:id/revisionen` | `{text}` → KI passt `content` an, gibt aktualisierten Lernzettel + Freikontingent-Stand zurück |

### Dateien
| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/themen/:id/dateien` | multipart Upload (max. 5 MB), Status `verarbeitung` → async KI-Zusammenfassung → Status `bereit`. Der Client erfährt den Wechsel per **Polling** von `GET /dateien/:id` (kurzer Backoff, Stopp bei `bereit`/`fehler` oder ~60 s Timeout) — kein Websocket/SSE (Entscheidung 2026-09-04) |
| GET | `/dateien?themaId=` oder ohne Filter | Aggregat-Liste |
| GET | `/dateien/:id` | Datei-Detail (Metadaten + KI-Zusammenfassung + Status) für den **Datei-Viewer**: Klick auf eine Datei-Karte/-Zeile (`dateien.html`, `thema.html` inkl. Übersicht, Dashboard-Feed) öffnet jetzt ein Modal (`LesifyUI.openDateiModal`) mit Dokument-Ansicht statt zur Themen-Dateien-Unterseite zu navigieren. Im Prototyp aus der bereits geladenen Liste bedient |
| GET | `/dateien/:id/inhalt` | Signierte URL bzw. Stream der Originaldatei — zum Einbetten/Anzeigen im Viewer (PDF inline, Bild-Vorschau) **und** für den „Herunterladen"-Button im Viewer-Modal. Im Prototyp nicht vorhanden — das Modal zeigt eine simulierte Vorschau (Zusammenfassung + Platzhalter) und der Download liefert ersatzweise ein `.txt` mit Metadaten + KI-Zusammenfassung (`Lesify.downloadText`), keinen echten Datei-Inhalt |

### Klausuren (echter Termin)
| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/klausuren` | `{fachId, themaIds, titel, datum}`. **Legt in derselben Operation den `Lernplan` inkl. Testklausur 1 an** (siehe Lernplan-Endpunkte unten) und gibt beide mit zurück. `themaIds` ist ein Array (≥1); die Erstell-Modals wählen mehrere Themen aus (**kein** „×"-Entfernen — Ab-/Anwählen per Klick, Abbruch über den Abbrechen-Button; die Modals haben auch kein „×"-Schließen mehr) und legen neue inline an. `klausuren.html` (`#nk-form`) nutzt ein Pill-Raster mit Dev-Switcher für 5 fach-gefärbte Pill-Styles (`localStorage['lesify:themepick:pill']`: Solid/Soft/Outline/Dot/Bar), `thema.html` (`#mk-form`) eine einfache Dropdown-Variante. Der Client macht vorab N× `POST /themen` und schickt dann alle IDs; ein Batch-`{neueThemen: [{name}]}` im selben Call wäre denkbar, ist aber nicht nötig |
| GET | `/klausuren` / `/klausuren/:id` | Liste / Detail. „Bereits geschrieben" wird client-seitig aus `datum` abgeleitet — kein Server-Filter, kein Statusfeld |

Kein `PATCH /klausuren/:id` — eine `Klausur` hat keine editierbaren Felder (Entscheidung 2026-09-03: die erreichte Note wird nicht erfasst).

### Lernplan (7-Tage-Struktur, 1:1 zur Klausur)
| Methode | Pfad | Zweck |
|---|---|---|
| — | (`POST /klausuren`) | Der Lernplan entsteht **automatisch mit der Klausur** — kein separater Erstell-Aufruf durch den Client. Alternativ als eigener Schritt denkbar: `POST /klausuren/:id/lernplan` |
| GET | `/lernplaene/:id` bzw. `/klausuren/:id/lernplan` | Voller berechneter Zustand (entspricht `Lesify.lernplanStatus`): aktueller Tag, schwache Themen, Tag-1↔Tag-5-Vergleich, ob Testklausur 2 nötig ist, Lernzettel |
| POST | `/lernplaene/:id/testklausur2` | Startet Testklausur 2 (Tag 5), begrenzt auf die an Tag 1 schwachen/wackeligen Themen — intern der normale `POST /testklausuren`-Call, danach `Lernplan.testklausur2Id` gesetzt |
| POST | `/lernplaene/:id/lernzettel` | `{themaIds}` → erzeugt/ergänzt den Lernzettel (KI-Call, hängt Markdown-Abschnitte an), gibt `{content, aktualisiertAm}` zurück |
| GET | `/lernplaene/:id/lernzettel/dokument` | Lernzettel als Markdown-Download |
| PATCH | `/lernplaene/:id/checklist` | `{tag, key, checked}` (ein Punkt) bzw. `{tag, checked}` (alle Punkte des Tages = „Tag abschließen") — pflegt `Lernplan.checklist`; Tag-Erledigt-Status ergibt sich daraus. Override-Muster wie `PATCH /faecher/:id` |
| PATCH | `/lernplaene/:id` (bzw. gebündelt in `POST /chats/:id/nachrichten`) | Setzt einen `chatMap`-Eintrag `"<tag>\|<modus>\|<themaId>" → chatId` (Override-Muster). Im Prototyp: `Lesify.setLernplanChatId`. Client liest die Zuordnung aus `GET /lernplaene/:id` und deep-linkt Lernplan-Chips entsprechend frisch oder als Chat-Fortsetzung |

### Testklausuren (KI-Workflow, 2× pro Lernplan)
| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/testklausuren` | `{fachId, themaIds, titel, klausurId?}` → generiert Aufgaben (KI-Call), Status `erstellt`. Genutzt für Testklausur 1 (alle Themen) **und** Testklausur 2 (nur schwache/wackelige Themen). Ein **dritter** Aufruf zur selben `klausurId` wird hart abgelehnt (max. 2 pro Klausurvorbereitung) |
| GET | `/testklausuren/:id` | Voller Zustand: Aufgaben, Ergebnis (falls vorhanden), Vorbereitungsstand |
| GET | `/testklausuren/:id/dokument` | Aufgaben als Download (Text/PDF) |
| POST | `/testklausuren/:id/loesung` | multipart Upload der Lösung → Status `geloest` |
| POST | `/testklausuren/:id/analyse` | Triggert Auswertung (KI-Call) → `TestklausurErgebnis` + `Vorbereitungsstand` (dreistufige Ampel) → Status `analysiert` |

### Usage
| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/usage` | Aktueller Stand (Nachrichten, Dateien, Reset-Datum) für den Ring/Popover und die Einstellungen-Seite |

### Profil & Einstellungen
| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/user` | Aktuelles Profil (Name, Klassenstufe) — füllt Seitenleiste, Dashboard-Begrüßung und Profil-Formular |
| PATCH | `/user` | `{name, klassenstufe}` → Profil aktualisieren |
| GET | `/user/einstellungen` | Aktuelle Einstellungen (Benachrichtigungen, KI-Tonfall) |
| PATCH | `/user/einstellungen` | Teilupdate einzelner Einstellungen (jeder Toggle/jede Auswahl speichert für sich, kein Sammel-Formular) |

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

### Auth (neu — beliefert `marketing/login.html`, `registrieren.html`, `passwort-vergessen.html`)
| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/auth/registrieren` | `{rolle, name, klassenstufe, email, passwort}` → Konto anlegen, Double-Opt-in-Token erzeugen (Mail-Versand zurückgestellt), **14-Tage-Testphase** starten (`User.trialEndetAm = createdAt + 14 Tage`); Tarif-Wahl + Zahlungsart laufen über den Checkout (`POST /abo`) |
| POST | `/auth/login` | `{email, passwort, angemeldetBleiben?}` → Session/JWT |
| POST | `/auth/logout` | Session invalidieren |
| POST | `/auth/passwort-vergessen` | `{email}` → Reset-Token (immer 200, keine Konto-Enumeration; Versandweg zurückgestellt) |
| POST | `/auth/passwort-zuruecksetzen` | `{token, neuesPasswort}` → Passwort setzen, Token verbrauchen, **alle Sessions löschen** |
| POST | `/auth/email-bestaetigen` | `{token}` → `emailVerifiedAt` setzen (Einmal-Token) |
| GET | `/auth/me` | aktuelle Sitzung → `{user}` (`requireAuth`); für das Frontend-Auth-Gate (Phase 11) |

### Abo & Abrechnung (neu — beliefert `marketing/preise.html` und den späteren Einstellungen-Bereich)
| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/abo` | Aktueller `paket`, `art`, `sitze`, `intervall`, `status`, `angebot`, `trialEndetAm`, `aktuellerZeitraumEnde` + abgeleitete Monatskontingente je Sitz |
| POST | `/abo` | `{paket, intervall, sitze?}` → Checkout-Abschluss bei der Registrierung (Tarif + Intervall wählen, Zahlungsart hinterlegen). `paket` ∈ `starter\|premium\|infinite`; `sitze` 1 (Einzel) oder 2–4 (Familie); `intervall` ∈ `monatlich\|jaehrlich`. Legt bei Stripe Customer + Subscription mit **`trial_period_days: 14`** an (`Abo.status = test`), fixiert das aktive `angebot`. Nach 14 Tagen bucht Stripe automatisch ab → `status = aktiv`. **MwSt. nicht ausweisen** (Kleinunternehmer, nicht auf der Website nennen) |
| PATCH | `/abo` | `{paket?, intervall?, sitze?}` → Tarif-/Intervall-/Sitzwechsel (Up-/Downgrade, Proration). Sitzverringerung erst zum `aktuellerZeitraumEnde` |
| POST | `/abo/kuendigen` | Kündigung zum `aktuellerZeitraumEnde`, kein sofortiger Zugriffsverlust |
| POST | `/abo/pausieren` | Sommerpause (Status `pausiert`), Inhalte bleiben erhalten |
| POST | `/abo/webhook` | Callback des Zahlungsanbieters (Zahlung erfolgreich/fehlgeschlagen → `status`) |
| GET | `/abo/kinder` · POST · DELETE | Kind-Profile im Familien-Abo verwalten (max. `Abo.sitze`, 2–4) |

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
- Rolle bei der Registrierung: `elternteil` vs. `schueler` (siehe §1 `User.rolle`).
  Bei Elternkonten richtet die/der Sorgeberechtigte das Konto ein und willigt in
  die Verarbeitung der Daten des Kindes ein. Die genaue Eltern-Kind-Mechanik ist
  zurückgestellt (Entscheidung 2026-09-03).
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
- **Endpunkte** (Prefix `/auth`): `POST /registrieren`, `POST /email-bestaetigen`,
  `POST /login`, `POST /logout`, `POST /passwort-vergessen`,
  `POST /passwort-zuruecksetzen`, **`GET /me`** (neu — Sitzungs-Check fürs
  Frontend-Auth-Gate, Phase 11).
- **Registrierung:** legt `User` (+ leeren `Einstellungen`-Satz) an,
  `trialEndetAm = jetzt + 14 Tage`, **kein `Abo`**. Erzeugt `VerificationToken`
  (`email_bestaetigung`, 7 Tage). Doppelte E-Mail → `409 email_vergeben`.
- **Kein E-Mail-Versand** (Phase 0): außerhalb von `production` geben
  `/registrieren` und `/passwort-vergessen` den Roh-Token direkt in der Antwort
  zurück (`emailBestaetigungToken` / `resetToken`), damit der Flow ohne
  Versandweg testbar ist. In `production` entfällt das — Versandweg noch offen (§8).
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

### Datenaufbewahrung (Entscheidung 2026-09-03)

**Alle Inhalte** — Dateien (inkl. Objektspeicher-Objekt), Klausuren, Chats +
Nachrichten, Lernzettel, Testklausuren, Lernpläne — werden **automatisch ein Jahr
nach ihrer Erstellung gelöscht** (Cron-Job). Die Frist steht in der
Datenschutzerklärung **und** sichtbar in den Einstellungen. Ersetzt die frühere
offene „Archivierungs"-Frage.

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
Themen-Guard-Treffer, viele fehlgeschlagene Logins, Upload-Flooding.

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
- [x] **Benachrichtigungs-Versand**: **keine eigene E-Mail-Infrastruktur.** Wichtige Mails (Zahlung/Abo/Beleg) über Stripe. `erinnerungVorKlausuren` / `woechentlicheZusammenfassung` bleiben als wirkungslose Toggles, Versand zurückgestellt.
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

### Weiterhin offen

- [ ] **Preis-Feinheiten**: Angebotsdauer/-verlängerung, Jahrespreis-Rundung, Bindung des Angebotspreises an den Vertrag.
- [ ] **Eltern-Kind-Modell**: ein Account mit Kind-Profilen vs. getrennte verknüpfte Accounts; Ablauf der Eltern-/Minderjährigen-Einwilligung bei der Schüler:in-Rolle.
- [ ] **Familien-Paket-Mechanik**: Sitz nachträglich hinzufügen/entfernen (Proration, Downgrade zum Zeitraumende), Einladungsfluss pro Kind.
- [ ] **Familien-Abo-Sichtbarkeit**: Umfang der Eltern-Zusammenfassung (Kennzahlen, Frequenz, Opt-out fürs Kind).
- [ ] **Kontaktformular** (`marketing/kontakt.html`): Zielsystem (Support-Postfach/Ticketsystem). Spam-Schutz = IP-Rate-Limit + Honeypot-Feld (kein Captcha), Feinheiten offen.
- [ ] **Double-Opt-in-/Reset-Mail-Versand**: Token-Flow steht, Versandweg noch offen (keine eigene E-Mail-Infrastruktur beschlossen).
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
alle fach-gefärbt). Fach-Färbung auf `testklausur.html` (Step-Nummern bleiben als
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

- **Struktur:** `marketing/index.html` (Landing), `funktionen.html`,
  `vergleich.html` (Lesify vs. klassische Nachhilfe), `preise.html`, `faq.html`,
  `ueber-uns.html`, `kontakt.html`, `login.html`, `registrieren.html`,
  `passwort-vergessen.html`, `impressum.html`, `datenschutz.html`, `agb.html`.
- **Shared:** `marketing/assets/css/marketing.css` (redeklariert den `:root`-
  Token-Block aus `app/assets/css/style.css` und ergänzt Marketing-Komponenten),
  `marketing/assets/js/marketing.js` (baut Navigation + Footer per JS, Scroll-
  Reveal via IntersectionObserver, Mobile-Menü, Preis-Umschalter monatlich/
  jährlich, Demo-Formular-Handler mit Toast, Zähler-Animation).
- **Zielgruppe der Landing:** Eltern von Schüler:innen der 8./9. Klasse.
  Kernbotschaften: günstiger und jederzeit verfügbar als klassische Nachhilfe,
  messbare Klausurvorbereitung (Testklausur + Notenprognose + Ampel + Lernplan).
  Enthält einen ehrlichen Vergleich (auch Punkte, in denen Nachhilfe gewinnt).
- **Kein Backend:** Alle Formulare (Login, Registrierung, Passwort-Reset,
  Kontakt) verhindern das Submit und zeigen nur einen Toast. Preise/Limits sind
  Design-Platzhalter. Die daraus abgeleiteten echten Anforderungen stehen in
  §1 (User, Abo, KindProfil, Usage-Limits pro Paket), §4 (Auth-, Abo-, Kontakt-
  Endpunkte), §5 (Auth) und §7 (Limits).
- **Backend-Pflege:** Ändern sich in `marketing/preise.html` die Pakete, Limits
  oder Preise, müssen die Tabelle in §1 „Usage / Limits", §7 und die offenen
  Punkte in §8 mitgezogen werden.
- **Design-Exploration entfernt** (Entscheidung 2026-09-04): `landing-lab.html`
  und `marketing/assets/js/landing-lab.js` sind gelöscht. `marketing/assets/css/landing-lab.css`
  bleibt vorerst, weil die aktuelle `index.html` seine `lab-*`-Klassen nutzt —
  effektiv ist es jetzt das Landing-Stylesheet, kein Spielwiesen-Artefakt.
- **Aktuelle `index.html`:** statisches Landing-Markup, lädt `marketing.css` +
  `landing-lab.css` + `marketing.js`. Vorige Fassung liegt als `index.html.bak`.
  Die öffentliche Website (`marketing/`) wird ohnehin erst in einer späteren
  Projektphase überarbeitet.
