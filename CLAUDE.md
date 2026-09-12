# Lesify — Projektanweisungen

## Projekt

KI-Lern-Webapp (Schüler, 8./9. Klasse). **Monorepo** (seit 2026-09-04, Phase 1):

| Ordner       | Inhalt                                                    | Build?          |
| ------------ | ------------------------------------------------------- | --------------- |
| `app/`       | eingeloggte App (früher die `*.html` im Root)           | nein (Vanilla)  |
| `marketing/` | öffentliche Website (früher `frontend/`)               | nein (Vanilla)  |
| `api/`       | Backend — Fastify + TypeScript (`@lesify/api`)          | ja (`tsc`)      |
| `shared/`    | reine Formeln/Typen für App + API (`@lesify/shared`)    | ja (`tsc`)      |

`app/` und `marketing/` bleiben statischer HTML/CSS/JS-Prototyp — kein
Build-Tool, kein Framework, Vanilla JS. Alle App-Inhalte sind Dummy-Daten in
`app/assets/js/data.js`, KI-Antworten sind simulierter Platzhaltertext.
Notenberechnung, Ampel-Logik (grün/gelb/rot) und der 7-Tage-Lernplan-Flow
(aktueller Tag, schwache Themen, ob Testklausur 2 nötig ist) rechnen dagegen
**echt** im Frontend, damit sie klickbar getestet werden können.

Der Backend-Stack ist in `Konzept-texts/backend-planning.md` §0 „Stack"
festgehalten (TypeScript-Monorepo, PostgreSQL + Storage via Supabase EU,
Stripe). Setup/Skripte: siehe `README.md` im Projekt-Root (`pnpm dev` startet
API + App + Marketing).

Die fachliche Spezifikation liegt als PDFs in `Konzept-texts/` (`Thema.pdf`,
`Ki Chat.pdf`, `Lernzettel.pdf`, `Dateien.pdf`, `Testklausuren.pdf`).

## Pflicht: `Konzept-texts/backend-planning.md` aktuell halten

`Konzept-texts/backend-planning.md` beschreibt, was ein späteres echtes
Backend braucht (Datenmodell, API-Endpunkte, KI-Call-Strategie, Auth,
Datei-Speicherung, Usage-Tracking, offene Entscheidungen).

**Bei jeder Änderung, die eines der folgenden betrifft:**
- Datenmodell / Felder / Entities in `app/assets/js/data.js`
- Notenberechnung, Ampel-Schwellenwerte, Lernplan-/Testklausur-Regeln
- Neue oder geänderte Features, die später einen API-Call brauchen würden
- Änderungen an den Konzept-PDFs in `Konzept-texts/`

**musst du `Konzept-texts/backend-planning.md` entsprechend aktualisieren,
bevor die Aufgabe als erledigt gilt.** Nicht nur anhängen — die betroffenen
Abschnitte (Datenmodell-Tabelle, Endpunkt-Liste, Notenformel, offene
Punkte) wirklich anpassen, damit das Dokument den aktuellen Stand exakt
widerspiegelt und nicht nur historisch korrekt ist.

**Zu Beginn jeder neuen Session:** Prüfe kurz, ob `backend-planning.md`
noch zum aktuellen Stand von `data.js` und den HTML-Seiten passt (z. B.
per Diff der Feldnamen/Statuswerte). Wenn nicht, aktualisiere es zuerst,
bevor du mit der eigentlichen Aufgabe weitermachst.

## Pflicht: `UMSETZUNGSPLAN.md` mitführen

`UMSETZUNGSPLAN.md` (Projekt-Root) ist die chronologische Schritt-für-Schritt-
Liste vom Prototyp zum Live-Produkt.

**Bei jeder Arbeit in diesem Ordner, die einem Schritt der Liste entspricht,
musst du `UMSETZUNGSPLAN.md` im selben Arbeitsschritt aktualisieren, bevor die
Aufgabe als erledigt gilt:**
- erledigte Schritte auf `- [x]` setzen (bei Teilfortschritt kurzer
  Klammerzusatz statt Haken),
- neu entstandene oder verschobene Aufgaben als Zeilen ergänzen,
- getroffene Entscheidungen mit Datum in Phase 0 festhalten.

Betrifft die Änderung Datenmodell / Notenlogik / Limits / Endpunkte, zusätzlich
`Konzept-texts/backend-planning.md` nachziehen (siehe Abschnitt oben) — beide
Dokumente müssen den aktuellen Stand widerspiegeln.

## Pflicht: Lokal + GitHub synchron halten

Dieses Repo ist mit GitHub verbunden (`https://github.com/jannikborn27-spec/lesify`,
Branch `main`) und über GitHub Pages live auf `lesify.de` (`marketing/` = Root,
`app/` unter `/app`) — Deploy läuft automatisch bei jedem Push auf `main`
(`.github/workflows/pages.yml`).

**Jede Änderung an diesem Projekt — Code, Doku, Assets, egal ob großes Feature
oder kleiner Fix — muss noch in derselben Aufgabe sowohl lokal committet als
auch nach GitHub gepusht werden, bevor die Aufgabe als erledigt gilt:**
`git add` der betroffenen Dateien → commit mit aussagekräftiger Nachricht →
`git push origin main`. Nicht am Ende der Session sammeln, sondern je
abgeschlossenem Arbeitsschritt commiten/pushen (siehe bisherige Praxis: ein
Commit für Preise/FAQ-Umbau, ein eigener für den Stripe-Adapter, ein eigener
fürs Eltern-Redesign).

Push auf `main` ist für dieses Projekt damit vorab autorisiert — nicht jedes
Mal einzeln nachfragen. Offensichtlicher Schrott/Testkram (z. B.
`index-backup*.html`, `test-img*`, `assets.zip`) weiterhin nicht committen,
außer der Nutzer bittet ausdrücklich darum. Destruktive Git-Operationen
(force-push, `reset --hard` o. Ä.) bleiben davon ausgenommen — dafür weiter
wie gewohnt nachfragen.

## Sonstige Arbeitsweise

- Sprache im Projekt (Dummy-Daten, UI-Texte, Doku) ist Deutsch.
- Design: schwarz/weiß-Grundgerüst (`app/assets/css/style.css`). Die
  Grundstruktur (Body, Fließtext, Ränder, Buttons, Nav, Fokuszustände,
  Chips/Tabs, Toggles, KI-Avatare, Dashboard-Kacheln) ist NICHT reines
  Grau, sondern der "Fog Blue"-Ton (`--ink-950` … `--paper`, H≈240°
  in OKLCH, zurückhaltend blaugrau statt neutralgrau) — bewusst subtil,
  kein separater "Brand-Akzent". Zwei zusätzliche, bewusste Farbebenen:
  1. **Ampel-Konzept** (grün/gelb/rot, `--gruen`/`--gelb`/`--rot`) für
     Testklausur-/Note-Status — trägt echte Information, nicht ändern
     ohne die Notenlogik in `data.js` zu berücksichtigen.
  2. **Fach-Farben**: jedes Fach hat ein Datenfeld `farbe` (Schlüssel aus
     `Lesify.FACH_COLORS`, definiert in `app/assets/js/data.js`, aktuell 8
     kuratierte Optionen). Nutzer wählen die Farbe frei über den
     "Farbe ändern"-Button (`LesifyUI.openFachColorPicker(fachId, onSaved)`
     in `app.js`) auf `app/faecher.html`/`app/fach.html`; gespeichert wird über
     `Lesify.updateFach(id, {farbe})` als Override in
     `store.fachOverrides` (gilt für Seed- und nutzerangelegte Fächer
     gleichermaßen). Badges (`badge()`/`fachBadge()` in `app.js`) und
     Fach-Avatare lesen die Farbe live über `Lesify.getFachColor(farbe)`
     und setzen sie als Inline-CSS-Variablen (`--fach-color`/`-ink`/`-bg`)
     — keine feste CSS-Zuordnung pro Fach-ID mehr.
- **Zwei-Ebenen-Hintergrund**: `--bg-canvas` (Body/Seite) = Paper vs.
  `--bg-surface` (Sidebar, Karten, Textfelder, Modals, Dropdowns — alle
  "geschlossenen" Elemente) = Weiß. Feste Entscheidung, kein Umschalter.
- Änderungen an `data.js` sind der zentrale Ort für alle Berechnungen
  (Note, Ampel, Usage) — Seiten sollen nur rendern, nicht selbst rechnen.
- Beim Öffnen der Seiten lokal per `file://` funktioniert alles außer
  `localStorage`-Persistenz browserabhängig; zum Testen mit vollem
  Verhalten einen lokalen Server verwenden: `pnpm dev` im Projekt-Root
  (App auf :4001, Marketing auf :4002, API auf :3000), oder direkt
  `python3 -m http.server` im jeweiligen Ordner.
