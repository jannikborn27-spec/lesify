# Eltern-Zugang — Feature- und Umsetzungsplan

> Entwurf, 2026-09-08. Beantwortet: "Eltern Access Point / eigenes Elternkonto
> hinzufügen" — was das Elternkonto können soll, und was dafür im Code zu tun
> ist. Bezug: `backend-planning.md` §1 (`User.rolle`, `parentUserId`,
> `KindProfil`), §4 (Endpunkte `/abo/kinder*`), `UMSETZUNGSPLAN.md` Phase 12.
>
> **Status 2026-09-08 — umgesetzt (Prototyp).** Entscheidung (§3): Eltern-Bereich
> als Prototyp auf `data.js`/`app.js` gebaut, **nicht** als erste `api.js`-Seite —
> zum Zeitpunkt der Umsetzung lief noch keine `app/`-Seite auf `api.js`. Geliefert:
> `app/eltern.html`, Familien-/Kind-Modell + Helfer in `app/assets/js/data.js`
> (`Lesify.familie/kinder/getKind/kindZusammenfassung/addKind/removeKind/
> kindEinladung/updateKind/wechsleZuKind/zurueckZumElternkonto/getRolle/setRolle/
> istElternteil/setFamilieSitze/setAboStatus`), Eltern-Nav-Variante +
> `renderElternBanner()` in `app/assets/js/app.js`, Ansichts-Umschalter auf
> `app/einstellungen.html`, Banner-/Karten-CSS in `app/assets/css/style.css`.
> Für den späteren `api.js`-Cut-over ebenfalls fertig: die drei Wrapper in
> `app/assets/js/api.js` (`kinderEinladung/kinderSitzung/kinderZusammenfassung`)
> und die Rollen-/Familie-Weiche in `app/assets/js/auth-gate.js`. Noch offen:
> `marketing/login.html` (redirectet im Prototyp nirgendwohin — Teil des
> Phase-11-Cut-overs).
>
> **Status 2026-09-12 — Redesign auf vier eigenständige Seiten.** Entscheidung
> §3.3 revidiert: statt einer Seite mit ausklappbaren Kind-Karten jetzt vier
> echte Seiten — `eltern.html` (Übersicht: Familien-weite Kennzahlen,
> Kind-Kurzkarten, Datenschutz-Vertrauenshinweis), `eltern-kinder.html`
> (Kind-Verwaltung, entspricht der bisherigen `<details>`-Liste),
> `eltern-kind.html?id=…` (**neu**, Einzelansicht je Kind: Wochen-Kennzahlen +
> Fächer-Liste mit Themen-Anzahl + Liste anstehender Klausuren mit Datum),
> `eltern-abo.html` und `eltern-datenschutz.html` (aus der alten Seite
> herausgelöst, siehe §2 „Empfohlene Reihenfolge" Schritt 6, jetzt erledigt).
> `app/assets/js/app.js` (`ELTERN_NAV_ITEMS`) verlinkt jetzt echte Seiten statt
> `eltern.html#anker`. Modal-Helfer + Datenschutz-/Abo-Handler sind je Seite
> dupliziert (kein gemeinsames Modul) — entspricht dem bestehenden Muster im
> Rest von `app.js` (mehrere lokale Modal-Bauer statt einer geteilten
> Abstraktion). Neue Metadaten je Kind in `data.js`
> (`woche.faecherListe`/`woche.anstehendeKlausurenListe`, Fach + Anzahl/Datum)
> sind eine Detaillierung der bereits erlaubten `faecher`/`anstehendeKlausuren`-
> Zähler, **kein** neuer Content-Zugriff — siehe §1.2 unten für die Abgrenzung.
> Für den echten Cut-over bedeutet das: `GET /abo/kinder/:id/zusammenfassung`
> müsste um dieselben zwei Felder erweitert werden (`backend-planning.md` §4
> nachgezogen, Endpunkt-Erweiterung selbst noch offen).

## 0. Ausgangslage

Das Daten- und API-Modell für Familien/Eltern existiert bereits vollständig
und ist getestet (`api/src/routes/abo.ts`, Describe „Eltern-Features Phase
12" in `abo.test.ts`):

- `POST /abo/kinder` — Kind-Profil anlegen (nur `Abo.art = familie`, gedeckelt
  auf `Abo.sitze`, 2–4)
- `GET /abo/kinder` · `DELETE /abo/kinder/:id` — auflisten / entfernen
  (Cascade löscht alle Inhalte des Sitzes)
- `POST /abo/kinder/:id/einladung` — setzt E-Mail am Kind-Profil, gibt
  Passwort-Token aus; Kind aktiviert sich selbst über
  `POST /auth/passwort-zuruecksetzen`
- `POST /abo/kinder/:id/sitzung` — Kontext-Wechsel: echte, unabhängige
  `Session` fürs Kind-Profil (`{token, kindId}`)
- `GET /abo/kinder/:id/zusammenfassung` — aggregierte Wochenkennzahlen
  (Fächer, Themen, Chats/Nachrichten der Woche, Lernzettel gesamt,
  Testklausuren der Woche, anstehende Klausuren) — **kein Chat-Wortlaut**

**Was komplett fehlt: die Oberfläche.** Weder `app/` noch `marketing/` haben
irgendeine Eltern-Ansicht. Konkret geprüft:

- `app/assets/js/api.js` deckt nur `getAbo/abschliessenAbo/aendernAbo/
  kuendigenAbo/pausierenAbo/kinder/addKind/removeKind` ab — **`einladung`,
  `sitzung`, `zusammenfassung` fehlen als Wrapper.**
- `app/assets/js/auth-gate.js` prüft nur „eingeloggt ja/nein", kennt keine
  `rolle` und leitet nie in einen Eltern-Bereich um.
- `app/einstellungen.html` zeigt Familie-Infos nur als Textzeile (Zeile 161),
  keine Kind-Verwaltung.
- Es gibt kein `app/eltern*.html`.

**Wichtige Unterscheidung, die den Plan prägt:** Ein Elternteil kann sich auf
zwei Arten registrieren (`marketing/registrieren.html`, Radio `rolle`):

1. **Solo (`Abo.art = einzel`, 1 Sitz):** `name`/`klassenstufe` am
   `User`-Datensatz sind die des Kindes, `email` die der/des Sorgeberechtigten
   — es gibt **kein separates Kind-Profil**, dieser eine Account *ist* der
   Lern-Account. Nur bei `paket = infinite` ist laut Preistabelle überhaupt
   eine „Eltern-Zusammenfassung" vorgesehen — mangels zweitem Account kann das
   nur ein **E-Mail-Digest** sein, kein separates Dashboard (E-Mail-Versand ist
   projektweit noch nicht gebaut, siehe §8 „Weiterhin offen" in
   `backend-planning.md`).
2. **Familie (`Abo.art = familie`, 2–4 Sitze):** Das Elternkonto besitzt das
   `Abo` (`ownerUserId`), lernt selbst nicht, sondern verwaltet 1–4
   `KindProfil`e (eigene `User`-Zeilen, `rolle = schueler`,
   `parentUserId` = Elternkonto). **Das ist der „Eltern Access Point", um den
   es hier geht.**

Diese Unterscheidung war in `backend-planning.md` §8 noch als offene
Entscheidung „Eltern-Kind-Modell: ein Account mit Kind-Profilen vs. getrennte
verknüpfte Accounts" gelistet — die Implementierung hat sich aber längst für
**getrennte, verknüpfte Accounts** entschieden. Diese Doku-Inkonsistenz sollte
mit der Umsetzung dieses Plans behoben werden (§4 unten).

---

## 1. Funktionsumfang des Eltern-Bereichs

1. **Kinder-Übersicht** — Karten pro Kind-Profil: Name, Klassenstufe,
   grober Ampel-Status (aus den Zusammenfassungs-Daten ableitbar), Datum der
   letzten Aktivität.
2. **Wochen-Zusammenfassung je Kind** — direkt aus
   `GET /abo/kinder/:id/zusammenfassung`: Fächer/Themen-Anzahl, Chats +
   Nachrichten diese Woche, Lernzettel gesamt, Testklausuren diese Woche,
   anstehende Klausurtermine. **Seit 2026-09-12** zusätzlich als Liste
   verfügbar (`eltern-kind.html`): `faecherListe` (Fach + Themen-Anzahl) und
   `anstehendeKlausurenListe` (Fach + Datum) — reine Detaillierung derselben
   Zähler, kein neuer Content-Zugriff. Bewusst **keine** Chat-Inhalte, keine
   Lernzettel-Inhalte, keine Klausur-Ergebnisse — das ist laut
   `Eltern-USPs-Feature-Ranking` einer der stärksten Vertrauens-USPs gegenüber
   Eltern und darf nicht aufgeweicht werden.
3. **Kind-Profil-Verwaltung** — Kind anlegen (bis `Abo.sitze` erreicht),
   per E-Mail einladen (Kind setzt eigenes Passwort), entfernen (mit
   deutlicher Warnung: Cascade-Löschung aller Inhalte des Sitzes).
4. **Kontext-Wechsel „Als Kind einloggen"** — Elternteil kann sich kurz in
   die Sicht eines Kindes versetzen (z. B. zum Helfen/Einrichten), mit
   dauerhaft sichtbarem Banner „Elternmodus — zurück zum Elternkonto" und
   Rücksprung ohne erneuten Login.
5. **Abo-/Sitzverwaltung** — aktueller Tarif, Sitze, Intervall, Status,
   Trial-/Verlängerungsdatum; Sitz hinzufügen (sofort), Sitz entfernen (zum
   Periodenende, bestehende Mechanik über `geplanteSitze`), kündigen,
   Sommerpause.
6. **Datenschutz & Konto** — DSGVO-Export/-Löschung fürs gesamte
   Familienkonto (Backend cascaded bereits auf alle Kind-Profile), Nachweis
   der Einwilligung (`einwilligungAm`).
7. **Benachrichtigungs-Einstellungen** — Toggles `erinnerungVorKlausuren` /
   `woechentlicheZusammenfassung` je Kind sind im Modell schon da; bleiben
   wirkungslos, bis E-Mail-Versand existiert (bekannte, projektweite
   Abhängigkeit — kein neuer Scope hier).
8. **Bewusste Nicht-Features:** kein Live-Aktivitäts-Feed, kein Lesezugriff
   auf Chat- oder Lernzettel-Inhalte, keine Möglichkeit, Noten/Ergebnisse
   einzusehen, die es laut Produktentscheidung gar nicht gibt
   (`Klausur.note` entfällt ersatzlos, siehe §8 „Entschieden").

---

## 2. Code-Arbeit

### Backend (`api/`) — im Kern bereits fertig

Kein neuer Endpunkt nötig. Einzige mögliche Ergänzung (optional, kein
Blocker): ein Audit-Log-Eintrag bei `POST /abo/kinder/:id/sitzung`
(Sicherheits-/Nachvollziehbarkeits-Nice-to-have, da ein Elternkonto damit
faktisch als Kind agieren kann).

### Frontend (`app/`) — der eigentliche Aufwand

- **`app/assets/js/api.js`**: drei fehlende Wrapper ergänzen, im Stil der
  bestehenden `kinder/addKind/removeKind` (Zeilen 345–352):
  `kinderEinladung(id, email)` → `POST /abo/kinder/:id/einladung`,
  `kinderSitzung(id)` → `POST /abo/kinder/:id/sitzung`,
  `kinderZusammenfassung(id)` → `GET /abo/kinder/:id/zusammenfassung`.
- **`app/assets/js/auth-gate.js`**: um Rollen-/Familie-Erkennung erweitern.
  Regel: nur ein Elternkonto **mit Familien-Abo** (`Abo.art = familie`, d. h.
  es hat Kind-Profile) wird auf den Eltern-Bereich umgeleitet; ein Solo-
  Elternkonto (`rolle = elternteil`, `art = einzel`) verhält sich weiter
  exakt wie ein Schüler-Account. Dafür reicht `rolle` allein nicht — die
  Weiche braucht zusätzlich `GET /abo` bzw. `GET /abo/kinder`.
- **Neue Seite `app/eltern.html`**: eine Dashboard-Seite mit
  ausklappbaren Kind-Karten (Übersicht + Wochen-Zusammenfassung + Aktionen
  pro Karte) statt eigener Detail-Seite je Kind — passt zum bestehenden
  Muster flacher, router-loser HTML-Seiten und braucht kein neues
  Navigationskonzept.
- **Session-Handling für den Kontext-Wechsel**: `localStorage`-Schema
  erweitern — `lesify:token` bleibt die aktive Sitzung, zusätzlich
  `lesify:elternToken` (geparkter Eltern-Token während eines Kind-Kontexts)
  und `lesify:elternModus` (Flag). Ein gemeinsames Banner-Partial, in alle
  `app/*.html` eingebunden wie die Sidebar, zeigt „Elternmodus" +
  Rücksprung-Button, solange das Flag gesetzt ist.
- **Sidebar/Nav**: Elternkonto braucht eine eigene Nav-Variante (Kinder,
  Abo, Einstellungen, Datenschutz) statt der Schüler-Links (Fächer, Themen,
  Chat, …), die für ein reines Elternkonto ohne eigenen Lerninhalt nicht
  sinnvoll sind.
- **`app/einstellungen.html`**: bestehender Abo-Textblock (Zeile 161) wird
  durch echte Kind-Verwaltung ersetzt bzw. nach `eltern.html` verschoben —
  eine Dopplung beider Stellen vermeiden.

### Marketing (`marketing/`)

- **`marketing/login.html`**: Redirect nach Login um dieselbe
  Rollen-/Familie-Weiche ergänzen wie im Auth-Gate.
- **`marketing/registrieren.html`**: keine Änderung nötig, `rolle` wird
  schon abgefragt. Empfehlung: Kinder **nicht** schon im Checkout einladen
  (blockiert sonst den Abschluss, falls E-Mail-Adressen der Kinder noch
  fehlen) — Einladung passiert bewusst erst im Eltern-Bereich danach.

### Doku (Pflicht laut `CLAUDE.md`, sobald umgesetzt wird)

- `Konzept-texts/backend-planning.md` §8: „Eltern-Kind-Modell" und
  „Familien-Abo-Sichtbarkeit" als entschieden markieren (Verweis auf diesen
  Plan), da die Implementierung längst auf „getrennte verknüpfte Accounts"
  festgelegt ist.
- `UMSETZUNGSPLAN.md` Phase 12: den Hinweis „UI entsteht mit Phase 11"
  durch die konkrete Aufgabenliste aus §2 dieses Plans ersetzen/verlinken.
- `app/README.md` (Phase-11-Seitenliste): `eltern.html` ergänzen.

---

## 3. Entscheidungen

1. **Solo-Elternkonto (Einzel/Infinite):** _unverändert_ — keine eigene
   Ansicht, verhält sich wie ein Schüler-Account; `auth-gate.js` schickt es
   nicht in den Eltern-Bereich. Eltern-Digest bleibt bis zum E-Mail-Versand offen.
2. **Einladung von Kindern:** _erst im Eltern-Bereich_ (nicht im Checkout).
   Umgesetzt: Karte pro Kind, „Einladung senden" setzt die E-Mail.
3. **Kind-Karten:** ~~eine Seite, ausklappbar (`<details>`), kein eigener
   Detail-Screen je Kind~~ — **revidiert 2026-09-12:** doch ein eigener
   Detail-Screen je Kind (`eltern-kind.html?id=…`), dafür mit mehr Inhalt
   (Fächer-/Klausur-Metadaten, siehe §1 Punkt 2); die Übersichtsliste
   (`eltern-kinder.html`) zeigt weiterhin kompakte Karten mit den
   Verwaltungs-Aktionen, verlinkt aber statt auszuklappen.
4. **Kontext-Wechsel:** Prototyp nutzt ein `localStorage`-Flag
   (`store.elternModus`) + dauerhaftes Banner. Für das echte Backend gilt
   weiter: eigene Kind-`Session` über `POST /abo/kinder/:id/sitzung`, bewusst
   **kürzere Laufzeit** als reguläre Sitzungen + Audit-Log — als Nice-to-have
   in `abo.ts` notiert, kein Blocker.
5. **Wochen-Zusammenfassung:** _rein in-app_ (Pull beim Öffnen), kein
   E-Mail-Versand — passt zur projektweiten Zurückstellung der E-Mail-Infra.

---

## 4. Empfohlene Reihenfolge

1. `api.js` — drei fehlende Funktionen (klein, schaltet alles Weitere frei).
2. `auth-gate.js` — Rollen-/Familie-Weiche + Redirect-Regeln.
3. `eltern.html` — Kinder-Liste + Wochen-Zusammenfassung, erstmal nur lesend.
4. Kind anlegen / einladen / entfernen auf derselben Seite.
5. Kontext-Wechsel (Sitzung) + Elternmodus-Banner in `app/*.html`.
6. Abo-/Sitzverwaltung in `eltern.html` bündeln (aus `einstellungen.html`
   herauslösen).
7. `marketing/login.html` Redirect-Weiche verdrahten.
8. Doku nachziehen (`backend-planning.md`, `UMSETZUNGSPLAN.md`,
   `app/README.md`) — Pflicht laut `CLAUDE.md`.
9. Manueller Klick-Test des kompletten Eltern-Flows.

**Wichtige Randnotiz:** Schritte 1–6 hängen **nicht** vom Rest des
Phase-11-Seiten-Cutovers ab — `eltern.html` ist eine komplett neue Seite ohne
`data.js`-Altlast und kann direkt auf `api.js`/`auth-gate.js` aufbauen, auch
während andere Seiten noch migriert werden.

---

## 5. Betroffene Dateien (Kurzreferenz)

- `api/src/routes/abo.ts` — keine Änderung nötig (nur ggf. Audit-Log).
- `app/assets/js/api.js` — 3 neue Funktionen.
- `app/assets/js/auth-gate.js` — Rollen-/Familie-Weiche.
- `app/eltern.html`, `eltern-kinder.html`, `eltern-kind.html`, `eltern-abo.html`,
  `eltern-datenschutz.html` — vier Seiten (Stand 2026-09-12; ursprünglich eine
  Seite `eltern.html` mit Anker-Abschnitten).
- `app/assets/js/app.js` bzw. gemeinsames Nav-Partial — Eltern-Nav-Variante
  (`ELTERN_NAV_ITEMS`, verlinkt jetzt echte Seiten statt `eltern.html#anker`).
- `app/assets/js/data.js` — `woche.faecherListe`/`.anstehendeKlausurenListe`
  je Kind (Metadaten, kein neuer Content-Zugriff).
- `app/assets/css/style.css` — Eltern-Karten-/Stats-/Fach-Listen-Styles
  (früher Seiten-lokales `<style>` in `eltern.html`, jetzt global, weil
  mehrere Seiten sie brauchen).
- `app/einstellungen.html` — Familie-Textblock ersetzen/verschieben.
- `marketing/login.html` — Redirect-Weiche.
- `Konzept-texts/backend-planning.md`, `UMSETZUNGSPLAN.md`, `app/README.md`
  — Doku-Pflege.
