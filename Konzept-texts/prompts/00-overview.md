# 00 · Overview — Claude-API-Prompts für Lesify

Dieses Dokument bündelt, was in allen Einzeldateien (`01`–`12`) gleich ist,
damit es dort nicht wiederholt werden muss. Es ersetzt **nicht**
`backend-planning.md` — Datenmodell, Endpunkte und Notenlogik bleiben dort
die Quelle der Wahrheit; hier geht es ausschließlich um die
Prompt-Entwürfe für die künftigen KI-Calls.

## 1. Mapping: KI-Call → Prompt-Datei → API-Endpunkt

| # | Prompt-Datei | KI-Call (aus §3) | API-Endpunkt (aus §4) |
|---|---|---|---|
| 01 | [01-datei-zusammenfassung.md](01-datei-zusammenfassung.md) | Datei lesen → Name + Zusammenfassung | `POST /themen/:id/dateien` |
| 02 | [02-themen-memory.md](02-themen-memory.md) | Themen-Memory-Kontext-Block zusammenbauen | `POST /chats` (Chat-Start), wiederverwendet in jedem `POST /chats/:id/nachrichten` |
| 03 | [03-chat-erklaeren.md](03-chat-erklaeren.md) | Chat-Antwort, Modus „Erklären" | `POST /chats/:id/nachrichten` |
| 04 | [04-chat-hausaufgabenhilfe.md](04-chat-hausaufgabenhilfe.md) | Chat-Antwort, Modus „Hausaufgabenhilfe" | `POST /chats/:id/nachrichten` |
| 05 | [05-chat-ueben.md](05-chat-ueben.md) | Chat-Antwort, Modus „Üben" | `POST /chats/:id/nachrichten` |
| 06 | [06-chat-zusammenfassen.md](06-chat-zusammenfassen.md) | Chat-Antwort, Modus „Zusammenfassen" | `POST /chats/:id/nachrichten` |
| 07 | [07-chat-titel.md](07-chat-titel.md) | Chat-Titel aus erster Nachricht (§8, offener Punkt) | **Vorschlag:** angehängt an den ersten `POST /chats/:id/nachrichten`-Call — kein eigener Endpunkt in §4 |
| 08 | [08-lernzettel-erstellung.md](08-lernzettel-erstellung.md) | Lernzettel vollautomatisch erstellen | `POST /themen/:id/lernzettel` |
| 09 | [09-lernzettel-revision.md](09-lernzettel-revision.md) | Lernzettel-Revision (Chat-Format) | `POST /lernzettel/:id/revisionen` |
| 10 | [10-testklausur-erstellung.md](10-testklausur-erstellung.md) | Aufgaben generieren (1 pro Thema, gebündelt) — für Testklausur 1 **und** Testklausur 2 eines Lernplans | `POST /testklausuren` |
| 11 | [11-testklausur-analyse.md](11-testklausur-analyse.md) | Auswertung + Note + Erklärung (gebündelt) — für Testklausur 1 **und** Testklausur 2 | `POST /testklausuren/:id/analyse` |
| 12 | [12-lernplan-lernzettel.md](12-lernplan-lernzettel.md) | Lernzettel des Lernplans erzeugen/ergänzen (Tag 3/4/6) | `POST /lernplaene/:id/lernzettel` |

## 2. Prinzip 1: Sokratisches Lernen statt Antwort-Diktat

Pädagogisches Grundprinzip (Socratic method / scaffolded tutoring): durch
gezielte Fragen und Hinweise zur eigenen Lösung führen, statt die Lösung
direkt vorzugeben. Gilt **unterschiedlich stark** je nach Call — die
folgende Tabelle ist die einmalige, vollständige Erklärung, auf die alle
Einzeldateien nur noch kurz verweisen:

| Call | Ausprägung |
|---|---|
| [04-chat-hausaufgabenhilfe.md](04-chat-hausaufgabenhilfe.md), [05-chat-ueben.md](05-chat-ueben.md) | **Strikt sokratisch.** Nie die fertige Lösung im ersten Schritt. Erst verstehen, wo der Schüler steht, dann gezielte Rückfragen/Hinweise in kleinen Schritten, den Schüler selbst rechnen/formulieren lassen. Vollständige Lösung mit Herleitung erst nach eigenem ernsthaftem Versuch oder explizitem „zeig mir die Lösung". |
| [03-chat-erklaeren.md](03-chat-erklaeren.md) | **Nicht strikt sokratisch, aber Herleitung vor Ergebnis.** Entlang eines Beispiels/einer Beispielaufgabe Schritt für Schritt aufbauen, statt die fertige Definition/Regel direkt hinzuwerfen (vgl. die Vorschlag-Chips „Erkläre anhand eines Beispiels" / „Gebe mir eine Beispielaufgabe" aus `Ki Chat.pdf`). |
| [06-chat-zusammenfassen.md](06-chat-zusammenfassen.md) | **Bewusst ausgeschaltet.** Der Nutzer will eine kompakte, direkte Zusammenfassung, kein sokratischer Dialog. |
| [09-lernzettel-revision.md](09-lernzettel-revision.md) | **Ebenfalls nicht einschlägig** (Einordnung als Annahme, siehe dort): kooperative Dokumentbearbeitung auf explizite Anweisung, kein Tutoring-Dialog. |
| [11-testklausur-analyse.md](11-testklausur-analyse.md) | **Kein Live-Tutoring** — der Schüler hat bereits eigenständig gelöst und abgegeben, es gibt keinen Dialog mehr zu führen. Aber auch hier: **Herleitung statt Antwort-Diktat** bei Fehlern — immer erklären, warum etwas falsch ist und wie man richtig hinkommt, nie nur „falsch, richtig wäre X". |
| [01-datei-zusammenfassung.md](01-datei-zusammenfassung.md), [02-themen-memory.md](02-themen-memory.md), [07-chat-titel.md](07-chat-titel.md), [08-lernzettel-erstellung.md](08-lernzettel-erstellung.md), [10-testklausur-erstellung.md](10-testklausur-erstellung.md), [12-lernplan-lernzettel.md](12-lernplan-lernzettel.md) | **Nicht relevant.** Reine Extraktions-/Generierungsaufgaben ohne pädagogischen Dialog. |

## 3. Prinzip 2: Usage-bewusst, API effektiv nutzen

Sechs wiederkehrende Bausteine — pro Datei wird nur erwähnt, welche davon
dort greifen:

1. **Prompt Caching — möglichst den ganzen System-Prompt, nicht nur Themen
   Memory.** Bei den vier Chat-Modi (03–06) ist innerhalb eines Chats nicht
   nur der Themen-Memory-Block und der Tonfall-Baustein stabil, sondern der
   **komplette System-Prompt** (Modus steht fest, Themen Memory und Tonfall
   ändern sich nicht) — nur die Nachrichtenliste (`messages`) wächst pro
   Turn. Der `cache_control`-Breakpoint sitzt deshalb ans Ende des
   gesamten System-Prompts, nicht mittendrin — das maximiert den
   Cache-Treffer-Anteil pro Call (siehe Kostenschätzung, Abschnitt 7).
2. **Rohdateien nie mehrfach schicken.** Die Datei-Zusammenfassung entsteht
   laut §3 genau einmal beim Upload
   ([01-datei-zusammenfassung.md](01-datei-zusammenfassung.md)). Alle
   späteren Calls nutzen ausschließlich diese gespeicherte Zusammenfassung,
   nie erneut die Originaldatei.
3. **Gebündelte statt Einzel-Calls.** Wo `backend-planning.md` das
   vorschreibt, wird es 1:1 umgesetzt: alle Aufgaben einer Testklausur in
   einem Call ([10-testklausur-erstellung.md](10-testklausur-erstellung.md)),
   die komplette Auswertung (alle Aufgaben, Note, Erklärungen) in einem Call
   ([11-testklausur-analyse.md](11-testklausur-analyse.md)). Der Lernzettel
   ([12-lernplan-lernzettel.md](12-lernplan-lernzettel.md)) wird **angehängt statt neu
   geschrieben** — ein kurzer Call je Aktualisierung.
4. **Strukturierte Outputs überall dort, wo in ein DB-Feld geschrieben
   wird** (Tool-Use/JSON-Schema, feste Feldnamen passend zu §1) — **nur**
   die vier Chat-Antworten selbst (03–06) und das `antwortText`-Feld der
   Lernzettel-Revision (09) bleiben Freitext/Markdown, da sie direkt an den
   Schüler gehen. Die eigentliche Dokumentänderung in 09 ist bewusst
   ebenfalls strukturiert (Such-/Ersetzen-Patches statt vollem Freitext),
   siehe Prinzip 2, Punkt 7.
5. **Modellwahl als Anforderung, nicht als fixe Bindung.** Jede Datei
   benennt Reasoning-Tiefe, Kontextlänge und Kosten-/Latenztoleranz statt
   ein konkretes Modell festzulegen — von „günstigste/schnellste Klasse
   reicht" (Chat-Titel, Datei-Zusammenfassung) bis „höchste
   Reasoning-Anforderung im Set" (Testklausur-Erstellung/-Analyse,
   Hausaufgabenhilfe/Üben).
6. **Rechte Größe statt Sicherheitszuschlag.** `max_tokens` wird pro Call
   realistisch geschätzt (z. B. Titel ≈ 20 Tokens, Datei-Zusammenfassung
   ≈ 150–250 Tokens, eine Testklausur-Aufgabe pro Thema knapp, eine volle
   Chat-Antwort großzügiger) statt überall ein pauschales Maximum
   anzusetzen.
7. **Output-Länge ist der größte Kostenhebel, nicht Input-Caching.** Bei
   Haiku 4.5 kostet ein Output-Token 5× so viel wie ein Input-Token (§7 in
   diesem Dokument) — Caching spart vor allem bei großen, oft
   wiederverwendeten Inputs (Themen Memory), ändert aber nichts an der
   Output-Seite. Deshalb steckt in jedem Chat-/Generierungs-Prompt (03–06,
   08, 09) explizit die Anweisung, **prägnant** zu antworten und die
   Aufgabenstellung nicht unnötig zu wiederholen — und
   [09-lernzettel-revision.md](09-lernzettel-revision.md) gibt bei
   Revisionen gezielt nur den geänderten Ausschnitt zurück statt des
   kompletten Lernzettels (siehe dort, Abschnitt 6).

**Kein Overengineering vor Bedarf:** Der Themen-Memory-Block
([02-themen-memory.md](02-themen-memory.md)) wird im Grundfall durch
einfache Konkatenation gebaut — eine echte Verdichtungs-/Kompressions-Pipeline
ist eine klar markierte Erweiterung, die erst greift, wenn der Kontext
tatsächlich zu groß wird (aus `Thema.pdf`: „Erst optimieren, wenn nötig").

## 4. Tonfall-Baustein (`{{tonfallBaustein}}`)

Ein Platzhalter, drei austauschbare Ausprägungen je nach
`Einstellungen.kiTonfall` (siehe §1) — an die Basis-Prompts von Chat
([03](03-chat-erklaeren.md)–[06](06-chat-zusammenfassen.md)),
Lernzettel-Erstellung/-Revision ([08](08-lernzettel-erstellung.md),
[09](09-lernzettel-revision.md)) angehängt. Bewusst **ein** Baustein mit
drei Varianten statt drei komplett separater Prompt-Kopien, um
Pflegeaufwand und Tokens zu sparen.

```
freundlich:
Tonfall: freundlich. Sprich den Schüler warm und zugewandt an, wie ein
geduldiger Nachhilfelehrer. Nutze „du", ermutigende Formulierungen, aber
ohne aufgesetzt zu wirken. Rückschläge werden entspannt eingeordnet, nicht
dramatisiert.

direkt:
Tonfall: direkt. Komm schnell auf den Punkt, keine ausschweifenden
Höflichkeitsfloskeln oder zusätzlichen Aufmunterungssätze. Sachlich, klar,
effizient — aber nicht unfreundlich. Der Schüler bekommt genau die
Information, die gebraucht wird, ohne Umwege.

motivierend:
Tonfall: motivierend. Betone Fortschritt und Erfolge sichtbar, rahme
Fehler aktiv als Lerngelegenheit, nutze anspornende Sprache („das schaffst
du", „guter Ansatz"), ohne inhaltlich zu beschönigen oder falsche
Sicherheit vorzutäuschen.
```

## 5. Datenmodell-Treue

Jeder Output, der in ein DB-Feld läuft, entspricht exakt Typ/Enum aus
`backend-planning.md` §1. Zentrale Formel (§2), in
[08](08-lernzettel-erstellung.md) und [11](11-testklausur-analyse.md)
konkret durchgerechnet:

```
note = round(6 − prozent/100 × 5, 1)          // 100 % → 1.0, 0 % → 6.0
noteAmpel(note): ≤ 2.5 → gruen · ≤ 4.0 → gelb · sonst → rot   // dreistufig, direkt bei der Analyse
```

Wo immer eine Note aus einer Prozentzahl folgt, gibt das Modell **nur die
Prozentzahl** zurück — Note, Ampel und (falls zutreffend) Bestanden-Status
werden deterministisch vom Backend abgeleitet, nie vom Modell berechnet.
Das verhindert Rundungs-/Formel-Drift zwischen KI-Output und Notenlogik.

## 6. Offene Annahmen in diesem Prompt-Set

Diese Datei-Übergreifende Liste fasst zusammen, wo einzelne Dateien über
das hinausgehen, was `backend-planning.md` bereits entschieden hat —
jeweils als Annahme/Vorschlag markiert, keine getroffene Entscheidung:

- **Chat-Titel-Endpunkt** ([07](07-chat-titel.md)): §8 lässt offen, wie der
  Call ausgelöst wird; hier als Annahme an den ersten
  `POST /chats/:id/nachrichten`-Call angehängt.
- **`vorgeschlagenerTitel` bei Datei-Zusammenfassung**
  ([01](01-datei-zusammenfassung.md)): zusätzliches, in §1 nicht
  vorgesehenes Feld, als optionales Anzeige-Label vorgeschlagen —
  `Datei.name` (Originaldateiname) bleibt davon unberührt.
- **Lernplan / „Action Plan"** ([11](11-testklausur-analyse.md)): §1 kennt kein
  KI-generiertes Freitext-Feld für die Vorbereitung — der 7-Tage-Lernplan wird
  im Frontend vollständig aus `Vorbereitungsstand` (dreistufige Ampel je Thema,
  `Lesify.lernplanStatus`) abgeleitet. Die Analyse liefert nur
  `TestklausurErgebnis` (Prozent + `erklaerung` je Thema); der Rest ist
  deterministische Frontend-Logik plus verlinkte Chat-Prompts.
- **Lernzettel-Update ohne festes Prompt-Schema in §1**
  ([12](12-lernplan-lernzettel.md)): `Lernplan.lernzettel` (`{content, aktualisiertAm}`)
  ist in §1 als Datenmodell-Feld beschrieben; das konkrete Prompt-/Output-Format
  (ein Markdown-Abschnitt je Thema, angehängt statt Vollersatz) ist dort nicht
  festgelegt und wird hier als Vorschlag ausgearbeitet, analog zur
  Diff-statt-Vollersatz-Begründung in [09](09-lernzettel-revision.md).
- **Sokratik-Einordnung der Lernzettel-Revision**
  ([09](09-lernzettel-revision.md)): `backend-planning.md` §3 sortiert die
  Revision nicht explizit in die Sokratik-Kategorien ein — hier als
  „nicht einschlägig, analog zu Zusammenfassen" eingeordnet.

Alle anderen Angaben (Feldnamen, Enums, Notenformel, Endpunkte) sind direkte
Übernahmen aus `backend-planning.md` und keine neuen Annahmen.

## 7. Kostenschätzung — Methode & Modellwahl

Alle Kostenangaben in `01`–`12` rechnen einheitlich mit dem aktuell
**günstigsten Claude-Modell, Claude Haiku 4.5**, Stand der Preisliste zum
Zeitpunkt dieser Datei:

| Modell | Input / 1M Tokens | Output / 1M Tokens |
|---|---|---|
| Claude Haiku 4.5 | 1,00 $ | 5,00 $ |
| Claude Sonnet 5 (zum Vergleich) | 3,00 $ | 15,00 $ |

**Prompt-Caching-Ökonomie** (relevant für 02–06, 09, 12):
Cache-Reads kosten ~0,1× den Input-Preis, Cache-Writes ~1,25× (5-Min-TTL)
bzw. ~2× (1-Std-TTL) den Input-Preis. Ein Cache-Breakpoint lohnt sich erst
ab mehreren Wiederverwendungen desselben Präfixes — bei einer typischen
Chat-Session (mehrere Nachrichten innerhalb weniger Minuten) ist das klar
gegeben.

**Wichtigste Erkenntnis für die Kostenschätzung:** Bei Haiku 4.5 kostet
Output 5× so viel wie Input. Selbst ein großzügig gecachter,
mehrere Tausend Tokens langer Themen-Memory-Block schlägt nach dem ersten
Cache-Write kaum noch zu Buche (0,1× Input-Preis) — die tatsächliche
Kostenhöhe eines Calls hängt in den meisten Dateien stärker an
`max_tokens`/der tatsächlichen Antwortlänge als am Input. Genau deshalb
zieht sich „prägnant antworten" als Anweisung durch alle
Chat-/Generierungs-Prompts (siehe Prinzip 2, Punkt 7 oben).

**Alle Zahlen unten sind Größenordnungen** auf Basis der in den einzelnen
Dateien angenommenen typischen Token-Mengen (Annahmen jeweils dort
dokumentiert), keine gemessenen Werte — zur Kalibrierung nach Produktivbetrieb
sollte `response.usage` ausgewertet werden.

### Kosten pro Call im Überblick (Haiku 4.5, typischer Fall)

| Datei | Call | ≈ Kosten/Call |
|---|---|---|
| [01](01-datei-zusammenfassung.md) | Datei-Zusammenfassung | 0,4 Cent (typ.) – 5,1 Cent (Worst Case, 5-MB-Datei) |
| [02](02-themen-memory.md) | Themen-Memory-Grundfall | 0 $ (kein Call) |
| [02](02-themen-memory.md) | Themen-Memory-Verdichtung (Erweiterung) | ~1,2 Cent, aber selten (nur bei Schwellenwert-Überschreitung) |
| [03](03-chat-erklaeren.md) | Chat „Erklären" | ~0,45–0,6 Cent/Nachricht |
| [04](04-chat-hausaufgabenhilfe.md) | Chat „Hausaufgabenhilfe" | ~0,25 Cent/Hinweis, ~0,6 Cent bei voller Lösung |
| [05](05-chat-ueben.md) | Chat „Üben" | ~0,25 Cent/Runde, ~0,6 Cent bei voller Lösung |
| [06](06-chat-zusammenfassen.md) | Chat „Zusammenfassen" | ~0,3 Cent/Nachricht |
| [07](07-chat-titel.md) | Chat-Titel | ~0,02 Cent (praktisch vernachlässigbar) |
| [08](08-lernzettel-erstellung.md) | Lernzettel-Erstellung | ~1,3 Cent (typ. Thema) – 2,4 Cent (umfangreiches Thema) |
| [09](09-lernzettel-revision.md) | Lernzettel-Revision | ~0,25 Cent (Diff-Format) statt ~0,75 Cent (Voll-Ersatz, siehe dort) |
| [10](10-testklausur-erstellung.md) | Testklausur-Erstellung (3 Themen) | ~0,53 Cent · Testklausur 2 kleiner (1–2 Themen), ~0,2–0,35 Cent |
| [11](11-testklausur-analyse.md) | Testklausur-Analyse (3 Themen, gebündelt) | ~0,80 Cent (ohne Nachtest-Pool) · Testklausur 2 kleiner |
| [12](12-lernplan-lernzettel.md) | Lernplan-Lernzettel aktualisieren | ~0,15–0,3 Cent/Aktualisierung (1–2× pro Lernplan) |

### Grobe Hochrechnung auf die Platzhalter-Limits aus §7

Bei den aktuellen Platzhalterwerten aus `backend-planning.md` §7
(100 Nachrichten / 40 Dateien pro Monat) und einer angenommenen Mischung
der vier Chat-Modi ergibt sich eine reine KI-Kostenschätzung von grob
**0,40–0,50 $ pro Nutzer/Monat** für Chat-Nachrichten (100 × ~0,4 Cent
Mittelwert) plus **~0,17 $/Monat** für Dateizusammenfassungen (40 × ~0,4
Cent typischer Fall) — Lernzettel-, Testklausur- und Lernzettel-Calls kommen
anteilig hinzu, je nach tatsächlicher Nutzungshäufigkeit (deutlich
seltener als einzelne Chat-Nachrichten; ein Lernplan = 2 Testklausur-
Erstellungen + 2 Analysen + 1–2 Lernzettel-Calls). Das sind Anhaltspunkte für die
Größenordnung, keine verbindliche Kostenkalkulation — reale Kosten hängen
stark von tatsächlicher Konversationslänge und Dateigröße ab.

**Wenn Haiku 4.5 fachlich nicht ausreicht** (z. B. bei anspruchsvolleren
Herleitungen in Hausaufgabenhilfe/Üben oder Testklausur-Erstellung/-Analyse):
Fallback auf Sonnet 5 kostet grob das 3-Fache der oben genannten Beträge
(3× Input-Preis, 3× Output-Preis) — als Anhaltspunkt für eine
Qualität-vs-Kosten-Abwägung pro Call, keine pauschale Empfehlung, auf
Sonnet zu wechseln.
