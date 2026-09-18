# 02 · Themen Memory (Chat-Start-Kontext)

## 1. Zweck & Trigger

Wird beim **Start eines neuen Chats** ausgelöst — Endpunkt `POST /chats`
(angelegt beim Senden der ersten Nachricht, siehe §4) bzw. spätestens beim
ersten `POST /chats/:id/nachrichten`. Baut den „Themen Memory"-Kontext-Block
zusammen: alles, was zu diesem Thema bereits existiert, damit die KI von der
ersten Nachricht an auf dem Stand des Schülers ist, ohne dass der Schüler
selbst Kontext wiederholen muss.

Wichtig: Das ist im Grundfall **kein eigenständiger generativer KI-Call**,
sondern deterministisches Zusammenstellen durch das Backend (siehe
„Themen Memory" in `Thema.pdf`: „Ein Call, keine Extraktion, immer aktuell").
Es taucht in §3 von `backend-planning.md` trotzdem als eigener Eintrag auf,
weil dieser Block als **eigener, cache-fähiger System-Prompt-Baustein**
behandelt wird (siehe Abschnitt 4) — die eigentliche KI-Verarbeitung
passiert erst bei der jeweiligen Chat-Nachricht (Dateien 03–06). Nur wenn
der Block zu groß wird, kommt ein echter KI-Call hinzu: die Verdichtung
(siehe Abschnitt 3, „Erweiterung").

## 2. Input

Alles, was zum `themaId` des Chats gehört:

- **Lernzettel** des Themas — vollständig, mit Titel und `content`
  (Markdown). Laut `Thema.pdf` bewusst „voll, sind kurz" — kein Grund, sie
  vorher zu kürzen.
- **Datei-Zusammenfassungen** aller Dateien des Themas (`Datei.zusammenfassung`
  aus [01-datei-zusammenfassung.md](01-datei-zusammenfassung.md)) — **nie**
  die Rohdateien selbst.
- **Titel + Modus** aller bisherigen Chats desselben Themas (nicht deren
  volle Nachrichtenverläufe — das wäre unverhältnismäßig teuer und für die
  Einordnung nicht nötig).
- `fachName`, `themaName`, `themaBeschreibung` als Kopfzeile.

## 3. Modell-Anforderung

**Grundfall (Standard):** Kein Modell nötig — reines String-Assembly durch
das Backend nach festem Template (Abschnitt 6). Kein Reasoning, keine
Kosten, keine Latenz.

**Erweiterung (nur wenn Kontext zu groß wird):** Sobald die Rohfassung eine
festgelegte Token-Schwelle überschreitet — als konkreter Startwert
**~4.000 Tokens** vorgeschlagen (deutlich über einem typischen Themen-Memory-
Block mit 1–2 Lernzetteln, aber klein genug, um Kosten pro zusätzlichem
gecachtem Chat spürbar zu begrenzen; bei Bedarf empirisch nachjustieren) —
weil ein Thema viele Lernzettel/Dateien angesammelt hat, wird stattdessen
einmalig ein
Verdichtungs-Call ausgelöst, der den Block auf eine kompakte Zusammenfassung
reduziert. Das ist eine Kompressionsaufgabe mit moderatem Anspruch: Kernbegriffe,
Formeln, offene Schwächen und Themenbezüge dürfen nicht verloren gehen, aber
es ist kein mehrstufiges Schließen nötig — mittlere Anforderung, keine
Spitzen-Reasoning-Klasse notwendig. Wird der Block danach durch neue Inhalte
(neuer Lernzettel, neue Datei) wieder verändert, wird die Verdichtung neu
ausgelöst, sonst bleibt sie bis dahin gecacht.

**Ausdrücklich laut `Thema.pdf`/§3:** „Erst optimieren, wenn nötig" — die
Verdichtung ist eine klar markierte Erweiterung, kein Tag-1-Feature. Der
Grundfall (rohe Konkatenation) deckt die meisten Themen im Prototyp-Maßstab
ab.

## 4. Parameter-Empfehlung

| Parameter | Grundfall | Erweiterung (Verdichtung) |
|---|---|---|
| `max_tokens` | — (kein Call) | ~500–800 (kompakter Kontext-Block, kein Fließtext-Aufsatz) |
| Temperatur | — | niedrig (0.2–0.3) — Informationstreue vor Stil |
| Streaming | — | nein |
| Caching | **zentral hier relevant** | s. u. |

**Caching-Hinweis (für beide Fälle gleich wichtig):** Der fertige
Themen-Memory-Block — ob roh oder verdichtet — wird als eigener Abschnitt
im System-Prompt platziert und mit einem `cache_control`-Breakpoint
(`{"type": "ephemeral"}`) markiert. Er ändert sich nur, wenn sich Lernzettel,
Dateien oder Chat-Titel des Themas ändern — nicht bei jeder neuen
Chat-Nachricht. Ohne diesen Breakpoint würde derselbe Block bei **jeder**
Nachricht im Chat erneut voll bepreist, obwohl er unverändert bleibt. Der
Tonfall-Baustein (siehe `00-overview.md`) kann denselben Cache-Breakpoint
mit abdecken, da auch er sich innerhalb eines Chats nicht ändert.

## 5. System-Prompt

Für den **Grundfall** gibt es kein System-Prompt an eine KI — nur ein
Zusammenbau-Template (Backend-Logik):

```
## Themen Memory: {{themaName}} ({{fachName}})
{{themaBeschreibung}}

### Bisherige Lernzettel
{{#each lernzettel}}
**{{titel}}**
{{content}}
{{/each}}

### Hochgeladene Dateien (Zusammenfassungen)
{{#each dateien}}
- **{{name}}**: {{zusammenfassung}}
{{/each}}

### Bisherige Chats zu diesem Thema
{{#each chats}}
- „{{titel}}" (Modus: {{modus}})
{{/each}}
```

Für die **Erweiterung** (Verdichtung bei zu großem Kontext) ein echter
System-Prompt:

```
Du fasst den bisherigen Lernstand eines Schülers zu einem Thema kompakt
zusammen, damit dieser Block als Gedächtnis in zukünftige KI-Chats zu
diesem Thema eingefügt werden kann. Zielgruppe: ab Klasse 5.

Dir liegt vor: alle Lernzettel des Themas (voll), alle
Datei-Zusammenfassungen, und die Titel bisheriger Chats.

Regeln:
1. Verdichte, verliere aber keine fachlich wichtigen Begriffe, Formeln,
   Regeln oder erkennbaren Schwächen/Fehlerquellen des Schülers.
2. Bevorzuge Stichpunkte/kurze Absätze gegenüber Fließtext.
3. Erfinde nichts, was nicht aus den Quellen hervorgeht.
4. Ordne nach: (a) zentrale Begriffe/Regeln des Themas, (b) bereits
   behandelte Aufgabentypen/Chat-Schwerpunkte, (c) erkennbare
   Schwachstellen des Schülers, falls aus den Quellen ersichtlich.

Antworte ausschließlich über das bereitgestellte Tool.
```

## 6. Output-Format

**Grundfall:** Freitext/Markdown — direktes Ergebnis des Templates aus
Abschnitt 5, kein Parsing nötig, da es nur als Textabschnitt in einen
weiteren System-Prompt eingefügt wird (nicht in ein DB-Feld mit eigenem
Schema).

**Erweiterung (Verdichtung):** ebenfalls Freitext/Markdown als Ergebnis,
aber über eine schlanke Tool-Definition erzwungen, damit das Backend die
Antwort zuverlässig von Meta-Kommentaren der KI trennen kann:

```json
{
  "name": "themen_memory_verdichtet",
  "description": "Kompakter Themen-Memory-Block zur Wiederverwendung als System-Prompt-Kontext",
  "input_schema": {
    "type": "object",
    "properties": {
      "kontextBlock": {
        "type": "string",
        "description": "Verdichteter Themen-Memory-Block in Markdown, 500-800 Tokens"
      }
    },
    "required": ["kontextBlock"]
  }
}
```

## 7. Beispiel

**Grundfall** — Thema „Bruchrechnung" (Fach Mathematik), zwei Lernzettel,
eine Datei, ein bisheriger Chat:

```
## Themen Memory: Bruchrechnung (Mathematik)
Kürzen, Erweitern und Rechnen mit Brüchen — die Grundlage für Prozent- und
Verhältnisrechnung.

### Bisherige Lernzettel
**Bruchrechnung — Grundlagen & Regeln**
## Kürzen
Zähler und Nenner durch dieselbe Zahl teilen …
## Erweitern
Zähler und Nenner mit derselben Zahl multiplizieren …

### Hochgeladene Dateien (Zusammenfassungen)
- **bruchrechnung_uebung.pdf**: Übungsblatt zur Bruchrechnung: erklärt
  Kürzen (Beispiel 8/12 = 2/3) und Erweitern von Brüchen. Enthält 8
  Übungsaufgaben zu Kürzen, Erweitern und Addition ungleichnamiger Brüche.

### Bisherige Chats zu diesem Thema
- „Wie kürzt man 24/36?" (Modus: hausaufgaben)
```

**Erweiterung** — dasselbe Thema, nachdem über Monate 6 Lernzettel und 12
Dateien angesammelt wurden (Rohblock würde >4000 Tokens ergeben):

```json
{
  "kontextBlock": "## Bruchrechnung (Mathematik) — verdichtet\n**Kernregeln:** Kürzen/Erweitern (gemeinsamer Teiler/Faktor), Addition/Subtraktion nur mit gleichem Nenner (ggf. Hauptnenner bilden), Multiplikation (Zähler×Zähler, Nenner×Nenner), Division (Kehrwert multiplizieren).\n**Behandelte Aufgabentypen:** Kürzen/Erweitern-Übungen, Textaufgaben zu Verhältnissen, gemischte Zahlen.\n**Bekannte Schwachstellen:** verwechselt beim Addieren öfter Zähler/Nenner-Erweiterung; sicher bei reinem Kürzen."
}
```

## 8. Kostenschätzung (Claude Haiku 4.5)

**Grundfall:** 0 $ — kein Modell-Call, reines Backend-Assembly.

**Erweiterung (Verdichtung):** tritt nur auf, wenn die Schwelle (~4.000
Tokens) überschritten wird — in der Praxis selten (ein einzelnes Thema
müsste über Monate viele Lernzettel/Dateien ansammeln). Bei Auslösung:

| Input (System-Prompt + Rohblock) | Output | ≈ Kosten |
|---|---|---|
| ~150 + ~8.000 = ~8.150 Tokens | ~700 Tokens | **≈ 1,2 Cent** |

Da dieser Call höchstens gelegentlich pro Thema anfällt (nicht pro
Chat-Nachricht), ist sein Beitrag zu den Gesamtkosten pro Nutzer/Monat
vernachlässigbar gegenüber den eigentlichen Chat-Nachrichten (siehe
[03](03-chat-erklaeren.md)–[06](06-chat-zusammenfassen.md)).
